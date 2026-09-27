// Data model, defaults and persistence for a Revela deck.
//
// deck   = { version, size:{w,h}, theme, defaultTransition, sections:[{id,name}],
//            slides:[ slide ] }
// slide  = { id, sectionId|null, background, transition|null, blocks:[ block ] }
// block  = { id, type, x, y, w, h, rotation, animation|null, ...payload }
//   text  -> { html, fontSize }        model -> { src, autoRotate }
//   image -> { src, fit }              video -> { src }
// A slide's `transition` overrides the deck's `defaultTransition`; an object's
// `animation` describes its entrance (effect + order).

export const STORAGE_KEY = 'revela.deck.v1';

export const uid = () => Math.random().toString(36).slice(2, 9)
  + Date.now().toString(36).slice(-3);

export function emptyDeck() {
  const first = blankSlide('#101317');
  first.blocks = [
    textBlock({ x: 140, y: 250, w: 1000, h: 130, fontSize: 72, html: '<b>Título</b>' }),
    textBlock({ x: 140, y: 390, w: 1000, h: 80, fontSize: 30, html: 'Subtítulo — doble clic para editar' }),
  ];
  return {
    version: 3,
    name: 'Presentación sin título',
    size: { w: 1280, h: 720 },
    theme: 'black',
    defaultTransition: 'slide',
    transitionSpeed: 'default',
    slideNumber: { show: false, position: 'br', format: 'c' },
    sections: [],
    slides: [ first ],
  };
}

export function blankSlide(background = '#101317', sectionId = null) {
  return { id: uid(), sectionId, background, transition: null, blocks: [] };
}

export function textBlock(props = {}) {
  return Object.assign({
    id: uid(), type: 'text', x: 140, y: 300, w: 720, h: 140,
    rotation: 0, animation: null, fontSize: 40, html: 'Texto',
  }, props);
}

export function loadDeck() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const deck = JSON.parse(raw);
    return migrate(deck);
  } catch { return null; }
}

export function saveDeck(deck) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(deck)); } catch {}
}

// Keep older stored decks loadable as the schema evolves.
function migrate(deck) {
  if (!deck || typeof deck !== 'object') return null;
  deck.version ??= 3;
  deck.name ??= 'Presentación sin título';
  deck.size ??= { w: 1280, h: 720 };
  deck.slideNumber ??= { show: false, position: 'br', format: 'c' };
  deck.sections ??= [];
  deck.slides ??= [];
  for (const s of deck.slides) {
    s.sectionId ??= null;
    s.transition ??= null;
    s.background ??= '#101317';
    s.hidden ??= false;
    s.notes ??= '';
    s.blocks ??= [];
    for (const b of s.blocks) { b.rotation ??= 0; b.animation ??= null; }
  }
  return deck;
}
