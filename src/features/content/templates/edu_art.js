// Example presentations: Educación artística y musical. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Every deck has its own topic and its own look: a painter's table with
// gouache, a gilt-framed canvas, a drafting board, a Bauhaus poster, a night gallery of marbles, a music
// notebook, a flamenco tablao, a cabinet of instruments, an oscilloscope and a Venetian baroque salon.
// (Artists and works: only from the public domain; the pictures are our own drawings. The sounds are
// made here, as WAV data: notes, claps and rhythms with no files from elsewhere.)

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
// A polygon of our own (points in a 0–100 box stretched to the object).
const poly = (pts, x, y, w, h, fill, props = {}) => shape('custom', x, y, w, h, fill, { path: 'M' + pts.map(p => p.join(' ')).join(' L') + ' Z', ...props });
// A polygon by points of the slide.
const polyAt = (pts, fill, props = {}) => {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), x = Math.min(...xs), y = Math.min(...ys), w = Math.max(2, Math.max(...xs) - x), h = Math.max(2, Math.max(...ys) - y);
  return poly(pts.map(([a, b]) => [+((a - x) / w * 100).toFixed(2), +((b - y) / h * 100).toFixed(2)]), Math.round(x), Math.round(y), Math.round(w), Math.round(h), fill, props);
};
// Straight strokes through points of the slide (a shape of our own, so «Dibujar» traces it); closed: back to the start.
const lines = (pts, color, width = 4, closed = false, props = {}) => {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), x = Math.min(...xs), y = Math.min(...ys), w = Math.max(2, Math.max(...xs) - x), h = Math.max(2, Math.max(...ys) - y);
  const d = 'M' + pts.map(([a, b]) => `${+((a - x) / w * 100).toFixed(2)} ${+((b - y) / h * 100).toFixed(2)}`).join(' L') + (closed ? ' Z' : '');
  return shape('custom', Math.round(x), Math.round(y), Math.round(w), Math.round(h), 'none', { path: d, stroke: color, strokeWidth: width, ...props });
};
// A soft blob of paint (a shape of our own, in a 0–100 box).
const blobPath = (seed, n = 40) => 'M' + Array.from({ length: n }, (_, i) => { const t = i / n * 2 * Math.PI;
  const r = 46 * (0.84 + 0.09 * Math.sin(3 * t + seed) + 0.05 * Math.sin(5 * t + 2 * seed) + 0.03 * Math.sin(7 * t + 3 * seed));
  return `${(50 + r * Math.cos(t)).toFixed(1)} ${(50 + r * Math.sin(t)).toFixed(1)}`; }).join(' L') + ' Z';
const blob = (seed, x, y, w, h, fill, props = {}) => shape('custom', x, y, w, h, fill, { path: blobPath(seed), ...props });
// Repeatable chance (the same drawing every time).
const rng = (s = 1) => () => (s = (s * 16807) % 2147483647) / 2147483647;
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 40, x: 70, y: 50, w: 1140, h: 620, ...props });
// Fonts of our own (Google fonts loaded on demand, as in the editor's list).
const FF = { caveat: "'Caveat', cursive", bebas: "'Bebas Neue', sans-serif", mono: "'JetBrains Mono', monospace", courier: "'Courier New', Courier, monospace",
  space: "'Space Grotesk', sans-serif", playfair: "'Playfair Display', serif", cormorant: "'Cormorant Garamond', serif", abril: "'Abril Fatface', serif",
  josefin: "'Josefin Sans', sans-serif", merri: "'Merriweather', serif", lora: "'Lora', serif", ptserif: "'PT Serif', serif", quick: "'Quicksand', sans-serif" };
// The deck's text colour (tables, activities and diagrams take it), when it isn't the palette's.
const ink = (deck, color) => Object.assign(deck, { textColor: color });
// The credit line of the CC BY models used in a deck (small, on its last slide).
const credits = (ids, x, y, w, color) => text('Modelo 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 12, color });

// ---- Sounds of our own -------------------------------------------------------------
// A WAV (8 bits, mono) as a data URL, from a list of notes [hertz (0: silence), seconds, volume, timbre].
// Timbres: sine, square, saw, tri, organ (three harmonics), pluck (a string: bright and fading),
// noise (a clap or a drum) and thud (a low drum).
const RATE = 11025;
const wav = (notes, { wave = 'sine', decay = 2.5 } = {}) => {
  const out = [], rnd = rng(7);
  for (const [f, d, v = 0.6, w = wave] of notes) {
    const n = Math.round(d * RATE);
    for (let i = 0; i < n; i++) {
      const t = i / RATE, ph = (f * t) % 1, sin = k => Math.sin(2 * Math.PI * ph * k);
      let s = 0;
      if (w === 'square') s = (ph < 0.5 ? 1 : -1) * 0.45;
      else if (w === 'saw') s = (2 * ph - 1) * 0.55;
      else if (w === 'tri') s = 1 - 4 * Math.abs(ph - 0.5);
      else if (w === 'organ') s = (sin(1) + 0.5 * sin(2) + 0.3 * sin(3)) / 1.6;
      else if (w === 'pluck') s = (sin(1) + 0.6 * Math.exp(-6 * t) * sin(2) + 0.4 * Math.exp(-9 * t) * sin(3)) / 1.6;
      else if (w === 'noise') s = rnd() * 2 - 1;
      else if (w === 'thud') s = Math.sin(2 * Math.PI * (f * t - 18 * t * t)) * 1.1;
      else s = sin(1);
      const fall = w === 'noise' ? Math.exp(-28 * t) : w === 'thud' ? Math.exp(-9 * t) : Math.exp(-decay * t);
      const env = f > 0 || w === 'noise' ? Math.min(1, t / 0.006) * fall * Math.min(1, Math.max(0, (d - t) / 0.015)) : 0;
      out.push(Math.max(0, Math.min(255, Math.round(128 + 127 * v * s * env))));
    }
  }
  const hd = [], u32 = x => hd.push(x & 255, (x >> 8) & 255, (x >> 16) & 255, (x >>> 24) & 255), u16 = x => hd.push(x & 255, (x >> 8) & 255),
    str = s => [...s].forEach(c => hd.push(c.charCodeAt(0)));
  str('RIFF'); u32(36 + out.length); str('WAVE'); str('fmt '); u32(16); u16(1); u16(1); u32(RATE); u32(RATE); u16(1); u16(8); str('data'); u32(out.length);
  let bin = '';
  for (const b of hd.concat(out)) bin += String.fromCharCode(b);
  return 'data:audio/wav;base64,' + btoa(bin);
};
// A note's frequency by its name (La4 = A4 = 440 Hz): 'C4', 'F#5', 'Bb3'…
const hz = name => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(name); if (!m) return 0;
  const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  return 440 * 2 ** ((k - 69) / 12); };
// A melody: 'E4:1 G4:0.5 -:1' (name:beats; '-' a rest) at a tempo.
const tune = (s, bpm = 100, wave = 'organ', v = 0.55) => s.trim().split(/\s+/).map(tok => { const [n, b = '1'] = tok.split(':'), d = +b * 60 / bpm;
  return [n === '-' ? 0 : hz(n), d, v, wave]; });
// A sound on an animation.
const snd = src => ({ sound: 'custom', soundSrc: src });
// A sound player on the slide.
const player = (src, x, y, w, alt, props = {}) => ({ ...base(x, y, w, 56), type: 'audio', src, alt, ...props });

