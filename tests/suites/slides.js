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

  await test('encabezado y pie: el diálogo activa el número de diapositiva', async () => {
    reset(); D.querySelector('[data-action="insert-hf"]').click(); await sleep(10);
    const num = D.querySelector('#hf-modal .hf-num'); assert(num, 'diálogo de encabezado/pie');
    num.checked = true; num.dispatchEvent(new Event('change'));
    assert(R.state.deck.slideNumber.show, 'número activado');
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
    eq(D.querySelectorAll('#gallery-modal .gal-grid:not(.gal-examples) .gal-item').length, Object.keys(R.gallery.GALLERY).length, 'una miniatura por plantilla');
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

  await test('10 presentaciones de ejemplo completas: se abren, usan patrón y diseños y se exportan', async () => {
    reset(); D.querySelector('[data-action="gallery"]').click(); await sleep(50);
    const items = D.querySelectorAll('#gallery-modal .gal-examples .gal-item');
    eq(items.length, 10, 'diez ejemplos en la galería');
    D.querySelector('#gallery-modal .modal-close').click();
    const kinds = new Set();
    for (const key of Object.keys(R.examples.EXAMPLES)) {
      const deck = R.examples.buildExample(key);
      assert(deck.slides.length >= 4, key + ': varias diapositivas');
      assert(deck.master.styles?.title?.font && deck.layouts?.length, key + ': con estilos de patrón y diseños');
      assert(deck.slides.every(s => deck.layouts.some(l => l.id === s.layoutId)), key + ': cada diapositiva con su diseño');
      const ph = deck.slides.flatMap(s => s.blocks.filter(b => b.ph));
      assert(ph.length && ph.every(b => b.lp && b.fontSize == null), key + ': los marcadores heredan del patrón');
      for (const s of deck.slides) for (const b of s.blocks) kinds.add(b.type === 'poll' ? 'poll:' + b.kind : b.type), b.animation && kinds.add('anim');
      if (deck.slides.some(s => s.autoAnimate)) kinds.add('auto-animate');
      if (deck.slides.some(s => s.vertical)) kinds.add('vertical');
      R.store.replaceDeck(deck); R.render(); await sleep(10);
      const html = R.io.buildHTML();
      eq((html.match(/<section/g) || []).length - (deck.slides.some(s => s.vertical) ? 1 : 0), deck.slides.length, key + ': todas las diapositivas en la presentación');
      assert(!/Haz clic para/.test(html), key + ': sin avisos de marcador vacíos');
    }
    for (const k of ['chart', 'table', 'code', 'math', 'poll:choice', 'poll:qa', 'icon', 'shape', 'anim', 'auto-animate', 'vertical'])
      assert(kinds.has(k), 'los ejemplos enseñan: ' + k);
    // Opening one from the gallery.
    reset(); D.querySelector('[data-action="gallery"]').click(); await sleep(50);
    D.querySelector('#gallery-modal [data-example="coding"]').click(); await sleep(20);
    D.querySelector('.modal-backdrop .dlg-ok').click(); await sleep(50);
    eq(R.state.deck.name, 'Taller de programación', 'abre el ejemplo elegido');
    assert(D.querySelector('#stage .block'), 'y se ve en el lienzo');
  });
}
