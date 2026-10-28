// Example presentation: Barcelona, de Barcino a Gaudí (showcase).
//
// A class on Barcelona (ESO, Bachillerato and trips) with six real 3D models made with Revela's own AI (TRELLIS.2 through
// Runware): the Sagrada Família, the Drac of Park Güell, a Gaudí lamp post of the Plaça Reial, the Torre Glòries, the façade of
// the Casa Batlló and a casteller (with a skeleton made by Revela's automatic rig: Idle, Walk… clips). They are files of the
// repository (assets/ai3d/barcelona-*.glb with a transparent cover *.webp), "inspired by" the real works, never the pieces
// themselves nor to scale; the three monuments may have invented details. Look: Modernisme / Gaudí. A warm sand wall,
// trencadís (broken-tile mosaic: turquoise, green, yellow, off-white) drawn with shapes, wavy lines, Abril Fatface.
// Only facts read in reliable pages go on the slides (the notes of each slide give the source).

import { build, text, shape, A, withAnims, path, numbered, base, pairStacks } from './kit.js';

const SAND = '#f3e9d2', SAND2 = '#e6d5ae', CARD = '#fffaf0', LINE = '#d8c7a0', INK = '#1b2f38', MUTE = '#4b5a5e',
  TURQ = '#12a3a6', TEAL = '#0b6670', GREEN = '#5aa83d', YEL = '#f4b52e', WHITE = '#fbf6e8', CORAL = '#d9532f', BLUE = '#3a86c4',
  NIGHT = '#0d4350', NIGHT2 = '#06242d';
const STONEC = '#d6c298';
const TILES = [TURQ, TEAL, GREEN, YEL, WHITE, BLUE, TURQ, GREEN];
const SERIF = pairStacks('display').heading;
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
// (Absolute, from where the app is served: an exported or shared copy keeps finding the files.)
const A3 = new URL('../../../../assets/ai3d/', import.meta.url).href;
const ai3d = (id, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'model', src: `${A3}${id}.glb`, poster: `${A3}${id}.webp`,
  alt, autoRotate: false, view: 'front', ...props });
const kicker = (t, x, y, w, props = {}) => text(t, x, y, w, 30, { fontSize: 16, letterSpacing: 4, color: TEAL, fontWeight: 700, ...props });
const H = (t, x, y, w, h, size, props = {}) => text(t, x, y, w, h, { fontFamily: SERIF, fontSize: size, color: INK, lineHeight: 1.05, ...props });
const foot = (x = 60, color = MUTE) => text('Barcelona · modelos 3D hechos con IA en Revela, inspirados en las obras reales', x, 672, 760, 26, { fontSize: 13, color, letterSpacing: 1 });
// A tiny deterministic random, so the mosaic is the same every time.
const rnd = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
// Trencadís: a band of broken tiles, each a little turned.
const band = (y, h, seed, ground = SAND, step = 34) => { const r = rnd(seed), out = [];
  for (let x = -10; x < 1290; x += step) { const w = step * (0.8 + r() * 0.5), k = h * (0.7 + r() * 0.35);
    out.push(R(x, y + (h - k) / 2, w, k, TILES[Math.floor(r() * TILES.length)], { rotation: Math.round((r() - 0.5) * 36), stroke: ground, strokeWidth: 2 })); }
  return out; };
// A ring of tiles around a piece (the mosaic on a medallion).
const ring = (cx, cy, rad, seed, n = 30, size = 34, ground = SAND) => { const r = rnd(seed);
  return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, s = size * (0.75 + r() * 0.5);
    return R(cx + Math.cos(a) * rad - s / 2, cy + Math.sin(a) * rad - s / 2, s, s * (0.8 + r() * 0.3), TILES[Math.floor(r() * TILES.length)],
      { rotation: Math.round(a * 57.3 + (r() - 0.5) * 40), stroke: ground, strokeWidth: 2 }); }); };
// A wavy line made of round beads (the bench of Park Güell).
const wave = (y, amp = 14, step = 40, seed = 7, size = 26) => { const r = rnd(seed);
  return Array.from({ length: Math.ceil(1300 / step) }, (_, i) => E(i * step - 10, y + Math.sin(i * 0.7) * amp, size, size, TILES[Math.floor(r() * 5)], { opacity: 0.95 })); };
