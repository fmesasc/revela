// Example presentations: Actualidad (2). Temas concretos que se buscan ahora: la DANA, el gran apagón, el Mundial 2026,
// Halloween/Castañada/Día de Muertos y el cambio de hora. Each one: { name, summary, cat: 'edu', make() } → a deck (see kit.js).
// Material para ESO/Bachillerato/FP, neutral y plural. Dibujos propios (SVG como data URL, sin texto dentro: el texto va en
// bloques para poder traducirlo). Las cifras que cambian con el tiempo van marcadas como ejemplo o con la fuente donde comprobarlas.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d, deep } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
const FF = { mono: "'JetBrains Mono', monospace", space: "'Space Grotesk', sans-serif", caveat: "'Caveat', cursive", bebas: "'Bebas Neue', sans-serif" };
const ink = (deck, color) => Object.assign(deck, { textColor: color });
const cardBg = c => c.CARD || '#ffffff';
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 25, fontSize: 36, x: 70, y: 60, w: 1140, h: 600, ...props });
const poll = (question, options, props = {}) => pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560, question, options, ...props });
// A legend: a coloured dot and a label per row.
const legend = (items, x, y, w, color, fs = 24) => text(items.map(([c, l]) =>
  `<div style="margin:.18em 0"><span style="display:inline-block;width:.8em;height:.8em;border-radius:.22em;background:${c};margin-right:.5em;vertical-align:-1px"></span>${l}</div>`).join(''),
  x, y, w, items.length * fs * 1.7 + 10, { fontSize: fs, color });
// Free text in the deck's ink.
const para = (c, html, x, y, w, h, fs = 26, props = {}) => text(html, x, y, w, h, { fontSize: fs, color: c.INK, lineHeight: 1.42, ...props });
const small = (c, html, x, y, w, h = 44, fs = 21, props = {}) => text(html, x, y, w, h, { fontSize: fs, color: c.GREY, textAlign: 'center', ...props });
// A grid of cards [title, text, colour, icon?], shown one by one.
const grid = (c, items, { x = 90, y = 200, w = 1100, cols = 3, h = 200, gap = 24, fs = 21, tfs = 26 } = {}) => items.map(([t, d, col, name], i) => {
  const cw = (w - gap * (cols - 1)) / cols, cx = x + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (h + gap);
  const box = card(`<div style="font-size:${tfs}px;font-weight:700;color:${deep(col, cardBg(c))};${name ? 'padding-left:46px;min-height:36px' : ''}">${t}</div><span style="font-size:${fs}px;color:${c.INK}">${d}</span>`,
    cx, cy, cw, h, cardBg(c), { color: c.INK, radius: 16, borderColor: col, pad: [16, 20, 14, 20] });
  return name ? [on(box, 'fade-up'), along(icon(name, cx + 18, cy + 14, 34, col), 'fade-up')] : [on(box, 'fade-up')];
}).flat();
// The first slide: a small kicker, the title, a line and a drawing.
const cover = (c, kicker, title, sub, art, notes, o = {}) => ({ layout: 'blank', bg: c.PAPER, back: [glow(1000, -120, 620, c.A1, c.PAPER, 16), glow(-140, 560, 520, c.A2, c.PAPER, 12)], extra: [
  text(kicker, 90, 150, 760, 36, { fontSize: 22, letterSpacing: 3, color: deep(c.A1, c.PAPER), fontWeight: 700 }),
  text(title, 84, 198, o.tw || 735, o.th || 230, { fontSize: o.fs || 64, fontWeight: 800, color: c.INK, lineHeight: 1.04, fontFamily: FF.space }),
  text(sub, 90, o.sy || 460, 700, 130, { fontSize: 27, color: c.GREY, lineHeight: 1.4 }), ...[].concat(art)], notes });
const pollSlide = (c, question, options, notes) => ({ layout: 'blank', bg: c.PAPER, extra: [poll(question, options)], notes });
const quizSlide = (c, question, options, correct, notes) => ({ layout: 'blank', bg: c.QBG || c.PAPER, extra: [quiz(question, options, correct)], notes });
const reto = (c, title, body, side, notes) => ({ layout: 'blank', bg: c.PAPER, back: [glow(1000, 420, 520, c.A1, c.PAPER, 16)], transition: 'zoom', extra: [
  text(title, 84, 150, 880, 90, { fontSize: 54, fontWeight: 800, color: c.INK, fontFamily: FF.space }),
  text(body, 84, 260, 800, 300, { fontSize: 28, color: c.GREY, lineHeight: 1.45 }), side], notes });
const tbl = (c, rows, x, y, w, h, o = {}) => tableBlock({ x, y, w, h, fontSize: 23, header: true, headBg: c.A1, headFg: c.HEAD || '#ffffff', stroke: c.LINE, banded: true, band: c.LINE, bandAlpha: 0.12, color: c.INK, rows, ...o });
// A wave line (sea, jet stream…) as a closed or open path.
const cloudSvg = (col, w = 340) => svgURL(w, w * 0.6,
  `<g fill="${col}"><ellipse cx="${w * 0.3}" cy="${w * 0.36}" rx="${w * 0.24}" ry="${w * 0.17}"/><ellipse cx="${w * 0.52}" cy="${w * 0.27}" rx="${w * 0.25}" ry="${w * 0.2}"/><ellipse cx="${w * 0.72}" cy="${w * 0.38}" rx="${w * 0.22}" ry="${w * 0.16}"/><rect x="${w * 0.2}" y="${w * 0.36}" width="${w * 0.64}" height="${w * 0.17}" rx="${w * 0.08}"/></g>`);

