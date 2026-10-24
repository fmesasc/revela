// The four-stroke engine, for «Animaciones explicativas» (templates/edu_anim.js): written by the AI («Animación con IA»,
// gemini-3.8-flash) and reviewed by hand — its drawn texts through L, so the example reads in every language.
export default {
  background: '#F8FAFC',
  accent: '#EA580C',
  stages: [
    { name: 'Admisión', caption: 'Se abre la válvula de admisión y el pistón, al bajar, aspira la mezcla de aire y gasolina.', duration: 5 },
    { name: 'Compresión', caption: 'Con las dos válvulas cerradas, el pistón sube y comprime la mezcla.', duration: 5 },
    { name: 'Combustión', caption: 'La chispa de la bujía inflama la mezcla y los gases empujan el pistón: el único tiempo que da trabajo.', duration: 5 },
    { name: 'Escape', caption: 'Se abre la válvula de escape y el pistón, al subir, expulsa los gases quemados.', duration: 5 }
  ],
  words: ['Ciclo de cuatro tiempos', 'Motor de combustión interna', 'Admisión', 'Compresión', 'Combustión', 'Escape', 'Baja: entra la mezcla', 'Sube: comprime la mezcla', 'Chispa: los gases empujan', 'Sube: salen los gases', 'Componentes principales', 'Bujía', 'Válvula de admisión', 'Válvula de escape', 'Cámara de combustión', 'Pistón y biela', 'Cigüeñal', 'Hace saltar la chispa', 'Deja entrar aire y gasolina', 'Deja salir los gases quemados', 'Espacio sobre el pistón', 'Llevan el empuje al cigüeñal', 'Convierte el vaivén en giro', 'Giro del cigüeñal (2 vueltas = 720°)', 'Baja', 'Sube', 'Aire + gasolina', 'Gases de escape'],

  setup({ ctx, W, H }) {
    // Precompute particles for air-fuel mixture & exhaust flow
    const intakeParticles = [];
    for (let i = 0; i < 40; i++) {
      intakeParticles.push({
        x: Math.sin(i * 99) * 20,
        y: (i * 13) % 180,
        r: 3 + (i % 3),
        phase: (i * 0.23) % 1
      });
    }

    const exhaustParticles = [];
    for (let i = 0; i < 40; i++) {
      exhaustParticles.push({
        x: Math.cos(i * 77) * 20,
        y: (i * 17) % 180,
        r: 3 + (i % 4),
        phase: (i * 0.19) % 1
      });
    }

    return { intakeParticles, exhaustParticles };
  },

  draw({ ctx, stage, p, raw, t, W, H, setupData, L }) {
    // Background clear
    ctx.clearRect(0, 0, W, H);

    // Mechanical layout parameters
    const cx = 560;          // Center X of cylinder
    const cylTopY = 130;     // Cylinder head inside ceiling
    const cylWidth = 230;    // Inside cylinder bore
    const cylHeight = 270;   // Cylinder stroke travel span
    const strokeLen = 130;   // Piston travel distance (TDC to BDC)
    const tdcPistonY = 190;  // Piston top at TDC (Top Dead Center)
    const bdcPistonY = tdcPistonY + strokeLen; // Piston top at BDC
    const pistonH = 75;      // Piston height
    const crankCenterY = 485;// Crankshaft center
    const crankR = strokeLen / 2; // 65px crank radius
    const rodLen = 175;      // Connecting rod length

    // Calculate crank angle and piston position purely from stage & p
    // Cycle angles: Stage 0: 0 -> pi; Stage 1: pi -> 2pi; Stage 2: 2pi -> 3pi; Stage 3: 3pi -> 4pi
    const totalAngle = (stage + p) * Math.PI; // 0 to 4*pi
    const crankAngle = totalAngle - Math.PI / 2; // Start TDC at top (-pi/2)

    // Crank pin position
    const crankPinX = cx + crankR * Math.cos(crankAngle);
    const crankPinY = crankCenterY + crankR * Math.sin(crankAngle);

    // Wrist pin position (wristPinX = cx, wristPinY = crankPinY - sqrt(rodLen^2 - (cx - crankPinX)^2))
    const dx = cx - crankPinX;
    const wristPinY = crankPinY - Math.sqrt(Math.max(0, rodLen * rodLen - dx * dx));
    const pistonTopY = wristPinY - 35; // Piston crown relative to wrist pin

    // Valve lifts:
    // Stage 0 (Admisión): Intake valve opens smoothly (peak at p=0.5), exhaust closed (0)
    // Stage 1 (Compresión): Both closed (0)
    // Stage 2 (Combustión): Both closed (0)
    // Stage 3 (Escape): Intake closed (0), exhaust valve opens smoothly (peak at p=0.5)
    let inValveLift = 0;
    let exValveLift = 0;
    if (stage === 0) {
      inValveLift = Math.sin(p * Math.PI) * 22;
    } else if (stage === 3) {
      exValveLift = Math.sin(p * Math.PI) * 22;
    }

    // --- LEFT DASHBOARD PANEL (Step indicators & cycle explanation) ---
    const drawDashboard = () => {
      const px = 70;
      const py = 40;
      const pw = 300;

      // Card Header
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(L('Ciclo de cuatro tiempos'), px, py + 25, 340);

      ctx.fillStyle = '#64748B';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText(L('Motor de combustión interna'), px, py + 50, 280);

      // 4 Steps Cards
      const steps = [
        { num: '1', title: 'Admisión', desc: 'Baja: entra la mezcla', col: '#0284C7' },
        { num: '2', title: 'Compresión', desc: 'Sube: comprime la mezcla', col: '#D97706' },
        { num: '3', title: 'Combustión', desc: 'Chispa: los gases empujan', col: '#DC2626' },
        { num: '4', title: 'Escape', desc: 'Sube: salen los gases', col: '#475569' }
      ];

      steps.forEach((st, idx) => {
        const sy = py + 92 + idx * 78;
        const isActive = (stage === idx);

        // Box background
        ctx.fillStyle = isActive ? '#FFFFFF' : '#F1F5F9';
        ctx.strokeStyle = isActive ? st.col : '#E2E8F0';
        ctx.lineWidth = isActive ? 2.5 : 1;

        ctx.beginPath();
        ctx.roundRect(px, sy, pw, 66, 12);
        ctx.fill();
        ctx.stroke();

        if (isActive) {
          // Glow indicator bar
          ctx.fillStyle = st.col;
          ctx.beginPath();
          ctx.roundRect(px, sy, 6, 66, [12, 0, 0, 12]);
          ctx.fill();
        }

        // Circle with number
        ctx.fillStyle = isActive ? st.col : '#94A3B8';
        ctx.beginPath();
        ctx.arc(px + 32, sy + 33, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(st.num, px + 32, sy + 39);

        // Text
        ctx.textAlign = 'left';
        ctx.fillStyle = isActive ? '#0F172A' : '#64748B';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(L(st.title), px + 60, sy + 28, pw - 140);

        ctx.fillStyle = isActive ? '#334155' : '#94A3B8';
        ctx.font = '13.5px system-ui, sans-serif';
        ctx.fillText(L(st.desc), px + 60, sy + 49, pw - 76);

        // Progress mini-bar on active step
        if (isActive) {
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(px + pw - 65, sy + 29, 50, 6);
          ctx.fillStyle = st.col;
          ctx.fillRect(px + pw - 65, sy + 29, 50 * p, 6);
        }
      });
    };
    drawDashboard();

    // --- RIGHT SIDE PANEL: Key components & technical callouts ---
    const drawLegend = () => {
      const rx = 870;
      const ry = 80;

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(L('Componentes principales'), rx, ry + 20);

      const items = [
        { label: 'Bujía', desc: 'Hace saltar la chispa', col: '#EAB308' },
        { label: 'Válvula de admisión', desc: 'Deja entrar aire y gasolina', col: '#0284C7' },
        { label: 'Válvula de escape', desc: 'Deja salir los gases quemados', col: '#64748B' },
        { label: 'Cámara de combustión', desc: 'Espacio sobre el pistón', col: '#EF4444' },
        { label: 'Pistón y biela', desc: 'Llevan el empuje al cigüeñal', col: '#475569' },
        { label: 'Cigüeñal', desc: 'Convierte el vaivén en giro', col: '#0F172A' }
      ];

      items.forEach((it, i) => {
        const iy = ry + 60 + i * 55;
        // bullet
        ctx.fillStyle = it.col;
        ctx.beginPath();
        ctx.arc(rx + 10, iy + 6, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText(L(it.label), rx + 28, iy + 4, 330);

        ctx.fillStyle = '#64748B';
        ctx.font = '13.5px system-ui, sans-serif';
        ctx.fillText(L(it.desc), rx + 28, iy + 22, 330);
      });

      // Crank angle gauge
      const gaugeY = 460;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rx, gaugeY, 350, 85, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(L('Giro del cigüeñal (2 vueltas = 720°)'), rx + 20, gaugeY + 30, 310);

      const currentDeg = Math.round((stage + p) * 180);
      ctx.fillStyle = '#EA580C';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText(`${currentDeg}°`, rx + 20, gaugeY + 65);

      ctx.fillStyle = '#64748B';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('/ 720°', rx + 110, gaugeY + 64);
    };
    drawLegend();

    // ==========================================
    // --- DRAW ENGINE BLOCK & MECHANICAL PARTS ---
    // ==========================================

    const cylLeft = cx - cylWidth / 2;
    const cylRight = cx + cylWidth / 2;

    // 1. Manifolds (Intake left, Exhaust right)
    // Intake Port
    ctx.beginPath();
    ctx.moveTo(cylLeft - 90, 85);
    ctx.lineTo(cylLeft - 20, 85);
    ctx.quadraticCurveTo(cx - 50, 85, cx - 45, cylTopY);
    ctx.lineTo(cx - 75, cylTopY);
    ctx.quadraticCurveTo(cylLeft - 40, 115, cylLeft - 90, 115);
    ctx.closePath();
    ctx.fillStyle = '#E0F2FE';
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Exhaust Port
    ctx.beginPath();
    ctx.moveTo(cylRight + 90, 85);
    ctx.lineTo(cylRight + 20, 85);
    ctx.quadraticCurveTo(cx + 50, 85, cx + 45, cylTopY);
    ctx.lineTo(cx + 75, cylTopY);
    ctx.quadraticCurveTo(cylRight + 40, 115, cylRight + 90, 115);
    ctx.closePath();
    ctx.fillStyle = '#F1F5F9';
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. Gas fill inside combustion chamber
    ctx.save();
    ctx.beginPath();
    ctx.rect(cylLeft, cylTopY, cylWidth, Math.max(0, pistonTopY - cylTopY));
    ctx.clip();

    if (stage === 0) {
      // Intake: Fresh fuel-air mixture filling from intake valve
      const grad = ctx.createLinearGradient(cx - 60, cylTopY, cx, pistonTopY);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
      grad.addColorStop(1, `rgba(186, 230, 253, ${0.2 + 0.6 * p})`);
      ctx.fillStyle = grad;
      ctx.fillRect(cylLeft, cylTopY, cylWidth, pistonTopY - cylTopY);

      // Flowing particles from intake
      setupData.intakeParticles.forEach(pt => {
        const pyProg = (pt.y + t * 90) % (pistonTopY - cylTopY + 1);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.7)';
        ctx.beginPath();
        ctx.arc(cx - 55 + pt.x, cylTopY + pyProg, pt.r, 0, Math.PI * 2);
        ctx.fill();
      });

    } else if (stage === 1) {
      // Compression: Mixture compressed into high pressure (blue to deep amber)
      const grad = ctx.createLinearGradient(cx, cylTopY, cx, pistonTopY);
      const intensity = 0.3 + 0.6 * p;
      grad.addColorStop(0, `rgba(245, 158, 11, ${intensity})`);
      grad.addColorStop(1, `rgba(56, 189, 248, ${0.7 - 0.4 * p})`);
      ctx.fillStyle = grad;
      ctx.fillRect(cylLeft, cylTopY, cylWidth, pistonTopY - cylTopY);

    } else if (stage === 2) {
      // Combustion: Explosion flash at p < 0.25, then hot orange gas expanding
      const grad = ctx.createRadialGradient(cx, cylTopY + 10, 10, cx, pistonTopY, cylWidth);
      if (p < 0.25) {
        // Huge spark / detonation burst
        const flash = 1 - p / 0.25;
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, '#FDE047');
        grad.addColorStop(0.7, '#EA580C');
        grad.addColorStop(1, '#DC2626');
      } else {
        // High pressure expanding fire/gas
        grad.addColorStop(0, '#F97316');
        grad.addColorStop(0.6, '#EF4444');
        grad.addColorStop(1, '#7F1D1D');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(cylLeft, cylTopY, cylWidth, pistonTopY - cylTopY);

      // Fire flame flickering effect
      ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
      for (let i = 0; i < 5; i++) {
        const fx = cx + (i - 2) * 35 + Math.sin(t * 15 + i) * 10;
        const fy = cylTopY + 20 + Math.cos(t * 20 + i) * 15;
        ctx.beginPath();
        ctx.arc(fx, fy, 25, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (stage === 3) {
      // Exhaust: Burnt smoke being evacuated out
      const grad = ctx.createLinearGradient(cx, cylTopY, cx, pistonTopY);
      grad.addColorStop(0, 'rgba(100, 116, 139, 0.8)');
      grad.addColorStop(1, `rgba(148, 163, 184, ${0.7 - 0.5 * p})`);
      ctx.fillStyle = grad;
      ctx.fillRect(cylLeft, cylTopY, cylWidth, pistonTopY - cylTopY);

      // Flowing smoke towards exhaust valve
      setupData.exhaustParticles.forEach(pt => {
        const pyProg = (pt.y - t * 80 + 300) % (pistonTopY - cylTopY + 1);
        ctx.fillStyle = 'rgba(71, 85, 105, 0.6)';
        ctx.beginPath();
        ctx.arc(cx + 55 + pt.x, pistonTopY - pyProg, pt.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();

    // 3. Cylinder Walls (Cross section heavy borders)
    ctx.fillStyle = '#CBD5E1';
    // Left wall
    ctx.fillRect(cylLeft - 22, cylTopY, 22, cylHeight);
    // Right wall
    ctx.fillRect(cylRight, cylTopY, 22, cylHeight);

    // Wall borders
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cylLeft, cylTopY);
    ctx.lineTo(cylLeft, cylTopY + cylHeight);
    ctx.moveTo(cylRight, cylTopY);
    ctx.lineTo(cylRight, cylTopY + cylHeight);
    ctx.moveTo(cylLeft - 22, cylTopY);
    ctx.lineTo(cylLeft - 22, cylTopY + cylHeight);
    ctx.moveTo(cylRight + 22, cylTopY);
    ctx.lineTo(cylRight + 22, cylTopY + cylHeight);
    ctx.stroke();

    // Cylinder Head Ceiling
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(cylLeft - 22, cylTopY);
    ctx.lineTo(cylLeft, cylTopY);
    ctx.lineTo(cx - 45, cylTopY);
    ctx.lineTo(cx - 75, cylTopY);
    ctx.lineTo(cx + 75, cylTopY);
    ctx.lineTo(cylRight + 22, cylTopY);
    ctx.stroke();

    // 4. Valves
    // Left valve (Intake): seat at cx - 60
    const inValveSeatX = cx - 60;
    ctx.save();
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    // Valve Stem
    ctx.fillRect(inValveSeatX - 4, cylTopY - 45 + inValveLift, 8, 45);
    // Valve Head (mushroom plate)
    ctx.beginPath();
    ctx.moveTo(inValveSeatX - 22, cylTopY + 6 + inValveLift);
    ctx.lineTo(inValveSeatX + 22, cylTopY + 6 + inValveLift);
    ctx.lineTo(inValveSeatX + 16, cylTopY + inValveLift);
    ctx.lineTo(inValveSeatX - 16, cylTopY + inValveLift);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right valve (Exhaust): seat at cx + 60
    const exValveSeatX = cx + 60;
    ctx.save();
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    // Valve Stem
    ctx.fillRect(exValveSeatX - 4, cylTopY - 45 + exValveLift, 8, 45);
    // Valve Head
    ctx.beginPath();
    ctx.moveTo(exValveSeatX - 22, cylTopY + 6 + exValveLift);
    ctx.lineTo(exValveSeatX + 22, cylTopY + 6 + exValveLift);
    ctx.lineTo(exValveSeatX + 16, cylTopY + exValveLift);
    ctx.lineTo(exValveSeatX - 16, cylTopY + exValveLift);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Spark Plug (Center top: cx)
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    // Ceramic body
    ctx.fillRect(cx - 10, cylTopY - 50, 20, 38);
    ctx.strokeRect(cx - 10, cylTopY - 50, 20, 38);
    // Metal thread
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(cx - 6, cylTopY - 12, 12, 12);
    // Electrodes
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cylTopY);
    ctx.lineTo(cx - 2, cylTopY + 8);
    ctx.moveTo(cx + 4, cylTopY);
    ctx.lineTo(cx + 4, cylTopY + 10);
    ctx.lineTo(cx, cylTopY + 10);
    ctx.stroke();

    // Spark spark animation (Stage 2 early phase or instant pulse)
    if (stage === 2 && p < 0.3) {
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 2, cylTopY + 8);
      ctx.lineTo(cx + 1, cylTopY + 7);
      ctx.lineTo(cx - 1, cylTopY + 9);
      ctx.lineTo(cx + 2, cylTopY + 10);
      ctx.stroke();

      // Spark glow
      ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.beginPath();
      ctx.arc(cx, cylTopY + 9, 14 + Math.sin(t * 30) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Connecting Rod (Biela)
    ctx.save();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, wristPinY);
    ctx.lineTo(crankPinX, crankPinY);
    ctx.stroke();

    // Inner highlight line on rod
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, wristPinY);
    ctx.lineTo(crankPinX, crankPinY);
    ctx.stroke();
    ctx.restore();

    // 7. Piston (Pistón)
    ctx.save();
    // Piston Body
    ctx.fillStyle = '#94A3B8';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cylLeft + 2, pistonTopY, cylWidth - 4, pistonH, [8, 8, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Piston Rings (Anillos)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    for (let r = 0; r < 3; r++) {
      const ryPos = pistonTopY + 12 + r * 9;
      ctx.beginPath();
      ctx.moveTo(cylLeft + 3, ryPos);
      ctx.lineTo(cylRight - 3, ryPos);
      ctx.stroke();
    }

    // Wrist Pin (Perno del pistón)
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, wristPinY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 8. Crankshaft (Cigüeñal / Volante)
    // Crankcase circle boundary
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, crankCenterY, crankR + 25, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating Crank Web / Counterweight
    ctx.save();
    ctx.translate(cx, crankCenterY);
    ctx.rotate(crankAngle);

    // Counterweight (opposite side of pin)
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(0, 0, crankR + 15, Math.PI * 0.4, Math.PI * 1.6);
    ctx.closePath();
    ctx.fill();

    // Crank arm
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(-16, -14, crankR + 32, 28, 10);
    ctx.fill();

    // Crank pin journal
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(crankR, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Crank Center Main Shaft
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(cx, crankCenterY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(cx, crankCenterY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Rotation Direction Arrow around Crankshaft
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, crankCenterY, crankR + 36, 0.4, 1.8);
    ctx.stroke();
    // Arrowhead
    const arrHeadAngle = 1.8;
    const ahX = cx + (crankR + 36) * Math.cos(arrHeadAngle);
    const ahY = crankCenterY + (crankR + 36) * Math.sin(arrHeadAngle);
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.moveTo(ahX + 8, ahY - 3);
    ctx.lineTo(ahX - 5, ahY + 8);
    ctx.lineTo(ahX - 1, ahY - 9);
    ctx.closePath();
    ctx.fill();

    // 9. Floating pointers & dynamic labels near the engine
    // Piston motion direction arrow
    const isPistonMovingDown = (stage === 0 || stage === 2);
    const arrowY = pistonTopY + pistonH / 2;
    const arrowX = cylRight + 38;

    ctx.fillStyle = isPistonMovingDown ? '#0284C7' : '#D97706';
    ctx.strokeStyle = isPistonMovingDown ? '#0284C7' : '#D97706';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (isPistonMovingDown) {
      // Down arrow
      ctx.moveTo(arrowX, arrowY - 22);
      ctx.lineTo(arrowX, arrowY + 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(arrowX - 7, arrowY + 12);
      ctx.lineTo(arrowX + 7, arrowY + 12);
      ctx.lineTo(arrowX, arrowY + 26);
      ctx.closePath();
      ctx.fill();
    } else {
      // Up arrow
      ctx.moveTo(arrowX, arrowY + 22);
      ctx.lineTo(arrowX, arrowY - 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(arrowX - 7, arrowY - 12);
      ctx.lineTo(arrowX + 7, arrowY - 12);
      ctx.lineTo(arrowX, arrowY - 26);
      ctx.closePath();
      ctx.fill();
    }

    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isPistonMovingDown ? L('Baja') : L('Sube'), arrowX, arrowY + (isPistonMovingDown ? 42 : -32));

    // Dynamic intake / exhaust flow tags
    if (stage === 0) {
      ctx.fillStyle = '#0284C7';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(L('Aire + gasolina') + ' ➜', cylLeft - 100, 120, 150);
    } else if (stage === 3) {
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('➜ ' + L('Gases de escape'), cylRight + 30, 148, 140);
    }
  }
};
