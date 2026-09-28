// Presenting: full-screen overlay, reveal.js options, ink, live captions, polls, live data, phone remote.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('presentar: crea una capa a pantalla completa y se cierra', async () => {
    reset(); R.io.present(); await sleep(40);
    const ov = D.getElementById('present-overlay');
    assert(ov && ov.querySelector('iframe'), 'no se creó la capa de presentación');
    ov.querySelector('#present-close').click(); await sleep(20);
    assert(!D.getElementById('present-overlay'), 'la capa no se cerró');
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
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      assert(!w.__ink.captionsOn && !w.__rec.started, 'C los apaga');
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
}
