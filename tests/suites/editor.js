// The editor itself: selection, undo, alignment, snapping, zoom, dialogs, accessibility, appearance, PWA.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('orden de apilado: seleccionar no eleva el z-index', async () => {
    reset(); const b = newText(); await sleep(20);
    const el = D.querySelector(`.block[data-id="${b.id}"]`);
    const z = frame.contentWindow.getComputedStyle(el).zIndex;
    assert(z === 'auto' || z === '0', `z-index no debe elevarse al seleccionar (era ${z})`);
  });

  await test('panel de atajos de teclado se abre y cierra', async () => {
    reset(); D.querySelector('[data-action="shortcuts"]').click(); await sleep(10);
    const m = D.getElementById('sc-modal');
    assert(m && m.querySelectorAll('.sc-table tr').length >= 10, 'lista de atajos');
    const box = m.querySelector('.modal'), r = box.getBoundingClientRect();
    assert(r.top >= 0 && r.bottom <= frame.contentWindow.innerHeight + 1, 'cabe en la ventana (se desplaza por dentro)');
    assert(box.scrollWidth <= box.clientWidth + 1, 'sin desbordar a lo ancho');
    m.querySelector('.modal-close').click(); await sleep(10);
    assert(!D.getElementById('sc-modal'), 'se cierra');
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

  await test('Ctrl+Z deshace lo que se mueve, se redimensiona o se escribe (un paso por gesto)', async () => {
    reset(); const W = frame.contentWindow;
    const key = (k, o = {}) => D.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, ...o }));
    R.blocks.addShape('rect'); const b = last(); Object.assign(b, { x: 100, y: 100, w: 200, h: 100 }); R.render();
    const el = () => D.querySelector(`.block[data-id="${b.id}"]`);
    const ptr = (target, type, x, y) => target.dispatchEvent(new W.PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0, isPrimary: true }));
    // Selecting and deselecting are not steps.
    ptr(el(), 'pointerdown', 300, 300); ptr(el(), 'pointerup', 300, 300); await sleep(10);
    R.store.commit(() => R.store.setSelection(null)); await sleep(10);
    // Drag twice: two steps.
    const drag = async (dx, dy) => { const e = el(); ptr(e, 'pointerdown', 300, 300); ptr(e, 'pointermove', 300 + dx, 300 + dy); ptr(e, 'pointerup', 300 + dx, 300 + dy); await sleep(10); };
    await drag(100, 0); const x1 = b.x; assert(x1 > 100, 'se ha movido: ' + x1);
    await drag(0, 100); const y2 = slide().blocks.at(-1).y; assert(y2 > 100, 'se ha movido otra vez');
    key('z'); await sleep(10); eq(slide().blocks.at(-1).y, 100, 'deshace el segundo arrastre');
    key('z'); await sleep(10); eq(slide().blocks.at(-1).x, 100, 'deshace el primero');
    key('z', { shiftKey: true }); await sleep(10); eq(slide().blocks.at(-1).x, x1, 'Ctrl+Mayús+Z rehace');
    key('y'); await sleep(10); eq(slide().blocks.at(-1).y, y2, 'Ctrl+Y rehace');
    // Resize from a corner.
    R.store.setSelection(slide().blocks.at(-1).id); R.render(); await sleep(10);
    const h = el().querySelector('.handle-size.se');
    assert(h, 'tirador de esquina');
    ptr(h, 'pointerdown', 500, 500); D.dispatchEvent(new W.PointerEvent('pointermove', { clientX: 560, clientY: 540, bubbles: true })); D.dispatchEvent(new W.PointerEvent('pointerup', { clientX: 560, clientY: 540, bubbles: true })); await sleep(10);
    assert(slide().blocks.at(-1).w > 200, 'redimensionado');
    key('z'); await sleep(10); eq(slide().blocks.at(-1).w, 200, 'deshace el tamaño');
    // Rotated 90°: dragging the bottom-right handle down widens it and the opposite corner stays put on screen.
    R.store.commit(() => Object.assign(slide().blocks.at(-1), { x: 300, y: 200, w: 200, h: 100, rotation: 90 })); await sleep(10);
    const corner = () => { const r = el().querySelector('.handle-size.nw').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; };
    const before = corner(), hs = el().querySelector('.handle-size.se'), hr = hs.getBoundingClientRect();
    ptr(hs, 'pointerdown', hr.left, hr.top); D.dispatchEvent(new W.PointerEvent('pointermove', { clientX: hr.left, clientY: hr.top + 40, bubbles: true }));
    D.dispatchEvent(new W.PointerEvent('pointerup', { clientX: hr.left, clientY: hr.top + 40, bubbles: true })); await sleep(10);
    const rr = slide().blocks.at(-1); assert(rr.w > 200 && rr.h === 100, 'girado: al bajar crece su ancho (' + rr.w + '×' + rr.h + ')');
    const after = corner(); assert(Math.abs(after[0] - before[0]) <= 1 && Math.abs(after[1] - before[1]) <= 1, `la esquina opuesta no se mueve (${before} → ${after})`);
    key('z'); await sleep(10); eq(slide().blocks.at(-1).rotation, 90, 'deshace solo el tamaño'); eq(slide().blocks.at(-1).w, 200);
    // A slider-like change without its own step is undone too.
    R.store.mutate(() => { slide().blocks.at(-1).opacity = 40; });
    key('z'); await sleep(10); assert(slide().blocks.at(-1).opacity == null, 'deshace un cambio en vivo (deslizador)');

    // Typing: after leaving the text, Ctrl+Z brings the old text back.
    reset(); R.blocks.addText(); const t = last(); t.html = 'Hola'; R.store.commit(() => {}); R.render(); await sleep(10);
    const rich = () => D.querySelector(`.block[data-id="${t.id}"] .rich`);
    rich().dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    const r = D.createRange(); r.selectNodeContents(rich()); r.collapse(false); W.getSelection().removeAllRanges(); W.getSelection().addRange(r);
    D.execCommand('insertText', false, ' mundo'); rich().blur(); await sleep(10);
    eq(slide().blocks.at(-1).html, 'Hola mundo', 'escrito');
    key('z'); await sleep(10); eq(slide().blocks.at(-1).html, 'Hola', 'Ctrl+Z quita lo escrito');
    key('y'); await sleep(10); eq(slide().blocks.at(-1).html, 'Hola mundo', 'y se rehace');
    // Ctrl+Z inside the text with nothing typed: leaves the text and undoes the step before.
    rich().dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    assert(D.activeElement === rich(), 'editando');
    key('z'); await sleep(10);
    assert(D.activeElement !== rich(), 'sale del texto'); eq(slide().blocks.at(-1).html, 'Hola', 'y deshace lo anterior');
  });

  await test('una presentación marcada como final no impide abrir o crear otra', async () => {
    reset(); R.blocks.addText(); R.store.commit(() => { R.state.deck.final = true; }, { force: true });
    const n = slide().blocks.length; R.blocks.addText(); eq(slide().blocks.length, n, 'la final no se edita');
    const other = R.model.emptyDeck(); other.name = 'Otra';
    R.store.replaceDeck(other);
    eq(R.state.deck.name, 'Otra', 'se abre otra'); assert(!R.state.deck.final, 'y se puede editar');
  });

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

  await test('botón de apoyo con el enlace de PayPal', async () => {
    const a = D.getElementById('donate');
    assert(a && !a.hidden, 'visible'); eq(a.href, 'https://paypal.me/fmesasc', 'enlace'); eq(a.target, '_blank', 'nueva pestaña');
    eq(a.rel, 'noopener', 'sin acceso a la ventana de origen');
  });

  await test('apariencia del editor: claro, oscuro, automático y personalizado', async () => {
    const A = await frame.contentWindow.eval("import('/src/ui/shell/appearance.js')"), root = D.documentElement;
    const panel = () => getComputedStyle(root).getPropertyValue('--panel').trim();
    A.setAppearance({ mode: 'dark' }); eq(root.dataset.ui, 'dark', 'oscuro'); eq(panel(), '#1f2329', 'paleta oscura');
    eq(getComputedStyle(root).colorScheme, 'dark', 'controles nativos oscuros');
    A.setAppearance({ mode: 'custom', accent: '#c0392b', base: '#1b2330' });
    eq(panel(), '#1b2330', 'fondo elegido'); eq(getComputedStyle(root).getPropertyValue('--accent').trim(), '#c0392b', 'acento elegido');
    assert(getComputedStyle(root).getPropertyValue('--txt').trim() === '#e8eaed', 'texto claro sobre fondo oscuro elegido');
    A.setAppearance({ mode: 'custom', accent: '#2b7a78', base: '#ffffff' }); eq(getComputedStyle(root).getPropertyValue('--txt').trim(), '#2f333a', 'texto oscuro sobre fondo claro');
    eq(JSON.parse(frame.contentWindow.localStorage.getItem('revela.appearance')).mode, 'custom', 'se recuerda');
    D.getElementById('ap-btn').click(); await sleep(10); assert(D.getElementById('ap-modal'), 'botón de la barra de título');
    D.querySelector('#ap-modal .ap-card[data-m="light"]').click(); eq(root.dataset.ui, 'light', 'vuelve a claro'); eq(panel(), '#fff', 'paleta clara');
    D.querySelector('#ap-modal .modal-close').click();
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

  await test('zoom: acercar y restablecer', async () => {
    reset(); D.querySelector('[data-action="zoom-reset"]').click();
    const z0 = R.state.ui.zoom;
    D.querySelector('[data-action="zoom-in"]').click();
    assert(R.state.ui.zoom > z0, 'aumenta');
    assert(/scale\(/.test(D.getElementById('stage-grid').style.transform), 'transform aplicado');
    D.querySelector('[data-action="zoom-reset"]').click();
    eq(R.state.ui.zoom, 1, 'reset');
  });

  await test('clic derecho en el lienzo y en la miniatura: seleccionar todo, fondo, guías, presentar desde aquí', async () => {
    reset(); const W = frame.contentWindow;
    const menu = (el, x = 5, y = 5) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, clientX: r.left + x, clientY: r.top + y }));
      return [...D.querySelectorAll('#context-menu .ctx-item')]; };
    const pick = (items, text) => { const it = items.find(x => x.textContent === text); assert(it, 'opción: ' + text); it.click(); };
    pick(menu(D.getElementById('stage')), 'Seleccionar todo'); await sleep(10);
    eq(R.state.ui.multi.length, slide().blocks.filter(b => !b.locked).length, 'selecciona todos los objetos');
    const g = !!R.state.ui.showGuides; pick(menu(D.getElementById('stage')), g ? 'Ocultar guías' : 'Mostrar guías'); await sleep(10);
    eq(!!R.state.ui.showGuides, !g, 'guías');
    pick(menu(D.getElementById('stage')), 'No ajustar a otros objetos'); await sleep(10); eq(R.state.ui.snap, false, 'sin ajuste');
    pick(menu(D.getElementById('stage')), 'Ajustar a otros objetos'); await sleep(10); assert(R.state.ui.snap !== false, 'con ajuste');
    const items = menu(D.querySelector('#navigator .thumb'), 20, 20);
    assert(items.some(x => x.textContent === 'Presentar desde aquí'), 'presentar desde esta diapositiva');
    pick(items, 'Formato del fondo…'); await sleep(20);
    const bg = D.querySelector('.modal-backdrop:last-of-type'); assert(bg, 'abre el fondo'); bg.querySelector('.modal-close')?.click();
    D.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
    if (g !== !!R.state.ui.showGuides) R.store.commit(() => (R.state.ui.showGuides = g), { history: false });
  });

  await test('cinta: todas las galerías se abren con su contenido', async () => {
    reset();
    const launchers = { symbols: '[data-symbols]', icons: '[data-icons]', wordart: '[data-wordart]', palettes: '[data-palettes-open]',
      fontpairs: '[data-fontpairs-open]', layout: '[data-layout-open]', paragraph: '[data-more="paragraph"]' };
    for (const [name, sel] of Object.entries(launchers)) {
      const el = D.querySelector(sel); assert(el, 'lanzador ' + name);
      el.click(); await sleep(10);
      const pop = D.querySelector('.popover');
      assert(pop && pop.querySelectorAll('button, input, select').length > 1, 'galería ' + name + ' con contenido');
      D.body.click(); await sleep(10);
    }
    assert(!D.querySelector('.popover'), 'se cierran al hacer clic fuera');
  });

  await test('botón de borrar: cruz dibujada y centrada en el círculo', async () => {
    reset(); R.blocks.addShape('rect'); select(last()); await sleep(20);
    const del = D.querySelector('.block.selected .handle-del'); assert(del, 'botón visible');
    eq(del.textContent, '', 'sin carácter ×, que se descentra según la fuente');
    eq(del.getAttribute('aria-label'), 'Borrar', 'nombre accesible');
    const W = frame.contentWindow;
    for (const p of ['::before', '::after']) {
      const cs = W.getComputedStyle(del, p);
      assert(cs.content !== 'none' && cs.left === cs.top && parseFloat(cs.width) > 0, 'trazo ' + p + ' centrado');
    }
    eq(W.getComputedStyle(del).paddingLeft, '0px', 'sin relleno que lo desplace');
  });

  await test('panel de diapositivas: miniaturas enteras y se puede ocultar y mostrar', async () => {
    R.store.replaceDeck(R.examples.buildExample('report')); R.render(); await sleep(60);
    const c = D.querySelector('#navigator .thumb-canvas'), inner = c.querySelector('.thumb-inner');
    assert(Math.abs(inner.getBoundingClientRect().width - c.clientWidth) < 1.5, `la miniatura ocupa su hueco, sin cortar la derecha (${inner.getBoundingClientRect().width} vs ${c.clientWidth})`);
    const btn = D.getElementById('nav-toggle'); btn.click(); await sleep(60);
    assert(D.body.classList.contains('nav-hidden') && D.getElementById('navigator').offsetWidth === 0, 'se oculta');
    eq(frame.contentWindow.localStorage.getItem('revela.hideNav'), '1', 'y se recuerda');
    D.querySelector('#ribbon [data-action="toggle-nav"]') && D.querySelector('#ribbon [data-action="toggle-nav"]').click(); await sleep(60);
    assert(!D.body.classList.contains('nav-hidden') && D.getElementById('navigator').offsetWidth > 100, 'desde Ver se vuelve a mostrar');
    reset();
  });

  await test('arrastrar archivos del ordenador a la diapositiva: se insertan donde se sueltan, y una presentación se abre', async () => {
    reset(); const W = frame.contentWindow;
    const wrap = D.getElementById('canvas-wrap'), stage = D.getElementById('stage'), r = stage.getBoundingClientRect(), k = R.state.deck.size.w / r.width;
    const png = W.Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
    const stl = 'solid x\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid';
    const drop = async (files, x, y) => {
      const dt = new W.DataTransfer(); for (const f of files) dt.items.add(f);
      const o = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y };
      wrap.dispatchEvent(new W.DragEvent('dragenter', o)); const over = new W.DragEvent('dragover', o); wrap.dispatchEvent(over);
      assert(over.defaultPrevented, 'acepta archivos'); wrap.dispatchEvent(new W.DragEvent('drop', o)); await sleep(400);
    };
    const n0 = slide().blocks.length;
    await drop([new W.File([png], 'foto.png', { type: 'image/png' }), new W.File([stl], 'pieza.stl', { type: '' })], r.left + 300 / k, r.top + 200 / k);
    const [img, mdl] = slide().blocks.slice(n0);
    assert(img?.type === 'image' && /^data:image\/png/.test(img.src), 'la imagen entra');
    assert(Math.abs(img.x + img.w / 2 - 300) < 3 && Math.abs(img.y + img.h / 2 - 200) < 3, 'donde se suelta');
    assert(mdl?.type === 'model' && /^data:model\/gltf-binary/.test(mdl.src), 'un STL entra como modelo 3D');
    R.store.undo(); await sleep(20); eq(slide().blocks.length, n0 + 1, 'cada archivo, un paso de deshacer');
    // A presentation file opens (asking first, since there is work to lose).
    const proj = R.model.emptyDeck(); proj.name = 'Arrastrada';
    await drop([new W.File([JSON.stringify(proj)], 'otra.json', { type: 'application/json' })], r.left + 10, r.top + 10);
    assert(D.querySelector('.modal-backdrop .dlg-ok'), 'pregunta antes de sustituir la actual');
    D.querySelector('.modal-backdrop .dlg-ok').click(); await sleep(100);
    eq(R.state.deck.name, 'Arrastrada', 'y la abre');
    await drop([new W.File(['x'], 'nota.xyz', { type: 'application/x-nada' })], r.left + 10, r.top + 10);
    await sleep(60); eq(slide().blocks.at(-1)?.type, 'file', 'cualquier otro archivo, como icono para descargarlo'); eq(slide().blocks.at(-1).name, 'nota.xyz');
    await sleep(50); const before = R.state.deck;
    await drop([new W.File(['PK'], 'Charla.key', { type: '' })], r.left + 10, r.top + 10);
    assert(/Keynote.*Exportar a ▸ PowerPoint/.test(D.querySelector('.modal-backdrop .dlg-msg')?.textContent || '') && R.state.deck === before, 'Keynote: explica cómo pasarlo a PowerPoint, sin tocar la presentación');
    D.querySelector('.modal-backdrop .dlg-ok').click();
  });


  await test('atajos como en PowerPoint: F5, Mayús+F5, Ctrl+M, Ctrl+A, Esc, Re Pág/Av Pág, Inicio/Fin', async () => {
    reset(); const W = frame.contentWindow;
    const key = (k, o = {}) => D.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
    R.store.commit(() => { R.state.ui.selection = null; R.state.ui.multi = []; }, { history: false });
    const n = R.state.deck.slides.length; key('m', { ctrlKey: true }); await sleep(10);
    eq(R.state.deck.slides.length, n + 1, 'Ctrl+M: nueva diapositiva');
    R.store.commit(() => { R.state.ui.selection = null; R.state.ui.multi = []; }, { history: false });
    key('Home'); await sleep(10); eq(R.state.ui.slideIndex, 0, 'Inicio: la primera');
    key('PageDown'); await sleep(10); eq(R.state.ui.slideIndex, 1, 'Av Pág: la siguiente');
    key('ArrowLeft'); await sleep(10); eq(R.state.ui.slideIndex, 0, 'flecha sin nada seleccionado: cambia de diapositiva');
    key('End'); await sleep(10); eq(R.state.ui.slideIndex, R.state.deck.slides.length - 1, 'Fin: la última');
    key('Home'); await sleep(10);
    key('a', { ctrlKey: true }); await sleep(10);
    eq(R.state.ui.multi.length, slide().blocks.filter(b => !b.locked).length, 'Ctrl+A: todos los objetos');
    key('Escape'); await sleep(10); assert(!R.state.ui.selection && !R.state.ui.multi.length, 'Esc: sin selección');
    // Shift+F5: from this slide.
    R.store.commit(() => { R.state.ui.slideIndex = 1; }, { history: false });
    key('F5', { shiftKey: true });
    const f = () => D.querySelector('#present-overlay iframe');
    for (let i = 0; i < 100 && !f()?.contentWindow?.Reveal?.isReady?.(); i++) await sleep(100);
    await sleep(200);
    eq(f().contentWindow.Reveal.getIndices().h, 1, 'Mayús+F5: empieza en esta diapositiva');
    D.getElementById('present-close').click(); await sleep(50);
  });


  await test('deshacer/rehacer se desactivan si no hay nada, y se ve que está guardado', async () => {
    reset(); const u = () => D.querySelector('.qat [data-action="undo"]'), r = () => D.querySelector('.qat [data-action="redo"]');
    R.store.commit(() => { slide().blocks[0].x += 5; }); await sleep(10);
    assert(!u().disabled && r().disabled, 'tras un cambio: se puede deshacer, no rehacer');
    assert(!D.getElementById('save-state').hidden, '«Guardado» a la vista');
    R.store.undo(); await sleep(10); assert(!r().disabled, 'tras deshacer, se puede rehacer');
  });


  await test('texto sin ratón: al insertar queda listo para escribir; Intro o F2 lo editan', async () => {
    reset(); const W = frame.contentWindow;
    D.querySelector('[data-action="insert-text"]').click(); await sleep(60);
    const rich = () => D.activeElement;
    assert(rich()?.isContentEditable && W.getSelection().toString().length > 0, 'nuevo cuadro: en edición y su texto seleccionado');
    rich().blur(); await sleep(20);
    const b = last(); R.store.commit(() => { R.state.ui.selection = b.id; R.state.ui.multi = [b.id]; }, { history: false }); await sleep(10);
    D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true })); await sleep(20);
    assert(rich()?.isContentEditable && rich().closest('.block')?.dataset.id === b.id, 'F2: a editarlo');
    rich().blur(); await sleep(20);
    D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await sleep(20);
    assert(rich()?.isContentEditable, 'Intro: también'); rich().blur();
  });


  await test('edición abierta: botón «Versión premium» que lleva a los planes de revelaslides.com', async () => {
    const a = D.getElementById('premium');
    assert(a && !a.hidden, 'visible en la edición abierta'); eq(a.getAttribute('href'), 'https://revelaslides.com/pricing');
    eq(a.getAttribute('target'), '_blank'); eq(D.body.dataset.edition, 'open');
    const I = await frame.contentWindow.eval("import('/src/i18n/index.js')");
    await I.setLang('en'); eq(a.querySelector('span').textContent, 'Premium version', 'traducido');
    await I.setLang('fr'); eq(a.querySelector('span').textContent, 'Version premium');
    // (And the other texts outside the ribbon's buttons: saved, colour labels, thumbnails' hint.)
    await I.setLang('en');
    eq(D.querySelector('#save-state span').textContent, 'Saved');
    assert(/^Drag/.test(D.querySelector('#navigator .thumb').title), 'miniaturas: ' + D.querySelector('#navigator .thumb').title);
    assert([...D.querySelectorAll('#ribbon label.color>span')].every(s => !/^Color$/.test(s.textContent) || s.textContent === 'Colour' || s.textContent === 'Color'), 'etiquetas de color');
    await I.setLang('fr'); eq(D.querySelector('#ribbon label.color>span')?.textContent, 'Couleur');
    await I.setLang('es'); eq(a.querySelector('span').textContent, 'Versión premium');
  });
}
