// Slide master and layouts (PowerPoint/OnlyOffice "Slide Master", Google
// Slides "Edit theme").
//
// - The master holds the text styles of the deck (title, subtitle and body with
//   five levels: font, size, colour, bold, italic, alignment, bullet) and
//   objects shown behind every slide.
// - Layouts ("Title and content", "Two contents"…) belong to the deck: each has
//   its placeholders (text boxes with `ph`) and its own background objects.
// - A slide uses a layout (slide.layoutId); its placeholders (blocks with `ph`
//   and `lp` = the layout placeholder's id) take the formatting from the master
//   style, then from the layout placeholder, then from what was set on the
//   slide itself. Changing a style in the master changes every slide that
//   didn't override it; moving a layout placeholder moves the slides' ones
//   that were still where it was.
// While editing the master (state.ui.editMaster = true) or a layout (= its
// id), the canvas edits that instead of the current slide (store.currentSlide).

import { state, commit, amend, subscribe, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { canvasBackdrop } from '../design/canvasmode.js';

export const MAX_LEVELS = 5;
export const DEFAULT_STYLES = {
  title: { size: 48, bold: true },
  subtitle: { size: 30 },
  body: { size: 30, levels: [{ size: 30, bullet: 'disc' }, { size: 26, bullet: 'circle' }, { size: 24, bullet: 'square' }, { size: 22, bullet: 'disc' }, { size: 20, bullet: 'circle' }] },
};
export const ensureMaster = (deck = state.deck) => (deck.master ||= { id: 'master', blocks: [], background: null });
// A deck can have several masters (PowerPoint's "Insert Slide Master"): the
// main one in deck.master and the others in deck.masters; each layout names
// its master (layout.masterId, the main one when absent).
export const allMasters = (deck = state.deck) => [ensureMaster(deck), ...(deck.masters || [])];
export const isMaster = (x, deck = state.deck) => allMasters(deck).includes(x);
export function masterOf(x, deck = state.deck) {
  if (isMaster(x, deck)) return x;
  const lay = deck.layouts?.includes(x) ? x : layoutOf(x, deck);
  return (lay?.masterId && deck.masters?.find(m => m.id === lay.masterId)) || ensureMaster(deck);
}
// The master being worked on: the one (or the layout's) open in the master
// view, else the current slide's.
export function contextMaster(deck = state.deck) {
  const e = state.ui.editMaster;
  if (e) { const x = e === true ? ensureMaster(deck) : deck.layouts?.find(l => l.id === e) || deck.masters?.find(mm => mm.id === e); if (x) return masterOf(x, deck); }
  return masterOf(deck.slides[state.ui.slideIndex], deck);
}
export const masterStyles = (deck = state.deck, m = ensureMaster(deck)) => {
  const st = (m.styles ||= structuredClone(DEFAULT_STYLES));
  for (const k of Object.keys(DEFAULT_STYLES)) st[k] ||= structuredClone(DEFAULT_STYLES[k]);
  const lv = (st.body.levels ||= []);
  for (let i = 0; i < MAX_LEVELS; i++) lv[i] ||= structuredClone(DEFAULT_STYLES.body.levels[i]);
  return st;
};

// The deck's layouts; decks made before layouts existed get the built-in set.
export function ensureLayouts(deck = state.deck) {
  if (Array.isArray(deck.layouts) && deck.layouts.length) return deck.layouts;
  const P = (ph, x, y, w, h, extra = {}) => ({ id: uid(), type: 'text', ph, x, y, w, h, rotation: 0, animation: null, html: '', ...extra });
  deck.layouts = [
    { id: 'title', name: 'Portada', blocks: [P('title', 140, 150, 1000, 240, { fontSize: 72, vAlign: 'bottom' }), P('subtitle', 140, 410, 1000, 90)] },
    { id: 'titleContent', name: 'Título y contenido', blocks: [P('title', 100, 60, 1080, 100), P('body', 100, 180, 1080, 480)] },
    { id: 'twoContent', name: 'Dos contenidos', blocks: [P('title', 100, 60, 1080, 100), P('body', 100, 180, 520, 480), P('body', 660, 180, 520, 480)] },
    { id: 'section', name: 'Encabezado de sección', blocks: [P('title', 120, 170, 1040, 240, { fontSize: 64, textAlign: 'center', vAlign: 'bottom' }), P('subtitle', 120, 430, 1040, 90, { textAlign: 'center' })] },
    { id: 'titleOnly', name: 'Solo el título', blocks: [P('title', 100, 60, 1080, 100)] },
    { id: 'blank', name: 'En blanco', blocks: [] },
  ].map(l => ({ background: null, ...l }));
  return deck.layouts;
}
export const layoutOf = (slide, deck = state.deck) => (slide?.layoutId && deck.layouts?.find(l => l.id === slide.layoutId)) || null;
const isLayout = (x, deck) => !!deck.layouts?.includes(x);

export function toggleMasterEdit(on = !state.ui.editMaster) {
  commit(() => { masterStyles(); ensureLayouts(); state.ui.editMaster = on; state.ui.selection = null; state.ui.multi = []; }, { history: false });
}
// In the master view: edit the master (true) or one layout (its id).
export function editLayout(id) {
  commit(() => { masterStyles(); ensureLayouts(); state.ui.editMaster = id || true; state.ui.selection = null; state.ui.multi = []; }, { history: false });
}
export function toggleHideMaster(index = state.ui.slideIndex) {
  commit(() => { const s = state.deck.slides[index]; if (s) s.hideMaster = !s.hideMaster; });
}
// What is drawn under a slide: the master's objects (unless the layout or the
// slide hides them) and its layout's own objects (not its placeholders).
export function masterBlocksFor(slide, deck = state.deck) {
  // Canvas mode with a picture: the slide's part of it, under everything.
  const bd = canvasBackdrop(slide, deck);
  return bd ? [bd, ...masterOnly(slide, deck)] : masterOnly(slide, deck);
}
function masterOnly(slide, deck) {
  if (!slide || slide.hideMaster) return [];
  if (isMaster(slide, deck)) return [];
  const lay = isLayout(slide, deck) ? slide : layoutOf(slide, deck);
  const master = lay?.hideMaster ? [] : (masterOf(lay || slide, deck).blocks || []);
  if (isLayout(slide, deck)) return master;              // editing a layout: the master under it
  return [...master, ...(lay ? lay.blocks.filter(b => !b.ph) : [])];
}

// ---- Text styles -------------------------------------------------------------
const KIND = { title: 'title', ctrTitle: 'title', subtitle: 'subtitle', subTitle: 'subtitle', body: 'body', obj: 'body' };
export const styleKind = b => (b && b.type === 'text' && KIND[b.ph]) || null;
// A style → block properties.
const asProps = st => ({
  ...(st.size && { fontSize: st.size }), ...(st.font && { fontFamily: st.font }), ...(st.color && { color: st.color }),
  ...(st.bold != null && { fontWeight: st.bold ? '700' : '400' }), ...(st.italic != null && { fontStyle: st.italic ? 'italic' : 'normal' }),
  ...(st.align && { textAlign: st.align }), ...(st.lineHeight && { lineHeight: st.lineHeight }),
});
const OWN = ['fontSize', 'fontFamily', 'color', 'fontWeight', 'fontStyle', 'textAlign', 'lineHeight'];
const ownOf = b => Object.fromEntries(OWN.filter(k => b[k] != null && b[k] !== '').map(k => [k, b[k]]));
// The layout placeholder a slide placeholder follows.
export function layoutPlaceholder(b, slide, deck = state.deck) {
  const lay = layoutOf(slide, deck); if (!lay) return null;
  return lay.blocks.find(x => x.id === b.lp) || lay.blocks.find(x => x.ph && styleKind(x) === styleKind(b)) || null;
}
// A text block with the formatting it inherits filled in (a copy; other blocks
// are returned as they are). levels: the body's per-level sizes and bullets.
export function styled(b, slide, deck = state.deck) {
  const kind = styleKind(b); if (!kind) return b;
  const st = masterStyles(deck, masterOf(slide, deck))[kind];
  const lp = !isLayout(slide, deck) && !isMaster(slide, deck) ? layoutPlaceholder(b, slide, deck) : null;
  const out = { ...b, ...asProps(st), ...(lp ? ownOf(lp) : {}), ...ownOf(b) };
  // "Shrink text on overflow" (imported from PowerPoint): a factor on the
  // inherited size, so the text still follows the master.
  if (b.fit && b.fontSize == null) out.fontSize = Math.round(out.fontSize * b.fit);
  if (kind === 'body') out.levels = st.levels;
  return out;
}
// CSS custom properties for the body's levels (sizes, bullets), used by
// levelCSS() in render/svg.js; the first level follows the box's size.
export function levelVars(b) {
  if (!b.levels) return '';
  const base = b.levels[0]?.size || 30, k = (b.fontSize || base) / base;
  return b.levels.map((l, i) => `--l${i + 1}:${Math.round((l.size || base) * k)}px;--b${i + 1}:${/^[a-z-]+$/.test(l.bullet || 'disc') ? l.bullet || 'disc' : `'${String(l.bullet).replace(/'/g, '')} '`};`
    + (l.color ? `--c${i + 1}:${l.color};` : '')).join('');
}

