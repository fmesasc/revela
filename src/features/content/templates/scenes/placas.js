// Plate tectonics, for «Animaciones explicativas» (templates/edu_anim.js): written by hand for Revela's AI-animation
// player (features/content/aianim.js) — its drawn texts through L, so it reads in every language. First a cross-section
// (an ocean between a ridge, where two plates part, and a trench, where the oceanic plate sinks under a continent with
// its volcano), moved by the asthenosphere's convection; then, seen from above, a transform fault — San Andrés — that
// locks and bends a road until the stress is released all at once: the earthquake, and in depth its hypocentre.
export default {
  background: '#f3efe8',
  accent: '#c2410c',
  stages: [
    { name: 'Placas en movimiento', caption: 'La litosfera está dividida en placas que avanzan unos centímetros al año sobre la astenosfera, más plástica.', duration: 6 },
    { name: 'Límite divergente', caption: 'En las dorsales las placas se separan: el magma sube y forma corteza oceánica nueva.', duration: 6 },
    { name: 'Límite convergente', caption: 'Donde chocan, la placa oceánica, más densa, se hunde bajo la continental: hay volcanes y terremotos.', duration: 7 },
    { name: 'Límite transformante', caption: 'En las fallas transformantes las placas se rozan de lado: se traban y la roca se deforma y acumula tensión…', duration: 6 },
    { name: 'El terremoto', caption: '…hasta que se rompe de golpe en el hipocentro: las ondas sísmicas sacuden la superficie desde el epicentro.', duration: 7 },
  ],
  words: ['Placa oceánica', 'Placa continental', 'Astenosfera', 'Dorsal', 'Fosa', 'Volcán', 'Subducción', 'Magma', 'Océano', 'Convección',
    'Vista desde arriba', 'Falla transformante', 'Falla de San Andrés (California)', 'Placa del Pacífico', 'Placa Norteamericana', 'Carretera',
    'Tensión acumulada', 'Vista en profundidad', 'Hipocentro', 'Epicentro', 'Ondas sísmicas'],
  draw({ ctx, stage, p, t, L }) {
    const INK = '#2b2522', OCEAN_L = '#7a6a5f', CONT = '#a08466', MAG = '#e8551f';
    const clamp = x => Math.max(0, Math.min(1, x));
    const seg = (x, a, b) => clamp((x - a) / (b - a));
    const at = k => (stage > k ? 1 : stage === k ? p : 0);
    const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    function text(s, x, y, { size = 22, weight = 700, color = INK, align = 'center', halo = 'rgba(250,247,242,.9)', maxW = 0, rot = 0 } = {}) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = font(weight, size); ctx.textAlign = align; ctx.textBaseline = 'middle';
      let lines = [s];
      if (maxW && ctx.measureText(s).width > maxW && s.includes(' ')) {
        const w = s.split(' '); let best = 1, diff = 1e9;
        for (let i = 1; i < w.length; i++) { const d = Math.abs(ctx.measureText(w.slice(0, i).join(' ')).width - ctx.measureText(w.slice(i).join(' ')).width); if (d < diff) { diff = d; best = i; } }
        lines = [w.slice(0, best).join(' '), w.slice(best).join(' ')];
      }
      lines.forEach((ln, i) => {
        const yy = (i - (lines.length - 1) / 2) * size * 1.15;
        if (halo) { ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = halo; ctx.strokeText(ln, 0, yy); }
        ctx.fillStyle = color; ctx.fillText(ln, 0, yy);
      });
      ctx.restore();
    }
    function arrow(x0, y0, x1, y1, col, w = 5, head = 14) {
      const a = Math.atan2(y1 - y0, x1 - x0);
      ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a - 0.45) * head, y1 - Math.sin(a - 0.45) * head); ctx.lineTo(x1 - Math.cos(a + 0.45) * head, y1 - Math.sin(a + 0.45) * head); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const plan = stage >= 3 ? seg(stage === 3 ? p : 1, 0, 0.15) : 0;     // the view from above, fading in

    // ===================== The cross-section =====================
    if (plan < 1) {
      const RX = 300;                                                      // the ridge
      const top = x => 262 - 38 * Math.exp(-Math.pow((x - RX) / 90, 2));   // the sea floor
      const bot = x => top(x) + 26 + 52 * Math.min(1, Math.abs(x - RX) / 320);   // the plate's base: thicker as it ages
      const quad = (a, c, b, s) => (1 - s) * (1 - s) * a + 2 * s * (1 - s) * c + s * s * b;
      const slabTop = s => ({ x: quad(860, 990, 1170, s), y: quad(top(860), 280, 565, s) });
      // sky, sea, asthenosphere
      ctx.fillStyle = '#e6f0f6'; ctx.fillRect(0, 0, 1280, 200);
      const ag = ctx.createLinearGradient(0, 250, 0, 570); ag.addColorStop(0, '#f4b37a'); ag.addColorStop(1, '#e2763d');
      ctx.fillStyle = ag; ctx.fillRect(0, 250, 1280, 320);
      ctx.fillStyle = '#5f9fca'; ctx.fillRect(0, 200, 940, 76);
      // convection: slow loops in the asthenosphere (rising under the ridge, sinking with the slab)
      const cv = seg(at(0), 0.2, 0.6);
      ctx.save(); ctx.globalAlpha = 0.75 * cv; ctx.setLineDash([18, 14]); ctx.lineDashOffset = -t * 30; ctx.lineWidth = 4; ctx.strokeStyle = '#a63d12';
      [[150, 455, 120, 1], [520, 455, 190, 0], [1260, 470, 0, 0]].forEach(([x, y, rx, dir]) => {
        if (!rx) return;
        ctx.beginPath(); ctx.ellipse(x, y, rx, 70, 0, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
      if (cv > 0) {
        ctx.save(); ctx.globalAlpha = cv;
        arrow(300, 470, 300, 395, '#a63d12', 5); arrow(330, 385, 470, 385, '#a63d12', 5); arrow(270, 385, 150, 385, '#a63d12', 5);
        text(L('Convección'), 560, 470, { size: 22, color: '#7c2d12', halo: 'rgba(244,179,122,.85)' });
        text(L('Astenosfera'), 960, 520, { size: 26, color: '#fff7ed', halo: '' });
        ctx.restore();
      }
      // the oceanic plates, with the bands of crust they carry away from the ridge
      const drift = (t * (stage === 1 ? 22 : 9)) % 44;
      function plateL() { ctx.beginPath(); for (let x = 0; x <= RX; x += 10) ctx.lineTo(x, top(x)); for (let x = RX; x >= 0; x -= 10) ctx.lineTo(x, bot(x)); ctx.closePath(); }
      function plateR() {
        ctx.beginPath(); for (let x = RX; x <= 860; x += 10) ctx.lineTo(x, top(x));
        for (let s = 0; s <= 1.0001; s += 0.05) { const q = slabTop(s); ctx.lineTo(q.x, q.y); }
        ctx.lineTo(1108, 572); ctx.quadraticCurveTo(958, 352, 840, bot(840));
        for (let x = 840; x >= RX; x -= 10) ctx.lineTo(x, bot(x)); ctx.closePath();
      }
      ctx.save(); ctx.fillStyle = OCEAN_L; plateL(); ctx.fill(); plateR(); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#4d4038'; plateL(); ctx.stroke(); plateR(); ctx.stroke();
      // bands (only on the flat part)
      ctx.save(); plateL(); plateR(); ctx.clip();
      for (let k = 0; k < 14; k++) {
        const d = k * 44 + drift;
        [RX - d, RX + d].forEach(x => { if (x < 0 || x > 860) return; ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.10)'; ctx.fillRect(x - 11, top(x), 22, 16); });
      }
      ctx.restore();
      ctx.restore();
      // the continent, its mountains and its volcano
      ctx.save();
      ctx.beginPath(); ctx.moveTo(870, top(870)); ctx.lineTo(936, 198); ctx.lineTo(985, 190);
      ctx.lineTo(1005, 170); ctx.lineTo(1022, 186); ctx.lineTo(1040, 168); ctx.lineTo(1062, 104); ctx.lineTo(1084, 104); ctx.lineTo(1108, 168);
      ctx.lineTo(1150, 178); ctx.lineTo(1172, 158); ctx.lineTo(1196, 182); ctx.lineTo(1280, 188); ctx.lineTo(1280, 336); ctx.lineTo(1040, 336); ctx.closePath();
      ctx.fillStyle = CONT; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6d5236'; ctx.stroke();
      ctx.fillStyle = '#6a8f4e'; ctx.beginPath(); ctx.moveTo(936, 198); ctx.lineTo(985, 190); ctx.lineTo(1005, 170); ctx.lineTo(1022, 186); ctx.lineTo(1040, 168); ctx.lineTo(1050, 140);
      ctx.lineTo(1040, 180); ctx.lineTo(1000, 186); ctx.lineTo(950, 202); ctx.closePath(); ctx.fill();
      ctx.restore();
      // labels of the section
      const lab = seg(at(0), 0.1, 0.5);
      ctx.save(); ctx.globalAlpha = lab;
      text(L('Océano'), 620, 226, { size: 22, color: '#eaf4fb', halo: '' });
      text(L('Placa oceánica'), 600, 300, { size: 22, color: '#fff', halo: '' });
      text(L('Placa continental'), 1170, 290, { size: 22, color: '#fff', halo: '', maxW: 170 });
      arrow(560, 330, 700, 330, '#fff', 4, 12); arrow(240, 312, 110, 312, '#fff', 4, 12);
      ctx.restore();
      // the ridge: magma up, new crust
      const r1 = stage === 1 ? seg(p, 0, 0.2) : stage > 1 ? 0.35 : 0;
      if (r1 > 0) {
        ctx.save(); ctx.globalAlpha = r1;
        for (let j = 0; j < 5; j++) { const f = (t * 0.35 + j / 5) % 1; ctx.beginPath(); ctx.arc(RX + Math.sin(f * 8 + j) * 8, 540 - f * 300, 10 - f * 4, 0, Math.PI * 2); ctx.fillStyle = MAG; ctx.fill(); }
        const gl = ctx.createRadialGradient(RX, 232, 4, RX, 232, 44); gl.addColorStop(0, 'rgba(255,120,40,.95)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(RX, 232, 44, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.globalAlpha = stage === 1 ? r1 : 0;
        text(L('Magma'), RX + 66, 500, { size: 22, color: '#7c2d12', halo: 'rgba(244,179,122,.85)' });
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = lab;
      text(L('Dorsal'), RX, 172, { size: 24 }); arrow(RX, 186, RX, 214, INK, 3, 10);
      ctx.restore();
      // the trench and the subduction: the slab sinks, melts, feeds the volcano; earthquakes along it
      const r2 = stage === 2 ? seg(p, 0, 0.2) : stage > 2 ? 0.35 : 0;
      ctx.save(); ctx.globalAlpha = lab;
      text(L('Fosa'), 872, 172, { size: 24 }); arrow(872, 186, 870, 248, INK, 3, 10);
      text(L('Volcán'), 1073, 62, { size: 24 });
      ctx.restore();
      if (r2 > 0) {
        ctx.save(); ctx.globalAlpha = r2;
        arrow(1000, 372, 1080, 470, '#fff', 5, 14);
        text(L('Subducción'), 1000, 445, { size: 22, color: '#fff', halo: '', rot: 0.9 });
        for (let j = 0; j < 4; j++) { const f = (t * 0.3 + j / 4) % 1; ctx.beginPath(); ctx.arc(1098 - f * 25 + Math.sin(f * 7) * 6, 440 - f * 330, 8 - f * 3, 0, Math.PI * 2); ctx.fillStyle = MAG; ctx.fill(); }
        // the eruption
        for (let j = 0; j < 7; j++) { const f = (t * 0.25 + j / 7) % 1; ctx.beginPath(); ctx.arc(1073 + Math.sin(j * 2.3 + f * 3) * 30 * f, 98 - f * 80, 10 + f * 22, 0, Math.PI * 2); ctx.fillStyle = `rgba(90,85,85,${0.5 * (1 - f)})`; ctx.fill(); }
        ctx.fillStyle = '#ff7a2f'; ctx.beginPath(); ctx.moveTo(1064, 104); ctx.lineTo(1083, 104); ctx.lineTo(1100, 150); ctx.lineTo(1070, 132); ctx.closePath(); ctx.fill();
        // earthquakes along the slab (flashes)
        [[0.15, 0], [0.35, 1.7], [0.55, 3.1], [0.75, 4.4]].forEach(([s, ph]) => {
          const q = slabTop(s), f = (t * 0.8 + ph) % 1;
          if (f < 0.35) { ctx.save(); ctx.globalAlpha = r2 * (1 - f / 0.35); ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3;
            for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(q.x + Math.cos(a) * 5, q.y + Math.sin(a) * 5); ctx.lineTo(q.x + Math.cos(a) * (12 + f * 40), q.y + Math.sin(a) * (12 + f * 40)); ctx.stroke(); }
            ctx.restore(); }
        });
        ctx.restore();
      }
    }

    // ===================== From above: the transform fault =====================
    if (plan > 0) {
      ctx.save(); ctx.globalAlpha = plan;
      const quake = stage === 4 ? p : 0, snap = seg(quake, 0, 0.06);
      const shake = stage === 4 ? Math.max(0, 1 - quake * 2.2) * 7 : 0;
      ctx.save(); ctx.translate(Math.sin(t * 61) * shake, Math.cos(t * 47) * shake);
      // ground: two plates either side of the fault
      ctx.fillStyle = '#f3efe8'; ctx.fillRect(-10, -10, 1300, 600);
      ctx.fillStyle = '#e4dcc4'; ctx.fillRect(30, 70, 390, 490); ctx.fillStyle = '#dde3c6'; ctx.fillRect(420, 70, 390, 490);
      for (let i = 0; i < 26; i++) { const x = 60 + (i * 137) % 720, y = 100 + (i * 89) % 430; ctx.fillStyle = 'rgba(90,110,60,.25)'; ctx.beginPath(); ctx.arc(x, y, 9 + (i % 3) * 3, 0, Math.PI * 2); ctx.fill(); }
      // the fault
      ctx.strokeStyle = '#8a3b12'; ctx.lineWidth = 4; ctx.beginPath();
      for (let y = 70; y <= 560; y += 14) ctx.lineTo(420 + Math.sin(y * 0.09) * 4, y); ctx.stroke();
      // the road: dragged by both plates, bent while the fault is locked, then broken and shifted
      const D = 42 * (stage === 3 ? seg(p, 0.15, 1) : stage === 4 ? 1 : 0);
      const road = (y0, w, col) => {
        ctx.save(); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = 'butt';
        const yAt = x => { const bent = y0 + D * Math.tanh((x - 420) / 120), broken = y0 + (x < 420 ? -D : D); return bent + (broken - bent) * snap; };
        ctx.beginPath(); for (let x = 30; x <= 418; x += 6) ctx.lineTo(x, yAt(x)); ctx.stroke();
        ctx.beginPath(); for (let x = 422; x <= 810; x += 6) ctx.lineTo(x, yAt(x)); ctx.stroke();
        ctx.restore();
      };
      road(318, 34, '#5b5b5b'); road(318, 3, '#f8e16c');
      // which way each plate goes
      arrow(200, 520, 200, 440, '#2b2522', 6, 18); arrow(640, 440, 640, 520, '#2b2522', 6, 18);
      ctx.restore();
      text(L('Vista desde arriba'), 30, 36, { size: 22, color: '#6b625c', align: 'left', weight: 600 });
      text(L('Falla transformante'), 425, 100, { size: 24 });
      text(L('Falla de San Andrés (California)'), 425, 132, { size: 22, weight: 500, color: '#5b524c' });
      text(L('Placa del Pacífico'), 200, 400, { size: 22, maxW: 300 });
      text(L('Placa Norteamericana'), 640, 400, { size: 22, maxW: 300 });
      text(L('Carretera'), 100, 270 - D * 0.9, { size: 22, color: '#3f3f3f' });
      // the epicentre on the map
      if (stage === 4) {
        for (let j = 0; j < 3; j++) { const f = (quake * 3 + j / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - f) * plan; ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(420, 318, 20 + f * 220, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
        star(420, 318, 16, '#d9480f');
        text(L('Epicentro'), 446, 286, { size: 22, color: '#9a3412', align: 'left' });
      }
      function star(x, y, r, col) { ctx.save(); ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore(); }
      // right: the stress gauge (stage 3), then the view in depth (stage 4)
      const PX = 860, PW = 380;
      ctx.fillStyle = '#fffaf3'; ctx.beginPath(); ctx.roundRect(PX, 70, PW, 490, 20); ctx.fill(); ctx.strokeStyle = '#d8cdbd'; ctx.lineWidth = 2; ctx.stroke();
      if (stage === 3) {
        const k = seg(p, 0.15, 1);
        text(L('Tensión acumulada'), PX + PW / 2, 130, { size: 26, halo: '' });
        ctx.fillStyle = '#efe6d8'; ctx.beginPath(); ctx.roundRect(PX + 40, 180, PW - 80, 44, 22); ctx.fill();
        const gg = ctx.createLinearGradient(PX + 40, 0, PX + PW - 40, 0); gg.addColorStop(0, '#f6c343'); gg.addColorStop(1, '#d9480f');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.roundRect(PX + 40, 180, Math.max(44, (PW - 80) * k), 44, 22); ctx.fill();
        // the rock either side, drawn as a grid: its lines bend across the locked fault (elastic strain)
        const cx = PX + PW / 2, x0 = PX + 40, x1 = PX + PW - 40, bend = 30 * k;
        ctx.save();
        ctx.fillStyle = '#e4dcc4'; ctx.fillRect(x0, 270, cx - x0, 260); ctx.fillStyle = '#dde3c6'; ctx.fillRect(cx, 270, x1 - cx, 260);
        ctx.strokeStyle = '#6b5d4f'; ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) { const y = 300 + i * 40; ctx.beginPath(); for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, y + bend * Math.tanh((x - cx) / 55)); ctx.stroke(); }
        ctx.strokeStyle = '#8a3b12'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, 262); ctx.lineTo(cx, 538); ctx.stroke();
        ctx.restore();
        arrow(x0 + 40, 300, x0 + 40, 262, INK, 5, 14); arrow(x1 - 40, 500, x1 - 40, 538, INK, 5, 14);
      }
      if (stage === 4) {
        const sy = 230, hx = PX + PW / 2, hy = 470;
        text(L('Vista en profundidad'), PX + PW / 2, 108, { size: 24, halo: '' });
        ctx.save(); ctx.beginPath(); ctx.rect(PX + 20, sy, PW - 40, 310); ctx.clip();
        const gg = ctx.createLinearGradient(0, sy, 0, 540); gg.addColorStop(0, '#d9c7a8'); gg.addColorStop(1, '#a7896a'); ctx.fillStyle = gg; ctx.fillRect(PX + 20, sy, PW - 40, 310);
        ctx.strokeStyle = '#8a3b12'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx, sy); ctx.lineTo(hx + 10, 540); ctx.stroke();
        for (let j = 0; j < 4; j++) { const f = (quake * 2.5 + j / 4) % 1; ctx.globalAlpha = (1 - f); ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, 14 + f * 260, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
        // surface, with its epicentre right above the hypocentre
        ctx.strokeStyle = '#6a8f4e'; ctx.lineWidth = 8; ctx.beginPath();
        for (let x = PX + 20; x <= PX + PW - 20; x += 8) ctx.lineTo(x, sy + Math.sin(x * 0.12 - quake * 60) * 5 * Math.max(0, 1 - quake * 1.6) * Math.exp(-Math.abs(x - hx) / 160));
        ctx.stroke();
        ctx.setLineDash([6, 6]); ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, sy); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
        star(hx, hy, 18, '#d9480f'); star(hx, sy, 12, '#9a3412');
        text(L('Epicentro'), hx, sy - 28, { size: 22, color: '#9a3412' });
        text(L('Hipocentro'), hx, hy + 38, { size: 22, color: '#fff', halo: 'rgba(120,60,20,.6)' });
        text(L('Ondas sísmicas'), PX + PW - 30, 330, { size: 22, color: '#fff', halo: 'rgba(120,60,20,.6)', align: 'right' });
      }
      ctx.restore();
    }
  },
};
