// Animations and transitions: timeline, triggers, motion paths, auto-animate, code steps, rehearsal.

export default async function ({ R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText }) {
  await test('transiciones nuevas: cubo, cubrir, página, galería, caer, desde arriba, remolino, encoger, desenfocar y destello', async () => {
    reset(); const T = await frame.contentWindow.eval("import('/src/features/animation/transitions.js')");
    const names = ['cube', 'cover', 'page', 'gallery', 'fall', 'drop', 'swirl', 'shrink', 'blur', 'flash'];
    assert(names.every(n => T.CUSTOM_TRANSITIONS[n]), 'cada una definida');
    assert(names.every(n => D.querySelector(`[data-slide-transition="${n}"]`)), 'en la cinta');
    R.slides.addSlide('blank'); await sleep(10); R.trans.setSlideTransition('blur'); await sleep(10);
    const html = R.io.buildHTML();
    assert(/data-transition="blur"/.test(html) && /filter:blur\(18px\)/.test(html) && /transition-property:[^}]*filter/.test(html), 'desenfocar: con su filtro animado');
    const blob = await R.pptx.buildPptxBlob(), zip = await frame.contentWindow.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide2.xml').async('string');
    assert(/<p:dissolve\/>/.test(xml), 'en PowerPoint, su equivalente (disolver)');
  });

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
    const rows = () => [...D.querySelectorAll('#anim-pane .an-row')];
    eq(rows().length, 4, 'una fila por animación');
    assert(/2\/4/.test(rows()[1].textContent), 'se ve cuál es de cada objeto');
    rows()[3].click(); await sleep(10); D.querySelector('#anim-pane [data-shift="-1"]').click(); await sleep(10);
    eq(x().anims.map(a => a.effect).join(), 'path,spin360,path', 'se reordenan');
    rows()[2].querySelector('[data-remove]').click(); await sleep(10);
    eq(x().anims.map(a => a.effect).join(), 'path,path', 'se quita una sola');
    D.querySelector('#anim-pane .cm-close').click();
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

  await test('transformar como PowerPoint: empareja por nombre, y un objeto girado gira (también al volver atrás)', async () => {
    reset(); R.slides.addSlide('blank'); const a = slide();
    const arrow = (id, name, x, rot) => ({ id, type: 'shape', shape: 'rightarrow', x, y: 300, w: 200, h: 60, rotation: rot, animation: null, fill: '#70ad47', morphName: name });
    a.blocks.push(arrow('a8', 'Flecha 8', 100, 0), arrow('a26', 'Flecha 26', 600, 270));
    R.slides.addSlide('blank'); const b = slide(); b.autoAnimate = true; b.aaDuration = 0.3;
    b.blocks.push(arrow('b18', 'Flecha 18', 900, 0), arrow('b26', 'Flecha 26', 300, 270), arrow('b8', 'Flecha 8', 100, 0));
    const plan = R.io.morphPlan(R.state.deck);
    eq(plan.key(b, b.blocks.find(x => x.id === 'b26')), plan.key(a, a.blocks.find(x => x.id === 'a26')), 'la flecha hacia arriba con la de su mismo nombre (no con la primera igual)');
    eq(plan.key(b, b.blocks.find(x => x.id === 'b8')), plan.key(a, a.blocks.find(x => x.id === 'a8')), 'y la recta con la suya');
    assert(![plan.key(a, a.blocks[0]), plan.key(a, a.blocks[1])].includes(plan.key(b, b.blocks.find(x => x.id === 'b18'))), 'la nueva aparece (sin pareja)');
    // Turned on one, straight on the next: it turns there — and back.
    b.blocks.find(x => x.id === 'b26').rotation = 0;
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    try {
      f.srcdoc = R.io.buildHTML(R.state.deck, { inApp: true });
      for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
      const RV = f.contentWindow.Reveal, last = RV.getTotalSlides() - 1, key = plan.key(a, a.blocks.find(x => x.id === 'a26'));
      const el = () => f.contentDocument.querySelector(`section.present [data-id="${key}"]`);
      const turn = () => { const cs = f.contentWindow.getComputedStyle(el()), m = new f.contentWindow.DOMMatrix(cs.transform === 'none' ? undefined : cs.transform), r = parseFloat(cs.rotate) || 0;
        return Math.round((((Math.atan2(m.b, m.a) * 180 / Math.PI) + r) % 360 + 360) % 360); };
      RV.slide(last - 1); await sleep(200); eq(turn(), 270, 'antes: hacia arriba');
      RV.slide(last); await sleep(600); eq(turn(), 0, 'después: recta');
      RV.slide(last - 1); await sleep(1400); eq(turn(), 270, 'al volver atrás: hacia arriba otra vez (antes se quedaba recta)');
      const r = el().getBoundingClientRect(); assert(r.height > r.width, 'y en su sitio, de pie: ' + JSON.stringify([r.width, r.height]));
    } finally { f.remove(); }
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

  await test('Transformar coherente: es una transición más, el texto artístico viaja con su degradado, y un objeto con su propia entrada no se desliza (y se dice)', async () => {
    // AURA: its gold title glides from the cover — the gold on the text that moves, not on its still frame.
    const d = await R.examples.loadExample('product_watch', 'es'); R.store.replaceDeck(d); await sleep(30);
    const doc = new DOMParser().parseFromString(R.io.buildHTML(), 'text/html');
    const s2 = doc.querySelectorAll('.slides > section')[1], mt = [...s2.querySelectorAll('.rv-mt')].find(e => /AURA/.test(e.textContent));
    assert(mt && /background-clip:\s*text/.test(mt.getAttribute('style')) && !/background-clip/.test(mt.parentElement.getAttribute('style')), 'el degradado va en el texto que se desliza');
    // Morph and the other transitions: choosing one takes the other off; its options off while Morph is on.
    reset(); R.slides.addSlide(); R.slides.goToSlide(1); R.render(); await sleep(10);
    R.trans.setSlideTransition('convex'); R.slides.toggleAutoAnimate(); await sleep(10);
    assert(slide().autoAnimate && !slide().transition, 'Transformar sustituye a la transición que tenía');
    D.querySelector('[data-tab="transitions"]')?.click(); await sleep(20);
    assert(!D.querySelector('#ribbon [data-slide-transition="convex"]').classList.contains('on') && D.querySelector('[data-slide-speed]').disabled, 'ninguna otra transición marcada, y su velocidad no se usa');
    R.trans.setSlideTransition('fade'); await sleep(10);
    assert(!slide().autoAnimate && slide().transition === 'fade', 'elegir otra transición quita Transformar');
    D.querySelector('[data-tab="home"]')?.click();
    // An object that is on both slides but enters by itself: it doesn't glide (it would show before its entrance), and the pane says why.
    reset(); const t1 = slide().blocks[0]; R.store.commit(() => { t1.html = 'Mismo'; });
    R.slides.duplicateForAnimate(); await sleep(10);
    const t2 = slide().blocks.find(b => b.id === t1.id); select(t2); R.trans.setAnimation('fade-in'); await sleep(10);
    const M = await frame.contentWindow.eval("import('/src/features/animation/morph.js')");
    eq(M.morphConflict(R.state.deck, slide(), t2), 'entrance', 'no se desliza: entra con su animación');
    const plan = R.io.morphPlan(R.state.deck); assert(plan.key(slide(), t2) !== plan.key(R.state.deck.slides[0], t1), 'con otro id que la de antes (no se emparejan)');
    D.querySelector('[data-action="anim-panel"]').click(); await sleep(30);
    assert(/entra con su animación/.test(D.querySelector('#anim-pane .an-clash')?.textContent || ''), 'el panel lo explica');
    D.querySelector('#anim-pane .cm-close').click();
    R.trans.clearAnimationForId(t2.id); eq(M.morphConflict(R.state.deck, slide(), t2), null, 'sin la animación, se desliza');
  });

  await test('panel de animación: al lado de la diapositiva, varias a la vez, se arrastran juntas y se cambian juntas', async () => {
    reset(); R.slides.addSlide('blank'); await sleep(10);
    for (let k = 0; k < 4; k++) R.blocks.addShape('rect');
    const bs = slide().blocks;
    for (const b of bs) { select(b); R.trans.setAnimation('fade-in'); }
    const W = frame.contentWindow, rows = () => [...D.querySelectorAll('#anim-pane .an-row')], ids = () => rows().map(r => r.dataset.id).join();
    D.querySelector('[data-action="anim-panel"]').click(); await sleep(30);
    const pane = D.getElementById('anim-pane'), st = D.getElementById('canvas-wrap').getBoundingClientRect(), pr = pane.getBoundingClientRect();
    assert(pane && !D.querySelector('.modal-backdrop'), 'un panel, no una ventana encima');
    assert(pr.left >= st.right - 1 || pr.top >= st.bottom - 1, 'no tapa la diapositiva');
    eq(rows().length, 4, 'una fila por animación');
    // Pasar por encima de una fila marca su objeto en la diapositiva.
    rows()[2].dispatchEvent(new W.MouseEvent('mouseenter'));
    assert(D.querySelector(`#stage .block[data-id="${bs[2].id}"]`).classList.contains('anim-hover'), 'se ve qué objeto es');
    rows()[2].dispatchEvent(new W.MouseEvent('mouseleave'));
    // Clic: elige y selecciona su objeto; Ctrl: varias.
    rows()[0].click(); await sleep(10);
    eq(R.state.ui.selection, bs[0].id, 'selecciona el objeto');
    rows()[2].dispatchEvent(new W.MouseEvent('click', { bubbles: true, ctrlKey: true })); await sleep(10);
    eq(rows().filter(r => r.classList.contains('on')).length, 2, 'dos elegidas');
    assert(R.store.isSelected(bs[0].id) && R.store.isSelected(bs[2].id), 'y sus dos objetos');
    // Cambiar a la vez.
    const dur = D.querySelector('#anim-pane .an-detail [data-p="duration"]'); dur.value = '1200'; dur.dispatchEvent(new W.Event('change')); await sleep(10);
    eq([bs[0], bs[1], bs[2]].map(b => b.animation.duration).join(), '1200,500,1200', 'la duración, en las dos');
    // Bajar las dos juntas.
    D.querySelector('#anim-pane [data-shift="1"]').click(); await sleep(10);
    eq(ids(), [bs[1], bs[0], bs[2], bs[3]].map(b => b.id).join(), 'bajan juntas, seguidas');
    R.store.undo(); await sleep(10); eq(ids(), bs.map(b => b.id).join(), 'un paso de deshacer');
    // Arrastrar las elegidas detrás de la última.
    rows()[0].click(); await sleep(10); rows()[1].dispatchEvent(new W.MouseEvent('click', { bubbles: true, shiftKey: true })); await sleep(10);
    const dt = new W.DataTransfer(), last = rows()[3], r = last.getBoundingClientRect();
    rows()[0].dispatchEvent(new W.DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    last.dispatchEvent(new W.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: r.bottom - 2 }));
    last.dispatchEvent(new W.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    await sleep(10);
    eq(ids(), [bs[2], bs[3], bs[0], bs[1]].map(b => b.id).join(), 'arrastradas juntas al final');
    // Quitar las elegidas.
    D.querySelector('#anim-pane .an-del').click(); await sleep(10);
    eq(rows().length, 2, 'quitadas las dos'); const now = id => slide().blocks.find(b => b.id === id); assert(!now(bs[0].id).animation && !now(bs[1].id).animation && now(bs[2].id).animation, 'de sus objetos');
    D.querySelector('#anim-pane .cm-close').click(); await sleep(10);
    assert(!D.getElementById('anim-pane'), 'se cierra');
  });

  await test('sonido en las animaciones: elegido en el panel, suena al presentar', async () => {
    reset(); const b = slide().blocks[0]; select(b); R.trans.setAnimation('fade-in');
    D.querySelector('[data-action="anim-panel"]').click(); await sleep(20);
    const sel = D.querySelector('#anim-pane .an-detail [data-p="sound"]');
    assert(sel && [...sel.options].some(o => o.value === 'applause'), 'selector con sonidos');
    sel.value = 'chime'; sel.dispatchEvent(new frame.contentWindow.Event('change')); await sleep(20);
    eq(b.animation.sound, 'chime');
    assert(!D.querySelector('#anim-pane .an-hear').disabled, 'se puede escuchar');
    D.querySelector('#anim-pane .cm-close').click();
    const html = R.io.buildHTML();
    assert(/data-sound="chime"/.test(html) && /AudioContext/.test(html), 'en el export, con su sintetizador');
    R.trans.setAnimPropForId(b.id, 'sound', '');
    assert(!b.animation.sound && !/data-sound=/.test(R.io.buildHTML()), 'sin sonido, nada');
    const S = await frame.contentWindow.eval("import('/src/features/document/sanitize.js')");
    const a = S.cleanValue({ effect: 'fade-in', sound: 'x" onload="y', soundSrc: 'javascript:alert(1)' });
    assert(!/"/.test(a.sound || '') && !a.soundSrc, 'saneado: ' + JSON.stringify(a));
  });

  await test('PDF con pasos: cada «siguiente» cambia de página y hace zoom, atrás lo deshace; barra para hojear y ampliar', async () => {
    reset(); const W = frame.contentWindow;
    const pdfText = (() => {           // a 3-page PDF (red, green, blue pages), 400×300 pt
      const cols = ['1 0 0', '0 0.6 0', '0 0 1'], objs = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${cols.map((_, k) => `${3 + 2 * k} 0 R`).join(' ')}] /Count 3 >>`];
      cols.forEach((c, k) => { const st = `${c} rg 20 20 360 260 re f`; objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Contents ${4 + 2 * k} 0 R >>`, `<< /Length ${st.length} >>\nstream\n${st}\nendstream`); });
      let out = '%PDF-1.4\n'; const offs = [];
      objs.forEach((o, k) => { offs.push(out.length); out += `${k + 1} 0 obj\n${o}\nendobj\n`; });
      const x = out.length;
      return out + `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
    })();
    R.slides.addSlide('blank'); await sleep(10);
    const b = await R.files.fileBlock(new W.File([pdfText], 'guia.pdf', { type: 'application/pdf' }), 'data:application/pdf;base64,' + W.btoa(pdfText), 'page');
    Object.assign(b, { x: 240, y: 110, w: 800, h: 500 }); R.blocks.addFileBlock(b); const pb = last(); select(pb); await sleep(20);
    // From "Add animation": next page; then a page and part of it.
    const { openAddAnimation } = await W.eval("import('/src/ui/ribbon/animadd.js')");
    openAddAnimation(D.body); await sleep(20);
    D.querySelector('#anim-add-menu [data-add="pdf:next"]').click(); await sleep(20);
    eq(pb.animation.effect, 'pdfview'); eq(pb.animation.page, 2, 'la página siguiente');
    R.trans.addAnimation('pdfview', { page: 2, zx: 0.25, zy: 0.25, zs: 2, duration: 300, start: 'click' });
    // In the animation panel: page, zoom and "choose the part".
    D.querySelector('[data-action="anim-panel"]').click(); await sleep(20);
    D.querySelector('#anim-pane .an-row[data-i="1"]').click(); await sleep(20);
    const row = D.querySelector('#anim-pane .an-detail');
    assert(row.querySelector('[data-pdf-p="page"]').value === '2' && row.querySelector('[data-pdf-p="zs"]').value === '2' && row.querySelector('.an-zone'), 'en el panel');
    D.querySelector('#anim-pane .cm-close').click();
    const F = await W.eval("import('/src/features/content/files.js')");
    const z = F.zoomForRect(800, 500, 4 / 3, { x: 0, y: 0, w: 0.5, h: 0.5 }); eq([z.zx, z.zy, z.zs].join(), '0.25,0.25,2', 'la zona marcada, como zoom');
    const html = R.io.buildHTML();
    assert(/data-pdf data-src="data:application\/pdf/.test(html) && /class="fragment pdfview"/.test(html) && /data-pdfgo="\{&quot;page&quot;:2,&quot;x&quot;:0.25,&quot;y&quot;:0.25,&quot;s&quot;:2\}"/.test(html), 'pasos en la presentación');
    // Presenting: pdf.js draws it; next, next, back, back.
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    try {
      f.srcdoc = R.io.buildHTML(R.state.deck, { inApp: true });
      for (let k = 0; k < 100 && !f.contentWindow.Reveal?.isReady?.(); k++) await sleep(100);
      const RV = f.contentWindow.Reveal; RV.slide(1); await sleep(100);
      const el = f.contentDocument.querySelector('[data-pdf]');
      for (let k = 0; k < 100 && !el._pdf?.canvas; k++) await sleep(100);
      assert(el._pdf?.canvas, 'dibujado con pdf.js');
      const st = () => el._pdf.cur, px = () => [...el._pdf.canvas.getContext('2d').getImageData(el._pdf.canvas.width / 2, el._pdf.canvas.height / 2, 1, 1).data].slice(0, 3).join();
      eq(st().page, 1); eq(px(), '255,0,0', 'página 1 (roja)');
      RV.next(); for (let k = 0; k < 50 && el._pdf.drawn !== 2; k++) await sleep(100);
      eq(st().page, 2, 'siguiente: página 2'); eq(px(), '0,153,0', 'la verde');
      RV.next(); await sleep(500);
      eq([st().s, st().x, st().y].join(), '2,0.25,0.25', 'siguiente: zoom a la zona');
      assert(/scale\(2(\.0+)?\)/.test(el._pdf.layer.style.transform), 'ampliada: ' + el._pdf.layer.style.transform);
      RV.prev(); await sleep(300); eq([st().page, st().s].join(), '2,1', 'atrás: sin zoom');
      RV.prev(); await sleep(600); eq(st().page, 1, 'atrás: página 1');
      // The bar: next page, zoom in, fit.
      el._pdf.bar.querySelector('[data-a="next"]').click(); await sleep(600); eq(st().page, 2, 'la barra pasa de página');
      el._pdf.bar.querySelector('[data-a="in"]').click(); await sleep(100); eq(st().s, 1.5, 'y amplía');
      el._pdf.bar.querySelector('[data-a="fit"]').click(); await sleep(100); eq(st().s, 1, 'y encaja');
      eq(el._pdf.bar.querySelector('span').textContent, '2 / 3', 'con su número de página');
    } finally { f.remove(); }
    // PowerPoint: the steps have no equivalent (the page stays as a picture).
    const blob = await R.pptx.buildPptxBlob(); assert(blob.size > 0, 'se exporta igual');
  });

  await test('todos los efectos de PowerPoint: entradas, salidas y énfasis (con opciones), en el editor, la presentación, PowerPoint y ODP', async () => {
    reset(); const W = frame.contentWindow, T = await W.eval("import('/src/features/animation/transitions.js')"), C = await W.eval("import('/src/features/animation/fxcatalog.js')");
    const ids = Object.keys(C.FX);
    assert(ids.length >= 90, 'el catálogo: ' + ids.length + ' efectos');
    for (const id of ids) {
      const f = C.FX[id];
      assert(T.EFFECT_KF[id] && T.EFFECT_KF_CSS.includes(`@keyframes ${f.kfName}{`), id + ': con sus fotogramas');
      eq(T.isEntrance(id), f.kind === 'entrance', id + ': ¿entrada?'); eq(T.effectKind(id), f.kind, id + ': su tipo');
    }
    assert(C.FX['bold-reveal'] && C.FX['wipe-out'] && C.FX['fill-color'].colour, 'revelación en negrita, salidas y colores');
    // The dialog «Más efectos»: by kind and PowerPoint's groups; a click chooses.
    const b = newText(); b.html = '<div>Uno</div><div>Dos</div><div>Tres</div>'; select(b); await sleep(10);
    D.querySelector('[data-action="anim-more"]').click(); for (let i = 0; i < 20 && !D.getElementById('fx-modal'); i++) await sleep(20);
    const m = D.getElementById('fx-modal');
    assert(m && m.querySelectorAll('[data-kind]').length === 3 && /Llamativos/.test(m.textContent), 'diálogo con Entrada, Énfasis y Salida, por grupos');
    m.querySelector('[data-fx="wipe"]').dispatchEvent(new W.PointerEvent('pointerover', { bubbles: true })); await sleep(20);
    m.querySelector('[data-fx="wipe"]').click(); await sleep(10);
    eq(b.animation.effect, 'wipe', 'elegido: Barrido'); assert(!D.getElementById('fx-modal'), 'y se cierra');
    // Its options: the direction.
    const opts = D.querySelector('#ribbon [data-anim-opts]'); R.render(); await sleep(30);
    assert([...opts.options].some(o => o.value === 'dir:left' && /izquierda/i.test(o.textContent)), 'opciones de efecto: desde dónde');
    opts.value = 'dir:left'; opts.dispatchEvent(new W.Event('change')); await sleep(10); eq(b.animation.dir, 'left', 'desde la izquierda');
    // An exit, an emphasis on a paragraph and a colour.
    R.store.commit(() => { b.anims = [{ effect: 'bold-reveal', order: 2, start: 'click', paras: [1] }, { effect: 'font-color', order: 3, start: 'click', color: '#1e88e5' }, { effect: 'blinds-out', order: 4, start: 'click' }];
      b.html = '<div data-p="0">Uno</div><div data-p="1">Dos</div><div data-p="2">Tres</div>'; });
    T.normalizeAnim();
    const html = R.io.buildHTML();
    assert(/class="fragment wipe"/.test(html) && /--fx-clip:inset\(0 100% 0 0\)/.test(html) && /@keyframes rvxWipe\{/.test(html), 'presentación: barrido desde la izquierda');
    assert(/fragment\.blinds-out\{opacity:1;visibility:inherit\}/.test(html) && /rvxBlinds var\(--anim-dur,600ms\) ease var\(--anim-del,0ms\) reverse both/.test(html) && /@property --fxp/.test(html), 'una salida: visible antes y su animación al revés');
    assert(/data-fxp="[^"]+"/.test(html) && /\[data-p="1"\]\)\{animation:rvxBoldReveal/.test(html), 'negrita solo en su párrafo');
    assert(/--fx-color:#1e88e5/.test(html), 'con su color');
    // Presented: the paragraph goes bold, the others don't; the exit hides it.
    const f = D.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;visibility:hidden'; D.body.appendChild(f);
    try {
      f.srcdoc = R.io.buildHTML(R.state.deck, { inApp: true });
      for (let i = 0; i < 100 && !f.contentWindow.Reveal?.isReady?.(); i++) await sleep(100);
      const RV = f.contentWindow.Reveal, doc = f.contentDocument, w = (p) => f.contentWindow.getComputedStyle(doc.querySelector(`section.present [data-p="${p}"]`)).fontWeight;
      RV.slide(0, 0, 1); await sleep(800);
      eq(w(1), '700', 'presentando: «Dos» en negrita'); eq(w(0), '400', '«Uno», no');
      RV.slide(0, 0, 3); await sleep(900);
      const el = doc.querySelector('section.present .fragment.blinds-out');
      assert(el && f.contentWindow.getComputedStyle(el).maskImage !== 'none', 'la salida, con sus persianas');
    } finally { f.remove(); }
    // The editor's preview plays them (no error).
    R.blocks && (await W.eval("import('/src/ui/canvas/preview.js')")).playAnimations(); await sleep(50);
    // PowerPoint: Wipe from the left with its filter; Bold Reveal on its paragraph; Blinds as an exit; and back.
    await R.vendor.loadScript(R.vendor.JSZIP, 'JSZip');
    const blob = await R.pptx.buildPptxBlob(), xml = await (await W.JSZip.loadAsync(blob)).file('ppt/slides/slide1.xml').async('string');
    assert(/presetID="22" presetClass="entr" presetSubtype="8"/.test(xml) && /filter="wipe\(right\)"/.test(xml), 'en PowerPoint: Barrido desde la izquierda');
    assert(/presetID="15" presetClass="emph"/.test(xml) && /<p:pRg st="1" end="1"\/>/.test(xml) && /style\.fontWeight/.test(xml), 'Revelación en negrita de su párrafo');
    assert(/presetID="3" presetClass="exit"/.test(xml) && /filter="blinds\(horizontal\)"/.test(xml), 'Persianas de salida');
    assert(/presetID="3" presetClass="emph"/.test(xml) && /<a:srgbClr val="1E88E5"\/>/.test(xml), 'Color de fuente, con el suyo');
    const back = (await R.pptxImport.importPPTX(new W.File([blob], 'fx.pptx'))).slides[0].blocks.find(x => x.type === 'text' && /Dos/.test(x.html));
    const got = T.animsOf(back).map(a => a.effect + (a.dir ? ':' + a.dir : '') + (a.paras ? ':' + a.paras : '') + (a.color ? ':' + a.color : ''));
    eq(got.join(' '), 'wipe:left bold-reveal:1 font-color:#1e88e5 blinds-out', 'y de vuelta, los mismos: ' + got.join(' '));
    assert(/data-p="1"/.test(back.html), 'con sus párrafos numerados');
    // OpenDocument: the same names Impress uses, and back.
    const ODP = await W.eval("import('/src/io/formats/odp.js')"), odp = await ODP.buildODP();
    const c = await (await W.JSZip.loadAsync(odp)).file('content.xml').async('string');
    assert(/ooo-entrance-wipe/.test(c) && /smil:type="barWipe"/.test(c) && /ooo-exit-venetian-blinds/.test(c) && /ooo-emphasis-bold/.test(c), 'en ODP: los de Impress');
  });

  await test('cada efecto con su ejemplo: tarjeta al pasar el ratón, se ve en el objeto al elegirlo o cambiar sus opciones, y la transición al cambiar la dirección', async () => {
    reset(); const W = frame.contentWindow, over = el => el.dispatchEvent(new W.PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    const out = el => el.dispatchEvent(new W.PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }));
    // Nothing selected: the example card shows it anyway.
    R.store.commit(() => { R.state.ui.selection = null; });
    const btn = D.querySelector('#ribbon [data-animation="zoom-in"]'); over(btn); await sleep(450);
    let card = D.getElementById('fx-demo');
    assert(card && /Zoom/.test(card.textContent) && /Entrada/.test(card.textContent), 'tarjeta de ejemplo con su nombre y tipo: ' + card?.textContent);
    assert(card.querySelector('.fxd-obj').getAnimations().length > 0, 'que lo reproduce');
    out(btn); await sleep(30); assert(!D.getElementById('fx-demo'), 'al salir, se va');
    // In «Más efectos…»: an unusual one, recognisable.
    const b = newText(); select(b); await sleep(10);
    D.querySelector('[data-action="anim-more"]').click(); for (let i = 0; i < 20 && !D.getElementById('fx-modal'); i++) await sleep(20);
    D.querySelector('#fx-modal [data-kind="emphasis"]').click(); await sleep(20);
    const it = D.querySelector('#fx-modal [data-fx="bold-reveal"]'); over(it); await sleep(450);
    card = D.getElementById('fx-demo'); assert(card && /negrita/i.test(card.textContent) && /Énfasis/.test(card.textContent), 'en el diálogo, también: ' + card?.textContent);
    const blockEl = D.querySelector(`#stage .block[data-id="${b.id}"]`);
    assert(blockEl.getAnimations().length > 0, 'y el objeto seleccionado lo hace');
    // Chosen: it plays once on the object (PowerPoint's «Vista previa automática»).
    it.click(); await sleep(150);
    eq(b.animation.effect, 'bold-reveal', 'elegido'); assert(blockEl.getAnimations().length > 0 || /rvxBoldReveal/.test(blockEl.style.animation), 'se ve en el objeto al elegirlo');
    // An option changed: seen again.
    R.store.commit(() => { b.animation.effect = 'wipe'; }); R.render(); await sleep(400);
    blockEl.getAnimations().forEach(a => a.cancel()); blockEl.style.animation = '';
    const opts = D.querySelector('#ribbon [data-anim-opts]'); opts.value = 'dir:top'; opts.dispatchEvent(new W.Event('change')); await sleep(80);
    const el2 = D.querySelector(`#stage .block[data-id="${b.id}"]`);
    assert(/rvxWipe/.test(el2.style.animation) && el2.style.getPropertyValue('--fx-clip'), 'cambiar la dirección: se ve con ella');
    // A slide's transition: its direction changed shows the example by the control.
    R.slides.addSlide('blank'); R.store.commit(() => { slide().transition = 'wipe'; }); R.render(); await sleep(30);
    const dir = D.querySelector('#ribbon [data-slide-trans-dir]');
    if (dir.options.length > 1) { dir.value = dir.options[1].value; dir.dispatchEvent(new W.Event('change', { bubbles: true })); await sleep(60);
      assert(D.getElementById('trans-preview'), 'transición: al cambiar su dirección, el ejemplo'); }
    D.getElementById('trans-preview')?.remove();
  });

  await test('énfasis que no oculta: latido, balanceo, salto y destello (editor, presentación y PowerPoint)', async () => {
    reset(); const W = frame.contentWindow, T = await W.eval("import('/src/features/animation/transitions.js')");
    for (const e of ['pulse', 'teeter', 'jump', 'color-pulse']) { assert(!T.isEntrance(e) && T.EFFECT_KF[e], e + ': énfasis con su animación'); }
    assert(/@keyframes rvGrow\{from\{transform:none\}/.test(T.EFFECT_KF_CSS), 'agrandar ya no parte de invisible');
    const b = newText(); select(b); await sleep(10);
    D.querySelector('[data-action="anim-add"]').click(); await sleep(10);
    const menu = D.getElementById('anim-add-menu');
    assert(['pulse', 'teeter', 'jump', 'color-pulse'].every(e => menu.querySelector(`[data-add="${e}"]`)), 'en la paleta de énfasis');
    menu.querySelector('[data-add="pulse"]').click(); await sleep(10);
    eq(b.animation.effect, 'pulse', 'se añade');
    const html = R.io.buildHTML();
    assert(/class="fragment pulse"/.test(html) && /\.fragment\.pulse\{opacity:1;visibility:inherit\}/.test(html) && /@keyframes rvPulse/.test(html), 'visible antes del clic y late al llegar');
    R.store.commit(() => { b.anims = [{ effect: 'teeter', order: 2, start: 'click' }, { effect: 'jump', order: 3, start: 'click' }]; });
    const blob = await R.pptx.buildPptxBlob(), zip = await W.JSZip.loadAsync(blob), xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert(/presetID="26" presetClass="emph"/.test(xml) && /autoRev="1"/.test(xml), 'en PowerPoint: Pulso');
    assert(/presetID="32" presetClass="emph"/.test(xml) && /<p:animRot by="420000">/.test(xml), 'Balanceo');
    assert(/path="M 0 0 L 0 -0\.\d+ L 0 0/.test(xml), 'y salto en el sitio');
    assert(!/presetClass="exit"/.test(xml) && !/presetClass="entr"/.test(xml), 'ninguno como entrada o salida');
  });

  // ---- The ribbon mirrors the selection (PowerPoint's) ----------------------
  const rb = s => D.querySelector('#ribbon ' + s);
  const change = (el, v) => { el.value = v; el.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true })); };
  const show = async tab => { R.store.commit(() => { R.state.ui.activeTab = tab; }, { history: false }); await sleep(20); };

  await test('cinta de animaciones: marca el efecto aplicado y sus controles editan esa animación (no añaden otra)', async () => {
    reset(); await show('animations'); const [a, b] = slide().blocks; select(a); await sleep(10);
    assert(!D.querySelector('#ribbon [data-animation].on'), 'sin animación: nada marcado');
    assert(rb('[data-anim-start]').disabled && rb('[data-anim-duration]').disabled, 'sin animación: los controles, desactivados');
    eq(rb('[data-anim-count]').textContent, 'Sin animación');
    R.trans.setAnimation('fade-up'); await sleep(10);
    const up = rb('[data-animation="fade-up"]');
    assert(up.classList.contains('on') && up.getAttribute('aria-pressed') === 'true', 'el efecto aplicado, pulsado');
    eq(up.dataset.kind, 'entrance', 'marcado como entrada'); eq(rb('[data-animation="fade-out"]').dataset.kind, 'exit'); eq(rb('[data-animation="path"]').dataset.kind, 'path');
    eq(D.querySelectorAll('#ribbon [data-animation].on').length, 1, 'solo ese');
    eq(rb('[data-anim-start]').value, 'click'); eq(rb('[data-anim-duration]').value, '0.5', 'su duración, en segundos');
    // Changing a control edits that animation.
    change(rb('[data-anim-duration]'), '1.5'); change(rb('[data-anim-start]'), 'afterPrev'); change(rb('[data-anim-delay]'), '0.2'); await sleep(10);
    eq(R.trans.animsOf(a).length, 1, 'ninguna animación nueva');
    eq(a.animation.duration, 1500); eq(a.animation.start, 'afterPrev'); eq(a.animation.delay, 200);
    // Effect options: the direction of «Subir» (PowerPoint's «Opciones de efecto»).
    const opts = rb('[data-anim-opts]'); assert(!opts.disabled && opts.value === 'effect:fade-up', 'opciones de efecto con la dirección actual');
    change(opts, 'effect:fade-left'); await sleep(10); eq(a.animation.effect, 'fade-left', 'cambia la dirección');
    assert(rb('[data-animation="fade-left"]').classList.contains('on'), 'y la galería lo sigue');
    // Picking another effect replaces it (its timing stays).
    rb('[data-animation="zoom-in"]').click(); await sleep(10);
    eq(R.trans.animsOf(a).length, 1, 'otro efecto de la galería sustituye'); eq(a.animation.effect, 'zoom-in'); eq(a.animation.duration, 1500, 'conserva sus intervalos');
    // «Añadir animación» adds one, and it becomes the one edited.
    rb('[data-action="anim-add"]').click(); await sleep(20);
    D.querySelector('#anim-add-menu [data-add="pulse"]').click(); await sleep(20);
    eq(R.trans.animsOf(a).length, 2, '«Añadir animación» añade');
    eq(rb('[data-anim-count]').textContent, '2 animaciones', 'el indicador');
    eq(rb('[data-anim-pick]').value, '1', 'edita la nueva'); assert(!rb('[data-anim-pick]').disabled, 'se puede cambiar');
    assert(rb('[data-animation="zoom-in"]').classList.contains('has') && !rb('[data-animation="zoom-in"]').classList.contains('on'), 'la otra, marcada aparte');
    change(rb('[data-anim-duration]'), '0.8'); await sleep(10);
    eq(a.anims[0].duration, 800, 'edita la que se muestra'); eq(a.animation.duration, 1500, 'y no la otra');
    rb('[data-animation="grow"]').click(); await sleep(10);
    eq(a.anims[0].effect, 'grow', 'la galería sustituye la que se edita'); eq(a.animation.effect, 'zoom-in');
    // Switching which one the controls show.
    change(rb('[data-anim-pick]'), '0'); await sleep(10);
    eq(rb('[data-anim-duration]').value, '1.5', 'muestra la primera'); assert(rb('[data-animation="zoom-in"]').classList.contains('on'), 'y su efecto');
    // The Animation pane chooses it too.
    rb('[data-action="anim-panel"]').click(); await sleep(30);
    const rows = D.querySelectorAll('#anim-pane .an-row'); assert(rows[0].classList.contains('cur'), 'en el panel, la que se edita');
    rows[1].click(); await sleep(20);
    eq(R.state.ui.animEdit.i, 1, 'elegir una fila del panel la muestra en la cinta'); eq(rb('[data-anim-duration]').value, '0.8');
    D.querySelector('#anim-pane .cm-close').click(); await sleep(10);
    // Another object, not animated: nothing marked.
    R.store.commit(() => R.store.setSelection(b.id), { history: false }); await sleep(10);
    assert(!D.querySelector('#ribbon [data-animation].on') && rb('[data-anim-start]').disabled, 'otro objeto sin animación: nada marcado');
    // Two objects with different durations: blank (mixed) until changed.
    R.trans.setAnimation('zoom-in'); R.store.commit(() => { R.state.ui.multi = [a.id, b.id]; R.state.ui.selection = b.id; }, { history: false }); await sleep(10);
    assert(rb('[data-animation="zoom-in"]').classList.contains('on'), 'varios con el mismo efecto: marcado');
    eq(rb('[data-anim-duration]').value, '', 'duraciones distintas: en blanco'); eq(rb('[data-anim-duration]').placeholder, '—');
    eq(a.animation.duration, 1500, 'sin tocarlas'); eq(b.animation.duration, 500);
    change(rb('[data-anim-duration]'), '1'); await sleep(10);
    eq(a.animation.duration + b.animation.duration, 2000, 'al cambiarla, a los dos');
    await show('home');
  });

  await test('cinta de transiciones: muestra la de la diapositiva, y «mixto» con varias distintas', async () => {
    reset(); await show('transitions'); R.slides.addSlide('blank'); R.slides.addSlide('blank'); await sleep(10);
    const [s1, s2] = R.state.deck.slides.slice(1);
    R.store.commit(() => { s1.transition = 'wipe'; s1.transitionDir = 'top'; s1.transitionSpeed = 'slow'; s1.autoSlide = 3000; s2.transition = 'fade'; s2.transitionSpeed = 'fast'; });
    R.slides.goToSlide(1); await sleep(20);
    const wipe = rb('[data-slide-transition="wipe"]');
    assert(wipe.classList.contains('on') && wipe.getAttribute('aria-pressed') === 'true', 'su transición, pulsada');
    eq(rb('[data-slide-trans-dir]').value, 'top', 'su dirección'); eq(rb('[data-slide-speed]').value, 'slow', 'su velocidad'); eq(rb('[data-autoslide]').value, '3', 'su avance automático');
    R.store.commit(() => R.store.setSlideSel([s1.id, s2.id], 1), { history: false }); await sleep(20);
    eq(wipe.getAttribute('aria-pressed'), 'mixed', 'dos distintas: mixto'); eq(rb('[data-slide-transition="fade"]').getAttribute('aria-pressed'), 'mixed');
    assert(!D.querySelector('#ribbon [data-slide-transition].on'), 'ninguna pulsada del todo');
    eq(rb('[data-slide-speed]').selectedIndex, -1, 'velocidad: en blanco'); eq(rb('[data-autoslide]').value, '', 'avance: en blanco');
    assert(rb('[data-slide-trans-dir]').disabled, 'sin opciones de efecto comunes');
    eq(s1.transitionSpeed + s2.transitionSpeed, 'slowfast', 'no se sobrescribe nada');
    change(rb('[data-slide-speed]'), 'default'); await sleep(10);
    eq(s1.transitionSpeed + s2.transitionSpeed, 'defaultdefault', 'al cambiarla, a las dos');
    rb('[data-slide-transition="push"]').click(); await sleep(10);
    eq(wipe.getAttribute('aria-pressed'), 'false'); eq(rb('[data-slide-transition="push"]').getAttribute('aria-pressed'), 'true', 'la misma en las dos: pulsada');
    R.store.commit(() => R.store.setSlideSel([]), { history: false }); await show('home');
  });

  await test('cinta: formato y pestañas del objeto reflejan la selección (negrita, alineación, colores, varios objetos)', async () => {
    reset(); await show('home'); const [a, b] = slide().blocks;
    select(a); await sleep(20);
    const bold = rb('[data-fmt="bold"]');
    eq(bold.getAttribute('aria-pressed'), 'true', 'título todo en negrita: pulsada sin entrar a escribir');
    R.store.commit(() => { a.html = '<b>Hola</b> mundo'; a.fontWeight = '400'; }); await sleep(20);
    eq(bold.getAttribute('aria-pressed'), 'mixed', 'en parte: mixto');
    eq(rb('[data-fmt="italic"]').getAttribute('aria-pressed'), 'false');
    R.store.commit(() => { a.textAlign = 'center'; a.vAlign = 'middle'; a.color = '#ff0000'; }); await sleep(20);
    eq(rb('[data-para="center"]').getAttribute('aria-pressed'), 'true', 'alineación'); eq(rb('[data-valign="middle"]').getAttribute('aria-pressed'), 'true', 'alineación vertical');
    eq(rb('[data-color]').value, '#ff0000', 'el color del texto en su muestra');
    const ctxBold = D.querySelector('#ribbon [data-page="ctx"] [data-st="bold"]'); eq(ctxBold?.getAttribute('aria-pressed'), 'mixed', 'también en la pestaña del cuadro de texto');
    R.store.commit(() => { b.textAlign = 'right'; R.state.ui.multi = [a.id, b.id]; R.state.ui.selection = b.id; }, { history: false }); await sleep(20);
    eq(rb('[data-para="center"]').getAttribute('aria-pressed'), 'mixed', 'dos cuadros con alineaciones distintas: mixto');
    assert(!D.querySelector('#ribbon [data-para].on'), 'ninguna pulsada');
    // Shapes: Home ▸ Drawing and the shapes' tab.
    R.blocks.addShape('rect'); const s1 = last(); R.blocks.addShape('ellipse'); const s2 = last();
    R.store.commit(() => { s1.fill = '#112233'; s2.fill = '#112233'; s1.stroke = '#aa0000'; s2.stroke = '#00aa00'; R.state.ui.multi = [s1.id, s2.id]; R.state.ui.selection = s2.id; }); await sleep(20);
    eq(rb('[data-shape-fill]').value, '#112233', 'relleno común en Inicio');
    assert(rb('[data-shape-stroke]').closest('label').classList.contains('mixed'), 'bordes distintos: mixto');
    const g = [...D.querySelectorAll('#ribbon [data-page="ctx"] .group')].find(x => x.querySelector(':scope > label').textContent === 'Estilo de forma');
    assert(g, 'varias formas: su estilo en la pestaña'); assert(g.querySelectorAll('label.color')[1].classList.contains('mixed'), 'con el borde mixto');
    rb('[data-page="ctx"] [title="Relleno"] input').value = '#445566'; rb('[data-page="ctx"] [title="Relleno"] input').dispatchEvent(new frame.contentWindow.Event('change')); await sleep(20);
    eq(s1.fill + s2.fill, '#445566#445566', 'el relleno, a las dos');
    // A toggle in an object's tab says whether it is on.
    select(s1); R.store.commit(() => { R.state.ui.multi = [s1.id]; }, { history: false }); await sleep(20);
    const sketch = [...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => x.textContent.includes('Trazo a mano'));
    eq(sketch.getAttribute('aria-pressed'), 'false'); sketch.click(); await sleep(20);
    eq([...D.querySelectorAll('#ribbon [data-page="ctx"] button')].find(x => x.textContent.includes('Trazo a mano')).getAttribute('aria-pressed'), 'true', 'aria-pressed en la pestaña del objeto');
    R.store.commit(() => { R.state.ui.multi = []; R.state.ui.selection = null; }, { history: false }); await show('home');
  });

  await test('añadir animación: al pasar el ratón por un efecto se ve en el objeto, sin cambiar nada; al salir, como estaba', async () => {
    reset(); const W = frame.contentWindow, b = slide().blocks[0]; select(b); await sleep(20);
    const v = R.store.docVersion();
    (await W.eval("import('/src/ui/ribbon/actions.js')")).ACTIONS['anim-add'](); await sleep(20);
    const item = D.querySelector('#anim-add-menu [data-add="spin"]'); assert(item, 'el menú de efectos');
    item.dispatchEvent(new W.PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })); await sleep(400);
    const el = D.querySelector(`#stage .block[data-id="${b.id}"]`);
    assert(/700ms/.test(el.style.animation), 'el efecto se reproduce en el objeto: ' + el.style.animation);
    eq(R.store.docVersion(), v, 'sin cambiar la presentación'); eq(slide().blocks[0].animation, null, 'ni sus animaciones');
    item.dispatchEvent(new W.PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: D.body })); await sleep(20);
    eq(el.style.animation, '', 'al salir, se para');
    // A motion path or a drawn one: nothing to preview.
    const path = D.querySelector('#anim-add-menu [data-add="path"]');
    path.dispatchEvent(new W.PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })); await sleep(400);
    eq(el.style.animation, '', 'una trayectoria, no');
    path.dispatchEvent(new W.PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: D.body }));
    // Chosen: the real one.
    item.click(); await sleep(20); eq(slide().blocks[0].animation?.effect, 'spin', 'al elegirlo, se añade');
  });
}
