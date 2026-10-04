// Text and formatting: fonts, paragraphs, lists, styles, WordArt, links, find & replace, languages.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('fuentes propias: se suben, van dentro de la presentación y se usan como las demás', async () => {
    reset(); const W = frame.contentWindow, F = await W.eval("import('/src/features/design/fonts.js')");
    const data = F.fontDataURL('data:application/octet-stream;base64,AAEAAAALAIAAAwAwT1MvMg==', 'MiMarca-Bold.ttf');
    eq(data.slice(0, 20), 'data:font/ttf;base64', 'con su tipo de fuente');
    const stack = R.blocks.addCustomFont('Mi Marca', data); await sleep(20);
    eq(stack, '"Mi Marca", sans-serif', 'su nombre, para usarla');
    const sel = D.querySelector('#ribbon [data-font]');
    assert([...sel.querySelectorAll('optgroup option')].some(o => o.value === stack), 'en el selector, entre las fuentes de la presentación');
    assert([...sel.options].some(o => o.value === '__upload'), 'y la opción para subir otra');
    assert(/@font-face\{font-family:"Mi Marca";src:url\(data:font\/ttf;base64,/.test(D.getElementById('rv-custom-fonts')?.textContent || ''), 'el editor la conoce');
    const b = newText(); R.store.commit(() => { slide().blocks.find(x => x.id === b.id).fontFamily = stack; }); await sleep(10);
    assert(/@font-face\{font-family:"Mi Marca"/.test(R.io.buildHTML()), 'la presentación la lleva dentro');
    // Nothing that could break out of the style sheet.
    eq(F.customFonts({ fonts: [{ name: 'x";}body{display:none', src: data }, { name: 'Ok', src: 'data:font/ttf;base64,AA)};' }] }).length, 0, 'nombres y datos raros, fuera');
  });

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

  await test('catálogo de fuentes amplio (40+)', async () => {
    assert(D.querySelectorAll('[data-font] option').length >= 40, 'faltan fuentes en el selector');
  });

  await test('fuente de Google se carga bajo demanda y se embebe al exportar', async () => {
    reset(); const b = newText(); R.format.fontFamily("'Roboto', sans-serif"); await sleep(20);
    assert(D.querySelector('link[href*="Roboto"]'), 'no se inyectó la fuente Roboto');
    assert(/fonts\.googleapis\.com\/css2\?family=Roboto/.test(R.io.buildHTML()), 'export sin la fuente');
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
    eq(b.indent, 40, 'indent'); assert(/padding:6px 6px 6px 46px/.test(R.io.buildHTML()), 'export: margen interno + sangría, igual que en el editor');
    R.format.adjustIndent(24); eq(b.indent, 64, 'aumentar sangría');
    R.format.adjustIndent(-100); eq(b.indent, 0, 'no baja de 0');
  });

  await test('alineación vertical del cuadro de texto en el export', async () => {
    reset(); const b = newText(); R.format.setVAlign('middle');
    assert(/align-content:center/.test(R.io.buildHTML()), 'centrado vertical');
    // (On the block itself, not as a flex column: a bold word stays in its line.)
    b.html = 'Una <b>palabra</b> en negrita'; b.h = 300; R.render(); await sleep(20);
    const r = richOf(b), bold = r.querySelector('b').getBoundingClientRect(), all = r.getBoundingClientRect();
    assert(Math.abs(bold.top + bold.height / 2 - (all.top + all.height / 2)) < 30, 'centrado en el editor');
    const range = D.createRange(); range.selectNodeContents(r);
    eq(new Set([...range.getClientRects()].map(x => Math.round(x.top))).size, 1, 'todo en una línea');
  });

  await test('insertar símbolo en el texto', async () => {
    reset(); const b = newText(); b.html = ''; R.render(); await sleep(20);
    const rich = richOf(b); rich.contentEditable = 'true'; rich.focus();
    R.format.insertSymbol('★'); await sleep(10);
    assert((b.html || '').includes('★'), 'símbolo insertado');
  });

  await test('cuadro de texto con relleno y borde en el export', async () => {
    reset(); const b = newText(); R.blocks.setBoxStyle({ bg: '#3f6497', borderColor: '#1e2a3a', radius: 12 });
    const html = R.io.buildHTML();
    assert(/background:#3f6497;border:2px solid #1e2a3a;border-radius:12px/.test(html), 'relleno/borde en export');
  });

  await test('LaTeX en línea ($…$) en el texto se renderiza en el export', async () => {
    reset(); const b = newText(); b.html = 'Energía: $E=mc^2$'; R.render();
    const html = R.io.buildHTML();
    assert(/auto-render\.min\.js/.test(html), 'auto-render de KaTeX incluido');
    assert(/renderMathInElement/.test(html), 'inicialización de math en línea');
  });

  await test('copiar y pegar formato entre cuadros de texto', async () => {
    reset(); R.blocks.addText(); R.blocks.addText();
    const a = slide().blocks.at(-2), b = slide().blocks.at(-1);
    a.fontSize = 66; a.textAlign = 'center'; a.bullet = 'square';
    R.state.ui.selection = a.id; R.format.copyStyle();
    R.state.ui.selection = b.id; R.state.ui.multi = [b.id]; R.format.pasteStyle();
    eq(b.fontSize, 66, 'tamaño copiado'); eq(b.textAlign, 'center', 'alineación'); eq(b.bullet, 'square', 'viñeta');
  });

  await test('copiar formato de cualquier objeto: formas, imágenes, conectores, y de una forma a un cuadro de texto', async () => {
    reset(); const pick = x => { R.state.ui.multi = []; select(x); };
    R.blocks.addShape('rect'); R.blocks.addShape('ellipse'); R.blocks.addText();
    const [s1, s2, tx] = slide().blocks.slice(-3);
    Object.assign(s1, { fill: '#ff0000', fill2: '#0000ff', gradType: 'radial', stroke: '#00ff00', strokeWidth: 5, dash: 'dot', sketch: true, fontSize: 50, color: '#ffffff' });
    s2.shadow = { x: 4, y: 4, blur: 8 };
    pick(s1); await sleep(10);
    assert(!D.querySelector('[data-action="copy-style"]').disabled, 'se puede copiar con una forma');
    D.querySelector('[data-action="copy-style"]').click(); await sleep(10);
    pick(s2); await sleep(10); D.querySelector('[data-action="paste-style"]').click(); await sleep(10);
    eq(s2.fill, '#ff0000'); eq(s2.gradType, 'radial'); eq(s2.strokeWidth, 5); eq(s2.dash, 'dot'); assert(s2.sketch, 'a mano alzada');
    assert(!s2.shadow, 'sin la sombra que el original no tiene'); eq(s2.shape, 'ellipse', 'su forma no cambia');
    pick(tx); R.format.pasteStyle(); eq(tx.fontSize, 50, 'a un texto: el tamaño de letra'); eq(tx.color, '#ffffff'); assert(!tx.fill, 'pero no el relleno de forma');
    // Pictures: corrections and border.
    R.store.commit(() => slide().blocks.push({ id: 'i1', type: 'image', src: 'data:image/png;base64,iVBORw0KGgo=', x: 0, y: 0, w: 100, h: 100, rotation: 0, animation: null, adj: { brightness: 130 }, radius: 20 },
      { id: 'i2', type: 'image', src: 'data:image/png;base64,iVBORw0KGgo=', x: 200, y: 0, w: 100, h: 100, rotation: 0, animation: null }));
    const [i1, i2] = slide().blocks.slice(-2);
    pick(i1); R.format.copyStyle(); pick(i2); R.format.pasteStyle();
    eq(i2.adj.brightness, 130, 'correcciones de imagen'); eq(i2.radius, 20, 'redondeo');
    i1.adj.brightness = 50; eq(i2.adj.brightness, 130, 'copia independiente');
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

  await test('dirección RTL del texto en el export', async () => {
    reset(); const b = newText(); R.format.toggleDir();
    assert(/direction:rtl/.test(R.io.buildHTML()), 'direction:rtl en el export');
  });

  await test('texto vertical en el export', async () => {
    reset(); const b = newText(); R.format.toggleVertical();
    assert(/writing-mode:vertical-rl/.test(R.io.buildHTML()), 'writing-mode vertical');
  });

  await test('buscar y reemplazar respeta el formato (nodos de texto)', async () => {
    reset(); const b = newText();
    b.html = 'Hola <b>mundo</b> y mundo'; R.render();
    eq(R.search.countMatches('mundo', true), 2, 'cuenta coincidencias');
    const n = R.search.replaceAll('mundo', 'planeta', true);
    eq(n, 2, 'reemplazos'); eq(b.html, 'Hola <b>planeta</b> y planeta', 'conserva el <b>');
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

  await test('Markdown, ajustar texto al cuadro y ampliar imágenes', async () => {
    reset();
    const md = '# Mi charla\n\n---\n\n## Puntos\n\n- **Uno** y *dos*\n  - anidado\n- [enlace](https://x.org)\n\nNote: decir esto\n\n--\n\n## Código\n\n```js [1|2]\nlet a = 1;\nlet b = 2;\n```\n\n---\n\n![Logo](https://x.org/l.png)';
    const sl = R.markdown.markdownToSlides(md);
    eq(sl.length, 4, 'cuatro diapositivas'); eq(sl[0].blocks[0].textAlign, 'center', 'portada centrada');
    const body = sl[1].blocks.find(b => b.ph === 'body').html;
    assert(/<ul><li><b>Uno<\/b> y <i>dos<\/i><\/li><ul><li>anidado<\/li><\/ul><li><a href="https:\/\/x\.org">enlace<\/a><\/li><\/ul>/.test(body), 'listas anidadas, negrita, cursiva y enlaces: ' + body);
    eq(sl[1].notes, 'decir esto', 'notas'); assert(sl[2].vertical, '-- crea una vertical');
    const code = sl[2].blocks.find(b => b.type === 'code'); eq(code.lang, 'js', 'lenguaje'); eq(code.lineSteps, '1|2', 'pasos de líneas');
    eq(sl[3].blocks[0].type, 'image', 'imagen');
    // ajustar al cuadro
    const t = slide().blocks[1]; t.html = 'Hola'; t.fontSize = 20; R.render(); await sleep(10);
    const { fitTextToBox } = await frame.contentWindow.eval("import('/src/ui/canvas/canvas.js')");
    fitTextToBox(t); assert(t.fontSize > 40, 'crece hasta llenar el cuadro: ' + t.fontSize);
    const big = t.fontSize; t.html = 'Hola '.repeat(40); R.render(); fitTextToBox(t); assert(t.fontSize < big, 'con más texto, más pequeño');
    // ampliar imagen
    R.blocks.addImage('data:image/gif;base64,R0lGODlhAQABAAAAACw='); const im = last(); im.zoomable = true;
    const html = R.io.buildHTML(); assert(/data-lightbox/.test(html) && /cursor:zoom-in/.test(html), 'imagen ampliable en el export');
  });

  await test('localización: cambiar de idioma traduce la interfaz', async () => {
    await R.i18n.setLang('en');
    const tab = D.querySelector('#ribbon .tabs button[data-tab="home"]');
    eq(tab.textContent.trim(), 'Home', 'Inicio → Home');
    eq(R.i18n.t('Guardar'), 'Save', 't() traduce');
    eq(R.i18n.t('Datos del gráfico'), 'Chart data', 'cadena de modal traducida');
    eq(R.i18n.t('Buscar y reemplazar'), 'Find and replace', 'panel de búsqueda traducido');
    await R.i18n.setLang('fr');
    eq(tab.textContent.trim(), 'Accueil', 'Inicio → Accueil');
    await R.i18n.setLang('nl');
    eq(D.querySelector('#ribbon .tabs button[data-tab="file"]').textContent.trim(), 'Bestand', 'Archivo → Bestand');
    eq(R.i18n.t('Diagramas'), 'Diagrammen', 'NL cubre más etiquetas'); assert(/toegankelijkheid/i.test(R.i18n.t('Comprobar accesibilidad')), 'NL completo');
    await R.i18n.setLang('gl');
    eq(R.i18n.t('Pie de página'), 'Pé de páxina', 'GL cubre más etiquetas');
    await R.i18n.setLang('eu');
    eq(tab.textContent.trim(), 'Hasiera', 'euskera');
    await R.i18n.setLang('ar');
    eq(D.documentElement.dir, 'rtl', 'árabe: interfaz de derecha a izquierda');
    eq(tab.textContent.trim(), 'الصفحة الرئيسية', 'árabe traducido');
    assert(/[\u0600-\u06FF]/.test(R.i18n.t('Comprobar accesibilidad')), 'el árabe ya está completo');
    eq(R.i18n.t('Texto que no existe'), 'Texto que no existe', 'lo desconocido se queda como está');
    eq(getComputedStyle(D.getElementById('canvas-wrap')).direction, 'ltr', 'la diapositiva sigue de izquierda a derecha');
    await R.i18n.setLang('es');
    eq(D.documentElement.dir, 'ltr', 'vuelve a LTR');
    eq(tab.textContent.trim(), 'Inicio', 'vuelve a español');
  });

  await test('localización: todos los textos de la interfaz tienen traducción (también los nuevos)', async () => {
    const tbl = await (await fetch(new URL('../src/i18n/strings.js', D.baseURI))).text();
    const files = ['src/ui/dialogs/share.js', 'src/ui/dialogs/cloud.js', 'src/ui/panels/a11y.js', 'src/ui/panels/review.js', 'src/ui/dialogs/poll.js', 'src/ui/dialogs/classroom.js', 'src/ui/dialogs/ai.js', 'src/ui/dialogs/assistant.js', 'src/ui/dialogs/account.js', 'src/ui/dialogs/team.js', 'src/ui/panels/call.js', 'src/ui/dialogs/picture.js', 'src/ui/dialogs/textstyles.js', 'src/ui/shell/masterview.js', 'src/io/share/publish.js', 'src/ui/canvas/content.js', 'src/ui/dialogs/object.js', 'src/io/export/objects.js', 'src/ui/canvas/puppetview.js', 'src/ui/dialogs/autorig.js', 'src/ui/dialogs/model3d.js', 'src/ui/ribbon/animribbon.js'];
    const missing = [];
    for (const f of files) {
      const src = await (await fetch(new URL('../' + f, D.baseURI))).text();
      for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)+)'\)/g)) if (!tbl.includes(`['${m[1]}'`)) missing.push(m[1]);
    }
    eq(missing.length, 0, 'sin traducir: ' + missing.slice(0, 5).join(' | '));
    await R.i18n.setLang('en');
    eq(R.i18n.t('Compartir'), 'Share'); eq(R.i18n.t('Estilos de texto del patrón'), 'Master text styles');
    eq(D.querySelector('[data-action="save-picture"] span').innerHTML, 'Selection<br>as picture', 'la cinta en inglés');
    eq(D.querySelector('#ribbon .mb-ph option[value="picture"]').textContent, 'Image', 'la pestaña del patrón en inglés');
    eq(D.querySelector('#ribbon [data-tab="master"]').textContent, 'Slide Master', 'con su nombre');
    await R.i18n.setLang('de'); eq(R.i18n.t('Nuevo patrón'), 'Neuer Master', 'alemán');
    await R.i18n.setLang('es'); eq(D.querySelector('[data-action="save-picture"] span').innerHTML, 'Selección<br>como imagen', 'vuelve al español');
  });

  await test('dictar: la voz se escribe donde está el cursor, con la puntuación dicha', async () => {
    reset(); const W = frame.contentWindow, M = await W.eval("import('/src/ui/shell/dictate.js')");
    eq(M.spokenText('hola mundo punto nueva línea segunda frase coma sin más', 'es'), 'hola mundo.\nsegunda frase, sin más');
    eq(M.spokenText('abrir interrogación qué tal cerrar interrogación', 'es'), '¿qué tal?');
    let inst = null;
    W.SpeechRecognition = class { constructor() { inst = this; } start() { this.started = true; } stop() { this.stopped = true; } };
    W.localStorage.setItem('revela.consent.dictation', '1');
    R.slides.addSlide('blank'); await sleep(10);
    D.querySelector('[data-action="dictate"]').click(); await sleep(30);
    assert(inst?.started && inst.continuous && D.getElementById('dictate-bar'), 'escuchando, con su barra');
    const b = last(); eq(b.type, 'text', 'sin texto seleccionado, en un cuadro nuevo');
    const say = (text, isFinal = true) => inst.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] });
    say('esto es', false); assert(/esto es/.test(D.querySelector('#dictate-bar .dt-heard').textContent), 'lo que va oyendo');
    say('hola a todos punto nueva línea bienvenidos'); await sleep(20);
    const txt = D.querySelector(`#stage .block[data-id="${b.id}"] .rich`).innerText;
    assert(/^Hola a todos\.\n+Bienvenidos$/.test(txt.trim()), 'escrito, con mayúsculas y punto: ' + JSON.stringify(txt));
    assert(/Hola a todos\./.test(b.html) && /Bienvenidos/.test(b.html), 'guardado en el cuadro');
    D.querySelector('[data-action="dictate"]').click(); await sleep(10);
    assert(inst.stopped && !D.getElementById('dictate-bar'), 'se detiene');
    delete W.SpeechRecognition; W.localStorage.removeItem('revela.consent.dictation');
  });

  await test('tabulaciones: regla del texto (izquierda, centrada, derecha, decimal), tecla Tab, presentación y PowerPoint', async () => {
    reset(); const W = frame.contentWindow;
    R.blocks.addText('x'); const b = last();
    R.store.commit(() => { Object.assign(b, { x: 100, y: 200, w: 800, h: 200, fontSize: 30, html: '<div>Café\t1,50 €</div><div>Menú del día\t12,75 €</div>', tabs: [{ pos: 500, align: 'decimal' }] }); });
    await sleep(80);
    const rich = D.querySelector(`#stage .block[data-id="${b.id}"] .rich`);
    const spans = rich.querySelectorAll('span.rv-tab'); eq(spans.length, 2, 'cada tabulador, colocado');
    // Decimal: the commas one under the other, at 500 px from the text's edge.
    const k = rich.getBoundingClientRect().width / rich.offsetWidth, left = rich.getBoundingClientRect().left + parseFloat(W.getComputedStyle(rich).paddingLeft) * k;
    const commaX = el => { const t = el.nextSibling; const r = D.createRange(); const i = t.nodeValue.indexOf(','); r.setStart(t, i); r.setEnd(t, i + 1); return (r.getBoundingClientRect().left - left) / k; };
    assert(Math.abs(commaX(spans[0]) - 500) < 2 && Math.abs(commaX(spans[1]) - 500) < 2, 'decimal: las comas alineadas en su tope: ' + commaX(spans[0]).toFixed(1) + ' / ' + commaX(spans[1]).toFixed(1));
    eq(b.html, '<div>Café\t1,50 €</div><div>Menú del día\t12,75 €</div>', 'el modelo guarda tabuladores sin más');
    // Right tab.
    R.blocks.setTabs(b.id, [{ pos: 600, align: 'right' }]); await sleep(80);
    const s2 = rich.querySelector('span.rv-tab'), r2 = D.createRange(); r2.selectNodeContents(s2.parentNode); 
    const end = (r2.getBoundingClientRect().right - left) / k; assert(Math.abs(end - 600) < 2, 'derecha: el texto acaba en su tope: ' + end.toFixed(1));
    // Editing: the ruler over the text; a click puts a tab there; Tab writes one.
    R.store.commit(() => { R.state.ui.showRuler = true; }, { history: false });
    rich.closest('.block').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(30);
    const ruler = D.getElementById('text-ruler'); assert(ruler, 'la regla del texto aparece');
    eq(ruler.querySelectorAll('.tr-stop').length, 1, 'con su tabulación');
    ruler.querySelector('.tr-kind').click(); await sleep(10);     // left → centre
    const rr = D.getElementById('text-ruler').getBoundingClientRect(), kk = rr.width / D.getElementById('text-ruler').offsetWidth;
    D.getElementById('text-ruler').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rr.left + (6 + 200) * kk, clientY: rr.top + 5 }));
    await sleep(20);
    assert(b.tabs.some(s => s.align === 'center' && Math.abs(s.pos - 200) < 6), 'un clic en la regla pone una tabulación centrada: ' + JSON.stringify(b.tabs));
    const sel = W.getSelection(), rg = D.createRange(); rg.selectNodeContents(rich); rg.collapse(false); sel.removeAllRanges(); sel.addRange(rg);
    rich.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); await sleep(20);
    assert(/12,75 €\t<\/div>$/.test(b.html), 'Tab escribe un tabulador: ' + JSON.stringify(b.html));
    rich.blur(); await sleep(20); assert(!D.getElementById('text-ruler'), 'la regla se va al dejar de escribir');
    R.store.commit(() => { R.state.ui.showRuler = false; }, { history: false });
    // Presentation: laid out there too; PowerPoint: a:tabLst, and back.
    const html = R.io.buildHTML();
    assert(/data-tabs="\[\{&quot;pos&quot;:/.test(html) && /white-space:pre-wrap;tab-size:96px/.test(html) && /rv-tab/.test(html), 'en la presentación');
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/<a:tabLst><a:tab pos="\d+" algn="ctr"\/><a:tab pos="5715000" algn="r"\/><\/a:tabLst>/.test(xml), 'tabulaciones en PowerPoint: ' + (xml.match(/<a:tabLst>.*?<\/a:tabLst>/) || [''])[0]);
    assert(/Café\t1,50/.test(xml), 'con sus tabuladores');
    const back = (await R.pptxImport.importPPTX(new W.File([blob], 't.pptx'))).slides[0].blocks.find(x => x.tabs);
    eq(JSON.stringify(back?.tabs?.map(s => [Math.round(s.pos), s.align])), JSON.stringify(b.tabs.map(s => [Math.round(s.pos), s.align])), 'y vuelven');
  });
}
