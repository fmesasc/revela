// Data model, defaults and persistence for a Revela deck.
//
// deck   = { version, size:{w,h}, theme, defaultTransition, sections:[{id,name}],
//            slides:[ slide ] }
// slide  = { id, sectionId|null, background, transition|null, blocks:[ block ] }
// block  = { id, type, x, y, w, h, rotation, animation|null, ...payload }
//   text  -> { html, fontSize }        model -> { src, autoRotate }
//   image -> { src, fit }              video -> { src }
//   magnify -> { source:{x,y,w,h}, target, border, sourceFrame, lines, … }
// A slide's `transition` overrides the deck's `defaultTransition`; an object's
// `animation` describes its entrance (effect + order).

import { kvGet, kvSet, verGet, verPut, verEach } from './idb.js';
import { dehydrate, hydrate, hasRefs, collectGarbage, usedRefs } from './mediastore.js';

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
// Nothing written yet: one slide with empty placeholders (or the texts the first version put in them).
const SAMPLE_TEXTS = ['<b>Título</b>', 'Subtítulo — doble clic para editar'];
export function isBlankDeck(d) {
  const s = d?.slides; if (!s || s.length !== 1) return false;
  return s[0].blocks.every(b => b.type === 'text' && (b.ph ? !(b.html || '').replace(/<[^>]*>/g, '').trim() : SAMPLE_TEXTS.includes(b.html)));
}
export function emptyDeck() {
  const first = blankSlide('#101317');
  // (Empty placeholders, like the templates': the editor shows their prompt, a presentation shows nothing.)
  first.blocks = [
    // (shrink: «Reducir si no cabe», on in a new presentation's placeholders, as PowerPoint's.)
    textBlock({ ph: 'title', x: 140, y: 250, w: 1000, h: 130, fontSize: 72, fontWeight: '700', html: '', shrink: true }),
    textBlock({ ph: 'subtitle', x: 140, y: 390, w: 1000, h: 80, fontSize: 30, html: '', shrink: true }),
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

// A magnifier: the area (source, slide coordinates) shown enlarged in this
// box, with a frame round both and lines joining them (features/document/magnify.js).
export function magnifyBlock(props = {}) {
  return Object.assign({
    id: uid(), type: 'magnify', x: 760, y: 120, w: 400, h: 225, rotation: 0, animation: null,
    source: { x: 120, y: 120, w: 200, h: 112 }, target: null,
    border: { color: '#e53935', width: 4, style: 'solid', radius: 0 }, sourceFrame: true, lines: 'corners',
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
  flushSave();                             // (a change still waiting to be written is the copy to read back)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const deck = JSON.parse(raw);
    if (deck.tooBig) return null;          // only in IndexedDB (loaded asynchronously)
    return migrate(deck);
  } catch { return null; }
}

// Autosave: a time stamp, then localStorage (synchronous to read back at start; small decks) and IndexedDB (any
// size). Not at every edit: serialising a deck of megabytes and writing it took 30–70 ms of every edit, drag frame
// and nudge on a slow machine. Both are written together once the editor is idle, about a second after the first
// change not yet written (the changes after it go with it), and at once when leaving the page (pagehide, the tab
// hidden, beforeunload), before the stored copy is read back (loadDeck) and before another deck replaces this one
// (store.js). So a crash (the tab or the browser killed) loses at most the last ~1 s of changes. On start the newer
// copy wins.
const LS_MAX = 4_500_000;                 // characters; beyond this localStorage would refuse it
const SAVE_AFTER = 1000;                  // ms after the first unwritten change (decks over 20 MB: 3 s, as before)
// Rough size (characters of all strings) without serialising the whole deck.
export function approxSize(v) {
  if (typeof v === 'string') return v.length;
  if (Array.isArray(v)) { let n = 0; for (const x of v) n += approxSize(x); return n; }
  if (v && typeof v === 'object') { let n = 0; for (const k in v) n += approxSize(v[k]) + k.length; return n; }
  return 8;
}
// Is the last change kept in this browser (in either store)? Not in some private
// windows or with the disk full: the title bar then says so, to download a copy.
let kept = true;
const keptWatchers = new Set();
export const savedHere = () => kept;
export const onSavedHere = fn => { keptWatchers.add(fn); };
function setKept(v) { if (v !== kept) { kept = v; keptWatchers.forEach(fn => fn(v)); } }
// True if the whole deck went into localStorage.
function writeLocal(deck, size = approxSize(deck)) {
  try {
    if (size < LS_MAX) { localStorage.setItem(STORAGE_KEY, JSON.stringify(deck)); return true; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tooBig: true, savedAt: deck.savedAt, name: String(deck.name || '').slice(0, 80) }));
  } catch {}
  return false;
}
// IndexedDB: the deck with its big files as references (core/mediastore.js: each file once, as bytes), one write after
// another; now and then, the files nothing refers to any more are deleted.
let idbQueue = Promise.resolve(), lastGc = 0;
const writeIdb = (deck, local) => (idbQueue = idbQueue.then(async () => {
  try {
    const light = await dehydrate(deck).catch(() => deck);         // (no media database: as before, whole)
    await kvSet('deck', light); setKept(true);
    if (Date.now() - lastGc > 5 * 60e3) { lastGc = Date.now(); tidyStored(light).catch(() => {}); }
  } catch { if (!local) setKept(false); }
}));
// Now and then: the media files nothing refers to, deleted — the versions read one at a time (idb.js verEach) —; and a
// version an older Revela kept whole (its files inside, maybe hundreds of MB) rewritten with references, one by one.
export async function tidyStored(light) {
  const used = usedRefs(light, new Set()), whole = [];
  await verEach(v => { usedRefs(v.deck, used); if (v.deck && !hasRefs(v.deck) && approxSize(v.deck) > 2e6) whole.push(v.id); }).catch(() => {});
  for (const id of whole) { const v = await verGet(id); if (v?.deck && !hasRefs(v.deck)) await verPut({ ...v, deck: await dehydrate(v.deck) }); }
  await collectGarbage(null, used);              // (the files just stored for those versions are recent: kept)
}
// The deck waiting to be written (the live object: what it holds when written is what is kept), and when.
let pending = null, timer = null, idle = null;
const onIdle = (fn, timeout) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 0));
const offIdle = id => (typeof cancelIdleCallback === 'function' ? cancelIdleCallback(id) : clearTimeout(id));
// Called only when the content changed (see store.save).
export function saveDeck(deck) {
  deck.savedAt = Date.now(); pending = deck;
  if (timer != null || idle != null) return;                      // (already due: this change goes with it)
  timer = setTimeout(() => { timer = null; idle = onIdle(() => { idle = null; flushSave(); }, 250); }, approxSize(deck) > 20e6 ? 3000 : SAVE_AFTER);
}
// Everything now (leaving the page, before reading it back): the deck waiting, or the one given.
export function flushSave(deck = pending) {
  clearTimeout(timer); if (idle != null) offIdle(idle);
  timer = idle = null; pending = null;
  if (!deck) return Promise.resolve();
  const local = writeLocal(deck); if (local) setKept(true);
  return writeIdb(deck, local);
}
// Leaving the page (closed, reloaded, navigated away; on phones a hidden tab may never come back): written now.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('pagehide', () => flushSave());
  window.addEventListener('beforeunload', () => flushSave());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
}
// The presentation left open is a big one, only in IndexedDB (it takes a while to come back): → { name } or null.
export function bigDeckWaiting() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw || raw.length > 2000) return null; const d = JSON.parse(raw); return d?.tooBig ? { name: d.name || '' } : null; } catch { return null; }
}
// The IndexedDB copy, if it's newer than what localStorage gave us at start.
export async function loadNewerDeck(current) {
  try {
    const d = await kvGet('deck');
    if (d && d.slides && (!current || (d.savedAt || 0) > (current.savedAt || 0))) return migrate(hasRefs(d) ? await hydrate(d) : d);
  } catch {}
  return null;
}

// A presentation without a name keeps this one (the same in every language: the interface shows it
// translated — isUntitled — so a deck made in Spanish doesn't say «sin título» in English).
export const UNTITLED = 'Presentación sin título';
export const isUntitled = name => !String(name ?? '').trim() || name === UNTITLED;

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