export function setMasterStyle(kind, props, level = null) {
  commit(() => {
    const st = masterStyles(state.deck, contextMaster())[kind];
    const target = level != null ? st.levels[level] : st;
    for (const [k, v] of Object.entries(props)) { if (v === null || v === '') delete target[k]; else target[k] = v; }
    if (kind === 'body' && level === 0 && props.size) st.size = props.size;
    if (kind === 'body' && level == null && props.size) st.levels[0].size = props.size;
  });
}

// ---- Layouts -----------------------------------------------------------------
const freshPlaceholders = lay => lay.blocks.filter(b => b.ph).map(p => (p.type === 'placeholder'
  ? { id: uid(), type: 'placeholder', ph: p.ph, lp: p.id, x: p.x, y: p.y, w: p.w, h: p.h, rotation: 0, animation: null }
  : { id: uid(), type: 'text', ph: p.ph, lp: p.id, x: p.x, y: p.y, w: p.w, h: p.h, rotation: 0, animation: null, html: '', ...(p.vAlign && { vAlign: p.vAlign }) }));
// Give a slide a layout. Like PowerPoint, what was written moves into the new
// placeholders (the title into the title, the rest in order) and nothing is
// lost: text that doesn't fit any placeholder, pictures, charts… stay.
export function applyLayout(id, index = state.ui.slideIndex) {
  commit(() => {
    const lay = ensureLayouts().find(l => l.id === id); const s = state.deck.slides[index]; if (!lay || !s) return;
    relayout(s, lay);
    state.ui.selection = null;
  });
}
function relayout(s, lay, deck = state.deck, background = true) {
  const old = s.blocks, used = new Set();
  const texts = old.filter(b => b.type === 'text' && (b.html || '').replace(/<[^>]*>/g, '').trim());
  const take = test => { const b = texts.find(x => !used.has(x) && test(x)); if (b) used.add(b); return b; };
  const fresh = freshPlaceholders(lay);
  for (const p of fresh) {
    const src = styleKind(p) === 'title' ? take(b => styleKind(b) === 'title') || take(b => !b.ph)
      : take(b => styleKind(b) === styleKind(p)) || take(b => styleKind(b) !== 'title');
    if (src) p.html = src.html;
  }
  // The background follows the new layout's, unless the slide had its own.
  const was = layoutOf(s, deck), nb = layoutBackground(lay, deck);
  if (background && nb && followsBackground(s, was ? layoutBackground(was, deck) : masterOf(s, deck).background, deck)) s.background = nb;
  s.layoutId = lay.id;
  // Old empty placeholders go; connectors to moved text go with it.
  const keep = old.filter(b => !used.has(b) && !(b.ph && !(b.html || '').replace(/<[^>]*>/g, '').trim())
    && !(b.type === 'connector' && [...used].some(u => u.id === b.from || u.id === b.to)));
  s.blocks = [...fresh, ...keep];
}
export const newSlideBlocks = lay => freshPlaceholders(lay);
// (Without touching the background: applying another theme decides it.)
export const relayoutSlide = (s, lay, deck = state.deck) => relayout(s, lay, deck, false);
// Back to the layout: placeholders return to its place and lose the formatting
// set on the slide (PowerPoint's "Reset").
export function resetSlide(index = state.ui.slideIndex) {
  commit(() => {
    const s = state.deck.slides[index]; if (!s) return;
    for (const b of s.blocks) {
      const lp = styleKind(b) && layoutPlaceholder(b, s); if (!lp) continue;
      Object.assign(b, { x: lp.x, y: lp.y, w: lp.w, h: lp.h, lp: lp.id });
      for (const k of OWN) delete b[k];
      delete b.fit;
    }
  });
}
export function addLayout(copyOf = null) {
  commit(() => {
    const src = copyOf && ensureLayouts().find(l => l.id === copyOf);
    const mid = src ? masterOf(src).id : contextMaster().id, owner = mid === ensureMaster().id ? {} : { masterId: mid };
    // (A new one starts with a title, as in PowerPoint.)
    const title = { id: uid(), type: 'text', ph: 'title', x: 100, y: 60, w: state.deck.size.w - 200, h: 100, rotation: 0, animation: null, html: '' };
    const lay = src ? { ...structuredClone(src), id: uid(), name: src.name + ' (2)' } : { id: uid(), name: 'Diseño personalizado', background: null, blocks: [title], ...owner };
    if (src) lay.blocks.forEach(b => { b.id = uid(); });
    // Right after the one it copies, or at the end of its master's.
    const lays = ensureLayouts(), after = src || lays.filter(l => masterOf(l) === masterOf(lay)).at(-1);
    lays.splice(after ? lays.indexOf(after) + 1 : lays.length, 0, lay);
    state.ui.editMaster = lay.id; state.ui.selection = null;
  });
}
export function renameLayout(id, name) { commit(() => { const l = ensureLayouts().find(x => x.id === id); if (l && name) l.name = name; }); }
// Delete a layout. The slides that use it move to another one (reassignTo),
// keeping what was written in them; without it, a layout in use stays.
export function deleteLayout(id, reassignTo = null) {
  commit(() => {
    const d = state.deck, lays = ensureLayouts(d), lay = lays.find(l => l.id === id); if (!lay || lays.length < 2) return;
    const users = d.slides.filter(s => s.layoutId === id);
    if (users.length) {
      const to = lays.find(l => l.id === reassignTo && l !== lay); if (!to) return;
      users.forEach(s => relayout(s, to, d));
    }
    const m = masterOf(lay, d), sibs = lays.filter(l => masterOf(l, d) === m), i = sibs.indexOf(lay);
    const next = sibs[i + 1] || sibs[i - 1];
    d.layouts = lays.filter(l => l !== lay);
    if (state.ui.editMaster) state.ui.editMaster = next?.id || (m === ensureMaster(d) ? true : m.id);
  });
}
// Where the slides of a deleted layout go: one of its master's with text
// («Title and content»-like), else any.
export function fallbackLayout(id, deck = state.deck) {
  const lays = ensureLayouts(deck), lay = lays.find(l => l.id === id), m = lay && masterOf(lay, deck);
  const sibs = lays.filter(l => l !== lay && masterOf(l, deck) === m);
  return sibs.find(l => l.blocks.some(b => b.ph === 'body')) || sibs[0] || lays.find(l => l !== lay) || null;
}
export const layoutInUse = id => state.deck.slides.filter(s => s.layoutId === id).length;
// Reorder among its master's layouts: one place up (−1) or down (+1)…
export function moveLayout(id, delta) {
  commit(() => {
    const lays = ensureLayouts(), lay = lays.find(l => l.id === id); if (!lay) return;
    const sibs = lays.filter(l => masterOf(l) === masterOf(lay)), other = sibs[sibs.indexOf(lay) + delta]; if (!other) return;
    const a = lays.indexOf(lay), b = lays.indexOf(other); [lays[a], lays[b]] = [lays[b], lays[a]];
  });
}
// …or to where another one is (dragged onto it).
export function moveLayoutTo(id, targetId) {
  commit(() => {
    const lays = ensureLayouts(), lay = lays.find(l => l.id === id), target = lays.find(l => l.id === targetId);
    if (!lay || !target || lay === target || masterOf(lay) !== masterOf(target)) return;
    const down = lays.indexOf(lay) < lays.indexOf(target);
    lays.splice(lays.indexOf(lay), 1);
    lays.splice(lays.indexOf(target) + (down ? 1 : 0), 0, lay);
  });
}
// PowerPoint's layout options: «Ocultar gráficos del patrón» (hideMaster) and
// «Usar fondo del patrón» (masterBg: the layout has no background of its own).
export function setLayoutOptions(id, { hideMaster, masterBg } = {}) {
  commit(() => {
    const l = ensureLayouts().find(x => x.id === id); if (!l) return;
    if (hideMaster != null) { if (hideMaster) l.hideMaster = true; else delete l.hideMaster; }
    if (masterBg === true) l.background = null;
    else if (masterBg === false && !l.background) l.background = viewBackground(l);
  });
}

