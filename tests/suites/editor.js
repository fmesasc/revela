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
}
