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

  await test('historial de versiones y guardado de presentaciones grandes', async () => {
    reset(); const V = R.versions, M = R.model;
    slide().blocks[0].html = 'Versión A'; R.render();
    const id = await V.saveVersion('Primera', false);
    slide().blocks[0].html = 'Versión B'; R.store.commit(() => {});
    const list = await V.listVersions();
    const v = list.find(x => x.id === id); assert(v && v.name === 'Primera' && !v.deck, 'listada sin cargar el contenido');
    assert(await V.restoreVersion(id), 'restaurada'); await sleep(10);
    eq(slide().blocks[0].html, 'Versión A', 'contenido de la versión');
    const after = await V.listVersions(); assert(after.length >= list.length + 1, 'la anterior se guardó antes de restaurar');
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
      let ok = false; for (let i = 0; i < 150 && !ok; i++) { await sleep(100); ok = /Hola compartida/.test(a.f.contentDocument.querySelector('.reveal .slides')?.textContent || ''); }
      assert(ok, 'con la contraseña se ve la presentación');
    } finally { a.f.remove(); }
    // Secret link: the key after # opens it straight away; without it, a message.
    assert(/^#k=[\w-]{43}$/.test(r2.suffix), 'clave para añadir a la dirección');
    const b = await loadPage(saved[1].href + r2.suffix, f => /Hola compartida/.test(f.contentDocument.querySelector('.reveal .slides')?.textContent || ''));
    b.f.remove(); assert(b.ok, 'con #k= se abre sola');
    const c = await loadPage(saved[1].href, f => /Falta la clave/.test(f.contentDocument.getElementById('m')?.textContent || ''), 8000);
    c.f.remove(); assert(c.ok, 'sin la clave no se abre y lo explica');
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
    const v = await loadPage(`${new URL('view.html', D.baseURI)}?u=${encodeURIComponent(blob)}${u.hash}`, f => /Por servidor/.test(f.contentDocument.querySelector('.reveal .slides')?.textContent || ''));
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
    // Without a Google client id, a domain can't be required.
    let err = ''; await R.io.publishShare({ where: 'server', domain: 'x.example' }).catch(e => { err = e.message; });
    assert(/ID de cliente de Google/.test(err), 'sin client id avisa: ' + err);
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
}
