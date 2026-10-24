// Photosynthesis, from the leaf to the chloroplast, for «Animaciones explicativas» (templates/edu_anim.js): written
// by hand for Revela's AI-animation player (features/content/aianim.js) — its drawn texts through L, so it reads in every
// language. Left, the plant: light, water up from the roots, CO₂ in through the stomata, O₂ out, sugar down; right, a
// chloroplast seen up close: the light phase in the thylakoids (water split, O₂, ATP and NADPH) and the Calvin cycle in
// the stroma (CO₂ fixed into sugar, ADP and NADP⁺ going back).
export default {
  background: '#f1f7ee',
  accent: '#2f855a',
  stages: [
    { name: 'La luz', caption: 'La hoja capta la luz del sol con la clorofila, el pigmento verde que hay en sus cloroplastos.', duration: 5 },
    { name: 'Agua y CO₂', caption: 'El agua sube desde las raíces por el tallo y el CO₂ del aire entra en la hoja por los estomas.', duration: 6 },
    { name: 'Fase luminosa', caption: 'En los tilacoides, la energía de la luz rompe el agua: se libera O₂ y se forman ATP y NADPH.', duration: 7 },
    { name: 'Ciclo de Calvin', caption: 'En el estroma, el ciclo de Calvin gasta ATP y NADPH para fijar el CO₂ y fabricar azúcares como la glucosa.', duration: 7 },
    { name: 'El balance', caption: 'La glucosa alimenta a la planta y el oxígeno sale al aire: el que respiramos.', duration: 6 },
  ],
  words: ['Luz', 'Hoja', 'Raíz', 'Estomas', 'Cloroplasto', 'Tilacoides', 'Estroma', 'Ciclo de Calvin', 'Glucosa', 'Clorofila', 'luz'],
  draw({ ctx, stage, p, t, L }) {
    const G = '#2f855a', GD = '#1f5f3f', WATER = '#2b6cb0', OXY = '#3aa3c9', CO2C = '#6b7280', ATPC = '#dd6b20', NADC = '#805ad5', SUGAR = '#b7791f', INK = '#1f2a24';
    const clamp = x => Math.max(0, Math.min(1, x));
    const seg = (x, a, b) => clamp((x - a) / (b - a));
    const at = k => (stage > k ? 1 : stage === k ? p : 0);
    const on = k => (stage >= k ? seg(stage === k ? p : 1, 0, 0.2) : 0);       // a flow that starts with stage k and keeps on
    const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    function text(s, x, y, { size = 22, weight = 700, color = INK, align = 'center', halo = true, maxW = 0 } = {}) {
      ctx.save(); ctx.font = font(weight, size); ctx.textAlign = align; ctx.textBaseline = 'middle';
      let lines = [s];
      if (maxW && ctx.measureText(s).width > maxW && s.includes(' ')) {
        const w = s.split(' '); let best = 1, diff = 1e9;
        for (let i = 1; i < w.length; i++) { const d = Math.abs(ctx.measureText(w.slice(0, i).join(' ')).width - ctx.measureText(w.slice(i).join(' ')).width); if (d < diff) { diff = d; best = i; } }
        lines = [w.slice(0, best).join(' '), w.slice(best).join(' ')];
      }
      lines.forEach((ln, i) => {
        const yy = y + (i - (lines.length - 1) / 2) * size * 1.15;
        if (halo) { ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(247,252,245,.92)'; ctx.strokeText(ln, x, yy); }
        ctx.fillStyle = color; ctx.fillText(ln, x, yy);
      });
      ctx.restore();
    }
    // A molecule going by: a round token with its formula.
    function token(s, x, y, color, a = 1, r = 0) {
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha *= a; ctx.font = font(800, 20);
      const w = Math.max(r * 2, ctx.measureText(s).width + 18), h = 30;
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 15); ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 1);
      ctx.restore();
    }
    // Several of them along a path (x0,y0 → x1,y1), every so often.
    function stream(s, x0, y0, x1, y1, color, a, n = 3, speed = 0.35, wob = 0) {
      if (a <= 0) return;
      for (let j = 0; j < n; j++) {
        const f = (t * speed + j / n) % 1, fade = Math.sin(f * Math.PI);
        token(s, x0 + (x1 - x0) * f + Math.sin(f * 9 + j) * wob, y0 + (y1 - y0) * f, color, a * Math.min(1, fade * 2.2));
      }
    }
    function hexagon(x, y, r, a) {
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha *= a; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const an = Math.PI / 6 + i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(an) * r, y + Math.sin(an) * r); }
      ctx.closePath(); ctx.fillStyle = '#f6d58e'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = SUGAR; ctx.stroke(); ctx.restore();
    }

    // ================= Left: the plant =================
    // sky and soil
    ctx.fillStyle = '#e3f1fb'; ctx.fillRect(0, 0, 500, 470);
    ctx.fillStyle = '#8b6a4a'; ctx.fillRect(0, 470, 500, 100);
    ctx.fillStyle = '#7a5b3e'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(20 + i * 36, 490 + (i % 3) * 22, 4, 0, Math.PI * 2); ctx.fill(); }
    // the sun and its light
    const sun = { x: 92, y: 88 }, glow = 1 + 0.04 * Math.sin(t * 3);
    ctx.save();
    const sg = ctx.createRadialGradient(sun.x, sun.y, 10, sun.x, sun.y, 80 * glow); sg.addColorStop(0, 'rgba(255,214,90,.9)'); sg.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sun.x, sun.y, 80 * glow, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6b81f'; ctx.beginPath(); ctx.arc(sun.x, sun.y, 36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const rays = seg(at(0), 0, 0.4);
    if (rays > 0) {
      ctx.save(); ctx.globalAlpha = rays; ctx.strokeStyle = '#f2b01e'; ctx.lineWidth = 4; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 60;
      [[-26, 292, 218], [0, 345, 236], [26, 398, 250]].forEach(([o, x, y]) => { ctx.beginPath(); ctx.moveTo(sun.x + 28 - o * 0.6, sun.y + 28 + o); ctx.lineTo(x - o * 0.5, y - 18 + o * 0.2); ctx.stroke(); });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = rays; text(L('Luz'), 200, 120, { size: 24, color: '#9c6b00' }); ctx.restore();
    }
    // roots, stem, leaves
    ctx.save(); ctx.strokeStyle = '#d8c3a5'; ctx.lineCap = 'round';
    [[250, 470, 200, 545, 5], [250, 470, 300, 550, 5], [250, 480, 250, 560, 6], [220, 510, 180, 530, 3], [280, 515, 330, 525, 3]].forEach(([x0, y0, x1, y1, w]) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2, x1, y1); ctx.stroke(); });
    ctx.strokeStyle = '#3f8f4f'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(250, 472); ctx.quadraticCurveTo(244, 360, 252, 200); ctx.stroke();
    ctx.restore();
    function leaf(x, y, rx, ry, rot, lit) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.quadraticCurveTo(0, -ry * 1.6, rx, 0); ctx.quadraticCurveTo(0, ry * 1.6, -rx, 0);
      ctx.fillStyle = lit ? `rgb(${Math.round(70 + 40 * lit)},${Math.round(160 + 30 * lit)},90)` : '#4aa05a'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = GD; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx * 0.85, 0); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    const lit = rays * (0.6 + 0.4 * Math.sin(t * 3) ** 2);
    leaf(345, 250, 105, 42, -0.38, lit);
    leaf(178, 352, 74, 30, 0.42, 0);
    leaf(320, 400, 66, 26, -0.25, 0);
    text(L('Hoja'), 466, 252, { size: 24, color: GD });
    // water up the stem, CO₂ in, O₂ out, sugar down
    const w1 = on(1);
    stream('H₂O', 247, 545, 254, 268, WATER, w1, 3, 0.3);
    if (w1) { ctx.save(); ctx.globalAlpha = w1; text(L('Raíz'), 360, 545, { size: 22, color: '#fff7ea', halo: false }); ctx.restore(); }
    stream('CO₂', 470, 350, 372, 278, CO2C, w1, 2, 0.32, 6);
    if (w1) { ctx.save(); ctx.globalAlpha = w1; text(L('Estomas'), 430, 380, { size: 22, color: '#4b5563' }); ctx.restore(); }
    stream('O₂', 330, 222, 430, 120, OXY, on(2), 2, 0.32, 6);
    if (stage >= 4) { for (let j = 0; j < 3; j++) { const f = (t * 0.3 + j / 3) % 1; hexagon(262, 240 + f * 220, 11, seg(p, 0, 0.2) * Math.sin(f * Math.PI)); } }

    // ================= Right: the chloroplast =================
    const zoom = seg(at(0), 0.25, 0.75);
    // the magnifier from the leaf
    ctx.save(); ctx.globalAlpha = zoom;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(31,95,63,.55)'; ctx.beginPath(); ctx.arc(388, 236, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(410, 222); ctx.lineTo(600, 120); ctx.moveTo(410, 252); ctx.lineTo(600, 480); ctx.stroke();
    ctx.restore();
    const CX = 885, CY = 300, RX = 340 * (0.5 + 0.5 * zoom), RY = 214 * (0.5 + 0.5 * zoom);
    if (zoom > 0) {
      ctx.save(); ctx.globalAlpha = zoom;
      // two membranes and the stroma
      ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.fillStyle = '#cfe8c3'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#3f8f4f'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(CX, CY, RX - 12, RY - 12, 0, 0, Math.PI * 2); ctx.fillStyle = '#e4f3dc'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#68a86b'; ctx.stroke();
      ctx.restore();
    }
    if (zoom >= 1) {
      // grana: stacks of thylakoids, joined by lamellae
      const stacks = [[680, 232], [800, 300], [690, 388]];
      const glowG = stage === 0 ? lit : stage === 2 ? 0.5 + 0.5 * Math.sin(t * 5) ** 2 : 0.25;
      ctx.save(); ctx.strokeStyle = '#4c9a57'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(680, 232); ctx.lineTo(800, 300); ctx.lineTo(690, 388); ctx.stroke();
      stacks.forEach(([x, y]) => {
        for (let i = 0; i < 5; i++) {
          const yy = y - 36 + i * 18;
          ctx.beginPath(); ctx.ellipse(x, yy, 48, 9, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${Math.round(60 + 60 * glowG)},${Math.round(140 + 50 * glowG)},${Math.round(70 + 20 * glowG)})`; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = GD; ctx.stroke();
        }
      });
      ctx.restore();
      text(L('Tilacoides'), 690, 160, { size: 22, color: GD });
      text(L('Estroma'), 905, 455, { size: 22, color: GD, weight: 600 });
      text(L('Cloroplasto'), CX, 118, { size: 26, color: GD, weight: 800 });
      if (stage === 0) { ctx.save(); ctx.globalAlpha = seg(p, 0.75, 1); text(L('Clorofila'), 800, 365, { size: 22, color: '#14532d' }); ctx.restore(); }
      // light into the grana
      if (stage === 0 || stage === 2) {
        ctx.save(); ctx.globalAlpha = stage === 0 ? seg(p, 0.75, 1) : seg(p, 0, 0.2); ctx.strokeStyle = '#f2b01e'; ctx.lineWidth = 3;
        [[600, 170, 652, 206], [610, 300, 642, 380], [870, 180, 820, 262]].forEach(([x0, y0, x1, y1], i) => {
          ctx.beginPath();
          for (let k = 0; k <= 20; k++) { const f = k / 20, nx = -(y1 - y0), ny = x1 - x0, ln = Math.hypot(nx, ny), w = Math.sin(f * 14 - t * 10 + i) * 6;
            ctx[k ? 'lineTo' : 'moveTo'](x0 + (x1 - x0) * f + nx / ln * w, y0 + (y1 - y0) * f + ny / ln * w); }
          ctx.stroke();
        });
        ctx.restore();
      }
      // the Calvin cycle: a wheel turning while it works
      const wx = 1062, wy = 288, wr = 82, turning = stage >= 3 ? 1 : 0.15;
      ctx.save();
      ctx.lineWidth = 10; ctx.strokeStyle = stage >= 3 ? '#b7791f' : 'rgba(183,121,31,.45)';
      const rot = t * 1.4 * turning;
      for (let k = 0; k < 3; k++) {
        const a0 = rot + k * 2 * Math.PI / 3, a1 = a0 + 2 * Math.PI / 3 - 0.45;
        ctx.beginPath(); ctx.arc(wx, wy, wr, a0, a1); ctx.stroke();
        const hx = wx + Math.cos(a1) * wr, hy = wy + Math.sin(a1) * wr, ta = a1 + Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(hx + Math.cos(ta) * 16, hy + Math.sin(ta) * 16); ctx.lineTo(hx + Math.cos(ta + 2.5) * 13, hy + Math.sin(ta + 2.5) * 13); ctx.lineTo(hx + Math.cos(ta - 2.5) * 13, hy + Math.sin(ta - 2.5) * 13); ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle; ctx.fill();
      }
      ctx.restore();
      text(L('Ciclo de Calvin'), wx, wy, { size: 23, color: '#7b4a06', maxW: 130 });
      // what goes in and out
      const w2 = on(1), w3 = on(2), w4 = on(3);
      stream('H₂O', 556, 312, 636, 312, WATER, w2, 1, 0.3);
      stream('CO₂', 1190, 150, 1080, 200, CO2C, w2, 2, 0.3);
      stream('O₂', 632, 214, 548, 196, OXY, w3, 1, 0.32);
      stream('ATP', 850, 268, 982, 258, ATPC, w3, 1, 0.3);
      stream('NADPH', 858, 326, 984, 316, NADC, w3, 1, 0.26);
      stream('ADP', 990, 362, 852, 370, 'rgba(221,107,32,.55)', w4, 1, 0.28);
      stream('NADP⁺', 1000, 395, 860, 410, 'rgba(128,90,213,.55)', w4, 1, 0.28);
      if (w4) for (let j = 0; j < 2; j++) { const f = (t * 0.3 + j / 2) % 1; hexagon(1062 + f * 70, 380 + f * 60, 16, w4 * Math.sin(f * Math.PI)); }
      if (w4) { ctx.save(); ctx.globalAlpha = w4; text(L('Glucosa'), 1150, 410, { size: 22, color: '#7b4a06' }); ctx.restore(); }
    }

    // ================= The balance =================
    if (stage === 4) {
      const k = seg(p, 0.05, 0.35);
      ctx.save(); ctx.globalAlpha = k;
      const eq = '6 CO₂ + 6 H₂O + ' + L('luz') + '  →  C₆H₁₂O₆ + 6 O₂';
      ctx.font = font(800, 30); const w = ctx.measureText(eq).width + 48;
      ctx.beginPath(); ctx.roundRect(CX - w / 2, 22, w, 56, 28); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = SUGAR; ctx.stroke();
      text(eq, CX, 51, { size: 30, weight: 800, color: INK, halo: false });
      ctx.restore();
    }
  },
};
