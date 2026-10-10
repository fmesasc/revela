// Import and export: HTML, PDF, handouts, images, PowerPoint, OpenDocument, video, projects, versions.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('Google Drive: el diálogo de configuración guarda las credenciales', async () => {
    reset(); D.querySelector('[data-action="gdrive-config"]').click(); await sleep(10);
    const m = D.getElementById('gd-modal'); assert(m, 'diálogo de configuración');
    m.querySelector('.gd-cid').value = 'test.apps.googleusercontent.com';
    m.querySelector('.gd-key').value = 'AIzaTEST';
    m.querySelector('.gd-ok').click(); await sleep(10);
    assert(R.gdrive.gdriveReady(), 'credenciales guardadas en el navegador');
  });

  await test('presentaciones grandes: el archivo se escribe a trozos (nunca un texto entero) y sale igual que JSON.stringify', async () => {
    const W = frame.contentWindow, { jsonBlob } = await W.eval("import('/src/core/jsonblob.js')");
    const big = 'data:image/png;base64,' + 'A'.repeat(5e6);            // (more than one piece)
    const v = { name: 'Café «ñ» "x"\n', n: [1, 2.5, -0, NaN, Infinity, null, true], skip: undefined, f() {}, when: new W.Date(0),
      slides: [{ blocks: [{ src: big, alt: undefined }, { src: big }] }], list: [undefined, () => 1, { a: {} }], empty: {}, none: [] };
    const blob = jsonBlob(v), text = await blob.text();
    eq(text.length, JSON.stringify(v).length, 'mismo tamaño'); assert(text === JSON.stringify(v), 'mismo texto');
    eq(JSON.parse(text).slides[0].blocks[1].src.length, big.length, 'se vuelve a leer');
    eq(await jsonBlob('a"b').text(), '"a\\"b"', 'un valor suelto');
  });

  await test('archivo .revela.json: una foto repetida va una sola vez, y al abrirlo vuelve a cada sitio', async () => {
    reset(); const W = frame.contentWindow;
    const P = await W.eval("import('/src/io/formats/project.js')"), O = await W.eval("import('/src/ui/shell/openfile.js')");
    const logo = 'data:image/png;base64,' + 'L'.repeat(200e3), photo = 'data:image/jpeg;base64,' + 'F'.repeat(150e3);
    R.store.commit(() => {
      R.state.deck.slides[0].blocks.push({ id: 'p1', type: 'image', x: 0, y: 0, w: 10, h: 10, src: logo }, { id: 'p2', type: 'image', x: 0, y: 0, w: 10, h: 10, src: photo });
      R.state.deck.slides.push({ ...R.state.deck.slides[0], id: 's2', blocks: [{ id: 'p3', type: 'image', x: 0, y: 0, w: 10, h: 10, src: logo }] });
      R.state.deck.slides[1].bg = { image: logo };
    });
    const text = await P.projectBlob(R.state.deck).text(), file = JSON.parse(text);
    eq(Object.keys(file.sharedFiles || {}).length, 1, 'la repetida, en sharedFiles'); eq(file.sharedFiles['1'], logo);
    eq(file.slides[0].blocks.find(b => b.id === 'p1').src, 'rvfile:1', 'en su sitio, una referencia'); eq(file.slides[1].bg.image, 'rvfile:1');
    eq(file.slides[0].blocks.find(b => b.id === 'p2').src, photo, 'la que sale una vez, como siempre');
    assert(text.length < logo.length * 1.2 + photo.length * 1.2, 'el archivo no la lleva tres veces: ' + text.length);
    assert(R.state.deck.slides[0].blocks.find(b => b.id === 'p1').src === logo, 'la presentación abierta no cambia');
    R.store.replaceDeck(R.model.emptyDeck());
    assert(await O.openProject(text), 'se abre');
    const s = R.state.deck.slides;
    eq(s[0].blocks.find(b => b.id === 'p1').src, logo, 'cada sitio con su foto'); eq(s[1].blocks[0].src, logo); eq(s[1].bg.image, logo);
    eq(s[0].blocks.find(b => b.id === 'p2').src, photo); eq(R.state.deck.sharedFiles, undefined, 'sin la tabla');
    // Without repeats: the same file as before.
    R.store.replaceDeck(R.model.emptyDeck()); eq(JSON.parse(await P.projectBlob(R.state.deck).text()).sharedFiles, undefined, 'sin repetidas, sin tabla');
  });

  await test('PNG: el HTML de la diapositiva incluye sus bloques con estilo en línea', async () => {
    reset(); const b = newText(); b.html = 'Hola'; b.fontSize = 50; R.render();
    const html = R.io.slideInnerHTML(slide());
    assert(/Hola/.test(html) && /font-size:50px/.test(html), 'bloque con estilo en línea');
  });

  await test('exportar a PowerPoint genera un .pptx (zip) válido', async () => {
    reset(); newText(); R.blocks.addShape('rect');
    const blob = await R.pptx.buildPptxBlob();
    assert(blob && blob.size > 1000, 'archivo no vacío');
    const buf = new Uint8Array(await blob.arrayBuffer());
    assert(buf[0] === 0x50 && buf[1] === 0x4b, 'firma ZIP (PK) del .pptx');
  });

  await test('modelo 3D con su imagen (portada): en las miniaturas y en PowerPoint', async () => {
    reset(); const W = frame.contentWindow;
    const c = D.createElement('canvas'); c.width = c.height = 8; c.getContext('2d').fillRect(2, 2, 4, 4); const poster = c.toDataURL('image/png');
    R.store.commit(() => slide().blocks.push({ id: 'm1', type: 'model', src: 'data:model/gltf-binary;base64,AAAA', poster, x: 100, y: 100, w: 300, h: 300, rotation: 0, animation: null, alt: 'Robot' }));
    await sleep(30);
    const th = D.querySelector('#navigator .thumb.active img');
    assert(th && th.getAttribute('src') === poster, 'la miniatura enseña el modelo, no un cubo');
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);          // (JSZip comes with the export)
    const media = Object.keys(zip.files).filter(n => /^ppt\/media\//.test(n));
    const xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(media.length >= 1 && /descr="Robot"/.test(xml), 'en PowerPoint, como imagen con su texto alternativo');
  });

  await test('fotos grandes: las miniaturas usan una copia pequeña (una por archivo); la diapositiva, la original', async () => {
    reset(); const W = frame.contentWindow;
    // A noisy 1200 × 900 PNG (well over 400 KB): a big photo.
    const c = D.createElement('canvas'); c.width = 1200; c.height = 900; const x = c.getContext('2d'), im = x.createImageData(1200, 900);
    for (let i = 0; i < im.data.length; i++) im.data[i] = (i * 2654435761 >>> 7) & 255; x.putImageData(im, 0, 0);
    const big = c.toDataURL('image/png'); assert(big.length > 400 * 1024, 'grande: ' + big.length);
    R.store.commit(() => { slide().blocks.push({ id: 'p1', type: 'image', src: big, x: 0, y: 0, w: 640, h: 480, rotation: 0, animation: null }); });
    R.slides.addSlide(); R.store.commit(() => { slide().blocks.push({ id: 'p2', type: 'image', src: big, x: 0, y: 0, w: 640, h: 480, rotation: 0, animation: null }); });
    R.flushThumbs?.();
    const thumbs = () => [...D.querySelectorAll('#navigator .thumb img')].filter(i => i.src.startsWith('blob:'));
    for (let i = 0; i < 80 && thumbs().length < 2; i++) { await sleep(25); R.flushThumbs?.(); }
    const t = thumbs(); eq(t.length, 2, 'las dos miniaturas, con su copia');
    eq(t[0].src, t[1].src, 'la misma copia para el mismo archivo');
    await Promise.all(t.map(i => i.decode().catch(() => {})));
    assert(t[0].naturalWidth <= 480 && t[0].naturalWidth > 0, 'pequeña: ' + t[0].naturalWidth + ' px');
    const stage = D.querySelector('#stage .block[data-id="p2"] img'); await stage?.decode().catch(() => {});
    eq(stage?.naturalWidth, 1200, 'en la diapositiva, la foto entera');
  });

  await test('exportar a PDF: una página por diapositiva visible', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.slides.toggleSlideHidden(0);
    const html = R.io.buildPrintHTML();
    eq((html.match(/class="page"/g) || []).length, 2, 'páginas = diapositivas visibles');
    assert(/@page\{size:1280px 720px/.test(html), 'tamaño de página');
  });

  await test('documentos y páginas de notas para imprimir', async () => {
    reset(); for (let i = 0; i < 6; i++) R.slides.addSlide();          // 7 diapositivas
    R.slides.toggleSlideHidden(0);                                        // 6 visibles
    R.state.deck.slides[1].notes = 'Nota <uno>';
    const h6 = R.io.buildHandoutHTML(R.state.deck, 6);
    eq((h6.match(/class="sheet"/g) || []).length, 1, '6 por página → 1 hoja');
    eq((h6.match(/class="thumb"/g) || []).length, 6, 'seis miniaturas');
    assert(/@page\{size:A4 portrait/.test(h6), 'A4 vertical');
    const h3 = R.io.buildHandoutHTML(R.state.deck, 3);
    eq((h3.match(/class="sheet"/g) || []).length, 2, '3 por página → 2 hojas');
    eq((h3.match(/class="lines"/g) || []).length, 6, 'líneas para notas');
    const hn = R.io.buildHandoutHTML(R.state.deck, 'notes');
    eq((hn.match(/class="sheet"/g) || []).length, 6, 'una hoja por diapositiva');
    assert(/<div class="notes">Nota &lt;uno&gt;<\/div>/.test(hn), 'notas escapadas');
    D.querySelector('[data-action="export-handout"]').click(); await sleep(10);
    eq(D.querySelectorAll('#handout-modal option').length, 7, 'siete diseños');
    D.querySelector('#handout-modal .modal-close').click();
  });

  await test('exportar todas las diapositivas como imágenes (ZIP)', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.slides.toggleSlideHidden(2);
    const zipBlob = await R.io.buildImagesZip(R.state.deck, 'jpg');
    const zip = await frame.contentWindow.JSZip.loadAsync(zipBlob);
    const names = Object.keys(zip.files).sort();
    eq(names.length, 2, 'una imagen por diapositiva visible');
    assert(/-1\.jpg$/.test(names[0]), 'nombre numerado ' + names[0]);
    const head = new Uint8Array(await zip.file(names[0]).async('arraybuffer')).slice(0, 3);
    eq([...head].join(','), '255,216,255', 'cabecera JPEG');
    const png = await R.io.slideImageBlob(slide(), 'png');
    eq(png.type, 'image/png', 'PNG de la diapositiva');
  });

  await test('diapositiva como imagen: el texto con degradado (Text Art «Oro») se recorta a las letras, no sale una barra', async () => {
    reset(); R.blocks.addWordArt('gold'); const b = slide().blocks.at(-1);
    R.store.commit(() => { b.html = 'Oro'; }); await sleep(20);
    const png = await R.io.slideImageBlob(slide(), 'png');
    const bmp = await createImageBitmap(png), k = bmp.width / R.state.deck.size.w;
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; const g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(Math.round(b.x * k), Math.round(b.y * k), Math.round(b.w * k), Math.round(b.h * k)).data;
    let gold = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 2] < 140 && d[i + 3] > 200) gold++;
    const share = gold / (d.length / 4);
    assert(share > 0.01, 'hay letras doradas (' + share.toFixed(3) + ')');
    assert(share < 0.4, 'no es una barra entera (' + share.toFixed(3) + ')');
  });

  await test('importar PowerPoint con formato: formas, colores, tamaños, tablas, notas', async () => {
    reset();
    await R.pptx.buildPptx();                            // carga PptxGenJS
    const P = new frame.contentWindow.PptxGenJS(); P.layout = 'LAYOUT_16x9';   // 10 × 5.625 in
    const s1 = P.addSlide(); s1.background = { color: '112233' };
    s1.addText('Hola mundo', { x: 1, y: 0.5, w: 8, h: 1, fontSize: 40, bold: true, color: 'FF0000', align: 'center', fontFace: 'Georgia' });
    s1.addText([{ text: 'Uno', options: { bullet: true } }, { text: 'Dos', options: { bullet: true } }], { x: 1, y: 2, w: 4, h: 2, fontSize: 20 });
    s1.addShape(P.ShapeType.ellipse, { x: 6, y: 2, w: 2, h: 2, fill: { color: '00AA00' }, line: { color: '0000FF', width: 2 }, rotate: 30 });
    s1.addNotes('Notas del ponente');
    const s2 = P.addSlide(); s2.hidden = true;
    s2.addTable([[{ text: 'A', options: { colspan: 2 } }], [{ text: 'b' }, { text: 'c' }]], { x: 1, y: 1, w: 6, h: 2 });
    const blob = await P.write({ outputType: 'blob' });
    const deck = await R.pptxImport.importPPTX(new File([blob], 'Prueba.pptx'));
    eq(deck.name, 'Prueba', 'nombre del archivo'); eq(deck.slides.length, 2, 'dos diapositivas');
    const [a, b] = deck.slides;
    eq(a.background, '#112233', 'fondo'); eq(a.notes, 'Notas del ponente', 'notas'); assert(b.hidden, 'oculta');
    const title = a.blocks.find(x => x.type === 'text' && /Hola mundo/.test(x.html));
    assert(title, 'texto');
    eq(title.x, 128, 'posición (1 in = 128 px)'); eq(title.w, 1024, 'ancho');
    eq(title.fontSize, 71, '40 pt → 71 px en un lienzo de 1280');
    eq(title.textAlign, 'center', 'alineación');
    const eff = R.master.styled(title, a, deck);
    assert(/<b>/.test(title.html) && (/color:#ff0000/.test(title.html) || eff.color === '#ff0000') && /Georgia/.test(eff.fontFamily + title.html), 'negrita, color y fuente');
    const list = a.blocks.find(x => x.type === 'text' && /Uno/.test(x.html));
    assert(/<ul[^>]*><li[^>]*>.*Uno.*<\/li><li[^>]*>.*Dos.*<\/li><\/ul>/.test(list.html), 'viñetas como lista');
    const ell = a.blocks.find(x => x.type === 'shape');
    eq(ell.shape, 'ellipse', 'forma'); eq(ell.fill, '#00aa00', 'relleno'); eq(ell.stroke, '#0000ff', 'borde'); eq(ell.rotation, 30, 'giro');
    const tb = b.blocks.find(x => x.type === 'table');
    assert(tb, 'tabla'); eq(tb.rows.length, 2, 'filas');
    eq(JSON.stringify(tb.merges), JSON.stringify([{ r: 0, c: 0, rs: 1, cs: 2 }]), 'celda combinada');
    R.store.replaceDeck(deck); await sleep(20);
    assert(/Hola mundo/.test(R.io.buildHTML()), 'se exporta de nuevo');
  });

  await test('OpenDocument (.odp): exportar e importar de vuelta', async () => {
    reset(); const s = slide(); s.background = '#1b2a41'; s.notes = 'Nota 1\nlínea 2';
    s.blocks[0].html = '<b>Título</b> con <span style="color:#ff8800">color</span>'; s.blocks[0].fontSize = 64;
    s.blocks[1].html = '<ul><li>Uno</li><li>Dos</li></ul>';
    R.blocks.addShape('star'); Object.assign(last(), { x: 900, y: 80, w: 200, h: 200, fill: '#ffcc00', rotation: 20 });
    R.blocks.addShape('arrow'); Object.assign(last(), { x: 100, y: 560, w: 400, h: 40 });
    R.blocks.addChart();
    R.slides.addSlide(); R.slides.toggleSlideHidden(1); R.blocks.addTable();
    Object.assign(last(), { rows: [['A', '', ''], ['b', 'c', 'd']], merges: [{ r: 0, c: 0, rs: 1, cs: 2 }] });
    const blob = await R.odp.buildODP();
    const zip = await frame.contentWindow.JSZip.loadAsync(blob);
    eq(Object.keys(zip.files)[0], 'mimetype', 'mimetype primero (requisito ODF)');
    eq(await zip.file('mimetype').async('string'), 'application/vnd.oasis.opendocument.presentation', 'tipo');
    assert(Object.keys(zip.files).some(f => /^Pictures\/.*\.svg$/.test(f)), 'el gráfico va como SVG');
    const d = await R.odp.importODP(new File([blob], 'Prueba.odp'));
    eq(d.slides.length, 2, 'dos diapositivas'); eq(d.slides[0].background, '#1b2a41', 'fondo');
    eq(d.slides[0].notes, 'Nota 1\nlínea 2', 'notas'); assert(d.slides[1].hidden, 'oculta');
    const tt = d.slides[0].blocks.find(b => b.type === 'text' && /Título/.test(b.html));
    assert(/<b>Título<\/b>/.test(tt.html) && /color:#ff8800/.test(tt.html), 'negrita y color');
    eq(tt.fontSize, 64, 'tamaño');
    assert(d.slides[0].blocks.some(b => b.type === 'text' && /<ul><li>Uno<\/li><li>Dos<\/li><\/ul>/.test(b.html)), 'lista');
    const st = d.slides[0].blocks.find(b => b.shape === 'star');
    eq(st.fill, '#ffcc00', 'relleno'); eq(st.rotation, 20, 'giro'); eq([st.x, st.y, st.w, st.h].join(','), '900,80,200,200', 'posición con giro');
    const ar = d.slides[0].blocks.find(b => b.shape === 'arrow'); assert(ar && Math.abs(ar.w - 400) < 3, 'flecha');
    assert(d.slides[0].blocks.some(b => b.type === 'image' && /svg/.test(b.src)), 'gráfico como imagen');
    const tb = d.slides[1].blocks.find(b => b.type === 'table');
    eq(JSON.stringify(tb.merges), JSON.stringify([{ r: 0, c: 0, rs: 1, cs: 2 }]), 'celdas combinadas');
  });

  await test('exportar vídeo: GIF animado y MP4', async () => {
    reset(); R.slides.addSlide(); R.store.currentSlide().background = '#aa3300';
    const V = await R.video();
    const gif = await V.buildGIF(R.state.deck, { width: 160, holdMs: 500, fadeMs: 200, fps: 10 });
    const g = new Uint8Array(await gif.arrayBuffer());
    eq(String.fromCharCode(...g.slice(0, 6)), 'GIF89a', 'cabecera GIF');
    const frames = [...g].filter((v, i) => v === 0x2c && g[i - 1] === 0 && g[i - 8] === 0x21).length;
    assert(frames >= 3 || gif.size > 1000, 'varios fotogramas (con fundido)');
    if (V.canEncodeMP4() && (await frame.contentWindow.VideoEncoder.isConfigSupported({ codec: 'avc1.42001f', width: 320, height: 180 })).supported) {
      const mp4 = await V.buildMP4(R.state.deck, { width: 320, holdMs: 500, fadeMs: 200 });
      const m = new Uint8Array(await mp4.arrayBuffer());
      eq(String.fromCharCode(...m.slice(4, 8)), 'ftyp', 'contenedor MP4');
      assert(/moov/.test(String.fromCharCode(...m.slice(0, 4000))), 'moov al principio (reproducción inmediata)');
    }
  });

  await test('voz en off: las notas leídas por la IA, al presentar y en el vídeo', async () => {
    reset(); const W = frame.contentWindow, VO = await W.eval("import('/src/features/ai/voiceover.js')"), AI = R.ai;
    // A 1.5 s tone as WAV (what a voice would return).
    const wav = (secs = 1.5, rate = 8000) => { const n = Math.round(secs * rate), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
      v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true); for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(i / 8) * 8000, true); return new W.Blob([b], { type: 'audio/wav' }); };
    R.slides.addSlide(); R.store.commit(() => { R.state.deck.slides[0].notes = 'Bienvenidos a la clase.'; R.state.deck.slides[1].notes = ''; });
    const asked = []; const say = async (text, o) => { asked.push([text, o.voice]); return wav(); };
    eq(await VO.narrate({ voice: 'coral', say, advance: true }), 1, 'solo las diapositivas con notas');
    eq(JSON.stringify(asked), '[["Bienvenidos a la clase.","coral"]]', 'lee sus notas con la voz elegida');
    const n = R.state.deck.slides[0].narration;
    assert(/^data:audio\/wav;base64,/.test(n.src) && Math.abs(n.ms - 1500) < 100, 'el audio en la diapositiva, con su duración: ' + n.ms);
    eq(R.state.deck.slides[0].autoSlide, n.ms + 800, 'y pasa sola al acabar');
    assert(VO.narrationFresh(R.state.deck.slides[0]), 'al día');
    eq(await VO.narrate({ voice: 'coral', say }), 0, 'lo que ya tiene voz no se vuelve a pagar');
    R.store.commit(() => { R.state.deck.slides[0].notes = 'Otras notas.'; }); assert(!VO.narrationFresh(R.state.deck.slides[0]), 'si cambian las notas, se nota');
    const html = R.io.buildHTML();
    assert(/<audio class="rv-narration" data-autoplay src="data:audio\/wav;base64,/.test(html), 'suena al presentar la diapositiva');
    const V = await R.video();
    const can = async c => W.AudioEncoder && (await W.AudioEncoder.isConfigSupported({ codec: c, sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })).supported;
    if (V.canEncodeMP4() && (await can('mp4a.40.2') || await can('opus')) && (await W.VideoEncoder.isConfigSupported({ codec: 'avc1.42001f', width: 320, height: 180 })).supported) {
      const m = new Uint8Array(await (await V.buildMP4(R.state.deck, { width: 320, holdMs: 400, fadeMs: 0 })).arrayBuffer()), txt = String.fromCharCode(...m);
      assert(/mp4a|Opus/.test(txt) && /avc1/.test(txt), 'el vídeo lleva la voz (AAC u Opus) además de la imagen');
    } else console.warn('voz en off: este navegador no codifica audio; no se comprueba la pista del vídeo');
    VO.removeNarration(); assert(!R.state.deck.slides[0].narration && !R.state.deck.slides[0].autoSlide, 'se quita (y su avance automático)');
    // The request (own OpenRouter key)
    const realFetch = W.fetch; let sent; AI.setAiKey('sk-or-prueba'); AI.acceptPrivacy();
    W.fetch = async (url, o) => { sent = { url, body: JSON.parse(o.body) }; return new W.Response(new Uint8Array([73, 68, 51]), { headers: { 'Content-Type': 'audio/mpeg' } }); };
    try { const b = await AI.speech('Hola', { voice: 'sage' }); eq(b.type, 'audio/mpeg', 'mp3');
      assert(/\/audio\/speech$/.test(sent.url) && sent.body.voice === 'sage' && sent.body.response_format === 'mp3', 'al servicio de voz de OpenRouter'); }
    finally { W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('historial de versiones y guardado de presentaciones grandes', async () => {
    reset(); const V = R.versions, M = R.model;
    slide().blocks[0].html = 'Versión A'; R.render();
    const id = await V.saveVersion('Primera', false);
    slide().blocks[0].html = 'Versión B'; R.store.commit(() => {});
    const list = await V.listVersions();
    const v = list.find(x => x.id === id); assert(v && v.name === 'Primera' && !v.deck, 'listada sin cargar el contenido');
    assert(await V.restoreVersion(id), 'restaurada'); await sleep(10);
    eq(slide().blocks[0].html, 'Versión A', 'contenido de la versión');
    const after = await V.listVersions(); assert(after.some(v => v.kind === 'before' && !list.some(x => x.id === v.id)), 'la anterior se guardó antes de restaurar');
    const back = (await Promise.all(after.filter(x => x.auto).map(x => V.versionDeck(x.id)))).some(d => d.slides[0].blocks[0].html === 'Versión B');
    assert(back, 'la versión B sigue en el historial');
    for (const x of after) await V.deleteVersion(x.id);
    // Autosave grande: localStorage guarda solo una marca y el contenido va a IndexedDB.
    const big = M.emptyDeck(); big.slides[0].blocks.push({ id: 'img', type: 'image', src: 'data:image/png;base64,' + 'A'.repeat(5_000_000), x: 0, y: 0, w: 10, h: 10 });
    M.saveDeck(big); await M.flushSave(big);
    assert(JSON.parse(frame.contentWindow.localStorage.getItem(M.STORAGE_KEY)).tooBig, 'localStorage no se desborda');
    eq(M.loadDeck(), null, 'la carga síncrona lo deja a IndexedDB');
    const got = await M.loadNewerDeck({ savedAt: 0 }); eq(got?.slides[0].blocks.at(-1).src.length, big.slides[0].blocks.at(-1).src.length, 'recuperado entero de IndexedDB');
    R.store.commit(() => {});                                  // vuelve a guardar el estado actual
  });

  await test('fotos y vídeos guardados aparte en el navegador: una vez cada uno, en la presentación y en las versiones', async () => {
    reset(); const W = frame.contentWindow, MS = await W.eval("import('/src/core/mediastore.js')"), I = await W.eval("import('/src/core/idb.js')"), M = R.model;
    // A real picture (bytes that are an image), the same one in two places, and a small one that stays inside.
    const c = D.createElement('canvas'); c.width = 300; c.height = 200; const g = c.getContext('2d');
    for (let i = 0; i < 3000; i++) { g.fillStyle = `hsl(${i % 360},70%,50%)`; g.fillRect(Math.random() * 300, Math.random() * 200, 7, 7); }
    const photo = c.toDataURL('image/png'), small = 'data:image/png;base64,iVBORw0KGgo=';
    assert(photo.length > 64 * 1024, 'foto de prueba de más de 64 KB');
    const deck = M.emptyDeck(); deck.slides[0].blocks.push({ id: 'a', type: 'image', src: photo, x: 0, y: 0, w: 10, h: 10 }, { id: 'b', type: 'image', src: photo, x: 0, y: 0, w: 10, h: 10 }, { id: 'c', type: 'image', src: small, x: 0, y: 0, w: 10, h: 10 });
    const light = await MS.dehydrate(deck), [ra, rb, rc] = ['a', 'b', 'c'].map(k => light.slides[0].blocks.find(b => b.id === k).src);
    assert(/^rvmedia:[0-9a-f]{32}$/.test(ra) && ra === rb && rc === small, 'la grande, una referencia (la misma en los dos sitios); la pequeña, dentro');
    assert(JSON.stringify(light).length < 5000 && deck.slides[0].blocks.find(b => b.id === 'a').src === photo, 'lo guardado, pequeño; la presentación en memoria, intacta');
    const back = await MS.hydrate(light); eq(back.slides[0].blocks.find(b => b.id === 'b').src, photo, 'al leerla, la foto entera otra vez');
    // Autosave and versions keep references; restoring a version brings the photo back.
    R.store.replaceDeck(deck); await M.flushSave(R.state.deck);
    assert(MS.hasRefs(await I.kvGet('deck')), 'el autoguardado, con referencias');
    const id = await R.versions.saveVersion('Con foto', false);
    assert(MS.hasRefs((await I.verGet(id)).deck) && JSON.stringify((await I.verGet(id)).deck).length < 20000, 'la versión, sin otra copia de la foto');
    R.store.commit(() => { R.state.deck.slides[0].blocks = R.state.deck.slides[0].blocks.filter(b => b.type !== 'image'); });
    assert(await R.versions.restoreVersion(id), 'restaurada'); await sleep(20);
    eq(R.state.deck.slides[0].blocks.find(b => b.id === 'a')?.src, photo, 'con su foto');
    // A file nothing refers to: deleted (not one stored just now, whose deck may be on its way).
    const fresh = await MS.dehydrate({ x: 'data:image/png;base64,' + 'B'.repeat(70000) });
    eq(await MS.collectGarbage([]), 0, 'lo recién guardado no se borra');
    for (const v of await R.versions.listVersions()) await R.versions.deleteVersion(v.id);
    assert(MS.isRef(fresh.x), 'referencia');
    reset();
  });

  await test('versiones guardadas enteras por un Revela antiguo: se leen de una en una y se rehacen con referencias', async () => {
    reset(); const W = frame.contentWindow, MS = await W.eval("import('/src/core/mediastore.js')"), I = await W.eval("import('/src/core/idb.js')"), M = R.model;
    for (const v of await R.versions.listVersions()) await R.versions.deleteVersion(v.id);
    // Three old versions, each with its 3 MB «photo» inside (as before media was kept apart).
    const photo = 'data:image/png;base64,' + btoa(String.fromCharCode(...Array.from({ length: 3999 }, (_, i) => (i * 37) & 255))).repeat(560);
    const old = n => { const d = M.emptyDeck(); d.slides[0].blocks.push({ id: 'p', type: 'image', src: photo, x: 0, y: 0, w: 10, h: 10 }); return { id: 'old' + n, time: n, name: 'Vieja ' + n, auto: true, title: '', slides: 1, deck: d }; };
    for (const n of [1, 2, 3]) await I.verPut(old(n));
    assert(!MS.hasRefs((await I.verGet('old1')).deck), 'guardadas enteras, como antes');
    // Listing them reads one at a time and hands out no decks.
    const list = await R.versions.listVersions(); eq(list.length, 3, 'las tres'); assert(list.every(v => !('deck' in v)), 'sin sus presentaciones');
    let seen = 0; await I.verEach(() => { seen++; }); eq(seen, 3, 'una a una');
    // Tidying the stored copies (the autosave does it now and then): rewritten with references, the photo once.
    await M.tidyStored(M.emptyDeck());
    for (const n of [1, 2, 3]) { const v = await I.verGet('old' + n); assert(MS.hasRefs(v.deck) && JSON.stringify(v.deck).length < 20000, 'la ' + n + ', con referencia'); }
    assert(await R.versions.restoreVersion('old2'), 'y se restaura'); await sleep(20);
    eq(R.state.deck.slides[0].blocks.find(b => b.id === 'p')?.src, photo, 'con su foto entera');
    for (const v of await R.versions.listVersions()) await R.versions.deleteVersion(v.id);
    reset();
  });

  await test('abrir proyecto, cifrado con contraseña y marcar como final', async () => {
    reset(); const P = R.protect;
    slide().blocks[0].html = 'Secreto';
    const env = await P.encryptDeck(R.state.deck, 'clave-1');
    assert(P.isEncrypted(env) && !JSON.stringify(env).includes('Secreto'), 'contenido cifrado');
    let err = ''; try { await P.decryptDeck(env, 'otra'); } catch (e) { err = e.message; } eq(err, 'BAD_PASSWORD', 'contraseña incorrecta');
    eq((await P.decryptDeck(env, 'clave-1')).slides[0].blocks[0].html, 'Secreto', 'descifrado');
    // Abrir: el lector de archivos lee texto (antes leía una data: URL y fallaba).
    const W = frame.contentWindow, input = { files: [new W.File([JSON.stringify(R.state.deck)], 'p.revela.json')] };
    const orig = W.document.createElement.bind(W.document);
    W.document.createElement = tag => { const el = orig(tag); if (tag === 'input') { el.click = () => { Object.defineProperty(el, 'files', { value: input.files }); el.onchange(); }; } return el; };
    slide().blocks[0].html = 'Cambiado'; R.render();
    try { D.querySelector('[data-action="open"]').click(); await sleep(50); } finally { W.document.createElement = orig; }
    assert(D.querySelector('.modal-backdrop .dlg-ok'), 'con cambios, Abrir pregunta antes de sustituirla'); D.querySelector('.modal-backdrop .dlg-ok').click(); await sleep(50);
    eq(slide().blocks[0].html, 'Secreto', 'abrir proyecto .revela.json funciona');
    P.setFinal(true); await sleep(10);
    assert(!D.getElementById('final-banner').hidden, 'aviso de final');
    const n = slide().blocks.length; R.blocks.addText(); eq(slide().blocks.length, n, 'no se puede editar');
    P.setFinal(false); R.blocks.addText(); eq(slide().blocks.length, n + 1, 'editable de nuevo');
  });

  await test('importar PowerPoint: gráficos, fondo degradado y transiciones', async () => {
    reset(); await R.pptx.buildPptx();
    const W = frame.contentWindow, P = new W.PptxGenJS(); P.layout = 'LAYOUT_16x9';
    const s1 = P.addSlide();
    s1.addChart(P.ChartType.bar, [{ name: 'Ventas', labels: ['Ene', 'Feb', 'Mar'], values: [3, 5, 4] }, { name: 'Costes', labels: ['Ene', 'Feb', 'Mar'], values: [1, 2, 2] }],
      { x: 1, y: 1, w: 6, h: 3, chartColors: ['112233', 'AA5500'] });
    P.addSlide().addText('Dos', { x: 1, y: 1, w: 4, h: 1 });
    const zip = await W.JSZip.loadAsync(await P.write({ outputType: 'blob' }));
    // Añade a mano lo que PptxGenJS no escribe: fondo degradado y transición con avance automático.
    let x = await zip.file('ppt/slides/slide2.xml').async('string');
    x = x.replace(/<p:cSld([^>]*)>/, '<p:cSld$1><p:bg><p:bgPr><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs><a:gs pos="100000"><a:srgbClr val="0000FF"/></a:gs></a:gsLst><a:lin ang="5400000"/></a:gradFill></p:bgPr></p:bg>');
    x = x.replace('</p:sld>', '<p:transition advTm="3000"><p:fade/></p:transition></p:sld>');
    zip.file('ppt/slides/slide2.xml', x);
    const deck = await R.pptxImport.importPPTX(new File([await zip.generateAsync({ type: 'blob' })], 'g.pptx'));
    const ch = deck.slides[0].blocks.find(b => b.type === 'chart');
    assert(ch, 'gráfico convertido'); eq(ch.chartType, 'bar', 'tipo');
    eq(ch.data.map(d => d.label + d.value).join(','), 'Ene3,Feb5,Mar4', 'datos'); eq(ch.seriesName, 'Ventas', 'serie');
    eq(ch.series[0].values.join(','), '1,2,2', 'segunda serie'); eq(ch.x, 128, 'posición');
    eq(deck.slides[1].background, 'linear-gradient(180deg, #ff0000 0%, #0000ff 100%)', 'fondo degradado');
    eq(deck.slides[1].transition, 'fade', 'transición'); eq(deck.slides[1].autoSlide, 3000, 'avance automático');
  });

  await test('importar PowerPoint: clics de las animaciones, efectos, duración de las transiciones, Morph y vídeos', async () => {
    reset(); await R.pptx.buildPptx();
    const W = frame.contentWindow, P = new W.PptxGenJS(); P.layout = 'LAYOUT_16x9';
    const s1 = P.addSlide();
    for (const [i, t] of ['Uno', 'Dos', 'Tres', 'Cuatro'].entries()) s1.addText(t, { x: 0.5 + i * 2, y: 1, w: 1.8, h: 1 });
    s1.addMedia({ type: 'video', data: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=', x: 1, y: 3, w: 4, h: 2 });
    P.addSlide().addText('Morph', { x: 1, y: 1, w: 4, h: 1 });
    const s3 = P.addSlide(); s3.addText('Corte', { x: 1, y: 1, w: 4, h: 1 }); s3.addText('G1', { x: 1, y: 3, w: 2, h: 1 }); s3.addText('G2', { x: 4, y: 3, w: 2, h: 1 });
    const zip = await W.JSZip.loadAsync(await P.write({ outputType: 'blob' }));
    // (PptxGenJS gives the video the id of a text box: a unique one, as PowerPoint would.)
    let x = (await zip.file('ppt/slides/slide1.xml').async('string')).replace(/(<p:pic>\s*<p:nvPicPr><p:cNvPr id=")\d+"/, (m, a) => a + '99"');
    const id = t => new RegExp(`<p:cNvPr id="(\\d+)"[^>]*>(?:(?!<p:cNvPr).)*?<a:t>${t}</a:t>`, 's').exec(x)?.[1] || '';
    const vid = /<p:pic>.*?<p:cNvPr id="(\d+)"/s.exec(x)?.[1];
    const [a, b, c, d] = ['Uno', 'Dos', 'Tres', 'Cuatro'].map(id);
    assert(a && b && c && d && vid, 'ids de las formas ' + [a, b, c, d, vid]);
    // (PowerPoint's timeline, as it writes it: each effect a cTn with its preset, class and how it starts.)
    let n = 10;
    const eff = (node, cls, preset, sp, body) => `<p:par><p:cTn id="${n++}" presetID="${preset}" presetClass="${cls}" presetSubtype="0" fill="hold" nodeType="${node}"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${body(sp)}</p:childTnLst></p:cTn></p:par>`;
    const fade = sp => `<p:set><p:cBhvr><p:cTn id="${n++}" dur="1" fill="hold"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set><p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${n++}" dur="500"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl></p:cBhvr></p:animEffect>`;
    const appear = sp => `<p:set><p:cBhvr><p:cTn id="${n++}" dur="1" fill="hold"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`;
    const bold = sp => `<p:set><p:cBhvr override="childStyle"><p:cTn id="${n++}" dur="indefinite"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl><p:attrNameLst><p:attrName>style.fontWeight</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="bold"/></p:to></p:set>`;
    const play = sp => `<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="${n++}" dur="4000" fill="hold"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl></p:cBhvr></p:cmd>`;
    const seq = [eff('clickEffect', 'entr', 10, a, fade), eff('withEffect', 'entr', 10, b, fade), eff('afterEffect', 'entr', 53, c, fade),
      eff('clickEffect', 'emph', 15, a, bold), eff('clickEffect', 'entr', 1, d, appear), eff('withEffect', 'mediacall', 1, vid, play)].join('');
    x = x.replace('</p:sld>', '<p:transition spd="med" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" p14:dur="700"><p:fade/></p:transition>'
      + `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${seq}</p:childTnLst></p:cTn></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing></p:sld>`);
    zip.file('ppt/slides/slide1.xml', x);
    let x2 = await zip.file('ppt/slides/slide2.xml').async('string');
    x2 = x2.replace('</p:sld>', '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
      + '<p:transition spd="slow" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" p14:dur="2000"><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent></p:sld>');
    zip.file('ppt/slides/slide2.xml', x2);
    // A group (G1 and G2) that fades in on a click; then a click on something that isn't there; then «with previous».
    let x3 = await zip.file('ppt/slides/slide3.xml').async('string');
    const spOf = t => new RegExp(`<p:sp>(?:(?!<p:sp>).)*?<a:t>${t}</a:t>.*?</p:sp>`, 's').exec(x3)[0], g1 = spOf('G1'), g2 = spOf('G2'), corte = /<p:cNvPr id="(\d+)"[^>]*>(?:(?!<p:cNvPr).)*?<a:t>Corte<\/a:t>/s.exec(x3)[1];
    x3 = x3.replace(g1, '').replace(g2, `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="60" name="Grupo"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${g1}${g2}</p:grpSp>`);
    x3 = x3.replace('</p:sld>', `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>`
      + [eff('clickEffect', 'entr', 10, 60, fade), eff('clickEffect', 'entr', 10, 999, fade), eff('withEffect', 'entr', 10, corte, fade)].join('') + '</p:childTnLst></p:cTn></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing></p:sld>');
    zip.file('ppt/slides/slide3.xml', x3);
    const blob = await zip.generateAsync({ type: 'blob' });
    const deck = await R.pptxImport.importPPTX(new File([blob], 'anim.pptx'));
    const bs = deck.slides[0].blocks, by = t => bs.find(q => q.type === 'text' && q.html.includes(t)), A = by('Uno').animation;
    // «With previous» and «after previous» share the click of the one before: three clicks, not six.
    eq(A.order, 1, 'clic 1'); eq(by('Dos').animation.order, 1, 'con la anterior: el mismo clic'); eq(by('Dos').animation.start, 'withPrev');
    eq(by('Tres').animation.order, 1, 'después de la anterior: el mismo clic'); eq(by('Tres').animation.effect, 'zoom-in', 'zoom');
    const emph = by('Uno').anims?.[0]; eq(emph?.effect, 'color-pulse', 'Revelar en negrita: un brillo, no crecer al 130 %'); eq(emph.order, 2, 'clic 2');
    eq(by('Cuatro').animation.order, 3, 'clic 3'); eq(by('Cuatro').animation.duration, 0, 'Aparecer es instantáneo');
    const v = bs.find(q => q.type === 'video'); eq(v?.animation?.effect, 'media-play', 'el vídeo se reproduce (mediacall)'); eq(v.animation.order, 3, 'con su clic');
    eq(deck.slides[0].transition, 'fade', 'fundido'); eq(deck.slides[0].transitionDur, 700, 'su duración exacta (p14:dur)');
    assert(deck.slides[1].autoAnimate && deck.slides[1].transition === null, 'Morph'); eq(deck.slides[1].aaDuration, 2, 'Morph de 2 s');
    eq(deck.slides[2].transition, 'none', 'sin transición en PowerPoint: corte (no la de toda la presentación)');
    const b3 = t => deck.slides[2].blocks.find(q => q.type === 'text' && q.html.includes(t)).animation;
    assert(b3('G1')?.order === 1 && b3('G2')?.order === 1 && b3('G2').start === 'withPrev', 'la animación de un grupo, en todos sus objetos a la vez');
    assert(b3('Corte')?.order === 2 && b3('Corte').start === 'click', 'un clic de algo que no se importa no se pierde: lo hereda la siguiente');
    const html = R.io.buildHTML(deck);
    const sec1 = new DOMParser().parseFromString(html, 'text/html').querySelector(`section[data-rv-id="${deck.slides[0].id}"]`);
    eq(sec1.querySelectorAll('[data-fragment-index="1"]').length, 3, 'tres efectos en el primer clic');
    assert(/data-rv-dur="700"/.test(html) && /data-auto-animate-duration="2"/.test(html), 'duraciones al presentar');
    // Too big for the browser (here: more than 10 bytes): left out and said, its picture kept; big ones said too.
    const notes = [], small = await R.pptxImport.importPPTX(new File([blob], 'anim.pptx'), { notes, mediaMax: 10, mediaBig: 5 });
    assert(!small.slides[0].blocks.some(q => q.type === 'video') && small.slides[0].blocks.length >= 4, 'el vídeo no entra; lo demás sí');
    assert(notes.some(q => q.kind === 'tooBig' && /\.mp4$/.test(q.name)), 'se dice qué vídeo no cabe');
    const msg = R.openfile.importNotesText(notes);
    assert(/\.mp4/.test(msg) && msg.length > 40, 'el aviso nombra el archivo: ' + msg.slice(0, 80));
    const steps = []; await R.pptxImport.importPPTX(new File([blob], 'anim.pptx'), { progress: p => steps.push(p) });
    assert(steps.some(p => p.slide === 3 && p.of === 3), 'dice por qué diapositiva va');
  });

  await test('ODP: animaciones de objetos (Impress) de ida y vuelta', async () => {
    reset(); const s = slide();
    s.blocks[0].html = 'Título'; s.blocks[0].animation = { effect: 'fade-up', order: 0, duration: 700 };
    R.blocks.addShape('star'); const star = last(); star.animation = { effect: 'grow', order: 1, start: 'withPrev', delay: 200 };
    R.blocks.addShape('rect'); const rect = last(); rect.animation = { effect: 'path', order: 2, start: 'afterPrev', dx: 256, dy: 72, pathShape: 'arc' };
    s.blocks[1].html = 'Cuerpo'; s.blocks[1].animation = { effect: 'fade-out', order: 3 };
    R.blocks.addShape('ellipse'); const ell = last(); ell.animation = { effect: 'zoom-in', order: 4, trigger: star.id };
    const blob = await R.odp.buildODP(), zip = await frame.contentWindow.JSZip.loadAsync(blob);
    const xml = await zip.file('content.xml').async('string');
    const dom = new frame.contentWindow.DOMParser().parseFromString(xml, 'application/xml');
    assert(!dom.getElementsByTagName('parsererror').length, 'XML bien formado');
    for (const id of ['ooo-entrance-ascend', 'ooo-emphasis-grow-and-shrink', 'ooo-motionpath-user-defined', 'ooo-exit-fade-out', 'ooo-entrance-zoom'])
      assert(xml.includes(`presentation:preset-id="${id}"`), 'efecto ' + id);
    assert(/presentation:node-type="main-sequence"/.test(xml) && /presentation:node-type="interactive-sequence"/.test(xml), 'secuencia principal y de desencadenador');
    eq((xml.match(/<anim:par smil:begin="next">/g) || []).length, 2, 'dos clics (el resto va con el anterior o después)');
    assert(/smil:begin="0.2s"[^>]*presentation:node-type="with-previous"/.test(xml), 'con la anterior, con su retraso');
    const d = await R.odp.importODP(new File([await R.odp.buildODP()], 'A.odp'));
    const bs = d.slides[0].blocks, by = f => bs.find(f);
    const t0 = by(b => b.type === 'text' && /Título/.test(b.html)), st = by(b => b.shape === 'star'), rc = by(b => b.shape === 'rect'), el = by(b => b.shape === 'ellipse');
    eq(t0.animation?.effect, 'fade-up', 'entrada flotando'); eq(t0.animation.duration, 700, 'duración');
    eq(st.animation?.effect, 'grow', 'énfasis'); eq(st.animation.start, 'withPrev'); eq(st.animation.delay, 200, 'retraso');
    eq(rc.animation?.effect, 'path', 'trayectoria'); eq(rc.animation.start, 'afterPrev');
    assert(Math.abs(rc.animation.dx - 256) < 2 && Math.abs(rc.animation.dy - 72) < 2, 'destino de la trayectoria ' + rc.animation.dx + ',' + rc.animation.dy);
    eq(by(b => b.type === 'text' && /Cuerpo/.test(b.html)).animation?.effect, 'fade-out', 'salida');
    eq(el.animation?.effect, 'zoom-in', 'zoom'); eq(el.animation.trigger, st.id, 'al hacer clic en la estrella');
    assert(t0.animation.order < rc.animation.order && rc.animation.order < by(b => /Cuerpo/.test(b.html || '')).animation.order, 'orden');
  });

  await test('HTML: el código en DAX, Power Query o Excel también se colorea al presentar', async () => {
    reset();
    R.store.commit(() => { slide().blocks.push({ id: 'cd1', type: 'code', lang: 'dax', code: 'M = VAR x = MAX(T[year]) RETURN x', x: 0, y: 0, w: 600, h: 200 }); });
    const h = R.io.buildHTML();
    assert(/RevealHighlight\(\)\.hljs/.test(h) && /registerLanguage/.test(h) && /'dax'/.test(h), 'los lenguajes se enseñan al resaltador de la presentación');
    assert(h.indexOf('registerLanguage') < h.indexOf('Reveal.initialize'), 'antes de arrancarla');
    R.store.commit(() => { slide().blocks.pop(); });
    assert(!/registerLanguage/.test(R.io.buildHTML()), 'sin código, no se añade nada');
  });

  await test('HTML: una imagen repetida va una sola vez (también con imágenes enormes)', async () => {
    reset();
    const pic = 'data:image/png;base64,' + 'A'.repeat(3000), huge = 'data:image/png;base64,' + 'B'.repeat(6e6);
    R.store.commit(() => { slide().blocks.push({ id: 'p1', type: 'image', src: pic, x: 0, y: 0, w: 10, h: 10 }, { id: 'p2', type: 'image', src: pic, x: 20, y: 0, w: 10, h: 10 },
      { id: 'p3', type: 'image', src: huge, x: 40, y: 0, w: 10, h: 10 }, { id: 'p4', type: 'image', src: huge, x: 60, y: 0, w: 10, h: 10 }); });
    const h = R.io.buildHTML();
    eq(h.split(pic).length - 1, 1, 'la pequeña, una vez'); eq(h.split(huge).length - 1, 1, 'la enorme, una vez');
    eq((h.match(/data-rv-src="m\d+"/g) || []).length, 4, 'las cuatro apuntan a la tabla');
    assert(h.indexOf('var M=') < h.indexOf('/dist/reveal.js"></script>'), 'la tabla antes de reveal.js');
  });

  await test('PowerPoint y ODP: texto con formato y todos los objetos', async () => {
    reset();
    const { htmlToRuns } = await frame.contentWindow.eval("import('/src/io/formats/pptx-export.js')");
    const runs = htmlToRuns('<b>Hola</b> <span style="color:rgb(255, 0, 0);font-size:40px">rojo</span><ul><li>uno</li><ul><li>dos</li></ul></ul><ol><li>tres</li></ol>', { fontSize: 20 });
    const b1 = runs.find(r => r.text === 'Hola'), red = runs.find(r => r.text === 'rojo');
    assert(b1.options.bold, 'negrita'); eq(red.options.color, 'FF0000', 'color'); eq(red.options.fontSize, 30, 'tamaño en puntos');
    const uno = runs.find(r => r.text === 'uno'), dos = runs.find(r => r.text === 'dos'), tres = runs.find(r => r.text === 'tres');
    eq(uno.options.bullet, true, 'viñeta'); eq(dos.options.indentLevel, 1, 'nivel anidado'); eq(tres.options.bullet.type, 'number', 'numeración');
    assert(uno.options.breakLine, 'párrafos separados');
    // Todos los tipos en .pptx y .odp
    const B = R.blocks, s = slide(); R.blocks.addShape('rect'); const a = last(); R.blocks.addShape('ellipse'); const c = last(); c.x = 800;
    R.store.setMulti([a.id, c.id]); B.addConnector(); B.addIcon('star'); B.addCode(); B.addMath(); B.addInk([[0, 0], [40, 30]]);
    R.slides.addSlide(); R.slides.toggleSlideHidden(1);
    const zip = await frame.contentWindow.JSZip.loadAsync(await R.pptx.buildPptxBlob());
    const x1 = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/<a:b\b|b="1"/.test(x1), 'negrita en el pptx'); assert(/prst="line"/.test(x1), 'conector como línea');
    assert(/Courier New/.test(x1), 'código en monoespaciada');
    eq((x1.match(/<p:pic>/g) || []).length, 3, 'icono, ecuación y tinta como imágenes');
    assert(/show="0"/.test(await zip.file('ppt/slides/slide2.xml').async('string')), 'diapositiva oculta conservada como oculta');
    const oz = await frame.contentWindow.JSZip.loadAsync(await R.odp.buildODP());
    const cx = await oz.file('content.xml').async('string');
    assert((cx.match(/<draw:line /g) || []).length >= 1 && /Courier New/.test(cx), 'ODP: conector y código');
    assert(Object.keys(oz.files).filter(f => /^Pictures\/.*\.png$/.test(f)).length >= 1, 'ODP: ecuación como imagen');
  });

  // A 20×10 test picture: left half red, right half blue.
  const W_ = () => frame.contentWindow;
  const pic = () => { const c = D.createElement('canvas'); c.width = 20; c.height = 10; const x = c.getContext('2d');
    x.fillStyle = '#ff0000'; x.fillRect(0, 0, 10, 10); x.fillStyle = '#0000ff'; x.fillRect(10, 0, 10, 10); return c.toDataURL('image/png'); };
  const px = (canvas, x, y) => [...canvas.getContext('2d').getImageData(x, y, 1, 1).data];
  const blobCanvas = async blob => { const bmp = await W_().createImageBitmap(blob); const c = D.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); return c; };

  await test('objetos como imagen: ajustes de foto con la misma fórmula que CSS', async () => {
    const O = R.objects, img = n => ({ data: new Uint8ClampedArray([n, n, n, 255, 255, 0, 0, 255]) });
    eq(O.applyAdjustments(img(64), { brightness: 200 }).data[0], 128, 'brillo 200 % duplica');
    eq(O.applyAdjustments(img(64), { contrast: 0 }).data[0], 128, 'contraste 0 → gris medio');
    const g = O.applyAdjustments(img(0), { saturate: 0 }).data; assert(g[4] === g[5] && g[5] === g[6], 'saturación 0 → gris');
    eq(Math.round(O.applyAdjustments(img(10), { opacity: 50 }).data[3]), 128, 'transparencia 50 %');
    const r = O.fitRect('contain', 200, 100, 100, 100); eq(JSON.stringify(r), '[0,25,100,50]', 'contener centra');
    eq(JSON.stringify(O.fitRect('cover', 200, 100, 100, 100)), '[-50,0,200,100]', 'rellenar recorta');
    const bb = O.boundsOf([{ x: 100, y: 100, w: 200, h: 100, rotation: 90 }]);
    eq(JSON.stringify(bb), JSON.stringify({ x: 150, y: 50, w: 100, h: 200 }), 'caja con giro');
  });

  await test('objetos como imagen: la foto con recorte, ajustes y fondo transparente', async () => {
    reset(); R.blocks.addImage(pic()); const b = last(); Object.assign(b, { x: 100, y: 100, w: 200, h: 100, fit: 'fill' });
    b.crop = { left: 50 }; b.adj = { brightness: 50 };
    const baked = await R.objects.bakeImage(b, 1);
    eq(px(baked, 20, 50)[3], 0, 'la parte recortada queda transparente');
    const blue = px(baked, 180, 50); assert(blue[2] > 110 && blue[2] < 140 && blue[3] === 255, 'la parte visible con el brillo al 50 %: ' + blue);
    const png = await R.objects.objectsFile([b], { format: 'png', scale: 1 });
    eq(png.blob.type, 'image/png', 'PNG'); eq(png.ext, 'png', 'extensión');
    const c = await blobCanvas(png.blob);
    eq(c.width + 'x' + c.height, '200x100', 'tamaño del objeto a 1×');
    eq(px(c, 20, 50)[3], 0, 'PNG transparente donde no hay foto');
    assert(px(c, 180, 50)[2] > 100, 'PNG con la parte azul editada');
    const c2 = await blobCanvas((await R.objects.objectsFile([b], { format: 'png', scale: 2 })).blob);
    eq(c2.width, 400, 'escala 2×');
    const jpg = await R.objects.objectsFile([b], { format: 'jpg', scale: 1 });
    eq(jpg.blob.type, 'image/jpeg', 'JPG');
    eq(px(await blobCanvas(jpg.blob), 20, 50).slice(0, 3).every(v => v > 240), true, 'JPG: blanco donde era transparente');
    const webp = await R.objects.objectsFile([b], { format: 'webp', scale: 1 });
    eq(webp.ext, 'webp', 'WebP'); eq(px(await blobCanvas(webp.blob), 20, 50)[3], 0, 'WebP transparente');
    const bg = await blobCanvas((await R.objects.objectsFile([b], { format: 'png', scale: 1, background: '#00ff00' })).blob);
    eq(px(bg, 20, 50).join(), '0,255,0,255', 'con fondo elegido');
    b.crop = null; b.adj = null; b.flipH = true;
    const fl = await blobCanvas((await R.objects.objectsFile([b], { format: 'png', scale: 1 })).blob);
    assert(px(fl, 20, 50)[2] > 200 && px(fl, 180, 50)[0] > 200, 'volteo horizontal respetado');
    b.flipH = false; b.rotation = 90;
    const ro = await blobCanvas((await R.objects.objectsFile([b], { format: 'png', scale: 1 })).blob);
    eq(ro.width + 'x' + ro.height, '100x200', 'girada 90°: caja vertical');
    assert(px(ro, 50, 20)[0] > 200 && px(ro, 50, 180)[2] > 200, 'girada 90°: rojo arriba, azul abajo');
    b.rotation = 0;
    const orig = await R.objects.originalImage(b);
    eq(orig.ext, 'png', 'original: su propio formato');
    const oc = await blobCanvas(orig.blob); eq(oc.width + 'x' + oc.height, '20x10', 'original sin ediciones ni escalado');
  });

  await test('objetos como imagen: varios juntos, uno por archivo y SVG vectorial', async () => {
    reset(); R.blocks.addShape('ellipse'); const e = last(); Object.assign(e, { x: 0, y: 0, w: 100, h: 100, fill: '#ff0000', stroke: '#ff0000' });
    R.blocks.addShape('rect'); const r = last(); Object.assign(r, { x: 200, y: 100, w: 100, h: 50, fill: '#0000ff' });
    const both = await blobCanvas((await R.objects.objectsFile([e, r], { format: 'png', scale: 1 })).blob);
    eq(both.width + 'x' + both.height, '300x150', 'la caja que abarca a los dos');
    eq(px(both, 2, 2)[3], 0, 'esquina de la elipse transparente');
    assert(px(both, 50, 50)[0] > 200, 'elipse dibujada'); assert(px(both, 250, 125)[2] > 200, 'rectángulo dibujado');
    eq(px(both, 150, 20)[3], 0, 'hueco entre ambos transparente');
    const svg = await R.objects.objectsFile([e], { format: 'svg' });
    eq(svg.blob.type, 'image/svg+xml', 'SVG');
    const doc = new (W_().DOMParser)().parseFromString(await svg.blob.text(), 'image/svg+xml');
    assert(!doc.querySelector('parsererror') && doc.documentElement.getAttribute('width') === '100', 'SVG válido con su tamaño');
    assert(doc.querySelector('ellipse, path, circle'), 'SVG vectorial con la forma');
    let err = ''; R.blocks.addText(); await R.objects.objectsFile([last()], { format: 'svg' }).catch(x => { err = x.message; });
    assert(/SVG/.test(err), 'un texto no se ofrece como SVG');
    // One file per object → a zip with two PNGs.
    const saved = []; const orig = W_().HTMLAnchorElement.prototype.click;
    W_().HTMLAnchorElement.prototype.click = function () { saved.push(this.download); };
    try { await R.objects.exportObjects([e, r], { mode: 'each', format: 'png', scale: 1 }); }
    finally { W_().HTMLAnchorElement.prototype.click = orig; }
    assert(saved.length === 1 && /\.zip$/.test(saved[0]), 'un ZIP: ' + saved);
  });

  await test('objetos como imagen: menú contextual, cinta y opciones del diálogo', async () => {
    reset(); R.blocks.addImage(pic()); const b = last(); select(b); await sleep(20);
    const el = D.querySelector(`.block[data-id="${b.id}"]`);
    el.dispatchEvent(new (W_().MouseEvent)('contextmenu', { bubbles: true, clientX: 150, clientY: 150 })); await sleep(10);
    const item = [...D.querySelectorAll('#context-menu .ctx-item')].find(x => x.textContent === 'Guardar como imagen…');
    assert(item, 'opción en el menú contextual'); item.click(); await sleep(10);
    const m = D.getElementById('pic-modal'); assert(m, 'se abre el diálogo');
    assert(m.querySelector('.pic-mode option[value="original"]'), 'foto: con ediciones u original');
    assert(!m.querySelector('.pic-format option[value="svg"]'), 'foto: sin SVG');
    const f = m.querySelector('.pic-format'); f.value = 'jpg'; f.dispatchEvent(new (W_().Event)('change'));
    assert(m.querySelector('.pic-bg option[value=""]').disabled && m.querySelector('.pic-bg').value === '#ffffff', 'JPG: sin transparencia');
    const mode = m.querySelector('.pic-mode'); mode.value = 'original'; mode.dispatchEvent(new (W_().Event)('change'));
    assert(m.querySelector('.pic-f').hidden, 'original: sin formato ni tamaño');
    m.querySelector('.modal-close').click();
    R.blocks.addShape('rect'); select(last()); R.picture.openSaveAsPicture();
    assert(D.querySelector('#pic-modal .pic-format option[value="svg"]'), 'forma: ofrece SVG');
    D.querySelector('#pic-modal .modal-close').click();
    assert(D.querySelector('[data-action="save-picture"]'), 'botón en Archivo');
  });

  await test('presentación igual que el editor: sin márgenes, bordes ni fondo de reveal.js en imágenes, tablas y listas', async () => {
    reset(); R.blocks.addImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
    const im = last(); Object.assign(im, { x: 100, y: 100, w: 200, h: 100 });
    R.blocks.addTable(); const tb = last(); Object.assign(tb, { x: 400, y: 300, w: 400, h: 200 });
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden';
    D.body.appendChild(f);
    try {
      f.srcdoc = R.io.buildHTML(); let img = null;
      for (let i = 0; i < 100 && !img; i++) { await sleep(100); img = f.contentDocument?.querySelector('.reveal .stage img'); if (img && !f.contentWindow.Reveal?.isReady?.()) img = null; }
      assert(img, 'presentación cargada');
      const cs = f.contentWindow.getComputedStyle(img);
      eq(cs.marginTop + ' ' + cs.borderTopWidth + ' ' + cs.backgroundColor, '0px 0px rgba(0, 0, 0, 0)', 'imagen sin margen, borde ni fondo');
      const r = img.getBoundingClientRect(), st = f.contentDocument.querySelector('.reveal .stage').getBoundingClientRect(), k = st.width / 1280;
      assert(Math.abs((r.top - st.top) / k - 100) < 1.5, 'la imagen está donde en el editor: ' + (r.top - st.top) / k);
      eq(f.contentWindow.getComputedStyle(f.contentDocument.querySelector('.reveal .stage table td')).fontSize, '16px', 'tabla con su tamaño de letra');
    } finally { f.remove(); }
  });

  await test('importar PowerPoint: formato heredado de la plantilla (tamaños, colores, interlineado), logotipos y tablas', async () => {
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const W = frame.contentWindow, zip = new W.JSZip();
    const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
    const rel = (id, type, target, ext = '') => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"${ext}/>`;
    const rels = (...r) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r.join('')}</Relationships>`;
    const sp = (ph, off, body, fill = '') => `<p:sp><p:nvSpPr><p:cNvPr id="2" name="s"/><p:cNvSpPr/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr>${off}${fill}</p:spPr>${body}</p:sp>`;
    const xf = (x, y, w, h) => `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>`;
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    zip.file('ppt/presentation.xml', `<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/>`
      + `<p:defaultTextStyle><a:lvl1pPr><a:defRPr sz="1400"/></a:lvl1pPr></p:defaultTextStyle></p:presentation>`);
    zip.file('ppt/_rels/presentation.xml.rels', rels(rel('rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'), rel('rId2', 'slide', 'slides/slide1.xml'), rel('rId3', 'theme', 'theme/theme1.xml')));
    zip.file('ppt/theme/theme1.xml', `<a:theme ${NS}><a:themeElements><a:clrScheme name="c"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1></a:clrScheme>`
      + `<a:fontScheme name="f"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>`);
    // Master: the sizes and colours live here (as in Google Slides exports).
    zip.file('ppt/slideMasters/slideMaster1.xml', `<p:sldMaster ${NS}><p:cSld><p:spTree>`
      + sp('<p:ph type="title"/>', xf(311700, 445025, 8520600, 572700), `<p:txBody><a:bodyPr/><a:lstStyle><a:lvl1pPr><a:defRPr sz="2800"><a:solidFill><a:srgbClr val="652D90"/></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p/></p:txBody>`)
      + sp('<p:ph type="body" idx="1"/>', xf(311700, 1152475, 8520600, 3416400), `<p:txBody><a:bodyPr/><a:lstStyle><a:lvl1pPr marL="457200" indent="-342900"><a:lnSpc><a:spcPct val="115000"/></a:lnSpc><a:buChar char="●"/><a:defRPr sz="1800"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p/></p:txBody>`)
      + `</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"/><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="1400"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="1400"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1400"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`);
    zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', rels(rel('rId1', 'theme', '../theme/theme1.xml')));
    // Layout: placeholders without size (inherit) and a logo.
    zip.file('ppt/slideLayouts/slideLayout1.xml', `<p:sldLayout ${NS}><p:cSld><p:spTree>`
      + sp('<p:ph type="title"/>', xf(311700, 445025, 8520600, 572700), `<p:txBody><a:bodyPr/><a:lstStyle><a:lvl1pPr><a:defRPr/></a:lvl1pPr></a:lstStyle><a:p/></p:txBody>`)
      + `<p:pic><p:nvPicPr><p:cNvPr id="9" name="logo"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/></p:blipFill><p:spPr>${xf(311700, 4600000, 1500000, 400000)}</p:spPr></p:pic>`
      + `</p:spTree></p:cSld></p:sldLayout>`);
    zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', rels(rel('rId1', 'slideMaster', '../slideMasters/slideMaster1.xml'), rel('rId2', 'image', '../media/logo.png')));
    zip.file('ppt/media/logo.png', png, { base64: true });
    zip.file('ppt/tableStyles.xml', `<a:tblStyleLst ${NS.split(' ')[0]}><a:tblStyle styleId="{T}"><a:wholeTbl><a:tcTxStyle><a:font><a:latin typeface="Arial"/></a:font><a:srgbClr val="000000"/></a:tcTxStyle><a:tcStyle><a:tcBdr><a:left><a:ln><a:solidFill><a:srgbClr val="9E9E9E"/></a:solidFill></a:ln></a:left></a:tcBdr></a:tcStyle></a:wholeTbl></a:tblStyle></a:tblStyleLst>`);
    const tc = (t, fill = '') => `<a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:rPr sz="1300"/><a:t>${t}</a:t></a:r></a:p></a:txBody><a:tcPr marL="91440" marR="91440" marT="91440" marB="91440">${fill}</a:tcPr></a:tc>`;
    zip.file('ppt/slides/slide1.xml', `<p:sld ${NS}><p:cSld><p:spTree>`
      + sp('<p:ph type="title"/>', '', `<p:txBody><a:bodyPr><a:normAutofit fontScale="90000"/></a:bodyPr><a:p><a:r><a:rPr lang="ca"/><a:t>Títol</a:t></a:r></a:p></p:txBody>`, '<a:solidFill><a:srgbClr val="000000"><a:alpha val="0"/></a:srgbClr></a:solidFill>')
      + sp('<p:ph type="body" idx="1"/>', '', `<p:txBody><a:bodyPr/><a:p><a:r><a:rPr b="1"/><a:t>Negreta</a:t></a:r><a:r><a:rPr/><a:t> i </a:t></a:r><a:r><a:rPr i="1"><a:hlinkClick r:id="rId3"/></a:rPr><a:t>enllaç</a:t></a:r></a:p>`
        + `<a:p><a:pPr><a:buNone/></a:pPr><a:r><a:rPr/><a:t>A      [ OK ]</a:t></a:r></a:p></p:txBody>`)
      + sp('<p:ph type="sldNum" idx="12"/>', xf(8400000, 4700000, 500000, 300000), `<p:txBody><a:bodyPr/><a:p><a:fld id="{1}" type="slidenum"><a:t>‹#›</a:t></a:fld></a:p></p:txBody>`)
      + `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="7" name="t"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="311700" y="3000000"/><a:ext cx="100" cy="100"/></p:xfrm>`
        + `<a:graphic><a:graphicData><a:tbl><a:tblPr><a:tableStyleId>{T}</a:tableStyleId></a:tblPr><a:tblGrid><a:gridCol w="2000000"/><a:gridCol w="4000000"/></a:tblGrid>`
        + `<a:tr h="381000">${tc('Cap', '<a:solidFill><a:srgbClr val="8E7CC3"/></a:solidFill>')}${tc('B')}</a:tr><a:tr h="381000">${tc('1')}${tc('2')}</a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>`
      + `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="20" name="c"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${xf(1000000, 1000000, 1000000, 1000000)}<a:prstGeom prst="straightConnector1"/><a:ln w="28575"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:tailEnd type="triangle"/></a:ln></p:spPr></p:cxnSp>`
      + `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="21" name="d"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm flipH="1" rot="10800000"><a:off x="1000000" y="3000000"/><a:ext cx="1000000" cy="0"/></a:xfrm><a:prstGeom prst="straightConnector1"/><a:ln w="12700"><a:solidFill><a:srgbClr val="0000FF"/></a:solidFill><a:headEnd type="stealth"/></a:ln></p:spPr></p:cxnSp>`
      + `</p:spTree></p:cSld></p:sld>`);
    zip.file('ppt/slides/_rels/slide1.xml.rels', rels(rel('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'), rel('rId3', 'hyperlink', 'https://example.org/', ' TargetMode="External"')));
    const deck = await R.pptxImport.importPPTX(new W.File([await zip.generateAsync({ type: 'blob' })], 'plantilla.pptx'));
    const pt = v => Math.round(v * 12700 * 1280 / 9144000);
    const s1 = deck.slides[0], texts = s1.blocks.filter(b => b.type === 'text');
    const title = texts.find(b => /Títol/.test(b.html));
    eq(R.master.styled(title, s1, deck).fontSize, pt(28 * 0.9), 'título: 28 pt del patrón (no 14 pt del estilo genérico) y reducido al 90 %');
    const eff = b => R.master.styled(b, s1, deck);
    eq(eff(title).color, '#652d90', 'título con el color del patrón');
    assert(!s1.blocks.some(b => b.type === 'shape' && /^#000000/.test(b.fill || '')), 'relleno totalmente transparente: sin forma negra');
    const body = texts.find(b => /Negreta/.test(b.html));
    eq(R.master.styled(body, s1, deck).fontSize, pt(18), 'cuerpo: 18 pt del patrón');
    eq(eff(body).color, '#475569', 'cuerpo con su color');
    assert(/<li[^>]*line-height:1\.38/.test(body.html), 'interlineado 115 % del patrón');
    assert(/list-style-type:'●/.test(body.html) && /margin-left:64px/.test(body.html), 'viñeta ● y sangría del patrón');
    assert(/<b>[^<]*Negreta/.test(body.html) || /<b><span[^>]*>Negreta/.test(body.html), 'negrita');
    assert(/<a href="https:\/\/example\.org\/"[^>]*><i>[^<]*enllaç/.test(body.html) || /<a href="https:\/\/example\.org\/"[^>]*>.*enllaç/.test(body.html), 'enlace con cursiva');
    assert(/A      \[ OK \]/.test(body.html), 'se conservan los espacios que alinean: ' + JSON.stringify(body.html.match(/A[^\[]*\[/)?.[0]));
    assert(Array.isArray(body.pad) && body.pad[3] === pt(0) + Math.round(91440 * 1280 / 9144000) - pt(0), 'margen interno del cuadro');
    assert(texts.some(b => />1</.test(b.html)), 'número de diapositiva en vez de ‹#›');
    // The template becomes Revela's master and layouts.
    eq(deck.master.styles.title.size, pt(28), 'estilo de título del patrón: 28 pt');
    eq(deck.master.styles.title.color, '#652d90', 'y su color');
    eq(deck.master.styles.body.levels[0].size, pt(18), 'texto nivel 1: 18 pt'); eq(deck.master.styles.body.levels[0].bullet, '●', 'con su viñeta');
    const lay = deck.layouts.find(l => l.id === s1.layoutId); assert(lay, 'la diapositiva usa su diseño importado');
    eq(lay.blocks.filter(b => b.type === 'image').length, 1, 'el logotipo va a su diseño');
    assert(R.master.masterBlocksFor(s1, deck).some(b => b.type === 'image'), 'y se ve debajo de la diapositiva');
    const lt = lay.blocks.find(b => b.ph === 'title'); eq(title.lp, lt.id, 'el título enlazado al marcador del diseño');
    assert(body.fontSize == null && body.color == null, 'lo que solo repite el patrón no se guarda en la diapositiva (hereda)');
    eq(title.fit, 0.9, 'la reducción automática se guarda como factor, así el título sigue al patrón');
    assert(title.fontSize == null, 'sin tamaño fijo');
    const [c1, c2] = s1.blocks.filter(b => b.type === 'shape');
    assert(c1 && c1.shape === 'arrow' && c1.rotation === 45, 'flecha diagonal: ' + JSON.stringify(c1 && [c1.shape, c1.rotation]));
    eq(c1.strokeWidth, Math.round(28575 * 1280 / 9144000), 'grosor de línea en px (2,25 pt no es 1 px)');
    eq(c1.stroke, '#ff0000', 'color de la línea');
    const mid = [c1.x + c1.w / 2, c1.y + c1.h / 2], want = Math.round(1500000 * 1280 / 9144000);
    assert(Math.abs(mid[0] - want) <= 1 && Math.abs(mid[1] - want) <= 1, 'centrada en su segmento');
    // Flipped and turned 180°: the start (where the tip is) ends up on the left,
    // so it points left — like the red arrow of a real Google Slides deck.
    assert(c2.shape === 'arrow' && Math.abs(c2.rotation) === 180, 'volteo + giro + punta al inicio: ' + c2.rotation);
    const tb = s1.blocks.find(b => b.type === 'table');
    eq(tb.fontSize, pt(13), 'tabla: tamaño de letra de las celdas');
    eq(tb.w, Math.round(6000000 * 1280 / 9144000), 'tabla: ancho de sus columnas, no del marco');
    eq(JSON.stringify(tb.colW), JSON.stringify([2000000, 4000000].map(w => Math.round(w * 1280 / 9144000))), 'anchos de columna');
    eq(tb.cellBg['0,0'], '#8e7cc3', 'color de celda'); eq(tb.stroke, '#9e9e9e', 'bordes del estilo de tabla');
    eq(tb.rowH.length, 2, 'alturas de fila'); eq(tb.cellPad[0], 13, 'margen de celda');
    // In the editor and in the show the table looks the same.
    R.store.replaceDeck(deck); R.render(); await sleep(50);
    const td = D.querySelector(`.block[data-id="${tb.id}"] td`);
    eq(W.getComputedStyle(td).paddingTop, '13px', 'el editor respeta el margen de celda');
    eq(td.style.background ? 'sí' : 'no', 'sí', 'el editor pinta el color de celda');
  });

  // ---- Sharing: sealed (encrypted) presentations -----------------------------
  const W_share = () => frame.contentWindow;
  const loadPage = async (url, until, ms = 20000) => {
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:540px;visibility:hidden'; D.body.appendChild(f);
    f.src = url; const t0 = Date.now(); let ok = false;
    while (Date.now() - t0 < ms) { await sleep(100); try { if (until(f)) { ok = true; break; } } catch {} }
    return { f, ok };
  };

  await test('compartir: el sellado cifra de verdad (clave o contraseña) y solo se abre con ella', async () => {
    const S = await import(new URL('../src/io/share/seal.js', D.baseURI));
    const html = '<!doctype html><title>x</title><p>Secret text ÀÉ</p>';
    const k = await S.seal(html);
    eq(k.env.mode, 'key'); assert(k.key && k.key.length >= 43, 'clave aleatoria de 256 bits');
    assert(!JSON.stringify(k.env).includes('Secret'), 'la copia sellada no contiene el texto');
    eq(await S.unseal(k.env, k.key), html, 'se abre con la clave');
    let bad = false; await S.unseal(k.env, (await S.seal(html)).key).catch(() => { bad = true; }); assert(bad, 'otra clave no la abre');
    const p = await S.seal(html, { password: 'una frase larga' });
    eq(p.env.mode, 'password'); eq(p.env.rounds, 600000, 'PBKDF2 600 000 rondas'); eq(p.key, null, 'sin clave en el enlace');
    eq(await S.unseal(p.env, 'una frase larga'), html, 'se abre con la contraseña');
    bad = false; await S.unseal(p.env, 'otra').catch(() => { bad = true; }); assert(bad, 'contraseña incorrecta');
    assert(S.shareId().length === 22 && S.shareId() !== S.shareId(), 'identificadores aleatorios de 128 bits');
  });

  await test('exportar PDF: el archivo, hecho aquí (una página por diapositiva visible, del tamaño de la diapositiva)', async () => {
    reset(); const W = frame.contentWindow;
    R.store.commit(() => { slide().background = '#c1121f'; }); R.slides.addSlide(); R.slides.addSlide();
    R.store.commit(() => { R.state.deck.slides[2].hidden = true; R.state.deck.slides[1].background = '#003049'; });
    const P = await W.eval("import('/src/io/export/pdf.js')"), F = await W.eval("import('/src/features/content/files.js')");
    const blob = await P.buildPDF(); eq(blob.type, 'application/pdf', 'un PDF');
    const url = await new Promise(ok => { const r = new W.FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
    const pdf = await F.openPdf(url); eq(pdf.numPages, 2, 'dos páginas (la oculta, no)');
    const page = await pdf.getPage(1), vp = page.getViewport({ scale: 1 });
    eq(`${Math.round(vp.width)}×${Math.round(vp.height)}`, '960×540', 'del tamaño de la diapositiva (1280×720 px = 960×540 pt)');
    const img = await F.pageImage(pdf, 2, 200), im = new W.Image(); im.src = img.src; await im.decode();
    const c = D.createElement('canvas'); c.width = 200; c.height = 112; c.getContext('2d').drawImage(im, 0, 0, 200, 112);
    const [r, g, b] = c.getContext('2d').getImageData(100, 100, 1, 1).data;
    assert(r < 30 && g < 70 && g > 25 && b > 50 && b < 100, `la segunda página es la segunda diapositiva (su fondo): ${r},${g},${b}`);
    eq((await page.getTextContent()).items.length, 0, 'solo imágenes: sin texto');
    // With the text selectable: the same pictures, and the text where it is (searchable, with its accents).
    R.store.commit(() => { R.state.deck.slides[0].blocks = [{ id: 'tx1', type: 'text', x: 100, y: 200, w: 900, h: 120, fontSize: 60, rotation: 0, animation: null, html: 'Energía solar — 2026' }]; });
    const url2 = await new Promise(async ok => { const r2 = new W.FileReader(); r2.onload = () => ok(r2.result); r2.readAsDataURL(await P.buildPDF(undefined, { text: true })); });
    const pdf2 = await F.openPdf(url2), items = (await (await pdf2.getPage(1)).getTextContent()).items.filter(i => i.str.trim());
    const all = items.map(i => i.str).join(' ');
    assert(/Energía solar — 2026/.test(all), 'con el texto seleccionable y buscable: ' + all);
    const x = items[0].transform[4], y = items[0].transform[5];
    assert(Math.abs(x - 100 * 0.75) < 20 && y > 300 && y < 400, `en su sitio de la página: ${x.toFixed(0)}, ${y.toFixed(0)} pt`);
    eq(pdf2.numPages, 2, 'las mismas páginas');
  });

  await test('generar desde una hoja: una copia de la diapositiva por fila, con sus {{marcadores}} (escapados), al final, nueva o en PDF', async () => {
    reset(); const W = frame.contentWindow, B = await W.eval("import('/src/features/document/bulk.js')"), F = await W.eval("import('/src/features/content/files.js')");
    R.store.commit(() => {
      const s = slide(); s.notes = 'Para {{Nombre}}';
      s.blocks = [{ id: 'd1', type: 'text', x: 100, y: 100, w: 1000, h: 120, fontSize: 48, rotation: 0, animation: null, html: 'Diploma para <b>{{ nombre }}</b>' },
        { id: 'd2', type: 'text', x: 100, y: 300, w: 1000, h: 80, fontSize: 32, rotation: 0, animation: null, html: 'Nota: {{Nota}} · {{curso}}' },
        { id: 'd3', type: 'table', x: 100, y: 450, w: 600, h: 100, rotation: 0, animation: null, rows: [['Alumno', '{{nombre}}']] }];
    });
    const phs = B.placeholdersIn([slide()]);
    eq(phs.map(p => p.key).join(), 'nombre,nota,curso', 'los marcadores (sin mayúsculas, tildes ni espacios)');
    eq(JSON.stringify(B.autoMap(phs, ['NOMBRE', 'Nota final', 'Nota'])), '{"nombre":0,"nota":2,"curso":-1}', 'cada uno con la columna de su nombre');
    const made = B.fillSlides([slide()], ['Ana <script>alert(1)</script> & Co', '9'], { nombre: 0, nota: 1, curso: -1 });
    const h = made[0].blocks.map(b => b.html || b.rows?.[0][1]).join(' | ');
    assert(/Diploma para <b>Ana &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; Co<\/b>/.test(h), 'el valor, escapado: ' + h);
    assert(/Nota: 9 · \{\{curso\}\}/.test(h) && /^Ana &lt;script/.test(made[0].blocks[2].rows[0][1]), 'sin columna, se queda; también en tablas');
    eq(made[0].notes, 'Para Ana <script>alert(1)</script> & Co', 'en las notas, como texto');
    assert(made[0].id !== slide().id && made[0].blocks[0].id !== 'd1', 'copias con sus propios ids');
    eq(B.rowLimit(1), 500, 'como mucho 500 filas'); eq(B.rowLimit(4), 250, 'y 1000 diapositivas');
    // The dialog: a CSV, the columns matched, added at the end.
    D.querySelector('[data-action="bulk-generate"]').click(); for (let i = 0; i < 40 && !D.getElementById('bulk-modal'); i++) await sleep(25);
    const m = D.getElementById('bulk-modal'); assert(/\{\{nombre\}\}/.test(m.textContent), 'enseña los marcadores');
    const dt = new W.DataTransfer(); dt.items.add(new W.File(['Nombre;Nota;Curso\nAna;9;6.º A\nLuis;"7,5";6.º B\n;;\nEva;10;6.º A\n'], 'notas.csv', { type: 'text/csv' }));
    const inp = m.querySelector('.bk-file'); inp.files = dt.files; inp.dispatchEvent(new W.Event('change'));
    for (let i = 0; i < 40 && m.querySelector('.bk-map').hidden; i++) await sleep(25);
    eq([...m.querySelectorAll('select[data-ph]')].map(s => s.value).join(), '0,1,2', 'emparejados por su nombre');
    assert(/3 filas → 3 diapositivas/.test(m.querySelector('.bk-count').textContent), 'cuántas (sin filas vacías): ' + m.querySelector('.bk-count').textContent);
    const n0 = R.state.deck.slides.length; m.querySelector('.bk-go').click(); await sleep(30);
    eq(R.state.deck.slides.length, n0 + 3, 'tres diapositivas al final');
    assert(/Luis/.test(R.state.deck.slides[n0 + 1].blocks[0].html) && /7,5 · 6\.º B/.test(R.state.deck.slides[n0 + 1].blocks[1].html), 'cada una con su fila');
    R.store.undo(); eq(R.state.deck.slides.length, n0, 'un paso de deshacer');
    // Straight to a PDF: one page per row, and the presentation doesn't change.
    const rows = [['Ana', '9', 'A'], ['Luis', '8', 'B']], P = await W.eval("import('/src/io/export/pdf.js')");
    const blob = await P.buildPDF(B.deckWith(B.bulkSlides([slide()], rows, { nombre: 0, nota: 1, curso: 2 })));
    const url = await new Promise(ok => { const r = new W.FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
    eq((await F.openPdf(url)).numPages, 2, 'un PDF con una página por fila'); eq(R.state.deck.slides.length, n0, 'sin tocar la presentación');
    const nd = B.deckWith(B.bulkSlides([slide()], rows, { nombre: 0 }), R.state.deck, 'Diplomas');
    assert(nd.name === 'Diplomas' && nd.slides.length === 2 && JSON.stringify(nd.master) === JSON.stringify(R.state.deck.master), 'una presentación nueva con el mismo diseño');
  });

  await test('compartir: archivo HTML con contraseña o enlace secreto, que se abre en un iframe', async () => {
    reset(); slide().blocks[0].html = '<b>Hola compartida</b>';
    const saved = []; const W = W_share(), urls = W.URL.createObjectURL;
    const click = W.HTMLAnchorElement.prototype.click;
    W.HTMLAnchorElement.prototype.click = function () { saved.push({ name: this.download, href: this.href }); };
    W.URL.revokeObjectURL = () => {};
    let r1, r2;
    try {
      r1 = await R.io.publishShare({ where: 'file', password: 'frase de prueba larga' });
      r2 = await R.io.publishShare({ where: 'file' });
    } finally { W.HTMLAnchorElement.prototype.click = click; }
    void urls;
    assert(/-protegida\.html$/.test(r1.file) && !r1.key, 'archivo con contraseña, sin clave en el enlace');
    const page = await (await W.fetch(saved[0].href)).text();
    assert(/name="robots" content="noindex/.test(page), 'noindex');
    assert(!/Hola compartida/.test(page), 'el archivo no contiene el texto sin cifrar');
    // Password: wrong, then right → the presentation.
    const a = await loadPage(saved[0].href, f => f.contentDocument.getElementById('pw'));
    try {
      assert(a.ok, 'pide la contraseña');
      const d = a.f.contentDocument; d.getElementById('pw').value = 'mal'; d.getElementById('f').requestSubmit();
      let err = ''; for (let i = 0; i < 80 && !err; i++) { await sleep(100); err = d.getElementById('e')?.textContent; }
      eq(err, 'Contraseña incorrecta.', 'contraseña incorrecta');
      d.getElementById('pw').value = 'frase de prueba larga'; d.getElementById('f').requestSubmit();
      // (It opens in a sandboxed frame without this site's origin: its content can't reach Revela's data.)
      const inner = () => a.f.contentDocument.querySelector('iframe[sandbox]');
      let ok = false; for (let i = 0; i < 150 && !ok; i++) { await sleep(100); ok = /Hola compartida/.test(inner()?.srcdoc || ''); }
      assert(ok, 'con la contraseña se ve la presentación');
      assert(!/allow-same-origin/.test(inner().getAttribute('sandbox')), 'aislada del sitio de Revela');
    } finally { a.f.remove(); }
    // Without a password: the presentation itself, that opens from wherever it is uploaded (no key to add).
    assert(!r2.key && !r2.suffix && !/protegida/.test(r2.file), 'sin contraseña: un archivo normal, sin clave');
    const plain = await (await W.fetch(saved[1].href)).text();
    assert(/Hola compartida/.test(plain) && /aside\.notes\{display:none\}/.test(plain), 'que se abre tal cual (y sin enseñar las notas)');
    assert(!/<script src="[^"]*\/dist\/reveal\.js"><\/script>/.test(plain) && /Reveal\.initialize/.test(plain) && /<style>[^<]*\.reveal/.test(plain), 'con reveal.js dentro: se abre sin conexión');
  });

  await test('compartir: servidor propio y visor (view.html) con enlace secreto', async () => {
    reset(); slide().blocks[0].html = '<b>Por servidor</b>';
    const W = W_share(), real = W.fetch, calls = [], store = {};
    W.fetch = async (url, o = {}) => {
      url = String(url);
      if (url.startsWith('https://srv.test/s')) {
        calls.push({ url, method: o.method || 'GET', headers: o.headers || {}, body: o.body });
        if (o.method === 'POST') { store.body = o.body; return new W.Response(JSON.stringify({ id: 'AbCdEfGhIjKlMnOpQrStUv', token: 'tok' })); }
        if (o.method === 'DELETE') return new W.Response('{"ok":true}');
      }
      return real(url, o);
    };
    let r;
    try {
      R.shareServer.setServerConfig({ url: 'https://srv.test/', uploadKey: 'secreta' });
      r = await R.io.publishShare({ where: 'server', days: 7 });
    } finally { W.fetch = real; }
    const post = calls.find(c => c.method === 'POST');
    assert(post && post.url === 'https://srv.test/s?days=7' && post.headers['X-Upload-Key'] === 'secreta', 'sube con la clave de subida y caducidad');
    assert(!/Por servidor/.test(store.body) && JSON.parse(store.body).revelaSealed === 1, 'al servidor solo llega la copia cifrada');
    const u = new URL(r.link);
    assert(/view\.html$/.test(u.pathname) && u.searchParams.get('u') === 'https://srv.test/s/AbCdEfGhIjKlMnOpQrStUv' && /^#k=[\w-]{43}$/.test(u.hash), 'enlace: visor + copia + clave tras #');
    assert(/<iframe src="[^"]*view\.html\?u=/.test(r.iframe) && /allowfullscreen/.test(r.iframe), 'código iframe');
    const listed = R.shares.sharesList()[0]; eq(listed.id, 'AbCdEfGhIjKlMnOpQrStUv', 'se recuerda para dejar de compartirla');
    // The viewer opens a sealed copy (a same-site blob here instead of the server).
    const blob = W.URL.createObjectURL(new W.Blob([store.body], { type: 'application/json' }));
    const v = await loadPage(`${new URL('view.html', D.baseURI)}?u=${encodeURIComponent(blob)}${u.hash}`, f => /Por servidor/.test(f.contentDocument.querySelector('iframe[sandbox]')?.srcdoc || ''));
    v.f.remove(); assert(v.ok, 'el visor abre la presentación con la clave del enlace');
    // Stop sharing.
    W.fetch = async (url, o = {}) => { calls.push({ url: String(url), method: o.method, headers: o.headers || {} }); return new W.Response('{"ok":true}'); };
    try { await R.shareServer.serverUnshare(listed.url, listed.token); } finally { W.fetch = real; }
    const del = calls.at(-1); assert(del.method === 'DELETE' && del.headers.Authorization === 'Bearer tok', 'dejar de compartir con su token');
    R.shares.removeShare(listed.id); R.shareServer.setServerConfig({});
    // The dialog.
    R.ribbon && D.querySelector('[data-action="share"]').click(); await sleep(20);
    const m = D.getElementById('share-modal'); assert(m, 'botón Compartir abre el diálogo');
    m.querySelector('input[value="password"]').click(); assert(!m.querySelector('.sh-pw').hidden, 'pide contraseña al elegirla');
    m.querySelector('input[value="server"]').click(); assert(!m.querySelector('.sh-srv').hidden, 'datos del servidor al elegirlo');
    m.querySelector('.modal-close').click();
  });

  await test('PowerPoint: transiciones, Transformar y animaciones se exportan y se vuelven a leer', async () => {
    const d = R.examples.buildExample('lesson'), p = R.examples.buildExample('pitch');
    d.slides.push(...p.slides.slice(0, 2));
    d.slides[1].transition = 'zoom'; d.slides[1].autoSlide = 4000;
    const cards = d.slides[4].blocks.filter(b => b.animation);
    cards[1].animation = { ...cards[1].animation, effect: 'fade-left', start: 'withPrev' };
    cards[2].animation = { ...cards[2].animation, effect: 'fade-out', start: 'afterPrev', delay: 200 };
    d.slides[7].morphBy = 'words';
    const blob = await R.pptx.buildPptxBlob(d);
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const zip = await frame.contentWindow.JSZip.loadAsync(blob);
    const x5 = await zip.file('ppt/slides/slide5.xml').async('string'), x8 = await zip.file('ppt/slides/slide8.xml').async('string');
    assert(/<p:cNvPr id="\d+" name="rv-/.test(x5), 'cada objeto con su nombre rv-…');
    assert(/<p:timing>.*nodeType="mainSeq"/.test(x5) && (x5.match(/presetClass="/g) || []).length === 3, 'tres animaciones en la línea de tiempo');
    assert(/p159:morph option="byWord"/.test(x8), 'Transformar por palabras como Morph nativo');
    assert(/<p:transition spd="[a-z]+" advTm="4000"><p:zoom\/>/.test(await zip.file('ppt/slides/slide2.xml').async('string')), 'zoom con avance automático');
    const back = await R.pptxImport.importPPTX(new File([blob], 'x.pptx'));
    eq(back.slides[1].transition, 'zoom'); eq(back.slides[1].autoSlide, 4000, 'avance automático');
    assert(back.slides[7].autoAnimate && back.slides[7].morphBy === 'words', 'Transformar por palabras, de vuelta');
    const an = back.slides[4].blocks.filter(b => b.animation).map(b => `${b.animation.effect}/${b.animation.start}`);
    eq(an.join(' '), 'fade-up/click fade-left/withPrev fade-out/afterPrev', 'animaciones de vuelta con su efecto y su inicio');
  });

  await test('varias animaciones de un objeto: PowerPoint y LibreOffice las conservan', async () => {
    const d = R.examples.buildExample('report'); d.slides[1].blocks.forEach(x => { delete x.animation; });
    const b = d.slides[1].blocks.find(x => x.type === 'text' && !x.ph) || d.slides[1].blocks.at(-1);
    b.animation = { effect: 'fade-in', order: 1, seq: 1, start: 'click', duration: 500 };
    b.anims = [{ effect: 'path', order: 1, seq: 2, start: 'afterPrev', duration: 1000, dx: 200, dy: 0 },
      { effect: 'path', pathShape: 'custom', points: [[0, 0], [60, -80], [0, -160]], order: 1, seq: 3, start: 'afterPrev', duration: 1000, dx: 0, dy: -160 },
      { effect: 'spin360', order: 2, seq: 4, start: 'click', duration: 800 }];
    const sum = x => [x.animation, ...(x.anims || [])].map(a => `${a.effect}/${a.start || 'click'}`).join(' ');
    const blob = await R.pptx.buildPptxBlob(d);
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const x2 = await (await frame.contentWindow.JSZip.loadAsync(blob)).file('ppt/slides/slide2.xml').async('string');
    eq((x2.match(/presetClass="/g) || []).length, 4, 'cuatro animaciones en la línea de tiempo de PowerPoint');
    const back = await R.pptxImport.importPPTX(new File([blob], 'x.pptx'));
    const bp = back.slides[1].blocks.find(x => x.anims?.length);
    eq(bp && sum(bp), 'fade-in/click path/afterPrev path/afterPrev spin360/click', 'PowerPoint: las cuatro, en orden');
    assert(bp.anims[1].pathShape === 'custom' && Math.abs(bp.anims[1].dy + 160) <= 2, 'el recorrido dibujado vuelve como dibujado');
    const bo = (await R.odp.importODP(new File([await R.odp.buildODP(d)], 'x.odp'))).slides[1].blocks.find(x => x.anims?.length);
    eq(bo && sum(bo), 'fade-in/click path/afterPrev path/afterPrev spin360/click', 'LibreOffice: también');
  });

  await test('OpenDocument: transiciones y avance automático se exportan y se vuelven a leer', async () => {
    const d = R.examples.buildExample('report'); d.slides[1].transition = 'zoom'; d.slides[2].transition = 'fade'; d.slides[2].autoSlide = 3000;
    const blob = await R.odp.buildODP(d);
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const xml = await (await frame.contentWindow.JSZip.loadAsync(blob)).file('content.xml').async('string');
    assert(/smil:type="zoom"/.test(xml) && /presentation:duration="PT3.0S"/.test(xml), 'en el XML de ODP');
    const back = await R.odp.importODP(new File([blob], 'x.odp'));
    eq(back.slides[1].transition, 'zoom'); eq(back.slides[2].transition, 'fade'); eq(back.slides[2].autoSlide, 3000, 'avance automático');
  });

  await test('PowerPoint: el patrón y los diseños se exportan como diseños reales con marcadores', async () => {
    const d = R.examples.buildExample('lesson');
    const blob = await R.pptx.buildPptxBlob(d);
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const zip = await frame.contentWindow.JSZip.loadAsync(blob);
    const layouts = await Promise.all(Object.keys(zip.files).filter(f => /slideLayouts\/slideLayout\d+\.xml$/.test(f)).map(f => zip.file(f).async('string')));
    const names = layouts.map(x => (x.match(/<p:cSld name="([^"]*)"/) || [])[1]);
    assert(names.includes('Portada') && names.includes('Título y contenido'), 'un diseño de PowerPoint por diseño: ' + names);
    const tc = layouts[names.indexOf('Título y contenido')];
    assert(/<p:ph\s[^>]*type="title"/.test(tc) && /<p:ph\s[^>]*type="body"/.test(tc), 'con sus marcadores de título y cuerpo');
    const s2 = await zip.file('ppt/slides/slide2.xml').async('string');
    assert(/<p:ph\s[^>]*type="title"/.test(s2) && /Qué vamos a aprender/.test(s2), 'el título de la diapositiva va en el marcador');
    const back = await R.pptxImport.importPPTX(new File([blob], 'x.pptx'));
    eq(back.layouts.find(l => l.id === back.slides[1].layoutId)?.name, 'Título y contenido', 'al volver a importarlo, la diapositiva usa su diseño');
    assert(back.slides[1].blocks.find(b => b.ph === 'title')?.lp, 'y su título sigue al marcador');
  });

  await test('PowerPoint como plantilla: todos los diseños, y los adornos del patrón (también elipses) en el patrón, no en cada diapositiva', async () => {
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const G = await frame.contentWindow.eval("import('/src/features/design/gallery.js')");
    // A gallery design (a circle in a corner, in its master), its slides without a layout, one with text.
    const d = G.buildFromGallery('education'); d.slides[1].blocks[0].html = 'Qué aprenderemos';
    const blob = await R.pptx.buildPptxBlob(d), zip = await frame.contentWindow.JSZip.loadAsync(blob);
    const s2 = await zip.file('ppt/slides/slide2.xml').async('string');
    assert(!/prst="ellipse"/.test(s2) && /Qué aprenderemos/.test(s2), 'la diapositiva, sin el círculo del patrón copiado (y con su texto)');
    const lays = await Promise.all(Object.keys(zip.files).filter(f => /slideLayouts\/slideLayout\d+\.xml$/.test(f)).map(f => zip.file(f).async('string')));
    assert(lays.some(x => /name="Revela"/.test(x) && /prst="ellipse"/.test(x)), 'el círculo, en el diseño de PowerPoint');
    const back = await R.pptxImport.importPPTX(new File([blob], 'x.pptx'));
    assert(!back.slides[1].blocks.some(b => b.shape === 'ellipse') && back.layouts.some(l => l.blocks.some(b => b.shape === 'ellipse')), 'al volver: en el diseño, no en la diapositiva');
    // With its layouts: all of them, also those no slide uses (a template).
    const d2 = R.examples.buildExample('lesson'), used = new Set(d2.slides.map(x => x.layoutId));
    const names = (await Promise.all(Object.keys((await frame.contentWindow.JSZip.loadAsync(await R.pptx.buildPptxBlob(d2))).files).filter(f => /slideLayouts\/slideLayout\d+\.xml$/.test(f))
      .map(async f => ((await (await frame.contentWindow.JSZip.loadAsync(await R.pptx.buildPptxBlob(d2))).file(f).async('string')).match(/<p:cSld name="([^"]*)"/) || [])[1])));
    assert(d2.layouts.filter(l => !used.has(l.id)).every(l => names.includes(l.name)), 'todos los diseños, también los que no usa ninguna diapositiva: ' + names);
  });

  await test('importar PowerPoint: sus vídeos (dentro o enlazados), con su portada; no solo la portada', async () => {
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const W = frame.contentWindow, zip = new W.JSZip();
    const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"';
    const rel = (id, type, target, ext) => `<Relationship Id="${id}" Type="${type.includes('/') ? type : 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + type}" Target="${target}"${ext ? ' TargetMode="External"' : ''}/>`;
    const rels = (...r) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r.join('')}</Relationships>`;
    const vid = (n, embed, link, poster) => `<p:pic><p:nvPicPr><p:cNvPr id="${n}" name="Vídeo ${n}" descr="Simulación"/><p:cNvPicPr/><p:nvPr><a:videoFile r:link="${link}"/>${embed ? `<p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DA282A3FB2C}"><p14:media r:embed="${embed}"/></p:ext></p:extLst>` : ''}</p:nvPr></p:nvPicPr>`
      + `<p:blipFill><a:blip r:embed="${poster}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="1000000" y="1000000"/><a:ext cx="4000000" cy="2250000"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr></p:pic>`;
    zip.file('ppt/presentation.xml', `<p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`);
    zip.file('ppt/_rels/presentation.xml.rels', rels(rel('rId2', 'slide', 'slides/slide1.xml')));
    zip.file('ppt/slides/slide1.xml', `<p:sld ${NS}><p:cSld><p:spTree>${vid(2, 'rId1', 'rId2', 'rId3')}${vid(3, null, 'rId4', 'rId3')}${vid(4, 'rId5', 'rId5', 'rId3')}</p:spTree></p:cSld></p:sld>`);
    zip.file('ppt/slides/_rels/slide1.xml.rels', rels(rel('rId1', 'http://schemas.microsoft.com/office/2007/relationships/media', '../media/media1.mp4'), rel('rId2', 'video', '../media/media1.mp4'),
      rel('rId3', 'image', '../media/image1.png'), rel('rId4', 'video', 'https://ejemplo.org/clase.mp4', true), rel('rId5', 'video', '../media/viejo.wmv')));
    zip.file('ppt/media/media1.mp4', new W.Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]));
    zip.file('ppt/media/viejo.wmv', new W.Uint8Array([1, 2, 3]));
    zip.file('ppt/media/image1.png', W.atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), { binary: true });
    const d = await R.pptxImport.importPPTX(new W.File([await zip.generateAsync({ type: 'blob' })], 'v.pptx'));
    const bl = d.slides[0].blocks;
    eq(bl.map(b => b.type).join(), 'video,video,image', 'dos vídeos; el .wmv (que el navegador no reproduce), su portada');
    assert(/^data:video\/mp4;base64,/.test(bl[0].src) && /^data:image\/png/.test(bl[0].poster) && bl[0].alt === 'Simulación', 'el de dentro, con su portada y su descripción');
    eq(bl[1].src, 'https://ejemplo.org/clase.mp4', 'el enlazado, por su dirección');
    assert(/poster="/.test(R.io.buildHTML(d)), 'al presentar, con su portada');
  });

  await test('importar PowerPoint: cada línea, de la altura de su letra; y «reducir al desbordar», medido', async () => {
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const W = frame.contentWindow, zip = new W.JSZip();
    const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
    const rels = (...r) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r.join('')}</Relationships>`;
    const sp = (n, cy, autofit, paras) => `<p:sp><p:nvSpPr><p:cNvPr id="${n}" name="T${n}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="600000" y="${n * 1500000}"/><a:ext cx="9000000" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr>`
      + `<p:txBody><a:bodyPr>${autofit ? '<a:normAutofit/>' : ''}</a:bodyPr><a:lstStyle/>${paras}</p:txBody></p:sp>`;
    // A big title and, after a line break, a smaller line, in one paragraph; and a box too small for its text.
    const title = `<a:p><a:pPr><a:lnSpc><a:spcPct val="90000"/></a:lnSpc></a:pPr><a:r><a:rPr sz="5400"/><a:t>Título grande</a:t></a:r><a:br/><a:r><a:rPr sz="2800"/><a:t>Una línea más pequeña</a:t></a:r></a:p>`;
    const long = `<a:p><a:r><a:rPr sz="4000"/><a:t>${'Un texto que en PowerPoint se reduce para caber en su cuadro. '.repeat(3)}</a:t></a:r></a:p>`;
    zip.file('ppt/presentation.xml', `<p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`);
    zip.file('ppt/_rels/presentation.xml.rels', rels('<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>'));
    zip.file('ppt/slides/slide1.xml', `<p:sld ${NS}><p:cSld><p:spTree>${sp(1, 1300000, false, title)}${sp(2, 900000, true, long)}${sp(3, 900000, false, long)}</p:spTree></p:cSld></p:sld>`);
    const OF = await W.eval("import('/src/ui/shell/openfile.js')");
    await OF.openPresentation(new W.File([await zip.generateAsync({ type: 'blob' })], 'lineas.pptx')); await sleep(30);
    const [t, a, n] = R.state.deck.slides[0].blocks.filter(b => b.type === 'text');
    assert(/^<div style="[^"]*font-size:37px/.test(t.html) && /<span style="font-size:72px">Título grande/.test(t.html), 'el párrafo, con la letra menor; la grande, en su texto: ' + t.html);
    // (Where each line's text is: the small line starts right under the big one, not a big line's height lower.)
    const el = D.querySelector(`#stage .block[data-id="${t.id}"] .rich`), k = 1280 / D.getElementById('stage').getBoundingClientRect().width;
    const rectOf = txt => { const w = D.createTreeWalker(el, 4); for (let x; (x = w.nextNode());) if (x.textContent.includes(txt)) { const r = D.createRange(); r.selectNodeContents(x); return r.getBoundingClientRect(); } };
    const gap = (rectOf('Una línea').top - rectOf('Título grande').bottom) * k;
    assert(gap < 12, 'la línea pequeña, pegada a la grande (' + Math.round(gap) + ' px entre ellas)');
    assert(a.fontSize < n.fontSize && !('autofit' in a), `el cuadro que reduce al desbordar, reducido hasta caber (${a.fontSize} px; el otro, ${n.fontSize})`);
    assert(n.fontSize === 53 && !('autofit' in n), 'el que no, como estaba (40 pt)');
  });

  await test('importar PowerPoint: flechas con su punta (a su tamaño), textos que no se parten y brillo', async () => {
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const W = frame.contentWindow, zip = new W.JSZip();
    const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
    const rels = (...r) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r.join('')}</Relationships>`;
    const xf = (x, y, w, h) => `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>`;
    const arrow = (n, x, w) => `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${n}" name="Flecha ${n}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${xf(x, 2000000, w, 0)}<a:prstGeom prst="straightConnector1"/><a:ln w="57150"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:tailEnd type="triangle"/></a:ln></p:spPr></p:cxnSp>`;
    zip.file('ppt/presentation.xml', `<p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`);
    zip.file('ppt/_rels/presentation.xml.rels', rels('<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>'));
    zip.file('ppt/slides/slide1.xml', `<p:sld ${NS}><p:cSld><p:spTree>${arrow(2, 500000, 6000000)}${arrow(3, 500000, 250000)}`
      + `<p:sp><p:nvSpPr><p:cNvPr id="4" name="T"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${xf(500000, 3000000, 400000, 300000)}<a:prstGeom prst="rect"/></p:spPr><p:txBody><a:bodyPr wrap="none"/><a:p><a:r><a:rPr sz="1400"/><a:t>Conceptual</a:t></a:r></a:p></p:txBody></p:sp>`
      + `<p:sp><p:nvSpPr><p:cNvPr id="5" name="G"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xf(500000, 4000000, 3000000, 800000)}<a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="E2F0D9"/></a:solidFill><a:effectLst><a:glow rad="139700"><a:srgbClr val="70AD47"><a:alpha val="40000"/></a:srgbClr></a:glow></a:effectLst></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:t>Modular</a:t></a:r></a:p></p:txBody></p:sp>`
      + `<p:pic><p:nvPicPr><p:cNvPr id="6" name="Gráfico 6"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip><a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="rId9"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xf(6000000, 3000000, 700000, 700000)}<a:prstGeom prst="rect"/></p:spPr></p:pic>`
      + `</p:spTree></p:cSld></p:sld>`);
    zip.file('ppt/slides/_rels/slide1.xml.rels', rels('<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image9.svg"/>'));
    zip.file('ppt/media/image9.svg', '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><path d="M10 10h76v76H10z" fill="#70AD47"/></svg>');
    const OF = await W.eval("import('/src/ui/shell/openfile.js')");
    await OF.openPresentation(new W.File([await zip.generateAsync({ type: 'blob' })], 'flechas.pptx')); await sleep(40);
    const bl = R.state.deck.slides[0].blocks, arrows = bl.filter(b => b.shape === 'arrow');
    eq(arrows.length, 2, 'las dos flechas');
    for (const a of arrows) {
      const svg = D.querySelector(`#stage .block[data-id="${a.id}"] svg`), head = svg.querySelector('polygon').getBoundingClientRect(), k = 1280 / D.getElementById('stage').getBoundingClientRect().width;
      assert(head.width * k > 8 && head.width * k < 30 && head.height * k > 8, `su punta, de su tamaño en la larga y en la corta (${Math.round(head.width * k)}×${Math.round(head.height * k)} px)`);
    }
    const tx = bl.find(b => /Conceptual/.test(b.html || ''));
    assert(tx.noWrap && D.querySelector(`#stage .block[data-id="${tx.id}"] .rich`).style.whiteSpace === 'nowrap' && /white-space:nowrap/.test(R.io.buildHTML()), 'el texto que no se parte, entero (en el editor y al presentar)');
    const g = bl.find(b => b.fill === '#e2f0d9' || /Modular/.test(b.html || ''));
    assert(R.state.deck.slides[0].blocks.some(b => b.type === 'image' && /^data:image\/svg\+xml/.test(b.src)), 'un icono de Office solo en SVG (sin PNG): llega');
    const glow = bl.find(b => b.shadow && b.shadow.x === 0 && b.shadow.y === 0);
    assert(glow && glow.shadow.blur > 5, 'el brillo, como un halo alrededor: ' + JSON.stringify(glow?.shadow));
  });

  await test('importar PowerPoint: formas con el estilo del tema, sombras y SmartArt', async () => {
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const W = frame.contentWindow, zip = new W.JSZip();
    const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
    const rel = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
    const rels = (...r) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r.join('')}</Relationships>`;
    const xf = (x, y, w, h) => `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>`;
    zip.file('ppt/presentation.xml', `<p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/></p:presentation>`);
    zip.file('ppt/_rels/presentation.xml.rels', rels(rel('rId2', 'slide', 'slides/slide1.xml'), rel('rId3', 'theme', 'theme/theme1.xml')));
    zip.file('ppt/theme/theme1.xml', `<a:theme ${NS}><a:themeElements><a:clrScheme name="c"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:accent1><a:srgbClr val="4472C4"/></a:accent1></a:clrScheme></a:themeElements></a:theme>`);
    const styled = `<p:style><a:lnRef idx="2"><a:schemeClr val="accent1"><a:shade val="50000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style>`;
    zip.file('ppt/slides/slide1.xml', `<p:sld ${NS} xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"><p:cSld><p:spTree>`
      + `<p:sp><p:nvSpPr><p:cNvPr id="2" name="a"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xf(500000, 500000, 2000000, 1000000)}<a:prstGeom prst="rect"/>`
      + `<a:effectLst><a:outerShdw blurRad="63500" dist="38100" dir="5400000"><a:srgbClr val="000000"><a:alpha val="40000"/></a:srgbClr></a:outerShdw></a:effectLst></p:spPr>${styled}`
      + `<p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="es"/><a:t>Del tema</a:t></a:r></a:p></p:txBody></p:sp>`
      + `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="5" name="d"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="4000000" y="1000000"/><a:ext cx="4000000" cy="3000000"/></p:xfrm>`
      + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/diagram"><dgm:relIds r:dm="rId4" r:lo="rId5" r:qs="rId6" r:cs="rId7"/></a:graphicData></a:graphic></p:graphicFrame>`
      + `</p:spTree></p:cSld></p:sld>`);
    zip.file('ppt/slides/_rels/slide1.xml.rels', rels(rel('rId4', 'diagramData', '../diagrams/data1.xml'), rel('rId8', 'diagramDrawing', '../diagrams/drawing1.xml')));
    zip.file('ppt/diagrams/data1.xml', `<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"><dgm:extLst><a:ext xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" uri="x"><dsp:dataModelExt xmlns:dsp="http://schemas.microsoft.com/office/drawing/2008/diagram" relId="rId8"/></a:ext></dgm:extLst></dgm:dataModel>`);
    const dsp = (id, x, t) => `<dsp:sp modelId="{${id}}"><dsp:nvSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvSpPr/></dsp:nvSpPr><dsp:spPr>${xf(x, 0, 1200000, 800000)}<a:prstGeom prst="roundRect"/><a:solidFill><a:srgbClr val="70AD47"/></a:solidFill></dsp:spPr>`
      + `<dsp:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="es"/><a:t>${t}</a:t></a:r></a:p></dsp:txBody></dsp:sp>`;
    zip.file('ppt/diagrams/drawing1.xml', `<dsp:drawing xmlns:dsp="http://schemas.microsoft.com/office/drawing/2008/diagram" ${NS.split(' ')[0]}><dsp:spTree><dsp:nvGrpSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvGrpSpPr/></dsp:nvGrpSpPr><dsp:grpSpPr/>`
      + dsp(1, 0, 'Paso 1') + dsp(2, 1400000, 'Paso 2') + dsp(3, 2800000, 'Paso 3') + `</dsp:spTree></dsp:drawing>`);
    const deck = await R.pptxImport.importPPTX(new W.File([await zip.generateAsync({ type: 'blob' })], 'tema.pptx'));
    const bl = deck.slides[0].blocks, px = v => Math.round(v * 1280 / 9144000);
    const sh = bl.find(b => b.type === 'shape' && b.x === px(500000));
    assert(sh, 'la forma con el estilo del tema existe (antes salía sin relleno ni borde)');
    eq(sh.fill, '#4472c4', 'relleno del tema (accent1)');
    assert(sh.stroke && sh.stroke !== 'none', 'borde del tema');
    assert(sh.shadow && sh.shadow.y > 0 && sh.shadow.x === 0 && /^#000000/.test(sh.shadow.color), 'sombra hacia abajo: ' + JSON.stringify(sh.shadow));
    const tx = bl.find(b => b.type === 'text' && /Del tema/.test(b.html));
    eq(R.master.styled(tx, deck.slides[0], deck).color || tx.color, '#ffffff', 'texto con el color del tema (lt1)');
    const steps = bl.filter(b => b.type === 'text' && /Paso \d/.test(b.html));
    eq(steps.length, 3, 'el SmartArt se convierte en formas con su texto');
    eq(bl.filter(b => b.type === 'shape' && b.fill === '#70ad47').length, 3, 'con sus formas');
    eq(steps[0].x, px(4000000), 'colocado dentro de su marco');
    // Shadows reach the editor, the show and the exports.
    R.store.replaceDeck(deck); R.render(); await sleep(30);
    assert(/drop-shadow/.test(D.querySelector(`.block[data-id="${sh.id}"]`).style.filter), 'sombra en el lienzo');
    assert(/filter:drop-shadow/.test(R.io.buildHTML()), 'en la presentación');
    const out = await (await W.JSZip.loadAsync(await R.pptx.buildPptxBlob(deck))).file('ppt/slides/slide1.xml').async('string');
    assert(/<a:outerShdw/.test(out), 'y en PowerPoint');
  });

  await test('compartir: limitar a cuentas de un dominio (inicio de sesión con Google) y visitas', async () => {
    const W = frame.contentWindow, real = W.fetch, calls = [];
    W.localStorage.setItem('revela.gdrive', JSON.stringify({ clientId: 'cid.apps.googleusercontent.com', apiKey: 'k' }));
    R.shareServer.setServerConfig({ url: 'https://srv.test', uploadKey: 'u' });
    W.fetch = async (url, o = {}) => {
      url = String(url); calls.push({ url, o });
      if (url.startsWith('https://srv.test/s?')) return new W.Response(JSON.stringify({ id: 'AbCdEfGhIjKlMnOpQrStUv', token: 'tok' }));
      if (url.endsWith('/stats')) return new W.Response(JSON.stringify({ views: 7, last: '2026-09-28T10:00:00Z' }));
      return real(url, o);
    };
    try {
      reset(); const r = await R.io.publishShare({ where: 'server', domain: 'escuela.example' });
      const up = new URL(calls.find(c => c.url.startsWith('https://srv.test/s?')).url);
      eq(up.searchParams.get('domain') + '|' + up.searchParams.get('clientId'), 'escuela.example|cid.apps.googleusercontent.com', 'sube con el dominio y el cliente de Google');
      eq(R.shares.sharesList()[0].domain, 'escuela.example', 'se recuerda');
      const st = await R.shareServer.serverStats(R.shares.sharesList()[0].url, 'tok');
      eq(st.views, 7, 'visitas'); eq(calls.at(-1).o.headers.Authorization, 'Bearer tok', 'con su token');
      void r;
    } finally { W.fetch = real; R.shares.removeShare('AbCdEfGhIjKlMnOpQrStUv'); R.shareServer.setServerConfig({}); W.localStorage.removeItem('revela.gdrive'); }
    // Without a project of one's own, Revela's Google client is used (core/config.js).
    const GD = await frame.contentWindow.eval("import('/src/io/cloud/gdrive.js')");
    assert(/\.apps\.googleusercontent\.com$/.test(GD.gdriveConfig().clientId) && GD.gdriveReady(), 'Drive listo sin configurar nada');
    // The viewer asks to sign in when the server answers 401.
    const S = await import(new URL('../src/io/share/seal.js', D.baseURI));
    const page = S.openerPageHTML({ src: 'https://srv.test/s/AbCdEfGhIjKlMnOpQrStUv' });
    const stub = `<script>window.fetch=function(){return Promise.resolve(new Response(JSON.stringify({signIn:true,domain:'escuela.example',clientId:'cid'}),{status:401}));};</script>`;
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:600px;height:400px;visibility:hidden'; D.body.appendChild(f);
    try {
      f.srcdoc = page.replace('<script>', stub + '<script>');
      let ok = false; for (let i = 0; i < 50 && !ok; i++) { await sleep(100); ok = /escuela\.example/.test(f.contentDocument?.getElementById('m')?.textContent || ''); }
      assert(ok, 'pide iniciar sesión con una cuenta del dominio');
      assert([...f.contentDocument.scripts].some(x => x.src === 'https://accounts.google.com/gsi/client'), 'con el botón de Google');
    } finally { f.remove(); }
  });

  await test('comentarios a PowerPoint y de vuelta: hilos, tareas, resueltos; y los comentarios modernos de Microsoft 365', async () => {
    reset(); const W = frame.contentWindow, C = R.comments; C.setAuthor('Ana');
    const b = slide().blocks[0]; select(b);
    const id = C.addComment('Revisa el título', b.id, { assignee: 'Luis', due: '2026-10-15' });
    C.reply(id, 'Hecho, <mira> & dime'); C.setAuthor('Luis'); C.reply(id, 'Vale');
    const id2 = C.addComment('Cambiar la foto +Marta', null); C.setResolved(id2);
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);
    const xml = await zip.file('ppt/comments/comment1.xml').async('string'), au = await zip.file('ppt/commentAuthors.xml').async('string');
    assert(/<p:cm authorId="0"[^>]*><p:pos [^>]*\/><p:text>Revisa el título \+Luis · 2026-10-15<\/p:text>/.test(xml), 'la tarea, con su nombre y fecha: ' + xml.slice(0, 300));
    assert(/↪ Hecho, &lt;mira&gt; &amp; dime/.test(xml) && /✓ Cambiar la foto \+Marta/.test(xml), 'respuestas y resueltos');
    assert(/name="Ana"/.test(au) && /name="Luis"/.test(au), 'los autores');
    assert(/relationships\/comments" Target="..\/comments\/comment1.xml"/.test(await zip.file('ppt/slides/_rels/slide1.xml.rels').async('string')), 'enlazado a la diapositiva');
    assert(/commentAuthors\+xml/.test(await zip.file('[Content_Types].xml').async('string')), 'tipos de contenido');
    const back = (await R.pptxImport.importPPTX(new W.File([blob], 'c.pptx'))).slides[0].comments;
    eq(back.length, 2, 'vuelven los dos');
    eq(back[0].text, 'Revisa el título +Luis'); eq(back[0].assignee, 'Luis'); eq(back[0].due, '2026-10-15'); eq(back[0].author, 'Ana');
    eq(back[0].replies.map(r => r.author + ':' + r.text).join('|'), 'Ana:Hecho, <mira> & dime|Luis:Vale', 'con sus respuestas');
    assert(back[1].resolved && back[1].assignee === 'Marta', 'resuelto y asignado');
    // LibreOffice (.odp): the same, as annotations.
    const odp = await R.odp.buildODP(), oz = await W.JSZip.loadAsync(odp), content = await oz.file('content.xml').async('string');
    assert(/<officeooo:annotation [^>]*><dc:creator>Ana<\/dc:creator>/.test(content) && /↪ Vale/.test(content), 'en ODP, como anotaciones');
    const ob = (await R.odp.importODP(new W.File([odp], 'c.odp'))).slides[0].comments;
    assert(ob.length === 2 && ob[0].assignee === 'Luis' && ob[0].replies.length === 2 && ob[1].resolved, 'y vuelven de ODP');
    // A Microsoft 365 comment (modern format) on the first object, with a reply.
    const spid = (await zip.file('ppt/slides/slide1.xml').async('string')).match(/<p:cNvPr id="(\d+)" name="rv-/)[1];
    zip.file('ppt/authors.xml', '<p188:authorLst xmlns:p188="http://schemas.microsoft.com/office/powerpoint/2018/8/main"><p188:author id="{A1}" name="Rosa" initials="R" userId="r" providerId="None"/></p188:authorLst>');
    zip.file('ppt/comments/modernComment_1.xml', `<p188:cmLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:ac="http://schemas.microsoft.com/office/drawing/2013/main/command" xmlns:p188="http://schemas.microsoft.com/office/powerpoint/2018/8/main"><p188:cm id="{C1}" authorId="{A1}" created="2026-09-01T10:00:00.000" status="resolved"><ac:deMkLst><ac:spMk id="${spid}" creationId="x"/></ac:deMkLst><p188:replyLst><p188:reply id="{R1}" authorId="{A1}" created="2026-09-02T10:00:00.000"><p188:txBody><a:bodyPr/><a:p><a:r><a:t>Ya está</a:t></a:r></a:p></p188:txBody></p188:reply></p188:replyLst><p188:txBody><a:bodyPr/><a:p><a:r><a:t>Más grande</a:t></a:r></a:p></p188:txBody></p188:cm></p188:cmLst>`);
    const rp = 'ppt/slides/_rels/slide1.xml.rels';
    zip.file(rp, (await zip.file(rp).async('string')).replace('</Relationships>', '<Relationship Id="rIdM" Type="http://schemas.microsoft.com/office/2018/10/relationships/comments" Target="../comments/modernComment_1.xml"/></Relationships>'));
    const again = (await R.pptxImport.importPPTX(new W.File([await zip.generateAsync({ type: 'blob' })], 'm.pptx'))).slides[0];
    const m = again.comments.find(c => c.text === 'Más grande');
    assert(m && m.author === 'Rosa' && m.resolved && m.replies[0]?.text === 'Ya está', 'comentario moderno con su respuesta');
    assert(m.blockId && again.blocks.some(x => x.id === m.blockId), 'anclado a su objeto');
  });

  // ---- Office themes (tests/fixtures/themes/, made by make.py there) ----
  const TW = frame.contentWindow;
  const fixture = async n => new TW.File([await (await fetch(new URL('fixtures/themes/' + n, location.href))).blob()], n);
  const themeImport = async n => (/\.odp$/.test(n) ? R.odp.importODP : R.pptxImport.importPPTX)(await fixture(n));
  const colorMods = async (...a) => (await TW.eval("import('/src/features/design/colormods.js')")).colorMods(...a);

  await test('abrir: «Abriendo «nombre»…» mientras se carga (solo si tarda), también al leer un PowerPoint', async () => {
    const O = await TW.eval("import('/src/ui/shell/opening.js')");
    let go; const slow = new Promise(ok => { go = ok; });
    const quick = O.whileOpening(Promise.resolve(1), 'Rápida'); await quick; await sleep(300);
    assert(!D.getElementById('opening-doc'), 'lo rápido no muestra nada');
    const p = O.whileOpening(slow, 'Informe anual'); await sleep(350);
    const el = D.getElementById('opening-doc');
    assert(el && /Abriendo «Informe anual»…/.test(el.textContent) && el.querySelector('.od-spin'), 'lo que tarda: la pantalla con su nombre');
    go(7); eq(await p, 7, 'devuelve lo abierto'); await sleep(300);
    assert(!D.getElementById('opening-doc'), 'y se quita');
    // A PowerPoint read (no request: the top bar doesn't see it).
    const OF = await TW.eval("import('/src/ui/shell/openfile.js')"); let seen = '';
    const watch = new TW.MutationObserver(() => { const x = D.getElementById('opening-doc'); if (x) seen = x.textContent; }); watch.observe(D.body, { childList: true, subtree: true });
    await OF.openPresentation(await fixture('office.pptx')); watch.disconnect();
    assert(R.state.deck.officeTheme && (seen === '' || /office\.pptx/.test(seen)), 'el PowerPoint abierto (con su nombre en la pantalla si tardó): ' + seen);
    reset();
  });

  await test('temas: un PowerPoint con el tema de Office se detecta (nombre, colores, fuentes) y los tonos del tema se resuelven como en PowerPoint', async () => {
    const d = await themeImport('office.pptx');
    eq(d.officeTheme?.name, 'Office Theme', 'nombre del tema');
    eq(d.palette, 'custom', 'paleta propia'); eq(d.customPalette.name, 'Office', 'con el nombre de sus colores');
    eq(d.customPalette.bg + d.customPalette.fg, '#ffffff#000000', 'fondo y texto (bg1 = lt1, tx1 = dk1)');
    eq(d.customPalette.accents.join(), '#4f81bd,#c0504d,#9bbb59,#8064a2,#4bacc6,#f79646', 'los seis énfasis');
    eq(d.officeTheme.fonts.major + '|' + d.officeTheme.fonts.minor, 'Calibri|Calibri', 'fuentes del tema');
    eq(d.fontPair, 'theme', 'fuentes del tema en uso'); assert(/Carlito/.test(d.bodyFont), 'Calibri con su equivalente web (Carlito): ' + d.bodyFont);
    const s2 = d.slides[1], rect = s2.blocks.find(b => b.type === 'shape');
    eq(rect.fill, '#376092', 'Énfasis 1, oscuro 25 % (lumMod 75 %)');
    const tx = s2.blocks.find(b => /Acento 2/.test(b.html || ''));
    assert(/#d99694/.test((tx?.html || '') + (tx?.color || '')), 'Énfasis 2, claro 40 % (lumMod 60 % + lumOff 40 %)');
    eq(d.layouts.length, 11, 'todos los diseños del patrón, no solo los usados');
    eq(d.master.background, '#ffffff', 'el fondo del patrón (bgRef 1001 → bg1)');
    // The tint stays linked to its theme colour: another palette recolours it.
    R.store.replaceDeck(d); R.render();
    R.palettes.applyPalette('ocean'); await sleep(10);
    eq(R.state.deck.slides[1].blocks.find(b => b.type === 'shape').fill, await colorMods(R.palettes.PALETTES.ocean.accents[0], [['lumMod', '75000']]), 'el tono sigue a su color del tema');
    R.store.undo(); await sleep(10);
    eq(R.state.deck.slides[1].blocks.find(b => b.type === 'shape').fill, '#376092', 'deshacer');
    reset();
  });

  await test('temas: tema oscuro (mapa de colores invertido), fondo con estilo del tema (bgRef), diseños con su fondo y un diseño claro (clrMapOvr)', async () => {
    const d = await themeImport('noche.pptx');
    eq(d.officeTheme.name, 'Noche');
    eq(d.customPalette.bg + '|' + d.customPalette.fg, '#10172a|#ffffff', 'fondo dk1 y texto lt1 (p:clrMap bg1="dk1")');
    eq(d.customPalette.clrMap.bg1, 'dk1', 'se guarda el mapa de colores');
    assert(/^radial-gradient/.test(d.master.background), 'fondo del patrón: el degradado del estilo de fondo 3 del tema: ' + d.master.background);
    eq(d.slides[0].background, d.master.background, 'la portada lo hereda');
    const sec = d.layouts.find(l => l.name === 'Encabezado de sección');
    eq(sec?.background, await colorMods('#f59e0b', [['lumMod', '50000']]), 'el diseño «Encabezado de sección» conserva su fondo (Énfasis 1 al 50 %)');
    eq(d.slides[1].background, sec.background, 'y su diapositiva');
    const only = d.layouts.find(l => l.name === 'Solo el título');
    eq(only?.background, '#ffffff', 'diseño claro: bg1 = lt1 por su clrMapOvr');
    eq(d.slides[2].background, '#ffffff', 'su diapositiva, clara');
    const t3 = d.slides[2].blocks.find(b => /claro/.test(b.html || ''));
    eq(R.master.styled(t3, d.slides[2], d).color, '#10172a', 'con el texto oscuro (tx1 = dk1 en ese diseño)');
    eq(R.master.styled(d.slides[0].blocks.find(b => b.ph === 'title'), d.slides[0], d).color, '#ffffff', 'y claro en el resto');
    eq(d.master.styles.title.font, 'theme:major', 'el título usa la fuente de títulos del tema (enlazada)');
    assert(/Caladea/.test(R.palettes.styleFont(d.master.styles.title.font, d)) && /Open Sans/.test(d.bodyFont), 'Cambria → Caladea, Segoe UI → Open Sans');
  });

  await test('temas: Google Slides (descargado como .pptx), plantilla .potx sin diapositivas y LibreOffice (.pptx y .odp)', async () => {
    const g = await themeImport('google.pptx');
    eq(g.officeTheme.name, 'Streamline', 'tema de Google Slides');
    eq(g.officeTheme.fonts.major + '|' + g.officeTheme.fonts.minor, 'Montserrat|Lato');
    assert(['Montserrat', 'Lato'].every(f => R.fonts.googleFamiliesInDeck(g).includes(f)), 'sus fuentes de Google se cargan');
    assert(g.layouts.some(l => l.name === 'Portada') && g.layouts.some(l => l.name === 'Título y cuerpo'), 'nombres de diseño de Google');
    const f = await themeImport('faceta.potx');
    eq(f.officeTheme.name, 'Faceta'); eq(f.customPalette.accents[0], '#90c226', 'colores de la plantilla');
    eq(f.slides.length, 1, 'una plantilla sin diapositivas empieza con una'); assert(f.slides[0].layoutId === f.layouts[0].id, 'en su primer diseño');
    eq(f.officeTheme.fonts.major, 'Trebuchet MS');
    const lo = await themeImport('midnightblue.pptx');
    eq(lo.officeTheme.name, 'Midnightblue', 'LibreOffice: el nombre de su plantilla');
    eq(lo.customPalette.bg + '|' + lo.customPalette.fg, '#ffffff|#000000', 'LibreOffice: texto que se lee sobre su fondo (no el blanco de una franja)');
    assert(/Source Sans Pro/.test(lo.officeTheme.fonts.major) && /Source Sans 3/.test(R.palettes.themeFontStacks(lo.officeTheme.fonts).heading), 'sus fuentes reales (no el Arial genérico): ' + lo.officeTheme.fonts.major);
    const od = await themeImport('midnightblue.odp');
    eq(od.officeTheme.name, 'Midnightblue', '.odp: el nombre de su patrón');
    assert(/Source Sans Pro/.test(od.officeTheme.fonts.major), '.odp: sus fuentes'); eq(od.customPalette.fg, '#2c3e50', '.odp: el color del texto');
  });

  await test('temas: el tema detectado se ve en Diseño ▸ Temas, Colores y Fuentes', async () => {
    R.store.replaceDeck(await themeImport('noche.pptx')); R.render(); await sleep(20);
    eq(D.querySelector('[data-theme-now]').textContent, 'Noche', 'su nombre bajo «Temas»');
    D.querySelector('#ribbon [data-palettes-open]').click(); await sleep(20);
    const pal = D.querySelector('.popover [data-palette-theme]');
    assert(pal && pal.classList.contains('on') && /Noche/.test(pal.textContent), 'Colores: el del tema, marcado');
    D.querySelector('#ribbon [data-fontpairs-open]').click(); await sleep(20);
    const fp = D.querySelector('.popover [data-fontpair-theme]');
    assert(fp && fp.classList.contains('on') && /Cambria/.test(fp.textContent) && /Segoe UI/.test(fp.textContent), 'Fuentes: las del tema, marcadas');
    D.querySelector('#ribbon [data-themes-open]').click(); await sleep(20);
    eq(D.querySelector('.popover [data-theme-current]')?.textContent, 'Noche', 'Temas: el actual');
    assert(D.querySelector('.popover [data-theme-from]') && D.querySelector('.popover [data-theme-thmx]'), 'y de dónde tomar otro');
    D.querySelector('#ribbon [data-themes-open]').click(); await sleep(10);
    // Back to the theme's colours after trying another palette.
    R.palettes.applyPalette('forest'); await sleep(10);
    D.querySelector('#ribbon [data-palettes-open]').click(); await sleep(20);
    D.querySelector('.popover [data-palette-theme]').click(); await sleep(10);
    eq(R.state.deck.customPalette?.bg, '#10172a', 'volver a los colores del tema');
    reset();
  });

  await test('temas: abrir un tema de Office (.thmx) y usar el tema de otra presentación', async () => {
    R.store.replaceDeck(R.model.emptyDeck()); R.render();
    R.state.deck.slides[0].blocks[0].html = 'Mi título'; R.render();
    assert(await R.openfile.useThemeOf(await fixture('brisa.thmx')), 'se aplica el .thmx');
    let d = R.state.deck;
    eq(d.officeTheme.name, 'Brisa'); eq(d.customPalette.accents[0], '#006d77', 'sus colores');
    eq(d.slides[0].background, '#ffffff', 'el fondo de la paleta anterior pasa al del tema');
    assert(/Questrial/.test(d.bodyFont) && /Century Gothic/.test(R.palettes.styleFont(d.master.styles.title.font, d)), 'Century Gothic (con Questrial en la web)');
    R.store.undo(); eq(R.state.deck.officeTheme, undefined, 'un solo paso para deshacer');
    assert(await R.openfile.useThemeOf(await fixture('noche.pptx')), 'el tema de otra presentación');
    d = R.state.deck;
    eq(d.officeTheme.name, 'Noche'); eq(d.layouts.length, 11, 'sus diseños');
    const s = d.slides[0], lay = d.layouts.find(l => l.id === s.layoutId);
    eq(lay?.name, 'Portada', 'la diapositiva pasa a su diseño equivalente');
    assert(s.blocks.some(b => b.ph === 'title' && /Mi título/.test(b.html)), 'conservando lo escrito');
    assert(/radial-gradient/.test(s.background), 'con el fondo del nuevo patrón');
    eq(R.master.styled(s.blocks.find(b => b.ph === 'title'), s, d).color, '#ffffff', 'y sus estilos de texto');
    reset();
  });

  await test('temas: exportar a PowerPoint escribe el tema (colores, mapa, fuentes) y al volver a importarlo es el mismo', async () => {
    const d = await themeImport('noche.pptx'), blob = await R.pptx.buildPptxBlob(d);
    const zip = await TW.JSZip.loadAsync(blob), th = await zip.file('ppt/theme/theme1.xml').async('string');
    assert(/<a:theme [^>]*name="Noche"/.test(th) && /<a:latin typeface="Cambria"/.test(th) && /<a:latin typeface="Segoe UI"/.test(th) && /10172A/.test(th), 'tema escrito');
    assert(/<p:clrMap bg1="dk1" tx1="lt1"/.test(await zip.file('ppt/slideMasters/slideMaster1.xml').async('string')), 'mapa de colores oscuro');
    const back = await R.pptxImport.importPPTX(new TW.File([blob], 'n.pptx'));
    eq(back.officeTheme.name, 'Noche', 'el mismo tema');
    eq(back.customPalette.bg + back.customPalette.fg + back.customPalette.accents.join(), d.customPalette.bg + d.customPalette.fg + d.customPalette.accents.join(), 'los mismos colores');
    eq(back.officeTheme.fonts.major + back.officeTheme.fonts.minor, 'CambriaSegoe UI', 'las mismas fuentes');
    // A deck with a Revela palette: its colours become the theme; a dark one maps dk1 to the background.
    reset(); R.palettes.applyPalette('midnight');
    const x = await (await TW.JSZip.loadAsync(await R.pptx.buildPptxBlob())).file('ppt/theme/theme1.xml').async('string');
    assert(/<a:dk1><a:srgbClr val="0B0F19"/.test(x) && /<a:accent1><a:srgbClr val="7AA2F7"/.test(x), 'paleta de Revela como tema');
    const OT = await TW.eval("import('/src/io/formats/ooxml-theme.js')"), thmx = await OT.buildThmx(R.state.deck);
    const t2 = await R.pptxImport.importPPTX(new TW.File([thmx], 't.thmx'));
    eq(t2.officeTheme.colors.accents[0], '#7aa2f7', 'y como .thmx, que se vuelve a leer');
    reset();
  });

  // ---- Question banks (io/formats/questions.js) and flashcards (io/export/study.js) ----
  const questionsMod = () => frame.contentWindow.eval("import('/src/io/formats/questions.js')");
  const GIFT_SAMPLE = `// Un banco de preguntas en GIFT
$CATEGORY: $course$/Ciencias

::Capital::¿Cuál es la capital de Francia? {
  =París # ¡Bien!
  ~Lyon
  ~Marsella
}

::Primos::Marca los primos {~%50%2 ~%50%3 ~%-100%4}

La Tierra es plana. {F}

::Ríos:: Une cada río con su país {
  =Ebro -> España
  =Sena -> Francia
}

¿Qué planeta es rojo? {=Marte =Mars =%50%Venus}

Colón llegó a América en {=1492 =mil cuatrocientos noventa y dos} con tres naves.

::Pi:: ¿Cuánto vale pi? {#3.14:0.01}

¿Cuántos días tiene una semana laboral? {#4..6}

Escribe sobre tu ciudad. {}

Una ecuación\\: 2 \\= 1 \\+ 1 y unas llaves \\{\\} {=sí ~no}
`;

  await test('preguntas: GIFT (comentarios, títulos, verdadero/falso, parejas, respuesta corta, numérica, escapes)', async () => {
    reset(); const Q = await questionsMod(), r = Q.parseGIFT(GIFT_SAMPLE);
    eq(r.items.map(x => x.poll.kind).join(), 'quiz,quiz,quiz,match,gaps,gaps,number,number,quiz', 'cada pregunta con su tipo');
    const [cap, primes, tf, rivers, planet, colon, pi, week, esc] = r.items.map(x => x.poll);
    eq(cap.question + '|' + cap.options.join('/') + '|' + cap.correct.join(), '¿Cuál es la capital de Francia?|París/Lyon/Marsella|0', 'opción múltiple sin el comentario de la respuesta');
    eq(primes.correct.join(), '0,1', 'con pesos: las dos que suman'); assert(r.items[1].warn.some(w => /cualquiera/.test(w)), 'avisa de que vale cualquiera de las correctas');
    eq(tf.options.join('/') + '|' + tf.correct.join(), 'Verdadero/Falso|1', 'verdadero o falso');
    eq(rivers.options.join('|'), 'Ebro = España|Sena = Francia', 'parejas');
    eq(planet.text, '[Marte|Mars]', 'respuesta corta: las alternativas valen; la parcial no');
    eq(colon.text, 'Colón llegó a América en [1492|mil cuatrocientos noventa y dos] con tres naves.', 'el hueco dentro de la frase');
    eq(pi.answer + '|' + pi.tolerance, '3.14|0.01', 'numérica con margen'); eq(week.answer + '|' + week.tolerance, '5|1', 'numérica como intervalo');
    eq(esc.question, 'Una ecuación: 2 = 1 \\+ 1 y unas llaves {}', 'caracteres escapados');
    eq(r.skipped.length, 1, 'la redacción, fuera'); assert(/larga/.test(r.skipped[0].why), 'y dice por qué');
  });

  await test('preguntas: Moodle XML (tipos, HTML y CDATA, imágenes, cloze) y lo que no se puede, con su motivo', async () => {
    reset(); const Q = await questionsMod(), xml = await (await fetch(new URL('fixtures/questions/moodle.xml', location.href))).text(), r = Q.parseMoodleXML(xml);
    eq(r.items.map(x => x.poll.kind).join(), 'quiz,quiz,quiz,match,gaps,number,gaps', 'lo que encaja');
    const [cap, primes, tf, rivers, planet, pi, cloze] = r.items.map(x => x.poll);
    eq(cap.question + '|' + cap.options.join('/'), '¿Cuál es la capital de Francia?|París/Lyon/Marsella & Niza', 'el HTML como texto');
    assert(r.items[0].warn.some(w => /imagen/.test(w)), 'avisa de la imagen que no viene'); eq(r.items[0].notes, 'París es la capital desde el siglo X.', 'el comentario general, a las notas');
    eq(primes.correct.join(), '0,1', 'varias correctas'); eq(tf.correct.join(), '1', 'verdadero/falso: falso');
    eq(rivers.options.join('|'), 'Ebro = España|Sena = Francia', 'emparejamiento'); assert(r.items[3].warn.some(w => /distractores/.test(w)), 'sin el distractor, avisando');
    eq(planet.question + '|' + planet.text, 'Completa el texto|El planeta rojo es [Marte|Mars].', 'respuesta corta con su hueco ____'); assert(r.items[4].warn.some(w => /comodín/.test(w)), 'sin comodines');
    eq(`${pi.answer}|${pi.tolerance}|${pi.unit}`, '3.14|0.01|rad', 'numérica con unidad');
    eq(cloze.text, 'Madrid es la capital de [España|Spain] y Roma de [Italia].', 'cloze de respuesta corta → huecos');
    eq(r.skipped.map(x => x.name).join('|'), 'Elige: {1:MULTICHOICE:=sí~no}|Describe tu ciudad.|Lee con atención.|[[1]] y [[2]]', 'lo que no se importa (la categoría ni cuenta)');
    assert(/ddwtos/.test(r.skipped[3].why) && /cloze/.test(r.skipped[0].why), 'cada uno con su motivo');
    let bad = ''; try { Q.parseMoodleXML('<quiz><question'); } catch (e) { bad = e.message; } assert(/XML/.test(bad), 'un XML roto lo dice');
  });

  await test('preguntas: CSV sencillo (punto y coma, títulos, comillas) y la plantilla de Kahoot', async () => {
    reset(); const Q = await questionsMod(), W = frame.contentWindow;
    const r = Q.parseCSV('Pregunta;Correcta;Incorrecta 1;Incorrecta 2\n"¿2+2; o algo?";4;3;5\nCapital de Italia;Roma|Rome\nSin respuesta;;x\n');
    eq(r.items.length + '/' + r.skipped.length, '2/1', 'dos dentro, una fuera (sin correcta)');
    const q1 = r.items[0].poll; eq(q1.question, '¿2+2; o algo?', 'comillas con separador dentro');
    eq(q1.options.slice().sort().join() + '|' + q1.options[q1.correct[0]], '3,4,5|4', 'opciones mezcladas, y la correcta sigue marcada');
    eq(r.items[1].poll.text, '[Roma|Rome]', 'solo la correcta: respuesta corta');
    eq(Q.parseCSV('q,a,b\nx,y,z').items.length, 2, 'con comas y sin títulos');
    // Kahoot's template: a few rows of title before the table.
    const rows = [['Quiz template'], [], ['', ...Q.KAHOOT_HEAD], ['1', '¿Color del cielo?', 'Rojo', 'Azul', 'Verde', '', '30', '2'], ['2', '¿Pares?', '2', '3', '4', '5', '5', '1, 3'], ['3', '', '', '', '', '', '', '']];
    const k = Q.parseKahootRows(rows);
    eq(k.items.map(x => x.poll.options.join('/') + ':' + x.poll.correct.join() + ':' + x.poll.time).join('|'), 'Rojo/Azul/Verde:1:30|2/3/4/5:0,2:10', 'respuestas, correctas y tiempo');
    // Ours, read back: the same quizzes.
    R.store.commit(() => { R.state.deck.slides[0].blocks.push(R.poll.pollBlock({ kind: 'quiz', question: '¿Capital?', options: ['A', 'B', 'C', 'D', 'E'], correct: [4], time: 45 }), R.poll.pollBlock({ kind: 'order', options: ['1', '2', '3'] })); });
    const out = await Q.toKahootXlsx(Q.deckQuestions(R.state.deck));
    eq(out.count, 1, 'solo los cuestionarios'); assert(out.left.some(x => /4 respuestas/.test(x.why)) && out.left.some(x => /no existe/.test(x.why)), 'y dice qué se queda fuera');
    const back = await Q.parseXlsxQuestions(await out.blob.arrayBuffer()), bq = back.items[0].poll;
    eq(bq.question + '|' + bq.options.join('/') + '|' + bq.options[bq.correct[0]] + '|' + bq.time, '¿Capital?|A/B/C/E|E|30', 'el .xlsx exportado se vuelve a leer (la correcta no se pierde)');
    const JSZip = W.JSZip || (await W.eval(`import('${R.vendor.JSZIP_ESM}')`)).default, z = await JSZip.loadAsync(await out.blob.arrayBuffer());
    assert(/<c r="B8"[^>]*><is><t[^>]*>Question - max 120 characters/.test(await z.file('xl/worksheets/sheet1.xml').async('string')), 'con la tabla donde la pone la plantilla de Kahoot (fila 8, columna B)');
  });

  await test('preguntas: exportar a GIFT, Moodle XML y CSV, y volver a importarlas igual', async () => {
    reset(); const Q = await questionsMod(), P = R.poll.pollBlock;
    R.store.commit(() => { R.state.deck.slides[0].blocks.push(
      P({ kind: 'quiz', question: '¿Cuánto es 2 = 2?', options: ['Sí', 'No {seguro}'], correct: [0] }), P({ kind: 'match', question: 'Une', options: ['Ebro = España', 'Sena = Francia'] }),
      P({ kind: 'gaps', question: 'Completa', text: 'El agua hierve a [100|cien] grados.', options: [] }), P({ kind: 'gaps', question: 'Dos', text: '[a] y [b]', options: [] }),
      P({ kind: 'number', question: '¿Pi?', answer: 3.14, tolerance: 0.01, options: [] }), P({ kind: 'sort', question: 'Clasifica', options: ['A: x, y'] }), P({ kind: 'choice', question: 'Encuesta' })); });
    const list = Q.deckQuestions(R.state.deck); eq(list.length, 6, 'los cuestionarios y actividades (no las encuestas)');
    const g = Q.toGIFT(list); eq(g.count, 4, 'GIFT: cuatro'); eq(g.left.map(x => x.why.slice(0, 4)).join(), 'GIFT,Este', 'fuera, cada uno con su motivo');
    assert(/¿Cuánto es 2 \\= 2\?/.test(g.text) && /~No \\\{seguro\\\}/.test(g.text), 'con escapes');
    const g2 = Q.parseGIFT(g.text);
    eq(g2.items.map(x => x.poll.kind).join(), 'quiz,match,gaps,number', 'GIFT de vuelta');
    eq(g2.items[0].poll.options.join('/'), 'Sí/No {seguro}', 'los textos intactos'); eq(g2.items[2].poll.text, 'El agua hierve a [100|cien] grados.', 'el hueco en su sitio');
    const m = Q.toMoodleXML(list); eq(m.count, 5, 'Moodle XML: también el de dos huecos (cloze)');
    const m2 = Q.parseMoodleXML(m.text);
    eq(m2.items.map(x => x.poll.kind).join(), 'quiz,match,gaps,gaps,number', 'Moodle de vuelta'); eq(m2.items[3].poll.text, 'Dos [a] y [b]', 'los dos huecos');
    eq(m2.items[4].poll.answer + '|' + m2.items[4].poll.tolerance, '3.14|0.01', 'el número con su margen');
    const c = Q.toCSV(list), c2 = Q.parseCSV(c.text); eq(c.count, 3, 'CSV: tres'); eq(c2.items[0].poll.options[c2.items[0].poll.correct[0]], 'Sí', 'y se vuelve a leer');
    // The dialog: what goes and what is left out, by format.
    D.querySelector('[data-action="export-questions"]').click(); for (let i = 0; i < 40 && !D.getElementById('qbank-out-modal'); i++) await sleep(25);
    const M = D.getElementById('qbank-out-modal'); assert(M && /5 preguntas/.test(M.textContent), 'el diálogo cuenta las de Moodle');
    M.querySelector('input[value="kahoot"]').click(); await sleep(10); assert(/1 preguntas/.test(M.textContent) && /Clasifica/.test(M.textContent), 'y, en Kahoot, qué no va');
    M.querySelector('.modal-close').click();
  });

  await test('preguntas: importar desde el diálogo, con vista previa, cada una en su diapositiva', async () => {
    reset(); const W = frame.contentWindow, n0 = R.state.deck.slides.length;
    D.querySelector('[data-action="import-questions"]').click(); for (let i = 0; i < 40 && !D.getElementById('qbank-modal'); i++) await sleep(25);
    const M = D.getElementById('qbank-modal'); assert(M && /Kahoot/.test(M.textContent) && /CSV/.test(M.textContent), 'explica los formatos');
    assert(M.querySelector('.qb-go').disabled, 'sin archivo no inserta nada');
    const dt = new W.DataTransfer(); dt.items.add(new W.File([GIFT_SAMPLE], 'banco.gift', { type: 'text/plain' }));
    const inp = M.querySelector('.qb-file'); inp.files = dt.files; inp.dispatchEvent(new W.Event('change'));
    for (let i = 0; i < 40 && !M.querySelector('.qb-items'); i++) await sleep(25);
    eq(M.querySelectorAll('.qb-items li').length, 9, 'la lista de lo entendido'); assert(/larga/.test(M.querySelector('.qb-skipped').textContent), 'y de lo que no, con su motivo');
    assert(/GIFT/.test(M.textContent) && /9/.test(M.querySelector('.qb-go').textContent), 'el formato y cuántas');
    M.querySelector('.qb-go').click(); await sleep(20);
    eq(R.state.deck.slides.length, n0 + 9, 'una diapositiva por pregunta'); eq(R.state.ui.slideIndex, 1, 'detrás de la actual, y se ve la primera');
    const s = R.state.deck.slides[1], b = s.blocks[0], { w: SW, h: SH } = R.state.deck.size;
    eq(`${s.blocks.length}|${b.type}|${b.kind}|${b.x},${b.y},${b.w},${b.h}|${b.fontSize}`, `1|poll|quiz|80,60,${SW - 160},${SH - 120}|30`, 'como los cuestionarios de la IA');
    assert(/París/.test(s.notes), 'la respuesta en las notas');
    R.store.undo(); eq(R.state.deck.slides.length, n0, 'se deshace de una vez');
  });

  await test('fichas y práctica: una página sin conexión con fichas (recuerda lo sabido) y práctica con la nota', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/io/export/study.js')"), P = R.poll.pollBlock;
    R.store.commit(() => {
      const d = R.state.deck; d.slides[0].blocks[0].ph = 'title'; d.slides[0].blocks[0].html = 'Los ríos'; d.slides[0].blocks[1].html = 'Llevan agua al mar';
      d.slides.push({ id: 'q1', sectionId: null, background: '#fff', transition: null, blocks: [P({ kind: 'quiz', question: '¿Capital de Francia?', options: ['Lyon', 'París'], correct: [1] })] },
        { id: 'q2', sectionId: null, background: '#fff', transition: null, blocks: [P({ kind: 'gaps', question: 'Completa', text: 'El Ebro está en [España].', options: [] })] },
        { id: 'q3', sectionId: null, background: '#fff', transition: null, blocks: [P({ kind: 'choice', question: 'Encuesta' })] }); });
    const data = S.studyData(R.state.deck, { slides: true });
    eq(data.cards.map(c => c.f + ' → ' + c.b).join(' | '), '¿Capital de Francia? → París | Completa\nEl Ebro está en _____. → El Ebro está en España. | Los ríos → Llevan agua al mar', 'fichas: preguntas y la diapositiva');
    eq(data.items.length, 2, 'práctica: las que tienen respuesta');
    const html = S.studyHTML(R.state.deck, { slides: true });
    assert(/<html lang="es"/.test(html) && !/<script src=/.test(html) && !/https?:\/\//.test(html), 'en el idioma, y todo dentro (sin nada de internet)');
    // The page itself: flip a card, say it was known (kept in localStorage), then practise.
    const fr = D.createElement('iframe'); fr.style.cssText = 'position:fixed;left:0;top:0;width:400px;height:700px'; D.body.appendChild(fr);
    fr.srcdoc = html; for (let i = 0; i < 80 && !fr.contentDocument?.getElementById('fc-text')?.textContent; i++) await sleep(25);
    const F = fr.contentDocument, $ = id => F.getElementById(id), key = data.key;
    try {
      fr.contentWindow.localStorage.removeItem(key);
      eq($('fc-side').textContent, 'Pregunta', 'empieza por delante'); assert(/0 de 3/.test($('fc-prog').textContent), 'y su progreso');
      const first = $('fc-text').textContent; assert($('fc-acts').hidden, 'sin ver la respuesta, no se puede decir si se sabía');
      $('fc-card').click(); eq($('fc-side').textContent, 'Respuesta', 'se da la vuelta'); assert(!$('fc-acts').hidden, 'y entonces sí');
      F.getElementById('fc-knew').click(); assert(/1 de 3/.test($('fc-prog').textContent) && $('fc-text').textContent !== first, 'sabida: la siguiente');
      eq(Object.values(JSON.parse(fr.contentWindow.localStorage.getItem(key))).join(), '1', 'guardado en esa página');
      $('fc-card').click(); F.getElementById('fc-again').click(); assert(/1 de 3/.test($('fc-prog').textContent), 'a repasar: vuelve a salir más tarde');
      // Practice: the tab, a right one and a wrong one, the score, and the wrong ones again.
      F.getElementById('tab-pr').click(); assert(!$('pr').hidden && $('fc').hidden, 'pestaña de práctica');
      eq($('pr-count').textContent, 'Pregunta 1 de 2', 'una a una');
      [...$('pr-q').querySelectorAll('button.opt')].find(b => b.textContent === 'París').click(); $('pr-check').click();
      assert(/Correcto/.test($('pr-fb').textContent) && !$('pr-next').hidden, 'acierto, al momento');
      $('pr-next').click(); const g = $('pr-q').querySelector('input'); assert(g && /Hueco 1/.test(g.getAttribute('aria-label')), 'el hueco, con su nombre para lectores de pantalla');
      g.value = 'Francia'; g.dispatchEvent(new fr.contentWindow.Event('input')); $('pr-check').click();
      assert(/No es correcto/.test($('pr-fb').textContent) && /España/.test($('pr-fb').textContent), 'fallo: y cuál era');
      $('pr-next').click(); assert(/1 de 2/.test($('pr-q').textContent), 'la nota al final');
      [...$('pr-q').querySelectorAll('button')].find(b => /falladas/.test(b.textContent)).click();
      eq($('pr-count').textContent, 'Pregunta 1 de 1', 'repetir solo las falladas');
    } finally { fr.contentWindow?.localStorage.removeItem(key); fr.remove(); }
    await R.i18n.setLang('en');
    try { const en = S.studyHTML(R.state.deck); assert(/<html lang="en"/.test(en) && /I knew it/.test(en) && /Flashcards/.test(en), 'en el idioma de la interfaz'); }
    finally { await R.i18n.setLang('es'); }
    // The dialog and its button.
    D.querySelector('[data-action="export-study"]').click(); for (let i = 0; i < 40 && !D.getElementById('study-modal'); i++) await sleep(25);
    const M = D.getElementById('study-modal'); assert(M && /2 fichas y 2 preguntas/.test(M.textContent), 'el diálogo cuenta lo que lleva');
    M.querySelector('.st-slides').click(); assert(/3 fichas/.test(M.textContent), 'y con las diapositivas, una más');
    M.querySelector('.modal-close').click();
  });
}
