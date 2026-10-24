// Example presentations: Economía y finanzas personales. Each one: { name, summary, cat: 'edu', make() }
// → a deck (see kit.js). Cercanas y prácticas para ESO/Bachillerato: dinero, presupuesto, ahorro, consumo,
// bancos, crédito, impuestos, mercado, emprender y estafas. Dibujos propios (SVG como data URL); sin imágenes
// de fuera. Datos de ejemplo, con decimales en coma (español).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d, deep } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 25, fontSize: 36, x: 70, y: 60, w: 1140, h: 600, ...props });
const FF = { mono: "'JetBrains Mono', monospace", space: "'Space Grotesk', sans-serif", caveat: "'Caveat', cursive", bebas: "'Bebas Neue', sans-serif" };
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// A legend: a coloured dot and a label per row (drawn by us; reads on light and dark).
const legend = (items, x, y, w, color, fs = 24) => text(items.map(([c, l]) =>
  `<div style="margin:.18em 0"><span style="display:inline-block;width:.8em;height:.8em;border-radius:.22em;background:${c};margin-right:.5em;vertical-align:-1px"></span>${l}</div>`).join(''),
  x, y, w, items.length * fs * 1.7 + 10, { fontSize: fs, color });
// A coin with a label inside.
const coin = (r, label, fill = '#e8b84b') => svgURL(2 * r + 10, 2 * r + 10,
  `<circle cx="${r + 5}" cy="${r + 5}" r="${r}" fill="${fill}" stroke="#b5892f" stroke-width="4"/><circle cx="${r + 5}" cy="${r + 5}" r="${r - 9}" fill="none" stroke="#c99a37" stroke-width="2"/>`
  + `<text x="${r + 5}" y="${r + 5 + r * 0.3}" font-family="sans-serif" font-size="${r * 0.82}" font-weight="800" fill="#7a5a12" text-anchor="middle">${label}</text>`);
// A stack of coins.
const coinStack = (col = '#e8b84b') => svgURL(300, 340, Array.from({ length: 5 }, (_, i) =>
  `<ellipse cx="150" cy="${300 - i * 52}" rx="92" ry="26" fill="${col}" stroke="#b5892f" stroke-width="3"/><rect x="58" y="${300 - i * 52 - 26}" width="184" height="26" fill="${col}"/><line x1="58" y1="${300 - i * 52}" x2="58" y2="${300 - i * 52 - 26}" stroke="#b5892f" stroke-width="3"/><line x1="242" y1="${300 - i * 52}" x2="242" y2="${300 - i * 52 - 26}" stroke="#b5892f" stroke-width="3"/>`).join('')
  + `<text x="150" y="${300 - 4 * 52 + 8}" font-family="sans-serif" font-size="44" font-weight="800" fill="#7a5a12" text-anchor="middle">€</text>`);
// A piggy bank.
const piggy = (col = '#ef8fb0') => svgURL(340, 280,
  `<ellipse cx="170" cy="160" rx="130" ry="100" fill="${col}" stroke="#c9668a" stroke-width="5"/>`
  + `<circle cx="252" cy="130" r="48" fill="${col}" stroke="#c9668a" stroke-width="5"/><circle cx="268" cy="126" r="9" fill="#3a2230"/>`
  + `<rect x="120" y="70" width="70" height="12" rx="6" fill="#8a3d5c"/>`
  + `<rect x="70" y="240" width="26" height="40" rx="6" fill="#c9668a"/><rect x="244" y="240" width="26" height="40" rx="6" fill="#c9668a"/>`
  + `<rect x="300" y="150" width="34" height="18" rx="9" fill="${col}" stroke="#c9668a" stroke-width="4"/>`
  + `<circle cx="150" cy="40" r="22" fill="#e8b84b" stroke="#b5892f" stroke-width="3"/><text x="150" y="48" font-family="sans-serif" font-size="20" font-weight="800" fill="#7a5a12" text-anchor="middle">€</text>`);
// A bank/debit card.
const bankCard = (col = '#2f6df0', name = 'DÉBITO') => svgURL(360, 230,
  `<rect x="8" y="8" width="344" height="214" rx="22" fill="${col}"/><rect x="8" y="8" width="344" height="214" rx="22" fill="url(#g)" opacity="0.0"/>`
  + `<rect x="40" y="66" width="56" height="42" rx="7" fill="#f2c14e"/><path d="M40 87 h56 M68 66 v42" stroke="#b5892f" stroke-width="2"/>`
  + `<text x="40" y="150" font-family="monospace" font-size="26" fill="#eef3fa" letter-spacing="2">5312 •••• •••• 0244</text>`
  + `<text x="40" y="190" font-family="sans-serif" font-size="20" fill="#dbe6fb">NOMBRE APELLIDO</text>`
  + `<text x="316" y="46" font-family="sans-serif" font-size="18" font-weight="700" fill="#ffffff" text-anchor="end">${name}</text>`);
// A phone frame around a screen image (an app mockup made with appScreen).
const phone = (screen) => svgURL(300, 600,
  `<rect x="20" y="10" width="260" height="580" rx="40" fill="#1b2230" stroke="#2b3442" stroke-width="6"/>`
  + `<rect x="34" y="60" width="232" height="480" rx="10" fill="#ffffff"/>`
  + `<rect x="120" y="26" width="60" height="12" rx="6" fill="#2b3442"/><circle cx="150" cy="566" r="16" fill="#2b3442"/>`
  + `<image href="${screen}" x="34" y="60" width="232" height="480" preserveAspectRatio="xMidYMin slice"/>`);
// A scam SMS on a screen.
const scamSMS = () => svgURL(420, 300,
  `<rect width="420" height="300" rx="18" fill="#0f141b"/><rect width="420" height="54" rx="18" fill="#1b2430"/>`
  + `<text x="24" y="35" font-family="sans-serif" font-size="22" font-weight="700" fill="#eef3fa">+34 600 12 34 56</text>`
  + `<rect x="24" y="80" width="330" height="150" rx="16" fill="#243244"/>`
  + `<text x="42" y="118" font-family="sans-serif" font-size="19" fill="#eaf2fb">Su cuenta sera BLOQUEADA hoy.</text>`
  + `<text x="42" y="146" font-family="sans-serif" font-size="19" fill="#eaf2fb">Verifique YA sus datos aqui:</text>`
  + `<text x="42" y="178" font-family="monospace" font-size="18" fill="#7fb0ef">bankk-seguro.info/acceso</text>`
  + `<text x="42" y="208" font-family="sans-serif" font-size="15" fill="#9fb0c4">Entidad Bancaria · Atención</text>`);

