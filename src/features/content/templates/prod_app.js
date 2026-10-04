// Example presentations: Apps móviles (ficticias), cada una con su identidad. Each one: { name, summary, cat: 'product', make() } → a deck
// (see kit.js for the builders).

import { build, slide, text, card, shape, icon, anim, big, ul, model, nasa, A, withAnims, path, numbered, bar, glow, dg, timer, appScreen,
  chartBlock, tableBlock, codeBlock, mathBlock, pollBlock, PALETTES, pairStacks, uid, base, lib3d } from './kit.js';

// ---- Helpers of this file ---------------------------------------------------------
// An SVG picture as a data URL (the made-up app screens, drawings, maps).
const svgURL = (w, h, inner, bg = '#ffffff') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`);
// SVG text and a rounded rectangle.
const T = (x, y, s, fill, str, extra = '', ff = 'sans-serif') => `<text x="${x}" y="${y}" font-family="${ff}" font-size="${s}" fill="${fill}"${extra}>${str}</text>`;
const R = (x, y, w, h, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${extra}/>`;
// A picture (no frame) and a picture inside a device (phone, tablet, laptop, monitor, browser).
const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'cover', ...props });
const device = (src, kind, x, y, w, h, alt, props = {}) => img(src, x, y, w, h, alt, { device: kind, ...props });
const phone = (src, x, y, w, alt, props = {}) => device(src, 'phone', x, y, w, w * 2, alt, props);
// The same id on two slides in a row: Transform moves the object from one to the other.
const keep = (b, id) => ({ ...b, id });
// A 3D model without caption; the CC BY credits in one small line.
const m3d = (id, x, y, w, h, props = {}) => model(id, x, y, w, h, { caption: '', ...props });
const credits = (ids, x, y, w, color) => text('Modelos 3D: ' + ids.map(i => lib3d(i).label + ' — ' + lib3d(i).credit).join(' · '), x, y, w, 36, { fontSize: 12, color });
// The same animation on a group: the first starts it, the rest go with it (or after it).
const chain = (blocks, effect, start = 'click', props = {}, then = 'afterPrev') => blocks.map((b, i) => withAnims(b, A(effect, { ...props, start: i ? then : start })));
// A small deterministic scatter (stars, confetti, grain…): the same every time.
const scatter = (n, seed, fn) => { let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; return Array.from({ length: n }, (_, i) => fn(r, i)); };
// A tab bar for the phone screens.
const tabs = (w, h, color, dim, n = 4, on = 0, bg = '#ffffff') => R(0, h - 64, w, 64, 0, bg) + Array.from({ length: n }, (_, i) =>
  `<circle cx="${(w / n) * (i + 0.5)}" cy="${h - 34}" r="9" fill="${i === on ? color : dim}"/>`).join('');

// ─── Marea (meditation): the night sea ──────────────────────────────────────────────
const waves = (w, h, cols) => svgURL(w, h, cols.map((c, i) => { const y0 = 30 + i * (h - 40) / cols.length, a = 14 + i * 4, k = 2 + i * 0.6;
  let d = `M0 ${y0}`; for (let x = 0; x <= w; x += 20) d += ` L${x} ${(y0 + a * Math.sin((x / w) * Math.PI * 2 * k + i * 1.7)).toFixed(1)}`;
  return `<path d="${d} L${w} ${h} L0 ${h} Z" fill="${c}"/>`; }).join(''), '');
const mareaHome = () => svgURL(360, 720,
  `<defs><radialGradient id="g"><stop offset="0" stop-color="#9fc3ff" stop-opacity=".95"/><stop offset="1" stop-color="#9fc3ff" stop-opacity="0"/></radialGradient></defs>`
  + T(28, 70, 16, '#8fa3d6', 'Jueves · 23:12') + T(28, 108, 30, '#f3ead7', 'Buenas noches, Elena', ' font-style="italic"', 'Georgia,serif')
  + `<circle cx="180" cy="270" r="120" fill="url(#g)"/><circle cx="180" cy="270" r="82" fill="none" stroke="#f3ead7" stroke-opacity=".5" stroke-width="2"/>`
  + `<circle cx="180" cy="270" r="58" fill="#f3ead7" fill-opacity=".14"/>` + T(180, 266, 24, '#f3ead7', 'Inspira', ' text-anchor="middle"', 'Georgia,serif') + T(180, 294, 14, '#c9d6f5', '4 segundos', ' text-anchor="middle"')
  + T(28, 440, 18, '#f3ead7', 'Para esta noche', ' font-weight="700"')
  + [['Soltar el día', '10 min · guiada', '#5b7bd5'], ['Olas lentas', '20 min · sonido', '#3a9ca8'], ['Cuerpo pesado', '15 min · relajación', '#8a6fc9']].map(([t, d, c], i) => { const y = 460 + i * 70;
    return R(20, y, 320, 58, 16, '#ffffff', ' fill-opacity=".07"') + `<circle cx="52" cy="${y + 29}" r="16" fill="${c}"/>` + T(80, y + 26, 17, '#f3ead7', t) + T(80, y + 46, 13, '#8fa3d6', d); }).join('')
  + tabs(360, 720, '#9fc3ff', '#3a4a78', 4, 0, '#0a1229'), '#0d1838');
const mareaSounds = () => svgURL(360, 720, T(28, 70, 26, '#f3ead7', 'Sonidos', ' font-style="italic"', 'Georgia,serif')
  + [['Mar de noche', '#2f6f8f'], ['Lluvia en el tejado', '#4a5a8a'], ['Hoguera', '#a0582f'], ['Bosque', '#3d7a52'], ['Ruido rosa', '#8a5a8a'], ['Tren lejano', '#5a6a7a']].map(([t, c], i) => {
    const x = 20 + (i % 2) * 165, y = 100 + Math.floor(i / 2) * 175;
    return R(x, y, 155, 160, 18, c) + `<path d="M${x} ${y + 110} q40 -26 78 0 t77 0 V${y + 142} q0 18 -18 18 H${x + 18} q-18 0 -18 -18Z" fill="#ffffff" fill-opacity=".14"/>` + T(x + 14, y + 140, 15, '#ffffff', t, ' font-weight="700"'); }).join('')
  + tabs(360, 720, '#9fc3ff', '#3a4a78', 4, 1, '#0a1229'), '#0d1838');
const mareaDiary = () => svgURL(360, 720, T(28, 70, 26, '#f3ead7', 'Tu sueño', ' font-style="italic"', 'Georgia,serif') + T(28, 100, 14, '#8fa3d6', 'Últimos 7 días')
  + ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => { const v = [5.8, 6.2, 6.9, 7.1, 6.6, 7.8, 7.5][i], h = v * 34, x = 34 + i * 44;
    return R(x, 380 - h, 26, h, 8, i > 4 ? '#9fc3ff' : '#5b7bd5') + T(x + 13, 404, 14, '#8fa3d6', d, ' text-anchor="middle"'); }).join('')
  + R(20, 440, 320, 110, 18, '#ffffff', ' fill-opacity=".07"') + T(40, 476, 14, '#8fa3d6', 'Media de la semana') + T(40, 524, 38, '#f3ead7', '6 h 50 min', ' font-weight="700"')
  + R(20, 566, 320, 72, 18, '#ffffff', ' fill-opacity=".07"') + T(40, 608, 16, '#f3ead7', 'Te dormiste 18 min antes que ayer')
  + tabs(360, 720, '#9fc3ff', '#3a4a78', 4, 2, '#0a1229'), '#0d1838');

// ─── Vocablo (languages): postcards and airmail ─────────────────────────────────────
const airmail = (y, h = 16) => Array.from({ length: 30 }, (_, i) => shape('parallelogram', -30 + i * 46, y, 40, h, ['#c8402f', '#f4ecdc', '#264b8c', '#f4ecdc'][i % 4]));
const vocabloChat = () => svgURL(360, 720, R(0, 0, 360, 96, 0, '#264b8c') + T(24, 58, 22, '#ffffff', '🇮🇹  Italiano · lección 12', ' font-weight="700"')
  + [['Ciao! Vuoi un caffè?', 0], ['Sì, grazie. Un cappuccino.', 1], ['Con o senza zucchero?', 0], ['Senza, per favore.', 1]].map(([t, me], i) => { const y = 130 + i * 92, w = t.length * 9.4 + 34, x = me ? 340 - w : 20;
    return R(x, y, w, 58, 18, me ? '#c8402f' : '#ffffff', me ? '' : ' stroke="#e2d8c3"') + T(x + 17, y + 35, 17, me ? '#ffffff' : '#2e2a24', t); }).join('')
  + R(20, 520, 320, 72, 36, '#ffffff', ' stroke="#e2d8c3"') + `<circle cx="300" cy="556" r="26" fill="#3e7a5a"/>` + `<rect x="294" y="540" width="12" height="22" rx="6" fill="#fff"/>` + T(44, 562, 17, '#8a8070', 'Pulsa y responde en voz alta')
  + R(20, 612, 320, 14, 7, '#e2d8c3') + R(20, 612, 230, 14, 7, '#3e7a5a') + T(20, 650, 13, '#8a8070', 'Racha: 23 días · 72 % de la lección')
  + tabs(360, 720, '#264b8c', '#d8cdb6', 4, 0, '#fbf6ea'), '#f4ecdc');

// ─── Andén (city transit): signs and the metro map ──────────────────────────────────
const LINES = { L1: '#e2231a', L2: '#0072bc', L3: '#f2a900', L4: '#00a651' };
const roundel = (n, x, y, d) => shape('ellipse', x, y, d, d, LINES[n], { html: `<b>${n}</b>`, fontSize: Math.round(d * 0.38), color: n === 'L3' ? '#111111' : '#ffffff' });
const andenRoute = () => svgURL(360, 720, R(0, 0, 360, 150, 0, '#111111') + T(24, 52, 14, '#9a9a9a', 'DESDE') + T(24, 78, 20, '#ffffff', 'Plaza del Reloj', ' font-weight="700"')
  + T(24, 110, 14, '#9a9a9a', 'HASTA') + T(24, 136, 20, '#ffffff', 'Hospital Sur', ' font-weight="700"')
  + T(24, 192, 30, '#111111', '24 min', ' font-weight="800"') + T(150, 192, 15, '#666', 'llegas a las 9:02')
  + [['L1', 'Plaza del Reloj → Ópera', '3 paradas · 7 min'], ['walk', 'Trasbordo en Ópera', '3 min a pie'], ['L2', 'Ópera → Hospital Sur', '5 paradas · 12 min']].map(([l, t, d], i) => { const y = 230 + i * 110;
    return (l === 'walk' ? `<circle cx="44" cy="${y + 30}" r="20" fill="#e6e6e6"/>` + T(44, y + 37, 18, '#111', '🚶', ' text-anchor="middle"')
      : `<circle cx="44" cy="${y + 30}" r="22" fill="${LINES[l]}"/>` + T(44, y + 37, 16, l === 'L3' ? '#111' : '#fff', l, ' text-anchor="middle" font-weight="700"'))
      + (i < 2 ? `<line x1="44" y1="${y + 56}" x2="44" y2="${y + 106}" stroke="#cfcfcf" stroke-width="4" stroke-dasharray="${l === 'walk' ? '0' : '6 6'}"/>` : '')
      + T(82, y + 26, 17, '#111', t, ' font-weight="700"') + T(82, y + 50, 14, '#777', d); }).join('')
  + R(20, 580, 320, 64, 14, '#111111') + T(180, 620, 18, '#f2a900', 'Próximo tren en 2 min', ' text-anchor="middle" font-weight="700"')
  + tabs(360, 720, '#111111', '#d0d0d0'), '#ffffff');

// ─── Sobras (cooking with leftovers): the fridge door ──────────────────────────────
const HAND = "'Caveat', cursive";
const postit = (html, x, y, w, h, color, rot, props = {}) => text(html, x, y, w, h, { bg: color, rotation: rot, fontFamily: HAND, fontSize: 34, color: '#24312b', pad: [18, 20, 18, 20],
  shadow: { x: 3, y: 8, blur: 14, color: '#00000030' }, lineHeight: 1.15, ...props });
