// What a presentation's motion does when it is played, read from the deck itself (no browser, no pictures): animations
// that never play or leave the slide wrong, steps out of order, transitions and automatic advance that don't suit the
// slide, links that lead nowhere, background videos and maps with nothing to show without a connection.
// checkDeck(deck, known, key) → [[kind, "slide N", what]]. `known`: { effects: Set, transitions: Set, files: Set|null }
// (files: the names found in assets/video, to see that a background video exists; null = not checked).
// Used by tools/audit-motion.py (a report over every template) and by the tests (nothing new gets in with these faults).

const W = 1280, H = 720;
// Covers whose first click is on purpose (a sticker that pops in, a summary that builds up): the cover's picture on the
// website lacks only that. Anything else on a cover has to be there when the slide appears.
const COVER_CLICK_OK = new Set(['creative_brutalism', 'creative_comic', 'creative_retro_diner', 'sci_med_trial']);

// What the app knows (animation effects, which of them exit or enter, transitions, the background videos in assets/video),
// read from its own modules: in a page of the app. `withFiles`: also list assets/video (the server must show folders).
export async function knownFor(withFiles = true) {
  const [T, FXM, AG] = await Promise.all([import('../src/features/animation/transitions.js'), import('../src/features/animation/fxcatalog.js'), import('../src/features/ai/agent.js')]);
  const FX = FXM.FX;
  const effects = new Set([...Object.keys(T.EFFECT_KF), ...Object.keys(FX), 'mapfly', 'path', 'draw', 'strike', 'pdfview', 'clip3d', 'media-play', 'media-pause', 'media-stop', 'spin360', 'current-visible']);
  const exits = new Set(Object.values(FX).filter(f => f.kind === 'exit').map(f => f.id).concat(['fade-out', 'semi-fade-out', 'fade-in-then-out', 'fade-in-then-semi-out']));
  const entrances = new Set([...effects].filter(e => T.isEntrance(e)));
  const transitions = new Set([...AG.TRANSITIONS, ...Object.keys(T.CUSTOM_TRANSITIONS), 'wipe-left', 'wipe-top', 'wipe-bottom', 'split-horizontal', 'default']);
  let files = null;
  if (withFiles) try { files = new Set([...(await (await fetch(new URL('../assets/video/', import.meta.url))).text()).matchAll(/href="([^"?\/][^"]*)"/g)].map(m => decodeURIComponent(m[1]))); } catch { files = null; }
  return { effects, exits, entrances, transitions, files };
}
const animsOf = b => [b.animation, ...(b.anims || [])].filter(Boolean);
const plain = html => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const isExit = (a, known) => known.exits.has(a.effect);
const words = s => (plain(s).match(/\S+/g) || []).length;
// A block that carries something to read or look at (not a glow, a band or an icon on the master's side).
const carries = b => !b.decorative && (b.type !== 'shape' || plain(b.html || b.text));

