// Example presentations: Astronomía y astrofísica (ciencia y universidad). Each one: { name, summary, cat: 'sci', make() } → a deck
// (see kit.js for the builders). Ten topics, each with its own look: a stellar spectrum, a black hole's horizon,
// travel posters for other worlds, a blueprint, an old lunar atlas, a crisis room, a cooling universe, a red-light
// star chart, a solar observatory and an oscilloscope.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// Fonts of the catalogue (their stacks, so the editor and the export load them).
const FF = {
  cormorant: "'Cormorant Garamond', serif", mono: "'JetBrains Mono', monospace", josefin: "'Josefin Sans', sans-serif",
  abril: "'Abril Fatface', serif", raleway: "'Raleway', sans-serif", oswald: "'Oswald', sans-serif", lobster: "'Lobster', cursive",
};
// A picture drawn in SVG, as a data URL (no external files).
const svgURL = (w, h, body, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// A stroke through points (an ink object: it can be traced while presenting with the effect 'draw').
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs) - 6, y = Math.min(...ys) - 6;
  const w = Math.max(...xs) - x + 6, h = Math.max(...ys) - y + 6;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// A ring (an orbit) and a sphere (a round radial gradient).
const ring = (cx, cy, r, color, props = {}) => shape('ellipse', cx - r, cy - r, r * 2, r * 2, 'none', { stroke: color, strokeWidth: 2, ...props });
const sphere = (cx, cy, r, c1, c2, props = {}) => shape('ellipse', cx - r, cy - r, r * 2, r * 2, c1, { fill2: c2, gradType: 'radial', ...props });
// An arrow centred on (cx, cy), len long, pointing at angle deg (0 = right, 90 = down).
const arrowAt = (cx, cy, len, deg, color, width = 4, props = {}) => shape('arrow', cx - len / 2, cy - 10, len, 20, 'none', { stroke: color, strokeWidth: width, rotation: deg, ...props });
// Points along a curve, relative to its first point (for path()).
const rel = pts => pts.map(([x, y]) => [Math.round(x - pts[0][0]), Math.round(y - pts[0][1])]).slice(1);
// Points on an ellipse (centre, radii, from angle a0 to a1 in degrees, n steps; 0° = right, clockwise on screen).
const arcPts = (cx, cy, rx, ry, a0, a1, n = 36) => Array.from({ length: n + 1 }, (_, i) => { const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; });
// A repeatable pseudo-random sequence (the same stars every time).
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// A field of small stars (decoration), inside a box.
const starfield = (n, seed, color = '#ffffff', [x0, y0, w, h] = [0, 0, 1280, 720], max = 4, op = [20, 80]) => { const r = rng(seed);
  return Array.from({ length: n }, () => { const s = 1.5 + r() * max; return shape('ellipse', Math.round(x0 + r() * w), Math.round(y0 + r() * h), s, s, color, { opacity: Math.round(op[0] + r() * (op[1] - op[0])) }); }); };
// A NASA model without its caption (the credit goes in one line on the last slide).
const N = (id, x, y, w, h, props = {}) => nasa(id, x, y, w, h, { caption: '', ...props });
const NASA_CREDIT = 'Modelos 3D: NASA 3D Resources (dominio público)';
// The deck's default text colour (polls, tables and diagrams take it), when the palette's own does not suit the backgrounds.
const withFg = (deck, fg) => { deck.textColor = fg; return deck; };
// A small uppercase label with wide spacing.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 34, { fontSize: 18, letterSpacing: 5, color, ...props });
// A number with its label under it.
const stat = (n, label, x, y, w, color, fg, size = 72, props = {}) => text(`<div style="font-size:${size}px;font-weight:800;line-height:1.05;color:${color}">${n}</div><div style="margin-top:8px">${label}</div>`,
  x, y, w, Math.round(size * 1.15 + 90), { fontSize: 22, color: fg, ...props });
// The colour of a star by its surface temperature (K): from red dwarfs to blue giants.
const starColor = T => { const stops = [[2500, [255, 140, 70]], [3500, [255, 190, 120]], [5000, [255, 228, 180]], [6000, [255, 246, 232]], [7500, [236, 240, 255]], [10000, [200, 215, 255]], [30000, [150, 175, 255]]];
  let i = stops.findIndex(s => s[0] >= T); if (i <= 0) i = i === 0 ? 1 : stops.length - 1;
  const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], k = Math.max(0, Math.min(1, (T - t0) / (t1 - t0)));
  return '#' + c0.map((v, j) => Math.round(v + (c1[j] - v) * k).toString(16).padStart(2, '0')).join(''); };

