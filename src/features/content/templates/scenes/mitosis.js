// Mitosis, for «Animaciones explicativas» (templates/edu_anim.js): written by the AI («Animación con IA»,
// gemini-3.8-flash) and reviewed by hand — its drawn texts through L, so the example reads in every language.
export default {
  background: '#f8fafc',
  accent: '#2563eb',
  stages: [
    { name: 'Profase', caption: 'Los cromosomas se condensan, la envoltura nuclear se fragmenta y empieza a formarse el huso mitótico.', duration: 6 },
    { name: 'Metafase', caption: 'Los cromosomas, unidos a las fibras del huso, se alinean en la placa ecuatorial.', duration: 6 },
    { name: 'Anafase', caption: 'Las cromátidas hermanas se separan y cada una viaja hacia un polo opuesto.', duration: 6 },
    { name: 'Telofase y citocinesis', caption: 'Se forman dos núcleos nuevos y el citoplasma se divide: dos células hijas idénticas.', duration: 7 }
  ],
  words: ['Envoltura nuclear (se fragmenta)', 'Núcleos reconstruidos', 'Centrosoma', 'Polo celular', 'Placa ecuatorial (metafásica)', 'Fibras del huso', 'Separación de cromátidas hermanas', 'Surco de división (citocinesis)', 'Célula hija 1', 'Célula hija 2'],

  setup({ ctx, W, H }) {
    // Generate chromatin fiber paths deterministically
    const numPoints = 80;
    const chromatinLeft = [];
    const chromatinRight = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 4;
      const r = 18 + 26 * Math.sin(i * 1.7) * Math.cos(i * 0.9);
      chromatinLeft.push({
        dx: Math.cos(angle) * r + Math.sin(i * 2.3) * 12,
        dy: Math.sin(angle) * r + Math.cos(i * 1.5) * 12
      });
      chromatinRight.push({
        dx: Math.cos(angle + 1.2) * r + Math.sin(i * 2.1) * 12,
        dy: Math.sin(angle + 1.2) * r + Math.cos(i * 1.7) * 12
      });
    }

    // Chromosome static properties: colors, lengths, arm offsets
    const chromoMeta = [
      { color: '#dc2626', len: 38, y: 175, rot: 0.05 },
      { color: '#2563eb', len: 44, y: 235, rot: -0.08 },
      { color: '#16a34a', len: 36, y: 295, rot: 0.06 },
      { color: '#9333ea', len: 42, y: 355, rot: -0.04 }
    ];

    // Initial scattered positions in profase
    const proPos = [
      { x: 605, y: 210, rot: -0.45 },
      { x: 665, y: 225, rot: 0.35 },
      { x: 620, y: 310, rot: 0.5 },
      { x: 670, y: 320, rot: -0.3 }
    ];

    return { chromatinLeft, chromatinRight, chromoMeta, proPos };
  },

  draw({ ctx, stage, p, raw, t, W, H, setupData, L }) {
    ctx.clearRect(0, 0, W, H);
    const { chromatinLeft, chromatinRight, chromoMeta, proPos } = setupData;

    // Helpful easing helper
    const easeInOut = (v) => v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
    const ep = easeInOut(p);

    const centerY = 270;
    const centerX = 640;

    // Cell envelope geometry depending on stage
    // Stage 0-2: single oval; Stage 3: cleavage furrow pinches in
    let pinch = 0;
    let cellWidth = 520;
    let cellHeight = 360;

    if (stage === 2) {
      // Cell slightly elongates horizontally in Anaphase
      cellWidth = 520 + ep * 60;
    } else if (stage === 3) {
      cellWidth = 580;
      pinch = ep; // 0 to 1 pinch depth
    }

    // --- DRAW CELL MEMBRANE ---
    ctx.save();
    ctx.beginPath();
    if (pinch > 0.01) {
      // Pinching cell: the outline of two ellipses (the daughter cells) that start as the whole cell and draw apart,
      // joined smoothly at the furrow (a smooth maximum of their half-heights).
      const off = 150 * pinch, rx = 290 - 125 * pinch, ry = 180 - 30 * pinch;
      const half = x => {
        const e = c => { const u = (x - c) / rx; return Math.abs(u) < 1 ? ry * Math.sqrt(1 - u * u) : 0; };
        const a = e(centerX - off), b = e(centerX + off);
        const d = Math.abs(a - b), hh = 30;
        return Math.max(a, b) + (d < hh ? ((hh - d) * (hh - d)) / (4 * hh) * Math.min(1, Math.min(a, b) / 20) : 0);
      };
      const x0 = centerX - off - rx, x1 = centerX + off + rx, N = 160;
      ctx.moveTo(x0, centerY);
      for (let i = 1; i <= N; i++) { const x = x0 + (x1 - x0) * i / N; ctx.lineTo(x, centerY - half(x)); }
      for (let i = N - 1; i >= 0; i--) { const x = x0 + (x1 - x0) * i / N; ctx.lineTo(x, centerY + half(x)); }
    } else {
      ctx.ellipse(centerX, centerY, cellWidth / 2, cellHeight / 2, 0, 0, Math.PI * 2);
    }
    ctx.closePath();

    // Cytoplasm gradient
    const cytoGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 320);
    cytoGrad.addColorStop(0, '#f0fdf4');
    cytoGrad.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = cytoGrad;
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();
    ctx.restore();

    // --- CENTROSOMES & POLES ---
    // In profase, centrosomes migrate from upper center to left/right poles
    let poleLeftX, poleLeftY, poleRightX, poleRightY;
    if (stage === 0) {
      poleLeftX = centerX - 110 - ep * 110;
      poleLeftY = centerY - 130 + ep * 130;
      poleRightX = centerX + 70 + ep * 150;
      poleRightY = centerY - 130 + ep * 130;
    } else if (stage <= 2) {
      const stretch = (stage === 2) ? ep * 30 : 0;
      poleLeftX = centerX - 220 - stretch;
      poleLeftY = centerY;
      poleRightX = centerX + 220 + stretch;
      poleRightY = centerY;
    } else {
      // Stage 3: Centrosomes settle in daughter cell centers
      const leftShift = 145 * ep;
      poleLeftX = centerX - 250 + leftShift * 0.4;
      poleLeftY = centerY;
      poleRightX = centerX + 250 - leftShift * 0.4;
      poleRightY = centerY;
    }

    // Helper: draw centrosome & aster rays
    function drawCentrosome(cx, cy, label, labelAlign) {
      ctx.save();
      // Aster rays
      ctx.strokeStyle = '#fdba74';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + (t * 0.2);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * 16, cy + Math.sin(ang) * 16);
        ctx.stroke();
      }
      // Centriole pair
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(cx - 7, cy - 3, 14, 6);
      ctx.fillRect(cx - 3, cy - 7, 6, 14);
      ctx.restore();

      if (label) {
        ctx.font = '600 22px system-ui, sans-serif';
        ctx.fillStyle = '#9a3412';
        ctx.textAlign = labelAlign;
        ctx.fillText(label, cx + (labelAlign === 'right' ? -18 : 18), cy - 14);
      }
    }

    // --- NUCLEAR ENVELOPE (Profase & Telofase) ---
    if (stage === 0) {
      // Dissolving in Profase
      const nAlpha = Math.max(0, 1 - ep * 1.15);
      if (nAlpha > 0.02) {
        ctx.save();
        ctx.globalAlpha = nAlpha;
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 115, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(238, 242, 255, 0.45)';
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Nuclear envelope label
        if (nAlpha > 0.4) {
          ctx.save();
          ctx.globalAlpha = nAlpha;
          ctx.font = '600 22px system-ui, sans-serif';
          ctx.fillStyle = '#4338ca';
          ctx.textAlign = 'center';
          ctx.fillText(L('Envoltura nuclear (se fragmenta)'), centerX, centerY - 130, 380);
          ctx.restore();
        }
      }
    } else if (stage === 3) {
      // Re-forming in Telofase
      const nAlpha = Math.min(1, ep * 1.1);
      if (nAlpha > 0.05) {
        ctx.save();
        ctx.globalAlpha = nAlpha;
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#6366f1';
        // Left daughter nucleus
        const leftNucleusX = centerX - 150 * ep;
        const rightNucleusX = centerX + 150 * ep;
        ctx.beginPath();
        ctx.arc(leftNucleusX, centerY, 66, 0, Math.PI * 2);
        ctx.moveTo(rightNucleusX + 66, centerY);
        ctx.arc(rightNucleusX, centerY, 66, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(238, 242, 255, 0.5)';
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (nAlpha > 0.6) {
          ctx.save();
          ctx.font = '600 22px system-ui, sans-serif';
          ctx.fillStyle = '#4338ca';
          ctx.textAlign = 'center';
          ctx.fillText(L('Núcleos reconstruidos'), centerX, centerY - 178);
          ctx.restore();
        }
      }
    }

    // --- CHROMOSOME & SPINDLE FIBER LOGIC ---
    // Helper to draw single chromatid curved bar
    function drawChromatid(cx, cy, length, angle, bendX, color, width = 9) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-bendX, -length / 2);
      ctx.quadraticCurveTo(0, 0, -bendX, length / 2);
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    }

    // Helper to draw kinetochore/centromere dot
    function drawCentromere(cx, cy) {
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }

    // Compute Chromosome / Chromatid Positions
    for (let i = 0; i < 4; i++) {
      const meta = chromoMeta[i];
      const pro = proPos[i];

      if (stage === 0) {
        // Profase: chromosomes condensing and migrating to equator
        const curX = pro.x + (centerX - pro.x) * (ep * 0.4);
        const curY = pro.y + (meta.y - pro.y) * (ep * 0.4);
        const curRot = pro.rot + (meta.rot - pro.rot) * (ep * 0.4);

        // Weak emerging spindle fibers toward chromosomes near end of stage
        if (ep > 0.3) {
          const fiberAlpha = (ep - 0.3) * 0.7;
          ctx.save();
          ctx.strokeStyle = `rgba(59, 130, 246, ${fiberAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(poleLeftX, poleLeftY);
          ctx.lineTo(curX - 4, curY);
          ctx.moveTo(poleRightX, poleRightY);
          ctx.lineTo(curX + 4, curY);
          ctx.stroke();
          ctx.restore();
        }

        // Draw condensed X-chromosome (two sister chromatids crossed/joined)
        drawChromatid(curX, curY, meta.len, curRot - 0.22, 0, meta.color);
        drawChromatid(curX, curY, meta.len, curRot + 0.22, 0, meta.color);
        drawCentromere(curX, curY);

      } else if (stage === 1) {
        // Metafase: migrating and perfectly lining up at equatorial plate
        const startX = pro.x + (centerX - pro.x) * 0.4;
        const startY = pro.y + (meta.y - pro.y) * 0.4;
        const startRot = pro.rot + (meta.rot - pro.rot) * 0.4;

        const curX = startX + (centerX - startX) * ep;
        const curY = startY + (meta.y - startY) * ep;
        const curRot = startRot + (0 - startRot) * ep;

        // Spindle fibers fully attached to kinetochores
        ctx.save();
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(poleLeftX, poleLeftY);
        ctx.lineTo(curX - 4, curY);
        ctx.moveTo(poleRightX, poleRightY);
        ctx.lineTo(curX + 4, curY);
        ctx.stroke();
        ctx.restore();

        // Chromosome aligned (vertical sister chromatids)
        drawChromatid(curX - 2, curY, meta.len, curRot - 0.12, 1.5, meta.color);
        drawChromatid(curX + 2, curY, meta.len, curRot + 0.12, -1.5, meta.color);
        drawCentromere(curX, curY);

      } else if (stage === 2) {
        // Anafase: sister chromatids separated and pulling apart
        const sepDist = ep * 180; // Distance pulled toward poles
        const leftX = centerX - sepDist;
        const rightX = centerX + sepDist;
        const yPos = meta.y;

        // Spindle fibers shortening
        ctx.save();
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(poleLeftX, poleLeftY);
        ctx.lineTo(leftX, yPos);
        ctx.moveTo(poleRightX, poleRightY);
        ctx.lineTo(rightX, yPos);
        ctx.stroke();
        ctx.restore();

        // Chromatids bend backwards like 'V' shapes facing their respective poles
        // Left chromatid: pointed towards left (-X)
        drawChromatid(leftX, yPos, meta.len, 0, 8, meta.color);
        drawCentromere(leftX - 4, yPos);

        // Right chromatid: pointed towards right (+X)
        drawChromatid(rightX, yPos, meta.len, 0, -8, meta.color);
        drawCentromere(rightX + 4, yPos);

      } else if (stage === 3) {
        // Telofase: chromatids arrive at poles and decondense into chromatin
        const leftNucleusX = centerX - 150 * ep;
        const rightNucleusX = centerX + 150 * ep;
        const startLeftX = centerX - 180;
        const startRightX = centerX + 180;

        const curLeftX = startLeftX + (leftNucleusX - startLeftX) * ep;
        const curRightX = startRightX + (rightNucleusX - startRightX) * ep;
        const yPos = centerY + (meta.y - centerY) * (1 - ep * 0.7);

        const fadeChromatid = Math.max(0, 1 - ep * 1.1);

        if (fadeChromatid > 0.05) {
          ctx.save();
          ctx.globalAlpha = fadeChromatid;
          drawChromatid(curLeftX, yPos, meta.len, 0, 8 * (1 - ep), meta.color);
          drawChromatid(curRightX, yPos, meta.len, 0, -8 * (1 - ep), meta.color);
          drawCentromere(curLeftX, yPos);
          drawCentromere(curRightX, yPos);
          ctx.restore();
        }
      }
    }

    // --- CHROMATIN IN TELOFASE (stage 3) ---
    if (stage === 3 && ep > 0.15) {
      const decondenseAlpha = Math.min(0.9, (ep - 0.15) * 1.2);
      ctx.save();
      ctx.globalAlpha = decondenseAlpha;
      ctx.lineWidth = 2;

      // Draw diffuse chromatin threads inside new left & right nuclei
      const leftNucleusX = centerX - 150 * ep;
      const rightNucleusX = centerX + 150 * ep;

      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();
      for (let i = 0; i < chromatinLeft.length; i++) {
        const pt = chromatinLeft[i];
        if (i === 0) ctx.moveTo(leftNucleusX + pt.dx, centerY + pt.dy);
        else ctx.lineTo(leftNucleusX + pt.dx, centerY + pt.dy);
      }
      ctx.stroke();

      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      for (let i = 0; i < chromatinRight.length; i++) {
        const pt = chromatinRight[i];
        if (i === 0) ctx.moveTo(rightNucleusX + pt.dx, centerY + pt.dy);
        else ctx.lineTo(rightNucleusX + pt.dx, centerY + pt.dy);
      }
      ctx.stroke();

      ctx.restore();
    }

    // --- DRAW CENTROSOMES ON TOP ---
    drawCentrosome(poleLeftX, poleLeftY, stage === 0 ? L('Centrosoma') : stage < 3 ? L('Polo celular') : '', 'right');
    drawCentrosome(poleRightX, poleRightY, stage === 0 ? L('Centrosoma') : stage < 3 ? L('Polo celular') : '', 'left');

    // --- INFORMATIVE LABELS & DIAGRAM MARKS ---
    ctx.save();

    if (stage === 1) {
      // Equatorial plate guide dashed line
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 140);
      ctx.lineTo(centerX, centerY + 140);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label Placa Ecuatorial
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(L('Placa ecuatorial (metafásica)'), centerX, centerY - 150);

      // Label Huso Mitótico
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.fillStyle = '#1e40af';
      ctx.textAlign = 'left';
      ctx.fillText(L('Fibras del huso'), centerX + 75, centerY + 130);
      ctx.beginPath();
      ctx.moveTo(centerX + 70, centerY + 125);
      ctx.lineTo(centerX + 40, centerY + 95);
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 1.5;
      ctx.stroke();

    } else if (stage === 2) {
      // Label separation motion
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(L('Separación de cromátidas hermanas'), centerX, centerY - 150);

      // Arrows indicating pulling direction
      const arrowDist = 90 + ep * 30;
      ctx.fillStyle = '#2563eb';
      // Left arrow
      ctx.beginPath();
      ctx.moveTo(centerX - arrowDist, centerY - 110);
      ctx.lineTo(centerX - arrowDist - 25, centerY - 110);
      ctx.lineTo(centerX - arrowDist - 25, centerY - 116);
      ctx.lineTo(centerX - arrowDist - 40, centerY - 105);
      ctx.lineTo(centerX - arrowDist - 25, centerY - 94);
      ctx.lineTo(centerX - arrowDist - 25, centerY - 100);
      ctx.lineTo(centerX - arrowDist, centerY - 100);
      ctx.closePath();
      ctx.fill();

      // Right arrow
      ctx.beginPath();
      ctx.moveTo(centerX + arrowDist, centerY - 110);
      ctx.lineTo(centerX + arrowDist + 25, centerY - 110);
      ctx.lineTo(centerX + arrowDist + 25, centerY - 116);
      ctx.lineTo(centerX + arrowDist + 40, centerY - 105);
      ctx.lineTo(centerX + arrowDist + 25, centerY - 94);
      ctx.lineTo(centerX + arrowDist + 25, centerY - 100);
      ctx.lineTo(centerX + arrowDist, centerY - 100);
      ctx.closePath();
      ctx.fill();

    } else if (stage === 3) {
      // Cleavage furrow label
      if (pinch > 0.25) {
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(L('Surco de división (citocinesis)'), centerX, centerY + 236);
        ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(centerX, centerY + 212); ctx.lineTo(centerX, centerY + (180 - 30 * pinch) * Math.sqrt(Math.max(0, 1 - Math.pow(150 * pinch / (290 - 125 * pinch), 2))) + 10); ctx.stroke(); ctx.restore();

        // Two daughter cells labels at the end
        if (ep > 0.65) {
          ctx.font = 'bold 22px system-ui, sans-serif';
          ctx.fillStyle = '#0369a1';
          ctx.fillText(L('Célula hija 1'), centerX - 150, centerY + 186);
          ctx.fillText(L('Célula hija 2'), centerX + 150, centerY + 186);
        }
      }
    }

    ctx.restore();
  }
};