// Backgrounds: warm sand wall with a mosaic band on top, or the deep-teal night.
const wall = (seed = 3) => [R(0, 0, 1280, 720, SAND, { fill2: SAND2, gradType: 'radial' }), ...band(0, 30, seed), R(0, 666, 1280, 2, LINE), ...band(700, 20, seed + 40, SAND, 40)];
const night = (seed = 5) => [R(0, 0, 1280, 720, NIGHT, { fill2: NIGHT2, gradType: 'radial' }), ...band(0, 30, seed, NIGHT), ...band(700, 20, seed + 40, NIGHT2, 40)];
// A round light behind a piece, and its shadow on the floor.
const halo = (cx, cy, d = 520, color = '#ffffff', op = 0.6) => E(cx - d / 2, cy - d / 2, d, d, color, { opacity: op });
const floor = (cx, y, w = 400, dark = '#8c7a58') => [E(cx - w / 2, y, w, 40, dark, { opacity: 0.3 }), E(cx - w / 2 + 50, y + 8, w - 100, 24, dark, { opacity: 0.35 })];
const stage = (cx, cy, d, seed, dark = false) => [halo(cx, cy, d, dark ? '#2a8a96' : '#ffffff', dark ? 0.45 : 0.65), ...ring(cx, cy, d / 2 - 6, seed, 34, 34, dark ? NIGHT : SAND)];
const card = (x, y, w, h, accent = TURQ) => [R(x, y, w, h, CARD, { radius: 14, stroke: LINE, strokeWidth: 1 }),
  R(x + 8, y + 10, 8, h - 20, accent, { radius: 4 })];
// A fact: a bold title and one or two lines, on a card.
const fact = (t, d, x, y, w, h = 110, accent = TURQ) => [...card(x, y, w, h, accent),
  text(`<div style="font-family:${SERIF};font-size:25px;color:${INK}">${t}</div><div style="margin-top:4px">${d}</div>`,
    x + 28, y, w - 42, h, { fontSize: 18, color: MUTE, lineHeight: 1.3, vAlign: 'middle', pad: [6, 6, 6, 6] })];
// A small label saying the model is AI-made.
const tag = (x, y, w = 300, dark = false) => text('Modelo hecho con IA, inspirado en la obra real', x, y, w, 30,
  { fontSize: 14, color: dark ? NIGHT2 : WHITE, bg: dark ? YEL : TEAL, radius: 15, textAlign: 'center', vAlign: 'middle', fontWeight: 700 });
// Each part appears with a click, one after another.
const seq = (parts, i, effect = 'fade-left') => parts.map((b, j) => withAnims(b, A(effect, { start: i || j ? 'withPrev' : 'click', duration: 420 })));
const ACC = [TURQ, YEL, GREEN, CORAL];

// One slide for one monument: the piece in a mosaic medallion on one side, its label and facts on the other.
const piece = ({ id, alt, kick, title, lead, facts, notes, dark = false, left = true, view = 'front', spin = 12, tagw = 300 }) => {
  const cx = left ? 330 : 950, tx = left ? 650 : 70, tw = 560, fg = dark ? WHITE : INK;
  return { layout: 'blank', transition: 'fade', back: [...(dark ? night(11) : wall(11)), ...stage(cx, 350, 520, 21, dark), ...floor(cx, 590, 340, dark ? '#000000' : '#8c7a58')], notes,
    extra: [withAnims(ai3d(id, cx - 220, 90, 440, 520, alt, { autoRotate: true, spin, view, edge: 'fade' }), A('zoom-in', { start: 'withPrev', duration: 700 })),
      tag(cx - tagw / 2, 622, tagw, dark),
      kicker(kick, tx, 62, tw, { color: dark ? YEL : TEAL }), H(title, tx - 4, 92, tw, 110, 46, { color: fg }),
      text(lead, tx, 204, tw, 50, { fontSize: 20, color: dark ? '#d3e6e8' : INK, lineHeight: 1.3 }),
      ...facts.flatMap(([t, d], i) => seq(fact(t, d, tx, 262 + i * 100, tw, 92, ACC[i % 4]), i)), foot(60, dark ? '#9cc3c8' : MUTE)] };
};

