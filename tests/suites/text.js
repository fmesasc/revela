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
    assert(/justify-content:center/.test(R.io.buildHTML()), 'centrado vertical');
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
    const files = ['src/ui/dialogs/share.js', 'src/ui/dialogs/picture.js', 'src/ui/dialogs/textstyles.js', 'src/io/share/publish.js', 'src/ui/canvas/content.js', 'src/ui/dialogs/object.js', 'src/io/export/objects.js'];
    const missing = [];
    for (const f of files) {
      const src = await (await fetch(new URL('../' + f, D.baseURI))).text();
      for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)+)'\)/g)) if (!tbl.includes(`['${m[1]}'`)) missing.push(m[1]);
    }
    eq(missing.length, 0, 'sin traducir: ' + missing.slice(0, 5).join(' | '));
    await R.i18n.setLang('en');
    eq(R.i18n.t('Compartir'), 'Share'); eq(R.i18n.t('Estilos de texto del patrón'), 'Master text styles');
    eq(D.querySelector('[data-action="save-picture"] span').innerHTML, 'Selection<br>as picture', 'la cinta en inglés');
    eq(D.querySelector('#master-banner .mb-ph option[value="picture"]').textContent, 'Image', 'la barra del patrón en inglés');
    await R.i18n.setLang('de'); eq(R.i18n.t('Nuevo patrón'), 'Neuer Master', 'alemán');
    await R.i18n.setLang('es'); eq(D.querySelector('[data-action="save-picture"] span').innerHTML, 'Selección<br>como imagen', 'vuelve al español');
  });
}
