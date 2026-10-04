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
      assert(ns.blocks.some(b => b.type === 'text' && /VAR guarda/.test(b.html || '') && b.x >= cb.x + cb.w - 1), 'la explicación al lado');
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
      assert(box && !box.checked && btn.disabled, 'casilla sin marcar y el botón desactivado');
      assert(/14 años o más/.test(label.textContent) && label.querySelector('a[href$="/terms.html"]') && label.querySelector('a[href$="/privacy.html"]'), 'texto con enlaces a las condiciones y a la privacidad');
      box.checked = true; box.dispatchEvent(new W.Event('change')); eq(btn.disabled, false, 'al marcarla se puede iniciar sesión');
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
    const until = async f => { for (let i = 0; i < 250 && !f(); i++) await sleep(20); };
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
}
