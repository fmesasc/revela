// Example presentations: Hardware y gadgets ficticios, each one with its own identity (headphones, a rescue
// drone, a trail camera, a sunrise lamp, cycling glasses, a keyboard, a thermostat, a toy car, a tracker, an
// e-reader). Each one: { name, summary, cat: 'product', make() } → a deck (see kit.js for the builders).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// An SVG picture as a data URL (drawings, maps, screens); bg '' = transparent.
const svgURL = (w, h, inner, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
const T = (x, y, s, fill, str, extra = '', ff = 'sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
const R = (x, y, w, h, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${extra}/>`;
// A picture (no frame) and a picture inside a device.
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const device = (src, kind, x, y, w, h, alt, props = {}) => img(src, x, y, w, h, alt, { fit: 'cover', device: kind, ...props });
// The same id on two slides in a row: Transform moves the object from one to the other.
const keep = (b, id) => ({ ...b, id });
// A 3D model without caption; the CC BY credits in one small line.
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 12, color });
// The same animation on a group: the first starts it, the rest go after it.
const chain = (blocks, effect, start = 'click', props = {}, then = 'afterPrev') => blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? then : start })));
// A small deterministic scatter: the same every time.
const scatter = (n, seed, fn) => { let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; return Array.from({ length: n }, (_, i) => fn(r, i)); };
// A stroke that can draw itself (ink): points relative to (x, y).
const ink = (pts, x, y, color, width, props = {}) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys),
  w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1;
  return { ...base(x + x0, y + y0, w, h), type: 'ink', points: pts.map(([a, b]) => [a - x0, b - y0]), vw: w, vh: h, color, width, ...props }; };
// A number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:8px">${label}</div>`,
  x, y, w, Math.round(size * 1.15 + 90), { fontSize: 24, color: fg, ...props });
const MONO = "'Courier New', Courier, monospace";
// A thin rule exactly from x to x + w (the rectangle shape is drawn 2 % inside its box).
const rule = (x, y, w, h, c) => shape('rect', Math.round(x - w / 0.96 * 0.02), y, Math.round(w / 0.96), h, c);

// ─── Silencio (headphones): an anechoic chamber ─────────────────────────────────────
// A wall of acoustic foam: pyramids, each with four shaded faces; it fades into the background on one side.
const foam = (w, h, s, bg, fadeLeft = true) => svgURL(w, h, `<defs><linearGradient id="f" x1="${fadeLeft ? 0 : 1}" x2="${fadeLeft ? 1 : 0}"><stop offset="0" stop-color="${bg}"/><stop offset=".55" stop-color="${bg}" stop-opacity="0"/></linearGradient></defs>`
  + Array.from({ length: Math.ceil(h / s) * Math.ceil(w / s) }, (_, k) => { const cols = Math.ceil(w / s), x = (k % cols) * s, y = Math.floor(k / cols) * s, c = [x + s / 2, y + s / 2], q = (k + Math.floor(k / cols)) % 2;
    const P = pts => `<polygon points="${pts.map(p => p.join(',')).join(' ')}"`;
    return `${P([[x, y], [x + s, y], c])} fill="${q ? '#2a313c' : '#262c36'}"/>${P([[x, y], c, [x, y + s]])} fill="#20262f"/>${P([[x + s, y], [x + s, y + s], c])} fill="#151a21"/>${P([[x, y + s], c, [x + s, y + s]])} fill="#11151b"/>`; }).join('')
  + `<rect width="${w}" height="${h}" fill="url(#f)"/>`);
// Over-ear headphones, drawn.
const headphones = (accent) => svgURL(420, 440,
  `<defs><linearGradient id="b" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4a525f"/><stop offset="1" stop-color="#1d2128"/></linearGradient>`
  + `<linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="#2c323c"/><stop offset="1" stop-color="#0f1216"/></linearGradient></defs>`
  + `<path d="M70 250 C70 60 350 60 350 250" fill="none" stroke="url(#b)" stroke-width="34" stroke-linecap="round"/>`
  + `<path d="M84 230 C92 92 328 92 336 230" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="6"/>`
  + [60, 360].map(cx => `<rect x="${cx - 22}" y="214" width="44" height="70" rx="12" fill="#2b313a"/>`
    + `<ellipse cx="${cx}" cy="320" rx="66" ry="96" fill="url(#c)"/><ellipse cx="${cx}" cy="320" rx="50" ry="78" fill="none" stroke="${accent}" stroke-width="5"/>`
    + `<ellipse cx="${cx + (cx < 200 ? 8 : -8)}" cy="300" rx="16" ry="30" fill="#ffffff" fill-opacity=".06"/>`).join(''));

// ─── Cernícalo (rescue drone): a topographic map ────────────────────────────────────
// Contour lines round a few peaks (every fifth one thicker), a grid and, optionally, a river.
const topo = (w, h, peaks, line, bg, grid = true) => svgURL(w, h,
  (grid ? Array.from({ length: Math.ceil(w / 160) }, (_, i) => `<line x1="${i * 160}" y1="0" x2="${i * 160}" y2="${h}" stroke="${line}" stroke-opacity=".25"/>`).join('')
    + Array.from({ length: Math.ceil(h / 160) }, (_, i) => `<line x1="0" y1="${i * 160}" x2="${w}" y2="${i * 160}" stroke="${line}" stroke-opacity=".25"/>`).join('') : '')
  + peaks.map(([cx, cy, n, step, ph]) => Array.from({ length: n }, (_, k) => { const r = (k + 1) * step;
    const d = Array.from({ length: 73 }, (_, j) => { const a = (j / 72) * Math.PI * 2, rr = r * (1 + 0.16 * Math.sin(3 * a + ph) + 0.07 * Math.sin(5 * a + ph * 2) + 0.04 * Math.sin(k + a * 2));
      return (j ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * 0.8 * Math.sin(a)).toFixed(1); }).join(' ');
    return `<path d="${d}Z" fill="none" stroke="${line}" stroke-width="${(k + 1) % 5 ? 1.2 : 2.6}" stroke-opacity="${(k + 1) % 5 ? 0.6 : 0.9}"/>`; }).join('')).join(''), bg);
// The drone from above: four rotors on an X.
const droneTop = (c) => svgURL(200, 200, `<path d="M45 45 L155 155 M155 45 L45 155" stroke="#2a2f33" stroke-width="12" stroke-linecap="round"/>`
  + [[45, 45], [155, 45], [45, 155], [155, 155]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="38" fill="#2a2f33" fill-opacity=".18" stroke="#2a2f33" stroke-width="3"/><circle cx="${x}" cy="${y}" r="7" fill="#2a2f33"/>`).join('')
  + R(72, 72, 56, 56, 14, c) + `<circle cx="100" cy="100" r="11" fill="#1b1f22"/>`);
// A thermal picture: cold rock in purple, a person lying down in hot yellow.
const thermal = (w, h) => svgURL(w, h, `<defs><radialGradient id="p"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd23f"/><stop offset=".7" stop-color="#f26a1b"/><stop offset="1" stop-color="#7a1d6a" stop-opacity="0"/></radialGradient>`
  + `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a0b3a"/><stop offset="1" stop-color="#3a1260"/></linearGradient></defs>`
  + R(0, 0, w, h, 0, 'url(#g)') + scatter(26, 7, r => `<ellipse cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" rx="${(30 + r() * 90).toFixed(0)}" ry="${(18 + r() * 40).toFixed(0)}" fill="#5b1a7a" fill-opacity=".45"/>`).join('')
  + `<ellipse cx="${w * 0.55}" cy="${h * 0.56}" rx="${w * 0.2}" ry="${h * 0.12}" fill="url(#p)" transform="rotate(-18 ${w * 0.55} ${h * 0.56})"/>`
  + `<circle cx="${w * 0.39}" cy="${h * 0.63}" r="${h * 0.06}" fill="url(#p)"/>`
  + `<rect x="${w * 0.3}" y="${h * 0.36}" width="${w * 0.4}" height="${h * 0.42}" fill="none" stroke="#7dffb0" stroke-width="3"/>`
  + T(w * 0.3, h * 0.33, h * 0.045, '#7dffb0', '◎ 36,4 °C', ' font-weight="700"', 'monospace')
  + T(w * 0.04, h * 0.08, h * 0.04, '#ffffff', 'IR · 23:41 · ALT 2140 m', '', 'monospace')
  + `<rect x="${w * 0.9}" y="${h * 0.2}" width="${w * 0.03}" height="${h * 0.6}" fill="url(#g)"/>` + `<rect x="${w * 0.9}" y="${h * 0.2}" width="${w * 0.03}" height="${h * 0.15}" fill="#ffd23f"/>`
  + T(w * 0.86, h * 0.18, h * 0.035, '#ffffff', '40°', '', 'monospace') + T(w * 0.86, h * 0.86, h * 0.035, '#ffffff', '−5°', '', 'monospace'), '#1a0b3a');

// ─── Vigía (trail camera): an infrared viewfinder ───────────────────────────────────
const scanlines = (w, h, c) => svgURL(w, h, Array.from({ length: Math.ceil(h / 4) }, (_, i) => `<rect y="${i * 4}" width="${w}" height="1.4" fill="${c}" fill-opacity=".07"/>`).join(''));
const nightWood = (w, h) => svgURL(w, h, `<defs><radialGradient id="v" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#1d3a22"/><stop offset="1" stop-color="#040805"/></radialGradient></defs>`
  + R(0, 0, w, h, 0, 'url(#v)')
  + scatter(14, 3, (r, i) => { const x = (i / 14) * w + r() * 60, tw = 18 + r() * 40; return `<rect x="${x.toFixed(0)}" y="0" width="${tw.toFixed(0)}" height="${(h * (0.72 + r() * 0.1)).toFixed(0)}" fill="#0b170d" fill-opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`; }).join('')
  + `<path d="M0 ${h * 0.74} Q ${w * 0.3} ${h * 0.68} ${w * 0.55} ${h * 0.73} T ${w} ${h * 0.71} V ${h} H 0 Z" fill="#12261a"/>`
  + scatter(90, 11, r => `<circle cx="${(r() * w).toFixed(0)}" cy="${(h * 0.72 + r() * h * 0.28).toFixed(0)}" r="${(1 + r() * 3).toFixed(1)}" fill="#5fae6b" fill-opacity=".35"/>`).join(''));
// The four corners of a viewfinder, REC and the data along the bottom.
const viewfinder = (c, rec, data) => [
  ...[[40, 40, 1, 1], [1240, 40, -1, 1], [40, 680, 1, -1], [1240, 680, -1, -1]].flatMap(([x, y, sx, sy]) => [
    shape('rect', sx > 0 ? x : x - 60, sy > 0 ? y : y - 4, 60, 4, c), shape('rect', sx > 0 ? x : x - 4, sy > 0 ? y : y - 60, 4, 60, c)]),
  shape('ellipse', 70, 66, 18, 18, rec), text('REC', 96, 58, 90, 34, { fontFamily: MONO, fontSize: 22, color: c, fontWeight: 700 }),
  text(data, 70, 636, 900, 34, { fontFamily: MONO, fontSize: 20, color: c })];
const glowTxt = (s, c) => `<span style="color:${c};text-shadow:0 0 10px ${c}88,0 0 24px ${c}55">${s}</span>`;
// The camera seen from above, with what its sensor and its infrared light reach.
const reach = (w, h, c, dim) => svgURL(w, h, `<defs><radialGradient id="r" cx="0" cy=".5" r="1"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`
  + `<path d="M60 ${h / 2} L${w - 20} ${h / 2 - 230} A 640 640 0 0 1 ${w - 20} ${h / 2 + 230} Z" fill="url(#r)"/>`
  + [0.36, 0.68, 0.92].map((k, i) => `<path d="M${60 + (w - 80) * k} ${h / 2 - 230 * k * 0.98} A ${640 * k} ${640 * k} 0 0 1 ${60 + (w - 80) * k} ${h / 2 + 230 * k * 0.98}" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="6 8"/>`
    + T(60 + (w - 80) * k - 10, h / 2 + 8, 22, c, ['8 m', '16 m', '22 m'][i], ' text-anchor="end"', 'monospace')).join('')
  + R(14, h / 2 - 34, 56, 68, 8, '#1f3324', ` stroke="${c}" stroke-width="3"`) + `<circle cx="62" cy="${h / 2}" r="12" fill="${dim}"/>`);

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Silencio, noise-cancelling headphones: an anechoic chamber, waves that cancel, an equation, a process, a frequency chart.
  prod_hw_headphones: { name: 'Silencio: auriculares con cancelación', cat: 'product',
    summary: 'Cámara anecoica: ondas que se dibujan y se anulan, ecuación, proceso uno a uno, curva por frecuencias, tabla con fórmulas y votación',
    make: () => {
      const BG = '#0f1217', PANEL = '#1a1f27', OR = '#ff7a45', CY = '#8fd3ff', FG = '#eef1f5', DIM = '#8c96a5', head = pairStacks('modern').heading;
      const wave = (amp, phase, x, y, w, h, color, cycles = 4) => ink(Array.from({ length: 121 }, (_, i) => [i * w / 120, h / 2 + amp * Math.sin((i / 120) * cycles * 2 * Math.PI + phase) * (0.75 + 0.25 * Math.sin(i / 17))]), x, y, color, 6);
      return numbered(build({ name: 'Silencio S2 · auriculares', palette: 'midnight', fonts: 'modern', title: { color: FG, size: 46 }, body: { color: FG } }, [
        { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', back: [img(foam(700, 720, 70, BG), 580, 0, 700, 720, 'Pared de espuma acústica', { decorative: true })], extra: [
          text('AURICULARES · MODELO S2', 90, 190, 520, 36, { fontSize: 20, color: OR, letterSpacing: 8 }),
          text('Silencio', 80, 226, 640, 170, { fontFamily: head, fontSize: 140, fontWeight: 800, color: FG, letterSpacing: -3 }),
          text('Cancelación activa de ruido que se adapta a donde estés.', 90, 410, 500, 100, { fontSize: 30, color: DIM, lineHeight: 1.35 }),
          shape('rect', 90, 540, 80, 4, OR),
          text('Presentación de producto · otoño 2026', 90, 560, 500, 36, { fontSize: 20, color: DIM }),
          withAnims(img(headphones(OR), 760, 150, 400, 420, 'Auriculares Silencio S2'), A('fade-down', { start: 'afterPrev', duration: 1200, delay: 300 }))],
          notes: 'Portada en una cámara anecoica: la pared de espuma es un dibujo SVG hecho con pirámides sombreadas que se funden con el fondo. Los auriculares bajan solos al empezar.' },
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(-260, 80, 760, '#3a1d12', BG, 70)], extra: [
          withAnims(text('−38 dB', 80, 180, 550, 190, { fontFamily: head, fontSize: 136, fontWeight: 800, color: OR, letterSpacing: -6 }), A('zoom-in', { duration: 900, sound: 'drumroll' })),
          withAnims(text('Es lo que restan al ruido de un vagón de metro: de 85 dB a 47 dB, casi el murmullo de una biblioteca.', 90, 400, 500, 150, { fontSize: 28, color: FG, lineHeight: 1.4 }), A('fade-up', { start: 'afterPrev' })),
          withAnims(chartBlock({ x: 640, y: 130, w: 580, h: 470, chartType: 'hbar', color: CY, dataLabels: true, xTitle: 'Decibelios',
            data: [{ label: 'Metro en hora punta', value: 85 }, { label: 'Calle con tráfico', value: 78 }, { label: 'Oficina abierta', value: 62 }, { label: 'Metro con Silencio', value: 47 }, { label: 'Biblioteca', value: 40 }] }), A('fade-in', { start: 'afterPrev', duration: 800 })),
          text('Mediciones de laboratorio, cifras de ejemplo.', 640, 620, 580, 30, { fontSize: 16, color: DIM })],
          notes: 'La cifra entra con redoble y, a continuación, el texto y el gráfico de barras horizontales. Recuerda: cada 10 dB menos, el oído percibe la mitad de ruido.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          text('Ruido + antirruido = calma', 90, 50, 1100, 70, { fontFamily: head, fontSize: 48, fontWeight: 700, color: FG }),
          ...[['Ruido', 'lo que llega de fuera', OR], ['Antirruido', 'la misma onda, invertida', CY], ['Lo que oyes', 'casi nada', FG]].map(([h, d, c], i) =>
            text(`<b style="color:${c}">${h}</b><br>${d}`, 90, 160 + i * 140, 220, 90, { fontSize: 22, color: DIM, lineHeight: 1.3 })),
          withAnims(wave(40, 0, 330, 150, 860, 110, OR), A('draw', { duration: 1400, sound: 'whoosh' })),
          withAnims(wave(40, Math.PI, 330, 290, 860, 110, CY), A('draw', { start: 'afterPrev', duration: 1400 })),
          withAnims(ink([[0, 0], [860, 0]], 330, 485, FG, 4), A('draw', { start: 'afterPrev', duration: 900 })),
          shape('line', 330, 432, 860, 1, 'none', { stroke: '#2f3744', strokeWidth: 2, dash: 'dash' }),
          withAnims(mathBlock({ x: 90, y: 570, w: 1100, h: 90, fontSize: 40, color: FG, latex: 'A\\sin(\\omega t) + A\\sin(\\omega t + \\pi) = 0' }), A('fade-up', { start: 'afterPrev' }))],
          notes: 'Tres trazos que se dibujan solos, uno tras otro: el ruido, su inversa y la suma, plana. Luego la ecuación: una onda más la misma desfasada media vuelta (π) da cero.' },
        { layout: 'titleOnly', title: 'Del micrófono a tu oído, en 0,02 ms', bg: '#12161d', transition: 'slide', extra: [
          dg('process', 'Escucha\nCalcula\nEmite\nCorrige', 90, 180, 1100, 300, { colors: 'accent', fontScale: 1.15 }),
          ...chain(['Seis micrófonos exteriores captan el ruido.', 'El chip calcula la onda inversa.', 'El altavoz suma la antionda a tu música.', 'Un micrófono interior corrige lo que se escapa.'].map((t, i) =>
            text(t, 90 + i * 292, 490, 224, 100, { fontSize: 22, color: FG, textAlign: 'center', lineHeight: 1.35 })), 'fade-up', 'click', { duration: 400 }, 'click'),
          text('Todo el ciclo se repite 48.000 veces por segundo.', 90, 620, 1100, 40, { fontSize: 24, color: DIM, textAlign: 'center' })],
          notes: 'Diagrama de proceso; cada clic muestra debajo qué ocurre en ese paso. Insiste en la corrección final: es lo que diferencia la cancelación adaptativa.' },
        { layout: 'titleOnly', title: 'Graves fuera, voces claras', bg: '#12161d', transition: 'fade', extra: [
          chartBlock({ x: 80, y: 160, w: 780, h: 480, chartType: 'line', color: OR, seriesName: 'Con cancelación activa', grid: true, yTitle: 'Atenuación (dB)', xTitle: 'Frecuencia',
            data: ['63 Hz', '125', '250', '500', '1 kHz', '2 kHz', '4 kHz', '8 kHz'].map((l, i) => ({ label: l, value: [33, 37, 38, 34, 29, 31, 34, 36][i] })),
            series: [{ name: 'Solo almohadillas', values: [4, 6, 10, 16, 22, 28, 32, 35], color: DIM }] }),
          text(`Los <b style="color:${OR}">graves</b> —motores, aviones, aire acondicionado— los frena la electrónica.`, 900, 200, 300, 170, { fontSize: 25, color: FG, lineHeight: 1.4 }),
          text(`Los <b style="color:${CY}">agudos</b> ya los paran las almohadillas de espuma viscoelástica.`, 900, 400, 300, 150, { fontSize: 25, color: FG, lineHeight: 1.4 })],
          notes: 'Gráfico de líneas con dos series: la distancia entre ellas es el trabajo de la cancelación activa. Datos de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ kind: 'choice', fontSize: 32, x: 80, y: 60, w: 1120, h: 600,
          question: '¿Dónde echas más de menos el silencio?', options: ['En el transporte', 'En la oficina', 'En el avión', 'En casa'] })],
          notes: 'Votación en directo: el público contesta desde el móvil. Usa el resultado para elegir cuál de los tres modos de la diapositiva siguiente enseñas primero.' },
        { layout: 'blank', bg: BG, transition: 'slide', extra: [
          text('Tres modos, un gesto', 90, 60, 1100, 70, { fontFamily: head, fontSize: 48, fontWeight: 700, color: FG }),
          ...[['headphones', 'Silencio total', 'Para concentrarte o dormir en el avión.', OR], ['wind', 'Ambiente', 'Deja pasar el tráfico y los avisos del andén.', CY], ['message-circle', 'Conversación', 'Baja la música y realza la voz al hablar.', '#c7a6ff']].flatMap(([ic, h, d, c], i) => {
            const x = 90 + i * 375;
            return [withAnims(shape('rounded', x, 170, 345, 380, PANEL, { radius: 22, stroke: '#2a313c', strokeWidth: 2 }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 450 })),
              withAnims(icon(ic, x + 34, 210, 64, c), A('fade-up', { start: 'withPrev', duration: 450 })),
              withAnims(text(h, x + 34, 300, 280, 50, { fontSize: 32, fontWeight: 700, color: FG }), A('fade-up', { start: 'withPrev', duration: 450 })),
              withAnims(text(d, x + 34, 360, 280, 130, { fontSize: 24, color: DIM, lineHeight: 1.4 }), A('fade-up', { start: 'withPrev', duration: 450 }))]; }),
          text('Se cambia con un toque largo en el auricular derecho.', 90, 600, 1100, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
          notes: 'Las tres tarjetas entran seguidas con un solo clic: cada panel lleva con él su icono y sus textos («Con la anterior»).' },
        { layout: 'titleOnly', title: 'Autonomía con el estuche', bg: BG, transition: 'fade', extra: [
          tableBlock({ x: 90, y: 180, w: 1100, h: 300, fontSize: 28, color: FG, header: true, headBg: OR, headFg: '#1a0f0a', stroke: '#2f3744', banded: true, band: '#8fd3ff', bandAlpha: 0.08, colW: [4, 3, 3, 3],
            rows: [['Modo', 'Horas por carga', 'Cargas del estuche', 'Horas en total'], ['Silencio total', '30', '3', '=B2*(C2+1)'], ['Ambiente', '34', '3', '=B3*(C3+1)'], ['Sin cancelación', '45', '3', '=B4*(C4+1)']] }),
          text('La última columna es una fórmula (=B2*(C2+1)): cambia las horas o las cargas y se recalcula.', 90, 510, 1100, 40, { fontSize: 22, color: DIM }),
          text(`Y 10 minutos de carga dan <b style="color:${OR}">5 horas</b> de música.`, 90, 570, 1100, 50, { fontSize: 30, color: FG })],
          notes: 'Tabla con fórmulas: la carga de los auriculares más las del estuche. Cifras de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'zoom', back: [img(foam(700, 720, 70, BG, false), 0, 0, 700, 720, 'Pared de espuma acústica', { decorative: true }), glow(700, 120, 520, '#3a1d12', BG, 60)], extra: [
          img(headphones(OR), 160, 170, 340, 360, 'Auriculares Silencio S2'),
          text('Escucha lo que quieras.<br>Nada más.', 640, 200, 580, 180, { fontFamily: head, fontSize: 56, fontWeight: 800, color: FG, lineHeight: 1.1 }),
          text(`Silencio S2 · <b style="color:${OR}">249 €</b>`, 644, 420, 560, 50, { fontSize: 32, color: FG }),
          text('A la venta el 3 de noviembre · 30 días de prueba', 644, 480, 560, 40, { fontSize: 22, color: DIM })],
          notes: 'Cierre con la espuma a la izquierda (el mismo dibujo, fundido hacia el otro lado). Precio y fecha inventados.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Cernícalo R3, a mountain rescue drone: a topographic map, a flight that draws itself, NASA's helicopter, thermal view, a timer, a battery table.
  prod_hw_drone: { name: 'Cernícalo: dron de rescate en montaña', cat: 'product',
    summary: 'Mapa topográfico: vuelo que se dibuja con el dron recorriéndolo, helicóptero 3D de la NASA, vista térmica, cuenta atrás, fórmulas y concurso',
    make: () => {
      const MAP = '#ecebe1', INK = '#1d2a24', LINE = '#9aa58a', ORG = '#ff5a1f', DARK = '#0f1713', FG = '#eef2ea', DIM = '#97a596', head = pairStacks('tech').heading;
      const map1 = topo(1280, 720, [[980, 300, 14, 26, 0.4], [300, 560, 9, 30, 2.1], [140, 120, 6, 28, 4]], LINE, MAP);
      const route = [[0, 0], [120, -40], [230, -20], [330, -110], [470, -140], [560, -60], [690, -90]];
      return numbered(build({ name: 'Cernícalo R3 · rescate', palette: 'forest', fonts: 'tech', title: { color: INK, size: 46 }, body: { color: INK } }, [
        { layout: 'blank', bg: MAP, transition: 'fade', back: [img(map1, 0, 0, 1280, 720, 'Mapa topográfico', { fit: 'cover', decorative: true })], extra: [
          shape('rect', 60, 120, 640, 420, MAP, { opacity: 88 }),
          text('DRON DE BÚSQUEDA Y RESCATE EN MONTAÑA', 90, 150, 610, 34, { fontSize: 18, color: ORG, letterSpacing: 5, fontWeight: 700 }),
          text('CERNÍCALO', 84, 190, 620, 130, { fontFamily: head, fontSize: 104, fontWeight: 800, color: INK }),
          text('R3', 90, 320, 200, 90, { fontFamily: head, fontSize: 80, fontWeight: 800, color: ORG }),
          text('Encuentra antes. Llega antes.', 90, 430, 560, 50, { fontSize: 30, color: INK }),
          text('42°38′ N · 0°03′ E · 2.140 m', 90, 490, 560, 30, { fontFamily: MONO, fontSize: 18, color: '#5d6a5f' }),
          withAnims(img(droneTop(ORG), 770, 470, 130, 130, 'El dron visto desde arriba'), path([[110, -90], [230, -130], [330, -250]], { start: 'afterPrev', duration: 3000, delay: 400 }))],
          notes: 'Portada sobre un mapa topográfico dibujado con curvas de nivel (SVG generado). El dron, visto desde arriba, despega solo y cruza el mapa con una trayectoria.' },
        { layout: 'blank', bg: DARK, transition: 'fade', back: [glow(560, 40, 700, '#24402f', DARK, 70)], extra: [
          text('Dos rotores, uno encima del otro', 90, 90, 560, 130, { fontFamily: head, fontSize: 44, fontWeight: 700, color: FG, lineHeight: 1.15 }),
          text('La misma idea que voló en el aire finísimo de Marte en 2021: más empuje en poco espacio. A 3.000 metros, el aire también escasea.', 90, 240, 520, 170, { fontSize: 25, color: DIM, lineHeight: 1.45 }),
          ...chain([['3.500 m', 'techo de vuelo'], ['42 min', 'de autonomía'], ['60 km/h', 'de viento']].map(([n, l], i) => stat(n, l, 90 + i * 180, 450, 175, ORG, FG, 34, { fontSize: 20 })), 'fade-up', 'click', { duration: 450 }),
          nasa('ingenuity-mars-helicopter', 660, 60, 560, 560, { autoRotate: true, view: 'three', edge: 'fade', caption: '' })],
          notes: 'El modelo 3D es el helicóptero marciano de la NASA (dominio público), que inspira el rotor coaxial. Gira solo; arrástralo para enseñarlo por debajo. Cifras del R3 inventadas.' },
        { layout: 'blank', bg: MAP, transition: 'fade', back: [img(topo(1280, 720, [[640, 360, 16, 24, 1.3], [1150, 120, 6, 26, 3]], LINE, MAP), 0, 0, 1280, 720, 'Mapa topográfico', { fit: 'cover', decorative: true })], extra: [
          shape('rounded', 60, 40, 560, 110, MAP, { radius: 14, opacity: 92, stroke: INK, strokeWidth: 2 }),
          text('Misión de ejemplo', 84, 52, 520, 40, { fontSize: 20, color: ORG, fontWeight: 700, letterSpacing: 3 }),
          text('9,4 km de barrido en 23 minutos', 84, 88, 520, 50, { fontFamily: head, fontSize: 32, fontWeight: 700, color: INK }),
          shape('ellipse', 166, 486, 28, 28, INK), text('Base · refugio', 130, 524, 200, 30, { fontSize: 20, color: INK, fontWeight: 700 }),
          withAnims(ink(route.map(([x, y]) => [x * 1.4, y * 1.6]), 180, 500, ORG, 6, { dash: 'dash' }), A('draw', { duration: 3200 })),
          withAnims(img(droneTop(ORG), 140, 460, 80, 80, 'El dron'), path(route.map(([x, y]) => [x * 1.4, y * 1.6]), { start: 'withPrev', duration: 3200 })),
          withAnims(icon('location', 1116, 290, 56, '#d11a2a'), A('bounce', { start: 'afterPrev', sound: 'pop' })),
          withAnims(text('Hallazgo · 23:41', 900, 236, 230, 40, { fontSize: 22, color: '#d11a2a', fontWeight: 700, textAlign: 'center', bg: MAP, radius: 8 }), A('fade-up', { start: 'afterPrev' }))],
          notes: 'El recorrido (un trazo de tinta discontinuo) se dibuja mientras el dron lo sigue con una trayectoria de la misma forma, al mismo tiempo. Al final aparece el punto del hallazgo con un «pop».' },
        { layout: 'blank', bg: MAP, transition: 'fade', extra: [pollBlock({ kind: 'quiz', fontSize: 32, x: 80, y: 60, w: 1120, h: 600, time: 20,
          question: 'De noche, ¿qué delata antes a una persona perdida?', options: ['El color de su ropa', 'Su calor corporal', 'El ruido que hace', 'Su teléfono móvil'], correct: [1] })],
          notes: 'Concurso con tiempo: gana quien acierta antes. La respuesta es el calor: la cámara térmica lo ve aunque la persona esté inconsciente y sin cobertura. La diapositiva siguiente lo enseña.' },
        { layout: 'titleOnly', title: `<span style="color:${FG}">De noche, ve el calor</span>`, bg: DARK, transition: 'fade', extra: [
          device(thermal(800, 560), 'tablet', 90, 170, 640, 470, 'Vista térmica en la tableta de la base: una persona tumbada entre rocas frías'),
          ...chain([['Cámara térmica', 'distingue 0,05 °C de diferencia'], ['Aviso automático', 'marca a cualquier persona en el mapa'], ['Foco y altavoz', 'para hablar con quien está perdido']].map(([h, d], i) =>
            text(`<b style="color:${ORG}">${h}</b><br>${d}`, 790, 200 + i * 140, 410, 110, { fontSize: 25, color: FG, lineHeight: 1.35 })), 'fade-left', 'click', { duration: 450 })],
          notes: 'Una tableta con una imagen térmica dibujada en SVG: rocas frías en violeta y una persona caliente en amarillo, recuadrada por el detector.' },
        { layout: 'titleOnly', title: 'Del maletero al aire en un minuto', bg: MAP, transition: 'slide', back: [img(map1, 0, 0, 1280, 720, 'Mapa topográfico', { fit: 'cover', opacity: 35, decorative: true })], extra: [
          timer(60, 820, 190, 360, { color: ORG, endText: '¡Despegue!' }),
          ...chain(['Desplegar los brazos', 'Encajar la batería', 'Calibrar la brújula', 'Marcar la zona en la tableta', 'Despegue automático'].map((t, i) =>
            text(`<span style="color:${ORG};font-weight:800">${String(i + 1).padStart(2, '0')}</span>  ${t}`, 90, 190 + i * 82, 640, 64, { fontSize: 28, color: INK, bg: '#ffffffcc', radius: 10, pad: [12, 20, 12, 20], vAlign: 'middle' })), 'fade-right', 'click', { duration: 350, sound: 'click' })],
          notes: 'Cuenta atrás de 60 segundos (empieza sola). Mientras corre, ve mostrando los cinco pasos de la lista con un clic cada uno.' },
        { layout: 'titleOnly', title: '¿Llega la batería?', bg: MAP, transition: 'fade', extra: [
          tableBlock({ x: 90, y: 170, w: 1100, h: 330, fontSize: 26, color: INK, header: true, headBg: INK, headFg: '#ffffff', stroke: LINE, banded: true, band: ORG, bandAlpha: 0.08, colW: [4, 3, 3, 3],
            rows: [['Tramo', 'Distancia (km)', 'Consumo (% por km)', 'Batería (%)'], ['Ida hasta el barranco', '3,2', '6', '=B2*C2'], ['Barrido en cuadrícula', '4,1', '7', '=B3*C3'],
              ['Vuelta a la base', '2,1', '6', '=B4*C4'], ['Total', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']] }),
          text(`Las columnas de batería y los totales son fórmulas. Regla de oro: aterrizar siempre con <b style="color:${ORG}">un 15 % de reserva</b>.`, 90, 540, 1100, 80, { fontSize: 24, color: INK, lineHeight: 1.4 })],
          notes: 'Tabla con fórmulas (=B2*C2 y =SUMA(ARRIBA)): cambia la distancia de un tramo y el total se recalcula. Con el viento en contra, sube el consumo por kilómetro.' },
        { layout: 'titleOnly', title: `<span style="color:${FG}">Minutos hasta localizar a la persona</span>`, bg: DARK, transition: 'fade', extra: [
          chartBlock({ x: 90, y: 160, w: 1100, h: 470, chartType: 'bar', color: DIM, seriesName: 'Equipo a pie', dataLabels: true, grid: true, yTitle: 'Minutos',
            data: ['Bosque', 'Pedrera', 'Nieve', 'Barranco'].map((l, i) => ({ label: l, value: [95, 140, 120, 180][i] })), series: [{ name: 'Con Cernícalo R3', values: [22, 18, 25, 31], color: ORG }] }),
          text('Simulacros con el equipo de rescate, datos de ejemplo.', 90, 640, 1100, 30, { fontSize: 16, color: DIM })],
          notes: 'Barras agrupadas: a pie frente a dron. La diferencia más grande está en los barrancos, donde a pie hay que rodear.' },
        { layout: 'blank', bg: DARK, transition: 'zoom', back: [img(topo(1280, 720, [[900, 380, 18, 22, 0.8]], '#3d5a46', DARK, false), 0, 0, 1280, 720, 'Mapa topográfico', { fit: 'cover', decorative: true })], extra: [
          text('Que nadie pase<br>la noche perdido.', 90, 200, 800, 220, { fontFamily: head, fontSize: 76, fontWeight: 800, color: FG, lineHeight: 1.1 }),
          text(`Cernícalo R3 · pruebas con equipos de rescate desde <b style="color:${ORG}">enero de 2027</b>`, 90, 450, 820, 90, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
          withAnims(img(droneTop(ORG), 980, 430, 150, 150, 'El dron'), A('fade-in', { start: 'afterPrev' }), A('teeter', { start: 'afterPrev', duration: 1200 }))],
          notes: 'Cierre en el mapa nocturno. El dron aparece y se balancea, como en vuelo estacionario. Fechas inventadas.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Vigía, a trail camera: an infrared viewfinder, a fox that walks past and sets it off, the sensor's reach, activity by hours, a match.
  prod_hw_trailcam: { name: 'Vigía: cámara de fototrampeo', cat: 'product',
    summary: 'Visor infrarrojo: zorro 3D que cruza y dispara la cámara, alcance del sensor dibujado, cifras, áreas por horas, tabla con SUMA y emparejar',
    make: () => {
      const BG = '#050a06', NV = '#7dff8a', NV2 = '#3c9a4a', DIM = '#6f9a75', RED = '#ff4040', FG = '#d9ffdc', fox = lib3d('kh-Fox'), head = pairStacks('websafe').heading;
      const lines = () => img(scanlines(1280, 720, NV), 0, 0, 1280, 720, 'Líneas de barrido', { decorative: true, fit: 'cover' });
      const stamp = (t) => `CAM 03 · ${t} · 4 °C · LUNA 23 %`;
      return numbered(build({ name: 'Vigía · fototrampeo', palette: 'revela', fonts: 'websafe', title: { color: NV, size: 44 }, body: { color: FG } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [img(nightWood(1280, 720), 0, 0, 1280, 720, 'Bosque de noche visto con infrarrojos', { fit: 'cover', decorative: true }), lines()], extra: [
          ...viewfinder(NV, RED, stamp('02:14:37')),
          text(glowTxt('VIGÍA', NV), 90, 120, 600, 140, { fontFamily: MONO, fontSize: 120, fontWeight: 700, letterSpacing: 12 }),
          text('Cámara de fototrampeo para ver la fauna sin molestarla', 96, 270, 520, 100, { fontSize: 28, color: FG, lineHeight: 1.35 }),
          m3d('kh-Fox', 640, 220, 520, 400, { view: 'side', clip: fox.rest, edge: 'fade' })],
          notes: 'Portada como el visor de una cámara infrarroja: esquinas, REC, sello de hora y líneas de barrido (SVG). El zorro 3D husmea con su animación de reposo.' },
        { layout: 'blank', bg: BG, transition: 'fade', back: [img(nightWood(1280, 720), 0, 0, 1280, 720, 'Bosque de noche visto con infrarrojos', { fit: 'cover', decorative: true }), lines()], extra: [
          ...viewfinder(NV, RED, stamp('02:15:02')),
          text('Se despierta cuando algo se mueve', 220, 60, 840, 50, { fontSize: 32, color: FG, textAlign: 'center' }),
          withAnims(m3d('kh-Fox', 40, 300, 340, 300, { view: 'side', clip: fox.rest, walk: { clip: fox.walk, face: true, look: true } }), path([[820, 0]], { duration: 4200 })),
          withAnims(text('● MOVIMIENTO DETECTADO', 700, 150, 480, 50, { fontFamily: MONO, fontSize: 26, fontWeight: 700, color: RED, textAlign: 'right' }), A('fade-in', { start: 'afterPrev', sound: 'click' }), A('pulse', { start: 'afterPrev', duration: 900 })),
          withAnims(text('FOTO 1/3 · VÍDEO 20 s', 700, 200, 480, 40, { fontFamily: MONO, fontSize: 22, color: NV, textAlign: 'right' }), A('fade-in', { start: 'afterPrev' }))],
          notes: 'Con un clic el zorro cruza el encuadre andando (Modelo 3D ▸ Al moverse ▸ Mientras se mueve). Al salir, salta el aviso de detección con un clic de obturador y late.' },
        { layout: 'blank', bg: BG, transition: 'fade', back: [lines()], extra: [
          text('Lo que ve, y hasta dónde', 90, 60, 700, 60, { fontFamily: head, fontSize: 44, fontWeight: 700, color: NV }),
          withAnims(img(reach(760, 520, NV, RED), 60, 150, 760, 520, 'Vista desde arriba: la cámara y su cono de detección con distancias de 8, 16 y 22 metros'), A('fade-right', { duration: 900 })),
          ...chain([['Sensor de movimiento', 'detecta el calor que se desplaza hasta 22 m.'], ['Luz infrarroja', '40 LED de 940 nm: los animales no la ven.'], ['Ángulo de 52°', 'cubre un sendero entero desde un árbol.']].map(([h, d]) =>
            text(`<b style="color:${NV}">${h}</b><br>${d}`, 860, 0, 360, 110, { fontSize: 23, color: FG, lineHeight: 1.35 })).map((b, i) => ({ ...b, y: 180 + i * 150 })), 'fade-left', 'click', { duration: 450 })],
          notes: 'Dibujo propio de la cámara vista desde arriba, con el cono del sensor en degradado y los arcos de distancia. Las tres explicaciones entran una tras otra.' },
        { layout: 'blank', bg: '#081109', transition: 'fade', back: [lines()], extra: [
          text('Hecha para quedarse en el monte', 90, 70, 1100, 60, { fontFamily: head, fontSize: 44, fontWeight: 700, color: NV }),
          ...[['0,2 s', 'desde que algo se mueve hasta la foto'], ['8 meses', 'de espera con 8 pilas AA'], ['−20 °C', 'aguanta heladas, lluvia y polvo']].map(([n, l], i) =>
            withAnims(text(`<div style="font-family:${MONO};font-size:64px;font-weight:700;color:${NV};text-shadow:0 0 18px ${NV}66">${n}</div><div style="margin-top:18px">${l}</div>`, 90 + i * 375, 220, 345, 280,
              { fontSize: 26, color: FG, textAlign: 'center', vAlign: 'middle', borderColor: NV2, pad: [30, 24, 30, 24], radius: 4 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 500 }))),
          text('Cifras de ejemplo.', 90, 560, 1100, 30, { fontSize: 18, color: DIM, textAlign: 'center' })],
          notes: 'Tres cifras en recuadros de visor, que entran una detrás de otra. Pregunta al público cuánto creen que duran las pilas antes de enseñarlo.' },
        { layout: 'titleOnly', title: 'Quién pasa, y a qué hora', bg: BG, transition: 'slide', extra: [
          chartBlock({ x: 80, y: 150, w: 1120, h: 470, chartType: 'area', color: NV, seriesName: 'Zorro', grid: true, yTitle: 'Detecciones (un mes)',
            data: ['0 h', '2 h', '4 h', '6 h', '8 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h', '22 h'].map((l, i) => ({ label: l, value: [34, 41, 30, 18, 4, 1, 0, 1, 3, 9, 22, 31][i] })),
            series: [{ name: 'Jabalí', values: [22, 26, 19, 8, 1, 0, 0, 0, 2, 6, 15, 20], color: '#e0c25a' }, { name: 'Corzo', values: [3, 2, 6, 19, 14, 5, 2, 3, 6, 17, 9, 4], color: '#7fc9ff' }] }),
          text('Un mes de una cámara junto a un abrevadero. Datos de ejemplo.', 80, 640, 1120, 30, { fontSize: 16, color: DIM })],
          notes: 'Gráfico de áreas con tres especies: el zorro y el jabalí son nocturnos; el corzo sale al amanecer y al atardecer (crepuscular).' },
        { layout: 'titleOnly', title: 'El recuento del mes', bg: BG, transition: 'fade', extra: [
          tableBlock({ x: 90, y: 160, w: 1100, h: 380, fontSize: 26, color: FG, fontFamily: MONO, header: true, headBg: NV2, headFg: '#031004', stroke: '#1f4a27', banded: true, band: NV, bandAlpha: 0.07, colW: [3, 2, 2, 2, 2, 2],
            rows: [['Especie', 'Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4', 'Total'], ['Zorro', '48', '52', '61', '33', '=SUMA(IZQUIERDA)'], ['Jabalí', '30', '41', '25', '38', '=SUMA(IZQUIERDA)'],
              ['Corzo', '19', '22', '27', '24', '=SUMA(IZQUIERDA)'], ['Tejón', '6', '4', '9', '7', '=SUMA(IZQUIERDA)'], ['Total', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']] }),
          text('La app clasifica cada foto y rellena la tabla; los totales son fórmulas.', 90, 580, 1100, 40, { fontSize: 22, color: DIM })],
          notes: 'Tabla con fórmulas en la columna y en la fila «Total» (=SUMA(IZQUIERDA) y =SUMA(ARRIBA)). Ideal para un trabajo de clase de biología.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', fontSize: 30, x: 80, y: 60, w: 1120, h: 600, question: 'Une cada huella con su dueño',
          options: ['Zorro = Cuatro dedos y forma ovalada', 'Jabalí = Dos pezuñas y dos marcas detrás', 'Tejón = Cinco dedos con uñas largas', 'Corzo = Dos pezuñas finas en punta'] })],
          notes: 'Actividad de emparejar: cada persona une desde su móvil y al final se ven los aciertos. Buen momento para hablar de cómo se identifica a los animales sin verlos.' },
        { layout: 'blank', bg: BG, transition: 'fade', back: [img(nightWood(1280, 720), 0, 0, 1280, 720, 'Bosque de noche', { fit: 'cover', opacity: 60, decorative: true }), lines()], extra: [
          ...viewfinder(NV, RED, stamp('05:58:10')),
          text(glowTxt('Mira sin molestar.', NV), 90, 200, 800, 110, { fontFamily: MONO, fontSize: 72, fontWeight: 700 }),
          text('Vigía · 189 € · pack para centros educativos: 3 cámaras y 3 tarjetas por 499 €', 96, 340, 760, 90, { fontSize: 26, color: FG, lineHeight: 1.35 }),
          withAnims(text('Fin de la grabación', 96, 460, 500, 40, { fontFamily: MONO, fontSize: 22, color: RED }), A('fade-in', { start: 'afterPrev', delay: 600 }), A('pulse', { start: 'afterPrev' })),
          credits(['kh-Fox'], 70, 590, 1100, DIM)],
          notes: 'Cierre en el visor, a punto de amanecer. Precios inventados. El crédito del modelo del zorro (CC BY) va en la línea pequeña.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · Alba, a sunrise lamp: the sky brightens slide by slide, the sun rises with Transform, the lamp travels, a light curve, a Kelvin scale.
  prod_hw_lamp: { name: 'Alba: lámpara despertador', cat: 'product',
    summary: 'Amanecer en degradado: el sol sube con Transformar, lámpara 3D que viaja, cronología, curva de luz con ecuación, escala Kelvin y valoración',
    make: () => {
      const N1 = 'linear-gradient(180deg,#070a24 0%,#1d1640 65%,#3a1f45 100%)', N2 = 'linear-gradient(180deg,#141a44 0%,#4a2a5c 55%,#a8506a 100%)',
        N3 = 'linear-gradient(180deg,#2e3070 0%,#b85e78 55%,#f29a5e 100%)', DAY = '#fff6ea', CREAM = '#fff4e6', GOLD = '#ffb85c', ROSE = '#e8606a', INK = '#2b1a2e', DIM = '#d7c4e2', MUTE = '#7a6470';
      const head = pairStacks('editorial').heading, SUNH = uid(), SUNC = uid(), LAMP = uid(), HILLS = uid();
      const sun = (cx, cy, d) => [keep(shape('ellipse', cx - d, cy - d, d * 2, d * 2, GOLD, { fill2: '#3a1f45', gradType: 'radial', opacity: 45 }), SUNH),
        keep(shape('ellipse', cx - d / 2, cy - d / 2, d, d, '#fff1c9', { fill2: GOLD, gradType: 'radial' }), SUNC)];
      const hills = (c1, c2) => keep(img(svgURL(1280, 220, `<path d="M0 120 C220 40 420 60 620 110 S1000 30 1280 90 V220 H0Z" fill="${c1}"/><path d="M0 170 C300 110 520 150 760 160 S1100 120 1280 150 V220 H0Z" fill="${c2}"/>`), 0, 500, 1280, 220, 'Colinas', { decorative: true, fit: 'fill' }), HILLS);
      const stars = scatter(40, 21, r => shape('ellipse', Math.round(r() * 1240 + 20), Math.round(r() * 380 + 20), 3 + Math.round(r() * 3), 3 + Math.round(r() * 3), '#ffffff', { opacity: 35 + Math.round(r() * 50) }));
      const lamp = (x, y, w, h, props) => keep(m3d('kh-AnisotropyBarnLamp', x, y, w, h, props), LAMP);
      return numbered(build({ name: 'Alba · luz despertador', palette: 'warm', fonts: 'editorial', title: { color: INK, size: 44 }, body: { color: INK } }, [
        { layout: 'blank', bg: N1, transition: 'fade', transitionSpeed: 'slow', back: [...stars, ...sun(860, 700, 150), hills('#140d2c', '#0c081c')], extra: [
          text('LUZ DESPERTADOR', 90, 160, 520, 36, { fontSize: 20, color: GOLD, letterSpacing: 8 }),
          text('Alba', 80, 196, 600, 170, { fontFamily: head, fontSize: 140, fontWeight: 700, color: CREAM }),
          text('Despierta con un amanecer, aunque fuera siga siendo de noche.', 90, 380, 540, 100, { fontSize: 30, color: CREAM, lineHeight: 1.35 }),
          text('05:58 · faltan 32 minutos para tu alarma', 90, 500, 540, 36, { fontSize: 22, color: DIM }),
          lamp(800, 110, 400, 420, { autoRotate: false, motion: 'float', view: 'three', edge: 'fade' })],
          notes: 'Noche cerrada: un degradado de fondo, estrellas hechas con elipses y un sol escondido tras las colinas. En las dos diapositivas siguientes el sol sube con Transformar.' },
        { layout: 'blank', bg: N2, autoAnimate: true, back: [...sun(1160, 640, 160), hills('#2a1840', '#1a1030')], extra: [
          lamp(60, 120, 480, 460, { autoRotate: false, view: 'front', arrive: 'turn', edge: 'fade' }),
          text('Una lámpara de mesilla que amanece', 600, 90, 620, 120, { fontFamily: head, fontSize: 40, fontWeight: 700, color: CREAM, lineHeight: 1.2 }),
          ...chain([['Vidrio esmerilado', 'reparte la luz como un cielo, sin deslumbrar.'], ['Base de nogal con altavoz', 'pájaros, olas o tu emisora de radio.'], ['Un toque en la cabeza', 'diez minutos más, sin buscar el móvil.']].map(([h, d], i) =>
            text(`<b style="color:${GOLD}">${h}</b><br>${d}`, 600, 240 + i * 110, 600, 95, { fontSize: 25, color: CREAM, lineHeight: 1.35 })), 'fade-left', 'click', { duration: 450 })],
          notes: 'Transformar: el cielo cambia, el sol asoma por la derecha y la lámpara viaja a la izquierda dando una vuelta (Modelo 3D ▸ Desde la anterior ▸ Llega). Las tres ventajas entran con un clic.' },
        { layout: 'blank', bg: N3, autoAnimate: true, back: [...sun(1090, 250, 160), hills('#5a2a4a', '#3a1d38')], extra: [
          text('Treinta minutos de amanecer', 90, 60, 900, 70, { fontFamily: head, fontSize: 46, fontWeight: 700, color: CREAM }),
          dg('timeline', '06:00\n  Rojo tenue, al 1 %\n06:10\n  Naranja, al 10 %\n06:20\n  Ámbar, al 40 %\n06:30\n  Blanco cálido', 90, 170, 860, 330, { oneByOne: true, fontScale: 1.25, textColor: CREAM }),
          withAnims(text(`<span style="color:${GOLD}">♪</span> Y, a las 06:30, empiezan los pájaros.`, 90, 560, 900, 50, { fontSize: 28, color: CREAM, fontStyle: 'italic' }), A('fade-up', { sound: 'chime' }))],
          notes: 'El sol sigue subiendo (Transformar). La cronología aparece paso a paso; al final suena una campanilla, como el canto de los pájaros con el que despierta Alba.' },
        { layout: 'titleOnly', title: 'La curva de la luz', bg: DAY, transition: 'fade', back: [glow(900, -320, 700, '#ffd9a0', DAY, 80)], extra: [
          chartBlock({ x: 80, y: 160, w: 700, h: 470, chartType: 'area', color: '#f08a3c', seriesName: 'Intensidad', grid: true, yTitle: 'Intensidad (%)', xTitle: 'Minutos desde que empieza',
            data: [0, 5, 10, 15, 20, 25, 30].map((t, i) => ({ label: String(t), value: [0, 2, 9, 22, 41, 67, 100][i] })) }),
          mathBlock({ x: 820, y: 200, w: 380, h: 120, fontSize: 42, color: INK, latex: 'I(t) = I_{\\max}\\left(\\frac{t}{T}\\right)^{2{,}2}' }),
          text('El ojo no percibe la luz de forma lineal. Subirla así hace que el amanecer parezca regular, sin saltos bruscos.', 820, 360, 380, 200, { fontSize: 24, color: INK, lineHeight: 1.45 })],
          notes: 'Gráfico de áreas y ecuación: la intensidad crece con una potencia de 2,2 (la «gamma» de la vista). T son los 30 minutos del amanecer.' },
        { layout: 'titleOnly', title: 'De la luz de una vela al mediodía', bg: DAY, transition: 'slide', extra: [
          shape('rounded', 90, 330, 1100, 70, '#ff7a1a', { fill2: '#d9e8ff', gradType: 'linear', gradAngle: 0, radius: 8 }),
          ...[[1800, 'Vela', 'up'], [2500, 'Amanecer', 'up'], [2700, 'Bombilla', 'down'], [5500, 'Mediodía', 'up'], [6500, 'Cielo nublado', 'up']].map(([k, n, pos]) => { const x = Math.round(90 + (k - 1800) / 4700 * 1100);
            const tx = k === 1800 ? x : k === 6500 ? x - 220 : x - 110, al = k === 1800 ? 'left' : k === 6500 ? 'right' : 'center';
            return [shape('rect', x - 1, pos === 'up' ? 300 : 330, 3, pos === 'up' ? 100 : 76, INK), text(`<b>${n}</b><br>${k.toLocaleString('es-ES', { useGrouping: 'always' })} K`, tx, pos === 'up' ? 220 : 412, k === 1800 ? 120 : 220, 70, { fontSize: 22, color: INK, textAlign: al, lineHeight: 1.25 })]; }).flat(),
          withAnims(shape('rounded', 90, 520, 515, 8, ROSE, { radius: 4 }), A('fade-right', { duration: 900 })),
          withAnims(text('Alba recorre esta franja en 30 minutos: de 1.800 K a 4.000 K.', 90, 540, 700, 40, { fontSize: 24, color: ROSE, fontWeight: 700 }), A('fade-up', { start: 'afterPrev' }))],
          notes: 'Escala de temperatura de color hecha con una sola forma con degradado lineal. Cuanto más baja la cifra en kelvin, más cálida (más roja) es la luz.' },
        { layout: 'titleOnly', title: '¿Cómo te sientes al despertar?', bg: DAY, transition: 'fade', extra: [
          chartBlock({ x: 80, y: 160, w: 760, h: 470, chartType: 'bar', color: '#b9a7c2', seriesName: 'Con alarma de sonido', dataLabels: true, grid: true, yTitle: '% de las mañanas',
            data: ['Despejado', 'Normal', 'Aturdido'].map((l, i) => ({ label: l, value: [18, 47, 35][i] })), series: [{ name: 'Con Alba', values: [46, 41, 13], color: '#f08a3c' }] }),
          text('El aturdimiento cae de un 35 % a un 13 % de las mañanas.', 880, 220, 320, 160, { fontFamily: head, fontSize: 30, fontWeight: 700, color: INK, lineHeight: 1.3 }),
          text('Prueba de dos semanas con 120 personas. Datos inventados para la plantilla.', 880, 420, 320, 100, { fontSize: 20, color: MUTE, lineHeight: 1.4 })],
          notes: 'Barras agrupadas: cada persona usó una semana la alarma de siempre y otra semana Alba, y apuntó cómo se sentía cada mañana.' },
        { layout: 'blank', bg: N2, transition: 'fade', back: [...stars.slice(0, 20)], extra: [pollBlock({ kind: 'rating', fontSize: 34, x: 80, y: 60, w: 1120, h: 600,
          question: 'Del 1 al 5: ¿cuánto te cuesta levantarte por la mañana?' })],
          notes: 'Valoración de 1 a 5 desde el móvil. Comenta la media: casi nunca baja de 3.' },
        { layout: 'blank', bg: 'linear-gradient(180deg,#ffd9a8 0%,#fff6ea 60%)', transition: 'zoom', back: [glow(820, -260, 640, '#fff1c9', '#ffd9a8', 90)], extra: [
          text('Buenos días.', 90, 190, 760, 140, { fontFamily: head, fontSize: 88, fontWeight: 700, color: INK }),
          text(`Alba · <b style="color:${ROSE}">119 €</b> · dos años de garantía`, 96, 350, 660, 50, { fontSize: 30, color: INK }),
          text('Llega a las tiendas en noviembre, justo cuando los días se acortan.', 96, 410, 620, 80, { fontSize: 24, color: MUTE, lineHeight: 1.4 }),
          m3d('kh-AnisotropyBarnLamp', 800, 140, 400, 440, { autoRotate: true, spin: 14, view: 'three', edge: 'fade' }),
          credits(['kh-AnisotropyBarnLamp'], 90, 640, 1100, MUTE)],
          notes: 'Ya es de día: el fondo es claro y cálido. La lámpara gira despacio. Precio y fechas inventados.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · Horizonte, cycling glasses with data on the lens: the road seen through them, the glasses in 3D with Transform, numbered HUD parts, YAML, radial.
  prod_hw_glasses: { name: 'Horizonte: gafas con datos para ciclistas', cat: 'product',
    summary: 'La carretera a través de la lente: gafas 3D con Transformar, partes numeradas con sonido, barras, código YAML por pasos, radial y votación',
    make: () => {
      const BG = '#0b2233', HUD = '#5ef2ff', FG = '#f2f6fa', DIM = '#9db4c7', SUN = '#ffb547', CAR = '#ff6a3d', head = pairStacks('clean').heading, G = uid();
      // The road to the horizon (day or sunset), optionally with the data on the lens drawn in.
      const OUT = ' font-weight="700" stroke="#06121c" stroke-opacity=".75" stroke-width="4" paint-order="stroke"';
      const road = (w, h, dusk, hud) => { const hy = h * 0.58, vx = w * 0.56;
        return svgURL(w, h, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dusk ? '#2b2560' : '#3f97d6'}"/><stop offset="1" stop-color="${dusk ? '#ff9a5a' : '#f7dcae'}"/></linearGradient></defs>`
          + R(0, 0, w, hy + 2, 0, 'url(#s)') + `<circle cx="${w * 0.78}" cy="${hy - h * 0.12}" r="${h * 0.07}" fill="${dusk ? '#ffd27a' : '#fff6d8'}"/>`
          + `<path d="M0 ${hy} L${w * 0.14} ${hy - h * 0.16} L${w * 0.3} ${hy - h * 0.05} L${w * 0.46} ${hy - h * 0.2} L${w * 0.64} ${hy - h * 0.06} L${w * 0.82} ${hy - h * 0.18} L${w} ${hy - h * 0.04} V${hy} Z" fill="${dusk ? '#4b3a78' : '#7c9cc0'}"/>`
          + `<path d="M0 ${hy} L${w * 0.2} ${hy - h * 0.07} L${w * 0.4} ${hy - h * 0.02} L${w * 0.7} ${hy - h * 0.09} L${w} ${hy - h * 0.01} V${hy} Z" fill="${dusk ? '#33285a' : '#4f6f8f'}"/>`
          + R(0, hy, w, h - hy, 0, dusk ? '#4c5a3a' : '#86b35e') + `<path d="M0 ${h} L0 ${h * 0.82} L${w} ${h * 0.7} L${w} ${h}Z" fill="${dusk ? '#3d4a30' : '#74a04f'}"/>`
          + `<path d="M${w * 0.12} ${h} L${vx - 6} ${hy} L${vx + 6} ${hy} L${w * 0.98} ${h}Z" fill="${dusk ? '#3a3a44' : '#5a5f68'}"/>`
          + Array.from({ length: 7 }, (_, i) => { const t0 = Math.pow(i / 7, 1.8), t1 = Math.pow((i + 0.5) / 7, 1.8), y0 = hy + (h - hy) * t0, y1 = hy + (h - hy) * t1, x0 = vx + (w * 0.55 - vx) * t0, x1 = vx + (w * 0.55 - vx) * t1, k0 = 1 + 9 * t0, k1 = 1 + 9 * t1;
            return `<path d="M${x0 - k0} ${y0} L${x0 + k0} ${y0} L${x1 + k1} ${y1} L${x1 - k1} ${y1}Z" fill="#ffffff" fill-opacity=".85"/>`; }).join('')
          + (hud ? T(w * 0.06, h * 0.12, h * 0.07, HUD, '32 km/h', OUT) + T(w * 0.8, h * 0.12, h * 0.06, HUD, '♥ 142', OUT)
            + T(w * 0.5, h * 0.9, h * 0.05, HUD, '↱ 400 m', ' text-anchor="middle"' + OUT) + T(w * 0.06, h * 0.9, h * 0.05, CAR, '▲ 60 m', OUT) : ''), '#000'); };
      const hudTxt = (s, x, y, w, size, c = HUD, props = {}) => text(`<span style="text-shadow:0 0 12px ${c}aa">${s}</span>`, x, y, w, size * 1.4, { fontFamily: head, fontSize: size, fontWeight: 700, color: c, ...props });
      const glasses = (x, y, w, h, props) => keep(m3d('kh-SunglassesKhronos', x, y, w, h, props), G);
      return numbered(build({ name: 'Horizonte · gafas para ciclistas', palette: 'ocean', fonts: 'clean', title: { color: FG, size: 44 }, body: { color: FG } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [img(road(1280, 720, false, false), 0, 0, 1280, 720, 'Carretera de montaña hacia el horizonte', { fit: 'cover', decorative: true }),
          shape('rounded', 0, 0, 580, 720, BG, { radius: 0, opacity: 82 })], extra: [
          text('GAFAS PARA CICLISTAS CON DATOS EN LA LENTE', 70, 180, 480, 60, { fontSize: 18, color: HUD, letterSpacing: 4, lineHeight: 1.5 }),
          text('Horizonte', 64, 250, 500, 110, { fontFamily: head, fontSize: 88, fontWeight: 800, color: FG, letterSpacing: -2 }),
          text('Todo lo que necesitas saber, sin dejar de mirar la carretera.', 70, 380, 460, 100, { fontSize: 28, color: DIM, lineHeight: 1.35 }),
          ...chain([hudTxt('32 km/h', 660, 60, 300, 56), hudTxt('♥ 142', 1040, 66, 200, 44, HUD, { textAlign: 'right' }), hudTxt('↱ 400 m · gira a la derecha', 660, 600, 560, 36, HUD, { textAlign: 'center' })], 'fade-in', 'afterPrev', { duration: 700 })],
          notes: 'Portada «a través de la lente»: un paisaje dibujado en SVG y, encima, los datos que proyectan las gafas, que se encienden solos uno tras otro.' },
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(560, 40, 700, '#1d4f6e', BG, 70)], extra: [
          text('Lo que necesitas, sin bajar la vista', 90, 150, 480, 140, { fontFamily: head, fontSize: 44, fontWeight: 800, color: FG, lineHeight: 1.15 }),
          text('Un pequeño proyector dibuja los datos en la parte de arriba de la lente derecha. Los ves «flotando» a cinco metros, sobre la carretera.', 90, 320, 460, 180, { fontSize: 25, color: DIM, lineHeight: 1.45 }),
          glasses(580, 120, 640, 460, { autoRotate: true, spin: 20, view: 'front', edge: 'fade' })],
          notes: 'Las gafas 3D giran solas; puedes arrastrarlas para enseñarlas por dentro. En la siguiente diapositiva se encogen y se colocan de lado con Transformar.' },
        { layout: 'blank', bg: BG, autoAnimate: true, extra: [
          text('Ligeras como unas gafas de sol', 90, 120, 560, 140, { fontFamily: head, fontSize: 44, fontWeight: 800, color: FG, lineHeight: 1.15 }),
          glasses(700, 60, 520, 340, { autoRotate: false, view: 'side', arrive: 'turn' }),
          ...[['31 g', 'con la batería incluida'], ['9 h', 'de pantalla encendida'], ['IP67', 'lluvia, sudor y polvo']].map(([n, l], i) =>
            withAnims(stat(n, l, 90 + i * 380, 430, 340, HUD, FG, 96, { fontSize: 26 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 500 })))],
          notes: 'Transformar: las gafas viajan a la esquina y llegan dando una vuelta hasta quedar de lado. Después, las tres cifras entran seguidas con un clic. Cifras de ejemplo.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ kind: 'multi', fontSize: 30, x: 80, y: 60, w: 1120, h: 600,
          question: 'Elige los tres datos que querrías ver en la lente', options: ['Velocidad', 'Pulso', 'Próximo giro', 'Coches detrás', 'Desnivel que queda', 'Potencia', 'Hora de llegada'] })],
          notes: 'Votación de opción múltiple: cada persona marca tres. Después, compara el resultado con los cuatro datos que trae de serie (diapositiva siguiente).' },
        { layout: 'titleOnly', title: 'Cuatro datos, siempre en el mismo sitio', bg: BG, transition: 'slide', extra: [
          img(road(700, 420, false, true), 90, 170, 700, 420, 'Vista a través de la lente con velocidad, pulso, próximo giro y aviso de coche'),
          ...[[96, 160, 'Velocidad', 'arriba a la izquierda'], [660, 160, 'Pulso', 'arriba a la derecha'], [440, 504, 'Próximo giro', 'abajo, en el centro'], [112, 504, 'Coche detrás', 'del radar trasero, en naranja']].flatMap(([x, y, h, d], i) => [
            withAnims(shape('ellipse', x - 22, y - 22, 44, 44, SUN, { stroke: BG, strokeWidth: 3 }), A('zoom-in', { start: 'click', duration: 300, sound: 'pop' })),
            withAnims(text(String(i + 1), x - 22, y - 20, 44, 40, { fontSize: 24, fontWeight: 800, color: BG, textAlign: 'center' }), A('zoom-in', { start: 'withPrev', duration: 300 })),
            withAnims(text(`<b style="color:${SUN}">${i + 1} · ${h}</b><br>${d}`, 840, 180 + i * 105, 360, 90, { fontSize: 24, color: FG, lineHeight: 1.35 }), A('fade-left', { start: 'withPrev', duration: 400 }))])],
          notes: 'Cada clic enciende un número sobre la vista con un «pop» y su explicación a la derecha. Insiste en que los datos no tapan nunca el centro de la carretera.' },
        { layout: 'titleOnly', title: 'Menos tiempo mirando abajo', bg: BG, transition: 'fade', extra: [
          chartBlock({ x: 80, y: 170, w: 780, h: 440, chartType: 'hbar', color: DIM, dataLabels: true, xTitle: 'Segundos por hora con la vista fuera de la carretera',
            data: [{ label: 'Móvil en un soporte', value: 260 }, { label: 'Ciclocomputador', value: 210 }, { label: 'Reloj en la muñeca', value: 150 }, { label: 'Gafas Horizonte', value: 15, color: HUD }] }),
          text(`<div style="font-size:80px;font-weight:800;color:${HUD};line-height:1;white-space:nowrap">−94 %</div><div style="margin-top:12px">de miradas fuera de la carretera frente a un móvil en el manillar.</div>`, 890, 220, 320, 320, { fontSize: 24, color: FG, lineHeight: 1.35 }),
          text('Prueba en circuito con 40 ciclistas, datos de ejemplo.', 80, 630, 780, 30, { fontSize: 16, color: DIM })],
          notes: 'Barras horizontales: el dato clave es el último. Un segundo mirando abajo a 30 km/h son más de ocho metros a ciegas.' },
        { layout: 'titleOnly', title: 'Tu pantalla, a tu manera', bg: BG, transition: 'fade', extra: [
          codeBlock({ x: 90, y: 170, w: 640, h: 440, fontSize: 24, lang: 'yaml', lineSteps: '1-4|5-8|9',
            code: 'pantalla:\n  arriba_izquierda: velocidad\n  arriba_derecha: pulso\n  abajo: proximo_giro\navisos:\n  coche_detras: vibrar\n  pulso_maximo: 175\n  beber_agua: cada 20 min\nmodo_noche: automatico' }),
          ...chain([['Qué ves', 'elige el dato de cada esquina.'], ['Cuándo te avisa', 'vibración, sonido o un destello.'], ['De noche', 'el brillo baja solo al anochecer.']].map(([h, d], i) =>
            text(`<b style="color:${HUD}">${h}</b><br>${d}`, 780, 200 + i * 130, 420, 100, { fontSize: 25, color: FG, lineHeight: 1.35 })), 'fade-left', 'click', { duration: 400 })],
          notes: 'Código con pasos de resaltado: cada clic ilumina un bloque del archivo de ajustes y su explicación. Quien no quiera tocar código tiene lo mismo en la app.' },
        { layout: 'titleOnly', title: 'Se entiende con todo lo que ya llevas', bg: BG, transition: 'fade', extra: [
          dg('radial', 'Horizonte\n  Pulsómetro\n  Radar trasero\n  Potenciómetro\n  Móvil\n  Casco con luces\n  Sensor de cadencia', 190, 150, 900, 520, { colors: 'colorful', fontScale: 1.7, oneByOne: true })],
          notes: 'Diagrama radial que aparece pieza a pieza. Todo se conecta por Bluetooth de bajo consumo y protocolos abiertos.' },
        { layout: 'blank', bg: BG, transition: 'zoom', back: [img(road(1280, 720, true, false), 0, 0, 1280, 720, 'Carretera al atardecer', { fit: 'cover', decorative: true }),
          shape('rounded', 0, 0, 1280, 300, BG, { radius: 0, opacity: 55 }), shape('rounded', 0, 640, 1280, 80, BG, { radius: 0, opacity: 75 })], extra: [
          text('Mira lejos.', 90, 60, 800, 120, { fontFamily: head, fontSize: 96, fontWeight: 800, color: FG, letterSpacing: -2 }),
          text(`Horizonte · <b style="color:${SUN}">279 €</b> · primavera de 2027`, 96, 190, 900, 50, { fontSize: 30, color: FG }),
          credits(['kh-SunglassesKhronos'], 90, 660, 1100, '#ffffffcc')],
          notes: 'Cierre al atardecer, con el mismo paisaje en tonos violeta. Precio y fecha inventados.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · Tecla, a modular mechanical keyboard: keycaps that pop in with a click, force curves, an exploded view, a keymap in code, a parts list with formulas.
  prod_hw_keyboard: { name: 'Tecla: teclado mecánico modular', cat: 'product',
    summary: 'Teclas que saltan con sonido de clic, curvas de fuerza, despiece por capas, mapa de teclas en código, presupuesto con fórmulas y ordenar',
    make: () => {
      const BG = '#1b1030', PANEL = '#2a1c48', FG = '#f3eefe', DIM = '#b4a6d6', Y = '#fee440', P = '#f15bb5', B = '#00bbf9', W = '#f3eefe', head = pairStacks('bold').heading;
      const shade = { [Y]: '#c9b21f', [P]: '#b8408a', [B]: '#0088b8', [W]: '#b9b0cf', '#3d2f63': '#22183c' };
      // A keycap, drawn: the side, the top face and its legend.
      const cap = (label, c, x, y, s, props = {}, wU = 1) => img(svgURL(100 * wU, 100, R(2, 2, 100 * wU - 4, 96, 16, shade[c] || '#444') + R(10, 6, 100 * wU - 20, 74, 12, c)
        + `<rect x="10" y="6" width="${100 * wU - 20}" height="30" rx="12" fill="#ffffff" fill-opacity=".18"/>`
        + T(50 * wU, 56, label.length > 2 ? 22 : 40, c === '#3d2f63' ? FG : '#1b1030', label, ' text-anchor="middle" font-weight="700"', 'Roboto, Arial, sans-serif')), x, y, s * wU, s, `Tecla ${label}`, { fit: 'fill', ...props });
      const layers = [['Carcasa de aluminio', '#8d8fa3'], ['Espuma que amortigua', '#4b3f6b'], ['Placa de circuito', '#2f7d4f'], ['Placa de acero', '#c0c4d0'], ['Interruptores', P], ['Teclas', Y]];
      return numbered(build({ name: 'Tecla · teclado mecánico', palette: 'violet', fonts: 'bold', title: { color: FG, size: 64, bold: false }, body: { color: FG } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(240, -260, 800, '#3d2470', BG, 60),
          ...scatter(10, 5, (r, i) => cap(['Q', 'W', 'Z', 'X', '1', '2', '?', '%', 'K', 'J'][i], '#3d2f63', [40, 150, 1100, 1180, 60, 1060, 160, 1150, 980, 300][i], [60, 520, 80, 560, 380, 300, 600, 420, 580, 40][i], 70, { rotation: Math.round(r() * 40 - 20), opacity: 50 }))], extra: [
          ...['T', 'E', 'C', 'L', 'A'].map((l, i) => withAnims(cap(l, [P, Y, B, W, P][i], 225 + i * 170, 210, 150), A('bounce', { start: 'afterPrev', duration: 450, sound: 'click', delay: i ? 0 : 300 }))),
          text('Teclado mecánico modular', 140, 420, 1000, 60, { fontSize: 40, color: FG, textAlign: 'center', fontWeight: 700 }),
          text('Lo montas tú. Lo arreglas tú. Te dura años.', 140, 490, 1000, 50, { fontSize: 30, color: DIM, textAlign: 'center' })],
          notes: 'Las cinco teclas del nombre saltan solas una tras otra, cada una con su clic (Animaciones ▸ Sonido ▸ Clic). Las teclas son dibujos SVG propios; las del fondo, más pequeñas y giradas.' },
        { layout: 'blank', bg: BG, transition: 'slide', extra: [
          text('LO QUE SIENTEN TUS DEDOS', 90, 50, 1100, 80, { fontFamily: head, fontSize: 64, color: FG, letterSpacing: 2 }),
          chartBlock({ x: 70, y: 150, w: 760, h: 490, chartType: 'line', color: Y, seriesName: 'Lineal', grid: true, xTitle: 'Recorrido de la tecla (mm)', yTitle: 'Fuerza (gramos)',
            data: ['0', '0,5', '1', '1,5', '2', '2,5', '3', '3,5', '4'].map((l, i) => ({ label: l, value: [0, 35, 40, 45, 50, 55, 60, 65, 70][i] })),
            series: [{ name: 'Táctil', values: [0, 45, 64, 46, 50, 55, 60, 66, 72], color: P }, { name: 'Clic', values: [0, 52, 72, 38, 52, 58, 62, 68, 76], color: B }] }),
          ...[['Lineal', 'suave de arriba abajo', Y], ['Táctil', 'un pequeño bache a mitad', P], ['Clic', 'bache y un «clic» audible', B]].flatMap(([h, d, c], i) => [
            cap(h[0], c, 870, 180 + i * 150, 90), text(`<b style="color:${c}">${h}</b><br>${d}`, 980, 180 + i * 150, 240, 130, { fontSize: 24, color: FG, lineHeight: 1.35 })])],
          notes: 'Curvas de fuerza de los tres tipos de interruptor (datos de ejemplo). El pico de las curvas táctil y de clic es el «bache» que notas al pulsar.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          text('SEIS CAPAS, NI UN PEGAMENTO', 90, 50, 1100, 80, { fontFamily: head, fontSize: 64, color: FG, letterSpacing: 2 }),
          ...layers.flatMap(([n, c], i) => { const y = 560 - i * 78;
            return [withAnims(shape('parallelogram', 130, y, 560, 56, c, { stroke: '#00000055', strokeWidth: 2 }), A('fade-down', { start: i ? 'afterPrev' : 'click', duration: 400 })),
              withAnims(shape('line', 700, y + 28, 120, 2, 'none', { stroke: DIM, strokeWidth: 2, dash: 'dash' }), A('fade-in', { start: 'withPrev', duration: 400 })),
              withAnims(text(n, 840, y + 6, 360, 44, { fontSize: 28, color: FG, fontWeight: 700 }), A('fade-left', { start: 'withPrev', duration: 400 }))]; })],
          notes: 'Despiece por capas, de abajo arriba, con un solo clic: cada capa trae con ella su línea y su nombre. Todo va atornillado: se desmonta con un destornillador.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          text('CAPAS: UNA TECLA, VARIAS FUNCIONES', 90, 50, 1100, 80, { fontFamily: head, fontSize: 60, color: FG, letterSpacing: 2 }),
          codeBlock({ x: 90, y: 160, w: 720, h: 470, fontSize: 21, lang: 'c', lineSteps: '1-6|8-13',
            code: '// Capa 0: escribir\n[CAPA_BASE] = TECLAS(\n  ESC,   Q, W, E, R, T,\n  TAB,   A, S, D, F, G,\n  MAYUS, Z, X, C, V, B\n),\n\n// Capa 1: mientras mantienes FN\n[CAPA_FN] = TECLAS(\n  _, F1,     F2,      F3, F4, F5,\n  _, VOL_MAS, VOL_MENOS, _, _, _,\n  _, LUZ_MAS, LUZ_MENOS, _, _, _\n),' }),
          text(`<b style="color:${Y}">Capa base</b>: lo que escribes cada día.<br><br><b style="color:${P}">Capa FN</b>: mantén FN y las mismas teclas suben el volumen o la luz.<br><br>El mapa se edita en el navegador, sin instalar nada.`, 850, 180, 350, 420, { fontSize: 24, color: FG, lineHeight: 1.4 })],
          notes: 'Código con pasos de resaltado: primer clic, la capa base; segundo clic, la capa FN. El formato es inventado, parecido al de los firmwares libres de teclados.' },
        { layout: 'blank', bg: BG, transition: 'slide', extra: [
          text('MONTA EL TUYO', 90, 50, 1100, 80, { fontFamily: head, fontSize: 64, color: FG, letterSpacing: 2 }),
          tableBlock({ x: 90, y: 160, w: 1100, h: 380, fontSize: 26, color: FG, header: true, headBg: P, headFg: '#1b1030', stroke: '#4b3a78', banded: true, band: Y, bandAlpha: 0.07, colW: [5, 3, 2, 3],
            rows: [['Pieza', 'Precio', 'Cantidad', 'Subtotal'], ['Carcasa de aluminio', '69 €', '1', '=B2*C2'], ['Placa de circuito', '45 €', '1', '=B3*C3'], ['Interruptores táctiles', '0,45 €', '70', '=B4*C4'],
              ['Juego de teclas', '39 €', '1', '=B5*C5'], ['Total', '', '', '=SUMA(ARRIBA)']] }),
          text('Los subtotales y el total son fórmulas: cambia el número de interruptores y se recalcula.', 90, 570, 1100, 40, { fontSize: 22, color: DIM })],
          notes: 'Presupuesto con fórmulas (=B2*C2 y =SUMA(ARRIBA)), que llevan el euro con ellas. Precios inventados.' },
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(700, 120, 640, '#3d2470', BG, 60)], extra: [
          withAnims(text('50 MILLONES', 90, 140, 1100, 200, { fontFamily: head, fontSize: 190, color: Y, letterSpacing: 4 }), A('zoom-in', { duration: 800, sound: 'drumroll' })),
          withAnims(text('de pulsaciones aguanta cada interruptor.', 96, 350, 1000, 60, { fontSize: 40, color: FG }), A('fade-up', { start: 'afterPrev' })),
          withAnims(text(`Si escribes unos 4 millones de pulsaciones al año, te dura <b style="color:${P}">más de 12 años</b>. Y si uno falla, se cambia en un minuto.`, 96, 440, 900, 100, { fontSize: 28, color: DIM, lineHeight: 1.4 }), A('fade-up', { start: 'click' }))],
          notes: 'Cifra gigante con redoble. La segunda frase llega con otro clic: deja que el público haga la cuenta antes de enseñarla.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', fontSize: 30, x: 80, y: 60, w: 1120, h: 600, question: 'Ordena los pasos para cambiar un interruptor',
          options: ['Quitar la tecla con el extractor', 'Sacar el interruptor con la pinza', 'Encajar el nuevo interruptor', 'Volver a poner la tecla'] })],
          notes: 'Actividad de ordenar: el móvil de cada persona muestra los pasos desordenados. No hace falta soldador: los interruptores van a presión.' },
        { layout: 'blank', bg: BG, transition: 'zoom', back: [glow(340, 60, 600, '#3d2470', BG, 60)], extra: [
          withAnims(cap('INTRO ⏎', P, 440, 170, 160, {}, 2.5), A('bounce', { start: 'afterPrev', sound: 'click' }), A('pulse', { start: 'afterPrev', duration: 900 })),
          text('Pulsa para reservar el tuyo', 140, 380, 1000, 60, { fontSize: 40, color: FG, textAlign: 'center', fontWeight: 700 }),
          text('Tecla 65 % · desde 159 € · envíos en febrero', 140, 450, 1000, 50, { fontSize: 28, color: DIM, textAlign: 'center' })],
          notes: 'Cierre: una tecla «Intro» grande que salta y late. Precio y fecha inventados.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Templa, a smart thermostat: a round dial, a house in cross-section with its rooms, a waterfall of savings, equations, a 24-hour line, a matrix.
  prod_hw_thermostat: { name: 'Templa: termostato inteligente', cat: 'product',
    summary: 'Esfera de termostato y casa en sección con temperaturas que aparecen, cascada de ahorro, ecuaciones, líneas de 24 horas, matriz y votación',
    make: () => {
      const BG = '#f4efe6', CARD = '#ffffff', INK = '#23303a', HEAT = '#e8743b', COLD = '#3b7ea8', MID = '#7d8992', head = pairStacks('modern').heading, DIAL = uid(), VAL = uid();
      // The dial: a 270° scale of ticks, the part in use in a gradient from cold to warm, and the knob.
      const dial = (pct) => { const c = 260, r = 200, a0 = 135, a1 = 135 + 270 * pct, P = (a, rr) => [c + rr * Math.cos(a * Math.PI / 180), c + rr * Math.sin(a * Math.PI / 180)];
        const arc = (from, to, rr) => { const [x0, y0] = P(from, rr), [x1, y1] = P(to, rr); return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${rr} ${rr} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
        return svgURL(520, 520, `<defs><linearGradient id="h" x1="0" x2="1"><stop offset="0" stop-color="${COLD}"/><stop offset="1" stop-color="${HEAT}"/></linearGradient>`
          + `<radialGradient id="f" cx=".5" cy=".4"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ece6da"/></radialGradient></defs>`
          + `<circle cx="${c}" cy="${c}" r="250" fill="#e6dfd2"/><circle cx="${c}" cy="${c}" r="236" fill="url(#f)"/>`
          + Array.from({ length: 55 }, (_, i) => { const a = a0 + i * 5, [x0, y0] = P(a, 222), [x1, y1] = P(a, i % 5 ? 212 : 202);
            return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${a <= a1 ? '#5a6670' : '#c9c1b2'}" stroke-width="${i % 5 ? 2 : 3}"/>`; }).join('')
          + `<path d="${arc(a0, 405, r - 18)}" fill="none" stroke="#e9e2d5" stroke-width="16" stroke-linecap="round"/>`
          + `<path d="${arc(a0, a1, r - 18)}" fill="none" stroke="url(#h)" stroke-width="16" stroke-linecap="round"/>`
          + (() => { const [x, y] = P(a1, r - 18); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="#ffffff" stroke="${HEAT}" stroke-width="6"/>`; })()); };
      const house = () => svgURL(640, 520, `<path d="M20 200 L320 30 L620 200 Z" fill="#c9b9a3"/><path d="M60 190 L320 50 L580 190 Z" fill="#e6d9c4"/>`
        + R(60, 200, 520, 300, 0, '#d8ccb8') + [[70, 210, 250, 135, '#fde3d3'], [330, 210, 240, 135, '#dbe9f3'], [70, 355, 250, 135, '#fde3d3'], [330, 355, 240, 135, '#fbeadb']].map(([x, y, w, h, c]) => R(x, y, w, h, 4, c)).join('')
        + R(390, 256, 70, 48, 4, '#bcd8ec', ' stroke="#8fa9bc" stroke-width="4"') + `<path d="M455 256 l40 -16 v48 l-40 16z" fill="#bcd8ec" stroke="#8fa9bc" stroke-width="3"/>`
        + R(100, 300, 120, 34, 8, '#c98a6a') + R(400, 320, 120, 24, 6, '#9fb3c2') + R(400, 309, 30, 15, 6, '#ffffff') + R(100, 440, 90, 50, 4, '#b7a48a') + R(220, 420, 70, 70, 4, '#a8957a')
        + R(370, 430, 170, 18, 4, '#c3a07a') + R(390, 448, 12, 42, 2, '#a8865f') + R(510, 448, 12, 42, 2, '#a8865f') + R(50, 495, 540, 10, 0, '#8d7c66'));
      return numbered(build({ name: 'Templa · termostato', palette: 'office', fonts: 'modern', title: { color: INK, size: 44 }, body: { color: INK } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(560, 0, 760, '#f6dcc6', BG, 80)], extra: [
          text('TERMOSTATO INTELIGENTE', 90, 190, 520, 36, { fontSize: 20, color: HEAT, letterSpacing: 7, fontWeight: 700 }),
          text('Templa', 84, 226, 560, 130, { fontFamily: head, fontSize: 110, fontWeight: 800, color: INK, letterSpacing: -3 }),
          text('El termostato que aprende cómo vives y calienta solo lo que hace falta.', 90, 370, 540, 130, { fontSize: 28, color: MID, lineHeight: 1.4 }),
          keep(img(dial(0.62), 680, 100, 520, 520, 'Esfera del termostato'), DIAL),
          keep(text('21,5°', 760, 290, 360, 120, { fontFamily: head, fontSize: 104, fontWeight: 700, color: INK, textAlign: 'center' }), VAL),
          text('Calefacción · en casa', 760, 410, 360, 40, { fontSize: 22, color: MID, textAlign: 'center' })],
          notes: 'La esfera es un dibujo SVG propio: escala de 270°, arco en degradado del frío al calor y el mando. La cifra va aparte, como texto editable.' },
        { layout: 'blank', bg: BG, autoAnimate: true, extra: [
          keep(img(dial(0.62), 1050, 40, 170, 170, 'Esfera del termostato'), DIAL),
          keep(text('21,5°', 1070, 100, 130, 50, { fontFamily: head, fontSize: 34, fontWeight: 700, color: INK, textAlign: 'center' }), VAL),
          text('Cada habitación, a su temperatura', 90, 60, 900, 70, { fontFamily: head, fontSize: 42, fontWeight: 800, color: INK }),
          img(house(), 90, 150, 600, 488, 'Casa en sección con salón, dormitorio, cocina y estudio'),
          ...[[164, 352, 'Salón', '21 °C', HEAT], [406, 352, 'Dormitorio', '18 °C', COLD], [164, 489, 'Cocina', '20 °C', HEAT], [406, 489, 'Estudio', '20 °C', HEAT]].map(([x, y, n, t, c], i) =>
            withAnims(text(`<b>${n}</b> <span style="color:${c};font-weight:800">${t}</span>`, x, y, 210, 36, { fontSize: 20, color: INK, bg: '#ffffffdd', radius: 8, pad: [4, 10, 4, 10] }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 350 }))),
          withAnims(card(`<b style="color:${COLD}">Ventana abierta en el dormitorio</b><br>Templa lo nota por la bajada brusca y pausa esa habitación.`, 740, 200, 450, 170, CARD, { fontSize: 24, color: INK, lineHeight: 1.4, borderColor: COLD, pad: [24, 76, 24, 26] }), A('fade-left', { start: 'click' })),
          withAnims(icon('wind', 1124, 222, 44, COLD), A('teeter', { start: 'afterPrev', duration: 900 })),
          withAnims(card(`<b style="color:${HEAT}">Válvulas en cada radiador</b><br>Cuatro zonas, cuatro horarios distintos.`, 740, 400, 450, 140, CARD, { fontSize: 24, color: INK, lineHeight: 1.4 }), A('fade-left', { start: 'click' }))],
          notes: 'Transformar: la esfera de la portada se encoge en la esquina. Luego aparecen las temperaturas de cada habitación y el aviso de ventana abierta, con un icono que se balancea.' },
        { layout: 'titleOnly', title: 'De dónde sale el ahorro', bg: BG, transition: 'slide', extra: [
          chartBlock({ x: 80, y: 160, w: 1120, h: 470, chartType: 'waterfall', color: HEAT, dataLabels: true, grid: true, yTitle: 'Euros al año',
            data: [{ label: 'Factura actual', value: 1240 }, { label: 'Horarios', value: -160 }, { label: 'Casa vacía', value: -110 }, { label: 'Ventanas abiertas', value: -70 }, { label: 'Ajuste fino', value: -45 }, { label: 'Total con Templa', value: 0 }] }),
          text('Vivienda de 90 m² con gas natural. Cifras de ejemplo.', 80, 640, 1120, 30, { fontSize: 16, color: MID })],
          notes: 'Cascada: de la factura de hoy a la factura con Templa (la última barra, «Total…», se calcula sola: 855 €). Lo que más ahorra es no calentar la casa vacía de día.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [pollBlock({ kind: 'choice', fontSize: 32, x: 80, y: 60, w: 1120, h: 600,
          question: 'En invierno, ¿a qué temperatura tienes la calefacción?', options: ['18 °C o menos', '19 o 20 °C', '21 o 22 °C', '23 °C o más'] })],
          notes: 'Votación en directo. Si sale mucho «23 °C o más», la diapositiva siguiente explica cuánto cuesta cada grado de más (la regla del 7 %).' },
        { layout: 'titleOnly', title: 'Un grado menos, un 7 % menos', bg: CARD, transition: 'fade', extra: [
          text('Los grados-día miden el frío de un invierno:', 90, 150, 1100, 40, { fontSize: 26, color: MID }),
          withAnims(mathBlock({ x: 90, y: 205, w: 1100, h: 170, fontSize: 44, color: INK, latex: 'D = \\sum_{d=1}^{n} \\max\\left(0,\\; 18 - \\bar{T}_d\\right)' }), A('fade-up', { duration: 600 })),
          text('Y bajar la consigna recorta el consumo casi en proporción:', 90, 400, 1100, 40, { fontSize: 26, color: MID }),
          withAnims(mathBlock({ x: 90, y: 450, w: 1100, h: 110, fontSize: 44, color: HEAT, latex: '\\frac{\\Delta E}{E} \\approx 7\\,\\% \\times \\left(T_{0} - T_{1}\\right)' }), A('fade-up', { start: 'click', duration: 600 })),
          text('Templa usa los grados-día de tu ciudad para avisarte de cuánto vas a gastar este mes.', 90, 600, 1100, 40, { fontSize: 22, color: INK })],
          notes: 'Dos ecuaciones que aparecen con un clic cada una. D son los grados-día; T̄, la temperatura media de cada día; 18 °C es la base habitual. T₀ y T₁ son la consigna de antes y la de después. El 7 % por grado es una regla aproximada.' },
        { layout: 'titleOnly', title: 'Un martes de enero', bg: BG, transition: 'fade', extra: [
          chartBlock({ x: 80, y: 160, w: 1120, h: 470, chartType: 'line', color: HEAT, seriesName: 'Dentro de casa', grid: true, yTitle: '°C',
            data: ['0 h', '2 h', '4 h', '6 h', '8 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h', '22 h'].map((l, i) => ({ label: l, value: [18.2, 17.8, 17.6, 19.5, 20.8, 18.4, 17.9, 18.1, 19.6, 21.2, 21.4, 19.4][i] })),
            series: [{ name: 'Consigna', values: [18, 18, 18, 20.5, 21, 17, 17, 17, 20, 21.5, 21.5, 19], color: INK }, { name: 'Fuera', values: [2, 1, 0, 1, 3, 6, 9, 10, 8, 5, 4, 3], color: COLD }] })],
          notes: 'Tres líneas: la consigna (lo que pide Templa), la temperatura real dentro y la de fuera. Por la mañana se va de casa y la consigna baja sola. Datos de ejemplo.' },
        { layout: 'titleOnly', title: 'Cuatro modos que cambian solos', bg: BG, transition: 'fade', extra: [
          dg('matrix', 'En casa, de día\n  21 °C\nEn casa, de noche\n  18 °C\nFuera un rato\n  17 °C\nDe vacaciones\n  12 °C, antiheladas', 240, 160, 800, 470, { colors: 'colorful', fontScale: 1.0, oneByOne: true })],
          notes: 'Matriz de cuatro modos que aparece cuadro a cuadro. Templa sabe si estás en casa por la ubicación del móvil (si la compartes) y por el sensor de presencia.' },
        { layout: 'blank', bg: INK, transition: 'zoom', extra: [
          img(dial(0.48), 760, 110, 460, 460, 'Esfera del termostato'),
          text('19,5°', 830, 280, 320, 110, { fontFamily: head, fontSize: 92, fontWeight: 700, color: INK, textAlign: 'center' }),
          text('Calor donde importa.<br>Menos factura.', 90, 200, 640, 200, { fontFamily: head, fontSize: 60, fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }),
          text(`Templa · <b style="color:${HEAT}">149 €</b><br>Válvulas para radiador, 39 € cada una`, 96, 430, 640, 80, { fontSize: 26, color: '#c7d0d6', lineHeight: 1.4 })],
          notes: 'Cierre en oscuro con la esfera un poco más baja. Precios inventados.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · Chispa, a programmable toy car: a play mat, the car in 3D with Transform, programming cards that pop, a board walked by the car, code, steps, a quiz.
  prod_hw_toycar: { name: 'Chispa: coche para aprender a programar', cat: 'product',
    summary: 'Alfombra de juego: coche 3D con Transformar, cartas que saltan con sonido, tablero que se recorre, código, concurso, escalera y dona',
    make: () => {
      const GRASS = '#8fd16f', ROAD = '#5b5f66', RED = '#ff4d4d', YEL = '#ffd23f', BLUE = '#3d7dff', INK = '#1f2a44', CREAM = '#fff7df', MUTE = '#5a6478', head = pairStacks('friendly').heading, CAR = uid();
      const mat = (w, h, houses = true) => svgURL(w, h, R(0, 0, w, h, 0, GRASS)
        + `<rect x="${w * 0.1}" y="${h * 0.16}" width="${w * 0.8}" height="${h * 0.7}" rx="${h * 0.18}" fill="none" stroke="${ROAD}" stroke-width="${h * 0.1}"/>`
        + `<rect x="${w * 0.1}" y="${h * 0.16}" width="${w * 0.8}" height="${h * 0.7}" rx="${h * 0.18}" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="22 18"/>`
        + `<line x1="${w * 0.5}" y1="${h * 0.16}" x2="${w * 0.5}" y2="${h * 0.86}" stroke="${ROAD}" stroke-width="${h * 0.09}"/>`
        + `<ellipse cx="${w * 0.3}" cy="${h * 0.5}" rx="${w * 0.08}" ry="${h * 0.1}" fill="#6cc3ff"/>`
        + (houses ? [[0.72, 0.42, RED], [0.8, 0.55, BLUE], [0.66, 0.6, YEL]] : []).map(([x, y, c]) => `${R(w * x - 26, h * y - 10, 52, 42, 4, '#ffffff')}<path d="M${w * x - 32} ${h * y - 8} L${w * x} ${h * y - 36} L${w * x + 32} ${h * y - 8}Z" fill="${c}"/>`).join('')
        + scatter(16, 9, r => { const x = r() * w, y = r() < 0.5 ? r() * h * 0.1 + 6 : h * 0.9 + r() * h * 0.08; return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(14 + r() * 10).toFixed(0)}" fill="#3f9d4a"/>`; }).join(''));
      // A programming card: a coloured band and its symbol.
      const pcard = (sym, label, c) => svgURL(140, 190, R(3, 3, 134, 184, 16, '#ffffff', ' stroke="#d9d2bd" stroke-width="3"') + R(3, 3, 134, 36, 16, c) + R(3, 22, 134, 17, 0, c)
        + T(70, 140, 80, INK, sym, ' text-anchor="middle" font-weight="700"', 'Arial, sans-serif'));   // (no words in the picture: its description says which card it is)
      const prog = [['↑', 'Adelante', BLUE], ['↑', 'Adelante', BLUE], ['↱', 'Derecha', YEL], ['↑', 'Adelante', BLUE], ['↑', 'Adelante', BLUE], ['↑', 'Adelante', BLUE], ['♪', 'Pita', RED]];
      const S = 104, BX = 90, BY = 190;
      const board = svgURL(S * 6, S * 4, Array.from({ length: 24 }, (_, k) => R((k % 6) * S + 3, Math.floor(k / 6) * S + 3, S - 6, S - 6, 10, (k + Math.floor(k / 6)) % 2 ? '#fff1c4' : '#ffe6a0')).join('')
        + T(S * 0.5, S * 3.62, 44, INK, '⌂', ' text-anchor="middle"', 'Arial, sans-serif') + T(S * 3.5, S * 1.66, 60, '#f0a500', '★', ' text-anchor="middle"', 'Arial, sans-serif'));
      const token = svgURL(100, 100, `<circle cx="50" cy="50" r="46" fill="${RED}" stroke="#ffffff" stroke-width="6"/><path d="M56 16 L30 56 H48 L42 86 L70 42 H52 Z" fill="${YEL}"/>`);
      const route = [[0, -S], [0, -2 * S], [S, -2 * S], [2 * S, -2 * S], [3 * S, -2 * S]];
      const car = (x, y, w, h, props) => keep(m3d('kh-ToyCar', x, y, w, h, props), CAR);
      return numbered(build({ name: 'Chispa · coche programable', palette: 'forest', fonts: 'friendly', title: { color: INK, size: 46 }, body: { color: INK } }, [
        { layout: 'blank', bg: GRASS, transition: 'fade', back: [img(mat(1280, 720, false), 0, 0, 1280, 720, 'Alfombra de juego con carreteras y un lago', { fit: 'cover', decorative: true })], extra: [
          shape('rounded', 70, 150, 560, 400, CREAM, { radius: 28, shadow: { x: 0, y: 10, blur: 0, color: '#2f7d32' } }),
          text('Chispa', 110, 180, 480, 140, { fontFamily: head, fontSize: 120, fontWeight: 800, wordart: 'retro', wordartColor: RED }),
          text('El coche que enseña a programar sin pantallas', 114, 330, 480, 100, { fontSize: 32, color: INK, fontWeight: 700, lineHeight: 1.25 }),
          text('De 4 a 8 años · para casa y para el aula', 114, 460, 480, 40, { fontSize: 22, color: MUTE }),
          car(680, 150, 520, 420, { autoRotate: true, spin: 25, view: 'three', edge: 'free' })],
          notes: 'Portada sobre una alfombra de juego dibujada en SVG. El título es Text Art de estilo retro, con color propio; el coche 3D gira solo y sin recorte en los bordes.' },
        { layout: 'blank', bg: CREAM, autoAnimate: true, extra: [
          car(880, 430, 360, 250, { autoRotate: false, view: 'side', arrive: 'turn' }),
          text('Programar con cartas', 90, 60, 900, 80, { fontFamily: head, fontSize: 52, fontWeight: 800, color: INK }),
          text('Los niños ponen las cartas en fila, las enseñan al coche… y Chispa las cumple una a una.', 90, 140, 1100, 80, { fontSize: 25, color: MUTE, lineHeight: 1.4 }),
          ...prog.map(([s, l, c], i) => withAnims(img(pcard(s, l, c), 90 + i * 142, 240, 126, 171, `Carta: ${l}`, { fit: 'fill' }), A('bounce', { start: i ? 'afterPrev' : 'click', duration: 350, sound: 'pop' }))),
          text(`<b style="color:#2459c9">Azul</b>: moverse · <b style="color:#8a6500">Amarillo</b>: girar · <b style="color:#c42d2d">Rojo</b>: luces y sonidos`, 90, 460, 740, 50, { fontSize: 24, color: INK })],
          notes: 'Transformar: el coche baja a la esquina dando una vuelta. Con un clic, las siete cartas del programa caen una tras otra con un «pop».' },
        { layout: 'blank', bg: CREAM, transition: 'slide', extra: [
          text('Y Chispa lo hace', 90, 60, 900, 80, { fontFamily: head, fontSize: 52, fontWeight: 800, color: INK }),
          img(board, BX, BY - 40, S * 6, S * 4, 'Tablero de 6 por 4 casillas con una casa y una estrella', { fit: 'fill' }),
          withAnims(ink(route.map(([x, y]) => [x, y]), BX + S / 2, BY - 40 + S * 3.5, RED, 8), A('draw', { duration: 3000 })),
          withAnims(img(token, BX + S / 2 - 38, BY - 40 + S * 3.5 - 38, 76, 76, 'Chispa visto desde arriba'), path(route, { start: 'withPrev', duration: 3000 })),
          withAnims(text('♪ ¡Pi-pi!', BX + S * 3, BY - 40 + S * 0.4, 220, 50, { fontSize: 30, fontWeight: 800, color: RED }), A('bounce', { start: 'afterPrev', sound: 'chime' })),
          ...prog.map(([s, l, c], i) => img(pcard(s, l, c), 760 + (i % 4) * 110, 190 + Math.floor(i / 4) * 150, 96, 130, `Carta: ${l}`, { fit: 'fill' })),
          text('El programa de la diapositiva anterior, paso a paso, de la casa a la estrella.', 760, 500, 440, 100, { fontSize: 22, color: MUTE, lineHeight: 1.4 })],
          notes: 'La ficha de Chispa recorre el tablero siguiendo el programa (trayectoria) mientras el camino se dibuja a la vez (tinta, «Con la anterior»). Al llegar, pita con una campanilla.' },
        { layout: 'blank', bg: INK, transition: 'fade', extra: [
          text('Cuando crecen: el mismo programa, en código', 90, 60, 1100, 70, { fontFamily: head, fontSize: 42, fontWeight: 800, color: '#ffffff' }),
          codeBlock({ x: 90, y: 160, w: 700, h: 440, fontSize: 26, lang: 'python', lineSteps: '1-3|4-6|7',
            code: '# De la casa a la estrella\nadelante(2)\nderecha()\nrepetir(3):\n    adelante(1)\n    luces("verde")\npitar()' }),
          text(`Con la tableta, las cartas se convierten en código de verdad.<br><br><b style="color:${YEL}">repetir</b> ahorra cartas: es su primer bucle.`, 830, 190, 370, 380, { fontSize: 26, color: '#e6e9f2', lineHeight: 1.45 })],
          notes: 'Código con pasos de resaltado. El idioma es inventado y en español, inspirado en Python, para niños de 8 años en adelante.' },
        { layout: 'blank', bg: CREAM, transition: 'fade', extra: [pollBlock({ kind: 'quiz', fontSize: 32, x: 80, y: 60, w: 1120, h: 600, time: 20,
          question: 'Chispa repite 4 veces: «adelante y gira a la derecha». ¿Qué dibuja?', options: ['Una línea recta', 'Un cuadrado', 'Un triángulo', 'Un zigzag'], correct: [1] })],
          notes: 'Concurso con tiempo para el público (o para la clase). Si dudan, haz que lo prueben con el cuerpo: cuatro pasos y cuatro giros: es el bucle «repetir» de la diapositiva anterior.' },
        { layout: 'titleOnly', title: 'Crece con ellos', bg: CREAM, transition: 'fade', extra: [
          dg('steps', '4 años\n  Botones en el coche\n5 años\n  Cartas en fila\n6 años\n  Bucles con cartas\n8 años\n  Código en la tableta', 90, 170, 1100, 440, { colors: 'colorful', fontScale: 1.0, oneByOne: true })],
          notes: 'Escalera de cuatro peldaños, uno por clic: el mismo juguete sirve cuatro años, y en clase se mezclan niveles.' },
        { layout: 'titleOnly', title: 'Qué trabajan con Chispa en clase', bg: CREAM, transition: 'fade', extra: [
          chartBlock({ x: 190, y: 150, w: 900, h: 370, chartType: 'doughnut',
            data: [{ label: 'Orientación espacial', value: 32, color: BLUE }, { label: 'Secuencias', value: 27, color: RED }, { label: 'Trabajo en equipo', value: 21, color: YEL }, { label: 'Números', value: 12, color: '#3f9d4a' }, { label: 'Cuentos', value: 8, color: '#a05cd6' }] }),
          text('Encuesta a 60 docentes de infantil y primaria que usaron Chispa un trimestre. Datos inventados.', 90, 570, 1100, 40, { fontSize: 22, color: MUTE, textAlign: 'center' })],
          notes: 'Dona con un color por porción y la leyenda con porcentajes automáticos. Lo que más trabajan es la orientación: derecha e izquierda desde el punto de vista del coche.' },
        { layout: 'blank', bg: GRASS, transition: 'zoom', back: [img(mat(1280, 720), 0, 0, 1280, 720, 'Alfombra de juego', { fit: 'cover', decorative: true })], extra: [
          shape('rounded', 340, 180, 600, 360, CREAM, { radius: 28, shadow: { x: 0, y: 10, blur: 0, color: '#2f7d32' } }),
          text('¡A jugar!', 360, 210, 560, 130, { fontFamily: head, fontSize: 96, fontWeight: 800, color: RED, textAlign: 'center' }),
          text('Chispa · <b>69 €</b><br>Caja de aula, con 6 coches<br>y 200 cartas · <b>349 €</b>', 370, 345, 540, 130, { fontSize: 28, color: INK, textAlign: 'center', lineHeight: 1.4 }),
          m3d('kh-ToyCar', 950, 390, 300, 280, { autoRotate: false, motion: 'swing', view: 'three', edge: 'free' })],
          notes: 'Cierre sobre la alfombra; el coche se balancea. Precios inventados.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Miga, a key finder: a treasure map, breadcrumbs that appear one by one up to a red X, a hand-drawn circle, a doughnut, a target, a trail through the neighbourhood.
  prod_hw_tracker: { name: 'Miga: localizador para no perder nada', cat: 'product',
    summary: 'Mapa del tesoro: migas que aparecen una a una hasta la X, círculo a mano que se dibuja, dona, diana, rastro por el barrio y nube de palabras',
    make: () => {
      const PARCH = '#efe2c4', INK = '#3b2a1a', RED = '#b8322a', SEPIA = '#8a6a44', OLIVE = '#5c6b3a', head = pairStacks('classic').heading;
      const parchment = (w, h) => svgURL(w, h, `<defs><radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="${PARCH}" stop-opacity="0"/><stop offset="1" stop-color="#b8975e" stop-opacity=".55"/></radialGradient></defs>`
        + R(0, 0, w, h, 0, PARCH) + scatter(30, 13, r => `<ellipse cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" rx="${(40 + r() * 140).toFixed(0)}" ry="${(30 + r() * 90).toFixed(0)}" fill="#e2cfa6" fill-opacity=".35"/>`).join('')
        + R(0, 0, w, h, 0, 'url(#v)'));
      const back = () => img(parchment(1280, 720), 0, 0, 1280, 720, 'Papel viejo', { fit: 'cover', decorative: true });
      const tag = (c) => svgURL(160, 160, `<path d="M40 30 H120 A20 20 0 0 1 140 50 V130 A20 20 0 0 1 120 150 H40 A20 20 0 0 1 20 130 V50 A20 20 0 0 1 40 30Z" fill="${c}" stroke="${INK}" stroke-width="4"/>`
        + `<circle cx="80" cy="52" r="9" fill="${PARCH}" stroke="${INK}" stroke-width="3"/><circle cx="80" cy="102" r="22" fill="none" stroke="${PARCH}" stroke-width="4"/><circle cx="80" cy="102" r="8" fill="${PARCH}"/>`
        + `<path d="M80 43 C70 20 98 6 104 22" fill="none" stroke="${INK}" stroke-width="4"/>`);
      const crumbs = (n, from, ctrl, to, size = 13) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), x = (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * ctrl[0] + t * t * to[0], y = (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * ctrl[1] + t * t * to[1];
        return shape('ellipse', Math.round(x), Math.round(y), size, size - 3, SEPIA, { rotation: (i * 37) % 90 }); });
      const town = svgURL(760, 500, R(0, 0, 760, 500, 0, '#00000000')
        + `<path d="M0 380 C160 340 260 420 420 380 S660 300 760 330" fill="none" stroke="#7fa3b5" stroke-width="26" stroke-opacity=".6"/>`
        + [[40, 40, 150, 110], [220, 40, 180, 110], [430, 40, 140, 110], [600, 40, 130, 160], [40, 180, 150, 120], [220, 180, 180, 120], [430, 180, 140, 110]].map(([x, y, w, h]) => R(x, y, w, h, 6, 'none', ` stroke="${SEPIA}" stroke-width="3" stroke-dasharray="2 0"`)).join('')
        + scatter(10, 4, r => `<circle cx="${(30 + r() * 480).toFixed(0)}" cy="${(420 + r() * 60).toFixed(0)}" r="10" fill="none" stroke="${OLIVE}" stroke-width="3"/>`).join(''));
      const stops = [[110, 90, '08:10', 'Casa'], [300, 250, '08:25', 'Panadería'], [500, 140, '08:40', 'Parada del bus'], [690, 300, '09:05', 'Oficina: ¡aquí están!']];
      return numbered(build({ name: 'Miga · localizador', palette: 'paper', fonts: 'classic', title: { color: INK, size: 48 }, body: { color: INK } }, [
        { layout: 'blank', bg: PARCH, transition: 'fade', back: [back()], extra: [
          text('Miga', 84, 70, 600, 170, { fontFamily: head, fontSize: 150, fontWeight: 700, color: INK }),
          text('Lo que pierdes deja rastro.', 92, 250, 600, 60, { fontFamily: head, fontSize: 38, fontStyle: 'italic', color: SEPIA }),
          ...chain(crumbs(16, [120, 640], [600, 640], [900, 320]), 'fade-in', 'afterPrev', { duration: 120 }),
          withAnims(text('✕', 900, 250, 120, 120, { fontFamily: head, fontSize: 110, fontWeight: 700, color: RED, textAlign: 'center' }), A('zoom-in', { start: 'afterPrev', sound: 'pop', duration: 400 })),
          withAnims(img(tag(RED), 1040, 330, 170, 170, 'Un localizador Miga en un llavero', { rotation: 12 }), A('fade-left', { start: 'afterPrev' }))],
          notes: 'Al llegar a la portada, dieciséis migas aparecen solas una tras otra siguiendo una curva, hasta la X roja (con un «pop») y el llavero dibujado en SVG.' },
        { layout: 'blank', bg: PARCH, transition: 'page', back: [back()], extra: [pollBlock({ kind: 'word', fontSize: 34, x: 80, y: 60, w: 1120, h: 600, question: '¿Qué es lo último que perdiste?', options: [] })],
          notes: 'Nube de palabras en directo: las respuestas repetidas salen más grandes. Casi siempre gana «llaves»: lo confirma la dona de dos diapositivas después.' },
        { layout: 'blank', bg: PARCH, transition: 'fade', back: [back()], extra: [
          text('10 minutos', 140, 150, 740, 160, { fontFamily: head, fontSize: 128, fontWeight: 700, color: RED }),
          withAnims(shape('ellipse', 40, 96, 900, 278, 'none', { stroke: INK, strokeWidth: 5, sketch: true }), A('draw', { start: 'afterPrev', delay: 400, duration: 1200 })),
          text('al día buscando las llaves, la cartera o las gafas.', 96, 390, 900, 60, { fontSize: 32, color: INK }),
          withAnims(text(`Son <b style="color:${RED}">61 horas al año</b>: dos días y medio enteros.`, 96, 470, 900, 60, { fontFamily: head, fontSize: 36, fontStyle: 'italic', color: INK }), A('fade-up', { start: 'click' })),
          text('Encuesta propia a 1.200 personas; datos inventados para la plantilla.', 96, 600, 900, 30, { fontSize: 18, color: SEPIA })],
          notes: 'La cifra llega rodeada por un círculo hecho a mano que se dibuja solo (forma «A mano alzada» y efecto «Dibujar»). El cálculo: 10 minutos × 365 días.' },
        { layout: 'titleOnly', title: 'Lo que más perdemos', bg: PARCH, transition: 'page', back: [back()], extra: [
          chartBlock({ x: 190, y: 150, w: 900, h: 390, chartType: 'doughnut',
            data: [{ label: 'Llaves', value: 38, color: RED }, { label: 'Cartera', value: 21, color: SEPIA }, { label: 'Mando de la tele', value: 17, color: OLIVE }, { label: 'Gafas', value: 14, color: '#4f6d8a' }, { label: 'Otras cosas', value: 10, color: '#b9a37c' }] }),
          text('Las llaves ganan con diferencia: por eso Miga cabe en un llavero y pesa 8 gramos.', 90, 570, 1100, 50, { fontFamily: head, fontSize: 28, fontStyle: 'italic', color: INK, textAlign: 'center' })],
          notes: 'Dona con colores de tinta antigua; la leyenda con porcentajes sale sola. Transición «Página» para mantener la idea de cuaderno de mapas.' },
        { layout: 'titleOnly', title: 'Tres maneras de encontrarlo', bg: PARCH, transition: 'page', back: [back()], extra: [
          dg('target', 'A un metro\n  Suena y vibra\nEn tu casa\n  Bluetooth, hasta 120 m\nEn la ciudad\n  Red anónima de móviles', 90, 160, 1100, 470, { colors: 'colorful', fontScale: 1.2, oneByOne: true })],
          notes: 'Diana de tres anillos, uno por clic: de lo más cercano (lo haces sonar) a lo más lejano (otros móviles lo detectan sin saber de quién es).' },
        { layout: 'blank', bg: PARCH, transition: 'page', back: [back()], extra: [
          text('El rastro de una mañana', 90, 50, 900, 70, { fontFamily: head, fontSize: 48, fontWeight: 700, color: INK }),
          img(town, 90, 140, 760, 500, 'Plano dibujado de un barrio con un río'),
          withAnims(ink(stops.map(([x, y]) => [x, y]), 90, 140, RED, 5), A('draw', { duration: 2400 })),
          ...stops.flatMap(([x, y, h, n], i) => [
            withAnims(shape('ellipse', 90 + x - 12, 140 + y - 12, 24, 24, i === 3 ? RED : INK), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300 })),
            withAnims(text(`<b>${h}</b> · ${n}`, 880, 180 + i * 100, 330, 70, { fontSize: 24, color: i === 3 ? RED : INK, lineHeight: 1.3 }), A('fade-left', { start: 'withPrev', duration: 300 }))])],
          notes: 'Primer clic: el rastro se dibuja con tinta roja sobre un plano hecho en SVG. Segundo clic: cada parada aparece con su hora, hasta la oficina, donde estaban las llaves.' },
        { layout: 'titleOnly', title: 'Tu rastro es solo tuyo', bg: PARCH, transition: 'page', back: [back()], extra: [
          ...[['lock', 'Cifrado de punta a punta', 'Ni nosotros podemos ver dónde está tu Miga.'], ['shield-check', 'Nada se guarda', 'El rastro se borra a las 24 horas.'], ['bell', 'Aviso antiseguimiento', 'Si un Miga ajeno viaja contigo, tu móvil te avisa.']].flatMap(([ic, h, d], i) => { const x = 90 + i * 375;
            return [withAnims(shape('rounded', x, 180, 345, 380, '#f7eed8', { radius: 18, stroke: INK, strokeWidth: 3, sketch: true }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 400 })),
              withAnims(icon(ic, x + 30, 215, 60, RED), A('fade-up', { start: 'withPrev', duration: 400 })),
              withAnims(text(`<div style="font-family:${head};font-size:30px;font-weight:700;margin-bottom:12px">${h}</div>${d}`, x + 30, 300, 285, 220, { fontSize: 24, color: INK, lineHeight: 1.4 }), A('fade-up', { start: 'withPrev', duration: 400 }))]; })],
          notes: 'Tres tarjetas con borde a mano (estilo «A mano alzada»). La privacidad es la primera pregunta que hace la gente: contéstala antes de que llegue.' },
        { layout: 'blank', bg: PARCH, transition: 'page', back: [back()], extra: [
          text('Pierde menos.<br>Vive más.', 90, 170, 740, 260, { fontFamily: head, fontSize: 96, fontWeight: 700, color: INK, lineHeight: 1.05 }),
          text('Uno, 25 € · paquete de cuatro, 79 € · pila de un año', 96, 470, 700, 50, { fontSize: 28, color: SEPIA }),
          ...[RED, OLIVE, SEPIA, '#4f6d8a'].map((c, i) => withAnims(img(tag(c), 820 + (i % 2) * 190, 140 + Math.floor(i / 2) * 210, 170, 170, 'Localizador Miga', { rotation: [-8, 6, 10, -5][i] }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'pop' })))],
          notes: 'Cierre con los cuatro llaveros de colores, que aparecen uno tras otro con un clic. Precios inventados.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Folio, an e-ink reader: every slide a printed page (running head, folio), page turns, a drop cap, microcapsules, a quote, a reading table, fill the gaps.
  prod_hw_ereader: { name: 'Folio: lector de tinta electrónica', cat: 'product',
    summary: 'Libro con paso de página: capitular, lector dibujado, microcápsulas que aparecen, cifra y barras, cita, tabla con fórmulas y huecos',
    make: () => {
      const PAGE = '#ecebe6', INK = '#222222', GREY = '#6b6b6b', RULE = '#b9b6ae', head = pairStacks('editorial').heading;
      const furn = (n, chap) => [text('FOLIO · LECTOR DE TINTA ELECTRÓNICA', 90, 34, 600, 26, { fontSize: 14, color: GREY, letterSpacing: 4 }),
        text(chap, 690, 34, 500, 26, { fontSize: 14, color: GREY, letterSpacing: 4, textAlign: 'right', fontStyle: 'italic' }),
        rule(90, 66, 1100, 1, RULE), text(`— ${n} —`, 540, 664, 200, 30, { fontFamily: head, fontSize: 16, color: GREY, textAlign: 'center' })];
      const reader = svgURL(360, 500, R(0, 0, 360, 500, 28, '#2b2b2b') + R(26, 30, 308, 410, 6, '#e9e8e2')
        + T(180, 80, 15, '#555', 'III', ' text-anchor="middle" letter-spacing="3"', 'Georgia, serif')
        + Array.from({ length: 14 }, (_, i) => R(50, 110 + i * 22, i % 5 === 4 ? 160 : 260, 8, 2, '#9a9a9a')).join('') + T(180, 428, 12, '#777', '83 / 312', ' text-anchor="middle"', 'Georgia, serif')
        + R(150, 460, 60, 8, 4, '#4a4a4a'));
      // Microcapsules: white and black pigment in a clear oil; the electrode under each one decides which side shows.
      const capsule = (kind) => svgURL(220, 260, `<ellipse cx="110" cy="120" rx="80" ry="100" fill="#f5f4f0" stroke="${INK}" stroke-width="4"/>`
        + scatter(36, kind === 'w' ? 3 : kind === 'b' ? 5 : 8, (r, i) => { const black = kind === 'w' ? i % 2 : kind === 'b' ? !(i % 2) : i % 2, top = kind === 'g' ? (i % 4 < 2) : !black, y = top ? 50 + r() * 50 : 140 + r() * 50;
          return `<circle cx="${(55 + r() * 110).toFixed(0)}" cy="${y.toFixed(0)}" r="9" fill="${black ? INK : '#ffffff'}" stroke="${INK}" stroke-width="1.5"/>`; }).join('')
        + R(30, 232, 160, 18, 4, kind === 'w' ? '#d0d0d0' : kind === 'b' ? '#8a8a8a' : '#b0b0b0') + T(110, 246, 13, INK, kind === 'w' ? '−' : kind === 'b' ? '+' : '− +', ' text-anchor="middle" font-weight="700"'));
      return numbered(build({ name: 'Folio · tinta electrónica', palette: 'grayscale', fonts: 'editorial', title: { color: INK, size: 44 }, body: { color: INK } }, [
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [
          text('PRESENTACIÓN DE PRODUCTO · PRIMAVERA DE 2027', 140, 130, 1000, 30, { fontSize: 16, color: GREY, letterSpacing: 6, textAlign: 'center' }),
          text('FOLIO', 140, 190, 1000, 150, { fontFamily: head, fontSize: 130, fontWeight: 700, color: INK, letterSpacing: 30, textAlign: 'center' }),
          rule(540, 370, 200, 2, INK),
          text('Lector de tinta electrónica', 140, 395, 1000, 60, { fontFamily: head, fontSize: 36, fontStyle: 'italic', color: INK, textAlign: 'center' }),
          text('❦', 590, 480, 100, 70, { fontSize: 48, color: GREY, textAlign: 'center' }),
          text('Siete pulgadas · papel que no brilla · seis semanas de batería', 140, 580, 1000, 40, { fontSize: 20, color: GREY, textAlign: 'center' })],
          notes: 'Portada como la de un libro: todo centrado, una regla fina y un florón. En toda la presentación se usa la transición «Página».' },
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [...furn(1, 'Capítulo I'),
          text('Una pantalla que no brilla', 90, 100, 700, 70, { fontFamily: head, fontSize: 40, fontWeight: 700, color: INK }),
          text(`<span style="float:left;font-family:${head};font-size:108px;line-height:.85;margin:6px 12px 0 0;color:${INK}">L</span>as pantallas de siempre lanzan luz contra los ojos. Folio no: como el papel, refleja la luz de la habitación, y por eso se lee igual de bien en un tren de noche, con una lamparita, que en la playa a mediodía.<br><br>Su tinta de verdad no parpadea, no cansa la vista y, cuando la página está quieta, no gasta nada.`,
            90, 200, 660, 420, { fontSize: 25, color: INK, lineHeight: 1.55, textAlign: 'justify' }),
          withAnims(img(reader, 840, 110, 340, 472, 'Dibujo del lector Folio con una página de texto'), A('fade-left', { start: 'afterPrev', duration: 900 }))],
          notes: 'Página de libro con letra capitular (una letra grande flotando a la izquierda) y el lector dibujado en SVG, que entra solo.' },
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [...furn(2, 'Capítulo II'),
          text('Tinta de verdad, en cápsulas', 90, 100, 1100, 70, { fontFamily: head, fontSize: 40, fontWeight: 700, color: INK }),
          ...[['w', 'Blanco', 'El electrodo atrae el pigmento negro hacia abajo.'], ['b', 'Negro', 'Cambia la carga y sube el negro.'], ['g', 'Gris', 'Mitad y mitad: dieciséis tonos posibles.']].flatMap(([k, h, d], i) => [
            withAnims(img(capsule(k), 130 + i * 360, 190, 200, 236, `Microcápsula en ${h.toLowerCase()}`), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 500 })),
            withAnims(text(`<div style="font-family:${head};font-size:28px;font-weight:700">${h}</div>${d}`, 90 + i * 360, 440, 280, 150, { fontSize: 22, color: INK, textAlign: 'center', lineHeight: 1.4 }), A('fade-up', { start: 'withPrev', duration: 500 }))])],
          notes: 'Tres microcápsulas dibujadas: pigmento blanco y negro con cargas opuestas. Un clic las muestra una a una. Cada píxel tiene cientos de ellas.' },
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [...furn(3, 'Capítulo III'),
          text('6 semanas', 90, 140, 540, 120, { fontFamily: head, fontSize: 88, fontWeight: 700, color: INK }),
          text('de lectura con una sola carga, a media hora al día.', 96, 270, 500, 90, { fontSize: 28, color: INK, lineHeight: 1.4 }),
          text('La página quieta no consume nada: solo se gasta energía al pasarla.', 96, 400, 480, 100, { fontFamily: head, fontSize: 24, fontStyle: 'italic', color: GREY, lineHeight: 1.4 }),
          chartBlock({ x: 640, y: 140, w: 560, h: 440, chartType: 'hbar', color: INK, dataLabels: true, xTitle: 'Energía por hora de lectura (mWh)',
            data: [{ label: 'Tableta', value: 900 }, { label: 'Móvil', value: 600 }, { label: 'Folio', value: 35 }] }),
          text('Mediciones de ejemplo.', 640, 600, 560, 30, { fontSize: 16, color: GREY })],
          notes: 'Cifra grande a la izquierda y barras horizontales en negro a la derecha, sobrias como un libro. Datos inventados.' },
        { layout: 'blank', bg: '#e2e0d9', transition: 'page', extra: [...furn(4, 'Interludio'),
          text('«', 70, 150, 120, 150, { fontFamily: head, fontSize: 150, lineHeight: 1, color: '#a8a49a' }),
          text('Lo leí entero en la playa, a pleno sol, como si fuera papel. Y volví a casa con la batería casi llena.', 210, 190, 920, 260, { fontFamily: head, fontSize: 44, fontStyle: 'italic', color: INK, lineHeight: 1.35 }),
          text('— Marta, lectora del programa de pruebas', 210, 480, 900, 40, { fontSize: 24, color: GREY })],
          notes: 'Una cita grande con comillas de gran tamaño en gris claro. La lectora es un personaje inventado para la plantilla.' },
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [...furn(5, 'Capítulo IV'),
          text('Tu verano, en páginas', 90, 100, 1100, 70, { fontFamily: head, fontSize: 40, fontWeight: 700, color: INK }),
          tableBlock({ x: 90, y: 190, w: 1100, h: 330, fontSize: 25, color: INK, header: true, headBg: INK, headFg: '#ffffff', stroke: RULE, lines: true, colW: [5, 2, 3, 2],
            rows: [['Libro', 'Páginas', 'Minutos por página', 'Horas'], ['La casa de las mareas', '312', '1,5', '=B2*C2/60'], ['Nueve inviernos', '240', '2', '=B3*C3/60'],
              ['El cartógrafo ciego', '460', '1,2', '=B4*C4/60'], ['Total', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']] }),
          text('Folio calcula cuánto te queda de cada libro según tu ritmo; aquí, con fórmulas (=B2*C2/60). Títulos inventados.', 90, 550, 1100, 70, { fontSize: 22, color: GREY, lineHeight: 1.4 })],
          notes: 'Tabla de estilo «Mínima» (solo líneas horizontales) con fórmulas: horas de lectura de cada libro y total del verano.' },
        { layout: 'blank', bg: PAGE, extra: [pollBlock({ kind: 'gaps', fontSize: 32, x: 80, y: 60, w: 1120, h: 600, question: 'Completa las frases', options: [],
          text: 'La tinta electrónica solo gasta energía al [pasar] de página. Por eso la batería dura [semanas]. Y se lee mejor cuanta más [luz] hay.' })],
          notes: 'Actividad de rellenar huecos desde el móvil: repasa las tres ideas clave de la presentación.' },
        { layout: 'blank', bg: PAGE, transition: 'page', extra: [
          text('COLOFÓN', 140, 150, 1000, 40, { fontSize: 18, color: GREY, letterSpacing: 8, textAlign: 'center' }),
          rule(590, 205, 100, 1, INK),
          text('Folio sale a la venta el 23 de abril, Día del Libro, por 129 euros, con funda de lino y una biblioteca de clásicos de dominio público.', 240, 240, 800, 160, { fontFamily: head, fontSize: 28, color: INK, textAlign: 'center', lineHeight: 1.55, fontStyle: 'italic' }),
          text('❦', 590, 430, 100, 70, { fontSize: 44, color: GREY, textAlign: 'center' }),
          text('Esta presentación se compuso en Merriweather y PT Sans.', 240, 540, 800, 40, { fontSize: 18, color: GREY, textAlign: 'center' })],
          notes: 'Cierre como el colofón de un libro: centrado, en cursiva y sin estridencias. Fecha y precio inventados.' },
      ]));
    } },
};
