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

  await test('más formas: estrella en lienzo y export', async () => {
    reset(); R.blocks.addShape('star'); const b = last(); select(b); await sleep(20);
    assert(D.querySelector(`.block[data-id="${b.id}"] .shape svg polygon`), 'estrella en el lienzo');
    assert(/<svg[^>]*><polygon/.test(R.io.buildHTML()), 'estrella en el export');
  });

  await test('sangría de párrafo', async () => {
    reset(); const b = newText(); R.format.indent(40); await sleep(10);
    eq(b.indent, 40, 'indent'); assert(/padding-left:40px/.test(R.io.buildHTML()), 'export');
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

  await test('presentar: crea una capa a pantalla completa y se cierra', async () => {
    reset(); R.io.present(); await sleep(40);
    const ov = D.getElementById('present-overlay');
    assert(ov && ov.querySelector('iframe'), 'no se creó la capa de presentación');
    ov.querySelector('#present-close').click(); await sleep(20);
    assert(!D.getElementById('present-overlay'), 'la capa no se cerró');
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

  await test('exportar a PDF: una página por diapositiva visible', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.slides.toggleSlideHidden(0);
    const html = R.io.buildPrintHTML();
    eq((html.match(/class="page"/g) || []).length, 2, 'páginas = diapositivas visibles');
    assert(/@page\{size:1280px 720px/.test(html), 'tamaño de página');
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

  await test('animación de énfasis en el export', async () => {
    reset(); const b = newText(); R.state.ui.selection = b.id;
    b.animation = { effect: 'grow', order: 1 };
    assert(/class="fragment grow"/.test(R.io.buildHTML()), 'clase de fragmento grow');
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

  await test('guías colocables: se dibujan sobre la diapositiva', async () => {
    reset(); R.state.deck.guides = { v: [640], h: [360] }; R.render(); await sleep(20);
    eq(D.querySelectorAll('.pguide').length, 2, 'dos guías dibujadas');
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

  // ---- Report --------------------------------------------------------------
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  return { pass, total: results.length, results, fail };
}