export function checkDeck(deck, known, key = '') {
  const out = [];
  const add = (i, kind, what) => out.push([kind, 'diapositiva ' + (i + 1), what]);
  const ids = new Set(deck.slides.map(s => s.id));
  const slides = deck.slides;
  slides.forEach((s, i) => {
    if (s.hidden) return;
    const blocks = s.blocks || [], byId = new Map(blocks.map(b => [b.id, b]));
    // ---- animations -----------------------------------------------------------------------------------------------
    const entries = [];
    for (const b of blocks) for (const [n, a] of animsOf(b).entries()) entries.push({ b, a, n });
    for (const { b, a } of entries) {
      const name = (plain(b.html) || b.alt || b.type).slice(0, 30);
      if (!known.effects.has(a.effect)) add(i, 'efecto desconocido', `«${a.effect}» en «${name}»`);
      if (a.effect === 'mapfly' && !(b.stops || []).some(st => st.id === a.stop)) add(i, 'vuelo a una parada que no existe', name);
      if (a.effect === 'path' && !(a.points?.length > 1 || a.dx || a.dy)) add(i, 'recorrido sin recorrido', name);
    }
    // Where each object ends up: out of the slide (a path, or an entrance that leaves it so), or exited last of all.
    for (const b of blocks) {
      if (!carries(b)) continue;
      const list = animsOf(b); if (!list.length) continue;
      let dx = 0, dy = 0;
      for (const a of list) if (a.effect === 'path') { const [ex, ey] = a.points?.length > 1 ? a.points.at(-1) : [a.dx || 0, a.dy || 0]; dx += +ex || 0; dy += +ey || 0; }
      const name = (plain(b.html) || b.alt || b.type).slice(0, 30), last = list.at(-1);
      const x = b.x + dx, y = b.y + dy;
      if (!isExit(last, known) && (x > W - 20 || y > H - 20 || x + b.w < 20 || y + b.h < 20) && (dx || dy)) add(i, 'acaba fuera de la diapositiva', `«${name}»`);
      // Entrance after an exit that leaves nothing in view is fine; an exit with nothing coming back leaves a hole.
    }
    // The first slide's picture (the template's cover on the website, a thumbnail) is taken before anyone clicks: an object
    // that enters on a click is not in it. Something to read or look at that waits for the first click leaves it empty.
    if (i === 0 && !COVER_CLICK_OK.has(key)) {
      const hid = blocks.filter(b => carries(b) && b.type !== 'embed').filter(b => { const f = animsOf(b)[0]; return f && known.entrances.has(f.effect) && (f.start || 'click') === 'click'; });
      if (hid.length) add(i, 'portada que espera un clic', hid.map(b => '«' + (plain(b.html) || b.alt || b.type).slice(0, 24) + '»').slice(0, 4).join(', ') + (hid.length > 4 ? ' y ' + (hid.length - 4) + ' más' : ''));
    }
    const shown = blocks.filter(b => carries(b) && b.type !== 'embed');
    if (shown.length && shown.every(b => { const l = animsOf(b); return l.length && isExit(l.at(-1), known) && !l.some(a => !isExit(a, known) && a.effect !== 'path'); }))
      add(i, 'acaba vacía', 'todo lo que contiene sale antes del final');
    // ---- order ---------------------------------------------------------------------------------------------------
    const entering = entries.filter(e => known.entrances.has(e.a.effect) && e.n === 0).map(e => ({ ...e, order: +e.a.order || 0 }));
    const title = entering.find(e => e.b.ph === 'title');
    if (title) {
      const before = entering.filter(e => e.b !== title.b && e.order && e.order < title.order && e.b.type === 'text' && e.b.ph !== 'subtitle' && plain(e.b.html).length > 40);
      if (before.length) add(i, 'el título sale después del contenido', `«${plain(title.b.html).slice(0, 30)}» (paso ${title.order}) tras «${plain(before[0].b.html).slice(0, 30)}»`);
    }
    // A step with a gap in its numbers (1, 2, 4): the click for 3 does nothing visible.
    const orders = [...new Set(entries.map(e => +e.a.order).filter(Boolean))].sort((p, q) => p - q);
    if (orders.length && orders.some((o, k) => k && o - orders[k - 1] > 1)) add(i, 'pasos con huecos', orders.join(','));
    // ---- automatic advance ---------------------------------------------------------------------------------------
    const secs = (+s.autoSlide || 0) / 1000;
    if (secs) {
      const w = blocks.filter(b => !b.decorative).reduce((n, b) => n + words(b.html) + words(b.text), 0), steps = Math.max(1, orders.length || 0) ;
      const need = Math.max(3, w / 4);                                  // (240 words a minute, at least three seconds)
      if (secs < need && !orders.length) add(i, 'avance automático demasiado rápido', `${secs} s para ${w} palabras`);
      if (secs > 90) add(i, 'avance automático muy lento', `${secs} s`);
    }
    // ---- transitions ---------------------------------------------------------------------------------------------
    for (const t of [s.transition, s.transitionOut]) if (t && !known.transitions.has(t)) add(i, 'transición desconocida', t);
    // ---- links ---------------------------------------------------------------------------------------------------
    for (const b of blocks) {
      const name = (plain(b.html) || b.alt || b.type).slice(0, 30);
      if (b.goto && !['next', 'prev', 'first', 'last'].includes(b.goto) && !ids.has(b.goto)) add(i, 'enlace a una diapositiva que no existe', `«${name}»`);
      if ('href' in b && (!String(b.href || '').trim() || b.href === '#')) add(i, 'enlace vacío', `«${name}»`);
      if (/<a\b[^>]*href=["'](#|\s*)["']/i.test(b.html || '')) add(i, 'enlace vacío en el texto', `«${name}»`);
      if (b.type === 'embed' && !String(b.src || b.srcdoc || b.url || '').trim() && !b.live) add(i, 'página incrustada sin dirección', name);
      for (const r of b.reveal || []) if (!byId.has(r)) add(i, 'botón que muestra algo que no existe', name);
      // ---- media ---------------------------------------------------------------------------------------------------
      if (b.type === 'model' && b.src && !b.poster && !b.thumb) add(i, '3D sin imagen de reserva', name);
      if (b.type === 'map' && (b.stops || []).length && !(b.stops || []).every(st => st.shot)) add(i, 'mapa sin imagen de reserva', `${(b.stops || []).filter(st => !st.shot).length} paradas sin imagen`);
      if (b.type === 'map' && (b.stops || []).length > 1 && !entries.some(e => e.b === b && e.a.effect === 'mapfly') && b.mode !== 'all') add(i, 'mapa con paradas que nunca se visitan', name);
    }
    if (s.bgVideo && known.files && /assets\/video\//.test(s.bgVideo) && !known.files.has(s.bgVideo.split('/').pop())) add(i, 'vídeo de fondo que no existe', s.bgVideo);
    if (s.bgVideo && !s.bgVideo.startsWith('data:') && !/^(https?:)?\/\//.test(s.bgVideo) && !/assets\/video\//.test(s.bgVideo) && !s.bgVideo.startsWith('blob:')) add(i, 'vídeo de fondo con dirección rara', s.bgVideo.slice(0, 40));
  });
  const dt = deck.defaultTransition;
  if (dt && !known.transitions.has(dt)) out.push(['transición desconocida', 'presentación', dt]);
  return out;
}

// Faults that are only said (the template is meant so, or it is made on first view in the editor), not failed:
// a map's pictures are taken when the map is first seen (ui/dialogs/geomap.js fillShots); an object that leaves the slide
// on a path is a rocket, a bicycle…
export const INFO = new Set(['mapa sin imagen de reserva', 'acaba fuera de la diapositiva', 'avance automático demasiado rápido', 'transiciones llamativas']);

// Transitions that suit a serious talk less (they turn, tumble or zoom the whole slide): a report, not a failure.
export const LOUD = new Set(['zoom', 'flip', 'cube', 'page', 'concave', 'convex', 'spin']);
