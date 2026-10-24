// The water cycle, for «Animaciones explicativas» (templates/edu_anim.js): written by the AI («Animación con IA»,
// gemini-3.8-flash) and reviewed by hand — its drawn texts through L, so the example reads in every language.
export default {
  background: '#eef6fc',
  accent: '#2b7ec9',
  stages: [
    { name: 'Evaporación', caption: 'La radiación solar calienta el agua líquida, convirtiéndola en vapor invisible que asciende.', duration: 6 },
    { name: 'Condensación', caption: 'Al enfriarse en altura, el vapor se condensa formando nubes cargadas de gotículas.', duration: 5.5 },
    { name: 'Precipitación', caption: 'Las gotas se agrupan, aumentan de peso y caen como lluvia o nieve sobre las montañas.', duration: 6 },
    { name: 'Escorrentía', caption: 'El agua corre por los ríos y se infiltra en los acuíferos, y vuelve al océano.', duration: 6.5 }
  ],
  words: ['Evaporación', 'Condensación', 'Precipitación', 'Escorrentía y acuífero', 'Océano'],
  setup({ W, H }) {
    // Generar partículas precalculadas
    const vapor = [];
    for (let i = 0; i < 45; i++) {
      vapor.push({
        x: 100 + (i * 29) % 360,
        baseY: 460 + ((i * 17) % 60),
        speed: 0.6 + ((i * 13) % 20) / 30,
        drift: (((i * 7) % 30) - 15) * 0.05,
        size: 4 + (i % 5)
      });
    }

    const rain = [];
    for (let i = 0; i < 70; i++) {
      rain.push({
        x: 750 + ((i * 37) % 430),
        yOffset: ((i * 19) % 300),
        speed: 4 + (i % 4),
        len: 12 + (i % 8)
      });
    }

    const groundwater = [];
    for (let i = 0; i < 30; i++) {
      groundwater.push({
        x: 480 + (i * 24),
        y: 510 + ((i * 13) % 40),
        speed: 0.2 + ((i * 7) % 5) * 0.05
      });
    }

    return { vapor, rain, groundwater };
  },

  draw({ ctx, stage, p, raw, t, W, H, data, L }) {
    // Control de progresión global y por etapas
    // Etapa 0: Evaporación (0 -> 1)
    // Etapa 1: Condensación (0 -> 1)
    // Etapa 2: Precipitación (0 -> 1)
    // Etapa 3: Escorrentía e infiltración (0 -> 1)

    const evapAlpha = stage === 0 ? p : 1;
    const cloudDensity = stage === 0 ? 0.2 : (stage === 1 ? 0.2 + 0.8 * p : 1);
    const rainAlpha = stage < 2 ? 0 : (stage === 2 ? p : 1);
    const flowAlpha = stage < 3 ? 0 : p;

    // 1. CIELO DE FONDO
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 500);
    skyGrad.addColorStop(0, '#c7e5fc');
    skyGrad.addColorStop(0.6, '#e0f1fe');
    skyGrad.addColorStop(1, '#f1f8fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. SOL BRILLANTE (Zona alta izquierda)
    const sunX = 160;
    const sunY = 110;
    const sunPulse = Math.sin(t * 2) * 4;

    // Resplandor del sol
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 90 + sunPulse);
    sunGlow.addColorStop(0, 'rgba(255, 225, 110, 0.85)');
    sunGlow.addColorStop(0.5, 'rgba(255, 200, 70, 0.35)');
    sunGlow.addColorStop(1, 'rgba(255, 200, 70, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 95 + sunPulse, 0, Math.PI * 2);
    ctx.fill();

    // Disco solar
    ctx.fillStyle = '#ffb81c';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
    ctx.fill();

    // Rayos sutiles rotando
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(t * 0.15);
    ctx.strokeStyle = 'rgba(255, 184, 28, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. MONTAÑAS Y RELIEVE (Fondo y relieve medio)
    // Montaña lejana
    ctx.fillStyle = '#9cb2ca';
    ctx.beginPath();
    ctx.moveTo(680, 480);
    ctx.lineTo(870, 210);
    ctx.lineTo(980, 290);
    ctx.lineTo(1120, 160);
    ctx.lineTo(1280, 340);
    ctx.lineTo(1280, 520);
    ctx.lineTo(680, 520);
    ctx.closePath();
    ctx.fill();

    // Nieve en picos lejanos
    ctx.fillStyle = '#eaf4fc';
    ctx.beginPath();
    ctx.moveTo(870, 210);
    ctx.lineTo(840, 255);
    ctx.lineTo(875, 250);
    ctx.lineTo(895, 260);
    ctx.lineTo(900, 240);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(1120, 160);
    ctx.lineTo(1085, 220);
    ctx.lineTo(1120, 210);
    ctx.lineTo(1150, 225);
    ctx.closePath();
    ctx.fill();

    // Montaña media y ladera boscosa
    ctx.fillStyle = '#6e9877';
    ctx.beginPath();
    ctx.moveTo(560, 490);
    ctx.lineTo(760, 280);
    ctx.lineTo(920, 440);
    ctx.lineTo(1040, 310);
    ctx.lineTo(1280, 460);
    ctx.lineTo(1280, 540);
    ctx.lineTo(560, 540);
    ctx.closePath();
    ctx.fill();

    // Llanura y terreno costero
    ctx.fillStyle = '#558759';
    ctx.beginPath();
    ctx.moveTo(380, 460);
    ctx.quadraticCurveTo(550, 430, 800, 440);
    ctx.quadraticCurveTo(1050, 450, 1280, 455);
    ctx.lineTo(1280, 540);
    ctx.lineTo(380, 540);
    ctx.closePath();
    ctx.fill();

    // 4. ESTRATO GEOLÓGICO / SUBSUELO (Acuífero)
    ctx.fillStyle = '#c8a87b';
    ctx.fillRect(380, 475, 900, 85);
    // Roca profunda / acuífero saturado
    ctx.fillStyle = '#a88656';
    ctx.fillRect(380, 520, 900, 40);

    // Veta permeable de acuífero
    ctx.fillStyle = '#7caad6';
    ctx.globalAlpha = 0.5 + 0.5 * flowAlpha;
    ctx.beginPath();
    ctx.moveTo(400, 525);
    ctx.bezierCurveTo(600, 510, 850, 530, 1280, 515);
    ctx.lineTo(1280, 550);
    ctx.bezierCurveTo(850, 560, 600, 545, 400, 550);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 5. OCÉANO (Izquierda)
    const seaGrad = ctx.createLinearGradient(0, 440, 0, 560);
    seaGrad.addColorStop(0, '#2e86c1');
    seaGrad.addColorStop(0.5, '#1b6399');
    seaGrad.addColorStop(1, '#0e436d');
    ctx.fillStyle = seaGrad;
    ctx.beginPath();
    ctx.moveTo(0, 450);
    // Oleaje suave animado
    for (let x = 0; x <= 420; x += 30) {
      const waveY = 450 + Math.sin(t * 2.5 + x * 0.03) * 3;
      ctx.lineTo(x, waveY);
    }
    ctx.lineTo(420, 560);
    ctx.lineTo(0, 560);
    ctx.closePath();
    ctx.fill();

    // Orilla arenosa
    ctx.fillStyle = '#dfc394';
    ctx.beginPath();
    ctx.moveTo(390, 450);
    ctx.quadraticCurveTo(425, 465, 420, 560);
    ctx.lineTo(380, 560);
    ctx.lineTo(380, 475);
    ctx.closePath();
    ctx.fill();

    // 6. RÍO (Escorrentía superficial)
    // El río baja de la montaña (x=980, y=360) hacia la costa (x=410, y=470)
    ctx.strokeStyle = '#3ba4df';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(980, 360);
    ctx.bezierCurveTo(850, 410, 780, 380, 680, 440);
    ctx.bezierCurveTo(580, 490, 500, 460, 405, 468);
    ctx.stroke();

    // Agua viva en el río cuando hay escorrentía activa
    if (stage >= 2) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 16]);
      ctx.lineDashOffset = -t * 28;
      ctx.stroke();
      ctx.restore();
    }

    // 7. ETAPA 0: EVAPORACIÓN (Vapor y flechas hacia arriba)
    if (evapAlpha > 0) {
      ctx.save();
      // Partículas ascendentes de vapor desde el mar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      data.vapor.forEach((vp) => {
        const prog = (t * vp.speed + vp.yOffset) % 1;
        const curY = vp.baseY - prog * 260;
        const curX = vp.x + Math.sin(t * 1.5 + vp.x) * 12;
        const alpha = Math.sin(prog * Math.PI) * evapAlpha * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(curX, curY, vp.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Flechas onduladas de evaporación
      const arrowXs = [130, 220, 310];
      arrowXs.forEach((ax, idx) => {
        const animOffset = (t * 40 + idx * 30) % 60;
        ctx.strokeStyle = `rgba(41, 128, 185, ${0.4 + 0.4 * evapAlpha})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -t * 30;
        ctx.beginPath();
        ctx.moveTo(ax, 440);
        ctx.bezierCurveTo(ax - 20, 360, ax + 25, 300, ax, 230);
        ctx.stroke();

        // Punta de flecha superior
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(41, 128, 185, ${0.7 * evapAlpha})`;
        ctx.beginPath();
        ctx.moveTo(ax, 218);
        ctx.lineTo(ax - 7, 232);
        ctx.lineTo(ax + 7, 232);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    // 8. ETAPA 1: CONDENSACIÓN (Nubes en el cielo y condensación)
    function drawCloud(cx, cy, scale, density) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Sombra inferior de la nube
      const darkness = 0.5 + 0.5 * (1 - density * 0.4);
      const r = Math.round(230 * darkness);
      const g = Math.round(238 * darkness);
      const b = Math.round(248 * darkness);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      ctx.beginPath();
      ctx.arc(-50, 0, 32, 0, Math.PI * 2);
      ctx.arc(-15, -25, 42, 0, Math.PI * 2);
      ctx.arc(35, -20, 38, 0, Math.PI * 2);
      ctx.arc(70, 5, 28, 0, Math.PI * 2);
      ctx.arc(10, 15, 34, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // Capa superior brillante
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(-18, -27, 36, 0, Math.PI * 2);
      ctx.arc(32, -22, 32, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Nube marina desplazándose hacia la montaña
    const cloud1X = 460 + Math.sin(t * 0.4) * 15;
    drawCloud(cloud1X, 170, 1.05, cloudDensity);

    // Gran nube tormentosa sobre la cordillera
    const cloud2X = 890 + Math.sin(t * 0.3) * 10;
    const cloud2Y = 140;
    drawCloud(cloud2X, cloud2Y, 1.45, cloudDensity);

    // Nube secundaria al este
    drawCloud(1100, 150, 1.1, cloudDensity);

    // Flecha de transporte eólico de vapor (de mar hacia montaña)
    if (stage >= 1) {
      const windA = stage === 1 ? p : 1;
      ctx.strokeStyle = `rgba(70, 130, 180, ${0.6 * windA})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -t * 35;
      ctx.beginPath();
      ctx.moveTo(340, 160);
      ctx.bezierCurveTo(460, 130, 600, 140, 720, 150);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 9. ETAPA 2: PRECIPITACIÓN (Lluvia cayendo sobre laderas)
    if (rainAlpha > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(90, 155, 215, ${0.75 * rainAlpha})`;
      ctx.lineWidth = 2;
      data.rain.forEach((drop) => {
        const yCur = 180 + ((drop.yOffset + t * drop.speed * 80) % 240);
        // Desplazamiento inclinado por viento
        const xCur = drop.x - (yCur - 180) * 0.25;
        // Evitar que llueva bajo tierra visible
        if (yCur < 460) {
          ctx.beginPath();
          ctx.moveTo(xCur, yCur);
          ctx.lineTo(xCur - 3, yCur + drop.len);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 10. ETAPA 3: ESCORRENTÍA E INFILTRACIÓN
    if (stage >= 3) {
      // Infiltración: flechas verticales hacia el subsuelo
      const infAlpha = p;
      ctx.save();
      const infXs = [600, 750, 920];
      infXs.forEach((ix) => {
        ctx.strokeStyle = `rgba(40, 116, 166, ${0.8 * infAlpha})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -t * 20;
        ctx.beginPath();
        ctx.moveTo(ix, 455);
        ctx.lineTo(ix, 515);
        ctx.stroke();

        // Flecha hacia abajo
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(40, 116, 166, ${0.8 * infAlpha})`;
        ctx.beginPath();
        ctx.moveTo(ix, 520);
        ctx.lineTo(ix - 5, 510);
        ctx.lineTo(ix + 5, 510);
        ctx.closePath();
        ctx.fill();
      });

      // Flujo subterráneo (acuífero) hacia el océano
      ctx.strokeStyle = `rgba(33, 97, 140, ${0.85 * infAlpha})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = t * 25; // flujo de derecha a izquierda hacia el mar
      ctx.beginPath();
      ctx.moveTo(1150, 535);
      ctx.bezierCurveTo(850, 545, 620, 525, 415, 535);
      ctx.stroke();
      ctx.restore();
    }

    // 11. CARTELAS / ETIQUETAS DIDÁCTICAS (Textos pedagógicos legibles >= 22px)
    function drawBadge(text, x, y, active, bgCol = '#ffffff', textCol = '#1a365d') {
      ctx.save();
      ctx.font = 'bold 23px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const padX = 14;
      const padY = 8;
      const bw = textWidth + padX * 2;
      const bh = 38;

      ctx.globalAlpha = active ? 1 : 0.45;

      // Sombra
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      // Caja
      ctx.fillStyle = bgCol;
      ctx.beginPath();
      ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 8);
      ctx.fill();

      // Borde
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = active ? '#2b7ec9' : '#b0c4de';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.stroke();

      // Texto
      ctx.fillStyle = textCol;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1);

      ctx.restore();
    }

    // 1. Evaporación (sobre el océano)
    drawBadge('1. ' + L('Evaporación'), 220, 310, stage === 0);

    // 2. Condensación (junto a la nube principal)
    drawBadge('2. ' + L('Condensación'), 680, 110, stage === 1);

    // 3. Precipitación (sobre la lluvia en ladera)
    drawBadge('3. ' + L('Precipitación'), 1030, 240, stage === 2);

    // 4. Escorrentía y Filtración (zona media/baja)
    drawBadge('4. ' + L('Escorrentía y acuífero'), 640, 488, stage === 3);

    // Etiqueta permanente identificatoria de masa oceánica
    ctx.save();
    ctx.font = 'italic 22px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(L('Océano'), 140, 520);
    ctx.restore();
  }
};
