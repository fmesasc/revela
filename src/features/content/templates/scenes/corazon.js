// The heart and the double circulation, for «Animaciones explicativas» (templates/edu_anim.js): written by hand for
// Revela's AI-animation player (features/content/aianim.js) — its drawn texts through L, so it reads in every language.
// A diagram seen from the front (the heart's right side on the viewer's left): four chambers, the four valves opening
// and closing with diastole and systole, and the blood going round one loop — lungs, left heart, body, right heart —,
// red where it carries oxygen and blue where it has given it away.
export default {
  background: '#f8f4f1',
  accent: '#c0392b',
  stages: [
    { name: 'Cuatro cavidades', caption: 'El corazón tiene dos aurículas arriba y dos ventrículos abajo; su lado derecho y su lado izquierdo no se mezclan.', duration: 5 },
    { name: 'Diástole', caption: 'Diástole: el corazón se relaja, la sangre llena las aurículas y pasa a los ventrículos por válvulas abiertas.', duration: 6 },
    { name: 'Sístole', caption: 'Sístole: los ventrículos se contraen, las válvulas de entrada se cierran y la sangre sale por las arterias.', duration: 6 },
    { name: 'Circulación pulmonar', caption: 'Circulación pulmonar: la sangre va a los pulmones, deja el CO₂, toma O₂ y vuelve a la aurícula izquierda.', duration: 7 },
    { name: 'Circulación sistémica', caption: 'Circulación sistémica: la aorta lleva el O₂ a todo el cuerpo y las venas cavas devuelven la sangre al corazón.', duration: 7 },
  ],
  words: ['Aurícula derecha', 'Aurícula izquierda', 'Ventrículo derecho', 'Ventrículo izquierdo', 'Pulmones', 'Cuerpo', 'Órganos y tejidos',
    'Arteria pulmonar', 'Venas pulmonares', 'Aorta', 'Venas cavas', 'Tricúspide', 'Mitral', 'Válvula pulmonar', 'Válvula aórtica',
    'Rica en O₂', 'Pobre en O₂', 'Vista de frente: su lado derecho queda a tu izquierda', 'Diástole', 'Sístole'],
  setup() {
    // The blood's one loop, as a polyline: each point with how much oxygen the blood has there (1 red, 0 blue).
    const pts = [];
    const add = (x, y, o) => pts.push({ x, y, o });
    add(675, 400, 1); add(755, 432, 1); add(900, 432, 1); add(900, 300, 1); add(965, 300, 1);           // LV → aorta → body
    for (let i = 1; i <= 40; i++) { const k = i / 40; add(965 + k * 215, 300 + Math.sin(k * Math.PI * 6) * 26, 1 - k); }   // its capillaries
    add(1180, 432, 0); add(1180, 522, 0); add(220, 522, 0); add(220, 160, 0); add(465, 160, 0);          // venae cavae
    add(465, 250, 0); add(465, 400, 0); add(400, 432, 0); add(300, 432, 0); add(300, 85, 0); add(392, 85, 0);   // RA → RV → pulmonary artery
    for (let i = 1; i <= 50; i++) { const k = i / 50; add(392 + k * 376, 85 + Math.sin(k * Math.PI * 8) * 24, k); }     // the lungs' capillaries
    add(850, 85, 1); add(850, 250, 1); add(675, 250, 1);                                                // pulmonary veins → LA
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const total = len[len.length - 1] + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
    // where the pulmonary half starts and ends along it (for the highlights)
    const iRV = pts.findIndex(q => q.x === 465 && q.y === 400), iLA = pts.length - 1;
    return { pts, len, total, sPul: len[iRV], ePul: len[iLA] };
  },
  draw({ ctx, stage, p, t, data, L }) {
    const RED = '#d23a35', BLUE = '#3567d4', MUSCLE = '#e7a397', MUSCLE_D = '#a9483d', INK = '#2a2224', PAPER = '#fffaf7';
    const clamp = x => Math.max(0, Math.min(1, x));
    const seg = (x, a, b) => clamp((x - a) / (b - a));
    const at = k => (stage > k ? 1 : stage === k ? p : 0);
    const mix = (o) => { const a = [0x35, 0x67, 0xd4], b = [0xd2, 0x3a, 0x35]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * o)).join(',')})`; };
    const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    function text(s, x, y, { size = 22, weight = 600, color = INK, align = 'center', halo = true, maxW = 0, bg = '' } = {}) {
      ctx.save(); ctx.font = font(weight, size); ctx.textAlign = align; ctx.textBaseline = 'middle';
      // (long ones on two lines, at a space)
      let lines = [s];
      if (maxW && ctx.measureText(s).width > maxW && s.includes(' ')) {
        const w = s.split(' '); let best = 1, diff = 1e9;
        for (let i = 1; i < w.length; i++) { const d = Math.abs(ctx.measureText(w.slice(0, i).join(' ')).width - ctx.measureText(w.slice(i).join(' ')).width); if (d < diff) { diff = d; best = i; } }
        lines = [w.slice(0, best).join(' '), w.slice(best).join(' ')];
      }
      if (bg) {                                                        // (a plate of its own, over the blood going by)
        const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16, h = lines.length * size * 1.15 + 8;
        ctx.beginPath(); ctx.roundRect(x - (align === 'center' ? w / 2 : 8), y - h / 2, w, h, 10); ctx.fillStyle = bg; ctx.fill();
      }
      lines.forEach((ln, i) => {
        const yy = y + (i - (lines.length - 1) / 2) * size * 1.15;
        if (halo) { ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,250,247,.9)'; ctx.strokeText(ln, x, yy); }
        ctx.fillStyle = color; ctx.fillText(ln, x, yy);
      });
      ctx.restore();
    }
    // The beat: diastole fills (squeeze 0), systole squeezes; in stages 1 and 2 held in one of them.
    const beat = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 * 1.1);
    const sys = stage === 1 ? 0 : stage === 2 ? clamp(p * 4) * (0.75 + 0.25 * beat) : stage === 0 ? 0.3 * beat : beat;
    const avOpen = 1 - clamp(sys * 1.6), slOpen = clamp(sys * 1.6 - 0.4);
    // what is highlighted: the pulmonary half in stage 3, the systemic one in stage 4
    const focus = s => (stage === 3 ? (s >= data.sPul && s <= data.ePul ? 1 : 0.25) : stage === 4 ? (s >= data.sPul && s <= data.ePul ? 0.25 : 1) : 1);

    // ---- Lungs ----
    ctx.save();
    [[482, 86], [678, 86]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.ellipse(x, y, 104, 58, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f9d3d6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#d98b94'; ctx.stroke();
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(x - 70 + (i % 5) * 35 + (i > 4 ? 17 : 0), y + (i > 4 ? 22 : -22), 9, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }
    });
    ctx.restore();
    text(L('Pulmones'), 580, 160, { size: 26, weight: 800, color: '#a23b4b' });

    // ---- Body ----
    ctx.save();
    ctx.beginPath(); ctx.roundRect(960, 172, 262, 258, 22); ctx.fillStyle = '#fbe8db'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#d9a383'; ctx.stroke();
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.ellipse(990 + (i % 6) * 38, 352 + Math.floor(i / 6) * 40, 15, 11, 0, 0, Math.PI * 2); ctx.fillStyle = '#f3cdb5'; ctx.fill(); ctx.fillStyle = '#c98a6a'; ctx.beginPath(); ctx.arc(990 + (i % 6) * 38, 352 + Math.floor(i / 6) * 40, 3.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    text(L('Cuerpo'), 1091, 205, { size: 28, weight: 800, color: '#8a4b2c', halo: false });
    text(L('Órganos y tejidos'), 1091, 238, { size: 22, weight: 500, color: '#8a4b2c', halo: false, maxW: 240 });

    // ---- Heart muscle ----
    ctx.save();
    ctx.beginPath(); ctx.roundRect(366, 180, 410, 312, [50, 50, 110, 110]); ctx.fillStyle = MUSCLE; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = MUSCLE_D; ctx.stroke();
    ctx.restore();

    // ---- Vessels (tubes over the muscle, under the chambers) ----
    function tube(points, color, light, w = 30) {
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
      ctx.beginPath(); points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineWidth = w + 6; ctx.strokeStyle = color; ctx.stroke();
      ctx.lineWidth = w; ctx.strokeStyle = light; ctx.stroke(); ctx.restore();
    }
    const dimP = stage === 4 ? 0.35 : 1, dimS = stage === 3 ? 0.35 : 1;
    ctx.save(); ctx.globalAlpha = dimS;
    tube([[1180, 300], [1180, 522], [220, 522], [220, 160], [465, 160], [465, 200]], BLUE, '#c5d5f6');   // venae cavae
    ctx.restore();
    ctx.save(); ctx.globalAlpha = dimP;
    tube([[400, 432], [300, 432], [300, 85], [392, 85]], BLUE, '#c5d5f6');                               // pulmonary artery
    tube([[768, 85], [850, 85], [850, 250], [750, 250]], RED, '#f4c2bf');                               // pulmonary veins
    ctx.restore();
    ctx.save(); ctx.globalAlpha = dimS;
    tube([[740, 432], [900, 432], [900, 300], [968, 300]], RED, '#f4c2bf', 34);                          // aorta
    ctx.restore();
    // capillaries: thin, along the loop's waves
    ctx.save(); ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (let i = 1; i < data.pts.length; i++) {
      const a = data.pts[i - 1], b = data.pts[i];
      if (!((a.y !== b.y || a.x !== b.x) && ((a.x >= 392 && b.x <= 768 && a.y < 120 && b.y < 120) || (a.x >= 965 && b.x <= 1180 && a.y < 340 && b.y < 340 && a.y > 260)))) continue;
      ctx.strokeStyle = mix((a.o + b.o) / 2); ctx.globalAlpha = 0.55 * (a.x < 900 ? dimP : dimS);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();

    // ---- Chambers ----
    const sq = 10 * sys, atr = 6 * (1 - sys);
    function chamber(x, y, w, h, fill, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
    chamber(386 - atr / 2, 196 - atr / 2, 160 + atr, 108 + atr, '#dfe7fb', 26);   // RA
    chamber(596 - atr / 2, 196 - atr / 2, 160 + atr, 108 + atr, '#fadedb', 26);   // LA
    chamber(386 + sq, 320 + sq * 0.4, 160 - 2 * sq, 150 - 1.4 * sq, '#dfe7fb', [10, 10, 60, 30]);   // RV
    chamber(600 + sq * 1.2, 320 + sq * 0.4, 152 - 2.2 * sq, 150 - 1.4 * sq, '#fadedb', [10, 10, 30, 60]);   // LV (thicker wall)
    // the valves' rings between atria and ventricles
    ctx.save(); ctx.fillStyle = MUSCLE;
    [[386, 304, 40, 16], [506, 304, 40, 16], [596, 304, 40, 16], [716, 304, 40, 16]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
    ctx.restore();

    // ---- Valves ----
    function leaflet(x, y, ang, len, col) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.strokeStyle = col; ctx.stroke(); }
    ctx.save(); ctx.lineWidth = 6; ctx.lineCap = 'round';
    const D = Math.PI / 180;
    [[426, 506, '#2d4f9e'], [636, 716, '#9e2d2a']].forEach(([x1, x2, col]) => {          // tricuspid, mitral
      leaflet(x1, 312, avOpen * 72 * D, 40, col); leaflet(x2, 312, (180 - avOpen * 72) * D, 40, col);
    });
    [[386, '#2d4f9e', 180], [756, '#9e2d2a', 0]].forEach(([x, col, out]) => {           // pulmonary, aortic
      leaflet(x, 417, (90 + (out === 180 ? 1 : -1) * slOpen * 90) * D, 15, col);
      leaflet(x, 447, (270 - (out === 180 ? 1 : -1) * slOpen * 90) * D, 15, col);
    });
    ctx.restore();

    // ---- The blood ----
    const speed = 105 * (stage === 2 ? 0.7 + 0.9 * beat : 1);
    const N = 70;
    function pointAt(s) {
      s = ((s % data.total) + data.total) % data.total;
      let lo = 0, hi = data.len.length - 1;
      if (s >= data.len[hi]) { const a = data.pts[hi], b = data.pts[0], k = (s - data.len[hi]) / (data.total - data.len[hi]); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, o: a.o + (b.o - a.o) * k, s }; }
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (data.len[m] <= s) lo = m; else hi = m; }
      const a = data.pts[lo], b = data.pts[hi], k = (s - data.len[lo]) / (data.len[hi] - data.len[lo] || 1);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, o: a.o + (b.o - a.o) * k, s };
    }
    const flowOn = clamp(at(0) * 2.5);
    for (let i = 0; i < N; i++) {
      const q = pointAt(i * data.total / N + t * speed);
      ctx.globalAlpha = flowOn * focus(q.s);
      ctx.beginPath(); ctx.arc(q.x, q.y, 7, 0, Math.PI * 2); ctx.fillStyle = mix(q.o); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ---- Gas exchange (stages 3 and 4) ----
    function gas(label, x0, y0, x1, y1, col, k) {
      if (k <= 0) return;
      for (let j = 0; j < 3; j++) {
        const f = ((t * 0.5 + j / 3) % 1);
        ctx.save(); ctx.globalAlpha = k * Math.sin(f * Math.PI);
        text(label, x0 + (x1 - x0) * f + j * 26 - 26, y0 + (y1 - y0) * f, { size: 22, weight: 800, color: col });
        ctx.restore();
      }
    }
    const g3 = stage === 3 ? seg(p, 0.1, 0.3) : 0, g4 = stage === 4 ? seg(p, 0.1, 0.3) : 0;
    gas('O₂', 482, 10, 482, 78, RED, g3); gas('CO₂', 678, 78, 678, 10, BLUE, g3);
    gas('O₂', 1040, 300, 1040, 392, RED, g4); gas('CO₂', 1130, 392, 1130, 300, BLUE, g4);

    // ---- Labels ----
    const lab = seg(at(0), 0.15, 0.6);
    ctx.save(); ctx.globalAlpha = lab;
    text(L('Aurícula derecha'), 466, 250, { size: 23, weight: 700, color: '#25417f', maxW: 140, halo: false, bg: 'rgba(223,231,251,.92)' });
    text(L('Aurícula izquierda'), 676, 250, { size: 23, weight: 700, color: '#86241f', maxW: 140, halo: false, bg: 'rgba(250,222,219,.92)' });
    text(L('Ventrículo derecho'), 466, 426, { size: 23, weight: 700, color: '#25417f', maxW: 140, halo: false, bg: 'rgba(223,231,251,.92)' });
    text(L('Ventrículo izquierdo'), 676, 426, { size: 23, weight: 700, color: '#86241f', maxW: 140, halo: false, bg: 'rgba(250,222,219,.92)' });
    ctx.restore();
    // valves: named while the beat is explained
    const vl = stage === 1 || stage === 2 ? seg(p, 0.05, 0.25) : 0;
    if (vl > 0) {
      ctx.save(); ctx.globalAlpha = vl;
      text(L('Tricúspide'), 466, 370, { size: 22, weight: 600, color: '#25417f', halo: false, bg: 'rgba(223,231,251,.92)' });
      text(L('Mitral'), 676, 370, { size: 22, weight: 600, color: '#86241f', halo: false, bg: 'rgba(250,222,219,.92)' });
      text(L('Válvula pulmonar'), 318, 478, { size: 22, weight: 600, color: '#25417f', maxW: 110 });
      text(L('Válvula aórtica'), 826, 478, { size: 22, weight: 600, color: '#86241f', maxW: 120 });
      // where it is: diastole or systole
      const w = stage === 1 ? L('Diástole') : L('Sístole');
      ctx.beginPath(); ctx.roundRect(1040, 92, 182, 50, 25); ctx.fillStyle = stage === 1 ? '#3567d4' : '#d23a35'; ctx.fill();
      text(w, 1131, 117, { size: 26, weight: 800, color: '#fff', halo: false });
      ctx.restore();
    }
    // vessels: named along their tubes
    function along(s, x, y, rot, col, a) {
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
      ctx.font = font(700, 22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, 0, 1); ctx.restore();
    }
    const vn = seg(at(0), 0.5, 0.9);
    along(L('Arteria pulmonar'), 300, 262, -Math.PI / 2, '#1d3a78', vn * dimP);
    along(L('Aorta'), 900, 366, -Math.PI / 2, '#7d1d19', vn * dimS);
    along(L('Venas cavas'), 220, 340, -Math.PI / 2, '#1d3a78', vn * dimS);
    ctx.save(); ctx.globalAlpha = vn * dimP;
    text(L('Venas pulmonares'), 870, 140, { size: 22, weight: 700, color: '#7d1d19', align: 'left', maxW: 130 });
    ctx.restore();
    // the key, and which way it is seen
    ctx.save(); ctx.globalAlpha = lab;
    [[RED, L('Rica en O₂'), 40], [BLUE, L('Pobre en O₂'), 76]].forEach(([c, s, y]) => {
      ctx.beginPath(); ctx.arc(52, y, 10, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      text(s, 72, y, { size: 22, weight: 600, align: 'left', halo: false });
    });
    text(L('Vista de frente: su lado derecho queda a tu izquierda'), 1200, 42, { size: 22, weight: 500, color: '#6b5d5a', align: 'right', halo: false, maxW: 330 });
    ctx.restore();
  },
};
