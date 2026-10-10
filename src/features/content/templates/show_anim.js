// Example presentations: Catálogo de animaciones (showcase). Each one: { name, summary, cat: 'showcase', make() } → a deck
// (see kit.js for the builders).
//
// Ten decks where the animations ARE the point, each with a theme that asks for
// a different way of animating: a story told with entrances and exits, routes on
// a map, a game chained with sounds, emphasis in a speech, a plan that draws
// itself, 3D characters playing their clips, triggers (click on an object),
// words and paragraphs one by one, an infographic that reveals itself and
// motions in sync (with the previous one, durations and delays).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';
import { motionPoints } from '../../animation/transitions.js';

// ---- Helpers of this file ---------------------------------------------------------
const FF = {
  lora: "'Lora', serif", dancing: "'Dancing Script', cursive", caveat: "'Caveat', cursive", oswald: "'Oswald', sans-serif",
  bebas: "'Bebas Neue', sans-serif", anton: "'Anton', sans-serif", mono: "'JetBrains Mono', monospace", courier: "'Courier New', 'Liberation Mono', Courier, monospace",
  cormorant: "'Cormorant Garamond', serif", quicksand: "'Quicksand', sans-serif", space: "'Space Grotesk', sans-serif", fira: "'Fira Code', monospace",
  merri: "'Merriweather', serif", playfair: "'Playfair Display', serif", montserrat: "'Montserrat', sans-serif", poppins: "'Poppins', sans-serif",
};
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
// A picture drawn in SVG, as a data URL (no external files).
const svgURL = (w, h, body, bg = 'none') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
// A stroke through points on the slide (an ink object: it can be drawn as you present, effect 'draw').
const ink = (pts, color, width = 4, props = {}) => {
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const px = Math.max(6, (80 - (Math.max(...xs) - Math.min(...xs))) / 2), py = Math.max(6, (80 - (Math.max(...ys) - Math.min(...ys))) / 2);
  const x = Math.min(...xs) - px, y = Math.min(...ys) - py, w = Math.max(...xs) - x + px, h = Math.max(...ys) - y + py;
  return { ...base(Math.round(x), Math.round(y), Math.round(w), Math.round(h)), type: 'ink',
    points: pts.map(([a, b]) => [Math.round(a - x), Math.round(b - y)]), vw: Math.round(w), vh: Math.round(h), color, width, ...props };
};
// A smooth path of a drawn route: the points a motion path goes through, sampled (to draw the same route as ink).
const curvePts = (start, rel, n = 60) => motionPoints({ pathShape: 'custom', points: [[0, 0], ...rel] }, n).map(([x, y]) => [start[0] + x, start[1] + y]);
const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const withId = (b, id) => ({ ...b, id });
// One animation on an object.
const at = (b, effect, props = {}) => withAnims(b, A(effect, props));
// Objects one after another with one click (the first waits for the click unless told otherwise).
const chain = (blocks, effect, props = {}, first = 'click') => blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? 'afterPrev' : first })));
// A 3D model without its caption (the credits of the deck go on one line).
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label.replace(/ \(.*\)/, '') + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 40, { fontSize: 12, color });
// A small uppercase label with wide spacing.
// The deck's text colour (tables and polls take it): for slides whose background isn't the palette's.
const ink2 = (deck, color) => Object.assign(deck, { textColor: color });
const kicker = (t, x, y, w, color, props = {}) => text(t, x, y, w, 34, { fontSize: 18, letterSpacing: 5, color, fontWeight: 700, ...props });

