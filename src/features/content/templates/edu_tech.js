// Example presentations: Tecnología y programación. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Every deck has its own topic and its own look: the exploded insides of a
// computer, a rain of ones and zeros, a sandwich-making robot, a palette of coloured blocks, a Python
// terminal, a message hopping across the internet, a robot that senses and acts, a password strength meter,
// a little neural network and a browser being built.
// (Every drawing is our own, SVG as a data URL — no external pictures. The code shown is real and runs.)

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A drawing of our own (SVG) as a data URL: no external pictures.
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// The same object on two slides (Transform): a fixed id.
const keep = (b, id) => ({ ...b, id });
// One animation: on a click, after the previous one, or with it.
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 38, x: 70, y: 60, w: 1140, h: 600, ...props });
// Fonts of our own (Google fonts loaded on demand, as in the editor's list).
const FF = { mono: "'JetBrains Mono', monospace", space: "'Space Grotesk', sans-serif", caveat: "'Caveat', cursive", bebas: "'Bebas Neue', sans-serif" };
// The deck's text colour (tables, activities and diagrams take it), when it isn't the palette's.
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// The credit line of the CC BY models used in a deck (small, on its last slide).
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 12, color });
// A mono code line as coloured HTML (keyword / string / comment), for when a real code block is too much.
const kw = (t, c) => `<span style="color:${c}">${t}</span>`;

