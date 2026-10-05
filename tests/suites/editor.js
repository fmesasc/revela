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

  await test('informar de un problema: en la edición abierta, a GitHub', async () => {
    reset(); D.querySelector('[data-action="report-problem"]').click(); await sleep(10);
    const m = D.getElementById('report-modal');
    assert(m && m.querySelector('a[href="https://github.com/fmesasc/revela/issues"]') && !m.querySelector('form'), 'sin servidor de Revela: el enlace a GitHub');
    m.querySelector('.modal-close').click(); await sleep(10);
    assert(!D.getElementById('report-modal'), 'se cierra');
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

  await test('imagen: el cuadro toma su proporción; las esquinas la conservan y los lados la estiran', async () => {
    reset(); const W = frame.contentWindow;
    R.blocks.addImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGP4z8AARwzIHABvqgf5gNwAKAAAAABJRU5ErkJggg==');
    const b = last(); await sleep(60);
    eq(b.w + '×' + b.h, '600×300', 'una imagen 2:1 entra con un cuadro 2:1');
    R.store.setSelection(b.id); R.render(); await sleep(10);
    const el = () => D.querySelector(`.block[data-id="${b.id}"]`);
    const drag = async (c, dx, dy) => { const h = el().querySelector('.handle-size.' + c), r = h.getBoundingClientRect(), o = { bubbles: true, pointerId: 1, button: 0, isPrimary: true };
      h.dispatchEvent(new W.PointerEvent('pointerdown', { ...o, clientX: r.left, clientY: r.top })); D.dispatchEvent(new W.PointerEvent('pointermove', { ...o, clientX: r.left + dx, clientY: r.top + dy }));
      D.dispatchEvent(new W.PointerEvent('pointerup', { ...o, clientX: r.left + dx, clientY: r.top + dy })); await sleep(10); };
    await drag('se', 80, 0);
    assert(b.w > 600 && Math.abs(b.w / b.h - 2) < 0.02 && (b.fit || 'contain') === 'contain', 'esquina: crece sin deformarse (' + b.w + '×' + b.h + ')');
    assert(['n', 'e', 's', 'w'].every(c => el().querySelector('.handle-size.' + c)), 'tiradores en los lados');
    const w0 = b.w, h0 = b.h; await drag('e', 60, 0);
    assert(b.w > w0 && b.h === h0 && b.fit === 'fill', 'lado: se estira y la imagen ocupa todo el cuadro (' + b.w + '×' + b.h + ', ' + b.fit + ')');
    eq(el().querySelector('img').style.objectFit, 'fill', 'y se ve estirada');
  });

  await test('imagen que ya estaba en un cuadro de otra proporción: al seleccionarla, el cuadro se ajusta a la imagen', async () => {
    reset();
    R.store.commit(() => { slide().blocks.push({ id: 'pic', type: 'image', fit: 'contain', x: 100, y: 100, w: 400, h: 400, rotation: 0, animation: null,
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGP4z8AARwzIHABvqgf5gNwAKAAAAABJRU5ErkJggg==' }); });
    const b = slide().blocks.at(-1); R.render(); await sleep(60);
    eq(b.w + '×' + b.h, '400×400', 'sin seleccionar: como estaba');
    R.store.setSelection(b.id); R.render(); await sleep(80);
    eq(`${b.x},${b.y} ${b.w}×${b.h}`, '100,200 400×200', 'seleccionada: el cuadro es el de la imagen 2:1, en el mismo sitio');
    R.store.commit(() => { b.fit = 'cover'; b.w = 300; b.h = 300; }); R.render(); await sleep(60);
    eq(b.w + '×' + b.h, '300×300', 'recortada («Rellenar»): no se toca');
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
    // Low contrast, fixed; and the style guide.
    const A = await frame.contentWindow.eval("import('/src/features/document/a11y.js')");
    const dk = { theme: 'white', size: { w: 1280, h: 720 }, slides: [{ background: '#ffffff', layoutId: 'content', blocks: [
      { id: 't1', type: 'text', ph: 'title', x: 100, y: 50, w: 800, h: 80, fontSize: 18, html: '<span style="color:#dddddd">Gris claro</span> y normal' },
      { id: 't2', type: 'text', x: 103, y: 200, w: 500, h: 80, fontSize: 12, html: 'pequeño', color: '#eeeeee' },
      { id: 'x', type: 'shape', x: 1400, y: 10, w: 100, h: 100 }] },
      { background: '#ffffff', layoutId: 'content', blocks: [{ id: 't3', type: 'text', ph: 'title', x: 100, y: 50, w: 800, h: 80, fontSize: 44, html: 'Otro' }] },
      { background: '#ffffff', layoutId: 'content', blocks: [{ id: 't4', type: 'text', ph: 'title', x: 100, y: 50, w: 800, h: 80, fontSize: 44, html: 'Y otro' }] }] };
    eq(A.checkAccessibility(dk).filter(i => i.kind === 'contrast').length, 2, 'contraste bajo (también el color propio del cuadro)');
    assert(A.fixContrast(dk, 0, 't1') && A.fixContrast(dk, 0, 't2'), 'se corrige');
    eq(A.checkAccessibility(dk).filter(i => i.kind === 'contrast').length, 0, 'y ya se lee');
    assert(A.contrast(A.readableColour('#dddddd', '#ffffff', 4.5), '#ffffff') >= 4.5, 'el mismo color, más oscuro');
    const st = A.checkStyle(dk), kinds = st.map(i => i.kind);
    assert(kinds.includes('small') && kinds.includes('offslide') && kinds.includes('nearalign') && kinds.includes('titlesize'), 'guía de estilo: ' + kinds.join());
    const na = st.find(i => i.kind === 'nearalign'); A.fixAlign(dk, 0, na.blockId, na.extra);
    eq(dk.slides[0].blocks[1].x, 100, 'casi alineado: se alinea');
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
    assert(!D.getElementById('save-state').hidden, '«En este navegador» a la vista');
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
    eq(D.querySelector('#save-state span').textContent, 'In this browser');
    assert(/^Drag/.test(D.querySelector('#navigator .thumb').title), 'miniaturas: ' + D.querySelector('#navigator .thumb').title);
    assert([...D.querySelectorAll('#ribbon label.color>span')].every(s => !/^Color$/.test(s.textContent) || s.textContent === 'Colour' || s.textContent === 'Color'), 'etiquetas de color');
    await I.setLang('fr'); eq(D.querySelector('#ribbon label.color>span')?.textContent, 'Couleur');
    await I.setLang('es'); eq(a.querySelector('span').textContent, 'Versión premium');
  });

  await test('control de cambios: cada cambio con su autor, aceptar o rechazar', async () => {
    reset(); const RV = R.review; R.comments.setAuthor('Ana');
    R.blocks.addShape('rect'); await sleep(10); const a = last();
    eq(RV.changesOf().length, 0, 'apagado: no se anota nada');
    RV.setTracking(true);
    R.blocks.addShape('ellipse'); await sleep(10); const b = last();
    R.store.commit(() => { b.x += 50; }); await sleep(10);
    eq(RV.changesOf().length, 1, 'añadir y mover el mismo objeto enseguida: un solo cambio');
    eq(RV.changesOf()[0].author, 'Ana', 'con su autor'); eq(RV.describe(RV.changesOf()[0]), 'Objeto añadido');
    R.store.commit(() => { a.x = 300; }); await sleep(10);
    eq(RV.changesOf().length, 2, 'otro objeto: otro cambio'); eq(RV.describe(RV.changesOf()[1]), 'Movido o cambiado de tamaño');
    R.store.commit(() => { R.state.ui.showReview = true; }, { history: false }); await sleep(20);
    eq(D.querySelectorAll('#review-panel .rv-item').length, 2, 'en el panel'); assert(D.querySelector(`.block[data-id="${a.id}"]`).classList.contains('rv-changed'), 'y marcados en la diapositiva');
    const old = RV.changesOf()[1].undo.find(o => o.p.at(-1) === 'x').v;
    RV.reject(RV.changesOf()[1].id); await sleep(10);
    eq(slide().blocks.find(x => x.id === a.id).x, old, 'rechazar: vuelve lo de antes'); eq(RV.changesOf().length, 1);
    RV.reject(RV.changesOf()[0].id); await sleep(10);
    assert(!slide().blocks.some(x => x.id === b.id), 'rechazar un objeto añadido: desaparece');
    R.store.commit(() => { a.y = 10; }); await sleep(10); RV.accept(RV.changesOf()[0].id); await sleep(10);
    eq(slide().blocks.find(x => x.id === a.id).y, 10, 'aceptar: se queda'); eq(RV.changesOf().length, 0, 'y el registro se va');
    R.store.commit(() => { a.y = 20; }); await sleep(10); R.store.undo(); await sleep(10);
    eq(RV.changesOf().length, 0, 'deshacer también quita el registro');
    R.store.applyRemote(root => { const x = root.slides[R.state.ui.slideIndex]?.blocks.find(x => x.id === a.id); if (x) x.y = 99; }); await sleep(10);
    eq(RV.changesOf().length, 0, 'los cambios de otros (en directo) los anota quien los hace, no aquí');
    RV.setTracking(false); R.store.commit(() => { R.state.ui.showReview = false; }, { history: false });
  });

  await test('cinta: los grupos de controles pequeños ocupan dos filas (se aprovecha la altura)', async () => {
    reset(); D.querySelector('[data-tab="home"]').click(); await sleep(50);
    // Home ▸ Font: one group, as in PowerPoint: family and size above, bold, italic… below.
    const font = D.querySelector('[data-fmt="bold"]').closest('.group');
    eq(D.querySelector('[data-font]').closest('.group'), font, 'tipo de letra y formato, en un solo grupo «Fuente»');
    eq(font.querySelectorAll(':scope > .row').length, 2, 'Fuente: dos filas');
    const top = sel => D.querySelector(sel).getBoundingClientRect().top;
    assert(top('[data-font]') < top('[data-fmt="bold"]') && Math.abs(top('[data-fmt="bold"]') - top('[data-fmt="removeFormat"]')) < 4, 'el tipo de letra encima; negrita… quitar formato, debajo en una fila');
    D.querySelector('[data-tab="design"]').click(); await sleep(50);
    const g = D.querySelector('[data-action="design-ideas"]').closest('.group');
    assert(g.classList.contains('inline-labels') && g.querySelectorAll(':scope > .row').length === 2, 'botones con texto: el texto al lado del icono, en dos filas');
    assert(D.querySelector('[data-tab="insert"]') && (D.querySelector('[data-tab="insert"]').click(), await sleep(50), !D.querySelector('[data-page="insert"] .group.two-rows .lg')), 'los botones grandes no se tocan');
    // The object tabs: labelled lists with the label beside, two by two
    R.store.commit(() => { slide().blocks.push({ id: 'm3', type: 'model', src: 'data:model/gltf-binary;base64,Z2xURg==', x: 100, y: 100, w: 300, h: 200, rotation: 0, animation: null }); R.state.ui.selection = 'm3'; R.state.ui.multi = ['m3']; });
    await sleep(50); D.querySelector('[data-tab="ctx"]').click(); await sleep(80);
    // An icon can be changed for another (same place, size and colour)
    R.blocks.addIcon('star'); await sleep(40); D.querySelector('[data-tab="ctx"]').click(); await sleep(60);
    const ic = slide().blocks.at(-1); D.querySelector('[data-page="ctx"] [data-ctx="icon-change"]').click(); await sleep(30);
    D.querySelector('.popover [data-icon="home"]').click(); await sleep(30);
    eq(slide().blocks.at(-1).icon, 'home', 'cambiar el icono'); eq(slide().blocks.at(-1).id, ic.id, 'el mismo objeto, no uno nuevo');
    R.store.commit(() => { R.state.ui.selection = 'm3'; R.state.ui.multi = ['m3']; }); await sleep(40); D.querySelector('[data-tab="ctx"]').click(); await sleep(60);
    const cam = [...D.querySelectorAll('[data-page="ctx"] .ctx-field')].find(f => /Cámara/.test(f.textContent));
    assert(cam && cam.closest('.group').classList.contains('grid2'), 'desplegables de dos en dos');
    const sp = cam.querySelector('span').getBoundingClientRect(), se = cam.querySelector('select').getBoundingClientRect();
    assert(sp.right <= se.left + 1 && Math.abs((sp.top + sp.bottom) / 2 - (se.top + se.bottom) / 2) < 8, 'con la etiqueta al lado');
    D.querySelector('[data-tab="home"]').click();
  });

  // ---- The ribbon, clear in every language --------------------------------
  const W = frame.contentWindow, PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const OBJECTS = { text: () => R.blocks.addText(), shape: () => R.blocks.addShape('rect'), image: () => R.blocks.addImage(PNG), table: () => R.blocks.addTable(),
    chart: () => R.blocks.addChart(), model: () => R.blocks.addModel('data:model/gltf-binary;base64,AAAA'), video: () => R.blocks.addVideo('data:video/mp4;base64,AAAA'),
    audio: () => R.blocks.addAudio('data:audio/mp3;base64,AAAA'), poll: () => R.poll.addPoll(), diagram: () => R.blocks.addDiagram(),
    camera: async () => (await W.eval("import('/src/features/live/media.js')")).addCamera(), math: () => R.blocks.addMath(), code: () => R.blocks.addCode(),
    timer: () => R.blocks.addTimer(), icon: () => R.blocks.addIcon('star'), embed: () => R.blocks.addEmbed('https://example.com'), slideref: () => R.blocks.addSlideRef(),
    ink: () => R.blocks.addInk([[10, 10], [100, 100], [200, 50]]), figindex: () => R.blocks.addFigIndex(),
    magnify: async () => (await W.eval("import('/src/features/document/magnify.js')")).addMagnify({ x: 100, y: 100, w: 160, h: 90 }) };
  const pick = ids => R.store.commit(() => { R.state.ui.multi = ids.length > 1 ? ids : []; R.state.ui.selection = ids.at(-1) || null; }, { history: false });
  // Every object's tab (and that of several objects), drawn: fn(page, kind).
  async function eachObjectTab(fn) {
    for (const [kind, add] of Object.entries(OBJECTS)) { reset(); pick([]); await add(); pick([last().id]); await sleep(10); await fn(D.querySelector('#ribbon [data-page="ctx"]'), kind); }
    reset(); R.blocks.addShape('rect'); R.blocks.addShape('ellipse'); pick(slide().blocks.slice(-2).map(b => b.id)); await sleep(10);
    await fn(D.querySelector('#ribbon [data-page="ctx"]'), 'several');
    pick([]); reset();
  }

  await test('cinta: cada texto (pestañas, grupos, botones, avisos, listas y pestañas de objeto) está traducido a en, fr, de, it, pt y ca', async () => {
    const { ROWS } = await W.eval("import('/src/i18n/strings.js')"), rows = new Map(ROWS.map(r => [r[0], r]));
    // (Names, the same in every language: brands, fonts, reveal.js themes.)
    const NAMES = new Set(['Revela', 'OneDrive', 'Dropbox', 'Text Art', 'Idioma / Language', 'Power BI, Looker Studio, Tableau, Google Sheets, Grafana…',
      ...[...D.querySelectorAll('#ribbon [data-font] option')].map(o => o.textContent)]);
    const found = new Map();
    const add = (s, where) => { s = (s || '').trim(); if (s.length > 1 && !/^[\d\s.,:%/–+()·×N-]*$/.test(s) && !NAMES.has(s) && !found.has(s)) found.set(s, where); };
    const scan = (root, where) => {
      root.querySelectorAll('[title]:not(#lang-select)').forEach(el => add(el.dataset.i18nt ?? el.title, where));
      root.querySelectorAll('[aria-label]').forEach(el => add(el.getAttribute('aria-label'), where));
      root.querySelectorAll('.group>label, button span, .ctx-field>span, label.color>span').forEach(el => add(el.dataset.i18n ?? el.innerHTML, where));
      // (The animation's trigger and picker list the slide's objects and its effects: made of translated parts.)
      root.querySelectorAll('select:not(#lang-select):not([data-font]):not([data-anim-trigger]):not([data-anim-pick]) option').forEach(o => { if (o.textContent.toLowerCase() !== o.value) add(o.dataset.i18n ?? o.textContent, where); });
      root.querySelectorAll('input[placeholder]').forEach(el => add(el.placeholder, where));
    };
    scan(D.getElementById('ribbon'), 'cinta'); scan(D.getElementById('statusbar'), 'barra de estado');
    D.querySelectorAll('#ribbon .tabs [data-tab]').forEach(b => add(b.dataset.i18n ?? b.textContent, 'pestañas'));
    await eachObjectTab((page, kind) => { scan(page, kind); if (kind !== 'several') add(D.querySelector('#ribbon [data-tab="ctx"]').textContent, kind); });
    const bad = [...found].filter(([s]) => !rows.has(s) || rows.get(s).slice(1, 7).some(x => !x)).map(([s, w]) => `${w}: ${s}`);
    eq(bad.length, 0, 'sin traducción: ' + bad.slice(0, 6).join(' | '));
  });

  await test('cinta: ningún botón es solo un icono sin nombre, y en una pestaña no hay dos grupos que se llamen igual (en ningún idioma)', async () => {
    const nameless = el => el.matches('button') && !el.closest('[hidden]') && !el.querySelector('span')?.textContent.trim() && !el.title && !el.getAttribute('aria-label');
    for (const p of D.querySelectorAll('#ribbon .ribbon-page:not([data-page="ctx"])'))
      for (const b of p.querySelectorAll('button')) assert(!nameless(b), `${p.dataset.page}: un botón sin nombre ni descripción (${b.outerHTML.slice(0, 80)})`);
    await eachObjectTab(page => { for (const b of page.querySelectorAll('button')) assert(!nameless(b), `pestaña de objeto: un botón sin nombre (${b.outerHTML.slice(0, 80)})`); });
    for (const lang of ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca']) {
      await R.i18n.setLang(lang);
      for (const p of D.querySelectorAll('#ribbon .ribbon-page:not([data-page="ctx"])')) {
        const names = [...p.querySelectorAll(':scope > .group:not([hidden]) > label')].map(l => l.textContent.trim());
        eq(names.filter((n, i) => names.indexOf(n) !== i).join(), '', `${lang}, ${p.dataset.page}: grupos repetidos`);
      }
    }
    await R.i18n.setLang('es');
  });

  await test('cinta: Insertar por temas, y las entradas de Animaciones con los nombres del panel de animación', async () => {
    const group = sel => D.querySelector(`#ribbon [data-page="insert"] ${sel}`).closest('.group').querySelector(':scope > label').textContent;
    eq(group('[data-action="insert-image"]'), 'Imágenes'); eq(group('[data-icons]'), 'Imágenes');
    eq(group('[data-action="insert-chart"]'), 'Tablas y gráficos'); eq(group('[data-action="insert-math"]'), 'Texto');
    eq(group('[data-action="insert-poll"]'), 'Interactivo'); eq(group('[data-template="twoContent"]'), 'Diseño de esta diapositiva', 'aplica un diseño a esta diapositiva: lo dice');
    assert(!D.querySelector('#ribbon [data-page="insert"] .group > label').textContent.includes('Básico'), 'sin un cajón de sastre «Básico»');
    const { EFFECT_NAMES } = await W.eval("import('/src/ui/panels/animation.js')");
    for (const b of D.querySelectorAll('#ribbon [data-page="animations"] [data-animation]'))
      if (EFFECT_NAMES[b.dataset.animation]) eq(b.querySelector('span').textContent, EFFECT_NAMES[b.dataset.animation], 'el mismo nombre que en el panel: ' + b.dataset.animation);
    eq(D.querySelector('[data-slide-transition="convex"] span').textContent, 'Convexa', 'transiciones en español');
  });

  await test('Insertar ▸ Guardar plantilla: la diapositiva guardada aparece en Inicio ▸ Diseño y se aplica (con objetos nuevos)', async () => {
    reset(); let saved = null; try { saved = W.localStorage.getItem('revela.templates.v1'); W.localStorage.removeItem('revela.templates.v1'); } catch {}
    try {
      slide().blocks[0].html = 'Mi portada'; R.render();
      D.querySelector('[data-action="template-save"]').click(); await sleep(30);
      D.querySelector('.modal-backdrop input').value = 'Mía'; D.querySelector('.modal-backdrop .dlg-ok').click(); await sleep(30);
      R.slides.addSlide(); await sleep(10);
      D.querySelector('#ribbon [data-layout-open]').click(); await sleep(30);
      const mine = D.querySelector('.popover [data-user-tpl]'); assert(mine && mine.textContent === 'Mía', 'en el menú de diseños, bajo «Mis plantillas»');
      const before = new Set(R.state.deck.slides.flatMap(s => s.blocks.map(b => b.id)));
      mine.click(); await sleep(20);
      assert(slide().blocks.some(b => b.html === 'Mi portada'), 'se aplica a la diapositiva');
      assert(slide().blocks.every(b => !before.has(b.id)), 'con identificadores nuevos (no los de la diapositiva de la que salió)');
    } finally { try { if (saved) W.localStorage.setItem('revela.templates.v1', saved); else W.localStorage.removeItem('revela.templates.v1'); } catch {} D.querySelectorAll('.modal-backdrop').forEach(m => m.remove()); }
  });

  await test('barra de título y barra de estado: en una ventana estrecha caben en una línea (el nombre y el idioma se ven)', async () => {
    reset();
    for (const lang of ['es', 'en']) {
      await R.i18n.setLang(lang); await sleep(20);
      const bar = D.querySelector('.titlebar'), sel = D.getElementById('lang-select').getBoundingClientRect(), name = D.querySelector('.doc-name').getBoundingClientRect();
      assert(bar.scrollWidth <= bar.clientWidth + 1 && sel.right <= W.innerWidth + 1, `${lang}: la barra de título cabe (${W.innerWidth}px)`);
      assert(name.width >= 60, `${lang}: el nombre de la presentación se ve (${Math.round(name.width)}px)`);
      const sb = D.getElementById('statusbar'), line = [...sb.children].filter(x => x.offsetParent).map(x => x.getBoundingClientRect().height);
      assert(Math.max(...line) < 32, `${lang}: la barra de estado en una línea`);
    }
    await R.i18n.setLang('es');
  });

  // ---- Dialogs and menus with the keyboard (ui/dialogs/modalkeys.js) ----
  const frameTick = () => new Promise(r => W.requestAnimationFrame(() => setTimeout(r, 0)));
  const press = (key, o = {}) => { const e = new W.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...o }); (D.activeElement || D.body).dispatchEvent(e); return e; };

  await test('diálogos: se anuncian como tales, el foco entra, Esc los cierra y el foco vuelve', async () => {
    reset(); D.querySelector('[data-tab="view"]').click(); await sleep(20);
    const btn = D.querySelector('#ribbon [data-action="shortcuts"]'); btn.focus(); btn.click(); await frameTick();
    const m = D.getElementById('sc-modal'), box = m.querySelector('.modal');
    eq(box.getAttribute('role'), 'dialog', 'role=dialog'); eq(box.getAttribute('aria-modal'), 'true', 'aria-modal');
    assert(D.getElementById(box.getAttribute('aria-labelledby'))?.textContent.trim(), 'con su título como nombre');
    eq(m.querySelector('.modal-close').getAttribute('aria-label'), 'Cerrar', 'la ✕ se lee «Cerrar»');
    assert(m.contains(D.activeElement), 'el foco entra en el diálogo');
    assert(press('Escape').defaultPrevented, 'Esc se atiende'); await sleep(10);
    assert(!D.getElementById('sc-modal'), 'Esc lo cierra');
    eq(D.activeElement, btn, 'el foco vuelve al botón que lo abrió');
    D.querySelector('[data-tab="home"]').click();
  });

  await test('móvil: la barra rápida de abajo hace lo suyo (diapositiva nueva, texto, asistente)', async () => {
    reset(); const n = R.state.deck.slides.length, q = D.getElementById('m-quick');
    q.querySelector('[data-action="slide-add"]').click(); await sleep(20); eq(R.state.deck.slides.length, n + 1, 'una diapositiva nueva');
    const b = slide().blocks.length; q.querySelector('[data-action="insert-text"]').click(); await sleep(20); eq(slide().blocks.length, b + 1, 'un cuadro de texto');
    D.activeElement?.blur?.();
    q.querySelector('[data-action="ai-assistant"]').click(); await sleep(20); assert(D.getElementById('assistant-panel'), 'el asistente');
    q.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
  });

  await test('Archivo: una página con secciones y tarjetas (no una cinta de 35 botones), Esc vuelve', async () => {
    reset(); D.querySelector('#ribbon [data-tab="file"]').click(); await sleep(20);
    const bs = D.getElementById('backstage'); assert(bs, 'se abre la página de Archivo');
    eq([...bs.querySelectorAll('.bs-tab')].map(b => b.dataset.sec).join(), 'new,open,save,share,export,print,protect', 'sus secciones');
    eq(R.state.ui.activeTab !== 'file', true, 'la cinta no cambia de pestaña');
    assert(bs.querySelectorAll('.bs-gal .gal-examples .gal-item').length > 100 && bs.querySelector('.bs-gal .gal-q'), 'Nuevo: las plantillas y los ejemplos ahí mismo, con su buscador');
    const hs = [...bs.querySelectorAll('.bs-cards .bs-card')].map(c => c.offsetHeight); assert(Math.max(...hs) - Math.min(...hs) <= 1, 'tarjetas iguales: ' + hs.join(','));
    bs.querySelector('[data-sec="export"]').click(); await sleep(10);
    assert(bs.querySelector('[data-bs-action="export-pdf"] small').textContent.length > 10, 'cada tarjeta dice qué hace');
    bs.querySelector('[data-sec="save"]').click(); await sleep(10);
    bs.querySelector('[data-bs-action="versions"]').click(); await sleep(40);
    assert(!D.getElementById('backstage') && D.querySelector('.modal-backdrop'), 'una tarjeta hace lo suyo (Versiones) y la página se cierra');
    D.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
    D.querySelector('#ribbon [data-tab="file"]').click(); await sleep(20);
    D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20);
    assert(!D.getElementById('backstage'), 'Esc vuelve a la presentación');
  });

  await test('confirmación: si se pierde algo, el foco en Cancelar y el botón dice qué hace; Esc cancela; Tab no sale del diálogo', async () => {
    reset(); R.blocks.addText('Algo'); const n = slide().blocks.length;
    D.querySelector('[data-action="new"]').click(); await frameTick();
    assert(D.activeElement?.classList.contains('dlg-cancel'), 'el foco en Cancelar (Intro no descarta el trabajo)');
    eq(D.querySelector('.modal-backdrop .dlg-ok').textContent, 'Descartar la actual', 'el botón dice qué hace');
    press('Tab'); assert(D.querySelector('.modal-backdrop').contains(D.activeElement), 'Tab desde el último botón vuelve al primero');
    press('Tab', { shiftKey: true }); assert(D.querySelector('.modal-backdrop').contains(D.activeElement), 'y Mayús+Tab al revés');
    press('Escape'); await sleep(20);
    assert(!D.querySelector('.modal-backdrop'), 'Esc cierra la pregunta');
    eq(slide().blocks.length, n, 'y equivale a Cancelar: nada se pierde');
  });

  await test('Esc cierra primero el menú abierto (galería, menú contextual), sin quitar la selección', async () => {
    reset(); R.blocks.addText('Hola'); const id = R.state.ui.selection; await sleep(10);
    D.querySelector('[data-newslide-open]').click(); await sleep(10);
    assert(D.querySelector('.popover'), 'la galería de diseños se abre');
    press('Escape'); assert(!D.querySelector('.popover'), 'Esc la cierra'); eq(R.state.ui.selection, id, 'el objeto sigue seleccionado');
    const st = D.getElementById('stage').getBoundingClientRect();
    D.getElementById('stage').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: st.left + 5, clientY: st.top + 5 })); await sleep(10);
    assert(!D.getElementById('context-menu').hidden, 'el menú contextual se abre');
    press('Escape'); assert(D.getElementById('context-menu').hidden, 'Esc lo cierra');
  });

  await test('archivos soltados en cualquier parte de la ventana (no solo en la diapositiva) se insertan, con aviso al arrastrar', async () => {
    reset(); const n = slide().blocks.length;
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGP4z8AARwzIHABvqgf5gNwAKAAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
    const dt = new W.DataTransfer(); dt.items.add(new W.File([png], 'foto.png', { type: 'image/png' }));
    const ribbon = D.querySelector('#ribbon .tabs');
    const over = new W.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }); ribbon.dispatchEvent(over);
    assert(over.defaultPrevented, 'la ventana acepta el archivo (el navegador no se va del editor a mostrarlo)');
    assert(D.body.classList.contains('file-drag') && D.body.dataset.dropHint, 'se dice qué pasará al soltarlo');
    const drop = new W.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }); ribbon.dispatchEvent(drop);
    assert(drop.defaultPrevented, 'soltado en la cinta, el navegador no lo abre'); await sleep(150);
    eq(slide().blocks.length, n + 1, 'la imagen entra en la diapositiva'); eq(slide().blocks.at(-1).type, 'image', 'como imagen');
    assert(!D.body.classList.contains('file-drag'), 'el aviso se va');
  });

  await test('Guardar y exportar dicen qué ha pasado (avisos abajo)', async () => {
    reset(); await sleep(150); D.getElementById('toasts')?.remove();   // (the previous test's copy kept on reset may have said so)
    // Kept only in this browser, Save asks where (never a download every time); a file is one of the choices.
    D.querySelector('#ribbon [data-action="save"].mini').click(); await sleep(20);
    const where = D.getElementById('save-where'); assert(where, 'Guardar pregunta dónde');
    eq([...where.querySelectorAll('[data-w]')].map(b => b.dataset.w).filter(w => w !== 'cloud').join(), 'drive,onedrive,file', 'Drive, OneDrive o un archivo');
    where.querySelector('[data-w="file"]').click(); await sleep(20);
    const box = D.getElementById('toasts');
    assert(box && box.getAttribute('aria-live') === 'polite', 'una zona de avisos que se lee en voz alta');
    assert(/revela\.json/.test(box.textContent) && /Abrir/.test(box.textContent), 'dice qué se descargó y cómo seguir: ' + box.textContent);
    box.querySelector('.toast').click(); await sleep(300); eq(box.children.length, 0, 'un clic lo quita');
  });

  await test('si el navegador no puede guardar, la barra lo dice y un clic descarga una copia', async () => {
    reset(); const S = W.Storage.prototype, P = W.IDBObjectStore.prototype, set = S.setItem, put = P.put;
    const ss = D.getElementById('save-state');
    try {
      S.setItem = function (k) { if (k === R.model.STORAGE_KEY) throw new W.DOMException('lleno', 'QuotaExceededError'); return set.apply(this, arguments); };
      P.put = function () { throw new W.DOMException('lleno', 'QuotaExceededError'); };
      R.blocks.addText('Algo'); await sleep(700);
      assert(ss.classList.contains('failed') && !ss.hidden, 'aviso «Sin guardar» a la vista');
      eq(ss.querySelector('span').textContent, 'Sin guardar', 'con texto'); assert(/descargar una copia/.test(ss.title), 'y qué hacer');
    } finally { S.setItem = set; P.put = put; }
    R.blocks.addText('Otra'); await sleep(700);
    assert(!ss.classList.contains('failed'), 'al volver a poder guardar, vuelve «En este navegador»');
    eq(ss.querySelector('span').textContent, 'En este navegador', 'texto de vuelta');
    // A click: where to keep it (Drive first; a file too).
    ss.click(); await sleep(20); const sw = D.getElementById('save-where');
    assert(sw && sw.querySelector('[data-w="drive"]') && sw.querySelector('[data-w="file"]'), 'pregunta dónde guardarla: Drive primero, o un archivo'); sw.remove();
  });

  // ---- Command search (ui/shell/palette.js) ----
  const P = () => R.palette, pal = () => D.getElementById('cmd-palette'), pin = () => pal()?.querySelector('input');
  const keyOn = (el, key, o = {}) => el.dispatchEvent(new W.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...o }));
  const typeIn = async q => { pin().value = q; pin().dispatchEvent(new W.Event('input')); await sleep(10); };
  const ids = q => P().search(P().buildIndex(), q).map(e => e.id);
  const top = q => P().search(P().buildIndex(), q)[0];
  const freshUse = () => { try { W.localStorage.removeItem('revela.palette.v1'); } catch {} };

  await test('paleta de comandos: Ctrl+K, Alt+Q y «/» la abren; Esc la cierra y devuelve el foco', async () => {
    reset(); const st = D.getElementById('stage'); st.focus();
    keyOn(st, 'k', { ctrlKey: true }); await sleep(10);
    assert(pal() && D.activeElement === pin(), 'Ctrl+K: abierta, escribiendo en ella');
    eq(pin().getAttribute('role'), 'combobox', 'combobox'); eq(pal().querySelector('[role=listbox]').id, pin().getAttribute('aria-controls'), 'con su lista');
    assert(pin().getAttribute('aria-activedescendant') === pal().querySelector('[role=option][aria-selected=true]').id, 'aria-activedescendant: la opción activa');
    keyOn(pin(), 'ArrowDown'); assert(pal().querySelector('#cmdp-o1').getAttribute('aria-selected') === 'true', '↓ baja');
    keyOn(pin(), 'Escape'); await sleep(10);
    assert(!pal() && D.activeElement === st, 'Esc: cerrada y el foco donde estaba');
    keyOn(st, 'q', { altKey: true, code: 'KeyQ' }); await sleep(10); assert(pal(), 'Alt+Q (como Office)');
    keyOn(pin(), 'k', { metaKey: true }); await sleep(10); assert(!pal(), 'Ctrl/⌘+K otra vez: se cierra');
    keyOn(st, '/'); await sleep(10); assert(pal(), '«/» fuera de un campo'); keyOn(pin(), 'Escape'); await sleep(10);
    const notes = D.getElementById('notes'); keyOn(notes, '/'); await sleep(10); assert(!pal(), '«/» escribiendo: es una barra');
    D.getElementById('cmd-search').click(); await sleep(10); assert(pal(), 'el buscador de la barra de título la abre');
    keyOn(pin(), 'Escape'); await sleep(10);
  });

  await test('paleta de comandos: «codigo», «poner código» y sinónimos, sin acentos ni mayúsculas', async () => {
    reset(); freshUse();
    eq(top('codigo').id, 'a:insert-code', 'sin acento'); eq(top('CÓDIGO').id, 'a:insert-code', 'mayúsculas');
    eq(top('poner código').id, 'a:insert-code', 'con un verbo'); eq(top('codgo').id, 'a:insert-code', 'con una errata');
    for (const [q, id] of [['formula', 'a:insert-math'], ['latex', 'a:insert-math'], ['pie de pagina', 'a:insert-hf'], ['numerar diapositivas', 'a:insert-hf'], ['lupa', 'a:insert-magnify'],
      ['mando', 'a:connect-mobile'], ['narracion', 'a:ai-voiceover'], ['compartir', 'a:share']]) eq(top(q)?.id, id, q);
    assert(ids('imagen 3d').slice(0, 3).some(x => ['a:insert-model', 'a:resources-3d'].includes(x)), 'imagen 3D: los modelos 3D');
    assert(['a:insert-model', 'a:resources-3d'].every(x => ids('objeto 3d').slice(0, 4).includes(x)), 'objeto 3D: Modelo 3D y Buscar en 3D');
    assert(ids('pdf').slice(0, 3).includes('a:export-pdf') && ids('powerpoint').slice(0, 3).includes('a:export-pptx'), 'pdf y powerpoint');
    eq(top('transparencia').id, 'ctx:Opacidad', 'transparencia: la opacidad');
    const e = top('codigo'); eq(e.path.join(' ▸ '), 'Insertar ▸ Texto', 'dice dónde está en la cinta');
    eq(top('deshacer').keys, 'Ctrl+Z', 'y su atajo');
  });

  await test('paleta de comandos: el idioma no importa (se busca en es, en, fr…; se muestra en el de la interfaz)', async () => {
    reset();
    eq(top('insert code').id, 'a:insert-code', 'en español, «insert code»'); eq(top('insérer image').id, 'a:insert-image', '«insérer image»');
    eq(top('einfügen tabelle')?.id, 'a:insert-table', '«einfügen tabelle»'); eq(top('remove background').id, 'ctx:Quitar fondo', '«remove background»');
    try {
      await R.i18n.setLang('en'); await sleep(20);
      const e = top('código'); eq(e.id, 'a:insert-code', 'en inglés, «código»'); eq(e.label, 'Code', 'mostrado en inglés'); eq(e.path[0], 'Insert', 'con su sitio en inglés');
      eq(top('pie de página').id, 'a:insert-hf', 'sinónimo en español con la interfaz en inglés');
      eq(top('footer').id, 'a:insert-hf', 'y en inglés');
      await R.i18n.setLang('fr'); await sleep(20);
      eq(top('tabla').id, 'a:insert-table', 'en francés, «tabla»'); eq(top('tabla').label, 'Tableau', 'mostrado en francés');
    } finally { await R.i18n.setLang('es'); }
  });

  await test('paleta de comandos: ejecutar hace lo mismo que la cinta (y se deshace), abriendo su pestaña y señalando el botón', async () => {
    reset(); freshUse(); const n = slide().blocks.length;
    P().openPalette(); await typeIn('insertar tabla');
    eq(pal().querySelector('[role=option][aria-selected=true]').dataset.id, 'a:insert-table', 'la primera: Insertar ▸ Tabla');
    keyOn(pin(), 'Enter'); await sleep(30);
    assert(!pal(), 'se cierra'); eq(slide().blocks.length, n + 1, 'tabla insertada'); eq(last().type, 'table', 'una tabla');
    R.store.undo(); eq(slide().blocks.length, n, 'se deshace como siempre');
    R.store.setSelection(null); R.render();
    P().openPalette(); await typeIn('transicion fundido'); keyOn(pin(), 'Enter'); await sleep(40);
    eq(slide().transition, 'fade', 'transición de la diapositiva'); eq(R.state.ui.activeTab, 'transitions', 'con su pestaña abierta');
    assert(D.querySelector('[data-slide-transition="fade"]').classList.contains('cmdp-flash'), 'y el botón señalado');
    P().openPalette(); await typeIn('estrella'); keyOn(pin(), 'Enter'); await sleep(30);
    eq(last().shape, 'star', 'una forma de la galería');
    P().openPalette(); await typeIn('velocidad lenta'); const sel = pal().querySelector('[role=option][aria-selected=true]').dataset.id;
    keyOn(pin(), 'Enter'); await sleep(30);
    assert(/^s:/.test(sel) && (R.state.deck.transitionSpeed === 'slow' || slide().transitionSpeed === 'slow'), 'una opción de una lista (' + sel + ')');
  });

  await test('paleta de comandos: escribiendo, el texto seleccionado sigue seleccionado para darle formato', async () => {
    reset(); const b = newText(); b.html = 'hola mundo'; R.render(); await sleep(20);
    D.querySelector(`#stage .block[data-id="${b.id}"]`).dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true })); const rich = richOf(b);
    const r = D.createRange(); r.selectNodeContents(rich); const s = D.getSelection(); s.removeAllRanges(); s.addRange(r);
    keyOn(rich, 'k', { ctrlKey: true }); await sleep(10); assert(pal(), 'Ctrl+K también escribiendo');
    await typeIn('negrita'); keyOn(pin(), 'Enter'); await sleep(30);
    assert(D.activeElement === rich, 'el foco vuelve al texto');
    rich.blur(); await sleep(20);
    assert(/<b>|font-weight/.test(b.html), 'negrita aplicada a lo seleccionado: ' + b.html);
  });

  await test('paleta de comandos: recientes primero, el último arriba', async () => {
    reset(); freshUse();
    P().runQuery('guías'); P().runQuery('guías'); P().runQuery('regla');
    P().openPalette(); await sleep(10);
    eq(pal().querySelector('.cmdp-head').textContent, 'Recientes', 'sección de recientes');
    const opts = [...pal().querySelectorAll('[role=option]')].map(o => o.dataset.id);
    eq(opts.slice(0, 2).join(), 'a:toggle-ruler,a:toggle-guides', 'el último usado primero');
    assert(pal().querySelectorAll('.cmdp-head')[1]?.textContent === 'Sugerencias' && opts.includes('a:insert-image'), 'y sugerencias');
    keyOn(pin(), 'Escape'); await sleep(10);
    R.state.ui.showGuides = false; R.state.ui.showRuler = false; R.render(); freshUse();
    const at = (q, id) => P().search(P().buildIndex(), q).findIndex(e => e.id === id);
    const before = at('notas', 'a:toggle-notes'); P().runQuery('notas del orador'); P().runQuery('notas del orador'); P().runQuery('notas del orador');
    assert(at('notas', 'a:toggle-notes') < before || before === 0, `lo que más se usa sube (${before} → ${at('notas', 'a:toggle-notes')})`);
    R.state.ui.showNotes = false; R.render(); freshUse();
  });

  await test('paleta de comandos: con un objeto seleccionado, sus comandos primero; sin él, en gris y con el motivo', async () => {
    reset(); freshUse();
    let e = top('quitar fondo'); eq(e.id, 'ctx:Quitar fondo', 'se encuentra sin imagen'); eq(e.why, 'Selecciona una imagen', 'con el motivo');
    P().openPalette(); await typeIn('quitar fondo');
    const o = pal().querySelector('[role=option]'); eq(o.getAttribute('aria-disabled'), 'true', 'en gris'); assert(/Selecciona una imagen/.test(o.textContent), 'se lee el motivo');
    keyOn(pin(), 'Enter'); await sleep(10); assert(pal(), 'Intro no hace nada'); keyOn(pin(), 'Escape'); await sleep(10);
    eq(top('agrupar').why, 'Selecciona dos o más objetos', 'botón de la cinta desactivado: su motivo');
    R.blocks.addImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGP4z8AARwzIHABvqgf5gNwAKAAAAABJRU5ErkJggg=='); select(last()); await sleep(30);
    e = top('quitar fondo'); eq(e.id, 'ctx:Quitar fondo', 'con la imagen'); eq(e.why, '', 'ya disponible'); eq(e.path[0], 'Imagen', 'en la pestaña de la imagen');
    eq(top('sombra').ctx, true, 'sombra: la del objeto seleccionado primero');
    assert(P().search(P().buildIndex(), 'ajustar contener').some(x => x.ctx), 'también lo del menú contextual');
  });

  await test('paleta de comandos: ir a una diapositiva, plantillas por nombre, ayuda y preguntar al asistente', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.slides.goToSlide(0); await sleep(10);
    P().openPalette(); await typeIn('3'); keyOn(pin(), 'Enter'); await sleep(20);
    eq(R.state.ui.slideIndex, 2, 'a la diapositiva 3');
    const tpl = Object.values(R.examples.EXAMPLES)[0].name;
    eq(top(tpl)?.kind, 'template', 'una plantilla por su nombre (' + tpl + ')');
    eq(top('ayuda sin conexion')?.id, 'h:offline', 'ayuda');
    P().openPalette(); await typeIn('hazlo más bonito');
    const opts = pal().querySelectorAll('[role=option]'), ask = opts[opts.length - 1];
    eq(ask.dataset.id, 'x:ask', 'lo último: preguntar al asistente'); assert(/hazlo más bonito/.test(ask.textContent), 'con lo escrito');
    ask.click(); await sleep(40);
    const ta = D.querySelector('#assistant-panel textarea'); assert(ta && ta.value === 'hazlo más bonito', 'abre el asistente con la pregunta');
    R.store.commit(() => { R.state.ui.showAssistant = false; }, { history: false });
  });

  await test('paleta de comandos: el buscador de la barra de título no la desborda', async () => {
    reset();
    for (const lang of ['es', 'en', 'de']) {
      await R.i18n.setLang(lang); await sleep(20);
      const bar = D.querySelector('.titlebar'), b = D.getElementById('cmd-search').getBoundingClientRect(), name = D.querySelector('.doc-name').getBoundingClientRect();
      assert(bar.scrollWidth <= bar.clientWidth + 1, `${lang}: la barra cabe (${W.innerWidth}px)`);
      assert(b.width >= 24 && b.right <= W.innerWidth && (b.left >= name.right || b.right <= name.left), `${lang}: el buscador se ve, sin tapar el nombre`);
    }
    await R.i18n.setLang('es');
  });
}