const magnet = (x, y, c) => shape('ellipse', x, y, 34, 34, c, { fill2: '#00000055', gradType: 'radial', shadow: { x: 2, y: 4, blur: 6, color: '#00000040' } });
const sobrasScan = () => svgURL(360, 720, R(0, 0, 360, 720, 0, '#1d2421')
  + [150, 300, 450].map(y => R(16, y, 328, 8, 4, '#e8efe9', ' opacity=".5"')).join('')
  + R(40, 92, 110, 56, 18, '#4f7a3a') + `<ellipse cx="230" cy="120" rx="54" ry="28" fill="#f4e6c4"/>` + `<ellipse cx="270" cy="270" rx="30" ry="22" fill="#fff8ea"/><ellipse cx="225" cy="272" rx="30" ry="22" fill="#fff8ea"/>`
  + R(46, 220, 120, 70, 14, '#7fa650') + R(60, 380, 230, 62, 12, '#f2c14e') + R(40, 520, 140, 70, 10, '#d9534f')
  + [[30, 80, 135, 80, 'calabacín · 94 %'], [168, 82, 128, 76, 'queso · 88 %'], [184, 238, 132, 70, 'huevos ×3'], [36, 210, 140, 90, 'espinacas'], [50, 370, 250, 82, 'arroz cocido · 1 día'], [30, 510, 160, 90, 'tomate']].map(([x, y, w, h, t]) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#9be15d" stroke-width="3"/>` + R(x, y - 24, t.length * 8 + 14, 22, 6, '#9be15d') + T(x + 7, y - 8, 14, '#10200a', t, ' font-weight="700"')).join('')
  + R(20, 624, 320, 64, 32, '#9be15d') + T(180, 664, 19, '#10200a', '6 ingredientes · ver recetas', ' text-anchor="middle" font-weight="700"'), '#1d2421');
const sobrasRecipes = () => svgURL(360, 720, T(24, 62, 26, '#24312b', 'Para hoy', ' font-weight="800"') + T(24, 90, 14, '#6d7a72', 'Con lo que tienes · menos de 25 min')
  + [['Tortilla de lo que hay', '20 min · 4 ingredientes', '#f2c14e', 'Usa: huevos, calabacín, queso'], ['Arroz salteado', '15 min · aprovecha el de ayer', '#7fa650', 'Usa: arroz, espinacas, huevo'], ['Tostas de tomate', '10 min · para cenar', '#d9534f', 'Usa: tomate, queso, pan']].map(([t, d, c, u], i) => { const y = 116 + i * 178;
    return R(20, y, 320, 162, 18, '#ffffff', ' stroke="#dfe7e2"') + R(20, y, 320, 70, 18, c) + R(20, y + 52, 320, 18, 0, c) + T(36, y + 44, 19, '#ffffff', t, ' font-weight="800"')
      + T(36, y + 100, 15, '#24312b', d) + T(36, y + 128, 13, '#6d7a72', u); }).join('') + tabs(360, 720, '#2e7d32', '#cfd8d3', 4, 1), '#f3f7f4');

// ─── Cartilla (banking for older people): the passbook ─────────────────────────────
const cartillaHome = () => svgURL(360, 720, R(0, 0, 360, 210, 0, '#1f4d3a') + T(24, 64, 24, '#ffffff', 'Hola, Carmen', '', 'Georgia,serif') + T(24, 110, 16, '#cfe3d8', 'Tienes en tu cuenta', '', 'Verdana,sans-serif')
  + T(24, 170, 46, '#ffffff', '1.248,30 €', ' font-weight="700"', 'Georgia,serif')
  + [['Ver mis movimientos', '#ffffff', '#1b1b1b'], ['Enviar dinero', '#ffffff', '#1b1b1b'], ['Llamar a mi gestora', '#c9a24a', '#1b1b1b']].map(([t, bg, fg], i) => { const y = 240 + i * 128;
    return R(20, y, 320, 108, 20, bg, ' stroke="#1f4d3a" stroke-width="3"') + T(180, y + 64, 22, fg, t, ' text-anchor="middle" font-weight="700"', 'Verdana,sans-serif'); }).join('')
  + T(180, 660, 15, '#555', 'Sin prisas: nada caduca mientras lees', ' text-anchor="middle"', 'Verdana,sans-serif'), '#fbf8f0');

// ─── Turno (doctor's appointments): the clinic ─────────────────────────────────────
const turnoBook = () => svgURL(360, 720, R(0, 0, 360, 120, 0, '#0f8b8d') + T(24, 56, 15, '#d8f0ef', 'Centro de Salud Las Acacias') + T(24, 92, 26, '#ffffff', 'Pedir cita', ' font-weight="800"')
  + T(24, 160, 17, '#0b3c49', 'Noviembre', ' font-weight="700"')
  + ['L', 'M', 'X', 'J', 'V'].map((d, i) => T(46 + i * 66, 196, 13, '#7a9aa3', d, ' text-anchor="middle"')).join('')
  + Array.from({ length: 15 }, (_, k) => { const d = k + 3, x = 46 + (k % 5) * 66, y = 230 + Math.floor(k / 5) * 52, sel = d === 12, off = [5, 9, 16].includes(d);
    return (sel ? `<circle cx="${x}" cy="${y - 6}" r="22" fill="#0f8b8d"/>` : '') + T(x, y, 17, sel ? '#fff' : off ? '#c3d3d7' : '#0b3c49', d, ' text-anchor="middle"' + (sel ? ' font-weight="800"' : '')); }).join('')
  + T(24, 410, 17, '#0b3c49', 'Miércoles 12 · Dra. Ortega', ' font-weight="700"')
  + ['9:20', '10:40', '11:00', '12:20', '13:00', '17:40'].map((t, i) => { const x = 24 + (i % 3) * 106, y = 430 + Math.floor(i / 3) * 62, on = i === 1;
    return R(x, y, 96, 48, 24, on ? '#0f8b8d' : '#ffffff', on ? '' : ' stroke="#bcd9da" stroke-width="2"') + T(x + 48, y + 31, 17, on ? '#fff' : '#0b3c49', t, ' text-anchor="middle" font-weight="700"'); }).join('')
  + R(24, 590, 312, 64, 32, '#ef6f6c') + T(180, 630, 19, '#ffffff', 'Confirmar cita · 10:40', ' text-anchor="middle" font-weight="800"'), '#f7fbfc');
const turnoAgenda = (w = 1280, h = 800) => svgURL(w, h, R(0, 0, w, 84, 0, '#0b3c49') + T(32, 54, 28, '#ffffff', 'Turno · Agenda de hoy', ' font-weight="800"') + T(w - 360, 54, 20, '#9fd3d4', 'Consulta 4 · Dra. Ortega')
  + [['9:00', 'M. L. R.', 'Atendida', '#9bd3b0'], ['9:20', 'J. P. G.', 'Atendida', '#9bd3b0'], ['9:40', 'A. S. M.', 'En consulta', '#0f8b8d'], ['10:00', 'R. D. C.', 'En sala · llegó 9:52', '#ffd27a'], ['10:20', 'Hueco libre', 'Ofrecido a lista de espera', '#d8e3e6'], ['10:40', 'C. V. N.', 'Confirmada por la app', '#cfe7f5'], ['11:00', 'E. B. T.', 'Recordatorio enviado', '#cfe7f5']].map(([t, n, st, c], i) => { const y = 112 + i * 92;
    return R(32, y, 760, 78, 12, '#ffffff', ' stroke="#dbe7ea"') + R(32, y, 14, 78, 6, c) + T(70, y + 48, 26, '#0b3c49', t, ' font-weight="700"') + T(200, y + 48, 24, '#0b3c49', n) + T(470, y + 48, 20, '#5b7a83', st); }).join('')
  + R(824, 112, 424, 300, 16, '#ffffff', ' stroke="#dbe7ea"') + T(852, 158, 22, '#5b7a83', 'Huecos recuperados hoy') + T(852, 250, 90, '#0f8b8d', '6', ' font-weight="800"') + T(852, 300, 20, '#5b7a83', 'citas anuladas que otra persona aprovechó')
  + R(824, 436, 424, 300, 16, '#ffffff', ' stroke="#dbe7ea"') + T(852, 482, 22, '#5b7a83', 'Espera media en sala') + T(852, 574, 90, '#ef6f6c', '7 min', ' font-weight="800"') + T(852, 624, 20, '#5b7a83', 'antes de Turno: 26 min'), '#f2f7f8');

// ─── Garaje (local live music): vinyl and gig posters ──────────────────────────────
const neon = (str, c) => `<span style="color:#ffffff;text-shadow:0 0 6px ${c},0 0 18px ${c},0 0 36px ${c}">${str}</span>`;
const garajeGigs = () => svgURL(360, 720, T(24, 62, 14, '#a99cc8', 'ESTA NOCHE · A MENOS DE 2 KM') + T(24, 96, 28, '#ffffff', 'Cerca de ti', ' font-weight="800"')
  + [['Los Tranvías', 'Sala La Nave · 21:30', '8 €', '#ff3d9a', '#7b2ff7'], ['Marga y el Ruido', 'Bar El Andén · 22:00', 'Gratis', '#3df5ff', '#2f6bf7'], ['Coro Fantasma', 'Patio del Ateneo · 20:00', '5 €', '#ffe14d', '#f77b2f'], ['Diez Perros', 'Garaje 9 · 23:00', '6 €', '#7dff8a', '#11998e']].map(([b, w, p, c1, c2], i) => { const y = 124 + i * 128;
    return `<defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
      + R(16, y, 328, 112, 18, '#1f1438') + R(28, y + 12, 88, 88, 14, `url(#g${i})`) + `<circle cx="72" cy="${y + 56}" r="22" fill="#120a24"/><circle cx="72" cy="${y + 56}" r="6" fill="${c1}"/>`
      + T(130, y + 42, 19, '#ffffff', b, ' font-weight="800"') + T(130, y + 68, 14, '#a99cc8', w) + R(130, y + 80, 64, 24, 12, c1) + T(162, y + 97, 13, '#120a24', p, ' text-anchor="middle" font-weight="800"'); }).join('')
  + tabs(360, 720, '#ff3d9a', '#3a2c5c', 4, 0, '#0d071b'), '#120a24');
const garajeBand = (w = 1280, h = 800) => svgURL(w, h, R(0, 0, w, 90, 0, '#1f1438') + T(36, 58, 30, '#ffffff', 'Los Tranvías · panel del grupo', ' font-weight="800"') + T(w - 300, 58, 20, '#ff3d9a', '● En directo: 412 oyentes')
  + [['Oyentes este mes', '12.480', '#ff3d9a'], ['Entradas vendidas', '1.906', '#3df5ff'], ['Seguidores nuevos', '+640', '#ffe14d']].map(([l, v, c], i) => { const x = 36 + i * 410;
    return R(x, 120, 390, 170, 18, '#1f1438') + T(x + 24, 164, 20, '#a99cc8', l) + T(x + 24, 250, 64, c, v, ' font-weight="800"'); }).join('')
  + R(36, 320, 800, 440, 18, '#1f1438') + T(60, 362, 22, '#ffffff', 'Escuchas por barrio', ' font-weight="700"')
  + [['Centro', 0.92], ['La Estación', 0.74], ['Río Alto', 0.61], ['San Blas', 0.48], ['El Puerto', 0.35], ['Las Eras', 0.22]].map(([l, v], i) => { const y = 400 + i * 56;
    return T(60, y + 26, 19, '#a99cc8', l) + R(220, y + 6, 580, 26, 13, '#2c2050') + R(220, y + 6, 580 * v, 26, 13, '#ff3d9a', ` opacity="${1 - i * 0.1}"`); }).join('')
  + R(866, 320, 378, 440, 18, '#1f1438') + T(890, 362, 22, '#ffffff', 'Próximos conciertos', ' font-weight="700"')
  + [['14 nov', 'Sala La Nave'], ['22 nov', 'Fiestas de San Blas'], ['6 dic', 'Garaje 9'], ['20 dic', 'Ateneo · acústico']].map(([d, v], i) => { const y = 392 + i * 88;
    return R(890, y, 330, 72, 12, '#2c2050') + T(910, y + 44, 22, '#3df5ff', d, ' font-weight="800"') + T(1010, y + 44, 19, '#ffffff', v); }).join(''), '#120a24');

// ─── Grano (film photography): the darkroom ────────────────────────────────────────
// A small made-up landscape photo (sky, sun, hills, water) in the colours given.
const scene = (w, h, [sky1, sky2, sun, hill1, hill2, water], grain = 0) => svgURL(w, h,
  `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#s)"/>`
  + `<circle cx="${w * 0.68}" cy="${h * 0.42}" r="${h * 0.12}" fill="${sun}"/>`
  + `<path d="M0 ${h * 0.62} Q${w * 0.2} ${h * 0.4} ${w * 0.42} ${h * 0.58} T${w} ${h * 0.5} V${h} H0Z" fill="${hill1}"/>`
  + `<path d="M0 ${h * 0.74} Q${w * 0.35} ${h * 0.6} ${w * 0.7} ${h * 0.72} T${w} ${h * 0.68} V${h} H0Z" fill="${hill2}"/>`
  + `<rect y="${h * 0.84}" width="${w}" height="${h * 0.16}" fill="${water}"/>`
  + (grain ? scatter(grain, 11, r => `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(0.6 + r() * 1.2).toFixed(1)}" fill="${r() > 0.5 ? '#ffffff' : '#000000'}" opacity=".18"/>`).join('') : ''), '');
const FILM = [['#f7c59f', '#ef8354', '#fff3b0', '#5c4d7d', '#2d3047', '#3b5b7a'], ['#a8dadc', '#f1faee', '#ffd166', '#457b9d', '#1d3557', '#5fa8d3'], ['#ffcad4', '#f4acb7', '#ffffff', '#9d8189', '#6d597a', '#b5838d'],
  ['#d8e2dc', '#ffe5d9', '#ffb703', '#588157', '#344e41', '#7aa095'], ['#3a0ca3', '#f72585', '#ffd6ff', '#480ca8', '#240046', '#560bad'], ['#e9edc9', '#ccd5ae', '#faedcd', '#a3b18a', '#588157', '#83a598']];
const granoSheet = () => svgURL(360, 720, T(24, 62, 26, '#f2ebe0', 'Carrete 07', ' font-weight="800"') + T(24, 90, 14, '#c9a98a', '24 fotos · revelado mañana a las 9:00')
  + Array.from({ length: 12 }, (_, i) => { const x = 20 + (i % 3) * 110, y = 112 + Math.floor(i / 3) * 128, c = FILM[i % 6];
    return R(x, y, 100, 116, 4, '#000000') + `<rect x="${x + 6}" y="${y + 8}" width="88" height="100" fill="${c[1]}"/><path d="M${x + 6} ${y + 70} q22 -24 44 -4 t44 -6 v48 h-88z" fill="${c[3]}"/><circle cx="${x + 64}" cy="${y + 40}" r="10" fill="${c[2]}"/>`
      + (i > 8 ? `<rect x="${x + 6}" y="${y + 8}" width="88" height="100" fill="#1a0707" opacity=".85"/>` + T(x + 50, y + 64, 12, '#c9a98a', 'sin revelar', ' text-anchor="middle"') : ''); }).join('')
  + tabs(360, 720, '#ffb347', '#4a2a2a', 4, 1, '#120404'), '#1a0707');
const granoEdit = (w = 1024, h = 768) => svgURL(w, h, R(0, 0, w, 64, 0, '#120404') + T(28, 42, 22, '#f2ebe0', 'Grano · cuarto oscuro', ' font-weight="800"') + T(w - 200, 42, 18, '#ffb347', 'Película: Brisa 400')
  + `<image href="${scene(640, 480, FILM[0], 260)}" x="28" y="90" width="640" height="480"/>`
  + [['Exposición', 0.55], ['Contraste', 0.7], ['Grano', 0.8], ['Viñeta', 0.35], ['Calidez', 0.62]].map(([l, v], i) => { const y = 110 + i * 92;
    return T(700, y + 20, 19, '#f2ebe0', l) + R(700, y + 38, 290, 6, 3, '#4a2a2a') + R(700, y + 38, 290 * v, 6, 3, '#ffb347') + `<circle cx="${700 + 290 * v}" cy="${y + 41}" r="11" fill="#f2ebe0"/>`; }).join('')
  + R(28, 600, 640, 140, 12, '#120404') + Array.from({ length: 6 }, (_, i) => `<rect x="${44 + i * 104}" y="616" width="92" height="108" fill="${FILM[i][1]}"/>`).join(''), '#1a0707');
// The camera to label (activity): body, lens, viewfinder, shutter, dial, flash.
const camera = () => svgURL(800, 520, R(80, 150, 640, 320, 36, '#2b2b2b') + R(80, 220, 640, 170, 0, '#4a3a2e') + R(250, 90, 300, 80, 18, '#2b2b2b')
  + R(290, 104, 90, 50, 8, '#7fb2d9') + `<circle cx="400" cy="320" r="130" fill="#1a1a1a"/><circle cx="400" cy="320" r="100" fill="#333"/><circle cx="400" cy="320" r="62" fill="#26415a"/><circle cx="380" cy="300" r="18" fill="#9cc6e8" opacity=".7"/>`
  + `<rect x="140" y="112" width="70" height="38" rx="8" fill="#c1121f"/><circle cx="620" cy="120" r="34" fill="#555"/><circle cx="620" cy="120" r="22" fill="#777"/>`
  + R(600, 190, 90, 50, 8, '#e8e8e8') + T(620, 222, 18, '#444', 'ISO', ' font-weight="700"'), '#f2ebe0');

// ─── Serie (neighbourhood gym): the LED scoreboard ─────────────────────────────────
const LED = "'JetBrains Mono', monospace";
const led = (str, c) => `<span style="color:${c};text-shadow:0 0 8px ${c},0 0 22px ${c}">${str}</span>`;
const serieClasses = () => svgURL(360, 720, R(0, 0, 360, 130, 0, '#0d0d0f') + T(24, 56, 14, '#ff6b6b', 'GIMNASIO BARRIO NORTE') + T(24, 98, 30, '#ffffff', 'Hoy, martes', ' font-weight="800"')
  + [['07:00', 'Fuerza básica', '3 plazas', '#ff2a2a', 0], ['09:30', 'Movilidad +60', 'Completa · lista de espera', '#6b6b75', 0], ['15:00', 'Circuito exprés', '14 plazas', '#ffd60a', 1], ['19:00', 'Boxeo técnico', '2 plazas', '#ff2a2a', 0], ['20:15', 'Pilates', '6 plazas', '#3ddc97', 0]].map(([t, c, s, col, sel], i) => { const y = 150 + i * 92;
    return R(16, y, 328, 80, 14, sel ? '#1f1f24' : '#16161a', sel ? ' stroke="#ffd60a" stroke-width="2"' : '') + T(36, y + 48, 24, col, t, ' font-weight="800"', 'monospace') + T(130, y + 36, 18, '#ffffff', c, ' font-weight="700"') + T(130, y + 60, 14, '#9a9aa5', s); }).join('')
  + R(16, 620, 328, 56, 28, '#ffd60a') + T(180, 655, 18, '#0d0d0f', 'Reservar 15:00 · Circuito', ' text-anchor="middle" font-weight="800"'), '#0d0d0f');

// ─── Plaza (the neighbourhood market at home): awnings and chalk boards ─────────────
const awning = (y = 0, h = 100, c1 = '#c0392b', c2 = '#fbf3e4') => Array.from({ length: 16 }, (_, i) => [shape('rect', i * 80, y, 80, h, i % 2 ? c2 : c1),
  shape('ellipse', i * 80, y + h - 40, 80, 80, i % 2 ? c2 : c1)]).flat();
const chalk = (html, x, y, w, h, rot = 0, props = {}) => text(html, x, y, w, h, { bg: '#2b2b2b', color: '#f4f1ea', fontFamily: "'Caveat', cursive", fontSize: 32, textAlign: 'center', vAlign: 'middle', rotation: rot,
  radius: 6, pad: [12, 16, 12, 16], borderColor: '#8a6a44', shadow: { x: 2, y: 6, blur: 10, color: '#00000040' }, lineHeight: 1.1, ...props });
const plazaMap = () => svgURL(1100, 470, R(0, 0, 1100, 470, 0, '#e9dfc9')
  + [[40, 40, 220, 150], [300, 40, 260, 150], [600, 40, 200, 150], [840, 40, 220, 150], [40, 250, 220, 180], [300, 250, 260, 180], [600, 250, 200, 180], [840, 250, 220, 180]].map(([x, y, w, h], i) =>
    R(x, y, w, h, 10, i === 5 ? '#f3d9a4' : '#d9ccb0') + (i === 3 || i === 6 ? `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${h * 0.3}" fill="#a7c18f"/>` : '')).join('')
  + `<path d="M0 220 H1100 M280 0 V470 M580 0 V470 M820 0 V470" stroke="#fffaf0" stroke-width="22"/>`
  + R(330, 280, 200, 120, 10, '#c0392b') + T(430, 352, 26, '#fff', 'MERCADO', ' text-anchor="middle" font-weight="800"')
  + [[150, 110, 'C/ Olmo 4'], [950, 330, 'Pza. Mayor 1'], [700, 110, 'Av. Sol 12']].map(([x, y, t]) => `<circle cx="${x}" cy="${y}" r="16" fill="#2f6b3a"/>` + T(x, y + 40, 18, '#3b3228', t, ' text-anchor="middle"')).join('')
  + T(300, 240, 15, '#8a7a5a', 'Calle del Mercado') + T(590, 460, 15, '#8a7a5a', 'Av. de los Olmos', ' transform="rotate(-90 590 460)"'), '');
const plazaStalls = () => svgURL(360, 720, R(0, 0, 360, 120, 0, '#c0392b') + Array.from({ length: 9 }, (_, i) => `<circle cx="${i * 45}" cy="120" r="22" fill="${i % 2 ? '#fbf3e4' : '#c0392b'}"/>`).join('')
  + T(24, 64, 28, '#ffffff', 'Plaza', ' font-weight="800"', 'Georgia,serif') + T(24, 94, 14, '#ffe3dc', 'Mercado de San Blas · abierto')
  + [['Frutería Rosa', 'Tomate de huerta 2,40 €/kg', '#e76f51'], ['Pescados Lolo', 'Boquerón fresco 6,90 €/kg', '#2a9d8f'], ['Horno Celia', 'Pan de pueblo 2,10 €', '#d4a373'], ['Quesos Abril', 'Curado de oveja 18 €/kg', '#e9c46a']].map(([n, d, c], i) => { const y = 160 + i * 106;
    return R(16, y, 328, 92, 14, '#ffffff', ' stroke="#e6dccb"') + `<circle cx="60" cy="${y + 46}" r="30" fill="${c}"/>` + T(104, y + 40, 18, '#3b3228', n, ' font-weight="800"') + T(104, y + 66, 14, '#7a6f60', d); }).join('')
  + R(16, 600, 328, 60, 30, '#2f6b3a') + T(180, 637, 17, '#ffffff', 'Cesta: 4 puestos · 31,60 €', ' text-anchor="middle" font-weight="800"'), '#f6efe2');

export default {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1 · Marea, a meditation and sleep app: the night sea, a breathing exercise built from rings, a lantern in 3D.
  prod_app_meditation: { name: 'Marea: app de meditación y sueño', cat: 'product',
    summary: 'Noche marina: luna con texto curvo, Transformar del móvil, respiración guiada con aros encadenados, cuenta atrás, gráfico y farol 3D',
    make: () => {
      const BG = '#0b1430', CREAM = '#f3ead7', SKY = '#9fc3ff', DIM = '#8fa3d6', head = pairStacks('classic').heading, PH = uid(), MOON = uid();
      const sky = () => [shape('rect', 0, 0, 1280, 720, '#070e24', { fill2: '#1b2a58', gradAngle: 180 }),
        ...scatter(46, 7, r => shape('ellipse', Math.round(r() * 1260), Math.round(r() * 420), 3 + Math.round(r() * 3), 3 + Math.round(r() * 3), '#ffffff', { opacity: 30 + Math.round(r() * 60) }))];
      const sea = (y = 560, h = 160) => img(waves(1280, h, ['#1d3a78', '#16306a', '#0f2452']), 0, y, 1280, h, 'Olas del mar de noche', { decorative: true });
      const home = (x, y, w, props = {}) => keep(phone(mareaHome(), x, y, w, 'Pantalla de inicio de Marea: un círculo que respira', props), PH);
      const moon = (x, y, d) => keep(shape('ellipse', x, y, d, d, '#fbf3df', { fill2: '#d9c9a3', gradType: 'radial' }), MOON);
      return numbered(build({ name: 'Marea · meditar y dormir', palette: 'midnight', fonts: 'classic', title: { color: CREAM, size: 50, bold: false }, body: { color: CREAM } }, [
        { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', back: sky(), extra: [
          glow(840, -40, 420, '#f4e7c5', '#101d44', 30), moon(950, 70, 150),
          text('RESPIRA · SUELTA · DUERME · ', 905, 25, 240, 240, { fontSize: 17, curve: 100, color: '#c9b98f', letterSpacing: 4, textAlign: 'center' }),
          text('APP DE MEDITACIÓN Y SUEÑO', 96, 150, 560, 36, { fontSize: 20, color: DIM, letterSpacing: 6 }),
          text('Marea', 84, 180, 560, 190, { fontFamily: head, fontSize: 160, fontStyle: 'italic', color: CREAM, lineHeight: 1 }),
          text('Diez minutos para soltar el día.<br>Una noche entera para descansar.', 96, 380, 520, 110, { fontSize: 32, color: CREAM, lineHeight: 1.35 }),
          sea(), home(670, 150, 230, { rotation: -5 })],
          notes: 'Portada: cielo con estrellas, una luna con texto curvo alrededor (Texto curvo al 100 %) y olas dibujadas en SVG. Empieza en voz baja: el tono de la presentación es el de la app.' },
        { layout: 'blank', bg: BG, autoAnimate: true, back: sky(), extra: [
          moon(1130, 40, 70), sea(600, 120), home(110, 70, 260),
          text('Qué es Marea', 470, 80, 700, 80, { fontFamily: head, fontSize: 56, fontStyle: 'italic', color: CREAM }),
          ...[['clock', 'Sesiones de 3 a 20 minutos', 'Guiadas por voces tranquilas, sin música estridente.', SKY], ['heart', 'Respiración al ritmo del mar', 'El círculo crece y se encoge: solo hay que seguirlo.', '#f0a6b8'],
            ['star', 'Modo noche de verdad', 'Pantalla casi negra, sin avisos y sin luz azul.', '#f2d48f']].flatMap(([ic, h, d, c], i) => [
            withAnims(icon(ic, 480, 200 + i * 125, 54, c), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 350 })),
            withAnims(text(`<b style="font-size:29px;color:${CREAM}">${h}</b><br><span style="color:${DIM}">${d}</span>`, 560, 186 + i * 125, 640, 100, { fontSize: 22 }), A('fade-left', { start: 'withPrev', duration: 450 }))])],
          notes: 'Transformar: el móvil y la luna viajan desde la portada (mismo objeto en las dos diapositivas) y se colocan a la izquierda. Las tres funciones entran con un clic, una detrás de otra.' },
        { layout: 'blank', bg: '#0a1128', transition: 'fade', extra: [
          text('Cuando la cabeza no para', 90, 70, 1100, 80, { fontFamily: head, fontSize: 54, fontStyle: 'italic', color: CREAM }),
          shape('rect', 90, 168, 120, 3, SKY),
          ...chain([['1 de cada 3', 'adultos dice dormir mal al menos tres noches por semana'], ['47 min', 'tarda de media en dormirse quien da vueltas a las cosas'], ['× 2', 'más rápido se duerme tras diez minutos de respiración lenta']].map(([n, l], i) =>
            text(`<div style="font-family:${head};font-size:60px;font-style:italic;color:${[SKY, '#f2d48f', '#f0a6b8'][i]};line-height:1.1">${n}</div><div style="margin-top:14px">${l}</div>`, 90 + i * 380, 280, 340, 280, { fontSize: 27, color: CREAM, lineHeight: 1.35 })), 'fade-up', 'click', { duration: 700 }),
          shape('rect', 450, 290, 1, 230, '#2a3a6a'), shape('rect', 830, 290, 1, 230, '#2a3a6a'),
          text('Datos de una encuesta propia a 1.200 personas (cifras de ejemplo).', 90, 620, 1100, 36, { fontSize: 18, color: '#5c6c9a' })],
          notes: 'Tres cifras que entran en cadena con un solo clic. Son datos inventados para la plantilla: sustitúyelos por los de tu estudio.' },
        // The breathing exercise: rings appear one by one (breathe in), the text says "hold", then they go from the outside in (breathe out).
        (() => {
          const C = [640, 380], D = [120, 190, 260, 330, 400], cols = ['#d6e5ff', '#b6cffb', '#94b7f3', '#7a9fe6', '#5f86d6'];
          // (play order: «Inspira», rings 1…5 in; «Mantén»; «Suelta», rings 5…1 out. Each «after previous» waits for the one before it.)
          const sayIn = A('fade-in-then-semi-out', { start: 'click', duration: 4000 });
          const inA = D.map((_, i) => A('zoom-in', { start: i ? 'afterPrev' : 'withPrev', duration: 800 }));
          const hold = A('fade-in-then-semi-out', { start: 'afterPrev', duration: 4000 });
          const sayOut = A('fade-in-then-semi-out', { start: 'afterPrev', duration: 6000 });
          const outA = []; for (let k = 4; k >= 0; k--) outA[k] = A('fade-out', { start: k === 4 ? 'withPrev' : 'afterPrev', duration: 1200 });
          const rings = D.map((d, i) => withAnims(shape('ellipse', C[0] - d / 2, C[1] - d / 2, d, d, cols[i], { opacity: 26 + (4 - i) * 12, stroke: '#ffffff', strokeWidth: 1 }), inA[i], outA[i])).reverse();
          const word = (s, sec, i, a) => withAnims(text(`${s} <span style="font-size:24px;color:${DIM}">${sec}</span>`, 90, 300 + i * 90, 330, 70, { fontFamily: head, fontSize: 46, fontStyle: 'italic', color: CREAM }), a);
          return { layout: 'blank', bg: BG, transition: 'fade', extra: [
            text('Respira conmigo', 90, 60, 700, 80, { fontFamily: head, fontSize: 54, fontStyle: 'italic', color: CREAM }),
            text('Ritmo 4 · 4 · 6: inspira mientras crecen los aros, mantén, y suelta el aire mientras se apagan.', 90, 150, 330, 140, { fontSize: 23, color: DIM, lineHeight: 1.35 }),
            shape('ellipse', C[0] - 210, C[1] - 210, 420, 420, 'none', { stroke: '#2a3a6a', strokeWidth: 2, dash: 'dash' }),
            ...rings, word('Inspira', '4 s', 0, sayIn), word('Mantén', '4 s', 1, hold), word('Suelta', '6 s', 2, sayOut),
            text('Un minuto juntos', 980, 210, 220, 40, { fontSize: 22, color: DIM, textAlign: 'center' }),
            timer(60, 990, 260, 200, { color: SKY, auto: false, endText: 'Bien hecho' })],
            notes: 'Un clic arranca la respiración: los aros aparecen uno tras otro (inspira), «Mantén» y luego se apagan desde fuera (suelta). Es una secuencia encadenada de «después de la anterior». Toca la cuenta atrás para respirar un minuto con el público.' };
        })(),
        { layout: 'titleOnly', title: 'Tres pantallas, una noche tranquila', bg: BG, back: [glow(340, 160, 600, '#1d3a78', BG, 50)], extra: [
          ...[[mareaHome(), 'Inicio: respirar'], [mareaSounds(), 'Sonidos para dormir'], [mareaDiary(), 'Diario de sueño']].flatMap(([src, cap], i) => [
            withAnims(phone(src, 150 + i * 380, 170, 200, cap), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 500 })),
            withAnims(text(cap, 90 + i * 380, 590, 320, 40, { fontSize: 24, color: CREAM, textAlign: 'center', fontStyle: 'italic' }), A('fade-in', { start: 'withPrev', duration: 500 }))])],
          notes: 'Las tres pantallas principales dentro de móviles (Imagen ▸ Dispositivo ▸ Móvil). Todas son dibujos SVG hechos a medida: no hay capturas reales.' },
        { layout: 'titleOnly', title: 'Ocho semanas después', bg: BG, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 470, chartType: 'line', color: SKY, grid: true, seriesName: 'Con Marea', yTitle: 'Minutos hasta dormirse',
            data: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((l, i) => ({ label: l, value: [46, 41, 35, 30, 26, 24, 22, 21][i] })),
            series: [{ name: 'Grupo sin app', values: [47, 46, 46, 45, 46, 44, 45, 45], color: '#f0a6b8' }] }),
          withAnims(card(`<div style="font-family:${head};font-size:84px;font-style:italic;color:${SKY};line-height:1">−55 %</div><div style="margin-top:12px">de tiempo hasta quedarse dormido, de media, tras ocho semanas de uso diario.</div>`,
            890, 230, 310, 330, '#13204a', { fontSize: 24, color: CREAM, radius: 24 }), A('fade-left', { duration: 700 }))],
          notes: 'Gráfico de líneas con dos series: el grupo que usó la app frente al que no. Estudio piloto inventado para la plantilla.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'rating', display: 'numbers', fontSize: 40, question: '¿Cómo has dormido esta semana? (1 = fatal, 5 = de maravilla)', options: [], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Valoración en directo desde el móvil. Sirve para abrir la conversación: ¿quién duerme bien y qué hace distinto?' },
        { layout: 'blank', bg: BG, transition: 'fade', transitionSpeed: 'slow', back: sky(), extra: [
          glow(780, 120, 520, '#f2c26b', '#101d44', 28),
          m3d('kh-Lantern', 820, 110, 340, 470, { autoRotate: false, view: 'three', motion: 'float', edge: 'fade' }),
          text('Buenas noches', 90, 180, 740, 140, { fontFamily: head, fontSize: 96, fontStyle: 'italic', color: CREAM }),
          text('Prueba Marea gratis durante 14 días', 96, 340, 640, 50, { fontSize: 32, color: SKY }),
          text('marea.example · iOS y Android', 96, 410, 640, 40, { fontSize: 24, color: DIM, letterSpacing: 2 }),
          sea(600, 120)],
          notes: 'Cierre con un farol 3D que flota (Modelo 3D ▸ Vista ▸ Al entrar ▸ Flotar), como una luz que se queda encendida. Despídete despacio.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 · Vocablo, a language app: postcards, airmail stripes, stamps, speech bubbles that pop, the forgetting curve, a matching activity.
  prod_app_language: { name: 'Vocablo: app para aprender idiomas', cat: 'product',
    summary: 'Postal de correo aéreo: sellos, bocadillos que saltan con sonido, tarjetas que giran, Transformar, ecuación del olvido, gráfico y emparejar',
    make: () => {
      const PAPER = '#f4ecdc', INK = '#2e2a24', RED = '#c8402f', BLUE = '#264b8c', GREEN = '#3e7a5a', MUTE = '#8a8070', head = pairStacks('editorial').heading, PH = uid(), STAMP = uid();
      const chat = (x, y, w, props = {}) => keep(phone(vocabloChat(), x, y, w, 'Lección de italiano en Vocablo: una conversación en un café', props), PH);
      const stamp = (x, y, s, rot) => keep(shape('seal', x, y, s, s, '#fbf6ea', { stroke: RED, strokeWidth: 3, rotation: rot, html: `<b style="font-size:${Math.round(s * 0.2)}px">5 MIN</b><br>AL DÍA`, fontSize: Math.round(s * 0.11), color: RED }), STAMP);
      const frame = () => [...airmail(0), ...airmail(704)];
      return numbered(build({ name: 'Vocablo · idiomas', palette: 'paper', fonts: 'editorial', title: { color: INK, size: 48 }, body: { color: INK }, decor: frame }, [
        { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
          shape('rect', 680, 70, 1, 580, '#d8cdb6'),
          text('Postal desde cualquier idioma', 90, 120, 560, 40, { fontSize: 22, color: MUTE, fontStyle: 'italic' }),
          text('Vocablo', 84, 160, 600, 160, { fontFamily: head, fontSize: 120, fontWeight: 700, color: INK }),
          text('Cinco minutos al día para hablar otro idioma de verdad, no solo para aprobarlo.', 90, 330, 540, 120, { fontSize: 30, color: INK, lineHeight: 1.35 }),
          text('CORREO AÉREO · PAR AVION · VIA AEREA · ', 90, 470, 170, 170, { fontSize: 13, curve: 100, color: BLUE, letterSpacing: 2, textAlign: 'center' }),
          shape('ellipse', 120, 500, 110, 110, 'none', { stroke: BLUE, strokeWidth: 2 }),
          text('<b>MADRID</b><br>2026', 120, 530, 110, 60, { fontSize: 16, color: BLUE, textAlign: 'center' }),
          ...[0, 1, 2].map(i => ({ ...base(250, 518 + i * 26, 260, 20), type: 'ink', color: BLUE, width: 3, vw: 260, vh: 20,
            points: Array.from({ length: 27 }, (_, k) => [k * 10, 10 + 8 * Math.sin(k * 0.8)]) })),
          stamp(1050, 80, 150, 8), chat(770, 150, 240, { rotation: 4 })],
          notes: 'Portada en forma de postal: franjas de correo aéreo en el patrón (todas las diapositivas), un matasellos con texto curvo y un sello hecho con la forma «Sello». La app se ve dentro de un móvil algo inclinado.' },
        { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
          text('¿Hola? ¿Ciao? ¿Bonjour?', 90, 70, 1100, 80, { fontFamily: head, fontSize: 52, fontWeight: 700, color: INK, textAlign: 'center' }),
          text('Ocho idiomas, y en todos se empieza igual: saludando.', 90, 150, 1100, 40, { fontSize: 24, color: MUTE, textAlign: 'center' }),
          ...[['Ciao!', 120, 240, RED, -6], ['Bonjour !', 420, 220, BLUE, 4], ['Olá!', 760, 250, GREEN, -3], ['Hallo!', 990, 230, '#b5651d', 6],
            ['Hello!', 200, 440, BLUE, 5], ['Merhaba!', 470, 450, '#8b3a62', -4], ['Hej!', 790, 440, RED, 3], ['Kaixo!', 1010, 450, GREEN, -6]].map(([s, x, y, c, r], i) =>
            withAnims(shape(i % 2 ? 'speechround' : 'speech', x, y, 190, 140, c, { rotation: r, html: `<b>${s}</b>`, fontSize: 30, color: '#ffffff' }),
              A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 300, sound: 'pop' })))],
          notes: 'Un solo clic y los ocho bocadillos saltan uno tras otro con un «pop» (Panel de animación ▸ Sonido). Pregunta al público cuántos saludos reconoce.' },
        { layout: 'blank', bg: PAPER, autoAnimate: true, extra: [
          chat(100, 80, 270), stamp(400, 60, 90, -6),
          text('Aprender hablando', 520, 80, 680, 70, { fontFamily: head, fontSize: 46, fontWeight: 700, color: INK }),
          dg('steps', 'Escucha\n  Un diálogo de 40 segundos\nRepite\n  La app corrige tu pronunciación\nResponde\n  Conversa con un personaje\nRepasa\n  Vuelve justo antes de olvidarlo', 520, 170, 680, 460, { oneByOne: true, colors: 'colorful' })],
          notes: 'Transformar: el móvil y el sello llegan desde la portada. Los cuatro pasos del método aparecen uno a uno al presentar (Diagrama ▸ Uno a uno).' },
        { layout: 'blank', bg: PAPER, transition: 'slide', extra: [
          text('Palabras que se quedan', 90, 70, 1100, 70, { fontFamily: head, fontSize: 48, fontWeight: 700, color: INK }),
          text('Cada tarjeta gira con un clic: delante, la palabra; detrás, cómo se usa.', 90, 140, 1100, 40, { fontSize: 24, color: MUTE }),
          ...[['la finestra', 'la ventana', 'Apri la finestra, per favore.', RED], ['le rendez-vous', 'la cita', 'J\'ai un rendez-vous à midi.', BLUE], ['a saudade', 'la nostalgia', 'Que saudade de você!', GREEN], ['der Feierabend', 'el fin de la jornada', 'Endlich Feierabend!', '#b5651d']].map(([w, t, ex, c], i) =>
            withAnims(card(`<div style="font-family:${head};font-size:30px;font-weight:700;color:${c}">${w}</div><div style="margin:8px 0 18px;color:${INK}">${t}</div><div style="font-style:italic;color:${MUTE};font-size:21px">«${ex}»</div>`,
              90 + i * 280, 220, 260, 300, '#fffaf0', { fontSize: 22, borderColor: c, radius: 6, rotation: [-2, 1.5, -1, 2][i], shadow: { x: 0, y: 6, blur: 14, color: '#00000022' } }),
              A('flip', { start: 'click', duration: 700, sound: 'whoosh' }))),
          text('Italiano · Francés · Portugués · Alemán', 90, 610, 1100, 40, { fontSize: 22, color: BLUE, textAlign: 'center', letterSpacing: 3 })],
          notes: 'Cuatro fichas que entran con el efecto «Voltear» y un silbido, una por clic. Lee la frase de ejemplo en voz alta antes de pasar a la siguiente.' },
        { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
          text('Repasar justo a tiempo', 90, 70, 1100, 70, { fontFamily: head, fontSize: 48, fontWeight: 700, color: INK }),
          text('La curva del olvido: lo que recuerdas cae con el tiempo, y cada repaso la hace más lenta.', 90, 140, 640, 80, { fontSize: 23, color: MUTE, lineHeight: 1.35 }),
          mathBlock({ x: 90, y: 250, w: 520, h: 120, fontSize: 52, color: INK, latex: 'R = e^{-t/S}' }),
          text('<b>R</b>: lo que recuerdas · <b>t</b>: días desde el repaso · <b>S</b>: fuerza del recuerdo, que crece con cada repaso.', 90, 390, 520, 110, { fontSize: 21, color: INK, lineHeight: 1.4 }),
          card('Vocablo calcula <b>S</b> para cada palabra y te la vuelve a preguntar cuando <b>R</b> baja del 80 %.', 90, 520, 520, 120, '#ebe1cc', { fontSize: 21, color: INK, radius: 6 }),
          chartBlock({ x: 660, y: 220, w: 540, h: 430, chartType: 'line', color: RED, grid: true, seriesName: 'Sin repasar', yTitle: '% recordado',
            data: ['Día 0', '1', '3', '7', '14', '30'].map((l, i) => ({ label: l, value: [100, 58, 44, 33, 26, 21][i] })),
            series: [{ name: 'Con repasos de Vocablo', values: [100, 92, 90, 88, 87, 86], color: GREEN }] })],
          notes: 'La ecuación del olvido (Insertar ▸ Ecuación) y su efecto en un gráfico de dos series. Los porcentajes son ilustrativos, no de un experimento real.' },
        { layout: 'blank', bg: PAPER, transition: 'convex', extra: [
          text('Un año con Vocablo', 90, 70, 1100, 70, { fontFamily: head, fontSize: 48, fontWeight: 700, color: INK }),
          ...chain([['2,1 M', 'personas practican cada mes', RED], ['23 días', 'de racha media entre quienes siguen', BLUE], ['8', 'idiomas, con voces nativas', GREEN]].map(([n, l, c], i) =>
            card(`<div style="font-family:${head};font-size:66px;font-weight:700;color:${c};line-height:1.1">${n}</div><div style="margin-top:10px">${l}</div>`, 90 + i * 375, 170, 345, 220, '#fffaf0',
              { fontSize: 24, color: INK, radius: 4, borderColor: '#d8cdb6', textAlign: 'center', vAlign: 'middle' })), 'fade-up', 'click', { duration: 500 }),
          chartBlock({ x: 90, y: 410, w: 1100, h: 270, chartType: 'hbar', color: BLUE, dataLabels: true,
            data: [{ label: 'Inglés', value: 38 }, { label: 'Italiano', value: 21 }, { label: 'Francés', value: 17 }, { label: 'Alemán', value: 12 }] })],
          notes: 'Tres cifras en tarjetas que entran en cadena y, debajo, el reparto por idioma en barras horizontales (en %). Datos inventados.' },
        { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'match', fontSize: 32, question: 'Une cada palabra con su traducción', x: 80, y: 50, w: 1120, h: 610,
          options: ['la finestra = la ventana', 'le rendez-vous = la cita', 'a saudade = la nostalgia', 'der Feierabend = el fin de la jornada', 'the bargain = la ganga'] })],
          notes: 'Actividad de emparejar desde el móvil, con las palabras que acaban de ver en las fichas. La corrección es automática.' },
        { layout: 'blank', bg: PAPER, transition: 'zoom', extra: [
          text('Arrivederci · Au revoir · Até logo · ', 820, 140, 320, 320, { fontSize: 20, curve: 100, color: RED, letterSpacing: 2, textAlign: 'center' }),
          shape('seal', 880, 200, 200, 200, '#fbf6ea', { stroke: BLUE, strokeWidth: 3, rotation: -8, html: '<b>14 DÍAS</b><br>GRATIS', fontSize: 26, color: BLUE }),
          text('¡Hasta pronto!', 90, 230, 700, 120, { fontFamily: head, fontSize: 88, fontWeight: 700, color: INK }),
          text('Descarga Vocablo y elige tu primer idioma.', 96, 370, 640, 50, { fontSize: 30, color: INK }),
          text('vocablo.example', 96, 450, 640, 50, { fontSize: 28, color: RED, letterSpacing: 2 })],
          notes: 'Cierre con un sello rodeado de despedidas en texto curvo. Invita a probar la app y a escribir su primera frase hoy.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 · Andén, a city transit app: station signs, a departures board, the metro map drawn line by line, fares with formulas.
  prod_app_transit: { name: 'Andén: transporte urbano', cat: 'product',
    summary: 'Señalética de metro: panel de salidas con cuenta atrás, plano que se dibuja solo, viaje animado, móvil, barras apiladas y tarifas',
    make: () => {
      const W = '#ffffff', K = '#111111', G = '#6b6b6b', AMB = '#ffb000', head = pairStacks('bold').heading, MONO = "'JetBrains Mono', monospace";
      const sign = (str, x, y, w, h, size = 64) => [shape('rect', x, y, w, h, K, { radius: 6 }), text(str, x + 30, y, w - 60, h, { fontFamily: head, fontSize: size, color: W, vAlign: 'middle', letterSpacing: 2 })];
      // The metro map: four lines as freehand strokes that draw themselves, stations on top.
      const route = { L1: [[0, 300], [260, 300], [420, 210], [700, 210], [1000, 210]], L2: [[120, 40], [260, 160], [420, 210], [520, 330], [640, 450]],
        L3: [[420, 210], [560, 120], [800, 120], [900, 40]], L4: [[640, 450], [820, 380], [1000, 380]] };
      const OX = 140, OY = 170;
      const lineInk = (n, i) => { const pts = route[n], xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1;
        return { ...base(OX + x0, OY + y0, w, h), type: 'ink', points: pts.map(([x, y]) => [x - x0, y - y0]), vw: w, vh: h, color: LINES[n], width: 14, animation: A('draw', { duration: 900, start: i ? 'afterPrev' : 'click' }) }; };
      // (each station: where it is, its name, and where the name goes from it)
      const stations = [[[260, 300], 'Plaza del Reloj', -90, 22], [[420, 210], 'Ópera', -150, -62], [[700, 210], 'Museo', -40, 22], [[520, 330], 'Mercado', 24, -12],
        [[640, 450], 'Hospital Sur', -230, -8], [[800, 120], 'Universidad', -70, -56], [[120, 40], 'Estación Norte', 26, -36]];
      return numbered(build({ name: 'Andén · movilidad', palette: 'grayscale', fonts: 'bold', title: { color: K, size: 60, bold: false }, body: { color: K },
        decor: () => [shape('rect', 0, 700, 1280, 20, K), ...Object.values(LINES).map((c, i) => shape('rect', 40 + i * 70, 706, 56, 8, c, { radius: 4 }))] }, [
        { layout: 'blank', bg: W, transition: 'wipe', extra: [
          ...sign('ANDÉN', 0, 70, 760, 170, 150),
          text('Toda la ciudad en un solo billete', 90, 280, 700, 60, { fontSize: 38, color: K, fontWeight: 700 }),
          text('Metro, autobús y bici pública en una app: planifica, paga y sube.', 90, 345, 640, 90, { fontSize: 26, color: G, lineHeight: 1.35 }),
          ...['L1', 'L2', 'L3', 'L4'].map((n, i) => roundel(n, 92 + i * 92, 470, 72)),
          text('Presentación al Consorcio de Transportes · octubre 2026', 90, 590, 700, 36, { fontSize: 20, color: G }),
          phone(andenRoute(), 880, 70, 280, 'La app Andén con un trayecto en metro y trasbordo')],
          notes: 'Portada con estética de señalética de metro: un panel negro con letra condensada y los círculos de colores de las líneas (formas con texto dentro).' },
        { layout: 'blank', bg: '#1a1a1a', transition: 'fade', extra: [
          text('PRÓXIMOS TRENES · ÓPERA', 90, 60, 1100, 50, { fontFamily: head, fontSize: 40, color: W, letterSpacing: 3 }),
          shape('rect', 90, 130, 760, 470, '#050505', { radius: 10, stroke: '#333333', strokeWidth: 3 }),
          ...[['L2', 'Mercado · Hospital Sur', '2 min'], ['L1', 'Museo · Puerta Este', '4 min'], ['L3', 'Universidad', '5 min'], ['L2', 'Estación Norte', '7 min']].flatMap(([l, d, m], i) => [
            roundel(l, 120, 160 + i * 108, 64),
            withAnims(text(d.toUpperCase(), 210, 160 + i * 108, 470, 64, { fontFamily: MONO, fontSize: 28, color: AMB, vAlign: 'middle', letterSpacing: 1 }), A('fade-in', { start: i ? 'afterPrev' : 'withPrev', duration: 300, delay: 150 })),
            withAnims(text(m, 690, 160 + i * 108, 140, 64, { fontFamily: MONO, fontSize: 32, color: AMB, vAlign: 'middle', textAlign: 'right', fontWeight: 700 }), A('fade-in', { start: 'withPrev', duration: 300 }))]),
          text('El tuyo sale en', 900, 150, 300, 40, { fontSize: 24, color: '#bbbbbb', textAlign: 'center' }),
          timer(120, 900, 200, 300, { style: 'digital', h: 140, color: AMB, endText: '¡Al andén!' }),
          text('La app avisa cuando toca salir de casa: ni carreras ni esperas en el andén.', 900, 380, 300, 180, { fontSize: 24, color: W, lineHeight: 1.35 })],
          notes: 'El panel de salidas se enciende solo al llegar (efectos encadenados «después de la anterior»). La cuenta atrás digital es real: tócala para ponerla en marcha.' },
        { layout: 'blank', bg: W, transition: 'fade', extra: [
          text('Planifica el viaje', 90, 40, 700, 80, { fontFamily: head, fontSize: 60, color: K }),
          ...['L1', 'L2', 'L3', 'L4'].map(lineInk),
          ...stations.flatMap(([[x, y], name, dx, dy]) => [shape('ellipse', OX + x - 14, OY + y - 14, 28, 28, W, { stroke: K, strokeWidth: 5 }),
            text(name, OX + x + dx, OY + y + dy, 200, 34, { fontSize: 19, color: K, fontWeight: 700, textAlign: dx < -100 ? 'right' : 'left' })]),
          withAnims(shape('ellipse', OX + 260 - 20, OY + 300 - 20, 40, 40, AMB, { stroke: K, strokeWidth: 4 }),
            path([[160, -90], [260, 30], [380, 150]], { duration: 3000, start: 'click', sound: 'whoosh' })),
          card('<b>Plaza del Reloj → Hospital Sur</b><br>L1 hasta Ópera, trasbordo de 3 min y L2.<br><b style="color:#0072bc">24 min · 1 billete</b>', 880, 520, 330, 150, '#f2f2f2', { fontSize: 20, color: K, radius: 6 })],
          notes: 'Las cuatro líneas se dibujan solas, una tras otra, con un clic (trazos con el efecto «Dibujar»). El siguiente clic lleva el punto amarillo por el trayecto con un silbido.' },
        { layout: 'blank', bg: '#f2f2f2', transition: 'push', extra: [
          phone(andenRoute(), 110, 60, 300, 'El trayecto paso a paso en Andén'),
          ...sign('LO QUE HACE ANDÉN', 480, 70, 700, 90, 48),
          ...chain([['Un trayecto, un pago', 'Pagas con el móvil al entrar y la app aplica la tarifa más barata del día.'],
            ['Tiempo real de verdad', 'Posición de cada tren y autobús, actualizada cada 10 segundos.'],
            ['Accesible paso a paso', 'Rutas sin escaleras, ascensores en servicio y aviso de vagón con hueco.']].map(([h, d], i) =>
            text(`<b style="font-size:30px">${h}</b><br><span style="color:${G}">${d}</span>`, 480, 200 + i * 145, 700, 125, { fontSize: 23, color: K, borderColor: Object.values(LINES)[i], pad: [14, 20, 14, 26] })), 'fade-left', 'click', { duration: 450 })],
          notes: 'El trayecto del ejemplo en el móvil y tres funciones que entran en cadena con un clic, cada una con el color de una línea.' },
        { layout: 'titleOnly', title: 'Más viajes, menos coche', bg: W, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 480, chartType: 'stacked', color: LINES.L2, grid: true, seriesName: 'Metro', yTitle: 'Viajes al mes (miles)',
            data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((l, i) => ({ label: l, value: [310, 325, 360, 372, 390, 405][i] })),
            series: [{ name: 'Autobús', values: [180, 186, 198, 205, 214, 220], color: LINES.L1 }, { name: 'Bici pública', values: [40, 44, 61, 78, 96, 110], color: LINES.L4 }] }),
          card(`<div style="font-family:${head};font-size:90px;line-height:1;color:${LINES.L4}">+175 %</div>viajes en bici pública en seis meses desde que se paga con la misma app`, 890, 230, 320, 330, '#f2f2f2', { fontSize: 24, color: K, radius: 6 })],
          notes: 'Barras apiladas con tres series: metro, autobús y bici. Datos del piloto inventados para la plantilla.' },
        { layout: 'titleOnly', title: '¿Abono o billetes sueltos?', bg: W, extra: [
          tableBlock({ x: 90, y: 170, w: 760, h: 400, fontSize: 26, header: true, headBg: K, headFg: W, stroke: '#d0d0d0', banded: true, band: '#7f7f7f',
            rows: [['Perfil', 'Viajes al mes', 'Precio por viaje', 'Total'], ['Ocasional', '12', '1,50 €', '=B2*C2'], ['Estudiante', '40', '0,50 €', '=B3*C3'], ['Diario', '44', '1,10 €', '=B4*C4'], ['Abono plano', '—', '—', '40,00 €']], colW: [3, 2, 2, 2] }),
          card('<b>Tope automático</b><br>Si en un mes pagas más que el abono, Andén te cobra el abono y te devuelve la diferencia.', 890, 200, 320, 260, LINES.L3, { fontSize: 24, color: K, radius: 6 }),
          text('La columna «Total» se calcula sola (=B2*C2): cambia los viajes y se actualiza. Precios de ejemplo.', 90, 600, 1100, 40, { fontSize: 20, color: G })],
          notes: 'Tabla con fórmulas: el total de cada perfil es viajes × precio. Pregunta al público en qué fila se ven y si les compensaría el abono.' },
        { layout: 'blank', bg: W, extra: [pollBlock({ kind: 'choice', display: 'pie', fontSize: 34, question: '¿Cómo llegas al trabajo o a clase?', options: ['Metro', 'Autobús', 'Bici o patinete', 'Andando', 'Coche'], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Votación en directo con el resultado en tarta. Compara el resultado con el gráfico anterior.' },
        { layout: 'blank', bg: W, transition: 'wipe', extra: [
          shape('rect', 0, 220, 1280, 240, LINES.L4),
          withAnims(shape('rightarrow', 980, 270, 200, 140, W), A('fade-right', { duration: 600 })),
          text('SALIDA', 90, 220, 700, 240, { fontFamily: head, fontSize: 190, color: W, vAlign: 'middle', letterSpacing: 6 }),
          text('Piloto en tres líneas desde enero · anden.example', 90, 500, 1100, 50, { fontSize: 30, color: K }),
          text('Gracias. ¿Preguntas?', 90, 560, 1100, 50, { fontSize: 26, color: G })],
          notes: 'Cierre con el cartel verde de salida, como en las estaciones. La flecha entra con un clic.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 · Sobras, cooking with what's in the fridge: the fridge door with post-its and magnets, an avocado in 3D that Transform takes to the phone.
  prod_app_recipes: { name: 'Sobras: recetas con lo que hay', cat: 'product',
    summary: 'Nevera con pósits: aguacate 3D con Transformar, móvil que reconoce ingredientes, pasos, dona, receta con fórmulas y cuenta atrás',
    make: () => {
      const DOOR = '#eef3f1', INK = '#24312b', GREEN = '#2e7d32', MUTE = '#6d7a72', Y = '#ffe066', PINK = '#ff9fb2', MINT = '#b8e994', SKYB = '#9ad0f5', head = pairStacks('friendly').heading, AVO = uid(), PH = uid();
      const door = () => [shape('rect', 0, 0, 1280, 720, '#f4f8f6', { fill2: '#dce6e2', gradAngle: 135 }), shape('rounded', 1222, 160, 24, 400, '#c5d0cc', { radius: 12, shadow: { x: -3, y: 4, blur: 10, color: '#00000030' } })];
      const avo = (x, y, w, h, props) => keep(m3d('kh-Avocado', x, y, w, h, props), AVO);
      return numbered(build({ name: 'Sobras · cocina de aprovechamiento', palette: 'forest', fonts: 'friendly', title: { color: INK, size: 48 }, body: { color: INK } }, [
        { layout: 'blank', bg: DOOR, transition: 'fade', back: door(), extra: [
          text('Sobras', 90, 140, 640, 200, { fontFamily: head, fontSize: 150, fontWeight: 800, color: INK, letterSpacing: -3 }),
          text('La app que cocina con lo que ya tienes en la nevera', 96, 350, 560, 100, { fontSize: 34, color: INK, lineHeight: 1.25 }),
          text('Menos comida a la basura, más cenas resueltas en 20 minutos.', 96, 470, 520, 70, { fontSize: 24, color: MUTE }),
          ...chain([postit('Medio<br>calabacín', 760, 90, 190, 150, Y, -5), postit('3 huevos', 980, 70, 180, 120, PINK, 4), postit('Arroz<br>de ayer', 1000, 470, 180, 150, MINT, 6), postit('¿Y el queso?', 740, 520, 200, 110, SKYB, -3)],
            'zoom-in', 'afterPrev', { duration: 350, sound: 'pop' }),
          magnet(838, 80, '#e63946'), magnet(1052, 60, '#f28c28'), magnet(1072, 458, '#1d3557'), magnet(822, 508, '#e63946'),
          avo(790, 220, 360, 300, { autoRotate: true, spin: 20, view: 'three' })],
          notes: 'Portada en forma de puerta de nevera: pósits con la letra manuscrita Caveat que se pegan solos uno tras otro con un «pop», imanes con degradado y un aguacate 3D que gira.' },
        { layout: 'blank', bg: DOOR, autoAnimate: true, back: door(), extra: [
          keep(phone(sobrasScan(), 110, 60, 300, 'La cámara de Sobras reconoce los ingredientes de la nevera'), PH),
          avo(420, 70, 200, 180, { autoRotate: false, view: 'front', arrive: 'turn' }),
          postit('¡Aguacate maduro! Úsalo hoy.', 440, 250, 200, 110, Y, -4, { fontSize: 28 }),
          text('Una foto y listo', 680, 70, 500, 80, { fontFamily: head, fontSize: 52, fontWeight: 800, color: INK }),
          ...[['Foto', 'Abres la nevera y disparas', '#7fa650'], ['Reconoce', 'Ingredientes y fechas de consumo', '#f2c14e'], ['Propone', 'Tres recetas a tu medida', '#f28c28'], ['Cocina', 'Paso a paso, con temporizador', '#d9534f']].flatMap(([h, d, c], i) => [
            withAnims(shape('ellipse', 680, 190 + i * 115, 76, 76, c, { html: `<b>${i + 1}</b>`, fontSize: 34, color: '#ffffff' }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 350, sound: 'click' })),
            withAnims(text(`<b style="font-size:30px">${h}</b><br><span style="color:${MUTE}">${d}</span>`, 780, 182 + i * 115, 420, 96, { fontSize: 22, color: INK }), A('fade-left', { start: 'withPrev', duration: 400 }))])],
          notes: 'Transformar: el aguacate viene de la portada girando hasta quedar de frente, y el móvil muestra la cámara que reconoce lo que hay. Los cuatro pasos entran en cadena con un clic, cada uno con un pequeño sonido.' },
        { layout: 'blank', bg: '#fbfaf5', transition: 'slide', extra: [
          postit('Lo que acaba en la basura', 90, 60, 520, 90, Y, -2, { fontSize: 44 }),
          withAnims(text(`<div style="font-family:${head};font-size:170px;font-weight:800;color:${GREEN};line-height:1">31 kg</div><div style="font-size:30px;margin-top:10px">de comida tira cada persona al año en casa</div>`,
            90, 200, 560, 330, { color: INK }), A('zoom-in', { duration: 700, sound: 'drumroll' })),
          text('Cifras de ejemplo para la plantilla.', 90, 620, 560, 36, { fontSize: 18, color: MUTE }),
          chartBlock({ x: 640, y: 130, w: 600, h: 540, chartType: 'doughnut',
            data: [{ label: 'Fruta y verdura', value: 38, color: '#7fa650' }, { label: 'Sobras cocinadas', value: 21, color: '#f28c28' }, { label: 'Pan', value: 17, color: '#d9a35b' }, { label: 'Lácteos', value: 12, color: '#9ad0f5' }, { label: 'Otros', value: 12, color: '#c3c9c6' }] })],
          notes: 'La cifra gigante entra con un redoble. La dona tiene un color propio en cada porción y la leyenda con porcentajes sale sola.' },
        { layout: 'blank', bg: '#fbfaf5', transition: 'fade', extra: [
          shape('rect', 60, 50, 760, 620, '#ffffff', { shadow: { x: 0, y: 10, blur: 30, color: '#0000001f' } }),
          shape('rect', 60, 50, 760, 14, '#f28c28'),
          text('Tortilla de lo que hay', 100, 85, 680, 70, { fontFamily: head, fontSize: 44, fontWeight: 800, color: INK }),
          text('Receta propuesta por Sobras · 20 minutos · fácil', 100, 150, 680, 36, { fontSize: 22, color: MUTE }),
          tableBlock({ x: 100, y: 205, w: 680, h: 360, fontSize: 24, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#e3e9e5', banded: true, band: '#7fa650',
            rows: [['Ingrediente', 'Para 2', 'Para 4'], ['Huevos', '3', '=B2*2'], ['Calabacín', '150 g', '=B3*2'], ['Queso rallado', '40 g', '=B4*2'], ['Espinacas', '60 g', '=B5*2'], ['Aceite de oliva', '15 ml', '=B6*2']], colW: [3, 2, 2] }),
          text('La columna «Para 4» se calcula sola (=B2*2).', 100, 590, 680, 36, { fontSize: 20, color: MUTE }),
          postit('¡Al fuego!', 900, 90, 260, 90, PINK, 3, { fontSize: 44, textAlign: 'center' }),
          timer(1200, 900, 230, 280, { color: '#f28c28', auto: false, endText: '¡A la mesa!' }),
          text('Toca el reloj: 20 minutos de cocina', 880, 540, 320, 70, { fontSize: 22, color: INK, textAlign: 'center' })],
          notes: 'Ficha de receta con una tabla de ingredientes que escala con fórmulas (=B2*2) y una cuenta atrás de 20 minutos que se pone en marcha al tocarla.' },
        { layout: 'blank', bg: DOOR, transition: 'push', back: door(), extra: [
          text('Así se ve en el móvil', 90, 60, 700, 70, { fontFamily: head, fontSize: 48, fontWeight: 800, color: INK }),
          phone(sobrasRecipes(), 420, 150, 250, 'Recetas para hoy en Sobras'),
          withAnims(postit('Solo recetas con lo que <u>sí</u> tienes', 100, 200, 260, 140, Y, -4), A('fade-right', { duration: 450 })),
          withAnims(shape('arrow', 360, 270, 70, 10, 'none', { stroke: INK, strokeWidth: 3 }), A('fade-in', { start: 'withPrev' })),
          withAnims(postit('Lo que caduca antes, primero', 100, 420, 260, 140, MINT, 3), A('fade-right', { start: 'click', duration: 450 })),
          withAnims(shape('arrow', 360, 490, 70, 10, 'none', { stroke: INK, strokeWidth: 3 }), A('fade-in', { start: 'withPrev' })),
          withAnims(postit('Raciones que se ajustan a tu casa', 760, 220, 280, 140, PINK, 4), A('fade-left', { start: 'click', duration: 450 })),
          withAnims(postit('Lista de la compra solo con lo que falta', 760, 430, 300, 140, SKYB, -3), A('fade-left', { start: 'click', duration: 450 }))],
          notes: 'La pantalla de recetas con pósits que explican cada detalle, uno por clic. Las flechas son formas de línea con punta.' },
        { layout: 'titleOnly', title: 'Lo que ahorra una familia', bg: '#fbfaf5', transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 760, h: 470, chartType: 'area', color: GREEN, grid: true, yTitle: '€ ahorrados (acumulado)',
            data: ['Mes 1', '2', '3', '4', '5', '6'].map((l, i) => ({ label: l, value: [24, 55, 83, 118, 151, 182][i] })) }),
          postit('<b>182 €</b> en seis meses<br>y 19 kg menos de comida tirada', 890, 230, 300, 230, Y, 3, { fontSize: 36 }),
          text('Media de 400 hogares del piloto (datos de ejemplo).', 890, 500, 300, 70, { fontSize: 18, color: MUTE })],
          notes: 'Gráfico de área con el ahorro acumulado. El pósit resume la cifra que más se recuerda; los datos son inventados.' },
        { layout: 'blank', bg: DOOR, extra: [pollBlock({ kind: 'word', fontSize: 36, question: '¿Qué es lo que más sobra en tu nevera?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Nube de palabras en directo. Con lo que salga, propón una receta en voz alta: es la demo más convincente.' },
        { layout: 'blank', bg: DOOR, transition: 'zoom', back: door(), extra: [
          postit('Hoy cocino yo', 300, 140, 680, 260, Y, -3, { fontSize: 120, textAlign: 'center', vAlign: 'middle' }),
          magnet(620, 128, '#e63946'),
          text('Descarga Sobras gratis · sobras.example', 140, 470, 1000, 60, { fontSize: 32, color: INK, textAlign: 'center', fontWeight: 700 }),
          text('Disponible en iOS y Android', 140, 530, 1000, 40, { fontSize: 24, color: MUTE, textAlign: 'center' })],
          notes: 'Cierre con un pósit gigante sujeto por un imán. Invita a probar la app esta misma noche.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5 · Cartilla, banking for older people: the old savings passbook, big type, a phone that Transform brings close, a month in formulas and a quiz.
  prod_app_bank: { name: 'Cartilla: banca para mayores', cat: 'product',
    summary: 'Libreta de ahorro de piel y oro: Text Art oro, Transformar para acercar el móvil, tabla con SUMA, cascada, sello y concurso contra el fraude',
    make: () => {
      const LEATHER = '#14352a', GREEN = '#1f4d3a', GOLD = '#c9a24a', PAPER = '#fbf8f0', INK = '#1b1b1b', MUTE = '#5d5a52', RED = '#b42318', head = pairStacks('websafe').heading, PH = uid();
      const lines = () => Array.from({ length: 16 }, (_, i) => shape('rect', 0, 96 + i * 40, 1280, 1, '#d9e6f2'));
      const ph = (x, y, w, props = {}) => keep(phone(cartillaHome(), x, y, w, 'Inicio de Cartilla: saldo y tres botones grandes', props), PH);
      return numbered(build({ name: 'Cartilla · banca sin prisas', palette: 'office', fonts: 'websafe', title: { color: GREEN, size: 50 }, body: { color: INK, size: 34 } }, [
        { layout: 'blank', bg: LEATHER, transition: 'fade', extra: [
          glow(-100, -150, 800, '#2b6a50', LEATHER, 45),
          shape('rounded', 90, 110, 560, 500, GREEN, { fill2: '#173d2e', gradAngle: 160, radius: 22, shadow: { x: 10, y: 18, blur: 40, color: '#00000066' } }),
          shape('rounded', 112, 132, 516, 456, 'none', { radius: 14, stroke: GOLD, strokeWidth: 2, dash: 'dash', opacity: 70 }),
          text('LIBRETA DIGITAL', 120, 200, 500, 36, { fontSize: 20, color: GOLD, letterSpacing: 8, textAlign: 'center' }),
          text('Cartilla', 120, 250, 500, 140, { fontFamily: head, fontSize: 104, wordart: 'gold', textAlign: 'center' }),
          shape('rect', 290, 410, 160, 2, GOLD),
          text('N.º 0001 · titular: usted', 120, 440, 500, 40, { fontSize: 20, color: '#d8c79c', textAlign: 'center', fontFamily: head, fontStyle: 'italic' }),
          text('El banco en el móvil,<br>con letra grande<br>y sin prisas.', 720, 200, 500, 240, { fontFamily: head, fontSize: 50, color: '#f5efe0', lineHeight: 1.25 }),
          text('Presentación del proyecto · Banca de Proximidad', 720, 480, 500, 70, { fontSize: 20, color: '#a9c2b5' })],
          notes: 'Portada con forma de libreta de ahorro de toda la vida: piel verde, costura con trazo discontinuo y el nombre en Text Art «Oro». Se usa la pareja de letras Georgia y Verdana, muy legibles.' },
        { layout: 'blank', bg: PAPER, transition: 'fade', back: lines(), extra: [
          shape('rect', 160, 0, 2, 720, '#e8b4b0'),
          text('Por qué Cartilla', 200, 60, 1000, 70, { fontFamily: head, fontSize: 50, color: GREEN }),
          ...chain([['1 de cada 4', 'clientes de la oficina tiene más de 70 años'], ['64 %', 'ha dejado una gestión a medias en la app actual'], ['300', 'personas mayores han diseñado Cartilla con nosotros']].map(([n, l], i) =>
            text(`<div style="font-family:${head};font-size:54px;color:${[GREEN, RED, '#1a56db'][i]};line-height:1.1">${n}</div><div style="margin-top:10px">${l}</div>`, 200 + i * 340, 210, 300, 280, { fontSize: 26, color: INK, lineHeight: 1.35 })),
            'fade-up', 'click', { duration: 600 }),
          text('Datos de ejemplo, inventados para la plantilla.', 200, 620, 900, 36, { fontSize: 18, color: MUTE })],
          notes: 'Una página de libreta: renglones azules y margen rojo hechos con rectángulos finos. Las tres cifras entran en cadena con un clic.' },
        { layout: 'blank', bg: PAPER, transition: 'push', extra: [
          text('Cuatro promesas', 90, 60, 1100, 70, { fontFamily: head, fontSize: 50, color: GREEN }),
          ...[['plus', 'Letra grande', 'Nunca menos de 18 puntos, y se puede agrandar más.'], ['square', 'Solo tres botones', 'Movimientos, enviar dinero y llamar. Nada más en la portada.'],
            ['user', 'Una persona al otro lado', 'Su gestora de siempre, con nombre y teléfono directo.'], ['clock', 'Sin prisas', 'Nada caduca mientras lee: ni la sesión ni las claves.']].flatMap(([ic, h, d], i) => {
            const x = 90 + (i % 2) * 560, y = 170 + Math.floor(i / 2) * 240;
            return [withAnims(shape('rounded', x, y, 530, 210, '#ffffff', { radius: 16, stroke: '#e4dcc8', strokeWidth: 2 }), A('zoom-in', { start: i ? 'afterPrev' : 'click', duration: 400 })),
              withAnims(shape('ellipse', x + 30, y + 30, 90, 90, GREEN), A('fade-in', { start: 'withPrev' })),
              withAnims(icon(ic, x + 52, y + 52, 46, '#ffffff'), A('fade-in', { start: 'withPrev' })),
              withAnims(text(`<b style="font-family:${head};font-size:32px;color:${GREEN}">${h}</b><br>${d}`, x + 140, y + 24, 370, 170, { fontSize: 23, color: INK, lineHeight: 1.35 }), A('fade-in', { start: 'withPrev' }))]; })],
          notes: 'Cuatro tarjetas que aparecen solas en cadena con un clic. Cada una agrupa forma, icono y texto que entran a la vez («con la anterior»).' },
        { layout: 'blank', bg: PAPER, transition: 'fade', extra: [
          ph(140, 90, 270),
          text('Lo primero que ve', 520, 120, 680, 70, { fontFamily: head, fontSize: 50, color: GREEN }),
          text('Su nombre, cuánto tiene y tres botones del tamaño de un dedo pulgar. Sin menús escondidos, sin anuncios, sin sustos.', 520, 210, 640, 180, { fontSize: 30, color: INK, lineHeight: 1.4 }),
          card('<b>Siguiente diapositiva:</b> nos acercamos al botón dorado.', 520, 450, 560, 100, '#efe6cf', { fontSize: 22, color: INK, radius: 10 })],
          notes: 'La pantalla de inicio dentro de un móvil. En la siguiente diapositiva Transformar lo amplía para ver el botón de llamada de cerca.' },
        { layout: 'blank', bg: PAPER, autoAnimate: true, extra: [
          ph(150, -30, 390),
          withAnims(shape('ellipse', 120, 490, 450, 150, 'none', { stroke: RED, strokeWidth: 6, sketch: true }), A('draw', { duration: 1200 })),
          text('Un botón para hablar con una persona', 640, 120, 560, 130, { fontFamily: head, fontSize: 44, color: GREEN, lineHeight: 1.2 }),
          withAnims(text(ul('Llama a su gestora, no a una centralita', 'Si no contesta, le devuelve la llamada en menos de 2 horas', 'También funciona en la oficina: se pide turno sin hacer cola'), 640, 290, 560, 330, { fontSize: 25, color: INK, lineHeight: 1.4 }), A('fade-left', { start: 'afterPrev' }))],
          notes: 'Transformar: el mismo móvil crece y se desplaza para enseñar el botón dorado. El círculo rojo a mano alzada se dibuja solo con un clic (efecto «Dibujar»).' },
        { layout: 'blank', bg: PAPER, transition: 'fade', back: lines(), extra: [
          shape('rect', 120, 0, 2, 720, '#e8b4b0'),
          text('Su mes, como en la libreta', 160, 40, 1000, 60, { fontFamily: head, fontSize: 46, color: GREEN }),
          tableBlock({ x: 160, y: 130, w: 520, h: 480, fontSize: 24, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#d9d2bf',
            rows: [['Concepto', 'Importe'], ['Saldo a 1 de octubre', '980,00 €'], ['Pensión', '1.240,00 €'], ['Luz y agua', '−96,40 €'], ['Supermercado', '−412,30 €'], ['Farmacia', '−38,95 €'], ['Regalo nieta', '−50,00 €'], ['<b>Saldo hoy</b>', '=SUMA(ARRIBA)']], colW: [3, 2] }),
          chartBlock({ x: 720, y: 140, w: 480, h: 470, chartType: 'waterfall', color: GREEN, dataLabels: true,
            data: [{ label: 'Inicio', value: 980 }, { label: 'Pensión', value: 1240 }, { label: 'Casa', value: -96 }, { label: 'Súper', value: -412 }, { label: 'Otros', value: -89 }] }),
          withAnims(shape('seal', 1060, 40, 150, 150, 'none', { stroke: RED, strokeWidth: 4, rotation: -14, html: '<b>AL DÍA</b>', fontSize: 26, color: RED, opacity: 85 }), A('zoom-in', { duration: 400, sound: 'click' }))],
          notes: 'Tabla con fórmula: el saldo final es =SUMA(ARRIBA) y se recalcula al cambiar cualquier importe. Al lado, la misma cuenta en cascada. El sello «Al día» cae con un clic.' },
        { layout: 'blank', bg: '#fff4f2', transition: 'fade', extra: [
          text('Lo que el banco <u>nunca</u> le pedirá', 90, 60, 1100, 70, { fontFamily: head, fontSize: 50, color: RED }),
          ...chain(['Su clave o el PIN de la tarjeta, ni por teléfono ni por mensaje', 'Que pulse un enlace para «desbloquear» la cuenta', 'Que instale otra aplicación para «protegerla»'].map((t, i) =>
            text(`<span style="font-family:${head};font-size:44px;color:${RED};font-weight:700">${i + 1}</span>&nbsp;&nbsp;${t}`, 90, 180 + i * 110, 1100, 90, { fontSize: 30, color: INK, vAlign: 'middle', borderColor: '#f1c4be', pad: [10, 24, 10, 24], radius: 10, bg: '#ffffff' })), 'fade-up', 'click', { duration: 500 }),
          text('Ante la duda: cuelgue y llame usted a su oficina.', 90, 540, 1100, 60, { fontSize: 34, color: GREEN, fontWeight: 700 })],
          notes: 'Tres reglas contra el fraude que entran en cadena. Léelas despacio; la frase final es la que deben recordar.' },
        { layout: 'blank', bg: PAPER, extra: [pollBlock({ kind: 'quiz', fontSize: 34, time: 30, question: 'Le llega un SMS: «Su cuenta está bloqueada, pulse aquí». ¿Qué hace?',
          options: ['Pulso el enlace para comprobarlo', 'Respondo con mis datos', 'Lo borro y llamo yo a mi oficina', 'Se lo reenvío a un amigo'], correct: [2], x: 80, y: 50, w: 1120, h: 620 })],
          notes: 'Concurso con respuesta correcta y 30 segundos: puntos por acertar y por rapidez. Comenta por qué las otras tres opciones son peligrosas.' },
        { layout: 'blank', bg: LEATHER, transition: 'zoom', extra: [
          glow(700, 100, 700, '#2b6a50', LEATHER, 45),
          text('Cartilla', 90, 170, 700, 150, { fontFamily: head, fontSize: 120, wordart: 'gold' }),
          text('Llega a todas las oficinas en primavera.<br>Y si tiene dudas, llámenos: <b>900 000 000</b>', 96, 340, 700, 120, { fontSize: 30, color: '#f5efe0', lineHeight: 1.45 }),
          withAnims(shape('seal', 900, 200, 260, 260, '#f5efe0', { stroke: GOLD, strokeWidth: 4, rotation: 10, html: '<b>GRACIAS</b><br>por su tiempo', fontSize: 30, color: GREEN }), A('spin', { start: 'afterPrev', duration: 900 }))],
          notes: 'Cierre en piel verde y oro, con el teléfono de atención (ficticio). El sello entra girando solo al llegar.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 · Turno, doctor's appointments: clean and clinical, a heartbeat that draws itself, before and after, a patient who walks into the waiting room.
  prod_app_health: { name: 'Turno: citas en el centro de salud', cat: 'product',
    summary: 'Clínico: latido que se dibuja, antes y después, ciclo uno a uno, paciente 3D que anda, agenda en monitor, barras y preguntas',
    make: () => {
      const BG = '#f7fbfc', TEAL = '#0f8b8d', DEEP = '#0b3c49', CORAL = '#ef6f6c', LT = '#d8f0ef', MUTE = '#5b7a83', head = pairStacks('clean').heading;
      const pulse = (x, y, w, h, color, props = {}) => { const pts = [[0, 50], [30, 50], [36, 44], [42, 50], [52, 50], [56, 60], [62, 0], [68, 100], [74, 50], [86, 50], [92, 40], [100, 50]];
        const seq2 = [...pts, ...pts.map(([px, py]) => [px + 100, py]), ...pts.map(([px, py]) => [px + 200, py])];
        return { ...base(x, y, w, h), type: 'ink', points: seq2.map(([px, py]) => [px * w / 300, py * h / 100]), vw: w, vh: h, color, width: 5, ...props }; };
      const cross = (x, y, s, c, o = 100) => shape('plus', x, y, s, s, c, { opacity: o });
      const walker = lib3d('kn-character');
      // (the Ocean palette writes in white: this deck is light, so its default text colour is the deep teal — the Q&A slide uses it)
      return numbered(Object.assign(build({ name: 'Turno · citas médicas', palette: 'ocean', fonts: 'clean', title: { color: DEEP, size: 48 }, body: { color: DEEP },
        decor: () => [shape('rect', 0, 0, 10, 720, TEAL)] }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          cross(1130, 40, 90, LT), cross(1060, 600, 60, LT), cross(60, 600, 50, LT),
          text('CENTRO DE SALUD · APP PARA PACIENTES', 90, 120, 700, 36, { fontSize: 20, color: TEAL, letterSpacing: 5 }),
          text('Turno', 84, 150, 600, 170, { fontFamily: head, fontSize: 150, fontWeight: 800, color: DEEP, letterSpacing: -4 }),
          text('Su cita médica en tres toques. Sin esperar al teléfono, sin papeles.', 90, 345, 600, 100, { fontSize: 32, color: DEEP, lineHeight: 1.3 }),
          pulse(90, 490, 600, 110, CORAL, { animation: A('draw', { start: 'afterPrev', duration: 2200 }) }),
          phone(turnoBook(), 840, 90, 270, 'Pedir cita en Turno: calendario y horas libres', { rotation: 3 })],
          notes: 'Portada clínica: un latido que se dibuja solo al llegar (trazo con el efecto «Dibujar», después de la anterior) y la pantalla de pedir cita en un móvil.' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          text('Antes y después', 90, 60, 1100, 70, { fontFamily: head, fontSize: 50, fontWeight: 800, color: DEEP }),
          shape('rounded', 90, 160, 520, 480, '#eef1f2', { radius: 20 }), shape('rounded', 670, 160, 520, 480, TEAL, { radius: 20 }),
          text('ANTES', 130, 190, 440, 40, { fontSize: 22, color: MUTE, letterSpacing: 6 }), text('CON TURNO', 710, 190, 440, 40, { fontSize: 22, color: LT, letterSpacing: 6 }),
          ...[['23 min', 'al teléfono para pedir cita'], ['1 de 8', 'citas se pierde porque nadie avisa'], ['26 min', 'de espera media en la sala']].flatMap(([n, l], i) => [
            withAnims(text(`<b style="font-size:46px;color:${MUTE}">${n}</b>&nbsp; ${l}`, 130, 250 + i * 120, 460, 100, { fontSize: 23, color: DEEP, vAlign: 'middle' }), A('fade-right', { start: i ? 'click' : 'click', duration: 450 })),
            withAnims(text(`<b style="font-size:46px;color:#ffffff">${[['40 s'], ['1 de 25'], ['7 min']][i]}</b>&nbsp; ${['desde el móvil, a cualquier hora', 'con recordatorio y anulación en un toque', 'porque llega justo a su hora'][i]}`, 710, 250 + i * 120, 460, 100, { fontSize: 23, color: '#e9fbfa', vAlign: 'middle' }), A('fade-left', { start: 'afterPrev', duration: 450 }))]),
          text('Piloto en dos centros durante seis meses (datos de ejemplo).', 90, 655, 1100, 36, { fontSize: 18, color: MUTE })],
          notes: 'Comparativa en dos columnas: cada clic muestra un problema de antes y, justo después, cómo queda con Turno.' },
        { layout: 'titleOnly', title: 'El recorrido del paciente', bg: BG, extra: [
          dg('cycle', 'Pide cita\nRecibe recordatorio\nLlega y escanea\nConsulta\nReceta en el móvil', 90, 160, 640, 520, { oneByOne: true, colors: 'accent' }),
          card('<b style="color:#0f8b8d">Si anula, nadie pierde:</b> el hueco se ofrece al momento a la lista de espera del mismo médico.', 780, 260, 410, 240, LT, { fontSize: 26, color: DEEP, radius: 18 })],
          notes: 'Diagrama de ciclo que aparece paso a paso: el recorrido vuelve a empezar con la próxima cita.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          text('Llega, escanea y se sienta', 90, 50, 1100, 70, { fontFamily: head, fontSize: 48, fontWeight: 800, color: DEEP }),
          shape('rect', 60, 610, 1160, 6, '#dbe7ea'),
          shape('rounded', 1010, 150, 190, 300, DEEP, { radius: 12 }),
          text('<div style="font-size:18px;color:#9fd3d4">TURNO</div><div style="font-size:54px;font-weight:800;color:#ffffff">A-27</div><div style="font-size:20px;color:#ffffff">Consulta 4</div>', 1020, 190, 170, 200, { textAlign: 'center' }),
          shape('rounded', 470, 380, 90, 130, '#ffffff', { radius: 10, stroke: TEAL, strokeWidth: 3 }), text('QR', 470, 420, 90, 50, { fontSize: 26, color: TEAL, textAlign: 'center', fontWeight: 800 }),
          withAnims(m3d('kn-character', 60, 330, 220, 290, { walk: { clip: walker.walk, end: walker.arrive, endOnce: true, face: true, look: true } }),
            path([[360, 0]], { duration: 2600 }), A('clip3d', { clip: walker.arrive, once: true, start: 'afterPrev', duration: 1200 }), path([[620, 0]], { duration: 2000, start: 'click' })),
          text('Un clic: el paciente llega al lector, hace el registro y salta de alegría. Otro clic: va hacia su consulta.', 90, 140, 820, 70, { fontSize: 23, color: MUTE })],
          notes: 'Personaje 3D que anda por un recorrido (Animaciones ▸ Dibujar recorrido): reproduce «andar» mientras se mueve y un salto al llegar al lector. El segundo clic lo lleva hasta la pantalla de turno.' },
        { layout: 'titleOnly', title: 'Lo que ve el centro', bg: BG, transition: 'slide', extra: [
          device(turnoAgenda(), 'monitor', 90, 160, 720, 480, 'Agenda del día en Turno para el personal del centro'),
          ...chain([['Huecos recuperados', 'Las anulaciones se ofrecen solas a la lista de espera.'], ['Llegadas en directo', 'Recepción sabe quién está en la sala sin preguntar.'], ['Sin cambiar de sistema', 'Turno se conecta a la historia clínica que ya usan.']].map(([h, d], i) =>
            text(`<b style="color:${TEAL};font-size:27px">${h}</b><br>${d}`, 860, 180 + i * 150, 340, 130, { fontSize: 21, color: DEEP, lineHeight: 1.35 })), 'fade-left', 'click', { duration: 450 })],
          notes: 'La agenda del personal dentro de un monitor (Imagen ▸ Dispositivo ▸ Monitor), y tres ventajas que entran en cadena con un clic.' },
        { layout: 'titleOnly', title: 'Citas perdidas por semana', bg: BG, extra: [
          chartBlock({ x: 90, y: 160, w: 760, h: 490, chartType: 'bar', color: '#9fb4ba', dataLabels: true, grid: true, seriesName: 'Antes',
            data: [{ label: 'Las Acacias', value: 64 }, { label: 'Río Verde', value: 51 }, { label: 'San Roque', value: 72 }, { label: 'El Pilar', value: 43 }],
            series: [{ name: 'Con Turno', values: [17, 14, 21, 11], color: TEAL }] }),
          withAnims(card(`<div style="font-size:68px;font-weight:800;color:${CORAL};line-height:1">−72 %</div><div style="margin-top:10px">citas perdidas de media en los cuatro centros del piloto</div>`, 890, 230, 300, 330, '#ffffff', { fontSize: 24, color: DEEP, borderColor: '#dbe7ea', radius: 18 }), A('zoom-in', { duration: 500, sound: 'chime' }))],
          notes: 'Barras agrupadas: antes y después en cada centro. Los nombres de los centros y las cifras son ficticios.' },
        { layout: 'titleOnly', title: 'Calendario de implantación', bg: BG, transition: 'fade', extra: [
          dg('timeline', 'Enero 2027\n  Piloto en Las Acacias\nMarzo\n  Tres centros más\nJunio\n  Toda el área de salud\nSeptiembre\n  Recetas y resultados en la app', 90, 170, 1100, 360, { oneByOne: true, colors: 'colorful' }),
          text('Formación de 30 minutos para cada equipo de recepción antes de empezar.', 90, 570, 1100, 50, { fontSize: 26, color: MUTE, textAlign: 'center' })],
          notes: 'Cronología que se descubre hito a hito. Recalca que el despliegue es gradual y se puede parar en cualquier fase.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'qa', fontSize: 34, question: 'Preguntas del equipo del centro', options: [], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Turno de preguntas: el equipo las envía desde el móvil y vota las que más le interesan; las más votadas suben.' },
        { layout: 'blank', bg: TEAL, transition: 'zoom', extra: [
          cross(1050, 80, 140, '#ffffff', 18), cross(980, 470, 90, '#ffffff', 14),
          text('Turno', 90, 170, 700, 160, { fontFamily: head, fontSize: 140, fontWeight: 800, color: '#ffffff', letterSpacing: -4 }),
          text('Menos teléfono, más consulta.', 96, 340, 800, 60, { fontSize: 40, color: '#e9fbfa' }),
          pulse(96, 440, 520, 90, '#ffffff', { animation: A('draw', { start: 'afterPrev', duration: 2000 }) }),
          text('turno.example · piloto desde enero de 2027', 96, 580, 900, 40, { fontSize: 24, color: LT })],
          notes: 'Cierre en el color de la marca, con el latido que vuelve a dibujarse solo.' },
      ]), { textColor: DEEP }));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7 · Garaje, local live music: a vinyl that Transform moves and whose label turns, an equalizer that rises, neon, a band's panel and a word cloud.
  prod_app_music: { name: 'Garaje: música en directo del barrio', cat: 'product',
    summary: 'Vinilo y neón: disco que viaja con Transformar, texto curvo que gira, ecualizador con redoble, portátil, radar, tarta y nube de palabras',
    make: () => {
      const BG = '#120a24', PINK = '#ff3d9a', CYAN = '#3df5ff', YEL = '#ffe14d', FG = '#f3eefe', DIM = '#a99cc8', head = pairStacks('tech').heading;
      const VID = [uid(), uid(), uid(), uid()], PH = uid();
      // The record: black disc with grooves, the label, the curved words on it, the hole. (Same ids on two slides: Transform moves it.)
      const vinyl = (x, y, d, turn) => [keep(shape('ellipse', x, y, d, d, '#0a0a0a', { stroke: '#2b2b2b', strokeWidth: 2, shadow: { x: 0, y: 20, blur: 50, color: '#ff3d9a40' } }), VID[0]),
        ...[0.86, 0.74, 0.62, 0.5].map(k => shape('ellipse', x + d * (1 - k) / 2, y + d * (1 - k) / 2, d * k, d * k, 'none', { stroke: '#262626', strokeWidth: 2 })),
        keep(shape('ellipse', x + d * 0.32, y + d * 0.32, d * 0.36, d * 0.36, PINK, { fill2: '#7b2ff7', gradAngle: 135 }), VID[1]),
        keep(withAnims(text('GARAJE · MÚSICA DE TU BARRIO · ', x + d * 0.335, y + d * 0.335, d * 0.33, d * 0.33, { fontSize: Math.round(d * 0.026), curve: 100, color: '#ffffff', letterSpacing: 2, textAlign: 'center', fontWeight: 700 }),
          A('spin360', { start: 'afterPrev', duration: turn })), VID[2]),
        keep(shape('ellipse', x + d * 0.485, y + d * 0.485, d * 0.03, d * 0.03, BG), VID[3])];
      return numbered(build({ name: 'Garaje · música en directo', palette: 'violet', fonts: 'tech', title: { color: FG, size: 50 }, body: { color: FG } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(560, -100, 900, '#3a1670', BG, 70)], extra: [
          ...vinyl(700, 60, 620, 4000),
          text('MÚSICA EN DIRECTO · CERCA DE TI', 90, 160, 600, 36, { fontSize: 20, color: CYAN, letterSpacing: 6 }),
          text(`<b>${neon('Garaje', PINK)}</b>`, 80, 200, 640, 190, { fontFamily: head, fontSize: 160, lineHeight: 1 }),
          text('Los grupos de tu barrio, los bares que los programan y tú, a dos calles.', 90, 410, 560, 110, { fontSize: 30, color: FG, lineHeight: 1.35 }),
          ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => shape('rounded', 90 + i * 26, 620 - [30, 60, 44, 80, 52, 70, 36, 24][i], 16, [30, 60, 44, 80, 52, 70, 36, 24][i], i % 2 ? CYAN : PINK, { radius: 6 }))],
          notes: 'Portada: un vinilo hecho con elipses (surcos con trazo) y una etiqueta con texto curvo que da una vuelta sola al llegar (efecto «Girar 360°»). El nombre es neón de color propio.' },
        { layout: 'blank', bg: BG, autoAnimate: true, extra: [
          ...vinyl(-120, 380, 420, 2400),
          keep(phone(garajeGigs(), 880, 60, 290, 'Garaje: conciertos de esta noche cerca de ti'), PH),
          text('Qué es Garaje', 90, 60, 700, 70, { fontFamily: head, fontSize: 52, fontWeight: 700, color: FG }),
          ...chain([['Agenda de tu barrio', 'Todo lo que suena hoy a menos de 2 km, con precio y hora.', PINK], ['Entradas en un toque', 'Pagas en la app y entras enseñando el móvil.', CYAN],
            ['El 85 % para el grupo', 'Sin comisiones escondidas: la entrada es de quien toca.', YEL]].map(([h, d, c], i) =>
            text(`<b style="color:${c};font-size:30px">${h}</b><br>${d}`, 330, 160 + i * 130, 520, 110, { fontSize: 23, color: FG })), 'fade-right', 'click', { duration: 450 })],
          notes: 'Transformar: el vinilo baja a la esquina (mismas formas con el mismo id) y su etiqueta vuelve a girar; el móvil muestra la agenda. Las tres ideas entran en cadena con un clic.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          text('Lo que suena esta semana', 90, 50, 1100, 70, { fontFamily: head, fontSize: 52, fontWeight: 700, color: FG }),
          text('Conciertos por estilo en la ciudad (datos de ejemplo)', 90, 120, 1100, 40, { fontSize: 22, color: DIM }),
          shape('rect', 90, 600, 1100, 3, '#3a2c5c'),
          ...[['Indie', 46], ['Rock', 38], ['Flamenco', 21], ['Electrónica', 33], ['Jazz', 17], ['Hip hop', 29], ['Folk', 12]].flatMap(([g, n], i) => { const h = n * 8.5, x = 110 + i * 155;
            return [withAnims(shape('rounded', x, 600 - h, 110, h, PINK, { fill2: CYAN, gradAngle: 180, radius: 10 }), A('fade-up', { start: i ? 'afterPrev' : 'click', duration: 350, ...(i ? {} : { sound: 'drumroll' }) })),
              withAnims(text(`<b>${n}</b>`, x, 600 - h - 50, 110, 44, { fontSize: 30, color: FG, textAlign: 'center' }), A('fade-in', { start: 'withPrev', duration: 300 })),
              text(g, x - 20, 615, 150, 40, { fontSize: 22, color: DIM, textAlign: 'center' })]; })],
          notes: 'Un ecualizador hecho con rectángulos redondeados con degradado: un clic y las barras suben una tras otra con un redoble. Es un gráfico «a mano», más expresivo que uno automático.' },
        { layout: 'titleOnly', title: 'Y para los grupos, su propio panel', bg: BG, transition: 'slide', extra: [
          device(garajeBand(), 'laptop', 90, 170, 760, 475, 'Panel de un grupo en Garaje: oyentes, barrios y conciertos'),
          ...chain([['12.480', 'oyentes al mes', PINK], ['1.906', 'entradas vendidas', CYAN], ['6 barrios', 'donde más se les escucha', YEL]].map(([n, l, c], i) =>
            text(`<div style="font-family:${head};font-size:52px;font-weight:700;color:${c};line-height:1.1">${n}</div>${l}`, 900, 190 + i * 150, 300, 130, { fontSize: 23, color: FG })), 'fade-left', 'click', { duration: 450 })],
          notes: 'El panel de un grupo dentro de un portátil (Imagen ▸ Dispositivo ▸ Portátil). Las cifras de la derecha repiten las del panel para que se lean desde el fondo.' },
        { layout: 'titleOnly', title: 'Dos barrios, dos gustos', bg: BG, extra: [
          chartBlock({ x: 90, y: 160, w: 620, h: 500, chartType: 'radar', color: PINK, seriesName: 'Barrio Centro',
            data: [{ label: 'Indie', value: 90 }, { label: 'Rock', value: 70 }, { label: 'Flamenco', value: 40 }, { label: 'Electrónica', value: 85 }, { label: 'Jazz', value: 55 }, { label: 'Hip hop', value: 60 }],
            series: [{ name: 'Barrio del Puerto', values: [50, 85, 80, 35, 40, 75], color: CYAN }] }),
          card('Con estos datos, Garaje sugiere a cada sala <b style="color:#ffe14d">qué grupo programar</b> según quién vive cerca.', 760, 260, 430, 240, '#1f1438', { fontSize: 27, color: FG, radius: 20 })],
          notes: 'Radar con dos series (dos barrios inventados): el Centro tira a indie y electrónica; el Puerto, a rock y flamenco.' },
        { layout: 'titleOnly', title: '¿A dónde va cada entrada de 8 €?', bg: BG, transition: 'convex', extra: [
          chartBlock({ x: 90, y: 160, w: 640, h: 500, chartType: 'pie',
            data: [{ label: 'El grupo', value: 85, color: PINK }, { label: 'La sala', value: 10, color: CYAN }, { label: 'Garaje', value: 5, color: YEL }] }),
          withAnims(text(`<div style="font-family:${head};font-size:120px;font-weight:700;line-height:1">${neon('6,80 €', PINK)}</div><div style="margin-top:16px">de cada entrada se lo lleva el grupo, el mismo día del concierto.</div>`,
            770, 240, 430, 330, { fontSize: 27, color: FG }), A('zoom-in', { duration: 600, sound: 'chime' }))],
          notes: 'Tarta con un color propio en cada porción y leyenda con porcentajes. Reparto de ejemplo.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'word', fontSize: 36, question: '¿Qué grupo de tu barrio debería sonar más?', options: [], x: 80, y: 60, w: 1120, h: 600 })],
          notes: 'Nube de palabras en directo: el público escribe nombres de grupos locales y los más repetidos crecen.' },
        { layout: 'blank', bg: '#1b0f33', transition: 'zoom', extra: [
          shape('rect', 300, 40, 680, 640, YEL, { rotation: -2, shadow: { x: 10, y: 16, blur: 30, color: '#00000080' } }),
          text('CONCIERTO DE LANZAMIENTO', 330, 80, 620, 40, { fontSize: 24, color: BG, letterSpacing: 6, textAlign: 'center', rotation: -2 }),
          text('GARAJE<br>EN VIVO', 330, 140, 620, 260, { fontFamily: head, fontSize: 116, fontWeight: 700, color: BG, textAlign: 'center', lineHeight: 0.95, rotation: -2 }),
          text('Los Tranvías · Marga y el Ruido · Coro Fantasma', 330, 420, 620, 50, { fontSize: 26, color: '#5a1d8a', textAlign: 'center', fontWeight: 700, rotation: -2 }),
          text('14 de noviembre · Sala La Nave · 21:30', 330, 480, 620, 50, { fontSize: 28, color: BG, textAlign: 'center', rotation: -2 }),
          withAnims(shape('burst', 880, 10, 200, 200, PINK, { html: '<b>GRATIS</b><br>con la app', fontSize: 22, color: '#ffffff', rotation: 12 }), A('bounce', { start: 'afterPrev', delay: 500, sound: 'applause' })),
          text('garaje.example', 330, 600, 620, 40, { fontSize: 22, color: BG, textAlign: 'center', letterSpacing: 3, rotation: -2 })],
          notes: 'Cierre con forma de cartel de concierto, algo torcido como pegado en una pared. La estrella «Gratis» cae sola con aplausos.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8 · Grano, film photography: the darkroom's red light, film strips, a photo that develops with Transform, a histogram and a camera to label.
  prod_app_photo: { name: 'Grano: fotografía de carrete', cat: 'product',
    summary: 'Cuarto oscuro: tira de película, foto que se revela con Transformar, contador con redoble, histograma, tableta, tabla y etiquetar',
    make: () => {
      const BG = '#1a0707', RED = '#c1121f', PAPER = '#f2ebe0', AMB = '#ffb347', DIM = '#c9a98a', head = pairStacks('modern').heading, PHOTO = uid(), TRAY = uid();
      const strip = (x, y, n, w, rot, picks) => { const fw = w / n, h = fw * 0.9;
        return [shape('rect', x, y, w, h, '#0a0a0a', { rotation: rot }),
          ...Array.from({ length: n }, (_, i) => img(scene(300, 220, FILM[picks[i] % 6]), x + i * fw + fw * 0.08, y + h * 0.17, fw * 0.84, h * 0.66, 'Fotograma de un carrete', { rotation: rot })),
          ...Array.from({ length: n * 4 }, (_, i) => shape('rounded', x + i * (w / (n * 4)) + 6, y + h * 0.04, w / (n * 4) - 12, h * 0.08, '#2a2a2a', { radius: 2, rotation: rot })),
          ...Array.from({ length: n * 4 }, (_, i) => shape('rounded', x + i * (w / (n * 4)) + 6, y + h * 0.88, w / (n * 4) - 12, h * 0.08, '#2a2a2a', { radius: 2, rotation: rot }))]; };
      const photo = (x, y, w, h, props) => keep(img(scene(600, 420, FILM[0], 220), x, y, w, h, 'Una foto de un atardecer en el lago', props), PHOTO);
      return numbered(build({ name: 'Grano · fotografía de carrete', palette: 'warm', fonts: 'modern', title: { color: PAPER, size: 46 }, body: { color: PAPER } }, [
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(700, -300, 900, RED, BG, 45)], extra: [
          ...strip(-40, 430, 6, 1360, 0, [0, 1, 2, 3, 4, 5]),
          text('FOTOGRAFÍA CON ALMA DE CARRETE', 90, 90, 900, 36, { fontSize: 20, color: AMB, letterSpacing: 8 }),
          text('GRANO', 80, 120, 900, 200, { fontFamily: head, fontSize: 180, fontWeight: 800, color: PAPER, letterSpacing: 30 }),
          text('Dispara despacio. Espera al revelado. Vuelve a mirar.', 90, 320, 900, 50, { fontSize: 32, color: DIM })],
          notes: 'Portada a la luz roja del cuarto oscuro (un brillo rojo enorme) con una tira de película hecha con formas: fotogramas SVG y perforaciones redondeadas.' },
        { layout: 'blank', bg: '#0f0505', transition: 'fade', extra: [
          shape('ellipse', 120, 110, 480, 480, '#1f1f1f', { stroke: '#555555', strokeWidth: 6 }),
          shape('donut', 150, 140, 420, 420, '#2c2c2c'),
          withAnims(text(`<span style="color:${AMB}">24</span>`, 150, 230, 420, 240, { fontFamily: head, fontSize: 210, fontWeight: 800, textAlign: 'center', vAlign: 'middle' }), A('zoom-in', { duration: 900, sound: 'drumroll' })),
          withAnims(shape('triangle', 345, 120, 30, 24, AMB, { rotation: 180 }), A('spin360', { start: 'afterPrev', duration: 900 })),
          text('fotos al día.<br>Ni una más.', 660, 150, 540, 120, { fontFamily: head, fontSize: 44, fontWeight: 700, color: PAPER }),
          text('Como un carrete: cada disparo cuenta, y no ves la foto hasta que se revela, a la mañana siguiente.', 660, 300, 520, 140, { fontSize: 27, color: DIM, lineHeight: 1.4 }),
          text('Menos fotos, mejor pensadas. Es la idea entera de Grano.', 660, 470, 520, 90, { fontSize: 27, color: AMB, lineHeight: 1.4 })],
          notes: 'La rueda del contador de una cámara de carrete, hecha con una elipse y un anillo. El número entra con redoble y la marca de encima gira sola después.' },
        { layout: 'blank', bg: BG, transition: 'fade', back: [glow(300, 120, 700, '#7a0b14', BG, 50)], extra: [
          text('En la cubeta', 90, 60, 1100, 70, { fontFamily: head, fontSize: 50, fontWeight: 800, color: PAPER }),
          keep(shape('rounded', 300, 220, 680, 420, '#2b2b2b', { radius: 18, stroke: '#3d3d3d', strokeWidth: 8 }), TRAY),
          photo(390, 280, 500, 320, { opacity: 12 }),
          text('Durante la noche, la foto «se revela» poco a poco… y el sonido del agua acompaña.', 90, 140, 1100, 40, { fontSize: 24, color: DIM })],
          notes: 'La foto está en la cubeta casi invisible (12 % de opacidad). Pasa a la siguiente diapositiva: Transformar la saca, la agranda y la vuelve opaca, como si se revelara.' },
        { layout: 'blank', bg: BG, autoAnimate: true, extra: [
          keep(shape('rounded', 300, 640, 680, 420, '#2b2b2b', { radius: 18, stroke: '#3d3d3d', strokeWidth: 8, opacity: 40 }), TRAY),
          shape('line', 0, 92, 1280, 2, 'none', { stroke: '#8a6a44', strokeWidth: 3 }),
          photo(320, 120, 640, 450, { opacity: 100, rotation: -1.5, shadow: { x: 0, y: 14, blur: 30, color: '#00000090' } }),
          shape('rounded', 420, 76, 30, 70, '#c9a26b', { radius: 6 }), shape('rounded', 830, 76, 30, 70, '#c9a26b', { radius: 6 }),
          text('Revelada: 9:00', 990, 520, 240, 50, { fontSize: 26, color: AMB, fontWeight: 700 })],
          notes: 'Transformar: la misma foto sube de la cubeta al tendedero, crece y gana opacidad. Las pinzas son rectángulos redondeados.' },
        { layout: 'titleOnly', title: 'El histograma, sin miedo', bg: BG, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 160, w: 700, h: 480, chartType: 'histogram', color: AMB, grid: true, xTitle: 'Luminosidad (0 = negro, 255 = blanco)', yTitle: 'Píxeles',
            data: scatter(400, 5, r => ({ label: '', value: Math.round(Math.min(255, Math.max(0, 120 + (r() + r() + r() - 1.5) * 120 + (r() > 0.8 ? 70 : 0)))) })) }),
          ...chain([['A la izquierda', 'sombras: si se amontonan, la foto está oscura.'], ['En el centro', 'medios tonos: aquí vive casi todo.'], ['A la derecha', 'luces: si chocan con el borde, se queman.']].map(([h, d], i) =>
            text(`<b style="color:${AMB}">${h}</b>: ${d}`, 830, 190 + i * 140, 370, 120, { fontSize: 24, color: PAPER, lineHeight: 1.35 })), 'fade-left', 'click', { duration: 450 })],
          notes: 'Histograma (Gráfico ▸ Tipo de gráfico ▸ Histograma) con la luminosidad de 400 píxeles de la foto de ejemplo. Explica las tres zonas con un clic cada una.' },
        { layout: 'titleOnly', title: 'Hoja de contactos y cuarto oscuro', bg: BG, extra: [
          withAnims(device(granoEdit(), 'tablet', 90, 170, 640, 480, 'Edición en Grano: la foto con controles de exposición, contraste y grano'), A('fade-right', { duration: 500 })),
          withAnims(phone(granoSheet(), 800, 150, 250, 'Hoja de contactos del carrete en el móvil'), A('fade-left', { start: 'afterPrev', duration: 500 })),
          text('Móvil: el carrete del día · Tableta: el revelado fino', 760, 662, 460, 30, { fontSize: 16, color: DIM })],
          notes: 'Dos dispositivos con pantallas propias. La tableta muestra una foto dentro de otra imagen SVG; las fotos sin revelar aparecen tapadas en la hoja de contactos.' },
        { layout: 'titleOnly', title: 'Seis películas para elegir', bg: BG, transition: 'fade', extra: [
          tableBlock({ x: 90, y: 160, w: 1100, h: 420, fontSize: 24, header: true, headBg: RED, headFg: '#ffffff', stroke: '#3d2020', banded: true, band: '#7a0b14',
            rows: [['Película', 'ISO', 'Carácter', 'Grano', 'Para…'], ['Brisa 400', '400', 'Cálida y suave', 'Fino', 'Retratos al atardecer'], ['Escarcha 100', '100', 'Fría y nítida', 'Muy fino', 'Paisaje de invierno'],
              ['Ceniza 1600', '1600', 'Blanco y negro duro', 'Grueso', 'Calle de noche'], ['Feria 200', '200', 'Colores saturados', 'Medio', 'Fiestas y verano'], ['Niebla 800', '800', 'Apagada y pastel', 'Medio', 'Días nublados']], colW: [3, 1, 3, 2, 3] }),
          text('Simulaciones propias, con nombres inventados.', 90, 610, 1100, 36, { fontSize: 20, color: DIM })],
          notes: 'Tabla con cabecera roja de cuarto oscuro y filas alternas. Pregunta qué película elegiría cada uno para su próximo paseo.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'label', fontSize: 30, question: 'Pon nombre a cada parte de la cámara', image: camera(), x: 80, y: 50, w: 1120, h: 620,
          options: ['Objetivo', 'Visor', 'Disparador', 'Rueda de modos', 'Botón de flash'], points: [{ x: 50, y: 62 }, { x: 42, y: 25 }, { x: 77, y: 23 }, { x: 80, y: 41 }, { x: 22, y: 25 }] })],
          notes: 'Actividad «Etiquetar una imagen»: cada persona arrastra los nombres a los puntos desde el móvil. La cámara es un dibujo SVG hecho a medida.' },
        { layout: 'blank', bg: BG, transition: 'zoom', back: [glow(-200, 200, 800, RED, BG, 40)], extra: [
          shape('rect', 700, 100, 420, 500, '#fbf8f2', { rotation: 5, shadow: { x: 10, y: 20, blur: 40, color: '#00000090' } }),
          img(scene(600, 520, FILM[4], 160), 735, 135, 350, 330, 'Foto de un atardecer violeta', { rotation: 5 }),
          text('Hasta mañana', 720, 495, 380, 70, { fontFamily: "'Caveat', cursive", fontSize: 50, color: '#3b3228', textAlign: 'center', rotation: 5 }),
          text('Dispara<br>despacio.', 90, 180, 600, 240, { fontFamily: head, fontSize: 96, fontWeight: 800, color: PAPER, lineHeight: 1.05 }),
          text('Grano llega en marzo · grano.example', 96, 450, 560, 50, { fontSize: 28, color: AMB })],
          notes: 'Cierre con una foto instantánea girada, escrita a mano con Caveat. Invita a apuntarse a la lista de espera.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 · Serie, the neighbourhood gym: an LED scoreboard, a barbarian who walks to class, two timers, occupancy, prices with division formulas, a quiz.
  prod_app_gym: { name: 'Serie: reservas en tu gimnasio', cat: 'product',
    summary: 'Marcador LED: luchador 3D que celebra y anda hasta su clase, dos cuentas atrás, ocupación por horas, tarifas con fórmulas y concurso',
    make: () => {
      const BG = '#0d0d0f', RED = '#ff2a2a', YEL = '#ffd60a', FG = '#f4f4f6', DIM = '#9a9aa5', PANEL = '#16161a', head = pairStacks('bold').heading;
      const barb = lib3d('kk-Barbarian');
      const tape = (y) => Array.from({ length: 20 }, (_, i) => shape('parallelogram', -40 + i * 70, y, 52, 14, i % 2 ? BG : YEL));
      return numbered(build({ name: 'Serie · gimnasio de barrio', palette: 'revela', fonts: 'bold', title: { color: FG, size: 64, bold: false }, body: { color: FG },
        decor: () => tape(706) }, [
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          shape('rounded', 90, 80, 640, 200, '#050505', { radius: 14, stroke: '#2a2a2e', strokeWidth: 6 }),
          ...[[106, 96], [698, 96], [106, 248], [698, 248]].map(([x, y]) => shape('ellipse', x, y, 16, 16, '#3a3a40')),
          text(led('07:00', RED), 130, 95, 560, 170, { fontFamily: LED, fontSize: 140, fontWeight: 700, textAlign: 'center', vAlign: 'middle', letterSpacing: 8 }),
          text('SERIE', 84, 300, 640, 200, { fontFamily: head, fontSize: 200, color: FG, lineHeight: 1, letterSpacing: 8 }),
          text('Reserva tu clase en el gimnasio de tu barrio. Sin colas, sin tarjetas.', 90, 500, 620, 90, { fontSize: 28, color: DIM, lineHeight: 1.35 }),
          glow(780, 120, 520, '#5a0d0d', BG, 60),
          m3d('kk-Barbarian', 800, 80, 400, 580, { clip: barb.arrive, view: 'front', bleed: 1.3 })],
          notes: 'Portada de marcador LED: dígitos de JetBrains Mono con resplandor rojo (sombra de texto) y un luchador 3D que celebra en bucle (Modelo 3D ▸ Animación ▸ En reposo ▸ Cheer).' },
        { layout: 'blank', bg: BG, transition: 'push', extra: [
          phone(serieClasses(), 110, 60, 300, 'Clases de hoy en Serie, con plazas libres'),
          text('TU CLASE, A UN TOQUE', 480, 70, 720, 90, { fontFamily: head, fontSize: 72, color: FG }),
          ...chain([['Plazas en tiempo real', 'Ves cuántas quedan y te apuntas a la lista de espera si está llena.', RED], ['Entras con el móvil', 'El torno lee tu código: adiós a la tarjeta olvidada.', YEL],
            ['Tu progreso, apuntado', 'Pesos, series y marcas de cada clase, sin libreta.', '#3ddc97']].map(([h, d, c], i) =>
            text(`<b style="color:${c};font-size:30px">${h}</b><br>${d}`, 480, 190 + i * 150, 720, 125, { fontSize: 24, color: FG, bg: PANEL, radius: 10, pad: [16, 22, 16, 22] })), 'fade-up', 'click', { duration: 400 })],
          notes: 'La lista de clases dentro del móvil y tres funciones en paneles oscuros que entran en cadena con un clic.' },
        { layout: 'titleOnly', title: '¿CUÁNDO HAY SITIO?', bg: BG, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 170, w: 800, h: 480, chartType: 'bar', color: RED, dataLabels: true, grid: true, yTitle: '% de ocupación',
            data: [['7h', 82], ['9h', 64], ['11h', 35], ['13h', 41], ['15h', 18], ['17h', 58], ['19h', 96], ['21h', 71]].map(([l, v]) => ({ label: l, value: v })) }),
          withAnims(text(`<div style="font-family:${LED};font-size:72px;font-weight:700;line-height:1">${led('15:00', YEL)}</div><div style="margin-top:18px">la hora más tranquila: un 18 % de ocupación de media.</div>`,
            920, 240, 300, 300, { fontSize: 25, color: FG }), A('fade-left', { duration: 500 }))],
          notes: 'Ocupación media por franja horaria en un gráfico de columnas con etiquetas. Datos de un mes de ejemplo; la pregunta del concurso sale de aquí.' },
        { layout: 'titleOnly', title: 'DE LA PUERTA A LA SALA 2', bg: BG, extra: [
          shape('rect', 60, 600, 1160, 70, '#1d1d22'),
          ...Array.from({ length: 12 }, (_, i) => shape('rect', 60 + i * 97, 600, 2, 70, '#2a2a30')),
          shape('rect', 70, 300, 120, 300, '#2a2a30', { stroke: '#444', strokeWidth: 4 }), text('ENTRADA', 70, 260, 120, 34, { fontSize: 20, color: DIM, textAlign: 'center', letterSpacing: 2 }),
          shape('rounded', 460, 470, 40, 130, '#3a3a40', { radius: 6 }), shape('rounded', 446, 450, 68, 34, YEL, { radius: 6, html: '<b>QR</b>', fontSize: 18, color: BG }),
          shape('rect', 1000, 300, 200, 300, '#2a1010', { stroke: RED, strokeWidth: 4 }), text(led('SALA 2', RED), 1000, 250, 200, 40, { fontFamily: LED, fontSize: 30, textAlign: 'center', fontWeight: 700 }),
          withAnims(m3d('kk-Barbarian', 120, 340, 220, 300, { walk: { clip: barb.walk, face: true, look: true } }),
            path([[300, 0]], { duration: 2400 }), A('clip3d', { clip: barb.arrive, once: true, start: 'afterPrev', duration: 1600 }), path([[560, 0], [760, 0]], { duration: 2600, start: 'click' })),
          text('Clic: llega al torno y celebra que ha entrado. Otro clic: a la sala 2.', 260, 180, 700, 40, { fontSize: 24, color: DIM })],
          notes: 'Un mismo modelo 3D con tres animaciones: andar por un recorrido hasta el torno, celebrar una vez («Cheer») y, con otro clic, seguir hasta la sala.' },
        { layout: 'blank', bg: BG, transition: 'fade', extra: [
          text('PRUEBA AHORA MISMO', 90, 50, 1100, 80, { fontFamily: head, fontSize: 72, color: FG }),
          text('Así son los intervalos de Serie: trabajo y descanso, marcados por el móvil.', 90, 130, 1100, 40, { fontSize: 24, color: DIM }),
          shape('rounded', 90, 200, 620, 420, '#050505', { radius: 14, stroke: '#2a2a2e', strokeWidth: 6 }),
          text('TRABAJO · SENTADILLAS', 90, 225, 620, 40, { fontSize: 24, color: RED, textAlign: 'center', letterSpacing: 4 }),
          timer(45, 130, 280, 540, { style: 'digital', h: 300, color: RED, auto: false, endText: '¡DESCANSO!' }),
          shape('rounded', 760, 200, 430, 420, PANEL, { radius: 14 }),
          text('DESCANSO', 760, 225, 430, 40, { fontSize: 24, color: YEL, textAlign: 'center', letterSpacing: 4 }),
          timer(15, 800, 300, 350, { style: 'bar', h: 150, color: YEL, auto: false, endText: '¡OTRA!' }),
          text('Toca cada marcador para empezar. Tres rondas y te sientas.', 800, 490, 350, 100, { fontSize: 22, color: FG, textAlign: 'center' })],
          notes: 'Dos cuentas atrás con estilos distintos: digital de 45 segundos y barra de 15. Invita al público a levantarse y hacer una ronda.' },
        { layout: 'titleOnly', title: 'CUOTAS: ¿CUÁNTO CUESTA CADA CLASE?', bg: BG, extra: [
          tableBlock({ x: 90, y: 170, w: 760, h: 380, fontSize: 26, header: true, headBg: RED, headFg: '#ffffff', stroke: '#2a2a30', banded: true, band: '#595959',
            rows: [['Plan', 'Cuota al mes', 'Clases al mes', 'Precio por clase'], ['Suelto', '9 €', '1', '=B2/C2'], ['Bono 8', '48 €', '8', '=B3/C3'], ['Ilimitado', '59 €', '16', '=B4/C4'], ['Mañanas +60', '29 €', '12', '=B5/C5']], colW: [3, 2, 2, 3] }),
          card('<b style="color:#ffd60a">Sin matrícula ni permanencia.</b><br>Pausa tu cuota un mes desde la app si te vas de viaje.', 890, 190, 310, 280, PANEL, { fontSize: 24, color: FG, radius: 10 }),
          text('La última columna es una fórmula (=B2/C2): cambia la cuota o las clases y se recalcula. Precios de ejemplo.', 90, 580, 1100, 40, { fontSize: 20, color: DIM })],
          notes: 'Tabla con fórmulas de división: el precio real de cada clase según el plan. Con 16 clases al mes, el ilimitado sale a menos de 4 €.' },
        { layout: 'blank', bg: BG, extra: [pollBlock({ kind: 'quiz', fontSize: 36, time: 20, question: 'Según los datos de Serie, ¿a qué hora hay menos gente?', options: ['7:00', '11:00', '15:00', '19:00'], correct: [2], x: 80, y: 50, w: 1120, h: 620 })],
          notes: 'Concurso con 20 segundos: quien se fijó en el gráfico de ocupación gana. Puntos por acertar y por rapidez.' },
        { layout: 'blank', bg: BG, transition: 'zoom', extra: [
          shape('rounded', 140, 110, 1000, 280, '#050505', { radius: 16, stroke: '#2a2a2e', strokeWidth: 8 }),
          withAnims(text(led('¡A POR ELLA!', RED), 160, 130, 960, 240, { fontFamily: LED, fontSize: 110, fontWeight: 700, textAlign: 'center', vAlign: 'middle' }), A('fade-in', { duration: 400, sound: 'applause' })),
          text('Primer mes gratis en los 12 gimnasios del piloto', 140, 440, 1000, 50, { fontSize: 32, color: FG, textAlign: 'center' }),
          text('serie.example · iOS y Android', 140, 510, 1000, 40, { fontSize: 24, color: YEL, textAlign: 'center', letterSpacing: 3 })],
          notes: 'Cierre en el marcador LED: el lema se enciende con un clic y aplausos.' },
      ]));
    } },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 · Plaza, the neighbourhood market at home: awnings, chalk boards, a delivery van in 3D that drives the map, stalls around, treemap and fees with formulas.
  prod_app_market: { name: 'Plaza: el mercado del barrio en casa', cat: 'product',
    summary: 'Toldo y pizarras de tiza: furgoneta 3D que recorre el plano, puestos en radial, móvil, rectángulos, comisiones con fórmulas y votación',
    make: () => {
      const KRAFT = '#efe3cc', RED = '#c0392b', CREAM = '#fbf3e4', GREEN = '#2f6b3a', INK = '#3b3228', MUTE = '#7a6f60', head = pairStacks('classic').heading;
      return numbered(build({ name: 'Plaza · mercado de barrio', palette: 'paper', fonts: 'classic', title: { color: INK, size: 48 }, body: { color: INK } }, [
        { layout: 'blank', bg: KRAFT, transition: 'fade', back: awning(0, 110), extra: [
          text('Plaza', 84, 170, 640, 170, { fontFamily: head, fontSize: 150, fontWeight: 700, color: INK }),
          text('El mercado de tu barrio, en tu casa en una hora.', 90, 350, 600, 110, { fontSize: 36, color: INK, lineHeight: 1.25 }),
          text('Los mismos tenderos de siempre, ahora también en el móvil.', 90, 480, 600, 80, { fontSize: 24, color: MUTE }),
          ...chain([chalk('Tomate de huerta<br><b>2,40 €/kg</b>', 760, 190, 220, 120, -4), chalk('Boquerón fresco<br><b>6,90 €/kg</b>', 1000, 230, 220, 120, 3),
            chalk('Pan de pueblo<br><b>2,10 €</b>', 790, 380, 210, 120, 2), chalk('Queso curado<br><b>18 €/kg</b>', 1020, 420, 200, 120, -3)], 'fade-down', 'afterPrev', { duration: 400 })],
          notes: 'Portada con un toldo de mercado (rectángulos y semicírculos alternos en el fondo) y pizarritas de precios escritas con Caveat que caen solas una tras otra.' },
        { layout: 'titleOnly', title: 'Del puesto a tu puerta', bg: KRAFT, transition: 'push', extra: [
          img(plazaMap(), 90, 160, 1100, 470, 'Plano del barrio con el mercado y tres casas'),
          withAnims(m3d('kh-CesiumMilkTruck', 435, 320, 170, 120, { view: 'side', autoRotate: false }),
            path([[-150, 0], [-150, -90]], { duration: 2400, sound: 'whoosh' }),
            path([[0, 90], [540, 90], [540, 190]], { duration: 3000, start: 'click' })),
          card('<b>Reparto en furgoneta eléctrica o en bici</b>, en franjas de una hora, desde las 10:00.', 860, 40, 330, 110, CREAM, { fontSize: 20, color: INK, radius: 8, borderColor: '#d9ccb0' })],
          notes: 'Plano del barrio hecho en SVG y una furgoneta 3D que lo recorre con dos recorridos dibujados, uno por clic: primero a la calle del Olmo y luego a la plaza Mayor.' },
        { layout: 'titleOnly', title: 'Todos los puestos, un solo pedido', bg: KRAFT, extra: [
          dg('radial', 'Mercado de San Blas\n  Frutería\n  Pescadería\n  Carnicería\n  Panadería\n  Quesería\n  Encurtidos', 90, 150, 680, 520, { oneByOne: true, colors: 'colorful' }),
          chalk('Una sola cesta,<br>un solo repartidor,<br>un solo pago', 820, 230, 370, 240, -2, { fontSize: 40 })],
          notes: 'Diagrama radial uno a uno: el mercado en el centro y cada puesto alrededor. La pizarra resume la ventaja para quien compra.' },
        { layout: 'blank', bg: CREAM, transition: 'fade', back: awning(0, 60), extra: [
          phone(plazaStalls(), 470, 100, 280, 'Puestos del mercado en la app Plaza'),
          ...chain([chalk('El tendero te escribe si algo no está fresco', 90, 160, 320, 140, -3, { fontSize: 30 }), chalk('Pides «medio kilo» como en el mostrador', 90, 400, 320, 140, 2, { fontSize: 30 }),
            chalk('Pagas al recibir, con tarjeta o en efectivo', 860, 160, 330, 140, 3, { fontSize: 30 }), chalk('Las bolsas vuelven al puesto: cero plástico', 860, 400, 330, 140, -2, { fontSize: 30 })], 'zoom-in', 'click', { duration: 350, sound: 'pop' })],
          notes: 'La app de puestos dentro de un móvil, rodeada de cuatro pizarritas que aparecen en cadena con un «pop».' },
        { layout: 'titleOnly', title: 'Lo que más se pide', bg: KRAFT, transition: 'slide', extra: [
          chartBlock({ x: 90, y: 160, w: 1100, h: 420, chartType: 'treemap', color: GREEN,
            data: [['Frutería', 31], ['Pescadería', 22], ['Carnicería', 18], ['Panadería', 12], ['Quesería', 9], ['Encurtidos', 5], ['Flores', 3]].map(([label, value]) => ({ label, value })) }),
          text('Peso de cada puesto en las ventas de Plaza, en %. Primeros tres meses (datos de ejemplo).', 90, 610, 1100, 40, { fontSize: 20, color: MUTE })],
          notes: 'Gráfico de rectángulos: el área de cada uno es su parte de las ventas. La fruta manda, como en el mercado de verdad.' },
        { layout: 'titleOnly', title: 'Cuentas claras para el tendero', bg: KRAFT, extra: [
          tableBlock({ x: 90, y: 160, w: 780, h: 400, fontSize: 25, header: true, headBg: GREEN, headFg: '#ffffff', stroke: '#d9ccb0', banded: true, band: '#6b8e23',
            rows: [['Puesto', 'Ventas del mes', 'Comisión (8 %)', 'Para el puesto'], ['Frutería Rosa', '4.120 €', '=B2*0,08', '=B2-C2'], ['Pescados Lolo', '2.980 €', '=B3*0,08', '=B3-C3'], ['Horno Celia', '1.540 €', '=B4*0,08', '=B4-C4'], ['<b>Total</b>', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)', '=SUMA(ARRIBA)']], colW: [3, 3, 3, 3] }),
          chalk('Sin cuota fija:<br>solo el <b>8 %</b><br>de lo vendido', 910, 190, 280, 220, 3, { fontSize: 38 }),
          text('Comisión y neto se calculan con fórmulas (=B2*0,08 y =B2-C2), y la fila de totales con =SUMA(ARRIBA). Cifras de ejemplo.', 90, 590, 1100, 60, { fontSize: 20, color: MUTE })],
          notes: 'Tabla con tres tipos de fórmula: porcentaje, resta y suma. Es la diapositiva que más interesa a los comerciantes.' },
        { layout: 'blank', bg: KRAFT, extra: [pollBlock({ kind: 'multi', fontSize: 32, question: '¿Qué puestos te gustaría encontrar en Plaza? Elige dos', options: ['Herboristería', 'Comida preparada', 'Productos ecológicos', 'Mercería', 'Cafés y tés a granel'], x: 80, y: 50, w: 1120, h: 620 })],
          notes: 'Votación de opción múltiple: cada persona elige dos. El resultado decide los próximos puestos que se suman.' },
        { layout: 'blank', bg: KRAFT, transition: 'zoom', back: awning(0, 90), extra: [
          shape('rounded', 190, 150, 900, 380, '#2b2b2b', { radius: 14, stroke: '#8a6a44', strokeWidth: 16, shadow: { x: 4, y: 14, blur: 30, color: '#00000055' } }),
          withAnims(text('¡Hasta el sábado<br>en la Plaza!', 220, 190, 840, 300, { fontFamily: "'Caveat', cursive", fontSize: 104, color: '#f4f1ea', textAlign: 'center', vAlign: 'middle', lineHeight: 1.05 }), A('fade-in', { duration: 1000 })),
          text('plaza.example · Mercado de San Blas y cuatro mercados más en 2027', 140, 570, 1000, 40, { fontSize: 24, color: INK, textAlign: 'center' }),
          credits(['kh-CesiumMilkTruck'], 140, 640, 1000, MUTE)],
          notes: 'Cierre con una pizarra grande de mercado escrita con tiza (Caveat). El crédito del modelo 3D de la furgoneta va en una línea pequeña.' },
      ]));
    } },
};