export default {

  // 1 · ¿Qué es el dinero? Historia, funciones y el dinero de hoy.
  edu_econ_money: { name: 'El dinero: qué es y de dónde viene', cat: 'edu', summary: 'Qué es el dinero y para qué sirve: del trueque a las monedas, los billetes y el dinero digital; las tres funciones del dinero, cómo pagamos hoy y una votación en clase', make: () => {
    const PAPER = '#fbf6ec', INK = '#2a2113', GOLD = '#c98a1e', BR = '#9a5a2a', GR = '#3d8f5b', BL = '#2f6db0', GREY = '#6b5c43', S = FF.space;
    return numbered(ink(build({ name: 'El dinero: qué es y de dónde viene', palette: 'warm', fonts: 'editorial', title: { color: INK, size: 50 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(1000, -120, 620, GOLD, PAPER, 16), glow(-140, 560, 520, BR, PAPER, 12)], extra: [
        text('ECONOMÍA · PARA EMPEZAR', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: GOLD, fontWeight: 700 }),
        text('El dinero:<br>qué es y de dónde viene', 84, 200, 760, 240, { fontSize: 66, fontWeight: 800, color: INK, lineHeight: 1.05, fontFamily: S }),
        text('Un papel o unos números en el móvil valen porque todos confiamos en ellos. ¿Cómo hemos llegado hasta aquí?', 90, 470, 700, 110, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(coinStack(), 900, 230, 280, 320, 'Una pila de monedas'), 'fade-up', { duration: 800 })],
        notes: 'Arranque: el dinero vale porque confiamos en él. Pregunta rápida: ¿qué llevas hoy encima para pagar?' },
      { title: 'Del trueque al móvil', layout: 'titleOnly', bg: PAPER, extra: [
        dg('timeline', 'Trueque\nSal, conchas, grano\nPrimeras monedas de metal\nBilletes de papel\nTarjetas\nDinero digital y móvil', 90, 200, 1100, 360, { color: INK }),
        text('Cada paso busca lo mismo: pagar de forma más cómoda y segura.', 90, 600, 1100, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Línea del tiempo. Las primeras monedas, en Lidia (actual Turquía), hace unos 2.700 años. Los billetes nacen en China.' },
      { title: 'Para qué sirve el dinero', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Medio de cambio', 'Lo cambias por cosas sin tener que trocar. Pagas y ya está.', GR, 'repeat'], ['Unidad de medida', 'Pone precio a todo con la misma vara: sabes qué es más caro.', BL, 'ruler'], ['Depósito de valor', 'Lo guardas hoy y lo usas mañana; no se estropea como la fruta.', GOLD, 'piggy-bank']].map(([t, d, col, ic], i) => { const x = 90 + i * 375; return [
          on(icon(ic, x + 18, 215, 46, col), 'fade-up'),
          along(card(`<b style="font-size:26px;color:${col}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, x, 285, 350, 230, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up')]; }).flat()],
        notes: 'Las tres funciones clásicas. Ejemplo del trueque fallido: quieres pan y tienes huevos, pero el panadero no quiere huevos.' },
      { title: 'El problema del trueque', layout: 'twoContent', bg: PAPER, extra: [
        img(coin(90, '€'), 150, 220, 220, 220, 'Una moneda'),
        text('Sin dinero, para cambiar tienes que encontrar a alguien que quiera <b>justo</b> lo que tú tienes y que tenga <b>justo</b> lo que tú quieres. Difícil, ¿verdad?<br><br>La moneda resuelve eso: todos la aceptan, así que sirve de puente entre cualquier par de intercambios.', 600, 210, 580, 400, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'La «doble coincidencia de deseos». El dinero es el puente que evita ese problema.' },
      { title: 'Cómo pagamos hoy', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Efectivo', 'Monedas y billetes. Anónimo y sin batería.', BR], ['Tarjeta', 'Débito o crédito; contactless.', BL], ['Móvil y Bizum', 'El pago instantáneo entre personas.', GR]].map(([t, d, col], i) => { const x = 90 + i * 375; return [
          on(card(`<b style="font-size:26px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, 230, 350, 180, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up')]; }).flat(),
        text('Cada vez usamos menos efectivo, pero sigue siendo útil y no deja rastro.', 90, 470, 1100, 50, { fontSize: 24, color: GREY, textAlign: 'center' })],
        notes: 'Repaso de medios de pago. Buen momento para la votación siguiente.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿Cómo pagas tú más a menudo?', options: ['Efectivo', 'Tarjeta', 'Móvil o Bizum', 'Aún no manejo dinero propio'] })],
        notes: 'Votación en directo. Sirve para hablar de que el uso del efectivo baja entre los jóvenes.' },
      { layout: 'blank', bg: '#f3ead9', extra: [quiz('¿Cuál NO es una función del dinero?', ['Medio de cambio', 'Unidad de medida', 'Depósito de valor', 'Fabricar objetos'], 3)],
        notes: 'Repaso de las tres funciones; «fabricar objetos» es el distractor.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, GOLD, PAPER, 16)], transition: 'zoom', extra: [
        text('Tu reto', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Pregunta en casa cómo pagaban tus abuelos cuando tenían tu edad. Trae un ejemplo de algo que antes se pagaba en efectivo y hoy pagas con el móvil.', 84, 260, 760, 190, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        after(img(piggy(), 900, 250, 300, 250, 'Una hucha'), 'fade-left', { duration: 700 })],
        notes: 'Reto para casa que conecta generaciones y prepara el tema del ahorro.' },
    ]), INK));
  } },

  // 2 · Hacer un presupuesto personal: ingresos, gastos, ahorro y la regla 50/30/20.
  edu_econ_budget: { name: 'Tu primer presupuesto', cat: 'edu', summary: 'Cómo hacer un presupuesto personal: ingresos menos gastos igual a ahorro, la regla 50/30/20, una tabla de presupuesto mensual de ejemplo, votación y actividad para hacer el tuyo', make: () => {
    const PAPER = '#eef4fb', INK = '#15233a', BL = '#2563c8', TE = '#1f8f8f', GR = '#2e9e6b', AM = '#d98a1e', RE = '#d84b3f', GREY = '#55657e', S = FF.space;
    return numbered(ink(build({ name: 'Tu primer presupuesto', palette: 'ocean', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(1000, -120, 620, BL, PAPER, 16), glow(-140, 560, 520, TE, PAPER, 12)], extra: [
        text('FINANZAS PERSONALES', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('Tu primer<br>presupuesto', 84, 198, 760, 200, { fontSize: 78, fontWeight: 800, color: INK, lineHeight: 1.03, fontFamily: S }),
        text('Un presupuesto es un plan para tu dinero: decidir a dónde va antes de que se vaya solo.', 90, 438, 700, 110, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(text('<div style="font-size:84px;font-weight:800;color:' + BL + ';line-height:1">50/30/20</div>', 780, 280, 440, 140, { textAlign: 'center', fontFamily: S }), 'zoom-in', { duration: 700 })],
        notes: 'Arranque: planear el dinero antes de gastarlo. La regla 50/30/20 será el hilo.' },
      { title: 'La idea en una línea', layout: 'titleOnly', bg: PAPER, extra: [
        on(card('<b style="font-size:40px;color:' + GR + '">Ingresos</b>', 90, 280, 300, 140, '#ffffff', { color: INK, radius: 16, borderColor: GR, textAlign: 'center', pad: [34, 10, 34, 10] }), 'fade-up'),
        after(text('−', 404, 300, 80, 100, { fontSize: 72, color: GREY, textAlign: 'center', fontWeight: 800 }), 'fade-in'),
        after(card('<b style="font-size:40px;color:' + RE + '">Gastos</b>', 490, 280, 300, 140, '#ffffff', { color: INK, radius: 16, borderColor: RE, textAlign: 'center', pad: [34, 10, 34, 10] }), 'fade-up'),
        after(text('=', 804, 300, 80, 100, { fontSize: 72, color: GREY, textAlign: 'center', fontWeight: 800 }), 'fade-in'),
        after(card('<b style="font-size:40px;color:' + BL + '">Ahorro</b>', 890, 280, 300, 140, '#ffffff', { color: INK, radius: 16, borderColor: BL, textAlign: 'center', pad: [34, 10, 34, 10] }), 'zoom-in'),
        text('Si gastas menos de lo que ingresas, ahorras. Si gastas más, te endeudas.', 90, 480, 1100, 50, { fontSize: 26, color: GREY, textAlign: 'center' })],
        notes: 'La ecuación básica, con reveals. Insistir: el ahorro es lo que queda, mejor si se aparta primero.' },
      { title: 'La regla 50/30/20', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 90, y: 180, w: 470, h: 440, chartType: 'doughnut', color: BL,
          data: [{ label: 'Necesidades', value: 50, color: BL }, { label: 'Deseos', value: 30, color: AM }, { label: 'Ahorro', value: 20, color: GR }] }),
        legend([[BL, '<b>50 %</b> Necesidades — comer, transporte, lo básico'], [AM, '<b>30 %</b> Deseos — ocio, caprichos'], [GR, '<b>20 %</b> Ahorro — para tus metas']], 600, 250, 600, INK, 23)],
        notes: 'Reparto orientativo de cada euro que entra. No es una ley, es una guía fácil de recordar.' },
      { title: 'Un presupuesto de ejemplo', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 150, y: 180, w: 980, h: 360, stroke: '#c7d4e8',
          rows: [['Concepto', 'Tipo', 'Al mes'], ['Paga / trabajo fin de semana', 'Ingreso', '60,00 €'], ['Móvil y transporte', 'Necesidad', '20,00 €'], ['Salidas y ocio', 'Deseo', '18,00 €'], ['A la hucha', 'Ahorro', '12,00 €'], ['Queda sin asignar', '—', '10,00 €']] }),
        text('Con 60 € al mes: 20 € a lo básico, 18 € a caprichos y 12 € al ahorro. Cuadra.', 150, 560, 980, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Tabla de ejemplo con cifras realistas de un adolescente. Lo importante es que el total cuadre.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿En qué se te va más el dinero?', options: ['Comida y chuches', 'Ocio (cine, juegos, salidas)', 'Ropa y caprichos', 'La verdad, no lo sé'] })],
        notes: 'Votación. Que muchos digan «no lo sé» es la mejor razón para hacer un presupuesto.' },
      { title: 'Ahora el tuyo', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 150, y: 180, w: 980, h: 320, stroke: '#c7d4e8',
          rows: [['Concepto', 'Tipo', 'Al mes'], ['', 'Ingreso', ''], ['', 'Necesidad', ''], ['', 'Deseo', ''], ['', 'Ahorro', '']] }),
        text('Rellénalo con tus cifras reales de un mes. Apunta hasta el último euro.', 150, 520, 980, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Actividad: cada alumno hace su presupuesto. Se puede proyectar la tabla y rellenar entre todos un ejemplo.' },
      { layout: 'blank', bg: '#e4eefa', extra: [quiz('Ingresas 60 € y gastas 70 €. ¿Qué ha pasado?', ['Has ahorrado 10 €', 'Has quedado a cero', 'Has gastado 10 € de más (deuda)', 'Has ingresado 130 €'], 2)],
        notes: 'Gastar más de lo que entra = deuda. Idea clave antes del tema de crédito.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, GR, PAPER, 16)], transition: 'zoom', extra: [
        text('Tu reto', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Durante una semana, apunta TODO lo que gastas (hasta el chicle). Al acabar, mira en qué cajón cae cada gasto: necesidad, deseo o ahorro. Te sorprenderás.', 84, 260, 820, 190, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        timer(300, 940, 240, 300, { color: BL, endText: '¡A planificar!' })],
        notes: 'Reto de la semana: registrar gastos. Es el primer paso de cualquier buen presupuesto.' },
    ]), INK));
  } },

  // 3 · Ahorrar: metas y el interés compuesto.
  edu_econ_saving: { name: 'Ahorrar: metas y el interés compuesto', cat: 'edu', summary: 'Por qué y cómo ahorrar: fijar metas SMART, pagarse uno primero y la fuerza del interés compuesto, con un gráfico de crecimiento y una tabla de cuánto se junta ahorrando poco cada mes', make: () => {
    const PAPER = '#eef6f0', INK = '#13291d', GR = '#1f8f55', TE = '#1f8f8f', AM = '#d98a1e', BL = '#2f6db0', GREY = '#53685c', S = FF.space;
    return numbered(ink(build({ name: 'Ahorrar: metas y el interés compuesto', palette: 'forest', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(1000, -120, 620, GR, PAPER, 16), glow(-140, 560, 520, TE, PAPER, 12)], extra: [
        text('FINANZAS PERSONALES', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: GR, fontWeight: 700 }),
        text('El poder de<br>ahorrar poco a poco', 84, 198, 780, 220, { fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1.05, fontFamily: S }),
        text('Ahorrar no es guardar lo que sobra, es apartar un poco siempre. Y el tiempo hace el resto.', 90, 452, 700, 110, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(img(piggy('#6fc38a'), 880, 240, 320, 270, 'Una hucha'), 'fade-up', { duration: 800 })],
        notes: 'Arranque: ahorrar es un hábito, no lo que sobra. El protagonista del tema es el interés compuesto.' },
      { title: '¿Para qué ahorras?', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Un capricho', 'Esa consola, ese viaje. Metas a meses.', AM], ['Un imprevisto', 'El móvil se rompe. Un colchón para no agobiarse.', TE], ['Un sueño', 'Estudiar fuera, tu primer coche. Metas a años.', BL]].map(([t, d, col], i) => { const x = 90 + i * 375; return [
          on(card(`<b style="font-size:26px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, 240, 350, 190, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up')]; }).flat(),
        text('Una meta con nombre y fecha ahorra mejor que un «a ver si guardo algo».', 90, 480, 1100, 50, { fontSize: 24, color: GREY, textAlign: 'center' })],
        notes: 'Tres tipos de meta por plazo. La clave: ponerle nombre, cantidad y fecha.' },
      { title: 'Metas que funcionan', layout: 'titleContent', bg: PAPER,
        body: ul('<b>Concreta</b>: «130 € para unos cascos», no «ahorrar algo»', '<b>Medible</b>: sabes cuánto te falta', '<b>Con fecha</b>: «para junio»', '<b>Realista</b>: con lo que de verdad ingresas', '<b>Primero tú</b>: aparta el ahorro al cobrar, no al final'),
        notes: 'Metas tipo SMART, en lenguaje llano. «Pagarse uno primero»: apartar el ahorro nada más cobrar.' },
      { title: 'La magia del interés compuesto', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 175, w: 1060, h: 430, chartType: 'area', color: GR, grid: true, yTitle: 'Ahorro (€)', seriesName: 'Con interés',
          data: [[0, 0], [5, 3500], [10, 8200], [15, 14500], [20, 23100], [25, 34700], [30, 50200]].map(([a, v]) => ({ label: String(a), value: v })),
          series: [{ name: 'Solo guardado (sin interés)', values: [0, 3000, 6000, 9000, 12000, 15000, 18000], color: '#9aa7ad' }] }),
        text('50 € al mes al 6 % anual: a 30 años, unos 50.200 € habiendo puesto 18.000 €. El resto lo pone el interés. (Ejemplo.)', 110, 610, 1060, 64, { fontSize: 20, color: GREY, textAlign: 'center' })],
        notes: 'Gráfico clave: el interés sobre el interés dispara la curva con el tiempo. Eje X = años. Cifras de ejemplo.' },
      { title: 'Cuánto junta 1 € al día', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 180, y: 185, w: 920, h: 300, stroke: '#c7ddd0',
          rows: [['Guardas', 'En 1 año', 'En 5 años', 'En 10 años'], ['1 € al día', '365 €', '1.825 €', '3.650 €'], ['3 € al día', '1.095 €', '5.475 €', '10.950 €'], ['5 € al día', '1.825 €', '9.125 €', '18.250 €']] }),
        text('Sin contar intereses. Con ellos, todavía más. Lo pequeño, repetido, se hace grande.', 180, 515, 920, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Tabla sencilla (sin interés) para que vean que lo diario suma mucho. Con interés, aún más.' },
      { layout: 'blank', bg: '#e3f0e8', extra: [quiz('¿Por qué crece tan rápido el ahorro con interés compuesto a largo plazo?', ['Porque metes más dinero cada año', 'Porque el interés también genera interés', 'Porque el banco regala dinero', 'Porque sube la inflación'], 1)],
        notes: 'Idea central: el interés se suma al capital y el año siguiente también genera interés. Bola de nieve buena.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, GR, PAPER, 16)], transition: 'zoom', extra: [
        text('Tu reto', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Elige UNA meta con nombre, precio y fecha. Calcula cuánto tendrías que apartar a la semana para llegar. Pon una hucha o una cuenta aparte solo para ella.', 84, 260, 820, 190, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        after(img(coinStack('#6fc38a'), 940, 250, 260, 300, 'Monedas que se acumulan'), 'fade-left', { duration: 700 })],
        notes: 'Reto: una meta concreta con cálculo semanal. Conecta ahorro con planificación.' },
    ]), INK));
  } },

  // 4 · Necesidades vs deseos y consumo responsable.
  edu_econ_needs: { name: 'Necesidades o deseos', cat: 'edu', summary: 'Distinguir necesidades de deseos para decidir mejor en qué gastar: consumo responsable, cómo nos empuja la publicidad, una actividad de clasificar y un reto de los 30 días', make: () => {
    const PAPER = '#f4f0fb', INK = '#241a36', PUR = '#6d3fb0', TE = '#1f8f8f', AM = '#d98a1e', GR = '#2e9e6b', RE = '#c0455f', GREY = '#5f5473', S = FF.space;
    return numbered(ink(build({ name: 'Necesidades o deseos', palette: 'violet', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(1000, -120, 620, PUR, PAPER, 16), glow(-140, 560, 520, TE, PAPER, 12)], extra: [
        text('CONSUMO RESPONSABLE', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: PUR, fontWeight: 700 }),
        text('¿Lo necesito<br>o lo deseo?', 84, 198, 780, 200, { fontSize: 74, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('La pregunta que ahorra más dinero del mundo. Hacerla antes de pagar lo cambia todo.', 90, 438, 700, 110, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(icon('shopping-cart', 960, 250, 180, '#e0873b'), 'zoom-in', { duration: 700 })],
        notes: 'Arranque con la pregunta estrella. No es «no gastes», es «decide tú, no el impulso».' },
      { title: 'Dos cajones', layout: 'twoContent', bg: PAPER, extra: [
        card('<b style="font-size:30px;color:' + GR + '">Necesidades</b><br><span style="font-size:23px">Lo que de verdad hace falta para vivir y estudiar:</span>' + ul('Comer', 'Ropa básica', 'Transporte a clase', 'Material escolar'), 90, 190, 540, 420, '#ffffff', { color: INK, radius: 18, borderColor: GR, pad: [22, 26, 20, 26] }),
        card('<b style="font-size:30px;color:' + AM + '">Deseos</b><br><span style="font-size:23px">Lo que apetece pero se puede esperar o evitar:</span>' + ul('La última videoconsola', 'Zapatillas de marca', 'Comida a domicilio', 'El móvil más nuevo'), 650, 190, 540, 420, '#ffffff', { color: INK, radius: 18, borderColor: AM, pad: [22, 26, 20, 26] })],
        notes: 'La frontera no siempre es nítida (un móvil puede ser necesidad). Lo importante es parar a pensar.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 28, x: 70, y: 60, w: 1140, h: 600,
        question: 'Un videojuego nuevo que te encanta: ¿necesidad o deseo?', options: ['Necesidad total', 'Más bien un deseo', 'Depende: si lo comparto con amigos…', 'Deseo, pero me lo pienso como premio'] })],
        notes: 'Votación para debatir: casi todo es deseo. Está bien tener deseos; la clave es elegirlos con cabeza.' },
      { title: 'Consumir con cabeza', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Espera 24 h', 'Si al día siguiente sigues queriéndolo, es más real.', PUR], ['Compara precios', 'La misma cosa cuesta distinto en cada sitio.', TE], ['Piensa en segunda mano', 'Igual de útil, más barato y más ecológico.', GR], ['Cuidado con la publicidad', 'Te hace desear cosas que no sabías que «necesitabas».', RE]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 200 + Math.floor(i / 2) * 210; return [
          on(card(`<b style="font-size:27px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, y, 525, 180, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up')]; }).flat()],
        notes: 'Cuatro hábitos. El de las 24 horas es el más potente contra la compra impulsiva.' },
      { layout: 'blank', bg: '#ece3f7', extra: [quiz('¿Cuál es, casi siempre, una NECESIDAD?', ['Unas zapatillas de edición limitada', 'El material para ir a clase', 'El último modelo de móvil', 'Un videojuego recién salido'], 1)],
        notes: 'El material escolar es necesidad; el resto, deseos (aunque apetezcan).' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, PUR, PAPER, 16)], transition: 'zoom', extra: [
        text('Reto de los 30 días', 84, 150, 900, 90, { fontSize: 54, fontWeight: 800, color: INK, fontFamily: S }),
        text('La próxima vez que quieras comprar un deseo caro, apúntalo en una lista con la fecha. Espera 30 días. Si al mes sigues queriéndolo, cómpralo sin culpa. Verás cuántos tachas.', 84, 255, 820, 200, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        timer(300, 940, 240, 300, { color: PUR, endText: '¡A decidir con cabeza!' })],
        notes: 'El reto de los 30 días: la mejor herramienta contra el impulso. Muchos deseos se evaporan solos.' },
    ]), INK));
  } },

  // 5 · Bancos, cuentas y tarjetas.
  edu_econ_bank: { name: 'Bancos, cuentas y tarjetas', cat: 'edu', summary: 'Qué hace un banco (guardar, pagar y prestar), la diferencia entre tarjeta de débito y de crédito, la app del banco, las comisiones y cómo elegir una cuenta', make: () => {
    const PAPER = '#eef1f6', INK = '#1b2433', BL = '#2563c8', TE = '#1f8f8f', GR = '#2e9e6b', AM = '#d98a1e', RE = '#d84b3f', GREY = '#56627a', S = FF.space;
    return numbered(ink(build({ name: 'Bancos, cuentas y tarjetas', palette: 'office', fonts: 'clean', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(1000, -120, 620, BL, PAPER, 14), glow(-140, 560, 520, TE, PAPER, 12)], extra: [
        text('FINANZAS PERSONALES', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('Bancos, cuentas<br>y tarjetas', 84, 198, 760, 200, { fontSize: 68, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('Dónde vive tu dinero cuando no lo llevas encima, y cómo moverlo sin llevarte sorpresas.', 90, 448, 680, 110, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(img(bankCard(BL), 860, 250, 340, 220, 'Una tarjeta bancaria'), 'fade-left', { duration: 700 })],
        notes: 'Arranque: el banco como el sitio donde vive tu dinero. Objetivo: entender cuenta, tarjetas y comisiones.' },
      { title: '¿Qué hace un banco?', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Guarda', 'Tu dinero a salvo en una cuenta, disponible cuando quieras.', GR, 'piggy-bank'], ['Mueve', 'Pagos, transferencias, recibos: tu dinero va y viene.', BL, 'repeat'], ['Presta', 'Deja dinero a quien lo pide y cobra un interés por ello.', AM, 'building-2']].map(([t, d, col, ic], i) => { const x = 90 + i * 375; return [
          on(icon(ic, x + 18, 215, 44, col), 'fade-up'),
          along(card(`<b style="font-size:26px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, 280, 350, 200, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up')]; }).flat(),
        text('Con lo que guardas de muchos, presta a otros. Así gana (y asume riesgos).', 90, 510, 1100, 40, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Las tres funciones del banco. La idea de que presta el dinero depositado enlaza con el tema del crédito.' },
      { title: 'Débito o crédito', layout: 'twoContent', bg: PAPER, extra: [
        img(bankCard(TE, 'DÉBITO'), 110, 200, 330, 210, 'Tarjeta de débito'),
        text('<b style="color:' + deep(TE, PAPER) + ';font-size:26px">Débito</b>: paga con el dinero que YA tienes en la cuenta. Si no hay, no paga. Difícil endeudarse.<br><br><b style="color:' + deep(AM, PAPER) + ';font-size:26px">Crédito</b>: el banco te adelanta y lo devuelves después. Cómodo, pero si te pasas, pagas intereses.', 560, 200, 620, 420, { fontSize: 25, color: INK, lineHeight: 1.45 })],
        notes: 'La distinción clave. Para empezar, siempre débito: solo gastas lo que tienes.' },
      { title: 'Todo en el móvil', layout: 'twoContent', bg: PAPER, extra: [
        img(phone(appScreen(300, 600, BL, 'Mi banco', 4)), 170, 150, 250, 470, 'La app del banco en un móvil'),
        text('La app del banco te deja:' + ul('Ver tu saldo en tiempo real', 'Pagar y hacer Bizum', 'Poner topes de gasto', 'Bloquear la tarjeta si la pierdes', 'Ver en qué se te va el dinero'), 560, 200, 620, 420, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'La app es hoy el centro de todo. Destacar el aviso de saldo y los límites de gasto como herramientas de control.' },
      { title: 'Ojo con las comisiones', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Mantenimiento', 'Algunas cuentas cobran por existir. Busca las que no.', RE], ['Sacar en otro cajero', 'Puede costar unos euros cada vez.', AM], ['Descubierto', 'Gastar de más «en rojo» sale caro.', RE], ['Cambio de divisa', 'Pagar en otra moneda suele llevar recargo.', AM]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 200 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:25px;color:${col}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, x, y, 525, 170, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'Las comisiones son el coste oculto. Las cuentas para jóvenes suelen ser gratuitas: comparar antes de abrir.' },
      { layout: 'blank', bg: '#e3e9f3', extra: [quiz('Pagas con tarjeta pero NO tienes dinero en la cuenta. ¿Qué tarjeta te deja hacerlo?', ['La de débito', 'La de crédito', 'Ninguna, es imposible', 'Las dos igual'], 1)],
        notes: 'La de crédito adelanta dinero; la de débito no. De ahí el riesgo de la de crédito.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, BL, PAPER, 14)], transition: 'zoom', extra: [
        text('Tu reto', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Busca dos cuentas para jóvenes de bancos distintos y compara: ¿cobran mantenimiento? ¿comisión por sacar dinero? ¿regalan algo? Decide cuál elegirías y por qué.', 84, 260, 820, 190, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        after(img(bankCard(GR, 'JOVEN'), 880, 260, 320, 210, 'Una tarjeta para jóvenes'), 'fade-left', { duration: 700 })],
        notes: 'Reto de comparación real. Enseña a leer condiciones antes de firmar.' },
    ]), INK));
  } },

  // 6 · Crédito y deudas: la buena y la mala.
  edu_econ_credit: { name: 'Crédito y deudas', cat: 'edu', summary: 'Qué es el crédito y cómo funcionan los intereses: la diferencia entre deuda buena y mala, el peligro de la bola de nieve de la tarjeta de crédito y cómo pedir prestado con cabeza', make: () => {
    const BG = '#0f1420', PANEL = '#1a2434', INK = '#e9eefc', BL = '#5aa7f0', GR = '#5fd38a', AM = '#f2c14e', RE = '#ef6b6b', DIM = '#93a3bd', S = FF.space;
    return numbered(ink(build({ name: 'Crédito y deudas', palette: 'midnight', fonts: 'clean', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, BL, BG, 26), glow(-140, 560, 520, RE, BG, 18)], extra: [
        text('FINANZAS PERSONALES', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('Crédito y deudas', 84, 198, 900, 130, { fontSize: 78, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('Pedir dinero prestado puede abrirte puertas… o cerrarte el futuro. Todo depende de para qué y a qué precio.', 90, 348, 720, 120, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        after(text('<div style="font-size:120px;font-weight:800;color:' + RE + ';line-height:1">%</div>', 900, 250, 280, 240, { textAlign: 'center', fontFamily: S }), 'zoom-in', { duration: 700 })],
        notes: 'Arranque: el crédito no es malo en sí; el interés es su precio. La clave es el porcentaje y el destino.' },
      { title: '¿Qué es el crédito?', layout: 'titleContent', bg: BG,
        body: ul('Alguien te deja dinero hoy', 'Tú lo devuelves poco a poco', 'Además pagas un <b>interés</b>: el precio de ese préstamo', 'Cuanto mayor es el interés (%), más caro te sale', 'Y cuanto más tardas en pagar, más intereses se acumulan'),
        notes: 'Definición en cinco pasos. El interés es el alquiler del dinero.' },
      { title: 'Deuda buena y deuda mala', layout: 'twoContent', bg: BG, extra: [
        card('<b style="font-size:30px;color:' + GR + '">Deuda buena</b><br><span style="font-size:22px">Para algo que crece o dura, con interés bajo:</span>' + ul('Estudiar', 'Una vivienda', 'Herramientas para trabajar'), 90, 190, 540, 400, PANEL, { color: INK, radius: 18, borderColor: GR, pad: [22, 26, 20, 26] }),
        card('<b style="font-size:30px;color:' + RE + '">Deuda mala</b><br><span style="font-size:22px">Para caprichos que pierden valor, con interés alto:</span>' + ul('Caprichos a plazos', 'Tarjeta «revolving»', 'Gastar en ocio con crédito'), 650, 190, 540, 400, PANEL, { color: INK, radius: 18, borderColor: RE, pad: [22, 26, 20, 26] })],
        notes: 'Regla práctica: endeudarse para algo que dura o rinde más que su interés = buena; para algo que se consume = mala.' },
      { title: 'La bola de nieve de la tarjeta', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 110, y: 175, w: 1060, h: 430, chartType: 'line', color: RE, grid: true, yTitle: 'Lo que debes (€)', seriesName: 'Deuda al 20 %',
          data: [[0, 600], [1, 720], [2, 864], [3, 1037], [4, 1244], [5, 1493]].map(([a, v]) => ({ label: 'Año ' + a, value: v })) }),
        text('Debes 600 € en una tarjeta al 20 % y no la pagas: en 5 años debes casi 1.500 € sin haber comprado nada más. (Ejemplo.)', 110, 610, 1060, 64, { fontSize: 20, color: DIM, textAlign: 'center' })],
        notes: 'El mismo interés compuesto del ahorro, pero en tu contra. Pagar solo el mínimo alarga y encarece la deuda.' },
      { title: 'Pedir prestado con cabeza', layout: 'titleOnly', bg: BG, extra: [
        ...[['Mira el TAE', 'Es el precio real del préstamo al año. Compáralo.', BL], ['Cuota que puedas pagar', 'Que no se coma tu presupuesto cada mes.', GR], ['Lee la letra pequeña', 'Comisiones, seguros, penalización por adelantar.', AM], ['Evita el «revolving»', 'Intereses altísimos; la deuda no baja casi nunca.', RE]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 200 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:25px;color:${col}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, x, y, 525, 170, PANEL, { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'Cuatro reglas. El TAE permite comparar préstamos distintos. El «revolving» es la trampa más habitual.' },
      { layout: 'blank', bg: '#121a28', extra: [quiz('Debes dinero en una tarjeta de crédito. ¿Qué es lo PEOR que puedes hacer?', ['Pagar todo cuanto antes', 'Pagar solo el mínimo cada mes', 'No volver a usarla hasta saldarla', 'Pedir bajar el interés'], 1)],
        notes: 'Pagar el mínimo mantiene la deuda viva y los intereses corriendo. Es la trampa número uno.' },
      { layout: 'blank', bg: BG, back: [glow(1000, 420, 520, BL, BG, 24)], transition: 'zoom', extra: [
        text('Idea para llevarte', 84, 150, 900, 90, { fontSize: 54, fontWeight: 800, color: INK, fontFamily: S }),
        text('El crédito es una herramienta: bien usada, te ayuda a estudiar o tener casa; mal usada, trabajas para pagar intereses. Antes de firmar, pregunta siempre: ¿cuánto acabaré pagando en total?', 84, 255, 900, 200, { fontSize: 28, color: DIM, lineHeight: 1.45 }),
        after(img(coinStack('#5aa7f0'), 980, 250, 220, 300, 'Monedas'), 'fade-left', { duration: 700 })],
        notes: 'Cierre: la pregunta que lo resume todo es «¿cuánto pagaré en total?».' },
    ]), INK));
  } },

  // 7 · Impuestos: qué son y para qué sirven.
  edu_econ_taxes: { name: 'Impuestos: para qué sirven', cat: 'edu', summary: 'Qué son los impuestos y para qué sirven: del sueldo bruto al neto con un gráfico de cascada, en qué gasta el Estado lo recaudado, el IVA del día a día y por qué pagamos entre todos', make: () => {
    const PAPER = '#f3f2ee', INK = '#242117', TE = '#1f7f7f', BL = '#2f6db0', GR = '#2e9e6b', AM = '#c98a1e', PUR = '#7b4fb0', RE = '#c0553f', GREY = '#5f5a4c', S = FF.space;
    const PIE = [TE, BL, GR, AM, PUR, '#c0553f'];
    return numbered(ink(build({ name: 'Impuestos: para qué sirven', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(1000, -120, 620, TE, PAPER, 14), glow(-140, 560, 520, AM, PAPER, 12)], extra: [
        text('ECONOMÍA Y SOCIEDAD', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: TE, fontWeight: 700 }),
        text('Impuestos:<br>¿a dónde va mi dinero?', 84, 198, 820, 220, { fontSize: 60, fontWeight: 800, color: INK, lineHeight: 1.05, fontFamily: S }),
        text('Cada vez que cobras o compras, una parte va al bote común. ¿Qué se hace con él?', 90, 460, 700, 110, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(icon('building-2', 940, 250, 180, TE), 'fade-up', { duration: 700 })],
        notes: 'Arranque: los impuestos como «el bote común». Enlaza lo que pagas con lo que recibes (cole, sanidad).' },
      { title: '¿Qué son los impuestos?', layout: 'titleContent', bg: PAPER,
        body: ul('Un dinero que pagamos al Estado entre todos', 'Según lo que ganas, lo que compras o lo que tienes', 'Con ellos se pagan servicios para toda la sociedad', 'Quien más gana, suele aportar un porcentaje mayor', 'No son voluntarios: son la cuota de vivir en comunidad'),
        notes: 'Definición. Los impuestos progresivos (quien más gana, más aporta en %) buscan repartir el esfuerzo.' },
      { title: 'Del sueldo bruto al neto', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 100, y: 180, w: 1080, h: 440, chartType: 'waterfall', color: TE, dataLabels: true,
          data: [{ label: 'Sueldo bruto', value: 1600 }, { label: 'IRPF', value: -210 }, { label: 'Seguridad Social', value: -102 }, { label: 'Sueldo neto', value: 0 }] }),
        text('De 1.600 € «en bruto», llegan al bolsillo unos 1.288 €. Lo demás financia servicios y tu futura pensión. (Ejemplo.)', 100, 630, 1080, 40, { fontSize: 21, color: GREY, textAlign: 'center' })],
        notes: 'Cascada de la nómina. El IRPF va a los servicios; la Seguridad Social, a pensiones y sanidad. La última barra se calcula sola.' },
      { title: 'En qué se gasta el Estado', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 100, y: 180, w: 460, h: 450, chartType: 'doughnut', color: TE,
          data: [['Pensiones', 32], ['Sanidad', 16], ['Educación', 10], ['Deuda y otros', 24], ['Infraestructuras', 10], ['Seguridad', 8]].map(([label, value], i) => ({ label, value, color: PIE[i] })) }),
        legend([[PIE[0], '<b>32 %</b> Pensiones'], [PIE[1], '<b>16 %</b> Sanidad'], [PIE[2], '<b>10 %</b> Educación'], [PIE[3], '<b>24 %</b> Deuda y otros'], [PIE[4], '<b>10 %</b> Infraestructuras'], [PIE[5], '<b>8 %</b> Seguridad']], 620, 220, 560, INK, 25)],
        notes: 'Reparto orientativo del gasto público. Pensiones y sanidad se llevan la mayor parte. Cifras de ejemplo.' },
      { title: 'El IVA: lo pagas a diario', layout: 'titleOnly', bg: PAPER, extra: [
        text('El <b style="color:' + BL + '">IVA</b> es un impuesto que ya va metido en el precio de casi todo lo que compras.', 90, 185, 1100, 70, { fontSize: 27, color: INK, lineHeight: 1.4 }),
        tableBlock({ x: 190, y: 270, w: 900, h: 230, stroke: '#d6d2c6',
          rows: [['Producto', 'IVA', 'Ejemplo'], ['Comida básica (pan, leche)', '4 %', 'reducido'], ['Hostelería, transporte', '10 %', 'reducido'], ['Ropa, móviles, ocio', '21 %', 'general']] }),
        text('Por eso 100 € de ropa llevan unos 17 € de IVA dentro del precio.', 190, 520, 900, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'El IVA es indirecto: lo paga todo el mundo al comprar. Tres tipos en España (4, 10 y 21 %).' },
      { layout: 'blank', bg: '#eceae2', extra: [quiz('¿Qué impuesto pagas aunque no tengas sueldo, solo por comprar cosas?', ['El IRPF', 'El IVA', 'La Seguridad Social', 'Ninguno'], 1)],
        notes: 'El IVA va en el precio: lo paga cualquiera que compre, tenga ingresos o no.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, TE, PAPER, 14)], transition: 'zoom', extra: [
        text('Para pensar', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('Mira un ticket de la compra de casa y busca la línea del IVA: ya lo estabas pagando. Y haz una lista de servicios que usaste HOY pagados con impuestos (la clase, la calle, el semáforo…).', 84, 255, 900, 200, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        after(icon('file-text', 980, 250, 170, AM), 'fade-left', { duration: 700 })],
        notes: 'Reto: encontrar el IVA en un ticket y listar servicios públicos usados en un día. Conecta pago y beneficio.' },
    ]), INK));
  } },

  // 8 · Oferta, demanda y precios.
  edu_econ_market: { name: 'Oferta, demanda y precios', cat: 'edu', summary: 'Por qué las cosas valen lo que valen: la oferta y la demanda, el punto de equilibrio donde se fija el precio, por qué suben o bajan los precios y ejemplos del día a día', make: () => {
    const PAPER = '#eef4fb', INK = '#15233a', BL = '#2563c8', OR = '#e07a2e', GR = '#2e9e6b', TE = '#1f8f8f', RE = '#d84b3f', GREY = '#55657e', S = FF.space;
    return numbered(ink(build({ name: 'Oferta, demanda y precios', palette: 'ocean', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(1000, -120, 620, BL, PAPER, 16), glow(-140, 560, 520, OR, PAPER, 12)], extra: [
        text('CÓMO FUNCIONA EL MERCADO', 90, 150, 720, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('¿Por qué cuesta<br>lo que cuesta?', 84, 198, 800, 200, { fontSize: 68, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('El precio no lo pone nadie a dedo: nace del tira y afloja entre quien vende y quien compra.', 90, 448, 720, 110, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(icon('trending-up', 950, 250, 170, BL), 'fade-up', { duration: 700 })],
        notes: 'Arranque: el precio como resultado de oferta y demanda, no de un capricho. Ejemplo: entradas de un concierto.' },
      { title: 'Dos fuerzas', layout: 'twoContent', bg: PAPER, extra: [
        card('<b style="font-size:30px;color:' + OR + '">Oferta</b><br><span style="font-size:23px">Lo que los vendedores quieren vender.</span><br><span style="font-size:22px">Si el precio sube, les interesa vender más.</span>', 90, 200, 540, 320, '#ffffff', { color: INK, radius: 18, borderColor: OR, pad: [22, 26, 20, 26] }),
        card('<b style="font-size:30px;color:' + BL + '">Demanda</b><br><span style="font-size:23px">Lo que los compradores quieren comprar.</span><br><span style="font-size:22px">Si el precio sube, compran menos.</span>', 650, 200, 540, 320, '#ffffff', { color: INK, radius: 18, borderColor: BL, pad: [22, 26, 20, 26] })],
        notes: 'Las dos fuerzas opuestas. Oferta sube con el precio; demanda baja con el precio.' },
      { title: 'El precio de equilibrio', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 175, w: 1060, h: 430, chartType: 'line', color: OR, grid: true, xTitle: 'Cantidad', yTitle: 'Precio (€)', seriesName: 'Oferta',
          data: [1, 2, 3, 4, 5, 6].map((q, i) => ({ label: String(q), value: [5, 10, 15, 20, 25, 30][i] })),
          series: [{ name: 'Demanda', values: [30, 25, 20, 15, 10, 5], color: BL }] }),
        text('Donde se cruzan las dos líneas está el precio al que vendedores y compradores se ponen de acuerdo.', 110, 615, 1060, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Las clásicas curvas que se cruzan. El cruce es el equilibrio. Que localicen el punto en el gráfico.' },
      { title: '¿Por qué suben los precios?', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Hay poco (escasez)', 'Menos producto y misma gente queriéndolo: sube.', RE], ['Lo quiere mucha gente', 'Moda, novedad, temporada alta: la demanda tira.', OR], ['Cuesta más producirlo', 'Si suben los materiales o la energía, sube el precio.', TE], ['Inflación', 'Cuando casi todo sube a la vez, con el tiempo.', GR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 200 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:25px;color:${col}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, x, y, 525, 170, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'Cuatro causas habituales. Ejemplos: mascarillas en 2020 (escasez), entradas de un artista top (demanda).' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 28, x: 70, y: 60, w: 1140, h: 600,
        question: 'Un artista agota el estadio en 5 minutos. ¿Qué pasa con la reventa?', options: ['El precio sube muchísimo', 'El precio baja', 'Se queda igual', 'Nadie las quiere'] })],
        notes: 'Votación: mucha demanda y oferta fija (aforo) disparan el precio de reventa. Caso perfecto de oferta/demanda.' },
      { layout: 'blank', bg: '#e4eefa', extra: [quiz('Hay MÁS tomates que nunca este año y poca gente los compra. ¿Qué pasa con el precio?', ['Sube', 'Baja', 'No cambia', 'Desaparecen del mercado'], 1)],
        notes: 'Mucha oferta y poca demanda = el precio baja. El caso contrario al concierto.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, BL, PAPER, 16)], transition: 'zoom', extra: [
        text('Tu reto', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Fíjate en el precio de las fresas o del turrón a lo largo del año. ¿Cuándo están más baratos? Explica por qué con lo que sabes de oferta y demanda.', 84, 260, 820, 190, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        after(icon('trending-up', 980, 250, 170, GR), 'fade-left', { duration: 700 })],
        notes: 'Reto de temporada: productos de temporada son más baratos (más oferta). Observación del mundo real.' },
    ]), INK));
  } },

  // 9 · Emprender: monta un pequeño negocio (actividad).
  edu_econ_entrepreneur: { name: 'Monta tu pequeño negocio', cat: 'edu', summary: 'Emprender paso a paso con una actividad: una idea que resuelve un problema, el plan en una hoja, las cuentas de ingresos y costes para saber si hay beneficio, y a presentarlo', make: () => {
    const PAPER = '#fbf3e9', INK = '#2a2013', OR = '#d9731e', GR = '#2e9e6b', BL = '#2f6db0', TE = '#1f8f8f', PUR = '#7b4fb0', GREY = '#6b5c47', S = FF.space;
    return numbered(ink(build({ name: 'Monta tu pequeño negocio', palette: 'warm', fonts: 'bold', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(1000, -120, 620, OR, PAPER, 16), glow(-140, 560, 520, GR, PAPER, 12)], extra: [
        text('EMPRENDIMIENTO · ACTIVIDAD', 90, 150, 720, 36, { fontSize: 22, letterSpacing: 3, color: OR, fontWeight: 700 }),
        text('Monta tu<br>pequeño negocio', 84, 198, 820, 200, { fontSize: 70, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('Toda gran empresa empezó siendo una idea para resolver un problema. Hoy os toca a vosotros.', 90, 448, 720, 110, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(icon('lightbulb', 950, 250, 170, OR), 'zoom-in', { duration: 700 })],
        notes: 'Arranque motivador. La actividad transversal del tema: diseñar un mini-negocio por equipos.' },
      { title: 'Empieza por un problema', layout: 'titleContent', bg: PAPER,
        body: ul('¿Qué le molesta o le falta a la gente de tu entorno?', 'Tu negocio es la <b>solución</b> a ese problema', 'Ejemplos: pulseras personalizadas, repaso a peques, reparar bicis', 'Mejor algo pequeño y concreto que una idea enorme', 'Si resuelve algo de verdad, alguien pagará por ello'),
        notes: 'La idea no sale de la nada: sale de un problema. Cuanto más concreto, mejor.' },
      { title: 'El plan en una hoja', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['¿Qué vendes?', 'El producto o servicio, en una frase.', OR], ['¿A quién?', 'Tu cliente: ¿quién lo va a pagar?', BL], ['¿Cómo ganas?', 'Precio por unidad y cómo cobras.', GR], ['¿Qué te cuesta?', 'Materiales, tiempo, transporte.', PUR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 200 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:26px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, y, 525, 170, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'El lienzo mínimo: qué, a quién, cómo gano, qué me cuesta. Cuatro preguntas que ya son un plan.' },
      { title: 'Echa las cuentas', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 150, y: 180, w: 980, h: 320, stroke: '#e0cfb6',
          rows: [['Pulseras artesanas', 'Por unidad', 'Si vendes 50'], ['Precio de venta', '3,00 €', '150,00 €'], ['Coste de materiales', '0,80 €', '40,00 €'], ['Puesto y transporte', '—', '15,00 €'], ['Beneficio', '2,20 €', '95,00 €']] }),
        text('Beneficio = lo que ingresas − lo que gastas. ¡Aquí sí hay negocio!', 150, 520, 980, 50, { fontSize: 24, color: GR, textAlign: 'center', fontWeight: 700 })],
        notes: 'Ejemplo numérico de un negocio real de clase. La idea: no basta con vender, hay que cubrir costes.' },
      { title: '¿Ganas o pierdes?', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 180, w: 1060, h: 420, chartType: 'bar', color: GR, yTitle: 'Euros (al vender 50)',
          data: [{ label: 'Ingresos', value: 150, color: GR }, { label: 'Costes', value: 55, color: '#c0553f' }, { label: 'Beneficio', value: 95, color: BL }] }),
        text('La barra verde menos la roja es la azul: tu beneficio. Si la roja fuera mayor, perderías.', 110, 610, 1060, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'Visual de ingresos vs costes vs beneficio. Preguntar: ¿qué pasaría si el material costara el doble?' },
      { title: 'Vuestro turno', layout: 'titleContent', bg: PAPER,
        body: ul('En equipos, elegid un problema de vuestro entorno', 'Rellenad el plan en una hoja (qué, a quién, cómo, cuánto)', 'Echad las cuentas: precio, coste y beneficio', 'Preparad un «pitch» de 1 minuto', 'Presentadlo a la clase: ¿invertirían en vosotros?'),
        notes: 'Instrucciones de la actividad por equipos. El pitch de 1 minuto es la entrega.' },
      { layout: 'blank', bg: '#f3e6d4', extra: [quiz('Vendes algo a 3 € y te cuesta 3,50 € hacerlo. ¿Qué ocurre?', ['Ganas 0,50 € por unidad', 'Pierdes 0,50 € por unidad', 'Quedas igual', 'Depende de cuántos vendas'], 1)],
        notes: 'Si el coste supera al precio, cada venta es una pérdida. Vender más solo agranda el agujero.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, OR, PAPER, 16)], transition: 'zoom', extra: [
        text('A emprender', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('El mejor negocio no es el de la idea más loca, sino el que resuelve algo real y cubre sus costes. Equivocarse barato en clase es la mejor forma de aprender.', 84, 260, 820, 190, { fontSize: 28, color: GREY, lineHeight: 1.45 }),
        timer(600, 940, 240, 300, { color: OR, endText: '¡A presentar!' })],
        notes: 'Cierre con el cronómetro para preparar los pitches. Celebrar los intentos, no solo los ganadores.' },
    ]), INK));
  } },

  // 10 · Estafas y fraudes: ciberseguridad del dinero (tema de actualidad integrado).
  edu_econ_scams: { name: 'Estafas: no piques', cat: 'edu', summary: 'Cómo reconocer estafas y fraudes financieros de hoy: las señales de alarma, el phishing por SMS y llamada, las reglas de oro para proteger tu dinero y qué hacer si pican', make: () => {
    const BG = '#0e131b', PANEL = '#1a2431', INK = '#e9eefc', RE = '#ef6b6b', AM = '#f2c14e', GR = '#5fd38a', BL = '#5aa7f0', DIM = '#93a3bd', S = FF.space;
    return numbered(ink(build({ name: 'Estafas: no piques', palette: 'midnight', fonts: 'tech', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, RE, BG, 24), glow(-140, 560, 520, AM, BG, 16)], extra: [
        text('SEGURIDAD · TU DINERO', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 4, color: RE, fontWeight: 700, fontFamily: FF.mono }),
        text('Estafas:<br>no piques', 84, 198, 760, 200, { fontSize: 80, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('Las estafas de hoy llegan por el móvil y parecen de verdad. Aprender a olerlas te ahorra disgustos y dinero.', 90, 448, 700, 120, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        after(img(scamSMS(), 860, 230, 360, 260, 'Un SMS de estafa pidiendo datos'), 'fade-left', { duration: 700 })],
        notes: 'Arranque con un SMS falso real-ish. Tema de actualidad: el fraude digital crece y se dirige también a jóvenes.' },
      { title: 'Las señales de alarma', layout: 'titleOnly', bg: BG, extra: [
        ...[['Urgencia', '«¡Actúa YA o pierdes tu cuenta!» El miedo te hace fallar.', RE], ['Premios y gangas', 'Has ganado algo que no jugaste. Si es gratis, sospecha.', AM], ['Te piden datos', 'Nadie serio pide tu PIN, clave o código por mensaje.', RE], ['Enlaces raros', 'Direcciones con faltas o dominios extraños. No toques.', AM]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 200 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:25px;color:${col}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, x, y, 525, 170, PANEL, { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up', { sound: 'pop' })]; }).flat()],
        notes: 'Cuatro banderas rojas. Si aparecen dos o más juntas, casi seguro es estafa.' },
      { title: 'Phishing: el cebo digital', layout: 'twoContent', bg: BG, extra: [
        img(scamSMS(), 120, 190, 400, 290, 'Un SMS fraudulento'),
        text('El <b style="color:' + BL + '">phishing</b> imita a tu banco, a Correos o a una tienda para que piques.<br><br>Fíjate: prisa, faltas de ortografía, un enlace que NO es la web oficial y la petición de datos. Tu banco nunca te escribe así.', 580, 200, 600, 400, { fontSize: 25, color: INK, lineHeight: 1.45 })],
        notes: 'Analizar el SMS juntos: señalar la urgencia, la falta de tilde, el dominio falso. El «smishing» es phishing por SMS.' },
      { title: 'Reglas de oro', layout: 'titleOnly', bg: BG, extra: [
        ...[['Para y respira', 'La prisa es su arma. Tómate un minuto.', GR], ['Entra tú a la web', 'Nunca por el enlace: escribe la dirección oficial.', BL], ['Jamás des claves', 'Ni PIN, ni contraseñas, ni códigos del SMS.', GR], ['Confirma por otro canal', 'Llama al banco al número de su tarjeta, no al del mensaje.', BL]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 200 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:25px;color:${col}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, x, y, 525, 170, PANEL, { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'Cuatro reglas. La más importante: entrar tú a la web oficial, nunca por el enlace que te mandan.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 28, x: 70, y: 60, w: 1140, h: 600,
        question: '¿Has recibido alguna vez un mensaje así?', options: ['Sí, y casi pico', 'Sí, pero lo vi venir', 'No, o no me fijé', 'Le ha pasado a alguien que conozco'] })],
        notes: 'Votación para que vean lo común que es. Casi todos levantarán la mano: eso es lo preocupante y lo útil de hablarlo.' },
      { layout: 'blank', bg: '#121a26', extra: [quiz('Un SMS de «tu banco» te pide la clave por un enlace. ¿Qué haces?', ['Pongo la clave rápido, por si acaso', 'Borro el mensaje y entro yo a la web del banco', 'Respondo preguntando si es real', 'Reenvío el enlace a un amigo'], 1)],
        notes: 'Respuesta correcta: ignorar el enlace y entrar por tu cuenta. Nunca dar datos ni responder.' },
      { layout: 'blank', bg: BG, back: [glow(1000, 420, 520, GR, BG, 22)], transition: 'zoom', extra: [
        text('Si has picado', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('No pasa nada por avisar: llama a tu banco para bloquear la tarjeta, cambia las contraseñas y cuéntaselo a un adulto. Cuanto antes actúes, menos daño. Y denúncialo a la policía.', 84, 255, 900, 200, { fontSize: 28, color: DIM, lineHeight: 1.45 }),
        after(icon('shield-check', 1000, 250, 150, GR), 'zoom-in', { duration: 700 })],
        notes: 'Cierre sin culpa: lo importante es reaccionar rápido y pedir ayuda. Quitar la vergüenza salva dinero.' },
    ]), INK));
  } },

};
