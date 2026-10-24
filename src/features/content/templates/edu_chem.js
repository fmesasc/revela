// Example presentations: Química para secundaria. Cada una: { name, summary, cat: 'edu', make() } → a deck (see kit.js).
// Todos los dibujos son nuestros (SVG como data URL): átomos con órbitas, partículas, moléculas (bolas y enlaces),
// vasos de precipitado, una tabla periódica estilizada y curvas de calentamiento. No hay imágenes de fuera.

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

// An atom: a coloured nucleus with a label and electron shells (an array of electron counts per orbit).
const atomSVG = (shells, nucleusLabel = '', accent = '#39c0c8', nucColor = '#e07a5f') => svgURL(420, 420, (() => {
  const cx = 210, cy = 210; let s = '';
  shells.forEach((count, ring) => { const r = 70 + ring * 56;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="2" opacity="0.5"/>`;
    for (let e = 0; e < count; e++) { const a = (e / count) * 2 * Math.PI + ring * 0.7; const ex = cx + r * Math.cos(a), ey = cy + r * Math.sin(a);
      s += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="9" fill="#5fd38a" stroke="#0b1016" stroke-width="2"/>`; } });
  s += `<circle cx="${cx}" cy="${cy}" r="46" fill="${nucColor}"/><text x="${cx}" y="${cy + 11}" font-family="sans-serif" font-size="32" font-weight="700" fill="#fff" text-anchor="middle">${nucleusLabel}</text>`;
  return s;
})());
// The particle model of a state of matter: dots packed (solid), loose (liquid) or scattered (gas).
const particlesSVG = (state, color = '#2f6df0') => svgURL(300, 300, (() => {
  const box = `<rect x="10" y="10" width="280" height="280" rx="14" fill="#ffffff" stroke="#9fb0c4" stroke-width="3"/>`; let d = '';
  if (state === 'solid') { for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) d += `<circle cx="${50 + c * 50}" cy="${50 + r * 50}" r="16" fill="${color}"/>`; }
  else if (state === 'liquid') { [[60, 180], [112, 208], [164, 184], [214, 214], [88, 242], [150, 246], [212, 252], [70, 128], [130, 152], [192, 132], [234, 168], [100, 96]].forEach(([x, y]) => d += `<circle cx="${x}" cy="${y}" r="16" fill="${color}"/>`); }
  else { [[48, 62], [162, 42], [242, 92], [92, 150], [202, 172], [58, 242], [152, 228], [252, 250], [122, 100]].forEach(([x, y]) => d += `<circle cx="${x}" cy="${y}" r="15" fill="${color}"/>`); }
  return box + d;
})());
// A beaker with a coloured liquid at a level (0..1).
const beakerSVG = (fill, level = 0.55) => svgURL(220, 300, (() => {
  const top = 40, bottom = 270, h = bottom - top, fy = bottom - h * level;
  return `<path d="M50 ${top} H170 V${bottom - 10} A10 10 0 0 1 160 ${bottom} H60 A10 10 0 0 1 50 ${bottom - 10} Z" fill="#eef3f9" stroke="#9fb0c4" stroke-width="4"/>`
    + `<path d="M54 ${fy} H166 V${bottom - 12} A8 8 0 0 1 158 ${bottom - 4} H62 A8 8 0 0 1 54 ${bottom - 12} Z" fill="${fill}" opacity="0.82"/>`
    + `<line x1="50" y1="${top + 70}" x2="72" y2="${top + 70}" stroke="#9fb0c4" stroke-width="2"/><line x1="50" y1="${top + 140}" x2="72" y2="${top + 140}" stroke="#9fb0c4" stroke-width="2"/>`;
})());
// A molecule from atoms [{x,y,r,c,l,tc}] and bonds [[i,j,double?]].
const moleculeSVG = (w, h, atoms, bonds = []) => svgURL(w, h,
  bonds.map(([i, j, dbl]) => { const a = atoms[i], b = atoms[j];
    if (dbl) { const dx = b.y - a.y, dy = a.x - b.x, L = Math.hypot(dx, dy) || 1, ox = 5 * dx / L, oy = 5 * dy / L;
      return `<line x1="${(a.x + ox).toFixed(1)}" y1="${(a.y + oy).toFixed(1)}" x2="${(b.x + ox).toFixed(1)}" y2="${(b.y + oy).toFixed(1)}" stroke="#8a97ad" stroke-width="7"/><line x1="${(a.x - ox).toFixed(1)}" y1="${(a.y - oy).toFixed(1)}" x2="${(b.x - ox).toFixed(1)}" y2="${(b.y - oy).toFixed(1)}" stroke="#8a97ad" stroke-width="7"/>`; }
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#8a97ad" stroke-width="8"/>`; }).join('')
  + atoms.map(a => `<circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${a.c}" stroke="#2a2f3a" stroke-width="2"/><text x="${a.x}" y="${(a.y + a.r * 0.34).toFixed(1)}" font-family="sans-serif" font-size="${(a.r * 0.95).toFixed(0)}" font-weight="700" fill="${a.tc || '#fff'}" text-anchor="middle">${a.l}</text>`).join(''));
// A stylised periodic table silhouette (the classic shape, three colour families).
const ptMiniSVG = (w = 560, h = 300) => svgURL(w, h, (() => {
  const cols = 18, rows = 7, cw = (w - 16) / cols, ch = (h - 16) / rows; let s = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if ((r === 1 || r === 2) && c >= 2 && c <= 11) continue;
    if (r === 0 && c >= 1 && c <= 16) continue;
    const fill = c === 17 ? '#e8c04b' : c >= 13 ? '#5fd38a' : '#5aa7f0';
    s += `<rect x="${(8 + c * cw).toFixed(1)}" y="${(8 + r * ch).toFixed(1)}" width="${(cw - 2).toFixed(1)}" height="${(ch - 2).toFixed(1)}" rx="2" fill="${fill}" opacity="0.85"/>`; }
  return s;
})());
// A single periodic-table cell: atomic number, symbol, name and mass.
const cellSVG = (sym, z, name, mass, color = '#2f6df0') => svgURL(300, 300,
  `<rect x="20" y="20" width="260" height="260" rx="16" fill="#ffffff" stroke="${color}" stroke-width="6"/>`
  + `<text x="42" y="74" font-family="sans-serif" font-size="30" fill="#64708a">${z}</text>`
  + `<text x="150" y="178" font-family="sans-serif" font-size="108" font-weight="800" fill="${color}" text-anchor="middle">${sym}</text>`
  + `<text x="150" y="224" font-family="sans-serif" font-size="26" fill="#1a2233" text-anchor="middle">${name}</text>`
  + `<text x="150" y="260" font-family="sans-serif" font-size="22" fill="#64708a" text-anchor="middle">${mass}</text>`);
// A heating curve: temperature over time with two flat steps (melting and boiling).
const heatCurveSVG = () => svgURL(580, 340, (() => {
  const pts = [[48, 300], [120, 214], [196, 214], [272, 150], [430, 150], [520, 62]];
  const poly = pts.map(p => p.join(',')).join(' ');
  return `<line x1="48" y1="24" x2="48" y2="312" stroke="#9fb0c4" stroke-width="2"/><line x1="48" y1="312" x2="556" y2="312" stroke="#9fb0c4" stroke-width="2"/>`
    + `<polyline points="${poly}" fill="none" stroke="#6d4fb0" stroke-width="5" stroke-linejoin="round"/>`
    + `<text x="150" y="204" font-family="sans-serif" font-size="18" fill="#2f6df0">fusión</text><text x="330" y="140" font-family="sans-serif" font-size="18" fill="#e07a5f">ebullición</text>`
    + `<text x="18" y="34" font-family="sans-serif" font-size="18" fill="#64708a">T</text><text x="536" y="332" font-family="sans-serif" font-size="18" fill="#64708a">tiempo</text>`;
})());

export default {

  // 1 · Estados de la materia y el modelo de partículas.
  edu_chem_matter: { name: 'Los estados de la materia', cat: 'edu', summary: 'La materia y el modelo de partículas: sólido, líquido y gas con sus partículas dibujadas, qué cambia entre ellos, los cambios de estado y una votación y un cuestionario para comprobar', make: () => {
    const PAPER = '#eef3f9', INK = '#15233a', BL = '#2f6df0', TE = '#1f8f8f', OR = '#e8823b', GR = '#2e9e6b', GREY = '#5f6b80', S = FF.space;
    return numbered(ink(build({ name: 'Los estados de la materia', palette: 'ocean', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, BL, PAPER, 14), glow(-120, 560, 520, OR, PAPER, 12)], extra: [
        text('QUÍMICA · 2.º-3.º ESO', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: BL, fontWeight: 700 }),
        text('¿De qué está<br>hecho todo?', 84, 196, 760, 200, { fontSize: 78, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('Todo lo que te rodea está formado por partículas diminutas. Según cómo se muevan, vemos un sólido, un líquido o un gas.', 90, 440, 680, 120, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(particlesSVG('gas', OR), 900, 190, 300, 300, 'Partículas de un gas, muy separadas'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: la gran idea de la química es que todo son partículas. Hoy, cómo se organizan en los tres estados.' },
      { title: 'Los tres estados', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Sólido', 'solid', BL, 'Partículas muy juntas y ordenadas: forma y volumen fijos.'], ['Líquido', 'liquid', TE, 'Partículas juntas pero sueltas: volumen fijo, forma del recipiente.'], ['Gas', 'gas', OR, 'Partículas muy separadas y rápidas: ni forma ni volumen fijos.']].map(([t, st, col, d], i) => { const x = 70 + i * 390; return [
          on(img(particlesSVG(st, col), x + 40, 180, 240, 240, t + ': ' + d), 'fade-up'),
          text(`<b style="color:${deep(col, PAPER)};font-size:28px">${t}</b><br><span style="font-size:20px;color:${INK}">${d}</span>`, x, 430, 360, 180, { fontSize: 20, textAlign: 'center', color: INK, lineHeight: 1.35 })]; }).flat()],
        notes: 'Tres clics: aparece cada estado con sus partículas. Insiste en junto/suelto/separado y ordenado/desordenado.' },
      { title: '¿Qué cambia de uno a otro?', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 110, y: 185, w: 1060, h: 280, stroke: '#cdd6ea',
          rows: [['', 'Forma', 'Volumen', 'Movimiento'], ['Sólido', 'fija', 'fijo', 'vibran en su sitio'], ['Líquido', 'del recipiente', 'fijo', 'resbalan unas sobre otras'], ['Gas', 'del recipiente', 'ocupa todo', 'vuelan libres y chocan']] }),
        text('Cuanta más energía (calor), más se mueven las partículas y más «sueltas» están.', 110, 500, 1060, 60, { fontSize: 24, color: GREY, textAlign: 'center' })],
        notes: 'La tabla resume. La clave: no cambian las partículas, cambia cómo se mueven y cómo de juntas están.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿En qué estado se mueven las partículas más libres y rápidas?', options: ['Sólido', 'Líquido', 'Gas', 'En los tres igual'] })],
        notes: 'Votación. Respuesta: en el gas. Sirve para comprobar que han entendido el modelo.' },
      { title: 'El modelo de partículas', layout: 'titleOnly', bg: PAPER, extra: [
        dg('list', 'Toda la materia está hecha de partículas pequeñísimas\nEntre ellas hay espacio vacío\nSe mueven sin parar\nCuanto más calor, más deprisa se mueven', 120, 190, 1040, 420, { color: INK, colors: 'colorful' })],
        notes: 'Las cuatro ideas del modelo. Con ellas se explican casi todos los fenómenos del tema.' },
      { title: 'Los cambios de estado', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cycle', 'Fusión (sólido→líquido)\nVaporización (líquido→gas)\nCondensación (gas→líquido)\nSolidificación (líquido→sólido)', 190, 170, 900, 470, { color: INK, colors: 'colorful', oneByOne: true })],
        notes: 'El ciclo de los cambios. Añade la sublimación (sólido→gas directo) como curiosidad (hielo seco, ambientadores).' },
      { layout: 'blank', bg: '#e6eef8', extra: [quiz('El agua hierve y se convierte en vapor. ¿Cómo se llama ese cambio?', ['Fusión', 'Condensación', 'Vaporización', 'Solidificación'], 2)],
        notes: 'Repaso del vocabulario de cambios. Vaporización = de líquido a gas.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, TE, PAPER, 14)], transition: 'zoom', extra: [
        text('Para llevarte', 84, 150, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('La materia son partículas en movimiento. El estado depende de su energía: con calor se mueven más y pasan de sólido a líquido y a gas. Reto: busca un ejemplo de cada cambio de estado en tu casa.', 84, 270, 900, 220, { fontSize: 29, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre con la idea grande y un reto de observación en casa (hielo que se funde, vaho en el espejo, ropa que se seca).' },
    ]), INK));
  } },

  // 2 · El átomo: núcleo y corteza; protones, neutrones y electrones.
  edu_chem_atom: { name: 'El átomo por dentro', cat: 'edu', summary: 'El átomo: núcleo y corteza, protones, neutrones y electrones con sus cargas, número atómico y másico con un ejemplo, isótopos, una votación y un cuestionario', make: () => {
    const BG = '#0b1222', PANEL = '#15203a', CY = '#39c0c8', AM = '#f2c14e', GR = '#5fd38a', RE = '#e07a5f', DIM = '#8ea0bd', CREAM = '#eaf2fb', M = FF.mono, S = FF.space;
    return numbered(ink(build({ name: 'El átomo por dentro', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, CY, BG, 26), glow(-120, 560, 520, AM, BG, 16)], extra: [
        text('QUÍMICA · ESTRUCTURA DE LA MATERIA', 90, 140, 680, 36, { fontSize: 22, letterSpacing: 4, color: CY, fontWeight: 700, fontFamily: M }),
        text('El átomo<br>por dentro', 84, 190, 680, 220, { fontSize: 80, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('Es la pieza más pequeña de un elemento. Y aún tiene partes dentro: un núcleo y una corteza de electrones.', 90, 450, 640, 120, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        after(img(atomSVG([2, 4], 'C', CY), 800, 150, 420, 420, 'Un átomo con su núcleo y dos órbitas de electrones'), 'zoom-in', { duration: 900 })],
        notes: 'Arranque: el átomo del carbono como ejemplo. Núcleo central y electrones girando alrededor.' },
      { title: 'Núcleo y corteza', layout: 'twoContent', bg: BG, extra: [
        img(atomSVG([2, 4], '+', CY, RE), 90, 170, 400, 400, 'El núcleo con carga positiva y la corteza de electrones'),
        text('El <b style="color:' + RE + '">núcleo</b> está en el centro: ahí viven los protones y los neutrones. Casi toda la masa está aquí.<br><br>La <b style="color:' + GR + '">corteza</b> es la zona de alrededor, donde se mueven los electrones.', 560, 230, 620, 320, { fontSize: 28, color: CREAM, lineHeight: 1.5 })],
        notes: 'Dos partes: núcleo (pesado, positivo) y corteza (ligera, negativa). El átomo es casi todo espacio vacío.' },
      { title: 'Las tres partículas', layout: 'titleOnly', bg: BG, extra: [
        ...[['Protón', 'Carga +, en el núcleo. Masa 1.', RE], ['Neutrón', 'Sin carga, en el núcleo. Masa 1.', AM], ['Electrón', 'Carga −, en la corteza. Casi sin masa.', GR]].map(([t, d, col], i) => { const x = 90 + i * 380; return [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:22px;color:${CREAM}">${d}</span>`, x, 230, 350, 220, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [22, 24, 20, 24] }), 'fade-up', { sound: 'pop' })]; }).flat()],
        notes: 'Protón +, neutrón 0, electrón −. Un átomo neutro tiene los mismos protones que electrones.' },
      { title: 'Número atómico y másico', layout: 'titleOnly', bg: BG, extra: [
        mathBlock({ x: 90, y: 200, w: 760, h: 110, fontSize: 48, latex: 'Z = \\text{protones} \\qquad A = \\text{protones} + \\text{neutrones}', color: CREAM }),
        text('El <b style="color:' + CY + '">número atómico Z</b> dice qué elemento es. El <b style="color:' + AM + '">número másico A</b> cuenta las partículas del núcleo.', 90, 340, 760, 120, { fontSize: 26, color: DIM, lineHeight: 1.4 }),
        on(card('Carbono: Z = 6 → 6 protones.<br>A = 12 → 6 protones + 6 neutrones.', 900, 220, 300, 300, PANEL, { color: CREAM, radius: 16, borderColor: CY, fontSize: 24, pad: [22, 22, 22, 22] }), 'fade-left')],
        notes: 'Z identifica el elemento; A es p+n. Ejemplo del carbono-12. Los electrones casi no pesan, por eso no están en A.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Qué partícula del átomo tiene carga NEGATIVA?', ['El protón', 'El neutrón', 'El electrón', 'El núcleo'], 2)],
        notes: 'Comprobación directa. El electrón es el negativo; además es el que se intercambia en los enlaces.' },
      { title: 'Isótopos', layout: 'titleOnly', bg: BG, extra: [
        text('Un mismo elemento puede tener átomos con <b style="color:' + AM + '">distinto número de neutrones</b>: son los isótopos. Tienen la misma Z (mismo elemento) pero distinta A.', 90, 190, 1100, 140, { fontSize: 28, color: CREAM, lineHeight: 1.45 }),
        ...[['Carbono-12', '6 p + 6 n'], ['Carbono-14', '6 p + 8 n']].map(([t, d], i) => [
          on(card(`<b style="font-size:28px;color:${CY}">${t}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, 180 + i * 500, 380, 420, 150, PANEL, { color: CREAM, radius: 16, borderColor: CY, pad: [20, 24, 18, 24] }), 'fade-up')]).flat()],
        notes: 'Isótopos: mismo elemento, distinta masa. El carbono-14 se usa para datar restos antiguos.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, GR, BG, 30)], transition: 'zoom', extra: [
        text('En una frase', 84, 170, 900, 90, { fontSize: 60, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('El átomo tiene un núcleo con protones (+) y neutrones (0) y una corteza con electrones (−). El número de protones decide qué elemento es.', 84, 290, 1000, 200, { fontSize: 30, color: DIM, lineHeight: 1.5 })],
        notes: 'Cierre con la idea grande: los protones definen el elemento. Enlaza con la tabla periódica.' },
    ]), CREAM));
  } },

  // 3 · La tabla periódica: cómo se ordena y cómo se lee.
  edu_chem_table: { name: 'La tabla periódica', cat: 'edu', summary: 'La tabla periódica: cómo se ordena por número atómico, periodos y grupos, las grandes familias (metales, no metales y gases nobles) y cómo leer una casilla, con votación y cuestionario', make: () => {
    const PAPER = '#fbf7ef', INK = '#2a2113', BL = '#2f6df0', GR = '#2e9e6b', AM = '#c98a12', GREY = '#6b6150', S = FF.space;
    return numbered(ink(build({ name: 'La tabla periódica', palette: 'warm', fonts: 'bold', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -140, 580, BL, PAPER, 12), glow(-120, 560, 520, AM, PAPER, 12)], extra: [
        text('QUÍMICA · LOS ELEMENTOS', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: AM, fontWeight: 700 }),
        text('La tabla<br>periódica', 84, 196, 700, 200, { fontSize: 82, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('Un mapa de todos los elementos conocidos, ordenados con una lógica que predice cómo se comportan.', 90, 440, 640, 120, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(ptMiniSVG(560, 300), 840, 220, 380, 220, 'La forma de la tabla periódica con sus familias de colores'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: la tabla no es una lista desordenada; es un mapa con una lógica preciosa.' },
      { title: 'Ordenada por número atómico', layout: 'twoContent', bg: PAPER, extra: [
        img(ptMiniSVG(560, 300), 90, 220, 520, 280, 'La tabla periódica estilizada'),
        text('Los elementos se colocan de menor a mayor <b>número atómico</b> (los protones). Así, el hidrógeno (1) va primero y cada casilla tiene uno más que la anterior.', 650, 240, 540, 280, { fontSize: 28, color: INK, lineHeight: 1.5 })],
        notes: 'Clave histórica: Mendeléiev la ordenó y hasta dejó huecos para elementos aún no descubiertos. Hoy se ordena por Z.' },
      { title: 'Filas y columnas', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Periodos', 'Las filas (7). Dicen cuántas capas de electrones tiene el átomo.', BL], ['Grupos', 'Las columnas (18). Los de un mismo grupo se parecen mucho.', GR]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:24px;color:${INK}">${d}</span>`, 110 + i * 540, 220, 500, 220, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat(),
        text('Misma columna = parecido comportamiento. Esa es la gran idea de la tabla.', 110, 480, 1060, 60, { fontSize: 24, color: GREY, textAlign: 'center' })],
        notes: 'Periodos (filas) y grupos (columnas). Los elementos de un grupo reaccionan parecido porque tienen los mismos electrones «de fuera».' },
      { title: 'Tres grandes familias', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Metales', 'Brillan, conducen, la mayoría. A la izquierda.', '#2f6df0'], ['No metales', 'Frágiles, malos conductores. Arriba a la derecha.', '#2e9e6b'], ['Gases nobles', 'Casi no reaccionan. La última columna.', '#c98a12']].map(([t, d, col], i) => { const x = 90 + i * 380; return [
          on(card(`<b style="font-size:27px;color:${col}">${t}</b><br><span style="font-size:22px;color:${INK}">${d}</span>`, x, 230, 350, 210, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 24, 18, 24] }), 'fade-up')]; }).flat()],
        notes: 'Tres familias según el color de la tabla de la portada: azul metales, verde no metales, dorado gases nobles.' },
      { title: 'Cómo se lee una casilla', layout: 'twoContent', bg: PAPER, extra: [
        img(cellSVG('O', 8, 'Oxígeno', '16,00', GR), 140, 190, 320, 320, 'La casilla del oxígeno: número 8, símbolo O'),
        text(ul('<b>Arriba</b>: el número atómico (protones)', '<b>En grande</b>: el símbolo', '<b>Debajo</b>: el nombre', '<b>Abajo</b>: la masa atómica'), 600, 220, 580, 340, { fontSize: 28, color: INK, lineHeight: 1.6 })],
        notes: 'Leer una casilla: Z arriba, símbolo grande, nombre y masa. El oxígeno como ejemplo.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿Qué tienen en común los elementos de una misma COLUMNA?', options: ['El mismo número de protones', 'Un comportamiento químico parecido', 'La misma masa', 'Nada en especial'] })],
        notes: 'Votación. Respuesta: se comportan parecido (mismo grupo). Es el corazón de la tabla.' },
      { layout: 'blank', bg: '#f3ece0', extra: [quiz('El oxígeno tiene número atómico 8. ¿Cuántos protones tiene?', ['6', '8', '16', '2'], 1)],
        notes: 'El número atómico son los protones: 8. Comprobación rápida.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, BL, PAPER, 12)], transition: 'zoom', extra: [
        text('Para llevarte', 84, 160, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('La tabla ordena los elementos por protones. Las columnas agrupan los que se parecen. Saber leer una casilla te da el símbolo, los protones y la masa de un vistazo.', 84, 280, 940, 200, { fontSize: 29, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre. Reto opcional: que localicen en la tabla tres elementos de su vida diaria (hierro, oxígeno, aluminio...).' },
    ]), INK));
  } },

  // 4 · Enlaces químicos: iónico y covalente.
  edu_chem_bonds: { name: 'Cómo se unen los átomos', cat: 'edu', summary: 'Los enlaces químicos: por qué se unen los átomos (la estabilidad), el enlace iónico (ceder y ganar electrones, la sal) y el covalente (compartir, el agua), una comparación, votación y cuestionario', make: () => {
    const PAPER = '#f4f6fa', INK = '#182130', PUR = '#6d4fb0', BL = '#2f6df0', GR = '#2e9e6b', RE = '#d84b3f', GREY = '#5f6b80', S = FF.space;
    const Na = { x: 90, y: 90, r: 46, c: '#8a8f98', l: 'Na' }, Cl = { x: 230, y: 90, r: 52, c: '#5fd38a', l: 'Cl', tc: '#123' };
    return numbered(ink(build({ name: 'Cómo se unen los átomos', palette: 'violet', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, PUR, PAPER, 14), glow(-120, 560, 520, BL, PAPER, 12)], extra: [
        text('QUÍMICA · EL ENLACE', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: PUR, fontWeight: 700 }),
        text('Cómo se unen<br>los átomos', 84, 196, 820, 200, { fontSize: 76, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('Casi nada existe como átomos sueltos. Se juntan formando moléculas y cristales. ¿Por qué, y de cuántas maneras?', 90, 440, 700, 120, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(moleculeSVG(320, 200, [{ x: 150, y: 100, r: 44, c: '#e0556b', l: 'O' }, { x: 60, y: 150, r: 28, c: '#cfd6e4', l: 'H', tc: '#1a2233' }, { x: 240, y: 150, r: 28, c: '#cfd6e4', l: 'H', tc: '#1a2233' }], [[0, 1], [0, 2]]), 900, 220, 300, 230, 'Una molécula de agua: un oxígeno y dos hidrógenos'), 'fade-left', { duration: 800 })],
        notes: 'Arranque con la molécula de agua. La pregunta: por qué los átomos se unen y de qué formas.' },
      { title: '¿Por qué se unen?', layout: 'titleOnly', bg: PAPER, extra: [
        text('Los átomos «quieren» quedarse con la corteza llena y estable, como los gases nobles. Para lograrlo, <b style="color:' + PUR + '">ganan, ceden o comparten electrones</b>. Eso es un enlace.', 90, 200, 1100, 170, { fontSize: 30, color: INK, lineHeight: 1.5 }),
        text('Regla práctica: buscan tener 8 electrones en su última capa (la «regla del octeto»).', 90, 420, 1100, 70, { fontSize: 25, color: GREY })],
        notes: 'Idea central: estabilidad. Todo enlace es un apaño de electrones para parecerse a un gas noble.' },
      { title: 'Enlace iónico: ceder y ganar', layout: 'twoContent', bg: PAPER, extra: [
        img(moleculeSVG(320, 200, [Na, Cl], []), 110, 210, 340, 220, 'Sodio y cloro formando sal'),
        text('Un metal <b style="color:' + BL + '">cede</b> electrones y un no metal los <b style="color:' + GR + '">gana</b>. Quedan con carga (iones + y −) y se atraen.<br><br>Así se forma la <b>sal común</b> (cloruro de sodio), un cristal durísimo.', 560, 220, 620, 320, { fontSize: 27, color: INK, lineHeight: 1.45 })],
        notes: 'Iónico = transferencia. Metal da, no metal recibe; los iones de signo opuesto se atraen y forman cristales (la sal).' },
      { title: 'Enlace covalente: compartir', layout: 'twoContent', bg: PAPER, extra: [
        img(moleculeSVG(340, 220, [{ x: 110, y: 110, r: 46, c: '#5aa7f0', l: 'O' }, { x: 240, y: 110, r: 46, c: '#5aa7f0', l: 'O' }], [[0, 1, true]]), 110, 210, 340, 230, 'Una molécula de oxígeno con doble enlace'),
        text('Dos no metales <b style="color:' + GR + '">comparten</b> electrones. Ninguno los cede del todo: forman una <b>molécula</b>.<br><br>Así son el agua, el oxígeno del aire (O₂) o el dióxido de carbono.', 560, 220, 620, 320, { fontSize: 27, color: INK, lineHeight: 1.45 })],
        notes: 'Covalente = compartir. Dibujo del O₂ con doble enlace. El agua y el CO₂ también son covalentes.' },
      { title: 'En resumen', layout: 'titleOnly', bg: PAPER, extra: [
        tableBlock({ x: 150, y: 190, w: 980, h: 250, stroke: '#d3cde6',
          rows: [['', 'Iónico', 'Covalente'], ['Quién', 'metal + no metal', 'no metal + no metal'], ['Electrones', 'se ceden y ganan', 'se comparten'], ['Ejemplo', 'sal (NaCl)', 'agua (H₂O)']] }),
        text('¿Transferencia o reparto? Esa es la gran diferencia entre los dos enlaces.', 150, 470, 980, 60, { fontSize: 24, color: GREY, textAlign: 'center' })],
        notes: 'Tabla comparativa. La pregunta mnemotécnica: ¿se ceden (iónico) o se comparten (covalente)?' },
      { layout: 'blank', bg: PAPER, extra: [quiz('El agua (H₂O) se forma compartiendo electrones. ¿Qué tipo de enlace es?', ['Iónico', 'Covalente', 'Metálico', 'Ninguno'], 1)],
        notes: 'Comprobación: compartir = covalente. El agua es el ejemplo estrella.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, PUR, PAPER, 14)], transition: 'zoom', extra: [
        text('Para llevarte', 84, 160, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('Los átomos se unen buscando estabilidad. Si se transfieren electrones, enlace iónico (sal); si los comparten, enlace covalente (agua). De ahí salen todos los materiales.', 84, 280, 960, 200, { fontSize: 29, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre con la idea grande: dos formas de enlace explican la materia que tocamos.' },
    ]), INK));
  } },

  // 5 · Reacciones químicas y ecuaciones.
  edu_chem_reactions: { name: 'Las reacciones químicas', cat: 'edu', summary: 'Las reacciones químicas: reactivos y productos, la conservación de la masa de Lavoisier, ajustar una ecuación paso a paso, las señales de que ha habido reacción, con votación y cuestionario', make: () => {
    const PAPER = '#f3f6f4', INK = '#15261c', GR = '#2e9e5b', OR = '#e0873b', BL = '#2563a8', RE = '#d84b3f', GREY = '#5f6f64', S = FF.space;
    const H2 = [{ x: 60, y: 90, r: 30, c: '#cfd6e4', l: 'H', tc: '#1a2233' }, { x: 130, y: 90, r: 30, c: '#cfd6e4', l: 'H', tc: '#1a2233' }];
    return numbered(ink(build({ name: 'Las reacciones químicas', palette: 'forest', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, OR, PAPER, 14), glow(-120, 560, 520, GR, PAPER, 12)], extra: [
        text('QUÍMICA · EL CAMBIO QUÍMICO', 90, 150, 720, 36, { fontSize: 22, letterSpacing: 3, color: GR, fontWeight: 700 }),
        text('Las reacciones<br>químicas', 84, 196, 840, 200, { fontSize: 74, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('Cuando unas sustancias se transforman en otras nuevas, ha ocurrido una reacción. Los átomos se reorganizan.', 90, 440, 700, 120, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(moleculeSVG(240, 180, [{ x: 120, y: 90, r: 44, c: '#e0556b', l: 'O' }, { x: 50, y: 140, r: 26, c: '#cfd6e4', l: 'H', tc: '#1a2233' }, { x: 190, y: 140, r: 26, c: '#cfd6e4', l: 'H', tc: '#1a2233' }], [[0, 1], [0, 2]]), 940, 230, 240, 200, 'Una molécula de agua, producto de una reacción'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: una reacción crea sustancias nuevas. No es una mezcla; cambian los enlaces.' },
      { title: 'Reactivos → productos', layout: 'titleOnly', bg: PAPER, extra: [
        along(img(moleculeSVG(220, 180, H2, [[0, 1]]), 120, 240, 220, 180, 'Hidrógeno (reactivo)'), 'fade-up'),
        after(img(moleculeSVG(220, 180, [{ x: 70, y: 90, r: 40, c: '#5aa7f0', l: 'O' }, { x: 180, y: 90, r: 40, c: '#5aa7f0', l: 'O' }], [[0, 1, true]]), 360, 240, 220, 180, 'Oxígeno (reactivo)'), 'fade-up'),
        shape('rightarrow', 600, 300, 120, 60, OR),
        after(img(moleculeSVG(240, 180, [{ x: 120, y: 90, r: 40, c: '#e0556b', l: 'O' }, { x: 55, y: 140, r: 24, c: '#cfd6e4', l: 'H', tc: '#1a2233' }, { x: 185, y: 140, r: 24, c: '#cfd6e4', l: 'H', tc: '#1a2233' }], [[0, 1], [0, 2]]), 760, 240, 240, 180, 'Agua (producto)'), 'zoom-in'),
        text('Los <b style="color:' + GR + '">reactivos</b> (lo que empieza) se transforman en los <b style="color:' + BL + '">productos</b> (lo que acaba).', 120, 470, 1040, 70, { fontSize: 26, color: INK, textAlign: 'center' })],
        notes: 'Hidrógeno + oxígeno dan agua. A la izquierda reactivos, a la derecha productos, con la flecha en medio.' },
      { title: 'Nada se pierde (Lavoisier)', layout: 'titleOnly', bg: PAPER, extra: [
        text('«La materia ni se crea ni se destruye, solo se transforma.»', 90, 200, 1100, 110, { fontSize: 34, color: INK, fontWeight: 700, lineHeight: 1.35 }),
        text('En una reacción hay los mismos átomos antes y después: solo se recolocan. Por eso la <b style="color:' + GR + '">masa total se conserva</b>.', 90, 340, 1100, 120, { fontSize: 27, color: GREY, lineHeight: 1.45 })],
        notes: 'Ley de conservación de la masa. Los átomos no desaparecen; se reordenan. Base para ajustar ecuaciones.' },
      { title: 'Ajustar una ecuación', layout: 'titleOnly', bg: PAPER, extra: [
        mathBlock({ x: 90, y: 200, w: 1100, h: 120, fontSize: 56, latex: '2\\,\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\,\\text{H}_2\\text{O}', color: INK }),
        text('Ponemos números delante para que haya los mismos átomos de cada clase a los dos lados: aquí, 4 H y 2 O a cada lado.', 90, 360, 1100, 120, { fontSize: 26, color: GREY, lineHeight: 1.45 })],
        notes: 'Ajustar = contar átomos de cada lado y poner coeficientes. 2 H₂ + O₂ → 2 H₂O: 4 hidrógenos y 2 oxígenos a cada lado.' },
      { title: 'Señales de que ha reaccionado', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Cambio de color', RE], ['Burbujas (gas)', BL], ['Calor o luz', OR], ['Un sólido (precipitado)', GR]].map(([t, col], i) => { const x = 90 + (i % 2) * 575, y = 210 + Math.floor(i / 2) * 200; return [
          on(card(`<b style="font-size:28px;color:${col}">${t}</b>`, x, y, 525, 160, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [30, 26, 30, 26] }), 'fade-up')]; }).flat()],
        notes: 'Pistas de que ha habido reacción (y no solo una mezcla): color, gas, calor/luz, precipitado.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Quemas un papel y pesas las cenizas: pesan menos. ¿Se ha perdido materia?', options: ['Sí, ha desaparecido', 'No: parte se fue como gases y humo', 'Sí, el fuego la destruye', 'No se puede saber'] })],
        notes: 'Votación con trampa clásica: no se pierde masa; parte se va en gases (CO₂, vapor). Si pesáramos todo, se conservaría.' },
      { layout: 'blank', bg: '#eaf3ee', extra: [quiz('En la ecuación 2 H₂ + O₂ → 2 H₂O, ¿cuántos átomos de oxígeno hay a cada lado?', ['1', '2', '3', '4'], 1)],
        notes: 'A la izquierda O₂ = 2 oxígenos; a la derecha 2 H₂O = 2 oxígenos. Está ajustada.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, GR, PAPER, 14)], transition: 'zoom', extra: [
        text('Para llevarte', 84, 160, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('Una reacción transforma reactivos en productos reordenando átomos. La masa se conserva, y por eso ajustamos las ecuaciones. Mira a tu alrededor: cocinar, oxidarse o respirar son química.', 84, 280, 980, 210, { fontSize: 29, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre con ejemplos cotidianos de reacción: cocinar, oxidación del hierro, la respiración.' },
    ]), INK));
  } },

  // 6 · Mezclas y métodos de separación.
  edu_chem_mixtures: { name: 'Mezclas y separación', cat: 'edu', summary: 'Mezclas y sustancias puras: homogéneas y heterogéneas, y los métodos para separarlas (filtración, decantación, evaporación, destilación y el imán), con votación y cuestionario', make: () => {
    const PAPER = '#eef3f9', INK = '#15233a', BL = '#2f6df0', TE = '#1f8f8f', OR = '#e8823b', GR = '#2e9e6b', GREY = '#5f6b80', S = FF.space;
    return numbered(ink(build({ name: 'Mezclas y separación', palette: 'ocean', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, TE, PAPER, 14), glow(-120, 560, 520, OR, PAPER, 12)], extra: [
        text('QUÍMICA · MATERIA Y MEZCLAS', 90, 150, 720, 36, { fontSize: 22, letterSpacing: 3, color: TE, fontWeight: 700 }),
        text('Mezclas y<br>separación', 84, 196, 760, 200, { fontSize: 78, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('Casi nada es puro: el aire, el agua del grifo o un batido son mezclas. ¿Cómo las reconocemos y cómo las separamos?', 90, 440, 700, 120, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(beakerSVG(TE, 0.6), 940, 190, 220, 300, 'Un vaso con una mezcla'), 'fade-left', { duration: 800 })],
        notes: 'Arranque: la mayoría de lo que vemos son mezclas, no sustancias puras.' },
      { title: 'Pura o mezcla', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Sustancia pura', 'Una sola cosa: agua destilada, oro, oxígeno. Siempre igual.', BL], ['Mezcla', 'Dos o más sustancias juntas que conservan sus propiedades.', OR]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:24px;color:${INK}">${d}</span>`, 110 + i * 540, 220, 500, 220, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat(),
        text('En una mezcla, cada sustancia sigue siendo ella misma: se pueden volver a separar.', 110, 480, 1060, 60, { fontSize: 24, color: GREY, textAlign: 'center' })],
        notes: 'Distinción pura/mezcla. La clave de la mezcla: se puede separar porque no ha habido reacción.' },
      { title: 'Homogénea o heterogénea', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['Homogénea', 'No distingues los componentes: agua con sal, el aire, el acero. Son disoluciones.', TE], ['Heterogénea', 'Se ven las partes: agua con aceite, una ensalada, el granito.', OR]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:23px;color:${INK}">${d}</span>`, 110 + i * 540, 220, 500, 240, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat()],
        notes: 'Homogénea = uniforme a la vista (disolución); heterogénea = se ven los trozos. Ejemplos cotidianos.' },
      { title: 'Cómo las separamos', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cards', 'Filtración: sólido que no se disuelve (arena del agua)\nDecantación: líquidos que no se mezclan (agua y aceite)\nEvaporación: recuperar lo disuelto (sal del agua)\nDestilación: separar líquidos por su temperatura\nImán: separar lo que es magnético (limaduras de hierro)', 90, 185, 1100, 440, { color: INK, colors: 'colorful' })],
        notes: 'Cinco métodos, cada uno según la propiedad que diferencia los componentes (tamaño, densidad, punto de ebullición, magnetismo).' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Tienes agua con sal disuelta. ¿Cómo recuperas la sal?', options: ['Filtrando', 'Con un imán', 'Evaporando el agua', 'Decantando'] })],
        notes: 'Votación. La sal está disuelta, así que no se filtra: hay que evaporar el agua y queda la sal.' },
      { layout: 'blank', bg: '#e6eef8', extra: [quiz('Agua con arena. ¿Qué método la separa mejor?', ['Filtración', 'Destilación', 'Imán', 'Evaporación'], 0)],
        notes: 'La arena no se disuelve: se filtra. Comprobación del criterio «según la propiedad que las diferencia».' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, TE, PAPER, 14)], transition: 'zoom', extra: [
        text('Para llevarte', 84, 160, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('Las mezclas se pueden separar sin reacción, aprovechando en qué se diferencian sus componentes. Reto: ¿cómo separarías los ingredientes de un puñado de cereales con pasas y copos?', 84, 280, 980, 210, { fontSize: 29, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre con un reto de clasificación. Conecta con reciclaje (separar materiales) para darle sentido real.' },
    ]), INK));
  } },

  // 7 · Cambios de estado y la curva de calentamiento.
  edu_chem_changes: { name: 'Cambios de estado', cat: 'edu', summary: 'Los cambios de estado y la curva de calentamiento: cómo nombra cada cambio, por qué la temperatura se queda quieta mientras algo se funde o hierve, con un gráfico, votación y cuestionario', make: () => {
    const PAPER = '#f5f4f8', INK = '#1e1b2e', PUR = '#6d4fb0', BL = '#2f6df0', OR = '#e0873b', TE = '#1f8f8f', GREY = '#6a6480', S = FF.space;
    return numbered(ink(build({ name: 'Cambios de estado', palette: 'violet', fonts: 'modern', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, PUR, PAPER, 14), glow(-120, 560, 520, BL, PAPER, 12)], extra: [
        text('QUÍMICA · ENERGÍA Y MATERIA', 90, 150, 720, 36, { fontSize: 22, letterSpacing: 3, color: PUR, fontWeight: 700 }),
        text('Cambios<br>de estado', 84, 196, 700, 200, { fontSize: 80, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('El hielo se funde, el agua hierve, el vaho se condensa. Todo son cambios de estado, y la temperatura tiene mucho que decir.', 90, 440, 700, 130, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(heatCurveSVG(), 820, 200, 400, 240, 'Una curva de calentamiento con dos mesetas'), 'fade-left', { duration: 800 })],
        notes: 'Arranque con la curva de calentamiento, que será la estrella del tema.' },
      { title: 'Cómo se llama cada cambio', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cycle', 'Fusión: sólido → líquido\nVaporización: líquido → gas\nCondensación: gas → líquido\nSolidificación: líquido → sólido', 190, 170, 900, 470, { color: INK, colors: 'colorful', oneByOne: true })],
        notes: 'El ciclo con nombres. Añade sublimación (sólido→gas) e inversa como extra (hielo seco, escarcha).' },
      { title: 'La curva de calentamiento', layout: 'twoContent', bg: PAPER, extra: [
        img(heatCurveSVG(), 100, 200, 520, 320, 'La curva de calentamiento con las dos mesetas'),
        text('Calientas hielo y mides la temperatura. Sube… pero se <b style="color:' + BL + '">queda quieta</b> en dos tramos: mientras se funde y mientras hierve.', 660, 240, 540, 280, { fontSize: 28, color: INK, lineHeight: 1.5 })],
        notes: 'La curva tiene dos mesetas planas: fusión y ebullición. Ahí la temperatura NO sube aunque sigas calentando.' },
      { title: '¿Por qué la T no sube?', layout: 'titleOnly', bg: PAPER, extra: [
        text('Durante el cambio, toda la energía que das se usa en <b style="color:' + PUR + '">separar las partículas</b>, no en calentarlas. Por eso el termómetro se queda quieto hasta que termina el cambio.', 90, 200, 1100, 170, { fontSize: 30, color: INK, lineHeight: 1.5 }),
        text('El agua pura funde a 0 °C y hierve a 100 °C (a nivel del mar). Son sus «temperaturas fijas».', 90, 420, 1100, 70, { fontSize: 25, color: GREY })],
        notes: 'Idea difícil y bonita: la energía rompe la estructura, no sube la temperatura. Por eso el hielo-agua se mantiene a 0 °C.' },
      { title: 'Lo que marca el termómetro', layout: 'titleOnly', bg: PAPER, extra: [
        chartBlock({ x: 110, y: 180, w: 1060, h: 420, chartType: 'line', color: PUR, grid: true, xTitle: 'Tiempo (min)', yTitle: 'Temperatura (°C)', seriesName: 'Temperatura',
          data: [[0, -20], [2, 0], [5, 0], [7, 50], [10, 100], [14, 100], [16, 120]].map(([t, v]) => ({ label: String(t), value: v })) })],
        notes: 'El mismo fenómeno como gráfico de datos: dos tramos planos en 0 °C y en 100 °C. Pídeles que los señalen.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: 'Mientras el hielo se está fundiendo, ¿qué marca el termómetro?', options: ['Sube sin parar', 'Se queda en 0 °C', 'Baja', 'Sube y baja'] })],
        notes: 'Votación. Se queda en 0 °C hasta que todo el hielo se ha fundido. Es la idea clave del tema.' },
      { layout: 'blank', bg: '#efeaf7', extra: [quiz('El vaho del espejo del baño se vuelve gotas de agua. ¿Qué cambio es?', ['Fusión', 'Vaporización', 'Condensación', 'Sublimación'], 2)],
        notes: 'De gas (vapor) a líquido (gotas) = condensación. Ejemplo cotidiano perfecto.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, PUR, PAPER, 14)], transition: 'zoom', extra: [
        text('Para llevarte', 84, 160, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('Cada cambio de estado tiene nombre y ocurre a una temperatura fija, donde el termómetro se detiene porque la energía rompe la estructura. Reto: dibuja la curva de enfriar vapor hasta hielo.', 84, 280, 980, 210, { fontSize: 29, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre con el reto de la curva inversa (enfriamiento), que invierte las mesetas.' },
    ]), INK));
  } },

  // 8 · Química del carbono: lo orgánico básico.
  edu_chem_carbon: { name: 'La química del carbono', cat: 'edu', summary: 'La química del carbono: por qué forma cuatro enlaces y cadenas, los hidrocarburos como el metano, los grupos de la vida (azúcares, grasas, proteínas) y por qué el carbono está en todo lo vivo, con votación y cuestionario', make: () => {
    const BG = '#0d140e', PANEL = '#17231a', GR = '#5fd38a', LI = '#aee36a', AM = '#f2c14e', CY = '#39c0c8', DIM = '#9ab0a0', CREAM = '#eef6ec', M = FF.mono, S = FF.space;
    const methane = moleculeSVG(340, 300, [{ x: 170, y: 150, r: 50, c: '#4a4f58', l: 'C' }, { x: 170, y: 50, r: 26, c: '#cfd6e4', l: 'H', tc: '#1a2233' }, { x: 170, y: 250, r: 26, c: '#cfd6e4', l: 'H', tc: '#1a2233' }, { x: 70, y: 150, r: 26, c: '#cfd6e4', l: 'H', tc: '#1a2233' }, { x: 270, y: 150, r: 26, c: '#cfd6e4', l: 'H', tc: '#1a2233' }], [[0, 1], [0, 2], [0, 3], [0, 4]]);
    return numbered(ink(build({ name: 'La química del carbono', palette: 'forest', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, GR, BG, 24), glow(-120, 560, 520, AM, BG, 16)], extra: [
        text('QUÍMICA · EL CARBONO', 90, 140, 720, 36, { fontSize: 22, letterSpacing: 4, color: GR, fontWeight: 700, fontFamily: M }),
        text('La química<br>del carbono', 84, 190, 760, 220, { fontSize: 76, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('Un solo elemento es la base de todo lo vivo y de casi todos los plásticos y combustibles. ¿Qué tiene de especial?', 90, 452, 640, 120, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
        after(img(methane, 870, 170, 340, 340, 'La molécula de metano: un carbono y cuatro hidrógenos'), 'zoom-in', { duration: 900 })],
        notes: 'Arranque con el metano. El carbono es el elemento de la vida y de la química orgánica.' },
      { title: 'El carbono hace cuatro enlaces', layout: 'twoContent', bg: BG, extra: [
        img(methane, 90, 180, 360, 360, 'El carbono con sus cuatro enlaces'),
        text('El carbono tiene cuatro electrones «de fuera», así que puede unirse a <b style="color:' + GR + '">cuatro átomos</b> a la vez.<br><br>Eso le permite formar estructuras enormes y variadas, como ningún otro elemento.', 540, 230, 640, 320, { fontSize: 28, color: CREAM, lineHeight: 1.5 })],
        notes: 'Cuatro enlaces: ese es el superpoder del carbono. De ahí su versatilidad.' },
      { title: 'Cadenas y anillos', layout: 'titleOnly', bg: BG, extra: [
        img(moleculeSVG(620, 160, [{ x: 70, y: 90, r: 38, c: '#4a4f58', l: 'C' }, { x: 200, y: 90, r: 38, c: '#4a4f58', l: 'C' }, { x: 330, y: 90, r: 38, c: '#4a4f58', l: 'C' }, { x: 460, y: 90, r: 38, c: '#4a4f58', l: 'C' }, { x: 560, y: 90, r: 30, c: '#cfd6e4', l: 'H', tc: '#123' }], [[0, 1], [1, 2], [2, 3], [3, 4]]), 240, 210, 800, 200, 'Una cadena de cuatro carbonos'),
        text('Los carbonos se enlazan entre sí formando <b style="color:' + LI + '">cadenas largas, ramas y anillos</b>. Por eso existen millones de compuestos de carbono.', 140, 450, 1000, 120, { fontSize: 28, color: CREAM, lineHeight: 1.45, textAlign: 'center' })],
        notes: 'El carbono se une a sí mismo en cadenas y anillos. Esa es la razón de que haya tantísimos compuestos orgánicos.' },
      { title: 'Los hidrocarburos', layout: 'titleOnly', bg: BG, extra: [
        text('Solo carbono e hidrógeno: son los <b style="color:' + AM + '">hidrocarburos</b>. Están en el gas, la gasolina, el butano… y arden muy bien, por eso son combustibles.', 90, 190, 1100, 150, { fontSize: 28, color: CREAM, lineHeight: 1.45 }),
        ...[['Metano CH₄', 'el gas natural'], ['Butano C₄H₁₀', 'la bombona'], ['Octano C₈H₁₈', 'la gasolina']].map(([t, d], i) => [
          on(card(`<b style="font-size:26px;color:${CY}">${t}</b><br><span style="font-size:21px;color:${CREAM}">${d}</span>`, 110 + i * 360, 400, 330, 150, PANEL, { color: CREAM, radius: 16, borderColor: CY, pad: [20, 22, 18, 22] }), 'fade-up')]).flat()],
        notes: 'Hidrocarburos: C + H. Combustibles del día a día. Conecta con CO₂ y cambio climático al quemarlos.' },
      { title: 'Las moléculas de la vida', layout: 'titleOnly', bg: BG, extra: [
        dg('cards', 'Azúcares: la energía rápida (glucosa, almidón)\nGrasas: la energía de reserva y las membranas\nProteínas: construyen y hacen funcionar el cuerpo\nADN: guarda las instrucciones', 90, 185, 1100, 440, { color: CREAM, colors: 'colorful' })],
        notes: 'Las grandes biomoléculas, todas basadas en carbono. Idea: la vida es química del carbono.' },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuántos enlaces puede formar un átomo de carbono?', ['1', '2', '3', '4'], 3)],
        notes: 'Cuatro: la clave del tema. Permite cadenas, anillos y toda la química orgánica.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, GR, BG, 28)], transition: 'zoom', extra: [
        text('En una frase', 84, 170, 900, 90, { fontSize: 60, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('El carbono forma cuatro enlaces y se encadena consigo mismo, así que construye desde el gas que calienta tu casa hasta el ADN de tus células.', 84, 290, 1020, 200, { fontSize: 30, color: DIM, lineHeight: 1.5 })],
        notes: 'Cierre con la idea grande: del butano al ADN, todo es carbono encadenado.' },
    ]), CREAM));
  } },

  // 9 · La química de cada día.
  edu_chem_everyday: { name: 'La química de cada día', cat: 'edu', summary: 'La química que hay en casa: la cocina (el calor, la levadura, el dorado de los alimentos), la limpieza (ácidos, bases y jabones) y los materiales y la cosmética, con votación y cuestionario', make: () => {
    const PAPER = '#fff7ef', INK = '#2a1f17', OR = '#e07a3b', RE = '#d84b3f', TE = '#1f8f8f', PUR = '#7b4fb0', GREY = '#6b5f52', S = FF.space;
    return numbered(ink(build({ name: 'La química de cada día', palette: 'warm', fonts: 'friendly', title: { color: INK, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: PAPER, back: [glow(960, -120, 560, OR, PAPER, 14), glow(-120, 560, 520, TE, PAPER, 12)], extra: [
        text('QUÍMICA · EN TU CASA', 90, 150, 680, 36, { fontSize: 22, letterSpacing: 3, color: OR, fontWeight: 700 }),
        text('La química<br>de cada día', 84, 196, 820, 200, { fontSize: 76, fontWeight: 800, color: INK, lineHeight: 1.02, fontFamily: S }),
        text('No hace falta un laboratorio: en la cocina, en el baño y en el armario hay química todo el rato.', 90, 440, 700, 120, { fontSize: 27, color: GREY, lineHeight: 1.4 }),
        after(img(beakerSVG(OR, 0.55), 940, 190, 220, 300, 'Un vaso con una sustancia de casa'), 'fade-left', { duration: 800 })],
        notes: 'Arranque cercano: la química no es solo del aula. Vamos a cazarla en casa.' },
      { title: 'En la cocina', layout: 'titleOnly', bg: PAPER, extra: [
        ...[['El calor cocina', 'Cocinar es provocar reacciones: el huevo se cuaja, la carne cambia.', RE], ['El dorado sabroso', 'Al tostar, azúcares y proteínas reaccionan y dan color y sabor.', OR], ['La levadura', 'Suelta gas (CO₂) y por eso el pan y el bizcocho suben.', TE]].map(([t, d, col], i) => { const x = 90 + i * 380; return [
          on(card(`<b style="font-size:26px;color:${col}">${t}</b><br><span style="font-size:21px;color:${INK}">${d}</span>`, x, 230, 350, 230, '#ffffff', { color: INK, radius: 16, borderColor: col, pad: [20, 24, 18, 24] }), 'fade-up')]; }).flat()],
        notes: 'Cocinar = química. El dorado (reacción de Maillard, sin tecnicismos) y la levadura que suelta CO₂.' },
      { title: 'En la limpieza', layout: 'titleOnly', bg: PAPER, extra: [
        text('Muchos productos son <b style="color:' + RE + '">ácidos</b> (quitan cal, como el vinagre o el limón) o <b style="color:' + TE + '">bases</b> (cortan la grasa, como el bicarbonato o la sosa).', 90, 190, 1100, 150, { fontSize: 29, color: INK, lineHeight: 1.45 }),
        text('El <b>jabón</b> funciona porque agarra a la vez el agua y la grasa, y así se lleva la suciedad.', 90, 370, 1100, 90, { fontSize: 26, color: GREY, lineHeight: 1.4 }),
        on(card('<b>¡Cuidado!</b> Nunca mezcles productos de limpieza (p. ej. lejía y amoniaco): pueden soltar gases tóxicos.', 90, 480, 1100, 120, '#fdecea', { color: '#9b2c22', radius: 14, borderColor: RE, fontSize: 24, pad: [18, 24, 18, 24] }), 'fade-up')],
        notes: 'Ácidos vs bases en la limpieza, y cómo actúa el jabón. Aviso de seguridad real: no mezclar productos.' },
      { title: 'Materiales y cosmética', layout: 'titleOnly', bg: PAPER, extra: [
        dg('cards', 'Plásticos: largas cadenas de carbono (polímeros)\nCremas: mezclas de agua y aceite que no se separan\nDentífrico: abrasivos suaves y flúor para el esmalte\nPilas: reacciones que dan electricidad', 90, 185, 1100, 440, { color: INK, colors: 'colorful' })],
        notes: 'Química en objetos cotidianos: plásticos, cremas, pasta de dientes, pilas. Todo es química aplicada.' },
      { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿Por qué sube un bizcocho en el horno?', options: ['Por arte de magia', 'La levadura suelta un gas que lo hincha', 'El calor lo estira', 'Por el azúcar'] })],
        notes: 'Votación. La levadura (química o biológica) libera CO₂ que forma burbujas y lo esponja.' },
      { layout: 'blank', bg: '#f6ece0', extra: [quiz('El vinagre quita la cal. El vinagre es…', ['Una base', 'Un ácido', 'Neutro', 'Un gas'], 1)],
        notes: 'El vinagre (ácido acético) es ácido; por eso disuelve la cal. Enlaza con la práctica de pH.' },
      { layout: 'blank', bg: PAPER, back: [glow(1000, 420, 520, OR, PAPER, 14)], transition: 'zoom', extra: [
        text('Para llevarte', 84, 160, 820, 90, { fontSize: 60, fontWeight: 800, color: INK, fontFamily: S }),
        text('La química explica tu día: cocinar, limpiar, lavarte los dientes. Reto: busca en tres etiquetas de casa un ingrediente químico y averigua para qué sirve.', 84, 280, 960, 200, { fontSize: 29, color: GREY, lineHeight: 1.45 })],
        notes: 'Cierre con un reto de etiquetas: leer ingredientes y buscar su función. Hace la química cercana y útil.' },
    ]), INK));
  } },

  // 10 · Hitos y científicos de la química.
  edu_chem_history: { name: 'Historia de la química', cat: 'edu', summary: 'Una línea del tiempo de la química: de la alquimia a Lavoisier y la masa, Dalton y los átomos, Mendeléiev y la tabla, Marie Curie y la radiactividad, hasta hoy, con votación y cuestionario', make: () => {
    const BG = '#120e1a', PANEL = '#1f1830', VI = '#b48ce8', AM = '#e8c04b', GR = '#5fd38a', CY = '#39c0c8', DIM = '#9a8ab0', CREAM = '#f1ecf8', M = FF.mono, S = FF.space;
    return numbered(ink(build({ name: 'Historia de la química', palette: 'midnight', fonts: 'tech', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, back: [glow(1000, -120, 620, VI, BG, 26), glow(-120, 560, 520, AM, BG, 16)], extra: [
        text('QUÍMICA · SU HISTORIA', 90, 140, 680, 36, { fontSize: 22, letterSpacing: 4, color: VI, fontWeight: 700, fontFamily: M }),
        text('De la alquimia<br>a la química', 84, 190, 840, 220, { fontSize: 72, fontWeight: 800, color: CREAM, lineHeight: 1.04, fontFamily: S }),
        text('En apenas dos siglos pasamos de buscar la piedra filosofal a ordenar todos los elementos. Estos son los hitos.', 90, 452, 680, 120, { fontSize: 27, color: DIM, lineHeight: 1.4 })],
        notes: 'Arranque: la química nació de la alquimia. Un recorrido por sus grandes momentos.' },
      { title: 'La línea del tiempo', layout: 'titleOnly', bg: BG, extra: [
        dg('timeline', '1789 · Lavoisier: la masa se conserva\n1808 · Dalton: la teoría atómica\n1869 · Mendeléiev: la tabla periódica\n1898 · Marie Curie: la radiactividad\n1913 · Bohr: el modelo del átomo', 90, 190, 1100, 420, { color: CREAM, colors: 'colorful' })],
        notes: 'Cinco hitos ordenados. Cada uno abrió una puerta que hoy estudiamos.' },
      { title: 'Dos gigantes', layout: 'titleOnly', bg: BG, extra: [
        ...[['Mendeléiev', 'Ordenó los elementos y dejó huecos para los que aún no se conocían… y acertó.', AM], ['Marie Curie', 'Estudió la radiactividad y ganó dos premios Nobel, en física y en química.', VI]].map(([t, d, col], i) => [
          on(card(`<b style="font-size:30px;color:${col}">${t}</b><br><span style="font-size:23px;color:${CREAM}">${d}</span>`, 110 + i * 540, 230, 500, 240, PANEL, { color: CREAM, radius: 16, borderColor: col, pad: [22, 26, 20, 26] }), 'fade-up')]).flat()],
        notes: 'Dos figuras clave. Mendeléiev predijo elementos; Curie abrió la radiactividad y rompió barreras.' },
      { title: 'Qué nos dejó cada uno', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 150, y: 185, w: 980, h: 300, stroke: '#3a3350',
          rows: [['Científico', 'Idea que nos dejó'], ['Lavoisier', 'nada se pierde: la masa se conserva'], ['Dalton', 'la materia está hecha de átomos'], ['Mendeléiev', 'los elementos tienen un orden'], ['Curie', 'hay átomos que emiten radiación']] }),
        text('Cada idea es un peldaño: sin la anterior, la siguiente no existiría.', 150, 515, 980, 50, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'Tabla-resumen. La ciencia avanza por acumulación: cada aporte se apoya en el anterior.' },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 30, x: 70, y: 70, w: 1140, h: 560,
        question: '¿Quién ordenó los elementos y creó la tabla periódica?', options: ['Lavoisier', 'Dalton', 'Mendeléiev', 'Marie Curie'] })],
        notes: 'Votación. Mendeléiev. Sirve para fijar el nombre con su aportación.' },
      { layout: 'blank', bg: '#1a1426', extra: [quiz('¿Qué científica ganó dos premios Nobel estudiando la radiactividad?', ['Marie Curie', 'Ada Lovelace', 'Rosalind Franklin', 'Dorothy Hodgkin'], 0)],
        notes: 'Marie Curie, Nobel de Física (1903) y de Química (1911). Buen momento para hablar de mujeres en la ciencia.' },
      { layout: 'blank', bg: BG, back: [glow(640, 300, 760, VI, BG, 26)], transition: 'zoom', extra: [
        text('Para llevarte', 84, 170, 820, 90, { fontSize: 60, fontWeight: 800, color: CREAM, fontFamily: S }),
        text('La química que estudias es fruto de siglos de preguntas: pesar, imaginar átomos, ordenar elementos, descubrir la radiación. Y sigue abierta: aún quedan preguntas por responder.', 84, 290, 1020, 210, { fontSize: 29, color: DIM, lineHeight: 1.5 })],
        notes: 'Cierre inspirador: la ciencia es una historia viva y sin terminar. Anima a hacerse preguntas.' },
    ]), CREAM));
  } },

};
