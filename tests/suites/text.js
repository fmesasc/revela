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

  await test('interlineado en un título con el de cada párrafo (de PowerPoint): manda el que se pone', async () => {
    reset(); R.slides.addSlide('titleContent'); await sleep(10);
    const b = R.state.deck.slides[R.state.ui.slideIndex].blocks.find(x => x.ph === 'title');
    R.store.commit(() => { b.html = '<p style="line-height:1.2;margin:0">Primera línea del título</p><p style="line-height:1.2;margin:0">y la segunda</p>'; b.fontSize = 40; });
    R.store.setSelection(b.id); R.render(); await sleep(20);
    const gap = () => { const ps = richOf(b).querySelectorAll('p'); return Math.round((ps[1].getBoundingClientRect().top - ps[0].getBoundingClientRect().top) * 1280 / D.getElementById('stage').getBoundingClientRect().width); };
    const before = gap();
    R.format.lineSpacing('2'); await sleep(20);
    assert(!/line-height/.test(b.html), 'el de cada párrafo se quita: ' + b.html);
    assert(gap() > before * 1.4, `las líneas se separan (${before} → ${gap()})`);
    assert(/<p style="margin:\s*0(px)?;?">Primera/.test(b.html), 'lo demás de cada párrafo se queda');
    // Editing it (the caret inside): the same.
    R.store.commit(() => { b.html = '<p style="line-height:1">Uno</p><p style="line-height:1">Dos</p>'; }); R.render(); await sleep(10);
    richOf(b).contentEditable = 'true'; richOf(b).focus(); R.format.lineSpacing('1.5'); await sleep(10);
    assert(!/line-height/.test(b.html) && !richOf(b).querySelector('[style*="line-height"]'), 'también escribiendo en él');
    eq(b.lineHeight, 1.5, 'y queda el del cuadro');
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
    const files = ['src/ui/dialogs/symbols.js', 'src/ui/shell/textaids.js', 'src/ui/shell/savestate.js', 'src/ui/shell/changeimage.js', 'src/ui/ribbon/livepreview.js', 'src/ui/dialogs/shortcuts.js', 'src/ui/dialogs/lock.js', 'src/ui/dialogs/lessonplan.js', 'src/ui/shell/audience.js', 'src/features/document/watermark.js', 'src/ui/dialogs/settings.js', 'src/ui/dialogs/classpace.js', 'src/apps/view/main.js', 'src/ui/dialogs/bulk.js', 'src/features/ai/lessonplan.js', 'src/ui/shell/palette.js', 'src/ui/dialogs/share.js', 'src/ui/dialogs/cloud.js', 'src/ui/dialogs/cloudlibrary.js', 'src/ui/panels/a11y.js', 'src/ui/panels/review.js', 'src/ui/dialogs/poll.js', 'src/ui/dialogs/classroom.js', 'src/ui/dialogs/ai.js', 'src/ui/dialogs/assistant.js', 'src/ui/dialogs/account.js', 'src/ui/dialogs/team.js', 'src/ui/panels/call.js', 'src/ui/dialogs/picture.js', 'src/ui/dialogs/textstyles.js', 'src/ui/shell/masterview.js', 'src/io/share/publish.js', 'src/ui/canvas/content.js', 'src/ui/dialogs/object.js', 'src/io/export/objects.js', 'src/ui/canvas/puppetview.js', 'src/ui/dialogs/autorig.js', 'src/ui/dialogs/model3d.js', 'src/ui/ribbon/animribbon.js', 'src/ui/dialogs/gdrive.js', 'src/ui/panels/animation.js', 'src/ui/shell/notices.js', 'src/ui/dialogs/questions.js', 'src/io/formats/questions.js', 'src/io/export/study.js', 'src/ui/shell/spellcheck.js', 'src/ui/panels/spelling.js'];
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

  // Typing for real (the browser's own insertText: input events as from the keyboard).
  const typeIn = async (rich, text) => { for (const ch of text) { frame.contentDocument.execCommand('insertText', false, ch); await sleep(5); } };
  const editEmpty = async b => {
    const rich = richOf(b); rich.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(10);
    rich.innerHTML = ''; rich.focus(); const r = D.createRange(); r.selectNodeContents(rich); r.collapse(true);
    const s = frame.contentWindow.getSelection(); s.removeAllRanges(); s.addRange(r); return rich;
  };

  await test('reducir si no cabe: activado en los marcadores de las diapositivas y presentaciones nuevas; encoge al escribir y vuelve al borrar', async () => {
    reset();
    assert(R.model.emptyDeck().slides[0].blocks.every(b => b.shrink === true), 'una presentación nueva: sus marcadores reducen el texto');
    R.slides.addSlide('titleContent'); await sleep(20);
    const title = slide().blocks.find(b => b.ph === 'title'), body = slide().blocks.find(b => b.ph === 'body');
    assert(title.shrink && body.shrink, 'una diapositiva nueva: también');
    eq(R.state.deck.slides[0].blocks.some(b => b.shrink), false, 'las diapositivas que ya había, como estaban');
    select(title); await sleep(10);
    const rich = await editEmpty(title);
    rich.innerHTML = 'Un título larguísimo que no cabe de ninguna manera en una sola línea del cuadro del título, ni en dos, ni siquiera en tres líneas seguidas de texto';
    rich.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'o' })); await sleep(10);
    assert(title.fit > 0 && title.fit < 1 && title.fontSize == null, 'encoge siguiendo al patrón (un factor): ' + title.fit);
    assert(rich.scrollHeight <= rich.clientHeight + 2, 'y ya cabe');
    rich.innerHTML = 'Corto'; rich.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' })); await sleep(10);
    eq(title.fit, undefined, 'al borrar, vuelve a su tamaño');
    rich.blur(); await sleep(10);
    // A box with its own size: it keeps it to come back to.
    const t2 = newText(); R.store.commit(() => { Object.assign(t2, { w: 300, h: 60, fontSize: 40, shrink: true }); }); await sleep(10);
    const r2 = await editEmpty(t2); r2.innerHTML = 'Mucho texto que no cabe en un cuadro tan pequeño como este';
    r2.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'e' })); await sleep(10);
    assert(t2.fontSize < 40 && t2.shrinkBase === 40, 'encoge y recuerda su tamaño');
    r2.innerHTML = 'Poco'; r2.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' })); await sleep(10);
    eq(t2.fontSize, 40, 'y vuelve a él'); r2.blur();
  });

  await test('texto que no cabe: aviso en el cuadro para reducirlo (un paso de deshacer), y en toda la presentación', async () => {
    reset(); const b = newText();
    R.store.commit(() => { Object.assign(b, { w: 260, h: 50, fontSize: 40, html: 'Un texto bastante largo que no cabe aquí dentro' }); }); select(b); await sleep(40);
    const hint = D.getElementById('overflow-hint'); assert(hint && !hint.querySelector('.of-all'), 'el aviso aparece (sin «toda la presentación»: no es un marcador)');
    hint.querySelector('[data-of="one"]').click(); await sleep(40);
    const nb = slide().blocks.find(x => x.id === b.id);
    assert(nb.shrink && nb.fontSize < 40, 'activado, y ya más pequeño: ' + nb.fontSize);
    assert(!D.getElementById('overflow-hint'), 'el aviso se va');
    R.store.undo(); await sleep(20); const back = slide().blocks.find(x => x.id === b.id);
    assert(!back.shrink && back.fontSize === 40, 'deshacer: todo de una vez');
    // A placeholder offers the whole presentation.
    R.slides.addSlide('titleContent'); await sleep(10);
    const tt = slide().blocks.find(x => x.ph === 'title');
    R.store.commit(() => { delete tt.shrink; tt.html = 'Un título larguísimo que no cabe de ninguna manera en el cuadro del título, ni en dos líneas, ni siquiera en tres líneas seguidas'; }); select(tt); await sleep(40);
    assert(D.querySelector('#overflow-hint .of-all'), '«En toda la presentación», en un marcador');
    const TA = await frame.contentWindow.eval("import('/src/ui/shell/textaids.js')");
    const n = await TA.shrinkAllPlaceholders(); await sleep(20);
    const t3 = slide().blocks.find(x => x.id === tt.id);
    assert(n >= 1 && t3.shrink && t3.fit < 1, 'activado en todos los marcadores, y el que no cabía, más pequeño: ' + t3.fit);
    assert(R.state.deck.slides[0].blocks.every(x => !x.ph || x.shrink), 'también en las demás diapositivas');
    // The object's tab: on, and off again (back to its size).
    R.store.commit(() => R.store.setSelection(t3.id), { history: false }); await sleep(20);
    const tog = D.querySelector('#ribbon [data-page="ctx"] [data-ctx="shrink"]'); assert(tog?.getAttribute('aria-pressed') === 'true', 'el botón lo muestra');
    tog.click(); await sleep(20); const t4 = slide().blocks.find(x => x.id === tt.id);
    assert(!t4.shrink && t4.fit == null, 'desactivado: vuelve a su tamaño');
  });

  await test('«/» al empezar una línea de un cuadro de texto: menú para insertar; Esc o seguir escribiendo lo cierra y deja la barra', async () => {
    reset(); const b = newText(); await sleep(10);
    let rich = await editEmpty(b);
    await typeIn(rich, '/'); await sleep(10);
    const menu = () => D.getElementById('slash-menu');
    assert(menu(), 'el menú aparece'); assert(menu().querySelectorAll('[data-slash]').length >= 8, 'imagen, tabla, gráfico, lista, ecuación, código, icono, votación…');
    D.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await sleep(10);
    assert(!menu(), 'Esc lo cierra'); assert(D.activeElement === rich, 'sin salir del texto'); eq(rich.textContent, '/', 'y la barra se queda');
    await typeIn(rich, 'x'); eq(rich.textContent, '/x', 'escribiendo otra cosa: texto normal'); assert(!menu(), 'sin menú');
    // Not in the middle of a line.
    await typeIn(rich, ' a/'); assert(!menu(), 'en medio de una línea, no');
    // A list, there: the «/» goes.
    rich = await editEmpty(b); await typeIn(rich, '/'); await sleep(10);
    menu().querySelector('[data-slash="bullets"]').click(); await sleep(20);
    assert(rich.querySelector('ul li') && !/\//.test(rich.textContent), 'lista con viñetas, sin la barra');
    rich.blur(); await sleep(10);
    // An object: the text is left and it is inserted.
    const n = slide().blocks.length; rich = await editEmpty(b); await typeIn(rich, '/'); await sleep(10);
    D.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    eq(menu().querySelector('[aria-selected="true"]').dataset.slash, 'table', 'las flechas eligen');
    D.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await sleep(30);
    eq(slide().blocks.length, n + 1, 'Intro inserta'); eq(slide().blocks.at(-1).type, 'table', 'una tabla');
    assert(!/\//.test(slide().blocks.find(x => x.id === b.id).html), 'y la barra no se queda en el texto');
  });

  await test('listas automáticas: «- » o «* » hacen viñetas, «1. » o «1) » números; Ctrl+Z justo después lo deja como se escribió; respeta la autocorrección', async () => {
    reset(); const b = newText(); await sleep(10);
    const AC = await frame.contentWindow.eval("import('/src/features/document/autocorrect.js')");
    let rich = await editEmpty(b);
    await typeIn(rich, '- Uno'); await sleep(10);
    assert(rich.querySelector('ul li') && rich.querySelector('li').textContent === 'Uno', '«- » hace una lista con viñetas: ' + rich.innerHTML);
    rich = await editEmpty(b); await typeIn(rich, '1) '); assert(rich.querySelector('ol li'), '«1) » una numerada');
    rich = await editEmpty(b); await typeIn(rich, '* '); assert(rich.querySelector('ul'), '«* » también');
    const z = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }); D.activeElement.dispatchEvent(z);
    assert(z.defaultPrevented && !rich.querySelector('ul') && rich.textContent.replace(/ /g, ' ') === '* ', 'Ctrl+Z: lo escrito, sin lista: ' + rich.innerHTML);
    await typeIn(rich, 'x'); eq(rich.textContent.replace(/ /g, ' '), '* x', 'el cursor, detrás');
    eq(slide().blocks.find(x => x.id === b.id).html.replace(/&nbsp;/g, ' '), '* x', 'y el cuadro lo guarda');
    rich = await editEmpty(b); await typeIn(rich, 'a - b'); assert(!rich.querySelector('ul'), 'en medio de una línea, no');
    AC.setAutocorrect(false);
    try { rich = await editEmpty(b); await typeIn(rich, '- '); assert(!rich.querySelector('ul'), 'con la autocorrección apagada, no'); }
    finally { AC.setAutocorrect(true); rich.blur(); }
  });

  // ---- Spelling of our own (ui/shell/spellcheck.js): with a tiny dictionary of the tests (tests/fixtures/spell), loaded
  // by the same path as the real ones (worker, Cache Storage); the engine comes from the CDN, as the other libraries.
  const W = frame.contentWindow;
  const until = async (fn, ms = 30000) => { const end = Date.now() + ms; for (;;) { const v = fn(); if (v || Date.now() > end) return v; await sleep(50); } };
  const FIX = { aff: '/tests/fixtures/spell/es-mini.aff', dic: '/tests/fixtures/spell/es-mini.dic' };
  const spellOn = () => { try { W.localStorage.removeItem('revela.spell.words'); } catch {} R.spelling.useDictionary('es-ES', FIX); };
  const spellOff = () => { D.getElementById('spell-panel')?.querySelector('.cm-close')?.click(); D.getElementById('spell-langs')?.remove(); R.spelling.noDownloads(); try { W.localStorage.removeItem('revela.spell.words'); } catch {} };
  const marked = id => R.spellcheck.spellMarks().filter(m => !id || m.id === id).map(m => m.word);
  // A text box out of the way, not being written in.
  const box = html => { R.blocks.addText(html); const b = last(); R.store.commit(() => { b.x = 80; b.y = 470; b.w = 700; R.store.setSelection(null); }, { history: false }); D.activeElement?.blur?.(); R.render(); return b; };
  // Where a word of a box is on the screen.
  const wordAt = (b, word) => {
    const rich = richOf(b), w = D.createTreeWalker(rich, 4); let n;
    while ((n = w.nextNode())) { const i = n.nodeValue.search(new RegExp(`(^|\\s)${word}(\\s|$)`)); if (i < 0) continue;
      const r = D.createRange(), a = i + (n.nodeValue[i] === word[0] ? 0 : 1); r.setStart(n, a); r.setEnd(n, a + word.length);
      const q = r.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }
    return null;
  };
  const rightClick = (b, word) => { const p = wordAt(b, word); richOf(b).dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y })); };
  const menuItems = () => [...D.querySelectorAll('#context-menu:not([hidden]) .ctx-item')];

  await test('ortografía: marca «ola» y no «hola» en un cuadro sin foco, con su subrayado (sin tocar el HTML) y su idioma; el diccionario queda guardado', async () => {
    reset(); spellOn();
    try {
      const b = box('hola ola');
      const words = await until(() => marked(b.id).length && marked(b.id));
      eq((words || []).join(), 'ola', 'solo «ola» marcada');
      eq(marked().join(), 'ola', 'el título y el subtítulo, bien escritos');
      assert(W.CSS.highlights.get('rv-spell')?.size === 1, 'subrayada con ::highlight(rv-spell)');
      eq(slide().blocks.find(x => x.id === b.id).html, 'hola ola', 'el HTML del documento no cambia');
      eq(richOf(b).lang, 'es-ES', 'el cuadro dice su idioma'); eq(richOf(b).spellcheck, false, 'y el corrector del navegador no subraya también');
      eq(D.getElementById('stage').lang, 'es-ES', 'la diapositiva, también');
      const c = await W.caches.open('revela-dicts-v1');
      assert(await c.match(new URL(FIX.dic, D.baseURI).href), 'el diccionario, en Cache Storage para la próxima vez');
      // Written again (not being written in now): marked again, a moment later.
      R.store.commit(() => { slide().blocks.find(x => x.id === b.id).html = 'ola mundoo <b>hola</b>'; }); R.render();
      const again = await until(() => marked(b.id).length === 2 && marked(b.id));
      eq((again || []).join(), 'ola,mundoo', 'cada palabra mal escrita del cuadro');
      // Not checked: numbers, addresses, e-mails, CAPITALS, words with digits, code.
      const P = await W.eval("import('/src/features/document/proofing.js')");
      eq(P.tokenize('ONU 3D H2O mp3 www.ejemplo.com ana@correo.es https://x.org/olaa iPhone ola').map(x => x.word).join(), 'ola', 'lo que no se revisa');
    } finally { spellOff(); }
  });

  await test('ortografía: clic derecho en una palabra marcada → sugerencias arriba, «Omitir todo», «Agregar al diccionario» (quita la marca) e «Idioma…»', async () => {
    reset(); spellOn();
    try {
      const b = box('hola ola'), c = box('mundoo');
      await until(() => marked(b.id).length && marked(c.id).length);
      rightClick(b, 'ola');
      await until(() => menuItems().some(x => x.classList.contains('ctx-sugg')));
      const labels = menuItems().map(x => x.textContent), sugg = menuItems().filter(x => x.classList.contains('ctx-sugg')).map(x => x.textContent);
      assert(sugg.includes('hola'), 'sugiere «hola»: ' + labels.join('|'));
      assert(labels.indexOf('Omitir todo') > labels.indexOf('hola') && labels.includes('Agregar al diccionario') && labels.includes('Idioma…'), 'y sus opciones: ' + labels.join('|'));
      assert(labels.indexOf('Copiar') > labels.indexOf('Idioma…'), 'después, el menú de siempre');
      menuItems().find(x => x.textContent === 'Agregar al diccionario').click();
      assert(await until(() => !marked(b.id).length), 'agregarla quita la marca');
      assert(JSON.parse(W.localStorage.getItem('revela.spell.words')).es.includes('ola'), 'en el diccionario personal (este navegador)');
      // A suggestion replaces the word in the model (the box isn't being written in).
      rightClick(c, 'mundoo');
      await until(() => menuItems().some(x => x.textContent === 'mundo'));
      menuItems().find(x => x.textContent === 'mundo').click();
      eq(slide().blocks.find(x => x.id === c.id).html, 'mundo', 'cambiada por la sugerencia');
      assert(await until(() => !marked(c.id).length), 'y ya no está marcada');
      // Elsewhere on a box, the usual menu at once.
      richOf(b).dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: wordAt(b, 'hola').x, clientY: wordAt(b, 'hola').y }));
      eq(menuItems()[0]?.textContent, 'Copiar', 'en una palabra bien escrita, el menú de siempre');
      D.getElementById('context-menu').hidden = true;
    } finally { spellOff(); }
  });

  await test('ortografía: el idioma desde la barra inferior (la presentación, un cuadro, «No revisar»), y el lang en el HTML exportado', async () => {
    reset(); spellOn();
    try {
      const b = box('hola ola'), btn = D.getElementById('spell-lang'), name = () => btn.querySelector('bdi').textContent;
      await until(() => marked(b.id).length);
      eq(name(), 'Español (España)', 'por defecto, el de la interfaz');
      btn.click(); await sleep(20);
      let menu = D.getElementById('spell-langs'); assert(menu, 'abre la lista');
      for (const l of ['es-ES', 'ca-ES', 'gl-ES', 'eu-ES', 'en-US', 'en-GB', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'pt-BR', 'nl-NL', 'ar', 'auto', 'none']) assert(menu.querySelector(`[data-lang="${l}"]`), 'ofrece ' + l);
      eq(menu.querySelector('[aria-checked="true"]').dataset.lang, 'es-ES', 'marcado el actual');
      menu.querySelector('[data-lang="en-GB"]').click(); await sleep(30);
      eq(R.state.deck.textLang, 'en-GB', 'se guarda en la presentación'); eq(name(), 'Inglés (Reino Unido)', 'y la barra lo dice');
      assert(await until(() => !marked(b.id).length), 'sin diccionario de inglés aquí: sin marcas nuestras');
      eq(richOf(b).lang, 'en-GB', 'el cuadro, en inglés'); eq(richOf(b).spellcheck, true, 'y el corrector del navegador se queda');
      // The selected box: a language of its own.
      R.store.commit(() => R.store.setSelection(b.id), { history: false }); await sleep(10);
      btn.click(); await sleep(20); menu = D.getElementById('spell-langs');
      eq(menu.querySelector('.sl-head').textContent, 'Idioma del cuadro seleccionado', 'con un cuadro seleccionado, el suyo');
      menu.querySelector('[data-lang="es-ES"]').click(); await sleep(30);
      eq(slide().blocks.find(x => x.id === b.id).textLang, 'es-ES', 'el cuadro, en español'); eq(name(), 'Español (España)', 'la barra dice el del cuadro');
      assert(await until(() => marked(b.id).join() === 'ola'), 'y se revisa en español');
      const html = R.io.buildHTML();
      assert(/<html lang="en-GB"/.test(html), 'la página exportada, en el de la presentación');
      assert(new RegExp(`lang="es-ES"[^>]*>[^]*?hola ola`).test(html), 'y el cuadro con su lang');
      // «No revisar la ortografía»: nothing marked, not even by the browser.
      R.store.commit(() => R.store.setSelection(null), { history: false }); await sleep(10);
      btn.click(); await sleep(20); D.querySelector('#spell-langs [data-lang="es-ES"]').click(); await sleep(10);
      const c = box('olaa');
      assert(await until(() => marked(c.id).length), 'en español otra vez');
      btn.click(); await sleep(20); D.querySelector('#spell-langs [data-lang="none"]').click();
      assert(await until(() => !marked(c.id).length), '«No revisar»: sin marcas');
      eq(richOf(c).spellcheck, false, 'tampoco las del navegador');
      eq(marked(b.id).join(), 'ola', 'el cuadro con su idioma sigue revisándose');
    } finally { delete R.state.deck.textLang; spellOff(); }
  });

  await test('ortografía: Revisar ▸ Ortografía (F7) recorre las diapositivas y las notas: Cambiar, Omitir, Agregar y Omitir todo', async () => {
    reset(); spellOn();
    try {
      const b = box('hola ola');
      R.slides.addSlide(); const s2 = slide(); const c = box('casa mundoo'); R.store.commit(() => { s2.notes = 'una notaa'; });
      R.slides.goToSlide(0); await sleep(10);
      D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'F7', bubbles: true, cancelable: true }));
      const panel = D.getElementById('spell-panel'); assert(panel, 'F7 abre el panel de Ortografía');
      const word = () => panel.querySelector('.spp-context mark')?.textContent;
      eq(await until(() => word()), 'ola', 'la primera palabra'); eq(R.state.ui.slideIndex, 0, 'en su diapositiva'); eq(R.state.ui.selection, b.id, 'con su cuadro seleccionado');
      await until(() => !panel.querySelector('[data-sp="change"]').disabled);
      const sel = panel.querySelector('.spp-sugg'); assert([...sel.options].some(o => o.value === 'hola'), 'con sus sugerencias');
      sel.value = 'hola'; panel.querySelector('[data-sp="change"]').click();
      eq(await until(() => word() === 'mundoo' && word()), 'mundoo', 'Cambiar: la siguiente, en la otra diapositiva');
      eq(slide().blocks.find(x => x.id === c.id) && R.state.ui.slideIndex, 1, 'lleva a la diapositiva 2');
      eq(R.state.deck.slides[0].blocks.find(x => x.id === b.id).html, 'hola hola', 'cambiada en el documento');
      panel.querySelector('[data-sp="skip"]').click();
      eq(await until(() => word() === 'notaa' && word()), 'notaa', 'Omitir: después, las notas');
      assert(/Notas del orador/.test(panel.querySelector('.spp-where').textContent), 'dice que es en las notas');
      panel.querySelector('[data-sp="add"]').click();
      assert(await until(() => panel.querySelector('.spp-done')), 'Agregar: ya no queda ninguna');
      assert(JSON.parse(W.localStorage.getItem('revela.spell.words')).es.includes('notaa'), 'agregada al diccionario');
      panel.querySelector('.spp-close').click(); assert(!D.getElementById('spell-panel'), 'Cerrar');
      // Omitir todo, from the ribbon's button.
      R.slides.goToSlide(0); await sleep(10);
      D.querySelector('[data-action="spelling"]').click();
      const p2 = D.getElementById('spell-panel');
      eq(await until(() => p2.querySelector('.spp-context mark')?.textContent), 'mundoo', 'lo omitido vuelve en otra revisión');
      p2.querySelector('[data-sp="skipAll"]').click();
      assert(await until(() => p2.querySelector('.spp-done')), 'Omitir todo: terminada');
      assert(await until(() => { R.slides.goToSlide(1); return !marked(c.id).length; }), 'y tampoco se marca en la diapositiva');
    } finally { spellOff(); }
  });
}
