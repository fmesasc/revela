// Example presentations: Lengua y literatura en el aula. Each one: { name, summary, cat: 'edu', make() } → a deck
// (see kit.js for the builders). Ten topics, each with its own look: a squared exercise book corrected in red pen,
// a page marked with highlighters, a library at night, Bécquer's moon and swallows, a Golden Age playhouse with its
// curtain, a pop-art comic, a sound studio for metre, an old map of Castile, an architect's blueprint for syntax and
// an illustrated storybook for fables.

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// A drawing of our own (SVG) as a data URL: no external pictures.
const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// A picture that is only decoration (a paper, a grid, a texture) filling the slide.
const paperImg = (src, alt) => ({ ...img(src, 0, 0, 1280, 720, alt, { fit: 'cover' }), decorative: true });
// The same object on two slides (Transform): give it a fixed id.
const keep = (b, id) => ({ ...b, id });
// Click-by-click and chained animations, shorter to write.
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
const along = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'withPrev', ...props }));
// A stroke through points on the slide (a pen mark, a road, a highlighter): an ink object, so it can be drawn as you present.
const ink = (pts, color, width = 3, props = {}) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = Math.ceil(width / 2) + 4;
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad, w = Math.max(...xs) - x + pad, h = Math.max(...ys) - y + pad;
  return { id: uid(), x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// A hand-drawn loop round a point (a teacher circling a mistake).
const loop = (cx, cy, rx, ry, color, width = 5, props = {}) => ink(Array.from({ length: 40 }, (_, i) => { const a = -2.2 + i / 39 * 2.15 * Math.PI;
  return [cx + rx * Math.cos(a) * (1 + 0.04 * Math.sin(i)), cy + ry * Math.sin(a)]; }), color, width, props);
// A small uppercase label with wide spacing.
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 36, { fontSize: 20, letterSpacing: 5, color, ...props });
// A round numbered badge.
const badge = (n, x, y, d, bg, fg = '#ffffff', props = {}) => text(String(n), x, y, d, d, { fontSize: Math.round(d * 0.5), fontWeight: 800, color: fg, bg, radius: d / 2, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0], ...props });
// A quiz question (points for speed) filling the slide.
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 44, x: 60, y: 40, w: 1160, h: 640, ...props });
// The credits of the 3D models of a deck, in one small line.
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 30, { fontSize: 12, color });
// A 3D model without its caption (its credit, when it needs one, goes in a line of its own).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
// Fonts used outside the deck's pair.
const FF = { caveat: "'Caveat', cursive", cormorant: "'Cormorant Garamond', serif", mono: "'JetBrains Mono', monospace", abril: "'Abril Fatface', serif",
  dancing: "'Dancing Script', cursive", anton: "'Anton', sans-serif", lora: "'Lora', serif", oswald: "'Oswald', sans-serif" };

// ---- Drawings ---------------------------------------------------------------------
// Squared exercise-book paper.
const GRID = svgURL(1280, 720, Array.from({ length: 41 }, (_, i) => `<path d="M${i * 32} 0V720" stroke="#cfe0f0" stroke-width="1"/>`).join('')
  + Array.from({ length: 23 }, (_, i) => `<path d="M0 ${i * 32}H1280" stroke="#cfe0f0" stroke-width="1"/>`).join(''), '#fdfcf7');
// A sheet with ruled lines (for the commentary).
const RULED = (w, h, lines = 12) => svgURL(w, h, `<rect width="${w}" height="${h}" rx="6" fill="#ffffff" stroke="#d9d6cf"/>`
  + Array.from({ length: lines }, (_, i) => `<path d="M${w * 0.1} ${h * 0.16 + i * h * 0.064}H${w * (0.9 - (i % 4 === 3 ? 0.25 : 0))}" stroke="#c9c6bf" stroke-width="3" stroke-linecap="round"/>`).join('')
  + `<path d="M${w * 0.1} ${h * 0.16 + 2 * h * 0.064}H${w * 0.62}" stroke="#ffe94d" stroke-width="${h * 0.04}" opacity=".7"/>`
  + `<path d="M${w * 0.1} ${h * 0.16 + 6 * h * 0.064}H${w * 0.5}" stroke="#ff8fc7" stroke-width="${h * 0.04}" opacity=".6"/>`);

// A swallow in flight (Bécquer): wings open, forked tail.
const SWALLOW = (c = '#0d0820') => svgURL(100, 64, `<path d="M50 30 C42 18 24 10 2 12 C20 20 32 26 40 34 C44 38 47 40 50 40 C53 40 56 38 60 34 C68 26 80 20 98 12 C76 10 58 18 50 30Z" fill="${c}"/>`
  + `<path d="M46 38 L38 62 L50 46 L62 62 L54 38Z" fill="${c}"/><circle cx="50" cy="31" r="5" fill="${c}"/>`);
// Night sky with stars (always the same ones).
const STARS = (w, h, n, seed = 7) => { let r = seed; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  return svgURL(w, h, Array.from({ length: n }, () => `<circle cx="${(rnd() * w).toFixed(0)}" cy="${(rnd() * h).toFixed(0)}" r="${(0.6 + rnd() * 1.8).toFixed(1)}" fill="#ffffff" opacity="${(0.3 + rnd() * 0.7).toFixed(2)}"/>`).join('')); };
// One half of a theatre curtain: red velvet folds.
const CURTAIN = (flip = false) => svgURL(660, 720, '<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat" gradientTransform="scale(0.11)">'
  + '<stop offset="0" stop-color="#4a0a0a"/><stop offset=".45" stop-color="#b3262a"/><stop offset=".6" stop-color="#d8423f"/><stop offset="1" stop-color="#4a0a0a"/></linearGradient></defs>'
  + `<path d="${flip ? 'M0 0H660V720H30Q0 600 20 480Q0 300 10 0Z' : 'M0 0H660Q650 300 640 480Q660 600 630 720H0Z'}" fill="url(#f)"/>`
  + `<path d="M0 640H660" stroke="#d4a944" stroke-width="6" opacity=".7"/>`);
// A Golden Age playhouse seen from above (corral de comedias).
const CORRAL = svgURL(560, 480, '<rect x="10" y="10" width="540" height="460" rx="8" fill="#5a3a24"/>'
  + '<rect x="100" y="24" width="360" height="100" fill="#c49a6c" stroke="#3a2416" stroke-width="3"/><path d="M100 124H460" stroke="#d4a944" stroke-width="6"/>'
  + '<rect x="100" y="132" width="360" height="248" fill="#e3d2b0"/>' + Array.from({ length: 6 }, (_, i) => `<path d="M${130 + i * 60} 160 v190" stroke="#cbb68f" stroke-width="2" stroke-dasharray="6 8"/>`).join('')
  + '<rect x="24" y="132" width="66" height="248" fill="#8a5a3a"/><rect x="470" y="132" width="66" height="248" fill="#8a5a3a"/>'
  + Array.from({ length: 6 }, (_, i) => `<path d="M24 ${150 + i * 40}H90M470 ${150 + i * 40}H536" stroke="#6b4423" stroke-width="3"/>`).join('')
  + '<rect x="24" y="24" width="66" height="100" fill="#7a2a1a"/><rect x="470" y="24" width="66" height="100" fill="#7a2a1a"/>'
  + [0, 1, 2].map(i => `<rect x="36" y="${34 + i * 30}" width="42" height="20" fill="#e8c26a"/><rect x="482" y="${34 + i * 30}" width="42" height="20" fill="#e8c26a"/>`).join('')
  + '<rect x="100" y="390" width="360" height="66" fill="#b5651d"/>' + Array.from({ length: 8 }, (_, i) => `<rect x="${112 + i * 44}" y="404" width="30" height="38" fill="#7a3f12"/>`).join(''));
// A pair of scales, heavier on the right (freedom over fate): the beam tilts, the pans hang straight.
const SCALES = svgURL(520, 360, '<path d="M260 60V320" stroke="#d4a944" stroke-width="10"/><path d="M200 330H320" stroke="#d4a944" stroke-width="14" stroke-linecap="round"/>'
  + '<path d="M74 31L446 110" stroke="#d4a944" stroke-width="10" stroke-linecap="round"/><circle cx="260" cy="70" r="14" fill="#d4a944"/>'
  + '<path d="M94 35L44 145M94 35L144 145M426 105L376 215M426 105L476 215" stroke="#b59b7a" stroke-width="3"/>'
  + '<path d="M34 145H154Q144 185 94 185Q44 185 34 145Z" fill="#8b1a1a"/><path d="M366 215H486Q476 255 426 255Q376 255 366 215Z" fill="#8b1a1a"/>'
  + '<text x="94" y="222" text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="#f3e3c3" letter-spacing="3">DESTINO</text>'
  + '<text x="426" y="292" text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="#f3e3c3" letter-spacing="3">LIBERTAD</text>');

// Pop-art halftone dots (comic).
const HALFTONE = (dot, bg) => svgURL(1280, 720, '<defs><pattern id="h" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="11" cy="11" r="4.2" fill="' + dot + '"/></pattern>'
  + '<radialGradient id="m" cx=".85" cy=".2" r=".9"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="k"><rect width="1280" height="720" fill="url(#m)"/></mask></defs>'
  + '<rect width="1280" height="720" fill="url(#h)" mask="url(#k)"/>', bg);
// A wave of sound (metre): points for an ink stroke along a slide.
const wave = (x0, x1, y, amp, n = 160, seed = 3) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1);
  const env = Math.sin(Math.PI * t) ** 0.6, a = Math.sin(t * 46 + seed) * 0.6 + Math.sin(t * 17 + seed * 2) * 0.4;
  return [x0 + t * (x1 - x0), y + amp * env * a]; });

// Lazarillo: an old map of Castile with Lázaro's road, from Salamanca to Toledo (positions in a 1080 × 440 box).
const TOWNS = [['Salamanca', 110, 150], ['Almorox', 640, 300], ['Escalona', 720, 240], ['Maqueda', 820, 190], ['Toledo', 980, 320]];
const OLD_MAP = svgURL(1080, 440, '<defs><radialGradient id="p" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#efe0bf"/><stop offset="1" stop-color="#c9a86a"/></radialGradient></defs>'
  + '<rect width="1080" height="440" rx="10" fill="url(#p)"/><rect x="12" y="12" width="1056" height="416" rx="6" fill="none" stroke="#7a5a35" stroke-width="2" stroke-dasharray="2 6"/>'
  // (the rivers: the Tormes at Salamanca, the Alberche and the Tagus at Toledo)
  + '<path d="M40 210 C80 190 100 175 130 168 S200 150 260 120" stroke="#5b8fb0" stroke-width="5" fill="none"/>'
  + '<path d="M560 120 C600 180 650 250 700 270 S820 300 900 330 S1000 350 1060 360" stroke="#5b8fb0" stroke-width="6" fill="none"/>'
  + '<text x="30" y="250" font-family="Georgia,serif" font-style="italic" font-size="18" fill="#3f6f90">río Tormes</text><text x="1000" y="384" font-family="Georgia,serif" font-style="italic" font-size="18" fill="#3f6f90">Tajo</text>'
  // (sierras)
  + [[330, 120], [370, 100], [410, 125], [450, 105], [490, 130], [420, 360], [460, 340], [500, 365]].map(([x, y]) => `<path d="M${x - 26} ${y + 22} L${x} ${y - 14} L${x + 26} ${y + 22}" fill="#b89a66" stroke="#7a5a35" stroke-width="2"/>`).join('')
  + '<text x="360" y="178" font-family="Georgia,serif" font-size="16" fill="#7a5a35" letter-spacing="4">SIERRA DE GREDOS</text>'
  // (the compass)
  + '<g transform="translate(990 90)"><circle r="40" fill="none" stroke="#7a5a35" stroke-width="2"/><path d="M0 -48 L9 0 L0 48 L-9 0Z" fill="#8e1b1b"/><path d="M-48 0 L0 9 L48 0 L0 -9Z" fill="#7a5a35"/><text y="-54" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#3b2a1a">N</text></g>'
  + `<path d="M${TOWNS.map(t => t[1] + ' ' + t[2]).join(' L')}" stroke="#8e1b1b" stroke-width="3" stroke-dasharray="10 8" fill="none"/>`
  + TOWNS.map(([n, x, y], i) => `<circle cx="${x}" cy="${y}" r="9" fill="#3b2a1a"/><text x="${x + (i === 2 ? -16 : i === 0 ? -50 : 14)}" y="${y + (i === 2 ? -16 : i < 2 ? 36 : -14)}" text-anchor="${i === 2 ? 'end' : 'start'}" font-family="Georgia,serif" font-size="22" fill="#3b2a1a">${n}</text>`).join(''));
