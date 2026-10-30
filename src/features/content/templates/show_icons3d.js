// Example presentations: 3D icons and glass panels (showcase). Each one: { name, summary, cat: 'showcase', make() } → a deck (see kit.js).
// Two decks that use the «Iconos 3D» of the resources panel (3dicons.co, Vijay Verma, CC0: assets/icons3d/<id>.webp) over soft
// coloured lights, and «glass» panels: a translucent fill, a thin light border and `glass: N`, the blur of what is behind
// the panel (backdrop-filter, in the editor and in the exported page). One for a class (rules, timetable, materials, project,
// quiz) and one for a company (key figures, chart, milestones, team, risks, priorities). The company figures are made up:
// the slides say so. Decimals with a comma (Spanish).

import { build, text, shape, ul, A, withAnims, numbered, glow, chartBlock, tableBlock, pollBlock, base } from './kit.js';

const AI = new URL('../../../../assets/icons3d/', import.meta.url).href;
const WH = '#ffffff', SOFT = '#d9d4f2';
const FF = { head: "'Space Grotesk', sans-serif" };
// A 3D icon (x, y, size); its alternative text says what it is.
const ico = (id, x, y, s, alt, props = {}) => ({ ...base(x, y, s, s), type: 'image', src: `${AI}${id}.webp`, alt, fit: 'contain', ...props });
const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
// A glass panel: translucent white, a light edge and the blur of what is behind it.
const glass = (html, x, y, w, h, props = {}) => text(html, x, y, w, h, { bg: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.38)', borderWidth: 1.5,
  radius: 24, pad: [20, 26, 20, 26], glass: 18, color: WH, fontSize: 26, ...props });
// The lights behind the glass: three soft round gradients.
const lights = (bg, c1, c2, c3) => [glow(-160, -180, 640, c1, bg, 80), glow(760, 330, 700, c2, bg, 62), glow(470, -260, 520, c3, bg, 48)];
const heading = (t, x = 70, y = 40, w = 1140, size = 46) => text(t, x, y, w, 80, { fontSize: size, fontWeight: 800, color: WH, fontFamily: FF.head });
const label = (t, x, y, w, color) => text(t, x, y, w, 30, { fontSize: 20, letterSpacing: 3, fontWeight: 700, color });
const slideOf = (bg, parts, extra, notes, o = {}) => ({ layout: 'blank', bg, back: lights(bg, ...parts), extra, notes, transition: 'fade', ...o });
const note = (t, y = 650, x = 70, w = 1140, color = SOFT) => text(t, x, y, w, 36, { fontSize: 20, color });
const credit = (x = 70, y = 668) => text('Iconos 3D: 3dicons.co · Vijay Verma (CC0)', x, y, 520, 30, { fontSize: 16, color: SOFT, letterSpacing: 1 });
const tbl = (rows, x, y, w, h, o = {}) => tableBlock({ x, y, w, h, fontSize: 23, header: true, headBg: 'rgba(255,255,255,0.22)', headFg: WH, stroke: 'rgba(255,255,255,0.28)',
  banded: true, band: '#ffffff', bandAlpha: 0.05, color: WH, rows, ...o });
const quiz = (question, options, correct, props = {}) => pollBlock({ kind: 'quiz', question, options, correct: [correct], time: 20, fontSize: 34, x: 70, y: 60, w: 1140, h: 600, ...props });
// A card: an icon over a title and a line, on glass.
const tile = (id, alt, title, line, x, y, w, h, { color = '#ffffff', big = 150, ts = 30, ds = 23 } = {}) => [
  glass(`<div style="text-align:center"><b style="font-size:${ts}px;color:${color}">${title}</b><br><span style="font-size:${ds}px;color:${SOFT}">${line}</span></div>`, x, y, w, h, { vAlign: 'bottom', pad: [20, 20, 22, 20] }),
  ico(id, x + (w - big) / 2, y - big * 0.28, big, alt)];

const CLASS = { bg: '#120d2b', l: ['#7c3aed', '#ec4899', '#22d3ee'], ac: '#ffd166' };
const FIRM = { bg: '#071a22', l: ['#0ea5a4', '#3b82f6', '#f59e0b'], ac: '#5eead4' };

