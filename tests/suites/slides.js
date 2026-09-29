// Slides and deck: layouts, sections, numbering, footer, notes, backgrounds, master, templates, theme.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('cambiar diseño (layout) desde el popover', async () => {
    reset(); D.querySelector('[data-layout-open]').click(); await sleep(10);
    const btn = D.querySelector('.popover [data-layout="blank"]'); assert(btn, 'popover de diseños');
    const n = slide().blocks.length; btn.click(); await sleep(10);
    eq(slide().layoutId, 'blank', 'diseño en blanco aplicado');
    eq(slide().blocks.length, n, 'sin marcadores donde moverlo, el texto se conserva (como en PowerPoint)');
    D.querySelector('[data-layout-open]').click(); await sleep(10);
    D.querySelector('.popover [data-layout="titleContent"]').click(); await sleep(10);
    const ph = slide().blocks.filter(b => b.ph);
    eq(ph.map(b => b.ph).join(), 'title,body', 'marcadores del diseño');
    assert(/Título/.test(ph[0].html) && /Subtítulo/.test(ph[1].html), 'el texto pasa a los marcadores');
    eq(slide().blocks.length, 2, 'sin duplicados');
  });

  await test('clasificador de diapositivas: cuadrícula, flechas, suprimir, doble clic para editar', async () => {
    reset(); const W = frame.contentWindow, key = (k, o = {}) => D.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
    for (let i = 0; i < 5; i++) R.slides.addSlide('blank');
    R.slides.goToSlide(0); await sleep(20); const z = R.state.ui.zoom;
    D.querySelector('#statusbar [data-action="slide-sorter"]').click(); await sleep(60);
    const nav = D.getElementById('navigator');
    assert(D.body.classList.contains('sorter') && W.getComputedStyle(nav).display === 'grid' && !D.getElementById('canvas-wrap').offsetWidth, 'todas en cuadrícula, en lugar de la diapositiva');
    assert(D.querySelectorAll('[data-action="slide-sorter"].on').length === 2, 'el botón queda marcado');
    const cols = [...nav.querySelectorAll('.thumb')].filter(t => t.offsetTop === nav.querySelector('.thumb').offsetTop).length;
    assert(cols > 1, 'varias por fila');
    key('ArrowRight'); await sleep(10); eq(R.state.ui.slideIndex, 1, 'flecha derecha: la siguiente');
    key('ArrowDown'); await sleep(10); eq(R.state.ui.slideIndex, Math.min(5, 1 + cols), 'flecha abajo: la de debajo');
    const n = R.state.deck.slides.length; key('Delete'); await sleep(10); eq(R.state.deck.slides.length, n - 1, 'Supr borra la diapositiva');
    key('d', { ctrlKey: true }); await sleep(10); eq(R.state.deck.slides.length, n, 'Ctrl+D la duplica');
    eq(R.state.ui.zoom, z, 'el zoom del lienzo no cambia al ocultarse');
    nav.querySelectorAll('.thumb')[2].dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true })); await sleep(60);
    assert(!D.body.classList.contains('sorter') && R.state.ui.slideIndex === 2, 'doble clic: a editar esa diapositiva');
    D.querySelector('[data-action="slide-sorter"]').click(); await sleep(20); key('Escape'); await sleep(20);
    assert(!D.body.classList.contains('sorter'), 'Esc vuelve a la diapositiva');
  });

  await test('kit de marca: colores, fuentes y logotipo guardados, aplicados con un clic y compartidos como archivo', async () => {
    reset(); const W = frame.contentWindow, K = await W.eval("import('/src/features/design/brandkit.js')"), P = await W.eval("import('/src/features/design/palettes.js')");
    W.localStorage.removeItem('revela.brandKits');
    const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    // Only what is safe to keep: valid colours, catalogue fonts, pictures as data.
    const bad = K.cleanKit({ name: 'x', colors: ['#ff0000', 'red;background:url(x)', '#12345'], fonts: { heading: 'Montserrat', body: '<script>' }, logos: ['javascript:alert(1)', logo] });
    assert(bad.colors.join() === '#ff0000' && bad.fonts.body === '' && bad.logos.length === 1, 'solo colores válidos, fuentes del catálogo y logotipos como imagen');
    const kit = { name: 'Colegio', colors: ['#ffffff', '#1d2b53', '#c1121f', '#003049'], fonts: { heading: 'Montserrat', body: 'Open Sans' }, logos: [logo] };
    const saved = K.saveKit(kit); assert(saved && K.listKits().length === 1, 'se guarda en este navegador');
    assert(K.kitColours().includes('#c1121f'), 'sus colores, en los selectores de color');
    // Applying it: the theme's colours by role, the fonts, the logo.
    R.blocks.addShape('rect'); const sh = last(); await sleep(10);
    const accent = P.currentPalette().accents[0]; eq(sh.fill.toLowerCase(), accent.toLowerCase(), '(la forma usa el acento 1 del tema)');
    K.applyKit(saved); await sleep(20);
    eq(R.state.deck.palette, 'custom', 'paleta propia');
    eq(JSON.stringify([P.currentPalette().bg, P.currentPalette().fg, P.currentPalette().accents[0]]), '["#ffffff","#1d2b53","#c1121f"]', 'fondo, texto y acentos del kit');
    eq(slide().blocks.find(b => b.id === sh.id).fill.toLowerCase(), '#c1121f', 'lo que usaba el tema toma los colores de la marca');
    assert(/Montserrat/.test(slide().blocks[0].fontFamily) && /Open Sans/.test(R.state.deck.bodyFont), 'sus fuentes');
    eq(R.state.deck.logo.src, logo, 'y su logotipo');
    assert(/#1d2b53/i.test(R.io.buildHTML()), 'la presentación sale con sus colores');
    // Shared as a file and read back.
    const txt = await K.kitFile(saved).text(), again = K.kitFromFile(txt);
    assert(again && again.name === 'Colegio' && again.colors.length === 4 && again.id !== saved.id, 'como archivo, y de vuelta');
    eq(K.kitFromFile('{"hola":1}'), null, 'otro archivo no es un kit');
    // The dialog: apply from the list.
    reset(); D.querySelector('[data-action="brand-kit"]').click(); await sleep(20);
    const m = D.getElementById('bk-modal'); assert(m.querySelector('.bk-kit b').textContent === 'Colegio', 'el diálogo lista los kits');
    m.querySelector('[data-a="apply"]').click(); await sleep(20);
    assert(R.state.deck.palette === 'custom' && !D.getElementById('bk-modal'), 'aplicar desde el diálogo');
    K.listKits().forEach(k => K.deleteKit(k.id)); eq(K.kitColours().length, 0, 'borrados, ya no se ofrecen sus colores');
  });

  await test('cambiar tamaño: A4, cuadrado, vertical… recolocando y escalando el contenido', async () => {
    reset(); const Z = await frame.contentWindow.eval("import('/src/features/design/resize.js')");
    const deck = R.examples.buildExample('report'); R.store.replaceDeck(deck); await sleep(20);
    const inside = () => R.state.deck.slides.every(s => s.blocks.filter(b => b.type !== 'connector').every(b => b.x >= -1 && b.y >= -1 && b.x + b.w <= R.state.deck.size.w + 1 && b.y + b.h <= R.state.deck.size.h + 1));
    const cifras = () => R.state.deck.slides[1].blocks.filter(b => /font-size:\d+px/.test(b.html || ''));
    const before = cifras().map(b => b.y);
    assert(new Set(before).size === 1, '(las cifras van en fila)');
    Z.resizeDeck(720, 1280); await sleep(20);
    eq(JSON.stringify(R.state.deck.size), '{"w":720,"h":1280}', 'tamaño vertical 9:16');
    assert(inside(), 'todo sigue dentro de la diapositiva');
    const after = cifras(); assert(after[0].y < after[1].y && after[1].y < after[2].y && after.every(b => Math.abs(b.x + b.w / 2 - 360) < 2), 'lo que iba en fila, apilado y centrado');
    R.store.undo(); await sleep(20);
    assert(R.state.deck.size.w === 1280 && cifras().map(b => b.y).join() === before.join(), 'un solo paso de deshacer');
    Z.resizeDeck(1080, 1080); await sleep(20); assert(inside(), 'cuadrada: dentro');
    const t = R.state.deck.slides[0].blocks.find(b => b.ph === 'title'); assert(t && t.w > 700, 'el título, al ancho nuevo');
    R.store.undo(); await sleep(20);
    const x0 = R.state.deck.slides[1].blocks[0].x; Z.resizeDeck(960, 720, { fit: false }); await sleep(20);
    eq(R.state.deck.slides[1].blocks[0].x, x0, 'sin recolocar: solo el tamaño');
    // The dialog.
    R.store.undo(); await sleep(10); D.querySelector('[data-action="resize-deck"]').click(); await sleep(20);
    const m = D.getElementById('rs-modal'); m.querySelector('input[value="905x1280"]').checked = true; m.querySelector('.rs-ok').click(); await sleep(20);
    eq(JSON.stringify(R.state.deck.size), '{"w":905,"h":1280}', 'desde el diálogo: A4 vertical'); assert(inside(), 'dentro');
  });

  await test('arrastrar una miniatura a la diapositiva: queda un zoom a esa diapositiva donde se suelta', async () => {
    reset(); const W = frame.contentWindow;
    R.slides.addSlide('blank'); R.slides.addSlide('blank'); R.slides.goToSlide(0); await sleep(20);
    const S = R.state.deck.slides, stage = D.getElementById('stage'), sr = stage.getBoundingClientRect(), k = R.state.deck.size.w / sr.width;
    const drag = async (thumbIndex, x, y) => {
      const th = D.querySelectorAll('#navigator .thumb')[thumbIndex], dt = new W.DataTransfer();
      th.dispatchEvent(new W.DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      const o = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: sr.left + x / k, clientY: sr.top + y / k };
      const over = new W.DragEvent('dragover', o); stage.dispatchEvent(over);
      stage.dispatchEvent(new W.DragEvent('drop', o)); th.dispatchEvent(new W.DragEvent('dragend', { bubbles: true, dataTransfer: dt })); await sleep(30);
      return over.defaultPrevented;
    };
    const n = slide().blocks.length;
    assert(await drag(2, 640, 400), 'la diapositiva acepta la miniatura');
    const z = last();
    assert(slide().blocks.length === n + 1 && z.type === 'slideref' && z.target === S[2].id, 'un zoom a la diapositiva 3');
    assert(Math.abs(z.x + z.w / 2 - 640) < 3 && Math.abs(z.y + z.h / 2 - 400) < 3, 'donde se suelta');
    eq(R.state.ui.slideIndex, 0, 'sigue en la diapositiva que se edita');
    await drag(1, 1270, 710); assert(last().x + last().w <= 1280 && last().y + last().h <= 720, 'junto al borde, dentro de la diapositiva');
    const m = slide().blocks.length; await drag(0, 300, 300); eq(slide().blocks.length, m, 'la misma diapositiva no se añade a sí misma');
    R.store.undo(); await sleep(10); eq(slide().blocks.length, m - 1, 'se deshace en un paso');
    // Reordering in the panel still works.
    const first = S[0].id, th = D.querySelectorAll('#navigator .thumb'), dt = new W.DataTransfer();
    th[0].dispatchEvent(new W.DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    th[2].dispatchEvent(new W.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    th[2].dispatchEvent(new W.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })); await sleep(20);
    eq(R.state.deck.slides[2].id, first, 'y arrastrar en el panel sigue reordenando');
  });

  await test('nueva diapositiva ▾: con el diseño que se elija', async () => {
    reset();
    D.querySelector('[data-action="slide-add"]').click(); await sleep(10);
    eq(slide().blocks.map(b => b.ph).join(), 'title,body', 'tras la primera (sin diseño), «Título y contenido», no una en blanco');
    R.store.undo(); await sleep(10);
    const n = R.state.deck.slides.length;
    D.querySelector('[data-newslide-open]').click(); await sleep(10);
    const btn = D.querySelector('.popover [data-newslide="titleOnly"]'); assert(btn, 'lista de diseños');
    btn.click(); await sleep(10);
    eq(R.state.deck.slides.length, n + 1, 'una diapositiva más'); eq(R.state.ui.slideIndex, n, 'y se va a ella');
    eq(slide().layoutId, 'titleOnly', 'con ese diseño'); eq(slide().blocks.map(b => b.ph).join(), 'title', 'y sus marcadores');
    assert(!D.querySelector('.popover'), 'la lista se cierra');
  });

  await test('encabezado y pie: el diálogo activa el número de diapositiva', async () => {
    reset(); D.querySelector('[data-action="insert-hf"]').click(); await sleep(10);
    const num = D.querySelector('#hf-modal .hf-num'); assert(num, 'diálogo de encabezado/pie');
    num.checked = true; num.dispatchEvent(new Event('change'));
    assert(R.state.deck.slideNumber.show, 'número activado');
    D.querySelector('#hf-modal .modal-close')?.click();
  });

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
    assert(/slideNumber:["']c\/t["']/.test(html), 'formato del número');
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

  await test('diseño "dos contenidos" reemplaza los bloques de la diapositiva', async () => {
    reset(); D.querySelector('[data-template="twoContent"]').click(); await sleep(10);
    eq(slide().blocks.length, 3, 'tres bloques del diseño');
  });

  await test('título del documento: editable y usado en el export', async () => {
    reset(); R.state.deck.name = 'Mi charla'; R.render();
    assert(/<title>Mi charla<\/title>/.test(R.io.buildHTML()), 'título no aplicado al export');
  });

  await test('aplicar fondo a todas las diapositivas', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide();
    slide().background = '#123456';
    D.querySelector('[data-action="bg-all"]').click();
    assert(R.state.deck.slides.every(s => s.background === '#123456'), 'todas con el mismo fondo');
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
    eq(D.querySelectorAll('#gallery-modal .gal-grid:not(.gal-examples) .gal-item').length, Object.keys(R.gallery.GALLERY).length + 1, 'una miniatura por plantilla, y «En blanco»');
    // With changes, choosing asks first; «En blanco» starts an empty one.
    R.store.commit(() => { slide().blocks[0].html = 'Algo mío'; }); await sleep(10);
    D.querySelector('#gallery-modal [data-gallery="blank"]').click(); await sleep(20);
    assert(D.querySelector('.modal-backdrop .dlg-ok'), 'con cambios, pregunta antes');
    D.querySelector('.modal-backdrop .dlg-ok').click(); await sleep(20);
    assert(R.model.isBlankDeck(R.state.deck), '«En blanco»: una presentación vacía');
    D.querySelector('#gallery-modal .modal-close')?.click();
    // The slide fits the window until one chooses a zoom.
    const Z = await frame.contentWindow.eval("import('/src/ui/ribbon/zoom.js')");
    Z.fitZoom(); assert(Z.zoomFitting(), 'ajustada a la ventana');
    const wrap = D.getElementById('canvas-wrap');
    for (const ruler of [false, true]) {                     // no scroll bars when it fits, also with the ruler
      R.store.state.ui.showRuler = ruler; R.render(); Z.fitZoom(); await sleep(30);
      assert(wrap.scrollWidth <= wrap.clientWidth && wrap.scrollHeight <= wrap.clientHeight, 'ajustada sin desbordar' + (ruler ? ' (con regla)' : ''));
    }
    R.store.state.ui.showRuler = false; R.render();
    D.querySelector('[data-action="zoom-in"]').click(); assert(!Z.zoomFitting(), 'un zoom elegido a mano se respeta');
    D.querySelector('[data-action="zoom-fit"]').click(); assert(Z.zoomFitting(), 'y «Ajustar» vuelve a ajustarla');
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

  await test('navegador: las miniaturas no se aplastan con muchas diapositivas', async () => {
    reset(); for (let i = 0; i < 40; i++) R.slides.addSlide(); await sleep(20);
    const th = [...D.querySelectorAll('#navigator .thumb')];
    eq(th.length, 41, 'cuarenta y una miniaturas');
    assert(th.every(x => x.getBoundingClientRect().height > 40), 'altura normal: ' + th[20].getBoundingClientRect().height.toFixed(0));
  });

  await test('diapositivas verticales (pilas de reveal.js)', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.slides.addSlide();          // 4 diapositivas
    R.slides.goToSlide(2); D.querySelector('[data-action="slide-vertical"]').click(); // la 3 bajo la 2
    R.slides.toggleVertical(3);                                                         // la 4 también
    await sleep(10);
    assert(D.querySelectorAll('#navigator .thumb.is-vertical').length === 2, 'sangradas en el navegador');
    eq([...R.io.slidePathsFor(R.state.deck).values()].join(), '0/0,1/0,1/1,1/2', 'posiciones h/v');
    const html = R.io.buildHTML();
    const top = html.split('<div class="slides">')[1];
    assert(/<section>\s*<section[^>]*>[\s\S]*<\/section>\s*<section[^>]*>[\s\S]*<\/section>\s*<section[^>]*>[\s\S]*<\/section>\s*<\/section>/.test(top), 'pila de tres en una sección');
    R.state.deck.slides[0].blocks[0].html = '<a href="#/3">ir</a>'; assert(/href="#\/1\/2"/.test(R.io.buildHTML()), 'enlace a la 4ª → #/1/2');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([R.io.buildHTML()], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    try { w.Reveal.slide(1, 0); w.Reveal.down(); await sleep(50); eq(w.Reveal.getIndices().v, 1, 'se baja con ↓'); eq(w.Reveal.getTotalSlides(), 4, 'total'); }
    finally { f.remove(); }
  });

  await test('fondos avanzados: vídeo, web, mosaico, opacidad, transición y no contar', async () => {
    reset(); const s = slide(); s.background = 'url(data:image/png;base64,AAAA) center/cover no-repeat';
    D.querySelector('[data-action="bg-advanced"]').click(); await sleep(10);
    const q = x => D.querySelector('#bg-modal ' + x);
    q('.bg-fit').value = 'tile'; q('.bg-op').value = '40'; q('.bg-tr').value = 'zoom'; q('.bg-ok').click(); await sleep(10);
    assert(/top left \/ auto repeat/.test(s.background), 'imagen en mosaico'); eq(s.bgOpacity, 40, 'opacidad');
    assert(D.querySelector('#stage .bg-media') && D.querySelector('#stage .bg-media').style.opacity === '0.4', 'capa translúcida en el lienzo');
    let html = R.io.buildHTML();
    assert(/data-background-transition="zoom"/.test(html), 'transición del fondo'); assert(/opacity:0\.4;pointer-events:none/.test(html), 'opacidad en el export');
    R.slides.setBackgroundOptions({ bgVideo: 'https://ejemplo.org/v.mp4', bgVideoLoop: true, bgVideoMuted: false }); await sleep(10);
    html = R.io.buildHTML();
    assert(/data-background-video="https:\/\/ejemplo\.org\/v\.mp4" data-background-video-loop(?! data-background-video-muted)/.test(html), 'vídeo de fondo con sonido y en bucle');
    assert(/<div class="stage" style="background:transparent">/.test(html), 'la diapositiva deja ver el vídeo');
    assert(D.querySelector('#stage .bg-media video'), 'vídeo de fondo en el lienzo');
    R.slides.setBackgroundOptions({ bgVideo: '', bgIframe: 'https://ejemplo.org', bgInteractive: true }); s.uncounted = true;
    html = R.io.buildHTML();
    assert(/data-background-iframe="https:\/\/ejemplo\.org" data-background-interactive/.test(html) && /class="stage pass"/.test(html), 'web interactiva de fondo');
    assert(/data-visibility="uncounted"/.test(html), 'diapositiva que no cuenta en la numeración');
  });

  await test('fondo con degradado se aplica y se exporta', async () => {
    reset(); slide().background = 'linear-gradient(135deg, #3f6497, #101317)'; R.render(); await sleep(10);
    assert(/style="background:linear-gradient\(135deg, #3f6497, #101317\)"/.test(R.io.buildHTML()), 'degradado en export');
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

  // ---- Master and layouts -----------------------------------------------------
  const M = () => R.master;
  const newLayoutSlide = (id = 'titleContent') => { R.slides.addSlide(id); return slide(); };

  await test('patrón: los marcadores toman el estilo del patrón y cambiarlo cambia todas las diapositivas', async () => {
    reset(); const s1 = newLayoutSlide(), s2 = newLayoutSlide();
    const t1 = s1.blocks.find(b => b.ph === 'title'), t2 = s2.blocks.find(b => b.ph === 'title');
    t1.html = 'Uno'; t2.html = 'Dos'; R.render(); await sleep(20);
    assert(t1.lp && !t1.fontSize, 'enlazado a su diseño y sin tamaño propio');
    M().setMasterStyle('title', { size: 60, color: '#ff0000', font: 'Georgia, serif' }); await sleep(20);
    eq(M().styled(t1, s1).fontSize, 60, 'hereda el tamaño del patrón');
    const W = frame.contentWindow, rich = () => D.querySelector(`.block[data-id="${t2.id}"] .rich`);
    eq(W.getComputedStyle(rich()).fontSize, '60px', 'en el lienzo');
    eq(W.getComputedStyle(rich()).color, 'rgb(255, 0, 0)', 'color del patrón en el lienzo');
    const html = R.io.buildHTML();
    assert(new RegExp(`font-size:60px;color:#ff0000`).test(html) && /Georgia/.test(html), 'en la presentación');
    // Override on one slide: it keeps it when the master changes again.
    R.state.ui.slideIndex = R.state.deck.slides.indexOf(s1); R.state.ui.selection = t1.id; R.render(); await sleep(10);
    R.format.setFontSize(80); R.render();
    M().setMasterStyle('title', { size: 50 });
    eq(M().styled(t1, s1).fontSize, 80, 'lo cambiado a mano se respeta');
    eq(M().styled(t2, s2).fontSize, 50, 'lo demás sigue al patrón');
    eq(D.querySelector('[data-size]').value, '80', 'la cinta muestra el tamaño efectivo');
    // The layout's own size sits between the master and the slide.
    const cover = R.state.deck.layouts.find(l => l.id === 'title');
    R.slides.addSlide('title'); const c = slide(), ct = c.blocks.find(b => b.ph === 'title');
    eq(M().styled(ct, c).fontSize, cover.blocks.find(b => b.ph === 'title').fontSize, 'la portada con su tamaño de diseño');
  });

  await test('patrón: niveles del texto (tamaños y viñetas por nivel) en el lienzo y la presentación', async () => {
    reset(); const s1 = newLayoutSlide(); const body = s1.blocks.find(b => b.ph === 'body');
    body.html = '<ul><li>Uno<ul><li>Dos</li></ul></li></ul>'; R.render(); await sleep(20);
    M().setMasterStyle('body', { size: 36 }, 0); M().setMasterStyle('body', { size: 20, bullet: '–' }, 1); await sleep(20);
    const W = frame.contentWindow, lis = D.querySelectorAll(`.block[data-id="${body.id}"] li`);
    eq(W.getComputedStyle(lis[0]).fontSize, '36px', 'nivel 1');
    eq(W.getComputedStyle(lis[1]).fontSize, '20px', 'nivel 2');
    assert(/–/.test(W.getComputedStyle(lis[1]).listStyleType), 'viñeta del nivel 2: ' + W.getComputedStyle(lis[1]).listStyleType);
    const html = R.io.buildHTML();
    assert(/class="lv"/.test(html) && /--l2:20px/.test(html) && /\.reveal \.lv :is\(ul,ol\) :is\(ul,ol\) li\{font-size:var\(--l2\)\}/.test(html), 'niveles en la presentación');
  });

  await test('diseños: nueva diapositiva con el diseño, mover un marcador del diseño mueve el de las diapositivas, deshacer', async () => {
    reset(); R.slides.addSlide('title'); R.slides.addSlide();
    eq(slide().layoutId, 'titleContent', 'tras la portada, «Título y contenido»');
    const s1 = slide(), b1 = s1.blocks.find(b => b.ph === 'title');
    R.slides.addSlide(); const s2 = slide(), b2 = s2.blocks.find(b => b.ph === 'title');
    b2.x += 50;                                     // moved by hand on this slide
    M().editLayout('titleContent'); await sleep(10);
    const lay = R.state.deck.layouts.find(l => l.id === 'titleContent'), lp = lay.blocks.find(b => b.ph === 'title');
    eq(R.store.currentSlide(), lay, 'el lienzo edita el diseño');
    R.store.commit(() => { lp.y += 40; }); await sleep(10);
    eq(b1.y, lp.y, 'la diapositiva sigue al diseño');
    eq(b2.y, lp.y - 40, 'la movida a mano se queda');
    R.store.undo(); await sleep(10);
    // Undo restores a copy of the deck: look everything up again.
    const D2 = R.state.deck, lay2 = D2.layouts.find(l => l.id === 'titleContent'), lp2 = lay2.blocks.find(b => b.ph === 'title');
    const s1b = D2.slides.find(x => x.id === s1.id), b1b = s1b.blocks.find(b => b.id === b1.id);
    eq(lp2.y, b1b.y, 'deshacer devuelve el diseño y la diapositiva');
    // Layout objects appear under its slides.
    R.store.commit(() => { lay2.blocks.push({ id: 'logo1', type: 'shape', shape: 'rect', x: 10, y: 10, w: 50, h: 50, fill: '#00ff00', rotation: 0, animation: null }); });
    M().toggleMasterEdit(false);
    const D3 = R.state.deck, s1c = D3.slides.find(x => x.id === s1.id);
    R.state.ui.slideIndex = D3.slides.indexOf(s1c); R.render(); await sleep(20);
    assert(M().masterBlocksFor(s1c).some(b => b.id === 'logo1'), 'los objetos del diseño van debajo de sus diapositivas');
    assert(!M().masterBlocksFor(D3.slides[0]).some(b => b.id === 'logo1'), 'no en las de otro diseño');
    assert(/fill="#00ff00"/.test(R.io.buildHTML()), 'y en la presentación');
    // Reset: back to the layout's place and style.
    const s2c = D3.slides.find(x => x.id === s2.id);
    R.state.ui.slideIndex = D3.slides.indexOf(s2c); M().resetSlide();
    const s2d = R.state.deck.slides.find(x => x.id === s2.id), lp3 = R.state.deck.layouts.find(l => l.id === 'titleContent').blocks.find(b => b.ph === 'title');
    eq(s2d.blocks.find(b => b.id === b2.id).x, lp3.x, 'restablecer vuelve al diseño');
  });

  await test('vista de patrón: panel con patrón y diseños, barra, marcadores y estilos de texto', async () => {
    reset(); R.slides.addSlide('titleContent');
    D.querySelector('[data-action="master-edit"]').click(); await sleep(20);
    const thumbs = D.querySelectorAll('#navigator .layout-thumb');
    eq(thumbs.length, 1 + R.state.deck.layouts.length, 'patrón + diseños en el panel');
    assert(!D.getElementById('master-banner').hidden, 'barra del patrón');
    thumbs[2].click(); await sleep(20);
    eq(R.state.ui.editMaster, R.state.deck.layouts[1].id, 'clic en un diseño lo edita');
    assert(/Título y contenido/.test(D.querySelector('#master-banner .mb-text').textContent), 'la barra dice qué diseño');
    assert(D.querySelector('[data-action="layout-delete"]').disabled, 'no se borra un diseño en uso');
    const sel = D.querySelector('#master-banner .mb-ph'); sel.value = 'subtitle'; sel.dispatchEvent(new frame.contentWindow.Event('change'));
    assert(R.store.currentSlide().blocks.some(b => b.ph === 'subtitle'), 'insertar marcador en el diseño');
    D.querySelector('[data-action="layout-new"]').click(); await sleep(10);
    eq(R.state.deck.layouts.at(-1).name, 'Diseño personalizado', 'nuevo diseño');
    D.querySelector('[data-action="master-styles"]').click(); await sleep(10);
    const m = D.getElementById('ts2-modal'); assert(m, 'diálogo de estilos de texto');
    eq(m.querySelectorAll('tbody tr').length, 7, 'título, subtítulo y 5 niveles');
    const size = m.querySelector('tr[data-kind="title"] [data-k="size"]'); size.value = '66'; size.dispatchEvent(new frame.contentWindow.Event('input'));
    eq(M().masterStyles().title.size, 66, 'cambia el estilo del patrón');
    const b3 = m.querySelector('tr[data-kind="body"][data-lv="2"] [data-k="bullet"]'); b3.value = '✓'; b3.dispatchEvent(new frame.contentWindow.Event('change'));
    eq(M().masterStyles().body.levels[2].bullet, '✓', 'viñeta del nivel 3');
    m.querySelector('.modal-close').click();
    D.querySelector('[data-action="master-close"]').click(); await sleep(10);
    assert(!R.state.ui.editMaster && !D.querySelector('#navigator .layout-thumb'), 'al cerrar vuelven las diapositivas');
  });

  await test('presentaciones de ejemplo completas: se abren, usan patrón y diseños y se exportan', async () => {
    reset(); D.querySelector('[data-action="gallery"]').click(); await sleep(50);
    const items = D.querySelectorAll('#gallery-modal .gal-examples .gal-item');
    eq(items.length, Object.keys(R.examples.EXAMPLES).length, 'todos los ejemplos en la galería'); assert(items.length >= 15, 'al menos quince');
    D.querySelector('#gallery-modal .modal-close').click();
    const kinds = new Set();
    for (const key of Object.keys(R.examples.EXAMPLES)) {
      const deck = R.examples.buildExample(key);
      assert(deck.slides.length >= 4, key + ': varias diapositivas');
      assert(deck.master.styles?.title?.font && deck.layouts?.length, key + ': con estilos de patrón y diseños');
      assert(deck.slides.every(s => deck.layouts.some(l => l.id === s.layoutId)), key + ': cada diapositiva con su diseño');
      const ph = deck.slides.flatMap(s => s.blocks.filter(b => b.ph));
      assert(ph.length && ph.every(b => b.lp && b.fontSize == null), key + ': los marcadores heredan del patrón');
      for (const s of deck.slides) for (const b of s.blocks) {
        kinds.add(b.type === 'poll' ? 'poll:' + b.kind : b.type); if (b.animation) kinds.add('anim');
        for (const a of [b.animation, ...(b.anims || [])].filter(Boolean)) kinds.add('fx:' + a.effect), a.turn && kinds.add('turn');
        if (b.anims?.length) kinds.add('several'); if (b.walk) kinds.add('walk'); if (b.motion) kinds.add('motion3d'); if (b.wordart) kinds.add('wordart');
        for (const k of ['curve', 'device', 'wrap', 'sketch', 'fill2']) if (b[k]) kinds.add(k);
      }
      if (deck.slides.some(s => s.autoAnimate)) kinds.add('auto-animate');
      if (deck.slides.some(s => s.vertical)) kinds.add('vertical');
      R.store.replaceDeck(deck); R.render(); await sleep(10);
      const html = R.io.buildHTML();
      eq((html.match(/<section/g) || []).length - (deck.slides.some(s => s.vertical) ? 1 : 0), deck.slides.length, key + ': todas las diapositivas en la presentación');
      assert(!/Haz clic para/.test(html), key + ': sin avisos de marcador vacíos');
    }
    for (const k of ['chart', 'table', 'code', 'math', 'poll:choice', 'poll:qa', 'icon', 'shape', 'anim', 'auto-animate', 'vertical',
      'model', 'walk', 'motion3d', 'fx:clip3d', 'fx:path', 'turn', 'several', 'connector', 'wordart',
      'timer', 'ink', 'fx:draw', 'curve', 'device', 'wrap', 'sketch', 'fill2'])
      assert(kinds.has(k), 'los ejemplos enseñan: ' + k);
    // Opening one from the gallery.
    reset(); D.querySelector('[data-action="gallery"]').click(); await sleep(50);
    // (With an untouched presentation nothing is lost: no question.)
    D.querySelector('#gallery-modal [data-example="coding"]').click(); await sleep(50);
    // (Click numbers worked out: the 3D example's robot walks and waves on one click, dances on the next.)
    const m3 = R.examples.buildExample('moving3d').slides[2].blocks.find(b => b.type === 'model');
    eq([m3.animation, ...m3.anims].map(a => `${a.effect}${a.order}`).join(), 'path1,clip3d1,clip3d2,path3', 'ejemplo 3D: clics en orden');
    assert(!D.querySelector('.modal-backdrop .dlg-ok'), 'sin preguntar si no hay nada que perder');
    eq(R.state.deck.name, 'Taller de programación', 'abre el ejemplo elegido');
    assert(D.querySelector('#stage .block'), 'y se ve en el lienzo');
  });

  await test('marcadores de imagen, tabla y gráfico en los diseños: clic para rellenar, no se exportan vacíos', async () => {
    reset(); R.master.editLayout('titleOnly'); await sleep(10);
    for (const k of ['picture', 'table', 'chart']) { const sel = D.querySelector('#master-banner .mb-ph'); sel.value = k; sel.dispatchEvent(new frame.contentWindow.Event('change')); }
    const lay = R.state.deck.layouts.find(l => l.id === 'titleOnly');
    eq(lay.blocks.filter(b => b.type === 'placeholder').map(b => b.ph).join(), 'picture,table,chart', 'marcadores en el diseño');
    R.master.toggleMasterEdit(false); R.slides.addSlide('titleOnly'); R.render(); await sleep(20);
    const phs = slide().blocks.filter(b => b.type === 'placeholder'); eq(phs.length, 3, 'la diapositiva los recibe');
    assert(!/ph-media/.test(R.io.buildHTML()), 'vacíos no salen en la presentación');
    const tb = phs.find(b => b.ph === 'table');
    D.querySelector(`.block[data-id="${tb.id}"] .ph-media-btn`).click(); await sleep(20);
    const t = slide().blocks.find(b => b.type === 'table');
    assert(t && t.x === tb.x && t.w === tb.w && t.lp === tb.lp, 'la tabla ocupa el hueco del marcador');
    const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const pic = slide().blocks.find(b => b.ph === 'picture');
    R.master.fillPlaceholder(pic.id, { type: 'image', src: img, fit: 'cover' });
    const im = slide().blocks.find(b => b.type === 'image'); assert(im && im.x === pic.x && im.fit === 'cover', 'la imagen también');
    assert(/<img[^>]*data:image\/png/.test(R.io.buildHTML()), 'y ya se exporta');
  });

  await test('varios patrones: cada uno con sus estilos, objetos y diseños', async () => {
    reset(); R.slides.addSlide('titleContent'); const a = slide();
    D.querySelector('[data-action="master-edit"]').click(); await sleep(10);
    D.querySelector('[data-action="master-new"]').click(); await sleep(20);
    const d = R.state.deck; eq(d.masters.length, 1, 'nuevo patrón');
    const m2 = d.masters[0], lays2 = d.layouts.filter(l => l.masterId === m2.id);
    assert(lays2.length === 6 && lays2.every(l => !d.layouts.filter(x => !x.masterId).some(x => x.id === l.id)), 'con su copia de los diseños');
    eq(R.store.currentSlide(), m2, 'se edita el patrón nuevo');
    eq(D.querySelectorAll('#navigator .layout-thumb').length, 2 + d.layouts.length, 'el panel muestra los dos patrones con sus diseños');
    // Styles of the second master only affect slides that use its layouts.
    D.querySelector('[data-action="master-styles"]').click(); await sleep(10);
    const sz = D.querySelector('#ts2-modal tr[data-kind="title"] [data-k="size"]'); sz.value = '70'; sz.dispatchEvent(new frame.contentWindow.Event('input'));
    D.querySelector('#ts2-modal .modal-close').click();
    eq(R.master.masterStyles(d, m2).title.size, 70, 'estilo del patrón nuevo');
    assert(R.master.masterStyles(d).title.size !== 70, 'el principal no cambia');
    R.master.toggleMasterEdit(false);
    R.slides.addSlide(lays2.find(l => l.name === 'Título y contenido').id); const b = slide();
    eq(R.master.styled(b.blocks.find(x => x.ph === 'title'), b).fontSize, 70, 'sus diapositivas lo usan');
    assert(R.master.styled(a.blocks.find(x => x.ph === 'title'), a).fontSize !== 70, 'las del otro patrón no');
    D.querySelector('[data-layout-open]').click(); await sleep(10);
    eq(D.querySelectorAll('.popover .layout-master').length, 2, 'el selector de diseños los agrupa por patrón');
    D.body.click();
    // Deleting: not while a slide uses it.
    R.master.deleteMaster(m2.id); eq(R.state.deck.masters.length, 1, 'no se borra si se usa');
    R.slides.deleteSlide(R.state.deck.slides.indexOf(b)); R.master.deleteMaster(m2.id);
    eq(R.state.deck.masters.length, 0, 'sin uso, se borra con sus diseños'); assert(!R.state.deck.layouts.some(l => l.masterId), 'y sus diseños');
  });

  await test('modo lienzo (tipo Prezi): marcos, vuelo de cámara, vista de lienzo y plantilla', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); const W = frame.contentWindow;
    const C = await W.eval("import('/src/features/design/canvasmode.js')");
    assert(!C.canvasOn(), 'no está activado por defecto');
    assert(!/rv-canvas/.test(R.io.buildHTML()), 'sin él, la presentación de siempre');
    D.querySelector('[data-action="canvas-mode"]').click(); await sleep(50);
    assert(C.canvasOn() && R.state.deck.slides.every(s => s.frame), 'al activarlo, cada diapositiva es un marco');
    assert(D.getElementById('canvas-view'), 'y se abre la vista de lienzo');
    { const v = D.getElementById('canvas-view'), bar = v.querySelector('.cv-bar').getBoundingClientRect(), help = v.querySelector('.cv-help').getBoundingClientRect();
      const fr = [...v.querySelectorAll('.cv-frame')].map(f => f.getBoundingClientRect());
      assert(fr.every(r => r.top >= bar.bottom && r.bottom <= help.top), 'todos los marcos a la vista, sin quedar bajo los botones'); }
    const S = R.state.deck.slides;
    C.setFrame(S[1].id, { x: 1500, y: 300, s: 0.6, r: 0 }); C.setFrame(S[2].id, { x: 1650, y: 380, s: 0.15, r: 25 });
    // Geometry: the camera on a frame shows it exactly.
    const M = C.frameMatrix(S[2].frame, 1280, 720), c = C.apply(M, 640, 360);
    eq(c.map(Math.round).join(), '1650,380', 'el centro del marco'); eq(C.mul(C.inv(M), M).map(v => Math.round(v * 1e6) / 1e6).join(), '1,0,0,1,0,0', 'la cámara es la inversa');
    // Canvas view: drag a frame (one undo step), zoom with the wheel, double-click to edit.
    const cv = D.getElementById('canvas-view'), fr = () => cv.querySelector('.cv-frame[data-i="1"]');
    assert(cv.querySelectorAll('.cv-frame').length === 3 && cv.querySelector('.cv-path'), 'marcos y recorrido');
    const r = fr().getBoundingClientRect(), x0 = S[1].frame.x;
    const ev = (el, type, x, y) => el.dispatchEvent(new W.PointerEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0, pointerId: 1 }));
    ev(fr(), 'pointerdown', r.left + 20, r.top + 20); ev(cv, 'pointermove', r.left + 80, r.top + 20); ev(cv, 'pointerup', r.left + 80, r.top + 20); await sleep(20);
    assert(R.state.deck.slides[1].frame.x > x0, 'arrastrar mueve el marco');
    R.store.undo(); await sleep(20); eq(R.state.deck.slides[1].frame.x, x0, 'un paso de deshacer');
    const t0 = cv.querySelector('.cv-world').style.transform;
    cv.dispatchEvent(new W.WheelEvent('wheel', { deltaY: -200, clientX: 300, clientY: 300, bubbles: true, cancelable: true })); await sleep(10);
    assert(cv.querySelector('.cv-world').style.transform !== t0, 'la rueda acerca');
    fr().dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true })); await sleep(20);
    assert(!D.getElementById('canvas-view') && R.state.ui.slideIndex === 1, 'doble clic: a editar esa diapositiva');
    // The presentation flies between frames; smaller frames on top.
    const html = R.io.buildHTML(R.state.deck, { inApp: true });
    assert(/class="reveal rv-canvas"/.test(html) && /canvasRuntime\(\[/.test(html), 'presentación en modo lienzo');
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:540px;visibility:hidden'; D.body.appendChild(f);
    f.srcdoc = html;
    try {
      for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
      const secs = () => [...f.contentDocument.querySelectorAll('.slides>section')];
      f.contentWindow.Reveal.slide(1); await sleep(100);
      eq(secs()[1].style.transform.replace(/\s/g, ''), 'matrix(1,0,0,1,0,0)', 'el marco actual ocupa la pantalla');
      assert(secs()[0].style.transform && secs()[0].style.transform !== secs()[2].style.transform, 'los demás, en su sitio del lienzo');
      assert(+secs()[2].style.zIndex > +secs()[1].style.zIndex, 'el detalle pequeño queda encima');
      f.contentWindow.dispatchEvent(new f.contentWindow.KeyboardEvent('keydown', { key: 'o', bubbles: true })); await sleep(50);
      assert(f.contentDocument.documentElement.classList.contains('rv-canvas-overview'), 'O: todo el lienzo');
    } finally { f.remove(); }
    // The template.
    const ex = R.examples.buildExample('canvas');
    assert(ex.canvas?.on && ex.slides.every(s => s.frame) && ex.slides[3].frame.s < 0.1, 'plantilla en modo lienzo, con un detalle dentro de otro');
    D.querySelector('[data-action="canvas-mode"]').click(); await sleep(20);
    assert(!C.canvasOn(), 'se puede desactivar'); D.getElementById('canvas-view')?.remove();
  });

  await test('modo lienzo: imagen o diseño del lienzo, de fondo en cada diapositiva', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); const W = frame.contentWindow;
    const C = await W.eval("import('/src/features/design/canvasmode.js')");
    const G = await W.eval("import('/src/features/design/canvasdesigns.js')");
    D.querySelector('[data-action="canvas-mode"]').click(); await sleep(50);
    const S = R.state.deck.slides;
    assert(!C.canvasBackdrop(S[0]), 'sin imagen, sin fondo del lienzo');
    // The designs: all built, same every time, with a route.
    for (const k of Object.keys(G.CANVAS_DESIGNS)) { const d = G.canvasDesign(k); assert(/^data:image\/svg\+xml/.test(d.src) && d.stops.length >= 4, `diseño ${k}`); eq(G.canvasDesign(k).src, d.src, `${k}: siempre igual`); }
    // A picture: covers every frame; each slide shows its part (backdrop maths).
    C.setFrame(S[1].id, { x: 1600, y: 200, s: 0.5, r: 30 });
    C.setCanvasImage('data:image/png;base64,AAAA', { w: 2000, h: 1000 });
    const img = R.state.deck.canvas.image, b = C.bounds(S.map((s, i) => C.frameOf(s, i)), 1280, 720);
    assert(img.x <= b.x0 && img.y <= b.y0 && img.x + img.w >= b.x1 && img.y + img.h >= b.y1, 'la imagen cubre todos los marcos');
    assert(Math.abs(img.w / img.h - 2) < 0.01, 'sin deformarla');
    assert(S.every(s => s.background === 'transparent'), 'las diapositivas, transparentes');
    const bd = C.canvasBackdrop(S[1]), M = C.frameMatrix(S[1].frame, 1280, 720);
    const c = C.apply(M, bd.x + bd.w / 2, bd.y + bd.h / 2);
    assert(Math.hypot(c[0] - (img.x + img.w / 2), c[1] - (img.y + img.h / 2)) < 2, 'su centro, en el centro de la imagen');
    assert(Math.abs(bd.w * 0.5 - img.w) < 1, 'a la escala del marco'); eq(bd.rotation, -30, 'contra el giro del marco');
    assert(R.master.masterBlocksFor(S[1]).some(x => x.backdrop), 'se pinta detrás, como el patrón');
    // Moving a frame: the slide shows the picture's part at its new place (in the
    // canvas view the frame lets the real picture through, also while dragging).
    const cv0 = D.getElementById('canvas-view'), fr1 = () => cv0.querySelector('.cv-frame[data-i="1"]');
    assert(!fr1().querySelector('img[src^="data:image/png"]'), 'en la vista, el marco deja ver la imagen de debajo');
    const thumbSrc = () => D.querySelectorAll('#navigator .thumb')[1]?.innerHTML;
    const th0 = thumbSrc(), bx0 = C.canvasBackdrop(R.state.deck.slides[1]).x, q = fr1().getBoundingClientRect();
    const pe = (el, type, x, y) => el.dispatchEvent(new W.PointerEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0, pointerId: 1 }));
    pe(fr1(), 'pointerdown', q.left + 20, q.top + 20); pe(cv0, 'pointermove', q.left + 90, q.top + 50); pe(cv0, 'pointerup', q.left + 90, q.top + 50); await sleep(30);
    assert(C.canvasBackdrop(R.state.deck.slides[1]).x !== bx0, 'movido el marco, su fondo es la parte de su nuevo sitio');
    assert(thumbSrc() !== th0, 'y la miniatura se actualiza');
    R.store.undo(); await sleep(20);
    // Presenting: the picture is one layer that moves with the camera (not per slide).
    const html = R.io.buildHTML(R.state.deck, { inApp: true });
    assert(/class="rv-world"/.test(html) && !/canvas-backdrop/.test(html), 'una sola capa en la presentación');
    // The canvas view: picture menu, move mode (one undo step).
    const cv = D.getElementById('canvas-view');
    assert(cv.querySelector('.cv-pic') && !cv.querySelector('.cv-move').hidden, 'la vista muestra la imagen');
    cv.querySelector('.cv-move').click(); await sleep(10);
    const r = cv.getBoundingClientRect(), x0 = R.state.deck.canvas.image.x;
    const ev = (el, type, x, y) => el.dispatchEvent(new W.PointerEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0, pointerId: 1 }));
    ev(cv, 'pointerdown', r.left + 400, r.top + 300); ev(cv, 'pointermove', r.left + 460, r.top + 300); ev(cv, 'pointerup', r.left + 460, r.top + 300); await sleep(20);
    assert(R.state.deck.canvas.image.x > x0 && R.state.deck.slides[1].frame.x === 1600, 'arrastrar mueve la imagen, no los marcos');
    R.store.undo(); await sleep(20); eq(R.state.deck.canvas.image.x, x0, 'un paso de deshacer');
    cv.querySelector('.cv-move').click();
    cv.querySelector('[data-cv="image"]').click(); await sleep(10);
    const menu = D.getElementById('cv-menu');
    assert(menu && menu.querySelectorAll('[data-d]').length === Object.keys(G.CANVAS_DESIGNS).length + 2, 'menú: diseños, subir y quitar');
    menu.querySelector('[data-d="none"]').click(); await sleep(20);
    assert(!R.state.deck.canvas.image && !cv.querySelector('.cv-pic'), 'quitar la imagen');
    // A design along its route: the first frame shows it whole, the rest on the stops.
    C.applyCanvasDesign(G.canvasDesign('mountain'), { placeFrames: true }); await sleep(20);
    const T = R.state.deck.slides, im = R.state.deck.canvas.image, f0 = T[0].frame;       // (undo gave a new deck)
    assert(f0.x === im.x + im.w / 2 && f0.s * 1280 <= im.w && f0.s * 1280 > im.w * 0.9, 'la primera, todo el diseño');
    assert(T[1].frame.s < 1 && T[1].frame.x !== T[2].frame.x, 'las demás, por el recorrido');
    const ex = R.examples.buildExample('canvas');
    assert(ex.canvas.image?.src && ex.slides.every(s => s.background === 'transparent'), 'la plantilla lleva su diseño');
    D.querySelector('[data-action="canvas-mode"]').click(); await sleep(20);
    assert(!C.canvasBackdrop(T[1]), 'desactivado, sin fondo del lienzo'); D.getElementById('canvas-view')?.remove();
  });
}
