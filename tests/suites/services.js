// Services and core: public API and plugins, AI (simulated), comments, stock images, core modules.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('API pública, complementos y macros', async () => {
    reset(); const W = frame.contentWindow, A = W.Revela;
    assert(A && A.version === 1, 'window.Revela disponible');
    const id = A.add.shape('ellipse', { x: 10, y: 20, w: 30, h: 40 });
    eq(A.get(id).w, 30, 'añadir con caja'); A.update(id, { fill: '#123456' }); eq(A.get(id).fill, '#123456', 'actualizar');
    let changes = 0; const off = A.on('change', () => changes++); A.slides.add(); off();
    assert(changes > 0, 'evento de cambio'); eq(A.slides.count(), 2, 'diapositivas');
    const r = await R.api.runMacro('Revela.slides.goTo(0); return Revela.deck().slides.length;');
    eq(r, 2, 'macro con resultado');
    const src = "export default R => R.ui.addButton({ id: 'saluda', label: 'Saluda', icon: 'waving_hand', onClick: R => R.add.text('desde complemento') });";
    const url = W.URL.createObjectURL(new W.Blob([src], { type: 'text/javascript' }));
    await R.api.addPlugin(url);
    const btn = D.querySelector('#plugin-buttons [data-plugin="saluda"]');
    assert(btn && !btn.closest('.group').hidden, 'botón del complemento en la cinta');
    btn.click(); await sleep(10);
    eq(last().html, 'desde complemento', 'el complemento actúa');
    assert(R.api.pluginList().includes(url), 'complemento recordado'); R.api.removePlugin(url);
    R.api.saveMacro('prueba', 'return 1'); assert(R.api.macroList().some(m => m.name === 'prueba'), 'macro guardada'); R.api.deleteMacro('prueba');
  });

  await test('IA con OpenRouter: inicio de sesión PKCE y funciones (respuestas simuladas)', async () => {
    reset(); const W = frame.contentWindow, AI = R.ai, realFetch = W.fetch, calls = [];
    eq(await AI.pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', 'reto PKCE (vector del RFC 7636)');
    let answer = '';
    W.fetch = async (url, opts) => {
      calls.push({ url, opts, body: JSON.parse(opts.body) });
      if (url.endsWith('/auth/keys')) return new W.Response(JSON.stringify({ key: 'sk-or-prueba' }));
      return new W.Response(JSON.stringify({ choices: [{ message: { content: answer } }] }));
    };
    try {
      AI.disconnectAi(); W.sessionStorage.setItem('revela.ai.pkce', 'verificador');
      const ok = await AI.finishOpenRouterLogin({ search: '?test&code=CODIGO', pathname: W.location.pathname, hash: '' });
      assert(ok && AI.aiConnected(), 'código canjeado por la clave');
      eq(calls[0].body.code, 'CODIGO', 'envía el código'); eq(calls[0].body.code_verifier, 'verificador', 'y el verificador');
      assert(!/code=/.test(W.location.search), 'el código se quita de la URL');
      answer = JSON.stringify({ slides: [{ title: 'Uno <b>', bullets: ['a', 'b'], notes: 'n1' }, { title: 'Dos', bullets: ['c'], notes: 'n2' }] });
      const n0 = R.state.deck.slides.length;
      eq(await AI.generateSlides('Volcanes', 2), 2, 'dos diapositivas generadas');
      eq(R.state.deck.slides.length, n0 + 2, 'insertadas'); const g = R.state.deck.slides[1];
      eq(g.blocks[0].html, 'Uno &lt;b&gt;', 'título escapado'); eq(g.blocks[1].html, '<ul><li>a</li><li>b</li></ul>', 'viñetas'); eq(g.notes, 'n1', 'notas');
      const c = calls.at(-1);
      eq(c.opts.headers.Authorization, 'Bearer sk-or-prueba', 'clave'); eq(c.opts.headers['X-Title'], 'Revela', 'atribución a Revela');
      assert(/fmesasc\.github\.io\/revela/.test(c.opts.headers['HTTP-Referer']), 'referer de la app');
      R.slides.goToSlide(1); select(slide().blocks[1]); answer = '- corto\n- claro';
      await AI.rewriteSelected('shorter'); eq(slide().blocks[1].html, '<ul><li>corto</li><li>claro</li></ul>', 'reescritura');
      answer = 'Explica esto.'; await AI.writeNotes(); eq(slide().notes, 'Explica esto.', 'notas del orador');
      R.blocks.addImage('data:image/gif;base64,R0lGODlhAQABAAAAACw='); answer = '"Un punto"';
      await AI.describeImage(); eq(last().alt, 'Un punto', 'texto alternativo');
      eq(calls.at(-1).body.messages[1].content[1].type, 'image_url', 'envía la imagen');
      W.fetch = async () => new W.Response('x', { status: 402 });
      let err = ''; try { await AI.writeNotes(); } catch (e) { err = e.message; } eq(err, 'NO_CREDIT', 'sin saldo');
    } finally { W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('comentarios: añadir, responder, resolver, marcas y menciones', async () => {
    reset(); const C = R.comments; C.setAuthor('Ana');
    D.querySelector('[data-action="comments"]').click(); await sleep(10);
    assert(D.getElementById('comments-panel'), 'panel abierto');
    const b = slide().blocks[0]; select(b);
    const id = C.addComment('Revisa esto @Luis'); await sleep(10);
    const c = C.commentsOf()[0]; eq(c.author, 'Ana', 'autor'); eq(c.blockId, b.id, 'anclado al objeto');
    eq(C.mentions(c.text).join(), 'Luis', 'mención');
    assert(D.querySelector('#comments-panel .cm-at'), 'mención resaltada');
    eq(D.querySelector(`.block[data-id="${b.id}"] .cm-badge`)?.textContent, '1', 'marca en el objeto');
    assert(/💬 1/.test(D.querySelector('#navigator .thumb .thumb-cm')?.textContent || ''), 'contador en la miniatura');
    C.reply(id, 'Hecho'); eq(C.commentsOf()[0].replies[0].text, 'Hecho', 'respuesta');
    C.setResolved(id); await sleep(10);
    assert(!D.querySelector(`.block[data-id="${b.id}"] .cm-badge`), 'resuelto: sin marca');
    assert(!D.querySelector('#comments-panel .cm-item'), 'oculto si no se muestran los resueltos');
    assert(/"comments"/.test(JSON.stringify(R.state.deck)), 'viaja con el proyecto');
    C.deleteComment(id); eq(C.commentsOf().length, 0, 'eliminado');
    D.querySelector('[data-action="comments"]').click();
  });

  await test('comentarios: asignar tareas (+nombre o en su campo), con fecha, reasignar, marcar como hecha y «Mis tareas»', async () => {
    reset(); const C = R.comments, W = frame.contentWindow; C.setAuthor('Ana');
    D.querySelector('[data-action="comments"]').click(); await sleep(10);
    const p = () => D.getElementById('comments-panel');
    // In the panel: a comment for Luis, with a date.
    p().querySelector('.cm-new textarea').value = 'Revisa las cifras';
    p().querySelector('.cm-assign').value = 'Luis'; p().querySelector('.cm-due').value = '2000-01-15';
    p().querySelector('.cm-add').click(); await sleep(20);
    const c = C.commentsOf()[0]; eq(c.assignee, 'Luis'); eq(c.due, '2000-01-15');
    const task = p().querySelector('.cm-task'); assert(task && /Tarea para/.test(task.textContent) && /Luis/.test(task.textContent), 'se ve como tarea');
    assert(task.classList.contains('late'), 'fuera de plazo, en rojo');
    // Written "+Ana" in another slide: a task for me, counted on the button.
    R.slides.addSlide('blank'); await sleep(10);
    const id2 = C.addComment('Cambia el título +Ana', null); await sleep(20);
    eq(C.commentsOf()[0].assignee, 'Ana', '«+nombre» la asigna');
    eq(D.querySelector('[data-action="comments"] .tk-count')?.textContent, '1', 'mis tareas, contadas en el botón');
    eq(C.tasksOf().length, 2, 'todas las tareas de la presentación'); eq(C.tasksOf({ who: 'ana' }).length, 1, 'las mías');
    assert(C.people().includes('Luis') && C.people().includes('Ana'), 'nombres para asignar');
    const v = p().querySelector('.cm-view'); v.value = 'tasks'; v.dispatchEvent(new W.Event('change')); await sleep(20);
    eq(p().querySelectorAll('.cm-item').length, 2, 'lista de tareas de todas las diapositivas');
    const first = p().querySelector('.cm-item .cm-slide'); eq(first.textContent, 'Diapositiva 1', 'con su diapositiva (la más urgente primero)');
    first.click(); await sleep(10); eq(R.state.ui.slideIndex, 0, 'lleva a ella');
    // Reassign and mark as done (from the list, though it is in another slide).
    C.assign(id2, 'Marta'); await sleep(10);
    const t2 = C.tasksOf({ who: 'Marta' })[0]; assert(t2 && /Marta/.test(t2.replies.at(-1).text), 'reasignada, y queda anotado');
    C.setResolved(id2); await sleep(10);
    eq(C.tasksOf().length, 1, 'hecha: fuera de las pendientes'); assert(!D.querySelector('[data-action="comments"] .tk-count'), 'sin tareas mías');
    v.value = 'mine'; v.dispatchEvent(new W.Event('change')); await sleep(20);
    assert(/No tienes tareas pendientes/.test(p().textContent), 'mis tareas: ninguna');
    R.store.commit(() => { R.state.ui.commentView = 'slide'; }, { history: false });
    D.querySelector('[data-action="comments"]').click();
  });

  await test('IA: generar imagen y traducir la presentación (respuestas simuladas)', async () => {
    reset(); const W = frame.contentWindow, AI = R.ai, realFetch = W.fetch, calls = [];
    AI.setAiKey('sk-or-prueba');
    W.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body); calls.push({ url, body });
      if (url.endsWith('/images')) return new W.Response(JSON.stringify({ data: [{ b64_json: 'R0lGODlhAQABAAAAACw=', media_type: 'image/gif' }] }));
      const items = JSON.parse(body.messages[1].content);
      const tr = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.replace('Título', 'Title').replace('Nota', 'Note').replace('celda', 'cell')]));
      return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(tr) } }] }));
    };
    try {
      await AI.generateImage('Un volcán al amanecer', '16:9');
      const img = last(); eq(img.type, 'image', 'imagen insertada'); eq(img.src, 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', 'datos');
      eq(Math.round(img.w / img.h * 9), 16, 'proporción 16:9'); eq(img.alt, 'Un volcán al amanecer', 'alt con la descripción');
      eq(calls[0].body.aspect_ratio, '16:9', 'pide la proporción');
      slide().blocks[0].html = '<b>Título</b>'; slide().notes = 'Nota';
      R.blocks.addTable(); last().rows[0][0] = 'celda';
      const n = await AI.translateDeck('English');
      eq(slide().blocks[0].html, '<b>Title</b>', 'traduce conservando el formato'); eq(slide().notes, 'Note', 'notas');
      eq(last().rows[0][0], 'cell', 'celdas de tabla'); assert(n >= 3, 'recuento');
      R.store.undo(); eq(slide().blocks[0].html, '<b>Título</b>', 'un solo paso de deshacer');
    } finally { W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('IA avanzada: presentación completa, mejorar, agenda, preguntas y asistente', async () => {
    reset(); const W = frame.contentWindow, A = R.aiDeck, realFetch = W.fetch, calls = []; let answer = {};
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    W.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body); calls.push({ url, body });
      if (url.endsWith('/images')) return new W.Response(JSON.stringify({ data: [{ b64_json: 'R0lGODlhAQABAAAAACw=', media_type: 'image/gif' }] }));
      return new W.Response(JSON.stringify({ choices: [{ message: { content: '```json\n' + JSON.stringify(answer) + '\n```' } }] }));
    };
    try {
      const specs = [
        { kind: 'title', title: 'Energía solar', subtitle: 'Introducción', notes: 'Hola' },
        { kind: 'section', title: 'Parte 1' }, { kind: 'bullets', title: 'Ventajas', bullets: ['Limpia', 'Renovable'] },
        { kind: 'two_columns', title: 'Comparación', left: { heading: 'Solar', bullets: ['a'] }, right: { heading: 'Eólica', bullets: ['b'] } },
        { kind: 'quote', quote: 'El sol es para todos', author: 'Anónimo' },
        { kind: 'stats', title: 'Cifras', stats: [{ value: '42%', label: 'eficiencia' }, { value: '3x', label: 'crecimiento' }] },
        { kind: 'timeline', title: 'Historia', steps: [{ label: '1954', text: 'Primera célula' }, { label: '2000', text: 'Expansión' }, { label: '2020', text: 'Récord' }] },
        { kind: 'chart', title: 'Producción', chart: { type: 'line', labels: ['2020', '2021'], values: [1, 2], series_name: 'TWh' }, bullets: ['Sube'] },
        { kind: 'table', title: 'Tabla', header: ['País', 'GW'], rows: [['China', '600'], ['EE. UU.', '140']] },
        { kind: 'image', title: 'Paneles', bullets: ['Tejados'], image_prompt: 'solar panels on roofs' },
        { kind: 'closing', title: 'Gracias' }];
      answer = { title: 'Energía solar', slides: specs };
      reset(); const n0 = R.state.deck.slides.length;
      const got = await A.createDeck({ topic: 'Energía solar', count: 11, audience: 'estudiantes', tone: 'didáctico', images: true });
      assert(/Audience: estudiantes/.test(calls.at(-1).body.messages[1].content), 'envía el encargo');
      await A.insertSpecs(got, { images: true });
      eq(R.state.deck.slides.length, n0 + 11, 'once diapositivas');
      const S = R.state.deck.slides.slice(1), types = s => s.blocks.map(b => b.type).join(',');
      assert(/<b>42%<\/b>/.test(S[5].blocks[1].html), 'cifras destacadas');
      eq(S[6].blocks.filter(b => b.type === 'connector').length, 2, 'línea de tiempo con conectores');
      const ch = S[7].blocks.find(b => b.type === 'chart'); eq(ch.chartType, 'line', 'gráfico'); eq(ch.data[1].value, 2, 'datos del gráfico');
      const tb = S[8].blocks.find(b => b.type === 'table'); eq(tb.rows.length, 3, 'tabla con cabecera'); assert(tb.header, 'cabecera');
      assert(S[9].blocks.some(b => b.type === 'image'), 'imagen generada en la diapositiva de imagen');
      eq(S[0].notes, 'Hola', 'notas');
      assert(/<span style="color:/.test(S[3].blocks[1].html), 'encabezado de columna con color');
      // Mejorar una diapositiva
      R.slides.goToSlide(3); answer = { kind: 'bullets', title: 'Ventajas claras', bullets: ['Limpia'], notes: 'n' };
      eq(await A.improveSlide(), 'bullets', 'mejorada'); assert(/Ventajas claras/.test(slide().blocks[0].html), 'título nuevo');
      // Agenda y preguntas
      answer = { kind: 'bullets', title: 'Agenda', bullets: ['Intro', 'Datos'] }; await A.addAgenda();
      assert(/Agenda/.test(R.state.deck.slides[1].blocks[0].html), 'agenda en la segunda posición');
      answer = { questions: [{ question: '¿Qué es?', options: ['A', 'B', 'C', 'D'], answer: 2, explanation: 'Porque C' }] };
      const total = R.state.deck.slides.length; eq(await A.addQuiz(1), 1, 'una pregunta');
      eq(R.state.deck.slides.length, total + 2, 'pregunta y respuesta');
      const ans = R.state.deck.slides.at(-1).blocks; eq(ans[3].opacity, undefined, 'correcta resaltada'); eq(ans[1].opacity, 30, 'incorrectas atenuadas');
      // Asistente con operaciones
      reset(); R.slides.addSlide();
      const [s1, s2] = R.state.deck.slides, tid = s1.blocks[0].id;
      answer = { message: 'Listo', ops: [
        { op: 'set_text', slide: 1, id: tid, text: 'Nuevo título' },
        { op: 'add_slide', after: 1, spec: { kind: 'bullets', title: 'Añadida', bullets: ['x'] } },
        { op: 'delete_slide', slide: 2 }, { op: 'set_notes', slide: 1, notes: 'Notas IA' },
        { op: 'set_background', slide: 'all', color: '#223344' }, { op: 'bogus' }] };
      const res = await A.assistant('Cambia cosas');
      eq(res.message, 'Listo', 'mensaje'); eq(res.applied, 5, 'operaciones válidas aplicadas');
      eq(s1.blocks[0].html, 'Nuevo título', 'texto'); eq(s1.notes, 'Notas IA', 'notas');
      eq(R.state.deck.slides.length, 2, 'añade una y borra la original 2'); assert(!R.state.deck.slides.includes(s2), 'borrada la correcta');
      assert(/Añadida/.test(R.state.deck.slides[1].blocks[0].html), 'insertada tras la 1');
      assert(R.state.deck.slides.every(s => s.background === '#223344'), 'fondo en todas');
      const ctx = calls.at(-1).body.messages.at(-1).content; assert(ctx.includes(tid), 'el asistente recibe los ids de los textos');
      R.store.undo(); eq(R.state.deck.slides.length, 2, 'deshacer'); assert(R.state.deck.slides.some(x => x.id === s2.id), 'un solo paso de deshacer');
      eq(await A.readDocument(new W.File(['Hola documento'], 'd.txt')), 'Hola documento', 'leer .txt');
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(10);
      assert(D.getElementById('assistant-panel'), 'panel del asistente'); D.querySelector('[data-action="ai-assistant"]').click();
    } finally { W.fetch = realFetch; R.ai.disconnectAi(); }
  });

  await test('imágenes libres (Openverse) e iconos en línea (Iconify)', async () => {
    reset(); const W = frame.contentWindow, S = R.stock, real = W.fetch, calls = [];
    const gif = Uint8Array.from(atob('R0lGODlhAQABAAAAACw='), c => c.charCodeAt(0));
    W.fetch = async (url) => {
      url = String(url); calls.push(url);
      if (url.startsWith('https://api.openverse.org/v1/images/?')) return new W.Response(JSON.stringify({ results: [{ id: 'x1', title: 'Volcán', url: 'https://cdn.bloqueado/v.jpg',
        thumbnail: 'https://api.openverse.org/v1/images/x1/thumb/', creator: 'NASA', license: 'by', license_version: '2.0', attribution: '"Volcán" by NASA is licensed under CC BY 2.0.', width: 1600, height: 900 }] }));
      if (url.startsWith('https://cdn.bloqueado')) throw new TypeError('CORS');
      if (url.includes('/thumb/')) return new W.Response(new W.Blob([gif], { type: 'image/gif' }));
      if (url.startsWith('https://api.iconify.design/search')) return new W.Response(JSON.stringify({ icons: ['mdi:rocket'], collections: { mdi: { name: 'MDI', license: { title: 'Apache 2.0', spdx: 'Apache-2.0' } } } }));
      if (url.startsWith('https://api.iconify.design/mdi.json?icons=')) return new W.Response(JSON.stringify({ prefix: 'mdi', width: 24, height: 24, left: -1,
        icons: { rocket: { body: '<path fill="currentColor" d="M0 0h24v24H0z"/>' } }, aliases: { 'rocket-left': { parent: 'rocket', hFlip: true } } }));
      if (url.startsWith('https://api.iconify.design/mdi/rocket.svg')) return new W.Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ff0000" d="M0 0h24v24H0z"/></svg>');
      return real(url);
    };
    try {
      const res = await S.searchImages('volcán', 1, { commercial: true });
      assert(/license_type=commercial/.test(calls[0]) && /q=volc/.test(calls[0]), 'búsqueda con filtro comercial');
      eq(res[0].license, 'BY 2.0', 'licencia');
      eq(S.previewsOf({ url: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Gato.gif', thumbnail: 'https://api.openverse.org/v1/images/x/thumb/' }).join(' '),
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Gato.gif/120px-Gato.gif https://api.openverse.org/v1/images/x/thumb/ https://upload.wikimedia.org/wikipedia/commons/7/78/Gato.gif',
        'GIF: miniatura animada de Wikimedia (Openverse no las hace), luego la suya y el original');
      const b = await S.insertStockImage(res[0]);
      assert(calls.some(u => u.includes('/thumb/')), 'si el original no deja descargar, usa la miniatura');
      assert(/^data:image\/gif/.test(b.src), 'imagen incrustada (funciona sin conexión)');
      eq(b.caption, '«Volcán» — NASA (BY 2.0)', 'atribución como pie'); eq(Math.round(b.w / b.h * 9), 16, 'proporción');
      const ic = await S.searchIcons('rocket'); eq(ic.icons[0], 'mdi:rocket', 'iconos');
      // The drawings come in one request per icon set (Iconify limits one request per icon) and are drawn here.
      eq(calls.filter(u => u.includes('mdi.json')).length, 1, 'una sola petición para los dibujos');
      assert(/^data:image\/svg\+xml/.test(S.iconPreview('mdi:rocket', '#ff0000')), 'la vista previa se dibuja aquí, sin pedir cada icono');
      await S.loadIcons(['mdi:rocket-left']);
      const flip = atob(S.iconSVG('mdi:rocket-left', '#000', 64).split(',')[1]);
      assert(/viewBox="-1 0 24 24"/.test(flip) && /scale\(-1 1\)/.test(flip), 'alias volteado, con el desplazamiento de su colección');
      const i = await S.insertOnlineIcon('mdi:rocket', '#ff0000', ic.collections.mdi.license);
      assert(/^data:image\/svg\+xml;base64,/.test(i.src) && atob(i.src.split(',')[1]).includes('#ff0000'), 'icono SVG con color');
      eq(i.alt, 'rocket', 'texto alternativo');
      assert(!calls.some(u => u.includes('/mdi/rocket.svg')), 'al insertar tampoco hace falta pedirlo');
    } finally { W.fetch = real; }
    // An extension blocks fetch() but not images: the icon is still inserted.
    W.fetch = async url => { if (String(url).includes('iconify')) throw new TypeError('Failed to fetch'); return real(url); };
    const RealImage = W.Image;
    W.Image = function () { const i = new RealImage(); setTimeout(() => { i.onerror?.(); }, 0); return i; };   // and images too
    try {
      const i2 = await R.stock.insertOnlineIcon('mdi:rocket-launch', '#00ff00');
      eq(i2.src, 'https://api.iconify.design/mdi/rocket-launch.svg?color=%2300ff00&width=512&height=512', 'si todo falla, lo enlaza en vez de dar error');
    } finally { W.fetch = real; W.Image = RealImage; }
  });

  await test('buscador de imágenes: filtros (tipo, formato, forma, tamaño) y fondo transparente', async () => {
    reset(); const W = frame.contentWindow, S = R.stock, real = W.fetch, calls = [];
    // Two pictures made here: a cut-out (clear around a dot) and a photo (opaque).
    const png = see => { const c = D.createElement('canvas'); c.width = c.height = 40; const g = c.getContext('2d');
      if (!see) { g.fillStyle = '#3366aa'; g.fillRect(0, 0, 40, 40); } g.fillStyle = '#c00'; g.beginPath(); g.arc(20, 20, 10, 0, 7); g.fill(); return c.toDataURL('image/png'); };
    const clear = png(true), solid = png(false);
    eq(await S.hasTransparentBackground(clear), true, 'un recorte: fondo transparente');
    eq(await S.hasTransparentBackground(solid), false, 'una foto: no');
    eq(await S.hasTransparentBackground('data:image/png;base64,xx'), null, 'si no se puede leer, no se sabe');
    // Wikimedia's own thumbnails first (they keep the transparency); an SVG's is a PNG.
    eq(S.previewsOf({ url: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Manzana.svg', thumbnail: 'https://api.openverse.org/v1/images/x/thumb/' })[0],
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Manzana.svg/250px-Manzana.svg.png', 'SVG: miniatura PNG de Wikimedia');
    const item = (id, thumb, filetype) => ({ id, title: id, url: 'https://ejemplo.test/' + id + '.' + filetype, thumbnail: thumb, filetype, creator: 'Ana', license: 'cc0', license_version: '1.0', width: 400, height: 400 });
    W.fetch = async url => { url = String(url); calls.push(url);
      if (url.startsWith('https://api.openverse.org/v1/images/?')) {
        const u = new URL(url), pg = +u.searchParams.get('page');
        if (u.searchParams.get('q') === 'muchas') return new W.Response(JSON.stringify({ results: Array.from({ length: pg < 3 ? 20 : 3 }, (_, k) => ({ ...item(`p${pg}-${k}`, solid, 'jpg'), width: k % 2 ? 300 : 900, height: 600 })) }));
        return new W.Response(JSON.stringify({ results: [item('recorte', clear, 'png'), item('foto', solid, 'png')] }));
      }
      if (url.startsWith('https://ejemplo.test/')) return new W.Response(await (await real(url.includes('recorte') ? clear : solid)).blob());
      return real(url); };
    W.localStorage.setItem('revela.consent.openverse', '1');
    try {
      await S.searchImages('manzana', 1, { extension: 'svg', category: 'illustration', aspect: 'square', size: 'large' });
      const u = new URL(calls.at(-1));
      eq(['extension', 'category', 'aspect_ratio', 'size'].map(k => u.searchParams.get(k)).join(), 'svg,illustration,square,large', 'los filtros llegan al buscador');
      // In the panel: the filters only for pictures; «Fondo transparente» asks for PNG/SVG and keeps the see-through ones.
      D.querySelector('[data-action="resources"]').click(); await sleep(30);
      const P = D.getElementById('elements-panel'), f = s => P.querySelector(s);
      f('[data-et="icons"]').click(); await sleep(10); assert(f('.el-filters').hidden, 'sin filtros de imagen en iconos');
      f('[data-et="images"]').click(); await sleep(10);
      assert(f('.el-filters').hidden && !f('.el-ftoggle').hidden, 'en imágenes, los filtros tras su botón (sin quitar sitio a los resultados)');
      f('.el-ftoggle').click(); assert(!f('.el-filters').hidden, 'el botón los muestra');
      f('.el-f-transp').checked = true; f('.sk-q').value = 'manzana'; f('.sk-go').click();
      for (let i = 0; i < 50 && !P.querySelector('.sk-item'); i++) await sleep(20);
      eq(new URL(calls.at(-1)).searchParams.get('extension'), 'png,svg', 'fondo transparente: solo PNG y SVG');
      eq([...P.querySelectorAll('.sk-item')].map(x => x.title.split(' — ')[0]).join(), 'recorte', 'y solo las que lo tienen de verdad');
      assert(/PNG · CC0 1\.0/.test(P.querySelector('.sk-item span').textContent), 'con su formato y licencia a la vista');
      assert(f('.el-grid').classList.contains('checker'), 'sobre cuadros, para ver la transparencia');
      // Changing a filter searches again.
      const n = calls.length; f('.el-f-transp').checked = false; f('.el-f-shape').value = 'tall'; f('.el-f-shape').dispatchEvent(new W.Event('change', { bubbles: true }));
      for (let i = 0; i < 50 && P.querySelectorAll('.sk-item').length < 2; i++) await sleep(20);
      assert(calls.length > n && new URL(calls.at(-1)).searchParams.get('aspect_ratio') === 'tall', 'cambiar un filtro busca otra vez');
      eq(P.querySelectorAll('.sk-item').length, 2, 'sin el filtro, todas');
      eq(f('.el-fcount').textContent, '1', 'el botón cuenta los filtros puestos');
      assert(f('.el-help').hidden, 'con resultados, la explicación deja sitio');
      // Remembered: closing and opening again keeps them.
      f('.cm-close').click(); D.querySelector('[data-action="resources"]').click(); await sleep(30);
      const P2 = D.getElementById('elements-panel'), g = s => P2.querySelector(s);
      g('[data-et="images"]').click(); await sleep(10);
      eq(g('.el-f-shape').value, 'tall', 'los filtros se recuerdan');
      // Rows with each picture's proportions; the next page comes when the end is reached.
      g('.el-f-shape').value = ''; g('.el-f-shape').dispatchEvent(new W.Event('change', { bubbles: true }));
      g('.sk-q').value = 'muchas'; g('.sk-go').click();
      for (let i = 0; i < 50 && P2.querySelectorAll('.sk-item').length < 20; i++) await sleep(20);
      const it = [...P2.querySelectorAll('.sk-item')];
      assert(g('.el-grid').classList.contains('justify') && it[0].style.getPropertyValue('--ar') === '1.500' && it[1].style.getPropertyValue('--ar') === '0.500', 'cada una con su proporción');
      assert(it[0].offsetWidth > it[1].offsetWidth * 2, 'la horizontal, más ancha que la vertical');
      const grid = g('.el-grid'); grid.scrollTop = grid.scrollHeight; grid.dispatchEvent(new W.Event('scroll'));
      for (let i = 0; i < 50 && P2.querySelectorAll('.sk-item').length < 40; i++) await sleep(20);
      eq(P2.querySelectorAll('.sk-item').length, 40, 'al llegar al final, llegan más solas');
      eq(new URL(calls.filter(c => c.includes('q=muchas')).at(-1)).searchParams.get('page'), '2', 'la página siguiente');
      // Used recently: in the empty search, to add again without searching.
      const nb = slide().blocks.length; it[0].click();
      for (let i = 0; i < 50 && slide().blocks.length === nb; i++) await sleep(20);
      eq(slide().blocks.length, nb + 1, 'añadida');
      g('.sk-q').value = ''; g('[data-et="gif"]').click(); await sleep(10); g('[data-et="images"]').click(); await sleep(10);
      assert(/Usadas recientemente/.test(g('.el-grid').textContent) && g('.el-grid .sk-item')?.title.startsWith('p1-0'), 'aparece en «Usadas recientemente»');
      // A very big Wikimedia original comes as its 1280 px copy (lighter, still transparent).
      W.fetch = async url => { url = String(url); calls.push(url); return new W.Response(await (await real(clear)).blob()); };
      await S.insertStockImage({ title: 'Grande', url: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Grande.png', thumb: '', width: 4000, height: 3000, license: 'CC0', creator: '' });
      eq(calls.at(-1), 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Grande.png/1280px-Grande.png', 'original enorme: su copia de 1280 px');
    } finally { W.fetch = real; ['revela.consent.openverse', 'revela.elements.imageFilters', 'revela.elements.recentImages'].forEach(k => W.localStorage.removeItem(k)); D.getElementById('elements-panel')?.querySelector('.cm-close')?.click(); }
  });

  await test('vídeos (Wikimedia Commons) y sonidos (Openverse) libres en Recursos', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, calls = [], Rz = await W.eval("import('/src/features/content/resources.js')");
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), mp3 = new Uint8Array([0x49, 0x44, 0x33]);
    W.fetch = async url => { url = String(url); calls.push(url);
      if (url.startsWith('https://commons.wikimedia.org/w/api.php')) return new W.Response(JSON.stringify({ query: { pages: { 1: { index: 1, title: 'File:Olas.webm', videoinfo: [{ url: 'https://upload.test/Olas.webm', size: 9e7, duration: 15.4, width: 1920, height: 1080,
        thumburl: 'https://thumb.test/olas.jpg', descriptionurl: 'https://commons/olas', extmetadata: { LicenseShortName: { value: 'CC0' }, Artist: { value: '<b>Ana</b>' } },
        derivatives: [{ transcodekey: '240p.vp9.webm', src: 'https://upload.test/240.webm', width: 426, height: 240 }, { transcodekey: '480p.vp9.webm', src: 'https://upload.test/480.webm', width: 854, height: 480 }] }] } } } }));
      if (url.startsWith('https://upload.test/')) return new W.Response(new W.Blob([webm], { type: 'video/webm' }));
      if (url.startsWith('https://api.openverse.org/v1/audio/')) return new W.Response(JSON.stringify({ results: [
        { id: 'a1', title: 'Aplausos', url: 'https://cdn.freesound.test/a1.mp3', duration: 6320, source: 'freesound', creator: 'Luis', license: 'cc0', license_version: '1.0', attribution: '"Aplausos" by Luis' },
        { id: 'a2', title: 'Canción', url: 'https://jamendo.test/a2.mp3', duration: 180000, source: 'jamendo', creator: 'Eva', license: 'by-sa', license_version: '3.0' }] }));
      if (url.startsWith('https://cdn.freesound.test/')) return new W.Response(new W.Blob([mp3], { type: 'audio/mpeg' }));
      if (url.startsWith('https://jamendo.test/')) throw new TypeError('CORS');
      return real(url); };
    try {
      const v = (await Rz.searchCommonsVideo('olas')).results[0];
      assert(/filetype%3Avideo|filetype:video/.test(decodeURIComponent(calls[0])), 'busca vídeos en Commons');
      assert(v.src === 'https://upload.test/480.webm' && v.small && v.license === 'CC0' && v.artist === 'Ana' && v.duration === 15.4, 'la copia de 480p, con licencia, autor y duración');
      const vb = await Rz.insertCommonsVideo(v);
      assert(vb.type === 'video' && /^data:video\/webm/.test(vb.src) && /Ana, Wikimedia Commons \(CC0\)/.test(vb.caption), 'un corto va dentro, con su atribución');
      eq(Math.round(vb.w / vb.h * 9), 16, 'con su proporción');
      eq((await Rz.insertCommonsVideo(v, { maxEmbed: 2 })).src, 'https://upload.test/480.webm', 'uno grande se enlaza');
      const au = await Rz.searchAudio('aplausos', 1, { kind: 'effects' });
      assert(/source=freesound/.test(calls.at(-1)) && au[0].duration === 6.32 && au[0].license === 'CC0 1.0', 'efectos de sonido (Freesound), con su duración y licencia');
      await Rz.searchAudio('piano', 1, { kind: 'music' }); assert(/category=music/.test(calls.at(-1)), 'o música');
      const ab = await Rz.insertAudio(au[0]); assert(ab.type === 'audio' && /^data:audio\/mpeg/.test(ab.src) && /Luis/.test(ab.caption), 'el sonido va dentro');
      eq((await Rz.insertAudio(au[1])).src, 'https://jamendo.test/a2.mp3', 'si su web no deja descargarlo, se enlaza');
      // The panel: listen first, a click adds it.
      W.localStorage.setItem('revela.consent.openverse', '1');
      D.querySelector('[data-action="resources"]').click(); await sleep(30);
      const P = D.getElementById('elements-panel');
      P.querySelector('[data-et="audio"]').click(); await sleep(10);
      assert(!P.querySelector('.el-akind').hidden, 'música, efectos o ambos');
      P.querySelector('.sk-q').value = 'aplausos'; P.querySelector('.sk-go').click();
      for (let i = 0; i < 50 && !P.querySelector('.sk-sound'); i++) await sleep(20);
      const row = P.querySelector('.sk-sound'); assert(row && /0:06 · freesound · CC0 1\.0/.test(row.textContent) && row.querySelector('.sk-listen'), 'cada sonido con su duración, origen, licencia y botón para escucharlo');
      const n = slide().blocks.length; row.click();
      for (let i = 0; i < 50 && slide().blocks.length === n; i++) await sleep(20);
      eq(last().type, 'audio', 'un clic lo añade');
    } finally { W.fetch = real; W.localStorage.removeItem('revela.consent.openverse'); D.getElementById('elements-panel')?.querySelector('.cm-close')?.click(); }
  });

  await test('gráfico de mapa: países o comunidades coloreados por su valor, sin conexión una vez cargado', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, S = await W.eval("import('/src/render/svg.js')"), calls = [];
    // Two squares as TopoJSON: Spain (724) and France (250), and Antarctica (10), which is left out.
    const topo = { type: 'Topology', transform: { scale: [1, 1], translate: [0, 0] },
      arcs: [[[-5, 40], [5, 0], [0, 4], [-5, 0], [0, -4]], [[0, 44], [6, 0], [0, 5], [-6, 0], [0, -5]], [[0, -70], [10, 0], [0, 5], [-10, 0], [0, -5]]],
      objects: { countries: { type: 'GeometryCollection', geometries: [{ type: 'Polygon', id: '724', properties: { name: 'Spain' }, arcs: [[0]] },
        { type: 'Polygon', id: '250', properties: { name: 'France' }, arcs: [[1]] }, { type: 'Polygon', id: '010', properties: { name: 'Antarctica' }, arcs: [[2]] }] } } };
    W.fetch = async url => { url = String(url); calls.push(url); if (/world-atlas/.test(url)) return new W.Response(JSON.stringify(topo)); return real(url); };
    try {
      R.blocks.addChart(); await sleep(10); const id = last().id;
      await R.blocks.setChartMap(id, 'world'); await sleep(20);
      const b = last();
      assert(/cdn\.jsdelivr\.net\/npm\/world-atlas@2\.0\.2\//.test(calls[0]), 'los contornos, de world-atlas (versión fija)');
      eq(b.map.regions.map(r => r.k).join(), 'ES,FR', 'países con su código (sin la Antártida)');
      assert(b.map.regions[0].n.includes('España') && b.map.regions[0].n.includes('Spain'), 'con sus nombres en español e inglés');
      assert(b.data.some(d => d.label === 'Francia'), 'datos de ejemplo del mapa');
      // Names written any way: with or without accents, in another language, or the code.
      eq([...S.mapMatch(b.map, [{ label: 'espana', value: 1 }, { label: 'FR', value: 2 }]).entries()].join(';'), 'ES,1;FR,2', 'sin tildes o con el código');
      const svg = S.chartSVG({ ...b, data: [{ label: 'España', value: 10 }, { label: 'Francia', value: 20 }] });
      const fills = [...svg.matchAll(/<path d="[^"]+" fill="(#[0-9a-f]+)"/g)].map(m => m[1]);
      assert(fills.length === 2 && fills[0] !== fills[1], 'cada país con su tono según su valor');
      assert(/<title>España: 10<\/title>/.test(svg), 'con su nombre y valor al pasar el ratón');
      // Kept inside: the presentation doesn't need the internet.
      const n = calls.length; assert(/<path d="M/.test(R.io.buildHTML()) && calls.length === n, 'en la presentación, sin volver a descargarlo');
      R.store.commit(() => { R.state.ui.selection = id; R.state.ui.multi = [id]; R.state.ui.activeTab = 'ctx'; }, { history: false }); await sleep(20);
      assert([...D.querySelectorAll('#ribbon [data-page="ctx"] select')].some(x => [...x.options].some(o => o.value === 'provinces')), 'elegir el mapa en su pestaña');
      const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);
      assert(Object.keys(zip.files).some(f => /^ppt\/media\//.test(f)), 'en PowerPoint, como imagen');
    } finally { W.fetch = real; }
  });

  await test('seguridad: lo que llega de fuera no ejecuta código', async () => {
    reset(); const W = frame.contentWindow;
    const Sz = await W.eval("import('/src/features/document/sanitize.js')"), T = await W.eval("import('/src/core/text.js')");
    // HTML of a deck: no scripts, handlers, frames or javascript: links; the rest intact.
    const dirty = '<b>Hola</b><img src=x onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a><iframe src="https://e"></iframe><a href="https://ok.es">ok</a>';
    const clean = Sz.cleanHTML(dirty);
    assert(!/onerror|<script|javascript:|<iframe/i.test(clean) && /<b>Hola<\/b>/.test(clean) && /href="https:\/\/ok\.es"/.test(clean), 'HTML limpio: ' + clean);
    // The newer fields too: a gradient's second colour goes into SVG, device / until into attributes.
    const nb = Sz.sanitizeDeck({ slides: [{ blocks: [{ type: 'shape', fill: '#fff', fill2: '"/><script>alert(1)</script>', gradType: 'radial"x', device: 'phone" onload="x', until: 'end' }] }] }).slides[0].blocks[0];
    assert(nb.fill2 === '' && nb.gradType === '' && nb.device === '' && nb.until === 'end', 'degradado, dispositivo y «hasta» limpios');
    const S = await W.eval("import('/src/render/svg.js')");
    assert(!/<script|onload/.test(S.timerSVG({ type: 'timer', seconds: 60, color: '"/><script>x</script>', w: 100, h: 100 })), 'la cuenta atrás escapa su color');
    assert(!/<script/.test(S.curvedTextSVG({ html: '<script>x</script>hola', curve: 40, w: 300, h: 200 })), 'el texto curvo, sin etiquetas');
    eq(Sz.cleanHTML('<p style="color:red">Texto normal</p>'), '<p style="color:red">Texto normal</p>', 'lo normal no se toca');
    // A whole deck opened from a file: fields that go into styles, sources and scripts.
    const deck = R.model.emptyDeck();
    deck.defaultTransition = "slide'};alert(1);//";
    deck.slides[0].blocks.push({ id: 'z', type: 'text', html: '<img src=x onerror=alert(1)>', fontFamily: 'A"><img src=x onerror=alert(1)>', color: 'red;background:url(javascript:x)', x: 0, y: 0, w: 10, h: 10 },
      { id: 'e', type: 'embed', src: 'javascript:alert(1)', x: 0, y: 0, w: 10, h: 10 }, { id: 't', type: 'table', rows: [['<svg onload=alert(1)>', 'ok']], x: 0, y: 0, w: 10, h: 10 });
    R.store.replaceDeck(deck); await sleep(10);
    const bs = R.state.deck.slides[0].blocks, by = id => bs.find(b => b.id === id);
    assert(!/onerror/.test(by('z').html) && by('z').fontFamily === '' && by('z').color === '', 'abrir un archivo lo limpia');
    eq(by('e').src, '', 'sin enlaces javascript:');
    assert(!/onload/.test(by('t').rows[0][0]) && by('t').rows[0][1] === 'ok', 'celdas de tabla limpias');
    eq(R.state.deck.defaultTransition, '', 'nada que se salga del script de la presentación');
    assert(!/alert\(1\)/.test(R.io.buildHTML()), 'la presentación exportada no lo lleva');
    // Pasting from another site through the system clipboard.
    const n0 = slide().blocks.length;
    R.clipboard.paste({ blocks: [{ id: 'p1', type: 'text', html: '<b onmouseover=alert(1)>x</b>', x: 0, y: 0, w: 10, h: 10 }] });
    assert(slide().blocks.length === n0 + 1 && !/onmouseover/.test(slide().blocks.at(-1).html), 'pegar de fuera, limpio');
    // A co-editor: no __proto__ paths; a commenter only comments.
    const C = await W.eval("import('/src/features/live/collabsync.js')");
    const root = { slides: [{ id: 's', comments: [] }] };
    assert(!C.applyOp(root, { p: ['slides', 's', 'comments', '__proto__', 'lineHeight'], v: 'x' }) && ({}).lineHeight === undefined && W.Object.prototype.lineHeight === undefined, 'sin contaminar prototipos');
    assert(!C.allowed({ p: ['slides', 's', 'comments', '__proto__', 'x'], v: 1 }, 'comment') && !C.allowed({ p: ['slides', 's', 'comments'], v: {} }, 'comment'), 'quien comenta no puede más');
    assert(C.allowed({ p: ['slides', 's', 'comments', 'c1'], v: { id: 'c1', text: 'hola' } }, 'comment'), 'pero sí comentar');
    const up = C.unpacker({ maxParts: 3 });
    eq(up(JSON.stringify({ t: 'part', id: 'a', i: 0, n: 99999, s: 'x' })), null, 'mensajes por partes con límite');
    // Data inside the presentation's scripts can't close them.
    eq(T.jsData('</script><x>'), '"\\u003c/script>\\u003cx>"', 'datos seguros dentro de <script>');
    // Viewer links: only https (or this site's blobs).
    const vf = D.createElement('iframe'); vf.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:200px;visibility:hidden'; D.body.appendChild(vf);
    vf.src = `${new URL('view.html', D.baseURI)}?u=${encodeURIComponent('https://x/</script><script>parent.__pwned=1</script>')}`;
    let msg = ''; for (let i = 0; i < 60 && !msg; i++) { await sleep(100); try { msg = vf.contentDocument.querySelector('#m')?.textContent || ''; } catch {} }
    await sleep(300); vf.remove();
    assert(!W.__pwned && !window.__pwned, 'el visor no ejecuta lo que venga en la dirección');
    // Markdown: no javascript: links.
    const md = await W.eval("import('/src/io/formats/markdown.js')");
    assert(!/javascript:/.test(JSON.stringify(md.markdownToSlides('# T\n\n[x](javascript:alert(1)) y [w](https://w.es)'))), 'Markdown sin enlaces javascript:');
  });

  await test('núcleo: los avisos de io/features usan los diálogos del editor', async () => {
    const p = R.notify.confirmUser('¿Seguro?');
    const modal = D.querySelector('.modal-backdrop .dlg-msg');
    assert(modal && modal.textContent === '¿Seguro?', 'confirmUser abre el diálogo propio, no el del navegador');
    D.querySelector('.modal-backdrop .dlg-cancel').click();
    eq(await p, false, 'Cancelar → false');
    const q = R.notify.promptUser('Nombre:', 'x');
    D.querySelector('.modal-backdrop .dlg-ok').click();
    eq(await q, 'x', 'promptUser devuelve el valor');
  });

  await test('núcleo: librerías externas en un solo sitio y cargadas una vez', async () => {
    for (const [k, v] of Object.entries(R.vendor))
      if (typeof v === 'string') assert(/^https:\/\/cdn\.jsdelivr\.net\/npm\/(@[^/]+\/)?[^/@]+@\d/.test(v), k + ' con versión fijada');
    const W = frame.contentWindow, url = 'data:text/javascript,window.__vendorHits=(window.__vendorHits||0)+1;window.__vendorLib={ok:1}';
    const [a, b] = await Promise.all([R.vendor.loadScript(url, '__vendorLib'), R.vendor.loadScript(url, '__vendorLib')]);
    eq(W.__vendorHits, 1, 'dos peticiones simultáneas → una sola carga');
    assert(a === b && a.ok === 1, 'devuelve el global');
    await R.vendor.loadScript(url, '__vendorLib');
    eq(W.__vendorHits, 1, 'ya cargada: no se repite');
    let failed = false;
    await R.vendor.loadScript('/no-existe-' + Date.now() + '.js').catch(() => { failed = true; });
    assert(failed, 'un error de carga rechaza la promesa');
  });

  await test('núcleo: la sesión sabe si se está presentando (para el mando)', async () => {
    eq(R.session.present, null, 'sin presentar');
    R.io.present({ fullscreen: false });
    assert(R.session.present && R.session.present.frame, 'presentando: la sesión tiene el marco');
    eq(R.remote.presentationState().presenting, true, 'el mando lo ve');
    D.getElementById('present-close').click();
    eq(R.session.present, null, 'al salir se limpia');
    eq(R.remote.presentationState().presenting, false, 'el mando también');
  });

  // ---- Co-editing -------------------------------------------------------------------
  await test('coedición: los cambios viajan por objeto (añadir, mover, borrar, reordenar) y se mezclan', async () => {
    const W = frame.contentWindow, S = await W.eval("import('/src/features/live/collabsync.js')");
    const base = { name: 'P', slides: [{ id: 's1', blocks: [{ id: 'a', x: 1, html: 'A' }, { id: 'b', x: 2 }] }, { id: 's2', blocks: [] }] };
    const c = o => JSON.parse(JSON.stringify(o));
    const mine = c(base), theirs = c(base);
    mine.slides[0].blocks[0].x = 50; mine.slides[0].blocks.push({ id: 'n', x: 9 }); mine.slides.reverse();
    theirs.slides[0].blocks[1].x = 70; theirs.slides[0].blocks[0].html = 'Hola'; theirs.slides[1].blocks.push({ id: 'z' }); theirs.name = 'Q';
    const opsMine = S.diff(base, mine), opsTheirs = S.diff(base, theirs);
    assert(opsMine.some(o => o.p.join('/') === 'slides/s1/blocks/a/x' && o.v === 50), 'cambio direccionado por id: ' + JSON.stringify(opsMine));
    assert(opsMine.some(o => o.p.join('/') === 'slides/#'), 'nuevo orden de diapositivas');
    const a = c(base); S.applyOps(a, opsMine); S.applyOps(a, opsTheirs);
    const b = c(base); S.applyOps(b, opsTheirs); S.applyOps(b, opsMine);
    eq(JSON.stringify(a), JSON.stringify(b), 'en cualquier orden, el mismo resultado');
    const s1 = a.slides.find(x => x.id === 's1');
    eq(a.slides[0].id, 's2', 'reordenado'); eq(s1.blocks.find(x => x.id === 'a').x, 50, 'mi movimiento');
    eq(s1.blocks.find(x => x.id === 'a').html, 'Hola', 'su texto en el mismo objeto'); eq(s1.blocks.find(x => x.id === 'b').x, 70, 'su movimiento');
    assert(s1.blocks.some(x => x.id === 'n') && a.slides[0].blocks.some(x => x.id === 'z'), 'lo añadido por los dos');
    const del = c(base); del.slides[0].blocks.splice(1, 1); const t2 = c(base); S.applyOps(t2, S.diff(base, del)); eq(t2.slides[0].blocks.length, 1, 'borrar');
    assert(!S.diff(base, { ...c(base), savedAt: 5 }).length, 'la hora de guardado no se envía');
    assert(S.allowed({ p: ['slides', 's1', 'comments', 'c1', 'resolved'] }, 'comment'), 'quien comenta puede comentar');
    assert(!S.allowed({ p: ['slides', 's1', 'blocks', 'a', 'x'] }, 'comment') && !S.allowed({ p: ['name'] }, 'view'), 'pero no editar; quien ve, nada');
  });

  // A fake connection pair, as PeerJS would give.
  const pipe = () => { const a = { q: [], h: [], c: [] }, b = { q: [], h: [], c: [] };
    const end = (me, other) => ({ send: m => other.h.forEach(f => f(JSON.parse(JSON.stringify(m)))), onData: f => me.h.push(f), onClose: f => me.c.push(f), close: () => { other.c.forEach(f => f()); } });
    return [end(a, b), end(b, a)]; };

  await test('coedición: el anfitrión reparte los cambios según el permiso de cada enlace, con chat y presencia', async () => {
    reset(); R.slides.addSlide(); const W = frame.contentWindow;
    const C = await W.eval("import('/src/features/live/collab.js')");
    let onConn; const host = C.hostCollab({ name: 'Ana', listen: f => { onConn = f; return () => {}; } });
    const guest = (token, name) => { const [h, g] = pipe(); const got = []; g.onData(m => got.push(m)); onConn(h); g.send({ t: 'hello', token, name }); return { g, got, last: t => got.filter(m => m.t === t).at(-1) }; };
    try {
      const bad = guest('xxx', 'Intruso'); eq(bad.got[0]?.t, 'denied', 'un enlace falso no entra');
      const ed = guest(host.tokens.edit, 'Luis'), co = guest(host.tokens.comment, 'Eva'), vi = guest(host.tokens.view, 'Pau');
      const w = ed.last('welcome'); eq(w.role, 'edit', 'rol del enlace'); eq(w.deck.slides.length, 2, 'recibe la presentación');
      eq(host.peers().length, 3, 'tres personas conectadas');
      const s = R.state.deck.slides[0], blk = s.blocks[0];
      // An editor moves an object: the host applies it and passes it on.
      ed.g.send({ t: 'ops', ops: [{ p: ['slides', s.id, 'blocks', blk.id, 'x'], v: 333 }] }); await sleep(10);
      eq(R.state.deck.slides[0].blocks[0].x, 333, 'el anfitrión aplica el cambio del editor');
      assert(co.last('ops')?.ops[0].v === 333 && vi.last('ops')?.ops[0].v === 333, 'y lo reciben los demás');
      // A commenter can't move it, but can comment.
      co.g.send({ t: 'ops', ops: [{ p: ['slides', s.id, 'blocks', blk.id, 'x'], v: 1 }] }); await sleep(10);
      eq(R.state.deck.slides[0].blocks[0].x, 333, 'quien comenta no puede mover');
      co.g.send({ t: 'ops', ops: [{ p: ['slides', s.id, 'comments'], v: [{ id: 'c1', text: 'Revisar', replies: [] }] }] }); await sleep(10);
      eq(R.state.deck.slides[0].comments?.[0]?.text, 'Revisar', 'pero sí comentar');
      vi.g.send({ t: 'ops', ops: [{ p: ['name'], v: 'Hackeado' }] }); await sleep(10);
      assert(R.state.deck.name !== 'Hackeado', 'quien solo ve no cambia nada');
      // The host's own changes go to everyone.
      R.store.commit(() => { R.state.deck.slides[1].notes = 'Del anfitrión'; }); await sleep(10);
      assert(ed.last('ops')?.ops.some(o => o.v === 'Del anfitrión'), 'los cambios del anfitrión llegan');
      // Undo on the host undoes its own change, not the editor's.
      R.store.undo(); await sleep(10);
      eq(R.state.deck.slides[0].blocks[0].x, 333, 'deshacer respeta el cambio del otro');
      assert(R.state.deck.slides[1].notes !== 'Del anfitrión', 'y deshace el propio');
      // Chat and presence.
      ed.g.send({ t: 'chat', text: 'Hola' }); await sleep(10);
      eq(host.chat.at(-1).text, 'Hola', 'chat'); eq(vi.last('chat')?.name, 'Luis', 'con el nombre de quien escribe');
      ed.g.send({ t: 'presence', slide: s.id, sel: blk.id }); await sleep(10);
      eq(host.peers().find(p => p.name === 'Luis').sel, blk.id, 'se sabe qué tiene seleccionado');
      R.slides.goToSlide(0); await sleep(10);
      assert(D.querySelector('#stage .collab-sel')?.dataset.name === 'Luis', 'y se ve en la diapositiva');
      assert(!D.getElementById('collab-bar').hidden && D.querySelectorAll('#collab-bar .cb-av').length === 3, 'personas en la barra');
      // Changing someone's permission.
      const eva = host.peers().find(p => p.name === 'Eva'); host.setRole(eva.id, 'edit'); await sleep(10);
      eq(co.last('role')?.role, 'edit', 'se le cambia el permiso');
    } finally { host.stop(); }
    eq(C.session, null, 'sesión terminada');
  });

  await test('coedición: el invitado recibe la presentación sin tocar la suya, y el permiso se respeta', async () => {
    reset(); const own = R.state.deck; own.name = 'Mi proyecto'; R.store.commit(() => {}); const W = frame.contentWindow;
    const stored = () => JSON.parse(W.localStorage.getItem('revela.deck.v1') || '{}').name;
    eq(stored(), 'Mi proyecto', 'el suyo guardado');
    const C = await W.eval("import('/src/features/live/collab.js')");
    const [h, g] = pipe(); const sent = []; h.onData(m => sent.push(m));
    const shared = R.model.emptyDeck(); shared.name = 'La de Ana';
    h.onData(m => { if (m.t === 'hello') h.send({ t: 'welcome', you: 'g1', role: 'view', color: '#123456', deck: shared, peers: [{ id: 'host', name: 'Ana', color: '#e8590c' }], chat: [] }); });
    const sess = await C.joinCollab({ name: 'Luis', token: 'tok', connect: async () => g });
    try {
      eq(sent[0].t, 'hello'); eq(sent[0].token, 'tok', 'se presenta con su enlace');
      eq(R.state.deck.name, 'La de Ana', 've la presentación compartida'); eq(sess.role, 'view');
      R.blocks.addText(); eq(R.state.deck.slides[0].blocks.length, shared.slides[0].blocks.length, 'solo ver: no se puede editar');
      h.send({ t: 'ops', ops: [{ p: ['name'], v: 'Cambiada por Ana' }] }); await sleep(10);
      eq(R.state.deck.name, 'Cambiada por Ana', 'recibe los cambios');
      eq(stored(), 'Mi proyecto', 'y su propio proyecto sigue guardado intacto');
      h.send({ t: 'role', role: 'edit' }); await sleep(10);
      R.blocks.addText(); await sleep(900);
      assert(sent.some(m => m.t === 'ops' && m.ops.some(o => o.p[2] === 'blocks')), 'con permiso de edición, sus cambios se envían');
    } finally { sess.stop(); R.store.setPersist(true); R.state.ui.lock = null; }
  });

  await test('firmas digitales: firmar, comprobar, detectar cambios y firmas falsas', async () => {
    reset(); const W = frame.contentWindow, SG = await W.eval("import('/src/features/collab/signature.js')");
    R.state.deck.slides[0].blocks[0].html = 'Contrato'; R.store.commit(() => {});
    const k1 = await SG.myKey(), k2 = await SG.myKey();
    eq(k1.fp, k2.fp, 'la misma clave en este navegador'); assert(/^([0-9A-F]{4} ){7}[0-9A-F]{4}$/.test(k1.fp), 'huella legible: ' + k1.fp);
    const s = await SG.signDeck({ name: 'Ana', reason: 'Aprobada' });
    assert(R.state.deck.final, 'firmar la marca como final');
    eq(await SG.verifySignature(R.state.deck.signatures[0]), 'valid', 'firma válida');
    await SG.signDeck({ name: 'Luis' });
    eq((await SG.verifyAll()).map(x => x.status).join(), 'valid,valid', 'dos firmas sobre el mismo contenido');
    // Saving (savedAt) or the final mark don't break it; a change does.
    R.store.commit(() => {}, { force: true }); eq(await SG.verifySignature(s), 'valid', 'guardar no la invalida');
    const copy = JSON.parse(JSON.stringify(R.state.deck)); copy.slides[0].blocks[0].html = 'Contrato cambiado';
    eq(await SG.verifySignature(copy.signatures[0], copy), 'modified', 'un cambio posterior se detecta');
    const fake = { ...copy.signatures[0], name: 'Otra persona' };
    eq(await SG.verifySignature(fake), 'invalid', 'cambiar el nombre del firmante invalida la firma');
    const forged = { ...s, hash: await SG.digest(copy) };
    eq(await SG.verifySignature(forged, copy), 'invalid', 'no se puede reutilizar para otro contenido');
    // In the interface.
    D.querySelector('[data-action="signatures"]').click(); await sleep(300);
    const m = D.getElementById('sig-modal'); assert(m && m.querySelectorAll('.sg-item.sg-valid').length === 2, 'el diálogo muestra las dos firmas válidas');
    eq(m.querySelector('.sg-fp').textContent, k1.fp, 'y la huella de este navegador');
    m.querySelector('.modal-close').click();
    assert(/Firmada por Ana, Luis/.test(D.querySelector('#final-banner span').textContent), 'aviso de firmada');
    D.querySelector('#final-banner [data-action="mark-final"]').click(); await sleep(20);
    assert(/firmas dejarán de ser válidas/.test(D.querySelector('.dlg-msg')?.textContent || ''), 'avisa antes de editar una presentación firmada');
    D.querySelector('.dlg-ok').click(); await sleep(20);
    assert(!R.state.deck.final, 'se puede editar de todos modos');
  });

  await test('Google: iniciar sesión, mis presentaciones, guardado automático y cambios desde otro dispositivo', async () => {
    reset(); const W = frame.contentWindow;
    const GD = await W.eval("import('/src/io/cloud/gdrive.js')");
    // A fake Google: accounts (token) and Drive (files with versions).
    const drive = new Map(); let n = 0, requests = [];
    const realGoogle = W.google, realFetch = W.fetch;
    W.google = { accounts: { oauth2: { initTokenClient: o => ({ requestAccessToken() { this.callback({ access_token: 'tok', expires_in: 3600 }); } }), revoke: (_, cb) => cb?.() } } };
    const file = (id, name, content, extra = {}) => drive.set(id, { id, name, content, version: '1', modifiedTime: new Date(Date.now() - 1000 * (++n)).toISOString(), ...extra });
    file('old1', 'Clase 1.revela.json', JSON.stringify({ ...R.model.emptyDeck(), name: 'Clase 1' }));
    file('old2', 'Clase 2.revela.json', JSON.stringify({ ...R.model.emptyDeck(), name: 'Clase 2' }), { thumbnailLink: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });
    W.fetch = async (url, o = {}) => {
      url = String(url); requests.push({ url, method: o.method || 'GET' });
      const ok = b => new W.Response(typeof b === 'string' ? b : JSON.stringify(b), { status: 200 });
      if (!url.startsWith('https://www.googleapis.com')) return realFetch(url, o);
      if (url.includes('/oauth2/v3/userinfo')) return ok({ name: 'Ana Pérez', email: 'ana@example.org' });
      const m = url.match(/\/files\/([^/?]+)/), id = m && decodeURIComponent(m[1]);
      if (url.includes('/upload/drive/v3/files')) {
        const parts = o.body.split(/--revela\w+/).filter(x => x.includes('\r\n\r\n')).map(x => x.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''));
        const meta = JSON.parse(parts[0]), content = parts[1];
        if (id) { const f = drive.get(id); f.content = content; f.version = String(+f.version + 1); f.modifiedTime = new Date().toISOString(); f.thumb = !!meta.contentHints; return ok(f); }
        const nid = 'new' + (++n); file(nid, meta.name, content, { modifiedTime: new Date().toISOString(), thumb: !!meta.contentHints }); return ok(drive.get(nid));
      }
      if (url.includes('/drive/v3/files?q=')) return ok({ files: [...drive.values()].filter(f => !f.trashed).sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime)) });
      if (id && url.includes('alt=media')) return ok(drive.get(id).content);
      if (id && o.method === 'PATCH') { drive.get(id).trashed = true; return ok({}); }
      if (id) return ok(drive.get(id));
      return new W.Response('{}', { status: 404 });
    };
    GD.setThumbnailMaker(async () => 'AAAA'); GD.setAutosaveDelay(50);
    try {
      const btn = D.getElementById('account-btn');
      assert(/Iniciar sesión/.test(btn.textContent), 'botón de iniciar sesión');
      btn.click(); await sleep(50);
      eq(GD.account()?.email, 'ana@example.org', 'sesión iniciada'); assert(btn.classList.contains('signed') && /A/.test(btn.textContent), 'la cuenta en la barra');
      // My presentations: the most recent first, with thumbnails.
      D.querySelector('[data-action="home"]').click(); await sleep(80);
      const names = [...D.querySelectorAll('#home-screen .hf-name')].map(x => x.textContent);
      eq(names.join(), 'Clase 1,Clase 2', 'lista de Drive, la más reciente primero');
      assert(D.querySelector('#home-screen .home-file img'), 'con miniatura');
      // The current one (with content, only in this browser) is kept in Drive before opening another.
      R.state.deck.slides[0].blocks[0].html = 'Mi trabajo sin guardar'; R.store.commit(() => {});
      D.querySelector('#home-screen .home-file[data-id="old2"]').click(); await sleep(120);
      eq(R.state.deck.name, 'Clase 2', 'abre la de Drive');
      const kept = [...drive.values()].find(f => f.content?.includes('Mi trabajo sin guardar'));
      assert(kept, 'la que había se guardó antes en Drive'); assert(kept.thumb, 'con su miniatura');
      eq(GD.linkedFile()?.id, 'old2', 'vinculada al archivo abierto');
      // Autosave to the same file.
      R.store.commit(() => { R.state.deck.slides[0].notes = 'nota 1'; }); await sleep(250);
      assert(drive.get('old2').content.includes('nota 1') && drive.get('old2').version === '2', 'se guarda sola en el mismo archivo');
      eq(D.getElementById('drive-status').dataset.state, 'saved', 'estado: guardado');
      // Changed on another device meanwhile → asks.
      drive.get('old2').version = '5'; drive.get('old2').content = JSON.stringify({ ...R.model.emptyDeck(), name: 'Clase 2 (tablet)' });
      R.store.commit(() => { R.state.deck.slides[0].notes = 'nota 2'; }); await sleep(250);
      assert(!D.getElementById('drive-conflict').hidden, 'avisa del cambio en otro dispositivo');
      assert(!drive.get('old2').content.includes('nota 2'), 'y no lo pisa sin preguntar');
      D.querySelector('#drive-conflict [data-cf="theirs"]').click(); await sleep(120);
      eq(R.state.deck.name, 'Clase 2 (tablet)', 'cargar la de Drive'); assert(D.getElementById('drive-conflict').hidden, 'aviso resuelto');
      // Back after a reload: newer in Drive and nothing changed here → brings it.
      drive.get('old2').version = '9'; drive.get('old2').content = JSON.stringify({ ...R.model.emptyDeck(), name: 'Desde el móvil' });
      eq(await GD.reconnect(), 'loaded', 'al volver, trae la versión nueva'); eq(R.state.deck.name, 'Desde el móvil');
      // Another presentation replacing it (Nuevo, abrir archivo…) never writes over the Drive file.
      const before = drive.get('old2').content;
      R.store.replaceDeck(R.model.emptyDeck()); R.store.commit(() => { R.state.deck.name = 'Otra cosa'; }); await sleep(250);
      eq(drive.get('old2').content, before, 'el archivo de Drive no se toca'); eq(GD.linkedFile(), null, 'ya no está vinculada');
      // New from My presentations: a new file in Drive, saved as you go.
      D.querySelector('[data-action="home"]').click(); await sleep(80);
      D.querySelector('#home-screen [data-home="new"]').click(); await sleep(150);
      const nf = GD.linkedFile(); assert(nf && drive.get(nf.id), 'nueva: se crea en Drive');
      // Sign out.
      await GD.signOut(); eq(GD.account(), null, 'cerrar sesión'); eq(GD.linkedFile(), null);
    } finally { W.fetch = realFetch; W.google = realGoogle; GD.setAutosaveDelay(4000); D.getElementById('home-screen')?.remove(); }
  });

  await test('colaborar con el servidor de Revela: pide la sesión de Google y, si falla, ofrece hacerlo directo', async () => {
    reset(); const W = frame.contentWindow, realFetch = W.fetch, realGoogle = W.google;
    W.localStorage.removeItem('revela.shareServer'); W.localStorage.setItem('revela.author', 'Ana');
    const SS = await W.eval("import('/src/io/cloud/shareserver.js')"), GD = await W.eval("import('/src/io/cloud/gdrive.js')");
    eq(SS.serverConfig().url, 'https://revela-share.fmesasc.workers.dev', 'el servidor de Revela viene de serie');
    W.google = { accounts: { oauth2: { initTokenClient: () => ({ requestAccessToken() { this.callback({ access_token: 'tokG', expires_in: 3600 }); } }), revoke: () => {} } } };
    const sent = [];
    W.fetch = async (url, o = {}) => { url = String(url); sent.push({ url, o });
      if (url.includes('/oauth2/v3/userinfo')) return new W.Response(JSON.stringify({ name: 'Ana', email: 'ana@example.org' }));
      if (url.endsWith('/c')) return new W.Response('{"error":"forbidden"}', { status: 403 });
      return realFetch(url, o); };
    try {
      await GD.signOut();
      D.querySelector('[data-action="collab"]').click(); await sleep(20);
      assert(/tu servidor/.test(D.querySelector('.dlg-msg').textContent), 'avisa de que va por el servidor'); D.querySelector('.dlg-ok').click(); await sleep(150);
      const c = sent.find(x => x.url === 'https://revela-share.fmesasc.workers.dev/c');
      assert(c && c.o.headers.Authorization === 'Bearer tokG', 'crea la sala con la sesión de Google');
      eq(GD.account()?.email, 'ana@example.org', 'e inicia sesión si no la había');
      const msg = D.querySelector('.dlg-msg')?.textContent || '';
      assert(/no tiene permiso/.test(msg) && /directamente entre navegadores/.test(msg), 'si el servidor no deja, ofrece hacerlo directo: ' + msg);
      D.querySelector('.dlg-cancel').click();
    } finally { W.fetch = realFetch; W.google = realGoogle; await GD.signOut(); }
  });
}