export default {

  // 1 · Mi clase en iconos 3D
  show_icons3d_class: { name: 'Mi clase en iconos 3D', cat: 'showcase',
    summary: 'Una presentación de aula con iconos 3D y paneles de cristal translúcido: índice, reglas, horario, materiales, proyecto del trimestre, cuestionario y cierre; sirve para cualquier curso',
    make: () => { const T = CLASS, L = (...p) => slideOf(T.bg, T.l, ...p);
      return numbered(build({ name: 'Mi clase en iconos 3D', palette: 'midnight', fonts: 'tech', title: { color: WH, size: 44 }, body: { color: WH } }, [
        L([ glass('', 70, 150, 700, 420, { glass: 22 }),
          label('CURSO 2026-2027', 110, 190, 620, T.ac),
          text('Mi clase en iconos 3D', 104, 236, 640, 190, { fontSize: 54, fontWeight: 800, color: WH, lineHeight: 1.05, fontFamily: FF.head }),
          text('Normas, horario, materiales y proyecto del trimestre, en una sola presentación.', 110, 440, 620, 110, { fontSize: 26, color: SOFT, lineHeight: 1.35 }),
          on(ico('rocket', 810, 70, 330, 'Un cohete'), 'fade-up'), on(ico('bulb', 760, 400, 200, 'Una bombilla'), 'zoom', { start: 'afterPrev' }),
          on(ico('trophy', 990, 430, 210, 'Un trofeo'), 'zoom', { start: 'afterPrev' }), credit(110, 600)],
          'Portada. Los iconos son 3D (3dicons.co, dominio público) y los paneles son de cristal: un relleno translúcido que desenfoca las luces de detrás. Se cambian el curso y el título; los iconos se sustituyen desde Insertar ▸ Elementos ▸ Iconos 3D.'),
        L([ heading('Qué vamos a ver'), ...[['bulb', 'Una bombilla', 'Aprender', 'Ideas claras, paso a paso', '#ffd166'], ['pencil', 'Un lápiz', 'Practicar', 'Ejercicios y retos', '#7dd3fc'],
            ['megaphone', 'Un megáfono', 'Compartir', 'Exponer lo que hacemos', '#f9a8d4'], ['trophy', 'Un trofeo', 'Celebrar', 'Lo que hemos conseguido', '#86efac']]
            .flatMap(([id, alt, tt, ln, c], i) => tile(id, alt, tt, ln, 70 + i * 290, 300, 260, 250, { color: c, big: 170 }).map((b, j) => (j ? b : on(b, 'fade-up', { start: i ? 'afterPrev' : 'click' })))) ],
          'Índice con cuatro paneles de cristal. Cada icono es una imagen con su texto alternativo.'),
        L([ heading('Reglas de la clase'), glass('', 70, 150, 1140, 440, { glass: 20 }),
          ...[['clock', 'Un despertador', 'Puntualidad', 'Empezamos a la hora', '#ffd166'], ['heart', 'Un corazón', 'Respeto', 'Nos escuchamos', '#f9a8d4'], ['puzzle', 'Una pieza de puzle', 'Colaborar', 'Cada pieza cuenta', '#7dd3fc']]
            .flatMap(([id, alt, tt, ln, c], i) => [on(ico(id, 150 + i * 360, 200, 190, alt), 'zoom', { start: i ? 'afterPrev' : 'click' }),
              text(`<div style="text-align:center"><b style="font-size:32px;color:${c}">${tt}</b><br><span style="font-size:24px;color:${SOFT}">${ln}</span></div>`, 100 + i * 360, 410, 300, 120, { fontSize: 24 })]),
          note('Las tres reglas se pueden cambiar por las de tu grupo.', 610)],
          'Las reglas aparecen una a una. Sustituir los textos por las normas del grupo.'),
        L([ heading('Nuestra semana'),
          glass('', 70, 150, 760, 460, { glass: 20 }),
          tbl([['Hora', 'Lunes', 'Miércoles', 'Viernes'], ['9:00', 'Lengua', 'Matemáticas', 'Ciencias'], ['10:00', 'Matemáticas', 'Inglés', 'Lengua'], ['11:30', 'Tutoría', 'Plástica', 'Proyecto'], ['12:30', 'Ciencias', 'Educación física', 'Música']], 100, 180, 700, 400),
          on(ico('calender', 880, 190, 300, 'Un calendario'), 'fade-up'), text('Los viernes: proyecto', 860, 500, 340, 50, { fontSize: 28, fontWeight: 700, color: T.ac, textAlign: 'center' }), credit()],
          'Horario de ejemplo en una tabla sobre cristal. Se edita como cualquier tabla.'),
        L([ heading('Lo que necesito en la mochila'), ...[['notebook', 'Un cuaderno', 'Cuaderno'], ['pencil', 'Un lápiz', 'Lápiz'], ['calculator', 'Una calculadora', 'Calculadora'],
            ['computer', 'Un ordenador', 'Ordenador'], ['scissor', 'Unas tijeras', 'Tijeras'], ['color-palette', 'Una paleta de colores', 'Colores']]
            .flatMap(([id, alt, tt], i) => { const x = 70 + (i % 3) * 385, y = 190 + Math.floor(i / 3) * 235;
              return [glass('', x, y, 350, 195, { glass: 16 }), on(ico(id, x + 16, y + 30, 135, alt), 'fade-up', { start: i ? 'afterPrev' : 'click' }), text(`<b>${tt}</b>`, x + 152, y + 70, 192, 60, { fontSize: 25, color: WH })]; }),
          note('Marca lo que ya tienes.', 662)],
          'Seis materiales. Cambiar los iconos por otros desde la biblioteca (hay lupa, llave, candado, mapa…).'),
        L([ heading('Proyecto del trimestre'), glass('', 70, 170, 1140, 300, { glass: 20 }),
          ...[['bulb', 'Una bombilla', '1 · Idea', 'Elegimos el tema'], ['target', 'Una diana', '2 · Plan', 'Qué vamos a hacer'], ['tool', 'Unas herramientas', '3 · Hacer', 'Lo construimos'], ['trophy', 'Un trofeo', '4 · Mostrar', 'Lo presentamos']]
            .flatMap(([id, alt, tt, ln], i) => [on(ico(id, 110 + i * 280, 200, 170, alt), 'zoom', { start: i ? 'afterPrev' : 'click' }),
              text(`<div style="text-align:center"><b style="font-size:28px;color:${T.ac}">${tt}</b><br><span style="font-size:21px;color:${SOFT}">${ln}</span></div>`, 70 + i * 280, 375, 250, 90, { fontSize: 21 })]),
          glass('<b>Entrega:</b> última semana del trimestre. Se trabaja en grupos de tres y cada grupo expone cinco minutos.', 70, 510, 1140, 110, { fontSize: 26 })],
          'Cuatro fases del proyecto. La entrega y la duración de la exposición son de ejemplo.'),
        { layout: 'blank', bg: T.bg, back: lights(T.bg, ...T.l), transition: 'fade', extra: [quiz('Quedan diez minutos de clase. ¿Qué icono te ayuda a controlar el tiempo?', ['El cohete', 'El despertador', 'La corona', 'El paraguas'], 1)], notes: 'Pregunta rápida. Respuesta: el despertador.' },
        L([ heading('Cómo poner iconos 3D'), glass(ul('Abre <b>Insertar ▸ Elementos</b> y elige <b>Iconos 3D</b>.', 'Busca «cohete», «lupa» o «trofeo»: hay 65.', 'Se añaden como imagen con el fondo transparente: muévelos, ponles una animación o cámbialos de tamaño.', 'Son de dominio público (CC0): úsalos donde quieras.'), 70, 150, 700, 440, { fontSize: 27, lineHeight: 1.4, glass: 20 }),
          on(ico('zoom', 830, 150, 330, 'Una lupa'), 'zoom'), on(ico('key', 1010, 450, 190, 'Una llave'), 'zoom', { start: 'afterPrev' }), credit()],
          'Diapositiva de ayuda: se puede borrar. Si algo falla, los iconos también se pueden arrastrar desde el panel de recursos.'),
        L([ text('¡Gracias!', 90, 190, 640, 120, { fontSize: 80, fontWeight: 800, color: WH, fontFamily: FF.head }),
          glass('Nos vemos el lunes a las 9:00. Trae tu cuaderno y muchas ideas.', 90, 340, 620, 150, { fontSize: 28, lineHeight: 1.35 }),
          on(ico('star', 800, 120, 300, 'Una estrella'), 'zoom'), on(ico('heart', 1000, 380, 190, 'Un corazón'), 'zoom', { start: 'afterPrev' }), on(ico('medal', 790, 400, 190, 'Una medalla'), 'zoom', { start: 'afterPrev' }), credit(90, 640)],
          'Cierre.')
      ])); } },

  // 2 · Resultados del trimestre en iconos 3D
  show_icons3d_biz: { name: 'Resultados del trimestre en iconos 3D', cat: 'showcase',
    summary: 'Informe de empresa con iconos 3D y paneles de cristal: cifras clave, gráfico de ingresos, hitos, equipos, riesgos, prioridades y conclusiones; con datos de ejemplo para sustituir por los tuyos',
    make: () => { const T = FIRM, L = (...p) => slideOf(T.bg, T.l, ...p);
      return numbered(build({ name: 'Resultados del trimestre en iconos 3D', palette: 'midnight', fonts: 'tech', title: { color: WH, size: 44 }, body: { color: WH } }, [
        L([ glass('', 70, 150, 700, 430, { glass: 22 }), label('INFORME TRIMESTRAL', 110, 190, 620, T.ac),
          text('Resultados del tercer trimestre', 104, 236, 630, 190, { fontSize: 58, fontWeight: 800, color: WH, lineHeight: 1.05, fontFamily: FF.head }),
          text('Cifras clave, hitos y prioridades. Datos de ejemplo: sustitúyelos por los de tu empresa.', 110, 440, 620, 110, { fontSize: 25, color: SOFT, lineHeight: 1.35 }),
          on(ico('chart', 790, 90, 340, 'Un gráfico circular'), 'fade-up'), on(ico('rocket', 770, 420, 220, 'Un cohete'), 'zoom', { start: 'afterPrev' }),
          on(ico('trophy', 1000, 430, 210, 'Un trofeo'), 'zoom', { start: 'afterPrev' }), credit(110, 610)],
          'Portada. Todas las cifras de esta presentación son inventadas para el ejemplo: hay que cambiarlas antes de usarla.'),
        L([ heading('Lo más importante del trimestre'),
          ...[['money-bag', 'Una bolsa de dinero', '1,2 M€', 'Ingresos', '#fcd34d'], ['target', 'Una diana', '92 %', 'Objetivos cumplidos', '#5eead4'], ['heart', 'Un corazón', '4,6 / 5', 'Satisfacción de clientes', '#fda4af'], ['rocket', 'Un cohete', '3', 'Lanzamientos', '#93c5fd']]
            .flatMap(([id, alt, n, ln, c], i) => tile(id, alt, `<span style="font-size:50px">${n}</span>`, ln, 70 + i * 290, 300, 260, 290, { color: c, big: 150 }).map((b, j) => (j ? b : on(b, 'fade-up', { start: i ? 'afterPrev' : 'click' })))),
          note('Datos de ejemplo.', 640)],
          'Cuatro cifras clave, inventadas. Cada una tiene su icono 3D sobre un panel de cristal.'),
        L([ heading('Ingresos por mes'), glass('', 70, 150, 820, 480, { glass: 20 }),
          chartBlock({ x: 90, y: 165, w: 780, h: 450, chartType: 'bar', color: '#5eead4', dataLabels: true, labelColor: WH, yTitle: 'Millones de euros', seriesName: 'Ingresos',
            data: [{ label: 'Julio', value: 0.35 }, { label: 'Agosto', value: 0.3 }, { label: 'Septiembre', value: 0.55 }] }),
          on(ico('chart', 930, 160, 270, 'Un gráfico'), 'fade-up'),
          glass('<b>Septiembre</b> fue el mejor mes: el lanzamiento de otoño sumó casi la mitad de los ingresos.', 920, 450, 290, 190, { fontSize: 22, lineHeight: 1.3 }), credit()],
          'Gráfico de barras con datos de ejemplo (en millones de euros): 0,35 + 0,30 + 0,55 = 1,20 M€, igual que la cifra de la diapositiva anterior.'),
        L([ heading('Hitos del trimestre'), glass('', 70, 190, 1140, 330, { glass: 20 }),
          ...[['flag', 'Una bandera', 'Julio', 'Abrimos oficina nueva'], ['rocket', 'Un cohete', 'Agosto', 'Versión 2.0'], ['medal', 'Una medalla', 'Septiembre', 'Premio a la innovación'], ['star', 'Una estrella', 'Octubre', 'Récord de clientes']]
            .flatMap(([id, alt, m, ln], i) => [on(ico(id, 110 + i * 280, 220, 170, alt), 'zoom', { start: i ? 'afterPrev' : 'click' }),
              text(`<div style="text-align:center"><b style="font-size:28px;color:${T.ac}">${m}</b><br><span style="font-size:22px;color:${SOFT}">${ln}</span></div>`, 90 + i * 280, 410, 210, 100, { fontSize: 22 })]),
          note('Hitos de ejemplo.', 560)],
          'Cuatro hitos en orden. Cambiar fechas y textos.'),
        L([ heading('Equipos'), ...[['megaphone', 'Un megáfono', 'Marketing', 'Campañas y comunidad', '#fda4af'], ['tool', 'Unas herramientas', 'Producto', 'Diseño y desarrollo', '#93c5fd'], ['chat-bubble', 'Una conversación', 'Soporte', 'Atención al cliente', '#5eead4']]
            .flatMap(([id, alt, tt, ln, c], i) => tile(id, alt, tt, ln, 80 + i * 385, 290, 340, 270, { color: c, big: 190, ts: 34, ds: 25 }).map((b, j) => (j ? b : on(b, 'fade-up', { start: i ? 'afterPrev' : 'click' })))),
          note('Tres equipos, un mismo objetivo.', 620)],
          'Tres equipos. Sustituir por la estructura real.'),
        L([ heading('Riesgos y cómo los cubrimos'), glass('', 70, 150, 1140, 440, { glass: 20 }),
          ...[['lock', 'Un candado', 'Datos protegidos', 'Copias de seguridad y acceso con doble verificación'], ['sheild', 'Un escudo', 'Cumplimiento', 'Auditoría anual y formación a todo el equipo'], ['key', 'Una llave', 'Accesos', 'Cada persona solo ve lo que necesita']]
            .flatMap(([id, alt, tt, ln], i) => [on(ico(id, 110, 175 + i * 140, 120, alt), 'zoom', { start: i ? 'afterPrev' : 'click' }),
              text(`<b style="font-size:30px;color:${T.ac}">${tt}</b><br><span style="font-size:24px;color:${SOFT}">${ln}</span>`, 260, 190 + i * 140, 900, 100, { fontSize: 24 })]),
          credit()],
          'Tres riesgos con su medida. Textos de ejemplo.'),
        L([ heading('Prioridades del próximo trimestre'), glass('', 70, 150, 1140, 400, { glass: 20 }),
          tbl([['Prioridad', 'Responsable', 'Fecha'], ['Lanzar la app móvil', 'Producto', '15 de diciembre'], ['Campaña de invierno', 'Marketing', '1 de diciembre'], ['Reducir el tiempo de respuesta a 2 h', 'Soporte', '31 de diciembre']], 100, 180, 1080, 340),
          on(ico('target', 1040, 520, 170, 'Una diana'), 'zoom'), note('Fechas de ejemplo.', 640)],
          'Tres prioridades con responsable y fecha, de ejemplo.'),
        L([ heading('Conclusiones'), glass(ul('Los ingresos suman <b>1,2 M€</b> y septiembre fue el mejor mes.', 'Se cumplió el <b>92 %</b> de los objetivos.', 'La prioridad es la <b>app móvil</b> y bajar el tiempo de respuesta.'), 70, 150, 720, 320, { fontSize: 28, lineHeight: 1.45, glass: 20 }),
          on(ico('bulb', 840, 140, 340, 'Una bombilla'), 'zoom'), on(ico('thumb-up', 900, 440, 220, 'Un pulgar hacia arriba'), 'zoom', { start: 'afterPrev' }), credit()],
          'Tres ideas para llevarse.'),
        L([ text('¿Preguntas?', 90, 200, 640, 120, { fontSize: 76, fontWeight: 800, color: WH, fontFamily: FF.head }),
          glass('Escríbenos: hola@empresa.example', 90, 350, 620, 100, { fontSize: 28 }),
          on(ico('mail', 800, 150, 300, 'Un sobre de correo'), 'zoom'), on(ico('chat-text', 1010, 400, 190, 'Un mensaje'), 'zoom', { start: 'afterPrev' }), credit(90, 640)],
          'Cierre. El correo es de ejemplo.')
      ])); } },
};
