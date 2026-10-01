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

import { kvGet, kvSet } from './idb.js';

export const STORAGE_KEY = 'revela.deck.v1';

export const uid = () => Math.random().toString(36).slice(2, 9)
  + Date.now().toString(36).slice(-3);

// A new, untouched presentation (the one Revela starts with): replacing it loses nothing.
// An object's opacity: b.opacity is a percentage, 0–100 (none or 100: opaque),
// the same in the editor, the thumbnails, the master and every export. A
// fraction (0 < v < 1, as in CSS: 0.1) is read as such. Returns 0–1.
export function opacityOf(b) {
  const v = Number(b?.opacity); if (b?.opacity == null || b.opacity === '' || !Number.isFinite(v)) return 1;
  return Math.max(0, Math.min(1, v > 0 && v < 1 ? v : v / 100));
}
export function isBlankDeck(d) {
  const s = d?.slides; if (!s || s.length !== 1) return false;
  const want = emptyDeck().slides[0].blocks.map(b => b.html).join('|');
  return s[0].blocks.map(b => b.html).join('|') === want || !s[0].blocks.length;
}
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
    footer: { show: false, text: '', date: false },
    logo: { src: '', position: 'br', size: 120 },
    loop: false,
    guides: { v: [], h: [] },
    sections: [],
    master: { id: 'master', blocks: [], background: null },
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

export function figindexBlock(props = {}) {
  return Object.assign({
    id: uid(), type: 'figindex', kind: 'all', x: 140, y: 150, w: 1000, h: 470,
    rotation: 0, animation: null, fontSize: 28,
  }, props);
}

export function slideRefBlock(props = {}) {
  return Object.assign({
    id: uid(), type: 'slideref', target: null, returnBack: false,
    x: 360, y: 180, w: 420, h: 236, rotation: 0, animation: null,
  }, props);
}

export function mathBlock(props = {}) {
  return Object.assign({
    id: uid(), type: 'math', x: 420, y: 290, w: 440, h: 120,
    rotation: 0, animation: null, latex: 'e^{i\\pi} + 1 = 0',
  }, props);
}

export function chartBlock(props = {}) {
  return Object.assign({
    id: uid(), type: 'chart', chartType: 'bar', color: '#3f6497',
    x: 300, y: 200, w: 620, h: 340, rotation: 0, animation: null,
    data: [{ label: 'A', value: 30 }, { label: 'B', value: 60 }, { label: 'C', value: 45 }],
  }, props);
}

export function codeBlock(props = {}) {
  return Object.assign({
    id: uid(), type: 'code', x: 220, y: 200, w: 840, h: 300,
    rotation: 0, animation: null, lang: 'javascript', fontSize: 22,
    code: '// tu código aquí\nfunction hola() {\n  return "Revela";\n}',
  }, props);
}

export function tableBlock(props = {}) {
  return Object.assign({
    id: uid(), type: 'table', x: 260, y: 220, w: 700, h: 220,
    rotation: 0, animation: null, stroke: '#ffffff',
    rows: [['', '', ''], ['', '', '']],
  }, props);
}

export function loadDeck() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const deck = JSON.parse(raw);
    if (deck.tooBig) return null;          // only in IndexedDB (loaded asynchronously)
    return migrate(deck);
  } catch { return null; }
}

// Autosave: a time stamp, then localStorage (fast, synchronous, small decks)
// and IndexedDB (any size, debounced). On start the newer copy wins.
const LS_MAX = 4_500_000;                 // characters; beyond this localStorage would refuse it
let idbTimer = null;
// Rough size (characters of all strings) without serialising the whole deck.
export function approxSize(v) {
  if (typeof v === 'string') return v.length;
  if (Array.isArray(v)) { let n = 0; for (const x of v) n += approxSize(x); return n; }
  if (v && typeof v === 'object') { let n = 0; for (const k in v) n += approxSize(v[k]) + k.length; return n; }
  return 8;
}
// Called only when the content changed (see store.save): localStorage at once,
// IndexedDB a moment later (big decks: later still).
let pending = null;
function writeLocal(deck, size = approxSize(deck)) {
  try {
    if (size < LS_MAX) localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    else localStorage.setItem(STORAGE_KEY, JSON.stringify({ tooBig: true, savedAt: deck.savedAt }));
  } catch {}
}
export function saveDeck(deck) {
  deck.savedAt = Date.now(); pending = deck;
  const size = approxSize(deck);
  writeLocal(deck, size);
  clearTimeout(idbTimer);
  idbTimer = setTimeout(() => { pending = null; kvSet('deck', deck).catch(() => {}); }, size > 20e6 ? 3000 : 400);
}
// Everything now (leaving the page, or before reading it back).
export function flushSave(deck = pending) {
  clearTimeout(idbTimer); pending = null;
  if (!deck) return Promise.resolve();
  writeLocal(deck);
  return kvSet('deck', deck).catch(() => {});
}
// The IndexedDB copy, if it's newer than what localStorage gave us at start.
export async function loadNewerDeck(current) {
  try {
    const d = await kvGet('deck');
    if (d && d.slides && (!current || (d.savedAt || 0) > (current.savedAt || 0))) return migrate(d);
  } catch {}
  return null;
}

// Keep older stored decks loadable as the schema evolves.
function migrate(deck) {
  if (!deck || typeof deck !== 'object') return null;
  deck.version ??= 3;
  deck.name ??= 'Presentación sin título';
  deck.size ??= { w: 1280, h: 720 };
  deck.slideNumber ??= { show: false, position: 'br', format: 'c' };
  deck.footer ??= { show: false, text: '', date: false };
  deck.logo ??= { src: '', position: 'br', size: 120 };
  deck.loop ??= false;
  deck.guides ??= { v: [], h: [] };
  deck.sections ??= [];
  deck.master ??= { id: 'master', blocks: [], background: null };
  deck.slides ??= [];
  for (const s of deck.slides) {
    s.sectionId ??= null;
    s.transition ??= null;
    s.background ??= '#101317';
    s.hidden ??= false;
    s.notes ??= '';
    s.autoSlide ??= 0;   // ms; 0 = manual
    s.blocks ??= [];
    for (const b of s.blocks) { b.rotation ??= 0; b.animation ??= null; }
  }
  return deck;
}
