// Example presentation: Baetulo, los romanos en Badalona (showcase).
//
// A local-history class on the Roman city of Baetulo (Badalona), with six real 3D models made with Revela's own AI
// (TRELLIS.2 through Runware): a citizen, a legionary, a wine amphora, an oil lamp, a merchant ship and a bronze Venus
// "inspired by" the one of Badalona. They are files of the repository (assets/ai3d/baetulo-*.glb with a transparent cover
// *.webp). The citizen and the legionary carry a skeleton made by Revela's own automatic rig (features/content/autorig.js:
// Idle, Walk, Run, Wave… clips): the citizen's stroll plays «Walk» while he moves along his path. Look: limestone,
// terracotta and Mediterranean blue, with Roman capitals.
// Only facts checked by the author go on the slides (see the notes of each one).

import { build, text, shape, A, withAnims, path, numbered, base } from './kit.js';

const STONE = '#efe6d2', STONE2 = '#e2d5b8', CARD = '#f8f2e3', LINE = '#d2c4a4', INK = '#2b2622', MUTE = '#5e5548', TERRA = '#a8452a', BLUE = '#1f5f7a', SEA = '#17475c', DEEP = '#0e2f3f', GOLD = '#d9a85b';
const SERIF = "'Playfair Display', serif";
const R = (x, y, w, h, fill, p = {}) => shape('rect', x, y, w, h, fill, p);
const E = (x, y, w, h, fill, p = {}) => shape('ellipse', x, y, w, h, fill, p);
// (Absolute, from where the app is served: an exported or shared copy keeps finding the files.)
const A3 = new URL('../../../../assets/ai3d/', import.meta.url).href;
const ai3d = (id, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'model', src: `${A3}${id}.glb`, poster: `${A3}${id}.webp`,
  alt, autoRotate: false, view: 'front', ...props });
const kicker = (t, x, y, w, props = {}) => text(t, x, y, w, 30, { fontSize: 16, letterSpacing: 4, color: TERRA, fontWeight: 700, ...props });
const H = (t, x, y, w, h, size, props = {}) => text(t, x, y, w, h, { fontFamily: SERIF, fontSize: size, color: INK, fontWeight: 700, lineHeight: 1.08, ...props });
const foot = (x = 60, color = MUTE) => text('Baetulo · Badalona · modelos 3D creados con IA en Revela', x, 676, 640, 26, { fontSize: 13, color, letterSpacing: 1 });
// Limestone wall with a terracotta band on top and a thin double rule at the bottom.
const wall = () => [R(0, 0, 1280, 720, STONE, { fill2: STONE2, gradType: 'radial' }), R(0, 0, 1280, 14, TERRA), R(0, 14, 1280, 4, GOLD),
  R(0, 668, 1280, 2, LINE), R(0, 672, 1280, 1, LINE)];
const sea = () => [R(0, 0, 1280, 720, SEA, { fill2: DEEP, gradType: 'radial' }), R(0, 0, 1280, 14, GOLD)];
// A round light behind a piece, and the shadow it casts on the floor.
const halo = (cx, cy, d = 520, color = '#ffffff', op = 0.55) => E(cx - d / 2, cy - d / 2, d, d, color, { opacity: op });
const floor = (cx, y, w = 400, dark = '#8c7a58') => [E(cx - w / 2, y, w, 40, dark, { opacity: 0.35 }), E(cx - w / 2 + 50, y + 8, w - 100, 24, dark, { opacity: 0.4 })];
const card = (x, y, w, h, accent = TERRA) => [R(x, y, w, h, CARD, { radius: 6, stroke: LINE, strokeWidth: 1 }), R(x, y, 6, h, accent, { radius: 3 })];
// A fact: a bold title and one or two lines, on a card.
const fact = (t, d, x, y, w, h = 110, accent = TERRA) => [...card(x, y, w, h, accent),
  text(`<div style="font-family:${SERIF};font-size:24px;font-weight:700;color:${INK}">${t}</div><div style="margin-top:4px">${d}</div>`,
    x + 22, y, w - 36, h, { fontSize: 18, color: MUTE, lineHeight: 1.3, vAlign: 'middle', pad: [6, 6, 6, 6] })];
// Each part appears with a click, one after another.
const seq = (parts, i, effect = 'fade-left') => parts.map((b, j) => withAnims(b, A(effect, { start: i || j ? 'withPrev' : 'click', duration: 420 })));

