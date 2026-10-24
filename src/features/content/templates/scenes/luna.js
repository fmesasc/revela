// The phases of the Moon, for «Animaciones explicativas» (templates/edu_anim.js): written by hand in the format the
// AI writes («Animación con IA») — its drawn texts through L, so the example reads in every language.
// Left, seen from above the North Pole (not to scale): the Sun's light from the left, the Earth and the Moon going
// round it anticlockwise, the half of each that faces the Sun lit. Right, the same Moon as it is seen from the
// Earth's northern hemisphere: the lit part between the limb and the terminator, an ellipse whose width is
// cos(elongation); the lit fraction (1 − cos e) / 2 and the day of the 29.5-day cycle under it.
export default {
  background: '#0b1630',
  accent: '#a8740a',
  stages: [
    { name: 'Luna nueva', caption: 'La Luna pasa entre la Tierra y el Sol: su cara iluminada mira al Sol y desde aquí no la vemos.', duration: 6 },
    { name: 'Cuarto creciente', caption: 'Avanza en su órbita y cada noche vemos más cara iluminada: a la semana, la mitad derecha.', duration: 7 },
    { name: 'Luna llena', caption: 'La Tierra queda entre el Sol y la Luna: vemos iluminada toda la cara que nos mira.', duration: 7 },
    { name: 'Cuarto menguante', caption: 'La parte iluminada disminuye: a las tres semanas vemos solo la mitad izquierda.', duration: 7 },
    { name: 'Vuelta a empezar', caption: 'La Luna completa el ciclo de fases en unos 29,5 días y vuelve a ser luna nueva.', duration: 7 },
  ],
  words: ['Vista desde el espacio (no a escala)', 'Luz del Sol', 'Tierra', 'Luna nueva', 'Cuarto creciente', 'Luna llena', 'Cuarto menguante',
    'Así la vemos desde la Tierra', '(hemisferio norte)', 'Iluminada: {n} %', 'Día {d} del ciclo', 'La mitad que mira al Sol siempre está iluminada'],

  setup() {
    // Stars and the Moon's seas: fixed, so every frame (and every run) is the same.
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const stars = [];
    for (let i = 0; i < 140; i++) stars.push({ x: rnd() * 1280, y: rnd() * 560, r: 0.6 + rnd() * 1.6, tw: rnd() * 6.28 });
    const seas = [[-0.35, -0.3, 0.32], [0.05, -0.38, 0.22], [0.25, -0.05, 0.26], [-0.2, 0.15, 0.2], [0.1, 0.42, 0.16], [-0.5, 0.25, 0.14]];
    const craters = [];
    for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 0.85; craters.push([Math.cos(a) * d, Math.sin(a) * d, 0.03 + rnd() * 0.06]); }
    return { stars, seas, craters };
  },

  draw({ ctx, stage, p, t, W, H, data, L }) {
    const TAU = Math.PI * 2, D2R = Math.PI / 180;
    // Elongation (Sun–Earth–Moon angle) of each stage: from where it starts to the phase it is named after.
    const from = [-40, 0, 90, 180, 270][stage], to = [0, 90, 180, 270, 360][stage];
    const e = from + (to - from) * p;
    const er = e * D2R, cosE = Math.cos(er);
    const lit = (1 - cosE) / 2;

    // --- The sky ---
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b1630'); sky.addColorStop(1, '#121f3d');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (const s of data.stars) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + s.tw);
      ctx.fillStyle = '#dfe8ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // (The two halves apart.)
    ctx.strokeStyle = 'rgba(160,180,230,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(735, 40); ctx.lineTo(735, 540); ctx.stroke();

    const label = (txt, x, y, { size = 22, color = '#e6ecfa', align = 'center', weight = 600, max } = {}) => {
      ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
      max ? ctx.fillText(txt, x, y, max) : ctx.fillText(txt, x, y);
    };

    // --- Left: from above ---
    const cx = 450, cy = 300, R = 175;
    label(L('Vista desde el espacio (no a escala)'), 60, 48, { align: 'left', size: 22, color: '#aab8dc', max: 560 });

    // The Sun's light, from the left.
    for (let i = 0; i < 6; i++) {
      const y = 140 + i * 66, off = ((t * 60) + i * 23) % 60;
      const grad = ctx.createLinearGradient(20, y, 200, y);
      grad.addColorStop(0, 'rgba(255,214,102,0.9)'); grad.addColorStop(1, 'rgba(255,214,102,0.05)');
      ctx.strokeStyle = grad; ctx.lineWidth = 3; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -off;
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(200, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,214,102,0.35)';
      ctx.beginPath(); ctx.moveTo(206, y); ctx.lineTo(194, y - 6); ctx.lineTo(194, y + 6); ctx.closePath(); ctx.fill();
    }
    label('☀ ' + L('Luz del Sol'), 24, 102, { align: 'left', size: 22, color: '#ffd666', weight: 700, max: 220 });

    // The orbit, its direction and the eight places.
    ctx.strokeStyle = 'rgba(170,190,240,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const at = deg => { const a = (180 + deg) * D2R; return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; };
    for (let k = 0; k < 8; k++) {
      const [x, y] = at(k * 45);
      ctx.fillStyle = 'rgba(170,190,240,0.35)'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
    }
    // (anticlockwise, seen from the north: an arrowhead on the orbit, ahead of the Moon)
    {
      const a = (180 + e + 28) * D2R, x = cx + R * Math.cos(a), y = cy - R * Math.sin(a);
      const tx = -Math.sin(a), ty = -Math.cos(a);          // (direction of motion on screen)
      ctx.fillStyle = 'rgba(242,193,78,0.85)';
      ctx.beginPath(); ctx.moveTo(x + tx * 12, y + ty * 12); ctx.lineTo(x - tx * 6 + ty * 8, y - ty * 6 - tx * 8); ctx.lineTo(x - tx * 6 - ty * 8, y - ty * 6 + tx * 8); ctx.closePath(); ctx.fill();
    }
    // The four phases by their places; the one this stage goes to, lit up.
    const names = [[0, L('Luna nueva'), -1, 0], [90, L('Cuarto creciente'), 0, 1], [180, L('Luna llena'), 1, 0], [270, L('Cuarto menguante'), 0, -1]];
    for (const [deg, name, dx, dy] of names) {
      const [x, y] = at(deg), on = ((to % 360) === deg);
      const lx = x + dx * 40, ly = y + dy * 44;
      label(name, lx, ly, { size: 22, weight: on ? 800 : 600, color: on ? '#f2c14e' : 'rgba(214,224,250,0.6)', align: dx < 0 ? 'right' : dx > 0 ? 'left' : 'center', max: 210 });
    }

    // The Earth: its day side towards the Sun.
    const er2 = 44;
    const eg = ctx.createRadialGradient(cx - 14, cy - 12, 6, cx, cy, er2);
    eg.addColorStop(0, '#5fb0ff'); eg.addColorStop(1, '#1d5fbf');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, er2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4caf6a';
    for (const [ox, oy, rr] of [[-14, -10, 14], [10, 12, 11], [16, -16, 8], [-6, 20, 7]]) { ctx.beginPath(); ctx.arc(cx + ox, cy + oy, rr, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(5,10,30,0.62)';
    ctx.beginPath(); ctx.arc(cx, cy, er2, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    label(L('Tierra'), cx, cy + er2 + 22, { size: 22, color: '#cfe0ff', weight: 700 });

    // The line of sight, and the Moon: its half towards the Sun lit.
    const [mx, my] = at(e), mr = 24;
    ctx.strokeStyle = 'rgba(242,193,78,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
    const ang = Math.atan2(my - cy, mx - cx);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * (er2 + 4), cy + Math.sin(ang) * (er2 + 4)); ctx.lineTo(mx - Math.cos(ang) * (mr + 4), my - Math.sin(ang) * (mr + 4)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#39445e'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = '#eef0f4'; ctx.beginPath(); ctx.arc(mx, my, mr, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(mx, my, mr + 5, 0, TAU); ctx.stroke();

    label(L('La mitad que mira al Sol siempre está iluminada'), 60, 548, { align: 'left', size: 20, color: '#aab8dc', weight: 500, max: 650 });

    // --- Right: from the Earth ---
    const vx = 1010, vy = 280, vr = 150;
    label(L('Así la vemos desde la Tierra'), vx, 48, { size: 24, weight: 700, color: '#e6ecfa', max: 500 });
    label(L('(hemisferio norte)'), vx, 80, { size: 20, color: '#aab8dc', weight: 500, max: 500 });
    // glow when much is lit
    const glow = ctx.createRadialGradient(vx, vy, vr * 0.8, vx, vy, vr * 1.5);
    glow.addColorStop(0, `rgba(255,240,200,${0.25 * lit})`); glow.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(vx, vy, vr * 1.5, 0, TAU); ctx.fill();
    // the dark disc (a little earthshine)
    ctx.fillStyle = '#26314a'; ctx.beginPath(); ctx.arc(vx, vy, vr, 0, TAU); ctx.fill();
    // the lit part: between the limb and the terminator
    const m = ((e % 360) + 360) % 360, cm = Math.cos(m * D2R);
    ctx.save();
    ctx.beginPath();
    const N = 90;
    for (let i = 0; i <= N; i++) {               // limb, top to bottom
      const yy = -vr + (2 * vr * i) / N, w = Math.sqrt(Math.max(0, vr * vr - yy * yy));
      const x = m < 180 ? vx + w : vx - w;
      i ? ctx.lineTo(x, vy + yy) : ctx.moveTo(x, vy + yy);
    }
    for (let i = N; i >= 0; i--) {               // terminator, bottom to top
      const yy = -vr + (2 * vr * i) / N, w = Math.sqrt(Math.max(0, vr * vr - yy * yy));
      const x = m < 180 ? vx + cm * w : vx - cm * w;
      ctx.lineTo(x, vy + yy);
    }
    ctx.closePath();
    ctx.clip();
    const mg = ctx.createRadialGradient(vx - 30, vy - 40, 10, vx, vy, vr);
    mg.addColorStop(0, '#fbfaf3'); mg.addColorStop(1, '#d9d6c8');
    ctx.fillStyle = mg; ctx.fillRect(vx - vr, vy - vr, vr * 2, vr * 2);
    ctx.fillStyle = 'rgba(120,124,140,0.30)';
    for (const [sx, sy, sr] of data.seas) { ctx.beginPath(); ctx.arc(vx + sx * vr, vy + sy * vr, sr * vr, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(110,112,128,0.35)'; ctx.lineWidth = 1.5;
    for (const [sx, sy, sr] of data.craters) { ctx.beginPath(); ctx.arc(vx + sx * vr, vy + sy * vr, sr * vr, 0, TAU); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,210,240,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(vx, vy, vr, 0, TAU); ctx.stroke();

    // How much is lit, and which day of the cycle.
    const day = Math.floor((e < 0 ? e + 360 : e) / 360 * 29.5);
    label(L('Iluminada: {n} %').replace('{n}', Math.round(lit * 100)), vx, vy + vr + 42, { size: 26, weight: 800, color: '#f2c14e', max: 480 });
    label(L('Día {d} del ciclo').replace('{d}', String(day)), vx, vy + vr + 80, { size: 22, color: '#cfd8ef', weight: 600, max: 480 });
  },
};