export default {
  show_barcelona: { name: 'Barcelona: Gaudí, Barcino y castells', cat: 'showcase',
    summary: 'Clase sobre Barcelona con seis modelos 3D hechos con IA: Sagrada Família, Drac, Batlló, Torre Glòries, un fanal y un casteller que pasea',
    make: () => numbered(build({ name: 'Barcelona: Gaudí, Barcino y castells', palette: 'paper', fonts: 'display', title: { color: INK, size: 46 }, body: { color: INK }, bg: SAND }, [

      // 1 · cover
      { layout: 'blank', transition: 'fade', back: [...night(2), ...wave(652, 8, 44, 9, 18), ...stage(940, 340, 520, 31, true), ...floor(940, 580, 380, '#000000')], extra: [
        kicker('ESO · BACHILLERATO · VIAJES', 80, 130, 700, { color: YEL }),
        H('BARCELONA', 76, 168, 700, 130, 100, { color: WHITE }),
        text('De Barcino a Gaudí, pasando por los castells', 80, 320, 580, 100, { fontFamily: SERIF, fontSize: 34, color: YEL, lineHeight: 1.15 }),
        text('Una ciudad contada con modelos 3D hechos con IA que puedes girar con el ratón', 80, 450, 560, 90, { fontSize: 22, color: '#d3e6e8', lineHeight: 1.3 }),
        tag(790, 600, 300, true),
        withAnims(ai3d('barcelona-drac', 720, 80, 440, 500, 'El Drac de trencadís del Park Güell en 3D, creado con IA', { autoRotate: true, spin: 14, edge: 'fade' }), A('zoom-in', { start: 'withPrev', duration: 700 }))],
        notes: 'Bienvenida. Vamos a recorrer Barcelona con seis modelos en tres dimensiones que se pueden girar con el ratón o con el dedo. Todos se han creado con la IA de Revela a partir de una descripción: son interpretaciones inspiradas en las obras reales, no son las piezas ni están a escala, y los monumentos pueden tener detalles inventados. En la portada gira el Drac, la salamandra de trencadís del Park Güell. Trencadís es el mosaico hecho con trozos de cerámica rotos; lo veréis en todas las diapositivas.' },

      // 2 · Barcino
      { layout: 'blank', transition: 'fade', back: wall(4), extra: [
        kicker('BARCINO · LA CIUDAD ROMANA', 70, 60, 600), H('BAJO TUS PIES HAY UNA CIUDAD ROMANA', 66, 92, 700, 130, 44),
        ...seq(fact('Entre el 15 y el 13 a. C.', 'Los romanos fundan la colonia de Barcino.', 70, 250, 640, 100, TURQ), 0),
        ...seq(fact('Mons Taber', 'La colina donde hoy está la Plaça de Sant Jaume.', 70, 366, 640, 100, YEL), 1),
        ...seq(fact('Un museo en el subsuelo', 'El MUHBA permite pasear por calles y edificios romanos bajo la ciudad actual.', 70, 482, 640, 116, GREEN), 2),
        // four columns of the Temple of Augustus, drawn
        ...seq([R(790, 560, 400, 30, STONEC), ...[0, 1, 2, 3].flatMap(i => [R(820 + i * 90, 170, 56, 20, STONEC), R(830 + i * 90, 190, 36, 370, '#e4d3ab', { stroke: '#cdb98f', strokeWidth: 2 }),
          R(824 + i * 90, 548, 48, 14, STONEC)]), R(800, 150, 380, 22, STONEC),
          text('Carrer Paradís · cuatro columnas de 12 m', 790, 600, 400, 34, { fontSize: 18, color: MUTE, textAlign: 'center', fontWeight: 700 })], 3, 'fade-up'),
        text('Esquema, no a escala', 1030, 118, 160, 24, { fontSize: 13, color: MUTE }), foot()],
        notes: 'Antes de Gaudí, Barcelona fue Barcino. Según la web de turismo de la ciudad, los romanos llegaron entre el 15 y el 13 antes de Cristo y fundaron la colonia en el Mons Taber, la colina donde hoy está la Plaça de Sant Jaume. Cuatro columnas de doce metros del templo dedicado a Augusto se conservan escondidas en el patio de un palacio gótico del Carrer Paradís. Y el Museu d\'Història de Barcelona se asienta sobre los restos: se camina por calles romanas bajo el suelo. El dibujo de las columnas es un esquema. (meet.barcelona, Visit and love it · Roman Barcino)' },

      // 3 · Eixample
      { layout: 'blank', transition: 'fade', back: wall(6), extra: [
        kicker('EL EIXAMPLE · EL PLAN DE CERDÀ', 70, 60, 600), H('UNA CUADRÍCULA CON LAS ESQUINAS CORTADAS', 66, 92, 640, 130, 42),
        ...seq(fact('Se aprueba en 1859', 'Una real orden aprobó el plan del ingeniero Ildefons Cerdà.', 70, 250, 600, 100, TURQ), 0),
        ...seq(fact('Manzanas de unos 113 m', 'Calles de 20 m y esquinas cortadas en chaflán (xamfrans).', 70, 366, 600, 100, YEL), 1),
        ...seq(fact('Sol y aire para todos', 'Cada manzana lleva un patio interior para dar luz y ventilación.', 70, 482, 600, 110, GREEN), 2),
        ...seq([R(730, 120, 470, 500, '#efe0bd', { radius: 14, stroke: LINE, strokeWidth: 1 }),
          ...[0, 1, 2, 3].flatMap(i => [0, 1, 2, 3].flatMap(j => { const x = 752 + i * 112, y = 142 + j * 118;
            return [R(x, y, 100, 106, TILES[(i * 2 + j * 3) % 5 === 4 ? 0 : (i * 2 + j * 3) % 5], { opacity: 0.85 })]; })),
          ...[0, 1, 2, 3, 4].flatMap(i => [0, 1, 2, 3, 4].map(j => R(740 + i * 112 + 0, 132 + j * 118 - 2, 22, 22, '#efe0bd', { rotation: 45 }))),
          text('Esquema, no a escala', 730, 622, 470, 26, { fontSize: 13, color: MUTE, textAlign: 'center' })], 3, 'fade-up'), foot()],
        notes: 'En el siglo XIX Barcelona rompió sus murallas y creció con el Eixample, el ensanche. El plan del ingeniero Ildefons Cerdà se aprobó por real orden el 9 de junio de 1859. Son manzanas cuadradas de unos 113 metros de lado, con calles de 20 metros y esquinas cortadas en chaflán, y urbanizaron unas 1.100 hectáreas fuera de las murallas medievales. Cada manzana tenía un patio interior para que todas las viviendas tuvieran sol, luz y ventilación. En el dibujo, mirad cómo las esquinas cortadas abren cada cruce. (en.wikipedia.org: Cerdà Plan y Eixample)' },

      // 4 · Modernisme
      { layout: 'blank', transition: 'fade', back: [...wall(8), ...wave(236, 10, 46, 13, 22)], extra: [
        kicker('EL MODERNISME', 70, 60, 500), H('1888 — 1911', 66, 90, 700, 120, 84, { color: TEAL }),
        text('Una época en que Barcelona se llenó de colores, curvas y naturaleza', 70, 280, 560, 110, { fontSize: 24, color: INK, lineHeight: 1.3 }),
        text('Entre la Exposición Universal de 1888 y la muerte de Joan Maragall en 1911', 70, 400, 560, 80, { fontSize: 18, color: MUTE, lineHeight: 1.3 }),
        ...seq(fact('Antoni Gaudí', 'Sagrada Família, Park Güell, Casa Batlló…', 680, 290, 520, 96, TURQ), 0),
        ...seq(fact('Lluís Domènech i Montaner', 'Palau de la Música Catalana y Hospital de Sant Pau (Patrimonio Mundial, 1997).', 680, 400, 520, 110, YEL), 1),
        ...seq(fact('Josep Puig i Cadafalch', 'Casa de les Punxes, construida entre 1903 y 1905.', 680, 524, 520, 96, GREEN), 2), foot()],
        notes: 'El Modernisme es el movimiento artístico catalán que va, aproximadamente, de la Exposición Universal de 1888 a 1911, el año de la muerte del poeta Joan Maragall. Sus tres grandes arquitectos son Gaudí, Domènech i Montaner y Puig i Cadafalch. El Palau de la Música y el Hospital de Sant Pau, de Domènech i Montaner, son Patrimonio Mundial desde 1997. La Casa de les Punxes es de Puig i Cadafalch, de 1903 a 1905. Pregunta para la clase: ¿qué tienen en común las fachadas que veremos? (en.wikipedia.org: Catalan modernism y Eixample)' },

      // 5 · Sagrada Família
      piece({ id: 'barcelona-sagrada', alt: 'La Sagrada Família en 3D, creada con IA', dark: true, left: true, view: 'front', spin: 10,
        kick: 'ANTONI GAUDÍ', title: 'LA SAGRADA FAMÍLIA', lead: 'Una basílica que se construye desde hace más de 140 años.',
        facts: [['19 de marzo de 1882', 'Empiezan las obras, con otro arquitecto: Francisco de Paula del Villar.'], ['1883', 'Gaudí se hace cargo del proyecto. Muere en 1926 con la obra casi sin hacer.'], ['7 de noviembre de 2010', 'Benedicto XVI consagra la basílica.'], ['172,5 m', 'Altura prevista de la Torre de Jesucristo, terminada en febrero de 2026.']],
        notes: 'La Sagrada Família empezó el 19 de marzo de 1882 con el arquitecto Francisco de Paula del Villar. Gaudí se hizo cargo en 1883 y murió en 1926, cuando la obra estaba, según la Wikipedia, entre un 15 y un 25 por ciento terminada. El papa Benedicto XVI la consagró el 7 de noviembre de 2010. La Torre de Jesucristo, la más alta, tiene una altura prevista de 172,5 metros y su estructura se completó en febrero de 2026. Recordad: el modelo es una versión hecha con IA, y tiene detalles inventados. (en.wikipedia.org: Sagrada Família; artdependence.com)' }),

      // 6 · Park Güell and the Drac
      piece({ id: 'barcelona-drac', alt: 'El Drac, salamandra de trencadís del Park Güell, en 3D creado con IA', dark: false, left: false, spin: 14, tagw: 300,
        kick: 'PARK GÜELL', title: 'EL DRAC DE TRENCADÍS', lead: 'La salamandra multicolor de Gaudí: «el Drac».',
        facts: [['De 1900 a 1914', 'Se construye por encargo del industrial Eusebi Güell, que soñaba con una ciudad jardín.'], ['1926', 'El parque se abre al público.'], ['1984', 'Entra en el Patrimonio Mundial como parte de «Obras de Antoni Gaudí».'], ['2007', 'Se restaura el Drac.']],
        notes: 'El Park Güell se construyó entre 1900 y 1914 por encargo de Eusebi Güell, un industrial que había pensado una urbanización inspirada en las ciudades jardín inglesas. Se abrió al público en 1926 y es Patrimonio Mundial desde 1984, dentro del conjunto Obras de Antoni Gaudí. La salamandra de mosaico, el Drac, se restauró en 2007. Ojo: el modelo que gira es una pequeña figura hecha con IA, inspirada en el Drac; no es la escultura real. (en.wikipedia.org: Park Güell)' }),

      // 7 · Casa Batlló
      piece({ id: 'barcelona-batllo', alt: 'Fachada de la Casa Batlló en 3D, creada con IA', dark: true, left: true, spin: 12,
        kick: 'PASSEIG DE GRÀCIA 43', title: 'LA CASA BATLLÓ', lead: 'Fachada de colores y tejado como lomo de dragón.',
        facts: [['1877', 'Se construye la casa original, antes de Gaudí.'], ['1904–1906', 'El industrial Josep Batlló contrata a Gaudí y, en lugar de derribarla, la reforma.'], ['Un tejado vivo', 'Se suele comparar con el lomo de un dragón, con tejas como escamas.'], ['2005', 'Patrimonio Mundial de la UNESCO.']],
        notes: 'La Casa Batlló la diseñó en 1877 Emili Sala Cortés. En 1904 el industrial textil Josep Batlló contrató a Gaudí, que lo convenció de reformarla en vez de derribarla; terminó en 1906. Al tejado arqueado se le compara con el lomo de un dragón, con tejas de colores como escamas. Es Patrimonio Mundial desde 2005 y está en el Passeig de Gràcia número 43, en pleno Eixample. El modelo es una fachada interpretada por la IA: contad con los alumnos qué ventanas y balcones creen que son inventados. (en.wikipedia.org: Casa Batlló)' }),

      // 8 · the lamp post of the Plaça Reial
      piece({ id: 'barcelona-fanal', alt: 'Fanal de Gaudí de la Plaça Reial en 3D, creado con IA', dark: false, left: false, spin: 16,
        kick: 'PLAÇA REIAL', title: 'EL FANAL DE GAUDÍ', lead: 'Gaudí también diseñó farolas para la ciudad.',
        facts: [['1878', 'Fecha de las farolas de Gaudí en la lista de sus obras.'], ['Plaza del siglo XIX', 'Diseñada por Francesc Daniel Molina i Casamajó.'], ['Antes, un convento', 'El convento capuchino de Santa Madrona se derribó en 1835.'], ['Compara', 'El modelo es una interpretación: compáralo con fotos reales.']],
        notes: 'En la Plaça Reial, diseñada por Francesc Daniel Molina i Casamajó en el siglo XIX sobre el solar de un convento capuchino derribado en 1835, hay unas farolas diseñadas por Gaudí. La lista de obras de Gaudí las data en 1878. Este modelo está hecho con IA a partir de una descripción: puede tener un número de brazos y unos adornos que no coinciden con los reales. Proponed a la clase buscar una foto del fanal real y señalar las diferencias. (en.wikipedia.org: Plaça Reial)' }),

      // 9 · Torre Glòries
      piece({ id: 'barcelona-torre', alt: 'Torre Glòries en 3D, creada con IA', dark: true, left: true, view: 'front', spin: 14,
        kick: 'JEAN NOUVEL', title: 'LA TORRE GLÒRIES', lead: 'Un rascacielos del siglo XXI que se parece a un géiser.',
        facts: [['144,44 m', 'Altura hasta la cubierta. Obras de 1999 a 2004; abre al público en 2005.'], ['Antes, Torre Agbar', 'Se renombró hacia 2017, por la plaza vecina.'], ['Un géiser y Montserrat', 'Nouvel dijo que recuerda un géiser; también cita los campanarios de la Sagrada Família.'], ['Más de 4.500 LED', 'Pueden crear imágenes en la fachada, con 16 millones de colores.']],
        notes: 'La Torre Glòries la diseñó el arquitecto francés Jean Nouvel junto con el estudio b720. Mide 144,44 metros hasta la cubierta; se construyó entre 1999 y 2004 y abrió al público en junio de 2005. Se llamó Torre Agbar hasta que, hacia 2017, pasó a llamarse como la plaza vecina. Nouvel dijo que su forma recuerda un géiser y que se inspira en las rocas de Montserrat y en los campanarios de la Sagrada Família. Tiene más de 4.500 dispositivos LED en la fachada. Mirad el modelo: la IA ha puesto franjas rojas y azules, como los colores de la fachada. (en.wikipedia.org: Torre Glòries)' }),

      // 10 · compare heights
      { layout: 'blank', transition: 'fade', back: wall(14), extra: [
        kicker('PARA COMPARAR', 70, 60, 500), H('DOS TORRES, DOS ÉPOCAS', 66, 92, 700, 70, 46),
        text('Un campanario de Gaudí y un rascacielos de Nouvel: ¿qué tienen en común sus formas?', 70, 172, 560, 100, { fontSize: 22, color: INK, lineHeight: 1.3 }),
        ...seq(fact('Una inspiración compartida', 'Nouvel cita los campanarios de la Sagrada Família entre las fuentes de su torre.', 70, 300, 560, 120, GREEN), 0),
        ...seq(fact('28 m de diferencia', '172,5 m de la Torre de Jesucristo frente a 144,44 m de la Torre Glòries.', 70, 440, 560, 120, YEL), 1),
        ...seq([R(760, 612, 440, 6, INK),
          R(790, 612 - 172.5 * 2.6, 150, 172.5 * 2.6, TURQ, { radius: 6 }), text('172,5 m', 790, 612 - 172.5 * 2.6 - 38, 150, 34, { fontFamily: SERIF, fontSize: 28, color: INK, textAlign: 'center' }),
          text('Torre de Jesucristo', 790, 560, 150, 44, { fontSize: 16, color: WHITE, textAlign: 'center', fontWeight: 700, vAlign: 'middle' }),
          R(1010, 612 - 144.44 * 2.6, 150, 144.44 * 2.6, CORAL, { radius: 6 }), text('144,44 m', 1010, 612 - 144.44 * 2.6 - 38, 150, 34, { fontFamily: SERIF, fontSize: 28, color: INK, textAlign: 'center' }),
          text('Torre Glòries', 1010, 560, 150, 44, { fontSize: 16, color: WHITE, textAlign: 'center', fontWeight: 700, vAlign: 'middle' })], 2, 'fade-up'),
        text('Las alturas son de las obras reales; los modelos 3D no están a escala', 70, 600, 620, 50, { fontSize: 16, color: MUTE, lineHeight: 1.3 }), foot()],
        notes: 'Comparemos dos torres. La más alta de la Sagrada Família, la Torre de Jesucristo, tiene una altura prevista de 172,5 metros; la Torre Glòries mide 144,44 metros. Son unos 28 metros de diferencia. Nouvel citó los campanarios de la Sagrada Família entre sus inspiraciones. Las barras sí guardan la proporción de las alturas reales, pero los modelos 3D de las diapositivas anteriores no están a escala. (en.wikipedia.org: Sagrada Família y Torre Glòries)' },

      // 11 · castells
      (() => {
        const route = [[200, 10], [420, -8], [640, 8]];
        return { layout: 'blank', transition: 'fade', back: [...wall(16), R(0, 636, 1280, 30, '#d9c59a'), ...band(636, 30, 61, SAND, 60)], extra: [
          kicker('LOS CASTELLS · PATRIMONIO INMATERIAL', 70, 52, 800), H('TORRES HUMANAS QUE SE ESCALAN', 66, 82, 1000, 60, 40),
          ...seq(fact('Unesco, 2010', 'Los castells entran en la Lista Representativa del Patrimonio Cultural Inmaterial.', 70, 156, 380, 116, TURQ), 0),
          ...seq(fact('De 6 a 10 pisos', 'Los castellers se suben unos sobre los hombros de otros.', 470, 156, 380, 116, YEL), 1),
          ...seq(fact('Faixa y gralla', 'La faja protege la espalda; la gralla, un instrumento de viento, marca el ritmo.', 870, 156, 340, 116, GREEN), 2),
          // the tower: pinya, tronc, pom de dalt
          ...seq([R(940, 540, 270, 70, TEAL, { radius: 10 }), text('pinya · la base', 940, 540, 270, 70, { fontSize: 19, color: WHITE, textAlign: 'center', vAlign: 'middle', fontWeight: 700 }),
            R(985, 460, 180, 70, TURQ, { radius: 10 }), text('tronc', 985, 460, 180, 70, { fontSize: 19, color: WHITE, textAlign: 'center', vAlign: 'middle', fontWeight: 700 }),
            R(1010, 380, 130, 70, YEL, { radius: 10 }), text('pom de dalt · niños', 1010, 380, 130, 70, { fontSize: 15, color: INK, textAlign: 'center', vAlign: 'middle', fontWeight: 700 })], 3, 'fade-up'),
          withAnims(ai3d('barcelona-casteller', 70, 280, 230, 360, 'Casteller con faja negra y camisa roja en 3D, creado con IA', { clip: 'Idle', walk: { clip: 'Walk', end: 'Idle', face: true, look: false, stride: 0.67 } }), path(route, { duration: 5200 })),
          text('Clic: echa a andar', 380, 596, 230, 34, { fontSize: 16, color: WHITE, bg: CORAL, radius: 17, textAlign: 'center', vAlign: 'middle' }), foot()],
          notes: 'Un clic y nuestro casteller echa a andar. Es una figura hecha con IA, con camisa roja y faixa negra, y lleva esqueleto: por eso camina de verdad mientras se desplaza. Los castells son torres humanas de entre seis y diez pisos; la Unesco los inscribió en 2010 en la Lista Representativa del Patrimonio Cultural Inmaterial. La base es la pinya, a la que puede unirse cualquiera; después viene el tronc y arriba, el pom de dalt, formado por niños. Cada colla se identifica por el color de su camisa y los escaladores se agarran a la faixa, que protege la espalda. (ich.unesco.org: Castells)' };
      })(),

      // 12 · 1992
      { layout: 'blank', transition: 'fade', back: [...night(18), ...wave(640, 10, 44, 17, 20)], extra: [
        kicker('BARCELONA 1992', 80, 60, 500, { color: YEL }), H('LOS JUEGOS OLÍMPICOS', 76, 92, 900, 80, 56, { color: WHITE }),
        text('Montjuïc acogió las ceremonias y el atletismo; la Vila Olímpica y el Port Olímpic, parte de las pruebas.', 80, 190, 780, 80, { fontSize: 22, color: '#d3e6e8', lineHeight: 1.3 }),
        ...[['25 jul – 9 ago', 'Del 25 de julio al 9 de agosto de 1992', TURQ], ['169', 'países participaron', YEL], ['9.356', 'deportistas compitieron', GREEN]].flatMap(([n, t, c], i) => {
          const x = 80 + i * 385; return seq([R(x, 320, 360, 250, NIGHT2, { radius: 16, stroke: c, strokeWidth: 3 }),
            text(`<div style="font-family:${SERIF};font-size:${i ? 84 : 52}px;color:${c};line-height:1.15">${n}</div><div style="margin-top:8px">${t}</div>`, x + 16, 320, 328, 250, { fontSize: 21, color: WHITE, textAlign: 'center', vAlign: 'middle', lineHeight: 1.25 })], i, 'fade-up'); }),
        foot(60, '#9cc3c8')],
        notes: 'En 1992 Barcelona fue sede de los Juegos Olímpicos de verano, del 25 de julio al 9 de agosto. Participaron 169 comités olímpicos y 9.356 deportistas. El Estadio Olímpico de Montjuïc acogió las ceremonias de apertura y clausura y el atletismo; la Vila Olímpica del Poblenou y el Port Olímpic, la vela. La Wikipedia dice que la ciudad se transformó notablemente; buscad con la clase qué barrios cambiaron y cómo. (en.wikipedia.org: 1992 Summer Olympics)' },

      // 13 · how the models were made
      { layout: 'blank', transition: 'fade', back: wall(20), extra: [
        kicker('CÓMO SE HICIERON ESTOS MODELOS', 70, 56, 700), H('DE UNA DESCRIPCIÓN A UNA PIEZA 3D', 66, 88, 1100, 70, 42),
        ...[['1', 'Describes', 'Escribes qué quieres: «la fachada de una casa modernista con tejado como un dragón».'], ['2', 'Imagen de referencia', 'La IA dibuja primero el objeto sobre un fondo liso.'], ['3', 'TRELLIS.2', 'Un modelo de Microsoft lo reconstruye en tres dimensiones.'], ['4', 'Modelo 3D', 'Un archivo GLB que se gira y se guarda en la presentación.']].flatMap(([n, t, d], i) => {
          const x = 70 + i * 295, c = ACC[i];
          return seq([...card(x, 190, 275, 250, c), text(`<div style="font-family:${SERIF};font-size:54px;color:${i === 1 ? '#c58a0c' : i === 3 ? CORAL : TEAL};line-height:1">${n}</div><div style="font-family:${SERIF};font-size:24px;color:${INK};margin-top:6px">${t}</div><div style="margin-top:6px">${d}</div>`, x + 30, 190, 232, 250, { fontSize: 17, color: MUTE, lineHeight: 1.3, vAlign: 'middle' })], i, 'fade-up'); }),
        R(70, 470, 1140, 76, NIGHT, { radius: 14 }), text('En Revela: menú IA ▸ Crear modelo 3D con IA, modo «Realista».', 96, 470, 1090, 76, { fontSize: 24, color: WHITE, vAlign: 'middle', fontWeight: 700 }),
        text('Las personas, como el casteller, pueden llevar esqueleto y animación: así camina por la diapositiva. Los monumentos son piezas estáticas, y pueden tener detalles inventados.', 70, 566, 1140, 90, { fontSize: 19, color: INK, lineHeight: 1.35 }), foot()],
        notes: 'En una frase: se describe lo que se quiere, la IA genera una imagen de referencia, TRELLIS.2 la convierte en un modelo 3D y obtenemos un archivo que se puede girar. En Revela está en el menú IA, Crear modelo 3D con IA, con el modo Realista. Las personas, como nuestro casteller, pueden llevar esqueleto y animación y caminar o saludar; los monumentos son piezas estáticas. Los resultados son interpretaciones: conviene contrastarlos con fotos y fuentes.' },

      // 14 · challenges
      { layout: 'blank', transition: 'fade', back: [...wall(22), halo(220, 380, 360, '#ffffff', 0.7), ...floor(220, 600, 260)], extra: [
        withAnims(ai3d('barcelona-casteller', 90, 150, 260, 460, 'Casteller en 3D creado con IA', { clip: 'Idle', edge: 'fade' }), A('zoom-in', { start: 'withPrev', duration: 700 })),
        kicker('PARA CLASE', 420, 56, 400), H('CUATRO RETOS', 416, 86, 700, 70, 46),
        ...[['Mapa', 'Sitúa en un plano de Barcelona las seis piezas y traza una ruta a pie.'], ['Compara', 'Sagrada Família y Torre Glòries: anota tres parecidos y tres diferencias.'],
          ['Pirámide', 'Dibuja un castell con pinya, tronc y pom de dalt: ¿cuántos pisos tiene?'], ['Pide tú', '¿Qué modelo 3D pedirías a la IA? Escribe su descripción.']].flatMap(([t, d], i) => {
          const x = 420 + (i % 2) * 400, y = 180 + Math.floor(i / 2) * 230;
          return seq([...card(x, y, 380, 210, ACC[i]), text(`<span style="font-family:${SERIF};font-size:44px;color:${i === 1 ? '#c58a0c' : i === 3 ? CORAL : TEAL}">${i + 1}</span>&nbsp; <span style="font-family:${SERIF};font-size:27px;color:${INK}">${t}</span><div style="margin-top:8px">${d}</div>`, x + 30, y, 332, 210, { fontSize: 19, color: MUTE, lineHeight: 1.3, vAlign: 'middle' })], i, 'fade-up'); }),
        foot()],
        notes: 'Cuatro retos para trabajar en equipo. Mapa: situar las seis piezas en un plano y trazar una ruta a pie. Compara: poner cara a cara la Sagrada Família y la Torre Glòries. Pirámide: dibujar un castell con su pinya, su tronc y su pom de dalt. Y Pide tú: escribir la descripción del modelo que pediríais a la IA. Se pueden repartir uno por grupo y poner en común al final; nuestro casteller espera a la izquierda.' },
    ])) },
};
