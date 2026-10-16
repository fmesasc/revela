// Objects: shapes, icons, charts, diagrams, tables, images, equations, code, media, grouping, clipboard.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('votación y gráfico: cancelar una votación nueva la quita; doble clic abre sus datos', async () => {
    reset(); const n = slide().blocks.length;
    D.querySelector('[data-action="insert-poll"]').click(); await sleep(20);
    assert(D.getElementById('poll-modal') && slide().blocks.length === n + 1, 'se abre el editor');
    D.querySelector('#poll-modal .modal-close').click(); await sleep(20);
    eq(slide().blocks.length, n, 'cancelada, la votación no se queda en la diapositiva');
    D.querySelector('[data-action="insert-poll"]').click(); await sleep(20);
    D.querySelector('#poll-modal .pl-q').value = '¿Café o té?'; D.querySelector('#poll-modal .pl-ok').click(); await sleep(20);
    const p = slide().blocks.find(b => b.type === 'poll'); assert(p && p.question === '¿Café o té?', 'aplicada, se queda');
    D.querySelector(`#stage .block[data-id="${p.id}"]`).dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(80);
    assert(D.getElementById('poll-modal'), 'doble clic en la votación: su editor'); D.querySelector('#poll-modal .modal-close').click(); await sleep(20);
    assert(slide().blocks.some(b => b.id === p.id), 'cerrar el editor de una que ya existía no la quita');
    R.blocks.addChart(); await sleep(20); const c = slide().blocks.find(b => b.type === 'chart');
    D.querySelector(`#stage .block[data-id="${c.id}"]`).dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(80);
    assert(D.getElementById('chart-modal'), 'doble clic en el gráfico: sus datos'); D.querySelector('#chart-modal .modal-close')?.click();
  });

  await test('formas: elipse en lienzo y export', async () => {
    reset(); R.blocks.addShape('ellipse'); const b = last(); select(b); await sleep(20);
    assert(D.querySelector(`.block[data-id="${b.id}"] .shape svg ellipse`), 'no hay elipse SVG');
    assert(/<svg[^>]*><ellipse/.test(R.io.buildHTML()), 'export sin elipse');
  });

  await test('icono: se inserta y exporta como SVG', async () => {
    reset(); R.blocks.addIcon('star'); const b = last(); select(b); await sleep(20);
    assert(b.type === 'icon' && b.icon === 'star', 'bloque de icono');
    assert(D.querySelector(`.block[data-id="${b.id}"] .icon-blk svg path`), 'icono en el lienzo');
    R.blocks.setIconColor('#ff0000'); await sleep(10);
    assert(/<svg[^>]*stroke="#ff0000"/.test(R.io.buildHTML()), 'color del icono en el export');
  });

  await test('más formas: estrella y hexágono en lienzo/export', async () => {
    reset(); R.blocks.addShape('star'); const b = last(); select(b); await sleep(20);
    assert(D.querySelector(`.block[data-id="${b.id}"] .shape svg polygon`), 'estrella en el lienzo');
    reset(); R.blocks.addShape('hexagon'); const h = last();
    assert(/<polygon points="23.96,0 76.04,0 100,50/.test(R.io.buildHTML()), 'hexágono en el export, ocupando su caja');
  });

  await test('gráfico de barras: render y export SVG', async () => {
    reset(); R.blocks.addChart(); const b = last(); select(b); await sleep(20);
    assert(D.querySelector(`.block[data-id="${b.id}"] .chart svg rect`), 'barras en el lienzo');
    R.blocks.setChart({ data: [{ label: 'X', value: 10 }] }); await sleep(10);
    assert(/<div[^>]*><svg[^>]*><rect/.test(R.io.buildHTML()), 'gráfico en el export');
  });

  await test('gráfico de líneas: polyline en el export', async () => {
    reset(); R.blocks.addChart(); const b = last(); select(b); R.blocks.setChart({ chartType: 'line' });
    assert(/<polyline points="/.test(R.io.buildHTML()), 'polyline del gráfico de líneas');
  });

  await test('gráficos dona y área en el export', async () => {
    reset(); R.blocks.addChart(); const b = last(); select(b);
    R.blocks.setChart({ chartType: 'doughnut' });
    assert(/A20,20/.test(R.io.buildHTML()), 'anillo interior de la dona');
    R.blocks.setChart({ chartType: 'area' });
    assert(/<polygon points="0,50/.test(R.io.buildHTML()), 'relleno del área');
  });

  await test('gráficos accesibles: el lector de pantalla lee sus datos como tabla', async () => {
    reset(); R.blocks.addChart(); const b = last(); select(b);
    R.blocks.setChartGrid('\tVentas\tCostes\nEne\t10\t6\nFeb\t12\t<7>', { chartType: 'bar' });
    const doc = new frame.contentWindow.DOMParser().parseFromString(R.io.buildHTML(), 'text/html');
    const fig = doc.querySelector('[role="figure"]'); assert(fig, 'el gráfico es una figura');
    eq(fig.getAttribute('aria-label'), 'Gráfico · Barras: Ventas, Costes', 'con su nombre: el tipo y las series');
    eq(fig.querySelector('svg').getAttribute('aria-hidden'), 'true', 'el dibujo, oculto al lector');
    const tb = fig.querySelector('table.rv-sr');
    eq([...tb.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent).join('|')).join(' / '), '|Ventas|Costes / Ene|10|6 / Feb|12|0', 'y sus datos, en una tabla');
    eq(tb.querySelector('th[scope="row"]').textContent, 'Ene', 'cada fila con su etiqueta como encabezado');
    assert(/\.rv-sr\{position:absolute!important;width:1px/.test(R.io.buildHTML()), 'la tabla no se ve');
  });

  await test('gráficos de dispersión y radar en el export', async () => {
    reset(); R.blocks.addChart(); const b = last(); select(b);
    R.blocks.setChart({ chartType: 'scatter', data: [{ label: '1', value: 2 }, { label: '3', value: 4 }, { label: '5', value: 1 }] });
    await sleep(20);
    eq(D.querySelectorAll(`.block[data-id="${b.id}"] .chart svg circle`).length, 3, 'tres puntos en el lienzo');
    eq((R.io.buildHTML().match(/<circle cx=/g) || []).length, 3, 'tres puntos en el export');
    R.blocks.setChart({ chartType: 'radar' }); await sleep(20);
    const html = R.io.buildHTML();
    assert(/fill-opacity="0\.35"/.test(html), 'polígono de datos del radar');
    eq((html.match(/<polygon points="[^"]*" fill="none"/g) || []).length, 4, 'cuatro anillos');
  });

  await test('gráficos con varias series, combinado y desde tabla', async () => {
    reset(); R.blocks.addChart(); const b = last(); select(b);
    const g = R.blocks.parseChartGrid('\tVentas\tCostes\nEne\t10\t6\nFeb\t12,5\t7');
    eq(g.names.join('|'), 'Ventas|Costes', 'cabecera con tabuladores (pegado de hoja)');
    eq(g.data[1].value, 12.5, 'coma decimal'); eq(g.series[0].values.join(','), '6,7', 'segunda serie');
    R.blocks.setChartGrid(',A,B,C\nx,1,2,3\ny,4,5,6', { chartType: 'bar', combo: false }); await sleep(20);
    eq(b.series.length, 2, 'dos series extra'); eq(b.seriesName, 'A', 'nombre de la primera');
    const svg = D.querySelector(`.block[data-id="${b.id}"] .chart svg`);
    eq(svg.querySelectorAll('rect[height]:not([height="3"])').length, 6, 'barras agrupadas: 3 series × 2');
    assert(/>C<\/text>/.test(svg.innerHTML), 'leyenda');
    R.blocks.setChartGrid(R.blocks.chartGridText(b), { chartType: 'bar', combo: true }); await sleep(20);
    const svg2 = D.querySelector(`.block[data-id="${b.id}"] .chart svg`);
    eq(svg2.querySelectorAll('polyline').length, 2, 'combinado: series extra como líneas');
    const blob = await R.pptx.buildPptxBlob(); assert(blob.size > 1000, 'pptx con gráfico combinado');
    R.blocks.addTable(); const tb = last(); select(tb);
    tb.rows = [['', 'Q1', 'Q2'], ['Norte', '5', '7'], ['Sur', '3', '<b>9</b>']]; tb.header = true;
    R.blocks.chartFromTable(); await sleep(10);
    const c = last(); eq(c.type, 'chart', 'gráfico insertado');
    eq(c.data.map(d => d.label + d.value).join(','), 'Norte5,Sur3', 'etiquetas y primera serie');
    eq(c.series[0].values.join(','), '7,9', 'segunda serie (sin HTML)'); eq(c.seriesName, 'Q1', 'nombres de la cabecera');
  });

  await test('gráfico circular: sectores en el export', async () => {
    reset(); R.blocks.addChart(); const b = last(); select(b);
    R.blocks.setChart({ chartType: 'pie' });
    assert(/<path d="M50,50/.test(R.io.buildHTML()), 'sectores del pie');
  });

  await test('forma: cambiar relleno', async () => {
    reset(); R.blocks.addShape('rect'); const b = last(); select(b);
    R.blocks.setShapeStyle('fill', '#ff0000'); await sleep(20);
    eq(b.fill, '#ff0000', 'fill del modelo');
    eq(D.querySelector(`.block[data-id="${b.id}"] .shape svg rect`).getAttribute('fill'), '#ff0000', 'fill SVG');
  });

  await test('conector: une dos objetos y se exporta como línea', async () => {
    reset(); R.blocks.addShape('rect'); R.blocks.addShape('ellipse');
    const a = slide().blocks.at(-2), b = slide().blocks.at(-1);
    R.store.setMulti([a.id, b.id]); R.blocks.addConnector(); await sleep(20);
    const conn = slide().blocks.at(-1);
    eq(conn.type, 'connector', 'creado'); eq(conn.from, a.id, 'origen'); eq(conn.to, b.id, 'destino');
    assert(D.querySelector(`.block[data-id="${conn.id}"] .connector svg path[marker-end]`), 'línea en el lienzo');
    assert(/<path d="M[^"]*" fill="none" stroke="#8a8a8a"/.test(R.io.buildHTML()), 'línea en el export');
    // Borrar un extremo elimina el conector.
    R.state.ui.selection = a.id; R.state.ui.multi = [a.id]; R.blocks.deleteSelected();
    assert(!slide().blocks.some(x => x.type === 'connector'), 'conector huérfano eliminado');
  });

  await test('página web: iframe con sandbox + barra con enlace de salida', async () => {
    reset(); R.blocks.addEmbed('https://example.com'); const b = last(); select(b); await sleep(20);
    const f = D.querySelector(`.block[data-id="${b.id}"] .embed iframe`);
    assert(f && f.hasAttribute('sandbox'), 'iframe sin sandbox');
    const open = D.querySelector(`.block[data-id="${b.id}"] .embed .embed-open`);
    assert(open && open.getAttribute('href') === 'https://example.com', 'sin enlace de apertura');
    assert(/<iframe[^>]*sandbox=/.test(R.io.buildHTML()), 'export sin iframe');
  });

  await test('tablas: render, edición de fila/columna y export', async () => {
    reset(); R.blocks.addTable(); const b = last(); select(b); await sleep(20);
    const t = D.querySelector(`.block[data-id="${b.id}"] .tbl`);
    assert(t, 'no hay tabla'); eq(t.querySelectorAll('tr').length, 2, 'filas iniciales');
    eq(t.querySelectorAll('tr')[0].children.length, 3, 'columnas iniciales');
    R.blocks.tableAddRow(); R.blocks.tableAddCol(); await sleep(20);
    eq(b.rows.length, 3, 'fila añadida'); eq(b.rows[0].length, 4, 'columna añadida');
    b.rows[0][0] = 'Hola'; R.render(); await sleep(10);
    assert(/<table class="tbl"[^>]*><tr><td>Hola<\/td>/.test(R.io.buildHTML()), 'export de la tabla');
  });

  await test('ajustes de imagen: filtro/opacidad en lienzo y export', async () => {
    reset(); R.blocks.addImage('data:image/png;base64,iVBORw0KGgo='); const b = last(); select(b); await sleep(20);
    R.blocks.setImageAdj('brightness', 150); R.blocks.setImageAdj('opacity', 60); await sleep(20);
    const img = D.querySelector(`.block[data-id="${b.id}"] img`);
    assert(/brightness\(150%\)/.test(img.style.filter), 'filtro en el DOM');
    eq(img.style.opacity, '0.6', 'opacidad en el DOM');
    assert(/brightness\(150%\)[^"]*opacity:0\.6/.test(R.io.buildHTML()), 'filtro en el export');
  });

  await test('descripción (caption) bajo la figura y en el export', async () => {
    reset(); await R.i18n.setLang('es'); R.blocks.addImage('data:image/png;base64,AAA'); const b = last(); select(b);
    R.blocks.setCaption('Un gato'); R.render(); await sleep(20);
    assert(D.querySelector('#stage .caption-ovl'), 'descripción en el lienzo');
    assert(/Figura 1: Un gato/.test(R.io.buildHTML()), 'descripción en el export');
  });

  await test('índice: solo tablas', async () => {
    reset(); await R.i18n.setLang('es');
    R.blocks.addImage('data:image/png;base64,AAA'); R.blocks.setCaption('Foto');
    R.blocks.addTable(); R.blocks.setCaption('Datos');
    R.blocks.addFigIndex('tables'); const fi = slide().blocks.at(-1); await sleep(20);
    const el = D.querySelector(`.block[data-id="${fi.id}"] .figindex`);
    assert(el && /Tabla 1: Datos/.test(el.textContent) && !/Figura/.test(el.textContent), 'solo tablas en la lista');
  });

  await test('zoom de diapositiva: miniatura, enlace y opción de volver', async () => {
    reset(); R.slides.addSlide();
    R.state.deck.slides[0].blocks = [{ id: 'x1', type: 'text', x: 0, y: 0, w: 200, h: 60, html: 'DESTINO' }];
    R.state.ui.slideIndex = 1; R.render();
    R.blocks.addSlideRef(); const b = slide().blocks.at(-1); b.target = R.state.deck.slides[0].id;
    const html = R.io.buildHTML();
    assert(/<a class="slide-zoom" href="#\/0\/0"/.test(html), 'enlace a la diapositiva destino');
    assert(/DESTINO/.test(html), 'miniatura con el contenido de la diapositiva');
    b.returnBack = true;
    const html2 = R.io.buildHTML();
    assert(/data-zoom-return="1"/.test(html2) && /slidechanged/.test(html2), 'opción de volver + script');
  });

  await test('índice de figuras lista figuras y tablas', async () => {
    reset(); await R.i18n.setLang('es');
    R.blocks.addImage('data:image/png;base64,AAA'); R.blocks.setCaption('Foto');
    R.blocks.addTable(); R.blocks.setCaption('Datos');
    R.blocks.addFigIndex(); await sleep(20);
    const fi = slide().blocks.at(-1);
    const el = D.querySelector(`.block[data-id="${fi.id}"] .figindex`);
    assert(el && /Figura 1: Foto/.test(el.textContent) && /Tabla 1: Datos/.test(el.textContent), 'lista figuras y tablas');
    assert(/List of figures|Índice de figuras/.test(el.textContent), 'título del índice');
  });

  await test('texto alternativo en la imagen exportada', async () => {
    reset(); R.blocks.addImage('data:image/png;base64,iVBORw0KGgo='); const b = last(); select(b);
    R.blocks.setAlt('Un gráfico'); assert(/alt="Un gráfico"/.test(R.io.buildHTML()), 'alt en el export');
  });

  await test('recorte de imagen: clip-path en lienzo y export', async () => {
    reset(); R.blocks.addImage('data:image/png;base64,iVBORw0KGgo='); const b = last(); select(b); await sleep(20);
    R.blocks.setImageCrop('top', 10); R.blocks.setImageCrop('left', 20); await sleep(20);
    const img = D.querySelector(`.block[data-id="${b.id}"] img`);
    assert(/inset\(10% 0% 0% 20%\)/.test(img.style.clipPath), 'clip-path en el DOM');
    assert(/clip-path:inset\(10% 0% 0% 20%\)/.test(R.io.buildHTML()), 'clip-path en el export');
  });

  await test('presentar una presentación muy pesada (cientos de MB de fotos y vídeos): sin «Invalid string length», con sus archivos como blob:', async () => {
    reset(); const W = frame.contentWindow;
    // 20 slides with the same 30 MB file: 600 million characters if it all went in the page's text.
    const big = 'data:image/jpeg;base64,' + 'A'.repeat(30e6);
    R.store.commit(() => { R.state.deck.slides = Array.from({ length: 20 }, (_, i) => ({ id: 'h' + i, background: '#fff', blocks: [{ id: 'hb' + i, type: 'image', src: big, x: 0, y: 0, w: 1280, h: 720, rotation: 0, animation: null }] })); });
    let html, err = null; try { html = R.io.buildHTML(R.state.deck, { inApp: true }); } catch (e) { err = e.message; }
    eq(err, null, 'se construye');
    assert(html.length < 2e6 && (html.match(/src="blob:/g) || []).length === 20, 'la página, pequeña (' + Math.round(html.length / 1e3) + ' KB), con las fotos como blob:');
    eq(new Set(html.match(/blob:[^"]+/g)).size, 1, 'el mismo archivo, una sola vez en memoria');
    // A real photo: it shows in the presentation.
    const c = D.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); for (let i = 0; i < 4000; i++) { g.fillStyle = `hsl(${i % 360},70%,50%)`; g.fillRect(Math.random() * 400, Math.random() * 300, 9, 9); }
    const photo = c.toDataURL('image/png'); assert(photo.length > 64 * 1024, 'foto de prueba de más de 64 KB: ' + photo.length);
    R.store.commit(() => { R.state.deck.slides = [{ id: 'p1', background: '#fff', blocks: [{ id: 'pb', type: 'image', src: photo, x: 0, y: 0, w: 640, h: 480, rotation: 0, animation: null }] }]; R.state.ui.slideIndex = 0; });
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    f.src = W.URL.createObjectURL(new W.Blob([R.io.buildHTML(R.state.deck, { inApp: true })], { type: 'text/html' }));
    try {
      let im; for (let i = 0; i < 100 && !((im = f.contentDocument?.querySelector('section img'))?.complete && im.naturalWidth); i++) await sleep(100);
      assert(/^blob:/.test(im.getAttribute('src')) && im.naturalWidth === 400, 'la foto se ve al presentar (' + im?.naturalWidth + ')');
    } finally { f.remove(); }
    assert(/^data:image\/png/.test(R.state.deck.slides[0].blocks[0].src), 'la presentación sigue guardando la foto dentro');
    // The editor: the slide and its thumbnail show it by its blob: address too (the browser kept a copy of the text per
    // picture), the thumbnail loaded when in sight; one address for both, and for presenting.
    R.render(); await sleep(50);
    const onStage = D.querySelector('#stage .block[data-id="pb"] img'), thumb = D.querySelector('#navigator img');
    assert(/^blob:/.test(onStage.getAttribute('src')) && onStage.getAttribute('src') === thumb?.getAttribute('src'), 'en el editor y en la miniatura, el mismo blob:');
    eq(thumb.loading, 'lazy', 'la miniatura, cuando se ve');
    for (let i = 0; i < 40 && !(onStage.complete && onStage.naturalWidth); i++) await sleep(50);
    eq(onStage.naturalWidth, 400, 'y se ve');
    assert(R.io.buildHTML().includes(photo.slice(0, 500)), 'y al exportar va dentro (un archivo que funciona en cualquier sitio)');
  });

  await test('recortar sobre la imagen: doble clic, el marco, Intro, otra vez desde la entera, Esc y quitar el recorte', async () => {
    reset(); const W = frame.contentWindow;
    // 200×100: the left half red, the right half blue.
    const k = D.createElement('canvas'); k.width = 200; k.height = 100; const g = k.getContext('2d');
    g.fillStyle = '#f00'; g.fillRect(0, 0, 100, 100); g.fillStyle = '#00f'; g.fillRect(100, 0, 100, 100);
    R.blocks.addImage(k.toDataURL('image/png')); const b = last(); select(b);
    R.store.commit(() => Object.assign(b, { x: 100, y: 100, w: 400, h: 200, fit: 'fill' })); await sleep(50);
    const whole = b.src, CR = await W.eval("import('/src/ui/canvas/imagecrop.js')");
    D.querySelector(`.block[data-id="${b.id}"]`).dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true }));
    let s; for (let i = 0; i < 40 && !(s = CR.cropSession()); i++) await sleep(25);
    assert(s && D.querySelector('#stage .crop-ui .crop-frame') && D.querySelectorAll('.crop-ui .crop-h').length === 8, 'el doble clic abre el recorte, con sus 8 tiradores');
    eq([s.D.x, s.D.y, s.D.w, s.D.h].join(), '0,0,400,200', 'la imagen entera, en su caja');
    // Dragging the left edge to the middle (a real drag on its handle).
    const h = D.querySelector('.crop-h.w').getBoundingClientRect(), z = D.querySelector('.crop-ui').getBoundingClientRect().width / 400;
    const ov = D.querySelector('.crop-ui'), ev = (t, x) => ov.dispatchEvent(new W.PointerEvent(t, { bubbles: true, clientX: x, clientY: h.y + h.height / 2, pointerId: 1 }));
    D.querySelector('.crop-h.w').dispatchEvent(new W.PointerEvent('pointerdown', { bubbles: true, clientX: h.x + h.width / 2, clientY: h.y + h.height / 2, pointerId: 1 }));
    ev('pointermove', h.x + h.width / 2 + 200 * z); ev('pointerup', h.x + h.width / 2 + 200 * z);
    eq(Math.round(s.C.x) + ',' + Math.round(s.C.w), '200,200', 'el borde izquierdo, a la mitad');
    W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); 
    for (let i = 0; i < 40 && b.src === whole; i++) await sleep(25);
    eq([b.x, b.y, b.w, b.h].join(), '300,100,200,200', 'la caja es la parte que queda, donde estaba');
    assert(!D.querySelector('.crop-ui') && b.fit === 'fill' && Math.abs(b.uncropped.l - 0.5) < 0.01 && b.uncropped.src === whole, 'guarda la entera');
    const im = new W.Image(); im.src = b.src; await im.decode();
    eq(im.naturalWidth + 'x' + im.naturalHeight, '100x100', 'la imagen recortada, a su resolución');
    const c = D.createElement('canvas'); c.width = 100; c.height = 100; c.getContext('2d').drawImage(im, 0, 0);
    eq([...c.getContext('2d').getImageData(50, 50, 1, 1).data].slice(0, 3).join(), '0,0,255', 'la mitad azul');
    assert(R.io.buildHTML().includes(b.src.slice(0, 200)), 'en el export, la recortada');
    // Again: from the whole picture; Esc leaves it as it was.
    await CR.startImageCrop(b); s = CR.cropSession();
    eq([s.D.x, s.D.w, s.C.x, s.C.w].join(), '-200,400,0,200', 'otra vez: desde la imagen entera');
    s.C.x = -200; s.C.w = 400; s.paint();
    W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(50);
    eq([b.x, b.w].join(), '300,200', 'Esc: como estaba');
    // Delete while cropping doesn't delete it.
    await CR.startImageCrop(b);
    W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await sleep(30);
    assert(R.state.deck.slides[R.state.ui.slideIndex].blocks.includes(b), 'Supr no lo borra mientras se recorta');
    CR.endImageCrop(false);
    // Turned 90°: the part kept stays where it showed.
    R.store.commit(() => { b.rotation = 90; }); await sleep(30);
    await CR.startImageCrop(b); s = CR.cropSession(); s.C.w = 100; s.paint(); await CR.endImageCrop(true);
    for (let i = 0; i < 40 && b.w !== 100; i++) await sleep(25);
    eq([b.x, b.y, b.w, b.h].join(), '350,50,100,200', 'girada: la mitad izquierda de la caja queda arriba');
    const { uncrop } = await W.eval("import('/src/features/document/crop.js')");
    R.store.commit(() => { b.rotation = 0; }); await uncrop(b.id);
    eq(b.src, whole, 'Quitar el recorte: la imagen entera'); assert(!b.uncropped, 'sin lo guardado');
    eq([b.w, b.h].join(), '400,200', 'con su tamaño entero');
  });

  await test('editor de ecuaciones (visual MathLive o paleta) se abre', async () => {
    reset(); R.blocks.addMath(); const b = last(); select(b); await sleep(20);
    const el = D.querySelector(`.block[data-id="${b.id}"]`);
    el.dispatchEvent(new frame.contentWindow.MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 120 }));
    await sleep(10);
    const item = [...D.querySelectorAll('#context-menu .ctx-item')].find(x => /ecuaci/i.test(x.textContent));
    assert(item, 'opción de editar ecuación en el menú'); item.click();
    let m = null; for (let i = 0; i < 80 && !m; i++) { await sleep(50); m = D.getElementById('math-modal'); }
    assert(m, 'se abre el editor de ecuaciones');
    assert(m.querySelector('math-field') || m.querySelectorAll('.mt-btn').length > 20, 'campo matemático visual o paleta');
    m.querySelector('.modal-close').click();
  });

  // (The virtual keyboard itself is checked with real clicks by tests/run.py:
  // inside this iframe MathLive shows it in the parent page.)
  await test('editor de ecuaciones: doble clic lo abre y sus teclas no afectan a la diapositiva', async () => {
    reset(); R.blocks.addMath(); const b = last(); select(b); R.blocks.setMath('x'); await sleep(20);
    const W = frame.contentWindow, n0 = slide().blocks.length, x0 = b.x;
    try {
      D.querySelector(`.block[data-id="${b.id}"] .math-blk`).dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true }));
      let m = null; for (let i = 0; i < 100 && !m?.querySelector('math-field'); i++) { await sleep(50); m = D.getElementById('math-modal'); }
      assert(m && m.querySelector('math-field'), 'doble clic en la ecuación abre el editor');
      const tex = m.querySelector('.mt-tex'), mf = m.querySelector('math-field');
      tex.focus();
      for (const key of ['Backspace', 'Delete', 'ArrowLeft']) tex.dispatchEvent(new W.KeyboardEvent('keydown', { key, bubbles: true }));
      mf.focus(); mf.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, composed: true }));
      eq(slide().blocks.length, n0, 'Retroceso/Supr en el editor no borran la ecuación');
      eq(slide().blocks.find(x => x.id === b.id).x, x0, 'las flechas no mueven el objeto');
      // It edits its own equation even if the selection changes meanwhile.
      R.state.ui.selection = null;
      tex.value = 'a+b'; tex.dispatchEvent(new W.Event('input', { bubbles: true }));
      eq(slide().blocks.find(x => x.id === b.id).latex, 'a+b', 'edita su ecuación aunque cambie la selección');
      // A click that reaches the backdrop through the keyboard doesn't close it.
      const fake = D.createElement('div'); fake.className = 'ML__keyboard'; m.appendChild(fake);
      fake.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); fake.remove();
      assert(D.getElementById('math-modal'), 'un clic en el teclado no cierra el editor');
    } finally { D.querySelector('#math-modal .modal-close')?.click(); }
    await sleep(50);
    assert(!D.getElementById('math-modal'), 'se cierra');
    select(b); D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    eq(slide().blocks.find(x => x.id === b.id).x, x0 + 1, 'sin diálogo, las flechas vuelven a mover el objeto');
  });

  await test('ecuación: tamaño, color, negrita, subrayado, alineación, relleno y borde desde la cinta', async () => {
    reset(); R.blocks.addMath(); const b = last(); select(b); R.blocks.setMath('x^2'); await sleep(20);
    const W = frame.contentWindow, box = () => D.querySelector(`.block[data-id="${b.id}"] .math-blk`);
    eq(W.getComputedStyle(box()).fontSize, '42px', 'mismo tamaño que al presentar (42 px de reveal.js)');
    const size = D.querySelector('[data-size]'); eq(size.value, '42', 'la cinta muestra su tamaño');
    size.value = '60'; size.dispatchEvent(new W.Event('change', { bubbles: true })); await sleep(20);
    eq(b.fontSize, 60, 'tamaño desde la cinta'); eq(W.getComputedStyle(box()).fontSize, '60px', 'en el lienzo');
    D.querySelector('[data-fontdelta="2"], [data-fontdelta]')?.click(); await sleep(10);
    assert(b.fontSize !== 60, 'aumentar/reducir tamaño');
    R.format.color('#ff0000'); R.format.highlight('#ffff00'); await sleep(20);
    eq(b.color, '#ff0000', 'color'); eq(W.getComputedStyle(box()).color, 'rgb(255, 0, 0)', 'color en el lienzo');
    eq(W.getComputedStyle(box()).backgroundColor, 'rgb(255, 255, 0)', 'resaltado en el lienzo');
    D.querySelector('[data-fmt="bold"]').click(); D.querySelector('[data-fmt="underline"]').click(); await sleep(20);
    assert(b.bold && b.underline, 'negrita y subrayado');
    assert(D.querySelector('[data-fmt="bold"]').classList.contains('on'), 'el botón de negrita se ve activo');
    D.querySelector('[data-para="right"]').click(); await sleep(20);
    eq(b.textAlign, 'right', 'alineación'); eq(W.getComputedStyle(box()).justifyContent, 'flex-end', 'alineada en el lienzo');
    assert(D.querySelector('[data-para="right"]').classList.contains('on'), 'el botón de alineación se ve activo');
    R.blocks.setBoxStyle({ bg: '#00ff00', borderColor: '#0000ff', radius: 8 });
    eq(b.bg + b.borderColor, '#00ff00#0000ff', 'relleno y borde');
    const html = R.io.buildHTML(), tag = html.match(/<div[^>]*class="math"[^>]*>/)[0];
    assert(/font-size:\d+px/.test(tag) && /color:#ff0000/.test(tag) && /justify-content:flex-end/.test(tag), 'formato en el export: ' + tag);
    assert(/background:#00ff00/.test(tag) && /border:2px solid #0000ff/.test(tag) && /border-radius:8px/.test(tag), 'relleno y borde en el export');
    assert(tag.includes('data-latex="\\underline{\\boldsymbol{x^2}}"'), 'negrita y subrayado en el LaTeX exportado');
    eq(b.latex, 'x^2', 'la ecuación original no se toca');
    D.querySelector('[data-fmt="removeFormat"]').click(); await sleep(10);
    assert(!b.bold && !b.underline && !b.color, 'borrar formato');
  });

  await test('ecuación (math): se inserta y exporta con KaTeX', async () => {
    reset(); R.blocks.addMath(); const b = last(); select(b); R.blocks.setMath('a^2+b^2=c^2');
    const html = R.io.buildHTML();
    assert(/data-latex="a\^2\+b\^2=c\^2"/.test(html), 'latex en el export');
    assert(/katex\.min\.js/.test(html), 'KaTeX incluido');
  });

  await test('bloque de código: edición y export con highlight.js', async () => {
    reset(); R.blocks.addCode(); const b = last(); select(b); await sleep(20);
    assert(D.querySelector(`.block[data-id="${b.id}"] pre.code code`), 'no hay bloque de código');
    b.code = 'const x = 1;'; b.lang = 'javascript'; R.render();
    const html = R.io.buildHTML();
    assert(/<code class="language-javascript" data-trim>const x = 1;<\/code>/.test(html), 'export del código');
    assert(/plugin\/highlight\/highlight\.js/.test(html) && /RevealHighlight/.test(html), 'plugin de resaltado de reveal');
  });

  await test('tabla con fila de encabezado', async () => {
    reset(); R.blocks.addTable(); const b = last(); select(b); R.blocks.tableToggleHeader();
    assert(b.header, 'bandera header'); assert(/class="tbl has-header"/.test(R.io.buildHTML()), 'clase has-header');
  });

  await test('menú contextual sobre un objeto que ya no está en la diapositiva', async () => {
    reset(); const ghost = D.createElement('div'); ghost.className = 'block'; ghost.dataset.id = 'ya-no-esta';
    D.getElementById('stage').appendChild(ghost);
    try {
      ghost.dispatchEvent(new frame.contentWindow.MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
      const items = [...D.querySelectorAll('#context-menu .ctx-item')].map(x => x.textContent);
      assert(items.length && !items.some(x => /Duplicar/.test(x)), 'el menú de la diapositiva, sin error');
    } finally { ghost.remove(); D.body.click(); }
  });

  await test('estilos de tabla: predefinidos y opciones', async () => {
    reset(); R.blocks.addTable(); const b = last(); select(b); await sleep(10);
    D.querySelector(`#stage .block[data-id="${b.id}"]`).dispatchEvent(new frame.contentWindow.MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
    const item = [...D.querySelectorAll('.ctx-item')].find(x => /Estilo de tabla/.test(x.textContent));
    assert(item, 'opción en el menú'); item.click(); await sleep(10);
    eq(D.querySelectorAll('#ts-modal [data-ts]').length, 6, 'seis estilos');
    D.querySelector('#ts-modal [data-ts="band1"]').click(); await sleep(10);
    const acc = R.palettes.currentPalette().accents[0];
    assert(b.header && b.banded, 'encabezado y bandas'); eq(b.headBg, acc, 'color del acento');
    const t = D.querySelector(`#stage .block[data-id="${b.id}"] table`);
    assert(t.classList.contains('banded') && t.classList.contains('has-header'), 'clases en el lienzo');
    const bandBg = getComputedStyle(t.rows[1].cells[0]).backgroundColor;
    assert(/rgba\(63, 100, 151, 0\.18\)/.test(bandBg), 'primera fila de datos con banda: ' + bandBg);
    D.querySelector('#ts-modal [data-o="firstCol"]').click(); await sleep(10);
    assert(b.firstCol, 'primera columna');
    const html = R.io.buildHTML();
    assert(/class="tbl has-header banded first-col"/.test(html), 'clases en el export');
    assert(html.includes('--th-bg:' + acc), 'variables en el export');
    D.querySelector('#ts-modal .modal-close').click();
  });

  await test('las formas ocupan su caja entera (los tiradores, en su borde), como en PowerPoint', async () => {
    reset();
    for (const k of ['rect', 'ellipse', 'rounded', 'triangle', 'diamond', 'hexagon', 'star', 'speech', 'minus']) {
      R.blocks.addShape(k); const b = last(); R.store.commit(() => Object.assign(b, { x: 80, y: 40, w: 1120, h: 640, strokeWidth: 0 })); await sleep(20);
      const el = D.querySelector(`.block[data-id="${b.id}"]`), box = el.getBoundingClientRect(), g = el.querySelector('svg :is(rect,ellipse,polygon)').getBoundingClientRect();
      const gap = [g.left - box.left, g.top - box.top, box.right - g.right, box.bottom - g.bottom].map(v => Math.round(v * 1280 / D.getElementById('stage').getBoundingClientRect().width));
      if (k === 'minus') assert(gap[1] > 100, 'el signo menos conserva su forma (no ocupa todo el alto)');
      else eq(gap.join(), '0,0,0,0', k + ': sin margen dentro de su caja');
    }
  });

  await test('combinar formas: unión, intersección, resta', async () => {
    reset(); const S = R.shapeops;
    R.blocks.addShape('rect'); const a = last(); Object.assign(a, { x: 100, y: 100, w: 200, h: 200, fill: '#ff0000' });
    R.blocks.addShape('ellipse'); const c = last(); Object.assign(c, { x: 200, y: 150, w: 200, h: 100 });
    R.store.setMulti([a.id, c.id]);
    const u = await S.mergeShapes('union', S.selectedShapesInOrder()); await sleep(10);
    assert(u && u.shape === 'custom', 'forma personalizada');
    eq([u.x, u.y, u.w, u.h].join(','), '100,100,300,200', 'caja de la unión: las formas ocupan su caja entera');
    eq(u.fill, '#ff0000', 'toma el aspecto de la primera');
    assert(!slide().blocks.some(b => b.id === a.id || b.id === c.id), 'originales sustituidas');
    assert(D.querySelector(`.block[data-id="${u.id}"] svg path[fill-rule="evenodd"]`), 'dibujada en el lienzo');
    R.store.undo(); await sleep(10);
    const a2 = slide().blocks.find(b => b.id === a.id), c2 = slide().blocks.find(b => b.id === c.id);
    assert(a2 && c2, 'deshacer recupera las originales');
    const i = await S.mergeShapes('intersection', [a2, c2]);
    eq(i.x + i.w, 300, 'intersección acotada al rectángulo (su borde, 300)');
    R.store.undo(); await sleep(10);
    const d = await S.mergeShapes('difference', [slide().blocks.find(b => b.id === a.id), slide().blocks.find(b => b.id === c.id)]);
    eq(d.rings.length, 1, 'resta: un contorno con mordisco'); eq(d.w, 200, 'misma anchura que el rectángulo');
    R.blocks.addShape('rect'); const far = last(); Object.assign(far, { x: 900, y: 500, w: 50, h: 50 });
    eq(await S.mergeShapes('intersection', [d, far]), null, 'sin solape → nada');
    const blob = await R.pptx.buildPptxBlob(); assert(blob.size > 1000, 'pptx con geometría personalizada');
  });

  await test('cámara en directo (Cameo) en el lienzo y en el export', async () => {
    reset(); D.querySelector('[data-action="insert-camera"]').click(); await sleep(10);
    const b = last(); eq(b.type, 'camera', 'objeto de cámara'); eq(b.shape, 'circle', 'redonda por defecto');
    const d = D.querySelector(`.block[data-id="${b.id}"] .camera-blk`);
    assert(d && d.style.borderRadius === '50%', 'marcador circular en el lienzo');
    const html = R.io.buildHTML();
    assert(/<video[^>]*data-camera autoplay muted playsinline/.test(html), 'vídeo de cámara en el export');
    assert(/getUserMedia\(\{ video: true/.test(html), 'pide la cámara al mostrar la diapositiva');
    assert(/data-camera-box style=[^>]*border-radius:50%/.test(html) && !/data-bg=/.test(html) && !/<canvas width/.test(html), 'sin efecto de fondo: solo el vídeo');
    slide().blocks = slide().blocks.filter(x => x.id !== b.id);
    assert(!/getUserMedia/.test(R.io.buildHTML()), 'sin cámara no se incluye el script');
  });

  await test('cámara en directo: filtros, brillo y fondo desde la cinta, el menú y el diálogo; y en el export', async () => {
    reset(); D.querySelector('[data-action="insert-camera"]').click(); await sleep(20);
    const id = last().id, cam = () => slide().blocks.find(x => x.id === id), W = frame.contentWindow;
    D.querySelector('[data-tab="ctx"]').click(); await sleep(40);
    const field = re => [...D.querySelectorAll('[data-page="ctx"] .ctx-field')].find(f => re.test(f.querySelector('span').textContent));
    const pick = async (re, v) => { const s = field(re).querySelector('select, input'); s.value = v; s.dispatchEvent(new W.Event('change')); await sleep(40); };
    await pick(/^Filtro$/, 'sepia'); eq(cam().filter, 'sepia', 'filtro desde la cinta');
    await pick(/^Brillo/, '120'); eq(cam().brightness, 120, 'brillo');
    await pick(/^Fondo$/, 'blur'); eq(cam().bg, 'blur', 'fondo desenfocado');
    const blk = D.querySelector(`.block[data-id="${id}"] .camera-blk`);
    assert(/Desenfocar fondo/.test(blk.textContent) && /Sepia/.test(blk.textContent), 'el marcador dice qué efecto tiene');
    let html = R.io.buildHTML();
    assert(/<div[^>]*data-camera-box data-bg="blur"/.test(html), 'el export marca el fondo a desenfocar');
    assert(/<video[^>]*data-camera autoplay muted playsinline data-ignore style="[^"]*filter:sepia\(\.8\) brightness\(1\.2\);transform:scaleX\(-1\)/.test(html), 'filtro, brillo y reflejo en el vídeo (y reveal.js no lo pausa)');
    assert(/<canvas width="260" height="260"/.test(html), 'un lienzo al tamaño de la cámara para dibujar sin fondo');
    assert(/revelaCameraRuntime\("https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@[\d.]+", "https:\/\/storage\.googleapis\.com\/[^"]+selfie_segmenter\.tflite"\)/.test(html), 'el segmentador: versión fija, cargado solo al mostrar la cámara');
    // Context menu: background straight away; the dialog for the rest.
    const menu = () => { D.querySelector(`.block[data-id="${id}"]`).dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: 980, clientY: 440 })); return [...D.querySelectorAll('#context-menu .ctx-item')]; };
    menu().find(x => x.textContent === 'Quitar el fondo').click(); await sleep(30);
    eq(cam().bg, 'remove', 'quitar el fondo desde el menú');
    assert(/data-bg="cut"[^>]*background:transparent/.test(R.io.buildHTML()), 'sin fondo: se ve la diapositiva detrás');
    menu().find(x => x.textContent === 'Filtros y fondo…').click(); await sleep(30);
    const m = D.getElementById('cam-modal'); assert(m, 'diálogo de filtros y fondo');
    m.querySelector('.cam-bg').value = 'color'; m.querySelector('.cam-bg').dispatchEvent(new W.Event('change')); await sleep(20);
    assert(!m.querySelector('.cam-color-l').hidden, 'con el color a elegir');
    m.querySelector('.cam-color').value = '#00ff00'; m.querySelector('.cam-color').dispatchEvent(new W.Event('input'));
    m.querySelector('.cam-filter').value = 'cool'; m.querySelector('.cam-filter').dispatchEvent(new W.Event('change')); await sleep(20);
    eq(JSON.stringify([cam().bg, cam().bgColor, cam().filter]), '["color","#00ff00","cool"]', 'color del fondo y filtro desde el diálogo');
    m.querySelector('.modal-close').click();
    html = R.io.buildHTML();
    assert(/data-bg="cut"[^>]*background:#00ff00/.test(html) && /<filter id="rv-cam-cool"/.test(html) && /filter:url\(#rv-cam-cool\)/.test(html), 'fondo de color; el tono frío, con su matriz de color');
    // Back to normal: nothing extra.
    const M = await W.eval("import('/src/features/live/media.js')");
    M.setCameraLook(id, { filter: '', bg: '', brightness: 100, bgColor: null }); await sleep(20);
    eq(JSON.stringify(['filter', 'bg', 'brightness', 'bgColor'].filter(k => k in cam())), '[]', 'sin efectos no se guarda nada');
    M.setCameraLook(id, { filter: 'nope', bg: 'nope' }); eq(cam().filter ?? cam().bg ?? null, null, 'valores desconocidos: se ignoran');
    eq(M.cameraFilterCSS({ filter: 'bw', brightness: 500 }), 'grayscale(1) contrast(1.1) brightness(2)', 'el brillo, acotado');
    eq(M.cameraBoxCSS({ shape: 'rect', bg: 'image', bgImage: "x'); color:red" }).includes("url('x%27%29;%20color:red')"), true, 'la imagen de fondo, sin salirse del CSS');
    D.querySelector('[data-tab="home"]').click();
  });

  await test('cámara en directo: el motor (vídeo, máscara de la persona, pausa y vuelta, sin segmentador)', async () => {
    const W = frame.contentWindow, C = await W.eval("import('/src/io/runtime/camera.js')"), M = await W.eval("import('/src/features/live/media.js')");
    const host = D.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:160px;height:120px';
    host.innerHTML = `<div data-camera-box data-bg="cut" style="position:relative;width:160px;height:120px">${M.cameraInnerHTML({ w: 160, h: 120, bg: 'remove', mirror: false })}</div>`;
    D.body.appendChild(host);
    const bx = host.firstElementChild, v = bx.querySelector('video'), c = bx.querySelector('canvas');
    eq(v.style.opacity, '0', 'el vídeo empieza invisible para no mostrar el fondo antes de segmentar');
    // A fake segmenter: the person is the left half.
    let calls = 0; const seg = { segmentForVideo() { calls++; const f = new Float32Array(8 * 6); for (let i = 0; i < f.length; i++) f[i] = i % 8 < 4 ? 1 : 0; return { confidenceMasks: [{ width: 8, height: 6, getAsFloat32Array: () => f }], close() {} }; } };
    const eng = C.createCameraEngine({ keep: true, load: () => seg });
    let eng2;
    try {
      await eng.show([bx]);
      for (let i = 0; i < 60 && !(calls && c.style.visibility === 'visible'); i++) await sleep(50);
      assert(v.srcObject && !v.paused, 'la cámara (falsa) en el vídeo');
      assert(calls > 0 && c.style.visibility === 'visible' && v.style.opacity === '0', 'dibuja en el lienzo con la máscara');
      const px = (x, y) => c.getContext('2d').getImageData(x, y, 1, 1).data[3];
      assert(px(20, 60) > 200 && px(140, 60) === 0, 'la persona se ve, el fondo es transparente');
      // Another slide, and back (the bug: the last frame stayed still).
      await eng.show([]); assert(v.paused, 'otra diapositiva: en pausa');
      const n = calls; await sleep(200); eq(calls, n, 'y sin procesar');
      await eng.show([bx]); await sleep(300);
      assert(!v.paused && calls > n, 'al volver: sigue en directo');
      v.pause(); await eng.show([bx]); assert(!v.paused, 'si algo la pausó, vuelve a reproducirse');
      // Without a segmenter (no network, no WebGL…): the plain video.
      eng2 = C.createCameraEngine({ keep: false, load: () => { throw new Error('x'); } });
      c.style.visibility = 'hidden'; v.style.opacity = '';
      await eng.show([]); await eng2.show([bx]); await sleep(100);
      assert(!v.paused && c.style.visibility === 'hidden' && v.style.opacity === '', 'sin segmentador: el vídeo tal cual');
      const tr = v.srcObject.getTracks()[0]; eng2.release();
      assert(!v.srcObject && tr.readyState === 'ended', 'al soltarla, la cámara se apaga');
    } finally { eng.release(); eng2?.release(); host.remove(); }
  });

  await test('cámara en directo: el segmentador de MediaPipe se carga y separa a la persona (la cámara falsa no tiene)', async () => {
    const W = frame.contentWindow, C = await W.eval("import('/src/io/runtime/camera.js')"), M = await W.eval("import('/src/features/live/media.js')"), V = await W.eval("import('/src/core/vendor.js')");
    const host = D.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:160px;height:120px';
    host.innerHTML = `<div data-camera-box data-bg="cut" style="position:relative;width:160px;height:120px">${M.cameraInnerHTML({ w: 160, h: 120, bg: 'remove' })}</div>`;
    D.body.appendChild(host);
    const bx = host.firstElementChild, c = bx.querySelector('canvas'), eng = C.createCameraEngine({ keep: true, vision: V.VISION, model: V.SELFIE_MODEL });
    try {
      await eng.show([bx]);
      for (let i = 0; i < 400 && c.style.visibility !== 'visible'; i++) await sleep(50);
      assert(c.style.visibility === 'visible', 'dibuja con el segmentador real');
      await sleep(200);
      const d = c.getContext('2d').getImageData(0, 0, 160, 120).data; let a = 0; for (let i = 3; i < d.length; i += 4) a += d[i];
      assert(a / (160 * 120) < 20, 'sin persona en la imagen: todo fondo, transparente (la máscara buena es la de la persona)');
    } finally { eng.release(); host.remove(); }
  });

  await test('cámara en directo en el editor: «Ver en directo» la enciende, y se apaga al dejar la diapositiva', async () => {
    reset(); D.querySelector('[data-action="insert-camera"]').click(); await sleep(20);
    const id = last().id, el = () => D.querySelector(`#stage .block[data-id="${id}"] .camera-blk`);
    D.querySelector('[data-tab="ctx"]').click(); await sleep(40);
    const liveBtn = () => [...D.querySelectorAll('[data-page="ctx"] button')].find(x => x.textContent.includes('Ver en directo'));
    assert(!el().querySelector('video'), 'sin pedir la cámara: un marcador');
    liveBtn().click();
    let v; for (let i = 0; i < 60 && !((v = el().querySelector('video')) && v.srcObject && !v.paused); i++) await sleep(50);
    assert(v && v.srcObject && !v.paused, 'la cámara en el lienzo');
    assert(liveBtn().classList.contains('on'), 'el botón, encendido');
    const tr = v.srcObject.getTracks()[0];
    const M = await frame.contentWindow.eval("import('/src/features/live/media.js')"); M.setCameraLook(id, { bg: 'blur' });
    await sleep(30);
    assert(el().querySelector('canvas[width="260"]'), 'con fondo desenfocado: su lienzo');
    R.store.commit(() => { slide().blocks.find(x => x.id === id).w = 300; }); await sleep(30);
    assert(el().querySelector('canvas[width="300"]'), 'al cambiar de tamaño, el lienzo también');
    R.slides.addSlide(); await sleep(60);
    eq(tr.readyState, 'ended', 'en otra diapositiva la cámara se apaga');
    R.store.undo(); await sleep(60);
    const cv = await frame.contentWindow.eval("import('/src/ui/canvas/cameraview.js')"); cv.setCameraLive(false); await sleep(30);
    assert(!el().querySelector('video'), 'apagada: otra vez el marcador');
    D.querySelector('[data-tab="home"]').click();
  });

  await test('cámara al presentar: al volver a su diapositiva sigue en directo', async () => {
    const d = R.model.emptyDeck(); R.store.replaceDeck(d);
    d.slides[0].blocks.push({ id: 'cm1', type: 'camera', shape: 'circle', mirror: true, x: 100, y: 100, w: 200, h: 200, rotation: 0, animation: null });
    d.slides.push({ ...JSON.parse(JSON.stringify(d.slides[0])), id: 'cam2', blocks: [] });
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:800px;visibility:hidden'; D.body.appendChild(f);
    try {
      f.srcdoc = R.io.buildHTML(d, { inApp: true });
      for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
      const W = f.contentWindow, v = f.contentDocument.querySelector('video[data-camera]');
      for (let i = 0; i < 60 && (v.paused || !v.srcObject); i++) await sleep(50);
      assert(v.srcObject && !v.paused, 'en directo en su diapositiva');
      W.Reveal.slide(1); await sleep(300); assert(v.paused, 'pausada en otra diapositiva');
      W.Reveal.slide(0); await sleep(300);
      const t0 = v.currentTime; await sleep(400);
      assert(!v.paused && v.currentTime > t0, 'al volver se sigue moviendo');
    } finally { f.remove(); }
  });

  await test('grabar con la cámara inserta un vídeo', async () => {
    reset(); const n0 = slide().blocks.length;
    D.querySelector('[data-action="record-camera"]').click();
    let bar; for (let i = 0; i < 40 && !(bar = D.getElementById('rec-bar')); i++) await sleep(50);
    assert(bar, 'barra de grabación (cámara falsa del navegador de pruebas)');
    await sleep(700);
    bar.querySelector('.rec-stop').click();
    // (The recording becomes a data: URL first: on a slow machine — the CI's — that takes a while.)
    for (let i = 0; i < 160 && slide().blocks.length === n0; i++) await sleep(50);
    const v = last(); eq(v.type, 'video', 'vídeo insertado');
    assert(/^data:video\//.test(v.src), 'vídeo dentro del proyecto (' + (v.src || '').slice(0, 20) + ')');
  });

  // ---- Videos and GIFs: segments per click, colour key, background removal ----------
  await test('vídeo con preguntas: se para en su segundo, pregunta y sigue; la IA las propone a partir de fotogramas', async () => {
    reset(); const W = frame.contentWindow, imp = m => W.eval(`import('${m}')`);
    const M = await imp('/src/features/live/media.js');
    eq(JSON.stringify(M.parseOptions('Roma\n*París\n\nLyon')), '{"options":["Roma","París","Lyon"],"correct":[1]}', 'opciones con * delante de la correcta');
    eq(M.optionsText({ options: ['a', 'b'], correct: [1] }), 'a\n*b', 'y de vuelta');
    const cq = M.cleanQuestions([{ at: 5, q: 'B', options: ['x', 'y'], correct: [3] }, { at: 1.234, q: 'A', options: ['s', 'n'], correct: [0] }, { at: 2, q: '' }]);
    eq(cq.map(x => x.q + '@' + x.at + ':' + x.correct.join()).join(' '), 'A@1.2:0 B@5:', 'ordenadas, con respuestas que existen, sin las vacías');
    // A real video, recorded here: 2.5 s of colours.
    const c = D.createElement('canvas'); c.width = 160; c.height = 90; const g = c.getContext('2d');
    const rec = new W.MediaRecorder(c.captureStream(30), { mimeType: 'video/webm' }), parts = [];
    rec.ondataavailable = e => parts.push(e.data); rec.start();
    for (let i = 0; i < 25; i++) { g.fillStyle = ['#c00', '#0a0', '#00c'][Math.floor(i / 9)]; g.fillRect(0, 0, 160, 90); await sleep(100); }
    rec.stop(); await new Promise(r => { rec.onstop = r; });
    const src = await new Promise(r => { const fr = new W.FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(new W.Blob(parts, { type: 'video/webm' })); });
    R.blocks.addVideo(src); await sleep(30); const b = last();
    M.setMediaPlayback(b.id, { questions: [{ at: 1, q: '¿De qué color era?', options: ['Azul', 'Rojo'], correct: [1], explain: 'Empezó en rojo.' }] });
    assert(M.needsPlayer(last()), 'con preguntas, el vídeo lleva reproductor');
    const html = R.io.buildHTML(); assert(/function askInVideo/.test(html) && /__rvVideoWords/.test(html) && /&quot;questions&quot;/.test(html), 'en el export: las preguntas y lo que las muestra');
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    f.srcdoc = R.io.buildHTML(R.state.deck, { inApp: true });
    try {
      let el; for (let i = 0; i < 100 && !((el = f.contentDocument?.getElementById('rvm-' + b.id))?._player); i++) await sleep(100);
      const p = el._player; await p.ready; f.contentWindow.Reveal.slide(R.state.ui.slideIndex); await sleep(100);
      p.play(0, null, 1); let box = null; for (let i = 0; i < 40 && !(box = el.querySelector('.rv-vq')); i++) await sleep(100);
      assert(box && /¿De qué color era\?/.test(box.textContent), 'en el segundo 1 se para y pregunta');
      assert(!p.playing() && p.time() >= 1 && p.time() < 1.6, 'el vídeo, parado: ' + p.time());
      const bs = [...box.querySelectorAll('button')]; bs[0].click();
      assert(/rgb\(251, 227, 225\)|#fbe3e1/.test(bs[0].style.background) && /rgb\(227, 244, 221\)|#e3f4dd/.test(bs[1].style.background), 'la elegida (mal) en rojo y la buena en verde');
      assert(/Empezó en rojo/.test(box.textContent), 'con la explicación');
      [...box.querySelectorAll('button')].at(-1).click(); await sleep(150);
      assert(!el.querySelector('.rv-vq') && p.playing(), 'Continuar: sigue el vídeo');
    } finally { f.remove(); }
    // The AI's proposal: frames with their second, the slide's words; what it says, cleaned.
    const V = await imp('/src/features/ai/videoquiz.js');
    const fr = await V.videoFrames(src, 3); assert(fr.duration > 2 && fr.duration < 3.5 && fr.frames.length === 3 && /^data:image\/jpeg/.test(fr.frames[0].url), 'tres fotogramas repartidos: ' + fr.duration);
    const AI = R.ai, realFetch = W.fetch; let sent = null; AI.setAiKey('sk-or-prueba');
    W.fetch = async (u, o) => { sent = JSON.parse(o.body); return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ questions: [{ at: 99, q: '¿Qué color sale al final?', options: ['Azul', 'Verde'], correct: [0], explain: 'x' }] }) } }] })); };
    try {
      const got = await V.proposeVideoQuestions(src, { context: 'Los colores primarios' });
      assert(sent.messages[1].content.filter(x => x.type === 'image_url').length === 8 && /colores primarios/.test(sent.messages[1].content[0].text), 'la IA ve fotogramas y la diapositiva');
      assert(got.length === 1 && got[0].at <= fr.duration, 'su pregunta, dentro del vídeo: ' + got[0]?.at);
    } finally { W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('GIF: tramos por clic, croma y quitar el fondo fotograma a fotograma', async () => {
    reset();
    const W = frame.contentWindow, imp = m => W.eval(`import('${m}')`);
    const { encodeGif, gifFrames, gifRemoveBackground } = await imp('/src/features/live/gifbg.js');
    // 4 frames of 8×8 (0.5 s each): left half green, right half red/blue/red/blue.
    const px = (i, x) => (x < 4 ? [0, 255, 0, 255] : i % 2 ? [0, 0, 255, 255] : [255, 0, 0, 255]);
    const frames = [0, 1, 2, 3].map(i => ({ delay: 500, rgba: new W.Uint8ClampedArray(Array.from({ length: 64 }, (_, k) => px(i, k % 8)).flat()) }));
    const src = await encodeGif({ width: 8, height: 8, frames });
    assert(/^data:image\/gif;base64,/.test(src), 'GIF generado');
    const dec = await gifFrames(src);
    eq(dec.frames.length, 4, 'se leen los 4 fotogramas'); eq(dec.frames[1].delay, 500, 'con su duración');
    eq([...dec.frames[1].rgba.slice(7 * 4, 7 * 4 + 3)].join(), '0,0,255', 'color del fotograma 2');
    // Background removal with a stand-in for the AI (green → transparent): keeps the animation.
    const clean = await gifRemoveBackground(src, { remove: c => { const x = c.getContext('2d'), d = x.getImageData(0, 0, 8, 8); for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 1] > 200 && d.data[i] < 50) d.data[i + 3] = 0; x.putImageData(d, 0, 0); return c; } });
    const out = await gifFrames(clean);
    eq(out.frames.length, 4, 'sigue animado');
    eq(out.frames[2].rgba[3], 0, 'la mitad verde queda transparente'); eq(out.frames[2].rgba[7 * 4 + 3], 255, 'la otra mitad no');

    // In the deck: two segments (0→1 s, 1→2 s) and red made transparent.
    R.blocks.addImage(clean); const b = last();
    const { isGif, needsPlayer, setMediaPlayback } = await imp('/src/features/live/media.js');
    assert(isGif(b) && !needsPlayer(b), 'un GIF sin ajustes se exporta como imagen');
    // (The second at 4×: what's between two parts that matter goes by quickly.)
    setMediaPlayback(b.id, { segments: [{ from: 0, to: 1 }, { from: 1, to: 2, speed: 4 }], key: { color: '#ff0000', tol: 0.1, soft: 0 }, loop: false });
    eq(JSON.stringify(last().segments), '[{"from":0,"to":1},{"from":1,"to":2,"speed":4}]', 'tramos guardados, con su velocidad'); assert(!('loop' in last()), 'lo desactivado no se guarda');
    await sleep(50);
    assert(D.querySelector(`.block[data-id="${b.id}"] .media-player canvas`), 'en el editor se ve con el croma');
    const html = R.io.buildHTML();
    eq((html.match(/class="fragment rv-seg"/g) || []).length, 2, 'un clic por tramo');
    assert(/data-media="\{&quot;kind&quot;:&quot;gif&quot;/.test(html) && /revelaMediaRuntime\(/.test(html), 'reproductor en el export');

    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    f.srcdoc = R.io.buildHTML(R.state.deck, { inApp: true });
    try {
      let el; for (let i = 0; i < 100 && !((el = f.contentDocument?.getElementById('rvm-' + b.id))?._player); i++) await sleep(100);
      const p = el._player; await p.ready;
      f.contentWindow.Reveal.slide(R.state.ui.slideIndex); await sleep(100);
      assert(!p.playing() && p.time() === 0, 'quieto al llegar');
      f.contentWindow.Reveal.next(); await sleep(150);
      assert(p.playing(), 'el clic reproduce el primer tramo');
      for (let i = 0; i < 30 && p.playing(); i++) await sleep(100);
      assert(!p.playing() && Math.abs(p.time() - 1) < 0.05, 'se para en el segundo 1: ' + p.time());
      const c = el.querySelector('canvas'), count = () => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const n = { red: 0, blue: 0 };
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { if (d[i] > 200) n.red++; if (d[i + 2] > 200) n.blue++; } return n; };
      eq(JSON.stringify(count()), '{"red":0,"blue":0}', 'en el segundo 1 (fotograma rojo) el croma quita el rojo');
      p.seek(0.6); await sleep(30);
      assert(count().blue > 0 && !count().red, 'en el 0,6 se ve el azul');
      const t0 = performance.now(); f.contentWindow.Reveal.next(); await sleep(50);
      assert(p.playing(), 'el siguiente clic, el segundo tramo');
      for (let i = 0; i < 60 && p.playing(); i++) await sleep(25);
      assert(Math.abs(p.time() - 2) < 0.05, 'se para en el segundo 2: ' + p.time());
      assert(performance.now() - t0 < 700, 'a 4×: un segundo de GIF en un cuarto: ' + Math.round(performance.now() - t0) + ' ms');
      f.contentWindow.Reveal.prev(); await sleep(100);
      assert(Math.abs(p.time() - 1) < 0.05, 'volver atrás deja el final del tramo anterior');
    } finally { f.remove(); }
  });

  await test('vídeo: empezar al acabar otro, y Reproducir, Pausar y Detener como animaciones', async () => {
    reset();
    const W = frame.contentWindow, imp = m => W.eval(`import('${m}')`);
    const { encodeGif } = await imp('/src/features/live/gifbg.js');
    const T = await imp('/src/features/animation/transitions.js');
    const gif = c => encodeGif({ width: 4, height: 4, frames: [0, 1, 2, 3].map(() => ({ delay: 150, rgba: new W.Uint8ClampedArray(Array.from({ length: 16 }, () => c).flat()) })) });
    R.blocks.addImage(await gif([255, 0, 0, 255])); const a = last();
    R.blocks.addImage(await gif([0, 0, 255, 255])); const b = last();
    R.blocks.addImage(await gif([0, 255, 0, 255])); const c = last();
    const { setMediaPlayback, needsPlayer } = await imp('/src/features/live/media.js');
    setMediaPlayback(a.id, { muted: true });                              // (the one that plays first: with a click)
    setMediaPlayback(b.id, { afterVideo: a.id });
    assert(needsPlayer(R.state.deck.slides[R.state.ui.slideIndex].blocks.find(x => x.id === b.id)), 'el que espera lo dibuja el reproductor');
    R.store.setSelection(c.id);
    for (const fx of ['media-play', 'media-pause', 'media-stop']) T.addAnimation(fx, { start: 'click' });
    eq(T.animsOf(last()).map(x => x.effect + ':' + x.start).join(), 'media-play:click,media-pause:click,media-stop:click', 'tres pasos, cada uno con su clic');
    assert(T.animsOf(last()).every(x => !T.isEntrance(x.effect)), 'no son entradas: se ve desde el principio');
    const html = R.io.buildHTML();
    eq((html.match(/class="fragment rv-seg"/g) || []).length, 1, 'solo el primero tiene su clic de siempre');
    assert(/&quot;after&quot;:&quot;/.test(html) && (html.match(/data-mfx="media-/g) || []).length === 3, 'en el export: a quién espera y los tres pasos');
    // Without the one it waits for, a click again.
    setMediaPlayback(a.id, {}); R.store.commit(() => { R.state.deck.slides[R.state.ui.slideIndex].blocks = R.state.deck.slides[R.state.ui.slideIndex].blocks.filter(x => x.id !== a.id); });
    eq((R.io.buildHTML().match(/class="fragment rv-seg"/g) || []).length, 1, 'si el otro ya no está, empieza con un clic');
    R.store.undo();
    // Nor when it would never start: the other one loops, or each one waits for the other.
    setMediaPlayback(a.id, { loop: true });
    eq((R.io.buildHTML().match(/class="fragment rv-seg"/g) || []).length, 2, 'si el otro va en bucle, empieza con un clic (y el otro, con el suyo)');
    setMediaPlayback(a.id, { loop: null, afterVideo: b.id });
    eq((R.io.buildHTML().match(/class="fragment rv-seg"/g) || []).length, 2, 'si se esperan el uno al otro, los dos con un clic');
    setMediaPlayback(a.id, { afterVideo: null });

    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    f.srcdoc = R.io.buildHTML(R.state.deck, { inApp: true });
    try {
      const get = async id => { let el; for (let i = 0; i < 100 && !((el = f.contentDocument?.getElementById('rvm-' + id))?._player); i++) await sleep(100); await el._player.ready; return el._player; };
      const pa = await get(a.id), pb = await get(b.id), pc = await get(c.id), RV = f.contentWindow.Reveal;
      RV.slide(R.state.ui.slideIndex); await sleep(100);
      assert(!pa.playing() && !pb.playing() && !pc.playing(), 'quietos al llegar');
      pa.play(0, null);
      for (let i = 0; i < 40 && pa.playing(); i++) await sleep(50);
      await sleep(50);
      assert(!pa.playing() && pb.playing(), 'al acabar el primero empieza el que lo espera');
      // The steps of the third one (its clicks: the first of the slide's is the first one's own click).
      const cl = async () => { RV.next(); await sleep(120); };
      for (let i = 0; i < 5 && !pc.playing(); i++) await cl();
      assert(pc.playing(), 'Reproducir');
      await cl(); assert(!pc.playing() && pc.time() > 0, 'Pausar: quieto donde estaba');
      await cl(); assert(!pc.playing() && pc.time() === 0, 'Detener: vuelve al principio');
    } finally { f.remove(); }
  });

  await test('GIF: las mismas opciones de reproducción que el vídeo en su cinta; uno normal, solo y en bucle', async () => {
    reset(); const W = frame.contentWindow, { encodeGif } = await W.eval("import('/src/features/live/gifbg.js')");
    R.blocks.addImage(await encodeGif({ width: 4, height: 4, frames: [0, 1].map(i => ({ delay: 100, rgba: new W.Uint8ClampedArray(Array.from({ length: 16 }, () => [i * 255, 0, 0, 255]).flat()) })) }));
    const b = last(); R.store.setSelection(b.id); R.render(); await sleep(40);
    const page = D.querySelector('#ribbon [data-page="ctx"]'), groups = [...page.querySelectorAll('.group > label, .group label:last-child')].map(x => x.textContent);
    assert(groups.some(g => /Reproducción/.test(g)) && groups.some(g => /Con un clic/.test(g)), 'sus grupos: ' + groups.join('|'));
    const sels = [...page.querySelectorAll('select')], start = sels.find(x => [...x.options].some(o => o.value === 'auto')), speed = sels.find(x => [...x.options].some(o => o.value === '2'));
    eq(start.value, 'auto', 'un GIF normal: empieza solo'); assert(!/Sin sonido/.test(page.textContent), 'sin «Sin sonido» (no tiene)');
    speed.value = '2'; speed.dispatchEvent(new W.Event('change', { bubbles: true })); await sleep(20);
    const g = last(); assert(g.speed === 2 && g.autoplay && g.loop, 'a 2×, y sigue solo y en bucle: ' + JSON.stringify({ speed: g.speed, autoplay: g.autoplay, loop: g.loop }));
  });

  await test('vídeo: opciones de reproducción en el export y en el diálogo', async () => {
    reset();
    R.blocks.addVideo('data:video/mp4;base64,AAAA'); const v = last();
    assert(/<video[^>]*controls/.test(R.io.buildHTML()), 'sin ajustes, el vídeo con controles de siempre');
    const { openMediaPlayback } = await frame.contentWindow.eval("import('/src/ui/dialogs/media.js')");
    openMediaPlayback(v); await sleep(20);
    const q = x => D.querySelector('#mp-modal ' + x);
    q('.mp-auto').checked = true; q('.mp-muted').checked = true;
    q('.mp-add').click(); q('.mp-add').click();
    const ins = D.querySelectorAll('#mp-modal .mp-seg input');
    eq(ins.length, 4, 'dos tramos con desde/hasta');
    const set = (i, val) => { ins[i].value = val; ins[i].dispatchEvent(new frame.contentWindow.Event('input', { bubbles: true })); };
    set(0, '0'); set(1, '3.5'); set(2, '3.5'); set(3, '8');
    q('.mp-key').checked = true; q('.mp-kc').value = '#00ff00'; q('.mp-key').dispatchEvent(new frame.contentWindow.Event('input'));
    // The stand-in file is no real video: the dialog says so (and still saves the settings).
    let ok; for (let i = 0; i < 40 && !(ok = D.querySelector('.dlg-ok')); i++) await sleep(50);
    assert(ok && /No se pudo abrir/.test(D.querySelector('.dlg-msg').textContent), 'avisa si no puede abrir el vídeo'); ok.click();
    q('.mp-ok').click(); await sleep(20);
    const b = last();
    assert(b.autoplay && b.muted && !b.loop, 'automático y sin sonido');
    eq(JSON.stringify(b.segments), '[{"from":0,"to":3.5},{"from":3.5,"to":8}]', 'tramos');
    eq(b.key.color, '#00ff00', 'croma verde');
    const html = R.io.buildHTML();
    eq((html.match(/class="fragment rv-seg"/g) || []).length, 1, 'automático: el primer tramo al llegar, el segundo con un clic');
    assert(/&quot;muted&quot;:true/.test(html) && !/<video[^>]*controls/.test(html), 'lo dibuja el reproductor');
    R.store.undo(); assert(!last().segments, 'se deshace de una vez');
  });

  await test('3D que anda: una animación mientras se mueve, mirando hacia donde va, y otra al llegar', async () => {
    reset(); const W = frame.contentWindow;
    const M = await W.eval("import('/src/features/content/model3d.js')");
    const b = { id: 'm1', type: 'model', src: 'x.glb', clip: 'Survey', walk: { clip: 'Walk', end: 'Wave', endOnce: true, face: true, look: true } };
    const attrs = Object.fromEntries(M.modelAttrs(b));
    assert(attrs['data-move-clip'] === 'Walk' && attrs['data-end-clip'] === 'Wave' && 'data-end-once' in attrs && 'data-face' in attrs, 'atributos de andar');
    assert(!('auto-rotate' in attrs), 'andando no gira solo (miraría a cualquier lado)');
    // Without a rest clip it waits still, on the first frame of walking.
    const still = Object.fromEntries(M.modelAttrs({ ...b, clip: null }));
    assert(!('autoplay' in still) && still['animation-name'] === 'Walk', 'sin reposo: quieto hasta moverse');
    // The runtime with a stand-in viewer: it moves right by CSS, as in the presentation.
    const RT = await W.eval("import('/src/io/runtime/model3d.js')");
    const rt = RT.model3dRuntime(), mv = D.createElement('model-viewer'), log = [];
    for (const [k, v] of M.modelAttrs(b)) mv.setAttribute(k, v);
    let orbit = '', name = '';
    Object.defineProperties(mv, { availableAnimations: { value: ['Survey', 'Walk', 'Wave'] }, animationName: { get: () => name, set: v => { name = v; } },
      cameraOrbit: { get: () => orbit, set: v => { orbit = v; } },
      play: { value: o => { const e = name + (o ? ' una vez' : ''); if (log.at(-1) !== e) log.push(e); } }, pause: { value: () => log.push('pausa') } });
    // (A movement long enough that a slow machine still sees it walking; its end, waited for, not guessed.)
    mv.style.cssText = 'position:fixed;left:0;top:0;width:10px;height:10px;transition-duration:1500ms';
    D.body.appendChild(mv);
    try {
      mv.animate([{ translate: '0px 0px' }, { translate: '300px 0px' }], { duration: 1500 });
      mv.dispatchEvent(new W.TransitionEvent('transitionstart', { propertyName: 'translate', bubbles: true }));
      mv.dispatchEvent(new W.TransitionEvent('transitionstart', { propertyName: 'opacity', bubbles: true }));
      for (let i = 0; i < 20 && !(log.length && /^-90(\.0)?deg/.test(mv.cameraOrbit)); i++) await sleep(50);   // (as soon as it's turned: a slow machine takes longer)
      eq(log.join(), 'Walk', 'anda mientras se mueve (una vez, aunque empiecen varias propiedades)');
      assert(/^-90(\.0)?deg/.test(mv.cameraOrbit), 'hacia la derecha: se ve de perfil mirando a la derecha');
      for (let i = 0; i < 100 && log.length < 2; i++) await sleep(50);
      eq(log.join(), 'Walk,Wave una vez', 'al llegar, la otra animación');
      assert(/^0(\.0)?deg/.test(mv.cameraOrbit), 'y mira al público');
      mv.dispatchEvent(new W.Event('finished')); await sleep(20); eq(log.at(-1), 'Survey', 'y vuelve al reposo');
      // Moving up the slide it shows its back; with a curved path (keyframes) too.
      log.length = 0; mv.style.animationDuration = '300ms';
      mv.animate([{ translate: '0px 0px' }, { translate: '0px -200px' }], { duration: 300 });
      mv.dispatchEvent(new W.AnimationEvent('animationstart', { animationName: 'rvPm1', bubbles: true }));
      for (let i = 0; i < 20 && !/^-?180(\.0)?deg/.test(mv.cameraOrbit); i++) await sleep(50);
      assert(/^-?180(\.0)?deg/.test(mv.cameraOrbit) && log[0] === 'Walk', 'hacia arriba: de espaldas');
      await sleep(300);
    } finally { mv.remove(); }
    // In the presentation: the attributes and the runtime go with it.
    R.state.deck.slides[0].blocks.push({ ...b, x: 100, y: 100, w: 300, h: 300, rotation: 0, animation: { effect: 'path', order: 1, start: 'click', duration: 3000, delay: 0, dx: 480, dy: 0 } });
    const html = R.io.buildHTML();
    assert(/<model-viewer[^>]*data-move-clip="Walk"/.test(html) && /function move\(mv, dur, el\)/.test(html), 'la presentación lo lleva');
    R.state.deck.slides[0].blocks.at(-1).caption = 'Zorro';
    assert(/<div class="fragment rv-path" data-fragment-index="1" [^>]*--dx:480px[^>]*><span class="caption"/.test(R.io.buildHTML()), 'su pie de foto se mueve con él');
  });

  // "Controlar con la cámara": a person seen by the camera (MediaPipe's 33 pose
  // landmarks, made up here: x right in the picture, y down, z away from it).
  const person = ({ armL = 'down', armR = 'down', headYaw = 0, lean = 0, hide = [] } = {}) => {
    const P = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0.1 }));
    const set = (i, x, y, z) => { P[i] = { x, y, z, visibility: hide.includes(i) ? 0.1 : 0.99 }; };
    set(11, 0.18, -0.5 - Math.sin(lean) * 0.18, 0); set(12, -0.18, -0.5 + Math.sin(lean) * 0.18, 0);   // (its left shoulder: right of the picture)
    set(23, 0.1, 0, 0); set(24, -0.1, 0, 0);
    const arm = (s, e, w, side, how) => { const d = { down: [0, 1, 0], up: [0, -1, 0], side: [side, 0, 0] }[how], o = P[s];
      set(e, o.x + d[0] * 0.28, o.y + d[1] * 0.28, o.z); set(w, o.x + d[0] * 0.53, o.y + d[1] * 0.53, o.z); };
    arm(11, 13, 15, 1, armL); arm(12, 14, 16, -1, armR);
    const c = Math.cos(headYaw), s = Math.sin(headYaw);   // (turning to its left: the nose towards +x)
    const head = { 0: [0, 0.02, -0.1], 2: [0.03, -0.02, -0.08], 5: [-0.03, -0.02, -0.08], 7: [0.075, 0, 0], 8: [-0.075, 0, 0], 9: [0.025, 0.06, -0.08], 10: [-0.025, 0.06, -0.08] };
    for (const [i, [x, y, z]] of Object.entries(head)) set(+i, x * c - z * s, -0.64 + y, x * s + z * c);
    return P;
  };
  const near = (v, w, m) => assert(v && w.every((x, i) => Math.abs(v[i] - x) < 0.05), `${m} (esperaba ${JSON.stringify(w)}, obtuvo ${JSON.stringify(v && v.map(x => +x.toFixed(2)))})`);

  await test('cámara que mueve un 3D: reconoce los huesos por su nombre (robot, Mixamo, VRM, KayKit, esqueleto automático)', async () => {
    const P = await frame.contentWindow.eval("import('/src/io/runtime/puppet.js')"), A = await frame.contentWindow.eval("import('/src/features/content/autorig.js')");
    const roles = names => Object.fromEntries(Object.entries(P.puppetBones(names)).map(([k, i]) => [k, names[i]]));
    // The templates' robot, as three.js names it (it drops the dots of "UpperArm.L").
    const robot = roles(['Bone', 'FootL', 'Body', 'Hips', 'Abdomen', 'Torso', 'Neck', 'Head', 'ShoulderL', 'UpperArmL', 'LowerArmL', 'Palm2L', 'ShoulderR', 'UpperArmR', 'LowerArmR', 'UpperLegL']);
    eq(JSON.stringify(robot), JSON.stringify({ hips: 'Hips', spine: 'Abdomen', chest: 'Torso', neck: 'Neck', head: 'Head', upperArmL: 'UpperArmL', lowerArmL: 'LowerArmL', upperArmR: 'UpperArmR', lowerArmR: 'LowerArmR' }), 'el robot');
    const mixamo = roles(['mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:Spine1', 'mixamorig:Spine2', 'mixamorig:Neck', 'mixamorig:Head', 'mixamorig:HeadTop_End', 'mixamorig:LeftShoulder', 'mixamorig:LeftArm', 'mixamorig:LeftForeArm', 'mixamorig:LeftHand', 'mixamorig:LeftHandIndex1', 'mixamorig:RightArm', 'mixamorig:RightForeArm', 'mixamorig:RightHand', 'mixamorig:LeftUpLeg']);
    assert(mixamo.upperArmL === 'mixamorig:LeftArm' && mixamo.lowerArmL === 'mixamorig:LeftForeArm' && mixamo.handL === 'mixamorig:LeftHand' && mixamo.upperArmR === 'mixamorig:RightArm', 'Mixamo: los brazos (no el hombro ni los dedos)');
    assert(mixamo.head === 'mixamorig:Head' && mixamo.chest === 'mixamorig:Spine2' && mixamo.spine === 'mixamorig:Spine', 'Mixamo: cabeza (no su punta), pecho y espalda');
    eq(roles(['mixamorigLeftForeArm']).lowerArmL, 'mixamorigLeftForeArm', 'Mixamo, como lo deja three.js');
    const vrm = roles(['J_Bip_C_Hips', 'J_Bip_C_Spine', 'J_Bip_C_Chest', 'J_Bip_C_Neck', 'J_Bip_C_Head', 'J_Bip_L_UpperArm', 'J_Bip_L_LowerArm', 'J_Bip_R_UpperArm', 'J_Bip_R_LowerArm']);
    assert(vrm.upperArmL === 'J_Bip_L_UpperArm' && vrm.lowerArmR === 'J_Bip_R_LowerArm' && vrm.head === 'J_Bip_C_Head', 'VRM');
    eq(roles(['leftUpperArm', 'rightLowerArm']).upperArmL, 'leftUpperArm', 'nombres humanoides (VRM 1)');
    const kay = roles(['hips', 'spine', 'chest', 'upperarml', 'lowerarml', 'wristl', 'handl', 'handslotl', 'upperarmr', 'lowerarmr', 'head', 'upperlegl', 'elbowIKl']);
    assert(kay.upperArmL === 'upperarml' && kay.lowerArmR === 'lowerarmr' && kay.handL === 'wristl' && kay.head === 'head', 'KayKit ("upperarm.l" sin el punto)');
    const auto = roles(A.SKELETONS.person.map(([n]) => n));
    assert(auto.upperArmL === 'armL' && auto.lowerArmL === 'forearmL' && auto.handR === 'handR' && auto.head === 'head' && auto.chest === 'chest', 'el esqueleto automático de Revela');
    eq(Object.keys(roles(A.SKELETONS.animal.map(([n]) => n))).filter(k => /Arm/.test(k)).length, 0, 'un animal no tiene brazos (solo cabeza)');
    eq(Object.keys(roles(['Cube', 'Leg.L', 'Armature'])).length, 0, 'nada reconocible: el modelo entero');
    assert(P.puppetMorph('jawOpen') === 'jaw' && P.puppetMorph('mouth_open') === 'jaw' && P.puppetMorph('eyeBlinkLeft') === 'blink' && P.puppetMorph('Surprised') === null, 'gestos de la cara');
  });

  await test('cámara que mueve un 3D: de los puntos del cuerpo a los giros (brazo arriba, cabeza a un lado y al otro, espejo)', async () => {
    const P = await frame.contentWindow.eval("import('/src/io/runtime/puppet.js')");
    const solve = (o, mirror) => P.puppetSolve({ world: person(o) }, null, { mirror });
    const rest = solve({}, false);
    near(rest.arms.L.upper, [0, -1, 0], 'brazos abajo'); near([rest.head.yaw, rest.head.pitch, rest.head.roll], [0, 0, 0], 'cabeza de frente'); assert(rest.seen, 'te ve');
    near(solve({ armL: 'up' }, false).arms.L.upper, [0, 1, 0], 'sin espejo: tu brazo izquierdo arriba, su brazo izquierdo arriba');
    near(solve({ armL: 'up' }, false).arms.R.upper, [0, -1, 0], 'y el otro, abajo');
    near(solve({ armL: 'up' }, true).arms.R.upper, [0, 1, 0], 'con espejo: el del mismo lado de la pantalla (su derecho)');
    near(solve({ armL: 'side' }, false).arms.L.lower, [1, 0, 0], 'en cruz: hacia su izquierda');
    near(solve({ armL: 'side' }, true).arms.R.lower, [-1, 0, 0], 'en cruz con espejo: hacia su derecha');
    const left = solve({ headYaw: 0.5 }, false).head, right = solve({ headYaw: -0.5 }, false).head;
    assert(Math.abs(left.yaw - 0.5) < 0.05 && Math.abs(right.yaw + 0.5) < 0.05, 'la cabeza gira a su izquierda y a su derecha: ' + left.yaw.toFixed(2) + ' ' + right.yaw.toFixed(2));
    assert(Math.abs(solve({ headYaw: 0.5 }, true).head.yaw + 0.5) < 0.05, 'con espejo, al otro lado');
    assert(Math.abs(solve({ headYaw: 2.5 }, false).head.yaw) <= 1.2 + 1e-9, 'limitado a lo posible');
    assert(solve({ lean: 0.3 }, false).torso.roll > 0.2, 'te inclinas: se inclina');
    eq(solve({ hide: [13, 15] }, false).arms.L, null, 'un brazo que no se ve: no se mueve (vuelve a su animación)');
    eq(P.puppetSolve(null, null, {}).seen, false, 'sin nadie: nada');
    // The face (more precise for the head): eye corners and chin to forehead, in the picture.
    const F = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 })), turn = a => {
      const pt = (x, y, z) => ({ x: 0.5 + x * Math.cos(a) - z * Math.sin(a), y: 0.5 + y, z: x * Math.sin(a) + z * Math.cos(a) });
      F[33] = pt(-0.05, 0, 0); F[263] = pt(0.05, 0, 0); F[10] = pt(0, -0.1, 0); F[152] = pt(0, 0.1, 0); return F;
    };
    const fy = P.puppetSolve(null, { points: turn(0.4), shapes: { jawOpen: 0.5 } }, { mirror: false });
    assert(fy.seen && Math.abs(fy.head.yaw - 0.4) < 0.05 && fy.jaw > 0.5, 'con la cara: el giro y la boca');
  });

  await test('cámara que mueve un 3D: la presentación lleva el motor solo si hace falta (y una sola cámara con Cameo)', async () => {
    reset(); const d = R.state.deck;
    const m = { id: 'pm1', type: 'model', src: 'data:model/gltf-binary;base64,AAAA', x: 100, y: 100, w: 300, h: 300, rotation: 0, animation: null };
    d.slides[0].blocks.push(m);
    let html = R.io.buildHTML();
    assert(!/function createPuppet/.test(html) && !/data-puppet/.test(html) && !/pose_landmarker/.test(html), 'sin «Controlar con la cámara»: nada de esto');
    m.puppet = { mode: 'head', mirror: false, preview: true };
    html = R.io.buildHTML();
    assert(/<model-viewer[^>]*data-puppet="head" data-puppet-mirror="0" data-puppet-preview/.test(html), 'el modelo lleva sus opciones');
    assert(/revelaPuppetRuntime\("https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@[\d.]+", "https:\/\/storage\.googleapis\.com\/[^"]+pose_landmarker_lite\.task", "https:\/\/storage\.googleapis\.com\/[^"]+face_landmarker\.task"\)/.test(html), 'el seguimiento: versiones fijas');
    eq((html.match(/function createCameraEngine/g) || []).length, 1, 'el motor de la cámara, una vez');
    d.slides[0].blocks.push({ id: 'cm1', type: 'camera', shape: 'circle', x: 0, y: 0, w: 100, h: 100, rotation: 0, animation: null });
    html = R.io.buildHTML();
    eq((html.match(/function createCameraEngine/g) || []).length, 1, 'con Cameo también: una sola cámara para los dos');
    assert(html.indexOf('revelaCameraRuntime(') < html.indexOf('revelaPuppetRuntime('), 'Cameo primero (la cámara compartida)');
    // The page runs (no syntax errors in what's embedded) and, while no slide with such a model is shown, asks for nothing.
    m.puppet = null; d.slides.push({ ...JSON.parse(JSON.stringify(d.slides[0])), id: 'pz2', blocks: [{ ...m, id: 'pm2', puppet: { mode: 'body' } }] });
    d.slides[0].blocks = d.slides[0].blocks.filter(b => b.type !== 'camera');
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:500px;visibility:hidden'; D.body.appendChild(f);
    try {
      let asked = 0;
      f.srcdoc = R.io.buildHTML(d, { inApp: true });
      for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) { await sleep(100); const md = f.contentWindow.navigator?.mediaDevices; if (md && !md.__w) { md.__w = 1; const g = md.getUserMedia.bind(md); md.getUserMedia = c => { asked++; return g(c); }; } }
      const W = f.contentWindow;
      assert(typeof W.revelaPuppetRuntime === 'function' && typeof W.puppetSolve === 'function' && W.__rvCam, 'el motor está en la página');
      await sleep(200); eq(asked, 0, 'en una diapositiva sin él, no pide la cámara');
    } finally { f.remove(); }
  });

  await test('cámara que mueve un 3D: «Controlar con la cámara» en su pestaña y en su menú, con sus opciones', async () => {
    reset(); const W = frame.contentWindow, page = () => D.querySelector('#ribbon [data-page="ctx"]');
    const m = { id: 'pm3', type: 'model', src: 'data:model/gltf-binary;base64,AAAA', x: 10, y: 10, w: 200, h: 200, rotation: 0, animation: null };
    R.store.commit(() => { slide().blocks.push(m); R.state.ui.selection = 'pm3'; R.state.ui.multi = ['pm3']; }); await sleep(20);
    D.querySelector('[data-tab="ctx"]').click(); await sleep(20);
    const b = () => slide().blocks.find(x => x.id === 'pm3'), btn = k => page().querySelector(`[data-ctx="${k}"]`);
    assert(btn('puppet') && !btn('puppet').classList.contains('on') && !btn('puppet-mirror'), 'apagado: solo el interruptor (y Probar)');
    assert(btn('puppet-try'), 'y «Probar con la cámara»');
    btn('puppet').click(); await sleep(20);
    eq(JSON.stringify(b().puppet), JSON.stringify({ mode: 'body', mirror: true, preview: false }), 'encendido: todo el cuerpo, como un espejo');
    assert(btn('puppet').classList.contains('on') && btn('puppet-mirror').classList.contains('on'), 'los botones lo muestran');
    btn('puppet-mirror').click(); await sleep(20); eq(b().puppet.mirror, false, 'sin espejo');
    btn('puppet-preview').click(); await sleep(20); eq(b().puppet.preview, true, 'tu vídeo en pequeño');
    const sel = [...page().querySelectorAll('select')].find(x => [...x.options].some(o => o.value === 'head'));
    sel.value = 'head'; sel.dispatchEvent(new W.Event('change')); await sleep(20); eq(b().puppet.mode, 'head', 'solo la cabeza');
    const labels = [...page().querySelectorAll('.group > label')].map(l => l.textContent);
    assert(labels.includes('Con la cámara'), 'su grupo: ' + labels.join(', '));
    const M = await W.eval("import('/src/features/content/model3d.js')");
    eq(M.modelBleed(b()), 1.5, 'con margen para los brazos levantados');
    eq(D.querySelector(`#stage .block[data-id="pm3"] model-viewer`).getAttribute('data-puppet'), 'head', 'el modelo del lienzo lo lleva');
    // The right-click menu: off again.
    const el = D.querySelector('#stage .block[data-id="pm3"]'), r = el.getBoundingClientRect();
    el.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: r.left + 20, clientY: r.top + 20 })); await sleep(20);
    const item = [...D.querySelectorAll('.ctx-item')].find(x => x.textContent === 'Dejar de controlar con la cámara');
    assert(item && [...D.querySelectorAll('.ctx-item')].some(x => x.textContent === 'Probar con la cámara'), 'en el menú contextual');
    item.click(); await sleep(20);
    assert(!b().puppet && !D.querySelector(`#stage .block[data-id="pm3"] model-viewer`).hasAttribute('data-puppet'), 'apagado desde el menú');
    R.store.undo(); await sleep(20); assert(b().puppet, 'se deshace');
    D.querySelector('[data-tab="home"]').click();
  });

  await test('cámara que mueve un 3D: el robot de las plantillas levanta los brazos y gira la cabeza; sin nadie, vuelve a su animación', async () => {
    const W = frame.contentWindow, V = await W.eval("import('/src/core/vendor.js')"), P = await W.eval("import('/src/io/runtime/puppet.js')");
    const K = await W.eval("import('/src/features/content/templates/kit.js')");
    await V.loadScript(V.MODEL_VIEWER);
    const mv = D.createElement('model-viewer');
    mv.setAttribute('src', K.lib3d('three-RobotExpressive').src); mv.setAttribute('autoplay', ''); mv.setAttribute('animation-name', 'Idle'); mv.setAttribute('auto-rotate', '');
    mv.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:300px';
    D.body.appendChild(mv);
    let who = person({ armL: 'up', armR: 'up', headYaw: 0.6 });
    const pp = P.createPuppet({ track: () => ({ pose: who && { world: who }, face: null }) });
    try {
      for (let i = 0; i < 1200 && !mv.loaded; i++) await sleep(50);   // (from the internet: up to a minute on a slow runner)
      assert(mv.loaded, 'el robot se carga');
      const sc = mv[Object.getOwnPropertySymbols(mv).find(s => s.description === 'scene')], root = sc.model;
      const bone = n => { let x = null; root.traverse(o => { if (o.isBone && o.name === n) x = o; }); return x; };
      const dirUp = (a, b) => { const p = bone(a).getWorldPosition(bone(a).position.clone()), q = bone(b).getWorldPosition(bone(b).position.clone()); return (q.y - p.y) / q.distanceTo(p); };
      const idleUp = dirUp('UpperArmL', 'LowerArmL');
      pp.show([{ mv, mode: 'body', mirror: true }]);
      for (let i = 0; i < 60 && pp.weight(mv) < 0.97; i++) await sleep(50);
      eq(pp.kind(mv), 'body', 'reconoce su esqueleto: todo el cuerpo');
      assert(mv.autoRotate === false, 'mientras te sigue, no gira solo');
      await sleep(100);
      assert(dirUp('UpperArmL', 'LowerArmL') > 0.9 && dirUp('UpperArmR', 'LowerArmR') > 0.9, 'los dos brazos, arriba: ' + dirUp('UpperArmL', 'LowerArmL').toFixed(2));
      assert(idleUp < 0, 'en reposo los tenía abajo');
      // The head: its forward (where its +z looks, in the model's frame) towards the side.
      const fwd = () => { const h = bone('Head'), q = h.getWorldQuaternion(h.quaternion.clone()), r = root.getWorldQuaternion(h.quaternion.clone()).invert(); const v = h.position.clone().set(0, 0, 1).applyQuaternion(r.multiply(q)); return Math.atan2(v.x, v.z); };
      const turned = fwd();
      who = person({ armL: 'up', armR: 'up', headYaw: -0.6 }); await sleep(700);
      assert(Math.abs(turned - fwd()) > 0.8, `la cabeza gira con la tuya (${turned.toFixed(2)} → ${fwd().toFixed(2)})`);
      // Nobody: back to its own animation.
      who = null;
      for (let i = 0; i < 60 && pp.weight(mv) > 0.03; i++) await sleep(50);
      await sleep(100);
      assert(dirUp('UpperArmL', 'LowerArmL') < 0, 'sin nadie delante, vuelve a su animación');
      pp.stop();
      assert(mv.autoRotate === true && !Object.prototype.hasOwnProperty.call(sc, 'updateAnimation'), 'al parar, todo como estaba');
    } finally { pp.stop(); mv.remove(); }
  });

  await test('cámara que mueve un 3D: una sola cámara compartida con Cameo, que se apaga cuando nadie la usa', async () => {
    const C = await frame.contentWindow.eval("import('/src/io/runtime/camera.js')");
    const eng = C.createCameraEngine({ keep: false });
    try {
      const s = await eng.hold(); assert(s && s.getTracks()[0].readyState === 'live', 'quien la pide la tiene');
      const s2 = await eng.hold(); assert(s2 === s, 'la misma para los dos');
      await eng.show([]); assert(s.getTracks()[0].readyState === 'live', 'Cameo no la apaga mientras otro la usa');
      eng.drop(); assert(s.getTracks()[0].readyState === 'live', 'aún la usa uno');
      eng.drop(); eq(s.getTracks()[0].readyState, 'ended', 'nadie: se apaga');
    } finally { eng.release(); }
  });

  await test('cámara que mueve un 3D: «Probar» en el editor (panel, y la cámara se suelta al detener o al cambiar de diapositiva)', async () => {
    reset();
    const m = { id: 'pm4', type: 'model', src: 'data:model/gltf-binary;base64,AAAA', x: 10, y: 10, w: 200, h: 200, rotation: 0, animation: null, puppet: { mode: 'body', mirror: true } };
    R.store.commit(() => { slide().blocks.push(m); R.state.ui.selection = 'pm4'; R.state.ui.multi = ['pm4']; }); await sleep(20);
    const PV = await frame.contentWindow.eval("import('/src/ui/canvas/puppetview.js')");
    const panel = () => D.getElementById('puppet-panel'), video = () => panel()?.querySelector('video');
    PV.tryPuppet(slide().blocks.find(x => x.id === 'pm4'));
    assert(panel() && /cámara/.test(panel().textContent), 'el panel, diciendo lo que pasa');
    assert(/no sale de tu equipo/.test(panel().textContent), 'y que la imagen no sale del navegador');
    for (let i = 0; i < 60 && !video()?.srcObject; i++) await sleep(50);
    const tr = video().srcObject.getTracks()[0]; eq(tr.readyState, 'live', 'tu vídeo, en el panel');
    eq(PV.puppetTrying(), 'pm4', 'probando');
    D.querySelector('#puppet-panel .pp-stop').click(); await sleep(20);
    assert(!panel() && tr.readyState === 'ended' && !PV.puppetTrying(), 'Detener: la cámara se apaga');
    PV.tryPuppet(slide().blocks.find(x => x.id === 'pm4'));
    for (let i = 0; i < 60 && !video()?.srcObject; i++) await sleep(50);
    const tr2 = video().srcObject.getTracks()[0];
    R.slides.addSlide(); await sleep(60);
    assert(!panel() && tr2.readyState === 'ended', 'en otra diapositiva se para y la suelta');
  });

  await test('pestaña del objeto seleccionado (como PowerPoint): aparece al seleccionar, con sus opciones', async () => {
    reset(); const W = frame.contentWindow;
    const tab = () => D.querySelector('#ribbon [data-tab="ctx"]'), page = () => D.querySelector('#ribbon [data-page="ctx"]');
    R.store.commit(() => { R.state.ui.selection = null; R.state.ui.multi = []; }, { history: false }); await sleep(10);
    assert(!tab() || tab().hidden, 'sin selección no está');
    R.blocks.addShape('ellipse'); await sleep(20);
    assert(!tab().hidden && tab().textContent === 'Forma', 'al insertar una forma aparece su pestaña');
    eq(R.state.ui.activeTab, 'ctx', 'y se abre sola, como en PowerPoint');
    const fill = page().querySelector('input[type=color]'); fill.value = '#ff0000'; fill.dispatchEvent(new W.Event('change')); await sleep(10);
    eq(last().fill, '#ff0000', 'el relleno se cambia desde la pestaña');
    const shapeSel = [...page().querySelectorAll('select')].find(x => [...x.options].some(o => o.value === 'star'));
    shapeSel.value = 'star'; shapeSel.dispatchEvent(new W.Event('change')); await sleep(10); eq(last().shape, 'star', 'cambiar de forma'); const shapeId = last().id;
    const h0 = page().offsetHeight;
    // Another one inserted where the first is goes a little lower and to the right.
    R.blocks.addShape('ellipse'); await sleep(20);
    const [s1, s2] = slide().blocks.filter(x => x.type === 'shape').slice(-2);
    assert(s2.x === s1.x + 24 && s2.y === s1.y + 24, 'no queda justo encima de la anterior');
    // A chart: its type, colour, grid and data labels, without opening the data.
    R.blocks.addChart(); await sleep(20);
    eq(tab().textContent, 'Gráfico', 'gráfico');
    const kind = [...page().querySelectorAll('select')].find(x => [...x.options].some(o => o.value === 'doughnut'));
    kind.value = 'pie'; kind.dispatchEvent(new W.Event('change')); await sleep(10); eq(last().chartType, 'pie', 'tipo de gráfico desde la pestaña');
    [...page().querySelectorAll('button')].find(x => x.querySelector('span')?.textContent === 'Etiquetas de datos').click(); await sleep(10);
    assert(last().dataLabels, 'etiquetas de datos');
    eq(page().offsetHeight, h0, 'la cinta no cambia de alto entre objetos (el lienzo no salta)');
    for (const tb of D.querySelectorAll('#ribbon .tabs [data-tab]:not([hidden])')) {
      tb.click(); await sleep(5); eq(D.querySelector('#ribbon .ribbon-page.active').offsetHeight, h0, 'ni entre pestañas: ' + tb.dataset.tab);
    }
    const dir = D.querySelector('[data-slide-trans-dir]');
    assert(dir.disabled && dir.selectedOptions[0]?.textContent === 'Opciones de efecto', 'sin opciones de efecto, lo dice (no un desplegable vacío)');
    // A 3D model: its options, the camera view.
    const m = { id: 'm3', type: 'model', src: 'data:model/gltf-binary;base64,AAAA', x: 10, y: 10, w: 200, h: 200, rotation: 0, animation: null };
    R.store.commit(() => { slide().blocks.push(m); R.state.ui.selection = 'm3'; R.state.ui.multi = ['m3']; }); await sleep(20);
    eq(tab().textContent, 'Modelo 3D', 'modelo 3D');
    const labels = [...page().querySelectorAll('.group > label')].map(l => l.textContent);
    assert(['Animación', 'Al moverse', 'Vista', 'Esqueleto', 'Archivo', 'Organizar'].every(l => labels.includes(l)), 'todas sus opciones: ' + labels.join(', '));
    const cam = [...page().querySelectorAll('select')].find(x => [...x.options].some(o => o.value === 'side'));
    cam.value = 'side'; cam.dispatchEvent(new W.Event('change')); await sleep(10);
    eq(slide().blocks.find(x => x.id === 'm3').view, 'side', 'vista de cámara');
    const M = await W.eval("import('/src/features/content/model3d.js')");
    eq(Object.fromEntries(M.modelAttrs(slide().blocks.find(x => x.id === 'm3')))['camera-orbit'], '90deg 75deg auto', 'la cámara, de lado');
    // Several objects: aligning them.
    R.store.commit(() => { R.state.ui.multi = [shapeId, 'm3']; R.state.ui.selection = 'm3'; }, { history: false }); await sleep(20);
    assert(/^Varios objetos/.test(tab().textContent), 'varios objetos');
    [...page().querySelectorAll('button')].find(x => x.querySelector('span')?.textContent === 'Izquierda').click(); await sleep(10);
    eq(slide().blocks.find(x => x.id === 'm3').x, Math.min(...slide().blocks.filter(x => ['m3', shapeId].includes(x.id)).map(x => x.x)), 'alinear a la izquierda');
    R.store.commit(() => { R.state.ui.selection = null; R.state.ui.multi = []; }, { history: false }); await sleep(10);
    assert(tab().hidden && R.state.ui.activeTab === 'home', 'al quitar la selección se va y vuelve a Inicio');
  });

  await test('texto dentro de las formas: escribir, formato de la cinta, presentación y PowerPoint', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    assert(S.hasShapeText({ type: 'shape', shape: 'star' }) && !S.hasShapeText({ type: 'shape', shape: 'line' }), 'las formas cerradas llevan texto; las líneas no');
    eq(S.shapeTextStyle({ shape: 'rect', fill: '#1d2b53', w: 100, h: 100 }).color, '#ffffff', 'sobre relleno oscuro, texto blanco');
    eq(S.shapeTextStyle({ shape: 'rect', fill: '#fbc02d', w: 100, h: 100 }).color, '#1f1f1f', 'sobre relleno claro, texto oscuro');
    assert(S.shapeTextStyle({ shape: 'triangle', w: 100, h: 100 }).pad[0] > 40, 'en un triángulo, más abajo');
    R.blocks.addShape('rounded'); await sleep(20); const b = last();
    const el = D.querySelector(`#stage .block[data-id="${b.id}"]`), rich = el.querySelector('.shape-text');
    assert(rich, 'la forma tiene su capa de texto');
    // Double-click and type, as in a text box.
    el.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    assert(rich.isContentEditable && el.classList.contains('editing'), 'doble clic: a escribir');
    rich.innerHTML = 'Paso <b>1</b>'; rich.dispatchEvent(new W.InputEvent('input', { bubbles: true })); rich.blur(); await sleep(20);
    eq(last().html, 'Paso <b>1</b>', 'lo escrito queda en la forma');
    // The ribbon's formatting works on it.
    R.store.commit(() => { R.state.ui.selection = b.id; R.state.ui.multi = [b.id]; }, { history: false }); await sleep(10);
    R.format.fontSize(4); await sleep(10); eq(last().fontSize, 32, 'tamaño desde la cinta');
    R.format.align('left'); await sleep(10); eq(last().textAlign, 'left', 'alineación desde la cinta');
    assert([...D.querySelectorAll('#ribbon [data-page="ctx"] button')].some(x => x.querySelector('span')?.textContent === 'Escribir texto'), 'y un botón para escribir en su pestaña');
    // Presentation and thumbnails.
    assert(/<div class="rv-shape-text"[^>]*>Paso <b>1<\/b><\/div>/.test(R.io.buildHTML()), 'en la presentación, sobre la forma');
    assert(/Paso/.test(D.querySelector('#navigator .thumb.active').textContent), 'en la miniatura');
    // PowerPoint: one shape with its text (it comes back as the shape and the text on it).
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/prst="roundRect"[\s\S]*?<a:t>Paso <\/a:t>/.test(xml), 'en PowerPoint, una forma con su texto');
  });

  await test('vínculos en objetos y botones de acción: a una web o a una diapositiva, al presentar y en PowerPoint', async () => {
    reset(); const W = frame.contentWindow;
    R.slides.addSlide('blank'); R.slides.addSlide('blank'); R.slides.goToSlide(0); await sleep(10);
    const S = R.state.deck.slides;
    // An action button already goes where it says.
    D.querySelector('[data-shapes-open]').click(); await sleep(20);
    D.querySelector('.popover [data-shape-pick="actnext"]').click(); await sleep(20);
    assert(last().shape === 'actnext' && last().goto === 'next' && last().alt === 'Siguiente', 'botón «Siguiente»: va a la siguiente, con su nombre para los lectores de pantalla');
    assert(!D.querySelector(`#stage .block[data-id="${last().id}"] .shape-text`), 'un botón no lleva texto');
    // Any object: the Link dialog.
    R.blocks.addShape('star'); await sleep(20); const star = last();
    D.querySelector('#ribbon [data-page="ctx"] [data-ctx="link"]').click(); await sleep(20);
    let m = D.getElementById('ol-modal'); m.querySelector('input[value="slide"]').checked = true; m.querySelector('input[value="slide"]').dispatchEvent(new W.Event('change'));
    m.querySelector('.ol-to').value = S[2].id; m.querySelector('.ol-ok').click(); await sleep(20);
    eq(slide().blocks.find(b => b.id === star.id).goto, S[2].id, 'a una diapositiva elegida');
    assert(D.querySelector(`#stage .block[data-id="${star.id}"]`).classList.contains('linked'), 'se ve que es un vínculo');
    R.blocks.addImage('data:image/gif;base64,R0lGODlhAQABAAAAACw='); await sleep(20); const img = last();
    const item = () => { const el = D.querySelector(`#stage .block[data-id="${img.id}"]`); el.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
      return [...D.querySelectorAll('#context-menu .ctx-item')].find(x => x.textContent === 'Vínculo…'); };
    item().click(); await sleep(20);
    m = D.getElementById('ol-modal'); m.querySelector('input[value="web"]').checked = true; m.querySelector('input[value="web"]').dispatchEvent(new W.Event('change'));
    m.querySelector('.ol-url').value = 'ejemplo.org/clase'; m.querySelector('.ol-ok').click(); await sleep(20);
    eq(slide().blocks.find(b => b.id === img.id).href, 'https://ejemplo.org/clase', 'a una web (con https:// si no lo lleva)');
    // The presentation: where each goes, and what makes it go.
    const html = R.io.buildHTML();
    assert(/data-goto="next" role="link" tabindex="0"/.test(html) && new RegExp(`data-goto="slide:${S[2].id}"`).test(html) && /data-href="https:\/\/ejemplo\.org\/clase"/.test(html), 'cada objeto con su destino');
    assert(new RegExp(`<section[^>]* data-rv-id="${S[2].id}"`).test(html) && /closest\('\.slides \[data-goto\]/.test(html), 'y lo que los hace ir');
    // Nothing unsafe from a deck made elsewhere.
    const Sz = await W.eval("import('/src/features/document/sanitize.js')");
    const bad = Sz.sanitizeDeck({ slides: [{ blocks: [{ type: 'shape', href: 'javascript:alert(1)', goto: 'x" onclick="y' }] }] }).slides[0].blocks[0];
    assert(!bad.href && !bad.goto, 'vínculos limpios al abrir presentaciones ajenas');
    // PowerPoint, both ways.
    const blob = await R.pptx.buildPptxBlob(), back = await R.pptxImport.importPPTX(new W.File([blob], 'v.pptx'));
    const bs = back.slides[0].blocks;
    assert(bs.some(b => b.goto === 'next' || b.goto === back.slides[1].id), 'el botón sigue yendo a la siguiente');
    assert(bs.some(b => b.goto === back.slides[2].id), 'la estrella, a la tercera');
    assert(bs.some(b => b.href === 'https://ejemplo.org/clase'), 'la imagen, a la web');
  });

  await test('SCORM: paquete para plataformas, con la nota de sus actividades y dónde se quedó', async () => {
    reset(); const W = frame.contentWindow;
    const P = await W.eval("import('/src/features/live/poll.js')"), SC = await W.eval("import('/src/io/export/scorm.js')");
    R.slides.addSlide('blank'); P.addPoll({ kind: 'quiz', question: '¿2+2?', options: ['3', '4'], correct: [1] }); R.slides.addSlide('blank');
    const { blob } = await SC.buildScorm(R.state.deck, { pass: 60 });
    const JSZip = await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip'), zip = await JSZip.loadAsync(blob);
    const man = await zip.file('imsmanifest.xml').async('string'), page = await zip.file('index.html').async('string');
    assert(/<schemaversion>1\.2<\/schemaversion>/.test(man) && /adlcp:scormtype="sco" href="index\.html"/.test(man) && /<adlcp:masteryscore>60</.test(man), 'manifiesto SCORM 1.2 con su nota para aprobar');
    assert(/__revelaScored/.test(page) && /LMSInitialize/.test(page) && /class="rv-poll"/.test(page), 'la página, con sus actividades y lo que habla con la plataforma');
    // In a platform: its API in the window above (as Moodle's player).
    const got = {}; let fin = 0;
    W.API = { LMSInitialize: () => 'true', LMSGetValue: k => (k === 'cmi.core.lesson_location' ? '2' : ''), LMSSetValue: (k, v) => { got[k] = v; return 'true'; }, LMSCommit: () => 'true', LMSFinish: () => { fin++; return 'true'; } };
    // (Opened by its own address, as a platform does: a srcdoc page can't keep the slide in its address.)
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f); f.src = W.URL.createObjectURL(new W.Blob([page], { type: 'text/html' }));
    try {
      for (let i = 0; i < 100 && !f.contentWindow?.Reveal?.isReady?.(); i++) await sleep(100);
      await sleep(200);
      eq(f.contentWindow.Reveal.getIndices().h, 2, 'vuelve a la diapositiva donde se quedó');
      eq(got['cmi.core.lesson_status'], 'incomplete', 'empezada');
      f.contentWindow.__revelaScored('q1', 1); await sleep(20);
      eq(got['cmi.core.score.raw'], '100', 'su nota, sobre 100'); eq(got['cmi.core.lesson_status'], 'passed', 'aprobada (todas respondidas)');
      eq(JSON.parse(got['cmi.suspend_data']).q1, 1, 'las notas guardadas para volver');
      f.contentWindow.__revelaScored('q1', 0.5); eq(got['cmi.core.lesson_status'], 'failed', 'por debajo de la nota para aprobar');
      f.contentWindow.dispatchEvent(new f.contentWindow.Event('pagehide')); eq(fin, 1, 'al salir, se despide de la plataforma');
    } finally { f.remove(); }
    // Dynamic: a launcher that opens it from Revela's cloud (view.html?doc=…&scorm=1) and passes on what it says.
    const dyn = await SC.buildScorm(R.state.deck, { pass: 50, docId: 'doc-1234567890abcdef' }), z2 = await JSZip.loadAsync(dyn.blob);
    const launcher = await z2.file('index.html').async('string');
    assert(/\/app\/view\.html\?doc=doc-1234567890abcdef&scorm=1/.test(launcher) && !/class="rv-poll"/.test(launcher), 'dinámica: solo el lanzador, que la abre desde la nube');
    assert(/e\.origin!==ORIGIN/.test(launcher), 'dinámica: solo escucha a la página de Revela');
    for (const k in got) delete got[k]; fin = 0;
    const g = D.createElement('iframe'); g.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;visibility:hidden'; D.body.appendChild(g);
    g.src = W.URL.createObjectURL(new W.Blob([launcher], { type: 'text/html' }));
    try {
      for (let i = 0; i < 50 && !g.contentWindow?.__revelaScormMessage; i++) await sleep(50);
      assert(/&at=2$/.test(g.contentDocument.getElementById('rv').src), 'vuelve a donde se quedó');
      const say = m => g.contentWindow.__revelaScormMessage({ revelaScorm: 1, ...m });
      say({ t: 'init', graded: 2 }); say({ t: 'slide', i: 3, last: false }); say({ t: 'score', id: 'a', s: 1 }); say({ t: 'score', id: 'b', s: 0 });
      eq(got['cmi.core.lesson_location'] + '|' + got['cmi.core.score.raw'] + '|' + got['cmi.core.lesson_status'], '3|50|passed', 'dinámica: la plataforma recibe el sitio y la nota');
      say({ t: 'end' }); eq(fin, 1, 'y se despide');
    } finally { g.remove(); delete W.API; }
  });

  await test('estado de cada diapositiva y a quién está asignada (solo en el editor)', async () => {
    reset(); const SL = await frame.contentWindow.eval("import('/src/features/document/slides.js')");
    R.slides.addSlide('blank'); await sleep(10); const [a, b] = R.state.deck.slides;
    SL.setSlideStatus([a.id], 'review'); SL.setSlideOwner([a.id, b.id], 'Ana Gil'); SL.setSlideStatus([b.id], 'inventado'); await sleep(30);
    eq(a.status + '|' + a.owner, 'review|Ana Gil', 'guardado'); assert(!b.status && b.owner === 'Ana Gil', 'solo estados conocidos');
    // (Polled: the thumbnails are redrawn a moment later, and on a busy CI machine 30 ms wasn't always enough.)
    const work = () => D.querySelector('#slide-nav .thumb .thumb-work') || D.querySelector('.thumb .thumb-work');
    for (let i = 0; i < 150 && !(work() && /AG/.test(work().textContent)); i++) await sleep(20);
    const w = work();
    assert(w && /AG/.test(w.textContent) && /Para revisar/.test(w.title) && /Ana Gil/.test(w.title), 'en su miniatura: el estado y sus iniciales');
    assert(!/Para revisar|Ana Gil/.test(R.io.buildHTML()), 'nunca en la presentación');
    SL.setSlideStatus([a.id], null); SL.setSlideOwner([a.id], ''); assert(!a.status && !a.owner, 'se quita');
  });

  await test('interactividad: ventana con información, texto al pasar el ratón y volver a la diapositiva de la que se vino', async () => {
    reset(); const W = frame.contentWindow;
    R.slides.addSlide('blank'); R.slides.addSlide('blank'); R.slides.goToSlide(0); await sleep(10);
    const S = R.state.deck.slides;
    R.blocks.addShape('rect'); await sleep(10); const info = last();
    D.querySelector('#ribbon [data-page="ctx"] [data-ctx="link"]').click(); await sleep(20);
    let m = D.getElementById('ol-modal'); m.querySelector('input[value="popup"]').checked = true; m.querySelector('input[value="popup"]').dispatchEvent(new W.Event('change'));
    assert(!m.querySelector('.ol-pop').hidden && m.querySelector('.ol-web').hidden, 'el diálogo pide el título y el texto');
    m.querySelector('.ol-pt').value = 'La pista'; m.querySelector('.ol-px').value = 'Mira <debajo> del cuadro.\n\nSegunda línea'; m.querySelector('.ol-tip').value = 'Pulsa para la pista'; m.querySelector('.ol-ok').click(); await sleep(20);
    const got = slide().blocks.find(b => b.id === info.id);
    eq(got.popup.title, 'La pista', 'ventana guardada'); eq(got.tip, 'Pulsa para la pista', 'y el texto al pasar');
    R.blocks.addShape('star'); await sleep(10); R.blocks.setObjectLink(last().id, { goto: S[2].id });
    R.slides.goToSlide(2); R.blocks.addShape('ellipse'); await sleep(10); R.blocks.setObjectLink(last().id, { goto: 'back' });
    const html = R.io.buildHTML(R.state.deck, { inApp: true });
    assert(/data-popup="\{&quot;title&quot;:&quot;La pista&quot;/.test(html) && /data-tip="Pulsa para la pista"/.test(html) && /data-goto="back"/.test(html), 'en la presentación');
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f); f.srcdoc = html;
    try {
      for (let i = 0; i < 100 && !f.contentWindow?.Reveal?.isReady?.(); i++) await sleep(100);
      const FW = f.contentWindow, FD = f.contentDocument;
      FW.Reveal.slide(0); await sleep(100);
      const el = FD.querySelector('.present [data-popup]'); el.click(); await sleep(50);
      const pop = FD.querySelector('.rv-pop');
      assert(pop && /La pista/.test(pop.textContent) && pop.querySelectorAll('p').length === 2 && !pop.querySelector('debajo'), 'el clic abre la ventana, con su texto escapado y en párrafos');
      FD.activeElement.dispatchEvent(new FW.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20);
      assert(!FD.querySelector('.rv-pop'), 'Esc la cierra'); eq(FW.Reveal.getIndices().h, 0, 'y no cambia de diapositiva');
      el.dispatchEvent(new FW.MouseEvent('mouseover', { bubbles: true })); await sleep(20);
      eq(FD.querySelector('.rv-tip')?.textContent, 'Pulsa para la pista', 'al pasar el ratón, su texto');
      FD.querySelector('.present [data-goto^="slide:"]').click(); await sleep(150);
      eq(FW.Reveal.getIndices().h, 2, 'el vínculo lleva a la tercera');
      FD.querySelector('.present [data-goto="back"]').click(); await sleep(150);
      eq(FW.Reveal.getIndices().h, 0, '«volver» regresa a la diapositiva de la que se vino');
    } finally { f.remove(); }
  });

  await test('conectores: rectos, de codo o curvos, con flecha en uno o los dos extremos', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const a = { x: 0, y: 0, w: 100, h: 100 }, b = { x: 400, y: 300, w: 100, h: 100 }, c = { id: 'k', type: 'connector' };
    assert(/d="M[\d.]+,[\d.]+ L/.test(S.connectorSVG(c, a, b, 1280, 720)), 'recto');
    const el = S.connectorSVG({ ...c, route: 'elbow' }, a, b, 1280, 720);
    assert(/d="M100\.0,50\.0 H250\.0 V350\.0 H400\.0"/.test(el), 'de codo: sale por el lado que mira al otro y gira en ángulo recto: ' + el.match(/d="[^"]*"/)[0]);
    assert(/d="M100\.0,50\.0 C/.test(S.connectorSVG({ ...c, route: 'curve' }, a, b, 1280, 720)), 'curvo');
    const both = S.connectorSVG({ ...c, arrowStart: true }, a, b, 1280, 720);
    assert(/marker-start=/.test(both) && /marker-end=/.test(both), 'flecha en los dos extremos');
    assert(!/marker-end=/.test(S.connectorSVG({ ...c, arrow: false }, a, b, 1280, 720)), 'o en ninguno');
    // Its tab.
    R.blocks.addShape('rect'); R.blocks.addShape('ellipse'); await sleep(10);
    const [s1, s2] = slide().blocks.filter(x => x.type === 'shape').slice(-2);
    R.store.commit(() => { R.state.ui.multi = [s1.id, s2.id]; R.state.ui.selection = s2.id; }, { history: false }); R.blocks.addConnector(); await sleep(20);
    const cn = slide().blocks.find(x => x.type === 'connector');
    R.store.commit(() => { R.state.ui.selection = cn.id; R.state.ui.multi = [cn.id]; R.state.ui.activeTab = 'ctx'; }, { history: false }); await sleep(20);
    eq(D.querySelector('#ribbon [data-tab="ctx"]').textContent, 'Conector', 'con su pestaña');
    const route = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === 'elbow'));
    route.value = 'elbow'; route.dispatchEvent(new W.Event('change')); await sleep(20);
    eq(slide().blocks.find(x => x.id === cn.id).route, 'elbow', 'de codo desde la pestaña');
    [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => x.querySelector('span')?.textContent === 'Flecha al inicio').click(); await sleep(20);
    assert(slide().blocks.find(x => x.id === cn.id).arrowStart, 'flecha al inicio');
    assert(/marker-start/.test(R.io.buildHTML()), 'y así se presenta');
  });

  await test('líneas con dos flechas, curvas y formas libres dibujadas a mano', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const da = S.shapeSVG({ id: 'd', shape: 'doublearrow', stroke: '#000', strokeWidth: 3 });
    assert(/marker-start=/.test(da) && /marker-end=/.test(da), 'línea con dos flechas');
    assert(/<path d="M3 82C28/.test(S.shapeSVG({ id: 'c', shape: 'curve', stroke: '#000', strokeWidth: 3 })), 'curva');
    // Freeform: drag an outline on the slide.
    D.querySelector('[data-shape-gallery] [data-shape="freeform"]').click(); await sleep(20);
    const ov = D.querySelector('.freeform-draw'); assert(ov, 'forma libre: a dibujar');
    const st = D.getElementById('stage').getBoundingClientRect(), k = 1280 / st.width, P = (x, y) => ({ clientX: st.left + x / k, clientY: st.top + y / k, bubbles: true, pointerId: 1 });
    const pts = Array.from({ length: 30 }, (_, i) => { const a = i / 29 * 2 * Math.PI; return [640 + 150 * Math.cos(a), 360 + 100 * Math.sin(a)]; });
    ov.dispatchEvent(new W.PointerEvent('pointerdown', P(...pts[0])));
    for (const p of pts.slice(1)) ov.dispatchEvent(new W.PointerEvent('pointermove', P(...p)));
    ov.dispatchEvent(new W.PointerEvent('pointerup', P(...pts.at(-1)))); await sleep(20);
    const f = last();
    assert(f.shape === 'custom' && f.rings?.[0]?.length >= 8 && Math.abs(f.w - 300) < 6 && Math.abs(f.h - 200) < 6, 'se convierte en una forma con su contorno: ' + f.w + '×' + f.h);
    assert(!D.querySelector('.freeform-draw'), 'y se deja de dibujar');
    D.querySelector('[data-shape-gallery] [data-shape="freeform"]').click(); await sleep(10);
    D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape' })); await sleep(10);
    assert(!D.querySelector('.freeform-draw'), 'Esc la cancela');
    // PowerPoint: the freeform, the curve and the double arrow.
    R.blocks.addShape('curve'); R.blocks.addShape('doublearrow'); await sleep(10);
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert((xml.match(/<a:custGeom>/g) || []).length >= 2 && /<a:cubicBezTo>/.test(xml), 'forma libre y curva como formas libres de PowerPoint');
    assert(/<a:headEnd type="triangle"/.test(xml) && /<a:tailEnd type="triangle"/.test(xml), 'la línea con dos flechas, con las dos');
  });

  await test('gráficos: la letra no se estira con la forma del cuadro', async () => {
    const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const d = [{ label: 'A', value: 30 }, { label: 'B', value: 10 }];
    const wide = S.chartSVG({ chartType: 'bar', data: d, w: 800, h: 300, yTitle: 'Y' }), tall = S.chartSVG({ chartType: 'bar', data: d, w: 300, h: 400 });
    assert(/<text x="(\d+\.?\d*)"[^>]*transform="matrix\(0\.625 0 0 1 /.test(wide), 'ancho: se estrecha en horizontal (300/60 ÷ 800/100)');
    assert(/transform="matrix\(0\.625 0 0 1 [\d.]+ 0\) rotate\(-90/.test(wide), 'también el título girado');
    assert(/<text [^>]*transform="matrix\(1 0 0 0\.45 0 /.test(tall), 'alto: se aplana en vertical (3/(400/60))');
    eq(S.chartSVG({ chartType: 'bar', data: d, w: 500, h: 300 }).includes('matrix('), false, 'con la proporción del dibujo no hace falta');
    const run = new W.Function(S.chartRuntimeJS() + '\nreturn chartSVG;')();
    for (const t of ['bar', 'hbar', 'waterfall', 'funnel', 'treemap', 'bubble', 'histogram', 'pie']) eq(run({ chartType: t, data: d, w: 800, h: 300 }), S.chartSVG({ chartType: t, data: d, w: 800, h: 300 }), 'datos en vivo: el mismo dibujo (' + t + ')');
  });

  await test('gráficos: barras apiladas, al 100 %, horizontales e histograma (también en PowerPoint)', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const d = [{ label: 'A', value: 30 }, { label: 'B', value: 10 }], ser = [{ name: 'X', values: [10, 30] }];
    const st = S.chartSVG({ chartType: 'stacked', data: d, series: ser, dataLabels: true });
    eq((st.match(/<rect (?![^>]*width="3")/g) || []).length, 4, 'apiladas: una columna por categoría, un trozo por serie (sin contar la leyenda)');
    assert(/>75 %</.test(S.chartSVG({ chartType: 'stacked100', data: d, series: ser, dataLabels: true })), 'al 100 %: en porcentajes (30 de 40 = 75 %)');
    assert(/<text x="[\d.]+"[^>]*text-anchor="end"[^>]*>A</.test(S.chartSVG({ chartType: 'hbar', data: d })), 'horizontales: las categorías a un lado');
    eq(JSON.stringify(S.histogramBins([1, 2, 2, 3, 7, 8, 9])), '[{"label":"0–2","value":1},{"label":"2–4","value":3},{"label":"4–6","value":0},{"label":"6–8","value":1},{"label":"8–10","value":2}]', 'histograma: intervalos redondos, contados');
    // From its tab, and PowerPoint both ways.
    R.blocks.addChart(); await sleep(20);
    const kind = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === 'stacked100'));
    assert(kind && ['stacked', 'hbar', 'histogram'].every(v => [...kind.options].some(o => o.value === v)), 'en la pestaña Gráfico');
    const types = ['stacked', 'stacked100', 'hbar'];
    R.store.commit(() => { slide().blocks = types.map((t, i) => ({ id: 'g' + i, type: 'chart', chartType: t, data: d, series: ser, x: i * 400, y: 100, w: 380, h: 300, rotation: 0, animation: null })); }); await sleep(10);
    const blob = await R.pptx.buildPptxBlob(), back = await R.pptxImport.importPPTX(new W.File([blob], 'g.pptx'));
    eq(back.slides[0].blocks.filter(b => b.type === 'chart').map(b => b.chartType).join(), types.join(), 'vuelven de PowerPoint como eran');
  });

  await test('formas: galería compacta, «Más formas» por categorías, colores del tema e ida y vuelta a PowerPoint', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const all = Object.keys(S.SHAPE_NAMES);
    assert(all.length >= 50, 'más de 50 formas: ' + all.length);
    for (const k of all.filter(k => k !== 'freeform')) assert(/<(polygon|path|rect|ellipse|line)[ >]/.test(S.shapeSVG({ id: 'x', shape: k, fill: '#f00', stroke: '#000', strokeWidth: 2 })), 'se dibuja: ' + k);
    assert(/<path d="M50 92C22/.test(S.shapeSVG({ id: 'h', shape: 'heart', sketch: true, fill: '#f00' })), 'una forma curva a mano alzada se dibuja tal cual');
    assert(all.length >= 70 && ['pie', 'chord', 'blockarc', 'cube', 'foldedcorner', 'smiley', 'sun', 'nosymbol', 'ribbon', 'wave', 'thought', 'arc', 'leftbrace', 'rightbracket'].every(k => all.includes(k)), 'formas nuevas: sector, cubo, llaves, cintas…');
    assert(/<path d="M74 4C56[^>]*fill="none"/.test(S.shapeSVG({ id: 'b', shape: 'leftbrace', fill: '#f00', stroke: '#000' })), 'las llaves y corchetes, como una línea');
    eq((S.shapeSVG({ id: 'c', shape: 'cube', fill: '#f00', stroke: '#000' }).match(/fill-opacity/g) || []).length, 2, 'el cubo, con sus caras sombreadas');
    assert(!S.hasShapeText({ type: 'shape', shape: 'arc' }) && S.hasShapeText({ type: 'shape', shape: 'cube' }), 'texto en las cerradas, no en las abiertas');
    R.blocks.addShape('leftbrace'); assert(last().fill === 'none' && last().h > last().w, 'la llave se inserta sin relleno y alta');
    // The ribbon: pictures of the shapes, in three rows; the rest in «Más formas».
    const gal = D.querySelectorAll('[data-shape-gallery] [data-shape]');
    assert(gal.length === 24 && [...gal].every(b => b.querySelector('svg') && b.title), 'galería con 24 formas dibujadas y su nombre');
    D.querySelector('[data-shapes-open]').click(); await sleep(20);
    const pop = D.querySelector('.popover[data-type="shapes"]');
    eq([...pop.querySelectorAll('h4')].map(h => h.textContent).join(), 'Básicas,Cintas,Flechas,Estrellas,Bocadillos,Diagrama de flujo,Botones de acción,Matemáticas,Líneas', 'por categorías');
    pop.querySelector('[data-shape-pick="heart"]').click(); await sleep(20);
    assert(last().shape === 'heart' && !D.querySelector('.popover'), 'se inserta desde «Más formas»');
    const P = await W.eval("import('/src/features/design/palettes.js')");
    eq(last().fill.toLowerCase(), P.currentPalette().accents[0].toLowerCase(), 'con el color del tema');
    eq(last().w, last().h, 'las formas redondas, sin deformar');
    const sel = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === 'heart'));
    assert(sel && sel.options.length >= 48 && sel.options[0].value === 'rect', 'cambiar de forma: todas, en orden');
    // PowerPoint, both ways: every shape comes back as itself.
    const kinds = all.filter(k => !S.isLineShape(k) && k !== 'freeform');
    R.store.commit(() => { slide().blocks = kinds.map((k, i) => ({ id: 's' + i, type: 'shape', shape: k, fill: '#3f6497', stroke: '#1e2a3a', strokeWidth: 2,
      x: (i % 10) * 120, y: Math.floor(i / 10) * 120, w: 100, h: 100, rotation: 0, animation: null })); }); await sleep(20);
    const blob = await R.pptx.buildPptxBlob();
    const back = (await R.pptxImport.importPPTX(new W.File([blob], 'formas.pptx'))).slides[0].blocks.filter(b => b.type === 'shape').map(b => b.shape);
    const lost = kinds.filter((k, i) => back[i] !== k);
    eq(lost.join(), '', 'todas vuelven de PowerPoint como eran');
  });

  await test('formas: degradado (lineal y radial) y estilo a mano alzada', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const base = { id: 'f1', type: 'shape', shape: 'rect', fill: '#ff0000', stroke: '#000000', strokeWidth: 2, x: 0, y: 0, w: 100, h: 100 };
    const lin = S.shapeSVG({ ...base, fill2: '#0000ff', gradAngle: 90 });
    assert(/<linearGradient[^>]*x1="0\.500" y1="0\.000" x2="0\.500" y2="1\.000"/.test(lin) && /stop-color="#ff0000"/.test(lin) && /stop-color="#0000ff"/.test(lin), 'degradado lineal (90°: de arriba abajo)');
    const id = lin.match(/linearGradient id="([^"]+)"/)[1]; assert(lin.includes(`fill="url(#${id})"`), 'la forma usa su degradado');
    assert(S.shapeSVG({ ...base, fill2: '#0000ff' }).match(/Gradient id="([^"]+)"/)[1] !== id, 'cada dibujo con su propio id (miniatura y lienzo)');
    assert(/<radialGradient/.test(S.shapeSVG({ ...base, fill2: '#0000ff', gradType: 'radial' })), 'degradado radial');
    const sk = S.shapeSVG({ ...base, shape: 'star', sketch: true });
    eq((sk.match(/<path /g) || []).length, 3, 'a mano: relleno y dos trazos de lápiz');
    eq(sk, S.shapeSVG({ ...base, shape: 'star', sketch: true }), 'siempre igual para la misma forma');
    assert(sk !== S.shapeSVG({ ...base, id: 'otra', shape: 'star', sketch: true }), 'y distinto en otra');
    assert(S.shapeSig({ ...base, sketch: true }) !== S.shapeSig(base) && S.shapeSig({ ...base, fill2: '#0000ff' }) !== S.shapeSig(base), 'se redibuja al cambiarlo');
    // From the shape's tab.
    R.blocks.addShape('ellipse'); await sleep(30);
    const page = () => D.querySelector('#ribbon [data-page="ctx"]'), sel = () => [...page().querySelectorAll('select')].find(x => [...x.options].some(o => o.value === 'radial'));
    sel().value = 'linear'; sel().dispatchEvent(new W.Event('change')); await sleep(20);
    assert(last().fill2 && last().gradType === 'linear', 'degradado desde la pestaña');
    assert([...page().querySelectorAll('label, .ctx-field')].some(l => /Ángulo/.test(l.textContent)), 'con su ángulo');
    [...page().querySelectorAll('button')].find(x => x.querySelector('span')?.textContent === 'Trazo a mano').click(); await sleep(20);
    assert(last().sketch, 'a mano alzada desde la pestaña');
    sel().value = 'solid'; sel().dispatchEvent(new W.Event('change')); await sleep(20); assert(!last().fill2, 'vuelta a sólido');
  });

  await test('efecto «Dibujar»: la tinta y las formas se trazan al presentar (reproducir la tinta)', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const ink = { id: 'k1', type: 'ink', points: [[0, 0], [50, 40], [100, 10]], color: '#ff0000', width: 6, x: 100, y: 100, w: 100, h: 40, vw: 100, vh: 40, rotation: 0, animation: null };
    assert(/pathLength="1" class="rvd"/.test(S.inkSVG(ink)), 'el trazo de la tinta, listo para dibujarse');
    const sh = { id: 's1', type: 'shape', shape: 'rect', fill: '#00f', stroke: '#000', strokeWidth: 2, x: 0, y: 0, w: 100, h: 100 };
    assert(/class="rvd"/.test(S.shapeSVG(sh)) && !/class="rvd"/.test(S.shapeSVG({ ...sh, dash: 'dash' })), 'las formas también (las de guiones no: sus guiones son en píxeles)');
    // From the drawing's own tab.
    R.store.commit(() => { slide().blocks.push(ink); R.state.ui.selection = 'k1'; R.state.ui.multi = ['k1']; R.state.ui.activeTab = 'ctx'; }); await sleep(30);
    const bt = () => [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => x.querySelector('span')?.textContent === 'Trazar al presentar');
    bt().click(); await sleep(20);
    const k = () => slide().blocks.find(x => x.id === 'k1');
    assert(k().animation?.effect === 'draw' && k().animation.duration >= 1000, 'la pestaña Dibujo lo pone, con tiempo para trazarse');
    const html = R.io.buildHTML();
    assert(/class="fragment draw"/.test(html) && /\.fragment\.draw\.visible \.rvd\{animation:rvDraw/.test(html) && /@keyframes rvDraw/.test(html), 'al presentar se traza');
    bt().click(); await sleep(20); assert(!k().animation, 'y se quita con el mismo botón');
    assert(D.querySelector('#ribbon [data-animation="draw"]'), 'también en Animaciones');
  });

  await test('cuenta atrás: anillo, números o barra; cuenta al presentar, se pausa con un clic y avisa al acabar', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')"), T = await W.eval("import('/src/io/runtime/timer.js')");
    eq([S.fmtTime(300), S.fmtTime(59.2), S.fmtTime(3725)].join(' '), '05:00 01:00 1:02:05', 'formato del tiempo');
    D.querySelector('[data-action="insert-timer"]').click(); await sleep(30);
    const b = () => last();
    assert(b().type === 'timer' && b().seconds === 300 && b().auto && b().sound, 'se inserta: 5 minutos, empieza solo y suena');
    eq(D.querySelector('#ribbon [data-tab="ctx"]').textContent, 'Cuenta atrás', 'con su pestaña');
    const page = () => D.querySelector('#ribbon [data-page="ctx"]'), num = label => [...page().querySelectorAll('.ctx-field')].find(f => f.textContent.trim().startsWith(label))?.querySelector('input');
    num('Minutos').value = '2'; num('Minutos').dispatchEvent(new W.Event('change')); await sleep(20);
    num('Segundos').value = '30'; num('Segundos').dispatchEvent(new W.Event('change')); await sleep(20);
    eq(b().seconds, 150, 'minutos y segundos desde la pestaña');
    assert(/02:30/.test(D.querySelector(`#stage .block[data-id="${b().id}"]`).textContent), 'el lienzo lo enseña');
    const style = [...page().querySelectorAll('select')].find(x => [...x.options].some(o => o.value === 'bar'));
    for (const st of ['digital', 'bar', 'ring']) { style.value = st; style.dispatchEvent(new W.Event('change')); await sleep(10); eq(b().style, st, 'estilo ' + st); }
    assert(/rv-t-arc/.test(S.timerSVG(b())) && /rv-t-bar/.test(S.timerSVG({ ...b(), style: 'bar' })), 'anillo que se vacía y barra');
    // In the presentation: its settings and the counting.
    const html = R.io.buildHTML(), tag = html.match(/<div[^>]*data-timer[^>]*>/)[0];
    assert(/data-secs="150"/.test(tag) && /data-auto/.test(tag) && /data-sound/.test(tag) && /role="timer"/.test(tag) && /data-end="¡Tiempo!"/.test(tag), 'exportado con su tiempo, arranque, sonido y texto final');
    assert(/function timerRuntime/.test(html), 'con el contador');
    const host = D.createElement('div'); host.innerHTML = `<div data-timer data-secs="1" data-end="¡Ya!">${S.timerSVG({ seconds: 1, w: 100, h: 100 })}</div>`; D.body.appendChild(host);
    const el = host.firstChild, rt = W.eval(`(${T.timerRuntime.toString()})()`);
    rt.start(el); await sleep(400);
    const p = +el.querySelector('svg').style.getPropertyValue('--p'); assert(p > 0 && p < 1, 'cuenta: el anillo se vacía');
    el.click(); await sleep(300); const paused = el.querySelector('svg').style.getPropertyValue('--p'); await sleep(300);
    eq(el.querySelector('svg').style.getPropertyValue('--p'), paused, 'un clic lo pausa');
    el.click(); await sleep(1100);
    assert(el.classList.contains('rv-t-done') && el.querySelector('.rv-t-txt').textContent === '¡Ya!', 'al acabar, su texto final');
    host.remove();
    // PowerPoint: as a picture.
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);          // (JSZip comes with the export)
    assert(Object.keys(zip.files).some(n => /^ppt\/media\//.test(n)), 'en PowerPoint, como imagen');
  });

  await test('candado: se configura (códigos, pista, adónde lleva, qué muestra), se ve con ruedas y la página exportada solo lleva la huella del código', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')"), L = await W.eval("import('/src/io/runtime/lock.js')");
    R.blocks.addShape('rect'); const prize = last();
    D.querySelector('[data-action="insert-lock"]').click(); for (let i = 0; i < 40 && !D.getElementById('lock-modal'); i++) await sleep(25);
    const b = () => slide().blocks.find(x => x.type === 'lock'), m = D.getElementById('lock-modal');
    assert(m && b() && b().salt.length === 16, 'se inserta y abre su configuración (con su sal)');
    eq(D.querySelector('#ribbon [data-tab="ctx"]').textContent, 'Candado', 'con su pestaña');
    assert(/4 ruedas/.test(m.querySelector('.lk-mode').textContent), 'un número: ruedas');
    m.querySelector('.lk-codes').value = 'París\nparis'; m.querySelector('.lk-codes').dispatchEvent(new W.Event('input'));
    assert(/cuadro de texto/.test(m.querySelector('.lk-mode').textContent), 'palabras: un cuadro de texto');
    m.querySelector('.lk-codes').value = '1492\n 1492 \n0007'; m.querySelector('.lk-codes').dispatchEvent(new W.Event('input'));
    m.querySelector('.lk-hint').value = 'El año del descubrimiento';
    m.querySelector('input[name=lk-to][value="slide"]').checked = true;
    m.querySelector(`.lk-reveal input[value="${prize.id}"]`).checked = true;
    m.querySelector('.lk-tries').value = '3'; m.querySelector('.lk-gate').checked = true;
    m.querySelector('.lk-ok').click(); await sleep(20);
    eq(b().codes.join(), '1492,0007', 'los códigos (sin repetir ni espacios)'); eq(b().hint, 'El año del descubrimiento', 'la pista');
    eq(b().openTo, slide().id, 'adónde lleva'); eq(b().reveal.join(), prize.id, 'qué muestra'); eq(b().tries, 3, 'intentos'); assert(b().gate, 'no deja pasar');
    eq(S.lockDigits(b()), 4, 'cuatro ruedas'); eq(S.lockDigits({ codes: ['12', '123'] }), 0, 'números de distinto largo: texto');
    eq(D.querySelectorAll(`#stage .block[data-id="${b().id}"] .lock-blk svg text`).length, 4, 'el lienzo enseña las ruedas');
    // The exported page: the settings, never the codes — a salted SHA-256 of each, the same as the browser's own.
    const html = R.io.buildHTML(), tag = html.match(/<div[^>]*data-lock="[^>]*>/)[0];
    assert(!/1492|0007/.test(tag), 'el código no está en la página');
    const cfg = JSON.parse(tag.match(/data-lock="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    const digest = async s => [...new Uint8Array(await W.crypto.subtle.digest('SHA-256', new W.TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
    eq(cfg.h[0], await digest(b().salt + ':1492'), 'su huella SHA-256 con sal (igual que crypto.subtle)');
    eq(L.lockSHA256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'SHA-256 de la cadena vacía');
    eq(L.lockSHA256('x'.repeat(200) + 'ñ€'), await digest('x'.repeat(200) + 'ñ€'), 'textos largos y no ASCII');
    eq(L.lockNorm('  PARÍS  de Francia '), 'paris de francia', 'sin mayúsculas, tildes ni espacios de más');
    eq(cfg.n + cfg.hint + cfg.tries + cfg.to, `4El año del descubrimiento3slide:${slide().id}`, 'ruedas, pista, intentos y destino');
    assert(/data-gate/.test(tag) && /role="button"/.test(tag) && /aria-label="Candado: El año/.test(tag) && !/data-goto/.test(tag), 'no deja pasar, se pulsa y se nombra; no es un vínculo');
    assert(new RegExp(`data-lock-hide="${b().id}"`).test(html), 'el premio, oculto hasta abrirlo');
    assert(/function lockRuntime/.test(html) && /rv-lock-box/.test(html), 'con su código y su estilo');
    // A copy of the slide: the copy's lock shows the copy's objects.
    R.slides.duplicateSlide(); const s2 = slide(), l2 = s2.blocks.find(x => x.type === 'lock');
    assert(l2.reveal[0] !== prize.id && s2.blocks.some(x => x.id === l2.reveal[0]), 'al duplicar, apunta a su copia');
    // PowerPoint: a picture of the padlock, its hint as the alternative text.
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/<p:pic>/.test(xml) && /descr="El año del descubrimiento"/.test(xml), 'en PowerPoint, como imagen con la pista');
  });

  await test('sonido: empezar solo, repetir, seguir sonando en las diapositivas siguientes y ocultarlo', async () => {
    reset(); const W = frame.contentWindow;
    R.slides.addSlide('blank'); R.slides.addSlide('blank'); R.slides.goToSlide(0); await sleep(10);
    const S = R.state.deck.slides;
    R.store.commit(() => { S[0].blocks.push({ id: 'au', type: 'audio', src: 'data:audio/wav;base64,UklGRiQAAABXQVZF', x: 1100, y: 600, w: 60, h: 60, rotation: 0, animation: null });
      R.state.ui.selection = 'au'; R.state.ui.multi = ['au']; R.state.ui.activeTab = 'ctx'; }); await sleep(30);
    const page = () => D.querySelector('#ribbon [data-page="ctx"]'), bt = l => [...page().querySelectorAll('button')].find(x => x.querySelector('span')?.textContent === l);
    const au = () => slide().blocks.find(x => x.id === 'au');
    bt('Empezar solo').click(); await sleep(10); bt('Repetir').click(); await sleep(10);
    assert(au().autoplay && au().loop, 'empezar solo y repetir desde su pestaña');
    let html = R.io.buildHTML();
    assert(/<audio[^>]*controls data-autoplay loop/.test(html), 'en su diapositiva: reveal.js lo pone en marcha al llegar');
    const sel = [...page().querySelectorAll('select')].find(x => [...x.options].some(o => o.value === 'end'));
    eq([...sel.options].map(o => o.value).join(), ',' + S[1].id + ',' + S[2].id + ',end', 'hasta una diapositiva siguiente o el final');
    sel.value = S[1].id; sel.dispatchEvent(new W.Event('change')); await sleep(20);
    html = R.io.buildHTML();
    assert(/<audio data-bgm="au" data-from="0" data-to="1"[^>]*loop/.test(html), 'fuera de las diapositivas, de la 1 a la 2: no se corta al pasar');
    assert(/data-bgm-btn="au"/.test(html) && /querySelectorAll\('audio\[data-bgm\]'\)/.test(html), 'con su botón y lo que lo controla');
    bt('Ocultar al presentar').click(); await sleep(10);
    assert(!/<button[^>]*data-bgm-btn/.test(R.io.buildHTML()), 'oculto: sin botón (sigue sonando)');
    sel.value = 'end'; sel.dispatchEvent(new W.Event('change')); await sleep(10);
    assert(/data-from="0" data-to="2"/.test(R.io.buildHTML()), 'hasta el final');
  });

  await test('texto curvo: en arco, hacia abajo o en círculo; se edita como texto normal', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const base = { id: 't1', type: 'text', html: '<b>Hola</b> <i>mundo</i> & <script>x</script>', fontSize: 40, x: 0, y: 0, w: 400, h: 200 };
    const up = S.curvedTextSVG({ ...base, curve: 45 }), down = S.curvedTextSVG({ ...base, curve: -45 });
    assert(/<textPath[^>]*>Hola mundo &amp; x<\/textPath>/.test(up), 'el texto, sin formato ni etiquetas, sobre el arco');
    assert(/ A[\d.]+,[\d.]+ 0 0 1 /.test(up) && / A[\d.]+,[\d.]+ 0 0 0 /.test(down), 'arriba como un arco iris, abajo como una sonrisa');
    assert(/font-weight="700"/.test(up), 'en negrita si lo está');
    const circle = S.curvedTextSVG({ ...base, curve: 100 });
    assert(/ A[\d.]+,[\d.]+ 0 1 1 /.test(circle) && /textLength=/.test(circle), 'en círculo: una vuelta completa, repartido');
    // In the editor, from its tab: the arc shows, the text under it is what is edited.
    const b = newText(); await sleep(20);
    R.store.commit(() => { R.state.ui.selection = b.id; R.state.ui.multi = [b.id]; R.state.ui.activeTab = 'ctx'; }, { history: false }); await sleep(20);
    const sel = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === '100'));
    sel.value = '45'; sel.dispatchEvent(new W.Event('change')); await sleep(30);
    eq(slide().blocks.find(x => x.id === b.id).curve, 45, 'curvar desde la pestaña del cuadro de texto');
    const el = D.querySelector(`#stage .block[data-id="${b.id}"]`);
    assert(el.classList.contains('curved') && el.querySelector('.curve-arc textPath') && W.getComputedStyle(el.querySelector('.rich')).visibility === 'hidden', 'se ve en arco');
    assert(/<textPath/.test(R.io.buildHTML()), 'y así se presenta');
    sel.value = '0'; sel.dispatchEvent(new W.Event('change')); await sleep(30);
    assert(!slide().blocks.find(x => x.id === b.id).curve && !el.isConnected || !D.querySelector(`#stage .block[data-id="${b.id}"] .curve-arc`), 'recto otra vez');
  });

  await test('imagen dentro de un dispositivo (móvil, tableta, portátil, monitor, navegador)', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const base = { id: 'i1', type: 'image', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', x: 100, y: 100, w: 300, h: 500 };
    for (const [d] of S.DEVICES.slice(1)) assert(/border/.test(S.deviceCSS({ ...base, device: d })), 'marco de ' + d);
    const bcss = S.deviceCSS({ ...base, device: 'browser' });
    assert(/radial-gradient/.test(bcss) && bcss.indexOf('background-origin:border-box') > bcss.indexOf('background:'), 'el navegador, con sus tres puntos en la barra (el origen después del fondo: si no, se pierde)');
    eq(S.deviceCSS(base), '', 'sin dispositivo, nada');
    R.blocks.addImage(base.src); await sleep(30);
    const sel = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === 'phone'));
    sel.value = 'phone'; sel.dispatchEvent(new W.Event('change')); await sleep(30);
    assert(last().device === 'phone' && last().fit === 'cover', 'desde la pestaña Imagen: dentro de un móvil, llenando su pantalla');
    const img = D.querySelector(`#stage .block[data-id="${last().id}"] img`);
    assert(/solid/.test(img.style.border) && parseFloat(img.style.borderRadius) > 10, 'en el lienzo, con su marco');
    assert(/<img[^>]*style="[^"]*border:[^"]*border-radius/.test(R.io.buildHTML()), 'y en la presentación');
    sel.value = ''; sel.dispatchEvent(new W.Event('change')); await sleep(30);
    assert(!last().device && !D.querySelector(`#stage .block[data-id="${last().id}"] img`).style.border, 'se quita');
  });

  await test('texto alrededor de una imagen o forma (ajuste cuadrado)', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const t = { id: 't', type: 'text', html: 'x', x: 100, y: 100, w: 600, h: 400, pad: [6, 6, 6, 6] };
    const img = { id: 'i', type: 'image', wrap: true, x: 120, y: 200, w: 200, h: 100 };
    const w = S.wrapFor(t, { blocks: [t, img] });
    eq(JSON.stringify(w), '{"side":"l","w":228,"h":201,"top":87}', 'hueco a la izquierda, a su altura');
    eq(S.wrapFor(t, { blocks: [t, { ...img, x: 520 }] }).side, 'r', 'a la derecha si está a la derecha');
    eq(S.wrapFor(t, { blocks: [t, { ...img, wrap: false }] }), null, 'sin «texto alrededor», nada');
    eq(S.wrapFor(t, { blocks: [t, { ...img, x: 800 }] }), null, 'si no se tocan, nada');
    eq(S.wrapFor({ ...t, vAlign: 'middle' }, { blocks: [t, img] }), null, 'solo con el texto arriba');
    // The image's tab, the canvas and the presentation.
    R.store.commit(() => { slide().blocks = [{ ...t, html: 'Texto largo '.repeat(40), fontSize: 24, rotation: 0, animation: null }, { ...img, wrap: false, src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', rotation: 0, animation: null }];
      R.state.ui.selection = 'i'; R.state.ui.multi = ['i']; R.state.ui.activeTab = 'ctx'; }); await sleep(30);
    [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => x.querySelector('span')?.textContent === 'Texto alrededor').click(); await sleep(30);
    assert(slide().blocks.find(x => x.id === 'i').wrap, 'desde la pestaña Imagen');
    const rich = D.querySelector('#stage .block[data-id="t"] .rich');
    assert(rich.dataset.wrap === 'l' && rich.style.getPropertyValue('--ww') === '228px', 'el texto del lienzo le deja hueco');
    const html = R.io.buildHTML();
    assert(/data-wrap="l" style="[^"]*--ww:228px;--wh:201px;--wt:87px;/.test(html) && /\[data-wrap\]::before\{content:""/.test(html), 'y en la presentación');
    R.store.commit(() => { slide().blocks.find(x => x.id === 'i').x = 900; }); await sleep(30);
    assert(!D.querySelector('#stage .block[data-id="t"] .rich').dataset.wrap, 'al apartarla, el texto vuelve a ocupar todo');
  });

  await test('modelos 3D: margen para moverse (la mano que saluda no se corta en el borde)', async () => {
    reset(); const W = frame.contentWindow, M = await W.eval("import('/src/features/content/model3d.js')");
    const base = { id: 'm1', type: 'model', src: 'data:model/gltf-binary;base64,AAAA', x: 100, y: 100, w: 200, h: 100, rotation: 0, animation: null };
    const attrs = b => Object.fromEntries(M.modelAttrs(b));
    eq(M.modelBleed(base), 1, 'quieto: sin margen');
    eq(M.modelBleed({ ...base, clip: 'Wave' }), 1.5, 'con animación propia: margen por defecto');
    eq(M.modelBleed({ ...base, walk: { clip: 'Walk' } }), 1.5, 'y si anda');
    eq(M.modelBleed({ ...base, clip: 'Wave', bleed: 1 }), 1, 'se puede quitar');
    const a = attrs({ ...base, clip: 'Wave' });
    eq(a['camera-orbit'], '0deg 75deg 158%', 'la cámara, tanto más lejos (el modelo se ve igual de grande)');
    eq(a['data-bleed'], '1.5', 'marcado para la presentación');
    eq(attrs({ ...base, clip: 'Wave', view: 'side' })['camera-orbit'], '90deg 75deg 158%', 'también con una vista elegida');
    assert(/%$/.test(attrs(base)['max-camera-orbit']), 'con límite propio de distancia (si no, model-viewer no aleja la cámara: tampoco «Acercar al entrar»)');
    eq(JSON.stringify(M.bleedBox({ ...base, clip: 'Wave' })).match(/"x":-?\d+,"y":-?\d+,"w":\d+,"h":\d+/)[0], '"x":50,"y":75,"w":300,"h":150', 'la vista, más grande alrededor del mismo centro');
    // In the editor: the block keeps its box (handles), the view overflows it.
    R.store.commit(() => { slide().blocks.push({ ...base, clip: 'Wave' }); }); await sleep(30);
    const mv = D.querySelector('#stage .block[data-id="m1"] model-viewer');
    eq([mv.style.width, mv.style.left || mv.style.inset.split(' ')[0]].join(), '150%,-25%', 'en el editor, la vista sobresale del bloque');
    eq(D.querySelector('#stage .block[data-id="m1"]').offsetWidth, 200, 'y el bloque no cambia');
    // In the presentation: the bigger box; only the model's own box takes the pointer.
    const html = R.io.buildHTML(), tag = html.match(/<model-viewer[^>]*data-bleed[^>]*>/)[0];
    assert(/left:50px;top:75px;width:300px;height:150px/.test(tag) && /pointer-events:none/.test(tag), 'exportado con la caja ampliada');
    // Room chosen from the object's tab.
    R.store.commit(() => { R.state.ui.selection = 'm1'; R.state.ui.multi = ['m1']; R.state.ui.activeTab = 'ctx'; }, { history: false }); await sleep(30);
    const sel = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === '2'));
    eq(sel.value, '1.5', 'en su pestaña, el margen que tiene'); sel.value = '2'; sel.dispatchEvent(new W.Event('change')); await sleep(20);
    eq(slide().blocks.find(x => x.id === 'm1').bleed, 2, 'se cambia desde la pestaña');
  });

  await test('modelos 3D: más fuentes (NASA, Wikimedia Commons en STL) y descargar el modelo con todo', async () => {
    reset(); const W = frame.contentWindow, realFetch = W.fetch;
    const Rz = await W.eval("import('/src/features/content/resources.js')"), S = await W.eval("import('/src/features/content/stl.js')");
    const A = await W.eval("import('/src/features/content/autorig.js')"), M = await W.eval("import('/src/features/content/model3d.js')");
    // NASA: searched here, in Spanish too.
    assert(Rz.searchNASA3D('').length > 250, 'más de 250 modelos de la NASA');
    assert(Rz.searchNASA3D('cohete').some(m => /rocket/i.test(m.name)) && Rz.searchNASA3D('marte').some(m => /mars/i.test(m.name)), 'búsqueda también en español');
    assert(Rz.searchNASA3D('').every(m => /^assets\/nasa3d\//.test(m.thumb)), 'con miniaturas propias');
    // STL (binary and text) → glTF, turned Z-up → Y-up.
    const tri = new W.ArrayBuffer(84 + 50), dv = new W.DataView(tri); dv.setUint32(80, 1, true);
    [[0, 0, 0], [1, 0, 0], [0, 0, 2]].forEach((p, i) => p.forEach((v, k) => dv.setFloat32(84 + 12 + i * 12 + k * 4, v, true)));
    const glb = S.stlToGLB(tri), g = await A.readModel(glb);
    eq(g.json.accessors[0].max.join(), '1,2,0', 'STL binario, con la Z hacia arriba pasada a Y');
    const ascii = new W.TextEncoder().encode('solid x\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid');
    eq((await A.readModel(S.stlToGLB(ascii.buffer))).json.accessors[0].count, 3, 'STL de texto');
    // Wikimedia Commons: search (only the words go out) and insert with its credit.
    const calls = [];
    W.fetch = async (url, o) => { url = String(url); calls.push(url);
      if (url.startsWith('https://commons.wikimedia.org/w/api.php')) return new W.Response(JSON.stringify({ continue: { gsroffset: 24 }, query: { pages: { 7: { index: 1, title: 'File:Fossil skull.stl',
        imageinfo: [{ url: 'https://upload.wikimedia.org/x/Fossil_skull.stl', size: 134, thumburl: 'https://thumb/x.png', descriptionurl: 'https://commons/x', extmetadata: { LicenseShortName: { value: 'CC BY 4.0' }, Artist: { value: '<a href="#">Ana</a>' } } }] } } } }));
      if (url.endsWith('Fossil_skull.stl')) return new W.Response(tri);
      return realFetch(url, o); };
    try {
      const r = await Rz.searchCommons3D('skull');
      assert(/filemime:application\/sla[+ ]skull/.test(decodeURIComponent(calls[0])) && /origin=\*/.test(calls[0]), 'busca modelos STL en Commons');
      eq([r.results[0].title, r.results[0].license, r.results[0].artist, r.next].join('|'), 'Fossil skull|CC BY 4.0|Ana|24', 'título, licencia, autor y más resultados');
      const b = await Rz.insertCommons3D(r.results[0]);
      assert(b.type === 'model' && /^data:model\/gltf-binary/.test(b.src) && /Ana, Wikimedia Commons \(CC BY 4\.0\)/.test(b.caption), 'insertado como glTF, con su atribución');
      // Keep the model: one .glb with everything (also from a .gltf with its data inside).
      const f = await M.modelFile({ ...b, alt: 'Cráneo fósil' });
      assert(f.name === 'Cráneo fósil.glb' && f.blob.type === 'model/gltf-binary' && f.blob.size > 100, 'se descarga como .glb');
      const gltf = 'data:model/gltf+json;base64,' + W.btoa(JSON.stringify({ ...g.json, buffers: [{ byteLength: g.bin.length, uri: 'data:application/octet-stream;base64,' + W.btoa(String.fromCharCode(...g.bin)) }] }));
      const f2 = await M.modelFile({ src: gltf, caption: 'Pieza — autor' });
      const head = new W.Uint8Array(await f2.blob.arrayBuffer()).slice(0, 4);
      assert(f2.name === 'Pieza.glb' && String.fromCharCode(...head) === 'glTF', 'un .gltf se guarda como .glb con todo dentro');
    } finally { W.fetch = realFetch; }
  });

  await test('esqueleto automático: propone articulaciones, une la malla, crea animaciones y se ajusta a mano', async () => {
    reset(); const W = frame.contentWindow;
    const A = await W.eval("import('/src/features/content/autorig.js')");
    // A model made of boxes (no skeleton): [x0, y0, z0, x1, y1, z1] each.
    const model = boxes => {
      const pos = [], idx = [];
      for (const [a, b, c, d, e, f] of boxes) {
        const o = pos.length / 3;
        for (const [x, y, z] of [[a, b, c], [d, b, c], [d, e, c], [a, e, c], [a, b, f], [d, b, f], [d, e, f], [a, e, f]]) pos.push(x, y, z);
        for (const t of [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0]) idx.push(o + t);
      }
      const P = new W.Float32Array(pos), I = new W.Uint16Array(idx), bin = new W.Uint8Array(P.byteLength + I.byteLength);
      bin.set(new W.Uint8Array(P.buffer)); bin.set(new W.Uint8Array(I.buffer), P.byteLength);
      const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: P.byteLength }, { buffer: 0, byteOffset: P.byteLength, byteLength: I.byteLength }],
        accessors: [{ bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: [-9, -9, -9], max: [9, 9, 9] }, { bufferView: 1, componentType: 5123, count: idx.length, type: 'SCALAR' }] };
      return A.writeGLB({ json, bin });
    };
    // A person 1.8 high: legs, body, arms hanging apart from it, neck and a bigger head.
    const person = model([[0.05, 0, -0.08, 0.2, 0.85, 0.08], [-0.2, 0, -0.08, -0.05, 0.85, 0.08], [-0.22, 0.85, -0.1, 0.22, 1.45, 0.1],
      [0.27, 0.8, -0.05, 0.37, 1.42, 0.05], [-0.37, 0.8, -0.05, -0.27, 1.42, 0.05], [-0.05, 1.45, -0.05, 0.05, 1.52, 0.05], [-0.14, 1.52, -0.12, 0.14, 1.8, 0.12]]);
    const g = await A.readModel(person), shape = A.modelShape(g), J = A.proposeJoints(shape, 'person');
    assert(Math.abs(J.hips[1] - 0.88) < 0.1, 'la cadera donde se separan las piernas (' + J.hips[1].toFixed(2) + ')');
    assert(J.footL[1] < 0.12 && J.footL[0] > 0.05 && J.footR[0] < -0.05, 'los pies abajo, cada uno en su pierna');
    assert(J.handL[0] > 0.25 && J.handR[0] < -0.25 && J.handL[1] < 1.0, 'las manos al final de los brazos');
    assert(J.neck[1] > 1.4 && J.neck[1] < 1.56 && J.head[1] > J.neck[1], 'el cuello en lo estrecho, bajo la cabeza (' + J.neck[1].toFixed(2) + ')');
    // Rigged: a skin, weights, and the animations; the legs move when walking.
    const out = A.buildRig(g, shape, 'person', J), g2 = await A.readModel(out);
    eq(g2.json.skins[0].joints.length, A.SKELETONS.person.length, 'un hueso por articulación');
    eq(g2.json.animations.map(a => a.name).join(), A.CLIPS.person.map(([c]) => c).join(), 'animaciones creadas');
    const prim = g2.json.meshes[g2.json.nodes.find(n => n.skin === 0).mesh].primitives[0];
    assert(prim.attributes.JOINTS_0 != null && prim.attributes.WEIGHTS_0 != null, 'la malla unida a los huesos');
    const w = A.bindWeights(shape.parts[0].pos, [{ a: J.thighL, b: J.shinL }, { a: J.chest, b: J.neck }], 1.8);
    assert(Math.abs(w.weights[0] + w.weights[1] + w.weights[2] + w.weights[3] - 1) < 1e-4, 'los pesos suman 1');
    const st = A.posedJoints('person', J, 'Walk', 0.25, 1.8), st2 = A.posedJoints('person', J, 'Walk', 0.75, 1.8);
    assert(st.footL[2] > J.footL[2] + 0.1 && st.footR[2] < J.footR[2] - 0.05, 'andando: un pie adelante y el otro atrás');
    assert(st2.footR[2] > J.footR[2] + 0.1, 'y luego al revés');
    const wave = A.posedJoints('person', J, 'Wave', 0.3, 1.8); assert(wave.handR[1] > J.head[1], 'saludar: la mano derecha arriba');
    // An animal: body, head ahead, tail behind, four legs.
    const animal = model([[-0.15, 0.4, -0.5, 0.15, 0.7, 0.5], [-0.12, 0.55, 0.5, 0.12, 0.8, 0.8], [-0.03, 0.55, -0.9, 0.03, 0.62, -0.5],
      ...[[0.08, 0.35], [-0.12, 0.35], [0.08, -0.4], [-0.12, -0.4]].map(([x, z]) => [x, 0, z, x + 0.05, 0.4, z + 0.08])]);
    const ga = await A.readModel(animal), sa = A.modelShape(ga), Ja = A.proposeJoints(sa, 'animal');
    assert(Math.abs(Ja.legFL[2] - 0.39) < 0.1 && Math.abs(Ja.legBL[2] + 0.36) < 0.1, 'patas delanteras y traseras donde tocan el suelo');
    assert(Ja.head[2] > 0.5 && Ja.tail[2] < -0.3, 'la cabeza delante y la cola detrás');
    const aw = A.posedJoints('animal', Ja, 'Walk', 0.25, 0.8);
    assert((aw.pawFL[2] - Ja.pawFL[2]) * (aw.pawFR[2] - Ja.pawFR[2]) < 0, 'andando: las patas de un par van alternas');
    // The dialog: drag a joint (the other side follows), apply, undo.
    const blk = { id: 'rig1', type: 'model', src: person, x: 100, y: 100, w: 300, h: 300, rotation: 0, animation: null };
    R.store.commit(() => { slide().blocks.push(blk); });
    const Dl = await W.eval("import('/src/ui/dialogs/autorig.js')"), dlg = await Dl.openAutoRig(slide().blocks.at(-1));
    const cv = D.querySelector('#rig-modal .rig-cv'), r = cv.getBoundingClientRect(), k = r.width / cv.width;
    const J0 = structuredClone(dlg.joints), toS = p => { const s = cv.width, mn = shape.box.min, mx = shape.box.max, kk = Math.min((s - 60) / (mx[0] - mn[0]), (s - 60) / (mx[1] - mn[1]));
      return [r.left + (s / 2 + kk * (p[0] - (mn[0] + mx[0]) / 2)) * k, r.top + (s / 2 - kk * (p[1] - (mn[1] + mx[1]) / 2)) * k]; };
    const [hx, hy] = toS(J0.handL), pe = (type, x, y) => cv.dispatchEvent(new W.PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0 }));
    pe('pointermove', hx, hy); pe('pointerdown', hx, hy); pe('pointermove', hx + 20, hy - 30); pe('pointerup', hx + 20, hy - 30);
    assert(dlg.joints.handL[1] > J0.handL[1] + 0.05, 'arrastrar mueve la articulación');
    assert(Math.abs(dlg.joints.handR[1] - dlg.joints.handL[1]) < 1e-6 && Math.abs(dlg.joints.handR[0] + dlg.joints.handL[0]) < 0.02, 'y la del otro lado, a la vez');
    for (let i = 0; i < 40 && !dlg.built; i++) await sleep(50);
    D.querySelector('#rig-modal .rig-ok').click(); await sleep(20);
    const x = slide().blocks.at(-1);
    assert(x.src !== person && x.clip === 'Idle' && x.walk?.clip === 'Walk', 'aplicado: con esqueleto, en reposo, y anda al moverse');
    R.store.undo(); eq(slide().blocks.at(-1).src, person, 'se deshace');
  });

  // Models made of boxes ([x0, y0, z0, x1, y1, z1] each), all facing +Z: one of each kind.
  const boxModel = (W, A, boxes) => {
    const pos = [], idx = [];
    for (const [a, b, c, d, e, f] of boxes) {
      const o = pos.length / 3;
      for (const [x, y, z] of [[a, b, c], [d, b, c], [d, e, c], [a, e, c], [a, b, f], [d, b, f], [d, e, f], [a, e, f]]) pos.push(x, y, z);
      for (const t of [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0]) idx.push(o + t);
    }
    const P = new W.Float32Array(pos), I = new W.Uint32Array(idx), bin = new W.Uint8Array(P.byteLength + I.byteLength);
    bin.set(new W.Uint8Array(P.buffer)); bin.set(new W.Uint8Array(I.buffer), P.byteLength);
    const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: P.byteLength }, { buffer: 0, byteOffset: P.byteLength, byteLength: I.byteLength }],
      accessors: [{ bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: [-9, -9, -9], max: [9, 9, 9] }, { bufferView: 1, componentType: 5125, count: idx.length, type: 'SCALAR' }] };
    return A.writeGLB({ json, bin });
  };
  const legs = (zs, reach, h, body) => zs.flatMap((z, i) => [1, -1].flatMap(s => {
    const fz = z + (i - (zs.length - 1) / 2) * -0.12, fx = s * reach;
    return [[Math.min(s * body, fx), h - 0.03, z - 0.015, Math.max(s * body, fx), h, z + 0.015], [fx - 0.015, 0, fz - 0.015, fx + 0.015, h, fz + 0.015]];
  }));
  const ring = n => Array.from({ length: n }, (_, i) => [0.3, 0.405, 0.51, 0.615, 0.72].map(r => { const a = 2 * Math.PI * i / n, x = Math.sin(a) * r, z = Math.cos(a) * r; return [x - 0.06, 0, z - 0.06, x + 0.06, 0.12, z + 0.06]; })).flat();
  const KIND_MODELS = {
    bird: ['bird', [[-0.1, 0.3, -0.22, 0.1, 0.52, 0.22], [-0.07, 0.48, 0.18, 0.07, 0.66, 0.36], [-0.02, 0.55, 0.36, 0.02, 0.58, 0.44], [-0.06, 0.38, -0.5, 0.06, 0.42, -0.22],
      [0.04, 0, -0.02, 0.07, 0.3, 0.02], [-0.07, 0, -0.02, -0.04, 0.3, 0.02], [0.1, 0.45, -0.1, 0.7, 0.48, 0.12], [-0.7, 0.45, -0.1, -0.1, 0.48, 0.12]]],
    dragon: ['winged', [[-0.15, 0.4, -0.5, 0.15, 0.7, 0.5], [-0.12, 0.55, 0.5, 0.12, 0.9, 0.8], [-0.03, 0.55, -1.0, 0.03, 0.62, -0.5],
      ...[[0.08, 0.35], [-0.12, 0.35], [0.08, -0.4], [-0.12, -0.4]].map(([x, z]) => [x, 0, z, x + 0.05, 0.4, z + 0.08]), [0.15, 0.68, -0.2, 1.3, 0.72, 0.3], [-1.3, 0.68, -0.2, -0.15, 0.72, 0.3]]],
    fish: ['fish', [[-0.08, 0.3, 0.3, 0.08, 0.7, 0.6], [-0.07, 0.32, -0.1, 0.07, 0.68, 0.3], [-0.04, 0.4, -0.4, 0.04, 0.6, -0.1], [-0.01, 0.2, -0.6, 0.01, 0.8, -0.4],
      [0.08, 0.4, 0.3, 0.2, 0.42, 0.4], [-0.2, 0.4, 0.3, -0.08, 0.42, 0.4], [-0.01, 0.7, -0.05, 0.01, 0.85, 0.15]]],
    snake: ['snake', Array.from({ length: 16 }, (_, i) => { const z = -1 + i * 0.125, x = 0.15 * Math.sin(i * 0.8); return [x - 0.05, 0, z, x + 0.05, 0.08 + (i > 13 ? 0.03 : 0), z + 0.14]; })],
    spider: ['spider', [[-0.15, 0.25, -0.4, 0.15, 0.45, 0], [-0.1, 0.25, 0, 0.1, 0.4, 0.25], ...legs([0.2, 0.12, 0.04, -0.04], 0.6, 0.4, 0.08)]],
    insect: ['spider', [[-0.13, 0.13, -0.55, 0.13, 0.33, -0.1], [-0.08, 0.15, -0.1, 0.08, 0.28, 0.3], [-0.07, 0.15, 0.3, 0.07, 0.27, 0.45], ...legs([0.15, -0.05, -0.25], 0.4, 0.22, 0.08)]],
    octopus: ['octopus', [[-0.25, 0.12, -0.25, 0.25, 1.3, 0.25], ...ring(8)]],
    jar: ['object', [[-0.3, 0, -0.3, 0.3, 0.5, 0.3], [-0.2, 0.5, -0.2, 0.2, 0.9, 0.2]]],
    table: ['object', [[-0.6, 0.7, -0.4, 0.6, 0.76, 0.4], ...[[-0.55, -0.35], [0.5, -0.35], [-0.55, 0.3], [0.5, 0.3]].map(([x, z]) => [x, 0, z, x + 0.05, 0.7, z + 0.05])]],
  };

  await test('esqueleto automático: más tipos (pájaro, dragón, pez, serpiente, araña, pulpo, objeto) con huesos, animaciones y glTF válidos', async () => {
    reset(); const W = frame.contentWindow;
    const A = await W.eval("import('/src/features/content/autorig.js')"), G = await W.eval("import('/src/features/content/gltf.js')");
    const fin = a => Array.from(a).every(Number.isFinite);
    for (const [name, [kind, boxes]] of Object.entries(KIND_MODELS)) {
      const g = await A.readModel(boxModel(W, A, boxes)), shape = A.modelShape(g), d = A.detectKind(shape);
      const J = A.proposeJoints(shape, kind, d.opts), list = A.skeletonOf(kind, J), H = shape.box.max[1] - shape.box.min[1];
      // The bones: one root, each parent before its children, every joint placed.
      eq(list.filter(([, p]) => !p).length, 1, name + ': una sola raíz');
      assert(list.every(([n, p], i) => !p || list.findIndex(([m]) => m === p) < i) && new Set(list.map(([n]) => n)).size === list.length, name + ': jerarquía válida');
      assert(list.every(([n]) => J[n] && J[n].length === 3 && fin(J[n])), name + ': todas las articulaciones en su sitio');
      assert(list.every(([n]) => typeof A.jointLabel(n, kind) === 'string' && !/\{n\}/.test(A.jointLabel(n, kind))), name + ': con nombre');
      // The clips: finite turns, and something moves.
      for (const [clip] of A.CLIPS[kind]) {
        let moved = 0;
        for (const t of [0, 0.2, 0.45, 0.7, 0.9]) {
          const p = A.posedJoints(kind, J, clip, t, H);
          assert(list.every(([n]) => fin(p[n])), `${name} ${clip}: posiciones finitas`);
          for (const [n] of list) moved = Math.max(moved, Math.hypot(...p[n].map((v, i) => v - J[n][i])));
        }
        assert(moved > H * 0.01, `${name} ${clip}: se mueve (${(moved / H).toFixed(3)})`);
      }
      // The glTF: a skin over every joint, inverse bind matrices, the clips sampled.
      const g2 = await A.readModel(A.buildRig(g, shape, kind, J)), j = g2.json, skin = j.skins[0];
      eq(skin.joints.length, list.length, name + ': un hueso por articulación');
      const ibm = j.accessors[skin.inverseBindMatrices]; assert(ibm.type === 'MAT4' && ibm.count === list.length, name + ': matrices de unión');
      assert(fin(G.readAccessor(g2, skin.inverseBindMatrices)), name + ': matrices finitas');
      const skinned = j.nodes.filter(n => n.skin === 0);
      assert(skinned.length && skinned.every(n => j.meshes[n.mesh].primitives.every(p => p.attributes.JOINTS_0 != null && p.attributes.WEIGHTS_0 != null)), name + ': la malla unida a los huesos');
      eq(j.animations.map(a => a.name).join(), A.CLIPS[kind].map(([c]) => c).join(), name + ': animaciones');
      for (const an of j.animations) for (const ch of an.channels) {
        assert(skin.joints.includes(ch.target.node), name + ': cada canal mueve un hueso');
        const out = G.readAccessor(g2, an.samplers[ch.sampler].output); assert(fin(out), `${name} ${an.name}: valores finitos`);
        if (ch.target.path === 'rotation') for (let i = 0; i < out.length; i += 4) assert(Math.abs(Math.hypot(out[i], out[i + 1], out[i + 2], out[i + 3]) - 1) < 1e-3, name + ': giros unitarios');
      }
    }
    // What each one does.
    const rig = async (name, opts) => { const [kind, boxes] = KIND_MODELS[name], g = await A.readModel(boxModel(W, A, boxes)), s = A.modelShape(g), J = A.proposeJoints(s, kind, opts);
      return { kind, J, H: s.box.max[1] - s.box.min[1], at: (clip, t) => A.posedJoints(kind, J, clip, t, s.box.max[1] - s.box.min[1]) }; };
    const bird = await rig('bird'), up = bird.at('Fly', 0.25), down = bird.at('Fly', 0.75);
    assert(up.wingTipL[1] - down.wingTipL[1] > bird.H * 0.3 && up.wingTipR[1] - down.wingTipR[1] > bird.H * 0.3, 'pájaro: bate las dos alas');
    const snake = await rig('snake'), s1 = snake.at('Slither', 0), s2 = snake.at('Slither', 0.5);
    assert(Math.abs(s1.tail4[0] - s2.tail4[0]) > 0.05, 'serpiente: la cola va de lado a lado');
    const spider = await rig('spider'), w = spider.at('Walk', 0.25);
    eq(A.countOf('spider', spider.J), 8, 'araña: ocho patas');
    const fwd = n => w[n][2] - spider.J[n][2];
    assert(fwd('foot1L') * fwd('foot2L') < 0 && fwd('foot1L') * fwd('foot1R') < 0 && fwd('foot1L') * fwd('foot3L') > 0, 'araña: patas alternas (dos grupos)');
    const insect = await rig('insect', { legs: 6 }); eq(A.skeletonOf('spider', insect.J).filter(([n]) => /^leg/.test(n)).length, 6, 'insecto: seis patas');
    const fish = await rig('fish'), f1 = fish.at('Swim', 0), f2 = fish.at('Swim', 0.5);
    assert(Math.abs(f1.tail3[0] - f2.tail3[0]) > Math.abs(f1.head[0] - f2.head[0]), 'pez: la cola se mueve más que la cabeza');
    const octo = await rig('octopus'), o1 = octo.at('Swim', 0.25), o2 = octo.at('Swim', 0.75);
    assert(o1.arm1c[1] - o2.arm1c[1] > octo.H * 0.05 && o1.arm5c[1] - o2.arm5c[1] > octo.H * 0.05, 'pulpo: los tentáculos se abren y cierran a la vez');
    const jar = await rig('jar'); assert(jar.at('Bounce', 0.5).hips[1] > jar.J.hips[1] + jar.H * 0.2, 'objeto: bota');
    const sq = jar.at('Squash', 0.25); assert(sq.bend2[1] - sq.hips[1] > (jar.J.bend2[1] - jar.J.hips[1]) * 1.1, 'objeto: se estira');
    const drag = await rig('dragon'); assert(drag.at('Fly', 0.5).hips[1] > drag.J.hips[1] + drag.H * 0.1 && drag.at('Fly', 0.25).wingTipL[1] > drag.J.wingTipL[1], 'dragón: vuela batiendo las alas');
    // Counts, from the options or the joints; labels with their number.
    eq(A.countOf('snake', { segs: 6 }), 6); eq(A.skeletonOf('snake', { segs: 6 }).length, 6, 'serpiente de 6 segmentos');
    eq(A.countOf('octopus', A.proposeJoints(A.modelShape(await A.readModel(boxModel(W, A, KIND_MODELS.octopus[1]))), 'octopus', { arms: 5 })), 5, 'pulpo de 5 tentáculos');
    eq(A.jointLabel('leg3R', 'spider'), 'Pata 3 der.'); eq(A.jointLabel('hips', 'object'), 'Base'); eq(A.jointLabel('arm2c', 'octopus'), 'Tentáculo 2 (punta)');
  });

  await test('esqueleto automático: adivina qué es por su forma (y hacia dónde mira)', async () => {
    reset(); const W = frame.contentWindow;
    const A = await W.eval("import('/src/features/content/autorig.js')");
    const person = [[0.05, 0, -0.08, 0.2, 0.85, 0.08], [-0.2, 0, -0.08, -0.05, 0.85, 0.08], [-0.22, 0.85, -0.1, 0.22, 1.45, 0.1],
      [0.27, 0.8, -0.05, 0.37, 1.42, 0.05], [-0.37, 0.8, -0.05, -0.27, 1.42, 0.05], [-0.05, 1.45, -0.05, 0.05, 1.52, 0.05], [-0.14, 1.52, -0.12, 0.14, 1.8, 0.12]];
    const animal = [[-0.15, 0.4, -0.5, 0.15, 0.7, 0.5], [-0.12, 0.55, 0.5, 0.12, 0.8, 0.8], [-0.03, 0.55, -0.9, 0.03, 0.62, -0.5],
      ...[[0.08, 0.35], [-0.12, 0.35], [0.08, -0.4], [-0.12, -0.4]].map(([x, z]) => [x, 0, z, x + 0.05, 0.4, z + 0.08])];
    const all = { person: ['person', person], animal: ['animal', animal], ...KIND_MODELS }, wrong = [];
    let n = 0, ok = 0, facing = 0, turned = 0;
    for (const [name, [kind, boxes]] of Object.entries(all)) {
      const g = await A.readModel(boxModel(W, A, boxes));
      for (const yaw of [0, 90, 180, 270]) {
        const d = A.detectKind(A.modelShape(g, yaw)); n++;
        if (d.kind === kind) ok++; else wrong.push(`${name}@${yaw}→${d.kind}`);
        assert(d.confidence > 0 && d.confidence <= 1, 'con una confianza');
        if (!/object|octopus|person/.test(kind)) { turned++; if ((yaw + d.yaw) % 360 === 0) facing++; }
      }
    }
    eq(wrong.join(' '), '', `acierta qué es (${ok}/${n})`);
    assert(facing >= turned * 0.9, `y lo gira para que mire de frente (${facing}/${turned})`);
    const sp = A.detectKind(A.modelShape(await A.readModel(boxModel(W, A, KIND_MODELS.insect[1])))); eq(sp.opts.legs, 6, 'cuenta seis patas');
    const oc = A.detectKind(A.modelShape(await A.readModel(boxModel(W, A, KIND_MODELS.octopus[1])))); eq(oc.opts.arms, 8, 'y ocho tentáculos');
    eq(A.groundContacts(A.modelShape(await A.readModel(boxModel(W, A, animal)))).length, 4, 'cuatro patas en el suelo');
  });

  await test('esqueleto automático: detectar con IA (tres vistas al modelo que ve, respuesta descuidada, sin IA)', async () => {
    reset(); const W = frame.contentWindow, realFetch = W.fetch, KEY = 'revela.ai.v1', saved = W.localStorage.getItem(KEY);
    const A = await W.eval("import('/src/features/content/autorig.js')"), K = await W.eval("import('/src/features/ai/rigkind.js')");
    // Reading the answer: in fences, bare keys, single quotes, trailing commas, percentages, synonyms.
    const a1 = K.readAnswer("Here: ```json\n{kind: 'dragon', facing: 'right', limbs: {legs: 4, wings: 2,}, joints: {side: {head: {x: 80, y: 30}}},}\n```");
    eq([a1.kind, a1.facing, a1.turn, a1.marks.side.head.join()].join('|'), 'winged|right|270|0.8,0.3', 'JSON descuidado');
    eq(K.readAnswer('{"kind":"Quadruped","limbs":{"legs":8}}').kind, 'spider', 'ocho patas: araña');
    eq(K.readAnswer('{"kind":"duck"}').kind, 'bird'); eq(K.readAnswer('{"kind":"sports car"}').kind, 'object', 'lo desconocido: un objeto');
    eq(K.readAnswer('It is a jellyfish, facing: back').kind, 'octopus', 'sin JSON: las palabras');
    let threw = ''; try { K.readAnswer('no sé'); } catch (e) { threw = e.message; } eq(threw, 'EMPTY', 'sin nada útil: error');
    // The dialog, with a bird-like model: it guesses a bird; the AI says a dragon facing right.
    const [, boxes] = KIND_MODELS.bird, src = boxModel(W, A, boxes);
    R.store.commit(() => { slide().blocks.push({ id: 'rigai', type: 'model', src, x: 100, y: 100, w: 300, h: 300, rotation: 0, animation: null }); });
    const calls = [];
    let reply = () => new W.Response(JSON.stringify({ choices: [{ message: { content: "```json\n{kind: 'bird', facing: 'right', limbs: {legs: 2, wings: 2}, joints: {side: {head: [0.85, 0.2]}, front: {wingTipL: [0.95, 0.45]}},}\n```" } }], usage: { cost: 0.00012 } }));
    W.fetch = async (url, o) => { if (String(url).includes('openrouter.ai/api/v1/chat')) { calls.push(JSON.parse(o.body)); return reply(calls.length); } return realFetch(url, o); };
    try {
      W.localStorage.removeItem(KEY);
      const Dl = await W.eval("import('/src/ui/dialogs/autorig.js')"), dlg = await Dl.openAutoRig(slide().blocks.at(-1));
      eq(dlg.kind, 'bird', 'adivina un pájaro por su forma');
      eq(D.querySelector('#rig-modal [data-kind][aria-checked="true"]').dataset.kind, 'bird', 'y lo deja elegido');
      assert(/Pájaro/.test(D.querySelector('#rig-modal .rig-guess-txt').textContent), 'dice lo que parece');
      eq(D.querySelectorAll('#rig-modal .rig-kinds [data-kind]').length, Object.keys(A.KINDS).length, 'todos los tipos para elegir');
      // Without AI: how to turn it on.
      D.querySelector('#rig-modal .rig-ai').click(); await sleep(20);
      assert(D.querySelector('#rig-modal .rig-ai-msg .rig-ai-on') && !calls.length, 'sin IA: explica cómo conectarla');
      // With AI, privacy not yet accepted: asks first.
      W.localStorage.setItem(KEY, JSON.stringify({ key: 'sk-test' }));
      D.querySelector('#rig-modal .rig-ai').click(); await sleep(30);
      const ok = D.querySelector('.modal-backdrop:last-child .dlg-ok'); assert(ok && /tres imágenes/.test(D.querySelector('.dlg-msg').textContent), 'avisa de lo que se envía');
      ok.click();
      for (let i = 0; i < 60 && dlg.kind === 'bird' && !/Coste/.test(D.querySelector('#rig-modal .rig-ai-msg').textContent); i++) await sleep(50);
      eq(calls.length, 1, 'una petición');
      const body = calls[0], imgs = body.messages[1].content.filter(c => c.type === 'image_url');
      eq(body.model, 'google/gemini-2.5-flash-lite', 'con el modelo barato que ve imágenes');
      assert(imgs.length === 3 && imgs.every(c => /^data:image\/jpeg;base64,/.test(c.image_url.url) && c.image_url.url.length < 120000), 'tres vistas pequeñas');
      assert(JSON.parse(W.localStorage.getItem(KEY)).accepted, 'el aviso queda aceptado');
      eq([dlg.kind, dlg.yaw].join(), 'bird,270', 'la IA elige el tipo y gira el modelo para que mire de frente');
      assert(/\$0\.0001/.test(D.querySelector('#rig-modal .rig-ai-msg').textContent), 'muestra lo que costó');
      assert(dlg.joints.head && Number.isFinite(dlg.joints.head[0]), 'las articulaciones, a partir de sus puntos');
      for (let i = 0; i < 40 && !dlg.built; i++) await sleep(50);
      assert(/^data:model\/gltf-binary/.test(dlg.built), 'se prepara el modelo');
      // The vision model fails: the usual one instead.
      calls.length = 0;
      reply = n => (n === 1 ? new W.Response('{"error":"no such model"}', { status: 400 }) : new W.Response(JSON.stringify({ choices: [{ message: { content: '{"kind":"fish","facing":"front"}' } }] })));
      D.querySelector('#rig-modal .rig-ai').click();
      for (let i = 0; i < 60 && dlg.kind !== 'fish'; i++) await sleep(50);
      eq(calls.map(c => c.model).join(), 'google/gemini-2.5-flash-lite,openrouter/auto', 'si falla, con el modelo de siempre');
      eq(dlg.kind, 'fish', 'y vale su respuesta');
      eq(dlg.view, 'side', 'el pez, de lado');
      D.querySelector('#rig-modal .modal-close').click();
    } finally { W.fetch = realFetch; if (saved == null) W.localStorage.removeItem(KEY); else W.localStorage.setItem(KEY, saved); }
  });

  await test('esqueleto automático: modelos comprimidos (Draco, meshopt), cuantizados y con archivos aparte', async () => {
    reset(); const W = frame.contentWindow, dir = '/tests/fixtures/autorig/';
    const A = await W.eval("import('/src/features/content/autorig.js')"), G = await W.eval("import('/src/features/content/gltf.js')");
    const verts = s => s.parts.reduce((n, p) => n + p.pos.length / 3, 0), tris = s => s.parts.reduce((n, p) => n + p.idx.length / 3, 0);
    const near = (a, b, d) => a.box.min.concat(a.box.max).every((v, i) => Math.abs(v - b.box.min.concat(b.box.max)[i]) < d);
    // Plain glTF: one buffer with everything inside, float positions, no compression left, references that hold.
    const SIZE = { 5126: 4, 5125: 4, 5123: 2, 5122: 2, 5121: 1, 5120: 1 };
    const valid = (g, name) => {
      const j = g.json, bad = [];
      if (j.buffers?.length !== 1 || j.buffers[0].uri != null || j.buffers[0].byteLength !== g.bin.length) bad.push('buffers');
      for (const e of [...(j.extensionsUsed || []), ...(j.extensionsRequired || [])]) if (/draco|meshopt|quantization|basisu/i.test(e)) bad.push(e);
      for (const [k, v] of Object.entries(j)) if (Array.isArray(v) && !v.length) bad.push(k + ' vacío');
      j.bufferViews.forEach((v, i) => { if (v.buffer !== 0 || v.byteOffset + v.byteLength > g.bin.length || v.extensions) bad.push('vista ' + i); });
      j.accessors.forEach((a, i) => {
        if (a.bufferView == null) return;
        const v = j.bufferViews[a.bufferView], size = SIZE[a.componentType] * G.COMPS[a.type];
        if (!v || (a.byteOffset || 0) + (v.byteStride || size) * (a.count - 1) + size > v.byteLength) bad.push('accessor ' + i);
      });
      for (const p of j.meshes.flatMap(m => m.primitives)) {
        if (p.extensions) bad.push('primitiva comprimida');
        for (const [k, i] of Object.entries(p.attributes)) {
          const a = j.accessors[i]; if (!a || a.bufferView == null) { bad.push(k + ' sin datos'); continue; }
          if (/^(POSITION|NORMAL|TANGENT)$/.test(k) && a.componentType !== 5126) bad.push(k + ' sin float');
          if (k === 'POSITION' && !a.min) bad.push('POSITION sin min/max');
        }
      }
      const texRefs = []; const walk = o => { for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') { if (/Texture$/.test(k)) texRefs.push(v.index); else walk(v); } };
      (j.materials || []).forEach(walk);
      if (texRefs.some(i => !j.textures?.[i])) bad.push('textura que no existe');
      for (const t of j.textures || []) if (!j.images?.[t.source]) bad.push('textura sin imagen');
      for (const im of j.images || []) if (im.uri != null || im.bufferView == null || !/^image\/(png|jpeg|webp)$/.test(im.mimeType)) bad.push('imagen');
      eq(bad.join(), '', name + ': glTF válido y sin comprimir');
    };
    const src = await A.readModel(dir + 'person.glb'), s0 = A.modelShape(src);
    for (const f of ['draco', 'meshopt', 'quant']) {
      const steps = [], g = await A.readModel(dir + `person-${f}.glb`, { onStep: s => steps.push(s) }), s = A.modelShape(g);
      eq(steps.join(), f === 'quant' ? '' : 'decode', f + ': avisa mientras descomprime');
      eq(verts(s) + '/' + tris(s), verts(s0) + '/' + tris(s0), f + ': los mismos vértices y triángulos');
      assert(near(s, s0, 0.002), f + ': las mismas medidas');
      valid(g, f);
      const tex = g.json.materials[0].pbrMetallicRoughness.baseColorTexture;
      assert(tex && g.json.images[g.json.textures[tex.index].source].mimeType === 'image/png', f + ': conserva el material y su textura');
      // Rigged: still plain, with the texture and the coordinates it needs.
      const J = A.proposeJoints(s, 'person'), g2 = await G.readModel(A.buildRig(g, s, 'person', J));
      valid(g2, f + ' con esqueleto');
      const p = g2.json.meshes[g2.json.nodes.find(n => n.skin === 0).mesh].primitives[0];
      assert(p.attributes.JOINTS_0 != null && p.attributes.TEXCOORD_0 != null && g2.json.animations.length > 3 && g2.json.images.length === 1, f + ': con huesos, animaciones y textura');
    }
    // A .gltf with its .bin and picture next to it: fetched and packed inside.
    const steps = [], ge = await A.readModel(dir + 'ext/person.gltf', { onStep: s => steps.push(s) }), se = A.modelShape(ge);
    eq(steps.join(), 'fetch', 'archivos aparte: los descarga');
    assert(verts(se) === verts(s0) && near(se, s0, 1e-6), 'archivos aparte: el mismo modelo');
    valid(ge, 'archivos aparte'); assert(ge.json.images.length === 1, 'con su textura dentro');
    // …but from a file (a data: URL) there is nowhere to fetch them from.
    const text = await (await W.fetch(dir + 'ext/person.gltf')).text();
    eq(await A.readModel('data:model/gltf+json;base64,' + W.btoa(text)).then(() => '', e => e.message), 'external', 'sin dirección: lo dice');
    // GPU textures (KTX2) without a fallback, and a picture not found: out, with a note; the rest stays.
    const j = structuredClone(src.json);
    j.images.push({ uri: 'cara.ktx2', mimeType: 'image/ktx2' }, { uri: 'no-esta.png' });
    j.textures.push({ extensions: { KHR_texture_basisu: { source: 1 } } }, { source: 2 }, { source: 0, extensions: { KHR_texture_basisu: { source: 1 } } });
    Object.assign(j.materials[0], { normalTexture: { index: 1 }, emissiveTexture: { index: 2 }, occlusionTexture: { index: 3 } });
    j.extensionsUsed = ['KHR_texture_basisu']; j.extensionsRequired = ['KHR_texture_basisu'];
    const gk = await A.readModel(A.writeGLB({ json: j, bin: src.bin }));
    eq(gk.notes.slice().sort().join(), 'basisu,images', 'texturas que no se pueden leer: avisa');
    const m = gk.json.materials[0];
    assert(!m.normalTexture && !m.emissiveTexture && m.occlusionTexture && m.pbrMetallicRoughness.baseColorTexture, 'quita esas y deja las que tienen otra imagen');
    eq(gk.json.textures.length + '/' + gk.json.images.length, '2/1', 'sin texturas ni imágenes de sobra');
    valid(gk, 'KTX2');
    // The dialog: a note while unpacking, then the skeleton as always.
    const seen = [], mo = new W.MutationObserver(() => D.querySelectorAll('#toasts .toast.busy').forEach(x => seen.push(x.textContent)));
    mo.observe(D.body, { childList: true, subtree: true });
    R.store.commit(() => { slide().blocks.push({ id: 'rigz', type: 'model', src: dir + 'person-draco.glb', x: 100, y: 100, w: 300, h: 300, rotation: 0, animation: null }); });
    const Dl = await W.eval("import('/src/ui/dialogs/autorig.js')"), dlg = await Dl.openAutoRig(slide().blocks.at(-1));
    mo.disconnect();
    assert(seen.some(x => /Descomprimiendo el modelo/.test(x)), 'el diálogo avisa mientras descomprime');
    assert(!D.querySelector('#toasts .toast.busy:not(.out)'), 'y el aviso se va');
    eq(dlg.kind, 'person', 'reconoce la persona');
    for (let i = 0; i < 40 && !dlg.built; i++) await sleep(50);
    assert(dlg.built?.startsWith('data:model/gltf-binary'), 'prepara el modelo con esqueleto');
    D.querySelector('#rig-modal .modal-close').click();
  });

  await test('recursos: stickers animados, GIF, 3D (biblioteca, Poly Haven empaquetado, Sketchfab)', async () => {
    reset(); const W = frame.contentWindow, realFetch = W.fetch;
    const Rz = await W.eval("import('/src/features/content/resources.js')");
    const gif = 'R0lGODlhAQABAAAAACw='; const bin = u8 => new W.Response(new W.Blob([u8]));
    const calls = [];
    W.fetch = async (url, o) => { url = String(url); calls.push(url);
      if (url.includes('notoemoji')) return bin(Uint8Array.from(atob(gif), c => c.charCodeAt(0)));
      if (url.endsWith('.glb')) return bin(new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]));
      if (url.includes('api.polyhaven.com/assets')) return new W.Response(JSON.stringify({ Chair_1: { name: 'Silla 1', categories: ['furniture'], tags: ['chair', 'wood'], authors: { Ana: 'All' } } }));
      if (url.includes('api.polyhaven.com/files')) return new W.Response(JSON.stringify({ gltf: { '1k': { gltf: { url: 'https://dl.test/m/chair.gltf', include: { 'textures/t.jpg': { url: 'https://dl.test/real/t.jpg' }, 'chair.bin': { url: 'https://dl.test/real/chair.bin' } } } } } }));
      if (url === 'https://dl.test/m/chair.gltf') return new W.Response(JSON.stringify({ asset: { version: '2.0' }, buffers: [{ uri: 'chair.bin', byteLength: 3 }], images: [{ uri: 'textures/t.jpg' }] }));
      if (url.startsWith('https://dl.test/real/')) return bin(new Uint8Array([1, 2, 3]));
      if (url.includes('api.sketchfab.com')) return new W.Response(JSON.stringify({ cursors: { next: 'n2' }, results: [{ uid: 'abc123', name: 'Robot', user: { displayName: 'Eva' }, animationCount: 2, license: { label: 'CC Attribution' }, thumbnails: { images: [{ width: 256, url: 'https://t/1.jpg' }] } }] }));
      return realFetch(url, o); };
    try {
      assert(Rz.searchStickers('').length > 80, 'catálogo de stickers'); assert(Rz.searchStickers('corazon').some(x => x.code === '2764_fe0f'), 'buscar sin tildes');
      const st = await Rz.insertSticker('1f389', 'fiesta confeti party');
      assert(st.type === 'image' && /^data:image\/gif/.test(st.src) && /CC BY 4\.0/.test(st.credit), 'el sticker es un GIF con su crédito');
      const { isGif, needsPlayer } = await W.eval("import('/src/features/live/media.js')");
      assert(isGif(st), 'se puede animar por tramos como cualquier GIF');
      const fox = Rz.searchLibrary3D('zorro')[0]; assert(fox?.animated, 'biblioteca 3D con modelos animados');
      assert(Rz.searchLibrary3D('', { animated: true }).every(m => m.animated) && !Rz.searchLibrary3D('').some(m => /NC|EULA|SCEA|Stanford/.test(m.licenses.join())), 'sin licencias restrictivas');
      const m = await Rz.insertLibraryModel(fox);
      assert(m.type === 'model' && /^data:model\/gltf-binary/.test(m.src) && m.clip === 'Survey' && /CC/.test(m.caption), 'modelo animado guardado dentro, en reposo y con su licencia');
      eq(JSON.stringify(slide().blocks.find(x => x.id === m.id).walk), '{"clip":"Walk","end":"","endOnce":true,"face":true,"look":true}', 'y anda cuando se mueve');
      const knights = Rz.searchLibrary3D('caballero'); assert(knights[0]?.walk && knights[0].licenses.join() === 'CC0-1.0' && /^assets\//.test(knights[0].thumb), 'personajes nuevos (CC0, miniatura propia)');
      const ph = await Rz.searchPolyHaven('wood chair'); eq(ph.length, 1, 'Poly Haven por etiquetas');
      const p = await Rz.insertPolyHaven(ph[0]);
      const g = JSON.parse(atob(p.src.split(',')[1]));
      assert(/^data:/.test(g.buffers[0].uri) && /^data:/.test(g.images[0].uri), 'glTF empaquetado en un solo archivo (buffers y texturas dentro)');
      assert(calls.includes('https://dl.test/real/t.jpg'), 'descarga las texturas de su dirección real'); assert(/CC0/.test(p.caption), 'CC0');
      const sf = await Rz.searchSketchfab('robot', { animated: true });
      assert(calls.some(u => u.includes('animated=true')), 'filtra animados'); eq(sf.next, 'n2', 'más resultados');
      const e = Rz.insertSketchfab(sf.results[0]);
      assert(e.type === 'embed' && /sketchfab\.com\/models\/abc123\/embed/.test(e.src) && /Eva/.test(e.caption), 'Sketchfab como visor con su autor');
      // The side panel (like Canva): stickers without typing; a click adds and it stays open.
      D.querySelector('[data-action="resources"]').click(); await sleep(50);
      const P = () => D.getElementById('elements-panel');
      assert(P() && !D.querySelector('.modal-backdrop'), 'es un panel al lado, no una ventana encima');
      assert(P().nextElementSibling === D.getElementById('canvas-wrap'), 'a la izquierda de la diapositiva, por defecto');
      P().querySelector('[data-et="stickers"]').click(); await sleep(50);
      assert(P().querySelectorAll('.sk-item').length > 80, 'la pestaña de stickers se ve sin buscar');
      const bad = P().querySelectorAll('.sk-item img')[5]; bad.dispatchEvent(new W.Event('error'));
      assert(!bad.isConnected && P().querySelectorAll('.sk-item')[5].querySelector('.el-noimg'), 'una vista previa que no carga no sale como imagen rota');
      const n0 = slide().blocks.length; P().querySelector('.sk-item').click(); await sleep(150);
      eq(slide().blocks.length, n0 + 1, 'clic: se añade'); assert(P(), 'y el panel sigue abierto para seguir buscando');
      P().querySelectorAll('.sk-item')[1].click(); await sleep(150); eq(slide().blocks.length, n0 + 2, 'otro más');
      // Drag a result onto the slide: it lands there, in one undo step.
      const it = P().querySelectorAll('.sk-item')[2], stage = D.getElementById('stage'), sr = stage.getBoundingClientRect();
      const dt = new W.DataTransfer();
      it.dispatchEvent(new W.DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      const k = 1280 / sr.width, cx = sr.left + 300 / k, cy = sr.top + 200 / k;
      const over = new W.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: cx, clientY: cy }); stage.dispatchEvent(over);
      assert(over.defaultPrevented, 'la diapositiva acepta soltarlo');
      stage.dispatchEvent(new W.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: cx, clientY: cy })); await sleep(200);
      const dropped = slide().blocks.at(-1);
      eq(slide().blocks.length, n0 + 3, 'arrastrar: se añade');
      assert(Math.abs(dropped.x + dropped.w / 2 - 300) < Math.max(3, k * 1.5) && Math.abs(dropped.y + dropped.h / 2 - 200) < Math.max(3, k * 1.5), 'donde se suelta (a menos de un píxel de pantalla)');
      R.store.undo(); await sleep(20); eq(slide().blocks.length, n0 + 2, 'un solo paso de deshacer');
      // Tabs that need words: ideas to start with; nothing leaves until one is chosen.
      const S = await W.eval("import('/src/features/content/stock.js')"); S.giveConsent('sketchfab');
      const before = calls.length; P().querySelector('[data-et="sketchfab"]').click(); await sleep(20);
      const idea = P().querySelector('.el-ideas [data-idea="robot"]');
      assert(idea && idea.textContent === 'Robot' && calls.length === before, 'sugerencias, sin buscar todavía');
      idea.click(); await sleep(80);
      assert(calls.slice(before).some(u => u.includes('api.sketchfab.com') && /q=robot/.test(u)), 'la sugerencia busca en inglés');
      eq(P().querySelector('.sk-q').value, 'robot', 'y queda escrita en la caja'); assert(P().querySelector('.sk-item'), 'con resultados');
      // A library model with a brand's logo (the watch: Khronos' and DGG's, this one also under copyright): said on its
      // tile, and once added; one without, nothing.
      const watch = Rz.searchLibrary3D('reloj')[0], mk = Rz.brandMarks(watch);
      assert(mk && mk.names.join() === 'DGG,Khronos' && mk.copyright, 'marcas del reloj, una con derechos de autor: ' + JSON.stringify(mk));
      assert(Rz.brandMarks(Rz.searchLibrary3D('gafas')[0])?.copyright === false && !Rz.brandMarks(fox), 'las gafas, logotipo sin derechos de autor; el zorro, ninguno');
      P().querySelector('[data-et="anim3d"]').click(); await sleep(20);
      P().querySelector('.sk-q').value = 'reloj'; P().querySelector('.sk-go').click(); await sleep(50);
      const tile = P().querySelector('.sk-item');
      assert(tile && /™/.test(tile.textContent) && /DGG, Khronos/.test(tile.title) && /derechos de autor/.test(tile.title), 'en el resultado: ™ y por qué: ' + tile?.title);
      tile.click(); await sleep(150);
      assert([...D.querySelectorAll('#toasts .toast')].some(x => /logotipo de DGG, Khronos/.test(x.textContent)), 'y al añadirlo, el aviso');
      // Other side, remembered; the same button again closes it.
      P().querySelector('.el-side').click(); await sleep(20);
      assert(P().classList.contains('right') && !P().nextElementSibling?.id?.includes('canvas'), 'se pasa a la derecha');
      const res = () => D.querySelector('[data-action="resources"]');
      res().click(); res().click(); await sleep(20); assert(!P(), 'el mismo botón otra vez lo cierra');
      res().click(); await sleep(20); assert(P()?.classList.contains('right'), 'recuerda el lado');
      P()?.querySelector('.cm-close').click(); assert(!P(), 'se cierra');
      W.localStorage.removeItem('revela.elements.side'); W.localStorage.removeItem('revela.consent.sketchfab');
    } finally { W.fetch = realFetch; D.getElementById('elements-panel')?.querySelector('.cm-close')?.click(); }
  });

  await test('3D: animación propia, giro y movimiento al entrar (editor y presentación)', async () => {
    reset(); const W = frame.contentWindow;
    const M = await W.eval("import('/src/features/content/model3d.js')");
    R.blocks.addModel('data:model/gltf-binary;base64,Z2xURg=='); const b = last();
    const attrs = x => Object.fromEntries(M.modelAttrs(x));
    assert('auto-rotate' in attrs(b) && !('autoplay' in attrs(b)), 'por defecto gira solo');
    R.store.commit(() => Object.assign(last(), { clip: 'Run', clipSpeed: 2, clipOnce: true, spin: -60, motion: 'swing' })); await sleep(30);
    const a = attrs(last());
    assert(a.autoplay === '' && a['animation-name'] === 'Run' && a['data-speed'] === '2' && 'data-once' in a, 'animación elegida, velocidad y una vez');
    assert(!('auto-rotate' in a) && a['data-motion'] === 'swing', 'con movimiento de cámara no gira solo');
    const mv = D.querySelector(`#stage .block[data-id="${b.id}"] model-viewer`);
    assert(mv.getAttribute('animation-name') === 'Run' && mv.getAttribute('data-motion') === 'swing' && !mv.hasAttribute('auto-rotate'), 'el editor lo aplica sin recrear el visor');
    const html = R.io.buildHTML();
    assert(/<model-viewer[^>]*animation-name="Run"[^>]*data-motion="swing"/.test(html) && /function model3dRuntime/.test(html), 'la presentación lleva la animación y el movimiento');
    R.store.commit(() => { delete last().motion; delete last().clip; last().spin = 45; }); await sleep(30);
    assert(/rotation-per-second="45deg"/.test(R.io.buildHTML()) && /model3dRuntime/.test(R.io.buildHTML()), 'giro a su velocidad (y el script, para que siga en la diapositiva siguiente)');
    // The dialog.
    const { openModel3D } = await W.eval("import('/src/ui/dialogs/model3d.js')");
    await openModel3D(last()); await sleep(50);
    const q = s => D.querySelector('#m3d-modal ' + s);
    q('.m3d-motion').value = 'orbit'; q('.m3d-rot').checked = false; q('.m3d-ok').click(); await sleep(30);
    eq(last().motion, 'orbit', 'el diálogo guarda el movimiento'); eq(last().autoRotate, false, 'y el giro');
  });

  await test('Excel (.xlsx): sus hojas como tabla o como datos de un gráfico', async () => {
    reset(); const W = frame.contentWindow;
    const JSZip = W.JSZip || (await W.eval(`import('${R.vendor.JSZIP_ESM}')`)).default, z = new JSZip();
    const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    z.file('xl/workbook.xml', `<workbook ${ns}><sheets><sheet name="Ventas" sheetId="1" r:id="rId1"/><sheet name="Oculta" sheetId="2" state="hidden" r:id="rId2"/><sheet name="Notas" sheetId="3" r:id="rId3"/><sheet name="Vacía" sheetId="4" r:id="rId4"/></sheets></workbook>`);
    z.file('xl/_rels/workbook.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="/xl/worksheets/sheet3.xml"/><Relationship Id="rId4" Target="worksheets/sheet4.xml"/></Relationships>`);
    z.file('xl/sharedStrings.xml', `<sst ${ns}><si><t>Mes</t></si><si><t>Ventas</t></si><si><r><t>Ene</t></r><r><t>ro</t></r></si><si><t>Fecha</t></si></sst>`);
    z.file('xl/styles.xml', `<styleSheet ${ns}><numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="14"/></cellXfs></styleSheet>`);
    z.file('xl/worksheets/sheet1.xml', `<worksheet ${ns}><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>3</v></c></row>
      <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>0.30000000000000004</v></c><c r="C2" s="1"><v>46303</v></c></row>
      <row r="3"><c r="A3" t="inlineStr"><is><t>Feb</t></is></c><c r="B3"><f>B2*2</f><v>12</v></c><c r="C3" t="b"><v>1</v></c><c r="E3" t="str"><v>fórmula</v></c></row>
      <row r="5"><c r="A5" t="s"><v>0</v></c></row></sheetData></worksheet>`);
    z.file('xl/worksheets/sheet2.xml', `<worksheet ${ns}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>secreto</t></is></c></row></sheetData></worksheet>`);
    z.file('xl/worksheets/sheet3.xml', `<worksheet ${ns}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Nota</t></is></c><c r="B1"><v>7</v></c></row></sheetData></worksheet>`);
    z.file('xl/worksheets/sheet4.xml', `<worksheet ${ns}><sheetData/></worksheet>`);
    const data = await z.generateAsync({ type: 'arraybuffer' });
    const X = await W.eval("import('/src/io/formats/xlsx-import.js')"), sheets = await X.readXlsx(data);
    eq(sheets.map(s => s.name).join(), 'Ventas,Notas', 'las hojas con datos (no las ocultas ni las vacías)');
    eq(JSON.stringify(sheets[0].rows), JSON.stringify([['Mes', 'Ventas', 'Fecha', '', ''], ['Enero', '0.3', '2026-10-08', '', ''], ['Feb', '12', 'TRUE', '', 'fórmula'], ['', '', '', '', ''], ['Mes', '', '', '', '']]),
      'textos compartidos (también con formato), números sin ruido, fechas, verdadero, el último valor de las fórmulas, y su sitio en la cuadrícula');
    eq(X.cellRef('BC12').col + ',' + X.cellRef('BC12').row, '54,11', 'referencias de celda');
    // A workbook with two sheets: which one; then a table (or a chart's data) from it.
    const S = await W.eval("import('/src/ui/dialogs/sheets.js')"), file = new W.File([data], 'datos.xlsx');
    const got = S.sheetText(file); for (let i = 0; i < 40 && !D.getElementById('sheet-modal'); i++) await sleep(25);
    const pick = D.getElementById('sheet-modal'); assert(pick && /Ventas[\s\S]*5 × 5/.test(pick.textContent), 'con varias hojas, pregunta cuál (con su tamaño)');
    pick.querySelector('[data-i="1"]').click(); eq(await got, 'Nota\t7', 'la hoja elegida, como texto con tabuladores');
    const csv = await S.sheetText(new W.File(['a;b\n1;2'], 'x.csv', { type: 'text/csv' })); eq(csv, 'a;b\n1;2', 'un CSV, tal cual');
    const tb = R.blocks.addTableFromText(X.rowsToTSV(sheets[0].rows)); eq(tb.rows[1].slice(0, 3).join('|'), 'Enero|0.3|2026-10-08', 'una tabla desde la hoja');
    assert(D.querySelector('[data-action="insert-table-csv"]') && /Excel/.test(D.querySelector('[data-action="insert-table-csv"]').textContent), 'el botón dice Excel o CSV');
  });

  await test('tablas desde CSV y pegar en la diapositiva', async () => {
    reset();
    const rows = R.blocks.parseDelimited('Nombre;Nota\n"Pérez; Ana";9,5\n"Dice ""hola""";7\n');
    eq(JSON.stringify(rows), JSON.stringify([['Nombre', 'Nota'], ['Pérez; Ana', '9,5'], ['Dice "hola"', '7']]), 'CSV con ; comillas y separador dentro');
    const tb = R.blocks.addTableFromText('a,b\n<x>,2'); eq(tb.rows[1][0], '&lt;x&gt;', 'celdas escapadas'); assert(tb.header, 'primera fila como encabezado');
    const W = frame.contentWindow, n0 = slide().blocks.length;
    const paste = (type, data) => { const dt = new W.DataTransfer(); dt.setData(type, data); D.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); };
    D.activeElement?.blur?.(); paste('text/plain', 'Mes\tVentas\nEne\t10\nFeb\t12'); await sleep(10);
    eq(slide().blocks.length, n0 + 1, 'pegar celdas crea una tabla'); eq(last().type, 'table'); eq(last().rows.length, 3, 'tres filas');
    paste('text/plain', 'Hola\nmundo'); await sleep(10);
    eq(last().type, 'text', 'pegar texto crea un cuadro'); eq(last().html, 'Hola<br>mundo', 'saltos de línea');
  });

  await test('copiar, cortar y pegar objetos (teclado, cinta, menú y entre pestañas)', async () => {
    reset(); const W = frame.contentWindow, C = R.clipboard;
    const [a, b] = slide().blocks; R.store.setMulti([a.id, b.id]); R.blocks.addConnector();
    R.store.setMulti([a.id, b.id]); R.render(); await sleep(10);
    assert(!D.querySelector('[data-action="clip-copy"]').disabled, 'Copiar activo con selección');
    D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    assert(C.hasClipboard(), 'Ctrl+C copia'); eq(C.clipboardData().blocks.length, 3, 'dos objetos y su conector');
    D.querySelector('[data-action="clip-paste"]').click(); await sleep(10);
    const s = slide(); eq(s.blocks.length, 6, 'pegado en la misma diapositiva');
    const pa = s.blocks[3]; eq(pa.x, a.x + 24, 'desplazado para no tapar el original');
    const pc = s.blocks.find((x, i) => i >= 3 && x.type === 'connector');
    assert(pc.from === s.blocks[3].id && pc.to === s.blocks[4].id, 'el conector une las copias');
    D.querySelector('[data-action="clip-paste"]').click(); await sleep(10);
    eq(slide().blocks[6].x, a.x + 48, 'segundo pegado, más desplazado');
    R.slides.addSlide('blank'); await sleep(10);
    const dt = new W.DataTransfer(); dt.setData('text/plain', 'revela-objects:' + JSON.stringify(C.clipboardData()));
    D.activeElement?.blur?.(); D.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); await sleep(10);
    eq(slide().blocks.length, 3, 'Ctrl+V en otra diapositiva'); eq(slide().blocks[0].x, a.x, 'misma posición en otra diapositiva');
    // Otra pestaña: el portapapeles del sistema trae los objetos marcados.
    const other = JSON.stringify({ from: 'otra', blocks: [{ id: 'z', type: 'shape', shape: 'star', x: 10, y: 10, w: 50, h: 50 }] });
    const dt2 = new W.DataTransfer(); dt2.setData('text/plain', 'revela-objects:' + other);
    D.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt2, bubbles: true })); await sleep(10);
    eq(last().shape, 'star', 'pegado desde otra pestaña'); assert(last().id !== 'z', 'con id nuevo');
    select(last()); D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'x', ctrlKey: true, bubbles: true })); await sleep(10);
    assert(!slide().blocks.some(x => x.shape === 'star'), 'Ctrl+X corta');
    // Menú contextual (también el de pulsación larga en móvil)
    const el = D.querySelector(`#stage .block[data-id="${slide().blocks[0].id}"]`);
    el.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: 20, clientY: 20 }));
    const items = [...D.querySelectorAll('.ctx-item')].map(x => x.textContent + (x.disabled ? '(off)' : ''));
    assert(items.includes('Copiar') && items.includes('Cortar') && items.includes('Pegar'), 'Copiar/Cortar/Pegar en el menú: ' + items.slice(0, 5));
    const mr = D.querySelector('.ctx-item').parentElement.getBoundingClientRect();
    assert(mr.top >= 0 && mr.bottom <= frame.contentWindow.innerHeight + 1, 'el menú cabe en la ventana (si no, se desplaza)');
    D.body.click();
  });

  await test('rotación y volteo en el export', async () => {
    reset(); const b = newText(); b.rotation = 30; b.flipH = true;
    assert(/rotate\(30deg\) scaleX\(-1\)/.test(R.io.buildHTML()), 'transform con giro y volteo');
  });

  await test('voltear y restablecer giro', async () => {
    reset(); const b = newText(); R.blocks.flipSelected('h'); assert(b.flipH, 'flipH activado');
    b.rotation = 45; R.blocks.resetRotation(); eq(b.rotation, 0, 'giro a 0'); assert(!b.flipH, 'flip limpiado');
  });

  await test('agrupar / desagrupar: seleccionar uno selecciona el grupo', async () => {
    reset(); R.blocks.addText(); R.blocks.addText();
    const a = slide().blocks.at(-2), b = slide().blocks.at(-1);
    R.store.setMulti([a.id, b.id]); R.blocks.groupSelected();
    assert(a.groupId && a.groupId === b.groupId, 'mismo groupId');
    R.store.selectWithGroup(a.id); eq(R.store.selectedBlocks().length, 2, 'selecciona el grupo');
    R.blocks.ungroupSelected(); assert(!a.groupId && !b.groupId, 'desagrupado');
  });

  await test('opacidad de objeto en lienzo y export', async () => {
    reset(); const b = newText(); R.blocks.setOpacity(50); R.render(); await sleep(10);
    eq(b.opacity, 50, 'opacidad en el modelo');
    assert(/opacity:0\.5/.test(R.io.buildHTML()), 'opacidad en el export');
  });

  await test('bloquear objeto marca la bandera y la clase', async () => {
    reset(); const b = newText(); R.blocks.toggleLock(); await sleep(20);
    assert(b.locked, 'bandera locked');
    assert(D.querySelector(`.block[data-id="${b.id}"].locked`), 'clase locked en el DOM');
    R.blocks.toggleLock(); assert(!b.locked, 'desbloqueado');
  });

  await test('audio: bloque en lienzo y export', async () => {
    reset(); R.blocks.addAudio('data:audio/mp3;base64,AAA'); const b = last(); select(b); await sleep(20);
    assert(D.querySelector(`.block[data-id="${b.id}"] audio`), 'audio en el lienzo');
    assert(/<audio[^>]*controls/.test(R.io.buildHTML()), 'audio en el export');
  });

  await test('tabla: combinar y separar celdas', async () => {
    reset(); R.blocks.addTable(); const b = last(); select(b); await sleep(20);
    b.rows[0][0] = 'A'; b.rows[0][1] = 'B';
    R.blocks.tableMerge(0, 0, 'right'); await sleep(20);
    eq(JSON.stringify(b.merges), JSON.stringify([{ r: 0, c: 0, rs: 1, cs: 2 }]), 'merge registrado');
    eq(b.rows[0][0], 'A B', 'textos unidos');
    const td = D.querySelector(`.block[data-id="${b.id}"] td[data-r="0"][data-c="0"]`);
    eq(td.colSpan, 2, 'colspan en el lienzo');
    assert(!D.querySelector(`.block[data-id="${b.id}"] td[data-r="0"][data-c="1"]`), 'celda cubierta omitida');
    assert(/<td colspan="2">A B<\/td>/.test(R.io.buildHTML()), 'colspan en el export');
    R.blocks.tableMerge(0, 1, 'down'); await sleep(20);                // desde una celda cubierta: crece el grupo
    eq(JSON.stringify(b.merges), JSON.stringify([{ r: 0, c: 0, rs: 2, cs: 2 }]), 'crece hacia abajo');
    assert(/<td colspan="2" rowspan="2">/.test(R.io.buildHTML()), 'rowspan en el export');
    while (b.rows[0].length > 1) R.blocks.tableDelCol(); await sleep(20); // recorta el merge al quitar columnas
    eq(JSON.stringify(b.merges), JSON.stringify([{ r: 0, c: 0, rs: 2, cs: 1 }]), 'merge recortado');
    R.blocks.tableSplit(1, 0); await sleep(20);
    assert(!b.merges, 'separado');
    eq(D.querySelectorAll(`.block[data-id="${b.id}"] td`).length, b.rows.length * b.rows[0].length, 'todas las celdas');
  });

  await test('tabla: sombreado de celdas (cinta, menú, deshacer, estilos, guardar, exportar y contraste)', async () => {
    reset(); const W = frame.contentWindow;
    const tb = R.blocks.addTableFromText('Mes,Ventas,Coste\nEne,10,6\nFeb,12,7\nMar,9,5'); select(tb); await sleep(20);
    R.blocks.setTableStyle({ banded: true, band: '#3f6497', headBg: '#112233', headFg: '#ffffff' }); await sleep(20);
    assert(tb.header && tb.banded, 'tabla con encabezado y bandas');
    const el = () => D.querySelector(`#stage .block[data-id="${tb.id}"]`), td = (r, c) => el().querySelector(`td[data-r="${r}"][data-c="${c}"]`);
    const bgOf = (r, c) => getComputedStyle(td(r, c)).backgroundColor;
    const ctxBtn = name => [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => x.querySelector('span')?.textContent === name);
    const picker = () => D.querySelector('#ribbon [data-page="ctx"] label.color[title="Sombreado de celda"] input[type=color]');
    // In the table's tab, where PowerPoint has it (Table Design ▸ Shading): the colour picker, «Sin relleno» and «Del estilo».
    assert([...D.querySelectorAll('#ribbon [data-page="ctx"] .group > label')].some(l => l.textContent === 'Sombreado'), 'grupo Sombreado en la pestaña Tabla');
    assert(picker() && ctxBtn('Sin relleno') && ctxBtn('Del estilo'), 'selector de color, Sin relleno y Del estilo');
    picker().dispatchEvent(new W.PointerEvent('pointerdown', { bubbles: true }));
    eq(picker().getAttribute('list'), 'theme-swatches', 'el selector ofrece los colores del tema, como los demás');
    // Writing in a cell: the command is for that cell; dragging across, for the block of cells (tinted while picked).
    td(1, 0).dispatchEvent(new W.MouseEvent('mousedown', { bubbles: true, button: 0 }));
    td(1, 0).dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true })); await sleep(30);
    assert(el().classList.contains('editing'), 'escribiendo en la tabla');
    eq(JSON.stringify(R.blocks.tableCellKeys(tb)), '["1,0"]', 'la celda con el cursor');
    td(1, 0).dispatchEvent(new W.MouseEvent('mousedown', { bubbles: true, button: 0 }));
    td(2, 1).dispatchEvent(new W.MouseEvent('mouseover', { bubbles: true, buttons: 1 }));
    W.dispatchEvent(new W.MouseEvent('mouseup', { bubbles: true })); await sleep(20);
    eq(R.blocks.tableCellKeys(tb).join(' '), '1,0 1,1 2,0 2,1', 'arrastrando: un bloque de 2×2 celdas');
    eq(el().querySelectorAll('td.cell-sel').length, 4, 'las cuatro, marcadas en el lienzo');
    // The colour from the ribbon (leaving the cell for the ribbon keeps the cells picked).
    D.activeElement?.blur?.(); await sleep(30);
    assert(!el().classList.contains('editing') && R.blocks.hasTableCells(tb), 'al ir a la cinta siguen elegidas');
    const p = picker(); p.value = '#ff0000'; p.dispatchEvent(new W.Event('change')); await sleep(30);
    eq(JSON.stringify(tb.cellBg), JSON.stringify({ '1,0': '#ff0000', '1,1': '#ff0000', '2,0': '#ff0000', '2,1': '#ff0000' }), 'solo esas cuatro');
    eq(bgOf(1, 0), 'rgb(255, 0, 0)', 'el color propio manda sobre la banda');
    assert(/rgba\(63, 100, 151, 0\.18\)/.test(bgOf(1, 2)), 'las demás celdas siguen con su banda: ' + bgOf(1, 2));
    eq(bgOf(0, 0), 'rgb(17, 34, 51)', 'y el encabezado con el suyo');
    eq(picker().value, '#ff0000', 'la cinta muestra el color de las celdas elegidas');
    // Undo / redo: one step.
    R.store.undo(); await sleep(30);
    const now = () => slide().blocks.find(x => x.id === tb.id);
    assert(!now().cellBg, 'deshacer quita el sombreado'); assert(/rgba\(63, 100, 151, 0\.18\)/.test(bgOf(1, 0)), 'y vuelve la banda');
    R.store.redo(); await sleep(30);
    eq(now().cellBg?.['2,1'], '#ff0000', 'rehacer lo devuelve'); eq(bgOf(2, 1), 'rgb(255, 0, 0)', 'también en el lienzo');
    // «Sin relleno»: no colour, not even the band's; «Del estilo»: the band again.
    const b = now(); select(b); R.blocks.setTableCells(b.id, 3, 0); R.render(); await sleep(20);
    ctxBtn('Sin relleno').click(); await sleep(30);
    eq(b.cellBg['3,0'], 'none', 'sin relleno'); eq(bgOf(3, 0), 'rgba(0, 0, 0, 0)', 'transparente aunque la fila tenga banda');
    assert(ctxBtn('Sin relleno').getAttribute('aria-pressed') === 'true', 'el botón queda pulsado');
    ctxBtn('Del estilo').click(); await sleep(30);
    assert(!('3,0' in b.cellBg), 'del estilo: sin color propio'); assert(/rgba\(63, 100, 151, 0\.18\)/.test(bgOf(3, 0)), 'vuelve la banda');
    // The table selected as a whole (a click on it, not writing): every cell.
    el().dispatchEvent(new W.MouseEvent('mousedown', { bubbles: true, button: 0 })); select(b); await sleep(20);
    assert(!R.blocks.hasTableCells(b), 'un clic en la tabla: toda ella'); eq(R.blocks.tableCellKeys(b).length, 12, 'las 12 celdas');
    eq(R.blocks.cellFillOf(b), null, 'colores distintos: mezcla');
    assert(D.querySelector('#ribbon [data-page="ctx"] label.color[title="Sombreado de celda"]').classList.contains('mixed'), 'la cinta lo muestra mezclado');
    // The right-click menu: «Sombreado de celda…» for the cell right-clicked (the theme's colours, another, none).
    R.blocks.setCellFill(''); await sleep(20);
    td(3, 2).dispatchEvent(new W.MouseEvent('mousedown', { bubbles: true, button: 2 }));
    td(3, 2).dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: 20, clientY: 20 })); await sleep(20);
    const item = [...D.querySelectorAll('.ctx-item')].find(x => x.textContent === 'Sombreado de celda…');
    assert(item, 'opción en el menú contextual de la celda'); item.click(); await sleep(20);
    const sw = [...D.querySelectorAll('#cs-modal [data-cs]')], acc = R.palettes.currentPalette().accents[1].toLowerCase();
    assert(sw.length >= 4 && D.querySelector('#cs-modal input[type=color]') && D.querySelector('#cs-modal [data-cs-none]'), 'colores del tema, otro color y sin relleno');
    sw.find(x => x.dataset.cs === acc).click(); await sleep(30);
    eq(JSON.stringify(b.cellBg), JSON.stringify({ '3,2': acc }), 'solo la celda del clic derecho');
    // A merged cell counts once (its top-left cell); a removed row takes its shading with it.
    R.blocks.tableMerge(1, 0, 'right'); select(b); R.blocks.setTableCells(b.id, 1, 0, 1, 1); R.blocks.setCellFill('#00aa00'); await sleep(20);
    eq(b.cellBg['1,0'], '#00aa00', 'la combinada, por su celda de arriba a la izquierda'); assert(!('1,1' in b.cellBg), 'y no la cubierta');
    R.blocks.tableDelRow(); await sleep(20);
    assert(!('3,2' in b.cellBg), 'al quitar la fila, se va su color');
    R.blocks.tableAddRow(); await sleep(20); assert(/rgba\(63, 100, 151, 0\.18\)/.test(bgOf(3, 2)), 'y la fila nueva no lo recupera: la de su banda');
    // Saved with the document (and opened again).
    R.blocks.setTableCells(b.id, 2, 2); R.blocks.setCellFill('#0000ff'); R.blocks.setTableCells(b.id, 3, 0); R.blocks.setCellFill('none'); await sleep(20);
    const saved = JSON.parse(JSON.stringify(R.state.deck)); R.store.replaceDeck(saved); R.render(); await sleep(30);
    const b2 = slide().blocks.find(x => x.id === tb.id);
    eq(JSON.stringify(b2.cellBg), JSON.stringify({ '1,0': '#00aa00', '2,2': '#0000ff', '3,0': 'none' }), 'guardado y abierto de nuevo'); eq(bgOf(2, 2), 'rgb(0, 0, 255)', 'y se ve');
    // Exports: the presented HTML, the PDF (print), PowerPoint (and back) and OpenDocument.
    const html = R.io.buildHTML();
    assert(/<td colspan="2" style="background:#00aa00;">/.test(html) && html.includes('background:#0000ff;') && html.includes('background:none;'), 'en la presentación');
    const PR = await W.eval("import('/src/io/export/print.js')");
    assert(PR.buildPrintHTML().includes('background:#0000ff;'), 'en el PDF');
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const zip = await W.JSZip.loadAsync(await R.pptx.buildPptxBlob());
    const xs = await Promise.all(Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).map(f => zip.file(f).async('string')));
    const x = xs.find(s => s.includes('<a:tbl>'));
    // (The cells' properties, by row and column; the borders' colours left out.)
    const trs = [...x.matchAll(/<a:tr\b[\s\S]*?<\/a:tr>/g)].map(m => [...m[0].matchAll(/<a:tc\b[\s\S]*?<\/a:tc>/g)].map(c => (c[0].match(/<a:tcPr[\s\S]*?<\/a:tcPr>/) || [''])[0].replace(/<a:ln[LRTB]\b[\s\S]*?<\/a:ln[LRTB]>/g, '')));
    assert(/<a:solidFill><a:srgbClr val="0000FF"\/><\/a:solidFill>/.test(trs[2][2]), 'PPTX: relleno de la celda: ' + trs[2][2]);
    assert(/srgbClr val="00AA00"/.test(trs[1][0]), 'PPTX: el de la combinada');
    assert(/solidFill/.test(trs[3][1]) && !/solidFill/.test(trs[3][0]), 'PPTX: «Sin relleno» sin relleno, aunque su fila tenga banda');
    const back = (await R.pptxImport.importPPTX(new W.File([await zip.generateAsync({ type: 'blob' })], 't.pptx'))).slides.flatMap(s => s.blocks).find(x => x.type === 'table');
    eq([back.cellBg['1,0'], back.cellBg['2,2']].join(), '#00aa00,#0000ff', 'PPTX: y vuelve al importarlo');
    const ODP = await W.eval("import('/src/io/formats/odp.js')"), c = await (await W.JSZip.loadAsync(await ODP.buildODP())).file('content.xml').async('string');
    assert(/draw:fill-color="#0000ff"/.test(c), 'OpenDocument: el color de la celda');
    // Accessibility: the deck's text on a cell of nearly its colour is reported, and «Corregir» makes it readable.
    const fg = '#202020'; R.store.commit(() => { b2.color = '#222222'; b2.cellBg['2,1'] = fg; });
    const iss = R.a11y.checkAccessibility().find(i => i.kind === 'contrast' && i.blockId === b2.id);
    assert(iss && /celdas de la tabla/.test(iss.msg) && parseFloat(iss.extra) < 1.5, 'contraste bajo en la celda: ' + JSON.stringify(iss));
    R.store.commit(() => R.a11y.fixContrast(R.state.deck, iss.slide, b2.id)); await sleep(30);
    assert(!R.a11y.checkAccessibility().some(i => i.kind === 'contrast' && i.blockId === b2.id), 'corregido');
    eq(b2.cellBg['2,1'], fg, 'el sombreado elegido se queda'); assert(/<span style="color:/.test(b2.rows[2][1]), 'cambia el color del texto de esa celda');
    assert(/span/.test(td(2, 1).innerHTML), 'y se ve en el lienzo');
    // A theme colour follows the theme, as the table style's do.
    const a0 = R.palettes.currentPalette().accents[0]; R.store.commit(() => { b2.cellBg['2,2'] = a0; });
    const other = Object.keys(R.palettes.PALETTES).find(k => k !== (R.state.deck.palette || 'revela') && R.palettes.PALETTES[k].accents[0].toLowerCase() !== a0.toLowerCase());
    R.palettes.applyPalette(other); await sleep(20);
    eq(slide().blocks.find(x => x.id === tb.id).cellBg['2,2'].toLowerCase(), R.palettes.PALETTES[other].accents[0].toLowerCase(), 'cambiar los colores del tema cambia el de la celda');
  });

  await test('cuentagotas: aplica el color elegido al objetivo', async () => {
    reset(); R.blocks.addShape('rect'); const b = last(); select(b); await sleep(20);
    R.ribbon.applyPickedColour(D.querySelector('[data-shape-fill]'), '#12ab34'); await sleep(10);
    eq(b.fill, '#12ab34', 'relleno desde el cuentagotas');
    if ('EyeDropper' in frame.contentWindow) assert(D.querySelector('.eyedrop[data-eyedrop="[data-shape-fill]"]'), 'botón junto al selector');
  });

  await test('web que no se deja incrustar: tarjeta con enlace en el lienzo y el export', async () => {
    reset(); R.blocks.addEmbed('https://www.fje.edu/'); const b = last(); select(b); await sleep(20);
    const W = frame.contentWindow, el = () => D.querySelector(`.block[data-id="${b.id}"]`);
    const hint = el().querySelector('.embed-card'); assert(hint, 'aviso «¿No se ve? Mostrar como tarjeta» en la barra');
    hint.click(); await sleep(30);
    eq(b.display, 'card', 'pasa a tarjeta');
    assert(!el().querySelector('iframe') && el().querySelector('.webcard'), 'el lienzo muestra la tarjeta, sin marco');
    assert(/www\.fje\.edu/.test(el().textContent), 'con la dirección');
    const opened = []; const wo = W.open; W.open = (...a) => { opened.push(a[0]); return null; };
    try { el().querySelector('.webcard-open').click(); } finally { W.open = wo; }
    eq(opened[0], 'https://www.fje.edu/', 'el botón abre la web');
    R.blocks.setWebCard(b.id, { cardTitle: 'Fundació Jesuïtes', poster: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' });
    await sleep(20);
    assert(/Fundació Jesuïtes/.test(el().textContent) && el().querySelector('.webcard img[src^="data:image/png"]'), 'título e imagen propios');
    const html = R.io.buildHTML();
    assert(/<a[^>]*class="rv-webcard"[^>]*href="https:\/\/www\.fje\.edu\/"[^>]*target="_blank"/.test(html), 'export: enlace que abre la web');
    assert(!/<iframe[^>]*fje\.edu/.test(html), 'export: sin marco bloqueado');
    assert(/Fundació Jesuïtes/.test(html), 'export: con el título');
    el().dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 })); await sleep(10);
    const back = [...D.querySelectorAll('#context-menu .ctx-item')].find(x => x.textContent === 'Mostrar la web incrustada');
    assert(back, 'menú: volver a incrustarla'); back.click(); await sleep(30);
    assert(el().querySelector('iframe') && !b.display, 'vuelve al marco');
  });

  await test('web incrustada: vídeos de YouTube y Vimeo con su dirección de reproductor', async () => {
    const E = R.blocks.embedUrl;
    eq(E('https://www.youtube.com/watch?v=jNQXAC9IVRw'), 'https://www.youtube.com/embed/jNQXAC9IVRw', 'watch');
    eq(E('https://youtu.be/jNQXAC9IVRw?t=12'), 'https://www.youtube.com/embed/jNQXAC9IVRw?start=12', 'youtu.be con minuto');
    eq(E('https://m.youtube.com/watch?v=jNQXAC9IVRw&t=30s'), 'https://www.youtube.com/embed/jNQXAC9IVRw?start=30', 'móvil con segundos');
    eq(E('https://www.youtube.com/shorts/abcdefghijk'), 'https://www.youtube.com/embed/abcdefghijk', 'shorts');
    eq(E('https://vimeo.com/76979871'), 'https://player.vimeo.com/video/76979871', 'Vimeo');
    eq(E('https://es.wikipedia.org/wiki/Reveal.js'), 'https://es.wikipedia.org/wiki/Reveal.js', 'otras webs sin cambios');
    eq(E('https://www.figma.com/design/AbC123/Mi-diseno?node-id=1-2'), 'https://www.figma.com/embed?embed_host=revela&url=' + encodeURIComponent('https://www.figma.com/design/AbC123/Mi-diseno?node-id=1-2'), 'Figma');
    eq(E('https://miro.com/app/board/uXjVK1a2b3c=/'), 'https://miro.com/app/live-embed/uXjVK1a2b3c=/?embedMode=view_only_without_ui', 'Miro');
    eq(E('https://www.canva.com/design/DAF1234abcd/aBcD-efGh/view'), 'https://www.canva.com/design/DAF1234abcd/aBcD-efGh/view?embed', 'Canva');
    eq(E('https://docs.google.com/presentation/d/1AbCdEf/edit#slide=id.p'), 'https://docs.google.com/presentation/d/1AbCdEf/embed', 'Presentaciones de Google');
    eq(E('https://www.loom.com/share/0123abcd'), 'https://www.loom.com/embed/0123abcd', 'Loom');
    // A chapter of the video per slide
    const yt = 'https://www.youtube.com/embed/jNQXAC9IVRw';
    eq(R.blocks.withClip(yt, 80, 125), yt + '?start=80&end=125', 'fragmento: desde-hasta');
    eq(JSON.stringify(R.blocks.clipOf(yt + '?start=80&end=125')), '{"start":80,"end":125}', 'y se lee');
    eq(R.blocks.withClip(yt + '?start=80&end=125', 0, 0), yt, 'vacío: entero');
    eq(R.blocks.parseTime('1:20'), 80, 'minutos:segundos'); eq(R.blocks.parseTime('1:02:03'), 3723, 'horas');
    reset(); R.blocks.addEmbed(yt); eq(R.blocks.setVideoClip(last().id, 30, 10), false, 'el final antes del principio: no');
    assert(R.blocks.setVideoClip(last().id, 30, 90) && /start=30&end=90/.test(last().src), 'en el objeto');
    reset(); R.blocks.addEmbed('https://youtu.be/jNQXAC9IVRw'); eq(last().src, 'https://www.youtube.com/embed/jNQXAC9IVRw', 'al insertar');
    const html = R.io.buildHTML();
    assert(/<iframe[^>]*referrerpolicy="strict-origin-when-cross-origin"/.test(html), 'envía el origen (sin él YouTube da «Error 153»)');
    await sleep(20);
    eq(D.querySelector(`.block[data-id="${last().id}"] iframe`).getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin', 'también en el editor');
  });

  await test('estilo de línea: guiones, puntos y guion-punto en formas, conectores y bordes; en todas las exportaciones', async () => {
    reset(); R.blocks.addShape('rect'); const sh = last(); select(sh);
    const sel = D.querySelector('[data-line-dash]'); sel.value = 'dash'; sel.dispatchEvent(new frame.contentWindow.Event('change')); await sleep(20);
    eq(sh.dash, 'dash', 'desde la cinta');
    assert(/stroke-dasharray="8 6"/.test(D.querySelector(`.block[data-id="${sh.id}"]`).innerHTML), 'en el lienzo');
    R.blocks.addText(); const tx = last(); tx.borderColor = '#ff0000'; R.store.commit(() => R.store.setSelection(tx.id), { history: false }); R.blocks.setLineDash('dot'); await sleep(20);
    eq(tx.borderDash, 'dot', 'borde de cuadro de texto');
    eq(frame.contentWindow.getComputedStyle(D.querySelector(`.block[data-id="${tx.id}"] .rich`)).borderTopStyle, 'dotted', 'punteado en el lienzo');
    const html = R.io.buildHTML();
    assert(/stroke-dasharray="8 6"/.test(html) && /border:2px dotted #ff0000/.test(html), 'en la presentación');
    R.store.commit(() => R.store.setSelection(sh.id), { history: false }); await sleep(10);
    eq(D.querySelector('[data-line-dash]').value, 'dash', 'la cinta refleja el estilo');
    R.blocks.setLineDash('solid'); assert(!sh.dash, 'vuelve a continua');
    R.blocks.setLineDash('dashDot');
    // Round trip through OpenDocument keeps it.
    const odp = await R.odp.buildODP(R.state.deck);
    const back = await R.odp.importODP(new File([odp], 'x.odp'));
    const s2 = back.slides[0].blocks.find(b => b.type === 'shape');
    eq(s2.dash, 'dashDot', 'ODP: se exporta y se vuelve a leer');
    // Rounded rectangles keep round corners when not square.
    R.blocks.addShape('rounded'); const rr = last(); Object.assign(rr, { w: 600, h: 100, radius: 20 }); R.render(); await sleep(10);
    assert(/<svg viewBox="0 0 600 100"[^>]*>.*rx="20"/.test(D.querySelector(`.block[data-id="${rr.id}"]`).innerHTML), 'radio real, sin deformar');
  });

  await test('gráficos: valores negativos, cuadrícula con escala, etiquetas de datos y títulos de ejes', async () => {
    reset(); R.blocks.addChart(); const c = last(); select(c);
    c.data = [{ label: 'Ene', value: 30 }, { label: 'Feb', value: -20 }, { label: 'Mar', value: 10 }];
    const svg = R.render && frame.contentWindow.document && (await import(new URL('../src/render/svg.js', D.baseURI))).chartSVG;
    const parse = html => new frame.contentWindow.DOMParser().parseFromString(html, 'image/svg+xml');
    let doc = parse(svg(c)), rects = [...doc.querySelectorAll('rect')];
    const neg = rects[1], pos = rects[0];
    assert(+neg.getAttribute('height') > 0 && +neg.getAttribute('y') >= +pos.getAttribute('y') + +pos.getAttribute('height') - 0.2, 'la barra negativa baja desde el cero');
    assert(doc.querySelector('line'), 'línea del cero');
    Object.assign(c, { grid: true, dataLabels: true, xTitle: 'Mes', yTitle: 'Ventas (k€)' });
    doc = parse(svg(c));
    const texts = [...doc.querySelectorAll('text')].map(t => t.textContent);
    assert(texts.includes('-20') && texts.includes('30'), 'etiquetas de datos: ' + texts.join(','));
    assert(texts.includes('Mes') && texts.includes('Ventas (k€)'), 'títulos de ejes');
    assert(doc.querySelectorAll('line').length >= 4 && texts.some(t => /^-?\d+$/.test(t) && t !== '30' && t !== '-20'), 'cuadrícula con la escala');
    eq(R.render && (await import(new URL('../src/render/svg.js', D.baseURI))).niceStep(23), 25, 'escala redonda');
    // The dialog sets them, and the editor redraws.
    R.render(); await sleep(20);
    D.querySelector(`.block[data-id="${c.id}"]`).dispatchEvent(new frame.contentWindow.MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 })); await sleep(10);
    [...D.querySelectorAll('#context-menu .ctx-item')].find(x => /Editar datos/.test(x.textContent)).click(); await sleep(10);
    const m = D.getElementById('chart-modal');
    assert(m.querySelector('.ch-grid').checked && m.querySelector('.ch-xt').value === 'Mes', 'el diálogo muestra las opciones');
    // The preview: the chart as it will be, redrawn while typing — and nothing changes until «Aplicar».
    const pv = m.querySelector('.ch-pv'), before = JSON.stringify(c);
    assert(pv.querySelector('svg') && /Ventas \(k€\)/.test(pv.innerHTML), 'vista previa del gráfico, con sus títulos');
    const ta = m.querySelector('.ch-data'), was = ta.value;
    ta.value = 'Norte\t5\nSur\t9\nEste\t2'; ta.dispatchEvent(new frame.contentWindow.Event('input', { bubbles: true })); await sleep(150);
    assert(/Norte/.test(pv.innerHTML) && /Este/.test(pv.innerHTML), 'se redibuja al escribir los datos');
    const type = m.querySelector('.ch-type'); type.value = 'pie'; type.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true })); await sleep(150);
    assert(pv.querySelectorAll('path').length >= 3, 'y al cambiar el tipo (circular: sus porciones)');
    ta.value = ''; ta.dispatchEvent(new frame.contentWindow.Event('input', { bubbles: true })); await sleep(150);
    assert(!pv.querySelector('svg') && /Escribe los datos/.test(pv.textContent), 'sin datos: lo dice');
    eq(JSON.stringify(c), before, 'el gráfico no cambia mientras se prueba');
    ta.value = was; type.value = c.chartType || 'bar';
    m.querySelector('.ch-labels').checked = false; m.querySelector('.fr-do').click(); await sleep(20);
    assert(!c.dataLabels && c.grid, 'y las guarda');
    assert(/Ventas \(k€\)/.test(D.querySelector(`.block[data-id="${c.id}"]`).innerHTML), 'en el lienzo');
    assert(/Ventas \(k€\)/.test(R.io.buildHTML()), 'en la presentación');
  });

  await test('tablas: fórmulas (=SUMA(ARRIBA), =B2*C2, rangos), fila de totales y el resultado en todas partes', async () => {
    reset(); const W = frame.contentWindow, F = await W.eval("import('/src/core/formulas.js')");
    const rows = [['Producto', '2024', 'Precio'], ['A', '3', '10 €'], ['B', '4', '12,5 €'], ['Total', '=SUMA(ARRIBA)', '=SUM(ABOVE)'], ['Media', '=PROMEDIO(B2:B3)', '=C4/2'], ['x', '=B6', '=(1+2']];
    const v = F.tableValues(rows, 'es', { header: true }).map(r => r.map(c => c.text));
    eq(v[3][1], '7', 'suma de lo de arriba, sin el encabezado «2024»'); eq(v[3][2], '22,50 €', 'con su unidad (dinero con céntimos: los dos)');
    eq(v[4][1], '3,5', 'promedio de un rango'); eq(v[4][2], '11,25 €', 'usando otra fórmula');
    eq(v[5][1], '#¡ERROR!', 'una que se usa a sí misma'); eq(v[5][2], '#¡ERROR!', 'mal escrita');
    eq(F.cellNumber('1.234,5').v, 1234.5); eq(F.cellNumber('1,234.5').v, 1234.5); assert(!F.cellNumber('Año 2024'), 'texto con número: texto');
    // In the editor: the result shown, the formula while writing in it.
    R.blocks.addTable(); const b = last(); select(b); R.blocks.tableToggleHeader();
    R.store.commit(() => { b.rows = [['Mes', 'Ventas'], ['Enero', '100'], ['Febrero', '250']]; }); await sleep(20);
    R.blocks.tableAddTotal(); await sleep(30);
    eq(b.rows[3][1], '=SUMA(ARRIBA)', 'fila de totales con su fórmula'); assert(/Total/.test(b.rows[3][0]), 'y su nombre');
    const el = () => D.querySelector(`#stage .block[data-id="${b.id}"]`), td = () => el().querySelector('td[data-r="3"][data-c="1"]');
    eq(td().textContent, '350', 'en la diapositiva, el resultado');
    td().dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    eq(td().textContent, '=SUMA(ARRIBA)', 'al entrar en la celda, la fórmula');
    const n = el().querySelector('td[data-r="1"][data-c="1"]'); n.focus(); n.textContent = '150'; n.dispatchEvent(new Event('input', { bubbles: true })); await sleep(30);
    eq(td().textContent, '400', 'al salir, el resultado, recalculado');
    assert(/<td>400<\/td>/.test(R.io.buildHTML()), 'en la presentación exportada');
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/<a:t>400<\/a:t>/.test(xml) && !/SUMA/.test(xml), 'en PowerPoint, el resultado');
  });

  await test('panel de selección: ocultar, bloquear, renombrar y reordenar; lo oculto no sale al presentar y sigue oculto en PowerPoint', async () => {
    reset(); const W = frame.contentWindow;
    R.slides.addSlide('blank'); await sleep(10);
    R.blocks.addShape('rect'); R.blocks.addShape('ellipse'); R.blocks.addText('Hola');
    const [a, b, c] = slide().blocks;
    D.querySelector('[data-action="selection-pane"]').click(); await sleep(20);
    const p = () => D.getElementById('selection-panel'), rows = () => [...p().querySelectorAll('.sp-row')];
    eq(rows().map(r => r.dataset.id).join(), [c.id, b.id, a.id].join(), 'el de delante, primero');
    // Hide the ellipse.
    rows()[1].querySelector('.sp-eye').click(); await sleep(20);
    assert(b.hidden && D.querySelector(`#stage .block[data-id="${b.id}"]`).classList.contains('is-hidden'), 'oculto en el editor');
    assert(!R.io.buildHTML().includes(`data-rv-id="${b.id}"`) && !/<ellipse/.test(R.io.slideInnerHTML(slide())), 'no sale en la presentación');
    // Rename by double-click.
    rows()[2].querySelector('.sp-name').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    const inp = p().querySelector('.sp-rename'); inp.value = 'Fondo azul'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(20);
    eq(a.label, 'Fondo azul'); assert(rows().some(r => r.textContent.includes('Fondo azul')), 'con su nombre en la lista');
    // Lock, and select by clicking.
    rows()[0].querySelector('.sp-lock').click(); await sleep(10); assert(c.locked, 'bloqueado');
    rows()[2].click(); await sleep(10); eq(R.state.ui.selection, a.id, 'se selecciona al hacer clic');
    // Drag the back one above the front one: now at the front.
    const dt = new W.DataTransfer(), src = rows()[2], dst = rows()[0], r = dst.getBoundingClientRect();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: r.top + 1 }));
    dst.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: r.top + 1 })); await sleep(20);
    eq(slide().blocks.at(-1).id, a.id, 'arrastrado delante de todo');
    // PowerPoint: still hidden there, and hidden when it comes back.
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide2.xml').async('string');
    assert(new RegExp(`name="rv-${b.id}" hidden="1"`).test(xml), 'oculto en PowerPoint');
    const back = await R.pptxImport.importPPTX(new W.File([blob], 'sel.pptx'));
    assert(back.slides[1].blocks.some(x => x.shape === 'ellipse' && x.hidden), 'y vuelve oculto');
    D.querySelector('[data-action="selection-pane"]').click(); await sleep(10);
    assert(!p(), 'se cierra');
  });

  await test('gráficos de cascada y de embudo (con «Total»), en la cinta y en PowerPoint como imagen', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const data = [{ label: 'Inicio', value: 100 }, { label: 'Ventas', value: 40 }, { label: 'Gastos', value: -30 }, { label: 'Total', value: 0 }];
    const svg = S.chartSVG({ chartType: 'waterfall', data, color: '#3f6497' });
    eq((svg.match(/<rect /g) || []).length, 4, 'una barra por dato');
    assert(/fill="#c0392b"/.test(svg) && /fill="#7f8c8d"/.test(svg), 'bajadas en rojo, el total en gris');
    assert(/>\+40</.test(svg) && />-30</.test(svg) && />110</.test(svg), 'etiquetas: +40, -30 y el total 110');
    assert(S.isTotalLabel('Subtotal') && S.isTotalLabel('Summe') && !S.isTotalLabel('Totalmente'), 'qué cuenta como total');
    const f = S.chartSVG({ chartType: 'funnel', data: [{ label: 'Visitas', value: 1000 }, { label: 'Registros', value: 400 }, { label: 'Compras', value: 80 }] });
    const ws = [...f.matchAll(/<rect x="[^"]+" y="[^"]+" width="([^"]+)"/g)].map(m => +m[1]);
    assert(ws.length === 3 && ws[0] > ws[1] && ws[1] > ws[2], 'embudo: cada etapa más estrecha');
    R.blocks.addChart(); const b = last(); select(b); await sleep(20);
    const kind = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === 'waterfall'));
    assert(kind && [...kind.options].some(o => o.value === 'funnel'), 'en la pestaña Gráfico');
    R.store.commit(() => { b.chartType = 'waterfall'; b.data = data; }); await sleep(10);
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(!/<c:chart /.test(xml) && /<p:pic>/.test(xml), 'en PowerPoint, como imagen');
  });

  await test('PDF y archivos: página, visor, icono o una diapositiva por página; se abren o descargan al presentar', async () => {
    reset(); const W = frame.contentWindow;
    // A two-page PDF, written here (offsets worked out so pdf.js reads it without repairing).
    const pdfText = (() => {
      const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Contents 4 0 R >>', null,
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Contents 6 0 R >>', null];
      const stream = c => `<< /Length ${c.length} >>\nstream\n${c}\nendstream`;
      objs[3] = stream('1 0 0 rg 20 20 360 260 re f'); objs[5] = stream('0 0 1 rg 20 20 360 260 re f');
      let out = '%PDF-1.4\n'; const offs = [];
      objs.forEach((o, k) => { offs.push(out.length); out += `${k + 1} 0 obj\n${o}\nendobj\n`; });
      const x = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
      return out + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
    })();
    const pdf = new W.File([pdfText], 'informe.pdf', { type: 'application/pdf' });
    // Dropped: it asks how; one page on the slide.
    const p1 = R.openfile.dropFiles([pdf]); await sleep(50);
    const modes = [...D.querySelectorAll('#pdf-modal .pdf-mode')].map(b => b.dataset.mode);
    eq(modes.join(), 'page,viewer,icon,slides', 'cuatro maneras');
    D.querySelector('#pdf-modal [data-mode="page"]').click(); await p1; await sleep(30);
    const b = last(); eq(b.type, 'file'); eq(b.pages, 2, 'sabe cuántas páginas tiene'); assert(/^data:image\/png/.test(b.poster), 'su primera página, dibujada');
    assert(/^data:application\/pdf/.test(b.src), 'el PDF va dentro');
    assert(Math.abs(b.w / b.h - 4 / 3) < 0.02, 'con la proporción de la página');
    assert(D.querySelector(`#stage .block[data-id="${b.id}"] .file-badge`), 'con su distintivo PDF');
    // Another page, from the ribbon.
    select(b); await sleep(20);
    const poster1 = b.poster;
    await R.files.setPdfPage(b, 2); eq(b.page, 2); assert(b.poster !== poster1, 'otra página');
    let html = R.io.buildHTML();
    assert(/data-pdf data-src="data:application\/pdf/.test(html) && /data-name="informe.pdf"/.test(html) && /data-page="2"/.test(html), 'al presentar, se puede hojear y ampliar');
    // As a viewer, and as an icon.
    await R.files.setFileDisplay(b, 'viewer'); html = R.io.buildHTML();
    assert(/data-file-view data-src="data:application\/pdf/.test(html) && /<iframe title="informe.pdf"/.test(html), 'visor de PDF');
    await R.files.setFileDisplay(b, 'icon'); await sleep(20);
    eq(b.w + 'x' + b.h, '200x250', 'icono');
    assert(/PDF/.test(D.querySelector(`#stage .block[data-id="${b.id}"]`).textContent) && /informe\.pdf/.test(D.querySelector(`#stage .block[data-id="${b.id}"]`).textContent), 'icono con su tipo y nombre');
    // One slide per page.
    const n0 = R.state.deck.slides.length;
    eq(await R.files.pdfToSlides(b.src), 2); eq(R.state.deck.slides.length, n0 + 2, 'dos diapositivas nuevas');
    assert(slide().blocks[0].type === 'image' && /^data:image\/png/.test(slide().blocks[0].src), 'cada página, como imagen');
    // Opened (Archivo ▸ Abrir): a new presentation, a slide per page, named after the file; nothing to undo back to.
    reset(); await R.openfile.openPdfDeck(pdf); await sleep(30);
    eq(R.state.deck.name + ' ' + R.state.deck.slides.length, 'informe 2', 'abrir un PDF: una presentación con sus páginas');
    assert(R.state.deck.slides.every(x => x.blocks.length === 1 && x.blocks[0].type === 'image'), 'sin la diapositiva vacía del principio');
    R.store.undo(); assert(R.state.deck.slides.length !== 2 || R.state.deck.name !== 'informe', 'deshacer vuelve a la de antes, de una vez');
    assert(/\.pdf/.test(R.openfile.OPEN_ACCEPT) && /application\/vnd\.openxml/.test(R.openfile.OPEN_ACCEPT), 'Abrir acepta PDF, y los tipos MIME de PowerPoint (el selector de Linux solo mira esos)');
    // Any other file: an icon that downloads it (generic data: the presentation keeps only known kinds).
    reset();
    await R.openfile.dropFiles([new W.File(['a,b\n1,2'], 'datos.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })]); await sleep(20);
    const f = last(); eq(f.type, 'file'); eq(f.display, 'icon'); assert(/^data:application\/octet-stream/.test(f.src), 'como descarga');
    html = R.io.buildHTML();
    assert(/data-file data-src="data:application\/octet-stream[^"]*" data-name="datos.xlsx"/.test(html) && /XLSX/.test(html), 'al presentar, el icono descarga el archivo');
    assert(/createObjectURL/.test(html), 'con su código');
    // PowerPoint: as a picture.
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);
    assert(/<p:pic>/.test(await zip.file('ppt/slides/slide1.xml').async('string')), 'en PowerPoint, su imagen');
  });

  await test('recortar a una proporción (1:1, 16:9…) con encuadre; en PowerPoint, recortada igual (srcRect) y de vuelta', async () => {
    reset(); const W = frame.contentWindow, PX = await W.eval("import('/src/io/formats/pptx-export.js')");
    // A 200×100 picture: left half red, right half blue.
    const c = D.createElement('canvas'); c.width = 200; c.height = 100; const g = c.getContext('2d');
    g.fillStyle = '#ff0000'; g.fillRect(0, 0, 100, 100); g.fillStyle = '#0000ff'; g.fillRect(100, 0, 100, 100);
    R.store.commit(() => slide().blocks.push({ id: 'pic', type: 'image', src: c.toDataURL('image/png'), x: 100, y: 100, w: 400, h: 200, rotation: 0, animation: null }));
    const b = slide().blocks.at(-1); select(b); await sleep(10);
    // From the dialog: 1:1, then framing to the left.
    const { openImageCrop } = await W.eval("import('/src/ui/dialogs/object.js')"); openImageCrop(b); await sleep(10);
    D.querySelector('#crop-modal [data-ratio="1:1"]').click(); await sleep(30);
    eq(b.w, b.h, 'cuadrada'); eq(b.fit, 'cover', 'la imagen la llena'); assert(Math.abs(b.x + b.w / 2 - 300) <= 1, 'mismo centro');
    const fx = D.querySelector('#crop-modal [data-focus="x"]'); fx.value = 0; fx.dispatchEvent(new W.Event('input')); await sleep(10);
    eq(b.focusX, 0); eq(D.querySelector(`#stage .block[data-id="pic"] img`).style.objectPosition, '0% 50%', 'se ve la parte izquierda');
    D.querySelector('#crop-modal .modal-close').click();
    // Frames: contained pictures are not stretched; filled ones are cut.
    const f1 = PX.pictureFrame({ x: 0, y: 0, w: 400, h: 400, fit: 'contain' }, 200, 100);
    eq([f1.frame.y, f1.frame.h].join(), '100,200', 'contener: centrada, sin estirar');
    const f2 = PX.pictureFrame({ x: 0, y: 0, w: 300, h: 300, fit: 'cover', focusX: 0 }, 200, 100);
    eq([f2.src.l, f2.src.r].join(), '0,0.5', 'rellenar con encuadre: la mitad izquierda');
    const f3 = PX.pictureFrame({ x: 0, y: 0, w: 200, h: 100, fit: 'fill', crop: { left: 25, right: 25 } }, 200, 100);
    eq([f3.frame.x, f3.frame.w, f3.src.l, f3.src.r].join(), '50,100,0.25,0.25', 'bordes recortados');
    // PowerPoint and back: the red half, square.
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/<a:srcRect l="0" t="0" r="50000" b="0"\/><a:stretch>/.test(xml), 'srcRect en PowerPoint: ' + (xml.match(/<a:srcRect[^>]*>/) || [''])[0]);
    const back = (await R.pptxImport.importPPTX(new W.File([blob], 'r.pptx'))).slides[0].blocks.find(x => x.type === 'image');
    const im = new W.Image(); im.src = back.src; await im.decode();
    eq(im.naturalWidth + 'x' + im.naturalHeight, '100x100', 'vuelve recortada');
    const k = D.createElement('canvas'); k.width = 100; k.height = 100; const kg = k.getContext('2d'); kg.drawImage(im, 0, 0);
    eq([...kg.getImageData(50, 50, 1, 1).data].slice(0, 3).join(), '255,0,0', 'la parte roja');
    // Original again.
    await R.blocks.cropToRatio(b.id, 'original'); eq(b.fit, 'contain'); eq(Math.round(b.w / b.h * 10), 20, 'con su proporción (2:1)');
  });

  await test('gráficos de rectángulos (treemap) y de burbujas; las burbujas, como gráfico de PowerPoint y de vuelta', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const rs = S.squarify([60, 30, 10], 0, 0, 100, 60);
    const area = r => r.w * r.h;
    assert(Math.abs(area(rs.find(r => r.i === 0)) - 3600) < 1 && Math.abs(area(rs.find(r => r.i === 2)) - 600) < 1, 'áreas en proporción');
    assert(rs.every(r => r.x >= -0.01 && r.y >= -0.01 && r.x + r.w <= 100.01 && r.y + r.h <= 60.01), 'dentro del gráfico');
    const tm = S.chartSVG({ chartType: 'treemap', data: [{ label: 'Madrid', value: 60 }, { label: 'Sevilla', value: 30 }, { label: 'Lugo', value: 10 }] });
    eq((tm.match(/<rect /g) || []).length, 3); assert(/>Madrid</.test(tm), 'con sus nombres');
    const data = [{ label: '1', value: 10 }, { label: '3', value: 20 }, { label: '5', value: 15 }];
    const bs = S.chartSVG({ chartType: 'bubble', data, series: [{ name: 'Tamaño', values: [1, 4, 9] }] });
    const ry = [...bs.matchAll(/ry="([\d.]+)"/g)].map(m => +m[1]);
    assert(ry.length === 3 && ry[0] < ry[1] && ry[1] < ry[2], 'burbujas más grandes con más tamaño');
    R.blocks.addChart(); const b = last(); select(b); await sleep(20);
    const kind = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === 'treemap'));
    assert(kind && [...kind.options].some(o => o.value === 'bubble'), 'en la pestaña Gráfico');
    R.store.commit(() => { b.chartType = 'bubble'; b.data = data; b.series = [{ name: 'Tamaño', values: [1, 4, 9] }]; }); await sleep(10);
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);
    const chartFile = Object.keys(zip.files).find(f => /^ppt\/charts\/chart\d+\.xml$/.test(f));
    assert(chartFile && /<c:bubbleChart>/.test(await zip.file(chartFile).async('string')), 'gráfico de burbujas de PowerPoint');
    const back = (await R.pptxImport.importPPTX(new W.File([blob], 'b.pptx'))).slides[0].blocks.find(x => x.type === 'chart');
    eq(back.chartType, 'bubble'); eq(back.data.map(d => d.label + ':' + d.value).join(), '1:10,3:20,5:15'); eq(back.series[0].values.join(), '1,4,9', 'con sus tamaños');
  });

  await test('gráficos: números a la española (4.215; 1.234,5) en etiquetas, ejes, cascada y tarta', async () => {
    const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    eq([4215, 1234.5, 0.25, -12500, 999, 1e6, 2.004].map(v => S.fmtNum(v)).join(' '), '4.215 1.234,5 0,25 -12.500 999 1.000.000 2', 'coma decimal y punto de miles desde 1.000');
    eq(S.fmtNum(97.46, 1), '97,5', 'con los decimales pedidos');
    const d = [{ label: 'A', value: 4215 }, { label: 'B', value: 1234.5 }];
    const bar = S.chartSVG({ chartType: 'bar', data: d, dataLabels: true, grid: true });
    assert(/>4\.215</.test(bar) && />1\.234,5</.test(bar) && />2\.000</.test(bar), 'etiquetas y escala con punto de miles');
    assert(/>4\.215</.test(S.chartSVG({ chartType: 'hbar', data: d, dataLabels: true })), 'también en las horizontales');
    assert(/>\+1\.500</.test(S.chartSVG({ chartType: 'waterfall', data: [{ label: 'Inicio', value: 2500 }, { label: 'Más', value: 1500 }] })), 'y en la cascada');
    eq(S.histogramBins([0.5, 1.2, 2.7]).map(x => x.label).join(' '), '0–1 1–2 2–3');
    // Pie and doughnut: a legend in a readable size, and a decimal when the share needs it.
    const pie = S.chartSVG({ chartType: 'pie', data: [{ label: 'Web', value: 97.5 }, { label: 'Tienda', value: 2.5 }] });
    assert(/>Web · 97,5 %</.test(pie) && />Tienda · 2,5 %</.test(pie), 'porcentajes con un decimal: ' + pie.match(/>[^<]+%</g));
    assert(/>Web · 50 %</.test(S.chartSVG({ chartType: 'doughnut', data: [{ label: 'Web', value: 1 }, { label: 'App', value: 1 }] })), 'sin decimales si no hacen falta');
    assert([...pie.matchAll(/<text [^>]*font-size="([\d.]+)"/g)].every(m => +m[1] >= 9), 'la leyenda, legible (el doble que antes)');
  });

  await test('gráficos: etiquetas largas que caben (horizontales, cascada, 100 %, radar) y cuadrícula y títulos en las horizontales', async () => {
    const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')"), P = s => new W.DOMParser().parseFromString(s, 'image/svg+xml');
    const xOf = (svg, txt) => +[...P(svg).querySelectorAll('text')].find(t => t.textContent === txt).getAttribute('x');
    // Horizontal bars: the names' room as wide as the longest needs (up to a limit, then two lines).
    const short = S.chartSVG({ chartType: 'hbar', data: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }], w: 800, h: 400 });
    const long = S.chartSVG({ chartType: 'hbar', data: [{ label: 'A', value: 1 }, { label: 'Sur peninsular', value: 2 }], w: 800, h: 400 });
    assert(xOf(short, 'A') < 8 && xOf(long, 'A') > xOf(short, 'A') + 5, 'la zona de etiquetas se adapta: ' + xOf(short, 'A') + ' / ' + xOf(long, 'A'));
    const very = P(S.chartSVG({ chartType: 'hbar', data: [{ label: 'Una categoría con un nombre larguísimo de verdad', value: 1 }, { label: 'B', value: 2 }], w: 600, h: 400 }));
    const vt = [...very.querySelectorAll('text')].map(t => t.textContent);
    assert(vt.includes('Una categoría con un') || vt.some(t => /^Una categoría/.test(t) && !/verdad$/.test(t)), 'las muy largas, en dos líneas: ' + vt.join('|'));
    const hg = P(S.chartSVG({ chartType: 'hbar', data: [{ label: 'A', value: 30 }, { label: 'B', value: 10 }], grid: true, xTitle: 'Euros', yTitle: 'Región' }));
    const ht = [...hg.querySelectorAll('text')].map(t => t.textContent);
    assert(ht.includes('Euros') && ht.includes('Región') && ht.includes('0') && ht.includes('30'), 'horizontales con escala y títulos: ' + ht.join('|'));
    assert(hg.querySelectorAll('line[stroke-opacity]').length >= 3, 'con cuadrícula');
    // Waterfall: every name the same size, long ones in more lines.
    const wf = P(S.chartSVG({ chartType: 'waterfall', w: 900, h: 400, data: [{ label: 'Ingresos', value: 100 }, { label: 'Coste de los productos vendidos', value: -40 }, { label: 'Otros', value: 5 }, { label: 'Gastos generales de la empresa', value: -20 }, { label: 'Total', value: 0 }] }));
    const names = [...wf.querySelectorAll('text')].filter(t => !/^[+-]?[\d.,]+$/.test(t.textContent));
    eq(new Set(names.map(t => t.getAttribute('font-size'))).size, 1, 'un solo tamaño');
    assert(names.length > 5, 'los largos, partidos: ' + names.map(t => t.textContent).join('|'));
    // 100 % bars: long category names in two lines, one size.
    const cats = [{ label: 'Hogar y jardín', value: 1 }, { label: 'Oficina y papelería', value: 2 }, { label: 'Industria pesada', value: 3 }, { label: 'Otros', value: 1 }];
    const st = P(S.chartSVG({ chartType: 'stacked100', data: cats, series: [{ name: 'X', values: [1, 1, 1, 1] }], w: 500, h: 300 }));
    const lab = [...st.querySelectorAll('text')].filter(t => t.getAttribute('fill') === '#8a8a8a' && !/%/.test(t.textContent) && t.textContent !== 'X' && t.textContent !== 'Serie 1');
    assert(lab.length > 4 && new Set(lab.map(t => t.getAttribute('font-size'))).size === 1, 'barras al 100 %: en líneas y de un tamaño: ' + lab.map(t => t.textContent).join('|'));
    // Radar: room around for the names at the sides.
    const rd = S.chartSVG({ chartType: 'radar', data: [{ label: 'Norte', value: 5 }, { label: 'Atención al cliente', value: 7 }, { label: 'Sur', value: 4 }, { label: 'Precio competitivo', value: 6 }] });
    const vb = rd.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    assert(vb[0] < 0 && vb[0] + vb[2] > 100, 'el dibujo se ensancha para que no se corten: ' + vb.join(' '));
    assert(/text-anchor="start"[^>]*>Atención/.test(rd) && /text-anchor="end"[^>]*>Precio/.test(rd), 'hacia fuera a cada lado');
  });

  await test('gráficos: dispersión con escala y series, áreas apiladas, mínimo y máximo del eje, intervalos del histograma y nombres de burbujas', async () => {
    const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')"), P = s => new W.DOMParser().parseFromString(s, 'image/svg+xml');
    const tx = s => [...P(s).querySelectorAll('text')].map(t => t.textContent);
    // Scatter: scale, gridlines, titles, data labels and several series (one with its own x).
    const sc = S.chartSVG({ chartType: 'scatter', data: [{ label: '1', value: 2 }, { label: '3', value: 4 }, { label: '5', value: 1, name: 'Ana' }], seriesName: 'A',
      series: [{ name: 'B', x: [2, 4], values: [3, 5] }], grid: true, dataLabels: true, xTitle: 'Horas', yTitle: 'Nota' });
    const st = tx(sc);
    eq((sc.match(/<circle /g) || []).length, 5, 'los puntos de las dos series');
    assert(['Horas', 'Nota', 'A', 'B', 'Ana', '0'].every(t => st.includes(t)) && st.includes('4'), 'títulos, leyenda, etiquetas y escala: ' + st.join('|'));
    assert(P(sc).querySelectorAll('line[stroke-opacity]').length >= 6, 'cuadrícula en los dos ejes');
    eq(S.scatterSeries({ data: [{ label: '1,5', value: 2 }] })[0].pts[0].x, 1.5, 'x con coma decimal');
    // Stacked areas: one band per series, the top at the sum.
    const sa = S.chartSVG({ chartType: 'stackedArea', data: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }], series: [{ name: 'Y', values: [3, 2] }, { name: 'Z', values: [4, 4] }], grid: true });
    eq((sa.match(/<polygon [^>]*fill-opacity="0\.8"/g) || []).length, 3, 'tres bandas');
    assert(tx(sa).includes('8') && !tx(sa).includes('10'), 'la escala llega a la suma (8): ' + tx(sa).join('|'));
    // The value axis' ends: a narrow range widened.
    const co2 = P(S.chartSVG({ chartType: 'line', data: [{ label: '2020', value: 412 }, { label: '2021', value: 416 }], grid: true, yMin: 400, yMax: 420 }));
    const ticks = [...co2.querySelectorAll('text[text-anchor="end"]')].map(t => t.textContent);
    eq(ticks[0] + '…' + ticks[ticks.length - 1], '400…420', 'la escala de 400 a 420');
    const bars = P(S.chartSVG({ chartType: 'bar', data: [{ label: 'x', value: 410 }, { label: 'y', value: 415 }], yMin: 400, yMax: 420 })).querySelectorAll('rect');
    assert(Math.abs(bars[0].getAttribute('height') / bars[1].getAttribute('height') - 10 / 15) < 0.02, 'barras desde el mínimo: 10 y 15 por encima de 400');
    // Histogram: the intervals asked for; under the bars the edges, not the ranges.
    const vals = Array.from({ length: 100 }, (_, i) => i);
    assert(Math.abs(S.histogramBins(vals, 10).length - 10) <= 1 && Math.abs(S.histogramBins(vals, 20).length - 20) <= 1, 'b.bins: ' + S.histogramBins(vals, 10).length + ', ' + S.histogramBins(vals, 20).length);
    const hs = tx(S.chartSVG({ chartType: 'histogram', bins: 5, data: vals.map(v => ({ value: v })) }));
    assert(hs.includes('0') && hs.includes('100') && !hs.some(t => /–/.test(t)), 'bordes de los intervalos: ' + hs.join('|'));
    // Bubbles: a name that doesn't fit in its bubble goes beside it.
    const bb = S.chartSVG({ chartType: 'bubble', w: 800, h: 400, data: [{ label: 'Grande', value: 10 }, { label: 'Una marca con nombre largo', value: 20 }], series: [{ name: 'T', values: [100, 1] }] });
    assert(/text-anchor="middle" fill="#fff"[^>]*>Grande</.test(bb), 'dentro si cabe');
    assert(/text-anchor="(start|end)"[^>]*>Una marca con nombre largo</.test(bb), 'al lado si no');
    // The same in a presentation whose data reload (the runtime has every helper).
    const run = new W.Function(S.chartRuntimeJS() + '\nreturn chartSVG;')();
    for (const b of [{ chartType: 'scatter', data: [{ label: '1', value: 2 }], series: [{ name: 'B', x: [2], values: [3] }], grid: true }, { chartType: 'stackedArea', data: [{ label: 'a', value: 1 }], series: [{ values: [2] }] },
      { chartType: 'radar', data: [{ label: 'Uno largo de verdad', value: 1 }, { label: 'b', value: 2 }, { label: 'c', value: 3 }] }, { chartType: 'pie', data: [{ label: 'a', value: 1 }] }, { chartType: 'histogram', bins: 4, data: vals.map(v => ({ value: v })) }])
      eq(run({ ...b, w: 700, h: 300 }), S.chartSVG({ ...b, w: 700, h: 300 }), 'datos en vivo: ' + b.chartType);
  });

  await test('gráficos: opciones nuevas en el diálogo y la cinta, y en PowerPoint (áreas apiladas, ejes, dispersión con series)', async () => {
    reset(); const W = frame.contentWindow;
    R.blocks.addChart(); const c = last(); select(c); await sleep(20);
    const kind = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')].find(x => [...x.options].some(o => o.value === 'stackedArea'));
    assert(kind, 'áreas apiladas en la pestaña Gráfico');
    R.store.commit(() => { c.chartType = 'histogram'; }); R.render(); await sleep(20);
    assert([...D.querySelectorAll('#ribbon [data-page="ctx"] input')].some(i => /Intervalos/.test(i.title || i.closest('label,[title]')?.textContent || i.getAttribute('aria-label') || '')), 'intervalos del histograma en la cinta');
    D.querySelector(`.block[data-id="${c.id}"]`).dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 })); await sleep(10);
    [...D.querySelectorAll('#context-menu .ctx-item')].find(x => /Editar datos/.test(x.textContent)).click(); await sleep(10);
    const m = D.getElementById('chart-modal');
    assert(m.querySelector('.ch-hist').style.display !== 'none' && m.querySelector('.ch-xy').style.display === 'none', 'sólo las opciones del tipo');
    m.querySelector('.ch-type').value = 'line'; m.querySelector('.ch-type').dispatchEvent(new W.Event('change'));
    m.querySelector('.ch-ymin').value = '400'; m.querySelector('.ch-ymax').value = ''; m.querySelector('.fr-do').click(); await sleep(20);
    assert(c.chartType === 'line' && c.yMin === 400 && !('yMax' in c) && !('bins' in c), 'el diálogo guarda el mínimo (y quita lo vacío)');
    // PowerPoint, both ways.
    const d = [{ label: 'A', value: 410 }, { label: 'B', value: 415 }];
    R.store.commit(() => { slide().blocks = [
      { id: 'g0', type: 'chart', chartType: 'stackedArea', data: d, series: [{ name: 'X', values: [1, 2] }], x: 0, y: 0, w: 400, h: 300, rotation: 0, animation: null },
      { id: 'g1', type: 'chart', chartType: 'line', data: d, yMin: 400, yMax: 420, x: 400, y: 0, w: 400, h: 300, rotation: 0, animation: null },
      { id: 'g2', type: 'chart', chartType: 'scatter', data: [{ label: '1', value: 2 }, { label: '3', value: 4 }], seriesName: 'A', series: [{ name: 'B', x: [2, 5, 6], values: [1, 2, 3] }], xTitle: 'Horas', x: 0, y: 300, w: 400, h: 300, rotation: 0, animation: null },
      { id: 'g3', type: 'chart', chartType: 'hbar', data: d, xTitle: 'Euros', yTitle: 'Región', x: 400, y: 300, w: 400, h: 300, rotation: 0, animation: null }]; }); await sleep(10);
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);
    const xml = await Promise.all(Object.keys(zip.files).filter(f => /^ppt\/charts\/chart\d+\.xml$/.test(f)).sort().map(f => zip.file(f).async('string')));
    assert(xml.some(x => /<c:areaChart><c:grouping val="stacked"/.test(x)), 'áreas apiladas de PowerPoint');
    assert(xml.some(x => /<c:max val="420"\/><c:min val="400"\/>/.test(x)), 'mínimo y máximo del eje');
    assert(xml.some(x => /<c:scatterChart>/.test(x) && (x.match(/<c:ser>/g) || []).length === 2), 'dispersión con dos series');
    const hb = xml.find(x => /<c:barDir val="bar"/.test(x));
    assert(hb && /<c:catAx>[\s\S]*Región[\s\S]*<\/c:catAx>/.test(hb) && /<c:valAx>[\s\S]*Euros[\s\S]*<\/c:valAx>/.test(hb), 'horizontales: los títulos en su eje');
    assert(xml.some(x => /formatCode="#,##0"/.test(x)), 'números con separador de miles');
    const back = (await R.pptxImport.importPPTX(new W.File([blob], 'g.pptx'))).slides[0].blocks.filter(b => b.type === 'chart');
    const by = t => back.find(b => b.chartType === t);
    assert(by('stackedArea'), 'vuelven las áreas apiladas: ' + back.map(b => b.chartType));
    assert(by('line') && by('line').yMin === 400 && by('line').yMax === 420, 'vuelven el mínimo y el máximo');
    const sp = by('scatter');
    assert(sp && sp.data.length === 2 && sp.series?.[0]?.x?.join() === '2,5,6' && sp.series[0].values.join() === '1,2,3', 'vuelve la dispersión con sus series: ' + JSON.stringify(sp && [sp.data, sp.series]));
  });

  await test('gráficos: segundo eje a la derecha (climograma) en el dibujo, el diálogo y PowerPoint de ida y vuelta', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const P = h => new W.DOMParser().parseFromString(h, 'image/svg+xml').documentElement;
    const months = ['E', 'F', 'M', 'A'].map((l, i) => ({ label: l, value: [60, 45, 30, 120][i] }));
    const clima = { chartType: 'bar', combo: true, data: months, seriesName: 'Lluvia (mm)', series: [{ name: 'Temperatura (°C)', values: [8, 10, 13, 15], color: '#c0392b' }], color: '#3f6497', y2: true, y2Title: '°C' };
    const one = P(S.chartSVG({ ...clima, y2: false })), two = P(S.chartSVG(clima));
    const ys = svg => [...svg.querySelectorAll('circle')].map(c => +c.getAttribute('cy'));
    // (On one axis the temperatures — 8 to 15 next to 120 mm — lie flat at the bottom; on their own they fill the plot.)
    assert(Math.max(...ys(one)) - Math.min(...ys(one)) < 5 && Math.max(...ys(two)) - Math.min(...ys(two)) > 15, 'la línea llena el gráfico: ' + ys(one) + ' / ' + ys(two));
    const right = [...two.querySelectorAll('text')].filter(t => !t.getAttribute('text-anchor') && t.getAttribute('fill') === '#c0392b').map(t => t.textContent);
    assert(right.includes('15') || right.includes('16'), 'la escala de la derecha, del color de su serie: ' + right.join('|'));
    assert([...two.querySelectorAll('text[text-anchor="end"]')].every(t => t.getAttribute('fill') === '#3f6497'), 'y la de la izquierda, de la suya');
    assert([...two.querySelectorAll('text')].some(t => t.textContent === '°C' && /rotate\(90/.test(t.getAttribute('transform'))), 'el título del segundo eje');
    assert(S.chartSig(clima) !== S.chartSig({ ...clima, y2: false }), 'el cambio se vuelve a dibujar');
    assert(!/fill="#c0392b">1[56]</.test(S.chartSVG({ ...clima, chartType: 'stacked' })), 'en barras apiladas, sin segundo eje');
    // The dialog: the option for bars, lines and areas; its title and ends saved (and the empty ones removed).
    R.blocks.addChart(); const c = last(); select(c); await sleep(20);
    R.store.commit(() => Object.assign(c, { data: months, series: clima.series, combo: true })); R.render(); await sleep(10);
    D.querySelector(`.block[data-id="${c.id}"]`).dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 })); await sleep(10);
    [...D.querySelectorAll('#context-menu .ctx-item')].find(x => /Editar datos/.test(x.textContent)).click(); await sleep(10);
    const m = D.getElementById('chart-modal');
    assert(m.querySelector('.ch-y2-box').style.display !== 'none' && m.querySelector('.ch-y2-opts').style.display === 'none', 'la opción, y sus campos solo al marcarla');
    m.querySelector('.ch-y2').checked = true; m.querySelector('.ch-y2').dispatchEvent(new W.Event('change'));
    assert(m.querySelector('.ch-y2-opts').style.display !== 'none', 'al marcarla, su título y sus extremos');
    m.querySelector('.ch-y2t').value = '°C'; m.querySelector('.ch-y2max').value = '40';
    m.querySelector('.ch-type').value = 'pie'; m.querySelector('.ch-type').dispatchEvent(new W.Event('change'));
    assert(m.querySelector('.ch-y2-box').style.display === 'none', 'no en un circular');
    m.querySelector('.ch-type').value = 'bar'; m.querySelector('.ch-type').dispatchEvent(new W.Event('change'));
    m.querySelector('.fr-do').click(); await sleep(20);
    assert(c.y2 === true && c.y2Title === '°C' && c.y2Max === 40 && !('y2Min' in c), 'el diálogo lo guarda: ' + JSON.stringify([c.y2, c.y2Title, c.y2Min, c.y2Max]));
    // PowerPoint: the lines on a secondary axis at the right, and back.
    R.store.commit(() => { slide().blocks = [
      { ...clima, id: 'k0', type: 'chart', y2Min: 0, y2Max: 40, x: 0, y: 0, w: 500, h: 300, rotation: 0, animation: null },
      { id: 'k1', type: 'chart', chartType: 'line', data: months, series: [{ name: 'T', values: [8, 10, 13, 15] }], y2: true, x: 0, y: 300, w: 500, h: 300, rotation: 0, animation: null }]; }); await sleep(10);
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);
    const xml = await Promise.all(Object.keys(zip.files).filter(f => /^ppt\/charts\/chart\d+\.xml$/.test(f)).sort().map(f => zip.file(f).async('string')));
    const k0 = xml.find(x => /<c:barChart>/.test(x));
    assert(k0 && (k0.match(/<c:valAx>/g) || []).length === 2 && /<c:axPos val="r"\/>/.test(k0) && /°C/.test(k0) && /<c:max val="40"\/>/.test(k0), 'PowerPoint: un segundo eje de valores, a la derecha, con su título y su máximo');
    const back = (await R.pptxImport.importPPTX(new W.File([blob], 'k.pptx'))).slides[0].blocks.filter(b => b.type === 'chart');
    const bk = back.find(b => b.combo), ln = back.find(b => b.chartType === 'line');
    assert(bk && bk.y2 && bk.y2Title === '°C' && bk.y2Min === 0 && bk.y2Max === 40, 'vuelve el combinado con su segundo eje: ' + JSON.stringify(bk && [bk.y2, bk.y2Title, bk.y2Min, bk.y2Max]));
    assert(ln && ln.y2 && ln.series?.length === 1, 'y las líneas con la segunda en su eje: ' + JSON.stringify(ln && [ln.chartType, ln.y2]));
  });

  await test('diagramas: 15 diseños desde un esquema de texto, colores del tema, uno a uno, convertir en formas y PowerPoint editable', async () => {
    reset(); const W = frame.contentWindow, DG = await W.eval("import('/src/render/diagrams.js')");
    const tree = DG.parseOutline('A\n  a1\n  a2\nB\n\tb1\n    b11\n- C');
    eq(JSON.stringify(tree.map(x => [x.text, x.kids.map(k => [k.text, k.kids.length])])), JSON.stringify([['A', [['a1', 0], ['a2', 0]]], ['B', [['b1', 1]]], ['C', []]]), 'el esquema: sangría = subelementos');
    const all = DG.DIAGRAM_LAYOUTS.flatMap(([, l]) => l.map(x => x[0]));
    eq(all.length, 15, '15 diseños');
    for (const k of all) {
      const parts = DG.diagramLayout({ layout: k, w: 900, h: 460, text: DG.DIAGRAM_SAMPLES[k] || DG.DEFAULT_DIAGRAM_TEXT });
      assert(parts.some(p => p.type === 'text') && parts.some(p => p.type !== 'text'), 'se dibuja: ' + k);
      const out = parts.filter(p => (p.type === 'poly' ? p.pts.some(([x, y]) => x < -1 || y < -1 || x > 901 || y > 461) : p.x < -1 || p.y < -1 || p.x + p.w > 901 || p.y + p.h > 461));
      eq(out.length, 0, 'dentro de su caja: ' + k);
    }
    // Hierarchy: every person, a box; each one under their boss.
    const org = DG.diagramLayout({ layout: 'hierarchy', w: 900, h: 460, text: DG.DIAGRAM_SAMPLES.hierarchy }).filter(p => p.type === 'rect');
    eq(org.length, 7, 'siete cajas'); eq(new Set(org.map(r => Math.round(r.y))).size, 3, 'en tres niveles');
    // Inserted: one object with its text, in the app's language.
    R.blocks.addDiagram('process'); const b = last(); select(b); await sleep(20);
    eq(b.type, 'diagram'); assert(/^Primero\n  Una explicación breve/.test(b.text), 'texto de ejemplo');
    const el = () => D.querySelector(`#stage .block[data-id="${b.id}"]`);
    eq(el().querySelectorAll('.rv-diagram rect').length, 3, 'tres cajas');
    // Its text: typed in the dialog (live), one undo step.
    el().dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(20);
    const ta = D.querySelector('#dg-modal .dg-text'); ta.value = 'Idea\nDiseño\nPrueba\nVenta'; ta.dispatchEvent(new W.Event('input')); await sleep(200);
    eq(el().querySelectorAll('.rv-diagram rect').length, 4, 'cuatro al escribir la cuarta línea');
    D.querySelector('#dg-modal .dg-ok').click(); await sleep(20);
    R.store.undo(); await sleep(20); assert(/^Primero/.test(last().text), 'deshacer vuelve al texto de antes'); R.store.redo(); await sleep(20);
    // Layout and colours from the ribbon.
    const sels = [...D.querySelectorAll('#ribbon [data-page="ctx"] select')], lay = sels.find(x => [...x.options].some(o => o.value === 'venn')), col = sels.find(x => [...x.options].some(o => o.value === 'outline'));
    lay.value = 'chevrons'; lay.dispatchEvent(new W.Event('change')); await sleep(20); eq(last().layout, 'chevrons');
    col.value = 'accent'; col.dispatchEvent(new W.Event('change')); await sleep(20); eq(last().colors, 'accent');
    const P = await W.eval("import('/src/features/design/palettes.js')"), acc = P.currentPalette().accents[0].toLowerCase();
    assert(el().querySelector('.rv-diagram path').getAttribute('fill').toLowerCase() === acc, 'con el color del tema');
    // One by one: each item a click.
    R.blocks.setDiagram(last().id, { oneByOne: true });
    const html = R.io.buildHTML(), frags = (html.match(/class="fragment fade-in" data-fragment-index="\d+"/g) || []);
    assert(frags.length >= 8 && /data-fragment-index="4"/.test(html), 'uno a uno: ' + frags.length);
    // PowerPoint: shapes and text, not a picture.
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert((xml.match(/<a:custGeom>/g) || []).length >= 4 && /<a:t>Prueba<\/a:t>/.test(xml) && !/<p:pic>/.test(xml), 'en PowerPoint, formas editables');
    // Convert to shapes: grouped shapes with their words.
    R.blocks.diagramToShapes(last().id); await sleep(20);
    const shapes = slide().blocks.filter(x => x.groupId);
    assert(shapes.length >= 4 && shapes.every(x => x.groupId === shapes[0].groupId), 'formas agrupadas');
    assert(shapes.some(x => x.type === 'shape' && /Venta/.test(x.html || '')), 'cada caja con su texto dentro');
    // The gallery in Insert.
    D.querySelector('[data-diagrams-open]').click(); await sleep(30);
    const picks = D.querySelectorAll('.popover [data-diagram-pick]'); eq(picks.length, 15, 'galería con los 15');
    D.querySelector('.popover [data-diagram-pick="venn"]').click(); await sleep(20); eq(last().layout, 'venn', 'se inserta desde la galería');
  });

  await test('diagramas con imágenes: un logo o una foto con su texto, encajada, en círculo o sola; soltada en su caja; en PowerPoint', async () => {
    reset(); const W = frame.contentWindow, DG = await W.eval("import('/src/render/diagrams.js')");
    const png = (() => { const c = D.createElement('canvas'); c.width = 80; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 80, 40); return c.toDataURL('image/png'); })();
    // In every layout: inside its box, above or beside its words.
    for (const k of Object.keys(DG.DIAGRAM_NAMES)) {
      const text = DG.DIAGRAM_SAMPLES[k] || DG.DEFAULT_DIAGRAM_TEXT, first = text.split('\n')[0].trim();
      const parts = DG.diagramLayout({ layout: k, w: 900, h: 460, text, pictures: [{ text: first, src: png }] }), img = parts.find(p => p.type === 'image');
      assert(img && img.alt === first && img.x >= -1 && img.y >= -1 && img.x + img.w <= 901 && img.y + img.h <= 461, 'con su imagen: ' + k);
      const words = parts.find(p => p.type === 'text' && p.text === first);
      assert(words && (words.y >= img.y + img.h - 1 || words.x >= img.x + img.w - 1 || words.y + words.h <= img.y + 1), 'sus palabras, sin taparla (debajo, al lado; en las tarjetas, el título encima): ' + k);
    }
    R.blocks.addDiagram('process'); const b = last(); select(b); await sleep(20);
    const el = () => D.querySelector(`#stage .block[data-id="${b.id}"]`);
    R.blocks.setDiagram(b.id, { pictures: [{ text: 'Primero', src: png }] }); await sleep(30);
    let im = el().querySelector('.rv-diagram img'); assert(im && im.alt === 'Primero' && im.style.objectFit === 'contain', 'entera (un logo), en el editor');
    R.blocks.setDiagram(b.id, { picFit: 'circle' }); await sleep(30); im = el().querySelector('.rv-diagram img');
    assert(im.style.borderRadius === '50%' && im.style.width === im.style.height, 'en círculo (una persona)');
    R.blocks.setDiagram(b.id, { picOnly: true }); await sleep(30);
    assert(el().querySelector('.rv-diagram img') && ![...el().querySelectorAll('.rv-diagram div div')].some(d => d.textContent === 'Primero'), 'sola: su texto, solo como descripción');
    R.blocks.setDiagram(b.id, { picOnly: null, picFit: null });
    // Its words changed in the text dialog: it keeps its picture.
    el().dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(20);
    const ta = D.querySelector('#dg-modal .dg-text'); ta.value = ta.value.replace('Primero', 'Inicio'); ta.dispatchEvent(new W.Event('input')); await sleep(150);
    D.querySelector('#dg-modal .dg-ok').click(); await sleep(20);
    eq(last().pictures.map(p => p.text).join(), 'Inicio', 'la imagen sigue a su línea');
    // A picture dropped on a box: that line's.
    await R.openfile.insertFiles([await (await W.fetch(png)).blob().then(x => new W.File([x], 'logo.png', { type: 'image/png' }))], [b.x + b.w / 2, b.y + b.h / 2]); await sleep(30);
    assert(last().pictures.some(p => p.text === 'Segundo') && last() === R.state.deck.slides[R.state.ui.slideIndex].blocks.at(-1), 'soltada en la caja del medio: su imagen (no otra imagen suelta)');
    // The dialog: each line, with its picture; removed from there.
    D.querySelector('#ribbon [data-page="ctx"] [title="Imágenes"], #ribbon [data-page="ctx"] button[aria-label="Imágenes"]')?.click() ?? (await W.eval("import('/src/ui/dialogs/diagram.js')")).openDiagramPictures(last());
    await sleep(30); if (!D.getElementById('dgp-modal')) (await W.eval("import('/src/ui/dialogs/diagram.js')")).openDiagramPictures(last()); await sleep(20);
    const rows = [...D.querySelectorAll('#dgp-modal .dgp-row')]; eq(rows.length, 6, 'una fila por línea');
    rows.find(r => r.dataset.text === 'Segundo').querySelector('.dgp-del').click(); await sleep(20);
    eq(last().pictures.map(p => p.text).join(), 'Inicio', 'quitada'); D.querySelector('#dgp-modal .dgp-ok').click();
    // PowerPoint: a picture of its own; converted to shapes: an image object.
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/<p:pic>/.test(xml) && /descr="Inicio"/.test(xml), 'en PowerPoint, la imagen con su descripción');
    await R.blocks.diagramToShapes(last().id); await sleep(20);
    assert(slide().blocks.some(x => x.groupId && x.type === 'image' && x.alt === 'Inicio'), 'convertido en formas: su imagen, un objeto más');
  });

  await test('fórmulas: coma decimal (=B4*0,21), unidades coherentes y miles agrupados desde 1000', async () => {
    reset(); const W = frame.contentWindow, F = await W.eval("import('/src/core/formulas.js')");
    const rows = [['Concepto', 'Uds', 'Precio', 'Importe'], ['A', '3', '10 €', '=B2*C2'], ['B', '4', '12,5 €', '=B3*C3'], ['IVA', '', '21 %', '=D2*C4'],
      ['x', '=B2*0,21', '=REDONDEAR(D2/C2;2)', '=SUMA(D2:D3)'], ['Total', '4215', '=MAX(3,5)', '=D2*21%'], ['', '=1,5+1', '=REDONDEAR(B6/C6;2)', '=C4+C4']];
    const v = F.tableValues(rows, 'es', { header: true }).map(r => r.map(c => c.text));
    eq(v[1][3], '30 €', 'cantidad × precio: el € del precio'); eq(v[3][3], '6,30 €', '€ × %: euros (el % como fracción)');
    eq(v[4][1], '0,63', 'coma decimal en la fórmula'); eq(v[4][2], '3', '€ / €: un número, sin unidad'); eq(v[4][3], '80 €', 'suma de euros');
    eq(v[5][2], '5', 'en inglés, la coma separa argumentos'); eq(v[5][3], '6,30 €', 'B2*21%');
    eq(v[6][1], '2,5', 'coma decimal fuera de paréntesis'); eq(v[6][2], '843', 'REDONDEAR(4215/5;2)'); eq(v[6][3], '42 %', 'porcentajes que se suman');
    eq(F.formatNumber(4215, 'es'), '4.215', 'miles desde 1000'); eq(F.formatNumber(1234.567, 'es'), '1.234,57', 'y decimales con coma');
    eq(F.tableValues([['=4000+215']], 'es')[0][0].text, '4.215', 'también en la tabla');
  });

  await test('ecuaciones: \\text{} con tildes, errores visibles y las que se dibujaron antes de cargar KaTeX', async () => {
    reset(); const W = frame.contentWindow, C = await W.eval("import('/src/ui/canvas/content.js')");
    R.blocks.addMath(); const b = last(); R.store.commit(() => { b.latex = '\\text{Previsión} = 3'; }); R.render();
    const box = () => D.querySelector(`#stage .block[data-id="${b.id}"] .math-blk`);
    for (let i = 0; i < 100 && !box()?.querySelector('.katex'); i++) await sleep(50);
    assert(box().querySelector('.katex') && /Previsi/.test(box().textContent) && !box().classList.contains('math-error'), 'con tilde se dibuja');
    R.store.commit(() => { b.latex = '\\frac{1}{'; }); await sleep(50);
    assert(box().classList.contains('math-error') && /frac/.test(box().textContent) && box().title, 'un error se ve, con su mensaje');
    // One drawn while KaTeX was still loading (left empty) is drawn once it is there.
    const d = D.createElement('div'); d.className = 'math-blk'; d.dataset.latex = 'x^2'; D.getElementById('stage').appendChild(d);
    eq(C.redrawPendingMath(), 1, 'una pendiente'); assert(d.querySelector('.katex'), 'y se dibuja'); d.remove();
    // In the master, the export loads KaTeX too.
    R.store.commit(() => { R.state.deck.master.blocks.push(R.model.mathBlock({ id: 'mm1' })); });
    assert(/katex\.min\.js/.test(R.io.buildHTML()), 'KaTeX en la presentación con una ecuación en el patrón');
    R.store.commit(() => { R.state.deck.master.blocks = R.state.deck.master.blocks.filter(x => x.id !== 'mm1'); });
  });

  await test('diagramas: tamaño de letra (fontScale), texto más grande en la cronología y color legible sobre el fondo', async () => {
    reset(); const W = frame.contentWindow, G = await W.eval("import('/src/render/diagrams.js')");
    const base = { layout: 'timeline', w: 1100, h: 420, text: G.DIAGRAM_SAMPLES.timeline };
    const fs = (o = {}, opt = { fg: '#1e2a3a', back: '#ffffff' }) => G.diagramLayout({ ...base, ...o }, opt).filter(p => p.type === 'text');
    assert(fs()[0].fs >= 34, 'la cronología aprovecha el sitio: ' + fs()[0].fs);
    assert(fs({ fontScale: 1.5 })[0].fs > fs()[0].fs && fs({ fontScale: 0.6 })[0].fs < fs()[0].fs, 'más grande y más pequeño');
    eq(fs({}, { fg: '#1e2a3a', back: '#0b1020' })[0].color, '#ffffff', 'texto oscuro del tema sobre fondo oscuro: blanco');
    eq(fs({}, { fg: '#ffffff', back: 'linear-gradient(#ffffff, #f0f0f0)' })[0].color, '#1e2a3a', 'y sobre un degradado claro, oscuro');
    eq(fs({ textColor: '#ff0000' }, { fg: '#1e2a3a', back: '#0b1020' })[0].color, '#ff0000', 'o un color propio');
    // In the editor: the ribbon's controls, and the slide's background.
    R.blocks.addDiagram('timeline'); const b = last(); select(b); R.store.commit(() => { slide().background = '#000000'; R.state.deck.textColor = '#222222'; }); await sleep(30);
    const el = () => D.querySelector(`#stage .block[data-id="${b.id}"] .rv-diagram div`);
    eq(getComputedStyle(el()).color, 'rgb(255, 255, 255)', 'en el lienzo, legible sobre el fondo de la diapositiva');
    const num = [...D.querySelectorAll('#ribbon [data-page="ctx"] input')].find(x => /Tamaño de letra/.test(x.closest('[title]')?.title || x.title || x.parentElement?.textContent || ''));
    assert(num, 'control de tamaño en la cinta');
    R.blocks.setDiagram(b.id, { fontScale: 1.4 }); await sleep(20);
    assert(/"fontScale":1\.4/.test(JSON.stringify(b)) && /color:#ffffff/.test(R.io.buildHTML()), 'se guarda y se exporta legible');
    delete R.state.deck.textColor;
  });

  await test('iconos: un centenar, con buscador, y en PowerPoint', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    assert(S.ICON_NAMES.length >= 96 && ['graduation-cap', 'flask-conical', 'rocket', 'stethoscope', 'circle-check'].every(n => S.ICON_NAMES.includes(n)), 'iconos: ' + S.ICON_NAMES.length);
    assert(S.ICON_NAMES.every(n => /<(path|circle|rect|line|polyline|polygon|ellipse)\b/.test(S.iconSVG({ icon: n }))), 'todos con dibujo');
    D.querySelector('[data-icons]').click(); await sleep(30);
    const pop = D.querySelector('.popover'), q = pop.querySelector('[data-icon-search]');
    assert(pop.querySelectorAll('[data-icon]').length === S.ICON_NAMES.length, 'todos en el selector');
    q.value = 'graduacion'; q.dispatchEvent(new W.Event('input')); await sleep(10);
    const shown = [...pop.querySelectorAll('[data-icon]')].filter(x => !x.hidden).map(x => x.dataset.icon);
    eq(shown.join(), 'graduation-cap', 'busca sin tildes');
    pop.querySelector('[data-icon="graduation-cap"]').click(); await sleep(20);
    eq(last().icon, 'graduation-cap', 'se inserta');
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/<p:pic>/.test(xml), 'en PowerPoint, como imagen');
  });

  await test('opacidad (0–100) en el patrón, miniaturas, presentación y PowerPoint', async () => {
    reset(); const W = frame.contentWindow, M = await W.eval("import('/src/core/model.js')");
    eq(M.opacityOf({ opacity: 10 }), 0.1); eq(M.opacityOf({ opacity: 0.1 }), 0.1, 'una fracción, como fracción'); eq(M.opacityOf({}), 1);
    R.store.commit(() => { R.state.deck.master.blocks.push({ id: 'wave1', type: 'shape', shape: 'wave', x: 0, y: 500, w: 1280, h: 220, rotation: 0, animation: null, fill: '#3f6497', opacity: 10 }); });
    R.render(); await sleep(30);
    const pv = [...D.querySelectorAll('#stage .master-layer .pv-block')].find(x => x.querySelector('svg'));
    eq(pv && pv.style.opacity, '0.1', 'en el editor, bajo la diapositiva');
    assert(/opacity:0\.1;/.test(R.io.buildHTML()), 'en la presentación');
    // (A master's object: in PowerPoint's layout, not copied onto the slide.)
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);
    const xml = (await Promise.all(Object.keys(zip.files).filter(f => /slideLayouts\/slideLayout\d+\.xml$/.test(f)).map(f => zip.file(f).async('string')))).join('');
    assert(/<a:alpha val="10000"\/>/.test(xml) && !/<a:alpha val="10000"\/>/.test(await zip.file('ppt/slides/slide1.xml').async('string')), 'en PowerPoint, en el patrón, transparencia del 90 %');
    R.store.commit(() => { R.state.deck.master.blocks = R.state.deck.master.blocks.filter(x => x.id !== 'wave1'); });
  });

  await test('modelo 3D: un anillo discreto mientras carga, sin la barra gris', async () => {
    reset();
    R.store.commit(() => { slide().blocks.push({ id: 'mv1', type: 'model', src: 'data:model/gltf-binary;base64,AAAA', x: 100, y: 100, w: 300, h: 300, rotation: 0, animation: null, bleed: 2 }); });
    R.render(); await sleep(30);
    assert(D.querySelector('#stage .block[data-id="mv1"] model-viewer > .mv-loading[slot="progress-bar"]'), 'en el editor, en el centro');
    assert(/model-viewer::part\(default-progress-bar\)\{display:none\}/.test(R.io.buildHTML()), 'al presentar, sin barra');
  });

  await test('votaciones en el editor: llenan su caja', async () => {
    reset(); const W = frame.contentWindow, P = await W.eval("import('/src/features/live/poll.js')");
    const b = P.addPoll(); await sleep(30);
    const el = D.querySelector(`#stage .block[data-id="${b.id}"]`), grid = el.querySelector('.poll-blk > div');
    assert(Math.abs(grid.getBoundingClientRect().height - el.getBoundingClientRect().height) < 2, 'la vista ocupa toda la caja');
  });

  await test('Text Art: si no cabe, la letra se reduce (editor, presentación y PowerPoint)', async () => {
    reset(); const W = frame.contentWindow;
    R.blocks.addWordArt('gradient'); const b = last(); R.store.commit(() => { b.html = '¡Bienvenidos a la jornada de puertas abiertas!'; }); R.render(); await sleep(30);
    const r = D.querySelector(`#stage .block[data-id="${b.id}"] .rich`);
    assert(parseFloat(r.style.fontSize) < 80 && r.scrollHeight <= r.clientHeight + 1, 'cabe: ' + r.style.fontSize + ' ' + r.scrollHeight + '/' + r.clientHeight);
    eq(b.fontSize, 80, 'sin cambiar su tamaño propio');
    assert(new RegExp(`font-size:${parseFloat(r.style.fontSize)}px`).test(R.io.buildHTML()), 'igual en la presentación');
    R.store.commit(() => { b.html = 'Hola'; }); await sleep(20);
    eq(D.querySelector(`#stage .block[data-id="${b.id}"] .rich`).style.fontSize, '80px', 'si cabe, su tamaño');
  });

  await test('imágenes grandes: se reducen al insertarlas (como cada uno elija), conservan la transparencia y «Reducir ahora» las de la presentación', async () => {
    reset(); const W = frame.contentWindow, K = await W.eval("import('/src/features/document/imgshrink.js')");
    const photo = (w, h, alpha = false) => { const c = D.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      const im = g.createImageData(w, h); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = (i * 7) % 255; im.data[i + 1] = (i * 13) % 255; im.data[i + 2] = (i * 3) % 255; im.data[i + 3] = alpha && i % 8 === 0 ? 0 : 255; }
      g.putImageData(im, 0, 0); return alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.95); };
    const size = src => new Promise(ok => { const i = new W.Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.src = src; });
    try {
      K.setShrinkPrefs({ max: 1920, quality: 0.85 });
      const big = photo(4000, 3000); R.blocks.addImage(big); const b = last();
      for (let i = 0; i < 60 && b.src === big; i++) await sleep(50);
      const [w, h] = await size(b.src); eq(w, 1920, 'a lo sumo 1920 px'); eq(h, 1440, 'con su proporción');
      assert(b.src.length < big.length * 0.6, 'pesa bastante menos');
      R.store.undo(); await sleep(10); assert(!slide().blocks.includes(b), 'insertarla es un solo paso de deshacer (la reducción no añade otro)');
      // With transparency: kept (not a JPEG).
      const png = photo(3000, 2000, true); R.blocks.addImage(png); const p = last();
      for (let i = 0; i < 60 && p.src === png; i++) await sleep(50);
      assert(!/^data:image\/jpeg/.test(p.src) && (await size(p.src))[0] === 1920, 'con transparencia, en WebP o PNG');
      // «No reducir»: as it is.
      K.setShrinkPrefs({ max: 0 }); const raw = photo(3000, 2000); R.blocks.addImage(raw); await sleep(600); eq(last().src, raw, 'sin reducir, tal cual');
      // Now, for all of them, in one step.
      const r = await K.shrinkDeckImages({ max: 1280, quality: 0.8 });
      assert(r.done >= 2 && r.saved > 0, 'reducidas ahora: ' + JSON.stringify(r)); eq((await size(last().src))[0], 1280);
      R.store.undo(); await sleep(10); eq(last().src, raw, 'y se deshacen de una vez');
    } finally { K.setShrinkPrefs({ max: 1920, quality: 0.85 }); }
  });

  // ---- Magnifier (lupa) ------------------------------------------------------------
  const PIC = (() => { const c = D.createElement('canvas'); c.width = 1280; c.height = 720; const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1280, 720); g.fillStyle = '#ff0000'; g.fillRect(0, 0, 640, 360); g.fillStyle = '#0000ff'; g.fillRect(640, 360, 640, 360); return c.toDataURL('image/png'); })();
  const magMod = () => frame.contentWindow.eval("import('/src/features/document/magnify.js')");
  const picSlide = async () => {
    reset(); R.store.commit(() => { slide().blocks = [{ id: 'pic', type: 'image', src: PIC, x: 0, y: 0, w: 1280, h: 720, fit: 'cover', rotation: 0, animation: null }]; R.state.ui.selection = null; R.state.ui.multi = []; });
    R.render(); await sleep(20);
  };
  const drag = (el, x0, y0, x1, y1, o = {}) => {
    const W = frame.contentWindow, opt = (x, y) => ({ clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0, isPrimary: true, ...o });
    el.dispatchEvent(new W.PointerEvent('pointerdown', opt(x0, y0)));
    const to = () => (el.isConnected ? el : D);
    to().dispatchEvent(new W.PointerEvent('pointermove', opt((x0 + x1) / 2, (y0 + y1) / 2)));
    to().dispatchEvent(new W.PointerEvent('pointermove', opt(x1, y1)));
    to().dispatchEvent(new W.PointerEvent('pointerup', opt(x1, y1)));
  };
  // Slide coordinates → screen.
  const scr = (x, y) => { const r = D.getElementById('stage').getBoundingClientRect(), k = r.width / R.state.deck.size.w; return [r.left + x * k, r.top + y * k]; };
  const apart = (b, s) => !(b.x < s.x + s.w && s.x < b.x + b.w && b.y < s.y + s.h && s.y < b.y + b.h);

  await test('lupa: se dibuja la zona (Esc cancela); el recuadro aparece solo, ×2, dentro de la diapositiva y sin tapar la zona; se deshace', async () => {
    await picSlide(); const n = slide().blocks.length;
    D.querySelector('[data-action="insert-magnify"]').click(); await sleep(10);
    assert(D.querySelector('#stage .mag-draw'), 'el cursor dibuja un rectángulo');
    D.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(10);
    assert(!D.querySelector('#stage .mag-draw') && slide().blocks.length === n, 'Esc cancela');
    D.querySelector('[data-action="insert-magnify"]').click(); await sleep(10);
    drag(D.querySelector('#stage .mag-draw'), ...scr(100, 80), ...scr(300, 190)); await sleep(30);
    const b = last(); eq(b.type, 'magnify', 'una lupa');
    assert(Math.abs(b.source.x - 100) <= 2 && Math.abs(b.source.y - 80) <= 2 && Math.abs(b.source.w - 200) <= 2 && Math.abs(b.source.h - 110) <= 2, 'la zona dibujada: ' + JSON.stringify(b.source));
    eq(b.target, 'pic', 'sobre la imagen');
    const { w: W, h: H } = R.state.deck.size, s = b.source;
    assert(b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H, 'dentro de la diapositiva');
    assert(apart(b, s), 'sin tapar la zona');
    assert(Math.abs(b.w / s.w - 2) < 0.02 && Math.abs(b.w / b.h - s.w / s.h) < 0.02, `×2 con su proporción (${b.w}×${b.h})`);
    eq(R.state.ui.selection, b.id, 'seleccionada');
    const el = D.querySelector(`#stage .block[data-id="${b.id}"]`);
    eq(el.querySelectorAll('.rv-mag-lines line').length, 2, 'dos líneas');
    assert(el.querySelector('.rv-mag-lines rect.rv-mag-src') && el.querySelector('.rv-mag-fr rect'), 'marco en la zona y en el recuadro');
    assert(el.querySelector('.rv-mag-view img')?.getAttribute('src') === PIC, 'la imagen ampliada dentro');
    eq(D.querySelector('#ribbon [data-tab="ctx"]').textContent, 'Lupa', 'su pestaña');
    R.store.undo(); await sleep(20);
    assert(!slide().blocks.some(x => x.type === 'magnify'), 'deshacer la quita');
  });

  await test('lupa: líneas tangentes de las esquinas (a la derecha, debajo, encima, en diagonal; dentro: ninguna)', async () => {
    const M = await magMod(), key = ls => ls.map(l => l.join(',')).sort().join(' | ');
    const S = { x: 0, y: 0, w: 10, h: 10 };
    eq(key(M.tangentLines(S, { x: 20, y: 0, w: 20, h: 20 })), key([[10, 0, 20, 0], [0, 10, 20, 20]]), 'a la derecha, alineadas arriba');
    eq(key(M.tangentLines(S, { x: 20, y: 20, w: 10, h: 10 })), key([[10, 0, 30, 20], [0, 10, 20, 30]]), 'en diagonal');
    eq(key(M.tangentLines({ x: 0, y: 50, w: 10, h: 10 }, { x: 0, y: 0, w: 20, h: 20 })), key([[0, 50, 0, 20], [10, 60, 20, 20]]), 'encima');
    eq(key(M.tangentLines({ x: 40, y: 0, w: 10, h: 10 }, { x: 20, y: 30, w: 50, h: 30 })), key([[40, 0, 20, 30], [50, 0, 70, 30]]), 'debajo, más ancho (como una lupa)');
    eq(M.tangentLines({ x: 10, y: 10, w: 5, h: 5 }, { x: 0, y: 0, w: 50, h: 50 }).length, 0, 'una dentro de otra');
    // Every line leaves all eight corners on one side: it crosses neither rectangle.
    const P = r => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
    for (const [a, c] of [[S, { x: 30, y: -40, w: 30, h: 25 }], [{ x: 100, y: 100, w: 40, h: 20 }, { x: 10, y: 140, w: 80, h: 40 }]]) {
      const ls = M.tangentLines(a, c); eq(ls.length, 2, 'dos líneas');
      for (const [x1, y1, x2, y2] of ls) {
        const sides = [...P(a), ...P(c)].map(([x, y]) => Math.sign(Math.round((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1))));
        assert(!(sides.includes(1) && sides.includes(-1)), 'no cruza los rectángulos');
      }
    }
    const [c] = M.centerLine({ x: 0, y: 0, w: 10, h: 10 }, { x: 30, y: 0, w: 10, h: 10 });
    eq(c.join(), '10,5,30,5', 'desde el centro: de borde a borde');
  });

  await test('lupa: proporción fija al redimensionar el recuadro o la zona (Mayús la libera y la otra la sigue); aumento, colocar y al otro lado', async () => {
    await picSlide(); const M = await magMod();
    const b = M.addMagnify({ x: 100, y: 100, w: 160, h: 90 }); R.render(); await sleep(20);
    const el = () => D.querySelector(`#stage .block[data-id="${b.id}"]`), ratio = () => b.source.w / b.source.h;
    const e = el().querySelector('.handle-size.e').getBoundingClientRect();
    drag(el().querySelector('.handle-size.e'), e.left + 5, e.top + 5, e.left + 85, e.top + 5); await sleep(20);
    assert(b.w > 320 && Math.abs(b.w / b.h - ratio()) < 0.02, `el recuadro mantiene la proporción (${b.w}×${b.h})`);
    const se = el().querySelector('.mag-h.se').getBoundingClientRect(), z0 = M.zoomOf(b);
    drag(el().querySelector('.mag-h.se'), se.left + 5, se.top + 5, se.left + 45, se.top + 5); await sleep(20);
    assert(Math.abs(ratio() - 16 / 9) < 0.03 && M.zoomOf(b) < z0, `la zona también (${b.source.w}×${b.source.h}), y amplía menos`);
    const se2 = el().querySelector('.mag-h.se').getBoundingClientRect();
    drag(el().querySelector('.mag-h.se'), se2.left + 5, se2.top + 5, se2.left + 5, se2.top + 60, { shiftKey: true }); await sleep(20);
    assert(ratio() < 1.5 && Math.abs(b.w / b.h - ratio()) < 0.03, `Mayús: otra forma, y el recuadro la sigue (${b.w}×${b.h} / ${b.source.w}×${b.source.h})`);
    M.setZoom(b.id, 2.5); await sleep(10);
    assert(Math.abs(M.zoomOf(b) - 2.5) < 0.05, 'aumento ×2,5: ' + M.zoomOf(b));
    eq(D.querySelector(`#stage .block[data-id="${b.id}"] .mag-k`).textContent, '×2,5', 'el aumento se ve');
    R.store.commit(() => { Object.assign(b, { x: b.source.x, y: b.source.y }); }); M.placeAgain(b.id); await sleep(10);
    assert(apart(b, b.source), 'colocar automáticamente: fuera de la zona');
    const cx = b.x + b.w / 2 - (b.source.x + b.source.w / 2); M.swapSide(b.id); await sleep(10);
    assert(Math.sign(b.x + b.w / 2 - (b.source.x + b.source.w / 2)) !== Math.sign(cx) || b.x === 0 || b.x + b.w === R.state.deck.size.w, 'al otro lado');
  });

  await test('lupa: arrastrar la zona amplía otra parte (y cambia de imagen); mover la lupa con otros mueve también su zona', async () => {
    await picSlide(); const M = await magMod();
    R.store.commit(() => { slide().blocks.push({ id: 'pic2', type: 'image', src: PIC, x: 900, y: 500, w: 300, h: 169, fit: 'contain', rotation: 0, animation: null }); });
    const b = M.addMagnify({ x: 100, y: 100, w: 160, h: 90 }); R.render(); await sleep(20);
    const el = D.querySelector(`#stage .block[data-id="${b.id}"] .mag-src`), r = el.getBoundingClientRect(), [dx, dy] = scr(980, 560), [ox, oy] = scr(100, 100);
    drag(el, r.left + 20, r.top + 20, r.left + 20 + dx - ox, r.top + 20 + dy - oy); await sleep(20);
    assert(Math.abs(b.source.x - 980) <= 3 && Math.abs(b.source.y - 560) <= 3, 'la zona se movió: ' + JSON.stringify(b.source));
    eq(b.target, 'pic2', 'otra imagen debajo');
    R.store.commit(() => { R.state.ui.multi = ['pic2', b.id]; R.state.ui.selection = b.id; }); R.render(); await sleep(10);
    const s0 = { ...b.source }; R.store.commit(() => {});
    const { nudge } = await frame.contentWindow.eval("import('/src/ui/canvas/interact.js')"); nudge(10, 0); await sleep(10);
    eq(b.source.x, s0.x + 10, 'con la imagen, la zona va con ella');
  });

  await test('lupa: qué parte de la imagen es (contener, rellenar, recorte, volteo; fuera: ninguna)', async () => {
    const M = await magMod(), r4 = o => o && Object.values(o).map(v => +v.toFixed(4)).join(',');
    eq(r4(M.imageCrop({ x: 0, y: 0, w: 640, h: 360, fit: 'contain' }, { x: 160, y: 90, w: 80, h: 45 }, 1280, 720)), '0.25,0.25,0.625,0.625', 'contener, misma proporción');
    // A square picture contained in a 16:9 box: bands left and right.
    eq(r4(M.imageCrop({ x: 0, y: 0, w: 640, h: 360, fit: 'contain' }, { x: 140, y: 0, w: 180, h: 180 }, 1000, 1000)), '0,0,0.5,0.5', 'contener con bandas');
    eq(M.imageCrop({ x: 0, y: 0, w: 640, h: 360, fit: 'contain' }, { x: 0, y: 0, w: 100, h: 100 }, 1000, 1000), null, 'sobre la banda: no es la imagen');
    eq(r4(M.imageCrop({ x: 0, y: 0, w: 640, h: 360, fit: 'cover' }, { x: 0, y: 0, w: 320, h: 180 }, 1000, 1000)), '0,0.2188,0.5,0.5', 'rellenar (centrada)');
    eq(r4(M.imageCrop({ x: 0, y: 0, w: 640, h: 360, fit: 'fill', crop: { left: 50 } }, { x: 400, y: 0, w: 100, h: 100 }, 640, 360)), '0.625,0,0.2188,0.7222', 'recortada, dentro de lo visible');
    eq(M.imageCrop({ x: 0, y: 0, w: 640, h: 360, fit: 'fill', crop: { left: 50 } }, { x: 100, y: 0, w: 100, h: 100 }, 640, 360), null, 'en la parte recortada: no');
    eq(r4(M.imageCrop({ x: 0, y: 0, w: 640, h: 360, fit: 'fill', flipH: true }, { x: 0, y: 0, w: 160, h: 90 }, 640, 360)), '0.75,0,0,0.75', 'volteada: la parte que se ve ahí');
  });

  await test('lupa: sobre texto y gráficos, una copia viva ampliada (editor y presentación); bordes discontinuos y de otro color', async () => {
    reset(); const M = await magMod();
    const t = slide().blocks[0]; R.store.commit(() => { t.html = 'Lupa sobre texto'; });
    R.blocks.addChart(); const ch = last();
    const b = M.addMagnify({ x: t.x, y: t.y, w: 320, h: 180 }); R.render(); await sleep(20);
    const view = () => D.querySelector(`#stage .block[data-id="${b.id}"] .rv-mag-view`);
    assert(/Lupa sobre texto/.test(view().textContent), 'el texto ampliado en el editor');
    R.store.commit(() => { t.html = 'Texto cambiado'; }); await sleep(20);
    assert(/Texto cambiado/.test(view().textContent), 'sigue los cambios');
    const html = R.io.buildHTML();
    assert(/class="rv-mag"/.test(html) && /Texto cambiado/.test(html.slice(html.indexOf('rv-mag-in'))) && /Texto cambiado/.test(html.slice(0, html.indexOf('rv-mag-in'))), 'en la presentación, el texto y su copia ampliada');
    assert(/<line [^>]*stroke="#e53935"/.test(html), 'líneas rojas');
    const c2 = M.addMagnify({ x: ch.x + 40, y: ch.y + 40, w: 200, h: 120 }); R.render(); await sleep(20);
    assert(D.querySelector(`#stage .block[data-id="${c2.id}"] .rv-mag-view svg rect`), 'el gráfico ampliado');
    M.setMagStyle(c2.id, { color: '#fdd835', style: 'dashed' }); R.store.commit(() => { c2.lines = 'center'; }); await sleep(20);
    const fr = D.querySelector(`#stage .block[data-id="${c2.id}"] .rv-mag-fr rect`);
    assert(fr.getAttribute('stroke') === '#fdd835' && fr.hasAttribute('stroke-dasharray'), 'amarillo y discontinuo');
    eq(D.querySelectorAll(`#stage .block[data-id="${c2.id}"] .rv-mag-lines line`).length, 1, 'una línea desde el centro');
    R.store.commit(() => { b.border = { ...b.border, color: '"><script>x</script>' }; }); await sleep(10);
    assert(!/<script>x/.test(R.io.buildHTML()), 'un color que no es un color no entra en el SVG');
  });

  await test('lupa: con entrada «Zoom» crece desde la zona; en la pestaña, colores rápidos y «Aparecer con zoom»', async () => {
    await picSlide(); const M = await magMod();
    const b = M.addMagnify({ x: 100, y: 100, w: 160, h: 90 }); R.render(); await sleep(20);
    D.querySelector('[data-tab="ctx"]').click(); await sleep(40);
    const page = D.querySelector('#ribbon [data-page="ctx"]');
    const sw = [...page.querySelectorAll('.ctx-swatch')]; eq(sw.length, 5, 'cinco colores rápidos');
    sw[1].click(); await sleep(20); eq(b.border.color, '#fdd835', 'amarillo');
    [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => /Aparecer con zoom/.test(x.textContent)).click(); await sleep(20);
    eq(b.animation?.effect, 'zoom-in', 'entrada con zoom');
    const html = R.io.buildHTML(), tag = html.match(/<div[^>]*class="[^"]*rv-mag[^"]*"[^>]*>/)[0];
    assert(/fragment/.test(tag) && /zoom-in/.test(tag), 'animada al presentar');
    const v = M.viewOf(b); assert(tag.includes(`transform-origin:${Math.round(v.x + v.w / 2 - b.x)}px ${Math.round(v.y + v.h / 2 - b.y)}px`), 'crece desde la zona');
    D.querySelector('[data-tab="home"]').click();
  });

  await test('lupa: en PowerPoint, la parte de la imagen recortada (srcRect) o una imagen de lo que hay, y el marco y las líneas como formas', async () => {
    await picSlide(); const M = await magMod(), W = frame.contentWindow;
    const b = M.addMagnify({ x: 320, y: 180, w: 160, h: 90 });
    R.blocks.addChart(); const ch = last(); R.store.commit(() => Object.assign(ch, { x: 700, y: 360 }));
    const c = M.addMagnify({ x: 760, y: 420, w: 160, h: 90 });
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    for (const n of ['-line1', '-line2', '-area', '', '-frame']) assert(xml.includes(`name="rv-${b.id}${n}"`), 'pieza ' + n);
    const pic = xml.slice(xml.indexOf(`name="rv-${b.id}"`)), rect = pic.match(/<a:srcRect l="(\d+)" t="(\d+)" r="(\d+)" b="(\d+)"\/>/);
    assert(rect && +rect[1] === 25000 && +rect[2] === 25000 && +rect[3] === 62500 && +rect[4] === 62500, 'recortada: ' + (rect && rect[0]));
    const cp = xml.slice(xml.lastIndexOf('<p:pic>', xml.indexOf(`name="rv-${c.id}"`)));
    assert(cp.indexOf(`name="rv-${c.id}"`) < cp.indexOf('</p:pic>') && !/<a:srcRect/.test(cp.slice(0, cp.indexOf('</p:pic>'))), 'la del gráfico, una imagen de lo que hay');
    assert((xml.match(/prst="line"/g) || []).length >= 4, 'líneas nativas');
    assert(/<a:srgbClr val="E53935"/.test(xml), 'en rojo');
  });

  await test('lupa de una lupa: el recuadro de la otra se ve ampliado (editor, presentación), sin bucles', async () => {
    reset(); const M = await magMod();
    const t = slide().blocks[0]; R.store.commit(() => { t.html = 'Detalle pequeño'; });
    const a = M.addMagnify({ x: t.x, y: t.y, w: 160, h: 90 }); R.render(); await sleep(20);
    // Desde la pestaña de la lupa: una zona de su recuadro.
    R.store.commit(() => R.store.setSelection(a.id), { history: false }); await sleep(20); D.querySelector('[data-tab="ctx"]').click(); await sleep(40);
    D.querySelector('#ribbon [data-page="ctx"] [data-ctx="magnify-again"]').click(); await sleep(10);
    drag(D.querySelector('#stage .mag-draw'), ...scr(a.x + 10, a.y + 10), ...scr(a.x + a.w / 2, a.y + a.h / 2)); await sleep(30);
    const b = last(); eq(b.type, 'magnify', 'otra lupa');
    assert(b.source.x >= a.x - 1 && b.source.x + b.source.w <= a.x + a.w + 1, 'su zona, dentro del recuadro de la primera');
    R.render(); await sleep(20);
    const inner = D.querySelector(`#stage .block[data-id="${b.id}"] .rv-mag-view .rv-mag-view`);
    assert(inner && /Detalle pequeño/.test(inner.textContent), 'en el editor, la primera lupa dentro de la segunda');
    const html = R.io.buildHTML(), at = html.indexOf(`data-bid="${b.id}"`) >= 0 ? html.indexOf(`data-bid="${b.id}"`) : html.lastIndexOf('class="rv-mag"');
    eq((html.slice(at).match(/class="rv-mag-in"/g) || []).length >= 2, true, 'en la presentación, también anidada');
    // Una lupa que se amplía a sí misma (las dos zonas sobre el otro recuadro) no se repite sin fin.
    R.store.commit(() => { a.source = { x: b.x, y: b.y, w: b.w / 2, h: b.h / 2 }; }); R.render(); await sleep(20);
    assert(R.io.buildHTML().length < 2e6, 'sin bucles');
    D.querySelector('[data-tab="home"]').click();
  });

  await test('lupa: «Ampliar una zona de la imagen» desde la imagen (la zona se queda en ella)', async () => {
    reset(); R.store.commit(() => { slide().blocks = [{ id: 'pic', type: 'image', src: PIC, x: 200, y: 200, w: 400, h: 225, fit: 'cover', rotation: 0, animation: null }]; R.state.ui.selection = 'pic'; R.state.ui.multi = ['pic']; });
    R.render(); await sleep(20); D.querySelector('[data-tab="ctx"]').click(); await sleep(40);
    D.querySelector('#ribbon [data-page="ctx"] [data-ctx="magnify-image"]').click(); await sleep(10);
    drag(D.querySelector('#stage .mag-draw'), ...scr(500, 300), ...scr(900, 600)); await sleep(30);
    const b = last(); eq(b.type, 'magnify', 'una lupa');
    assert(b.source.x + b.source.w <= 601 && b.source.y + b.source.h <= 426, 'dentro de la imagen: ' + JSON.stringify(b.source));
    eq(b.target, 'pic', 'de esa imagen'); D.querySelector('[data-tab="home"]').click();
  });

  // ---- Duplicating by dragging, smart duplicate, tidy up, same size, swap ---------
  const rects = boxes => { R.store.commit(() => { slide().blocks = boxes.map(([x, y, w, h], i) => ({ id: 'r' + i, type: 'shape', shape: 'rect', x, y, w, h, rotation: 0, animation: null }));
    R.state.ui.selection = null; R.state.ui.multi = []; }); R.render(); return slide().blocks; };
  const elOf = b => D.querySelector(`#stage .block[data-id="${b.id}"]`);
  const PE = (t, x, y, o = {}) => new frame.contentWindow.PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0, pointerType: 'mouse', ...o });
  const pickIds = ids => { R.store.commit(() => R.store.setMulti(ids), { history: false }); R.render(); };

  await test('Alt + arrastrar duplica: la copia va con el ratón, el original se queda; un paso de deshacer; Ctrl+D repite el paso', async () => {
    reset(); const snap = R.state.ui.snap; R.state.ui.snap = false;
    try {
      const [s] = rects([[100, 100, 200, 100]]); await sleep(10);
      const el = elOf(s), r = el.getBoundingClientRect(), k = r.width / s.w, x0 = r.left + 20, y0 = r.top + 20;
      el.dispatchEvent(PE('pointerdown', x0, y0, { altKey: true }));
      el.dispatchEvent(PE('pointermove', x0 + 150 * k, y0, { altKey: true }));
      el.dispatchEvent(PE('pointermove', x0 + 300 * k, y0, { altKey: true }));
      eq(D.querySelectorAll('#stage .dup-ghost').length, 1, 'mientras tanto, el original se ve en su sitio');
      el.dispatchEvent(PE('pointerup', x0 + 300 * k, y0, { altKey: true })); await sleep(20);
      eq(slide().blocks.length, 2, 'una copia');
      const [o, c] = slide().blocks;
      eq(o.id + ':' + o.x, 'r0:100', 'el original (con su id) se queda donde estaba'); eq(c.x + ',' + c.y, '400,100', 'la copia, donde se suelta');
      assert(c.id !== 'r0' && R.state.ui.selection === c.id, 'la copia, seleccionada');
      assert(!D.querySelector('#stage .dup-ghost'), 'sin restos');
      D.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true })); await sleep(10);
      eq(slide().blocks.length, 3, 'Ctrl+D, otra'); eq(last().x + ',' + last().y, '700,100', 'al mismo paso (300 px)');
      R.store.undo(); R.store.undo(); await sleep(10);
      eq(slide().blocks.length, 1, 'cada una, un paso de deshacer'); eq(slide().blocks[0].x, 100, 'y el original, en su sitio');
      // Without moving, Alt+click makes nothing.
      const e2 = elOf(slide().blocks[0]); e2.dispatchEvent(PE('pointerdown', x0, y0, { altKey: true })); e2.dispatchEvent(PE('pointerup', x0, y0, { altKey: true })); await sleep(10);
      eq(slide().blocks.length, 1, 'Alt+clic no copia');
    } finally { R.state.ui.snap = snap; }
  });

  await test('duplicado inteligente: duplicar, mover la copia y Ctrl+D pone la siguiente al mismo paso; un grupo copiado es otro grupo', async () => {
    reset(); const [s] = rects([[100, 200, 120, 80]]); select(s);
    R.blocks.duplicateSelected(); let c = last(); eq(c.x + ',' + c.y, '124,224', 'la primera, desplazada un poco');
    R.store.commit(() => { c.x = 260; c.y = 200; });                       // (moved by the user: 160 px to the right of the original)
    R.blocks.duplicateSelected(); c = last(); eq(c.x + ',' + c.y, '420,200', 'la siguiente, al mismo paso');
    R.blocks.duplicateSelected(); c = last(); eq(c.x + ',' + c.y, '580,200', 'y otra');
    select(slide().blocks[0]); R.state.ui.multi = []; R.blocks.duplicateSelected(); eq(last().x + ',' + last().y, '124,224', 'de otro objeto: el desplazamiento de siempre');
    // A group copied: the copies are a new group of their own.
    const [a, b] = rects([[100, 100, 100, 100], [300, 100, 100, 100]]);
    R.store.commit(() => { a.groupId = b.groupId = 'g1'; }); pickIds([a.id, b.id]);
    R.blocks.duplicateSelected(); const [ca, cb] = slide().blocks.slice(-2);
    assert(ca.groupId && ca.groupId === cb.groupId && ca.groupId !== 'g1', 'las copias, otro grupo');
  });

  await test('ordenar en cuadrícula, fila y columna: misma separación, en el orden de lectura; un solo paso', async () => {
    reset(); let [a, b, c, d] = rects([[100, 100, 100, 100], [420, 130, 100, 100], [150, 400, 100, 100], [500, 380, 100, 100]]);
    pickIds([a.id, b.id, c.id, d.id]); await sleep(10);
    assert(!D.querySelector('[data-action="tidy-grid"]').disabled, 'el botón, activo con varios');
    D.querySelector('[data-action="tidy-grid"]').click(); await sleep(10);
    eq([a, b, c, d].map(o => o.x + ',' + o.y).join(' '), '100,100 500,100 100,400 500,400', 'dos por dos, ocupando lo que ocupaban');
    R.store.undo(); eq(slide().blocks[1].x + ',' + slide().blocks[1].y, '420,130', 'un paso de deshacer');
    // A row of different sizes: the same gap, centred on one line.
    [a, b, c] = rects([[100, 100, 100, 50], [300, 300, 150, 100], [700, 150, 80, 80]]); pickIds([a.id, b.id, c.id]);
    R.blocks.tidySelected('row');
    eq(b.x - (a.x + a.w), c.x - (b.x + b.w), 'huecos iguales'); eq(a.x + ',' + (c.x + c.w), '100,780', 'en lo que ocupaban');
    eq([a, b, c].map(o => o.y + o.h / 2).join(), '150,150,150', 'centrados en una línea');
    R.blocks.tidySelected('col');
    eq([a, b, c].map(o => o.x + o.w / 2).join(), '175,175,175', 'en columna, centrados');
    eq(b.y - (a.y + a.h), c.y - (b.y + b.h), 'con huecos iguales');
    // Piled up: a comfortable gap.
    [a, b, c] = rects([[200, 200, 100, 100], [205, 205, 100, 100], [210, 200, 100, 100]]); pickIds([a.id, b.id, c.id]);
    R.blocks.tidySelected('row'); eq(slide().blocks.map(o => o.x).sort((p, q) => p - q).join(), '200,324,448', 'amontonados: 24 px entre ellos');
    pickIds([a.id]); await sleep(10); assert(D.querySelector('[data-action="tidy-grid"]').disabled, 'con uno solo, desactivado');
  });

  await test('igualar ancho, alto y tamaño al último seleccionado; intercambiar dos imágenes conserva su recorte', async () => {
    reset(); const [a, b, c] = rects([[100, 100, 100, 50], [300, 100, 200, 100], [600, 100, 300, 250]]);
    pickIds([a.id, b.id, c.id]); await sleep(10);
    D.querySelector('[data-action="match-w"]').click(); eq([a.w, b.w, a.h].join(), '300,300,50', 'el ancho del último');
    D.querySelector('[data-action="match-h"]').click(); eq([a.h, b.h].join(), '250,250', 'el alto');
    R.store.undo(); R.store.undo(); pickIds(['r0', 'r1', 'r2']); D.querySelector('[data-action="match-size"]').click();
    eq(slide().blocks.map(o => o.w + 'x' + o.h).join(), '300x250,300x250,300x250', 'el tamaño'); eq(slide().blocks[0].x, 100, 'cada uno desde su esquina');
    // Swapping two pictures: each takes the other's place, keeping its own proportion and crop.
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    R.store.commit(() => { slide().blocks = [
      { id: 'p1', type: 'image', src: PNG, x: 100, y: 100, w: 400, h: 300, fit: 'fill', crop: { top: 10, left: 5 }, rotation: 0, animation: null },
      { id: 'p2', type: 'image', src: PNG, x: 700, y: 100, w: 200, h: 200, fit: 'cover', focusX: 30, rotation: 8, animation: null }]; R.state.ui.selection = null; R.state.ui.multi = []; });
    pickIds(['p1', 'p2']); await sleep(10);
    assert(!D.querySelector('[data-action="swap-objects"]').disabled, 'el botón, activo con dos');
    D.querySelector('[data-action="swap-objects"]').click(); await sleep(10);
    const p1 = slide().blocks.find(o => o.id === 'p1'), p2 = slide().blocks.find(o => o.id === 'p2');
    eq([p1.x, p1.y, p1.w, p1.h, p1.rotation].join(), '700,125,200,150,8', 'la primera, en el sitio de la segunda (4:3, centrada)');
    eq([p2.x, p2.y, p2.w, p2.h, p2.rotation].join(), '150,100,300,300,0', 'la segunda, en el de la primera (cuadrada)');
    eq(JSON.stringify(p1.crop) + p2.fit + p2.focusX, '{"top":10,"left":5}cover30', 'cada una con su recorte');
    eq(slide().blocks.map(o => o.id).join(), 'p2,p1', 'y delante la que estaba delante en ese sitio');
    R.store.undo(); eq(slide().blocks.find(o => o.id === 'p1').x, 100, 'un paso de deshacer');
    // From the right-click menu too.
    pickIds(['p1', 'p2']); await sleep(10); const W = frame.contentWindow, el = elOf(slide().blocks[0]), r = el.getBoundingClientRect();
    el.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 }));
    const items = [...D.querySelectorAll('#context-menu .ctx-item')].map(x => x.textContent);
    assert(['Intercambiar', 'Ordenar en cuadrícula', 'Igualar tamaño'].every(x => items.includes(x)), 'en el menú: ' + items.join('|'));
    [...D.querySelectorAll('#context-menu .ctx-item')].find(x => x.textContent === 'Intercambiar').click(); await sleep(10);
    eq(slide().blocks.find(o => o.id === 'p1').x, 700, 'Intercambiar desde el menú');
  });

  await test('cambiar imagen: soltada sobre otra la sustituye (posición, tamaño, ajuste, animaciones y texto alternativo se quedan); en un marcador de imagen lo rellena', async () => {
    reset(); const W = frame.contentWindow;
    const png1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const png2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGP4z8AARwzIHABvqgf5gNwAKAAAAABJRU5ErkJggg==';
    const file = async (src, name) => new W.File([await (await W.fetch(src)).blob()], name, { type: 'image/png' });
    R.blocks.addImage(png1); await sleep(30); const b = last();
    R.store.commit(() => { Object.assign(b, { x: 100, y: 80, w: 400, h: 300, fit: 'cover', alt: 'Mi foto', crop: { left: 10 }, rotation: 12, uncropped: { src: png1 }, focusX: 20 }); b.animation = { effect: 'fade-in', duration: 600 }; });
    const n = slide().blocks.length;
    // Dropped as the user does: dragged over it (it says it will be replaced), then let go.
    const wrap = D.getElementById('canvas-wrap'), r = D.getElementById('stage').getBoundingClientRect(), k = R.state.deck.size.w / r.width;
    const dt = new W.DataTransfer(); dt.items.add(await file(png2, 'nueva.png'));
    const o = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 300 / k, clientY: r.top + 230 / k };
    wrap.dispatchEvent(new W.DragEvent('dragover', o));
    assert(D.querySelector(`#stage .block[data-id="${b.id}"]`).classList.contains('drop-replace'), 'al arrastrar encima, se marca la imagen que se cambiará');
    wrap.dispatchEvent(new W.DragEvent('drop', o)); await sleep(300);
    const nb = slide().blocks.find(x => x.id === b.id);
    eq(slide().blocks.length, n, 'no se añade otra imagen'); eq(nb.src, png2, 'la imagen nueva');
    eq(JSON.stringify([nb.x, nb.y, nb.w, nb.h, nb.rotation, nb.fit, nb.alt, nb.crop.left, nb.animation.effect]), JSON.stringify([100, 80, 400, 300, 12, 'cover', 'Mi foto', 10, 'fade-in']), 'lo del objeto se queda');
    assert(!nb.uncropped && nb.focusX == null, 'lo que era de la imagen anterior se va');
    assert(!D.querySelector('#stage .drop-replace'), 'la marca se va');
    R.store.undo(); await sleep(20); eq(slide().blocks.find(x => x.id === b.id).src, png1, 'un paso de deshacer');
    // Away from it: a new picture, as before.
    await R.openfile.insertFiles([await file(png2, 'otra.png')], [1200, 690]); await sleep(30);
    eq(slide().blocks.length, n + 1, 'soltada fuera de la imagen: otra imagen');
    // An empty picture placeholder of a layout: filled, in its place.
    R.store.commit(() => { slide().blocks.push({ id: 'phpic', type: 'placeholder', ph: 'picture', x: 700, y: 100, w: 400, h: 300, rotation: 0, animation: null }); }); await sleep(20);
    await R.openfile.insertFiles([await file(png1, 'foto.png')], [900, 250]); await sleep(30);
    const filled = slide().blocks.find(x => x.type === 'image' && x.x === 700 && x.y === 100);
    assert(filled && filled.w === 400 && filled.h === 300 && filled.src === png1 && !slide().blocks.some(x => x.id === 'phpic'), 'el marcador de imagen, relleno');
  });

  await test('cambiar imagen: botón en la pestaña Imagen y en el menú contextual (desde el ordenador o desde Recursos)', async () => {
    reset(); const W = frame.contentWindow;
    const png1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const png2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGP4z8AARwzIHABvqgf5gNwAKAAAAABJRU5ErkJggg==';
    R.blocks.addImage(png1); await sleep(30); const b = last(); select(b); await sleep(20);
    const btn = D.querySelector('#ribbon [data-page="ctx"] [data-ctx="change-image"]');
    assert(btn && /Cambiar imagen/.test(btn.textContent), 'en la pestaña de la imagen');
    btn.click(); await sleep(10);
    const menu = D.getElementById('change-image'); assert(menu && menu.querySelectorAll('[data-ci]').length === 2, 'elige de dónde');
    // From Recursos: the next picture the panel puts on the slide goes into this one.
    const panel = D.createElement('aside'); panel.id = 'elements-panel'; D.body.appendChild(panel);
    menu.querySelector('[data-ci="elements"]').click(); await sleep(30);
    const n = slide().blocks.length;
    R.store.commit(() => { const x = { id: 'stock1', type: 'image', x: 0, y: 0, w: 50, h: 50, rotation: 0, animation: null, src: png2, alt: 'Un gato', caption: '«Gato» (CC BY)', credit: 'Autor' }; slide().blocks.push(x); R.state.ui.selection = x.id; });
    await sleep(30); panel.remove();
    const nb = slide().blocks.find(x => x.id === b.id);
    eq(slide().blocks.length, n, 'no queda la imagen del panel'); eq(nb.src, png2, 'la del panel, en la imagen elegida');
    eq(nb.alt, 'Un gato', 'con su descripción (no tenía)'); eq(nb.credit, 'Autor', 'y su atribución');
    // The context menu.
    D.querySelector(`#stage .block[data-id="${b.id}"]`).dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 400, clientY: 300 })); await sleep(10);
    assert([...D.querySelectorAll('#context-menu .ctx-item')].some(x => x.textContent === 'Cambiar imagen…'), 'en el menú contextual');
    D.getElementById('context-menu').hidden = true;
  });

  await test('copiar formato como modo: un clic, un objeto; doble clic, varios hasta Esc; con el cursor de brocha', async () => {
    reset(); const W = frame.contentWindow;
    R.blocks.addShape('rect'); const a = last(); R.blocks.addShape('rect'); const b = last(); R.blocks.addShape('ellipse'); const c = last();
    R.store.commit(() => { Object.assign(a, { fill: '#ff0000', stroke: '#00ff00', strokeWidth: 6 }); });
    select(a); await sleep(20);
    const brush = D.querySelector('#ribbon [data-action="copy-style"]'), el = x => D.querySelector(`#stage .block[data-id="${x.id}"]`);
    const paint = x => el(x).dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
    brush.click(); await sleep(10);
    assert(D.body.classList.contains('format-painting'), 'la brocha, preparada (su cursor)');
    assert(brush.classList.contains('on'), 'el botón, pulsado');
    paint(b); await sleep(20);
    eq(slide().blocks.find(x => x.id === b.id).fill, '#ff0000', 'el objeto que se pulsa toma el formato');
    assert(!D.body.classList.contains('format-painting'), 'con un clic, solo para uno');
    paint(c); await sleep(20); assert(slide().blocks.find(x => x.id === c.id).fill !== '#ff0000', 'el siguiente, no');
    // Double click: for several, until Esc.
    select(a); await sleep(10); brush.click(); brush.click(); await sleep(10);
    R.store.commit(() => { slide().blocks.find(x => x.id === b.id).fill = '#123456'; });
    paint(b); await sleep(10); paint(c); await sleep(10);
    eq(slide().blocks.find(x => x.id === c.id).strokeWidth, 6, 'doble clic: varios'); eq(slide().blocks.find(x => x.id === b.id).fill, '#ff0000');
    assert(D.body.classList.contains('format-painting'), 'sigue preparada');
    D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(10);
    assert(!D.body.classList.contains('format-painting'), 'Esc la guarda');
    // The button again puts it away; «Pegar formato» still pastes what was copied.
    select(a); brush.click(); await sleep(600); brush.click(); await sleep(10);
    assert(!D.body.classList.contains('format-painting'), 'el botón otra vez la guarda');
    R.store.commit(() => { slide().blocks.find(x => x.id === c.id).fill = '#abcdef'; }); select(slide().blocks.find(x => x.id === c.id));
    (await W.eval("import('/src/ui/ribbon/actions.js')")).ACTIONS['paste-style'](); await sleep(10); eq(slide().blocks.find(x => x.id === c.id).fill, '#ff0000', 'Pegar formato sigue funcionando');
    // The object's tab has it too.
    select(a); await sleep(20); const ctx = D.querySelector('#ribbon [data-page="ctx"] [data-ctx="copy-style"]');
    if (ctx) { ctx.click(); await sleep(10); assert(D.body.classList.contains('format-painting'), 'desde la pestaña del objeto'); D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
  });

  await test('copiar formato en el texto: lo seleccionado con el ratón toma el aspecto de los caracteres copiados', async () => {
    reset(); const W = frame.contentWindow, b = newText();
    R.store.commit(() => { b.html = '<b>Negrita</b> y normal'; }); await sleep(20);
    const rich = richOf(b); rich.contentEditable = 'true'; rich.focus();
    const sel = W.getSelection(), r = D.createRange(); r.setStart(rich.querySelector('b').firstChild, 2); r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
    const brush = D.querySelector('#ribbon [data-action="copy-style"]');
    const down = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true }); brush.dispatchEvent(down);
    assert(down.defaultPrevented, 'pulsar la brocha no saca del texto'); brush.click(); await sleep(10);
    const txt = [...rich.childNodes].find(n => n.nodeType === 3 && /normal/.test(n.data)), r2 = D.createRange();
    r2.setStart(txt, txt.data.indexOf('normal')); r2.setEnd(txt, txt.data.indexOf('normal') + 6); sel.removeAllRanges(); sel.addRange(r2);
    rich.dispatchEvent(new W.MouseEvent('mouseup', { bubbles: true })); await sleep(30);
    assert([...rich.querySelectorAll('b')].some(x => x.textContent === 'normal'), 'lo seleccionado, en negrita: ' + rich.innerHTML);
    assert(/normal/.test(slide().blocks.find(x => x.id === b.id).html) && /<b>Negrita<\/b>/.test(slide().blocks.find(x => x.id === b.id).html), 'guardado en el cuadro');
    assert(!D.body.classList.contains('format-painting'), 'y la brocha se guarda');
    rich.blur();
  });

  // ── Maps that fly from stop to stop (Insertar ▸ Mapa). Without the network: MapLibre is a stand-in (mapStub), the
  // place search answers from here.
  const mapStub = `(function(){var W=window;function M(o){var t=this;t.o=o;t.c=o.center;t.z=o.zoom;t.p=o.pitch||0;t.b=o.bearing||0;t.h={};t.src={};t.lay={};t.flights=[];
    t.cv=document.createElement('canvas');t.cv.width=Math.max(16,o.container.clientWidth||100);t.cv.height=Math.max(9,o.container.clientHeight||60);o.container.appendChild(t.cv);
    t.keyboard={disable:function(){t.noKeys=true;}};(W.__maps=W.__maps||[]).push(t);t.style={tileManagers:{v:new TM('vector',512),r:new TM('raster',256),g:new TM('geojson',512)},_layers:{a:{source:'v',isHidden:function(){return false;}},b:{source:'r',isHidden:function(){return false;}}}};
    setTimeout(function(){t.fire('style.load');t.fire('load');t.fire('idle');},10);}
  function Id(oz,w,z,x,y){this.overscaledZ=oz;this.wrap=w;this.canonical={z:z,x:x,y:y};this.key=[oz,w,z,x,y].join('/');}
  Id.prototype={constructor:Id,scaledTo:function(z){return new Id(z,this.wrap,z,this.canonical.x>>(this.canonical.z-z),this.canonical.y>>(this.canonical.z-z));},
    wrapped:function(){return new Id(this.overscaledZ,0,this.canonical.z,this.canonical.x,this.canonical.y);},overscaleFactor:function(){return 1;}};
  function Tile(id,size,has){this.tileID=id;this.state=has?'loaded':'loading';}Tile.prototype={constructor:Tile,hasData:function(){return this.state==='loaded';},getExpiryTimeout:function(){}};
  function TM(type,size){this.src=this._source={type:type,tileSize:size,minzoom:0,maxzoom:14};this.loads=[];this.transform={};var z0=new Id(0,0,0,0,0);
    this._inViewTiles={m:{},getAllTiles:function(){var m=this.m;return Object.keys(m).map(function(k){return m[k];});},getTileById:function(k){return this.m[k]||null;}};this._inViewTiles.m[z0.key]=new Tile(z0,size,true);
    this._outOfViewCache={data:{},order:[],max:10,has:function(id){return id.wrapped().key in this.data;},add:function(id,v){var k=id.wrapped().key;this.data[k]=v;this.order.push(k);this.setMaxSize(this.max);return this;},
      setMaxSize:function(n){this.max=n;while(this.order.length>n)delete this.data[this.order.shift()];return this;}};}
  TM.prototype={getSource:function(){return this.src;},updateCacheSize:function(){this._outOfViewCache.setMaxSize(10);},_unloadTile:function(){},
    _updateRetainedTiles:function(ideal){var v=this._inViewTiles.m;this.got=ideal;ideal.forEach(function(id){if(!v[id.key])v[id.key]=new Tile(id,512,true);});return{};},
    update:function(tr){var z=Math.max(0,Math.min(14,Math.floor(tr.zoom))),n=1<<z,x=Math.floor((tr.center[0]+180)/360*n),y=Math.floor((90-tr.center[1])/180*n);
      this.transform=tr;this._updateRetainedTiles([new Id(z,0,z,(x%n+n)%n,Math.max(0,Math.min(n-1,y)))]);},
    _loadTile:function(tile){var t=this;t.loads.push(tile.tileID.key);return new Promise(function(ok){(function w(){if(W.__slowTiles&&Date.now()<W.__slowTiles)return setTimeout(w,30);tile.state='loaded';setTimeout(ok,5);})();});}};
  W.__TileId=Id;
  M.prototype={on:function(e,f){(this.h[e]=this.h[e]||[]).push(f);return this;},once:function(e,f){var t=this,g=function(){t.h[e]=t.h[e].filter(function(x){return x!==g;});f();};return this.on(e,g);},
    fire:function(e){(this.h[e]||[]).slice().forEach(function(f){f();});},off:function(e,f){this.h[e]=(this.h[e]||[]).filter(function(x){return x!==f;});return this;},
    areTilesLoaded:function(){var t=this;if(W.__slowTiles&&Date.now()<W.__slowTiles){setTimeout(function(){t.fire('render');},50);return false;}return true;},isMoving:function(){return false;},setProjection:function(p){this.proj=p.type;},setSky:function(){},setTerrain:function(x){this.terrain=x;},
    getStyle:function(){return{layers:[]};},setLayoutProperty:function(){},setPaintProperty:function(){},getSource:function(id){return this.src[id];},
    addSource:function(id,s){var t=this;t.src[id]=Object.assign({},s,{setData:function(d){t.src[id].data=d;}});},getLayer:function(id){return this.lay[id];},addLayer:function(l){this.lay[l.id]=l;},
    flyTo:function(o){this.flights.push(Object.assign({at:Date.now()},o));
      if(Object.prototype.hasOwnProperty.call(this,'_ease')){var k=o.easing(1),c=this.c,z=this.z;this.jumpTo({center:[c[0]+(o.center[0]-c[0])*k,c[1]+(o.center[1]-c[1])*k],zoom:z+(o.zoom-z)*k-6*Math.sin(Math.PI*k),pitch:o.pitch,bearing:o.bearing});}
      else this.jumpTo(o);},
    get transform(){return{zoom:this.z,center:this.c};},jumpTo:function(o){(this.moves=this.moves||[]).push(o.center);this.c=o.center;this.z=o.zoom;this.p=o.pitch;this.b=o.bearing;},stop:function(){},
    getCenter:function(){return{lng:this.c[0],lat:this.c[1]};},getZoom:function(){return this.z;},getPitch:function(){return this.p;},getBearing:function(){return this.b;},
    project:function(){return{x:40,y:20};},getCanvas:function(){return this.cv;},triggerRepaint:function(){var t=this;setTimeout(function(){t.fire('render');t.fire('idle');},5);},resize:function(){},setPixelRatio:function(){},
    remove:function(){this.removed=true;},setStyle:function(s){var t=this;t.o.style=s;setTimeout(function(){t.fire('style.load');},5);}};
  function K(o){this.e=o.element;}K.prototype={setLngLat:function(c){this.c=c;return this;},addTo:function(m){m.o.container.appendChild(this.e);return this;},getElement:function(){return this.e;},remove:function(){this.e.remove();}};
  W.maplibregl={Map:M,Marker:K};})();`;
  const PLACES = { madrid: ['Madrid', 'Madrid, España', 40.4168, -3.7038, 'es'], paris: ['París', 'París, Francia', 48.8566, 2.3522, 'fr'], roma: ['Roma', 'Roma, Italia', 41.9028, 12.4964, 'it'] };
  const mapSetup = async () => {
    const W = frame.contentWindow, G = await W.eval("import('/src/features/content/geomap.js')");
    if (!W.maplibregl) W.eval(mapStub);
    const asked = [];
    G.clearGeocodeCache();
    G.geocoder.fetch = async (u, o) => { asked.push({ u, o, at: Date.now() }); const q = decodeURIComponent(/[?&]q=([^&]*)/.exec(u)[1]).toLowerCase(), p = PLACES[q];
      return { ok: true, json: async () => (p ? [{ name: p[0], display_name: p[1], lat: String(p[2]), lon: String(p[3]), boundingbox: [String(p[2] - 0.15), String(p[2] + 0.15), String(p[3] - 0.2), String(p[3] + 0.2)], address: { country_code: p[4] } }] : []) }; };
    return { W, G, asked };
  };
  const searchAdd = async q => {
    D.querySelector('#map-modal .gm-q').value = q; D.querySelector('#map-modal .gm-search').requestSubmit();
    for (let k = 0; k < 40 && !D.querySelector('#map-modal .gm-res'); k++) await sleep(100);
    D.querySelector('#map-modal .gm-res').click(); await sleep(30);
  };

  await test('mapa: se inserta con su diálogo; cancelar uno nuevo lo quita; buscar lugares respeta a Nominatim', async () => {
    reset(); const { G, asked } = await mapSetup(), n = slide().blocks.length;
    D.querySelector('[data-action="insert-map"]').click();
    for (let k = 0; k < 30 && !D.getElementById('map-modal'); k++) await sleep(50);
    assert(D.getElementById('map-modal') && slide().blocks.at(-1).type === 'map', 'Insertar ▸ Mapa: el bloque y su diálogo');
    assert(D.querySelector('#map-modal .gm-view canvas'), 'el mapa en vivo, en el diálogo');
    eq(D.querySelectorAll('#map-modal .gm-look').length, 3, 'tres estilos, con su ejemplo'); assert(D.querySelector('#map-modal .gm-look svg'), 'cada uno con su dibujo');
    D.querySelector('#map-modal .gm-cancel').click(); await sleep(30);
    eq(slide().blocks.length, n, 'cancelado, el mapa nuevo no se queda');
    // Search: only when asked, at most one a second, the referrer sent, answers kept.
    const a = await G.geocode('Madrid', { lang: 'es' }), b = await G.geocode('París', { lang: 'es' });
    eq(a[0].name, 'Madrid'); eq(a[0].cc, 'es', 'con su país (para su bandera)'); assert(a[0].zoom > 8 && a[0].zoom < 13, 'zoom según su tamaño: ' + a[0].zoom);
    eq(asked.length, 2); assert(asked[1].at - asked[0].at >= 1000, 'una petición por segundo como mucho');
    assert(/nominatim\.openstreetmap\.org\/search\?format=jsonv2/.test(asked[0].u) && /accept-language=es/.test(asked[0].u), 'Nominatim, en el idioma');
    eq(asked[0].o.referrerPolicy, 'strict-origin-when-cross-origin', 'se identifica con la dirección de la página');
    await G.geocode('madrid', { lang: 'es' }); eq(asked.length, 2, 'lo ya buscado no se vuelve a pedir');
  });

  await test('mapa: paradas buscadas y con la vista actual, reordenar y quitar; al aplicar, una imagen por parada y un paso por vuelo', async () => {
    reset(); const { G } = await mapSetup();
    const b = G.addMap(); const M = await frame.contentWindow.eval("import('/src/ui/dialogs/geomap.js')"); M.openMapEditor(b, { isNew: true }); await sleep(60);
    await searchAdd('madrid'); await searchAdd('paris'); await searchAdd('roma');
    eq([...D.querySelectorAll('#map-modal .gm-name')].map(x => x.value).join(), 'Madrid,París,Roma', 'tres paradas buscadas');
    // «Añadir la vista actual»: where the (stand-in) map is looking.
    const live = frame.contentWindow.__maps.filter(x => x.o.attributionControl !== false).at(-1); live.jumpTo({ center: [-0.38, 39.47], zoom: 9 + Math.log2(D.querySelector('#map-modal .gm-view').clientWidth / b.w), pitch: 30, bearing: 10 });
    D.querySelector('#map-modal .gm-here').click(); await sleep(30);
    const names = () => [...D.querySelectorAll('#map-modal .gm-name')].map(x => x.value).join();
    eq(names(), 'Madrid,París,Roma,Parada 4', 'la vista actual, como parada');
    // Reorder and remove.
    D.querySelector('#map-modal .gm-stop[data-i="3"] [data-a="up"]').click(); await sleep(20);
    eq(names(), 'Madrid,París,Parada 4,Roma', 'subir');
    D.querySelector('#map-modal .gm-stop[data-i="0"] [data-a="down"]').click(); await sleep(20);
    eq(names(), 'París,Madrid,Parada 4,Roma', 'bajar');
    D.querySelector('#map-modal .gm-stop[data-i="2"] [data-a="del"]').click(); await sleep(20);
    eq(names(), 'París,Madrid,Roma', 'quitar');
    D.querySelector('#map-modal .gm-stop[data-i="0"] .gm-name').value = 'París (Francia)'; D.querySelector('#map-modal .gm-stop[data-i="0"] .gm-name').dispatchEvent(new Event('input', { bubbles: true }));
    // A stop's own marker: its country's flag.
    D.querySelector('#map-modal .gm-stop[data-i="2"] [data-a="more"]').click(); await sleep(20);
    const sel = D.querySelector('#map-modal .gm-skind'); sel.value = 'country'; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(20);
    D.querySelector('#map-modal .gm-kind[data-kind="number"]').click(); await sleep(20);
    D.querySelector('#map-modal .gm-ok').click();
    for (let k = 0; k < 100 && D.getElementById('map-modal'); k++) await sleep(50);
    assert(!D.getElementById('map-modal'), 'aplicado, se cierra');
    const m = slide().blocks.find(x => x.id === b.id);
    eq(m.stops.map(s => s.name).join(), 'París (Francia),Madrid,Roma');
    assert(m.stops.every(s => /^data:image\/jpeg;base64,/.test(s.shot) && s.shotKey), 'una imagen guardada de cada parada');
    eq(m.alt, 'Mapa: París (Francia) → Madrid → Roma', 'texto alternativo automático');
    eq(m.marker.kind, 'number', 'marcador del mapa'); eq(m.stops[2].marker.kind, 'country', 'y el de una parada'); eq(m.stops[2].cc, 'it');
    const flights = [m.animation, ...(m.anims || [])].filter(a => a.effect === 'mapfly');
    eq(flights.map(a => a.stop).join(), [m.stops[1].id, m.stops[2].id].join(), 'un paso (clic) por cada parada después de la primera, en su orden');
    assert(D.querySelector(`#stage .block[data-id="${m.id}"] .map-blk img.map-shot`), 'en el lienzo, la imagen de la primera parada');
    // Reordering the stops later: the steps follow; a stop removed takes its step with it.
    G.setMap(m.id, { stops: [m.stops[2], m.stops[0], m.stops[1]] });
    const m2 = slide().blocks.find(x => x.id === b.id), f2 = [m2.animation, ...(m2.anims || [])].filter(a => a.effect === 'mapfly');
    eq(f2.map(a => a.stop).join(), [m2.stops[1].id, m2.stops[2].id].join(), 'reordenadas, los vuelos también');
    G.setMap(m.id, { stops: m2.stops.slice(0, 2) });
    eq([slide().blocks.find(x => x.id === b.id).animation, ...(slide().blocks.find(x => x.id === b.id).anims || [])].filter(a => a.effect === 'mapfly').length, 1, 'una parada menos, un paso menos');
    // Only the pictures that changed are taken again.
    const m3 = slide().blocks.find(x => x.id === b.id);
    assert(G.staleShots(m3, 'es').length >= 1, 'cambiar el orden deja viejas algunas imágenes (la línea y los marcadores cambian)');
  });

  await test('mapa: guardar y abrir, con valores comprobados (sanitizeDeck)', async () => {
    reset(); const { G } = await mapSetup(), W = frame.contentWindow, Sz = await W.eval("import('/src/features/document/sanitize.js')");
    const b = G.addMap({ stops: [{ name: 'Madrid', lon: -3.7, lat: 40.4, zoom: 9 }, { name: 'Lisboa', lon: -9.14, lat: 38.72, zoom: 9, note: 'Hola' }] });
    const saved = JSON.parse(JSON.stringify(R.state.deck)), again = Sz.sanitizeDeck(saved).slides[0].blocks.find(x => x.id === b.id);
    eq(JSON.stringify(again.stops.map(s => [s.name, s.lon, s.lat, s.zoom, s.note || ''])), JSON.stringify([['Madrid', -3.7, 40.4, 9, ''], ['Lisboa', -9.14, 38.72, 9, 'Hola']]), 'vuelve igual');
    const bad = Sz.sanitizeDeck({ slides: [{ blocks: [{ id: 'm1', type: 'map', look: 'evil"><script>', route: 'x', routeColor: 'red;background:url(x)', curve: 99, terrain: 'yes',
      marker: { kind: 'bomb', color: 'javascript:1', size: 50, icon: '<b>' }, arrive: 'boom', past: 'x',
      stops: [{ id: '"><img>', name: 'x'.repeat(500), lon: 540, lat: 999, zoom: 'muy', pitch: -9, bearing: 900, note: 'n'.repeat(900), shot: 'javascript:alert(1)', cc: 'ESP', marker: { kind: 'flag', color: '#00ff00' } },
        ...Array.from({ length: 60 }, (_, i) => ({ name: 'p' + i, lon: i, lat: i }))] }] }] }).slides[0].blocks[0];
    eq(bad.look, 'map'); eq(bad.route, 'line'); eq(bad.routeColor, '#e63946'); eq(bad.curve, 3); eq(bad.terrain, true);
    eq(JSON.stringify(bad.marker), JSON.stringify({ kind: 'pin', color: '#e63946', size: 2 }), 'marcador del mapa, comprobado'); eq(bad.arrive, 'drop'); eq(bad.past, undefined);
    const s0 = bad.stops[0];
    assert(/^[\w-]+$/.test(s0.id) && s0.name.length === 120 && s0.note.length === 500, 'nombres y notas acotados, id limpio');
    eq([s0.lon, s0.lat, s0.zoom, s0.pitch, s0.bearing].join(), '180,85,4,0,180', 'números en su rango');
    assert(!('shot' in s0) && !('cc' in s0), 'una imagen que no es una imagen incrustada, fuera'); eq(JSON.stringify(s0.marker), JSON.stringify({ kind: 'flag', color: '#00ff00' }));
    eq(bad.stops.length, G.MAX_STOPS, 'como mucho ' + G.MAX_STOPS + ' paradas');
    const out = R.io.blockHTML(bad, { blocks: [bad] });
    assert(/data-geomap="/.test(out) && !/<script|javascript:|<img>|<b>/.test(out.replace(/<img class="rv-map-shot"[^>]*>/g, '')), 'nada de eso llega a la presentación: ' + out.slice(0, 200));
  });

  await test('mapa: en la presentación, cada clic vuela a la siguiente parada (y atrás vuelve); sin conexión, su imagen', async () => {
    reset(); const { G, W } = await mapSetup(); R.slides.addSlide('blank'); await sleep(10);
    const shot = c => { const cv = D.createElement('canvas'); cv.width = 32; cv.height = 18; const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 32, 18); return cv.toDataURL('image/jpeg'); };
    const b = G.addMap({ route: 'geodesic', stops: [{ name: 'Madrid', lon: -3.7, lat: 40.4, zoom: 5 }, { name: 'París', lon: 2.35, lat: 48.86, zoom: 6, pitch: 45, note: 'Torre Eiffel' }, { name: 'Roma', lon: 12.5, lat: 41.9, zoom: 7 }] });
    G.setMap(b.id, { stops: b.stops.map((s, i) => ({ ...s, shot: shot(['#f00', '#0f0', '#00f'][i]) })), flyMs: 400 });
    const html = R.io.buildHTML(R.state.deck, { inApp: true });
    assert(/data-geomap="/.test(html) && /class="fragment mapfly" data-fragment-index="1"/.test(html) && /data-mapgo="1"/.test(html) && /data-mapgo="2"/.test(html), 'los pasos de vuelo, como fragmentos');
    assert(/role="img" aria-label="Mapa: Madrid → París → Roma"/.test(html), 'con su descripción');
    assert(/<img class="rv-map-shot" data-k="0" src="data:image\/jpeg/.test(html), 'la imagen de la primera parada (exportaciones y sin conexión)');
    const V = await W.eval("import('/src/io/formats/html.js')"), S = await W.eval("import('/src/core/vendor.js')");
    const play = async (lib, run) => {
      const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
      try {
        f.srcdoc = html.split(JSON.stringify(S.MAPLIBRE)).join(JSON.stringify(lib));
        for (let k = 0; k < 100 && !f.contentWindow.Reveal?.isReady?.(); k++) await sleep(100);
        await run(f.contentWindow, f.contentWindow.Reveal);
      } finally { f.remove(); }
    };
    // (The stand-in MapLibre as the page's script: "lib" + '.js'.)
    const stubURL = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(mapStub) + '#';
    await play(stubURL.slice(0, -1) + '%2F%2F', async (F, RV) => {
      RV.slide(1); const el = F.document.querySelector('[data-geomap]');
      for (let k = 0; k < 60 && !el.classList.contains('rvm-on'); k++) await sleep(50);
      assert(el.classList.contains('rvm-on'), 'el mapa en vivo, al llegar a su diapositiva');
      const map = el._rvm.map; eq(map.c.join(), '-3.7,40.4', 'en la primera parada'); eq(map.noKeys, true, 'las flechas son de la presentación');
      eq(map.lay['rv-route'] && map.src['rv-route'].data.geometry.coordinates.length, 0, 'sin línea todavía');
      // (The real flight: the one of its duration; before it, the rehearsal's points — io/runtime/geomap.js, rehearse().)
      const real = () => map.flights.filter(x => x.duration > 1);
      RV.next(); await sleep(80);
      eq(el._rvm.cur, 1, 'un clic: a París');
      for (let k = 0; k < 60 && !real().length; k++) await sleep(50);
      eq(real().at(-1).center.join(), '2.35,48.86'); eq(real().at(-1).pitch, 45, 'con su inclinación');
      eq(real().at(-1).duration, 400, 'con su duración');
      await sleep(600);
      eq(map.src['rv-route'].data.geometry.coordinates.length, 1, 'la línea hasta París, dibujada');
      assert(F.document.querySelector('.rvm-note.rvm-show') && /Torre Eiffel/.test(F.document.querySelector('.rvm-note').textContent), 'su nota, al llegar');
      const mk = [...el.querySelectorAll('.rvm-mk')];
      eq(mk.map(x => x.classList.contains('rvm-hide') ? 0 : 1).join(), '1,1,0', 'los marcadores de las paradas visitadas; la siguiente, aún no');
      RV.next(); await sleep(700); eq(el._rvm.cur, 2, 'otro: a Roma');
      RV.prev(); await sleep(100); eq(el._rvm.cur, 1, 'atrás: de vuelta a París');
      for (let k = 0; k < 60 && real().at(-1).center.join() !== '2.35,48.86'; k++) await sleep(50);
      eq(map.c.join(), '2.35,48.86');
      RV.prev(); await sleep(100); eq(el._rvm.cur, 0, 'y a Madrid');
      RV.slide(0); RV.slide(1, 0, 2); await sleep(150);
      eq(F.document.querySelector('[data-geomap]')._rvm.cur, 2, 'al volver desde después, en la última parada, sin volar');
    });
    // Without a connection (the library doesn't load): the stop's picture, and a discreet notice.
    await play('https://127.0.0.1:9/no-maplibre', async (F, RV) => {
      RV.slide(1); const el = F.document.querySelector('[data-geomap]');
      for (let k = 0; k < 60 && !el.classList.contains('rvm-offline'); k++) await sleep(50);
      assert(el.classList.contains('rvm-offline') && el.querySelector('.rvm-off'), 'aviso discreto de que no hay conexión');
      const vis = () => [...el.querySelectorAll('.rv-map-shot')].filter(i => i.style.visibility !== 'hidden').map(i => i.dataset.k).join();
      eq(vis(), '0', 'la imagen de la primera parada');
      RV.next(); await sleep(50); eq(vis(), '1', 'un clic: la de la segunda');
      RV.prev(); await sleep(50); eq(vis(), '0', 'y atrás');
    });
  });

  // The flight ahead (io/runtime/geomap.js, fetchAhead()): its tiles worked out frame by frame and fetched into the
  // map's own memory before the click; and a floor of the whole world under every map (floor()).
  const FAR = [{ name: 'Madrid', lon: -3.7, lat: 40.4, zoom: 9, pitch: 40 }, { name: 'Tokio', lon: 139.69, lat: 35.69, zoom: 9 }, { name: 'Yokohama', lon: 139.64, lat: 35.44, zoom: 10 }];
  await test('mapa: el vuelo siguiente se trae antes a la memoria del mapa (sin que se mueva nada); un clic antes espera; un suelo del mundo siempre', async () => {
    reset(); const { G, W } = await mapSetup(); R.slides.addSlide('blank'); await sleep(10);
    const b = G.addMap({ route: 'line', stops: FAR });
    G.setMap(b.id, { stops: b.stops, flyMs: 400 });
    const html = R.io.buildHTML(R.state.deck, { inApp: true }), S = await W.eval("import('/src/core/vendor.js')");
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    try {
      f.srcdoc = html.split(JSON.stringify(S.MAPLIBRE)).join(JSON.stringify('data:text/javascript;charset=utf-8,' + encodeURIComponent(mapStub) + '%2F%2F'));
      for (let k = 0; k < 100 && !f.contentWindow.Reveal?.isReady?.(); k++) await sleep(100);
      const F = f.contentWindow, RV = F.Reveal, el = F.document.querySelector('[data-geomap]');
      // On the slide before, the map is started already, and its first flight fetched.
      for (let k = 0; k < 60 && !el.classList.contains('rvm-on'); k++) await sleep(50);
      assert(el._rvm && el.classList.contains('rvm-on'), 'el mapa de la diapositiva siguiente, ya cargado antes de llegar');
      eq(F.__maps.length, 1, 'un solo mapa: ni mapas ocultos ni copias');
      const map = el._rvm.map, tm = map.style.tileManagers;
      for (let k = 0; k < 60 && !tm.v.loads.length; k++) await sleep(50);
      await sleep(200);
      const zs = tm.v.loads.map(k => +k.split('/')[0]);
      assert(tm.v.loads.length >= 4 && Math.min(...zs) < 9, 'las teselas del vuelo a Tokio, también las de alejarse: ' + tm.v.loads.join(' '));
      assert(Object.keys(tm.v._outOfViewCache.data).length >= tm.v.loads.length && tm.v._outOfViewCache.max >= tm.v.loads.length, 'guardadas en su memoria, con sitio para ellas');
      assert(tm.v.loads.every(k => !tm.v._inViewTiles.m[k]), 'sin ponerlas en la vista');
      assert(!tm.g._rvFloor && !tm.g.loads.length, 'las capas propias (la línea, los nombres) no');
      eq(String(map.c), String([-3.7, 40.4]), 'el mapa sigue donde estaba'); assert(!map.flights.some(x => x.duration > 1), 'sin volar');
      // The floor: with the tiles a view needs, the whole world at its coarsest, three copies side by side.
      const Id = F.__TileId;
      tm.v._updateRetainedTiles([new Id(9, 0, 9, 250, 190)], 9); tm.r._updateRetainedTiles([new Id(9, 0, 9, 250, 190)], 9);
      eq(tm.v.got.length, 1 + 3 * (1 + 4), 'suelo de calles (teselas de 512): zoom 0 y 1, por triplicado');
      eq(tm.r.got.length, 1 + 3 * (1 + 4 + 16), 'de imágenes (teselas de 256): hasta zoom 2');
      eq([...new Set(tm.r.got.slice(1).map(x => x.wrap))].join(), '-1,0,1', 'tres copias del mundo (para cruzar la línea de cambio de fecha)');
      // Arriving and clicking: it flies at once, and on landing the room is given back and the next flight fetched.
      RV.slide(1); await sleep(100);
      const n0 = tm.v.loads.length; RV.next(); await sleep(60);
      const real = () => map.flights.filter(x => x.duration > 1);
      eq(real().length, 1, 'un clic: vuela en el acto'); eq(String(real()[0].center), String([139.69, 35.69])); assert(!el.querySelector('.rvm-wait'), 'sin esperas');
      for (let k = 0; k < 40 && tm.v.loads.length === n0; k++) await sleep(50);
      assert(tm.v.loads.length > n0, 'aterrizado: el vuelo siguiente (a Yokohama), a por sus teselas');
      // A click before they are in: it waits (a small sign), then flies.
      await sleep(300); RV.prev(); await sleep(600); F.__slowTiles = Date.now() + 1500;
      const r0 = real().length; RV.next(); await sleep(500);
      assert(el.querySelector('.rvm-wait') && el.getAttribute('aria-busy') === 'true', 'si aún no está listo, una señal discreta…');
      eq(real().length, r0, '…y aún no vuela');
      for (let k = 0; k < 80 && real().length === r0; k++) await sleep(50);
      eq(real().length, r0 + 1, 'vuela cuando han llegado'); assert(!el.querySelector('.rvm-wait'), 'y la señal se va');
    } finally { f.remove(); }
  });

  await test('mapa: uno que cubre la diapositiva llega a los bordes de una pantalla de otra proporción (y los demás no)', async () => {
    reset(); const { G, W } = await mapSetup(); R.slides.addSlide('blank'); await sleep(10);
    const { w: SW, h: SH } = R.state.deck.size;
    const stops = [{ name: 'Madrid', lon: -3.7, lat: 40.4, zoom: 6 }, { name: 'Roma', lon: 12.5, lat: 41.9, zoom: 6 }];
    const full = G.addMap({ x: 0, y: 0, w: SW, h: SH, stops });
    const S = await W.eval("import('/src/core/vendor.js')");
    const play = async (vw, vh, run) => {
      const html = R.io.buildHTML(R.state.deck, { inApp: true });
      const f = D.createElement('iframe'); f.style.cssText = `position:fixed;left:0;top:0;width:${vw}px;height:${vh}px;visibility:hidden;border:0`; D.body.appendChild(f);
      try {
        f.srcdoc = html.split(JSON.stringify(S.MAPLIBRE)).join(JSON.stringify('data:text/javascript;charset=utf-8,' + encodeURIComponent(mapStub) + '%2F%2F'));
        for (let k = 0; k < 100 && !f.contentWindow.Reveal?.isReady?.(); k++) await sleep(100);
        const F = f.contentWindow; F.Reveal.slide(1); const el = F.document.querySelector('[data-geomap]');
        for (let k = 0; k < 60 && !el.classList.contains('rvm-on'); k++) await sleep(50);
        await sleep(100); await run(F, el);
      } finally { f.remove(); }
    };
    assert(/data-prevent-swipe data-bleed/.test(R.io.buildHTML(R.state.deck, { inApp: true })), 'marcado como mapa a sangre');
    // A 16:10 screen: bands above and below the 16:9 slide, the map goes on into them, the same view in the middle.
    await play(1280, 800, async (F, el) => {
      const box = el.querySelector('.rvm-live'), k = F.Reveal.getScale(), extra = Math.round((800 / k - SH) / 2);
      assert(extra > 10, 'hay franjas: ' + extra);
      eq(box.style.top, -extra + 'px', 'el mapa sube hasta el borde de la pantalla…'); eq(box.style.height, `calc(100% + ${2 * extra}px)`, '…y baja otro tanto');
      eq(box.style.left, '0px', 'a lo ancho, no le falta nada'); eq(el.style.overflow, 'visible');
      eq(el.style.getPropertyValue('--rvm-b'), extra + 'px', 'los créditos, en la esquina real de la pantalla');
      eq(el._rvm.map.z, 6, 'el mismo zoom: lo de más es más mapa alrededor'); eq(String(el._rvm.map.c), String([-3.7, 40.4]), 'y el mismo centro');
      assert(el.querySelector('.rvm-note') && !el.querySelector('.rvm-note').style.top, 'la nota, dentro de la diapositiva');
    });
    // A phone held upright: reveal.js reads the slides one after the other (its scroll view); the map stays in its box.
    await play(390, 844, async (F, el) => {
      assert(F.Reveal.isScrollView && F.Reveal.isScrollView(), 'en el móvil vertical, la vista con desplazamiento');
      eq(el.querySelector('.rvm-live').style.top, '0px', 'ahí el mapa se queda en su caja'); eq(el.style.overflow, 'hidden');
    });
    // The same proportion as the slide: nothing changes.
    await play(1280, 720, async (F, el) => { eq(el.querySelector('.rvm-live').style.top, '0px', '16:9 en 16:9: igual que antes'); eq(el.style.overflow, 'hidden'); });
    // A map that doesn't cover the slide stays in its box; and with black bands chosen, none goes past the slide.
    G.setMap(full.id, { stops }); Object.assign(R.state.deck.slides[1].blocks.find(b => b.id === full.id), { x: 100, w: SW - 200 });
    assert(!/data-prevent-swipe data-bleed/.test(R.io.buildHTML(R.state.deck, { inApp: true })), 'un mapa que no la cubre, no');
    await play(1280, 800, async (F, el) => { eq(el.querySelector('.rvm-live').style.top, '0px', 'se queda en su caja'); });
    Object.assign(R.state.deck.slides[1].blocks.find(b => b.id === full.id), { x: 0, w: SW }); R.state.deck.reveal = { fit: 'bands' };
    await play(1280, 800, async (F, el) => { eq(el.querySelector('.rvm-live').style.top, '0px', 'con franjas negras elegidas, tampoco'); });
    // «Adaptar a la pantalla» on a wider screen: the slide takes its proportion, the map stretches with it, and its
    // stops keep their zoom (the same area, more of it at the sides — not zoomed in to fill the width).
    R.state.deck.reveal = { fit: 'adapt' };
    await play(Math.round(SW * 4 / 3), SH, async (F, el) => {
      for (let k = 0; k < 40 && el.clientWidth < SW * 1.2; k++) await sleep(50);
      assert(el.clientWidth > SW * 1.2, 'el mapa se estira con la diapositiva: ' + el.clientWidth);
      F.Reveal.next(); const real = () => el._rvm.map.flights.filter(x => x.duration > 1);
      for (let k = 0; k < 60 && !real().length; k++) await sleep(50);
      const fl = real().at(-1);
      eq(fl && fl.zoom, 6, 'y vuela a Roma con su zoom de siempre');
    });
    delete R.state.deck.reveal;
  });

  await test('mapa: PDF, imágenes, PowerPoint y miniaturas usan la imagen de su primera parada', async () => {
    reset(); const { G, W } = await mapSetup();
    const cv = D.createElement('canvas'); cv.width = 64; cv.height = 36; const g = cv.getContext('2d'); g.fillStyle = '#ff0000'; g.fillRect(0, 0, 64, 36);
    const b = G.addMap({ x: 0, y: 0, w: 1280, h: 720, stops: [{ name: 'Madrid', lon: -3.7, lat: 40.4, zoom: 5, shot: cv.toDataURL('image/jpeg', 1) }, { name: 'Roma', lon: 12.5, lat: 41.9, zoom: 6 }] });
    R.render();
    // (Polled: the thumbnails are drawn a moment later; 30 ms fixed wasn't always enough on a busy CI machine.)
    for (let i = 0; i < 150 && !D.querySelector('#navigator .map-shot, .thumb .map-shot'); i++) await sleep(20);
    assert(D.querySelector('#navigator .map-shot, .thumb .map-shot'), 'en la miniatura');
    const I = await W.eval("import('/src/io/export/images.js')");
    const blob = await I.slideImageBlob(slide(), 'png'), bmp = await createImageBitmap(blob), c2 = D.createElement('canvas'); c2.width = bmp.width; c2.height = bmp.height;
    const g2 = c2.getContext('2d'); g2.drawImage(bmp, 0, 0); const px = g2.getImageData(bmp.width / 2, bmp.height / 2, 1, 1).data;
    assert(px[0] > 200 && px[1] < 60 && px[2] < 60, 'la diapositiva como imagen (y en PDF): el mapa en su primera parada, ' + [...px].slice(0, 3));
    const png = await I.blockImage(b, slide()); assert(/^data:image\/png/.test(png), 'como imagen para PowerPoint y ODP');
    const pptx = await R.pptx.buildPptxBlob(); assert(pptx.size > 0, 'PowerPoint se exporta');
    // Without stops yet: a drawing of a map that says what to do.
    const e = G.addMap(); R.render(); await sleep(20);
    assert(/Doble clic para añadir lugares/.test(D.querySelector(`#stage .block[data-id="${e.id}"] .map-ph`)?.textContent || ''), 'vacío: dice cómo empezar');
  });
  // ---- Código QR (Insertar ▸ Código QR) ----------------------------------
  // (La previa y el dibujo pasan por la librería del CDN, así que aquí se
  // espera a que algo ocurra en vez de dormir una cifra fija: en una máquina
  // de CI ocupada, un sleep que vale casi siempre es un fallo intermitente.)
  const until = async (f, ms = 8000) => { for (let i = 0; i < ms / 25 && !f(); i++) await sleep(25); return f(); };
  // Lo que se comprueba aquí es lo que se rompe en silencio: el contenido que
  // un QR lleva no es una URL sino una convención corta por tipo (WIFI:…,
  // BEGIN:VCARD…) con su propio escapado, y una contraseña con un «;» dentro
  // parte el código sin que nada lo diga — el QR se lee y da media
  // contraseña. Lo demás (que la librería dibuje) ya lo prueba el ojo.
  await test('código QR: cada contenido se compone y se escapa como su formato manda, y un texto se reconoce al reabrirlo', async () => {
    const W = frame.contentWindow, Q = await W.eval("import('/src/features/content/qrcode.js')");
    eq(Q.qrPayload('url', { url: 'revelaslides.com' }), 'https://revelaslides.com', 'un enlace sin esquema se abre como enlace, no como texto');
    eq(Q.qrPayload('url', { url: 'http://aula.cat/x' }), 'http://aula.cat/x', 'y el que ya lo trae no se toca');
    eq(Q.qrPayload('text', { text: '  hola  ' }), 'hola', 'texto');
    // El escapado del Wi-Fi: los dos caracteres que separan campos.
    eq(Q.qrPayload('wifi', { ssid: 'Aula 3', pass: 'a;b:c', sec: 'WPA' }), 'WIFI:T:WPA;S:Aula 3;P:a\\;b\\:c;;', 'Wi-Fi: el «;» y el «:» de la contraseña van escapados');
    eq(Q.qrPayload('wifi', { ssid: 'Abierta', sec: 'nopass', pass: 'sobra' }), 'WIFI:T:nopass;S:Abierta;;', 'una red abierta no lleva contraseña aunque se haya escrito');
    assert(/;H:true;/.test(Q.qrPayload('wifi', { ssid: 'x', hidden: true })), 'red oculta');
    eq(Q.qrPayload('wifi', { pass: 'x' }), '', 'sin SSID no hay código');
    const card = Q.qrPayload('contact', { first: 'Laia', last: 'Puig, Mesas', org: 'Clot', tel: '+34 600 00 00 00', email: 'l@c.cat' });
    assert(/^BEGIN:VCARD\nVERSION:3\.0\n/.test(card) && /\nEND:VCARD$/.test(card), 'vCard entera');
    assert(/N:Puig\\, Mesas;Laia;;;/.test(card), 'la coma de los apellidos va escapada');
    assert(/FN:Laia Puig\\, Mesas/.test(card) && /TEL;TYPE=CELL:\+34600000000/.test(card), 'nombre completo y teléfono sin espacios');
    eq(Q.qrPayload('email', { to: 'a@b.cat', subject: 'Nota 1', body: 'Hola & adiós' }), 'mailto:a@b.cat?subject=Nota%201&body=Hola%20%26%20adi%C3%B3s', 'el correo codifica asunto y cuerpo');
    eq(Q.qrPayload('sms', { tel: '600 00 00 00', text: 'una\nlínea' }), 'SMSTO:600000000:una línea', 'el SMS no puede llevar saltos');
    eq(Q.qrPayload('tel', { tel: '(+34) 600-000-000' }), 'tel:+34600000000', 'teléfono limpio');
    eq(Q.qrPayload('geo', { lat: '41,4036', lon: '2.1744', as: 'link' }), 'https://www.google.com/maps?q=41.4036,2.1744', 'la ubicación, como enlace de mapa (la coma decimal también vale)');
    assert(/^geo:41\.4036,2\.1744\?q=/.test(Q.qrPayload('geo', { lat: '41.4036', lon: '2.1744', name: 'El Clot', as: 'geo' })), 'o en formato geo:');
    eq(Q.qrPayload('geo', { lat: '200', lon: '2' }), '', 'una latitud imposible no produce código');
    // `Number('')` es 0 y es finito, así que con media coordenada salía un código legible apuntando a otro
    // sitio: el ecuador o el meridiano de Greenwich. No fallaba nada, es lo que lo hacía peligroso.
    eq(Q.qrPayload('geo', { lat: '41.4036', as: 'link' }), '', 'media coordenada no produce código (la longitud que falta no es 0)');
    eq(Q.qrPayload('geo', { lon: '2.1744', as: 'link' }), '', 'ni al contrario');
    const ev = Q.qrPayload('event', { summary: 'Examen; unidad 3', start: '2026-10-14T09:00', end: '2026-10-14T10:30', place: 'Aula 3' });
    assert(/DTSTART:20261014T090000/.test(ev) && /DTEND:20261014T103000/.test(ev), 'el evento, en hora local y sin zona');
    assert(/SUMMARY:Examen\\; unidad 3/.test(ev), 'y su título escapado');
    // Reabrirlo: de la cadena a los campos y otra vez a la misma cadena.
    for (const [kind, fields] of [['wifi', { ssid: 'Aula 3', pass: 'a;b:c', sec: 'WPA' }], ['contact', { first: 'Laia', last: 'Puig', tel: '600000000', email: 'l@c.cat' }],
      ['email', { to: 'a@b.cat', subject: 'Nota 1' }], ['sms', { tel: '600000000', text: 'hola' }], ['tel', { tel: '600000000' }],
      ['geo', { lat: '41.4036', lon: '2.1744', as: 'geo' }], ['url', { url: 'https://x.cat/a' }]]) {
      const txt = Q.qrPayload(kind, fields), g = Q.qrGuess(txt);
      eq(g.kind, kind, `reconoce un ${kind}`);
      eq(Q.qrPayload(g.kind, g.fields), txt, `y lo vuelve a componer igual (${kind})`);
    }
    eq(Q.qrGuess('hola mundo').kind, 'text', 'lo que no es ninguno es texto');
    eq(Q.qrGuess('revelaslides.com/app').kind, 'url', 'un dominio pelado es un enlace');
    // Esto recibe lo que alguien haya pegado, así que no puede lanzar: un «%» suelto en un mailto hacía
    // saltar un URIError desde decodeURIComponent, y lo que se veía era un diálogo que no se abre.
    for (const raro of ['mailto:%', 'mailto:a b%ZZ', 'mailto:', 'WIFI:', 'BEGIN:VCARD', 'geo:', 'SMSTO:'])
      assert(Q.qrKind(Q.qrGuess(raro).kind), `qrGuess aguanta «${raro}» sin lanzar`);
    // Los colores: lo que no se puede leer se avisa, y un código invertido no vale.
    assert(Q.qrContrast({ dark: '#000000', light: '#ffffff' }).ok, 'negro sobre blanco se lee');
    assert(!Q.qrContrast({ dark: '#888888', light: '#999999' }).ok, 'dos grises parecidos, no');
    assert(Q.qrContrast({ dark: '#ffffff', light: '#000000' }).inverted, 'y se detecta el invertido');
    // Las etiquetas viajan en castellano y se traducen al pintarlas: si una no
    // está en el diccionario sale en castellano en los otros seis idiomas y no
    // da ningún error. Es el caso de js_pistaN de los laboratorios, otra vez.
    const { ROWS } = await W.eval("import('/src/i18n/strings.js')"), filas = new Map(ROWS.map(r => [r[0], r]));
    const NUMEROS = /^[\d\s.,:%()+–-]*$/, MARCAS = new Set(['Wi-Fi', 'SMS', 'WEP', 'WPA / WPA2 / WPA3', 'revelaslides.com']);
    const textos = [...Q.QR_KINDS.flatMap(k => [k.label, ...k.fields.flatMap(f => [f.label, f.ph, ...(f.opts || []).map(o => o[1])])]), ...Q.QR_LEVELS.map(l => l[1])]
      .filter(x => x && !NUMEROS.test(x) && !MARCAS.has(x));
    const sin = textos.filter(x => !filas.has(x) || filas.get(x).slice(1, 7).some(v => !v));
    eq(sin.length, 0, 'sin traducción: ' + sin.join(' | '));
  });

  await test('código QR: se inserta como imagen SVG con lo que se eligió, se puede volver a abrir y sobrevive al export', async () => {
    reset(); const W = frame.contentWindow, Q = await W.eval("import('/src/features/content/qrcode.js')");
    D.querySelector('[data-action="insert-qr"]').click();
    assert(await until(() => D.getElementById('qrm-modal')), 'el botón de la cinta abre el generador');
    const m = D.getElementById('qrm-modal'), q = s => m.querySelector(s), n0 = slide().blocks.length;
    eq(slide().blocks.length, n0, 'nada en la diapositiva todavía: primero se elige qué lleva, y cancelar no deja un hueco');
    // Un enlace, con el margen y los colores por defecto.
    q('.qm-kind').value = 'url'; q('.qm-kind').dispatchEvent(new W.Event('change'));
    const inp = q('.qm-fields .qm-f'); inp.value = 'revelaslides.com/app'; inp.dispatchEvent(new W.Event('input'));
    assert(await until(() => /\d+ caracteres/.test(q('.qm-info').textContent)), 'dibujado, y dice cuánto lleva: ' + q('.qm-info').textContent);
    assert(!q('.qm-ok').disabled, 'con contenido, se puede insertar');
    // El margen es la trampa que la propia previa esconde: sobre el blanco de
    // aquí un código sin margen se lee, y sobre una diapositiva de color deja de
    // leerse (medido con un lector de verdad). Así que se dice.
    q('.qm-margin').value = '0'; q('.qm-margin').dispatchEvent(new W.Event('input'));
    assert(await until(() => /margen/i.test(q('.qm-info').textContent)), 'sin margen, avisa: ' + q('.qm-info').textContent);
    q('.qm-margin').value = '2'; q('.qm-margin').dispatchEvent(new W.Event('input'));
    assert(await until(() => /\d+ caracteres/.test(q('.qm-info').textContent)), 'y con margen vuelve a contar');
    q('.qm-ok').click();
    assert(await until(() => slide().blocks.length === n0 + 1), 'insertado');
    const b = last();
    eq(b.type, 'image', 'es una imagen (así no hace falta nada al presentar ni al exportar)');
    assert(/^data:image\/svg\+xml/.test(b.src), 'y va en SVG: nítida al proyectar y en papel, y el encogedor de imágenes no la toca');
    eq(b.w, b.h, 'cuadrada');
    assert(/^data:image\/svg\+xml[^,]*,.*%3Csvg/.test(b.src) && !/script/i.test(decodeURIComponent(b.src.split(',')[1])), 'el SVG no lleva nada ejecutable');
    eq(b.qr?.kind, 'url', 'guarda de qué se hizo, para poder cambiarlo luego');
    eq(b.qr.fields.url, 'revelaslides.com/app', 'con lo que se escribió');
    assert(/revelaslides\.com\/app/.test(b.alt || ''), 'y su texto alternativo lo dice: ' + b.alt);
    // Lo que de verdad lleva dentro: lo que compone qrPayload, no el campo a secas.
    const Lib = await W.eval("import('/src/core/vendor.js')").then(V => V.loadScript(V.QRCODE, 'QRCode'));
    // (En modo byte, `data` son los bytes; en alfanumérico, el texto.)
    const dentro = Lib.create(Q.qrPayload(b.qr.kind, b.qr.fields)).segments
      .map(x => (typeof x.data === 'string' ? x.data : new W.TextDecoder().decode(new W.Uint8Array(x.data)))).join('');
    eq(dentro, 'https://revelaslides.com/app', 'el código codifica el enlace con su esquema');
    // La corrección de errores más alta ocupa más módulos: así se ve que la opción llega al dibujo.
    // (Con un texto corto, los cuatro niveles caben en la versión 1 y miden lo
    //  mismo: medido, 'hola' da 25 módulos con L y con H. Hace falta uno que
    //  obligue a crecer — este enlace va de 29 a 37.)
    const chico = await Q.qrSVG('https://revelaslides.com/app', { ecc: 'L' }), grande = await Q.qrSVG('https://revelaslides.com/app', { ecc: 'H' });
    const lado = svg => +/viewBox="0 0 (\d+)/.exec(svg)[1];
    assert(lado(grande) > lado(chico), `la corrección máxima da un código más denso (${lado(chico)} → ${lado(grande)})`);
    assert(!/fill="#ffffff"/.test(await Q.qrSVG('hola', { light: 'transparent' })), 'el fondo transparente no pinta fondo');
    // Volver a abrirlo: el mismo objeto cambia de contenido y se queda donde estaba.
    select(b); await sleep(20);
    eq(D.querySelector('#ribbon [data-tab="ctx"]').textContent, 'Imagen', 'su pestaña es la de una imagen');
    const boton = [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => /Editar el código QR/.test(x.title || x.textContent));
    assert(boton, 'con el botón de editar el código QR');
    const antes = b.src;
    boton.click();
    assert(await until(() => D.getElementById('qrm-modal')), 'se reabre el generador');
    const m2 = D.getElementById('qrm-modal');
    eq(m2.querySelector('.qm-kind').value, 'url', 'empezando por donde se dejó');
    eq(m2.querySelector('.qm-fields .qm-f').value, 'revelaslides.com/app', 'y con lo escrito');
    m2.querySelector('.qm-kind').value = 'wifi'; m2.querySelector('.qm-kind').dispatchEvent(new W.Event('change'));
    const ssid = m2.querySelector('.qm-fields .qm-f'); ssid.value = 'Aula 3'; ssid.dispatchEvent(new W.Event('input'));
    assert(await until(() => /\d+ caracteres/.test(m2.querySelector('.qm-info').textContent) && !m2.querySelector('.qm-ok').disabled), 'listo para aplicar');
    m2.querySelector('.qm-ok').click();
    assert(await until(() => last().src !== antes), 'el dibujo cambia');
    eq(slide().blocks.length, n0 + 1, 'y no se añade otro objeto: es el mismo, con su sitio y sus animaciones');
    eq(last().id, b.id, 'el mismo id');
    eq(last().qr.kind, 'wifi', 'ahora es el Wi-Fi del aula');
    // En la presentación exportada es una imagen más.
    assert(/<img[^>]+data:image\/svg\+xml/.test(R.io.buildHTML()), 'exportado, va como imagen');
  });

  // «Editar imagen» (ui/dialogs/imageedit.js): a picture, two colours side by side or a red square on green.
  const testPicture = (draw, w = 120, h = 80) => { const c = D.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c.toDataURL('image/png'); };
  const putPicture = src => { const b = { id: 'ie' + Math.random().toString(36).slice(2, 7), type: 'image', x: 100, y: 100, w: 240, h: 160, rotation: 0, animation: null, src, fit: 'contain' };
    R.store.commit(() => slide().blocks.push(b)); select(b); return b; };
  const pixelOf = async (src, x, y) => { const bmp = await createImageBitmap(await (await fetch(src)).blob()), c = D.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); return { px: [...g.getImageData(x, y, 1, 1).data], w: bmp.width, h: bmp.height }; };
  const openEditor = async () => {
    D.querySelector('#ribbon [data-tab="ctx"]').click(); await sleep(40);
    [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => x.querySelector('span')?.textContent === 'Editar imagen')?.click();
    await until(() => D.getElementById('imged-modal')); await sleep(40); return D.getElementById('imged-modal');
  };
  const tabTo = async (m, id) => { m.querySelector(`.dk-tab[data-tab="${id}"]`).click(); await sleep(40); };

  await test('editar imagen: filtros con su miniatura, en el lienzo, la presentación, la imagen exportada y Ctrl+Z', async () => {
    reset(); const W = frame.contentWindow;
    const b = putPicture(testPicture((g, w, h) => { g.fillStyle = '#ff0000'; g.fillRect(0, 0, w / 2, h); g.fillStyle = '#0000ff'; g.fillRect(w / 2, 0, w / 2, h); }));
    await sleep(30);
    const m = await openEditor(); assert(m, 'Imagen ▸ Editar imagen abre el editor');
    assert(['adjust', 'filters', 'crop', 'background', 'extend', 'layers'].every(k => m.querySelector(`.dk-tab[data-tab="${k}"]`)), 'con sus seis pestañas');
    await tabTo(m, 'filters');
    assert(m.querySelectorAll('[data-fx]').length >= 13 && /url\(/.test(m.querySelector('[data-fx="noir"] img').style.filter), 'la galería: la imagen con cada filtro');
    m.querySelector('[data-fx="bw"]').click(); await sleep(30);
    const cur = () => slide().blocks.find(x => x.id === b.id);
    eq(cur().fx?.name, 'bw', 'elegido: blanco y negro');
    const img = D.querySelector(`#stage .block[data-id="${b.id}"] img`), id = img?.style.filter.match(/url\("?#([\w-]+)/)?.[1];
    assert(id && D.getElementById(id)?.querySelector('feColorMatrix'), 'en el lienzo: su filtro SVG');
    assert(m.querySelector('.ie-pic').style.filter.includes(id), 'y en la vista del editor');
    const html = R.io.buildHTML(); assert(html.includes(`<filter id="${id}"`) && html.includes(`url(#${id})`), 'en la presentación exportada, con su filtro');
    const baked = await R.objects.bakeImage(cur(), 1), bp = baked.getContext('2d').getImageData(40, 80, 1, 1).data;
    assert(Math.abs(bp[0] - bp[1]) < 12 && Math.abs(bp[1] - bp[2]) < 12, '«Guardar como imagen»: gris, ' + [...bp].slice(0, 3));
    const I = await W.eval("import('/src/io/export/images.js')"), shot = await I.slideImageBlob(slide(), 'png'), url = URL.createObjectURL(shot);
    const { px } = await pixelOf(url, 300, 360); URL.revokeObjectURL(url);
    assert(Math.abs(px[0] - px[1]) < 16 && Math.abs(px[1] - px[2]) < 16 && px[0] > 30, 'la diapositiva como imagen (PNG, PDF): también gris, ' + px.slice(0, 3));
    // Strength, duotone and its colours, warmth: each one changes the look.
    const amt = m.querySelector('.ie-amt'); amt.value = 50; amt.dispatchEvent(new Event('input')); await sleep(20);
    eq(cur().fx.amount, 50, 'intensidad');
    m.querySelector('[data-fx="duotone"]').click(); await sleep(60);
    assert(cur().fx.name === 'duotone' && cur().fx.dark && !m.querySelector('.ie-duo').hidden, 'duotono, con sus dos colores');
    R.store.undo(); await sleep(60);
    eq(cur().fx?.name, 'bw', 'Ctrl+Z: el filtro de antes'); assert(m.querySelector('[data-fx="bw"]').getAttribute('aria-pressed') === 'true', 'y el editor lo sigue');
    m.querySelector('[data-fx=""]').click(); await sleep(20); assert(!cur().fx, '«Ninguno» lo quita');
    await tabTo(m, 'adjust');
    const warm = m.querySelector('[data-adj="warmth"]'); warm.value = 60; warm.dispatchEvent(new Event('input')); await sleep(30);
    eq(cur().adj.warmth, 60, 'calidez'); assert(/url\(/.test(D.querySelector(`#stage .block[data-id="${b.id}"] img`).style.filter), 'la calidez, también un filtro');
    m.querySelector('.ie-reset').click(); await sleep(20); assert(!cur().adj, 'restablecer');
    m.querySelector('.modal-close').click(); assert(!D.getElementById('imged-modal'), 'se cierra');
  });

  await test('editar imagen: ampliar sin IA a otra forma (un color, espejo) y deshacerlo', async () => {
    reset(); const W = frame.contentWindow, T = await W.eval("import('/src/features/document/imagetools.js')");
    eq(JSON.stringify(T.extendSize(100, 50, { ratio: 'margin', margin: 10 })), '[120,70,10,10]', 'un margen: igual por los cuatro lados');
    eq(T.extendSize(160, 90, { ratio: '16:9' }), null, 'la misma forma: nada que hacer');
    const src0 = testPicture((g, w, h) => { g.fillStyle = '#ff0000'; g.fillRect(0, 0, w, h); }), b = putPicture(src0); await sleep(30);
    const m = await openEditor(); await tabTo(m, 'extend'); await sleep(60);
    const set = (s, v) => { const e = m.querySelector(s); e.value = v; e.dispatchEvent(new Event('input')); };
    set('.ie-ratio', '16:9'); set('.ie-fill', 'color'); set('.ie-color', '#00ff00');
    assert(await until(() => m.querySelector('.ie-pic.ie-ext')), 'la vista muestra cómo quedará');
    m.querySelector('[data-do="extend"]').click();
    const cur = () => slide().blocks.find(x => x.id === b.id);
    assert(await until(() => cur().src !== src0), 'ampliada');
    const { px, w, h } = await pixelOf(cur().src, 2, 40);
    assert(Math.abs(w / h - 16 / 9) < 0.02 && w > 120 && h === 80, 'más grande, 16:9: ' + w + '×' + h);
    assert(px[1] > 200 && px[0] < 60, 'el borde nuevo, del color elegido: ' + px.slice(0, 3));
    assert(cur().h === 160 && Math.abs(cur().w - 284) <= 2 && cur().x < 100, 'la caja crece alrededor y la foto no cambia de tamaño: ' + [cur().x, cur().w, cur().h]);
    R.store.undo(); await sleep(30); eq(cur().src, src0, 'Ctrl+Z: como estaba'); eq(cur().w, 240, 'y su caja');
    // Mirrored edges: the picture's own colour reaches the new edge.
    set('.ie-fill', 'mirror');
    assert(await until(() => /espejo/.test(m.querySelector('.ie-note').textContent)), 'en espejo: el consejo, mientras es la elección');
    m.querySelector('[data-do="extend"]').click();
    assert(await until(() => cur().src !== src0), 'en espejo');
    const e = await pixelOf(cur().src, 1, 40); assert(e.px[0] > 200 && e.px[1] < 60, 'sus bordes, reflejados: ' + e.px.slice(0, 3));
    m.querySelector('.modal-close').click();
  });

  await test('editar imagen: capas — la figura encima y el fondo con su hueco relleno, dos objetos en su sitio', async () => {
    reset(); const W = frame.contentWindow, T = await W.eval("import('/src/features/document/imagetools.js')"), was = T.layerKit.cutout;
    const src0 = testPicture((g, w, h) => { g.fillStyle = '#00c000'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff0000'; g.fillRect(45, 25, 30, 30); });
    // (The background removal's AI, played: what is red in the picture it is given — which is squared, on white — alone.)
    T.layerKit.cutout = async src => { const img = await T.loadPicture(src), c = W.document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0); const p = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < p.data.length; i += 4) if (!(p.data[i] > 200 && p.data[i + 1] < 80)) p.data[i + 3] = 0;
      g.putImageData(p, 0, 0); return c.toDataURL('image/png'); };
    try {
      const b = putPicture(src0), n = slide().blocks.length; await sleep(30);
      const m = await openEditor(); await tabTo(m, 'layers');
      m.querySelector('[data-do="layers"]').click();
      assert(await until(() => slide().blocks.length === n + 1), 'dos objetos');
      const [bg, top] = slide().blocks.slice(-2);
      eq(bg.id, b.id, 'el de abajo es la foto (con lo que tenía)'); assert(top.type === 'image' && top.id !== b.id, 'encima, la figura');
      assert(['x', 'y', 'w', 'h'].every(k => bg[k] === top[k]), 'los dos en el mismo sitio');
      eq(JSON.stringify(R.state.ui.multi), JSON.stringify([bg.id, top.id]), 'seleccionados juntos');
      const fig = await pixelOf(top.src, 5, 5), mid = await pixelOf(top.src, 60, 40);
      assert(fig.px[3] === 0 && mid.px[0] > 200 && mid.px[3] === 255, 'la figura: solo el cuadrado, el resto transparente');
      const hole = await pixelOf(bg.src, 60, 40);
      assert(hole.px[1] > 150 && hole.px[0] < 80, 'el fondo: donde estaba la figura, lo de alrededor (verde): ' + hole.px.slice(0, 3));
      assert(!D.getElementById('imged-modal'), 'el editor se cierra para verlos');
      R.store.undo(); await sleep(30);
      eq(slide().blocks.length, n, 'Ctrl+Z: una sola imagen'); eq(slide().blocks.at(-1).src, src0, 'la de antes');
      // A picture with no background of its own (a logo already cut out): nothing to separate, said — not two layers.
      const logo = putPicture(testPicture(g => { g.fillStyle = '#ff0000'; g.fillRect(45, 25, 30, 30); })), k = slide().blocks.length;
      let said = ''; try { await T.splitLayers(logo.id); } catch (e) { said = e.message; }
      assert(/no tiene fondo/.test(said) && slide().blocks.length === k, 'sin fondo: lo dice y no separa: ' + said);
    } finally { T.layerKit.cutout = was; }
  });

  // «Editar imagen», más denso (2026-10-16): Lightroom's adjustments, the shape, outline and glow, copy/paste, the
  // brushes and the effects made with the subject's mask.
  const setRange = (m, sel, v, ev = 'input') => { const e = m.querySelector(sel); e.value = v; e.dispatchEvent(new Event(ev, { bubbles: true })); };
  const bakedPx = async (b, x, y, scale = 1) => [...(await R.objects.bakeImage(b, scale)).getContext('2d').getImageData(x, y, 1, 1).data];
  const grey = (v = 128) => testPicture((g, w, h) => { g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, 0, w, h); });

  await test('editar imagen: exposición, sombras, claridad, grano y niveles — en el lienzo, la presentación, la imagen y Ctrl+Z', async () => {
    reset();
    const b = putPicture(grey()); await sleep(30);
    const m = await openEditor(); const cur = () => slide().blocks.find(x => x.id === b.id);
    assert(['shape', 'retouch'].every(k => m.querySelector(`.dk-tab[data-tab="${k}"]`)), 'las pestañas nuevas: Forma y Retocar');
    assert(['Luz', 'Color', 'Detalle', 'Efectos'].every(s => [...m.querySelectorAll('.ie-sec')].some(h => h.textContent === s)), 'los ajustes, en cuatro grupos');
    setRange(m, '[data-adj="exposure"]', 50); await sleep(30);
    eq(cur().adj.exposure, 50, 'exposición');
    const img = () => D.querySelector(`#stage .block[data-id="${b.id}"] img`), idOf = () => img()?.style.filter.match(/url\("?#([\w-]+)/)?.[1];
    assert(idOf() && D.getElementById(idOf()), 'en el lienzo, su filtro');
    assert((await bakedPx(cur(), 120, 80))[0] > 165, 'la imagen exportada, más clara');
    setRange(m, '[data-adj="exposure"]', 0); setRange(m, '[data-adj="shadows"]', 80); await sleep(30);
    assert(!('exposure' in cur().adj) && cur().adj.shadows === 80, 'a cero se quita; sombras');
    assert(D.getElementById(idOf())?.querySelector('feComponentTransfer feFuncR[type="table"]'), 'las sombras: una curva de tonos');
    eq(R.io.buildHTML().includes(`<filter id="${idOf()}"`), true, 'en la presentación exportada');
    assert((await bakedPx(cur(), 120, 80))[0] > 140, 'sombras levantadas: más claro el gris oscuro');
    setRange(m, '[data-adj="shadows"]', 0);
    const levels = m.querySelector('[data-adj="black"]'); assert(levels.closest('details.dk-more'), 'los niveles, en «Más opciones»');
    setRange(m, '[data-adj="black"]', 60); await sleep(30);
    assert((await bakedPx(cur(), 120, 80))[0] < 100, 'punto negro: más oscuro');
    setRange(m, '[data-adj="black"]', 0); setRange(m, '[data-adj="red"]', 80); await sleep(30);
    const rc = await bakedPx(cur(), 120, 80); assert(rc[0] > rc[2] + 20, 'el canal rojo, más rojo: ' + rc.slice(0, 3));
    setRange(m, '[data-adj="red"]', 0); setRange(m, '[data-adj="grain"]', 80); await sleep(30);
    assert(D.getElementById(idOf())?.querySelector('feTurbulence'), 'el grano: un ruido en el filtro');
    const c = await R.objects.bakeImage(cur(), 1), px = c.getContext('2d').getImageData(0, 0, 60, 60).data; let lo = 255, hi = 0;
    for (let i = 0; i < px.length; i += 4) { lo = Math.min(lo, px[i]); hi = Math.max(hi, px[i]); }
    assert(hi - lo > 30, 'el grano en los píxeles: ' + lo + '…' + hi);
    const again = (await R.objects.bakeImage(cur(), 1)).getContext('2d').getImageData(0, 0, 60, 60).data;
    assert(px.every((v, i) => v === again[i]), 'el mismo grano cada vez (la exportación no cambia)');
    setRange(m, '[data-adj="grain"]', 0); setRange(m, '[data-adj="clarity"]', 80); await sleep(30);
    assert(D.getElementById(idOf())?.querySelector('feGaussianBlur + feMerge + feComposite[operator="arithmetic"]'), 'la claridad: contraste local');
    R.store.commit(() => {}); R.store.undo(); await sleep(40);
    assert(!cur().adj?.clarity, 'Ctrl+Z: sin la claridad');
    // Double click puts a control back where it started.
    m.querySelector('[data-adj="contrast"]').value = 150; setRange(m, '[data-adj="contrast"]', 150); await sleep(10);
    m.querySelector('[data-adj="contrast"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    eq(cur().adj.contrast, 100, 'doble clic: el contraste, como estaba');
    m.querySelector('.modal-close').click();
  });

  await test('editar imagen: forma (círculo, esquinas, bordes difuminados), contorno de pegatina y resplandor, en el lienzo, la presentación y el PNG', async () => {
    reset(); const W = frame.contentWindow;
    const b = putPicture(testPicture((g, w, h) => { g.fillStyle = '#0000ff'; g.fillRect(0, 0, w, h); }, 120, 120)); await sleep(30);
    R.store.commit(() => { const x = slide().blocks.find(y => y.id === b.id); x.w = 200; x.h = 200; });
    const m = await openEditor(); const cur = () => slide().blocks.find(x => x.id === b.id);
    await tabTo(m, 'shape');
    m.querySelector('[data-shape="circle"]').click(); await sleep(30);
    eq(cur().mask?.shape, 'circle', 'círculo');
    assert(m.querySelector('[data-shape="circle"]').getAttribute('aria-pressed') === 'true', 'marcado');
    const img = D.querySelector(`#stage .block[data-id="${b.id}"] img`), id = img.style.filter.match(/url\("?#([\w-]+)/)?.[1];
    assert(id && D.getElementById(id)?.querySelector('feImage + feComposite[operator="in"]'), 'en el lienzo: la forma en su filtro');
    assert(R.io.buildHTML().includes(`<filter id="${id}"`), 'y en la presentación exportada');
    const corner = await bakedPx(cur(), 4, 4), mid = await bakedPx(cur(), 100, 100);
    assert(corner[3] === 0 && mid[3] === 255 && mid[2] > 200, 'en la imagen: fuera del círculo, transparente: ' + corner + ' / ' + mid);
    const I = await W.eval("import('/src/io/export/images.js')"), url = URL.createObjectURL(await I.slideImageBlob(slide(), 'png'));
    const k = (await pixelOf(url, 0, 0)).w / R.state.deck.size.w, out = await pixelOf(url, Math.round(k * 104), Math.round(k * 104)), inn = await pixelOf(url, Math.round(k * 200), Math.round(k * 200)); URL.revokeObjectURL(url);
    assert(out.px[2] < 200 || out.px[0] > 200, 'la diapositiva como PNG: la esquina, sin la foto: ' + out.px.slice(0, 3));
    assert(inn.px[2] > 200 && inn.px[0] < 60, 'y el centro, azul: ' + inn.px.slice(0, 3));
    m.querySelector('[data-shape="round"]').click(); await sleep(20);
    assert(!m.querySelector('.ie-radius-l').hidden && cur().mask.radius === 25, 'esquinas redondeadas, con su radio');
    setRange(m, '.ie-feather', 80); await sleep(20); eq(cur().mask.feather, 80, 'bordes difuminados');
    const soft = await bakedPx(cur(), 100, 6); assert(soft[3] > 0 && soft[3] < 200, 'el borde, a medias: ' + soft[3]);
    m.querySelector('[data-shape=""]').click(); await sleep(20); eq(cur().mask?.shape, undefined, '«Ninguna» quita la forma, no el difuminado');
    setRange(m, '.ie-feather', 0); await sleep(20); assert(!cur().mask, 'y sin difuminado, nada');
    // A cut-out (a red square on nothing): its outline and its glow.
    R.store.commit(() => { cur().src = testPicture((g, w, h) => { g.fillStyle = '#ff0000'; g.fillRect(40, 40, 40, 40); }, 120, 120); });
    m.querySelector('.ie-stk-on').click(); await sleep(30);
    assert(cur().sticker?.width > 0 && cur().sticker.color === '#ffffff', 'contorno de pegatina, blanco');
    const ring = await bakedPx(cur(), 100, 66 - 4), far = await bakedPx(cur(), 10, 10);
    assert(ring[3] > 200 && ring[0] > 230 && ring[1] > 230, 'junto a la figura, el contorno blanco: ' + ring);
    eq(far[3], 0, 'lejos, transparente');
    assert(D.getElementById(D.querySelector(`#stage .block[data-id="${b.id}"] img`).style.filter.match(/url\("?#([\w-]+)/)[1])?.querySelector('feFlood[flood-color="#ffffff"]'), 'en el lienzo también');
    m.querySelector('.ie-glow-on').click(); await sleep(20); assert(cur().glow?.size > 0, 'resplandor');
    m.querySelector('.ie-shadow-on').click(); await sleep(20); assert(cur().shadow, 'y sombra');
    assert(/<img[^>]+filter:[^;"]*url\(#rvl-[^;"]*drop-shadow\(/.test(R.io.buildHTML()), 'en la presentación, la sombra tras su aspecto');
    R.store.undo(); await sleep(30); assert(!cur().shadow, 'Ctrl+Z');
    m.querySelector('.modal-close').click();
  });

  await test('editar imagen: forma en una foto alargada — la caja cuadrada y su encuadre, ahí mismo', async () => {
    reset(); const b = putPicture(testPicture((g, w, h) => { g.fillStyle = '#ff0000'; g.fillRect(0, 0, w / 2, h); g.fillStyle = '#0000ff'; g.fillRect(w / 2, 0, w / 2, h); }, 240, 80)); await sleep(30);
    const m = await openEditor(), cur = () => slide().blocks.find(x => x.id === b.id); await tabTo(m, 'shape');
    assert(m.querySelector('.ie-pos').hidden, 'sin forma, la foto entera: sin encuadre');
    m.querySelector('[data-shape="circle"]').click(); await sleep(30);
    assert(cur().w === cur().h && cur().fit === 'cover', 'círculo: la caja, cuadrada, la foto la llena: ' + [cur().w, cur().h, cur().fit]);
    assert(!m.querySelector('.ie-pos').hidden, 'y el encuadre, a mano');
    setRange(m, '.ie-pos-x', 0); await sleep(30); eq(cur().focusX, 0, 'a la izquierda');
    const img = D.querySelector(`#stage .block[data-id="${b.id}"] img`); assert(/^0%/.test(img.style.objectPosition), 'en el lienzo: ' + img.style.objectPosition);
    setRange(m, '.ie-pos-x', 50); await sleep(30); eq(cur().focusX, undefined, 'en medio: como sin tocar');
    m.querySelector('.modal-close').click();
  });

  await test('editar imagen: antes/después, copiar y pegar ajustes, aplicar a todas, voltear y enderezar', async () => {
    reset();
    const a = putPicture(grey(100)), b = putPicture(grey(100)); await sleep(30);
    R.store.commit(() => { R.state.ui.selection = a.id; R.state.ui.multi = [a.id]; });
    let m = await openEditor(); const get = id => slide().blocks.find(x => x.id === id);
    setRange(m, '[data-adj="exposure"]', 40); await sleep(10); m.querySelector('[data-fx="sepia"]').click(); await sleep(20);
    const ba = m.querySelector('.ie-ba'), pic = m.querySelector('.ie-pic');
    assert(/url\(/.test(pic.style.filter), 'la vista, con su ajuste');
    ba.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); await sleep(10);
    assert(!/url\(/.test(pic.style.filter) && ba.getAttribute('aria-pressed') === 'true', 'pulsado: la foto sin ajustes');
    ba.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); await sleep(10);
    assert(/url\(/.test(pic.style.filter), 'al soltar, con ellos');
    m.querySelector('[data-do="copy-look"]').click(); m.querySelector('.modal-close').click();
    R.store.commit(() => { R.state.ui.selection = b.id; R.state.ui.multi = [b.id]; }); await sleep(20);
    m = await openEditor();
    assert(!m.querySelector('[data-do="paste-look"]').disabled, 'en otra imagen, se puede pegar');
    m.querySelector('[data-do="paste-look"]').click(); await sleep(20);
    eq(get(b.id).adj?.exposure, 40, 'pegados: la exposición'); eq(get(b.id).fx?.name, 'sepia', 'y el filtro');
    R.store.undo(); await sleep(20); assert(!get(b.id).fx, 'Ctrl+Z: sin pegar');
    R.blocks.addImage(grey(50)); R.slides.addSlide('blank'); R.blocks.addImage(grey(50)); R.slides.goToSlide(0); await sleep(40);
    const others = () => R.state.deck.slides.flatMap(s => s.blocks).filter(x => x.type === 'image' && x.id !== a.id);
    m.querySelector('.modal-close').click();
    R.store.commit(() => { R.state.ui.selection = a.id; R.state.ui.multi = [a.id]; }); await sleep(20);
    m = await openEditor();
    m.querySelector('[data-do="look-all"]').click(); await sleep(20);
    assert(others().length === 3 && others().every(x => x.fx?.name === 'sepia' && x.adj?.exposure === 40), 'todas las imágenes, con los ajustes (también en otra diapositiva)');
    R.store.undo(); await sleep(20); assert(others().every(x => !x.fx), 'Ctrl+Z: un solo paso');
    await tabTo(m, 'crop');
    m.querySelector('[data-do="flip-h"]').click(); await sleep(20);
    assert(get(a.id).flipH && /scaleX\(-1\)/.test(m.querySelector('.ie-pic').style.transform), 'voltear horizontal: el objeto y la vista');
    // Straighten: a red half, a blue half; turned 20°, the picture's corners come from inside it (no empty corner).
    R.store.commit(() => { get(a.id).src = testPicture((g, w, h) => { g.fillStyle = '#ff0000'; g.fillRect(0, 0, w / 2, h); g.fillStyle = '#0000ff'; g.fillRect(w / 2, 0, w / 2, h); }); });
    setRange(m, '.ie-straight', 20); await sleep(20);
    assert(/rotate\(20deg\)/.test(m.querySelector('.ie-pic').style.transform) && !m.querySelector('[data-do="straighten"]').disabled, 'la vista, girada mientras se elige');
    const s0 = get(a.id).src; m.querySelector('[data-do="straighten"]').click();
    assert(await until(() => get(a.id).src !== s0), 'enderezada');
    const cp = await pixelOf(get(a.id).src, 1, 1), cq = await pixelOf(get(a.id).src, 118, 78);
    assert(cp.px[3] === 255 && cq.px[3] === 255 && cp.w === 120, 'sin esquinas vacías, del mismo tamaño: ' + cp.px + ' ' + cq.px);
    R.store.undo(); await sleep(20); eq(get(a.id).src, s0, 'Ctrl+Z: la de antes');
    m.querySelector('.modal-close').click();
  });

  // The brush: strokes played on the brush's canvas with pointer events (a mouse; touch is the same events).
  const paintOn = async (m, pts) => {
    const c = m.querySelector('.ie-bmask'), r = c.getBoundingClientRect(), at = ([x, y]) => ({ clientX: r.left + x * r.width, clientY: r.top + y * r.height, bubbles: true, pointerId: 1, button: 0 });
    c.dispatchEvent(new PointerEvent('pointerdown', at(pts[0])));
    for (const p of pts.slice(1)) { c.dispatchEvent(new PointerEvent('pointermove', at(p))); await sleep(5); }
    c.dispatchEvent(new PointerEvent('pointerup', at(pts.at(-1)))); await sleep(30);
  };
  await test('editar imagen: pinceles — difuminar o pixelar una zona, borrar un objeto, cambiar un color, retocar el recorte', async () => {
    reset();
    // Stripes, black and white: blurred, a stripe's middle turns grey.
    const stripes = testPicture((g, w, h) => { for (let x = 0; x < w; x += 8) { g.fillStyle = x % 16 ? '#ffffff' : '#000000'; g.fillRect(x, 0, 8, h); } });
    const b = putPicture(stripes); await sleep(30); const cur = () => slide().blocks.find(x => x.id === b.id);
    const m = await openEditor(); await tabTo(m, 'retouch');
    assert(m.querySelectorAll('.ie-tool-b').length === 3, 'tres pinceles');
    m.querySelector('[data-do="tool-hide"]').click();
    assert(await until(() => !m.querySelector('.ie-brush').hidden), 'el pincel sobre la foto');
    assert(m.querySelector('.ie-stage').hidden && !m.querySelector('.ie-bar').hidden, 'con sus opciones');
    await paintOn(m, [[0.1, 0.5], [0.3, 0.5], [0.5, 0.5]]);
    assert(!m.querySelector('[data-b="apply"]').disabled, 'pintado: se puede aplicar');
    // Ctrl+Z inside the brush: the stroke goes, not a step of the presentation.
    frame.contentWindow.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })); await sleep(30);
    assert(m.querySelector('[data-b="apply"]').disabled, 'Ctrl+Z: el trazo deshecho');
    // A rectangle, pixelated.
    setRange(m, '.ie-b-shape', 'rect'); setRange(m, '.ie-b-mode', 'pixel');
    await paintOn(m, [[0.05, 0.05], [0.5, 0.5], [0.95, 0.95]]);
    m.querySelector('[data-b="apply"]').click();
    assert(await until(() => cur().src !== stripes), 'aplicado: una foto nueva');
    const p = await pixelOf(cur().src, 60, 40); assert(p.px[0] > 40 && p.px[0] < 215, 'pixelado: gris donde había rayas: ' + p.px.slice(0, 3));
    const keep = await pixelOf(cur().src, 1, 1); assert(keep.px[0] < 10 || keep.px[0] > 245, 'fuera, como estaba');
    assert(m.querySelector('.ie-brush').hidden && !m.querySelector('.ie-stage').hidden, 'y la vista vuelve');
    R.store.undo(); await sleep(20); eq(cur().src, stripes, 'Ctrl+Z: la de antes');
    // Erase: a red square on green, painted over → green.
    const sq = testPicture((g, w, h) => { g.fillStyle = '#00c000'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff0000'; g.fillRect(50, 30, 20, 20); });
    R.store.commit(() => { cur().src = sq; }); await sleep(20);
    m.querySelector('[data-do="tool-erase"]').click(); await until(() => !m.querySelector('.ie-brush').hidden); await sleep(30);
    setRange(m, '.ie-b-size', 100);
    await paintOn(m, [[0.38, 0.32], [0.62, 0.32], [0.62, 0.5], [0.38, 0.5], [0.38, 0.68], [0.62, 0.68]]);
    m.querySelector('[data-b="apply"]').click();
    assert(await until(() => cur().src !== sq), 'borrado');
    const e = await pixelOf(cur().src, 60, 40); assert(e.px[1] > 150 && e.px[0] < 90, 'donde estaba el cuadrado, verde: ' + e.px.slice(0, 3));
    // Change a colour: the red picked, made blue; the green stays.
    R.store.commit(() => { cur().src = sq; }); await sleep(20);
    m.querySelector('[data-do="tool-recolour"]').click(); await until(() => !m.querySelector('.ie-brush').hidden); await sleep(30);
    const c = m.querySelector('.ie-bmask'), r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width * 0.5, clientY: r.top + r.height * 0.5, bubbles: true, pointerId: 1, button: 0 })); await sleep(20);
    assert(/rgb\(25[0-5], 0, 0\)|#ff0000/.test(m.querySelector('.ie-from').style.background), 'el color elegido, rojo: ' + m.querySelector('.ie-from').style.background);
    setRange(m, '.ie-to', '#0000ff'); m.querySelector('[data-b="apply"]').click();
    assert(await until(() => cur().src !== sq), 'cambiado');
    const blue = await pixelOf(cur().src, 60, 40), green = await pixelOf(cur().src, 5, 5);
    assert(blue.px[2] > 180 && blue.px[0] < 80, 'el rojo, ahora azul: ' + blue.px.slice(0, 3)); assert(green.px[1] > 150 && green.px[2] < 80, 'el verde, igual');
    // Retouch a cut-out: erase more, then bring back from the picture before.
    const T = await frame.contentWindow.eval("import('/src/features/document/imagetools.js')");
    const cut = testPicture((g, w, h) => { g.fillStyle = '#ff0000'; g.fillRect(30, 20, 60, 40); });
    T.cutoutOrigins.set(b.id, sq); R.store.commit(() => { cur().src = cut; }); await sleep(20);
    await tabTo(m, 'background'); m.querySelector('[data-do="tool-cutout"]').click(); await until(() => !m.querySelector('.ie-brush').hidden); await sleep(30);
    assert(m.querySelector('.ie-b-mode option[value="restore"]'), 'se puede recuperar (se sabe cuál era la foto)');
    await paintOn(m, [[0.45, 0.5], [0.55, 0.5]]); m.querySelector('[data-b="apply"]').click();
    assert(await until(() => cur().src !== cut), 'retocado');
    eq((await pixelOf(cur().src, 60, 40)).px[3] < 40, true, 'borrado: transparente');
    const cut2 = cur().src;
    m.querySelector('[data-do="tool-cutout"]').click(); await until(() => !m.querySelector('.ie-brush').hidden); await sleep(30);
    setRange(m, '.ie-b-mode', 'restore'); setRange(m, '.ie-b-size', 30);
    await paintOn(m, [[0.05, 0.1], [0.1, 0.1]]); m.querySelector('[data-b="apply"]').click();
    assert(await until(() => cur().src !== cut2), 'recuperado');
    const back = await pixelOf(cur().src, 8, 8); assert(back.px[3] > 200 && back.px[1] > 150, 'el fondo de la foto, de vuelta: ' + back.px);
    T.cutoutOrigins.delete(b.id);
    m.querySelector('.modal-close').click();
  });

  await test('editar imagen: un logo transparente — difuminar y borrar actúan en su transparencia, enderezar gira el objeto, «no tiene fondo», la sombra en el PNG', async () => {
    reset(); const W = frame.contentWindow, T = await W.eval("import('/src/features/document/imagetools.js')"), was = T.layerKit.cutout;
    // (A logo: black letters — a bar — on nothing.)
    const logo = testPicture(g => { g.fillStyle = '#000000'; g.fillRect(20, 30, 80, 20); });
    const b = putPicture(logo); await sleep(30); const cur = () => slide().blocks.find(x => x.id === b.id);
    const all = () => { const c = D.createElement('canvas'); c.width = 120; c.height = 80; const g = c.getContext('2d'); g.fillRect(0, 0, 120, 80); return c; };
    await T.hideArea(b.id, all(), { mode: 'blur', strength: 80 });
    const edge = await pixelOf(cur().src, 60, 26); assert(edge.px[3] > 10 && edge.px[3] < 245, 'difuminado: el borde de las letras, a medias transparente: ' + edge.px);
    R.store.undo(); await sleep(20); eq(cur().src, logo, 'Ctrl+Z');
    const part = D.createElement('canvas'); part.width = 120; part.height = 80; part.getContext('2d').fillRect(50, 0, 70, 80);
    await T.eraseArea(b.id, part);
    eq((await pixelOf(cur().src, 80, 40)).px[3], 0, 'borrar en un logo: transparente, no una mancha');
    assert((await pixelOf(cur().src, 30, 40)).px[3] > 240, 'lo no pintado, igual');
    R.store.undo(); await sleep(20);
    await T.straightenImage(b.id, 10);
    eq(cur().src, logo, 'enderezar un logo: la imagen, intacta'); eq(cur().rotation, 10, 'el objeto, girado');
    R.store.undo(); await sleep(20);
    // (The AI, played: it keeps what is not white — the whole logo.)
    T.layerKit.cutout = async src => { const img = await T.loadPicture(src), c = D.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0); const p = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < p.data.length; i += 4) if (p.data[i] > 200 && p.data[i + 1] > 200 && p.data[i + 2] > 200) p.data[i + 3] = 0;
      g.putImageData(p, 0, 0); return c.toDataURL('image/png'); };
    try {
      let said = ''; try { await T.cutoutPicture(logo); } catch (e) { said = e.message; } assert(/no tiene fondo/.test(said), 'quitar el fondo: lo dice: ' + said);
      said = ''; try { await T.subjectEffect(b.id, 'blur', 60); } catch (e) { said = e.message; } assert(/no tiene fondo/.test(said), 'desenfocar el fondo: también: ' + said);
    } finally { T.layerKit.cutout = was; }
    // The shadow, in the slide's PNG: below and right of the picture, darker than the white slide.
    R.store.commit(() => { slide().background = '#ffffff'; cur().src = testPicture((g, w, h) => { g.fillStyle = '#0000ff'; g.fillRect(0, 0, w, h); }); cur().fit = 'fill'; cur().shadow = true; });
    const I = await W.eval("import('/src/io/export/images.js')"), url = URL.createObjectURL(await I.slideImageBlob(slide(), 'png'));
    const k = (await pixelOf(url, 0, 0)).w / R.state.deck.size.w, sh = await pixelOf(url, Math.round(k * (100 + 240 + 3)), Math.round(k * (100 + 160 + 5)));
    const inn = await pixelOf(url, Math.round(k * 220), Math.round(k * 180)); URL.revokeObjectURL(url);
    assert(sh.px[0] < 235, 'la sombra, en el PNG: ' + sh.px.slice(0, 3)); assert(inn.px[2] > 200 && inn.px[0] < 60, 'y la foto en su sitio: ' + inn.px.slice(0, 3));
    // Turned and «contain» (a long picture in its box): html2canvas cut it to its box unturned; drawn whole now.
    R.store.commit(() => { const x = cur(); x.shadow = false; x.fit = 'contain'; x.rotation = 30; x.src = testPicture((g, w, h) => { g.fillStyle = '#000000'; g.fillRect(0, 0, w, h); }, 120, 40); });
    const u2 = URL.createObjectURL(await I.slideImageBlob(slide(), 'png')), end = await pixelOf(u2, Math.round(k * 306), Math.round(k * 230)); URL.revokeObjectURL(u2);
    assert(end.px[0] < 60, 'girada 30°: su extremo, dibujado: ' + end.px.slice(0, 3));
  });

  await test('editar imagen: desenfocar el fondo y color selectivo con la figura (IA simulada); colores de la foto al tema', async () => {
    reset(); const T = await frame.contentWindow.eval("import('/src/features/document/imagetools.js')"), was = T.layerKit.cutout;
    const src0 = testPicture((g, w, h) => { for (let x = 0; x < w; x += 4) { g.fillStyle = x % 8 ? '#00ff00' : '#008000'; g.fillRect(x, 0, 4, h); } g.fillStyle = '#ff0000'; g.fillRect(45, 25, 30, 30); });
    // (The AI, played: what is red in the picture it is given — squared, on white.)
    T.layerKit.cutout = async src => { const img = await T.loadPicture(src), c = D.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0); const p = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < p.data.length; i += 4) if (!(p.data[i] > 200 && p.data[i + 1] < 80)) p.data[i + 3] = 0;
      g.putImageData(p, 0, 0); return c.toDataURL('image/png'); };
    try {
      const b = putPicture(src0); await sleep(30); const cur = () => slide().blocks.find(x => x.id === b.id);
      const m = await openEditor(); await tabTo(m, 'background');
      setRange(m, '.ie-bgk', 100); m.querySelector('[data-do="bgblur"]').click();
      assert(await until(() => cur().src !== src0), 'fondo desenfocado: otra foto');
      const s1 = await pixelOf(cur().src, 8, 70), s2 = await pixelOf(cur().src, 10, 70), fig = await pixelOf(cur().src, 60, 40);
      assert(Math.abs(s1.px[1] - s2.px[1]) < 40, 'las rayas del fondo, borrosas: ' + s1.px[1] + ' ' + s2.px[1]);
      assert(fig.px[0] > 200 && fig.px[1] < 60, 'la figura, nítida');
      R.store.undo(); await sleep(20); eq(cur().src, src0, 'Ctrl+Z');
      m.querySelector('[data-do="selective"]').click();
      assert(await until(() => cur().src !== src0), 'color selectivo');
      const bg = await pixelOf(cur().src, 5, 70), f2 = await pixelOf(cur().src, 60, 40);
      assert(Math.abs(bg.px[0] - bg.px[1]) < 10 && Math.abs(bg.px[1] - bg.px[2]) < 10, 'el fondo, gris: ' + bg.px.slice(0, 3));
      assert(f2.px[0] > 200 && f2.px[1] < 60, 'la figura, en color');
      R.store.undo(); await sleep(20);
      // Its colours.
      await tabTo(m, 'retouch');
      assert(await until(() => m.querySelectorAll('[data-colour]').length >= 2), 'los colores de la foto');
      const cols = [...m.querySelectorAll('[data-colour]')].map(x => x.dataset.colour);
      assert(cols.some(c => /^#[0-9a-f]{6}$/.test(c) && parseInt(c.slice(3, 5), 16) > 100 && parseInt(c.slice(1, 3), 16) < 80), 'entre ellos, el verde: ' + cols);
      m.querySelector('[data-do="use-colours"]').click(); await sleep(20);
      eq(R.state.deck.palette, 'custom', 'al tema'); assert(cols.includes(R.state.deck.customPalette.accents[0]), 'con sus colores de énfasis');
      R.store.undo(); await sleep(20); assert(R.state.deck.palette !== 'custom', 'Ctrl+Z: el tema de antes');
      m.querySelector('.modal-close').click();
    } finally { T.layerKit.cutout = was; }
  });

  // The slide as a PNG (html2canvas, the looks baked) → a pixel reader in slide coordinates.
  const slidePNG = async () => {
    const I = await frame.contentWindow.eval("import('/src/io/export/images.js')"), url = URL.createObjectURL(await I.slideImageBlob(slide(), 'png'));
    const bmp = await createImageBitmap(await (await fetch(url)).blob()), c = D.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; URL.revokeObjectURL(url);
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); const k = bmp.width / R.state.deck.size.w;
    return (x, y) => [...g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data];
  };
  const filterOf = b => D.getElementById(D.querySelector(`#stage .block[data-id="${b.id}"] img`)?.style.filter.match(/url\("?#([\w-]+)/)?.[1] || '-');
  const stripes = testPicture((g, w, h) => { for (let x = 0; x < w; x += 4) { g.fillStyle = x % 8 ? '#ffffff' : '#000000'; g.fillRect(x, 0, 4, h); } });

  await test('editar imagen: efectos — glitch, ilustración, textura, destello y movimiento, en el lienzo, la presentación y el PNG; pixelar', async () => {
    reset(); const b = putPicture(testPicture((g, w, h) => { g.fillStyle = '#ff0000'; g.fillRect(0, 0, w / 2, h); g.fillStyle = '#0000ff'; g.fillRect(w / 2, 0, w / 2, h); }));
    await sleep(30); const cur = () => slide().blocks.find(x => x.id === b.id), m = await openEditor(); await tabTo(m, 'effects');
    assert(m.querySelectorAll('[data-efx]').length === 6 && /url\(/.test(m.querySelector('[data-efx="glitch"] img').style.filter), 'la galería: la imagen con cada efecto');
    m.querySelector('[data-efx="glitch"]').click(); await sleep(30);
    eq(cur().efx?.name, 'glitch', 'glitch'); assert(!m.querySelector('.ie-efx-amt-l').hidden, 'con su intensidad');
    assert(filterOf(cur())?.querySelector('feBlend[mode="screen"]') && filterOf(cur()).querySelectorAll('feOffset[y]').length > 3, 'en el lienzo: los colores separados y las bandas');
    assert(R.io.buildHTML().includes(`<filter id="${filterOf(cur()).id}"`), 'y en la presentación');
    // (Its red, slid to the right: past the middle, the red and blue are both there — magenta —, in the picture and the PNG.)
    const rows = []; for (let y = 1; y < 160; y += 6) rows.push(await bakedPx(cur(), 121, y));
    assert(rows.some(p => p[0] > 200 && p[2] > 200 && p[1] < 60), 'glitch en la imagen: rojo y azul juntos junto a la raya');
    m.querySelector('[data-efx="texture"]').click(); await sleep(20); setRange(m, '.ie-efx-tex', 'canvas'); await sleep(20);
    eq(cur().efx.kind, 'canvas', 'textura: lienzo'); assert(filterOf(cur())?.querySelector('feTile'), 'su baldosa, en el filtro');
    const tx = await Promise.all([[10, 10], [13, 11], [16, 14], [20, 9]].map(([x, y]) => bakedPx(cur(), x, y))); assert(new Set(tx.map(p => p[0] + p[1] + p[2])).size > 1, 'la textura cambia el rojo liso: ' + tx.map(p => p.slice(0, 3)));
    setRange(m, '.ie-efx-amt', 100); await sleep(20); eq(cur().efx.amount, 100, 'intensidad');
    m.querySelector('[data-efx="leak"]').click(); await sleep(20); setRange(m, '.ie-efx-leak', 'warm'); await sleep(20);
    const lk = await bakedPx(cur(), 225, 140); assert(lk[1] > 60, 'destello cálido: el azul de la esquina, aclarado de amarillo: ' + lk.slice(0, 3));
    m.querySelector('[data-efx="illustr"]').click(); await sleep(20); assert(filterOf(cur())?.querySelector('feFuncR[type="discrete"]'), 'ilustración: colores en escalones');
    m.querySelector('[data-efx="motion"]').click(); await sleep(20);
    const mo = await bakedPx(cur(), 120, 80); assert(mo[0] > 60 && mo[2] > 60, 'movimiento: rojo y azul, mezclados en la raya: ' + mo.slice(0, 3));
    const png = await slidePNG(), pm = png(220, 180); assert(pm[0] > 60 && pm[2] > 60, 'y así en el PNG de la diapositiva: ' + pm.slice(0, 3));
    R.store.undo(); await sleep(30); eq(cur().efx?.name, 'illustr', 'Ctrl+Z: el efecto de antes');
    m.querySelector('[data-efx=""]').click(); await sleep(20); assert(!cur().efx, '«Ninguno» lo quita');
    // Pixelado: what it would be, shown; then a new picture, in squares; a see-through logo keeps its transparency.
    R.store.commit(() => { cur().src = stripes; }); await sleep(20); const src0 = cur().src; setRange(m, '.ie-px', 60);
    assert(await until(() => m.querySelector('.ie-pic.ie-ext')), 'pixelado: lo que haría, en la vista');
    m.querySelector('[data-do="pixelate"]').click(); assert(await until(() => cur().src !== src0), 'pixelar: otra imagen');
    const a = await pixelOf(cur().src, 1, 1), c = await pixelOf(cur().src, 4, 3); eq(a.px.join(), c.px.join(), 'en cuadros (las rayas, mezcladas)'); assert(a.px[0] > 20 && a.px[0] < 235, 'gris: ' + a.px);
    R.store.undo(); await sleep(20); eq(cur().src, src0, 'Ctrl+Z');
    m.querySelector('.modal-close').click();
    const T = await frame.contentWindow.eval("import('/src/features/document/imagetools.js')");
    const logo = putPicture(testPicture(g => { g.fillStyle = '#000000'; g.fillRect(30, 30, 60, 20); })); await sleep(20);
    await T.pixelateImage(logo.id, 20); const lp = slide().blocks.find(x => x.id === logo.id).src;
    assert(/^data:image\/png/.test(lp) && (await pixelOf(lp, 2, 2)).px[3] === 0, 'pixelar un logo: sigue siendo transparente (PNG)');
  });

  await test('editar imagen: sombra curvada, levantada y en ángulo, y reflejo — en el lienzo, la presentación, el PNG y PowerPoint', async () => {
    reset(); R.store.commit(() => { slide().background = '#ffffff'; });
    const b = putPicture(testPicture((g, w, h) => { g.fillStyle = '#0000ff'; g.fillRect(0, 0, w, h); })); await sleep(30);
    const cur = () => slide().blocks.find(x => x.id === b.id), m = await openEditor(); await tabTo(m, 'shape');
    m.querySelector('.ie-shadow-on').click(); await sleep(20);
    eq(JSON.stringify(cur().shadow), JSON.stringify({ x: 4, y: 6, blur: 10, color: '#00000066' }), 'sombra: la de siempre (DEFAULT_SHADOW)');
    assert(/drop-shadow/.test(D.querySelector(`#stage .block[data-id="${b.id}"]`).style.filter), 'normal: drop-shadow, como antes');
    setRange(m, '.ie-shadow-st', 'curl'); await sleep(30);
    eq(cur().shadow.style, 'curl', 'curvada');
    assert(!/drop-shadow/.test(D.querySelector(`#stage .block[data-id="${b.id}"]`).style.filter), 'ya no es un drop-shadow…');
    const f = filterOf(cur()); assert(f && +f.getAttribute('height') > 1 && f.querySelector('feImage + feComposite[in="so"]'), '…sino su filtro, más alto que la caja');
    const html = R.io.buildHTML(); assert(html.includes(`<filter id="${f.id}"`) && !/<img[^>]+drop-shadow/.test(html), 'en la presentación: su filtro, sin drop-shadow');
    let px = await slidePNG(); const corner = px(104, 263), mid = px(220, 263);
    assert(corner[0] < 235 && mid[0] > corner[0] + 10, 'PNG: sombra bajo las esquinas, no en medio: ' + corner[0] + ' / ' + mid[0]);
    setRange(m, '.ie-shadow-st', 'lift'); await sleep(20); setRange(m, '.ie-shadow-d', 80); await sleep(20);
    eq(cur().shadow.dist, 80, 'levantada, más lejos'); assert(filterOf(cur())?.querySelector('feMorphology[operator="erode"]'), 'más pequeña que la foto');
    px = await slidePNG(); assert(px(220, 270)[0] < 235, 'PNG: la sombra, bajo la foto');
    setRange(m, '.ie-shadow-st', 'angle'); await sleep(20);
    assert(filterOf(cur())?.querySelector('feDisplacementMap'), 'en ángulo: proyectada en el suelo');
    px = await slidePNG(); const cast = px(400, 210), near = px(350, 250), far = px(370, 120);
    assert(cast[0] < 235 && near[0] < 235 && far[0] > 245, 'PNG: a la derecha, abajo, la sombra; arriba, nada: ' + [cast[0], near[0], far[0]]);
    const k = await R.objects.bakeImage(cur(), 1, { decor: true }); assert(k.pad[2] > 50 && k.width > 240, '«Guardar como imagen» y PowerPoint: la sombra, fuera de la caja');
    m.querySelector('.ie-shadow-on').click(); await sleep(20); assert(!cur().shadow, 'sin sombra');
    // The reflection: under it, fading; a crop moves it up, to under what is shown.
    m.querySelector('.ie-refl-on').click(); await sleep(20);
    eq(JSON.stringify(cur().reflect), JSON.stringify({ size: 40, opacity: 35, gap: 0 }), 'reflejo');
    px = await slidePNG(); const r1 = px(220, 265), r2 = px(220, 320);
    assert(r1[2] > 200 && r1[0] < 200 && r1[0] < r2[0], 'PNG: debajo, el azul, cada vez más claro: ' + r1.slice(0, 3) + ' / ' + r2.slice(0, 3));
    setRange(m, '.ie-refl-s', 80); await sleep(20); eq(cur().reflect.size, 80, 'su tamaño');
    R.store.commit(() => { cur().crop = { top: 0, right: 0, bottom: 25, left: 0 }; });
    await sleep(30); eq(D.querySelector(`#stage .block[data-id="${b.id}"] img`).style.clipPath, 'none', 'recortada: el recorte, en el filtro (un clip-path cortaría el reflejo)');
    px = await slidePNG(); const shown = px(220, 215), refl = px(220, 230);
    assert(shown[0] < 40 && shown[2] > 200 && refl[2] > 200 && refl[0] > 100 && refl[0] < 240, 'el reflejo, bajo lo que se ve: ' + shown.slice(0, 3) + ' / ' + refl.slice(0, 3));
    for (let i = 0; i < 4 && cur().reflect; i++) { R.store.undo(); await sleep(20); } assert(!cur().reflect && !cur().crop, 'Ctrl+Z');
    // A shadow written as before (true: an old presentation's) is still the plain one.
    R.store.commit(() => { cur().shadow = true; }); await sleep(20);
    assert(/drop-shadow/.test(D.querySelector(`#stage .block[data-id="${b.id}"]`).style.filter), 'b.shadow de antes: como siempre');
    m.querySelector('.modal-close').click();
  });

  await test('editar imagen: enfoque — todo desenfocado menos una zona, que se pone con un clic; en el lienzo y el PNG', async () => {
    reset(); const b = putPicture(stripes); await sleep(30);
    const cur = () => slide().blocks.find(x => x.id === b.id), m = await openEditor(); await tabTo(m, 'background');
    m.querySelector('.ie-fb-on').click(); await sleep(20);
    eq(JSON.stringify(cur().focusBlur), JSON.stringify({ x: 50, y: 50, size: 35, blur: 60 }), 'enfoque, en el centro');
    assert(filterOf(cur())?.querySelector('feComposite[operator="out"]'), 'en el lienzo: su filtro');
    const r = m.querySelector('.ie-pic').getBoundingClientRect();
    m.querySelector('.ie-stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: r.left + r.width * 0.2, clientY: r.top + r.height * 0.5 }));
    await sleep(30); eq(cur().focusBlur.x, 20, 'un clic en la foto: la zona nítida, ahí');
    setRange(m, '.ie-fb-b', 100); await sleep(20); eq(cur().focusBlur.blur, 100, 'más desenfoque');
    const sharp = [await bakedPx(cur(), 44, 80), await bakedPx(cur(), 52, 80)], soft = [await bakedPx(cur(), 196, 80), await bakedPx(cur(), 204, 80)];
    assert(Math.abs(sharp[0][0] - sharp[1][0]) > 150, 'nítida donde se puso: ' + sharp.map(p => p[0]));
    assert(Math.abs(soft[0][0] - soft[1][0]) < 60, 'borrosa lejos: ' + soft.map(p => p[0]));
    const png = await slidePNG(), a = png(144, 180), c = png(152, 180), d = png(296, 180), e = png(304, 180);
    assert(Math.abs(a[0] - c[0]) > 120 && Math.abs(d[0] - e[0]) < 60, 'y así en el PNG: ' + [a[0], c[0], d[0], e[0]]);
    m.querySelector('.ie-fb-on').click(); await sleep(20); assert(!cur().focusBlur, 'se quita');
    m.querySelector('.modal-close').click();
  });

  await test('editar imagen: cambiar el fondo (IA simulada) — un color, un degradado, desenfocado, otra imagen o inventado con IA; un logo, tal cual', async () => {
    reset(); const W = frame.contentWindow, T = await W.eval("import('/src/features/document/imagetools.js')"), was = T.layerKit.cutout, realFetch = W.fetch;
    let cuts = 0;
    // (The AI, played: the red of what it is given is the subject.)
    T.layerKit.cutout = async src => { cuts++; const img = await T.loadPicture(src), c = D.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0); const p = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < p.data.length; i += 4) if (!(p.data[i] > 200 && p.data[i + 1] < 80)) p.data[i + 3] = 0;
      g.putImageData(p, 0, 0); return c.toDataURL('image/png'); };
    const AI = R.ai; let asked = null;
    try {
      const src0 = testPicture((g, w, h) => { g.fillStyle = '#00ff00'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff0000'; g.fillRect(45, 25, 30, 30); });
      const b = putPicture(src0); await sleep(30); const cur = () => slide().blocks.find(x => x.id === b.id), m = await openEditor(); await tabTo(m, 'background');
      setRange(m, '.ie-nb', 'color'); setRange(m, '.ie-nb-c1', '#0000ff');
      m.querySelector('[data-do="nb-preview"]').click(); assert(await until(() => m.querySelector('.ie-pic.ie-ext')), 'vista previa');
      m.querySelector('[data-do="nb-apply"]').click(); assert(await until(() => cur().src !== src0), 'un color: otra imagen');
      let bg = await pixelOf(cur().src, 5, 5), fig = await pixelOf(cur().src, 60, 40);
      assert(bg.px[2] > 200 && bg.px[1] < 60, 'el fondo, azul: ' + bg.px); assert(fig.px[0] > 200 && fig.px[1] < 60, 'la figura, igual'); eq(bg.w, 120, 'del mismo tamaño');
      eq(cuts, 1, 'la figura, recortada una vez (vista previa y cambio)');
      R.store.undo(); await sleep(20); eq(cur().src, src0, 'Ctrl+Z');
      setRange(m, '.ie-nb', 'gradient'); setRange(m, '.ie-nb-c1', '#000000'); setRange(m, '.ie-nb-c2', '#ffffff'); setRange(m, '.ie-nb-ang', 90);
      assert(!m.querySelector('.ie-nb-c2').hidden && !m.querySelector('.ie-nb-ang-l').hidden, 'degradado: dos colores y un ángulo');
      m.querySelector('[data-do="nb-apply"]').click(); assert(await until(() => cur().src !== src0), 'degradado');
      assert((await pixelOf(cur().src, 3, 70)).px[0] < 40 && (await pixelOf(cur().src, 116, 70)).px[0] > 215, 'de negro (izquierda) a blanco (derecha)');
      R.store.undo(); await sleep(20);
      setRange(m, '.ie-nb', 'blur'); m.querySelector('[data-do="nb-apply"]').click(); assert(await until(() => cur().src !== src0), 'desenfocado');
      bg = await pixelOf(cur().src, 5, 5); fig = await pixelOf(cur().src, 60, 40);
      assert(bg.px[1] > 150 && bg.px[0] < 120, 'el fondo, verde (sin el rojo de la figura): ' + bg.px); assert(fig.px[0] > 200 && fig.px[1] < 60, 'la figura, nítida');
      R.store.undo(); await sleep(20);
      const other = await T.loadPicture(testPicture((g, w, h) => { g.fillStyle = '#ffff00'; g.fillRect(0, 0, w, h); }, 50, 50));
      await T.changeBackground(b.id, { kind: 'picture', picture: other }); bg = await pixelOf(cur().src, 5, 5);
      assert(bg.px[0] > 200 && bg.px[1] > 200 && bg.px[2] < 60, 'otra imagen, llenando el fondo: ' + bg.px);
      R.store.undo(); await sleep(20);
      // Invented by the image model (its request played): asks for the description, says it spends credits.
      setRange(m, '.ie-nb', 'ai'); assert(!m.querySelector('.ie-nb-ai-say').hidden && /créditos/.test(m.querySelector('.ie-nb-ai-say').textContent), '«con IA»: dice que gasta créditos');
      assert(/créditos/.test(m.querySelector('.ie-nb option[value="ai"]').textContent), 'también en la lista');
      AI.setAiKey('sk-or-prueba'); AI.acceptPrivacy();
      const forest = testPicture((g, w, h) => { g.fillStyle = '#008800'; g.fillRect(0, 0, w, h); }, 64, 48).split(',')[1];
      W.fetch = async (url, o) => { if (String(url).includes('openrouter.ai/api/v1/images')) { asked = JSON.parse(o.body); return new W.Response(JSON.stringify({ data: [{ b64_json: forest, media_type: 'image/png' }] })); } return realFetch(url, o); };
      m.querySelector('.ie-nb-ai').value = 'un bosque de hayas';
      m.querySelector('[data-do="nb-apply"]').click(); assert(await until(() => cur().src !== src0), 'inventado con IA');
      assert(/un bosque de hayas/.test(asked?.prompt) && asked.aspect_ratio === '3:2', 'pide la descripción, en la proporción de la foto: ' + asked?.aspect_ratio);
      bg = await pixelOf(cur().src, 5, 5); assert(bg.px[1] > 100 && bg.px[0] < 60, 'el fondo inventado: ' + bg.px);
      // A logo has no background of its own: put on the colour as it is, no AI; blurring «its» background, said.
      m.querySelector('.modal-close').click();
      const logo = putPicture(testPicture(g => { g.fillStyle = '#ff0000'; g.fillRect(30, 30, 60, 20); })); await sleep(20); cuts = 0;
      await T.changeBackground(logo.id, { kind: 'color', color: '#0000ff' }); const ls = slide().blocks.find(x => x.id === logo.id).src;
      eq(cuts, 0, 'un logo: sin IA'); assert((await pixelOf(ls, 2, 2)).px[2] > 200 && (await pixelOf(ls, 60, 40)).px[0] > 200, 'tal cual sobre el color');
      R.store.undo(); await sleep(20); let said = ''; try { await T.changeBackground(logo.id, { kind: 'blur' }); } catch (e) { said = e.message; } assert(/no tiene fondo/.test(said), 'desenfocar su fondo: lo dice: ' + said);
    } finally { T.layerKit.cutout = was; W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('editar imagen: sacar el texto con IA (simulada) — un cuadro de texto encima o al lado; borrarlo de la imagen; sin IA, pide conectarla', async () => {
    reset(); const W = frame.contentWindow, realFetch = W.fetch, AI = R.ai; let chats = 0, images = 0;
    const b = putPicture(testPicture((g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c00000'; g.font = '20px sans-serif'; g.fillText('HOLA', 10, 40); })); await sleep(30);
    const cur = () => slide().blocks.find(x => x.id === b.id), n0 = slide().blocks.length;
    const answer = { lines: [{ text: 'Hola mundo', box: [100, 250, 600, 500], color: '#c00000', bold: true }, { text: 'Segunda línea', box: [100, 550, 700, 750], color: '#c00000', bold: false }] };
    W.fetch = async (url, o) => { const u = String(url);
      if (u.includes('openrouter.ai/api/v1/chat')) { chats++; return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] })); }
      if (u.includes('openrouter.ai/api/v1/images')) { images++; return new W.Response(JSON.stringify({ data: [{ b64_json: testPicture((g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); }).split(',')[1], media_type: 'image/png' }] })); }
      return realFetch(url, o); };
    try {
      // Not connected: the button opens the way to connect it, and nothing is read.
      AI.disconnectAi(); let m = await openEditor(); assert(m, 'el editor, abierto'); await tabTo(m, 'layers'); assert(m.querySelector('[data-do="read-text"]'), 'con su botón');
      assert(/con IA/.test(m.querySelector('[data-do="read-text"]').textContent), 'el botón dice «con IA»');
      m.querySelector('[data-do="read-text"]').click();
      assert(await until(() => D.getElementById('ai-modal') || D.getElementById('account-modal')), 'sin IA: se abre la ventana para conectarla');
      eq(chats, 0, 'y no se pide nada'); D.getElementById('ai-modal')?.remove(); D.getElementById('account-modal')?.remove();
      AI.setAiKey('sk-or-prueba'); AI.acceptPrivacy();
      m.querySelector('[data-do="read-text"]').click();
      assert(await until(() => slide().blocks.length === n0 + 1), 'un cuadro de texto nuevo');
      let tb = slide().blocks.at(-1);
      eq(tb.type, 'text', 'de texto'); assert(/<b>Hola mundo<\/b>/.test(tb.html) && /Segunda línea/.test(tb.html), 'con lo leído, cada línea en la suya: ' + tb.html);
      assert(tb.x >= b.x && tb.x < b.x + b.w / 2 && tb.y > b.y && tb.y < b.y + b.h / 2 && tb.color === '#c00000', 'encima, donde estaba, en su color: ' + [tb.x, tb.y, tb.color]);
      eq(R.state.ui.selection, tb.id, 'y elegido'); eq(images, 0, 'sin borrar el de la imagen, no se pide otra');
      R.store.undo(); await sleep(20); eq(slide().blocks.length, n0, 'Ctrl+Z');
      (await W.eval("import('/src/ui/dialogs/imageedit.js')")).openImageEditor(cur(), 'layers'); await sleep(60); m = D.getElementById('imged-modal'); await tabTo(m, 'layers'); setRange(m, '.ie-tx-place', 'beside'); m.querySelector('.ie-tx-erase').checked = true;
      const src0 = cur().src; m.querySelector('[data-do="read-text"]').click();
      assert(await until(() => slide().blocks.length === n0 + 1 && cur().src !== src0), 'al lado, y el texto borrado de la imagen');
      tb = slide().blocks.find(x => x.type === 'text' && /Hola mundo/.test(x.html || ''));
      assert(tb.x >= b.x + b.w && !tb.color, 'al lado de la imagen, en el color de la diapositiva: ' + tb.x);
      eq(images, 1, 'borrarlo: la IA de imágenes, una vez');
    } finally { W.fetch = realFetch; AI.disconnectAi(); D.getElementById('imged-modal')?.querySelector('.modal-close')?.click(); }
  });
}