export default {
  show_baetulo: { name: 'Baetulo: los romanos en Badalona', cat: 'showcase',
    summary: 'Historia local con seis modelos 3D hechos con IA: un romano que pasea, un legionario, ánfora, lucerna, barco y Venus; con retos para clase',
    make: () => numbered(build({ name: 'Baetulo: los romanos en Badalona', palette: 'paper', fonts: 'classic', title: { color: INK, size: 46 }, body: { color: INK }, bg: STONE }, [

      // 1 · cover
      { layout: 'blank', transition: 'fade', back: [...sea(), halo(930, 340, 560, '#2f7d96', 0.5), ...floor(930, 600, 420, '#000000')], extra: [
        kicker('HISTORIA LOCAL · ESO Y BACHILLERATO', 80, 150, 700, { color: GOLD }),
        H('BAETULO', 76, 190, 720, 140, 118, { color: '#f6efe0', letterSpacing: 8 }),
        text('Los romanos en Badalona', 80, 335, 640, 60, { fontFamily: SERIF, fontSize: 38, color: '#f6efe0' }),
        text('Una ciudad, su vino y su gente, contados con modelos 3D hechos con IA', 80, 420, 560, 90, { fontSize: 24, color: '#d3e3e8', lineHeight: 1.3 }),
        R(80, 540, 120, 4, GOLD), foot(80, '#a9c4cc'),
        withAnims(ai3d('baetulo-anfora', 690, 60, 480, 560, 'Ánfora vinaria romana en 3D creada con IA', { autoRotate: true, spin: 14, edge: 'fade' }), A('zoom-in', { start: 'withPrev', duration: 700 }))],
        notes: 'Bienvenida. Vamos a visitar Baetulo, la ciudad romana de Badalona, con piezas en tres dimensiones que se pueden girar con el ratón. Todos los modelos se han creado con la IA de Revela a partir de una descripción: son interpretaciones, no réplicas de piezas concretas. En la portada gira un ánfora de vino, el producto que hizo famosa a la ciudad.' },

      // 2 · a new city by the sea
      { layout: 'blank', transition: 'fade', back: wall(), extra: [
        kicker('LA FUNDACIÓN', 70, 56, 400), H('UNA CIUDAD NUEVA JUNTO AL MAR', 66, 88, 640, 130, 42, { letterSpacing: 1 }),
        ...seq(fact('Hacia el año 100 a. C.', 'Se fundó desde cero, sin una ciudad anterior. Fue de las primeras fundaciones romanas de la Tarraconense.', 70, 250, 590, 120), 0),
        ...seq(fact('Entre dos rieras y el mar', 'Se alzaba sobre una pequeña colina, con el agua a ambos lados y la costa delante.', 70, 386, 590, 110, BLUE), 1),
        ...seq(fact('Calles en cuadrícula', 'Un trazado ortogonal que ocupaba unas 10 hectáreas.', 70, 512, 590, 100), 2),
        // a sketch map: land, two streams, the sea, the hill and the grid of streets
        R(710, 120, 500, 510, '#e6d9ba', { radius: 10, stroke: LINE, strokeWidth: 1 }),
        R(710, 520, 500, 110, BLUE, { radius: 10, opacity: 0.85 }), R(710, 520, 500, 12, '#e6d9ba', { opacity: 0.0 }),
        R(790, 130, 12, 400, '#5a9fb8'), R(1110, 130, 12, 400, '#5a9fb8'),
        E(820, 200, 270, 300, '#d7c598', { stroke: '#b9a572', strokeWidth: 2 }),
        R(870, 250, 170, 190, CARD, { stroke: INK, strokeWidth: 2 }),
        ...[1, 2].map(i => R(870 + i * 56.6, 250, 3, 190, '#b79c64')), ...[1, 2].map(i => R(870, 250 + i * 63, 170, 3, '#b79c64')),
        text('Riera', 740, 300, 80, 28, { fontSize: 16, color: BLUE, fontWeight: 700 }), text('Riera', 1126, 300, 80, 28, { fontSize: 16, color: BLUE, fontWeight: 700 }),
        text('Baetulo', 875, 190, 160, 32, { fontSize: 20, color: INK, fontWeight: 700, textAlign: 'center', fontFamily: SERIF }),
        text('Mar Mediterráneo', 710, 560, 500, 40, { fontSize: 22, color: '#f6efe0', textAlign: 'center', fontFamily: SERIF }),
        text('Esquema, no a escala', 940, 128, 200, 24, { fontSize: 13, color: MUTE }), foot()],
        notes: 'Baetulo no creció poco a poco: se fundó de nueva planta hacia el año 100 antes de Cristo, y es una de las primeras fundaciones romanas de la Hispania Tarraconensis. Ocupaba una pequeña colina entre dos rieras y el mar. Sus calles formaban una cuadrícula, y el conjunto rondaba las diez hectáreas, según una fuente local. El esquema es solo orientativo: sirve para entender la situación, no para medir distancias.' },

      // 3 · a Roman walks through Baetulo
      (() => {
        const route = [[260, 12], [540, -8], [840, 10]];
        return { layout: 'blank', transition: 'fade', back: [...wall(), R(0, 628, 1280, 40, '#cdb98f'), ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => R(i * 160 + 40, 628, 3, 40, '#b79c64'))], extra: [
          kicker('UN ROMANO PASEA POR BAETULO', 70, 50, 700), H('Un vecino cualquiera, en una calle cualquiera', 66, 80, 1000, 60, 38),
          ...[['Su primera mención', 'La cita por escrito Pomponio Mela, hacia el 43-44 d. C.'], ['Un pacto de hospitalidad', 'La Tabula Hospitalis une a los badalonenses con Quintus Licinius Silvanus Granianus.'],
            ['Una ciudad que se camina', 'Calles ortogonales: el decumanus y el cardo máximo se cruzaban en ángulo recto.']].flatMap(([t, d], i) => fact(t, d, 70 + i * 390, 150, 370, 124, i === 1 ? BLUE : TERRA)),
          withAnims(ai3d('baetulo-romano', 70, 270, 220, 360, 'Ciudadano romano con túnica en 3D creado con IA', { clip: 'Idle', walk: { clip: 'Walk', end: 'Idle', face: true, look: false } }), path(route, { duration: 5200 })),
          text('Clic: echa a andar', 1000, 580, 230, 34, { fontSize: 16, color: '#f6efe0', bg: TERRA, radius: 17, textAlign: 'center', vAlign: 'middle' }), foot()],
          notes: 'Un clic y nuestro vecino de Baetulo echa a andar por la calle. Es un ciudadano con túnica y cinturón, una figura inventada, no un retrato. Detrás tenéis tres datos: la primera mención escrita conocida es de Pomponio Mela, hacia el 43-44 después de Cristo; la Tabula Hospitalis recoge un pacto de hospitalidad con Quintus Licinius Silvanus Granianus, y la ciudad tenía calles en cuadrícula. Cuando este modelo tenga esqueleto, caminará de verdad mientras se desplaza.' };
      })(),

      // 4 · the legionary
      { layout: 'blank', transition: 'fade', back: [...wall(), halo(330, 340, 500), ...floor(330, 596, 340)], extra: [
        withAnims(ai3d('baetulo-legionario', 100, 70, 460, 540, 'Legionario romano con armadura de placas en 3D creado con IA', { autoRotate: true, spin: 12, edge: 'fade', clip: 'Idle' }), A('zoom-in', { start: 'withPrev', duration: 700 })),
        kicker('PARA COMPARAR', 640, 56, 500), H('Un legionario frente a un ciudadano', 636, 88, 580, 130, 42),
        text('Baetulo no era un campamento militar: este soldado es una pieza para comparar la vida civil con la militar.', 640, 232, 570, 90, { fontSize: 21, color: INK, lineHeight: 1.3 }),
        ...seq(fact('Armadura de bandas', 'La lorica segmentata, hecha de placas de metal articuladas, protegía el torso.', 640, 340, 570, 110, BLUE), 0),
        ...seq(fact('Dos formas de vestir', 'El vecino lleva túnica y sandalias; el soldado, equipo para marchar y combatir.', 640, 464, 570, 110), 1),
        foot()],
        notes: 'Ojo: no afirmamos que hubiera legiones en Baetulo, que era una ciudad, no un campamento. Usamos al legionario como contraste con el ciudadano de la diapositiva anterior. Pedid al alumnado que gire la figura y anote qué lleva puesto y para qué sirve cada elemento. La armadura de placas articuladas se llama lorica segmentata. Cuando este modelo tenga esqueleto y animación, se moverá solo.' },

      // 5 · wine and the amphora
      { layout: 'blank', transition: 'fade', back: [...wall(), halo(1010, 340, 420), ...floor(1010, 596, 300)], extra: [
        kicker('EL GRAN NEGOCIO', 70, 56, 500), H('EL VINO LAYETANO Y SU ÁNFORA', 66, 88, 700, 100, 42, { letterSpacing: 1 }),
        ...card(70, 220, 330, 250),
        text(`<div style="font-family:${SERIF};font-size:96px;font-weight:700;color:${TERRA};line-height:1.15">614</div><div style="margin-top:6px">sellos de ánfora catalogados en un volumen reciente</div>`, 90, 220, 300, 250, { fontSize: 20, color: INK, lineHeight: 1.25, vAlign: 'middle' }),
        ...seq(fact('Casi el triple', 'Que el primer catálogo, publicado 28 años antes.', 430, 220, 360, 112, BLUE), 0),
        ...seq(fact('Más que Tarraco y Empúries', 'Es la ciudad costera de la Tarraconense con más sellos.', 430, 358, 360, 112), 1),
        text('Las ánforas de Baetulo se han encontrado por todo el Imperio. Esta es del tipo Pascual 1.', 70, 510, 720, 80, { fontSize: 21, color: INK, lineHeight: 1.3 }),
        withAnims(ai3d('baetulo-anfora', 810, 70, 400, 540, 'Ánfora vinaria tipo Pascual 1 en 3D creada con IA', { autoRotate: true, spin: 14, edge: 'fade' }), A('zoom-in', { start: 'withPrev', duration: 700 })), foot()],
        notes: 'El vino fue el gran negocio de Baetulo. Floreció sobre todo con Augusto y exportó vino layetano. Un volumen reciente, editado por Carreras, Comas y Guitart, cataloga 614 sellos de ánfora, casi el triple que el primero, publicado 28 años antes. Apunta a que Baetulo fue probablemente el principal puerto exportador del vino layetano entre la República tardía y el Alto Imperio. El modelo es un ánfora de tipo Pascual 1, hecha con IA.' },

      // 6 · the ship
      { layout: 'blank', transition: 'fade', back: [...sea(), R(0, 560, 1280, 160, '#1f5f7a', { fill2: DEEP, gradType: 'linear', opacity: 0.9 }), ...[0, 1, 2, 3, 4, 5].map(i => E(40 + i * 220, 590 + (i % 2) * 22, 150, 14, '#7fb8cc', { opacity: 0.35 }))], extra: [
        withAnims(ai3d('baetulo-barco', 60, 80, 600, 500, 'Barco mercante romano en 3D creado con IA', { motion: 'float', edge: 'fade' }), A('zoom-in', { start: 'withPrev', duration: 700 })),
        kicker('A TODO EL IMPERIO', 700, 66, 500, { color: GOLD }), H('EL BARCO QUE LLEVABA EL VINO', 696, 98, 520, 130, 40, { color: '#f6efe0', letterSpacing: 1 }),
        text('Las ánforas salían por mar. Baetulo fue probablemente el principal puerto exportador del vino layetano entre la República tardía y el Alto Imperio.', 700, 250, 510, 150, { fontSize: 22, color: '#e6eff2', lineHeight: 1.35 }),
        ...seq([R(700, 430, 510, 90, '#0e2f3f', { radius: 8, stroke: GOLD, strokeWidth: 1 }),
          text('Un barco mercante, con ánforas a bordo, como los que cargarían en el puerto de la ciudad.', 722, 430, 470, 90, { fontSize: 19, color: '#f6efe0', vAlign: 'middle', lineHeight: 1.3 })], 0, 'fade-up'),
        foot(60, '#a9c4cc')],
        notes: 'Sin barcos, el vino no habría llegado a ninguna parte. Este es un barco mercante romano, interpretado por la IA: fijaos en las ánforas a bordo. Recordad la cautela de la fuente: se dice que Baetulo fue probablemente el principal puerto exportador de vino layetano en ese periodo. Se puede girar el modelo para ver el casco, el mástil y la vela.' },

      // 7 · the oil lamp
      { layout: 'blank', transition: 'fade', back: [...wall(), halo(310, 350, 480, '#f4d79a', 0.6), ...floor(310, 566, 300)], extra: [
        withAnims(ai3d('baetulo-lucerna', 90, 100, 440, 460, 'Lucerna, lámpara de aceite romana, en 3D creada con IA', { autoRotate: true, spin: 16, edge: 'fade' }), A('zoom-in', { start: 'withPrev', duration: 700 })),
        kicker('LA VIDA COTIDIANA', 620, 56, 500), H('LA LUCERNA: LUZ PARA LA NOCHE', 616, 88, 600, 110, 42, { letterSpacing: 1 }),
        text('Cuando se hacía de noche, la casa se alumbraba con lámparas de aceite como esta.', 620, 220, 590, 80, { fontSize: 21, color: INK, lineHeight: 1.3 }),
        ...seq(fact('Aceite y mecha', 'Se llenaba de aceite y una mecha encendida daba una luz pequeña y temblorosa.', 620, 320, 590, 112, BLUE), 0),
        ...seq(fact('Un objeto de cada día', 'Pequeña, barata y fácil de llevar: estaba en casas, tiendas y calles.', 620, 448, 590, 112), 1), foot()],
        notes: 'Pasamos de la gran economía a la vida diaria. La lucerna es una lámpara de aceite: pequeña, común y muy útil. Preguntad a la clase cuánta luz creen que daba y cómo sería hacer los deberes con ella. El modelo es una interpretación hecha por IA; se puede girar para ver el pico por donde asomaba la mecha.' },

      // 8 · the baths
      { layout: 'blank', transition: 'fade', back: wall(), extra: [
        kicker('UN HALLAZGO', 70, 56, 500), H('LAS TERMAS ROMANAS', 66, 88, 800, 70, 44, { letterSpacing: 1 }),
        text('Se descubrieron en muy buen estado y, encima de ellas, se construyó el museo.', 70, 162, 900, 40, { fontSize: 22, color: INK }),
        R(120, 360, 1040, 6, TERRA),
        ...[['1955', 'Descubrimiento', 'Josep Maria Cuyas i Tolosa halla las termas romanas.', TERRA], ['Por fases', 'Se construye el Museu', 'El museo se levanta encima y abre por fases.', BLUE],
          ['1966', 'Edificio completo', 'El museo queda terminado y abierto por entero.', TERRA], ['2010', 'Reforma', 'Se renueva el recorrido, de más de 3.000 m².', BLUE]].flatMap(([y, t, d, c], i) => {
          const x = 70 + i * 290, cx = x + 135, up = i % 2 === 0;
          return seq([E(cx - 14, 352, 28, 28, c, { stroke: STONE, strokeWidth: 4 }),
            text(y, x, up ? 215 : 396, 270, 60, { fontFamily: SERIF, fontSize: 44, fontWeight: 700, color: c, textAlign: 'center', vAlign: 'middle' }),
            text(`<div style="font-weight:700;color:${INK};font-size:20px">${t}</div><div style="margin-top:2px">${d}</div>`, x, up ? 275 : 456, 270, 80, { fontSize: 17, color: MUTE, textAlign: 'center', lineHeight: 1.25 })], i, 'fade-up'); }),
        foot()],
        notes: 'Las termas romanas se descubrieron en 1955, obra del arqueólogo Josep Maria Cuyas i Tolosa, y estaban en muy buen estado. El Museu de Badalona se construyó encima y abrió por fases; el edificio completo, en 1966. Tras la reforma de 2010, el recorrido supera los 3.000 metros cuadrados. Buen momento para preguntar por qué se decidió construir el museo sobre los restos.' },

      // 9 · the museum route
      { layout: 'blank', transition: 'fade', back: wall(), extra: [
        kicker('EL RECORRIDO DEL MUSEU', 70, 50, 600), H('QUÉ SE PUEDE VER HOY', 66, 82, 800, 70, 44, { letterSpacing: 1 }),
        ...[['Termas', 'El baño público, descubierto en 1955.'], ['Decumanus y cardo máximo', 'Las dos calles principales de la ciudad.'], ['Insulae y tabernae', 'Manzanas de casas y tiendas.'], ['Cloacas', 'Restos del alcantarillado.'],
          ['Casa dels Dofins', 'Mosaicos y restos de pinturas murales.'], ['Jardí de Quint Licini', 'Restos de una piscina romana.'], ['Conducto de 38 m', 'Con bóveda de cañón: llevaba agua a casas, fuentes y termas.'], ['Tabula Hospitalis', 'Pacto de hospitalidad, en la exposición permanente.']].flatMap(([t, d], i) => {
          const x = 70 + (i % 4) * 295, y = 190 + Math.floor(i / 4) * 215;
          return seq([...card(x, y, 275, 195, i % 3 === 1 ? BLUE : TERRA), text(`<div style="font-family:${SERIF};font-size:24px;font-weight:700;color:${INK}">${t}</div><div style="margin-top:6px">${d}</div>`, x + 20, y, 245, 195, { fontSize: 18, color: MUTE, lineHeight: 1.3, vAlign: 'middle' })], i, 'fade-up'); }),
        foot()],
        notes: 'Este es el recorrido del museo después de la reforma de 2010, con más de 3.000 metros cuadrados: las termas, el decumanus y el cardo máximo, un conjunto de insulae y tabernae, y restos de cloacas. Además, la Casa dels Dofins con sus mosaicos, el Jardí de Quint Licini con los restos de una piscina y un conducto de agua de 38 metros con bóveda de cañón. La Tabula Hospitalis está en la exposición permanente. Proponed una visita real.' },

      // 10 · Venus
      { layout: 'blank', transition: 'fade', back: [...wall(), halo(930, 340, 460, '#f4d79a', 0.55), ...floor(930, 560, 300)], extra: [
        kicker('INSPIRADA EN LA VENUS DE BADALONA', 70, 56, 700), H('UNA VENUS DE BRONCE', 66, 88, 640, 70, 44, { letterSpacing: 1 }),
        text('Este modelo está inspirado en la Venus de Badalona, pero no es la pieza real: es una interpretación hecha con IA.', 70, 176, 640, 100, { fontSize: 22, color: INK, lineHeight: 1.3 }),
        ...seq(fact('Una estatuilla de 28 cm', 'La Venus de Badalona mide solo 28 cm.', 70, 310, 620, 104, BLUE), 0),
        ...seq(fact('Una pieza clave', 'Es una de las representaciones femeninas más importantes de Cataluña.', 70, 430, 620, 112), 1),
        withAnims(ai3d('baetulo-venus', 700, 70, 460, 490, 'Estatuilla de Venus de bronce, inspirada en la de Badalona, en 3D creada con IA', { autoRotate: true, spin: 14, edge: 'fade' }), A('zoom-in', { start: 'withPrev', duration: 700 })), foot()],
        notes: 'Insistid en la diferencia: este modelo está inspirado en la Venus de Badalona, no es esa pieza. La original es una estatuilla de 28 centímetros, una de las representaciones femeninas más importantes de Cataluña. Podéis comparar el modelo con fotos de la pieza real y comentar qué detalles ha inventado la IA.' },

      // 11 · Magna Celebratio
      { layout: 'blank', transition: 'fade', back: [...sea(), halo(300, 360, 520, '#2f7d96', 0.45), ...floor(300, 600, 340, '#000000')], extra: [
        ai3d('baetulo-romano', 120, 90, 360, 520, 'Ciudadano romano con túnica en 3D creado con IA', { autoRotate: true, spin: 12, edge: 'fade', clip: 'Idle' }),
        kicker('LA FIESTA', 600, 80, 500, { color: GOLD }), H('MAGNA CELEBRATIO', 596, 112, 640, 80, 56, { color: '#f6efe0', letterSpacing: 3 }),
        text('La fiesta romana de Badalona: el último fin de semana de abril.', 600, 214, 600, 80, { fontSize: 26, color: '#e6eff2', lineHeight: 1.3 }),
        ...seq([R(600, 330, 590, 130, DEEP, { radius: 8, stroke: GOLD, strokeWidth: 1 }),
          text('Ese fin de semana se abren espacios que normalmente están cerrados, como la Casa de l\'Heura y el Teatre romà.', 626, 330, 540, 130, { fontSize: 21, color: '#f6efe0', lineHeight: 1.35, vAlign: 'middle' })], 0, 'fade-up'),
        foot(60, '#a9c4cc')],
        notes: 'La historia también se vive: la Magna Celebratio es la fiesta romana de Badalona, el último fin de semana de abril. Se abren espacios normalmente cerrados, como la Casa de l\'Heura y el Teatre romà. Invitad a la clase a planificar una visita o a disfrazar a un compañero de ciudadano de Baetulo.' },

      // 12 · how the models were made
      { layout: 'blank', transition: 'fade', back: wall(), extra: [
        kicker('CÓMO SE HICIERON ESTOS MODELOS', 70, 50, 700), H('DE UNA DESCRIPCIÓN A UNA PIEZA 3D', 66, 82, 1100, 70, 40, { letterSpacing: 1 }),
        ...[['1', 'Describes', 'Escribes qué quieres: «un ánfora vinaria romana».'], ['2', 'Imagen de referencia', 'La IA dibuja primero el objeto con fondo liso.'], ['3', 'TRELLIS.2', 'Un modelo de Microsoft lo reconstruye en tres dimensiones.'], ['4', 'Modelo 3D', 'Un archivo GLB que se gira y se guarda en la presentación.']].flatMap(([n, t, d], i) => {
          const x = 70 + i * 295;
          return seq([...card(x, 190, 275, 230, i % 2 ? BLUE : TERRA), text(`<div style="font-family:${SERIF};font-size:54px;font-weight:700;color:${i % 2 ? BLUE : TERRA};line-height:1">${n}</div><div style="font-family:${SERIF};font-size:24px;font-weight:700;color:${INK};margin-top:6px">${t}</div><div style="margin-top:6px">${d}</div>`, x + 20, 190, 245, 230, { fontSize: 18, color: MUTE, lineHeight: 1.3, vAlign: 'middle' })], i, 'fade-up'); }),
        R(70, 450, 1140, 80, SEA, { radius: 8 }), text('En Revela: menú IA ▸ Crear modelo 3D con IA, modo «Realista».', 96, 450, 1090, 80, { fontSize: 24, color: '#f6efe0', vAlign: 'middle', fontWeight: 700 }),
        text('Las personas (el vecino y el legionario) pueden llevar esqueleto y animación: así caminan por la diapositiva. Los objetos son estáticos.', 70, 550, 1140, 90, { fontSize: 20, color: INK, lineHeight: 1.35 }), foot()],
        notes: 'En una frase: se describe lo que se quiere, la IA genera una imagen de referencia, TRELLIS.2 la convierte en un modelo 3D y obtenemos un archivo que se puede girar. En Revela está en el menú IA, Crear modelo 3D con IA, con el modo Realista. Las personas, con esqueleto y animación, pueden andar; los objetos como el ánfora o la lucerna son piezas estáticas. Los resultados son interpretaciones: conviene contrastarlos con fuentes.' },

      // 13 · activities
      { layout: 'blank', transition: 'fade', back: wall(), extra: [
        kicker('PARA CLASE', 70, 50, 500), H('CUATRO RETOS', 66, 82, 800, 70, 44, { letterSpacing: 1 }),
        ...[['Compara', 'Gira al vecino y al legionario. Anota tres diferencias en su ropa y explica por qué.'], ['Investiga', 'Busca en qué lugares del Imperio se han hallado ánforas de Baetulo y márcalos en un mapa.'],
          ['Crea', 'Escribe una descripción y pide tu propio objeto romano con IA ▸ Crear modelo 3D con IA.'], ['Contrasta', 'Compara el modelo de la Venus con fotos de la pieza real: ¿qué ha inventado la IA?']].flatMap(([t, d], i) => {
          const x = 70 + (i % 2) * 580, y = 180 + Math.floor(i / 2) * 215;
          return seq([...card(x, y, 560, 195, i % 3 === 1 ? BLUE : TERRA), text(`<span style="font-family:${SERIF};font-size:46px;font-weight:700;color:${i % 3 === 1 ? BLUE : TERRA}">${i + 1}</span>&nbsp; <span style="font-family:${SERIF};font-size:28px;font-weight:700;color:${INK}">${t}</span><div style="margin-top:8px">${d}</div>`, x + 26, y, 510, 195, { fontSize: 21, color: MUTE, lineHeight: 1.3, vAlign: 'middle' })], i, 'fade-up'); }),
        foot()],
        notes: 'Cuatro retos para trabajar en equipo: comparar la vida civil y la militar con los dos personajes; investigar la dispersión de las ánforas; crear un objeto propio con la IA; y contrastar un modelo con la pieza real para entrenar el sentido crítico. Se pueden repartir uno por grupo y poner en común al final.' },
    ])) },
};