export default {

  // ============================================================================
  // 1 · A bedtime story: every character enters and leaves, captions that are
  //     visible only in their step, a light that goes out and comes back.
  show_anim_firefly: { name: 'Cuento: la luciérnaga sin luz', cat: 'showcase',
    summary: 'Un cuento con entradas y salidas: narración visible solo en su paso, diálogos que aparecen y se van, vuelos y luz que vuelve',
    make: () => {
      const NIGHT = '#08161a', SKY = '#163b3a', TREE = '#04100f', TREE2 = '#0b2420', GOLD = '#ffd75e', TXT = '#f3ecd6', DIM = '#a8c0b4', MOON = '#f6efd2';
      // The characters, drawn in SVG: a firefly (lit or not) and an owl.
      const fly = lit => svgURL(120, 120, `<defs><radialGradient id="g"><stop offset="0" stop-color="#fff7b8"/><stop offset=".3" stop-color="#ffd84a" stop-opacity=".8"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient></defs>`
        + (lit ? '<circle cx="44" cy="76" r="44" fill="url(#g)"/>' : '')
        + '<path d="M66 50 Q74 30 88 26 M70 52 Q84 40 98 42" stroke="#2d2418" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
        + '<ellipse cx="56" cy="44" rx="22" ry="11" fill="#e6efff" opacity=".6" transform="rotate(-40 56 44)"/><ellipse cx="68" cy="48" rx="19" ry="9" fill="#e6efff" opacity=".45" transform="rotate(-12 68 48)"/>'
        + '<ellipse cx="55" cy="64" rx="16" ry="11" fill="#4a3a26" transform="rotate(35 55 64)"/>'
        + `<ellipse cx="42" cy="77" rx="13" ry="10" fill="${lit ? '#fff3a0' : '#5d574a'}" transform="rotate(35 42 77)"/>`
        + '<circle cx="69" cy="56" r="8" fill="#2d2418"/><circle cx="72" cy="54" r="2.4" fill="#ffffff"/>');
      const owl = svgURL(200, 240, '<ellipse cx="100" cy="140" rx="78" ry="92" fill="#7a5a3a"/><ellipse cx="100" cy="160" rx="52" ry="66" fill="#c9a77a"/>'
        + [0, 1, 2, 3].map(i => `<path d="M${72 + (i % 2) * 28} ${140 + i * 18} q14 10 28 0" stroke="#8d6a45" stroke-width="3" fill="none"/>`).join('')
        + '<path d="M40 70 L58 30 L78 62 Z M160 70 L142 30 L122 62 Z" fill="#7a5a3a"/>'
        + '<circle cx="72" cy="92" r="28" fill="#f2e3c4"/><circle cx="128" cy="92" r="28" fill="#f2e3c4"/><circle cx="72" cy="94" r="14" fill="#1d1408"/><circle cx="128" cy="94" r="14" fill="#1d1408"/>'
        + '<circle cx="77" cy="89" r="4" fill="#fff"/><circle cx="133" cy="89" r="4" fill="#fff"/><path d="M92 112 L100 130 L108 112 Z" fill="#e0a23a"/>'
        + '<path d="M70 226 l-8 12 M80 228 l0 12 M120 228 l0 12 M130 226 l8 12" stroke="#e0a23a" stroke-width="5" stroke-linecap="round"/>');
      const LIT = fly(true), DARK = fly(false);
      // The night: sky, stars, moon and the pines.
      const PINE = 'M50 0L70 28H61L82 55H69L94 88H57V100H43V88H6L31 55H18L39 28H30Z';
      const r = rng(7);
      const stars = Array.from({ length: 34 }, () => E(Math.round(r() * 1260), Math.round(r() * 360), 3 + Math.round(r() * 2), 3 + Math.round(r() * 2), '#ffffff', { opacity: 35 + Math.round(r() * 55) }));
      const pines = (front = TREE, back = TREE2) => [
        ...[[0, 300, 200], [150, 360, 170], [930, 320, 210], [1060, 280, 220], [470, 410, 140], [700, 380, 160]].map(([x, y, w]) => shape('custom', x, y, w, 720 - y, back, { path: PINE })),
        ...[[0, 400, 210], [260, 470, 160], [820, 450, 190], [1040, 420, 240], [560, 520, 120]].map(([x, y, w]) => shape('custom', x, y, w, 720 - y, front, { path: PINE })),
        R(0, 680, 1280, 40, front)];
      const sky = (moon = true) => [R(0, 0, 1280, 720, SKY, { fill2: NIGHT, gradAngle: 90 }), ...stars,
        ...(moon ? [glow(960, 0, 240, '#fff4c2', SKY, 35), E(1010, 40, 140, 140, MOON, { fill2: '#e3d6a6', gradType: 'radial' })] : [])];
      const scene = (n, t) => [kicker('ESCENA ' + n, 70, 40, 400, GOLD), text(t, 70, 70, 900, 70, { fontFamily: FF.lora, fontSize: 44, fontStyle: 'italic', color: TXT })];
      // (The narration: one line per row of a dark band, so nothing overlaps in the editor either.)
      const band = (rows = 3) => shape('rounded', 120, 548, 1040, 20 + rows * 42, '#000000', { opacity: 55, radius: 22 });
      const say = (t, row, props = {}) => text(t, 150, 558 + row * 42, 980, 40, { fontFamily: FF.lora, fontSize: 25, color: TXT, textAlign: 'center', vAlign: 'middle', fontStyle: 'italic', ...props });
      const bubble = (t, x, y, w, h) => shape('speechround', x, y, w, h, '#fdf8e8', { stroke: '#e8d9a8', strokeWidth: 2, html: t, fontFamily: FF.lora, fontSize: 24, color: '#2b2416' });
      const ring = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * 2 * Math.PI; return [Math.round(590 + 250 * Math.cos(a)), Math.round(320 + 130 * Math.sin(a))]; });

      return numbered(ink2(build({ name: 'Lúa, la luciérnaga sin luz', palette: 'forest', fonts: 'friendly', title: { color: TXT, font: FF.lora }, body: { color: TXT } }, [
        { layout: 'blank', bg: NIGHT, transition: 'fade', back: [...sky(), ...pines()], extra: [
          kicker('UN CUENTO EN CINCO ESCENAS', 90, 150, 500, GOLD),
          text('Lúa', 80, 180, 520, 200, { fontFamily: FF.dancing, fontSize: 170, color: GOLD, shadow: { x: 0, y: 0, blur: 30, color: '#ffcc33aa' } }),
          text('la luciérnaga sin luz', 92, 375, 640, 70, { fontFamily: FF.lora, fontSize: 46, fontStyle: 'italic', color: TXT }),
          text('Para contar en voz alta: cada clic, un paso de la historia.', 92, 455, 640, 44, { fontSize: 24, color: DIM }),
          ...[[700, 250], [790, 170], [880, 300], [610, 120], [1000, 220], [760, 380]].map(([x, y], i) =>
            withAnims(img(LIT, x, y, 70 + (i % 3) * 14, 70 + (i % 3) * 14, 'Luciérnaga encendida'), A('zoom-in', { start: 'afterPrev', duration: 500, delay: i ? 120 : 600 }))),
          at(img(DARK, 980, 540, 90, 90, 'Lúa, apagada'), 'fade-up', { start: 'afterPrev', duration: 900, delay: 300 })],
          notes: 'La portada se anima sola al llegar: las luciérnagas se encienden una tras otra («después de la anterior», con un pequeño retardo) y al final aparece Lúa, la única apagada. Los personajes son dibujos SVG hechos a medida.' },

        { layout: 'blank', bg: NIGHT, transition: 'fade', back: [...sky(), ...pines()], extra: [
          ...scene(1, 'El bosque de las mil luces'), band(),
          withAnims(say('En el bosque de Valdeluz, cada noche, mil luciérnagas encendían el cielo.', 0), A('fade-in-then-semi-out')),
          ...[[300, 230], [420, 160], [820, 180], [960, 260], [700, 300], [240, 380], [1040, 400]].map(([x, y], i) =>
            withAnims(img(LIT, x, y, 76, 76, 'Luciérnaga'), A('zoom-in', { start: i ? 'afterPrev' : 'withPrev', duration: 300 }))),
          withAnims(say('La más pequeña se llamaba Lúa, y su luz era la más brillante de todas.', 1), A('fade-in-then-semi-out')),
          withAnims(img(LIT, 520, 320, 150, 150, 'Lúa, encendida'), A('fade-right', { start: 'withPrev', duration: 900 })),
          withAnims(say('Pero una noche de otoño, el viento del norte bajó de la montaña…', 2), A('fade-in', { sound: 'whoosh' }))],
          notes: 'Tres clics, tres frases de narración: cada una lleva «Aparecer y atenuar», así que se lee la que toca y las anteriores quedan a media luz. Con la segunda llega Lúa; con la tercera se queda (Aparecer) y suena el viento (Silbido).' },

        (() => {   // Scene 2: her light goes out (a cross-fade), the others fly away and fade out.
          const F = [[300, 230], [420, 160], [820, 180], [960, 260]];
          const off = A('fade-out', { duration: 1400 }), on = A('fade-in', { start: 'withPrev', duration: 1400 }), c1 = A('current-visible', { start: 'withPrev' });
          const away = F.map((_, i) => path([[60 + i * 10, -70], [170, -130 - i * 10], [320 - i * 20, -260]], { start: i ? 'withPrev' : 'click', duration: 2000 + i * 250 }));
          const c2 = A('current-visible', { start: 'withPrev' });
          const gone = F.map((_, i) => A('fade-out', { start: i ? 'withPrev' : 'afterPrev', duration: 500 }));
          const dim = A('semi-fade-out', { duration: 1500 }), c3 = A('fade-in', { start: 'withPrev' });
          return { layout: 'blank', bg: NIGHT, transition: 'fade', back: [...sky(false), glow(380, 120, 520, '#2b5c55', NIGHT, 40), ...pines()], extra: [
            ...scene(2, 'La noche que se apagó'), band(),
            withAnims(img(LIT, 520, 320, 150, 150, 'Lúa, encendida'), off),
            withAnims(img(DARK, 520, 320, 150, 150, 'Lúa, apagada'), on, dim),
            withAnims(say('Un soplo helado… y la luz de Lúa se apagó.', 0), c1),
            ...F.map(([x, y], i) => withAnims(img(LIT, x, y, 76, 76, 'Luciérnaga'), away[i], gone[i])),
            withAnims(say('Las demás siguieron su camino. Ninguna se dio cuenta.', 1), c2),
            withAnims(say('Lúa se quedó sola, a oscuras, encima de una hoja.', 2), c3)],
            notes: 'Aquí la narración usa «Visible solo en su paso»: cada frase se ve únicamente en su clic. Primer clic: la luz se apaga con un fundido cruzado (la Lúa encendida desaparece mientras aparece la apagada en el mismo sitio). Segundo: las amigas se van volando por una trayectoria y, al llegar, desaparecen. Tercero: Lúa se atenúa.' };
        })(),

        (() => {   // Scene 3: a dialogue in turns, then she flies off.
          const a1 = A('bounce', { sound: 'pop', duration: 800 }), b1 = A('fade-in-then-out', { start: 'afterPrev' }), l1 = A('fade-left', { start: 'withPrev' });
          const b2 = A('fade-in-then-out'), b3 = A('fade-in'), go = path([[90, -110], [250, -250], [400, -330]], { duration: 2600 });
          return { layout: 'blank', bg: NIGHT, transition: 'fade', back: [...sky(), ...pines(),
            shape('custom', 0, 400, 680, 90, '#3b2a1c', { path: 'M0 30 Q30 10 60 22 Q85 30 100 18 L100 34 Q80 48 58 40 Q30 32 0 62 Z' })], extra: [
            ...scene(3, 'El búho que lo sabía todo'),
            withAnims(img(owl, 150, 222, 160, 192, 'Búho'), a1),
            withAnims(bubble('¿Por qué estás tan triste, pequeña?', 360, 150, 320, 110), b1),
            withAnims(img(DARK, 770, 470, 110, 110, 'Lúa, apagada'), l1, go),
            withAnims(bubble('Se me ha apagado la luz… y ya nadie me ve.', 810, 300, 370, 128), b2),
            withAnims(bubble('La luz no se pierde: se comparte. Vuela al claro del viejo roble.', 340, 276, 430, 150), b3)],
            notes: 'Un diálogo por turnos: cada bocadillo usa «Aparecer y desaparecer», así que se va en cuanto habla el otro personaje. El búho entra rebotando con sonido (Pop). En el último clic Lúa sale volando hacia el roble por una trayectoria dibujada.' };
        })(),

        (() => {   // Scene 4: the others arrive one by one, and her light comes back.
          const OAK = 'M50 18 C20 18 6 36 12 52 C0 66 16 84 34 78 C42 92 60 92 66 80 C86 86 100 66 88 52 C96 34 80 16 64 22 C60 14 54 14 50 18 Z';
          return { layout: 'blank', bg: NIGHT, transition: 'fade', back: [...sky(), shape('custom', 210, 40, 860, 560, '#0e2a24', { path: OAK, opacity: 90 }),
            R(600, 420, 80, 300, '#0e2a24'), ...pines()], extra: [
            ...scene(4, 'El claro del viejo roble'), band(2),
            img(DARK, 515, 245, 150, 150, 'Lúa, apagada'),
            withAnims(say('En el claro, Lúa no estaba sola. Una a una, fueron llegando…', 0), A('current-visible')),
            ...(() => { const flies = ring.map(([x, y], i) => withAnims(img(LIT, x - 38, y - 38, 76, 76, 'Luciérnaga'), A('zoom-in', { start: 'afterPrev', duration: 350, ...(i % 2 ? {} : { sound: 'chime' }) })));
              return [at(glow(390, 120, 400, GOLD, '#0e2a24', 70), 'zoom-in', { duration: 1200 }), ...flies]; })(),
            withAnims(img(LIT, 515, 245, 150, 150, 'Lúa, encendida'), A('fade-in', { start: 'withPrev', duration: 1200, sound: 'chime' })),
            withAnims(say('Cada una le dio un poquito de su luz. Y Lúa volvió a brillar.', 1), A('fade-in', { start: 'withPrev' }))],
            notes: 'Primer clic: las ocho luciérnagas llegan en cadena («después de la anterior»), con campanilla una sí y otra no. Segundo clic: un brillo grande crece detrás de Lúa y su luz vuelve (tres animaciones «con la anterior»).' };
        })(),

        { layout: 'blank', bg: NIGHT, transition: 'zoom', back: [...sky(false), ...pines()], extra: [
          at(glow(390, 20, 500, '#fff4c2', NIGHT, 45), 'fade-in', { start: 'afterPrev', duration: 1500 }),
          at(E(490, 120, 300, 300, MOON, { fill2: '#e3d6a6', gradType: 'radial' }), 'zoom-in', { start: 'withPrev', duration: 1200 }),
          at(text('· Y COLORÍN COLORADO, ESTE CUENTO SE HA ALUMBRADO ', 455, 85, 370, 370, { fontFamily: FF.lora, fontSize: 25, curve: 100, color: GOLD, textAlign: 'center', letterSpacing: 2 }), 'spin', { start: 'afterPrev', duration: 1400 }),
          at(text('Fin', 440, 205, 400, 130, { fontFamily: FF.dancing, fontSize: 110, color: '#5b4520', textAlign: 'center' }), 'fade-up', { start: 'afterPrev' }),
          withAnims(img(LIT, 860, 130, 100, 100, 'Lúa, encendida'), A('path', { pathShape: 'loop', dx: -560, dy: 40, duration: 3200 })),
          at(text('La luz que compartes no se gasta.', 240, 600, 800, 56, { fontFamily: FF.lora, fontSize: 34, fontStyle: 'italic', color: TXT, textAlign: 'center' }), 'fade-in', { start: 'afterPrev' })],
          notes: 'La luna crece sola al llegar; el «colorín colorado» es texto curvo que entra girando. Con el clic, Lúa da una vuelta en bucle alrededor de la luna (trayectoria «Bucle») y aparece la moraleja.' },

        { title: 'Cómo está animado el cuento', layout: 'titleOnly', bg: '#0d2224', back: [glow(900, -200, 600, '#2b5c55', '#0d2224', 40)], extra: [
          tableBlock({ x: 70, y: 175, w: 1140, h: 420, fontSize: 22, header: true, headBg: GOLD, headFg: '#1c1608', stroke: '#2f4d48', color: TXT, banded: true, band: '#ffffff', bandAlpha: 0.06, colW: [3, 5, 5],
            rows: [['Escena', 'Qué pasa', 'Animación'], ['1 · El bosque', 'Narración frase a frase', 'Aparecer y atenuar'], ['2 · El apagón', 'La luz se va y las amigas se marchan', 'Visible solo en su paso · Trayectoria · Desaparecer'],
              ['3 · El búho', 'Diálogo por turnos', 'Rebotar con sonido · Aparecer y desaparecer'], ['4 · El roble', 'Llegan una a una y vuelve la luz', 'Después de la anterior · Campanilla'],
              ['5 · Fin', 'La luna y el «colorín colorado»', 'Zoom · Girar · Bucle']] }),
          text('Panel de animación: el «Comienzo» de cada efecto decide si espera al clic o sigue solo.', 70, 625, 1140, 40, { fontSize: 22, color: DIM })],
          notes: 'La chuleta del narrador: qué efecto lleva cada escena. Sirve para preparar otro cuento con el mismo ritmo.' },

        { layout: 'blank', bg: NIGHT, back: [...sky(false), glow(-200, 300, 600, '#2b5c55', NIGHT, 40)], extra: [
          pollBlock({ kind: 'word', fontSize: 36, question: 'Una palabra: ¿qué sintió Lúa al volver a brillar?', options: [], x: 80, y: 50, w: 1120, h: 620, color: TXT })],
          notes: 'Nube de palabras desde el móvil: los niños escriben una palabra y las más repetidas salen más grandes. Buen momento para hablar de la moraleja.' },
      ]), TXT));
    } },

  // ============================================================================
  // 2 · Ferries between islands: routes on a map that draw themselves while the
  //     boat follows them (same points, same duration), three at once, a stopover.
  show_anim_ferries: { name: 'Ferris entre islas: rutas de verano', cat: 'showcase',
    summary: 'Trayectorias sobre un mapa: barcos que giran con el camino, rutas que se dibujan a su paso, tres líneas a la vez, escala y horarios',
    make: () => {
      const SEA = '#bfe4ea', SEA2 = '#a6d6df', INK = '#12343b', SAND = '#f3e4c0', GREEN = '#a9d09b', CARD = '#ffffff', MUTE = '#4f6d73';
      const LINES = { l1: '#e8553e', l2: '#1f8fbf', l3: '#f2a20c', l4: '#7a4fc4' };
      const BLOB = 'M18 38 C12 14 42 4 60 14 C80 4 99 28 88 50 C99 72 76 96 54 88 C34 98 4 82 12 62 C2 54 8 44 18 38 Z';
      const isle = (x, y, w, h) => [shape('custom', x, y, w, h, SAND, { path: BLOB, stroke: '#e2c98f', strokeWidth: 3 }),
        shape('custom', x + w * 0.18, y + h * 0.2, w * 0.62, h * 0.58, GREEN, { path: BLOB, opacity: 85 })];
      const P = { mayor: [440, 470], sal: [800, 420], norte: [640, 255], faro: [760, 590] };
      const NAMES = { mayor: 'Puerto Mayor', sal: 'Sal Grande', norte: 'Isleta Norte', faro: 'Faro Sur' };
      // A route from a to b with a gentle bend: points relative to a (for the boat) and the same curve on the slide (for the line).
      const route = (a, b, bend = 0.18) => { const [x0, y0] = P[a], [x1, y1] = P[b], dx = x1 - x0, dy = y1 - y0, nx = -dy * bend, ny = dx * bend;
        return [[Math.round(dx / 3 + nx), Math.round(dy / 3 + ny)], [Math.round(dx * 2 / 3 + nx), Math.round(dy * 2 / 3 + ny)], [dx, dy]]; };
      const line = (a, rel, color, props = {}) => ink(curvePts(P[a], rel), color, 5, props);
      const boatSVG = c => svgURL(80, 40, `<path d="M4 8 H56 Q78 20 56 32 H4 Q0 20 4 8 Z" fill="#ffffff" stroke="${INK}" stroke-width="2.5"/><rect x="14" y="13" width="30" height="14" rx="3" fill="${c}"/><circle cx="56" cy="20" r="3.5" fill="${INK}"/>`);
      const boat = (at_, c, props = {}) => img(boatSVG(c), P[at_][0] - 35, P[at_][1] - 18, 70, 36, 'Ferri', props);
      const sail = (rel, props = {}) => path(rel, { turn: 'follow', duration: 3000, ...props });
      const map = (labels = true) => [R(0, 0, 1280, 720, SEA, { fill2: SEA2, gradType: 'radial' }),
        ...Array.from({ length: 10 }, (_, i) => { const x0 = 80 + (i * 263) % 1100, y0 = 60 + (i * 157) % 600; return ink(Array.from({ length: 11 }, (_, k) => [x0 + k * 5, y0 + 4 * Math.sin(k / 10 * 4 * Math.PI)]), '#ffffff', 2, { opacity: 60 }); }),
        ...isle(30, 410, 440, 300), ...isle(780, 330, 420, 290), ...isle(560, 110, 240, 160), ...isle(720, 585, 200, 120),
        shape('star4', 1160, 610, 70, 70, INK, { opacity: 80 }), text('N', 1160, 572, 70, 36, { fontSize: 22, fontWeight: 800, color: INK, textAlign: 'center' }),
        ...(labels ? Object.entries(P).map(([k, [x, y]]) => E(x - 9, y - 9, 18, 18, INK, { stroke: '#ffffff', strokeWidth: 3 })) : [])];
      const tag = (k, dx = 16, dy = 6) => text(NAMES[k], P[k][0] + dx, P[k][1] + dy, 200, 36, { fontSize: 20, fontWeight: 700, color: INK });
      const panel = (html, x, y, w, h, props = {}) => card(html, x, y, w, h, CARD, { fontSize: 22, color: INK, radius: 16, shadow: { x: 0, y: 6, blur: 18, color: '#12343b33' }, pad: [20, 24, 20, 24], ...props });
      const head = (k, t) => `<div style="font-size:15px;letter-spacing:3px;font-weight:800;color:${MUTE}">${k}</div><div style="font-size:34px;font-weight:800;line-height:1.15;margin-top:4px">${t}</div>`;
      const L1 = route('mayor', 'sal', 0.15), L2 = route('mayor', 'norte', -0.2), L3 = route('sal', 'faro', 0.2), L4a = route('sal', 'norte', 0.12), L4b = route('norte', 'mayor', 0.12);
      const key = (c, t, sub) => `<div style="display:flex;align-items:center;gap:12px;margin:6px 0"><span style="display:inline-block;width:34px;height:6px;border-radius:3px;background:${c}"></span><b>${t}</b><span style="color:${MUTE}">${sub}</span></div>`;

      return numbered(ink2(build({ name: 'Ferris entre islas', palette: 'ocean', fonts: 'clean', title: { color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: SEA, transition: 'fade', back: map(false), extra: [
          panel(`<div style="font-size:16px;letter-spacing:4px;font-weight:800;color:${LINES.l1}">ISLAS ALBAS · VERANO 2027</div><div style="font-size:58px;font-weight:800;line-height:1.02;margin:10px 0 12px">Ferris entre islas</div><div style="color:${MUTE}">Cuatro puertos, cuatro líneas: rutas, escalas y horarios.</div>`, 60, 50, 470, 270),
          line('mayor', L1, LINES.l1, { opacity: 55, animation: A('draw', { start: 'afterPrev', duration: 3200, delay: 400 }) }),
          withAnims(boat('mayor', LINES.l1), sail(L1, { start: 'withPrev', duration: 3200, delay: 400, sound: 'whoosh' }))],
          notes: 'La portada se anima sola: la ruta se dibuja (Dibujar) a la vez que el ferri la recorre (Trayectoria «con la anterior», misma duración y mismos puntos). El barco gira con el camino («Seguir el camino»). Islas y datos inventados.' },

        { layout: 'blank', bg: SEA, transition: 'fade', back: map(false), extra: [
          panel(head('EL ARCHIPIÉLAGO', 'Cuatro islas, cuatro puertos'), 60, 50, 470, 140),
          ...Object.keys(P).flatMap((k, i) => [withAnims(E(P[k][0] - 12, P[k][1] - 12, 24, 24, LINES[['l1', 'l2', 'l3', 'l4'][i]], { stroke: '#ffffff', strokeWidth: 4 }), A('bounce', { start: i ? 'afterPrev' : 'click', duration: 600, sound: 'pop' })),
            withAnims(tag(k, k === 'mayor' ? -220 : 18, k === 'norte' ? -46 : 4), A('fade-right', { start: 'withPrev', duration: 400 }))]),
          withAnims(panel(`<b>Puerto Mayor</b> es la base: de allí salen tres de las cuatro líneas.`, 60, 560, 340, 110, { fontSize: 20 }), A('fade-up'))],
          notes: 'Un clic: los cuatro puertos caen uno tras otro (Rebotar con sonido Pop) y su nombre entra a la vez («con la anterior»). El segundo clic añade la nota de Puerto Mayor.' },

        { layout: 'blank', bg: SEA, transition: 'fade', back: map(), extra: [
          panel(head('LÍNEA 1', 'Puerto Mayor → Sal Grande'), 60, 50, 520, 140),
          tag('mayor', -180, 10), tag('sal', 20, -40),
          line('mayor', L1, LINES.l1, { animation: A('draw', { duration: 3500 }) }),
          withAnims(boat('mayor', LINES.l1), sail(L1, { start: 'withPrev', duration: 3500, sound: 'whoosh' })),
          ...[['35 min', 'de travesía'], ['8', 'salidas al día'], ['420', 'plazas por barco']].map(([n, l], i) =>
            withAnims(panel(`<div style="font-size:40px;font-weight:800;color:${LINES.l1};line-height:1">${n}</div><div style="color:${MUTE};font-size:18px;margin-top:4px">${l}</div>`, 970, 50 + i * 125, 250, 108, { pad: [14, 20, 14, 20] }),
              A('fade-left', { start: 'afterPrev', duration: 400 })))],
          notes: 'Un solo clic: la línea se dibuja mientras el barco la recorre, y al llegar entran las tres cifras de la ruta, una tras otra. Truco: el dibujo y la trayectoria tienen los mismos puntos y la misma duración.' },

        { layout: 'blank', bg: SEA, transition: 'fade', back: map(), extra: [
          panel(`<div style="font-size:30px;font-weight:800;margin-bottom:8px">Las tres líneas a la vez</div>${key(LINES.l1, 'L1', '35 min')}${key(LINES.l2, 'L2', '25 min')}${key(LINES.l3, 'L3', '20 min')}<div style="color:${MUTE};font-size:17px;margin-top:8px">En pantalla, 1 segundo = 10 minutos de mar</div>`, 60, 40, 400, 220, { fontSize: 20 }),
          line('mayor', L1, LINES.l1, { opacity: 45 }), line('mayor', L2, LINES.l2, { opacity: 45 }), line('sal', L3, LINES.l3, { opacity: 45 }),
          withAnims(boat('mayor', LINES.l1), sail(L1, { duration: 3500 })),
          withAnims(boat('mayor', LINES.l2), sail(L2, { start: 'withPrev', duration: 2500 })),
          withAnims(boat('sal', LINES.l3), sail(L3, { start: 'withPrev', duration: 2000 }))],
          notes: 'Tres trayectorias «con la anterior», cada una con su duración: llegan en el orden real de las travesías. Cambiar la duración en el Panel de animación es lo que hace la escala de tiempo.' },

        (() => {   // A stopover: two paths in a row on the same boat, with a wait between them.
          const go1 = sail(L4a, { duration: 2400 }), badge = A('zoom-in', { start: 'afterPrev', duration: 400, sound: 'chime' });
          const go2 = sail(L4b, { start: 'afterPrev', delay: 1500, duration: 2800 }), bye = A('fade-out', { start: 'withPrev', delay: 1500 });
          return { layout: 'blank', bg: SEA, transition: 'fade', back: map(), extra: [
            panel(head('LÍNEA 4 · SOLO FINES DE SEMANA', 'Con escala en Isleta Norte'), 60, 40, 470, 150),
            tag('sal', 20, -40), tag('norte', 20, -10), tag('mayor', -180, 10),
            line('sal', L4a, LINES.l4, { opacity: 50, dash: 'dash' }), line('norte', L4b, LINES.l4, { opacity: 50, dash: 'dash' }),
            withAnims(text('Escala · 10 min', P.norte[0] - 92, P.norte[1] - 112, 184, 44, { fontSize: 20, fontWeight: 800, color: '#ffffff', bg: LINES.l4, radius: 22, textAlign: 'center', vAlign: 'middle' }), badge, bye),
            withAnims(boat('sal', LINES.l4), go1, go2),
            panel('<b>Un barco, dos trayectorias</b> seguidas: la segunda espera 1,5 s (el retardo) y sale «después de la anterior».', 60, 560, 520, 110, { fontSize: 20 })],
            notes: 'El mismo objeto lleva dos trayectorias: la segunda empieza donde acaba la primera. Entre medias aparece la etiqueta de escala con campanilla, y se va cuando el barco zarpa.' };
        })(),

        { title: 'Horarios y plazas', layout: 'titleOnly', bg: '#eef7f8', back: [R(0, 0, 1280, 12, LINES.l2)], extra: [
          tableBlock({ x: 100, y: 180, w: 1080, h: 400, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#cfe3e7', banded: true, band: SEA, bandAlpha: 0.35, colW: [4, 2, 2, 2, 2],
            rows: [['Línea', 'Duración', 'Salidas al día', 'Plazas por barco', 'Plazas al día'], ['L1 · Mayor ⇄ Sal Grande', '35 min', '8', '420', '=C2*D2'], ['L2 · Mayor ⇄ Isleta Norte', '25 min', '6', '180', '=C3*D3'],
              ['L3 · Sal Grande ⇄ Faro Sur', '20 min', '5', '150', '=C4*D4'], ['L4 · Sal Grande → Norte → Mayor', '75 min', '2', '300', '=C5*D5'], ['<b>Total</b>', '', '=SUMA(ARRIBA)', '', '=SUMA(ARRIBA)']] }),
          text('Primera salida 7:30 · última 21:00 · llega 30 minutos antes de zarpar.', 100, 610, 900, 40, { fontSize: 22, color: MUTE })],
          notes: 'La última columna y los totales son fórmulas (=C2*D2 y =SUMA(ARRIBA)): si cambia el número de salidas, todo se recalcula. Datos inventados.' },

        { title: 'Pasajeros este verano', layout: 'titleOnly', bg: '#eef7f8', back: [R(0, 0, 1280, 12, LINES.l2)], extra: [
          chartBlock({ x: 80, y: 170, w: 780, h: 490, chartType: 'stacked', grid: true, legend: true, yTitle: 'miles de pasajeros',
            data: ['Junio', 'Julio', 'Agosto', 'Septiembre'].map((l, i) => ({ label: l, value: [38, 61, 72, 30][i] })), seriesName: 'L1', color: LINES.l1,
            series: [{ name: 'L2', values: [14, 25, 31, 11], color: LINES.l2 }, { name: 'L3', values: [9, 16, 19, 7], color: LINES.l3 }, { name: 'L4', values: [3, 6, 7, 2], color: LINES.l4 }] }),
          ...[['129.000', 'pasajeros en agosto', LINES.l1], ['+18 %', 'que el verano pasado', LINES.l2], ['94 %', 'de salidas puntuales', '#b86f00']].map(([n, l, c], i) =>
            withAnims(panel(`<div style="font-size:44px;font-weight:800;color:${c};line-height:1">${n}</div><div style="color:${MUTE};font-size:19px;margin-top:6px">${l}</div>`, 900, 175 + i * 165, 300, 140), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 450 })))],
          notes: 'Barras apiladas por línea y mes (datos inventados). Con un clic entran las tres cifras clave en cadena.' },

        { layout: 'blank', bg: '#eef7f8', back: [R(0, 0, 1280, 12, LINES.l2)], extra: [
          pollBlock({ fontSize: 34, question: 'Este verano, ¿a qué isla irás primero?', options: ['Sal Grande', 'Isleta Norte', 'Faro Sur', 'Ninguna, me quedo'], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Votación desde el móvil con el QR. Sirve para avisar de qué líneas irán más llenas.' },

        { layout: 'blank', bg: SEA, transition: 'zoom', back: map(false), extra: [
          panel(`<div style="font-size:64px;font-weight:800;line-height:1">¡Buen viaje!</div><div style="color:${MUTE};margin-top:12px">Billetes en el puerto y en la web de las Islas Albas.</div>`, 60, 50, 560, 200),
          withAnims(boat('mayor', LINES.l1), path([[180, 40], [420, 120], [760, 150]], { turn: 'follow', start: 'afterPrev', duration: 3600, delay: 300, sound: 'whoosh' }), A('fade-out', { start: 'afterPrev', duration: 500 }))],
          notes: 'Despedida: el ferri zarpa solo al llegar a la diapositiva, recorre la costa y desaparece al final (Trayectoria y, después, Desaparecer en el mismo objeto).' },
      ]), INK));
    } },

  // ============================================================================
  // 3 · An office foosball tournament: everything chained like a game, each move
  //     with its sound — clicks for passes, a whoosh for the shot, drums and applause.
  show_anim_foosball: { name: 'Torneo de futbolín de la oficina', cat: 'showcase',
    summary: 'Animaciones encadenadas con sonidos como un juego: pases con clic, tiro, gol con aplausos, cuadro que avanza, tabla y porra',
    make: () => {
      const BG = '#140a26', BG2 = '#24103f', NEON = '#39ff88', PINK = '#ff3d7f', YEL = '#ffe14d', RED = '#ff4d5e', BLUE = '#3da9ff', W = '#f5f0ff', DIM = '#b3a6d6';
      const FIELD = '#1c8a4b', WOOD = '#6b4423';
      const glowTxt = c => ({ x: 0, y: 0, blur: 18, color: c });
      const H = (t, x, y, w, h, size, color, p = {}) => text(t, x, y, w, h, { fontFamily: FF.bebas, fontSize: size, color, lineHeight: 1, ...p });
      const backdrop = () => [R(0, 0, 1280, 720, BG2, { fill2: BG, gradType: 'radial' }), ...Array.from({ length: 14 }, (_, i) => R(i * 96, 0, 2, 720, '#ffffff', { opacity: 4 }))];
      // The table seen from above: field, lines, goals and the eight rods with their players.
      const fx = 190, fy = 170, fw = 900, fh = 480;
      const RODS = [[250, RED, [410]], [350, RED, [330, 490]], [450, BLUE, [290, 410, 530]], [560, RED, [250, 300, 410, 520, 570]], [720, BLUE, [250, 300, 410, 520, 570]], [830, RED, [290, 450, 530]], [930, BLUE, [330, 490]], [1030, BLUE, [410]]];
      const tok = (x, y, c) => shape('rounded', x - 14, y - 22, 28, 44, c, { radius: 8, stroke: '#00000055', strokeWidth: 2 });
      const table = () => [R(fx - 30, fy - 30, fw + 60, fh + 60, WOOD, { radius: 14 }), R(fx, fy, fw, fh, FIELD, { fill2: '#167540', gradType: 'radial' }),
        R(fx + fw / 2 - 2, fy, 4, fh, '#ffffff', { opacity: 70 }), E(fx + fw / 2 - 70, fy + fh / 2 - 70, 140, 140, 'none', { stroke: '#ffffffb0', strokeWidth: 4 }),
        R(fx, fy + 150, 90, 180, 'none', { stroke: '#ffffffb0', strokeWidth: 4 }), R(fx + fw - 90, fy + 150, 90, 180, 'none', { stroke: '#ffffffb0', strokeWidth: 4 }),
        R(fx - 26, fy + 180, 26, 120, '#0b0b0b'), R(fx + fw, fy + 180, 26, 120, '#0b0b0b'),
        ...RODS.map(([x]) => R(x - 4, fy - 40, 8, fh + 80, '#c9ccd6', { fill2: '#7d8190', gradAngle: 0 }))];
      const players = (skip = []) => RODS.flatMap(([x, c, ys]) => ys.filter(y => !skip.some(([sx, sy]) => sx === x && sy === y)).map(y => tok(x, y, c)));
      const TEAMS = [['Los Cafeteros', '#ff8a3d'], ['Real Grapadora', '#3da9ff'], ['Rodillos FC', '#c86bff'], ['Inter de Becarios', '#39ff88'],
        ['Atlético Fotocopia', '#ffe14d'], ['Deportivo Excel', '#2ee6c9'], ['Sporting Reunión', '#ff3d7f'], ['Unión Teletrabajo', '#9ab0ff']];

      return numbered(ink2(build({ name: 'Torneo de futbolín', palette: 'violet', fonts: 'bold', title: { color: W, size: 64 }, body: { color: W } }, [
        { layout: 'blank', bg: BG, transition: 'zoom', back: backdrop(), extra: [
          glow(-200, -200, 700, PINK, BG, 30), glow(820, 260, 600, NEON, BG, 18),
          kicker('COPA DE LA 3.ª PLANTA · EDICIÓN 4', 80, 130, 700, NEON),
          H('TORNEO DE<br>FUTBOLÍN', 74, 172, 700, 270, 112, W, { shadow: glowTxt(PINK) }),
          text('Viernes 17:30 · sala del café · ocho equipos, una copa', 80, 480, 700, 44, { fontSize: 26, color: DIM }),
          R(780, 160, 420, 400, WOOD, { radius: 18 }), R(800, 180, 380, 360, FIELD, { radius: 6 }), R(988, 180, 4, 360, '#ffffff', { opacity: 70 }),
          E(930, 300, 120, 120, 'none', { stroke: '#ffffffb0', strokeWidth: 4 }), R(780, 300, 20, 120, '#0b0b0b'), R(1180, 300, 20, 120, '#0b0b0b'),
          withAnims(E(820, 470, 30, 30, '#ffffff', { stroke: '#cccccc', strokeWidth: 2 }),
            path([[50, -110], [95, -155]], { start: 'afterPrev', duration: 800, sound: 'click' }), path([[60, 60], [110, 100]], { start: 'afterPrev', duration: 700, sound: 'click' }),
            path([[80, -40], [135, -70]], { start: 'afterPrev', duration: 450, sound: 'whoosh' })),
          at(H('¡GOL!', 880, 580, 300, 100, 90, YEL, { textAlign: 'center', shadow: glowTxt(YEL) }), 'bounce', { start: 'afterPrev', sound: 'applause' })],
          notes: 'La portada juega sola al llegar: tres trayectorias seguidas en la misma bola, cada una con su sonido (clic, clic y silbido), y el «¡GOL!» rebota con aplausos. Todo va «después de la anterior».' },

        { title: 'LOS OCHO EQUIPOS', layout: 'titleOnly', bg: BG, back: backdrop(), extra: [
          ...TEAMS.map(([n, c], i) => withAnims(card(`<div style="font-family:${FF.bebas};font-size:20px;letter-spacing:3px;color:${c}">EQUIPO ${i + 1}</div><div style="font-family:${FF.bebas};font-size:40px;line-height:1.05;margin-top:6px">${n}</div>`,
            80 + (i % 4) * 285, 190 + Math.floor(i / 4) * 215, 265, 190, '#ffffff0d', { color: W, borderColor: c, radius: 16, shadow: glowTxt(c + '88'), vAlign: 'middle' }),
            A('flip', { start: i ? 'afterPrev' : 'click', duration: 280, sound: 'pop' }))),
          text('Parejas sorteadas el lunes · nombres elegidos por cada equipo', 80, 640, 1100, 36, { fontSize: 22, color: DIM })],
          notes: 'Como en la pantalla de selección de un videojuego: un clic y las ocho fichas se voltean seguidas, cada una con un «pop». Duración corta (0,28 s) para que tenga ritmo.' },

        (() => {   // House rules: each one with a click; the last one gets struck out.
          const RULES = ['Partidos a 7 goles o 5 minutos', 'Se saca desde el centro tras cada gol', 'Cambio de lado en el descanso', 'Si la bola sale, saca quien no la tocó'];
          const ruleRow = (t, i, c) => text(`<span style="font-family:${FF.bebas};font-size:40px;color:${c};margin-right:18px">0${i + 1}</span>${t}`, 80, 190 + i * 82, 700, 70, { fontSize: 30, color: W, vAlign: 'middle' });
          return { title: 'REGLAS DE LA CASA', layout: 'titleOnly', bg: BG, back: backdrop(), extra: [
            ...RULES.map((t, i) => withAnims(ruleRow(t, i, NEON), A('fade-right', { duration: 350, sound: 'click' }))),
            withAnims(ruleRow('La «ruleta»: girar la barra entera', 4, PINK), A('fade-right', { duration: 350, sound: 'click' }), A('strike', { duration: 500, sound: 'pop' })),
            at(text('PROHIBIDA', 790, 522, 210, 56, { fontFamily: FF.bebas, fontSize: 40, color: BG, bg: PINK, radius: 8, textAlign: 'center', vAlign: 'middle', rotation: -6 }), 'zoom-in', { start: 'withPrev', duration: 300 }),
            card(`<div style="font-family:${FF.bebas};font-size:26px;letter-spacing:3px;color:${YEL}">CADA PARTIDO</div>`, 880, 190, 320, 70, '#ffffff0d', { color: W, radius: 14, textAlign: 'center', vAlign: 'middle', pad: [6, 10, 6, 10] }),
            timer(300, 880, 270, 320, { style: 'digital', auto: false, color: YEL, h: 130, w: 320 }),
            text('El reloj arranca con un clic en él al empezar cada partido.', 880, 420, 320, 90, { fontSize: 20, color: DIM, textAlign: 'center' })],
            notes: 'Cada regla entra con su clic y su sonido. La quinta entra y, en el clic siguiente, se tacha (efecto Tachar con «pop») mientras aparece el sello de «prohibida». La cuenta atrás de 5 minutos está parada hasta que se pulsa.' };
        })(),

        (() => {   // A move: three paths on the ball, each kick turns its player (spin), goal, applause, a light on the score.
          const p1 = path([[110, -90], [210, -110]], { duration: 700, sound: 'click' }), k1 = A('spin360', { start: 'withPrev', duration: 400 });
          const p2 = path([[150, 40], [270, 150]], { start: 'afterPrev', duration: 700, sound: 'click' }), k2 = A('spin360', { start: 'withPrev', duration: 400 });
          const p3 = path([[150, -10], [272, -40]], { start: 'afterPrev', duration: 450, sound: 'whoosh' }), k3 = A('spin360', { start: 'withPrev', duration: 400 });
          const gol = A('bounce', { start: 'afterPrev', duration: 700, sound: 'applause' }), led = A('zoom-in', { start: 'withPrev', duration: 400 });
          return { layout: 'blank', bg: BG, transition: 'fade', back: backdrop(), extra: [
            H('UNA JUGADA EN UN SOLO CLIC', 80, 40, 700, 70, 56, W),
            text('<b style="color:#ff4d5e">ROJOS</b>', 820, 46, 120, 40, { fontSize: 24, color: W }),
            ...Array.from({ length: 7 }, (_, i) => E(940 + i * 40, 54, 26, 26, '#ffffff', { opacity: 15 })),
            withAnims(E(940, 54, 26, 26, RED, { stroke: '#ffffff', strokeWidth: 2 }), led),
            ...table(), ...players([[350, 330], [560, 300], [830, 450]]),
            withAnims(tok(350, 330, RED), k1), withAnims(tok(560, 300, RED), k2), withAnims(tok(830, 450, RED), k3),
            withAnims(E(336, 396, 28, 28, '#ffffff', { stroke: '#bbbbbb', strokeWidth: 2 }), p1, p2, p3),
            withAnims(H('¡GOOOL!', 420, 330, 440, 150, 130, YEL, { textAlign: 'center', vAlign: 'middle', bg: '#140a26dd', radius: 24, shadow: glowTxt('#000000') }), gol)],
          notes: 'Un solo clic y la jugada entera: tres trayectorias en la bola, encadenadas, y en cada toque el jugador da una vuelta («con la anterior»). Pase, pase y tiro suenan distinto (clic, clic, silbido); el gol llega con aplausos y se enciende la primera luz del marcador.' };
        })(),

        (() => {   // The bracket: each round with one click, the winners slide in with a pop.
          const slot = (t, x, y, c, props = {}) => text(t, x, y, 230, 46, { fontFamily: FF.bebas, fontSize: 28, color: W, bg: '#ffffff12', radius: 10, pad: [0, 14, 0, 14], vAlign: 'middle', borderColor: c, ...props });
          const ys = TEAMS.map((_, i) => 160 + i * 62), mid = (a, b) => (a + b) / 2;
          const order = [0, 1, 2, 3, 4, 5, 6, 7], semis = [0, 3, 5, 7], fin = [0, 7];
          const sy = [0, 1, 2, 3].map(k => mid(ys[2 * k], ys[2 * k + 1])), fy2 = [mid(sy[0], sy[1]), mid(sy[2], sy[3])], wy = mid(fy2[0], fy2[1]);
          const link = (x0, y0, x1, y1) => [R(x0, y0 + 22, (x1 - x0) / 2, 3, '#ffffff', { opacity: 30 }), R(x0 + (x1 - x0) / 2, Math.min(y0, y1) + 22, 3, Math.abs(y1 - y0) + 3, '#ffffff', { opacity: 30 }), R(x0 + (x1 - x0) / 2, y1 + 22, (x1 - x0) / 2, 3, '#ffffff', { opacity: 30 })];
          return { title: 'EL CUADRO', layout: 'titleOnly', bg: BG, back: backdrop(), extra: [
            ...order.flatMap(i => link(310, ys[i], 380, sy[i >> 1])), ...[0, 1, 2, 3].flatMap(k => link(610, sy[k], 680, fy2[k >> 1])), ...[0, 1].flatMap(k => link(910, fy2[k], 980, wy)),
            ...order.map(i => slot(TEAMS[i][0], 80, ys[i], TEAMS[i][1] + '88', { fontSize: 24 })),
            ...semis.map((i, k) => withAnims(slot(TEAMS[i][0], 380, sy[k], TEAMS[i][1]), A('fade-right', { start: k ? 'afterPrev' : 'click', duration: 300, sound: 'pop' }))),
            ...fin.map((i, k) => withAnims(slot(TEAMS[i][0], 680, fy2[k], TEAMS[i][1]), A('fade-right', { start: k ? 'afterPrev' : 'click', duration: 300, sound: 'pop' }))),
            withAnims(slot('¿ ?', 980, wy, YEL, { textAlign: 'center', color: YEL, fontSize: 34 }), A('bounce', { duration: 600, sound: 'drumroll' })),
            text('CUARTOS', 80, 652, 230, 30, { fontFamily: FF.bebas, fontSize: 22, color: DIM, letterSpacing: 3 }), text('SEMIFINALES', 380, 652, 230, 30, { fontFamily: FF.bebas, fontSize: 22, color: DIM, letterSpacing: 3 }),
            text('FINAL', 680, 652, 230, 30, { fontFamily: FF.bebas, fontSize: 22, color: DIM, letterSpacing: 3 }), text('CAMPEÓN', 980, 652, 230, 30, { fontFamily: FF.bebas, fontSize: 22, color: YEL, letterSpacing: 3 }),
            withAnims(shape('star', 1050, 190, 90, 90, YEL, { stroke: '#ffffff', strokeWidth: 2 }), A('spin', { start: 'afterPrev', duration: 900 }))],
          notes: 'Tres clics, tres rondas: los ganadores de cada una avanzan en cadena con un «pop». En el tercero suena el redoble y aparece el hueco del campeón… que se decide en la porra del final.' };
        })(),

        { title: 'FASE DE GRUPOS · GRUPO A', layout: 'titleOnly', bg: BG, back: backdrop(), extra: [
          tableBlock({ x: 80, y: 190, w: 1120, h: 340, fontSize: 24, header: true, headBg: NEON, headFg: BG, stroke: '#3a2a5c', banded: true, band: '#ffffff', bandAlpha: 0.06, colW: [5, 2, 2, 2, 2, 2, 2, 2],
            rows: [['Equipo', 'PJ', 'G', 'P', 'GF', 'GC', 'Dif.', 'Puntos'], ['Los Cafeteros', '3', '3', '0', '21', '9', '=E2-F2', '=C2*3'], ['Unión Teletrabajo', '3', '2', '1', '18', '15', '=E3-F3', '=C3*3'],
              ['Inter de Becarios', '3', '1', '2', '15', '20', '=E4-F4', '=C4*3'], ['Real Grapadora', '3', '0', '3', '11', '21', '=E5-F5', '=C5*3']] }),
          text('Diferencia y puntos son fórmulas: se actualizan al apuntar cada resultado. La fase de grupos solo ordena el cuadro.', 80, 580, 1120, 70, { fontSize: 22, color: DIM })],
          notes: 'Tabla con fórmulas (=E2-F2 y =C2*3): se rellena durante el torneo y la clasificación se calcula sola. Resultados inventados.' },

        { title: 'DE DÓNDE SALEN LOS GOLES', layout: 'titleOnly', bg: BG, back: backdrop(), extra: [
          chartBlock({ x: 70, y: 170, w: 520, h: 470, chartType: 'doughnut', data: [{ label: 'Delantera', value: 58, color: PINK }, { label: 'Medio campo', value: 27, color: NEON }, { label: 'Defensa', value: 11, color: BLUE }, { label: 'Portero', value: 4, color: YEL }] }),
          chartBlock({ x: 640, y: 170, w: 580, h: 470, chartType: 'hbar', color: NEON, dataLabels: true, grid: false,
            data: [{ label: 'Marta (Cafeteros)', value: 14 }, { label: 'Iker (Teletrabajo)', value: 11 }, { label: 'Lucía (Becarios)', value: 9 }, { label: 'Pablo (Excel)', value: 8 }, { label: 'Nora (Cafeteros)', value: 7 }] })],
          notes: 'Datos inventados de la edición anterior: casi seis de cada diez goles salen de la delantera. A la derecha, la tabla de goleadores.' },

        { layout: 'blank', bg: BG, back: backdrop(), extra: [
          pollBlock({ fontSize: 34, question: 'La porra: ¿quién gana la final?', options: ['Los Cafeteros', 'Unión Teletrabajo', 'Me da igual'], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Votación con el móvil antes de la final. El que acierte, invita a café (o no).' },
      ]), W));
    } },

  // ============================================================================
  // 4 · A neighbourhood speech at the council: emphasis that follows the voice —
  //     focus (the rest dims), struck-out proposals, highlighted words, a circled point.
  show_anim_speech: { name: 'Discurso: salvemos la biblioteca', cat: 'showcase',
    summary: 'Énfasis al ritmo de un discurso: frase en foco y el resto atenuado, tachar, resaltar, subrayado y círculo a mano, cuenta atrás',
    make: () => {
      const PAPER = '#f5efe2', INK = '#2a241c', RED = '#b8322a', BLUE = '#2f5d8a', MUTE = '#7a6d5a', RULE = '#e2d6bd';
      const M = FF.merri;
      const notepad = () => [...Array.from({ length: 15 }, (_, i) => R(0, 100 + i * 42, 1280, 1, RULE, { opacity: 60 })), R(112, 0, 2, 720, RED, { opacity: 35 })];
      const head = t => text(t, 160, 50, 1000, 80, { fontFamily: M, fontSize: 42, color: INK, fontWeight: 700, vAlign: 'middle' });
      const wobble = (x0, x1, y, amp = 3, seed = 3) => { const r = rng(seed); return Array.from({ length: 24 }, (_, i) => [x0 + (x1 - x0) * i / 23, y + (r() - 0.5) * amp * 2 - i * 0.25]); };
      const oval = (cx, cy, rx, ry) => Array.from({ length: 46 }, (_, i) => { const a = -0.6 + i / 40 * 2 * Math.PI; return [cx + rx * Math.cos(a) * (1 + i * 0.002), cy + ry * Math.sin(a)]; });

      return numbered(ink2(build({ name: 'Una biblioteca no es un edificio', palette: 'paper', fonts: 'editorial', title: { color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: PAPER, transition: 'fade', back: notepad(), extra: [
          kicker('INTERVENCIÓN EN EL PLENO MUNICIPAL', 160, 130, 900, RED),
          text('Una biblioteca', 160, 175, 1040, 100, { fontFamily: M, fontSize: 76, color: INK, fontWeight: 700 }),
          text('no es un edificio.', 160, 280, 1040, 100, { fontFamily: M, fontSize: 76, color: RED, fontStyle: 'italic', fontWeight: 700 }),
          withAnims(ink(wobble(166, 960, 392, 3, 5), RED, 6), A('draw', { start: 'afterPrev', duration: 1100, delay: 500 })),
          text('Asociación vecinal Las Acacias · 12 de noviembre de 2026', 160, 560, 900, 40, { fontSize: 24, color: MUTE }),
          text('Cinco minutos de intervención', 160, 600, 900, 40, { fontSize: 24, color: MUTE, fontStyle: 'italic' })],
          notes: 'Al llegar, el subrayado rojo se traza solo bajo la segunda línea (Dibujar), como si se hiciera a mano. Empezar en silencio y leer el título despacio.' },

        (() => {   // The facts: each sentence in focus, the one before dims (semi-fade-out with the next one).
          const S = ['La biblioteca de Las Acacias abrió en <b>1987</b> y da servicio a <b>14 barrios</b>.', 'El presupuesto de 2027 propone cerrarla <b>por las tardes y los sábados</b>.',
            'El ahorro previsto: <b>86.000 € al año</b>, el 0,04 % del presupuesto.', 'Pero las tardes y los sábados reúnen <b>el 61 % de las visitas</b>.'];
          const ins = [], dims = [];
          S.forEach((_, i) => { ins.push(A('fade-in', { duration: 500 })); if (i) dims.push(A('semi-fade-out', { start: 'withPrev', duration: 500 })); });
          return { layout: 'blank', bg: PAPER, transition: 'fade', back: notepad(), extra: [head('Lo que está pasando'),
            ...S.map((t, i) => withAnims(text(`<span style="font-family:${M};color:${RED};margin-right:14px">${i + 1}.</span>${t}`, 160, 180 + i * 100, 1000, 84, { fontSize: 30, color: INK, vAlign: 'middle' }), ins[i], ...(dims[i] ? [dims[i]] : []))),
            text('Tiempo de intervención', 160, 618, 400, 36, { fontSize: 20, color: MUTE }),
            timer(300, 470, 610, 690, { style: 'bar', color: RED, h: 50, w: 690, sound: false })],
            notes: 'Una frase por clic: entra la nueva y la anterior se atenúa («Atenuar», con la anterior). Así el público lee solo lo que se está diciendo. La barra de abajo es la cuenta atrás de los cinco minutos del turno de palabra.' };
        })(),

        { layout: 'blank', bg: PAPER, transition: 'fade', back: notepad(), extra: [
          kicker('PRÉSTAMOS EN 2025', 160, 170, 600, MUTE),
          withAnims(text('41.236', 150, 200, 1000, 230, { fontFamily: M, fontSize: 200, color: INK, fontWeight: 700 }), A('zoom-in', { duration: 700 }), A('highlight-red', { start: 'click', duration: 800 })),
          at(text('libros, películas y revistas que salieron de un local de 400 m².', 160, 440, 1000, 50, { fontSize: 30, color: INK }), 'fade-up', { start: 'afterPrev' }),
          at(text('Más que el polideportivo y el centro cultural juntos.', 160, 520, 1000, 60, { fontFamily: M, fontSize: 34, fontStyle: 'italic', color: BLUE }), 'fade-in')],
          notes: 'Primer clic: la cifra crece y aparece su explicación. Segundo: la comparación. Tercero: la cifra se vuelve roja (Resaltar en rojo) justo al repetirla en voz alta. Datos inventados.' },

        (() => {   // Proposal against demand: each click strikes one out and writes its answer.
          const L = ['Cerrar por las tardes', 'Cerrar los sábados', 'Suprimir el club de lectura infantil'], Rt = ['Mantener el horario de tarde', 'Abrir los sábados con voluntariado', 'Club de lectura con la asociación'];
          const col = (t, x, c) => text(t, x, 160, 470, 50, { fontFamily: M, fontSize: 26, fontWeight: 700, color: c });
          const strikes = [], ans = [];
          L.forEach(() => { strikes.push(A('strike', { duration: 500 })); ans.push(A('fade-left', { start: 'afterPrev', duration: 450 })); });
          return { layout: 'blank', bg: PAPER, transition: 'fade', back: [...notepad(), R(660, 160, 2, 470, RULE)], extra: [
            head('Lo que se propone, lo que pedimos'),
            col('El presupuesto propone', 160, MUTE), col('La asociación pide', 700, RED),
            ...L.map((t, i) => withAnims(text(t, 160, 240 + i * 120, 460, 90, { fontSize: 30, color: INK, vAlign: 'middle' }), strikes[i])),
            ...Rt.map((t, i) => withAnims(text(`<span style="color:${RED}">→</span> ${t}`, 700, 240 + i * 120, 480, 90, { fontSize: 30, color: INK, vAlign: 'middle', fontWeight: 700 }), ans[i]))],
          notes: 'Tres clics: cada uno tacha una medida del presupuesto (Tachar) y escribe al lado lo que pide la asociación («después de la anterior»). Leer primero la medida y luego la alternativa.' };
        })(),

        { layout: 'blank', bg: PAPER, transition: 'fade', back: notepad(), extra: [
          head('Cada año, más vecinos'),
          chartBlock({ x: 140, y: 160, w: 720, h: 480, chartType: 'line', color: BLUE, grid: true, yTitle: 'préstamos',
            data: [['2019', 31200], ['2020', 18400], ['2021', 26900], ['2022', 33100], ['2023', 36800], ['2024', 39500], ['2025', 41236]].map(([label, value]) => ({ label, value })) }),
          withAnims(ink(oval(858, 306, 52, 40), RED, 5), A('draw', { duration: 1000 })),
          withAnims(card(`<div style="font-family:${M};font-size:46px;font-weight:700;color:${RED};line-height:1">+32 %</div><div style="margin-top:10px">desde 2019, con la caída de 2020 ya superada.</div>`, 910, 200, 300, 200, '#ffffff', { fontSize: 22, color: INK, borderColor: RULE, radius: 6 }), A('fade-left', { start: 'afterPrev' })),
          withAnims(card('<b>El 61 %</b> de esos préstamos se hace por la tarde o en sábado.', 910, 430, 300, 150, '#ffffff', { fontSize: 22, color: INK, borderColor: RULE, radius: 6 }), A('fade-left'))],
          notes: 'Un círculo a mano rodea el último punto (Dibujar sobre una tinta) y aparece la cifra. El segundo clic recuerda el dato que importa para el horario. Datos inventados.' },

        { layout: 'blank', bg: PAPER, transition: 'fade', back: notepad(), extra: [
          text('“', 110, 30, 220, 300, { fontFamily: M, fontSize: 200, color: RED, opacity: 40 }),
          text('Quien cierra una biblioteca', 140, 170, 1000, 90, { fontFamily: M, fontSize: 58, color: INK, textAlign: 'center' }),
          at(text('no ahorra:', 140, 270, 1000, 90, { fontFamily: M, fontSize: 58, color: INK, textAlign: 'center', fontWeight: 700 }), 'highlight-red', { duration: 800 }),
          at(text('aplaza el gasto.', 140, 370, 1000, 90, { fontFamily: M, fontSize: 58, color: INK, textAlign: 'center', fontWeight: 700 }), 'highlight-blue', { duration: 800 }),
          at(text('Lo dijo una bibliotecaria de este barrio en 1995. Sigue siendo verdad.', 140, 520, 1000, 50, { fontSize: 26, color: MUTE, textAlign: 'center', fontStyle: 'italic' }), 'fade-up')],
          notes: 'La cita entera está a la vista; cada clic resalta una parte (en rojo «no ahorra», en azul «aplaza el gasto») mientras se pronuncia. El último clic trae la atribución.' },

        (() => {   // Three demands: each in focus, then it steps back (fade-in-then-semi-out); a stamp to finish.
          const D = [['1', 'Mantener el horario', 'De lunes a viernes, de 9:00 a 20:30.'], ['2', 'Sábados abiertos', 'Con voluntariado de la asociación y un técnico municipal.'], ['3', 'Comisión de seguimiento', 'Vecinos y Ayuntamiento, cada trimestre.']];
          return { layout: 'blank', bg: PAPER, transition: 'fade', back: notepad(), extra: [head('Tres peticiones concretas'),
            ...D.map(([n, h, d], i) => withAnims(card(`<div style="font-family:${M};font-size:84px;font-weight:700;color:${RED};line-height:1">${n}</div><div style="font-family:${M};font-size:28px;font-weight:700;margin:14px 0 10px">${h}</div><div>${d}</div>`,
              160 + i * 345, 180, 315, 340, '#ffffff', { fontSize: 22, color: INK, borderColor: RULE, radius: 8 }), A(i < 2 ? 'fade-in-then-semi-out' : 'fade-in', { duration: 500 }))),
            withAnims(shape('seal', 1020, 540, 150, 150, RED, { html: 'COSTE<br>EXTRA<br>0 €', fontFamily: M, fontSize: 22, color: '#ffffff', fontWeight: 700, rotation: -12 }), A('spin', { duration: 700, sound: 'pop' })),
            text('Todas caben en el presupuesto actual.', 160, 570, 760, 50, { fontSize: 28, color: INK, fontStyle: 'italic' })],
            notes: 'Cada petición entra y, al llegar la siguiente, se queda a media luz («Aparecer y atenuar»). La última se queda entera, y el sello entra girando con un «pop»: el dato que más importa al pleno.' };
        })(),

        { layout: 'blank', bg: PAPER, back: notepad(), extra: [
          pollBlock({ kind: 'multi', fontSize: 32, question: '¿Cómo puedes ayudar? Elige todas las que quieras', options: ['Firmar la petición', 'Venir al pleno del 26', 'Ser voluntario', 'Contarlo en mi bloque'], x: 160, y: 60, w: 1040, h: 600 })],
          notes: 'Para la asamblea vecinal posterior al pleno: votación múltiple desde el móvil. Con el resultado se organizan los turnos de voluntariado.' },

        { layout: 'blank', bg: PAPER, transition: 'fade', back: notepad(), extra: [
          text('Gracias.', 160, 170, 1000, 160, { fontFamily: M, fontSize: 130, color: INK, fontWeight: 700 }),
          text('Seguimos abiertos. Os esperamos el sábado.', 160, 340, 1000, 60, { fontFamily: M, fontSize: 34, color: RED, fontStyle: 'italic' }),
          withAnims(ink(Array.from({ length: 60 }, (_, i) => { const t = i / 59; return [170 + 330 * t, 500 - 24 * Math.sin(t * Math.PI * 4) - 30 * t + (t > 0.8 ? (t - 0.8) * 120 : 0)]; }), INK, 4), A('draw', { start: 'afterPrev', duration: 1600, delay: 400 })),
          text('Junta de la Asociación vecinal Las Acacias · bibliotecaacacias@example.org', 160, 580, 1000, 40, { fontSize: 22, color: MUTE })],
          notes: 'La firma se traza sola al llegar (Dibujar). Terminar con contacto y una invitación concreta.' },
      ]), INK));
    } },

  // ============================================================================
  // 5 · A flat refurbishment on blueprint paper: walls, measurements and
  //     furniture that draw themselves; what is knocked down leaves; Transform.
  show_anim_blueprint: { name: 'Reforma de un piso: el plano', cat: 'showcase',
    summary: 'Plano que se dibuja solo: muros en cadena, cotas, derribo que desaparece, Transformar la nueva distribución, instalaciones y obra',
    make: () => {
      const BP = '#0d3a66', BP2 = '#0a2f54', LINE = '#e8f1ff', CY = '#7fd6ff', YEL = '#ffd84d', RED = '#ff6b6b', DIM = '#9fb8d6';
      const T = FF.space;
      const grid = () => [R(0, 0, 1280, 720, BP, { fill2: BP2, gradType: 'radial' }),
        ...Array.from({ length: 33 }, (_, i) => R(i * 40, 0, 1, 720, '#ffffff', { opacity: i % 5 ? 6 : 13 })), ...Array.from({ length: 18 }, (_, i) => R(0, i * 40, 1280, 1, '#ffffff', { opacity: i % 5 ? 6 : 13 }))];
      const ids = Object.fromEntries(['o1', 'o2', 'o3', 'o4', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'isl'].map(k => [k, uid()]));
      // (Straight walls: two points each — an ink through more points is drawn as a smooth curve.)
      const WALLS = { o1: [[136, 140], [904, 140]], o2: [[900, 140], [900, 640]], o3: [[904, 640], [136, 640]], o4: [[140, 640], [140, 140]], w1: [[420, 140], [420, 390]], w2: [[140, 390], [600, 390]], w3: [[370, 390], [370, 640]],
        w4: [[600, 390], [600, 640]], w5: [[760, 140], [760, 640]], w6: [[760, 330], [900, 330]] };
      const wall = (k, color = LINE, props = {}, pts = WALLS[k]) => withId(ink(pts, color, k[0] === 'o' ? 10 : 7, props), ids[k]);
      const walls = (keys, props = {}) => keys.map(k => wall(k, LINE, props));
      const lab = (t, sub, x, y, w, props = {}) => text(`<div style="font-weight:700">${t}</div><div style="font-size:16px;color:${DIM}">${sub}</div>`, x, y, w, 56, { fontFamily: T, fontSize: 20, color: LINE, textAlign: 'center', ...props });
      const OLD = [['Salón', '13,1 m²', 140, 245, 280], ['Cocina', '15,9 m²', 420, 245, 340], ['Dormitorio 1', '10,8 m²', 140, 490, 230], ['Dormitorio 2', '10,8 m²', 370, 490, 230], ['Pasillo', '5,5 m²', 600, 490, 160], ['Baño', '5,0 m²', 760, 210, 140], ['Entrada', '7,3 m²', 760, 460, 140]];
      const dims = () => [ink([[140, 672], [900, 672]], CY, 2), ink([[140, 662], [140, 682]], CY, 2), ink([[900, 662], [900, 682]], CY, 2), text('10,40 m', 460, 658, 120, 28, { fontFamily: T, fontSize: 18, color: CY, textAlign: 'center', bg: BP }),
        ink([[105, 140], [105, 640]], CY, 2), ink([[95, 140], [115, 140]], CY, 2), ink([[95, 640], [115, 640]], CY, 2), text('6,85 m', 66, 375, 78, 28, { fontFamily: T, fontSize: 18, color: CY, textAlign: 'center', bg: BP, rotation: -90 })];
      const side = (html, y, h, props = {}) => card(html, 950, y, 280, h, '#ffffff10', { fontFamily: T, fontSize: 19, color: LINE, borderColor: '#7fd6ff66', radius: 6, pad: [16, 18, 16, 18], ...props });
      const ttl = (k, t) => [text(k, 140, 22, 700, 26, { fontFamily: T, fontSize: 16, letterSpacing: 4, color: CY, fontWeight: 700 }), text(t, 140, 40, 760, 46, { fontFamily: T, fontSize: 34, color: '#ffffff', fontWeight: 700 })];
      const arc = (cx, cy, r, a0) => ink(Array.from({ length: 12 }, (_, i) => { const a = (a0 + i / 11 * 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }), DIM, 2);
      const doors = () => [arc(760, 622, 50, 180), arc(600, 450, 50, 270), arc(420, 390, 46, 0), arc(370, 390, 46, 180)];

      return numbered(ink2(build({ name: 'Reforma: calle del Olmo 14', palette: 'office', fonts: 'tech', title: { color: '#ffffff' }, body: { color: LINE } }, [
        { layout: 'blank', bg: BP, transition: 'fade', back: grid(), extra: [
          text('PROYECTO BÁSICO · PLANO 01', 80, 140, 600, 30, { fontFamily: T, fontSize: 18, letterSpacing: 5, color: CY, fontWeight: 700 }),
          text('Reforma<br>de un piso', 74, 180, 620, 220, { fontFamily: T, fontSize: 92, color: '#ffffff', fontWeight: 700, lineHeight: 1 }),
          text('Del plano actual a la nueva distribución, dibujado paso a paso.', 80, 410, 560, 80, { fontSize: 26, color: DIM }),
          ...Object.keys(WALLS).map((k, i) => withAnims(ink(WALLS[k].map(([x, y]) => [720 + (x - 140) * 0.6, 120 + (y - 140) * 0.6]), LINE, k[0] === 'o' ? 6 : 4), A('draw', { start: 'afterPrev', duration: i < 4 ? 400 : 300, delay: i ? 0 : 400 }))),
          tableBlock({ x: 720, y: 470, w: 456, h: 176, fontSize: 17, stroke: '#9fb8d6', colW: [2, 5], firstCol: true,
            rows: [['PROYECTO', 'Reforma interior · C/ del Olmo 14, 3.º B'], ['PLANO', '01 · Distribución'], ['ESCALA', '1:50'], ['FECHA', 'Octubre de 2026']] })],
          notes: 'La planta en pequeño se dibuja sola al llegar: primero el perímetro y luego cada tabique, «después de la anterior». Abajo, el cajetín del plano hecho con una tabla. Proyecto inventado.' },

        { layout: 'blank', bg: BP, transition: 'fade', back: grid(), extra: [
          ...ttl('ESTADO ACTUAL', 'Así está hoy el piso'),
          ...['o1', 'o2', 'o3', 'o4'].map((k, i) => withAnims(wall(k), A('draw', { start: i ? 'afterPrev' : 'click', duration: 450 }))),
          ...['w1', 'w2', 'w3', 'w4', 'w5', 'w6'].map(k => withAnims(wall(k), A('draw', { start: 'afterPrev', duration: 500 }))),
          ...doors().map(d => withAnims(d, A('draw', { start: 'afterPrev', duration: 250 }))),
          ...dims().map((d, i) => withAnims(d, A('fade-in', { start: i ? 'withPrev' : 'afterPrev', duration: 400 }))),
          ...OLD.map(([t, a, x, y, w], i) => withAnims(lab(t, a, x, y, w), A('fade-in', { start: i ? 'afterPrev' : 'click', duration: 200 }))),
          withAnims(side(`<div style="font-size:44px;font-weight:700;color:${YEL};line-height:1">71 m²</div><div style="margin-top:8px">construidos · 2 dormitorios · 1 baño · cocina cerrada</div>`, 140, 170), A('fade-left', { start: 'afterPrev' }))],
          notes: 'Primer clic: el perímetro y los tabiques se trazan en cadena, luego las puertas y las cotas. Segundo clic: los nombres de cada estancia aparecen uno tras otro y la ficha del piso.' },

        { layout: 'blank', bg: BP, transition: 'fade', back: grid(), extra: [
          ...ttl('DERRIBO', 'Lo que se tira'),
          ...walls(['o1', 'o2', 'o3', 'o4', 'w2', 'w3', 'w4', 'w5', 'w6']), ...doors(), ...dims(),
          withAnims(lab('Salón', '13,1 m²', 140, 245, 280), A('fade-out', { start: 'click', duration: 500 })),
          withAnims(lab('Cocina', '15,9 m²', 420, 245, 340), A('fade-out', { start: 'withPrev', duration: 500 })),
          ...OLD.slice(2).map(([t, a, x, y, w]) => lab(t, a, x, y, w)),
          withAnims(withId(ink(WALLS.w1, RED, 18, { opacity: 70 }), uid()), A('draw', { duration: 900, start: 'click' })),
          withAnims(side(`<div style="font-weight:700;color:${RED}">Tabique cocina-salón</div><div style="margin-top:6px">3,40 m de largo · no es muro de carga (informe de la arquitecta, 2/10).</div>`, 140, 170), A('fade-left', { start: 'withPrev' })),
          withAnims(wall('w1'), A('fade-out', { start: 'click', duration: 700, sound: 'pop' }))],
          notes: 'Primer clic: se marca en rojo el tabique (una tinta gruesa que se dibuja) y aparece la ficha. Segundo: el tabique desaparece con un «pop» y con él los nombres de las dos estancias. La siguiente diapositiva usa Transformar.' },

        { layout: 'blank', bg: BP, transition: 'fade', autoAnimate: true, back: grid(), extra: [
          ...ttl('NUEVA DISTRIBUCIÓN', 'Salón-cocina abierto y baño más grande'),
          ...walls(['o1', 'o2', 'o3', 'o4', 'w2', 'w3', 'w4', 'w5']), wall('w6', LINE, {}, [[760, 400], [900, 400]]), ...doors(), ...dims(),
          lab('Salón-cocina', '29,0 m²', 140, 245, 620, { color: YEL }), lab('Baño', '6,8 m²', 760, 245, 140, { color: YEL }),
          ...OLD.slice(2, 5).map(([t, a, x, y, w]) => lab(t, a, x, y, w)), lab('Entrada', '5,5 m²', 760, 500, 140),
          withAnims(withId(shape('rounded', 520, 180, 200, 56, 'none', { stroke: CY, strokeWidth: 3, sketch: true }), ids.isl), A('draw', { duration: 1000 })),
          withAnims(text('isla', 560, 188, 120, 40, { fontFamily: T, fontSize: 18, color: CY, textAlign: 'center' }), A('fade-in', { start: 'afterPrev' })),
          withAnims(side(`<div style="font-weight:700;color:${YEL}">Qué cambia</div><div style="margin-top:6px">El salón gana la cocina: <b>+15,9 m²</b> de espacio común.<br>El baño crece hasta <b>6,8 m²</b> y cabe una ducha de obra.</div>`, 140, 230), A('fade-left', { start: 'afterPrev' }))],
          notes: 'Transformar: los muros son los mismos objetos que en la diapositiva anterior; el del baño baja hasta su nueva posición al pasar de una a otra. Con el clic se dibuja la isla de la cocina a mano alzada y aparece el resumen.' },

        { layout: 'blank', bg: BP, transition: 'fade', back: grid(), extra: [
          ...ttl('INSTALACIONES', 'Electricidad y agua'),
          ...walls(['o1', 'o2', 'o3', 'o4', 'w2', 'w3', 'w4', 'w5'], { opacity: 45 }), wall('w6', LINE, { opacity: 45 }, [[760, 400], [900, 400]]),
          ...[[160, 160], [380, 250], [470, 160], [700, 160], [740, 300], [160, 600], [340, 600], [400, 600], [570, 600], [880, 360], [880, 600], [620, 520]].map(([x, y], i) =>
            withAnims(icon('bolt', x - 14, y - 14, 28, YEL), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 140, ...(i % 3 ? {} : { sound: 'click' }) }))),
          withAnims(ink([[900, 600], [830, 600], [830, 300], [800, 200], [740, 200], [700, 230], [560, 230]], CY, 5), A('draw', { duration: 2200 })),
          withAnims(ink([[830, 300], [880, 260], [880, 180]], CY, 5), A('draw', { start: 'withPrev', duration: 1200, delay: 600 })),
          side(`<div style="display:flex;gap:10px;align-items:center"><span style="color:${YEL};font-size:26px">⚡</span>12 puntos de luz y enchufes</div><div style="display:flex;gap:10px;align-items:center;margin-top:10px"><span style="display:inline-block;width:30px;height:5px;background:${CY}"></span>Agua: cocina y baño</div>`, 140, 140)],
          notes: 'Primer clic: los doce enchufes aparecen en cadena muy rápido (0,14 s), con un clic de sonido cada tres. Segundo: la tubería de agua se dibuja desde la entrada y una derivación sube al baño a la vez, con retardo.' },

        { layout: 'blank', bg: BP, transition: 'fade', back: grid(), extra: [
          ...ttl('MOBILIARIO', 'Comprobar que todo cabe'),
          ...walls(['o1', 'o2', 'o3', 'o4', 'w2', 'w3', 'w4', 'w5'], { opacity: 60 }), wall('w6', LINE, { opacity: 60 }, [[760, 400], [900, 400]]),
          ...[['rounded', 170, 300, 210, 70], ['ellipse', 300, 170, 90, 90], ['rounded', 520, 180, 200, 56], ['rect', 560, 147, 190, 28], ['rounded', 170, 450, 160, 130], ['rounded', 420, 470, 130, 140], ['rect', 790, 150, 90, 120], ['ellipse', 812, 300, 60, 60]].map(([k, x, y, w, h], i) =>
            withAnims(shape(k, x, y, w, h, '#7fd6ff22', { stroke: CY, strokeWidth: 3, sketch: true }), A('draw', { start: i ? 'afterPrev' : 'click', duration: 450 }))),
          m3d('kh-SheenChair', 950, 140, 280, 300, { motion: 'orbit', view: 'three' }),
          side('Silla del comedor en 3D: se gira con el ratón para verla desde cualquier lado.', 460, 120, { fontSize: 18 })],
          notes: 'Los muebles se dibujan a mano alzada uno tras otro (Dibujar sobre formas con trazo a mano). A la derecha, la silla elegida en 3D, con una vuelta de cámara al llegar.' },

        { title: 'Presupuesto', layout: 'titleOnly', bg: BP, back: grid(), extra: [
          tableBlock({ x: 100, y: 180, w: 1080, h: 420, fontSize: 22, header: true, headBg: CY, headFg: BP, stroke: '#5f86b3', banded: true, band: '#ffffff', bandAlpha: 0.06, colW: [5, 2, 2, 2, 3],
            rows: [['Partida', 'Cantidad', 'Unidad', 'Precio', 'Importe'], ['Derribo de tabique', '9', 'm²', '38 €', '=B2*D2'], ['Tabiquería nueva del baño', '12', 'm²', '46 €', '=B3*D3'],
              ['Suelo laminado', '71', 'm²', '32 €', '=B4*D4'], ['Instalación eléctrica', '1', 'ud', '3.900 €', '=B5*D5'], ['Fontanería del baño', '1', 'ud', '2.600 €', '=B6*D6'],
              ['Pintura', '210', 'm²', '9 €', '=B7*D7'], ['<b>Total sin IVA</b>', '', '', '', '=SUMA(ARRIBA)']] }),
          text('Importes y total con fórmulas: cambia una medición y el presupuesto se recalcula.', 100, 620, 1080, 40, { fontSize: 22, color: DIM })],
          notes: 'Cada importe es cantidad por precio (=B2*D2) y el total una suma. Precios inventados, orientativos.' },

        (() => {   // The works calendar: each task grows after the one before, as long as it lasts.
          const TASKS = [['Derribo', 0, 1], ['Electricidad y agua', 1, 2], ['Tabiquería del baño', 2, 2], ['Suelos', 4, 2], ['Pintura', 5, 2], ['Limpieza y entrega', 7, 1]];
          const x0 = 400, wk = 100;
          return { title: 'Calendario de obra', layout: 'titleOnly', bg: BP, back: grid(), extra: [
            ...Array.from({ length: 8 }, (_, i) => text('S' + (i + 1), x0 + i * wk, 170, wk, 30, { fontFamily: T, fontSize: 18, color: CY, textAlign: 'center' })),
            ...Array.from({ length: 9 }, (_, i) => R(x0 + i * wk, 205, 1, 420, '#ffffff', { opacity: 18 })),
            ...TASKS.map(([t], i) => text(t, 100, 220 + i * 66, 290, 50, { fontFamily: T, fontSize: 21, color: LINE, vAlign: 'middle' })),
            ...TASKS.map(([, s0, d], i) => withAnims(shape('rounded', x0 + s0 * wk + 6, 228 + i * 66, d * wk - 12, 34, [YEL, CY, '#9be38f', '#ffa86b', '#d9a6ff', '#ffffff'][i], { radius: 8 }),
              A('fade-right', { start: i ? 'afterPrev' : 'click', duration: d * 450 }))),
            text('8 semanas · empieza el 9 de noviembre', 100, 640, 900, 36, { fontSize: 22, color: DIM })],
            notes: 'Diagrama de Gantt con formas: cada barra entra «después de la anterior» y tarda más cuanto más dura la tarea (duración proporcional a las semanas).' };
        })(),

        { layout: 'blank', bg: BP, back: grid(), extra: [
          pollBlock({ fontSize: 34, question: '¿Qué suelo ponemos en el salón-cocina?', options: ['Laminado de roble', 'Microcemento gris', 'Porcelánico', 'Tarima de pino natural'], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'La familia vota desde el móvil durante la reunión con la arquitecta. Se cierra la decisión antes de pedir el material.' },
      ]), LINE));
    } },

  // ============================================================================
  // 6 · A first tabletop role-playing game: 3D characters that play their own
  //     clips (attack, block, cast, fall) on cue, a die that rolls, health that drops.
  show_anim_rpg: { name: 'Rol de mesa: tu primera partida', cat: 'showcase',
    summary: 'Personajes 3D con sus animaciones: atacar, bloquear, lanzar hechizos y caer; andar hasta el rival, dado que rueda y vida que baja',
    make: () => {
      const STONE = '#15110e', STONE2 = '#2b211a', TORCH = '#ff9a3c', GOLD = '#e9c46a', PARCH = '#f2e6c9', BLOOD = '#d0473a', MAGIC = '#9d8cff', DIM = '#bfae92';
      const C = FF.cormorant;
      const dungeon = () => [R(0, 0, 1280, 720, STONE2, { fill2: STONE, gradType: 'radial' }),
        ...Array.from({ length: 6 }, (_, r) => Array.from({ length: 9 }, (_, c) => R(c * 160 - (r % 2) * 80, r * 120, 156, 116, '#ffffff', { opacity: 3, radius: 6 }))).flat(),
        glow(-160, -160, 460, TORCH, STONE2, 35), glow(980, -160, 460, TORCH, STONE2, 35), R(0, 600, 1280, 120, '#000000', { opacity: 30 })];
      const H = (t, x, y, w, h, size, color = GOLD, p = {}) => text(t, x, y, w, h, { fontFamily: C, fontSize: size, color, fontWeight: 700, lineHeight: 1.05, ...p });
      const plate = (html, x, y, w, h, c = GOLD, p = {}) => card(html, x, y, w, h, '#00000066', { fontSize: 21, color: PARCH, borderColor: c + 'aa', radius: 10, pad: [14, 18, 14, 18], ...p });
      const hp = (x, y, n, c) => Array.from({ length: n }, (_, i) => R(x + i * 34, y, 30, 14, c, { radius: 3 }));
      const clip = (name, props = {}) => A('clip3d', { clip: name, once: true, duration: 1600, ...props });
      const d20 = svgURL(200, 200, '<polygon points="100,6 186,54 186,146 100,194 14,146 14,54" fill="#c8402f" stroke="#ffd9c7" stroke-width="4"/>'
        + '<polygon points="100,40 160,140 40,140" fill="#e2563f" stroke="#ffd9c7" stroke-width="3"/><path d="M100 6 L100 40 M186 54 L160 140 M14 54 L40 140 M186 146 L160 140 M14 146 L40 140 M100 194 L100 140" stroke="#ffd9c7" stroke-width="3"/>'
        + '<path d="M100 40 L186 54 M100 40 L14 54 M40 140 L100 194 L160 140" stroke="#ffd9c7" stroke-width="2" opacity=".6" fill="none"/>');

      return numbered(ink2(build({ name: 'Rol de mesa: tu primera partida', palette: 'midnight', fonts: 'modern', title: { color: GOLD, font: C, size: 56 }, body: { color: PARCH } }, [
        { layout: 'blank', bg: STONE, transition: 'fade', back: dungeon(), extra: [
          kicker('SESIÓN CERO · PARA QUIEN NUNCA HA JUGADO', 80, 150, 620, TORCH, { letterSpacing: 3, fontSize: 16 }),
          H('Rol de mesa', 74, 180, 640, 130, 104),
          text('Tu primera partida, en seis pasos', 80, 315, 620, 50, { fontFamily: C, fontSize: 40, fontStyle: 'italic', color: PARCH }),
          text('Un grupo, unos dados y una historia que se inventa entre todos.', 80, 390, 560, 80, { fontSize: 24, color: DIM }),
          withAnims(m3d('kk-Knight', 700, 90, 480, 560, { clip: 'Idle', view: 'front', edge: 'fade' }), clip('Cheer', { sound: 'chime', duration: 2200 }))],
          notes: 'El caballero 3D respira en reposo (animación «Idle»). Con un clic lo celebra (animación del modelo 3D «Cheer», una vez y vuelve al reposo) con una campanilla.' },

        (() => {   // Three heroes: they show up in a row, then each one shows what it does with a click.
          const HEROES = [['kk-Knight', 'Guerrero', 'Aguanta los golpes y protege al grupo.', '2H_Melee_Attack_Spin', BLOOD], ['kk-Mage', 'Maga', 'Pocos puntos de vida, mucho poder.', 'Spellcast_Raise', MAGIC],
            ['kk-Rogue', 'Pícara', 'Rápida, sigilosa y con buena puntería.', 'Dualwield_Melee_Attack_Stab', '#5fc28b']];
          const enter = HEROES.map((_, i) => A('zoom-in', { start: 'afterPrev', duration: 400 }));
          const acts = HEROES.map(h => clip(h[3], { sound: 'whoosh', duration: 1800 }));
          return { title: 'Elige tu personaje', layout: 'titleOnly', bg: STONE, back: dungeon(), extra: HEROES.flatMap(([id, n, d, , c], i) => [
            withAnims(plate(`<div style="font-family:${C};font-size:36px;font-weight:700;color:${c}">${n}</div><div style="margin-top:6px">${d}</div>`, 90 + i * 380, 500, 340, 150, c), enter[i]),
            withAnims(m3d(id, 110 + i * 380, 160, 300, 340, { clip: 'Idle' }), acts[i])]),
            notes: 'Al llegar, las tres fichas aparecen solas, una tras otra. Después, cada clic hace que un personaje muestre su habilidad: el guerrero gira el arma, la maga alza las manos y la pícara ataca con sus dagas (animaciones propias de cada modelo).' };
        })(),

        { layout: 'blank', bg: STONE, transition: 'fade', back: dungeon(), extra: [
          H('La tirada', 80, 50, 700, 80, 60),
          mathBlock({ x: 80, y: 150, w: 640, h: 100, fontSize: 40, latex: '\\text{d20} + \\text{bono} \\geq \\text{dificultad}', color: PARCH }),
          text('Tiras un dado de veinte caras y sumas tu bonificador. Si igualas o superas la dificultad que dice quien dirige la partida, lo consigues.', 80, 270, 620, 130, { fontSize: 24, color: DIM }),
          R(740, 470, 460, 12, '#000000', { opacity: 40, radius: 6 }),
          withAnims(img(d20, 740, 330, 140, 140, 'Dado de veinte caras'), path([[120, -150], [240, -40], [300, 0]], { duration: 1500, spin: 1080, sound: 'drumroll' })),
          withAnims(H('14', 1040, 358, 140, 80, 60, '#ffffff', { textAlign: 'center' }), A('zoom-in', { start: 'afterPrev', duration: 300, sound: 'pop' })),
          withAnims(plate(`<div style="font-family:${C};font-size:40px;font-weight:700;color:${GOLD}">14 + 3 = 17</div><div>La dificultad era 15: <b style="color:#7be08e">¡lo consigues!</b></div>`, 80, 460, 560, 130), A('fade-up', { start: 'afterPrev' }))],
          notes: 'Un clic: el dado rueda por una trayectoria dibujada con tres vueltas de giro y suena un redoble; al pararse aparece el 14 y debajo la cuenta completa. Todo encadenado con «después de la anterior».' },

        (() => {   // A fight in turns: walk up and strike, block, the final blow; health drops in blocks.
          const kn = lib3d('kk-Knight');
          const walk = path([[180, 10], [370, 0]], { duration: 1800 }), chop = clip('1H_Melee_Attack_Chop', { start: 'afterPrev', duration: 1100, sound: 'whoosh' });
          const hit = clip('Hit_A', { start: 'withPrev', delay: 500, duration: 900 }), dmg1 = A('zoom-in', { start: 'withPrev', delay: 500, duration: 300, sound: 'pop' });
          const hp1 = [A('fade-out', { start: 'withPrev', delay: 500, duration: 300 }), A('fade-out', { start: 'withPrev', delay: 500, duration: 300 })];
          const sk = clip('1H_Melee_Attack_Slice_Diagonal', { duration: 1200, sound: 'whoosh' }), block = clip('Block', { start: 'withPrev', delay: 300, duration: 1200 }), blk = A('zoom-in', { start: 'withPrev', delay: 500, duration: 300, sound: 'click' });
          const spin = clip('2H_Melee_Attack_Spin', { duration: 1300, sound: 'whoosh' }), die = A('clip3d', { clip: 'Death_A', start: 'withPrev', delay: 600, duration: 1500 }), lie = A('clip3d', { clip: 'Death_A_Pose', start: 'afterPrev', duration: 500 });
          const dmg2 = A('zoom-in', { start: 'withPrev', delay: 600, duration: 300, sound: 'pop' }), hp2 = [0, 1, 2].map(() => A('fade-out', { start: 'withPrev', delay: 600, duration: 300 }));
          const win = A('bounce', { start: 'afterPrev', sound: 'applause' });
          return { layout: 'blank', bg: STONE, transition: 'fade', back: dungeon(), extra: [
            H('Un combate por turnos', 80, 40, 700, 70, 52),
            text('Guerrero', 80, 120, 200, 30, { fontSize: 20, color: PARCH, fontWeight: 700 }), ...hp(80, 156, 5, '#5fc28b'),
            text('Esqueleto', 900, 120, 200, 30, { fontSize: 20, color: PARCH, fontWeight: 700 }),
            withAnims(R(1002, 156, 30, 14, BLOOD, { radius: 3 }), hp1[0]), withAnims(R(1036, 156, 30, 14, BLOOD, { radius: 3 }), hp1[1]),
            ...[0, 1, 2].map(i => withAnims(R(900 + i * 34, 156, 30, 14, BLOOD, { radius: 3 }), hp2[i])),
            withAnims(m3d('kk-Knight', 80, 210, 300, 400, { clip: 'Idle', edge: 'fade', walk: { clip: kn.walk, face: true } }), walk, chop, block, spin),
            withAnims(m3d('kk-Skeleton_Warrior', 820, 210, 300, 400, { clip: 'Idle', edge: 'fade' }), hit, sk, die, lie),
            withAnims(H('−2', 1060, 230, 120, 70, 60, BLOOD, { textAlign: 'center' }), dmg1),
            withAnims(text('¡Bloqueado!', 380, 230, 260, 50, { fontFamily: C, fontSize: 40, fontWeight: 700, color: GOLD, textAlign: 'center' }), blk),
            withAnims(H('−3', 1060, 310, 120, 70, 60, BLOOD, { textAlign: 'center' }), dmg2),
            withAnims(plate('<b>Victoria.</b> Tres turnos: atacar, defender y rematar.', 360, 620, 560, 60, GOLD, { textAlign: 'center', vAlign: 'middle', pad: [6, 12, 6, 12] }), win)],
            notes: 'Clic 1: el caballero anda hasta el esqueleto (trayectoria con la animación de andar), ataca, el esqueleto encaja el golpe y pierde dos bloques de vida. Clic 2: el esqueleto ataca y el caballero bloquea. Clic 3: golpe giratorio, el esqueleto cae y se queda en el suelo (dos animaciones del modelo seguidas), y aplausos.' };
        })(),

        (() => {   // Magic: the mage casts, a fireball flies (arc), it bursts, the minion falls.
          const cast = clip('Spellcast_Shoot', { duration: 1400 }), ball = A('fade-in', { start: 'withPrev', delay: 500, duration: 150 });
          const fly = path([[180, -120], [420, -60], [520, 20]], { start: 'afterPrev', duration: 900, sound: 'whoosh' }), gone = A('fade-out', { start: 'afterPrev', duration: 100 });
          const boom = A('zoom-in', { start: 'withPrev', duration: 300, sound: 'pop' }), fall = A('clip3d', { clip: 'Death_B', start: 'withPrev', duration: 1400 }), stay = A('clip3d', { clip: 'Death_B_Pose', start: 'afterPrev', duration: 500 });
          const out = A('fade-out', { start: 'afterPrev', duration: 600 }), card3 = A('fade-up', { start: 'afterPrev' });
          return { layout: 'blank', bg: STONE, transition: 'fade', back: [...dungeon(), glow(60, 120, 520, MAGIC, STONE, 25)], extra: [
            H('La magia', 80, 40, 600, 70, 52, MAGIC),
            withAnims(m3d('kk-Mage', 80, 170, 300, 420, { clip: 'Idle', view: 'side' }), cast),
            withAnims(E(330, 330, 56, 56, '#ffd166', { fill2: '#ff5a1f', gradType: 'radial' }), ball, fly, gone),
            withAnims(shape('burst', 790, 300, 150, 150, '#ffb347', { stroke: '#ff5a1f', strokeWidth: 3 }), boom, out),
            withAnims(m3d('kk-Skeleton_Minion', 770, 220, 300, 380, { clip: 'Idle' }), fall, stay),
            withAnims(plate(`<div style="font-family:${C};font-size:32px;font-weight:700;color:${GOLD}">Bola de fuego</div><div>3 dados de seis caras de daño, una vez por combate</div>`, 340, 580, 600, 116, MAGIC, { pad: [10, 18, 10, 18] }), card3)],
            notes: 'Un solo clic encadena seis animaciones: la maga lanza (animación del modelo), la bola aparece, vuela en arco, explota con un «pop» mientras el esbirro cae, y se queda en el suelo. Al final, la ficha del hechizo.' };
        })(),

        { title: 'Tu hoja de personaje', layout: 'titleOnly', bg: STONE, back: dungeon(), extra: [
          tableBlock({ x: 80, y: 170, w: 560, h: 420, fontSize: 24, header: true, headBg: GOLD, headFg: STONE, stroke: '#4a3c2e', banded: true, band: '#ffffff', bandAlpha: 0.06, colW: [4, 2, 3],
            rows: [['Característica', 'Valor', 'Bonificador'], ['Fuerza', '16', '=(B2-10)/2'], ['Destreza', '12', '=(B3-10)/2'], ['Constitución', '14', '=(B4-10)/2'], ['Inteligencia', '8', '=(B5-10)/2'], ['Sabiduría', '10', '=(B6-10)/2'], ['Carisma', '12', '=(B7-10)/2']] }),
          chartBlock({ x: 680, y: 160, w: 540, h: 470, chartType: 'radar', data: ['Fuerza', 'Destreza', 'Constitución', 'Inteligencia', 'Sabiduría', 'Carisma'].map((l, i) => ({ label: l, value: [16, 12, 14, 8, 10, 12][i] })), seriesName: 'Guerrero', color: BLOOD,
            series: [{ name: 'Maga', values: [8, 14, 12, 16, 12, 10], color: MAGIC }, { name: 'Pícara', values: [10, 16, 12, 12, 10, 14], color: '#5fc28b' }] })],
          notes: 'La columna de bonificador es una fórmula: (valor − 10) / 2. A la derecha, las tres clases comparadas en un radar.' },

        { title: 'Lo que necesitas', layout: 'titleOnly', bg: STONE, back: dungeon(), extra: [
          ...[['Dados', 'Un juego de siete: del d4 al d20.'], ['Hoja de personaje', 'Impresa o en el móvil.'], ['Lápiz y goma', 'La vida sube y baja.'], ['Quien dirija', 'Narra, arbitra y pone voces.']].map(([h, d], i) =>
            withAnims(plate(`<div style="font-family:${C};font-size:32px;font-weight:700;color:${GOLD}">${h}</div><div style="margin-top:4px">${d}</div>`, 80 + (i % 2) * 330, 180 + Math.floor(i / 2) * 190, 300, 160), A('flip', { start: i ? 'afterPrev' : 'click', duration: 400 }))),
          text('Primera escena', 820, 170, 360, 40, { fontFamily: C, fontSize: 32, color: GOLD, textAlign: 'center', fontWeight: 700 }),
          timer(600, 870, 220, 260, { color: TORCH, auto: false }),
          text('Diez minutos para presentar a los personajes. Pulsa el reloj para empezar.', 820, 500, 360, 90, { fontSize: 21, color: DIM, textAlign: 'center' })],
          notes: 'Cuatro tarjetas que se voltean seguidas con un clic. La cuenta atrás de 10 minutos no arranca sola: se pulsa cuando el grupo está listo.' },

        { layout: 'blank', bg: STONE, back: dungeon(), extra: [
          pollBlock({ kind: 'quiz', question: 'Sacas un 12, tu bono es +3 y la dificultad es 15. ¿Lo consigues?', options: ['Sí, justo', 'No, por uno', 'Solo si saco un 20'], correct: [0], time: 20, fontSize: 36, x: 70, y: 50, w: 1140, h: 620 })],
          notes: 'Pregunta con puntos desde el móvil: 12 + 3 = 15, igual a la dificultad, así que sí. Igualar también vale.' },

        { layout: 'blank', bg: STONE, transition: 'zoom', back: dungeon(), extra: [
          m3d('kk-Barbarian', 60, 120, 340, 480, { clip: 'Cheer' }), m3d('kk-Rogue_Hooded', 880, 120, 340, 480, { clip: 'Cheer', clipSpeed: 0.8 }),
          at(H('¡Que ruede<br>el dado!', 380, 210, 520, 240, 92, GOLD, { textAlign: 'center' }), 'zoom-in', { start: 'afterPrev', duration: 800, sound: 'drumroll' }),
          text('Sesiones cada viernes a las 18:00 · sala 2 del centro cívico', 380, 470, 520, 70, { fontSize: 22, color: DIM, textAlign: 'center' }),
          text('Personajes 3D: KayKit — Kay Lousberg (CC0)', 380, 660, 520, 30, { fontSize: 13, color: DIM, textAlign: 'center' })],
          notes: 'Despedida con dos personajes que celebran sin parar (animación en bucle; la pícara, un poco más lenta). El título entra con un redoble.' },
      ]), PARCH));
    } },

  // ============================================================================
  // 7 · Anatomy of a Spanish guitar: triggers — the audience (or the speaker)
  //     clicks a part of the instrument and its card appears; a string vibrates.
  show_anim_guitar: { name: 'Anatomía de la guitarra española', cat: 'showcase',
    summary: 'Desencadenadores: clic en cada parte de la guitarra para ver su ficha y en cada cuerda para hacerla vibrar; roseta que gira',
    make: () => {
      const WOOD = '#21130b', WOOD2 = '#3b2414', CREAM = '#f6ead6', DIM = '#c9b398', BRASS = '#d9b25f', ROSE = '#2f6f5e', ACC = '#e4572e';
      const P = FF.playfair;
      const frets = Array.from({ length: 12 }, (_, n) => 860 - 725 * (1 - Math.pow(2, -(n + 1) / 12)));
      const BODY = 'M150 40 C230 40 250 85 290 85 C320 85 330 70 370 70 C440 70 482 120 482 180 C482 240 440 290 370 290 C330 290 320 275 290 275 C250 275 230 320 150 320 C70 320 10 260 10 180 C10 100 70 40 150 40 Z';
      const guitar = svgURL(1000, 360, `<defs><radialGradient id="t" cx=".35" cy=".5" r=".7"><stop offset="0" stop-color="#f3d39b"/><stop offset="1" stop-color="#c58d45"/></radialGradient>`
        + `<linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4528"/><stop offset="1" stop-color="#3e2614"/></linearGradient></defs>`
        + `<path d="${BODY}" fill="url(#t)" stroke="#4a2c16" stroke-width="7"/>`
        + `<circle cx="330" cy="180" r="62" fill="${ROSE}"/><circle cx="330" cy="180" r="56" fill="none" stroke="${BRASS}" stroke-width="4" stroke-dasharray="4 3"/><circle cx="330" cy="180" r="50" fill="#d8b47a"/><circle cx="330" cy="180" r="44" fill="#140b05"/>`
        + `<rect x="112" y="128" width="40" height="104" rx="6" fill="#3a2212"/><rect x="132" y="140" width="5" height="80" fill="#efe6d2"/>`
        + `<rect x="470" y="160" width="392" height="40" fill="url(#n)"/>` + frets.map(x => `<rect x="${x.toFixed(1)}" y="160" width="3" height="40" fill="#cfd2d8"/>`).join('')
        + [5, 7, 9].map(n => `<circle cx="${((frets[n - 2] + frets[n - 1]) / 2).toFixed(1)}" cy="180" r="3.5" fill="#efe6d2"/>`).join('')
        + `<rect x="858" y="158" width="8" height="44" fill="#efe6d2"/><path d="M866 152 L990 140 L990 220 L866 208 Z" fill="#3e2614"/><rect x="890" y="166" width="90" height="8" rx="4" fill="#140b05"/><rect x="890" y="186" width="90" height="8" rx="4" fill="#140b05"/>`
        + [0, 1, 2].map(i => `<circle cx="${905 + i * 30}" cy="148" r="8" fill="${BRASS}"/><circle cx="${905 + i * 30}" cy="212" r="8" fill="${BRASS}"/>`).join('')
        + Array.from({ length: 6 }, (_, i) => `<line x1="134" y1="${164 + i * 6.4}" x2="862" y2="${164 + i * 6.4}" stroke="${i < 3 ? '#f1ece2' : '#d9c7a0'}" stroke-width="${i < 3 ? 1.6 : 2.4 - (i - 3) * 0.3}"/>`).join(''));
      const back = (c = WOOD2) => [R(0, 0, 1280, 720, c, { fill2: WOOD, gradType: 'radial' }), ...Array.from({ length: 12 }, (_, i) => R(0, 30 + i * 62, 1280, 2, '#000000', { opacity: 12 }))];
      const HT = (t, x, y, w, h, size, color = CREAM, props = {}) => text(t, x, y, w, h, { fontFamily: P, fontSize: size, color, fontWeight: 700, lineHeight: 1.1, ...props });
      const spot = (n, x, y) => shape('ellipse', x - 20, y - 20, 40, 40, ACC, { stroke: '#ffffff', strokeWidth: 3, html: String(n), fontSize: 20, color: '#ffffff', fontWeight: 700 });
      const PARTS = [['Puente', 'Sujeta las cuerdas y pasa su vibración a la tapa.', 235, 370], ['Tapa', 'Abeto o cedro de 2,5 mm: el «altavoz» de la guitarra.', 290, 262],
        ['Boca y roseta', 'Deja salir el aire que vibra; la roseta la decora.', 430, 304], ['Trastes', 'Doce hasta el cuerpo: cada uno sube un semitono.', 760, 370], ['Clavijero', 'Las clavijas tensan y afinan cada cuerda.', 1030, 370]];

      return numbered(ink2(build({ name: 'La guitarra española', palette: 'warm', fonts: 'classic', title: { color: CREAM }, body: { color: CREAM } }, [
        { layout: 'blank', bg: WOOD, transition: 'fade', back: back(), extra: [
          kicker('TALLER DE LUTERÍA LAS TABLAS', 80, 170, 490, BRASS),
          HT('La guitarra<br>española', 74, 205, 500, 220, 76),
          text('Anatomía de un instrumento: toca cada parte para descubrirla.', 80, 440, 480, 80, { fontSize: 26, color: DIM }),
          withAnims(img(guitar, 590, 260, 690, 248, 'Guitarra española', { rotation: -32 }), A('fade-left', { start: 'afterPrev', duration: 1000 })),
          withAnims(text('HECHA A MANO · ABETO Y PALOSANTO · HECHA A MANO · ABETO Y PALOSANTO · ', 1000, 450, 230, 230, { fontFamily: P, fontSize: 18, curve: 100, color: BRASS, textAlign: 'center', letterSpacing: 2 }), A('spin', { start: 'afterPrev', duration: 1200 }))],
          notes: 'La guitarra (un dibujo SVG hecho a medida) entra deslizándose al llegar y el sello de texto curvo gira tras ella. El taller y los datos son inventados.' },

        (() => {   // Click a numbered spot: its card appears (trigger). Order doesn't matter.
          const spots = PARTS.map(([, , x, y], i) => spot(i + 1, x, y));
          return { layout: 'blank', bg: WOOD, transition: 'fade', back: back(), extra: [
            HT('Toca una parte', 80, 40, 700, 70, 48), text('Haz clic en los círculos naranjas, en el orden que quieras.', 80, 108, 900, 40, { fontSize: 22, color: DIM }),
            img(guitar, 100, 190, 1000, 360, 'Guitarra española'), ...spots,
            ...PARTS.map(([n, d], i) => withAnims(card(`<div style="font-family:${P};font-size:24px;font-weight:700;color:${BRASS}">${i + 1} · ${n}</div><div style="margin-top:6px">${d}</div>`,
              60 + i * 236, 560, 222, 140, '#00000055', { fontSize: 17, color: CREAM, borderColor: BRASS + '88', radius: 10, pad: [12, 14, 12, 14] }), A('zoom-in', { trigger: spots[i].id, duration: 400, sound: 'click' })))],
          notes: 'Desencadenadores: cada ficha está ligada a un círculo (Panel de animación ▸ Disparador ▸ Al hacer clic en…). Al presentar, la ficha aparece solo cuando se pulsa su círculo, en cualquier orden; las flechas del teclado siguen pasando de diapositiva.' };
        })(),

        { layout: 'blank', bg: WOOD, transition: 'fade', back: back(), extra: [
          HT('La roseta', 80, 40, 600, 70, 48),
          ...[[ROSE, 360], [BRASS, 320], ['#8c3b2b', 280], ['#e9d2a6', 240], [ROSE, 200], ['#140b05', 160]].map(([c, d], i) =>
            withAnims(E(640 - d / 2 + 180, 380 - d / 2, d, d, c, i === 1 ? { stroke: '#3a2212', strokeWidth: 2 } : {}), A('spin', { start: i ? 'afterPrev' : 'click', duration: 500 }))),
          ...Array.from({ length: 28 }, (_, i) => { const a = i / 28 * 2 * Math.PI; return withAnims(R(820 + Math.round(150 * Math.cos(a)) - 7, 380 + Math.round(150 * Math.sin(a)) - 7, 14, 14, i % 2 ? '#e9d2a6' : '#8c3b2b', { rotation: Math.round(a * 180 / Math.PI) }),
            A('zoom-in', { start: 'afterPrev', duration: 40 })); }),
          withAnims(HT('2.000', 80, 230, 420, 120, 110, BRASS), A('zoom-in', { duration: 500, sound: 'chime' })),
          withAnims(text('teselas de madera teñida, del tamaño de un grano de arroz, forman una roseta. Se montan una a una y llevan unas 12 horas.', 84, 360, 420, 160, { fontSize: 24, color: CREAM }), A('fade-up', { start: 'afterPrev' }))],
          notes: 'Primer clic: los anillos entran girando uno tras otro y el mosaico se cierra pieza a pieza (28 piezas en 40 ms cada una). Segundo clic: la cifra con campanilla.' },

        (() => {   // Six strings: click a note and its string vibrates (a short path up and down) with a chime.
          const NOTES = [['Mi', 'E4 · 330 Hz'], ['Si', 'B3 · 247 Hz'], ['Sol', 'G3 · 196 Hz'], ['Re', 'D3 · 147 Hz'], ['La', 'A2 · 110 Hz'], ['Mi', 'E2 · 82 Hz']];
          const keys = NOTES.map(([n], i) => shape('ellipse', 90, 192 + i * 72, 56, 56, i < 3 ? BRASS : ACC, { html: n, fontSize: 18, fontWeight: 700, color: '#1c1008', stroke: '#ffffff', strokeWidth: 2 }));
          const shake = () => path([[0, -7], [0, 6], [0, -5], [0, 4], [0, -2], [0, 0]], { duration: 700, sound: 'chime' });
          return { layout: 'blank', bg: WOOD, transition: 'fade', back: [...back(), R(170, 180, 840, 440, '#4a2e18', { fill2: '#2e1b0e', gradAngle: 90 }),
            ...[300, 500, 680, 840, 980].map(x => R(x, 180, 6, 440, '#cfd2d8', { opacity: 80 }))], extra: [
            HT('Seis cuerdas, seis notas', 80, 40, 800, 70, 48), text('Toca la nota de la izquierda: su cuerda vibra.', 80, 108, 900, 40, { fontSize: 22, color: DIM }),
            ...keys,
            ...NOTES.map(([, f], i) => withAnims(R(170, 218 + i * 72, 840, 2 + i * 1.2, i < 3 ? '#f1ece2' : '#d9c7a0'), { ...shake(), trigger: keys[i].id })),
            ...NOTES.map(([, f], i) => text(f, 1030, 204 + i * 72, 200, 30, { fontSize: 19, color: DIM }))],
          notes: 'Cada cuerda tiene una trayectoria cortísima arriba y abajo, con sonido, ligada a su círculo como desencadenador: se puede tocar cualquier cuerda, las veces que se quiera. Las graves son más gruesas.' };
        })(),

        { title: 'Las maderas', layout: 'titleOnly', bg: WOOD, back: back(), extra: [
          tableBlock({ x: 80, y: 170, w: 1120, h: 430, fontSize: 23, header: true, headBg: BRASS, headFg: WOOD, stroke: '#5a3f2a', banded: true, band: '#ffffff', bandAlpha: 0.06, colW: [3, 3, 2, 6],
            rows: [['Parte', 'Madera', 'Densidad', 'Por qué'], ['Tapa', 'Abeto alemán', '450 kg/m³', 'Ligera y rígida: vibra mucho con poca energía'], ['Aros y fondo', 'Palosanto de la India', '850 kg/m³', 'Refleja el sonido y da graves profundos'],
              ['Mástil', 'Cedro', '480 kg/m³', 'Estable: no se tuerce con la humedad'], ['Diapasón', 'Ébano', '1.100 kg/m³', 'Muy duro: los trastes no se aflojan'], ['Puente', 'Palosanto', '850 kg/m³', 'Aguanta la tensión de las cuerdas']] }),
          text('Datos orientativos: cada pieza de madera es distinta.', 80, 620, 1120, 40, { fontSize: 21, color: DIM })],
          notes: 'Las cinco maderas habituales en una guitarra clásica de taller y por qué se eligen. Densidades aproximadas.' },

        { title: 'Ciento cincuenta horas de taller', layout: 'titleOnly', bg: WOOD, back: back(), extra: [
          dg('process', 'Tapa\nAros y fondo\nMástil\nMontaje\nBarniz', 70, 160, 1140, 170, { colors: 'accent', oneByOne: true, fontScale: 1.4 }),
          chartBlock({ x: 70, y: 350, w: 560, h: 320, chartType: 'doughnut', data: [{ label: 'Tapa', value: 40, color: '#e8c48a' }, { label: 'Aros y fondo', value: 30, color: '#8c3b2b' }, { label: 'Mástil', value: 25, color: ROSE }, { label: 'Montaje', value: 20, color: BRASS }, { label: 'Barniz', value: 35, color: ACC }] }),
          withAnims(text('El barniz a muñequilla, en capas finísimas, lleva casi una cuarta parte del tiempo.', 680, 440, 520, 110, { fontSize: 24, color: CREAM }), A('fade-up'))],
          notes: 'El proceso aparece paso a paso (diagrama «uno a uno»). En la dona, las horas de cada fase (inventadas pero razonables).' },

        (() => {   // Classical or flamenco: the differences, one per click, both columns at once.
          const ROWS = [['Tapa', 'Más gruesa: sonido redondo', 'Más fina: sonido seco y brillante'], ['Fondo y aros', 'Palosanto oscuro', 'Ciprés claro'], ['Acción', 'Cuerdas algo más altas', 'Cuerdas bajas, para el rasgueo'], ['Golpeador', 'Sin golpeador', 'Golpeador transparente']];
          return { layout: 'blank', bg: WOOD, transition: 'fade', back: back(), extra: [
            HT('Clásica o flamenca', 80, 40, 800, 70, 48),
            HT('Clásica', 400, 140, 380, 50, 32, BRASS, { textAlign: 'center' }), HT('Flamenca', 820, 140, 380, 50, 32, ACC, { textAlign: 'center' }),
            ...ROWS.flatMap(([k, a, b], i) => [text(k, 80, 210 + i * 110, 300, 90, { fontFamily: P, fontSize: 26, color: CREAM, vAlign: 'middle', fontWeight: 700 }),
              withAnims(card(a, 400, 210 + i * 110, 380, 90, '#00000044', { fontSize: 22, color: CREAM, borderColor: BRASS + '88', vAlign: 'middle', radius: 10 }), A('flip', { duration: 450 })),
              withAnims(card(b, 820, 210 + i * 110, 380, 90, '#00000044', { fontSize: 22, color: CREAM, borderColor: ACC + '88', vAlign: 'middle', radius: 10 }), A('flip', { start: 'withPrev', duration: 450 }))])],
          notes: 'Cada clic voltea una fila: la clásica y la flamenca a la vez («con la anterior»), para comparar una característica cada vez.' };
        })(),

        { layout: 'blank', bg: WOOD, back: back(), extra: [
          pollBlock({ kind: 'label', fontSize: 28, question: 'Pon nombre a cada parte de la guitarra', x: 80, y: 50, w: 1120, h: 620, image: guitar,
            options: ['Clavijero', 'Trastes', 'Boca', 'Puente', 'Tapa'], points: [{ x: 92, y: 50 }, { x: 66, y: 50 }, { x: 33, y: 50 }, { x: 13, y: 50 }, { x: 22, y: 80 }] })],
          notes: 'Actividad «Etiquetar una imagen» desde el móvil, con el mismo dibujo de la guitarra: cada persona arrastra los nombres a su sitio y Revela corrige.' },
      ]), CREAM));
    } },

  // ============================================================================
  // 8 · A haiku workshop on a typewriter: letters and words one by one (each a
  //     box in a monospaced type, so they line up exactly), paragraphs by click,
  //     syllables counted, a draft corrected and Transform to the clean line.
  show_anim_haiku: { name: 'Taller de haiku: palabra a palabra', cat: 'showcase',
    summary: 'Animación por palabras y párrafos: versos palabra a palabra, consigna frase a frase, sílabas contadas y Transformar',
    make: () => {
      const PAPER = '#f4f1ea', SHEET = '#fffdf8', INK = '#1d1d1b', RED = '#c8102e', GREY = '#8a877f', LINE = '#e3ddd0';
      const MONO = FF.courier, CW = 0.6;
      // A line that writes itself word by word: one box per step with the line so far (each one appears as the one
      // before goes), all in the same place. So it can be translated as a whole, and in Arabic it grows from the
      // right, as it is read. A string is cut at its spaces; a list gives its pieces (one per step).
      const words = (str, x, y, size, color, { first = 'click', gap = 150, sound = 'click', bold = false, w = 0 } = {}) => {
        const P = Array.isArray(str) ? str : str.split(' '), full = P.join(' '), W = Math.max(w, Math.round(full.length * CW * size + 14));
        const anims = P.map(() => []);
        P.forEach((_, i) => { anims[i].push(A('fade-in', { start: i ? 'afterPrev' : first, duration: 60, delay: i ? gap : 0, ...(sound && { sound }) }));
          if (i) anims[i - 1].push(A('fade-out', { start: 'withPrev', duration: 60 })); });
        return P.map((_, i) => withAnims(text(P.slice(0, i + 1).join(' '), x - 6, y, W, Math.round(size * 1.5), { fontFamily: MONO, fontSize: size, color, ...(bold && { fontWeight: 700 }) }), ...anims[i])); };
      const sheet = (x = 140, y = 40, w = 1000, h = 640) => [R(0, 0, 1280, 720, PAPER), shape('rect', x, y, w, h, SHEET, { shadow: { x: 0, y: 8, blur: 24, color: '#00000022' } }),
        ...Array.from({ length: Math.floor((h - 60) / 48) }, (_, i) => R(x + 60, y + 90 + i * 48, w - 120, 1, LINE))];
      const head = t => text(t, 200, 60, 880, 60, { fontFamily: MONO, fontSize: 34, color: INK, fontWeight: 700 });
      const count = (n, x, y, c = RED) => withAnims(shape('ellipse', x, y, 54, 54, c, { html: String(n), fontFamily: MONO, fontSize: 26, fontWeight: 700, color: '#ffffff' }), A('zoom-in', { start: 'afterPrev', duration: 250, sound: 'pop' }));
      const chip = (t, x, y, size, c = INK, bg = '#eee9dd') => text(t, x, y, Math.round(t.length * CW * size + 26), Math.round(size * 1.6), { fontFamily: MONO, fontSize: size, color: c, bg, radius: 8, pad: [4, 12, 4, 12], textAlign: 'center', vAlign: 'middle' });
      const ids = Object.fromEntries(['el1', 'charco', 'guarda', 'el2', 'cielo'].map(k => [k, uid()]));

      return numbered(ink2(build({ name: 'Taller de haiku', palette: 'grayscale', fonts: 'websafe', title: { color: INK }, body: { color: INK } }, [
        { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [
          // (The title whole, not letter by letter: so it can be translated.)
          withAnims(text('Taller de haiku', 200, 200, 900, 114, { fontFamily: MONO, fontSize: 76, color: INK, fontWeight: 700 }), A('fade-right', { start: 'afterPrev', duration: 900, delay: 300, sound: 'click' })),
          withAnims(text('5 · 7 · 5 sílabas para atrapar un instante', 200, 340, 880, 50, { fontFamily: MONO, fontSize: 30, color: GREY }), A('fade-in', { start: 'afterPrev', delay: 300 })),
          withAnims(shape('rect', 960, 470, 110, 110, RED, { html: '5·7·5', fontFamily: MONO, fontSize: 24, color: '#ffffff', fontWeight: 700, rotation: -6 }), A('zoom-in', { start: 'afterPrev', duration: 250, sound: 'pop' })),
          text('Biblioteca municipal · jueves de poesía', 200, 560, 700, 40, { fontFamily: MONO, fontSize: 22, color: GREY })],
          notes: 'Al llegar, el título entra desde la izquierda con un clic de sonido, en letra de máquina de escribir. En las diapositivas siguientes, los versos aparecen palabra a palabra: la letra es monoespaciada, así que cada palabra cae en su sitio exacto.' },

        { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [head('¿Qué es un haiku?'),
          ...[['Tres versos', 'De cinco, siete y cinco sílabas. Nada más: ni título ni rima.'], ['Un instante', 'Lo que se ve, se oye o se huele ahora mismo. Sin explicar lo que se siente.'], ['Una estación', 'Una palabra que la sugiera: lluvia, almendro, chicharra, hojas…']].map(([h, d], i) =>
            withAnims(text(`<div style="font-weight:700;color:${RED}">${h}</div><div>${d}</div>`, 200, 160 + i * 150, 880, 130, { fontFamily: 'Georgia, serif', fontSize: 28, color: INK, lineHeight: 1.35 }), A('fade-up', { duration: 500 })))],
          notes: 'Animación por párrafos: cada idea entra con su clic (Subir). Leerla en voz alta antes de pasar a la siguiente.' },

        { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [head('Un haiku, palabra a palabra'),
          ...words('Lluvia de mayo —', 220, 200, 40, INK, { w: 780 }), count(5, 1000, 202),
          ...words(['el charco', 'guarda', 'el cielo'], 220, 300, 40, INK, { w: 780 }), count(7, 1000, 302),
          ...words('que nadie mira.', 220, 400, 40, INK, { w: 780 }), count(5, 1000, 402),
          text('Haiku escrito para este taller.', 220, 540, 700, 36, { fontFamily: MONO, fontSize: 20, color: GREY })],
          notes: 'Tres clics, un verso cada uno: sus palabras aparecen solas, una tras otra, al ritmo de la lectura (150 ms entre palabras), y al final del verso el sello rojo cuenta las sílabas.' },

        (() => {   // Counting syllables: chips in a row, numbers under them, the synalepha joined.
          const SY = ['el', 'char', 'co', 'guar', 'da‿el', 'cie', 'lo'], size = 40;
          let x = 220; const pos = SY.map(t => { const p = x; x += Math.round(t.length * CW * size + 26) + 18; return p; });
          return { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [head('Contar sílabas'),
            text('«el charco guarda el cielo»', 220, 160, 880, 60, { fontFamily: MONO, fontSize: 40, color: GREY }),
            ...SY.flatMap((t, i) => [withAnims(chip(t, pos[i], 260, size, i === 4 ? '#ffffff' : INK, i === 4 ? RED : '#eee9dd'), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 200, delay: i ? 120 : 0, sound: 'pop' })),
              withAnims(text(String(i + 1), pos[i], 340, Math.round(t.length * CW * size + 26), 40, { fontFamily: MONO, fontSize: 24, color: GREY, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 200 }))]),
            withAnims(ink(Array.from({ length: 16 }, (_, k) => [pos[4] + 10 + k * 7.4, 392 + 14 * Math.sin(k / 15 * Math.PI)]), RED, 4), A('draw', { duration: 600 })),
            withAnims(text('<b>Sinalefa:</b> «guarda el» se lee «guar-dael». La vocal final y la inicial se unen en una sola sílaba.', 220, 450, 840, 90, { fontSize: 24, color: INK }), A('fade-up', { start: 'withPrev' })),
            withAnims(text('= 7', 220, 560, 300, 60, { fontFamily: MONO, fontSize: 48, color: RED, fontWeight: 700 }), A('zoom-in', { start: 'afterPrev', sound: 'chime' }))],
            notes: 'Primer clic: las sílabas saltan una a una con su número. Segundo: se dibuja el arco bajo la sinalefa y aparece la explicación; al final, el total con campanilla.' };
        })(),

        (() => {   // A draft, corrected: words struck out and one written above by hand.
          const D = [['el', 'el1'], ['agua'], ['del'], ['charco', 'charco'], ['refleja'], ['el', 'el2'], ['cielo', 'cielo'], ['azul']], size = 36;
          let off = 0; const B = D.map(([w, id]) => { const b = text(w, Math.round(200 + off * CW * size - 6), 230, Math.round(w.length * CW * size + 14), 60, { fontFamily: MONO, fontSize: size, color: INK }); off += w.length + 1; return id ? withId(b, ids[id]) : b; });
          const s1 = A('strike', { duration: 400 }), s2 = A('strike', { start: 'withPrev', duration: 400 }), s3 = A('strike', { duration: 400 }), g = A('fade-down', { start: 'afterPrev', duration: 500 }), s4 = A('strike', { duration: 400 });
          const n = A('zoom-in', { start: 'afterPrev', sound: 'chime' });
          return { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [head('Corregir un borrador'),
            withAnims(B[1], s1), withAnims(B[2], s2), B[0], B[3], withAnims(B[4], s3), B[5], B[6], withAnims(B[7], s4),
            withAnims(withId(text('guarda', 200 + 19 * CW * size - 6, 160, 170, 64, { fontFamily: FF.caveat, fontSize: 52, color: RED }), ids.guarda), g),
            text('12 sílabas: sobra el agua, sobra el azul (el cielo ya lo es) y «refleja» explica demasiado.', 200, 340, 880, 90, { fontSize: 24, color: GREY }),
            withAnims(text('12 → 7', 200, 460, 400, 70, { fontFamily: MONO, fontSize: 56, color: RED, fontWeight: 700 }), n)],
          notes: 'Clic 1: se tachan «agua» y «del» a la vez. Clic 2: se tacha «refleja» y se escribe encima, a mano, «guarda». Clic 3: fuera «azul». La diapositiva siguiente usa Transformar: las palabras que quedan viajan a su sitio.' };
        })(),

        { layout: 'blank', bg: PAPER, transition: 'fade', autoAnimate: true, back: sheet(), extra: [head('El verso, limpio'),
          ...[['el', 'el1'], ['charco', 'charco'], ['guarda', 'guarda'], ['el', 'el2'], ['cielo', 'cielo']].reduce((acc, [w, id]) => { const size = 56, x = 230 + acc.off * CW * size;
            acc.list.push(withId(text(w, Math.round(x - 6), 290, Math.round(w.length * CW * size + 14), 84, { fontFamily: MONO, fontSize: size, color: INK, fontWeight: 700 }), ids[id])); acc.off += w.length + 1; return acc; }, { off: 0, list: [] }).list,
          at(text('el · char · co · guar · da‿el · cie · lo  =  7', 230, 420, 820, 50, { fontFamily: MONO, fontSize: 26, color: RED }), 'fade-up', { start: 'afterPrev', delay: 400 })],
          notes: 'Transformar: «el», «charco», «el» y «cielo» son los mismos objetos que en el borrador y se deslizan a su sitio; «guarda» pasa de la letra a mano a la de máquina. Al llegar, el recuento confirma las siete sílabas.' },

        (() => {   // Three haikus of the seasons: one card per click, its lines in a row.
          const HK = [['Primavera', ['Brota el almendro —', 'en la rama desnuda', 'cabe un enero.']], ['Verano', ['Siesta de agosto —', 'y solo la chicharra', 'mueve la tarde.']], ['Otoño', ['Hojas de otoño —', 'el viento las devuelve', 'junto a su raíz.']]];
          return { layout: 'blank', bg: PAPER, transition: 'fade', back: [R(0, 0, 1280, 720, PAPER)], extra: [
            text('Tres estaciones', 80, 50, 900, 60, { fontFamily: MONO, fontSize: 36, color: INK, fontWeight: 700 }),
            ...HK.flatMap(([st, L], i) => [withAnims(shape('rect', 80 + i * 380, 150, 350, 400, SHEET, { shadow: { x: 0, y: 6, blur: 18, color: '#00000022' } }), A('fade-up', { duration: 400 })),
              withAnims(text(st.toUpperCase(), 110 + i * 380, 180, 290, 34, { fontFamily: MONO, fontSize: 20, color: RED, letterSpacing: 4, fontWeight: 700 }), A('fade-in', { start: 'withPrev' })),
              ...L.map((l, k) => withAnims(text(l, 110 + i * 380, 250 + k * 85, 300, 70, { fontFamily: 'Georgia, serif', fontSize: 25, color: INK, fontStyle: 'italic' }), A('fade-in', { start: 'afterPrev', delay: 350, duration: 500 })))]),
            text('Haikus escritos para este taller.', 80, 590, 700, 36, { fontFamily: MONO, fontSize: 18, color: GREY })],
          notes: 'Un clic por estación: la hoja sube y sus tres versos aparecen solos, uno detrás de otro, con una pausa (retardo) entre verso y verso para leerlos.' };
        })(),

        { layout: 'blank', bg: PAPER, back: sheet(), extra: [
          pollBlock({ kind: 'gaps', question: 'Completa el haiku', fontSize: 34, x: 200, y: 70, w: 880, h: 580, text: 'Lluvia de [mayo] — el charco guarda el [cielo] que nadie [mira].' })],
          notes: 'Rellenar huecos desde el móvil: cada persona escribe las tres palabras y Revela corrige sin tener en cuenta mayúsculas ni tildes.' },

        { layout: 'blank', bg: PAPER, transition: 'fade', back: sheet(), extra: [head('Tu turno'),
          ...words(['Mira.', 'Cuenta.', 'Borra.', 'Vuelve a mirar.'], 200, 180, 34, INK, { first: 'afterPrev', gap: 400, w: 880 }),
          text('Escribe un haiku sobre algo que hayas visto hoy de camino aquí.', 200, 280, 560, 110, { fontSize: 26, color: INK, fontFamily: 'Georgia, serif' }),
          timer(300, 820, 260, 240, { color: RED }),
          text('Cinco minutos. Después, quien quiera lo lee en voz alta.', 200, 430, 560, 80, { fontSize: 22, color: GREY })],
          notes: 'Las cuatro órdenes de la consigna se escriben solas al llegar, con una pausa larga entre ellas. La cuenta atrás de cinco minutos arranca a la vez.' },
      ]), INK));
    } },

  // ============================================================================
  // 9 · The journey of a T-shirt, as an infographic that reveals itself: a
  //     route drawn in sync with its stops (delays), a pictogram filling up,
  //     charts and figures in chains.
  show_anim_tshirt: { name: 'Infografía: el viaje de una camiseta', cat: 'showcase',
    summary: 'Infografía que se revela: ruta que se dibuja con sus paradas a tiempo, pictograma de gotas que se llena, cascada, cifras y fórmula',
    make: () => {
      const BG = '#0f1a24', BG2 = '#16283a', W = '#f4f1e8', DIM = '#9fb1c2', TEAL = '#2ec4b6', ORANGE = '#ff9f1c', PINK = '#ff4f6d', BLUE = '#4d96ff', YEL = '#ffd23f';
      const MS = FF.montserrat;
      const TEE = 'M30 5 L10 15 L0 38 L18 45 L22 35 L22 98 L78 98 L78 35 L82 45 L100 38 L90 15 L70 5 Q60 18 50 18 Q40 18 30 5 Z';
      const DROP = 'M50 0 C50 0 90 48 90 68 C90 88 72 100 50 100 C28 100 10 88 10 68 C10 48 50 0 50 0 Z';
      const back = () => [R(0, 0, 1280, 720, BG2, { fill2: BG, gradType: 'radial' }), ...Array.from({ length: 24 }, (_, i) => E(40 + (i % 8) * 160, 30 + Math.floor(i / 8) * 260, 4, 4, '#ffffff', { opacity: 10 }))];
      const HT = (t, x, y, w, h, size, color = W, p = {}) => text(t, x, y, w, h, { fontFamily: MS, fontSize: size, color, fontWeight: 800, lineHeight: 1.05, ...p });
      const fig = (n, l, x, y, w, c, p = {}) => text(`<div style="font-family:${MS};font-size:52px;font-weight:800;color:${c};line-height:1">${n}</div><div style="margin-top:6px">${l}</div>`, x, y, w, 120, { fontSize: 20, color: DIM, ...p });

      return numbered(ink2(build({ name: 'El viaje de una camiseta', palette: 'revela', fonts: 'modern', title: { color: W }, body: { color: W } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: back(), extra: [
          glow(700, 40, 640, TEAL, BG, 30),
          withAnims(shape('custom', 780, 110, 420, 440, TEAL, { path: TEE, fill2: BLUE, gradAngle: 90 }), A('zoom-in', { start: 'afterPrev', duration: 900 })),
          withAnims(text('100 % ALGODÓN', 860, 300, 260, 50, { fontFamily: MS, fontSize: 21, fontWeight: 800, color: BG, textAlign: 'center', letterSpacing: 2 }), A('fade-in', { start: 'afterPrev' })),
          kicker('INFOGRAFÍA ANIMADA', 80, 120, 500, ORANGE),
          HT('El viaje<br>de una camiseta', 74, 160, 700, 150, 62),
          text('Del campo de algodón a tu armario: lo que cuesta, en kilómetros y en agua, una prenda de 5 €.', 80, 340, 620, 90, { fontSize: 24, color: DIM }),
          ...[['20.000', 'km de viaje', ORANGE], ['2.700', 'litros de agua', TEAL], ['7', 'países', PINK]].map(([n, l, c], i) => withAnims(fig(n, l, 80 + i * 230, 480, 215, c), A('zoom-in', { start: 'afterPrev', duration: 350 })))],
          notes: 'La portada se monta sola al llegar: la camiseta crece, aparece la etiqueta y entran las tres cifras clave en cadena. Datos aproximados y redondeados, para el ejemplo.' },

        (() => {   // The route draws itself in 4,2 s; each stop pops up exactly when the line reaches it (delays).
          const STOPS = [['Campo', 'Se cultiva y recoge el algodón', 100], ['Desmotado', 'Fibra separada de la semilla', 290], ['Hilatura', 'La fibra se convierte en hilo', 480],
            ['Tintorería', 'Tejido y teñido', 670], ['Confección', 'Corte y cosido', 860], ['Tienda', 'En barco y camión hasta aquí', 1050]];
          const yOf = x => 380 + 60 * Math.sin((x - 100) / 950 * 2 * Math.PI);
          const route = ink(Array.from({ length: 48 }, (_, i) => { const x = 130 + i * 20.4; return [x, yOf(x)]; }), ORANGE, 6, { dash: undefined });
          return { layout: 'blank', bg: BG, transition: 'fade', back: back(), extra: [
            HT('La ruta', 80, 50, 700, 70, 52), text('Seis paradas y unos 20.000 km antes de llegar a la percha.', 80, 120, 900, 40, { fontSize: 24, color: DIM }),
            withAnims(route, A('draw', { duration: 4200 })),
            ...STOPS.flatMap(([n, d, x], i) => { const y = yOf(x + 30), up = i % 2 === 0, c = [TEAL, BLUE, YEL, PINK, ORANGE, TEAL][i];
              return [withAnims(shape('ellipse', x + 4, y - 26, 52, 52, c, { html: String(i + 1), fontFamily: MS, fontSize: 22, fontWeight: 800, color: BG, stroke: W, strokeWidth: 3 }), A('zoom-in', { start: 'withPrev', delay: i * 760, duration: 300, sound: 'pop' })),
                withAnims(text(`<div style="font-family:${MS};font-weight:800;color:${c};font-size:22px">${n}</div><div>${d}</div>`, x - 50, up ? y - 150 : y + 44, 160, 100, { fontSize: 16, color: W, textAlign: 'center', vAlign: up ? 'bottom' : 'top' }), A('fade-in', { start: 'withPrev', delay: i * 760 + 150, duration: 300 }))]; })],
          notes: 'Un solo clic: la ruta se dibuja en 4,2 s y cada parada aparece justo cuando la línea llega a ella, porque todas van «con la anterior» y llevan un retardo creciente (0; 0,76; 1,52… segundos). Así se sincroniza una infografía sin clics de más.' };
        })(),

        { layout: 'blank', bg: BG, transition: 'fade', back: back(), extra: [
          HT('2.700', 80, 140, 500, 130, 120, TEAL), HT('litros', 84, 270, 500, 70, 52),
          text('de agua para una sola camiseta de algodón: lo que bebe una persona en dos años y medio.', 84, 360, 420, 130, { fontSize: 24, color: DIM }),
          ...Array.from({ length: 27 }, (_, i) => withAnims(shape('custom', 590 + (i % 9) * 68, 150 + Math.floor(i / 9) * 110, 50, 70, i < 21 ? TEAL : BLUE, { path: DROP }),
            A('fade-down', { start: i ? 'afterPrev' : 'click', duration: 90 }))),
          text('Cada gota = 100 litros', 590, 490, 400, 36, { fontSize: 20, color: DIM }),
          withAnims(card(`<b style="color:${TEAL}">21 gotas</b> se van en el campo, regando el algodón.`, 590, 550, 600, 70, '#ffffff10', { fontSize: 22, color: W, radius: 12, vAlign: 'middle' }), A('fade-up', { start: 'afterPrev' }))],
          notes: 'Pictograma que se llena: un clic y caen las 27 gotas una detrás de otra (90 ms cada una). Las 21 primeras, en verde azulado, son el agua del cultivo. Cifras aproximadas.' },

        { title: '¿Dónde se va el agua?', layout: 'titleOnly', bg: BG, back: back(), extra: [
          chartBlock({ x: 80, y: 170, w: 760, h: 480, chartType: 'waterfall', color: TEAL, dataLabels: true, yTitle: 'litros',
            data: [{ label: 'Cultivo', value: 2100 }, { label: 'Hilado', value: 120 }, { label: 'Tinte', value: 300 }, { label: 'Confección', value: 30 }, { label: 'Lavados', value: 150 }, { label: 'Total', value: 0 }] }),
          ...[['78 %', 'en el campo', TEAL], ['11 %', 'en el tinte', PINK], ['6 %', 'en tu lavadora, en toda su vida', BLUE]].map(([n, l, c], i) =>
            withAnims(fig(n, l, 900, 180 + i * 160, 300, c), A('fade-left', { start: i ? 'afterPrev' : 'click', duration: 400 })))],
          notes: 'Gráfico de cascada: cada fase suma sobre la anterior hasta el total. Con un clic, los tres porcentajes que hay que recordar, en cadena.' },

        { title: 'Tres algodones', layout: 'titleOnly', bg: BG, back: back(), extra: [
          chartBlock({ x: 80, y: 170, w: 540, h: 440, chartType: 'hbar', color: TEAL, dataLabels: true, xTitle: 'litros por camiseta',
            data: [{ label: 'Convencional', value: 2700, color: TEAL }, { label: 'Orgánico', value: 1900, color: YEL }, { label: 'Reciclado', value: 350, color: ORANGE }] }),
          chartBlock({ x: 680, y: 170, w: 520, h: 440, chartType: 'bar', color: PINK, dataLabels: true, yTitle: 'kg de CO₂',
            data: [{ label: 'Convencional', value: 2.1 }, { label: 'Orgánico', value: 1.6 }, { label: 'Reciclado', value: 0.9 }] }),
          withAnims(text('El reciclado gasta casi <b>8 veces menos agua</b>: la fibra ya existe.', 80, 630, 1120, 44, { fontSize: 24, color: W, textAlign: 'center' }), A('fade-up'))],
          notes: 'Agua y emisiones de los tres tipos de algodón (cifras orientativas inventadas para el ejemplo). El clic añade la conclusión.' },

        { layout: 'blank', bg: BG, transition: 'fade', back: back(), extra: [
          HT('Más usos, menos huella', 80, 50, 900, 70, 52),
          mathBlock({ x: 80, y: 160, w: 480, h: 120, fontSize: 48, latex: '\\text{huella por uso} = \\dfrac{H}{n}', color: W }),
          text('<b>H</b>: la huella total de fabricarla.<br><b>n</b>: las veces que te la pones.', 84, 300, 460, 100, { fontSize: 24, color: DIM }),
          withAnims(fig('×2', 'usarla el doble de veces divide entre dos lo que cuesta cada puesta', 84, 450, 440, ORANGE), A('zoom-in')),
          chartBlock({ x: 600, y: 150, w: 620, h: 500, chartType: 'line', color: TEAL, dataLabels: true, xTitle: 'veces que se usa', yTitle: 'litros por uso',
            data: [['10', 270], ['25', 108], ['50', 54], ['100', 27], ['200', 13.5]].map(([label, value]) => ({ label, value })) })],
          notes: 'La fórmula en una línea y su gráfico: con 2.700 litros de huella, 10 usos son 270 litros por puesta y 200 usos apenas 13,5. El clic remata la idea.' },

        { title: 'Qué puedes hacer', layout: 'titleOnly', bg: BG, back: back(), extra: [
          ...[['Lavar en frío', '−60 % de energía en cada lavado', TEAL], ['Secar al aire', 'Ni secadora ni plancha si no hace falta', BLUE], ['Reparar', 'Un botón o una costura alargan años su vida', YEL], ['Segunda mano', 'Cada prenda reusada ahorra su fabricación', PINK]].map(([h, d, c], i) =>
            withAnims(card(`<div style="width:46px;height:8px;border-radius:4px;background:${c};margin-bottom:16px"></div><div style="font-family:${MS};font-size:28px;font-weight:800;color:${W}">${h}</div><div style="margin-top:8px">${d}</div>`,
              80 + i * 285, 210, 265, 270, '#ffffff0d', { fontSize: 22, color: DIM, radius: 16, borderColor: c + '88' }), A('flip', { start: i ? 'afterPrev' : 'click', duration: 400 }))),
          text('Fuente de las cifras: estimaciones redondeadas para este ejemplo.', 80, 540, 1120, 36, { fontSize: 18, color: DIM })],
          notes: 'Cuatro tarjetas que se voltean en cadena con un solo clic, cada una con su color de la infografía.' },

        { layout: 'blank', bg: BG, back: back(), extra: [
          pollBlock({ kind: 'multi', fontSize: 32, question: '¿Qué harás con tu próxima camiseta? Elige las que quieras', options: ['Lavarla en frío', 'Secarla al aire', 'Arreglarla', 'Comprarla usada', 'Darle otra vida'], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Votación múltiple desde el móvil para cerrar: se comentan las respuestas más votadas.' },
      ]), W));
    } },

  // ============================================================================
  // 10 · Bicycle gears without mystery: motions in sync — gears turning at their
  //      real ratio (same duration, different turns), wheels that roll the right
  //      distance, two lanes side by side, a derailleur that steps.
  show_anim_bike: { name: 'Las marchas de la bici, sin misterio', cat: 'showcase',
    summary: 'Movimientos sincronizados: engranajes que giran a su relación real, ruedas que ruedan su distancia, dos carriles a la vez y tabla',
    make: () => {
      const BG = '#f7f5f0', INK = '#22252a', OR = '#ff6b1a', STEEL = '#8f99a4', BLUE = '#2a6fdb', GREEN = '#1f9d6b', DIM = '#6d737b';
      const B = FF.bebas;
      const gear = (n, color, crank = false) => { const pts = [];
        for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 2 * Math.PI, r = i % 2 ? 92 : 100; pts.push(`${(110 + r * Math.cos(a)).toFixed(1)},${(110 + r * Math.sin(a)).toFixed(1)}`); }
        return svgURL(220, 220, `<polygon points="${pts.join(' ')}" fill="${color}"/><circle cx="110" cy="110" r="74" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="3"/>`
          + (n > 20 ? [0, 1, 2, 3, 4].map(k => { const a = k / 5 * 2 * Math.PI; return `<circle cx="${(110 + 48 * Math.cos(a)).toFixed(1)}" cy="${(110 + 48 * Math.sin(a)).toFixed(1)}" r="14" fill="${BG}"/>`; }).join('') : '')
          + `<circle cx="110" cy="110" r="${n > 20 ? 16 : 24}" fill="${INK}"/>` + (crank ? `<rect x="104" y="20" width="12" height="96" rx="6" fill="${INK}"/><rect x="88" y="10" width="44" height="18" rx="5" fill="${OR}"/>` : '')); };
      const wheel = svgURL(200, 200, `<circle cx="100" cy="100" r="92" fill="none" stroke="${INK}" stroke-width="12"/><circle cx="100" cy="100" r="82" fill="none" stroke="${STEEL}" stroke-width="3"/>`
        + Array.from({ length: 16 }, (_, i) => { const a = i / 16 * 2 * Math.PI; return `<line x1="100" y1="100" x2="${(100 + 82 * Math.cos(a)).toFixed(1)}" y2="${(100 + 82 * Math.sin(a)).toFixed(1)}" stroke="${STEEL}" stroke-width="1.5"/>`; }).join('')
        + `<circle cx="100" cy="100" r="9" fill="${INK}"/><rect x="96" y="6" width="8" height="10" fill="${OR}"/>`);
      const frame = svgURL(400, 240, `<g stroke="${OR}" stroke-width="9" stroke-linecap="round" fill="none"><path d="M90 170 L190 175 L165 80 Z"/><path d="M165 85 L285 80 L190 175"/><path d="M285 78 L310 170"/></g>`
        + `<path d="M285 78 L282 58 L304 52" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M165 80 L160 62" stroke="${INK}" stroke-width="6"/><rect x="140" y="52" width="44" height="12" rx="6" fill="${INK}"/>`
        + `<circle cx="190" cy="175" r="18" fill="none" stroke="${INK}" stroke-width="4"/><path d="M190 175 L200 205" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`);
      // A bike: the frame and its two wheels, which roll when it moves (dx px with wheels of 140 px: spin = dx / (π·140) · 360).
      const bike = (x, y, dx, props = {}, extra = []) => { const roll = Math.round(dx / (Math.PI * 140) * 360);
        return [withAnims(img(frame, x, y, 400, 240, 'Bicicleta'), path([[dx / 2, 0], [dx, 0]], { pathShape: 'line', ...props }), ...extra.map(e => e())),
          ...[20, 240].map(wx => withAnims(img(wheel, x + wx, y + 100, 140, 140, 'Rueda'), path([[dx / 2, 0], [dx, 0]], { pathShape: 'line', spin: roll, ...props, start: 'withPrev', sound: undefined }), ...extra.map(e => e())))]; };
      const HT = (t, x, y, w, h, size, color = INK, p = {}) => text(t, x, y, w, h, { fontFamily: B, fontSize: size, color, lineHeight: 1, ...p });
      const turn = (deg, props = {}) => path([[0, 0], [0, 0]], { spin: deg, ...props });
      const road = y => [R(0, y, 1280, 6, INK, { opacity: 85 }), ...Array.from({ length: 16 }, (_, i) => R(i * 84 + 20, y + 26, 44, 4, STEEL, { opacity: 50 }))];

      return numbered(ink2(build({ name: 'Las marchas de la bici', palette: 'office', fonts: 'bold', title: { color: INK, size: 64 }, body: { color: INK } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [R(0, 0, 1280, 720, BG), R(0, 0, 1280, 14, OR), ...road(610)], extra: [
          kicker('ESCUELA DE CICLISMO URBANO · TALLER 3', 80, 70, 700, OR),
          HT('LAS MARCHAS<br>DE LA BICI', 74, 104, 900, 230, 116),
          text('Sin misterio: plato, piñón, desarrollo y cadencia.', 80, 340, 760, 44, { fontSize: 28, color: DIM }),
          ...bike(40, 370, 760, { start: 'afterPrev', duration: 2800, delay: 400, sound: 'whoosh' })],
          notes: 'Al llegar, la bici cruza la diapositiva: el cuadro y las dos ruedas siguen la misma trayectoria a la vez, y las ruedas giran justo lo que corresponde a la distancia (vueltas = distancia ÷ perímetro). Por eso no «patinan».' },

        { layout: 'blank', bg: BG, transition: 'fade', back: [R(0, 0, 1280, 14, OR)], extra: [
          HT('PLATO Y PIÑÓN', 80, 50, 700, 80, 72),
          shape('rounded', 330, 228, 520, 300, 'none', { stroke: INK, strokeWidth: 6, dash: 'dash', radius: 150 }),
          withAnims(img(gear(44, INK, true), 200, 210, 340, 340, 'Plato de 44 dientes'), turn(360, { duration: 4000 })),
          withAnims(img(gear(11, OR), 770, 300, 110, 110, 'Piñón de 11 dientes'), turn(1440, { start: 'withPrev', duration: 4000 })),
          text('<b>Plato</b> · 44 dientes', 210, 575, 320, 40, { fontSize: 26, textAlign: 'center' }), text('<b>Piñón</b> · 11 dientes', 690, 545, 270, 40, { fontSize: 26, textAlign: 'center' }),
          withAnims(card(`<div style="font-family:${B};font-size:56px;color:${OR};line-height:1">1 → 4</div><div style="margin-top:6px">Una vuelta de pedal, cuatro vueltas de rueda.</div>`, 960, 170, 260, 190, '#ffffff', { fontSize: 22, color: INK, radius: 14, shadow: { x: 0, y: 6, blur: 18, color: '#00000018' } }), A('fade-left', { start: 'afterPrev' })),
          withAnims(mathBlock({ x: 960, y: 400, w: 260, h: 110, fontSize: 36, latex: '\\frac{44}{11} = 4', color: INK }), A('fade-up', { start: 'afterPrev' }))],
          notes: 'Un clic: los dos engranajes giran a la vez («con la anterior») y durante el mismo tiempo, pero el piñón da cuatro vueltas (1.440°) por una del plato (360°): la relación real. Después aparecen la conclusión y la cuenta.' },

        { layout: 'blank', bg: BG, transition: 'fade', back: [R(0, 0, 1280, 14, OR), ...road(612)], extra: [
          HT('EL DESARROLLO', 80, 50, 700, 80, 72),
          mathBlock({ x: 80, y: 150, w: 860, h: 110, fontSize: 40, latex: '\\text{desarrollo} = \\frac{44}{11} \\times 2{,}1\\ \\text{m} = 8{,}4\\ \\text{m}', color: INK, textAlign: 'left' }),
          text('Los metros que avanzas con cada pedalada: la relación por el perímetro de la rueda (2,1 m en una de carretera).', 80, 270, 860, 80, { fontSize: 24, color: DIM }),
          ...Array.from({ length: 9 }, (_, i) => [R(110 + i * 105, 600, 3, 22, INK), text(i + ' m', 85 + i * 105, 650, 60, 30, { fontSize: 18, color: DIM, textAlign: 'center' })]).flat(),
          withAnims(img(wheel, 40, 460, 140, 140, 'Rueda'), path([[420, 0], [840, 0]], { pathShape: 'line', spin: 687, duration: 3000 })),
          withAnims(text('8,4 m por pedalada', 880, 410, 360, 50, { fontFamily: B, fontSize: 44, color: OR }), A('zoom-in', { start: 'afterPrev', sound: 'chime' }))],
          notes: 'La rueda rueda 8,4 m a escala (105 px por metro): la trayectoria mide 840 px y el giro es 840 ÷ (π × 140) × 360 ≈ 687°, así que avanza sin deslizar. Al pararse, la cifra con campanilla.' },

        { title: 'CADA MARCHA, UNA RELACIÓN', layout: 'titleOnly', bg: BG, back: [R(0, 0, 1280, 14, OR)], extra: [
          tableBlock({ x: 100, y: 180, w: 1080, h: 420, fontSize: 24, header: true, headBg: INK, headFg: '#ffffff', stroke: '#d9d5cc', banded: true, band: OR, bandAlpha: 0.08, colW: [3, 3, 3, 4, 4],
            rows: [['Plato', 'Piñón', 'Relación', 'Desarrollo (m)', 'A 90 pedaladas (km/h)'], ['34', '32', '=REDONDEAR(A2/B2;2)', '=REDONDEAR(C2*2,1;1)', '=REDONDEAR(D2*90*60/1000;1)'],
              ['34', '24', '=REDONDEAR(A3/B3;2)', '=REDONDEAR(C3*2,1;1)', '=REDONDEAR(D3*90*60/1000;1)'], ['34', '17', '=REDONDEAR(A4/B4;2)', '=REDONDEAR(C4*2,1;1)', '=REDONDEAR(D4*90*60/1000;1)'],
              ['50', '17', '=REDONDEAR(A5/B5;2)', '=REDONDEAR(C5*2,1;1)', '=REDONDEAR(D5*90*60/1000;1)'], ['50', '13', '=REDONDEAR(A6/B6;2)', '=REDONDEAR(C6*2,1;1)', '=REDONDEAR(D6*90*60/1000;1)'],
              ['50', '11', '=REDONDEAR(A7/B7;2)', '=REDONDEAR(C7*2,1;1)', '=REDONDEAR(D7*90*60/1000;1)']] }),
          text('Todo son fórmulas: cambia los dientes y la tabla recalcula relación, desarrollo y velocidad.', 100, 620, 1080, 40, { fontSize: 22, color: DIM })],
          notes: 'Tabla con fórmulas encadenadas: relación = plato ÷ piñón; desarrollo = relación × 2,1 m; velocidad a 90 pedaladas por minuto = desarrollo × 90 × 60 ÷ 1000.' },

        (() => {   // Two lanes at once: same pedalling (three turns in 3 s), different gear: one barely moves, the other flies.
          const lane = (y, label, sub, dx, color) => { const roll = Math.round(dx / (Math.PI * 90) * 360);
            return [R(60, y + 92, 1160, 4, INK, { opacity: 60 }), text(`<b>${label}</b> · ${sub}`, 60, y - 50, 800, 40, { fontSize: 24, color }),
              withAnims(img(gear(34, color, true), 60, y - 4, 96, 96, 'Biela y plato'), turn(1080, { duration: 3000, start: color === BLUE ? 'click' : 'withPrev' })),
              withAnims(img(wheel, 200, y, 90, 90, 'Rueda'), path([[dx / 2, 0], [dx, 0]], { pathShape: 'line', spin: roll, start: 'withPrev', duration: 3000 }))]; };
          return { title: 'CUESTA ARRIBA O EN LLANO', layout: 'titleOnly', bg: BG, back: [R(0, 0, 1280, 14, OR)], extra: [
            ...lane(230, 'Marcha corta 34/32', '6,7 m en tres pedaladas', 200, BLUE),
            ...lane(470, 'Marcha larga 50/11', '28,6 m en tres pedaladas', 860, OR),
            withAnims(text('Mismo esfuerzo de piernas: con la corta subes sin ahogarte; con la larga vuelas en llano.', 60, 630, 1160, 40, { fontSize: 22, color: DIM }), A('fade-in', { start: 'afterPrev' }))],
            notes: 'Las dos bielas dan tres vueltas en los mismos 3 segundos; las ruedas avanzan a escala lo que corresponde a cada marcha. Cuatro animaciones «con la anterior» y la misma duración: así se comparan dos cosas a la vez.' };
        })(),

        { title: 'VELOCIDAD SEGÚN LA CADENCIA', layout: 'titleOnly', bg: BG, back: [R(0, 0, 1280, 14, OR)], extra: [
          chartBlock({ x: 80, y: 170, w: 760, h: 480, chartType: 'line', grid: true, xTitle: 'pedaladas por minuto', yTitle: 'km/h', seriesName: '34/32', color: BLUE,
            data: [60, 70, 80, 90, 100].map(c => ({ label: String(c), value: +(c * 2.23 * 60 / 1000).toFixed(1) })),
            series: [{ name: '34/17', color: GREEN, values: [60, 70, 80, 90, 100].map(c => +(c * 4.2 * 60 / 1000).toFixed(1)) }, { name: '50/11', color: OR, values: [60, 70, 80, 90, 100].map(c => +(c * 9.55 * 60 / 1000).toFixed(1)) }] }),
          ...[['80–90', 'pedaladas por minuto: la cadencia cómoda', OR], ['Cambia antes', 'de que la cuesta te frene, no a mitad', BLUE]].map(([n, l, c], i) =>
            withAnims(card(`<div style="font-family:${B};font-size:44px;color:${c};line-height:1">${n}</div><div style="margin-top:6px">${l}</div>`, 890, 190 + i * 200, 320, 170, '#ffffff', { fontSize: 21, color: INK, radius: 14, shadow: { x: 0, y: 6, blur: 18, color: '#00000018' } }), A('fade-left', { start: i ? 'afterPrev' : 'click' })))],
          notes: 'Tres marchas, tres rectas: a igual cadencia, la marcha larga va mucho más rápida. Con el clic, los dos consejos de la escuela.' },

        (() => {   // The derailleur steps down the cassette: one click, one gear, one "click".
          const COGS = [32, 28, 24, 21, 17, 13, 11];   // (the same sprockets as the table)
          const steps = COGS.slice(1).map(() => path([[0, 30], [0, 62]], { pathShape: 'line', duration: 350, sound: 'click' }));
          return { title: 'CAMBIAR, PASO A PASO', layout: 'titleOnly', bg: BG, back: [R(0, 0, 1280, 14, OR)], extra: [
            ...COGS.map((n, i) => shape('rounded', 380 - (100 + n * 5) / 2, 190 + i * 62, 100 + n * 5, 40, i % 2 ? STEEL : '#b8c0c8', { radius: 8, html: n + ' dientes', fontSize: 18, color: INK, fontWeight: 700 })),
            withAnims(shape('rightarrow', 70, 190, 90, 40, OR), ...steps),
            ...[['Pedalea suave mientras cambias', 'La cadena sube o baja de piñón solo si gira.'], ['De uno en uno', 'Cada clic de la maneta, un piñón.'], ['No cruces la cadena', 'Plato grande con piñón grande la desgasta.']].map(([h, d], i) =>
              withAnims(text(`<div style="font-family:${B};font-size:34px;color:${[OR, BLUE, GREEN][i]}">${h}</div><div>${d}</div>`, 640, 190 + i * 140, 560, 120, { fontSize: 22, color: INK }), A('fade-left', { start: 'withPrev', delay: 100 }))).map((b, i) => b),
          ],
            notes: 'Cada clic baja la flecha (el cambio) un piñón, con su «clic», como la maneta de verdad: la misma flecha lleva seis trayectorias cortas seguidas. Los consejos aparecen con los tres primeros cambios.' };
        })(),

        { layout: 'blank', bg: BG, back: [R(0, 0, 1280, 14, OR)], extra: [
          pollBlock({ kind: 'quiz', question: 'Empieza un puerto de montaña. ¿Qué combinación eliges?', options: ['Plato grande y piñón pequeño', 'Plato pequeño y piñón grande', 'Da igual: depende de las piernas'], correct: [1], time: 20, fontSize: 36, x: 70, y: 50, w: 1140, h: 620 })],
          notes: 'Pregunta con puntos desde el móvil: la marcha corta (plato pequeño, piñón grande) es la de subir.' },

        { layout: 'blank', bg: BG, transition: 'fade', back: [R(0, 0, 1280, 14, OR), ...road(560)], extra: [
          HT('¡A RODAR!', 80, 90, 700, 140, 140, OR),
          text('Sábado a las 10:00 · salida desde la escuela · 25 km llanos y una cuesta para practicar', 80, 240, 700, 90, { fontSize: 26, color: DIM }),
          ...bike(780, 320, 560, { start: 'afterPrev', duration: 2600, delay: 600, sound: 'whoosh' })],
          notes: 'Despedida: la bici arranca sola y sale de la diapositiva por la derecha, con las ruedas girando lo justo.' },
      ]), INK));
    } },
};
