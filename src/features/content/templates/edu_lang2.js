// Example presentations: Idiomas extranjeros en el aula. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Ten topics, each with its own look: a made-up underground map for directions in
// English, a Paris bistro blackboard under its awning, a Bauhaus poster for German genders, a Riviera postcard for the
// Italian perfect tense, a neon arcade for phrasal verbs, a detective's file for false friends, a vinyl record for
// French sounds, an Advent calendar for German Christmas, a watchmaker's bench for English tenses and blue-and-white
// tiles with a yellow tram for Portuguese.
// The words and sentences of the language being taught go in italics (or in a box of their own), marked with
// lang="…" translate="no", so a translation of the deck leaves them as they are; the notes say so on every deck.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A drawing of our own (SVG) as a data URL: no external pictures.
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// A picture that is only decoration (a paper, a pattern) filling the slide.
const paperImg = (src, alt) => ({ ...img(src, 0, 0, 1280, 720, alt, { fit: 'cover' }), decorative: true });
// The same object on two slides (Transform): give it a fixed id.
const keep = (b, id) => ({ ...b, id });
// Click-by-click and chained animations, shorter to write.
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
// A stroke through points on the slide (an ink object, so it can be drawn as you present).
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = Math.ceil(width / 2) + 4;
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad, w = Math.max(...xs) - x + pad, h = Math.max(...ys) - y + pad;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// An arc from one point to another, bulging up (a liaison, a jump on a timeline).
const arcPts = (x0, x1, y, hgt, n = 30) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return [x0 + (x1 - x0) * t, y - hgt * 4 * t * (1 - t)]; });
// A small uppercase label with wide spacing.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 36, { fontSize: 20, letterSpacing: 5, color, ...props });
// A round numbered badge.
const badge = (n, x, y, d, bg, fg = '#ffffff', props = {}) => text(String(n), x, y, d, d, { fontSize: Math.round(d * 0.5), fontWeight: 800, color: fg, bg, radius: d / 2, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0], ...props });
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 40, x: 60, y: 50, w: 1160, h: 620, ...props });
// The credits of the 3D models of a deck, in one small line.
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: 12, color });
// A 3D model without its caption (its credit, when it needs one, goes in a line of its own).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
// Fonts used outside the deck's pair.
const FF = { caveat: "'Caveat', cursive", dancing: "'Dancing Script', cursive", mono: "'JetBrains Mono', monospace", abril: "'Abril Fatface', serif",
  anton: "'Anton', sans-serif", lora: "'Lora', serif", oswald: "'Oswald', sans-serif", bebas: "'Bebas Neue', sans-serif", pacifico: "'Pacifico', cursive",
  courier: "'Courier New', 'Cousine', monospace", josefin: "'Josefin Sans', sans-serif", playfair: "'Playfair Display', serif" };
// A word or a sentence in the language being taught: in italics, with its language, and marked not to be translated.
const fl = (s, lang, style = '') => `<i lang="${lang}" translate="no"${style ? ` style="${style}"` : ''}>${s}</i>`;
// The same, upright (for words that already sit in a box of their own: a card, a sign, a bubble).
const fx = (s, lang, style = '') => `<span lang="${lang}" translate="no"${style ? ` style="${style}"` : ''}>${s}</span>`;
// A speech bubble: a rounded box with a small tail at the bottom (left or right), and its text.
const bubble = (html, x, y, w, h, fill, fg, side = 'left', props = {}) => [
  shape('rounded', x, y, w, h, fill, { radius: 24, ...(props.stroke && { stroke: props.stroke, strokeWidth: 2 }) }),
  shape('triangle', side === 'left' ? x + 40 : x + w - 80, y + h - 6, 40, 34, fill, { rotation: 180 }),
  text(html, x + 22, y + 10, w - 44, h - 20, { fontSize: 28, color: fg, vAlign: 'middle', ...props.text })];

// ---- Drawings ---------------------------------------------------------------------
// 1 · A made-up underground map (Riverton): three lines, the stations and their names.
const ST = { westgate: [50, 210], market: [230, 210], central: [420, 210], oldtown: [600, 210], eastbank: [720, 210],
  hillgate: [420, 50], riverside: [520, 380], museum: [700, 380], library: [230, 50], harbour: [230, 380] };
const TUBE = (route = false) => svgURL(780, 440,
  '<g fill="none" stroke-linecap="round" stroke-linejoin="round">'
  + `<path d="M50 210H720" stroke="#dc241f" stroke-width="12"/>`
  + `<path d="M420 50V290L510 380H700" stroke="#1d4ed8" stroke-width="12"/>`
  + `<path d="M230 50V380" stroke="#00843d" stroke-width="12"/>`
  + (route ? '<path d="M50 210H420V290L510 380H700" stroke="#ffd329" stroke-width="5" stroke-dasharray="2 10" opacity=".95"/>' : '') + '</g>'
  + Object.entries(ST).map(([k, [x, y]]) => {
    const swap = ['central', 'market'].includes(k);
    return swap ? `<circle cx="${x}" cy="${y}" r="15" fill="#ffffff" stroke="#1c1c1c" stroke-width="5"/>` : `<circle cx="${x}" cy="${y}" r="9" fill="#ffffff" stroke="#1c1c1c" stroke-width="4"/>`; }).join('')
  + [['Westgate', 50, 186, 'middle'], ['Market Street', 238, 242, 'start'], ['Central', 438, 242, 'start'], ['Old Town', 600, 186, 'middle'], ['Eastbank', 720, 186, 'middle'],
    ['Hill Gate', 440, 56, 'start'], ['Riverside', 520, 416, 'middle'], ['Museum', 700, 416, 'middle'], ['Library', 250, 56, 'start'], ['Harbour', 250, 386, 'start']]
    .map(([n, x, y, a]) => `<text x="${x}" y="${y}" text-anchor="${a}" font-family="Helvetica,Arial,sans-serif" font-size="20" font-weight="700" fill="#1c1c1c">${n}</text>`).join(''));
