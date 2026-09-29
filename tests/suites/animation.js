// Animations and transitions: timeline, triggers, motion paths, auto-animate, code steps, rehearsal.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('código: animación por líneas (data-line-numbers) en el export', async () => {
    reset(); R.blocks.addCode(); const b = last(); select(b);
    R.blocks.setCode({ lineSteps: '1|2-3', lang: 'javascript' });
    assert(/data-line-numbers="1\|2-3"/.test(R.io.buildHTML()), 'data-line-numbers con pasos');
  });

  await test('animación: después de la anterior y con la anterior (línea de tiempo)', async () => {
    reset(); const [a, b] = slide().blocks; R.blocks.addShape('rect'); const c = last();
    for (const x of [a, b, c]) { select(x); R.trans.setAnimation('fade-in'); }
    R.trans.setAnimPropForId(a.id, 'duration', 400);
    R.trans.setAnimPropForId(b.id, 'start', 'afterPrev'); R.trans.setAnimPropForId(b.id, 'delay', 100);
    R.trans.setAnimPropForId(c.id, 'start', 'withPrev');
    eq(a.animation.order, 1); eq(b.animation.order, 1, 'misma pulsación'); eq(c.animation.order, 1);
    const tl = R.trans.animTimeline(slide());
    eq(tl.get(b.id).delay, 500, 'empieza al acabar la anterior + retardo');
    eq(tl.get(c.id).delay, 400, 'con la anterior: arranca con ella (su retardo no se hereda, como en PowerPoint)');
    const html = R.io.buildHTML();
    eq((html.match(/data-fragment-index="1"/g) || []).length, 3, 'un solo clic');
    assert(/transition-delay:500ms/.test(html), 'retardo efectivo en el export');
  });

  await test('animación: el giro no anula el movimiento del efecto en el export', async () => {
    reset(); const b = slide().blocks[0]; b.rotation = 15; select(b); R.trans.setAnimation('fade-up');
    const html = R.io.buildHTML();
    assert(/rotate:15deg;/.test(html), 'rotate individual');
    assert(!/transform:rotate\(15deg\)/.test(html), 'sin transform en línea que pise al efecto');
  });

  await test('trayectoria de movimiento: export y guía en el lienzo', async () => {
    reset(); const b = slide().blocks[0]; select(b); R.trans.setAnimation('path');
    eq(b.animation.dx, 200, 'desplazamiento por defecto');
    R.trans.setAnimPropForId(b.id, 'dy', 50); await sleep(10);
    const html = R.io.buildHTML();
    assert(/class="fragment rv-path"/.test(html), 'fragmento de trayectoria');
    assert(/--dx:200px;--dy:50px/.test(html), 'destino');
    assert(/\.fragment\.rv-path\.visible\{translate:var\(--dx\) var\(--dy\)\}/.test(html), 'CSS de trayectoria');
    assert(D.querySelector('#stage .motion-path polyline'), 'guía discontinua en el lienzo');
    R.trans.setAnimPropForId(b.id, 'pathShape', 'arc'); await sleep(10);
    const pts = R.trans.motionPoints(b.animation); eq(pts.at(-1).join(','), '200,50', 'termina en el destino');
    assert(pts.some(([x, y]) => Math.abs(y - x / 4) > 20), 'el arco se separa de la recta');
    const html2 = R.io.buildHTML();
    assert(/class="fragment rv-pathc"/.test(html2) && new RegExp('@keyframes rvP' + b.id).test(html2), 'fotogramas clave del recorrido curvo');
  });

  await test('recorrido dibujado a mano: puntos que se arrastran, añadir y quitar, y giro en el camino', async () => {
    reset(); const W = frame.contentWindow; const b = slide().blocks[0]; select(b);
    const c = [b.x + b.w / 2, b.y + b.h / 2];
    // Draw an S on the slide, starting on the object.
    D.querySelector('[data-action="draw-path"]').click(); await sleep(20);
    const ov = D.querySelector('#stage .path-draw'); assert(ov && /Dibuja el camino/.test(ov.textContent), 'modo dibujo con instrucciones');
    const st = D.getElementById('stage').getBoundingClientRect(), k = st.width / 1280;
    const pe = (el, type, x, y) => el.dispatchEvent(new W.PointerEvent(type, { clientX: st.left + x * k, clientY: st.top + y * k, bubbles: true, pointerId: 1, button: 0 }));
    pe(ov, 'pointerdown', c[0], c[1]);
    for (let i = 1; i <= 50; i++) { const t = i / 50; pe(ov, 'pointermove', c[0] + 600 * t, c[1] + 120 * Math.sin(t * Math.PI * 2)); }
    pe(ov, 'pointerup', c[0] + 600, c[1]); await sleep(30);
    const a = () => slide().blocks[0].animation;
    assert(!D.querySelector('.path-draw') && a()?.effect === 'path' && a().pathShape === 'custom', 'queda como trayectoria dibujada');
    const P = a().points; eq(P[0].join(), '0,0', 'empieza donde está el objeto');
    assert(P.length >= 3 && P.length <= 12, 'pocos puntos, fáciles de ajustar (' + P.length + ')');
    eq([a().dx, a().dy].join(), P.at(-1).join(), 'el destino es el último punto');
    assert(a().duration >= 1200, 'una duración acorde a la distancia');
    const pts = R.trans.motionPoints(a());
    assert(pts.some(([, y]) => y > 80) && pts.some(([, y]) => y < -80), 'la curva pasa por la S dibujada');
    const step = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    assert(Math.max(...step) / Math.min(...step) < 1.3, 'velocidad uniforme por el camino');
    R.store.undo(); await sleep(10); assert(!slide().blocks[0].animation, 'un paso de deshacer'); R.store.redo(); await sleep(10);
    // Drag a point: the path changes (one undo step).
    select(slide().blocks[0]); await sleep(10);
    const hs = () => [...D.querySelectorAll('#stage .mp-h:not(.mid)')];
    eq(hs().length, a().points.length - 1, 'un punto por cada uno (menos el inicio)');
    const h = hs()[0], hr = h.getBoundingClientRect(), p1 = [...a().points[1]];
    const pc = (el, type, x, y) => el.dispatchEvent(new W.PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0 }));
    pc(h, 'pointerdown', hr.left + 5, hr.top + 5); pc(W, 'pointermove', hr.left + 5, hr.top + 5 + 40 * k); pc(W, 'pointerup', hr.left + 5, hr.top + 5 + 40 * k); await sleep(20);
    eq(a().points[1].join(), [p1[0], p1[1] + 40].join(), 'arrastrar un punto lo mueve');
    R.store.undo(); await sleep(10); eq(a().points[1].join(), p1.join(), 'se deshace de una vez');
    // "+" adds a point; a double click removes it.
    select(slide().blocks[0]); await sleep(10);
    const n = a().points.length, mid = D.querySelector('#stage .mp-h.mid'), mr = mid.getBoundingClientRect();
    pc(mid, 'pointerdown', mr.left + 5, mr.top + 5); pc(W, 'pointermove', mr.left + 5, mr.top + 25); pc(W, 'pointerup', mr.left + 5, mr.top + 25); await sleep(20);
    eq(a().points.length, n + 1, '«+» añade un punto');
    hs()[0].dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true })); await sleep(20);
    eq(a().points.length, n, 'doble clic lo quita');
    // Changing the end by number stretches the drawing to it.
    R.trans.setAnimPropForId(b.id, 'dx', a().dx * 2); await sleep(10);
    eq(a().points.at(-1)[0], a().dx, 'el dibujo llega al nuevo destino');
    // Turning on the way: following the path, and whole turns.
    R.trans.setAnimPropForId(b.id, 'turn', 'follow'); R.trans.setAnimPropForId(b.id, 'spin', 360); await sleep(10);
    const fr = R.trans.motionFrames(a());
    eq(fr[0][2], 0, 'empieza con su giro de siempre');
    assert(fr.some(f => Math.abs(f[2] - 360 * fr.indexOf(f) / (fr.length - 1)) > 15), 'sigue las curvas del camino');
    const html = R.io.buildHTML();
    assert(/class="fragment rv-pathc"/.test(html) && new RegExp(`@keyframes rvP${b.id}\\{[^}]*rotate:`).test(html), 'en la presentación gira por el camino');
    R.trans.setAnimPropForId(b.id, 'turn', ''); R.trans.setAnimPropForId(b.id, 'spin', 0); await sleep(10);
    assert(!a().turn && !a().spin, 'sin girar');
    // A 3D object doesn't turn flat: it faces its way (Movimiento 3D).
    const kf = R.trans.pathKeyframesCSS('x', { ...a(), turn: 'follow' }, 0, false); assert(!/rotate/.test(kf), 'un 3D no gira en plano');
    // PowerPoint / LibreOffice keep the drawn shape (and read it back).
    const pp = R.trans.pathFromSVG(`M 0 0 L ${R.trans.motionPoints(a()).slice(1).map(([x, y]) => `${x / 1280} ${y / 720}`).join(' L ')} E`, { w: 1280, h: 720 });
    assert(pp.pathShape === 'custom' && pp.points.length > 2 && Math.abs(pp.dx - a().dx) <= 1, 'importar un recorrido de varios tramos lo conserva');
    eq(JSON.stringify(R.trans.pathFromSVG('M 0 0 L 0.1 0.2 E', { w: 1000, h: 500 })), '{"dx":100,"dy":100}', 'uno de un tramo, recto');
    // Esc cancels drawing.
    D.querySelector('[data-action="draw-path"]').click(); await sleep(10);
    W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(10);
    assert(!D.querySelector('.path-draw'), 'Esc cancela');
  });

  await test('varias animaciones por objeto: una tras otra, encadenadas (moverse, moverse otra vez, girar, clip 3D)', async () => {
    reset(); const W = frame.contentWindow; const b = slide().blocks[0]; select(b);
    const T = R.trans;
    eq(T.addAnimation('fade-in'), 0, 'la primera, como siempre');
    eq(T.addAnimation('path', { dx: 300, dy: 0 }), 1, 'otra más: se añade detrás');
    eq(T.addAnimation('path', { dx: 0, dy: -200 }), 2, 'y otra');
    T.addAnimation('spin360');
    const x = () => slide().blocks[0];
    eq(x().animation.effect, 'fade-in', 'la primera sigue en su sitio');
    eq(x().anims.map(a => a.effect + ':' + a.start).join(), 'path:afterPrev,path:afterPrev,spin360:afterPrev', 'las siguientes, después de la anterior');
    eq(T.animEntries().length, 4, 'cuatro animaciones en la lista');
    // The timeline: one after another in the same click.
    const tl = T.animTimeline();
    eq([b.id, b.id + '#1', b.id + '#2', b.id + '#3'].map(k => tl.get(k).step).join(), '1,1,1,1', 'todo con un clic');
    assert(tl.get(b.id + '#2').delay >= tl.get(b.id + '#1').delay + tl.get(b.id + '#1').dur, 'la segunda trayectoria empieza al acabar la primera');
    eq(T.offsetBefore(x(), 2).join(), '300,0', 'y desde donde la dejó la primera');
    // In the presentation: layers around the object, each its own step.
    const html = R.io.buildHTML();
    const steps = [...html.matchAll(/<div class="rv-step fragment ([\w-]+)"[^>]*transform-origin:(-?\d+)px (-?\d+)px/g)].map(m => m[1]);
    eq(steps.join(), 'spin360,rv-path,rv-path', 'una capa por cada animación siguiente (la última, la de fuera)');
    assert(new RegExp(`--dx:0px;--dy:-200px;--pk:rvP${b.id}_2`).test(html), 'cada una con su recorrido');
    const cx = Math.round(b.x + b.w / 2 + 300), cy = Math.round(b.y + b.h / 2 - 200);
    assert(html.includes(`transform-origin:${cx}px ${cy}px`), 'el giro, sobre donde está el objeto en ese momento');
    // Play it for real: the object ends where the paths add up.
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    R.store.commit(() => { x().animation.duration = 100; x().anims.forEach(a => { a.duration = 150; }); });
    f.srcdoc = R.io.buildHTML(R.state.deck, { inApp: true });
    try {
      for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
      const el = f.contentDocument.querySelector(`[data-id="${b.id}"], .fragment.fade-in`), r0 = el.getBoundingClientRect();
      f.contentWindow.Reveal.next(); await sleep(1200);
      const r1 = el.getBoundingClientRect(), k = r0.width / b.w;
      assert(Math.abs((r1.left - r0.left) / k - 300) < 6 && Math.abs((r1.top - r0.top) / k + 200) < 6, `acaba 300 a la derecha y 200 arriba (${((r1.left - r0.left) / k).toFixed(0)}, ${((r1.top - r0.top) / k).toFixed(0)})`);
    } finally { f.remove(); }
    // The panel: one row per animation; moving and removing one.
    D.querySelector('[data-action="anim-panel"]').click(); await sleep(20);
    const rows = () => [...D.querySelectorAll('#anim-modal .an-row')];
    eq(rows().length, 4, 'una fila por animación');
    assert(/animación 2\/4/.test(rows()[1].textContent), 'se ve cuál es de cada objeto');
    rows()[3].querySelector('[data-move="-1"]').click(); await sleep(10);
    eq(x().anims.map(a => a.effect).join(), 'path,spin360,path', 'se reordenan');
    rows()[2].querySelector('[data-remove]').click(); await sleep(10);
    eq(x().anims.map(a => a.effect).join(), 'path,path', 'se quita una sola');
    D.querySelector('#anim-modal .modal-close').click();
    // The palette: a 3D model's own clips as steps.
    D.querySelector('[data-action="anim-add"]').click(); await sleep(10);
    const menu = D.getElementById('anim-add-menu');
    assert(menu && menu.querySelector('[data-add="spin360"]') && menu.querySelector('[data-add="draw"]'), 'paleta con entradas, énfasis, salidas y movimientos');
    menu.querySelector('[data-add="grow"]').click(); await sleep(10);
    eq(x().anims.at(-1).effect, 'grow', 'se añade la elegida');
    const m3 = { id: 'm3d', type: 'model', src: 'data:model/gltf-binary;base64,AAAA', x: 0, y: 0, w: 100, h: 100, rotation: 0, animation: null };
    R.store.commit(() => { slide().blocks.push(m3); R.state.ui.selection = 'm3d'; R.state.ui.multi = ['m3d']; });
    T.addAnimation('path', { dx: 100 }); T.addAnimation('clip3d', { clip: 'Wave', once: true });
    const h3 = R.io.buildHTML();
    assert(/class="rv-step fragment clip3d"[^>]*data-clip="Wave" data-clip-once/.test(h3), 'clip 3D como paso');
    // Copying animations copies all of them; clearing clears all.
    select(x()); const cp = T.copyAnimationFrom(x());
    eq(cp.more.length, 3, 'el pincel copia todas');
    T.clearAnimation(); assert(!x().animation && !x().anims, 'sin animación: quita todas');
  });

  await test('transformar: botón con su nombre y sugerencia al compartir objetos con la anterior', async () => {
    reset();
    eq(D.querySelector('[data-action="toggle-autoanimate"] span').textContent, 'Transformar', 'el botón se llama Transformar');
    const b = newText(); b.x = 100; R.slides.duplicateSlideCopy?.();
    R.store.commit(() => { const s0 = R.state.deck.slides[0], c = structuredClone(s0); c.id = 'sx'; c.blocks.find(x => x.id === b.id).x = 700; R.state.deck.slides.splice(1, 0, c); R.state.ui.slideIndex = 1; });
    await sleep(20);
    const hint = D.getElementById('morph-hint');
    assert(!hint.hidden, 'si un objeto de la anterior ha cambiado, lo sugiere');
    hint.querySelector('[data-mh="on"]').click(); await sleep(10);
    assert(R.state.deck.slides[1].autoAnimate && hint.hidden, 'un clic lo activa');
    R.store.undo(); await sleep(10); assert(!hint.hidden, 'deshecho, vuelve a sugerirlo');
    hint.querySelector('[data-mh="no"]').click(); await sleep(10);
    assert(hint.hidden && R.state.deck.slides[1].morphHint === false, '«No, gracias» se recuerda');
  });

  await test('pestaña del cuadro de texto: fuente, párrafo y se abre al insertarlo', async () => {
    reset(); const W = frame.contentWindow;
    R.store.commit(() => { R.state.ui.selection = null; R.state.ui.multi = []; }, { history: false }); await sleep(10);
    R.blocks.addText(); await sleep(20);
    const tab = D.querySelector('#ribbon [data-tab="ctx"]'), page = D.querySelector('#ribbon [data-page="ctx"]');
    assert(tab.textContent === 'Cuadro de texto' && R.state.ui.activeTab === 'ctx', 'se abre sola');
    const labels = [...page.querySelectorAll('.group > label')].map(l => l.textContent);
    assert(labels.includes('Fuente') && labels.includes('Párrafo') && labels.includes('Animaciones'), 'con fuente, párrafo y animaciones: ' + labels.join(', '));
    page.querySelector('button[title="Centrar texto"]').click(); await sleep(10);
    eq(last().textAlign, 'center', 'centrar desde la pestaña');
    const cols = [...page.querySelectorAll('select')].find(x => [...x.options].map(o => o.value).join() === '1,2,3');
    cols.value = '2'; cols.dispatchEvent(new W.Event('change')); await sleep(10); eq(last().columns, 2, 'columnas');
  });

  await test('disparador: al hacer clic en un objeto se anima otro', async () => {
    reset(); const [a, b] = slide().blocks; select(b); R.trans.setAnimation('zoom-in');
    R.trans.setAnimPropForId(b.id, 'trigger', a.id);
    eq(R.trans.animTimeline(slide()).size, 0, 'fuera de la secuencia de clics');
    const html = R.io.buildHTML();
    assert(html.includes(`data-bid="${a.id}"`), 'origen clicable');
    assert(new RegExp(`class="rv-trig rv-in" data-trig="${a.id}" data-kf="rvZoom"`).test(html), 'destino con disparador');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.srcdoc = html; document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    try {
      const tgt = f.contentDocument.querySelector('.rv-trig');
      eq(w.getComputedStyle(tgt).opacity, '0', 'oculto al principio');
      f.contentDocument.querySelector(`[data-bid="${a.id}"]`).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      assert(tgt.classList.contains('on') && /rvZoom/.test(tgt.style.animation), 'se reproduce al hacer clic');
    } finally { f.remove(); }
  });

  await test('copiar animación (pincel)', async () => {
    reset(); const [a, b] = slide().blocks; select(a); R.trans.setAnimation('spin');
    R.trans.setAnimPropForId(a.id, 'duration', 900);
    D.querySelector('[data-action="anim-paint"]').click();
    assert(D.body.classList.contains('anim-painting'), 'modo pincel');
    D.querySelector(`#stage .block[data-id="${b.id}"]`).click(); await sleep(10);
    eq(b.animation?.effect, 'spin', 'efecto copiado'); eq(b.animation.duration, 900, 'duración copiada');
    eq(b.animation.order, 2, 'nuevo paso');
    assert(!D.body.classList.contains('anim-painting'), 'sale del modo');
  });

  await test('ensayar intervalos: cronometra y guarda el avance automático', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide(); R.slides.toggleSlideHidden(1);
    R.state.deck.slides[0].autoSlide = 9000;
    R.io.present({ rehearse: true }); await sleep(10);
    const ov = D.getElementById('present-overlay'); assert(ov, 'presentación abierta');
    assert(D.getElementById('rehearse-clock'), 'reloj de ensayo');
    const html = await (await fetch(ov.querySelector('iframe').src)).text();
    assert(!/data-autoslide/.test(html), 'sin avance automático mientras se ensaya');
    D.getElementById('present-close').click(); await sleep(10);
    D.querySelector('.modal-backdrop .modal button:not(.modal-close)')?.click?.();   // cierra el diálogo si lo hay
    R.io.applyRehearsal([3400, 12600]);
    eq(R.state.deck.slides[0].autoSlide, 3000, 'primera: 3 s');
    eq(R.state.deck.slides[1].autoSlide ?? 0, 0, 'oculta: sin cambios');
    eq(R.state.deck.slides[2].autoSlide, 13000, 'segunda visible: 13 s');
  });

  await test('entrenador de oratoria: ritmo, muletillas, repeticiones y lectura de la diapositiva', async () => {
    const W = frame.contentWindow;
    const C = await W.eval("import('/src/features/live/coach.js')");
    eq(JSON.stringify(C.countFillers('Bueno, eh, o sea, esto es... eh, bueno vale', 'es')), '{"eh":2,"o sea":1,"bueno":2,"vale":1}', 'muletillas en español');
    eq(JSON.stringify(C.countFillers('Um, you know, it is like, basically done', 'en')), '{"um":1,"like":1,"you know":1,"basically":1}', 'en inglés');
    assert(!Object.keys(C.countFillers('Estepona es preciosa', 'es')).length, 'solo palabras enteras');
    const said = 'la energía solar es barata la energía solar es limpia y la energía solar es el futuro';
    const r = C.analyzeRehearsal({ lang: 'es', times: [60000, 30000],
      slideTexts: ['Energía solar', 'Los paneles convierten la luz del sol en electricidad sin ruido alguno'],
      segments: [{ text: said, t: 5000, slide: 0 }, { text: 'eh pues los paneles convierten la luz del sol en electricidad sin ruido alguno', t: 70000, slide: 1 }] });
    eq(r.words, 17 + 14, 'palabras'); eq(r.wpm, Math.round(31 / 1.5), 'ritmo medio'); eq(r.pace, 'slow', 'lento');
    eq(r.perSlide[1].wpm, 28, 'ritmo por diapositiva');
    eq(r.fillerCount, 2, 'muletillas (eh, pues)');
    eq(r.repeated[0]?.phrase, 'la energía solar es', 'expresión repetida (la más larga)'); eq(r.repeated.length, 1, 'sin sus trozos'); eq(r.repeated[0].n, 3);
    eq(JSON.stringify(r.read), '[1]', 'lee la diapositiva 2 palabra por palabra');
    eq(C.recentPace([{ text: 'uno dos tres cuatro cinco seis siete ocho nueve diez', t: 20000, t0: 10000 }], 20000), 60, 'ritmo reciente');

    // In the editor, with a stand-in for the browser's speech recognition.
    reset(); R.slides.addSlide();
    W.SpeechRecognition = function () { W.__rec = this; this.start = () => { this.started = true; }; this.stop = () => { this.started = false; }; };
    D.querySelector('[data-action="coach"]').click(); await sleep(20);
    const ok = D.querySelector('.dlg-ok'); assert(ok && /servicio de voz/.test(D.querySelector('.dlg-msg').textContent), 'avisa de adónde va el audio'); ok.click(); await sleep(50);
    assert(W.__rec?.started && W.__rec.lang === 'es-ES' && W.__rec.continuous, 'escucha en español');
    const res = (txt, fin) => { const x = [{ transcript: txt }]; x.isFinal = fin; return x; };
    W.__rec.onresult({ resultIndex: 0, results: [res('hola a todos eh bienvenidos', true)] });
    const live = D.getElementById('coach-live'); assert(live && /1 muletillas/.test(live.textContent) && /«eh»/.test(live.textContent), 'panel en directo: ' + live?.textContent);
    await sleep(1100);
    D.getElementById('present-close').click(); await sleep(30);
    assert(!W.__rec.started, 'deja de escuchar al salir');
    const rep = D.getElementById('coach-modal'); assert(rep && /Informe del entrenador/.test(rep.textContent), 'informe al terminar');
    assert(/eh ×1/.test(rep.textContent), 'muletillas en el informe');
    rep.querySelector('.coach-save').click();
    assert(R.state.deck.slides[0].autoSlide >= 1000, 'guarda los intervalos');
    delete W.SpeechRecognition;
  });

  await test('presentar en una videollamada: ventana aparte para compartir en Meet o Teams', async () => {
    reset(); R.state.deck.name = 'Charla'; const W = frame.contentWindow, real = W.open; let opened = null;
    W.open = (url, name, feat) => { opened = { url, name, feat }; return { closed: false, focus() {} }; };
    try {
      D.querySelector('[data-action="present-call"]').click(); await sleep(10);
      const m = D.getElementById('call-modal'); assert(m && /Google Meet/.test(m.textContent) && /Teams/.test(m.textContent), 'instrucciones para Meet y Teams');
      m.querySelector('.call-open').click(); await sleep(10);
      assert(opened && opened.name === 'revela-present' && /popup/.test(opened.feat), 'abre una ventana aparte');
      const html = await (await fetch(opened.url)).text();
      assert(/Reveal\.initialize/.test(html) && /<title>Charla/.test(html), 'con la presentación (y su nombre como título de la ventana)');
      assert(!D.getElementById('call-modal'), 'el diálogo se cierra');
      W.open = () => null; D.querySelector('[data-action="present-call"]').click(); await sleep(10);
      D.querySelector('#call-modal .call-open').click(); await sleep(10);
      assert(/ventanas emergentes/.test(D.querySelector('.dlg-msg')?.textContent || ''), 'si el navegador la bloquea, lo explica');
      D.querySelector('.dlg-ok').click(); D.querySelector('#call-modal .modal-close').click();
    } finally { W.open = real; }
  });

  await test('transición: salida distinta, velocidad por diapositiva y aplicar a todas', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0);
    R.trans.setSlideTransition('fade');
    D.querySelector('[data-slide-trans-out]').value = 'zoom'; D.querySelector('[data-slide-trans-out]').dispatchEvent(new Event('change'));
    D.querySelector('[data-slide-speed]').value = 'slow'; D.querySelector('[data-slide-speed]').dispatchEvent(new Event('change'));
    const html = R.io.buildHTML();
    assert(/<section data-transition="fade-in zoom-out" data-transition-speed="slow"/.test(html), 'entrada/salida y velocidad');
    R.trans.applyTransitionToAll();
    const s2 = R.state.deck.slides[1];
    eq([s2.transition, s2.transitionOut, s2.transitionSpeed].join(','), 'fade,zoom,slow', 'copiada a todas');
  });

  await test('transiciones nuevas: voltear, empujar, barrido, elevar', async () => {
    reset(); R.slides.addSlide(); R.slides.goToSlide(0); R.trans.setSlideTransition('flip');
    R.slides.goToSlide(1); R.trans.setSlideTransition('wipe');
    const html = R.io.buildHTML();
    assert(/section\[data-transition=flip\]\.past/.test(html), 'CSS de voltear');
    assert(/@property --rvt/.test(html) && /section\[data-transition=wipe\]\.future[^{]*\{--rvt:0;opacity:1;clip-path:polygon\(/.test(html), 'CSS de barrido');
    assert(!/data-transition=rise\]/.test(html), 'solo las usadas');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    try {
      const secs = f.contentDocument.querySelectorAll('.slides>section');
      assert(/polygon/.test(w.getComputedStyle(secs[1]).clipPath), 'la siguiente espera recortada (barrido)');
      w.Reveal.next(); await sleep(50);
      assert(/polygon\(evenodd/.test(w.getComputedStyle(secs[0]).clipPath), 'la anterior sale con el barrido de la siguiente (como PowerPoint)');
    } finally { f.remove(); }
  });

  await test('transiciones con opciones de efecto: dirección, dividir, círculo y rombo', async () => {
    reset(); for (let i = 0; i < 4; i++) R.slides.addSlide();
    const sel = D.querySelector('[data-slide-trans-dir]'), shown = () => [...sel.options].filter(o => !o.hidden).map(o => o.value).join();
    R.slides.goToSlide(1); R.trans.setSlideTransition('wipe'); await sleep(10);
    assert(!sel.disabled, 'opciones activas para el barrido'); eq(shown(), 'right,left,bottom,top', 'cuatro direcciones'); eq(sel.value, 'right', 'por defecto desde la derecha');
    sel.value = 'top'; sel.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true })); await sleep(10);
    eq(slide().transitionDir, 'top', 'guardada');
    R.slides.goToSlide(2); R.trans.setSlideTransition('split'); R.trans.setSlideTransOptions({ transitionDir: 'horizontal' }); await sleep(10);
    eq(shown(), 'vertical,horizontal', 'dividir: vertical u horizontal');
    R.slides.goToSlide(3); R.trans.setSlideTransition('circle'); await sleep(10);
    assert(sel.disabled, 'el círculo no tiene opciones');
    R.slides.goToSlide(4); R.trans.setSlideTransition('push'); R.trans.setSlideTransOptions({ transitionDir: 'left' });
    const html = R.io.buildHTML();
    for (const n of ['wipe-top', 'split-horizontal', 'circle', 'push-left']) assert(new RegExp(`data-transition="${n}(-in [a-z-]+-out)?"`).test(html), 'diapositiva con ' + n);
    assert(html.includes('data-transition="wipe-top-in split-horizontal-out"'), 'la anterior sale con la forma de la siguiente');
    assert(/section\[data-transition=circle\]\.past[^{]*\{--rvt:0;opacity:1;clip-path:polygon\(evenodd/.test(html), 'la anterior guarda el resto (hueco con la misma forma)');
    assert(/section\[data-transition=push-left\]\.future[^{]*\{transform:translate3d\(-100%,0,0\)/.test(html), 'empujar desde la izquierda');
    // At the presentation: halfway through, the new slide is partly shown.
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;visibility:hidden'; D.body.appendChild(f);
    f.srcdoc = R.io.buildHTML(R.state.deck, { inApp: true });
    try {
      let w; for (let i = 0; i < 100 && !((w = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
      w.Reveal.slide(2); await sleep(1200);
      const secs = f.contentDocument.querySelectorAll('.slides>section');
      w.Reveal.next(); await sleep(250);
      const v = +w.getComputedStyle(secs[3]).getPropertyValue('--rvt');
      assert(v > 0.05 && v < 0.99, 'el círculo va creciendo: ' + v);
      await sleep(1200);
      eq(+w.getComputedStyle(secs[3]).getPropertyValue('--rvt'), 1, 'al final se ve entera');
    } finally { f.remove(); }
    // PowerPoint (dir = hacia dónde se mueve, como lo escribe LibreOffice) y ODP, de ida y vuelta.
    const blob = await R.pptx.buildPptxBlob(), zip = await frame.contentWindow.JSZip.loadAsync(blob);
    const x = async i => zip.file(`ppt/slides/slide${i}.xml`).async('string');
    assert((await x(2)).includes('<p:wipe dir="d"/>') && (await x(3)).includes('<p:split orient="horz" dir="out"/>'), 'barrido desde arriba y dividir horizontal');
    assert((await x(4)).includes('<p:circle/>') && (await x(5)).includes('<p:push dir="r"/>'), 'círculo y empujar desde la izquierda');
    const back = await R.pptxImport.importPPTX(new File([blob], 't.pptx'));
    eq(back.slides.slice(1).map(s => s.transition + ':' + (s.transitionDir || '')).join(' '), 'wipe:top split:horizontal circle: push:left', 'PowerPoint de vuelta');
    const od = await R.odp.importODP(new File([await R.odp.buildODP()], 't.odp'));
    eq(od.slides.slice(1).map(s => s.transition + ':' + (s.transitionDir || '')).join(' '), 'wipe:top split:horizontal circle: push:left', 'ODP de vuelta');
  });

  await test('código: pasos de resaltado visuales, desplazamiento, numeración y animación', async () => {
    reset();
    const { parseSteps, stringifySteps } = await frame.contentWindow.eval("import('/src/ui/dialogs/code.js')");
    eq(JSON.stringify(parseSteps('1,3-4|5|')), '[[1,3,4],[5],[]]', 'leer pasos'); eq(stringifySteps([[4, 1, 2, 3], [7], [9, 11]]), '1-4|7|9,11', 'escribir pasos');
    D.querySelector('[data-action="insert-code"]').click(); await sleep(20);
    const b = last(); assert(D.getElementById('code-modal'), 'al insertar se abre el editor de código');
    const q = s => D.querySelector('#code-modal ' + s);
    q('.cd-code').value = 'a = 1\nb = 2\nc = 3\nprint(a + b + c)'; q('.cd-code').dispatchEvent(new Event('input'));
    q('.cd-lang').value = 'python';
    q('input[data-s="0"][data-l="1"]').click(); q('input[data-s="0"][data-l="2"]').click();
    q('.cd-add').click(); q('input[data-s="1"][data-l="4"]').click();
    q('.cd-all').checked = true; q('.cd-start').value = '10';
    q('.cd-ok').click(); await sleep(10);
    eq(b.lineSteps, '|1-2|4', 'pasos guardados'); eq(b.lang, 'python', 'lenguaje'); eq(b.lineStart, 10, 'línea inicial');
    R.trans.setAnimation('fade-up');
    let html = R.io.buildHTML();
    assert(/<code class="language-python" data-trim data-line-numbers="\|1-2\|4" data-ln-start-from="10">/.test(html), 'atributos de reveal.js');
    assert(/class="fragment fade-up rv-code"/.test(html), 'animación y clase propia en un solo class');
    assert(/\.rv-code pre code\{max-height:100%/.test(html), 'el bloque se desplaza dentro de su caja');
    R.slides.toggleAutoAnimate(); html = R.io.buildHTML();
    assert(new RegExp(`<pre data-id="code-${b.id}"`).test(html), 'animación de código entre diapositivas (Morph)');
    let code; for (let i = 0; i < 40 && !(code = D.querySelector(`.block[data-id="${b.id}"] code.hljs`)); i++) await sleep(100);
    assert(code, 'coloreado de sintaxis en el editor');
  });

  await test('panel de animación: efecto, con la anterior y duración', async () => {
    reset(); R.blocks.addText(); const a = slide().blocks.at(-1); R.state.ui.selection = a.id; R.trans.setAnimation('fade-up');
    R.blocks.addText(); const b2 = slide().blocks.at(-1); R.state.ui.selection = b2.id; R.trans.setAnimation('zoom-in');
    R.trans.setAnimPropForId(b2.id, 'start', 'withPrev');
    R.trans.setAnimPropForId(a.id, 'duration', 800);
    const html = R.io.buildHTML();
    assert(/class="fragment fade-up"/.test(html) && /class="fragment zoom-in"/.test(html), 'efectos aplicados');
    assert(/transition-duration:800ms/.test(html), 'duración en el export');
    const idxs = [...html.matchAll(/data-fragment-index="(\d+)"/g)].map(m => m[1]);
    assert(idxs.length >= 2 && idxs[0] === idxs[1], '"con la anterior" comparte índice de fragmento');
  });

  await test('animación de énfasis en el export', async () => {
    reset(); const b = newText(); R.state.ui.selection = b.id;
    b.animation = { effect: 'grow', order: 1 };
    assert(/class="fragment grow"/.test(R.io.buildHTML()), 'clase de fragmento grow');
  });

  await test('auto-animate: data-auto-animate y data-id en el export', async () => {
    reset(); const b = newText(); slide().autoAnimate = true;
    const html = R.io.buildHTML();
    assert(/<section[^>]*data-auto-animate/.test(html), 'sección con data-auto-animate');
    assert(new RegExp(`data-id="${b.id}"`).test(html), 'bloque con data-id');
  });

  await test('duplicar animando conserva los ids de los bloques', async () => {
    reset(); const b = newText(); R.slides.duplicateForAnimate();
    const s0 = R.state.deck.slides[0], s1 = R.state.deck.slides[1];
    assert(s0.autoAnimate && s1.autoAnimate, 'ambas con auto-animate');
    assert(s1.blocks.some(x => x.id === b.id), 'la copia conserva el id del bloque');
  });

  await test('auto-animate (morph): ambas secciones marcadas y mismo data-id', async () => {
    reset(); const b = newText(); b.x = 100; R.slides.duplicateForAnimate();
    const cb = R.state.deck.slides[1].blocks.find(x => x.id === b.id); cb.x = 900;
    const html = R.io.buildHTML();
    assert([...html.matchAll(/<section[^>]*data-auto-animate/g)].length >= 2, 'ambas con data-auto-animate');
    assert([...html.matchAll(new RegExp(`data-id="${b.id}"`, 'g'))].length >= 2, 'mismo data-id en ambas diapositivas');
  });

  await test('efecto personalizado (spin) se anima en el export', async () => {
    reset(); const b = newText(); R.state.ui.selection = b.id; R.trans.setAnimation('spin');
    const html = R.io.buildHTML();
    assert(/class="fragment spin"/.test(html), 'clase spin'); assert(/@keyframes rvSpin/.test(html), 'keyframes en el export');
  });

  await test('zoom de resumen crea una miniatura por diapositiva', async () => {
    reset(); R.slides.addSlide(); R.slides.addSlide();
    const n0 = slide().blocks.length; R.blocks.addSummaryZoom();
    const added = slide().blocks.slice(n0).filter(x => x.type === 'slideref');
    eq(added.length, 2, 'una miniatura por cada otra diapositiva');
  });

  await test('avance automático por diapositiva en el export', async () => {
    reset(); slide().autoSlide = 5000;
    assert(/<section[^>]*data-autoslide="5000"/.test(R.io.buildHTML()), 'sin data-autoslide');
  });

  // ---- Morph (auto-animate) like PowerPoint's -------------------------------------
  const presentDeck = async (deck, from) => {
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    f.srcdoc = R.io.buildHTML(deck, { inApp: true });
    for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
    f.contentWindow.Reveal.slide(from); await sleep(150);
    let fired = 0; f.contentWindow.Reveal.on('autoanimate', () => { fired++; });
    f.contentWindow.Reveal.next(); await sleep(150);
    const targets = [...f.contentDocument.querySelectorAll('[data-auto-animate-target]')].map(e => e.textContent.trim());
    f.remove(); return { fired, targets };
  };

  await test('transformar: basta con activarlo en la diapositiva de destino y empareja objetos creados por separado', async () => {
    reset(); R.slides.addSlide('titleContent'); const a = slide(); a.blocks[0].html = 'Mi título'; a.blocks[1].html = 'Uno';
    R.slides.addSlide('titleContent'); const b = slide(); b.blocks[0].html = 'Mi título'; b.blocks[0].x = 400; b.blocks[0].y = 500; b.blocks[1].html = 'Otra cosa';
    R.slides.toggleAutoAnimate();
    const plan = R.io.morphPlan(R.state.deck);
    assert(plan.marked.has(a.id) && plan.marked.has(b.id), 'la anterior se marca sola');
    eq(plan.key(b, b.blocks[0]), plan.key(a, a.blocks[0]), 'mismo texto → mismo objeto');
    eq(plan.key(b, b.blocks[1]), plan.key(a, a.blocks[1]), 'mismo marcador (cuerpo con cuerpo) aunque cambie el texto');
    const r = await presentDeck(R.state.deck, 1);
    assert(r.fired === 1 && r.targets.includes('Mi título'), 'al presentar se transforma: ' + JSON.stringify(r));
  });

  await test('transformar por palabras y por caracteres', async () => {
    reset(); R.slides.addSlide('blank'); const a = slide(); a.blocks.push({ id: 'ta', type: 'text', x: 100, y: 100, w: 1000, h: 100, rotation: 0, animation: null, fontSize: 40, html: 'Revela hace presentaciones <b>bonitas</b>' });
    R.slides.addSlide('blank'); const b = slide(); b.blocks.push({ id: 'tb', type: 'text', x: 100, y: 400, w: 1000, h: 100, rotation: 0, animation: null, fontSize: 60, html: 'presentaciones bonitas hace Revela' });
    R.slides.setMorphBy('words');
    eq(slide().morphBy, 'words'); assert(slide().autoAnimate, 'activa la transformación');
    const html = R.io.buildHTML();
    assert(/<span class="rv-m" data-id="w:Revela:1">Revela<\/span>/.test(html), 'cada palabra con su identificador');
    assert(/<b><span class="rv-m" data-id="w:bonitas:1">bonitas<\/span><\/b>/.test(html), 'sin perder el formato: ' + (html.match(/.{60}bonitas.{40}/) || [''])[0]);
    const r = await presentDeck(R.state.deck, 1);
    for (const w of ['Revela', 'hace', 'presentaciones', 'bonitas']) assert(r.targets.includes(w), 'la palabra se desplaza: ' + w + ' ' + JSON.stringify(r.targets));
    R.slides.setMorphBy('chars');
    const h2 = R.io.buildHTML();
    assert(/<span style="white-space: nowrap;"><span class="rv-m" data-id="c:R:1">R<\/span>/.test(h2), 'por caracteres, sin partir palabras');
    const r2 = await presentDeck(R.state.deck, 1);
    assert(r2.targets.filter(x => x.length === 1).length >= 20, 'las letras se desplazan: ' + r2.targets.length);
    D.querySelector('[data-morphby]').value = 'objects'; D.querySelector('[data-morphby]').dispatchEvent(new frame.contentWindow.Event('change'));
    assert(!slide().morphBy, 'volver a objetos desde la cinta');
  });
}