// ---- Backgrounds -------------------------------------------------------------
// A layout without a background of its own shows its master's, and slides
// show their layout's: followLayouts carries the changes to the slides that
// still had the old one (not to those given one of their own).
export function layoutBackground(x, deck = state.deck) {
  if (!x) return null;
  return isMaster(x, deck) ? x.background || null : x.background || masterOf(x, deck).background || null;
}
// The usual background of a master's slides (the most frequent).
export function commonBackground(m = ensureMaster(), deck = state.deck) {
  const n = new Map();
  for (const s of deck.slides) if (s.background && masterOf(s, deck) === m) n.set(s.background, (n.get(s.background) || 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
// What the master view shows behind a master or a layout.
export const viewBackground = (x, deck = state.deck) => layoutBackground(x, deck) || commonBackground(masterOf(x, deck), deck) || deck.slides[0]?.background || '#101317';
// Whether a slide still has the background it got (`was`; none set: the usual one).
const followsBackground = (s, was, deck) => s.background === (was || commonBackground(masterOf(s, deck), deck));
export const MEDIA_PH = ['picture', 'table', 'chart'];
export function addPlaceholder(ph) {
  commit(() => {
    const lay = state.deck.layouts?.find(l => l.id === state.ui.editMaster); if (!lay) return;
    const { w, h } = state.deck.size;
    const box = { x: Math.round(w * 0.1), y: Math.round(h * (ph === 'title' ? 0.08 : 0.3)), w: Math.round(w * 0.8), h: Math.round(h * (ph === 'title' || ph === 'subtitle' ? 0.15 : 0.55)) };
    const b = MEDIA_PH.includes(ph) ? { id: uid(), type: 'placeholder', ph, ...box, rotation: 0, animation: null }
      : { id: uid(), type: 'text', ph, ...box, rotation: 0, animation: null, html: '' };
    lay.blocks.push(b); state.ui.selection = b.id;
  });
}

// Moving or resizing a layout placeholder moves the slides' placeholders that
// were still where it was (the ones moved by hand stay); changing a master's
// or layout's background in the master view changes the slides' that still
// had the old one. It follows every change, so undo moves them back too.
let geo = new Map(), bgs = new Map(), bgDeck = null;
const key = b => `${b.x},${b.y},${b.w},${b.h}`;
const bgMap = d => new Map([...allMasters(d).map(m => ['m:' + m.id, m.background || null]),
  ...(d.layouts || []).map(l => ['l:' + l.id, layoutBackground(l, d)])]);
export function followLayouts() {
  const snap = () => {
    geo = new Map((state.deck.layouts || []).flatMap(l => l.blocks.filter(b => b.ph).map(b => [b.id, key(b)])));
    bgs = bgMap(state.deck); bgDeck = state.deck;
  };
  snap();
  return subscribe(() => {
    const d = state.deck, moved = [], newBg = [];
    for (const l of d.layouts || []) for (const b of l.blocks) if (b.ph && geo.has(b.id) && geo.get(b.id) !== key(b)) moved.push([geo.get(b.id), b]);
    // (Not when another document comes, nor with undo: their slides come as they were.)
    if (d === bgDeck && state.ui.editMaster) for (const [k, now] of bgMap(d)) {
      if (!now || !bgs.has(k) || bgs.get(k) === now) continue;
      const id = k.slice(2), lay = k[0] === 'l' && d.layouts.find(l => l.id === id);
      const slides = lay ? d.slides.filter(s => s.layoutId === id) : d.slides.filter(s => !layoutOf(s, d) && masterOf(s, d).id === id);
      // (Without one before, the slides with the usual background: worked out before any changes.)
      newBg.push([slides, bgs.get(k) || commonBackground(lay ? masterOf(lay, d) : allMasters(d).find(m => m.id === id), d), now]);
    }
    let n = 0;
    for (const [slides, old, now] of newBg) for (const s of slides) if (s.background === old) { s.background = now; n++; }
    snap();
    for (const s of d.slides) for (const x of s.blocks) {
      const m = moved.find(([old, lp]) => x.lp === lp.id && key(x) === old);
      if (m) { Object.assign(x, { x: m[1].x, y: m[1].y, w: m[1].w, h: m[1].h }); n++; }
    }
    if (n) amend();
  });
}

export const PH_PROMPT = { title: 'Haz clic para añadir un título', subtitle: 'Haz clic para añadir un subtítulo', body: 'Haz clic para añadir texto' };
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); };
// An empty placeholder: nothing typed yet (no text, no image/equation inside).
export const isEmptyPlaceholder = b => b.type === 'placeholder' || !!(b.type === 'text' && b.ph && !plain(b.html) && !/<(img|svg|math)/i.test(b.html || ''));

// Fill a picture / table / chart placeholder: the object takes its place and size.
export function fillPlaceholder(id, block) {
  commit(() => {
    const s = currentSlide(), i = s.blocks.findIndex(b => b.id === id); if (i < 0) return;
    const p = s.blocks[i];
    s.blocks[i] = { ...block, id: block.id || uid(), x: p.x, y: p.y, w: p.w, h: p.h, rotation: 0, animation: p.animation || null, ...(p.lp && { lp: p.lp }) };
    state.ui.selection = s.blocks[i].id; state.ui.multi = [s.blocks[i].id];
  });
}

// A new master: a copy of the one being edited (styles and objects) with a
// copy of its layouts, to change from there (PowerPoint's "Duplicate Master").
export function addMaster() {
  commit(() => {
    const d = state.deck, src = contextMaster(d), id = uid();
    const copy = { ...structuredClone(src), id, name: `${src.name || 'Patrón'} (2)` };
    copy.blocks.forEach(b => { b.id = uid(); });
    (d.masters ||= []).push(copy);
    const lays = ensureLayouts(d).filter(l => masterOf(l, d) === src).map(l => {
      const c = { ...structuredClone(l), id: uid(), masterId: id };
      c.blocks.forEach(b => { b.id = uid(); });
      return c;
    });
    d.layouts.push(...lays);
    state.ui.editMaster = id; state.ui.selection = null;
  });
}
export function deleteMaster(id) {
  commit(() => {
    const d = state.deck, lays = (d.layouts || []).filter(l => l.masterId === id);
    if (!d.masters?.some(m => m.id === id) || d.slides.some(s => lays.some(l => l.id === s.layoutId))) return;
    d.masters = d.masters.filter(m => m.id !== id);
    d.layouts = d.layouts.filter(l => l.masterId !== id);
    if (state.ui.editMaster) state.ui.editMaster = true;   // back to the main master, only if in the master view
  });
}
export const masterInUse = id => { const d = state.deck; return d.slides.filter(s => d.layouts?.some(l => l.id === s.layoutId && (l.masterId || ensureMaster(d).id) === id)).length; };
