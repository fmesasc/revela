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
    assert(/clip-path:inset\(0 0 0 100%\)/.test(html), 'CSS de barrido');
    assert(!/data-transition=rise\]/.test(html), 'solo las usadas');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;opacity:0';
    f.src = URL.createObjectURL(new Blob([html], { type: 'text/html' })); document.body.appendChild(f);
    let w; for (let i = 0; i < 80 && !((w = f.contentWindow).Reveal?.isReady?.()); i++) await sleep(100);
    try {
      const secs = f.contentDocument.querySelectorAll('.slides>section');
      assert(/clip-path|inset/.test(w.getComputedStyle(secs[1]).clipPath), 'la siguiente espera recortada (barrido)');
      w.Reveal.next(); await sleep(50);
      assert(w.getComputedStyle(secs[0]).transform !== 'none', 'la anterior sale volteada');
    } finally { f.remove(); }
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
