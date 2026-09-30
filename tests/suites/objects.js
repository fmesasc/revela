// Objects: shapes, icons, charts, diagrams, tables, images, equations, code, media, grouping, clipboard.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
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
    assert(/<polygon points="25,4 75,4 98,50/.test(R.io.buildHTML()), 'hexágono en el export');
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

  await test('diagrama en ciclo: n cajas y n conectores', async () => {
    reset(); const n0 = slide().blocks.length; R.blocks.addDiagram('cycle');
    const added = slide().blocks.slice(n0);
    eq(added.filter(x => x.type === 'text').length, 3, 'tres cajas');
    eq(added.filter(x => x.type === 'connector').length, 3, 'tres conectores (cerrado)');
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

  await test('diagrama de proceso: cajas + conectores', async () => {
    reset(); const n0 = slide().blocks.length; R.blocks.addDiagram('process'); await sleep(20);
    const added = slide().blocks.slice(n0);
    eq(added.filter(x => x.type === 'text').length, 3, 'tres cajas');
    eq(added.filter(x => x.type === 'connector').length, 2, 'dos conectores');
  });

  await test('diagrama de lista: cajas apiladas sin conectores', async () => {
    reset(); const n0 = slide().blocks.length; R.blocks.addDiagram('list'); await sleep(10);
    const added = slide().blocks.slice(n0);
    eq(added.filter(x => x.type === 'text').length, 3, 'tres cajas');
    eq(added.filter(x => x.type === 'connector').length, 0, 'sin conectores');
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

  await test('combinar formas: unión, intersección, resta', async () => {
    reset(); const S = R.shapeops;
    R.blocks.addShape('rect'); const a = last(); Object.assign(a, { x: 100, y: 100, w: 200, h: 200, fill: '#ff0000' });
    R.blocks.addShape('ellipse'); const c = last(); Object.assign(c, { x: 200, y: 150, w: 200, h: 100 });
    R.store.setMulti([a.id, c.id]);
    const u = await S.mergeShapes('union', S.selectedShapesInOrder()); await sleep(10);
    assert(u && u.shape === 'custom', 'forma personalizada');
    eq([u.x, u.y, u.w, u.h].join(','), '104,104,292,192', 'caja de la unión (contornos 2..98)');
    eq(u.fill, '#ff0000', 'toma el aspecto de la primera');
    assert(!slide().blocks.some(b => b.id === a.id || b.id === c.id), 'originales sustituidas');
    assert(D.querySelector(`.block[data-id="${u.id}"] svg path[fill-rule="evenodd"]`), 'dibujada en el lienzo');
    R.store.undo(); await sleep(10);
    const a2 = slide().blocks.find(b => b.id === a.id), c2 = slide().blocks.find(b => b.id === c.id);
    assert(a2 && c2, 'deshacer recupera las originales');
    const i = await S.mergeShapes('intersection', [a2, c2]);
    eq(i.x + i.w, 296, 'intersección acotada al rectángulo');
    R.store.undo(); await sleep(10);
    const d = await S.mergeShapes('difference', [slide().blocks.find(b => b.id === a.id), slide().blocks.find(b => b.id === c.id)]);
    eq(d.rings.length, 1, 'resta: un contorno con mordisco'); eq(d.w, 192, 'misma anchura que el rectángulo');
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
    assert(/getUserMedia\(\{video:true/.test(html), 'pide la cámara al mostrar la diapositiva');
    slide().blocks = slide().blocks.filter(x => x.id !== b.id);
    assert(!/getUserMedia/.test(R.io.buildHTML()), 'sin cámara no se incluye el script');
  });

  await test('grabar con la cámara inserta un vídeo', async () => {
    reset(); const n0 = slide().blocks.length;
    D.querySelector('[data-action="record-camera"]').click();
    let bar; for (let i = 0; i < 40 && !(bar = D.getElementById('rec-bar')); i++) await sleep(50);
    assert(bar, 'barra de grabación (cámara falsa del navegador de pruebas)');
    await sleep(700);
    bar.querySelector('.rec-stop').click();
    for (let i = 0; i < 40 && slide().blocks.length === n0; i++) await sleep(50);
    const v = last(); eq(v.type, 'video', 'vídeo insertado');
    assert(/^data:video\//.test(v.src), 'vídeo dentro del proyecto (' + (v.src || '').slice(0, 20) + ')');
  });

  // ---- Videos and GIFs: segments per click, colour key, background removal ----------
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
    setMediaPlayback(b.id, { segments: [{ from: 0, to: 1 }, { from: 1, to: 2 }], key: { color: '#ff0000', tol: 0.1, soft: 0 }, loop: false });
    eq(JSON.stringify(last().segments), '[{"from":0,"to":1},{"from":1,"to":2}]', 'tramos guardados'); assert(!('loop' in last()), 'lo desactivado no se guarda');
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
      f.contentWindow.Reveal.next(); await sleep(150);
      assert(p.playing(), 'el siguiente clic, el segundo tramo');
      for (let i = 0; i < 30 && p.playing(); i++) await sleep(100);
      assert(Math.abs(p.time() - 2) < 0.05, 'se para en el segundo 2: ' + p.time());
      f.contentWindow.Reveal.prev(); await sleep(100);
      assert(Math.abs(p.time() - 1) < 0.05, 'volver atrás deja el final del tramo anterior');
    } finally { f.remove(); }
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
    mv.style.cssText = 'position:fixed;left:0;top:0;width:10px;height:10px;transition-duration:400ms';
    D.body.appendChild(mv);
    try {
      mv.animate([{ translate: '0px 0px' }, { translate: '300px 0px' }], { duration: 400 });
      mv.dispatchEvent(new W.TransitionEvent('transitionstart', { propertyName: 'translate', bubbles: true }));
      mv.dispatchEvent(new W.TransitionEvent('transitionstart', { propertyName: 'opacity', bubbles: true }));
      await sleep(150);
      eq(log.join(), 'Walk', 'anda mientras se mueve (una vez, aunque empiecen varias propiedades)');
      assert(/^-90(\.0)?deg/.test(mv.cameraOrbit), 'hacia la derecha: se ve de perfil mirando a la derecha');
      await sleep(450);
      eq(log.join(), 'Walk,Wave una vez', 'al llegar, la otra animación');
      assert(/^0(\.0)?deg/.test(mv.cameraOrbit), 'y mira al público');
      mv.dispatchEvent(new W.Event('finished')); eq(log.at(-1), 'Survey', 'y vuelve al reposo');
      // Moving up the slide it shows its back; with a curved path (keyframes) too.
      log.length = 0; mv.style.animationDuration = '300ms';
      mv.animate([{ translate: '0px 0px' }, { translate: '0px -200px' }], { duration: 300 });
      mv.dispatchEvent(new W.AnimationEvent('animationstart', { animationName: 'rvPm1', bubbles: true })); await sleep(120);
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
    [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => x.querySelector('span')?.textContent === 'Vínculo').click(); await sleep(20);
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
    reset(); R.blocks.addDiagram('hierarchy'); await sleep(10);
    assert(slide().blocks.filter(x => x.type === 'connector').every(x => x.route === 'elbow'), 'la jerarquía, con conectores de codo');
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

  await test('gráficos: barras apiladas, al 100 %, horizontales e histograma (también en PowerPoint)', async () => {
    reset(); const W = frame.contentWindow, S = await W.eval("import('/src/render/svg.js')");
    const d = [{ label: 'A', value: 30 }, { label: 'B', value: 10 }], ser = [{ name: 'X', values: [10, 30] }];
    const st = S.chartSVG({ chartType: 'stacked', data: d, series: ser, dataLabels: true });
    eq((st.match(/<rect (?![^>]*width="3")/g) || []).length, 4, 'apiladas: una columna por categoría, un trozo por serie (sin contar la leyenda)');
    assert(/>75 %</.test(S.chartSVG({ chartType: 'stacked100', data: d, series: ser, dataLabels: true })), 'al 100 %: en porcentajes (30 de 40 = 75 %)');
    assert(/<text x="20\.5"[^>]*text-anchor="end"[^>]*>A</.test(S.chartSVG({ chartType: 'hbar', data: d })), 'horizontales: las categorías a un lado');
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
    [...page().querySelectorAll('button')].find(x => x.querySelector('span')?.textContent === 'A mano alzada').click(); await sleep(20);
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
    assert(/rotation-per-second="45deg"/.test(R.io.buildHTML()) && !/model3dRuntime/.test(R.io.buildHTML()), 'giro a su velocidad; sin movimiento no hace falta el script');
    // The dialog.
    const { openModel3D } = await W.eval("import('/src/ui/dialogs/model3d.js')");
    await openModel3D(last()); await sleep(50);
    const q = s => D.querySelector('#m3d-modal ' + s);
    q('.m3d-motion').value = 'orbit'; q('.m3d-rot').checked = false; q('.m3d-ok').click(); await sleep(30);
    eq(last().motion, 'orbit', 'el diálogo guarda el movimiento'); eq(last().autoRotate, false, 'y el giro');
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

  await test('diagrama de jerarquía: raíz + 3 hijos con conectores', async () => {
    reset(); const n0 = slide().blocks.length; R.blocks.addDiagram('hierarchy');
    const added = slide().blocks.slice(n0);
    eq(added.filter(x => x.type === 'text').length, 4, 'raíz + 3 hijos');
    eq(added.filter(x => x.type === 'connector').length, 3, 'tres conectores');
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
    eq(v[3][1], '7', 'suma de lo de arriba, sin el encabezado «2024»'); eq(v[3][2], '22,5 €', 'con su unidad');
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
}