export default {

  // ---------------------------------------------------------------------------------------
  // 1 · The insides of a computer: a dark workbench, parts that fly apart and name themselves,
  // the CPU as the brain with its fetch-decode-execute cycle, memory against storage, a labelled
  // motherboard, a matching quiz and a take-apart activity.
  edu_tech_inside: { name: 'Qué hay dentro de un ordenador', cat: 'edu', summary: 'Banco de trabajo oscuro: un portátil que se despieza, la CPU como cerebro con su ciclo, memoria contra almacenamiento, una placa base rotulada, test de emparejar y actividad', make: () => {
    const BG = '#0f1420', PANEL = '#182235', CY = '#38e1c6', GR = '#7bd88f', AM = '#ffcf5c', VI = '#9d8cff', RE = '#ff7a8a', DIM = '#8fa0bd', CREAM = '#eaf0fb', M = FF.mono, S = FF.space;
    // A silicon chip seen from above: a dark square with gold pins on four sides and a labelled die.
    const chip = (label, die = CY) => svgURL(360, 360, `<rect x="70" y="70" width="220" height="220" rx="10" fill="#10151f" stroke="#2b3a52" stroke-width="2"/>`
      + Array.from({ length: 9 }, (_, i) => { const p = 80 + i * 24;
        return `<rect x="${p}" y="40" width="12" height="30" rx="2" fill="${AM}"/><rect x="${p}" y="290" width="12" height="30" rx="2" fill="${AM}"/><rect x="40" y="${p}" width="30" height="12" rx="2" fill="${AM}"/><rect x="290" y="${p}" width="30" height="12" rx="2" fill="${AM}"/>`; }).join('')
      + `<rect x="120" y="120" width="120" height="120" rx="6" fill="${die}" opacity="0.18" stroke="${die}" stroke-width="2"/><text x="180" y="190" font-family="monospace" font-size="30" font-weight="700" fill="${die}" text-anchor="middle">${label}</text>`);
    // A motherboard: a green board with slots, a socket, RAM sticks and ports.
    const board = (lit = -1) => { const on = i => lit === i ? '#fff6c2' : null;
      return svgURL(740, 560, `<rect x="40" y="40" width="660" height="480" rx="18" fill="#17311b" stroke="#2f5d35" stroke-width="3"/>`
        + Array.from({ length: 24 }, (_, i) => `<circle cx="${70 + (i % 12) * 52}" cy="${70 + Math.floor(i / 12) * 430}" r="4" fill="#3c6b43"/>`).join('')
        + `<rect x="300" y="110" width="150" height="150" rx="8" fill="#0f1a12" stroke="${on(0) || '#5c8f63'}" stroke-width="${lit === 0 ? 5 : 3}"/><text x="375" y="195" font-family="monospace" font-size="22" fill="${on(0) || '#8fd89a'}" text-anchor="middle">CPU</text>`
        + [0, 1, 2, 3].map(i => `<rect x="${500 + i * 36}" y="90" width="22" height="300" rx="5" fill="#0f1a12" stroke="${lit === 1 ? '#fff6c2' : '#5c8f63'}" stroke-width="${lit === 1 ? 4 : 2}"/>`).join('') + `<text x="572" y="420" font-family="monospace" font-size="20" fill="${on(1) || '#8fd89a'}" text-anchor="middle">RAM</text>`
        + `<rect x="90" y="300" width="170" height="90" rx="8" fill="#0f1a12" stroke="${on(2) || '#5c8f63'}" stroke-width="${lit === 2 ? 5 : 3}"/><text x="175" y="352" font-family="monospace" font-size="20" fill="${on(2) || '#8fd89a'}" text-anchor="middle">SSD</text>`
        + `<rect x="90" y="110" width="170" height="150" rx="8" fill="#0f1a12" stroke="${on(3) || '#5c8f63'}" stroke-width="${lit === 3 ? 5 : 3}"/><text x="175" y="190" font-family="monospace" font-size="20" fill="${on(3) || '#8fd89a'}" text-anchor="middle">GPU</text>`); };
    const PARTS = [['cpu', 'CPU', 'El procesador: hace los cálculos, millones por segundo. El «cerebro».', CY],
      ['database', 'RAM', 'Memoria de trabajo: lo que el ordenador tiene «en la mano» ahora mismo. Rápida y temporal.', VI],
      ['server', 'Almacenamiento', 'El disco SSD o HDD: guarda tus archivos aunque apagues. Lento pero permanente.', GR],
      ['monitor', 'GPU', 'La tarjeta gráfica: dibuja lo que ves en la pantalla, sobre todo en juegos y vídeo.', AM]];
    return numbered(ink(build({ name: 'Qué hay dentro de un ordenador', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 50 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(-150, -150, 620, CY, BG, 55), glow(980, 420, 620, VI, BG, 45)], extra: [
        text('TECNOLOGÍA · 1.º Y 2.º DE ESO', 90, 150, 620, 36, { fontSize: 22, letterSpacing: 4, color: CY, fontWeight: 700, fontFamily: M }),
        text('Qué hay dentro<br>de un ordenador', 84, 198, 760, 230, { fontSize: 82, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('Abrimos la caja y ponemos nombre a cada pieza', 90, 452, 640, 96, { fontSize: 30, color: DIM }),
        after(img(chip('CPU'), 780, 150, 420, 420, 'Un microprocesador visto desde arriba'), 'zoom-in', { duration: 900 })],
        notes: 'Arranque: ¿qué hay dentro del ordenador o del móvil que lleváis encima? Hoy abrimos la caja. El chip entra solo al llegar. Pregunta: ¿cuántas piezas creéis que hacen falta para que funcione?' },
      { title: 'Las cuatro piezas clave', layout: 'titleOnly', bg: BG, extra: [
        ...PARTS.flatMap(([ic, n, d, col], i) => { const x = 80 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 230; return [
          on(card(`<b style="font-size:34px;color:${col}">${n}</b><br><span style="font-size:24px;color:${CREAM}">${d}</span>`, x, y, 525, 200, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [20, 24, 18, 110] }), 'fade-up', { sound: 'pop' }),
          along(icon(ic, x + 26, y + 66, 64, col), 'fade-up')]; })],
        notes: 'Un clic por pieza. Cuatro piezas bastan para contar la historia: calcular (CPU), recordar ahora (RAM), guardar (SSD) y dibujar (GPU). Todo lo demás conecta estas cuatro.' },
      { title: 'La CPU: el cerebro', layout: 'titleOnly', bg: BG, extra: [
        img(chip('ALU', CY), 70, 180, 380, 380, 'El procesador con su núcleo'),
        text('Hace una cosa a una velocidad enorme: <b style="color:' + CY + '">repetir un ciclo</b> miles de millones de veces por segundo.', 500, 190, 700, 90, { fontSize: 27, color: CREAM, lineHeight: 1.35 }),
        ...[['1 · Buscar', 'Lee la siguiente instrucción de la memoria', CY], ['2 · Descodificar', 'Entiende qué tiene que hacer', VI], ['3 · Ejecutar', 'La hace: suma, compara, mueve un dato', GR]].map(([t, d, col], i) =>
          on(card(`<b style="color:${col}">${t}</b><br><span style="font-size:22px;color:${DIM}">${d}</span>`, 500, 300 + i * 115, 690, 100, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: col, pad: [14, 20, 12, 20] }), 'fade-left')),
        text('GHz = miles de millones de ciclos/segundo', 70, 596, 380, 56, { fontSize: 18, color: DIM, textAlign: 'center', fontFamily: M })],
        notes: 'El ciclo buscar-descodificar-ejecutar es el corazón de toda la informática. Un clic por paso. 3 GHz = 3000 millones de ciclos por segundo: por eso parece instantáneo.' },
      { title: 'Memoria y almacenamiento', layout: 'twoContent', bg: BG, extra: [
        on(card('<b style="color:' + VI + '">RAM · la mesa</b><br><span style="font-size:23px">Lo que usas <b>ahora</b>. Amplia y muy rápida, pero se borra al apagar. Más RAM = más cosas a la vez.</span>', 90, 230, 525, 240, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: VI, pad: [22, 26, 22, 26] }), 'fade-right'),
        on(card('<b style="color:' + GR + '">SSD · el armario</b><br><span style="font-size:23px">Lo que <b>guardas</b>: fotos, juegos, el sistema. Más lento, pero no se borra al apagar.</span>', 665, 230, 525, 240, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: GR, pad: [22, 26, 22, 26] }), 'fade-left'),
        after(chartBlock({ x: 90, y: 500, w: 1100, h: 150, chartType: 'bar', color: VI,
          data: [{ label: 'RAM (ns)', value: 100, color: VI }, { label: 'SSD (µs)', value: 16, color: GR }, { label: 'Disco HDD (ms)', value: 4, color: RE }] }), 'fade-up')],
        notes: 'La analogía mesa/armario funciona muy bien. El gráfico compara velocidades: la RAM es cientos de veces más rápida que el SSD, y el SSD mucho más que un disco mecánico. Por eso el ordenador «carga» cosas del disco a la RAM.' },
      { title: 'La placa base lo conecta todo', layout: 'titleOnly', bg: BG, extra: [
        img(board(), 60, 170, 560, 440, 'La placa base con sus zócalos'),
        text('Todo se enchufa a la <b style="color:' + GR + '">placa base</b>: ella lleva la electricidad y los datos de una pieza a otra.', 650, 200, 560, 120, { fontSize: 27, color: CREAM, lineHeight: 1.35 }),
        ...[['CPU', CY], ['RAM', VI], ['SSD', GR], ['GPU', AM]].map(([n, col], i) =>
          on(text('●  ' + n, 650, 340 + i * 68, 560, 56, { fontSize: 28, color: col, fontWeight: 700 }), 'fade-left'))],
        notes: 'Señala cada zócalo mientras aparecen los nombres. Idea clave: ninguna pieza trabaja sola; la placa base es la red de carreteras que las une.' },
      { layout: 'blank', bg: '#0b0f18', extra: [quiz('¿Qué pieza guarda tus archivos aunque apagues el ordenador?',
        ['La RAM', 'El SSD / disco', 'La CPU', 'La pantalla'], 1)],
        notes: 'Repaso rápido. Trampa habitual: confundir RAM (temporal) con almacenamiento (permanente). La RAM se borra al apagar; el disco no.' },
      { layout: 'blank', bg: BG, back: [glow(1000, 100, 560, CY, BG, 45)], transition: 'zoom', extra: [
        text('Desmóntalo (con cuidado)', 84, 130, 800, 90, { fontSize: 60, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('Por parejas: mirad la ficha de un ordenador real (el del aula o uno de una web de ventas) y encontrad su CPU, su RAM y su almacenamiento. ¿Cuánto tiene de cada uno? ¿Para qué lo compraríais?', 84, 250, 720, 200, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        timer(420, 900, 210, 300, { color: CY, endText: '¡Ponemos en común!' })],
        notes: 'Siete minutos. Buscar las especificaciones de un equipo y leerlas con sentido es la competencia que queda. Puesta en común: ¿qué equipo elegiríais para jugar? ¿Y para escribir?' },
    ]), CREAM));
  } },

  // ---------------------------------------------------------------------------------------
  // 2 · The binary language: a rain of ones and zeros, switches that are on or off, counting in
  // binary with place values, a decimal number turned into bits step by step, a byte, letters and
  // pixels as numbers, the ladder of bits-bytes-KB-MB, a quiz and writing your initials in binary.
  edu_tech_binary: { name: 'El lenguaje binario', cat: 'edu', summary: 'Lluvia de unos y ceros: interruptores encendidos o apagados, contar en binario por valores de posición, pasar 13 a bits, un byte, letras y píxeles como números, la escalera bit-byte-KB y actividad', make: () => {
    const BG = '#06111a', PANEL = '#0e2130', GR = '#38e07b', CY = '#4cc9f0', AM = '#ffd166', RE = '#ff6b6b', DIM = '#7fa0b0', CREAM = '#e9f6ff', M = FF.mono, S = FF.space;
    const bitRain = () => svgURL(1280, 720, Array.from({ length: 150 }, (_, i) => { const x = (i * 83) % 1280, y = (i * 137) % 720, b = (i * 7) % 2;
      return `<text x="${x}" y="${y}" font-family="monospace" font-size="${16 + (i % 3) * 8}" fill="${GR}" opacity="${0.06 + (i % 5) * 0.03}">${b}</text>`; }).join(''), BG);
    // A row of switches (bits), each a rounded cell with 0/1 and a lamp.
    const bits = (arr, labels = null) => svgURL(arr.length * 120, 200, arr.map((b, i) => { const x = i * 120 + 10;
      return `<rect x="${x}" y="20" width="100" height="100" rx="12" fill="${b ? GR : '#102230'}" stroke="${b ? GR : '#2a4457'}" stroke-width="3" ${b ? '' : ''}/>`
        + `<text x="${x + 50}" y="90" font-family="monospace" font-size="56" font-weight="700" fill="${b ? '#06111a' : '#4a6477'}" text-anchor="middle">${b}</text>`
        + (labels ? `<text x="${x + 50}" y="165" font-family="monospace" font-size="30" fill="${AM}" text-anchor="middle">${labels[i]}</text>` : ''); }).join(''));
    // 8×8 pixel letter A from a bitmap, each cell 0 (bg) or 1 (ink).
    const PIX = ['00011000', '00100100', '01000010', '01000010', '01111110', '01000010', '01000010', '01000010'];
    const pixel = () => svgURL(360, 360, PIX.flatMap((row, r) => [...row].map((c, k) =>
      `<rect x="${20 + k * 40}" y="${20 + r * 40}" width="38" height="38" fill="${c === '1' ? CY : '#0e2130'}" stroke="#06111a" stroke-width="1"/>`)).join(''));
    return numbered(ink(build({ name: 'El lenguaje binario', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 50 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [img(bitRain(), 0, 0, 1280, 720, '')], extra: [
        text('INFORMÁTICA · CÓMO PIENSA UNA MÁQUINA', 90, 160, 640, 36, { fontSize: 22, letterSpacing: 3, color: GR, fontWeight: 700, fontFamily: M }),
        text('El lenguaje<br>binario', 84, 208, 700, 220, { fontSize: 92, fontWeight: 800, color: CREAM, lineHeight: 1.02, fontFamily: S }),
        text('Todo —textos, fotos, música— es, por dentro, solo <b style="color:' + GR + '">ceros y unos</b>.', 90, 470, 680, 80, { fontSize: 30, color: DIM })],
        notes: 'Arranque: el ordenador no entiende letras ni colores; solo electricidad: hay corriente (1) o no la hay (0). Hoy vemos cómo con dos símbolos se puede escribir cualquier cosa.' },
      { title: 'Un bit: encendido o apagado', layout: 'titleOnly', bg: BG, extra: [
        text('La pieza más pequeña es el <b style="color:' + GR + '">bit</b>: un interruptor que solo puede estar en dos posiciones.', 90, 185, 1100, 80, { fontSize: 30, color: CREAM, lineHeight: 1.3 }),
        on(img(bits([0]), 360, 300, 120, 200, 'Un bit apagado, vale 0'), 'zoom-in', { sound: 'pop' }),
        on(img(bits([1]), 760, 300, 120, 200, 'Un bit encendido, vale 1'), 'zoom-in', { sound: 'pop' }),
        along(text('apagado = 0', 300, 520, 240, 50, { fontSize: 28, color: DIM, textAlign: 'center', fontFamily: M }), 'fade-up'),
        on(text('encendido = 1', 700, 520, 240, 50, { fontSize: 28, color: GR, textAlign: 'center', fontFamily: M }), 'fade-up')],
        notes: 'Dos clics. «Bit» viene de binary digit. Con un solo bit solo hay dos mensajes posibles. La magia aparece al juntar varios.' },
      { title: 'Contar en binario', layout: 'titleOnly', bg: BG, extra: [
        text('Cada posición vale el <b>doble</b> que la de su derecha. Enciende las que sumen tu número.', 90, 180, 1100, 70, { fontSize: 28, color: CREAM }),
        img(bits([1, 1, 0, 1], ['8', '4', '2', '1']), 320, 270, 480, 200, 'Los bits 1101 con sus valores 8 4 2 1'),
        after(card('<b style="color:' + GR + '">8 + 4 + 1 = 13</b>', 430, 500, 420, 90, PANEL, { color: CREAM, fontSize: 40, radius: 14, borderColor: GR, textAlign: 'center' }), 'zoom-in'),
        text('1101 en binario = 13 en decimal', 320, 610, 640, 40, { fontSize: 22, color: DIM, textAlign: 'center', fontFamily: M })],
        notes: 'Los valores de posición son 1, 2, 4, 8, 16… (potencias de 2). Aquí 1101 = 8+4+0+1 = 13. Haced que la clase encienda y apague bits mentalmente para formar otros números.' },
      { title: 'De decimal a binario', layout: 'titleOnly', bg: BG, extra: [
        text('¿Cómo escribo el <b style="color:' + AM + '">19</b> en binario? Voy restando la mayor potencia de 2 que quepa.', 90, 180, 1100, 70, { fontSize: 28, color: CREAM }),
        ...[['¿Cabe 16? Sí → bit 1, queda 3', '1 ____'], ['¿Cabe 8? No → bit 0', '10 ___'], ['¿Cabe 4? No → bit 0', '100 __'], ['¿Cabe 2? Sí → bit 1, queda 1', '1001 _'], ['¿Cabe 1? Sí → bit 1, queda 0', '10011']].map(([t, b], i) =>
          on(text(`<span style="font-family:${M};color:${CY}">${b}</span>&nbsp;&nbsp;${t}`, 120, 270 + i * 72, 1040, 60, { fontSize: 26, color: CREAM }), 'fade-up')),
        after(text('19 = 10011', 760, 640, 400, 40, { fontSize: 22, color: GR, fontFamily: M }), 'fade-up')],
        notes: 'Método de las restas: 19−16=3, 3 no tiene 8 ni 4, 3−2=1, 1−1=0. Resultado 10011. Un clic por fila. Es el mismo método que usa la calculadora.' },
      { title: 'Letras y dibujos también son números', layout: 'twoContent', bg: BG, extra: [
        on(card('<b style="color:' + CY + '">La letra A</b><br><span style="font-size:24px">Cada letra tiene un número acordado (código ASCII). La <b>A</b> es el <b>65</b> = 01000001.</span>', 90, 220, 520, 200, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: CY, pad: [20, 24, 18, 24] }), 'fade-right'),
        on(text('8 bits = 1 <b style="color:' + GR + '">byte</b>. Un byte guarda 256 valores distintos: de sobra para una letra.', 90, 450, 520, 150, { fontSize: 26, color: CREAM, lineHeight: 1.35 }), 'fade-right'),
        on(img(pixel(), 740, 220, 360, 360, 'La letra A dibujada en una rejilla de píxeles'), 'fade-left'),
        along(text('Una imagen = una rejilla de píxeles, y cada píxel, números (su color).', 700, 590, 480, 70, { fontSize: 22, color: DIM, textAlign: 'center' }), 'fade-left')],
        notes: 'Idea grande: no solo los números son binarios; las letras (ASCII/Unicode) y las imágenes (píxeles) también. Mostrad que la rejilla de la derecha es la misma A, encendida y apagada.' },
      { title: 'De bits a gigas', layout: 'titleOnly', bg: BG, extra: [
        dg('steps', '8 bits = 1 byte (una letra)\n1 000 bytes = 1 KB (un párrafo)\n1 000 KB = 1 MB (una foto)\n1 000 MB = 1 GB (una película)', 110, 210, 1060, 300, { color: CREAM }),
        text('Cada escalón es unas mil veces el anterior.', 110, 560, 1060, 50, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'La escalera de tamaños da intuición: por qué una foto «pesa» más que un mensaje, y una película más que una foto. Pregunta: ¿cuántas fotos caben en un móvil de 128 GB?' },
      { layout: 'blank', bg: '#040d14', extra: [quiz('¿Qué número decimal es 1010 en binario?', ['5', '8', '10', '12'], 2)],
        notes: 'Repaso: 1010 = 8 + 0 + 2 + 0 = 10. Curiosidad para comentar: 1010 vale «diez» por casualidad; no siempre coincide.' },
      { layout: 'blank', bg: BG, back: [glow(-100, 300, 560, GR, BG, 40)], transition: 'zoom', extra: [
        text('Tu nombre en binario', 84, 130, 820, 90, { fontSize: 60, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('Busca en la tabla ASCII el número de cada letra de tus iniciales y escríbelo en binario (8 bits). Después intercambia con tu compañero: ¿sabéis descifrar el del otro?', 84, 250, 740, 180, { fontSize: 28, color: DIM, lineHeight: 1.4 }),
        timer(480, 900, 210, 300, { color: GR, endText: '¡A descifrar!' })],
        notes: 'Ocho minutos. Escribir las iniciales en binario fija el paso letra→número→bits. Descifrar el del compañero es el paso inverso y les encanta.' },
    ]), CREAM));
  } },

  // ---------------------------------------------------------------------------------------
  // 3 · Thinking like an algorithm: a recipe, the make-a-sandwich robot that takes everything
  // literally, a flowchart that draws itself, the three building blocks (sequence, selection,
  // repetition), a loop traced live, a bit of pseudocode, a quiz and writing an everyday algorithm.
  edu_tech_algorithm: { name: 'Pensar como un algoritmo', cat: 'edu', summary: 'Receta y robot literal que hace el bocadillo mal si las órdenes son vagas, un diagrama de flujo que se dibuja solo, secuencia-decisión-repetición, un bucle trazado, pseudocódigo, test y actividad', make: () => {
    const PAPER = '#faf7f0', INK = '#232733', BLUE = '#2f6df0', GRN = '#15a66a', ORA = '#f08c1b', RED = '#e2443b', GREY = '#6b7280', M = FF.mono, S = FF.space;
    // A flowchart piece: terminal (pill), process (box), decision (diamond).
    const flow = () => svgURL(420, 620, `
      <rect x="130" y="20" width="160" height="56" rx="28" fill="${GRN}"/><text x="210" y="56" font-family="sans-serif" font-size="24" fill="#fff" text-anchor="middle" font-weight="700">Inicio</text>
      <line x1="210" y1="76" x2="210" y2="110" stroke="${INK}" stroke-width="3"/>
      <rect x="90" y="110" width="240" height="64" rx="8" fill="#fff" stroke="${BLUE}" stroke-width="3"/><text x="210" y="149" font-family="sans-serif" font-size="22" fill="${INK}" text-anchor="middle">Coge un cereal</text>
      <line x1="210" y1="174" x2="210" y2="210" stroke="${INK}" stroke-width="3"/>
      <polygon points="210,210 340,300 210,390 80,300" fill="#fff" stroke="${ORA}" stroke-width="3"/><text x="210" y="308" font-family="sans-serif" font-size="21" fill="${INK}" text-anchor="middle">¿Está lleno</text><text x="210" y="332" font-family="sans-serif" font-size="21" fill="${INK}" text-anchor="middle">el bol?</text>
      <line x1="80" y1="300" x2="40" y2="300" stroke="${INK}" stroke-width="3"/><line x1="40" y1="300" x2="40" y2="142" stroke="${INK}" stroke-width="3"/><line x1="40" y1="142" x2="88" y2="142" stroke="${INK}" stroke-width="3"/><polygon points="88,136 88,148 100,142" fill="${INK}"/><text x="30" y="225" font-family="sans-serif" font-size="18" fill="${RED}" text-anchor="middle">No</text>
      <line x1="210" y1="390" x2="210" y2="430" stroke="${INK}" stroke-width="3"/><text x="230" y="415" font-family="sans-serif" font-size="18" fill="${GRN}">Sí</text>
      <rect x="130" y="430" width="160" height="56" rx="28" fill="${RED}"/><text x="210" y="466" font-family="sans-serif" font-size="24" fill="#fff" text-anchor="middle" font-weight="700">Fin</text>`);
    return numbered(ink(build({ name: 'Pensar como un algoritmo', palette: 'paper', fonts: 'modern', title: { color: INK, size: 50 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(950, -120, 560, BLUE, PAPER, 22), glow(-120, 560, 520, ORA, PAPER, 20)], extra: [
        text('TECNOLOGÍA · PENSAMIENTO COMPUTACIONAL', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BLUE, fontWeight: 700 }),
        text('Pensar como<br>un algoritmo', 84, 198, 760, 220, { fontSize: 86, fontWeight: 800, color: INK, lineHeight: 1.03, fontFamily: S }),
        text('Un algoritmo es una lista de pasos, clara y en orden, para resolver algo.', 90, 452, 640, 80, { fontSize: 30, color: GREY }),
        after(img(flow(), 820, 90, 380, 560, 'Un diagrama de flujo sencillo'), 'fade-left', { duration: 900 })],
        notes: 'Arranque: una receta, las instrucciones de un mueble o cómo llegar a un sitio ya son algoritmos. Hoy aprendemos a escribirlos para que hasta una máquina los siga sin equivocarse.' },
      { title: 'El robot que todo lo hace literal', layout: 'titleOnly', bg: PAPER, extra: [
        text('«Haz un bocadillo»… pero el robot <b>no supone nada</b>. Mira qué pasa:', 90, 185, 1100, 60, { fontSize: 28, color: INK }),
        ...[['«Pon el jamón en el pan»', 'Deja el paquete entero, sin abrir, encima de la barra cerrada.', RED],
          ['«Abre el pan»', 'Lo parte por la mitad… a lo largo, y a lo ancho, y en ocho.', ORA],
          ['«Unta mantequilla»', 'Pregunta: ¿cuánta? ¿con qué? ¿por qué cara?', BLUE]].map(([o, r, col], i) =>
          on(card(`<b>${o}</b><br><span style="font-size:23px;color:${GREY}">${r}</span>`, 90, 265 + i * 125, 1100, 110, '#fff', { color: INK, radius: 14, fontSize: 28, borderColor: col, pad: [16, 24, 14, 24] }), 'fade-up', { sound: 'pop' })),
        text('Un buen algoritmo no deja nada a la imaginación.', 90, 650, 1100, 40, { fontSize: 22, color: GREY, textAlign: 'center' })],
        notes: 'El clásico «robot que hace bocadillos» es oro: hacedlo en vivo si tenéis pan. Cada orden vaga sale mal. La moraleja es la precisión: las máquinas no suponen.' },
      { title: 'Tres piezas para cualquier programa', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Secuencia', 'Un paso detrás de otro, en orden.', BLUE, 'list'], ['Decisión', 'Si pasa esto, haz aquello; si no, lo otro.', ORA, 'triangle'], ['Repetición', 'Repite hasta que se cumpla algo.', GRN, 'cycle']].map(([n, d, col, k], i) => { const x = 80 + i * 383; return [
          on(shape('rounded', x, 220, 350, 310, '#fff', { radius: 18, stroke: col, strokeWidth: 3 }), 'zoom-in'),
          along(text(`<b style="color:${col};font-size:34px">${n}</b><br><br><span style="font-size:25px;color:${INK}">${d}</span>`, x + 26, 300, 300, 210, { fontSize: 26, textAlign: 'center' }), 'fade-up')]; }).flat()],
        notes: 'Toda la programación cabe en estas tres estructuras. Un clic por tarjeta. Más adelante (Scratch, Python) solo cambiaremos cómo se escriben, no la idea.' },
      { title: 'Un bucle, paso a paso', layout: 'twoContent', bg: PAPER, extra: [
        img(flow(), 80, 150, 360, 530, 'El diagrama del bol de cereales'),
        text('Seguimos la flecha con el dedo:', 520, 190, 640, 50, { fontSize: 27, color: INK, fontWeight: 700 }),
        ...['Empieza (Inicio).', 'Coge un cereal y échalo.', '¿El bol está lleno? Si no, vuelve atrás.', 'Repite… hasta que sí.', 'Entonces, Fin.'].map((t, i) =>
          on(text(`${i + 1}. ${t}`, 520, 260 + i * 70, 660, 60, { fontSize: 27, color: i === 2 || i === 3 ? '#b4530f' : INK }), 'fade-left'))],
        notes: 'Trazad el diagrama con el dedo o el puntero. La flecha que vuelve atrás es el bucle: lo que lo distingue de una simple lista. Un clic por paso.' },
      { title: 'Escrito como pseudocódigo', layout: 'titleOnly', bg: PAPER, extra: [
        codeBlock({ x: 150, y: 210, w: 980, h: 300, lang: 'plaintext', fontSize: 28,
          code: 'repetir\n    coger un cereal\n    echarlo al bol\nhasta que el bol esté lleno\n\nservir con leche' }),
        text('Pseudocódigo: casi en español, pero con la forma de un programa. Después se traduce a Python, Scratch…', 150, 540, 980, 80, { fontSize: 24, color: GREY, textAlign: 'center' })],
        notes: 'El pseudocódigo es el puente entre la idea y el código real. La sangría marca qué está «dentro» del bucle. Comparadlo con el diagrama anterior: dicen lo mismo.' },
      { layout: 'blank', bg: '#eef1f7', extra: [quiz('¿Cuál de estas estructuras repite pasos hasta que se cumple una condición?',
        ['Secuencia', 'Decisión', 'Repetición (bucle)', 'Variable'], 2)],
        notes: 'Repaso de vocabulario. La repetición/bucle es la que ahorra escribir lo mismo mil veces.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, GRN, PAPER, 22)], transition: 'zoom', extra: [
        text('Escribe tu algoritmo', 84, 130, 820, 90, { fontSize: 62, fontWeight: 800, color: INK, fontFamily: S }),
        text('Elige algo cotidiano —lavarte los dientes, hacer un cola-cao, llegar de casa al aula— y escríbelo como pasos tan precisos que un robot lo haría bien. Luego un compañero hará de robot literal.', 84, 250, 740, 200, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(420, 900, 210, 300, { color: GRN, endText: '¡Que empiece el robot!' })],
        notes: 'Siete minutos. El momento estrella es cuando otro alumno «ejecuta» el algoritmo al pie de la letra y falla por los huecos. Ahí se entiende de verdad la precisión.' },
    ]), INK));
  } },

  // ---------------------------------------------------------------------------------------
  // 4 · Block programming (Scratch style): a stack of puzzle blocks, the coloured palette by
  // category, a script that draws a square, events and loops, a conditional that bounces, a score
  // variable, a quiz and planning your own game.
  edu_tech_scratch: { name: 'Programar por bloques', cat: 'edu', summary: 'Estilo Scratch: una pila de bloques encajados, la paleta de colores por categoría, un guion que dibuja un cuadrado, eventos y bucles, un condicional que rebota, una variable de puntos, test y actividad', make: () => {
    const BG = '#f3f1fb', INK = '#2b2440', GREY = '#6b6482', MOT = '#4c97ff', LOO = '#ffab19', EVT = '#ffbf00', CTR = '#ff8c1a', LOOK = '#9966ff', OPR = '#59c059', CREAM = '#ffffff', S = FF.space;
    // A Scratch-like block: a rounded bar with a top notch and a bottom bump.
    const blk = (label, color, w = 420) => svgURL(w, 64, `
      <path d="M8 2 h18 l6 8 h20 l6 -8 h${w - 76} a6 6 0 0 1 6 6 v44 a6 6 0 0 1 -6 6 h${-(w - 76)} l-6 8 h-20 l-6 -8 h-18 a6 6 0 0 1 -6 -6 v-44 a6 6 0 0 1 6 -6 z" fill="${color}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
      <text x="26" y="40" font-family="'Poppins',sans-serif" font-size="24" font-weight="600" fill="#fff">${label}</text>`);
    const stack = (rows) => svgURL(460, rows.length * 56 + 30, rows.map(([t, c], i) => `<g transform="translate(10 ${10 + i * 56})">`
      + `<path d="M8 2 h18 l6 8 h20 l6 -8 h340 a6 6 0 0 1 6 6 v38 a6 6 0 0 1 -6 6 h-340 l-6 8 h-20 l-6 -8 h-18 a6 6 0 0 1 -6 -6 v-38 a6 6 0 0 1 6 -6 z" fill="${c}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`
      + `<text x="24" y="36" font-family="'Poppins',sans-serif" font-size="22" font-weight="600" fill="#fff">${t}</text></g>`).join(''));
    return numbered(ink(build({ name: 'Programar por bloques', palette: 'violet', fonts: 'friendly', title: { color: INK, size: 50 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, back: [glow(960, -120, 560, LOOK, BG, 24), glow(-120, 560, 520, MOT, BG, 22)], extra: [
        text('TECNOLOGÍA · PROGRAMACIÓN EN EL AULA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: LOOK, fontWeight: 700 }),
        text('Programar<br>por bloques', 84, 198, 720, 220, { fontSize: 88, fontWeight: 800, color: INK, lineHeight: 1.03, fontFamily: S }),
        text('Las piezas encajan como un puzle: si encajan, el programa tiene sentido.', 90, 452, 640, 80, { fontSize: 30, color: GREY }),
        after(img(stack([['al presionar 🏁', EVT], ['por siempre', LOO], ['mover 10 pasos', MOT], ['si toca el borde, rebotar', CTR]]), 790, 150, 420, 320, 'Una pila de bloques encajados'), 'fade-left', { duration: 900 })],
        notes: 'Arranque: con Scratch (o similares) se programa arrastrando piezas, sin escribir. Lo importante no son las piezas, sino la idea; la misma que luego sirve en Python.' },
      { title: 'La paleta: cada color, una familia', layout: 'titleOnly', bg: BG, extra: [
        ...[['Eventos', 'cuándo empieza', EVT], ['Movimiento', 'mover, girar, ir a', MOT], ['Control', 'repetir, esperar, si…', CTR], ['Apariencia', 'decir, cambiar disfraz', LOOK], ['Operadores', 'sumar, comparar', OPR], ['Sensores', 'tocar, teclas, ratón', '#5cb1d6']].map(([n, d, col], i) => { const x = 90 + (i % 3) * 370, y = 220 + Math.floor(i / 3) * 190; return [
          on(shape('rounded', x, y, 345, 160, col, { radius: 16 }), 'zoom-in', { sound: 'pop' }),
          along(text(`<b style="font-size:30px">${n}</b><br><span style="font-size:22px;opacity:.95">${d}</span>`, x + 22, y + 34, 300, 110, { fontSize: 24, color: '#fff' }), 'fade-up')]; }).flat()],
        notes: 'Un clic por familia. El color dice de qué va cada bloque: así, de un vistazo, se entiende un programa ajeno. Seis familias cubren casi todo en Scratch.' },
      { title: 'Un guion que dibuja un cuadrado', layout: 'twoContent', bg: BG, extra: [
        img(stack([['al presionar 🏁', EVT], ['bajar lápiz', LOOK], ['repetir 4', LOO], ['   mover 100 pasos', MOT], ['   girar 90 grados', MOT]]), 90, 180, 480, 360, 'El guion del cuadrado'),
        on(img(svgURL(360, 360, `<rect x="90" y="90" width="180" height="180" fill="none" stroke="${MOT}" stroke-width="10"/><circle cx="90" cy="90" r="12" fill="${CTR}"/>`), 720, 190, 340, 340, 'Un cuadrado dibujado'), 'fade-left', { duration: 800 }),
        text('Repetir 4 veces «avanza y gira 90°» = un cuadrado. Cambia el 4 por 3 y sale un triángulo.', 680, 540, 460, 110, { fontSize: 24, color: GREY })],
        notes: 'La joya del pensamiento computacional: un bucle corto hace una figura. Pregunta: ¿qué número de lados y qué ángulo para un hexágono? (6 y 60°.)' },
      { title: 'Eventos, bucles y condiciones', layout: 'titleOnly', bg: BG, extra: [
        ...[['Evento', 'Al presionar 🏁 arranca todo. Sin evento, el guion no empieza.', EVT, '#8a6a00'], ['Bucle', '«Repetir» y «por siempre» ahorran copiar la misma pieza mil veces.', LOO, '#9a5212'], ['Condición', '«Si toca el borde, rebotar»: el programa decide según lo que pasa.', CTR, '#9a4f12']].map(([n, d, col, tc], i) =>
          on(card(`<b style="color:${tc};font-size:30px">${n}</b>&nbsp;&nbsp;<span style="font-size:25px;color:${INK}">${d}</span>`, 110, 230 + i * 130, 1060, 110, CREAM, { color: INK, radius: 14, fontSize: 26, borderColor: col, pad: [20, 26, 18, 26], vAlign: 'middle' }), 'fade-right'))],
        notes: 'Las tres estructuras del tema del algoritmo, ahora como bloques de colores. Un clic por idea. Reconocerlas en cualquier lenguaje es el objetivo del curso.' },
      { title: 'Guardar un dato: la variable «puntos»', layout: 'titleOnly', bg: BG, extra: [
        img(stack([['fijar puntos a 0', OPR], ['al tocar 🍎', '#5cb1d6'], ['   cambiar puntos por 1', OPR], ['   decir puntos', LOOK]]), 110, 200, 480, 320, 'Un guion con una variable'),
        text('Una <b style="color:#2f7d32">variable</b> es una caja con nombre donde el programa guarda algo que cambia: la puntuación, la vida, el nivel…', 640, 230, 520, 200, { fontSize: 27, color: INK, lineHeight: 1.4 }),
        on(big('+1', 'cada manzana', 760, 440, '#2f7d32', GREY), 'zoom-in', { sound: 'pop' })],
        notes: 'La variable es el primer concepto «abstracto» del curso. La metáfora de la caja con nombre funciona muy bien. Aquí «puntos» sube de uno en uno.' },
      { layout: 'blank', bg: '#e8e4f6', extra: [quiz('¿Qué bloque usarías para repetir una acción muchas veces?',
        ['Un evento', 'Un bucle', 'Una variable', 'Un disfraz'], 1)],
        notes: 'Repaso: bucle = repetición. Muchos dirán «variable»; aclarar que la variable guarda, el bucle repite.' },
      { layout: 'blank', bg: BG, back: [glow(1000, 420, 520, LOOK, BG, 24)], transition: 'zoom', extra: [
        text('Diseña tu juego', 84, 130, 820, 90, { fontSize: 62, fontWeight: 800, color: INK, fontFamily: S }),
        text('En una hoja, antes de tocar el ordenador: ¿quién es el personaje? ¿qué lo controla (teclas)? ¿qué regla le da puntos? ¿cuándo se gana o se pierde? Eso es el guion de tu juego.', 84, 250, 740, 200, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(480, 900, 210, 300, { color: LOOK, endText: '¡A programarlo!' })],
        notes: 'Ocho minutos de diseño en papel. Pensar las reglas antes de arrastrar bloques evita el «prueba y error» sin rumbo. Luego se lleva a Scratch.' },
    ]), INK));
  } },

  // ---------------------------------------------------------------------------------------
  // 5 · First lines of Python: a real terminal, print, variables and types, input, a for loop with
  // its output, if/else, a tiny guessing program, the usual beginner errors, a quiz and a challenge.
  edu_tech_python: { name: 'Tus primeras líneas de Python', cat: 'edu', summary: 'Terminal de verdad: print, variables y tipos, input, un bucle for con su salida, if/else, un mini programa de adivinar, los errores típicos de quien empieza, test y reto', make: () => {
    const BG = '#0d1117', PANEL = '#161b22', GR = '#7ee787', BL = '#79c0ff', YE = '#f2cc60', OR = '#ffa657', PI = '#ff7b72', DIM = '#8b949e', CREAM = '#e6edf3', M = FF.mono, S = FF.space;
    // A terminal window with a title bar and prompt lines (HTML inside a card).
    const term = (lines) => card(`<div style="font-family:${M};font-size:24px;line-height:1.5">` + lines + '</div>', 0, 0, 0, 0, PANEL);
    return numbered(ink(build({ name: 'Tus primeras líneas de Python', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 50 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(-150, -120, 560, BL, BG, 40), glow(1000, 500, 560, GR, BG, 35)], extra: [
        text('PROGRAMACIÓN · PRIMER CONTACTO', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: GR, fontWeight: 700, fontFamily: M }),
        text('Tus primeras<br>líneas de Python', 84, 198, 820, 220, { fontSize: 76, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('Un lenguaje que se lee casi como el inglés. Vamos a hacerlo hablar.', 90, 460, 680, 96, { fontSize: 30, color: DIM }),
        after(card(`<div style="font-family:${M};font-size:26px;color:${GR}">&gt;&gt;&gt; <span style="color:${CREAM}">print("¡Hola, clase!")</span><br><span style="color:${BL}">¡Hola, clase!</span></div>`, 790, 180, 410, 150, PANEL, { radius: 12, borderColor: '#30363d', pad: [26, 26, 26, 26] }), 'fade-left', { duration: 900 })],
        notes: 'Arranque: Python se usa en ciencia, en webs, en inteligencia artificial… y para aprender es ideal porque se lee casi como una frase. Hoy escribimos de verdad.' },
      { title: 'Hablar: print()', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 110, y: 200, w: 700, h: 160, lang: 'python', fontSize: 26, code: 'print("Hola")\nprint("Tengo", 13, "años")' }),
        card(`<div style="font-family:${M};color:${DIM}">salida:</div><div style="font-family:${M};color:${CREAM};font-size:26px">Hola<br>Tengo 13 años</div>`, 850, 200, 320, 160, PANEL, { radius: 12, borderColor: '#30363d', fontSize: 22 }),
        text('<b>print</b> muestra en pantalla lo que le pongas entre paréntesis. El texto va entre comillas; los números, no.', 110, 420, 1060, 110, { fontSize: 27, color: CREAM, lineHeight: 1.4 })],
        notes: 'print() es la primera orden de todos. Detalle que confunde: las comillas son para texto. Hacedles cambiar el mensaje y ejecutar.' },
      { title: 'Guardar datos: variables', layout: 'twoContent', bg: BG, extra: [
        codeBlock({ x: 90, y: 200, w: 560, h: 220, lang: 'python', fontSize: 25, code: 'nombre = "Ada"\nedad = 13\naltura = 1.55\nes_alumno = True' }),
        on(tableBlock({ x: 700, y: 200, w: 480, h: 240, stroke: '#30363d',
          rows: [['Valor', 'Tipo'], ['"Ada"', 'texto (str)'], ['13', 'entero (int)'], ['1.55', 'decimal (float)'], ['True', 'lógico (bool)']] }), 'fade-left'),
        text('Una variable es una caja con nombre. Python adivina el tipo según lo que guardes.', 90, 470, 1090, 80, { fontSize: 26, color: DIM, textAlign: 'center' })],
        notes: 'Cuatro tipos básicos. No hace falta declarar el tipo: Python lo deduce. La tabla aparece con un clic para contrastarla con el código.' },
      { title: 'Preguntar: input()', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 110, y: 200, w: 760, h: 170, lang: 'python', fontSize: 25, code: 'nombre = input("¿Cómo te llamas? ")\nprint("Encantado,", nombre)' }),
        on(card(`<div style="font-family:${M};font-size:24px"><span style="color:${DIM}">¿Cómo te llamas? </span><span style="color:${YE}">Lucía</span><br><span style="color:${CREAM}">Encantado, Lucía</span></div>`, 110, 400, 760, 140, PANEL, { radius: 12, borderColor: '#30363d', pad: [22, 24, 22, 24] }), 'fade-up'),
        text('<b>input</b> espera a que el usuario escriba y guarda lo que teclee. ¡El programa ya conversa!', 900, 220, 280, 300, { fontSize: 25, color: CREAM, lineHeight: 1.4 })],
        notes: 'input() hace el programa interactivo, y eso engancha. Aviso para más adelante: input siempre da texto; para números hay que convertir con int().' },
      { title: 'Repetir: el bucle for', layout: 'twoContent', bg: BG, extra: [
        codeBlock({ x: 90, y: 200, w: 560, h: 160, lang: 'python', fontSize: 26, code: 'for i in range(3):\n    print("¡Hola!", i)' }),
        card(`<div style="font-family:${M};color:${DIM}">salida:</div><div style="font-family:${M};color:${CREAM};font-size:26px">¡Hola! 0<br>¡Hola! 1<br>¡Hola! 2</div>`, 700, 200, 480, 180, PANEL, { radius: 12, borderColor: '#30363d', fontSize: 22 }),
        text('<b style="color:' + GR + '">range(3)</b> da 0, 1, 2. La <b>sangría</b> (los espacios) marca qué se repite: en Python no es decoración, es obligatoria.', 90, 430, 1090, 110, { fontSize: 26, color: CREAM, lineHeight: 1.4, textAlign: 'center' })],
        notes: 'El for es el bucle estrella. Dos cosas que confunden: range empieza en 0 y la sangría es parte de la sintaxis. Insistid en la sangría.' },
      { title: 'Decidir: if / else', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 110, y: 190, w: 760, h: 240, lang: 'python', fontSize: 25, code: 'edad = int(input("Tu edad: "))\nif edad >= 18:\n    print("Puedes votar")\nelse:\n    print("Aún no")' }),
        on(text('El programa toma <b style="color:' + BL + '">caminos distintos</b> según la respuesta. Fíjate otra vez en los dos puntos y la sangría.', 900, 210, 280, 300, { fontSize: 25, color: CREAM, lineHeight: 1.4 }), 'fade-left')],
        notes: 'if/else = la estructura de decisión, ahora en Python. int(input(...)) convierte el texto a número: buen momento para explicar por qué hace falta.' },
      { layout: 'blank', bg: '#090c10', extra: [quiz('¿Qué imprime range(3) en un bucle for?', ['1, 2, 3', '0, 1, 2', '0, 1, 2, 3', '3 veces el 3'], 1)],
        notes: 'El clásico: range(3) → 0, 1, 2 (tres valores, empezando en 0). Error típico marcado como distractor.' },
      { layout: 'blank', bg: BG, back: [glow(-100, 300, 560, GR, BG, 35)], transition: 'zoom', extra: [
        text('Reto: adivina el número', 84, 120, 900, 90, { fontSize: 58, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('Escribe un programa que guarde un número secreto y pida al usuario adivinarlo; que responda «más alto», «más bajo» o «¡acertaste!». Pista: input, if/else y un bucle.', 84, 240, 760, 180, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        timer(600, 900, 200, 300, { color: GR, endText: '¡A probarlo!' })],
        notes: 'Diez minutos. El juego de adivinar junta todo: variable, input, if/else y bucle. Quien acabe, que añada un contador de intentos.' },
    ]), CREAM));
  } },

  // ---------------------------------------------------------------------------------------
  // 6 · How a message travels the internet: a map of nodes, client and server, a message split into
  // numbered packets that take different routes and are reassembled, IP and DNS as a phone book,
  // routers hop by hop, request and response, the https padlock, a quiz and tracing a packet.
  edu_tech_internet: { name: 'Cómo viaja un mensaje por internet', cat: 'edu', summary: 'Mapa de nodos: cliente y servidor, un mensaje partido en paquetes numerados que van por rutas distintas y se recomponen, IP y DNS como una agenda, saltos entre routers, petición y respuesta, el candado https y actividad', make: () => {
    const BG = '#061a2b', PANEL = '#0d2b42', CY = '#4cc9f0', GR = '#56d364', AM = '#ffd166', VI = '#b088ff', RE = '#ff6b6b', DIM = '#8fb3c9', CREAM = '#e8f4fb', M = FF.mono, S = FF.space;
    // A network: dots (routers) joined by faint lines, a client on the left and a server on the right.
    const net = () => svgURL(1160, 420, [[180, 210], [430, 110], [430, 320], [650, 200], [880, 110], [880, 320], [1000, 210]].flatMap((a, i, arr) =>
      arr.slice(i + 1).filter((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 320).map(b => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#1f4a6b" stroke-width="2"/>`)).join('')
      + [[430, 110], [430, 320], [650, 200], [880, 110], [880, 320]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="${PANEL}" stroke="${CY}" stroke-width="3"/>`).join('')
      + `<rect x="120" y="170" width="110" height="80" rx="10" fill="${PANEL}" stroke="${GR}" stroke-width="3"/><text x="175" y="218" font-family="monospace" font-size="20" fill="${GR}" text-anchor="middle">tú</text>`
      + `<rect x="960" y="170" width="110" height="80" rx="10" fill="${PANEL}" stroke="${AM}" stroke-width="3"/><text x="1015" y="218" font-family="monospace" font-size="18" fill="${AM}" text-anchor="middle">servidor</text>`);
    const packet = (n, col) => svgURL(90, 90, `<rect x="6" y="6" width="78" height="78" rx="12" fill="${col}" stroke="rgba(255,255,255,.5)" stroke-width="3"/><text x="45" y="58" font-family="monospace" font-size="40" font-weight="700" fill="#06202f" text-anchor="middle">${n}</text>`);
    return numbered(ink(build({ name: 'Cómo viaja un mensaje por internet', palette: 'ocean', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [img(net(), 60, 300, 1160, 420, '')], extra: [
        text('TECNOLOGÍA · REDES', 90, 120, 680, 36, { fontSize: 22, letterSpacing: 4, color: CY, fontWeight: 700, fontFamily: M }),
        text('Cómo viaja un mensaje<br>por internet', 84, 166, 1000, 180, { fontSize: 66, fontWeight: 800, color: CREAM, lineHeight: 1.05, fontFamily: S }),
        text('Pulsas «enviar» y llega al otro lado del mundo en un parpadeo. ¿Cómo?', 90, 356, 840, 90, { fontSize: 29, color: DIM })],
        notes: 'Arranque: un mensaje o un vídeo cruza el planeta en milisegundos. Hoy seguimos su viaje, de tu aparato al servidor y de vuelta.' },
      { title: 'Cliente y servidor', layout: 'titleOnly', bg: BG, extra: [
        on(card('<b style="color:' + GR + ';font-size:32px">Cliente</b><br><span style="font-size:24px">Tu aparato (el móvil, el portátil). <b>Pide</b> cosas: una web, un vídeo, un mensaje.</span>', 90, 240, 500, 220, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: GR, pad: [22, 26, 22, 26] }), 'fade-right'),
        on(shape('rightarrow', 620, 320, 120, 60, CY), 'fade-right'),
        on(card('<b style="color:' + AM + ';font-size:32px">Servidor</b><br><span style="font-size:24px">Un ordenador siempre encendido que <b>responde</b>: guarda la web y te la envía.</span>', 690, 240, 500, 220, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: AM, pad: [22, 26, 22, 26] }), 'fade-left'),
        text('Internet es, sobre todo, aparatos que piden y aparatos que responden.', 90, 500, 1100, 50, { fontSize: 25, color: DIM, textAlign: 'center' })],
        notes: 'El modelo cliente-servidor es la base. Ejemplo cercano: al abrir una web, tu móvil (cliente) pide y el servidor de esa web responde.' },
      { title: 'El mensaje viaja en paquetes', layout: 'titleOnly', bg: BG, extra: [
        text('No va de una pieza: se parte en <b style="color:' + CY + '">paquetes</b> numerados. Cada uno busca su propio camino.', 90, 180, 1100, 70, { fontSize: 28, color: CREAM }),
        ...[1, 2, 3, 4].map((n, i) => on(img(packet(n, [CY, GR, AM, VI][i]), 150 + i * 130, 300, 90, 90, 'Paquete ' + n), 'fade-up', { sound: 'pop' })),
        after(img(packet(3, AM), 720, 420, 90, 90, 'El paquete 3 llega el último'), 'fade-up'),
        text('Si uno se pierde, se pide otra vez. Al llegar, se ordenan por su número y el mensaje se recompone entero.', 90, 560, 1100, 90, { fontSize: 25, color: DIM, textAlign: 'center' })],
        notes: 'La conmutación de paquetes es la gran idea de internet: trocear y numerar. Por eso la red aguanta aunque se caiga un cable: los paquetes rodean el problema.' },
      { title: 'Direcciones: IP y DNS', layout: 'twoContent', bg: BG, extra: [
        on(card('<b style="color:' + CY + '">La IP</b> es el número de cada aparato en la red, como un número de teléfono: <span style="font-family:' + M + ';color:' + AM + '">142.250.184.3</span>', 90, 230, 520, 220, PANEL, { color: CREAM, radius: 16, fontSize: 26, borderColor: CY, pad: [22, 26, 22, 26] }), 'fade-right'),
        on(card('<b style="color:' + GR + '">El DNS</b> es la agenda: traduce un nombre fácil (<b>revelaslides.com</b>) al número IP que de verdad se usa.', 665, 230, 520, 220, PANEL, { color: CREAM, radius: 16, fontSize: 26, borderColor: GR, pad: [22, 26, 22, 26] }), 'fade-left'),
        text('Tú recuerdas el nombre; la máquina necesita el número. El DNS los enlaza.', 90, 490, 1100, 60, { fontSize: 25, color: DIM, textAlign: 'center' })],
        notes: 'IP = número de teléfono del aparato; DNS = agenda de contactos. La analogía del teléfono es la más clara: nadie memoriza IPs, como nadie memoriza números.' },
      { title: 'De router en router', layout: 'titleOnly', bg: BG, extra: [
        img(net(), 50, 200, 840, 340, 'Una red de routers'),
        after(withAnims(img(packet(1, CY), 120, 360, 64, 64, 'Un paquete saltando por la red'),
          path([[220, -90], [400, -10], [560, -90], [700, -30]], { duration: 2600 })), 'none'),
        nasa('communication-and-navigation-outage-forecast-system-cnofs', 910, 170, 310, 300, { autoRotate: true, alt: 'Un satélite de comunicaciones', caption: 'Satélite de comunicaciones — NASA' }),
        text('Algunos saltos cruzan el mundo por <b style="color:#ffd166">satélite</b>.', 900, 500, 320, 90, { fontSize: 23, color: DIM, textAlign: 'center' })],
        notes: 'El paquete salta de nodo en nodo; cada router decide el siguiente salto hacia el destino. Algunos tramos largos van por satélite: el modelo 3D se puede girar. Nadie planea toda la ruta de antemano.' },
      { title: 'Pedir y responder (y el candado)', layout: 'titleOnly', bg: BG, extra: [
        ...[['1 · Petición', 'Tu navegador pide: «dame la página revelaslides.com».', CY], ['2 · Respuesta', 'El servidor envía el texto, las imágenes y el estilo.', AM], ['3 · HTTPS', 'El candado 🔒 cifra el viaje: nadie puede leerlo por el camino.', GR]].map(([t, d, col], i) =>
          on(card(`<b style="color:${col}">${t}</b>&nbsp;&nbsp;<span style="font-size:24px;color:${CREAM}">${d}</span>`, 110, 230 + i * 130, 1060, 110, PANEL, { color: CREAM, radius: 14, fontSize: 28, borderColor: col, pad: [20, 26, 18, 26], vAlign: 'middle' }), 'fade-left'))],
        notes: 'Petición y respuesta (HTTP) es el diálogo de la web. El candado (HTTPS) cifra: fundamental para contraseñas y pagos. Enlaza con el tema de seguridad.' },
      { layout: 'blank', bg: '#04121d', extra: [quiz('¿Para qué sirve el DNS?', ['Para cifrar los datos', 'Para traducir un nombre web a su número IP', 'Para partir el mensaje en paquetes', 'Para guardar la web'], 1)],
        notes: 'Repaso: DNS = agenda nombre→IP. Distractores con los otros conceptos del tema (cifrado, paquetes, servidor).' },
      { layout: 'blank', bg: BG, back: [glow(1000, 100, 560, CY, BG, 35)], transition: 'zoom', extra: [
        text('Sigue el rastro de un paquete', 84, 120, 940, 90, { fontSize: 54, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('Dibuja el viaje de un mensaje de WhatsApp desde tu móvil hasta el de un amigo: cliente, antena, routers, servidor y de vuelta. Marca dónde actúa el DNS y dónde el candado.', 84, 240, 760, 190, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        timer(480, 900, 200, 300, { color: CY, endText: '¡Lo dibujamos juntos!' })],
        notes: 'Ocho minutos. Dibujar el recorrido fija el modelo: no es magia, son saltos entre máquinas con direcciones. Puesta en común en la pizarra.' },
    ]), CREAM));
  } },

  // ---------------------------------------------------------------------------------------
  // 7 · Robotics, sensors and actuators: a real 3D robot that greets, the sense-think-act loop as a
  // cycle, the kinds of sensors, a line follower, the microcontroller, a simple rule in code, a quiz
  // and designing a robot for a job.
  edu_tech_robotics: { name: 'Robótica: sensores y actuadores', cat: 'edu', summary: 'Un robot 3D de verdad que saluda, el bucle percibir-pensar-actuar como ciclo, los tipos de sensores, un sigue-líneas, el microcontrolador, una regla sencilla en código, test y diseña tu robot', make: () => {
    const BG = '#0b1a1a', PANEL = '#12302e', TE = '#2dd4bf', GR = '#86efac', AM = '#fbbf24', BL = '#60a5fa', VI = '#c084fc', DIM = '#8fb3ac', CREAM = '#e7faf5', M = FF.mono, S = FF.space;
    // A line-follower: a white robot on a black track with two eyes (sensors).
    const follower = () => svgURL(640, 360, `<rect width="640" height="360" rx="16" fill="#0f2422"/>`
      + `<path d="M60 300 C 200 300 220 80 360 90 C 520 100 520 290 600 250" fill="none" stroke="#000" stroke-width="40" stroke-linecap="round"/>`
      + `<path d="M60 300 C 200 300 220 80 360 90 C 520 100 520 290 600 250" fill="none" stroke="${TE}" stroke-width="3" stroke-dasharray="6 10"/>`
      + `<g transform="translate(300 150)"><rect x="-55" y="-45" width="110" height="90" rx="14" fill="#e7faf5" stroke="${TE}" stroke-width="3"/>`
      + `<circle cx="-24" cy="-20" r="12" fill="${AM}"/><circle cx="24" cy="-20" r="12" fill="${AM}"/>`
      + `<rect x="-62" y="28" width="24" height="26" rx="4" fill="#9ca3af"/><rect x="38" y="28" width="24" height="26" rx="4" fill="#9ca3af"/></g>`);
    return numbered(ink(build({ name: 'Robótica: sensores y actuadores', palette: 'forest', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, TE, BG, 32), glow(-120, 560, 520, VI, BG, 26)], extra: [
        text('TECNOLOGÍA · ROBÓTICA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 4, color: TE, fontWeight: 700, fontFamily: M }),
        text('Robótica:<br>sensores y actuadores', 84, 198, 720, 230, { fontSize: 64, fontWeight: 800, color: CREAM, lineHeight: 1.06, fontFamily: S }),
        text('Un robot no es «listo»: percibe, decide con reglas y actúa. Una y otra vez.', 90, 470, 640, 80, { fontSize: 29, color: DIM }),
        model('three-RobotExpressive', 780, 150, 420, 460, { autoRotate: true, view: 'front' })],
        notes: 'Arranque: este robot 3D se puede girar y ver desde cualquier lado. Un robot repite sin parar un ciclo: percibir, pensar, actuar. Hoy lo desmontamos en esas tres partes.' },
      { title: 'El bucle percibir · pensar · actuar', layout: 'titleOnly', bg: BG, extra: [
        dg('cycle', 'Percibir\nPensar\nActuar', 110, 200, 520, 420, { color: CREAM }),
        ...[['Percibir', 'Los sensores miden el mundo: luz, distancia, temperatura…', BL], ['Pensar', 'El programa decide con reglas: si… entonces…', AM], ['Actuar', 'Los actuadores mueven: ruedas, motores, un brazo.', GR]].map(([t, d, col], i) =>
          on(card(`<b style="color:${col}">${t}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, 680, 210 + i * 140, 510, 120, PANEL, { color: CREAM, radius: 14, fontSize: 28, borderColor: col, pad: [16, 22, 14, 22] }), 'fade-left'))],
        notes: 'El ciclo sense-think-act es el esqueleto de toda la robótica. Un clic por fase. El diagrama de ciclo de la izquierda gira sin fin: igual que el robot.' },
      { title: 'Los sentidos del robot', layout: 'titleOnly', bg: BG, extra: [
        ...[['eye', 'Luz / cámara', 've claro u oscuro, o una imagen', AM], ['activity', 'Distancia', 'ultrasonidos: ¿hay algo delante?', TE], ['bolt', 'Contacto', 'un botón que nota un choque', BL], ['globe', 'Temperatura', 'frío o calor del ambiente', VI]].map(([ic, n, d, col], i) => { const x = 90 + (i % 2) * 575, y = 220 + Math.floor(i / 2) * 215; return [
          on(card(`<b style="font-size:30px;color:${col}">${n}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, x, y, 525, 185, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [20, 24, 18, 100] }), 'fade-up', { sound: 'pop' }),
          along(icon(ic, x + 24, y + 56, 60, col), 'fade-up')]; }).flat()],
        notes: 'Un clic por sensor. Lo clave: cada sensor convierte algo del mundo (luz, distancia) en un número que el programa puede usar. Sin sensores, el robot está «ciego».' },
      { title: 'Ejemplo: un robot sigue-líneas', layout: 'twoContent', bg: BG, extra: [
        img(follower(), 90, 200, 560, 320, 'Un robot que sigue una línea negra'),
        text('Dos sensores de luz miran el suelo. La regla es sencilla:', 690, 200, 500, 84, { fontSize: 25, color: CREAM, lineHeight: 1.3 }),
        on(card('<span style="font-family:' + M + ';font-size:22px">si el izquierdo ve negro → gira a la izquierda<br>si el derecho ve negro → gira a la derecha<br>si no → recto</span>', 690, 290, 500, 220, PANEL, { color: GR, radius: 14, borderColor: TE, pad: [20, 22, 20, 22] }), 'fade-left')],
        notes: 'El sigue-líneas es el «hola mundo» de la robótica física. Toda su inteligencia son tres reglas. Un clic revela el código. Enlaza con el if/else de Python.' },
      { title: 'El cerebro: un microcontrolador', layout: 'titleOnly', bg: BG, extra: [
        img(svgURL(360, 300, `<rect x="40" y="60" width="280" height="180" rx="12" fill="#1a3d2e" stroke="${TE}" stroke-width="3"/><rect x="120" y="110" width="120" height="80" rx="6" fill="#0f2422" stroke="${GR}" stroke-width="2"/><text x="180" y="158" font-family="monospace" font-size="20" fill="${GR}" text-anchor="middle">MCU</text>` + Array.from({ length: 7 }, (_, i) => `<rect x="${60 + i * 38}" y="30" width="10" height="30" fill="${AM}"/><rect x="${60 + i * 38}" y="240" width="10" height="30" fill="${AM}"/>`).join('')), 90, 200, 360, 300, 'Una placa microcontroladora'),
        text('Una placa pequeña y barata (Arduino, micro:bit…) es el cerebro: lee los sensores, ejecuta tu programa y da órdenes a los motores.', 520, 220, 670, 160, { fontSize: 27, color: CREAM, lineHeight: 1.4 }),
        text('Tú le cargas el programa desde el ordenador; luego funciona sola, sin enchufar al PC.', 520, 410, 670, 110, { fontSize: 24, color: DIM, lineHeight: 1.4 })],
        notes: 'El microcontrolador es la CPU del robot. micro:bit y Arduino son los habituales en el aula. Idea: el mismo pensamiento (sensores, reglas, actuadores) vale para cualquier placa.' },
      { layout: 'blank', bg: '#071413', extra: [quiz('¿Qué parte del robot MUEVE las ruedas o un brazo?',
        ['El sensor', 'El actuador', 'El microcontrolador', 'La batería'], 1)],
        notes: 'Repaso del vocabulario clave: sensor (percibe) vs actuador (mueve). El microcontrolador piensa; la batería alimenta.' },
      { layout: 'blank', bg: BG, back: [glow(-100, 300, 560, TE, BG, 30)], transition: 'zoom', extra: [
        text('Diseña un robot con un trabajo', 84, 120, 980, 90, { fontSize: 52, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('Por grupos: elegid una tarea (regar plantas, avisar si alguien entra, ordenar piezas). ¿Qué sensores necesita? ¿Qué actuadores? Escribid su regla principal como «si… entonces…».', 84, 240, 760, 190, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        timer(540, 900, 200, 300, { color: TE, endText: '¡Presentad vuestro robot!' })],
        notes: 'Nueve minutos. Partir de la tarea y deducir sensores/actuadores es ingeniería de verdad. Robot 3D: Tomás Laulhé (CC0), morph targets de Don McCurdy.' },
    ]), CREAM));
  } },

  // ---------------------------------------------------------------------------------------
  // 8 · Online safety and your digital footprint: a strong vs weak password with a strength meter,
  // spotting phishing, two-factor, the footprint you leave behind, privacy settings, think before
  // you post, a what-would-you-do poll, a quiz and auditing your own passwords.
  edu_tech_safety: { name: 'Seguridad y huella digital', cat: 'edu', summary: 'Contraseña fuerte contra débil con medidor, detectar el phishing, doble factor, la huella que dejas, ajustes de privacidad, piensa antes de publicar, una votación de dilema, test y audita tus contraseñas', make: () => {
    const BG = '#15121f', PANEL = '#221c33', GR = '#4ade80', AM = '#fbbf24', RE = '#f87171', BL = '#60a5fa', VI = '#a78bfa', DIM = '#9890ad', CREAM = '#efecf7', M = FF.mono, S = FF.space;
    // A password strength meter: five segments, the first `n` lit in a colour.
    const meter = (n, col) => svgURL(420, 60, Array.from({ length: 5 }, (_, i) =>
      `<rect x="${i * 84}" y="18" width="72" height="24" rx="6" fill="${i < n ? col : '#3a3350'}"/>`).join(''));
    return numbered(ink(build({ name: 'Seguridad y huella digital', palette: 'violet', fonts: 'tech', title: { color: CREAM, size: 50 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(960, -120, 560, VI, BG, 30), glow(-120, 560, 520, BL, BG, 24)], extra: [
        text('COMPETENCIA DIGITAL · CIUDADANÍA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: VI, fontWeight: 700, fontFamily: M }),
        text('Seguridad y<br>huella digital', 84, 198, 760, 220, { fontSize: 82, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('Lo que haces en la red deja rastro. Vamos a cuidarlo.', 90, 460, 700, 90, { fontSize: 30, color: DIM }),
        after(icon('shield-check', 870, 180, 320, VI), 'zoom-in', { duration: 800 })],
        notes: 'Arranque sin miedo: no se trata de asustar, sino de dar control. Tres ideas: contraseñas, engaños y el rastro que dejamos.' },
      { title: 'Una contraseña que aguante', layout: 'titleOnly', bg: BG, extra: [
        on(card('<b style="color:' + RE + '">1234 · tunombre · «contraseña»</b><br><span style="font-size:22px;color:' + DIM + '">corta y obvia: se adivina en segundos</span>', 90, 210, 560, 150, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: RE, pad: [16, 22, 14, 22] }), 'fade-right'),
        along(img(meter(1, RE), 110, 350, 320, 46, 'Medidor casi vacío'), 'fade-right'),
        on(card('<b style="color:' + GR + '">CaballoAzul!73@playa</b><br><span style="font-size:22px;color:' + DIM + '">larga, con palabras raras, números y símbolos</span>', 90, 430, 560, 150, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: GR, pad: [16, 22, 14, 22] }), 'fade-right'),
        along(img(meter(5, GR), 110, 570, 320, 46, 'Medidor lleno'), 'fade-right'),
        on(text('Mejor una <b>frase</b> larga que una palabra corta y rara. Y una distinta para cada sitio importante.', 700, 300, 480, 200, { fontSize: 27, color: CREAM, lineHeight: 1.4 }), 'fade-left')],
        notes: 'Idea moderna: longitud > complejidad imposible de recordar. Una frase con cuatro palabras es fuerte y memorable. Nunca reutilizar la del correo.' },
      { title: 'Huele a engaño: el phishing', layout: 'titleOnly', bg: BG, extra: [
        img(svgURL(560, 300, `<rect width="560" height="300" rx="14" fill="#fff"/><rect width="560" height="56" rx="14" fill="#e5e7eb"/><text x="24" y="37" font-family="sans-serif" font-size="22" fill="#374151">✉ De: seguridad@banc0-online.com</text><text x="24" y="110" font-family="sans-serif" font-size="24" font-weight="700" fill="#111">¡Tu cuenta será bloqueada HOY!</text><text x="24" y="160" font-family="sans-serif" font-size="20" fill="#374151">Haz clic aquí y confirma tu contraseña</text><rect x="24" y="200" width="260" height="56" rx="8" fill="#ef4444"/><text x="154" y="236" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">VERIFICAR AHORA</text>`), 90, 190, 560, 300, 'Un correo falso de phishing'),
        ...[['Prisa y miedo', 'te mete urgencia para que no pienses', RE], ['Dirección rara', 'banc0 con cero, no el dominio real', AM], ['Te pide la contraseña', 'un banco jamás lo hace por correo', VI]].map(([t, d, col], i) =>
          on(text(`<b style="color:${col}">● ${t}</b> — <span style="color:${CREAM}">${d}</span>`, 690, 210 + i * 100, 500, 90, { fontSize: 25, lineHeight: 1.3 }), 'fade-left'))],
        notes: 'El phishing imita a alguien de confianza para robar datos. Tres señales: urgencia, direcciones raras y que pidan contraseñas. Ante la duda, no clicar y entrar a mano.' },
      { title: 'Dos llaves mejor que una', layout: 'twoContent', bg: BG, extra: [
        on(card('<b style="color:' + BL + '">Doble factor (2FA)</b><br><span style="font-size:24px">Además de la contraseña, un código que llega a tu móvil. Aunque roben la primera, no entran.</span>', 90, 230, 525, 230, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: BL, pad: [22, 26, 22, 26] }), 'fade-right'),
        on(card('<b style="color:' + GR + '">Actualiza</b><br><span style="font-size:24px">Las actualizaciones tapan agujeros de seguridad. «Recordármelo mañana» también es una decisión.</span>', 665, 230, 525, 230, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: GR, pad: [22, 26, 22, 26] }), 'fade-left'),
        text('Dos hábitos que frenan casi todos los sustos.', 90, 490, 1100, 50, { fontSize: 25, color: DIM, textAlign: 'center' })],
        notes: 'El 2FA es la medida que más protege con menos esfuerzo. Y actualizar no es manía: cada parche cierra una puerta que alguien ya conoce.' },
      { title: 'Tu huella digital', layout: 'titleOnly', bg: BG, extra: [
        img(svgURL(1100, 200, Array.from({ length: 9 }, (_, i) => { const x = 60 + i * 120, o = 1 - i * 0.1;
          return `<ellipse cx="${x}" cy="130" rx="34" ry="22" fill="${VI}" opacity="${o}"/><ellipse cx="${x + 46}" cy="90" rx="30" ry="20" fill="${BL}" opacity="${o}"/>`; }).join('')), 90, 200, 1100, 200, 'Un rastro de huellas que se aleja'),
        text('Cada «me gusta», foto, comentario y búsqueda deja una <b style="color:' + VI + '">huella</b>. Junta, cuenta mucho de ti… y casi nunca se borra del todo.', 90, 430, 1100, 120, { fontSize: 28, color: CREAM, lineHeight: 1.4, textAlign: 'center' }),
        text('Antes de publicar: ¿me gustaría que lo viera mi familia dentro de diez años?', 90, 570, 1100, 50, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'La huella digital es la suma de todo lo que dejamos. La pregunta de los diez años es el mejor filtro: lo de internet no caduca como creemos.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 580,
        question: 'Un desconocido te escribe por el juego y te pide una foto y tu instituto. ¿Qué haces?',
        options: ['Se la mando, parece majo', 'No contesto y lo bloqueo', 'Le pregunto por qué lo quiere', 'Se lo cuento a un adulto de confianza'] })],
        notes: 'Votación de dilema (sin respuesta «correcta» marcada, para debatir). Las opciones 2 y 4 son las sanas; comentad por qué pedir datos y fotos es una señal de alarma.' },
      { layout: 'blank', bg: '#0e0b16', extra: [quiz('¿Cuál es la señal MÁS clara de un correo de phishing?',
        ['Tiene faltas de ortografía', 'Te pide tu contraseña con urgencia', 'Lleva una imagen', 'Es muy largo'], 1)],
        notes: 'Repaso: pedir la contraseña con urgencia es la bandera roja definitiva. Las faltas ayudan, pero ya no siempre las tienen.' },
      { layout: 'blank', bg: BG, back: [glow(1000, 420, 520, VI, BG, 28)], transition: 'zoom', extra: [
        text('Revisa tus llaves', 84, 130, 820, 90, { fontSize: 60, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('Sin escribir ninguna contraseña real: haz una lista de tus cuentas importantes (correo, juego, redes). ¿Repites contraseña en varias? ¿Tienen doble factor? Diseña una frase-contraseña nueva y fuerte para el correo.', 84, 250, 760, 200, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        timer(420, 900, 210, 300, { color: VI, endText: '¡A reforzarlas en casa!' })],
        notes: 'Siete minutos. Importante: que NO escriban contraseñas reales en clase. El objetivo es el hábito: no repetir y activar el 2FA en el correo, que es la cuenta llave.' },
    ]), CREAM));
  } },

  // ---------------------------------------------------------------------------------------
  // 9 · How an AI learns: a little neural network, rules vs learning from examples, training data,
  // a simple classifier, bias from skewed data, what generative AI does and doesn't, its limits, a
  // real-or-AI poll, a quiz and a discussion.
  edu_tech_ai: { name: '¿Cómo aprende una IA?', cat: 'edu', summary: 'Una red neuronal pequeña: reglas contra aprender de ejemplos, los datos de entrenamiento, un clasificador sencillo, el sesgo de los datos torcidos, qué hace y qué no la IA generativa, sus límites, votación real-o-IA y debate', make: () => {
    const BG = '#0a0f1e', PANEL = '#141b32', CY = '#38bdf8', PI = '#f472b6', GR = '#4ade80', AM = '#fbbf24', VI = '#a78bfa', RE = '#fb7185', DIM = '#8b93ad', CREAM = '#eaf0ff', M = FF.mono, S = FF.space;
    // A small neural network: three layers of circles joined by faint lines.
    const neural = () => { const L = [[3, 170], [4, 110], [2, 230]], X = [120, 300, 480]; const nodes = L.map(([n, top], c) => Array.from({ length: n }, (_, i) => [X[c], top + i * 90]));
      const lines = nodes.slice(0, -1).flatMap((col, c) => col.flatMap(a => nodes[c + 1].map(b => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#2a3557" stroke-width="1.5"/>`))).join('');
      const dots = nodes.flat().map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="20" fill="${[CY, PI, GR][Math.floor(i / 10) % 3] || CY}" opacity="0.9"/>`).join('');
      return svgURL(560, 480, lines + nodes.flat().map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="${PANEL}" stroke="${CY}" stroke-width="3"/>`).join('')); };
    const grid = (rows, mark) => svgURL(520, 360, rows.flatMap((row, r) => [...row].map((c, k) => { const x = 20 + k * 100, y = 20 + r * 80;
      return `<rect x="${x}" y="${y}" width="90" height="70" rx="10" fill="${c === 'c' ? '#1e2a4a' : '#2a1e3a'}" stroke="${mark && c === mark ? AM : '#2a3557'}" stroke-width="${mark && c === mark ? 4 : 2}"/><text x="${x + 45}" y="${y + 46}" font-size="30" text-anchor="middle">${c === 'c' ? '🐱' : '🐶'}</text>`; })).join(''));
    return numbered(ink(build({ name: '¿Cómo aprende una IA?', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 50 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(-150, -120, 560, CY, BG, 36), glow(1000, 520, 560, PI, BG, 32)], extra: [
        text('COMPETENCIA DIGITAL · IA', 90, 150, 600, 36, { fontSize: 22, letterSpacing: 3, color: CY, fontWeight: 700, fontFamily: M }),
        text('¿Cómo aprende<br>una IA?', 84, 198, 720, 220, { fontSize: 84, fontWeight: 800, color: CREAM, lineHeight: 1.03, fontFamily: S }),
        text('No le damos reglas: le damos ejemplos, y ella sola busca el patrón.', 90, 460, 660, 92, { fontSize: 30, color: DIM }),
        after(img(neural(), 780, 150, 420, 460, 'Una red neuronal pequeña'), 'fade-left', { duration: 900 })],
        notes: 'Arranque desmitificador: la IA no «piensa» como nosotros. Aprende de muchísimos ejemplos a encontrar patrones. Hoy vemos cómo, sin tecnicismos.' },
      { title: 'Dos formas de que haga algo', layout: 'titleOnly', bg: BG, extra: [
        on(card('<b style="color:' + AM + '">Con reglas (clásico)</b><br><span style="font-size:24px">Un humano escribe cada paso: «si el correo dice GRATIS, es spam». Claro, pero rígido.</span>', 90, 230, 525, 230, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: AM, pad: [22, 26, 22, 26] }), 'fade-right'),
        on(card('<b style="color:' + CY + '">Aprendiendo (IA)</b><br><span style="font-size:24px">Le enseñas miles de correos marcados «spam / no spam» y ella deduce las señales sola.</span>', 665, 230, 525, 230, PANEL, { color: CREAM, radius: 16, fontSize: 28, borderColor: CY, pad: [22, 26, 22, 26] }), 'fade-left'),
        text('La IA brilla cuando las reglas serían demasiadas para escribirlas a mano.', 90, 490, 1100, 50, { fontSize: 25, color: DIM, textAlign: 'center' })],
        notes: 'La distinción regla vs aprendizaje es la idea central. Reconocer una cara o entender el habla tiene demasiadas reglas: por eso se aprende de ejemplos.' },
      { title: 'Aprender de ejemplos', layout: 'twoContent', bg: BG, extra: [
        img(grid(['cdcd', 'dcdc', 'ccdd'], ''), 90, 200, 520, 340, 'Una rejilla de gatos y perros etiquetados'),
        text('Le mostramos muchísimas fotos ya etiquetadas: <b style="color:' + CY + '">gato</b> o <b style="color:' + PI + '">perro</b>.', 680, 220, 500, 100, { fontSize: 27, color: CREAM, lineHeight: 1.35 }),
        on(text('La IA busca qué tienen en común las de cada grupo: orejas, hocico, bigotes… Nadie se lo dice; lo <b>descubre</b>.', 680, 330, 500, 200, { fontSize: 26, color: CREAM, lineHeight: 1.4 }), 'fade-left')],
        notes: 'Los datos de entrenamiento son fotos con su etiqueta. La IA ajusta su red hasta acertar la mayoría. Idea: aprende de lo que le mostramos, no de la verdad absoluta.' },
      { title: 'Y entonces, clasifica', layout: 'titleOnly', bg: BG, extra: [
        img(svgURL(360, 300, `<rect x="40" y="120" width="130" height="90" rx="12" fill="${PANEL}" stroke="${CY}" stroke-width="3"/><text x="105" y="175" font-size="44" text-anchor="middle">🐱</text><text x="105" y="250" font-family="monospace" font-size="18" fill="${DIM}" text-anchor="middle">foto nueva</text>`), 110, 200, 300, 300, 'Una foto nueva entra al modelo'),
        on(shape('rightarrow', 410, 320, 120, 50, CY), 'fade-right'),
        on(card('<b style="color:' + CY + '">gato: 92%</b><br><span style="font-family:' + M + ';color:' + DIM + ';font-size:22px">perro: 8%</span>', 560, 260, 360, 170, PANEL, { color: CREAM, radius: 14, fontSize: 34, borderColor: CY, pad: [20, 24, 18, 24] }), 'fade-left'),
        text('Ante algo nuevo, no dice «sí/no»: da una probabilidad. «Estoy un 92% segura».', 110, 540, 1000, 60, { fontSize: 25, color: DIM })],
        notes: 'Idea importante: la IA responde con probabilidades, no con certezas. El 92% es confianza, no verdad. Por eso a veces se equivoca con seguridad.' },
      { title: 'Si los datos están torcidos…', layout: 'titleOnly', bg: BG, extra: [
        img(grid(['cccc', 'cccc', 'ccdc'], 'd'), 90, 190, 520, 340, 'Casi solo gatos en los datos'),
        text('Si casi solo le enseñamos <b style="color:' + CY + '">gatos</b>, apenas aprende a ver <b style="color:' + PI + '">perros</b>: fallará con ellos.', 680, 210, 500, 130, { fontSize: 27, color: CREAM, lineHeight: 1.35 }),
        on(card('<b style="color:' + RE + '">Sesgo</b><br><span style="font-size:23px">La IA solo es tan justa como los datos que recibe. Datos torcidos → decisiones torcidas.</span>', 680, 360, 500, 170, PANEL, { color: CREAM, radius: 14, fontSize: 28, borderColor: RE, pad: [18, 24, 16, 24] }), 'fade-left')],
        notes: 'El sesgo es el riesgo ético central. Ejemplos reales: sistemas que fallan con ciertos acentos o rostros porque no estaban en los datos. «Basura entra, basura sale».' },
      { title: 'La IA que crea (generativa)', layout: 'titleOnly', bg: BG, extra: [
        ...[['Qué hace', 'Predice «lo siguiente más probable»: la palabra que sigue, el píxel que sigue. Así escribe y dibuja.', CY], ['Qué NO hace', 'No entiende ni comprueba la verdad. Puede sonar segura y estar equivocada («alucinar»).', RE], ['Tu papel', 'Revisar, contrastar y decidir. La IA propone; tú diriges y respondes.', GR]].map(([t, d, col], i) =>
          on(card(`<b style="color:${col};font-size:30px">${t}</b><br><span style="font-size:24px;color:${CREAM}">${d}</span>`, 110, 220 + i * 140, 1060, 120, PANEL, { color: CREAM, radius: 14, fontSize: 26, borderColor: col, pad: [16, 24, 14, 24] }), 'fade-up'))],
        notes: 'La IA generativa predice lo siguiente; no comprende. De ahí las «alucinaciones». Mensaje clave para el alumnado: es una herramienta potente que hay que supervisar, no un oráculo.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 34, x: 70, y: 80, w: 1140, h: 540,
        question: '¿Esta descripción es de una foto real o generada por IA?', options: ['Real', 'Generada por IA', 'Imposible saberlo a simple vista'] })],
        notes: 'Votación para debatir: cada vez es más difícil distinguir. La opción 3 suele ser la honesta. Buen momento para hablar de fiarse de la fuente, no del aspecto.' },
      { layout: 'blank', bg: '#070b16', extra: [quiz('¿Por qué una IA puede ser injusta con un grupo de personas?',
        ['Porque es malvada', 'Porque sus datos de entrenamiento estaban sesgados', 'Porque va lenta', 'Porque gasta mucha luz'], 1)],
        notes: 'Repaso del sesgo: la causa es humana (los datos), no una «maldad» de la máquina. Distractor típico: antropomorfizarla.' },
      { layout: 'blank', bg: BG, back: [glow(-100, 300, 560, CY, BG, 32)], transition: 'zoom', extra: [
        text('Debate: ¿dónde sí, dónde no?', 84, 120, 980, 90, { fontSize: 52, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('Por grupos: ¿dejaríais decidir a una IA quién entra en un trabajo? ¿Y recomendaros una serie? ¿Y un diagnóstico médico? ¿Qué debería revisar siempre una persona, y por qué?', 84, 240, 760, 200, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        timer(540, 900, 200, 300, { color: CY, endText: '¡Ponemos en común!' })],
        notes: 'Nueve minutos. El debate conecta lo técnico (sesgo, probabilidad) con lo ético (qué decisiones no delegar). No hay respuesta única; se valora el porqué.' },
    ]), CREAM));
  } },

  // ---------------------------------------------------------------------------------------
  // 10 · Build a web page: a browser window, HTML as the structure (a tag tree), a first page in code,
  // CSS as the style (before/after), the box model, the rendered result, responsive on phone and
  // desktop, publishing it, a quiz and sketching your own page.
  edu_tech_web: { name: 'Construye una página web', cat: 'edu', summary: 'Una ventana de navegador: HTML como estructura (árbol de etiquetas), una primera página en código, CSS como estilo (antes/después), el modelo de caja, el resultado, responsive en móvil y escritorio, publicarla, test y actividad', make: () => {
    const PAPER = '#fff8f0', INK = '#2a2320', ORA = '#ea580c', BL = '#2563eb', GR = '#16a34a', PU = '#7c3aed', GREY = '#78716c', CREAM = '#ffffff', M = FF.mono, S = FF.space;
    // A browser window chrome with a URL bar and a slot for content.
    const browser = (inner, url = 'mi-pagina.html') => svgURL(620, 400, `<rect width="620" height="400" rx="16" fill="#fff" stroke="#e7e0d6" stroke-width="2"/><rect width="620" height="56" rx="16" fill="#f1ece4"/><circle cx="28" cy="28" r="7" fill="#ff5f57"/><circle cx="52" cy="28" r="7" fill="#febc2e"/><circle cx="76" cy="28" r="7" fill="#28c840"/><rect x="110" y="14" width="440" height="28" rx="14" fill="#fff" stroke="#e7e0d6"/><text x="128" y="34" font-family="monospace" font-size="16" fill="#78716c">${url}</text>` + inner);
    return numbered(ink(build({ name: 'Construye una página web', palette: 'warm', fonts: 'modern', title: { color: INK, size: 50 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, ORA, PAPER, 20), glow(-120, 560, 520, BL, PAPER, 16)], extra: [
        text('TECNOLOGÍA · LA WEB POR DENTRO', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: ORA, fontWeight: 700 }),
        text('Construye una<br>página web', 84, 198, 720, 220, { fontSize: 86, fontWeight: 800, color: INK, lineHeight: 1.03, fontFamily: S }),
        text('Una web son dos cosas: el esqueleto (HTML) y la ropa (CSS).', 90, 452, 640, 80, { fontSize: 30, color: GREY }),
        after(img(browser(`<text x="40" y="150" font-family="'Poppins',sans-serif" font-size="40" font-weight="800" fill="${INK}">¡Hola!</text><text x="40" y="200" font-family="sans-serif" font-size="22" fill="${GREY}">Mi primera página.</text><rect x="40" y="240" width="180" height="54" rx="10" fill="${ORA}"/><text x="130" y="275" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">Entrar</text>`), 760, 170, 440, 290, 'Una página web en el navegador'), 'fade-left', { duration: 900 })],
        notes: 'Arranque: toda web que visitan está hecha con lo mismo que vamos a tocar hoy. Dos capas: HTML (qué hay) y CSS (qué aspecto tiene).' },
      { title: 'HTML: el esqueleto', layout: 'twoContent', bg: PAPER, extra: [
        img(svgURL(520, 380, `<rect x="180" y="20" width="160" height="48" rx="8" fill="${BL}"/><text x="260" y="52" font-family="monospace" font-size="20" fill="#fff" text-anchor="middle">body</text>` + [['header', 90], ['main', 260], ['footer', 430]].map(([t, x], i) => `<line x1="260" y1="68" x2="${x + 80}" y2="120" stroke="#cbb9a6" stroke-width="2"/><rect x="${x}" y="120" width="160" height="46" rx="8" fill="${ORA}"/><text x="${x + 80}" y="150" font-family="monospace" font-size="18" fill="#fff" text-anchor="middle">${t}</text>`).join('') + [['h1', 200], ['p', 320]].map(([t, x], i) => `<line x1="340" y1="166" x2="${x + 50}" y2="230" stroke="#cbb9a6" stroke-width="2"/><rect x="${x}" y="230" width="100" height="42" rx="8" fill="${GR}"/><text x="${x + 50}" y="258" font-family="monospace" font-size="18" fill="#fff" text-anchor="middle">${t}</text>`).join('')), 90, 180, 520, 380, 'Un árbol de etiquetas HTML'),
        text('El HTML marca <b>qué es cada cosa</b> con etiquetas que se anidan como cajas dentro de cajas:', 680, 210, 500, 120, { fontSize: 26, color: INK, lineHeight: 1.35 }),
        on(text('<span style="font-family:' + M + ';font-size:22px;color:' + GR + '">&lt;h1&gt;</span> un título<br><span style="font-family:' + M + ';font-size:22px;color:' + GR + '">&lt;p&gt;</span> un párrafo<br><span style="font-family:' + M + ';font-size:22px;color:' + ORA + '">&lt;header&gt;</span> la cabecera', 680, 340, 500, 200, { fontSize: 26, color: INK, lineHeight: 1.6 }), 'fade-left')],
        notes: 'El árbol de etiquetas muestra el anidamiento: header, main y footer dentro de body; h1 y p dentro. Cada etiqueta dice QUÉ es el contenido, no cómo se ve.' },
      { title: 'Tu primera página', layout: 'titleOnly', bg: PAPER, extra: [
        codeBlock({ x: 110, y: 190, w: 620, h: 320, lang: 'html', fontSize: 22, code: '<h1>Mi página</h1>\n<p>Hola, soy Ada.</p>\n<img src="gato.jpg">\n<a href="otra.html">Ir a otra página</a>' }),
        on(img(browser(`<text x="36" y="130" font-family="sans-serif" font-size="34" font-weight="800" fill="${INK}">Mi página</text><text x="36" y="180" font-family="sans-serif" font-size="22" fill="${GREY}">Hola, soy Ada.</text><rect x="36" y="210" width="150" height="110" rx="8" fill="#e7e0d6"/><text x="111" y="272" font-size="40" text-anchor="middle">🐱</text><text x="36" y="360" font-family="sans-serif" font-size="20" fill="${BL}" text-decoration="underline">Ir a otra página</text>`, 'mi-pagina.html'), 760, 190, 430, 300, 'La página mostrada en el navegador'), 'fade-left', { duration: 700 })],
        notes: 'Cada etiqueta del código se ve a la derecha: h1→título grande, p→texto, img→imagen, a→enlace. Hacedles cambiar el texto y recargar: es inmediato y engancha.' },
      { title: 'CSS: ponerle estilo', layout: 'twoContent', bg: PAPER, extra: [
        img(browser(`<text x="36" y="130" font-family="sans-serif" font-size="30" font-weight="800" fill="#111">Mi página</text><text x="36" y="175" font-family="sans-serif" font-size="20" fill="#555">Hola, soy Ada.</text>`, 'sin CSS'), 90, 200, 500, 320, 'La página sin estilo'),
        on(img(browser(`<rect width="620" height="400" rx="16" fill="${PU}"/><rect width="620" height="56" rx="16" fill="#f1ece4"/><circle cx="28" cy="28" r="7" fill="#ff5f57"/><text x="40" y="160" font-family="'Poppins',sans-serif" font-size="40" font-weight="800" fill="#fff">Mi página</text><text x="40" y="215" font-family="sans-serif" font-size="24" fill="#f0e9ff">Hola, soy Ada.</text><rect x="40" y="250" width="170" height="56" rx="28" fill="#fde047"/><text x="125" y="286" font-family="sans-serif" font-size="22" fill="#422006" text-anchor="middle">Saludar</text>`, 'con CSS'), 650, 200, 500, 320, 'La misma página con estilo'), 'fade-left', { duration: 700 })],
        notes: 'Mismo HTML, distinto CSS: colores, tipos de letra, botones redondeados. El CSS es la ropa; el HTML, el cuerpo. Por eso una web puede cambiar de aspecto sin tocar el contenido.' },
      { title: 'Todo es una caja', layout: 'titleOnly', bg: PAPER, extra: [
        img(svgURL(420, 380, `<rect x="20" y="20" width="380" height="340" fill="#fde68a"/><text x="30" y="46" font-family="monospace" font-size="18" fill="#92400e">margen</text><rect x="70" y="70" width="280" height="240" fill="#fed7aa"/><text x="80" y="96" font-family="monospace" font-size="18" fill="#9a3412">borde + relleno</text><rect x="120" y="120" width="180" height="140" fill="${ORA}"/><text x="210" y="198" font-family="monospace" font-size="20" fill="#fff" text-anchor="middle">contenido</text>`), 100, 190, 420, 380, 'El modelo de caja de CSS'),
        text('Cada elemento es una <b style="color:' + ORA + '">caja</b> con capas:', 600, 210, 560, 60, { fontSize: 28, color: INK }),
        ...[['Contenido', 'el texto o la imagen'], ['Relleno', 'aire por dentro del borde'], ['Borde', 'la línea que la rodea'], ['Margen', 'la distancia a las vecinas']].map(([t, d], i) =>
          on(text(`<b>${t}</b> — <span style="color:${GREY}">${d}</span>`, 600, 290 + i * 72, 580, 60, { fontSize: 26 }), 'fade-left'))],
        notes: 'El modelo de caja explica por qué las cosas se separan o se pegan. Contenido, relleno, borde y margen, de dentro afuera. Es el concepto que más cuesta y más se usa.' },
      { title: 'Que se vea bien en cualquier pantalla', layout: 'twoContent', bg: PAPER, extra: [
        img(browser(`<rect x="40" y="90" width="540" height="60" rx="8" fill="${ORA}" opacity=".85"/><rect x="40" y="170" width="260" height="180" rx="8" fill="#e7e0d6"/><rect x="320" y="170" width="260" height="180" rx="8" fill="#e7e0d6"/>`, 'escritorio'), 90, 210, 500, 320, 'La web en una pantalla ancha'),
        on(img(svgURL(260, 380, `<rect x="30" y="20" width="200" height="340" rx="24" fill="#fff" stroke="#e7e0d6" stroke-width="3"/><rect x="50" y="60" width="160" height="40" rx="6" fill="${ORA}" opacity=".85"/><rect x="50" y="120" width="160" height="100" rx="6" fill="#e7e0d6"/><rect x="50" y="235" width="160" height="100" rx="6" fill="#e7e0d6"/>`), 760, 190, 240, 360, 'La misma web apilada en el móvil'), 'fade-left')],
        notes: 'Responsive: la misma página se reorganiza según el ancho. En el móvil, las dos columnas se apilan. Hoy más de la mitad de las visitas son desde el móvil: no es opcional.' },
      { layout: 'blank', bg: '#f4ece2', extra: [quiz('¿Qué lenguaje decide los COLORES y el aspecto de una web?',
        ['HTML', 'CSS', 'Python', 'El navegador'], 1)],
        notes: 'Repaso de la pareja: HTML = estructura, CSS = estilo (colores, tipos, tamaños). Distractor: Python (no es de la página en el navegador).' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, ORA, PAPER, 20)], transition: 'zoom', extra: [
        text('Diseña tu página', 84, 130, 820, 90, { fontSize: 62, fontWeight: 800, color: INK, fontFamily: S }),
        text('En papel, dibuja la página de tu grupo de música, equipo o afición: ¿qué va en la cabecera? ¿un título, una imagen, una lista, un botón? Marca con un rectángulo cada caja y escribe su etiqueta (h1, p, img…).', 84, 250, 740, 200, { fontSize: 28, color: GREY, lineHeight: 1.4 }),
        timer(480, 900, 210, 300, { color: ORA, endText: '¡A maquetarla!' })],
        notes: 'Ocho minutos. Dibujar la página como cajas etiquetadas es el puente al código. Quien quiera, luego la escribe en un editor en línea y la ve de verdad.' },
    ]), INK));
  } },

};
