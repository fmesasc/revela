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
    assert(D.querySelector(`.block[data-id="${conn.id}"] .connector svg line`), 'línea en el lienzo');
    assert(/<line [^>]*stroke="#8a8a8a"/.test(R.io.buildHTML()), 'línea en el export');
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
      assert(m.type === 'model' && /^data:model\/gltf-binary/.test(m.src) && m.clip === '*' && /CC/.test(m.caption), 'modelo animado guardado dentro, con su animación y licencia');
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
      assert(Math.abs(dropped.x + dropped.w / 2 - 300) < 3 && Math.abs(dropped.y + dropped.h / 2 - 200) < 3, 'donde se suelta');
      R.store.undo(); await sleep(20); eq(slide().blocks.length, n0 + 2, 'un solo paso de deshacer');
      // Other side, remembered; the same button again closes it.
      P().querySelector('.el-side').click(); await sleep(20);
      assert(P().classList.contains('right') && !P().nextElementSibling?.id?.includes('canvas'), 'se pasa a la derecha');
      const res = () => D.querySelector('[data-action="resources"]');
      res().click(); res().click(); await sleep(20); assert(!P(), 'el mismo botón otra vez lo cierra');
      res().click(); await sleep(20); assert(P()?.classList.contains('right'), 'recuerda el lado');
      P()?.querySelector('.cm-close').click(); assert(!P(), 'se cierra');
      W.localStorage.removeItem('revela.elements.side');
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
    R.slides.addSlide(); await sleep(10);
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
}
