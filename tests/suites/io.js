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
    assert(/<b>/.test(title.html) && /color:#ff0000/.test(title.html) && /Georgia/.test(title.html), 'negrita, color y fuente');
    const list = a.blocks.find(x => x.type === 'text' && /Uno/.test(x.html));
    assert(/<ul><li>.*Uno.*<\/li><li>.*Dos.*<\/li><\/ul>/.test(list.html), 'viñetas como lista');
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
}
