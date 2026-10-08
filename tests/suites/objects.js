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
    const w = D.querySelector('#slide-nav .thumb .thumb-work') || D.querySelector('.thumb .thumb-work');
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
}
