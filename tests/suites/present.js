// Presenting: full-screen overlay, reveal.js options, ink, live captions, polls, live data, phone remote.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('presentar: crea una capa a pantalla completa y se cierra', async () => {
    const W_op = el => frame.contentWindow.getComputedStyle(el).opacity;
    reset(); R.io.present(); await sleep(40);
    const ov = D.getElementById('present-overlay');
    assert(ov && ov.querySelector('iframe'), 'no se creó la capa de presentación');
    ov.querySelector('#present-close').click(); await sleep(20);
    assert(!D.getElementById('present-overlay'), 'la capa no se cerró');
    // Esc inside the slides, without full screen: out (the overview first, if it is open).
    R.store.commit(() => { slide().notes = 'Mis notas'; }); R.io.present({ fullscreen: false }); await sleep(40);
    const f = D.querySelector('#present-overlay iframe'); let Rv = null;
    for (let i = 0; i < 80 && !(Rv = f.contentWindow?.Reveal)?.isReady?.(); i++) await sleep(50);
    const bar = D.getElementById('present-bar');
    assert(bar.querySelector('#present-notes'), 'la vista del moderador, a mano (no solo la tecla S)');
    eq(W_op(bar), '0', 'mientras se presenta, la barra no se ve');
    await sleep(250); f.contentWindow.dispatchEvent(new f.contentWindow.MouseEvent('mousemove', { clientX: f.contentWindow.innerWidth - 40, clientY: 30 })); await sleep(20);
    assert(bar.classList.contains('show'), 'con el puntero en la esquina de arriba a la derecha, aparece');
    // (reveal.js's speaker view, in the interface's language.)
    let opened = 0; const np = Rv.getPlugin('notes'), open0 = np.open; np.open = () => { opened++; };
    D.querySelector('#present-notes').click(); np.open = open0; eq(opened, 1, 'el botón abre la vista del moderador');
    // (reveal.js's speaker view speaks English: its words, in the interface's language.)
    const PS = await frame.contentWindow.eval("import('/src/ui/shell/present.js')"), sv = D.createElement('iframe'); D.body.appendChild(sv);
    sv.contentDocument.write('<title>reveal.js - Speaker View</title><div id="upcoming-slide"><span>Upcoming</span></div><h4>Time <span>Click to Reset</span></h4><h4>Notes</h4><label>Layout: Default</label>'); sv.contentDocument.close();
    PS.translateSpeakerView(sv.contentWindow); await sleep(500);
    const txt = sv.contentDocument.body.textContent;
    assert(sv.contentDocument.title === 'Vista del moderador' && /Siguiente/.test(txt) && /Notas/.test(txt) && /Disposición: Predeterminada/.test(txt) && !/Upcoming|Layout/.test(txt), 'la vista del moderador, en español: ' + txt);
    sv.remove();
    const esc = () => f.contentWindow.document.dispatchEvent(new f.contentWindow.KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
    Rv.toggleOverview(true); await sleep(50); esc(); await sleep(80);
    assert(D.getElementById('present-overlay'), 'con la vista general abierta, Esc es de reveal.js (la cierra), no sale');
    Rv.toggleOverview(false); await sleep(50); esc(); await sleep(80);
    assert(!D.getElementById('present-overlay'), 'y luego sale de la presentación');
  });

  await test('emitir en directo: cada cambio de diapositiva, paso y puntero va a la sala; al salir, se acaba', async () => {
    reset(); const W = frame.contentWindow, Real = W.WebSocket, sent = [], socks = [];
    W.WebSocket = class { constructor(u) { this.url = u; this.readyState = 1; socks.push(this); setTimeout(() => this.onopen?.(), 5); } send(m) { sent.push(JSON.parse(m)); } close() { this.closed = true; } };
    try {
      R.blocks.addText(); R.store.commit(() => { R.state.deck.slides.push({ id: 'live2', blocks: [], background: null }); });
      R.io.present({ fullscreen: false, live: { room: 'sala-de-prueba-1234', token: 'secreto' } });
      let Rv = null; for (let i = 0; i < 60 && !Rv?.isReady?.(); i++) { await sleep(100); Rv = D.querySelector('#present-overlay iframe')?.contentWindow?.Reveal; }
      await sleep(300);
      assert(socks[0] && /\/api\/live\/sala-de-prueba-1234\?token=secreto$/.test(socks[0].url) && /^wss?:/.test(socks[0].url), 'se conecta a su sala, con su token');
      assert(D.getElementById('live-badge'), 'se ve «En directo»');
      Rv.next(); await sleep(100);
      assert(sent.some(m => m.t === 'go' && m.h === 1), 'al pasar de diapositiva, la sala lo sabe');
      socks[0].onmessage({ data: JSON.stringify({ t: 'n', n: 1234 }) });
      assert(/1234/.test(D.getElementById('live-badge').textContent), 'cuántos le siguen');
      D.querySelector('#present-close').click(); await sleep(50);
      assert(sent.at(-1)?.t === 'end' && socks[0].closed, 'al salir, la emisión termina');
    } finally { W.WebSocket = Real; D.getElementById('present-overlay')?.querySelector('#present-close')?.click(); }
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

  await test('actividades con nota: ordenar, unir, completar huecos, etiquetar una imagen, clasificar en grupos', async () => {
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
    const sort = { kind: 'sort', pollId: 's1', options: ['Mamíferos: perro, ballena', 'Aves: pingüino; águila'] };
    const sp = P.publicActivity(sort); eq(sp.cats.join(), 'Mamíferos,Aves', 'clasificar: los grupos');
    eq(sp.items.map(x => x.t).sort().join(), 'ballena,perro,pingüino,águila', 'y todos los elementos (desordenados), sin decir de qué grupo es cada uno');
    assert(!JSON.stringify(sp.items).includes('Mam'), 'lo público no lleva las respuestas');
    eq(P.gradeActivity(sort, ['mamiferos', 'Aves', 'Aves', '']).score, 0.5, 'clasificar: cada elemento en su grupo cuenta (sin tildes ni mayúsculas); en blanco no');
    assert(/perro → Mamíferos/.test(P.pollResultsHTML(sort, { ...P.tallyVotes(sort, { a: { a: ['Mamíferos', 'Mamíferos', 'Aves', 'Aves'] } }), revealed: true })), 'clasificar: las soluciones, «elemento → grupo»');
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

  // The grid games: a crossword, a word search and a memory game.
  const CW = { kind: 'crossword', pollId: 'cw1', question: 'Planetas', options: ['Marte = El planeta rojo', 'Tierra = Nuestro planeta', 'Sol = La estrella', 'Año = 365 días'] };
  const WS = { kind: 'wordsearch', pollId: 'ws1', question: 'Animales', options: ['Gato', 'Perro', 'Araña = Tiene ocho patas'] };
  const MM = { kind: 'memory', pollId: 'mm1', question: 'Elementos', options: ['H = Hidrógeno', 'O = Oxígeno', 'C = Carbono'] };
  const squares = full => { const sq = {}; full.words.forEach(w => { for (let k = 0; k < w.len; k++) { const key = (w.x + (w.d ? 0 : k)) + ',' + (w.y + (w.d ? k : 0)); if (sq[key] && sq[key] !== w.word[k]) throw new Error('dos letras en ' + key); sq[key] = w.word[k]; } }); return sq; };
  const lineOf = (g, q) => { const n = Math.max(Math.abs(q[2] - q[0]), Math.abs(q[3] - q[1])), sx = Math.sign(q[2] - q[0]), sy = Math.sign(q[3] - q[1]); let s = ''; for (let k = 0; k <= n; k++) s += g.grid[(q[1] + sy * k) * g.w + q[0] + sx * k]; return s; };

  await test('crucigrama, sopa de letras y memoria: se montan solos, a los móviles sin las respuestas, y se corrigen', async () => {
    reset(); const W = frame.contentWindow, P = await W.eval("import('/src/features/live/poll.js')");
    // Crossword: a real grid (one letter a square, words crossing), the phones without the words.
    const pub = P.publicActivity(CW), full = P.publicActivity(CW, true), sq = squares(full);
    eq(JSON.stringify(P.publicActivity(CW)), JSON.stringify(pub), 'crucigrama: siempre la misma cuadrícula (al reconectar, en cada móvil)');
    eq(pub.words.length, 4, 'una entrada por palabra'); assert(pub.words.every(w => w.n > 0 && w.len > 1 && w.clue && !('word' in w)), 'con su número, su largo y su pista');
    assert(!/marte|tierra|\bsol\b|año|"word"/i.test(JSON.stringify(pub)), 'sin las palabras: ' + JSON.stringify(pub));
    eq(full.words.find(w => w.i === 3).word, 'AÑO', 'la Ñ es una letra (y las tildes no cuentan)');
    assert(Object.keys(sq).length < full.words.reduce((a, w) => a + w.len, 0), 'las palabras se cruzan');
    assert(Object.keys(sq).every(k => { const [x, y] = k.split(',').map(Number); return x >= 0 && y >= 0 && x < full.w && y < full.h; }), 'dentro de la cuadrícula');
    eq(P.gradeActivity(CW, ['marte', 'TIERRA', ' Sol ', 'ano']).score, 1, 'se corrige palabra a palabra, sin mayúsculas ni tildes');
    eq(P.gradeActivity(CW, ['Marte', 'Tierr', '', 'año']).score, 0.5, 'la mitad');
    // A word that crosses none goes apart, after a gap.
    const apart = P.publicActivity({ kind: 'crossword', pollId: 'x', options: ['ABC = a', 'XYZ = b'] }, true);
    eq(Object.keys(squares(apart)).length, 6, 'sin letras en común: aparte'); assert(apart.w * apart.h > 6, 'con un hueco entre ellas');
    // Results: the grid on the screen, the letters only once revealed.
    const r0 = P.tallyVotes(CW, { a: { a: ['Marte', 'Tierra', '', ''], n: 'Ana' } }), hid = P.pollResultsHTML(CW, { ...r0, layout: full, revealed: false }, null, P.pollLabels());
    assert(/<svg/.test(hid) && !/>M<\/text>/.test(hid) && !/Marte/.test(hid), 'en pantalla, la cuadrícula vacía mientras se responde');
    const shown = P.pollResultsHTML(CW, { ...r0, layout: full, revealed: true }, null, P.pollLabels());
    assert(/>M<\/text>/.test(shown) && /El planeta rojo → Marte/.test(shown) && /100 %/.test(shown), 'con un clic: las letras y cuánto acertó cada palabra');

    // Word search: the words across, down or diagonal; the rest, letters of the same words.
    const wp = P.publicActivity(WS), wf = P.publicActivity(WS, true);
    eq(wp.grid.length, wp.w * wp.h, 'una cuadrícula de letras'); assert(!wp.pos, 'sin decir dónde están');
    eq(wp.list.map(x => x.t).join(), 'Gato,Perro,Tiene ocho patas', 'la lista: las palabras, o la pista en su lugar');
    assert(!JSON.stringify(wp.list).includes('Araña'), 'la palabra de una pista, solo escondida');
    eq(wf.pos.map(q => lineOf(wf, q)).join(), 'GATO,PERRO,ARAÑA', 'cada palabra, en línea recta en la cuadrícula');
    assert(wp.grid.every(ch => 'GATOPERÑ'.includes(ch)), 'el relleno, con letras de las mismas palabras: ' + wp.grid.join(''));
    eq(P.gradeActivity(WS, ['OTAG', 'perro']).score, 2 / 3, 'también al revés; cada palabra encontrada cuenta');
    eq(P.gradeActivity(WS, ['GATO', 'GATO', 'GATO', 'PERRO']).score, 1 / 3, 'no más marcas que palabras (marcar todo no sirve)');

    // Memory: both sides to the phone (it's practice), the pairs found and, to break ties, the attempts.
    const mp = P.publicActivity(MM); eq(mp.cards.length + '|' + mp.n, '6|3', 'memoria: dos cartas por pareja');
    const r = P.tallyVotes(MM, { a: { a: ['Hidrógeno', 'Oxígeno', 'Carbono', '9'], n: 'Ana' }, b: { a: ['Hidrógeno', 'Oxígeno', 'Carbono', '5'], n: 'Bea' }, c: { a: ['Hidrógeno', '', '', '7'], n: 'Cris' } });
    eq(r.board.map(x => `${x.n}:${x.pts}:${x.tries}`).join(), 'Bea:1000:5,Ana:1000:9,Cris:333:7', 'con las mismas parejas, gana quien necesitó menos intentos');
    const mh = P.pollResultsHTML(MM, { ...r, revealed: true }, null, P.pollLabels());
    assert(/H ↔ Hidrógeno/.test(mh) && /5 intentos/.test(mh), 'las parejas y los intentos en la clasificación');
    W.localStorage.setItem('revela.poll.mm1', JSON.stringify({ b: { a: ['Hidrógeno', 'Oxígeno', 'Carbono', '5'], n: 'Bea' } }));
    eq(P.votesCSV(MM), 'participante,puntos,aciertos,intentos\n"Bea",1000,100 %,5', 'en CSV, con los intentos'); W.localStorage.removeItem('revela.poll.mm1');
    eq(P.gradeAnswer(MM, ['Hidrogeno', '', '', '3']), 1 / 3, 'nota para la plataforma (LTI, SCORM)');

    // The editor: the three kinds, their help, their options; the slide shows the grid.
    const b = P.addPoll(); await sleep(20);
    const E = await W.eval("import('/src/ui/dialogs/poll.js')"); E.openPollEditor(slide().blocks.find(x => x.id === b.id)); await sleep(10);
    const m = D.getElementById('poll-modal'), kind = m.querySelector('.pl-kind');
    for (const k of ['crossword', 'wordsearch', 'memory']) { kind.value = k; kind.dispatchEvent(new W.Event('change'));
      assert(kind.value === k && !m.querySelector('.pl-opts-l').hidden && m.querySelector('.pl-help').textContent.length > 40, k + ': con sus opciones y su ayuda'); }
    kind.value = 'crossword'; kind.dispatchEvent(new W.Event('change'));
    assert(/PALABRA = pista/.test(m.querySelector('.pl-help').textContent), 'crucigrama: cómo escribirlo');
    m.querySelector('.pl-opts').value = CW.options.join('\n'); m.querySelector('.pl-ok').click(); await sleep(20);
    const g = slide().blocks.find(x => x.id === b.id); eq(g.kind + '|' + g.options.length, 'crossword|4', 'se guarda');
    assert(D.querySelector(`.block[data-id="${b.id}"] .poll-blk svg`), 'la diapositiva muestra la cuadrícula');
    // In the presentation: the screen draws the grid; the phones get only the public part; in classroom mode, the
    // slide sent to the phones carries the polls without their answers.
    const html = R.io.buildHTML();
    assert(/ACT=\['order','match','gaps','label','sort','crossword','wordsearch','memory'\]/.test(html) && /r\.layout=LAY\[p\.pollId\]/.test(html), 'la presentación los juega');
    const bare = new W.Function('GR', 'return ' + html.match(/function bare\(p\)\{.*/)[0])(['quiz', 'crossword', 'wordsearch', 'memory', 'match']);
    eq(JSON.stringify(bare(CW).options), '["= El planeta rojo","= Nuestro planeta","= La estrella","= 365 días"]', 'modo aula: del crucigrama, solo las pistas');
    eq(JSON.stringify(bare(WS).options) + JSON.stringify(bare({ kind: 'match', options: ['a = b'] }).options) + JSON.stringify(bare({ kind: 'quiz', options: ['x'], correct: [0] })), '["Gato","Perro","= Tiene ocho patas"][]{"kind":"quiz","options":["x"]}', 'y de las demás, nada que dé la respuesta');
  });

  await test('crucigrama, sopa de letras y memoria en el móvil (360 px): se juegan con el dedo y se envían', async () => {
    const W = frame.contentWindow, P = await W.eval("import('/src/features/live/poll.js')");
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:360px;height:740px;opacity:0';
    f.src = new URL('../vote.html?test', D.baseURI).href; document.body.appendChild(f);
    let v; for (let i = 0; i < 60 && !(v = f.contentWindow)?.__vote; i++) await sleep(100);
    try {
      const d = f.contentDocument, Q = s => d.querySelector(s), sent = () => v.__sent.filter(m => m.type === 'vote').at(-1);
      const fits = what => assert(d.documentElement.scrollWidth <= 360, what + ': cabe a lo ancho (' + d.documentElement.scrollWidth + ' px)');
      const at = (svg, w, h, x, y) => { const r = svg.getBoundingClientRect(); return { clientX: r.left + (x + 0.5) / w * r.width, clientY: r.top + (y + 0.5) / h * r.height }; };
      // Crossword: each clue's box fills the grid; a tap on a square goes to its word.
      const pub = P.publicActivity(CW), full = P.publicActivity(CW, true);
      v.__vote.onData({ type: 'poll', poll: { pollId: 'cw1', kind: 'crossword', question: 'Planetas', options: [], pub } });
      const inputs = [...d.querySelectorAll('#answers .rv-game input')]; eq(inputs.length, 4, 'crucigrama: una casilla por pista');
      eq(Q('.rv-game svg').getAttribute('dir'), 'ltr', 'la cuadrícula, de izquierda a derecha siempre');
      const typeIn = (w, txt) => { const i = inputs[pub.words.indexOf(w)]; i.value = txt; i.dispatchEvent(new v.Event('input')); };
      const marte = pub.words.find(w => w.i === 0); typeIn(marte, 'marte');
      const letters = () => [...d.querySelectorAll('.rv-game svg text')].map(t => t.textContent).join('');
      assert(['M', 'A', 'R', 'T', 'E'].every(ch => letters().includes(ch)), 'lo escrito sale en la cuadrícula: ' + letters());
      const tierra = pub.words.find(w => w.i === 1), svg = Q('.rv-game svg'), cover = {};
      pub.words.forEach(w => { for (let k = 0; k < w.len; k++) { const key = (w.x + (w.d ? 0 : k)) + ',' + (w.y + (w.d ? k : 0)); cover[key] = (cover[key] || 0) + 1; } });
      const own = [...Array(tierra.len).keys()].map(k => [tierra.x + (tierra.d ? 0 : k), tierra.y + (tierra.d ? k : 0)]).find(([x, y]) => cover[x + ',' + y] === 1);   // (a square of its own)
      const p0 = at(svg, full.w + 0.2, full.h + 0.2, own[0] + 0.1, own[1] + 0.1);
      svg.dispatchEvent(new v.MouseEvent('click', { bubbles: true, ...p0 }));
      eq(d.activeElement, inputs[pub.words.indexOf(tierra)], 'tocar una casilla lleva a su palabra');
      typeIn(tierra, 'Tierra'); typeIn(pub.words.find(w => w.i === 2), 'sol'); typeIn(pub.words.find(w => w.i === 3), 'año');
      fits('crucigrama');
      Q('#send').click();
      eq(JSON.stringify(sent().answer), '["marte","Tierra","sol","año"]', 'envía cada palabra en el orden de las pistas del profesor');
      eq(P.gradeActivity(CW, sent().answer).score, 1, 'y está bien');
      assert(inputs.every(i => i.disabled), 'enviado: ya no se cambia');
      // Word search: drag along a word; tap the first letter and the last; with hints, a line marked is a try.
      const wp = P.publicActivity(WS), wf = P.publicActivity(WS, true);
      v.__vote.onData({ type: 'poll', poll: { pollId: 'ws1', kind: 'wordsearch', question: 'Animales', options: [], pub: wp } });
      const board = Q('.rv-game svg'), PE = (type, x, y) => board.dispatchEvent(new v.PointerEvent(type, { bubbles: true, pointerId: 5, pointerType: 'touch', ...at(board, wp.w, wp.h, x, y) }));
      eq(board.style.touchAction, 'none', 'arrastrar no mueve la página'); assert(Q('.rv-game').hasAttribute('data-prevent-swipe'), 'ni cambia de diapositiva');
      const [g, pe, ar] = wf.pos;
      PE('pointerdown', g[0], g[1]); PE('pointermove', (g[0] + g[2]) / 2, (g[1] + g[3]) / 2); PE('pointerup', g[2], g[3]);
      PE('pointerdown', pe[2], pe[3]); PE('pointerup', pe[2], pe[3]); PE('pointerdown', pe[0], pe[1]); PE('pointerup', pe[0], pe[1]);   // (tapped from the end: read backwards)
      PE('pointerdown', ar[0], ar[1]); PE('pointerup', ar[2], ar[3]);
      assert(/Encontradas: 3 de 3/.test(Q('.rv-game').textContent), 'las tres marcadas: ' + Q('.rv-game').textContent);
      assert([...d.querySelectorAll('.rv-game span')].filter(s => s.style.textDecoration.includes('line-through')).length === 2, 'las palabras de la lista, tachadas');
      fits('sopa de letras');
      Q('#send').click();
      eq(JSON.stringify(sent().answer), '["GATO","ORREP","ARAÑA"]', 'envía lo marcado'); eq(P.gradeActivity(WS, sent().answer).score, 1, 'y está bien');
      // Memory: two cards at a time; a pair stays up; the attempts counted.
      const mp = P.publicActivity(MM);
      v.__vote.onData({ type: 'poll', poll: { pollId: 'mm1', kind: 'memory', question: 'Elementos', options: [], pub: mp } });
      const cards = [...d.querySelectorAll('.rv-game button')]; eq(cards.length, 6, 'memoria: las seis cartas');
      assert(cards.every(c => c.textContent === '?'), 'boca abajo');
      const other = k => mp.cards.findIndex(c => c.k !== k), pairOf = i => mp.cards.findIndex((c, j) => j !== i && c.k === mp.cards[i].k);
      cards[0].click(); cards[other(mp.cards[0].k)].click(); await sleep(1000);
      assert(cards.every(c => c.textContent === '?'), 'sin pareja: se vuelven a tapar');
      for (let i = 0; i < 6; i++) if (cards[i].textContent === '?') { cards[i].click(); cards[pairOf(i)].click(); }
      assert(/Parejas: 3 de 3 · Intentos: 4/.test(Q('.rv-game').textContent), 'todas, en 4 intentos: ' + Q('.rv-game').textContent);
      fits('memoria');
      Q('#send').click();
      eq(JSON.stringify(sent().answer), '["Hidrógeno","Oxígeno","Carbono","4"]', 'envía las parejas y los intentos');
      eq(P.tallyVotes(MM, { me: { a: sent().answer } }).board[0].pts, 1000, 'todo bien');
    } finally { f.remove(); }
  });

  await test('crucigrama, sopa de letras y memoria a su ritmo: se juegan dentro de las diapositivas', async () => {
    reset(); const P = R.poll;
    const own = x => ({ kind: x.kind, question: x.question, options: x.options });     // (each with a pollId of its own)
    P.addPoll(own(CW)); R.slides.addSlide(); P.addPoll(own(MM)); await sleep(10);
    const html = R.io.buildHTML(R.state.deck, { selfPaced: true });
    assert(/function activityGame/.test(html), 'con los juegos');
    for (const sc of new DOMParser().parseFromString(html, 'text/html').querySelectorAll('script:not([src])')) { try { new Function(sc.textContent); } catch (e) { assert(false, 'código con error: ' + e.message); } }
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.() && w.document.querySelector('.rv-game')); i++) await sleep(100);
    try {
      const [cw, mm] = w.document.querySelectorAll('.rv-poll'), pc = JSON.parse(cw.dataset.poll), pub = R.poll.publicActivity(pc);
      const inputs = [...cw.querySelectorAll('.rv-game input')]; eq(inputs.length, 4, 'el crucigrama, en la diapositiva');
      pub.words.forEach((x, k) => { inputs[k].value = ['Marte', 'Tierra', 'Sol', 'Año'][x.i]; inputs[k].dispatchEvent(new w.Event('input')); });
      cw.querySelector('.rv-self-check').click(); await sleep(30);
      assert(/¡Todo bien!/.test(cw.querySelector('.rv-self-result')?.textContent), 'se corrige en la página: ' + cw.innerHTML.slice(-300));
      assert(inputs.every(i => i.disabled), 'un intento');
      eq(mm.querySelectorAll('.rv-game button').length, 6, 'y la memoria, con sus cartas');
    } finally { f.remove(); }
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
    const qr = C.questionReport();
    eq(qr.map(x => `${x.slide}:${Math.round(x.pct * 100)}`).join(), '1:50,2:100', 'pregunta por pregunta, la que más cuesta primero');
    eq(qr[0].miss.text + '|' + qr[0].miss.count, 'Roma|1', 'con el error más repetido (la opción mal elegida)');
    D.querySelector('[data-action="classroom-results"]').click(); await sleep(10);
    eq(D.querySelectorAll('#class-modal .cr-table tbody tr').length, 2, 'en una tabla');
    assert(/Error más repetido: «Roma» \(1\)/.test(D.querySelector('#class-modal .gb-hard')?.textContent || ''), 'y se ve en «Resultados del aula»'); D.querySelector('#class-modal .modal-close').click();
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
    // With Morph and "zoom in on arrival": it goes back while travelling, and zooms in once there (not at once)
    const cur5 = mk('m1', 'data-motion="zoom"'); cur5.setAttribute('data-auto-animate', ''); prev.setAttribute('data-auto-animate', '');   // (reveal.js morphs only between two marked slides)
    D.body.appendChild(cur5); prev.firstChild.st.spin = 0.5;
    api.enter(cur5, api.handoff(prev, cur5)); await sleep(200);
    assert(/ 300%$/.test(cur5.firstChild.st.orbit), 'mientras viaja, la cámara se aleja (se hace pequeño): ' + cur5.firstChild.st.orbit);
    await sleep(1100);
    assert(/deg auto$/.test(cur5.firstChild.st.orbit), 'y al llegar, se acerca: ' + cur5.firstChild.st.orbit);
    const cur6 = mk('m1', 'data-motion="orbit" data-arrive="front"'); cur6.setAttribute('data-auto-animate', ''); D.body.appendChild(cur6);
    api.enter(cur6, api.handoff(prev, cur6)); await sleep(700);
    assert(/^0\.0deg 75deg/.test(cur6.firstChild.st.orbit) || /^[0-4]\d?\.\ddeg/.test(cur6.firstChild.st.orbit), 'la vuelta espera: primero llega de frente');
    await sleep(1400); const th = parseFloat(cur6.firstChild.st.orbit); assert(th > 1, 'y después da la vuelta: ' + cur6.firstChild.st.orbit);
    api.stop(cur5.firstChild); api.stop(cur6.firstChild); cur5.remove(); cur6.remove();
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
      eq(acts, 'next,prev,goto,ov,pen,hl,laser,arrow,erase,cc,read,zin,zout,z0,black,white,full,end', 'con lo que tiene sentido al presentar');
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

  await test('modo lectura: el texto de la diapositiva en orden, con las imágenes descritas y la pregunta; tecla R, barra y menú', async () => {
    reset();
    R.store.commit(() => { slide().blocks = [
      { id: 'pic', type: 'image', src: 'data:,', alt: 'Un faro al atardecer', x: 700, y: 200, w: 400, h: 300, rotation: 0, animation: null },
      { id: 'lst', type: 'text', html: '<ul><li>Primero</li><li>Segundo<ul><li>Detalle</li></ul></li></ul>', fontSize: 28, x: 80, y: 200, w: 560, h: 300, rotation: 0, animation: null },
      { id: 'ttl', type: 'text', html: 'El <i>faro</i> de Hércules', fontSize: 54, x: 80, y: 40, w: 1000, h: 100, rotation: 0, animation: null },
      { id: 'pl', type: 'poll', pollId: 'p1', kind: 'choice', question: '¿Lo has visitado?', options: ['Sí', 'No'], x: 80, y: 560, w: 900, h: 140, rotation: 0, animation: null }]; });
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:900px;height:506px;opacity:0';
    f.src = URL.createObjectURL(new Blob([R.io.buildHTML(R.state.deck, { inApp: true })], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.() && w.rvReading); i++) await sleep(100);
    try {
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'r', bubbles: true }));
      const box = w.document.getElementById('rv-read'); assert(box?.classList.contains('on'), 'R abre el modo lectura');
      const txt = box.querySelector('.rv-rt').innerText.replace(/\s+/g, ' ');
      assert(/^El faro de Hércules Primero Segundo Detalle .*Un faro al atardecer.*¿Lo has visitado\? Sí No$/.test(txt), 'en orden de lectura (arriba abajo, izquierda derecha), sin cursivas: ' + txt);
      assert(box.querySelector('h2')?.textContent === 'El faro de Hércules' && box.querySelectorAll('li.l2').length === 1, 'el título como título; la lista con su nivel');
      assert(w.getComputedStyle(box).fontFamily.includes('Verdana') && parseFloat(w.getComputedStyle(box).wordSpacing) > 0, 'letra clara y espaciada');
      box.querySelector('[data-r="lg"]').click(); assert(box.style.getPropertyValue('--rv-rs') === '24px', 'letra más grande');
      box.querySelector('[data-r="x"]').click(); assert(!box.classList.contains('on'), 'se cierra');
      w.document.querySelector('#ink-bar [data-t="read"]').click(); assert(box.classList.contains('on'), 'también desde la barra');
    } finally { f.remove(); }
    // The students' page parses the slide it receives: the same words.
    const RD = await frame.contentWindow.eval("import('/src/io/runtime/reading.js')");
    const doc = new DOMParser().parseFromString('<div class="slides"><section class="present"><p style="left:10px;top:300px;position:absolute">Abajo</p><h1 style="left:10px;top:20px;position:absolute;font-size:60px">Arriba</h1><div class="fragment" style="top:400px">Aún no</div></section></div>', 'text/html');
    const it = RD.readingItems(doc.querySelector('section'));
    eq(it.map(x => x.t + ':' + x.text).join('|'), 'h:Arriba|p:Abajo', 'página del alumnado: en orden y sin lo que aún no ha salido');
  });

  await test('3D al presentar: con transiciones, al volver, al saltar, y sus imágenes donde no se dibuja', async () => {
    reset(); const W = frame.contentWindow, M = await W.eval("import('/src/io/runtime/model3d.js')");
    // (In the page first: model-viewer takes over its element then, and the stand-ins go on top.)
    const mk = (extra = '', loaded = true) => { const s = D.createElement('section'); s.innerHTML = `<model-viewer data-id="m1" src="a.glb" camera-orbit="0deg 75deg auto" ${extra}></model-viewer>`;
      D.body.appendChild(s); const mv = s.firstChild, st = { orbit: null, log: [], name: '' }, c = { configurable: true };
      Object.defineProperties(mv, { loaded: { value: loaded, ...c }, turntableRotation: { value: 0, ...c }, cameraOrbit: { set: v => { st.orbit = v; }, get: () => st.orbit, ...c },
        availableAnimations: { value: ['Idle', 'Walk', 'Wave'], ...c }, animationName: { get: () => st.name, set: v => { st.name = v; }, ...c }, updateComplete: { value: null, writable: true, ...c } });
      mv.getCameraOrbit = () => ({ theta: 0.5, phi: 1.2 }); mv.resetTurntableRotation = () => {}; mv.jumpCameraToGoal = () => {};
      mv.play = o => st.log.push(st.name + (o ? ' una vez' : '')); mv.pause = () => st.log.push('pausa'); mv.st = st; return s; };
    const api = M.model3dRuntime(), prev = mk(), cur = mk('data-arrive="front" auto-rotate');
    try {
      // Arriving "facing the audience" stops its turning there; reached another way, it turns again.
      api.enter(cur, api.handoff(prev, cur), prev); await sleep(1600);
      assert(!cur.firstChild.hasAttribute('auto-rotate'), 'llega de frente y deja de girar');
      api.enter(cur, new Map(), null);
      assert(cur.firstChild.hasAttribute('auto-rotate'), 'al volver a ella sin venir de la anterior, gira otra vez');
      // A new clip name is applied by model-viewer on its next update: "once" is asked for after it.
      const mv = cur.firstChild; let done; mv.updateComplete = new Promise(r => { done = r; });
      api.clip(mv, 'Wave', true); eq(mv.st.log.length, 0, 'espera a que el visor cambie de animación');
      done(); await sleep(0); eq(mv.st.log.at(-1), 'Wave una vez', 'y la pide una sola vez (si no, se repetía sin fin)');
      mv.updateComplete = null;
      // Walking that ends where a step "after the previous" plays its clip (a wave): the arrival doesn't undo it.
      mv.setAttribute('data-move-clip', 'Walk'); mv.st.log.length = 0;
      const step = D.createElement('div'); step.className = 'fragment'; step.setAttribute('data-clip', 'Wave'); step.setAttribute('data-clip-once', ''); step.style.setProperty('--anim-del', '50ms');
      cur.appendChild(step); step.appendChild(mv);
      // (as reveal.js's fragmentshown would: the wave comes 50 ms in, before the walk is over)
      api.move(mv, 120, mv); api.step(step, true);
      await sleep(250);
      eq(mv.st.log.join(), 'Walk,Wave una vez', 'anda, saluda, y la llegada no le quita el saludo');
      // A slide that was marked for Morph only because of the next one: with a real transition, its model waits for it.
      const a = mk('data-motion="orbit"', true), b2 = mk(); a.setAttribute('data-auto-animate', ''); a.setAttribute('data-transition', 'fade');
      a.firstChild.st.orbit = 'x'; api.enter(a, new Map(), b2); await sleep(100);
      eq(a.firstChild.st.orbit, 'x', 'sin Transformar de verdad (la otra no lo tiene), espera a que acabe la transición');
      api.stop(a.firstChild); a.remove(); b2.remove();
      // Not loaded yet: the movement waits for it (not seen half over).
      const c = mk('data-motion="orbit"', false); api.start(c.firstChild); await sleep(80);
      eq(c.firstChild.st.orbit, null, 'sin cargar, aún no se mueve');
      Object.defineProperty(c.firstChild, 'loaded', { value: true }); c.firstChild.dispatchEvent(new W.Event('load')); await sleep(80);
      assert(/deg 75deg/.test(c.firstChild.st.orbit || ''), 'y al cargar, empieza');
      api.stop(c.firstChild); c.remove();
      // Floating doesn't take away its turn (its transform).
      const fl = mk('data-motion="float"'), fm = fl.firstChild; fm.style.transform = 'rotate(20deg)'; api.start(fm); await sleep(60);
      assert(fm.style.transform === 'rotate(20deg)' && /px$/.test(fm.style.marginTop), 'flota sin perder su giro');
      api.stop(fm); eq(fm.style.transform, 'rotate(20deg)', 'y al parar, sigue girado'); fl.remove();
    } finally { api.stop(cur.firstChild); prev.remove(); cur.remove(); }
    // Its picture in the page: while it loads, in the overview, and as a slide image; dropped in PowerPoint as a picture.
    R.store.commit(() => { slide().blocks.push({ id: 'mp', type: 'model', src: 'data:model/gltf-binary;base64,Z2xURg==', poster: 'icons/icon-192.png', x: 100, y: 100, w: 300, h: 200, clip: 'Wave', rotation: 0, animation: null }); });
    const html = R.io.buildHTML(), tag = html.match(/<model-viewer[^>]*>/)[0];
    assert(/data-poster="https?:\/\/[^"]+\/icons\/icon-192\.png"/.test(tag), 'su imagen, con dirección completa: ' + tag.slice(0, 200));
    R.store.commit(() => { slide().blocks.at(-1).poster = 'javascript:alert(1)'; });
    assert(!/data-poster=/.test(R.io.buildHTML()), 'sin direcciones peligrosas');
    R.store.commit(() => { slide().blocks.at(-1).poster = 'icons/icon-192.png'; });
    const I = await W.eval("import('/src/io/export/images.js')"), host = D.createElement('div');
    host.innerHTML = R.io.buildHTML().match(/<model-viewer[^>]*><\/model-viewer>/)[0]; D.body.appendChild(host);
    await I.hydrateStatic(host, R.state.deck);
    const im = host.querySelector('img'); assert(!host.querySelector('model-viewer') && im && /icon-192/.test(im.src), 'en una imagen de la diapositiva, su imagen');
    assert(Math.abs(parseFloat(im.style.width) - 100 / 1.5) < 0.1, 'en la caja del modelo, no en su margen'); host.remove();
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob);
    assert(/<p:pic>/.test(await zip.file('ppt/slides/slide1.xml').async('string')), 'en PowerPoint, su imagen (también si es una dirección, no solo incrustada)');
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
    assert(/revelaslides\.com\/app\/vote[?"']/.test(html), 'enlace de voto absoluto (funciona también desde un archivo)');
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

  await test('tipos de votación nuevos: respuesta abierta, número, imágenes, punto de una imagen y ordenar por preferencia', async () => {
    const P = await frame.contentWindow.eval("import('/src/features/live/poll.js')");
    // Counted, and drawn.
    let r = P.tallyVotes({ kind: 'open' }, { a: { t: 'Primera', time: 1 }, b: { t: 'Segunda <b>', time: 2 }, c: null });
    eq(r.voters + '|' + r.texts.map(x => x.text).join(), '2|Segunda <b>,Primera', 'abierta: las más recientes primero');
    assert(/Segunda &lt;b&gt;/.test(P.pollResultsHTML({ kind: 'open' }, r, null, null)), 'abierta: en un muro, escapada');
    r = P.tallyVotes({ kind: 'number', min: 0, max: 100 }, { a: 10, b: 20, c: 90, d: 'x' });
    eq(r.voters + '|' + r.average + '|' + r.median + '|' + r.counts.join(''), '3|40|20|0110000001', 'número: media, mediana y reparto en diez tramos');
    assert(/Media[\s\S]*40[\s\S]*Respuesta[\s\S]*25/.test(P.pollResultsHTML({ kind: 'number', min: 0, max: 100, answer: 25 }, r, null, null)), 'número: con la respuesta correcta');
    r = P.tallyVotes({ kind: 'rank', options: ['A', 'B', 'C'] }, { a: [2, 0, 1], b: [2, 1, 0] });
    eq(r.counts.join(), '3,3,6', 'preferencia: recuento de Borda');
    assert(/^[\s\S]*?1\.<\/b><div[^>]*>C</.test(P.pollResultsHTML({ kind: 'rank', options: ['A', 'B', 'C'] }, r, null, null)), 'preferencia: la ganadora la primera');
    r = P.tallyVotes({ kind: 'point' }, { a: { x: 10, y: 20 }, b: { x: 'n' } }); eq(r.points.length, 1, 'punto: los válidos');
    r = P.tallyVotes({ kind: 'image', options: ['Gato', 'Perro'] }, { a: 1, b: 1, c: 0 }); eq(r.counts.join(), '1,2', 'imágenes: como una elección');
    assert(/<img src="data:image\/gif;base64,AAA"/.test(P.pollResultsHTML({ kind: 'image', options: ['Gato', 'Perro'], images: ['', 'data:image/gif;base64,AAA'] }, r, null, null)), 'imágenes: con sus imágenes');
    // On the phone.
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:700px;opacity:0';
    f.src = new URL('../vote.html?test', D.baseURI).href; document.body.appendChild(f);
    let v; for (let i = 0; i < 60 && !(v = f.contentWindow)?.__vote; i++) await sleep(100);
    try {
      const Q = s => f.contentDocument.querySelector(s), sent = () => v.__sent.filter(m => m.type === 'vote').at(-1);
      v.__vote.onData({ type: 'poll', poll: { pollId: 'n1', kind: 'number', question: '¿Cuántos?', options: [], min: 0, max: 50, unit: 'kg' } });
      const num = Q('#answers input[type=number]'); num.value = '33'; num.dispatchEvent(new v.Event('input')); Q('#send').click();
      eq(sent().answer, 33, 'número: el que escribe'); eq(+Q('#answers input[type=range]').value, 33, 'y el deslizador lo sigue');
      v.__vote.onData({ type: 'poll', poll: { pollId: 'r1', kind: 'rank', question: 'Prefiere', options: ['X', 'Y', 'Z'] } });
      f.contentDocument.querySelectorAll('.act-row button')[1].click(); Q('#send').click();
      eq(JSON.stringify(sent().answer), '[1,0,2]', 'preferencia: el orden elegido, por posiciones');
      v.__vote.onData({ type: 'poll', poll: { pollId: 'o1', kind: 'open', question: 'Cuenta', options: [] } });
      Q('#answers textarea').value = ' Mi idea '; Q('#answers textarea').dispatchEvent(new v.Event('input')); Q('#send').click();
      eq(sent().answer, 'Mi idea', 'abierta: su texto');
      v.__vote.onData({ type: 'poll', poll: { pollId: 'i1', kind: 'image', question: 'Elige', options: ['Gato', 'Perro'], images: ['data:image/gif;base64,R0lGODlhAQABAAAAACw=', ''] } });
      eq(f.contentDocument.querySelectorAll('#answers img').length, 1, 'imágenes: con su imagen');
      f.contentDocument.querySelectorAll('#answers .opt')[1].click(); Q('#send').click(); eq(sent().answer, 1, 'imágenes: la elegida');
      v.__vote.onData({ type: 'poll', poll: { pollId: 'p1', kind: 'point', question: '¿Dónde?', options: [], image: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' } });
      const pic = Q('#answers .act-pic'); pic.style.cssText = 'width:200px;height:100px'; Q('#answers .act-pic img').style.cssText = 'width:200px;height:100px';
      const rc = pic.getBoundingClientRect(); pic.dispatchEvent(new v.MouseEvent('click', { bubbles: true, clientX: rc.left + 50, clientY: rc.top + 75 })); Q('#send').click();
      eq(Math.round(sent().answer.x) + ',' + Math.round(sent().answer.y), '25,75', 'punto: dónde tocó, en % de la imagen');
      // Drawing with the finger.
      v.__vote.onData({ type: 'poll', poll: { pollId: 'd1', kind: 'draw', question: 'Dibuja', options: [] } });
      const cv = Q('#answers canvas'), cr = cv.getBoundingClientRect(), PE = (type, x, y) => cv.dispatchEvent(new v.PointerEvent(type, { bubbles: true, pointerId: 3, clientX: cr.left + x, clientY: cr.top + y }));
      PE('pointerdown', 10, 10); PE('pointermove', 60, 40); PE('pointermove', 90, 70); PE('pointerup', 90, 70); Q('#send').click();
      assert(/^data:image\/png;base64,/.test(sent().answer.img), 'dibujo: se envía el dibujo');
      // Teams and confidence: the team first, then the answer and how sure.
      v.__vote.onData({ type: 'poll', poll: { pollId: 'q7', kind: 'quiz', question: '¿?', options: ['a', 'b'], mode: 'confidence', teams: ['Rojo', 'Azul'], left: 20 } });
      [...f.contentDocument.querySelectorAll('#answers .opt')].find(x => x.textContent === 'Azul').click();
      eq(v.__sent.filter(m => m.type === 'hi').at(-1)?.team, 'Azul', 'equipos: elige el suyo');
      f.contentDocument.querySelectorAll('#answers .quiz-opt')[1].click();
      [...f.contentDocument.querySelectorAll('#answers button')].find(x => /seguro/.test(x.textContent)).click();
      eq(sent().answer + '|' + sent().sure, '1|true', 'confianza: su respuesta y lo seguro que está');
      v.__vote.onData({ type: 'stars', stars: 7, level: 2 }); eq(Q('#stars')?.textContent, '⭐ 7 · Nivel 2', 'sus estrellas y su nivel');
      v.__vote.onData({ type: 'poll', poll: { pollId: 'o5', kind: 'open', question: 'Q', options: [] } });
      v.__vote.onData({ type: 'feedback', pollId: 'o5', score: 8, text: 'Muy bien' }); assert(/8\/10[\s\S]*Muy bien/.test(Q('#answers .fb')?.textContent || ''), 'la nota de la IA y su comentario');
      v.__vote.onData({ type: 'picked' }); assert(!Q('#picked').hidden, '«te ha tocado»');
      // My summary: what I answered and how it went.
      assert(!Q('#mine').hidden, 'el resumen se ofrece al responder');
      let saved = null; const realURL = v.URL.createObjectURL; v.URL.createObjectURL = blob => { saved = blob; return 'blob:x'; };
      Q('#mine').click(); v.URL.createObjectURL = realURL;
      const txt = await saved.text();
      assert(/Mi resumen/.test(txt) && /¿Cuántos\?/.test(txt) && /33 kg/.test(txt) && /<img src="data:image\/png/.test(txt), 'mi resumen: las preguntas, mis respuestas (y mi dibujo)');
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

  // ---- Phone remote: touchpad, pairing and security ----------------------------------
  // A stand-in for PeerJS: peers by id; connections and messages arrive a moment
  // later, as over WebRTC, and messages are copies (JSON), as over the wire.
  const fakeBroker = () => {
    const peers = new Map(), later = f => setTimeout(f, 0);
    const emitter = o => { o.h = {}; o.on = (e, f) => { (o.h[e] = o.h[e] || []).push(f); return o; }; o.emit = (e, ...a) => (o.h[e] || []).forEach(f => f(...a)); return o; };
    class Peer {
      constructor(id) { emitter(this); this.id = id || 'anon-' + Math.random().toString(36).slice(2); peers.set(this.id, this); later(() => this.emit('open', this.id)); }
      connect(id) {
        const a = emitter({ open: false }), b = emitter({ open: false });
        const link = (x, y) => {
          x.send = d => { if (!x.open) return; const c = JSON.parse(JSON.stringify(d)); later(() => y.open && y.emit('data', c)); };
          x.close = () => { if (!x.open) return; x.open = y.open = false; later(() => { x.emit('close'); y.emit('close'); }); };
        };
        link(a, b); link(b, a);
        later(() => {
          const to = peers.get(id);
          if (!to) { this.emit('error', { type: 'peer-unavailable' }); return; }
          to.emit('connection', b); a.open = b.open = true; later(() => { a.emit('open'); b.emit('open'); });
        });
        return a;
      }
      destroy() { peers.delete(this.id); }
    }
    return { Peer };
  };
  // An exported presentation in a frame of this page; → its window once reveal.js is ready.
  const deckFrame = async (html, w = 800, h = 600) => {
    const f = document.createElement('iframe'); f.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;opacity:0;border:0`;
    f.srcdoc = html; document.body.appendChild(f);
    let win; for (let i = 0; i < 100 && !((win = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    return { f, win, doc: f.contentDocument };
  };
  const near = (a, b, msg, tol = 1.5) => assert(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b}`);
  // Something absolutely placed on the current slide, in slide pixels.
  const put = (win, tag, x, y, w, h, css = '') => {
    const el = win.document.createElement(tag); el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${css}`;
    win.Reveal.getCurrentSlide().querySelector('.stage').appendChild(el); return el;
  };

  await test('3D entre diapositivas: activo desde que se abre (precarga la siguiente) y sin un fotograma con la vista por defecto al cambiar', async () => {
    const d = await R.examples.loadExample('product_car', 'es'); R.store.replaceDeck(d); await sleep(30);
    const { f, win, doc } = await deckFrame(R.io.buildHTML(), 1280, 720);
    try {
      win.Reveal.configure({ hash: false, history: false });
      const mvs = () => [...doc.querySelectorAll('model-viewer')];
      for (let i = 0; i < 40 && !mvs()[0].__rv; i++) await sleep(50);
      assert(mvs().every(m => m.__rv), 'el 3D se activa al abrir la presentación (no en el primer cambio)');
      eq(mvs()[1].getAttribute('loading'), 'eager', 'el modelo de la siguiente se carga por adelantado');
      for (let i = 0; i < 150 && !mvs().slice(0, 2).every(m => m.loaded); i++) await sleep(100);
      let bridged = null; win.Reveal.on('slidechanged', e => { bridged = e.currentSlide.querySelector('model-viewer .rv-bridge'); });
      win.Reveal.next(); await sleep(20);
      assert(bridged && bridged.width > 0, 'en el cambio, encima, el último fotograma del de antes (no la vista por defecto que guardaba)');
      for (let i = 0; i < 20 && bridged.isConnected; i++) await sleep(50);
      assert(!bridged.isConnected, 'y se quita en cuanto el nuevo se ha dibujado');
    } finally { f.remove(); }
  });

  await test('mando: las coordenadas del móvil caen en la diapositiva (franjas, otra proporción, zoom)', async () => {
    reset(); const W = frame.contentWindow, P = await W.eval("import('/src/features/live/remotepad.js')");
    const { f, win, doc } = await deckFrame(R.io.buildHTML(), 800, 600);
    try {
      const stage = () => win.Reveal.getCurrentSlide().querySelector('.stage').getBoundingClientRect();
      let r = stage();
      assert(r.top > 20 && Math.abs(r.left) < 2, 'pantalla 4:3 → franjas arriba y abajo');
      near(P.toClient(doc, 0, 0).x, r.left, 'esquina izquierda'); near(P.toClient(doc, 0, 0).y, r.top, 'esquina superior');
      near(P.toClient(doc, 1, 1).x, r.right, 'esquina derecha'); near(P.toClient(doc, 1, 1).y, r.bottom, 'esquina inferior');
      f.style.width = '1000px'; f.style.height = '300px'; win.dispatchEvent(new win.Event('resize')); await sleep(250);
      r = stage();
      assert(r.left > 20, 'pantalla muy ancha → franjas a los lados');
      near(P.toClient(doc, 0.5, 0.25).x, r.left + r.width / 2, 'otra proporción: x'); near(P.toClient(doc, 0.5, 0.25).y, r.top + r.height / 4, 'otra proporción: y');
      // Zoomed in (the presentation's own zoom): the same slide point is found where it now is.
      const btn = put(win, 'button', 100, 100, 200, 100); let hits = 0; btn.addEventListener('click', () => hits++);
      const W2 = R.state.deck.size.w, H2 = R.state.deck.size.h, bx = 200 / W2, by = 150 / H2;
      P.zoomBy(doc, bx, by, 2); await sleep(20);
      near(P.zoomLevel(doc), 2, 'ampliado ×2', 0.01);
      const b = btn.getBoundingClientRect(), c = P.toClient(doc, bx, by);
      near(c.x, b.left + b.width / 2, 'con zoom: x del botón'); near(c.y, b.top + b.height / 2, 'con zoom: y del botón');
      P.tap(doc, bx, by); eq(hits, 1, 'con zoom, tocar el botón lo pulsa');
      P.zoomReset(doc); near(P.zoomLevel(doc), 1, 'doble toque: tamaño normal', 0.01);
    } finally { f.remove(); }
  });

  await test('mando: foco, láser, flecha y lupa se dibujan y se quitan en la presentación', async () => {
    reset(); const W = frame.contentWindow, P = await W.eval("import('/src/features/live/remotepad.js')");
    const { f, doc } = await deckFrame(R.io.buildHTML(), 800, 450);
    try {
      const vis = id => { const el = doc.getElementById(id); return !!el && el.style.display !== 'none'; };
      P.point(doc, 'spot', 0.5, 0.5, 0.1);
      assert(vis('__rv-spot'), 'el foco aparece');
      const bg = doc.getElementById('__rv-spot').style.background;
      assert(/radial-gradient/.test(bg) && /400(\.0)?px 225(\.0)?px/.test(bg) && /80(\.0)?px/.test(bg), 'oscurece todo salvo un círculo en el punto (radio = 10 % del ancho): ' + bg);
      P.point(doc, 'spot', 0.5, 0.5, 0.2);
      assert(/160(\.0)?px/.test(doc.getElementById('__rv-spot').style.background), 'el radio sigue a la presión');
      P.pointOff(doc); assert(!vis('__rv-spot'), 'al levantar el dedo se quita');
      P.point(doc, 'laser', 0.25, 0.25); P.point(doc, 'laser', 0.3, 0.3);
      assert(vis('__laser') && doc.getElementById('__laser-trail'), 'láser con estela');
      P.point(doc, 'arrow', 0.1, 0.1);
      assert(vis('__rv-arrow') && !vis('__laser'), 'la flecha sustituye al láser');
      P.pointOff(doc); assert(vis('__rv-arrow'), 'la flecha se queda donde se dejó');
      P.point(doc, 'lens', 0.5, 0.5, 0.15);
      assert(vis('__rv-lens') && doc.getElementById('__rv-lens').querySelector('.stage'), 'la lupa muestra la diapositiva ampliada');
      P.clearAll(doc); assert(!vis('__rv-arrow') && !vis('__rv-lens'), 'cambiar de herramienta lo quita todo');
      P.black(doc, true); assert(vis('__black'), 'pantalla negra'); P.black(doc, false); assert(!vis('__black'), 'sin pantalla negra');
    } finally { f.remove(); }
  });

  await test('mando: tocar, arrastrar y desplazar con dos dedos llegan al elemento correcto', async () => {
    reset(); const W = frame.contentWindow, P = await W.eval("import('/src/features/live/remotepad.js')");
    const { f, win, doc } = await deckFrame(R.io.buildHTML(), 800, 450);
    try {
      const { w: SW, h: SH } = R.state.deck.size, at = (x, y) => [x / SW, y / SH];
      const btn = put(win, 'button', 100, 100, 200, 100), other = put(win, 'button', 320, 100, 100, 100);
      const log = []; btn.addEventListener('click', () => log.push('btn')); other.addEventListener('click', () => log.push('other'));
      P.tap(doc, ...at(200, 150)); eq(log.join(), 'btn', 'tocar pulsa el botón que hay debajo (y no otro)');
      // Scroll a box that scrolls; content follows the fingers (fingers up → further down).
      const box = put(win, 'div', 500, 100, 300, 200, 'overflow:auto'); box.innerHTML = '<div style="height:2000px"></div>';
      const r1 = P.wheel(doc, ...at(650, 200), 0, -0.2);
      assert(r1.scrolled && box.scrollTop > 50, 'dos dedos hacia arriba desplazan la caja hacia abajo: ' + box.scrollTop);
      // Drag: down, moves, up on the element pressed.
      const item = put(win, 'div', 500, 400, 100, 100, 'background:#c00'); const seq = [];
      ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mouseup'].forEach(t => item.addEventListener(t, e => seq.push(t + ':' + Math.round(e.clientX))));
      P.drag(doc, 'start', ...at(550, 450)); P.drag(doc, 'move', ...at(560, 450)); P.drag(doc, 'end', ...at(570, 450));
      const kinds = seq.map(s => s.split(':')[0]);
      assert(kinds[0] === 'pointerdown' && kinds.includes('pointermove') && kinds.includes('pointerup'), 'arrastrar: pulsar, mover, soltar: ' + kinds);
      const xs = seq.filter(s => s.startsWith('pointer')).map(s => +s.split(':')[1]);
      assert(xs[2] > xs[0], 'el movimiento avanza en la pantalla');
      // A web page of this same origin: its button is clicked and it scrolls inside.
      const fr = put(win, 'iframe', 900, 100, 300, 300, 'border:0');
      fr.srcdoc = '<body style="margin:0"><button id=b style="width:120px;height:60px">B</button><div style="height:3000px"></div></body>';
      for (let i = 0; i < 30 && !fr.contentDocument?.getElementById('b'); i++) await sleep(50);
      let inner = 0; fr.contentDocument.getElementById('b').addEventListener('click', () => inner++);
      eq(P.tap(doc, ...at(930, 120)).blocked, false, 'web del mismo origen: se puede tocar');
      eq(inner, 1, 'tocar dentro de la web pulsa su botón');
      const r2 = P.wheel(doc, ...at(1050, 300), 0, -0.3);
      assert(r2.scrolled && fr.contentDocument.scrollingElement.scrollTop > 50, 'la web se desplaza por dentro');
      // A web page of another origin (a sandboxed frame stands in for it): blocked, said so.
      const cross = put(win, 'iframe', 100, 400, 300, 200, 'border:0'); cross.setAttribute('sandbox', 'allow-scripts'); cross.srcdoc = '<div style="height:3000px">x</div>';
      await sleep(150);
      eq(P.tap(doc, ...at(250, 500)).blocked, true, 'web de otro origen: el navegador no deja tocarla');
      const r3 = P.wheel(doc, ...at(250, 500), 0, -0.2);
      assert(r3.blocked && !r3.scrolled, 'ni desplazarla (y se avisa al móvil)');
    } finally { f.remove(); }
  });

  await test('mando: límite de órdenes por segundo', async () => {
    let tm = 0; const lim = R.remote.createLimiter(12, 6, () => tm);
    let ok = 0; for (let i = 0; i < 40; i++) if (lim()) ok++;
    eq(ok, 12, 'una ráfaga pasa hasta el máximo');
    tm = 1000; ok = 0; for (let i = 0; i < 40; i++) if (lim()) ok++;
    eq(ok, 6, 'luego, al ritmo permitido');
  });

  await test('mando: solo manda el móvil emparejado (clave del QR, permiso, uno a la vez, desconectar, límite)', async () => {
    reset(); for (let i = 0; i < 30; i++) R.slides.addSlide(); R.slides.goToSlide(0); R.render();
    const { Peer } = fakeBroker(); let last = null;
    await R.remote.startHost(s => { last = s; }, { Peer }); await sleep(20);
    try {
      const key = new URL(last.link).searchParams.get('k'), code = last.code;
      assert(key && key.length >= 16 && /^[A-Z2-9]{5}$/.test(code), 'el enlace del QR lleva el código y una clave');
      const phone = () => { const c = new Peer().connect('revela-' + code), got = []; c.on('data', d => got.push(d)); return { c, got, has: k => got.some(m => m.kind === k) }; };
      const idx = () => R.state.ui.slideIndex;
      const a = phone(); await sleep(30);
      a.c.send({ type: 'next' }); a.c.send({ type: 'pointer', x: 0.5, y: 0.5 }); await sleep(30);
      eq(idx(), 0, 'sin emparejar, nada de lo que envía cuenta');
      a.c.send({ type: 'hello', key: 'NOESLACLAVE' }); await sleep(30);
      assert(a.has('pending') && last.state === 'request', 'solo con el código: espera el permiso de quien presenta');
      a.c.send({ type: 'next' }); await sleep(30); eq(idx(), 0, 'mientras espera, no manda');
      last.deny(); await sleep(30); assert(a.has('denied'), 'rechazado');
      let b = phone(); await sleep(30); b.c.send({ type: 'hello', key }); await sleep(30);
      assert(b.has('welcome') && last.state === 'connected', 'con la clave del QR entra directamente');
      assert(b.got.some(m => m.kind === 'state'), 'recibe el estado');
      b.c.send({ type: 'next' }); await sleep(30); eq(idx(), 1, 'el móvil emparejado pasa la diapositiva');
      const c = phone(); await sleep(30); c.c.send({ type: 'hello', key }); await sleep(30);
      assert(c.has('busy'), 'otro móvil (aunque tenga la clave): ocupado');
      c.c.send({ type: 'prev' }); await sleep(30); eq(idx(), 1, 'y no manda');
      // The phone in control, coming back after a drop (its own token, not the QR's key): in again at once.
      const resume = b.got.find(m => m.kind === 'welcome')?.resume;
      assert(resume && resume !== key, 'al entrar recibe su propia clave para volver');
      const b2 = phone(); await sleep(30); b2.c.send({ type: 'hello', key: 'OTRA', resume }); await sleep(30);
      assert(b2.has('welcome') && last.state === 'connected', 'vuelve sin pedir permiso aunque la conexión vieja siga abierta');
      b.c.send({ type: 'next' }); await sleep(30); eq(idx(), 1, 'la conexión vieja ya no manda');
      b2.c.send({ type: 'next' }); await sleep(30); eq(idx(), 2, 'la nueva sí');
      R.remote.applyCommand({ type: 'goto', index: 1 }); await sleep(10);
      b = b2;
      // Rate limit: a burst of 30 is cut to the bucket's size.
      for (let i = 0; i < 30; i++) b.c.send({ type: 'next' });
      await sleep(80);
      assert(idx() > 1 && idx() <= 1 + 13, 'una ráfaga de órdenes se recorta: ' + idx());
      const before = idx();
      R.remote.disconnectRemote(); await sleep(30);
      assert(b.has('revoked'), 'quien presenta lo desconecta');
      b.c.send({ type: 'prev' }); await sleep(30); eq(idx(), before, 'desconectado, ya no manda');
      const z = phone(); await sleep(30); z.c.send({ type: 'hello', resume: b.got.find(m => m.kind === 'welcome')?.resume }); await sleep(30);
      assert(!z.has('welcome') && z.has('pending'), 'desconectado por quien presenta, su clave para volver deja de valer (pide permiso)'); last.deny();
      await sleep(350);
      const key2 = new URL(last.link).searchParams.get('k');
      assert(key2 && key2 !== key, 'la clave cambia: el enlace anterior deja de valer');
      await sleep(350);
      const d = phone(); await sleep(30); d.c.send({ type: 'hello', key }); await sleep(30);
      assert(d.has('pending'), 'con la clave vieja hace falta permiso');
      last.allow(); await sleep(30); assert(d.has('welcome'), 'permitido');
      d.c.send({ type: 'prev' }); await sleep(30); eq(idx(), before - 1, 'y entonces manda');
    } finally { R.remote.stopHost(); }
  });

  await test('mando: cerrar «Conectar móvil» no lo desconecta (para presentar a pantalla completa); «Apagar el mando» sí', async () => {
    reset(); const { Peer } = fakeBroker(), W = frame.contentWindow, H = await W.eval("import('/src/ui/dialogs/remote.js')");
    try {
      H.openHostPanel({ Peer }); for (let i = 0; i < 40 && !/[A-Z2-9]{5}/.test(D.querySelector('#host-modal .host-code').textContent); i++) await sleep(25);
      const code = D.querySelector('#host-modal .host-code').textContent;
      D.querySelector('#host-modal .modal-close').click(); await sleep(20);
      assert(!D.getElementById('host-modal') && R.remote.hostRunning(), 'cerrado el diálogo, el mando sigue');
      H.openHostPanel({ Peer }); await sleep(30);
      eq(D.querySelector('#host-modal .host-code').textContent, code, 'al abrirlo otra vez, el mismo código');
      D.querySelector('#host-modal .host-stop').click(); await sleep(20);
      assert(!R.remote.hostRunning() && !D.getElementById('host-modal'), 'apagado');
    } finally { R.remote.stopHost(); D.getElementById('host-modal')?.remove(); }
  });

  await test('mando: una conexión de votación no puede mandar órdenes del mando', async () => {
    reset(); R.poll.addPoll({ question: 'P', options: ['A', 'B'] }); R.slides.addSlide(); R.slides.goToSlide(0);
    // The presentation's own vote host, with a stand-in PeerJS (the real one would go to the internet).
    const fake = URL.createObjectURL(new Blob(['window.Peer=function(id){var s=this;s.h={};s.on=function(e,f){(s.h[e]=s.h[e]||[]).push(f);};s.destroy=function(){};window.__votePeer=s;setTimeout(function(){(s.h.open||[]).forEach(function(f){f(id);});},0);};'], { type: 'text/javascript' }));
    const noqr = URL.createObjectURL(new Blob(['window.QRCode=null;'], { type: 'text/javascript' }));
    const html = R.io.buildHTML().split(R.vendor.PEERJS).join(fake).split(R.vendor.QRCODE).join(noqr);
    const { f, win, doc } = await deckFrame(html, 800, 450);
    try {
      for (let i = 0; i < 40 && !win.__votePeer?.h.connection; i++) await sleep(50);
      assert(win.__votePeer?.h.connection, 'la presentación espera votos');
      const sent = [], c = { open: true, h: {}, on(e, fn) { (this.h[e] = this.h[e] || []).push(fn); }, send(m) { sent.push(m); }, close() {} };
      win.__votePeer.h.connection.forEach(fn => fn(c));
      const btn = put(win, 'button', 540, 310, 200, 100); let clicks = 0; btn.addEventListener('click', () => clicks++);
      const start = win.Reveal.getIndices().h;
      for (const type of ['hello', 'pointer', 'tap', 'click', 'drag', 'wheel', 'zoom', 'black', 'next', 'goto'])
        c.h.data.forEach(fn => fn({ type, key: 'x', x: 0.5, y: 0.5, on: true, phase: 'start', index: 1, dx: 0, dy: 1, factor: 2 }));
      await sleep(80);
      eq(win.Reveal.getIndices().h, start, 'no pasa diapositivas');
      eq(clicks, 0, 'no pulsa nada');
      assert(!doc.getElementById('__laser') && !doc.getElementById('__rv-spot') && !doc.getElementById('__black'), 'no dibuja puntero, foco ni pantalla negra');
      assert(!sent.some(m => m.kind === 'welcome' || m.kind === 'state'), 'no se le trata como mando');
      eq(R.remote.remoteConnected(), false, 'el mando del editor sigue sin nadie');
    } finally { f.remove(); URL.revokeObjectURL(fake); URL.revokeObjectURL(noqr); }
  });

  await test('clase a su ritmo: sin nube, el panel dice qué hace falta', async () => {
    reset(); D.querySelector('[data-action="class-pace"]').click(); await sleep(30);
    const m = D.getElementById('pace-modal'); assert(m && /nube de Revela/.test(m.textContent), 'pide guardarla en la nube'); m.querySelector('.modal-close').click();
  });

  await test('aula: objetos que se mueven al presentar y fotos de 360°', async () => {
    reset(); R.blocks.addShape('rect'); await sleep(10); const sh = last();
    R.store.commit(() => { slide().blocks.find(x => x.id === sh.id).dragLive = true; });
    R.blocks.addImage('data:image/gif;base64,R0lGODlhAQABAAAAACw='); await sleep(10); const im = last();
    R.store.commit(() => { slide().blocks.find(x => x.id === im.id).pano = true; }); await sleep(20);
    assert(D.querySelector(`#stage .block[data-id="${im.id}"]`).classList.contains('is-pano') && D.querySelector(`#stage .block[data-id="${sh.id}"]`).classList.contains('is-drag'), 'en el editor se ve que lo son');
    const html = R.io.buildHTML(R.state.deck, { inApp: true });
    assert(/data-pano="data:image\/gif/.test(html) && /pannellum@2\.5\.6/.test(html), '360°: en la presentación, con su visor');
    const { f, win, doc } = await deckFrame(html, 800, 450);
    try {
      const el = doc.querySelector('.present [data-drag]'), x0 = parseFloat(el.style.left), r = el.getBoundingClientRect(), k = win.Reveal.getScale();
      const PE = (type, dx) => el.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, clientX: r.left + 5 + dx, clientY: r.top + 5 }));
      PE('pointerdown', 0); PE('pointermove', 40); PE('pointerup', 40);
      near(parseFloat(el.style.left) - x0, 40 / k, 'se arrastra con el ratón o el dedo', 1);
    } finally { f.remove(); }
  });

  await test('aula: dibujo y foto, modos de cuestionario, equipos, estrellas y alguien al azar', async () => {
    const P = await frame.contentWindow.eval("import('/src/features/live/poll.js')"), PNG = 'data:image/png;base64,iVBORw0KGgo=';
    let r = P.tallyVotes({ kind: 'draw' }, { a: { img: PNG, time: 1, n: 'Ana' }, b: { img: 'javascript:x' } });
    eq(r.voters + '|' + r.pics[0].n, '1|Ana', 'dibujo: solo imágenes');
    assert(/<img src="data:image\/png/.test(P.pollResultsHTML({ kind: 'draw' }, r, null, null)) && /Ana/.test(P.pollResultsHTML({ kind: 'photo' }, r, null, null)), 'dibujo y foto: en un muro, con su nombre');
    const q = { kind: 'quiz', options: ['a', 'b'], correct: [1], time: 20 };
    const pts = mode => P.tallyVotes({ ...q, mode }, { x: { a: 1, t: 15000, s: true }, y: { a: 0, t: 1000, s: true }, z: { a: 1, t: 1000, s: false } }).board.map(b => b.id + b.pts).sort().join();
    eq(pts(), 'x625,y0,z975', 'rapidez: más puntos cuanto antes');
    eq(pts('accuracy'), 'x1000,y0,z1000', 'precisión: acertar es acertar');
    eq(pts('confidence'), 'x1000,y-300,z600', 'confianza: seguro y bien, lo que más; seguro y mal, resta');
    const html = P.pollResultsHTML({ kind: 'board' }, { board: [{ id: 'x', n: 'Ana', pts: 900 }], teams: [{ team: 'Rojo', pts: 900, n: 1 }], stars: { x: { stars: 6, level: 2 } } }, null, null);
    assert(/Rojo/.test(html) && /⭐6 · Nivel 2/.test(html), 'clasificación: por equipos y con estrellas y nivel');
    // Live: names, teams, stars and the picker.
    reset(); R.store.commit(() => { R.state.deck.teams = ['Rojo', 'Azul']; });
    R.poll.addPoll({ kind: 'quiz', question: 'Q', options: ['a', 'b'], correct: [1], mode: 'confidence' }); const pq = last(); R.poll.clearVotes(pq.pollId);
    R.slides.addSlide('blank'); R.poll.addPoll({ kind: 'draw', question: 'D', options: [] }); const pd = last(); R.poll.clearVotes(pd.pollId);
    R.slides.addSlide('blank'); R.poll.addPoll({ kind: 'board', question: 'B', options: [] });
    try { frame.contentWindow.localStorage.removeItem('revela.poll.teams'); } catch {}
    R.slides.goToSlide(0);
    const fake = URL.createObjectURL(new Blob(['window.Peer=function(id){var s=this;s.h={};s.on=function(e,f){(s.h[e]=s.h[e]||[]).push(f);};s.destroy=function(){};window.__votePeer=s;setTimeout(function(){(s.h.open||[]).forEach(function(f){f(id);});},0);};'], { type: 'text/javascript' }));
    const noqr = URL.createObjectURL(new Blob(['window.QRCode=null;'], { type: 'text/javascript' }));
    const { f, win, doc } = await deckFrame(R.io.buildHTML(R.state.deck, { inApp: true }).split(R.vendor.PEERJS).join(fake).split(R.vendor.QRCODE).join(noqr), 800, 450);
    try {
      for (let i = 0; i < 40 && !win.__votePeer?.h.connection; i++) await sleep(50);
      const sent = [], c = { open: true, h: {}, on(e, fn) { (this.h[e] = this.h[e] || []).push(fn); }, send(m) { sent.push(m); }, close() {} };
      win.__votePeer.h.connection.forEach(fn => fn(c)); c.h.open.forEach(fn => fn());
      const say = d => c.h.data.forEach(fn => fn(d));
      const m = sent.filter(x => x.type === 'poll').at(-1).poll; eq(m.mode + '|' + m.teams.join(), 'confidence|Rojo,Azul', 'el móvil recibe el modo y los equipos');
      say({ type: 'hi', voter: 'v1', name: 'Ana', team: 'Rojo' });
      say({ type: 'vote', pollId: pq.pollId, voter: 'v1', answer: 1, name: 'Ana', sure: true });
      eq(JSON.parse(win.localStorage.getItem('revela.poll.' + pq.pollId)).v1.s, true, 'confianza: se guarda lo seguro que está');
      eq(sent.filter(x => x.type === 'stars').at(-1)?.stars, 1, 'una estrella por responder');
      win.Reveal.slide(1); await sleep(50);
      say({ type: 'vote', pollId: pd.pollId, voter: 'v1', answer: { img: PNG, n: 'Ana' } }); say({ type: 'vote', pollId: pd.pollId, voter: 'v2', answer: { img: 'data:text/html,x' } });
      eq(Object.keys(JSON.parse(win.localStorage.getItem('revela.poll.' + pd.pollId))).join(), 'v1', 'dibujo: solo imágenes de verdad');
      win.Reveal.slide(2); await sleep(50);
      assert(/Rojo/.test(doc.querySelector('.present .rv-poll-res').innerHTML) && /⭐/.test(doc.querySelector('.present .rv-poll-res').innerHTML), 'la clasificación, por equipos y con estrellas');
      win.rvPick(); for (let i = 0; i < 60 && doc.querySelector('#rv-pick .rv-pick-name')?.style.color === ''; i++) await sleep(50);
      eq(doc.querySelector('#rv-pick .rv-pick-name').textContent, 'Ana', 'alguien al azar: entre quienes tienen nombre');
      assert(sent.some(x => x.type === 'picked'), 'y su móvil se entera');
    } finally { f.remove(); URL.revokeObjectURL(fake); URL.revokeObjectURL(noqr); }
  });

  await test('respuesta de voz: el móvil graba, la pantalla las pone en un muro para escucharlas y guarda las más recientes', async () => {
    const W = frame.contentWindow, P = await W.eval("import('/src/features/live/poll.js')"), { ASYNC_KINDS } = await W.eval("import('/src/features/live/answers.js')");
    const AUD = (n, c = 'A') => 'data:audio/webm;codecs=opus;base64,' + c.repeat(n);
    let r = P.tallyVotes({ kind: 'audio' }, { a: { aud: AUD(8), time: 1, n: 'Ana', d: 4 }, b: { aud: 'data:text/html,x', time: 9 }, c: { aud: 'data:audio/mp4;base64,BB', time: 2 } });
    eq(r.voters + '|' + r.clips.map(x => x.id).join(), '2|c,a', 'solo audio, las más recientes primero');
    const wall = P.pollResultsHTML({ kind: 'audio' }, r, null, null);
    assert(/data-rv-clip="1"[^>]*aria-label="Escuchar · Ana"/.test(wall) && /4 s/.test(wall) && !/data:audio/.test(wall), 'un botón por voz, con su nombre y su duración, sin el sonido dentro: ' + wall.slice(0, 200));
    assert(!ASYNC_KINDS.includes('audio'), 'no se ofrece para responder más tarde con un enlace (iría a la nube)');
    // In the editor: its kind, its help, the voices kept to listen to, and the CSV.
    reset(); R.poll.addPoll({ kind: 'audio', question: '¿Cómo se dice «hola»?', options: [] }); const b = last();
    W.localStorage.setItem('revela.poll.' + b.pollId, JSON.stringify({ v1: { aud: AUD(8), time: 5, n: 'Ana', d: 3 }, v2: { aud: AUD(8, 'B'), time: 6, n: 'Luis "L"', d: 7 } }));
    eq(P.votesCSV(b), 'participante,segundos\n"Luis ""L""",7\n"Ana",3', 'CSV: quién respondió y cuánto dura');
    const E = await W.eval("import('/src/ui/dialogs/poll.js')"); E.openPollEditor(b); await sleep(10);
    try {
      const m = D.getElementById('poll-modal');
      eq(m.querySelector('.pl-kind').value, 'audio', 'el tipo, en la lista');
      assert(m.querySelector('.pl-opts-l').hidden && /30 segundos/.test(m.querySelector('.pl-help').textContent), 'sin opciones y con su explicación');
      eq(m.querySelectorAll('.pl-aud audio').length, 2, 'las voces guardadas, para escucharlas en el editor');
      assert(/Luis "L" · 7 s/.test(m.querySelector('.pl-aud').textContent), 'con su nombre');
    } finally { D.getElementById('poll-modal')?.remove(); }
    // Presenting: the votes kept, the wall, a click plays one (and a new answer doesn't stop it), only the newest saved.
    R.poll.clearVotes(b.pollId);
    const fake = URL.createObjectURL(new Blob(['window.Peer=function(id){var s=this;s.h={};s.on=function(e,f){(s.h[e]=s.h[e]||[]).push(f);};s.destroy=function(){};window.__votePeer=s;setTimeout(function(){(s.h.open||[]).forEach(function(f){f(id);});},0);};'], { type: 'text/javascript' }));
    const noqr = URL.createObjectURL(new Blob(['window.QRCode=null;'], { type: 'text/javascript' }));
    const { f, win, doc } = await deckFrame(R.io.buildHTML(R.state.deck, { inApp: true }).split(R.vendor.PEERJS).join(fake).split(R.vendor.QRCODE).join(noqr), 800, 450);
    try {
      for (let i = 0; i < 40 && !win.__votePeer?.h.connection; i++) await sleep(50);
      const sent = [], c = { open: true, h: {}, on(e, fn) { (this.h[e] = this.h[e] || []).push(fn); }, send(m) { sent.push(m); }, close() {} };
      win.__votePeer.h.connection.forEach(fn => fn(c)); c.h.open.forEach(fn => fn());
      const say = d => c.h.data.forEach(fn => fn(d));
      eq(sent.filter(x => x.type === 'poll').at(-1).poll.kind, 'audio', 'el móvil recibe la pregunta');
      const RD = await W.eval("import('/src/io/runtime/reading.js')");
      eq(JSON.stringify(RD.readingItems(doc.querySelector('section.present')).find(x => x.t === 'q')), JSON.stringify({ t: 'q', text: '¿Cómo se dice «hola»?' }), 'en el modo lectura, la pregunta');
      say({ type: 'vote', pollId: b.pollId, voter: 'v1', answer: { aud: AUD(1000), n: 'Ana', d: 3 } });
      say({ type: 'vote', pollId: b.pollId, voter: 'v2', answer: { aud: 'data:audio/webm;base64,<script>' } });
      say({ type: 'vote', pollId: b.pollId, voter: 'v3', answer: { aud: AUD(300001) } });
      eq(Object.keys(JSON.parse(win.localStorage.getItem('revela.poll.' + b.pollId))).join(), 'v1', 'solo audio de verdad, y no demasiado largo');
      eq(sent.filter(x => x.type === 'ok').length, 1, 'y al que vale se le confirma');
      const res = doc.querySelector('.present .rv-poll-res'), tile = () => res.querySelector('[data-rv-clip="0"]');
      assert(/Ana/.test(tile()?.textContent), 'en el muro, con su nombre');
      tile().click(); await sleep(20);
      eq(doc.getElementById('rv-clip')?.getAttribute('src'), AUD(1000), 'un clic la reproduce');
      eq(tile().getAttribute('aria-pressed'), 'true', 'y se ve cuál suena');
      say({ type: 'vote', pollId: b.pollId, voter: 'v4', answer: { aud: AUD(1000, 'C'), n: 'Eva', d: 2 } });
      assert(/Eva/.test(tile().textContent) && res.querySelector('[data-rv-clip="1"]').getAttribute('aria-pressed') === 'true', 'una respuesta nueva, la primera; la que suena sigue marcada');
      eq(doc.getElementById('rv-clip').getAttribute('src'), AUD(1000), 'y no se corta');
      res.querySelector('[data-rv-clip="1"]').click(); await sleep(20);
      eq(res.querySelector('[data-rv-clip="1"]').getAttribute('aria-pressed'), 'false', 'otro clic la para');
      for (let i = 0; i < 15; i++) { say({ type: 'vote', pollId: b.pollId, voter: 'm' + i, answer: { aud: AUD(200000, String.fromCharCode(68 + i)), d: 30 } }); await sleep(2); }
      const kept = JSON.parse(win.localStorage.getItem('revela.poll.' + b.pollId));
      assert(JSON.stringify(kept).length < 1300000 && kept.m14 && !kept.v1, 'en este navegador, solo las más recientes: ' + Object.keys(kept).join());
      eq(res.querySelectorAll('[data-rv-clip]').length, 17, 'en la pantalla, todas las de esta sesión');
    } finally { f.remove(); URL.revokeObjectURL(fake); URL.revokeObjectURL(noqr); R.poll.clearVotes(b.pollId); }
    // On the phone: the microphone refused, explained; then recorded (Chrome's test microphone), listened to and sent.
    const ph = document.createElement('iframe'); ph.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:700px;opacity:0';
    ph.src = new URL('../vote.html?test', D.baseURI).href; document.body.appendChild(ph);
    let v; for (let i = 0; i < 60 && !(v = ph.contentWindow)?.__vote; i++) await sleep(100);
    try {
      const Q = s => ph.contentDocument.querySelector(s), sentV = () => v.__sent.filter(m => m.type === 'vote').at(-1);
      v.localStorage.setItem('revela.nick', 'Ana');
      v.__vote.onData({ type: 'poll', poll: { pollId: 'a1', kind: 'audio', question: 'Di algo', options: [] } });
      const rec = [...ph.contentDocument.querySelectorAll('#answers button')].find(x => /Grabar/.test(x.textContent));
      assert(rec, 'un botón para grabar');
      const gum = v.navigator.mediaDevices.getUserMedia;
      v.navigator.mediaDevices.getUserMedia = () => Promise.reject(new v.DOMException('no', 'NotAllowedError'));
      rec.click(); await sleep(30);
      assert(/permiso[\s\S]*ajustes del navegador/.test(Q('#answers .err').textContent), 'sin permiso: dice cómo darlo');
      v.navigator.mediaDevices.getUserMedia = gum;
      rec.click(); for (let i = 0; i < 40 && !/Parar/.test(rec.textContent); i++) await sleep(50);
      assert(/■ Parar \(\d+ s\)/.test(rec.textContent), 'grabando: el botón para y cuenta el tiempo que queda');
      await sleep(1300); rec.click();
      for (let i = 0; i < 60 && Q('#answers audio').hidden; i++) await sleep(50);
      assert(!Q('#answers audio').hidden && /Grabar otra vez/.test(rec.textContent), 'se puede escuchar antes de enviar, o grabar otra vez');
      Q('#send').click();
      const a = sentV().answer;
      assert(/^data:audio\/(webm|ogg|mp4)[;,]/.test(a.aud) && a.aud.length < 300000 && a.n === 'Ana' && a.d >= 1, 'se envía la grabación, con su nombre y su duración: ' + String(a.aud).slice(0, 40));
      let saved = null; const realURL = v.URL.createObjectURL; v.URL.createObjectURL = blob => { saved = blob; return 'blob:x'; };
      Q('#mine').click(); v.URL.createObjectURL = realURL;
      assert(/<audio controls src="data:audio/.test(await saved.text()), 'en mi resumen, mi grabación');
    } finally { ph.remove(); }
  });

  await test('clasificación como carrera: cada uno avanza desde sus puntos de antes, por equipos, también al ver la respuesta', async () => {
    const W = frame.contentWindow, P = await W.eval("import('/src/features/live/poll.js')");
    const board = [{ id: 'x', n: 'Ana', pts: 900 }, { id: 'y', n: 'Luis', pts: 400 }];
    const run = P.pollResultsHTML({ kind: 'board', display: 'race' }, { board, prev: { x: 300 }, goal: 2000 }, null, null);
    assert(/class="rv-race"/.test(run) && /🥇[\s\S]*Ana[\s\S]*900[\s\S]*🥈[\s\S]*Luis/.test(run), 'una calle por jugador, el primero arriba');
    assert(/animation:rvRaceL[^"]*--rv-f:calc\(\.75em \+ \(100% - 1\.5em\) \* 0\.150\)/.test(run) && /left:calc\(\.75em \+ \(100% - 1\.5em\) \* 0\.450\)/.test(run), 'sale de sus puntos de antes y llega a los de ahora, hacia la meta');
    assert(/prefers-reduced-motion:reduce/.test(run), 'quieto para quien pide menos movimiento');
    assert(!/animation:rvRace/.test(P.pollResultsHTML({ kind: 'board', display: 'race' }, { board }, null, null)), 'sin puntos de antes (el editor, las miniaturas), quieta');
    const many = Array.from({ length: 14 }, (_, i) => ({ id: 'p' + i, n: 'P' + i, pts: 1000 - i }));
    eq((P.pollResultsHTML({ kind: 'board', display: 'race' }, { board: many }, null, null).match(/rvRace|🏁/g) || []).filter(x => x === '🏁').length, 10, 'los diez primeros');
    const teams = P.pollResultsHTML({ kind: 'board', display: 'race' }, { board, teams: [{ team: 'Rojo', pts: 650, n: 2 }] }, null, null);
    assert(/Rojo/.test(teams) && !/Luis/.test(teams), 'por equipos: corren los equipos');
    // The editor: «Carrera animada» only for the leaderboard and the quizzes.
    reset(); R.poll.addPoll({ kind: 'board', question: '', options: [] }); const b = last();
    const E = await W.eval("import('/src/ui/dialogs/poll.js')"); E.openPollEditor(b); await sleep(10);
    try {
      const m = D.getElementById('poll-modal'), opt = v => m.querySelector(`.pl-disp option[value="${v}"]`);
      assert(!opt('race').hidden && opt('pie').hidden && !m.querySelector('.pl-race').hidden, 'la clasificación: lista o carrera');
      m.querySelector('.pl-kind').value = 'choice'; m.querySelector('.pl-kind').dispatchEvent(new W.Event('change'));
      assert(opt('race').hidden && !opt('pie').hidden, 'una votación: sin carrera');
      m.querySelector('.pl-kind').value = 'board'; m.querySelector('.pl-kind').dispatchEvent(new W.Event('change'));
      m.querySelector('.pl-disp').value = 'race'; m.querySelector('.pl-ok').click(); await sleep(10);
    } finally { D.getElementById('poll-modal')?.remove(); }
    eq(slide().blocks.find(x => x.id === b.id).display, 'race', 'se guarda');
    // Presenting: a quiz shown as a race on its reveal, then the leaderboard runs from where it was last seen.
    R.store.commit(() => { slide().blocks = []; });
    R.poll.addPoll({ kind: 'quiz', question: 'Q', options: ['a', 'b'], correct: [1], display: 'race' }); const pq = last(); R.poll.clearVotes(pq.pollId);
    R.slides.addSlide('blank'); R.poll.addPoll({ kind: 'board', question: '', options: [], display: 'race' });
    R.slides.goToSlide(0);
    assert(/data-poll="[^"]*&quot;display&quot;:&quot;race&quot;/.test(R.io.buildHTML()), 'en la presentación exportada');
    const fake = URL.createObjectURL(new Blob(['window.Peer=function(id){var s=this;s.h={};s.on=function(e,f){(s.h[e]=s.h[e]||[]).push(f);};s.destroy=function(){};window.__votePeer=s;setTimeout(function(){(s.h.open||[]).forEach(function(f){f(id);});},0);};'], { type: 'text/javascript' }));
    const noqr = URL.createObjectURL(new Blob(['window.QRCode=null;'], { type: 'text/javascript' }));
    const { f, win, doc } = await deckFrame(R.io.buildHTML(R.state.deck, { inApp: true }).split(R.vendor.PEERJS).join(fake).split(R.vendor.QRCODE).join(noqr), 800, 450);
    try {
      for (let i = 0; i < 40 && !win.__votePeer?.h.connection; i++) await sleep(50);
      const c = { open: true, h: {}, on(e, fn) { (this.h[e] = this.h[e] || []).push(fn); }, send() {}, close() {} };
      win.__votePeer.h.connection.forEach(fn => fn(c)); c.h.open.forEach(fn => fn());
      const say = d => c.h.data.forEach(fn => fn(d));
      say({ type: 'vote', pollId: pq.pollId, voter: 'v1', answer: 1, name: 'Ana' }); say({ type: 'vote', pollId: pq.pollId, voter: 'v2', answer: 0, name: 'Luis' });
      const quizRes = doc.querySelector('.present .rv-poll-res');
      quizRes.click(); await sleep(30);
      assert(quizRes.querySelector('.rv-race') && /--rv-f:calc\(\.75em \+ \(100% - 1\.5em\) \* 0\.000\)/.test(quizRes.innerHTML), 'al ver la respuesta, la carrera, desde los puntos de antes de esta pregunta');
      win.Reveal.slide(1); await sleep(60);
      const bd = doc.querySelector('.present .rv-poll-res');
      assert(bd.querySelector('.rv-race') && /Ana/.test(bd.textContent), 'la clasificación, como carrera');
      const runner = [...bd.querySelectorAll('.rv-race span')].find(x => /rvRaceL/.test(x.style.animation || x.getAttribute('style')));
      assert(runner && win.getComputedStyle(runner).animationName === 'rvRaceL', 'y corre (la animación, en marcha)');
      win.Reveal.slide(0); await sleep(30); win.Reveal.slide(1); await sleep(60);
      const lane = doc.querySelector('.present .rv-poll-res .rv-race > div').innerHTML.replace(/&quot;/g, '"');
      const at = lane.match(/left:calc\(\.75em \+ \(100% - 1\.5em\) \* ([\d.]+)\);[^"]*rvRaceL[^"]*--rv-f:calc\(\.75em \+ \(100% - 1\.5em\) \* ([\d.]+)\)/);
      assert(at && +at[1] > 0.4 && at[1] === at[2], 'al volver, sale desde donde estaba (no desde cero): ' + (at || []).slice(1).join(' → '));
    } finally { f.remove(); URL.revokeObjectURL(fake); URL.revokeObjectURL(noqr); R.poll.clearVotes(pq.pollId); }
  });

  await test('preguntas del público moderadas y palabrotas tapadas: esperan en una ventana aparte, la pantalla solo dice cuántas', async () => {
    reset(); const P = R.poll;
    eq(P.tallyVotes({ kind: 'open', clean: true }, { a: { t: 'Qué mierda, joder' }, b: { t: 'El putamen, el motor Wankel y un cono' } }).texts.map(x => x.text).sort().join('|'),
      'El putamen, el motor Wankel y un cono|Qué m*****, j****', 'palabrotas tapadas (y no las palabras que solo se les parecen)');
    eq(Object.keys(P.tallyVotes({ kind: 'word', clean: true }, { a: 'shit, sol' }).words).sort().join(), 's***,sol', 'también en la nube de palabras');
    eq(P.tallyVotes({ kind: 'open' }, { a: { t: 'mierda' } }).texts[0].text, 'mierda', 'sin la opción, tal cual');
    const qa = P.tallyVotes({ kind: 'qa', moderate: true }, { 'q:1': { t: 'Vista', up: {} }, 'q:2': { t: 'Espera', hold: 1, up: {} } });
    eq(qa.questions.map(x => x.text).join() + '|' + qa.pending, 'Vista|1', 'las que esperan no se cuentan ni se ven');
    assert(/1 esperando aprobación/.test(P.pollResultsHTML({ kind: 'qa' }, qa)), 'la pantalla dice cuántas esperan');
    R.poll.addPoll({ kind: 'qa', question: '¿Dudas?', options: [] }); const pq = last(); R.poll.clearVotes(pq.pollId);
    const E = await frame.contentWindow.eval("import('/src/ui/dialogs/poll.js')"); E.openPollEditor(pq); await sleep(10);
    const m = D.getElementById('poll-modal'); assert(m, 'el diálogo de la votación');
    assert(!m.querySelector('.pl-mod').closest('label').hidden && !m.querySelector('.pl-clean').closest('label').hidden, 'con las dos opciones para las preguntas');
    m.querySelector('.pl-mod').checked = true; m.querySelector('.pl-clean').checked = true; m.querySelector('.pl-ok').click(); await sleep(10);
    eq(!!last().moderate + '|' + !!last().clean, 'true|true', 'se guardan');
    const fake = URL.createObjectURL(new Blob(['window.Peer=function(id){var s=this;s.h={};s.on=function(e,f){(s.h[e]=s.h[e]||[]).push(f);};s.destroy=function(){};window.__votePeer=s;setTimeout(function(){(s.h.open||[]).forEach(function(f){f(id);});},0);};'], { type: 'text/javascript' }));
    const noqr = URL.createObjectURL(new Blob(['window.QRCode=null;'], { type: 'text/javascript' }));
    const { f, win, doc } = await deckFrame(R.io.buildHTML(R.state.deck, { inApp: true }).split(R.vendor.PEERJS).join(fake).split(R.vendor.QRCODE).join(noqr), 800, 450);
    try {
      for (let i = 0; i < 40 && !win.__votePeer?.h.connection; i++) await sleep(50);
      const sent = [], c = { open: true, h: {}, on(e, fn) { (this.h[e] = this.h[e] || []).push(fn); }, send(x) { sent.push(x); }, close() {} };
      win.__votePeer.h.connection.forEach(fn => fn(c)); c.h.open.forEach(fn => fn());
      const say = d => c.h.data.forEach(fn => fn(d)), res = () => doc.querySelector('.present .rv-poll-res').textContent;
      say({ type: 'vote', pollId: pq.pollId, voter: 'v1', answer: { ask: '¿Por qué tanta mierda de deberes?' } });
      eq(sent.filter(x => x.type === 'ok').at(-1)?.held, true, 'quien pregunta sabe que espera aprobación');
      assert(/1 esperando aprobación/.test(res()) && !/deberes/.test(res()), 'en pantalla, solo cuántas esperan');
      eq(sent.filter(x => x.type === 'qa').at(-1).list.length, 0, 'los móviles no la ven aún');
      // (The moderation window: a frame here stands for the window it opens.)
      const pop = doc.createElement('iframe'); doc.body.appendChild(pop); win.open = () => pop.contentWindow;
      assert(win.rvModerate(), 'M abre la ventana de moderar');
      const pd = pop.contentWindow.document, btn = a => pd.querySelector(`button[data-a="${a}"]`);
      assert(/m\*{5}/.test(pd.getElementById('l').textContent), 'la pregunta, con la palabrota tapada');
      btn('ok').click();
      assert(/m\*{5} de deberes/.test(res()) && !/esperando/.test(res()), 'aprobada: sale en pantalla, tapada');
      eq(sent.filter(x => x.type === 'qa').at(-1).list.map(x => x.text).join(), '¿Por qué tanta m***** de deberes?', 'y en los móviles');
      btn('hide').click(); assert(/1 esperando aprobación/.test(res()), 'ocultarla la devuelve a la espera');
      btn('del').click(); assert(!/esperando/.test(res()) && /Aún no hay preguntas/.test(pd.getElementById('l').textContent), 'descartarla la quita');
      const fresh = R.io.buildHTML(R.state.deck, { inApp: true }); assert(/&quot;moderate&quot;:true/.test(fresh) && /&quot;clean&quot;:true/.test(fresh), 'la página exportada lleva las dos opciones');
    } finally { f.remove(); URL.revokeObjectURL(fake); URL.revokeObjectURL(noqr); }
  });

  await test('apuntador: las notas de la diapositiva, grandes, en una ventana aparte que avanza sola y sigue a la presentación', async () => {
    reset(); const W = frame.contentWindow;
    R.store.commit(() => { slide().notes = 'Primera línea de la nota.\n'.repeat(60); });
    R.slides.addSlide('blank'); R.store.commit(() => { slide().notes = 'Notas de la segunda'; });
    R.slides.addSlide('blank'); R.slides.goToSlide(0);
    const pop = D.createElement('iframe'); pop.style.cssText = 'width:900px;height:380px'; D.body.appendChild(pop); const open0 = W.open; W.open = () => pop.contentWindow;
    try {
      D.querySelector('[data-action="prompter"]').click(); await sleep(150);
      const pd = pop.contentWindow.document, txt = () => pd.getElementById('in').textContent, box = pd.getElementById('txt');
      assert(/^Primera línea/.test(txt()), 'muestra las notas de la diapositiva que se edita');
      const y0 = box.scrollTop; await sleep(700); assert(box.scrollTop > y0, 'y avanzan solas');
      pd.dispatchEvent(new pop.contentWindow.KeyboardEvent('keydown', { key: ' ', bubbles: true })); const y1 = box.scrollTop; await sleep(400);
      eq(box.scrollTop, y1, 'espacio: se para');
      const fs = parseFloat(pd.getElementById('in').style.fontSize); pd.querySelector('[data-k="bigger"]').click(); await sleep(50);
      assert(parseFloat(pd.getElementById('in').style.fontSize) > fs, 'A+: letra más grande');
      R.slides.goToSlide(1); await sleep(100); eq(txt(), 'Notas de la segunda', 'cambia con la diapositiva');
      R.slides.goToSlide(2); await sleep(100); assert(/no tiene notas/.test(txt()), 'sin notas: lo dice');
      R.slides.goToSlide(0); R.io.present({ fullscreen: false });
      const f = D.querySelector('#present-overlay iframe'); let Rv = null;
      for (let i = 0; i < 80 && !(Rv = f.contentWindow?.Reveal)?.isReady?.(); i++) await sleep(50);
      assert(D.querySelector('#present-prompter'), 'al presentar, un botón para abrirlo');
      Rv.slide(1); await sleep(100); eq(txt(), 'Notas de la segunda', 'presentando: sigue a la diapositiva que se ve');
      D.getElementById('present-close').click(); await sleep(50);
      (await W.eval("import('/src/ui/shell/prompter.js')")).closePrompter();
    } finally { W.open = open0; pop.remove(); }
  });

  await test('adaptaciones por alumno: más tiempo, una opción menos, sin clasificación — solo en su móvil', async () => {
    reset(); const P = R.poll, W = frame.contentWindow, G = await W.eval("import('/src/io/gradebook.js')");
    eq(P.tallyVotes({ kind: 'quiz', options: ['a', 'b'], correct: [1], time: 10 }, { u: { a: 1, t: 15000, x: 2 } }).board[0].pts, 625, 'más tiempo: los puntos por rapidez, sobre su tiempo (15 s de 20)');
    eq(G.setAdaptation('n:pablo:1', { big: true }), null, 'solo dispositivos (un nombre de rúbrica no tiene móvil)');
    G.setAdaptation('dev-lia', { time: 2, fewer: true, noRank: true, read: true, big: true });
    eq(JSON.stringify(G.adaptations()['dev-lia']), '{"time":2,"fewer":true,"read":true,"big":true,"noRank":true}', 'se guardan');
    R.poll.addPoll({ kind: 'quiz', question: '¿Capital?', options: ['Roma', 'París', 'Lyon', 'Niza'], correct: [1], time: 10 }); const pq = last(); R.poll.clearVotes(pq.pollId);
    const fake = URL.createObjectURL(new Blob(['window.Peer=function(id){var s=this;s.h={};s.on=function(e,f){(s.h[e]=s.h[e]||[]).push(f);};s.destroy=function(){};window.__votePeer=s;setTimeout(function(){(s.h.open||[]).forEach(function(f){f(id);});},0);};'], { type: 'text/javascript' }));
    const noqr = URL.createObjectURL(new Blob(['window.QRCode=null;'], { type: 'text/javascript' }));
    const { f, win, doc } = await deckFrame(R.io.buildHTML(R.state.deck, { inApp: true }).split(R.vendor.PEERJS).join(fake).split(R.vendor.QRCODE).join(noqr), 800, 450);
    try {
      for (let i = 0; i < 40 && !win.__votePeer?.h.connection; i++) await sleep(50);
      const phone = () => { const sent = [], c = { open: true, h: {}, sent, on(e, fn) { (this.h[e] = this.h[e] || []).push(fn); }, send(m) { sent.push(m); }, close() {} };
        win.__votePeer.h.connection.forEach(fn => fn(c)); c.h.open.forEach(fn => fn()); c.say = d => c.h.data.forEach(fn => fn(d)); return c; };
      const lia = phone(), leo = phone();
      lia.say({ type: 'hi', voter: 'dev-lia', name: 'Lía' }); leo.say({ type: 'hi', voter: 'dev-leo', name: 'Leo' });
      const ap = lia.sent.filter(x => x.type === 'adapt').at(-1); assert(ap && ap.read && ap.big && ap.noRank, 'su móvil recibe sus adaptaciones');
      const lp = lia.sent.filter(x => x.type === 'poll').at(-1).poll, op = leo.sent.filter(x => x.type === 'poll').at(-1).poll;
      eq(lp.time + '|' + JSON.stringify(lp.hide), '20|[3]', 'a Lía: el doble de tiempo y una opción incorrecta menos');
      assert(!op.hide && op.time === 10 && !leo.sent.some(x => x.type === 'adapt'), 'a Leo, lo de todos');
      lia.say({ type: 'vote', pollId: pq.pollId, voter: 'dev-lia', answer: 1, name: 'Lía' }); leo.say({ type: 'vote', pollId: pq.pollId, voter: 'dev-leo', answer: 1, name: 'Leo' });
      eq(JSON.parse(win.localStorage.getItem('revela.poll.' + pq.pollId))['dev-lia'].x, 2, 'su respuesta lleva su tiempo extra');
      doc.querySelector('.present .rv-poll').click(); await sleep(50);
      const rl = lia.sent.filter(x => x.type === 'quizresult').at(-1), ro = leo.sent.filter(x => x.type === 'quizresult').at(-1);
      assert(rl.ok && rl.rank === 0 && !rl.of && ro.rank >= 1 && ro.of === 2, 'sin clasificación: no ve su puesto (Leo sí): ' + JSON.stringify([rl, ro]));
      const shown = doc.querySelector('.present .rv-poll-res').textContent; assert(/Leo/.test(shown) && !/Lía/.test(shown), 'ni sale en la clasificación de la pantalla');
    } finally { f.remove(); URL.revokeObjectURL(fake); URL.revokeObjectURL(noqr); W.localStorage.removeItem('revela.adapt'); }
  });

  await test('votaciones nuevas en directo: el móvil recibe lo que necesita y la presentación acepta solo respuestas válidas', async () => {
    reset();
    const G = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    R.poll.addPoll({ kind: 'number', question: 'N', options: [], min: 0, max: 10, unit: 'kg', answer: 7 }); const pn = last();
    R.slides.addSlide('blank'); R.poll.addPoll({ kind: 'rank', question: 'R', options: ['A', 'B', 'C'] }); const pr = last();
    R.slides.addSlide('blank'); R.poll.addPoll({ kind: 'point', question: 'P', options: [], image: G }); const pp = last();
    R.slides.addSlide('blank'); R.poll.addPoll({ kind: 'open', question: 'O', options: [] }); const po = last();
    R.slides.addSlide('blank'); R.poll.addPoll({ kind: 'image', question: 'I', options: ['x', 'y'], images: [G, G] }); const pi = last();
    for (const p of [pn, pr, pp, po, pi]) R.poll.clearVotes(p.pollId);
    R.slides.goToSlide(0);
    const fake = URL.createObjectURL(new Blob(['window.Peer=function(id){var s=this;s.h={};s.on=function(e,f){(s.h[e]=s.h[e]||[]).push(f);};s.destroy=function(){};window.__votePeer=s;setTimeout(function(){(s.h.open||[]).forEach(function(f){f(id);});},0);};'], { type: 'text/javascript' }));
    const noqr = URL.createObjectURL(new Blob(['window.QRCode=null;'], { type: 'text/javascript' }));
    const html = R.io.buildHTML(R.state.deck, { inApp: true }).split(R.vendor.PEERJS).join(fake).split(R.vendor.QRCODE).join(noqr);
    const { f, win } = await deckFrame(html, 800, 450);
    try {
      for (let i = 0; i < 40 && !win.__votePeer?.h.connection; i++) await sleep(50);
      const sent = [], c = { open: true, h: {}, on(e, fn) { (this.h[e] = this.h[e] || []).push(fn); }, send(m) { sent.push(m); }, close() {} };
      win.__votePeer.h.connection.forEach(fn => fn(c)); c.h.open.forEach(fn => fn());
      const pollMsg = () => sent.filter(m => m.type === 'poll').at(-1)?.poll, vote = (p, answer, voter = 'v1') => c.h.data.forEach(fn => fn({ type: 'vote', pollId: p.pollId, voter, answer }));
      const stored = p => JSON.parse(win.localStorage.getItem('revela.poll.' + p.pollId) || '{}');
      let m = pollMsg(); eq(m.kind + '|' + m.min + '|' + m.max + '|' + m.unit, 'number|0|10|kg', 'número: el móvil recibe su rango y su unidad'); assert(!('answer' in m) || m.answer === undefined, 'número: pero no la respuesta');
      vote(pn, 4); vote(pn, 11, 'v2'); vote(pn, 'x', 'v3');
      eq(JSON.stringify(stored(pn)), '{"v1":4}', 'número: solo los válidos');
      win.Reveal.slide(1); await sleep(50); eq(pollMsg().kind, 'rank', 'pasa a la siguiente');
      vote(pr, [2, 0, 1]); vote(pr, [0, 0, 1], 'v2'); vote(pr, [0, 1], 'v3');
      eq(JSON.stringify(stored(pr)), '{"v1":[2,0,1]}', 'preferencia: solo órdenes completos');
      win.Reveal.slide(2); await sleep(50); eq(pollMsg().image, G, 'punto: el móvil recibe la imagen');
      vote(pp, { x: 12.34, y: 99 }); vote(pp, { x: 140, y: 5 }, 'v2');
      eq(JSON.stringify(stored(pp)), '{"v1":{"x":12.3,"y":99}}', 'punto: dentro de la imagen');
      win.Reveal.slide(3); await sleep(50);
      vote(po, '  Una idea  '); vote(po, '   ', 'v2'); vote(po, 'x'.repeat(500), 'v3');
      const o = stored(po); eq(Object.keys(o).join() + '|' + o.v1.t + '|' + o.v3.t.length, 'v1,v3|Una idea|200', 'abierta: sin vacías y recortadas');
      assert(/Una idea/.test(win.document.querySelector('.present .rv-poll-res').innerHTML), 'abierta: sale en el muro de la presentación');
      win.Reveal.slide(4); await sleep(50); eq(pollMsg().images.length, 2, 'imágenes: el móvil recibe las imágenes');
      vote(pi, 1); vote(pi, 5, 'v2'); eq(JSON.stringify(stored(pi)), '{"v1":1}', 'imágenes: una opción que existe');
    } finally { f.remove(); URL.revokeObjectURL(fake); URL.revokeObjectURL(noqr); }
  });

  await test('mando: el panel táctil del móvil (390×844) maneja la presentación de punta a punta', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0); R.render();
    const { Peer } = fakeBroker(); let last = null;
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await R.remote.startHost(s => { last = s; }, { Peer, thumb: async () => PNG }); await sleep(20);
    R.io.present({ fullscreen: false });
    const pf = () => R.session.present?.frame;
    for (let i = 0; i < 100 && !pf()?.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
    const pw = pf().contentWindow, pd = pf().contentDocument;
    const ph = document.createElement('iframe'); ph.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;opacity:0;border:0';
    ph.src = '/remote.html?k=' + new URL(last.link).searchParams.get('k'); document.body.appendChild(ph);
    try {
      let M; for (let i = 0; i < 60 && !((M = ph.contentDocument)?.getElementById('padhint')?.textContent); i++) await sleep(100);
      // «Add to Home Screen» from the remote installs the remote (its own manifest), shown without the browser's bars.
      const man = await (await fetch(M.querySelector('link[rel=manifest]').href)).json();
      assert(/remote\.html$/.test(man.start_url) && man.display === 'standalone', 'manifiesto propio del mando: ' + JSON.stringify(man));
      ph.contentWindow.Peer = Peer;
      M.getElementById('code').value = last.code; M.getElementById('go').click();
      for (let i = 0; i < 40 && !M.getElementById('control').classList.contains('active'); i++) await sleep(50);
      assert(M.getElementById('control').classList.contains('active'), 'el móvil se empareja con la clave del enlace');
      for (let i = 0; i < 40 && M.getElementById('thumb').hidden; i++) await sleep(50);
      assert(!M.getElementById('thumb').hidden, 'el panel muestra la diapositiva actual');
      M.querySelector('[data-view=pad]').click(); M.querySelector('[data-tool=spot]').click(); await sleep(50);
      const pad = M.getElementById('pad'), pr = pad.getBoundingClientRect();
      assert(pr.width > 300 && pr.width <= 390, 'el panel ocupa el ancho del móvil: ' + pr.width);
      near(pr.width / pr.height, 16 / 9, 'con la proporción de la diapositiva', 0.05);
      const PE = (type, u, v, id = 7) => pad.dispatchEvent(new ph.contentWindow.PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', clientX: pr.left + u * pr.width, clientY: pr.top + v * pr.height }));
      PE('pointerdown', 0.5, 0.5); PE('pointermove', 0.52, 0.5);
      for (let i = 0; i < 40 && pd.getElementById('__rv-spot')?.style.display !== 'block'; i++) await sleep(50);
      eq(pd.getElementById('__rv-spot')?.style.display, 'block', 'el foco aparece en la presentación');
      PE('pointerup', 0.52, 0.5); await sleep(120);
      eq(pd.getElementById('__rv-spot').style.display, 'none', 'al levantar el dedo se quita');
      // Interact: a tap presses what is there on the slide.
      const { w: SW, h: SH } = R.state.deck.size;
      const btn = pd.createElement('button'); btn.style.cssText = `position:absolute;left:${SW * 0.4}px;top:${SH * 0.4}px;width:${SW * 0.2}px;height:${SH * 0.2}px`;
      pw.Reveal.getCurrentSlide().querySelector('.stage').appendChild(btn); let clicks = 0; btn.addEventListener('click', () => clicks++);
      M.querySelector('[data-tool=touch]').click(); await sleep(30);
      PE('pointerdown', 0.5, 0.5, 8); PE('pointerup', 0.5, 0.5, 8);
      for (let i = 0; i < 20 && !clicks; i++) await sleep(50);
      eq(clicks, 1, 'tocar en el panel pulsa el botón de la diapositiva');
      M.getElementById('next').click();
      for (let i = 0; i < 20 && pw.Reveal.getIndices().h !== 1; i++) await sleep(50);
      eq(pw.Reveal.getIndices().h, 1, 'Siguiente pasa la diapositiva');
      const fs = () => parseFloat(M.documentElement.style.getPropertyValue('--notes')), f0 = fs();
      M.getElementById('font-up').click(); eq(fs(), Math.min(40, f0 + 2), 'letra de las notas más grande');
    } finally { ph.remove(); D.getElementById('present-close')?.click(); R.remote.stopHost(); }
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

  await test('candado al presentar: no deja pasar hasta abrirlo, falla con una sacudida, se abre con las ruedas, muestra el premio y sigue', async () => {
    const d = R.model.emptyDeck(); R.store.replaceDeck(d); R.slides.addSlide(); R.slides.addSlide(); await sleep(20);
    const [s1, s2] = R.state.deck.slides;
    R.store.commit(() => {
      s1.blocks.push({ id: 'prize', type: 'shape', shape: 'rect', x: 900, y: 100, w: 100, h: 100, fill: '#2e7d32', rotation: 0, animation: null },
        { id: 'lk', type: 'lock', codes: ['1492'], hint: 'El año', openTo: 'next', reveal: ['prize'], fail: 'Frío, frío', tries: 0, gate: true, salt: 'abc', color: '#f2b705', x: 500, y: 200, w: 200, h: 240, rotation: 0, animation: null });
      s2.blocks.push({ id: 'lk2', type: 'lock', codes: ['Roma'], openTo: '', reveal: [], tries: 1, gate: false, salt: 'x', x: 500, y: 200, w: 200, h: 240, rotation: 0, animation: null });
    });
    const open = async html => {
      const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:800px;opacity:0'; D.body.appendChild(f);
      f.srcdoc = html; for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
      return f;
    };
    // The teacher presenting: no gate.
    let f = await open(R.io.buildHTML(R.state.deck, { inApp: true }));
    try { f.contentWindow.Reveal.next(); await sleep(200); eq(f.contentWindow.Reveal.getIndices().h, 1, 'quien presenta pasa sin abrirlo'); } finally { f.remove(); }
    // Self-paced (as a pupil's own copy, the viewer or SCORM): kept on the slide until it is opened.
    f = await open(R.io.buildHTML(R.state.deck, { inApp: true, selfPaced: true }));
    try {
      const W = f.contentWindow, doc = f.contentDocument, key = (el, k) => el.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      assert(W.getComputedStyle(doc.querySelector('[data-lock-hide="lk"]')).visibility === 'hidden', 'el premio, oculto');
      key(doc.body, 'ArrowRight'); await sleep(150); eq(W.Reveal.getIndices().h, 0, 'la flecha no pasa');
      assert(doc.querySelector('.rv-lock-note.on') && /Abre el candado/.test(doc.querySelector('.rv-lock-note').textContent), 'y dice por qué');
      W.Reveal.slide(2); await sleep(300); eq(W.Reveal.getIndices().h, 0, 'ni saltando: vuelve al candado');
      doc.querySelector('[data-lock-id="lk"]').click(); await sleep(50);
      const box = doc.querySelector('.rv-lock-box'), wheels = [...box.querySelectorAll('.rv-w-d')];
      assert(box && /El año/.test(box.textContent), 'el candado se abre con su pista'); eq(wheels.length, 4, 'y cuatro ruedas');
      eq(doc.activeElement, wheels[0], 'el foco en la primera rueda');
      for (const k of '1234') key(doc.activeElement, k);
      eq(wheels.map(x => x.textContent).join(''), '1234', 'se escribe con el teclado, rueda a rueda');
      key(wheels[3], 'Enter'); await sleep(30);
      assert(box.classList.contains('rv-bad') && /Frío, frío/.test(box.querySelector('.rv-lock-msg').textContent), 'mal: se sacude y lo dice');
      eq(W.Reveal.getIndices().h, 0, 'las teclas del candado no mueven la presentación');
      box.querySelectorAll('.rv-wheel')[1].querySelector('.rv-w-b').click();                    // 2 → 3 with its ▲
      key(wheels[1], 'ArrowUp'); wheels[2].focus(); key(wheels[2], '9'); key(wheels[3], 'ArrowDown'); key(wheels[3], 'ArrowDown');
      eq(wheels.map(x => x.textContent).join(''), '1492', 'con las flechas y los botones');
      key(wheels[0], 'Enter'); await sleep(50);
      assert(box.classList.contains('rv-ok') && /¡Abierto!/.test(box.textContent), 'bien: se abre');
      await sleep(1300);
      assert(!doc.querySelector('.rv-lock'), 'y se cierra');
      eq(W.Reveal.getIndices().h, 1, 'lleva a la siguiente');
      assert(doc.querySelector('[data-lock-id="lk"]').classList.contains('rv-open'), 'abierto');
      assert(doc.querySelector('[data-lock-hide="lk"]').classList.contains('rv-unl'), 'el premio, a la vista');
      // A text lock with a single try: accents and capitals don't count; once spent, no more.
      doc.querySelector('[data-lock-id="lk2"]').click(); await sleep(50);
      const b2 = doc.querySelector('.rv-lock-box'), inp = b2.querySelector('.rv-lock-txt');
      inp.value = 'París'; key(inp, 'Enter'); await sleep(30);
      assert(/No quedan intentos/.test(b2.textContent) && inp.disabled, 'se acabaron los intentos');
      key(inp, 'Escape'); await sleep(20); assert(!doc.querySelector('.rv-lock'), 'Esc lo cierra');
      eq(W.rvLock.ask && W.rvLock.open.lk, true, 'recuerda lo abierto');
      W.Reveal.slide(2); await sleep(300); eq(W.Reveal.getIndices().h, 2, 'abierto, ya se puede pasar');
      W.rvLock.ask(doc.querySelector('[data-lock-id="lk2"]')); await sleep(20);
      const b3 = doc.querySelector('.rv-lock-box'); assert(b3.querySelector('.rv-lock-go').disabled, 'sin intentos al volver a abrirlo');
      b3.querySelector('.rv-lock-txt').value = 'roma'; b3.querySelector('.rv-lock-go').click(); await sleep(30);
      assert(!b3.classList.contains('rv-ok'), 'ni con el código bueno');
    } finally { f.remove(); }
  });

  await test('una primera animación «con/después de la anterior» arranca sola al llegar a la diapositiva', async () => {
    const d = R.model.emptyDeck(); R.store.replaceDeck(d); R.slides.addSlide?.();
    const s2 = { ...JSON.parse(JSON.stringify(d.slides[0])), id: 'auto2', blocks: [] };
    const box = (id, start, order, seq) => ({ id, type: 'shape', shape: 'rect', x: 100, y: 100, w: 100, h: 100, fill: '#c00', rotation: 0, animation: { effect: 'fade-in', start, order, seq, duration: 200, delay: 0 } });
    s2.blocks = [box('ra', 'afterPrev', 1, 1), box('rb', 'click', 2, 2)];
    d.slides = [d.slides[0], s2];
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:800px;visibility:hidden'; D.body.appendChild(f);
    try {
      f.srcdoc = R.io.buildHTML(d, { inApp: true });
      for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
      const W = f.contentWindow, frag = id => f.contentDocument.querySelectorAll('[data-rv-id="auto2"] .fragment')[id === 'ra' ? 0 : 1];
      assert(f.contentDocument.querySelector('[data-rv-id="auto2"]').hasAttribute('data-rv-start'), 'marcada');
      W.Reveal.slide(1); await sleep(400);
      assert(frag('ra')?.classList.contains('visible'), 'la primera, sin clic');
      assert(!frag('rb')?.classList.contains('visible'), 'la de clic espera');
      W.Reveal.slide(0); await sleep(100); W.Reveal.slide(1, 0, 1); await sleep(300);
      assert(frag('rb')?.classList.contains('visible'), 'al volver hacia atrás no se repite: todo a la vista');
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

  // ---- Fit to the screen (deck.reveal.fit) ---------------------------------
  const fitDeck = () => {
    const d = R.model.emptyDeck(), s0 = d.slides[0];
    const box = (id, x, y, w, h, o = {}) => ({ id, type: 'shape', shape: 'rect', x, y, w, h, rotation: 0, animation: null, fill: '#e33', ...o });
    const mk = (id, background, blocks) => ({ ...JSON.parse(JSON.stringify(s0)), id, background, blocks });
    d.slides = [mk('fs', '#123456', [box('a', 100, 300, 150, 100), box('b', 1000, 300, 150, 100, { fill: '#3a3' }),
      { id: 'k', type: 'connector', x: 0, y: 0, w: 1280, h: 720, rotation: 0, animation: null, from: 'a', to: 'b', color: '#fff', arrow: true },
      box('g1', 500, 450, 100, 100, { groupId: 'G' }), box('g2', 620, 470, 100, 60, { groupId: 'G' }), box('bar', 0, 600, 1280, 50, { fill: '#fc0' }),
      { id: 'tt', type: 'text', x: 80, y: 60, w: 600, h: 90, rotation: 0, animation: null, html: '<p>Título</p>', fontSize: 48 }]),
      mk('fg', 'linear-gradient(135deg,#1e3c72,#ff7e5f)', [box('c', 600, 300, 80, 80)])];
    return d;
  };

  await test('ajuste a la pantalla: «Adaptar» reparte los objetos por su centro, estira lo que ocupa ≥ 90 %, no crea solapes y no se sale', async () => {
    const F = await frame.contentWindow.eval("import('/src/features/design/screenfit.js')");
    eq(JSON.stringify(F.fitSize(1280, 720, 1920, 1200)), '{"w":1280,"h":800}', '16:10: el mismo ancho, más alto');
    eq(JSON.stringify(F.fitSize(1280, 720, 1024, 768)), '{"w":1280,"h":960}', '4:3');
    eq(JSON.stringify(F.fitSize(1280, 720, 2560, 1080)), '{"w":1707,"h":720}', 'panorámica: la misma altura, más ancho');
    eq(JSON.stringify(F.fitSize(1280, 720, 1920, 1080)), '{"w":1280,"h":720}', '16:9: como está');
    const items = [
      { id: 'title', x: 80, y: 60, w: 700, h: 90, kind: 'text' }, { id: 'a', x: 100, y: 300, w: 150, h: 100 }, { id: 'b', x: 1000, y: 300, w: 150, h: 100 },
      { id: 'bar', x: 0, y: 600, w: 1280, h: 50 }, { id: 'bg', x: 0, y: 0, w: 1280, h: 720 }, { id: 'foot', x: 300, y: 690, w: 400, h: 30 },
      { id: 'g1', x: 500, y: 450, w: 100, h: 100, group: 'G' }, { id: 'g2', x: 620, y: 470, w: 100, h: 60, group: 'G' },
      { id: 'card', x: 900, y: 480, w: 340, h: 120 }, { id: 'inner', x: 920, y: 500, w: 300, h: 60, kind: 'text' },
      { id: 'k', x: 0, y: 0, w: 1280, h: 720, kind: 'conn' }];
    const hit = (p, q) => Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x) > 0.5 && Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y) > 0.5;
    for (const [W2, H2] of [[1280, 800], [1280, 960], [1707, 720]]) {
      const o = F.adaptLayout(items, 1280, 720, W2, H2), at = `${W2}×${H2}`, near = (x, y, m) => assert(Math.abs(x - y) < 0.6, `${at}: ${m} (${x} ≠ ${y})`);
      near(o.a.x + o.a.w / 2, 175 * W2 / 1280, 'el centro va a la misma fracción (x)'); near(o.a.y + o.a.h / 2, 350 * H2 / 720, 'y en vertical');
      eq(`${o.a.w}×${o.a.h}`, '150×100', `${at}: conserva su tamaño`);
      eq(`${o.bar.x},${o.bar.w},${o.bar.h}`, `0,${W2},50`, `${at}: una barra de lado a lado se estira a lo ancho, no a lo alto`);
      eq(`${o.bg.w}×${o.bg.h}`, `${W2}×${H2}`, `${at}: un fondo, a toda la diapositiva`);
      eq(`${o.k.w}×${o.k.h}`, `${W2}×${H2}`, `${at}: un conector abarca la diapositiva (se redibuja)`);
      near(o.foot.y + o.foot.h, H2, 'pegado al borde de abajo, sigue pegado');
      eq(`${Math.round(o.g2.x - o.g1.x)},${Math.round(o.g2.y - o.g1.y)}`, '120,20', `${at}: el grupo se mueve entero`);
      eq(o.inner.w, 300, `${at}: un texto sobre una tarjeta no se ensancha fuera de ella`);
      near(o.title.w, W2 > 1280 ? 700 * W2 / 1280 : 700, 'el título se ensancha con la diapositiva si hay sitio');
      for (const p of items) for (const q of items) if (p !== q && p.kind !== 'conn' && q.kind !== 'conn' && !hit(p, q))
        assert(!hit(o[p.id], o[q.id]), `${at}: ${p.id} y ${q.id} no se solapaban y ahora sí`);
      for (const p of items) { const r = o[p.id]; assert(r.x >= -0.01 && r.y >= -0.01 && r.x + r.w <= W2 + 0.01 && r.y + r.h <= H2 + 0.01, `${at}: ${p.id} dentro`); }
    }
    const big = F.adaptLayout([{ id: 'x', x: 0, y: 10, w: 1100, h: 700 }], 1280, 720, 1280, 720);
    eq(JSON.stringify(big.x), '{"x":0,"y":10,"w":1100,"h":700}', 'en la misma proporción no cambia nada');
    eq(F.fitMode({ reveal: { fit: 'adapt' }, canvas: { on: true }, slides: [] }), 'fill', 'el modo lienzo rellena en lugar de adaptar');
    eq(F.fitMode({ slides: [] }), 'fill', 'por defecto, rellenar con el fondo');
  });

  await test('ajuste a la pantalla: el HTML lleva el modo; la cinta y la configuración lo cambian, con vista previa en tres pantallas', async () => {
    const d = fitDeck(); R.store.replaceDeck(d); R.render();
    let html = R.io.buildHTML();
    assert(/<div class="reveal" data-fit="fill">/.test(html), 'por defecto, rellenar');
    assert(/data-rv-id="fg"/.test(html) && /<section[^>]*data-fill="g"[^>]*data-rv-id="fg"/.test(html), 'el degradado se lleva a las franjas');
    assert(/section\[data-fill=g\]>\.stage\{background:transparent!important\}/.test(html), 'una sola capa de degradado, sin costuras');
    assert(/function screenFitRuntime/.test(html) && /\}\)\("fill", 1280, 720, function fitSize/.test(html), 'con su código');
    assert(!/data-fid=/.test(html), 'sin datos de reparto si no adapta');
    D.querySelector('#ribbon [data-fit]').value = 'bands'; D.querySelector('#ribbon [data-fit]').dispatchEvent(new Event('change'));
    eq(R.state.deck.reveal?.fit, 'bands', 'la lista de la cinta lo guarda');
    html = R.io.buildHTML();
    assert(/data-fit="bands"/.test(html) && /\.reveal-viewport\{background:#000!important\}/.test(html) && !/data-fill=/.test(html), 'franjas negras');
    R.store.commit(() => { R.state.deck.reveal = { fit: 'adapt' }; }); html = R.io.buildHTML();
    assert(/data-fid="tt" data-fb="80,60,600,90" data-fx="text"/.test(html), 'adaptar: cada objeto dice qué es y dónde');
    assert(/data-fid="g1"[^>]*data-fg="G"/.test(html) && /data-fid="k"[^>]*data-fx="conn"[^>]*data-fc="a b "/.test(html), 'grupos y conectores');
    D.querySelector('[data-action="deck-settings"]').click(); await sleep(10);
    const m = D.getElementById('set-modal'), sel = m.querySelector('[data-k="fit"]'), frames = m.querySelectorAll('.fit-prev iframe');
    eq(sel.value, 'adapt', 'la configuración muestra el modo');
    eq([...m.querySelectorAll('.fit-prev figcaption')].map(x => x.textContent).join(), 'Pantalla 16:9,Pantalla 16:10,Pantalla 4:3', 'tres pantallas');
    assert(frames.length === 3 && [...frames].every(f => /data-fit="adapt"/.test(f.srcdoc)), 'vista previa con el modo elegido');
    sel.value = 'fill'; sel.dispatchEvent(new Event('change'));
    assert([...frames].every(f => /data-fit="fill"/.test(f.srcdoc)), 'cambia al elegir otro');
    for (let i = 0; i < 80 && !frames[2].contentWindow?.Reveal?.isReady?.(); i++) await sleep(100);
    const fw = frames[2].contentWindow;
    assert(fw.Reveal?.isReady?.() && !fw.Reveal.isScrollView?.(), 'la vista previa es la presentación (no la vista para móviles)');
    m.querySelector('.set-ok').click(); await sleep(10);
    assert(!R.state.deck.reveal?.fit, 'rellenar es lo de siempre: no se guarda');
    eq(D.querySelector('#ribbon [data-fit]').value, 'fill', 'y la cinta lo refleja');
  });

  await test('ajuste a la pantalla medido en Chrome: 16:9 en 1920×1200, 1440×900 y 1024×768 (negro, relleno, adaptado)', async () => {
    const near = (a, b, d, m) => assert(Math.abs(a - b) <= d, `${m} (${a.toFixed?.(1) ?? a} ≠ ${b.toFixed?.(1) ?? b})`);
    for (const [vw, vh] of [[1920, 1200], [1440, 900], [1024, 768]]) for (const mode of ['bands', 'fill', 'adapt']) {
      const d = fitDeck(); d.reveal = { fit: mode };
      const f = D.createElement('iframe'); f.style.cssText = `position:fixed;left:0;top:0;width:${vw}px;height:${vh}px;visibility:hidden;border:0`; D.body.appendChild(f);
      try {
        f.srcdoc = R.io.buildHTML(d, { inApp: true });
        for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
        await sleep(200);
        const w = f.contentWindow, Rv = w.Reveal, at = `${vw}×${vh} ${mode}`, cs = el => w.getComputedStyle(el);
        const bg = Rv.getSlideBackground(0).getBoundingClientRect(), k = Math.min(vw / 1280, vh / 720), top = (vh - 720 * k) / 2;
        if (mode === 'bands') {
          near(bg.top, top, 1.5, `${at}: el fondo de la diapositiva, solo en ella`); near(bg.height, 720 * k, 1.5, `${at}: alto de la diapositiva`);
          assert(/rgb\(0, 0, 0\)/.test(cs(Rv.getSlideBackground(0)).boxShadow), `${at}: franjas negras alrededor`);
          eq(cs(w.document.querySelector('.reveal-viewport')).backgroundColor, 'rgb(0, 0, 0)', `${at}: y la página, negra`);
        } else if (mode === 'fill') {
          eq([bg.left, bg.top, bg.width, bg.height].map(Math.round).join(), `0,0,${vw},${vh}`, `${at}: el color de la diapositiva llena la pantalla`);
          eq(cs(Rv.getSlideBackground(0)).backgroundColor, 'rgb(18, 52, 86)', `${at}: con su color`);
          assert(/linear-gradient/.test(cs(Rv.getSlideBackground(1).querySelector('.slide-background-content')).backgroundImage), `${at}: el degradado, también`);
          near(w.document.querySelector('[data-rv-id="fs"] .stage').getBoundingClientRect().top, top, 1.5, `${at}: el contenido sigue centrado en su caja`);
        } else {
          const c = Rv.getConfig();
          near(c.width / c.height, vw / vh, 0.01, `${at}: la diapositiva toma la proporción de la pantalla`);
          const st = w.document.querySelector('[data-rv-id="fs"] .stage').getBoundingClientRect();
          eq([st.left, st.top, st.width, st.height].map(Math.round).join(), `0,0,${vw},${vh}`, `${at}: sin franjas`);
          for (const el of w.document.querySelectorAll('[data-rv-id="fs"] [data-fid]')) {
            const r = el.getBoundingClientRect();
            assert(r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1, `${at}: ${el.dataset.fid} dentro de la pantalla`);
          }
          const a = w.document.querySelector('[data-fid="a"]').getBoundingClientRect(), s = vw / c.width;
          near((a.left + a.width / 2) / vw, 175 / 1280, 0.004, `${at}: posición proporcional (x)`); near((a.top + a.height / 2) / vh, 350 / 720, 0.004, `${at}: (y)`);
          near(a.width, 150 * s, 1, `${at}: sin deformar`); near(a.height, 100 * s, 1, `${at}: sin deformar (alto)`);
          const bar = w.document.querySelector('[data-fid="bar"]').getBoundingClientRect(); near(bar.width, vw, 1.5, `${at}: la barra, de lado a lado`);
          const path = w.document.querySelector('[data-fid="k"] svg > path:last-of-type').getAttribute('d'), x1 = +/^M([\d.]+)/.exec(path)[1];
          near(x1, (175 * c.width / 1280) + 75, 1, `${at}: el conector sale del borde de su objeto: ${path}`);
        }
      } finally { f.remove(); }
    }
  });
}
