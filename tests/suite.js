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

  await test('forma: cambiar relleno', async () => {
    reset(); R.blocks.addShape('rect'); const b = last(); select(b);
    R.blocks.setShapeStyle('fill', '#ff0000'); await sleep(20);
    eq(b.fill, '#ff0000', 'fill del modelo');
    eq(D.querySelector(`.block[data-id="${b.id}"] .shape svg rect`).getAttribute('fill'), '#ff0000', 'fill SVG');
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

  await test('notas del orador: panel y export con vista del orador', async () => {
    reset(); R.state.ui.showNotes = true; R.render(); await sleep(20);
    assert(!D.getElementById('notes-bar').hidden, 'el panel de notas no se muestra');
    slide().notes = 'Recordar saludar';
    const html = R.io.buildHTML();
    assert(/<aside class="notes">Recordar saludar<\/aside>/.test(html), 'notas no exportadas');
    assert(/RevealNotes/.test(html), 'sin plugin de notas');
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

  // ---- Report --------------------------------------------------------------
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  return { pass, total: results.length, results, fail };
}
