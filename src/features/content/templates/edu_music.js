// Example presentations: Música. Diez clases visuales de música para secundaria, dibujadas por nosotros (SVG como
// data URL): leer el pentagrama, el ritmo, la orquesta, la historia, las escalas, la voz, la banda sonora, las músicas
// del mundo, crear una melodía y del vinilo al streaming. Cada una: portada de impacto, desarrollo visual, una
// actividad interactiva (votación o quiz) y un cierre. Ninguna imagen de fuera.

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
const FF = { mono: "'JetBrains Mono', monospace", space: "'Space Grotesk', sans-serif", caveat: "'Caveat', cursive", bebas: "'Bebas Neue', sans-serif", special: "'Special Elite', monospace" };
const ink = (deck, color) => Object.assign(deck, { textColor: color });

// A music staff (pentagrama) with a drawn G-clef and note heads. notes: [{ y, c, l }] placed left to right.
const staff = (notes = [], line = '#8a8aa0') => svgURL(1040, 220,
  [0, 1, 2, 3, 4].map(i => `<line x1="40" y1="${50 + i * 28}" x2="1000" y2="${50 + i * 28}" stroke="${line}" stroke-width="2"/>`).join('')
  + `<path d="M104 176 c-30 2 -42 -34 -14 -48 c34 -17 50 22 32 46 c-14 18 -42 20 -52 2 M118 40 c20 24 12 96 -8 128" fill="none" stroke="#6d4fb0" stroke-width="7" stroke-linecap="round"/>`
  + notes.map((n, i) => { const x = 240 + i * 100; return `<ellipse cx="${x}" cy="${n.y}" rx="16" ry="12" fill="${n.c}" transform="rotate(-20 ${x} ${n.y})"/><line x1="${x + 15}" y1="${n.y - 4}" x2="${x + 15}" y2="${n.y - 72}" stroke="${n.c}" stroke-width="3"/><text x="${x}" y="206" font-family="sans-serif" font-size="22" fill="#55556a" text-anchor="middle">${n.l}</text>`; }).join(''));

// A piano keyboard of `whites` white keys, with some highlighted (indices into the white keys).
const piano = (whites = 14, hi = []) => { const W = 72; return svgURL(whites * W + 4, 210,
  Array.from({ length: whites }, (_, i) => `<rect x="${2 + i * W}" y="2" width="${W - 2}" height="206" rx="7" fill="${hi.includes(i) ? '#f2c14e' : '#ffffff'}" stroke="#2a2a3a" stroke-width="2"/>`).join('')
  + Array.from({ length: whites }, (_, i) => ([0, 1, 3, 4, 5].includes(i % 7) && i < whites - 1) ? `<rect x="${2 + i * W + W * 0.66}" y="2" width="${W * 0.62}" height="126" rx="5" fill="#1b1b28"/>` : '').join('')); };

// A waveform: sine / square / saw / soft (a fading sine).
const wave = (color, kind = 'sine', w = 520, h = 180) => { const mid = h / 2; let d = `M0 ${mid.toFixed(1)}`;
  for (let x = 0; x <= w; x += 4) { const t = x / w * Math.PI * 6; let y;
    if (kind === 'square') y = Math.sign(Math.sin(t)); else if (kind === 'saw') y = ((t / Math.PI) % 2) - 1;
    else if (kind === 'soft') y = Math.sin(t) * Math.exp(-x / w * 2.2); else y = Math.sin(t);
    d += ` L${x} ${(mid - y * mid * 0.72).toFixed(1)}`; }
  return svgURL(w, h, `<path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round"/>`); };