// A street seen from above with four places (prepositions of place).
const STREET = svgURL(640, 420, '<rect width="640" height="420" rx="18" fill="#eef1f4"/>'
  + '<rect x="0" y="180" width="640" height="70" fill="#9aa3ad"/><path d="M20 215H620" stroke="#ffffff" stroke-width="4" stroke-dasharray="26 18"/>'
  + '<rect x="300" y="0" width="70" height="420" fill="#9aa3ad"/><path d="M335 10V170M335 260V410" stroke="#ffffff" stroke-width="4" stroke-dasharray="26 18"/>'
  + [[40, 40, 110, 120, '#1d4ed8', 'BANK'], [160, 40, 120, 120, '#e07a1f', 'CAFÉ'], [390, 40, 220, 120, '#7a3fb0', 'MUSEUM'], [40, 270, 240, 130, '#3a9a4a', 'PARK'], [390, 270, 220, 130, '#c0392b', 'SCHOOL']]
    .map(([x, y, w, h, c, n]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${c}"/><text x="${x + w / 2}" y="${y + h / 2 + 9}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="24" font-weight="700" fill="#ffffff">${n}</text>`).join('')
  + [[70, 300], [130, 360], [200, 310], [250, 370]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#2c7a37" opacity=".7"/>`).join(''));

// 2 · Paris bistro: a red and white awning with a scalloped edge, and a chalkboard.
const AWNING = svgURL(1280, 130, Array.from({ length: 16 }, (_, i) => `<rect x="${i * 80}" y="0" width="80" height="96" fill="${i % 2 ? '#f6efe4' : '#b3202a'}"/>`
  + `<path d="M${i * 80} 96 Q${i * 80 + 40} 130 ${i * 80 + 80} 96Z" fill="${i % 2 ? '#f6efe4' : '#b3202a'}"/>`).join('')
  + '<rect width="1280" height="10" fill="#7a1219"/>');
const CHALK = svgURL(1280, 720, '<defs><radialGradient id="c" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#2f3d37"/><stop offset="1" stop-color="#18201d"/></radialGradient></defs>'
  + '<rect width="1280" height="720" fill="url(#c)"/>'
  + [[120, 640, 300], [700, 120, 260], [980, 560, 200], [300, 300, 160]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.35}" fill="#ffffff" opacity=".035"/>`).join('')
  + '<rect x="14" y="14" width="1252" height="692" fill="none" stroke="#7a5233" stroke-width="22"/>');
// A cup of coffee with steam (chalk lines).
const CUP = svgURL(300, 260, '<g fill="none" stroke="#f3efe6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M60 120H220V170Q220 230 140 230Q60 230 60 170Z"/><path d="M220 140Q262 140 262 168Q262 196 220 192"/><path d="M30 240H250"/>'
  + '<path d="M110 100Q96 80 110 60Q124 40 110 20M150 100Q136 80 150 60Q164 40 150 20M190 100Q176 80 190 60Q204 40 190 20" opacity=".7"/></g>');

// 3 · Bauhaus: the three forms in the three primaries.
const BAU = { red: '#d1291f', blue: '#1f4fa3', yellow: '#f2b705', black: '#151515', paper: '#f1ebdd' };

// 4 · A Riviera postcard: sunset, sea, cliffs, a coast road (with the stops of the trip).
const STOPS = [['Genova', 70, 120], ['Camogli', 260, 190], ['Portofino', 420, 270], ['Cinque Terre', 640, 300], ['Pisa', 860, 380]];
const RIVIERA = svgURL(1000, 460, '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset=".55" stop-color="#ffd9a0"/><stop offset="1" stop-color="#fff1d6"/></linearGradient>'
  + '<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a8fb8"/><stop offset="1" stop-color="#17627f"/></linearGradient></defs>'
  + '<rect width="1000" height="460" rx="14" fill="url(#s)"/><circle cx="820" cy="120" r="70" fill="#ff8a3d" opacity=".9"/>'
  // (the land along the top and the sea below the coast road)
  + '<path d="M0 0H1000V200C900 260 820 330 760 330C640 320 560 300 440 290C330 270 260 220 160 170C100 150 40 140 0 140Z" fill="#c9a26b"/>'
  + '<path d="M0 140C40 140 100 150 160 170C260 220 330 270 440 290C560 300 640 320 760 330C820 330 900 400 1000 420V460H0Z" fill="url(#m)"/>'
  + [[120, 60], [320, 80], [560, 120], [880, 260]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="34" fill="#6f8f3c"/><circle cx="${x + 30}" cy="${y + 10}" r="26" fill="#5c7a2f"/>`).join('')
  + [[300, 360], [520, 400], [180, 300]].map(([x, y]) => `<path d="M${x} ${y}h40l-8 12h-24z" fill="#ffffff"/><path d="M${x + 20} ${y}v-30l16 26z" fill="#ffffff"/>`).join('')
  + `<path d="M${STOPS.map(s => s[1] + ' ' + s[2]).join(' L')}" stroke="#7a2e1b" stroke-width="4" stroke-dasharray="10 8" fill="none"/>`
  + STOPS.map(([n, x, y], i) => `<circle cx="${x}" cy="${y}" r="9" fill="#7a2e1b"/><text x="${x + (i === 4 ? -14 : 14)}" y="${y - 14}" text-anchor="${i === 4 ? 'end' : 'start'}" font-family="Georgia,serif" font-style="italic" font-size="24" fill="#3b1f12">${n}</text>`).join(''));
// A postage stamp (with its perforated edge).
const STAMP = (c1, c2) => svgURL(160, 190, `<rect width="160" height="190" fill="#ffffff"/>`
  + Array.from({ length: 9 }, (_, i) => `<circle cx="${8 + i * 18}" cy="0" r="6" fill="#fffaf0"/><circle cx="${8 + i * 18}" cy="190" r="6" fill="#fffaf0"/>`).join('')
  + Array.from({ length: 11 }, (_, i) => `<circle cx="0" cy="${6 + i * 18}" r="6" fill="#fffaf0"/><circle cx="160" cy="${6 + i * 18}" r="6" fill="#fffaf0"/>`).join('')
  + `<rect x="14" y="14" width="132" height="162" fill="${c1}"/><circle cx="80" cy="80" r="34" fill="${c2}"/><path d="M14 130Q60 100 100 120T146 110V176H14Z" fill="#17627f"/>`
  + '<text x="136" y="166" text-anchor="end" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#ffffff">€1,30</text>');

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · English, directions: a made-up underground map, a train that rides the route, a street plan.
  edu_lang2_directions: { name: 'Inglés: cómo llegar a…', cat: 'edu', summary: 'Plano de metro inventado: un tren recorre la ruta con Trayectoria, frases al paso, diálogo, calle dibujada, ordenar, concurso y cuenta atrás', make: () => {
    const BG = '#f6f5f0', INK = '#1c1c1c', GREY = '#5f6368', RED = '#dc241f', BLUE = '#1d4ed8', GREEN = '#00843d', YEL = '#ffd329', H = pairStacks('clean').heading;
    const E = s => fl(s, 'en');
    // A station name board: a white bar on a coloured ring, a sign of our own.
    const sign = (str, x, y, w, c, size = 34) => [shape('rounded', x, y, w, 76, '#ffffff', { stroke: c, strokeWidth: 10, radius: 38 }),
      text(fx(str, 'en'), x + 30, y + 6, w - 60, 64, { fontFamily: H, fontSize: size, fontWeight: 800, color: INK, textAlign: 'center', vAlign: 'middle', letterSpacing: 1 })];
    const lines = () => [shape('rect', 0, 690, 1280, 10, RED), shape('rect', 0, 700, 1280, 10, BLUE), shape('rect', 0, 710, 1280, 10, GREEN)];
    const NOTE = ' Las frases en inglés van en cursiva o en su propio cartel: no se traducen.';
    return numbered(build({ name: 'Inglés: cómo llegar a…', palette: 'office', fonts: 'clean', title: { color: INK, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [
        shape('rect', -20, 489, 1320, 22, RED), shape('rect', 949, -20, 22, 760, BLUE), shape('rect', -20, 599, 980, 22, GREEN),
        shape('rect', 949, 599, 22, 22, GREEN), ...lines()], extra: [
        kicker('INGLÉS · 2.º ESO · UNIDAD 5', 90, 90, 700, GREY, { fontFamily: H }),
        text(E('Excuse me, how do I get to…?'), 84, 130, 760, 190, { fontFamily: H, fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1.1 }),
        text('Pedir y dar indicaciones en la ciudad y en el metro', 90, 330, 720, 50, { fontSize: 28, color: GREY }),
        ...[[300, 500], [640, 500], [960, 500], [960, 610], [480, 610], [1160, 500]].map(([x, y], i) => shape('ellipse', x - (i === 2 ? 26 : 18), y - (i === 2 ? 26 : 18), i === 2 ? 52 : 36, i === 2 ? 52 : 36, '#ffffff', { stroke: INK, strokeWidth: 7 })),
        ...[['Market Street', 300, 530], ['Old Town', 640, 530], ['Central', 990, 530]].map(([n, x, y]) => text(fx(n, 'en'), x - (n === 'Central' ? 0 : 110), y, 220, 34, { fontFamily: H, fontSize: 20, fontWeight: 700, color: INK, textAlign: n === 'Central' ? 'left' : 'center' })),
        withAnims(shape('ellipse', 80, 486, 28, 28, YEL, { stroke: INK, strokeWidth: 4 }), A('fade-in', { start: 'afterPrev', duration: 300 }), path([[866, 0]], { start: 'afterPrev', duration: 2600 })),
        ...sign('Riverton', 860, 120, 330, RED, 40)],
        notes: 'Portada: un plano de metro inventado (Riverton no existe). Pregunta de arranque: ¿cómo le explicarías a un turista dónde está tu instituto?' + NOTE },
      { title: 'Preguntar y responder', layout: 'titleOnly', bg: BG, back: lines(), transition: 'slide', extra: [
        kicker('PREGUNTAR', 90, 160, 500, RED, { fontFamily: H, fontWeight: 700 }),
        kicker('RESPONDER', 660, 160, 500, BLUE, { fontFamily: H, fontWeight: 700 }),
        ...[['Excuse me, where is the museum?', 'Perdone, ¿dónde está el museo?'], ['How do I get to Central?', '¿Cómo llego a Central?'], ['Is it far from here?', '¿Está lejos de aquí?']].map(([en, es], i) =>
          on(card(`<div style="font-size:27px;font-weight:700">${E(en)}</div><div style="font-size:21px;color:${GREY};margin-top:4px">${es}</div>`, 90, 205 + i * 140, 520, 120, '#ffffff',
            { color: INK, radius: 12, borderColor: RED, pad: [16, 22, 16, 22] }), 'fade-right')),
        ...[['Go straight on.', 'Sigue todo recto.'], ['Turn left at the corner.', 'Gira a la izquierda en la esquina.'], ['Take the second street on the right.', 'Coge la segunda calle a la derecha.'], ["It's opposite the park.", 'Está enfrente del parque.']].map(([en, es], i) =>
          on(card(`<div style="font-size:26px;font-weight:700">${E(en)}</div><div style="font-size:20px;color:${GREY};margin-top:2px">${es}</div>`, 660, 205 + i * 112, 530, 100, '#ffffff',
            { color: INK, radius: 12, borderColor: BLUE, pad: [12, 22, 12, 22] }), 'fade-left'))],
        notes: 'Cada clic añade una frase: primero las tres preguntas, luego las cuatro respuestas. Repetid en coro y después por parejas, uno pregunta y otro responde.' + NOTE },
      { title: '¿Dónde está? Las preposiciones', layout: 'titleOnly', bg: BG, back: lines(), extra: [
        img(STREET, 90, 170, 640, 420, 'Plano de una calle con un banco, una cafetería, un museo, un parque y un colegio'),
        ...[['next to', 'al lado de', 'The café is next to the bank.'], ['opposite', 'enfrente de', 'The school is opposite the park.'], ['between', 'entre', 'The road is between the park and the bank.'], ['on the corner', 'en la esquina', 'The café is on the corner.']].map(([p, es, ex], i) =>
          on(text(`<b style="font-size:30px;color:${[RED, BLUE, GREEN, '#7a3fb0'][i]}">${E(p)}</b> <span style="color:${GREY}">· ${es}</span><br>${E(ex)}`, 770, 175 + i * 105, 430, 96, { fontSize: 22, color: INK, lineHeight: 1.35 }), 'fade-left'))],
        notes: 'Plano dibujado con cinco lugares. Con cada clic aparece una preposición con su ejemplo: que la clase la compruebe en el plano antes de leer la frase.' + NOTE },
      { title: 'La ruta: de Westgate al museo', layout: 'titleOnly', bg: BG, back: lines(), transition: 'fade', extra: [
        img(TUBE(true), 60, 170, 780, 440, 'Plano del metro de Riverton: línea roja, azul y verde, con la ruta de Westgate a Museum marcada'),
        ...(() => { // (made in play order: the first leg, steps 1 and 2; the second leg, step 3)
          const step = ([c, n, en, es], i) => [after(badge(n, 870, 190 + i * 140, 56, c), 'zoom-in', { sound: 'pop', duration: 300 }),
            along(text(`<b>${E(en)}</b><br><span style="font-size:20px;color:${GREY}">${es}</span>`, 940, 182 + i * 140, 290, 134, { fontSize: 23, color: INK }), 'fade-left')];
          const S = [[RED, '1', 'Take the red line to Central.', 'Coge la línea roja hasta Central (2 paradas).'], [BLUE, '2', 'Change to the blue line.', 'Haz transbordo a la línea azul.'], [GREEN, '3', 'Get off at Museum.', 'Bájate en Museum.']];
          const leg1 = path([[180, 0], [370, 0]], { duration: 1800 }), s1 = step(S[0], 0), s2 = step(S[1], 1);
          const leg2 = path([[0, 80], [90, 170], [280, 170]], { duration: 2200 }), s3 = step(S[2], 2);
          return [withAnims(shape('ellipse', 60 + ST.westgate[0] - 16, 170 + ST.westgate[1] - 16, 32, 32, YEL, { stroke: INK, strokeWidth: 5 }), leg1, leg2), ...s1, ...s2, ...s3]; })()],
        notes: 'Primer clic: el tren (punto amarillo) va de Westgate a Central y aparece el paso 1. Segundo clic: cambia a la línea azul y llega a Museum. La línea punteada es la ruta completa.' + NOTE },
      { title: 'En el andén', layout: 'titleOnly', bg: BG, back: lines(), extra: [
        ...[[E('Excuse me, how do I get to the museum?'), 'left', 90, 175, '#ffffff', INK], [E('Take the red line and change at Central.'), 'right', 520, 280, BLUE, '#ffffff'],
          [E('Is it far?'), 'left', 90, 385, '#ffffff', INK], [E("No, it's only four stops. You can't miss it!"), 'right', 520, 490, BLUE, '#ffffff']].map(([t, side, x, y, f, fg], i) => {
          const [b, tail, tx] = bubble(t, x, y, 670, 86, f, fg, side, { stroke: f === '#ffffff' && '#c8ccd2' });
          return [on(b, 'fade-up', { sound: 'pop', duration: 350 }), along(tail, 'fade-up', { duration: 350 }), along(tx, 'fade-up', { duration: 350 })]; }).flat()],
        notes: 'Diálogo modelo: cada clic añade una réplica con un «pop». Leedlo por parejas y luego cambiad el destino (Library, Harbour…) sin mirar el texto.' + NOTE },
      { layout: 'blank', bg: BG, back: lines(), extra: [pollBlock({ kind: 'order', fontSize: 28, question: 'Ordena el diálogo', x: 80, y: 50, w: 1120, h: 610,
        options: ['Excuse me, where is the station?', 'Go straight on and turn right.', 'Is it far from here?', 'No, about five minutes.', 'Thank you very much!'] })],
        notes: 'Actividad de ordenar desde el móvil: se corrige sola. Las frases de las opciones están en inglés y no se traducen.' },
      { layout: 'blank', bg: BG, back: lines(), extra: [quiz('¿Cómo se dice «gira a la izquierda»?', ['Go left on', 'Turn left', 'Take left', 'Change left'], 1, { time: 15 })],
        notes: 'Concurso con puntos: más rápido, más puntos. «Turn left» es la única forma correcta; «change» se usa para cambiar de línea.' + NOTE },
      { layout: 'blank', bg: BG, back: lines(), transition: 'zoom', extra: [
        text('Tu turno', 90, 90, 600, 90, { fontFamily: H, fontSize: 60, fontWeight: 800, color: INK }),
        card(`<b style="color:${RED}">Alumno A</b><br>Estás en Harbour. Pregunta cómo llegar a Old Town.`, 90, 210, 560, 150, '#ffffff', { fontSize: 26, color: INK, borderColor: RED, radius: 12 }),
        card(`<b style="color:${BLUE}">Alumno B</b><br>Mira el plano y explícale la ruta en inglés.`, 90, 390, 560, 150, '#ffffff', { fontSize: 26, color: INK, borderColor: BLUE, radius: 12 }),
        text(`Y al acabar: ${E('Mind the gap!')} · «¡Cuidado con el hueco!», el aviso más famoso del metro de Londres.`, 90, 570, 640, 80, { fontSize: 22, color: GREY }),
        timer(240, 820, 180, 320, { style: 'ring', color: BLUE, auto: false })],
        notes: 'Juego de rol de cuatro minutos (la cuenta atrás empieza con un clic). Luego cambiad los papeles. «Mind the gap» es un buen detalle cultural para cerrar.' + NOTE },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · French at the café: a chalkboard under a red and white awning, a round sign with curved text, the bill as a table.
  edu_lang2_cafe: { name: 'Francés: au café', cat: 'edu', summary: 'Pizarra de bistró bajo el toldo: texto curvo, cuenta con fórmulas en la tabla, ecuación de precios, diálogo, barras y huecos', make: () => {
    const CH = '#f3efe6', DIM = '#b9c2bb', RED = '#e0525c', YEL = '#f2d27a', BLUEC = '#9cc7e8', HAND = FF.caveat, H = pairStacks('classic').heading;
    const F = s => fl(s, 'fr');
    const board = (awning = true) => [paperImg(CHALK, 'Pizarra'), ...(awning ? [img(AWNING, 0, 0, 1280, 130, 'Toldo de rayas rojas y blancas', { decorative: true })] : [])];
    const NOTE = ' Las palabras en francés van en cursiva (o en su propio recuadro): no se traducen.';
    return numbered(build({ name: 'Francés: au café', palette: 'warm', fonts: 'classic', title: { color: CH, size: 48, font: HAND }, body: { color: CH } }, [
      { layout: 'blank', bg: '#18201d', transition: 'fade', back: board(), extra: [
        text(fx('Au café', 'fr'), 90, 170, 640, 200, { fontFamily: HAND, fontSize: 150, fontWeight: 700, color: CH }),
        text('Francés · A1 · Pedir algo en una cafetería, pagar y ser amable', 96, 370, 620, 90, { fontSize: 28, color: DIM }),
        text(F('Bonjour ! Un café, s’il vous plaît.'), 96, 480, 640, 60, { fontFamily: HAND, fontSize: 44, color: YEL }),
        shape('ellipse', 790, 190, 390, 390, '#1f2a26', { stroke: CH, strokeWidth: 4 }),
        text(fx('CAFÉ DU COIN · DEPUIS 1923 · ', 'fr'), 805, 205, 360, 360, { fontFamily: H, fontSize: 26, curve: 100, color: CH, textAlign: 'center', letterSpacing: 4 }),
        img(CUP, 885, 290, 200, 175, 'Taza de café dibujada con tiza'),
        after(shape('star4', 1120, 170, 60, 60, YEL), 'spin', { duration: 700 })],
        notes: 'Portada de bistró: toldo de rayas, pizarra y un cartel redondo con texto curvo (el café es inventado). Saluda en francés al entrar: «Bonjour tout le monde !».' + NOTE },
      { title: 'Sur la carte', layout: 'titleOnly', bg: '#18201d', back: board(false), transition: 'slide', extra: [
        ...[['coffee', 'un café', 'un café solo'], ['coffee', 'un café crème', 'un café con leche'], ['droplet', 'un chocolat chaud', 'un chocolate caliente'], ['cake', 'un croissant', 'un cruasán'],
          ['utensils', 'une tartine', 'una tostada con mantequilla'], ['apple', 'un jus d’orange', 'un zumo de naranja']].map(([ic, fr, es], i) => {
          const x = 90 + (i % 2) * 560, y = 190 + Math.floor(i / 2) * 150;
          return [after(icon(ic, x, y + 8, 60, i < 3 ? YEL : BLUEC), 'zoom-in', { duration: 300, delay: i ? 0 : 200 }),
            along(text(`<span style="font-family:${HAND};font-size:46px;color:${CH}">${F(fr)}</span><br><span style="font-size:21px;color:${DIM}">${es}</span>`, x + 84, y - 4, 440, 120, { fontSize: 22, color: CH }), 'fade-right')]; }).flat()],
        notes: 'La carta aparece sola, línea a línea. Fíjate en «un» y «une»: el artículo indica el género (une tartine es femenino). Practica la pronunciación de «croissant» y «chocolat».' + NOTE },
      { title: 'Le serveur et le client', layout: 'titleOnly', bg: '#18201d', back: board(false), extra: [
        ...[[F('Bonjour ! Vous désirez ?'), 'left', 90, 175, '#2f6f63'], [F('Un café crème et un croissant, s’il vous plaît.'), 'right', 470, 285, '#7a2a30'],
          [F('Sur place ou à emporter ?'), 'left', 90, 395, '#2f6f63'], [F('Sur place. Merci beaucoup !'), 'right', 470, 505, '#7a2a30']].map(([t, side, x, y, f]) => {
          const [b, tail, tx] = bubble(t, x, y, 720, 86, f, CH, side, { text: { fontSize: 30 } });
          return [on(b, side === 'left' ? 'fade-right' : 'fade-left', { duration: 400 }), along(tail, 'fade-in', { duration: 400 }), along(tx, side === 'left' ? 'fade-right' : 'fade-left', { duration: 400 })]; }).flat(),
        text('le serveur', 830, 192, 300, 50, { fontFamily: HAND, fontSize: 34, color: DIM }), text('le client', 260, 302, 190, 50, { fontFamily: HAND, fontSize: 34, color: DIM, textAlign: 'right' })],
        notes: 'Diálogo en cuatro réplicas, una por clic. «Sur place ou à emporter ?» = ¿para tomar aquí o para llevar? Representadlo por parejas con la carta delante.' + NOTE },
      { title: 'L’addition, s’il vous plaît', layout: 'titleOnly', bg: '#18201d', back: board(false), transition: 'fade', extra: [
        tableBlock({ x: 90, y: 180, w: 700, h: 420, fontSize: 28, header: true, headBg: '#7a2a30', headFg: CH, stroke: '#55625b', color: CH, colW: [3.4, 1.6, 1.2, 1.8],
          rows: [['Commande', 'Prix', 'Qté', 'Total'], [F('café crème'), '2,80 €', '2', '=B2*C2'], [F('croissant'), '1,40 €', '3', '=B3*C3'], [F('jus d’orange'), '3,50 €', '1', '=B4*C4'],
            [F('tartine'), '2,20 €', '1', '=B5*C5'], ['<b>' + F('Total') + '</b>', '', '', '<b>=SUMA(ARRIBA)</b>']] }),
        on(text(`<div style="font-family:${HAND};font-size:40px;color:${YEL}">${F('Ça fait combien ?')}</div><div style="margin-top:6px">¿Cuánto es? Se responde con la cifra: ${F('« Ça fait quinze euros cinquante. »')}</div>`, 830, 200, 370, 250, { fontSize: 24, color: CH }), 'fade-left'),
        text('Precios inventados, para practicar números.', 830, 520, 360, 60, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'La cuenta es una tabla con fórmulas (=B2*C2 y =SUMA(ARRIBA)): cambia una cantidad y el total se recalcula solo. Pide que lean el total en voz alta en francés.' + NOTE },
      { title: 'Los números del ticket', layout: 'titleOnly', bg: '#18201d', back: board(false), extra: [
        mathBlock({ x: 90, y: 190, w: 1100, h: 110, fontSize: 46, color: CH, latex: '2 \\times 2{,}80 + 3 \\times 1{,}40 + 3{,}50 + 2{,}20 = 15{,}50\\ \\text{€}' }),
        ...[['15,50 €', 'quinze euros cinquante'], ['70', 'soixante-dix (60 + 10)'], ['80', 'quatre-vingts (4 × 20)'], ['90', 'quatre-vingt-dix (4 × 20 + 10)']].map(([n, fr], i) =>
          on(text(`<span style="font-family:${HAND};font-size:52px;color:${YEL}">${n}</span>&nbsp;&nbsp;${F(fr)}`, 90 + (i % 2) * 560, 350 + Math.floor(i / 2) * 120, 540, 90, { fontSize: 28, color: CH, vAlign: 'middle' }), 'fade-up'))],
        notes: 'La ecuación comprueba la cuenta de la diapositiva anterior. Después, los números que más cuestan: setenta, ochenta y noventa se construyen sumando y multiplicando.' + NOTE },
      { title: 'Tu ou vous ?', layout: 'titleOnly', bg: '#18201d', back: board(false), transition: 'push', extra: [
        ...[['tu', 'Con amigos, familia y gente de tu edad', 'Tu veux un café ?', BLUEC], ['vous', 'Con el camarero, con desconocidos y con varias personas', 'Vous désirez ?', YEL]].map(([w, d, ex, c], i) => {
          const x = 90 + i * 560;
          return [on(text(fx(w, 'fr'), x, 180, 500, 170, { fontFamily: HAND, fontSize: 150, fontWeight: 700, color: c, textAlign: 'center' }), 'zoom-in', { duration: 400 }),
            along(text(`${d}<br><span style="font-family:${HAND};font-size:40px;color:${c}">${F(ex)}</span>`, x, 370, 500, 170, { fontSize: 26, color: CH, textAlign: 'center' }), 'fade-up')]; }).flat(),
        shape('rect', 638, 200, 4, 330, DIM, { opacity: 50 }),
        text('En una cafetería, ante la duda, siempre ' + F('vous') + '.', 90, 580, 1100, 50, { fontSize: 28, color: DIM, textAlign: 'center' })],
        notes: 'El tuteo francés es más restringido que el español: al camarero se le habla de «vous». Pregunta en qué situaciones de su vida usarían cada uno.' + NOTE },
      { title: 'Au comptoir ou en terrasse ?', layout: 'titleOnly', bg: '#18201d', back: board(false), extra: [
        chartBlock({ x: 90, y: 170, w: 680, h: 470, chartType: 'bar', color: YEL, dataLabels: true, yTitle: 'euros', labelColor: DIM,
          data: [['Au comptoir', 1.4], ['En salle', 2.1], ['En terrasse', 2.6]].map(([label, value]) => ({ label, value })) }),
        on(text(`<div style="font-family:${HAND};font-size:44px;color:${YEL}">Costumbre francesa</div>El mismo café cuesta menos de pie en la barra (${F('au comptoir')}) que sentado en la terraza: se paga también el sitio.`, 810, 210, 380, 300, { fontSize: 25, color: CH }), 'fade-left'),
        text('Precio de un café solo en una cafetería de barrio (datos inventados).', 810, 560, 380, 70, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Detalle cultural: en muchos cafés de Francia la carta tiene precios distintos según dónde te sientes. Cifras inventadas pero verosímiles.' + NOTE },
      { layout: 'blank', bg: '#18201d', back: board(false), extra: [pollBlock({ kind: 'gaps', fontSize: 36, question: 'Complète le dialogue', x: 80, y: 60, w: 1120, h: 600,
        text: '— Bonjour ! Je [voudrais] un café, s’il vous [plaît]. — Et avec [ceci] ? — C’est tout, [merci]. Ça fait [combien] ?', options: [] })],
        notes: 'Completar huecos desde el móvil. Las respuestas: voudrais, plaît, ceci, merci, combien. Todo el texto de la actividad está en francés y no se traduce.' },
      { layout: 'blank', bg: '#18201d', back: board(), transition: 'zoom', extra: [
        text(fx('À vous !', 'fr'), 90, 160, 640, 150, { fontFamily: HAND, fontSize: 120, fontWeight: 700, color: YEL }),
        text(ul('Grupos de tres: un camarero y dos clientes', 'Pedid algo de la carta y pagad la cuenta', 'Prohibido el español: si no sabéis una palabra, ¡gestos!'), 96, 330, 640, 260, { fontSize: 28, color: CH, lineHeight: 1.6 }),
        timer(180, 830, 200, 330, { style: 'ring', color: YEL, auto: false })],
        notes: 'Juego de rol de tres minutos (la cuenta atrás empieza con un clic). Al terminar, un grupo voluntario lo representa delante de la clase.' + NOTE },
    ]));
  } },
  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · German genders: a Bauhaus poster — a blue square, a red circle, a yellow triangle — and Transform for the accusative.
  edu_lang2_artikel: { name: 'Alemán: der, die, das', cat: 'edu', summary: 'Cartel Bauhaus: formas que entran con sonido, terminaciones en tabla, dona, Transformar al acusativo, unir parejas y concurso', make: () => {
    const { red: RED, blue: BLUE, yellow: YEL, black: K, paper: P } = BAU, GREY = '#5a554c', H = pairStacks('modern').heading;
    const D = s => fl(s, 'de');
    const G = { der: BLUE, die: RED, das: YEL };
    const form = (g, x, y, s, props = {}) => g === 'der' ? shape('rect', x, y, s, s, BLUE, props) : g === 'die' ? shape('ellipse', x, y, s, s, RED, props) : shape('triangle', x, y, s, s * 0.9, YEL, props);
    const stripe = () => [shape('rect', 0, 0, 22, 720, K), shape('rect', 22, 0, 10, 720, RED)];
    const tile = (html, x, w, bg, fg, id, props = {}) => keep(text(html, x, 300, w, 110, { fontFamily: H, fontSize: 52, fontWeight: 800, color: fg, bg, textAlign: 'center', vAlign: 'middle', pad: [0, 10, 0, 10], ...props }), id);
    const ART = uid(), NOUN = uid(), VERB = uid();
    const NOTE = ' Las palabras en alemán van en cursiva o en su propia pieza de color: no se traducen.';
    return numbered(build({ name: 'Alemán: der, die, das', palette: 'paper', fonts: 'modern', title: { color: K, size: 46 }, body: { color: K } }, [
      { layout: 'blank', bg: P, transition: 'fade', back: stripe(), extra: [
        kicker('DEUTSCH · ALEMÁN A1', 90, 100, 600, RED, { fontFamily: H, fontWeight: 700 }),
        text(fx('Der, die, das', 'de'), 84, 140, 640, 130, { fontFamily: H, fontSize: 92, fontWeight: 800, color: K, letterSpacing: -2 }),
        text('El género de los sustantivos y el caso acusativo, con formas y colores', 90, 290, 560, 100, { fontSize: 28, color: GREY }),
        shape('rect', 90, 440, 520, 16, K),
        text('Azul: masculino · Rojo: femenino · Amarillo: neutro', 90, 476, 560, 40, { fontSize: 22, color: K }),
        after(shape('rect', 700, 110, 300, 300, BLUE), 'fade-right', { duration: 500 }),
        after(shape('ellipse', 880, 250, 300, 300, RED, { opacity: 92 }), 'zoom-in', { duration: 500 }),
        after(shape('triangle', 730, 380, 300, 260, YEL), 'fade-up', { duration: 500, sound: 'pop' }),
        along(text(fx('der', 'de'), 720, 130, 200, 80, { fontFamily: H, fontSize: 60, fontWeight: 800, color: '#ffffff' }), 'fade-in'),
        along(text(fx('die', 'de'), 1010, 360, 150, 80, { fontFamily: H, fontSize: 60, fontWeight: 800, color: '#ffffff' }), 'fade-in'),
        along(text(fx('das', 'de'), 800, 540, 160, 80, { fontFamily: H, fontSize: 56, fontWeight: 800, color: K, textAlign: 'center' }), 'fade-in')],
        notes: 'Portada al estilo Bauhaus (la escuela de diseño alemana de 1919): cada género tiene una forma y un color que usaremos toda la unidad. Las formas entran solas al llegar.' + NOTE },
      { title: 'Tres géneros (y no coinciden con el español)', layout: 'titleOnly', bg: P, back: stripe(), transition: 'push', extra: [
        ...[['der', 'masculino', [['der Hund', 'el perro'], ['der Löffel', 'la cuchara', 1], ['der Tisch', 'la mesa', 1]]], ['die', 'femenino', [['die Katze', 'la gata'], ['die Gabel', 'el tenedor', 1], ['die Sonne', 'el sol', 1]]],
          ['das', 'neutro', [['das Buch', 'el libro'], ['das Messer', 'el cuchillo'], ['das Mädchen', 'la niña']]]].map(([g, gname, words], i) => {
          const x = 90 + i * 375;
          return [on(form(g, x, 180, 70), 'zoom-in', { sound: 'pop', duration: 300 }),
            along(text(`<b>${fx(g, 'de')}</b> <span style="font-size:22px;color:${GREY}">· ${gname}</span>`, x + 90, 186, 260, 60, { fontFamily: H, fontSize: 44, color: K, vAlign: 'middle' }), 'fade-right'),
            along(shape('rect', x, 270, 340, 6, G[g]), 'fade-right'),
            along(text(words.map(([w, es, odd]) => `<div style="margin-bottom:14px"><b>${D(w)}</b><br><span style="color:${odd ? RED : GREY};font-size:21px">${es}${odd ? ' · ¡distinto!' : ''}</span></div>`).join(''), x, 292, 340, 330, { fontSize: 30, color: K }), 'fade-up')]; }).flat()],
        notes: 'Tres columnas, una por clic. El género alemán no se puede deducir del español: la mesa es masculina, el sol femenino y la niña, neutro. Por eso cada palabra se aprende con su artículo.' + NOTE },
      { title: 'Pistas en la terminación', layout: 'titleOnly', bg: P, back: stripe(), extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 400, fontSize: 25, header: true, headBg: K, headFg: '#ffffff', stroke: '#cfc6b3', colW: [3.2, 1.4, 4.2],
          cellBg: { '1,1': '#f6c9c4', '2,1': '#f6c9c4', '3,1': '#fbe6a6', '4,1': '#c5d3ec', '5,1': '#c5d3ec' },
          rows: [['Si la palabra…', 'Artículo', 'Ejemplos'], ['termina en -ung, -heit, -keit, -ion', D('die'), D('die Zeitung, die Freiheit, die Station')], ['termina en -e (casi siempre)', D('die'), D('die Lampe, die Schule, die Blume')],
            ['termina en -chen o -lein (diminutivo)', D('das'), D('das Mädchen, das Brötchen, das Fräulein')], ['nombra a quien hace algo (-er)', D('der'), D('der Lehrer, der Fahrer')], ['es un día, un mes o una estación', D('der'), D('der Montag, der Mai, der Winter')]] }),
        on(text('Son pistas, no reglas sin excepción: <b>' + D('der Käse') + '</b> acaba en -e y es masculino.', 90, 610, 1100, 50, { fontSize: 24, color: GREY }), 'fade-up')],
        notes: 'Tabla de terminaciones con el color del género en la segunda columna. Con estas cinco pistas se acierta la mayoría de las veces; la última frase recuerda que hay excepciones.' + NOTE },
      { title: '¿Cuántos hay de cada uno?', layout: 'titleOnly', bg: P, back: stripe(), transition: 'fade', extra: [
        chartBlock({ x: 60, y: 160, w: 660, h: 500, chartType: 'doughnut', color: RED,
          data: [['die (femenino)', 44, RED], ['der (masculino)', 36, BLUE], ['das (neutro)', 20, YEL]].map(([label, value, color]) => ({ label, value, color })) }),
        on(text(`<div style="font-family:${H};font-size:110px;font-weight:800;line-height:1;color:${RED}">44 %</div><div style="margin-top:10px">de los sustantivos de una lista de vocabulario A1 son femeninos. Si no tienes ninguna pista… apuesta por <b>${D('die')}</b>.</div>`, 740, 220, 440, 330, { fontSize: 26, color: K }), 'fade-left'),
        text('Recuento aproximado en una lista de 600 palabras (datos de ejemplo).', 740, 580, 440, 60, { fontSize: 18, color: GREY, fontStyle: 'italic' })],
        notes: 'Dona con un color por género, los mismos de la portada. Cifras aproximadas de una lista de vocabulario de ejemplo: sirven para la estrategia de adivinar, no como dato oficial.' + NOTE },
      { title: 'Wer? · el sujeto (nominativo)', layout: 'titleOnly', bg: P, back: stripe(), transition: 'fade', extra: [
        tile(fx('Der', 'de'), 180, 190, BLUE, '#ffffff', ART), tile(fx('Hund', 'de'), 390, 260, '#ffffff', K, NOUN, { borderColor: K }), tile(fx('schläft.', 'de'), 670, 300, '#ffffff', K, VERB, { borderColor: K }),
        text('«El perro duerme.» El perro es el sujeto: ¿<b>quién</b> duerme? → nominativo.', 180, 450, 1000, 60, { fontSize: 28, color: K }),
        text('Pregunta en alemán: ' + D('Wer schläft?'), 180, 540, 900, 50, { fontSize: 24, color: GREY })],
        notes: 'Frase de partida en nominativo. En la diapositiva siguiente las piezas se recolocan con Transformar y el artículo cambia: fíjate en qué pieza se mueve y cuál cambia de forma.' + NOTE },
      { title: 'Wen? · el complemento directo (acusativo)', layout: 'titleOnly', bg: P, back: stripe(), autoAnimate: true, extra: [
        text(fx('Ich', 'de'), 120, 300, 150, 110, { fontFamily: H, fontSize: 52, fontWeight: 800, color: K, bg: '#ffffff', borderColor: K, textAlign: 'center', vAlign: 'middle' }),
        text(fx('sehe', 'de'), 290, 300, 210, 110, { fontFamily: H, fontSize: 52, fontWeight: 800, color: K, bg: '#ffffff', borderColor: K, textAlign: 'center', vAlign: 'middle' }),
        tile(fx('den', 'de'), 520, 190, BLUE, '#ffffff', ART), tile(fx('Hund.', 'de'), 730, 260, '#ffffff', K, NOUN, { borderColor: K }),
        on(shape('ellipse', 504, 284, 222, 142, 'none', { stroke: RED, strokeWidth: 6, sketch: true }), 'zoom-in', { sound: 'pop', duration: 300 }),
        tableBlock({ x: 120, y: 460, w: 800, h: 150, fontSize: 26, header: true, headBg: K, headFg: '#ffffff', stroke: '#cfc6b3', colW: [2.2, 1.4, 1.4, 1.4, 1.4],
          cellBg: { '2,1': '#c5d3ec' }, rows: [['', 'masc.', 'fem.', 'neutro', 'plural'], ['Nominativ', D('der'), D('die'), D('das'), D('die')], ['Akkusativ', `<b>${D('den')}</b>`, D('die'), D('das'), D('die')]] }),
        text('«Veo al perro.» Solo cambia el <b>masculino</b>: ' + D('der') + ' → ' + D('den') + '.', 950, 460, 260, 160, { fontSize: 24, color: K })],
        notes: 'Transformar: el artículo y el sustantivo viajan a su nuevo sitio y el artículo cambia de «der» a «den». Un clic rodea el cambio. La tabla deja claro que femenino, neutro y plural no cambian.' + NOTE },
      { layout: 'blank', bg: P, back: stripe(), extra: [pollBlock({ kind: 'match', fontSize: 32, question: 'Une cada palabra con su artículo', x: 90, y: 50, w: 1110, h: 620,
        options: ['Zeitung = die', 'Brötchen = das', 'Lehrer = der', 'Montag = der', 'Schule = die'] })],
        notes: 'Unir parejas desde el móvil: se corrige sola. Usad las pistas de la tabla: -ung, -chen, -er, días de la semana, -e. Las palabras de la actividad están en alemán y no se traducen.' },
      { layout: 'blank', bg: P, back: stripe(), extra: [quiz('¿Qué artículo lleva «Mädchen» (niña)?', ['der', 'die', 'das'], 2, { time: 15, fontSize: 48 })],
        notes: 'Concurso con puntos. La trampa: aunque sea una niña, «Mädchen» es neutro porque acaba en -chen. Respuesta: das.' + NOTE },
      { title: 'Tu rutina con las fichas', layout: 'titleOnly', bg: P, back: stripe(), transition: 'zoom', extra: [
        dg('process', 'Lee\n  la palabra con su artículo\nColorea\n  azul, rojo o amarillo\nDilo\n  en voz alta, tres veces\nRepasa\n  mañana y dentro de una semana', 90, 190, 1100, 260, { oneByOne: true, colors: 'outline', textColor: K, fontScale: 1.3 }),
        ...[['der', D('der Tisch')], ['die', D('die Lampe')], ['das', D('das Buch')]].map(([g, w], i) => [form(g, 250 + i * 300, 500, 60), text(w, 330 + i * 300, 505, 200, 50, { fontSize: 30, color: K, vAlign: 'middle' })]).flat()],
        notes: 'Cierre con una rutina para las fichas de vocabulario, paso a paso al presentar. Pide que hagan diez fichas con los colores de la unidad para la próxima clase.' + NOTE },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · Italian, the perfect tense: a Riviera postcard, a toy car that drives the coast road stop by stop.
  edu_lang2_passato: { name: 'Italiano: il passato prossimo', cat: 'edu', summary: 'Postal de la Riviera: coche 3D que recorre la costa con Trayectoria, ecuación, participios en tabla, concordancia, huecos y concurso', make: () => {
    const SEA = '#17627f', SEA2 = '#2a8fb8', CREAM = '#fff7e8', INK = '#3b1f12', TERRA = '#c4572e', OLIVE = '#5c7a2f', SOFT = '#7a5a48', HAND = FF.dancing, H = pairStacks('editorial').heading;
    const I = s => fl(s, 'it');
    const ESS = '#c4572e', AVE = '#17627f';
    const postmark = (x, y, d, c, rot = -12) => [shape('ellipse', x, y, d, d, 'none', { stroke: c, strokeWidth: 3, rotation: rot, opacity: 80 }),
      text(fx('POSTE · RIVIERA · ESTATE 2026 · ', 'it'), x + 8, y + 8, d - 16, d - 16, { fontFamily: H, fontSize: 15, curve: 100, color: c, textAlign: 'center', letterSpacing: 2, rotation: rot, opacity: 80 })];
    const NOTE = ' Las palabras y frases en italiano van en cursiva (o en su recuadro): no se traducen.';
    // (the stops on the map, scaled to where the map sits on slide 5)
    const MX = 60, MY = 175, SC = 0.84, at = i => [MX + STOPS[i][1] * SC, MY + STOPS[i][2] * SC];
    return numbered(build({ name: 'Italiano: il passato prossimo', palette: 'forest', fonts: 'editorial', title: { color: INK, size: 44 }, body: { color: INK } }, [
      { layout: 'blank', bg: SEA, transition: 'fade', back: [shape('rect', 0, 0, 1280, 720, SEA2, { fill2: SEA, gradAngle: 90 })], extra: [
        shape('rect', 70, 110, 700, 500, CREAM, { rotation: -3, shadow: { x: 10, y: 16, blur: 30, color: '#00000055' } }),
        img(RIVIERA, 100, 135, 640, 294, 'Postal de la costa de Liguria al atardecer', { rotation: -3 }),
        text(I('Saluti dalla Riviera!'), 110, 455, 620, 90, { fontFamily: HAND, fontSize: 60, color: TERRA, rotation: -3 }),
        text(I('Ieri siamo andati al mare…'), 130, 535, 580, 50, { fontFamily: HAND, fontSize: 34, color: SOFT, rotation: -3 }),
        img(STAMP('#ffb36b', '#ff8a3d'), 1050, 70, 140, 166, 'Sello de correos', { rotation: 6 }),
        ...postmark(955, 150, 150, '#ffffff'),
        kicker('ITALIANO · A2', 830, 300, 380, '#ffe3c4', { fontFamily: H }),
        text(fx('Il passato prossimo', 'it'), 826, 340, 400, 170, { fontFamily: H, fontSize: 56, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }),
        text('Contar lo que hiciste: avere o essere + participio', 830, 520, 380, 90, { fontSize: 26, color: '#e6f3f8' })],
        notes: 'Portada en forma de postal de vacaciones: es exactamente para lo que sirve el passato prossimo, contar lo que hicimos. Lee en voz alta el saludo de la postal.' + NOTE },
      { title: 'La fórmula', layout: 'titleOnly', bg: CREAM, transition: 'slide', extra: [
        mathBlock({ x: 90, y: 170, w: 1100, h: 110, fontSize: 44, color: INK, latex: '\\textit{passato prossimo} = \\textit{avere / essere} + \\textit{participio}' }),
        on(card(`<div style="font-size:20px;letter-spacing:3px;color:${AVE}">CON AVERE</div><div style="font-family:${H};font-size:38px;margin:6px 0">${I('Ho mangiato una pizza.')}</div><div style="color:${SOFT}">He comido / Comí una pizza.</div>`,
          90, 320, 530, 200, '#ffffff', { fontSize: 24, color: INK, borderColor: AVE, radius: 6 }), 'fade-up'),
        on(card(`<div style="font-size:20px;letter-spacing:3px;color:${ESS}">CON ESSERE</div><div style="font-family:${H};font-size:38px;margin:6px 0">${I('Sono andata al mare.')}</div><div style="color:${SOFT}">He ido / Fui al mar.</div>`,
          660, 320, 530, 200, '#ffffff', { fontSize: 24, color: INK, borderColor: ESS, radius: 6 }), 'fade-up'),
        on(text('Ojo: en italiano se usa también donde en español diríamos «fui» o «comí» (ayer, el verano pasado…).', 90, 560, 1100, 70, { fontSize: 25, color: SOFT }), 'fade-in')],
        notes: 'La ecuación resume el tiempo: auxiliar en presente más participio. Insiste en la nota de abajo: el italiano hablado usa el passato prossimo para el pasado reciente y no tan reciente.' + NOTE },
      { title: 'El participio', layout: 'titleOnly', bg: CREAM, extra: [
        ...[['-are', '-ato', 'parlare → parlato'], ['-ere', '-uto', 'credere → creduto'], ['-ire', '-ito', 'dormire → dormito']].map(([a, b, ex], i) => [
          on(text(`<b>${fx(a, 'it')}</b> → <b style="color:${TERRA}">${fx(b, 'it')}</b>`, 90, 185 + i * 130, 400, 60, { fontFamily: H, fontSize: 44, color: INK }), 'fade-right'),
          along(text(I(ex), 90, 245 + i * 130, 400, 40, { fontSize: 24, color: SOFT }), 'fade-right')]).flat(),
        tableBlock({ x: 560, y: 180, w: 630, h: 400, fontSize: 25, color: INK, header: true, headBg: TERRA, headFg: '#ffffff', stroke: '#e3cdb4', banded: true, band: TERRA, colW: [2, 2, 3],
          rows: [['Irregolari', 'Participio', 'Esempio'], [I('fare'), I('fatto'), I('Ho fatto i compiti.')], [I('vedere'), I('visto'), I('Ho visto il mare.')], [I('prendere'), I('preso'), I('Ho preso il treno.')],
            [I('scrivere'), I('scritto'), I('Ho scritto una cartolina.')], [I('essere'), I('stato'), I('Sono stato a Pisa.')]] }),
        text('Los irregulares, mejor de memoria: son los más usados.', 560, 600, 630, 40, { fontSize: 22, color: SOFT })],
        notes: 'A la izquierda, la regla de los regulares, una terminación por clic. A la derecha, cinco irregulares muy frecuentes con un ejemplo cada uno.' + NOTE },
      { title: '¿Essere o avere?', layout: 'titleOnly', bg: CREAM, transition: 'push', extra: [
        ...[['ESSERE', ESS, 'Movimiento, cambio de estado y verbos con «si»', 'andare · venire · partire · arrivare · tornare · nascere · restare · alzarsi', 'Giulia è partita.'],
          ['AVERE', AVE, 'La mayoría: verbos que llevan complemento directo', 'mangiare · vedere · comprare · visitare · scrivere · fare', 'Abbiamo comprato il gelato.']].map(([h, c, d, verbs, ex], i) => {
          const x = 90 + i * 560;
          return [on(shape('rounded', x, 180, 520, 430, c, { radius: 16 }), 'fade-up', { sound: 'whoosh' }),
            along(shape('rounded', x + 12, 192, 496, 406, 'none', { stroke: '#ffffff', strokeWidth: 4, radius: 12 }), 'fade-up'),
            along(text(fx(h, 'it'), x + 30, 210, 460, 70, { fontFamily: H, fontSize: 48, fontWeight: 700, color: '#ffffff', letterSpacing: 4 }), 'fade-up'),
            along(text(`${d}<br><br>${I(verbs)}<br><br><b style="font-size:30px">${I(ex)}</b>`, x + 30, 290, 460, 300, { fontSize: 24, color: '#ffffff' }), 'fade-up')]; }).flat()],
        notes: 'Dos «señales de carretera»: con essere van los verbos de movimiento y de cambio y los reflexivos; con avere, casi todos los demás. Pide ejemplos de su último fin de semana.' + NOTE },
      { title: 'Il nostro viaggio', layout: 'titleOnly', bg: CREAM, transition: 'fade', extra: [
        img(RIVIERA, MX, MY, 1000 * SC, 460 * SC, 'Mapa ilustrado de la costa: Genova, Camogli, Portofino, Cinque Terre y Pisa'),
        ...(() => { // (made in play order: a leg of the trip, then what we did there)
          const SAY = [['Siamo partiti da Genova alle otto.', ESS], ['A Camogli abbiamo mangiato la focaccia.', AVE], ['A Portofino abbiamo fatto il bagno.', AVE], ['Alle Cinque Terre siamo saliti a piedi.', ESS], ['Siamo arrivati a Pisa stanchi ma felici.', ESS]];
          const say = ([s, c], i) => text(I(s), 935, 180 + i * 92, 290, 84, { fontSize: 22, color: INK, borderColor: c, radius: 6, pad: [8, 12, 8, 12], bg: '#ffffff', vAlign: 'middle' });
          const legs = [], says = [say(SAY[0], 0)];
          [1, 2, 3, 4].forEach(i => { legs.push(path([[at(i)[0] - at(i - 1)[0], at(i)[1] - at(i - 1)[1]]], { duration: 1600 })); says.push(after(say(SAY[i], i), 'fade-left', { duration: 400 })); });
          return [withAnims(m3d('kh-CarConcept', at(0)[0] - 80, at(0)[1] - 80, 160, 90, { view: 'side', edge: 'free' }), ...legs), ...says]; })()],
        notes: 'Cada clic lleva el coche 3D a la siguiente parada de la costa (Trayectoria) y aparece lo que hicimos allí. El borde de cada frase indica el auxiliar: terracota essere, azul avere.' + NOTE },
      { title: 'Con essere, el participio concuerda', layout: 'titleOnly', bg: CREAM, extra: [
        ...[['Marco è andat', 'o', 'user', 'él'], ['Giulia è andat', 'a', 'user', 'ella'], ['Marco e Luca sono andat', 'i', 'users', 'ellos'], ['Giulia e Sara sono andat', 'e', 'users', 'ellas']].map(([s, end, ic, es], i) => {
          const x = 90 + (i % 2) * 560, y = 190 + Math.floor(i / 2) * 200;
          return [icon(ic, x, y + 20, 64, i % 2 ? TERRA : AVE),
            text(fx(s, 'it'), x + 76, y + 20, 380, 70, { fontFamily: H, fontSize: 28, color: INK, vAlign: 'middle', textAlign: 'right', fontStyle: 'italic', pad: [0, 0, 0, 0] }),
            text(es, x + 90, y + 100, 360, 40, { fontSize: 22, color: SOFT }),
            on(text(`<b>${fx(end, 'it')}</b>`, x + 458, y, 70, 100, { fontFamily: H, fontSize: 64, color: '#ffffff', bg: TERRA, radius: 12, textAlign: 'center', vAlign: 'middle', fontStyle: 'italic', pad: [0, 0, 0, 0] }), 'zoom-in', { sound: 'pop', duration: 300 })]; }).flat(),
        text('Con avere no cambia: ' + I('Giulia ha mangiato, le ragazze hanno mangiato.'), 90, 600, 1100, 50, { fontSize: 24, color: SOFT })],
        notes: 'El participio con essere se comporta como un adjetivo: -o, -a, -i, -e. Cada clic hace aparecer una terminación. Con avere el participio no cambia (en este nivel).' + NOTE },
      { layout: 'blank', bg: CREAM, extra: [pollBlock({ kind: 'gaps', fontSize: 36, question: 'Completa la cartolina', x: 80, y: 60, w: 1120, h: 600,
        text: 'Cara Giulia, ieri io [sono] andata al mare e [ho] fatto il bagno. Poi Marco e io [siamo] tornati a casa e [abbiamo] mangiato la pasta. Un abbraccio!', options: [] })],
        notes: 'Completar huecos desde el móvil con el auxiliar correcto: sono, ho, siamo, abbiamo. El texto de la actividad está en italiano y no se traduce.' },
      { layout: 'blank', bg: CREAM, extra: [quiz('Completa: «Le ragazze sono ___ a Roma.»', ['andato', 'andata', 'andati', 'andate'], 3, { time: 20 })],
        notes: 'Concurso con puntos: femenino plural con essere → andate.' + NOTE },
      { layout: 'blank', bg: SEA, transition: 'zoom', back: [shape('rect', 0, 0, 1280, 720, SEA2, { fill2: SEA, gradAngle: 90 })], extra: [
        shape('rect', 80, 90, 1120, 520, CREAM, { rotation: 1, shadow: { x: 10, y: 16, blur: 30, color: '#00000055' } }),
        shape('rect', 640, 130, 3, 440, '#d8c3a5', { rotation: 1 }),
        text('Ahora tú: escribe tu postal', 130, 140, 480, 120, { fontFamily: H, fontSize: 40, fontWeight: 700, color: INK, lineHeight: 1.15 }),
        text(ul('Cinco frases en passato prossimo', 'Al menos dos con essere', 'Un saludo final: ' + I('Un abbraccio!')), 130, 280, 480, 200, { fontSize: 24, color: INK, lineHeight: 1.5 }),
        img(STAMP('#ffb36b', '#ff8a3d'), 1030, 130, 120, 142, 'Sello de correos', { rotation: 4 }),
        ...[0, 1, 2, 3].map(i => shape('rect', 690, 330 + i * 60, 460, 2, '#cdb89a')),
        text(I('Cara…'), 690, 270, 300, 50, { fontFamily: HAND, fontSize: 38, color: SOFT }),
        timer(300, 690, 540, 460, { style: 'bar', color: TERRA, auto: false, h: 40 }),
        { ...credits(['kh-CarConcept'], 130, 500, 480, SOFT), h: 60 }],
        notes: 'Cierre: el reverso de la postal. Cinco minutos para escribir (la barra empieza con un clic). Después, intercambiad las postales y corregid los auxiliares.' + NOTE },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · Phrasal verbs: a neon arcade — a synthwave grid, Transform that joins verb and particle, a knight who levels up.
  edu_lang2_phrasal: { name: 'Phrasal verbs: level up', cat: 'edu', summary: 'Arcade de neón: Text Art, Transformar que une verbo y partícula, caballero 3D que avanza, barras, tachón, unir y cuenta atrás', make: () => {
    const BG = '#0b0620', PINK = '#ff3ea5', CYAN = '#2de2e6', YEL = '#ffe600', GRN = '#39ff88', VIO = '#9b5de5', FG = '#f3eefe', DIM = '#a99cc9', H = pairStacks('bold').heading, MONO = FF.mono;
    const E = s => fl(s, 'en');
    const neon = (str, c) => `<span style="color:#ffffff;text-shadow:0 0 6px ${c},0 0 16px ${c},0 0 32px ${c}">${str}</span>`;
    const GRID = svgURL(1280, 300, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3ea5" stop-opacity="0"/><stop offset=".3" stop-color="#ff3ea5" stop-opacity=".7"/><stop offset="1" stop-color="#ff3ea5"/></linearGradient></defs>'
      + Array.from({ length: 25 }, (_, i) => `<path d="M640 0L${-1280 + i * 160} 300" stroke="url(#g)" stroke-width="2"/>`).join('')
      + [8, 22, 42, 70, 108, 160, 228, 300].map(y => `<path d="M0 ${y}H1280" stroke="#ff3ea5" stroke-width="2" opacity="${0.3 + y / 450}"/>`).join(''));
    const floor = () => [shape('rect', 0, 420, 1280, 300, '#14072e'), img(GRID, 0, 420, 1280, 300, 'Suelo de neón en perspectiva', { fit: 'fill', decorative: true })];
    const sun = () => [shape('ellipse', 840, 110, 320, 320, YEL, { fill2: PINK, gradAngle: 90 }), ...[0, 1, 2, 3].map(i => shape('rect', 830, 300 + i * 30, 340, 8 + i * 3, BG))];
    const block = (str, x, y, w, c, id, size = 96) => keep(text(fx(str, 'en'), x, y, w, 150, { fontFamily: H, fontSize: size, color: '#ffffff', textAlign: 'center', vAlign: 'middle', borderColor: c, radius: 14, bg: '#ffffff0d',
      shadow: { x: 0, y: 0, blur: 24, color: c } }), id);
    const VERB = uid(), PART = uid();
    const NOTE = ' Los verbos y frases en inglés van en cursiva o en su propio bloque: no se traducen.';
    return numbered(build({ name: 'Phrasal verbs: level up', palette: 'violet', fonts: 'bold', title: { color: FG, size: 60 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'zoom', back: [...sun(), ...floor()], extra: [
        kicker('INGLÉS · 4.º ESO · NIVEL B1', 90, 80, 600, CYAN, { fontFamily: MONO }),
        text(fx('PHRASAL<br>VERBS', 'en'), 84, 110, 700, 300, { fontFamily: H, fontSize: 150, lineHeight: 0.95, wordart: 'neon', wordartColor: PINK }),
        text('Verbo + partícula = un significado nuevo', 90, 420, 640, 50, { fontSize: 30, color: FG }),
        withAnims(text(fx('PRESS START', 'en'), 90, 520, 400, 60, { fontFamily: MONO, fontSize: 34, color: YEL, letterSpacing: 6 }), A('pulse', { start: 'afterPrev', delay: 400, duration: 900 })),
        m3d('kk-Knight', 820, 220, 400, 480, { view: 'front', clip: 'Idle' })],
        notes: 'Portada de videojuego retro: sol de neón, suelo en perspectiva y un caballero 3D que será nuestro personaje. «Press start» late al llegar.' + NOTE },
      { layout: 'blank', bg: BG, transition: 'fade', back: floor(), extra: [
        kicker('NIVEL 1 · LA FÓRMULA', 90, 70, 700, CYAN, { fontFamily: MONO }),
        block('GIVE', 120, 200, 360, CYAN, VERB), text('+', 560, 200, 160, 150, { fontFamily: H, fontSize: 110, color: YEL, textAlign: 'center', vAlign: 'middle' }), block('UP', 800, 200, 360, PINK, PART),
        text('dar', 120, 370, 360, 50, { fontSize: 30, color: DIM, textAlign: 'center' }), text('arriba', 800, 370, 360, 50, { fontSize: 30, color: DIM, textAlign: 'center' })],
        notes: 'Por separado, «give» es dar y «up» es arriba. En la diapositiva siguiente las dos piezas se juntan con Transformar… y el significado ya no es «dar arriba».' + NOTE },
      { layout: 'blank', bg: BG, autoAnimate: true, back: floor(), extra: [
        kicker('NIVEL 1 · LA FÓRMULA', 90, 70, 700, CYAN, { fontFamily: MONO }),
        block('GIVE', 290, 130, 360, CYAN, VERB), block('UP', 650, 130, 340, PINK, PART),
        on(text(`= <b style="color:${YEL}">rendirse, dejar de</b>`, 190, 310, 900, 70, { fontSize: 44, color: FG, textAlign: 'center' }), 'zoom-in', { sound: 'chime' }),
        after(text(`${E('Don’t give up!')} · ¡No te rindas!<br>${E('I gave up sugar.')} · Dejé el azúcar.`, 190, 400, 900, 110, { fontSize: 30, color: FG, textAlign: 'center' }), 'fade-up')],
        notes: 'Transformar une el verbo y la partícula en un solo bloque. Con un clic aparece el significado: un phrasal verb se aprende como una palabra nueva, no como suma de sus partes.' + NOTE },
      { title: 'Power-ups: lo que añade cada partícula', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        ...[['UP', YEL, 'completar, aumentar', 'eat up · grow up · speed up'], ['OUT', CYAN, 'fuera, hasta el final', 'run out · find out · go out'], ['ON', GRN, 'seguir, continuar', 'go on · carry on · keep on'], ['OFF', PINK, 'separar, apagar, salir', 'turn off · take off · set off']]
          .map(([p, c, d, ex], i) => {
            const x = 90 + i * 280;
            return [withAnims(shape('ellipse', x + 70, 190, 120, 120, c, { stroke: '#ffffff', strokeWidth: 5, html: `<b>${fx(p, 'en')}</b>`, fontFamily: H, fontSize: 44, color: BG }), A('bounce', { start: i ? 'afterPrev' : 'click', sound: 'pop', duration: 500 })),
              along(text(`<b style="color:${c}">${d}</b><br><br>${E(ex.split(' · ').join('<br>'))}`, x, 340, 260, 260, { fontSize: 26, color: FG, textAlign: 'center', lineHeight: 1.4 }), 'fade-up')]; }).flat()],
        notes: 'Cuatro «power-ups»: cada partícula aporta una idea que se repite en muchos phrasal verbs. Un clic y las monedas botan una tras otra. Pide un ejemplo más de cada una.' + NOTE },
      { title: 'Las partículas más usadas', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 700, h: 480, chartType: 'hbar', color: PINK, dataLabels: true, labelColor: DIM, xTitle: '% de los phrasal verbs',
          data: [['up', 31], ['out', 22], ['on', 14], ['off', 12], ['down', 11], ['in', 10]].map(([label, value]) => ({ label, value })) }),
        on(text(`<div style="font-family:${H};font-size:120px;line-height:1">${neon('31 %', YEL)}</div><div style="margin-top:10px">de los phrasal verbs que aparecen en series juveniles llevan <b>${E('up')}</b>.</div>`, 830, 210, 370, 300, { fontSize: 26, color: FG }), 'fade-left'),
        text('Recuento en subtítulos de 20 episodios (datos inventados).', 830, 560, 370, 60, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Barras horizontales con el porcentaje de cada partícula. Datos inventados pero verosímiles: «up» es, con diferencia, la partícula más productiva.' + NOTE },
      { layout: 'blank', bg: BG, transition: 'fade', back: floor(), extra: [
        kicker('NIVEL 2 · UN DÍA CUALQUIERA', 90, 60, 800, CYAN, { fontFamily: MONO }),
        ...(() => { // (made in play order: a stretch of the walk, then its sentence)
          const SAY = [[E('I get up at seven.'), 'Me levanto a las siete.'], [E('I set off for school.'), 'Salgo hacia el instituto.'], [E('I keep on walking.'), 'Sigo andando.'], [E('I never give up!'), '¡Nunca me rindo!']];
          const legs = [], says = [];
          [280, 290, 290, 200].forEach((dx, i) => { legs.push(path([[dx, 0]], { duration: dx * 5 }));
            says.push(after(text(`<b style="color:${[YEL, PINK, GRN, CYAN][i]}">0${i + 1}</b> ${SAY[i][0]}<br><span style="font-size:20px;color:${DIM}">${SAY[i][1]}</span>`, 90 + i * 290, 110 + (i % 2) * 120, 280, 110, { fontSize: 25, color: FG }), 'fade-down', { sound: 'pop', duration: 300 })); });
          const k = lib3d('kk-Knight');
          return [withAnims(m3d('kk-Knight', 20, 340, 220, 320, { walk: { clip: k.walk, end: k.arrive, endOnce: true, face: true, look: true } }), ...legs), ...says]; })()],
        notes: 'El caballero avanza un tramo en cada clic y, al llegar, aparece la frase de ese momento del día. Al final celebra: never give up!' + NOTE },
      { title: '¿Dónde va el objeto?', layout: 'titleOnly', bg: BG, extra: [
        ...[['Turn off the music.', true], ['Turn the music off.', true], ['Turn it off.', true], ['Turn off it.', false]].map(([s, ok], i) => [
          text(E(s), 160, 190 + i * 100, 640, 80, { fontSize: 42, color: FG, vAlign: 'middle' }),
          on(icon(ok ? 'circle-check' : 'circle-x', 90, 205 + i * 100, 50, ok ? GRN : PINK), 'zoom-in', { sound: ok ? 'pop' : 'click', duration: 300 }),
          ...(ok ? [] : [after(shape('rect', 155, 230 + i * 100, 215, 6, PINK), 'grow', { duration: 400 })])]).flat(),
        card(`<b style="color:${YEL}">Regla</b><br>Si el objeto es un pronombre (${E('it, them, me')}), va <b>en medio</b>: ${E('turn it off')}, nunca ${E('turn off it')}.`, 840, 190, 360, 300, '#ffffff10', { fontSize: 28, color: FG, borderColor: YEL, radius: 14 })],
        notes: 'Los phrasal verbs separables admiten el objeto delante o detrás de la partícula, pero un pronombre siempre va en medio. El último ejemplo se marca y se tacha con un clic.' + NOTE },
      { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'match', fontSize: 32, question: 'Une cada phrasal verb con su significado', x: 90, y: 50, w: 1100, h: 620,
        options: ['look after = cuidar de', 'find out = averiguar', 'run out of = quedarse sin', 'get on with = llevarse bien con'] })],
        notes: 'Unir parejas desde el móvil: se corrige sola. Los phrasal verbs de la actividad están en inglés y no se traducen.' },
      { layout: 'blank', bg: BG, extra: [quiz('My grandma ___ me when my parents are at work.', ['looks after', 'looks for', 'looks up', 'looks out'], 0, { time: 20 })],
        notes: 'Concurso con puntos. «Look after» = cuidar de; «look for» = buscar; «look up» = buscar en un diccionario; «look out» = ¡cuidado!' + NOTE },
      { layout: 'blank', bg: BG, transition: 'zoom', back: floor(), extra: [
        text(fx('CONTINUE?', 'en'), 90, 90, 700, 140, { fontFamily: H, fontSize: 130, wordart: 'neon', wordartColor: CYAN }),
        text('Escribe cinco frases sobre tu fin de semana con cinco phrasal verbs distintos antes de que acabe el tiempo.', 90, 250, 640, 130, { fontSize: 30, color: FG }),
        text(E('Game over? Never give up!'), 90, 400, 640, 60, { fontFamily: MONO, fontSize: 30, color: YEL }),
        timer(90, 840, 140, 340, { style: 'digital', color: CYAN, auto: false }),
        credits(['kk-Knight'], 90, 470, 640, DIM)],
        notes: 'Reto final con cuenta atrás de minuto y medio (empieza con un clic). Lee después algunas frases en voz alta y vota la más original.' + NOTE },
    ]));
  } },
  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · False friends: a detective's file under a desk lamp — a suspects' line-up, stamps, crossed-out statements.
  edu_lang2_falsefriends: { name: 'Falsos amigos en inglés', cat: 'edu', summary: 'Expediente de detective: sello con sonido, gafas 3D, sospechosos que giran, tabla de pruebas, barras, tachones y votación', make: () => {
    const BG = '#121316', MAN = '#d9bf86', PAPER = '#f4ecd8', INK = '#24211c', RED = '#b8322a', DIM = '#9aa0a8', LAMP = '#f6d98b', TW = FF.courier, H = pairStacks('websafe').heading;
    const E = s => fl(s, 'en');
    const FOLDER = svgURL(620, 440, '<path d="M10 44H230L260 12H430L460 44H610V430H10Z" fill="#b8975a"/><rect x="10" y="64" width="600" height="366" rx="4" fill="#d9bf86"/>'
      + '<rect x="40" y="40" width="540" height="40" fill="#f4ecd8" transform="rotate(-2 300 60)"/><path d="M30 100H590" stroke="#c4a76e" stroke-width="2"/>'
      + '<path d="M540 20v90a18 18 0 0 1-36 0V40a10 10 0 0 1 20 0v66" fill="none" stroke="#8a8f96" stroke-width="5" stroke-linecap="round"/>');
    const lamp = () => [glow(160, -360, 1000, LAMP, BG, 22)];
    const stamp = (str, x, y, w, size, rot = -12, c = RED) => text(str, x, y, w, size * 1.7, { fontFamily: TW, fontSize: size, fontWeight: 700, letterSpacing: 4, color: c, borderColor: c, radius: 6, textAlign: 'center', vAlign: 'middle', rotation: rot, pad: [4, 10, 4, 10] });
    const NOTE = ' Las palabras y frases en inglés van en cursiva o en su propia ficha: no se traducen.';
    return numbered(build({ name: 'Falsos amigos en inglés', palette: 'midnight', fonts: 'websafe', title: { color: PAPER, size: 46 }, body: { color: PAPER } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: lamp(), extra: [
        kicker('INGLÉS · B1 · INVESTIGACIÓN LÉXICA', 90, 130, 520, LAMP, { fontFamily: TW, letterSpacing: 3, fontSize: 18 }),
        text('Falsos<br>amigos', 84, 170, 560, 250, { fontFamily: H, fontSize: 96, fontWeight: 700, color: PAPER, lineHeight: 1.05 }),
        text('Palabras inglesas que parecen lo que no son', 90, 430, 520, 90, { fontSize: 28, color: DIM }),
        img(FOLDER, 640, 140, 560, 398, 'Carpeta de expediente', { rotation: 4 }),
        text('EXPEDIENTE N.º 27-B<br>' + fx('FALSE FRIENDS', 'en'), 700, 168, 440, 70, { fontFamily: TW, fontSize: 22, color: INK, rotation: 2 }),
        m3d('kh-SunglassesKhronos', 700, 330, 360, 200, { view: 'front', autoRotate: true }),
        after(stamp('CONFIDENCIAL', 760, 250, 380, 34), 'zoom-in', { sound: 'pop', duration: 300, delay: 300 })],
        notes: 'Portada de novela negra: un expediente bajo el flexo. El sello rojo cae solo al llegar. Pregunta si alguien ha metido la pata alguna vez con una palabra que «parecía» fácil.' + NOTE },
      { title: 'El primer sospechoso', layout: 'titleOnly', bg: BG, back: lamp(), transition: 'slide', extra: [
        text(E('embarrassed'), 90, 190, 600, 100, { fontFamily: TW, fontSize: 68, fontWeight: 700, color: PAPER }),
        text('parece…', 90, 300, 200, 50, { fontSize: 26, color: DIM }),
        on(text('embarazada', 260, 296, 340, 60, { fontFamily: H, fontSize: 40, color: PAPER }), 'strike', { duration: 500 }),
        after(text('significa… <b style="color:' + LAMP + '">avergonzado, avergonzada</b>', 90, 380, 620, 100, { fontSize: 30, color: PAPER }), 'fade-up'),
        on(card(`<div style="font-family:${TW};font-size:20px;letter-spacing:3px;color:${RED}">NOTA DEL DETECTIVE</div>Para decir «embarazada»: <b>${E('pregnant')}</b>.<br><br>${E('I was so embarrassed!')}<br><span style="color:#6b5a3a">¡Qué vergüenza pasé!</span>`,
          760, 190, 430, 360, MAN, { fontSize: 26, color: INK, radius: 2, rotation: 2, shadow: { x: 6, y: 10, blur: 20, color: '#00000088' } }), 'fade-left', { sound: 'whoosh' })],
        notes: 'El caso más famoso: «embarrassed». Un clic tacha la falsa pista, aparece el significado real y, con otro clic, la nota con la palabra que buscábamos: pregnant.' + NOTE },
      { title: 'Rueda de reconocimiento', layout: 'titleOnly', bg: BG, back: [...lamp(), ...[0, 1, 2, 3, 4, 5].map(i => shape('rect', 60, 200 + i * 80, 1160, 2, '#ffffff', { opacity: 12 }))], extra: [
        ...[['actually', 'actualmente', 'en realidad'], ['carpet', 'carpeta', 'alfombra'], ['library', 'librería', 'biblioteca'], ['sensible', 'sensible', 'sensato, con sentido común'], ['constipated', 'constipado', 'estreñido'], ['career', 'carrera (estudios)', 'trayectoria profesional']]
          .map(([en, looks, real], i) => {
            const x = 90 + (i % 3) * 375, y = 180 + Math.floor(i / 3) * 240;
            return [card(`<div style="font-family:${TW};font-size:36px;font-weight:700">${E(en)}</div><div style="margin-top:10px;color:#6b5a3a">¿parece «${looks}»?</div>`, x, y, 345, 210, MAN, { fontSize: 22, color: INK, radius: 2 }),
              text(`N.º ${i + 1}`, x + 250, y + 14, 80, 30, { fontFamily: TW, fontSize: 18, color: '#6b5a3a', textAlign: 'right' }),
              on(card(`<div style="font-family:${TW};font-size:20px;letter-spacing:3px;color:${RED}">SIGNIFICA</div><div style="font-family:${H};font-size:30px;font-weight:700;margin-top:8px">${real}</div><div style="margin-top:6px;color:#6b5a3a">${E(en)}</div>`,
                x, y, 345, 210, PAPER, { fontSize: 22, color: INK, radius: 2 }), 'flip', { sound: 'click', duration: 500 })]; }).flat()],
        notes: 'Seis sospechosos. Pide que digan qué creen que significa cada uno antes de girar la ficha con un clic. El fondo imita las rayas de altura de una rueda de reconocimiento.' + NOTE },
      { title: 'Las pruebas', layout: 'titleOnly', bg: BG, back: lamp(), transition: 'fade', extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 430, fontSize: 24, header: true, headBg: RED, headFg: '#ffffff', stroke: '#6b5a3a', banded: true, band: MAN, bandAlpha: 0.12, color: PAPER, colW: [2, 2.2, 2.6, 2.6],
          rows: [['En inglés', 'Parece', 'En realidad significa', 'Para decir lo que parece'], [E('actually'), 'actualmente', 'en realidad', E('currently, nowadays')], [E('library'), 'librería', 'biblioteca', E('bookshop')],
            [E('sensible'), 'sensible', 'sensato', E('sensitive')], [E('carpet'), 'carpeta', 'alfombra', E('folder')], [E('constipated'), 'constipado', 'estreñido', E('to have a cold')], [E('exit'), 'éxito', 'salida', E('success')]] })],
        notes: 'La tabla de pruebas: la cuarta columna es la más útil, porque da la palabra que buscábamos. Que la copien en el cuaderno y la amplíen durante el curso.' + NOTE },
      { title: 'Los que más caen', layout: 'titleOnly', bg: BG, back: lamp(), extra: [
        chartBlock({ x: 90, y: 170, w: 720, h: 470, chartType: 'hbar', color: RED, dataLabels: true, labelColor: DIM, xTitle: '% de las redacciones con el error',
          data: [['actually', 38], ['sensible', 24], ['library', 15], ['constipated', 11], ['carpet', 7], ['exit', 5]].map(([label, value]) => ({ label, value })) }),
        on(text(`<div style="font-family:${H};font-size:100px;font-weight:700;line-height:1;color:${LAMP}">38 %</div><div style="margin-top:10px">de las redacciones confunden <b>${E('actually')}</b> con «actualmente».</div>`, 850, 220, 350, 300, { fontSize: 26, color: PAPER }), 'fade-left'),
        text('Revisión de 200 redacciones de 1.º de Bachillerato (datos inventados).', 850, 560, 350, 70, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Barras horizontales con el porcentaje de redacciones que contienen cada error (cifras inventadas). Las etiquetas del gráfico son palabras inglesas: no se traducen.' + NOTE },
      { title: 'Interrogatorio: corrige la declaración', layout: 'titleOnly', bg: BG, back: lamp(), transition: 'push', extra: [
        ...[['I’m constipated, I need a tissue.', 'I’ve got a cold, I need a tissue.'], ['Actually I live in Madrid.', 'Currently I live in Madrid.'], ['My sister is very sensible: she cries at films.', 'My sister is very sensitive: she cries at films.']].map(([bad, good], i) => {
          const y = 190 + i * 150;
          return [shape('rect', 90, y, 1100, 124, '#ffffff', { opacity: 6 }),
            on(text(E(bad), 110, y + 10, 520, 104, { fontFamily: TW, fontSize: 25, color: PAPER, vAlign: 'middle' }), 'strike', { duration: 500 }),
            after(icon('arrow', 645, y + 37, 50, LAMP), 'fade-right', { duration: 300 }),
            after(text(`<b>${E(good)}</b>`, 715, y + 10, 460, 104, { fontFamily: TW, fontSize: 25, color: LAMP, vAlign: 'middle' }), 'fade-left', { sound: 'pop', duration: 400 })]; }).flat()],
        notes: 'Tres declaraciones con un falso amigo cada una. Un clic tacha la frase y aparece la versión correcta. Antes de enseñarla, pide la corrección a la clase.' + NOTE },
      { layout: 'blank', bg: BG, back: lamp(), extra: [pollBlock({ kind: 'multi', fontSize: 32, question: '¿Cuáles son falsos amigos? Marca todos', x: 80, y: 60, w: 1120, h: 600,
        options: ['embarrassed', 'hospital', 'carpet', 'animal', 'library', 'chocolate'] })],
        notes: 'Votación de respuesta múltiple desde el móvil. Son falsos amigos embarrassed, carpet y library; hospital, animal y chocolate son amigos de verdad. Las opciones están en inglés y no se traducen.' },
      { layout: 'blank', bg: BG, back: lamp(), extra: [quiz('«Fabric» significa…', ['fábrica', 'tela', 'fabricar', 'fabuloso'], 1, { time: 15, fontSize: 48 })],
        notes: 'Concurso con puntos. «Fabric» es tela; fábrica se dice «factory».' + NOTE },
      { layout: 'blank', bg: BG, back: lamp(), transition: 'zoom', extra: [
        after(stamp('CASO CERRADO', 90, 120, 600, 56, -6), 'zoom-in', { sound: 'pop', duration: 300, delay: 200 }),
        ...[['search', 'Desconfía de las palabras demasiado fáciles.'], ['book-open', 'Compruébalas en un diccionario monolingüe.'], ['clipboard-list', 'Apunta tus falsos amigos en una ficha propia.']].map(([ic, t], i) => [
          on(icon(ic, 90, 330 + i * 90, 50, LAMP), 'fade-right'), along(text(t, 170, 330 + i * 90, 900, 50, { fontSize: 30, color: PAPER, vAlign: 'middle' }), 'fade-right')]).flat(),
        credits(['kh-SunglassesKhronos'], 90, 640, 1100, '#6f747c')],
        notes: 'Cierre: el sello de caso cerrado cae solo y, con cada clic, un consejo del detective. Tarea: encontrar un falso amigo nuevo en una serie o una canción.' + NOTE },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · French sounds: a vinyl record that turns, a record sleeve as a track list, liaisons drawn as arcs.
  edu_lang2_sons: { name: 'Francés: los sonidos', cat: 'edu', summary: 'Vinilo que gira con texto curvo, pistas con sonido, enlaces que se dibujan en arco, tabla de reglas, radar, concurso y cuenta atrás', make: () => {
    const BG = '#141017', AMBER = '#f2a541', CREAM = '#f5e9d7', TEAL = '#3fb6a8', PINK = '#e85d75', DIM = '#b5a8a0', AB = FF.abril, H = pairStacks('friendly').heading;
    const F = s => fl(s, 'fr');
    const VINYL = svgURL(480, 480, '<circle cx="240" cy="240" r="238" fill="#0c0c0c"/>'
      + Array.from({ length: 22 }, (_, i) => `<circle cx="240" cy="240" r="${226 - i * 6}" fill="none" stroke="${i % 2 ? '#1c1c1c' : '#262626'}" stroke-width="2"/>`).join('')
      + '<path d="M90 110A200 200 0 0 1 200 50" stroke="#ffffff" stroke-opacity=".25" stroke-width="10" fill="none" stroke-linecap="round"/>'
      + '<path d="M390 370A200 200 0 0 1 280 430" stroke="#ffffff" stroke-opacity=".12" stroke-width="10" fill="none" stroke-linecap="round"/>'
      + '<circle cx="240" cy="240" r="92" fill="#e85d75"/><circle cx="240" cy="240" r="92" fill="none" stroke="#f2a541" stroke-width="4"/><circle cx="240" cy="240" r="8" fill="#141017"/>');
    const rec = (x, y, d) => img(VINYL, x, y, d, d, 'Disco de vinilo');
    const NOTE = ' Las palabras y frases en francés van en cursiva (o en su propio disco o recuadro): no se traducen. Los símbolos entre corchetes son del alfabeto fonético.';
    return numbered(build({ name: 'Francés: los sonidos', palette: 'revela', fonts: 'friendly', title: { color: CREAM, size: 46, font: AB }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [glow(560, 0, 760, '#5a2338', BG, 60)], extra: [
        kicker('FRANCÉS · PRONUNCIACIÓN · A2', 90, 140, 640, AMBER, { fontFamily: H }),
        text(fx('Ça sonne<br>français !', 'fr'), 84, 180, 620, 250, { fontFamily: AB, fontSize: 92, color: CREAM, lineHeight: 1.05 }),
        text('Vocales nasales, liaison y la e que no suena', 90, 450, 560, 90, { fontSize: 28, color: DIM }),
        withAnims(rec(690, 130, 460), A('spin360', { start: 'afterPrev', duration: 4000 })),
        withAnims(text(fx('FACE A · PHONÉTIQUE · 33 TOURS · ', 'fr'), 830, 270, 180, 180, { fontFamily: H, fontSize: 14, fontWeight: 700, curve: 100, color: '#ffffff', textAlign: 'center', letterSpacing: 2 }), A('spin360', { start: 'withPrev', duration: 4000 })),
        shape('ellipse', 1140, 90, 70, 70, '#8a8a8a', { stroke: '#cfcfcf', strokeWidth: 4 }),
        shape('rect', 1120, 140, 12, 330, '#cfcfcf', { rotation: 18, radius: 6 }), shape('rect', 1040, 450, 50, 30, '#cfcfcf', { rotation: 18, radius: 4 })],
        notes: 'Portada de tocadiscos: el vinilo y su etiqueta (texto curvo) dan una vuelta al llegar. Pon de fondo una canción francesa mientras entran.' + NOTE },
      { title: 'Les voyelles nasales', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        shape('rect', 90, 180, 400, 400, AMBER, { fill2: PINK, gradAngle: 135 }),
        rec(330, 200, 360),
        shape('rect', 90, 180, 400, 400, AMBER, { fill2: PINK, gradAngle: 135, shadow: { x: 8, y: 12, blur: 26, color: '#00000088' } }),
        text(fx('Voyelles<br>nasales', 'fr'), 120, 210, 340, 200, { fontFamily: AB, fontSize: 56, color: BG, lineHeight: 1.05 }),
        text('3 pistas · cara A', 120, 520, 340, 40, { fontSize: 22, color: BG }),
        ...[['01', '[ɑ̃]', 'an · en · am · em', 'enfant · temps · chambre'], ['02', '[ɔ̃]', 'on · om', 'bonjour · maison · nom'], ['03', '[ɛ̃]', 'in · ain · ein · un', 'vin · pain · plein · un']].map(([n, ipa, sp, ex], i) => {
          const y = 190 + i * 125;
          return [on(shape('ellipse', 760, y + 10, 64, 64, TEAL), 'zoom-in', { sound: 'click', duration: 250 }),
            along(shape('triangle', 784, y + 28, 26, 28, BG, { rotation: 90 }), 'zoom-in', { duration: 250 }),
            along(text(`<span style="color:${DIM}">${n}</span> <b style="font-size:34px;color:${AMBER}">${ipa}</b> <span style="color:${DIM}">· ${F(sp)}</span><br>${F(ex)}`, 845, y, 360, 100, { fontSize: 25, color: CREAM }), 'fade-left')]; }).flat(),
        text('La n no suena: el aire sale a la vez por la boca y por la nariz.', 760, 570, 440, 70, { fontSize: 22, color: DIM })],
        notes: 'La funda del disco y su lista de pistas: cada clic «pone» una pista con un clic de sonido. Pronuncia cada ejemplo dos veces y pide que se tapen la nariz para notar la diferencia.' + NOTE },
      { title: 'Tres palabras que se confunden', layout: 'titleOnly', bg: BG, extra: [
        ...[['vent', '[vɑ̃]', 'viento'], ['vont', '[vɔ̃]', 'van (ellos)'], ['vin', '[vɛ̃]', 'vino']].map(([w, ipa, es], i) => {
          const x = 110 + i * 370;
          return [on(rec(x, 190, 320), 'zoom-in', { sound: 'chime', duration: 400 }),
            along(text(fx(w, 'fr'), x + 85, 305, 150, 90, { fontFamily: AB, fontSize: 52, color: '#ffffff', textAlign: 'center', vAlign: 'middle' }), 'zoom-in', { duration: 400 }),
            along(text(`<b style="color:${AMBER}">${ipa}</b> · ${es}`, x, 525, 320, 50, { fontSize: 28, color: CREAM, textAlign: 'center' }), 'fade-up')]; }).flat(),
        text(F('Avec ce vent, ils vont boire du vin ?'), 90, 600, 1100, 50, { fontFamily: AB, fontSize: 32, color: TEAL, textAlign: 'center' })],
        notes: 'Pares mínimos: solo cambia la vocal nasal. Lee las tres palabras en desorden y que la clase levante uno, dos o tres dedos. La frase de abajo las junta todas.' + NOTE },
      { title: 'La liaison: palabras que se enlazan', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
        ...[['les', 'amis', '[lezami]', 350, 210], ['vous', 'avez', '[vuzave]', 930, 210], ['un', 'enfant', '[œ̃nɑ̃fɑ̃]', 350, 420], ['ils', 'ont', '[ilzɔ̃]', 930, 420]].map(([a, b, ipa, cx, y]) => [
          on(text(fx(a, 'fr'), cx - 280, y, 262, 90, { fontFamily: AB, fontSize: 60, color: CREAM, textAlign: 'right' }), 'fade-in'),
          along(text(fx(b, 'fr'), cx + 18, y, 262, 90, { fontFamily: AB, fontSize: 60, color: CREAM }), 'fade-in'),
          after(ink(arcPts(cx - 40, cx + 40, y + 10, 34), TEAL, 6), 'draw', { duration: 600 }),
          after(text(`<b style="color:${AMBER}">${ipa}</b>`, cx - 200, y + 100, 400, 50, { fontSize: 30, color: AMBER, textAlign: 'center' }), 'fade-up', { duration: 300 })]).flat()],
        notes: 'La consonante final, que normalmente no suena, se pronuncia y se une a la vocal siguiente. Con cada clic aparece una pareja, se dibuja el enlace y su transcripción.' + NOTE },
      { title: '¿Cuándo hay liaison?', layout: 'titleOnly', bg: BG, extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 420, fontSize: 25, header: true, headBg: TEAL, headFg: BG, stroke: '#3a3140', color: CREAM, colW: [3.4, 3, 1.8],
          cellBg: { '1,2': '#2c5c55', '2,2': '#2c5c55', '3,2': '#6b2a38', '4,2': '#6b2a38', '5,2': '#6b2a38' },
          rows: [['Caso', 'Ejemplo', '¿Liaison?'], ['Determinante + nombre', F('les amis · mes enfants'), 'Siempre'], ['Pronombre + verbo', F('nous avons · ils ont'), 'Siempre'],
            ['Después de «et»', F('toi et elle'), 'Nunca'], ['Antes de h aspirada', F('les héros'), 'Nunca'], ['Nombre en singular + adjetivo', F('un étudiant anglais'), 'No']] }),
        text('Con la h aspirada, sin enlace: ' + F('les | héros') + ' (si no, sonaría como «les zéros», los ceros).', 90, 620, 1100, 50, { fontSize: 22, color: DIM })],
        notes: 'Tabla de casos con el resultado coloreado: verde, siempre; rojo, nunca. El ejemplo de «les héros» suele hacer gracia y ayuda a recordarlo.' + NOTE },
      { title: 'La e que se cae', layout: 'titleOnly', bg: BG, transition: 'push', extra: [
        ...[['sam<span style="color:#e85d75">e</span>di', 'sam’di', 'sábado'], ['maint<span style="color:#e85d75">e</span>nant', 'maint’nant', 'ahora'], ['j<span style="color:#e85d75">e</span> n<span style="color:#e85d75">e</span> sais pas', 'j’sais pas', 'no sé (coloquial)']].map(([w, said, es], i) => {
          const y = 190 + i * 140;
          return [text(fx(w, 'fr'), 90, y, 460, 80, { fontFamily: AB, fontSize: 46, color: CREAM, vAlign: 'middle' }),
            on(icon('volume-2', 570, y + 15, 50, AMBER), 'zoom-in', { sound: 'click', duration: 250 }),
            after(text(`<b>${fx(said, 'fr')}</b>`, 650, y, 330, 80, { fontFamily: AB, fontSize: 46, color: AMBER, vAlign: 'middle' }), 'fade-left'),
            along(text(es, 990, y + 20, 220, 50, { fontSize: 22, color: DIM }), 'fade-in')]; }).flat(),
        text('Por escrito la e sigue ahí; al hablar rápido, desaparece.', 90, 610, 1100, 50, { fontSize: 24, color: DIM })],
        notes: 'La e en rosa es la que se pierde al hablar. Cada clic «reproduce» la versión hablada. En un examen escrito se escribe completa; la forma «j’sais pas» es solo oral y coloquial.' + NOTE },
      { title: 'Cómo hemos mejorado', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 160, w: 640, h: 500, chartType: 'radar', color: DIM, seriesName: 'Septiembre', yMax: 100, labelColor: CREAM,
          data: [['[ɑ̃] an', 40], ['[ɔ̃] on', 55], ['[ɛ̃] in', 35], ['[y] tu', 45], ['[ʁ] r', 30], ['liaison', 50]].map(([label, value]) => ({ label, value })),
          series: [{ name: 'Diciembre', values: [75, 80, 65, 70, 60, 85], color: AMBER }] }),
        on(text(`<div style="font-family:${AB};font-size:90px;line-height:1;color:${AMBER}">+30</div><div style="margin-top:10px">puntos de media en la [ʁ] francesa: la que más costaba en septiembre.</div>`, 780, 230, 410, 260, { fontSize: 26, color: CREAM }), 'fade-left'),
        text('Autoevaluación de la clase, en % de aciertos (datos inventados).', 780, 560, 410, 60, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Radar con dos series: cómo se evaluó la clase en septiembre y en diciembre en cada sonido. Datos inventados: puedes cambiarlos por los de tu grupo.' + NOTE },
      { layout: 'blank', bg: BG, extra: [quiz('¿Cuál de estas palabras NO tiene vocal nasal?', ['maison', 'pain', 'lune', 'temps'], 2, { time: 20 })],
        notes: 'Concurso con puntos. «Lune» lleva la vocal [y] (como «tu») seguida de una n que sí suena: no es nasal.' + NOTE },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [glow(-200, 300, 800, '#2c5c55', BG, 50)], extra: [
        text(fx('Encore !', 'fr'), 84, 70, 640, 150, { fontFamily: AB, fontSize: 120, wordart: 'retro' }),
        text('Trabalenguas: dilo tres veces seguidas, cada vez más rápido.', 90, 240, 640, 90, { fontSize: 28, color: DIM }),
        text(F('« Un chasseur sachant chasser sait chasser sans son chien. »'), 90, 340, 660, 180, { fontFamily: AB, fontSize: 42, color: CREAM, lineHeight: 1.25 }),
        text('Un cazador que sabe cazar sabe cazar sin su perro.', 90, 540, 640, 50, { fontSize: 22, color: DIM }),
        timer(60, 830, 200, 330, { style: 'digital', color: AMBER, auto: false })],
        notes: 'Cierre con un trabalenguas clásico para practicar [ʃ] y [s] y las nasales. Un minuto en la cuenta atrás (empieza con un clic): gana quien lo diga tres veces sin fallos.' + NOTE },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · German Christmas: a snowy night, an Advent calendar whose doors open, a market stall to label, a lantern in 3D.
  edu_lang2_advent: { name: 'Alemán: Adviento y Navidad', cat: 'edu', summary: 'Noche nevada: Text Art dorado, farol 3D, copos que caen, calendario de Adviento que se abre, cronología, etiquetar y receta con fórmulas', make: () => {
    const BG = '#0e2620', BG2 = '#163b31', RED = '#b3262a', GOLD = '#e8c26a', CREAM = '#f8f0dc', DIM = '#a9c2b5', WOOD = '#6b4226', H = pairStacks('classic').heading;
    const D = s => fl(s, 'de');
    let r = 11; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const SNOW = svgURL(1280, 720, Array.from({ length: 140 }, () => `<circle cx="${(rnd() * 1280).toFixed(0)}" cy="${(rnd() * 720).toFixed(0)}" r="${(1 + rnd() * 2.6).toFixed(1)}" fill="#ffffff" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`).join(''));
    const night = () => [paperImg(SNOW, 'Nieve'), shape('rect', 0, 680, 1280, 40, '#e9f1ee', { opacity: 35 })];
    const flakes = () => [[120, 0], [380, 1], [610, 2], [820, 0], [1050, 1], [1210, 2]].map(([x, k]) => withAnims(icon('snowflake', x, -60 + k * 30, 34 + k * 8, '#ffffff'),
      A('path', { start: 'withPrev', pathShape: 'custom', points: [[0, 0], [30, 260], [-20, 520], [10, 760]], dx: 10, dy: 760, duration: 7000 + k * 1500, delay: k * 400 })));
    // A market stall: roof, lights, gingerbread hearts, a star, baubles and a pot of punch (positions in a 600 × 440 box).
    const STALL = svgURL(600, 440, '<rect x="70" y="118" width="16" height="200" fill="#5a3620"/><rect x="514" y="118" width="16" height="200" fill="#5a3620"/>'
      + '<path d="M20 124L300 30L580 124Z" fill="#b3262a"/>' + Array.from({ length: 7 }, (_, i) => `<path d="M${20 + i * 80} 124L${60 + i * 80} 150L${100 + i * 80} 124Z" fill="${i % 2 ? '#b3262a' : '#f8f0dc'}"/>`).join('')
      + Array.from({ length: 14 }, (_, i) => `<circle cx="${40 + i * 40}" cy="${132 + (i % 2) * 6}" r="5" fill="#ffd36b"/>`).join('')
      + '<path d="M300 -8L311 22L343 22L317 41L327 72L300 53L273 72L283 41L257 22L289 22Z" fill="#e8c26a" transform="translate(0 10)"/>'
      + [[170, 190], [240, 205], [320, 190]].map(([x, y]) => `<path d="M${x} 150V${y - 18}" stroke="#d9c7a0" stroke-width="2"/><path d="M${x} ${y + 26}C${x - 40} ${y}${' '}${x - 30} ${y - 26} ${x} ${y - 10}C${x + 30} ${y - 26} ${x + 40} ${y} ${x} ${y + 26}Z" fill="#9b5a2b"/><path d="M${x - 16} ${y - 4}Q${x} ${y + 8} ${x + 16} ${y - 4}" stroke="#ffffff" stroke-width="3" fill="none"/>`).join('')
      + [[430, 185, '#b3262a'], [470, 165, '#e8c26a'], [455, 215, '#2f7d5b']].map(([x, y, c]) => `<path d="M${x} 150V${y - 14}" stroke="#d9c7a0" stroke-width="2"/><circle cx="${x}" cy="${y}" r="15" fill="${c}"/><circle cx="${x - 5}" cy="${y - 5}" r="4" fill="#ffffff" opacity=".6"/>`).join('')
      + '<rect x="60" y="300" width="480" height="120" rx="6" fill="#7a4a2a"/>' + Array.from({ length: 5 }, (_, i) => `<path d="M60 ${318 + i * 22}H540" stroke="#5a3620" stroke-width="3"/>`).join('')
      + '<path d="M340 250H420L412 300H348Z" fill="#3a3a3a"/><ellipse cx="380" cy="250" rx="40" ry="8" fill="#8b1a1a"/><path d="M366 236Q356 220 366 204M392 236Q382 220 392 204" stroke="#ffffff" stroke-width="3" fill="none" opacity=".6"/>'
      + '<rect x="440" y="270" width="26" height="30" rx="4" fill="#f8f0dc"/><rect x="474" y="270" width="26" height="30" rx="4" fill="#f8f0dc"/>');
    const SPOTS = [['1', 240, 205], ['2', 300, 40], ['3', 455, 185], ['4', 380, 265]];
    const WORDS = [['das Lebkuchenherz', 'corazón de pan de especias'], ['der Stern', 'la estrella'], ['die Christbaumkugel', 'la bola del árbol'], ['der Kinderpunsch', 'ponche sin alcohol']];
    const NOTE = ' Las palabras en alemán van en cursiva o en su propia puerta o etiqueta: no se traducen.';
    return numbered(build({ name: 'Alemán: Adviento y Navidad', palette: 'ocean', fonts: 'classic', title: { color: GOLD, size: 46 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [...night(), glow(780, 40, 640, '#4a5a2a', BG, 45)], extra: [
        kicker('ALEMÁN · CULTURA · A1-A2', 90, 120, 640, GOLD),
        text(fx('Frohe<br>Weihnachten!', 'de'), 84, 160, 720, 280, { fontFamily: H, fontSize: 100, fontWeight: 700, lineHeight: 1.05, wordart: 'gold' }),
        text('El Adviento y la Navidad en los países de habla alemana', 90, 460, 600, 90, { fontSize: 28, color: DIM }),
        m3d('kh-Lantern', 860, 120, 330, 500, { view: 'three', autoRotate: true, spin: 10, motion: 'float' }),
        ...flakes()],
        notes: 'Portada nevada: los copos caen solos al llegar y el farol gira despacio (en noviembre, los niños desfilan con farolillos por San Martín).' + NOTE },
      { title: D('Der Adventskalender'), layout: 'titleOnly', bg: BG, back: [shape('rect', 70, 150, 1140, 510, WOOD, { radius: 10 }), shape('rect', 84, 164, 1112, 482, '#835532', { radius: 6 })], transition: 'slide', extra: (() => {
        const NUM = [13, 7, 21, 2, 18, 10, 4, 24, 15, 1, 9, 20, 11, 6, 17, 3, 22, 14, 8, 19, 5, 12, 23, 16];
        const OPEN = { 1: ['der Adventskranz', 'corona de Adviento'], 6: ['der Nikolaus', 'San Nicolás'], 13: ['der Lebkuchen', 'pan de especias'], 24: ['der Heiligabend', 'Nochebuena'] };
        const doors = [], opens = [];
        NUM.forEach((n, i) => { const x = 100 + (i % 6) * 182, y = 180 + Math.floor(i / 6) * 117, c = [RED, '#1f5c4a', '#2b3f6b', '#7a3b6b'][(i + Math.floor(i / 6)) % 4];
          doors.push(shape('rounded', x, y, 170, 105, c, { stroke: GOLD, strokeWidth: 2, radius: 10, html: `<b>${n}</b>`, fontFamily: H, fontSize: 42, color: CREAM }));
          if (OPEN[n]) opens.push([n, on(text(`<div style="font-family:${H};font-size:21px;font-weight:700">${fx(OPEN[n][0], 'de')}</div><div style="font-size:16px;color:#6b5a3a">${OPEN[n][1]}</div>`, x, y, 170, 105,
            { bg: CREAM, color: BG, radius: 10, textAlign: 'center', vAlign: 'middle', pad: [6, 6, 6, 6], fontSize: 16, borderColor: GOLD }), 'flip', { sound: 'pop', duration: 500 })]); });
        return [...doors, ...opens.sort((a, b) => a[0] - b[0]).map(o => o[1])]; })(),
        notes: 'Un calendario de Adviento: 24 puertas, del 1 de diciembre a Nochebuena. Cada clic abre una puerta (la 1, la 6, la 13 y la 24) con una palabra de la Navidad alemana.' + NOTE },
      { title: 'De San Martín a Reyes', layout: 'titleOnly', bg: BG, back: night(), extra: [
        dg('timeline', '11. November\n  Sankt Martin: farolillos\n1. Advent\n  Primera vela de la corona\n6. Dezember\n  Nikolaus: dulces en las botas\n24. Dezember\n  Heiligabend: los regalos\n6. Januar\n  Heilige Drei Könige', 80, 190, 1120, 330, { oneByOne: true, colors: 'colorful', fontScale: 1.2, textColor: CREAM }),
        text('Los regalos se abren el 24 por la noche y, en muchas casas, los trae el ' + D('Christkind') + ' (el Niño Jesús).', 90, 560, 1100, 70, { fontSize: 24, color: DIM, textAlign: 'center' })],
        notes: 'Cronología de las fiestas, una a una al presentar. Las fechas y nombres del diagrama están en alemán y no se traducen. Compáralo con las fiestas de tu país: ¿qué día llegan los regalos?' + NOTE },
      { title: 'Auf dem Weihnachtsmarkt', layout: 'titleOnly', bg: BG, back: night(), transition: 'fade', extra: [
        img(STALL, 90, 180, 600, 440, 'Puesto de mercado navideño con corazones de pan de especias, una estrella, bolas y una olla de ponche'),
        ...SPOTS.map(([n, x, y], i) => [on(badge(n, 90 + x - 20, 180 + y - 20, 40, GOLD, BG), 'zoom-in', { sound: 'pop', duration: 300 }),
          after(text(`<b style="color:${GOLD}">${n}</b> &nbsp;<b>${fx(WORDS[i][0], 'de')}</b><br><span style="font-size:20px;color:${DIM}">${WORDS[i][1]}</span>`, 740, 200 + i * 105, 460, 90, { fontSize: 28, color: CREAM, fontFamily: H }), 'fade-left')]).flat()],
        notes: 'El vocabulario del mercado navideño: con cada clic aparece un número en el dibujo y su palabra con el artículo. Repetid el artículo siempre: der, die, das.' + NOTE },
      { layout: 'blank', bg: BG, back: night(), extra: [pollBlock({ kind: 'label', fontSize: 28, question: 'Beschrifte den Stand: arrastra cada palabra a su sitio', image: STALL, x: 80, y: 40, w: 1120, h: 640,
        options: WORDS.map(w => w[0]), points: SPOTS.map(([, x, y]) => ({ x: Math.round(x / 6), y: Math.round(y / 4.4) })) })],
        notes: 'Etiquetar la imagen desde el móvil: el mismo puesto sin números. Las etiquetas están en alemán y no se traducen.' },
      { title: 'Kinderpunsch für die Klasse', layout: 'titleOnly', bg: BG, back: night(), extra: [
        tableBlock({ x: 90, y: 180, w: 760, h: 400, fontSize: 25, header: true, headBg: RED, headFg: CREAM, stroke: '#3c6b5c', banded: true, band: GOLD, bandAlpha: 0.1, color: CREAM, colW: [3.6, 1.6, 1.8],
          rows: [['Zutat (ingrediente)', 'pro Person', 'Klasse: 25'], [D('Apfelsaft') + ' · zumo de manzana', '0,1 l', '=B2*25'], [D('Orangensaft') + ' · zumo de naranja', '0,05 l', '=B3*25'],
            [D('Früchtetee') + ' · infusión de frutas', '0,1 l', '=B4*25'], [D('Zimtstangen') + ' · canela en rama', '0,2', '=B5*25'], ['<b>' + D('Flüssigkeit') + '</b> · líquido total', '=B2+B3+B4', '<b>=C2+C3+C4</b>']] }),
        on(card(`<div style="font-family:${H};font-size:30px;color:${GOLD}">${D('Zubereitung')}</div>Se calienta todo sin que hierva, con la canela, quince minutos. ¡Sin alcohol: es el ponche de los niños!`, 890, 180, 300, 400, BG2, { fontSize: 23, color: CREAM, radius: 10 }), 'fade-left')],
        notes: 'Receta con fórmulas: la columna de la clase multiplica por 25 (=B2*25) y la última fila suma el líquido. Cambia el número de alumnos y se recalcula.' + NOTE },
      { layout: 'blank', bg: BG, back: night(), extra: [pollBlock({ kind: 'gaps', fontSize: 38, question: 'Completa el villancico «O Tannenbaum»', x: 80, y: 60, w: 1120, h: 580,
        text: 'O [Tannenbaum], o Tannenbaum, wie treu sind deine [Blätter]! Du grünst nicht nur zur [Sommerzeit], nein, auch im [Winter], wenn es schneit.', options: [] })],
        notes: 'Huecos en la primera estrofa de «O Tannenbaum», un villancico popular del siglo XIX (dominio público). Después, cantadla juntos. El texto está en alemán y no se traduce.' },
      { layout: 'blank', bg: BG, back: night(), extra: [quiz('¿Qué día deja dulces der Nikolaus en las botas?', ['6. Dezember', '24. Dezember', '31. Dezember', '6. Januar'], 0, { time: 15 })],
        notes: 'Concurso con puntos: la noche del 5 al 6 de diciembre los niños dejan las botas limpias en la puerta.' + NOTE },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [...night(), glow(340, 60, 600, '#5a4a1a', BG, 45)], extra: [
        ...flakes(),
        text(fx('Guten Rutsch!', 'de'), 140, 130, 1000, 150, { fontFamily: H, fontSize: 110, fontWeight: 700, wordart: 'gold', textAlign: 'center' }),
        text('Literalmente, «buen resbalón»: así se desea en alemán feliz entrada de año.', 190, 300, 900, 90, { fontSize: 30, color: CREAM, textAlign: 'center' }),
        ...[['Escribe una tarjeta de Navidad en alemán', 'mail'], ['Busca un villancico y aprende la primera estrofa', 'music'], ['Pregunta en casa: ¿qué tradiciones tenéis?', 'home']].map(([t, ic], i) => [
          on(icon(ic, 200 + i * 300, 430, 56, GOLD), 'zoom-in', { sound: 'chime', duration: 300 }), along(text(t, 140 + i * 300, 500, 280, 100, { fontSize: 22, color: CREAM, textAlign: 'center' }), 'fade-up')]).flat()],
        notes: 'Cierre: la felicitación de Año Nuevo y tres tareas para las vacaciones, que aparecen con un clic cada una. Los copos vuelven a caer al llegar.' + NOTE },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · English tenses: a watchmaker's bench in black and steel — a watch in 3D that moves with Transform, a timeline, formulas.
  edu_lang2_tenses: { name: 'Present perfect o past simple', cat: 'edu', summary: 'Relojería: reloj 3D con Transformar, línea del tiempo con arco que se dibuja, ecuaciones, tabla, barras al 100 %, árbol y cuenta atrás', make: () => {
    const BG = '#141414', BG2 = '#232323', OR = '#ff7a1a', STEEL = '#c9c9c9', W = '#f5f5f5', DIM = '#9a9a9a', H = pairStacks('tech').heading;
    const E = s => fl(s, 'en');
    const DIAL = svgURL(520, 520, Array.from({ length: 60 }, (_, i) => { const a = i * 6 * Math.PI / 180, r1 = i % 5 ? 244 : 228;
      return `<path d="M${(260 + Math.sin(a) * r1).toFixed(1)} ${(260 - Math.cos(a) * r1).toFixed(1)}L${(260 + Math.sin(a) * 256).toFixed(1)} ${(260 - Math.cos(a) * 256).toFixed(1)}" stroke="${i % 5 ? '#4a4a4a' : '#ff7a1a'}" stroke-width="${i % 5 ? 2 : 5}"/>`; }).join(''));
    const WATCH = uid();
    const watch = (x, y, s) => keep(m3d('kh-ChronographWatch', x, y, s, s, { view: 'front', autoRotate: true }), WATCH);
    const chip = (str, x, y, w, c, fg = BG) => text(str, x, y, w, 50, { fontSize: 24, color: fg, bg: c, radius: 25, textAlign: 'center', vAlign: 'middle', pad: [0, 12, 0, 12], fontFamily: H, fontWeight: 700 });
    const NOTE = ' Las frases y palabras en inglés van en cursiva o en su propia etiqueta: no se traducen.';
    return numbered(build({ name: 'Present perfect o past simple', palette: 'grayscale', fonts: 'tech', title: { color: W, size: 44 }, body: { color: W },
      decor: () => [shape('rect', 0, 712, 1280, 8, OR)] }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [shape('rect', 0, 0, 1280, 720, BG2, { fill2: BG, gradType: 'radial' }), img(DIAL, 680, 100, 520, 520, 'Esfera', { decorative: true })], extra: [
        kicker('INGLÉS · 1.º BACHILLERATO · B1', 90, 150, 600, OR, { fontFamily: H }),
        text(fx('Have you<br>ever…?', 'en'), 84, 190, 600, 240, { fontFamily: H, fontSize: 96, fontWeight: 700, color: W, lineHeight: 1.02 }),
        text('Present perfect y past simple: cuándo usar cada uno', 90, 450, 540, 90, { fontSize: 28, color: DIM }),
        watch(740, 160, 400)],
        notes: 'Portada de relojería: el reloj 3D gira dentro de una esfera dibujada. El tema es el tiempo, literalmente. Pregunta de arranque: Have you ever broken a watch?' + NOTE },
      { layout: 'blank', bg: BG, autoAnimate: true, back: [shape('rect', 0, 0, 1280, 720, BG2, { fill2: BG, gradType: 'radial' })], extra: [
        text('Dos maneras de mirar el pasado', 90, 50, 900, 70, { fontFamily: H, fontSize: 44, fontWeight: 700, color: W }),
        watch(1060, 20, 170),
        shape('rect', 90, 420, 1060, 6, STEEL), shape('triangle', 1140, 408, 30, 30, STEEL, { rotation: 90 }),
        shape('rect', 1000, 330, 6, 186, OR), text(fx('NOW', 'en'), 960, 524, 86, 40, { fontFamily: H, fontSize: 24, fontWeight: 700, color: OR, textAlign: 'center' }),
        on(shape('ellipse', 280, 409, 28, 28, W), 'zoom-in', { sound: 'click', duration: 300 }),
        along(text(`<b style="color:${W}">${E('I saw that film yesterday.')}</b><br>Past simple: un momento terminado, con fecha.`, 90, 450, 480, 120, { fontSize: 24, color: DIM }), 'fade-up'),
        along(text(fx('yesterday', 'en'), 214, 350, 160, 40, { fontFamily: H, fontSize: 22, color: W, textAlign: 'center' }), 'fade-down'),
        on(ink(arcPts(480, 1000, 412, 150, 40), OR, 6), 'draw', { duration: 1200 }),
        after(text(`<b style="color:${W}">${E('I have seen that film.')}</b><br>Present perfect: una experiencia que llega hasta ahora, sin decir cuándo.`, 470, 140, 540, 110, { fontSize: 24, color: DIM, textAlign: 'center' }), 'fade-up')],
        notes: 'Transformar: el reloj sube a la esquina. Primer clic: un punto cerrado en el pasado (past simple). Segundo clic: un arco que se dibuja desde el pasado hasta ahora (present perfect).' + NOTE },
      { title: 'Las dos fórmulas', layout: 'titleOnly', bg: BG, transition: 'slide', extra: [
        ...[['PRESENT PERFECT', OR, '\\text{subject} + \\mathbf{have\\ /\\ has} + \\text{past participle}', 'She has visited Rome twice.', 'Have you ever been to Rome?'],
          ['PAST SIMPLE', STEEL, '\\text{subject} + \\mathbf{verb\\text{-}ed}\\ \\text{(or irregular past)}', 'She visited Rome in 2019.', 'Did you go to Rome last year?']].map(([h, c, tex, ex1, ex2], i) => {
          const y = 180 + i * 240;
          return [on(shape('rounded', 90, y, 1100, 210, BG2, { stroke: c, strokeWidth: 2, radius: 12 }), 'fade-up'),
            along(text(h, 120, y + 18, 400, 36, { fontFamily: H, fontSize: 20, letterSpacing: 5, color: c, fontWeight: 700 }), 'fade-up'),
            along(mathBlock({ x: 120, y: y + 60, w: 640, h: 70, fontSize: 32, color: W, latex: tex }), 'fade-up'),
            along(text(`${E(ex1)}<br>${E(ex2)}`, 800, y + 60, 370, 120, { fontSize: 25, color: DIM }), 'fade-up')]; }).flat()],
        notes: 'Cada fórmula aparece con un clic con dos ejemplos: afirmación y pregunta. La pregunta del present perfect con «ever» es la estrella del tema.' + NOTE },
      { title: 'Palabras que avisan', layout: 'titleOnly', bg: BG, extra: [
        text('PRESENT PERFECT', 90, 170, 520, 40, { fontFamily: H, fontSize: 22, letterSpacing: 5, color: OR, fontWeight: 700 }),
        text('PAST SIMPLE', 670, 170, 520, 40, { fontFamily: H, fontSize: 22, letterSpacing: 5, color: STEEL, fontWeight: 700 }),
        ...['ever', 'never', 'already', 'yet', 'just', 'so far', 'since 2020', 'for two years'].map((w, i) =>
          withAnims(chip(fx(w, 'en'), 90 + (i % 2) * 260, 230 + Math.floor(i / 2) * 75, 240, OR), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 200 }))),
        ...['yesterday', 'last week', 'two days ago', 'in 2019', 'when I was ten', 'at 8 o’clock'].map((w, i) =>
          withAnims(chip(fx(w, 'en'), 670 + (i % 2) * 260, 230 + Math.floor(i / 2) * 75, 240, STEEL), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 200 }))),
        text('Truco: si la frase dice <b>cuándo</b> pasó (un momento terminado), past simple.', 90, 560, 1100, 50, { fontSize: 26, color: W })],
        notes: 'Etiquetas de palabras señal, una columna por clic (entran seguidas). «Since» y «for» se ven a fondo en la próxima sesión.' + NOTE },
      { title: 'Los irregulares de siempre', layout: 'titleOnly', bg: BG, transition: 'fade', extra: [
        tableBlock({ x: 90, y: 175, w: 820, h: 440, fontSize: 26, header: true, headBg: OR, headFg: BG, stroke: '#3a3a3a', banded: true, band: STEEL, bandAlpha: 0.08, color: W, colW: [2, 2, 2.4, 2.4],
          rows: [['Base', 'Past simple', 'Past participle', 'Significado'], ...[['go', 'went', 'gone / been', 'ir'], ['see', 'saw', 'seen', 'ver'], ['eat', 'ate', 'eaten', 'comer'],
            ['write', 'wrote', 'written', 'escribir'], ['be', 'was / were', 'been', 'ser, estar'], ['have', 'had', 'had', 'tener']].map(r => r.map((c, j) => `<span style="color:${W}">${j < 3 ? E(c) : c}</span>`))] }),
        on(card(`<b style="color:${OR}">${E('gone')} o ${E('been')}?</b><br><br>${E('She has gone to Rome.')} → está allí ahora.<br><br>${E('She has been to Rome.')} → fue y ya volvió.`, 950, 175, 240, 440, BG2, { fontSize: 22, color: W, radius: 12, borderColor: OR }), 'fade-left')],
        notes: 'Tabla de irregulares frecuentes. La tarjeta de la derecha resuelve una duda clásica: gone (sigue allí) frente a been (ida y vuelta).' + NOTE },
      { title: '¿Británico o estadounidense?', layout: 'titleOnly', bg: BG, extra: [
        chartBlock({ x: 90, y: 170, w: 700, h: 470, chartType: 'stacked100', color: OR, labelColor: DIM, dataLabels: true,
          data: [{ label: 'Reino Unido', value: 82 }, { label: 'Estados Unidos', value: 41 }], seriesName: 'Have you eaten yet?',
          series: [{ name: 'Did you eat yet?', values: [18, 59], color: '#6a6a6a' }] }),
        on(text(`<div style="font-family:${H};font-size:30px;font-weight:700;color:${W}">El inglés no es uno solo</div><div style="margin-top:12px">En Estados Unidos es frecuente usar el past simple con ${E('yet')}, ${E('already')} o ${E('just')}. En los exámenes, mejor el present perfect.</div>`,
          830, 210, 370, 320, { fontSize: 24, color: DIM }), 'fade-left'),
        text('Uso en una encuesta a hablantes nativos (datos inventados).', 830, 570, 370, 60, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Barras al 100 %: qué pregunta usan más los hablantes de cada país (cifras inventadas para ilustrar la tendencia). Las leyendas son frases en inglés y no se traducen.' + NOTE },
      { title: 'Decide en dos preguntas', layout: 'titleOnly', bg: BG, transition: 'push', extra: [
        dg('hierarchy', '¿Dices cuándo pasó?\n  Sí, un momento terminado\n    PAST SIMPLE\n  No, o llega hasta ahora\n    PRESENT PERFECT', 90, 180, 1100, 460, { oneByOne: true, colors: 'outline', textColor: W, fontScale: 1.4 })],
        notes: 'Árbol de decisión, nivel a nivel. Proyecta frases sueltas («I ___ to London in 2018», «I ___ never ___ sushi») y recorred el árbol con la clase.' + NOTE },
      { layout: 'blank', bg: W, extra: [quiz('I ___ my homework. Can I go out now?', ['did', 'have done', 'do', 'was doing'], 1, { time: 20 })],
        notes: 'Concurso con puntos. «Have done»: la acción está terminada pero importa ahora (puedo salir). Las opciones están en inglés y no se traducen.' + NOTE },
      { title: E('Find someone who…'), layout: 'titleOnly', bg: BG, transition: 'zoom', extra: [
        ...['has been to another country', 'has never eaten sushi', 'has broken a bone', 'has met a famous person', 'has read a book this month', 'has been on TV', 'has lost a phone', 'has climbed a mountain', 'has never seen snow'].map((t, i) =>
          card(`<span style="font-size:18px;color:${OR}">${i + 1}</span><br>${E(t)}`, 90 + (i % 3) * 240, 170 + Math.floor(i / 3) * 155, 225, 140, BG2, { fontSize: 21, color: W, radius: 10, borderColor: '#3a3a3a', pad: [12, 14, 12, 14] })),
        text('Pregunta ' + E('Have you ever…?') + ' y, si alguien dice que sí, pide un detalle en past simple: ' + E('When did you…?'), 840, 170, 360, 200, { fontSize: 24, color: W }),
        timer(300, 900, 390, 240, { style: 'ring', color: OR, auto: false }),
        { ...credits(['kh-ChronographWatch'], 90, 640, 1100, '#6a6a6a'), h: 50 }],
        notes: 'Juego para moverse por la clase: cinco minutos para encontrar a alguien de cada casilla. Combina los dos tiempos: Have you ever…? / When did you…?' + NOTE },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Portuguese: blue-and-white tiles, a yellow tram that climbs the hills, a chat on a phone, a treemap of speakers.
  edu_lang2_ola: { name: 'Portugués: Olá, Lisboa!', cat: 'edu', summary: 'Azulejos y tranvía amarillo que sube la colina con Trayectoria, saludos que giran, tabla de sonidos, chat en un móvil y mapa de árbol', make: () => {
    const BG = '#f7f9fc', AZ = '#1f4e9c', AZ2 = '#3b6fc4', LIGHT = '#dbe6f7', YEL = '#f6c21c', TERRA = '#c4572e', INK = '#14213d', DIM = '#5a6680', H = pairStacks('modern').heading;
    const P = s => fl(s, 'pt');
    const TILE = '<rect width="120" height="120" fill="#ffffff"/><rect x="3" y="3" width="114" height="114" fill="none" stroke="#1f4e9c" stroke-width="3"/>'
      + '<path d="M0 0Q30 0 30 30Q0 30 0 0ZM120 0Q90 0 90 30Q120 30 120 0ZM0 120Q30 120 30 90Q0 90 0 120ZM120 120Q90 120 90 90Q120 90 120 120Z" fill="#3b6fc4"/>'
      + '<path d="M60 22Q74 46 60 60Q46 46 60 22ZM60 98Q46 74 60 60Q74 74 60 98ZM22 60Q46 46 60 60Q46 74 22 60ZM98 60Q74 74 60 60Q74 46 98 60Z" fill="#1f4e9c"/><circle cx="60" cy="60" r="8" fill="#f6c21c"/>';
    const TILES = (w, h) => svgURL(w, h, `<defs><pattern id="t" width="120" height="120" patternUnits="userSpaceOnUse">${TILE}</pattern></defs><rect width="${w}" height="${h}" fill="url(#t)"/>`);
    const tileBand = () => [img(TILES(1280, 60), 0, 660, 1280, 60, 'Cenefa de azulejos', { fit: 'cover', decorative: true })];
    const TRAM = svgURL(260, 170, '<path d="M120 30L150 4" stroke="#333" stroke-width="3"/><rect x="20" y="30" width="220" height="16" rx="6" fill="#f3f0e6"/>'
      + '<rect x="14" y="44" width="232" height="100" rx="12" fill="#f6c21c"/><rect x="14" y="104" width="232" height="10" fill="#ffffff"/>'
      + [0, 1, 2, 3, 4].map(i => `<rect x="${30 + i * 42}" y="56" width="32" height="38" rx="4" fill="#cfe3f7" stroke="#8a6a12" stroke-width="2"/>`).join('')
      + '<text x="130" y="134" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="16" font-weight="700" fill="#8a6a12">28</text>'
      + '<rect x="14" y="140" width="232" height="10" rx="3" fill="#555"/><circle cx="60" cy="154" r="12" fill="#333"/><circle cx="200" cy="154" r="12" fill="#333"/>');
    // Lisbon's hills: the track along them, little houses under it and the river at the bottom (slide coordinates − 300 in y).
    const TRACK = [[70, 560], [420, 470], [800, 520], [1140, 420]];
    const HILLS = svgURL(1280, 420, '<path d="M0 280C200 250 300 170 420 170C560 170 660 230 800 220C930 210 1020 120 1280 110V420H0Z" fill="#e8dcc4"/>'
      + `<path d="M0 270C200 240 300 170 420 170C560 170 660 230 800 220C930 210 1020 120 1280 110" stroke="#6b5a48" stroke-width="5" fill="none"/>`
      + Array.from({ length: 22 }, (_, i) => { const x = 20 + i * 58, y = 300 + (i % 3) * 20 - (i > 12 ? 60 : i > 6 ? 30 : 0), c = ['#f2c4a0', '#f6e3a1', '#b9d3ee', '#f3b8b0', '#ffffff', '#cfe8c9'][i % 6];
        return `<rect x="${x}" y="${y}" width="48" height="56" fill="${c}"/><path d="M${x - 4} ${y}L${x + 24} ${y - 20}L${x + 52} ${y}Z" fill="#c4572e"/><rect x="${x + 10}" y="${y + 14}" width="10" height="14" fill="#1f4e9c"/><rect x="${x + 28}" y="${y + 14}" width="10" height="14" fill="#1f4e9c"/>`; }).join('')
      + '<rect y="380" width="1280" height="40" fill="#3b6fc4"/><path d="M0 392H1280" stroke="#ffffff" stroke-width="2" stroke-dasharray="20 30" opacity=".6"/>');
    const CHAT = svgURL(360, 720, '<rect width="360" height="720" fill="#eef2f8"/><rect width="360" height="90" fill="#1f4e9c"/><circle cx="44" cy="56" r="22" fill="#f6c21c"/>'
      + '<text x="80" y="52" font-family="Helvetica,Arial,sans-serif" font-size="20" font-weight="700" fill="#ffffff">Inês</text><text x="80" y="74" font-family="Helvetica,Arial,sans-serif" font-size="14" fill="#cfe0ff">en línea</text>'
      + [['l', 'Olá! Como te chamas?', 130], ['r', 'Chamo-me Tiago. E tu?', 210], ['l', 'Sou a Inês. Muito prazer!', 290], ['r', 'Igualmente! De onde és?', 370], ['l', 'Sou de Lisboa. E tu?', 450], ['r', 'Sou de Sevilha, Espanha.', 530]]
        .map(([s, t, y]) => s === 'l' ? `<rect x="16" y="${y}" width="250" height="56" rx="16" fill="#ffffff"/><text x="32" y="${y + 35}" font-family="Helvetica,Arial,sans-serif" font-size="18" fill="#14213d">${t}</text>`
          : `<rect x="94" y="${y}" width="250" height="56" rx="16" fill="#3b6fc4"/><text x="110" y="${y + 35}" font-family="Helvetica,Arial,sans-serif" font-size="18" fill="#ffffff">${t}</text>`).join('')
      + '<rect x="12" y="650" width="336" height="52" rx="26" fill="#ffffff"/><text x="34" y="683" font-family="Helvetica,Arial,sans-serif" font-size="16" fill="#9aa5b8">Escreve uma mensagem…</text>');
    const NOTE = ' Las palabras y frases en portugués van en cursiva o en su propio azulejo: no se traducen.';
    return numbered(build({ name: 'Portugués: Olá, Lisboa!', palette: 'office', fonts: 'modern', title: { color: AZ, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: [img(TILES(400, 720), 0, 0, 400, 720, 'Azulejos', { fit: 'cover', decorative: true }), shape('rect', 400, 0, 10, 720, AZ)], extra: [
        kicker('PORTUGUÉS · A1', 480, 110, 600, TERRA, { fontFamily: H, fontWeight: 700 }),
        text(fx('Olá, Lisboa!', 'pt'), 474, 150, 760, 140, { fontFamily: H, fontSize: 96, fontWeight: 800, color: AZ }),
        text('Saludar, presentarse y moverse por la ciudad', 480, 300, 700, 50, { fontSize: 30, color: DIM }),
        ...['Bom dia!', 'Obrigada!', 'Até logo!'].map((w, i) => text(fx(w, 'pt'), 480 + i * 230, 390, 210, 60, { fontFamily: H, fontSize: 26, fontWeight: 700, color: AZ, bg: LIGHT, radius: 30, textAlign: 'center', vAlign: 'middle' })),
        shape('rect', 410, 642, 870, 8, '#6b5a48'),
        withAnims(img(TRAM, 1000, 474, 260, 170, 'Tranvía amarillo'), A('path', { start: 'afterPrev', pathShape: 'custom', points: [[0, 0], [-500, 0]], dx: -500, dy: 0, duration: 3000, delay: 300 }))],
        notes: 'Portada con azulejos azules y blancos y el tranvía amarillo, que entra solo hasta la parada. Pregunta quién ha estado en Portugal o en Brasil.' + NOTE },
      { title: 'Saludos y despedidas', layout: 'titleOnly', bg: BG, back: tileBand(), transition: 'slide', extra: [
        ...[['Olá!', '¡Hola!'], ['Bom dia', 'Buenos días'], ['Boa tarde', 'Buenas tardes'], ['Boa noite', 'Buenas noches'], ['Até logo!', '¡Hasta luego!'], ['Tchau!', '¡Chao!']].map(([pt, es], i) => {
          const x = 90 + (i % 3) * 375, y = 180 + Math.floor(i / 3) * 230;
          return withAnims(card(`<div style="font-family:${H};font-size:44px;font-weight:800;color:${AZ}">${fx(pt, 'pt')}</div><div style="font-size:24px;color:${DIM};margin-top:6px">${es}</div>`, x, y, 345, 200, '#ffffff',
            { color: INK, textAlign: 'center', vAlign: 'middle', borderColor: AZ, radius: 4, shadow: { x: 0, y: 6, blur: 0, color: LIGHT } }), A('flip', { start: i ? 'afterPrev' : 'click', duration: 450, sound: 'pop' })); })],
        notes: 'Un clic y los seis azulejos giran uno tras otro. «Bom dia» se usa hasta la hora de comer; «boa noite» sirve para saludar y para despedirse por la noche.' + NOTE },
      { title: P('Obrigado') + ' u ' + P('obrigada') + '?', layout: 'titleOnly', bg: BG, back: tileBand(), extra: [
        ...[['Obrigado!', 'Lo dice un hombre', AZ], ['Obrigada!', 'Lo dice una mujer', TERRA]].map(([w, d, c], i) => {
          const x = 120 + i * 560;
          return [on(icon('user', x, 260, 120, c), 'zoom-in', { duration: 300 }),
            along(shape('rounded', x + 140, 200, 300, 110, c, { radius: 24, html: `<b>${fx(w, 'pt')}</b>`, fontFamily: H, fontSize: 42, color: '#ffffff' }), 'zoom-in', { sound: 'pop', duration: 300 }),
            along(text(d, x + 140, 330, 300, 50, { fontSize: 26, color: INK }), 'fade-up')]; }).flat(),
        on(card(`Significa «agradecido» o «agradecida»: concuerda con <b>quien habla</b>, no con quien escucha. Se responde: <b>${P('De nada!')}</b>`, 120, 450, 1040, 130, LIGHT, { fontSize: 26, color: INK, radius: 12 }), 'fade-up')],
        notes: 'La duda más típica de quien empieza. Primero aparece cada hablante con su «gracias» y, al final, la explicación.' + NOTE },
      { title: 'Sonidos que no tiene el español', layout: 'titleOnly', bg: BG, back: tileBand(), transition: 'fade', extra: [
        tableBlock({ x: 90, y: 180, w: 1100, h: 440, fontSize: 26, header: true, headBg: AZ, headFg: '#ffffff', stroke: '#c9d6ec', banded: true, band: AZ2, bandAlpha: 0.08, colW: [1.4, 3.4, 3.4],
          rows: [['Se escribe', 'Suena…', 'Ejemplos'], [P('ão'), 'una «a» nasal que acaba en «u»', P('pão, não, coração')], [P('lh'), 'como la «ll» de «calle» (con elle)', P('trabalho, olho, filha')],
            [P('nh'), 'como la «ñ»', P('vinho, amanhã, Espanha')], [P('ç'), 'como una «s»', P('praça, almoço')], [P('-o final'), 'casi como una «u»', P('obrigado → obrigadu')]] })],
        notes: 'Cinco grafías que despistan al leer. Lee cada ejemplo y que la clase lo repita. Con «-o final» hay diferencias entre Portugal y Brasil: aquí seguimos la pronunciación de Lisboa.' + NOTE },
      { layout: 'blank', bg: '#dff0ff', transition: 'push', back: [img(HILLS, 0, 300, 1280, 420, 'Colinas de Lisboa con casas y el río', { fit: 'fill', decorative: true })], extra: [
        text('En el tranvía 28', 90, 50, 800, 70, { fontFamily: H, fontSize: 46, fontWeight: 800, color: AZ }),
        ...(() => { // (made in play order: a leg of the ride, then the sentence of that stop)
          const SAY = [['Onde fica o miradouro?', '¿Dónde está el mirador?'], ['É perto daqui?', '¿Está cerca de aquí?'], ['Próxima paragem: Alfama.', 'Próxima parada: Alfama.']];
          const legs = [], says = [];
          [1, 2, 3].forEach(i => { legs.push(path([[TRACK[i][0] - TRACK[i - 1][0], TRACK[i][1] - TRACK[i - 1][1]]], { duration: 2000 }));
            says.push(after(card(`<div style="font-family:${H};font-size:27px;font-weight:700;color:${AZ}">${P(SAY[i - 1][0])}</div><div style="font-size:20px;color:${DIM};margin-top:4px">${SAY[i - 1][1]}</div>`,
              90 + (i - 1) * 375, 130, 345, 150, '#ffffff', { color: INK, radius: 12, borderColor: YEL, pad: [14, 18, 14, 18] }), 'fade-down', { sound: 'pop', duration: 350 })); });
          return [withAnims(img(TRAM, TRACK[0][0] - 110, TRACK[0][1] - 160, 220, 144, 'Tranvía amarillo'), ...legs), ...says]; })()],
        notes: 'El tranvía sube y baja las colinas con cada clic (Trayectoria) y en cada parada aparece una frase útil. En Portugal se dice «paragem»; en Brasil, «parada» o «ponto».' + NOTE },
      { title: 'Presentarse por el móvil', layout: 'titleOnly', bg: BG, back: tileBand(), extra: [
        { ...img(CHAT, 120, 150, 270, 500, 'Chat en un móvil entre Inês y Tiago', { fit: 'cover' }), device: 'phone' },
        ...[['Como te chamas?', '¿Cómo te llamas?'], ['Chamo-me…', 'Me llamo…'], ['Muito prazer!', '¡Mucho gusto!'], ['De onde és?', '¿De dónde eres?'], ['Sou de…', 'Soy de…']].map(([pt, es], i) =>
          on(text(`<b style="color:${AZ}">${P(pt)}</b> &nbsp;<span style="color:${DIM}">${es}</span>`, 500, 180 + i * 85, 680, 70, { fontSize: 30, color: INK, vAlign: 'middle' }), 'fade-left'))],
        notes: 'Una conversación de presentación en un chat inventado, dentro del marco de un móvil (Imagen ▸ Dispositivo). A la derecha, las fórmulas clave, una por clic.' + NOTE },
      { title: '¿Dónde se habla portugués?', layout: 'titleOnly', bg: BG, back: tileBand(), transition: 'fade', extra: [
        chartBlock({ x: 90, y: 170, w: 760, h: 460, chartType: 'treemap', color: AZ, dataLabels: true,
          data: [['Brasil', 212, AZ], ['Angola', 25, TERRA], ['Mozambique', 14, '#2f8f6b'], ['Portugal', 10, AZ2], ['Otros países', 6, '#c9a227']].map(([label, value, color]) => ({ label, value, color })) }),
        on(text(`<div style="font-family:${H};font-size:80px;font-weight:800;line-height:1;color:${AZ};white-space:nowrap">8 de 10</div><div style="margin-top:10px">hablantes de portugués viven en Brasil.</div>`, 890, 230, 320, 260, { fontSize: 26, color: INK }), 'fade-left'),
        text('Millones de hablantes, cifras aproximadas y redondeadas.', 890, 540, 320, 70, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Mapa de árbol: el tamaño de cada rectángulo es el número de hablantes (millones, aproximado). Portugal es solo una parte pequeña de la lusofonía.' + NOTE },
      { layout: 'blank', bg: BG, back: tileBand(), extra: [pollBlock({ kind: 'match', fontSize: 32, question: 'Falsos amigos: une cada palabra portuguesa con su significado', x: 80, y: 40, w: 1120, h: 600,
        options: ['polvo = pulpo', 'esquisito = raro', 'borracha = goma de borrar', 'cena = escena'] })],
        notes: 'Unir parejas desde el móvil: palabras portuguesas que engañan a los hispanohablantes. Las palabras de la izquierda están en portugués y no se traducen.' },
      { layout: 'blank', bg: BG, back: tileBand(), extra: [quiz('Inês quiere dar las gracias. ¿Qué dice?', ['Obrigado!', 'Obrigada!', 'Gracias!', 'Obrigados!'], 1, { time: 15, h: 600 })],
        notes: 'Concurso con puntos: Inês es una chica, así que dice «Obrigada!».' + NOTE },
      { layout: 'blank', bg: BG, transition: 'zoom', back: [img(TILES(1280, 720), 0, 0, 1280, 720, 'Azulejos', { fit: 'cover', decorative: true })], extra: [
        shape('rect', 240, 150, 800, 400, '#ffffff', { shadow: { x: 0, y: 10, blur: 30, color: '#1f4e9c55' } }), shape('rect', 256, 166, 768, 368, 'none', { stroke: AZ, strokeWidth: 3 }),
        text(fx('Até à próxima!', 'pt'), 260, 200, 760, 120, { fontFamily: H, fontSize: 80, fontWeight: 800, color: AZ, textAlign: 'center' }),
        text('¡Hasta la próxima! Para casa: grábate presentándote en portugués en menos de 30 segundos.', 300, 340, 680, 120, { fontSize: 28, color: INK, textAlign: 'center' }),
        after(img(TRAM, 540, 500, 200, 130, 'Tranvía amarillo'), 'fade-left', { duration: 800 })],
        notes: 'Despedida sobre un fondo de azulejos. La tarea es breve y oral: un audio o un vídeo de 30 segundos con las fórmulas del chat.' + NOTE },
    ]));
  } },
};
