// The Pythagorean theorem, shown and proved, for «Animaciones explicativas» (templates/edu_anim.js): written by hand
// for Revela's AI-animation player (features/content/aianim.js) — its drawn texts through L, so it reads in every
// language. Left, the 3-4-5 triangle with a square on each side and its cells counted (9 + 16 = 25); right, the classic
// proof by rearrangement: four equal triangles in a square of side a + b leave free c² … or, moved, a² + b².
export default {
  background: '#f6f3ec',
  accent: '#c2410c',
  stages: [
    { name: 'El triángulo', caption: 'Un triángulo rectángulo: los catetos miden a = 3 y b = 4; la hipotenusa c es el lado opuesto al ángulo recto.', duration: 5 },
    { name: 'Un cuadrado en cada lado', caption: 'Sobre cada lado levantamos un cuadrado: sus áreas son a², b² y c².', duration: 5 },
    { name: 'Contar casillas', caption: 'Contamos casillas: 9 en el cuadrado de a, 16 en el de b… y 25 en el de c.', duration: 7 },
    { name: 'Mover las piezas', caption: 'Cuatro triángulos iguales en un cuadrado de lado a + b: el hueco libre es c²… y, al moverlos, a² + b².', duration: 8 },
    { name: 'a² + b² = c²', caption: 'El hueco no cambia de área al mover las piezas: en todo triángulo rectángulo, a² + b² = c².', duration: 6 },
  ],
  words: ['cateto', 'hipotenusa', 'casillas', 'lado'],
  draw({ ctx, stage, p, t, data, L }) {
    const INK = '#26221c', A = '#2563eb', B = '#059669', C = '#ea580c', PAPER = '#fffdf8';
    const clamp = x => Math.max(0, Math.min(1, x));
    const seg = (x, a, b) => clamp((x - a) / (b - a));
    const ease = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const rgba = (hex, al) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${al})`; };
    // How far each thing has come: 1 once its stage is past.
    const at = k => (stage > k ? 1 : stage === k ? p : 0);
    const sq = at(1), cnt = at(2), mv = at(3), eq = at(4);

    // ---- Left: the triangle (right angle R, leg a up, leg b to the right) and its squares ----
    const u = 47, R = { x: 214, y: 352 };
    const P = (x, y) => ({ x: R.x + x * u, y: R.y - y * u });          // (units, y up)
    const Ap = P(0, 3), Bp = P(4, 0);
    const poly = (pts) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); };
    const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    // A square on the side from s to e, raised outwards (dir: the outward unit normal in units) by k (0…1).
    function square(s, e, nx, ny, side, col, k, filled) {
      if (k <= 0) return;
      const off = { x: nx * side * u * k, y: -ny * side * u * k };
      const q = [s, e, { x: e.x + off.x, y: e.y + off.y }, { x: s.x + off.x, y: s.y + off.y }];
      ctx.save();
      poly(q); ctx.fillStyle = rgba(col, 0.12); ctx.fill();
      // its cells: side × side, those counted filled
      const ux = { x: (e.x - s.x) / side, y: (e.y - s.y) / side }, uy = { x: off.x / (side * k), y: off.y / (side * k) };
      for (let i = 0; i < side; i++) for (let j = 0; j < side; j++) {
        const idx = j * side + i;
        if (idx < filled) {
          const o = { x: s.x + ux.x * i + uy.x * j * k, y: s.y + ux.y * i + uy.y * j * k };
          poly([o, { x: o.x + ux.x, y: o.y + ux.y }, { x: o.x + ux.x + uy.x * k, y: o.y + ux.y + uy.y * k }, { x: o.x + uy.x * k, y: o.y + uy.y * k }]);
          ctx.fillStyle = rgba(col, 0.42); ctx.fill();
        }
      }
      ctx.strokeStyle = rgba(col, 0.35); ctx.lineWidth = 1.2;
      for (let i = 1; i < side; i++) {
        ctx.beginPath(); ctx.moveTo(s.x + ux.x * i, s.y + ux.y * i); ctx.lineTo(s.x + ux.x * i + off.x, s.y + ux.y * i + off.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.x + uy.x * i * k, s.y + uy.y * i * k); ctx.lineTo(e.x + uy.x * i * k, e.y + uy.y * i * k); ctx.stroke();
      }
      poly(q); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      return { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
    }
    function label(txt, x, y, col, size, bold) {
      ctx.save(); ctx.font = `${bold ? 800 : 600} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6; ctx.strokeStyle = PAPER; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y);
      ctx.fillStyle = col; ctx.fillText(txt, x, y); ctx.restore();
    }
    // the counting: a's 9 cells, then b's 16, then c's 25
    const fa = Math.round(seg(cnt, 0, 0.25) * 9), fb = Math.round(seg(cnt, 0.28, 0.6) * 16), fc = Math.round(seg(cnt, 0.64, 0.97) * 25);
    const ka = ease(seg(sq, 0, 0.45)), kb = ease(seg(sq, 0.2, 0.65)), kc = ease(seg(sq, 0.45, 1));
    const ca = square(R, Ap, -1, 0, 3, A, ka, fa);                     // on a, to the left
    const cb = square(Bp, R, 0, -1, 4, B, kb, fb);                     // on b, below
    const cc = square(Ap, Bp, 0.6, 0.8, 5, C, kc, fc);                 // on c, outwards (3/5, 4/5)
    // the triangle
    const tri = ease(seg(at(0), 0, 0.5));
    ctx.save(); ctx.globalAlpha = tri;
    poly([R, lerp(R, Ap, tri), lerp(R, Bp, tri)]); ctx.fillStyle = '#fde7c7'; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeRect(R.x, R.y - 22, 22, 22);       // (the right angle)
    ctx.restore();
    // the sides' names, until the squares cover them
    const lab = seg(at(0), 0.45, 0.9) * (1 - seg(sq, 0, 0.3));
    if (lab > 0) {
      ctx.save(); ctx.globalAlpha = lab;
      const hx = (Ap.x + Bp.x) / 2 + 0.6 * 74, hy = (Ap.y + Bp.y) / 2 - 0.8 * 74;
      label('a = 3', R.x - 62, R.y - 1.5 * u - 14, A, 28, true); label(L('cateto'), R.x - 62, R.y - 1.5 * u + 18, A, 22, false);
      label('b = 4', R.x + 2 * u, R.y + 30, B, 28, true); label(L('cateto'), R.x + 2 * u, R.y + 60, B, 22, false);
      label('c = 5', hx, hy - 14, C, 28, true); label(L('hipotenusa'), hx, hy + 18, C, 22, false);
      ctx.restore();
    }
    // the areas in each square: a², or once counted, a² = 9
    const area = (c, sym, n, full, col, f) => { if (!c || f <= 0) return; ctx.save(); ctx.globalAlpha = f; label(n ? `${sym} = ${n}` : sym, c.x, c.y, col, n ? 30 : 34, true); ctx.restore(); };
    area(ca, 'a²', fa, 9, A, seg(sq, 0.35, 0.6));
    area(cb, 'b²', fb, 16, B, seg(sq, 0.5, 0.75));
    area(cc, 'c²', fc, 25, C, seg(sq, 0.75, 1));
    if (stage === 2) {                                                   // the running count, on the right
      ctx.save(); ctx.globalAlpha = seg(cnt, 0, 0.08);
      label(L('casillas'), 965, 190, INK, 30, false);
      label(String(fa), 790, 290, A, 76, true);
      if (fb) { label('+', 862, 290, INK, 60, true); label(String(fb), 950, 290, B, 76, true); }
      if (fc) { label('=', 1045, 290, INK, 60, true); label(String(fc), 1140, 290, C, 76, true); }
      if (fc === 25) { ctx.globalAlpha = seg(cnt, 0.97, 1); label('a² + b² = c² ?', 965, 400, INK, 36, true); }
      ctx.restore();
    }

    // ---- Right: the proof by rearrangement, in a square of side a + b = 7 ----
    if (mv > 0 || eq > 0) {
      const v = 54, X0 = 760, Y0 = 158, S = 7 * v;
      const show = ease(seg(mv, 0, 0.18));
      ctx.save(); ctx.globalAlpha = show;
      ctx.fillStyle = PAPER; ctx.fillRect(X0, Y0, S, S);
      // the free area, coloured: c² tilted first, then a² and b²
      const slide = ease(seg(mv, 0.4, 0.86));
      const Q = (x, y) => ({ x: X0 + x * v, y: Y0 + y * v });
      ctx.save(); ctx.globalAlpha = show * (1 - slide);
      poly([Q(4, 0), Q(7, 4), Q(3, 7), Q(0, 3)]); ctx.fillStyle = rgba(C, 0.28); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = show * slide;
      ctx.fillStyle = rgba(A, 0.28); ctx.fillRect(X0, Y0, 3 * v, 3 * v);
      ctx.fillStyle = rgba(B, 0.28); ctx.fillRect(X0 + 3 * v, Y0 + 3 * v, 4 * v, 4 * v);
      ctx.restore();
      // the four triangles: right angle at r, leg b (4) along angle th, leg a (3) at th + 90° (y down) — each one only
      // slides from where it is in the first square to where it is in the second
      const T = [[[0, 0], [3, 0], 0], [[7, 0], [3, 3], 90], [[7, 7], [7, 3], 180], [[0, 7], [0, 7], 270]];
      T.forEach(([r0, r1, th], i) => {
        const w = ease(seg(mv, 0.38 + i * 0.16, 0.52 + i * 0.16));      // (one at a time; the last one stays)
        const r = Q(r0[0] + (r1[0] - r0[0]) * w, r0[1] + (r1[1] - r0[1]) * w), rad = th * Math.PI / 180;
        const pb = { x: r.x + Math.cos(rad) * 4 * v, y: r.y + Math.sin(rad) * 4 * v }, pa = { x: r.x - Math.sin(rad) * 3 * v, y: r.y + Math.cos(rad) * 3 * v };
        poly([r, pb, pa]); ctx.fillStyle = '#fde7c7'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      });
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeRect(X0, Y0, S, S);
      // its side: a + b
      ctx.strokeStyle = rgba(INK, 0.55); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X0, Y0 - 22); ctx.lineTo(X0 + S, Y0 - 22); ctx.moveTo(X0, Y0 - 30); ctx.lineTo(X0, Y0 - 14); ctx.moveTo(X0 + S, Y0 - 30); ctx.lineTo(X0 + S, Y0 - 14); ctx.stroke();
      label(`${L('lado')} a + b = 7`, X0 + S / 2, Y0 - 24, INK, 24, true);
      // what the hole is
      label('c²', X0 + 3.5 * v, Y0 + 3.5 * v, C, 44 * (1 - slide) + 0.01, true);
      if (slide > 0.5) { ctx.save(); ctx.globalAlpha = seg(slide, 0.5, 1); label('a²', X0 + 1.5 * v, Y0 + 1.5 * v, A, 40, true); label('b²', X0 + 5 * v, Y0 + 5 * v, B, 44, true); ctx.restore(); }
      ctx.restore();
      // the conclusion, over the square
      if (eq > 0) {
        const k = ease(seg(eq, 0, 0.5));
        ctx.save(); ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(255,253,248,.94)'; ctx.strokeStyle = C; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(X0 - 70, Y0 + 92, S + 140, 190, 22); ctx.fill(); ctx.stroke();
        label('a² + b² = c²', X0 + S / 2, Y0 + 158, INK, 62, true);
        const k2 = seg(eq, 0.45, 0.8);
        ctx.globalAlpha = k * k2;
        label('3² + 4² = 9 + 16 = 25 = 5²', X0 + S / 2, Y0 + 232, C, 32, true);
        ctx.restore();
      }
    }
  },
};