export default {

  // 1 · Leer el pentagrama: las cinco líneas, la clave de sol y las notas do-re-mi.
  edu_music_notes: { name: 'Leer música: el pentagrama', cat: 'edu', summary: 'Una primera clase para leer música: las cinco líneas del pentagrama, la clave de sol, las notas do-re-mi-fa-sol-la-si dibujadas sobre el pentagrama, grave y agudo, y un quiz para comprobar', make: () => {
    const PAPER = '#f6f3ee', INK = '#2a2436', PUR = '#6d4fb0', TE = '#1f8f8f', ORA = '#e0873b', GR = '#2e9e6b', GREY = '#6a6478', S = FF.space;
    const SCALE = [{ y: 176, c: '#d84b6b', l: 'do' }, { y: 162, c: '#e0873b', l: 're' }, { y: 148, c: '#d9b53b', l: 'mi' }, { y: 134, c: '#2e9e6b', l: 'fa' }, { y: 120, c: '#1f8f8f', l: 'sol' }, { y: 106, c: '#2f6df0', l: 'la' }, { y: 92, c: '#6d4fb0', l: 'si' }, { y: 78, c: '#d84b6b', l: 'do' }];
    return numbered(ink(build({ name: 'Leer música: el pentagrama', palette: 'violet', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, PUR, PAPER, 16), glow(-120, 560, 520, TE, PAPER, 12)], extra: [
        text('MÚSICA · LENGUAJE MUSICAL', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: PUR, fontWeight: 700 }),
        text('Leer el<br>pentagrama', 84, 192, 820, 200, { fontSize: 82, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        after(img(staff(SCALE), 90, 452, 1080, 220, 'Un pentagrama con la escala de do a do'), 'fade-up', { duration: 800 })],
        notes: 'Arranque: la música también se escribe. Hoy aprendemos a leer el pentagrama, como quien aprende el abecedario.' },
      { title: 'Las cinco líneas', layout: 'titleOnly', bg: PAPER, extra: [
        img(staff(), 90, 170, 1080, 210, 'Un pentagrama vacío'),
        text('El <b>pentagrama</b> son <b style="color:' + PUR + '">5 líneas</b> y <b style="color:' + TE + '">4 espacios</b>. Cada posición, de abajo arriba, es una nota más aguda.', 90, 400, 1100, 100, { fontSize: 28, color: INK, lineHeight: 1.4 }),
        text('Las notas se escriben sobre las líneas o en los espacios.', 90, 520, 1100, 50, { fontSize: 23, color: GREY })],
        notes: 'Señalar líneas y espacios. Cuanto más arriba, más agudo el sonido. Aún sin notas, solo el «papel pautado».' },
      { title: 'La clave de sol', layout: 'twoContent', bg: PAPER, extra: [
        img(staff([{ y: 120, c: TE, l: 'sol' }]), 100, 210, 620, 210, 'La clave de sol señalando la nota sol'),
        text(ul('Es el símbolo del principio del pentagrama', 'Rodea la línea donde vive la nota <b>sol</b>', 'A partir de ahí se nombran todas las demás', 'Es la clave de las voces e instrumentos agudos'), 760, 220, 420, 400, { fontSize: 25, color: INK, lineHeight: 1.5 })],
        notes: 'La clave de sol nos da el punto de referencia: fija dónde está el sol y el resto se cuenta desde ahí.' },
      { title: 'Do, re, mi… las siete notas', layout: 'titleOnly', bg: PAPER, extra: [
        img(staff(SCALE), 90, 180, 1080, 220, 'La escala do re mi fa sol la si do sobre el pentagrama'),
        text('Siete notas que se repiten subiendo: <b>do re mi fa sol la si</b> y otra vez do, más agudo (una <b>octava</b> más alta).', 90, 430, 1100, 100, { fontSize: 27, color: INK, lineHeight: 1.4 })],
        notes: 'Cantar la escala señalando cada nota. La octava: el do de arriba «suena igual» pero más agudo.' },
      { title: 'Grave y agudo', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Grave', 'Notas bajas: suenan abajo del pentagrama. Como un trueno o un contrabajo.', TE], ['Agudo', 'Notas altas: suenan arriba. Como un silbido o un violín.', ORA]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:24px;color:${INK}">${d}</span>`, 90 + i * 560, 220, 510, 200, '#ffffff', { color: INK, radius: 18, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat(),
        text('En el pentagrama: abajo = grave, arriba = agudo.', 90, 470, 1100, 50, { fontSize: 24, color: GREY, textAlign: 'center' })],
        notes: 'Relacionar la altura en el papel con la altura del sonido. Pedir ejemplos de sonidos graves y agudos de su día a día.' },
      { layout: 'blank', bg: PAPER, extra: [quiz('En el pentagrama, una nota escrita MÁS ARRIBA suena…', ['Más grave', 'Más aguda', 'Más fuerte', 'Más larga'], 1)],
        notes: 'Repaso de la idea clave: arriba = agudo (no «más fuerte», que es el volumen; ni «más larga», que es la duración).' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, PUR, PAPER, 14)], transition: 'zoom', extra: [
        text('Tu primer dictado', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Dibuja un pentagrama, pon la clave de sol y escribe la escala de do a do. Después, invéntate 4 notas y pásalas a un compañero para que las cante.', 84, 260, 760, 180, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(300, 920, 230, 300, { color: PUR, endText: '¡A cantar!' })],
        notes: 'Cinco minutos de práctica. El objetivo no es la perfección, sino perder el miedo al pentagrama.' },
    ]), INK));
  } },

  // 2 · El ritmo: pulsación, figuras (redonda, blanca, negra, corchea), silencios y el compás.
  edu_music_rhythm: { name: 'El ritmo y las figuras', cat: 'edu', summary: 'El ritmo en música: la pulsación, las figuras (redonda, blanca, negra y corchea) con su duración dibujadas, los silencios, el compás de cuatro por cuatro, una actividad de palmas y un quiz', make: () => {
    const BG = '#121018', INK = '#f3eefa', AM = '#f2c14e', TE = '#39c0c8', GR = '#5fd38a', RE = '#e07a9a', DIM = '#9a90ad', S = FF.space;
    const figSVG = (kind, c) => { const filled = kind === 'negra' || kind === 'corchea';
      const head = filled ? `fill="${c}"` : `fill="none" stroke="${c}" stroke-width="6"`;
      const stem = kind === 'redonda' ? '' : `<line x1="80" y1="118" x2="80" y2="24" stroke="${c}" stroke-width="5"/>`;
      const flag = kind === 'corchea' ? `<path d="M80 24 q34 10 26 50" fill="none" stroke="${c}" stroke-width="5"/>` : '';
      return svgURL(130, 170, `<ellipse cx="54" cy="120" rx="30" ry="22" ${head} transform="rotate(-18 54 120)"/>${stem}${flag}`); };
    return numbered(ink(build({ name: 'El ritmo y las figuras', palette: 'midnight', fonts: 'bold', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, AM, BG, 26), glow(-120, 560, 520, TE, BG, 20)], extra: [
        text('MÚSICA · RITMO', 90, 140, 640, 36, { fontSize: 22, letterSpacing: 4, color: AM, fontWeight: 700, fontFamily: FF.mono }),
        text('El pulso de<br>la música', 84, 188, 760, 220, { fontSize: 80, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('Las notas no solo suben y bajan: también duran. Eso es el ritmo.', 90, 452, 680, 90, { fontSize: 28, color: DIM }),
        ...['redonda', 'blanca', 'negra', 'corchea'].map((k, i) => after(img(figSVG(k, [RE, AM, TE, GR][i]), 820 + i * 95, 210, 110, 150, k), 'zoom-in', { duration: 400 }))],
        notes: 'Arranque: dar palmas a un pulso constante. El ritmo es cuánto dura cada sonido sobre ese pulso.' },
      { title: 'La pulsación', layout: 'titleOnly', bg: BG, extra: [
        text('El <b style="color:' + AM + '">pulso</b> es el latido constante de la música, como el tic-tac de un reloj o los pasos al andar.', 90, 200, 1100, 110, { fontSize: 32, color: INK, lineHeight: 1.4 }),
        ...[0, 1, 2, 3].map(i => along(shape('ellipse', 180 + i * 230, 400, 90, 90, AM, { opacity: 90 }), 'pulse', { start: i ? 'afterPrev' : 'click' })),
        text('1', 215, 420, 90, 60, { fontSize: 44, color: '#121018', fontWeight: 800, textAlign: 'center' })],
        notes: 'Marcar el pulso con palmas o con el pie. Todo lo demás (las figuras) se mide contra este latido.' },
      { title: '¿Cuánto dura cada figura?', layout: 'titleOnly', bg: BG, extra: [
        ...[['Redonda', '4 pulsos', RE], ['Blanca', '2 pulsos', AM], ['Negra', '1 pulso', TE], ['Corchea', 'medio pulso', GR]].map(([t, d, col], i) => { const x = 90 + i * 282; return [
          img(figSVG(t.toLowerCase(), col), x + 70, 200, 130, 160, t),
          on(card(`<b style="font-size:26px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, 380, 270, 130, '#1d1a28', { color: INK, radius: 16, borderColor: col, pad: [16, 18, 14, 18] }), 'fade-up', { sound: 'pop' })]; }).flat()],
        notes: 'Cada figura dura el doble que la siguiente: redonda = 2 blancas = 4 negras = 8 corcheas. Palmear cada una sobre el pulso.' },
      { title: 'El silencio también suena', layout: 'twoContent', bg: BG, extra: [
        img(wave(TE, 'soft', 500, 240), 110, 210, 500, 240, 'Una onda que se apaga: el silencio'),
        text('Un <b>silencio</b> es una pausa: un tiempo en el que NO se toca. Cada figura tiene su silencio, con la misma duración. La música es sonido… y espacio entre sonidos.', 680, 230, 500, 260, { fontSize: 27, color: INK, lineHeight: 1.45 })],
        notes: 'El silencio es parte de la música, no un error. Sin silencios, todo sería ruido continuo.' },
      { title: 'El compás de 4/4', layout: 'titleOnly', bg: BG, extra: [
        dg('process', 'Pulso 1\nPulso 2\nPulso 3\nPulso 4', 110, 210, 1060, 180, { color: INK }),
        text('El <b style="color:' + AM + '">compás</b> agrupa los pulsos. El más común es el <b>4/4</b>: cuatro pulsos que se repiten una y otra vez (1-2-3-4, 1-2-3-4…).', 90, 450, 1100, 110, { fontSize: 27, color: INK, lineHeight: 1.4 })],
        notes: 'Contar en voz alta 1-2-3-4 marcando el 1 más fuerte. Casi todas las canciones que conocen van en 4/4.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿Qué canción vamos a palmear todos juntos?', options: ['Una lenta (muchas blancas)', 'Una marcha (negras firmes)', 'Una rápida (corcheas)', 'Una con muchos silencios'] })],
        notes: 'Votación para elegir el ejercicio de palmas. Cualquiera sirve: lo importante es sentir el pulso y las figuras.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuántas negras caben en una redonda?', ['2', '3', '4', '8'], 2)],
        notes: 'Repaso: redonda = 4 negras. Si dudan, recordar la escalera de duraciones.' },
      { layout: 'blank', bg: BG, back: [glow(640, 360, 760, GR, BG, 30)], transition: 'zoom', extra: [
        text('Ritmo de nombres', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('Cada uno palmea su nombre marcando las sílabas (A-na = 2 negras; Pe-ne-lo-pe = 4 corcheas). Luego, en círculo, encadenad los nombres sin perder el pulso.', 84, 260, 820, 180, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        timer(240, 940, 230, 280, { color: GR, endText: '¡Qué ritmo!' })],
        notes: 'Actividad clásica y divertida: los nombres como ritmos. Conecta las figuras con algo propio de cada alumno.' },
    ]), INK));
  } },

  // 3 · Las familias de la orquesta: cuerda, viento madera, viento metal y percusión.
  edu_music_instruments: { name: 'Las familias de la orquesta', cat: 'edu', summary: 'La orquesta y sus cuatro familias de instrumentos (cuerda, viento madera, viento metal y percusión): cómo suena cada una, ejemplos, dónde se colocan y un quiz para reconocerlas', make: () => {
    const PAPER = '#f4f2ee', INK = '#241d14', BR = '#9a5b2a', GR = '#2e7d46', BL = '#2f5fa8', RE = '#c0492f', GOLD = '#b08018', GREY = '#6a6254', S = FF.space;
    return numbered(ink(build({ name: 'Las familias de la orquesta', palette: 'warm', fonts: 'classic', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, GOLD, PAPER, 16), glow(-120, 560, 520, BL, PAPER, 12)], extra: [
        text('MÚSICA · LA ORQUESTA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BR, fontWeight: 700 }),
        text('Cuatro familias,<br>un solo sonido', 84, 198, 900, 180, { fontSize: 68, fontWeight: 800, color: INK, lineHeight: 1.05, fontFamily: S }),
        text('Decenas de instrumentos tocando a la vez, dirigidos por una sola persona. ¿Cómo se organizan?', 90, 420, 760, 100, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(icon('music', 980, 210, 180, GOLD), 'zoom-in', { duration: 700 })],
        notes: 'Arranque: la orquesta sinfónica. Hoy no los instrumentos uno a uno, sino las cuatro grandes familias.' },
      { title: 'Las cuatro familias', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Cuerda', 'Violín, viola, cello, contrabajo, arpa. Suenan al frotar o pulsar cuerdas.', RE], ['Viento madera', 'Flauta, clarinete, oboe, fagot. El aire vibra dentro del tubo.', GR], ['Viento metal', 'Trompeta, trombón, trompa, tuba. Potentes y brillantes.', GOLD], ['Percusión', 'Timbales, caja, platillos, xilófono. Marcan el ritmo.', BL]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 205 + Math.floor(i / 2) * 215; return [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:23px;color:${INK}">${d}</span>`, x, y, 525, 185, '#ffffff', { color: INK, radius: 18, borderColor: col, pad: [20, 24, 18, 24] }), 'fade-up', { sound: 'pop' })]; }).flat()],
        notes: 'Un clic por familia. Para cada una, imitar con la voz o el cuerpo cómo suena (frotar, soplar, golpear).' },
      { title: '¿Cómo produce el sonido cada una?', layout: 'titleOnly', bg: PAPER, extra: [
        dg('list', 'Cuerda → una cuerda que vibra (arco o dedos)\nViento → una columna de aire que vibra al soplar\nPercusión → un material que vibra al golpearlo', 110, 200, 1060, 320, { color: INK }),
        text('Toda música nace de algo que vibra y mueve el aire hasta tu oído.', 110, 560, 1060, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'La idea física común: algo vibra. Cuerda, aire o membrana. Conecta con la clase de física del sonido.' },
      { title: 'Dónde se sientan', layout: 'twoContent', bg: PAPER, extra: [
        img(svgURL(520, 360, `<path d="M40 340 A230 230 0 0 1 480 340 Z" fill="#efe7da" stroke="#cdbfa8" stroke-width="2"/>`
          + `<rect x="235" y="300" width="50" height="40" rx="4" fill="#241d14"/><text x="260" y="356" font-family="sans-serif" font-size="18" fill="#6a6254" text-anchor="middle">director</text>`
          + [['cuerda', '#c0492f', 150], ['madera', '#2e7d46', 210], ['metal', '#b08018', 160], ['percusión', '#2f5fa8', 90]].map(([l, c, cx], i) => `<circle cx="${80 + i * 110}" cy="${200 - (i % 2) * 40}" r="30" fill="${c}" opacity="0.85"/><text x="${80 + i * 110}" y="${255 - (i % 2) * 40}" font-family="sans-serif" font-size="16" fill="#241d14" text-anchor="middle">${l}</text>`).join('')), 100, 200, 520, 360, 'Colocación de las familias en semicírculo alrededor del director'),
        text('Se colocan en semicírculo alrededor del <b>director</b>: las cuerdas delante, los vientos detrás y la percusión al fondo, para que todo llegue equilibrado al público.', 680, 240, 500, 250, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'La disposición no es al azar: busca el equilibrio de volumen. Lo más suave (cuerda), delante; lo más potente, detrás.' },
      { title: 'El director: el pegamento', layout: 'twoContent', bg: PAPER, extra: [
        img(svgURL(420, 360, `<circle cx="210" cy="120" r="50" fill="#efe3d2" stroke="#9a5b2a" stroke-width="3"/><rect x="170" y="170" width="80" height="140" rx="20" fill="#241d14"/>`
          + `<line x1="250" y1="190" x2="360" y2="90" stroke="#9a5b2a" stroke-width="6" stroke-linecap="round"/><circle cx="366" cy="84" r="8" fill="#b08018"/>`
          + `<path d="M150 330 h120" stroke="#cdbfa8" stroke-width="4"/>`), 120, 200, 420, 360, 'Un director con la batuta en alto'),
        text('El <b style="color:' + BR + '">director</b> no toca ningún instrumento: marca el tempo, señala las entradas y cuida que todos suenen juntos y equilibrados. Es quien convierte muchos músicos en una sola voz.', 620, 250, 560, 240, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'El director da unidad: sin él, decenas de músicos no podrían empezar y terminar a la vez ni dosificar la intensidad.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Si tocaras en la orquesta, ¿qué familia elegirías?', options: ['Cuerda', 'Viento madera', 'Viento metal', 'Percusión'] })],
        notes: 'Votación para enganchar y hacer suyo el tema. Sirve de puente al quiz.' },
      { layout: 'blank', bg: PAPER, extra: [quiz('El clarinete y la flauta pertenecen a la familia de…', ['Cuerda', 'Viento madera', 'Viento metal', 'Percusión'], 1)],
        notes: 'Repaso. Curiosidad: la flauta hoy es de metal, pero pertenece a «viento madera» por cómo produce el sonido.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, GOLD, PAPER, 14)], transition: 'zoom', extra: [
        text('Caza de instrumentos', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('Escuchad un fragmento de orquesta con los ojos cerrados. Cada equipo anota qué familias oye y en qué momento. Luego se comprueba.', 84, 260, 780, 170, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(240, 940, 230, 280, { color: BR, endText: '¡A comparar!' })],
        notes: 'Entrena el oído. Cualquier fragmento sinfónico sirve; mejor uno con entradas claras de cada familia.' },
    ]), INK));
  } },

  // 4 · Historia de la música: del barroco a hoy, en una línea de tiempo.
  edu_music_history: { name: 'Historia de la música', cat: 'edu', summary: 'Un viaje por la historia de la música occidental del barroco a hoy en una línea de tiempo: barroco, clasicismo, romanticismo, siglo XX y música actual, con sus rasgos y un quiz', make: () => {
    const BG = '#0f0c16', INK = '#f1ecf7', GOLD = '#e8c04b', RE = '#e07a5f', TE = '#39c0c8', VI = '#b48ce8', GR = '#5fd38a', DIM = '#9a90ad', S = FF.space;
    return numbered(ink(build({ name: 'Historia de la música', palette: 'midnight', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, GOLD, BG, 24), glow(-120, 560, 520, VI, BG, 20)], extra: [
        text('MÚSICA · HISTORIA', 90, 140, 640, 36, { fontSize: 22, letterSpacing: 4, color: GOLD, fontWeight: 700, fontFamily: FF.mono }),
        text('Cuatro siglos<br>de música', 84, 188, 820, 200, { fontSize: 78, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('De las pelucas de Bach a la música que llevas en el bolsillo. Un mismo arte, muchas épocas.', 90, 398, 720, 100, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        after(img(staff([{ y: 148, c: GOLD, l: '' }, { y: 120, c: RE, l: '' }, { y: 134, c: TE, l: '' }, { y: 92, c: VI, l: '' }]), 140, 515, 880, 186, 'Un pentagrama decorativo'), 'fade-up', { duration: 800 })],
        notes: 'Arranque: la música tiene historia, como el arte o la literatura. Vamos a recorrerla por grandes épocas.' },
      { title: 'La línea del tiempo', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', 'Barroco · 1600-1750 · Bach, Vivaldi\nClasicismo · 1750-1820 · Mozart, Haydn\nRomanticismo · 1820-1900 · Beethoven, Chopin\nSiglo XX · 1900-2000 · jazz, rock, electrónica\nHoy · pop, urbano y global', 90, 200, 1100, 380, { color: INK })],
        notes: 'Vista general. Cada época nace de la anterior y reacciona contra ella. Las fechas son orientativas.' },
      { title: 'Barroco y Clasicismo', layout: 'titleOnly', bg: BG, extra: [
        ...[['Barroco', 'Adornado y contrastado. El órgano y el clave. Bach y Vivaldi («Las cuatro estaciones»).', GOLD], ['Clasicismo', 'Claro y equilibrado. Nace la sinfonía y el piano. Mozart y Haydn.', TE]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:24px;color:${INK}">${d}</span>`, 90 + i * 560, 220, 510, 230, '#1a1526', { color: INK, radius: 18, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat()],
        notes: 'Del adorno barroco al equilibrio clásico. Si hay audio, un minuto de cada uno vale más que mil palabras.' },
      { title: 'Romanticismo y siglo XX', layout: 'titleOnly', bg: BG, extra: [
        ...[['Romanticismo', 'Emoción y grandeza. Orquestas enormes. Beethoven abre la puerta; Chopin, Verdi.', RE], ['Siglo XX', 'Todo estalla: jazz, rock, electrónica, cine. Las reglas se rompen.', VI]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:24px;color:${INK}">${d}</span>`, 90 + i * 560, 220, 510, 230, '#1a1526', { color: INK, radius: 18, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat()],
        notes: 'El romanticismo pone el sentimiento en el centro; el siglo XX multiplica los estilos con la tecnología.' },
      { title: 'Y hoy: todo a la vez', layout: 'titleOnly', bg: BG, extra: [
        ...[['Pop', 'Canciones pegadizas para todos los públicos.', TE], ['Urbano', 'Rap, trap y reguetón: ritmo y palabra.', GOLD], ['Electrónica', 'Música hecha con ordenadores y sintetizadores.', VI], ['Global', 'Estilos de todo el mundo que se mezclan en un clic.', RE]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 205 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:28px;color:${col}">${t}</b><br><span style="font-size:23px;color:${INK}">${d}</span>`, x, y, 525, 175, '#1a1526', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up', { sound: 'pop' })]; }).flat()],
        notes: 'La época actual no tiene un solo estilo: conviven todos, y la tecnología los mezcla sin parar.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿Qué época te gustaría escuchar ahora?', options: ['Barroco (Vivaldi)', 'Clásico (Mozart)', 'Romántico (Beethoven)', 'Siglo XX (jazz/rock)'] })],
        notes: 'Votación para elegir la audición. Sirve para enganchar antes del quiz.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿En qué época situamos a Mozart?', ['Barroco', 'Clasicismo', 'Romanticismo', 'Siglo XX'], 1)],
        notes: 'Repaso. Mozart = clasicismo. Beethoven hace de puente hacia el romanticismo.' },
      { layout: 'blank', bg: BG, back: [glow(640, 360, 760, GOLD, BG, 28)], transition: 'zoom', extra: [
        text('Tu línea de tiempo', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('Haz tu propia línea del tiempo musical: añade a las cinco épocas tus canciones favoritas de hoy. ¿En qué se parecen y en qué se diferencian de la música de hace 300 años?', 84, 260, 820, 190, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        timer(300, 940, 230, 280, { color: GOLD, endText: '¡A debatir!' })],
        notes: 'Conecta la historia con su música. Idea grande: todo lo de hoy viene de algo anterior.' },
    ]), INK));
  } },

  // 5 · Escalas: tonos y semitonos, la escala mayor y la menor, en el piano.
  edu_music_scales: { name: 'Escalas: mayor y menor', cat: 'edu', summary: 'Las escalas en el piano: tonos y semitonos, por qué el piano tiene teclas negras, la escala mayor (alegre) y la menor (triste), una votación para adivinar el carácter y un quiz', make: () => {
    const PAPER = '#eef1f6', INK = '#1a2030', BL = '#2f6df0', OR = '#e8823b', GR = '#2e9e6b', PUR = '#6d4fb0', GREY = '#5f6a80', S = FF.space;
    return numbered(ink(build({ name: 'Escalas: mayor y menor', palette: 'ocean', fonts: 'clean', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, BL, PAPER, 14), glow(-120, 560, 520, OR, PAPER, 12)], extra: [
        text('MÚSICA · ESCALAS', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('Tonos, semitonos<br>y teclas negras', 84, 198, 900, 180, { fontSize: 66, fontWeight: 800, color: INK, lineHeight: 1.05, fontFamily: S }),
        after(img(piano(14, [0, 2, 4, 5, 7, 9, 11, 14].filter(k => k < 14)), 90, 440, 1010, 210, 'Un teclado de piano con la escala de do marcada'), 'fade-up', { duration: 800 })],
        notes: 'Arranque con el piano: la herramienta perfecta para ver la música. ¿Por qué hay teclas negras?' },
      { title: 'Tono y semitono', layout: 'twoContent', bg: PAPER, extra: [
        img(piano(8, [0, 1]), 110, 220, 530, 210, 'Dos teclas contiguas: un semitono'),
        text('De una tecla a la de al lado (contando las negras) hay un <b style="color:' + deep(OR, PAPER) + '">semitono</b>: la distancia más pequeña. Dos semitonos seguidos son un <b style="color:' + deep(BL, PAPER) + '">tono</b>.', 690, 240, 490, 230, { fontSize: 27, color: INK, lineHeight: 1.45 })],
        notes: 'Semitono = teclas contiguas. Tono = dos semitonos. Esta es la unidad de medida de las distancias entre notas.' },
      { title: '¿Por qué teclas negras?', layout: 'titleOnly', bg: PAPER, extra: [
        img(piano(14, []), 90, 190, 1010, 210, 'Teclado completo con blancas y negras'),
        text('Las blancas son do-re-mi-fa-sol-la-si. Las negras son las notas intermedias (sostenidos y bemoles). Entre mi-fa y si-do <b>no hay negra</b>: ahí ya solo hay un semitono.', 90, 430, 1100, 110, { fontSize: 26, color: INK, lineHeight: 1.4 })],
        notes: 'El detalle que todos notan: faltan negras entre mi-fa y si-do. Porque ahí la distancia natural ya es de semitono.' },
      { title: 'La escala mayor', layout: 'titleOnly', bg: PAPER, extra: [
        img(piano(8, [0, 1, 2, 3, 4, 5, 6, 7].filter(k => k < 8)), 160, 190, 580, 210, 'La escala de do mayor en teclas blancas'),
        text('Do mayor son las 7 teclas blancas de do a do. Su patrón de tonos y semitonos (T-T-S-T-T-T-S) le da un carácter <b style="color:' + deep(OR, PAPER) + '">alegre y luminoso</b>.', 90, 430, 1100, 110, { fontSize: 26, color: INK, lineHeight: 1.4 })],
        notes: 'La escala mayor: el patrón T-T-S-T-T-T-S. No hace falta memorizarlo; basta reconocer que suena «contento».' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Escucha las dos melodías. ¿Cuál suena más TRISTE?', options: ['La primera (mayor)', 'La segunda (menor)', 'Las dos igual', 'Ninguna suena triste'] })],
        notes: 'Votación tras tocar una melodía en mayor y la misma en menor. La menor suele percibirse como más triste o seria.' },
      { title: 'Mayor y menor', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Mayor', 'Suele sonar alegre, abierta, luminosa. Mucha música de fiesta.', OR], ['Menor', 'Suele sonar triste, seria, misteriosa. Baladas y bandas sonoras de tensión.', PUR]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:24px;color:${INK}">${d}</span>`, 90 + i * 560, 220, 510, 200, '#ffffff', { color: INK, radius: 18, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat(),
        text('Misma nota de inicio, distinto patrón: cambia el carácter, no la altura.', 90, 460, 1100, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Mayor vs menor: no es «aguda/grave» sino carácter. Es una de las ideas más potentes de la música.' },
      { layout: 'blank', bg: PAPER, extra: [quiz('De una tecla del piano a la de al lado (contando negras) hay…', ['Un tono', 'Un semitono', 'Una octava', 'Una escala'], 1)],
        notes: 'Repaso: teclas contiguas = semitono. El tono son dos semitonos.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, BL, PAPER, 14)], transition: 'zoom', extra: [
        text('Mayor ↔ menor', 84, 150, 820, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Busca una canción que te guste y decide si suena mayor (alegre) o menor (triste). Compártela con la clase y justifica por qué lo crees.', 84, 260, 780, 170, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(300, 920, 230, 300, { color: BL, endText: '¡A clasificar!' })],
        notes: 'Llevar la teoría a su música. No pasa nada si se equivocan: lo valioso es escuchar con intención.' },
    ]), INK));
  } },

  // 6 · La voz y el coro: cómo funciona la voz y las tesituras (soprano, contralto, tenor, bajo).
  edu_music_voice: { name: 'La voz y el coro', cat: 'edu', summary: 'La voz como instrumento: cómo se produce el sonido, las cuatro tesituras del coro (soprano, contralto, tenor y bajo) con su registro dibujado, cómo cuidarla y una votación para formar el coro', make: () => {
    const PAPER = '#f4f4f1', INK = '#201d1a', RE = '#c0492f', OR = '#dd8a2a', TE = '#1f8f8f', BL = '#2f5fa8', GREY = '#6a645c', S = FF.space;
    const range = () => svgURL(1040, 300, [['Soprano', '#c0492f', 60], ['Contralto', '#dd8a2a', 240], ['Tenor', '#1f8f8f', 420], ['Bajo', '#2f5fa8', 600]].map(([l, c, x], i) => {
      const w = 360 - i * 50; return `<rect x="${x}" y="${60 + i * 12}" width="${w}" height="44" rx="22" fill="${c}" opacity="0.85"/><text x="${x + 10}" y="${90 + i * 12}" font-family="sans-serif" font-size="24" fill="#ffffff" font-weight="700">${l}</text>`; }).join('')
      + `<text x="60" y="290" font-family="sans-serif" font-size="22" fill="#6a645c">← más grave</text><text x="980" y="290" font-family="sans-serif" font-size="22" fill="#6a645c" text-anchor="end">más agudo →</text>`);
    return numbered(ink(build({ name: 'La voz y el coro', palette: 'paper', fonts: 'friendly', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, OR, PAPER, 16), glow(-120, 560, 520, TE, PAPER, 12)], extra: [
        text('MÚSICA · LA VOZ', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: RE, fontWeight: 700 }),
        text('Tu primer<br>instrumento', 84, 198, 820, 180, { fontSize: 74, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('Lo llevas siempre contigo y no cuesta nada: la voz. Vamos a conocerla y a cantar juntos.', 90, 420, 740, 100, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(icon('mic', 1000, 220, 170, RE), 'zoom-in', { duration: 700 })],
        notes: 'Arranque cercano: la voz es el instrumento de todos. El coro, tocar ese instrumento en equipo.' },
      { title: '¿Cómo se produce la voz?', layout: 'titleOnly', bg: PAPER, extra: [
        dg('process', 'El aire sale de los pulmones\nHace vibrar las cuerdas vocales\nLa boca y la nariz dan el timbre\nSale el sonido: tu voz', 100, 210, 1080, 180, { color: INK }),
        text('Aire + vibración + resonancia. Igual que un instrumento de viento… ¡pero de carne!', 100, 450, 1080, 60, { fontSize: 25, color: GREY, textAlign: 'center' })],
        notes: 'La voz funciona como un instrumento de viento: aire que hace vibrar algo (las cuerdas vocales) y una caja que resuena.' },
      { title: 'Las voces del coro', layout: 'titleOnly', bg: PAPER, extra: [
        img(range(), 110, 200, 1040, 300, 'Las cuatro tesituras ordenadas de grave a aguda'),
        text('De la más aguda a la más grave: <b style="color:' + deep(RE, PAPER) + '">soprano</b>, <b style="color:' + deep(OR, PAPER) + '">contralto</b>, <b style="color:' + deep(TE, PAPER) + '">tenor</b> y <b style="color:' + deep(BL, PAPER) + '">bajo</b>. Juntas forman el coro.', 110, 520, 1060, 70, { fontSize: 26, color: INK, lineHeight: 1.4 })],
        notes: 'Cada tesitura cubre un tramo de alturas. En un coro, cada grupo canta su parte y juntas suenan en armonía.' },
      { title: 'Afinar: dar en la nota', layout: 'twoContent', bg: PAPER, extra: [
        img(staff([{ y: 148, c: TE, l: 'justa' }, { y: 134, c: RE, l: 'alta' }]), 80, 220, 560, 210, 'Una nota afinada y otra desafinada'),
        text('<b>Afinar</b> es cantar justo en la altura de la nota, ni por encima ni por debajo. Se entrena escuchando primero y luego imitando. ¡El oído se educa, todos podemos mejorar!', 690, 250, 490, 230, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'Afinar es una habilidad que se entrena, no un don. El camino: escuchar bien y luego imitar.' },
      { title: 'Cuida tu voz', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Calienta', 'Antes de cantar, sonidos suaves para despertar la voz.', TE], ['No fuerces', 'Gritar o cantar muy agudo en frío la daña.', RE], ['Bebe agua', 'La hidratación cuida las cuerdas vocales.', BL], ['Respira hondo', 'El aire del vientre, no de los hombros.', OR]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:27px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, y, 525, 170, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up')]; }).flat()],
        notes: 'La voz es un músculo delicado. Calentar y no forzar es lo mismo que estirar antes de hacer deporte.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Para nuestro coro, ¿con qué voz te sientes más cómodo?', options: ['Aguda (soprano)', 'Media-aguda (contralto)', 'Media-grave (tenor)', 'Grave (bajo)'] })],
        notes: 'Votación para organizar el coro de clase. No hay voz mejor: cada una es una pieza del conjunto.' },
      { layout: 'blank', bg: PAPER, extra: [quiz('¿Cuál es la voz MÁS GRAVE del coro?', ['Soprano', 'Contralto', 'Tenor', 'Bajo'], 3)],
        notes: 'Repaso del orden de tesituras. Bajo = la más grave; soprano = la más aguda.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, OR, PAPER, 14)], transition: 'zoom', extra: [
        text('Un canon a dos voces', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('Dividíos en dos grupos y cantad una canción sencilla en canon (un grupo empieza, el otro entra después). Sentiréis cómo dos voces se juntan en armonía.', 84, 260, 800, 180, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(300, 950, 230, 270, { color: RE, endText: '¡Qué bien suena!' })],
        notes: 'El canon es la forma más fácil de cantar a varias voces. «Frère Jacques» o «Debajo un botón» funcionan genial.' },
    ]), INK));
  } },

  // 7 · La banda sonora: cómo la música cuenta historias en el cine.
  edu_music_film: { name: 'La banda sonora del cine', cat: 'edu', summary: 'Cómo la música cuenta historias en el cine: qué es una banda sonora, el leitmotiv, cómo el ritmo y el modo crean emoción, el silencio como recurso, una votación de escenas y un quiz', make: () => {
    const BG = '#0b0d14', INK = '#eef1f8', AM = '#f2c14e', RE = '#e0556b', TE = '#39c0c8', GR = '#5fd38a', VI = '#b48ce8', DIM = '#9098ad', S = FF.space;
    return numbered(ink(build({ name: 'La banda sonora del cine', palette: 'midnight', fonts: 'bold', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, AM, BG, 22), glow(-120, 560, 520, RE, BG, 18)], extra: [
        text('MÚSICA · CINE', 90, 140, 640, 36, { fontSize: 22, letterSpacing: 4, color: AM, fontWeight: 700, fontFamily: FF.mono }),
        text('La música que<br>cuenta la película', 84, 188, 900, 200, { fontSize: 66, fontWeight: 800, color: INK, lineHeight: 1.05, fontFamily: S }),
        text('Quita la música de tu escena favorita y casi desaparece la emoción. ¿Cómo lo hace?', 90, 452, 720, 90, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        after(img(wave(AM, 'sine', 500, 220), 760, 210, 440, 200, 'Una onda de sonido'), 'fade-left', { duration: 800 })],
        notes: 'Arranque potente: imaginar una escena de miedo o de victoria sin música. La banda sonora es invisible pero decisiva.' },
      { title: '¿Qué es una banda sonora?', layout: 'titleOnly', bg: BG, extra: [
        text('La <b style="color:' + AM + '">banda sonora</b> es toda la música compuesta para una película: la que no ves, pero sientes. Subraya lo que pasa en pantalla y te dice cómo emocionarte.', 90, 210, 1100, 150, { fontSize: 30, color: INK, lineHeight: 1.45 }),
        text('No es un adorno: es un personaje más.', 90, 400, 1100, 60, { fontSize: 25, color: DIM })],
        notes: 'Definición clara. La música de cine guía la emoción del espectador casi sin que se dé cuenta.' },
      { title: 'El leitmotiv', layout: 'twoContent', bg: BG, extra: [
        img(staff([{ y: 148, c: RE, l: '' }, { y: 120, c: RE, l: '' }, { y: 134, c: RE, l: '' }]), 80, 220, 560, 210, 'Una melodía corta que se repite'),
        text('Un <b style="color:' + RE + '">leitmotiv</b> es una melodía corta que representa a un personaje o una idea. Suena cada vez que aparece, aunque no lo veamos. Es la «firma musical» del héroe o del villano.', 690, 240, 490, 250, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'El leitmotiv: un tema que vuelve. El espectador aprende a asociarlo sin esfuerzo. Técnica de hace siglos (ópera), hoy en todo el cine.' },
      { title: 'Cómo crea emoción', layout: 'titleOnly', bg: BG, extra: [
        ...[['Rápido y agudo', 'Tensión, persecución, miedo.', RE], ['Lento y grave', 'Calma, tristeza, solemnidad.', TE], ['Modo mayor', 'Alegría, victoria, amor.', AM], ['Modo menor', 'Peligro, pena, misterio.', VI]].map(([t, d, col], i) => { const x = 90 + (i % 2) * 575, y = 205 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:28px;color:${col}">${t}</b><br><span style="font-size:23px;color:${INK}">${d}</span>`, x, y, 525, 175, '#141722', { color: INK, radius: 16, borderColor: col, pad: [18, 22, 16, 22] }), 'fade-up', { sound: 'pop' })]; }).flat()],
        notes: 'Las herramientas del compositor: tempo, altura y modo. Mezclándolas, dirige lo que sentimos.' },
      { title: 'El silencio también cuenta', layout: 'titleOnly', bg: BG, extra: [
        img(wave(DIM, 'soft', 760, 200), 260, 200, 760, 190, 'Una onda que se apaga hasta el silencio'),
        text('A veces el recurso más potente es callar: un silencio repentino antes de un susto hace que tu corazón se pare.', 90, 440, 1100, 90, { fontSize: 27, color: INK, lineHeight: 1.4, textAlign: 'center' })],
        notes: 'El silencio como golpe de efecto. Cortar la música de repente crea tensión o impacto.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Para una escena de VICTORIA, ¿qué música pondrías?', options: ['Lenta y en menor', 'Rápida, aguda y en mayor', 'Solo silencio', 'Grave y tenebrosa'] })],
        notes: 'Votación-reto. La respuesta esperable es la rápida en mayor; sirve para comprobar que han entendido las herramientas.' },
      { layout: 'blank', bg: BG, extra: [quiz('Una melodía que suena siempre que aparece un personaje se llama…', ['Banda sonora', 'Leitmotiv', 'Silencio', 'Compás'], 1)],
        notes: 'Repaso del concepto estrella: el leitmotiv.' },
      { layout: 'blank', bg: BG, back: [glow(640, 360, 760, AM, BG, 26)], transition: 'zoom', extra: [
        text('Pon música a tu escena', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('En equipos, describid una escena (persecución, reencuentro, terror) y decidid su música: tempo, agudo o grave, mayor o menor, y dónde pondríais un silencio. Presentadla a la clase.', 84, 260, 840, 190, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        timer(360, 950, 230, 270, { color: AM, endText: '¡Luces, música!' })],
        notes: 'Actividad creativa que resume todo: aplican tempo, modo y silencio a una emoción concreta.' },
    ]), INK));
  } },

  // 8 · Músicas del mundo: un viaje por sonidos de distintos continentes.
  edu_music_world: { name: 'Músicas del mundo', cat: 'edu', summary: 'Un viaje por las músicas del mundo: flamenco, samba, música andina, afrobeat, música árabe y gamelán, qué las hace únicas (ritmo, instrumentos, raíces) y una votación para elegir destino', make: () => {
    const PAPER = '#f3f0ea', INK = '#231e18', RE = '#c0492f', OR = '#dd8a2a', GR = '#2e7d46', TE = '#1f8f8f', VI = '#7b4fb0', BR = '#9a5b2a', GREY = '#6a645c', S = FF.space;
    return numbered(ink(build({ name: 'Músicas del mundo', palette: 'warm', fonts: 'friendly', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, OR, PAPER, 16), glow(-120, 560, 520, TE, PAPER, 12)], extra: [
        text('MÚSICA · EL MUNDO', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: RE, fontWeight: 700 }),
        text('Un planeta<br>que suena', 84, 198, 820, 180, { fontSize: 76, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('Cada pueblo inventó su manera de hacer música. Damos la vuelta al mundo en seis paradas.', 90, 420, 760, 100, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(icon('globe', 1000, 210, 180, TE), 'zoom-in', { duration: 700 })],
        notes: 'Arranque: la música es universal, pero cada cultura la vive a su manera. Un viaje de escucha abierta y respeto.' },
      { title: 'Seis paradas', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Flamenco · España', 'Guitarra, cante y palmas. Pura emoción y compás.', RE], ['Samba · Brasil', 'Percusión y baile. El pulso del carnaval.', GR], ['Andina · Los Andes', 'La quena y el charango. Vientos de montaña.', BR], ['Afrobeat · África', 'Ritmos cruzados y mucha percusión.', OR], ['Árabe · Oriente', 'Escalas con microtonos y el laúd (oud).', VI], ['Gamelán · Indonesia', 'Orquestas de metalófonos y gongs.', TE]].map(([t, d, col], i) => { const x = 90 + (i % 3) * 370, y = 205 + Math.floor(i / 3) * 215; return [
          on(card(`<b style="font-size:24px;color:${col}">${t}</b><br><span style="font-size:20px;color:${INK}">${d}</span>`, x, y, 345, 190, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [18, 20, 16, 20] }), 'fade-up', { sound: 'pop' })]; }).flat()],
        notes: 'Seis culturas, seis sonidos. Si hay audio, 30 segundos de cada una hace el viaje inolvidable.' },
      { title: '¿Qué las hace únicas?', layout: 'titleOnly', bg: PAPER, extra: [
        dg('list', 'El ritmo → unos marcan el pulso; otros lo cruzan y lo complican\nLos instrumentos → cada cultura crea los suyos con lo que tiene\nLas escalas → no todos usan nuestras 7 notas; algunos usan microtonos\nLa función → fiesta, duelo, trabajo, religión… la música acompaña la vida', 100, 195, 1080, 340, { color: INK }),
        text('Diferentes, pero todas nacen de lo mismo: la necesidad de expresarse con sonido.', 100, 560, 1080, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Las claves para comparar: ritmo, instrumentos, escalas y función social. Evitar jerarquías: ninguna es «mejor».' },
      { title: 'Todo viaja y se mezcla', layout: 'twoContent', bg: PAPER, extra: [
        img(svgURL(500, 320, `<circle cx="250" cy="160" r="150" fill="#e7efe9" stroke="#9fc4ab" stroke-width="3"/>`
          + [[-1, -1, RE], [1, -1, GR], [-1, 1, VI], [1, 1, OR]].map(([dx, dy, c], i) => `<circle cx="${250 + dx * 85}" cy="${160 + dy * 85}" r="34" fill="${c}" opacity="0.85"/>`).join('')
          + `<path d="M165 75 Q250 160 335 245 M335 75 Q250 160 165 245" fill="none" stroke="#7a7268" stroke-width="2" stroke-dasharray="5 6"/>`), 110, 200, 500, 320, 'Culturas que se conectan e influyen entre sí'),
        text('El reguetón, el pop o el jazz nacieron de mezclar músicas de varios continentes. Lo que hoy escuchas ya es un viaje por el mundo.', 690, 250, 490, 220, { fontSize: 27, color: INK, lineHeight: 1.45 })],
        notes: 'Idea grande: casi toda la música actual es mestiza. Conecta las seis paradas con lo que ellos oyen hoy.' },
      { title: 'Instrumentos viajeros', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['La guitarra', 'De España al mundo entero: flamenco, pop, rock…', RE], ['El tambor', 'En casi todas las culturas: marca el pulso y reúne a la gente.', GR], ['La flauta', 'De la quena andina a la flauta travesera: soplar un tubo.', TE]].map(([t, d, col], i) => { const x = 90 + i * 370; return [
          on(card(`<b style="font-size:25px;color:${col}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, x, 230, 345, 220, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 22, 18, 22] }), 'fade-up')]; }).flat(),
        text('Los mismos tres gestos —pulsar, golpear, soplar— en cada rincón del planeta.', 90, 480, 1100, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Idea unificadora: aunque cambien los nombres, los instrumentos del mundo responden a los mismos principios de la clase de la orquesta.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿A qué parada viajamos a escuchar primero?', options: ['Flamenco (España)', 'Samba (Brasil)', 'Música árabe (Oriente)', 'Gamelán (Indonesia)'] })],
        notes: 'Votación para elegir la audición. Todas valen; lo importante es escuchar con curiosidad.' },
      { layout: 'blank', bg: PAPER, extra: [quiz('¿De qué país es la samba?', ['España', 'Brasil', 'Indonesia', 'Jamaica'], 1)],
        notes: 'Repaso ligero de las paradas. La samba es de Brasil, el alma del carnaval.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, OR, PAPER, 14)], transition: 'zoom', extra: [
        text('Tu mapa sonoro', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('Cada uno trae una canción de la cultura de su familia o de un país que le guste y la sitúa en el mapa de clase. Montamos entre todos una lista de reproducción del mundo.', 84, 260, 800, 190, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(360, 950, 230, 270, { color: RE, endText: '¡Buen viaje!' })],
        notes: 'Actividad inclusiva: valora la diversidad del aula. La lista colectiva es un gran recuerdo del tema.' },
    ]), INK));
  } },

  // 9 · Crea tu primera melodía: una actividad guiada para componer en clase.
  edu_music_create: { name: 'Crea tu primera melodía', cat: 'edu', summary: 'Taller para componer una melodía sencilla en clase: elegir notas, darle ritmo, repetir y variar, añadir un final que descanse, con votaciones para decidir entre todos y un reto final por equipos', make: () => {
    const BG = '#101722', INK = '#eaf1fa', GR = '#5fd38a', AM = '#f2c14e', TE = '#39c0c8', RE = '#e07a9a', DIM = '#8f9bae', S = FF.space;
    const SCALE = [{ y: 176, c: '#5fd38a', l: 'do' }, { y: 148, c: '#39c0c8', l: 'mi' }, { y: 120, c: '#f2c14e', l: 'sol' }, { y: 92, c: '#e07a9a', l: 'do' }];
    return numbered(ink(build({ name: 'Crea tu primera melodía', palette: 'midnight', fonts: 'tech', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, GR, BG, 24), glow(-120, 560, 520, TE, BG, 18)], extra: [
        text('MÚSICA · TALLER DE COMPOSICIÓN', 90, 140, 760, 36, { fontSize: 22, letterSpacing: 3, color: GR, fontWeight: 700, fontFamily: FF.mono }),
        text('Compón tu<br>primera melodía', 84, 188, 900, 200, { fontSize: 70, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('No hace falta saber solfeo para crear música. Lo hacemos hoy, entre todos, paso a paso.', 90, 398, 740, 100, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        after(img(staff(SCALE), 140, 515, 880, 186, 'Cuatro notas para componer'), 'fade-up', { duration: 800 })],
        notes: 'Arranque motivador: todos pueden componer. Usaremos pocas notas para que sea fácil y suene bien.' },
      { title: 'Los pasos de un compositor', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', 'Elige pocas notas (nos vale do, mi, sol, do)\nDales un ritmo (negras y corcheas)\nRepite una idea para que se recuerde\nVaría un poco la segunda vez\nTermina en do: suena a «final»', 100, 195, 1080, 340, { color: INK })],
        notes: 'La receta. La clave pedagógica: repetir y variar. Y acabar en la nota de reposo (do) para que suene cerrado.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Paso 1: ¿con qué nota EMPEZAMOS nuestra melodía?', options: ['Do (la más estable)', 'Mi (suave)', 'Sol (brillante)', 'Do agudo (con fuerza)'] })],
        notes: 'Primera decisión colectiva. Cualquiera vale; votar da sensación de autoría compartida.' },
      { title: 'Repetir y variar', layout: 'twoContent', bg: BG, extra: [
        img(staff([{ y: 176, c: GR, l: 'do' }, { y: 148, c: TE, l: 'mi' }, { y: 176, c: GR, l: 'do' }, { y: 120, c: AM, l: 'sol' }]), 70, 220, 560, 210, 'Una idea que se repite y cambia'),
        text('El secreto de una melodía pegadiza: una idea corta que <b style="color:' + AM + '">se repite</b> y luego <b style="color:' + RE + '">cambia un poquito</b>. Así el oído la recuerda sin aburrirse.', 690, 250, 490, 220, { fontSize: 27, color: INK, lineHeight: 1.45 })],
        notes: 'Repetición + variación es el motor de casi toda música pegadiza. Mostrarlo con la melodía que vais construyendo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Paso 4: ¿cómo VARIAMOS la segunda vez?', options: ['Subiendo la última nota', 'Bajando al final', 'Haciéndola más rápida', 'Añadiendo un silencio'] })],
        notes: 'Segunda decisión colectiva. Probar en el momento la opción ganadora, si hay instrumento o app.' },
      { title: 'El final que descansa', layout: 'titleOnly', bg: BG, extra: [
        img(staff([{ y: 120, c: AM, l: 'sol' }, { y: 148, c: TE, l: 'mi' }, { y: 176, c: GR, l: 'do' }]), 90, 190, 1080, 220, 'Un final que baja hasta do y descansa'),
        text('Acabar en <b style="color:' + GR + '">do</b> da sensación de «ya está, hemos llegado». Es la nota de reposo. Prueba a acabar en otra: notarás que queda «en el aire».', 90, 440, 1100, 100, { fontSize: 26, color: INK, lineHeight: 1.4 })],
        notes: 'La nota final decide si la melodía suena terminada. Do (la tónica) da reposo; otras dejan la frase abierta.' },
      { title: 'Ponle fuerza (y calma)', layout: 'titleOnly', bg: BG, extra: [
        ...[['Suave (piano)', 'Tocar o cantar bajito: intimidad, calma, misterio.', TE], ['Fuerte (forte)', 'Con energía: fuerza, alegría, un buen final.', AM]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:28px;color:${col}">${t}</b><br><span style="font-size:23px;color:${INK}">${d}</span>`, 90 + i * 560, 230, 510, 190, '#141f2b', { color: INK, radius: 18, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat(),
        text('Una misma melodía cambia muchísimo si la tocas suave o fuerte: eso es la dinámica.', 90, 470, 1100, 50, { fontSize: 23, color: DIM, textAlign: 'center' })],
        notes: 'La dinámica (fuerte/suave) da vida a la melodía. Probad vuestra melodía de las dos maneras y notad la diferencia.' },
      { layout: 'blank', bg: BG, back: [glow(640, 360, 760, GR, BG, 28)], transition: 'zoom', extra: [
        text('Vuestra melodía', 84, 150, 900, 90, { fontSize: 58, fontWeight: 800, color: INK, fontFamily: S }),
        text('Por equipos, componed 8 notas con do-mi-sol siguiendo los pasos: idea, repetición, variación y final en do. Cantadla o tocadla a la clase. ¡Ya sois compositores!', 84, 260, 840, 190, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        timer(420, 950, 230, 270, { color: GR, endText: '¡A estrenar!' })],
        notes: 'Reto final que integra todo. Que cada equipo estrene su melodía: el momento más memorable del tema.' },
    ]), INK));
  } },

  // 10 · Del vinilo al streaming: cómo ha cambiado la forma de escuchar música (tema de actualidad).
  edu_music_streaming: { name: 'Del vinilo al streaming', cat: 'edu', summary: 'Cómo ha cambiado la forma de escuchar música, del vinilo al streaming: una línea de tiempo de formatos, un gráfico del tamaño de la colección, qué ganamos y qué perdimos, y un debate con votación', make: () => {
    const PAPER = '#eef0f4', INK = '#1b2130', TE = '#1f8f8f', OR = '#e8823b', PUR = '#6d4fb0', GR = '#2e9e6b', BL = '#2f6df0', GREY = '#5f6a80', S = FF.space;
    const disc = (c) => svgURL(300, 300, `<circle cx="150" cy="150" r="140" fill="#1b1b24"/><circle cx="150" cy="150" r="138" fill="none" stroke="${c}" stroke-width="2" opacity="0.5"/>`
      + [110, 90, 70].map(r => `<circle cx="150" cy="150" r="${r}" fill="none" stroke="#3a3a4a" stroke-width="1"/>`).join('')
      + `<circle cx="150" cy="150" r="46" fill="${c}"/><circle cx="150" cy="150" r="10" fill="#1b1b24"/>`);
    return numbered(ink(build({ name: 'Del vinilo al streaming', palette: 'ocean', fonts: 'clean', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, PUR, PAPER, 14), glow(-120, 560, 520, OR, PAPER, 12)], extra: [
        text('MÚSICA · TECNOLOGÍA Y SOCIEDAD', 90, 150, 760, 36, { fontSize: 22, letterSpacing: 3, color: PUR, fontWeight: 700 }),
        text('Del vinilo<br>al streaming', 84, 198, 820, 180, { fontSize: 74, fontWeight: 800, color: INK, lineHeight: 1.04, fontFamily: S }),
        text('Hace 50 años, la música pesaba y ocupaba estanterías. Hoy cabe entera en el móvil. ¿Qué cambió?', 90, 410, 760, 150, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        after(img(disc(OR), 960, 200, 260, 260, 'Un disco de vinilo'), 'spin', { duration: 800 })],
        notes: 'Arranque de actualidad: la música no ha cambiado solo en estilo, sino en cómo llega a nosotros. Un cambio enorme y reciente.' },
      { title: 'La línea de los formatos', layout: 'titleOnly', bg: PAPER, extra: [
        dg('timeline', 'Vinilo · 1950 · grande y con su ritual\nCasete · 1970 · portátil, se podía grabar\nCD · 1982 · sonido digital y nítido\nMP3 · 2000 · la música se vuelve archivo\nStreaming · hoy · todo, al instante, en la nube', 90, 200, 1100, 380, { color: INK })],
        notes: 'Cada formato resolvió un problema del anterior: tamaño, portabilidad, calidad, acceso. Ritmo de cambio cada vez más rápido.' },
      { title: 'Cabe cada vez más', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 180, w: 1060, h: 410, chartType: 'bar', color: BL, yTitle: 'Canciones que llevas encima',
          data: [{ label: 'Vinilo', value: 12, color: OR }, { label: 'Casete', value: 20, color: PUR }, { label: 'CD', value: 18, color: TE }, { label: 'MP3', value: 2000, color: GR }, { label: 'Streaming', value: 100000, color: BL }] }),
        text('Del disco con 12 canciones a millones a un toque. (Escala orientativa.)', 110, 600, 1060, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'El salto es brutal con el MP3 y el streaming. Visualizarlo ayuda a entender el cambio cultural que supuso.' },
      { title: '¿Qué ganamos y qué perdimos?', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Ganamos', 'Acceso a casi toda la música del mundo, al instante y en cualquier parte.', GR], ['Perdimos', 'El objeto, la portada, el ritual de poner un disco y escuchar entero.', OR]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:24px;color:${INK}">${d}</span>`, 90 + i * 560, 220, 510, 210, '#ffffff', { color: INK, radius: 18, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat(),
        text('Por eso el vinilo ha vuelto a venderse: muchos quieren recuperar ese ritual.', 90, 470, 1100, 50, { fontSize: 23, color: GREY, textAlign: 'center' })],
        notes: 'Debate equilibrado: el progreso tiene costes. El regreso del vinilo es un buen gancho de actualidad.' },
      { title: '¿Y los artistas cobran?', layout: 'twoContent', bg: PAPER, extra: [
        img(disc(TE), 120, 210, 260, 260, 'Un disco, símbolo del trabajo del músico'),
        text('Con el streaming, cada escucha paga muy poquito al artista. Para los grupos pequeños es difícil vivir de ello; por eso venden vinilos, camisetas o hacen conciertos. Pagar por la música es apoyar a quien la crea.', 460, 240, 720, 260, { fontSize: 26, color: INK, lineHeight: 1.45 })],
        notes: 'Tema de actualidad y de valores: cómo se reparte el dinero del streaming. Prepara el debate final con una mirada ética.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿Cómo escuchas tú la música casi siempre?', options: ['Streaming (apps)', 'Vídeos en internet', 'Archivos descargados', 'CD, vinilo o radio'] })],
        notes: 'Votación-encuesta del aula. Da datos reales para el debate siguiente.' },
      { layout: 'blank', bg: PAPER, extra: [quiz('¿Qué formato convirtió por primera vez la música en un ARCHIVO de ordenador?', ['Vinilo', 'Casete', 'CD', 'MP3'], 3)],
        notes: 'El MP3 fue el salto a lo digital «desmaterializado», que abrió la puerta al streaming.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, PUR, PAPER, 14)], transition: 'zoom', extra: [
        text('Debate: ¿mejor hoy?', 84, 150, 900, 90, { fontSize: 56, fontWeight: 800, color: INK, fontFamily: S }),
        text('En dos grupos: uno defiende el streaming y otro el vinilo. Pensad en acceso, calidad, precio justo para los artistas y el valor de tener algo físico. ¿Quién convence a la clase?', 84, 260, 840, 200, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        timer(420, 960, 230, 260, { color: PUR, endText: '¡A debatir!' })],
        notes: 'Cierre con pensamiento crítico: incluir el pago a los artistas, un tema de actualidad muy vivo. No hay respuesta única.' },
    ]), INK));
  } },

};