export default {

  // 1 · La DANA: qué es, cómo se forma, los avisos de AEMET y cómo actuar.
  edu_actual_dana: { name: 'La DANA: qué es y cómo actuar', cat: 'edu', summary: 'Qué es una DANA (la «gota fría»): cómo se forma paso a paso con dibujos, por qué llueve tanto en tan poco tiempo, cómo leer los avisos de AEMET y el ES-Alert, qué hacer y qué no hacer, prevención y un reto para preparar tu plan', make: () => {
    const c = { PAPER: '#eaf2f8', INK: '#10243a', GREY: '#4a5f77', A1: '#2563c8', A2: '#1f8f8f', LINE: '#b9cde0', QBG: '#d9e7f3' };
    const BL = '#2563c8', TE = '#1f8f8f', AM = '#d98a1e', RE = '#d84b3f', GR = '#2e9e6b', YE = '#e0b21f', S = FF.space;
    // The cover: a rain cloud over a flooded street.
    const art = svgURL(380, 320,
      `<g fill="#5d7592"><ellipse cx="120" cy="100" rx="82" ry="52"/><ellipse cx="205" cy="72" rx="88" ry="62"/><ellipse cx="285" cy="108" rx="76" ry="48"/><rect x="80" y="100" width="240" height="52" rx="26"/></g>`
      + Array.from({ length: 9 }, (_, i) => `<path d="M${88 + i * 26} ${172 + (i % 2) * 14} l-10 36" stroke="#2563c8" stroke-width="6" stroke-linecap="round"/>`).join('')
      + `<polygon points="250,238 300,238 300,282 250,282" fill="#e9e1d3"/><polygon points="240,240 275,208 310,240" fill="#c0614a"/>`
      + `<path d="M0 272 C40 252 80 292 120 272 S200 252 240 272 S320 292 380 268 V320 H0 Z" fill="#2563c8" opacity=".88"/>`
      + `<path d="M0 296 C50 280 90 312 140 296 S240 280 290 296 S350 310 380 294 V320 H0 Z" fill="#1c4fa0" opacity=".9"/>`);
    // A small drawing of the jet stream for each step of how a DANA forms.
    const panel = k => svgURL(240, 170, `<rect x="2" y="2" width="236" height="166" rx="14" fill="#f7fbff" stroke="#b9cde0" stroke-width="3"/>`
      + ({
        1: `<path d="M14 85 C60 58 90 112 120 85 S180 58 226 85" stroke="#2563c8" stroke-width="8" fill="none" stroke-linecap="round"/>`,
        2: `<path d="M14 45 C80 45 96 138 126 138 S172 45 226 45" stroke="#2563c8" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="126" cy="106" rx="30" ry="22" fill="#7fb2ee" opacity=".7"/>`,
        3: `<path d="M14 45 C80 45 100 74 120 74 S160 45 226 45" stroke="#2563c8" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M92 82 C88 146 152 146 148 82 C140 94 100 94 92 82Z" fill="#7fb2ee" stroke="#2563c8" stroke-width="4"/>`,
        4: `<path d="M14 42 C80 36 160 50 226 42" stroke="#2563c8" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="120" cy="112" rx="44" ry="30" fill="#7fb2ee" stroke="#2563c8" stroke-width="4"/>`,
      })[k]);
    // The Mediterranean in autumn, in layers that appear one by one: warm sea, cold air above, storm.
    const W = 600, H = 430;
    const seaLayer = svgURL(W, H, `<rect x="0" y="330" width="${W}" height="100" fill="#f2a24f"/><path d="M0 332 C60 316 120 348 180 332 S300 316 360 332 S480 348 600 330" stroke="#ffd9a6" stroke-width="6" fill="none"/>`
      + `<path d="M0 372 C60 356 120 388 180 372 S300 356 360 372 S480 388 600 370" stroke="#ffd9a6" stroke-width="5" fill="none" opacity=".7"/>`, '#dcebf8');
    const warmLayer = svgURL(W, H, [110, 230, 350, 470].map(x => `<path d="M${x} 322 C${x - 22} 280 ${x + 22} 240 ${x} 196" stroke="#e5532d" stroke-width="9" fill="none" stroke-linecap="round"/><polygon points="${x - 15},204 ${x + 15},204 ${x},176" fill="#e5532d"/>`).join(''));
    const coldLayer = svgURL(W, H, `<ellipse cx="300" cy="62" rx="210" ry="50" fill="#5d9be6" opacity=".9" stroke="#2563c8" stroke-width="5"/>`
      + [150, 230, 300, 370, 450].map(x => `<path d="M${x} 118 v28" stroke="#2563c8" stroke-width="6" stroke-linecap="round"/><polygon points="${x - 10},140 ${x + 10},140 ${x},158" fill="#2563c8"/>`).join(''));
    const stormLayer = svgURL(W, H, `<g fill="#4c5f78"><ellipse cx="220" cy="200" rx="110" ry="46"/><ellipse cx="330" cy="168" rx="120" ry="58"/><ellipse cx="420" cy="206" rx="96" ry="42"/><rect x="150" y="200" width="330" height="50" rx="25"/></g>`
      + Array.from({ length: 11 }, (_, i) => `<path d="M${170 + i * 28} ${262 + (i % 2) * 14} l-9 38" stroke="#2563c8" stroke-width="6" stroke-linecap="round"/>`).join('')
      + `<polygon points="318,244 286,296 312,296 296,336 346,274 320,274 336,244" fill="#f2c230"/>`);
    // A dry ramblas valley that fills in minutes.
    const valley = svgURL(700, 420,
      `<rect width="700" height="420" fill="#e4eff9"/><polygon points="0,420 0,110 90,50 190,140 260,100 330,220 420,290 520,330 700,340 700,420" fill="#8fae86"/>`
      + `<path d="M150 150 C260 200 330 250 450 300 S600 350 690 358" stroke="#dbc58f" stroke-width="30" fill="none" stroke-linecap="round"/>`
      + [[520, 296], [560, 310], [600, 300], [640, 318]].map(([x, y]) => `<rect x="${x}" y="${y}" width="30" height="26" fill="#efe7da"/><polygon points="${x - 4},${y} ${x + 15},${y - 16} ${x + 34},${y}" fill="#c0614a"/>`).join(''));
    return numbered(ink(build({ name: 'La DANA: qué es y cómo actuar', palette: 'ocean', fonts: 'modern', title: { color: c.INK, size: 48 }, body: { color: c.INK } }, [
      cover(c, 'ACTUALIDAD · TIEMPO Y SEGURIDAD', 'La DANA:<br>qué es y cómo actuar', 'La «gota fría» en cinco minutos: por qué se forma, cómo se avisa y qué hacer para estar a salvo.',
        after(img(art, 830, 215, 380, 320, 'Una nube de lluvia sobre una calle inundada'), 'fade-up', { duration: 800 }),
        'Arranque. DANA = Depresión Aislada en Niveles Altos. Es el tema de moda por las inundaciones de otoño en el Mediterráneo (por ejemplo, la de Valencia del 29 de octubre de 2024). Objetivo: entender el fenómeno y saber actuar.'),
      { title: 'Qué significa DANA', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...grid(c, [['Depresión', 'Una zona de presión baja: el aire sube y se forman nubes y tormentas.', BL, 'cloud'], ['Aislada', 'Se separa de la corriente principal de aire (la corriente en chorro) y queda «suelta».', TE, 'wind'], ['Niveles Altos', 'Ocurre a gran altura, entre 5 y 10 km: allí hay una bolsa de aire muy frío.', AM, 'thermometer']], { y: 200, h: 230 }),
        para(c, 'Mucha gente la llama <b>«gota fría»</b>: es lo mismo, aunque DANA es el nombre que usan los meteorólogos.', 90, 480, 1100, 90, 26, { textAlign: 'center' })],
        notes: 'Desglosar la sigla letra a letra. Gota fría es el nombre popular. Una DANA no es una tormenta concreta: es la situación de la atmósfera que favorece tormentas fuertes y persistentes.' },
      { title: 'Cómo se forma, paso a paso', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...[['1 · La corriente en chorro, un río de aire rápido en altura, ondula.', 1], ['2 · Una ondulación baja mucho hacia el sur y arrastra aire frío.', 2], ['3 · La parte de abajo se estrangula y se desprende.', 3], ['4 · Queda una bolsa de aire frío aislada sobre nosotros.', 4]].map(([t, k], i) => {
          const x = 90 + i * 280; return [on(img(panel(k), x, 200, 255, 180, 'Dibujo del paso ' + k), 'fade-up'), along(para(c, t, x, 395, 255, 150, 22), 'fade-up')]; }).flat(),
        small(c, 'Dibujos esquemáticos: la línea azul es la corriente en chorro; el óvalo, el aire frío.', 90, 590, 1100)],
        notes: 'Revelar un panel por clic. La corriente en chorro circula de oeste a este por encima de nosotros. Cuando ondula mucho, puede soltar una bolsa de aire frío que se queda «aislada» en altura y se mueve despacio.' },
      { title: 'El ingrediente local: el mar caliente', layout: 'titleOnly', bg: c.PAPER, extra: [
        img(seaLayer, 70, 190, 600, 430, 'Dibujo del mar y el cielo'),
        on(img(warmLayer, 70, 190, 600, 430, 'Aire cálido y húmedo que sube desde el mar'), 'fade-up'),
        on(img(coldLayer, 70, 190, 600, 430, 'Bolsa de aire frío en altura'), 'fade-down'),
        on(img(stormLayer, 70, 190, 600, 430, 'Tormenta con rayos y lluvia'), 'zoom-in'),
        on(card('<b style="color:' + deep(RE, '#fff') + '">Abajo, un mar cálido.</b> A final del verano y en otoño el agua del Mediterráneo suele superar los 25 °C y cede mucha humedad al aire.', 700, 200, 490, 130, '#ffffff', { color: c.INK, fontSize: 21, radius: 16, borderColor: RE, pad: [14, 18, 12, 18] }), 'fade-left'),
        on(card('<b style="color:' + deep(BL, '#fff') + '">Arriba, aire muy frío.</b> La bolsa de la DANA enfría la atmósfera en altura.', 700, 345, 490, 100, '#ffffff', { color: c.INK, fontSize: 21, radius: 16, borderColor: BL, pad: [14, 18, 12, 18] }), 'fade-left'),
        on(card('<b style="color:' + deep(AM, '#fff') + '">Resultado.</b> El aire cálido y húmedo sube con fuerza al encontrar aire frío: tormentas enormes, lentas y muy cargadas de agua.', 700, 460, 490, 150, '#ffffff', { color: c.INK, fontSize: 21, radius: 16, borderColor: AM, pad: [14, 18, 12, 18] }), 'fade-left')],
        notes: 'Tres clics: aire cálido, aire frío, tormenta. La clave es el contraste: cuanto más caliente el mar y más frío el aire de arriba, más inestable la atmósfera. Dato a comprobar: temperatura del mar en la web de AEMET o Puertos del Estado.' },
      { title: 'Por qué llueve tanto en tan poco tiempo', layout: 'titleOnly', bg: c.PAPER, extra: [
        chartBlock({ x: 80, y: 180, w: 700, h: 440, chartType: 'hbar', color: BL, dataLabels: true, grid: true, labelWidth: 38, xTitle: 'litros por metro cuadrado (mm)', seriesName: 'mm',
          data: [{ label: 'Un día normal de lluvia', value: 15, color: '#8fb4e6' }, { label: 'Lluvia de un año entero', value: 450, color: '#4f86d6' }, { label: 'Ocho horas de DANA, en el punto más afectado', value: 491, color: RE }] }),
        para(c, '<b>1 mm = 1 litro por metro cuadrado.</b><br>491 l/m² serían casi <b>medio metro</b> de agua si no se escapara.', 810, 210, 380, 190, 25),
        after(para(c, 'Cifras de ejemplo del episodio del 29 de octubre de 2024 en la zona de Valencia. Actualiza y comprueba en AEMET.', 810, 430, 380, 160, 20, { color: c.GREY }), 'fade-in')],
        notes: 'Comparar: en unas horas cayó más agua de la que suele llover en un año en esa zona (el pluviómetro de Chiva registró 491 mm en 8 horas según AEMET; comprueba el dato más reciente en aemet.es). La lluvia no es lo único: también cuenta que la tormenta se queda quieta sobre el mismo sitio.' },
      { title: 'Del barranco a la calle', layout: 'titleOnly', bg: c.PAPER, extra: [
        img(valley, 70, 190, 700, 420, 'Una montaña, una rambla seca y un pueblo en la parte baja'),
        withAnims(shape('ellipse', 195, 326, 50, 28, '#2f7de0', { opacity: 85 }), A('fade-in'), A('path', { start: 'afterPrev', pathShape: 'custom', points: [[0, 0], [110, 50], [180, 100], [300, 150], [540, 208]], dx: 540, dy: 208, duration: 3200 })),
        ...grid(c, [['Cuencas empinadas', 'El agua baja rápido y se junta en minutos.', BL], ['Ramblas secas', 'Casi siempre sin agua: parecen seguras.', AM], ['Suelo sellado', 'El asfalto no deja que el agua se filtre.', TE]], { x: 800, y: 200, w: 390, cols: 1, h: 130, gap: 16, fs: 19, tfs: 22 })],
        notes: 'Pulsar: el agua baja por la rambla hasta el pueblo. Explicar que una rambla seca no es una calle: es un cauce. Las crecidas repentinas (flash floods) llegan sin lluvia local, porque ha llovido más arriba.' },
      { title: 'Los avisos de AEMET', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...[['Verde', 'No hay riesgo meteorológico.', GR], ['Amarillo', 'Sin riesgo general, pero sí para actividades concretas.', YE], ['Naranja', 'Riesgo meteorológico importante.', AM], ['Rojo', 'Riesgo meteorológico extremo: peligro para todos.', RE]].map(([t, d, col], i) => { const y = 190 + i * 104; return [
          on(shape('ellipse', 90, y + 6, 64, 64, col), 'fade-right'),
          along(para(c, `<b style="color:${deep(col, c.PAPER)};font-size:30px">${t}</b><br><span style="font-size:22px">${d}</span>`, 175, y, 590, 90, 24), 'fade-right')]; }).flat(),
        card('<b style="font-size:26px">ES-Alert</b><br>Si tu móvil suena con un mensaje de <b>ES-Alert</b>, léelo y actúa en el momento: llega por tu zona.<br><br>Consulta los avisos en <b>aemet.es</b> y en su app, y las órdenes de Protección Civil.', 810, 190, 380, 400, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: BL, pad: [18, 22, 16, 22] })],
        notes: 'Los avisos se dan por zonas y por fenómeno (lluvia, viento, costeros, nieve…). Los umbrales de lluvia dependen de cada zona. Ojo: el color no lo es todo; con aviso amarillo también hay que informarse. Fuente: AEMET (Meteoalerta) y Protección Civil.' },
      { title: 'Qué hacer y qué no hacer', layout: 'titleOnly', bg: c.PAPER, extra: [
        on(card('<b style="font-size:30px;color:' + deep(GR, '#fff') + '">Sí</b>' + ul('Sube a una planta alta y quédate allí', 'Infórmate: 112, ES-Alert, radio y Protección Civil', 'Aléjate de ramblas, cauces, puentes y bajos', 'Ten lista una mochila de emergencia', 'Ayuda a vecinos mayores si puedes hacerlo sin riesgo'), 90, 190, 540, 420, '#ffffff', { color: c.INK, fontSize: 23, radius: 16, borderColor: GR, pad: [18, 22, 12, 22] }), 'fade-right'),
        on(card('<b style="font-size:30px;color:' + deep(RE, '#fff') + '">No</b>' + ul('No cruces ramblas, vados ni calles inundadas, a pie o en coche', 'No bajes a garajes ni a sótanos', 'No cojas el coche si no es imprescindible', 'No te acerques a mirar o a grabar vídeos', 'No compartas bulos ni mensajes sin comprobar'), 650, 190, 540, 420, '#ffffff', { color: c.INK, fontSize: 23, radius: 16, borderColor: RE, pad: [18, 22, 12, 22] }), 'fade-left')],
        notes: 'Recomendaciones de Protección Civil. Unos 30 cm de agua en movimiento pueden arrastrar un coche (dato orientativo). El 112 es para emergencias reales: no lo satures para preguntar. Seguir siempre las indicaciones de las autoridades de tu zona.' },
      { title: 'Prevenir también es urbanismo', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...grid(c, [['Mapas de zonas inundables', 'Saber dónde puede llegar el agua antes de construir.', BL, 'map'], ['Respetar los cauces', 'Ramblas y barrancos necesitan espacio para llevar el agua.', TE, 'droplet'], ['Ciudades esponja', 'Parques y suelos que absorben agua en vez de asfalto.', GR, 'leaf'], ['Alerta y simulacros', 'Avisos claros y practicar qué hacer en el centro educativo.', AM, 'megaphone'], ['Planes de emergencia', 'Cada municipio y cada centro deben tener el suyo.', BL, 'shield-check'], ['Seguros', 'El Consorcio de Compensación de Seguros cubre inundaciones si hay póliza.', TE, 'home']], { y: 190, h: 200, gap: 20, fs: 20, tfs: 24 })],
        notes: 'Se debate cómo combinar vivienda, obras de defensa (presas, encauzamientos) y renaturalización de cauces. Presentar las posturas sin decantarse: lo que importa es que el alumnado entienda que la prevención tiene muchas piezas.' },
      pollSlide(c, '¿Sabes cuál es el plan de emergencia de tu centro?', ['Sí, lo conozco', 'Sé que existe, pero no lo recuerdo', 'No lo sé', 'Nunca hemos hecho un simulacro'],
        'Votación. Si muchos dicen «no lo sé», conviene repasar el plan del centro y el punto de reunión.'),
      quizSlide(c, 'Hay aviso rojo y ves una rambla seca. ¿Qué haces?', ['La cruzo rápido, que está seca', 'La uso como atajo', 'Me alejo y me pongo en un lugar alto y seguro', 'Me acerco a grabar un vídeo'], 2,
        'Una rambla seca puede llenarse en minutos. La respuesta correcta es alejarse y buscar un lugar alto.'),
      reto(c, 'Tu plan personal', 'Dibuja el camino de casa al instituto y marca ramblas, bajos y puntos altos. Prepara con tu familia una mochila de emergencia: agua, linterna, radio, cargador, documentos y medicación.',
        timer(300, 940, 240, 300, { color: BL, endText: '¡Plan listo!' }), 'Reto para casa: ruta con puntos de riesgo y mochila de emergencia. Compartir en clase los puntos altos de cada zona.'),
    ]), c.INK));
  } },

  // 2 · El gran apagón eléctrico del 28 de abril de 2025: qué pasó, cómo funciona la red y cómo prepararse.
  edu_actual_apagon: { name: 'El gran apagón eléctrico: qué pasó y cómo prepararse', cat: 'edu', summary: 'El apagón ibérico del 28 de abril de 2025 explicado: qué pasó, cómo llega la electricidad a casa, por qué debe haber equilibrio entre generación y consumo, cómo se cae una red y se reinicia, qué dicen los informes y cómo preparar un kit de emergencia en casa', make: () => {
    const c = { PAPER: '#0f1522', INK: '#e8eef9', GREY: '#a8b6cc', CARD: '#1a2335', A1: '#f2b632', A2: '#3b82f6', LINE: '#3a4a68', HEAD: '#0f1522', QBG: '#151d30' };
    const AM = '#f2b632', BL = '#5b9bf5', GR = '#4cc38a', RE = '#f0645a', TE = '#3fc1c9', S = FF.space;
    // A city at night: some windows lit, most dark.
    const lit = [[1, 1], [3, 0], [2, 3], [5, 2], [6, 4], [8, 1], [9, 3], [11, 0], [12, 2]];
    const sky = svgURL(400, 320,
      `<circle cx="318" cy="64" r="30" fill="#e8eef9"/><circle cx="332" cy="56" r="28" fill="#0f1522"/>`
      + [[10, 150, 70, 170], [88, 90, 62, 230], [158, 130, 80, 190], [246, 60, 64, 260], [318, 120, 72, 200]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1c2840"/>`
        + Array.from({ length: Math.floor(h / 34) * 2 }, (_, i) => { const cx = x + 12 + (i % 2) * (w / 2 - 6), cy = y + 14 + Math.floor(i / 2) * 34; return `<rect x="${cx}" y="${cy}" width="14" height="18" fill="${(x + i * 7) % 5 === 0 ? '#f2b632' : '#26344f'}"/>`; }).join('')).join('')
      + `<path d="M0 318 H400" stroke="#3a4a68" stroke-width="4"/>`);
    // The balance of generation and consumption: level, then tilted.
    const scale = tilt => svgURL(420, 300,
      `<rect x="190" y="120" width="40" height="150" rx="6" fill="#51627f"/><rect x="130" y="262" width="160" height="22" rx="8" fill="#51627f"/>`
      + `<g transform="rotate(${tilt} 210 120)"><rect x="40" y="112" width="340" height="14" rx="7" fill="#c7d3e6"/>`
      + `<path d="M60 126 L32 210 H128 Z" fill="none" stroke="#c7d3e6" stroke-width="4"/><path d="M360 126 L332 210 H428 Z" fill="none" stroke="#c7d3e6" stroke-width="4" transform="translate(-36 0)"/>`
      + `<ellipse cx="80" cy="214" rx="56" ry="12" fill="#f2b632"/><polygon points="86,150 66,190 82,190 74,214 100,172 84,172" fill="#f2b632" stroke="#f2b632"/>`
      + `<ellipse cx="340" cy="214" rx="56" ry="12" fill="#5b9bf5"/><polygon points="296,208 340,172 384,208" fill="#5b9bf5"/><rect x="310" y="204" width="60" height="10" fill="#5b9bf5"/></g>`
      + `<circle cx="210" cy="120" r="12" fill="#f2b632"/>`);
    // Dominoes: standing, then fallen one after another.
    const dominoes = fallen => svgURL(520, 230, Array.from({ length: 7 }, (_, i) => {
      const x = 40 + i * 64, ang = fallen ? [0, 8, 20, 34, 50, 66, 80][i] : 0;
      return `<g transform="rotate(${ang} ${x + 40} 200)"><rect x="${x}" y="80" width="26" height="120" rx="5" fill="${i === 0 ? '#f0645a' : '#e8eef9'}" stroke="#51627f" stroke-width="3"/><circle cx="${x + 13}" cy="112" r="5" fill="#0f1522"/><circle cx="${x + 13}" cy="160" r="5" fill="#0f1522"/></g>`; }).join('') + `<path d="M10 202 H510" stroke="#51627f" stroke-width="4"/>`);
    const tbs = { fontSize: 22 };
    return numbered(ink(build({ name: 'El gran apagón eléctrico', palette: 'midnight', fonts: 'modern', title: { color: c.INK, size: 48 }, body: { color: c.INK } }, [
      cover(c, 'ACTUALIDAD · ENERGÍA', 'El gran apagón:<br>qué pasó y cómo prepararse', 'El 28 de abril de 2025 se fue la luz en toda la península ibérica. Entendamos cómo funciona la red y cómo estar listos.',
        after(img(sky, 820, 200, 400, 320, 'Una ciudad de noche con casi todas las ventanas a oscuras'), 'fade-up', { duration: 900 }),
        'Arranque. Tema de interés general y muy buscado. Reglas: solo hechos establecidos, sin atribuir culpas. Los informes oficiales (Red Eléctrica, ENTSO-E, Gobierno) están públicos: comprueba su versión más reciente.', { fs: 60 }),
      { title: 'Qué pasó el 28 de abril de 2025', layout: 'titleOnly', bg: c.PAPER, extra: [
        dg('timeline', '12:33\n  Se cae el sistema eléctrico de la España peninsular y de Portugal\nMinutos después\n  Se reconectan las primeras líneas con Francia y Marruecos\nTarde\n  Arrancan centrales hidroeléctricas para reiniciar la red\nNoche\n  Vuelve la luz a la mayoría de hogares\nMadrugada del 29\n  Red de transporte restablecida', 90, 190, 1100, 420, { colors: 'accent', oneByOne: true }),
        small(c, 'Horas aproximadas según los informes preliminares. Comprueba el detalle en los informes oficiales.', 90, 625, 1100, 40, 19)],
        notes: 'Línea de tiempo. A las 12:33 (hora peninsular) el sistema ibérico colapsó. La reconexión con Francia empezó pocos minutos después (alrededor de las 12:44) y la red de transporte quedó restablecida en Portugal a las 00:22 y en España hacia las 04:00 del día siguiente, según el informe del panel de expertos de ENTSO-E. Comprueba las cifras en entsoe.eu y en Red Eléctrica.' },
      { title: 'Qué dejó de funcionar', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...grid(c, [['Transporte', 'Trenes parados, semáforos apagados y atascos en las ciudades.', AM, 'train-front'], ['Comunicaciones', 'Móviles e internet fallaron o se saturaron al agotarse las baterías.', BL, 'smartphone'], ['Comercios y pagos', 'Sin datáfono ni cajeros: se volvió al efectivo.', GR, 'credit-card'], ['Hospitales', 'Funcionaron con generadores propios; los servicios no urgentes se resintieron.', RE, 'hospital'], ['Agua y ascensores', 'Bombas sin energía y ascensores parados en edificios.', TE, 'droplet'], ['Información', 'Quien tenía una radio de pilas se enteró antes de lo que pasaba.', AM, 'volume-2']], { y: 190, h: 200, gap: 20, fs: 20, tfs: 24 })],
        notes: 'Qué servicios dependen de la electricidad sin que lo pensemos. Importante: servicios esenciales (hospitales, emergencias) tienen sistemas de respaldo (generadores, baterías) con autonomía limitada.' },
      { title: 'Cómo llega la luz hasta tu casa', layout: 'titleOnly', bg: c.PAPER, extra: [
        dg('chevrons', 'Generación\n  Centrales, parques eólicos y solares\nTransporte\n  Líneas de alta tensión (400 y 220 kV)\nDistribución\n  Redes de media y baja tensión\nConsumo\n  Hogares, hospitales, industria', 90, 200, 1100, 300, { colors: 'accent', oneByOne: true }),
        para(c, 'La electricidad <b>casi no se guarda</b>: en cada instante tiene que producirse justo lo que se consume.', 90, 540, 1100, 80, 27, { textAlign: 'center' })],
        notes: 'La red es como un circuito gigantesco. Las baterías y los embalses reversibles almacenan una parte pequeña; casi toda se produce al instante.' },
      { title: 'El equilibrio: generación y consumo', layout: 'titleOnly', bg: c.PAPER, extra: [
        (() => { const t = on(img(scale(-7), 70, 215, 440, 314, 'La balanza se inclina: sobra generación'), 'fade-in'); return [along(img(scale(0), 70, 215, 440, 314, 'Una balanza equilibrada: generación y consumo'), 'fade-out'), t]; })(),
        card('<b style="font-size:26px;color:' + AM + '">50 Hz</b><br>Es la «frecuencia» de la red europea. Mientras la generación iguala al consumo, se mantiene estable.', 540, 200, 650, 130, c.CARD, { color: c.INK, fontSize: 22, radius: 16, borderColor: AM, pad: [14, 22, 12, 22] }),
        on(card('<b style="font-size:26px;color:' + BL + '">Si se rompe el equilibrio</b><br>Si sobra generación, la frecuencia sube; si falta, baja. También hay que mantener la <b>tensión</b> (los voltios) dentro de sus límites.', 540, 350, 650, 150, c.CARD, { color: c.INK, fontSize: 22, radius: 16, borderColor: BL, pad: [14, 22, 12, 22] }), 'fade-left'),
        after(card('<b style="font-size:26px;color:' + GR + '">Protecciones</b><br>Si algo sale de los márgenes, las protecciones desconectan equipos para evitar daños graves.', 540, 520, 650, 130, c.CARD, { color: c.INK, fontSize: 22, radius: 16, borderColor: GR, pad: [14, 22, 12, 22] }), 'fade-left')].flat(),
        notes: 'Pulsar: la balanza se inclina. Frecuencia y tensión son dos magnitudes distintas. Las protecciones existen para que una avería no destruya los equipos, pero al desconectar generación pueden empeorar el desequilibrio si se encadenan.' },
      { title: 'Por qué una red puede caerse', layout: 'titleOnly', bg: c.PAPER, extra: [
        along(img(dominoes(false), 70, 230, 520, 230, 'Fichas de dominó en pie'), 'fade-out'),
        on(img(dominoes(true), 70, 230, 520, 230, 'Fichas de dominó cayendo una tras otra'), 'fade-in'),
        para(c, '<b>Efecto dominó</b><br>1 · Un desajuste (de tensión o de frecuencia).<br>2 · Las protecciones desconectan centrales para cuidarlas.<br>3 · Con menos generación, el desajuste crece.<br>4 · Se desconectan más equipos… y el sistema se apaga.', 630, 200, 560, 300, 24),
        small(c, 'En el 28-A, los informes hablan de varios factores que se influyeron entre sí. Compruébalo en las fuentes oficiales.', 90, 560, 1100, 70, 21)],
        notes: 'Pulsar una vez: las fichas caen. Es una analogía, no un modelo exacto. El informe final del panel de expertos de ENTSO-E (marzo de 2026) describe una secuencia de sobretensiones y desconexiones en cascada por varios factores y no señala culpables. Verifica el texto en entsoe.eu.' },
      { title: 'Qué sabemos y qué conviene comprobar', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...grid(c, [['Establecido', 'Ocurrió hacia las 12:33; afectó a la España peninsular y a Portugal; la red se reinició en horas, con ayuda de Francia y Marruecos.', GR, 'circle-check'], ['Analizado por expertos', 'Informes oficiales (ENTSO-E y otros) apuntan a varios factores interrelacionados: control de tensión y desconexiones en cascada.', BL, 'search'], ['Para contrastar', 'Compara con fuentes oficiales (Red Eléctrica, ENTSO-E, Gobierno) y desconfía de mensajes que culpan sin pruebas.', AM, 'newspaper']], { y: 200, h: 330, fs: 21 })],
        notes: 'Evitar atribuir culpas. Es una buena ocasión para practicar la lectura crítica: ¿qué dice el informe y qué dicen los titulares? Datos a comprobar: la versión final de los informes y las fechas de publicación.' },
      { title: 'El arranque en negro', layout: 'titleOnly', bg: c.PAPER, extra: [
        dg('steps', 'Centrales con arranque autónomo\n  Sobre todo hidroeléctricas: arrancan sin necesitar la red\nEnergizar las líneas poco a poco\n  La tensión se «tiende» por la red de transporte\nConectar subestaciones y consumos\n  De forma gradual, para no volver a desequilibrar\nSincronizar con las redes vecinas\n  Francia, Marruecos y Portugal ayudan', 90, 190, 1100, 440, { colors: 'accent', oneByOne: true })],
        notes: 'Un “arranque en negro” es reiniciar el sistema desde cero. No se puede encender todo a la vez: se hace por zonas y por pasos.' },
      { title: 'El kit de emergencia en casa', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...grid(c, [['Radio de pilas', 'Para seguir las noticias aunque no haya móvil ni internet.', AM, 'volume-2'], ['Linterna', 'Y pilas de repuesto. Mejor que las velas.', BL, 'lightbulb'], ['Cargador externo', 'Una batería externa cargada para el móvil.', GR, 'battery-full'], ['Agua y comida', 'Para unos 3 días, que no necesite nevera ni cocinar.', TE, 'droplet'], ['Botiquín y medicación', 'Con la medicación habitual y un listado de teléfonos.', RE, 'pill'], ['Efectivo', 'Billetes pequeños para comprar si no funcionan las tarjetas.', AM, 'euro'], ['Teléfonos en papel', 'Familia, centro de salud y vecinos, apuntados.', BL, 'phone'], ['Documentos', 'Copias de lo importante en una carpeta a mano.', GR, 'folder']], { cols: 4, y: 190, h: 205, gap: 20, fs: 19, tfs: 22 })],
        notes: 'Recomendaciones habituales de Protección Civil para emergencias: autonomía de unas 72 horas. Adaptarlo a cada hogar (bebés, mascotas, personas con equipos médicos que necesitan electricidad).' },
      { title: 'Durante un apagón: sí y no', layout: 'titleOnly', bg: c.PAPER, extra: [
        on(card('<b style="font-size:30px;color:' + GR + '">Sí</b>' + ul('Usa linternas, no velas', 'Mantén cerrados la nevera y el congelador', 'Desconecta aparatos delicados para evitar picos al volver la luz', 'Escucha la radio y sigue las indicaciones oficiales', 'Fíjate en vecinos mayores o con equipos médicos'), 90, 190, 540, 430, c.CARD, { color: c.INK, fontSize: 23, radius: 16, borderColor: GR, pad: [18, 22, 12, 22] }), 'fade-right'),
        on(card('<b style="font-size:30px;color:' + RE + '">No</b>' + ul('No uses generadores, braseros ni barbacoas dentro de casa: riesgo de monóxido de carbono', 'No cojas el coche si no es necesario: los semáforos pueden estar apagados', 'No llames al 112 salvo emergencia real', 'No abras la nevera sin necesidad'), 650, 190, 540, 430, c.CARD, { color: c.INK, fontSize: 23, radius: 16, borderColor: RE, pad: [18, 22, 12, 22] }), 'fade-left')],
        notes: 'El monóxido de carbono no se ve ni huele: nunca generadores ni braseros dentro. Mantener libres las líneas de emergencia. Fuente: Protección Civil y servicios de emergencia.' },
      pollSlide(c, '¿Qué te habría costado más estar sin luz?', ['Sin móvil ni internet', 'Sin poder pagar con tarjeta', 'Sin información de lo que pasaba', 'Sin luz y sin calefacción o aire'],
        'Votación. Sirve para hablar de dependencia tecnológica y de hacer un plan sin móvil.'),
      quizSlide(c, 'Si en la red se genera más electricidad de la que se consume, ¿qué pasa con la frecuencia?', ['Sube', 'Baja', 'No cambia nunca', 'Se vuelve cero'], 0,
        'Sobra generación: la frecuencia sube. Si falta, baja. Las protecciones actúan cuando se sale de los márgenes.'),
      reto(c, 'El plan de tu casa', 'Revisad en familia: ¿tenéis radio de pilas y linterna? ¿Dónde os reunís si no hay móviles? ¿Quién vive cerca y puede necesitar ayuda? Escribid vuestro plan en una hoja.',
        timer(300, 940, 240, 300, { color: AM, endText: '¡Plan en marcha!' }), 'Reto para casa: kit y plan familiar, punto de encuentro sin móviles y lista de vecinos que podrían necesitar ayuda.'),
    ]), c.INK));
  } },

  // 3 · Mundial de fútbol 2026: formato, sedes, matemáticas y geografía (sin resultados ni campeón).
  edu_actual_mundial: { name: 'Mundial de fútbol 2026: sedes, formato y matemáticas', cat: 'edu', summary: 'El Mundial 2026 (Estados Unidos, México y Canadá) para clase: las 16 sedes, el nuevo formato de 48 equipos y cómo pasan de fase, cuántos partidos hay, probabilidades de ejemplo, husos horarios, historia y una tabla de grupo para calcular, sin resultados reales', make: () => {
    const c = { PAPER: '#eef6ec', INK: '#10281a', GREY: '#4a6452', A1: '#1f8f4a', A2: '#2563c8', LINE: '#b9d4bf', QBG: '#dcecde' };
    const GR = '#1f8f4a', BL = '#2563c8', RE = '#d9453b', AM = '#b9770e', TE = '#1f8f8f', S = FF.space;
    // A football.
    const pent = (cx, cy, r, rot) => Array.from({ length: 5 }, (_, i) => { const a = (rot + i * 72) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
    const pts = p => p.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ');
    const ballBody = (() => {
      const mid = pent(150, 150, 38, -90);
      const outer = Array.from({ length: 5 }, (_, k) => pent(150 + 118 * Math.cos((-90 + k * 72) * Math.PI / 180), 150 + 118 * Math.sin((-90 + k * 72) * Math.PI / 180), 38, -90 + k * 72 + 180));
      return `<defs><clipPath id="b"><circle cx="150" cy="150" r="130"/></clipPath></defs><circle cx="150" cy="150" r="130" fill="#ffffff"/>`
        + `<g clip-path="url(#b)"><polygon points="${pts(mid)}" fill="#14211a"/>`
        + outer.map(o => `<polygon points="${pts(o)}" fill="#14211a"/>`).join('')
        + mid.map((m, i) => { const o = outer[i][2]; return `<path d="M${m[0].toFixed(1)} ${m[1].toFixed(1)} L${o[0].toFixed(1)} ${o[1].toFixed(1)}" stroke="#14211a" stroke-width="5"/>`; }).join('') + `</g>`
        + `<circle cx="150" cy="150" r="130" fill="none" stroke="#14211a" stroke-width="7"/>`;
    })();
    const ball = svgURL(300, 300, ballBody);
    const pitch = svgURL(380, 250, `<rect x="4" y="4" width="372" height="242" rx="12" fill="#2f9d5a" stroke="#ffffff" stroke-width="5"/><path d="M190 4 V246" stroke="#fff" stroke-width="5"/><circle cx="190" cy="125" r="40" fill="none" stroke="#fff" stroke-width="5"/>`
      + `<rect x="4" y="75" width="60" height="100" fill="none" stroke="#fff" stroke-width="5"/><rect x="316" y="75" width="60" height="100" fill="none" stroke="#fff" stroke-width="5"/>`);
    const fact = (n, label, col, x) => on(card(`<div style="font-size:84px;font-weight:800;color:${deep(col, '#fff', 4.5)};line-height:1;font-family:${S}">${n}</div><div style="font-size:24px;color:${c.INK}">${label}</div>`, x, 230, 255, 230, '#ffffff', { color: c.INK, radius: 16, borderColor: col, textAlign: 'center', pad: [30, 12, 12, 12] }), 'zoom-in');
    return numbered(ink(build({ name: 'Mundial de fútbol 2026', palette: 'forest', fonts: 'bold', title: { color: c.INK, size: 48 }, body: { color: c.INK } }, [
      cover(c, 'ACTUALIDAD · DEPORTE', 'Mundial de fútbol 2026', 'Tres países, 16 sedes y 48 equipos: geografía, matemáticas y probabilidad con el torneo más grande de la historia.',
        after(img(ball, 880, 230, 300, 300, 'Un balón de fútbol'), 'zoom-in', { duration: 800 }),
        'Arranque. Plantilla para clase sin resultados reales: sirve antes, durante y después del torneo. Fechas del torneo: del 11 de junio al 19 de julio de 2026 (comprueba el calendario oficial en fifa.com).', { fs: 70 }),
      { title: 'El Mundial 2026 en una ficha', layout: 'titleOnly', bg: c.PAPER, extra: [
        fact('48', 'selecciones (antes eran 32)', GR, 90), fact('104', 'partidos en total', BL, 365), fact('16', 'ciudades sede', RE, 640), fact('3', 'países anfitriones', AM, 915),
        small(c, 'Del 11 de junio al 19 de julio de 2026 · Estados Unidos, México y Canadá', 90, 500, 1100, 44, 26),
        small(c, 'Datos oficiales de FIFA: comprueba si ha habido cambios en fifa.com', 90, 560, 1100, 40, 19)],
        notes: 'Es el primer Mundial con 48 equipos y con tres países anfitriones. México repite como sede (1970 y 1986) y es el primer país con tres Mundiales masculinos.' },
      { title: 'Tres países, dieciséis sedes', layout: 'titleOnly', bg: c.PAPER, extra: [
        tbl(c, [['País', 'Sedes', 'Ciudades'], ['Estados Unidos', '11', 'Atlanta, Boston, Dallas, Houston, Kansas City, Los Ángeles, Miami, Nueva York/Nueva Jersey, Filadelfia, San Francisco (bahía), Seattle'], ['México', '3', 'Ciudad de México, Guadalajara, Monterrey'], ['Canadá', '2', 'Toronto, Vancouver']], 90, 190, 1100, 330, { colW: [2, 1, 7], fontSize: 22 }),
        small(c, 'Partido inaugural: Estadio Azteca (Ciudad de México) · Final: MetLife Stadium (Nueva Jersey)', 90, 545, 1100, 44, 23),
        small(c, 'Pregunta: ¿qué sedes están en la costa del Pacífico y cuáles en la del Atlántico?', 90, 595, 1100, 44, 21)],
        notes: 'Actividad de geografía: localizar las sedes en un mapa. Las ciudades indicadas son las sedes oficiales; varios estadios están en las afueras (Foxborough, Arlington, Inglewood, Santa Clara…). Comprueba en fifa.com.' },
      { title: 'Cómo es el torneo', layout: 'titleOnly', bg: c.PAPER, extra: [
        dg('funnel', 'Fase de grupos: 48 equipos\nDieciseisavos: 32\nOctavos: 16\nCuartos: 8\nSemifinales: 4\nFinal: 2', 90, 180, 560, 470, { colors: 'accent', oneByOne: true }),
        para(c, '<b>12 grupos de 4 equipos.</b><br>Dentro de cada grupo, todos juegan contra todos.<br><br>Pasan a la siguiente fase <b>32 equipos</b>.<br><br>Desde los dieciseisavos, el que pierde se va.', 700, 200, 490, 380, 25)],
        notes: 'La gran novedad es la ronda de dieciseisavos. El equipo campeón juega ocho partidos en total (tres de grupo y cinco eliminatorias).' },
      { title: 'Pasan 32 de 48: la regla de los terceros', layout: 'titleOnly', bg: c.PAPER, extra: [
        tbl(c, [['Puesto', 'Equipo (ejemplo)', 'Puntos', '¿Pasa?'], ['1.º', 'Equipo A', '7', 'Sí'], ['2.º', 'Equipo B', '5', 'Sí'], ['3.º', 'Equipo C', '4', 'Quizá'], ['4.º', 'Equipo D', '1', 'No']], 90, 190, 620, 300, { colW: [1.2, 3, 1.4, 1.6], fontSize: 23 }),
        on(card('<b style="font-size:26px;color:' + deep(GR, '#fff') + '">12 × 2 = 24</b><br>pasan los dos primeros de cada grupo.', 740, 190, 450, 110, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: GR, pad: [12, 20, 10, 20] }), 'fade-left'),
        after(card('<b style="font-size:26px;color:' + deep(BL, '#fff') + '">+ 8 terceros</b><br>pasan los 8 mejores terceros de los 12.', 740, 315, 450, 110, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: BL, pad: [12, 20, 10, 20] }), 'fade-left'),
        after(card('<b style="font-size:26px;color:' + deep(RE, '#fff') + '">= 32 equipos</b>', 740, 440, 450, 80, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: RE, pad: [12, 20, 10, 20] }), 'zoom-in'),
        small(c, 'La tabla es un ejemplo inventado. Los terceros se comparan por puntos, diferencia de goles y goles a favor.', 90, 560, 1100, 60, 21)],
        notes: 'Preguntar: ¿qué fracción de terceros pasa? 8 de 12 son dos tercios. Los criterios de desempate están en el reglamento oficial de FIFA: compruébalos.' },
      { title: 'Cuántos partidos hay', layout: 'titleOnly', bg: c.PAPER, extra: [
        tbl(c, [['Fase', 'Partidos', 'Cómo sale'], ['Fase de grupos', '72', '12 grupos × 6 partidos'], ['Dieciseisavos', '16', '32 equipos ÷ 2'], ['Octavos', '8', '16 equipos ÷ 2'], ['Cuartos', '4', '8 equipos ÷ 2'], ['Semifinales', '2', '4 equipos ÷ 2'], ['Tercer puesto y final', '2', '1 + 1'], ['<b>Total</b>', '<b>104</b>', '']], 90, 185, 700, 440, { colW: [3, 1.4, 3.6], fontSize: 22 }),
        card('<b style="font-size:24px">Antes (32 equipos)</b><br>8 grupos × 6 = 48<br>+ 16 de eliminatorias<br><b>= 64 partidos</b>', 830, 200, 360, 190, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: AM, pad: [16, 20, 12, 20] }),
        after(card('<b style="font-size:24px">¿Y por qué 6?</b><br>En un grupo de 4, cada equipo juega 3 partidos: 4 × 3 ÷ 2 = 6.', 830, 410, 360, 190, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: BL, pad: [16, 20, 12, 20] }), 'fade-up')],
        notes: 'Cuenta de combinaciones: n(n−1)/2. Se divide entre 2 porque cada partido lo juegan dos equipos. Conectar con la actividad final.' },
      { title: 'Probabilidad: ganar el torneo es muy difícil', layout: 'titleOnly', bg: c.PAPER, extra: [
        chartBlock({ x: 80, y: 180, w: 700, h: 430, chartType: 'bar', color: GR, dataLabels: true, grid: true, yTitle: 'probabilidad de ganar los 8 partidos (%)', seriesName: '%',
          data: [['50 %', 0.39], ['60 %', 1.68], ['70 %', 5.76], ['80 %', 16.78]].map(([l, v]) => ({ label: l + ' por partido', value: v })) }),
        para(c, 'Si un equipo tiene una probabilidad <b>p</b> de ganar cada partido, la de ganar los 8 seguidos es <b>p⁸</b>.<br><br>Con un 80 % por partido, solo un <b>17 %</b> de ganarlo todo.', 810, 200, 380, 330, 23),
        small(c, 'Ejemplo simplificado: sin empates y con la misma probabilidad en todos los partidos.', 810, 540, 380, 70, 18, { textAlign: 'left' })],
        notes: 'Cálculos: 0,5⁸ ≈ 0,0039; 0,6⁸ ≈ 0,0168; 0,7⁸ ≈ 0,0576; 0,8⁸ ≈ 0,1678. Los datos son un ejemplo de clase, no una predicción. Pedir al alumnado que lo compruebe con la calculadora.' },
      { title: 'Husos horarios: ¿a qué hora es el partido?', layout: 'titleOnly', bg: c.PAPER, extra: [
        tbl(c, [['Ciudad', 'Hora local (UTC)', 'Madrid va…'], ['Vancouver', 'UTC−7', '9 h por delante'], ['Ciudad de México', 'UTC−6', '8 h por delante'], ['Dallas', 'UTC−5', '7 h por delante'], ['Nueva York', 'UTC−4', '6 h por delante'], ['Toronto', 'UTC−4', '6 h por delante']], 90, 190, 700, 330, { colW: [3, 2.4, 3], fontSize: 22 }),
        card('<b style="font-size:24px">Cálculo</b><br>Un partido a las <b>21:00</b> en Nueva York.<br>¿Qué hora es en Madrid?', 830, 200, 360, 170, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: BL, pad: [16, 20, 12, 20] }),
        on(card('<b style="font-size:26px;color:' + deep(GR, '#fff') + '">03:00</b><br>del día siguiente (21 + 6 = 27 h).', 830, 390, 360, 130, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: GR, pad: [16, 20, 12, 20] }), 'zoom-in'),
        small(c, 'Horas del verano de 2026 (junio y julio); Madrid, UTC+2.', 90, 560, 1100, 40, 20)],
        notes: 'En verano Madrid está en UTC+2 y Nueva York en UTC−4: seis horas de diferencia. México no cambia de hora en verano. Sirve para el tema de cambio de hora y husos.' },
      { title: 'Un poco de historia', layout: 'titleOnly', bg: c.PAPER, extra: [
        dg('timeline', '1930\n  Uruguay: primer Mundial\n1982\n  España: sede y 24 selecciones\n1998\n  Francia: se pasa a 32 equipos\n2010\n  Sudáfrica: primer Mundial en África\n2022\n  Catar: se juega en noviembre y diciembre\n2026\n  Primer Mundial con 48 equipos y tres anfitriones', 90, 190, 1100, 440, { colors: 'accent', oneByOne: true })],
        notes: 'Línea de tiempo. España fue campeona en 2010 y sede en 1982. El Mundial de Catar se jugó en invierno por el calor del verano en la región.' },
      { title: 'Quién ha ganado más Mundiales (hasta 2022)', layout: 'titleOnly', bg: c.PAPER, extra: [
        chartBlock({ x: 80, y: 180, w: 700, h: 430, chartType: 'hbar', color: GR, dataLabels: true, grid: true, labelWidth: 20, xTitle: 'títulos', seriesName: 'títulos',
          data: [['Brasil', 5], ['Alemania', 4], ['Italia', 4], ['Argentina', 3], ['Francia', 2], ['Uruguay', 2], ['España', 1], ['Inglaterra', 1]].map(([l, v]) => ({ label: l, value: v })) }),
        para(c, '<b>Tu turno:</b> cuando acabe el torneo, busca el resultado en fifa.com y actualiza el gráfico.', 810, 220, 380, 200, 25),
        small(c, 'Títulos hasta Catar 2022.', 810, 440, 380, 40, 20, { textAlign: 'left' })],
        notes: 'Los datos llegan hasta 2022 a propósito: el alumnado completa 2026 con la fuente oficial. Buena ocasión para practicar a actualizar un gráfico.' },
      pollSlide(c, '¿Cuántos equipos debería tener un Mundial?', ['16', '32', '48', '64'],
        'Votación. Con 48 hay más países, pero más partidos con equipos de nivel desigual. Debatir ventajas e inconvenientes.'),
      quizSlide(c, 'En un grupo de 4 equipos donde todos juegan contra todos, ¿cuántos partidos hay?', ['4', '6', '8', '12'], 1, '4 × 3 ÷ 2 = 6.'),
      reto(c, 'Tu grupo del Mundial', 'Inventa 4 selecciones y sus 6 partidos. Anota los resultados, calcula los puntos (3 por victoria, 1 por empate) y la diferencia de goles. ¿Quién pasa y quién queda tercero?',
        timer(300, 940, 240, 300, { color: GR, endText: '¡Pitido final!' }), 'Actividad de cálculo: tabla de clasificación. Ampliación: ordenar por puntos, diferencia de goles y goles a favor.'),
    ]), c.INK));
  } },

  // 4 · Halloween, Todos los Santos, Castañada y Día de Muertos: orígenes, comparación, vocabulario y actividad.
  edu_actual_halloween: { name: 'Halloween, Todos los Santos, Castañada y Día de Muertos', cat: 'edu', summary: 'Una misma noche, muchas tradiciones: el origen en Samhain, Halloween, Todos los Santos, la Castañada y el Samaín en España y el Día de Muertos de México (patrimonio de la UNESCO), con una tabla para comparar, vocabulario, una votación y una actividad de entrevista familiar', make: () => {
    const c = { PAPER: '#1b1226', INK: '#f6eefc', GREY: '#c6b6d9', CARD: '#2a1c3a', A1: '#f58a1f', A2: '#8b5cf6', LINE: '#4b3466', HEAD: '#1b1226', QBG: '#241833' };
    const OR = '#f58a1f', MG = '#ffb81c', PU = '#a78bfa', GR = '#6fcf97', PK = '#f472b6', RE = '#f0645a', S = FF.space;
    const pumpkin = svgURL(340, 320,
      `<ellipse cx="170" cy="190" rx="142" ry="112" fill="#f58a1f"/><ellipse cx="96" cy="190" rx="62" ry="108" fill="#e5740b"/><ellipse cx="244" cy="190" rx="62" ry="108" fill="#e5740b"/><ellipse cx="170" cy="190" rx="52" ry="112" fill="#ff9f3a"/>`
      + `<rect x="154" y="58" width="30" height="46" rx="9" fill="#5a8a3a"/>`
      + `<polygon points="104,166 150,166 127,120" fill="#fff1a8"/><polygon points="190,166 236,166 213,120" fill="#fff1a8"/><polygon points="170,186 154,212 186,212" fill="#fff1a8"/>`
      + `<path d="M100 226 L128 252 L150 232 L170 256 L190 232 L212 252 L240 226 Q170 296 100 226 Z" fill="#fff1a8"/>`);
    const bats = svgURL(200, 80, [30, 110, 170].map((x, i) => `<path d="M${x} 40 q-18 -22 -30 -6 q10 -2 14 8 q6 -6 16 -2 q10 -4 16 2 q4 -10 14 -8 q-12 -16 -30 6z" fill="#0b0712" transform="translate(${i * 2} ${i % 2 * 12})"/>`).join(''));
    // The ofrenda: three tiers, papel picado, marigolds, candles.
    const ofrenda = svgURL(600, 400,
      `<rect width="600" height="400" fill="#2a1c3a"/><path d="M0 40 H600" stroke="#c6b6d9" stroke-width="3"/>`
      + Array.from({ length: 12 }, (_, i) => `<polygon points="${i * 50 + 6},40 ${i * 50 + 46},40 ${i * 50 + 26},84" fill="${['#f472b6', '#ffb81c', '#6fcf97', '#a78bfa', '#f58a1f', '#5eead4'][i % 6]}"/>`).join('')
      + `<rect x="190" y="130" width="220" height="64" fill="#7c3aed"/><rect x="120" y="194" width="360" height="70" fill="#6d28d9"/><rect x="50" y="264" width="500" height="90" fill="#5b21b6"/>`
      + `<rect x="270" y="86" width="60" height="44" rx="4" fill="#e5d9f2"/><circle cx="300" cy="104" r="11" fill="#9a8ab3"/>`
      + [215, 375].map(x => `<rect x="${x}" y="96" width="16" height="34" fill="#fff8e1"/><ellipse cx="${x + 8}" cy="88" rx="6" ry="10" fill="#ffd54a"/>`).join('')
      + Array.from({ length: 11 }, (_, i) => `<circle cx="${204 + i * 19}" cy="190" r="10" fill="#ffb81c"/><circle cx="${204 + i * 19}" cy="190" r="5" fill="#f58a1f"/>`).join('')
      + Array.from({ length: 17 }, (_, i) => `<circle cx="${132 + i * 21}" cy="258" r="10" fill="#ffb81c"/><circle cx="${132 + i * 21}" cy="258" r="5" fill="#f58a1f"/>`).join('')
      + [120, 210, 300, 390, 480].map((x, i) => `<ellipse cx="${x}" cy="312" rx="30" ry="14" fill="${['#d99a4e', '#e8b36a', '#d99a4e', '#e8b36a', '#d99a4e'][i]}"/>`).join('')
      + `<circle cx="70" cy="292" r="9" fill="#ffb81c"/><circle cx="530" cy="292" r="9" fill="#ffb81c"/><rect x="0" y="354" width="600" height="46" fill="#1b1226"/>`);
    return numbered(ink(build({ name: 'Halloween, Todos los Santos, Castañada y Día de Muertos', palette: 'midnight', fonts: 'editorial', title: { color: c.INK, size: 46 }, body: { color: c.INK } }, [
      cover(c, 'TRADICIONES · 31 DE OCTUBRE – 2 DE NOVIEMBRE', 'Halloween, Todos los Santos, Castañada y Día de Muertos', 'Una misma noche, muchas formas de celebrarla (y de recordar a quienes ya no están).',
        [after(img(pumpkin, 860, 215, 340, 320, 'Una calabaza de Halloween con la cara iluminada'), 'zoom-in', { duration: 800 }), img(bats, 880, 120, 200, 80, 'Unos murciélagos')],
        'Arranque. Son fiestas distintas con fechas pegadas. Objetivo: conocer sus orígenes, compararlas con respeto y aprender el vocabulario. Pregunta inicial: ¿qué haces tú el 31 de octubre y el 1 de noviembre?', { fs: 48, th: 250, sy: 480 }),
      { title: 'Una misma noche, muchos nombres', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...grid(c, [['Halloween · 31 oct.', 'La noche de los disfraces y el miedo divertido, sobre todo en el mundo anglosajón.', OR, 'moon'], ['Todos los Santos · 1 nov.', 'Fiesta cristiana. Es festivo en España y se recuerda a los difuntos.', PU, 'flower'], ['Fieles Difuntos · 2 nov.', 'Día en que la tradición cristiana reza por los fallecidos.', PK, 'heart'], ['Castañada y Samaín', 'En Cataluña, la Castañada; en Galicia, el Samaín y el Magosto.', MG, 'tree-pine'], ['Día de Muertos · 1 y 2 nov.', 'Fiesta mexicana de recuerdo con ofrendas, flores y comida.', GR, 'sparkles'], ['Y en otros sitios…', 'Pregunta en clase: ¿qué se celebra en el país de tu familia?', RE, 'globe']], { y: 190, h: 200, gap: 20, fs: 20, tfs: 23 })],
        notes: 'Presentar el mapa de tradiciones sin jerarquías. Preguntar quién celebra qué. En España el 1 de noviembre es festivo nacional.' },
      { title: 'El origen: del Samhain a hoy', layout: 'titleOnly', bg: c.PAPER, extra: [
        dg('timeline', 'Hace unos 2.000 años\n  Samhain: los pueblos celtas despiden la cosecha y entran en el invierno\nSiglos VIII–IX\n  La Iglesia fija el 1 de noviembre como Todos los Santos\nAño 998\n  Se añade el 2 de noviembre, Fieles Difuntos\nSiglo XIX\n  La emigración irlandesa lleva sus costumbres a Estados Unidos\nSiglo XX\n  Halloween se extiende por el cine y el comercio', 90, 190, 1100, 440, { colors: 'accent', oneByOne: true })],
        notes: 'Los historiadores discuten cuánto debe Halloween al Samhain: es una herencia mezclada. Sobre las fechas: el 1 de noviembre se generalizó en la Iglesia entre los siglos VIII y IX, y el 2 de noviembre lo fijó el monasterio de Cluny hacia el año 998.' },
      { title: 'Halloween hoy', layout: 'twoContent', bg: c.PAPER, extra: [
        img(pumpkin, 880, 200, 300, 280, 'Una calabaza de Halloween'),
        para(c, ul('<b>La calabaza de Jack</b>: la leyenda irlandesa del «Jack el tacaño»; antes se tallaban nabos', '<b>Disfraces</b> de monstruos, brujas y personajes', '<b>Truco o trato</b>: los niños piden dulces de casa en casa', '<b>Cine, series y fiestas</b> hacen el resto'), 90, 200, 740, 380, 27),
        small(c, 'En España ha crecido en las últimas décadas, junto a las tradiciones propias.', 90, 590, 1100, 44, 22)],
        notes: 'En los años 90 y 2000 se extendió con las series y el comercio. No hay que oponer unas tradiciones a otras: conviven.' },
      { title: 'En España: Santos, Castañada y Samaín', layout: 'titleOnly', bg: c.PAPER, extra: [
        tbl(c, [['Dónde', 'Tradición', 'Para comer'], ['Toda España', 'Flores en el cementerio y «Don Juan Tenorio»', 'Huesos de santo y buñuelos'], ['Cataluña', 'La Castañada, en familia', 'Castañas, boniatos y panellets'], ['Galicia', 'Samaín y Magosto (11 de noviembre)', 'Castañas asadas'], ['Asturias', 'El amagüestu', 'Castañas y sidra dulce']], 90, 190, 1100, 360, { colW: [2, 4.6, 4], fontSize: 21 }),
        small(c, 'Pregunta: ¿qué se come o se hace en tu familia en estos días?', 90, 580, 1100, 44, 23)],
        notes: 'Todos los dulces son de ejemplo de las tradiciones más extendidas; hay muchas variantes locales. «Don Juan Tenorio», de José Zorrilla (1844), se representa por estas fechas.' },
      { title: 'México: el Día de Muertos', layout: 'titleOnly', bg: c.PAPER, extra: [
        img(ofrenda, 70, 190, 600, 400, 'Una ofrenda de Día de Muertos con flores, velas y papel picado'),
        on(card('<b style="font-size:24px;color:' + MG + '">La ofrenda</b>' + ul('Fotos de los difuntos', 'Flores de cempasúchil: su color guía a las almas', 'Velas y papel picado', 'Pan de muerto y su comida favorita', 'Calaveritas de azúcar'), 700, 190, 490, 290, c.CARD, { color: c.INK, fontSize: 21, radius: 16, borderColor: MG, pad: [14, 20, 10, 20] }), 'fade-left'),
        after(card('<b style="font-size:22px;color:' + GR + '">Patrimonio de la humanidad</b><br>La UNESCO lo inscribió en 2008 como Patrimonio Cultural Inmaterial. No es un disfraz: es una celebración viva y respetuosa.', 700, 495, 490, 135, c.CARD, { color: c.INK, fontSize: 20, radius: 16, borderColor: GR, pad: [12, 20, 10, 20] }), 'fade-up')],
        notes: 'Se celebra el 1 (niños) y el 2 de noviembre (adultos) y mezcla raíces indígenas y cristianas. Es una celebración de la vida y la memoria, no de miedo. La Catrina es un símbolo popular creado a partir de la «Calavera Garbancera» de José Guadalupe Posada. Comprueba la inscripción en la web de la UNESCO.' },
      { title: 'Las comparamos', layout: 'titleOnly', bg: c.PAPER, extra: [
        tbl(c, [['', 'Halloween', 'Castañada', 'Día de Muertos'], ['Dónde', 'Mundo anglosajón y más', 'Cataluña', 'México'], ['Cuándo', '31 de octubre', '31 oct. y 1 nov.', '1 y 2 de noviembre'], ['Ambiente', 'Fiesta y miedo divertido', 'Familiar, de otoño', 'Recuerdo alegre'], ['Símbolos', 'Calabaza y disfraces', 'Castañas y panellets', 'Ofrenda y cempasúchil'], ['Origen', 'Samhain y emigración irlandesa', 'Todos los Santos', 'Indígena y cristiano']], 90, 190, 1100, 400, { colW: [1.3, 2.6, 2.3, 2.6], fontSize: 21 }),
        small(c, 'Parecidos: todas recuerdan a los difuntos y comparten comida en familia.', 90, 610, 1100, 44, 22)],
        notes: 'Actividad: encontrar parecidos y diferencias. Un diagrama de Venn en la pizarra puede acompañar la tabla.' },
      { title: 'Palabras para la fiesta', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...grid(c, [['Ofrenda', 'Altar con fotos, comida y flores para recordar a los difuntos.', MG], ['Calavera', 'Cráneo; en México, figura alegre de azúcar o dibujo.', PK], ['Disfraz', 'Ropa con la que alguien se transforma en otro personaje.', OR], ['Truco o trato', 'Pedir dulces de puerta en puerta a cambio de una broma.', PU], ['Difuntos', 'Personas que han fallecido.', GR], ['Panellets', 'Dulces catalanes de almendra, típicos de la Castañada.', MG], ['Cempasúchil', 'Flor naranja del Día de Muertos.', OR], ['Magosto', 'Fiesta de las castañas asadas en Galicia.', PU]], { cols: 4, y: 190, h: 190, gap: 18, fs: 19, tfs: 22 }),
        small(c, 'Reto: ¿cómo se dice cada palabra en inglés y en la lengua de tu casa?', 90, 600, 1100, 44, 22)],
        notes: 'Vocabulario en español. Pedir al alumnado que lo traduzca a otras lenguas: es una buena ocasión de plurilingüismo en el aula.' },
      pollSlide(c, '¿Qué celebras tú en estos días?', ['Halloween', 'Todos los Santos o la Castañada', 'El Día de Muertos', 'Ninguna: para mí es un día más'],
        'Votación anónima. Respetar todas las respuestas, incluida la de quien no celebra nada.'),
      quizSlide(c, '¿Qué flor se usa en las ofrendas del Día de Muertos?', ['Rosa', 'Cempasúchil', 'Margarita', 'Tulipán'], 1, 'El cempasúchil (caléndula mexicana): su color y su olor guían a las almas, según la tradición.'),
      reto(c, 'Tu tradición', 'Entrevista a un familiar mayor: ¿qué se hacía en su casa el 1 de noviembre? ¿Qué se comía? ¿Qué canciones o historias recuerda? Tráelo a clase para hacer un mapa de tradiciones.',
        timer(300, 940, 240, 300, { color: OR, endText: '¡A preguntar!' }), 'Reto para casa: recoger tradiciones familiares. En clase, juntarlas en un mapa o en una ofrenda colectiva de recuerdos (opcional y voluntario).'),
    ]), c.INK));
  } },

  // 5 · Cambio de hora: por qué se hace, el debate europeo y los husos horarios.
  edu_actual_cambiohora: { name: 'Cambio de hora: por qué se hace y husos horarios', cat: 'edu', summary: 'El cambio de hora de verano e invierno explicado: cuándo se cambia, por qué se inventó, cuánta luz hay cada día, el debate en Europa con una encuesta, los husos horarios y problemas para calcular la hora en otras ciudades', make: () => {
    const c = { PAPER: '#eef3fb', INK: '#14223b', GREY: '#4e5e7a', A1: '#2563c8', A2: '#e0a21f', LINE: '#bfcde3', QBG: '#dde7f6' };
    const BL = '#2563c8', AM = '#b9770e', GR = '#2e9e6b', RE = '#d84b3f', TE = '#1f8f8f', PU = '#6d3fb0', S = FF.space;
    // A clock with an arrow going back one hour.
    const clock = svgURL(340, 340,
      `<circle cx="170" cy="170" r="140" fill="#ffffff" stroke="#14223b" stroke-width="10"/>`
      + Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180, r1 = i % 3 === 0 ? 108 : 120; return `<line x1="${(170 + 130 * Math.sin(a)).toFixed(1)}" y1="${(170 - 130 * Math.cos(a)).toFixed(1)}" x2="${(170 + r1 * Math.sin(a)).toFixed(1)}" y2="${(170 - r1 * Math.cos(a)).toFixed(1)}" stroke="#14223b" stroke-width="${i % 3 === 0 ? 8 : 5}" stroke-linecap="round"/>`; }).join('')
      + `<line x1="170" y1="170" x2="170" y2="82" stroke="#14223b" stroke-width="10" stroke-linecap="round"/><line x1="170" y1="170" x2="238" y2="170" stroke="#2563c8" stroke-width="12" stroke-linecap="round"/><circle cx="170" cy="170" r="12" fill="#14223b"/>`
      + `<path d="M268 130 A110 110 0 0 0 232 70" fill="none" stroke="#e0a21f" stroke-width="12" stroke-linecap="round"/><polygon points="212,68 246,52 242,90" fill="#e0a21f"/>`);
    const sun = svgURL(300, 300, `<circle cx="150" cy="150" r="64" fill="#f6c244"/>` + Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<line x1="${(150 + 84 * Math.sin(a)).toFixed(1)}" y1="${(150 - 84 * Math.cos(a)).toFixed(1)}" x2="${(150 + 118 * Math.sin(a)).toFixed(1)}" y2="${(150 - 118 * Math.cos(a)).toFixed(1)}" stroke="#f6c244" stroke-width="10" stroke-linecap="round"/>`; }).join(''));
    const prob = (i, q, a) => { const x = 90 + (i % 2) * 560, y = 190 + Math.floor(i / 2) * 215; return [
      card(q, x, y, 540, 120, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: BL, pad: [14, 20, 10, 20] }),
      on(card('<b>' + a + '</b>', x, y + 128, 540, 70, '#e4f4ea', { color: '#14402a', fontSize: 21, radius: 12, pad: [10, 20, 8, 20] }), 'fade-up')]; };
    return numbered(ink(build({ name: 'Cambio de hora', palette: 'cobalto', fonts: 'clean', title: { color: c.INK, size: 48 }, body: { color: c.INK } }, [
      cover(c, 'ACTUALIDAD · TIEMPO Y SOCIEDAD', 'El cambio de hora:<br>por qué se hace', 'Dos veces al año movemos los relojes. ¿Para qué, cuánto sirve y qué se debate en Europa?',
        after(img(clock, 850, 215, 330, 330, 'Un reloj con una flecha que retrocede una hora'), 'zoom-in', { duration: 800 }),
        'Arranque. El último cambio de hora de 2026 fue en la madrugada del domingo 25 de octubre (a las 03:00 pasaron a ser las 02:00). Preguntar: ¿quién se ha notado raro estos días?', { fs: 66 }),
      { title: 'Cuándo se cambia y cómo', layout: 'titleOnly', bg: c.PAPER, extra: [
        on(card('<b style="font-size:28px;color:' + deep(AM, '#fff', 4.5) + '">Primavera · se adelanta</b><br>Último domingo de marzo, a las 02:00 pasan a ser las 03:00. Dormimos <b>una hora menos</b> y entramos en el <b>horario de verano</b>.', 90, 190, 540, 220, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: AM, pad: [18, 22, 12, 22] }), 'fade-right'),
        on(card('<b style="font-size:28px;color:' + deep(BL, '#fff') + '">Otoño · se atrasa</b><br>Último domingo de octubre, a las 03:00 pasan a ser las 02:00. Dormimos <b>una hora más</b> y entramos en el <b>horario de invierno</b>.', 650, 190, 540, 220, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: BL, pad: [18, 22, 12, 22] }), 'fade-left'),
        tbl(c, [['Año', 'Cambio de verano', 'Cambio de invierno'], ['2026', '29 de marzo', '25 de octubre'], ['2027', '28 de marzo', '31 de octubre']], 90, 440, 1100, 150, { colW: [1, 2, 2], fontSize: 22 }),
        small(c, 'Truco: en primavera se adelanta y en otoño se atrasa. Fechas según la regla «último domingo»; comprueba el BOE.', 90, 605, 1100, 44, 19)],
        notes: 'Regla europea: último domingo de marzo y último domingo de octubre. En toda la UE el cambio se hace a la misma hora universal (01:00 UTC), así que en Canarias es una hora antes en el reloj que en la península. Comprueba el calendario oficial en el BOE.' },
      { title: 'Por qué se inventó', layout: 'titleOnly', bg: c.PAPER, extra: [
        dg('timeline', '1784\n  Benjamin Franklin sugiere, medio en broma, madrugar para ahorrar velas\n1916\n  Alemania lo aplica por primera vez para ahorrar carbón en la guerra\n1918\n  España lo prueba por primera vez\n1974\n  Crisis del petróleo: España lo adopta de forma estable\n2000\n  Una directiva europea unifica el calendario en la UE', 90, 190, 1100, 430, { colors: 'accent', oneByOne: true })],
        notes: 'La idea es aprovechar más la luz natural de la tarde y ahorrar energía en iluminación. Hoy el ahorro estimado es pequeño y discutido. La directiva 2000/84/CE fija el calendario común en la UE.' },
      { title: 'Cuánta luz hay de verdad', layout: 'titleOnly', bg: c.PAPER, extra: [
        tbl(c, [['Día en Madrid (aprox.)', 'Sale el sol', 'Se pone el sol'], ['21 de diciembre (hora de invierno)', '08:40', '18:10'], ['21 de junio (hora de verano)', '07:00', '21:45'], ['21 de junio, si no se cambiara la hora', '06:00', '20:45']], 90, 200, 740, 280, { colW: [4, 1.6, 1.8], fontSize: 22 }),
        img(sun, 870, 200, 300, 300, 'Un sol con rayos'),
        para(c, 'Sin cambio de hora, en junio amanecería una hora antes y anochecería una hora antes. <b>Los días no son más largos: solo cambiamos el reloj.</b>', 90, 510, 1100, 100, 25)],
        notes: 'Horas aproximadas de Madrid (comprueba en la web del Instituto Geográfico Nacional). Lo importante es comprender que el reloj mueve la hora de actividades, no la luz del día.' },
      { title: 'El debate en Europa', layout: 'titleOnly', bg: c.PAPER, extra: [
        on(card('<b style="font-size:28px;color:' + deep(GR, '#fff') + '">A favor de cambiar</b>' + ul('Más luz por la tarde en verano para el ocio, el deporte y el comercio', 'Ahorro de iluminación, aunque pequeño y discutido', 'Mucha gente ya está acostumbrada'), 90, 190, 540, 400, '#ffffff', { color: c.INK, fontSize: 23, radius: 16, borderColor: GR, pad: [18, 22, 12, 22] }), 'fade-right'),
        on(card('<b style="font-size:28px;color:' + deep(RE, '#fff') + '">A favor de acabar</b>' + ul('Altera el sueño y el reloj biológico los primeros días', 'El ahorro de energía es muy pequeño y se discute', 'Dos cambios al año confunden horarios, trenes y dispositivos'), 650, 190, 540, 400, '#ffffff', { color: c.INK, fontSize: 23, radius: 16, borderColor: RE, pad: [18, 22, 12, 22] }), 'fade-left'),
        small(c, 'En 2019 el Parlamento Europeo votó acabar con el cambio; falta el acuerdo de los Estados. Comprueba cómo está hoy.', 90, 605, 1100, 60, 18)],
        notes: 'Presentar las dos posturas sin tomar partido. Si se acaba con el cambio, cada país elegiría su hora fija (de verano o de invierno): hay que decidir cuál. Dato a comprobar: el estado actual del debate en el Consejo de la UE.' },
      { title: 'La consulta europea de 2018', layout: 'titleOnly', bg: c.PAPER, extra: [
        chartBlock({ x: 80, y: 180, w: 520, h: 430, chartType: 'doughnut', color: BL, data: [{ label: 'Querían acabar con el cambio', value: 84, color: BL }, { label: 'Otras posturas', value: 16, color: '#b6c6e0' }] }),
        on(card('<b>Ojo con los datos:</b> hubo más de 4,6 millones de respuestas, pero no era una encuesta representativa: gran parte llegaron de un solo país y respondía quien quería.', 640, 380, 550, 190, '#ffffff', { color: c.INK, fontSize: 22, radius: 16, borderColor: AM, pad: [16, 22, 12, 22] }), 'fade-up')],
        notes: 'Consulta pública de la Comisión Europea (verano de 2018). Buen ejemplo de sesgo de muestreo: participa quien tiene más interés. Comprueba las cifras en la web de la Comisión Europea.' },
      pollSlide(c, '¿Qué horario preferirías?', ['Seguir cambiando la hora dos veces al año', 'Horario de verano todo el año', 'Horario de invierno todo el año', 'Me da igual'],
        'Votación. Pedir argumentos a favor de cada opción. Con horario de verano fijo amanece más tarde en invierno; con el de invierno, anochece antes en verano.'),
      { title: 'Husos horarios', layout: 'titleOnly', bg: c.PAPER, extra: [
        tbl(c, [['Ciudad', 'Huso en invierno', 'Respecto a Madrid'], ['Londres', 'UTC+0', '1 h menos'], ['Canarias', 'UTC+0', '1 h menos'], ['Madrid', 'UTC+1', '—'], ['Buenos Aires', 'UTC−3', '4 h menos'], ['Nueva York', 'UTC−5', '6 h menos'], ['Ciudad de México', 'UTC−6', '7 h menos'], ['Tokio', 'UTC+9', '8 h más']], 90, 190, 700, 420, { colW: [3, 2.4, 2.6], fontSize: 22 }),
        para(c, 'España peninsular usa la hora de Francia y Alemania (UTC+1) desde 1942, aunque por su posición le correspondería la de Londres (UTC+0).<br><br><b>Ojo:</b> en EE. UU. el cambio es el 1 de noviembre de 2026, una semana después que en Europa.', 820, 200, 370, 420, 21)],
        notes: 'Husos en el horario de invierno europeo. México no cambia de hora desde 2022. La semana en que Europa ya cambió y EE. UU. no, Nueva York está a 5 horas de Madrid en vez de 6. Comprueba los husos en timeanddate.com.' },
      { title: 'Calcula la hora', layout: 'titleOnly', bg: c.PAPER, extra: [
        ...prob(0, 'Madrid, 20:00. ¿Qué hora es en Ciudad de México?', '13:00 (7 horas menos)'),
        ...prob(1, 'Madrid, 20:00. ¿Y en Tokio?', '04:00 del día siguiente (8 horas más)'),
        ...prob(2, 'Videollamada a las 18:00 de Madrid con Buenos Aires. ¿Qué hora es allí?', '14:00 (4 horas menos)'),
        ...prob(3, 'Un vuelo sale de Madrid a las 10:00 y dura 8 h. Llega a Nueva York. ¿Qué hora local marcan los relojes?', '12:00 (a las 18:00 de Madrid son las 12:00 allí)')],
        notes: 'Pulsar para ver cada respuesta. En la semana del 25 al 31 de octubre de 2026, Nueva York está a −4 y la última respuesta sería 13:00. Ampliar con vuelos reales.' },
      quizSlide(c, 'En el cambio de octubre, a las 03:00 los relojes…', ['Pasan a ser las 02:00 (se atrasa una hora)', 'Pasan a ser las 04:00', 'No cambian', 'Se paran una hora'], 0, 'En otoño se atrasa una hora: dormimos una hora más y se entra en el horario de invierno.'),
      reto(c, 'Mini encuesta', 'Pregunta a cinco personas de tu entorno qué horario prefieren (cambiar, verano fijo o invierno fijo). Haz un gráfico y compáralo con el de tus compañeros. ¿Se parecen?',
        timer(300, 940, 240, 300, { color: BL, endText: '¡Hora de contar!' }), 'Reto: recoger datos reales, hacer un gráfico de barras y razonar sobre la representatividad de una muestra pequeña.'),
    ]), c.INK));
  } },
};
