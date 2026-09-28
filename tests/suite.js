// Headless regression suite for Revela.
//
// It runs the REAL app inside an iframe (index.html?test, which exposes the
// module graph on window.__revela) and drives it exactly as the UI would, then
// asserts on the resulting model, rendered DOM and exported HTML. Every fix the
// user reports gets a test here so it can't silently regress later.
//
// Run with: tests/run.sh  (headless Chrome). Result ends up in document.title
// as "REVELATEST PASS n/n" or "REVELATEST FAIL ...".

export async function run(frame) {
  const R = frame.contentWindow.__revela;
  const D = frame.contentDocument;
  const results = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
  const eq = (a, b, m) => assert(a === b, `${m || ''} (esperaba ${JSON.stringify(b)}, obtuvo ${JSON.stringify(a)})`);

  async function test(name, fn) {
    try { await fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, err: e.message || String(e) }); }
  }

  // Helpers that mirror what the UI does.
  const reset = () => { R.store.replaceDeck(R.model.emptyDeck()); R.render(); };
  const slide = () => R.store.currentSlide();
  const last = () => slide().blocks.at(-1);
  const select = b => { R.state.ui.selection = b.id; R.render(); };
  const richOf = b => D.querySelector(`.block[data-id="${b.id}"] .rich`);
  const newText = () => { R.blocks.addText(); const b = last(); select(b); return b; };

  // ---- Core editing --------------------------------------------------------
  await test('el cuadro de texto se renderiza con .rich editable-capable', async () => {
    reset(); const b = newText(); await sleep(20);
    assert(richOf(b), 'no hay .rich en el DOM');
  });

  await test('alineación de párrafo con el cuadro seleccionado (sin seleccionar texto)', async () => {
    reset(); const b = newText(); await sleep(20);
    R.state.ui.selection = b.id; window.getSelection().removeAllRanges();
    R.format.align('center'); await sleep(20);
    eq(b.textAlign, 'center', 'textAlign del modelo');
    eq(richOf(b).style.textAlign, 'center', 'textAlign en el DOM');
  });

  await test('tamaño de letra personalizable (valor arbitrario)', async () => {
    reset(); const b = newText(); R.format.setFontSize(37); await sleep(10);
    eq(b.fontSize, 37, 'fontSize'); eq(richOf(b).style.fontSize, '37px', 'fontSize DOM');
  });

  await test('interlineado personalizable', async () => {
    reset(); const b = newText(); R.format.lineSpacing('1.35'); await sleep(10);
    eq(b.lineHeight, 1.35, 'lineHeight'); eq(richOf(b).style.lineHeight, '1.35', 'lineHeight DOM');
  });

  await test('espaciado entre letras', async () => {
    reset(); const b = newText(); R.format.letterSpacing(2); await sleep(10);
    eq(b.letterSpacing, 2, 'letterSpacing'); eq(richOf(b).style.letterSpacing, '2px', 'letterSpacing DOM');
  });

  // ---- Fonts ---------------------------------------------------------------
  await test('catálogo de fuentes amplio (40+)', async () => {
    assert(D.querySelectorAll('[data-font] option').length >= 40, 'faltan fuentes en el selector');
  });

  await test('fuente de Google se carga bajo demanda y se embebe al exportar', async () => {
    reset(); const b = newText(); R.format.fontFamily("'Roboto', sans-serif"); await sleep(20);
    assert(D.querySelector('link[href*="Roboto"]'), 'no se inyectó la fuente Roboto');
    assert(/fonts\.googleapis\.com\/css2\?family=Roboto/.test(R.io.buildHTML()), 'export sin la fuente');
  });

  // ---- Objects -------------------------------------------------------------
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

  await test('cambiar diseño (layout) desde el popover', async () => {
    reset(); D.querySelector('[data-layout-open]').click(); await sleep(10);
    const btn = D.querySelector('.popover [data-layout="blank"]'); assert(btn, 'popover de diseños');
    btn.click(); await sleep(10);
    eq(slide().blocks.length, 0, 'diseño en blanco aplicado');
  });

  await test('encabezado y pie: el diálogo activa el número de diapositiva', async () => {
    reset(); D.querySelector('[data-action="insert-hf"]').click(); await sleep(10);
    const num = D.querySelector('#hf-modal .hf-num'); assert(num, 'diálogo de encabezado/pie');
    num.checked = true; num.dispatchEvent(new Event('change'));
    assert(R.state.deck.slideNumber.show, 'número activado');
  });

  await test('estilos de texto con nombre (Título, Cita…)', async () => {
    reset(); const b = newText(); R.format.applyTextStyle('quote'); await sleep(10);
    eq(b.fontStyle, 'italic', 'cursiva de cita'); eq(b.indent, 40, 'sangría de cita'); eq(b.textStyle, 'quote', 'estilo guardado');
    R.format.applyTextStyle('title'); eq(b.fontSize, 64, 'tamaño de título');
    assert(/font-weight:700/.test(R.io.buildHTML()), 'peso en el export');
  });

  await test('columnas de texto en lienzo y export', async () => {
    reset(); const b = newText(); R.format.setColumns(2); await sleep(10);
    eq(richOf(b).style.columnCount, '2', 'dos columnas en el lienzo');
    assert(/column-count:2/.test(R.io.buildHTML()), 'columnas en el export');
  });

  await test('Tab en una lista anida el elemento (niveles de viñeta)', async () => {
    reset(); const b = newText(); b.html = '<ul><li>uno</li><li>dos</li></ul>'; R.render(); await sleep(10);
    const rich = richOf(b); rich.dispatchEvent(new frame.contentWindow.MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    const li = rich.querySelectorAll('li')[1]; const r = D.createRange(); r.selectNodeContents(li); r.collapse(false);
    const sel = frame.contentWindow.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    rich.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await sleep(10);
    assert(rich.querySelector('li ul, ul ul, li ol'), 'el segundo elemento queda anidado');
    rich.blur();
  });

  await test('sangría de párrafo', async () => {
    reset(); const b = newText(); R.format.indent(40); await sleep(10);
    eq(b.indent, 40, 'indent'); assert(/padding-left:40px/.test(R.io.buildHTML()), 'export');
    R.format.adjustIndent(24); eq(b.indent, 64, 'aumentar sangría');
    R.format.adjustIndent(-100); eq(b.indent, 0, 'no baja de 0');
  });

  await test('alineación vertical del cuadro de texto en el export', async () => {
    reset(); const b = newText(); R.format.setVAlign('middle');
    assert(/justify-content:center/.test(R.io.buildHTML()), 'centrado vertical');
  });

  await test('insertar símbolo en el texto', async () => {
    reset(); const b = newText(); b.html = ''; R.render(); await sleep(20);
    const rich = richOf(b); rich.contentEditable = 'true'; rich.focus();
    R.format.insertSymbol('★'); await sleep(10);
    assert((b.html || '').includes('★'), 'símbolo insertado');
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

  // ---- Slides & structure --------------------------------------------------
  await test('ocultar diapositiva: se atenúa y se excluye del export', async () => {
    reset(); R.slides.addSlide(); R.slides.toggleSlideHidden(0); await sleep(20);
    assert(R.state.deck.slides[0].hidden, 'no marcó oculta');
    assert(D.querySelector('.thumb.is-hidden'), 'la miniatura no se atenúa');
    const sections = R.io.buildHTML().match(/<section/g) || [];
    eq(sections.length, 1, 'el export debe omitir la oculta (queda 1 de 2)');
  });

  await test('secciones: crear con cabecera editable y asignación contigua', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide();
    R.slides.addSectionAt(1, 'Bloque A'); await sleep(20);
    eq(R.state.deck.sections.length, 1, 'nº de secciones');
    const head = D.querySelector('.section-head');
    assert(head && head.getAttribute('contenteditable') === 'true', 'cabecera no editable');
    eq(head.textContent, 'Bloque A', 'nombre de la sección');
    eq(R.state.deck.slides[1].sectionId, R.state.deck.sections[0].id, 'diapositiva asignada');
  });

  await test('números de diapositiva configurables en el export', async () => {
    reset(); R.state.deck.slideNumber = { show: true, position: 'tl', format: 'c/t' };
    const html = R.io.buildHTML();
    assert(/slideNumber:'c\/t'/.test(html), 'formato del número');
    assert(/\.slide-number\{[^}]*top:8px/.test(html), 'posición del número');
  });

  await test('logo de marca en el lienzo y el export', async () => {
    reset(); R.state.deck.logo = { src: 'data:image/png;base64,AAA', position: 'tl', size: 90 }; R.render(); await sleep(20);
    assert(D.querySelector('#stage .deck-logo-ovl'), 'logo en el lienzo');
    assert(/<img class="deck-logo"[^>]*height:90px/.test(R.io.buildHTML()), 'logo en el export');
  });

  await test('pie de página y bucle en el export', async () => {
    reset(); R.state.deck.footer = { show: true, text: 'Mi charla', date: false }; R.state.deck.loop = true;
    const html = R.io.buildHTML();
    assert(/<div class="deck-footer">Mi charla<\/div>/.test(html), 'pie de página');
    assert(/loop:true/.test(html), 'bucle activado');
  });

  await test('notas del orador: panel y export con vista del orador', async () => {
    reset(); R.state.ui.showNotes = true; R.render(); await sleep(20);
    assert(!D.getElementById('notes-bar').hidden, 'el panel de notas no se muestra');
    slide().notes = 'Recordar saludar';
    const html = R.io.buildHTML();
    assert(/<aside class="notes">Recordar saludar<\/aside>/.test(html), 'notas no exportadas');
    assert(/RevealNotes/.test(html), 'sin plugin de notas');
  });

  await test('cuadro de texto con relleno y borde en el export', async () => {
    reset(); const b = newText(); R.blocks.setBoxStyle({ bg: '#3f6497', borderColor: '#1e2a3a', radius: 12 });
    const html = R.io.buildHTML();
    assert(/background:#3f6497;border:2px solid #1e2a3a;border-radius:12px/.test(html), 'relleno/borde en export');
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

  await test('diseño "dos contenidos" reemplaza los bloques de la diapositiva', async () => {
    reset(); D.querySelector('[data-template="twoContent"]').click(); await sleep(10);
    eq(slide().blocks.length, 3, 'tres bloques del diseño');
  });

  await test('título del documento: editable y usado en el export', async () => {
    reset(); R.state.deck.name = 'Mi charla'; R.render();
    assert(/<title>Mi charla<\/title>/.test(R.io.buildHTML()), 'título no aplicado al export');
  });

  // ---- Canvas behaviour ----------------------------------------------------
  await test('orden de apilado: seleccionar no eleva el z-index', async () => {
    reset(); const b = newText(); await sleep(20);
    const el = D.querySelector(`.block[data-id="${b.id}"]`);
    const z = frame.contentWindow.getComputedStyle(el).zIndex;
    assert(z === 'auto' || z === '0', `z-index no debe elevarse al seleccionar (era ${z})`);
  });

  await test('Google Drive: el diálogo de configuración guarda las credenciales', async () => {
    reset(); D.querySelector('[data-action="gdrive-config"]').click(); await sleep(10);
    const m = D.getElementById('gd-modal'); assert(m, 'diálogo de configuración');
    m.querySelector('.gd-cid').value = 'test.apps.googleusercontent.com';
    m.querySelector('.gd-key').value = 'AIzaTEST';
    m.querySelector('.gd-ok').click(); await sleep(10);
    assert(R.gdrive.gdriveReady(), 'credenciales guardadas en el navegador');
  });

  await test('panel de atajos de teclado se abre y cierra', async () => {
    reset(); D.querySelector('[data-action="shortcuts"]').click(); await sleep(10);
    const m = D.getElementById('sc-modal');
    assert(m && m.querySelectorAll('.sc-table tr').length >= 10, 'lista de atajos');
    m.querySelector('.modal-close').click(); await sleep(10);
    assert(!D.getElementById('sc-modal'), 'se cierra');
  });

  await test('presentar: crea una capa a pantalla completa y se cierra', async () => {
    reset(); R.io.present(); await sleep(40);
    const ov = D.getElementById('present-overlay');
    assert(ov && ov.querySelector('iframe'), 'no se creó la capa de presentación');
    ov.querySelector('#present-close').click(); await sleep(20);
    assert(!D.getElementById('present-overlay'), 'la capa no se cerró');
  });

  await test('diálogos propios: "Nuevo" confirma con modal (no nativo)', async () => {
    reset(); R.blocks.addText(); const n = slide().blocks.length;
    D.querySelector('[data-action="new"]').click(); await sleep(20);
    assert(D.querySelector('.modal-backdrop .dlg-msg'), 'aparece el modal de confirmación');
    D.querySelector('.dlg-cancel').click(); await sleep(20);
    eq(slide().blocks.length, n, 'cancelar no cambia el proyecto');
  });

  await test('deshacer / rehacer', async () => {
    reset(); const n0 = slide().blocks.length; R.blocks.addText();
    eq(slide().blocks.length, n0 + 1, 'no se añadió'); R.store.undo();
    eq(slide().blocks.length, n0, 'undo falló'); R.store.redo();
    eq(slide().blocks.length, n0 + 1, 'redo falló');
  });

  // ---- Multi-selection -----------------------------------------------------
  await test('selección múltiple: eliminar y duplicar en grupo', async () => {
    reset(); const n0 = slide().blocks.length; R.blocks.addText(); R.blocks.addText();
    const a = slide().blocks.at(-2), b = slide().blocks.at(-1);
    R.store.setMulti([a.id, b.id]);
    eq(R.store.selectedBlocks().length, 2, 'dos seleccionados');
    R.blocks.duplicateSelected(); eq(slide().blocks.length, n0 + 4, 'duplicó los dos');
    R.blocks.deleteSelected(); eq(slide().blocks.length, n0 + 2, 'eliminó los duplicados');
  });

  await test('selección múltiple: alinear a la izquierda entre objetos', async () => {
    reset(); R.blocks.addText(); R.blocks.addText();
    const a = slide().blocks.at(-2), b = slide().blocks.at(-1);
    a.x = 100; b.x = 300; R.store.setMulti([a.id, b.id]); R.render();
    R.blocks.alignSelected('left'); eq(a.x, 100, 'a'); eq(b.x, 100, 'b al menor');
  });

  await test('selección múltiple: distribuir horizontalmente (3)', async () => {
    reset(); R.blocks.addShape('rect'); R.blocks.addShape('rect'); R.blocks.addShape('rect');
    const [a, b, c] = slide().blocks.slice(-3);
    a.w = b.w = c.w = 100; a.x = 0; b.x = 40; c.x = 400;
    R.store.setMulti([a.id, b.id, c.id]); R.blocks.distributeSelected('h');
    eq(b.x, 200, 'centro intermedio equidistante');
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
    reset(); R.i18n.setLang('es'); R.blocks.addImage('data:image/png;base64,AAA'); const b = last(); select(b);
    R.blocks.setCaption('Un gato'); R.render(); await sleep(20);
    assert(D.querySelector('#stage .caption-ovl'), 'descripción en el lienzo');
    assert(/Figura 1: Un gato/.test(R.io.buildHTML()), 'descripción en el export');
  });

  await test('índice: solo tablas', async () => {
    reset(); R.i18n.setLang('es');
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
    assert(/<a class="slide-zoom" href="#\/0"/.test(html), 'enlace a la diapositiva destino');
    assert(/DESTINO/.test(html), 'miniatura con el contenido de la diapositiva');
    b.returnBack = true;
    const html2 = R.io.buildHTML();
    assert(/data-zoom-return="1"/.test(html2) && /slidechanged/.test(html2), 'opción de volver + script');
  });

  await test('índice de figuras lista figuras y tablas', async () => {
    reset(); R.i18n.setLang('es');
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

  await test('LaTeX en línea ($…$) en el texto se renderiza en el export', async () => {
    reset(); const b = newText(); b.html = 'Energía: $E=mc^2$'; R.render();
    const html = R.io.buildHTML();
    assert(/auto-render\.min\.js/.test(html), 'auto-render de KaTeX incluido');
    assert(/renderMathInElement/.test(html), 'inicialización de math en línea');
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
    assert(/<code class="language-javascript">const x = 1;<\/code>/.test(html), 'export del código');
    assert(/plugin\/highlight\/highlight\.js/.test(html) && /RevealHighlight/.test(html), 'plugin de resaltado de reveal');
  });

  await test('código: animación por líneas (data-line-numbers) en el export', async () => {
    reset(); R.blocks.addCode(); const b = last(); select(b);
    R.blocks.setCode({ lineSteps: '1|2-3', lang: 'javascript' });
    assert(/data-line-numbers="1\|2-3"/.test(R.io.buildHTML()), 'data-line-numbers con pasos');
  });

  await test('copiar y pegar formato entre cuadros de texto', async () => {
    reset(); R.blocks.addText(); R.blocks.addText();
    const a = slide().blocks.at(-2), b = slide().blocks.at(-1);
    a.fontSize = 66; a.textAlign = 'center'; a.bullet = 'square';
    R.state.ui.selection = a.id; R.format.copyStyle();
    R.state.ui.selection = b.id; R.state.ui.multi = [b.id]; R.format.pasteStyle();
    eq(b.fontSize, 66, 'tamaño copiado'); eq(b.textAlign, 'center', 'alineación'); eq(b.bullet, 'square', 'viñeta');
  });

  await test('insertar campo de fecha', async () => {
    reset(); const n0 = slide().blocks.length; D.querySelector('[data-action="insert-date"]').click(); await sleep(10);
    eq(slide().blocks.length, n0 + 1, 'se añadió un bloque de fecha');
    assert(/\d/.test(slide().blocks.at(-1).html || ''), 'contiene la fecha');
  });

  await test('Text Art (WordArt) aplica estilo en lienzo y export', async () => {
    reset(); R.blocks.addWordArt('gradient'); const b = last(); select(b); await sleep(20);
    eq(b.wordart, 'gradient', 'preset guardado');
    const rich = richOf(b);
    assert(/text/.test(rich.style.webkitBackgroundClip || rich.style.backgroundClip || ''), 'clip de texto en el lienzo');
    assert(/-webkit-background-clip:text|background-clip:text/.test(R.io.buildHTML()), 'wordart en el export');
  });

  await test('enlaces: normaliza diapositiva y correo', async () => {
    eq(R.format.normalizeLink('3'), '#/2', 'nº de diapositiva');
    eq(R.format.normalizeLink('a@b.com'), 'mailto:a@b.com', 'correo');
    eq(R.format.normalizeLink('https://x.com'), 'https://x.com', 'URL intacta');
  });

  await test('estilo de viñeta y lista numerada por cuadro en el export', async () => {
    reset(); const b = newText(); R.format.setBullet('square'); R.format.setNumStyle('lower-roman');
    const html = R.io.buildHTML();
    assert(/--bullet:square/.test(html), '--bullet'); assert(/--num:lower-roman/.test(html), '--num');
  });

  await test('aplicar fondo a todas las diapositivas', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide();
    slide().background = '#123456';
    D.querySelector('[data-action="bg-all"]').click();
    assert(R.state.deck.slides.every(s => s.background === '#123456'), 'todas con el mismo fondo');
  });

  await test('dirección RTL del texto en el export', async () => {
    reset(); const b = newText(); R.format.toggleDir();
    assert(/direction:rtl/.test(R.io.buildHTML()), 'direction:rtl en el export');
  });

  await test('texto vertical en el export', async () => {
    reset(); const b = newText(); R.format.toggleVertical();
    assert(/writing-mode:vertical-rl/.test(R.io.buildHTML()), 'writing-mode vertical');
  });

  await test('tabla con fila de encabezado', async () => {
    reset(); R.blocks.addTable(); const b = last(); select(b); R.blocks.tableToggleHeader();
    assert(b.header, 'bandera header'); assert(/class="tbl has-header"/.test(R.io.buildHTML()), 'clase has-header');
  });

  await test('buscar y reemplazar respeta el formato (nodos de texto)', async () => {
    reset(); const b = newText();
    b.html = 'Hola <b>mundo</b> y mundo'; R.render();
    eq(R.search.countMatches('mundo', true), 2, 'cuenta coincidencias');
    const n = R.search.replaceAll('mundo', 'planeta', true);
    eq(n, 2, 'reemplazos'); eq(b.html, 'Hola <b>planeta</b> y planeta', 'conserva el <b>');
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

  await test('PWA: manifiesto, iconos y service worker', async () => {
    const link = D.querySelector('link[rel="manifest"]'); assert(link, 'enlace al manifiesto');
    const m = await (await fetch(new URL(link.getAttribute('href'), D.baseURI))).json();
    eq(m.display, 'standalone', 'se instala como app');
    for (const ic of m.icons) assert((await fetch(new URL(ic.src, new URL(link.getAttribute('href'), D.baseURI)))).ok, 'icono ' + ic.src);
    assert(m.icons.some(i => i.sizes === '512x512') && m.icons.some(i => i.purpose === 'maskable'), 'iconos 512 y maskable');
    const sw = await (await fetch(new URL('sw.js', D.baseURI))).text();
    assert(/addEventListener\('fetch'/.test(sw), 'service worker con fetch');
    assert(!/googleapis\.com\/drive|accounts\.google/.test(sw), 'no toca Drive ni el inicio de sesión');
  });

  await test('colores del tema: cambiar la paleta recolorea lo que venía de ella', async () => {
    reset(); const P = R.palettes;
    R.blocks.addShape('rect'); const sh = last(); sh.fill = '#3f6497'; sh.stroke = '#123123';   // acento 1 / color propio
    const tx = slide().blocks[0]; tx.html = '<span style="color:#e0873b">x</span>';             // acento 2 en el texto
    D.querySelector('[data-palettes-open]').click(); await sleep(10);
    eq(D.querySelectorAll('.popover [data-palette]').length, Object.keys(P.PALETTES).length, 'muestras de paletas');
    D.querySelector('.popover [data-palette="office"]').click(); await sleep(20);
    const o = P.PALETTES.office;
    eq(slide().background, o.bg, 'fondo de la paleta');
    eq(sh.fill, o.accents[0], 'acento 1 → acento 1'); eq(sh.stroke, '#123123', 'color propio intacto');
    assert(tx.html.includes(o.accents[1]), 'color de texto de la paleta');
    eq(P.deckFg(), o.fg, 'texto del tema');
    eq(getComputedStyle(D.getElementById('stage')).color, 'rgb(31, 31, 31)', 'el lienzo usa el color del tema');
    assert(R.io.buildHTML().includes('color:' + o.fg), 'export con el color del tema');
    eq(D.querySelector('#theme-swatches').options.length, 8, 'muestras en los selectores');
    eq(D.querySelector('[data-shape-fill]').getAttribute('list'), 'theme-swatches', 'selector enlazado');
    P.applyPalette('revela'); eq(sh.fill, '#3f6497', 'vuelta atrás'); eq(slide().background, '#101317', 'fondo original');
    P.setDeckTextColor('#ff0000'); eq(P.deckFg(), '#ff0000', 'color de texto propio');
  });

  await test('fuentes del tema: títulos y cuerpo', async () => {
    reset(); const s0 = slide(); s0.blocks[1].fontSize = 30;
    R.palettes.applyFontPair('modern'); await sleep(10);
    assert(/Montserrat/.test(s0.blocks[0].fontFamily), 'título → fuente de títulos');
    assert(/Open Sans/.test(s0.blocks[1].fontFamily), 'subtítulo pequeño → cuerpo');
    assert(/Open Sans/.test(D.getElementById('stage').style.fontFamily), 'cuerpo por defecto en el lienzo');
    const html = R.io.buildHTML();
    assert(/family=Montserrat/.test(html) && /family=Open\+Sans/.test(html), 'fuentes incrustadas');
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

  await test('animación: después de la anterior y con la anterior (línea de tiempo)', async () => {
    reset(); const [a, b] = slide().blocks; R.blocks.addShape('rect'); const c = last();
    for (const x of [a, b, c]) { select(x); R.trans.setAnimation('fade-in'); }
    R.trans.setAnimPropForId(a.id, 'duration', 400);
    R.trans.setAnimPropForId(b.id, 'start', 'afterPrev'); R.trans.setAnimPropForId(b.id, 'delay', 100);
    R.trans.setAnimPropForId(c.id, 'start', 'withPrev');
    eq(a.animation.order, 1); eq(b.animation.order, 1, 'misma pulsación'); eq(c.animation.order, 1);
    const tl = R.trans.animTimeline(slide());
    eq(tl.get(b.id).delay, 500, 'empieza al acabar la anterior + retardo');
    eq(tl.get(c.id).delay, 400, 'con la anterior: arranca con ella (su retardo no se hereda, como en PowerPoint)');
    const html = R.io.buildHTML();
    eq((html.match(/data-fragment-index="1"/g) || []).length, 3, 'un solo clic');
    assert(/transition-delay:500ms/.test(html), 'retardo efectivo en el export');
  });

  await test('animación: el giro no anula el movimiento del efecto en el export', async () => {
    reset(); const b = slide().blocks[0]; b.rotation = 15; select(b); R.trans.setAnimation('fade-up');
    const html = R.io.buildHTML();
    assert(/rotate:15deg;/.test(html), 'rotate individual');
    assert(!/transform:rotate\(15deg\)/.test(html), 'sin transform en línea que pise al efecto');
  });

  await test('trayectoria de movimiento: export y guía en el lienzo', async () => {
    reset(); const b = slide().blocks[0]; select(b); R.trans.setAnimation('path');
    eq(b.animation.dx, 200, 'desplazamiento por defecto');
    R.trans.setAnimPropForId(b.id, 'dy', 50); await sleep(10);
    const html = R.io.buildHTML();
    assert(/class="fragment rv-path"/.test(html), 'fragmento de trayectoria');
    assert(/--dx:200px;--dy:50px/.test(html), 'destino');
    assert(/\.fragment\.rv-path\.visible\{translate:var\(--dx\) var\(--dy\)\}/.test(html), 'CSS de trayectoria');
    assert(D.querySelector('#stage .motion-path polyline'), 'guía discontinua en el lienzo');
    R.trans.setAnimPropForId(b.id, 'pathShape', 'arc'); await sleep(10);
    const pts = R.trans.motionPoints(b.animation); eq(pts.at(-1).join(','), '200,50', 'termina en el destino');
    assert(pts.some(([x, y]) => Math.abs(y - x / 4) > 20), 'el arco se separa de la recta');
    const html2 = R.io.buildHTML();
    assert(/class="fragment rv-pathc"/.test(html2) && new RegExp('@keyframes rvP' + b.id).test(html2), 'fotogramas clave del recorrido curvo');
  });

  await test('disparador: al hacer clic en un objeto se anima otro', async () => {
    reset(); const [a, b] = slide().blocks; select(b); R.trans.setAnimation('zoom-in');
    R.trans.setAnimPropForId(b.id, 'trigger', a.id);
    eq(R.trans.animTimeline(slide()).size, 0, 'fuera de la secuencia de clics');
    const html = R.io.buildHTML();
    assert(html.includes(`data-bid="${a.id}"`), 'origen clicable');
    assert(new RegExp(`class="rv-trig rv-in" data-trig="${a.id}" data-kf="rvZoom"`).test(html), 'destino con disparador');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.srcdoc = html; document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    try {
      const tgt = f.contentDocument.querySelector('.rv-trig');
      eq(w.getComputedStyle(tgt).opacity, '0', 'oculto al principio');
      f.contentDocument.querySelector(`[data-bid="${a.id}"]`).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      assert(tgt.classList.contains('on') && /rvZoom/.test(tgt.style.animation), 'se reproduce al hacer clic');
    } finally { f.remove(); }
  });

  await test('copiar animación (pincel)', async () => {
    reset(); const [a, b] = slide().blocks; select(a); R.trans.setAnimation('spin');
    R.trans.setAnimPropForId(a.id, 'duration', 900);
    D.querySelector('[data-action="anim-paint"]').click();
    assert(D.body.classList.contains('anim-painting'), 'modo pincel');
    D.querySelector(`#stage .block[data-id="${b.id}"]`).click(); await sleep(10);
    eq(b.animation?.effect, 'spin', 'efecto copiado'); eq(b.animation.duration, 900, 'duración copiada');
    eq(b.animation.order, 2, 'nuevo paso');
    assert(!D.body.classList.contains('anim-painting'), 'sale del modo');
  });

  await test('dibujar: lápiz, resaltador y borrador sobre la diapositiva', async () => {
    reset(); const W = frame.contentWindow, st = D.getElementById('stage');
    D.querySelector('[data-tab="draw"]').click();
    D.querySelector('[data-draw="pen"]').click(); await sleep(10);
    eq(R.state.ui.drawTool, 'pen', 'lápiz activo'); assert(st.classList.contains('drawing'), 'cursor de dibujo');
    const r = st.getBoundingClientRect(), f = r.width / R.state.deck.size.w;
    const at = (x, y) => ({ clientX: r.left + x * f, clientY: r.top + y * f, bubbles: true, pointerId: 1 });
    const n0 = slide().blocks.length;
    st.dispatchEvent(new W.PointerEvent('pointerdown', at(100, 600)));
    W.dispatchEvent(new W.PointerEvent('pointermove', at(200, 650)));
    W.dispatchEvent(new W.PointerEvent('pointermove', at(300, 600)));
    W.dispatchEvent(new W.PointerEvent('pointerup', at(300, 600))); await sleep(20);
    eq(slide().blocks.length, n0 + 1, 'trazo creado');
    const ink = last(); eq(ink.type, 'ink', 'objeto de tinta'); eq(ink.points.length, 3, 'tres puntos');
    assert(Math.abs(ink.x - 100 + 4) <= 1 && ink.w >= 200, 'caja ajustada al trazo');
    assert(D.querySelector(`.block[data-id="${ink.id}"] .ink-blk path`), 'en el lienzo');
    assert(/stroke-linecap="round"/.test(R.io.buildHTML()), 'en el export');
    D.querySelector('[data-draw="hl"]').click();
    st.dispatchEvent(new W.PointerEvent('pointerdown', at(500, 100)));
    W.dispatchEvent(new W.PointerEvent('pointermove', at(700, 100)));
    W.dispatchEvent(new W.PointerEvent('pointerup', at(700, 100))); await sleep(20);
    assert(last().hl && last().width >= 14, 'resaltador ancho y translúcido');
    D.querySelector('[data-draw="eraser"]').click(); await sleep(10);
    st.dispatchEvent(new W.PointerEvent('pointerdown', at(200, 580))); W.dispatchEvent(new W.PointerEvent('pointerup', at(200, 580))); await sleep(20);
    assert(slide().blocks.some(b => b.id === ink.id), 'lejos del trazo (aunque dentro de su caja) no borra');
    st.dispatchEvent(new W.PointerEvent('pointerdown', at(100, 600))); W.dispatchEvent(new W.PointerEvent('pointerup', at(100, 600))); await sleep(20);
    assert(!slide().blocks.some(b => b.id === ink.id), 'borrador elimina el trazo');
    D.querySelector('[data-draw=""]').click(); eq(R.state.ui.drawTool, null, 'volver a seleccionar');
    D.querySelector('[data-tab="home"]').click();
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

  await test('ensayar intervalos: cronometra y guarda el avance automático', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.slides.toggleSlideHidden(1);
    R.state.deck.slides[0].autoSlide = 9000;
    R.io.present({ rehearse: true }); await sleep(10);
    const ov = D.getElementById('present-overlay'); assert(ov, 'presentación abierta');
    assert(D.getElementById('rehearse-clock'), 'reloj de ensayo');
    const html = await (await fetch(ov.querySelector('iframe').src)).text();
    assert(!/data-autoslide/.test(html), 'sin avance automático mientras se ensaya');
    D.getElementById('present-close').click(); await sleep(10);
    D.querySelector('.modal-backdrop .modal button:not(.modal-close)')?.click?.();   // cierra el diálogo si lo hay
    R.io.applyRehearsal([3400, 12600]);
    eq(R.state.deck.slides[0].autoSlide, 3000, 'primera: 3 s');
    eq(R.state.deck.slides[1].autoSlide ?? 0, 0, 'oculta: sin cambios');
    eq(R.state.deck.slides[2].autoSlide, 13000, 'segunda visible: 13 s');
  });

  await test('transición: salida distinta, velocidad por diapositiva y aplicar a todas', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0);
    R.trans.setSlideTransition('fade');
    D.querySelector('[data-slide-trans-out]').value = 'zoom'; D.querySelector('[data-slide-trans-out]').dispatchEvent(new Event('change'));
    D.querySelector('[data-slide-speed]').value = 'slow'; D.querySelector('[data-slide-speed]').dispatchEvent(new Event('change'));
    const html = R.io.buildHTML();
    assert(/<section data-transition="fade-in zoom-out" data-transition-speed="slow"/.test(html), 'entrada/salida y velocidad');
    R.trans.applyTransitionToAll();
    const s2 = R.state.deck.slides[1];
    eq([s2.transition, s2.transitionOut, s2.transitionSpeed].join(','), 'fade,zoom,slow', 'copiada a todas');
  });

  await test('espaciado inteligente: iguala la separación con los vecinos', async () => {
    reset(); R.state.ui.snap = true; slide().blocks = [];
    const mk = x => { R.blocks.addShape('rect'); const b = last(); Object.assign(b, { x, y: 300, w: 100, h: 100 }); return b; };
    mk(100); mk(300); const c = mk(560); R.state.ui.selection = null; R.render(); await sleep(10);
    const W = frame.contentWindow, el = D.querySelector(`.block[data-id="${c.id}"]`);
    const f = el.getBoundingClientRect().width / 100;
    const r = el.getBoundingClientRect(), x0 = r.left + 10, y0 = r.top + 10;
    el.dispatchEvent(new W.PointerEvent('pointerdown', { clientX: x0, clientY: y0, bubbles: true, pointerId: 1 }));
    el.dispatchEvent(new W.PointerEvent('pointermove', { clientX: x0 - 63 * f, clientY: y0, bubbles: true, pointerId: 1 }));
    eq(c.x, 500, 'hueco igual (100 px) tras el segundo');
    eq(D.querySelectorAll('#stage .guide.spacing.x').length, 2, 'dos marcas de distancia');
    eq([...D.querySelectorAll('#stage .guide.spacing')].map(g => g.dataset.gap).join(','), '100,100', 'mismas distancias');
    el.dispatchEvent(new W.PointerEvent('pointerup', { clientX: x0 - 63 * f, clientY: y0, bubbles: true, pointerId: 1 }));
    assert(!D.querySelector('#stage .guide'), 'marcas retiradas al soltar');
    R.state.ui.showGuides = true; slide().blocks = [c]; c.x = 250; R.render(); await sleep(10);
    const el2 = D.querySelector(`.block[data-id="${c.id}"]`), r2 = el2.getBoundingClientRect();
    el2.dispatchEvent(new W.PointerEvent('pointerdown', { clientX: r2.left + 5, clientY: r2.top + 5, bubbles: true, pointerId: 1 }));
    el2.dispatchEvent(new W.PointerEvent('pointermove', { clientX: r2.left + 5 + 3 * f, clientY: r2.top + 5, bubbles: true, pointerId: 1 }));
    eq(c.x, 256, 'se ajusta a la cuadrícula (1280/10 × 2)');
    el2.dispatchEvent(new W.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    R.state.ui.showGuides = false; R.render();
  });

  await test('accesibilidad del editor: nombres, anuncio, Tab y orden de lectura', async () => {
    reset(); const [a, b] = slide().blocks; const st = D.getElementById('stage');
    eq(st.getAttribute('aria-label'), 'Diapositiva 1 / 1', 'la diapositiva tiene nombre');
    assert(/^Texto: Título/.test(D.querySelector(`.block[data-id="${a.id}"]`).getAttribute('aria-label')), 'objeto con nombre accesible');
    st.focus(); D.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    eq(R.state.ui.selection, a.id, 'Tab selecciona el primer objeto');
    D.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    eq(R.state.ui.selection, b.id, 'Tab pasa al siguiente'); await sleep(10);
    assert(/^Seleccionado: Texto: Subtítulo/.test(D.getElementById('sr-status').textContent), 'anuncio para lectores de pantalla');
    D.querySelector('[data-action="reading-order"]').click(); await sleep(10);
    eq(D.querySelectorAll('#ro-modal .ro-item').length, 2, 'lista del orden de lectura');
    D.querySelectorAll('#ro-modal .ro-item')[1].querySelector('[data-d="-1"]').click(); await sleep(10);
    eq(slide().blocks[0].id, b.id, 'subir cambia el orden');
    D.querySelector('#ro-modal .modal-close').click();
  });

  await test('texto alternativo y decorativo en el export', async () => {
    reset(); R.blocks.addChart(); const c = last(); select(c); R.blocks.setAlt('Ventas por trimestre');
    R.blocks.addShape('star'); const sh = last(); select(sh); R.blocks.setAlt('', true);
    const html = R.io.buildHTML();
    assert(/role="img" aria-label="Ventas por trimestre"/.test(html), 'gráfico con nombre');
    assert(/aria-hidden="true"/.test(html), 'forma decorativa oculta a lectores');
    assert(!R.a11y.checkAccessibility().some(x => x.kind === 'alt'), 'sin avisos de texto alternativo');
    R.blocks.addIcon('star'); assert(R.a11y.checkAccessibility().some(x => x.kind === 'alt'), 'icono sin alt → aviso');
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

  await test('patrón de diapositivas: objetos en todas, ocultar por diapositiva', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0);
    D.querySelector('[data-action="master-edit"]').click(); await sleep(10);
    assert(R.state.ui.editMaster && !D.getElementById('master-banner').hidden, 'modo patrón con aviso');
    R.blocks.addShape('rect'); const m = last(); m.fill = '#ff00aa';
    eq(R.state.deck.master.blocks.length, 1, 'la forma va al patrón');
    eq(R.state.deck.slides[0].blocks.length, 2, 'la diapositiva no cambia');
    D.querySelector('#master-banner [data-action="master-close"]').click(); await sleep(10);
    assert(!R.state.ui.editMaster, 'cerrar patrón');
    assert(D.querySelector('#stage .master-layer .pv-block'), 'se dibuja bajo la diapositiva');
    eq((R.io.buildHTML().match(/fill="#ff00aa"/g) || []).length, 2, 'en las dos diapositivas del export');
    R.master.toggleHideMaster(1);
    eq((R.io.buildHTML().match(/fill="#ff00aa"/g) || []).length, 1, 'oculto en la segunda');
    R.store.undo(); R.store.undo(); R.render();
  });

  await test('marcadores de posición: aviso vacío, se omiten al exportar y el diseño conserva el texto', async () => {
    reset(); slide().blocks[0].html = 'Mi título'; slide().blocks[1].html = 'Mi texto';
    D.querySelector('[data-template="twoContent"]').click(); await sleep(10);
    const [ti, b1, b2] = slide().blocks;
    eq(ti.ph, 'title', 'marcador de título'); eq(ti.html, 'Mi título', 'el título pasa al marcador');
    eq(b1.html, 'Mi texto', 'el texto pasa al primer contenido'); eq(b2.html, '', 'segundo contenido vacío');
    const rich = D.querySelector(`.block[data-id="${b2.id}"] .rich`);
    eq(rich.dataset.ph, 'Haz clic para añadir texto', 'aviso del marcador');
    assert(getComputedStyle(rich, '::before').content.includes('Haz clic'), 'se ve el aviso');
    const html = R.io.buildHTML();
    assert(html.includes('Mi título') && html.includes('Mi texto'), 'contenido exportado');
    eq((html.match(/Haz clic para/g) || []).length, 0, 'los avisos no se exportan');
    const sec = html.split('<section')[1];
    eq((sec.match(/<div[^>]*font-size:28px/g) || []).length, 1, 'el marcador vacío no se exporta');
  });

  await test('galería de plantillas: presentaciones completas', async () => {
    reset(); D.querySelector('[data-action="gallery"]').click(); await sleep(20);
    eq(D.querySelectorAll('#gallery-modal .gal-item').length, Object.keys(R.gallery.GALLERY).length, 'una miniatura por plantilla');
    D.querySelector('#gallery-modal .modal-close').click();
    const deck = R.gallery.buildFromGallery('tech');
    eq(deck.slides.length, 5, 'cinco diapositivas de arranque'); eq(deck.palette, 'midnight', 'paleta');
    assert(deck.master.blocks.length && deck.master.blocks.every(b => b.decorative), 'decoración en el patrón, decorativa');
    assert(deck.slides.every(s => s.blocks.some(b => b.ph === 'title')), 'cada diapositiva con marcador de título');
    R.store.replaceDeck(deck); await sleep(10);
    const html = R.io.buildHTML();
    assert(/family=Space\+Grotesk/.test(html), 'fuentes del tema incrustadas');
    eq((html.match(/<section/g) || []).length, 5, 'cinco diapositivas exportadas');
    assert(!/Haz clic para/.test(html), 'sin avisos de marcador');
  });

  await test('ideas de diseño: composiciones con el contenido de la diapositiva', async () => {
    reset(); slide().blocks[0].html = 'Título'; slide().blocks[1].html = 'Texto';
    R.blocks.addImage('data:image/gif;base64,R0lGODlhAQABAAAAACw='); const img = last();
    const ideas = R.designer.designIdeas();
    eq(ideas.map(i => i.name).join('|'), 'Clásica|Visual a la derecha|Visual a la izquierda|Visual de fondo|Centrada', 'cinco ideas');
    D.querySelector('[data-action="design-ideas"]').click(); await sleep(20);
    eq(D.querySelectorAll('#ideas-modal .gal-item').length, 5, 'miniaturas de las ideas');
    D.querySelectorAll('#ideas-modal .gal-item')[1].click(); await sleep(10);
    assert(img.x >= 640 || slide().blocks.find(b => b.id === img.id).x >= 640, 'imagen a la derecha');
    R.designer.applyIdea(R.designer.designIdeas()[3]); await sleep(10);
    eq(slide().blocks[0].id, img.id, 'imagen de fondo al fondo');
    eq(slide().blocks[0].w, 1280, 'a sangre');
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

  await test('navegador: las miniaturas no se aplastan con muchas diapositivas', async () => {
    reset(); for (let i = 0; i < 40; i++) R.slides.addSlide(); await sleep(20);
    const th = [...D.querySelectorAll('#navigator .thumb')];
    eq(th.length, 41, 'cuarenta y una miniaturas');
    assert(th.every(x => x.getBoundingClientRect().height > 40), 'altura normal: ' + th[20].getBoundingClientRect().height.toFixed(0));
  });

  await test('autocorrección al escribir (y se puede desactivar)', async () => {
    reset(); const b = slide().blocks[1]; const el = D.querySelector(`.block[data-id="${b.id}"]`);
    el.dispatchEvent(new frame.contentWindow.MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    const rich = el.querySelector('.rich'); rich.textContent = 'a -';
    const put = () => { const r = D.createRange(); r.selectNodeContents(rich); r.collapse(false); const s = D.getSelection(); s.removeAllRanges(); s.addRange(r); };
    put(); D.execCommand('insertText', false, '>');
    eq(rich.textContent, 'a →', '-> se convierte en flecha'); eq(b.html, 'a →', 'guardado en el modelo');
    D.execCommand('insertText', false, ' (c)'); eq(rich.textContent, 'a → ©', '(c) → ©');
    D.execCommand('insertText', false, ' 11/2'); assert(rich.textContent.endsWith('11/2'), 'no toca 11/2');
    D.querySelector('[data-action="autocorrect"]').click();
    D.execCommand('insertText', false, ' --'); assert(rich.textContent.endsWith('--'), 'desactivada no sustituye');
    D.querySelector('[data-action="autocorrect"]').click();
    rich.blur();
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

  await test('API pública, complementos y macros', async () => {
    reset(); const W = frame.contentWindow, A = W.Revela;
    assert(A && A.version === 1, 'window.Revela disponible');
    const id = A.add.shape('ellipse', { x: 10, y: 20, w: 30, h: 40 });
    eq(A.get(id).w, 30, 'añadir con caja'); A.update(id, { fill: '#123456' }); eq(A.get(id).fill, '#123456', 'actualizar');
    let changes = 0; const off = A.on('change', () => changes++); A.slides.add(); off();
    assert(changes > 0, 'evento de cambio'); eq(A.slides.count(), 2, 'diapositivas');
    const r = await R.api.runMacro('Revela.slides.goTo(0); return Revela.deck().slides.length;');
    eq(r, 2, 'macro con resultado');
    const src = "export default R => R.ui.addButton({ id: 'saluda', label: 'Saluda', icon: 'waving_hand', onClick: R => R.add.text('desde complemento') });";
    const url = W.URL.createObjectURL(new W.Blob([src], { type: 'text/javascript' }));
    await R.api.addPlugin(url);
    const btn = D.querySelector('#plugin-buttons [data-plugin="saluda"]');
    assert(btn && !btn.closest('.group').hidden, 'botón del complemento en la cinta');
    btn.click(); await sleep(10);
    eq(last().html, 'desde complemento', 'el complemento actúa');
    assert(R.api.pluginList().includes(url), 'complemento recordado'); R.api.removePlugin(url);
    R.api.saveMacro('prueba', 'return 1'); assert(R.api.macroList().some(m => m.name === 'prueba'), 'macro guardada'); R.api.deleteMacro('prueba');
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

  await test('transiciones nuevas: voltear, empujar, barrido, elevar', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0); R.trans.setSlideTransition('flip');
    R.slides.goToSlide(1); R.trans.setSlideTransition('wipe');
    const html = R.io.buildHTML();
    assert(/section\[data-transition=flip\]\.past/.test(html), 'CSS de voltear');
    assert(/clip-path:inset\(0 0 0 100%\)/.test(html), 'CSS de barrido');
    assert(!/data-transition=rise\]/.test(html), 'solo las usadas');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    try {
      const secs = f.contentDocument.querySelectorAll('.slides>section');
      assert(/clip-path|inset/.test(w.getComputedStyle(secs[1]).clipPath), 'la siguiente espera recortada (barrido)');
      w.Reveal.next(); await sleep(50);
      assert(w.getComputedStyle(secs[0]).transform !== 'none', 'la anterior sale volteada');
    } finally { f.remove(); }
  });

  await test('IA con OpenRouter: inicio de sesión PKCE y funciones (respuestas simuladas)', async () => {
    reset(); const W = frame.contentWindow, AI = R.ai, realFetch = W.fetch, calls = [];
    eq(await AI.pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', 'reto PKCE (vector del RFC 7636)');
    let answer = '';
    W.fetch = async (url, opts) => {
      calls.push({ url, opts, body: JSON.parse(opts.body) });
      if (url.endsWith('/auth/keys')) return new W.Response(JSON.stringify({ key: 'sk-or-prueba' }));
      return new W.Response(JSON.stringify({ choices: [{ message: { content: answer } }] }));
    };
    try {
      AI.disconnectAi(); W.sessionStorage.setItem('revela.ai.pkce', 'verificador');
      const ok = await AI.finishOpenRouterLogin({ search: '?test&code=CODIGO', pathname: W.location.pathname, hash: '' });
      assert(ok && AI.aiConnected(), 'código canjeado por la clave');
      eq(calls[0].body.code, 'CODIGO', 'envía el código'); eq(calls[0].body.code_verifier, 'verificador', 'y el verificador');
      assert(!/code=/.test(W.location.search), 'el código se quita de la URL');
      answer = JSON.stringify({ slides: [{ title: 'Uno <b>', bullets: ['a', 'b'], notes: 'n1' }, { title: 'Dos', bullets: ['c'], notes: 'n2' }] });
      const n0 = R.state.deck.slides.length;
      eq(await AI.generateSlides('Volcanes', 2), 2, 'dos diapositivas generadas');
      eq(R.state.deck.slides.length, n0 + 2, 'insertadas'); const g = R.state.deck.slides[1];
      eq(g.blocks[0].html, 'Uno &lt;b&gt;', 'título escapado'); eq(g.blocks[1].html, '<ul><li>a</li><li>b</li></ul>', 'viñetas'); eq(g.notes, 'n1', 'notas');
      const c = calls.at(-1);
      eq(c.opts.headers.Authorization, 'Bearer sk-or-prueba', 'clave'); eq(c.opts.headers['X-Title'], 'Revela', 'atribución a Revela');
      assert(/fmesasc\.github\.io\/revela/.test(c.opts.headers['HTTP-Referer']), 'referer de la app');
      R.slides.goToSlide(1); select(slide().blocks[1]); answer = '- corto\n- claro';
      await AI.rewriteSelected('shorter'); eq(slide().blocks[1].html, '<ul><li>corto</li><li>claro</li></ul>', 'reescritura');
      answer = 'Explica esto.'; await AI.writeNotes(); eq(slide().notes, 'Explica esto.', 'notas del orador');
      R.blocks.addImage('data:image/gif;base64,R0lGODlhAQABAAAAACw='); answer = '"Un punto"';
      await AI.describeImage(); eq(last().alt, 'Un punto', 'texto alternativo');
      eq(calls.at(-1).body.messages[1].content[1].type, 'image_url', 'envía la imagen');
      W.fetch = async () => new W.Response('x', { status: 402 });
      let err = ''; try { await AI.writeNotes(); } catch (e) { err = e.message; } eq(err, 'NO_CREDIT', 'sin saldo');
    } finally { W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('botón de apoyo con el enlace de PayPal', async () => {
    const a = D.getElementById('donate');
    assert(a && !a.hidden, 'visible'); eq(a.href, 'https://paypal.me/fmesasc', 'enlace'); eq(a.target, '_blank', 'nueva pestaña');
    eq(a.rel, 'noopener', 'sin acceso a la ventana de origen');
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

  await test('comentarios: añadir, responder, resolver, marcas y menciones', async () => {
    reset(); const C = R.comments; C.setAuthor('Ana');
    D.querySelector('[data-action="comments"]').click(); await sleep(10);
    assert(D.getElementById('comments-panel'), 'panel abierto');
    const b = slide().blocks[0]; select(b);
    const id = C.addComment('Revisa esto @Luis'); await sleep(10);
    const c = C.commentsOf()[0]; eq(c.author, 'Ana', 'autor'); eq(c.blockId, b.id, 'anclado al objeto');
    eq(C.mentions(c.text).join(), 'Luis', 'mención');
    assert(D.querySelector('#comments-panel .cm-at'), 'mención resaltada');
    eq(D.querySelector(`.block[data-id="${b.id}"] .cm-badge`)?.textContent, '1', 'marca en el objeto');
    assert(/💬 1/.test(D.querySelector('#navigator .thumb .thumb-cm')?.textContent || ''), 'contador en la miniatura');
    C.reply(id, 'Hecho'); eq(C.commentsOf()[0].replies[0].text, 'Hecho', 'respuesta');
    C.setResolved(id); await sleep(10);
    assert(!D.querySelector(`.block[data-id="${b.id}"] .cm-badge`), 'resuelto: sin marca');
    assert(!D.querySelector('#comments-panel .cm-item'), 'oculto si no se muestran los resueltos');
    assert(/"comments"/.test(JSON.stringify(R.state.deck)), 'viaja con el proyecto');
    C.deleteComment(id); eq(C.commentsOf().length, 0, 'eliminado');
    D.querySelector('[data-action="comments"]').click();
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

  await test('IA: generar imagen y traducir la presentación (respuestas simuladas)', async () => {
    reset(); const W = frame.contentWindow, AI = R.ai, realFetch = W.fetch, calls = [];
    AI.setAiKey('sk-or-prueba');
    W.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body); calls.push({ url, body });
      if (url.endsWith('/images')) return new W.Response(JSON.stringify({ data: [{ b64_json: 'R0lGODlhAQABAAAAACw=', media_type: 'image/gif' }] }));
      const items = JSON.parse(body.messages[1].content);
      const tr = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.replace('Título', 'Title').replace('Nota', 'Note').replace('celda', 'cell')]));
      return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(tr) } }] }));
    };
    try {
      await AI.generateImage('Un volcán al amanecer', '16:9');
      const img = last(); eq(img.type, 'image', 'imagen insertada'); eq(img.src, 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', 'datos');
      eq(Math.round(img.w / img.h * 9), 16, 'proporción 16:9'); eq(img.alt, 'Un volcán al amanecer', 'alt con la descripción');
      eq(calls[0].body.aspect_ratio, '16:9', 'pide la proporción');
      slide().blocks[0].html = '<b>Título</b>'; slide().notes = 'Nota';
      R.blocks.addTable(); last().rows[0][0] = 'celda';
      const n = await AI.translateDeck('English');
      eq(slide().blocks[0].html, '<b>Title</b>', 'traduce conservando el formato'); eq(slide().notes, 'Note', 'notas');
      eq(last().rows[0][0], 'cell', 'celdas de tabla'); assert(n >= 3, 'recuento');
      R.store.undo(); eq(slide().blocks[0].html, '<b>Título</b>', 'un solo paso de deshacer');
    } finally { W.fetch = realFetch; AI.disconnectAi(); }
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

  await test('IA avanzada: presentación completa, mejorar, agenda, preguntas y asistente', async () => {
    reset(); const W = frame.contentWindow, A = R.aiDeck, realFetch = W.fetch, calls = []; let answer = {};
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    W.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body); calls.push({ url, body });
      if (url.endsWith('/images')) return new W.Response(JSON.stringify({ data: [{ b64_json: 'R0lGODlhAQABAAAAACw=', media_type: 'image/gif' }] }));
      return new W.Response(JSON.stringify({ choices: [{ message: { content: '```json\n' + JSON.stringify(answer) + '\n```' } }] }));
    };
    try {
      const specs = [
        { kind: 'title', title: 'Energía solar', subtitle: 'Introducción', notes: 'Hola' },
        { kind: 'section', title: 'Parte 1' }, { kind: 'bullets', title: 'Ventajas', bullets: ['Limpia', 'Renovable'] },
        { kind: 'two_columns', title: 'Comparación', left: { heading: 'Solar', bullets: ['a'] }, right: { heading: 'Eólica', bullets: ['b'] } },
        { kind: 'quote', quote: 'El sol es para todos', author: 'Anónimo' },
        { kind: 'stats', title: 'Cifras', stats: [{ value: '42%', label: 'eficiencia' }, { value: '3x', label: 'crecimiento' }] },
        { kind: 'timeline', title: 'Historia', steps: [{ label: '1954', text: 'Primera célula' }, { label: '2000', text: 'Expansión' }, { label: '2020', text: 'Récord' }] },
        { kind: 'chart', title: 'Producción', chart: { type: 'line', labels: ['2020', '2021'], values: [1, 2], series_name: 'TWh' }, bullets: ['Sube'] },
        { kind: 'table', title: 'Tabla', header: ['País', 'GW'], rows: [['China', '600'], ['EE. UU.', '140']] },
        { kind: 'image', title: 'Paneles', bullets: ['Tejados'], image_prompt: 'solar panels on roofs' },
        { kind: 'closing', title: 'Gracias' }];
      answer = { title: 'Energía solar', slides: specs };
      reset(); const n0 = R.state.deck.slides.length;
      const got = await A.createDeck({ topic: 'Energía solar', count: 11, audience: 'estudiantes', tone: 'didáctico', images: true });
      assert(/Audience: estudiantes/.test(calls.at(-1).body.messages[1].content), 'envía el encargo');
      await A.insertSpecs(got, { images: true });
      eq(R.state.deck.slides.length, n0 + 11, 'once diapositivas');
      const S = R.state.deck.slides.slice(1), types = s => s.blocks.map(b => b.type).join(',');
      assert(/<b>42%<\/b>/.test(S[5].blocks[1].html), 'cifras destacadas');
      eq(S[6].blocks.filter(b => b.type === 'connector').length, 2, 'línea de tiempo con conectores');
      const ch = S[7].blocks.find(b => b.type === 'chart'); eq(ch.chartType, 'line', 'gráfico'); eq(ch.data[1].value, 2, 'datos del gráfico');
      const tb = S[8].blocks.find(b => b.type === 'table'); eq(tb.rows.length, 3, 'tabla con cabecera'); assert(tb.header, 'cabecera');
      assert(S[9].blocks.some(b => b.type === 'image'), 'imagen generada en la diapositiva de imagen');
      eq(S[0].notes, 'Hola', 'notas');
      assert(/<span style="color:/.test(S[3].blocks[1].html), 'encabezado de columna con color');
      // Mejorar una diapositiva
      R.slides.goToSlide(3); answer = { kind: 'bullets', title: 'Ventajas claras', bullets: ['Limpia'], notes: 'n' };
      eq(await A.improveSlide(), 'bullets', 'mejorada'); assert(/Ventajas claras/.test(slide().blocks[0].html), 'título nuevo');
      // Agenda y preguntas
      answer = { kind: 'bullets', title: 'Agenda', bullets: ['Intro', 'Datos'] }; await A.addAgenda();
      assert(/Agenda/.test(R.state.deck.slides[1].blocks[0].html), 'agenda en la segunda posición');
      answer = { questions: [{ question: '¿Qué es?', options: ['A', 'B', 'C', 'D'], answer: 2, explanation: 'Porque C' }] };
      const total = R.state.deck.slides.length; eq(await A.addQuiz(1), 1, 'una pregunta');
      eq(R.state.deck.slides.length, total + 2, 'pregunta y respuesta');
      const ans = R.state.deck.slides.at(-1).blocks; eq(ans[3].opacity, undefined, 'correcta resaltada'); eq(ans[1].opacity, 30, 'incorrectas atenuadas');
      // Asistente con operaciones
      reset(); R.slides.addSlide();
      const [s1, s2] = R.state.deck.slides, tid = s1.blocks[0].id;
      answer = { message: 'Listo', ops: [
        { op: 'set_text', slide: 1, id: tid, text: 'Nuevo título' },
        { op: 'add_slide', after: 1, spec: { kind: 'bullets', title: 'Añadida', bullets: ['x'] } },
        { op: 'delete_slide', slide: 2 }, { op: 'set_notes', slide: 1, notes: 'Notas IA' },
        { op: 'set_background', slide: 'all', color: '#223344' }, { op: 'bogus' }] };
      const res = await A.assistant('Cambia cosas');
      eq(res.message, 'Listo', 'mensaje'); eq(res.applied, 5, 'operaciones válidas aplicadas');
      eq(s1.blocks[0].html, 'Nuevo título', 'texto'); eq(s1.notes, 'Notas IA', 'notas');
      eq(R.state.deck.slides.length, 2, 'añade una y borra la original 2'); assert(!R.state.deck.slides.includes(s2), 'borrada la correcta');
      assert(/Añadida/.test(R.state.deck.slides[1].blocks[0].html), 'insertada tras la 1');
      assert(R.state.deck.slides.every(s => s.background === '#223344'), 'fondo en todas');
      const ctx = calls.at(-1).body.messages.at(-1).content; assert(ctx.includes(tid), 'el asistente recibe los ids de los textos');
      R.store.undo(); eq(R.state.deck.slides.length, 2, 'deshacer'); assert(R.state.deck.slides.some(x => x.id === s2.id), 'un solo paso de deshacer');
      eq(await A.readDocument(new W.File(['Hola documento'], 'd.txt')), 'Hola documento', 'leer .txt');
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(10);
      assert(D.getElementById('assistant-panel'), 'panel del asistente'); D.querySelector('[data-action="ai-assistant"]').click();
    } finally { W.fetch = realFetch; R.ai.disconnectAi(); }
  });

  await test('votación en directo: recuento, resultados, export y QR', async () => {
    reset(); const P = R.poll;
    const c = P.tallyVotes({ kind: 'choice', options: ['a', 'b', 'c'] }, { v1: 0, v2: 2, v3: 2, v4: 9 });
    eq(c.counts.join(), '1,0,2', 'una opción (ignora índices inválidos)'); eq(c.voters, 4, 'votantes');
    eq(P.tallyVotes({ kind: 'multi', options: ['a', 'b'] }, { v1: [0, 1], v2: [1] }).counts.join(), '1,2', 'varias opciones');
    const r = P.tallyVotes({ kind: 'rating' }, { a: 5, b: 4, c: 3 }); eq(r.average, 4, 'valoración media'); eq(r.counts.join(), '0,0,1,1,1', 'distribución');
    eq(P.tallyVotes({ kind: 'word' }, { a: 'Sol, luna', b: 'sol' }).words.sol, 2, 'nube de palabras (sin mayúsculas)');
    const qa = P.tallyVotes({ kind: 'qa' }, { 'q:1': { t: 'Primera', by: 'a', time: 1, up: {} }, 'q:2': { t: 'Segunda', by: 'b', time: 2, up: { a: 1, c: 1 } } });
    eq(qa.questions.map(x => x.text + x.up).join(), 'Segunda2,Primera0', 'preguntas ordenadas por votos'); eq(qa.voters, 3, 'participantes');
    assert(/▲ 2<\/b><span>Segunda/.test(P.pollResultsHTML({ kind: 'qa' }, qa)), 'lista de preguntas en pantalla');
    assert(/width:100%/.test(P.pollResultsHTML({ kind: 'choice', options: ['a', 'b'] }, P.tallyVotes({ kind: 'choice', options: ['a', 'b'] }, { x: 0 }))), 'barras');
    assert(/conic-gradient/.test(P.pollResultsHTML({ kind: 'choice', display: 'pie', options: ['a'] }, { counts: [3], voters: 3 })), 'circular');
    D.querySelector('[data-action="insert-poll"]').click(); await sleep(10);
    assert(D.getElementById('poll-modal'), 'editor de la votación');
    D.querySelector('#poll-modal .pl-q').value = '¿Café o té?'; D.querySelector('#poll-modal .pl-opts').value = 'Café\nTé';
    D.querySelector('#poll-modal .pl-ok').click(); await sleep(10);
    const b = last(); eq(b.question, '¿Café o té?', 'pregunta'); eq(b.options.join(), 'Café,Té', 'opciones');
    assert(D.querySelector(`.block[data-id="${b.id}"] .poll-blk`), 'en el lienzo');
    frame.contentWindow.localStorage.setItem('revela.poll.' + b.pollId, JSON.stringify({ u1: 1, u2: 1 })); R.render(); await sleep(10);
    assert(/Té[\s\S]*2/.test(D.querySelector(`.block[data-id="${b.id}"] .poll-blk`).textContent), 'el editor muestra los últimos resultados');
    eq(P.votesCSV(b), 'opcion,votos\n"Café",0\n"Té",2', 'CSV');
    const html = R.io.buildHTML();
    assert(/class="rv-poll" data-poll="\{&quot;pollId/.test(html), 'datos de la votación en el export');
    assert(/revela-vote-/.test(html) && /qrcode@1\.5\.1/.test(html), 'anfitrión PeerJS y QR');
    assert(/fmesasc\.github\.io\/revela\/vote\.html/.test(html), 'enlace de voto absoluto (funciona también desde un archivo)');
    P.clearVotes(b.pollId);
    const qr = await fetch('https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js'); assert(qr.ok, 'la librería de QR existe en el CDN');
  });

  await test('paneles de datos y gráficos vinculados a CSV', async () => {
    reset(); const Dd = R.dashboards;
    const pb = Dd.dashboardEmbed('https://app.powerbi.com/groups/me/reports/0a1b2c3d-1111-2222-3333-444455556666/ReportSection?ctid=abc');
    eq(pb.url, 'https://app.powerbi.com/reportEmbed?reportId=0a1b2c3d-1111-2222-3333-444455556666&autoAuth=true&ctid=abc', 'Power BI → reportEmbed'); eq(pb.note, 'signin', 'aviso de inicio de sesión');
    eq(Dd.dashboardEmbed('<iframe title="x" src="https://app.powerbi.com/view?r=eyJr&amp;pageName=A"></iframe>').url, 'https://app.powerbi.com/view?r=eyJr&pageName=A', 'código <iframe> de «Publicar en la web»');
    eq(Dd.dashboardEmbed('https://lookerstudio.google.com/reporting/abc/page/p1').url, 'https://lookerstudio.google.com/embed/reporting/abc/page/p1', 'Looker Studio');
    eq(Dd.dashboardEmbed('https://public.tableau.com/app/profile/ana/viz/Ventas/Hoja1').url, 'https://public.tableau.com/views/Ventas/Hoja1?:showVizHome=no&:embed=true', 'Tableau Public');
    eq(Dd.dashboardEmbed('https://www.datawrapper.de/_/AbC12/').url, 'https://datawrapper.dwcdn.net/AbC12/', 'Datawrapper');
    eq(Dd.dashboardEmbed('https://public.flourish.studio/visualisation/12345/').url, 'https://flo.uri.sh/visualisation/12345/embed', 'Flourish');
    eq(Dd.dashboardEmbed('http://inseguro.com'), null, 'solo https');
    eq(Dd.csvUrl('https://docs.google.com/spreadsheets/d/ID123/edit#gid=7'), 'https://docs.google.com/spreadsheets/d/ID123/export?format=csv&gid=7', 'Google Sheets → CSV');
    const r = Dd.addDashboard('https://app.powerbi.com/view?r=eyJr', 5); eq(r.block.type, 'embed', 'insertado'); eq(r.block.refreshMin, 5, 'recarga');
    assert(/data-refresh-min="5"/.test(R.io.buildHTML()), 'recarga en el export');
    // Gráfico vinculado a un CSV real (servido junto a los tests)
    R.blocks.addChart(); const c = last();
    const url = new URL('fixtures/ventas.csv', location.href).href;
    await Dd.linkChart(c, url, 30);
    eq(c.data.map(d => d.label + d.value).join(','), 'Ene10,Feb12,Mar15,Abr9', 'datos del CSV'); eq(c.seriesName, 'Ventas', 'serie'); eq(c.series[0].values.join(), '4,5,6,3', 'segunda serie');
    c.data = [{ label: 'X', value: 1 }];                           // datos viejos en el proyecto
    const html = R.io.buildHTML(); assert(/class="rv-live-chart"/.test(html), 'gráfico vivo en el export');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let rects = 0; for (let i = 0; i < 80; i++) { await sleep(100); rects = f.contentDocument?.querySelectorAll('.rv-live-chart svg rect[height]:not([height="3"])').length || 0; if (rects === 8) break; }
    f.remove();
    eq(rects, 8, 'la presentación recarga el CSV y redibuja (4 meses × 2 series)');
  });

  await test('imágenes libres (Openverse) e iconos en línea (Iconify)', async () => {
    reset(); const W = frame.contentWindow, S = R.stock, real = W.fetch, calls = [];
    const gif = Uint8Array.from(atob('R0lGODlhAQABAAAAACw='), c => c.charCodeAt(0));
    W.fetch = async (url) => {
      url = String(url); calls.push(url);
      if (url.startsWith('https://api.openverse.org/v1/images/?')) return new W.Response(JSON.stringify({ results: [{ id: 'x1', title: 'Volcán', url: 'https://cdn.bloqueado/v.jpg',
        thumbnail: 'https://api.openverse.org/v1/images/x1/thumb/', creator: 'NASA', license: 'by', license_version: '2.0', attribution: '"Volcán" by NASA is licensed under CC BY 2.0.', width: 1600, height: 900 }] }));
      if (url.startsWith('https://cdn.bloqueado')) throw new TypeError('CORS');
      if (url.includes('/thumb/')) return new W.Response(new W.Blob([gif], { type: 'image/gif' }));
      if (url.startsWith('https://api.iconify.design/search')) return new W.Response(JSON.stringify({ icons: ['mdi:rocket'], collections: { mdi: { name: 'MDI', license: { title: 'Apache 2.0', spdx: 'Apache-2.0' } } } }));
      if (url.startsWith('https://api.iconify.design/mdi/rocket.svg')) return new W.Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ff0000" d="M0 0h24v24H0z"/></svg>');
      return real(url);
    };
    try {
      const res = await S.searchImages('volcán', 1, { commercial: true });
      assert(/license_type=commercial/.test(calls[0]) && /q=volc/.test(calls[0]), 'búsqueda con filtro comercial');
      eq(res[0].license, 'BY 2.0', 'licencia');
      const b = await S.insertStockImage(res[0]);
      assert(calls.some(u => u.includes('/thumb/')), 'si el original no deja descargar, usa la miniatura');
      assert(/^data:image\/gif/.test(b.src), 'imagen incrustada (funciona sin conexión)');
      eq(b.caption, '«Volcán» — NASA (BY 2.0)', 'atribución como pie'); eq(Math.round(b.w / b.h * 9), 16, 'proporción');
      const ic = await S.searchIcons('rocket'); eq(ic.icons[0], 'mdi:rocket', 'iconos');
      const i = await S.insertOnlineIcon('mdi:rocket', '#ff0000', ic.collections.mdi.license);
      assert(/^data:image\/svg\+xml;base64,/.test(i.src) && atob(i.src.split(',')[1]).includes('#ff0000'), 'icono SVG con color');
      eq(i.alt, 'rocket', 'texto alternativo');
      assert(calls.some(u => /color=%23ff0000/.test(u)), 'color en la petición');
    } finally { W.fetch = real; }
  });

  await test('subtítulos en directo al presentar (reconocimiento de voz simulado)', async () => {
    reset();
    const fake = `<script>window.confirm=function(){return true};window.SpeechRecognition=function(){var s=this;window.__rec=s;s.start=function(){s.started=true};s.stop=function(){s.started=false}};<\/script>`;
    const html = R.io.buildHTML().replace('<head>', '<head>' + fake);
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).__ink && w.Reveal?.isReady?.()); i++) await sleep(100);
    try {
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      assert(w.__ink.captionsOn && w.__rec.started, 'C activa los subtítulos');
      eq(w.__rec.lang, 'es-ES', 'idioma del reconocimiento');
      const res = (txt, fin) => { const r = [{ transcript: txt }]; r.isFinal = fin; return r; };
      w.__rec.onresult({ resultIndex: 0, results: [res('hola a todos', true)] });
      w.__rec.onresult({ resultIndex: 1, results: [res('hola a todos', true), res('bienvenidos', false)] });
      eq(f.contentDocument.getElementById('captions').textContent, 'hola a todos bienvenidos', 'texto en pantalla (final + provisional)');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      assert(!w.__ink.captionsOn && !w.__rec.started, 'C los apaga');
    } finally { f.remove(); }
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

  await test('panel de animación: efecto, con la anterior y duración', async () => {
    reset(); R.blocks.addText(); const a = slide().blocks.at(-1); R.state.ui.selection = a.id; R.trans.setAnimation('fade-up');
    R.blocks.addText(); const b2 = slide().blocks.at(-1); R.state.ui.selection = b2.id; R.trans.setAnimation('zoom-in');
    R.trans.setAnimPropForId(b2.id, 'start', 'withPrev');
    R.trans.setAnimPropForId(a.id, 'duration', 800);
    const html = R.io.buildHTML();
    assert(/class="fragment fade-up"/.test(html) && /class="fragment zoom-in"/.test(html), 'efectos aplicados');
    assert(/transition-duration:800ms/.test(html), 'duración en el export');
    const idxs = [...html.matchAll(/data-fragment-index="(\d+)"/g)].map(m => m[1]);
    assert(idxs.length >= 2 && idxs[0] === idxs[1], '"con la anterior" comparte índice de fragmento');
  });

  await test('animación de énfasis en el export', async () => {
    reset(); const b = newText(); R.state.ui.selection = b.id;
    b.animation = { effect: 'grow', order: 1 };
    assert(/class="fragment grow"/.test(R.io.buildHTML()), 'clase de fragmento grow');
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

  await test('fondo con degradado se aplica y se exporta', async () => {
    reset(); slide().background = 'linear-gradient(135deg, #3f6497, #101317)'; R.render(); await sleep(10);
    assert(/style="background:linear-gradient\(135deg, #3f6497, #101317\)"/.test(R.io.buildHTML()), 'degradado en export');
  });

  await test('auto-animate: data-auto-animate y data-id en el export', async () => {
    reset(); const b = newText(); slide().autoAnimate = true;
    const html = R.io.buildHTML();
    assert(/<section[^>]*data-auto-animate/.test(html), 'sección con data-auto-animate');
    assert(new RegExp(`data-id="${b.id}"`).test(html), 'bloque con data-id');
  });

  await test('duplicar animando conserva los ids de los bloques', async () => {
    reset(); const b = newText(); R.slides.duplicateForAnimate();
    const s0 = R.state.deck.slides[0], s1 = R.state.deck.slides[1];
    assert(s0.autoAnimate && s1.autoAnimate, 'ambas con auto-animate');
    assert(s1.blocks.some(x => x.id === b.id), 'la copia conserva el id del bloque');
  });

  await test('auto-animate (morph): ambas secciones marcadas y mismo data-id', async () => {
    reset(); const b = newText(); b.x = 100; R.slides.duplicateForAnimate();
    const cb = R.state.deck.slides[1].blocks.find(x => x.id === b.id); cb.x = 900;
    const html = R.io.buildHTML();
    assert([...html.matchAll(/<section[^>]*data-auto-animate/g)].length >= 2, 'ambas con data-auto-animate');
    assert([...html.matchAll(new RegExp(`data-id="${b.id}"`, 'g'))].length >= 2, 'mismo data-id en ambas diapositivas');
  });

  await test('efecto personalizado (spin) se anima en el export', async () => {
    reset(); const b = newText(); R.state.ui.selection = b.id; R.trans.setAnimation('spin');
    const html = R.io.buildHTML();
    assert(/class="fragment spin"/.test(html), 'clase spin'); assert(/@keyframes rvSpin/.test(html), 'keyframes en el export');
  });

  await test('zoom de resumen crea una miniatura por diapositiva', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide();
    const n0 = slide().blocks.length; R.blocks.addSummaryZoom();
    const added = slide().blocks.slice(n0).filter(x => x.type === 'slideref');
    eq(added.length, 2, 'una miniatura por cada otra diapositiva');
  });

  await test('avance automático por diapositiva en el export', async () => {
    reset(); slide().autoSlide = 5000;
    assert(/<section[^>]*data-autoslide="5000"/.test(R.io.buildHTML()), 'sin data-autoslide');
  });

  // ---- Mobile remote (logic without a live connection) ---------------------
  await test('mando: el estado enviado refleja diapositiva, total y notas', async () => {
    reset(); R.slides.addSlide(); slide().notes = 'nota B'; R.state.ui.slideIndex = 1; R.render();
    const st = R.remote.presentationState();
    eq(st.kind, 'state', 'tipo'); eq(st.total, 2, 'total'); eq(st.index, 1, 'índice'); eq(st.notes, 'nota B', 'notas');
  });

  await test('mando: comandos next/prev navegan en el editor', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.state.ui.slideIndex = 0; R.render();
    R.remote.applyCommand({ type: 'next' }); eq(R.state.ui.slideIndex, 1, 'next');
    R.remote.applyCommand({ type: 'next' }); eq(R.state.ui.slideIndex, 2, 'next 2');
    R.remote.applyCommand({ type: 'prev' }); eq(R.state.ui.slideIndex, 1, 'prev');
    R.remote.applyCommand({ type: 'goto', index: 0 }); eq(R.state.ui.slideIndex, 0, 'goto');
  });

  await test('mando: el estado omite las diapositivas ocultas', async () => {
    reset(); R.slides.addSlide(); R.slides.toggleSlideHidden(0); R.render();
    eq(R.remote.presentationState().total, 1, 'solo cuenta visibles');
  });

  await test('activar/desactivar el ajuste (snap)', async () => {
    reset(); assert(R.state.ui.snap !== false, 'activo por defecto');
    D.querySelector('[data-action="toggle-snap"]').click();
    assert(R.state.ui.snap === false, 'desactivado');
    D.querySelector('[data-action="toggle-snap"]').click();
    assert(R.state.ui.snap === true, 'reactivado');
  });

  await test('guías colocables: se dibujan sobre la diapositiva', async () => {
    reset(); R.state.deck.guides = { v: [640], h: [360] }; R.render(); await sleep(20);
    eq(D.querySelectorAll('.pguide').length, 2, 'dos guías dibujadas');
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

  await test('duplicar diapositiva: los conectores apuntan a las copias', async () => {
    reset(); R.blocks.addText(); const a = last(); R.blocks.addText(); const b = last();
    R.store.setMulti([a.id, b.id]); R.blocks.addConnector(); R.blocks.groupSelected?.();
    R.slides.duplicateSlide(); await sleep(20);
    const s = slide(), ids = new Set(s.blocks.map(x => x.id));
    const c = s.blocks.find(x => x.type === 'connector');
    assert(c && ids.has(c.from) && ids.has(c.to), 'conector remapeado a la copia');
    assert(!ids.has(a.id), 'ids nuevos');
  });

  await test('reutilizar diapositivas de otro proyecto (con escalado 4:3)', async () => {
    reset(); const n0 = R.state.deck.slides.length, i0 = R.state.ui.slideIndex;
    const other = { size: { w: 960, h: 720 }, slides: [
      { id: 'x1', background: '#123456', blocks: [{ id: 'k1', type: 'text', html: 'Uno', x: 96, y: 72, w: 480, h: 72, fontSize: 40 }] },
      { id: 'x2', background: '#000000', blocks: [] },
      { id: 'x3', background: '#000000', blocks: [{ id: 'k3', type: 'text', html: 'Tres', x: 0, y: 0, w: 100, h: 50 }] } ] };
    R.reuse.openReuseDialog(other, 'otro.json'); await sleep(20);
    const items = D.querySelectorAll('#reuse-modal .reuse-item');
    eq(items.length, 3, 'tres miniaturas');
    const go = D.querySelector('#reuse-modal .reuse-go');
    assert(go.disabled, 'insertar deshabilitado sin selección');
    items[0].click(); items[2].click();
    assert(!go.disabled, 'habilitado'); go.click(); await sleep(20);
    eq(R.state.deck.slides.length, n0 + 2, 'dos diapositivas insertadas');
    const s = R.state.deck.slides[i0 + 1];
    eq(s.background, '#123456', 'fondo conservado');
    assert(s.id !== 'x1' && s.blocks[0].id !== 'k1', 'ids nuevos');
    eq(s.blocks[0].x, 128, 'x escalada 960→1280'); eq(s.blocks[0].w, 640, 'ancho escalado');
    eq(R.state.deck.slides[i0 + 2].blocks[0].html, 'Tres', 'orden conservado');
    assert(!D.getElementById('reuse-modal'), 'diálogo cerrado');
  });

  await test('comprobador de accesibilidad', async () => {
    reset();
    const deck = { theme: 'black', slides: [
      { background: '#101317', blocks: [] },
      { background: '#101317', blocks: [{ id: 'i1', type: 'image', src: 'data:,', x: 0, y: 0, w: 10, h: 10 }] },
      { background: '#101317', blocks: [{ id: 't1', type: 'text', html: 'Hola', fontSize: 40 }, { id: 'tb', type: 'table', rows: [['a']] }] },
      { background: '#101317', blocks: [{ id: 't2', type: 'text', html: 'hola', fontSize: 40 }] },
      { background: '#ffffff', blocks: [{ id: 't3', type: 'text', html: 'Claro', fontSize: 16 }] },
      { background: '#ffffff', blocks: [{ id: 't4', type: 'text', html: '<span style="color:#000000">Negro</span>', fontSize: 16 }] } ] };
    const iss = R.a11y.checkAccessibility(deck), has = (k, s) => iss.some(x => x.kind === k && x.slide === s);
    assert(has('empty', 0), 'vacía'); assert(has('notitle', 1), 'sin título'); assert(has('alt', 1), 'sin alt');
    assert(has('tablehead', 2), 'tabla sin encabezado'); assert(has('duptitle', 3), 'título duplicado');
    assert(has('contrast', 4), 'blanco sobre blanco'); assert(!has('contrast', 5), 'color explícito con buen contraste');
    assert(!has('contrast', 2), 'blanco sobre oscuro OK');
    deck.theme = 'white'; assert(R.a11y.checkAccessibility(deck).some(x => x.kind === 'contrast' && x.slide === 2), 'tema claro sobre fondo oscuro');
    D.querySelector('[data-action="a11y-check"]').click(); await sleep(20);
    assert(D.querySelector('#a11y-modal .a11y-item, #a11y-modal .a11y-ok'), 'diálogo con resultados');
    D.querySelector('#a11y-modal .modal-close').click();
  });

  await test('cuentagotas: aplica el color elegido al objetivo', async () => {
    reset(); R.blocks.addShape('rect'); const b = last(); select(b); await sleep(20);
    R.ribbon.applyPickedColour(D.querySelector('[data-shape-fill]'), '#12ab34'); await sleep(10);
    eq(b.fill, '#12ab34', 'relleno desde el cuentagotas');
    if ('EyeDropper' in frame.contentWindow) assert(D.querySelector('.eyedrop[data-eyedrop="[data-shape-fill]"]'), 'botón junto al selector');
  });

  await test('presentación: lápiz, resaltador y borrar tinta', async () => {
    reset(); R.blocks.addText();
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.srcdoc = R.io.buildHTML(); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).__ink && w.Reveal?.isReady?.()); i++) await sleep(100);
    try {
      assert(w.__ink, 'tinta inicializada en la presentación');
      const cd = f.contentDocument, cv = cd.getElementById('ink-canvas');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true }));
      eq(w.__ink.tool, 'pen', 'Ctrl+P activa el lápiz');
      assert(cv.classList.contains('on'), 'lienzo captura el puntero');
      const P = (type, x, y) => cv.dispatchEvent(new w.PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true }));
      P('pointerdown', 100, 100); P('pointermove', 200, 150); P('pointerup', 200, 150);
      eq(w.__ink.strokes().length, 1, 'un trazo'); eq(w.__ink.strokes()[0].p.length, 2, 'dos puntos');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'i', ctrlKey: true, bubbles: true }));
      P('pointerdown', 50, 50); P('pointerup', 50, 50);
      assert(w.__ink.strokes()[1].hl, 'trazo de resaltador');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'e', bubbles: true }));
      eq(w.__ink.strokes().length, 0, 'E borra la tinta');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      eq(w.__ink.tool, null, 'Esc vuelve al puntero');
      assert(!w.Reveal.isOverview(), 'Esc no abre la vista general');
    } finally { f.remove(); }
  });

  await test('zoom: acercar y restablecer', async () => {
    reset(); D.querySelector('[data-action="zoom-reset"]').click();
    const z0 = R.state.ui.zoom;
    D.querySelector('[data-action="zoom-in"]').click();
    assert(R.state.ui.zoom > z0, 'aumenta');
    assert(/scale\(/.test(D.getElementById('stage-grid').style.transform), 'transform aplicado');
    D.querySelector('[data-action="zoom-reset"]').click();
    eq(R.state.ui.zoom, 1, 'reset');
  });

  await test('localización: cambiar de idioma traduce la interfaz', async () => {
    R.i18n.setLang('en');
    const tab = D.querySelector('#ribbon .tabs button[data-tab="home"]');
    eq(tab.textContent.trim(), 'Home', 'Inicio → Home');
    eq(R.i18n.t('Guardar'), 'Save', 't() traduce');
    eq(R.i18n.t('Datos del gráfico'), 'Chart data', 'cadena de modal traducida');
    eq(R.i18n.t('Buscar y reemplazar'), 'Find and replace', 'panel de búsqueda traducido');
    R.i18n.setLang('fr');
    eq(tab.textContent.trim(), 'Accueil', 'Inicio → Accueil');
    R.i18n.setLang('nl');
    eq(D.querySelector('#ribbon .tabs button[data-tab="file"]').textContent.trim(), 'Bestand', 'Archivo → Bestand');
    eq(R.i18n.t('Diagramas'), 'Diagrammen', 'NL cubre más etiquetas');
    R.i18n.setLang('gl');
    eq(R.i18n.t('Pie de página'), 'Pé de páxina', 'GL cubre más etiquetas');
    R.i18n.setLang('eu');
    eq(tab.textContent.trim(), 'Hasiera', 'euskera');
    R.i18n.setLang('ar');
    eq(D.documentElement.dir, 'rtl', 'árabe: interfaz de derecha a izquierda');
    eq(tab.textContent.trim(), 'الشريط الرئيسي', 'árabe traducido');
    eq(R.i18n.t('Comprobar accesibilidad'), 'Check accessibility', 'lo que falta cae al inglés, no al español');
    eq(getComputedStyle(D.getElementById('canvas-wrap')).direction, 'ltr', 'la diapositiva sigue de izquierda a derecha');
    R.i18n.setLang('es');
    eq(D.documentElement.dir, 'ltr', 'vuelve a LTR');
    eq(tab.textContent.trim(), 'Inicio', 'vuelve a español');
  });

  // ---- Report --------------------------------------------------------------
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  return { pass, total: results.length, results, fail };
}
