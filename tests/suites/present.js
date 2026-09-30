// Presenting: full-screen overlay, reveal.js options, ink, live captions, polls, live data, phone remote.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('presentar: crea una capa a pantalla completa y se cierra', async () => {
    reset(); R.io.present(); await sleep(40);
    const ov = D.getElementById('present-overlay');
    assert(ov && ov.querySelector('iframe'), 'no se creó la capa de presentación');
    ov.querySelector('#present-close').click(); await sleep(20);
    assert(!D.getElementById('present-overlay'), 'la capa no se cerró');
  });

  await test('cuestionario tipo Kahoot: respuesta correcta, puntos por rapidez, resultados y clasificación', async () => {
    reset(); const W = frame.contentWindow, P = await W.eval("import('/src/features/live/poll.js')");
    const quiz = { kind: 'quiz', pollId: 'q1', question: '¿Capital de Francia?', options: ['Madrid', 'París', 'Roma'], correct: [1], time: 20 };
    const votes = { ana: { a: 1, t: 0, n: 'Ana' }, luis: { a: 1, t: 20000, n: 'Luis' }, eva: { a: 0, t: 1000, n: 'Eva' } };
    const r = P.tallyVotes(quiz, votes);
    eq(r.counts.join(), '1,2,0', 'respuestas por opción');
    eq(r.board.map(x => `${x.n}:${x.pts}`).join(), 'Ana:1000,Luis:500,Eva:0', 'acertar al momento 1000, al final 500, fallar 0');
    const t2 = P.quizTotals([{ poll: quiz, votes }, { poll: { ...quiz, pollId: 'q2' }, votes: { eva: { a: 1, t: 0, n: 'Eva' } } }]);
    eq(t2.map(x => `${x.n}:${x.pts}`).join(), 'Ana:1000,Eva:1000,Luis:500', 'la clasificación suma todos los cuestionarios');
    const playing = P.pollResultsHTML(quiz, { ...r, revealed: false, left: 12.2 });
    assert(/13 s/.test(playing) && !/✓/.test(playing), 'mientras se juega: el tiempo, sin desvelar la respuesta');
    const done = P.pollResultsHTML(quiz, { ...r, revealed: true });
    assert(/✓ París/.test(done) && /🥇 <\/b>Ana — <b>1000/.test(done), 'al acabar: la correcta y el podio');
    assert(/🥈 <\/b>Luis/.test(P.pollResultsHTML({ kind: 'board' }, { board: r.board })), 'la diapositiva de clasificación');
    // The editor: "*" marks the right answer; time.
    const b = P.addPoll(); await sleep(20);
    D.querySelector(`#stage .block[data-id="${b.id}"]`); R.store.commit(() => { R.state.ui.selection = b.id; }, { history: false });
    const E = await W.eval("import('/src/ui/dialogs/poll.js')"); E.openPollEditor(slide().blocks.find(x => x.id === b.id)); await sleep(10);
    const m = D.getElementById('poll-modal'); m.querySelector('.pl-kind').value = 'quiz'; m.querySelector('.pl-kind').dispatchEvent(new W.Event('change'));
    assert(!m.querySelector('.pl-time').closest('label').hidden, 'con tiempo para responder');
    m.querySelector('.pl-opts').value = 'Madrid\n*París\nRoma'; m.querySelector('.pl-time').value = '30'; m.querySelector('.pl-ok').click(); await sleep(20);
    const q = slide().blocks.find(x => x.id === b.id);
    eq(JSON.stringify([q.kind, q.options, q.correct, q.time]), '["quiz",["Madrid","París","Roma"],[1],30]', 'la correcta, marcada con *');
    const html = R.io.buildHTML();
    assert(/function quizTotals/.test(html) && /type:'quizresult'/.test(html), 'la presentación juega el cuestionario y avisa a cada móvil de cómo le fue');
    assert(!/correct:p\.correct/.test(html), 'sin enviar la respuesta correcta a los móviles');
    assert(/data-poll="[^"]*&quot;correct&quot;:\[1\],&quot;time&quot;:30/.test(html), 'la presentación sabe cuál es la correcta y el tiempo');
  });

  await test('actividades con nota: ordenar, unir, completar huecos, etiquetar una imagen', async () => {
    reset(); const W = frame.contentWindow, P = await W.eval("import('/src/features/live/poll.js')");
    const order = { kind: 'order', pollId: 'o1', options: ['Primavera', 'Verano', 'Otoño', 'Invierno'] };
    const pub = P.publicActivity(order);
    assert(pub.items.length === 4 && pub.items.join() !== order.options.join(), 'ordenar: a los móviles, desordenados');
    eq(JSON.stringify(P.publicActivity(order)), JSON.stringify(pub), 'siempre del mismo modo (al reconectar)');
    eq(P.gradeActivity(order, ['Primavera', 'verano', 'Invierno', 'Otoño']).score, 0.5, 'la nota: la parte en su sitio (sin mayúsculas)');
    const match = { kind: 'match', pollId: 'm1', options: ['H = Hidrógeno', 'O = Oxígeno', 'C = Carbono'] };
    const mp = P.publicActivity(match); eq(mp.left.join(), 'H,O,C', 'unir: la izquierda en orden'); assert(mp.right.sort().join() === 'Carbono,Hidrógeno,Oxígeno', 'la derecha, desordenada');
    assert(!JSON.stringify(mp).includes('=') , 'sin las parejas');
    eq(P.gradeActivity(match, ['Hidrógeno', 'Oxigeno', '']).score, 2 / 3, 'unir: sin tildes también vale; en blanco no');
    const gaps = { kind: 'gaps', pollId: 'g1', text: 'El agua hierve a [100] grados y se congela a [0|cero].' };
    const gp = P.publicActivity(gaps); eq(JSON.stringify(gp.parts), '["El agua hierve a ",null," grados y se congela a ",null,"."]', 'huecos: el texto sin las respuestas');
    eq(P.gradeActivity(gaps, ['100', 'Cero']).score, 1, 'varias respuestas válidas');
    const label = { kind: 'label', pollId: 'l1', options: ['Núcleo', 'Membrana'], points: [{ x: 50, y: 50 }, { x: 90, y: 20 }], image: 'data:image/png;base64,iVBORw0KGgo=' };
    const lp = P.publicActivity(label); eq(lp.points.length, 2, 'etiquetar: los puntos'); assert(lp.labels.length === 2 && lp.image, 'las etiquetas y la imagen');
    // Tally, results and the leaderboard with the quizzes
    const votes = { ana: { a: ['Primavera', 'Verano', 'Otoño', 'Invierno'], n: 'Ana' }, luis: { a: ['Verano', 'Primavera', 'Otoño', 'Invierno'], n: 'Luis' } };
    const r = P.tallyVotes(order, votes);
    eq(r.board.map(x => `${x.n}:${x.pts}`).join(), 'Ana:1000,Luis:500', 'puntos: todo bien 1000, la mitad 500'); eq(r.counts.join(), '1,1,2,2', 'aciertos por elemento');
    eq(Math.round(r.average * 100), 75, 'media');
    const hidden = P.pollResultsHTML(order, { ...r, revealed: false });
    assert(/75 % de aciertos/.test(hidden) && !/Primavera/.test(hidden), 'mientras se responde: sin desvelar las soluciones');
    assert(/1\. Primavera/.test(P.pollResultsHTML(order, { ...r, revealed: true })), 'con un clic: las soluciones y cuánto acertó cada una');
    eq(P.quizTotals([{ poll: order, votes }, { poll: { kind: 'quiz', options: ['a', 'b'], correct: [0], time: 20 }, votes: { luis: { a: 0, t: 0, n: 'Luis' } } }]).map(x => `${x.n}:${x.pts}`).join(), 'Luis:1500,Ana:1000', 'la clasificación suma actividades y cuestionarios');
    // The editor
    const b = P.addPoll(); await sleep(20);
    const E = await W.eval("import('/src/ui/dialogs/poll.js')"); E.openPollEditor(slide().blocks.find(x => x.id === b.id)); await sleep(10);
    const m = D.getElementById('poll-modal'); m.querySelector('.pl-kind').value = 'gaps'; m.querySelector('.pl-kind').dispatchEvent(new W.Event('change'));
    assert(!m.querySelector('.pl-text-l').hidden && m.querySelector('.pl-opts-l').hidden, 'huecos: el texto en lugar de las opciones');
    m.querySelector('.pl-text').value = gaps.text; m.querySelector('.pl-ok').click(); await sleep(20);
    const g = slide().blocks.find(x => x.id === b.id); eq(g.kind + '|' + g.text, 'gaps|' + gaps.text, 'se guarda');
    const html = R.io.buildHTML();
    assert(/function publicActivity/.test(html) && /pub:act\?publicActivity\(p\):null/.test(html), 'la presentación manda a los móviles solo lo público');
    assert(/options:act\?\[\]:p\.options/.test(html), 'y no las opciones (que llevan las respuestas)');
    E.openPollEditor(g); await sleep(10); const m2 = D.getElementById('poll-modal');
    m2.querySelector('.pl-kind').value = 'label'; m2.querySelector('.pl-kind').dispatchEvent(new W.Event('change'));
    assert(!m2.querySelector('.pl-pic').hidden, 'etiquetar: imagen y colocar');
    m2.querySelector('.modal-close').click();
  });

  await test('modo aula: las diapositivas en los dispositivos del alumnado y los resultados de cada alumno', async () => {
    reset(); const W = frame.contentWindow, P = R.poll;
    assert(!/var CLASS=true/.test(R.io.buildHTML()), 'apagado: nada de aula');
    D.querySelector('[data-action="classroom"]').click(); await sleep(10);
    assert(R.state.deck.classroom && D.querySelector('[data-action="classroom"]').classList.contains('on'), 'se activa');
    const html = R.io.buildHTML();
    assert(/var CLASS=true/.test(html) && /Reveal\.on\('fragmentshown',pushSlide\)/.test(html), 'la presentación manda cada diapositiva (y sus animaciones) aunque no haya votaciones');
    assert(/id='rv-class'|getElementById\('rv-class'\)/.test(html), 'con el código y el QR en una esquina');
    for (const sc of new W.DOMParser().parseFromString(html, 'text/html').querySelectorAll('script:not([src])')) {
      try { new W.Function(sc.textContent); } catch (e) { assert(false, 'el código de la presentación tiene un error: ' + e.message); }
    }
    // Results per student
    const q = P.addPoll({ kind: 'quiz', question: 'Capital', options: ['Roma', 'París'], correct: [1], time: 20 });
    R.slides.addSlide(); const o = P.addPoll({ kind: 'order', question: 'Estaciones', options: ['Primavera', 'Verano'] }); await sleep(10);
    W.localStorage.setItem('revela.poll.' + q.pollId, JSON.stringify({ ana: { a: 1, t: 0, n: 'Ana' }, luis: { a: 0, t: 0, n: 'Luis' } }));
    W.localStorage.setItem('revela.poll.' + o.pollId, JSON.stringify({ luis: { a: ['Primavera', 'Verano'], n: 'Luis' } }));
    const C = await W.eval("import('/src/ui/dialogs/classroom.js')"), r = C.classResults();
    eq(r.rows.map(x => `${x.name}:${x.pts.join('/')}:${x.total}`).join(' '), 'Ana:1000/:1000 Luis:0/1000:1000', 'cada alumno en cada actividad, y su total');
    assert(/^"Alumno","1\. Capital","2\. Estaciones","Total"\n"Ana",1000,,1000/.test(C.classResultsCSV()), 'en CSV: ' + C.classResultsCSV().split('\n')[1]);
    D.querySelector('[data-action="classroom-results"]').click(); await sleep(10);
    eq(D.querySelectorAll('#class-modal .cr-table tbody tr').length, 2, 'en una tabla'); D.querySelector('#class-modal .modal-close').click();
    W.localStorage.removeItem('revela.poll.' + q.pollId); W.localStorage.removeItem('revela.poll.' + o.pollId);
  });

  await test('a su ritmo: las actividades se responden dentro de las diapositivas (y se corrigen fuera si hay plataforma)', async () => {
    reset(); const P = R.poll;
    P.addPoll({ kind: 'quiz', question: 'Capital', options: ['Roma', 'París'], correct: [1] });
    R.slides.addSlide(); P.addPoll({ kind: 'order', question: 'Ordena', options: ['Primavera', 'Verano', 'Otoño'] });
    R.slides.addSlide(); P.addPoll({ kind: 'choice', question: 'En directo', options: ['a', 'b'] }); await sleep(10);
    const html = R.io.buildHTML(R.state.deck, { selfPaced: true });
    assert(!/new Peer\(/.test(html) && /function selfPacedRuntime/.test(html), 'sin conexión con móviles: todo en la página');
    for (const sc of new DOMParser().parseFromString(html, 'text/html').querySelectorAll('script:not([src])')) { try { new Function(sc.textContent); } catch (e) { assert(false, 'código con error: ' + e.message); } }
    const asked = []; window.__revelaAnswer = (id, a) => { asked.push([id, a]); return Promise.resolve({ score: 1, sent: true }); };
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.() && w.document.querySelector('.rv-poll button')); i++) await sleep(100);
    try {
      const polls = [...w.document.querySelectorAll('.rv-poll')];
      eq(getComputedStyle(polls[0].querySelector('.rv-poll-qr')).display, 'none', 'sin QR');
      polls[0].querySelectorAll('.rv-poll-res button')[1].click(); await sleep(30);
      eq(JSON.stringify(asked[0]), JSON.stringify([JSON.parse(polls[0].dataset.poll).pollId, 1]), 'la respuesta va a quien la corrige (la plataforma, por el servidor): ' + polls[0].querySelector('.rv-poll-res').innerHTML.slice(0, 300));
      assert(/¡Todo bien!.*Nota enviada/.test(polls[0].querySelector('.rv-self-result')?.textContent), 'y se ve el resultado: ' + polls[0].innerHTML.slice(-400));
      assert([...polls[0].querySelectorAll('button')].every(b => b.disabled), 'un intento');
      assert(/en directo/.test(polls[2]?.textContent), 'las votaciones en directo lo dicen');
      delete window.__revelaAnswer;                                          // (without a platform: marked here)
      w.sessionStorage.clear(); f.contentWindow.location.reload(); await sleep(50);
      for (let i = 0; i < 80 && !(f.contentWindow.Reveal?.isReady?.() && f.contentWindow.document.querySelector('.rv-self-check')); i++) await sleep(100);
      const ord = f.contentWindow.document.querySelectorAll('.rv-poll')[1], rows = () => [...ord.querySelectorAll('span')].map(x => x.textContent);
      const want = ['Primavera', 'Verano', 'Otoño'];
      for (let k = 0; k < 6 && rows().join() !== want.join(); k++) { const i = rows().findIndex((t, j) => t !== want[j]), j = rows().indexOf(want[i]); ord.querySelectorAll('button')[j * 2].click(); await sleep(5); }
      eq(rows().join(), want.join(), 'se ordena con las flechas');
      ord.querySelector('.rv-self-check').click(); await sleep(30);
      assert(/¡Todo bien!/.test(ord.querySelector('.rv-self-result')?.textContent), 'sin plataforma se corrige en la página: ' + ord.innerHTML.slice(-300));
    } finally { f.remove(); delete window.__revelaAnswer; }
  });

  await test('3D: continuidad entre diapositivas, bordes y zoom al presentar; botones rápidos para presentar', async () => {
    reset(); const W = frame.contentWindow, M = await W.eval("import('/src/io/runtime/model3d.js')");
    // The same model on the next slide: it arrives with its angle and turning, then as chosen.
    const mk = (id, extra = '') => { const s = document.createElement('section'); s.innerHTML = `<model-viewer data-id="${id}" src="a.glb" camera-orbit="30deg 75deg auto" ${extra}></model-viewer>`;
      const mv = s.firstChild, st = { spin: 0, orbit: null };
      Object.defineProperties(mv, { loaded: { value: true }, turntableRotation: { get: () => st.spin }, cameraOrbit: { set: v => { st.orbit = v; }, get: () => st.orbit } });
      mv.getCameraOrbit = () => ({ theta: 50 * Math.PI / 180, phi: 70 * Math.PI / 180 }); mv.resetTurntableRotation = v => { st.spin = v; }; mv.jumpCameraToGoal = () => {}; mv.st = st; return s; };
    const api = M.model3dRuntime(), prev = mk('m1'), cur = mk('m1'); prev.firstChild.st.spin = 1.2;
    api.handoff(prev, cur);
    eq(cur.firstChild.st.spin, 1.2, 'sigue girando desde donde estaba'); assert(/^50\.0deg 70\.0deg/.test(cur.firstChild.st.orbit), 'y con el mismo ángulo de cámara');
    const cur2 = mk('m1', 'data-arrive="front" auto-rotate'); api.handoff(prev, cur2); await sleep(1600);
    assert(Math.abs(cur2.firstChild.st.spin) < 0.01 && /^0\.0deg 75deg/.test(cur2.firstChild.st.orbit) && !cur2.firstChild.hasAttribute('auto-rotate'), 'o gira hasta quedar de frente (y se queda)');
    const cur3 = mk('m1', 'data-arrive="reset"'); api.handoff(prev, cur3); eq(cur3.firstChild.st.spin, 0, 'o empieza de cero');
    const cur4 = mk('otro'); cur4.firstChild.setAttribute('src', 'b.glb'); api.handoff(prev, cur4); eq(cur4.firstChild.st.spin, 0, 'otro modelo distinto: nada que continuar');
    // Edges, and the runtime in every presentation with 3D
    R.store.commit(() => { slide().blocks.push({ id: 'md', type: 'model', src: 'data:model/gltf-binary;base64,Z2xURg==', x: 100, y: 100, w: 300, h: 200, edge: 'fade', arrive: 'turn', rotation: 0, animation: null }); });
    let html = R.io.buildHTML();
    assert(/function model3dRuntime/.test(html) && /data-arrive="turn"/.test(html), 'continuidad y llegada, en la presentación');
    assert(/<model-viewer[^>]*style="[^"]*mask-image:linear-gradient/.test(html), 'bordes difuminados');
    R.store.commit(() => { slide().blocks.at(-1).edge = 'free'; }); html = R.io.buildHTML();
    assert(/<model-viewer[^>]*data-bleed="3"/.test(html), 'sin corte: el visor ocupa el triple alrededor');
    select(slide().blocks.at(-1)); await sleep(20);
    assert([...D.querySelectorAll('#ribbon select')].some(x => [...x.options].some(o => o.value === 'fade')) && [...D.querySelectorAll('#ribbon select')].some(x => [...x.options].some(o => o.value === 'front')), 'se elige en la pestaña del 3D');
    // Zoom while presenting
    R.store.commit(() => { slide().blocks.find(b => b.type === 'text').html = 'Clases sencillas'; });
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([R.io.buildHTML(R.state.deck, { inApp: true })], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.() && w.document.querySelector('#ink-bar [data-z]')); i++) await sleep(100);
    try {
      const bar = w.document.getElementById('ink-bar'), move = (x, y) => w.document.dispatchEvent(new w.MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
      move(320, 180); await sleep(500); assert(!bar.classList.contains('show'), 'mover el ratón (o el puntero) por la pantalla no saca la barra');
      move(30, 340); assert(!bar.classList.contains('show'), 'ni al pasar de largo por la esquina');
      await sleep(450); assert(bar.classList.contains('show'), 'sale al dejarlo un momento abajo a la izquierda');
      move(320, 180); await sleep(750); assert(!bar.classList.contains('show'), 'y se va al salir de la esquina');
      const rv = w.document.querySelector('.reveal');
      w.document.querySelector('#ink-bar [data-z="1"]').click(); eq(rv.style.scale, '1.25', 'acercar desde la barra');
      w.dispatchEvent(new w.WheelEvent('wheel', { deltaY: -200, ctrlKey: true, clientX: 100, clientY: 100, cancelable: true }));
      assert(+rv.style.scale > 1.25, 'Ctrl + rueda');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: '0', bubbles: true })); eq(rv.style.scale, '', '0: tamaño normal');
      // Right-click: the presenting menu
      const cm = (x = 200, y = 150) => { w.document.body.dispatchEvent(new w.MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true, cancelable: true })); return w.document.getElementById('rv-cm'); };
      let m = cm(); assert(m, 'clic derecho: menú de presentación');
      const acts = [...m.querySelectorAll('[data-m]')].map(b => b.dataset.m).join();
      eq(acts, 'next,prev,goto,ov,pen,hl,laser,arrow,erase,cc,zin,zout,z0,black,white,full,end', 'con lo que tiene sentido al presentar');
      m.querySelector('[data-m="pen"]').click(); assert(w.document.getElementById('ink-canvas').classList.contains('on') && !w.document.getElementById('rv-cm'), 'elegir el lápiz (y se cierra)');
      m = cm(); assert(m.querySelector('[data-m="pen"]').classList.contains('on'), 'marca lo que está activo'); m.querySelector('[data-m="arrow"]').click();
      m = cm(); m.querySelector('[data-m="goto"]').click(); const list = m.querySelectorAll('.rv-cm-list button');
      eq(list.length, w.Reveal.getSlides().length, 'ir a una diapositiva: todas en una lista');
      eq(list[0].textContent, '1. Clases sencillas', 'con sus títulos');
      m = cm(); m.querySelector('[data-m="white"]').click(); eq(w.document.getElementById('rv-white').style.display, 'block', 'pantalla en blanco');
      w.document.getElementById('rv-white').click(); eq(w.document.getElementById('rv-white').style.display, 'none', 'y un clic la quita');
      m = cm(); w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); assert(!w.document.getElementById('rv-cm'), 'Esc cierra el menú');
    } finally { f.remove(); }
    // Morph of a text: what travels is the text itself (a tight box), and its size isn't animated twice
    reset(); R.store.commit(() => { slide().blocks[0].html = 'NOVA'; slide().blocks[0].textAlign = 'center'; });
    R.slides.duplicateSlide(); R.store.commit(() => { const s2 = R.state.deck.slides[1]; s2.autoAnimate = true; s2.blocks[0].textAlign = 'left'; s2.blocks[0].fontSize = 30; });
    const mh = R.io.buildHTML();
    assert(/<div class="rv-mt" data-id="[^"]+" style="display:inline-block[^"]*">NOVA<\/div>/.test(mh), 'transformar un texto: se mueve la caja justa del texto');
    assert(/autoAnimateStyles:\['opacity','color'/.test(mh) && !/autoAnimateStyles:\[[^\]]*font-size/.test(mh), 'sin animar el tamaño de letra además de la escala');
    // Quick buttons and the editor's zoom slider
    assert(D.querySelector('.titlebar .tb-play [data-action="present"]') && D.querySelector('.titlebar .tb-play [data-action="present-current"]'), 'presentar desde el principio o desde aquí, en la barra de título');
    const sl = D.getElementById('zoom-slider'); sl.value = '150'; sl.dispatchEvent(new W.Event('input')); eq(R.state.ui.zoom, 1.5, 'deslizador de zoom del editor');
    D.querySelector('[data-action="zoom-fit"]').click();
  });

  await test('transiciones: al pasar el ratón por un efecto, se ve en pequeño con la propia diapositiva', async () => {
    reset(); R.slides.addSlide(); await sleep(20);
    D.querySelector('[data-tab="transitions"]').click(); await sleep(30);
    const b = D.querySelector('[data-slide-transition="circle"]');
    b.dispatchEvent(new frame.contentWindow.PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    await sleep(500);
    const pop = D.getElementById('trans-preview'); assert(pop && pop.querySelector('iframe'), 'aparece la vista previa');
    let w; for (let i = 0; i < 80 && !((w = pop.querySelector('iframe').contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    let went = false; for (let i = 0; i < 40 && !went; i++) { await sleep(100); went = w.Reveal.getIndices(w.Reveal.getCurrentSlide()).h === 1; }
    assert(went, 'y reproduce el paso de la anterior a esta');
    eq(w.Reveal.getCurrentSlide().getAttribute('data-transition'), 'circle', 'con el efecto que se señala');
    assert(!w.document.querySelector('.scroll-page-content'), 'como en una presentación (no la vista de móvil de reveal.js)');
    eq(R.state.deck.slides[1].transition ?? null, null, 'mirar no cambia nada');
    b.dispatchEvent(new frame.contentWindow.PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: D.body }));
    assert(!D.getElementById('trans-preview'), 'al salir, se va');
  });

  await test('votación en directo: recuento, resultados, export y QR', async () => {
    reset(); const P = R.poll;
    const c = P.tallyVotes({ kind: 'choice', options: ['a', 'b', 'c'] }, { v1: 0, v2: 2, v3: 2, v4: 9 });
    eq(c.counts.join(), '1,0,2', 'una opción (ignora índices inválidos)'); eq(c.voters, 4, 'votantes');
    eq(P.tallyVotes({ kind: 'multi', options: ['a', 'b'] }, { v1: [0, 1], v2: [1] }).counts.join(), '1,2', 'varias opciones');
    const r = P.tallyVotes({ kind: 'rating' }, { a: 5, b: 4, c: 3 }); eq(r.average, 4, 'valoración media'); eq(r.counts.join(), '0,0,1,1,1', 'distribución');
    eq(P.tallyVotes({ kind: 'word' }, { a: 'Sol, luna', b: 'sol' }).words.sol, 2, 'nube de palabras (sin mayúsculas)');
    const qa = P.tallyVotes({ kind: 'qa' }, { 'q:1': { t: 'Primera', by: 'a', time: 1, up: {} }, 'q:2': { t: 'Segunda', by: 'b', time: 2, up: { a: 1, c: 1 } } });
    eq(qa.questions.map(x => x.text + x.up).join(), 'Segunda2,Primera0', 'preguntas ordenadas por votos'); eq(qa.voters, 3, 'participantes');
    assert(/▲ 2<\/b><span>Segunda/.test(P.pollResultsHTML({ kind: 'qa' }, qa)), 'lista de preguntas en pantalla');
    assert(/width:100%/.test(P.pollResultsHTML({ kind: 'choice', options: ['a', 'b'] }, P.tallyVotes({ kind: 'choice', options: ['a', 'b'] }, { x: 0 }))), 'barras');
    assert(/conic-gradient/.test(P.pollResultsHTML({ kind: 'choice', display: 'pie', options: ['a'] }, { counts: [3], voters: 3 })), 'circular');
    D.querySelector('[data-action="insert-poll"]').click(); await sleep(10);
    assert(D.getElementById('poll-modal'), 'editor de la votación');
    D.querySelector('#poll-modal .pl-q').value = '¿Café o té?'; D.querySelector('#poll-modal .pl-opts').value = 'Café\nTé';
    D.querySelector('#poll-modal .pl-ok').click(); await sleep(10);
    const b = last(); eq(b.question, '¿Café o té?', 'pregunta'); eq(b.options.join(), 'Café,Té', 'opciones');
    assert(D.querySelector(`.block[data-id="${b.id}"] .poll-blk`), 'en el lienzo');
    frame.contentWindow.localStorage.setItem('revela.poll.' + b.pollId, JSON.stringify({ u1: 1, u2: 1 })); R.render(); await sleep(10);
    assert(/Té[\s\S]*2/.test(D.querySelector(`.block[data-id="${b.id}"] .poll-blk`).textContent), 'el editor muestra los últimos resultados');
    eq(P.votesCSV(b), 'opcion,votos\n"Café",0\n"Té",2', 'CSV');
    const html = R.io.buildHTML();
    assert(/class="rv-poll" data-poll="\{&quot;pollId/.test(html), 'datos de la votación en el export');
    assert(/revela-vote-/.test(html) && /qrcode@1\.5\.1/.test(html), 'anfitrión PeerJS y QR');
    assert(/fmesasc\.github\.io\/revela\/vote\.html/.test(html), 'enlace de voto absoluto (funciona también desde un archivo)');
    P.clearVotes(b.pollId);
    const qr = await fetch('https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js'); assert(qr.ok, 'la librería de QR existe en el CDN');
  });

  await test('paneles de datos y gráficos vinculados a CSV', async () => {
    reset(); const Dd = R.dashboards;
    const pb = Dd.dashboardEmbed('https://app.powerbi.com/groups/me/reports/0a1b2c3d-1111-2222-3333-444455556666/ReportSection?ctid=abc');
    eq(pb.url, 'https://app.powerbi.com/reportEmbed?reportId=0a1b2c3d-1111-2222-3333-444455556666&autoAuth=true&ctid=abc', 'Power BI → reportEmbed'); eq(pb.note, 'signin', 'aviso de inicio de sesión');
    eq(Dd.dashboardEmbed('<iframe title="x" src="https://app.powerbi.com/view?r=eyJr&amp;pageName=A"></iframe>').url, 'https://app.powerbi.com/view?r=eyJr&pageName=A', 'código <iframe> de «Publicar en la web»');
    eq(Dd.dashboardEmbed('https://lookerstudio.google.com/reporting/abc/page/p1').url, 'https://lookerstudio.google.com/embed/reporting/abc/page/p1', 'Looker Studio');
    eq(Dd.dashboardEmbed('https://public.tableau.com/app/profile/ana/viz/Ventas/Hoja1').url, 'https://public.tableau.com/views/Ventas/Hoja1?:showVizHome=no&:embed=true', 'Tableau Public');
    eq(Dd.dashboardEmbed('https://www.datawrapper.de/_/AbC12/').url, 'https://datawrapper.dwcdn.net/AbC12/', 'Datawrapper');
    eq(Dd.dashboardEmbed('https://public.flourish.studio/visualisation/12345/').url, 'https://flo.uri.sh/visualisation/12345/embed', 'Flourish');
    eq(Dd.dashboardEmbed('http://inseguro.com'), null, 'solo https');
    eq(Dd.csvUrl('https://docs.google.com/spreadsheets/d/ID123/edit#gid=7'), 'https://docs.google.com/spreadsheets/d/ID123/export?format=csv&gid=7', 'Google Sheets → CSV');
    const r = Dd.addDashboard('https://app.powerbi.com/view?r=eyJr', 5); eq(r.block.type, 'embed', 'insertado'); eq(r.block.refreshMin, 5, 'recarga');
    assert(/data-refresh-min="5"/.test(R.io.buildHTML()), 'recarga en el export');
    // Gráfico vinculado a un CSV real (servido junto a los tests)
    R.blocks.addChart(); const c = last();
    const url = new URL('fixtures/ventas.csv', location.href).href;
    await Dd.linkChart(c, url, 30);
    eq(c.data.map(d => d.label + d.value).join(','), 'Ene10,Feb12,Mar15,Abr9', 'datos del CSV'); eq(c.seriesName, 'Ventas', 'serie'); eq(c.series[0].values.join(), '4,5,6,3', 'segunda serie');
    c.data = [{ label: 'X', value: 1 }];                           // datos viejos en el proyecto
    const html = R.io.buildHTML(); assert(/class="rv-live-chart"/.test(html), 'gráfico vivo en el export');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let rects = 0; for (let i = 0; i < 80; i++) { await sleep(100); rects = f.contentDocument?.querySelectorAll('.rv-live-chart svg rect[height]:not([height="3"])').length || 0; if (rects === 8) break; }
    f.remove();
    eq(rects, 8, 'la presentación recarga el CSV y redibuja (4 meses × 2 series)');
  });

  await test('subtítulos en directo al presentar (reconocimiento de voz simulado)', async () => {
    reset();
    const fake = `<script>window.confirm=function(){return true};window.SpeechRecognition=function(){var s=this;window.__rec=s;s.start=function(){s.started=true};s.stop=function(){s.started=false}};<\/script>`;
    const html = R.io.buildHTML().replace('<head>', '<head>' + fake);
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).__ink && w.Reveal?.isReady?.()); i++) await sleep(100);
    try {
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      assert(w.__ink.captionsOn && w.__rec.started, 'C activa los subtítulos');
      eq(w.__rec.lang, 'es-ES', 'idioma del reconocimiento');
      const res = (txt, fin) => { const r = [{ transcript: txt }]; r.isFinal = fin; return r; };
      w.__rec.onresult({ resultIndex: 0, results: [res('hola a todos', true)] });
      w.__rec.onresult({ resultIndex: 1, results: [res('hola a todos', true), res('bienvenidos', false)] });
      eq(f.contentDocument.getElementById('captions').textContent, 'hola a todos bienvenidos', 'texto en pantalla (final + provisional)');
      const heard = []; w.addEventListener('rv-caption', e => heard.push(e.detail));
      w.__rec.onresult({ resultIndex: 0, results: [res('para el público', true)] });
      assert(heard.some(h => h.text === 'para el público' && h.final && h.lang === 'es-ES'), 'cada frase sale también hacia el público');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      assert(!w.__ink.captionsOn && !w.__rec.started, 'C los apaga');
    } finally { f.remove(); }
  });

  await test('la página del público: diapositiva del aula, subtítulos (traducidos) y actividades', async () => {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:700px;opacity:0';
    f.src = new URL('../vote.html?test', D.baseURI).href; document.body.appendChild(f);
    let v; for (let i = 0; i < 60 && !(v = f.contentWindow)?.__vote; i++) await sleep(100);
    try {
      const Q = s => f.contentDocument.querySelector(s);
      v.__vote.onData({ type: 'css', css: '<style>.x{color:red}</style>' });
      v.__vote.onData({ type: 'slide', html: '<section class="present"><h2 class="x">Hola aula</h2></section>', bg: '', w: 1280, h: 720, cls: 'reveal', n: 3, of: 9 });
      assert(!Q('#slide-view').hidden && /Hola aula/.test(Q('#slide-view iframe').srcdoc) && /color:red/.test(Q('#slide-view iframe').srcdoc), 'la diapositiva, con los estilos de la presentación');
      eq(Q('#slide-view iframe').getAttribute('sandbox'), '', 'sin ejecutar nada de ella'); eq(Q('#slide-n').textContent, '3 / 9');
      v.__vote.onData({ type: 'caption', text: 'buenos días', final: true, lang: 'es-ES' });
      eq(Q('#cc-text').textContent, 'buenos días', 'subtítulos');
      delete v.Translator; v.Translator = undefined;
      Q('#cc-lang').value = 'en'; Q('#cc-lang').dispatchEvent(new v.Event('change')); await sleep(20);
      assert(v.__sent.some(m => m.type === 'lang' && m.lang === 'en'), 'sin traductor en el navegador: se pide a quien presenta');
      v.__vote.onData({ type: 'caption', text: 'good morning', final: true, lang: 'en', translated: true });
      eq(Q('#cc-text').textContent, 'good morning', 'y llega traducido');
      v.Translator = { availability: async () => 'available', create: async () => ({ translate: async t => '[EN] ' + t }) };
      Q('#cc-lang').value = 'en'; Q('#cc-lang').dispatchEvent(new v.Event('change')); await sleep(20);
      v.__vote.onData({ type: 'caption', text: 'hasta luego', final: true, lang: 'es-ES' }); await sleep(20);
      eq(Q('#cc-text').textContent, '[EN] hasta luego', 'con traductor en el navegador: se traduce en el propio móvil');
      v.__vote.onData({ type: 'poll', poll: { pollId: 'o9', kind: 'order', question: 'Ordena', options: [], pub: { items: ['B', 'A'] } } });
      eq([...f.contentDocument.querySelectorAll('.act-row span')].map(x => x.textContent).join(), 'B,A', 'actividad de ordenar');
      f.contentDocument.querySelectorAll('.act-row button')[1].click();
      Q('#send').click();
      const vote = v.__sent.find(m => m.type === 'vote'); eq(JSON.stringify(vote.answer), '["A","B"]', 'envía el orden elegido');
    } finally { f.remove(); }
  });

  await test('configuración de reveal.js, efectos de fragmento y temas', async () => {
    reset(); R.slides.toggleAutoAnimate();
    D.querySelector('[data-action="deck-settings"]').click(); await sleep(10);
    const q = x => D.querySelector('#set-modal ' + x);
    q('[data-k="controls"]').checked = false; q('[data-k="progress"]').checked = false; q('[data-k="navigationMode"]').value = 'linear';
    q('[data-k="mouseWheel"]').checked = true; q('[data-k="autoAnimateDuration"]').value = '2'; q('.sl-dur').value = '0.5';
    q('[data-k="parallax"]').value = 'https://ejemplo.org/p.jpg'; q('.set-ok').click(); await sleep(10);
    const sorted = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
    eq(sorted(R.state.deck.reveal), sorted({ controls: false, progress: false, navigationMode: 'linear', mouseWheel: true, autoAnimateDuration: 2, parallax: 'https://ejemplo.org/p.jpg' }), 'solo se guarda lo cambiado');
    let html = R.io.buildHTML();
    assert(/controls:false/.test(html) && /progress:false/.test(html) && /navigationMode:"linear"/.test(html) && /mouseWheel:true/.test(html), 'opciones en Reveal.initialize');
    assert(/parallaxBackgroundImage:"https:\/\/ejemplo\.org\/p\.jpg"/.test(html), 'fondo parallax');
    assert(/data-auto-animate data-auto-animate-duration="0.5"/.test(html), 'Morph de esta diapositiva');
    assert(/plugin\/zoom\/zoom\.js/.test(html) && /RevealZoom/.test(html) && /RevealSearch/.test(html), 'zoom y búsqueda');
    select(slide().blocks[0]); R.trans.setAnimation('fade-in-then-semi-out'); R.slides.addSlide(); R.blocks.addText(); R.trans.setAnimation('highlight-current-blue');
    html = R.io.buildHTML();
    assert(/class="fragment fade-in-then-semi-out"/.test(html) && /class="fragment highlight-current-blue"/.test(html), 'efectos de reveal.js');
    D.querySelector('[data-theme]').value = 'sky'; D.querySelector('[data-theme]').dispatchEvent(new Event('change'));
    assert(/theme\/sky\.css/.test(R.io.buildHTML()), 'tema Sky');
    R.state.deck.reveal = { view: 'scroll' };
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([R.io.buildHTML()], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    try { assert(w.Reveal.isScrollView?.(), 'vista de desplazamiento activa'); assert(w.Reveal.hasPlugin('zoom') && w.Reveal.hasPlugin('search'), 'complementos cargados'); }
    finally { f.remove(); }
  });

  await test('mando: el estado enviado refleja diapositiva, total y notas', async () => {
    reset(); R.slides.addSlide(); slide().notes = 'nota B'; R.state.ui.slideIndex = 1; R.render();
    const st = R.remote.presentationState();
    eq(st.kind, 'state', 'tipo'); eq(st.total, 2, 'total'); eq(st.index, 1, 'índice'); eq(st.notes, 'nota B', 'notas');
  });

  await test('mando: comandos next/prev navegan en el editor', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.state.ui.slideIndex = 0; R.render();
    R.remote.applyCommand({ type: 'next' }); eq(R.state.ui.slideIndex, 1, 'next');
    R.remote.applyCommand({ type: 'next' }); eq(R.state.ui.slideIndex, 2, 'next 2');
    R.remote.applyCommand({ type: 'prev' }); eq(R.state.ui.slideIndex, 1, 'prev');
    R.remote.applyCommand({ type: 'goto', index: 0 }); eq(R.state.ui.slideIndex, 0, 'goto');
  });

  await test('mando: el estado omite las diapositivas ocultas', async () => {
    reset(); R.slides.addSlide(); R.slides.toggleSlideHidden(0); R.render();
    eq(R.remote.presentationState().total, 1, 'solo cuenta visibles');
  });

  await test('presentación: lápiz, resaltador y borrar tinta', async () => {
    reset(); R.blocks.addText();
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.srcdoc = R.io.buildHTML(); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).__ink && w.Reveal?.isReady?.()); i++) await sleep(100);
    try {
      assert(w.__ink, 'tinta inicializada en la presentación');
      const cd = f.contentDocument, cv = cd.getElementById('ink-canvas');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true }));
      eq(w.__ink.tool, 'pen', 'Ctrl+P activa el lápiz');
      assert(cv.classList.contains('on'), 'lienzo captura el puntero');
      const P = (type, x, y) => cv.dispatchEvent(new w.PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true }));
      P('pointerdown', 100, 100); P('pointermove', 200, 150); P('pointerup', 200, 150);
      eq(w.__ink.strokes().length, 1, 'un trazo'); eq(w.__ink.strokes()[0].p.length, 2, 'dos puntos');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'i', ctrlKey: true, bubbles: true }));
      P('pointerdown', 50, 50); P('pointerup', 50, 50);
      assert(w.__ink.strokes()[1].hl, 'trazo de resaltador');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'e', bubbles: true }));
      eq(w.__ink.strokes().length, 0, 'E borra la tinta');
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      eq(w.__ink.tool, null, 'Esc vuelve al puntero');
      assert(!w.Reveal.isOverview(), 'Esc no abre la vista general');
    } finally { f.remove(); }
  });

  await test('vista general al presentar (Esc): mosaico por secciones que cabe en pantalla y navegable', async () => {
    const d = R.examples.buildExample('coding');
    d.sections = [{ id: 's1', name: 'Fundamentos' }, { id: 's2', name: 'Asincronía' }];
    d.slides.forEach((s, i) => { s.sectionId = i < 4 ? 's1' : 's2'; });
    R.store.replaceDeck(d);
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:800px;visibility:hidden'; D.body.appendChild(f);
    try {
      f.srcdoc = R.io.buildHTML(d, { inApp: true });
      for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
      const W = f.contentWindow, key = k => W.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true }));
      W.Reveal.slide(2); await sleep(100);
      key('Escape'); await sleep(200);
      const ov = f.contentDocument.querySelector('.rv-ov'); assert(ov, 'Esc abre la vista general propia');
      assert(!W.Reveal.isOverview(), 'no la fila de reveal.js');
      const items = ov.querySelectorAll('.rv-ov-it');
      eq(items.length, W.Reveal.getSlides().filter(s => !s.querySelector('section')).length, 'una miniatura por diapositiva (también las verticales)');
      eq([...ov.querySelectorAll('h2')].map(h => h.textContent).join(','), 'Fundamentos,Asincronía', 'agrupadas por sección');
      assert(items[2].classList.contains('cur'), 'la actual, marcada');
      const last = items[items.length - 1].getBoundingClientRect();
      assert(last.bottom <= 800, 'caben todas en la pantalla (aprovecha el alto): ' + last.bottom);
      assert(items[0].getBoundingClientRect().width > 250, 'a buen tamaño');
      assert(/Funciones/.test(items[1].textContent), 'con su contenido');
      key('ArrowRight'); key('Enter'); await sleep(300);
      assert(!f.contentDocument.querySelector('.rv-ov'), 'Intro cierra y va');
      eq(W.Reveal.getSlidePastCount(), 3, 'a la diapositiva elegida');
      key('o'); await sleep(100); assert(f.contentDocument.querySelector('.rv-ov'), 'O también la abre');
      f.contentDocument.querySelectorAll('.rv-ov-it')[0].click(); await sleep(300);
      eq(W.Reveal.getSlidePastCount(), 0, 'clic en una miniatura va a ella');
      key('Escape'); await sleep(100); key('Escape'); await sleep(100);
      assert(!f.contentDocument.querySelector('.rv-ov'), 'Esc la cierra');
    } finally { f.remove(); }
  });
}