export default {

  // ---------------------------------------------------------------------------------------
  // 1 · Colour theory on a painter's table: warm watercolour paper, blobs of gouache, a colour
  // wheel that spins in, primaries that mix with Transform, light against pigment, opposites.
  edu_art_color: { name: 'El círculo cromático', cat: 'edu', summary: 'Mesa de pintor: círculo que entra girando, primarios que se mezclan con Transformar, luz y pigmento, tarta de votos, tabla y concurso', make: () => {
    const PAPER = '#fbf7ef', INK = '#2d2a32', GREY = '#6f6a75', H = FF.caveat;
    const RYB = [['Amarillo', '#f6d10e'], ['Amarillo anaranjado', '#f8b416'], ['Naranja', '#f28c1b'], ['Rojo anaranjado', '#ec5a24'], ['Rojo', '#e2312d'], ['Rojo violáceo', '#b8285f'],
      ['Violeta', '#7b3fa0'], ['Azul violáceo', '#4b3fa6'], ['Azul', '#2459c9'], ['Azul verdoso', '#1f8fa8'], ['Verde', '#3aa655'], ['Verde amarillento', '#9cc43a']];
    const [Y, O, R, V, B, G] = [RYB[0][1], RYB[2][1], RYB[4][1], RYB[6][1], RYB[8][1], RYB[10][1]];
    // The wheel: twelve sectors of a ring (yellow on top) and the three primaries in the middle; or empty, to paint.
    const wheel = (empty = false) => { const c = 260, R1 = 250, R2 = 150, pt = (r, a) => `${(c + r * Math.cos(a)).toFixed(1)} ${(c + r * Math.sin(a)).toFixed(1)}`;
      return svgURL(520, 520, RYB.map(([, col], i) => { const a0 = (-105 + i * 30) * Math.PI / 180, a1 = a0 + Math.PI / 6;
        return `<path d="M${pt(R1, a0)} A${R1} ${R1} 0 0 1 ${pt(R1, a1)} L${pt(R2, a1)} A${R2} ${R2} 0 0 0 ${pt(R2, a0)} Z" fill="${empty ? '#ffffff' : col}" stroke="${empty ? INK : PAPER}" stroke-width="${empty ? 3 : 5}"/>`; }).join('')
        + (empty ? `<circle cx="${c}" cy="${c}" r="120" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="8 8"/>`
          : [[Y, -90], [R, 30], [B, 150]].map(([col, a]) => `<circle cx="${(c + 55 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(c + 55 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="52" fill="${col}"/>`).join(''))); };
    // Light (adds up to white) and pigment (adds up to dark): three discs blended in the drawing itself.
    const discs = (cols, mode, ground) => svgURL(300, 290, `<rect width="300" height="290" fill="${ground}"/>` + [[150, 105], [105, 185], [195, 185]].map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="80" fill="${cols[i]}" style="mix-blend-mode:${mode}"/>`).join(''));
    const paint = () => [blob(1, -120, -110, 330, 300, Y, { opacity: 85 }), blob(4, 1110, 560, 260, 240, B, { opacity: 80 }), blob(2, 1180, -60, 150, 140, R, { opacity: 70 }),
      shape('ellipse', 1150, 120, 22, 22, R, { opacity: 70 }), shape('ellipse', 180, 160, 16, 16, Y), shape('ellipse', 1080, 600, 18, 18, B, { opacity: 70 })];
    const ids = { y: uid(), r: uid(), b: uid() };
    const hand = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.1, ...p });
    // (Opposite sectors joined across the wheel: the wheel at 100, 190, 440 wide; mid-ring radius.)
    const across = i => { const cx = 320, cy = 410, r = 169, a = (-90 + i * 30) * Math.PI / 180;
      return [[cx + r * Math.cos(a), cy + r * Math.sin(a)], [cx - r * Math.cos(a), cy - r * Math.sin(a)]]; };
    return numbered(ink(build({ name: 'El círculo cromático', palette: 'revela', fonts: 'friendly', title: { color: INK, size: 50 }, body: { color: INK }, decor: () => [] }, [
      { layout: 'blank', bg: PAPER, back: paint(), extra: [
        text('EDUCACIÓN PLÁSTICA · 1.º DE ESO', 90, 170, 560, 36, { fontSize: 22, letterSpacing: 4, color: R, fontWeight: 700 }),
        text('El círculo<br>cromático', 84, 212, 600, 230, { fontSize: 94, fontWeight: 800, color: INK, lineHeight: 1.02 }),
        text('Mezclar, combinar y elegir colores con intención', 90, 455, 520, 90, { fontSize: 30, color: GREY }),
        hand('con tres tubos basta →', 90, 572, 420, 56, 40, B),
        after(img(wheel(), 700, 100, 500, 500, 'Círculo cromático de doce colores'), 'spin', { duration: 1300, sound: 'whoosh' })],
        notes: 'Al llegar, el círculo entra girando. Pregunta de arranque: ¿cuántos colores necesita un pintor para pintar cualquier cosa? La respuesta (tres) es el hilo de toda la sesión.' },
      { title: 'Los colores primarios', layout: 'titleOnly', bg: PAPER, back: paint().slice(0, 2), extra: [
        ...[[ids.y, Y, 'amarillo', 140], [ids.r, R, 'rojo', 500], [ids.b, B, 'azul', 860]].flatMap(([id, col, n, x], i) => [
          on(keep(blob(i + 2, x, 200, 280, 260, col), id), 'zoom-in', { sound: 'pop' }),
          along(hand(n, x, 470, 280, 70, 54, INK, { textAlign: 'center' }), 'fade-up')]),
        text('No salen de mezclar otros colores: con ellos se fabrican todos los demás.', 100, 580, 1080, 60, { fontSize: 27, color: GREY, textAlign: 'center' })],
        notes: 'Tres clics, tres manchas. En el aula usamos los primarios tradicionales (amarillo, rojo y azul). En imprenta se usan cian, magenta y amarillo: lo vemos dos diapositivas más adelante.' },
      { title: 'Mezclas: los secundarios', layout: 'titleOnly', bg: PAPER, autoAnimate: true, transition: 'fade', extra: [
        keep(blob(2, 420, 170, 160, 150, Y), ids.y), keep(blob(3, 190, 470, 160, 150, R), ids.r), keep(blob(4, 650, 470, 160, 150, B), ids.b),
        ...[[O, 320, 335, 'Amarillo + rojo', 'naranja'], [G, 550, 335, 'Amarillo + azul', 'verde'], [V, 435, 485, 'Rojo + azul', 'violeta']].flatMap(([col, x, y, mix, n], i) => [
          on(blob(i + 6, x, y, 130, 120, col), 'zoom-in', { sound: 'pop' }),
          along(card(`<b>${mix}</b><br><span style="font-family:${H};font-size:44px;color:${{ [O]: '#b45309', [G]: '#2b7d40' }[col] || col}">= ${n}</span>`, 870, 190 + i * 150, 340, 130, '#ffffff',
            { color: INK, fontSize: 26, radius: 14, borderColor: col, pad: [14, 20, 10, 20] }), 'fade-left')]),
        hand('Más cantidad de un color → la mezcla se parece más a él', 120, 640, 760, 50, 32, GREY)],
        notes: 'Transformar: las tres manchas viajan a los vértices de un triángulo. Cada clic hace aparecer un secundario entre sus dos «padres», con su receta a la derecha.' },
      { title: 'Luz y pigmento: dos maneras de mezclar', layout: 'titleOnly', bg: PAPER, extra: [
        on(shape('rounded', 90, 180, 530, 470, '#111216', { radius: 18 }), 'fade-right'),
        along(text('Color luz · síntesis aditiva', 120, 200, 470, 40, { fontSize: 26, fontWeight: 700, color: '#ffffff' }), 'fade-right'),
        along(img(discs(['#ff2a2a', '#2aff4a', '#3a5bff'], 'screen', '#111216'), 205, 250, 300, 290, 'Tres luces, roja, verde y azul, que se suman en blanco'), 'fade-right'),
        along(text('Rojo + verde + azul = <b>blanco</b>. Así funcionan las pantallas.', 120, 560, 470, 70, { fontSize: 23, color: '#e8e6ee' }), 'fade-right'),
        on(shape('rounded', 660, 180, 530, 470, '#ffffff', { radius: 18, stroke: '#d9d2c4', strokeWidth: 2 }), 'fade-left'),
        along(text('Color pigmento · síntesis sustractiva', 690, 200, 470, 40, { fontSize: 26, fontWeight: 700, color: INK }), 'fade-left'),
        along(img(discs(['#00b7eb', '#ff1f8f', '#ffe600'], 'multiply', '#ffffff'), 775, 250, 300, 290, 'Tres tintas, cian, magenta y amarillo, que se restan hacia el negro'), 'fade-left'),
        along(text('Cian + magenta + amarillo ≈ <b>negro</b>. Así imprime una impresora.', 690, 560, 470, 70, { fontSize: 23, color: INK }), 'fade-left')],
        notes: 'Dos clics. La luz suma: cuantas más luces, más claro. La pintura resta: cada pigmento se «come» parte de la luz. Por eso los primarios de una pantalla y los de una impresora son distintos.' },
      { title: 'Cálidos y fríos', layout: 'titleOnly', bg: PAPER, extra: [
        text('Color favorito de 1.º B · 26 votos', 70, 170, 560, 36, { fontSize: 22, color: GREY, textAlign: 'center', fontWeight: 700 }),
        chartBlock({ x: 70, y: 210, w: 560, h: 450, chartType: 'pie',
          data: [['Azul', 8, B], ['Verde', 5, G], ['Violeta', 4, V], ['Rojo', 4, R], ['Naranja', 3, O], ['Amarillo', 2, Y]].map(([label, value, color]) => ({ label, value, color })) }),
        on(shape('rounded', 680, 180, 520, 140, R, { fill2: O, gradAngle: 0, radius: 16 }), 'fade-left'),
        along(text('<b>Cálidos</b> · rojos, naranjas, amarillos. Parecen acercarse: energía, calor.', 705, 195, 470, 110, { fontSize: 25, color: '#ffffff', vAlign: 'middle' }), 'fade-left'),
        on(shape('rounded', 680, 345, 520, 140, B, { fill2: '#1f8fa8', gradAngle: 0, radius: 16 }), 'fade-left'),
        along(text('<b>Fríos</b> · azules, verdes, violetas. Parecen alejarse: calma, distancia.', 705, 360, 470, 110, { fontSize: 25, color: '#ffffff', vAlign: 'middle' }), 'fade-left'),
        on(text(`<span style="font-size:64px;font-weight:800;color:${B}">17 de 26</span><br>eligieron un color frío`, 680, 510, 520, 140, { fontSize: 26, color: INK, textAlign: 'center' }), 'zoom-in', { sound: 'chime' })],
        notes: 'La tarta es una encuesta inventada de una clase (cada porción lleva el color que representa). Preguntar: ¿por qué casi nadie elige el amarillo? En los paisajes, lo cálido avanza y lo frío se aleja: así se pinta la profundidad.' },
      { title: 'Complementarios: opuestos que vibran', layout: 'titleOnly', bg: PAPER, extra: [
        img(wheel(), 100, 190, 440, 440, 'Círculo cromático'),
        ...[[0, Y, V, 'Amarillo y violeta', 'El contraste más luminoso'], [4, R, G, 'Rojo y verde', 'Semáforos, acebo… y Van Gogh'], [8, B, O, 'Azul y naranja', 'El cielo al atardecer']].flatMap(([i, c1, c2, n, d], k) => [
          on(lines(across(i), INK, 5), 'draw', { duration: 700, sound: 'click' }),
          along(shape('rounded', 640, 190 + k * 140, 100, 100, c1, { radius: 14 }), 'fade-left'), along(shape('rounded', 750, 190 + k * 140, 100, 100, c2, { radius: 14 }), 'fade-left'),
          along(text(`<b>${n}</b><br>${d}`, 880, 190 + k * 140, 330, 100, { fontSize: 23, color: INK, vAlign: 'middle' }), 'fade-left')]),
        hand('Van Gogh, «El café de noche» (1888): rojo y verde para las «terribles pasiones humanas».', 640, 615, 580, 70, 26, GREY)],
        notes: 'Un clic por pareja: la línea cruza el círculo y une los opuestos. La cita es de una carta de Vincent van Gogh a su hermano Theo (1888), de dominio público.' },
      { title: 'Cuatro armonías para elegir colores', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 80, y: 180, w: 1120, h: 430, fontSize: 24, header: true, headBg: INK, headFg: PAPER, stroke: '#d9d2c4', banded: true, band: '#efe7d6', colW: [3, 3, 5, 4],
          rows: [['Armonía', 'Muestra', 'Cómo se elige', 'Sensación'],
            ['Monocromática', `<span style="font-size:34px;letter-spacing:2px"><span style="color:#13306e">■</span><span style="color:${B}">■</span><span style="color:#7d9de6">■</span></span>`, 'Un solo color, más claro y más oscuro', 'Calma, elegancia'],
            ['Análoga', `<span style="font-size:34px;letter-spacing:2px"><span style="color:${Y}">■</span><span style="color:#9cc43a">■</span><span style="color:${G}">■</span></span>`, 'Vecinos en el círculo', 'Armonía natural'],
            ['Complementaria', `<span style="font-size:34px;letter-spacing:2px"><span style="color:${B}">■</span><span style="color:${O}">■</span></span>`, 'Opuestos en el círculo', 'Contraste, energía'],
            ['Tríada', `<span style="font-size:34px;letter-spacing:2px"><span style="color:${R}">■</span><span style="color:${Y}">■</span><span style="color:${B}">■</span></span>`, 'Tres a la misma distancia', 'Variedad equilibrada']] }),
        hand('Truco: un color manda, otro acompaña y un tercero, poquito, da la nota.', 80, 625, 1120, 50, 32, GREY, { textAlign: 'center' })],
        notes: 'Repasar cada fila señalando el círculo de la diapositiva anterior. Proponer buscar en el aula objetos con cada armonía: carteles, mochilas, portadas.' },
      { layout: 'blank', bg: PAPER, extra: [quiz('¿Cuál es el complementario del azul?', ['Naranja', 'Verde', 'Violeta', 'Rojo'], 0)],
        notes: 'Concurso desde el móvil. El azul está enfrente del naranja; quien diga verde o violeta ha elegido un vecino (armonía análoga).' },
      { layout: 'blank', bg: PAPER, back: paint().slice(0, 3), transition: 'zoom', extra: [
        hand('Tu reto', 90, 120, 500, 80, 72, R),
        text('Un círculo de doce colores, con solo tres tubos', 90, 205, 600, 110, { fontSize: 40, fontWeight: 800, color: INK, lineHeight: 1.15 }),
        text(ul('Pinta los primarios en las casillas 1, 5 y 9', 'Mezcla a partes iguales para los secundarios', 'Completa los terciarios: primario + secundario vecino'), 90, 340, 600, 220, { fontSize: 26, color: INK }),
        timer(1500, 90, 570, 280, { style: 'digital', h: 90, color: R, endText: '¡Pinceles al agua!' }),
        img(wheel(true), 770, 150, 420, 420, 'Plantilla vacía del círculo de doce colores'),
        // (Turned half a turn: the curved text starts at the bottom, and AMARILLO goes over the yellow box, at the top.)
        text('AMARILLO · NARANJA · ROJO · VIOLETA · AZUL · VERDE · ', 740, 120, 480, 480, { fontSize: 22, curve: 100, color: GREY, letterSpacing: 3, textAlign: 'center', fontWeight: 700, rotation: 180 }),
        // The boxes' numbers (1 on top, clockwise), so the steps can say «1, 5 y 9».
        ...Array.from({ length: 12 }, (_, i) => { const a = (-90 + i * 30) * Math.PI / 180, x = 980 + 161.5 * Math.cos(a), y = 360 + 161.5 * Math.sin(a);
          return text(String(i + 1), Math.round(x - 20), Math.round(y - 15), 40, 30, { fontSize: 20, fontWeight: 700, color: GREY, textAlign: 'center' }); })],
        notes: 'Plantilla para imprimir o copiar a mano, con el nombre de los colores en texto curvo alrededor. Cuenta atrás de 25 minutos. Materiales: témpera o gouache amarilla, roja y azul, un pincel y un vaso de agua.' },
    ]), INK));
  } },

  // ---------------------------------------------------------------------------------------
  // 2 · Impressionism as a museum room: a gilt frame with a pond painted in dabs, the 1874
  // exhibition, the same field in two lights with Transform, optical mixing that «walks away».
  edu_art_impressionism: { name: 'Impresionismo: pintar la luz', cat: 'edu', summary: 'Sala de museo: estanque pintado a toques en marco dorado, columnas, tarjetas una a una, dos luces con Transformar y emparejar', make: () => {
    const WALL = '#efe6d2', INK = '#2f2a24', GOLD = '#b88a3e', DIM = '#6e6355', PLUM = '#7d5a8c', P = FF.playfair, C = FF.cormorant;
    // A painting in dabs: water, lily pads with flowers, the willow's reflection (our own, «in the manner of»).
    const pond = (w = 580, h = 430) => { const r = rng(11), d = [];
      const dab = (x, y, rx, ry, c, o = 0.85, rot = 0) => d.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${c}" opacity="${o}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
      for (let i = 0; i < 900; i++) dab(r() * w, r() * h, 9 + r() * 12, 2.5 + r() * 2.5, ['#5b8fa8', '#7fb0c8', '#9fb7d9', '#a99bcf', '#6f9a8b', '#cfe0e8', '#4f7f8f'][Math.floor(r() * 7)], 0.8, -8 + r() * 16);
      for (let i = 0; i < 160; i++) dab(r() * w, r() * h * 0.45, 2 + r() * 2, 14 + r() * 16, ['#557a46', '#6f9a5b', '#3f6a4a'][Math.floor(r() * 3)], 0.55, -10 + r() * 20);
      for (let k = 0; k < 9; k++) { const cx = 40 + r() * (w - 80), cy = h * 0.4 + r() * h * 0.55, s = 0.6 + r() * 0.7;
        for (let i = 0; i < 22; i++) dab(cx + (r() - 0.5) * 70 * s, cy + (r() - 0.5) * 26 * s, 7 + r() * 6, 3 + r() * 3, ['#6f9a5b', '#86ad5f', '#4d7a43', '#a3c46e'][Math.floor(r() * 4)], 0.9, r() * 30 - 15);
        for (let i = 0; i < 4; i++) dab(cx + (r() - 0.5) * 30 * s, cy + (r() - 0.5) * 10 * s, 4 + r() * 3, 3 + r() * 2, ['#f3b6c4', '#ffffff', '#e8899f'][Math.floor(r() * 3)], 0.95); }
      return svgURL(w, h, d.join(''), '#6f9fb6'); };
    // A field in the light of one hour (shapes, so that Transform carries them over).
    const S = { sky: uid(), sun: uid(), field: uid(), h1: uid(), h2: uid(), s1: uid(), s2: uid() };
    const TEX = rng(29);
    const STACK = [[0, 100], [4, 60], [18, 38], [40, 16], [50, 0], [60, 16], [82, 38], [96, 60], [100, 100]];
    const scene = (sky1, sky2, sunX, sunC, field, hay, shadow, sh1, sh2) => [
      keep(shape('rect', 80, 170, 720, 310, sky1, { fill2: sky2, gradAngle: 180 }), S.sky),
      keep(shape('ellipse', sunX, 215, 90, 90, sunC, { fill2: sky2, gradType: 'radial', opacity: 90 }), S.sun),
      keep(shape('rect', 80, 480, 720, 170, field, { fill2: shadow, gradAngle: 180 }), S.field),
      keep(shape('ellipse', ...sh1, shadow, { opacity: 70 }), S.s1), keep(shape('ellipse', ...sh2, shadow, { opacity: 70 }), S.s2),
      keep(poly(STACK, 230, 330, 200, 190, hay, { stroke: '#00000022', strokeWidth: 2 }), S.h1), keep(poly(STACK, 490, 385, 130, 125, hay, { stroke: '#00000022', strokeWidth: 2 }), S.h2),
      img(svgURL(720, 480, Array.from({ length: 420 }, (_, i, __, r = TEX) => {
        return `<ellipse cx="${(r() * 720).toFixed(0)}" cy="${(r() * 480).toFixed(0)}" rx="${(6 + r() * 8).toFixed(0)}" ry="2.5" fill="#ffffff" opacity="${(0.08 + r() * 0.12).toFixed(2)}" transform="rotate(${(-20 + r() * 40).toFixed(0)} ${(r() * 720).toFixed(0)} ${(r() * 480).toFixed(0)})"/>`; }).join('')),
        80, 170, 720, 480, 'Textura de pinceladas', { fit: 'fill', decorative: true }),
      shape('rect', 80, 170, 720, 480, 'none', { stroke: GOLD, strokeWidth: 10 })];
    const MIXR = rng(41);
    const label = (t, x, y, w, h) => card(t, x, y, w, h, '#fbf7ec', { color: INK, fontSize: 17, radius: 2, pad: [10, 14, 10, 14], shadow: { x: 0, y: 2, blur: 6, color: '#00000022' } });
    return numbered(build({ name: 'Impresionismo: pintar la luz', palette: 'paper', fonts: 'classic', title: { color: INK, size: 50 }, body: { color: INK },
      decor: () => [shape('rect', 0, 690, 1280, 30, '#d9cbb0')] }, [
      { layout: 'blank', bg: WALL, back: [glow(560, -300, 900, '#fff8e6', WALL, 80)], transition: 'fade', extra: [
        text('HISTORIA DEL ARTE · 4.º DE ESO', 80, 190, 460, 36, { fontSize: 20, letterSpacing: 4, color: PLUM, fontWeight: 700 }),
        text('Impresionismo', 74, 236, 500, 100, { fontFamily: P, fontSize: 62, fontStyle: 'italic', color: INK }),
        text('Pintar la luz, no las cosas', 80, 345, 480, 60, { fontFamily: C, fontSize: 40, color: DIM, fontStyle: 'italic' }),
        text('Francia · 1874 – 1886', 80, 430, 400, 40, { fontSize: 24, color: '#8a6424', fontWeight: 700, letterSpacing: 2 }),
        shape('rect', 588, 58, 624, 474, GOLD, { fill2: '#6e5020', gradType: 'radial', shadow: { x: 0, y: 14, blur: 30, color: '#00000040' } }),
        shape('rect', 606, 76, 588, 438, '#e8d9a8'),
        after(img(pond(), 612, 82, 576, 426, 'Estanque con nenúfares pintado a toques de color'), 'fade-in', { duration: 1600 }),
        label('<b>Nenúfares al amanecer</b><br><i>Ejercicio a la manera impresionista</i> · óleo sobre lienzo', 760, 560, 300, 80)],
        notes: 'Portada de sala de museo: un cuadro hecho solo con toques de color (es un dibujo propio, generado). Pedir que lo miren de cerca y después desde el fondo de la clase: ¿qué cambia?' },
      { title: 'París, 1874: un nombre que era una burla', layout: 'titleOnly', bg: WALL, extra: [
        text('Un grupo de pintores rechazados por el Salón oficial decide exponer por su cuenta, en el antiguo estudio del fotógrafo Nadar.', 80, 180, 520, 170, { fontSize: 25, color: INK, lineHeight: 1.4 }),
        on(text('Un crítico se burla de un cuadro de Claude Monet, <i>Impresión, sol naciente</i>, y los llama «impresionistas». Ellos adoptan el nombre.', 80, 360, 520, 170, { fontSize: 25, color: INK, lineHeight: 1.4 }), 'fade-up'),
        on(text(`<span style="font-family:${P};font-size:60px;color:${PLUM}">8</span> exposiciones en 12 años`, 80, 560, 520, 90, { fontSize: 26, color: DIM }), 'fade-up'),
        text('Artistas en cada exposición', 640, 180, 570, 36, { fontSize: 22, color: DIM, textAlign: 'center', fontWeight: 700 }),
        chartBlock({ x: 640, y: 220, w: 570, h: 440, chartType: 'bar', color: GOLD, dataLabels: true, grid: true, yTitle: 'artistas',
          data: [['1874', 30], ['1876', 19], ['1877', 18], ['1879', 16], ['1880', 18], ['1881', 13], ['1882', 9], ['1886', 17]].map(([label, value]) => ({ label, value })) })],
        notes: 'El crítico era Louis Leroy, en la revista Le Charivari. Cifras de participantes aproximadas: varían según la fuente porque algunos expusieron fuera de catálogo.' },
      { title: 'Cinco claves de la técnica', layout: 'titleOnly', bg: WALL, extra: [
        dg('cards', 'Al aire libre\n  Tubos de pintura y caballete plegable\nPincelada suelta\n  Toques cortos que se ven\nColor puro\n  Poco mezclado en la paleta\nSombras de color\n  Violetas y azules, nunca negro\nLa hora cuenta\n  Pintar deprisa, antes de que cambie',
          80, 190, 1120, 430, { oneByOne: true }),
        text('El tubo de pintura plegable se inventó en 1841: por fin se podía pintar fuera del taller.', 80, 640, 1120, 40, { fontSize: 20, color: DIM, textAlign: 'center', fontStyle: 'italic' })],
        notes: 'El diagrama aparece tarjeta a tarjeta. Insistir en las sombras: mirad la sombra de un árbol al atardecer, no es gris, es violeta.' },
      { title: 'El mismo campo, otra luz', layout: 'titleOnly', bg: WALL, extra: [
        ...scene('#b9d6ea', '#f3efd8', 130, '#fff6c8', '#c9b56a', '#e2b75b', '#7d93c9', [330, 495, 300, 40], [585, 492, 180, 28]),
        text('MAÑANA · 9:00', 850, 190, 360, 34, { fontSize: 20, letterSpacing: 4, color: '#4d7aa8', fontWeight: 700 }),
        text('Luz fría, sombras azules', 850, 230, 360, 110, { fontFamily: P, fontSize: 40, color: INK, lineHeight: 1.15 }),
        text('Monet pintó una serie de más de veinte almiares (1890 – 1891) cerca de su casa de Giverny: el motivo no cambia; cambia la luz.', 850, 360, 360, 200, { fontSize: 23, color: DIM, lineHeight: 1.4 })],
        notes: 'Escena dibujada con formas de Revela. En la siguiente diapositiva Transformar mueve el sol y cambia los colores: es la misma escena diez horas después.' },
      { title: 'El mismo campo, otra luz', layout: 'titleOnly', bg: WALL, autoAnimate: true, transition: 'fade', transitionSpeed: 'slow', extra: [
        ...scene('#e98a5b', '#f6c58f', 650, '#ff7b39', '#b5794a', '#d9663b', '#6c4a8f', [110, 500, 220, 36], [400, 494, 120, 26]),
        text('ATARDECER · 19:00', 850, 190, 360, 34, { fontSize: 20, letterSpacing: 4, color: '#c0532b', fontWeight: 700 }),
        text('Luz cálida, sombras violetas', 850, 230, 360, 110, { fontFamily: P, fontSize: 40, color: INK, lineHeight: 1.15 }),
        text('Las sombras se alargan hacia el lado contrario y se tiñen del color complementario de la luz.', 850, 360, 360, 200, { fontSize: 23, color: DIM, lineHeight: 1.4 })],
        notes: 'Transformar: el sol cruza el cielo, las sombras giran y los colores se calientan. Pregunta: ¿por qué la sombra es violeta? Porque la luz es naranja y su complementario es el violeta.' },
      { title: 'Mezcla óptica: la mezcla la hace tu ojo', layout: 'titleOnly', bg: WALL, extra: [
        shape('rect', 110, 200, 300, 300, '#7fa650'),
        text('Mezclado en la paleta', 110, 515, 300, 40, { fontSize: 22, color: DIM, textAlign: 'center' }),
        on(img(svgURL(300, 300, Array.from({ length: 1400 }, (_, i, __, r = MIXR) => { const x = (r() * 300).toFixed(0), y = (r() * 300).toFixed(0);
          return `<ellipse cx="${x}" cy="${y}" rx="${(7 + r() * 5).toFixed(0)}" ry="${(3 + r() * 2).toFixed(0)}" fill="${i % 2 ? '#f2d33a' : '#2f63b8'}" transform="rotate(${(r() * 60 - 30).toFixed(0)} ${x} ${y})"/>`; }).join(''), '#6f9a4a'),
          520, 200, 300, 300, 'Toques de amarillo y azul uno al lado del otro'), 'shrink', { duration: 1400 }),
        text('Toques yuxtapuestos', 520, 515, 300, 40, { fontSize: 22, color: DIM, textAlign: 'center' }),
        text('Amarillo y azul, sin mezclar, uno junto al otro. De lejos, el ojo ve un verde que vibra más.', 880, 200, 330, 200, { fontSize: 25, color: INK, lineHeight: 1.4 }),
        on(text('Georges Seurat llevó la idea al extremo con puntos: el <b>puntillismo</b>.', 880, 420, 330, 130, { fontSize: 23, color: PLUM, lineHeight: 1.4 }), 'fade-up')],
        notes: 'Clic: el cuadro de toques «se aleja» (se encoge) y el verde aparece solo. Mejor aún: alejarse físicamente de la pantalla. Seurat (1859 – 1891) es ya postimpresionista.' },
      { title: 'Quién es quién', layout: 'titleOnly', bg: WALL, extra: [
        tableBlock({ x: 80, y: 180, w: 1120, h: 450, fontSize: 21, header: true, headBg: PLUM, headFg: '#ffffff', stroke: '#cdbf9f', banded: true, band: '#e6dbc3', colW: [4, 2, 5, 4],
          rows: [['Pintor o pintora', 'Vida', 'Una obra', 'Le interesaba'],
            ['Claude Monet', '1840 – 1926', '<i>Impresión, sol naciente</i> (1872)', 'La luz sobre el agua'],
            ['Pierre-Auguste Renoir', '1841 – 1919', '<i>Baile en el Moulin de la Galette</i> (1876)', 'La gente feliz al sol'],
            ['Edgar Degas', '1834 – 1917', '<i>La clase de danza</i> (1874)', 'El movimiento'],
            ['Berthe Morisot', '1841 – 1895', '<i>La cuna</i> (1872)', 'La vida íntima'],
            ['Camille Pissarro', '1830 – 1903', '<i>Bulevar Montmartre de noche</i> (1897)', 'La ciudad y el campo']] })],
        notes: 'Cinco artistas, todos de dominio público. Berthe Morisot expuso en siete de las ocho exposiciones. Degas prefería llamarse «realista» y pintaba más en el taller que al aire libre.' },
      { layout: 'blank', bg: WALL, extra: [pollBlock({ kind: 'match', question: 'Une cada artista con su cuadro', fontSize: 30, x: 80, y: 60, w: 1120, h: 600,
        options: ['Monet = Impresión, sol naciente', 'Renoir = Baile en el Moulin de la Galette', 'Degas = La clase de danza', 'Morisot = La cuna'] })],
        notes: 'Actividad de relacionar desde el móvil: se corrige sola. Pista: la del sol naciente dio nombre al movimiento.' },
      { layout: 'blank', bg: WALL, back: [glow(-200, 300, 800, '#fff8e6', WALL, 80)], transition: 'fade', extra: [
        text('Tu serie impresionista', 80, 120, 1120, 80, { fontFamily: P, fontSize: 60, fontStyle: 'italic', color: INK }),
        text('Pinta la misma ventana tres veces: por la mañana, a mediodía y al atardecer. Cinco colores y blanco. Sin negro.', 80, 210, 1000, 90, { fontSize: 27, color: DIM }),
        ...[['Mañana', '#b9d6ea', '#f3efd8', '#7d93c9'], ['Mediodía', '#7fb8e8', '#fdf7da', '#5f7fa8'], ['Atardecer', '#e98a5b', '#f6c58f', '#6c4a8f']].flatMap(([n, a, b, sh], i) => [
          on(shape('rect', 80 + i * 380, 330, 350, 260, a, { fill2: b, gradAngle: 180, stroke: GOLD, strokeWidth: 8 }), 'fade-up'),
          along(shape('ellipse', 100 + i * 380 + [40, 160, 250][i], [380, 350, 420][i], 54, 54, ['#fff6c8', '#ffffff', '#ff7b39'][i], { opacity: 90 }), 'fade-up'),
          along(shape('rect', 80 + i * 380, 480, 350, 110, sh, { opacity: 45 }), 'fade-up'),
          along(shape('rect', 251 + i * 380, 334, 8, 252, '#f3ead6'), 'fade-up'), along(shape('rect', 84 + i * 380, 455, 342, 8, '#f3ead6'), 'fade-up'),
          along(text(n, 80 + i * 380, 605, 350, 40, { fontFamily: C, fontSize: 32, color: INK, textAlign: 'center', fontStyle: 'italic' }), 'fade-up')])],
        notes: 'Tres clics: tres lienzos con la luz de cada hora. Para casa: hacer una foto desde el mismo sitio a las tres horas y traerlas para comparar los colores de las sombras.' },
    ]));
  } },
  // ---------------------------------------------------------------------------------------
  // 3 · Perspective on a drawing board: blue-squared paper, graphite and red construction lines
  // that draw themselves, a cube step by step, a vanishing point that splits in two with Transform.
  edu_art_perspective: { name: 'La perspectiva cónica', cat: 'edu', summary: 'Tablero de dibujo: habitación que se traza sola, cubo paso a paso, punto de fuga que se desdobla con Transformar, silla 3D y etiquetar', make: () => {
    const PAPER = '#f2f1ec', GRA = '#34363a', RED = '#d1443b', BLUE = '#2f6db5', DIM = '#66686c', M = FF.courier;
    const GRID = svgURL(1280, 720, Array.from({ length: 33 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="720" stroke="#7d9cbc" stroke-opacity="${i % 5 ? 0.12 : 0.26}"/>`).join('')
      + Array.from({ length: 19 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="1280" y2="${i * 40}" stroke="#7d9cbc" stroke-opacity="${i % 5 ? 0.12 : 0.26}"/>`).join(''));
    const draw = (b, start = 'click', p = {}) => withAnims(b, A('draw', { start, duration: 600, ...p }));
    const lerp = ([x1, y1], [x2, y2], t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    const cross = ([a, b], [c, d]) => { const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]), t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; };
    const dot = (x, y, c = RED, d = 16) => shape('ellipse', x - d / 2, y - d / 2, d, d, c);
    const tag = (t, x, y, c = RED, p = {}) => text(t, x, y, 90, 32, { fontFamily: M, fontSize: 22, fontWeight: 700, color: c, ...p });
    const H = uid(), V = uid();
    // The cover: a room in one-point perspective.
    const VP = [920, 330], OC = [[600, 80], [1220, 80], [1220, 660], [600, 660]], BW = OC.map(c => lerp(c, VP, 0.68));
    const floor = [700, 820, 1020, 1120].map(x => [[x, 660], lerp([x, 660], VP, 0.68)]);
    const across = [0.22, 0.42, 0.56].map(t => [lerp(OC[3], VP, t), lerp(OC[2], VP, t)]);
    const wallL = (s, f) => { const top = lerp(OC[0], VP, s), bot = lerp(OC[3], VP, s); return lerp(top, bot, f); };
    const wallR = (s, f) => { const top = lerp(OC[1], VP, s), bot = lerp(OC[2], VP, s); return lerp(top, bot, f); };
    // The railway (slide 2 and the activity): horizon, rails, sleepers and poles.
    const RV = [420, 340], ts = Array.from({ length: 9 }, (_, k) => 1 - 0.76 ** k);
    const rails = [[230, 640], [610, 640]].map(p => [p, lerp(p, RV, 0.93)]);
    const sleepers = ts.map(t => { const l = lerp([230, 640], RV, t), r = lerp([610, 640], RV, t), e = (1 - t) * 34; return [[l[0] - e, l[1]], [r[0] + e, r[1]]]; });
    const poles = ts.slice(0, 7).map(t => { const b = lerp([700, 640], RV, t); return [b, [b[0], b[1] - (1 - t) * 250]]; });
    const railSVG = svgURL(760, 560, `<rect width="760" height="560" fill="${PAPER}"/><line x1="0" y1="${RV[1] - 100}" x2="760" y2="${RV[1] - 100}" stroke="${RED}" stroke-width="3" stroke-dasharray="12 8"/>`
      + `<line x1="0" y1="540" x2="760" y2="540" stroke="${BLUE}" stroke-width="3"/>`
      + [...rails, ...sleepers, ...poles].map(([a, b]) => `<line x1="${(a[0] - 40).toFixed(1)}" y1="${(a[1] - 100).toFixed(1)}" x2="${(b[0] - 40).toFixed(1)}" y2="${(b[1] - 100).toFixed(1)}" stroke="${GRA}" stroke-width="3"/>`).join('')
      + `<circle cx="${RV[0] - 40}" cy="${RV[1] - 100}" r="7" fill="${RED}"/>`);
    // A small box in perspective (for the cards and the three horizons): a front square and its depth to the vanishing point.
    const boxSVG = (w, h, fx, fy, s, vp, hy, opt = {}) => { const F = [[fx, fy], [fx + s, fy], [fx + s, fy + s], [fx, fy + s]], Bk = F.map(c => lerp(c, vp, opt.t ?? 0.35));
      const L = (a, b, c = GRA, sw = 2.5, d = '') => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="${sw}"${d ? ` stroke-dasharray="${d}"` : ''}/>`;
      const Pg = (pts, c) => `<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${c}"/>`;
      const faces = (vp[1] < fy ? Pg([F[0], F[1], Bk[1], Bk[0]], '#cfd8e3') : vp[1] > fy + s ? Pg([F[3], F[2], Bk[2], Bk[3]], '#aab8c8') : '') + (vp[0] > fx + s ? Pg([F[1], Bk[1], Bk[2], F[2]], '#9fb0c4') : '');
      return svgURL(w, h, `<rect width="${w}" height="${h}" fill="#ffffff"/>${L([0, hy], [w, hy], RED, 2, '8 6')}`
        + F.map(c => L(c, vp, BLUE, 1.2, '5 5')).join('') + faces + Pg(F, '#e6ebf1')
        + [0, 1, 2, 3].map(i => L(F[i], F[(i + 1) % 4]) + L(F[i], Bk[i]) + L(Bk[i], Bk[(i + 1) % 4])).join('') + `<circle cx="${vp[0]}" cy="${vp[1]}" r="5" fill="${RED}"/>`); };
    // A cube with one vanishing point (slide 3).
    const C1 = [[140, 400], [360, 400], [360, 620], [140, 620]], VP1 = [600, 250], C1b = C1.map(c => lerp(c, VP1, 0.35));
    // A box with two (slide 4).
    const VL = [110, 250], VR = [1170, 250], T = [640, 340], Bt = [640, 600], LT = lerp(T, VL, 0.3), LB = lerp(Bt, VL, 0.3), RT = lerp(T, VR, 0.25), RB = lerp(Bt, VR, 0.25), BK = cross([LT, VR], [RT, VL]);
    const step = (n, t, x, y, w = 460) => [shape('ellipse', x, y, 48, 48, RED), text(String(n), x, y + 6, 48, 36, { fontSize: 24, fontWeight: 800, color: '#ffffff', textAlign: 'center' }),
      text(t, x + 66, y - 2, w - 66, 90, { fontSize: 23, color: GRA, lineHeight: 1.35 })];
    const stepT = i => step(i + 1, ['Dibuja la cara de delante: un cuadrado de verdad.', 'Une cada esquina con el punto de fuga.', 'Corta las fugas con la cara de atrás, paralela a la de delante.', 'Borra lo que no se ve y sombrea las caras.'][i], 760, 200 + i * 112)
      .map(b => withAnims(b, A('fade-left', { start: 'withPrev' })));
    const cube1 = [draw(lines([...C1, C1[0]], GRA, 4), 'click', { duration: 900 })], st1 = stepT(0);
    const cube2 = C1.map((c, i) => withAnims(lines([c, VP1], BLUE, 2, false, { dash: 'dash' }), A('wipe', { dir: 'left', start: i ? 'withPrev' : 'click', duration: 800 }))), st2 = stepT(1);
    const cube3 = [draw(lines([C1b[0], C1b[1], C1b[2]], GRA, 4), 'click', { duration: 900 }), withAnims(lines([C1b[0], C1b[3], C1b[2]], GRA, 1.5, false, { dash: 'dash' }), A('fade-in', { start: 'withPrev', duration: 900 }))], st3 = stepT(2);
    const cube4 = [on(polyAt([C1[0], C1[1], C1b[1], C1b[0]], '#cfd8e3'), 'fade-in'), along(polyAt([C1[1], C1b[1], C1b[2], C1[2]], '#9fb0c4'), 'fade-in'), along(polyAt(C1, '#e6ebf1'), 'fade-in')], st4 = stepT(3);
    const box1 = [draw(lines([T, Bt], GRA, 5), 'click', { duration: 700 })];
    const box2 = [T, Bt].flatMap((p, k) => [VL, VR].map((v, j) => withAnims(lines([p, v], BLUE, 2, false, { dash: 'dash' }), A('fade-in', { start: k || j ? 'withPrev' : 'click', duration: 900 }))));
    const box3 = [draw(lines([LT, LB], GRA, 4)), withAnims(lines([RT, RB], GRA, 4), A('draw', { start: 'withPrev', duration: 600 })),
      withAnims(lines([LT, VR], BLUE, 1.5, false, { dash: 'dash' }), A('fade-in', { start: 'afterPrev', duration: 700 })), withAnims(lines([RT, VL], BLUE, 1.5, false, { dash: 'dash' }), A('fade-in', { start: 'withPrev', duration: 700 }))];
    const box4 = [on(polyAt([T, LT, LB, Bt], '#aab8c8'), 'fade-in'), along(polyAt([T, RT, RB, Bt], '#d5dde7'), 'fade-in'), along(polyAt([T, LT, BK, RT], '#eef2f6'), 'fade-in'),
      along(lines([LT, T, RT, BK, LT], GRA, 4, true), 'fade-in'), along(lines([LT, LB, Bt, RB, RT], GRA, 4), 'fade-in')];
    return numbered(ink(build({ name: 'La perspectiva cónica', palette: 'grayscale', fonts: 'clean', title: { color: GRA, size: 48 }, body: { color: GRA },
      decor: () => [img(GRID, 0, 0, 1280, 720, 'Papel cuadriculado', { fit: 'fill' })] }, [
      { layout: 'blank', bg: PAPER, extra: [
        text('DIBUJO TÉCNICO · 2.º DE ESO', 80, 200, 480, 36, { fontFamily: M, fontSize: 22, fontWeight: 700, color: RED, letterSpacing: 2 }),
        text('La perspectiva cónica', 76, 240, 500, 150, { fontSize: 60, fontWeight: 800, color: GRA, lineHeight: 1.05 }),
        text('Cómo dibujar la profundidad con una regla y un punto', 80, 420, 470, 90, { fontSize: 28, color: DIM }),
        after(lines([...OC, OC[0]], GRA, 3), 'draw', { duration: 700 }),
        after(lines([[600, VP[1]], [1220, VP[1]]], RED, 2, false, { dash: 'dash' }), 'wipe', { dir: 'left', duration: 600 }),
        after(dot(...VP), 'zoom-in', { duration: 300, sound: 'click' }), along(tag('PF', VP[0] + 12, VP[1] - 40), 'fade-in'), along(tag('LH', 612, VP[1] - 36), 'fade-in'),
        after(lines([...BW, BW[0]], GRA, 3), 'draw', { duration: 600 }),
        ...OC.map((c, i) => withAnims(lines([c, BW[i]], GRA, 3), A('draw', { start: i ? 'withPrev' : 'afterPrev', duration: 600 }))),
        ...floor.map((f, i) => withAnims(lines(f, GRA, 2), A('draw', { start: i ? 'withPrev' : 'afterPrev', duration: 500 }))),
        ...across.map((f, i) => withAnims(lines(f, GRA, 2), A('draw', { start: i ? 'withPrev' : 'afterPrev', duration: 500 }))),
        after(lines([wallL(0.15, 0.28), wallL(0.42, 0.28), wallL(0.42, 0.62), wallL(0.15, 0.62)], BLUE, 3, true), 'draw', { duration: 600 }),
        after(lines([wallR(0.12, 1), wallR(0.12, 0.38), wallR(0.34, 0.38), wallR(0.34, 1)], BLUE, 3), 'draw', { duration: 600 })],
        notes: 'La habitación se dibuja sola, trazo a trazo: marco, línea de horizonte, punto de fuga, pared del fondo, aristas, suelo, ventana y puerta. Todas las líneas que se alejan van al mismo punto.' },
      { title: 'Tres palabras para empezar', layout: 'titleOnly', bg: PAPER, extra: [
        ...rails.map(r => lines(r, GRA, 4)), ...sleepers.map(s => lines(s, GRA, 3)), ...poles.map(p => lines(p, GRA, 3)),
        on(lines([[80, RV[1]], [760, RV[1]]], RED, 3, false, { dash: 'dash' }), 'wipe', { dir: 'left', duration: 700 }), along(tag('LH', 84, RV[1] - 38), 'fade-in'),
        along(card('<b>LH · Línea de horizonte</b><br>Está siempre a la altura de tus ojos.', 800, 190, 410, 130, '#ffffff', { color: GRA, fontSize: 23, borderColor: RED, radius: 10, pad: [14, 18, 14, 18] }), 'fade-left'),
        on(dot(...RV, RED, 18), 'zoom-in', { sound: 'click' }), along(tag('PF', RV[0] + 14, RV[1] - 42), 'fade-in'),
        ...poles.map((p, i) => withAnims(lines([p[1], RV], BLUE, 1.5, false, { dash: 'dash' }), A('fade-in', { start: 'withPrev', duration: 900 }))),
        along(card('<b>PF · Punto de fuga</b><br>Donde parecen juntarse las paralelas que se alejan.', 800, 340, 410, 130, '#ffffff', { color: GRA, fontSize: 23, borderColor: RED, radius: 10, pad: [14, 18, 14, 18] }), 'fade-left'),
        on(lines([[80, 640], [760, 640]], BLUE, 3), 'draw', { duration: 700 }), along(tag('LT', 84, 600, BLUE), 'fade-in'),
        along(card('<b>LT · Línea de tierra</b><br>Donde el suelo toca el plano del dibujo.', 800, 490, 410, 130, '#ffffff', { color: GRA, fontSize: 23, borderColor: BLUE, radius: 10, pad: [14, 18, 14, 18] }), 'fade-left')],
        notes: 'Tres clics: horizonte, punto de fuga (con las líneas de los postes, que también van a él) y línea de tierra. Los raíles son paralelos en la realidad, pero en el dibujo se juntan en el horizonte.' },
      { title: 'Un cubo con un punto de fuga', layout: 'titleOnly', bg: PAPER, extra: [
        keep(lines([[80, VP1[1]], [700, VP1[1]]], RED, 2, false, { dash: 'dash' }), H), keep(dot(...VP1), V), tag('PF', VP1[0] - 20, VP1[1] - 44),
        ...cube4, ...cube1, ...cube2, ...cube3, ...st1, ...st2, ...st3, ...st4],
        notes: 'Cuatro clics, cuatro pasos (el texto de cada paso aparece con su trazo). La cara de delante no se deforma: está paralela al cuadro. Lo de atrás siempre es más pequeño.' },
      { title: 'Dos puntos de fuga', layout: 'titleOnly', bg: PAPER, autoAnimate: true, transition: 'fade', extra: [
        keep(lines([[80, VL[1]], [1200, VL[1]]], RED, 2, false, { dash: 'dash' }), H), keep(dot(...VL), V), dot(...VR), tag('PF 1', VL[0] - 20, VL[1] - 44), tag('PF 2', VR[0] - 40, VR[1] - 44),
        ...box4, ...box1, ...box2, ...box3,
        text('Las aristas verticales siguen verticales; las demás huyen hacia dos puntos. Es como ver un edificio desde la esquina.', 140, 630, 1000, 60, { fontSize: 23, color: DIM, textAlign: 'center' })],
        notes: 'Transformar: el horizonte se alarga y el punto de fuga se desplaza a la izquierda; aparece un segundo. Clics: arista de delante, fugas, aristas laterales y caja terminada.' },
      { title: 'Florencia, hacia 1415: el experimento', layout: 'titleOnly', bg: PAPER, extra: [
        img(svgURL(640, 420, `<rect width="640" height="420" fill="#ffffff"/><line x1="0" y1="360" x2="640" y2="360" stroke="${GRA}" stroke-width="2"/>`
          + `<circle cx="40" cy="214" r="26" fill="none" stroke="${GRA}" stroke-width="3"/><circle cx="54" cy="210" r="4" fill="${GRA}"/>`
          + `<rect x="86" y="140" width="12" height="150" fill="#8a6a45"/><circle cx="92" cy="210" r="3" fill="#ffffff"/>`
          + `<rect x="296" y="160" width="10" height="110" fill="#9cc7e6" stroke="${BLUE}" stroke-width="2"/><line x1="301" y1="270" x2="301" y2="330" stroke="${GRA}" stroke-width="3"/>`
          + `<line x1="54" y1="210" x2="296" y2="212" stroke="${RED}" stroke-width="2.5" stroke-dasharray="8 6"/>`
          + `<polygon points="440,170 600,170 600,360 440,360" fill="#efe9dc" stroke="${GRA}" stroke-width="3"/><polygon points="430,170 520,105 610,170" fill="#e2dccd" stroke="${GRA}" stroke-width="3"/>`
          + `<rect x="508" y="80" width="24" height="28" fill="#efe9dc" stroke="${GRA}" stroke-width="3"/><rect x="495" y="270" width="50" height="90" fill="#cfc5ae" stroke="${GRA}" stroke-width="2"/>`
          + `<line x1="440" y1="170" x2="98" y2="208" stroke="${BLUE}" stroke-width="1.5" stroke-dasharray="4 5"/><line x1="440" y1="360" x2="98" y2="212" stroke="${BLUE}" stroke-width="1.5" stroke-dasharray="4 5"/>`
          ),
          80, 190, 640, 420, 'Esquema del experimento: un ojo mira por el agujero de una tabla pintada hacia un espejo, frente al baptisterio'),
        // (The drawing's labels as text boxes, so they are translated.)
        ...[['ojo', 120, 448], ['tabla pintada', 172, 496], ['espejo', 381, 528], ['baptisterio', 600, 572]].map(([t, cx, y]) => text(t, cx - 80, y, 160, 26, { fontFamily: M, fontSize: 16, color: GRA, textAlign: 'center' })),
        text('Filippo Brunelleschi pinta el baptisterio de Florencia en una tabla con un agujerito. Se mira por detrás, a través de un espejo: la pintura encaja con el edificio real.', 760, 190, 440, 230, { fontSize: 24, color: GRA, lineHeight: 1.4 }),
        on(card('Hacia 1427, Masaccio pinta <i>La Trinidad</i>: la primera bóveda pintada que parece un hueco de verdad en la pared.', 760, 440, 440, 170, '#ffffff', { color: GRA, fontSize: 22, borderColor: BLUE, radius: 10, pad: [16, 18, 16, 18] }), 'fade-up')],
        notes: 'El experimento lo cuenta su biógrafo Antonio Manetti. Es el nacimiento de la perspectiva lineal del Renacimiento. Masaccio (1401 – 1428) y Brunelleschi (1377 – 1446) son de dominio público.' },
      { title: 'Gira la silla', layout: 'titleOnly', bg: PAPER, extra: [
        shape('ellipse', 140, 560, 400, 70, '#d9dde3', { opacity: 80 }),
        model('kh-SheenChair', 80, 160, 520, 480, { autoRotate: true, view: 'three', caption: '' }),
        ...[['Un punto de fuga', 'De frente: la cara de delante se ve sin deformar.', boxSVG(180, 130, 40, 45, 55, [150, 25], 25)],
          ['Dos puntos de fuga', 'De esquina: ninguna cara está de frente.', svgURL(180, 130, `<rect width="180" height="130" fill="#ffffff"/><line x1="0" y1="28" x2="180" y2="28" stroke="${RED}" stroke-width="2" stroke-dasharray="8 6"/>`
            + `<polygon points="90,50 50,40 50,92 90,112" fill="#aab8c8"/><polygon points="90,50 135,41 135,94 90,112" fill="#d5dde7"/><polygon points="90,50 50,40 95,33 135,41" fill="#eef2f6"/>`
            + `<path d="M90 50 L50 40 L50 92 L90 112 L135 94 L135 41 Z M90 50 V112 M50 40 L95 33 L135 41" fill="none" stroke="${GRA}" stroke-width="2.5"/>`)],
          ['Tres puntos de fuga', 'Desde muy arriba o muy abajo: las verticales también se juntan.', svgURL(180, 130, `<rect width="180" height="130" fill="#ffffff"/><line x1="0" y1="20" x2="180" y2="20" stroke="${RED}" stroke-width="2" stroke-dasharray="8 6"/>`
            + `<polygon points="90,46 45,36 58,92 90,112" fill="#aab8c8"/><polygon points="90,46 138,37 124,94 90,112" fill="#d5dde7"/><polygon points="90,46 45,36 93,28 138,37" fill="#eef2f6"/>`
            + `<path d="M90 46 L45 36 L58 92 L90 112 L124 94 L138 37 Z M90 46 V112 M45 36 L93 28 L138 37" fill="none" stroke="${GRA}" stroke-width="2.5"/>`)]].flatMap(([h, t, src], i) => [
          on(shape('rounded', 640, 180 + i * 160, 560, 140, '#ffffff', { radius: 12, stroke: '#cfd5dc', strokeWidth: 2 }), 'fade-left'),
          along(img(src, 655, 185 + i * 160, 180, 130, h), 'fade-left'),
          along(text(`<b>${h}</b><br>${t}`, 855, 192 + i * 160, 330, 116, { fontSize: 22, color: GRA, vAlign: 'middle' }), 'fade-left')])],
        notes: 'La silla 3D gira sola: al verla de frente basta un punto de fuga; de esquina, dos. Se puede arrastrar con el ratón al presentar. Un clic por cada tipo de perspectiva.' },
      { title: '¿Dónde pongo el horizonte?', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Vista de pájaro', 'Horizonte alto: ves la tapa', 40], ['A la altura de los ojos', 'Ni tapa ni base', 150], ['Vista de gusano', 'Horizonte bajo: ves la base', 270]].flatMap(([h, t, hy], i) => [
          on(img(boxSVG(340, 300, 110, 110, 100, [270, hy], hy, { t: 0.32 }), 80 + i * 380, 190, 340, 300, h, { stroke: '#cfd5dc' }), 'fade-up'),
          along(text(`<b>${h}</b><br><span style="color:${DIM}">${t}</span>`, 80 + i * 380, 505, 340, 90, { fontSize: 24, color: GRA, textAlign: 'center' }), 'fade-up')]),
        text('El horizonte decide el punto de vista: el mismo objeto cuenta historias distintas.', 80, 615, 1120, 50, { fontSize: 23, color: DIM, textAlign: 'center' })],
        notes: 'Tres clics, tres alturas de horizonte para la misma caja. En el cine, la vista de gusano hace que un personaje parezca poderoso; la de pájaro, pequeño.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'label', question: 'Pon nombre a cada parte del dibujo', fontSize: 28, x: 70, y: 50, w: 1140, h: 620, image: railSVG,
        options: ['Línea de horizonte', 'Punto de fuga', 'Línea de tierra', 'Poste más cercano'],
        points: [{ x: 8, y: 43 }, { x: 50, y: 43 }, { x: 8, y: 96 }, { x: 87, y: 62 }] })],
        notes: 'Actividad «Etiquetar una imagen» desde el móvil, con el dibujo de la vía del tren. El poste más cercano es el más alto: la altura disminuye hacia el punto de fuga.' },
      { layout: 'blank', bg: PAPER, transition: 'zoom', extra: [
        text('EJERCICIO', 80, 120, 400, 36, { fontFamily: M, fontSize: 24, fontWeight: 700, color: RED, letterSpacing: 4 }),
        text('El pasillo del instituto', 76, 160, 700, 90, { fontSize: 58, fontWeight: 800, color: GRA }),
        text(ul('Sitúate al fondo del pasillo, en el centro', 'Traza el horizonte a la altura de tus ojos', 'Marca el punto de fuga donde se juntan el suelo y el techo', 'Añade puertas, ventanas y una persona'), 80, 280, 700, 300, { fontSize: 27, color: GRA }),
        text('Material: lápiz HB, regla, goma y una hoja A4 apaisada.', 80, 600, 700, 40, { fontSize: 21, color: DIM }),
        timer(900, 860, 200, 320, { color: RED, endText: '¡Lápices arriba!' })],
        notes: 'Cuenta atrás de 15 minutos. Consejo: si una línea que se aleja no va al punto de fuga, el dibujo «se cae». La silla 3D es un modelo CC0 de Eric Chadwick.' },
    ]), GRA));
  } },

  // ---------------------------------------------------------------------------------------
  // 4 · The Bauhaus as one of its posters: cream paper, black bars, red, yellow and blue
  // geometry, Kandinsky's question answered live and then revealed with Transform.
  edu_art_bauhaus: { name: 'Bauhaus: forma, color y función', cat: 'edu', summary: 'Cartel Bauhaus: formas con sonido, votación de Kandinsky revelada con Transformar, letras construidas, diana y nube de palabras', make: () => {
    const CREAM = '#efe9dc', BLK = '#161616', RED = '#d7263d', YEL = '#f2c230', BLUE = '#1d4e9e', GREY = '#6f695e', B = FF.bebas, J = FF.josefin;
    const Bt = (t, x, y, w, h, size, color = BLK, p = {}) => text(t, x, y, w, h, { fontFamily: B, fontSize: size, color, lineHeight: 1, ...p });
    const ids = { tri: uid(), sq: uid(), ci: uid() };
    // Three objects of the kind the workshops made (our own drawings, no particular design).
    const OBJ = {
      chair: svgURL(300, 260, `<path d="M100 40 V140 H222 Q236 140 236 156 V214 Q236 230 220 230 H112" fill="none" stroke="#9aa3ad" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`
        + `<rect x="92" y="44" width="18" height="84" fill="${BLK}"/><rect x="104" y="126" width="118" height="16" fill="${BLK}"/>`),
      lamp: svgURL(300, 260, `<ellipse cx="150" cy="226" rx="62" ry="12" fill="${BLK}"/><rect x="144" y="120" width="12" height="104" fill="#9aa3ad"/>`
        + `<path d="M74 124 A76 76 0 0 1 226 124 Z" fill="${YEL}"/><circle cx="150" cy="128" r="14" fill="#fff6d0"/>`),
      pot: svgURL(300, 260, `<path d="M70 200 A80 80 0 0 1 230 200 Z" fill="${BLK}"/><rect x="60" y="200" width="180" height="10" fill="${BLK}"/>`
        + `<circle cx="150" cy="112" r="14" fill="${RED}"/><path d="M226 172 L268 138" stroke="${BLK}" stroke-width="12" stroke-linecap="round"/>`
        + `<path d="M76 150 A34 34 0 1 1 74 186" fill="none" stroke="${BLUE}" stroke-width="10"/>`) };
    // A letter built from a circle and a bar (the «universal» lowercase alphabet idea).
    const letter = (x, kind, color, first) => { const parts = [];
      parts.push(withAnims(shape('ellipse', x + 11, 331, 148, 148, 'none', { stroke: color, strokeWidth: 22 }), A('draw', { start: first ? 'click' : 'afterPrev', duration: 600, sound: 'pop' })));
      if (kind !== 'o') parts.push(withAnims(shape('rect', x + 137, kind === 'd' ? 200 : 320, 22, kind === 'd' ? 290 : 170, color), A('fade-up', { start: 'afterPrev', duration: 300 })));
      return parts; };
    return Object.assign(numbered(ink(build({ name: 'Bauhaus: forma, color y función', palette: 'warm', fonts: 'bold', title: { color: BLK, size: 64 }, body: { color: BLK },
      decor: () => [shape('rect', 0, 0, 1280, 14, BLK)] }, [
      { layout: 'blank', bg: CREAM, extra: [
        shape('rect', 610, 0, 16, 720, BLK),
        text('HISTORIA DEL DISEÑO · BACHILLERATO', 84, 130, 500, 30, { fontSize: 20, fontWeight: 700, letterSpacing: 3, color: GREY }),
        Bt('BAUHAUS', 76, 165, 540, 190, 184),
        text('La escuela que diseñó el siglo XX', 84, 362, 500, 50, { fontSize: 29, color: BLK }),
        Bt('1919 — 1933', 84, 430, 400, 60, 56, RED),
        text('Weimar · Dessau · Berlín', 84, 600, 480, 40, { fontSize: 22, color: GREY, letterSpacing: 2 }),
        after(shape('ellipse', 700, 60, 380, 380, BLUE), 'zoom-in', { sound: 'pop', duration: 500 }),
        after(shape('rect', 930, 330, 280, 280, RED), 'fade-left', { sound: 'pop', duration: 500 }),
        after(shape('triangle', 660, 300, 330, 300, YEL), 'spin', { sound: 'pop', duration: 700 }),
        after(shape('ellipse', 1140, 80, 64, 64, BLK), 'zoom-in', { duration: 300 })],
        notes: 'Al llegar entran solas las tres formas básicas con un «pop» cada una. Las mismas tres formas y tres colores van a protagonizar la sesión.' },
      { title: 'Tres ciudades, catorce años', layout: 'titleOnly', bg: CREAM, extra: [
        ...[['WEIMAR', '1919', YEL, BLK, 'Fundación. Unir arte y artesanía: cada taller con un maestro de la forma y otro del oficio.'],
          ['DESSAU', '1925', RED, '#ffffff', 'Edificio propio de cristal y acero. Arte y técnica: prototipos para fabricar en serie.'],
          ['BERLÍN', '1932', BLUE, '#ffffff', 'Último curso en una fábrica alquilada. En 1933 cierra, presionada por el régimen nazi.']].flatMap(([c, y, f, fg, t], i) => [
          on(shape(i ? 'chevron' : 'homeplate', 80 + i * 370, 200, 400, 170, f, { html: `<span style="font-family:${B};font-size:64px;line-height:1">${c}</span><br><span style="font-size:30px;font-weight:700">${y}</span>`, color: fg, fontSize: 30 }), i ? 'fade-left' : 'fade-right', { sound: 'pop' }),
          along(text(t, 90 + i * 370, 400, 330, 190, { fontSize: 24, color: BLK, lineHeight: 1.4 }), 'fade-up')]),
        text('Directores: Walter Gropius, Hannes Meyer y Ludwig Mies van der Rohe.', 80, 620, 1120, 40, { fontSize: 21, color: GREY })],
        notes: 'Un clic por ciudad. En catorce años la escuela se mudó dos veces y tuvo tres directores. Al cerrarse, sus profesores emigraron y llevaron sus ideas por todo el mundo.' },
      { layout: 'blank', bg: CREAM, extra: [
        pollBlock({ kind: 'choice', question: 'Kandinsky, 1923: ¿de qué color pintarías el círculo?', options: ['Amarillo', 'Rojo', 'Azul'], display: 'pie', fontSize: 34, x: 70, y: 60, w: 800, h: 600 }),
        keep(shape('triangle', 950, 70, 200, 170, '#bdb6a8'), ids.tri), keep(shape('rect', 960, 270, 180, 180, '#bdb6a8'), ids.sq), keep(shape('ellipse', 960, 480, 180, 180, '#bdb6a8'), ids.ci)],
        notes: 'Votación en directo. En 1923 Kandinsky repartió en la escuela un cuestionario: colorear un triángulo, un cuadrado y un círculo con amarillo, rojo y azul. La respuesta, en la siguiente diapositiva.' },
      { title: 'La respuesta de la escuela', layout: 'titleOnly', bg: CREAM, autoAnimate: true, transition: 'fade', extra: [
        keep(shape('triangle', 100, 200, 300, 260, YEL), ids.tri), keep(shape('rect', 500, 200, 260, 260, RED), ids.sq), keep(shape('ellipse', 870, 200, 260, 260, BLUE), ids.ci),
        ...[['Amarillo', 'agudo, activo, hacia fuera', 100, 300], ['Rojo', 'firme, pesado, en tierra', 500, 260], ['Azul', 'profundo, tranquilo, hacia dentro', 870, 260]].map(([c, t, x, w], i) =>
          on(text(`<span style="font-family:${B};font-size:48px">${c}</span><br>${t}`, x, 490, w + 20, 130, { fontSize: 24, color: BLK, textAlign: 'center' }), 'fade-up'))],
        notes: 'Transformar: las tres formas grises viajan al centro y se colorean. Para Kandinsky el ángulo agudo del triángulo «pide» amarillo; el cuadrado, rojo; el círculo, azul. ¿Coincide con lo que ha votado la clase?' },
      { title: 'Menos adorno, más función', layout: 'titleOnly', bg: CREAM, extra: [
        ...[['chair', 'Silla de tubo de acero', 'Ligera, apilable, fabricada en serie.'], ['lamp', 'Lámpara de mesa', 'Cristal y metal: luz sin adornos.'], ['pot', 'Tetera geométrica', 'Semiesfera, círculo y recta: cada parte, una función.']].flatMap(([k, n, t], i) => [
          on(shape('rect', 80 + i * 380, 190, 350, 300, '#ffffff', { stroke: BLK, strokeWidth: 3 }), 'fade-up'),
          along(img(OBJ[k], 105 + i * 380, 210, 300, 260, n), 'fade-up'),
          along(text(`<span style="font-family:${B};font-size:36px">${n}</span><br>${t}`, 80 + i * 380, 505, 350, 120, { fontSize: 22, color: BLK }), 'fade-up')])],
        notes: 'Dibujos propios de objetos al estilo de los talleres (no reproducen ningún diseño concreto). Tres clics. Pregunta: ¿qué objeto de tu casa no tiene ni un adorno?' },
      { title: 'Letras de círculo y recta', layout: 'titleOnly', bg: CREAM, extra: [
        ...letter(80, 'd', BLK, true), ...letter(260, 'a', RED), ...letter(440, 'd', BLK), ...letter(620, 'o', BLUE),
        shape('rect', 80, 490, 720, 6, BLK),
        text('En 1925 la escuela propone escribir solo en minúsculas: una letra por sonido, construida con círculos y rectas.', 860, 200, 360, 220, { fontFamily: J, fontSize: 28, color: BLK, lineHeight: 1.3 }),
        on(text('arte y técnica', 810, 460, 420, 100, { fontFamily: B, fontSize: 66, wordart: 'fill', wordartColor: RED, textAlign: 'center' }), 'zoom-in', { sound: 'chime' }),
        text('Lema de la exposición de 1923: «arte y técnica, una nueva unidad».', 820, 570, 400, 70, { fontSize: 20, color: GREY, textAlign: 'center' })],
        notes: 'Clic: la palabra «dado» se construye sola, círculo a círculo y barra a barra. Después, el lema en Text Art. La idea del alfabeto solo en minúsculas es de Herbert Bayer.' },
      { title: 'Cómo se aprendía', layout: 'titleOnly', bg: CREAM, extra: [
        dg('target', 'Curso preliminar\nForma, color y materiales\nTalleres: madera, metal, textil, cerámica, vidrio\nConstrucción', 70, 170, 620, 500, { oneByOne: true }),
        text('De fuera hacia dentro', 740, 200, 460, 60, { fontFamily: B, fontSize: 40, color: BLK }),
        text(ul('Seis meses de curso preliminar: experimentar con papel, madera, vidrio…', 'Teoría de la forma y del color, con pintores como Klee y Kandinsky', 'Un taller de oficio a elegir', 'En el centro, la meta: construir'), 740, 280, 460, 360, { fontSize: 23, color: BLK })],
        notes: 'El plan de estudios de la Bauhaus se dibujaba como círculos concéntricos (1922). El diagrama aparece anillo a anillo.' },
      { layout: 'blank', bg: CREAM, extra: [
        pollBlock({ kind: 'word', question: '¿Qué objeto de tu casa parece Bauhaus?', options: [], fontSize: 36, x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Nube de palabras desde el móvil. Suelen salir sillas, lámparas, flexos, tazas… Comentar las palabras más grandes: ¿qué tienen en común?' },
      { layout: 'blank', bg: BLK, transition: 'zoom', extra: [
        shape('ellipse', 900, -120, 520, 520, BLUE), shape('rect', 1010, 420, 300, 300, RED), shape('triangle', 760, 470, 300, 260, YEL),
        Bt('TU CARTEL', 80, 110, 640, 120, 120, CREAM),
        text(ul('Solo círculo, cuadrado y triángulo', 'Rojo, amarillo, azul, negro y blanco', 'Una palabra, en minúsculas'), 84, 260, 620, 220, { fontSize: 30, color: CREAM }),
        timer(600, 84, 520, 580, { style: 'bar', h: 70, color: YEL, endText: '¡A colgarlo!' })],
        notes: 'Cierre: diez minutos para un cartel con las reglas de la escuela. Cuenta atrás en barra. Al final, exposición en la pared de la clase.' },
    ]), BLK)), { palette: 'custom', customPalette: { ...PALETTES.warm, name: 'Bauhaus', accents: [YEL, RED, BLUE, '#3a3a3a', '#6f695e', '#f3a712'] } });
    // (The palette's first accents are the school's yellow, red and blue: the poll paints its options with them.)
  } },

  // ---------------------------------------------------------------------------------------
  // 5 · Greek sculpture in a night gallery: spotlights, marble plinths, a figure turning in 3D,
  // the canon measured with a table that works it out, kouros against contrapposto, colour.
  edu_art_sculpture: { name: 'Escultura griega: el cuerpo ideal', cat: 'edu', summary: 'Galería nocturna: figura 3D en su peana, línea del tiempo, canon con ecuación, tabla que calcula, contrapposto trazado y concurso', make: () => {
    const BG = '#16161b', MARBLE = '#ecebe6', VEIN = '#bdb9ae', GOLD = '#c8a45a', DIM = '#a7a39b', TX = '#f1eee8', RED = '#e0675a', SKY = '#7aa2f7', C = FF.cormorant;
    const spot = (x, w) => poly([[40, 0], [60, 0], [100, 100], [0, 100]], x, 0, w, 720, '#ffffff', { fill2: BG, gradAngle: 180, opacity: 10 });
    const plinth = (x, y, w, h) => [shape('rect', x - 20, y, w + 40, 26, MARBLE, { fill2: VEIN, gradAngle: 90 }), shape('rect', x, y + 26, w, h - 26, '#d8d5cc', { fill2: '#8f8b82', gradAngle: 90 })];
    const label = (t, x, y, w, h) => text(t, x, y, w, h, { fontSize: 18, color: DIM, letterSpacing: 1 });
    // A mannequin: shoulders and hips tilted (degrees), the free leg bent.
    const figure = (cx, top, tS, tH, free, col = MARBLE) => { const rot = (c, dx, deg) => { const a = deg * Math.PI / 180; return [c[0] + dx * Math.cos(a), c[1] + dx * Math.sin(a)]; };
      const sc = [cx + (free ? -6 : 0), top + 95], hc = [cx, top + 245], sL = rot(sc, -62, tS), sR = rot(sc, 62, tS), hL = rot(hc, -44, tH), hR = rot(hc, 44, tH);
      const footL = free ? [hL[0] - 26, top + 455] : [hL[0], top + 470], kneeL = free ? [hL[0] - 2, top + 360] : [hL[0], top + 360];
      return [shape('ellipse', sc[0] - 24 + (free ? -4 : 0), top, 48, 62, col), lines([[sc[0], top + 60], [sc[0], sc[1]]], col, 16),
        polyAt([sL, sR, hR, hL], col), lines([hR, [hR[0], top + 360], [hR[0], top + 470]], col, 24), lines([hL, kneeL, footL], col, 24),
        lines([sL, [sL[0] - 8, top + 200], [sL[0] - 2, top + 290]], col, 15), lines([sR, [sR[0] + 8, top + 200], [sR[0] + 2, top + 290]], col, 15),
        { sL, sR, hL, hR }]; };
    const kouros = figure(300, 190, 0, 0, false), contra = figure(740, 190, 6, -7, true);
    const guide = (a, b, c) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return lines([[a[0] - dx * 0.5, a[1] - dy * 0.5], [b[0] + dx * 0.5, b[1] + dy * 0.5]], c, 4, false, { dash: 'dash' }); };
    // A frieze: a key pattern, a row of palmettes and the egg-and-dart, plain or painted.
    const frieze = painted => { const c = painted ? { bg: '#1f4e8c', key: GOLD, palm: '#b3392f', egg: '#e8d9a8', band: '#2c6b4f' } : { bg: MARBLE, key: VEIN, palm: '#d6d2c8', egg: '#d6d2c8', band: '#dedbd2' };
      const keyP = Array.from({ length: 8 }, (_, i) => `<path d="M${10 + i * 58} 66 V20 H${54 + i * 58} V54 H${30 + i * 58} V38 H${42 + i * 58}" fill="none" stroke="${c.key}" stroke-width="7"/>`).join('');
      const palms = Array.from({ length: 8 }, (_, i) => `<path d="M${38 + i * 58} 170 C${18 + i * 58} 140 ${22 + i * 58} 110 ${38 + i * 58} 96 C${54 + i * 58} 110 ${58 + i * 58} 140 ${38 + i * 58} 170 Z" fill="${c.palm}"/>`).join('');
      const eggs = Array.from({ length: 10 }, (_, i) => `<ellipse cx="${24 + i * 47}" cy="222" rx="16" ry="22" fill="${c.egg}"/>`).join('');
      return svgURL(480, 260, `<rect width="480" height="260" fill="${c.bg}"/><rect y="0" width="480" height="84" fill="${c.band}"/>${keyP}${palms}<rect y="194" width="480" height="66" fill="${painted ? '#7a2b23' : '#d2cec4'}"/>${eggs}`); };
    return numbered(build({ name: 'Escultura griega: el cuerpo ideal', palette: 'midnight', fonts: 'editorial', title: { font: C, color: TX, size: 58, bold: true }, body: { color: TX },
      decor: () => [] }, [
      { layout: 'blank', bg: BG, back: [spot(700, 560)], extra: [
        text('HISTORIA DEL ARTE · 1.º DE BACHILLERATO', 84, 186, 640, 36, { fontSize: 19, letterSpacing: 3, color: GOLD, fontWeight: 700 }),
        text('El cuerpo ideal', 78, 225, 560, 120, { fontFamily: C, fontSize: 92, fontWeight: 700, color: TX }),
        text('Escultura griega: del kurós rígido al contrapposto', 84, 360, 500, 90, { fontSize: 30, color: DIM }),
        label('SALA III · GRECIA, SIGLOS VII – I a. C.', 84, 600, 500, 30),
        ...plinth(880, 520, 160, 160),
        model('kh-RiggedFigure', 800, 110, 320, 420, { autoRotate: true, view: 'front', caption: '' })],
        notes: 'Portada de sala de museo de noche. La figura articulada gira sobre su peana como una estatua de exposición: nos servirá de maniquí para hablar de proporciones.' },
      { title: 'Tres épocas', layout: 'titleOnly', bg: BG, back: [spot(200, 900)], extra: [
        dg('timeline', 'Arcaica\n  s. VII – VI a. C. · kurós rígido y sonrisa arcaica\nClásica\n  s. V – IV a. C. · Policleto, Fidias, Praxíteles\nHelenística\n  s. III – I a. C. · movimiento y dramatismo', 80, 200, 1120, 380, { oneByOne: true, fontScale: 1.15 }),
        text('Un mismo tema, el cuerpo humano, contado durante seis siglos.', 80, 610, 1120, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'La línea del tiempo aparece época a época. Ejemplos: Kurós de Anavyssos (arcaica), Doríforo de Policleto (clásica), Laocoonte (helenística).' },
      { title: 'El canon de Policleto', layout: 'titleOnly', bg: BG, back: [spot(120, 560)], extra: [
        ...figure(250, 190, 0, 0, false, '#d8d5cc').slice(0, -1),
        ...Array.from({ length: 8 }, (_, k) => shape('rect', 140, 190 + k * 67, 230, 2, GOLD, { opacity: 70 })),
        ...Array.from({ length: 7 }, (_, k) => withAnims(text(String(k + 1), 380, 205 + k * 67, 40, 36, { fontSize: 24, fontWeight: 700, color: GOLD }), A('fade-in', { start: k ? 'afterPrev' : 'click', duration: 200, sound: 'click' }))),
        mathBlock({ x: 520, y: 190, w: 680, h: 100, fontSize: 44, color: TX, latex: '\\text{altura} = 7 \\times \\text{cabeza}' }),
        tableBlock({ x: 520, y: 320, w: 680, h: 230, fontSize: 22, header: true, headBg: GOLD, headFg: BG, stroke: '#ffffff30', colW: [4, 3, 4],
          rows: [['Escultor', 'Canon', 'Obra'], ['Policleto · s. V a. C.', '7 cabezas', 'Doríforo'], ['Lisipo · s. IV a. C.', '8 cabezas', 'Apoxiómeno'], ['Una persona adulta', '≈ 7,5 cabezas', 'Tú']] }),
        on(text('Lisipo alarga el cuerpo: cabeza más pequeña, figura más esbelta.', 520, 575, 680, 70, { fontSize: 23, color: DIM }), 'fade-up')],
        notes: 'Clic: se cuentan las siete cabezas una a una (con un clic sonoro). Un canon es una regla de proporciones. El de Policleto se conoce por copias romanas del Doríforo.' },
      { title: '¿Cuántas cabezas mides?', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 80, y: 180, w: 700, h: 400, fontSize: 25, header: true, headBg: '#2a2a33', headFg: GOLD, stroke: '#ffffff30', banded: true, band: '#ffffff', bandAlpha: 0.05, colW: [4, 3, 3, 3],
          rows: [['Quién', 'Altura (cm)', 'Cabeza (cm)', 'Cabezas'], ['Doríforo', '212', '30', '=REDONDEAR(B2/C2;1)'], ['Alumna A', '158', '21,5', '=REDONDEAR(B3/C3;1)'],
            ['Alumno B', '171', '23', '=REDONDEAR(B4/C4;1)'], ['Profesora', '165', '22', '=REDONDEAR(B5/C5;1)'], ['Media de la clase', '', '', '=REDONDEAR(PROMEDIO(D3:D5);1)']] }),
        card('<b style="color:#c8a45a">Cómo medir</b><br>1. Altura, descalzo y contra la pared.<br>2. Cabeza: de la barbilla a la coronilla, con dos libros.<br>3. Escribe tus datos: la tabla divide sola.', 820, 180, 380, 300, '#ffffff10', { color: TX, fontSize: 23, lineHeight: 1.45 }),
        text('Datos de ejemplo, inventados.', 820, 500, 380, 40, { fontSize: 19, color: DIM })],
        notes: 'La última columna son fórmulas: =REDONDEAR(B2/C2;1) divide la altura entre la cabeza. La media de la clase usa PROMEDIO. Cambiad los datos por los vuestros en directo.' },
      { title: 'Del kurós al contrapposto', layout: 'titleOnly', bg: BG, back: [spot(110, 380), spot(550, 380)], extra: [
        ...kouros.slice(0, -1), ...contra.slice(0, -1),
        on(guide(kouros.at(-1).sL, kouros.at(-1).sR, RED), 'wipe', { dir: 'left', duration: 600 }), along(guide(kouros.at(-1).hL, kouros.at(-1).hR, SKY), 'wipe', { dir: 'left', duration: 600 }),
        along(label('KURÓS · HACIA 530 a. C.', 170, 670, 300, 30), 'fade-in'),
        on(guide(contra.at(-1).sL, contra.at(-1).sR, RED), 'wipe', { dir: 'left', duration: 600 }), along(guide(contra.at(-1).hL, contra.at(-1).hR, SKY), 'wipe', { dir: 'left', duration: 600 }),
        along(label('CONTRAPPOSTO · HACIA 440 a. C.', 590, 670, 340, 30), 'fade-in'),
        along(card('El peso sobre una pierna: la cadera sube de ese lado y los hombros bajan. El cuerpo parece vivo.', 930, 240, 280, 280, '#ffffff10', { color: TX, fontSize: 21, lineHeight: 1.4, pad: [16, 16, 16, 16] }), 'fade-left')],
        notes: 'Dos clics: las líneas de hombros (rojo) y caderas (azul). En el kurós son paralelas; en el contrapposto se cruzan en sentidos opuestos. Pedir a alguien que se ponga de pie apoyado en una sola pierna.' },
      { title: 'El mármol no era blanco', layout: 'titleOnly', bg: BG, extra: [
        img(frieze(false), 80, 190, 500, 270, 'Friso de mármol sin color'), label('COMO LO VEMOS HOY', 80, 470, 500, 30),
        on(img(frieze(true), 700, 190, 500, 270, 'El mismo friso pintado de azul, rojo y oro'), 'fade-in', { duration: 1000 }), along(label('COMO SE VEÍA HACE 2500 AÑOS', 700, 470, 500, 30), 'fade-in'),
        text('Los restos de pigmento y la luz ultravioleta lo demuestran: esculturas y templos estaban pintados de colores vivos.', 80, 540, 1120, 90, { fontSize: 25, color: TX, textAlign: 'center' })],
        notes: 'Dibujo propio de un friso (meandro, palmetas y ovas). Clic: aparece la versión pintada. Los colores se perdieron con el tiempo; el «mármol blanco» es una idea del Renacimiento y del Neoclasicismo.' },
      { title: 'Bronce a la cera perdida', layout: 'titleOnly', bg: BG, extra: [
        dg('process', 'Modelo en cera\nMolde de arcilla\nSe funde la cera\nSe vierte el bronce\nSe rompe el molde', 80, 200, 1120, 260, { oneByOne: true, colors: 'accent' }),
        icon('flame', 80, 500, 60, GOLD),
        text('Así se hicieron los Guerreros de Riace (s. V a. C.), encontrados en el fondo del mar en 1972. Muchos bronces se fundieron después para hacer monedas o armas.', 160, 490, 1040, 120, { fontSize: 24, color: TX, lineHeight: 1.4 })],
        notes: 'Proceso paso a paso. Por eso conocemos muchas obras griegas solo por copias romanas en mármol: los originales de bronce se reciclaron.' },
      { layout: 'blank', bg: BG, extra: [quiz('Con el canon de Policleto, ¿cuántas cabezas mide la figura?', ['6', '7', '8', '9'], 1, { fontSize: 42 })],
        notes: 'Concurso. Siete con Policleto; ocho con Lisipo, que lo alarga. Quien conteste 8 se ha acordado del canon de Lisipo.' },
      { layout: 'blank', bg: BG, back: [spot(700, 560)], transition: 'fade', extra: [
        text('Reto de la semana', 84, 160, 560, 90, { fontFamily: C, fontSize: 70, fontWeight: 700, color: TX }),
        text('Fotografía una estatua de tu ciudad, mide su cabeza y su altura en la foto y calcula su canon.', 84, 270, 560, 160, { fontSize: 29, color: DIM, lineHeight: 1.4 }),
        text('¿Es más clásica o más moderna?', 84, 450, 560, 50, { fontSize: 30, color: GOLD, fontStyle: 'italic' }),
        ...plinth(880, 520, 160, 160),
        model('kh-RiggedFigure', 800, 110, 320, 420, { autoRotate: true, view: 'side', caption: '' }),
        credits(['kh-RiggedFigure'], 84, 650, 700, '#8a867e')],
        notes: 'Cierre con el reto para casa. La figura articulada es un modelo CC BY (el crédito va en la línea pequeña de abajo).' },
    ]));
  } },
  // ---------------------------------------------------------------------------------------
  // 6 · Note values in a music notebook: ruled paper with a red margin, a scale that sounds as
  // it appears, the tree of values heard row by row, a table that times them, Beethoven's tune.
  edu_art_figures: { name: 'Figuras musicales', cat: 'edu', summary: 'Cuaderno de música: escala que suena, árbol de figuras con su ritmo, tabla que calcula, compases con botón, melodía y dictado', make: () => {
    const PAPER = '#fdfaf2', INK = '#22252b', RULE = '#c9d6e6', MARGIN = '#e07070', DIM = '#5f6670', H = FF.caveat;
    const COL = { 1: '#e07a2f', 2: '#2b6cb0', 4: '#2f9e6a', 8: '#b04aa0', 16: '#d64545' };
    const NAME = { 1: 'Redonda', 2: 'Blanca', 4: 'Negra', 8: 'Corchea', 16: 'Semicorchea' };
    // A note, drawn (80 × 200, the head's centre at 40, 100): 1 whole, 2 half, 4 quarter, 8 eighth, 16 sixteenth.
    const noteSVG = (kind, color = INK, { down = false, dot = false } = {}) => svgURL(80, 200,
      (kind === 1 ? `<ellipse cx="40" cy="100" rx="17" ry="12" fill="none" stroke="${color}" stroke-width="7" transform="rotate(-25 40 100)"/>`
        : `<ellipse cx="40" cy="100" rx="14.5" ry="10.5" fill="${kind === 2 ? 'none' : color}" stroke="${color}" stroke-width="${kind === 2 ? 4.5 : 0}" transform="rotate(-25 40 100)"/>`)
      + (kind > 1 ? (down ? `<line x1="27" y1="104" x2="27" y2="182" stroke="${color}" stroke-width="4"/>` : `<line x1="53" y1="96" x2="53" y2="18" stroke="${color}" stroke-width="4"/>`) : '')
      + (kind >= 8 && !down ? Array.from({ length: kind === 16 ? 2 : 1 }, (_, i) => `<path d="M53 ${18 + i * 20} C60 ${34 + i * 20} 78 ${42 + i * 20} 68 ${70 + i * 20}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`).join('') : '')
      + (dot ? `<circle cx="68" cy="94" r="5.5" fill="${color}"/>` : ''));
    const note = (kind, cx, cy, color, opt = {}, s = 1) => img(noteSVG(kind, color, opt), cx - 40 * s, cy - 100 * s, 80 * s, 200 * s, `${NAME[kind]}${opt.dot ? ' con puntillo' : ''}`);
    // A staff (lines every 20 px); the y of a note by its step from E4 (bottom line).
    const staff = (x, y0, w, color = INK) => Array.from({ length: 5 }, (_, k) => shape('rect', x, y0 + k * 20, w, 2, color));
    const STEP = { C4: -2, D4: -1, E4: 0, F4: 1, G4: 2, A4: 3, B4: 4, C5: 5 }, yOf = (y0, n) => y0 + 80 - STEP[n] * 10;
    const clef = (x, y0) => text('𝄞', x - 6, y0 - 44, 84, 180, { fontFamily: "'Noto Music', 'DejaVu Sans', 'Segoe UI Symbol', serif", fontSize: 118, color: INK, lineHeight: 1 });
    const meter = (x, y0, a, b) => text(`<b>${a}</b><br><b>${b}</b>`, x, y0 - 4, 40, 90, { fontSize: 38, color: INK, lineHeight: 1.05, textAlign: 'center' });
    const ruled = () => [shape('rect', 60, 0, 3, 720, MARGIN, { opacity: 70 }), ...Array.from({ length: 17 }, (_, i) => shape('rect', 0, 40 + i * 40, 1280, 1, RULE, { opacity: 60 }))];
    const hand = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: H, fontSize: size, color, lineHeight: 1.1, ...p });
    // Sounds: each note of the scale, a row of the tree (4 beats at 120), meters with a strong first beat, the tune, a dictation.
    const scale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const tone = n => wav([[hz(n), 0.45, 0.6, 'pluck']], { decay: 4 });
    const row = k => wav(Array.from({ length: 2 ** k }, () => [hz('G4'), 2 / 2 ** k, 0.6, 'organ']), { decay: 0.9 });
    const bars = (beats, n = 2) => wav(Array.from({ length: beats * n }, (_, i) => [i % beats ? 900 : 600, 0.5, i % beats ? 0.35 : 0.9, i % beats ? 'noise' : 'thud']));
    const ODE = 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2';
    const DICT = '4:1 4:1 2:2 8:0.5 8:0.5 4:1 2:2 4:1 8:0.5 8:0.5 4:1 4:1 1:4'.split(' ');
    const dictation = wav(DICT.flatMap(t => { const b = +t.split(':')[1] * 0.5; return [[1, 0.06, 0.8, 'noise'], [0, b - 0.06]]; }));
    // The phrase of the «Ode to joy» on a staff: [note, kind, beat in the bar, dotted].
    const PH = [[['E4', 4, 0], ['E4', 4, 1], ['F4', 4, 2], ['G4', 4, 3]], [['G4', 4, 0], ['F4', 4, 1], ['E4', 4, 2], ['D4', 4, 3]], [['C4', 4, 0], ['C4', 4, 1], ['D4', 4, 2], ['E4', 4, 3]], [['E4', 4, 0, true], ['D4', 8, 1.3], ['D4', 2, 2.4]]];
    const btn = (x, y, color) => shape('ellipse', x, y, 64, 64, color, { html: '▶', fontSize: 26, color: '#ffffff', fontWeight: 700 });
    const meters = [['2', '4', 'Marcha', 'FUERTE · débil', 2, COL[2]], ['3', '4', 'Vals', 'FUERTE · débil · débil', 3, COL[4]], ['4', '4', 'Pop, rock, himnos', 'FUERTE · débil · semifuerte · débil', 4, COL[8]]];
    const mbtn = meters.map((m, i) => btn(110 + i * 380, 545, m[5]));
    return numbered(build({ name: 'Figuras musicales', palette: 'office', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK }, decor: () => [] }, [
      { layout: 'blank', bg: PAPER, back: ruled(), extra: [
        text('MÚSICA · 1.º DE ESO', 110, 110, 500, 36, { fontSize: 22, fontWeight: 700, letterSpacing: 4, color: COL[16] }),
        text('Figuras musicales', 104, 150, 900, 100, { fontSize: 78, fontWeight: 800, color: INK }),
        hand('Cuánto dura cada nota (y por qué importa)', 110, 255, 800, 60, 44, COL[2]),
        ...staff(110, 440, 1060), clef(118, 440), meter(196, 440, 4, 4),
        ...scale.flatMap((n, i) => { const x = 300 + i * 110, y = yOf(440, n);
          return [...(n === 'C4' ? [after(shape('rect', x - 26, 540, 52, 2, INK), 'fade-in', { duration: 200 })] : []),
            withAnims(note(4, x, y, INK, { down: STEP[n] >= 4 }), A('fade-down', { start: 'afterPrev', duration: 350, ...snd(tone(n)) }))]; }),
        hand('do · re · mi · fa · sol · la · si · do', 290, 600, 820, 50, 36, DIM, { textAlign: 'center' })],
        notes: 'Al llegar, la escala de do aparece nota a nota y cada nota suena (sonidos generados dentro de la presentación, sin archivos). Las figuras dicen cuánto dura cada nota; su posición en el pentagrama, cómo de aguda es.' },
      { title: 'El árbol de las figuras', layout: 'titleOnly', bg: PAPER, back: ruled(), extra: [
        ...[1, 2, 4, 8, 16].flatMap((k, r) => { const n = k, y = 225 + r * 98;
          return [withAnims(text(`<b style="color:${COL[k]}">${NAME[k]}</b>${n > 1 ? ` <span style="color:${DIM}">× ${n}</span>` : ''}`, 90, y - 22, 260, 44, { fontSize: 26, color: INK }), A('fade-right', { ...snd(row(r)) })),
            ...Array.from({ length: n }, (_, i) => along(note(k, 380 + (i + 0.5) * 820 / n, y + 10, COL[k], {}, 0.6), 'fade-in', { delay: i * (2000 / n) }))]; })],
        notes: 'Cinco clics, una fila cada uno. Al aparecer, cada fila suena: siempre dura lo mismo (cuatro tiempos), pero cada vez con el doble de notas. Una redonda vale dos blancas, cuatro negras, ocho corcheas o dieciséis semicorcheas.' },
      { title: 'Cuánto dura cada figura', layout: 'titleOnly', bg: PAPER, back: ruled(), extra: [
        ...[1, 2, 4, 8, 16].map((k, i) => note(k, 130, 296 + i * 73.3, COL[k], {}, 0.42)),
        tableBlock({ x: 190, y: 180, w: 1010, h: 440, fontSize: 24, header: true, headBg: INK, headFg: PAPER, stroke: '#c9d0da', banded: true, band: '#e9eef5', colW: [3, 2, 4, 3],
          rows: [['Figura', 'Tiempos', 'Su silencio', 'Segundos a 90 ppm'], ['Redonda', '4', 'Silencio de redonda', '=REDONDEAR(B2*60/90;2)'], ['Blanca', '2', 'Silencio de blanca', '=REDONDEAR(B3*60/90;2)'],
            ['Negra', '1', 'Silencio de negra', '=REDONDEAR(B4*60/90;2)'], ['Corchea', '0,5', 'Silencio de corchea', '=REDONDEAR(B5*60/90;2)'], ['Semicorchea', '0,25', 'Silencio de semicorchea', '=REDONDEAR(B6*60/90;2)']] }),
        hand('ppm = pulsos por minuto: cámbialo en las fórmulas y la tabla se recalcula', 190, 635, 1010, 46, 30, DIM)],
        notes: 'La última columna son fórmulas: tiempos × 60 ÷ 90. A 90 pulsos por minuto una negra dura dos tercios de segundo. Cada figura tiene un silencio que dura lo mismo.' },
      { title: 'El puntillo: la mitad más', layout: 'titleOnly', bg: PAPER, back: ruled(), extra: [
        mathBlock({ x: 110, y: 180, w: 1060, h: 110, fontSize: 48, color: INK, latex: '\\text{con puntillo} = d + \\dfrac{d}{2}' }),
        ...[[2, 'Blanca con puntillo', '2 + 1 = 3 tiempos', 2, 1], [4, 'Negra con puntillo', '1 + 0,5 = 1,5 tiempos', 1, 0.5]].flatMap(([k, n, t, a, b], i) => { const y = 330 + i * 160;
          return [note(k, 170, y + 70, COL[k], { dot: true }, 0.6), text(`<b>${n}</b><br><span style="color:${DIM}">${t}</span>`, 230, y + 10, 330, 100, { fontSize: 25, color: INK }),
            on(shape('rounded', 600, y + 30, a * 160, 60, COL[k], { radius: 8 }), 'wipe', { dir: 'left', ...snd(wav([[hz('A4'), (a + b) * 0.5, 0.6, 'organ']], { decay: 0.6 })) }),
            along(shape('rounded', 600 + a * 160 + 6, y + 30, b * 160, 60, COL[k], { radius: 8, opacity: 50 }), 'fade-right', { delay: 300 })]; }),
        hand('el puntillo siempre va a la derecha de la nota', 600, 645, 600, 44, 30, DIM)],
        notes: 'La fórmula: el puntillo suma la mitad de lo que vale la figura. Dos clics: la barra de cada figura crece y se alarga la mitad (con su sonido, de 3 y 1,5 tiempos a 120 ppm).' },
      { title: 'Compases: cómo se agrupan los pulsos', layout: 'titleOnly', bg: PAPER, back: ruled(), extra: [
        ...meters.flatMap(([a, b, n, acc, beats, c], i) => [
          shape('rounded', 80 + i * 380, 190, 350, 440, '#ffffff', { radius: 16, stroke: c, strokeWidth: 3 }),
          withAnims(text(`<b>${a}</b><br><b>${b}</b>`, 100 + i * 380, 205, 90, 150, { fontSize: 64, color: c, lineHeight: 1, textAlign: 'center' }), A('pulse', { trigger: mbtn[i].id, duration: 600, ...snd(bars(beats)) })),
          text(`<b>${n}</b>`, 200 + i * 380, 220, 210, 100, { fontSize: 28, color: INK, vAlign: 'middle' }),
          ...Array.from({ length: beats }, (_, j) => shape('ellipse', 110 + i * 380 + j * 75 + (j ? 10 : 0), j ? 395 : 385, j ? 40 : 60, j ? 40 : 60, c, { opacity: j ? (beats === 4 && j === 2 ? 70 : 35) : 100 })),
          text(acc, 100 + i * 380, 460, 310, 70, { fontSize: 20, color: DIM }),
          mbtn[i], text('Escúchalo', 190 + i * 380, 558, 200, 40, { fontSize: 22, color: DIM })])],
        notes: 'Cada botón ▶ hace sonar dos compases (golpe grave en el primer tiempo, palmas en los demás) y el número late. Se pueden tocar las veces que se quiera: son animaciones con desencadenador.' },
      { title: 'Himno de la alegría', layout: 'titleOnly', bg: PAPER, back: ruled(), extra: [
        text('Ludwig van Beethoven · Novena sinfonía (1824)', 110, 160, 900, 40, { fontSize: 24, color: DIM }),
        ...staff(110, 300, 1080), clef(118, 300), meter(196, 300, 4, 4),
        ...PH.flatMap((bar, b) => [b < 3 ? shape('rect', 495 + b * 230, 300, 2, 82, INK) : shape('rect', 1184, 300, 6, 82, INK),
          ...bar.map(([n, k, beat, dot]) => { const x = 290 + b * 230 + beat * 60, y = yOf(300, n);
            return [...(n === 'C4' ? [shape('rect', x - 24, 400, 48, 2, INK)] : []), note(k, x, y, COL[k], { dot })]; }).flat()]),
        player(wav(tune(ODE, 110, 'organ', 0.5), { decay: 1.8 }), 110, 470, 520, 'La melodía del Himno de la alegría'),
        hand('Cántala con «lo, lo, lo»', 680, 470, 500, 56, 40, COL[4]),
        text('Colores: <b style="color:#2f9e6a">negras</b>, <b style="color:#2f9e6a">negra con puntillo</b>, <b style="color:#b04aa0">corchea</b> y <b style="color:#2b6cb0">blanca</b>.', 110, 560, 1080, 50, { fontSize: 23, color: INK })],
        notes: 'Primera frase del Himno de la alegría en el pentagrama, con cada figura de su color. El reproductor toca la melodía completa (dos frases), generada dentro de la presentación.' },
      { title: '¿Qué figuras usa la melodía?', layout: 'titleOnly', bg: PAPER, back: ruled(), extra: [
        chartBlock({ x: 80, y: 170, w: 600, h: 490, chartType: 'doughnut', data: [['Negras', 24, COL[4]], ['Negras con puntillo', 2, '#7cc8a3'], ['Corcheas', 2, COL[8]], ['Blancas', 2, COL[2]]].map(([label, value, color]) => ({ label, value, color })) }),
        text(`<span style="font-size:110px;font-weight:800;color:${COL[4]};line-height:1">24</span><br>de sus 30 notas son negras`, 740, 200, 460, 220, { fontSize: 30, color: INK }),
        on(hand('Por eso es tan fácil de cantar: el pulso y la nota van juntos.', 740, 460, 460, 120, 36, DIM), 'fade-up')],
        notes: 'Recuento de las dos primeras frases (ocho compases). Las pocas figuras distintas están al final de cada frase: es donde la melodía «respira».' },
      { layout: 'blank', bg: PAPER, back: ruled(), extra: [pollBlock({ kind: 'gaps', question: 'Completa los huecos', fontSize: 40, x: 100, y: 60, w: 1100, h: 600,
        text: 'Una redonda dura [4] tiempos y una blanca, [2]. Dos corcheas duran lo mismo que una [negra]. Una blanca con puntillo dura [3] tiempos.' })],
        notes: 'Actividad «Completar huecos» desde el móvil, con nota automática.' },
      { layout: 'blank', bg: PAPER, back: ruled(), transition: 'zoom', extra: [
        hand('Dictado de palmas', 110, 90, 700, 90, 76, COL[16]),
        text('Escucha, cuenta los pulsos y escribe las figuras. Después, comprobamos.', 110, 190, 680, 70, { fontSize: 26, color: DIM }),
        player(dictation, 110, 280, 520, 'Dictado rítmico de palmas'),
        ...staff(110, 420, 760, '#9aa3ad').slice(2, 3),
        ...DICT.map((t, i) => { const k = +t.split(':')[0], x = 140 + i * 56;
          return withAnims(note(k, x, 430, COL[k], {}, 0.55), A('fade-in', { start: i ? 'withPrev' : 'click', delay: i * 120 })); }),
        timer(120, 920, 220, 280, { color: COL[16], endText: '¡Lápices abajo!' })],
        notes: 'El reproductor toca 13 palmadas a 120 ppm. Dos minutos para escribir. Un clic muestra la solución: negra, negra, blanca, dos corcheas, negra, blanca, negra, dos corcheas, negra, negra y redonda.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 7 · The flamenco «compás» on a tablao: black and red polka dots, a twelve-hour clock whose
  // hand turns to the sound of claps, a count that lights up beat by beat, a dancing robot.
  edu_art_flamenco: { name: 'El compás flamenco', cat: 'edu', summary: 'Tablao de lunares: reloj de doce tiempos que gira con palmas, cuenta que se enciende, palmas con botón, robot 3D que baila y ecuación', make: () => {
    const BG = '#120b0b', RED = '#c1121f', CREAM = '#f6ead7', GOLD = '#d9a441', DIM = '#bfae9a', WOOD = '#4a2a17', AB = FF.abril;
    const ACC = [3, 6, 8, 10, 12];
    const dots = (x, y, w, h, seed = 3, n = 40, c = RED, o = 35) => { const r = rng(seed); return img(svgURL(w, h, Array.from({ length: n }, () => `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(10 + r() * 14).toFixed(0)}" fill="${c}"/>`).join('')), x, y, w, h, 'Lunares', { opacity: o, decorative: true, fit: 'fill' }); };
    const floor = () => [shape('rect', 0, 640, 1280, 80, WOOD), ...Array.from({ length: 9 }, (_, i) => shape('rect', i * 160, 640, 2, 80, '#2c170b'))];
    // Claps: twelve beats at a tempo, accents louder.
    const compas = (bpm = 180, times = 1) => wav(Array.from({ length: 12 * times }, (_, i) => [1, 60 / bpm, ACC.includes(i % 12 + 1) ? 0.95 : 0.3, 'noise']));
    const clock = (cx, cy, R, big = true) => Array.from({ length: 12 }, (_, i) => { const k = i + 1, a = (-90 + k * 30) * Math.PI / 180, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a), acc = ACC.includes(k), d = acc ? (big ? 74 : 56) : (big ? 52 : 40);
      return shape('ellipse', x - d / 2, y - d / 2, d, d, acc ? RED : 'none', { stroke: acc ? RED : GOLD, strokeWidth: 3, html: String(k), color: acc ? '#ffffff' : CREAM, fontSize: acc ? (big ? 30 : 22) : (big ? 22 : 17), fontWeight: 700 }); });
    const HAND = svgURL(440, 440, `<line x1="220" y1="220" x2="220" y2="70" stroke="${GOLD}" stroke-width="8" stroke-linecap="round"/><circle cx="220" cy="220" r="14" fill="${GOLD}"/>`);
    const btn = (x, y) => shape('ellipse', x, y, 72, 72, GOLD, { html: '▶', fontSize: 28, color: BG, fontWeight: 700 });
    const b1 = btn(140, 470), b2 = btn(740, 470);
    return numbered(build({ name: 'El compás flamenco', palette: 'revela', fonts: 'websafe', title: { font: AB, color: CREAM, size: 54, bold: false }, body: { color: CREAM }, decor: () => [] }, [
      { layout: 'blank', bg: BG, back: [dots(0, 0, 1280, 720, 5, 70, RED, 22)], extra: [
        text('MÚSICA · 3.º DE ESO', 84, 170, 480, 34, { fontSize: 22, letterSpacing: 4, color: GOLD, fontWeight: 700 }),
        text('El compás<br>flamenco', 78, 210, 600, 230, { fontFamily: AB, fontSize: 92, color: CREAM, lineHeight: 1.05 }),
        text('Doce tiempos, cinco acentos y mucho arte', 84, 460, 520, 90, { fontSize: 30, color: DIM }),
        shape('ellipse', 760, 130, 460, 460, '#1e1212', { stroke: GOLD, strokeWidth: 3 }),
        ...clock(990, 360, 190),
        after(img(HAND, 770, 140, 440, 440, 'Aguja del reloj del compás'), 'spin360', { duration: 4000, ...snd(compas(180)) })],
        notes: 'Al llegar, la aguja da una vuelta completa en cuatro segundos mientras suenan los doce tiempos de la soleá con palmas: los acentos (en rojo) suenan más fuerte. Volved a la diapositiva para repetirlo.' },
      { title: 'Palos y compases', layout: 'titleOnly', bg: BG, extra: [
        dg('hierarchy', 'El cante flamenco\n  Compás binario\n    Tangos · rumba · farruca\n  Compás ternario\n    Fandangos · sevillanas\n  Amalgama de doce\n    Soleá · alegrías · bulerías', 80, 180, 1120, 430, { oneByOne: true, colors: 'accent' }),
        text('Cada estilo de cante se llama «palo». La seguiriya también es de doce, pero se cuenta de otra manera.', 80, 625, 1120, 50, { fontSize: 21, color: DIM, textAlign: 'center' })],
        notes: 'El árbol aparece rama a rama. Hoy nos centramos en la amalgama de doce tiempos, la más característica del flamenco.' },
      { title: 'Cuenta conmigo', layout: 'titleOnly', bg: BG, back: [dots(0, 560, 1280, 160, 9, 18, RED, 25)], extra: [
        ...Array.from({ length: 12 }, (_, i) => { const k = i + 1, acc = ACC.includes(k);
          return withAnims(shape('rounded', 80 + i * 95, 210, 82, 130, acc ? RED : '#2a1b1b', { radius: 10, stroke: acc ? RED : GOLD, strokeWidth: 2, html: String(k), color: acc ? '#ffffff' : DIM, fontSize: acc ? 46 : 32, fontWeight: 700 }),
            A('pulse', { start: i ? 'afterPrev' : 'click', duration: 333, sound: acc ? 'pop' : 'click' })); }),
        mathBlock({ x: 80, y: 380, w: 620, h: 100, fontSize: 46, color: CREAM, latex: '12 = 3 + 3 + 2 + 2 + 2' }),
        text('Dos grupos de tres y tres de dos: por eso el flamenco «cojea» con tanta gracia.', 740, 385, 460, 100, { fontSize: 24, color: DIM }),
        player(compas(150, 2), 80, 510, 520, 'Dos compases de soleá con palmas'),
        text('Cuenta en voz alta y da una palmada fuerte en los números rojos.', 640, 500, 560, 80, { fontSize: 23, color: GOLD, fontStyle: 'italic' })],
        notes: 'Clic: los doce tiempos se encienden uno detrás de otro (clic en los normales, «pop» en los acentos). Contad en voz alta marcando fuerte el 3, 6, 8, 10 y 12. El reproductor repite dos compases más despacio.' },
      { title: 'Palmas sordas y palmas claras', layout: 'titleOnly', bg: BG, extra: [
        ...[['Sordas', 'Manos huecas, dedos juntos. Suenan graves y bajito: acompañan al cante.', 80, b1, wav([[150, 0.3, 0.9, 'thud'], [0, 0.2], [150, 0.3, 0.9, 'thud'], [0, 0.2], [150, 0.3, 0.9, 'thud']])],
          ['Claras', 'Tres dedos sobre la palma abierta. Suenan agudas y fuertes: marcan el compás.', 680, b2, wav([[1, 0.25, 0.95, 'noise'], [0, 0.25], [1, 0.25, 0.95, 'noise'], [0, 0.25], [1, 0.25, 0.95, 'noise']])]].flatMap(([n, t, x, b, s]) => [
          shape('rounded', x, 180, 520, 420, '#221515', { radius: 18, stroke: GOLD, strokeWidth: 2 }),
          withAnims(text(n, x + 40, 210, 440, 90, { fontFamily: AB, fontSize: 64, color: n === 'Claras' ? RED : GOLD }), A('jump', { trigger: b.id, duration: 600, ...snd(s) })),
          text(t, x + 40, 320, 440, 130, { fontSize: 26, color: CREAM, lineHeight: 1.4 }),
          b, text('Escúchalas', x + 140, 492, 300, 40, { fontSize: 22, color: DIM })])],
        notes: 'Cada botón ▶ hace sonar tres palmas de su tipo y el título salta. Se puede pulsar cuantas veces se quiera. Primero practicamos las sordas en todos los tiempos.' },
      { title: 'Ahora, con los pies', layout: 'titleOnly', bg: BG, back: floor(), extra: [
        shape('ellipse', 140, 590, 420, 70, '#000000', { opacity: 45 }),
        model('three-RobotExpressive', 130, 150, 440, 500, { clip: 'Dance', view: 'front' }),
        text(ul('En los acentos, un golpe de pie: el <b>zapateado</b>', 'En los demás tiempos, palmas sordas', 'Empezad despacio: 120 pulsos por minuto', 'Cuando salga, subid poco a poco'), 640, 190, 570, 330, { fontSize: 28, color: CREAM }),
        text('Hasta un robot le coge el aire con práctica.', 640, 540, 570, 50, { fontSize: 24, color: GOLD, fontStyle: 'italic' })],
        notes: 'El robot 3D baila sin parar mientras practicamos. Se puede girar arrastrándolo. Repartir la clase: la mitad palmas sordas, la otra mitad pies en los acentos.' },
      { title: '¿A qué velocidad?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 70, y: 180, w: 640, h: 440, chartType: 'hbar', color: RED, dataLabels: true, grid: true, labelColor: DIM, xTitle: 'pulsos por minuto',
          data: [['Soleá', 120], ['Soleá por bulerías', 150], ['Alegrías', 165], ['Bulerías', 220]].map(([label, value]) => ({ label, value })) }),
        mathBlock({ x: 760, y: 190, w: 440, h: 100, fontSize: 38, color: CREAM, latex: 't = \\dfrac{12 \\cdot 60}{\\text{ppm}}' }),
        on(mathBlock({ x: 760, y: 320, w: 440, h: 80, fontSize: 32, color: GOLD, latex: '\\text{Soleá: } \\tfrac{720}{120} = 6\\ \\text{s}' }), 'fade-left'),
        on(mathBlock({ x: 760, y: 420, w: 440, h: 80, fontSize: 32, color: RED, latex: '\\text{Bulerías: } \\tfrac{720}{220} \\approx 3{,}3\\ \\text{s}' }), 'fade-left'),
        text('Velocidades aproximadas: cada artista elige la suya.', 760, 540, 440, 70, { fontSize: 21, color: DIM })],
        notes: 'La ecuación da cuánto dura un compás de doce tiempos. Una bulería va casi el doble de rápido que una soleá. Valores orientativos.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿En qué tiempos van los acentos de la soleá?', ['1, 4, 7 y 10', '3, 6, 8, 10 y 12', 'Solo en el 12', 'En todos los pares'], 1)],
        notes: 'Concurso desde el móvil. Quien elija «todos los pares» se ha dejado el 3 y le sobran el 2 y el 4.' },
      { layout: 'blank', bg: BG, back: [dots(0, 0, 1280, 720, 21, 60, RED, 20)], transition: 'zoom', extra: [
        text('¡Olé!', 80, 120, 640, 220, { fontFamily: AB, fontSize: 180, wordart: 'fire', textAlign: 'center' }),
        text('Por parejas: una persona cuenta y marca con palmas claras; la otra hace los acentos con los pies. Después, cambiad.', 120, 380, 560, 160, { fontSize: 28, color: CREAM, lineHeight: 1.4, textAlign: 'center' }),
        shape('ellipse', 780, 160, 400, 400, '#1e1212', { stroke: GOLD, strokeWidth: 3 }),
        ...clock(980, 360, 160, false),
        timer(180, 900, 280, 160, { color: GOLD, endText: '¡Olé!' })],
        notes: 'Cierre con Text Art de fuego y tres minutos de práctica por parejas, con el reloj del compás a la vista para no perderse.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 8 · Instruments in a cabinet of curiosities: kraft board, pinned specimen cards with our own
  // drawings, the five families by what vibrates, each one heard, a piano to play, a scatter.
  edu_art_instruments: { name: 'Las familias de instrumentos', cat: 'edu', summary: 'Vitrina de curiosidades: fichas clavadas con dibujos, árbol uno a uno, cada familia suena, piano que se toca, dispersión, tabla y emparejar', make: () => {
    const KRAFT = '#e6d8bd', CARD = '#fffaf0', GREEN = '#1f4d3a', BROWN = '#7a5230', PIN = '#c0392b', DIM = '#6d5c45', M = FF.courier;
    const SVG = {
      xylo: svgURL(200, 200, `<rect x="20" y="58" width="160" height="10" fill="${BROWN}"/><rect x="20" y="138" width="160" height="10" fill="${BROWN}"/>`
        + ['#e04f5f', '#f28c28', '#f2c230', '#5cb85c', '#3a8dde', '#8e5cc9'].map((c, i) => `<rect x="${28 + i * 25}" y="${44 + i * 6}" width="20" height="${118 - i * 12}" rx="4" fill="${c}"/>`).join('')
        + `<line x1="60" y1="190" x2="110" y2="110" stroke="${BROWN}" stroke-width="5"/><circle cx="112" cy="106" r="9" fill="#333"/><line x1="140" y1="192" x2="150" y2="118" stroke="${BROWN}" stroke-width="5"/><circle cx="151" cy="113" r="9" fill="#333"/>`),
      drum: svgURL(200, 200, `<rect x="40" y="68" width="120" height="100" fill="#b5442f"/><ellipse cx="100" cy="168" rx="60" ry="16" fill="#8a3322"/>`
        + `<path d="M40 76 L64 160 L88 76 L112 160 L136 76 L160 160" fill="none" stroke="#f6e7c8" stroke-width="3"/><ellipse cx="100" cy="68" rx="60" ry="17" fill="#f3e3c3" stroke="${BROWN}" stroke-width="4"/>`),
      harp: svgURL(200, 200, `<path d="M52 186 L52 22" stroke="${BROWN}" stroke-width="12" stroke-linecap="round"/><path d="M52 26 Q110 6 162 92" fill="none" stroke="${BROWN}" stroke-width="10" stroke-linecap="round"/>`
        + `<path d="M58 186 L162 92" stroke="${BROWN}" stroke-width="12" stroke-linecap="round"/>`
        + Array.from({ length: 8 }, (_, i) => { const x = 66 + i * 12, t = (x - 52) / 110, yt = 26 + t * t * 66 - 2 * t * 6, yb = 186 - (x - 58) * 0.9; return `<line x1="${x}" y1="${yt.toFixed(0)}" x2="${x}" y2="${yb.toFixed(0)}" stroke="#d9c38a" stroke-width="2"/>`; }).join('')),
      flute: svgURL(200, 200, `<polygon points="90,26 110,26 115,188 85,188" fill="#e9d2a6" stroke="${BROWN}" stroke-width="3"/><rect x="88" y="14" width="24" height="18" rx="6" fill="#e9d2a6" stroke="${BROWN}" stroke-width="3"/>`
        + `<rect x="94" y="40" width="12" height="7" fill="${BROWN}"/>` + [72, 90, 108, 126, 144, 162].map(y => `<circle cx="100" cy="${y}" r="4.5" fill="${BROWN}"/>`).join('')),
      synth: svgURL(200, 200, `<rect x="16" y="70" width="168" height="90" rx="8" fill="#2c2f36"/>` + ['#e04f5f', '#f2c230', '#3a8dde', '#5cb85c'].map((c, i) => `<circle cx="${40 + i * 30}" cy="90" r="9" fill="${c}"/>`).join('')
        + `<rect x="150" y="80" width="22" height="22" fill="#5cb85c"/>` + Array.from({ length: 10 }, (_, i) => `<rect x="${24 + i * 15.4}" y="112" width="14" height="40" fill="#ffffff"/>`).join('')
        + [0, 1, 3, 4, 5, 7, 8].map(i => `<rect x="${34 + i * 15.4}" y="112" width="9" height="24" fill="#111"/>`).join('')) };
    const FAM = [['xylo', 'Idiófono', 'Xilófono', 'Vibra el propio instrumento', wav([[hz('C6'), 0.9, 0.6, 'sine']], { decay: 5 })],
      ['drum', 'Membranófono', 'Tambor', 'Vibra una membrana tensa', wav([[120, 0.8, 0.9, 'thud']])],
      ['harp', 'Cordófono', 'Arpa', 'Vibran cuerdas tensas', wav([[hz('A3'), 1.4, 0.6, 'pluck'], [0, 0.01]], { decay: 2 })],
      ['flute', 'Aerófono', 'Flauta dulce', 'Vibra una columna de aire', wav([[hz('A5'), 1, 0.45, 'sine']], { decay: 0.3 })],
      ['synth', 'Electrófono', 'Sintetizador', 'El sonido nace de la electricidad', wav([[hz('A3'), 1, 0.35, 'saw']], { decay: 0.4 })]];
    const pin = (x, y) => shape('ellipse', x, y, 18, 18, PIN, { shadow: { x: 1, y: 2, blur: 3, color: '#00000055' } });
    const specimen = (k, n, x, y, w = 200, h = 240, rot = 0) => [shape('rect', x, y, w, h, CARD, { rotation: rot, shadow: { x: 2, y: 5, blur: 10, color: '#00000030' } }),
      img(SVG[k], x + (w - 150) / 2, y + 18, 150, 150, n, { rotation: rot }), text(n, x, y + h - 58, w, 40, { fontFamily: M, fontSize: 18, color: GREEN, textAlign: 'center', fontWeight: 700, rotation: rot }), pin(x + w / 2 - 9, y + 6)];
    // A piano octave (C4–C5): white and black keys that play when clicked.
    const W = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], WN = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'], BK = [[0, 'C#4', 'Do#'], [1, 'D#4', 'Re#'], [3, 'F#4', 'Fa#'], [4, 'G#4', 'Sol#'], [5, 'A#4', 'La#']];
    const wkeys = W.map((n, i) => shape('rect', 200 + i * 110, 230, 108, 330, '#ffffff', { stroke: '#2b2b2b', strokeWidth: 2 }));
    const bkeys = BK.map(([i]) => shape('rect', 200 + (i + 1) * 110 - 33, 230, 64, 205, '#1d1d1d'));
    const key = n => wav([[hz(n), 1.1, 0.6, 'pluck']], { decay: 2.5 });
    return numbered(build({ name: 'Las familias de instrumentos', palette: 'forest', fonts: 'editorial', title: { color: GREEN, size: 48 }, body: { color: '#2d2416' },
      decor: () => [shape('rect', 0, 0, 1280, 720, 'none', { stroke: BROWN, strokeWidth: 14 })] }, [
      { layout: 'blank', bg: KRAFT, extra: [
        card(`<div style="font-family:${M};font-size:18px;letter-spacing:3px;color:${PIN};font-weight:700">MÚSICA · 2.º DE ESO</div><div style="font-family:${FF.merri};font-size:52px;font-weight:700;line-height:1.15;color:${GREEN};margin-top:12px">¿Qué es lo que vibra?</div><div style="margin-top:14px">Las familias de instrumentos según cómo nace su sonido</div>`,
          70, 170, 470, 330, CARD, { color: '#2d2416', fontSize: 26, radius: 4, pad: [30, 32, 30, 32], shadow: { x: 3, y: 8, blur: 16, color: '#00000035' } }),
        pin(296, 178),
        ...specimen('xylo', 'XILÓFONO', 590, 70, 200, 240, -3), ...specimen('drum', 'TAMBOR', 820, 80, 200, 240, 2), ...specimen('harp', 'ARPA', 1040, 66, 200, 240, -2),
        ...specimen('flute', 'FLAUTA DULCE', 700, 380, 200, 240, 3), ...specimen('synth', 'SINTETIZADOR', 935, 390, 200, 240, -2)],
        notes: 'Portada: una vitrina con cinco fichas clavadas, una por familia (dibujos propios). Pregunta: ¿qué tienen en común un tambor y una flauta? Que algo vibra… pero no lo mismo.' },
      { title: 'Cinco familias según lo que vibra', layout: 'titleOnly', bg: KRAFT, extra: [
        dg('hierarchy', 'Instrumentos\n  Idiófonos\n    El propio cuerpo\n  Membranófonos\n    Una membrana\n  Cordófonos\n    Cuerdas\n  Aerófonos\n    El aire\n  Electrófonos\n    La electricidad', 70, 180, 1140, 420, { oneByOne: true, fontScale: 1.5 }),
        text('Clasificación de Hornbostel y Sachs (1914), ampliada después con los electrófonos.', 70, 620, 1140, 40, { fontFamily: M, fontSize: 18, color: DIM, textAlign: 'center' })],
        notes: 'El árbol aparece rama a rama. Esta clasificación no separa «viento» y «cuerda» como la orquesta: se fija en qué vibra. Por eso el piano es un cordófono.' },
      { title: 'Escucha cada familia', layout: 'titleOnly', bg: KRAFT, extra: [
        ...FAM.flatMap(([k, fam, n, t, s], i) => { const x = 70 + i * 230;
          return [on(shape('rect', x, 190, 210, 420, CARD, { shadow: { x: 2, y: 5, blur: 10, color: '#00000030' } }), 'fade-up', snd(s)),
            along(pin(x + 96, 198), 'fade-up'), along(img(SVG[k], x + 25, 225, 160, 160, n), 'fade-up'),
            along(text(`<span style="font-family:${M};font-size:16px;letter-spacing:1px;color:${PIN}">${fam.toUpperCase()}</span><br><b>${n}</b><br><span style="font-size:21px;color:${DIM}">${t}</span>`, x + 10, 400, 190, 200, { fontSize: 27, color: '#2d2416', textAlign: 'center' }), 'fade-up')]; })],
        notes: 'Cinco clics: cada ficha aparece con su sonido (sintetizado dentro de la presentación: aproximaciones, no grabaciones). Pedir que describan la diferencia: ¿cuál dura más? ¿cuál empieza más fuerte?' },
      { title: 'Toca el piano', layout: 'titleOnly', bg: KRAFT, extra: [
        shape('rect', 180, 200, 920, 380, '#3b2414', { radius: 10 }),
        ...wkeys, ...bkeys,
        ...W.map((n, i) => withAnims(text(WN[i], 200 + i * 110, 595, 108, 40, { fontSize: 26, fontWeight: 700, color: GREEN, textAlign: 'center' }), A('jump', { trigger: wkeys[i].id, duration: 500, ...snd(key(n)) }))),
        ...BK.map(([i, n, nm], j) => withAnims(text(nm, 200 + (i + 1) * 110 - 45, 155, 88, 36, { fontSize: 20, fontWeight: 700, color: BROWN, textAlign: 'center' }), A('jump', { trigger: bkeys[j].id, duration: 500, ...snd(key(n)) }))),
        text('Un martillo golpea una cuerda: es un <b>cordófono</b> de teclado.', 180, 645, 920, 40, { fontSize: 22, color: DIM, textAlign: 'center' })],
        notes: 'Al presentar, cada tecla es un botón: suena su nota y su nombre salta. Una octava de do a do. Probad «Cumpleaños feliz»: sol sol la sol do si.' },
      { title: 'Más grande, más grave', layout: 'titleOnly', bg: KRAFT, extra: [
        chartBlock({ x: 70, y: 170, w: 760, h: 480, chartType: 'scatter', color: GREEN, grid: true, dataLabels: true, labelColor: DIM, xTitle: 'Longitud total (cm)', yTitle: 'Nota más grave (Hz)', xMin: 40, xMax: 200, yMin: 0, yMax: 220,
          data: [['Violín', 59, 196], ['Viola', 67, 131], ['Violonchelo', 124, 65], ['Contrabajo', 185, 41]].map(([name, x, y]) => ({ label: String(x), value: y, name })) }),
        card('La familia de la cuerda frotada: cuanto más largas y gruesas las cuerdas, más lentas vibran y más grave suenan.', 870, 190, 340, 250, CARD, { color: '#2d2416', fontSize: 24, radius: 4, lineHeight: 1.4 }),
        text('Medidas aproximadas de instrumentos de tamaño adulto.', 870, 470, 340, 70, { fontFamily: M, fontSize: 17, color: DIM })],
        notes: 'Gráfico de dispersión: longitud frente a la nota más grave (sol del violín, do de la viola y del violonchelo, mi del contrabajo). Valores orientativos.' },
      { title: 'Instrumentos del mundo', layout: 'titleOnly', bg: KRAFT, extra: [
        tableBlock({ x: 70, y: 180, w: 1140, h: 440, fontSize: 23, header: true, headBg: GREEN, headFg: CARD, stroke: '#cdbb98', banded: true, band: '#ffffff', bandAlpha: 0.45, colW: [3, 4, 3, 5],
          rows: [['Instrumento', 'De dónde es', 'Familia', 'Qué vibra'], ['Djembé', 'África occidental', 'Membranófono', 'Una piel de cabra tensa'], ['Sitar', 'India', 'Cordófono', 'Hasta 20 cuerdas'],
            ['Gaita gallega', 'Galicia', 'Aerófono', 'El aire del fol, en el puntero y los roncones'], ['Txalaparta', 'País Vasco', 'Idiófono', 'Tablones golpeados con palos'], ['Theremín', 'Rusia, 1920', 'Electrófono', 'Un circuito: se toca sin tocarlo']] })],
        notes: 'Repasar la tabla preguntando antes de leer la tercera columna: ¿a qué familia pertenece? El theremín se toca acercando las manos a dos antenas.' },
      { layout: 'blank', bg: KRAFT, extra: [pollBlock({ kind: 'match', question: 'Une cada instrumento con su familia', fontSize: 30, x: 80, y: 60, w: 1120, h: 600,
        options: ['Cajón = idiófono', 'Pandero = membranófono', 'Violín = cordófono', 'Trompeta = aerófono', 'Guitarra eléctrica = electrófono'] })],
        notes: 'Actividad de relacionar desde el móvil. Ojo: el cajón no tiene membrana, vibra la madera (idiófono). La guitarra eléctrica se discute: sus cuerdas vibran, pero el sonido que oímos sale de un amplificador.' },
      { title: 'Fabrica tu instrumento', layout: 'titleOnly', bg: KRAFT, transition: 'zoom', extra: [
        ...[['Maracas', 'Botella y arroz', 'Idiófono', 'sparkles'], ['Tambor', 'Lata y un globo', 'Membranófono', 'target'], ['Guitarra de caja', 'Caja y gomas', 'Cordófono', 'music'], ['Flauta de pan', 'Pajitas de distintos largos', 'Aerófono', 'wind']].flatMap(([n, m, f, ic], i) => { const x = 70 + i * 290;
          return [on(shape('rect', x, 190, 270, 330, CARD, { shadow: { x: 2, y: 5, blur: 10, color: '#00000030' } }), 'fade-up'), along(pin(x + 126, 198), 'fade-up'),
            along(icon(ic, x + 95, 240, 80, GREEN), 'fade-up'),
            along(text(`<b>${n}</b><br>${m}<br><span style="font-family:${M};font-size:17px;color:${PIN};letter-spacing:2px">${f.toUpperCase()}</span>`, x + 15, 350, 240, 150, { fontSize: 24, color: '#2d2416', textAlign: 'center' }), 'fade-up')]; }),
        text('Traed el material el jueves: el viernes, concierto de la clase.', 70, 560, 1140, 50, { fontSize: 26, color: GREEN, textAlign: 'center', fontWeight: 700 })],
        notes: 'Cuatro fichas, un clic cada una. Cada grupo construye un instrumento de una familia distinta y explica qué vibra.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 9 · The qualities of sound on an oscilloscope: green phosphor on black, waves that draw
  // themselves, buttons that sound each pitch and timbre, decibels, harmonics, a bit of code.
  edu_art_sound: { name: 'Las cualidades del sonido', cat: 'edu', summary: 'Osciloscopio verde: Text Art neón, ondas que se dibujan, botones que suenan, ecuaciones, decibelios, armónicos y código por pasos', make: () => {
    const BG = '#06120c', SCR = '#0b1f16', PH = '#39ff88', AMB = '#ffb347', DIM = '#7fae95', TX = '#d9ffe9', CY = '#5ad7ff', Mo = FF.mono;
    // A wave as a shape of our own (so «Draw» traces it): a function of the phase over some cycles.
    const waveShape = (fn, cycles, x, y, w, h, color, width = 4, amp = 1) => { const n = 240;
      const d = 'M' + Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return `${(t * 100).toFixed(2)} ${(50 - 46 * amp * fn((t * cycles) % 1)).toFixed(2)}`; }).join(' L');
      return shape('custom', x, y, w, h, 'none', { path: d, stroke: color, strokeWidth: width }); };
    const SIN = p => Math.sin(2 * Math.PI * p), SQ = p => (p < 0.5 ? 0.8 : -0.8) * 1, SAW = p => 2 * p - 1;
    const screen = (x, y, w, h) => [shape('rounded', x, y, w, h, SCR, { radius: 14, stroke: '#1e4a35', strokeWidth: 3 }),
      img(svgURL(w, h, Array.from({ length: 11 }, (_, i) => `<line x1="${i * w / 10}" y1="0" x2="${i * w / 10}" y2="${h}" stroke="${PH}" stroke-opacity="${i === 5 ? 0.25 : 0.09}"/>`).join('')
        + Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * h / 6}" x2="${w}" y2="${i * h / 6}" stroke="${PH}" stroke-opacity="${i === 3 ? 0.25 : 0.09}"/>`).join('')), x, y, w, h, 'Cuadrícula del osciloscopio', { fit: 'fill', decorative: true })];
    const btn = (x, y, c = PH) => shape('ellipse', x, y, 56, 56, c, { html: '▶', fontSize: 22, color: BG, fontWeight: 700 });
    const lab = (t, x, y, w, c = DIM, p = {}) => text(t, x, y, w, 34, { fontFamily: Mo, fontSize: 19, color: c, ...p });
    const tone = (f, w = 'sine', v = 0.6, d = 1.2) => wav([[f, d, v, w]], { decay: 0.4 });
    const bP = [btn(90, 300), btn(90, 520)], bI = [btn(917, 470, AMB), btn(1087, 470, AMB)], bT = [btn(90, 210), btn(90, 365), btn(90, 520)], bC = btn(1050, 560, PH);
    return numbered(build({ name: 'Las cualidades del sonido', palette: 'ocean', fonts: 'tech', title: { color: PH, size: 50 }, body: { color: TX }, decor: () => [] }, [
      { layout: 'blank', bg: BG, back: [glow(560, -200, 900, '#0f3a25', BG, 70)], extra: [
        lab('MÚSICA Y FÍSICA · 2.º DE ESO', 84, 170, 520, PH, { letterSpacing: 3, fontWeight: 700 }),
        text('SONIDO', 76, 210, 560, 150, { fontSize: 120, fontWeight: 700, wordart: 'neon', wordartColor: PH }),
        text('Altura, intensidad, duración y timbre: lo que diferencia un sonido de otro', 84, 380, 500, 120, { fontSize: 28, color: TX, lineHeight: 1.35 }),
        ...screen(640, 140, 560, 400),
        after(waveShape(SIN, 4, 660, 190, 520, 300, PH, 5), 'draw', { duration: 1600, ...snd(tone(440, 'sine', 0.5, 1.6)) }),
        lab('CH1 · 440 Hz · 2 ms/div', 660, 552, 520, DIM, { textAlign: 'right' })],
        notes: 'Al llegar, la onda se dibuja en el osciloscopio mientras suena un La de 440 Hz (generado en la propia presentación). Es el La con el que afina una orquesta.' },
      { title: '¿Qué es el sonido?', layout: 'titleOnly', bg: BG, extra: [
        icon('volume-2', 80, 250, 120, PH),
        img(svgURL(560, 200, Array.from({ length: 34 }, (_, c) => { const x = 10 + c * 16 + 7 * Math.sin(c * 0.75); return Array.from({ length: 9 }, (_, r) => `<circle cx="${x.toFixed(1)}" cy="${12 + r * 22}" r="3.6" fill="${PH}" opacity="${(0.45 + 0.4 * Math.cos(c * 0.75)).toFixed(2)}"/>`).join(''); }).join('')),
          230, 210, 560, 200, 'Partículas de aire apretadas y separadas: la onda sonora'),
        lab('compresión', 230, 420, 200), lab('enrarecimiento', 470, 420, 220),
        text('Algo vibra y empuja el aire: las partículas se aprietan y se separan, y esa onda llega a tu oído.', 830, 200, 380, 200, { fontSize: 25, color: TX, lineHeight: 1.4 }),
        mathBlock({ x: 830, y: 420, w: 380, h: 90, fontSize: 40, color: PH, latex: 'v = \\lambda \\cdot f' }),
        ...[['Aire', '343 m/s'], ['Agua', '1.480 m/s'], ['Acero', '5.900 m/s']].map(([m, v], i) => on(card(`<span style="font-family:${Mo};font-size:30px;color:${AMB}">${v}</span><br>${m}`, 80 + i * 250, 500, 230, 120, '#ffffff0d', { color: TX, fontSize: 22, textAlign: 'center', radius: 10 }), 'fade-up'))],
        notes: 'El sonido necesita un medio: en el vacío no se propaga. Tres clics: velocidad en aire (a 20 °C), agua y acero. En los sólidos va mucho más rápido.' },
      { title: 'Altura: grave o agudo', layout: 'titleOnly', bg: BG, extra: [
        ...screen(170, 180, 620, 210), withAnims(waveShape(SIN, 3, 190, 200, 580, 170, PH, 4), A('pulse', { trigger: bP[0].id, duration: 900, ...snd(tone(220)) })), lab('220 Hz · grave', 180, 395, 300),
        ...screen(170, 440, 620, 210), withAnims(waveShape(SIN, 6, 190, 460, 580, 170, CY, 4), A('pulse', { trigger: bP[1].id, duration: 900, ...snd(tone(440)) })), lab('440 Hz · agudo', 180, 655, 300),
        ...bP,
        text('La <b>frecuencia</b>: cuántas vibraciones por segundo. Más rápido, más agudo.', 830, 190, 380, 150, { fontSize: 25, color: TX, lineHeight: 1.4 }),
        mathBlock({ x: 830, y: 360, w: 380, h: 100, fontSize: 44, color: PH, latex: 'f = \\dfrac{1}{T}' }),
        text('Oímos de 20 a 20.000 Hz. Un perro, hasta 45.000.', 830, 490, 380, 90, { fontSize: 22, color: DIM })],
        notes: 'Botones ▶: cada uno hace sonar su onda. La segunda tiene el doble de ciclos en el mismo tiempo: es la misma nota una octava más aguda.' },
      { title: 'Intensidad: fuerte o suave', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 70, y: 170, w: 760, h: 490, chartType: 'hbar', color: AMB, dataLabels: true, grid: true, labelColor: DIM, xTitle: 'decibelios (dB)',
          data: [['Respiración', 10], ['Susurro', 30], ['Conversación', 60], ['Aula ruidosa', 75], ['Tráfico intenso', 85], ['Concierto de rock', 110], ['Avión despegando', 130]].map(([label, value]) => ({ label, value })) }),
        card('A partir de <b>85 dB</b> durante horas, el oído se daña sin avisar.', 870, 190, 340, 170, '#ff6b5a22', { color: TX, fontSize: 24, radius: 10, borderColor: '#ff6b5a' }),
        withAnims(waveShape(SIN, 2, 870, 375, 150, 80, AMB, 4, 0.3), A('pulse', { trigger: bI[0].id, duration: 900, ...snd(tone(330, 'sine', 0.12)) })),
        withAnims(waveShape(SIN, 2, 1040, 375, 150, 80, AMB, 4, 1), A('pulse', { trigger: bI[1].id, duration: 900, ...snd(tone(330, 'sine', 0.9)) })),
        ...bI, lab('suave', 870, 535, 150, DIM, { textAlign: 'center' }), lab('fuerte', 1040, 535, 150, DIM, { textAlign: 'center' })],
        notes: 'Valores típicos aproximados. La intensidad es la amplitud de la onda: misma nota, olas más altas. Botones ▶: la misma nota suave y fuerte.' },
      { title: 'Timbre: la huella de cada sonido', layout: 'titleOnly', bg: BG, extra: [
        ...[[SIN, 'Diapasón', 'Onda pura, sin armónicos', 'sine'], [SQ, 'Clarinete', 'Armónicos impares: sonido hueco', 'square'], [SAW, 'Violín', 'Todos los armónicos: sonido rico', 'saw']].flatMap(([fn, n, t, w], i) => [
          ...screen(170, 180 + i * 155, 560, 135), withAnims(waveShape(fn, 4, 185, 195 + i * 155, 530, 105, [PH, CY, AMB][i], 4, 0.85), A('pulse', { trigger: bT[i].id, duration: 900, ...snd(tone(262, w, 0.45)) })),
          text(`<b>${n}</b><br><span style="color:${DIM}">${t}</span>`, 760, 195 + i * 155, 440, 110, { fontSize: 25, color: TX, vAlign: 'middle' })]),
        ...bT],
        notes: 'La misma nota (do de 262 Hz) con tres timbres. La forma de la onda cambia aunque la frecuencia sea igual: por eso distinguimos una flauta de un violín. Las ondas son simplificaciones.' },
      { title: 'Los armónicos de un La', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 70, y: 170, w: 800, h: 490, chartType: 'bar', color: CY, seriesName: 'Flauta', grid: true, labelColor: DIM, xTitle: 'frecuencia (Hz)', yTitle: 'intensidad (%)', yMin: 0, yMax: 100,
          data: [100, 45, 20, 8, 4, 2, 1, 0].map((v, i) => ({ label: String(220 * (i + 1)), value: v })), series: [{ name: 'Violín', color: AMB, values: [100, 80, 65, 50, 42, 30, 25, 18] }] }),
        text('Cada nota es un sonido principal y muchos «hermanos» más agudos: 2, 3, 4… veces su frecuencia.', 910, 190, 300, 220, { fontSize: 24, color: TX, lineHeight: 1.4 }),
        text('Datos ilustrativos, no de una medida real.', 910, 430, 300, 60, { fontSize: 19, color: DIM })],
        notes: 'La flauta tiene pocos armónicos (sonido dulce); el violín, muchos (sonido brillante). Los valores son orientativos para comparar.' },
      { title: 'Fabrica un sonido con código', layout: 'titleOnly', bg: BG, extra: [
        codeBlock({ x: 70, y: 170, w: 720, h: 470, fontSize: 21, lang: 'javascript', lineSteps: '1-2|3|4|5-7|8-9',
          code: "const ctx = new AudioContext();\nconst osc = ctx.createOscillator();\nosc.type = 'square';        // timbre\nosc.frequency.value = 440;  // altura (Hz)\nconst vol = ctx.createGain();\nvol.gain.value = 0.2;       // intensidad\nosc.connect(vol).connect(ctx.destination);\nosc.start();\nosc.stop(ctx.currentTime + 1.5); // duración (s)" }),
        ...[['timbre', 'type', CY], ['altura', 'frequency', PH], ['intensidad', 'gain', AMB], ['duración', 'stop', '#ff8fab']].map(([q, k, c], i) =>
          text(`<b style="color:${c}">${q}</b> <span style="color:${DIM}">→ ${k}</span>`, 830, 190 + i * 70, 380, 50, { fontFamily: Mo, fontSize: 24, color: TX })),
        bC, lab('Escúchalo', 1120, 572, 120, DIM),
        withAnims(text('♪ 440 Hz · cuadrada · 1,5 s', 830, 480, 380, 40, { fontFamily: Mo, fontSize: 20, color: PH }), A('pulse', { trigger: bC.id, duration: 1500, ...snd(wav([[440, 1.5, 0.2, 'square']], { decay: 0.05 })) }))],
        notes: 'El código se ilumina por pasos: crear el oscilador, timbre, altura, volumen y duración. Las cuatro cualidades son cuatro líneas. El botón ▶ hace sonar exactamente ese sonido.' },
      { layout: 'blank', bg: BG, extra: [quiz('Si una cuerda vibra el doble de rápido, su sonido es…', ['Más fuerte', 'Más agudo', 'Más largo', 'Más grave'], 1)],
        notes: 'Concurso. Doble de frecuencia = una octava más aguda. La fuerza depende de la amplitud, no de la rapidez.' },
      { layout: 'blank', bg: BG, back: [glow(700, 200, 800, '#0f3a25', BG, 60)], transition: 'zoom', extra: [
        text('MAPA DEL RUIDO', 84, 130, 700, 100, { fontSize: 76, fontWeight: 700, wordart: 'neon', wordartColor: AMB }),
        text(ul('Descargad un sonómetro gratuito en el móvil', 'Medid 30 s en el patio, el comedor y la biblioteca', 'Anotad el máximo y la media en dB', 'Dibujad el plano del instituto con colores'), 84, 260, 700, 300, { fontSize: 28, color: TX }),
        timer(300, 880, 230, 300, { style: 'digital', h: 110, color: PH, endText: '¡A medir!' })],
        notes: 'Proyecto de cierre: cinco minutos para organizar los grupos y salir a medir. Con los datos haremos un gráfico de barras en la próxima clase.' },
    ]));
  } },

  // ---------------------------------------------------------------------------------------
  // 10 · Vivaldi's Four Seasons in a Venetian salon: violet damask and gold, a wheel of seasons
  // with curved text and the spring tune to play, a sonnet, spring that grows with Transform.
  edu_art_vivaldi: { name: 'Vivaldi: Las cuatro estaciones', cat: 'edu', summary: 'Salón veneciano: rueda con texto curvo y melodía, soneto, primavera que crece con Transformar, pájaros y tormenta que suenan y votación', make: () => {
    const BG = '#2a0f2e', GOLD = '#d4af6a', CREAM = '#f5ecd9', DIM = '#cbb8c9', SPR = '#8fc46a', SUM = '#f2b134', AUT = '#c8623a', WIN = '#7fb3d5', C = FF.cormorant;
    const DAMASK = svgURL(1280, 720, Array.from({ length: 7 * 12 }, (_, i) => { const x = (i % 12) * 116 + ((Math.floor(i / 12) % 2) ? 58 : 0), y = Math.floor(i / 12) * 110 + 30;
      return `<g transform="translate(${x} ${y})" fill="${GOLD}" opacity="0.07"><ellipse cx="0" cy="-18" rx="8" ry="18"/><ellipse cx="0" cy="18" rx="8" ry="18"/><ellipse cx="-18" cy="0" rx="18" ry="8"/><ellipse cx="18" cy="0" rx="18" ry="8"/><circle r="6"/></g>`; }).join(''));
    // A quarter of a disc, its corner at the wheel's centre: tl, tr, br, bl.
    const Q = { tl: 'M100 100 L0 100 A100 100 0 0 1 100 0 Z', tr: 'M0 100 L0 0 A100 100 0 0 1 100 100 Z', br: 'M0 0 L100 0 A100 100 0 0 1 0 100 Z', bl: 'M100 0 L100 100 A100 100 0 0 1 0 0 Z' };
    const SEAS = [['tl', SPR, 'flower', 'Primavera'], ['tr', SUM, 'sun', 'Verano'], ['br', AUT, 'leaf', 'Otoño'], ['bl', WIN, 'snowflake', 'Invierno']];
    const wheel = (cx, cy, R, ids = {}) => SEAS.flatMap(([q, c, ic], i) => { const x = q === 'tl' || q === 'bl' ? cx - R : cx, y = q === 'tl' || q === 'tr' ? cy - R : cy;
      const s = shape('custom', x, y, R, R, c, { path: Q[q], stroke: BG, strokeWidth: 4 }); const sz = R * 0.34;
      return [ids[q] ? keep(s, ids[q]) : s, icon(ic, x + (q === 'tl' || q === 'bl' ? R * 0.42 : R * 0.24), y + (q === 'tl' || q === 'tr' ? R * 0.42 : R * 0.24), sz, '#ffffff')]; });
    const W = { tl: uid(), tr: uid(), br: uid(), bl: uid() };
    const SPRING = 'E5:0.5 G#5:0.5 G#5:0.5 G#5:0.5 F#5:0.25 E5:0.25 B5:1.5 B5:0.25 A5:0.25 G#5:0.5 G#5:0.5 G#5:0.5 F#5:0.25 E5:0.25 B5:1.5 B5:0.25 A5:0.25 G#5:0.5 A5:0.5 B5:0.5 A5:0.5 G#5:0.5 F#5:0.5 D#5:1 B4:1';
    const spring = wav(tune(SPRING, 112, 'pluck', 0.55), { decay: 2.2 });
    const birds = wav(Array.from({ length: 14 }, (_, i) => [i % 2 ? hz('C#7') : hz('B6'), 0.07, 0.35, 'sine']).concat([[0, 0.2]], Array.from({ length: 10 }, (_, i) => [i % 2 ? hz('E7') : hz('D7'), 0.06, 0.3, 'sine'])), { decay: 0.5 });
    const brook = wav(Array.from({ length: 24 }, (_, i) => [hz(['E5', 'G#5', 'B5', 'G#5'][i % 4]), 0.09, 0.3, 'sine']), { decay: 6 });
    const storm = wav([[55, 1.2, 0.95, 'thud'], ...Array.from({ length: 12 }, (_, i) => [1, 0.07, 0.9 - i * 0.06, 'noise']), [hz('E4'), 0.1, 0.5, 'saw'], [hz('E4'), 0.1, 0.5, 'saw'], [hz('E4'), 0.1, 0.5, 'saw'], [hz('E4'), 0.1, 0.5, 'saw']]);
    const chatter = wav(Array.from({ length: 16 }, () => [hz('F4'), 0.12, 0.45, 'saw']).flatMap(n => [n, [0, 0.06]]), { decay: 8 });
    const summer = wav(tune('G4:0.25 G4:0.25 G4:0.25 G4:0.25 Bb4:0.25 Bb4:0.25 Bb4:0.25 Bb4:0.25 D5:0.25 D5:0.25 D5:0.25 D5:0.25 G5:1 F#5:0.25 G5:0.25 A5:0.25 Bb5:0.25 G5:1', 132, 'saw', 0.35), { decay: 3 });
    return numbered(build({ name: 'Vivaldi: Las cuatro estaciones', palette: 'violet', fonts: 'classic', title: { font: C, color: GOLD, size: 58 }, body: { color: CREAM },
      decor: () => [img(DAMASK, 0, 0, 1280, 720, 'Fondo de damasco', { fit: 'fill' }), shape('rect', 24, 24, 1232, 672, 'none', { stroke: GOLD, strokeWidth: 2, opacity: 60 })] }, [
      { layout: 'blank', bg: BG, back: [glow(620, 40, 640, '#4a1f52', BG, 80)], extra: [
        text('MÚSICA · 4.º DE ESO', 84, 150, 480, 34, { fontSize: 20, letterSpacing: 5, color: GOLD, fontWeight: 700 }),
        text('Las cuatro<br>estaciones', 78, 190, 560, 220, { fontFamily: C, fontSize: 96, fontWeight: 700, color: CREAM, lineHeight: 1 }),
        text('Antonio Vivaldi · Venecia, 1725', 84, 420, 520, 50, { fontFamily: C, fontSize: 36, fontStyle: 'italic', color: DIM }),
        player(spring, 84, 520, 480, 'Tema de La primavera'),
        text('▲ el tema de «La primavera»', 84, 584, 480, 34, { fontSize: 19, color: DIM }),
        shape('ellipse', 700, 120, 480, 480, 'none', { stroke: GOLD, strokeWidth: 3 }),
        ...wheel(940, 360, 200).map(b => withAnims(b, A('zoom-in', { start: 'afterPrev', duration: 350 }))),
        text('PRIMAVERA · VERANO · OTOÑO · INVIERNO · ', 660, 80, 560, 560, { fontSize: 24, curve: 100, color: GOLD, letterSpacing: 4, textAlign: 'center', fontWeight: 700, rotation: 90 })],
        // (Turned a quarter: each season's name goes round its own quarter of the wheel.)
        notes: 'La rueda de las estaciones se monta sola, cuarto a cuarto; alrededor, texto curvo. El reproductor toca el comienzo de La primavera (una versión sencilla generada en la propia presentación).' },
      { title: 'Antonio Vivaldi, «el cura rojo»', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', '1678\n  Nace en Venecia\n1703\n  Cura y profesor de violín en la Pietà\n1725\n  Publica Las cuatro estaciones\n1741\n  Muere en Viena, pobre y olvidado', 80, 200, 1120, 300, { oneByOne: true, fontScale: 1.1 }),
        text('Lo llamaban así por su pelo pelirrojo. En el Ospedale della Pietà, un orfanato, enseñó a una orquesta de chicas famosa en toda Europa.', 80, 530, 1120, 110, { fontSize: 25, color: CREAM, textAlign: 'center', lineHeight: 1.4 })],
        notes: 'Línea del tiempo de su vida, hito a hito. Su música se olvidó durante casi dos siglos y se recuperó en el siglo XX.' },
      { layout: 'blank', bg: BG, back: [glow(340, 60, 600, '#4a1f52', BG, 70)], transition: 'fade', extra: [
        text('“', 70, 70, 120, 230, { fontFamily: C, fontSize: 220, color: GOLD, lineHeight: 1 }),
        text('Ha llegado la primavera y, festivos, los pájaros la saludan con alegre canto.', 200, 200, 880, 240, { fontFamily: C, fontSize: 56, fontStyle: 'italic', color: CREAM, lineHeight: 1.2 }),
        text('Giunt’è la Primavera e festosetti / la salutan gl’augei con lieto canto', 200, 460, 880, 50, { fontFamily: C, fontSize: 28, color: DIM }),
        text('— Soneto que acompaña a «La primavera» (1725)', 200, 540, 880, 40, { fontSize: 22, color: GOLD })],
        notes: 'Cada concierto se publicó con un soneto que explica qué describe la música: es música programática. El autor del soneto no se conoce con seguridad; quizá el propio Vivaldi.' },
      { title: 'Cuatro conciertos, doce movimientos', layout: 'titleOnly', bg: BG, extra: [
        ...wheel(320, 420, 180, W),
        tableBlock({ x: 580, y: 190, w: 620, h: 400, fontSize: 21, header: true, headBg: GOLD, headFg: BG, stroke: '#ffffff30', colW: [3, 3, 4, 3],
          rows: [['Concierto', '1.º', '2.º', '3.º'], [`<b style="color:${SPR}">Primavera</b>`, 'Allegro', 'Largo', 'Allegro'], [`<b style="color:${SUM}">Verano</b>`, 'Allegro non molto', 'Adagio · Presto', 'Presto'],
            [`<b style="color:${AUT}">Otoño</b>`, 'Allegro', 'Adagio molto', 'Allegro'], [`<b style="color:${WIN}">Invierno</b>`, 'Allegro non molto', 'Largo', 'Allegro']] }),
        text('Siempre rápido, lento, rápido: la forma del concierto barroco.', 580, 610, 620, 40, { fontSize: 22, color: DIM })],
        notes: 'Cada estación es un concierto para violín y orquesta en tres movimientos. En la siguiente diapositiva, Transformar agranda la primavera.' },
      { title: 'La primavera, de cerca', layout: 'titleOnly', bg: BG, autoAnimate: true, transition: 'fade', extra: [
        keep(shape('custom', 70, 170, 480, 480, SPR, { path: Q.tl, stroke: BG, strokeWidth: 4, opacity: 85 }), W.tl),
        icon('flower', 300, 400, 140, '#ffffff'),
        ...[['bird', 'Los pájaros', 'Trinos rápidos de tres violines solistas', birds], ['waves', 'El arroyo', 'Notas suaves que corren como el agua', brook], ['bolt', 'La tormenta', 'Trémolos y escalas que bajan como rayos', storm]].flatMap(([ic, n, t, s], i) => [
          on(icon(ic, 620, 200 + i * 145, 70, GOLD), 'zoom-in', snd(s)),
          along(text(`<b style="font-family:${C};font-size:36px;color:${CREAM}">${n}</b><br>${t}`, 720, 190 + i * 145, 480, 110, { fontSize: 23, color: DIM }), 'fade-left')])],
        notes: 'Transformar: el cuarto verde de la rueda crece hasta llenar la mitad de la diapositiva. Tres clics: cada imagen sonora del primer movimiento aparece con su sonido (imitaciones sencillas, no la grabación).' },
      { title: 'Rápido, lento, rápido', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 70, y: 170, w: 820, h: 480, chartType: 'line', color: SPR, seriesName: 'Primavera', grid: true, labelColor: DIM, yTitle: 'pulsos por minuto', yMin: 0, yMax: 180,
          data: ['1.º', '2.º', '3.º'].map((label, i) => ({ label, value: [104, 50, 92][i] })),
          series: [{ name: 'Verano', color: SUM, values: [80, 60, 168] }, { name: 'Otoño', color: AUT, values: [108, 40, 100] }, { name: 'Invierno', color: WIN, values: [90, 56, 100] }] }),
        text('Las cuatro líneas dibujan una «V»: el movimiento central es siempre el lento.', 930, 200, 280, 200, { fontSize: 25, color: CREAM, lineHeight: 1.4 }),
        text('Tempos aproximados de una interpretación habitual.', 930, 430, 280, 80, { fontSize: 19, color: DIM })],
        notes: 'Gráfico de líneas con cuatro series. Los valores son aproximados: cada orquesta elige su tempo. El Presto del verano es el más rápido de los doce movimientos.' },
      { title: 'El invierno', layout: 'titleOnly', bg: BG, back: [glow(700, 120, 700, '#23465e', BG, 70)], extra: [
        on(text('Brrr…', 80, 190, 560, 180, { fontFamily: C, fontSize: 150, fontWeight: 700, wordart: 'ice', textAlign: 'center' }), 'zoom-in', snd(chatter)),
        text('Notas repetidas y secas: los dientes que castañetean de frío.', 80, 400, 560, 100, { fontSize: 26, color: CREAM, lineHeight: 1.4, textAlign: 'center' }),
        ...[['snowflake', 'Pies que patean el suelo helado'], ['wind', 'Un viento áspero y desagradable'], ['flame', 'El Largo: junto al fuego, mientras llueve fuera']].map(([ic, t], i) =>
          on(card(`<span style="color:${WIN}">●</span> ${t}`, 700, 200 + i * 130, 500, 100, '#ffffff10', { color: CREAM, fontSize: 24, radius: 12, vAlign: 'middle' }), 'fade-left'))],
        notes: 'Clic: el Text Art de hielo aparece con un castañeteo imitado. Después, tres imágenes del soneto del invierno, una por clic.' },
      { layout: 'blank', bg: BG, extra: [
        pollBlock({ kind: 'choice', question: 'Escucha el fragmento: ¿qué estación crees que es?', options: ['Primavera', 'Verano', 'Otoño', 'Invierno'], display: 'bar', fontSize: 32, x: 70, y: 60, w: 760, h: 600 }),
        player(summer, 880, 300, 330, 'Fragmento misterioso'),
        text('Fragmento misterioso', 880, 250, 330, 40, { fontFamily: C, fontSize: 30, color: GOLD, textAlign: 'center' })],
        notes: 'Votación en directo. El fragmento imita la tormenta de verano (notas repetidas que suben con fuerza). Solución: el verano.' },
      { layout: 'blank', bg: BG, back: [glow(-100, 300, 700, '#4a1f52', BG, 70)], transition: 'zoom', extra: [
        text('Dibuja tu estación', 84, 130, 700, 100, { fontFamily: C, fontSize: 76, fontWeight: 700, color: CREAM }),
        text('Escucha el tema de la primavera con los ojos cerrados y dibuja lo que imaginas: pájaros, agua, tormenta… Después, inventa un soneto de dos versos.', 84, 250, 640, 160, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        player(spring, 84, 450, 480, 'Tema de La primavera'),
        timer(600, 880, 200, 300, { color: GOLD, endText: '¡Mostrad los dibujos!' })],
        notes: 'Diez minutos de cuenta atrás. El reproductor se puede repetir cuantas veces haga falta. Al final, exposición de dibujos agrupados por estación.' },
    ]));
  } },
};
