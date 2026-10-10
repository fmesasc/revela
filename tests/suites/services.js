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

  await test('complementos de ejemplo (examples/complementos): agenda, palabras y numerar', async () => {
    reset(); const W = frame.contentWindow, base = W.location.origin + '/examples/complementos/';
    for (const f of ['agenda', 'palabras', 'numerar']) await R.api.addPlugin(base + f + '.js');
    const btn = id => D.querySelector(`#plugin-buttons [data-plugin="${id}"]`);
    assert(btn('agenda') && btn('palabras') && btn('numerar'), 'los tres botones en la cinta');
    // A deck with a cover and two titled slides.
    const A = W.Revela; A.slides.add(); A.slides.add();
    A.deck().slides.forEach((s, i) => { const t = s.blocks.find(b => b.ph === 'title'); if (t) A.update(t.id, { html: ['Portada', 'Objetivos', 'Resultados'][i] }); });
    R.store.commit(() => { R.state.deck.slides[1].notes = 'Uno dos tres cuatro cinco'; });
    btn('agenda').click(); await sleep(30);
    const ag = A.deck().slides[1], text = ag.blocks.map(b => b.html || '').join(' ');
    assert(/Agenda/.test(text) && /<li>Objetivos<\/li><li>Resultados<\/li>/.test(text), 'agenda tras la portada con los títulos: ' + text);
    eq(A.slides.count(), 4, 'una diapositiva más');
    btn('numerar').click(); await sleep(30);
    const nums = A.deck().slides.map(s => s.blocks.find(b => b.numerar)?.html || '');
    eq(nums.join(','), ',2 / 4,3 / 4,4 / 4', 'numeradas menos la portada');
    A.slides.goTo(3); A.slides.add(); btn('numerar').click(); await sleep(30);
    eq(A.deck().slides.map(s => s.blocks.filter(b => b.numerar).length).join(''), '01111', 'al repetir, actualiza sin duplicar');
    eq(A.deck().slides[1].blocks.find(b => b.numerar).html, '2 / 5', 'con el nuevo total');
    btn('palabras').click(); await sleep(30);
    const modal = [...D.querySelectorAll('.modal-backdrop .modal')].at(-1);
    assert(modal && /5 diapositivas/.test(modal.textContent) && /5 en las notas/.test(modal.textContent), 'palabras: ' + modal?.textContent);
    modal.closest('.modal-backdrop').querySelector('button')?.click(); await sleep(10);
    for (const f of ['agenda', 'palabras', 'numerar']) R.api.removePlugin(base + f + '.js');
  });

  await test('complementos de ejemplo: revisor (escucha los cambios) y wikimedia (busca en internet)', async () => {
    reset(); const W = frame.contentWindow, base = W.location.origin + '/examples/complementos/', A = W.Revela, realFetch = W.fetch;
    const btn = id => D.querySelector(`#plugin-buttons [data-plugin="${id}"]`), top = () => [...D.querySelectorAll('.modal-backdrop')].at(-1);
    try {
      await R.api.addPlugin(base + 'revisor.js');
      A.slides.add(); await sleep(650);
      assert(/Revisar \(1\)/.test(btn('revisor')?.textContent), 'revisor: la diapositiva sin título, contada: ' + btn('revisor')?.textContent);
      const t = A.deck().slides[1].blocks.find(b => b.ph === 'title'); A.update(t.id, { html: 'Objetivos' });
      assert(/Revisar \(1\)/.test(btn('revisor').textContent), 'revisor: no revisa a cada tecla');
      await sleep(650); assert(/Revisado/.test(btn('revisor').textContent), 'revisor: medio segundo después, revisado: ' + btn('revisor').textContent);
      A.add.text(Array(70).fill('palabra').join(' ')); await sleep(650);
      A.slides.goTo(0); btn('revisor').click(); await sleep(30);
      assert(/Diapositiva 2: tiene 71 palabras/.test(top()?.textContent), 'revisor: lo enumera: ' + top()?.textContent);
      top().querySelector('.dlg-ok').click(); await sleep(30); eq(A.slides.current(), 1, 'revisor: y lleva a la primera');
      // Wikimedia, con la respuesta de Commons simulada (nada sale a internet en las pruebas).
      let asked = '';
      W.fetch = async url => { asked = String(url); return new W.Response(JSON.stringify({ query: { pages: {
        '2': { index: 2, imageinfo: [{ mime: 'image/png', url: 'https://upload.example/b.png', thumburl: 'https://upload.example/b-1280.png', thumbwidth: 1280, thumbheight: 640, descriptionurl: 'https://commons.example/B', extmetadata: { Artist: { value: '<a href="x">Ana <b>Pérez</b></a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] },
        '1': { index: 1, imageinfo: [{ mime: 'image/svg+xml', url: 'https://upload.example/a.svg' }] } } } })); };
      await R.api.addPlugin(base + 'wikimedia.js');
      const n = A.deck().slides[1].blocks.length; btn('wikimedia').click(); await sleep(30);
      top().querySelector('.dlg-in').value = 'volcano'; top().querySelector('.dlg-ok').click(); await sleep(60);
      assert(/origin=\*/.test(asked) && /gsrsearch=volcano/.test(asked), 'wikimedia: la búsqueda, con CORS: ' + asked);
      const added = A.deck().slides[1].blocks.slice(n), img = added.find(b => b.type === 'image'), cap = added.find(b => b.type === 'text');
      assert(img?.src === 'https://upload.example/b-1280.png' && img.w === 800 && img.h === 400 && img.x === 240 && img.alt === 'volcano', 'wikimedia: la primera imagen de mapa de bits, a escala y centrada: ' + JSON.stringify(img));
      assert(/Ana Pérez · CC BY-SA 4\.0/.test(cap?.html) && /href="https:\/\/commons\.example\/B"/.test(cap.html) && cap.y === img.y + img.h + 8, 'wikimedia: con su autor y licencia debajo: ' + cap?.html);
    } finally { W.fetch = realFetch; for (const f of ['revisor', 'wikimedia']) R.api.removePlugin(base + f + '.js'); }
  });

  await test('aplicación de escritorio: menú nativo, Acerca de, guardar con el sistema y abrir lo que se abre con Revela (Tauri simulado)', async () => {
    reset(); const W = frame.contentWindow, DK = await W.eval("import('/src/ui/shell/desktop.js')"), ACT = await W.eval("import('/src/ui/ribbon/actions.js')");
    const click = W.HTMLAnchorElement.prototype.click, calls = [], made = [];
    let menu = null, opened = ['/home/ana/Clase 3.revela.json'], picked = [];
    const project = new TextEncoder().encode(JSON.stringify({ ...R.state.deck, name: 'Desde el escritorio' }));
    const mk = kind => ({ new: async o => { const x = { kind, ...o }; made.push(x); return x; } });
    const tauri = {
      core: { invoke: async (cmd, args, opts) => { calls.push({ cmd, args, opts });
        if (cmd === 'opened_files') return opened.splice(0);
        if (cmd === 'read_opened') return project.buffer.slice(0);
        if (cmd === 'save_file') return '/home/ana/' + decodeURIComponent(opts.headers['x-name']);
        if (cmd === 'update_available') return null;
        if (cmd === 'pick_files') return picked.splice(0); } },
      menu: { Menu: { new: async o => ({ ...o, setAsAppMenu: async () => { menu = o; } }) }, Submenu: mk('sub'), MenuItem: mk('item'), PredefinedMenuItem: mk('pre'), CheckMenuItem: mk('check') },
      app: { getVersion: async () => '9.9.9', defaultWindowIcon: async () => null },
      event: { listen: async () => () => {} }, opener: { openUrl: async u => calls.push({ open: u }) },
    };
    try {
      assert(await DK.initDesktop({ tauri, updates: false }), 'arranca con Tauri');
      // The file it was opened with: open, as if dropped.
      for (let i = 0; i < 40 && R.state.deck.name !== 'Desde el escritorio'; i++) await sleep(25);
      eq(R.state.deck.name, 'Desde el escritorio', 'abre el archivo con el que se abrió Revela');
      assert(calls.some(c => c.cmd === 'read_opened' && c.args.path === '/home/ana/Clase 3.revela.json'), 'lo pide por su ruta');
      // The menu bar, in the interface's language; every item does something that exists.
      eq(menu.items.map(s => s.text).join(','), 'Archivo,Editar,Ver,Insertar,Ayuda', 'los menús');
      const ids = []; const walk = l => l.forEach(x => (x === '-' ? 0 : Array.isArray(x[1]) ? walk(x[1]) : ids.push(x[1]))); walk(DK.MENU.map(m => [m[0], m[1]]));
      const missing = ids.filter(id => !id.startsWith('desk:') && !ACT.ACTIONS[id]); assert(!missing.length, 'acciones que no existen: ' + missing);
      const about = made.find(x => x.kind === 'pre' && x.item?.About);
      assert(about?.item.About.version === '9.9.9' && about.text === 'Acerca de Revela' && menu.items.at(-1).items.includes(about), 'Acerca de, con la versión, en Ayuda');
      assert(!made.some(x => x.kind === 'item' && x.accelerator), 'sin atajos propios: los maneja el editor');
      const n = R.state.deck.slides.length; made.find(x => x.kind === 'item' && x.text === 'Nueva diapositiva').action(); await sleep(30);
      eq(R.state.deck.slides.length, n + 1, 'un elemento del menú hace su acción');
      made.find(x => x.kind === 'item' && x.text === 'Guías en vídeo').action(); assert(calls.some(c => /\/guides$/.test(c.open || '')), 'las guías, en el navegador');
      // The bar, hidden until Alt (alone: not Alt+Q), as in Firefox; a click hides it; «always» keeps it.
      try { W.localStorage.removeItem('revela.menubar'); } catch {}
      const bars = () => calls.filter(c => c.cmd === 'menu_bar').map(c => c.args.show);
      const key = (type, k) => D.dispatchEvent(new W.KeyboardEvent(type, { key: k, bubbles: true }));
      calls.length = 0; key('keydown', 'Alt'); key('keyup', 'Alt'); await sleep(10);
      eq(bars().join(), 'true', 'Alt la muestra');
      D.body.dispatchEvent(new W.PointerEvent('pointerdown', { bubbles: true })); await sleep(10); eq(bars().join(), 'true,false', 'un clic la oculta');
      key('keydown', 'Alt'); key('keydown', 'q'); key('keyup', 'q'); key('keyup', 'Alt'); await sleep(10); eq(bars().join(), 'true,false', 'Alt+Q no');
      const pin = made.find(x => x.kind === 'check' && x.text === 'Mostrar siempre la barra de menús'); assert(pin && pin.checked === false, 'la opción, en Ver');
      pin.action(); await sleep(30); eq(bars().at(-1), true, 'siempre visible');
      D.body.dispatchEvent(new W.PointerEvent('pointerdown', { bubbles: true })); await sleep(10); eq(bars().at(-1), true, 'y un clic ya no la oculta');
      try { W.localStorage.removeItem('revela.menubar'); } catch {}
      // A download: the system's «Save as», with its bytes and name.
      const a = D.createElement('a'); a.href = W.URL.createObjectURL(new W.Blob(['uno,dos'], { type: 'text/csv' })); a.download = 'votación.csv'; a.click();
      for (let i = 0; i < 40 && !calls.some(c => c.cmd === 'save_file'); i++) await sleep(25);
      const sv = calls.find(c => c.cmd === 'save_file');
      assert(sv && new TextDecoder().decode(sv.args) === 'uno,dos' && decodeURIComponent(sv.opts.headers['x-name']) === 'votación.csv', 'guardar: los bytes y el nombre, al sistema');
      await sleep(30); assert(/Guardado en \/home\/ana\/votación\.csv/.test(D.body.textContent), 'y dice dónde');
      // Choosing a file: the system's «Open», with the input's types (WebKitGTK's own hid .pptx); what is chosen,
      // in the input, as on the web.
      eq(JSON.stringify(DK.filtersOf('.pptx,.odp,image/*,application/json')), JSON.stringify([['Archivos compatibles', ['pptx', 'odp', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'json']], ['Todos los archivos', ['*']]]), 'los tipos del selector');
      picked.push('/home/ana/foto.png'); calls.length = 0;
      const inp = D.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; let got = null; inp.onchange = () => { got = inp.files[0]; }; inp.click();
      for (let i = 0; i < 40 && !got; i++) await sleep(25);
      assert(got?.name === 'foto.png' && got.type === 'image/png' && got.size === project.length, 'el archivo elegido, en el campo: ' + got?.name + ' ' + got?.type);
      assert(calls[0].cmd === 'pick_files' && calls[0].args.multiple === false && calls[0].args.filters[0][1].includes('png'), 'con sus tipos');
      picked.push('/home/ana/a.csv'); got = null;
      const lab = D.createElement('label'), in2 = D.createElement('input'); in2.type = 'file'; in2.hidden = true; lab.append('Elegir', in2); D.body.append(lab);
      in2.onchange = () => { got = in2.files[0]; }; lab.click();
      for (let i = 0; i < 40 && !got; i++) await sleep(25); lab.remove();
      eq(got?.name, 'a.csv', 'también desde su etiqueta');
      // A PDF opened with Revela: a presentation of its pages (and no «Open» dialog on the way).
      const pdfText = (() => { const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Contents 4 0 R >>', null];
        const c = '1 0 0 rg 20 20 360 260 re f'; objs[3] = `<< /Length ${c.length} >>\nstream\n${c}\nendstream`;
        let out = '%PDF-1.4\n'; const offs = []; objs.forEach((o, k) => { offs.push(out.length); out += `${k + 1} 0 obj\n${o}\nendobj\n`; });
        const x = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
        return out + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`; })();
      reset(); calls.length = 0; opened.push('/home/ana/informe.pdf'); const pdfBytes = new TextEncoder().encode(pdfText);
      tauri.core.invoke = async (cmd, args, opts) => { calls.push({ cmd, args, opts, stack: new Error().stack }); if (cmd === 'opened_files') return opened.splice(0); if (cmd === 'read_opened') return pdfBytes.buffer.slice(0); if (cmd === 'pick_files') return []; };
      W.dispatchEvent(new W.Event('focus')); await DK.openGivenForTests();
      for (let i = 0; i < 80 && R.state.deck.name !== 'informe'; i++) await sleep(25);
      eq(R.state.deck.name + ' ' + R.state.deck.slides.length, 'informe 1', 'un PDF abierto con Revela: sus páginas');
      assert(!calls.some(c => c.cmd === 'pick_files'), 'sin abrir el selector: ' + calls.filter(c => c.cmd === 'pick_files').map(c => c.stack).join('\n'));
    } finally { DK.stopDesktop(); }
    eq(W.HTMLAnchorElement.prototype.click, click, 'y se puede deshacer (las pruebas)');
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
    // (The edited slide's thumbnail is rebuilt after the frame is painted — or when idle, on a busy page: wait for it.)
    R.flushThumbs?.(); await sleep(10);
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

  await test('OneDrive como Drive: carpetas, guardar (y que se guarde solo), cambios en otro sitio, copias PDF y abrir', async () => {
    reset(); const W = frame.contentWindow, realFetch = W.fetch, realOpen = W.open, calls = [];
    const OC = await W.eval("import('/src/io/cloud/othercloud.js')"), OD = await W.eval("import('/src/io/cloud/onedrive.js')");
    const G = 'https://graph.microsoft.com/v1.0/me/drive';
    const files = { f1: { name: 'Vieja.revela.json', eTag: '"v1"', parent: 'root', body: JSON.stringify({ slides: [{ id: 'o1', blocks: [] }, { id: 'o2', blocks: [] }], size: { w: 1280, h: 720 } }) } };
    let n = 0;
    const popup = { location: { href: '' }, closed: false }; W.open = () => popup;
    W.fetch = async (url, o = {}) => {
      const u = decodeURIComponent(String(url)), h = o.headers || {}, m = o.method || 'GET'; calls.push({ u, m, h });
      const json = (v, st = 200) => new W.Response(JSON.stringify(v), { status: st, headers: { 'Content-Type': 'application/json' } });
      if (u.endsWith('/oauth2/v2.0/token')) return json({ access_token: 'tokOD', expires_in: 3600 });
      if (h.Authorization !== 'Bearer tokOD') return json({}, 401);
      if (u.startsWith(G + '/root?')) return json({ id: 'root', name: 'root' });
      if (u.startsWith(G + '/items/fC?')) return json({ id: 'fC', name: 'Clases', parentReference: { path: '/drive/root:' } });
      if (u.startsWith(G + '/items/root/children')) return json({ value: [{ id: 'fC', name: 'Clases', folder: {} }, { id: 'f1', name: 'Vieja.revela.json', file: {}, eTag: files.f1.eTag }, { id: 'x', name: 'notas.txt', file: {} }] });
      if (u.startsWith(G + '/items/fC/children')) return json({ value: [{ id: 'p1', name: 'Charla.pptx', file: {} }] });
      let mm = /\/items\/(\w+):\/(.+):\/content$/.exec(u);
      if (mm && m === 'PUT') { const id = 'n' + (++n); files[id] = { name: mm[2], eTag: '"e1"', parent: mm[1], body: await new W.Response(o.body).text(), type: h['Content-Type'] }; return json({ id, name: mm[2], eTag: '"e1"', parentReference: { id: mm[1] } }); }
      mm = /\/items\/(\w+)\/content$/.exec(u);
      if (mm && m === 'PUT') { const f = files[mm[1]]; if (h['If-Match'] && h['If-Match'] !== f.eTag) return json({}, 412); f.body = await new W.Response(o.body).text(); f.eTag = '"e' + (+f.eTag.replace(/\D/g, '') + 1) + '"'; return json({ id: mm[1], name: f.name, eTag: f.eTag }); }
      if (mm) return new W.Response(files[mm[1]].body);
      mm = /\/items\/(\w+)\?\$select=id,name,eTag/.exec(u);
      if (mm) return json({ id: mm[1], name: files[mm[1]].name, eTag: files[mm[1]].eTag, parentReference: { id: files[mm[1]].parent } });
      return json({}, 404);
    };
    const act = a => R.ribbon?.ACTIONS?.[a]?.() ?? (W.eval(`import('/src/ui/ribbon/actions.js')`).then(x => x.ACTIONS[a]()));
    const until = async (f, ms = 3000) => { for (let i = 0; i < ms / 20 && !f(); i++) await sleep(20); };
    try {
      OD.setOneDriveDelay(60);
      // Save: connect, choose a folder, the presentation itself.
      await act('onedrive-save'); await sleep(30);
      const modal = () => D.getElementById('od-modal');
      modal().querySelector('.od-connect').click();
      for (let i = 0; i < 50 && !popup.location.href; i++) await sleep(10);
      const q = new URL(popup.location.href);
      W.localStorage.setItem('revela.auth', JSON.stringify({ query: '?code=C9&state=' + q.searchParams.get('state') }));
      await until(() => modal()?.querySelector('.od-item'));
      eq([...modal().querySelectorAll('.od-item b')].map(b => b.textContent).join(), 'Clases,Vieja', 'carpetas primero; solo lo que se puede usar (no el .txt)');
      modal().querySelector('.od-item').click(); await until(() => /Clases/.test(modal().querySelector('.od-trail').textContent));
      assert(/OneDrive.*Clases/.test(modal().querySelector('.od-trail').textContent), 'dentro de la carpeta, con el camino');
      modal().querySelector('.od-name').value = 'Mi charla'; modal().querySelector('.od-go').click();
      await until(() => !modal());
      const n1 = files.n1; assert(n1 && n1.name === 'Mi charla.revela.json' && n1.parent === 'fC' && JSON.parse(n1.body).slides, 'guardada en esa carpeta');
      eq(OD.linkedOneDrive()?.id, 'n1', 'y enlazada');
      await until(() => !D.getElementById('onedrive-status').hidden);
      assert(/OneDrive · Guardado/.test(D.getElementById('onedrive-status').textContent) && D.getElementById('save-state').hidden, 'su estado junto al nombre (en lugar de «En este navegador»)');
      // It saves itself a moment after each change, without stepping on a change made elsewhere.
      R.store.commit(() => { slide().blocks[0].html = 'Cambio 1'; });
      await until(() => calls.some(c => c.m === 'PUT' && c.u.endsWith('/items/n1/content')));
      const put1 = calls.find(c => c.m === 'PUT' && c.u.endsWith('/items/n1/content'));
      eq(put1.h['If-Match'], '"e1"', 'con la versión que tenía'); await until(() => OD.oneDriveStatus() === 'saved');
      assert(/Cambio 1/.test(files.n1.body), 'se ha guardado solo');
      files.n1.eTag = '"e9"';                                        // (someone changed it on another device)
      R.store.commit(() => { slide().blocks[0].html = 'Cambio 2'; });
      await until(() => OD.oneDriveStatus() === 'conflict');
      eq(OD.oneDriveStatus(), 'conflict', 'cambió en otro sitio: no se pisa'); assert(!/Cambio 2/.test(files.n1.body), 'lo de allí sigue');
      assert(/Cambió en otro sitio/.test(D.getElementById('onedrive-status').textContent), 'y lo dice');
      await OD.saveOneDriveNow({ force: true }); assert(/Cambio 2/.test(files.n1.body), '«Guardar la mía», si se elige');
      // A PDF copy, which OneDrive shows with all its pages: the presentation stays linked to its file.
      await act('onedrive-save'); await until(() => modal()?.querySelector('.od-item'));
      modal().querySelector('[name="od-fmt"][value="pdf"]').checked = true; modal().querySelector('.od-go').click();
      await until(() => !modal(), 20000);
      const pdf = Object.values(files).find(f => /\.pdf$/.test(f.name)); assert(pdf && pdf.type === 'application/pdf', 'copia en PDF');
      eq(OD.linkedOneDrive()?.id, 'n1', 'la presentación sigue enlazada a su archivo');
      // Open: any folder; a Revela file opens linked.
      await act('cloud-onedrive'); await until(() => modal()?.querySelector('.od-item'));
      [...modal().querySelectorAll('.od-item')].find(b => /Vieja/.test(b.textContent)).click(); await sleep(30);
      D.querySelector('.modal-backdrop .dlg-ok')?.click(); await until(() => !modal());
      eq(R.state.deck.slides.length, 2, 'abierta desde OneDrive'); eq(OD.linkedOneDrive()?.id, 'f1', 'y enlazada a su archivo');
    } finally { W.fetch = realFetch; W.open = realOpen; OC.signOutCloud('onedrive'); OD.unlinkOneDrive(); OD.setOneDriveDelay(4000); D.getElementById('od-modal')?.remove(); D.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); }
  });

  await test('Dropbox y OneDrive: configurar la app, iniciar sesión (PKCE), guardar, listar y abrir (servicios simulados)', async () => {
    reset(); const W = frame.contentWindow, OC = await W.eval("import('/src/io/cloud/othercloud.js')"), realFetch = W.fetch, realOpen = W.open, calls = [];
    W.localStorage.removeItem('revela.cloudKeys');
    // (Revela's own Dropbox app aside: this test is about someone's own app.)
    const CFG = await W.eval("import('/src/core/config.js')"), official = CFG.CLOUD_KEYS.dropbox;
    assert(official && OC.cloudKey('dropbox') === official, 'la app de Revela en Dropbox, sin configurar nada');
    CFG.CLOUD_KEYS.dropbox = '';
    try {
      // Without an app: how to register one, and where to write its identifier.
      D.querySelector('[data-action="cloud-dropbox"]').click(); await sleep(20);
      const m = () => D.getElementById('oc-modal');
      assert(/\/auth\.html$/.test(m().querySelector('.oc-redirect').value), 'la dirección de redirección, para registrarla');
      m().querySelector('.oc-key').value = 'dbkey123'; m().querySelector('.oc-save-key').click(); await sleep(10);
      eq(OC.cloudKey('dropbox'), 'dbkey123', 'guardada en este navegador');
      // Sign-in: the service's page in a window; auth.html answers with the code.
      const popup = { location: { href: '' }, closed: false };
      W.open = () => popup;
      const saved = { '/lecciones.revela.json': JSON.stringify({ slides: [{ id: 's1', blocks: [] }, { id: 's2', blocks: [] }], size: { w: 1280, h: 720 } }) };
      W.fetch = async (url, o = {}) => {
        const u = String(url), h = o.headers || {}; calls.push({ u, o });
        const json = (v, st = 200) => new W.Response(JSON.stringify(v), { status: st, headers: { 'Content-Type': 'application/json' } });
        if (u === 'https://api.dropboxapi.com/oauth2/token') return json({ access_token: 'tokDB', expires_in: 14400 });
        if (h.Authorization !== 'Bearer tokDB') return json({}, 401);
        if (u.endsWith('/files/list_folder')) return json({ entries: [{ '.tag': 'file', name: 'lecciones.revela.json', path_lower: '/lecciones.revela.json', server_modified: '2026-09-01T10:00:00Z' }, { '.tag': 'file', name: 'foto.jpg', path_lower: '/foto.jpg' }] });
        if (u.endsWith('/files/upload')) { const a = JSON.parse(h['Dropbox-API-Arg']); saved[a.path.toLowerCase()] = await new W.Response(o.body).text(); return json({ path_lower: a.path.toLowerCase(), name: a.path.slice(1) }); }
        if (u.endsWith('/files/download')) return new W.Response(saved[JSON.parse(h['Dropbox-API-Arg']).path]);
        return json({}, 404);
      };
      m().querySelector('.oc-connect').click();
      for (let i = 0; i < 50 && !popup.location.href; i++) await sleep(10);
      const q = new URL(popup.location.href);
      eq(q.origin + q.pathname, 'https://www.dropbox.com/oauth2/authorize', 'la página de Dropbox');
      eq(q.searchParams.get('code_challenge_method'), 'S256'); eq(q.searchParams.get('client_id'), 'dbkey123');
      assert(!q.searchParams.get('client_secret'), 'sin secreto');
      W.postMessage({ type: 'revela-auth', query: '?code=CODE1&state=' + q.searchParams.get('state') }, W.location.origin);
      for (let i = 0; i < 80 && !m().querySelector('.oc-files'); i++) await sleep(20);
      const tok = calls.find(c => c.u.endsWith('/oauth2/token')), form = new URLSearchParams(String(tok.o.body));
      eq(form.get('code'), 'CODE1'); assert(form.get('code_verifier')?.length > 40, 'con su verificador PKCE');
      const OA = await W.eval("import('/src/io/cloud/oauth.js')");
      eq(await OA.challengeOf(form.get('code_verifier')), q.searchParams.get('code_challenge'), 'el reto es el SHA-256 del verificador');
      eq(m().querySelectorAll('.oc-files li').length, 1, 'solo las presentaciones de Revela');
      // Save: an upload with a header-safe name.
      R.store.commit(() => { R.state.deck.name = 'Química básica'; });
      m().querySelector('.oc-save').click(); await sleep(60);
      const up = calls.find(c => c.u.endsWith('/files/upload'));
      assert(up && /\\u00ed/.test(up.o.headers['Dropbox-API-Arg']) && /"mode":"overwrite"/.test(up.o.headers['Dropbox-API-Arg']), 'nombre con tildes escapadas: ' + up?.o.headers['Dropbox-API-Arg']);
      assert(JSON.parse(saved['/química básica.revela.json']).slides, 'la presentación guardada');
      // Open one.
      m().querySelector('.oc-files [data-i]').click(); await sleep(20);
      D.querySelector('.dlg-ok')?.click(); await sleep(60);
      eq(R.state.deck.slides.length, 2, 'abierta desde Dropbox'); assert(!m(), 'y el cuadro cerrado');
      // OneDrive: no folder yet = nothing saved; a big presentation goes up in pieces.
      OC.setOwnKey('onedrive', 'ms-app-id');
      popup.location.href = ''; calls.length = 0;
      const pieces = [];
      W.fetch = async (url, o = {}) => {
        const u = String(url), h = o.headers || {}; calls.push({ u, o });
        const json = (v, st = 200) => new W.Response(JSON.stringify(v), { status: st, headers: { 'Content-Type': 'application/json' } });
        if (u.endsWith('/oauth2/v2.0/token')) return json({ access_token: 'tokMS', expires_in: 3600 });
        if (u.startsWith('https://upload.example/')) { pieces.push(h['Content-Range']); return json({ id: 'F1', name: 'x.revela.json' }); }
        if (h.Authorization !== 'Bearer tokMS') return json({}, 401);
        if (u.includes('/root:/Revela:/children')) return json({ error: {} }, 404);
        if (u.endsWith(':/createUploadSession')) return json({ uploadUrl: 'https://upload.example/s1' });
        return json({}, 404);
      };
      const p = OC.connect('onedrive');
      for (let i = 0; i < 50 && !popup.location.href; i++) await sleep(10);
      const q2 = new URL(popup.location.href);
      eq(q2.origin + q2.pathname, 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', 'la página de Microsoft'); eq(q2.searchParams.get('scope'), 'Files.ReadWrite');
      W.localStorage.setItem('revela.auth', JSON.stringify({ query: '?code=C2&state=' + q2.searchParams.get('state') }));   // (as auth.html leaves it when it cannot message)
      await p; assert(OC.signedIn('onedrive'), 'sesión iniciada');
      eq((await OC.listCloud('onedrive')).length, 0, 'sin carpeta todavía: nada');
      R.store.commit(() => { R.state.deck.notesBig = 'x'.repeat(4.2e6); });
      await OC.saveToCloud('onedrive');
      eq(pieces.length, 2, 'grande: en dos trozos'); assert(/^bytes 0-3276799\//.test(pieces[0]), 'trozos de 320 KiB × 10: ' + pieces[0]);
      assert(!calls.find(c => c.u.startsWith('https://upload.example/')).o.headers.Authorization, 'sin el token en la dirección de subida');
    } finally { CFG.CLOUD_KEYS.dropbox = official; W.fetch = realFetch; W.open = realOpen; W.localStorage.removeItem('revela.cloudKeys'); OC.signOutCloud('dropbox'); OC.signOutCloud('onedrive'); D.getElementById('oc-modal')?.remove(); }
  });

  await test('«Abrir con Revela» desde Drive y Dropbox: ver o editar; Drive guarda con su tipo propio', async () => {
    reset(); const W = frame.contentWindow, OW = await W.eval("import('/src/ui/shell/openwith.js')"), OC = await W.eval("import('/src/io/cloud/othercloud.js')");
    // What Drive and Dropbox send.
    const st = JSON.stringify({ ids: ['1AbC'], action: 'open', userId: '123' });
    eq(JSON.stringify(OW.openRequest('?state=' + encodeURIComponent(st))), JSON.stringify({ service: 'drive', action: 'open', id: '1AbC', user: '123' }));
    eq(OW.openRequest('?state=' + encodeURIComponent(JSON.stringify({ action: 'create', folderId: 'F1', userId: '1' }))).folder, 'F1', 'nuevo, en su carpeta');
    eq(OW.openRequest('?dropbox&file_id=id:XyZ').id, 'id:XyZ'); eq(OW.openRequest('?state=basura'), null); eq(OW.openRequest(''), null);
    const G = await W.eval("import('/src/io/cloud/gdrive.js')"); assert(typeof G.setNewFileFolder === 'function', 'carpeta para lo nuevo');
    const src = await (await W.fetch('/src/io/cloud/gdrive.js')).text();
    assert(/application\/vnd\.revela\+json/.test(src) && /auth\/drive\.install/.test(src), 'tipo propio y permiso para aparecer en «Abrir con»');
    // Dropbox, full access: ask, sign in, download by its id, open to edit.
    OC.setOwnKey('dropbox', 'k1'); OC.setDropboxFull(true);
    const realFetch = W.fetch, realOpen = W.open, popup = { location: { href: '' }, closed: false }, calls = [];
    W.open = () => popup;
    W.fetch = async (url, o = {}) => {
      const u = String(url), h = o.headers || {}; calls.push({ u, h, body: o.body });
      const json = (v, stt = 200) => new W.Response(JSON.stringify(v), { status: stt });
      if (u.endsWith('/oauth2/token')) return json({ access_token: 'T', expires_in: 3600 });
      if (u.endsWith('/files/download')) return new W.Response(JSON.stringify({ name: 'Desde Dropbox', size: { w: 1280, h: 720 }, slides: [{ id: 'a', blocks: [] }, { id: 'b', blocks: [] }, { id: 'c', blocks: [] }] }));
      if (u.endsWith('/files/list_folder')) return json({ error_summary: 'path/not_found/' }, 409);
      return json({}, 404);
    };
    try {
      const p = OW.handleOpenWith({ service: 'dropbox', action: 'open', id: 'id:XyZ' }); await sleep(20);
      assert(D.getElementById('openwith-modal'), 'pregunta si ver o editar');
      D.querySelector('#openwith-modal [data-how="edit"]').click();
      for (let i = 0; i < 50 && !popup.location.href; i++) await sleep(10);
      const q = new URL(popup.location.href);
      W.postMessage({ type: 'revela-auth', query: '?code=C&state=' + q.searchParams.get('state') }, W.location.origin);
      eq(await p, true); eq(R.state.deck.slides.length, 3, 'abierta'); eq(R.state.deck.name, 'Desde Dropbox');
      eq(JSON.parse(calls.find(c => c.u.endsWith('/files/download')).h['Dropbox-API-Arg']).path, 'id:XyZ', 'por su id de Dropbox');
      assert(/files\.metadata\.read/.test(q.searchParams.get('scope')), 'con el permiso que piden las extensiones');
      eq((await OC.listCloud('dropbox')).length, 0, 'sin carpeta Revela todavía: nada');
      eq(JSON.parse(calls.find(c => c.u.endsWith('/files/list_folder')).body).path, '/Revela', 'con acceso completo, la carpeta Revela');
    } finally { W.fetch = realFetch; W.open = realOpen; OC.setDropboxFull(false); OC.setOwnKey('dropbox', ''); OC.signOutCloud('dropbox'); D.getElementById('openwith-modal')?.remove(); }
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
      // Adapted to a reading level: the slides' texts, never the notes; only the chosen ones.
      calls.length = 0; const sys = () => calls.at(-1).body.messages[0].content, first = R.state.deck.slides[0];
      R.slides.addSlide('blank');
      const n2 = await AI.levelDeck('early', { slides: [first] });
      assert(/children aged 6 to 8/.test(sys()) && /add no new facts/.test(sys()) && /Keep the language/.test(sys()), 'nivel de lectura: lo pide para esa edad, sin datos nuevos y en el mismo idioma');
      eq(first.notes, 'Nota', 'nivel de lectura: las notas no se tocan');
      assert(n2 >= 1 && !('notes|' + first.id in JSON.parse(calls.at(-1).body.messages[1].content)), 'nivel de lectura: no manda las notas');
      eq(calls.length, 1, 'nivel de lectura: solo la diapositiva elegida');
      const id0 = first.blocks[0].id; calls.length = 0;
      await AI.levelDeck('easy', { only: [id0] });
      eq(Object.keys(JSON.parse(calls.at(-1).body.messages[1].content)).join(), id0, 'nivel de lectura: solo los textos seleccionados');
      assert(/Easy-to-Read/.test(sys()), 'lectura fácil: con sus pautas');
      R.slides.goToSlide(0); D.querySelector('[data-action="ai-level"]').click(); await sleep(20);
      const lv = D.getElementById('level-modal'); assert(lv && lv.querySelectorAll('.lv-level option').length === 6, 'el diálogo: seis niveles');
      lv.querySelector('.modal-close').click();
    } finally { W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('IA: editar una imagen (borrar algo, más resolución, ampliar por los bordes; simulado)', async () => {
    reset(); const W = frame.contentWindow, AI = R.ai, realFetch = W.fetch, calls = [];
    AI.setAiKey('sk-or-prueba'); AI.acceptPrivacy();
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mP8z8DwnwEIGGEMAFkUAf+1yc3bAAAAAElFTkSuQmCC';
    R.blocks.addImage(PNG); await sleep(20); const b = last(); R.store.commit(() => { b.x = 1000; b.y = 300; b.w = 200; b.h = 100; b.crop = [0.1, 0, 0, 0]; });
    W.fetch = async (url, opts) => { const body = JSON.parse(opts.body); calls.push({ url, body });
      return new W.Response(JSON.stringify({ data: [{ b64_json: 'R0lGODlhAQABAAAAACw=', media_type: 'image/gif' }] })); };
    try {
      await AI.editImage(b, 'erase', { what: 'the red cable' });
      const c = calls.at(-1); assert(/\/images$/.test(c.url) && /Remove the red cable/.test(c.body.prompt) && /^data:image\/jpeg;base64,/.test(c.body.input_references[0].image_url.url), 'borrar: la imagen va de referencia, con lo que hay que borrar');
      eq(c.body.aspect_ratio, '2:1', 'con su misma forma (la más cercana)');
      eq(b.src, 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', 'la imagen cambia'); assert(!b.crop, 'sin el recorte de antes'); eq(b.w + 'x' + b.h, '200x100', 'en su sitio');
      const live = () => R.state.deck.slides[R.state.ui.slideIndex].blocks.find(x => x.id === b.id);
      R.store.undo(); eq(live().src, PNG, 'un paso para deshacerlo');
      await AI.editImage(live(), 'expand', { aspect: '16:9' });
      eq(calls.at(-1).body.aspect_ratio, '16:9', 'ampliar: a la forma pedida'); assert(/Extend this image/.test(calls.at(-1).body.prompt), 'ampliar: continuar la escena');
      const x = live(); eq(Math.round(x.w / x.h * 9), 16, 'la caja toma la nueva forma'); assert(x.x + x.w <= R.state.deck.size.w && x.x >= 0, 'sin salirse de la diapositiva');
      await AI.editImage(live(), 'upscale'); assert(/higher resolution/.test(calls.at(-1).body.prompt), 'más resolución');
      select(live()); await sleep(20);
      W.eval("import('/src/ui/dialogs/imageai.js')").then(m => m.openImageAI(live())); for (let i = 0; i < 40 && !D.getElementById('imgai-modal'); i++) await sleep(25);
      const m = D.getElementById('imgai-modal'); assert(m && m.querySelectorAll('input[name="ia-kind"]').length === 5, 'el diálogo: cinco arreglos');
      m.querySelector('.ia-ok').click(); assert(D.getElementById('imgai-modal'), 'borrar sin decir qué: no sigue');
      m.querySelector('input[value="expand"]').click(); assert(!m.querySelector('.ia-shape-l').hidden && m.querySelector('.ia-what-l').hidden, 'ampliar: pide la forma, no el qué');
      m.querySelector('.modal-close').click();
    } finally { W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('IA: ensayar las preguntas del público (prevé preguntas y valora la respuesta; simulado)', async () => {
    reset(); const W = frame.contentWindow, AI = R.ai, realFetch = W.fetch, sent = [];
    AI.setAiKey('sk-or-prueba'); AI.acceptPrivacy();
    slide().blocks[0].html = 'Energía solar en el instituto'; slide().notes = 'Ahorro del 30 % en la factura';
    W.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body), sys = body.messages[0].content; sent.push(body);
      const reply = /questions after their talk/.test(sys)
        ? { questions: [{ q: '¿Cuánto cuesta instalarlo?', kind: 'practical', points: ['Precio', 'Años para amortizarlo'], slide: 1 }, { q: '¿Y si está nublado?', kind: 'critical', points: ['Baterías'], slide: 9 }, { q: '', kind: 'x' }] }
        : { score: 6, good: 'Diste una cifra.', improve: 'Di en cuántos años se amortiza.', better: 'Unos 20.000 €, que se recuperan en seis años.' };
      return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }));
    };
    try {
      D.querySelector('[data-action="ai-qa"]').click(); for (let i = 0; i < 40 && !D.getElementById('qa-modal'); i++) await sleep(25);
      const m = D.getElementById('qa-modal'); assert(m, 'el diálogo');
      m.querySelector('.qa-go').click(); for (let i = 0; i < 40 && !m.querySelector('.qa-q'); i++) await sleep(25);
      assert(/Energía solar/.test(sent[0].messages[1].content) && /Ahorro del 30/.test(sent[0].messages[1].content), 'la IA lee las diapositivas y las notas');
      eq(m.querySelectorAll('.qa-q').length, 2, 'las preguntas previstas (sin las vacías)');
      assert(/Crítica/.test(m.querySelectorAll('.qa-q')[1].textContent), 'con su tipo (también las críticas)');
      const qs = await (await W.eval("import('/src/features/ai/authoring.js')")).predictQuestions(); assert(qs[1].slide >= 1 && qs[1].slide <= R.state.deck.slides.length, 'el número de diapositiva, dentro de la presentación');
      m.querySelectorAll('.qa-q')[0].click(); await sleep(20);
      assert(/Años para amortizarlo/.test(m.querySelector('.qa-practice details').textContent), 'lo que debe tener una buena respuesta, plegado');
      m.querySelector('.qa-judge').click(); await sleep(20);
      assert(/Primero responde/.test(m.querySelector('.qa-verdict').textContent), 'sin respuesta, lo pide');
      m.querySelector('.qa-answer').value = 'Eh, pues unos veinte mil euros.'; m.querySelector('.qa-judge').click();
      for (let i = 0; i < 40 && !m.querySelector('.qa-score'); i++) await sleep(25);
      assert(/6\/10/.test(m.querySelector('.qa-score').textContent) && /amortiza/.test(m.querySelector('.qa-verdict').textContent), 'la nota, qué mejorar y una respuesta mejor');
      assert(/veinte mil euros/.test(sent.at(-1).messages[1].content) && /Precio/.test(sent.at(-1).messages[1].content), 'valora la respuesta frente a sus puntos clave');
      m.querySelector('.modal-close').click();
    } finally { W.fetch = realFetch; AI.disconnectAi(); }
  });

  await test('IA: plan de clase y guía de estudio desde la presentación (copiar, descargar, a las notas, como diapositivas; simulado)', async () => {
    reset(); const W = frame.contentWindow, AI = R.ai, realFetch = W.fetch, sent = [], saved = [], click = W.HTMLAnchorElement.prototype.click;
    AI.setAiKey('sk-or-prueba'); AI.acceptPrivacy();
    R.slides.addSlide(); R.slides.addSlide();
    R.store.commit(() => {
      const [a, b, c] = R.state.deck.slides;
      a.blocks[0].html = 'La fotosíntesis'; a.notes = 'Empezar con una planta';
      b.blocks[0].html = 'Clorofila y luz';
      c.blocks = [{ id: 'q1', type: 'poll', kind: 'quiz', question: '¿Qué gas sueltan las plantas?', options: ['CO2', 'Oxígeno'], correct: [1], x: 0, y: 0, w: 100, h: 100 }];
      R.state.ui.slideIndex = 0;
    });
    const plan = { title: 'La fotosíntesis', objectives: ['Explicar la fotosíntesis'], competences: ['Interpretar fenómenos naturales'], prior: ['Partes de la planta'], contents: ['Nutrición vegetal'],
      sections: [{ name: 'Inicio', minutes: 10, slides: [1, 99], teacher: 'Pregunta qué comen las plantas', pupils: 'Responden <en voz alta>' }, { name: 'Práctica', minutes: 45, slides: [3], teacher: 'Lanza el cuestionario', pupils: 'Responden' }, { name: '' }],
      activities: [{ name: 'Experimento', text: 'Hoja en agua al sol' }], diversity: ['Pictogramas'], criteria: ['Explica el proceso'], instruments: ['Cuestionario'], materials: ['Una planta'] };
    const guide = { title: 'Guía', summary: ['Las plantas hacen su alimento con la luz.'], terms: [{ term: 'Clorofila', def: 'Pigmento verde' }], questions: [{ q: '¿Qué necesita?', a: 'Luz, agua y CO2' }, { q: '' }] };
    W.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body), sys = body.messages[0].content; sent.push(body);
      return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(/lesson plan/.test(sys) ? plan : guide) } }] }));
    };
    W.HTMLAnchorElement.prototype.click = function () { saved.push(this.download); };
    try {
      D.querySelector('[data-action="ai-lessonplan"]').click(); for (let i = 0; i < 40 && !D.getElementById('lp-modal'); i++) await sleep(25);
      const m = D.getElementById('lp-modal'); assert(m, 'el diálogo');
      m.querySelector('.lp-level').value = '6.º de primaria'; m.querySelector('.lp-min').value = '55';
      m.querySelector('.lp-go').click(); for (let i = 0; i < 60 && m.querySelector('.lp-out').hidden; i++) await sleep(25);
      const sys = sent[0].messages[0].content, user = sent[0].messages[1].content;
      assert(/La fotosíntesis/.test(user) && /Empezar con una planta/.test(user) && /\[quiz\] ¿Qué gas sueltan las plantas\? — CO2 \/ ✓ Oxígeno/.test(user), 'lee textos, notas y cuestionarios (con la respuesta)');
      assert(/55 minutes/.test(sys) && /6\.º de primaria/.test(sys) && /language the presentation is written in/.test(sys), 'duración, nivel y el idioma de la presentación');
      assert(/competencias específicas/.test(sys) && /NEVER write official codes/.test(sys), 'en español: el vocabulario de la LOMLOE, sin inventar códigos');
      const doc = m.querySelector('.lp-doc');
      assert(/Competencias específicas/.test(doc.textContent) && /Saberes básicos/.test(doc.textContent) && /Atención a la diversidad/.test(doc.textContent), 'apartados con sus nombres');
      eq(doc.querySelectorAll('tbody tr').length, 2, 'la secuencia (sin partes vacías)');
      assert(/Diapositivas 1$/.test(doc.querySelector('tbody small').textContent), 'cada parte con sus diapositivas (las que existen)');
      assert(/<en voz alta>/.test(doc.textContent) && !doc.querySelector('en'), 'todo escapado');
      m.querySelector('.lp-html').click(); m.querySelector('.lp-md').click(); await sleep(20);
      assert(saved.some(n => /plan-de-clase\.html$/.test(n)) && saved.some(n => /\.md$/.test(n)), 'se descarga en .html y .md: ' + saved.join());
      const LP = await W.eval("import('/src/features/ai/lessonplan.js')"), last = await LP.lessonPlan({ minutes: 55 });
      assert(/\| \*\*Inicio\*\* \(Diapositivas 1\) \| 10 \|/.test(LP.docMarkdown(last)) && /<table>/.test(LP.docHTML(last)), 'Markdown con su tabla, y HTML');
      m.querySelector('.lp-notes-add').click(); await sleep(20);
      const [a, , c] = R.state.deck.slides;
      assert(/^Empezar con una planta\n\n— Plan de clase: Inicio \(10 min\)\nDocente: Pregunta qué comen/.test(a.notes), 'a las notas, tras lo que había: ' + a.notes);
      assert(/Práctica/.test(c.notes), 'cada parte en su diapositiva');
      m.querySelector('.lp-notes-add').click(); await sleep(20);
      eq((a.notes.match(/Plan de clase/g) || []).length, 1, 'otra vez: lo sustituye, no lo repite');
      // The study guide: summary, key terms and questions with the answers at the end; as slides too.
      m.querySelector('input[name=lp-kind][value="guide"]').click(); m.querySelector('.lp-go').click();
      for (let i = 0; i < 60 && !/Clorofila/.test(m.querySelector('.lp-doc').textContent); i++) await sleep(25);
      assert(/study guide/.test(sent.at(-1).messages[0].content), 'pide la guía');
      const g = m.querySelector('.lp-doc'), hs = [...g.querySelectorAll('h2')].map(h => h.textContent);
      eq(hs.join('|'), 'Resumen|Términos clave|Comprueba lo que sabes|Soluciones', 'resumen, términos, preguntas y, al final, las soluciones');
      assert(m.querySelector('.lp-notes-add').hidden && !m.querySelector('.lp-slides-add').hidden, 'la guía va como diapositivas');
      const n0 = R.state.deck.slides.length; m.querySelector('.lp-slides-add').click(); await sleep(20);
      eq(R.state.deck.slides.length, n0 + 4, 'cuatro diapositivas: resumen, términos, preguntas y soluciones');
      assert(R.state.deck.slides.at(-2).notes.includes('Luz, agua y CO2'), 'las respuestas en las notas de las preguntas');
    } finally { W.fetch = realFetch; W.HTMLAnchorElement.prototype.click = click; AI.disconnectAi(); D.getElementById('lp-modal')?.remove(); }
  });

  await test('errores de la aplicación: el navegador en pocas palabras, y nada se envía sin cuenta (edición abierta) ni en pruebas', async () => {
    const W = frame.contentWindow, E = await W.eval("import('/src/ui/shell/errors.js')"), real = W.fetch; let sent = 0;
    eq(E.browserName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'), 'Chrome 141 · Windows', 'Chrome en Windows');
    eq(E.browserName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'), 'Safari 18 · macOS', 'Safari en macOS');
    eq(E.browserName('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0'), 'Firefox 131 · Linux', 'Firefox en Linux');
    W.fetch = async () => { sent++; return new W.Response('{}'); };
    try { E.initErrorReports({ testing: true }); E.reportError(new W.Error('prueba')); await sleep(10); eq(sent, 0, 'en pruebas, nada'); }
    finally { W.fetch = real; }
  });

  await test('crear con IA a medida: primero unas preguntas sobre el caso, y sus respuestas guían el esquema', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, calls = [];
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const answers = [{ questions: [{ q: '¿Qué curso y nivel tienen?', options: ['1.º ESO', '2.º ESO', 'Bachillerato'] }, { q: '¿Cuánto dura la clase?', options: ['30 min', '55 min'] }] },
      { title: 'Fracciones', slides: [{ title: 'Fracciones', kind: 'title', points: [] }, { title: 'Sumar fracciones', kind: 'steps', points: ['Con el mismo denominador'] }] }];
    W.fetch = async (url, opts) => { const body = JSON.parse(opts.body); calls.push(body); return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answers.length > 1 ? answers.shift() : answers[0]) } }] })); };
    try {
      const M = await W.eval("import('/src/ui/dialogs/ai.js')"); M.openCreateDeck(); await sleep(30);
      const m = D.querySelector('.ad-topic').closest('.modal'), q = x => m.querySelector(x);
      q('.ad-topic').value = 'Fracciones'; q('.ad-plan').click();
      for (let i = 0; i < 60 && !m.querySelector('.ad-q'); i++) await sleep(30);
      eq(m.querySelectorAll('.ad-q').length, 2, 'primero, las preguntas sobre este caso');
      assert(/the 3-4 questions/.test(calls[0].messages[0].content) && /Fracciones/.test(calls[0].messages[1].content), 'pedidas a la IA para este tema');
      [...m.querySelectorAll('.ad-q')[0].querySelectorAll('.ad-opt')].find(b => b.textContent === '2.º ESO').click();
      m.querySelectorAll('.ad-q-other')[1].value = '55 minutos, con un ejercicio al final';
      q('.ad-more').value = 'Van flojos en el mínimo común múltiplo';
      q('.ad-plan').click();
      for (let i = 0; i < 60 && !m.querySelector('.ad-ol li'); i++) await sleep(30);
      const ctx = calls[1].messages[1].content;
      assert(/tailor EVERYTHING/.test(ctx) && /2\.º ESO/.test(ctx) && /55 minutos, con un ejercicio/.test(ctx) && /mínimo común múltiplo/.test(ctx), 'el esquema, con sus respuestas: ' + ctx.slice(-300));
      eq(m.querySelectorAll('.ad-ol li').length, 2, 'y el esquema');
    } finally { W.fetch = real; R.ai.disconnectAi(); D.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); }
  });

  await test('IA: imágenes y vídeos reales que explican (buscados, elegidos mirándolos, descritos)', async () => {
    reset(); const W = frame.contentWindow, A = R.aiDeck, realFetch = W.fetch, calls = [];
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    W.fetch = async (url, opts) => {
      url = String(url); calls.push(url);
      if (url.includes('commons.wikimedia.org')) return new W.Response(JSON.stringify({ query: { pages: {
        1: { pageid: 1, index: 1, title: 'File:Chloroplast diagram vi.svg', imageinfo: [{ url: 'https://upload.wikimedia.org/x/vi.png', thumburl: 'data:image/png;base64,' + PNG, width: 800, height: 600, mime: 'image/png', extmetadata: { LicenseShortName: { value: 'CC BY 3.0' }, Artist: { value: '<a>Ana</a>' } } }] },
        2: { pageid: 2, index: 2, title: 'File:Chloroplast structure.png', imageinfo: [{ url: 'https://upload.wikimedia.org/x/es.png', thumburl: 'data:image/png;base64,' + PNG, width: 900, height: 600, mime: 'image/png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:C.png', extmetadata: { LicenseShortName: { value: 'CC0' }, Artist: { value: 'Luis' } } }] } } } }));
      if (url.includes('api.openverse.org')) return new W.Response(JSON.stringify({ results: [] }));
      if (url.includes('api.sketchfab.com')) return new W.Response(JSON.stringify({ results: [{ uid: 'abc123', name: 'Human heart', user: { displayName: 'Ana' }, license: { label: 'CC BY' }, viewerUrl: 'https://sketchfab.com/3d-models/heart', thumbnails: { images: [{ width: 256, url: 'data:image/png;base64,' + PNG }] } }] }));
      if (url.includes('youtube.com/oembed')) return url.includes('abcdefghijk') ? new W.Response(JSON.stringify({ title: 'Photosynthesis animation explained', author_name: 'Canal' })) : new W.Response('', { status: 404 });
      if (url.startsWith('https://upload.wikimedia.org/')) return new W.Response(Uint8Array.from(atob(PNG), c => c.charCodeAt(0)), { headers: { 'Content-Type': 'image/png' } });
      const body = JSON.parse(opts.body), sys = body.messages[0].content;
      const a = /choose the 3D model/.test(sys) ? { n: 1, score: 8, alt: 'Corazón humano en 3D', note: 'Giradlo para ver las aurículas.' } : /choose the video/.test(sys) ? { n: 0, score: 0 } : /choose the picture/.test(sys) ? { n: 2, score: 9, alt: 'Esquema del cloroplasto con sus partes', note: 'Señalad los tilacoides.' }
        : /YouTube video/.test(sys) ? { videos: [{ i: 2, url: 'https://www.youtube.com/watch?v=abcdefghijk' }, { i: 3, url: 'https://www.youtube.com/watch?v=inventado00' }] } : {};
      return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(a) } }] }));
    };
    try {
      const specs = [{ kind: 'title', title: 'Fotosíntesis' }, { kind: 'image', title: 'El cloroplasto', bullets: ['Donde ocurre'], image_search: 'chloroplast structure diagram', notes: 'Mirad.' },
        { kind: 'image', title: 'El proceso', bullets: ['Luz y agua'], video_search: 'photosynthesis animation' }, { kind: 'image', title: 'Otro', bullets: ['Algo'], video_search: 'photosynthesis experiment' },
        { kind: 'image', title: 'El corazón', bullets: ['Sus cavidades'], model_search: 'human heart anatomy' }];
      await A.findMedia(specs, { topic: 'Fotosíntesis', language: 'español' });
      const p = specs[1].picture;
      assert(p && /^data:image\/png/.test(p.src), 'la imagen elegida, incrustada');
      eq(p.alt + '|' + p.caption, 'Esquema del cloroplasto con sus partes|Luis · CC0 · Wikimedia Commons', 'con su descripción y su autoría y licencia');
      assert(/Señalad los tilacoides/.test(specs[1].notes), 'y en las notas, qué señalar');
      eq(specs[2].video?.src, 'https://www.youtube.com/embed/abcdefghijk', 'el vídeo, comprobado que existe');
      eq(specs[3].kind + ':' + !!specs[3].video, 'bullets:false', 'uno que no existe: nada de vídeo, sus puntos en lista');
      assert(!specs.some(x => x.image_search || x.video_search || x.model_search), 'sin las búsquedas');
      eq(specs[4].model?.kind + '|' + specs[4].model?.src.split('?')[0] + '|' + specs[4].model?.caption, 'embed|https://sketchfab.com/models/abc123/embed|Human heart — Ana · CC BY · Sketchfab', 'el modelo 3D elegido, con su visor y su autoría');
      const MD = await W.eval("import('/src/features/ai/media.js')");
      eq(MD.wider('sack of Rome 410 Alaric Visigoths illustration').join('|'), 'sack of Rome 410 Alaric Visigoths illustration|sack of Rome 410 Alaric|sack of Rome 410|sack of Rome', 'una búsqueda larga, cada vez más amplia');
      // On the slide: the picture and the video in its place.
      const n0 = R.state.deck.slides.length;
      await A.insertSpecs([specs[1], specs[2], specs[4]]);
      const [s1, s2, s3] = R.state.deck.slides.slice(R.state.ui.slideIndex, R.state.ui.slideIndex + 3);
      assert(s3.blocks.some(b => b.type === 'embed' && /sketchfab\.com\/models\/abc123/.test(b.src) && b.alt === 'Corazón humano en 3D'), 'el modelo 3D, en su diapositiva');
      const img = s1.blocks.find(b => b.type === 'image'), emb = s2.blocks.find(b => b.type === 'embed');
      assert(img && img.alt === 'Esquema del cloroplasto con sus partes' && img.caption, 'la imagen, con su descripción y su crédito');
      assert(emb && emb.src === 'https://www.youtube.com/embed/abcdefghijk' && Math.abs(emb.w / emb.h - 16 / 9) < 0.02, 'el vídeo, 16:9');
      eq(R.state.deck.slides.length, n0 + 3, 'tres diapositivas');
    } finally { W.fetch = realFetch; R.ai.disconnectAi(); }
  });

  await test('presentación en varios idiomas: la tabla, cada uno en el suyo, la IA completa lo que falta', async () => {
    reset(); const W = frame.contentWindow, L = await W.eval("import('/src/features/document/languages.js')");
    R.store.commit(() => {
      const s = R.state.deck.slides[0]; s.blocks = [{ id: 't1', type: 'text', x: 80, y: 80, w: 900, h: 120, html: '<b>La fotosíntesis</b>', rotation: 0, animation: null },
        { id: 't2', type: 'table', x: 80, y: 260, w: 600, h: 200, rows: [['Entra', 'Sale'], ['Agua', 'Oxígeno']], rotation: 0, animation: null }];
      s.notes = 'Explicar con calma.';
      L.ensureI18n(R.state.deck, 'es'); L.addLang(R.state.deck, 'en'); L.addLang(R.state.deck, 'ar');
      L.setText(R.state.deck, 'en', '<b>La fotosíntesis</b>', '<b>Photosynthesis</b><img src=x onerror=alert(1)>');
      L.setText(R.state.deck, 'en', 'Agua', 'Water'); L.setText(R.state.deck, 'ar', '<b>La fotosíntesis</b>', '<b>التمثيل الضوئي</b>');
    });
    const rows = L.textRows(R.state.deck).map(r => r.text);
    assert(['<b>La fotosíntesis</b>', 'Entra', 'Agua', 'Oxígeno', 'Explicar con calma.'].every(x => rows.includes(x)), 'la tabla tiene cada texto: cuadros, celdas y notas: ' + JSON.stringify(rows));
    eq(L.missingByLang(R.state.deck).en, rows.length - 2, 'y cuenta lo que falta en cada idioma');
    const en = L.deckIn(R.state.deck, 'en'), b = en.slides[0].blocks;
    assert(/Photosynthesis/.test(b[0].html) && !/onerror/.test(b[0].html), 'en inglés, con su formato (y sin código: se limpia)');
    eq(b[1].rows[1][0], 'Water', 'las celdas también'); eq(b[1].rows[1][1], 'Oxígeno', 'lo que no está traducido, en el original');
    assert(/fotosíntesis/.test(R.state.deck.slides[0].blocks[0].html), 'la presentación de verdad no cambia');
    const ar = L.deckIn(R.state.deck, 'ar'); eq(ar.slides[0].blocks[0].dir, 'rtl', 'el árabe, de derecha a izquierda');
    eq(L.deckIn(R.state.deck, 'fr'), R.state.deck, 'un idioma que no tiene: la original');
    // Who sees which.
    eq(L.pickLang(R.state.deck, { browser: ['en-GB', 'es'] }), 'en', 'el idioma del navegador, si lo tiene');
    eq(L.pickLang(R.state.deck, { browser: ['fr-FR'] }), 'es', 'si no, el original');
    eq(L.pickLang(R.state.deck, { asked: 'ar', browser: ['en'] }), 'ar', 'el que se pide en el enlace');
    R.store.commit(() => L.setForce(R.state.deck, 'en'));
    eq(L.pickLang(R.state.deck, { asked: 'ar', browser: ['ar'] }), 'en', 'el que el autor fija para todos manda');
    R.store.commit(() => L.setForce(R.state.deck, null));
    // A text changed: its translation stays unused until it's cleaned.
    R.store.commit(() => { R.state.deck.slides[0].blocks[1].rows[1][0] = 'Agua (H₂O)'; });
    let n = 0; R.store.commit(() => { n = L.pruneTexts(R.state.deck); }); eq(n, 1, 'quitar las traducciones que ya no se usan');
    // The dialog: the table, a cell written by hand, the AI completing the rest, and presenting in a language.
    const realFetch = W.fetch, sent = [];
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    W.fetch = async (url, opts) => { const body = JSON.parse(opts.body), items = JSON.parse(body.messages[1].content); sent.push(body.messages[0].content);
      return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(Object.fromEntries(Object.entries(items).map(([k, v]) => [k, '«' + v + '»']))) } }] })); };
    try {
      D.querySelector('[data-action="languages"]').click(); await sleep(100);
      const M = D.getElementById('lang-modal'); assert(M, 'Ver ▸ Idiomas abre la tabla');
      eq(M.querySelectorAll('thead th').length, 4, 'una columna por idioma (y el original)');
      const cell = [...M.querySelectorAll('tbody tr')].find(tr => /Entra/.test(tr.textContent)).querySelector('.lg-cell[data-l="en"]');
      cell.focus(); cell.textContent = 'In'; cell.dispatchEvent(new W.FocusEvent('focusout', { bubbles: true })); await sleep(20);
      eq(L.i18nOf(R.state.deck).texts.en.Entra, 'In', 'escribir en la tabla guarda la traducción');
      M.querySelector('.lg-ai').click(); for (let i = 0; i < 50 && L.missingByLang(R.state.deck).ar; i++) await sleep(50);
      assert(sent.some(x => /into English/.test(x)) && sent.some(x => /into Arabic/.test(x)), 'la IA traduce a cada idioma');
      eq(L.missingByLang(R.state.deck).en + L.missingByLang(R.state.deck).ar, 0, 'y completa todo lo que faltaba');
      eq(L.i18nOf(R.state.deck).texts.en.Entra, 'In', 'sin tocar lo escrito a mano');
      M.querySelector('.lg-see').value = 'en'; M.querySelector('.lg-present').click(); await sleep(100);
      const f = D.querySelector('#present-overlay iframe'); let txt = '';
      for (let i = 0; i < 60 && !/Photosynthesis/.test(txt); i++) { await sleep(100); txt = f?.contentDocument?.body?.textContent || ''; }
      assert(/Photosynthesis/.test(txt) && /Water|«Agua \(H₂O\)»/.test(txt), 'presentar en inglés');
      D.querySelector('#present-close')?.click();
    } finally { W.fetch = realFetch; D.getElementById('lang-modal')?.remove(); }
    // The two examples in eleven languages: opened in English, English is their original and the rest are in the table.
    for (const key of ['telescopes', 'storyrobot']) {
      const es = await R.examples.loadExample(key, 'es'), en = await R.examples.loadExample(key, 'en');
      eq(L.allLangs(es).length, 11, key + ': once idiomas'); eq(Object.values(L.missingByLang(es)).reduce((a, b) => a + b, 0), 0, key + ': nada por traducir');
      eq(L.baseOf(en), 'en', key + ': abierta en inglés, el inglés es su original');
      assert(L.langsOf(en).includes('es') && !L.langsOf(en).includes('en'), key + ': y el español, uno más de la tabla');
      eq(Object.values(L.missingByLang(en)).reduce((a, b) => a + b, 0), 0, key + ': también completa desde el inglés');
      eq(JSON.stringify(L.textRows(L.deckIn(en, 'es')).map(r => r.text)), JSON.stringify(L.textRows(es).map(r => r.text)), key + ': y vuelve al español con los mismos textos');
      assert(JSON.stringify(en.slides).includes(key === 'telescopes' ? 'Eyes in space' : 'Once upon a time'), key + ': sus diapositivas, en inglés');
    }
  });

  await test('IA: diapositivas «hijas» (debajo de otra) para profundizar en lo difícil', async () => {
    reset(); const W = frame.contentWindow, A = R.aiDeck, calls = []; let answer = {};
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const realFetch = W.fetch;
    W.fetch = async (url, opts) => { const body = JSON.parse(opts.body); calls.push({ url, body });
      return new W.Response(JSON.stringify({ choices: [{ message: { content: '```json\n' + JSON.stringify(answer) + '\n```' } }] })); };
    try {
      const n = t => ({ notes: 'Lo que digo en esta diapositiva, con sus detalles y la transición a la siguiente idea.' });
      answer = { title: 'Fracciones', slides: [
        { kind: 'title', title: 'Sumar fracciones', below: true, ...n() },                       // (the first: never below)
        { kind: 'key_idea', title: 'Mismo denominador', statement: 'Se suman los numeradores y el denominador se queda igual.', below: true, ...n() },   // (under the title: no)
        { kind: 'steps', title: 'Distinto denominador: busca el mcm', steps: [{ title: 'mcm', text: 'Calcula el mínimo común múltiplo de los denominadores' }, { title: 'Equivalentes', text: 'Convierte cada fracción a ese denominador' }, { title: 'Suma', text: 'Suma los numeradores y simplifica' }], ...n() },
        { kind: 'steps', title: 'Ejemplo: 1/4 + 1/6', steps: [{ title: 'mcm(4, 6) = 12', text: '12 es el menor múltiplo común' }, { title: '3/12 + 2/12', text: 'Cada fracción con denominador 12' }, { title: '5/12', text: 'Se suman los numeradores' }], below: 'true', ...n() },
        { kind: 'comparison', title: 'Error frecuente', columns: [{ heading: 'Mal', bullets: ['1/4 + 1/6 = 2/10'] }, { heading: 'Bien', bullets: ['1/4 + 1/6 = 5/12'] }], below: true, ...n() },
        { kind: 'features', title: 'Para practicar', items: [{ icon: 'pencil', title: 'Fichas', text: 'Diez sumas con distinto denominador' }, { icon: 'users', title: 'En parejas', text: 'Uno calcula y otro comprueba' }, { icon: 'check', title: 'Corrección', text: 'En la pizarra, al final' }], ...n() },
        { kind: 'closing', title: 'Gracias', below: true, ...n() }] };
      const specs = await A.createDeck({ topic: 'Sumar fracciones', count: 7 });
      const sys = calls.find(c => /PRESENT out loud/.test(c.body.messages[0].content)).body.messages[0].content;
      assert(/"below": true/.test(sys) && /hardest to understand/.test(sys), 'a la IA se le pide profundizar debajo en lo difícil');
      eq(specs.map(sp => sp.below ? 'B' : '-').join(''), '---BB--', 'debajo solo donde se puede (no la portada, ni bajo ella, ni el cierre)');
      reset(); const n0 = R.state.deck.slides.length;
      await A.insertSpecs(specs);
      const S = R.state.deck.slides.slice(n0);
      eq(S.map(s => s.vertical ? 'V' : '-').join(''), '---VV--', 'en la presentación, el ejemplo y el error quedan debajo de su diapositiva');
      assert(/<section[^>]*>\s*<section/.test(R.io.buildHTML()), 'y al presentar forman una pila vertical');
      // The outline: what goes below is shown, can be changed, and the slides follow it.
      answer = { title: 'Fracciones', slides: [{ title: 'Portada', kind: 'title' }, { title: 'El mcm', kind: 'steps', points: ['p'] }, { title: 'Ejemplo resuelto', kind: 'steps', below: true, points: ['1/4 + 1/6'] }, { title: 'Gracias', kind: 'closing' }] };
      const ol = await A.createOutline({ topic: 'Sumar fracciones', count: 4 });
      eq(ol.slides.map(x => x.below ? 'B' : '-').join(''), '--B-', 'el esquema dice qué va debajo');
      answer = { title: 'F', slides: [{ kind: 'title', title: 'Portada', ...n() }, { kind: 'bullets', title: 'El mcm', bullets: ['a', 'b', 'c'], ...n() }, { kind: 'bullets', title: 'Ejemplo resuelto', bullets: ['a', 'b', 'c'], ...n() }, { kind: 'closing', title: 'Gracias', ...n() }] }; calls.length = 0;
      const sp2 = await A.createDeck({ topic: 'Sumar fracciones', outline: ol.slides });
      assert(/3\. \(BELOW the previous one: "below": true\) \[steps\] Ejemplo resuelto/.test(calls[0].body.messages[1].content), 'al escribirla, se le dice cuál va debajo');
      eq(sp2.map(sp => sp.below ? 'B' : '-').join(''), '--B-', 'y queda debajo aunque la IA lo olvide');
    } finally { W.fetch = realFetch; }
  });

  await test('IA avanzada: presentación completa, mejorar, agenda, preguntas y asistente', async () => {
    reset(); const W = frame.contentWindow, A = R.aiDeck, realFetch = W.fetch, calls = []; let answer = {}, seq = null;
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    W.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body); calls.push({ url, body });
      if (url.endsWith('/images')) return new W.Response(JSON.stringify({ data: [{ b64_json: 'R0lGODlhAQABAAAAACw=', media_type: 'image/gif' }] }));
      const a = seq?.length ? seq.shift() : answer; return new W.Response(JSON.stringify({ choices: [{ message: { content: typeof a === 'string' ? a : '```json\n' + JSON.stringify(a) + '\n```' } }] }));
    };
    try {
      const specs = [
        { kind: 'title', title: 'Energía solar', subtitle: 'Introducción', notes: 'Hola' },
        { kind: 'section', title: 'Parte 1' }, { kind: 'bullets', title: 'Ventajas', bullets: ['Limpia', 'Renovable'] },
        { kind: 'two_columns', title: 'Comparación', left: { heading: 'Solar', bullets: ['a'] }, right: { heading: 'Eólica', bullets: ['b'] } },
        { kind: 'quote', quote: 'El sol es para todos', author: 'Anónimo' },
        { kind: 'stats', title: 'Cifras', stats: [{ value: '42%', label: 'eficiencia' }, { value: '3x', label: 'crecimiento' }], source: 'Fuente: IEA 2023' },
        { kind: 'timeline', title: 'Historia', steps: [{ label: '1954', text: 'Primera célula' }, { label: '2000', text: 'Expansión' }, { label: '2020', text: 'Récord' }] },
        { kind: 'chart', title: 'Producción', chart: { type: 'line', labels: ['2020', '2021'], values: [1, 2], series_name: 'TWh' }, bullets: ['Sube'], source: 'Fuente: IEA 2023' },
        { kind: 'table', title: 'Tabla', header: ['País', 'GW'], rows: [['China', '600'], ['EE. UU.', '140']] },
        { kind: 'image', title: 'Paneles', bullets: ['Tejados'], image_prompt: 'solar panels on roofs' },
        { kind: 'closing', title: 'Gracias' }, { kind: 'bullets', title: 'Anexo', bullets: ['Fuentes'] }];   // (12: a deck long enough to keep its section slide)
      answer = { title: 'Energía solar', slides: specs };
      reset(); const n0 = R.state.deck.slides.length;
      const got = await A.createDeck({ topic: 'Energía solar', count: 11, audience: 'estudiantes', tone: 'didáctico', images: true });
      const ask = calls.find(c => /Audience: estudiantes/.test(c.body.messages[1].content)); assert(ask, 'envía el encargo');
      assert(/PRESENT out loud/.test(ask.body.messages[0].content) && /"design"/.test(ask.body.messages[0].content), 'para presentarla en voz alta, y con su diseño');
      assert(calls.some(c => /speaker notes/.test(c.body.messages[0].content)), 'las notas que faltaban, pedidas aparte');
      await A.insertSpecs(got, { images: true });
      eq(R.state.deck.slides.length, n0 + 12, 'doce diapositivas (con su portadilla: es larga)');
      const S = R.state.deck.slides.slice(1), types = s => s.blocks.map(b => b.type).join(',');
      assert(S[5].blocks.some(b => /<b>42%<\/b>/.test(b.html || '')), 'cifras destacadas');
      eq(S[6].blocks.filter(b => b.type === 'shape' && b.shape === 'ellipse' && b.opacity == null).length, 3, 'línea de tiempo: un punto por momento');
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
      // First the outline (to review), then the slides follow it.
      answer = { title: 'Energía solar', slides: [{ title: 'Portada', points: [] }, { title: 'Por qué el sol', points: ['Gratis', 'Limpio'] }, { title: '' }, { title: 'Gracias' }] };
      const ol = await A.createOutline({ topic: 'Energía solar', count: 4 });
      eq(ol.slides.map(x => x.title).join('|'), 'Portada|Por qué el sol|Gracias', 'esquema: títulos, sin los vacíos'); eq(ol.slides[1].points.join(), 'Gratis,Limpio', 'esquema: sus puntos');
      answer = { title: 'Energía solar', slides: [{ kind: 'title', title: 'Portada', notes: 'n' }, { kind: 'closing', title: 'Gracias', notes: 'n' }] }; calls.length = 0;
      await A.createDeck({ topic: 'Energía solar', outline: [{ title: 'Portada', points: [] }, { title: 'Gracias', points: ['Contacto'] }] });
      assert(/Follow THIS outline[\s\S]*exactly 2 slides[\s\S]*2\. Gracias\n   - Contacto/.test(calls[0].body.messages[1].content), 'las diapositivas siguen el esquema revisado');
      // The outline knows what a slide can be: each item with its kind (code for a programming language), and the deck
      // develops its points into that kind — not every slide a list of the points copied.
      answer = { title: 'Swift', slides: [{ title: 'Swift', kind: 'title' }, { title: 'Variables y constantes', kind: 'code', points: ['let y var en Swift'] }, { title: 'X', kind: 'nada' }] }; calls.length = 0;
      const ol2 = await A.createOutline({ topic: 'Lenguaje de programación Swift', count: 3 });
      eq(ol2.slides.map(x => x.kind || '-').join(), 'title,code,-', 'esquema: el tipo de cada diapositiva (uno que no existe, fuera)');
      const sys = calls[0].body.messages[0].content;
      assert(/"kind"/.test(sys) && /code, math, closing/.test(sys) && /REAL CODE on "code" slides/.test(sys), 'al esquema se le explica qué puede tener cada diapositiva');
      eq(calls[0].body.model, 'google/gemini-2.5-flash', 'con un modelo capaz, no el más barato');
      answer = { title: 'Swift', slides: [{ kind: 'code', title: 'Variables y constantes', code: { language: 'swift', code: 'let pi = 3.14\nvar n = 0' }, notes: 'n' }] }; calls.length = 0;
      const sp2 = await A.createDeck({ topic: 'Swift', outline: ol2.slides.slice(1, 2) });
      assert(/1\. \[code\] Variables y constantes/.test(calls[0].body.messages[1].content) && /DEVELOPING its points/.test(calls[0].body.messages[1].content), 'la presentación: el tipo de cada una y desarrollar sus puntos');
      assert(/"swift"/.test(calls[0].body.messages[0].content), 'Swift entre los lenguajes del código');
      eq(sp2[0].code.language, 'swift', 'código en Swift (con sus colores)');
      // Notes asked afterwards, matched by title: a model that skips one doesn't move the rest onto the next slides.
      seq = [{ title: 'T', slides: [{ kind: 'key_idea', title: 'Uno', statement: 'a' }, { kind: 'key_idea', title: 'Dos', statement: 'b' }, { kind: 'key_idea', title: 'Tres', statement: 'c' }] },
        { notes: [{ i: 0, title: 'Uno', notes: 'Nota de uno' }, { i: 1, title: 'Tres', notes: 'Nota de tres' }] }];
      const sp3 = await A.createDeck({ topic: 'T', count: 3 }); seq = null;
      eq(sp3.map(x => x.notes || '-').join('|'), 'Nota de uno|-|Nota de tres', 'cada nota en su diapositiva');
      // Measured: a deck like the mediocre one on Swift scores low, for its reasons; a good one passes.
      const Q = await W.eval("import('/src/features/ai/quality.js')");
      const flat = [{ kind: 'title', title: 'Introducció a Swift', notes: 'Benvinguts' },
        ...['Llenguatge dissenyat per Apple', 'Presentat el 2014', 'Última versió estable', 'Multiparadigma', 'Elimina codi perillós', 'Compatibilitat amb C'].map((t, i, a) =>
          ({ kind: 'bullets', title: t, bullets: ['Inclou millores', 'Fàcil'], notes: 'Ara parlarem de ' + (a[i + 1] || 'tancament').toLowerCase() })),
        { kind: 'closing', title: 'Gràcies', notes: 'Gràcies' }];
      const q1 = Q.deckQuality(flat, { topic: 'Lenguaje de programación Swift' });
      eq(q1.problems.map(p => p.code).sort().join(), 'all-lists,few-kinds,no-code,notes-off,thin-lists', 'la mediocre: listas, pobres, sin código, pocos tipos, notas desplazadas: ' + JSON.stringify(q1.problems));
      assert(q1.score < 40 && Q.isTechnical('Llenguatge de programació Swift') && !Q.isTechnical('La Revolución francesa'), 'nota baja (' + q1.score + '); técnico, lo es');
      const good = [{ kind: 'title', title: 'Swift', notes: 'Hola, hoy Swift' },
        { kind: 'code', title: 'Constantes y variables', code: { language: 'swift', code: 'let pi = 3.14\nvar n = 0' }, notes: 'Las constantes con let y las variables con var' },
        { kind: 'comparison', title: 'Swift frente a Objective-C', columns: [{ heading: 'Swift', bullets: ['Seguro'] }, { heading: 'ObjC', bullets: ['Antiguo'] }], notes: 'Comparamos Swift con Objective-C' },
        { kind: 'code', title: 'Opcionales', code: { language: 'swift', code: 'if let n = Int("4") { print(n) }' }, notes: 'Los opcionales evitan el nil' },
        { kind: 'timeline', title: 'Historia de Swift', steps: [{ label: '2014', text: 'Nace' }, { label: '2015', text: 'Abierto' }, { label: '2019', text: 'ABI' }], notes: 'La historia de Swift en tres fechas' },
        { kind: 'closing', title: 'Gracias', notes: 'Gracias' }];
      const q2 = Q.deckQuality(good, { topic: 'Swift' }); eq(q2.problems.length + '|' + q2.score, '0|100', 'la buena: sin problemas');
      // Figures without data (invented), a picture slide with no picture, code where it doesn't belong.
      const sales = [{ kind: 'title', title: 'Ventas', notes: 'n' }, { kind: 'stats', title: 'Resultados', stats: [{ value: '$15.2M', label: 'Ventas' }], notes: 'Resultados' },
        { kind: 'stats', title: 'Tus cifras', stats: [{ value: '[ventas del trimestre]', label: 'Ventas' }], notes: 'Tus cifras' },
        { kind: 'image', title: 'Equipo', bullets: ['a'], notes: 'Equipo' }, { kind: 'code', title: 'Instalar', code: { language: 'bash', code: 'npm install\nyarn dev' }, notes: 'Instalar' }];
      eq(Q.deckQuality(sales, { topic: 'Bienvenida a nuevos empleados' }).problems.filter(p => ['invented-figures', 'no-picture', 'off-code'].includes(p.code)).map(p => p.code + ':' + p.slides.join('+')).join(),
        'invented-figures:1,no-picture:3,off-code:4', 'cifras inventadas (no los huecos para rellenar), imagen sin imagen, código fuera de lugar');
      assert(!Q.deckQuality(sales, { topic: 'Bienvenida', sourced: true, images: true }).problems.some(p => ['invented-figures', 'no-picture'].includes(p.code)), 'con datos y con imágenes pedidas, no');
      sales[1].source = 'Fuente: INE, Encuesta de población activa 2024';
      assert(!Q.deckQuality(sales, { topic: 'Bienvenida' }).problems.some(p => p.code === 'invented-figures'), 'con su fuente, no son inventadas');
      assert(Q.deckQuality([sales[0], { ...sales[1], source: 'Datos internos de la compañía' }], { topic: 'Ventas' }).problems.some(p => p.code === 'invented-figures'), 'con «datos internos» que nadie dio, sí');
      assert(Q.deckQuality([sales[0], { ...sales[1], source: 'Datos de ejemplo' }], { topic: 'La caída de Roma' }).problems.some(p => p.code === 'invented-figures')
        && !Q.deckQuality([sales[0], { ...sales[1], source: 'Datos de ejemplo' }], { topic: 'Python con pandas' }).problems.some(p => p.code === 'invented-figures'), '«de ejemplo»: en un tutorial técnico sí; en historia, no');
      // With data given, a forecast of the model's own still counts as invented — not one with the person's figures.
      eq(Q.amounts('2,4 M€ · 3.100.000 · 3.1M€ · 12 % · 300.000 €').join(), '2400000,3100000,3100000,12,300000', 'las cantidades, en números');
      const fc = { kind: 'chart', title: 'Proyecciones T4', source: 'Estimaciones internas', chart: { labels: ['T3', 'Proyección T4'], values: [2400000, 3100000] }, notes: 'n' };
      const given = 'T3: 2,4 M€ de ventas frente a un objetivo de 2,6 M€';
      assert(Q.deckQuality([sales[0], fc], { topic: 'Ventas', sourced: true, given }).problems.some(p => p.code === 'invented-figures'), 'la proyección inventada, sí');
      assert(!Q.deckQuality([sales[0], { ...fc, chart: { labels: ['T3', 'Objetivo T4'], values: [2400000, 2600000] } }], { topic: 'Ventas', sourced: true, given }).problems.some(p => p.code === 'invented-figures'), 'con sus cifras, no');
      const vc = { kind: 'chart', title: 'Resultados de la validación', source: 'Datos de validación (ejemplo ilustrativo)', chart: { labels: ['Enero', 'Febrero'], values: [25.26, 30.31] }, notes: 'n' };
      assert(Q.deckQuality([sales[0], vc], { topic: 'Defensa de tesis', sourced: true, given: 'Validado con dos hospitales; 20 minutos' }).problems.some(p => p.code === 'invented-figures'), 'con datos dados, un «ejemplo ilustrativo» de su caso, inventado');
      assert(!Q.deckQuality([sales[0], { ...fc, title: 'Brecha T3', source: 'Datos internos', chart: { labels: ['Brecha'], values: [200000] }, bullets: ['-8 % sobre el objetivo'] }], { topic: 'Ventas', sourced: true, given }).problems.some(p => p.code === 'invented-figures'), 'una cuenta con sus cifras (2,6 − 2,4), no');
      assert(Q.deckQuality([sales[0], { kind: 'chart', title: 'Lluvia', source: 'Datos meteorológicos locales', chart: { labels: ['Año 1', 'Año 2', 'Año 3'], values: [150, 160, 170] }, notes: 'n' }], { topic: 'Clima', sourced: true, given: '15 minutos' }).problems.some(p => p.code === 'invented-figures'), 'una serie de «Año 1, Año 2…», inventada');
      assert(Q.deckQuality([sales[0], { kind: 'chart', title: '¿Qué pesó más?', source: 'Interpretación de Peter Heather', chart: { type: 'pie', labels: ['Invasiones', 'Economía', 'Política'], values: [50, 30, 20] }, notes: 'n' }], { topic: 'Roma', sourced: true, given: '50 minutos' }).problems.some(p => p.code === 'invented-figures'), 'una tarta de pesos redondos que suman 100, inventada');
      // The same steps on two slides: the second one, to say something new.
      const st1 = { kind: 'steps', title: 'Sumar con distinto denominador', steps: [{ title: 'Calcular el mínimo común múltiplo', text: 'de los denominadores' }, { title: 'Convertir fracciones equivalentes', text: 'con el nuevo denominador' }, { title: 'Sumar numeradores', text: 'y simplificar resultado' }], notes: 'a' };
      const rq = Q.deckQuality([{ kind: 'title', title: 'F' }, st1, { kind: 'key_idea', title: 'Clave', statement: 'Practicar cada semana', notes: 'b' }, { ...st1, title: 'El reto: distinto denominador' }], { topic: 'Fracciones' });
      eq(rq.problems.filter(p => p.code === 'repeated').map(p => p.slides.join()).join(), '3', 'la que repite otra');
      // A chart whose values are gaps to fill in: a list of them (not «T4» read as 4).
      const SP = await W.eval("import('/src/features/ai/specs.js')");
      const gc = SP.normalizeSpec({ kind: 'chart', title: 'T4', chart: { type: 'line', labels: ['T3', 'T4'], values: [2400000, '[previsión del T4]'] } });
      eq(SP.normalizeSpec({ kind: 'bullets', title: 'R', bullets: ['ROI en [periodo_recuperacion_ROI] meses'] }).bullets[0], 'ROI en [periodo recuperacion ROI] meses', 'los huecos, en palabras');
      eq(gc.kind + ':' + gc.bullets.join('|'), 'bullets:T3: 2400000|T4: [previsión del T4]', 'el gráfico con huecos, una lista');
      // LaTeX in the model's JSON: «\\frac» with one backslash (a valid escape that broke the formula) and «\\sqrt» (an invalid one that lost it all).
      const OR = await W.eval("import('/src/features/ai/openrouter.js')");
      eq(OR.parseJSON('{"latex":"\\frac{a}{b} = \\sqrt{c}"}').latex, '\\frac{a}{b} = \\sqrt{c}', 'la fórmula, entera');
      eq(OR.parseJSON('{"code":"a\\nb","t":"x \\d y"}').code, 'a\nb', 'y los saltos de línea del código, como eran');
      // The source, under the figures on the slide.
      const sl = A.slideFromSpec(A.normalizeSpec ? A.normalizeSpec(sales[1]) : { ...sales[1] }, '#000', R.state.deck);
      assert(sl.blocks.some(b => b.aiSource && b.html === 'Fuente: INE, Encuesta de población activa 2024' && b.y > R.state.deck.size.h - 60), 'la fuente, abajo, en la diapositiva');
      // Creating one that comes out weak: its weak slides made again, once, before it's shown.
      seq = [{ title: 'Swift', slides: flat }, { slides: [1, 2, 3].map(i => ({ i, kind: 'code', title: flat[i].title, code: { language: 'swift', code: 'let x = ' + i + '\nprint(x)' } })) }];
      calls.length = 0; const sp4 = await A.createDeck({ topic: 'Lenguaje de programación Swift', count: 8 }); seq = null;
      eq(calls.length, 2, 'una sola petición más'); assert(/These slides of a presentation are weak/.test(calls[1].body.messages[0].content), 'pidiendo rehacer las flojas');
      eq(sp4.slice(1, 4).map(x => x.kind + ':' + x.code?.language).join(), 'code:swift,code:swift,code:swift', 'las flojas, ahora con código');
      eq(sp4[1].notes, flat[1].notes, 'conservando sus notas');
      // Figures still invented after it: never shown as facts — gaps to fill in, a chart as a table of gaps.
      seq = [{ title: 'Ventas', slides: [{ kind: 'title', title: 'Ventas', notes: 'a' }, { kind: 'stats', title: 'Resultados', stats: [{ value: '€12.5M', label: 'Ventas' }, { value: '[X %]', label: 'Margen' }], source: 'Datos internos', notes: 'b' },
        { kind: 'chart', title: 'Por región', chart: { type: 'bar', labels: ['Norte', 'Sur'], values: [4, 3], series_name: 'M€' }, notes: 'c' }, { kind: 'closing', title: 'Gracias', notes: 'd' }] }, { slides: [] }];
      const sp5 = await A.createDeck({ topic: 'Resultados de ventas del trimestre', count: 4 }); seq = null;
      eq(sp5[1].stats.map(s => s.value).join(), '[€12.5M],[X %]', 'las cifras sin respaldo, huecos para rellenar');
      eq(sp5[2].kind + ':' + sp5[2].rows.map(r => r.join(': ')).join('|'), 'table:Norte: [M€]|Sur: [M€]', 'el gráfico inventado, una tabla de huecos');
      assert(!sp5.quality.problems.some(p => p.code === 'invented-figures'), 'ninguna cifra inventada llega');
      // Code on a topic that isn't programming (sums as comments): its lines, as a list.
      seq = [{ title: 'Fracciones', slides: [{ kind: 'title', title: 'Fracciones', notes: 'a' }, { kind: 'code', title: 'MCM(6, 8)', code: { language: 'plaintext', code: '// Múltiplos de 6: 6, 12, 18, 24\n// Múltiplos de 8: 8, 16, 24\n// MCM(6, 8) = 24' }, notes: 'b' },
        { kind: 'closing', title: 'Gracias', notes: 'c' }] }, { slides: [] }];
      const sp6 = await A.createDeck({ topic: 'Sumar fracciones', count: 3 }); seq = null;
      // Laid out to be read: three steps of long text never in one column of thin strips; no text under 18 px.
      const FS = await W.eval("import('/src/features/ai/fromspec.js')");
      const long = 'Plantar árboles y crear nuevos espacios verdes en los barrios más vulnerables al calor antes del próximo verano.';
      const bl3 = FS.compose('steps', { steps: [1, 2, 3].map(i => ({ title: 'Acción ' + i, text: long })) }, { x: 80, y: 180, w: 1120, h: 460 }, { fg: '#222222', accent: '#0a6', accents: ['#0a6'], bodySize: 30, title: '#111111' });
      assert(new Set(bl3.filter(b => b.type === 'shape' && b.shape === 'rounded').map(b => b.x)).size > 1, 'en columnas, no en franjas de una columna');
      assert(bl3.filter(b => b.type === 'text').every(b => b.fontSize >= 18), 'ningún texto de menos de 18 px: ' + bl3.filter(b => b.type === 'text').map(b => b.fontSize).join());
      // A long key sentence in a wide bold font: measured, it never runs over the line under it.
      const ki = FS.compose('key_idea', { statement: 'Para sumar o restar fracciones necesitan tener el mismo denominador: el mínimo común múltiplo nos ayuda a encontrar ese denominador común más pequeño', text: 'Es nuestro puente para que los denominadores sean iguales.' },
        { x: 80, y: 180, w: 1120, h: 460 }, { fg: '#222222', accent: '#0a6', accents: ['#0a6'], bodySize: 30, title: '#111111', head: "'Poppins', sans-serif", titleSize: 48 });
      const [stB, txB] = ki.filter(b => b.type === 'text');
      assert(txB.y >= stB.y + stB.h, 'la frase y su texto, uno debajo del otro');
      const box = D.createElement('div'); box.style.cssText = `position:absolute;left:-9999px;width:${stB.w - 28}px;font:700 ${stB.fontSize}px Poppins, sans-serif;line-height:1.15`; box.textContent = stB.html.replace(/<[^>]+>/g, ''); D.body.appendChild(box);
      const real = box.getBoundingClientRect().height; box.remove();
      assert(real <= stB.h + 4, `la frase cabe en su sitio (${Math.round(real)} px de ${stB.h})`);
      // A model's answer that isn't JSON: asked once more, not lost.
      seq = ['Lo siento, aquí tienes la presentación…', { title: 'Bien', slides: [{ kind: 'title', title: 'Bien', notes: 'a' }, { kind: 'closing', title: 'Fin', notes: 'b' }] }];
      calls.length = 0; const sp7 = await A.createDeck({ topic: 'Algo', count: 2 }); seq = null;
      eq(calls.length + '|' + sp7.length, '2|2', 'pedida otra vez, y hecha');
      eq(sp6[1].kind + ':' + sp6[1].steps.map(s => s.text).join('|'), 'steps:Múltiplos de 6: 6, 12, 18, 24|Múltiplos de 8: 8, 16, 24|MCM(6, 8) = 24', 'el código fuera de lugar, sus líneas como pasos');
      eq(Q.deckQuality([{ kind: 'title', title: 'x' }, { kind: 'chart', title: 'P', chart: { type: 'line', labels: ['a', 'b'], values: [1, 2] }, source: 'Fuente: IEA 2023' }], { topic: 'Energía' }).problems.filter(p => p.code === 'invented-figures').length, 0, 'un gráfico con su fuente no es inventado'); assert(sp4.quality.score > q1.score, 'y mejor nota (' + q1.score + ' → ' + sp4.quality.score + ')');
      // Research on the web first: the brief goes to the slides, its pages become a «Fuentes» slide.
      { const real = W.fetch; let body = null;
        W.fetch = async (url, opts) => { body = JSON.parse(opts.body); return new W.Response(JSON.stringify({ choices: [{ message: { content: 'El 30 % [1] de la electricidad…',
          annotations: [{ type: 'url_citation', url_citation: { url: 'https://www.ree.es/informe', title: 'Informe REE' } }, { type: 'url_citation', url_citation: { url: 'https://www.ree.es/informe', title: 'dup' } }, { type: 'url_citation', url_citation: { url: 'javascript:x' } }] } }] })); };
        const rs = await A.research({ topic: 'Energía solar' }); W.fetch = real;
        eq(JSON.stringify(body.plugins), '[{"id":"web","max_results":6}]', 'investigar: busca en internet');
        eq(rs.sources.length + '|' + rs.sources[0].url, '1|https://www.ree.es/informe', 'investigar: sus fuentes, sin repetir ni direcciones raras');
        const sp = A.sourcesSpec(rs.sources, 'Fuentes'); assert(sp.bullets[0] === '[1] Informe REE — ree.es/informe', 'la diapositiva de fuentes');
        answer = { title: 'Solar', slides: [{ kind: 'title', title: 'Solar', notes: 'n' }] }; calls.length = 0;
        await A.createDeck({ topic: 'Solar', research: rs });
        assert(/Research brief from the web[\s\S]*El 30 % \[1\]/.test(calls[0].body.messages[1].content), 'las diapositivas parten de lo investigado'); }
      // Open answers marked against criteria: a mark and a comment each, only for the answers given.
      answer = { marks: [{ id: 'v1', score: 8, feedback: 'Bien explicado' }, { id: 'nadie', score: 10 }, { id: 'v2', score: 15, feedback: 'x' }] };
      const mk = await A.gradeOpen('¿Qué es la fotosíntesis?', 'Nombra la luz', [{ id: 'v1', text: 'Las plantas usan la luz' }, { id: 'v2', text: 'No sé' }]);
      eq(mk.map(m => m.id + m.score).join(), 'v1' + 8 + ',v2' + 10, 'corregir: notas de 0 a 10, solo de quien respondió');
      assert(/Nombra la luz/.test(calls.at(-1).body.messages[0].content), 'corregir: con los criterios');
      // A live quiz from the content: real polls (questions with their answer, activities), where they belong.
      reset(); R.slides.addSlide(); R.slides.addSlide(); const before = R.state.deck.slides.length;
      answer = { items: [{ kind: 'quiz', question: '¿Cuánto es 2+2?', options: ['3', '4'], answer: 1, after: 1 },
        { kind: 'match', question: 'Une', pairs: [['Sol', 'Estrella'], ['Luna', 'Satélite']], after: 2 },
        { kind: 'order', question: 'Ordena', steps: ['a', 'b', 'c'], after: 3 }, { kind: 'gaps', question: 'Completa', text: 'El [sol] calienta', after: 2 },
        { kind: 'quiz', question: 'Mal', options: ['solo una'] }] };
      eq(await A.addLiveQuiz({ count: 5, kinds: ['quiz', 'match', 'order', 'gaps'], where: 'spread' }), 4, 'cuestionario en directo: 4 (la que no tiene opciones, fuera)');
      const polls = R.state.deck.slides.map(x => x.blocks.find(b => b.type === 'poll')?.kind || '-');
      eq(polls.join(), '-,quiz,-,match,gaps,-,order', 'cada una tras su diapositiva: ' + polls.join());
      const qz = R.state.deck.slides[1].blocks[0]; eq(JSON.stringify(qz.correct), '[1]', 'con su respuesta correcta'); eq(qz.time, 20, 'y su tiempo');
      eq(R.state.deck.slides.length, before + 4, 'una diapositiva cada una');
      // The grid games too: a crossword's words without spaces (each with its clue), a word search's words, memory pairs.
      reset(); answer = { items: [{ kind: 'crossword', question: 'Planetas', words: [['Mar te', 'El rojo'], ['Tierra', 'El nuestro'], ['sinpista', '']] },
        { kind: 'wordsearch', question: 'Busca', words: ['sol', 'luna', 'a', 'cometa'] }, { kind: 'memory', question: 'Parejas', pairs: [['H', 'Hidrógeno'], ['O', 'Oxígeno=8']] },
        { kind: 'crossword', question: 'Sola', words: [['uno', 'una']] }] };
      eq(await A.addLiveQuiz({ count: 4, kinds: ['crossword', 'wordsearch', 'memory'] }), 3, 'crucigrama, sopa de letras y memoria (el de una palabra, fuera)');
      const games = R.state.deck.slides.flatMap(x => x.blocks).filter(b => b.type === 'poll');
      eq(games.map(b => b.kind + ':' + b.options.join('|')).join(' / '), 'crossword:Marte = El rojo|Tierra = El nuestro / wordsearch:sol|luna|cometa / memory:H = Hidrógeno|O = Oxígeno-8', 'sus opciones, listas para jugar');
      assert(/"kind":"crossword"[\s\S]*"kind":"memory"/.test(calls.at(-1).body.messages[0].content), 'la IA sabe cómo pedirlas');
      // The letter wheel: a line per letter; «contains» when the answer doesn't start with it; nonsense out.
      reset(); answer = { items: [{ kind: 'wheel', question: 'Repaso', items: [['A', 'Átomo', 'Lo más pequeño'], ['b', 'Carbono', 'Contiene la B'], ['ñ', 'Año', 'Una vuelta al Sol'], ['X', 'Sol', 'No tiene la X'], ['A', 'Agua', 'Repetida'], ['C', 'Célula = vida', 'Unidad de la vida']] }] };
      eq(await A.addLiveQuiz({ count: 1, kinds: ['wheel'] }), 1, 'rueda de letras');
      const wh = R.state.deck.slides.flatMap(x => x.blocks).find(b => b.type === 'poll');
      eq(wh.kind + ':' + wh.time + ':' + wh.options.join('|'), 'wheel:150:A = Átomo = Lo más pequeño|~B = Carbono = Contiene la B|~Ñ = Año = Una vuelta al Sol|C = Célula vida = Unidad de la vida', 'sus líneas: «~» si la contiene; sin letras que no están ni repetidas');
      eq(R.poll.publicActivity(wh).items.map(x => x.l + x.c).join(), 'A0,B1,C0,Ñ1', 'y se juega');
      // A review of the deck: what to change, each point with its slide.
      answer = { summary: 'Bien, pero larga', items: [{ slide: 2, kind: 'text', issue: 'Demasiado texto', fix: 'Divídela' }, { slide: 99, kind: 'raro', issue: 'x' }, { slide: 1, issue: '' }] };
      const rv = await A.reviewDeck();
      eq(rv.summary, 'Bien, pero larga', 'revisión: resumen'); eq(rv.items.length, 2, 'revisión: los puntos con algo que decir');
      eq(rv.items[0].slide + rv.items[0].kind, '2text', 'revisión: su diapositiva y tipo'); eq(rv.items[1].slide + rv.items[1].kind, R.state.deck.slides.length + 'message', 'revisión: números y tipos imposibles, acotados');
      // Asistente: propone (no cambia nada) y se aplica lo propuesto en un paso de deshacer
      reset(); R.slides.addSlide();
      const [s1, s2] = R.state.deck.slides, tid = s1.blocks[0].id, AG = R.aiAgent;
      answer = { message: 'Listo', ops: [
        { op: 'set_text', slide: 1, id: tid, text: 'Nuevo título' },
        { op: 'add_slide', after: 1, spec: { kind: 'bullets', title: 'Añadida', bullets: ['x'] } },
        { op: 'delete_slide', slide: 2 }, { op: 'set_notes', slide: 1, notes: 'Notas IA' },
        { op: 'set_background', slide: 'all', color: '#223344' }, { op: 'bogus' }] };
      const res = await AG.assistant('Cambia cosas', [], { perms: { delete: true, design: true, objects: true, animation: true } });
      eq(res.message, 'Listo', 'mensaje'); eq(res.ops.length, 5, 'operaciones válidas'); eq(res.dropped.length, 1, 'la desconocida se descarta');
      assert(s1.blocks[0].html !== 'Nuevo título' && R.state.deck.slides.length === 2, 'propuesta sin aplicar: nada cambia');
      eq(AG.applyOps(res.ops), 5, 'aplicadas');
      eq(s1.blocks[0].html, 'Nuevo título', 'texto'); eq(s1.notes, 'Notas IA', 'notas');
      eq(R.state.deck.slides.length, 2, 'añade una y borra la original 2'); assert(!R.state.deck.slides.includes(s2), 'borrada la correcta');
      assert(/Añadida/.test(R.state.deck.slides[1].blocks[0].html), 'insertada tras la 1');
      assert(R.state.deck.slides.every(s => s.background === '#223344'), 'fondo en todas');
      const ctx = calls.at(-1).body.messages.at(-1).content; assert(ctx.includes(tid), 'el asistente recibe los ids de los objetos');
      R.store.undo(); eq(R.state.deck.slides.length, 2, 'deshacer'); assert(R.state.deck.slides.some(x => x.id === s2.id), 'un solo paso de deshacer');
      eq(await A.readDocument(new W.File(['Hola documento'], 'd.txt')), 'Hola documento', 'leer .txt');
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(10);
      assert(D.getElementById('assistant-panel'), 'panel del asistente'); D.querySelector('[data-action="ai-assistant"]').click();
    } finally { W.fetch = realFetch; R.ai.disconnectAi(); }
  });

  // The assistant as an agent: simulated model answers, one per call (each one a JSON text).
  const agentMock = (W, answers, calls, { cost = 0.001, wait = null } = {}) => async (url, opts) => {
    const body = JSON.parse(opts.body); calls.push(body);
    if (wait) await new Promise((ok, ko) => { const t = setTimeout(ok, wait); opts.signal?.addEventListener('abort', () => { clearTimeout(t); ko(new W.DOMException('aborted', 'AbortError')); }); });
    const a = answers.length > 1 ? answers.shift() : answers[0];
    return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(a) } }], usage: { cost } }));
  };
  const ALL = { delete: true, design: true, objects: true, animation: true };

  await test('asistente: alcance, permisos y operaciones nuevas validadas', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0);
    const AG = R.aiAgent, [s1, s2] = R.state.deck.slides, t1 = s1.blocks[0].id, t2 = s2.blocks[0]?.id || 'x';
    const v = (ops, o = {}) => AG.validateOps(ops, { perms: ALL, ...o });
    // Alcance: diapositiva actual, selección, rango.
    let r = v([{ op: 'set_text', slide: 1, id: t1, text: 'A' }, { op: 'set_text', slide: 2, id: t2, text: 'B' }, { op: 'apply_palette', name: 'ocean' }], { scope: { kind: 'current' } });
    eq(r.ops.length, 1, 'solo la actual'); eq(r.dropped.map(d => d.code).join(), 'scope,scope', 'lo de fuera se descarta');
    R.state.ui.selection = t1; R.state.ui.multi = [t1];
    r = v([{ op: 'set_props', slide: 1, id: t1, props: { fontSize: 50 } }, { op: 'set_props', slide: 1, id: s1.blocks[1].id, props: { fontSize: 50 } }, { op: 'set_notes', slide: 1, notes: 'n' }], { scope: { kind: 'selection' } });
    eq(r.ops.length, 1, 'selección: solo el objeto elegido'); eq(r.dropped.length, 2, 'ni otros objetos ni la diapositiva');
    r = v([{ op: 'set_background', slide: 'all', color: '#112233' }], { scope: { kind: 'range', from: 2, to: 2 } });
    eq(r.ops.length, 1, '«all» se limita al rango'); eq(r.ops[0].sid, s2.id, 'en la 2');
    // Permisos.
    r = AG.validateOps([{ op: 'delete_slide', slide: 2 }, { op: 'set_props', slide: 1, id: t1, props: { x: 10 } }, { op: 'add_object', slide: 1, object: { type: 'text', text: 'hola', x: 10, y: 10, w: 200, h: 60 } },
      { op: 'set_transition', slide: 1, transition: 'fade' }, { op: 'set_text', slide: 1, id: t1, text: 'Siempre' }], { perms: { delete: false, design: false, objects: false, animation: false } });
    eq(r.dropped.map(d => d.code).join(), 'perm:delete,perm:design,perm:objects,perm:animation', 'cada permiso'); eq(r.ops.length, 1, 'el texto siempre');
    // Validación de las operaciones nuevas.
    const bad = [
      { op: 'set_props', slide: 1, id: t1, props: { x: 1200 } },                                  // se sale (w 1000)
      { op: 'set_props', slide: 1, id: 'no-existe', props: { x: 0 } },
      { op: 'set_props', slide: 1, id: t1, props: { fill: '#ff0000' } },                          // un texto no tiene relleno
      { op: 'set_props', slide: 1, id: t1, props: { fontSize: 900 } },
      { op: 'add_object', slide: 1, object: { type: 'video', x: 0, y: 0, w: 100, h: 100 } },
      { op: 'add_object', slide: 1, object: { type: 'image', src: 'https://ejemplo.org/a.png', alt: 'a', x: 0, y: 0, w: 100, h: 100 } },   // no viene de la búsqueda
      { op: 'add_object', slide: 1, object: { type: 'shape', x: 1000, y: 600, w: 400, h: 200 } },
      { op: 'set_animation', slide: 1, id: t1, effect: 'explotar' },
      { op: 'set_transition', slide: 1, transition: 'tornado' },
      { op: 'set_chart_data', slide: 1, id: t1, data: [{ label: 'a', value: 1 }] },                // no es un gráfico
      { op: 'set_props', slide: 9, id: t1, props: { x: 0 } }];
    r = v(bad);
    eq(r.ops.length, 0, 'ninguna pasa'); eq(r.dropped.map(d => d.code).join(), 'range,id,prop,value,type,value,range,value,value,type,slide', 'motivos');
    const good = [
      { op: 'set_props', slide: 1, id: t1, props: { fontSize: 60, color: '#ffcc00', textAlign: 'center', y: 200 } },
      { op: 'add_object', slide: 1, object: { type: 'chart', chartType: 'line', data: [{ label: '2020', value: 3 }, { label: '2021', value: 5 }], seriesName: 'Ventas', x: 100, y: 400, w: 500, h: 300 } },
      { op: 'add_object', slide: 2, object: { type: 'table', rows: [['País', 'GW'], ['<b>China</b>', '600']], x: 100, y: 100, w: 600, h: 200 } },
      { op: 'add_object', slide: 2, object: { type: 'icon', icon: 'rocket', x: 900, y: 100, w: 120, h: 120 } },
      { op: 'set_animation', slide: 1, id: t1, effect: 'fade-up', start: 'afterPrev' },
      { op: 'set_transition', slide: 2, transition: 'fade' }, { op: 'apply_palette', name: 'paper' }, { op: 'set_fonts', pair: 'classic' }];
    r = v(good); eq(r.dropped.length, 0, 'válidas: ' + JSON.stringify(r.dropped)); eq(r.ops.length, 8, 'todas');
    const json0 = JSON.stringify(R.state.deck);
    const after = AG.previewDeck(r.ops); eq(JSON.stringify(R.state.deck), json0, 'la vista previa es una copia');
    eq(AG.applyOps(r.ops), 8, 'aplicadas');
    const [a1, a2] = R.state.deck.slides, tb = a1.blocks.find(b => b.id === t1);
    eq(tb.fontSize, 60, 'tamaño'); eq(tb.textAlign, 'center', 'alineación'); eq(tb.animation.effect, 'fade-up', 'animación'); eq(tb.animation.start, 'afterPrev', 'empieza tras la anterior');
    const ch = a1.blocks.find(b => b.type === 'chart'); eq(ch.chartType, 'line', 'gráfico'); eq(ch.data[1].value, 5, 'datos');
    const tab = a2.blocks.find(b => b.type === 'table'); eq(tab.rows[1][0], '&lt;b&gt;China&lt;/b&gt;', 'celdas escapadas'); assert(tab.header, 'cabecera');
    eq(a2.blocks.find(b => b.type === 'icon').icon, 'rocket', 'icono'); eq(a2.transition, 'fade', 'transición');
    eq(R.state.deck.palette, 'paper', 'paleta'); eq(R.state.deck.fontPair, 'classic', 'tipografía');
    assert(after.slides[0].blocks.some(b => b.type === 'chart'), 'la copia tenía lo mismo');
    // Datos del gráfico y tabla sobre los objetos ya creados.
    r = v([{ op: 'set_chart_data', slide: 1, id: ch.id, data: [['A', 1], ['B', 2], ['C', 3]], series: [{ name: 'Meta', values: [2, 2, 2] }] },
      { op: 'set_table', slide: 2, id: tab.id, rows: [['x', 'y', 'z']], header: false }]);
    AG.applyOps(r.ops); eq(ch.data.length, 3, 'datos nuevos'); eq(ch.series[0].name, 'Meta', 'serie'); eq(tab.rows[0].length, 3, 'tabla nueva'); eq(tab.header, false, 'sin cabecera');
    R.store.undo(); const ch2 = R.state.deck.slides[0].blocks.find(b => b.id === ch.id), tab2 = R.state.deck.slides[1].blocks.find(b => b.id === tab.id);
    eq(ch2.data.length, 2, 'un paso de deshacer'); eq(tab2.rows.length, 2, 'también la tabla');
  });

  await test('asistente: bucle con get_slide y check que corrige un texto que no cabe; detener', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, calls = [], AG = R.aiAgent;
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const box = slide().blocks[1]; R.store.commit(() => Object.assign(box, { x: 140, y: 390, w: 300, h: 60, fontSize: 30, html: 'Corto' }));
    const long = 'Un texto bastante más largo que no puede caber de ninguna manera en una caja tan pequeña como esta';
    const answers = [
      { thoughts: 'miro', tool: 'get_slide', args: { slide: 1 } },
      { thoughts: 'compruebo', tool: 'check', args: { ops: [{ op: 'set_text', slide: 1, id: box.id, text: long }] } },
      { thoughts: 'corrijo', tool: 'check', args: { ops: [{ op: 'set_text', slide: 1, id: box.id, text: long }, { op: 'set_props', slide: 1, id: box.id, props: { w: 1000, h: 200, fontSize: 24 } }] } },
      { message: 'Texto ampliado y caja ajustada', ops: [{ op: 'set_text', slide: 1, id: box.id, text: long }, { op: 'set_props', slide: 1, id: box.id, props: { w: 1000, h: 200, fontSize: 24 } }], done: true }];
    W.fetch = agentMock(W, answers, calls);
    try {
      const steps = [], json0 = JSON.stringify(R.state.deck);
      const res = await AG.runAgent('Pon un texto más largo', { perms: ALL, onStep: s => steps.push(s.kind + (s.slide || '')) });
      eq(steps.join(), 'think,look1,think,check,think,check,think', 'pasos: mirar, comprobar dos veces, proponer');
      const r1 = calls[1].messages.at(-1).content, r2 = calls[2].messages.at(-1).content, r3 = calls[3].messages.at(-1).content;
      assert(/Result of get_slide/.test(r1) && r1.includes(box.id) && /"layouts"/.test(r1), 'get_slide devuelve el detalle');
      assert(/"problem":"overflow"/.test(r2), 'check avisa de que no cabe: ' + r2.slice(0, 300));
      assert(!/overflow/.test(r3) && /"ok":true/.test(r3), 'tras corregir, sin problemas: ' + r3.slice(0, 300));
      eq(res.ops.length, 2, 'propuesta'); eq(res.problems.filter(p => !p.before).length, 0, 'sin avisos');
      eq(res.cost.calls, 4, 'cuatro llamadas'); assert(Math.abs(res.cost.usd - 0.004) < 1e-9, 'coste sumado: ' + res.cost.usd);
      assert(calls[0].usage?.include, 'pide el coste real');
      eq(JSON.stringify(R.state.deck), json0, 'nada cambia hasta aplicar');
      // Máximo de pasos: si sigue pidiendo herramientas, se queda con lo último comprobado.
      calls.length = 0; W.fetch = agentMock(W, [{ tool: 'check', args: { ops: [{ op: 'set_notes', slide: 1, notes: 'n' }] } }], calls);
      const capped = await AG.runAgent('Notas', { perms: ALL, maxSteps: 3 });
      eq(calls.length, 3, 'tres llamadas como mucho'); eq(capped.ops.length, 1, 'propone lo comprobado');
      assert(/last tool call/.test(calls[2].messages.at(-1).content), 'avisa del último paso');
      // Detener.
      W.fetch = agentMock(W, [{ tool: 'get_slide', args: { slide: 1 } }], calls, { wait: 2000 });
      const ctrl = new W.AbortController(), p = AG.runAgent('Algo', { signal: ctrl.signal });
      await sleep(30); ctrl.abort();
      let err = null; try { await p; } catch (e) { err = e.message; }
      eq(err, 'STOPPED', 'detenido');
    } finally { W.fetch = real; R.ai.disconnectAi(); }
  });

  await test('asistente: entiende respuestas con otro formato y pide repetir una vacía; usa el modelo del agente', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, calls = [], AG = R.aiAgent;
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const spec = { kind: 'bullets', title: 'Conclusiones', bullets: ['Una', 'Dos'] };
    try {
      W.fetch = agentMock(W, [{ reply: 'Añado las conclusiones', changes: [{ op: 'add_slide', after: 1, spec }] }], calls);
      let res = await AG.runAgent('Añade una diapositiva de conclusiones', { perms: ALL });
      eq(res.ops.length, 1, '«changes» y «reply» valen como ops y message'); eq(res.message, 'Añado las conclusiones', 'el mensaje');
      eq(calls[0].model, AG.AGENT_MODEL, 'el modelo del agente si no se eligió otro');
      calls.length = 0;
      W.fetch = agentMock(W, [{ final: { message: 'Hecho', operations: [{ op: 'add_slide', after: 1, spec }] } }], calls);
      res = await AG.runAgent('Lo mismo', { perms: ALL }); eq(res.ops.length, 1, 'propuesta anidada en «final»');
      calls.length = 0;
      W.fetch = agentMock(W, [{ ok: true }, { message: 'Ahora sí', ops: [{ op: 'add_slide', after: 1, spec }], done: true }], calls);
      res = await AG.runAgent('Otra vez', { perms: ALL });
      eq(calls.length, 2, 'una respuesta vacía se pide de nuevo'); eq(res.ops.length, 1, 'y la segunda vale');
    } finally { W.fetch = real; R.ai.disconnectAi(); }
  });

  await test('tema: el asistente lo propone sin aplicarlo y el editor del tema lo aplica en un paso; su IA solo rellena', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, calls = [], AG = R.aiAgent, D = W.document;
    const TH = await W.eval("import('/src/features/design/theme.js')"), P = await W.eval("import('/src/features/design/palettes.js')"), E = await W.eval("import('/src/ui/dialogs/theme.js')");
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const t1 = slide().blocks[0].id, json0 = () => JSON.stringify(R.state.deck), start = json0(), bg0 = P.currentPalette().bg;
    try {
      // The assistant: a theme in its answer is a proposal, never an operation.
      W.fetch = agentMock(W, [{ message: 'Te propongo un tema marino', ops: [], done: true,
        theme: { name: 'Marino', bg: '#0B1D3A', fg: '#ffffff', accents: ['#d4a017', '#4fa3d1', 'rojo', '#12'], heading: 'montserrat', body: 'Comic Neue' } }], calls);
      let res = await AG.runAgent('Pon colores marinos y dorados', { perms: ALL });
      eq(res.ops.length, 0, 'ninguna operación'); eq(json0(), start, 'nada cambia');
      eq(res.theme.bg, '#0b1d3a', 'colores válidos'); eq(res.theme.accents.length, 6, 'seis acentos');
      eq(res.theme.accents[2], P.currentPalette().accents[2].toLowerCase(), 'lo que no vale se queda como estaba');
      eq(res.theme.heading, 'Montserrat', 'fuente del catálogo'); assert(res.theme.body !== 'Comic Neue', 'una que no está, no');
      assert(/theme editor/.test(calls[0].messages[0].content) && !/apply_palette/.test(calls[0].messages[0].content), 'se le explica el tema; ya no las operaciones de paleta');
      // A model that still gives apply_palette / set_fonts: taken as the proposal, out of the ops.
      W.fetch = agentMock(W, [{ message: 'Hecho', ops: [{ op: 'apply_palette', name: 'ocean' }, { op: 'set_fonts', pair: 'classic' }, { op: 'set_notes', slide: 1, notes: 'n' }], done: true }], calls);
      res = await AG.runAgent('Cambia la paleta', { perms: ALL });
      eq(res.ops.map(o => o.op).join(), 'set_notes', 'solo lo demás'); eq(res.theme.bg, P.PALETTES.ocean.bg.toLowerCase(), 'la paleta, como propuesta');
      eq(res.theme.heading, P.FONT_PAIRS.classic.heading, 'y sus fuentes');
      // The theme editor, from Design ▸ Themes, opened with the proposal.
      D.querySelector('[data-themes-open]').click(); await sleep(20);
      D.querySelector('[data-theme-custom]').click(); await sleep(20);
      let m = D.getElementById('theme-modal'); assert(m, 'Diseño ▸ Temas ▸ Personalizar el tema');
      assert(m.querySelector('.th-apply').disabled, 'sin cambios, no hay nada que aplicar');
      E.openThemeEditor({ name: 'Marino', bg: '#0b1d3a', fg: '#ffffff', accents: ['#d4a017'], heading: 'Montserrat', body: 'Lato' }); await sleep(20);
      m = D.getElementById('theme-modal'); eq(m.querySelector('.th-cols input').value, '#0b1d3a', 'la propuesta, en el formulario');
      eq(json0(), start, 'abrirlo no cambia nada');
      R.blocks.addShape('rect'); const sh = last(); await sleep(10); const acc0 = P.currentPalette().accents[0].toLowerCase();
      eq(sh.fill.toLowerCase(), acc0, '(la forma usa el acento 1)');
      m.querySelector('.th-apply').click(); await sleep(30);
      assert(!D.getElementById('theme-modal'), 'se cierra');
      eq(P.currentPalette().bg, '#0b1d3a', 'fondo'); eq(slide().blocks.find(b => b.id === sh.id).fill, '#d4a017', 'lo que usaba el tema toma el nuevo acento');
      assert(/Montserrat/.test(slide().blocks.find(b => b.id === t1).fontFamily || '') && /Lato/.test(R.state.deck.bodyFont), 'las fuentes');
      R.store.undo(); await sleep(10);
      eq(P.currentPalette().bg.toLowerCase(), bg0.toLowerCase(), 'colores y fuentes: un solo paso de deshacer'); eq(slide().blocks.find(b => b.id === sh.id).fill.toLowerCase(), acc0, 'la forma, como antes');
      // Its AI fills the form (unreadable text corrected), and nothing is applied.
      W.fetch = agentMock(W, [{ name: 'Otoño', bg: '#f4e9d8', fg: '#f4e9d8', accents: ['#b5542a', '#7a8b3c', '#d9a441', '#5b3a29', '#a33b20', '#c98b5a'], heading: 'Playfair Display', body: 'Lato', why: 'Tonos cálidos' }], calls);
      E.openThemeEditor(); await sleep(20); m = D.getElementById('theme-modal'); const before = json0();
      m.querySelector('.th-ask').value = 'otoñal'; m.querySelector('.th-go').click();
      for (let i = 0; i < 50 && m.querySelector('.th-cols input').value !== '#f4e9d8'; i++) await sleep(20);
      eq(m.querySelector('.th-cols input').value, '#f4e9d8', 'la propuesta en el formulario'); eq(m.querySelector('.th-fh').value, 'Playfair Display', 'con sus fuentes');
      assert(TH.contrast(m.querySelectorAll('.th-cols input')[1].value, '#f4e9d8') >= 4.5, 'texto ilegible corregido');
      eq(m.querySelector('.th-why').textContent, 'Tonos cálidos', 'dice qué eligió'); eq(calls.at(-1).messages.length, 2, 'una sola llamada');
      eq(json0(), before, 'nada aplicado todavía');
      m.querySelector('.th-cancel').click(); eq(json0(), before, 'cancelar no cambia nada');
    } finally { W.fetch = real; R.ai.disconnectAi(); D.getElementById('theme-modal')?.remove(); }
  });

  // A screenshot with a DAX measure and an equation on slide 1 (the owner's case: code asked for, formula kept).
  const DAX = 'Generacion_Año_Anterior =\nVAR AnioActual = MAX(owid_energy[year])\nRETURN\n    CALCULATE(SUM(owid_energy[Generacion_TWh]), owid_energy[year] = AnioActual - 1)';
  const LATEX = '\\text{Contribución al Total} = \\frac{\\text{Generación por Fuente}}{\\text{Generación Total}} \\times 100\\%';
  const codeScene = W => {
    const c = W.document.createElement('canvas'); c.width = 640; c.height = 360;
    const g = c.getContext('2d'); g.fillStyle = '#f3f3f3'; g.fillRect(0, 0, 640, 360); g.fillStyle = '#222'; g.font = '16px monospace';
    DAX.split('\n').forEach((l, i) => g.fillText(l, 12, 40 + i * 24));
    const img = { id: 'shot1', type: 'image', src: c.toDataURL('image/png'), alt: 'Captura de Power BI', x: 660, y: 150, w: 560, h: 315, rotation: 0, animation: null };
    const eqb = { id: 'eq1', type: 'math', latex: LATEX, x: 80, y: 520, w: 900, h: 120, rotation: 0, animation: null };
    R.store.commit(() => R.store.currentSlide().blocks.push(img, eqb));
    return { img, eqb };
  };
  // The model and the vision model, simulated: the transcription is counted apart.
  const codeMock = (W, answers, calls, seen) => {
    const agentCall = agentMock(W, answers, calls);
    return async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (/You transcribe code/.test(body.messages[0].content)) {
        seen.vision.push(body);
        return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ language: 'DAX', code: DAX, confidence: 0.93 }) } }], usage: { cost: 0.0004 } }));
      }
      return agentCall(url, opts);
    };
  };

  await test('asistente: si la primera lectura del código sale cortada, se recorta su zona y se lee otra vez; las lecturas antiguas se rehacen', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, V = await W.eval("import('/src/features/ai/vision.js')"), shots = [];
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const { img } = codeScene(W);
    const cut = DAX.split('\n').slice(0, 2).join('\n');
    W.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body), pic = body.messages[1].content.find(p => p.type === 'image_url').image_url.url; shots.push({ model: body.model, pic });
      const answer = shots.length === 1 ? { language: 'dax', code: cut + '\nRETURN\n    CALCULATE(', confidence: 0.6, box: [0, 50, 600, 420] } : { language: 'dax', code: DAX, confidence: 0.95, box: [0, 0, 1000, 1000] };
      return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }], usage: { cost: 0.0004 } }));
    };
    try {
      img.aiCode = { hash: V.srcHash(img.src), language: 'dax', code: cut, confidence: 0.9 };   // (an old, short reading)
      eq(V.codeOf(img), null, 'la lectura antigua no se reutiliza');
      const r = await V.transcribeImage(img);
      eq(shots.length, 2, 'dos miradas: la imagen entera y la zona del código');
      eq(shots[0].model, V.CODE_MODEL, 'con el modelo para leer código');
      assert(shots[1].pic !== shots[0].pic, 'la segunda, una imagen distinta (el recorte)');
      eq(r.code, DAX, 'se queda con la lectura completa'); eq(r.v, 2, 'marcada con la versión nueva');
      assert(V.looksCut('CALCULATE(') && !V.looksCut(DAX), 'paréntesis sin cerrar = lectura cortada');
    } finally { W.fetch = real; R.ai.disconnectAi(); }
  });

  await test('asistente: el código de una captura en un bloque de código (leído una vez), código y ecuaciones validados', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, calls = [], seen = { vision: [] }, AG = R.aiAgent, V = await W.eval("import('/src/features/ai/vision.js')");
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const { img } = codeScene(W);
    const proposal = { message: 'Aquí tienes la diapositiva con el código', done: true,
      ops: [{ op: 'add_slide', after: 1, spec: { kind: 'code', title: 'La medida en DAX', code: { language: 'dax', from_image: 'shot1' }, bullets: ['VAR guarda el año actual', 'CALCULATE suma el año anterior'] } }] };
    W.fetch = codeMock(W, [proposal], calls, seen);
    try {
      const steps = [];
      let res = await AG.runAgent('pon el código de la captura en una diapositiva', { perms: ALL, onStep: s => steps.push(s.kind) });
      eq(seen.vision.length, 1, 'la imagen se lee una vez');
      const part = seen.vision[0].messages[1].content.find(p => p.type === 'image_url');
      assert(/^data:image\/jpeg;base64,/.test(part.image_url.url) && V.bytesOf(part.image_url.url) < 450 * 1024, 'en JPEG y reducida');
      assert(steps.includes('read'), 'se dice que lee el código: ' + steps);
      eq(img.aiCode?.hash, V.srcHash(img.src), 'la lectura se guarda en la imagen'); eq(img.aiCode.code, DAX, 'tal cual');
      assert(calls[0].messages.at(-1).content.includes('owid_energy[Generacion_TWh]') && /"codeRead"/.test(calls[0].messages.at(-1).content), 'el modelo recibe el código leído');
      const sys = calls[0].messages[0].content;
      assert(/"code"/.test(sys) && /type "math"/.test(sys) && /read_code/.test(sys) && /dax/.test(sys) && /NEVER code in a text box/.test(sys) && /"code": title, code/.test(sys), 'el prompt describe código y ecuaciones');
      assert(/"math": title, latex/.test(sys), 'y la clase de diapositiva «math»');
      eq(res.ops.length, 1, 'propuesta'); eq(res.ops[0].spec.code.language, 'dax', 'lenguaje DAX'); eq(res.ops[0].spec.code.code, DAX, 'el código literal');
      AG.applyOps(res.ops);
      const ns = R.state.deck.slides[1], cb = ns.blocks.find(b => b.type === 'code');
      assert(cb && cb.lang === 'dax' && cb.code === DAX, 'un bloque de código DAX con el código literal: ' + JSON.stringify(cb));
      assert(!ns.blocks.some(b => b.type === 'text' && /CALCULATE\(SUM/.test(b.html || '')), 'no en un cuadro de texto');
      assert(ns.blocks.some(b => b.type === 'text' && /VAR guarda/.test(b.html || '') && (b.x >= cb.x + cb.w - 1 || b.y >= cb.y + cb.h - 1)), 'la explicación al lado, o debajo si el código no se leería a 18 px con ella al lado');
      assert(cb.fontSize >= 18, 'el código, legible: ' + cb.fontSize + ' px');
      assert(R.state.deck.slides[0].blocks.some(b => b.id === 'shot1'), 'la captura se queda');
      // Otra vez: ya leída, gratis.
      calls.length = 0; W.fetch = codeMock(W, [proposal], calls, seen);
      res = await AG.runAgent('pon el código de la captura en una diapositiva', { perms: ALL });
      eq(seen.vision.length, 1, 'la segunda vez no se paga otra lectura'); eq(res.ops[0].spec.code.code, DAX, 'y vale igual');
      // read_code como herramienta, también desde la caché.
      calls.length = 0; W.fetch = codeMock(W, [{ tool: 'read_code', args: { slide: 1, id: 'shot1' } }, { message: 'Hecho', ops: [{ op: 'add_object', slide: 1, object: { type: 'code', from_image: 'shot1', x: 80, y: 150, w: 560, h: 300 } }], done: true }], calls, seen);
      res = await AG.runAgent('añade el bloque', { perms: ALL });
      assert(/Result of read_code/.test(calls[1].messages.at(-1).content) && calls[1].messages.at(-1).content.includes('AnioActual'), 'read_code devuelve el código');
      eq(seen.vision.length, 1, 'sin otra lectura'); eq(res.ops[0].object.lang, 'dax', 'objeto de código'); eq(res.ops[0].object.code, DAX, 'literal');
    } finally { W.fetch = real; R.ai.disconnectAi(); }
    // Validación: lenguajes permitidos, tamaño, LaTeX.
    const v = ops => AG.validateOps(ops, { perms: ALL });
    let r = v([{ op: 'add_object', slide: 1, object: { type: 'code', language: 'm', code: '```m\nlet\n\tx = 1\nin\n    x\n```', caption: 'Un paso de Power Query', x: 80, y: 100, w: 500, h: 200 } },
      { op: 'add_object', slide: 1, object: { type: 'code', language: 'cobol', code: 'MOVE A TO B', x: 80, y: 100, w: 500, h: 200 } },
      { op: 'add_object', slide: 1, object: { type: 'code', language: 'sql', code: Array.from({ length: 70 }, (_, i) => `SELECT ${i};`).join('\n'), x: 80, y: 100, w: 500, h: 200 } },
      { op: 'add_object', slide: 1, object: { type: 'math', latex: '$$E = mc^2$$', x: 80, y: 400, w: 400, h: 100 } },
      { op: 'add_object', slide: 1, object: { type: 'math', latex: '\\frac{a}{b', x: 80, y: 400, w: 400, h: 100 } },
      { op: 'add_object', slide: 1, object: { type: 'code', from_image: 'no-existe', x: 80, y: 100, w: 500, h: 200 } }]);
    eq(r.dropped.map(d => d.code).join(), 'value,value,value,value', 'lenguaje, tamaño, LaTeX roto y captura sin leer: fuera');
    const code = r.ops.find(o => o.object.type === 'code').object;
    eq(code.lang, 'powerquery', 'M → powerquery'); eq(code.code, 'let\n    x = 1\nin\n    x', 'sin la valla de Markdown, tabuladores como espacios');
    assert(r.ops.some(o => o.object.type === 'text' && /Un paso de Power Query/.test(o.object.html)), 'con su pie');
    eq(r.ops.find(o => o.object.type === 'math').object.latex, 'E = mc^2', 'ecuación sin los $$');
  });

  await test('asistente: rehacer conserva ecuaciones, código e imágenes; nunca sustituye una ecuación por su texto', async () => {
    reset(); const W = frame.contentWindow, AG = R.aiAgent, RV = await W.eval("import('/src/features/ai/review.js')");
    const { eqb } = codeScene(W), s1 = slide();
    const v = ops => AG.validateOps(ops, { perms: ALL });
    // Rehacer la diapositiva: la ecuación y la captura se quedan, con sitio para ellas.
    let r = v([{ op: 'replace_slide', slide: 1, spec: { kind: 'bullets', title: 'Generación por fuente', bullets: ['Qué parte aporta cada fuente', 'Se compara con el total', 'En porcentaje'] } }]);
    eq(r.ops.length, 1, 'rehacer'); eq(RV.lossOf(r.ops[0]).before.includes('Contribución'), false, 'la ecuación no figura entre lo que se pierde');
    AG.applyOps(r.ops);
    const m = s1.blocks.find(b => b.id === 'eq1'), shot = s1.blocks.find(b => b.id === 'shot1');
    assert(m && m.latex === LATEX, 'la ecuación sigue, igual'); assert(shot, 'y la captura');
    const over = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const body = s1.blocks.filter(b => b.type === 'text' && /Qué parte/.test(b.html || ''));
    assert(body.length && body.every(b => over(b, m) < 400 && over(b, shot) < 400), 'con sitio: el texto no las tapa ' + JSON.stringify(s1.blocks.map(b => [b.type, b.x, b.y, b.w, b.h])));
    R.store.undo();
    // Un modelo que intenta cambiar la ecuación por texto: rebajado y avisado.
    const bodyId = slide().blocks[1].id;
    r = v([{ op: 'replace_slide', slide: 1, spec: { kind: 'bullets', title: 'La fórmula', bullets: ['Contribución al Total = Generación por Fuente / Generación Total × 100%', 'Mide el peso de cada fuente en el total'] }, remove: ['eq1'] },
      { op: 'set_text', slide: 1, id: bodyId, text: 'Contribución al Total = Generación por Fuente / Generación Total × 100%' },
      { op: 'add_object', slide: 1, object: { type: 'text', text: '$$\\text{Contribución al Total} = \\frac{\\text{Generación por Fuente}}{\\text{Generación Total}} \\times 100\\%$$', x: 80, y: 200, w: 900, h: 100 } }]);
    eq(r.dropped.filter(d => d.code === 'native').length, 2, 'el texto que la repite y su borrado, fuera: ' + JSON.stringify(r.dropped.map(d => [d.op.op, d.code])));
    const rs = r.ops.find(o => o.op === 'replace_slide');
    eq(JSON.stringify(rs.spec.bullets), JSON.stringify(['Mide el peso de cada fuente en el total']), 'la línea que copia la fórmula, quitada');
    assert(!r.ops.some(o => o.op === 'delete_object'), 'la ecuación no se borra');
    eq(r.ops.find(o => o.op === 'add_object').object.type, 'math', '«$$…$$» como texto: una ecuación de verdad');
    // Quitar una ecuación, una imagen…: «Quita» y empieza sin marcar.
    r = v([{ op: 'replace_slide', slide: 1, spec: { kind: 'bullets', title: 'Otra', bullets: ['Uno', 'Dos', 'Tres'] }, remove: ['shot1'] }, { op: 'delete_object', slide: 1, id: 'eq1' }]);
    const dels = r.ops.filter(o => o.op === 'delete_object');
    eq(dels.length, 2, 'cada objeto que se quita, un cambio aparte');
    assert(dels.every(o => RV.removesNative(o) && RV.lossOf(o).kind === 'remove'), '«Quita»');
    eq(RV.protectDefaults(dels).map(x => x.on).join(), 'false,false', 'protegido: sin marcar');
    // Texto «$$…$$» → ecuación en su sitio.
    const tb = slide().blocks[1]; R.store.commit(() => { tb.html = '$$a^2 + b^2 = c^2$$'; });
    r = v([{ op: 'text_to_math', slide: 1, id: tb.id }]); eq(r.ops.length, 1, 'convertir en ecuación');
    eq(RV.lossOf(r.ops[0]), null, 'no se pierde nada');
    AG.applyOps(r.ops);
    const nm = slide().blocks.find(b => b.type === 'math' && b.latex === 'a^2 + b^2 = c^2');
    assert(nm && nm.x === tb.x && nm.y === tb.y && !slide().blocks.includes(tb), 'una ecuación en el lugar del texto');
    r = v([{ op: 'set_math', slide: 1, id: 'eq1', latex: 'x^2' }, { op: 'text_to_math', slide: 1, id: slide().blocks[0].id }]);
    eq(r.ops.length, 1, 'set_math vale; un texto que no es una fórmula no se convierte'); eq(RV.lossOf(r.ops[0]).what, 'math', 'cambiar la ecuación se ve como sustitución');
  });

  await test('asistente: la conversación se guarda por presentación y «Nueva» la vacía', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0);
    const W = frame.contentWindow, real = W.fetch, calls = [], P = await W.eval("import('/src/ui/dialogs/assistant.js')");
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    W.fetch = agentMock(W, [{ message: 'Hola, te ayudo', done: true, ops: [] }], calls);
    const panelOf = () => D.getElementById('assistant-panel'), key = 'revela.chat.' + R.state.deck.slides[0].id;
    const toggle = async () => { D.querySelector('[data-action="ai-assistant"]').click(); await sleep(30); };
    try {
      await toggle();
      panelOf().querySelector('textarea').value = '¿Qué tal?'; panelOf().querySelector('.as-send').click(); await sleep(30);
      for (let i = 0; i < 100 && P.assistantState().busy; i++) await sleep(20); await sleep(20);
      const saved = JSON.parse(W.localStorage.getItem(key) || '[]');
      eq(saved.map(m => m.role).join(), 'user,assistant', 'guardada en el navegador, con su presentación');
      assert(/Recuerda 2/.test(panelOf().querySelector('.as-mem').textContent), 'dice cuánto recuerda');
      // Como al recargar: el panel se vuelve a hacer con lo guardado.
      await toggle(); P.resetAssistant(); W.localStorage.setItem(key, JSON.stringify(saved)); await toggle();
      eq(P.assistantState().log, 2, 'recupera la conversación'); assert(/Hola, te ayudo/.test(panelOf().querySelector('.as-log').textContent), 'y se ve');
      panelOf().querySelector('.as-newchat').click(); await sleep(40);
      eq(P.assistantState().log, 0, '«Nueva» la vacía'); eq(W.localStorage.getItem(key), null, 'y la borra del navegador');
      assert(!/Hola, te ayudo/.test(panelOf().querySelector('.as-log').textContent), 'el panel empieza de cero');
    } finally {
      W.fetch = real; R.ai.disconnectAi(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant();
      if (panelOf()) D.querySelector('[data-action="ai-assistant"]').click();
    }
  });

  await test('asistente: si no está claro, pregunta con respuestas para pulsar (y la tarjeta del tema)', async () => {
    reset();
    const W = frame.contentWindow, real = W.fetch, calls = [], P = await W.eval("import('/src/ui/dialogs/assistant.js')"), AG = R.aiAgent;
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    eq(AG.askOptions(['A', ' A ', 'B', '', 7]).join(), 'A,B,7', 'respuestas limpias y sin repetir'); eq(AG.askOptions(['Solo una']), null, 'una sola no es elegir');
    eq(AG.askOptions({ options: ['x', 'y'] }).join(), 'x,y', 'también como { options }');
    W.fetch = agentMock(W, [{ message: '¿Cuáles son los colores de tu marca?', ops: [], ask: ['Azul y blanco', 'Verde y gris', 'Te los digo yo'], done: true },
      { message: 'Te propongo este tema', ops: [], theme: { bg: '#ffffff', fg: '#10233f', accents: ['#1f5fbf'] }, done: true }], calls);
    const panelOf = () => D.getElementById('assistant-panel'), json0 = JSON.stringify(R.state.deck);
    const wait = async () => { await sleep(30); for (let i = 0; i < 100 && P.assistantState().busy; i++) await sleep(20); await sleep(20); };
    try {
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
      await AG.runAgent('x', { perms: ALL }); assert(/ASK instead of guessing/.test(calls[0].messages[0].content), 'se le dice que pregunte');
      calls.length = 0; W.fetch = agentMock(W, [{ message: '¿Cuáles son los colores de tu marca?', ops: [], ask: ['Azul y blanco', 'Verde y gris', 'Te los digo yo'], done: true },
        { message: 'Te propongo este tema', ops: [], theme: { bg: '#ffffff', fg: '#10233f', accents: ['#1f5fbf'] }, done: true }], calls);
      panelOf().querySelector('textarea').value = 'Pon los colores de mi marca'; panelOf().querySelector('.as-send').click(); await wait();
      const ch = panelOf().querySelectorAll('.as-choices button');
      eq([...ch].map(b => b.textContent).join('|'), 'Azul y blanco|Verde y gris|Te los digo yo', 'las respuestas, para pulsar');
      eq(JSON.stringify(R.state.deck), json0, 'preguntar no cambia nada');
      ch[0].click(); await wait();
      eq(calls.at(-1).messages.at(-1).content.split('Request: ').at(-1), 'Azul y blanco', 'la respuesta pulsada es el siguiente mensaje');
      assert(calls.at(-1).messages.some(m => m.role === 'assistant' && /colores de tu marca/.test(m.content)), 'con la pregunta en la conversación');
      eq(panelOf().querySelectorAll('.as-choices').length, 0, 'contestada, las respuestas se van');
      const card = panelOf().querySelector('.as-theme'); assert(card, 'la tarjeta del tema');
      eq(JSON.stringify(R.state.deck), json0, 'la tarjeta no aplica nada');
      card.querySelector('button').click(); await sleep(20);
      eq(D.querySelector('#theme-modal .th-cols input').value, '#ffffff', 'abre el editor del tema con la propuesta');
    } finally {
      W.fetch = real; R.ai.disconnectAi(); D.getElementById('theme-modal')?.remove(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant();
      if (panelOf()) D.querySelector('[data-action="ai-assistant"]').click();
    }
  });

  await test('diseñar la plantilla con IA: tres diseños dibujados, uno aplicado (tema, fondo, títulos, adornos y portadas) y se deshace de una vez', async () => {
    reset(); R.slides.addSlide('titleContent');
    const W = frame.contentWindow, real = W.fetch, calls = [];
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const d1 = { name: 'Marino', why: 'Sobrio, para un congreso', theme: { name: 'Marino', bg: '#0b1d3a', fg: '#0c0c0c', accents: ['#d4a017', '#4cc9f0'], heading: 'Montserrat', body: 'Lato' },
      background: { color: 'bg', to: '#13294f', angle: 160 }, title: { align: 'center', color: 'accent1' },
      decor: [{ shape: 'rect', x: 0, y: 690, w: 1280, h: 30, color: 'accent1' }, { shape: 'ellipse', x: 300, y: 200, w: 700, h: 400, color: 'accent2', opacity: 90 },
        { shape: 'rect', x: 2000, y: 0, w: 10, h: 10, color: 'accent1' }, { shape: 'nope', x: 1200, y: 20, w: 60, h: 60, color: '#zzzzzz' }],
      cover: { decor: [{ shape: 'ellipse', x: -200, y: -200, w: 600, h: 600, color: 'accent1', to: 'accent2' }] } };
    const d2 = { ...d1, name: 'Claro', theme: { ...d1.theme, bg: '#ffffff', fg: '#222222' }, background: { color: '#ffffff' }, cover: null };
    try {
      W.fetch = agentMock(W, [{ designs: [d1, d2, { nothing: true }, d1] }], calls);
      const json0 = JSON.stringify(R.state.deck);
      D.querySelector('.ribbon-page[data-page="design"] [data-action="master-ai"]').click();
      let m; for (let i = 0; i < 40 && !(m = D.getElementById('mai-modal')); i++) await sleep(25);
      m.querySelector('.mai-ask').value = 'congreso médico, sobrio, azul marino'; m.querySelector('.mai-go').click();
      for (let i = 0; i < 100 && m.querySelectorAll('.mai-card').length < 3; i++) await sleep(20);
      eq(m.querySelectorAll('.mai-card').length, 3, 'tres diseños (los que vinieron bien)');
      eq(m.querySelectorAll('.mai-card')[0].querySelectorAll('.mai-thumb').length, 2, 'cada uno, su portada y una diapositiva');
      assert(/Marino/.test(m.querySelector('.mai-info b').textContent) && /congreso/.test(m.querySelector('.mai-info span').textContent), 'con su nombre y por qué');
      assert(/template designer/.test(calls[0].messages[0].content) && /congreso médico/.test(calls[0].messages[1].content), 'la petición a la IA');
      eq(JSON.stringify(R.state.deck), json0, 'proponer no cambia nada');
      m.querySelector('[data-apply="0"]').click(); await sleep(30);
      const dk = R.state.deck, ma = dk.master, deco = ma.blocks.filter(b => b.aiDecor);
      eq(dk.customPalette?.bg || '', '#0b1d3a', 'el tema: su fondo');
      assert(/linear-gradient\(160deg, #0b1d3a, #13294f\)/.test(ma.background) && dk.slides.every(s => s.background === ma.background), 'el fondo degradado, en el patrón y en las diapositivas');
      eq(deco.length, 3, 'los adornos válidos (el que cae fuera, no)');
      eq(deco[0].fill, '#d4a017', 'con los colores del tema'); assert(deco[1].opacity <= 15, 'el que tapa el texto, tenue: ' + deco[1].opacity);
      assert(deco.every(b => b.decorative), 'decorativos (no los lee el lector de pantalla)');
      eq(deco[2].shape + deco[2].fill, 'rect#d4a017', 'una forma o un color que no existen: los de siempre');
      const cover = dk.layouts.find(l => l.id === 'title');
      assert(cover.hideMaster && cover.blocks.some(b => b.aiDecor && b.fill2 === '#4cc9f0'), 'la portada, con sus propios adornos');
      assert(!dk.layouts.find(l => l.id === 'titleContent').hideMaster, 'las demás, con los del patrón');
      eq(ma.styles.title.align + ma.styles.title.color, 'center#d4a017', 'los títulos: centrados y del color principal');
      assert(R.render() !== false && D.querySelector('#stage'), 'se dibuja');
      const bare = j => JSON.stringify({ ...JSON.parse(j), savedAt: 0 });
      R.store.undo(); eq(bare(JSON.stringify(R.state.deck)), bare(json0), 'se deshace de una vez');
      // The text is always readable: a text colour lost on the background becomes white or black.
      const MA = await W.eval("import('/src/features/ai/masterai.js')");
      eq(MA.cleanDesign(d1).theme.fg, '#ffffff', 'texto ilegible sobre el fondo: blanco');
      const cv = MA.cleanDesign({ ...d2, cover: { background: { color: 'accent1' }, decor: [] } });
      eq(cv.cover.title, '#222222', 'una portada con fondo del color del título (dorado): el título, en el texto oscuro, que se lee');
    } finally { W.fetch = real; R.ai.disconnectAi(); D.getElementById('mai-modal')?.remove(); }
  });

  await test('diseñar con IA partiendo de una plantilla de PowerPoint: tal cual, o con los cambios pedidos, en un solo paso', async () => {
    reset();
    const W = frame.contentWindow, real = W.fetch, calls = [];
    // The template: «Faceta» (.potx: its theme, its 11 layouts, titles centred).
    const file = new W.File([await (await fetch(new URL('fixtures/themes/faceta.potx', location.href))).blob()], 'Faceta.potx');
    R.slides.addSlide('titleContent');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    try {
      const M = await W.eval("import('/src/ui/dialogs/masterai.js')"), dlg = M.openMasterDesign(), m = D.getElementById('mai-modal');
      assert(m.querySelector('.mai-tpl'), 'el botón para partir de una plantilla');
      assert(await dlg.useTemplate(file), 'se lee la plantilla');
      eq(m.querySelectorAll('.mai-card').length, 1, 'aparece tal cual, para aplicarla así');
      assert(/Faceta/.test(m.querySelector('.mai-tpl-name').textContent) && m.querySelectorAll('.mai-card .mai-thumb').length === 2, 'con su nombre y dibujada');
      // Changes asked on it: the title to the left, red as the main colour, a band below; the rest, the template's.
      W.fetch = agentMock(W, [{ designs: [{ name: 'Faceta roja', why: 'Con el rojo y el título a la izquierda', title: { align: 'left' }, theme: { accents: ['#e63946'] },
        decor: [{ shape: 'rect', x: 0, y: 700, w: 1280, h: 20, color: 'accent1' }] }] }], calls);
      m.querySelector('.mai-ask').value = 'el título a la izquierda, el rojo como color principal y una franja abajo'; await dlg.ask();
      eq(m.querySelectorAll('.mai-card').length, 2, 'la plantilla tal cual y la propuesta');
      assert(/START FROM THE TEMPLATE/.test(calls[0].messages[0].content) && /"layouts":\["Portada"/.test(calls[0].messages[1].content), 'a la IA se le da la plantilla y se le pide partir de ella');
      const json0 = JSON.stringify({ ...R.state.deck, savedAt: 0 });
      m.querySelector('[data-apply="1"]').click(); await sleep(30);
      const dk = R.state.deck;
      eq(dk.layouts.length, 11, 'los diseños de la plantilla'); eq(dk.officeTheme?.name, 'Faceta', 'su tema');
      assert(dk.slides[1].layoutId?.startsWith('pptx-'), 'las diapositivas, con el suyo');
      eq(dk.master.styles.title.align, 'left', 'el cambio pedido: el título a la izquierda');
      eq(dk.customPalette?.accents?.[0], '#e63946', 'y el rojo');
      eq(dk.master.blocks.filter(b => b.aiDecor).map(b => b.fill).join(), '#e63946', 'y la franja');
      R.store.undo(); eq(JSON.stringify({ ...R.state.deck, savedAt: 0 }), json0, 'se deshace de una vez');
      // As it is: the template on the presentation, nothing else.
      dlg.close(); const d2 = M.openMasterDesign(); await d2.useTemplate(file);
      D.querySelector('#mai-modal [data-apply="0"]').click(); await sleep(30);
      eq(R.state.deck.layouts.length + '|' + R.state.deck.master.styles.title.align, '11|center', 'tal cual: la plantilla, con su título centrado');
    } finally { W.fetch = real; R.ai.disconnectAi(); D.getElementById('mai-modal')?.remove(); }
  });

  await test('adjuntos para la IA: fotos y documentos leídos, enviados con la petición y una foto puesta en una diapositiva', async () => {
    reset();
    const W = frame.contentWindow, real = W.fetch, calls = [], AG = R.aiAgent, P = await W.eval("import('/src/ui/dialogs/assistant.js')");
    const AT = await W.eval("import('/src/features/ai/attach.js')"), TA = await W.eval("import('/src/features/ai/themeai.js')");
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    // A photo (made here) and a text file, as the browser gives them.
    const c = D.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d'); g.fillStyle = '#c1121f'; g.fillRect(0, 0, 1600, 1200); g.fillStyle = '#003049'; g.fillRect(400, 300, 800, 600);
    const png = await new Promise(ok => c.toBlob(ok, 'image/png'));
    const photo = new W.File([png], 'pizarra.png', { type: 'image/png' }), notes = new W.File(['Ideas: energía solar, baterías y redes'], 'notas.txt', { type: 'text/plain' });
    const [pic] = await AT.readAttachment(photo), [doc] = await AT.readAttachment(notes);
    eq(pic.kind, 'image', 'una foto'); assert(/^data:image\/jpeg;base64,/.test(pic.url) && pic.url.length < 400 * 1024, 'pequeña para la IA');
    eq(`${pic.w}×${pic.h}`, '1600×1200', 'con su tamaño'); assert(/^data:image\//.test(pic.full), 'y otra para la diapositiva');
    eq(doc.kind + '|' + doc.text, 'text|Ideas: energía solar, baterías y redes', 'un texto');
    let err = null; try { await AT.readAttachment(new W.File(['x'], 'informe.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })); } catch (e) { err = e.message; }
    eq(err, 'ATTACH_TYPE', 'lo que no sabe leer, lo dice');
    try {
      // The assistant: they go with the request; "attachment:1" puts the photo on a slide (never another src).
      W.fetch = agentMock(W, [{ message: 'Pongo tu foto', done: true, ops: [
        { op: 'add_object', slide: 1, object: { type: 'image', src: 'attachment:1', alt: 'La pizarra', x: 100, y: 100, w: 400, h: 300 } },
        { op: 'add_object', slide: 1, object: { type: 'image', src: 'attachment:7', alt: 'Otra', x: 100, y: 100, w: 400, h: 300 } }] }], calls);
      const res = await AG.runAgent('Pon mi foto y usa mis notas', { perms: ALL, attachments: [pic, doc] });
      const sent = calls[0].messages.at(-1).content;
      assert(Array.isArray(sent) && sent.some(x => x.type === 'image_url' && x.image_url.url === pic.url), 'la foto va con la petición');
      assert(/Attached document «notas\.txt»:\nIdeas: energía solar/.test(sent[0].text) && /attachment:1 «pizarra\.png» \(1600×1200\)/.test(sent[0].text), 'y el texto de las notas, y qué es cada foto');
      assert(/attach documents/.test(calls[0].messages[0].content), 'se le explica');
      eq(res.ops.length, 1, 'la foto adjunta, sí'); eq(res.ops[0].object.src, pic.full, 'a tamaño de diapositiva'); eq(res.dropped[0].code, 'value', 'un adjunto que no existe, no');
      calls.length = 0; W.fetch = agentMock(W, [{ message: 'Hola', ops: [], done: true }], calls);
      await AG.runAgent('Hola', { perms: ALL }); eq(typeof calls[0].messages.at(-1).content, 'string', 'sin adjuntos, como siempre');
      // The theme editor's AI: the colours from a logo.
      calls.length = 0; W.fetch = agentMock(W, [{ name: 'Marca', bg: '#ffffff', fg: '#003049', accents: ['#c1121f'], heading: 'Montserrat', body: 'Lato' }], calls);
      const th = await TA.proposeTheme('', { attachments: [pic] });
      assert(calls[0].messages[1].content.some(x => x.type === 'image_url'), 'el logo va con la petición del tema'); eq(th.accents[0], '#c1121f', 'y sus colores');
      // «Crear presentación con IA»: photos of notes to build it from.
      const AU = await W.eval("import('/src/features/ai/authoring.js')");
      calls.length = 0; W.fetch = agentMock(W, [{ title: 'Energía', slides: [{ kind: 'title', title: 'Energía solar' }] }], calls);
      await AU.createDeck({ topic: 'Mis apuntes', attachments: [pic] });
      const cd = calls[0].messages[1].content;
      assert(Array.isArray(cd) && cd.some(x => x.type === 'image_url') && /base the deck on what they show/.test(cd[0].text), 'crear una presentación a partir de fotos');
      // The panel: dropped on it, shown as chips, sent and cleared.
      calls.length = 0; W.fetch = agentMock(W, [{ message: 'Visto', ops: [], done: true }], calls);
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
      const panel = D.getElementById('assistant-panel'), dt = new W.DataTransfer(); dt.items.add(photo); dt.items.add(notes);
      panel.dispatchEvent(new W.DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      for (let i = 0; i < 100 && panel.querySelectorAll('.att-chip b').length < 2; i++) await sleep(20);
      eq([...panel.querySelectorAll('.att-chip b')].map(b => b.textContent).join(), 'pizarra.png,notas.txt', 'los adjuntos, a la vista');
      panel.querySelector('.att-chip [data-rm="1"]').click(); eq(panel.querySelectorAll('.att-chip').length, 1, 'se pueden quitar');
      panel.querySelector('.as-send').click(); await sleep(30); for (let i = 0; i < 100 && P.assistantState().busy; i++) await sleep(20);
      assert(Array.isArray(calls[0].messages.at(-1).content), 'enviados aunque no se escriba nada');
      assert(/📎 pizarra\.png/.test(panel.querySelector('.as-msg.me').textContent), 'el mensaje dice qué se adjuntó');
      assert(panel.querySelector('.att-chips').hidden, 'y se vacían');
      assert(panel.querySelector('.att-clip'), 'el clip para elegirlos');
    } finally {
      W.fetch = real; R.ai.disconnectAi(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant();
      if (D.getElementById('assistant-panel')) D.querySelector('[data-action="ai-assistant"]').click();
    }
  });

  await test('crear con IA desde un PDF: sus figuras recortadas (por su pie) en sus diapositivas, con diseño y notas', async () => {
    reset(); const W = frame.contentWindow, real = W.fetch, calls = [];
    const AT = await W.eval("import('/src/features/ai/attach.js')");
    // A page: a paragraph, a figure (two boxes and a label), its caption, and «see Fig. 2» inside a line.
    const pdfText = (() => {
      const line = (y, x, s) => `BT /F1 10 Tf ${x} ${y} Td (${s}) Tj ET`;
      const content = [line(650, 40, 'Agents perceive the environment and make decisions at every step of the simulation.'),
        line(637, 40, 'Each agent keeps its own state, and the behaviour of the system emerges from them all.'),
        line(624, 40, 'The figure below shows the blocks of one agent'), line(624, 300, 'see'), line(624, 320, 'Fig. 2'),
        '0 0.6 0 rg 80 520 120 60 re f', '1 0 0 rg 260 450 160 60 re f', '0 0 0 rg', line(545, 100, 'Inputs'),
        line(425, 160, 'Fig. 1. A test diagram')].join('\n');
      const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 700] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
      let out = '%PDF-1.4\n'; const offs = [];
      objs.forEach((o, k) => { offs.push(out.length); out += `${k + 1} 0 obj\n${o}\nendobj\n`; });
      const x = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
      return out + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
    })();
    const pdf = new W.File([pdfText], 'paper.pdf', { type: 'application/pdf' });
    const figs = await AT.pdfFigures(pdf);
    eq(figs.length, 1, 'una figura (la referencia «see Fig. 2» dentro del texto, no)');
    eq(figs[0].caption, 'Fig. 1. A test diagram', 'con su pie');
    const fw = figs[0].w / 2, fh = figs[0].h / 2;                                  // (drawn at twice the size)
    assert(fw > 330 && fw < 380 && fh > 135 && fh < 175, `solo la figura, sin el párrafo de encima: ${fw}×${fh} pt`);
    // «Crear presentación con IA»: the figure shown to the AI and put on its slide; a design; the sample slides gone.
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const notes = 'Esto es lo que digo en voz alta en esta diapositiva, con detalle y una transición.';
    W.fetch = agentMock(W, [{ title: 'Agentes', design: 'academic', slides: [
      { kind: 'title', title: 'Agentes que se especifican', subtitle: 'Un ejemplo', notes },
      { kind: 'image', figure: 1, title: 'Seis bloques describen un agente', bullets: ['Todo pasa por el centro de mensajes'], notes },
      { kind: 'image', figure: 5, title: 'Una figura que no existe', bullets: ['Nada'], notes },
      { kind: 'section', title: 'Una portadilla de más', notes },
      { kind: 'image', figure: 1, title: 'La misma figura, con tres ideas', bullets: ['Define el ciclo de vida, el estado y las entradas', 'Hace explícitas las decisiones', 'Permite auditar cada acción'], notes },
      { kind: 'closing', title: 'Gracias', notes }] }], calls);
    try {
      R.store.commit(() => { slide().blocks[0].html = 'Algo mío'; });
      const AI = await W.eval("import('/src/ui/dialogs/ai.js')"); AI.openCreateDeck(); await sleep(20);
      const m = D.getElementById('aideck-modal'), dt = new W.DataTransfer(); dt.items.add(pdf);
      m.querySelector('.ad-file').files = dt.files; m.querySelector('.ad-topic').value = 'Charla de 10 minutos';
      m.querySelector('.ad-go').click();
      for (let i = 0; i < 150 && D.getElementById('aideck-modal'); i++) await sleep(50);
      assert(!D.getElementById('aideck-modal'), 'creada');
      const sent = calls[0].messages[1].content;
      assert(Array.isArray(sent) && sent.some(x => x.type === 'image_url'), 'la figura va a la IA');
      assert(/"figure": N/.test(calls[0].messages[0].content), 'y se le dice cómo ponerla');
      const S = R.state.deck.slides;
      eq(S.length, 5, 'solo sus diapositivas (las de muestra del diseño, fuera; y la portadilla de más en una presentación corta)');
      assert(!S.some(x => x.layoutId === 'section'), 'sin portadillas en una presentación de menos de 12');
      const three = S.find(x => x.blocks.some(b => /tres ideas/.test(b.html || ''))), body = three.blocks.find(b => b.ph === 'body');
      assert((body.fit ?? 1) >= 0.85, `con la figura, el texto a su tamaño (no encogido: ${body.fit ?? 1})`); eq(R.state.deck.name, 'Agentes', 'con su título');
      assert(R.state.deck.layouts?.length > 0, 'con diseños (compuesta como las plantillas)');
      const img = S[1].blocks.find(b => b.type === 'image');
      assert(img && img.src === figs[0].full || img?.src?.startsWith('data:image/png'), 'la figura, en su diapositiva');
      assert(img.w >= 700 && Math.abs(img.x + img.w / 2 - 640) < 20 && /Fig\. 1/.test(img.alt), `apaisada: grande y centrada bajo el título (${img.w} px), con su pie como texto alternativo`);
      assert(!S[2].blocks.some(b => b.type === 'image'), 'una figura que no existe, no');
      assert(S.every(s => s.notes === notes), 'cada una con sus notas');
    } finally { W.fetch = real; R.ai.disconnectAi(); D.getElementById('aideck-modal')?.remove(); }
  });

  await test('asistente (panel): propone con miniaturas, aplica solo lo marcado, descarta, detiene y aplica sin preguntar', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0);
    const W = frame.contentWindow, real = W.fetch, calls = [], P = await W.eval("import('/src/ui/dialogs/assistant.js')");
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const [s1, s2] = R.state.deck.slides, t1 = s1.blocks[0].id;
    const proposal = { message: 'Te propongo esto', done: true, ops: [
      { op: 'set_text', slide: 1, id: t1, text: 'Título nuevo' }, { op: 'set_notes', slide: 1, notes: 'Notas' },
      { op: 'set_background', slide: 2, color: '#334455' }, { op: 'delete_slide', slide: 2 }] };
    W.fetch = agentMock(W, [proposal], calls);
    const panelOf = () => D.getElementById('assistant-panel');
    const send = async text => { panelOf().querySelector('textarea').value = text; panelOf().querySelector('.as-send').click(); await sleep(30); for (let i = 0; i < 100 && P.assistantState().busy; i++) await sleep(20); await sleep(20); };
    try {
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
      const panel = panelOf(); assert(panel, 'panel abierto');
      assert(panel.querySelector('.as-scope') && panel.querySelectorAll('[data-perm]').length === 4, 'alcance y permisos arriba');
      eq(panel.querySelector('[data-perm="delete"]').checked, false, 'borrar diapositivas, desactivado por defecto');
      const json0 = JSON.stringify(R.state.deck);
      await send('Mejora la portada');
      const card = panel.querySelector('.as-prop'); assert(card, 'tarjeta de propuesta');
      eq(JSON.stringify(R.state.deck), json0, 'la propuesta no cambia la presentación');
      eq(card.querySelectorAll('.as-group').length, 2, 'agrupada por diapositiva');
      eq(card.querySelectorAll('input[data-i]').length, 3, 'una casilla por cambio');
      assert(/borrar diapositivas/i.test(card.querySelector('.as-warn').textContent), 'avisa del cambio sin permiso: ' + card.querySelector('.as-warn').textContent);
      const g1 = card.querySelector('.as-group'); eq(g1.querySelectorAll('.as-th').length, 2, 'antes y después');
      assert(/Título nuevo/.test(g1.querySelectorAll('.as-th')[1].textContent) && !/Título nuevo/.test(g1.querySelectorAll('.as-th')[0].textContent), 'el después lleva el cambio');
      assert(/Título nuevo/.test(card.textContent), 'línea en lenguaje llano');
      // Desmarcar las notas y aplicar.
      const notes = [...card.querySelectorAll('.as-op')].find(l => /Notas del orador/.test(l.textContent)).querySelector('input');
      notes.click(); await sleep(40);
      assert(/\(2\)/.test(card.querySelector('.as-apply').textContent), 'cuenta lo marcado');
      card.querySelector('.as-apply').click(); await sleep(20);
      eq(s1.blocks[0].html, 'Título nuevo', 'aplicado el texto'); eq(s1.notes || '', '', 'no las notas desmarcadas'); eq(s2.background, '#334455', 'fondo de la 2');
      eq(R.state.deck.slides.length, 2, 'la diapositiva sin permiso sigue');
      assert(/US\$/.test(panel.querySelector('.as-cost').textContent), 'muestra lo gastado');
      R.store.undo(); { const [u1, u2] = R.state.deck.slides; assert(u1.blocks[0].html !== 'Título nuevo' && u2.background !== '#334455', 'un solo paso de deshacer'); }
      // Descartar.
      await send('Otra vez'); panel.querySelector('.as-prop:not(.settled) .as-discard').click(); await sleep(20);
      assert(R.state.deck.slides[0].blocks[0].html !== 'Título nuevo', 'descartada: nada cambia'); eq(P.assistantState().pending, null, 'sin propuesta pendiente');
      // Pedir cambios: sigue la conversación.
      await send('Una más'); panel.querySelector('.as-prop:not(.settled) .as-more').click();
      await send('Más corto'); assert(/About your last proposal: Más corto/.test(calls.at(-1).messages.at(-1).content), 'pide cambios sobre la propuesta');
      assert(calls.at(-1).messages.some(m => m.role === 'assistant' && /Te propongo esto/.test(m.content)), 'con el historial');
      // Detener.
      W.fetch = agentMock(W, [proposal], calls, { wait: 3000 });
      panel.querySelector('textarea').value = 'Lento'; panel.querySelector('.as-send').click(); await sleep(60);
      assert(panel.querySelector('.as-progress'), 'progreso visible'); panel.querySelector('.as-stop').click(); await sleep(60);
      assert(!P.assistantState().busy && /Detenido/.test(panel.querySelector('.as-log').textContent), 'detenido');
      // Aplicar sin preguntar (recordado).
      W.fetch = agentMock(W, [proposal], calls);
      panel.querySelector('.as-autochk').click(); panel.querySelector('[data-perm="delete"]').click();
      assert(JSON.parse(W.localStorage.getItem('revela.assistant.v1')).auto, 'opción recordada');
      await send('Hazlo');
      eq(R.state.deck.slides[0].blocks[0].html, 'Título nuevo', 'aplicado sin preguntar'); eq(R.state.deck.slides.length, 1, 'con permiso, también borra');
      assert(/Cambios aplicados/.test([...panel.querySelectorAll('.as-prop')].at(-1).textContent), 'lo dice');
      R.store.undo(); eq(R.state.deck.slides.length, 2, 'y se deshace de una vez');
    } finally {
      W.fetch = real; R.ai.disconnectAi(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant();
      if (panelOf()) D.querySelector('[data-action="ai-assistant"]').click();
    }
  });

  // «Completar la presentación»: a half-made deck of screenshots, written from what they show.
  // The AI is simulated: captions for the vision model, slides for the writing model.
  const pictureOf = (W, w, h, hue) => { const c = W.document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = `hsl(${hue},60%,85%)`; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = '40px sans-serif';
    for (let y = 60; y < h; y += 70) g.fillText('Menú · Datos · Informe ' + y, 30, y);
    for (let k = 0; k < 4000; k++) { g.fillStyle = `hsl(${(k * 37) % 360},70%,50%)`; g.fillRect((k * 97) % w, (k * 61) % h, 3, 3); }
    return c.toDataURL('image/png'); };
  // Cover, then 7 slides with empty title and body and a picture over them; slide 3 has the author's title,
  // slide 4 the author's text and notes (beside its picture), slide 5 two pictures.
  const halfDeck = W => {
    const ph = (kind, html = '', [x, y, w, h] = kind === 'title' ? [100, 60, 1080, 100] : [100, 180, 1080, 480]) => ({ id: R.model.uid(), type: 'text', ph: kind, html, x, y, w, h, fontSize: kind === 'title' ? 44 : 28, rotation: 0, animation: null });
    const img = (src, x, y, w, h) => ({ id: R.model.uid(), type: 'image', src, x, y, w, h, fit: 'contain', rotation: 0, animation: null, alt: '' });
    const pics = [0, 1, 2, 3, 4, 5, 6, 7].map(k => pictureOf(W, 1600, 900, k * 40));
    const slides = [{ id: 's1', background: '#101317', notes: '', blocks: [ph('title', 'Curso de Power BI', [120, 250, 1040, 130]), ph('subtitle', 'Introducción para empezar', [120, 390, 1040, 70])] }];
    for (let k = 0; k < 7; k++) {
      const blocks = k === 5 ? [ph('title'), ph('body', '', [100, 180, 520, 480]), ph('body', '', [660, 180, 520, 480]), img(pics[5], 680, 200, 480, 270)]   // (two content boxes, the picture in the second)
        : k === 2 ? [ph('title'), ph('body', 'Texto mío', [520, 180, 660, 480]), img(pics[2], 100, 182, 396, 223)]
        : [ph('title', k === 1 ? 'Mi título' : ''), ph('body'), ...(k === 3 ? [img(pics[3], 60, 200, 560, 400), img(pics[7], 660, 200, 560, 400)] : [img(pics[k], 280, 120 + k * 4, 720, 470)])];
      slides.push({ id: 's' + (k + 2), background: '#101317', notes: k === 2 ? 'Mis notas' : '', blocks });
    }
    R.store.replaceDeck({ ...R.model.emptyDeck(), slides }); R.slides.goToSlide(0); R.render();
    return R.state.deck;
  };
  // fetch for OpenRouter: the vision model describes the pictures it gets, the writing model writes the slides asked.
  const completeMock = (W, log, { layout = () => 'image-right' } = {}) => async (url, opts) => {
    const body = JSON.parse(opts.body); log.push(body);
    const user = body.messages.find(m => m.role === 'user').content;
    let answer;
    if (Array.isArray(user)) {
      const n = user.filter(p => p.type === 'image_url').length;
      answer = { images: Array.from({ length: n }, (_, i) => ({ n: i + 1, caption: `Pantalla ${log.length}.${i + 1}: el panel de datos con sus menús. Enseña dónde se cargan los datos.`, visibleText: 'Inicio, Obtener datos', title: `Paso ${i + 1}` })) };
    } else {
      const asked = JSON.parse(user.slice(user.indexOf('Slides to write now:') + 20));
      answer = { slides: asked.map(s => ({ slide: s.slide, title: `Título ${s.slide}`, points: ['1. Cargar los datos', '• Elegir el origen', 'Revisar la vista previa'], notes: `Aquí explico la ${s.slide}.`, layout: layout(s.slide) })) };
    }
    return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }], usage: { cost: 0.0005 } }));
  };
  const rectsHit = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;

  await test('completar la presentación: contexto, imágenes descritas una vez y por lotes, solo lo vacío, sin solapes, coste', async () => {
    reset();
    const W = frame.contentWindow, real = W.fetch, log = [], P = await W.eval("import('/src/ui/dialogs/assistant.js')"), C = await W.eval("import('/src/features/ai/complete.js')"),
      V = await W.eval("import('/src/features/ai/vision.js')");
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const deck = halfDeck(W);
    const panelOf = () => D.getElementById('assistant-panel');
    const idle = async () => { await sleep(30); for (let i = 0; i < 300 && P.assistantState().busy; i++) await sleep(20); await sleep(30); };
    W.fetch = completeMock(W, log, { layout: n => (n === 8 ? 'image-full-caption' : 'image-right') });
    try {
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
      // The brief: asked once, with a guess from the deck.
      eq(deck.aiBrief, undefined, 'sin contexto aún');
      const qa = [...panelOf().querySelectorAll('.as-qa')]; assert(qa.length === 3 && /Completar la presentación/.test(qa[0].textContent), 'acciones rápidas');
      qa[0].click(); await sleep(20);
      const form = panelOf().querySelector('.as-cmp .as-bform'); assert(form, 'las tres preguntas');
      assert(/Curso de Power BI/.test(form.topic.value), 'con una propuesta sacada de la presentación: ' + form.topic.value);
      form.audience.value = 'Analistas que empiezan'; form.takeaway.value = 'Hacer su primer informe';
      form.querySelector('[type=submit]').click(); await sleep(30);
      eq(R.state.deck.aiBrief.audience, 'Analistas que empiezan', 'guardado con la presentación'); assert(/Curso de Power BI/.test(R.state.deck.aiBrief.topic), 'y el tema');
      assert(!panelOf().querySelector('.as-bform') && /Analistas/.test(panelOf().querySelector('.as-brief').textContent), 'no se vuelve a preguntar: se resume y se puede editar');
      // The estimate, before anything is sent.
      const est = panelOf().querySelector('.as-est').textContent, e = C.estimateCompletion({ scope: { kind: 'all' }, mode: 'empty' });
      eq(e.images, 8, 'ocho imágenes por describir'); eq(e.slides, 8, 'ocho diapositivas con algo vacío'); eq(e.calls, 3, 'dos lotes de imágenes y una escritura');
      assert(/8 imágenes por describir/.test(est) && /8 diapositivas por escribir/.test(est) && /US\$/.test(est), 'la estimación a la vista: ' + est);
      eq(log.length, 0, 'nada enviado aún');
      const json0 = JSON.stringify(R.state.deck.slides.map(s => s.blocks.map(b => b.html || '')));
      panelOf().querySelector('.as-go').click(); await idle();
      // Pictures: made small, in batches, to the cheap vision model; then one text-only request.
      const vis = log.filter(b => b.model === V.VISION_MODEL), wr = log.filter(b => b.model === R.aiAgent.AGENT_MODEL);
      eq(vis.length, 2, 'dos peticiones de imágenes (6 + 2)'); eq(wr.length, 1, 'una de escritura');
      const parts = vis.flatMap(b => b.messages[1].content.filter(p => p.type === 'image_url'));
      eq(parts.length, 8, 'las ocho imágenes'); assert(vis.every(b => b.messages[1].content.filter(p => p.type === 'image_url').length <= 6), 'como mucho 6 por petición');
      assert(parts.every(p => /^data:image\/jpeg;base64,/.test(p.image_url.url) && V.bytesOf(p.image_url.url) < 300 * 1024), 'en JPEG y pequeñas');
      const sizes = await Promise.all(parts.slice(0, 2).map(p => new Promise(ok => { const i = new W.Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.src = p.image_url.url; })));
      assert(sizes.every(([w, h]) => Math.max(w, h) === 768 && Math.abs(w / h - 16 / 9) < 0.01), 'reducidas a 768 px manteniendo la proporción: ' + JSON.stringify(sizes));
      const text = wr[0].messages[1].content;
      assert(typeof text === 'string' && !/data:image/.test(text) && /Pantalla/.test(text) && /Analistas que empiezan/.test(text), 'la escritura lleva las descripciones y el contexto, no las imágenes');
      const imgs = R.state.deck.slides.flatMap(s => s.blocks.filter(b => b.type === 'image'));
      assert(imgs.every(b => b.aiCaption && b.aiCaption.hash === V.srcHash(b.src) && /Pantalla/.test(b.aiCaption.text) && b.aiCaption.model === V.VISION_MODEL), 'cada descripción guardada en su imagen');
      eq(JSON.stringify(R.state.deck.slides.map(s => s.blocks.map(b => b.html || ''))), json0, 'nada cambia hasta aplicar');
      // The proposal: per slide, then applied.
      const card = panelOf().querySelector('.as-prop:not(.settled)'); assert(card, 'propuesta');
      eq(card.querySelectorAll('.as-group').length, 8, 'una por diapositiva');
      assert(/imagen a la derecha/.test(card.textContent) && /texto alternativo/.test(card.textContent), 'dice que recoloca la imagen y añade el texto alternativo');
      assert(/US\$/.test(panelOf().querySelector('.as-cost').textContent) && panelOf().querySelector('.as-msg.ai .as-mcost'), 'lo gastado, también en el mensaje');
      card.querySelector('.as-apply').click(); await sleep(30);
      const [s1, s2, s3, s4, s5, , , s8] = R.state.deck.slides, txt = b => R.aiAgent.textOf(b.html);
      eq(txt(s2.blocks[0]), 'Título 2', 'título escrito'); assert(/<li>Cargar los datos<\/li><li>Elegir el origen<\/li>/.test(s2.blocks[1].html), 'puntos sin numeración ni viñetas a mano: ' + s2.blocks[1].html);
      eq(s2.notes, 'Aquí explico la 2.', 'notas'); eq(s1.notes, 'Aquí explico la 1.', 'también las de la portada');
      eq(txt(s1.blocks[0]), 'Curso de Power BI', 'solo lo vacío: la portada sigue igual');
      eq(txt(s3.blocks[0]), 'Mi título', 'solo lo vacío: el título del autor se queda'); eq(txt(s4.blocks[1]), 'Texto mío', 'su texto también'); eq(s4.notes, 'Mis notas', 'y sus notas');
      eq(txt(s4.blocks[0]), 'Título 4', 'pero lo vacío de esa diapositiva se completa');
      assert(imgs.every(b => /el panel de datos/.test(b.alt)), 'texto alternativo desde la descripción');
      // Nothing overlaps, everything inside the slide, the pictures keep their proportions.
      for (const s of R.state.deck.slides.slice(1)) {
        const texts = s.blocks.filter(b => b.type === 'text' && txt(b)), pics = s.blocks.filter(b => b.type === 'image');
        for (const tb of texts) for (const p of pics) assert(!rectsHit(tb, p), `diapositiva ${R.state.deck.slides.indexOf(s) + 1}: texto sobre la imagen ${JSON.stringify([tb.x, tb.y, tb.w, tb.h, p.x, p.y, p.w, p.h])}`);
        for (const b of s.blocks) assert(b.x >= 0 && b.y >= 0 && b.x + b.w <= 1280 && b.y + b.h <= 720, 'dentro de la diapositiva');
        for (const p of pics) assert(Math.abs(p.w / p.h - 16 / 9) < 0.02, 'proporción de la imagen: ' + (p.w / p.h).toFixed(2));
      }
      assert(s2.blocks[1].x + s2.blocks[1].w < s2.blocks[2].x, 'texto a la izquierda, imagen a la derecha');
      assert(s8.blocks[2].w > 760 && s8.blocks[1].y > s8.blocks[2].y + s8.blocks[2].h - 1 && !/<li>/.test(s8.blocks[1].html), 'imagen grande con una línea de pie: ' + JSON.stringify(s8.blocks.map(b => [b.type, b.x, b.y, b.w, b.h, b.html])));
      assert(s5.blocks.filter(b => b.type === 'image').every(p => p.x > s5.blocks[1].x + s5.blocks[1].w), 'dos imágenes, juntas al lado del texto');
      // Two content boxes: the empty second one under the picture is gone, and in general no empty placeholder is left under an object.
      const s7 = R.state.deck.slides[6];
      eq(s7.blocks.filter(b => b.ph === 'body').length, 1, 'el segundo cuadro de contenido vacío, bajo la imagen, se quita');
      eq(R.aiAgent.checkSlides(R.state.deck).filter(p => p.kind === 'emptyph').length, 0, 'ningún marcador vacío bajo un objeto');
      for (const s of R.state.deck.slides) for (const e of s.blocks.filter(b => R.master.isEmptyPlaceholder(b))) for (const o of s.blocks.filter(b => b !== e && b.type === 'image')) assert(!rectsHit(e, o), 'marcador vacío bajo una imagen');
      eq(C.estimateCompletion({ scope: { kind: 'all' }, mode: 'empty' }).slides, 0, 'ya no queda nada vacío');
      // Again ("improve"): the descriptions are reused, nothing is described again.
      log.length = 0;
      let res = await C.completeDeck({ scope: { kind: 'all' }, mode: 'improve' });
      eq(log.filter(b => b.model === V.VISION_MODEL).length, 0, 'las imágenes no se vuelven a describir'); eq(res.stats.cached, 8, 'ocho ya descritas');
      eq(log.length, 1, 'solo la escritura'); eq(C.estimateCompletion({ scope: { kind: 'all' }, mode: 'improve' }).images, 0, 'y la estimación lo sabe');
      // A picture changed: only that one is described again; "this slide only" is one small request.
      R.store.commit(() => { s2.blocks[2].src = pictureOf(W, 800, 600, 200); });
      log.length = 0; R.slides.goToSlide(1);
      res = await C.completeDeck({ scope: { kind: 'current' }, mode: 'improve' });
      eq(log.length, 2, 'una descripción y una escritura'); eq(log[0].messages[1].content.filter(p => p.type === 'image_url').length, 1, 'solo la imagen cambiada');
      assert(JSON.parse(log[1].messages[1].content.split('Slides to write now:\n')[1]).length === 1, 'una sola diapositiva');
    } finally {
      W.fetch = real; R.ai.disconnectAi(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant();
      if (panelOf()) D.querySelector('[data-action="ai-assistant"]').click();
    }
  });

  await test('asistente (chat): mensajes con formato, coste, reintentar tras un error, entrada que crece y vista grande del antes y el después', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0);
    const W = frame.contentWindow, real = W.fetch, calls = [], P = await W.eval("import('/src/ui/dialogs/assistant.js')");
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const [s1, s2] = R.state.deck.slides, t1 = s1.blocks[0].id;
    const panelOf = () => D.getElementById('assistant-panel');
    const send = async text => { panelOf().querySelector('textarea').value = text; panelOf().querySelector('.as-send').click(); await sleep(30); for (let i = 0; i < 100 && P.assistantState().busy; i++) await sleep(20); await sleep(30); };
    try {
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
      const panel = panelOf();
      assert(panel.querySelector('.as-empty') && getComputedStyle(panel.querySelector('.as-empty')).display !== 'none', 'vacío: una bienvenida');
      eq([...panel.querySelectorAll('.as-qa')].map(b => b.lastChild.textContent.trim()).join('|'), 'Completar la presentación|Completar esta diapositiva|Revisar ortografía', 'acciones rápidas');
      // The input grows with the text.
      const ta = panel.querySelector('textarea'), h0 = ta.offsetHeight;
      ta.value = 'una\ndos\ntres\ncuatro\ncinco'; ta.dispatchEvent(new W.Event('input')); assert(ta.offsetHeight > h0, 'la entrada crece: ' + h0 + ' → ' + ta.offsetHeight);
      // A failure: said in the chat, with "try again".
      let fail = true;
      W.fetch = async (url, o) => { if (fail) return new W.Response('caído', { status: 500 }); return agentMock(W, [{ message: '**Hecho**: te propongo\n- un título\n- unas notas', done: true,
        ops: [{ op: 'set_text', slide: 1, id: t1, text: 'Título nuevo' }, { op: 'set_notes', slide: 1, notes: 'Notas' }, { op: 'set_background', slide: 2, color: '#334455' }] }], calls)(url, o); };
      await send('Mejora la portada');
      const err = panel.querySelector('.as-msg.err'); assert(err && /500/.test(err.textContent) && err.querySelector('.as-retry'), 'el error en el chat, con reintentar: ' + err?.textContent);
      fail = false; err.querySelector('.as-retry').click(); await sleep(30); for (let i = 0; i < 100 && P.assistantState().busy; i++) await sleep(20); await sleep(30);
      assert(!panel.querySelector('.as-msg.err'), 'reintentado: el error se va');
      const msg = [...panel.querySelectorAll('.as-msg.ai')].at(-1);
      assert(msg.querySelector('b')?.textContent === 'Hecho' && msg.querySelectorAll('li').length === 2, 'negrita y lista: ' + msg.innerHTML);
      assert(/US\$/.test(msg.querySelector('.as-mcost')?.textContent || ''), 'coste del mensaje');
      eq(calls.at(-1).messages.at(-1).content.includes('Mejora la portada'), true, 'reintenta lo mismo');
      // Inline pictures bigger; the large viewer.
      const card = panel.querySelector('.as-prop:not(.settled)');
      assert(card.querySelector('.as-th').offsetWidth >= 140, 'miniaturas más grandes: ' + card.querySelector('.as-th').offsetWidth);
      card.querySelector('.as-group .as-zoom').click(); await sleep(30);
      const v = D.getElementById('as-viewer'); assert(v, 'vista grande');
      const figs = v.querySelectorAll('.asv-fig'); eq(figs.length, 2, 'antes y después, lado a lado');
      const big = figs[1].querySelector('.as-th'); assert(big.offsetWidth > 300 && Math.abs(big.offsetWidth / big.offsetHeight - 16 / 9) < 0.02, 'grande y con sus proporciones: ' + big.offsetWidth + '×' + big.offsetHeight);
      assert(/Título nuevo/.test(figs[1].textContent) && !/Título nuevo/.test(figs[0].textContent), 'el después lleva el cambio');
      eq(v.querySelector('.asv-pos').textContent, '1 / 2', 'posición');
      W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await sleep(20);
      eq(v.querySelector('.asv-pos').textContent, '2 / 2', 'flecha: la siguiente');
      W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); await sleep(20);
      const notesBox = [...v.querySelectorAll('.asv-ops .as-op')].find(l => /Notas del orador/.test(l.textContent)).querySelector('input');
      notesBox.click(); await sleep(40);
      const inCard = [...card.querySelectorAll('.as-op')].find(l => /Notas del orador/.test(l.textContent)).querySelector('input');
      eq(inCard.checked, false, 'desmarcar en la vista grande desmarca en la propuesta');
      v.querySelector('[data-v="after"]').click(); await sleep(20); eq(v.querySelectorAll('.asv-fig').length, 1, 'o solo el después');
      W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20);
      assert(!D.getElementById('as-viewer'), 'Esc cierra');
      card.querySelector('.as-apply').click(); await sleep(20);
      eq(s1.blocks[0].html, 'Título nuevo', 'aplicado'); eq(s1.notes || '', '', 'sin las notas desmarcadas'); eq(s2.background, '#334455', 'y lo demás');
      R.store.undo();
    } finally {
      W.fetch = real; R.ai.disconnectAi(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant(); D.getElementById('as-viewer')?.remove();
      if (panelOf()) D.querySelector('[data-action="ai-assistant"]').click();
    }
  });

  // Reviewing a proposal: the user's own version of what it writes, and nothing the author made lost silently.
  await test('asistente (revisión): editar en la vista grande, restaurar, conservar lo que había, proteger mi contenido y deshacer de una vez', async () => {
    reset(); R.slides.addSlide('blank'); R.slides.goToSlide(0);
    const W = frame.contentWindow, real = W.fetch, calls = [], P = await W.eval("import('/src/ui/dialogs/assistant.js')");
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    R.slides.goToSlide(1); R.blocks.addText('Conservar esto'); const keepMe = last();
    R.slides.goToSlide(0);
    // (Undo brings back copies: always the deck's current objects.)
    const s1 = () => R.state.deck.slides[0], s2 = () => R.state.deck.slides[1], b1 = () => s1().blocks[0], b2 = () => s1().blocks[1];
    R.store.commit(() => { b2().html = '<ul><li>Uno</li><li>Dos</li></ul>'; s1().notes = 'Mis notas'; });
    const proposal = { message: 'Propuesta', done: true, ops: [
      { op: 'set_text', slide: 1, id: b1().id, text: 'Portada nueva' }, { op: 'set_text', slide: 1, id: b2().id, text: '- Uno\n- Tres' },
      { op: 'set_notes', slide: 1, notes: 'Notas nuevas' }, { op: 'delete_object', slide: 2, id: keepMe.id }] };
    W.fetch = agentMock(W, [proposal], calls);
    const panelOf = () => D.getElementById('assistant-panel');
    const send = async text => { panelOf().querySelector('textarea').value = text; panelOf().querySelector('.as-send').click(); await sleep(30); for (let i = 0; i < 100 && P.assistantState().busy; i++) await sleep(20); await sleep(30); };
    const key = k => W.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true }));
    const rowOf = (box, i) => box.querySelector(`.as-oprow[data-row="${i}"]`);
    try {
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
      await send('Mejora la portada');
      let card = panelOf().querySelector('.as-prop:not(.settled)');
      // What goes is said, and shown struck through.
      assert(/Sustituye/.test(rowOf(card, 0).textContent) && /Quita/.test(rowOf(card, 3).querySelector('.as-tag')?.textContent || ''), 'marcados «Sustituye» y «Quita»');
      const del = [...rowOf(card, 1).querySelectorAll('.as-diff del')].map(d => d.textContent);
      assert(del.includes('Dos') && !del.includes('Uno') && /Tres/.test(rowOf(card, 1).querySelector('.as-diff ins')?.textContent || ''), 'tachado lo que se quita, subrayado lo nuevo: ' + rowOf(card, 1).innerHTML);
      assert(/Conservar esto/.test(rowOf(card, 3).querySelector('.as-diff').textContent), 'lo que se borra, a la vista');
      const prot = card.querySelector('.as-protectchk'); assert(prot && !prot.checked, '«Proteger mi contenido», desactivado en una petición normal');
      assert(card.querySelector('.as-group .as-th .as-mark.as-lose'), 'en el antes, lo que desaparece en rojo');
      // The large viewer: the proposed texts editable in the «after».
      card.querySelector('.as-group .as-zoom').click(); await sleep(30);
      let v = D.getElementById('as-viewer');
      const eds = v.querySelectorAll('.asv-a .asv-ed'); eq(eds.length, 2, 'título y cuerpo editables');
      assert([...eds].every(e => e.isContentEditable && e.tabIndex === 0 && e.getAttribute('role') === 'textbox'), 'se llega con Tab y se anuncian como cuadros de texto');
      assert(v.querySelector('.asv-b .as-mark.as-lose span'), 'el antes dice qué se quita');
      assert(!v.querySelector('.asv-bar').hidden && v.querySelectorAll('.asv-tools [data-cmd]').length === 4, 'negrita, cursiva y listas');
      const ed = eds[0]; ed.focus(); ed.innerHTML = 'Mi <b>título</b> editado'; ed.dispatchEvent(new W.InputEvent('input', { bubbles: true })); await sleep(40);
      assert(/Editado por ti/.test(rowOf(v.querySelector('.asv-ops'), 0).textContent) && /Editado por ti/.test(rowOf(card, 0).textContent), 'marcado «editado por ti», aquí y en la propuesta');
      assert(/Mi título editado/.test(card.querySelector('.as-group .as-thumbs .as-th:last-child').textContent), 'la miniatura del después lo lleva');
      // Esc: first out of the text, then closes.
      key('Escape'); await sleep(20);
      assert(D.getElementById('as-viewer') && D.activeElement !== ed, 'Esc sale de la edición sin cerrar');
      v = D.getElementById('as-viewer');
      assert(/Mi título editado/.test(v.querySelector('.asv-a').textContent), 'el después redibujado con lo editado');
      // The notes, edited in the list; then restored.
      let notes = v.querySelector('.asv-field[data-edit="2"]'); assert(notes && notes.value === 'Notas nuevas', 'las notas propuestas, para editar');
      notes.focus(); notes.value = 'Notas mías'; notes.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(30);
      assert(/Notas mías/.test(rowOf(card, 2).textContent) && /Editado por ti/.test(rowOf(card, 2).textContent), 'las notas editadas, en la propuesta');
      key('Escape'); await sleep(20); assert(D.getElementById('as-viewer'), 'Esc en las notas tampoco cierra');
      v.querySelector('[data-restore="2"]').click(); await sleep(30);
      eq(v.querySelector('.asv-field[data-edit="2"]').value, 'Notas nuevas', 'restaurada la propuesta');
      assert(!/Editado por ti/.test(rowOf(card, 2).textContent), 'sin la marca');
      key('Escape'); await sleep(20); assert(!D.getElementById('as-viewer'), 'y Esc cierra');
      // «Conservar lo que había»: the list keeps its points and gets the new one; the object isn't deleted.
      rowOf(card, 1).querySelector('[data-keep]').click(); await sleep(30);
      assert(/Se conserva lo que había/.test(rowOf(card, 1).textContent) && !rowOf(card, 1).querySelector('.as-diff del'), 'conservado: nada tachado');
      rowOf(card, 3).querySelector('[data-keep]').click(); await sleep(30);
      card.querySelector('.as-apply').click(); await sleep(30);
      eq(b1().html, 'Mi <b>título</b> editado', 'se aplica lo editado'); eq(b2().html, '<ul><li>Uno</li><li>Dos</li><li>Tres</li></ul>', 'lo de antes y lo nuevo, sin repetir');
      eq(s1().notes, 'Notas nuevas', 'las notas restauradas: las propuestas'); assert(s2().blocks.some(b => b.id === keepMe.id), 'no se borra');
      assert(/Editado por ti/.test(panelOf().querySelector('.as-prop.settled').textContent), 'aplicado, dice qué editaste');
      R.store.undo();
      eq(b1().html, '<b>Título</b>', 'un solo deshacer: el título'); eq(b2().html, '<ul><li>Uno</li><li>Dos</li></ul>', 'la lista'); eq(s1().notes, 'Mis notas', 'y las notas');
      // «Proteger mi contenido»: deletions unticked, replacements kept and added to.
      await send('Otra vez'); card = panelOf().querySelector('.as-prop:not(.settled)');
      card.querySelector('.as-protectchk').click(); await sleep(40);
      eq(rowOf(card, 3).querySelector('[data-i]').checked, false, 'borrar lo tuyo: sin marcar');
      assert(rowOf(card, 1).querySelector('[data-keep]').checked && rowOf(card, 2).querySelector('[data-keep]').checked, 'sustituir: conservando');
      card.querySelector('.as-apply').click(); await sleep(30);
      assert(b1().html.startsWith('<b>Título</b>') && /Portada nueva/.test(b1().html), 'lo de antes primero, lo nuevo después: ' + b1().html);
      eq(s1().notes, 'Mis notas\n\nNotas nuevas', 'las notas, añadidas'); assert(s2().blocks.some(b => b.id === keepMe.id), 'nada borrado');
      R.store.undo();
    } finally {
      W.fetch = real; R.ai.disconnectAi(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant(); D.getElementById('as-viewer')?.remove();
      if (panelOf()) D.querySelector('[data-action="ai-assistant"]').click();
    }
  });

  await test('completar (revisión): «Mejorar también lo escrito» protege lo del autor; «Solo lo vacío» nunca borra ni sustituye al aplicar', async () => {
    reset();
    const W = frame.contentWindow, real = W.fetch, log = [], P = await W.eval("import('/src/ui/dialogs/assistant.js')"), C = await W.eval("import('/src/features/ai/complete.js')"),
      RV = await W.eval("import('/src/features/ai/review.js')"), AG = R.aiAgent;
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    const deck = halfDeck(W); C.saveBrief({ topic: 'Curso de Power BI' });
    const panelOf = () => D.getElementById('assistant-panel');
    const idle = async () => { await sleep(30); for (let i = 0; i < 300 && P.assistantState().busy; i++) await sleep(20); await sleep(30); };
    W.fetch = completeMock(W, log);
    try {
      // The pure pieces.
      const S = i => R.state.deck.slides[i], s4 = S(3), [t4, b4] = s4.blocks;
      const k = RV.keepOp({ op: 'set_text', sid: s4.id, id: b4.id, text: '- Punto nuevo\n- Texto', ok: true }, deck);
      assert(/^Texto mío/.test(k.html) && /Punto nuevo/.test(k.html) && (k.html.match(/Texto mío/g) || []).length === 1, 'conservar: lo de antes primero, lo nuevo después, sin repetir: ' + k.html);
      eq(RV.keepOp({ op: 'delete_object', sid: s4.id, id: b4.id, ok: true }, deck), null, 'conservar un borrado: no se borra');
      eq(RV.keepOp({ op: 'set_notes', sid: s4.id, notes: 'Otra cosa', ok: true }, deck).notes, 'Mis notas\n\nOtra cosa', 'notas: se añaden');
      eq(RV.lossOf({ op: 'set_text', sid: s4.id, id: b4.id, text: 'Texto mío y más', ok: true }, deck), null, 'añadir sin quitar no es pérdida');
      // Safety net: in «Solo lo vacío» nothing that isn't empty is ever deleted or replaced, whatever the operations say.
      const s7 = deck.slides[6], ph2 = s7.blocks[2], title7 = s7.blocks[0];
      eq(R.master.isEmptyPlaceholder(ph2), true, 'el segundo cuadro está vacío');
      const n = AG.applyOps([{ op: 'delete_object', sid: s4.id, id: b4.id, ok: true, onlyEmpty: true }, { op: 'set_text', sid: s4.id, id: t4.id, text: 'X', ok: true, onlyEmpty: true },
        { op: 'set_text', sid: s4.id, id: b4.id, text: 'Pisado', ok: true, onlyEmpty: true }, { op: 'set_notes', sid: s4.id, notes: 'Pisadas', ok: true, onlyEmpty: true },
        { op: 'delete_object', sid: s7.id, id: ph2.id, ok: true, onlyEmpty: true }, { op: 'set_text', sid: s7.id, id: title7.id, text: 'Nuevo', ok: true, onlyEmpty: true }]);
      eq(n, 3, 'solo lo vacío se aplica');
      assert(s4.blocks.includes(b4) && AG.textOf(b4.html) === 'Texto mío' && s4.notes === 'Mis notas', 'lo del autor intacto');
      eq(AG.textOf(s4.blocks[0].html), 'X', 'su título vacío sí'); assert(!s7.blocks.includes(ph2), 'un marcador vacío sí se puede quitar'); eq(AG.textOf(title7.html), 'Nuevo', 'y lo vacío se escribe');
      R.store.undo(); eq(AG.textOf(S(3).blocks[0].html), '', 'un paso');
      // From the panel, «Solo lo vacío»: every change carries the guard.
      const res = await C.completeDeck({ scope: { kind: 'all' }, mode: 'empty' });
      assert(res.ops.length && res.ops.every(o => o.onlyEmpty), 'cada cambio marcado «solo lo vacío»'); eq(res.ops.filter(o => RV.lossOf(o, R.state.deck)).length, 0, 'ninguno quita nada');
      // «Mejorar también lo escrito»: «Proteger mi contenido» on, the author's text kept and added to.
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
      panelOf().querySelector('.as-qa').click(); await sleep(20);
      panelOf().querySelector('input[name="as-mode"][value="improve"]').click(); await sleep(10);
      panelOf().querySelector('.as-go').click(); await idle();
      const card = panelOf().querySelector('.as-prop:not(.settled)');
      assert(card.querySelector('.as-protectchk')?.checked, 'proteger, activado');
      const g4 = card.querySelector(`.as-group[data-key="${S(3).id}"]`);
      assert(/Se conserva lo que había/.test(g4.textContent), 'lo del autor, conservado: ' + g4.textContent);
      card.querySelector('.as-apply').click(); await sleep(30);
      const body4 = () => S(3).blocks.find(b => b.ph === 'body');
      eq(AG.textOf(S(2).blocks[0].html), 'Mi título', 'su título se queda');
      assert(/^Texto mío/.test(AG.textOf(body4().html)) && /Cargar los datos/.test(AG.textOf(body4().html)), 'su texto primero y los puntos nuevos después: ' + body4().html);
      eq(S(3).notes, 'Mis notas\n\nAquí explico la 4.', 'sus notas, con las nuevas al final');
      R.store.undo(); eq(AG.textOf(body4().html), 'Texto mío', 'y se deshace de una vez'); eq(S(3).notes, 'Mis notas', 'también las notas');
    } finally {
      W.fetch = real; R.ai.disconnectAi(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant();
      if (panelOf()) D.querySelector('[data-action="ai-assistant"]').click();
    }
  });

  // New slides in a deck made from a template: its layouts, master styles, background, decorations and transition.
  const fromTemplate = async key => { const d = await R.examples.loadExample(key); R.store.replaceDeck(d); R.slides.goToSlide(0); return R.state.deck; };
  const addOp = (spec, after, style = 'same') => R.aiAgent.validateOps([{ op: 'add_slide', after, spec }], { perms: ALL, style }).ops;
  const OWN = ['fontSize', 'fontFamily', 'color'];
  await test('asistente: una diapositiva añadida a una plantilla hereda su estilo (diseño, patrón, fondo, decoraciones, transición)', async () => {
    const deck = await fromTemplate('data_sales_regions'), AG = R.aiAgent, { w: W, h: H } = deck.size;
    // La 3 (Solo el título) lleva un brillo, una banda abajo y transición propias; las demás no.
    const ref = deck.slides[2]; eq(ref.layoutId, 'titleOnly', 'la referencia usa «Solo el título»');
    R.store.commit(() => { ref.background = '#f6f8fa'; ref.transition = 'push';
      ref.blocks.unshift({ id: 'brillo', type: 'shape', shape: 'ellipse', x: 800, y: -200, w: 700, h: 700, fill: '#156082', fill2: '#f6f8fa', gradType: 'radial', opacity: 40, stroke: '#156082', strokeWidth: 0, rotation: 0, animation: null },
        { id: 'banda', type: 'shape', shape: 'rect', x: 0, y: H - 40, w: W, h: 40, fill: '#156082', stroke: '#156082', strokeWidth: 0, rotation: 0, animation: { effect: 'fade-in', order: 1 } }); });
    const ops = addOp({ kind: 'stats', title: 'Conclusiones', stats: [{ value: '18 M€', label: 'facturación' }, { value: '+12 %', label: 'crecimiento' }, { value: '3', label: 'regiones' }] }, 3);
    eq(ops.length, 1, 'operación válida'); AG.applyOps(ops);
    const ns = R.state.deck.slides[3], ids = new Set(ref.blocks.map(b => b.id));
    eq(ns.layoutId, 'titleOnly', 'usa el diseño del patrón para cifras');
    const phs = ns.blocks.filter(b => b.ph);
    assert(phs.length && phs.every(b => b.lp && R.state.deck.layouts.find(l => l.id === 'titleOnly').blocks.some(p => p.id === b.lp)), 'marcadores enlazados al diseño (lp)');
    assert(phs.every(b => OWN.every(k => b[k] == null)), 'los marcadores no fijan tamaño, tipo de letra ni color: ' + JSON.stringify(phs.map(b => OWN.map(k => b[k]))));
    assert(/Conclusiones/.test(phs[0].html), 'título en su marcador');
    eq(ns.background, '#f6f8fa', 'fondo de la de referencia'); eq(ns.transition, 'push', 'y su transición');
    const glow = ns.blocks.find(b => b.gradType === 'radial'), band = ns.blocks.find(b => b.type === 'shape' && b.y === H - 40 && b.w === W);
    assert(glow && band, 'copia el brillo y la banda'); assert(!ids.has(glow.id) && !ids.has(band.id), 'con ids nuevos');
    assert(glow.decorative && !band.animation, 'como decoración, sin animación');
    assert(!ns.blocks.some(b => b.type === 'chart'), 'no copia el contenido de la referencia');
    assert(ns.blocks.indexOf(glow) < ns.blocks.indexOf(phs[0]), 'las decoraciones, detrás');
    const values = ns.blocks.filter(b => b.type === 'text' && !b.ph && /<b>/.test(b.html));
    eq(values.length, 3, 'tres cifras'); assert(values.every(v => v.fontFamily && /Montserrat/.test(v.fontFamily)), 'cifras con la tipografía de títulos del patrón');
    const body = R.state.deck.layouts.find(l => l.id === 'titleOnly').blocks[0];
    assert(values.every(v => v.y > body.y + body.h && v.y + v.h <= H - 40 && v.x >= body.x - 1 && v.x + v.w <= body.x + body.w + 1), 'dentro del área libre bajo el título y sobre la banda');
    // Viñetas → «Título y contenido»; portada → «Portada»; sin diseños: como antes.
    AG.applyOps(addOp({ kind: 'bullets', title: 'Resumen', bullets: ['Uno', 'Dos'] }, 1));
    eq(R.state.deck.slides[1].layoutId, 'titleContent', 'viñetas en «Título y contenido»');
    assert(/<li>Uno<\/li>/.test(R.state.deck.slides[1].blocks.find(b => b.ph === 'body').html), 'viñetas en el cuerpo');
    AG.applyOps(addOp({ kind: 'closing', title: 'Gracias', subtitle: 'Preguntas' }, R.state.deck.slides.length));
    eq(R.state.deck.slides.at(-1).layoutId, 'title', 'cierre con el diseño de portada');
    const old = R.model.emptyDeck(); R.store.replaceDeck(old); R.state.deck.layouts = [];
    AG.applyOps(addOp({ kind: 'bullets', title: 'Sin diseños', bullets: ['a'] }, 1));
    const plainSlide = R.state.deck.slides[1]; assert(!plainSlide.layoutId && plainSlide.blocks[0].fontSize === 44, 'sin diseños, como antes');
  });

  await test('asistente: estilos de lo nuevo (visual, minimalista, con animación, sorpréndeme)', async () => {
    const AG = R.aiAgent, spec = { kind: 'bullets', title: 'Conclusiones', icon: 'rocket', bullets: ['Una idea', 'Otra idea', 'La última'] };
    // Más visual: idea del diseñador (no la plana) e icono del conjunto.
    let deck = await fromTemplate('product_watch');
    AG.applyOps(addOp(spec, 4, 'visual'));
    let ns = R.state.deck.slides[4], title = ns.blocks.find(b => b.ph === 'title'), lay = R.state.deck.layouts.find(l => l.id === ns.layoutId).blocks.find(b => b.ph === 'title');
    const icon = ns.blocks.find(b => b.type === 'icon'); assert(icon && icon.icon === 'rocket', 'icono del spec');
    assert(title.x !== lay.x || title.w !== lay.w, 'otra disposición del diseñador');
    assert(ns.blocks.filter(b => b.ph).every(b => OWN.every(k => b[k] == null)), 'sigue heredando del patrón');
    AG.applyOps(addOp({ kind: 'stats', title: 'Datos clave', stats: [{ value: '14', label: 'días' }, { value: '38 g', label: 'peso' }] }, 4, 'visual'));
    assert(R.state.deck.slides[4].blocks.some(b => b.type === 'icon' && b.icon), 'cifras: icono junto al título');
    // Minimalista: más aire, cuerpo algo mayor (escala relativa) y sin decoración añadida.
    deck = await fromTemplate('product_watch');
    AG.applyOps(addOp(spec, 4, 'minimal'));
    ns = R.state.deck.slides[4]; const body = ns.blocks.find(b => b.ph === 'body'), lb = R.state.deck.layouts.find(l => l.id === ns.layoutId).blocks.find(b => b.ph === 'body');
    assert(body.x > lb.x && body.w < lb.w, 'márgenes mayores'); assert(body.fit > 1 && body.fontSize == null, 'cuerpo mayor con un factor, sin tamaño propio: ' + body.fit);
    assert(!ns.blocks.some(b => b.type === 'icon'), 'sin icono');
    AG.applyOps(addOp({ kind: 'stats', title: 'Cifras', stats: [{ value: '1', label: 'a' }, { value: '2', label: 'b' }] }, 4, 'minimal'));
    assert(!R.state.deck.slides[4].blocks.some(b => b.type === 'shape' && !b.decorative), 'cifras sin tarjetas');
    // Con animación: entradas encadenadas (la primera también arranca sola) y una transición.
    deck = await fromTemplate('product_watch');
    AG.applyOps(addOp({ kind: 'timeline', title: 'Pasos', steps: [{ label: '1', text: 'a' }, { label: '2', text: 'b' }, { label: '3', text: 'c' }] }, 4, 'animated'));
    ns = R.state.deck.slides[4];
    const anims = ns.blocks.filter(b => b.animation).map(b => b.animation).sort((a, b) => a.seq - b.seq);
    assert(anims.length >= 7, 'título, etiquetas y textos animados: ' + anims.length);
    assert(anims.every(a => ['fade-up', 'zoom-in'].includes(a.effect) && ['afterPrev', 'withPrev'].includes(a.start)), 'aparecer o acercar, tras la anterior');
    eq(anims[0].start, 'afterPrev', 'la primera arranca sola'); assert(anims.every(a => a.order === 1), 'sin clics');
    assert(anims.slice(1).some(a => a.delay > 0 && a.delay <= 300), 'con retardos cortos');
    assert(ns.blocks.filter(b => b.decorative).every(b => !b.animation), 'las decoraciones, quietas');
    eq(ns.transition, 'fade', 'la transición más usada de la presentación');
    // Sorpréndeme: al azar con semilla por diapositiva: la vista previa y lo aplicado coinciden.
    deck = await fromTemplate('creative_swiss_film');
    const ops = addOp({ ...spec, icon: undefined }, 3, 'surprise'); eq(ops[0].style, 'surprise', 'la operación lleva el estilo');
    const sig = s => JSON.stringify(s.blocks.map(b => [b.type, b.ph || '', b.x, b.y, b.w, b.h, b.icon || '', b.animation?.effect || '', b.animation?.start || '']).concat([[s.layoutId, s.transition]]));
    const p1 = AG.previewDeck(ops).slides[3], p2 = AG.previewDeck(ops).slides[3];
    eq(sig(p1), sig(p2), 'misma vista previa dos veces');
    AG.applyOps(ops); eq(sig(R.state.deck.slides[3]), sig(p1), 'lo aplicado es lo que se vio');
    assert(R.state.deck.slides[3].blocks.some(b => b.animation), 'con animación');
    assert(R.state.deck.slides[3].blocks.filter(b => b.ph).every(b => OWN.every(k => b[k] == null)), 'con las tipografías y colores del patrón');
    // Rehacer una diapositiva: en su diseño y con su fondo.
    const s5 = R.state.deck.slides[5], bg5 = s5.background;
    AG.applyOps(AG.validateOps([{ op: 'replace_slide', slide: 6, spec: { kind: 'bullets', title: 'Rehecha', bullets: ['x'] } }], { perms: ALL }).ops);
    eq(s5.layoutId, 'titleContent', 'rehecha con su diseño'); eq(s5.background, bg5, 'conserva el fondo');
  });

  // A real answer of the model (Gemini 2.5 Flash) that read badly: "1." typed by hand, "•" inside the items,
  // nesting with spaces, headings as one more bullet, "Label: text" without bold, all crammed in one box.
  const BAD_HTML = "<ul><li>Porque la energía nuclear tiene otros problemas que no son climáticos:</li><li>1. Los residuos radiactivos: Deben guardarse durante miles de años.</li><li>2. Riesgo de accidentes: Impacto social y mediático enorme (Chernóbil, Fukushima).</li><li>3. No es infinita: El uranio es un mineral; NO es renovable.</li><li>Cómo clasificarla de forma 100% rigurosa en tu Power BI:</li><li>• En lugar de 'Limpia vs Sucia', usa la taxonomía oficial de la ONU:</li><li>    • Combustibles Fósiles: Carbón, Gas, Petróleo.</li><li>    • Bajas en Carbono: Solar, Eólica, Hidroeléctrica y Nuclear.</li></ul>";
  const BAD_TEXT = "- Porque la energía nuclear tiene otros problemas que no son climáticos:\n- 1. Los residuos radiactivos: Deben guardarse durante miles de años.\n- 2. Riesgo de accidentes: Impacto social y mediático enorme (Chernóbil, Fukushima).\n- 3. No es infinita: El uranio es un mineral; NO es renovable.\n- Cómo clasificarla de forma 100% rigurosa en tu Power BI:\n- • En lugar de 'Limpia vs Sucia', usa la taxonomía oficial de la ONU:\n-     • Combustibles Fósiles: Carbón, Gas, Petróleo.\n-     • Bajas en Carbono: Solar, Eólica, Hidroeléctrica y Nuclear.";
  const GOOD_HTML = '<p><b>Porque la energía nuclear tiene otros problemas que no son climáticos</b></p><ol><li><b>Los residuos radiactivos:</b> Deben guardarse durante miles de años.</li>'
    + '<li><b>Riesgo de accidentes:</b> Impacto social y mediático enorme (Chernóbil, Fukushima).</li><li><b>No es infinita:</b> El uranio es un mineral; NO es renovable.</li></ol>'
    + "<p><b>Cómo clasificarla de forma 100% rigurosa en tu Power BI</b></p><ul><li>En lugar de 'Limpia vs Sucia', usa la taxonomía oficial de la ONU:<ul>"
    + '<li><b>Combustibles Fósiles:</b> Carbón, Gas, Petróleo.</li><li><b>Bajas en Carbono:</b> Solar, Eólica, Hidroeléctrica y Nuclear.</li></ul></li></ul>';
  await test('IA: texto de la IA normalizado (numeración, viñetas, sangrías, subtítulos, «Etiqueta:» en negrita)', async () => {
    const W = frame.contentWindow, RT = await W.eval("import('/src/features/ai/richtext.js')"), AG = R.aiAgent;
    eq(RT.richHTML(BAD_HTML), GOOD_HTML, 'el HTML del ejemplo, arreglado');
    eq(RT.richHTML(BAD_TEXT), GOOD_HTML, 'y lo mismo desde el texto con «- » que manda el modelo');
    eq(AG.toHTML(BAD_TEXT), GOOD_HTML, 'set_text lo usa');
    const sh = RT.shapeOf(RT.outline(BAD_HTML)); eq(sh.groups, 2, 'dos grupos'); eq(sh.headings, 2, 'con subtítulo'); assert(sh.nested, 'con anidación');
    // Lo de siempre sigue igual; lo que no es una lista, tampoco.
    eq(AG.toHTML('Nuevo título'), 'Nuevo título', 'una línea'); eq(AG.toHTML('- a\n- b'), '<ul><li>a</li><li>b</li></ul>', 'viñetas');
    eq(AG.toHTML('uno\ndos'), 'uno<br>dos', 'líneas'); eq(AG.toHTML('— Anónimo'), '— Anónimo', 'una firma no es una lista');
    eq(AG.toHTML('Cuesta 3.200 €'), 'Cuesta 3.200 €', 'un número no es una numeración');
    eq(RT.richHTML(['1) Medir', '2) Reducir']), '<ol><li>Medir</li><li>Reducir</li></ol>', 'numeradas a mano → lista numerada');
    eq(RT.richHTML('* uno\n  * dos\n* tres'), '<ul><li>uno<ul><li>dos</li></ul></li><li>tres</li></ul>', 'anidada por sangría');
    eq(RT.richHTML('### Ventajas\n- **Coste:** bajo'), '<p><b>Ventajas</b></p><ul><li><b>Coste:</b> bajo</li></ul>', 'markdown: encabezado y negrita');
    eq(RT.richHTML('- Ver https://x.org: aquí'), '<ul><li>Ver https://x.org: aquí</li></ul>', 'una dirección no es una etiqueta');
    eq(RT.richHTML('<b>Nota:</b> &lt;algo&gt;'), '<b>Nota:</b> &lt;algo&gt;', 'el HTML que manda, escapado');
  });

  await test('asistente: un cuerpo largo y estructurado se convierte en columnas o tarjetas (y si no, cabe)', async () => {
    const deck = await fromTemplate('product_watch'), AG = R.aiAgent;
    AG.applyOps(addOp({ kind: 'bullets', title: 'Energía', bullets: ['Una idea', 'Otra'] }, 1));
    const s = R.state.deck.slides[1], body = s.blocks.find(b => b.ph === 'body'), title = s.blocks.find(b => b.ph === 'title');
    const ops = AG.validateOps([{ op: 'set_text', slide: 2, id: title.id, text: '¿Es «limpia» la nuclear?' }, { op: 'set_text', slide: 2, id: body.id, text: BAD_TEXT }], { perms: ALL }).ops;
    eq(ops[1].op, 'replace_slide', 'se rehace la diapositiva'); eq(ops[1].spec.kind, 'comparison', 'en columnas');
    eq(ops[1].spec.columns.map(c => c.heading).join('|'), 'Porque la energía nuclear tiene otros problemas que no son climáticos|Cómo clasificarla de forma 100% rigurosa en tu Power BI', 'los subtítulos, de encabezado');
    AG.applyOps(ops);
    const ns = R.state.deck.slides[1], texts = ns.blocks.filter(b => b.type === 'text');
    assert(/limpia/.test(ns.blocks.find(b => b.ph === 'title').html), 'con el título nuevo (cambiado en la misma propuesta)');
    eq(texts.filter(b => b.bg && /Porque|Cómo/.test(b.html)).length, 2, 'dos encabezados con color');
    assert(texts.some(b => /<ol><li><b>Los residuos radiactivos:<\/b>/.test(b.html)), 'los numerados, en una lista numerada con la etiqueta en negrita');
    assert(texts.some(b => /<li>En lugar de .*<ul><li><b>Combustibles Fósiles:<\/b>/.test(b.html)), 'los anidados, anidados');
    eq(AG.checkSlides(R.state.deck, new Set([ns.id])).filter(p => p.kind !== 'contrast').length, 0, 'todo cabe, sin solaparse');
    // Sin permiso para objetos: el mismo cuadro, normalizado, y que quepa (en dos columnas si hace falta).
    const s2 = R.state.deck.slides[1];
    AG.applyOps(addOp({ kind: 'bullets', title: 'Energía', bullets: ['Una idea', 'Otra'] }, 1));
    const s3 = R.state.deck.slides[1], b3 = s3.blocks.find(b => b.ph === 'body');
    const o2 = AG.validateOps([{ op: 'set_text', slide: 2, id: b3.id, text: BAD_TEXT }], { perms: { ...ALL, objects: false } }).ops;
    eq(o2[0].op, 'set_text', 'sin permiso, sigue siendo un texto'); AG.applyOps(o2);
    eq(b3.html, GOOD_HTML, 'normalizado'); assert(s2 !== s3, 'otra diapositiva');
    eq(AG.checkSlides(R.state.deck, new Set([s3.id])).filter(p => p.kind === 'overflow').length, 0, 'y cabe: ' + JSON.stringify({ fit: b3.fit, columns: b3.columns }));
    // Una diapositiva con más cosas (una tabla) no se rehace.
    R.store.commit(() => s3.blocks.push({ id: 'tabla', type: 'table', rows: [['a']], x: 900, y: 600, w: 100, h: 40, rotation: 0, animation: null }));
    eq(AG.validateOps([{ op: 'set_text', slide: 2, id: b3.id, text: BAD_TEXT }], { perms: ALL }).ops[0].op, 'set_text', 'con una tabla, solo el texto');
  });

  await test('asistente: diapositivas con composiciones según el contenido (y lo que manda el modelo, aunque venga mal)', async () => {
    const deck = await fromTemplate('biz_climate'), AG = R.aiAgent, n0 = deck.slides.length;
    const specs = [
      { kind: 'bullets', title: 'Problemas', bullets: ['1. Residuos: duran miles de años.', '2. Accidentes: impacto enorme.', '3. Uranio: no es renovable.'] },
      { kind: 'bullets', title: 'Ventajas', bullets: ['Coste: la más barata', 'Empleo: puestos locales', 'Independencia: menos importaciones', 'Salud: aire más limpio'] },
      { kind: 'Process', title: 'Cómo empezar', steps: ['Paso 1: Medir el consumo', 'Paso 2: Reducir', 'Paso 3: Contratar energía verde'] },
      { kind: 'KPIs', title: 'Cifras', items: ['42 %: renovable', '−18 %: emisiones', '3.200 empleos nuevos'] },
      { kind: 'bullets', title: 'Agenda', bullets: ['Contexto', 'Opciones', 'Costes', 'Plan'] },
      { kind: 'statement', text: 'La energía más limpia es la que no se consume.' },
      { kind: 'comparison', title: 'A favor y en contra', pros: ['Barata', 'Limpia'], cons: ['Intermitente'] },
      { kind: 'cards', title: 'Qué gana', items: [{ name: 'Ahorro', description: 'Un 30 % menos', icon: 'piggy-bank' }, { heading: 'Clima', desc: 'Menos CO₂' }, 'Imagen: marca responsable'] },
      { kind: 'roadmap', title: 'Calendario', events: [{ year: 2025, text: 'Auditoría' }, { year: 2026, text: 'Contrato' }, { year: 2030, text: 'Neutralidad' }] },
      { kind: 42, title: null, bullets: 'una\ndos' },
    ];
    const ops = AG.validateOps(specs.map(spec => ({ op: 'add_slide', after: n0, spec })), { perms: ALL }).ops;
    eq(ops.map(o => o.spec.kind).join(','), 'steps,features,steps,stats,agenda,key_idea,comparison,features,timeline,bullets', 'el tipo que pide el contenido');
    eq(ops[2].spec.steps.map(s => s.title).join('|'), 'Medir el consumo|Reducir|Contratar energía verde', '«Paso 1:» fuera');
    eq(ops[3].spec.stats.map(s => s.value).join('|'), '42 %|−18 %|3.200', 'cifras leídas de textos');
    eq(ops[7].spec.items.map(s => s.title).join('|'), 'Ahorro|Clima|Imagen', 'tarjetas con otros nombres de campos');
    eq(ops[8].spec.steps.map(s => s.label).join('|'), '2025|2026|2030', 'fechas');
    AG.applyOps(ops);
    const made = R.state.deck.slides.slice(n0), ids = new Set(made.map(s => s.id)), { w: W, h: H } = deck.size;
    const m = R.master.masterStyles(R.state.deck), cols = new Set(R.state.deck.slides.slice(0, n0).flatMap(s => s.blocks.flatMap(b => [b.fill, b.color, b.bg])).filter(Boolean).map(c => String(c).toLowerCase()));
    for (const s of made) {
      const own = s.blocks.filter(b => b.fromSpec);
      assert(own.every(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= W + 1 && b.y + b.h <= H + 1), 'dentro de la diapositiva: ' + s.blocks[0].html);
      assert(own.filter(b => b.type === 'text').every(b => [m.title.font, m.body.font].includes(b.fontFamily)), 'con las tipografías del patrón');
      assert(own.filter(b => b.type === 'shape').every(b => cols.has(String(b.fill).toLowerCase()) || b.fill === m.body.color), 'con los colores de la presentación');
    }
    const steps = made[0].blocks.filter(b => b.fromSpec === 'steps' && b.type === 'text' && /^<b>\d<\/b>$/.test(b.html));
    eq(steps.map(b => b.html).join(''), '<b>1</b><b>2</b><b>3</b>', 'tarjetas numeradas');
    eq(made[1].blocks.filter(b => b.type === 'icon').length, 4, 'tarjetas con iconos');
    const probs = AG.checkSlides(R.state.deck, ids).filter(p => ['overflow', 'offslide', 'overlap'].includes(p.kind));
    eq(probs.length, 0, 'todo cabe y sin solaparse: ' + JSON.stringify(probs.slice(0, 3)));
    // Una lista larga: en dos columnas; más larga aún: dos diapositivas.
    const short = Array.from({ length: 9 }, (_, i) => `Medida número ${i + 1}`);
    const long = Array.from({ length: 12 }, (_, i) => `Una medida bastante larga, la número ${i + 1}, que ocupa casi una línea entera`);
    let o = AG.validateOps([{ op: 'add_slide', after: 1, spec: { kind: 'bullets', title: 'Medidas', bullets: short } }], { perms: ALL }).ops;
    eq(o.length, 1, 'una'); eq(o[0].spec.columns, 2, 'en dos columnas');
    AG.applyOps(o); eq(R.state.deck.slides[1].blocks.find(b => b.ph === 'body').columns, 2, 'el cuerpo, en dos columnas');
    o = AG.validateOps([{ op: 'add_slide', after: 1, spec: { kind: 'bullets', title: 'Medidas', bullets: long } }], { perms: ALL }).ops;
    eq(o.length, 2, 'dos diapositivas'); eq(o[1].spec.title, 'Medidas (2)', 'la segunda, numerada');
    eq(o[0].spec.bullets.length + o[1].spec.bullets.length, 12, 'repartidas');
    // Sin diseños (una presentación vacía): las mismas composiciones con la paleta.
    reset(); R.state.deck.layouts = [];
    AG.applyOps(AG.validateOps([{ op: 'add_slide', after: 1, spec: specs[1] }], { perms: ALL }).ops);
    eq(R.state.deck.slides[1].blocks.filter(b => b.type === 'icon').length, 4, 'tarjetas con iconos también sin diseños');
  });

  await test('asistente: el estilo de lo nuevo en el panel (recordado, enviado al modelo y en las miniaturas)', async () => {
    await fromTemplate('product_watch'); R.slides.goToSlide(3);
    const W = frame.contentWindow, real = W.fetch, calls = [], P = await W.eval("import('/src/ui/dialogs/assistant.js')");
    P.resetAssistant(); W.localStorage.removeItem('revela.assistant.v1');
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    W.fetch = agentMock(W, [{ message: 'Añado las conclusiones', done: true, ops: [{ op: 'add_slide', after: 4, spec: { kind: 'bullets', title: 'Conclusiones', icon: 'rocket', bullets: ['a', 'b'] } }] }], calls);
    const panelOf = () => D.getElementById('assistant-panel');
    try {
      D.querySelector('[data-action="ai-assistant"]').click(); await sleep(20);
      const sel = panelOf().querySelector('.as-style'); assert(sel, 'selector «Estilo de lo nuevo»');
      eq(sel.value, 'same', 'por defecto, como el resto'); eq(sel.options.length, 5, 'cinco estilos');
      sel.value = 'visual'; sel.dispatchEvent(new W.Event('change'));
      eq(JSON.parse(W.localStorage.getItem('revela.assistant.v1')).style, 'visual', 'recordado');
      panelOf().querySelector('textarea').value = 'Añade conclusiones'; panelOf().querySelector('.as-send').click();
      for (let i = 0; i < 100 && (!P.assistantState().pending || P.assistantState().busy); i++) await sleep(20);
      assert(/MORE VISUAL/.test(calls[0].messages[0].content), 'se explica al modelo');
      const pend = P.assistantState().pending; eq(pend.ops[0].style, 'visual', 'la propuesta lleva el estilo');
      const th = panelOf().querySelectorAll('.as-prop .as-th'), after = th[th.length - 1];
      const inner = after.firstElementChild, ns = R.aiAgent.previewDeck(pend.ops, pend.base).slides[4];
      const iconBox = ns.blocks.find(b => b.type === 'icon');
      assert(iconBox && [...inner.children].some(el => el.style.left === iconBox.x + 'px' && el.style.top === iconBox.y + 'px'), 'la miniatura de después ya lleva el icono');
      panelOf().querySelector('.as-apply').click(); await sleep(20);
      assert(R.state.deck.slides[4].blocks.some(b => b.type === 'icon' && b.icon === 'rocket'), 'aplicado con el estilo');
    } finally {
      W.fetch = real; R.ai.disconnectAi(); W.localStorage.removeItem('revela.assistant.v1'); P.resetAssistant();
      if (panelOf()) D.querySelector('[data-action="ai-assistant"]').click();
    }
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
    (await W.eval("import('/src/features/content/maps.js')")).clearMapCache();   // (another test may have loaded the real one: these outlines, not those)
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
      if (typeof v === 'string') assert(/^https:\/\/cdn\.jsdelivr\.net\/npm\/(@[^/]+\/)?[^/@]+@\d/.test(v)
        || /^https:\/\/cdn\.jsdelivr\.net\/gh\/[\w-]+\/[\w-]+@\d[\w.]*\//.test(v)                    // (a repository, by tag: Draco's decoder)
        || /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/[\w/]+\/\d+\/[\w.]+$/.test(v), k + ' con versión fijada');   // (MediaPipe's models: from Google, by version)
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
    reset(); const own = R.state.deck; own.name = 'Mi proyecto'; R.store.commit(() => {}); await R.model.flushSave(); const W = frame.contentWindow;
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

  await test('coedición: dos personas cambian lo mismo a la vez y acaban viendo lo mismo (confirmaciones)', async () => {
    reset(); const W = frame.contentWindow, C = await W.eval("import('/src/features/live/collab.js')");
    const [h, g] = pipe(); const sent = []; h.onData(m => sent.push(m));
    const shared = R.model.emptyDeck(); shared.name = 'Compartida';
    h.onData(m => { if (m.t === 'hello') h.send({ t: 'welcome', you: 'g1', role: 'edit', color: '#123456', deck: shared, peers: [], chat: [], acks: 1 }); });
    const sess = await C.joinCollab({ name: 'Luis', token: 'tok', connect: async () => g });
    try {
      R.store.commit(() => { R.state.deck.name = 'De Luis'; }); await sleep(10);
      const mine = sent.find(m => m.t === 'ops' && m.ops.some(o => o.p[0] === 'name'));
      assert(mine && Number.isInteger(mine.n), 'su cambio sale numerado');
      // Ana's change of the same thing reached the server first: Luis's goes after it there, so it stays.
      h.send({ t: 'ops', ops: [{ p: ['name'], v: 'De Ana' }] }); await sleep(10);
      eq(R.state.deck.name, 'De Luis', 'lo de antes de la confirmación queda debajo del suyo (como en el servidor)');
      h.send({ t: 'ack', n: mine.n }); await sleep(10);
      h.send({ t: 'ops', ops: [{ p: ['name'], v: 'De Ana, después' }] }); await sleep(10);
      eq(R.state.deck.name, 'De Ana, después', 'lo de después de la confirmación sí se ve');
      assert(!sent.some(m => m.t === 'ops' && m.ops.some(o => o.p[0] === 'name' && /Ana/.test(o.v))), 'y no reenvía los cambios ajenos como suyos');
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
    const drive = new Map(), sessions = new Map(), bigUploads = []; let n = 0, requests = [];
    const md5 = c => { let h = 7; for (const ch of String(c)) h = (h * 31 + ch.charCodeAt(0)) | 0; return 'h' + (h >>> 0).toString(16); };   // (a fingerprint of the content, like Drive's)
    const realGoogle = W.google, realFetch = W.fetch;
    W.google = { accounts: { oauth2: { initTokenClient: o => ({ requestAccessToken() { this.callback({ access_token: 'tok', expires_in: 3600 }); } }), revoke: (_, cb) => cb?.() } } };
    const file = (id, name, content, extra = {}) => drive.set(id, { id, name, content, version: '1', parents: ['raiz0'], modifiedTime: new Date(Date.now() - 1000 * (++n)).toISOString(), ...extra });
    const folders = new Map([['fproy', { id: 'fproy', name: 'Proyectos' }]]);
    file('old1', 'Clase 1.revela.json', JSON.stringify({ ...R.model.emptyDeck(), name: 'Clase 1' }));
    file('old2', 'Clase 2.revela.json', JSON.stringify({ ...R.model.emptyDeck(), name: 'Clase 2' }), { thumbnailLink: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });
    W.fetch = async (url, o = {}) => {
      url = String(url); requests.push({ url, method: o.method || 'GET' });
      const ok = b => new W.Response(typeof b === 'string' ? b : JSON.stringify(b && b.content !== undefined ? { ...b, md5Checksum: md5(b.content) } : b), { status: 200 });
      if (!url.startsWith('https://www.googleapis.com')) return realFetch(url, o);
      if (url.includes('/oauth2/v3/userinfo')) return ok({ name: 'Ana Pérez', email: 'ana@example.org' });
      const m = url.match(/\/files\/([^/?]+)/), id = m && decodeURIComponent(m[1]);
      // (Big files in two steps: the description gives an address, the bytes go there.)
      if (url.includes('uploadType=resumable')) { const sid = 's' + (++n); sessions.set(sid, { id, meta: JSON.parse(o.body), size: +o.headers['X-Upload-Content-Length'] }); return new W.Response('', { status: 200, headers: { Location: 'https://www.googleapis.com/upload/session/' + sid } }); }
      if (url.includes('/upload/session/')) {
        const { id: sid, meta, size } = sessions.get(url.split('/').pop()), content = await o.body.text(); bigUploads.push({ size, got: o.body.size, typeOf: typeof o.body });
        if (sid) { const f = drive.get(sid); f.content = content; f.version = String(+f.version + 1); f.thumb = !!meta.contentHints; return ok(f); }
        const nid = 'new' + (++n); file(nid, meta.name, content, { modifiedTime: new Date().toISOString() }); return ok(drive.get(nid));
      }
      if (url.includes('/upload/drive/v3/files')) {
        const parts = o.body.split(/--revela\w+/).filter(x => x.includes('\r\n\r\n')).map(x => x.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''));
        const meta = JSON.parse(parts[0]), content = parts[1];
        if (id) { const f = drive.get(id); f.content = content; f.version = String(+f.version + 1); f.modifiedTime = new Date().toISOString(); f.thumb = !!meta.contentHints; return ok(f); }
        const nid = 'new' + (++n); file(nid, meta.name, content, { modifiedTime: new Date().toISOString(), thumb: !!meta.contentHints, ...(meta.parents && { parents: meta.parents }) }); return ok(drive.get(nid));
      }
      if (url.includes('/drive/v3/files?q=')) return ok({ files: [...drive.values()].filter(f => !f.trashed).sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime)) });
      if (id && folders.has(id)) return ok(folders.get(id));
      if (id && !drive.has(id)) return new W.Response('{"error":{"code":404}}', { status: 404 });
      if (id && url.includes('alt=media')) return ok(drive.get(id).content);
      if (id && o.method === 'PATCH') { drive.get(id).trashed = true; return ok({}); }
      if (id) return ok(drive.get(id));
      return new W.Response('{}', { status: 404 });
    };
    GD.setThumbnailMaker(async () => 'AAAA'); GD.setAutosaveDelay(50);
    try {
      const btn = D.getElementById('account-btn');
      assert(/Google Drive/.test(btn.textContent), 'botón para conectar Google Drive (no «Iniciar sesión»: la cuenta de Revela tiene el suyo)');
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
      // Drive touching the file by itself (its thumbnail, its index): a newer version, the same content → no conflict.
      drive.get('old2').version = '3';
      R.store.commit(() => { R.state.deck.slides[0].notes = 'nota 1b'; }); await sleep(250);
      assert(D.getElementById('drive-conflict').hidden && drive.get('old2').content.includes('nota 1b'), 'una versión nueva sin cambios de contenido no es un conflicto');
      // Two saves at once (a slow one and the autosave): one after the other, no conflict with itself.
      await Promise.all([GD.savePresentation({ interactive: false }), GD.savePresentation({ interactive: false })]);
      assert(D.getElementById('drive-conflict').hidden, 'dos guardados seguidos no se pisan');
      // A big one (pictures of several MB): written in pieces and sent in two steps — never one huge text.
      const pic = 'data:image/png;base64,' + 'A'.repeat(6e6);
      R.store.commit(() => { R.state.deck.slides[0].blocks.push({ id: 'bigpic', type: 'image', x: 0, y: 0, w: 100, h: 100, src: pic }); }); await sleep(400);
      eq(bigUploads.length, 1, 'subida en dos pasos'); eq(bigUploads[0].typeOf, 'object', 'el contenido, a trozos (no un texto)'); eq(bigUploads[0].got, bigUploads[0].size, 'del tamaño anunciado');
      eq(JSON.parse(drive.get('old2').content).slides[0].blocks.find(b => b.id === 'bigpic')?.src.length, pic.length, 'y en Drive está entera');
      R.store.commit(() => { R.state.deck.slides[0].blocks = R.state.deck.slides[0].blocks.filter(b => b.id !== 'bigpic'); }); await sleep(250);
      // Moved to another folder and renamed in Drive: the same file, so it keeps saving there; it learns where, and says so.
      Object.assign(drive.get('old2'), { parents: ['fproy'], name: 'Clase 2 bis.revela.json' });
      R.store.commit(() => { R.state.deck.slides[0].notes = 'nota 1c'; }); await sleep(250);
      assert(drive.get('old2').content.includes('nota 1c') && D.getElementById('drive-conflict').hidden, 'movida: se sigue guardando en el mismo archivo');
      eq(GD.linkedFile().folder?.name, 'Proyectos', 'sabe en qué carpeta está ahora'); eq(GD.linkedFile().name, 'Clase 2 bis.revela.json', 'y su nombre nuevo');
      assert(/Proyectos/.test(D.getElementById('toasts')?.textContent || ''), 'y lo dice: ' + D.getElementById('toasts')?.textContent);
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
      // Opening another one a moment after a change (before the autosave): that change still reaches its file.
      R.store.commit(() => { R.state.deck.slides[0].notes = 'justo antes de abrir otra'; });
      R.store.replaceDeck(R.model.emptyDeck()); await sleep(250);
      assert(drive.get('old2').content.includes('justo antes de abrir otra'), 'el último cambio llega a Drive aunque se abra otra enseguida');
      eq(GD.linkedFile(), null, 'y la otra no queda vinculada a ese archivo');
      await GD.openPresentation('old2'); await sleep(50);
      // Another presentation replacing it (Nuevo, abrir archivo…) never writes over the Drive file.
      const before = drive.get('old2').content;
      R.store.replaceDeck(R.model.emptyDeck()); R.store.commit(() => { R.state.deck.name = 'Otra cosa'; }); await sleep(250);
      eq(drive.get('old2').content, before, 'el archivo de Drive no se toca'); eq(GD.linkedFile(), null, 'ya no está vinculada');
      // New from My presentations: a new file in Drive, saved as you go.
      D.querySelector('[data-action="home"]').click(); await sleep(80);
      D.querySelector('#home-screen [data-home="new"]').click(); await sleep(150);
      const nf = GD.linkedFile(); assert(nf && drive.get(nf.id), 'nueva: se crea en Drive');
      // Deleted for good in Drive (or no access): unlinked, and it asks where to keep it now — nothing saved blindly.
      drive.delete(nf.id); const count = drive.size;
      R.store.commit(() => { R.state.deck.slides[0].notes = 'tras borrar'; }); await sleep(250);
      for (let i = 0; i < 20 && !D.querySelector('.dlg-msg'); i++) await sleep(20);
      assert(/No encuentro/.test(D.querySelector('.dlg-msg')?.textContent || ''), 'pregunta: ' + (D.querySelector('.dlg-msg')?.textContent || ''));
      D.querySelector('.dlg-cancel').click(); await sleep(30);
      eq(GD.linkedFile(), null, 'ya no está vinculada'); eq(drive.size, count, 'y no se ha creado nada sin preguntar');
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
      assert(/servidor de Revela|tu servidor/.test(D.querySelector('.dlg-msg').textContent), 'avisa de que va por el servidor'); D.querySelector('.dlg-ok').click(); await sleep(150);
      const c = sent.find(x => x.url === 'https://revela-share.fmesasc.workers.dev/c');
      assert(c && c.o.headers.Authorization === 'Bearer tokG', 'crea la sala con la sesión de Google');
      eq(GD.account()?.email, 'ana@example.org', 'e inicia sesión si no la había');
      const msg = D.querySelector('.dlg-msg')?.textContent || '';
      assert(/no tiene permiso/.test(msg) && /directamente entre navegadores/.test(msg), 'si el servidor no deja, ofrece hacerlo directo: ' + msg);
      D.querySelector('.dlg-cancel').click();
    } finally { W.fetch = realFetch; W.google = realGoogle; await GD.signOut(); }
  });

  await test('nube de Revela: abrir, guardar solo, recibir cambios de otros y respetar el permiso', async () => {
    reset(); const W = frame.contentWindow, CD = R.clouddocs, CS = await W.eval("import('/src/features/live/collabsync.js')");
    // A server in memory, like server/cloudflare/docs.js: a revision, a log of changes, the role of this person.
    const base = JSON.parse(JSON.stringify(R.state.deck)); base.name = 'Nube';
    base.slides = [{ ...base.slides[0], id: 's1', blocks: [{ id: 'b1', type: 'text', x: 0, y: 0, w: 100, h: 50, html: 'Uno' }], comments: [] }];
    const srv = { deck: base, rev: 1, log: [], role: 'edit', calls: [] };
    const io = async (path, body) => {
      srv.calls.push(path);
      if (/^docs\/[\w-]+$/.test(path)) return { deck: JSON.parse(JSON.stringify(srv.deck)), rev: srv.rev, role: srv.role, owner: 'ana@example.com' };
      if (/\/since\?rev=/.test(path)) { const from = +path.split('=')[1]; return { rev: srv.rev, ops: srv.log.filter(e => e.rev > from).flatMap(e => e.ops) }; }
      if (/\/ops$/.test(path)) {
        if (!body.ops.every(o => CS.allowed(o, srv.role))) throw Object.assign(new Error('forbidden'), { status: 403 });
        CS.applyOps(srv.deck, body.ops); srv.log.push({ rev: ++srv.rev, ops: body.ops }); return { rev: srv.rev };
      }
      if (/\/view$/.test(path)) return { ok: true };
      throw new Error('?' + path);
    };
    const other = ops => { CS.applyOps(srv.deck, ops); srv.log.push({ rev: ++srv.rev, ops }); };
    try {
      await CD.openDoc('abcdefghijklmnop1234', { io, pollMs: 60, debounceMs: 30 });
      eq(slide().blocks[0].html, 'Uno', 'se abre la de la nube');
      eq(CD.cloudDoc().role, 'edit', 'con el permiso que da el servidor');
      R.store.commit(() => { slide().blocks[0].html = 'Uno, editado'; }); await sleep(250);
      eq(srv.deck.slides[0].blocks[0].html, 'Uno, editado', 'lo que se cambia aquí llega solo al servidor');
      eq(CD.cloudDoc().status, 'saved', 'y queda «guardado»');
      other([{ p: ['slides', 's1', 'blocks', 'b1', 'x'], v: 40 }, { p: ['slides', 's1', 'blocks', 'b2'], v: { id: 'b2', type: 'text', x: 0, y: 100, w: 100, h: 50, html: '<img src=x onerror=alert(1)>Dos' } }]);
      await sleep(250);
      eq(slide().blocks.length, 2, 'lo que cambian otros llega aquí');
      eq(slide().blocks[0].x, 40, 'y se mezcla con lo de aquí');
      eq(slide().blocks[0].html, 'Uno, editado', 'sin perder lo de aquí');
      assert(!/onerror/.test(slide().blocks[1].html), 'lo de otros no puede ejecutar código');
      R.store.undo(); await sleep(20);
      eq(slide().blocks.length, 2, 'deshacer solo deshace lo propio');
      CD.closeDoc();
      // Someone who can only comment: the editor won't edit, comments do reach the server.
      srv.role = 'comment'; await CD.openDoc('abcdefghijklmnop1234', { io, pollMs: 60, debounceMs: 30 });
      eq(R.state.ui.lock, 'comment', 'con permiso para comentar, el resto bloqueado');
      const before = slide().blocks[0].html; R.store.commit(() => { slide().blocks[0].html = 'no'; }); await sleep(120);
      eq(slide().blocks[0].html, before, 'no se puede editar');
      R.comments.addComment('Buen trabajo'); await sleep(250);
      eq(srv.deck.slides[0].comments.at(-1)?.text, 'Buen trabajo', 'pero sí comentar, y llega al servidor');
      CD.closeDoc();
      srv.role = 'view'; await CD.openDoc('abcdefghijklmnop1234', { io, pollMs: 60, debounceMs: 30 });
      const n = srv.calls.filter(c => /\/ops$/.test(c)).length; R.comments.addComment('x'); await sleep(150);
      eq(srv.calls.filter(c => /\/ops$/.test(c)).length, n, 'quien solo ve no envía nada');
      assert(srv.calls.some(c => /\/view$/.test(c)), 'y cuenta en las estadísticas (qué diapositiva y cuánto tiempo)');
      CD.closeDoc(); eq(R.state.ui.lock, null, 'al cerrarla, el editor vuelve a ser libre');
      eq(CD.docIdFrom('?doc=abcdefghijklmnop1234'), 'abcdefghijklmnop1234', 'se abre con ?doc='); eq(CD.docIdFrom('?doc=../x'), null, 'solo ids válidos');
    } finally { CD.closeDoc(); }
  });

  await test('nube de Revela: solo lectura por el límite del plan (aviso amable, nada se envía, nada se pierde)', async () => {
    reset(); const W = frame.contentWindow, CD = R.clouddocs, CS = await W.eval("import('/src/features/live/collabsync.js')"), UI = await W.eval("import('/src/ui/dialogs/cloud.js')");
    const base = JSON.parse(JSON.stringify(R.state.deck)); base.name = 'Vieja';
    base.slides = [{ ...base.slides[0], id: 's1', blocks: [{ id: 'b1', type: 'text', x: 0, y: 0, w: 100, h: 50, html: 'Uno' }], comments: [] }];
    const srv = { deck: base, rev: 1, readOnly: true, calls: [] };
    const io = async (path, body) => {
      srv.calls.push(path);
      if (/^docs\/[\w-]+$/.test(path)) return { deck: JSON.parse(JSON.stringify(srv.deck)), rev: srv.rev, role: 'owner', sharing: { link: 'none', people: {} }, ...(srv.readOnly && { readOnly: true, reason: 'over limit', limit: 3 }) };
      if (/\/since\?rev=/.test(path)) return { rev: srv.rev, ops: [] };
      if (/\/ops$/.test(path)) { if (srv.readOnly) throw Object.assign(new Error('read only'), { status: 402, data: { error: 'read only', reason: 'over limit', limit: 3 } }); CS.applyOps(srv.deck, body.ops); return { rev: ++srv.rev }; }
      return { ok: true };
    };
    if (!W.__roMounted) { UI.mountCloudStatus(); W.__roMounted = true; }
    try {
      await CD.openDoc('abcdefghijklmnop5678', { io, pollMs: 60, debounceMs: 30 });
      eq(CD.cloudDoc().readOnly?.limit, 3, 'el servidor dice que está en solo lectura por el límite');
      eq(CD.cloudDoc().status, 'readonly', 'estado: solo lectura');
      const banner = D.getElementById('cloud-ro-banner');
      assert(banner && banner.style.display !== 'none' && /tu plan gratuito permite editar 3\. Pasa a Pro o borra alguna para editarla/.test(banner.textContent), 'aviso claro y amable: ' + banner?.textContent);
      assert(banner.querySelector('[data-ro="copy"]') && banner.querySelector('[data-ro="download"]') && banner.querySelector('[data-ro="pro"]'), 'con copia, descarga y Pro');
      eq(D.querySelector('#cloud-status span')?.textContent, 'Solo lectura', 'y en la barra');
      R.store.commit(() => { slide().blocks[0].html = 'Uno, cambiado aquí'; }); await sleep(200);
      eq(srv.calls.filter(c => /\/ops$/.test(c)).length, 0, 'no intenta guardar cambios en la nube');
      eq(slide().blocks[0].html, 'Uno, cambiado aquí', 'pero lo hecho no se pierde');
      // Back to Pro (or some deleted): checked again, and what was changed here is sent.
      srv.readOnly = false; eq(await CD.recheckReadOnly(), true, 'al volver a Pro se desbloquea'); await sleep(200);
      eq(srv.deck.slides[0].blocks[0].html, 'Uno, cambiado aquí', 'y se envía lo cambiado');
      eq(banner.style.display, 'none', 'el aviso se va');
      // Locked while editing (the server answers 402): kept here, not sent again.
      srv.readOnly = true; const n = srv.calls.filter(c => /\/ops$/.test(c)).length;
      R.store.commit(() => { slide().blocks[0].html = 'Dos'; }); await sleep(200);
      eq(CD.cloudDoc().status, 'readonly', 'si el servidor la bloquea a mitad: solo lectura');
      R.store.commit(() => { slide().blocks[0].html = 'Tres'; }); await sleep(200);
      eq(srv.calls.filter(c => /\/ops$/.test(c)).length, n + 1, 'y deja de enviar');
      // Keep it as a copy in this browser.
      banner.querySelector('[data-ro="copy"]').click(); await sleep(20);
      eq(CD.cloudDoc(), null, 'guardar una copia: queda aparte de la nube'); eq(slide().blocks[0].html, 'Tres', 'con lo cambiado');
      D.querySelector('.dlg-ok')?.click();
    } finally { CD.closeDoc(); }
  });

  await test('avisos propios: barra con su texto (como texto), patrocinador, botón y cerrar (y no vuelve a salir)', async () => {
    reset(); const W = frame.contentWindow, NT = await W.eval("import('/src/ui/shell/notices.js')"), NC = await W.eval("import('/src/io/cloud/notices.js')");
    W.localStorage.removeItem('revela.notices.closed');
    const n = { id: 'aviso123', title: 'Pásate a <b>Pro</b>', text: 'Un mes con IA', cta: 'Ver plantillas', url: '#templates', sponsor: 'Acme', tone: 'offer' };
    const el = NT.noticeElement(n); D.body.appendChild(el);
    try {
      assert(!el.querySelector('b b') && /<b>Pro<\/b>/.test(el.querySelector('.notice-body b').textContent), 'el texto va como texto, no como HTML');
      assert(/Patrocinado · Acme/.test(el.textContent), 'dice que es patrocinado y por quién');
      el.querySelector('.notice-go').click(); for (let i = 0; i < 20 && !D.getElementById('gallery-modal'); i++) await sleep(25);
      assert(D.getElementById('gallery-modal'), 'su botón abre la galería'); D.querySelector('#gallery-modal .modal-close').click();
      el.querySelector('.notice-x').click();
      assert(!el.isConnected && NC.isClosed('aviso123'), 'cerrado: se quita y se recuerda');
      eq((await NC.fetchNotices('editor', 'es')).length, 0, 'en la edición abierta no hay avisos');
    } finally { el.remove(); W.localStorage.removeItem('revela.notices.closed'); }
  });

  await test('insertar en una web: iframe del visor con la presentación de la nube (pública por enlace); si no lo es, lo dice', async () => {
    reset(); const W = frame.contentWindow, CD = R.clouddocs;
    const code = CD.embedCode('docpublica00000001', 'Mi "charla" <b>');
    assert(/^<iframe src="https:\/\/revelaslides\.com\/app\/view\.html\?doc=docpublica00000001"/.test(code) && /allowfullscreen/.test(code) && !/<b>|"charla"/.test(code), 'el código del iframe: ' + code);
    const deck = JSON.parse(JSON.stringify(R.state.deck)); deck.slides[0].blocks[0].html = 'Hola desde la nube';
    const ok = async () => ({ ok: true, status: 200, json: async () => ({ deck, rev: 3, role: 'view', name: 'Charla' }) });
    const got = await CD.publicDeck('docpublica00000001', ok);
    eq(got.name, 'Charla'); assert(/Hola desde la nube/.test(JSON.stringify(got.deck)), 'la presentación');
    let st = 0; try { await CD.publicDeck('docprivada00000001', async () => ({ ok: false, status: 401, json: async () => ({ error: 'sign in' }) })); } catch (e) { st = e.status; }
    eq(st, 401, 'privada: no');
    // The viewer page itself (no server here: it says so instead of staying blank).
    const f = D.createElement('iframe'); f.src = '/view.html?doc=docquenoexiste00001'; f.style.cssText = 'position:fixed;width:400px;height:300px;opacity:0'; D.body.appendChild(f);
    try {
      let m; for (let i = 0; i < 60 && !/nube|cloud|abrir|open|pública|public/i.test((m = f.contentDocument?.getElementById('m'))?.textContent || ''); i++) await sleep(100);
      assert(/nube|cloud|abrir|open|pública|public/i.test(m?.textContent || ''), 'el visor dice qué pasa: ' + (m?.textContent || ''));
    } finally { f.remove(); }
  });

  await test('abrir otra presentación no pierde nada: la de la nube manda sus últimos cambios y se cierra (nunca recibe la otra); sin guardar en ningún sitio, queda una copia que se recupera', async () => {
    reset(); const W = frame.contentWindow, CD = R.clouddocs, { fakeCloud } = await W.eval("import('/tests/fixtures/fakecloud.js')");
    const C = fakeCloud({ docs: [{ id: 'docnube00000000001', name: 'En la nube' }] }); CD.setTransport(C.io);
    try {
      await CD.openDoc('docnube00000000001', { io: C.io, pollMs: 100000, debounceMs: 5000 });
      R.store.commit(() => { R.state.deck.slides[0].notes = 'cambio en la nube'; });
      R.store.replaceDeck(R.model.emptyDeck()); R.store.commit(() => { R.state.deck.name = 'OTRA'; R.state.deck.slides[0].notes = 'de la otra'; });
      await sleep(300);
      const sent = JSON.stringify(C.db.calls.filter(c => /\/ops$/.test(c.path)));
      assert(/cambio en la nube/.test(sent), 'sus últimos cambios llegan a la nube');
      assert(!/OTRA|de la otra/.test(sent), 'y la otra presentación nunca se escribe encima');
      eq(CD.cloudDoc(), null, 'ya no está abierta en la nube');
    } finally { CD.closeDoc(); CD.setTransport(null); }
    // Only in this browser: a copy before replacing it, offered back.
    const V = await W.eval("import('/src/features/collab/versions.js')");
    R.store.commit(() => { R.state.deck.name = 'Mi borrador'; R.state.deck.slides[0].notes = 'trabajo sin guardar'; R.state.deck.slides[0].blocks[0].html = 'Mi título'; });
    R.store.replaceDeck(R.model.emptyDeck()); await sleep(200);
    const kept = (await V.listVersions()).find(v => v.kind === 'before' && v.title === 'Mi borrador');
    assert(kept, 'una copia de la anterior en Versiones');
    const btn = [...D.querySelectorAll('#toasts .toast-act')].at(-1);
    assert(btn && /Mi borrador/.test(btn.parentElement.textContent), 'un aviso con «Recuperar»');
    btn.click(); await sleep(100);
    eq(R.state.deck.name, 'Mi borrador', 'recuperada'); eq(R.state.deck.slides[0].notes, 'trabajo sin guardar');
    await V.deleteVersion(kept.id);
  });

  await test('abrir un enlace compartido que falla: la pantalla de carga se quita antes del aviso (no tapa la pregunta)', async () => {
    reset(); const W = frame.contentWindow, CD = R.clouddocs, UI = await W.eval("import('/src/ui/dialogs/cloud.js')"), { fakeCloud } = await W.eval("import('/tests/fixtures/fakecloud.js')");
    CD.setTransport(fakeCloud({}).io);
    try {
      const seen = [];
      const done = UI.openFromLink('docquenoexiste00001', { settle: () => seen.push(!!D.querySelector('.dlg-msg')) });
      for (let i = 0; i < 50 && !D.querySelector('.dlg-msg'); i++) await sleep(20);
      eq(seen.join(), 'false', 'primero se quita la carga, después el aviso');
      assert(/ya no está en la nube/.test(D.querySelector('.dlg-msg').textContent), 'el aviso: ' + D.querySelector('.dlg-msg').textContent);
      D.querySelector('.dlg-ok').click(); eq(await done, false);
    } finally { CD.closeDoc(); CD.setTransport(null); }
  });

  await test('«Mi nube»: página con miniaturas, carpetas (crear, arrastrar, «Mover a…», migas), cuadrícula/lista, búsqueda, teclado, destacadas y papelera', async () => {
    reset(); const W = frame.contentWindow, CD = R.clouddocs, UI = await W.eval("import('/src/ui/dialogs/cloudlibrary.js')"), { fakeCloud } = await W.eval("import('/tests/fixtures/fakecloud.js')");
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const C = fakeCloud({ folders: [{ id: 'fclases01', name: 'Clases', parent: null }, { id: 'ftrabajo1', name: 'Trabajo', parent: null }],
      docs: [{ id: 'docvolcanes0000001', name: 'Geología', text: 'Volcanes · Erupciones', thumb: png, slides: 12 }, { id: 'docmates00000000001', name: 'Funciones', folder: 'fclases01', slides: 3 }, { id: 'docinforme000000001', name: 'Informe', thumb: png }],
      shared: [{ id: 'docdeluis000000001', name: 'De Luis', owner: 'luis@example.com', role: 'edit' }] });
    const page = () => D.getElementById('cloud-docs-modal'), $ = s => page()?.querySelector(s), $$ = s => [...(page()?.querySelectorAll(s) || [])];
    const item = id => $(`.nb-item[data-id="${id}"]`), until = async (fn, ms = 1500) => { for (let t = 0; t < ms && !fn(); t += 20) await sleep(20); return fn(); };
    const menuItem = text => [...D.querySelectorAll('.nb-menu button')].find(b => b.querySelector('span').textContent === text);
    const answer = async (value, ok = true) => { await until(() => D.querySelector('.dlg-ok')); const i = D.querySelector('.dlg-in'); if (i && value != null) i.value = value; D.querySelector(ok ? '.dlg-ok' : '.dlg-cancel').click(); await sleep(60); };
    W.localStorage.removeItem('revela.cloud.view'); CD.setTransport(C.io);
    try {
      await UI.openCloudDocs();
      const r = page().getBoundingClientRect();
      assert(r.width === W.innerWidth && r.height === W.innerHeight, 'ocupa toda la ventana, como una página');
      eq($$('.nb-folders .nb-folder .nb-name').map(x => x.textContent.trim()).join(','), 'Clases,Trabajo', 'las carpetas de arriba');
      eq($$('.nb-docs .nb-doc').length, 2, 'y las presentaciones que no están en carpetas');
      await until(() => item('docvolcanes0000001').querySelector('.nb-thumb img'));
      eq(item('docvolcanes0000001').querySelector('.nb-thumb img')?.getAttribute('src'), png, 'la miniatura de su primera diapositiva');
      assert(item('docvolcanes0000001').textContent.includes('12 diapositivas'), 'con el número de diapositivas');
      assert(item('docinforme000000001').querySelector('img'), 'otra miniatura');
      eq($('.nb-quota small').textContent, '3 de 500 presentaciones', 'cuántas de las del plan');
      // Into a folder and back by the breadcrumbs.
      item('fclases01').click(); await sleep(20);
      eq($$('.nb-crumbs > *').map(x => x.textContent.trim()).filter(Boolean).join('›'), 'Mi nube›chevron_right›Clases', 'migas de pan: Mi nube › Clases');
      eq($$('.nb-docs .nb-doc').map(x => x.dataset.id).join(), 'docmates00000000001', 'dentro, lo suyo');
      assert(item('docmates00000000001').querySelector('.nb-ph')?.textContent.includes('Funciones'), 'sin miniatura: un color con el título');
      // A folder inside this one.
      $('[data-act="folder"]').click(); await answer('Tema 2');
      const sub = C.db.folders.find(f => f.name === 'Tema 2');
      assert(sub && sub.parent === 'fclases01', 'carpeta nueva dentro de la actual');
      assert(item(sub.id), 'y se ve');
      $('.nb-crumbs [data-go=""]').click(); await sleep(20);
      eq($$('.nb-crumbs > *').length, 1, 'de vuelta arriba');
      // Drag a presentation onto a folder.
      const dt = new W.DataTransfer(), fire = (el, type) => el.dispatchEvent(new W.DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
      fire(item('docinforme000000001'), 'dragstart'); fire(item('ftrabajo1'), 'dragover'); fire(item('ftrabajo1'), 'drop'); fire(item('docinforme000000001'), 'dragend');
      await until(() => !item('docinforme000000001'));
      eq(C.db.docs.find(d => d.id === 'docinforme000000001').folder, 'ftrabajo1', 'arrastrar a una carpeta la mueve');
      // «Mover a…» from its menu.
      item('docvolcanes0000001').querySelector('.nb-more').click(); await sleep(20);
      assert(D.querySelector('.nb-menu') && ['Abrir', 'Abrir en pestaña nueva', 'Cambiar nombre', 'Destacar', 'Hacer una copia', 'Mover a…', 'Compartir…', 'Descargar (.revela)', 'Descargar como PowerPoint (.pptx)', 'Mover a la papelera'].every(menuItem), 'su menú: abrir, renombrar, copiar, mover, compartir, descargar, eliminar');
      menuItem('Mover a…').click(); await sleep(20);
      const dest = [...D.querySelectorAll('#cloud-move-modal .nb-dest')];
      eq(dest.map(b => b.textContent.trim()).join('|'), 'cloudMi nube|folderClases|folderTema 2|folderTrabajo', 'el árbol de carpetas');
      assert(dest[0].disabled, 'donde ya está, no');
      dest[1].click(); await until(() => !item('docvolcanes0000001'));
      eq(C.db.docs.find(d => d.id === 'docvolcanes0000001').folder, 'fclases01', '«Mover a…» la mueve');
      // A folder can't go inside itself.
      item('fclases01').querySelector('.nb-more').click(); await sleep(20); menuItem('Mover a…').click(); await sleep(20);
      eq([...D.querySelectorAll('#cloud-move-modal .nb-dest')].filter(b => b.disabled).map(b => b.textContent.trim()).join(), 'cloudMi nube,folderClases,folderTema 2', 'una carpeta: ni donde está, ni en sí misma, ni en sus hijas');
      D.querySelector('#cloud-move-modal .modal-close').click();
      // Grid / list, remembered.
      $('[data-view="list"]').click(); await sleep(20);
      eq(page().dataset.view, 'list', 'vista de lista'); assert($('.nb-lhead'), 'con columnas');
      UI.closePage(); await UI.openCloudDocs(); eq(page().dataset.view, 'list', 'y se recuerda');
      $('[data-view="grid"]').click(); await sleep(20); eq(W.localStorage.getItem('revela.cloud.view'), 'grid', 'cuadrícula de nuevo');
      // Search: by name and by the slides' titles, in every folder.
      const q = $('.nb-search input'); q.value = 'volcan'; q.dispatchEvent(new W.Event('input')); await sleep(200);
      eq($$('.nb-doc').map(x => x.dataset.id).join(), 'docvolcanes0000001', 'buscar por el título de una diapositiva (en cualquier carpeta)');
      assert(item('docvolcanes0000001').textContent.includes('Clases'), 'y dice dónde está');
      q.value = 'zzz'; q.dispatchEvent(new W.Event('input')); await sleep(200);
      assert(/Nada coincide con «zzz»/.test($('.nb-content').textContent), 'sin resultados: lo dice');
      q.value = ''; q.dispatchEvent(new W.Event('input')); await sleep(200);
      // Keyboard: arrows, F2, Delete.
      const first = $('.nb-content .nb-item'); first.focus();
      first.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      eq(D.activeElement, $$('.nb-content .nb-item')[1], 'flecha: el siguiente');
      eq($$('.nb-content .nb-item[tabindex="0"]').length, 1, 'uno solo en el orden de tabulación');
      item('fclases01').click(); await sleep(20);
      const fx = item('docvolcanes0000001'); fx.focus();
      fx.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'F2', bubbles: true })); await answer('Geología y volcanes');
      eq(C.db.docs.find(d => d.id === 'docvolcanes0000001').name, 'Geología y volcanes', 'F2 cambia el nombre');
      item('docvolcanes0000001').focus(); item('docvolcanes0000001').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
      await until(() => D.querySelector('.dlg-msg')); assert(/papelera/.test(D.querySelector('.dlg-msg').textContent) && /30 días/.test(D.querySelector('.dlg-msg').textContent), 'Supr pregunta antes: a la papelera, 30 días');
      await answer(null);
      assert(C.db.docs.find(d => d.id === 'docvolcanes0000001').trashed, 'a la papelera');
      await until(() => !item('docvolcanes0000001')); assert(!item('docvolcanes0000001'), 'y ya no está en su carpeta');
      // The trash: restore.
      $('[data-sec="trash"]').click(); await sleep(20);
      assert(item('docvolcanes0000001') && /30 días/.test($('.nb-note').textContent), 'en la papelera, con su aviso');
      item('docvolcanes0000001').querySelector('.nb-more').click(); await sleep(20);
      assert(menuItem('Restaurar') && menuItem('Eliminar para siempre'), 'restaurar o eliminar para siempre');
      menuItem('Restaurar').click(); await until(() => !C.db.docs.find(d => d.id === 'docvolcanes0000001').trashed);
      assert(!C.db.docs.find(d => d.id === 'docvolcanes0000001').trashed, 'restaurada');
      // Shared with me: apart, with who shared it; starred.
      $('[data-sec="shared"]').click(); await sleep(20);
      assert(item('docdeluis000000001') && item('docdeluis000000001').textContent.includes('luis@example.com'), 'compartidas conmigo: con quién la compartió');
      item('docdeluis000000001').querySelector('.nb-more').click(); await sleep(20);
      assert(!menuItem('Mover a…') && !menuItem('Mover a la papelera'), 'no se mueve a mis carpetas ni se borra');
      menuItem('Destacar').click(); await until(() => C.db.shared[0].starred);
      $('[data-sec="starred"]').click(); await sleep(20);
      eq($$('.nb-doc').map(x => x.dataset.id).join(), 'docdeluis000000001', 'destacadas');
      $('[data-sec="recent"]').click(); await sleep(20); eq($$('.nb-doc').length, 4, 'recientes: las mías y las compartidas');
      // Save the one in the editor into a folder: its thumbnail goes with it.
      $('[data-sec="mine"]').click(); await sleep(20); item('ftrabajo1').click(); await sleep(20);
      CD.setThumbMaker(async deck => (deck.slides.length ? 'data:image/webp;base64,UklGRg==' : null));
      R.state.deck.name = 'Desde el editor';
      $('[data-act="save"]').click(); await until(() => C.db.docs.some(d => d.name === 'Desde el editor' && d.thumbAt));
      const saved = C.db.docs.find(d => d.name === 'Desde el editor');
      eq(saved?.folder, 'ftrabajo1', 'guardar aquí: en la carpeta abierta');
      eq(C.db.thumbs[saved.id], 'data:image/webp;base64,UklGRg==', 'con la miniatura de su primera diapositiva');
      D.querySelector('#cloud-share-modal .modal-close')?.click();
      // Empty states.
      CD.closeDoc(); C.db.docs = []; C.db.folders = []; await UI.openCloudDocs();
      assert($('.nb-empty [data-act="save"]') && $('.nb-empty [data-act="new"]'), 'vacía: guardar esta o empezar una nueva');
      page().dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); eq(page(), null, 'Escape cierra');
    } finally { CD.closeDoc(); CD.setTransport(null); CD.setThumbMaker(null); UI.closePage(); D.querySelectorAll('.nb-menu,#cloud-move-modal,#cloud-share-modal,#account-modal').forEach(x => x.remove()); W.localStorage.removeItem('revela.cloud.view'); }
  });

  await test('cuenta de Revela: aceptar las condiciones (y tener 14 años o más) antes de iniciar sesión', async () => {
    reset(); const W = frame.contentWindow, AD = await W.eval("import('/src/ui/dialogs/account.js')"), AC = await W.eval("import('/src/io/cloud/account.js')");
    W.localStorage.removeItem('revela.terms');
    try {
      AD.openAccount(); await sleep(30);
      const box = D.querySelector('#account-modal .acc-terms-ok'), btn = D.querySelector('#account-modal .acc-login'), label = D.querySelector('#account-modal .acc-terms');
      assert(box && !box.checked, 'casilla sin marcar');
      btn.click(); await sleep(10);
      assert(label.classList.contains('acc-terms-need') && /Marca la casilla/.test(label.textContent) && D.activeElement === box, 'pulsar sin marcarla: la casilla lo dice (no un botón que no hace nada)');
      assert(/14 años o más/.test(label.textContent) && label.querySelector('a[href$="/terms.html"]') && label.querySelector('a[href$="/privacy.html"]'), 'texto con enlaces a las condiciones y a la privacidad');
      box.checked = true; box.dispatchEvent(new W.Event('change')); assert(!label.classList.contains('acc-terms-need'), 'al marcarla, el aviso se va');
      D.querySelector('#account-modal .modal-close').click();
      const p = AD.askTerms(); await sleep(10);
      const ok = D.querySelector('#terms-modal .tm-ok'); assert(ok.disabled, 'el aviso: hay que marcar la casilla');
      const b2 = D.querySelector('#terms-modal .acc-terms-ok'); b2.checked = true; b2.dispatchEvent(new W.Event('change')); ok.click();
      eq(await p, true, 'aceptadas'); eq(AC.termsAccepted(), true, 'y se recuerdan para enviarlas al iniciar sesión');
      eq(AC.TERMS_VERSION, '2026-10-01', 'versión de las condiciones');
    } finally { W.localStorage.removeItem('revela.terms'); D.getElementById('account-modal')?.remove(); D.getElementById('terms-modal')?.remove(); }
  });

  await test('Google Slides: se elige en Drive, Drive la convierte a PowerPoint y se importa', async () => {
    reset(); const W = frame.contentWindow, GD = await W.eval("import('/src/io/cloud/gdrive.js')");
    R.slides.addSlide(); R.slides.addSlide(); await sleep(10);
    const pptx = await R.pptx.buildPptxBlob(), n = R.state.deck.slides.length, realGoogle = W.google, realGapi = W.gapi, realFetch = W.fetch, urls = [];
    let mimes = '';
    W.google = { accounts: { oauth2: { initTokenClient: () => ({ requestAccessToken() { this.callback({ access_token: 'tok', expires_in: 3600 }); } }), revoke: () => {} } },
      picker: { ViewId: { DOCS: 'docs' }, Action: { PICKED: 'picked', CANCEL: 'cancel' },
        DocsView: class { setMimeTypes(m) { mimes = m; return this; } },
        PickerBuilder: class { setOAuthToken() { return this; } setDeveloperKey() { return this; } addView() { return this; } setAppId() { return this; }
          setCallback(cb) { this.cb = cb; return this; } build() { return { setVisible: () => this.cb({ action: 'picked', docs: [{ id: 'gs1', name: 'Clase de historia', mimeType: 'application/vnd.google-apps.presentation' }] }) }; } } } };
    W.gapi = { load: (_, cb) => cb() };
    W.fetch = async (url, o) => { url = String(url); if (!url.startsWith('https://www.googleapis.com')) return realFetch(url, o); urls.push(url); return new W.Response(pptx); };
    try {
      const f = await GD.pickSlidesFile();
      assert(/google-apps\.presentation/.test(mimes), 'el selector muestra las de Google Slides');
      assert(/\/files\/gs1\/export\?mimeType=application%2Fvnd\.openxmlformats-officedocument\.presentationml\.presentation/.test(urls[0]), 'Drive la exporta a .pptx: ' + urls[0]);
      eq(f.name, 'Clase de historia.pptx', 'con su nombre');
      R.store.replaceDeck(R.model.emptyDeck()); await R.openfile.openPresentation(f);
      eq(R.state.deck.slides.length, n, 'y se importa con todas sus diapositivas');
    } finally { W.google = realGoogle; W.gapi = realGapi; W.fetch = realFetch; await GD.signOut(); }
  });

  await test('Drive: la vista previa del archivo es la primera diapositiva, nítida (1600 px) y con lo que es', async () => {
    reset(); const W = frame.contentWindow, H = await W.eval("import('/src/ui/shell/home.js')");
    const b64 = await H.driveThumbnail(true), im = new W.Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode();
    eq(im.naturalWidth, 1600, '1600 px de ancho'); assert(b64.length < 2e6, 'dentro del límite de Drive para las miniaturas');
  });

  await test('Guardar en Drive: elegir carpeta con el selector de Google, recordarla, «Guardar como» y copia PowerPoint que Drive previsualiza', async () => {
    reset(); const W = frame.contentWindow, GD = await W.eval("import('/src/io/cloud/gdrive.js')");
    GD.unlinkFile(); W.localStorage.removeItem('revela.gdrive.folder');
    R.blocks.addText('Texto que busca Drive'); await sleep(10);
    const realGoogle = W.google, realGapi = W.gapi, realFetch = W.fetch, ups = [], views = [];
    let n = 0;
    W.google = { accounts: { oauth2: { initTokenClient: () => ({ requestAccessToken() { this.callback({ access_token: 'tok', expires_in: 3600 }); } }), revoke: () => {} } },
      picker: { ViewId: { DOCS: 'docs' }, Action: { PICKED: 'picked', CANCEL: 'cancel' },
        DocsView: class { constructor() { views.push(this); } setIncludeFolders(v) { this.folders = v; return this; } setSelectFolderEnabled(v) { this.selectFolder = v; return this; }
          setMimeTypes(m) { this.mimes = m; return this; } setParent(p) { this.parent = p; return this; } },
        PickerBuilder: class { setOAuthToken() { return this; } setDeveloperKey() { return this; } addView() { return this; } setAppId(a) { this.app = a; return this; } setTitle() { return this; }
          setCallback(cb) { this.cb = cb; return this; } build() { return { setVisible: () => this.cb({ action: 'picked', docs: [{ id: 'F9', name: 'Clases', mimeType: 'application/vnd.google-apps.folder' }] }) }; } } } };
    W.gapi = { load: (_, cb) => cb() };
    W.fetch = async (url, o = {}) => {
      url = String(url); if (!url.startsWith('https://www.googleapis.com')) return realFetch(url, o);
      const ok = b => new W.Response(JSON.stringify(b), { status: 200 }), m = url.match(/\/files\/([^/?]+)/), id = m && decodeURIComponent(m[1]);
      if (url.includes('/upload/drive/v3/files')) {
        const body = typeof o.body === 'string' ? o.body : await o.body.text();
        const parts = body.split(/--revela\w+/).filter(x => x.includes('\r\n\r\n'));
        const meta = JSON.parse(parts[0].split('\r\n\r\n')[1]), type = parts[1].match(/Content-Type: ([^\r]+)/)[1];
        ups.push({ method: o.method, id, meta, type });
        const fid = id || 'n' + (++n);
        return ok({ id: fid, name: meta.name || 'x', version: id ? '2' : '1', webViewLink: `https://drive.google.com/file/d/${fid}/view` });
      }
      if (id) return ok({ version: '1', trashed: false });
      return new W.Response('{}', { status: 404 });
    };
    GD.setThumbnailMaker(async () => 'AAAA');
    const until = async (f, ms = 5000) => { for (let i = 0; i < ms / 20 && !f(); i++) await sleep(20); };
    const act = a => D.querySelector(`[data-action="${a}"]`).click();
    try {
      // First save: asks where, starting at My Drive.
      act('gdrive-save'); await sleep(20);
      const dlg = D.getElementById('gs-modal'); assert(dlg, 'la primera vez pregunta dónde guardarla');
      eq(dlg.querySelector('.gs-folder').textContent, 'Mi unidad', 'empieza en Mi unidad');
      dlg.querySelector('.gs-pick').click(); await sleep(30);
      const v = views.at(-1);
      assert(v.folders && v.selectFolder, 'el selector de Google en modo carpeta'); eq(v.mimes, 'application/vnd.google-apps.folder'); eq(v.parent, 'root', 'abre en Mi unidad');
      eq(dlg.querySelector('.gs-folder').textContent, 'Clases', 'la carpeta elegida');
      dlg.querySelector('.gs-name').value = 'Mi charla';
      dlg.querySelector('.gs-ok').click(); await until(() => D.getElementById('gs-done'));
      let u = ups.at(-1);
      eq(u.method, 'POST'); eq(JSON.stringify(u.meta.parents), '["F9"]', 'se sube a la carpeta elegida'); eq(u.meta.name, 'Mi charla.revela.json');
      eq(u.meta.mimeType, 'application/vnd.revela+json', 'con el tipo propio de Revela');
      assert(/Texto que busca Drive/.test(u.meta.contentHints?.indexableText || ''), 'Drive encuentra sus textos (indexableText)');
      assert(u.meta.contentHints.thumbnail?.image, 'y muestra su primera diapositiva');
      eq(D.querySelector('#gs-done .gs-path').textContent, 'Guardado en Drive ▸ Clases/Mi charla.revela.json', 'dice dónde está');
      eq(D.querySelector('#gs-done .gs-open').href, 'https://drive.google.com/file/d/n1/view', 'con un enlace para abrirla en Drive');
      D.querySelector('#gs-done .gs-close').click();
      eq(GD.lastFolder()?.id, 'F9', 'recuerda la carpeta'); eq(GD.linkedFile()?.id, 'n1');
      // Later saves: the same file, without asking.
      R.store.commit(() => { R.state.deck.slides[0].notes = 'nota'; });
      act('gdrive-save'); await until(() => D.getElementById('gs-done'));
      assert(!D.getElementById('gs-modal'), 'ya no pregunta'); u = ups.at(-1);
      eq(u.method, 'PATCH'); eq(u.id, 'n1', 'actualiza el mismo archivo'); assert(u.meta.contentHints?.indexableText, 'con sus textos');
      D.querySelector('#gs-done .gs-close').click();
      // «Guardar en Drive como…»: a new file, in the remembered folder.
      act('gdrive-save-as'); await sleep(20);
      eq(D.querySelector('#gs-modal .gs-folder').textContent, 'Clases', 'propone la última carpeta');
      D.querySelector('#gs-modal .gs-ok').click(); await until(() => D.getElementById('gs-done'));
      u = ups.at(-1); eq(u.method, 'POST', 'un archivo nuevo'); eq(JSON.stringify(u.meta.parents), '["F9"]'); eq(GD.linkedFile()?.id, 'n2', 'y sigue guardando en ese');
      D.querySelector('#gs-done .gs-close').click();
      // PowerPoint: a copy that Drive previews with all its slides.
      act('gdrive-save-as'); await sleep(20);
      D.querySelector('#gs-modal [name="gs-fmt"][value="pptx"]').checked = true;
      D.querySelector('#gs-modal .gs-ok').click(); await until(() => D.getElementById('gs-done'));
      u = ups.at(-1); const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      eq(u.meta.mimeType, PPTX, 'se sube como PowerPoint'); eq(u.type, PPTX); assert(/\.pptx$/.test(u.meta.name), 'con extensión .pptx');
      assert(!u.meta.appProperties, 'no sale en «Mis presentaciones» (no es un proyecto de Revela)'); eq(JSON.stringify(u.meta.parents), '["F9"]');
      eq(GD.linkedFile()?.id, 'n2', 'la presentación sigue vinculada a su archivo de Revela');
      D.querySelector('#gs-done .gs-close').click();
      // PDF: a copy Drive leafs through, page by page, with its text searchable.
      act('gdrive-save-as'); await sleep(20);
      D.querySelector('#gs-modal [name="gs-fmt"][value="pdf"]').checked = true;
      D.querySelector('#gs-modal .gs-ok').click(); await until(() => D.getElementById('gs-done'), 20000);
      u = ups.at(-1); eq(u.meta.mimeType, 'application/pdf', 'se sube como PDF'); assert(/\.pdf$/.test(u.meta.name), 'con extensión .pdf');
      eq(GD.linkedFile()?.id, 'n2', 'y la presentación sigue vinculada a su archivo de Revela');
      D.querySelector('#gs-done .gs-close').click();
      // «Abrir con ▸ Revela» on that .pptx in Drive: imported.
      const slidesN = R.state.deck.slides.length, blob = await R.pptx.buildPptxBlob(), OW = await W.eval("import('/src/ui/shell/openwith.js')");
      const mockFetch = W.fetch;
      W.fetch = async (url, o) => (/\/files\/n3\?fields=id,name,mimeType/.test(url) ? new W.Response(JSON.stringify({ id: 'n3', name: 'Mi charla.pptx', mimeType: PPTX }))
        : /\/files\/n3\?alt=media/.test(url) ? new W.Response(blob) : mockFetch(url, o));
      R.store.replaceDeck(R.model.emptyDeck());
      const p = OW.handleOpenWith({ service: 'drive', action: 'open', id: 'n3' }); await sleep(20);
      D.querySelector('#openwith-modal [data-how="edit"]').click();
      eq(await p, true); eq(R.state.deck.slides.length, slidesN, 'un .pptx de Drive se abre con «Abrir con» (importado)'); eq(GD.linkedFile(), null, 'sin escribir encima del .pptx');
    } finally {
      W.google = realGoogle; W.gapi = realGapi; W.fetch = realFetch; W.localStorage.removeItem('revela.gdrive.folder');
      D.getElementById('gs-modal')?.remove(); D.getElementById('gs-done')?.remove(); await GD.signOut();
    }
  });

  await test('ideas de diseño con IA: los mismos objetos recolocados, comprobados antes de aplicarlos', async () => {
    reset(); const W = frame.contentWindow, A = R.aiDeck, realFetch = W.fetch; let sent = null;
    R.ai.setAiKey('sk-or-prueba'); R.ai.acceptPrivacy();
    R.blocks.addShape('rect'); await sleep(5);
    const s = slide(), t0 = s.blocks.find(b => b.type === 'text') || s.blocks[0];
    const img = { id: 'img1', type: 'image', x: 100, y: 100, w: 400, h: 200, src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' };
    R.store.commit(() => { s.blocks.push(img); });
    const answer = { ideas: [
      { name: 'Imagen a la derecha', blocks: { [t0.id]: { x: 60, y: 80, w: 560, h: 120, fontSize: 64, textAlign: 'left' }, img1: { x: 700, y: 60, w: 520, h: 999 }, inventado: { x: 0, y: 0, w: 10, h: 10 } } },
      { name: 'Fuera', blocks: { [t0.id]: { x: 5000, y: -40, w: 99999, h: 100, bg: 'url(javascript:alert(1))', fontSize: 9999 } } },
      { name: 'Vacía', blocks: { nadie: { x: 1, y: 1, w: 30, h: 30 } } }] };
    W.fetch = async (url, o) => { sent = JSON.parse(o.body); return new W.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] })); };
    try {
      const ideas = await A.redesignIdeas(s);
      assert(/Objects:/.test(sent.messages[1].content) && sent.messages[1].content.includes('img1'), 'le manda los objetos de la diapositiva');
      eq(ideas.length, 2, 'las ideas sin objetos de esta diapositiva se descartan');
      const a = ideas[0].changes;
      assert(!a.inventado, 'objetos que no existen: fuera');
      eq(a.img1.h, 260, 'la imagen conserva su proporción (520 × 200/400)');
      eq(a[t0.id].fontSize, 64, 'tamaño de letra'); eq(a[t0.id].textAlign, 'left');
      const b = ideas[1].changes[t0.id];
      assert(b.x + b.w <= 1280 && b.y >= 0 && b.w <= 1280, 'dentro de la diapositiva'); assert(!('bg' in b), 'colores no válidos: fuera'); eq(b.fontSize, 160, 'tamaños razonables');
      R.designer.applyIdea(ideas[0]); await sleep(5);
      eq(slide().blocks.find(x => x.id === 'img1').x, 700, 'se aplica');
    } finally { W.fetch = realFetch; R.ai.disconnectAi(); }
  });

  await test('fotos de Unsplash y Pexels: se usan desde su servidor, con el nombre de quien las hizo', async () => {
    reset();
    const b = R.stock.insertPhoto({ id: 'abc', src: 'https://images.unsplash.com/r.jpg', thumb: 'https://images.unsplash.com/s.jpg', width: 4000, height: 2000, alt: 'Un faro',
      author: 'Ana Foto', authorUrl: 'https://unsplash.com/@ana?utm_source=revela&utm_medium=referral', source: 'Unsplash', sourceUrl: 'https://unsplash.com/?utm_source=revela&utm_medium=referral' });
    eq(b.src, 'https://images.unsplash.com/r.jpg', 'enlazada a su servidor (lo pide Unsplash)'); eq(b.caption, 'Ana Foto / Unsplash', 'con su autor como pie');
    eq(Math.round(b.w / b.h), 2, 'con su proporción'); eq(b.alt, 'Un faro', 'texto alternativo');
    assert(!D.querySelector('#elements-panel [data-et="photos"]'), 'en la edición abierta (sin cuenta) no aparece');
  });

  await test('videollamada: dos personas se ven a través del SFU (simulado con conexiones WebRTC reales)', async () => {
    const W = frame.contentWindow, CALL = await W.eval("import('/src/io/cloud/call.js')");
    assert(W.navigator.mediaDevices?.getUserMedia, 'el navegador de pruebas tiene cámara y micrófono simulados');
    // A tiny SFU: one connection per session; it forwards what one publishes to whoever pulls it.
    const sfu = new Map(), room = new Map(); let n = 0;
    const request = async (path, b) => {
      if (path === 'call/session') { const id = 's' + (++n); sfu.set(id, { pc: new W.RTCPeerConnection(), published: new Map(), pending: null }); return { sessionId: id }; }
      if (path === 'call/room') { if (b.leave) room.delete(b.pid); else room.set(b.pid, { pid: b.pid, name: b.name, sessionId: b.sessionId, tracks: b.tracks }); return { people: [...room.values()] }; }
      const S = sfu.get(b.sessionId);
      if (path === 'call/tracks' && b.tracks[0].location === 'local') {
        const got = new Promise(ok => { const seen = []; S.pc.ontrack = e => { seen.push(e); if (seen.length === b.tracks.length) ok(seen); }; });
        await S.pc.setRemoteDescription(b.sessionDescription); const ans = await S.pc.createAnswer(); await S.pc.setLocalDescription(ans);
        got.then(evs => evs.forEach(e => S.published.set(e.track.kind, e.track)));
        return { sessionDescription: { type: 'answer', sdp: ans.sdp }, tracks: b.tracks };
      }
      if (path === 'call/tracks') {                                   // pull: offer the publisher's tracks
        for (let k = 0; k < 50 && b.tracks.some(t => !sfu.get(t.sessionId).published.get(t.trackName)); k++) await sleep(50);
        const ts = b.tracks.map(t => S.pc.addTransceiver(sfu.get(t.sessionId).published.get(t.trackName), { direction: 'sendonly' }));
        const offer = await S.pc.createOffer(); await S.pc.setLocalDescription(offer);
        return { requiresImmediateRenegotiation: true, sessionDescription: { type: 'offer', sdp: offer.sdp }, tracks: b.tracks.map((t, k) => ({ ...t, mid: ts[k].mid })) };
      }
      if (path === 'call/renegotiate') { await S.pc.setRemoteDescription(b.sessionDescription); return {}; }
    };
    const seenByB = [], seenByA = [];
    const a = await CALL.startCall({ doc: 'd'.repeat(20), name: 'Ana', request, pollMs: 300, onStream: (pid, st) => seenByA.push(st) });
    const b = await CALL.startCall({ doc: 'd'.repeat(20), name: 'Luis', request, pollMs: 300, onStream: (pid, st) => seenByB.push(st) });
    try {
      for (let k = 0; k < 60 && !(seenByB.some(st => st.getVideoTracks().length) && seenByA.some(st => st.getVideoTracks().length)); k++) await sleep(100);
      assert(seenByB.some(st => st.getVideoTracks().length && st.getAudioTracks().length >= 0), 'Luis recibe el vídeo de Ana');
      assert(seenByA.some(st => st.getVideoTracks().length), 'y Ana el de Luis');
      eq(b.people().map(p => p.name).join(), 'Ana', 'cada uno ve quién está');
      a.setMic(false); eq(a.stream.getAudioTracks()[0].enabled, false, 'silenciar el micrófono');
    } finally { await a.stop(); await b.stop(); }
    eq(room.size, 0, 'al colgar, salen de la sala');
  });

  await test('Crear modelo 3D con IA: rondas, cambios e insertar (servidor simulado)', async () => {
    reset(); const W = frame.contentWindow, M = await W.eval("import('/src/ui/dialogs/model3dai.js')"), calls = [];
    // The server: round 1 fails in Blender, round 2 works; then a request for changes, and discarding.
    const rounds = [{ n: 1, ok: false, note: 'Primera versión', error: 'script' }, { n: 2, ok: true, note: 'Taza azul con asa', preview: 'data:image/jpeg;base64,/9j/AA==' }];
    let polls = 0, status = 'running', shown = [];
    const api = async (path, body) => {
      calls.push([path, body]);
      if (path === '3d') return { ok: true, estimate: { perRound: 26, rounds: 4, max: 104 } };
      if (path === '3d/jobs') return { id: 'job-de-prueba-123456', estimate: { perRound: 26, max: 104 } };
      if (path.endsWith('/model')) return { glb: 'data:model/gltf-binary;base64,Z2xURg==' };
      if (path.endsWith('/feedback')) { status = 'running'; shown = rounds.slice(0, 2); polls = 0; return { ok: true }; }
      if (path.endsWith('/cancel')) return { ok: true };
      polls++; if (polls === 1) shown = rounds.slice(0, 1); else { shown = rounds; status = 'done'; }
      return { status, rounds: shown, left: 2, total: shown.length, max: 12, glb: status === 'done' };
    };
    await M.openModelAi({ api, interval: 5 });
    const m = D.getElementById('m3a-modal'), q = s => m.querySelector(s);
    assert(m && /104/.test(q('.m3a-est').textContent), 'el diálogo muestra la estimación en créditos');
    eq(m.querySelectorAll('.m3a-ex').length, 3, 'con ejemplos');
    m.querySelectorAll('.m3a-ex')[0].click();
    assert(/taza/.test(q('.m3a-prompt').value), 'un ejemplo rellena la descripción');
    q('.m3a-go').click();
    for (let i = 0; i < 100 && !(status === 'done' && !q('.m3a-insert').disabled && q('.m3a-view model-viewer')); i++) await sleep(20);
    eq(calls.find(c => c[0] === '3d/jobs')[1].prompt, q('.m3a-prompt').value, 'envía la descripción');
    eq(m.querySelectorAll('.m3a-rounds li').length, 2, 'una entrada por ronda');
    assert(m.querySelector('.m3a-rounds li.ko') && /Blender/.test(m.querySelector('.m3a-rounds li.ko').textContent), 'la ronda que falló lo dice');
    assert(m.querySelector('.m3a-rounds li.ok img')?.src.startsWith('data:image/jpeg') && /Taza azul/.test(m.querySelector('.m3a-rounds li.ok').textContent), 'la buena, con su vista previa y la nota');
    eq(q('.m3a-view model-viewer').getAttribute('src') || q('.m3a-view model-viewer').src, 'data:model/gltf-binary;base64,Z2xURg==', 'el modelo girando');
    // Asking for changes: another round.
    q('.m3a-fb').value = 'más alta'; q('.m3a-more').click();
    for (let i = 0; i < 100 && !(status === 'done' && !q('.m3a-end').hidden); i++) await sleep(20);
    eq(calls.find(c => c[0].endsWith('/feedback'))[1].text, 'más alta', 'pide los cambios');
    // Insert: a model object with the GLB and its caption; the job is deleted from the server.
    const n = slide().blocks.length; q('.m3a-insert').click();
    eq(slide().blocks.length, n + 1, 'se inserta'); eq(last().type, 'model'); eq(last().src, 'data:model/gltf-binary;base64,Z2xURg==');
    eq(last().caption, 'Modelo creado con IA', 'con su pie');
    assert(!D.getElementById('m3a-modal'), 'el diálogo se cierra');
    await sleep(10); assert(calls.at(-1)[0].endsWith('/cancel'), 'y se borra el trabajo del servidor');
    // Not set up on the server: it says so and opens nothing.
    await M.openModelAi({ api: async () => ({ ok: false }) });
    assert(!D.getElementById('m3a-modal'), 'sin servicio no se abre'); D.querySelector('.modal-backdrop .fr-do, .modal-backdrop button')?.click(); D.querySelectorAll('.modal-backdrop').forEach(x => x.remove());
    // The open edition: the button is hidden (accounts-only).
    const btn = D.querySelector('[data-action="model-ai"]');
    assert(btn && W.getComputedStyle(btn).display === 'none', 'en la edición abierta el botón está oculto');
  });

  await test('ejemplos para empresa: reunión general, QBR, caso de éxito, webinar y kickoff de ventas, con gráficos, diagramas, votaciones y Transformar, en los once idiomas', async () => {
    const W = frame.contentWindow, E = R.examples, TL = await W.eval("import('/src/features/content/tplang.js')");
    const all = (await W.eval("import('/src/features/content/examples-texts.js')")).default;
    const kinds = d => d.slides.flatMap(s => s.blocks.map(b => b.type === 'poll' ? 'poll:' + (b.kind || 'choice') : b.type));
    for (const key of ['allhands', 'qbr', 'casestudy', 'webinar', 'saleskickoff']) {
      eq(E.EXAMPLES[key]?.cat, 'biz', key + ': en el grupo Empresa');
      const es = await E.loadExample(key, 'es'), k = kinds(es);
      assert(es.slides.length >= 8 && es.slides.length <= 14, `${key}: ${es.slides.length} diapositivas`);
      assert(k.includes('chart') && (k.includes('diagram') || k.includes('table')), key + ': gráficos y diagramas o tablas');
      // Transform: two slides in a row with auto-animate share an object.
      const morph = es.slides.some((s, i) => s.autoAnimate && es.slides[i + 1]?.autoAnimate && s.blocks.some(b => es.slides[i + 1].blocks.some(c => c.id === b.id)));
      assert(morph, key + ': un objeto que viaja con Transformar');
      assert(es.slides.filter(s => s.notes).length > es.slides.length / 2, key + ': con notas del orador');
      const texts = TL.textsOf(es);
      for (const l of TL.TEMPLATE_LANGS) { const miss = texts.filter(s => !Object.hasOwn(all[l] || {}, s)); eq(miss.length, 0, `${key} en ${l}: sin traducir ${miss.slice(0, 2).join(' | ')}`); }
      const en = await E.loadExample(key, 'en'), ar = await E.loadExample(key, 'ar');
      assert(en.name !== es.name && TL.textsOf(en).every(s => !texts.includes(s) || all.en[s] === s), key + ': abierta en inglés, en inglés');
      assert(ar.slides.some(s => s.blocks.some(b => b.dir === 'rtl')), key + ': en árabe, de derecha a izquierda');
    }
    const kinds2 = d => kinds(d).join();
    assert(/poll:word/.test(kinds2(await E.loadExample('allhands', 'es'))) && /poll:qa/.test(kinds2(await E.loadExample('allhands', 'es'))), 'reunión general: nube de palabras y preguntas anónimas');
    const web = await E.loadExample('webinar', 'es'), last = web.slides.at(-1);
    assert(/poll:choice/.test(kinds2(web)) && /poll:qa/.test(kinds2(web)), 'webinar: votación inicial y preguntas del público');
    assert(last.blocks.filter(b => /^https:/.test(b.href || '')).length === 2, 'webinar: cierra con una llamada a la acción con dos enlaces');
    assert(/data-href="https:\/\/nubia\.example\/demo"/.test(R.io.buildHTML(web)), 'que se abren al presentar');
    eq(E.exampleFile('qbr'), 'examples-texts', 'sus textos en su propia tabla (no en templates/i18n)');
  });
}
