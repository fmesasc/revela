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
    // Many slides: each one whole (16:9), the grid scrolls — not rows squashed to fit the window.
    for (let i = 0; i < 40; i++) R.slides.addSlide('blank');
    D.querySelector('[data-action="slide-sorter"]').click(); await sleep(60);
    const th = [...nav.querySelectorAll('.thumb .thumb-canvas')], bad = th.filter(c => Math.abs(c.offsetHeight - c.offsetWidth * 9 / 16) > 3);
    assert(th.length > 40 && !bad.length && nav.scrollHeight > nav.clientHeight, `todas enteras, con desplazamiento (${bad.length} cortadas)`);
    key('Escape'); await sleep(20);
  });

  // ---- Several slides selected in the panel (PowerPoint: Ctrl/Cmd+click, Shift+click) ----
  const multiSetup = async (n = 6) => {
    reset(); for (let i = 1; i < n; i++) R.slides.addSlide('blank');
    R.store.commit(() => R.state.deck.slides.forEach((s, i) => { s.notes = 'n' + i; }));
    R.slides.goToSlide(0); await sleep(20);
    const W = frame.contentWindow, th = () => [...D.querySelectorAll('#navigator .thumb')];
    const click = async (i, o = {}) => { th()[i].dispatchEvent(new W.PointerEvent('pointerdown', { bubbles: true })); th()[i].dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true, ...o })); await sleep(10); };
    const key = async (k, o = {}) => { D.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o })); await sleep(10); };
    const order = () => R.state.deck.slides.map(s => s.notes).join();
    const sel = () => R.store.selectedSlideIndices().join();
    return { W, th, click, key, order, sel };
  };

  await test('varias diapositivas: Ctrl+clic, Mayús+clic, Mayús+flechas, Ctrl+A, Esc y barra de estado', async () => {
    const { W, th, click, key, sel } = await multiSetup();
    await click(1); await click(3, { ctrlKey: true });
    eq(sel(), '1,3', 'Ctrl+clic añade');
    eq(D.querySelector('[data-action="clip-copy"]').disabled, false, 'Copiar en la cinta, para las diapositivas'); eq(R.state.ui.slideIndex, 3, 'la última pulsada se ve en el lienzo');
    assert(th()[1].classList.contains('selected') && th()[3].classList.contains('selected') && !th()[2].classList.contains('selected'), 'se marcan las seleccionadas');
    assert(th()[3].classList.contains('active') && !th()[1].classList.contains('active'), 'la actual se distingue de las demás seleccionadas');
    assert(/2 diapositivas seleccionadas/.test(D.getElementById('status-slide').textContent), 'la barra de estado lo dice: ' + D.getElementById('status-slide').textContent);
    await click(4, { metaKey: true }); eq(sel(), '1,3,4', 'Cmd+clic (Mac) también');
    await click(4, { ctrlKey: true }); eq(sel(), '1,3', 'Ctrl+clic otra vez la quita'); eq(R.state.ui.slideIndex, 3, 'y se ve la última que queda');
    await click(1); eq(sel(), '1', 'un clic: solo esa');
    await click(4, { shiftKey: true }); eq(sel(), '1,2,3,4', 'Mayús+clic: el intervalo desde la anterior');
    await key('ArrowDown', { shiftKey: true }); eq(sel(), '1,2,3,4,5', 'Mayús+↓ lo amplía');
    await key('ArrowUp', { shiftKey: true }); await key('ArrowUp', { shiftKey: true }); eq(sel(), '1,2,3', 'Mayús+↑ lo reduce desde el ancla');
    await key('Escape'); eq(sel(), '3', 'Esc deja solo la actual');
    await key('a', { ctrlKey: true }); eq(sel(), '0,1,2,3,4,5', 'Ctrl+A en el panel: todas');
    eq(R.state.ui.multi.length, 0, '(no los objetos de la diapositiva)');
    D.getElementById('stage').dispatchEvent(new W.PointerEvent('pointerdown', { bubbles: true })); await sleep(10);
    eq(sel(), '3', 'un clic en la diapositiva deja solo la actual');
    // Without the panel clicked last, Ctrl+A is still the slide's objects.
    await key('a', { ctrlKey: true }); eq(R.store.slideSelCount(), 1, 'Ctrl+A en la diapositiva no selecciona diapositivas');
  });

  await test('varias diapositivas: duplicar, eliminar, mover en grupo, cortar y pegar, ocultar; cada acción se deshace de una vez', async () => {
    const { W, th, click, key, order, sel } = await multiSetup();
    const base = 'n0,n1,n2,n3,n4,n5';
    await click(1); await click(3, { ctrlKey: true }); await click(4, { ctrlKey: true });
    D.querySelector('[data-action="slide-duplicate"]').click(); await sleep(10);
    eq(order(), 'n0,n1,n2,n3,n4,n1,n3,n4,n5', 'copias en orden, tras la última seleccionada');
    eq(sel(), '5,6,7', 'las copias quedan seleccionadas');
    R.store.undo(); await sleep(10); eq(order(), base, 'un solo paso para deshacer');
    await click(1); await click(3, { ctrlKey: true }); await click(4, { ctrlKey: true });
    await key('Delete'); eq(order(), 'n0,n2,n5', 'Supr en el panel borra las seleccionadas');
    eq(R.store.slideSelCount(), 1, 'queda solo la actual');
    R.store.undo(); await sleep(10); eq(order(), base, 'deshacer las recupera de una vez');
    // Drag the group: they keep their order.
    await click(0); await click(2, { ctrlKey: true });
    const dt = new W.DataTransfer();
    th()[2].dispatchEvent(new W.DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    assert(th()[0].classList.contains('dragging') && th()[2].classList.contains('dragging'), 'se arrastran todas las seleccionadas');
    th()[4].dispatchEvent(new W.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    th()[4].dispatchEvent(new W.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    th()[2]?.dispatchEvent(new W.DragEvent('dragend', { bubbles: true, dataTransfer: dt })); await sleep(10);
    eq(order(), 'n1,n3,n4,n0,n2,n5', 'arrastrar mueve el grupo tras la de destino');
    eq(R.state.deck.slides[R.state.ui.slideIndex].notes, 'n2', 'la actual sigue siendo la misma');
    R.store.undo(); await sleep(10); eq(order(), base, 'mover: un solo paso');
    R.slides.goToSlide(4); R.slides.selectSlide(5, { toggle: true }); R.slides.moveSlides(R.state.ui.slideSel, 1); eq(order(), 'n0,n4,n5,n1,n2,n3', 'hacia arriba: delante de la de destino');
    R.store.undo(); await sleep(10);
    // Cut and paste.
    await click(1); await click(2, { shiftKey: true });
    await key('x', { ctrlKey: true }); eq(order(), 'n0,n3,n4,n5', 'Ctrl+X corta las seleccionadas');
    await click(2);
    D.dispatchEvent(new W.ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: new W.DataTransfer() })); await sleep(10);
    eq(order(), 'n0,n3,n4,n1,n2,n5', 'Ctrl+V las pega tras la seleccionada'); eq(sel(), '3,4', 'y quedan seleccionadas');
    await key('c', { ctrlKey: true }); R.slides.goToSlide(0); R.slides.pasteSlides(); eq(order(), 'n0,n1,n2,n3,n4,n1,n2,n5', 'copiar y pegar');
    R.store.undo(); R.store.undo(); R.store.undo(); await sleep(10); eq(order(), base, 'cortar y pegar se deshacen paso a paso');
    // Hide / show.
    R.slides.goToSlide(1); R.slides.selectSlide(3, { toggle: true });
    R.slides.toggleSlideHidden(); assert(R.state.deck.slides[1].hidden && R.state.deck.slides[3].hidden && !R.state.deck.slides[2].hidden, 'ocultar las seleccionadas');
    R.slides.toggleSlideHidden(); assert(!R.state.deck.slides[1].hidden && !R.state.deck.slides[3].hidden, 'y mostrarlas');
    R.store.undo(); assert(R.state.deck.slides[1].hidden && R.state.deck.slides[3].hidden, 'deshacer: las dos a la vez');
    // Into a section.
    R.slides.goToSlide(1); R.slides.selectSlide(4, { toggle: true }); const sec = R.slides.sectionFromSlides(R.state.ui.slideSel);
    eq(R.state.deck.slides.filter(s => s.sectionId === sec).map(s => s.notes).join(), 'n1,n4', 'sección con las seleccionadas'); eq(order(), 'n0,n1,n4,n2,n3,n5', 'juntas, donde estaba la primera');
  });

  await test('varias diapositivas: diseño, restablecer, fondo, formato del fondo, transición, velocidad y avance automático a todas las seleccionadas', async () => {
    const { W, click } = await multiSetup(5);
    await click(1); await click(3, { shiftKey: true });
    eq(D.querySelector('[data-action="slide-delete"]').title.includes('3 diapositivas seleccionadas'), true, 'la cinta avisa de que se aplica a la selección');
    assert(!/seleccionadas/.test(D.querySelector('[data-action="trans-apply-all"]').title), '«Aplicar a todas» sigue igual');
    D.querySelector('[data-layout-open]').click(); await sleep(10);
    D.querySelector('.popover [data-layout="titleContent"]').click(); await sleep(10);
    const lays = () => R.state.deck.slides.slice(1).map(s => s.layoutId).join(), l0 = R.state.deck.slides[0].layoutId;
    eq(lays(), 'titleContent,titleContent,titleContent,blank', 'diseño en las tres'); eq(R.state.deck.slides[0].layoutId, l0, 'no en las demás');
    // Reset (Inicio ▸ Diseño ▸ Restablecer) on two of them.
    R.store.commit(() => R.state.deck.slides.forEach(s => s.blocks.forEach(b => { b.x += 33; })));
    const lp = R.state.deck.layouts.find(l => l.id === 'titleContent').blocks.find(b => b.ph === 'title');
    const tx = i => R.state.deck.slides[i].blocks.find(b => b.ph === 'title').x;
    R.slides.goToSlide(1); R.slides.selectSlide(2, { range: true }); R.master.resetSlide();
    assert(tx(1) === lp.x && tx(2) === lp.x && tx(3) === lp.x + 33, 'restablecer: las seleccionadas, no las demás');
    R.store.undo(); R.store.undo(); R.store.undo(); await sleep(10); eq(lays(), 'blank,blank,blank,blank', 'el diseño se deshace en un solo paso');
    eq(R.store.slideSelCount(), 2, 'deshacer no pierde la selección');
    R.slides.goToSlide(1); R.slides.selectSlide(3, { range: true }); await sleep(10);
    const bg = D.querySelector('[data-bg]'); bg.value = '#123456'; bg.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(10);
    eq(R.state.deck.slides.map(s => s.background === '#123456').join(), 'false,true,true,true,false', 'color de fondo en las seleccionadas');
    D.querySelector('[data-action="bg-gradient"]').click(); await sleep(10);
    assert(R.state.deck.slides.slice(1, 4).every(s => /gradient/.test(s.background)) && !/gradient/.test(R.state.deck.slides[0].background), 'degradado en las seleccionadas');
    D.querySelector('[data-page="design"] [data-action="bg-advanced"]').click(); await sleep(10);
    assert(/3 diapositivas seleccionadas/.test(D.querySelector('#bg-modal h3').textContent), 'el diálogo dice a cuántas se aplica');
    D.querySelector('#bg-modal .bg-op').value = '50'; D.querySelector('#bg-modal .bg-ok').click(); await sleep(10);
    eq(R.state.deck.slides.map(s => s.bgOpacity || '').join(), ',50,50,50,', 'formato del fondo en las seleccionadas');
    D.querySelector('[data-slide-transition="fade"]').click(); await sleep(10);
    eq(R.state.deck.slides.map(s => s.transition || '').join(), ',fade,fade,fade,', 'transición en las tres');
    const sp = D.querySelector('[data-slide-speed]'); sp.value = 'slow'; sp.dispatchEvent(new W.Event('change', { bubbles: true })); await sleep(10);
    eq(R.state.deck.slides.map(s => s.transitionSpeed || '').join(), ',slow,slow,slow,', 'velocidad en las tres');
    const au = D.querySelector('[data-autoslide]'); au.value = '4'; au.dispatchEvent(new W.Event('change', { bubbles: true })); await sleep(10);
    eq(R.state.deck.slides.map(s => s.autoSlide || 0).join(), '0,4000,4000,4000,0', 'avance automático en las tres');
    R.store.undo(); await sleep(10); eq(R.state.deck.slides.map(s => s.autoSlide || 0).join(), '0,0,0,0,0', 'cada cambio, un paso');
    // Context menu on a selected thumbnail: the multi actions, with how many.
    R.slides.goToSlide(1); R.slides.selectSlide(3, { range: true });
    D.querySelectorAll('#navigator .thumb')[2].dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 200 })); await sleep(10);
    const items = [...D.querySelectorAll('#context-menu .ctx-item')].map(x => x.textContent);
    assert(items.includes('Eliminar 3 diapositivas') && items.includes('Duplicar 3 diapositivas') && items.includes('Ocultar 3 diapositivas'), 'menú con las acciones y cuántas: ' + items.join('|'));
    eq(R.store.slideSelCount(), 3, 'el clic derecho en una seleccionada no deshace la selección');
    [...D.querySelectorAll('#context-menu .ctx-item')].find(x => x.textContent === 'Eliminar 3 diapositivas').click(); await sleep(10);
    eq(R.state.deck.slides.length, 2, 'eliminadas desde el menú');
    R.store.undo(); D.getElementById('context-menu').hidden = true;
  });

  await test('varias diapositivas: en el clasificador, con Ctrl+clic, Mayús+flechas y Supr', async () => {
    const { W, th, click, key, order, sel } = await multiSetup();
    D.querySelector('#statusbar [data-action="slide-sorter"]').click(); await sleep(60);
    try {
      await click(0); await click(2, { ctrlKey: true });
      assert(th()[0].classList.contains('selected') && th()[2].classList.contains('selected'), 'se marcan en la cuadrícula');
      await key('ArrowRight', { shiftKey: true }); eq(sel(), '2,3', 'Mayús+→ amplía desde el ancla');
      await key('Escape'); eq(sel(), '3', 'Esc: solo la actual'); assert(D.body.classList.contains('sorter'), 'y sigue en el clasificador');
      await key('a', { ctrlKey: true }); eq(R.store.slideSelCount(), 6, 'Ctrl+A: todas');
      await click(1); await click(4, { shiftKey: true }); await key('Delete');
      eq(order(), 'n0,n5', 'Supr borra las seleccionadas');
      R.store.undo(); await sleep(10); eq(order(), 'n0,n1,n2,n3,n4,n5', 'un paso');
    } finally { D.body.classList.contains('sorter') && D.querySelector('[data-action="slide-sorter"]').click(); await sleep(20); }
  });

  await test('varias diapositivas: cambios de otro (coedición) quitan las que desaparecen; el asistente ofrece «Diapositivas seleccionadas»', async () => {
    const { click, sel } = await multiSetup(5);
    await click(1); await click(2, { ctrlKey: true }); await click(4, { ctrlKey: true });
    const gone = R.state.deck.slides[2].id;
    R.store.applyRemote(d => { d.slides = d.slides.filter(s => s.id !== gone); }); await sleep(10);
    eq(sel(), '1,3', 'la borrada por otro sale de la selección; las demás siguen');
    R.store.applyRemote(d => { d.slides.splice(0, 0, { ...structuredClone(d.slides[0]), id: 'remota' }); }); await sleep(10);
    eq(R.store.targetSlides().map(s => s.notes).join(), 'n1,n4', 'una añadida por otro no cambia qué está seleccionado');
    // The assistant's scope.
    D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
    try {
      const opt = D.querySelector('#assistant-panel .as-scope option[value="slides"]'); assert(opt, 'opción en el alcance');
      eq(opt.hidden, false, 'visible con varias seleccionadas');
      eq(R.aiAgent.scopeOf({ kind: 'slides' }).idx.map(i => R.state.deck.slides[i].notes).join(), 'n1,n4', 'el alcance son las seleccionadas');
      const C = await frame.contentWindow.eval("import('/src/features/ai/complete.js')");
      eq(C.targetsOf({ scope: { kind: 'slides' }, mode: 'improve' }).map(x => x.s.notes).join(), 'n1,n4', 'también al completar');
      R.slides.goToSlide(0); await sleep(10);
      eq(D.querySelector('#assistant-panel .as-scope option[value="slides"]').hidden, true, 'oculta con una sola');
    } finally { D.getElementById('assistant-panel') && D.querySelector('[data-action="ai-assistant"]').click(); }
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
    assert(m.querySelector('.bk-web').hidden, 'sacar la marca de una web: solo con cuentas (lo lee el servidor)');
    const fs = K.kitFromSite({ name: 'Escola Mar Blava', colors: ['#fffdf8', '#222222', '#0b5fa5', 'rojo'], fonts: { heading: 'montserrat', body: 'Fuente Rara' }, logos: ['data:image/png;base64,AA==', 'javascript:x'] });
    eq(fs.kit.name + '|' + fs.kit.colors.join() + '|' + fs.kit.fonts.heading + '|' + fs.kit.fonts.body + '|' + fs.kit.logos.length, 'Escola Mar Blava|#fffdf8,#222222,#0b5fa5|Montserrat||1', 'de una web a un kit: fuentes del catálogo, colores y logotipos válidos');
    eq(fs.missing.join(), 'Fuente Rara', 'y dice qué fuentes de la web no están en el catálogo');
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
    // (In the slides themselves: between two with the same background, a still copy of it waits under them too.)
    const inSlides = () => new DOMParser().parseFromString(R.io.buildHTML(), 'text/html').querySelectorAll('section [fill="#ff00aa"]').length;
    eq(inSlides(), 2, 'en las dos diapositivas del export');
    R.master.toggleHideMaster(1);
    eq(inSlides(), 1, 'oculto en la segunda');
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
    eq(slide().layoutId, 'twoContent', 'Insertar ▸ «Dos contenidos» aplica el diseño de la presentación (como Inicio ▸ Diseño)');
    eq((sec.match(/<div[^>]*font-size:30px/g) || []).length, 1, 'el marcador vacío no se exporta');
  });

  await test('presentación en blanco: marcadores vacíos con su indicación solo en el editor (si se olvidan, no salen al presentar)', async () => {
    R.store.replaceDeck(R.model.emptyDeck()); R.render(); await sleep(20);
    const [a, b] = slide().blocks;
    eq([a.ph, b.ph, a.html, b.html].join('|'), 'title|subtitle||', 'título y subtítulo: marcadores sin texto');
    assert(R.model.isBlankDeck(R.state.deck), 'cuenta como presentación vacía');
    const prompts = [...D.querySelectorAll('#stage .rich[data-ph]')].map(e => e.dataset.ph);
    eq(prompts.length, 2, 'el editor muestra la indicación de los dos'); assert(/título/i.test(prompts[0]) && /subtítulo/i.test(prompts[1]), 'indicaciones: ' + prompts);
    const html = R.io.buildHTML();
    assert(!/[A-Za-zÁ-ú]/.test((html.split('<section')[1] || '').split('</section>')[0].replace(/<[^>]*>/g, '').replace(/ data-[^>]*/, '')), 'al presentar no sale ningún texto');
    // A deck saved with the first version's sample texts still counts as untouched.
    const old = R.model.emptyDeck(); old.slides[0].blocks.forEach(x => { delete x.ph; }); old.slides[0].blocks[0].html = '<b>Título</b>'; old.slides[0].blocks[1].html = 'Subtítulo — doble clic para editar';
    assert(R.model.isBlankDeck(old), 'con los textos antiguos, también vacía');
    old.slides[0].blocks[0].html = 'Mi título'; assert(!R.model.isBlankDeck(old), 'con texto propio, no');
  });

  await test('galería de plantillas: presentaciones completas', async () => {
    reset(); D.querySelector('[data-action="gallery"]').click(); await sleep(20);
    eq(D.querySelectorAll('#gallery-modal .gal-grid:not(.gal-examples) .gal-item').length, Object.keys(R.gallery.GALLERY).length + 1, 'una miniatura por plantilla, y «En blanco»');
    assert(D.querySelector('#gallery-modal .gal-grid').classList.contains('gal-examples'), 'primero las presentaciones de ejemplo, después las plantillas en blanco');
    // With changes, choosing asks first; «En blanco» starts an empty one.
    R.store.commit(() => { slide().blocks[0].html = 'Algo mío'; }); await sleep(10);
    D.querySelector('#gallery-modal [data-gallery="blank"]').click(); await sleep(20);
    assert(D.querySelector('.modal-backdrop .dlg-ok'), 'con cambios, pregunta antes');
    D.querySelector('.modal-backdrop .dlg-ok').click(); await sleep(20);
    assert(R.model.isBlankDeck(R.state.deck), '«En blanco»: una presentación vacía');
    D.querySelector('#gallery-modal .modal-close')?.click();
    // The three ways to start, first: blank, made by the AI, or a file one has.
    D.querySelector('[data-action="gallery"]').click(); await sleep(20);
    const paths = [...D.querySelectorAll('#gallery-modal .gal-start .gal-path')];
    eq(paths.map(b => b.dataset.path).join(), 'blank,ai,open', 'tres caminos arriba');
    assert(paths[0].compareDocumentPosition(D.querySelector('#gallery-modal .gal-examples')) & 4, 'antes que los ejemplos');
    paths[1].click(); await sleep(20);
    assert(!D.getElementById('gallery-modal') && D.getElementById('aideck-modal'), '«Crear con IA» abre su ventana');
    D.querySelector('#aideck-modal .modal-close').click();
    // The untitled name, in the interface's language (the deck keeps one name for all of them).
    eq(R.state.deck.name, R.model.UNTITLED, 'sin título'); const L = await frame.contentWindow.eval("import('/src/i18n/index.js')");
    await L.setLang('en'); R.render(); await sleep(20);
    eq(D.querySelector('.doc-name').textContent, 'Untitled presentation', 'en inglés, «Untitled presentation»');
    assert(/Assistant/.test(D.querySelector('.tb-ai').textContent), 'el botón del asistente, también');
    await L.setLang('es'); R.render(); await sleep(20);
    eq(D.querySelector('.doc-name').textContent, 'Presentación sin título', 'y de vuelta');
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
    eq(D.querySelectorAll('#ideas-modal .gal-item:not(.gal-ai)').length, 5, 'miniaturas de las ideas'); assert(D.querySelector('#ideas-modal .gal-ai'), 'y «más ideas con IA»');
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
    assert(/class="lv"/.test(html) && /--l2:20px/.test(html) && /\.reveal \.lv :is\(ul,ol\) :is\(ul,ol\) li\{font-size:var\(--l2\)[;}]/.test(html), 'niveles en la presentación');
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
    assert(!D.querySelector('#ribbon [data-tab="master"]').hidden && R.state.ui.activeTab === 'master', 'se abre la pestaña «Patrón de diapositivas»');
    thumbs[2].click(); await sleep(20);
    eq(R.state.ui.editMaster, R.state.deck.layouts[1].id, 'clic en un diseño lo edita');
    assert(/Título y contenido/.test(D.querySelector('#master-banner .mb-text').textContent), 'la barra dice qué diseño');
    const del = D.querySelector('[data-action="master-item-delete"]');
    assert(!del.disabled && /1 diapositiva/.test(del.title), 'un diseño en uso se puede eliminar (sus diapositivas pasan a otro): ' + del.title);
    const sel = D.querySelector('#ribbon .mb-ph'); sel.value = 'subtitle'; sel.dispatchEvent(new frame.contentWindow.Event('change'));
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
    assert(D.querySelector('#ribbon [data-tab="master"]').hidden && R.state.ui.activeTab === 'home', 'y la pestaña del patrón se va');
  });

  await test('vista de patrón: árbol (patrón y sus diseños), «Usado por N diapositivas», menú, reordenar y eliminar reasignando', async () => {
    reset(); const W = frame.contentWindow;
    R.slides.addSlide('titleContent'); R.slides.addSlide('titleContent'); R.slides.addSlide('twoContent');
    const two = slide(); two.blocks[0].html = 'Mi título'; two.blocks[1].html = 'Columna'; R.render();
    D.querySelector('[data-page="view"] [data-action="master-edit"]').click(); await sleep(20);
    const lays = R.state.deck.layouts, mt = D.querySelector('#navigator .master-tree .layout-thumb.is-master');
    assert(mt, 'el patrón arriba'); eq(D.querySelectorAll('#navigator .master-kids .layout-thumb').length, lays.length, 'y sus diseños colgando de él');
    assert(mt.getBoundingClientRect().width > D.querySelector('.master-kids .layout-thumb').getBoundingClientRect().width, 'el patrón, más grande');
    const tc = D.querySelector('.layout-thumb[data-edit="titleContent"]');
    assert(/Usado por 2 diapositivas/.test(tc.title), 'aviso de uso: ' + tc.title); eq(tc.querySelector('.lt-count').textContent, '2', 'y el número');
    assert(/No lo usa ninguna diapositiva/.test(D.querySelector('.layout-thumb[data-edit="blank"]').title), 'sin uso');
    // Right-click: the layout's menu.
    const menu = el => { const r = el.getBoundingClientRect(); el.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: r.left + 20, clientY: r.top + 20 })); return [...D.querySelectorAll('#context-menu .ctx-item')]; };
    const pick = (items, text) => { const it = items.find(x => x.textContent === text); assert(it, 'opción: ' + text); it.click(); };
    let items = menu(D.querySelector('.layout-thumb[data-edit="twoContent"]'));
    eq(R.state.ui.editMaster, 'twoContent', 'clic derecho lo selecciona');
    for (const x of ['Insertar diseño', 'Duplicar diseño', 'Cambiar nombre…', 'Eliminar diseño', 'Subir', 'Bajar', 'Ocultar gráficos del patrón', 'Cerrar vista Patrón']) assert(items.some(i => i.textContent === x), 'opción ' + x);
    const order = () => R.state.deck.layouts.map(l => l.id).join();
    pick(items, 'Subir'); await sleep(10);
    eq(order().split(',').indexOf('twoContent'), 1, 'sube un puesto');
    R.master.moveLayoutTo('twoContent', 'blank'); eq(R.state.deck.layouts.at(-1).id, 'twoContent', 'arrastrado al final');
    R.store.undo(); R.store.undo(); eq(R.state.deck.layouts[2].id, 'twoContent', 'deshacer devuelve el orden');
    // Delete a layout in use: its slides move to another one, keeping their text.
    R.master.editLayout('twoContent'); await sleep(10);
    D.querySelector('[data-action="master-item-delete"]').click(); await sleep(10);
    const dlg = D.querySelector('.modal-backdrop .dlg-msg');
    eq(dlg?.textContent, 'Lo usa 1 diapositiva: pasará al diseño «Título y contenido», con lo que tenga escrito. ¿Eliminar el diseño?', 'avisa de a qué diseño pasa');
    D.querySelector('.modal-backdrop .dlg-ok').click(); await sleep(20);
    assert(!R.state.deck.layouts.some(l => l.id === 'twoContent'), 'diseño eliminado');
    const moved = R.state.deck.slides.find(s => s.id === two.id);
    eq(moved.layoutId, 'titleContent', 'su diapositiva pasa a «Título y contenido»');
    assert(moved.blocks.some(b => b.html === 'Mi título') && moved.blocks.some(b => b.html === 'Columna'), 'sin perder lo escrito');
    assert(R.state.ui.editMaster && R.state.ui.editMaster !== 'twoContent', 'queda seleccionado otro');
    // Rename and insert from the ribbon.
    D.querySelector('[data-page="master"] [data-action="layout-new"]').click(); await sleep(10);
    const nl = R.state.deck.layouts.find(l => l.id === R.state.ui.editMaster);
    assert(nl && nl.blocks.some(b => b.ph === 'title'), 'un diseño nuevo, con su título');
    D.querySelector('[data-page="master"] [data-action="layout-rename"]').click(); await sleep(10);
    const inp = D.querySelector('.modal-backdrop .dlg-in'); inp.value = 'Mi diseño'; D.querySelector('.modal-backdrop .dlg-ok').click(); await sleep(10);
    eq(nl.name, 'Mi diseño', 'renombrado'); assert(D.querySelector(`.layout-thumb[data-edit="${nl.id}"]`).textContent.includes('Mi diseño'), 'en el panel');
    R.master.toggleMasterEdit(false);
  });

  await test('patrón: los diseños heredan su fondo y sus gráficos (salvo que digan otra cosa), y las diapositivas los de su diseño', async () => {
    reset(); const W = frame.contentWindow;
    R.slides.addSlide('titleContent'); const a = slide(); R.slides.addSlide('twoContent'); const b = slide();
    R.slides.addSlide('titleContent'); const own = slide(); R.store.commit(() => { own.background = '#ff0000'; });
    D.querySelector('[data-action="master-edit"]').click(); await sleep(10);
    R.store.commit(() => { R.state.deck.master.blocks.push({ id: 'deco', type: 'shape', shape: 'rect', x: 0, y: 690, w: 1280, h: 30, fill: '#e0873b', rotation: 0, animation: null }); });
    // Master background from the ribbon: layouts and slides follow; a slide with its own keeps it.
    const col = D.querySelector('[data-page="master"] [data-master-bg]'); col.value = '#123456'; col.dispatchEvent(new W.Event('input')); await sleep(10);
    const S = id => R.state.deck.slides.find(s => s.id === id), L = id => R.state.deck.layouts.find(l => l.id === id);
    eq(R.state.deck.master.background, '#123456', 'fondo del patrón');
    eq(S(a.id).background, '#123456', 'las diapositivas lo toman'); eq(S(b.id).background, '#123456', 'todas');
    eq(S(own.id).background, '#ff0000', 'salvo la que tenía uno propio');
    eq(R.master.viewBackground(L('titleContent')), '#123456', 'el diseño hereda el fondo del patrón');
    assert(/18, 52, 86|#123456/i.test(D.querySelector('.layout-thumb[data-edit="titleContent"] .thumb-canvas').style.background), 'y se ve en su miniatura');
    // A layout with its own background: «Usar fondo del patrón» off.
    R.master.editLayout('twoContent'); await sleep(10);
    const useBg = D.querySelector('[data-action="layout-master-bg"]');
    assert(useBg.classList.contains('on'), '«Usar fondo del patrón» activado por defecto');
    useBg.click(); await sleep(10); assert(!useBg.classList.contains('on') && L('twoContent').background, 'desactivado: fondo propio');
    col.value = '#00ff00'; col.dispatchEvent(new W.Event('input')); await sleep(10);
    eq(L('twoContent').background, '#00ff00', 'el fondo del diseño'); eq(S(b.id).background, '#00ff00', 'sus diapositivas lo toman');
    eq(S(a.id).background, '#123456', 'las de otros diseños no');
    useBg.click(); await sleep(10);
    eq(L('twoContent').background, null, 'otra vez el del patrón'); eq(S(b.id).background, '#123456', 'y sus diapositivas también');
    // «Ocultar gráficos del patrón».
    R.master.editLayout('titleContent'); await sleep(10);
    assert(R.master.masterBlocksFor(S(a.id)).some(x => x.id === 'deco'), 'los gráficos del patrón bajo la diapositiva');
    D.querySelector('[data-action="layout-hide-graphics"]').click(); await sleep(10);
    assert(L('titleContent').hideMaster && D.querySelector('[data-action="layout-hide-graphics"]').classList.contains('on'), 'ocultos en el diseño');
    assert(!R.master.masterBlocksFor(S(a.id)).some(x => x.id === 'deco'), 'y en sus diapositivas');
    assert(R.master.masterBlocksFor(S(b.id)).some(x => x.id === 'deco'), 'no en las de otros diseños');
    assert(D.querySelector('.layout-thumb[data-edit="titleContent"] .layout-name .ms'), 'la miniatura lo indica');
    // Text styles of the master reach the layouts' placeholders.
    R.master.setMasterStyle('title', { size: 58 });
    const lp = L('titleContent').blocks.find(x => x.ph === 'title');
    eq(R.master.styled(lp, L('titleContent')).fontSize, 58, 'el marcador del diseño hereda el estilo del patrón');
    // Back to the slides: a new one takes its layout's background; the master is not editable there.
    D.querySelector('#master-banner [data-action="master-close"]').click(); await sleep(10);
    R.slides.addSlide('titleContent'); eq(slide().background, '#123456', 'diapositiva nueva con el fondo de su diseño');
    assert(!R.state.ui.editMaster && !slide().blocks.some(x => x.id === 'deco'), 'los gráficos del patrón no son de la diapositiva');
    // Another document does not take this one's changes.
    R.store.replaceDeck(R.model.emptyDeck()); R.render(); eq(R.state.deck.slides[0].background, '#101317', 'otro documento, su fondo');
  });

  await test('menús coherentes: cada orden en su sitio y con el mismo nombre', async () => {
    reset(); const W = frame.contentWindow;
    const inPage = (page, act) => !!D.querySelector(`.ribbon-page[data-page="${page}"] [data-action="${act}"]`);
    const views = [...D.querySelectorAll('.ribbon-page[data-page="view"] .group')].find(g => g.querySelector('label:last-child')?.textContent === 'Vistas');
    assert(views, 'Ver ▸ Vistas');
    for (const a of ['slide-sorter', 'toggle-nav', 'canvas-view', 'master-edit']) assert(views.querySelector(`[data-action="${a}"]`), 'en Vistas: ' + a);
    assert(!inPage('design', 'canvas-view'), 'la vista de lienzo es una vista (Ver), no un ajuste de Diseño');
    assert(inPage('design', 'master-edit'), 'el patrón también desde Diseño ▸ Tema');
    assert(/^Formato\s*del fondo$/.test(D.querySelector('.ribbon-page[data-page="design"] [data-action="bg-advanced"] span').textContent.trim()), 'Diseño ▸ «Formato del fondo», como en el menú contextual');
    const brand = D.querySelector('.ribbon-page[data-page="design"] [data-action="brand-kit"]').closest('.group');
    eq(brand.querySelector(':scope>label').textContent, 'Marca', 'el kit de marca, con la marca');
    D.querySelector('[data-action="bg-advanced"]').click(); await sleep(10);
    eq(D.querySelector('#bg-modal h3').textContent, 'Formato del fondo', 'el diálogo se llama igual'); D.querySelector('#bg-modal .modal-close').click();
    // In the master view, the canvas menu offers what makes sense there.
    R.master.toggleMasterEdit(true); await sleep(10);
    const st = D.getElementById('stage'), r = st.getBoundingClientRect();
    st.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 }));
    const items = [...D.querySelectorAll('#context-menu .ctx-item')].map(x => x.textContent);
    assert(items.includes('Cerrar vista Patrón') && !items.includes('Nueva diapositiva'), 'menú del lienzo en el patrón: ' + items.join(' | '));
    D.body.click();
    // An object of the master selected: its tab, as on a slide (it was hidden there).
    R.blocks.addImage('data:image/png;base64,iVBORw0KGgo='); await sleep(40);
    const ct = D.querySelector('#ribbon [data-tab="ctx"]');
    assert(!ct.hidden && ct.textContent === 'Imagen' && D.querySelector('#ribbon [data-page="ctx"] [title="Recortar"], #ribbon [data-page="ctx"] button'), 'en el patrón, la pestaña de la imagen: ' + ct.textContent);
    R.store.undo(); R.master.toggleMasterEdit(false); await sleep(10);
    // A slide's menu leads to its layout in the master.
    R.slides.addSlide('titleContent'); await sleep(10);
    const th = D.querySelectorAll('#navigator .thumb')[1], tr = th.getBoundingClientRect();
    th.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: tr.left + 20, clientY: tr.top + 20 }));
    [...D.querySelectorAll('#context-menu .ctx-item')].find(x => x.textContent === 'Editar su diseño en el patrón').click(); await sleep(10);
    eq(R.state.ui.editMaster, 'titleContent', '«Editar su diseño en el patrón» abre ese diseño');
    R.master.toggleMasterEdit(false);
  });

  await test('presentaciones de ejemplo completas: se abren, usan patrón y diseños y se exportan', async () => {
    reset(); D.querySelector('[data-action="gallery"]').click(); await sleep(50);
    const items = D.querySelectorAll('#gallery-modal .gal-examples .gal-item');
    eq(items.length, Object.keys(R.examples.EXAMPLES).length, 'todos los ejemplos en la galería'); assert(items.length >= 20, 'al menos veinte');
    // (Search and groups: the cards that don't match hide.)
    const q = D.querySelector('#gallery-modal .gal-q'); q.value = 'código'; q.dispatchEvent(new Event('input'));
    const shown = [...items].filter(b => !b.hidden);
    assert(shown.length && shown.length < items.length && shown.some(b => b.dataset.example === 'coding'), 'la búsqueda filtra');
    q.value = ''; q.dispatchEvent(new Event('input'));
    D.querySelector('#gallery-modal .gal-cat[data-cat="data"]').click();
    assert([...items].every(b => b.hidden === (b.dataset.cat !== 'data')), 'los grupos filtran');
    D.querySelector('#gallery-modal .modal-close').click();
    // (The rest are loaded on demand; tools/check-templates.mjs goes through them all.)
    const more = Object.keys(R.examples.EXAMPLES).find(k => !R.examples.buildExample(k));
    if (more) assert((await R.examples.loadExample(more))?.slides.length >= 5, 'se carga una plantilla del catálogo');
    const kinds = new Set();
    for (const key of Object.keys(R.examples.EXAMPLES).filter(k => R.examples.buildExample(k))) {
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
    for (const k of ['picture', 'table', 'chart']) { const sel = D.querySelector('#ribbon .mb-ph'); sel.value = k; sel.dispatchEvent(new frame.contentWindow.Event('change')); }
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
    R.flushThumbs?.(); await sleep(10);                  // (the edited thumbnail is rebuilt after the frame, or when idle)
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

  await test('plantillas nuevas: lanzamiento, viaje, concurso, panel de resultados y portafolio, con lo que prometen', async () => {
    const W = frame.contentWindow, F = await W.eval("import('/src/features/design/fonts.js')");
    const all = (d, f) => d.slides.flatMap(s => s.blocks).filter(f);
    const L = R.examples.buildExample('launch');
    assert(all(L, b => b.type === 'model' && b.autoRotate).length >= 1, 'lanzamiento: producto 3D girando');
    assert(L.slides.some(s => s.autoAnimate) && all(L, b => b.type === 'diagram' && b.layout === 'chevrons' && b.oneByOne).length === 1, 'Transformar y galones uno a uno');
    assert(all(L, b => b.type === 'chart' && b.chartType === 'funnel').length && all(L, b => b.type === 'timer').length, 'embudo y cuenta atrás');
    assert(!all(L, b => b.type === 'model').some(b => b.caption) && /Khronos|CC/.test(JSON.stringify(L.slides.at(-1))), 'el crédito del 3D, una vez al final');
    const T = R.examples.buildExample('travel');
    assert(all(T, b => b.curve === 100).length && all(T, b => b.type === 'diagram' && b.layout === 'timeline').length, 'viaje: texto en círculo y cronología');
    assert(all(T, b => b.type === 'table' && b.rows.at(-1).includes('=SUMA(ARRIBA)')).length, 'presupuesto con fórmula');
    const Q = R.examples.buildExample('quiz'), polls = all(Q, b => b.type === 'poll');
    eq(polls.filter(p => p.kind === 'quiz' && p.correct?.length === 1).length, 3, 'tres preguntas con respuesta correcta'); eq(polls.filter(p => p.kind === 'board').length, 1, 'y la clasificación');
    assert(all(Q, b => b.animation?.sound === 'applause').length === 1, 'celebración con aplausos');
    const D2 = R.examples.buildExample('dashboard'), kinds = new Set(all(D2, b => b.type === 'chart').map(b => b.chartType));
    assert(['waterfall', 'funnel', 'treemap', 'bubble'].every(k => kinds.has(k)), 'panel: cascada, embudo, rectángulos y burbujas');
    const P = R.examples.buildExample('folio');
    assert(all(P, b => b.device === 'phone').length && all(P, b => b.device === 'laptop').length, 'portafolio: móvil y portátil');
    // Their fonts: the headings' too (the masters' styles), in the editor and in the presentation.
    for (const [key, fam] of [['folio', 'Bebas Neue'], ['launch', 'Bebas Neue'], ['travel', 'Playfair Display'], ['dashboard', 'Space Grotesk']]) {
      const d = R.examples.buildExample(key);
      assert(F.googleFamiliesInDeck(d).some(f => f.startsWith(fam)), `${key}: carga ${fam}`);
      assert(new RegExp(fam.replace(' ', '\\+')).test(R.io.buildHTML(d)), `${key}: ${fam} en la presentación`);
    }
  });

  // ---- Master text styles and the theme (one model, as in PowerPoint) ----
  const officeDeck = async () => R.pptxImport.importPPTX(new frame.contentWindow.File([await (await fetch(new URL('fixtures/themes/office.pptx', location.href))).blob()], 'office.pptx'));
  const bodyOf = s => s.blocks.find(b => b.ph === 'body');

  await test('patrón: cambiar el nivel 1 del texto cambia todos los marcadores que lo heredan (diseños y diapositivas); el formato propio se queda y se puede quitar', async () => {
    R.store.replaceDeck(await officeDeck()); R.render();
    const d = R.state.deck, s = d.slides[1], lay = d.layouts.find(l => l.id === s.layoutId), lb = bodyOf(lay);
    R.master.toggleMasterEdit(true); await sleep(10);
    R.master.setMasterStyle('body', { color: '#c00000', size: 40 }, 0); await sleep(10);
    eq(R.master.styled(bodyOf(s), s).color, '#c00000', 'la diapositiva toma el color del nivel 1');
    eq(R.master.styled(bodyOf(s), s).fontSize, 40, 'y su tamaño');
    eq(R.master.styled(lb, lay).color, '#c00000', 'el diseño también');
    eq(d.master.styles.body.color, '#c00000', 'el nivel 1 es el color del cuadro de texto');
    // Own formatting set by hand wins, says so, and can be dropped.
    const own0 = R.master.styleOverrides('body', 'color').length;          // (layouts with a grey text of their own, as Office's «Section Header»)
    R.master.toggleMasterEdit(false); bodyOf(s).color = '#00aa00'; R.master.toggleMasterEdit(true);
    R.master.setMasterStyle('body', { color: '#0000ff' }, 0);
    eq(R.master.styled(bodyOf(s), s).color, '#00aa00', 'el color puesto a mano se queda');
    eq(R.master.styleOverrides('body', 'color').length, own0 + 1, 'y se cuenta como formato propio');
    R.master.clearStyleOverrides('body', 'color');
    eq(R.master.styled(bodyOf(s), s).color, '#0000ff', 'al quitarlo, sigue al estilo');
    // The other levels' colours reach the text (levelVars → levelCSS).
    R.master.setMasterStyle('body', { color: '#ff8800' }, 1);
    assert(/--c2:#ff8800/.test(R.master.levelVars(R.master.styled(bodyOf(s), s))), 'el color del nivel 2 llega al texto');
    R.master.toggleMasterEdit(false); R.state.ui.slideIndex = 1; R.render(); await sleep(30);
    const box = D.querySelector(`#stage .block[data-id="${bodyOf(s).id}"]`), li = box?.querySelector('li');
    eq(li && getComputedStyle(li).color, 'rgb(0, 0, 255)', 'en el lienzo, el primer nivel con el color del estilo');
    reset();
  });

  await test('patrón: los colores y fuentes de los estilos de texto pueden ser los del tema, y cambian con Colores y Fuentes del tema', async () => {
    reset(); R.state.ui.slideIndex = 0;
    R.master.toggleMasterEdit(true);
    R.master.setMasterStyle('title', { color: 'theme:accent2', font: 'theme:major' });
    R.master.setMasterStyle('body', { color: 'theme:accent1' }, 2);
    const t = () => R.master.styled({ id: 'x', type: 'text', ph: 'title', html: '' }, R.state.deck.master);
    eq(t().color, R.palettes.PALETTES.revela.accents[1], 'Énfasis 2 de la paleta');
    R.palettes.applyPalette('ocean'); R.palettes.applyFontPair('classic');
    eq(t().color, R.palettes.PALETTES.ocean.accents[1], 'cambia con los colores del tema');
    assert(/Playfair Display/.test(t().fontFamily), 'la fuente de títulos del tema: ' + t().fontFamily);
    R.palettes.applyFontPair('modern');
    assert(/Montserrat/.test(t().fontFamily), 'y cambia con las fuentes del tema');
    const lv = R.master.styled({ id: 'y', type: 'text', ph: 'body', html: '' }, R.state.deck.master).levels;
    eq(lv[2].color, R.palettes.PALETTES.ocean.accents[0], 'un nivel con un color del tema');
    eq(R.state.deck.master.styles.title.color, 'theme:accent2', 'guardado como referencia al tema');
    R.master.toggleMasterEdit(false); reset();
  });

  await test('patrón: las presentaciones de antes se ven igual (sus colores que son del tema pasan a seguirlo; los ambiguos no)', async () => {
    const d = R.model.emptyDeck();
    d.master.styles = { title: { size: 48, color: '#3f6497' }, subtitle: { size: 30, color: '#123456' }, body: { size: 30, color: '#ffffff', levels: [{ size: 30 }, { size: 26, color: '#e0873b' }] } };
    R.store.replaceDeck(d); R.render();
    const st = R.master.masterStyles();
    eq(st.title.color, 'theme:accent1', 'el color del título era Énfasis 1');
    eq(st.body.color, 'theme:tx1', 'el del texto, Texto 1'); eq(st.body.levels[1].color, 'theme:accent2', 'y un nivel, Énfasis 2');
    eq(st.subtitle.color, '#123456', 'uno propio se queda');
    eq(R.master.styled({ id: 'x', type: 'text', ph: 'title', html: '' }, R.state.deck.master).color, '#3f6497', 'el mismo aspecto');
    // Ambiguous: the text colour is also an accent.
    const e = R.model.emptyDeck(); e.palette = 'custom'; e.customPalette = { name: 'X', bg: '#000000', fg: '#3366ff', accents: ['#3366ff', '#aa0000', '#00aa00', '#0000aa', '#aaaa00', '#00aaaa'] };
    e.master.styles = { title: { color: '#3366ff' }, subtitle: {}, body: { levels: [] } };
    R.store.replaceDeck(e);
    eq(R.master.masterStyles().title.color, '#3366ff', 'si es de dos huecos del tema, se queda como está');
    reset();
  });

  await test('patrón: la cinta junta Colores, Fuentes y Estilos de texto; el diálogo ofrece los colores y fuentes del tema y muestra una vista previa', async () => {
    reset(); R.master.toggleMasterEdit(true); R.state.ui.activeTab = 'master'; R.render(); await sleep(20);
    const grp = D.querySelector('#ribbon [data-page="master"] [data-action="master-styles"]').closest('.group');
    assert(grp.querySelector('[data-palettes-open]') && grp.querySelector('[data-fontpairs-open]'), 'en el mismo grupo que Colores y Fuentes');
    eq(grp.querySelector(':scope > label').textContent, 'Tema y estilos de texto');
    D.querySelector('#ribbon [data-page="master"] [data-action="master-styles"]').click(); await sleep(30);
    const m = D.getElementById('ts2-modal'), tr = m.querySelector('tr[data-kind="title"]');
    assert(/fuente del tema/.test(m.querySelector('select[data-k="font"]').textContent), 'fuentes del tema en la lista');
    const sel = tr.querySelector('[data-k="cref"]'); assert([...sel.options].some(o => o.value === 'accent1'), 'colores del tema en la lista');
    sel.value = 'accent2'; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(20);
    eq(R.state.deck.master.styles.title.color, 'theme:accent2', 'se guarda la referencia');
    const prev = m.querySelector('.ts2-slide > div');
    eq(getComputedStyle(prev).color, (h => `rgb(${[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ')})`)(R.palettes.PALETTES.revela.accents[1]), 'la vista previa lo muestra');
    eq(m.querySelectorAll('.ts2-slide li').length, 5, 'con los cinco niveles');
    m.remove(); R.master.toggleMasterEdit(false); reset();
  });

  await test('miniaturas: tras cambiar el tema y deshacer, un clic o un cambio en una diapositiva no las rehacen todas; la cambiada, después de dibujar', async () => {
    R.store.replaceDeck(R.examples.buildExample('dashboard')); await sleep(20); R.flushThumbs();
    const th = () => [...D.querySelectorAll('#navigator .thumb')], rebuilt = a => th().filter((e, i) => e !== a[i]).length;
    assert(th().length > 4, 'varias diapositivas');
    R.palettes.applyPalette('ocean'); await sleep(20); R.flushThumbs();
    R.store.undo(); await sleep(20); R.flushThumbs();
    // (The master's text styles, linked to the theme while drawing, changed the panel's fingerprint after it was taken.)
    let a = th(); R.store.commit(() => { R.state.deck.slides[1].blocks[0].x += 5; });
    eq(rebuilt(a), 0, 'en el acto, ninguna: la diapositiva se dibuja primero');
    await sleep(20); R.flushThumbs(); eq(rebuilt(a), 1, 'después, solo la suya'); assert(th()[1] !== a[1], 'la de la diapositiva cambiada');
    a = th(); th()[3].click(); await sleep(20); R.flushThumbs();
    eq(rebuilt(a), 0, 'un clic en otra no rehace ninguna'); assert(th()[3].classList.contains('active'), 'y la marca como actual');
    R.store.undo(); await sleep(20); R.flushThumbs(); eq(rebuilt(a), 1, 'deshacer el cambio: solo la suya otra vez');
    reset();
  });

  await test('miniaturas de una presentación grande: todas a la vez en el panel, dibujadas primero las que se ven y las demás poco a poco', async () => {
    const d = R.examples.buildExample('dashboard'), base = d.slides.slice();
    for (let i = 0; d.slides.length < 60; i++) d.slides.push(R.slides.cloneSlide(base[i % base.length]));
    R.store.replaceDeck(d);
    const th = () => [...D.querySelectorAll('#navigator .thumb')], drawn = e => e.querySelector('.thumb-inner').children.length > 0;
    eq(th().length, 60, 'las 60 en el panel en el acto (sus números, su fondo)');
    assert(th().filter(drawn).length < 60, 'pero no dibujadas todas en la misma tarea');
    for (let i = 0; i < 40 && !drawn(th()[0]); i++) await sleep(25);
    assert(drawn(th()[0]), 'las que se ven, enseguida');
    for (let i = 0; i < 200 && !th().every(drawn); i++) await sleep(25);
    assert(th().filter(drawn).length >= 55, 'y las demás solas, poco a poco: ' + th().filter(drawn).length);
    R.flushThumbs(); assert(th().every(drawn), 'flushThumbs() las termina');
    reset();
  });
}