// ---- Drawings ------------------------------------------------------------------------
// The Hertzsprung–Russell diagram: temperature (hot on the left) against luminosity, both logarithmic.
const HR_W = 760, HR_H = 540;
const hrX = T => 90 + (Math.log10(40000) - Math.log10(T)) / (Math.log10(40000) - Math.log10(2500)) * 640;
const hrY = L => 470 - (Math.log10(L) + 4) / 10 * 440;
const hrDiagram = () => { const r = rng(7), dots = [];
  const ms = [[35000, 2e5], [20000, 1e4], [10000, 60], [7500, 6], [5800, 1], [4500, 0.15], [3500, 0.02], [2800, 0.001]];
  for (let i = 0; i < 150; i++) { const k = r() * (ms.length - 1), j = Math.floor(k), f = k - j;
    const lt = Math.log10(ms[j][0]) + (Math.log10(ms[j + 1][0]) - Math.log10(ms[j][0])) * f, ll = Math.log10(ms[j][1]) + (Math.log10(ms[j + 1][1]) - Math.log10(ms[j][1])) * f;
    dots.push([10 ** (lt + (r() - 0.5) * 0.05), 10 ** (ll + (r() - 0.5) * 0.7), 2.5 + r() * 3]); }
  for (let i = 0; i < 26; i++) dots.push([3600 + r() * 1500, 10 ** (1.6 + r() * 1.5), 5 + r() * 4]);               // red giants
  for (let i = 0; i < 16; i++) dots.push([3500 + r() * 25000, 10 ** (4.2 + r() * 1.5), 7 + r() * 5]);              // supergiants
  for (let i = 0; i < 16; i++) dots.push([7000 + r() * 18000, 10 ** (-3.8 + r() * 1.6), 2 + r() * 1.5]);           // white dwarfs
  const ticksT = [[40000, '40.000'], [20000, '20.000'], [10000, '10.000'], [6000, '6.000'], [3000, '3.000']];
  const ticksL = [[1e-4, '10⁻⁴'], [1e-2, '10⁻²'], [1, '1'], [1e2, '10²'], [1e4, '10⁴'], [1e6, '10⁶']];
  return svgURL(HR_W, HR_H,
    `<rect x="90" y="30" width="640" height="440" fill="#0b1630" stroke="#2a3b63"/>`
    + ticksT.map(([t, l]) => `<line x1="${hrX(t)}" y1="30" x2="${hrX(t)}" y2="470" stroke="#1d2b4d"/><text x="${hrX(t)}" y="494" fill="#93a4c3" font-family="sans-serif" font-size="15" text-anchor="middle">${l}</text>`).join('')
    + ticksL.map(([L, l]) => `<line x1="90" y1="${hrY(L)}" x2="730" y2="${hrY(L)}" stroke="#1d2b4d"/><text x="80" y="${hrY(L) + 5}" fill="#93a4c3" font-family="sans-serif" font-size="15" text-anchor="end">${l}</text>`).join('')
    + `<text x="410" y="526" fill="#c9d4ea" font-family="sans-serif" font-size="16" text-anchor="middle">Temperatura de la superficie (K) ←  más caliente</text>`
    + `<text x="22" y="250" fill="#c9d4ea" font-family="sans-serif" font-size="16" text-anchor="middle" transform="rotate(-90 22 250)">Luminosidad (Sol = 1)</text>`
    + dots.map(([T, L, s]) => `<circle cx="${hrX(T).toFixed(1)}" cy="${hrY(L).toFixed(1)}" r="${s.toFixed(1)}" fill="${starColor(T)}" opacity="0.9"/>`).join('')
    + `<circle cx="${hrX(5800)}" cy="${hrY(1)}" r="11" fill="none" stroke="#ffd27a" stroke-width="2.5"/><text x="${hrX(5800) + 16}" y="${hrY(1) + 24}" fill="#ffd27a" font-family="sans-serif" font-size="17" font-weight="700">Sol</text>`);
};

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · The life of the stars: deep navy and the colours of the spectral classes (O B A F G K M) as the thread.
  sci_astro_stars: { name: 'Vida y muerte de las estrellas', cat: 'sci', summary: 'Espectro estelar: clases en cadena, equilibrio con flechas, diagrama H-R propio, bifurcación por masa, tabla con fórmulas y supernova 3D', make: () => {
    const BG = '#060d1c', FG = '#eef3ff', DIM = '#93a4c3', GOLD = '#ffd27a', RED = '#ff7b6b', H = pairStacks('editorial').heading;
    const CLASSES = [['O', 35000], ['B', 18000], ['A', 9000], ['F', 6800], ['G', 5600], ['K', 4300], ['M', 3000]];
    const spectral = (x, y, size, chain = true) => CLASSES.map(([c, T], i) => { const b = text(c, x + i * (size + 26), y, size, size, { bg: starColor(T), radius: size / 2, textAlign: 'center', vAlign: 'middle', fontSize: Math.round(size * 0.46), fontWeight: 700, color: '#0a1020', fontFamily: H, pad: [0, 0, 0, 0] });
      return chain ? withAnims(b, A('zoom-in', { start: 'afterPrev', duration: 350, delay: i ? 0 : 400 })) : b; });
    const title = (t, y = 50) => text(t, 80, y, 1120, 70, { fontFamily: H, fontSize: 44, fontWeight: 700, color: FG });
    // Two paths from the same cloud: like the Sun (top) or more than 8 solar masses (bottom).
    const COLS = [470, 690, 910, 1120], YA = 265, YB = 505;
    const node = (cx, cy, d, el, label, sub, color) => [el, text(`<b style="color:${color}">${label}</b><br><span style="color:${DIM}">${sub}</span>`, cx - 100, cy + d / 2 + 8, 200, 70, { fontSize: 17, textAlign: 'center', color: FG, lineHeight: 1.25 })];
    const rowA = [
      node(COLS[0], YA, 56, sphere(COLS[0], YA, 28, '#fffbe8', '#f5b33b'), 'Secuencia principal', '10.000 millones de años', GOLD),
      node(COLS[1], YA, 110, sphere(COLS[1], YA, 55, '#ffcf9a', '#d9481f'), 'Gigante roja', 'se hincha ×100', RED),
      node(COLS[2], YA, 96, shape('ellipse', COLS[2] - 48, YA - 48, 96, 96, '#4fd1c5', { fill2: BG, gradType: 'radial', opacity: 85, stroke: '#7ee7dc', strokeWidth: 3 }), 'Nebulosa planetaria', 'expulsa sus capas', '#7ee7dc'),
      node(COLS[3], YA, 26, sphere(COLS[3], YA, 13, '#ffffff', '#9bb0ff'), 'Enana blanca', 'del tamaño de la Tierra', '#cad7ff')];
    const rowB = [
      node(COLS[0], YB, 72, sphere(COLS[0], YB, 36, '#ffffff', '#6f8cff'), 'Secuencia principal', 'solo 10–30 millones de años', '#9bb0ff'),
      node(COLS[1], YB, 130, sphere(COLS[1], YB, 65, '#ffb37a', '#a3201a'), 'Supergigante roja', 'capas como una cebolla', RED),
      node(COLS[2], YB, 120, shape('burst', COLS[2] - 60, YB - 60, 120, 120, '#fff6c8', { fill2: '#ff6a2b', gradType: 'radial' }), 'Supernova', 'brilla como una galaxia', '#ffb15c'),
      node(COLS[3], YB, 44, shape('ellipse', COLS[3] - 22, YB - 22, 44, 44, '#000000', { stroke: '#ff9f43', strokeWidth: 4 }), 'Estrella de neutrones', 'o agujero negro', '#ff9f43')];
    const chainRow = row => row.map(([el, lab], i) => [withAnims(el, A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 450, ...(row === rowB && i === 2 && { sound: 'drumroll' }) })),
      withAnims(lab, A('fade-in', { start: 'withPrev', duration: 450 }))]).flat();
    // The main sequence's outline: an ellipse along the band, turned to its slope.
    const m1 = [60 + hrX(32000), 130 + hrY(1.5e5)], m2 = [60 + hrX(2900), 130 + hrY(0.002)], mlen = Math.hypot(m2[0] - m1[0], m2[1] - m1[1]);
    const MS = [(m1[0] + m2[0]) / 2 - mlen / 2 - 10, (m1[1] + m2[1]) / 2 - 42, mlen + 20, 84], MSROT = Math.round(Math.atan2(m2[1] - m1[1], m2[0] - m1[0]) * 180 / Math.PI);
    return numbered(build({ name: 'Vida y muerte de las estrellas', palette: 'ocean', fonts: 'editorial', title: { color: FG, size: 44 }, body: { color: FG },
      decor: () => [shape('rect', 0, 714, 1280, 6, '#9bb0ff', { fill2: '#ff8a50', gradAngle: 0 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', back: [...starfield(70, 11), glow(-120, -40, 900, '#2d4fb0', BG, 45)], extra: [
        glow(80, 110, 500, '#8fb0ff', BG, 70), sphere(330, 360, 150, '#ffffff', '#86a6ff'),
        kicker('ASTROFÍSICA ESTELAR · TEMA 4', 620, 150, 600, GOLD),
        text('Vida y muerte<br>de las estrellas', 616, 190, 620, 200, { fontFamily: H, fontSize: 66, fontWeight: 700, color: FG, lineHeight: 1.12 }),
        text('De la nube de gas al último destello: la masa decide el destino de cada estrella.', 620, 410, 560, 90, { fontSize: 26, color: DIM }),
        ...spectral(620, 540, 56),
        text('Clases espectrales, de la más caliente a la más fría', 620, 612, 600, 34, { fontSize: 18, color: DIM })],
        notes: 'Portada: la estrella es una elipse con degradado radial y un brillo detrás. Las siete clases espectrales (O, B, A, F, G, K, M) aparecen solas, en cadena, con su color real aproximado. Regla para recordarlas: «Oh, Be A Fine Girl/Guy, Kiss Me».' },
      { layout: 'blank', bg: BG, extra: [
        title('Una estrella es un equilibrio'),
        sphere(330, 400, 140, '#fff6d6', '#f0932b'),
        ...[0, 90, 180, 270, 45, 135, 225, 315].map((a, i) => { const t = a * Math.PI / 180;
          return withAnims(arrowAt(330 + Math.cos(t) * 190, 400 + Math.sin(t) * 190, 60, a + 180, RED, 5), A('fade-in', { start: i ? 'withPrev' : 'click', duration: 500 })); }),
        withAnims(text('Gravedad: aprieta hacia dentro', 90, 136, 480, 40, { fontSize: 24, color: RED, textAlign: 'center' }), A('fade-in', { start: 'withPrev' })),
        ...[0, 90, 180, 270].map((a, i) => { const t = (a + 45) * Math.PI / 180;
          return withAnims(arrowAt(330 + Math.cos(t) * 75, 400 + Math.sin(t) * 75, 70, a + 45, '#7a3300', 6), A('fade-in', { start: i ? 'withPrev' : 'click', duration: 500 })); }),
        withAnims(text('Presión del gas caliente: empuja hacia fuera', 90, 636, 480, 40, { fontSize: 24, color: GOLD, textAlign: 'center' }), A('fade-in', { start: 'withPrev' })),
        withAnims(mathBlock({ x: 640, y: 170, w: 560, h: 120, fontSize: 40, color: FG, latex: '\\frac{dP}{dr} = -\\,\\frac{G\\,M(r)\\,\\rho(r)}{r^2}' }), A('fade-in')),
        withAnims(text(`Equilibrio hidrostático: en cada capa, la presión que sube compensa el peso de lo que tiene encima.`, 640, 310, 560, 110, { fontSize: 26, color: FG }), A('fade-up', { start: 'afterPrev' })),
        withAnims(card(`<b style="color:${GOLD}">Mientras haya combustible</b>, la fusión del núcleo mantiene la presión. Cuando se agota, la gravedad gana… y empieza el final.`, 640, 450, 560, 170, '#ffffff0d', { fontSize: 24, color: FG, borderColor: '#ffd27a55' }), A('fade-up', { start: 'afterPrev' }))],
        notes: 'Primer clic: las flechas rojas de la gravedad. Segundo clic: las de la presión, dentro de la estrella. Tercer clic: la ecuación (KaTeX) y la idea clave. P es la presión, ρ la densidad y M(r) la masa dentro del radio r.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        title('El diagrama de Hertzsprung‑Russell'),
        img(hrDiagram(), 60, 130, HR_W, HR_H, 'Diagrama H-R con la secuencia principal, las gigantes, las supergigantes y las enanas blancas'),
        ...[['Secuencia principal', 'El 90 % de las estrellas: queman hidrógeno en el núcleo.', GOLD, MS],
          ['Gigantes rojas', 'Frías pero enormes: por eso brillan tanto.', RED, [60 + hrX(5200), 130 + hrY(2e3), hrX(3500) - hrX(5200) + 20, hrY(30) - hrY(2e3)]],
          ['Supergigantes', 'Las más luminosas: viven deprisa y mueren jóvenes.', '#9bb0ff', [60 + hrX(32000), 130 + hrY(1.2e6), hrX(3300) - hrX(32000), hrY(1e4) - hrY(1.2e6) + 10]],
          ['Enanas blancas', 'Calientes y diminutas: brasas de estrellas muertas.', '#cad7ff', [60 + hrX(26000), 130 + hrY(0.02), hrX(6500) - hrX(26000), hrY(2e-4) - hrY(0.02)]]].map(([h, d, c, [x, y, w, hh]], i) => [
          withAnims(shape('ellipse', Math.round(x), Math.round(y), Math.round(w), Math.round(hh), 'none', { stroke: c, strokeWidth: 3, dash: 'dash', ...(i === 0 && { rotation: MSROT }) }), A('zoom-in', { duration: 400 })),
          withAnims(text(`<b style="color:${c};font-size:26px">${h}</b><br>${d}`, 850, 150 + i * 130, 370, 120, { fontSize: 20, color: FG }), A('fade-left', { start: 'withPrev', duration: 400 }))]).flat()],
        notes: 'El diagrama H-R es un dibujo SVG hecho en la propia plantilla (los puntos son estrellas inventadas que siguen la forma real). Cada clic rodea una región y explica qué estrellas hay en ella. El Sol está marcado en dorado.' },
      { layout: 'blank', bg: BG, transition: 'slide', extra: [
        title('El destino depende de la masa'),
        sphere(120, 392, 46, '#7d6bd8', BG, { opacity: 90 }), text(`<b style="color:#b9a8ff">Nebulosa</b><br><span style="color:${DIM}">nube de gas y polvo</span>`, 40, 450, 160, 70, { fontSize: 17, textAlign: 'center', color: FG }),
        sphere(280, 392, 24, '#ffe2b8', '#c0572a'), text(`<b style="color:#ffc58a">Protoestrella</b><br><span style="color:${DIM}">se enciende la fusión</span>`, 200, 450, 160, 70, { fontSize: 17, textAlign: 'center', color: FG }),
        ink([[312, 380], [372, 300], [430, 270]], '#3c4f7a', 3), ink([[312, 404], [372, 482], [424, YB - 4]], '#3c4f7a', 3),
        ink([[504, YA], [626, YA]], '#3c4f7a', 3), ink([[756, YA], [854, YA]], '#3c4f7a', 3), ink([[968, YA], [1100, YA]], '#3c4f7a', 3),
        ink([[516, YB], [616, YB]], '#3c4f7a', 3), ink([[764, YB], [844, YB]], '#3c4f7a', 3), ink([[978, YB], [1090, YB]], '#3c4f7a', 3),
        kicker('COMO EL SOL', 400, 160, 300, GOLD), kicker('MÁS DE 8 MASAS SOLARES', 400, 652, 500, '#9bb0ff'),
        ...chainRow(rowA), ...chainRow(rowB)],
        notes: 'Primer clic: el camino de una estrella como el Sol, una etapa detrás de otra. Segundo clic: el de una estrella masiva, que termina en supernova (con redoble). Los tamaños no están a escala: una supergigante cabría en la órbita de Júpiter.' },
      { layout: 'blank', bg: BG, extra: [
        title('¿Cuánto vive una estrella?'),
        mathBlock({ x: 80, y: 150, w: 560, h: 100, fontSize: 38, color: FG, latex: 't \\approx 10^{10}\\,\\text{años}\\cdot\\left(\\frac{M}{M_\\odot}\\right)^{-2{,}5}' }),
        tableBlock({ x: 80, y: 270, w: 520, h: 370, fontSize: 24, header: true, headBg: '#1c3a6e', headFg: '#ffffff', stroke: '#22345a', banded: true, band: '#4a90d9', colW: [2, 3],
          rows: [['Masa (soles)', 'Vida (millones de años)'], ['0,5', '=REDONDEAR(10000/A2^2,5;0)'], ['1', '=REDONDEAR(10000/A3^2,5;0)'], ['2', '=REDONDEAR(10000/A4^2,5;0)'], ['5', '=REDONDEAR(10000/A5^2,5;0)'], ['10', '=REDONDEAR(10000/A6^2,5;0)'], ['20', '=REDONDEAR(10000/A7^2,5;0)']] }),
        chartBlock({ x: 660, y: 150, w: 560, h: 430, chartType: 'doughnut', legend: true,
          data: [{ label: 'M (rojas)', value: 76, color: '#ff9b5e' }, { label: 'K (naranjas)', value: 12, color: '#ffd2a1' }, { label: 'G (como el Sol)', value: 7.6, color: '#fff4c2' },
            { label: 'F', value: 3, color: '#f8f7ff' }, { label: 'A, B y O', value: 1.4, color: '#9bb0ff' }] }),
        text('Las pequeñas son mayoría: tres de cada cuatro estrellas de la galaxia son enanas rojas.', 680, 590, 520, 70, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'La tabla calcula la vida con fórmulas (=10000/A2^2,5): cambia una masa y se recalcula. La relación es aproximada. La dona muestra la proporción de estrellas por clase en la vecindad solar (valores redondeados).' },
      { layout: 'blank', bg: '#03060f', transition: 'zoom', extra: [
        glow(560, 20, 700, '#7a2d6b', '#03060f', 40),
        N('g292-0-1-8-supernova-remnant', 600, 80, 600, 560, { view: 'front', spin: 12, edge: 'fade' }),
        kicker('RESTO DE SUPERNOVA G292.0+1.8', 80, 130, 520, '#ff9fd0'),
        text('Una supernova', 80, 170, 520, 90, { fontFamily: H, fontSize: 60, fontWeight: 700, color: FG }),
        withAnims(text('10<sup>44</sup> J', 80, 280, 480, 130, { fontFamily: H, fontSize: 110, wordart: 'fire', lineHeight: 1 }), A('zoom-in', { duration: 600, sound: 'pop' })),
        withAnims(text('En unas semanas libera tanta energía como el Sol en toda su vida y brilla más que su galaxia entera.', 80, 430, 480, 120, { fontSize: 26, color: FG }), A('fade-up', { start: 'afterPrev' })),
        withAnims(text('Lo que queda: una estrella de neutrones que gira 30 veces por segundo.', 80, 570, 480, 80, { fontSize: 22, color: DIM }), A('fade-up', { start: 'afterPrev' }))],
        notes: 'Modelo 3D de la NASA (datos del observatorio Chandra) de los restos de una supernova, con bordes difuminados y girando despacio. La del Cangrejo, en el año 1054, fue visible de día durante semanas.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'order', question: 'Ordena la vida de una estrella como el Sol', fontSize: 34, x: 60, y: 40, w: 1160, h: 640,
        options: ['Nube de gas y polvo', 'Protoestrella', 'Secuencia principal', 'Gigante roja', 'Nebulosa planetaria', 'Enana blanca'] })],
        notes: 'Actividad «Ordenar» desde el móvil: cada estudiante recibe las fases desordenadas y las arrastra. Puntúa cada posición correcta.' },
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', back: [...starfield(60, 23), glow(340, 120, 600, '#2d4fb0', BG, 40)], extra: [
        sphere(640, 250, 30, '#ffffff', '#9bb0ff'), glow(560, 170, 160, '#cad7ff', BG, 60),
        text('El calcio de tus huesos y el oxígeno que respiras<br>se fabricaron dentro de estrellas que ya no existen.', 140, 340, 1000, 120, { fontFamily: H, fontSize: 34, color: FG, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4 }),
        text('Próxima clase: estrellas de neutrones y púlsares', 140, 490, 1000, 40, { fontSize: 24, color: GOLD, textAlign: 'center' }),
        ...spectral(401, 570, 46, false),
        text(NASA_CREDIT, 140, 652, 1000, 30, { fontSize: 15, color: '#5d6f92', textAlign: 'center' })],
        notes: 'Cierre: una enana blanca, lo que quedará del Sol. Los elementos más pesados que el helio se forman en las estrellas y en sus explosiones.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Black holes: pure black, white type with wide spacing and one amber horizon that travels through the deck (Transform).
  sci_astro_blackholes: { name: 'Agujeros negros', cat: 'sci', summary: 'Negro absoluto: horizonte que viaja con Transformar, texto curvo, cifra gigante, tabla con fórmulas, astronauta 3D en espiral y concurso', make: () => {
    const BG = '#000000', FG = '#f4f4f4', DIM = '#8c8c8c', AMB = '#ff9a3c', HOT = '#ffd59a', H = pairStacks('modern').heading;
    const [G1, G2, G3, G4] = [uid(), uid(), uid(), uid()];
    // The black hole: a glow, a tilted accretion disk, the shadow and its thin photon ring (the same ids on every slide: Transform).
    const hole = (cx, cy, r) => [
      { ...glow(cx - r * 2.2, cy - r * 2.2, r * 4.4, '#7a3a0a', BG, 70), id: G1 },
      { ...shape('ellipse', cx - r * 2.3, cy - r * 0.42, r * 4.6, r * 0.84, HOT, { fill2: BG, gradType: 'radial', rotation: -8 }), id: G2 },
      { ...shape('ellipse', cx - r, cy - r, r * 2, r * 2, '#000000'), id: G3 },
      { ...shape('ellipse', cx - r * 1.06, cy - r * 1.06, r * 2.12, r * 2.12, 'none', { stroke: AMB, strokeWidth: Math.max(2, Math.round(r / 30)) }), id: G4 }];
    const head = (t, y = 60) => text(t, 80, y, 1120, 60, { fontFamily: H, fontSize: 40, fontWeight: 300, letterSpacing: 6, color: FG });
    // A spiral into the hole, for the astronaut (from 300 px away, a turn and a half).
    const HX = 760, HY = 430, spiral = Array.from({ length: 49 }, (_, i) => { const t = i / 48, a = (-60 + t * 540) * Math.PI / 180, rr = 300 * (1 - t) + 6; return [HX + rr * Math.cos(a), HY + rr * Math.sin(a)]; });
    // S2 around Sagittarius A*: an ellipse with e ≈ 0.88 and the hole at a focus.
    const OX = 540, OY = 420, RX = 320, RY = Math.round(320 * Math.sqrt(1 - 0.88 ** 2)), FX = OX + Math.round(0.88 * RX);
    const orbit = arcPts(OX, OY, RX, RY, 180, 540, 60);
    return numbered(withFg(build({ name: 'Agujeros negros', palette: 'grayscale', fonts: 'modern', title: { color: FG, size: 44 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', back: starfield(40, 5, '#ffffff', [0, 0, 1280, 720], 2.5, [15, 55]), extra: [
        ...hole(640, 310, 120),
        text('nada escapa · ni siquiera la luz · nada escapa', 290, 60, 700, 150, { fontSize: 22, curve: 32, letterSpacing: 6, color: DIM }),
        text('AGUJEROS NEGROS', 90, 520, 1100, 80, { fontFamily: H, fontSize: 64, fontWeight: 300, letterSpacing: 22, textAlign: 'center', color: FG }),
        text('Astrofísica relativista · Seminario 6', 90, 610, 1100, 40, { fontSize: 22, textAlign: 'center', color: AMB, letterSpacing: 3 })],
        notes: 'Portada: el agujero negro está hecho con cuatro formas (brillo, disco de acreción inclinado, sombra y anillo de fotones) que viajan con Transformar a las dos diapositivas siguientes. El lema va en texto curvo.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        ...hole(1010, 380, 130),
        kicker('UN EXPERIMENTO MENTAL', 80, 110, 600, AMB),
        text('Si comprimieras la Tierra entera hasta el tamaño de una canica…', 80, 150, 620, 110, { fontSize: 34, color: FG, lineHeight: 1.3 }),
        withAnims(text('9 mm', 70, 280, 660, 220, { fontFamily: H, fontSize: 180, fontWeight: 800, color: FG, lineHeight: 1, letterSpacing: -4 }), A('zoom-in', { duration: 700, sound: 'pop' })),
        withAnims(text('…se convertiría en un agujero negro. Su gravedad sería la misma; lo que cambia es lo <b style="color:#ff9a3c">concentrada</b> que está la masa.', 80, 520, 620, 120, { fontSize: 26, color: DIM }), A('fade-up', { start: 'afterPrev' }))],
        notes: 'Transformar: el agujero de la portada se desplaza a la derecha. Clic: aparece la cifra gigante con un sonido. Para que la luz no escape, la velocidad de escape tiene que superar los 300.000 km/s.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        ...hole(1120, 120, 46),
        head('EL RADIO DE SCHWARZSCHILD'),
        mathBlock({ x: 80, y: 150, w: 500, h: 130, fontSize: 60, color: FG, latex: 'r_s = \\frac{2GM}{c^2}' }),
        text('Por debajo de ese radio, ni la luz sale. Para una masa como la del Sol son <b style="color:#ffd59a">unos 3 km</b>: basta multiplicar la masa en soles por 2,95.', 80, 300, 500, 200, { fontSize: 26, color: FG }),
        tableBlock({ x: 640, y: 170, w: 560, h: 330, fontSize: 22, header: true, lines: true, stroke: '#3a3a3a', headFg: AMB, colW: [4, 5, 5],
          rows: [['Objeto', 'Masa (soles)', 'r<sub>s</sub> (km)'], ['El Sol', '1', '=B2*2,95'], ['Cygnus X‑1', '21', '=B3*2,95'], ['Sagitario A*', '4.300.000', '=B4*2,95'], ['M87*', '6.500.000.000', '=B5*2,95']] }),
        text('El de M87* es tres veces mayor que la órbita de Plutón.', 640, 520, 560, 80, { fontSize: 22, color: DIM })],
        notes: 'La última columna se calcula con una fórmula (=B2*2,95): cambia una masa y verás el radio. Cygnus X-1 es de masa estelar; Sagitario A* está en el centro de nuestra galaxia; M87* fue el primero fotografiado.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        head('ANATOMÍA'),
        glow(380 - 260, 410 - 260, 520, '#4a2406', BG, 60),
        ring(380, 410, 180, AMB, { dash: 'dash', strokeWidth: 3 }), ring(380, 410, 90, HOT, { dash: 'dot', strokeWidth: 3 }),
        shape('ellipse', 320, 350, 120, 120, '#000000', { stroke: '#5a5a5a', strokeWidth: 2 }), shape('ellipse', 375, 405, 10, 10, '#ffffff'),
        ...[['Singularidad', 'Toda la masa en un punto: allí la relatividad general deja de funcionar.', [385, 410], 170, '#ffffff'],
          ['Horizonte de sucesos', 'r = r<sub>s</sub>. El punto sin retorno: no es una superficie, no se nota al cruzarlo.', [440, 380], 290, '#bdbdbd'],
          ['Esfera de fotones', 'r = 1,5 r<sub>s</sub>. La luz puede dar vueltas en órbita.', [465, 440], 410, HOT],
          ['Última órbita estable', 'r = 3 r<sub>s</sub>. Más cerca, la materia cae sin remedio.', [545, 485], 530, AMB]].map(([h, d, [px, py], ly, c], i) => [
          withAnims(ink([[px, py], [660, ly + 20], [690, ly + 20]], c, 2), A('draw', { start: 'click', duration: 600 })),
          withAnims(text(`<b style="color:${c};font-size:26px">${h}</b><br>${d}`, 700, ly - 10, 500, 100, { fontSize: 20, color: FG }), A('fade-in', { start: 'afterPrev', duration: 400 }))]).flat()],
        notes: 'Cada clic dibuja una línea guía (efecto «Dibujar» sobre un trazo) y muestra la parte. Los anillos son elipses sin relleno con trazo discontinuo. r_s es el radio de Schwarzschild.' },
      { layout: 'blank', bg: BG, extra: [
        glow(HX - 220, HY - 220, 440, '#6b3208', BG, 70), shape('ellipse', HX - 70, HY - 70, 140, 140, '#000000', { stroke: AMB, strokeWidth: 3 }),
        ...spiral.filter((_, i) => i % 3 === 0 && i < 45).map(([x, y], i) => shape('ellipse', Math.round(x) - 2, Math.round(y) - 2, 4, 4, DIM, { opacity: 30 + i * 4 })),
        head('ESPAGUETIZACIÓN', 60),
        text('Cerca de un agujero negro pequeño, la gravedad en los pies es mucho mayor que en la cabeza: las <b style="color:#ff9a3c">fuerzas de marea</b> te estiran como un fideo.', 80, 150, 420, 230, { fontSize: 25, color: FG }),
        mathBlock({ x: 80, y: 400, w: 380, h: 110, fontSize: 38, color: HOT, latex: '\\Delta a \\approx \\frac{2GM\\,L}{r^3}' }),
        text('En uno supermasivo cruzarías el horizonte sin notarlo… y ya no podrías volver.', 80, 540, 420, 100, { fontSize: 22, color: DIM }),
        withAnims(N('astronaut', Math.round(spiral[0][0]) - 70, Math.round(spiral[0][1]) - 90, 140, 180, { view: 'front', autoRotate: false }),
          path(rel(spiral), { duration: 5000, spin: 720, sound: 'whoosh' }), A('fade-out', { start: 'afterPrev', duration: 600 }))],
        notes: 'Clic: el astronauta 3D (NASA) cae en espiral girando sobre sí mismo (Trayectoria con giro) y desaparece en el horizonte. L es la altura del cuerpo y r la distancia al centro.' },
      { layout: 'blank', bg: BG, transition: 'slide', extra: [
        N('chandra-x-ray-observatory', 40, 120, 560, 520, { view: 'three', spin: 16, edge: 'fade' }),
        head('¿CÓMO SE VE LO INVISIBLE?'),
        ...[['Rayos X', 'El gas del disco se calienta a millones de grados y brilla en rayos X.'], ['Órbitas de estrellas', 'Giran alrededor de «nada» a miles de kilómetros por segundo.'],
          ['Ondas gravitacionales', 'Dos agujeros que se fusionan sacuden el propio espacio.'], ['La sombra', 'Una red de radiotelescopios del tamaño de la Tierra la fotografía.']].map(([h, d], i) => [
          withAnims(text(`0${i + 1}`, 640, 160 + i * 125, 90, 70, { fontFamily: H, fontSize: 48, fontWeight: 300, color: AMB }), A('fade-in', { start: i ? 'click' : 'click', duration: 400 })),
          withAnims(text(`<b style="font-size:26px">${h}</b><br><span style="color:${DIM}">${d}</span>`, 740, 160 + i * 125, 460, 110, { fontSize: 21, color: FG }), A('fade-left', { start: 'withPrev', duration: 400 })),
          shape('rect', 640, 270 + i * 125, 560, 1, '#2a2a2a')]).flat()],
        notes: 'El observatorio de rayos X Chandra (modelo 3D de la NASA) gira despacio. Cada clic muestra una de las cuatro maneras de detectar algo que no emite luz.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'quiz', question: 'Si el Sol se convirtiera en un agujero negro de su misma masa, ¿qué le pasaría a la órbita de la Tierra?', options: ['Se la tragaría', 'Nada: seguiría igual', 'Saldría despedida', 'Caería en espiral poco a poco'], correct: [1], time: 25, fontSize: 34, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Concurso desde el móvil. La gravedad a 150 millones de km solo depende de la masa, que sería la misma: la Tierra seguiría en su órbita… a oscuras y helada.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        head('S2: EN ÓRBITA ALREDEDOR DE NADA'),
        shape('ellipse', OX - RX, OY - RY, RX * 2, RY * 2, 'none', { stroke: '#4a4a4a', strokeWidth: 2, dash: 'dash' }),
        ...hole(FX, OY, 14),
        text('Sagitario A*', FX - 80, OY + 34, 160, 30, { fontSize: 18, color: AMB, textAlign: 'center' }),
        withAnims(sphere(orbit[0][0], orbit[0][1], 11, '#ffffff', '#9bb0ff'), path(rel(orbit), { duration: 6000 })),
        ...[['16 años', 'tarda en dar una vuelta'], ['120 UA', 'su máximo acercamiento'], ['7.650 km/s', 'su velocidad en ese punto']].map(([n, l], i) =>
          withAnims(stat(n, l, 920, 150 + i * 170, 300, i === 2 ? AMB : FG, DIM, 52), A('fade-left', { start: 'afterPrev', duration: 450 })))],
        notes: 'Clic: la estrella S2 recorre su órbita (Trayectoria). En la realidad acelera muchísimo al pasar junto al agujero. Siguiendo estas órbitas se calculó la masa de Sagitario A*: unos 4,3 millones de soles.' },
      { layout: 'blank', bg: BG, autoAnimate: true, transition: 'fade', extra: [
        ...hole(640, 360, 330),
        text('Gracias', 340, 280, 600, 100, { fontFamily: H, fontSize: 72, fontWeight: 300, letterSpacing: 18, textAlign: 'center', color: FG }),
        text('¿Preguntas antes de cruzar el horizonte?', 340, 380, 600, 40, { fontSize: 22, textAlign: 'center', color: DIM }),
        text(NASA_CREDIT, 340, 440, 600, 30, { fontSize: 14, textAlign: 'center', color: '#5a5a5a' })],
        notes: 'Transformar: el pequeño agujero de la diapositiva anterior crece hasta llenar la pantalla y el cierre se escribe dentro de su sombra.' },
    ]), FG));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Exoplanets as a travel agency for other worlds: cream paper, flat retro posters, Josefin Sans.
  sci_astro_exoplanets: { name: 'Se buscan otros mundos', cat: 'sci', summary: 'Carteles de viaje retro: tránsito con su curva de luz dibujada, código Python, bamboleo con trayectorias, área, satélite 3D y votación', make: () => {
    const CREAM = '#f4ead5', INK = '#1f2a44', TEAL = '#1b7f79', ORA = '#e8743b', MAG = '#c2416b', MUS = '#e9b44c', NAVY = '#22305a', SOFT = '#6b6355', J = FF.josefin;
    // Three posters (flat SVG): a hot Jupiter, a super-Earth with two suns, an ocean world under a red dwarf.
    const stripes = (y0, n, h, c1, c2) => Array.from({ length: n }, (_, i) => `<rect x="0" y="${y0 + i * h}" width="340" height="${h}" fill="${i % 2 ? c2 : c1}"/>`).join('');
    const POSTERS = {
      hot: svgURL(340, 480, `<rect width="340" height="480" fill="#f6c27a"/>${stripes(0, 6, 40, '#f4b266', '#f09d55')}<circle cx="250" cy="90" r="120" fill="#fff0b8"/><circle cx="250" cy="90" r="96" fill="#ffd56b"/>`
        + `<circle cx="120" cy="250" r="92" fill="${MAG}"/><path d="M28 230 Q120 210 212 232 L212 246 Q120 226 28 246Z" fill="#e0607f"/><path d="M30 268 Q120 250 210 270 L208 284 Q120 266 32 284Z" fill="#8f2b4c"/>`
        + `<rect x="0" y="380" width="340" height="100" fill="${NAVY}"/>`, '#f6c27a'),
      earth: svgURL(340, 480, `<rect width="340" height="480" fill="#9fd3c7"/><rect y="0" width="340" height="150" fill="#bfe3d5"/><circle cx="90" cy="110" r="44" fill="#ffe08a"/><circle cx="210" cy="80" r="26" fill="${ORA}"/>`
        + `<path d="M0 300 L70 200 L130 270 L200 170 L270 260 L340 210 L340 480 L0 480Z" fill="${TEAL}"/><path d="M0 340 L90 280 L170 330 L250 270 L340 320 L340 480 L0 480Z" fill="#125955"/>`
        + `<rect x="0" y="380" width="340" height="100" fill="${NAVY}"/>`, '#9fd3c7'),
      ocean: svgURL(340, 480, `<rect width="340" height="480" fill="#2d3e6e"/><circle cx="170" cy="150" r="110" fill="#d9534f" opacity="0.9"/><circle cx="170" cy="150" r="80" fill="#ef7f5a"/>`
        + `<rect x="0" y="210" width="340" height="170" fill="#1b5e7a"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M0 ${230 + i * 26} q21 -10 42 0 t42 0 t42 0 t42 0 t42 0 t42 0 t42 0 t42 0 t42 0" fill="none" stroke="#7cc6d6" stroke-width="3" opacity="${0.9 - i * 0.1}"/>`).join('')
        + `<rect x="0" y="380" width="340" height="100" fill="${MUS}"/>`, '#2d3e6e') };
    const poster = (k, x, y, w, h, props = {}) => img(POSTERS[k], x, y, w, h, 'Cartel de viaje retro de un exoplaneta', { fit: 'cover', shadow: { x: 0, y: 10, blur: 24, color: '#00000040' }, ...props });
    const head = (t, y = 50, color = INK) => text(t, 80, y, 1120, 70, { fontFamily: J, fontSize: 46, fontWeight: 700, color, letterSpacing: 1 });
    // The transit: the planet crosses the star; the light curve below dips while it does.
    const SX = 330, SY = 390, SR = 170, LC = [[680, 330], [820, 330], [860, 332], [880, 420], [1010, 420], [1030, 332], [1070, 330], [1200, 330]];
    // A spectrum strip for the wobble.
    const RAINBOW = svgURL(600, 60, `<defs><linearGradient id="r" x1="0" x2="1"><stop offset="0" stop-color="#6a3fb5"/><stop offset=".2" stop-color="#2f6fdf"/><stop offset=".4" stop-color="#2fbf71"/><stop offset=".6" stop-color="#f2e24b"/><stop offset=".8" stop-color="#f39a2b"/><stop offset="1" stop-color="#d7263d"/></linearGradient></defs><rect width="600" height="60" rx="8" fill="url(#r)"/>`);
    return numbered(withFg(build({ name: 'Se buscan otros mundos', palette: 'violet', fonts: 'friendly', title: { color: INK, font: J }, body: { color: INK },
      decor: () => [shape('rect', 40, 40, 1200, 640, 'none', { stroke: '#d8c9a8', strokeWidth: 2 })] }, [
      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
        kicker('AGENCIA DE VIAJES INTERESTELARES', 90, 130, 620, '#b04a1c'),
        text('Se buscan<br>otros mundos', 86, 160, 640, 230, { fontFamily: J, fontSize: 92, fontWeight: 700, color: INK, lineHeight: 1.02 }),
        text('Cómo se descubren los exoplanetas, qué sabemos de ellos y dónde podría haber vida.', 90, 400, 560, 124, { fontSize: 28, color: SOFT }),
        shape('rect', 90, 540, 120, 8, ORA), shape('rect', 210, 540, 120, 8, TEAL), shape('rect', 330, 540, 120, 8, MAG),
        poster('earth', 800, 90, 360, 520, { rotation: 3 }),
        text(`<div style="font-size:15px;letter-spacing:4px;opacity:.8">VISITE</div><b>TRAPPIST‑1e</b><div style="font-size:16px">a 40 años luz · tres soles en el cielo… casi</div>`, 812, 506, 336, 96, { fontFamily: J, fontSize: 32, color: '#ffffff', textAlign: 'center', rotation: 3 })],
        notes: 'Portada con estética de cartel de viaje de los años treinta: colores planos y un cartel dibujado en SVG dentro de la propia plantilla, algo girado. TRAPPIST-1e es un exoplaneta real; el cartel, inventado.' },
      { layout: 'blank', bg: CREAM, transition: 'push', extra: [
        head('De uno a miles en treinta años'),
        chartBlock({ x: 80, y: 150, w: 760, h: 470, chartType: 'area', color: TEAL, grid: true, yTitle: 'Exoplanetas confirmados (acumulado)',
          data: [['1995', 1], ['2000', 50], ['2005', 180], ['2010', 500], ['2014', 1800], ['2016', 3400], ['2020', 4300], ['2024', 5600]].map(([label, value]) => ({ label, value })) }),
        withAnims(text(`<div style="font-family:${J};font-size:84px;font-weight:700;line-height:1;color:#c0531f">5.600+</div><div style="margin-top:10px">mundos confirmados alrededor de otras estrellas</div>`, 880, 190, 330, 260, { fontSize: 24, color: INK }), A('zoom-in', { duration: 500 })),
        withAnims(card('El salto de 2014–2016 llegó con un solo telescopio espacial que vigilaba 150.000 estrellas a la vez.', 880, 460, 330, 160, '#ffffff', { fontSize: 20, color: INK, borderColor: '#e2d6bc' }), A('fade-up', { start: 'afterPrev' }))],
        notes: 'Gráfico de área con la cuenta acumulada de exoplanetas (cifras aproximadas y redondeadas). Clic: la cifra grande y el dato del telescopio Kepler.' },
      { layout: 'blank', bg: CREAM, extra: [
        head('El método del tránsito'),
        sphere(SX, SY, SR, '#fff7d1', MUS),
        withAnims(shape('ellipse', SX - SR - 70, SY - 22, 44, 44, NAVY), path([[SR * 2 + 100, 0]], { duration: 4000 })),
        shape('rect', 680, 300, 520, 160, '#ffffff', { stroke: '#e2d6bc', strokeWidth: 2, radius: 8 }),
        text('Brillo de la estrella', 690, 262, 300, 34, { fontSize: 18, color: SOFT }), text('tiempo →', 1100, 466, 100, 30, { fontSize: 16, color: SOFT, textAlign: 'right' }),
        withAnims(ink(LC, ORA, 5), A('draw', { start: 'withPrev', duration: 4000 })),
        mathBlock({ x: 680, y: 510, w: 280, h: 100, fontSize: 40, color: INK, latex: '\\delta = \\left(\\frac{R_p}{R_{*}}\\right)^2' }),
        text('Un planeta como Júpiter tapa el 1 % de una estrella como el Sol; uno como la Tierra, el 0,008 %.', 965, 500, 245, 150, { fontSize: 18, color: INK })],
        notes: 'Clic: el planeta cruza por delante de la estrella (Trayectoria) y a la vez se dibuja la curva de luz (efecto «Dibujar» en un trazo, «con la anterior»). La profundidad de la caída da el tamaño del planeta.' },
      { layout: 'blank', bg: CREAM, transition: 'slide', extra: [
        head('Encuéntralo tú: la caída en los datos'),
        N('transiting-exoplanet-survey-satellite-tess-b', 50, 150, 420, 460, { view: 'three', spin: 18, edge: 'fade' }),
        codeBlock({ x: 500, y: 170, w: 700, h: 290, fontSize: 22, lang: 'python', lineSteps: '1-3|4-5|6|7',
          code: 'import numpy as np\n\nflujo = np.loadtxt("curva.csv")  # brillo\nbase = np.median(flujo)\ncaida = base - flujo.min()       # profundidad\nradio = np.sqrt(caida) * 109.2   # en R⊕\nprint(f"Caída {caida:.4f} → {radio:.1f} R⊕")' }),
        text(`<b style="color:${TEAL}">Salida:</b> Caída 0,0084 → 10,0 R⊕ · un gigante gaseoso`, 500, 480, 700, 40, { fontSize: 22, color: INK, fontFamily: FF.mono }),
        text('¿Por qué 109,2? Es el radio del Sol medido en radios terrestres: la raíz de la caída da R<sub>p</sub>/R<sub>*</sub>, y basta escalarla.', 500, 540, 700, 70, { fontSize: 20, color: SOFT }),
        text('Satélite cazador de tránsitos: vigila cada zona del cielo durante 27 días.', 80, 596, 380, 56, { fontSize: 18, color: SOFT, textAlign: 'center' })],
        notes: 'El código resalta las líneas por pasos: cargar la curva, medir la caída y convertirla en radio (109,2 radios terrestres caben en el radio del Sol). El satélite 3D de la NASA gira solo. Datos de ejemplo.' },
      { layout: 'blank', bg: CREAM, extra: [
        head('El bamboleo: velocidad radial'),
        ring(330, 360, 150, '#cdbf9f', { dash: 'dash' }),
        withAnims(shape('ellipse', 465, 345, 30, 30, NAVY), path(rel(arcPts(330, 360, 150, 150, 0, 360, 36)), { duration: 4000 })),
        withAnims(sphere(330, 360, 70, '#fff7d1', MUS), path([[-14, 0], [14, 0], [0, 0]], { start: 'withPrev', duration: 4000 })),
        img(RAINBOW, 640, 240, 560, 60, 'Espectro de la estrella'),
        ...[90, 210, 300, 430].map(dx => withAnims(shape('rect', 640 + dx, 236, 6, 68, '#1a1a1a'), path([[-10, 0], [10, 0], [0, 0]], { start: 'withPrev', duration: 4000 }))),
        text('← se acerca: líneas hacia el azul', 640, 320, 280, 60, { fontSize: 18, color: '#2f6fdf' }), text('se aleja: hacia el rojo →', 920, 320, 280, 60, { fontSize: 18, color: '#d7263d', textAlign: 'right' }),
        mathBlock({ x: 640, y: 410, w: 300, h: 100, fontSize: 40, color: INK, latex: 'v_r = c\\,\\frac{\\Delta\\lambda}{\\lambda}' }),
        text('La estrella y el planeta giran alrededor de su centro de masas: la estrella se mueve unos pocos metros por segundo.', 950, 400, 260, 200, { fontSize: 19, color: INK })],
        notes: 'Clic: el planeta da una vuelta y, a la vez, la estrella se balancea y las líneas del espectro se desplazan (cuatro trayectorias «con la anterior»). Así se descubrió el primer exoplaneta alrededor de una estrella como el Sol, en 1995.' },
      { layout: 'blank', bg: CREAM, transition: 'fade', extra: [
        head('Tres destinos, tres climas'),
        ...[['hot', 'JÚPITER CALIENTE', 'Un año dura 3 días · 1.200 °C', '#ffffff'], ['earth', 'SUPERTIERRA', 'Dos soles y gravedad ×1,8', '#ffffff'], ['ocean', 'MUNDO OCÉANO', 'Bajo una enana roja · todo agua', INK]].map(([k, t, d, c], i) => [
          withAnims(poster(k, 100 + i * 370, 150, 340, 480), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 500 })),
          withAnims(text(`<b style="font-size:26px;letter-spacing:2px">${t}</b><br>${d}`, 100 + i * 370, 545, 340, 80, { fontFamily: J, fontSize: 18, color: c, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 500 }))]).flat()],
        notes: 'Los tres carteles entran con un clic, uno detrás de otro. Son tipos reales de exoplanetas; los datos de cada cartel son de ejemplo.' },
      { layout: 'blank', bg: CREAM, extra: [
        shape('ellipse', -600, -240, 1200, 1200, '#a9c7e8'), shape('ellipse', -450, -90, 900, 900, '#9fd8a8'), shape('ellipse', -300, 60, 600, 600, '#f2a07b'),
        sphere(0, 360, 125, '#fff7d1', MUS),
        head('La zona habitable', 50, INK),
        text('Muy caliente<br><span style="font-size:18px">el agua hierve</span>', 135, 330, 160, 80, { fontSize: 22, fontWeight: 700, color: '#7a2e12' }),
        text('Justo<br><span style="font-size:18px">agua líquida</span>', 312, 330, 135, 80, { fontSize: 22, fontWeight: 700, color: '#1d5b2a' }),
        text('Muy frío<br><span style="font-size:18px">todo es hielo</span>', 460, 330, 135, 80, { fontSize: 22, fontWeight: 700, color: '#1f4a7a' }),
        withAnims(card(`<b style="color:${TEAL}">No basta con la distancia.</b> Hace falta atmósfera, un campo magnético que la proteja y una estrella tranquila, sin llamaradas que la arranquen.`, 800, 200, 400, 250, '#ffffff', { fontSize: 22, color: INK, borderColor: '#e2d6bc' }), A('fade-left')),
        withAnims(text('Alrededor de una enana roja, la zona habitable está tan cerca que el planeta muestra siempre la misma cara.', 800, 480, 400, 120, { fontSize: 19, color: SOFT }), A('fade-left', { start: 'afterPrev' }))],
        notes: 'Dibujo hecho con tres elipses grandes que se salen de la diapositiva: las bandas de temperatura alrededor de la estrella. Clic: los matices.' },
      { layout: 'blank', bg: CREAM, extra: [pollBlock({ kind: 'choice', question: '¿Qué sería la mejor pista de vida en la atmósfera de un exoplaneta?', options: ['Oxígeno y metano', 'Mucho vapor de agua', 'Dióxido de carbono', 'Nitrógeno'], display: 'bar', fontSize: 34, x: 70, y: 70, w: 1140, h: 580 })],
        notes: 'Votación en directo. Para debatir: el oxígeno y el metano reaccionan entre sí; si están juntos, algo los repone continuamente… quizá la vida.' },
      { layout: 'blank', bg: NAVY, transition: 'zoom', extra: [
        ...starfield(40, 31, '#f4ead5', [40, 40, 1200, 640], 3, [20, 70]),
        N('kepler-a', 760, 90, 420, 540, { view: 'three', autoRotate: false, motion: 'float', edge: 'fade' }),
        text('Buen viaje', 90, 200, 640, 140, { fontFamily: FF.lobster, fontSize: 110, color: MUS }),
        text('Próximo destino: leer la atmósfera de un planeta rocoso.', 96, 360, 600, 90, { fontSize: 30, color: CREAM }),
        shape('rect', 96, 480, 120, 8, ORA), shape('rect', 216, 480, 120, 8, TEAL), shape('rect', 336, 480, 120, 8, MAG),
        text(NASA_CREDIT, 96, 610, 600, 30, { fontSize: 15, color: '#9aa5c4' })],
        notes: 'Cierre nocturno: el telescopio espacial Kepler (modelo 3D de la NASA) flota al llegar. El título usa la letra Lobster, de rótulo de cartel.' },
    ]), INK));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · Telescopes as an engineering blueprint: blue paper with a grid, white strokes, a title block, Space Grotesk.
  sci_astro_telescopes: { name: 'Telescopios: el plano', cat: 'sci', summary: 'Estilo plano técnico: rayos que se dibujan, Webb 3D con Transformar por el espectro, espejo hexagonal en cadena, viaje a L2 y etiquetar', make: () => {
    const BP = '#0d3a66', LN = '#d6e8ff', DIM = '#8fb3dc', YEL = '#ffd35a', GOLD = '#e7b43a', H = pairStacks('tech').heading, JW = uid();
    const webb = (x, y, w, h, props) => ({ ...N('james-webb-space-telescope-b', x, y, w, h, props), id: JW });
    const head = (t, n) => [text(t, 80, 50, 980, 64, { fontFamily: H, fontSize: 42, fontWeight: 700, color: LN }), text(`HOJA ${n}`, 1060, 64, 140, 30, { fontFamily: FF.mono, fontSize: 16, color: DIM, textAlign: 'right', letterSpacing: 2 })];
    const label = (t, x, y, w, props = {}) => text(t, x, y, w, 30, { fontFamily: FF.mono, fontSize: 16, color: DIM, ...props });
    // The electromagnetic spectrum as a strip, from radio (left) to gamma rays (right).
    const BANDS = [['Radio', '#3d5a80'], ['Microondas', '#46638c'], ['Infrarrojo', '#a33b3b'], ['Visible', 'url(#v)'], ['Ultravioleta', '#6b4bb5'], ['Rayos X', '#2c6f8f'], ['Gamma', '#1f4d6b']];
    const SPEC = svgURL(1120, 70, `<defs><linearGradient id="v" x1="0" x2="1"><stop offset="0" stop-color="#d7263d"/><stop offset=".25" stop-color="#f39a2b"/><stop offset=".5" stop-color="#f2e24b"/><stop offset=".75" stop-color="#2fbf71"/><stop offset="1" stop-color="#2f6fdf"/></linearGradient></defs>`
      + BANDS.map(([n, c], i) => `<rect x="${i * 160}" y="0" width="160" height="70" fill="${c}" stroke="#d6e8ff" stroke-width="1"/><text x="${i * 160 + 80}" y="42" fill="#ffffff" font-family="monospace" font-size="17" text-anchor="middle">${n}</text>`).join(''));
    // A Newtonian telescope, for the labelling activity.
    const NEWTON = svgURL(900, 460, `<rect width="900" height="460" fill="${BP}"/>`
      + `<g stroke="${LN}" stroke-width="3" fill="none"><rect x="150" y="120" width="560" height="150"/><path d="M700 130 Q680 195 700 260" stroke="${YEL}" stroke-width="6"/>`
      + `<line x1="230" y1="160" x2="290" y2="220" stroke="${YEL}" stroke-width="6"/><rect x="235" y="70" width="40" height="50"/><rect x="228" y="50" width="54" height="22"/>`
      + `<line x1="430" y1="270" x2="430" y2="320"/><line x1="430" y1="320" x2="330" y2="440"/><line x1="430" y1="320" x2="430" y2="440"/><line x1="430" y1="320" x2="530" y2="440"/>`
      + `<line x1="40" y1="150" x2="690" y2="150" stroke="${DIM}" stroke-dasharray="8 6"/><line x1="40" y1="240" x2="690" y2="240" stroke="${DIM}" stroke-dasharray="8 6"/></g>`);
    // JWST's mirror: 18 hexagons (flat-top), the hexagonal rings around an empty centre.
    const HEX = []; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { const s = -q - r; if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= 2 && (q || r)) HEX.push([q, r]); }
    HEX.sort((a, b) => Math.max(Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[0] + a[1])) - Math.max(Math.abs(b[0]), Math.abs(b[1]), Math.abs(b[0] + b[1])) || Math.atan2(a[1] + a[0] / 2, a[0]) - Math.atan2(b[1] + b[0] / 2, b[0]));
    const MX = 360, MY = 400, SZ = 52;
    // Sun – Earth – L2.
    const EX = 640, EY = 420, LX = 1040;
    const toL2 = [[EX, EY], [EX + 90, EY - 70], [EX + 200, EY - 90], [EX + 310, EY - 50], [LX - 20, EY - 10], [LX, EY]];
    return numbered(withFg(build({ name: 'Telescopios: el plano', palette: 'office', fonts: 'tech', title: { color: LN }, body: { color: LN },
      decor: () => [...Array.from({ length: 31 }, (_, i) => shape('rect', 40 + i * 40, 40, 1, 640, '#ffffff', { opacity: 7 })), ...Array.from({ length: 17 }, (_, i) => shape('rect', 40, 40 + i * 40, 1200, 1, '#ffffff', { opacity: 7 })),
        shape('rect', 30, 30, 1220, 660, 'none', { stroke: LN, strokeWidth: 2, opacity: 60 })] }, [
      { layout: 'blank', bg: BP, transition: 'fade', extra: [
        text('TELESCOPIOS', 80, 110, 760, 120, { fontFamily: H, fontSize: 84, fontWeight: 700, color: LN, letterSpacing: 4 }),
        text('Ojos en el espacio: cómo se diseña un instrumento para ver lo invisible', 84, 230, 600, 100, { fontSize: 28, color: DIM }),
        webb(620, 70, 620, 520, { view: 'three', spin: 14, edge: 'fade' }),
        tableBlock({ x: 80, y: 430, w: 520, h: 200, fontSize: 18, fontFamily: FF.mono, stroke: LN, colW: [2, 5], cellPad: [6, 12, 6, 12],
          rows: [['PLANO', 'Nº 07 · Rev. B'], ['MATERIA', 'Instrumentación astronómica'], ['ESCALA', 'No a escala'], ['FECHA', 'Octubre de 2026']] })],
        notes: 'Portada de plano técnico: cuadrícula y marco en el patrón, un cajetín hecho con una tabla y el telescopio espacial James Webb (modelo 3D de la NASA) girando. El Webb viaja con Transformar a la hoja del espectro.' },
      { layout: 'blank', bg: BP, extra: [
        ...head('Refractor y reflector', '02'),
        shape('ellipse', 280, 220, 40, 280, 'none', { stroke: LN, strokeWidth: 3 }), label('LENTE', 255, 510, 100, { textAlign: 'center' }),
        ...[260, 360, 460].map((y, i) => withAnims(ink([[90, y], [300, y], [520, 360], [600, 360 + (360 - y) * 0.38]], YEL, 3), A('draw', { start: i ? 'withPrev' : 'click', duration: 1500 }))),
        shape('ellipse', 514, 354, 12, 12, '#ff7b6b'), label('FOCO', 490, 380, 80, { color: '#ff7b6b' }),
        text('<b>Refractor</b><br>La lente desvía la luz. Problema: cada color se enfoca en un punto distinto.', 90, 560, 520, 90, { fontSize: 20, color: LN }),
        shape('rect', 639, 140, 2, 520, LN, { opacity: 40 }),
        ink(arcPts(960, 360, 240, 240, -30, 30, 20), LN, 5), label('ESPEJO', 1110, 510, 120, { textAlign: 'center' }),
        ...[260, 360, 460].map((y, i) => { const mx = 960 + Math.sqrt(240 ** 2 - (y - 360) ** 2);
          return withAnims(ink([[680, y], [mx, y], [1080, 360]], YEL, 3), A('draw', { start: i ? 'withPrev' : 'click', duration: 1500 })); }),
        shape('ellipse', 1074, 354, 12, 12, '#ff7b6b'), label('FOCO', 1050, 380, 80, { color: '#ff7b6b' }),
        text('<b>Reflector</b><br>Un espejo curvo concentra la luz: sin colores falsos y se puede hacer enorme.', 680, 560, 520, 90, { fontSize: 20, color: LN })],
        notes: 'Dos clics: los rayos de luz se dibujan (efecto «Dibujar» sobre trazos) primero en el refractor y luego en el reflector. Todos los grandes telescopios actuales son reflectores.' },
      { layout: 'blank', bg: BP, extra: [
        ...head('Por qué el tamaño importa', '03'),
        mathBlock({ x: 80, y: 150, w: 520, h: 110, fontSize: 44, color: LN, latex: '\\theta \\approx 1{,}22\\,\\frac{\\lambda}{D}' }),
        text('Resolución: cuanto mayor es el diámetro D, más finos son los detalles que se separan.', 80, 270, 520, 90, { fontSize: 22, color: DIM }),
        mathBlock({ x: 80, y: 390, w: 520, h: 100, fontSize: 44, color: YEL, latex: '\\text{luz} \\propto D^2' }),
        text('Captación: el doble de diámetro recoge cuatro veces más luz.', 80, 500, 520, 70, { fontSize: 22, color: DIM }),
        tableBlock({ x: 660, y: 160, w: 540, h: 330, fontSize: 21, header: true, stroke: '#6f93bf', headBg: '#174f86', headFg: YEL, colW: [5, 3, 5], fontFamily: FF.mono,
          rows: [['Instrumento', 'D (cm)', 'Luz × ojo'], ['Ojo humano', '0,7', '=REDONDEAR(B2^2/0,49;0)'], ['Prismáticos', '5', '=REDONDEAR(B3^2/0,49;0)'], ['Hubble', '240', '=REDONDEAR(B4^2/0,49;0)'], ['Webb', '650', '=REDONDEAR(B5^2/0,49;0)'], ['ELT (en obras)', '3.900', '=REDONDEAR(B6^2/0,49;0)']] }),
        text('La última columna son fórmulas: D² / 0,7²', 660, 505, 540, 34, { fontFamily: FF.mono, fontSize: 16, color: DIM })],
        notes: 'La tabla calcula con fórmulas cuántas veces más luz recoge cada instrumento que la pupila de un ojo adaptado a la oscuridad (7 mm). λ es la longitud de onda.' },
      { layout: 'blank', bg: BP, autoAnimate: true, extra: [
        ...head('Un telescopio para cada luz', '04'),
        img(SPEC, 80, 560, 1120, 70, 'El espectro electromagnético: radio, microondas, infrarrojo, visible, ultravioleta, rayos X y gamma'),
        label('← ondas largas', 80, 640, 300), label('ondas cortas →', 900, 640, 300, { textAlign: 'right' }),
        webb(290, 170, 340, 330, { view: 'front', autoRotate: false, arrive: 'turn' }),
        withAnims(N('hubble-space-telescope-a', 620, 190, 220, 300, { view: 'side', spin: 20 }), A('fade-up', { duration: 500 })),
        withAnims(N('chandra-x-ray-observatory', 860, 210, 300, 280, { view: 'three', spin: 20 }), A('fade-up', { start: 'afterPrev', duration: 500 })),
        ink([[460, 500], [460, 556]], LN, 2), ink([[730, 500], [720, 556]], LN, 2), ink([[1010, 500], [930, 556]], LN, 2),
        label('Webb: infrarrojo', 360, 140, 220, { textAlign: 'center', color: YEL }), label('Hubble: visible y UV', 620, 140, 240, { textAlign: 'center', color: YEL }), label('Chandra: rayos X', 900, 140, 240, { textAlign: 'center', color: YEL })],
        notes: 'Transformar: el Webb llega desde la portada dando una vuelta. Clic: Hubble y luego Chandra (modelos 3D de la NASA). Los rayos X no atraviesan la atmósfera: hay que observarlos desde el espacio.' },
      { layout: 'blank', bg: BP, transition: 'fade', extra: [
        ...head('El espejo del Webb', '05'),
        ...HEX.map(([q, r], i) => withAnims(shape('hexagon', Math.round(MX + SZ * 1.5 * q - SZ), Math.round(MY + SZ * Math.sqrt(3) * (r + q / 2) - SZ * 0.87), SZ * 2 - 6, Math.round(SZ * 1.74) - 6, GOLD,
          { fill2: '#fff1b8', gradType: 'radial', stroke: '#8a5a00', strokeWidth: 1 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 160, ...(i === 17 && { sound: 'chime' }) }))),
        shape('ellipse', MX - 14, MY - 14, 28, 28, BP, { stroke: LN, strokeWidth: 2 }),
        ink([[MX - 5 * SZ / 2 - 25, 648], [MX + 5 * SZ / 2 + 25, 648]], LN, 2), label('6,5 m', MX - 50, 654, 100, { textAlign: 'center', color: LN }),
        ...[['18', 'segmentos hexagonales de berilio'], ['48 g', 'de oro en una capa finísima'], ['−233 °C', 'para que su propio calor no lo ciegue']].map(([n, l], i) =>
          withAnims(stat(n, l, 760, 150 + i * 165, 440, YEL, LN, 54, { fontFamily: H }), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 400 })))],
        notes: 'Clic: los 18 segmentos se montan uno detrás de otro (con un tintineo al final). Cada uno es un hexágono con degradado radial dorado. Luego, tres datos con otro clic. El espejo viajó plegado y se desplegó en el espacio.' },
      { layout: 'blank', bg: BP, extra: [
        ...head('Dónde aparcarlo: el punto L2', '06'),
        sphere(-120, EY, 220, '#fff1b8', '#f39a2b'), label('SOL', 40, EY - 15, 80, { color: BP }),
        ink(arcPts(-120, EY, 760, 760, -22, 22, 30), DIM, 2, { opacity: 70 }),
        sphere(EX, EY, 18, '#9fd3ff', '#1d5f8a'), ring(EX, EY, 62, DIM, { dash: 'dot' }), label('TIERRA', EX - 50, EY + 70, 100, { textAlign: 'center' }),
        shape('star4', LX - 14, EY - 14, 28, 28, YEL), label('L2', LX - 30, EY + 24, 60, { textAlign: 'center', color: YEL }),
        ink([[EX, EY + 120], [LX, EY + 120]], LN, 2), label('1,5 millones de km', EX + 90, EY + 126, 240, { textAlign: 'center', color: LN }),
        withAnims(shape('hexagon', EX - 12, EY - 11, 24, 21, GOLD), path(rel(toL2), { duration: 3000, sound: 'whoosh' })),
        text('En L2 el Sol, la Tierra y la Luna quedan siempre del mismo lado: un solo parasol los tapa a la vez y el telescopio se enfría hasta −233 °C.', 680, 150, 520, 150, { fontSize: 23, color: LN })],
        notes: 'Clic: el Webb viaja de la Tierra a L2 (Trayectoria con sonido). L2 es uno de los puntos de Lagrange, donde la gravedad del Sol y la Tierra se equilibra con la órbita. Distancias no a escala.' },
      { layout: 'blank', bg: BP, transition: 'slide', extra: [
        ...head('Más grandes cada generación', '07'),
        chartBlock({ x: 80, y: 150, w: 760, h: 480, chartType: 'hbar', color: YEL, dataLabels: true, xTitle: 'Diámetro del espejo (m)',
          data: [{ label: 'Galileo (1609)', value: 0.04 }, { label: 'Monte Palomar (1948)', value: 5.1 }, { label: 'Hubble (1990)', value: 2.4 }, { label: 'Keck (1993)', value: 10 }, { label: 'Webb (2021)', value: 6.5 }, { label: 'ELT (en obras)', value: 39 }] }),
        card('<b style="color:#ffd35a">En tierra, más grandes; en el espacio, sin atmósfera.</b><br><br>Los de tierra corrigen el temblor del aire con espejos que se deforman mil veces por segundo: la <i>óptica adaptativa</i>.', 880, 220, 320, 340, '#0a2f54', { fontSize: 22, color: LN, borderColor: '#6f93bf', vAlign: 'middle' })],
        notes: 'Barras horizontales con etiquetas de datos: diámetros aproximados de espejos y lentes. El ELT, en construcción en Chile, tendrá 39 metros.' },
      { layout: 'blank', bg: BP, extra: [pollBlock({ kind: 'label', question: 'Etiqueta las partes de un telescopio newtoniano', image: NEWTON, fontSize: 30, x: 60, y: 40, w: 1160, h: 640,
        options: ['Espejo primario', 'Espejo secundario', 'Ocular', 'Tubo', 'Montura'],
        points: [{ x: 77, y: 42 }, { x: 29, y: 41 }, { x: 28, y: 13 }, { x: 55, y: 30 }, { x: 48, y: 85 }] })],
        notes: 'Actividad «Etiquetar una imagen» desde el móvil. El dibujo es un SVG hecho en la plantilla: la luz entra por la izquierda, rebota en el espejo primario y el secundario la desvía hacia el ocular.' },
      { layout: 'blank', bg: BP, transition: 'zoom', extra: [
        webb(700, 110, 520, 460, { view: 'three', autoRotate: false, motion: 'zoom', edge: 'fade' }),
        text('FIN DEL PLANO', 80, 200, 620, 100, { fontFamily: H, fontSize: 72, fontWeight: 700, color: LN, letterSpacing: 4 }),
        text('Próxima hoja: radiotelescopios e interferometría', 84, 310, 600, 50, { fontSize: 26, color: YEL }),
        tableBlock({ x: 80, y: 430, w: 520, h: 150, fontSize: 18, fontFamily: FF.mono, stroke: LN, colW: [2, 5], cellPad: [6, 12, 6, 12],
          rows: [['HOJAS', '9 de 9'], ['REVISADO', 'Departamento de Física'], ['ESTADO', 'Aprobado para clase']] }),
        text(NASA_CREDIT, 80, 610, 600, 30, { fontSize: 15, color: DIM })],
        notes: 'Cierre con el mismo cajetín de la portada. El Webb se acerca al llegar (Modelo 3D ▸ Al llegar: Acercar).' },
    ]), LN));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · The Moon as an old lunar atlas: cream plates with double rules, sepia ink, engraved drawings and Cormorant Garamond.
  sci_astro_moon: { name: 'Selenografía: la Luna', cat: 'sci', summary: 'Atlas antiguo en sepia: Luna grabada en SVG, fases en cadena, giro síncrono, mareas, módulo lunar 3D con Transformar y emparejar', make: () => {
    const PAPER = '#efe6d2', SEPIA = '#4a3b2a', RUST = '#8b3a1e', FADED = '#8a7a62', C = FF.cormorant, LM = uid();
    // The engraved Moon: maria, craters with their rims, and hatching on the shadow side.
    const moonSVG = (shadow = true) => { const r = rng(17), craters = Array.from({ length: 34 }, () => [60 + r() * 280, 60 + r() * 280, 3 + r() * 13]).filter(([x, y, s]) => Math.hypot(x - 200, y - 200) < 180 - s);
      return svgURL(400, 400, `<defs><clipPath id="m"><circle cx="200" cy="200" r="190"/></clipPath><pattern id="h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke="${SEPIA}" stroke-width="1.4"/></pattern></defs>`
        + `<circle cx="200" cy="200" r="190" fill="#e9dfc8" stroke="${SEPIA}" stroke-width="3"/><g clip-path="url(#m)">`
        + [[150, 130, 60, 45], [235, 165, 55, 40], [190, 215, 45, 30], [120, 220, 40, 55], [265, 230, 30, 25], [215, 110, 35, 22]].map(([x, y, a, b]) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="#cbbd9f" opacity="0.85"/>`).join('')
        + craters.map(([x, y, s]) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#ddd1b6" stroke="${SEPIA}" stroke-width="1.2"/><path d="M${(x - s * 0.7).toFixed(0)} ${(y + s * 0.4).toFixed(0)} a${s.toFixed(1)} ${s.toFixed(1)} 0 0 0 ${(s * 1.4).toFixed(0)} 0" fill="none" stroke="${SEPIA}" stroke-width="1"/>`).join('')
        + `<circle cx="210" cy="300" r="20" fill="#f3ead6" stroke="${SEPIA}" stroke-width="1.5"/>` + Array.from({ length: 10 }, (_, i) => { const a = i * 36 * Math.PI / 180; return `<line x1="${210 + 22 * Math.cos(a)}" y1="${300 + 22 * Math.sin(a)}" x2="${210 + 70 * Math.cos(a)}" y2="${300 + 70 * Math.sin(a)}" stroke="#f6efe0" stroke-width="2"/>`; }).join('')
        + (shadow ? `<path d="M200 10 A190 190 0 0 0 200 390 A120 190 0 0 1 200 10Z" fill="url(#h)" opacity="0.55"/>` : '') + `</g><circle cx="200" cy="200" r="196" fill="none" stroke="${SEPIA}" stroke-width="1"/>`); };
    // A phase (p: 0 new, 0.5 full; waxing lit on the right, as seen from the northern hemisphere).
    const phaseSVG = p => { const lit = '#efe2c0', dark = '#3a3026', rx = Math.abs(Math.cos(2 * Math.PI * p)) * 90, wax = p < 0.5, gib = p > 0.25 && p < 0.75;
      return svgURL(200, 200, `<circle cx="100" cy="100" r="90" fill="${dark}"/>` + (p === 0 ? '' : `<path d="M100 10 A90 90 0 0 ${wax ? 1 : 0} 100 190Z" fill="${lit}"/><ellipse cx="100" cy="100" rx="${rx.toFixed(1)}" ry="90" fill="${gib ? lit : dark}"/>`)
        + `<circle cx="100" cy="100" r="90" fill="none" stroke="${SEPIA}" stroke-width="3"/>`); };
    const PHASES = [['Luna nueva', 0], ['Creciente', 0.125], ['Cuarto creciente', 0.25], ['Gibosa creciente', 0.375], ['Luna llena', 0.5], ['Gibosa menguante', 0.625], ['Cuarto menguante', 0.75], ['Menguante', 0.875]];
    // The Moon with a red mark on the side that faces the Earth (for the synchronous turn).
    const MARKED = svgURL(100, 100, `<circle cx="50" cy="50" r="46" fill="#e9dfc8" stroke="${SEPIA}" stroke-width="3"/><circle cx="38" cy="40" r="8" fill="#cbbd9f"/><circle cx="60" cy="62" r="6" fill="#cbbd9f"/><path d="M4 50 L22 38 L22 62Z" fill="${RUST}"/>`);
    const frame = [shape('rect', 40, 40, 1200, 640, 'none', { stroke: SEPIA, strokeWidth: 3 }), shape('rect', 52, 52, 1176, 616, 'none', { stroke: SEPIA, strokeWidth: 1 })];
    const plate = (n, t) => [text(`LÁMINA ${n}`, 80, 74, 300, 30, { fontFamily: C, fontSize: 20, letterSpacing: 6, color: RUST }), text(t, 80, 100, 1120, 70, { fontFamily: C, fontSize: 52, fontWeight: 600, fontStyle: 'italic', color: SEPIA })];
    const lm = (x, y, w, h, props) => ({ ...N('apollo-lunar-module', x, y, w, h, props), id: LM });
    const EX = 420, EY = 410, OR = 210, orbit = arcPts(EX, EY, OR, OR, 0, 360, 48);
    return numbered(withFg(build({ name: 'Selenografía', palette: 'paper', fonts: 'classic', title: { color: SEPIA, font: C }, body: { color: SEPIA }, decor: () => frame }, [
      { layout: 'blank', bg: PAPER, transition: 'fade', transitionSpeed: 'slow', extra: [
        text('ATLAS LUNAR · LÁMINA I', 90, 150, 560, 34, { fontFamily: C, fontSize: 22, letterSpacing: 8, color: RUST }),
        text('Selenografía', 84, 190, 640, 150, { fontFamily: C, fontSize: 120, fontStyle: 'italic', fontWeight: 600, color: SEPIA, lineHeight: 1 }),
        shape('rect', 90, 350, 420, 2, SEPIA), shape('rect', 90, 358, 420, 1, SEPIA),
        text('La Luna, cara a cara: fases, mareas, exploración y lo que aún no sabemos de nuestra vecina.', 90, 380, 520, 120, { fontFamily: C, fontSize: 30, color: SEPIA, lineHeight: 1.3 }),
        text('Curso de astronomía general · Tema 3', 90, 560, 520, 34, { fontFamily: C, fontSize: 22, color: FADED, fontStyle: 'italic' }),
        withAnims(img(moonSVG(), 700, 110, 480, 480, 'Grabado de la Luna con sus mares y cráteres'), A('fade-in', { start: 'afterPrev', duration: 2000 })),
        text('Fig. 1 — La cara visible, con un cráter de rayos al sur', 700, 600, 480, 30, { fontFamily: C, fontSize: 18, fontStyle: 'italic', color: FADED, textAlign: 'center' })],
        notes: 'Portada de atlas antiguo: doble filete en el patrón, letra Cormorant Garamond y la Luna dibujada en SVG con mares, cráteres, rayos y sombra rayada. Aparece sola, despacio.' },
      { layout: 'blank', bg: PAPER, extra: [
        ...plate('II', 'Las fases'),
        withAnims(text('luz del Sol  →', 80, 200, 300, 34, { fontFamily: C, fontSize: 24, fontStyle: 'italic', color: RUST }), A('fade-in', { duration: 400 })),
        ...PHASES.map(([n, p], i) => [withAnims(img(phaseSVG(p), 92 + i * 140, 250, 116, 116, n), A('fade-in', { start: 'afterPrev', duration: 350 })),
          withAnims(text(n, 82 + i * 140, 376, 136, 60, { fontFamily: C, fontSize: 20, fontStyle: 'italic', textAlign: 'center', color: SEPIA, lineHeight: 1.1 }), A('fade-in', { start: 'withPrev', duration: 350 }))]).flat(),
        shape('rect', 92, 470, 1096, 1, FADED),
        withAnims(text('<b>29,5 días</b> separan dos lunas llenas (mes sinódico). La Luna no cambia de forma: vemos siempre la mitad iluminada por el Sol, pero desde un ángulo distinto.', 92, 495, 1096, 110, { fontFamily: C, fontSize: 28, color: SEPIA, textAlign: 'center' }), A('fade-up'))],
        notes: 'Clic: las ocho fases aparecen en cadena, de luna nueva a menguante (vistas desde el hemisferio norte). Cada fase es un pequeño SVG calculado en la plantilla. Otro clic: la explicación.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'match', question: 'Une cada fase con lo que se ve desde el hemisferio norte', fontSize: 32, x: 70, y: 70, w: 1140, h: 580,
        options: ['Luna nueva = No se ve', 'Cuarto creciente = Luz a la derecha', 'Luna llena = Disco completo', 'Cuarto menguante = Luz a la izquierda', 'Creciente = Fina hoz al anochecer'] })],
        notes: 'Actividad «Unir parejas» desde el móvil, justo después de ver las fases, para fijarlas. En el hemisferio sur se ve al revés: el creciente tiene iluminada la parte izquierda.' },
      { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
        ...plate('III', 'Siempre la misma cara'),
        ring(EX, EY, OR, FADED, { dash: 'dash', strokeWidth: 1.5 }),
        sphere(EX, EY, 46, '#9fc1d9', '#2e5c7a', { stroke: SEPIA, strokeWidth: 2 }), text('Tierra', EX - 60, EY + 52, 120, 30, { fontFamily: C, fontSize: 20, fontStyle: 'italic', textAlign: 'center', color: SEPIA }),
        withAnims(img(MARKED, EX + OR - 34, EY - 34, 68, 68, 'La Luna con una marca roja en la cara que mira a la Tierra'), path(rel(orbit), { duration: 6000, turn: 'follow' })),
        text('La Luna tarda lo mismo en girar sobre sí misma que en dar una vuelta a la Tierra: <b>27,3 días</b>. Por eso la marca roja mira siempre hacia nosotros.', 720, 200, 470, 200, { fontFamily: C, fontSize: 28, color: SEPIA, lineHeight: 1.3 }),
        card('<i>Rotación síncrona:</i> las mareas que la Tierra levanta en la Luna frenaron su giro hasta acoplarlo. Le pasa a casi todas las lunas grandes.', 720, 440, 470, 160, '#e6dabf', { fontFamily: C, fontSize: 24, color: SEPIA, borderColor: '#c9b48f', radius: 4 })],
        notes: 'Clic: la Luna da una vuelta completa con la opción de trayectoria «Girar con el camino»: gira sobre sí misma a la vez, y la marca roja nunca deja de mirar a la Tierra.' },
      { layout: 'blank', bg: PAPER, extra: [
        ...plate('IV', 'Las mareas y un día que se alarga'),
        shape('ellipse', 110, 290, 340, 230, '#7aa7c2', { opacity: 45, stroke: '#2e5c7a', strokeWidth: 1.5, dash: 'dash' }),
        sphere(280, 405, 80, '#9fc1d9', '#2e5c7a', { stroke: SEPIA, strokeWidth: 2 }),
        img(moonSVG(false), 520, 375, 60, 60, 'La Luna'), arrowAt(495, 405, 50, 0, RUST, 3),
        text('Pleamar', 90, 395, 100, 30, { fontFamily: C, fontSize: 18, fontStyle: 'italic', color: '#2e5c7a' }), text('Pleamar', 400, 440, 100, 30, { fontFamily: C, fontSize: 18, fontStyle: 'italic', color: '#2e5c7a' }),
        text('Dos abultamientos de agua, uno hacia la Luna y otro al lado contrario: dos pleamares al día. El roce de las mareas frena la Tierra y aleja la Luna <b>3,8 cm cada año</b>.', 90, 540, 520, 120, { fontFamily: C, fontSize: 22, color: SEPIA }),
        chartBlock({ x: 640, y: 190, w: 530, h: 400, chartType: 'line', color: RUST, grid: true, dataLabels: true, yMin: 16, yMax: 25, yTitle: 'Horas que dura un día',
          data: [['−1.400', 18.7], ['−900', 20], ['−620', 21.9], ['−400', 22], ['−100', 23.5], ['Hoy', 24]].map(([label, value]) => ({ label, value })) }),
        text('Millones de años. Cifras aproximadas, de anillos de crecimiento en corales fósiles y sedimentos.', 640, 600, 560, 60, { fontFamily: C, fontSize: 18, fontStyle: 'italic', color: FADED })],
        notes: 'El dibujo exagera los abultamientos de agua (elipse con trazo discontinuo). El gráfico de líneas muestra cómo se ha alargado el día; los valores son aproximados.' },
      { layout: 'blank', bg: PAPER, transition: 'page', extra: [
        ...plate('V', 'Crónica de la exploración'),
        dg('timeline', '1959\n  Primera sonda que la alcanza\n1966\n  Primer alunizaje suave\n1969\n  Primeros pasos humanos\n1972\n  Última misión tripulada\n2009\n  Mapa completo desde órbita\n2019\n  Primera nave en la cara oculta', 80, 200, 1120, 400, { colors: 'outline', oneByOne: true })],
        notes: 'Cronología uno a uno con el estilo «Contorno», que encaja con el aspecto de grabado. Transición «Página», como al pasar una lámina.' },
      { layout: 'blank', bg: PAPER, autoAnimate: true, extra: [
        ...plate('VI', 'Un vehículo de patas largas'),
        lm(620, 150, 560, 500, { view: 'three', spin: 14, edge: 'fade' }),
        ...[['6', 'alunizajes tripulados'], ['12', 'personas caminaron por ella'], ['382 kg', 'de rocas traídas a la Tierra']].map(([n, l], i) =>
          withAnims(text(`<span style="font-family:${C};font-size:64px;font-style:italic;color:${RUST}">${n}</span>  ${l}`, 90, 200 + i * 120, 520, 100, { fontFamily: C, fontSize: 28, color: SEPIA }), A('fade-right', { start: i ? 'afterPrev' : 'click' }))),
        text('Fig. 6 — Módulo lunar del programa Apolo', 620, 620, 560, 30, { fontFamily: C, fontSize: 18, fontStyle: 'italic', color: FADED, textAlign: 'center' })],
        notes: 'Módulo lunar 3D de la NASA girando despacio. Clic: tres cifras, una detrás de otra. La etapa de descenso, con las patas, se quedó en la Luna; la de ascenso volvió a la órbita.' },
      { layout: 'blank', bg: PAPER, autoAnimate: true, extra: [
        ...plate('VII', 'Ficha de la Luna'),
        lm(80, 190, 300, 300, { view: 'front', autoRotate: false, arrive: 'turn' }),
        N('lunar-reconnaissance-orbiter-a', 80, 470, 300, 190, { view: 'side', spin: 20 }),
        tableBlock({ x: 440, y: 200, w: 760, h: 400, fontSize: 24, fontFamily: C, lines: true, stroke: SEPIA, firstCol: true, colW: [4, 5],
          rows: [['Diámetro', '3.474 km (un 27 % del terrestre)'], ['Distancia media', '384.400 km'], ['Gravedad', '1,62 m/s² (la sexta parte)'], ['Temperatura', 'de −173 °C a 127 °C'], ['Un día lunar', '29,5 días terrestres'], ['Agua', 'hielo en cráteres del polo sur']] })],
        notes: 'Transformar: el módulo lunar encoge y se coloca arriba a la izquierda dando una vuelta. Debajo, el orbitador que cartografió la Luna (modelos 3D de la NASA). La tabla tiene solo líneas horizontales y la primera columna en negrita.' },
      { layout: 'blank', bg: PAPER, transition: 'fade', transitionSpeed: 'slow', extra: [
        img(phaseSVG(0.875), 540, 110, 200, 200, 'Luna menguante'),
        text('«Es el único paisaje de otro mundo que podemos mirar a simple vista, cada noche, desde la ventana.»', 190, 340, 900, 150, { fontFamily: C, fontSize: 40, fontStyle: 'italic', textAlign: 'center', color: SEPIA, lineHeight: 1.25 }),
        text('FIN DEL ATLAS · Próximo tema: los eclipses', 190, 520, 900, 40, { fontFamily: C, fontSize: 22, letterSpacing: 5, textAlign: 'center', color: RUST }),
        text(NASA_CREDIT, 190, 610, 900, 30, { fontFamily: C, fontSize: 16, textAlign: 'center', color: FADED })],
        notes: 'Cierre sobrio de lámina final. Propón observar la Luna esta semana y dibujar su fase cada noche.' },
    ]), SEPIA));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · Comets, asteroids and planetary defence as a crisis-room drill: black, hazard stripes, Bebas Neue and monospace readouts.
  sci_astro_defense: { name: 'Defensa planetaria: simulacro', cat: 'sci', summary: 'Sala de crisis: franjas de peligro, asteroide 3D, escala de Turín en cadena, desvío animado con sonido, cuenta atrás y votación de equipos', make: () => {
    const BG = '#0d0d0d', YEL = '#ffcc00', RED = '#ff3b30', FG = '#f2f2f2', DIM = '#9a9a9a', GRN = '#3ddc84', H = pairStacks('bold').heading, M = FF.mono;
    const stripes = y => [shape('rect', 0, y, 1280, 22, '#111111'), ...Array.from({ length: 23 }, (_, i) => shape('parallelogram', -40 + i * 60, y, 44, 22, YEL))];
    const head = (t, sub) => [text(t, 80, 50, 1120, 70, { fontFamily: H, fontSize: 60, color: FG, letterSpacing: 2 }), text(sub, 80, 118, 1120, 30, { fontFamily: M, fontSize: 16, color: YEL, letterSpacing: 2 })];
    const readout = (t, x, y, w, color = GRN, props = {}) => text(t, x, y, w, 30, { fontFamily: M, fontSize: 17, color, ...props });
    // A comet (nucleus, coma, a straight blue ion tail and a curved dust tail) and an asteroid.
    const COMET = svgURL(520, 300, `<defs><radialGradient id="c"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#d8f3ff"/><stop offset="1" stop-color="#d8f3ff" stop-opacity="0"/></radialGradient>`
      + `<linearGradient id="i" x1="1" x2="0"><stop offset="0" stop-color="#6fc3ff" stop-opacity=".9"/><stop offset="1" stop-color="#6fc3ff" stop-opacity="0"/></linearGradient><linearGradient id="d" x1="1" x2="0"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".8"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></linearGradient></defs>`
      + `<path d="M420 150 L20 120 L20 150Z" fill="url(#i)"/><path d="M420 160 Q220 200 30 280 L60 290 Q240 220 420 168Z" fill="url(#d)"/><circle cx="430" cy="155" r="60" fill="url(#c)"/><circle cx="430" cy="155" r="7" fill="#5a4a3a"/>`);
    const ROCK = svgURL(300, 300, `<path d="M70 120 Q90 50 170 60 Q250 70 255 140 Q265 220 190 245 Q110 270 70 210 Q40 170 70 120Z" fill="#6d6257" stroke="#9a8d7f" stroke-width="3"/>`
      + `<circle cx="140" cy="120" r="18" fill="#574d44"/><circle cx="200" cy="180" r="12" fill="#574d44"/><circle cx="120" cy="200" r="9" fill="#574d44"/>`);
    // Where they come from: distance from the Sun on a logarithmic ruler (AU).
    const lx = d => Math.round(160 + (Math.log10(d) + 0.5) * 175);
    const cloud = (d0, d1, n, seed, color, y0 = 300, h = 120) => { const r = rng(seed); return Array.from({ length: n }, () => { const x = lx(10 ** (Math.log10(d0) + r() * (Math.log10(d1) - Math.log10(d0)))); return shape('ellipse', x, Math.round(y0 + r() * h), 5, 5, color, { opacity: 50 + Math.round(r() * 50) }); }); };
    const zone = (els, label, sub, x, color, ly = 450) => [...els.map((e, i) => withAnims(e, A('fade-in', { start: i ? 'withPrev' : 'click', duration: 400 }))),
      withAnims(text(`<b style="color:${color}">${label}</b><br>${sub}`, x - 110, ly, 220, 90, { fontSize: 18, color: DIM, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 400 }))];
    // The Torino scale.
    const TORINO = [['#ffffff', 0], ['#3ddc84', 1], ['#ffe14d', 2], ['#ffe14d', 3], ['#ffe14d', 4], ['#ff9f1c', 5], ['#ff9f1c', 6], ['#ff9f1c', 7], ['#ff3b30', 8], ['#ff3b30', 9], ['#ff3b30', 10]];
    const TGROUPS = [[0, 0, 'Nulo'], [1, 1, 'Normal'], [2, 4, 'Merece atención'], [5, 7, 'Amenazante'], [8, 10, 'Choque seguro']];
    // The deflection: the asteroid's path towards the Earth and the impactor that nudges it.
    const AX = 520, AY = 330;
    return numbered(withFg(build({ name: 'Defensa planetaria', palette: 'midnight', fonts: 'bold', title: { color: FG, font: H }, body: { color: FG }, decor: () => [...stripes(0), ...stripes(698)] }, [
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(620, 40, 640, '#4a3a10', BG, 45),
        N('1999-rq36-asteroid', 780, 120, 460, 460, { view: 'three', spin: 10, edge: 'fade' }),
        withAnims(shape('ellipse', 82, 98, 16, 16, RED), A('fade-in-then-out', { start: 'afterPrev', duration: 1600 })),
        readout('SIMULACRO · NIVEL 3 · 01/10/2026 21:40 UTC', 110, 92, 600, RED),
        text('ALERTA:<br>OBJETO CERCANO', 76, 150, 700, 250, { fontFamily: H, fontSize: 104, color: FG, lineHeight: 0.98 }),
        text('Cometas, asteroides y cómo evitar que uno nos golpee', 80, 430, 600, 80, { fontSize: 30, color: YEL }),
        readout('> objeto: 2026‑XK (ficticio) · diámetro estimado: 340 m', 80, 560, 640),
        readout('> distancia: 7,4 millones de km · velocidad: 12,6 km/s', 80, 592, 680)],
        notes: 'Portada de simulacro: franjas de peligro en el patrón, un asteroide 3D de la NASA (Bennu) que gira y un piloto rojo que parpadea al llegar. El objeto 2026-XK y sus datos son inventados.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('Dos sospechosos', 'FICHA 01 · IDENTIFICACIÓN'),
        withAnims(shape('rect', 80, 170, 540, 500, '#161616', { stroke: '#2a2a2a', strokeWidth: 2 }), A('fade-right', { duration: 400 })),
        withAnims(img(COMET, 100, 190, 500, 280, 'Cometa con su núcleo, su coma, la cola de iones y la cola de polvo'), A('fade-in', { start: 'withPrev', duration: 400 })),
        withAnims(text(`<b style="font-family:${H};font-size:40px;color:#6fc3ff">COMETA</b><br>Hielo y polvo. Viene de lejos; cerca del Sol se evapora y despliega dos colas que apuntan en contra del Sol.`, 110, 470, 480, 190, { fontSize: 21, color: FG }), A('fade-in', { start: 'withPrev', duration: 400 })),
        withAnims(shape('rect', 660, 170, 540, 500, '#161616', { stroke: '#2a2a2a', strokeWidth: 2 }), A('fade-left', { duration: 400 })),
        withAnims(img(ROCK, 790, 190, 280, 280, 'Asteroide rocoso con cráteres'), A('fade-in', { start: 'withPrev', duration: 400 })),
        withAnims(text(`<b style="font-family:${H};font-size:40px;color:#c9a27a">ASTEROIDE</b><br>Roca o metal, sin colas. La mayoría orbita entre Marte y Júpiter; unos pocos cruzan la órbita de la Tierra.`, 690, 470, 480, 190, { fontSize: 21, color: FG }), A('fade-in', { start: 'withPrev', duration: 400 }))],
        notes: 'Dos fichas que entran con un clic cada una. El cometa es un SVG con degradados: la cola de iones (azul) es recta y la de polvo (amarilla) se curva.' },
      { layout: 'blank', bg: BG, transition: 'push', extra: [
        ...head('¿De dónde vienen?', 'FICHA 02 · DISTANCIA AL SOL EN UNIDADES ASTRONÓMICAS (ESCALA LOGARÍTMICA)'),
        sphere(lx(0.4), 360, 26, '#fff1b8', '#f39a2b'),
        shape('rect', 120, 600, 1040, 2, '#3a3a3a'),
        ...[[1, '1'], [10, '10'], [100, '100'], [1000, '1.000'], [10000, '10.000'], [100000, '100.000']].map(([d, l]) => [shape('rect', lx(d), 592, 2, 18, DIM), readout(l, lx(d) - 50, 616, 100, DIM, { textAlign: 'center', fontSize: 15 })]).flat(),
        sphere(lx(1), 360, 9, '#9fd3ff', '#1d5f8a'), readout('Tierra', lx(1) - 40, 380, 80, DIM, { textAlign: 'center', fontSize: 14 }),
        sphere(lx(5.2), 360, 16, '#f2d1a8', '#a8692c'), readout('Júpiter', lx(5.2) - 22, 384, 90, DIM, { fontSize: 14 }),
        ...zone(cloud(2.2, 3.3, 30, 3, '#c9a27a', 300, 120), 'Cinturón de asteroides', 'millones de rocas', lx(2.7), '#c9a27a'),
        ...zone(cloud(30, 50, 26, 5, '#8fd3ff', 300, 120), 'Cinturón de Kuiper', 'cometas de periodo corto', lx(40), '#8fd3ff', 200),
        ...zone(cloud(2000, 100000, 60, 9, '#d8f3ff', 220, 200), 'Nube de Oort', 'cometas de periodo largo', lx(15000), '#d8f3ff')],
        notes: 'Regla logarítmica: cada marca es diez veces más lejos que la anterior. Tres clics: el cinturón de asteroides, el de Kuiper y la nube de Oort, de donde llegan los cometas que tardan miles de años en volver.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('La escala de Turín', 'FICHA 03 · RIESGO = PROBABILIDAD DE CHOQUE × ENERGÍA DEL IMPACTO'),
        ...TGROUPS.map(([a, b, l], g) => [...TORINO.slice(a, b + 1).map(([c, n], k) => withAnims(text(String(n), 90 + (a + k) * 100, 220, 90, 120, { fontFamily: H, fontSize: 64, color: '#0d0d0d', bg: c, textAlign: 'center', vAlign: 'middle', radius: 4 }),
            A('zoom-in', { start: g === 0 && k === 0 ? 'afterPrev' : k ? 'withPrev' : 'afterPrev', duration: 300, ...(g === 4 && !k && { sound: 'drumroll' }) }))),
          withAnims(text(l, 90 + a * 100, 350, (b - a + 1) * 100 - 10, 40, { fontSize: 19, color: TORINO[a][0], textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 300 }))]).flat(),
        shape('rect', 90, 440, 1090, 170, '#161616', { stroke: '#2a2a2a', strokeWidth: 2 }),
        readout('> 2026‑XK · TURÍN 1 · probabilidad de choque: 1 entre 48.000', 120, 465, 1040, YEL, { fontSize: 20 }),
        text('Casi todos los objetos nuevos empiezan en 1 y bajan a 0 en cuanto se observan más noches: la órbita se conoce mejor y la incertidumbre se encoge.', 120, 510, 1040, 90, { fontSize: 22, color: FG })],
        notes: 'Las once casillas entran solas por grupos de color, con un redoble al llegar a las rojas. Ningún objeto conocido ha pasado nunca del nivel 4. El 2026-XK es ficticio.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...head('¿Cada cuánto cae uno?', 'FICHA 04 · TAMAÑO DEL OBJETO Y FRECUENCIA MEDIA DE IMPACTO'),
        ...[['1 m', 'cada 2 semanas', 'una estrella fugaz brillante', 12], ['20 m', 'cada 50 años', 'rompe cristales en una ciudad', 26], ['50 m', 'cada 1.000 años', 'arrasa un bosque entero', 42],
          ['140 m', 'cada 20.000 años', 'destruye una región', 66], ['1 km', 'cada 500.000 años', 'efectos en todo el planeta', 104], ['10 km', 'cada 100 millones de años', 'extinción masiva', 150]].map(([s, f, e, d], i) => {
          const cx = 150 + i * 190;
          return [withAnims(shape('ellipse', cx - d / 2, 330 - d / 2, d, d, '#6d6257', { fill2: '#2a2520', gradType: 'radial', stroke: i > 3 ? RED : '#9a8d7f', strokeWidth: 2 }), A('grow', { start: i ? 'afterPrev' : 'click', duration: 400 })),
            withAnims(text(`<div style="font-family:${H};font-size:44px;color:${i > 3 ? RED : FG}">${s}</div><div style="color:${YEL}">${f}</div><div style="color:${DIM};font-size:16px">${e}</div>`, cx - 90, 430, 180, 160, { fontSize: 18, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 400 }))]; }).flat(),
        readout('Frecuencias medias aproximadas.', 80, 630, 600, DIM, { fontSize: 15 })],
        notes: 'Un clic: los seis tamaños aparecen en cadena, del más pequeño al más grande. Cuanto mayor es el objeto, más raro: los de 20 m caen unas pocas veces por siglo; los de 10 km, como el de los dinosaurios, cada cien millones de años.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('Plan A: darle un empujón', 'FICHA 05 · IMPACTOR CINÉTICO'),
        sphere(1120, 560, 44, '#9fd3ff', '#1d5f8a'), readout('Tierra', 1080, 612, 80, DIM, { textAlign: 'center', fontSize: 14 }),
        withAnims(ink([[AX, AY], [800, 440], [1100, 545]], RED, 3, { dash: 'dash' }), A('semi-fade-out', { start: 'click', delay: 2300, duration: 600 })),
        withAnims(ink([[AX, AY], [800, 400], [1180, 420]], GRN, 3), A('draw', { start: 'withPrev', delay: 2400, duration: 1800 })),
        withAnims(img(ROCK, AX - 45, AY - 45, 90, 90, 'Asteroide'), A('spin360', { start: 'withPrev', delay: 2000, duration: 700, sound: 'pop' })),
        withAnims(shape('triangle', 160, 170, 26, 22, YEL, { rotation: 125 }), path([[180, 80], [340, 145]], { start: 'withPrev', duration: 2000, turn: 'follow', sound: 'whoosh' })),
        mathBlock({ x: 80, y: 430, w: 420, h: 110, fontSize: 40, color: FG, latex: '\\Delta v \\approx \\beta\\,\\frac{m\\,v}{M}' }),
        text('Una nave de media tonelada a 6 km/s cambia muy poco la velocidad… pero con años de aviso basta para fallar por miles de km. Así se desvió una pequeña luna de asteroide en 2022.', 80, 550, 560, 130, { fontSize: 20, color: FG })],
        notes: 'Un clic encadena todo: la nave viaja hacia el asteroide (Trayectoria con sonido), el asteroide gira al recibir el golpe, la ruta roja de choque se atenúa y se dibuja la nueva ruta verde. β mide cuánto empuje extra da el material expulsado.' },
      { layout: 'blank', bg: BG, transition: 'slide', extra: [
        ...head('Traer un trozo a casa', 'FICHA 06 · MISIÓN DE RETORNO DE MUESTRAS'),
        N('osiris-rex', 60, 170, 520, 470, { view: 'three', spin: 16, edge: 'fade' }),
        N('1999-rq36-asteroid', 1000, 150, 200, 200, { view: 'front', spin: 30 }),
        ...[['121 g', 'de polvo y piedras traídas en 2023'], ['7 años', 'de viaje de ida y vuelta'], ['4.500', 'millones de años: tan viejas como el sistema solar']].map(([n, l], i) =>
          withAnims(stat(`<span style="font-family:${H}">${n}</span>`, l, 620, 220 + i * 140, 360, i ? FG : YEL, DIM, 52), A('fade-left', { start: i ? 'afterPrev' : 'click' }))),
        readout('Conocer su composición y su densidad dice cómo empujarlo.', 620, 640, 600, GRN, { fontSize: 15 })],
        notes: 'Dos modelos 3D de la NASA: la sonda que tocó el asteroide y el propio asteroide Bennu girando. Cifras redondeadas de la misión.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('Ejercicio: elegid un plan', 'FICHA 07 · EQUIPOS DE 4 · TENÉIS 5 MINUTOS'),
        ...[['A', 'Impactor cinético', 'Necesita unos 5 años de aviso. Barato y probado.', YEL], ['B', 'Tractor gravitatorio', 'Una nave vuela junto a él y lo arrastra con su gravedad. Necesita más de 15 años.', '#8fd3ff'],
          ['C', 'Evacuar la zona', 'Si es pequeño y queda poco tiempo: avisar y alejar a la población.', RED]].map(([k, h, d, c], i) =>
          card(`<span style="font-family:${H};font-size:54px;color:${c}">${k}</span><br><b style="font-size:26px">${h}</b><br><span style="color:${DIM}">${d}</span>`, 80 + i * 260, 190, 240, 400, '#161616', { fontSize: 21, color: FG, borderColor: c, radius: 4 })),
        timer(300, 900, 240, 300, { style: 'digital', color: YEL, h: 140, auto: false, endText: '¡VOTAD!' }),
        readout('Dato: el objeto mide 340 m y llegará dentro de 9 años.', 860, 420, 360, GRN, { fontSize: 16, h: 60 })],
        notes: 'Cuenta atrás digital de 5 minutos: se pone en marcha con un clic. Cada equipo debate con el dato del objeto. Con 9 años de aviso, el impactor cinético es la opción razonable.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', question: '¿Qué plan elige vuestro equipo para 2026‑XK?', options: ['A · Impactor cinético', 'B · Tractor gravitatorio', 'C · Evacuar la zona'], display: 'bar', fontSize: 38, x: 70, y: 70, w: 1140, h: 580 })],
        notes: 'Votación en directo con el móvil: un voto por equipo. Comentad por qué el tractor gravitatorio no llega a tiempo.' },
      { layout: 'blank', bg: BG, transition: 'zoom', extra: [
        glow(340, 60, 600, '#0f3a22', BG, 50),
        text('FIN DEL SIMULACRO', 90, 200, 1100, 140, { fontFamily: H, fontSize: 130, color: FG, textAlign: 'center', letterSpacing: 4 }),
        withAnims(text('> 2026‑XK: TURÍN 0 · AMENAZA DESCARTADA', 90, 360, 1100, 40, { fontFamily: M, fontSize: 26, color: GRN, textAlign: 'center' }), A('fade-in', { start: 'afterPrev', delay: 600, duration: 800, sound: 'chime' })),
        text('Cada noche, telescopios de todo el mundo vigilan el cielo para que esto siga siendo solo un simulacro.', 190, 440, 900, 80, { fontSize: 24, color: DIM, textAlign: 'center' }),
        text(NASA_CREDIT, 190, 620, 900, 30, { fontSize: 15, color: '#6a6a6a', textAlign: 'center' })],
        notes: 'Cierre: la línea verde aparece sola con un tintineo. Recordad que el objeto 2026-XK es inventado.' },
    ]), FG));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Cosmology as a universe that cools down: each slide darker and colder than the one before, and a thermometer on
  // the right whose mark slides down from slide to slide (Transform).
  sci_astro_cosmology: { name: 'Del Big Bang a hoy', cat: 'sci', summary: 'Un universo que se enfría: termómetro con Transformar, cronología en cadena, fondo cósmico, dispersión, dona y calendario con fórmulas', make: () => {
    const H = pairStacks('clean').heading, MK = uid(), LB = uid(), TRK = uid();
    // The thermometer: a track from white-hot to black, a mark at y and its label (the same ids on every slide).
    const thermo = (y, temp, when, fg) => [
      { ...shape('rect', 1216, 90, 8, 540, '#ffffff', { fill2: '#000000', gradAngle: 90, radius: 4, stroke: '#ffffff40', strokeWidth: 1 }), id: TRK },
      { ...shape('ellipse', 1208, y - 12, 24, 24, '#ff5a1f', { stroke: '#ffffff', strokeWidth: 3 }), id: MK },
      { ...text(`<b style="font-size:24px">${temp}</b><br><span style="opacity:.75">${when}</span>`, 1010, y - 26, 190, 60, { fontSize: 15, color: fg, textAlign: 'right', lineHeight: 1.2 }), id: LB }];
    const head = (t, fg, y = 60) => text(t, 80, y, 900, 70, { fontFamily: H, fontSize: 46, fontWeight: 800, color: fg, letterSpacing: -1 });
    // The cosmic microwave background, in an oval (Mollweide-like) map: soft blobs of colder and warmer spots.
    const CMB = (() => { const r = rng(42), cols = ['#1f3cff', '#2fa6ff', '#7fe0ff', '#ffe14d', '#ff9a1f', '#ff3b1f'];
      return svgURL(640, 320, `<defs><clipPath id="o"><ellipse cx="320" cy="160" rx="316" ry="156"/></clipPath><filter id="b"><feGaussianBlur stdDeviation="7"/></filter></defs>`
        + `<ellipse cx="320" cy="160" rx="316" ry="156" fill="#7fbfff"/><g clip-path="url(#o)"><g filter="url(#b)">`
        + Array.from({ length: 420 }, () => `<circle cx="${(r() * 640).toFixed(0)}" cy="${(r() * 320).toFixed(0)}" r="${(6 + r() * 16).toFixed(0)}" fill="${cols[Math.floor(r() * cols.length)]}" opacity="0.8"/>`).join('')
        + `</g></g><ellipse cx="320" cy="160" rx="316" ry="156" fill="none" stroke="#ffffff" stroke-width="2"/>`); })();
    // Galaxies: distance (Mpc) against how fast they move away (km/s), with scatter around Hubble's line.
    const gal = (() => { const r = rng(9); return Array.from({ length: 26 }, () => { const d = 10 + r() * 440; return { label: String(Math.round(d)), value: Math.round(70 * d + (r() - 0.5) * 5000) }; }); })();
    const EPOCHS = [['10⁻³⁶ s', 'Inflación', 'el espacio crece ×10²⁶ en un instante'], ['10⁻⁶ s', 'Protones', 'los quarks se agrupan'], ['1 s', 'Neutrinos', 'escapan y viajan libres'], ['3 min', 'Núcleos', 'se forman hidrógeno y helio'], ['380.000 años', 'Luz libre', 'el universo se vuelve transparente']];
    return numbered(withFg(build({ name: 'Del Big Bang a hoy', palette: 'revela', fonts: 'clean', title: { color: '#ffffff', font: H }, body: { color: '#ffffff' } }, [
      { layout: 'blank', bg: '#fff3d6', transition: 'fade', back: [shape('ellipse', -300, -500, 1500, 1500, '#ffffff', { fill2: '#ffc864', gradType: 'radial' })], extra: [
        text('COSMOLOGÍA · CLASE 12', 90, 170, 600, 34, { fontSize: 18, letterSpacing: 6, color: '#8a4b00' }),
        text('Del Big Bang<br>a hoy', 84, 210, 900, 260, { fontFamily: H, fontSize: 112, fontWeight: 800, color: '#2a1200', lineHeight: 1, letterSpacing: -3 }),
        text('13.800 millones de años en una clase. Empezamos a más de un billón de billones de grados.', 90, 480, 760, 90, { fontSize: 28, color: '#5a3200' }),
        ...thermo(110, '10³² K', 't = 10⁻⁴³ s', '#2a1200')],
        notes: 'Portada al rojo blanco: un gran degradado radial. Cada diapositiva será más oscura y fría, y la marca del termómetro de la derecha baja con Transformar.' },
      { layout: 'blank', bg: '#ff9a3c', autoAnimate: true, extra: [
        head('Los primeros minutos', '#2a1200'),
        shape('rect', 90, 380, 860, 4, '#2a1200', { opacity: 40 }),
        ...EPOCHS.map(([t, h, d], i) => [withAnims(shape('ellipse', 110 + i * 200, 370, 24, 24, '#2a1200'), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300 })),
          withAnims(text(`<div style="font-size:22px;font-weight:800">${t}</div>`, 40 + i * 200, 300, 164, 50, { fontSize: 20, color: '#2a1200', textAlign: 'center' }), A('fade-down', { start: 'withPrev', duration: 300 })),
          withAnims(text(`<b style="font-size:24px">${h}</b><br>${d}`, 50 + i * 200, 420, 144, 140, { fontSize: 18, color: '#3d1a00', textAlign: 'center' }), A('fade-up', { start: 'withPrev', duration: 300 }))]).flat(),
        text('Una escala que se estira: cada paso dura miles o millones de veces más que el anterior.', 90, 590, 860, 60, { fontSize: 22, color: '#3d1a00' }),
        ...thermo(220, '10⁹ K', 'a los 3 minutos', '#2a1200')],
        notes: 'Transformar: la marca del termómetro baja. Un clic y las cinco épocas aparecen seguidas. En los tres primeros minutos se formó casi todo el helio que existe.' },
      { layout: 'blank', bg: '#b3261e', autoAnimate: true, extra: [
        head('La luz más antigua', '#ffffff'),
        img(CMB, 80, 160, 640, 320, 'Mapa del fondo cósmico de microondas con manchas de distinta temperatura'),
        text('Mapa del fondo cósmico de microondas: el rojo es 0,0002 K más caliente que el azul.', 80, 490, 640, 60, { fontSize: 18, color: '#ffd6cc', textAlign: 'center' }),
        N('wilkinson-microwave-anisotropy-probe-wmap', 760, 150, 260, 240, { view: 'three', spin: 18 }),
        withAnims(text('Cuando el universo se enfrió a 3.000 K, los electrones se unieron a los núcleos y la luz pudo viajar libre. <b>Esa luz nos llega hoy</b>, estirada hasta las microondas.', 760, 400, 420, 210, { fontSize: 22, color: '#ffffff' }), A('fade-up')),
        ...thermo(330, '3.000 K', '380.000 años', '#ffffff')],
        notes: 'El mapa es un SVG con manchas desenfocadas dentro de un óvalo, como los mapas de todo el cielo. El satélite 3D (NASA) midió esas diferencias. Las manchas son las semillas de las galaxias.' },
      { layout: 'blank', bg: '#4a1f5c', autoAnimate: true, extra: [
        head('Todo se aleja de todo', '#ffffff'),
        chartBlock({ x: 80, y: 150, w: 600, h: 470, chartType: 'scatter', color: '#ffd166', grid: true, yMin: 0, xMin: 0, xTitle: 'Distancia (megapársecs)', yTitle: 'Velocidad de alejamiento (km/s)', data: gal }),
        mathBlock({ x: 720, y: 170, w: 280, h: 100, fontSize: 52, color: '#ffd166', latex: 'v = H_0\\, d' }),
        text('<b>H₀ ≈ 70 km/s por megapársec.</b> Cuanto más lejos está una galaxia, más deprisa se aleja: no se mueven por el espacio, es el espacio el que se estira.', 720, 290, 280, 250, { fontSize: 22, color: '#ffffff' }),
        text('Datos simulados alrededor de la recta.', 720, 560, 280, 54, { fontSize: 16, color: '#d9c2e6' }),
        ...thermo(430, '18 K', '1.000 millones de años', '#ffffff')],
        notes: 'Gráfico de dispersión con cuadrícula y títulos de ejes. Las galaxias son inventadas pero siguen la ley de Hubble-Lemaître con algo de ruido. 1 megapársec son unos 3,26 millones de años luz.' },
      { layout: 'blank', bg: '#26124a', autoAnimate: true, extra: [
        head('¿De qué está hecho?', '#ffffff'),
        chartBlock({ x: 80, y: 150, w: 600, h: 470, chartType: 'doughnut', data: [{ label: 'Energía oscura', value: 68, color: '#7b5cff' }, { label: 'Materia oscura', value: 27, color: '#2fa6ff' }, { label: 'Materia ordinaria', value: 5, color: '#ffd166' }] }),
        withAnims(text('<span style="font-size:96px;font-weight:800;color:#ffd166;line-height:1">5 %</span><br>Todo lo que vemos —estrellas, planetas, gas, nosotros— es solo esto.', 720, 170, 290, 250, { fontSize: 24, color: '#ffffff' }), A('zoom-in')),
        withAnims(text('El 95 % restante no lo hemos visto nunca directamente: lo deducimos por cómo giran las galaxias y por cómo se acelera la expansión.', 720, 440, 290, 180, { fontSize: 20, color: '#c9bde6' }), A('fade-up', { start: 'afterPrev' })),
        ...thermo(500, '7 K', '4.000 millones de años', '#ffffff')],
        notes: 'Dona con un color por porción y leyenda automática con porcentajes. Clic: la cifra del 5 %. Valores redondeados del modelo cosmológico estándar.' },
      { layout: 'blank', bg: '#101634', autoAnimate: true, extra: [
        head('El calendario cósmico', '#ffffff'),
        text('Si toda la historia del universo cupiera en un año…', 80, 130, 900, 40, { fontSize: 24, color: '#9fb0e0' }),
        tableBlock({ x: 80, y: 190, w: 900, h: 420, fontSize: 22, header: true, stroke: '#2a3566', headBg: '#2a3566', headFg: '#ffd166', banded: true, band: '#2a3566', colW: [4.4, 3, 2.4, 3.6],
          rows: [['Suceso', 'Hace (millones de años)', 'Día del año', 'Fecha'], ['Big Bang', '13.800', '=REDONDEAR(365-B2*365/13800;1)', '1 de enero'], ['Primeras galaxias', '13.400', '=REDONDEAR(365-B3*365/13800;1)', '11 de enero'],
            ['Nace el Sol', '4.600', '=REDONDEAR(365-B4*365/13800;1)', '1 de septiembre'], ['Primera vida', '3.800', '=REDONDEAR(365-B5*365/13800;1)', '22 de septiembre'], ['Dinosaurios', '230', '=REDONDEAR(365-B6*365/13800;1)', '25 de diciembre'], ['Nuestra especie', '0,3', '=REDONDEAR(365-B7*365/13800;1)', '31 dic, 23:48']] }),
        ...thermo(570, '4 K', '9.000 millones de años', '#ffffff')],
        notes: 'La columna «Día del año» se calcula con fórmulas: 365 − hace × 365 / 13.800. Toda la historia humana cabe en los últimos minutos del 31 de diciembre. Fechas aproximadas.' },
      { layout: 'blank', bg: '#070914', extra: [pollBlock({ kind: 'choice', question: '¿Cómo crees que acabará el universo?', options: ['Gran congelación', 'Gran desgarro', 'Gran colapso', 'Aún no se sabe'], display: 'bar', fontSize: 34, x: 70, y: 70, w: 1080, h: 580 })],
        notes: 'Votación en directo. Congelación: todo se enfría y se apaga; desgarro: la expansión lo rompe todo; colapso: vuelve a contraerse. Con los datos actuales, la gran congelación es la más probable, pero depende de la naturaleza de la energía oscura.' },
      { layout: 'blank', bg: '#000000', transition: 'fade', transitionSpeed: 'slow', autoAnimate: true, back: starfield(50, 77, '#ffffff', [0, 0, 1180, 720], 2.5, [10, 50]), extra: [
        text('2,7 K', 80, 160, 900, 220, { fontFamily: H, fontSize: 200, fontWeight: 200, color: '#ffffff', letterSpacing: -6 }),
        text('Hoy el universo está a 2,7 grados sobre el cero absoluto: frío, oscuro y casi vacío… y en un rincón, alguien se pregunta de dónde viene.', 90, 420, 840, 120, { fontSize: 28, color: '#b9c2dd' }),
        text(NASA_CREDIT, 90, 620, 800, 30, { fontSize: 15, color: '#5a6280' }),
        ...thermo(625, '2,7 K', 'hoy', '#ffffff')],
        notes: 'Cierre en negro: la marca del termómetro ha llegado al fondo de la escala. Pregunta final para casa: si el universo se expande, ¿hacia dónde se expande?' },
    ]), '#ffffff'));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · A night out under the stars, in "red-light mode" (as astronomers use it so as not to lose their night vision):
  // black and deep red only, a planisphere with the months round it, constellations that are traced as you present.
  sci_astro_skywatch: { name: 'Guía para observar el cielo', cat: 'sci', summary: 'Modo luz roja: planisferio con texto curvo, cuenta atrás, constelaciones que se trazan solas, magnitudes, barras, tabla y votación', make: () => {
    const BG = '#050101', RED = '#ff4a3a', MID = '#d0402f', DIM = '#b04a3c', FAINT = '#3a0f0b', R = FF.raleway;
    const head = (t, sub) => [text(t, 80, 56, 1120, 60, { fontFamily: R, fontSize: 40, fontWeight: 300, letterSpacing: 8, color: RED }), text(sub, 80, 112, 1120, 34, { fontSize: 18, color: DIM, fontStyle: 'italic' })];
    const star = (x, y, s, props = {}) => shape('star4', x - s / 2, y - s / 2, s, s, RED, props);
    const name = (t, x, y, w = 140, props = {}) => text(t, x, y, w, 28, { fontSize: 16, color: MID, fontStyle: 'italic', ...props });
    // Traced lines: one stroke per constellation, drawn one after another.
    // (Straight lines: one ink stroke per segment, each drawn after the one before.)
    const trace = (pts, i, props = {}) => pts.slice(1).map((q, k) => withAnims(ink([pts[k], q], MID, 2, { opacity: 85 }),
      A('draw', { duration: 380, ...props, start: k ? 'afterPrev' : (props.start || (i ? 'afterPrev' : 'click')) })));
    // The Plough (Big Dipper) and the way to the Pole Star.
    const DUB = [590, 540], MER = [560, 600], POL = [740, 240];
    const PLOUGH = [[290, 515], [355, 500], [410, 520], [470, 535], DUB, MER, [480, 595], [470, 535]];
    const LITTLE = [POL, [705, 265], [678, 293], [650, 330], [612, 318], [600, 360], [640, 372], [650, 330]];
    // Orion.
    const OR = { bet: [300, 240], bel: [470, 260], mei: [385, 180], aln: [345, 400], anm: [380, 388], min: [415, 376], sai: [320, 560], rig: [490, 535] };
    // The planisphere on the cover: a disc of stars with a ring of months.
    const disc = (() => { const r = rng(5), out = []; for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 230, s = 3 + r() * 7; out.push(star(360 + d * Math.cos(a), 380 + d * Math.sin(a), s, { opacity: 40 + Math.round(r() * 60) })); } return out; })();
    return numbered(withFg(build({ name: 'Guía para observar el cielo', palette: 'warm', fonts: 'websafe', title: { color: RED, font: R }, body: { color: MID } }, [
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
        shape('ellipse', 100, 120, 520, 520, '#120302', { stroke: DIM, strokeWidth: 2 }), ring(360, 380, 300, FAINT, { strokeWidth: 1 }),
        ...disc,
        ...[[250, 300], [305, 355], [355, 320], [410, 372], [465, 330]].map(([x, y]) => star(x, y, 20)), ...trace([[250, 300], [305, 355], [355, 320], [410, 372], [465, 330]], 0, { start: 'afterPrev' }),
        text('ENERO · FEBRERO · MARZO · ABRIL · MAYO · JUNIO · JULIO · AGOSTO · SEPTIEMBRE · OCTUBRE · NOVIEMBRE · DICIEMBRE · ', 60, 80, 600, 600, { fontSize: 18, curve: 100, color: MID, letterSpacing: 2 }),
        text('CLUB DE ASTRONOMÍA · INICIACIÓN', 720, 200, 500, 30, { fontSize: 16, letterSpacing: 4, color: DIM }),
        text('Guía para<br>observar el cielo', 716, 240, 520, 180, { fontFamily: R, fontSize: 60, fontWeight: 300, color: RED, lineHeight: 1.15 }),
        text('Todo lo que necesitas es una noche despejada, una manta y veinte minutos de paciencia.', 720, 440, 460, 100, { fontSize: 22, color: MID }),
        text('Esta presentación está en rojo a propósito: la luz roja no estropea la visión nocturna.', 720, 580, 460, 70, { fontSize: 16, color: DIM, fontStyle: 'italic' })],
        notes: 'Portada en «modo luz roja», como las linternas de los astrónomos. El planisferio tiene estrellas al azar (formas de estrella de cuatro puntas), una figura que se traza sola y los meses en texto curvo en círculo.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('PRIMERO, TUS OJOS', 'La pupila se abre en segundos; la química de la retina tarda mucho más'),
        ...[['Luz roja, siempre', 'Una linterna con papel celofán rojo o una aplicación en modo nocturno.'], ['Nada de pantallas blancas', 'Un solo vistazo al móvil y vuelves a empezar.'], ['Mira de reojo', 'Los bastones, sensibles a la luz débil, están fuera del centro de la retina.']].map(([h, d], i) =>
          withAnims(text(`<b style="color:${RED};font-size:26px">${h}</b><br>${d}`, 80, 190 + i * 140, 600, 120, { fontSize: 20, color: MID }), A('fade-right', { start: i ? 'afterPrev' : 'click', duration: 500 }))),
        timer(1200, 780, 180, 380, { color: RED, auto: false, endText: '¡Ya ves!' }),
        text('Cuenta atrás de adaptación a la oscuridad', 740, 580, 460, 40, { fontSize: 18, color: DIM, textAlign: 'center', fontStyle: 'italic' })],
        notes: 'Cuenta atrás de 20 minutos (estilo anillo, en rojo): arráncala con un clic al apagar las luces. Mientras, los tres consejos entran uno detrás de otro.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...head('ENCUENTRA LA ESTRELLA POLAR', 'Paso 1: el Carro. Paso 2: sigue los punteros. Paso 3: ya está'),
        ...PLOUGH.slice(0, 7).map(([x, y]) => star(x, y, 18)),
        ...trace(PLOUGH, 0),
        name('Dubhe', DUB[0] + 14, DUB[1] - 30), name('Merak', MER[0] + 14, MER[1]),
        ...trace([MER, POL], 1, { duration: 1400 }),
        withAnims(star(POL[0], POL[1], 34), A('zoom-in', { start: 'afterPrev', duration: 500, sound: 'chime' })),
        withAnims(name('Polar', POL[0] + 24, POL[1] - 14, 100, { color: RED, fontSize: 20 }), A('fade-in', { start: 'withPrev' })),
        ...LITTLE.slice(1).map((q, k) => withAnims(ink([LITTLE[k], q], DIM, 1.5, { dash: 'dash' }), A('fade-in', { start: k ? 'withPrev' : 'afterPrev', duration: 800 }))),
        text('Prolonga la línea de Merak a Dubhe unas cinco veces su distancia. La Polar no es la más brillante del cielo, pero <b style="color:#ff4a3a">no se mueve</b>: marca el norte.', 860, 220, 340, 260, { fontSize: 21, color: MID }),
        text('Su altura sobre el horizonte es tu latitud.', 860, 520, 340, 60, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Un clic: se traza el Carro (Osa Mayor), después la línea de los punteros, aparece la Polar con un tintineo y, en discontinuo, la Osa Menor. Todo encadenado con «después de la anterior».' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...head('ORIÓN, EL CAZADOR', 'La constelación más fácil de las noches de invierno'),
        glow(345, 410, 90, '#ff4a3a', BG, 45),
        ...Object.values(OR).map(([x, y], i) => star(x, y, [26, 18, 12, 16, 16, 16, 14, 24][i])),
        star(150, 470, 30),
        ...trace([OR.mei, OR.bet, OR.aln, OR.sai], 0), ...trace([OR.mei, OR.bel, OR.min, OR.rig], 1), ...trace([OR.aln, OR.anm, OR.min], 2),
        withAnims(ink([OR.min, [150, 470]], DIM, 1.5, { dash: 'dash' }), A('draw', { start: 'click', duration: 1200 })),
        withAnims(name('Sirio, la más brillante', 60, 500, 220, { color: RED }), A('fade-in', { start: 'afterPrev' })),
        name('Betelgeuse', 160, 214, 120, { textAlign: 'right' }), name('Rigel', 506, 528, 100), name('Nebulosa', 330, 505, 120, { textAlign: 'center' }),
        text(ul('<b style="color:#ff4a3a">Betelgeuse</b>: supergigante roja, a punto (astronómicamente) de explotar', '<b style="color:#ff4a3a">Las Tres Marías</b>: el cinturón, tres estrellas en fila', '<b style="color:#ff4a3a">La nebulosa</b>: una mancha difusa bajo el cinturón donde nacen estrellas'), 640, 200, 560, 380, { fontSize: 21, color: MID, lineHeight: 1.45 })],
        notes: 'Un clic traza Orión entera (tres trazos a la vez). Otro clic prolonga el cinturón hacia abajo a la izquierda hasta Sirio. La nebulosa es un brillo radial.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('¿CUÁNTO BRILLA?', 'La escala de magnitudes: cuanto menor el número, más brillante'),
        ...[['Venus', '−4,6', 64], ['Sirio', '−1,5', 46], ['Vega', '0', 38], ['Polar', '2', 26], ['Límite en ciudad', '3', 18], ['Límite en el campo', '6', 9]].map(([n, m, s], i) => [
          withAnims(star(150 + i * 190, 280, s), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300 })),
          withAnims(text(`<b style="color:#ff4a3a;font-size:30px">${m}</b><br>${n}`, 60 + i * 190, 330, 180, 90, { fontSize: 18, color: MID, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 300 }))]).flat(),
        mathBlock({ x: 80, y: 470, w: 600, h: 110, fontSize: 40, color: RED, latex: 'm_1 - m_2 = -2{,}5\\,\\log_{10}\\frac{F_1}{F_2}' }),
        text('Cinco magnitudes de diferencia son un brillo cien veces mayor. Es una escala heredada de la Grecia clásica.', 720, 475, 480, 110, { fontSize: 20, color: MID })],
        notes: 'Un clic: las estrellas aparecen en cadena, de la más brillante a la más débil. F es el flujo de luz que nos llega. La escala va «al revés» porque los antiguos llamaban de primera magnitud a las más brillantes.' },
      { layout: 'blank', bg: BG, transition: 'push', extra: [
        ...head('LA LUZ QUE NOS ROBA EL CIELO', 'Estrellas visibles a simple vista según dónde estés'),
        chartBlock({ x: 80, y: 170, w: 760, h: 460, chartType: 'hbar', color: MID, dataLabels: true,
          data: [{ label: 'Alta montaña', value: 4500 }, { label: 'Pueblo pequeño', value: 2000 }, { label: 'Afueras', value: 800 }, { label: 'Ciudad', value: 200 }, { label: 'Centro de gran ciudad', value: 30 }] }),
        text('<b style="color:#ff4a3a;font-size:30px">Ocho de cada diez</b><br>personas en Europa no pueden ver la Vía Láctea desde su casa.', 880, 200, 320, 200, { fontSize: 21, color: MID }),
        text('Cifras aproximadas. Una farola que ilumina hacia arriba gasta luz… y cielo.', 880, 460, 320, 100, { fontSize: 17, color: DIM, fontStyle: 'italic' })],
        notes: 'Barras horizontales con etiquetas. Valores orientativos: dependen de la Luna, la humedad y la vista de cada uno.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('LLUVIAS DE ESTRELLAS DEL AÑO', 'Apunta la fecha: el máximo es la noche que más se ven'),
        tableBlock({ x: 80, y: 180, w: 1120, h: 400, fontSize: 24, header: true, lines: true, stroke: '#5c1a14', headFg: RED, colW: [3.6, 3.8, 2.2, 5.4],
          rows: [['Lluvia', 'Máximo', 'Por hora', 'Viene de'], ['Cuadrántidas', '3–4 de enero', '≈ 110', 'Un asteroide que fue cometa'], ['Líridas', '22 de abril', '≈ 18', 'Cometa de periodo largo'],
            ['Perseidas', '12–13 de agosto', '≈ 100', 'Cometa de 133 años de periodo'], ['Oriónidas', '21 de octubre', '≈ 20', 'El cometa más famoso'], ['Gemínidas', '13–14 de diciembre', '≈ 150', 'Un asteroide rocoso']] }),
        text('«Por hora» es el máximo con cielo perfecto; en la práctica se ven menos.', 80, 600, 1120, 40, { fontSize: 17, color: DIM, fontStyle: 'italic' })],
        notes: 'Tabla con estilo «Mínima»: solo líneas horizontales. Las lluvias de estrellas son granos de polvo que dejó un cometa y que la Tierra cruza cada año.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'multi', question: '¿Qué quieres ver en la próxima salida? (marca todas las que quieras)', options: ['Los cráteres de la Luna', 'Los anillos de Saturno', 'Las Perseidas', 'La Vía Láctea', 'La estación espacial'], fontSize: 32, x: 70, y: 70, w: 1140, h: 580 })],
        notes: 'Votación de respuesta múltiple desde el móvil (con el brillo al mínimo, por favor).' },
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
        ...starfield(60, 88, RED, [40, 40, 1200, 640], 3, [15, 60]),
        text('Cielos despejados', 90, 250, 1100, 120, { fontFamily: 'Georgia, serif', fontSize: 88, fontStyle: 'italic', color: RED, textAlign: 'center' }),
        text('Así se despiden los aficionados a la astronomía. Próxima salida: el primer sábado sin Luna.', 190, 400, 900, 80, { fontSize: 22, color: MID, textAlign: 'center' })],
        notes: 'Cierre en letra Georgia (de las que no necesitan descarga) y estrellas rojas. Recuerda la fecha y el punto de encuentro de la salida.' },
    ]), MID));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · The Sun as seen through a solar telescope's red filter: deep crimson, a huge disc that bleeds off the slide,
  // Abril Fatface, and a probe that travels towards it (Transform).
  sci_astro_sun: { name: 'El Sol, una estrella de cerca', cat: 'sci', summary: 'Filtro solar carmesí: capas en cadena, fusión con ecuación, el viaje de un fotón, ciclo de manchas, sonda 3D con Transformar y concurso', make: () => {
    const BG = '#2a0703', FG = '#fff1e0', DIM = '#f0a98a', GOLD = '#ffc94d', ORA = '#ff7a1f', AB = FF.abril, SUN = uid(), PSP = uid();
    const sAB = n => `<span style="font-family:${AB};font-weight:400">${n}</span>`;
    const head = (t, color = FG) => text(t, 80, 50, 1120, 80, { fontFamily: AB, fontSize: 52, color });
    const sun = (cx, cy, r, props = {}) => ({ ...sphere(cx, cy, r, '#fff6c2', '#e8430c', props), id: SUN });
    const probe = (x, y, w, h, props) => ({ ...N('parker-solar-probe', x, y, w, h, props), id: PSP });
    // Layers of the Sun, from the core out.
    const LX = 360, LY = 420, ANG = [-40, -10, 15, 30, 40];   // (where each leader starts: lower for the outer layers, so the lines never cross)
    const LAYERS = [['Núcleo', '15 millones °C · aquí ocurre la fusión', 70, '#fffbe0', '#ffd23f'], ['Zona radiativa', 'la luz rebota durante milenios', 140, '#ffd23f', '#ff9f1c'],
      ['Zona convectiva', 'el gas hierve como una olla', 190, '#ff9f1c', '#f25c05'], ['Fotosfera', '5.500 °C · la «superficie» que vemos', 206, '#ff7a1f', '#d62f05'], ['Corona', '1–2 millones °C · solo se ve en un eclipse', 270, '#ffcf99', BG]];
    // A photon's random walk out of the Sun, then a straight line to the Earth.
    const walk = (() => { const r = rng(21), pts = [[300, 420]]; let [x, y] = pts[0];
      for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 22; x += Math.cos(a) * d + 5.5; y += Math.sin(a) * d; const dx = x - 300, dy = y - 420, k = Math.hypot(dx, dy); if (k > 150) { x = 300 + dx / k * 150; y = 420 + dy / k * 150; } pts.push([x, y]); }
      pts.push([300 + 200, 420]); return pts; })();
    return numbered(withFg(build({ name: 'El Sol, una estrella de cerca', palette: 'warm', fonts: 'friendly', title: { color: FG, font: AB }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
        glow(560, -180, 1100, '#ff5a1f', BG, 45),
        sun(1180, 360, 470),
        text('ASTROFÍSICA SOLAR · SEMINARIO 2', 90, 170, 600, 34, { fontSize: 18, letterSpacing: 6, color: GOLD }),
        text('El Sol', 80, 200, 640, 200, { fontFamily: AB, fontSize: 170, wordart: 'fire', lineHeight: 1 }),
        text('Una estrella corriente que, vista de cerca, no tiene nada de corriente.', 90, 420, 520, 100, { fontSize: 30, color: FG })],
        notes: 'Portada a sangre: el Sol es una elipse enorme con degradado radial que se sale por la derecha, con un gran brillo detrás. Título en Abril Fatface con Text Art «Fuego».' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'quiz', question: '¿Qué está más caliente?', options: ['La fotosfera, la superficie', 'La corona, mucho más lejos del núcleo', 'Las dos igual', 'Las manchas solares'], correct: [1], time: 20, fontSize: 40, x: 60, y: 40, w: 1160, h: 640 })],
        notes: 'Pregunta de arranque, antes de abrir el Sol por capas: que cada uno apueste ahora y la respuesta llega en la diapositiva siguiente. La corona está a 1–2 millones de grados y la fotosfera a 5.500 °C. Es el problema del calentamiento coronal: las ondas y los campos magnéticos llevan la energía hacia fuera.' },
      { layout: 'blank', bg: BG, extra: [
        head('Capa a capa'),
        ...LAYERS.slice().reverse().map(([n, d, r, c1, c2], k) => { const i = LAYERS.length - 1 - k;
          return withAnims(sphere(LX, LY, r, c1, c2, i === 4 ? { opacity: 60 } : i === 3 ? { opacity: 100 } : {}), A('zoom-in', { start: k ? 'withPrev' : 'afterPrev', duration: 500 })); }),
        ...LAYERS.map(([n, d, r, c1], i) => [
          withAnims(ink([[LX + r * Math.cos(ANG[i] * Math.PI / 180), LY + r * Math.sin(ANG[i] * Math.PI / 180)], [700, 180 + i * 96], [730, 180 + i * 96]], '#ffd9b8', 1.5), A('draw', { start: i ? 'afterPrev' : 'click', duration: 400 })),
          withAnims(text(`<b style="color:${i === 4 ? '#ffcf99' : c1};font-size:26px">${n}</b><br>${d}`, 740, 155 + i * 96, 460, 90, { fontSize: 19, color: FG }), A('fade-left', { start: 'withPrev', duration: 400 }))]).flat()],
        notes: 'El Sol en capas: cinco círculos con degradado que entran solos al llegar. Cada clic une una capa con su etiqueta (línea trazada). La corona está más caliente que la fotosfera: un misterio que estudian las sondas solares.' },
      { layout: 'blank', bg: '#3a0a04', transition: 'fade', extra: [
        head('La fábrica de luz'),
        mathBlock({ x: 80, y: 160, w: 1120, h: 110, fontSize: 46, color: GOLD, latex: '4\\,{}^{1}\\mathrm{H} \\;\\longrightarrow\\; {}^{4}\\mathrm{He} + 2e^{+} + 2\\nu_e + 26{,}7\\ \\mathrm{MeV}' }),
        dg('process', 'Protón + protón\n  Nace el deuterio\n+ un protón\n  Se forma helio-3\nHelio-3 + helio-3\n  Helio-4 y dos protones libres', 80, 300, 700, 300, { colors: 'accent', oneByOne: true }),
        withAnims(text(`<div style="font-family:${AB};font-size:72px;color:${ORA};line-height:1">600</div>millones de toneladas de hidrógeno se convierten en helio cada segundo`, 840, 290, 360, 200, { fontSize: 22, color: FG }), A('zoom-in')),
        withAnims(mathBlock({ x: 840, y: 510, w: 360, h: 90, fontSize: 44, color: FG, latex: 'E = mc^2' }), A('fade-up', { start: 'afterPrev' })),
        withAnims(text('Solo el 0,7 % de esa masa se vuelve energía… y basta.', 840, 600, 360, 60, { fontSize: 18, color: DIM }), A('fade-up', { start: 'withPrev' }))],
        notes: 'La cadena protón-protón como ecuación (KaTeX) y como diagrama de proceso uno a uno. Después, la cifra de hidrógeno por segundo y la equivalencia masa-energía.' },
      { layout: 'blank', bg: BG, extra: [
        head('El largo viaje de un fotón'),
        sphere(300, 420, 200, '#ffd23f', '#e8430c', { opacity: 90 }), ring(300, 420, 150, '#fff1e0', { dash: 'dot', strokeWidth: 1.5, opacity: 50 }),
        text('zona radiativa', 220, 600, 160, 30, { fontSize: 16, color: DIM, textAlign: 'center' }),
        sphere(1130, 420, 22, '#9fd3ff', '#1d5f8a'), text('Tierra', 1080, 450, 100, 30, { fontSize: 18, color: FG, textAlign: 'center' }),
        withAnims(shape('ellipse', 293, 413, 14, 14, '#ffffff', { stroke: GOLD, strokeWidth: 3 }), path(rel(walk), { duration: 5000 }), path([[600, 0]], { start: 'afterPrev', duration: 1200, sound: 'whoosh' })),
        withAnims(stat(sAB('170.000 años'), 'rebotando de átomo en átomo para salir', 580, 170, 520, GOLD, FG, 56), A('fade-in', { start: 'withPrev', delay: 1000 })),
        withAnims(stat(sAB('8 min 20 s'), 'para llegar a la Tierra en línea recta', 580, 520, 520, ORA, FG, 56), A('fade-in', { start: 'click' }))],
        notes: 'Clic: el fotón da un paseo al azar dentro del Sol (trayectoria con muchos puntos) y luego sale disparado hacia la Tierra con un sonido. El último clic muestra el tiempo de viaje. Las cifras son órdenes de magnitud.' },
      { layout: 'blank', bg: BG, transition: 'push', extra: [
        head('Un corazón que late cada 11 años'),
        chartBlock({ x: 80, y: 150, w: 780, h: 480, chartType: 'area', color: ORA, grid: true, yTitle: 'Manchas solares (media anual)',
          data: [[2008, 3], [2009, 3], [2010, 25], [2011, 80], [2012, 85], [2013, 95], [2014, 115], [2015, 70], [2016, 40], [2017, 22], [2018, 7], [2019, 4], [2020, 9], [2021, 30], [2022, 85], [2023, 125], [2024, 155], [2025, 130]].map(([l, v]) => ({ label: '’' + String(l).slice(2), value: v })) }),
        text('<b style="color:#ffc94d">Más manchas, más tormentas.</b> En el máximo hay más erupciones y eyecciones de plasma: auroras hasta en el sur de Europa, apagones de radio y satélites en peligro.', 900, 180, 300, 300, { fontSize: 21, color: FG }),
        text('Valores aproximados y redondeados.', 900, 560, 300, 40, { fontSize: 16, color: DIM })],
        notes: 'Gráfico de área con cuadrícula: dos ciclos solares. El de 2024 fue más intenso de lo previsto. El campo magnético del Sol se da la vuelta en cada máximo.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        head('La sonda que toca el Sol'),
        sun(170, 430, 70),
        shape('ellipse', 140, 260, 960, 340, 'none', { stroke: '#ffd9b8', strokeWidth: 1.5, dash: 'dash', opacity: 50 }),
        probe(880, 180, 320, 320, { view: 'three', spin: 20 }),
        text('Su órbita es una elipse muy alargada: en cada vuelta se acerca más, ayudada por la gravedad de Venus.', 300, 150, 560, 100, { fontSize: 23, color: FG })],
        notes: 'La sonda solar Parker (modelo 3D de la NASA) gira lejos del Sol. Pasa a la siguiente: Transformar la acerca, y el Sol crece hasta llenar media pantalla.' },
      { layout: 'blank', bg: BG, autoAnimate: true, extra: [
        sun(-60, 360, 500),
        probe(470, 160, 400, 400, { view: 'side', autoRotate: false, arrive: 'turn', edge: 'fade' }),
        ...[['6,1 millones', 'de km de la superficie: el récord'], ['192 km/s', 'el objeto más rápido construido'], ['≈ 1.400 °C', 'en su escudo; dentro, 30 °C']].map(([n, l], i) =>
          withAnims(stat(sAB(n), l, 880, 110 + i * 175, 340, i === 1 ? GOLD : FG, DIM, 44), A('fade-left', { start: i ? 'afterPrev' : 'click' })))],
        notes: 'Transformar: el Sol crece y la sonda se acerca dando una vuelta hasta ponerse de lado. Clic: tres récords. El escudo de carbono mira siempre al Sol.' },
      { layout: 'blank', bg: '#1a0402', transition: 'fade', extra: [
        head('Mirar al Sol, sin quemarse', GOLD),
        shape('rounded', 80, 160, 540, 460, '#3a0a04', { stroke: '#ff3b1f', strokeWidth: 2 }), shape('rounded', 660, 160, 540, 460, '#132a12', { stroke: '#4caf50', strokeWidth: 2 }),
        icon('close', 110, 185, 56, '#ff5a3c'), text('NUNCA', 180, 190, 400, 50, { fontFamily: AB, fontSize: 38, color: '#ff8a70' }),
        icon('check', 690, 185, 56, '#7ddc7f'), text('ASÍ SÍ', 760, 190, 400, 50, { fontFamily: AB, fontSize: 38, color: '#a5e8a6' }),
        withAnims(text(ul('A simple vista, ni un segundo', 'Con gafas de sol o radiografías', 'Con prismáticos o telescopio sin filtro', 'Por el móvil apuntando al Sol'), 110, 270, 490, 330, { fontSize: 24, color: FG, lineHeight: 1.6 }), A('fade-right')),
        withAnims(text(ul('Gafas de eclipse homologadas', 'Proyectando con un agujero en una cartulina', 'Telescopio con filtro solar delante', 'En un observatorio, con un monitor'), 690, 270, 490, 330, { fontSize: 24, color: FG, lineHeight: 1.6 }), A('fade-left'))],
        notes: 'Iconos de la biblioteca (cruz y visto) y dos paneles con borde. Un clic para cada columna. El daño en la retina no duele: por eso es tan peligroso.' },
      { layout: 'blank', bg: '#120201', transition: 'fade', transitionSpeed: 'slow', extra: [
        shape('rect', 0, 380, 1280, 340, '#ff7a1f', { fill2: '#120201', gradAngle: 270, opacity: 70 }),
        sphere(640, 640, 220, '#fff6c2', '#ff5a1f'), shape('rect', 0, 640, 1280, 80, '#120201'),
        text('Gracias', 90, 170, 1100, 140, { fontFamily: AB, fontSize: 120, color: FG, textAlign: 'center' }),
        text('Dentro de 5.000 millones de años será una gigante roja. Mientras tanto: protector solar.', 190, 320, 900, 80, { fontSize: 24, color: DIM, textAlign: 'center' }),
        text(NASA_CREDIT, 190, 670, 900, 30, { fontSize: 15, color: '#b06a50', textAlign: 'center' })],
        notes: 'Cierre con una puesta de sol: un degradado y medio disco solar que se esconde bajo el horizonte.' },
    ]), FG));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Pulsars on an oscilloscope: a green phosphor screen with its graticule, traces that draw themselves,
  // a lighthouse that turns, pulses that sound, JetBrains Mono everywhere.
  sci_astro_pulsars: { name: 'Púlsares: los faros del cosmos', cat: 'sci', summary: 'Pantalla de osciloscopio: señal que se traza sola, faro que gira, pulsos que suenan, radiotelescopio y nebulosa 3D, tabla y concurso', make: () => {
    const BG = '#010805', SCR = '#04170d', PH = '#5dff9b', PH2 = '#c8ffdc', DIM = '#3f9d68', AMB = '#ffb84d', INKP = '#1d2a3a', M = FF.mono;
    // The screen: a rounded tube with its graticule (10 × 8 divisions, the centre axes with ticks) and a vignette.
    const GRAT = svgURL(1280, 720, `<defs><radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs>`
      + `<rect x="40" y="40" width="1200" height="640" rx="28" fill="${SCR}"/>`
      + Array.from({ length: 9 }, (_, i) => `<line x1="${160 + i * 120}" y1="40" x2="${160 + i * 120}" y2="680" stroke="#1f6b45" stroke-opacity="${i === 4 ? 0.55 : 0.3}"/>`).join('')
      + Array.from({ length: 7 }, (_, j) => `<line x1="40" y1="${120 + j * 80}" x2="1240" y2="${120 + j * 80}" stroke="#1f6b45" stroke-opacity="${j === 3 ? 0.55 : 0.3}"/>`).join('')
      + Array.from({ length: 49 }, (_, k) => `<line x1="${64 + k * 24}" y1="355" x2="${64 + k * 24}" y2="365" stroke="#1f6b45" stroke-opacity=".6"/>`).join('')
      + Array.from({ length: 25 }, (_, k) => `<line x1="635" y1="${56 + k * 26}" x2="645" y2="${56 + k * 26}" stroke="#1f6b45" stroke-opacity=".6"/>`).join('')
      + `<rect x="40" y="40" width="1200" height="640" rx="28" fill="url(#v)"/><rect x="40" y="40" width="1200" height="640" rx="28" fill="none" stroke="#2c8a5a" stroke-width="3"/>`);
    // A pulsar's trace: noise on a baseline and a sharp spike once per period (px), upwards.
    const signal = (x0, x1, y, period, amp, seed, phase = 0, noise = 5) => { const r = rng(seed), pts = [];
      for (let x = x0; x <= x1; x += 3) { const t = (((x - x0 - phase) % period) + period) % period;
        const spike = t < 6 ? amp * t / 6 : t < 12 ? amp * (12 - t) / 6 : t < 18 ? -amp * 0.12 * (18 - t) / 6 : 0;
        pts.push([x, y - spike + (r() - 0.5) * noise]); }
      return pts; };
    const head = (t, sub) => [text(t, 80, 62, 1120, 56, { fontFamily: M, fontSize: 38, fontWeight: 700, color: PH, letterSpacing: 2 }),
      ...(sub ? [text(sub, 80, 116, 1120, 30, { fontFamily: M, fontSize: 16, color: DIM, letterSpacing: 1 })] : [])];
    const readout = (t, x, y, w, color = DIM, props = {}) => text(t, x, y, w, 28, { fontFamily: M, fontSize: 16, color, ...props });
    // A measurement box, like the ones an oscilloscope prints at the edge of its screen.
    const meas = (label, value, sub, x, y, w, color = PH) => card(`<div style="font-family:${M};font-size:15px;letter-spacing:2px;color:${DIM}">${label}</div><div style="font-family:${M};font-size:44px;font-weight:700;color:${color};line-height:1.15">${value}</div><div>${sub}</div>`,
      x, y, w, 132, '#06261580', { fontSize: 18, color: PH2, borderColor: '#2c8a5a', radius: 6, pad: [10, 16, 10, 16] });
    // The lighthouse: two beams from the star along its magnetic axis (pointing up and down), in a square picture to spin.
    const BEAMS = svgURL(480, 480, `<defs><linearGradient id="u" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${PH}" stop-opacity=".9"/><stop offset="1" stop-color="${PH}" stop-opacity="0"/></linearGradient>`
      + `<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PH}" stop-opacity=".9"/><stop offset="1" stop-color="${PH}" stop-opacity="0"/></linearGradient></defs>`
      + `<path d="M240 240 L205 10 L275 10Z" fill="url(#u)"/><path d="M240 240 L205 470 L275 470Z" fill="url(#d)"/><line x1="240" y1="20" x2="240" y2="460" stroke="${PH2}" stroke-width="2" stroke-dasharray="6 6" opacity=".7"/>`);
    const SX = 330, SY = 400;
    // The pulsar map of the Pioneer plaques (a drawing inspired by it, not to scale): lines from the Sun to 14 pulsars, and the long one to the centre of the galaxy.
    const MAP = [[-8, 250], [14, 140], [29, 90], [50, 160], [72, 70], [96, 120], [119, 185], [141, 80], [164, 135], [199, 100], [227, 175], [254, 65], [289, 125], [321, 150]];
    const MX = 360, MY = 420, end = ([a, l]) => [MX + l * Math.cos(a * Math.PI / 180), MY + l * Math.sin(a * Math.PI / 180)];
    const MAPSVG = svgURL(1280, 720, MAP.map(([a, l], i) => { const [x, y] = end([a, l]), n = 4 + (i % 4), ux = Math.cos(a * Math.PI / 180), uy = Math.sin(a * Math.PI / 180);
      return `<line x1="${MX}" y1="${MY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${DIM}" stroke-width="2" opacity=".5"/>`
        + Array.from({ length: n }, (_, k) => { const t = 0.35 + k * 0.1, px = MX + l * t * ux, py = MY + l * t * uy, h = (i + k) % 3 ? 5 : 10;
          return `<line x1="${(px - uy * h).toFixed(1)}" y1="${(py + ux * h).toFixed(1)}" x2="${(px + uy * h).toFixed(1)}" y2="${(py - ux * h).toFixed(1)}" stroke="${DIM}" stroke-width="2"/>`; }).join(''); }).join(''));
    // The chart recorder of 1967: cream paper with a fine grid.
    const PAPER = svgURL(1120, 200, `<rect width="1120" height="200" fill="#efe8cf"/>` + Array.from({ length: 56 }, (_, i) => `<line x1="${i * 20}" y1="0" x2="${i * 20}" y2="200" stroke="#9cc9a8" stroke-opacity="${i % 5 ? 0.35 : 0.8}"/>`).join('')
      + Array.from({ length: 10 }, (_, j) => `<line x1="0" y1="${j * 20}" x2="1120" y2="${j * 20}" stroke="#9cc9a8" stroke-opacity="${j % 5 ? 0.35 : 0.8}"/>`).join(''));
    return numbered(withFg(build({ name: 'Púlsares: los faros del cosmos', palette: 'forest', fonts: 'tech', title: { color: PH, font: M }, body: { color: PH2 },
      decor: () => [img(GRAT, 0, 0, 1280, 720, 'Pantalla de osciloscopio con su cuadrícula'), readout('CH1 2 mV/div · M 200 ms · TRIG ▲ 0,8 mV', 70, 644, 600, '#2c8a5a', { fontSize: 14 })] }, [
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
        N('70-meter-dish', 730, 70, 480, 400, { view: 'three', spin: 10, edge: 'fade' }),
        readout('RADIOASTRONOMÍA · SEMINARIO 7', 80, 110, 600, AMB, { letterSpacing: 4 }),
        text('PÚLSARES', 74, 140, 700, 150, { fontFamily: M, fontSize: 120, fontWeight: 700, wordart: 'neon', wordartColor: PH }),
        text('Los faros del universo, escuchados con un radiotelescopio', 80, 300, 600, 90, { fontSize: 28, color: PH2 }),
        withAnims(ink(signal(80, 1200, 540, 186, 70, 3, 60), PH, 3), A('draw', { start: 'afterPrev', delay: 400, duration: 3200 })),
        readout('> CH1 · PSR B1919+21 · P = 1,337 s', 80, 600, 600, PH)],
        notes: 'Portada de osciloscopio: la pantalla y su cuadrícula son un dibujo SVG en el patrón de todas las diapositivas. Al llegar, la señal del púlsar se traza sola de izquierda a derecha (efecto «Dibujar» en un trazo de tinta). La antena de 70 m es un modelo 3D de la NASA.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...head('1967: UNA SEÑAL DEMASIADO PUNTUAL', 'REGISTRO EN PAPEL DE UN RADIOTELESCOPIO · 81,5 MHz'),
        img(PAPER, 80, 180, 1120, 200, 'Papel milimetrado del registrador'),
        withAnims(ink(signal(90, 1190, 300, 214, 62, 8, 90, 14), INKP, 2.5), A('draw', { duration: 4000, sound: 'whoosh' })),
        withAnims(ink(arcPts(614, 262, 40, 46, -100, 250, 30), '#c0392b', 3), A('draw', { start: 'afterPrev', duration: 600 })),
        withAnims(text('¿LGM-1?', 660, 186, 200, 50, { fontFamily: "'Caveat', cursive", fontSize: 40, color: '#c0392b', rotation: -6 }), A('zoom-in', { start: 'afterPrev', duration: 300, sound: 'pop' })),
        text('Entre el ruido aparecían pulsos regulares como un reloj. Nadie conocía nada natural tan puntual, y en broma la bautizaron LGM-1: «hombrecillos verdes».', 80, 420, 700, 150, { fontSize: 24, color: PH2 }),
        withAnims(meas('PERIODO', '1,3373 s', 'un pulso cada vez, durante meses', 840, 420, 360, AMB), A('fade-left'))],
        notes: 'Clic: la señal se dibuja sobre el papel del registrador, como la pluma de 1967; luego se rodea un pulso y aparece la anotación a mano. Siguiente clic: el periodo medido. Era una estrella de neutrones girando, no una civilización.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('UN FARO QUE GIRA'),
        glow(SX - 120, SY - 120, 240, PH, SCR, 30),
        withAnims(img(BEAMS, SX - 240, SY - 240, 480, 480, 'Dos haces de radio a lo largo del eje magnético'), path([[0, 0], [0, 0]], { spin: 1080, duration: 3600 })),
        sphere(SX, SY, 22, '#ffffff', PH),
        sphere(640, SY, 16, '#9fd3ff', '#1d5f8a'), readout('Tierra', 605, SY + 22, 80, DIM, { textAlign: 'center' }),
        text('Una estrella de neutrones gira y lanza dos haces de radio por sus polos magnéticos. Cada vez que uno barre la Tierra, el receptor ve un pulso.', 720, 160, 480, 180, { fontSize: 24, color: PH2 }),
        shape('rect', 720, 380, 480, 200, '#06261580', { stroke: '#2c8a5a', strokeWidth: 2 }), ink([[740, 520], [1180, 520]], DIM, 2),
        ...[0, 1, 2].map(k => withAnims(ink([[790 + k * 150, 520], [800 + k * 150, 420], [810 + k * 150, 520]], PH, 3), A('fade-in', { start: 'withPrev', delay: 300 + k * 1200, duration: 120, sound: 'click' }))),
        readout('Un pulso por vuelta', 720, 590, 480, DIM, { textAlign: 'center' })],
        notes: 'Un clic: el haz da tres vueltas (una trayectoria quieta con giro de 1.080°) y cada vez que apunta a la Tierra aparece un pulso en la pantalla pequeña, con un clic de sonido (animaciones «con la anterior» y retardos de 0,3; 1,5 y 2,7 s). En la realidad el giro es en tres dimensiones.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'quiz', question: '¿Qué tamaño tiene una estrella de neutrones?', options: ['Como la Tierra', 'Como una ciudad, unos 20 km', 'Como un estadio de fútbol', 'Como el Sol'], correct: [1], time: 20, fontSize: 38, x: 70, y: 60, w: 1140, h: 600 })],
        notes: 'Concurso desde el móvil, con puntos por rapidez, justo antes de ver las medidas: la respuesta (unos 20 km de diámetro, con más masa que el Sol) sale en la diapositiva siguiente.' },
      { layout: 'blank', bg: BG, transition: 'slide', extra: [
        ...head('MEDIDAS DE UN MONSTRUO PEQUEÑO', 'MEDIDA · ESTRELLA DE NEUTRONES TÍPICA'),
        ...[['DIÁMETRO', '≈ 20 km', 'cabe dentro de una ciudad'], ['MASA', '1,4 soles', 'apretados en ese espacio'], ['UNA CUCHARADITA', '10⁹ t', 'mil millones de toneladas']].map(([l, v, s], i) =>
          withAnims(meas(l, v, s, 80, 170 + i * 150, 480, i === 2 ? AMB : PH), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'click' }))),
        chartBlock({ x: 620, y: 160, w: 580, h: 450, chartType: 'hbar', color: PH, dataLabels: true, xTitle: 'Vueltas por segundo',
          data: [{ label: 'J1748−2446ad', value: 716 }, { label: 'J0437−4715', value: 174 }, { label: 'Cangrejo', value: 30 }, { label: 'Vela', value: 11 }, { label: 'B1919+21', value: 0.75 }] })],
        notes: 'Un clic: las tres medidas entran como lecturas del osciloscopio, con un clic cada una. A la derecha, barras horizontales con las vueltas por segundo de cinco púlsares reales: el récord gira 716 veces por segundo. Valores redondeados.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        glow(90, 140, 500, '#8fd3ff', SCR, 40),
        N('crab-nebula', 60, 140, 560, 500, { view: 'three', spin: 14, edge: 'fade' }),
        ...head('EL CANGREJO: UN PÚLSAR CON NEBULOSA', 'M1 · CONSTELACIÓN DE TAURO'),
        ...[['AÑO', '1054', 'una «estrella invitada», visible de día'], ['PERIODO', '33,7 ms', 'unas 30 vueltas por segundo'], ['DISTANCIA', '6.500 a. l.', 'en nuestra galaxia']].map(([l, v, s], i) =>
          withAnims(meas(l, v, s, 680, 170 + i * 150, 520, i ? PH : AMB), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 400 })))],
        notes: 'Modelo 3D de la NASA (para imprimir) del corazón de la nebulosa del Cangrejo: el anillo y los dos chorros de partículas que lanza el púlsar. Es el resto de la supernova que los astrónomos chinos anotaron en 1054.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('SU EDAD, EN SU PERIODO'),
        mathBlock({ x: 80, y: 160, w: 460, h: 120, fontSize: 52, color: PH, latex: '\\tau = \\frac{P}{2\\,\\dot P}' }),
        text('El púlsar frena poco a poco: <b>P</b> es su periodo y <b>Ṗ</b> lo que se alarga cada segundo. Cuanto más lento frena, más viejo es.', 80, 300, 460, 200, { fontSize: 22, color: PH2 }),
        tableBlock({ x: 580, y: 170, w: 620, h: 330, fontSize: 21, header: true, fontFamily: M, stroke: '#2c8a5a', headBg: '#0b3a22', headFg: AMB, banded: true, band: PH, colW: [3.4, 2.8, 3, 4.6],
          rows: [['Púlsar', 'P (s)', 'Ṗ (×10⁻¹⁵)', 'Edad (años)'], ['Cangrejo', '0,0334', '420,9', '=REDONDEAR(B2/C2*15843000;0)'], ['Vela', '0,0893', '125', '=REDONDEAR(B3/C3*15843000;0)'],
            ['B1919+21', '1,3373', '1,35', '=REDONDEAR(B4/C4*15843000;0)'], ['J0437−4715', '0,005757', '0,0000573', '=REDONDEAR(B5/C5*15843000;0)']] }),
        text('La última columna es una fórmula: P ÷ (2 Ṗ), pasada de segundos a años. Es una edad aproximada: la del Cangrejo da 1.257 años y nació en 1054.', 580, 520, 620, 90, { fontSize: 18, color: DIM })],
        notes: 'La tabla calcula la edad característica con una fórmula (=B2/C2*15843000: el factor junta el 10⁻¹⁵ de Ṗ, el 2 y los segundos de un año). Cambia el periodo o el frenado y verás la nueva edad. Los púlsares de milisegundo, como J0437−4715, son viejísimos.' },
      { layout: 'blank', bg: BG, extra: [
        ...head('ASÍ SUENAN', 'CADA PULSO, UN CLIC: LA RADIO CONVERTIDA EN SONIDO'),
        readout('CH1 · B1919+21 · un pulso cada 1,337 s', 80, 190, 700, PH),
        ink([[80, 320], [1200, 320]], DIM, 2, { opacity: 70 }),
        ...Array.from({ length: 6 }, (_, k) => withAnims(ink([[150 + k * 180, 320], [160 + k * 180, 230], [170 + k * 180, 320]], PH, 3), A('fade-in', { start: k ? 'afterPrev' : 'click', delay: k ? 1237 : 0, duration: 100, sound: 'click' }))),
        readout('CH2 · Vela · un pulso cada 0,089 s', 80, 400, 700, AMB),
        ink([[80, 530], [1200, 530]], DIM, 2, { opacity: 70 }),
        ...Array.from({ length: 16 }, (_, k) => withAnims(ink([[130 + k * 66, 530], [138 + k * 66, 450], [146 + k * 66, 530]], AMB, 3), A('fade-in', { start: k ? 'afterPrev' : 'click', duration: 89, sound: 'click' }))),
        text('Uno late como un corazón en reposo; el otro zumba como un motor.', 80, 580, 1120, 40, { fontSize: 22, color: PH2, textAlign: 'center' })],
        notes: 'Dos clics, dos canales. En el primero, cada pulso aparece 1,337 s después del anterior con un clic de sonido: el ritmo real de B1919+21. En el segundo, los pulsos de Vela llegan cada 89 milisegundos y los clics se juntan en un zumbido.' },
      { layout: 'blank', bg: BG, transition: 'fade', extra: [
        ...head('UN MAPA PARA ENCONTRARNOS'),
        img(MAPSVG, 0, 0, 1280, 720, 'Mapa de púlsares: líneas desde el Sol hasta catorce púlsares'),
        withAnims(ink([[MX, MY], [MX + 260, MY]], AMB, 3), A('draw', { duration: 600 })),
        ...MAP.map((m, i) => withAnims(ink([[MX, MY], end(m)], PH, 2.5), A('draw', { start: 'afterPrev', duration: 160 }))),
        sphere(MX, MY, 7, '#ffffff', PH),
        readout('centro galáctico →', MX + 270, MY - 14, 190, AMB),
        N('pioneer-10', 840, 120, 360, 280, { view: 'front', spin: 14 }),
        text('Dos sondas que salen del sistema solar llevan grabado este mapa: el periodo de cada púlsar, en binario, en su línea. Quien lo encuentre podrá saber de dónde vienen.', 820, 420, 380, 200, { fontSize: 21, color: PH2 })],
        notes: 'Clic: se dibuja la línea al centro de la galaxia y después las catorce de los púlsares, una tras otra. El dibujo se inspira en el de las placas de las sondas Pioneer (modelo 3D de la NASA), sin ser una copia exacta. Hoy también se ensaya navegar con púlsares de rayos X.' },
      { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', extra: [
        withAnims(ink(signal(80, 1200, 470, 2000, 120, 12, 760, 4), PH, 3), A('draw', { start: 'afterPrev', duration: 2600 })),
        text('FIN DE LA SEÑAL', 80, 170, 1120, 110, { fontFamily: M, fontSize: 80, fontWeight: 700, textAlign: 'center', wordart: 'neon', wordartColor: PH }),
        text('Próxima sesión: las ráfagas rápidas de radio, un misterio de milisegundos', 80, 290, 1120, 50, { fontSize: 26, color: PH2, textAlign: 'center' }),
        text(NASA_CREDIT, 80, 600, 1120, 30, { fontSize: 15, color: DIM, textAlign: 'center' })],
        notes: 'Cierre: una línea casi plana que se traza sola y un único pulso, el último. Pide al grupo que busque grabaciones de púlsares convertidas en sonido.' },
    ]), PH2));
  } },

  // @@END
};