// A bunch of grapes.
const GRAPES = svgURL(300, 380, '<path d="M150 60 C150 30 170 14 190 8" stroke="#6b4423" stroke-width="8" fill="none" stroke-linecap="round"/>'
  + '<path d="M160 40 C200 10 260 20 280 50 C240 60 200 60 160 40Z" fill="#6b8e23"/>'
  + [[110, 90], [150, 84], [190, 90], [90, 130], [130, 126], [170, 126], [210, 130], [100, 170], [140, 166], [180, 166], [220, 172], [120, 210], [160, 206], [200, 210], [130, 250], [170, 248], [150, 288], [150, 326]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="24" fill="${i % 3 ? '#5b2a7a' : '#6f3a8f'}"/><circle cx="${x - 8}" cy="${y - 8}" r="6" fill="#ffffff" opacity=".25"/>`).join(''));
// Syntax: a blueprint grid.
const BLUEPRINT = svgURL(1280, 720, Array.from({ length: 33 }, (_, i) => `<path d="M${i * 40} 0V720" stroke="#ffffff" stroke-width="1" opacity="${i % 5 ? 0.08 : 0.2}"/>`).join('')
  + Array.from({ length: 19 }, (_, i) => `<path d="M0 ${i * 40}H1280" stroke="#ffffff" stroke-width="1" opacity="${i % 5 ? 0.08 : 0.2}"/>`).join(''), '#0d3b66');
// The sentence to label (activity): its word groups in two rows, a line under each.
const SENTENCE = svgURL(640, 400, '<rect width="640" height="400" rx="16" fill="#0d3b66"/>'
  + [['Mi hermana', 40, 70, 300], ['compró', 360, 70, 240], ['flores', 40, 220, 240], ['ayer', 400, 220, 180]].map(([w, x, y, wd]) => `<rect x="${x}" y="${y}" width="${wd}" height="90" rx="10" fill="#ffffff"/>`
    + `<text x="${x + wd / 2}" y="${y + 60}" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="700" fill="#0d3b66">${w}</text><path d="M${x} ${y + 112}H${x + wd}" stroke="#7fdbff" stroke-width="4"/>`).join(''));
// Fables: a storybook landscape (sky, sun, hills, trees, a path).
const LANDSCAPE = svgURL(1280, 720, '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#fff6dc"/></linearGradient></defs>'
  + '<rect width="1280" height="720" fill="url(#s)"/><circle cx="1110" cy="120" r="70" fill="#ffd54f"/><circle cx="1110" cy="120" r="100" fill="#ffd54f" opacity=".25"/>'
  + '<path d="M120 120c20-26 64-26 80 0c22-8 46 6 40 26h-150c-6-16 12-30 30-26z" fill="#ffffff"/><path d="M640 80c20-26 64-26 80 0c22-8 46 6 40 26h-150c-6-16 12-30 30-26z" fill="#ffffff" opacity=".9"/>'
  + '<path d="M0 470 Q240 380 520 450 T1280 420 V720 H0Z" fill="#9ccc65"/><path d="M0 560 Q320 470 700 560 T1280 540 V720 H0Z" fill="#7cb342"/>'
  + '<path d="M0 640 Q400 580 800 650 T1280 630 V720 H0Z" fill="#558b2f"/><path d="M520 720 Q600 640 700 600 T900 540" stroke="#e8d7a8" stroke-width="40" fill="none" opacity=".85"/>'
  + [[160, 470], [230, 450], [1040, 440], [1120, 455], [1190, 440]].map(([x, y]) => `<rect x="${x - 7}" y="${y - 10}" width="14" height="50" fill="#6d4c41"/><circle cx="${x}" cy="${y - 34}" r="40" fill="#2e7d32"/><circle cx="${x - 18}" cy="${y - 20}" r="26" fill="#388e3c"/>`).join(''));
// A vine on a pergola with grapes high up (the fox and the grapes).
const VINE = svgURL(520, 440, '<rect x="30" y="40" width="16" height="400" fill="#6d4c41"/><rect x="474" y="40" width="16" height="400" fill="#6d4c41"/><rect x="20" y="30" width="480" height="18" rx="6" fill="#8d6e63"/>'
  + '<path d="M40 60 C120 20 200 90 280 50 S420 30 480 70" stroke="#5d4037" stroke-width="7" fill="none"/>'
  + [[70, 50], [150, 64], [230, 48], [320, 60], [410, 52], [460, 70]].map(([x, y]) => `<path d="M${x} ${y} c-30 -10 -40 20 -20 34 c-10 20 20 30 30 14 c20 10 34 -14 20 -30 c10 -20 -14 -30 -30 -18z" fill="#689f38"/>`).join('')
  + [[190, 90], [360, 92]].map(([x, y]) => [[0, 0], [20, 0], [40, 0], [10, 18], [30, 18], [20, 36]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="11" fill="#6a1b9a"/>`).join('')).join(''));

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Spelling, accents: a squared exercise book with a red margin, blue pen and the teacher's red pen.
  edu_lang_accent: { name: 'La tilde sin miedo', cat: 'edu', summary: 'Cuaderno cuadriculado y boli rojo: sílabas que suenan al iluminarse, tabla, árbol de decisión, tachones animados, pósits y concurso', make: () => {
    const RED = '#d62828', BLUE = '#1d3f8f', INK = '#24324a', SOFT = '#5b6b85', H = pairStacks('friendly').heading, HAND = FF.caveat;
    const book = () => [paperImg(GRID, 'Hoja cuadriculada'), shape('rect', 84, 0, 3, 720, '#e88a8a'),
      ...Array.from({ length: 7 }, (_, i) => shape('ellipse', 26, 52 + i * 100, 26, 26, '#e7e3d8', { stroke: '#cfc9b9', strokeWidth: 2 }))];
    const syl = (s, x, y, w, tonic, color) => [shape('rounded', x, y, w, 86, '#ffffff', { stroke: '#b8c7dc', strokeWidth: 2, html: s, fontSize: 40, color: INK, fontFamily: H }),
      ...(tonic ? [on(shape('rounded', x, y, w, 86, color, { html: `<b>${s}</b>`, fontSize: 40, color: '#ffffff', fontFamily: H }), 'zoom-in', { sound: 'pop', duration: 350 })] : [])];
    const postit = (head, ex, x, y, c, rot) => on(shape('rect', x, y, 240, 240, c, { rotation: rot, shadow: { x: 4, y: 8, blur: 14, color: '#0000002a' },
      html: `<div style="font-family:${HAND};font-size:50px;line-height:1;color:${BLUE}">${head}</div><div style="margin-top:14px">${ex}</div>`, fontSize: 23, color: INK, textAlign: 'left', vAlign: 'top' }), 'zoom-in', { sound: 'pop', duration: 350 });
    return numbered(build({ name: 'La tilde sin miedo', palette: 'office', fonts: 'friendly', title: { color: BLUE, size: 46 }, body: { color: INK } }, [
      { layout: 'blank', back: book(), transition: 'fade', extra: [
        kicker('LENGUA · ORTOGRAFÍA · 1.º ESO', 130, 80, 700, RED, { fontFamily: H }),
        text('La tilde sin miedo', 124, 118, 1000, 150, { fontFamily: HAND, fontSize: 124, color: BLUE, fontWeight: 700 }),
        text('Agudas, llanas, esdrújulas… y las trampas de siempre', 130, 278, 760, 50, { fontSize: 30, color: INK }),
        text(`can<span style="color:${RED}">ción</span>`, 130, 380, 700, 190, { fontFamily: H, fontSize: 150, fontWeight: 700, color: INK }),
        after(loop(598, 482, 78, 92, RED, 6), 'draw', { duration: 1200, delay: 400 }),
        shape('rect', 860, 380, 300, 230, '#ffe66d', { rotation: 4, shadow: { x: 4, y: 10, blur: 16, color: '#0000002e' },
          html: 'Regla de oro: primero busca la sílaba que suena más fuerte.', fontFamily: HAND, fontSize: 38, color: BLUE, textAlign: 'left' })],
        notes: 'Portada en un cuaderno cuadriculado. Al llegar, el boli rojo rodea solo la sílaba tónica de «canción» (efecto Dibujar sobre un trazo a mano). Pregunta: ¿por qué lleva tilde «canción» y no «examen»?' },
      { title: 'Primero, la sílaba tónica', layout: 'titleOnly', back: book(), extra: [
        ...[[['ca', 'mión'], 1, 'Aguda', 'suena fuerte la última'], [['ár', 'bol'], 0, 'Llana', 'suena fuerte la penúltima'], [['mú', 'si', 'ca'], 0, 'Esdrújula', 'suena fuerte la antepenúltima']].map(([ss, t, kind, d], r) => [
          ...ss.map((s, i) => syl(s, 140 + i * 170, 190 + r * 130, 150, i === t, [RED, '#2a9d8f', '#e76f51'][r])).flat(),
          after(text(`<b style="color:${[RED, '#2a9d8f', '#e76f51'][r]}">${kind}</b>: ${d}`, 680, 188 + r * 130, 500, 90, { fontSize: 30, color: INK, vAlign: 'middle' }), 'fade-left')]).flat(),
        text('Truco: llama a la palabra desde lejos, «¡ca-MIÓÓÓN!», y la tónica se alarga sola.', 140, 590, 1040, 60, { fontFamily: HAND, fontSize: 36, color: RED })],
        notes: 'Cada clic enciende la sílaba tónica de una palabra (con un «pop») y aparece su nombre. Que lo digan en voz alta: el truco de llamar desde lejos funciona muy bien en 1.º.' },
      { title: 'Cuándo se escribe la tilde', layout: 'titleOnly', back: book(), transition: 'slide', extra: [
        tableBlock({ x: 120, y: 180, w: 1060, h: 360, fontSize: 24, header: true, headBg: BLUE, headFg: '#ffffff', stroke: '#b8c7dc', banded: true, band: '#1d3f8f',
          rows: [['Palabra', 'Sílaba tónica', 'Lleva tilde…', 'Ejemplos'], ['<b>Aguda</b>', 'Última', 'si acaba en vocal, -n o -s', 'sofá, camión, compás'],
            ['<b>Llana</b>', 'Penúltima', 'si <b>no</b> acaba en vocal, -n o -s', 'árbol, lápiz, fácil'], ['<b>Esdrújula</b>', 'Antepenúltima', 'siempre', 'música, pájaro'],
            ['<b>Sobresdrújula</b>', 'Antes de la antepenúltima', 'siempre', 'dígaselo, cómpratelo']], colW: [2.2, 2.6, 3.4, 3] }),
        on(text('¡Las llanas hacen justo lo contrario que las agudas!', 120, 572, 900, 60, { fontFamily: HAND, fontSize: 40, color: RED, rotation: -1 }), 'fade-up', { sound: 'chime' })],
        notes: 'La tabla resume las reglas generales. Al hacer clic aparece la frase clave en boli rojo: lo que en las agudas lleva tilde, en las llanas no, y al revés.' },
      { title: 'El camino para decidir', layout: 'titleOnly', back: book(), extra: [
        dg('hierarchy', '¿Dónde está la sílaba tónica?\n  En la última: AGUDA\n    Tilde si acaba en n, s o vocal\n  En la penúltima: LLANA\n    Tilde si no acaba en n, s o vocal\n  Antes: ESDRÚJULA\n    Siempre con tilde', 120, 180, 1060, 470,
          { oneByOne: true, colors: 'colorful', fontScale: 1.1 })],
        notes: 'Árbol de decisión que aparece nivel a nivel al presentar (Diagrama ▸ Uno a uno al presentar). Proyecta una palabra cualquiera y recorre el árbol con la clase.' },
      { title: 'Corrige el dictado', layout: 'titleOnly', back: book(), transition: 'push', extra: [
        ...[['exámen', 'examen', 'Llana acabada en -n: sin tilde.'], ['jardin', 'jardín', 'Aguda acabada en -n: con tilde.'], ['jóven', 'joven', 'Llana acabada en -n: sin tilde.'], ['dificil', 'difícil', 'Llana acabada en -l: con tilde.']].map(([bad, good, why], i) => {
          const x = 130 + (i % 2) * 530, y = 185 + Math.floor(i / 2) * 230;
          return [shape('rounded', x, y, 490, 200, '#ffffff', { stroke: '#b8c7dc', strokeWidth: 2 }),
            on(text(bad, x + 28, y + 18, 200, 90, { fontFamily: HAND, fontSize: 66, color: BLUE }), 'strike', { duration: 500 }),
            after(text(good, x + 250, y + 18, 210, 90, { fontFamily: HAND, fontSize: 66, color: RED, fontWeight: 700 }), 'fade-down', { sound: 'pop', duration: 400 }),
            along(text(why, x + 28, y + 122, 440, 56, { fontSize: 22, color: SOFT }), 'fade-in')]; }).flat()],
        notes: 'Errores reales de dictado: dos tildes que sobran y dos que faltan. Cada clic tacha la palabra con el boli rojo y escribe la buena al lado. Pide la razón antes de enseñarla.' },
      { title: 'Tildes diacríticas', layout: 'titleOnly', back: book(), extra: [
        text('Misma forma, distinto significado: la tilde los distingue.', 130, 160, 1040, 50, { fontSize: 28, color: SOFT }),
        postit('él / el', '<b>Él</b> canta.<br><b>El</b> coro canta.', 140, 250, '#ffe66d', -3),
        postit('tú / tu', '<b>Tú</b> lees.<br><b>Tu</b> libro.', 405, 262, '#ffb3c6', 2),
        postit('sí / si', 'Dijo que <b>sí</b>.<br><b>Si</b> llueve, me quedo.', 670, 248, '#b8f2c9', -2),
        postit('más / mas', 'Quiero <b>más</b>.<br>Lo intenté, <b>mas</b> no pude.', 935, 260, '#bde0fe', 3),
        after(text('Más parejas: mí / mi · té / te · dé / de · sé / se', 140, 560, 1000, 60, { fontFamily: HAND, fontSize: 40, color: RED, rotation: -1 }), 'fade-up')],
        notes: 'Cuatro pares de diacríticas en pósits que aparecen con un clic cada uno. Otros pares: mí/mi, té/te, dé/de, sé/se. Recuerda que «solo» y los demostrativos, por norma general, ya no la llevan.' },
      { title: 'Los errores que más se repiten', layout: 'titleOnly', back: book(), transition: 'slide', extra: [
        chartBlock({ x: 110, y: 175, w: 700, h: 470, chartType: 'hbar', color: RED, dataLabels: true, labelWidth: 42, xTitle: '% de los fallos',
          data: [['Agudas sin tilde', 34], ['Llanas en -n o -s con tilde', 22], ['Diacríticas', 18], ['Hiatos (día, país)', 14], ['Mayúsculas sin tilde', 12]].map(([label, value]) => ({ label, value })) }),
        on(text(`<div style="font-family:${HAND};font-size:96px;line-height:1;color:${RED}">34 %</div><div>de los fallos: agudas que se quedan sin tilde.</div>`, 850, 230, 320, 220, { fontSize: 26, color: INK }), 'fade-left'),
        text('Dictado de 1.º de ESO, 1.200 palabras corregidas (datos inventados para el ejemplo).', 850, 500, 320, 110, { fontSize: 18, color: SOFT, fontStyle: 'italic' })],
        notes: 'Gráfico de barras horizontales con los fallos de un dictado (cifras inventadas). Los hiatos (día, país, búho) merecen una sesión propia.' },
      { layout: 'blank', back: book(), extra: [quiz('¿Cuál de estas palabras está bien escrita?', ['exámen', 'árbol', 'jóven', 'cancion'], 1, { x: 120, w: 1100 })],
        notes: 'Concurso desde el móvil: puntúa más quien acierta antes. «Árbol» es llana acabada en -l: lleva tilde.' },
      { layout: 'blank', back: book(), extra: [pollBlock({ kind: 'match', fontSize: 34, question: 'Une cada palabra con su tipo', x: 120, y: 50, w: 1100, h: 620,
        options: ['camión = Aguda', 'lápiz = Llana', 'pájaro = Esdrújula', 'dígamelo = Sobresdrújula'] })],
        notes: 'Actividad de unir parejas desde el móvil: se corrige sola. Después, pide una palabra nueva de cada tipo.' },
      { layout: 'blank', back: book(), transition: 'zoom', extra: [
        text('Dictado relámpago', 124, 110, 700, 120, { fontFamily: HAND, fontSize: 100, color: BLUE, fontWeight: 700 }),
        text(ul('Diez palabras, una cada veinte segundos', 'Rodea la sílaba tónica antes de escribir', 'Al acabar, cambia el cuaderno con tu compañero'), 130, 260, 640, 260, { fontSize: 28, color: INK, lineHeight: 1.6 }),
        text('¡Boli rojo preparado!', 130, 560, 600, 60, { fontFamily: HAND, fontSize: 44, color: RED, rotation: -2 }),
        timer(180, 840, 190, 340, { style: 'ring', color: RED, auto: false })],
        notes: 'Cuenta atrás de tres minutos para un dictado rápido (empieza con un clic y suena al acabar). Corregid en parejas con la tabla de reglas.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Text commentary: a white page marked with three highlighters and notes in the margin (Machado).
  edu_lang_commentary: { name: 'Cómo comentar un texto', cat: 'edu', summary: 'Página con fluorescentes que se trazan solos y notas al margen, galones uno a uno, cronología, ecuación, cuenta atrás, rúbrica y radar', make: () => {
    const PAGE = '#fbfaf7', INK = '#1a1a1a', GREY = '#6b6b6b', YEL = '#ffe94d', PINK = '#ff8fc7', GRN = '#8ee69a', RED = '#c1121f', HAND = FF.caveat, H = pairStacks('editorial').heading;
    const VERSES = ['Caminante, son tus huellas', 'el camino y nada más;', 'caminante, no hay camino,', 'se hace camino al andar.'];
    const rule = () => [shape('rect', 860, 60, 2, 600, '#e4e0d8')];
    const note = (str, x, y, w, h = 80) => text(str, x, y, w, h, { fontFamily: HAND, fontSize: 32, color: RED, lineHeight: 1.05 });
    return numbered(build({ name: 'Cómo comentar un texto', palette: 'grayscale', fonts: 'editorial', title: { color: INK, size: 46 }, body: { color: INK },
      decor: () => [text('TALLER DE COMENTARIO', 100, 676, 400, 24, { fontSize: 13, letterSpacing: 4, color: '#9a9a9a' })] }, [
      { layout: 'blank', bg: PAGE, transition: 'fade', back: [after(ink([[100, 352], [300, 348], [490, 354]], YEL, 44, { opacity: 85 }), 'draw', { duration: 900, delay: 300 })], extra: [
        kicker('LENGUA Y LITERATURA · 4.º ESO', 104, 110, 700, GREY),
        text('Cómo comentar<br>un texto', 100, 160, 760, 260, { fontFamily: H, fontSize: 84, fontWeight: 700, color: INK, lineHeight: 1.12 }),
        text('Del primer vistazo a la valoración crítica, paso a paso', 104, 450, 640, 90, { fontSize: 30, color: GREY }),
        img(RULED(320, 420), 880, 130, 320, 420, 'Hoja de examen subrayada', { rotation: 4, shadow: { x: 8, y: 14, blur: 26, color: '#00000022' } }),
        icon('pencil', 1090, 500, 100, INK),
        after(note('¡sin miedo a la hoja en blanco!', 600, 600, 440, 60), 'fade-in')],
        notes: 'Portada sobria, como una página: el fluorescente amarillo subraya «un texto» solo al llegar. Pregunta qué es lo que más les cuesta de un comentario.' },
      ...(() => { // (each highlight, then its note: made in that order, so they play in that order)
        const pairs = [[0, YEL, 'Idea: la vida es un camino', 170, 80], [2, PINK, 'Paradoja: no hay camino previo… ¡y sí lo hay!', 300, 110], [3, GRN, 'Tema: cada uno construye su vida al vivirla', 450, 110]]
          .map(([i, c, str, y, h]) => [on(shape('rect', 96, 186 + i * 70, VERSES[i].length * 21.5, 40, c, { opacity: 80 }), 'fade-right', { duration: 500 }), after(note(str, 900, y, 300, h), 'fade-left')]);
        return [{ layout: 'blank', bg: PAGE, back: [...rule(), ...pairs.map(p => p[0])], extra: [...pairs.map(p => p[1]),
        kicker('EL TEXTO', 100, 80, 400, GREY),
        text(VERSES.join('<br>'), 100, 160, 720, 300, { fontFamily: H, fontSize: 40, fontStyle: 'italic', color: INK, lineHeight: 1.75 }),
        text('Antonio Machado, «Proverbios y cantares», XXIX<br><i>Campos de Castilla</i> (1912)', 100, 470, 720, 80, { fontSize: 22, color: GREY }),
        ],
        notes: 'Primera lectura con tres colores: cada clic pasa el fluorescente por un verso y escribe la nota en el margen. El poema es de dominio público.' }]; })(),
      { title: 'Cinco pasos, siempre en orden', layout: 'titleOnly', bg: PAGE, transition: 'slide', extra: [
        dg('chevrons', 'Localizar\n  Autor, obra, época\nTema\n  La idea, en una frase\nEstructura\n  Partes y cómo se unen\nForma\n  Recursos con su efecto\nValoración\n  Opinión con argumentos', 100, 200, 1080, 320, { oneByOne: true, colors: 'accent', fontScale: 1.4 }),
        text('Un comentario no es un resumen: explica <b>cómo</b> dice el texto lo que dice.', 100, 560, 1080, 50, { fontSize: 28, color: GREY, textAlign: 'center' })],
        notes: 'Los cinco pasos en galones que aparecen uno a uno. Insiste en la frase de abajo: la diferencia entre resumir e interpretar.' },
      { title: 'Localizar: quién, cuándo, dónde', layout: 'titleOnly', bg: PAGE, extra: [
        dg('timeline', '1875\n  Nace en Sevilla\n1903\n  Publica «Soledades»\n1912\n  «Campos de Castilla»\n1939\n  Muere en Colliure', 100, 170, 1080, 280, { oneByOne: true, colors: 'accent' }),
        ...[['Autor', 'Antonio Machado'], ['Movimiento', 'Generación del 98, con raíz modernista'], ['Género', 'Lírica: poema breve, sentencioso']].map(([h, d], i) =>
          after(card(`<div style="font-size:18px;letter-spacing:3px;color:${GREY}">${h.toUpperCase()}</div><div style="font-family:${H};font-size:25px;font-weight:700">${d}</div>`, 100 + i * 365, 480, 345, 140, '#ffffff', { fontSize: 22, color: INK, borderColor: '#d9d6cf', radius: 6 }), 'fade-up'))],
        notes: 'Cronología del autor uno a uno y, al final, la ficha de localización. En el examen basta con dos o tres líneas: no es una biografía.' },
      { title: 'El tema, en una frase', layout: 'titleOnly', bg: PAGE, extra: [
        mathBlock({ x: 100, y: 170, w: 1080, h: 100, fontSize: 42, color: INK, latex: '\\text{Tema} = \\text{sustantivo abstracto} + \\text{matiz}' }),
        card(`<b style="color:#2b8a3e">✓</b> La vida como un camino que cada uno construye al vivir.`, 100, 300, 1080, 90, '#eaf8ec', { fontSize: 30, color: INK, fontFamily: H, radius: 8, vAlign: 'middle' }),
        on(text('El poema habla de un caminante.', 100, 430, 520, 50, { fontSize: 28, color: INK }), 'strike'),
        after(note('Eso es un resumen', 640, 424, 400, 60), 'fade-in'),
        on(text('Machado dice que no hay caminos.', 100, 520, 520, 50, { fontSize: 28, color: INK }), 'strike'),
        after(note('Demasiado literal', 640, 514, 400, 60), 'fade-in')],
        notes: 'La «receta» del tema: un sustantivo abstracto (la vida, el amor, el paso del tiempo) y un matiz. Los dos ejemplos de abajo se tachan con un clic: son los errores más comunes.' },
      { title: 'La estructura', layout: 'titleOnly', bg: PAGE, transition: 'fade', extra: [
        text(VERSES.join('<br>'), 100, 190, 560, 280, { fontFamily: H, fontSize: 32, fontStyle: 'italic', color: INK, lineHeight: 2 }),
        on(shape('rightbrace', 640, 196, 40, 118, 'none', { stroke: RED, strokeWidth: 3 }), 'fade-in'),
        along(text('<b>Parte 1 · vv. 1-2</b><br>Afirmación: el camino son tus propias huellas.', 700, 200, 480, 110, { fontSize: 25, color: INK }), 'fade-left'),
        on(shape('rightbrace', 640, 324, 40, 118, 'none', { stroke: RED, strokeWidth: 3 }), 'fade-in'),
        along(text('<b>Parte 2 · vv. 3-4</b><br>Conclusión: no hay camino hecho; se hace andando.', 700, 328, 480, 110, { fontSize: 25, color: INK }), 'fade-left'),
        on(text('Las dos partes empiezan igual («caminante»): estructura paralela, reforzada por la repetición.', 100, 530, 1080, 80, { fontSize: 26, color: GREY }), 'fade-up')],
        notes: 'Cada llave roja marca una parte con un clic. Haz notar el vocativo repetido: ayuda a ver la estructura y a la vez es un recurso de la forma.' },
      { title: 'Tu turno: lee y subraya', layout: 'titleOnly', bg: PAGE, extra: [
        ...[[YEL, 'Amarillo', 'ideas principales'], [PINK, 'Rosa', 'recursos literarios'], [GRN, 'Verde', 'palabras clave del tema']].map(([c, n, d], i) => [
          shape('rect', 100, 210 + i * 110, 120, 54, c, { opacity: 85, rotation: -2 }),
          text(`<b>${n}</b> · ${d}`, 250, 210 + i * 110, 480, 54, { fontSize: 28, color: INK, vAlign: 'middle' })]).flat(),
        text('Dos lecturas: la primera sin bolígrafo; la segunda, con los tres colores.', 100, 560, 640, 80, { fontSize: 24, color: GREY }),
        timer(300, 820, 180, 340, { style: 'ring', color: INK, auto: false })],
        notes: 'Cuenta atrás de cinco minutos (empieza con un clic). Reparte un texto nuevo y deja que apliquen el código de colores antes de escribir.' },
      { title: 'Cómo se puntúa', layout: 'titleOnly', bg: PAGE, transition: 'slide', extra: [
        tableBlock({ x: 100, y: 180, w: 560, h: 420, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d9d6cf',
          rows: [['Criterio', 'Máx.', 'Lucía'], ['Localización', '1', '1'], ['Tema', '2', '1,5'], ['Estructura', '2', '1,5'], ['Análisis de la forma', '3', '2'], ['Valoración crítica', '2', '1,5'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [3.4, 1.2, 1.2] }),
        chartBlock({ x: 700, y: 170, w: 480, h: 440, chartType: 'radar', color: RED, seriesName: 'Lucía', yMax: 100,
          data: [['Localización', 100], ['Tema', 75], ['Estructura', 75], ['Forma', 67], ['Valoración', 75]].map(([label, value]) => ({ label, value })),
          series: [{ name: 'Media de la clase', values: [85, 60, 55, 45, 50], color: '#9a9a9a' }] })],
        notes: 'Rúbrica con totales automáticos (=SUMA(ARRIBA)): cambia una nota y se recalcula. El radar compara a una alumna inventada con la media de la clase, en porcentaje de cada criterio.' },
      { layout: 'blank', bg: PAGE, extra: [pollBlock({ kind: 'word', fontSize: 36, question: 'Una palabra que resuma el poema de Machado', options: [], x: 80, y: 60, w: 1120, h: 600 })],
        notes: 'Nube de palabras en directo: las más repetidas crecen. Sirve para pasar del tema intuitivo al tema bien formulado.' },
      { title: 'Tres errores que restan', layout: 'titleOnly', bg: PAGE, transition: 'zoom', extra: [
        ...[['Resumir en vez de interpretar', 'Cuenta qué significa, no qué pasa.'], ['Nombrar recursos sin su efecto', '«Hay una anáfora» no basta: ¿para qué sirve?'], ['Opinar sin argumentos', 'Cambia «me gusta» por «es eficaz porque…».']].map(([h, d], i) => [
          on(badge(i + 1, 100, 200 + i * 140, 70, RED), 'zoom-in', { sound: 'pop' }),
          along(text(`<b style="font-family:${H};font-size:30px;color:${INK}">${h}</b><br>${d}`, 200, 196 + i * 140, 900, 110, { fontSize: 24, color: GREY }), 'fade-left')]).flat()],
        notes: 'Cierre con los tres fallos que más puntos quitan. Pide que revisen su último comentario buscando estos tres errores.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Literary genres: a library at night, books that rise onto the shelf, index cards stamped with their genre.
  edu_lang_genres: { name: 'Los géneros literarios', cat: 'edu', summary: 'Biblioteca de noche: libros que suben a la estantería, fichas selladas con sonido, Venn, jerarquía, dona, votación, unir y butaca 3D', make: () => {
    const BG = '#1d120d', WOOD = '#6b4529', CREAM = '#f6e7d2', DIM = '#c4a98a', LYR = '#c0395b', NAR = '#2a8a9a', DRA = '#e0a526', H = pairStacks('modern').heading, CARD = '#f3e6cc', BROWN = '#3b2a1a';
    const lamp = () => [glow(-260, -320, 900, '#7a4a1f', BG, 55), shape('rect', 0, 700, 1280, 20, WOOD)];
    // Books on a shelf: [width, height, colour]; the three genres are the tall ones with a label.
    const SHELF = [[40, 220, '#5b3f8c'], [64, 330, LYR, 'LÍRICA'], [34, 250, '#8a5a3a'], [48, 280, '#3f6b4f'], [64, 350, NAR, 'NARRATIVA'], [36, 230, '#a33b2b'],
      [52, 300, '#2f4f7f'], [64, 320, DRA, 'DRAMA'], [40, 260, '#6b8e23'], [32, 210, '#b5651d'], [54, 290, '#4b3a6b']];
    const shelf = () => { let x = 650; const out = [shape('rect', 630, 604, 610, 22, WOOD, { fill2: '#3b2418', gradAngle: 90 })];
      SHELF.forEach(([w, h, c, label], i) => {
        const bk = shape('rect', x, 604 - h, w, h, c, { fill2: '#00000000', gradAngle: 0, stroke: '#00000055', strokeWidth: 1 });
        out.push(after(bk, 'fade-up', { duration: 220, ...(i === SHELF.length - 1 && { sound: 'chime' }) }));
        out.push(shape('rect', x + 4, 604 - h + 24, w - 8, 6, '#e8c26a', { opacity: 70 }), shape('rect', x + 4, 604 - 40, w - 8, 6, '#e8c26a', { opacity: 70 }));
        if (label) out.push(along(text(`<b>${label}</b>`, x + w / 2 - h / 2 + 30, 604 - h / 2 - 22, h - 60, 44, { fontFamily: H, fontSize: 24, letterSpacing: 4, color: '#ffffff', textAlign: 'center', rotation: -90 }), 'fade-up', { duration: 220 }));
        x += w + 4; });
      return out; };
    const fragment = (q, who, stamp, c, x) => [
      shape('rect', x, 190, 340, 420, CARD, { shadow: { x: 6, y: 10, blur: 18, color: '#00000066' } }), shape('rect', x, 228, 340, 3, '#c0395b', { opacity: 60 }),
      text(`<i>${q}</i>`, x + 24, 246, 292, 190, { fontFamily: FF.lora, fontSize: 25, color: BROWN, lineHeight: 1.4 }),
      text(who, x + 24, 540, 292, 56, { fontSize: 17, color: '#7a6248' }),
      on(text(stamp, x + 70, 452, 240, 64, { fontFamily: H, fontSize: 26, fontWeight: 800, letterSpacing: 4, color: c, textAlign: 'center', vAlign: 'middle', borderColor: c, radius: 8, rotation: -12, pad: [4, 8, 4, 8] }), 'zoom-in', { sound: 'pop', duration: 300 })];
    return numbered(build({ name: 'Los géneros literarios', palette: 'warm', fonts: 'modern', title: { color: CREAM, size: 48 }, body: { color: CREAM } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: lamp(), extra: [
        kicker('LITERATURA · 3.º ESO', 100, 140, 500, DRA, { fontFamily: H }),
        text('Los géneros<br>literarios', 96, 180, 540, 240, { fontFamily: H, fontSize: 80, fontWeight: 800, color: CREAM, lineHeight: 1.05 }),
        text('Lírica, narrativa y drama: tres maneras de contar el mundo', 100, 430, 500, 90, { fontSize: 28, color: DIM }),
        text(`<span style="color:${LYR}">●</span> Lírica &nbsp; <span style="color:${NAR}">●</span> Narrativa &nbsp; <span style="color:${DRA}">●</span> Drama`, 100, 560, 520, 40, { fontSize: 22, color: CREAM }),
        ...shelf()],
        notes: 'Portada: al llegar, los libros suben uno a uno a la estantería y suena una campanilla con el último. Los tres libros altos, con nombre, son los tres géneros.' },
      { title: 'Tres maneras de contar el mundo', layout: 'titleOnly', bg: BG, back: lamp(), transition: 'slide', extra: [
        ...[['heart', 'Lírica', LYR, ['Expresa sentimientos', 'Habla un «yo» poético', 'Suele ir en verso']], ['book-open', 'Narrativa', NAR, ['Cuenta unos hechos', 'Habla un narrador', 'Suele ir en prosa']],
          ['users', 'Drama', DRA, ['Representa un conflicto', 'Hablan los personajes', 'Se escribe para la escena']]].map(([ic, n, c, items], i) => {
          const x = 100 + i * 365;
          return [on(shape('rounded', x, 190, 345, 440, '#2b1b14', { stroke: c, strokeWidth: 2 }), 'fade-up', { sound: 'whoosh' }),
            along(shape('rect', x, 190, 345, 14, c), 'fade-up'), along(icon(ic, x + 30, 228, 60, c), 'fade-up'),
            along(text(`<b>${n}</b>`, x + 104, 228, 220, 60, { fontFamily: H, fontSize: 36, color: CREAM, vAlign: 'middle' }), 'fade-up'),
            along(text(ul(...items), x + 22, 320, 305, 280, { fontSize: 26, color: CREAM, lineHeight: 1.5 }), 'fade-up')]; }).flat()],
        notes: 'Cada género entra con un clic: qué hace, quién habla y en qué forma suele escribirse. Recuerda que «suele»: hay novelas en verso y poemas en prosa.' },
      { title: '¿De qué género es?', layout: 'titleOnly', bg: BG, back: lamp(), extra: [
        ...fragment('Volverán las oscuras golondrinas en tu balcón sus nidos a colgar…', 'Gustavo Adolfo Bécquer, Rima LIII', 'LÍRICA', LYR, 100),
        ...fragment('En un lugar de la Mancha, de cuyo nombre no quiero acordarme…', 'Miguel de Cervantes, Don Quijote', 'NARRATIVA', NAR, 470),
        ...fragment('SEGISMUNDO: ¿Qué es la vida? Un frenesí. ¿Qué es la vida? Una ilusión…', 'Calderón de la Barca, La vida es sueño', 'DRAMA', DRA, 840)],
        notes: 'Tres fichas de biblioteca: lee cada fragmento, deja que voten a mano alzada y pon el sello con un clic. El de Calderón está en verso, pero es teatro: lo decide quién habla y para qué.' },
      { title: 'Las fronteras se cruzan', layout: 'titleOnly', bg: BG, back: lamp(), transition: 'fade', extra: [
        dg('venn', 'Lírica\nNarrativa\nDrama', 100, 170, 560, 470, { colors: 'colorful', fontScale: 1.4 }),
        ...[['Romance', 'un poema que cuenta una historia', LYR, NAR], ['Teatro en verso', 'del Siglo de Oro: drama con música de poema', DRA, LYR], ['Novela dialogada', 'casi todo son diálogos, como una obra', NAR, DRA]].map(([h, d, c1, c2], i) =>
          on(text(`<b style="font-size:30px"><span style="color:${c1}">●</span><span style="color:${c2}">●</span> ${h}</b><br>${d}`, 710, 200 + i * 145, 470, 120, { fontSize: 24, color: CREAM }), 'fade-left'))],
        notes: 'Diagrama de Venn: las obras pueden mezclar géneros. Cada ejemplo aparece con un clic con los colores de los dos géneros que mezcla.' },
      { title: 'Cada género, su familia', layout: 'titleOnly', bg: BG, back: lamp(), extra: [
        dg('hierarchy', 'Géneros literarios\n  Lírica\n    Oda, elegía, soneto\n  Narrativa\n    Novela, cuento, fábula\n  Drama\n    Tragedia, comedia, drama', 100, 175, 1080, 470, { oneByOne: true, colors: 'colorful', fontScale: 1.1 })],
        notes: 'Los subgéneros más habituales, uno a uno al presentar. Pide un título que conozcan de cada subgénero.' },
      { title: '¿Qué se lleva prestado?', layout: 'titleOnly', bg: BG, back: lamp(), transition: 'slide', extra: [
        chartBlock({ x: 100, y: 170, w: 640, h: 480, chartType: 'doughnut', color: NAR,
          data: [['Novela', 46, NAR], ['Cómic y novela gráfica', 21, '#8e6cc9'], ['Divulgación', 18, '#6a994e'], ['Poesía', 9, LYR], ['Teatro', 6, DRA]].map(([label, value, color]) => ({ label, value, color })) }),
        on(text(`<div style="font-family:${H};font-size:110px;font-weight:800;line-height:1;color:${DRA}">6 %</div><div>de los préstamos son teatro. ¿Por qué se lee tan poco, si se escribe para verse?</div>`, 790, 230, 390, 300, { fontSize: 26, color: CREAM }), 'fade-left'),
        text('Préstamos de la biblioteca de un instituto en un curso (datos inventados).', 790, 560, 390, 70, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Dona con un color propio por género. Abre el debate: el teatro se lee poco porque está pensado para verse; propón leer una escena en voz alta por papeles.' },
      { layout: 'blank', bg: BG, back: lamp(), extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 38, question: '¿Qué género te gusta más leer?', x: 80, y: 60, w: 1120, h: 600,
        options: ['Poesía (lírica)', 'Novela y cuento', 'Teatro (drama)'] })],
        notes: 'Votación en directo con el móvil (código QR). Compara el resultado con la dona de préstamos.' },
      { layout: 'blank', bg: BG, back: lamp(), extra: [pollBlock({ kind: 'match', fontSize: 30, question: 'Une cada obra con su género', x: 80, y: 60, w: 1120, h: 600,
        options: ['Rimas, de Bécquer = Lírica', 'Lazarillo de Tormes = Narrativa', 'La vida es sueño = Drama', 'Fábulas, de Samaniego = Narrativa en verso'] })],
        notes: 'Unir parejas desde el móvil; se corrige sola. La última es una trampa interesante: las fábulas de Samaniego cuentan una historia, pero en verso.' },
      { layout: 'blank', bg: BG, back: lamp(), transition: 'zoom', extra: [
        m3d('kh-SheenChair', 700, 110, 480, 520, { autoRotate: true, spin: 12, view: 'three', motion: 'float' }),
        text('Reto del trimestre', 100, 150, 600, 80, { fontFamily: H, fontSize: 48, fontWeight: 800, color: CREAM }),
        text('Un libro de cada género antes de las vacaciones', 100, 240, 560, 90, { fontSize: 30, color: DIM }),
        ...[['Un poemario', LYR], ['Una novela o un libro de cuentos', NAR], ['Una obra de teatro', DRA]].map(([t, c], i) => [
          after(icon('circle-check', 100, 370 + i * 80, 50, c), 'zoom-in', { sound: 'pop', duration: 300 }),
          along(text(t, 170, 370 + i * 80, 480, 50, { fontSize: 28, color: CREAM, vAlign: 'middle' }), 'fade-left')]).flat()],
        notes: 'Cierre con la butaca de lectura en 3D, flotando y girando despacio. Las tres casillas se marcan solas al llegar. Propón un registro de lectura en la biblioteca de aula.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · Bécquer: a moonlit night, swallows that fly across it, curved text round the moon, a lantern in 3D.
  edu_lang_becquer: { name: 'Bécquer y las Rimas', cat: 'edu', summary: 'Noche romántica: golondrinas que cruzan la luna, texto curvo, versos que aparecen solos, farol 3D, cronología, métrica en tabla y huecos', make: () => {
    const NIGHT = '#120c2b', NIGHT2 = '#2c1f63', MOON = '#f4ecd2', VIO = '#b49cff', INK = '#efe8ff', DIM = '#a99cc9', GOLD = '#e8c26a', H = pairStacks('classic').heading;
    const sky = (moon = true) => [shape('rect', 0, 0, 1280, 720, NIGHT, { fill2: NIGHT2, gradAngle: 180 }), paperImg(STARS(1280, 720, 90), 'Cielo estrellado'),
      ...(moon ? [glow(820, -80, 520, '#8f7fd6', NIGHT, 45), shape('ellipse', 920, 30, 320, 320, MOON, { fill2: '#d9cfa8', gradType: 'radial' })] : [])];
    const bird = (x, y, s, pts, dur, props = {}) => withAnims(img(SWALLOW(), x, y, s, s * 0.64, 'Golondrina', { decorative: true }), path(pts, { duration: dur, start: 'afterPrev', ...props }));
    return numbered(build({ name: 'Bécquer y las Rimas', palette: 'violet', fonts: 'classic', title: { color: GOLD, size: 50 }, body: { color: INK } }, [
      { layout: 'blank', bg: NIGHT, transition: 'fade', transitionSpeed: 'slow', back: sky(), extra: [
        text('Volverán las oscuras golondrinas', 860, 40, 440, 230, { fontFamily: H, fontSize: 26, fontStyle: 'italic', color: '#2c1f63', curve: 60, letterSpacing: 1 }),
        bird(700, 330, 90, [[200, -140], [420, -180], [640, -260]], 4200),
        bird(640, 440, 70, [[220, -180], [440, -240], [640, -300]], 4600, { start: 'withPrev', delay: 400 }),
        bird(820, 470, 56, [[180, -120], [360, -260], [480, -420]], 4000, { start: 'withPrev', delay: 900 }),
        text('Gustavo Adolfo', 100, 240, 600, 50, { fontSize: 34, color: DIM, letterSpacing: 2 }),
        text('Bécquer', 92, 280, 640, 170, { fontFamily: H, fontSize: 150, wordart: 'gradient', wordartColor: VIO }),
        text('Rimas y leyendas · 1836–1870', 100, 470, 600, 50, { fontSize: 30, color: GOLD }),
        text('El poeta que hizo cotidiano el Romanticismo', 100, 530, 600, 50, { fontSize: 24, color: DIM, fontStyle: 'italic' })],
        notes: 'Portada nocturna: tres golondrinas cruzan la luna solas al llegar (trayectorias encadenadas) y el primer verso de la Rima LIII se curva sobre la luna (Cuadro de texto ▸ Curvar texto). El nombre es Text Art en degradado violeta.' },
      { title: 'Una vida corta', layout: 'titleOnly', bg: NIGHT, back: sky(false), extra: [
        dg('timeline', '1836\n  Nace en Sevilla\n1854\n  Se va a Madrid a ser poeta\n1868\n  Pierde el manuscrito y lo reescribe\n1870\n  Muere en Madrid, con 34 años\n1871\n  Sus amigos publican las Rimas', 100, 180, 1080, 300, { oneByOne: true, colors: 'accent', fontScale: 1.2 }),
        on(text('El manuscrito rehecho de memoria se llama <i>Libro de los gorriones</i>: casi todo lo que leemos de Bécquer se publicó después de su muerte.', 100, 520, 1080, 100, { fontSize: 28, color: INK, textAlign: 'center' }), 'fade-up')],
        notes: 'Cronología uno a uno. Subraya la anécdota del manuscrito perdido durante la revolución de 1868: Bécquer reescribió sus poemas de memoria.' },
      { layout: 'blank', bg: NIGHT, back: sky(), transition: 'fade', extra: [
        kicker('RIMA LIII', 100, 120, 400, GOLD),
        ...['Volverán las oscuras golondrinas', 'en tu balcón sus nidos a colgar,', 'y otra vez con el ala a sus cristales', 'jugando llamarán.'].map((v, i) =>
          (i ? after : on)(text(v, i === 3 ? 260 : 100, 180 + i * 80, 820, 70, { fontFamily: H, fontSize: 44, fontStyle: 'italic', color: INK }), 'fade-in', { duration: 1100 })),
        after(text('Pero aquellas que el vuelo refrenaban… esas… ¡no volverán!', 100, 540, 760, 60, { fontSize: 26, color: VIO }), 'fade-up', { delay: 400 }),
        bird(10, 260, 80, [[460, -40], [940, -180], [1240, -260]], 5000)],
        notes: 'La primera estrofa aparece verso a verso, despacio, como si se leyera en voz alta; luego una golondrina cruza la noche. Lee el poema completo antes de pasar.' },
      { title: 'Rasgos del Romanticismo', layout: 'titleOnly', bg: NIGHT, back: sky(false), transition: 'slide', extra: [
        ...[['moon', 'La noche y el misterio', 'Lunas, sombras, leyendas'], ['heart', 'El amor imposible', 'Idealizado y casi siempre perdido'], ['user', 'El «yo» en el centro', 'Los sentimientos del poeta'], ['mountain', 'La naturaleza salvaje', 'Un espejo del alma']].map(([ic, h, d], i) => [
          on(icon(ic, 100, 190 + i * 115, 56, VIO), 'zoom-in', { duration: 300 }),
          along(text(`<b style="color:${GOLD};font-size:30px">${h}</b><br>${d}`, 180, 180 + i * 115, 520, 100, { fontSize: 24, color: INK }), 'fade-left')]).flat(),
        m3d('kh-Lantern', 780, 150, 400, 500, { autoRotate: false, motion: 'float', view: 'three', edge: 'fade' })],
        notes: 'Cuatro rasgos que aparecen con un clic cada uno. El farol 3D flota en la noche (Modelo 3D ▸ Al entrar ▸ Flotar): Bécquer escribe de noche, a la luz de un farol.' },
      { title: 'La música de la Rima LIII', layout: 'titleOnly', bg: NIGHT, back: sky(false), extra: [
        tableBlock({ x: 100, y: 180, w: 1080, h: 330, fontSize: 24, header: true, headBg: '#3a2a78', headFg: GOLD, stroke: '#4a3a8a', banded: true, band: '#b49cff',
          rows: [['Verso', 'Sílabas', 'Rima'], ['<i>Volverán las oscuras golondrinas</i>', '11', '—'], ['<i>en tu balcón sus nidos a colgar,</i>', '10 + 1 = 11 (aguda)', 'a (-á)'],
            ['<i>y otra vez con el ala a sus cristales</i>', '11', '—'], ['<i>jugando llamarán.</i>', '6 + 1 = 7 (aguda)', 'a (-á)']], colW: [5, 3, 1.4] }),
        on(text(`Endecasílabos y un heptasílabo, con <b style="color:${GOLD}">rima asonante</b> en los versos pares: una música suave, casi de canción.`, 100, 540, 1080, 90, { fontSize: 28, color: INK }), 'fade-up')],
        notes: 'Cómputo silábico: los versos que acaban en aguda suman una sílaba. Los impares quedan sueltos (sin rima) y los pares riman en asonante en «á».' },
      { title: 'Un libro, una historia de amor', layout: 'titleOnly', bg: NIGHT, back: sky(false), transition: 'fade', extra: [
        dg('chevrons', 'I–XI\n  Qué es la poesía\nXII–XXIX\n  El amor ilusionado\nXXX–LI\n  El desengaño\nLII–LXXVI\n  Dolor y soledad', 100, 190, 1080, 300, { oneByOne: true, colors: 'accent', fontScale: 1.3 }),
        text('Así suelen agruparse las 76 rimas: de la esperanza a la soledad.', 100, 540, 1080, 50, { fontSize: 26, color: DIM, textAlign: 'center' })],
        notes: 'La agrupación temática clásica de las Rimas en cuatro partes (galones uno a uno). Pide que lean una rima de cada parte y digan en cuál encaja.' },
      { title: 'Las leyendas', layout: 'titleOnly', bg: NIGHT, back: sky(false), extra: [
        ...[['moon', 'El rayo de luna', 'Manrique persigue a una dama que resulta ser… un rayo de luna.'], ['eye', 'Los ojos verdes', 'Fernando se enamora de unos ojos que lo llaman desde el agua.'],
          ['mountain', 'El monte de las ánimas', 'La noche de difuntos, una banda azul olvidada en el monte.'], ['music', 'Maese Pérez el organista', 'Un órgano que vuelve a sonar solo en Nochebuena.']].map(([ic, h, d], i) => {
          const x = 100 + (i % 2) * 550, y = 180 + Math.floor(i / 2) * 235;
          return [on(shape('rounded', x, y, 530, 210, '#ffffff10', { stroke: '#b49cff66', strokeWidth: 1.5 }), 'fade-up'), along(icon(ic, x + 28, y + 30, 54, GOLD), 'fade-up'),
            along(text(`<b style="font-family:${H};font-size:30px;color:${INK}">${h}</b><br>${d}`, x + 100, y + 22, 400, 170, { fontSize: 23, color: DIM }), 'fade-up')]; }).flat()],
        notes: 'Cuatro leyendas en prosa, misteriosas y nocturnas. Cada tarjeta aparece con un clic: anímales a elegir una para leer en casa.' },
      { layout: 'blank', bg: NIGHT, back: sky(false), extra: [pollBlock({ kind: 'gaps', question: 'Completa la Rima XXI', fontSize: 40, x: 80, y: 60, w: 1120, h: 600,
        text: '¿Qué es poesía?, dices mientras clavas en mi [pupila] tu pupila [azul]. ¿Qué es [poesía]? ¿Y tú me lo preguntas? Poesía… eres [tú].' })],
        notes: 'Completar huecos desde el móvil (no distingue mayúsculas ni tildes). Es la rima más famosa: casi todos la saben aunque no sepan que la saben.' },
      { layout: 'blank', bg: NIGHT, back: sky(), transition: 'zoom', extra: [
        text('Poesía…', 100, 200, 700, 130, { fontFamily: H, fontSize: 100, fontStyle: 'italic', color: INK }),
        after(text('eres tú', 180, 330, 700, 150, { fontFamily: H, fontSize: 120, wordart: 'neon', wordartColor: VIO }), 'fade-in', { duration: 1500 }),
        text('Tarea: escribe tu propia rima de cuatro versos.', 100, 540, 700, 50, { fontSize: 28, color: GOLD }),
        bird(980, 360, 80, [[-200, -120], [-500, -160], [-1100, -300]], 5200)],
        notes: 'Cierre: «eres tú» se enciende en neón violeta y una golondrina se marcha. Propón escribir una rima con rima asonante en los pares.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · «La vida es sueño»: a red curtain that opens and closes, a playhouse plan, the throne in 3D with Transform.
  edu_lang_calderon: { name: 'La vida es sueño', cat: 'edu', summary: 'Telón que se abre y se cierra con sonido, plano del corral, trono 3D con Transformar, monólogo verso a verso, radial, balanza y concurso', make: () => {
    const STAGE = '#120b08', GOLD = '#d4a944', CREAM = '#f3e3c3', DIM = '#b59b7a', RED = '#8b1a1a', H = FF.cormorant, THRONE = uid();
    const valance = () => [shape('rect', 0, 0, 1280, 40, RED, { fill2: '#5a0e0e', gradAngle: 90 }), shape('rect', 0, 40, 1280, 6, GOLD)];
    const lights = () => Array.from({ length: 7 }, (_, i) => glow(60 + i * 180, 640, 160, '#d4a94499', STAGE, 60));
    const throne = (x, y, w, h, props) => ({ ...m3d('kh-ChairDamaskPurplegold', x, y, w, h, props), id: THRONE });
    const curtains = (open) => open
      ? [after(img(CURTAIN(), -20, 0, 660, 720, 'Telón', { decorative: true }), 'path', { pathShape: 'custom', points: [[0, 0], [-560, 0]], dx: -560, dy: 0, duration: 1800, sound: 'whoosh', delay: 300 }),
        along(img(CURTAIN(true), 640, 0, 660, 720, 'Telón', { decorative: true }), 'path', { pathShape: 'custom', points: [[0, 0], [560, 0]], dx: 560, dy: 0, duration: 1800, delay: 300 })]
      : [after(img(CURTAIN(), -580, 0, 660, 720, 'Telón', { decorative: true }), 'path', { pathShape: 'custom', points: [[0, 0], [560, 0]], dx: 560, dy: 0, duration: 1800, sound: 'applause' }),
        along(img(CURTAIN(true), 1200, 0, 660, 720, 'Telón', { decorative: true }), 'path', { pathShape: 'custom', points: [[0, 0], [-560, 0]], dx: -560, dy: 0, duration: 1800 })];
    return numbered(build({ name: 'La vida es sueño', palette: 'revela', fonts: 'websafe', title: { color: GOLD, size: 48 }, body: { color: CREAM },
      decor: () => [shape('rect', 60, 690, 1160, 1, GOLD, { opacity: 40 })] }, [
      { layout: 'blank', bg: STAGE, transition: 'fade', back: lights(), extra: [
        ...curtains(true), ...valance(),
        along(text('TEATRO DEL SIGLO DE ORO · 1635', 140, 180, 1000, 40, { fontSize: 22, letterSpacing: 8, color: CREAM, textAlign: 'center', shadow: { x: 0, y: 2, blur: 8, color: '#000000' } }), 'fade-in', { delay: 1600, duration: 900 }),
        along(text('La vida es sueño', 90, 230, 1100, 170, { fontFamily: H, fontSize: 140, fontWeight: 700, color: GOLD, textAlign: 'center', shadow: { x: 0, y: 4, blur: 14, color: '#000000' } }), 'fade-in', { delay: 1600, duration: 900 }),
        along(text('Pedro Calderón de la Barca', 140, 420, 1000, 60, { fontSize: 34, color: CREAM, textAlign: 'center', fontStyle: 'italic', shadow: { x: 0, y: 2, blur: 8, color: '#000000' } }), 'fade-in', { delay: 1600, duration: 900 })],
        notes: 'Se abre el telón solo al llegar (dos trayectorias a la vez, con sonido). Pregunta antes de empezar: ¿alguna vez has tenido un sueño tan real que dudaste al despertar?' },
      { title: 'Un corral de comedias', layout: 'titleOnly', bg: STAGE, back: valance(), transition: 'slide', extra: [
        img(CORRAL, 100, 170, 560, 480, 'Plano de un corral de comedias visto desde arriba'),
        ...[[380, 245, 'Escenario', 'El tablado, sin apenas decorado.'], [380, 425, 'Patio', 'Los «mosqueteros», de pie y ruidosos.'], [600, 425, 'Gradas', 'Bancos a los lados, para quien paga.'],
          [160, 245, 'Aposentos', 'Balcones de los nobles: ver sin ser vistos.'], [380, 590, 'Cazuela', 'La galería de las mujeres, al fondo.']].map(([x, y, h, d], i) => [
          on(badge(i + 1, x - 24, y - 24, 48, RED, '#ffffff', { borderColor: GOLD }), 'zoom-in', { sound: 'pop', duration: 300 }),
          along(text(`<span style="color:${GOLD}">${i + 1}</span> · <b>${h}</b><br><span style="color:${DIM}">${d}</span>`, 710, 176 + i * 96, 490, 90, { fontSize: 21, color: CREAM, lineHeight: 1.25 }), 'fade-left')]).flat()],
        notes: 'Plano dibujado de un corral de comedias. Cada clic marca una zona con su número y su explicación. Las funciones eran por la tarde, con luz natural.' },
      { title: 'La historia en tres jornadas', layout: 'titleOnly', bg: STAGE, back: valance(), extra: [
        dg('process', 'Jornada I\n  Segismundo vive encadenado en una torre\nJornada II\n  Despierta en palacio y actúa como una fiera\nJornada III\n  Una rebelión lo libera y elige perdonar', 100, 200, 1080, 330, { oneByOne: true, colors: 'accent', fontScale: 1.25 }),
        text('Las obras del Siglo de Oro se dividen en tres actos llamados <b>jornadas</b>.', 100, 570, 1080, 50, { fontSize: 26, color: DIM, textAlign: 'center' })],
        notes: 'El argumento en un proceso de tres pasos que aparece uno a uno. Insiste en el cambio de Segismundo: de fiera a príncipe prudente.' },
      { layout: 'blank', bg: STAGE, back: [glow(560, 40, 700, '#5a2a6b', STAGE, 55)], transition: 'fade', extra: [
        kicker('JORNADA II', 100, 160, 400, GOLD),
        text('Despierta<br>en palacio', 96, 200, 560, 230, { fontFamily: H, fontSize: 100, fontWeight: 700, color: CREAM, lineHeight: 1 }),
        text('Basilio, su padre, lo duerme con una pócima para probarlo: ¿será el tirano que anunciaban las estrellas?', 100, 450, 520, 140, { fontSize: 27, color: DIM }),
        throne(640, 90, 560, 580, { autoRotate: true, spin: 10, view: 'three', motion: 'float', edge: 'fade' })],
        notes: 'El trono 3D gira despacio y flota (Modelo 3D ▸ Al entrar ▸ Flotar). En la diapositiva siguiente viaja a la izquierda con Transformar.' },
      { layout: 'blank', bg: STAGE, autoAnimate: true, back: [glow(-200, 200, 700, '#5a2a6b', STAGE, 45)], extra: [
        throne(60, 170, 380, 440, { autoRotate: false, view: 'front', arrive: 'turn', edge: 'fade' }),
        kicker('EL MONÓLOGO · FINAL DE LA JORNADA II', 500, 110, 700, GOLD),
        ...['¿Qué es la vida? Un frenesí.', '¿Qué es la vida? Una ilusión,', 'una sombra, una ficción,', 'y el mayor bien es pequeño;', 'que toda la vida es sueño,', 'y los sueños, sueños son.'].map((v, i) =>
          (i ? after : on)(text(v, 500, 170 + i * 72, 700, 64, { fontFamily: H, fontSize: i > 3 ? 46 : 42, fontWeight: i > 3 ? 700 : 400, fontStyle: 'italic', color: i > 3 ? GOLD : CREAM }), 'fade-in', { duration: 900 }))],
        notes: 'Transformar: el trono viaja desde la diapositiva anterior y llega girando hasta quedar de frente. Luego los versos aparecen solos uno tras otro: léelos despacio.' },
      { title: 'Los personajes', layout: 'titleOnly', bg: STAGE, back: valance(), transition: 'slide', extra: [
        dg('radial', 'Segismundo\n  Basilio, su padre y rey\n  Clotaldo, su carcelero y maestro\n  Rosaura, dama agraviada\n  Astolfo, rival al trono\n  Estrella, prima y heredera', 140, 160, 1000, 510, { oneByOne: true, colors: 'accent', fontScale: 1.15 })],
        notes: 'Diagrama radial: Segismundo en el centro y los demás personajes alrededor, uno a uno. Rosaura aparece al principio vestida de hombre.' },
      { title: '¿Destino o libertad?', layout: 'titleOnly', bg: STAGE, back: valance(), extra: [
        on(img(SCALES, 100, 200, 520, 360, 'Balanza: la libertad pesa más que el destino'), 'teeter', { duration: 1200 }),
        text(`Las estrellas anunciaban un tirano. Pero Segismundo <b style="color:${GOLD}">decide</b> ser prudente: para Calderón, la libertad pesa más que el destino.`, 680, 200, 500, 210, { fontSize: 28, color: CREAM }),
        ...['Sueño y realidad', 'Libertad y destino', 'El honor'].map((t, i) => after(text(t, 680 + i * 170, 460, 156, 90, { fontSize: 21, color: STAGE, bg: GOLD, radius: 8, textAlign: 'center', vAlign: 'middle', fontWeight: 700 }), 'fade-up'))],
        notes: 'La balanza se balancea con un clic (énfasis «Balanceo») y luego aparecen los tres grandes temas. Debate: ¿nuestro carácter es destino o elección?' },
      { layout: 'blank', bg: STAGE, back: valance(), extra: [quiz('¿Por qué encierra Basilio a su hijo en una torre?', ['Un horóscopo anunciaba que sería un tirano', 'Intentó robarle la corona', 'Se enamoró de Rosaura', 'Estaba enfermo y era contagioso'], 0, { y: 100, h: 570, fontSize: 38 })],
        notes: 'Concurso con puntos desde el móvil. La respuesta: los astros predijeron que sería un príncipe cruel.' },
      { layout: 'blank', bg: STAGE, back: valance(), extra: [pollBlock({ kind: 'choice', display: 'bar', fontSize: 36, question: 'Despiertas en un palacio sin saber cómo. ¿Qué haces?', x: 80, y: 100, w: 1120, h: 560,
        options: ['Desconfío de todo', 'Lo disfruto', 'Busco la verdad', 'Pido explicaciones'] })],
        notes: 'Votación para ponerse en el lugar de Segismundo. Compara con lo que hace él en la Jornada II.' },
      { layout: 'blank', bg: STAGE, transition: 'fade', back: lights(), extra: [
        text('Gracias por venir al corral', 140, 150, 1000, 80, { fontFamily: H, fontSize: 60, color: CREAM, textAlign: 'center' }),
        ...curtains(false), ...valance(),
        after(text('FIN', 340, 300, 600, 160, { fontFamily: H, fontSize: 150, fontWeight: 700, color: GOLD, textAlign: 'center', letterSpacing: 20 }), 'zoom-in', { duration: 700 }),
        text('Modelo 3D: ' + lib3d('kh-ChairDamaskPurplegold').label + ' — ' + lib3d('kh-ChairDamaskPurplegold').credit, 140, 600, 1000, 30, { fontSize: 13, color: '#f3e3c3aa', textAlign: 'center' })],
        notes: 'Cierre: el telón se cierra solo con aplausos y aparece «FIN» sobre él. Recuerda la tarea: leer la Jornada III para la próxima clase.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · Rhetorical figures as a pop-art comic: halftone, panels with thick outlines, bursts, a watch that «flies».
  edu_lang_figures: { name: 'Figuras retóricas en cómic', cat: 'edu', summary: 'Cómic pop: viñetas, bocadillos y explosiones con sonido, reloj 3D que vuela por una trayectoria, versos que se colorean y concurso', make: () => {
    const YEL = '#ffd23f', RED = '#ee4266', CY = '#00a6ed', K = '#111111', W = '#ffffff', GRN = '#3bb273', PUR = '#7b4fd6', H = pairStacks('bold').heading;
    const pop = (s, c = RED, off = 5) => `<span style="text-shadow:${off}px ${off}px 0 ${c}">${s}</span>`;
    const panel = (x, y, w, h, fill = W, props = {}) => shape('rect', x, y, w, h, fill, { stroke: K, strokeWidth: 6, shadow: { x: 10, y: 10, blur: 0, color: K }, ...props });
    const tag = (str, x, y, w, bg, fg = W) => text(str, x, y, w, 50, { fontFamily: H, fontSize: 32, letterSpacing: 2, color: fg, bg, textAlign: 'center', vAlign: 'middle', pad: [0, 8, 0, 8], borderColor: K });
    const comicBg = (dot = '#f7a325', bg = YEL) => [paperImg(HALFTONE(dot, bg), 'Fondo de puntos de cómic')];
    const Q = ['Es hielo abrasador, es fuego helado,', 'es herida que duele y no se siente,', 'es un soñado bien, un mal presente,', 'es un breve descanso muy cansado.'];
    const qBox = (html) => text(html, 120, 200, 700, 330, { fontSize: 36, fontWeight: 700, color: K, lineHeight: 1.75 });
    return numbered(build({ name: 'Figuras retóricas en cómic', palette: 'office', fonts: 'bold', title: { color: K, size: 64 }, body: { color: K } }, [
      { layout: 'blank', bg: YEL, transition: 'zoom', back: comicBg(), extra: [
        text('LENGUA · 2.º ESO', 100, 110, 400, 40, { fontSize: 22, letterSpacing: 6, color: K, fontWeight: 700 }),
        text(pop('FIGURAS<br>RETÓRICAS', RED, 7), 92, 150, 700, 300, { fontFamily: H, fontSize: 150, color: K, lineHeight: 0.95 }),
        shape('speechround', 100, 470, 560, 160, W, { stroke: K, strokeWidth: 5, html: '¡El lenguaje también tiene superpoderes!', fontSize: 30, fontWeight: 700, color: K }),
        after(shape('burst', 790, 120, 420, 420, RED, { stroke: K, strokeWidth: 6, rotation: -8, html: `<span style="font-family:${H};font-size:84px;color:#fff">${pop('¡POW!', K, 5)}</span>` }), 'zoom-in', { sound: 'pop', duration: 400, delay: 300 })],
        notes: 'Portada de cómic pop: fondo de puntos (un dibujo SVG propio), título con sombra de color y una explosión que salta sola con sonido. Pregunta: ¿qué superpoder le darías a una palabra?' },
      { layout: 'blank', bg: '#fff6d6', back: comicBg('#ffd23f', '#fff6d6'), transition: 'slide', extra: [
        text(pop('METÁFORA O SÍMIL', YEL, 4), 100, 50, 1080, 90, { fontFamily: H, fontSize: 76, color: K }),
        panel(100, 170, 520, 380), tag('METÁFORA', 130, 150, 220, RED),
        text('«Tus ojos son dos luceros.»', 140, 250, 440, 140, { fontSize: 40, fontWeight: 700, color: K }),
        on(text('Dice que una cosa <b>es</b> otra. Sin comparar: identifica.', 140, 420, 440, 100, { fontSize: 25, color: K }), 'fade-up'),
        panel(660, 170, 520, 380), tag('SÍMIL', 690, 150, 160, CY),
        text(`«Tus ojos brillan <span style="color:${RED}">como</span> luceros.»`, 700, 250, 440, 140, { fontSize: 40, fontWeight: 700, color: K }),
        on(text('Compara con un nexo: <b>como</b>, <b>igual que</b>, <b>parece</b>…', 700, 420, 440, 100, { fontSize: 25, color: K }), 'fade-up'),
        after(shape('seal', 1060, 470, 150, 150, YEL, { stroke: K, strokeWidth: 4, rotation: 12, html: '¡COMO!', fontFamily: H, fontSize: 36, color: K }), 'zoom-in', { sound: 'pop', duration: 300 }),
        text('Truco: si puedes poner «como» y no está, es metáfora.', 100, 600, 1000, 50, { fontSize: 28, fontWeight: 700, color: K })],
        notes: 'Dos viñetas para no confundirlas nunca. Cada clic explica una; con la segunda salta la pegatina «¡COMO!». Pide que conviertan una metáfora en símil y al revés.' },
      { layout: 'blank', bg: '#d9f1ff', back: comicBg('#9fd8f5', '#d9f1ff'), extra: [
        text(pop('EL TIEMPO VUELA', YEL, 6), 100, 70, 1080, 140, { fontFamily: H, fontSize: 130, color: K, textAlign: 'center' }),
        withAnims(m3d('kh-ChronographWatch', 70, 330, 260, 260, { autoRotate: true, spin: 60, view: 'front' }), path([[280, -110], [560, -40], [860, -150]], { duration: 3200, start: 'afterPrev', sound: 'whoosh' })),
        panel(380, 470, 800, 170, W),
        text('Una metáfora de todos los días: el tiempo no tiene alas, pero pasa tan deprisa como un pájaro. ¡Hasta el reloj se echa a volar!', 410, 490, 740, 130, { fontSize: 27, color: K, vAlign: 'middle' }),
        { ...credits(['kh-ChronographWatch'], 100, 652, 1080, '#3a5a72'), h: 44 }],
        notes: 'El reloj 3D cruza la diapositiva solo, girando, por una trayectoria curva (Animaciones ▸ Trayectoria) con un silbido. Pide más expresiones hechas: «se me cae la cara de vergüenza», «estar en las nubes»…' },
      { layout: 'blank', bg: YEL, back: comicBg(), transition: 'push', extra: [
        text(pop('LA LIGA DE LAS FIGURAS', W, 4), 100, 40, 1080, 90, { fontFamily: H, fontSize: 72, color: K }),
        ...[['PERSONIFICACIÓN', '«La luna nos espía desde el tejado.»', RED], ['HIPÉRBOLE', '«Te lo he dicho un millón de veces.»', CY], ['ANÁFORA', '«Aquí te espero, aquí te sueño, aquí me quedo.»', GRN],
          ['ALITERACIÓN', '«El ruido con que rueda la ronca tempestad.»', PUR], ['ONOMATOPEYA', '«El tic, tac del reloj no me deja dormir.»', '#f7a325'], ['EPÍTETO', '«La blanca nieve cubría el campo.»', '#e85d9e']].map(([h, ex, c], i) => {
          const x = 100 + (i % 3) * 365, y = 165 + Math.floor(i / 3) * 255;
          return [on(panel(x, y, 330, 220, W), 'zoom-in', { sound: 'pop', duration: 300 }), along(tag(h, x + 16, y - 18, 298, c, c === '#f7a325' ? K : W), 'zoom-in', { duration: 300 }),
            along(text(ex, x + 22, y + 50, 286, 150, { fontSize: 26, fontWeight: 700, color: K, vAlign: 'middle' }), 'fade-in')]; }).flat()],
        notes: 'Seis figuras en seis viñetas que aparecen con un «pop» cada una. Los versos de la aliteración son de Zorrilla (dominio público). Pide un ejemplo propio de cada figura.' },
      { layout: 'blank', bg: '#ffe1ea', back: comicBg('#ffb3c6', '#ffe1ea'), transition: 'fade', extra: [
        text(pop('QUEVEDO, EL SUPERHÉROE', W, 4), 100, 40, 1080, 90, { fontFamily: H, fontSize: 72, color: K }),
        panel(100, 170, 740, 400),
        qBox(Q.join('<br>')),
        on(qBox(Q.map(v => v.replace(/^(e|E)s\b/, `<span style="color:${CY}">$1s</span>`)).join('<br>')), 'fade-in', { duration: 700 }),
        along(tag('ANÁFORA', 900, 220, 280, CY), 'fade-left'),
        along(text('«Es» al comienzo de cada verso: golpea como un tambor.', 900, 280, 280, 110, { fontSize: 24, color: K }), 'fade-left'),
        on(qBox(Q.map(v => v.replace(/^(e|E)s\b/, `<span style="color:${CY}">$1s</span>`)).join('<br>').replace('hielo abrasador', `<span style="color:${RED}">hielo abrasador</span>`).replace('fuego helado', `<span style="color:${RED}">fuego helado</span>`)
          .replace('duele y no se siente', `<span style="color:${RED}">duele y no se siente</span>`).replace('descanso muy cansado', `<span style="color:${RED}">descanso muy cansado</span>`)), 'fade-in', { duration: 700 }),
        along(tag('ANTÍTESIS', 900, 410, 280, RED), 'fade-left'),
        along(text('Ideas opuestas juntas: así de contradictorio es el amor.', 900, 470, 280, 110, { fontSize: 24, color: K }), 'fade-left'),
        text('Francisco de Quevedo (1580–1645), soneto «Es hielo abrasador…»', 100, 600, 740, 40, { fontSize: 22, fontWeight: 700, color: K })],
        notes: 'Primer clic: se colorean las repeticiones de «es» (anáfora). Segundo clic: las parejas opuestas (antítesis). El truco: una copia exacta del texto con colores aparece encima de la original.' },
      { layout: 'blank', bg: '#e6f7ec', back: comicBg('#a8e6bf', '#e6f7ec'), extra: [
        text(pop('¿CUÁL USAMOS MÁS?', YEL, 4), 100, 40, 1080, 90, { fontFamily: H, fontSize: 72, color: K }),
        panel(100, 160, 760, 490),
        chartBlock({ x: 130, y: 185, w: 700, h: 440, chartType: 'hbar', color: RED, dataLabels: true, xTitle: '% de las figuras encontradas',
          data: [['Hipérbole', 41], ['Metáfora', 23], ['Onomatopeya', 17], ['Personificación', 11], ['Símil', 8]].map(([label, value]) => ({ label, value })) }),
        on(shape('speech', 900, 180, 290, 230, W, { stroke: K, strokeWidth: 5, html: '«¡Llevo esperando mil años!» ¿Te suena?', fontSize: 28, fontWeight: 700, color: K }), 'zoom-in', { sound: 'pop' }),
        text('Figuras en 500 mensajes de un grupo de clase (datos inventados).', 900, 470, 290, 110, { fontSize: 20, color: K, fontStyle: 'italic' })],
        notes: 'Barras horizontales con un recuento inventado: las figuras no son solo de poetas, las usamos al chatear. Pide que busquen tres en sus propios mensajes (sin enseñarlos).' },
      { layout: 'blank', bg: YEL, back: comicBg(), extra: [pollBlock({ kind: 'match', fontSize: 32, question: 'Une cada ejemplo con su figura', x: 80, y: 60, w: 1120, h: 600,
        options: ['Tus dientes son perlas = Metáfora', 'Blanco como la nieve = Símil', 'Me muero de hambre = Hipérbole', 'El viento susurra = Personificación'] })],
        notes: 'Unir parejas desde el móvil, con corrección automática. Comenta después por qué «susurrar» convierte al viento en persona.' },
      { layout: 'blank', bg: YEL, back: comicBg(), extra: [quiz('«Ríe el agua de la fuente.» ¿Qué figura es?', ['Hipérbole', 'Personificación', 'Símil', 'Onomatopeya'], 1, { fontSize: 42 })],
        notes: 'Concurso con puntos por rapidez: el agua no puede reír, así que se le da una cualidad humana.' },
      { layout: 'blank', bg: '#fff6d6', back: comicBg('#ffd23f', '#fff6d6'), transition: 'zoom', extra: [
        text(pop('RETO: TU CÓMIC', RED, 6), 100, 50, 760, 120, { fontFamily: H, fontSize: 110, color: K }),
        ...[0, 1, 2].map(i => panel(100 + i * 250, 210, 220, 260, W, { sketch: true })),
        ...['Metáfora', 'Hipérbole', 'Onomatopeya'].map((t, i) => tag(t.toUpperCase(), 116 + i * 250, 192, 188, [RED, CY, GRN][i])),
        text('Tres viñetas, una figura en cada una. Ganan los bocadillos más ingeniosos.', 100, 520, 720, 100, { fontSize: 28, fontWeight: 700, color: K }),
        timer(480, 870, 230, 330, { style: 'digital', color: K, h: 150, auto: false })],
        notes: 'Cuenta atrás de ocho minutos (estilo digital) para dibujar un cómic de tres viñetas. Las viñetas están dibujadas a mano alzada (Forma ▸ Trazo a mano).' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Metre: a sound studio — a wave that draws itself, syllables that tick like a metronome, the rule as an equation, the sonnet as a mixing desk.
  edu_lang_meter: { name: 'La música del verso: métrica', cat: 'edu', summary: 'Estudio de sonido: onda que se dibuja, sílabas que suenan como un metrónomo, ecuación con casos, sinalefa, soneto por pistas y concurso', make: () => {
    const BG = '#0a0f1f', CY = '#5ee6ff', MAG = '#ff5fa2', AMB = '#ffc857', FG = '#e8f1ff', DIM = '#8a9bbd', PANEL = '#121a33', H = pairStacks('clean').heading;
    const studio = () => [glow(-300, 300, 800, '#123a5a', BG, 50), glow(900, -300, 700, '#3a1a4a', BG, 45)];
    // A row of syllable boxes that tick in one by one.
    const beats = (syls, x0, y, wDef, gap, hl = {}) => { let x = x0;
      return syls.map((s, i) => { const w = hl[i]?.w || wDef, c = hl[i]?.c || CY;
        const b = after(text(s, x, y, w, 92, { fontSize: 38, fontWeight: 700, color: c === CY ? FG : '#0a0f1f', bg: c === CY ? PANEL : c, borderColor: c, radius: 14, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }), 'zoom-in', { duration: 180, sound: 'click', ...(i === 0 && { delay: 300 }) });
        x += w + gap; return b; }); };
    return numbered(build({ name: 'La música del verso', palette: 'midnight', fonts: 'clean', title: { color: FG, size: 46 }, body: { color: FG } }, [
      { layout: 'blank', bg: BG, transition: 'fade', back: studio(), extra: [
        after(ink(wave(80, 1200, 560, 70), CY, 4, { opacity: 90 }), 'draw', { duration: 2000 }),
        kicker('MÉTRICA · 3.º ESO', 100, 120, 600, MAG),
        text('La música<br>del verso', 96, 160, 900, 250, { fontFamily: H, fontSize: 104, fontWeight: 800, color: FG, lineHeight: 1 }),
        text('Contar sílabas, unir vocales y escuchar las rimas', 100, 410, 800, 50, { fontSize: 30, color: DIM }),
        ...Array.from({ length: 8 }, (_, i) => after(shape('ellipse', 830 + i * 46, 140, 26, 26, i === 7 ? AMB : MAG), 'zoom-in', { duration: 120, delay: 180, sound: 'click' }))],
        notes: 'Portada de estudio de sonido: la onda se dibuja sola y ocho puntos laten como un metrónomo, uno por sílaba de un octosílabo. Pide que palmeen al ritmo.' },
      { title: 'Contar sílabas, con palmas', layout: 'titleOnly', bg: BG, back: studio(), extra: [
        text('«Verde que te quiero verde.»', 100, 175, 1080, 60, { fontSize: 36, fontStyle: 'italic', color: DIM, textAlign: 'center' }),
        ...beats(['Ver', 'de', 'que', 'te', 'quie', 'ro', 'ver', 'de'], 118, 270, 120, 12, { 7: { c: AMB } }),
        after(text(`= <b style="color:${AMB}">8 sílabas</b> · octosílabo`, 100, 410, 1080, 80, { fontSize: 52, color: FG, textAlign: 'center' }), 'fade-up', { sound: 'chime' }),
        text('Federico García Lorca, «Romance sonámbulo» (1928)', 100, 520, 1080, 40, { fontSize: 22, color: DIM, textAlign: 'center' }),
        text('Termina en palabra llana («ver-de»): no se suma ni se resta nada.', 100, 590, 1080, 50, { fontSize: 26, color: FG, textAlign: 'center' })],
        notes: 'Al llegar, cada sílaba entra con un clic de metrónomo; la última, en ámbar, marca el final del verso. Haced las palmas a la vez: el cuerpo cuenta mejor que los dedos.' },
      { title: 'La regla del final', layout: 'titleOnly', bg: BG, back: studio(), transition: 'slide', extra: [
        mathBlock({ x: 100, y: 180, w: 1080, h: 190, fontSize: 40, color: FG, latex: 'n_{\\text{métrico}} = n_{\\text{fonético}} \\begin{cases} +1 & \\text{si acaba en aguda} \\\\ \\;\\;\\,0 & \\text{si acaba en llana} \\\\ -1 & \\text{si acaba en esdrújula} \\end{cases}' }),
        ...[['+1', 'aguda', '«se hace camino al an<b>dar</b>»', '7 + 1 = 8', CY], ['0', 'llana', '«verde que te quiero <b>ver</b>de»', '8 + 0 = 8', AMB], ['−1', 'esdrújula', '«bajo el ala del <b>pá</b>jaro»', '8 − 1 = 7', MAG]].map(([n, k, ex, sum, c], i) =>
          on(card(`<div style="font-size:52px;font-weight:800;color:${c};line-height:1">${n}</div><div style="color:${DIM};margin:4px 0 10px">${k}</div><div>${ex}</div><div style="margin-top:8px;color:${c};font-weight:700">${sum}</div>`,
            100 + i * 365, 400, 345, 250, PANEL, { fontSize: 24, color: FG, borderColor: c + '88', radius: 16 }), 'fade-up'))],
        notes: 'La regla como ecuación con casos (Insertar ▸ Ecuación): el oído castellano alarga las agudas y comprime las esdrújulas. Los dos primeros ejemplos son de Machado y Lorca; el tercero es inventado.' },
      { title: 'La sinalefa: dos vocales, un golpe', layout: 'titleOnly', bg: BG, back: studio(), extra: [
        text('«Del salón en el ángulo oscuro» · Bécquer, Rima VII', 100, 170, 1080, 50, { fontSize: 28, fontStyle: 'italic', color: DIM, textAlign: 'center' }),
        ...beats(['Del', 'sa', 'lón', 'en', 'el', 'án', 'gu', 'lo‿os', 'cu', 'ro'], 120, 290, 90, 12, { 7: { w: 140, c: MAG }, 8: { c: CY } }),
        after(ink([[855, 282], [874, 252], [904, 242], [934, 252], [953, 282]], MAG, 5), 'draw', { duration: 600 }),
        after(text(`= <b style="color:${MAG}">10 sílabas</b> · decasílabo`, 100, 415, 1080, 70, { fontSize: 46, color: FG, textAlign: 'center' }), 'fade-up', { sound: 'chime' }),
        text('Si una palabra acaba en vocal y la siguiente empieza por vocal (o por h), se pronuncian juntas: cuentan como una sola sílaba.', 160, 520, 960, 100, { fontSize: 27, color: FG, textAlign: 'center' })],
        notes: 'Las sílabas entran como en un metrónomo; la de la sinalefa («lo os») es más ancha y en rosa, y un arco las une. Sin la sinalefa, el verso tendría 11 sílabas.' },
      { title: 'Consonante o asonante', layout: 'titleOnly', bg: BG, back: studio(), transition: 'fade', extra: [
        ...[['CONSONANTE', 'Riman vocales <b>y</b> consonantes desde la última vocal tónica.', [`cam<b style="color:${CY}">ino</b>`, `dest<b style="color:${CY}">ino</b>`], CY],
          ['ASONANTE', 'Riman <b>solo</b> las vocales desde la última vocal tónica.', [`cam<b style="color:${AMB}">i</b>n<b style="color:${AMB}">o</b>`, `perd<b style="color:${AMB}">i</b>d<b style="color:${AMB}">o</b>`], AMB]].map(([h, d, ws, c], i) => {
          const x = 100 + i * 550;
          return [on(shape('rounded', x, 180, 530, 450, PANEL, { stroke: c, strokeWidth: 2 }), 'fade-up'), along(text(h, x + 30, 205, 470, 50, { fontSize: 28, letterSpacing: 6, fontWeight: 800, color: c }), 'fade-up'),
            along(text(ws.join('<br>'), x + 30, 280, 470, 200, { fontSize: 72, fontWeight: 700, color: FG, lineHeight: 1.2 }), 'fade-up'),
            along(text(d, x + 30, 510, 470, 100, { fontSize: 25, color: DIM }), 'fade-up')]; }).flat()],
        notes: 'Dos paneles, uno por clic. La rima asonante es la del romance y la de casi todas las canciones: pide ejemplos de canciones que conozcan.' },
      { title: 'Los versos que más suenan', layout: 'titleOnly', bg: BG, back: studio(), extra: [
        chartBlock({ x: 100, y: 170, w: 720, h: 480, chartType: 'bar', color: CY, dataLabels: true, grid: true, yTitle: 'versos', xTitle: 'sílabas por verso',
          data: [['6', 12], ['7', 48], ['8', 112], ['11', 96], ['14', 22], ['Otros', 10]].map(([label, value]) => ({ label, value })) }),
        on(card(`<div style="font-size:64px;font-weight:800;color:${AMB};line-height:1">8 y 11</div><div style="margin-top:10px">El octosílabo es el verso popular (romances, refranes); el endecasílabo, el culto (sonetos).</div>`, 860, 210, 320, 320, PANEL, { fontSize: 23, color: FG, borderColor: '#2a3a66' }), 'fade-left'),
        text('Recuento de 300 versos de la antología de clase (datos inventados).', 860, 560, 320, 80, { fontSize: 18, color: DIM, fontStyle: 'italic' })],
        notes: 'Columnas con el recuento inventado de una antología escolar. Arte menor: hasta ocho sílabas; arte mayor: nueve o más.' },
      { title: 'El soneto, pista a pista', layout: 'titleOnly', bg: BG, back: studio(), transition: 'slide', extra: [
        ...(() => { const RH = 'ABBA ABBA CDC DCD'.split(' '), col = { A: CY, B: MAG, C: AMB, D: '#9ece6a' }; let y = 170; const out = [];
          RH.forEach((st, si) => { st.split('').forEach((r, j) => {
            const lenW = 420 + ((si * 4 + j) * 37) % 90;
            out.push((si || j ? after : on)(shape('rounded', 330, y, lenW, 22, col[r], { opacity: 85 }), 'fade-right', { duration: 160, ...(j === 0 && si && { delay: 250 }), ...(j === st.length - 1 && { sound: 'chime' }) }));
            out.push(along(text(r, 290, y - 6, 30, 32, { fontSize: 22, fontWeight: 800, color: col[r] }), 'fade-in', { duration: 160 })); y += 28; });
            out.push(text(['Cuarteto 1', 'Cuarteto 2', 'Terceto 1', 'Terceto 2'][si], 100, y - st.length * 28 + (st.length * 28 - 34) / 2, 170, 34, { fontSize: 22, color: DIM })); y += 16; });
          return out; })(),
        text(`<b style="color:${FG}">14 endecasílabos</b><br>2 cuartetos y 2 tercetos.<br><br>Rima consonante <b style="color:${CY}">AB</b><b style="color:${MAG}">BA</b> en los cuartetos; los tercetos, libres (aquí <b style="color:${AMB}">C</b><b style="color:#9ece6a">D</b>C).`, 880, 200, 300, 440, { fontSize: 26, color: DIM })],
        notes: 'Cada estrofa del soneto aparece como las pistas de una mesa de mezclas, verso a verso y con una campanilla al acabar. Los colores son las rimas: busca un soneto de Garcilaso o de Quevedo y compruébalo.' },
      { layout: 'blank', bg: BG, back: studio(), extra: [quiz('¿Cuántas sílabas métricas tiene «Caminante, no hay camino»?', ['7', '8', '9', '10'], 1, { fontSize: 40 })],
        notes: 'Concurso con puntos: ca-mi-nan-te-no‿hay-ca-mi-no. «No hay» es sinalefa (la h no suena) y acaba en llana: 8 sílabas.' },
      { layout: 'blank', bg: BG, back: studio(), transition: 'zoom', extra: [
        kicker('TALLER', 100, 130, 400, MAG),
        text('Escribe una redondilla', 96, 170, 700, 90, { fontFamily: H, fontSize: 60, fontWeight: 800, color: FG }),
        text(`Cuatro octosílabos con rima <b style="color:${CY}">8a</b> <b style="color:${MAG}">8b</b> <b style="color:${MAG}">8b</b> <b style="color:${CY}">8a</b>.<br>Tema libre: tu barrio, tu música, tu mascota…`, 100, 280, 680, 140, { fontSize: 28, color: DIM }),
        text('Cuenta con palmas, revisa las sinalefas y lee en voz alta.', 100, 460, 680, 60, { fontSize: 26, color: AMB }),
        timer(600, 840, 180, 340, { style: 'ring', color: MAG, auto: false })],
        notes: 'Cuenta atrás de diez minutos para escribir una redondilla. Al acabar, que dos voluntarios la lean marcando el ritmo con palmas.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · «Lazarillo de Tormes»: parchment and sealing wax, an old map with the hooded rogue walking from master to master.
  edu_lang_lazarillo: { name: 'El Lazarillo de Tormes', cat: 'edu', summary: 'Pergamino y lacre: pícaro 3D que recorre el mapa de amo en amo, tarjetas, tabla de amos, línea del hambre, concurso y ordenar', make: () => {
    const PARCH = '#efe0bf', PARCH2 = '#cfae74', INK = '#3b2a1a', RED = '#8e1b1b', SEPIA = '#7a5a35', H = FF.cormorant;
    const parchment = () => [shape('rect', 0, 0, 1280, 720, PARCH, { fill2: PARCH2, gradType: 'radial' }), shape('rect', 30, 30, 1220, 660, 'none', { stroke: SEPIA, strokeWidth: 2, dash: 'dash', opacity: 60 })];
    const seal = (x, y, d, ch = 'L') => [shape('seal', x, y, d, d, RED, { fill2: '#5a0e0e', gradType: 'radial', shadow: { x: 3, y: 5, blur: 8, color: '#00000055' } }),
      text(ch, x, y, d, d, { fontFamily: H, fontSize: Math.round(d * 0.55), fontWeight: 700, color: '#f3d9b0', textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] })];
    return numbered(build({ name: 'El Lazarillo de Tormes', palette: 'paper', fonts: 'classic', title: { color: INK, size: 50, font: H }, body: { color: INK } }, [
      { layout: 'blank', bg: PARCH, transition: 'fade', back: parchment(), extra: [
        text('NOVELA PICARESCA · BURGOS, ALCALÁ Y AMBERES, 1554', 110, 120, 760, 36, { fontSize: 18, letterSpacing: 4, color: SEPIA }),
        text('La vida de<br>Lazarillo de Tormes', 104, 160, 760, 250, { fontFamily: H, fontSize: 92, fontWeight: 700, color: INK, lineHeight: 1 }),
        text('y de sus fortunas y adversidades', 110, 400, 700, 60, { fontFamily: H, fontSize: 40, fontStyle: 'italic', color: RED }),
        text('Autor anónimo', 110, 470, 500, 40, { fontSize: 24, color: SEPIA }),
        ...seal(110, 540, 110),
        m3d('kk-Rogue_Hooded', 860, 140, 360, 480, { autoRotate: false, view: 'front', motion: 'swing' })],
        notes: 'Portada de pergamino con sello de lacre. El pícaro 3D (Modelo 3D ▸ Al entrar ▸ Balanceo) será Lázaro en el mapa. Pregunta: ¿qué es un «pícaro» hoy?' },
      { title: 'Una novela nueva: la picaresca', layout: 'titleOnly', bg: PARCH, back: parchment(), transition: 'page', extra: [
        dg('cards', 'Autobiografía\n  Lázaro cuenta su vida en primera persona\nAntihéroe\n  Un niño pobre y listo, no un caballero\nAmos sucesivos\n  Cada amo, un capítulo o «tratado»\nCrítica social\n  Clérigos avaros e hidalgos de apariencia', 110, 180, 1060, 440, { oneByOne: true, colors: 'accent', fontScale: 1.0 })],
        notes: 'Cuatro rasgos de la novela picaresca en tarjetas que aparecen una a una. Frente a los libros de caballerías, aquí el héroe pasa hambre.' },
      { title: 'El camino de Lázaro', layout: 'titleOnly', bg: PARCH, back: parchment(), extra: [
        img(OLD_MAP, 100, 180, 1080, 440, 'Mapa antiguo de Castilla con el camino de Salamanca a Toledo'),
        withAnims(m3d('kk-Rogue_Hooded', 130, 140, 160, 200, { walk: { clip: 'Walking_A', end: 'Cheer', endOnce: true, face: true } }),
          path([[530, 150], [610, 90], [710, 40], [870, 170]], { duration: 7000 })),
        text('Nace junto al río Tormes, en Salamanca, y acaba en Toledo «en la cumbre de toda buena fortuna».', 100, 630, 1080, 50, { fontSize: 22, color: SEPIA, fontStyle: 'italic', textAlign: 'center' })],
        notes: 'Con un clic, Lázaro (pícaro 3D) camina por el mapa de pueblo en pueblo y celebra al llegar a Toledo (Modelo 3D ▸ Mientras se mueve). El mapa es un dibujo propio.' },
      { title: 'Siete tratados, siete amos', layout: 'titleOnly', bg: PARCH, back: parchment(), transition: 'slide', extra: [
        tableBlock({ x: 100, y: 170, w: 1080, h: 470, fontSize: 21, header: true, headBg: RED, headFg: '#f3d9b0', stroke: '#b89a66', banded: true, band: '#8e1b1b',
          rows: [['Tratado', 'Amo', 'Lo que aprende Lázaro'], ['I', 'Un ciego', 'Astucia: saber «un punto más que el diablo»'], ['II', 'Un clérigo de Maqueda', 'Hambre: el arca del pan bajo llave'],
            ['III', 'Un escudero de Toledo', 'Apariencias: honra sin un real'], ['IV', 'Un fraile de la Merced', 'Lo deja pronto: andaba demasiado'], ['V', 'Un buldero', 'Engaño: falsos milagros para vender bulas'],
            ['VI', 'Un capellán', 'Trabajo: aguador con su propio burro'], ['VII', 'Un arcipreste', 'Se casa y llega a pregonero en Toledo']], colW: [1.1, 2.8, 5] })],
        notes: 'Los siete tratados en una tabla con filas alternas. El ciego, el clérigo y el escudero son los tres grandes capítulos; los demás son muy breves.' },
      { title: 'El hambre de Lázaro', layout: 'titleOnly', bg: PARCH, back: parchment(), extra: [
        chartBlock({ x: 100, y: 170, w: 720, h: 470, chartType: 'line', color: RED, grid: true, dataLabels: true, yMin: 0, yMax: 10, yTitle: 'hambre (de 0 a 10)',
          data: [['Ciego', 6], ['Clérigo', 10], ['Escudero', 9], ['Fraile', 4], ['Buldero', 3], ['Capellán', 2], ['Arcipreste', 0]].map(([label, value]) => ({ label, value })) }),
        on(text(`<div style="font-size:80px;font-weight:700;color:${RED};line-height:1">10</div>Con el clérigo, el hambre toca techo: Lázaro roba el pan del arca… y el clérigo culpa a los ratones.`, 880, 210, 300, 300, { fontSize: 24, color: INK }), 'fade-left'),
        text('Escala inventada para debatir en clase.', 880, 560, 300, 60, { fontSize: 18, color: SEPIA, fontStyle: 'italic' })],
        notes: 'Línea del «hambre» de amo en amo: una escala inventada, pensada para discutir. ¿Coincidís con las notas? ¿Por qué el escudero pasa tanta hambre como Lázaro?' },
      { title: 'El episodio de las uvas', layout: 'titleOnly', bg: PARCH, back: parchment(), transition: 'fade', extra: [
        img(GRAPES, 100, 190, 300, 380, 'Racimo de uvas'),
        text('—Lázaro, engañado me has. Juraré yo a Dios que has tú comido las uvas tres a tres.<br>—No comí —dije yo—, mas ¿por qué sospecháis eso?<br>Respondió el sagacísimo ciego:<br>—¿Sabes en qué veo que las comiste tres a tres? En que comía yo dos a dos y callabas.',
          450, 180, 730, 360, { fontFamily: H, fontSize: 30, fontStyle: 'italic', color: INK, lineHeight: 1.3 }),
        ...[['2 a 2', 'el ciego hace trampa…', '#5b2a7a'], ['3 a 3', '…y Lázaro hace más', RED]].map(([n, d, c], i) =>
          on(text(`<b style="font-size:40px;color:${c}">${n}</b> ${d}`, 450 + i * 370, 570, 360, 70, { fontSize: 24, color: INK, vAlign: 'middle' }), 'zoom-in', { sound: 'pop' }))],
        notes: 'Lectura del episodio del racimo (Tratado I, texto de dominio público). Después, dos clics: la trampa del ciego y la de Lázaro. ¿Quién es más listo?' },
      { layout: 'blank', bg: PARCH, back: parchment(), extra: [quiz('¿Cómo sabe el ciego que Lázaro comía las uvas de tres en tres?', ['Porque él comía de dos en dos y Lázaro callaba', 'Porque lo vio de reojo', 'Porque contó las uvas al final', 'Porque Lázaro se lo confesó'], 0, { y: 80, h: 590, fontSize: 36 })],
        notes: 'Concurso con puntos desde el móvil. El ciego, que no ve, «ve» la trampa con la lógica.' },
      { layout: 'blank', bg: PARCH, back: parchment(), extra: [pollBlock({ kind: 'order', fontSize: 36, question: 'Ordena los amos de Lázaro', x: 80, y: 70, w: 1120, h: 590,
        options: ['El ciego', 'El clérigo de Maqueda', 'El escudero', 'El buldero', 'El arcipreste'] })],
        notes: 'Actividad de ordenar desde el móvil: se corrige sola y da puntos. Hemos dejado fuera al fraile y al capellán para que sea más rápida.' },
      { layout: 'blank', bg: PARCH, back: parchment(), transition: 'page', extra: [
        ...seal(110, 120, 90, '?'),
        text('¿Por qué no lo firmó nadie?', 230, 120, 900, 90, { fontFamily: H, fontSize: 64, fontWeight: 700, color: INK, vAlign: 'middle' }),
        text(ul('Critica a clérigos y nobles: era peligroso', 'Es la «autobiografía» de un pregonero: el autor se esconde tras Lázaro', 'Se ha atribuido a varios autores, sin pruebas definitivas'), 110, 250, 700, 300, { fontSize: 28, color: INK, lineHeight: 1.5 }),
        text('Para la próxima clase: lee el Tratado III, el del escudero.', 110, 580, 700, 50, { fontSize: 26, color: RED, fontStyle: 'italic' }),
        m3d('kk-Rogue_Hooded', 860, 160, 340, 460, { autoRotate: false, view: 'three', clip: 'Cheer' })],
        notes: 'Cierre con debate sobre el anonimato. Lázaro celebra al fondo (Modelo 3D ▸ En reposo ▸ Cheer). Los modelos de personajes son CC0 y no necesitan crédito.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Syntax as an architect's blueprint: word tiles that fly into place (Transform), brackets, a tree, a label activity.
  edu_lang_syntax: { name: 'Sujeto y predicado, en plano', cat: 'edu', summary: 'Plano técnico: piezas que se ordenan con Transformar, corchetes que se trazan, árbol sintáctico, tabla, etiquetar imagen y concurso', make: () => {
    const BP = '#0d3b66', W = '#eaf4ff', CY = '#7fdbff', YEL = '#ffd166', PINK = '#ff8fab', DIM = '#9fc3e6', H = pairStacks('tech').heading, M = FF.mono;
    const grid = () => [paperImg(BLUEPRINT, 'Cuadrícula de plano técnico')];
    const stamp = () => [shape('rect', 900, 620, 340, 70, 'none', { stroke: DIM, strokeWidth: 1.5 }), text('PLANO Nº 2 · LENGUA 2.º ESO<br>ESCALA 1:1 · HOJA 1 DE 1', 912, 626, 320, 60, { fontFamily: M, fontSize: 13, color: DIM, lineHeight: 1.6 })];
    const WORDS = [['La', 90], ['profesora', 230], ['explica', 200], ['el', 80], ['poema', 170]], ids = WORDS.map(() => uid());
    const tile = (i, x, y, props = {}) => keep(text(WORDS[i][0], x, y, WORDS[i][1], 84, { fontFamily: H, fontSize: 40, fontWeight: 700, color: BP, bg: W, radius: 8, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0], ...props }), ids[i]);
    const rowX = (() => { let x = 223; return WORDS.map(([, w]) => { const r = x; x += w + 16; return r; }); })();
    const bracket = (x0, x1, y, c, label, props = {}) => [ink([[x0, y - 14], [x0, y], [x1, y], [x1, y - 14]], c, 4, props),
      text(label, x0, y + 10, x1 - x0, 40, { fontFamily: M, fontSize: 20, color: c, textAlign: 'center', fontWeight: 700 })];
    return numbered(build({ name: 'Sujeto y predicado, en plano', palette: 'ocean', fonts: 'tech', title: { color: W, size: 46 }, body: { color: W } }, [
      { layout: 'blank', bg: BP, transition: 'fade', back: grid(), extra: [
        kicker('SINTAXIS · 2.º ESO', 104, 100, 600, CY, { fontFamily: M }),
        text('Análisis sintáctico', 100, 140, 1080, 110, { fontFamily: H, fontSize: 88, fontWeight: 700, color: W }),
        text('Sujeto y predicado, pieza a pieza', 104, 262, 900, 50, { fontSize: 32, color: DIM }),
        ...WORDS.map((_, i) => tile(i, rowX[i], 390)),
        ...(() => { const sn = bracket(rowX[0], rowX[1] + 230, 500, YEL, 'SN · SUJETO'), sv = bracket(rowX[2], rowX[4] + 170, 500, PINK, 'SV · PREDICADO');
          return [after(sn[0], 'draw', { duration: 700, delay: 300 }), along(sn[1], 'fade-in'), after(sv[0], 'draw', { duration: 700 }), along(sv[1], 'fade-in')]; })(),
        ...stamp()],
        notes: 'Portada de plano técnico: las piezas de la oración y los corchetes del sujeto y el predicado, que se trazan solos al llegar.' },
      { title: 'Las piezas, revueltas', layout: 'titleOnly', bg: BP, back: grid(), extra: [
        tile(2, 160, 230, { rotation: -8 }), tile(4, 860, 210, { rotation: 6 }), tile(0, 560, 460, { rotation: 10 }), tile(1, 300, 470, { rotation: 4 }), tile(3, 900, 470, { rotation: -12 }),
        text('Cinco palabras sueltas no dicen nada. ¿Cómo encajan?', 100, 620, 800, 50, { fontSize: 26, color: DIM }), ...stamp()],
        notes: 'Las piezas, desordenadas y giradas. En la diapositiva siguiente vuelan a su sitio con Transformar: pide antes a la clase que las ordenen en voz alta.' },
      { title: 'Montamos la oración', layout: 'titleOnly', bg: BP, back: grid(), autoAnimate: true, transition: 'fade', extra: [
        ...WORDS.map((_, i) => tile(i, rowX[i], 250)),
        ...(() => { const sn = bracket(rowX[0], rowX[1] + 230, 360, YEL, 'SN · SUJETO'), sv = bracket(rowX[2], rowX[4] + 170, 360, PINK, 'SV · PREDICADO');
          return [on(sn[0], 'draw', { duration: 700 }), along(sn[1], 'fade-in'), on(sv[0], 'draw', { duration: 700 }), along(sv[1], 'fade-in')]; })(),
        on(text(`Núcleo del sujeto: <b style="color:${YEL}">profesora</b> (sustantivo) · Núcleo del predicado: <b style="color:${PINK}">explica</b> (verbo)<br><span style="color:${DIM}">El sujeto es de quien se dice algo; el predicado, lo que se dice de él.</span>`, 100, 460, 1080, 110, { fontSize: 26, color: W, textAlign: 'center' }), 'fade-up'),
        ...stamp()],
        notes: 'Transformar: cada palabra vuela desde su posición revuelta hasta su sitio. Después, dos clics trazan los corchetes del sujeto y del predicado, y el tercero señala los núcleos.' },
      { title: 'La prueba del sujeto', layout: 'titleOnly', bg: BP, back: grid(), extra: [
        text(`La profesora explic<b style="color:${YEL}">a</b> el poema.`, 100, 200, 1080, 70, { fontFamily: H, fontSize: 46, color: W }),
        on(text(`La<b style="color:${YEL}">s</b> profesora<b style="color:${YEL}">s</b> explica<b style="color:${YEL}">n</b> el poema.`, 100, 300, 1080, 70, { fontFamily: H, fontSize: 46, color: W }), 'fade-down', { sound: 'click' }),
        on(text('El poema → los poemas: el verbo <b>no</b> cambia.', 100, 390, 1080, 60, { fontFamily: H, fontSize: 34, color: DIM }), 'fade-down'),
        on(shape('rounded', 100, 490, 1080, 110, '#0a2e50', { stroke: CY, strokeWidth: 2, html: `Pon en plural la palabra que crees que es el sujeto: <b style="color:${YEL}">si el verbo cambia con ella, es el sujeto</b>. Se llama <b>concordancia</b>.`, fontSize: 26, color: W }), 'fade-up')],
        notes: 'La prueba de la concordancia, en tres clics: el sujeto y el verbo cambian juntos de número; el complemento directo, no. Es la herramienta más fiable para encontrar el sujeto.' },
      { title: 'El árbol de la oración', layout: 'titleOnly', bg: BP, back: grid(), transition: 'slide', extra: [
        dg('hierarchy', 'Oración\n  SN · Sujeto\n    Det: La\n    N: profesora\n  SV · Predicado\n    V: explica\n    CD: el poema', 100, 175, 1080, 430, { oneByOne: true, colors: 'light', fontScale: 1.2 }),
        ...stamp()],
        notes: 'El mismo análisis en forma de árbol, que crece nivel a nivel. Es la representación que veréis en bachillerato.' },
      { title: 'Los complementos del verbo', layout: 'titleOnly', bg: BP, back: grid(), extra: [
        tableBlock({ x: 100, y: 180, w: 1080, h: 380, fontSize: 24, header: true, headBg: CY, headFg: BP, stroke: '#3c6a96', banded: true, band: '#7fdbff',
          rows: [['Complemento', 'Pregunta al verbo', 'Ejemplo'], ['Directo (CD)', '¿Qué?', 'Explica <b>el poema</b>.'], ['Indirecto (CI)', '¿A quién? ¿Para quién?', 'Explica el poema <b>a la clase</b>.'],
            ['Circunstancial (CC)', '¿Dónde? ¿Cuándo? ¿Cómo?', 'Lo explica <b>por la mañana</b>.'], ['Atributo', 'Con ser, estar, parecer', 'El poema es <b>precioso</b>.']], colW: [2.6, 3, 4] }),
        text('Truco del CD: sustitúyelo por «lo», «la», «los», «las» → «La profesora <b>lo</b> explica».', 100, 590, 1080, 50, { fontSize: 24, color: DIM })],
        notes: 'Tabla de complementos con su pregunta clave. Las preguntas ayudan, pero la prueba de sustitución por pronombre es más segura.' },
      { title: 'El sujeto que no se ve', layout: 'titleOnly', bg: BP, back: grid(), extra: [
        text('Leímos el poema en clase.', 280, 250, 900, 80, { fontFamily: H, fontSize: 52, fontWeight: 700, color: W }),
        on(text('(Nosotros)', 70, 250, 200, 80, { fontFamily: H, fontSize: 36, color: YEL, borderColor: YEL, radius: 10, textAlign: 'center', vAlign: 'middle', pad: [0, 0, 0, 0] }), 'zoom-in', { sound: 'pop' }),
        on(text(`<b style="color:${YEL}">Sujeto elíptico</b>: no aparece, pero lo sabemos por la terminación del verbo: le-í-<b style="color:${YEL}">mos</b> → nosotros.`, 100, 400, 1080, 90, { fontSize: 30, color: W }), 'fade-up'),
        on(text(`¡Cuidado! En «Me encantan los libros» el sujeto es <b style="color:${PINK}">los libros</b>: son ellos los que «encantan».`, 100, 520, 1080, 90, { fontSize: 30, color: W }), 'fade-up')],
        notes: 'El sujeto omitido aparece con un clic, entre paréntesis. El último ejemplo es la trampa clásica de los verbos como gustar o encantar: lo usaremos en el concurso.' },
      { layout: 'blank', bg: BP, back: grid(), extra: [pollBlock({ kind: 'label', fontSize: 30, question: 'Etiqueta cada parte de la oración', image: SENTENCE, x: 60, y: 50, w: 1160, h: 620,
        options: ['Sujeto', 'Verbo', 'C. directo', 'C. circunstancial'], points: [{ x: 30, y: 46 }, { x: 75, y: 46 }, { x: 25, y: 84 }, { x: 77, y: 84 }] })],
        notes: 'Actividad «Etiquetar una imagen» desde el móvil: arrastra cada función a su grupo de palabras. La oración es un dibujo propio.' },
      { layout: 'blank', bg: BP, back: grid(), extra: [quiz('¿Cuál es el sujeto de «Me encantan las novelas de misterio»?', ['Me', 'Las novelas de misterio', 'Yo (omitido)', 'No tiene sujeto'], 1, { fontSize: 38 })],
        notes: 'Concurso con puntos. Haz la prueba de concordancia: «Me encanta la novela» / «Me encantan las novelas». El verbo cambia con «las novelas»: ese es el sujeto.' },
    ]));
  } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Fables: an illustrated storybook landscape, a fox in 3D that walks in and sits under the vine.
  edu_lang_fables: { name: 'Fábulas: la zorra y las uvas', cat: 'edu', summary: 'Libro de cuentos: zorro 3D que entra andando, título curvo, cronología, parra dibujada, escalones, tabla, ordenar y nube de palabras', make: () => {
    const INK = '#2d3a1f', CREAM = '#fffaf0', BROWN = '#6d4c41', FOX = '#e07a2f', GRAPE = '#6a1b9a', GREEN = '#2e7d32', H = pairStacks('friendly').heading, HAND = FF.caveat;
    const meadow = () => [paperImg(LANDSCAPE, 'Paisaje de cuento: colinas, árboles y sol')];
    const page = (fold = false) => [shape('rect', 0, 0, 1280, 720, CREAM), shape('rect', 0, 0, 1280, 720, 'none', { stroke: '#e6d8b8', strokeWidth: 24 }), ...(fold ? [shape('rect', 636, 30, 8, 660, '#efe3c6', { opacity: 70 })] : [])];
    return numbered(build({ name: 'Fábulas: la zorra y las uvas', palette: 'forest', fonts: 'friendly', title: { color: GREEN, size: 48 }, body: { color: INK } }, [
      { layout: 'blank', bg: '#bfe3ff', transition: 'fade', back: meadow(), extra: [
        text('Érase una fábula', 290, 60, 700, 260, { fontFamily: H, fontSize: 84, fontWeight: 800, color: BROWN, curve: 30, textAlign: 'center' }),
        text('Animales que hablan, una historia breve… y una enseñanza para llevarse a casa', 340, 300, 600, 90, { fontSize: 26, color: INK, textAlign: 'center' }),
        withAnims(m3d('kh-Fox', 10, 360, 340, 300, { walk: { clip: 'Walk', face: true } }), path([[300, 10], [520, 40]], { duration: 3800, start: 'afterPrev' })),
        { ...credits(['kh-Fox'], 60, 676, 1160, '#2d3a1f'), bg: '#fffaf0d9', radius: 6, pad: [4, 10, 4, 10] }],
        notes: 'Portada de libro de cuentos: el título se curva como un arco (Cuadro de texto ▸ Curvar texto) y el zorro 3D entra andando solo por el camino (trayectoria con la animación de andar).' },
      { title: '¿Qué es una fábula?', layout: 'titleOnly', bg: CREAM, back: page(true), transition: 'page', extra: [
        ...[['paw-print', 'Personajes animales', 'que hablan y actúan como personas'], ['hourglass', 'Breve', 'en prosa o en verso, se lee en un minuto'], ['message-circle', 'Diálogo y conflicto', 'dos personajes, un problema'], ['lightbulb', 'Moraleja', 'una enseñanza al final, a veces explícita']].map(([ic, h, d], i) => {
          const x = 110 + (i % 2) * 560, y = 200 + Math.floor(i / 2) * 210;
          return [on(shape('ellipse', x, y, 110, 110, ['#ffe0b2', '#dcedc8', '#e1f5fe', '#fff9c4'][i]), 'zoom-in', { sound: 'pop', duration: 300 }), along(icon(ic, x + 25, y + 25, 60, [FOX, GREEN, '#0277bd', '#f9a825'][i]), 'zoom-in', { duration: 300 }),
            along(text(`<b style="font-family:${H};font-size:30px">${h}</b><br>${d}`, x + 130, y + 6, 370, 110, { fontSize: 23, color: INK }), 'fade-left')]; }).flat()],
        notes: 'Cuatro rasgos de la fábula, uno por clic, en las dos páginas de un libro abierto.' },
      { title: 'Veintiséis siglos de fábulas', layout: 'titleOnly', bg: CREAM, back: page(), extra: [
        dg('timeline', 's. VI a. C.\n  Esopo, en Grecia\ns. I\n  Fedro, en Roma\n1668\n  La Fontaine, en Francia\n1781\n  Samaniego, en España\n1782\n  Iriarte: fábulas literarias', 110, 200, 1060, 300, { oneByOne: true, colors: 'colorful', fontScale: 1.15 }),
        on(text('La misma historia de la zorra y las uvas la contaron Esopo, Fedro, La Fontaine y Samaniego.', 110, 530, 1060, 110, { fontFamily: HAND, fontSize: 36, color: FOX, textAlign: 'center' }), 'fade-up')],
        notes: 'Cronología de fabulistas uno a uno. Todos son de dominio público: sus fábulas se pueden leer, copiar y representar libremente.' },
      { layout: 'blank', bg: '#bfe3ff', back: meadow(), transition: 'fade', extra: [
        img(VINE, 700, 60, 520, 440, 'Parra con racimos de uvas en lo alto'),
        m3d('kh-Fox', 790, 330, 330, 300, { autoRotate: false, view: 'side', clip: 'Survey' }),
        shape('rounded', 60, 60, 600, 490, '#fffaf0ee', { stroke: '#e6d8b8', strokeWidth: 3 }),
        text('LA ZORRA Y LAS UVAS · SAMANIEGO', 90, 82, 540, 30, { fontSize: 16, letterSpacing: 3, color: FOX, fontWeight: 700 }),
        ...['Miró, saltó y anduvo en probaduras;', 'pero vio el imposible ya de fijo.', 'Entonces fue cuando la zorra dijo:', '«No las quiero comer. No están maduras».'].map((v, i) =>
          (i ? after : on)(text(v, 90, 130 + i * 70, 550, i === 3 ? 100 : 60, { fontFamily: H, fontSize: i === 3 ? 28 : 26, fontWeight: i === 3 ? 700 : 400, color: i === 3 ? GRAPE : INK }), 'fade-in', { duration: 800 })),
        after(text('Moraleja: despreciamos lo que no podemos conseguir.', 90, 450, 550, 80, { fontFamily: HAND, fontSize: 32, color: GREEN }), 'fade-up')],
        notes: 'Final de la fábula de Samaniego (1781, dominio público), verso a verso. El zorro 3D mira la parra con su animación de reposo. Pregunta: ¿cuándo decimos hoy «están verdes»?' },
      { title: 'Cómo se construye', layout: 'titleOnly', bg: CREAM, back: page(), transition: 'slide', extra: [
        dg('steps', 'Planteamiento\n  Una zorra hambrienta ve unas uvas\nNudo\n  Salta y salta, pero no llega\nDesenlace\n  Se va diciendo que están verdes\nMoraleja\n  Lo que no logramos, lo despreciamos', 110, 180, 1060, 430, { oneByOne: true, colors: 'colorful', fontScale: 1.0 })],
        notes: 'Estructura de la fábula en escalones que aparecen uno a uno. Sirve para planificar la que escribirán al final de la clase.' },
      { title: 'Cada animal, un carácter', layout: 'titleOnly', bg: CREAM, back: page(), extra: [
        tableBlock({ x: 110, y: 180, w: 1060, h: 400, fontSize: 25, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#d8cfb4', banded: true, band: '#2e7d32',
          rows: [['Animal', 'Suele representar', 'Una fábula'], ['La zorra', 'La astucia y el engaño', 'El cuervo y el zorro'], ['La hormiga', 'El trabajo previsor', 'La cigarra y la hormiga'],
            ['La liebre', 'La confianza excesiva', 'La liebre y la tortuga'], ['El león', 'El poder', 'El león y el ratón'], ['El lobo', 'El abuso del fuerte', 'El lobo y el cordero']], colW: [2, 3.4, 3.6] })],
        notes: 'Los animales de las fábulas son tipos: casi siempre representan lo mismo. Pide que añadan un animal nuevo y el carácter que le darían.' },
      { layout: 'blank', bg: CREAM, back: page(), extra: [pollBlock({ kind: 'order', fontSize: 36, question: 'Ordena la fábula de la zorra y las uvas', x: 90, y: 70, w: 1100, h: 580,
        options: ['La zorra tiene hambre', 'Ve unas uvas en lo alto de una parra', 'Salta y no las alcanza', 'Dice que no están maduras'] })],
        notes: 'Actividad de ordenar desde el móvil: cada uno recompone la historia y se corrige sola.' },
      { layout: 'blank', bg: CREAM, back: page(), extra: [pollBlock({ kind: 'word', fontSize: 36, question: 'Resume la moraleja en una palabra', options: [], x: 90, y: 70, w: 1100, h: 580 })],
        notes: 'Nube de palabras en directo: envidia, orgullo, excusas… Las más repetidas crecen. Comentad las que más os sorprendan.' },
      { layout: 'blank', bg: '#bfe3ff', back: meadow(), transition: 'zoom', extra: [
        shape('rounded', 60, 60, 680, 520, '#fffaf0ee', { stroke: '#e6d8b8', strokeWidth: 3 }),
        text('Ahora, tu fábula', 100, 90, 600, 80, { fontFamily: H, fontSize: 52, fontWeight: 800, color: BROWN }),
        text(ul('Elige dos animales y un problema', 'Planteamiento, nudo y desenlace en diez líneas', 'Termina con una moraleja en una frase'), 100, 190, 600, 240, { fontSize: 27, color: INK, lineHeight: 1.6 }),
        text('¡Que hablen los animales!', 100, 470, 600, 60, { fontFamily: HAND, fontSize: 40, color: FOX }),
        timer(900, 860, 70, 300, { style: 'ring', color: FOX, auto: false }),
        m3d('kh-Fox', 820, 400, 360, 260, { autoRotate: false, view: 'three', clip: 'Survey' }),
        { ...credits(['kh-Fox'], 60, 676, 1160, '#2d3a1f'), bg: '#fffaf0d9', radius: 6, pad: [4, 10, 4, 10] }],
        notes: 'Cuenta atrás de quince minutos para escribir una fábula propia. El zorro espera en el prado. Lee después dos o tres en voz alta.' },
    ]));
  } },
};
