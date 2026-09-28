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

import { state, commit, subscribe, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';

export const MAX_LEVELS = 5;
export const DEFAULT_STYLES = {
  title: { size: 48, bold: true },
  subtitle: { size: 30 },
  body: { size: 30, levels: [{ size: 30, bullet: 'disc' }, { size: 26, bullet: 'circle' }, { size: 24, bullet: 'square' }, { size: 22, bullet: 'disc' }, { size: 20, bullet: 'circle' }] },
};
export const ensureMaster = (deck = state.deck) => (deck.master ||= { id: 'master', blocks: [], background: null });
export const masterStyles = (deck = state.deck) => {
  const m = ensureMaster(deck);
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
  if (!slide || slide.hideMaster) return [];
  if (slide === deck.master) return [];
  const lay = isLayout(slide, deck) ? slide : layoutOf(slide, deck);
  const master = lay?.hideMaster ? [] : (deck.master?.blocks || []);
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
  const st = masterStyles(deck)[kind];
  const lp = !isLayout(slide, deck) && slide !== deck.master ? layoutPlaceholder(b, slide, deck) : null;
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
    const st = masterStyles()[kind];
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
    const old = s.blocks, used = new Set();
    const texts = old.filter(b => b.type === 'text' && (b.html || '').replace(/<[^>]*>/g, '').trim());
    const take = test => { const b = texts.find(x => !used.has(x) && test(x)); if (b) used.add(b); return b; };
    const fresh = freshPlaceholders(lay);
    for (const p of fresh) {
      const src = styleKind(p) === 'title' ? take(b => styleKind(b) === 'title') || take(b => !b.ph)
        : take(b => styleKind(b) === styleKind(p)) || take(b => styleKind(b) !== 'title');
      if (src) p.html = src.html;
    }
    s.layoutId = lay.id;
    // Old empty placeholders go; connectors to moved text go with it.
    const keep = old.filter(b => !used.has(b) && !(b.ph && !(b.html || '').replace(/<[^>]*>/g, '').trim())
      && !(b.type === 'connector' && [...used].some(u => u.id === b.from || u.id === b.to)));
    s.blocks = [...fresh, ...keep];
    state.ui.selection = null;
  });
}
export const newSlideBlocks = lay => freshPlaceholders(lay);
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
    const lay = src ? { ...structuredClone(src), id: uid(), name: src.name + ' (2)' } : { id: uid(), name: 'Diseño personalizado', background: null, blocks: [] };
    if (src) lay.blocks.forEach(b => { b.id = uid(); });
    ensureLayouts().push(lay); state.ui.editMaster = lay.id; state.ui.selection = null;
  });
}
export function renameLayout(id, name) { commit(() => { const l = ensureLayouts().find(x => x.id === id); if (l && name) l.name = name; }); }
export function deleteLayout(id) {
  commit(() => {
    const d = state.deck; if (d.slides.some(s => s.layoutId === id) || ensureLayouts().length < 2) return;
    d.layouts = d.layouts.filter(l => l.id !== id); state.ui.editMaster = true;
  });
}
export const layoutInUse = id => state.deck.slides.filter(s => s.layoutId === id).length;
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
// were still where it was (the ones moved by hand stay). It follows every
// change, so undo moves them back too.
let geo = new Map();
const key = b => `${b.x},${b.y},${b.w},${b.h}`;
export function followLayouts() {
  const snap = () => { geo = new Map((state.deck.layouts || []).flatMap(l => l.blocks.filter(b => b.ph).map(b => [b.id, key(b)]))); };
  snap();
  return subscribe(() => {
    const moved = [];
    for (const l of state.deck.layouts || []) for (const b of l.blocks) if (b.ph && geo.has(b.id) && geo.get(b.id) !== key(b)) moved.push([geo.get(b.id), b]);
    snap();
    if (!moved.length) return;
    let n = 0;
    for (const s of state.deck.slides) for (const x of s.blocks) {
      const m = moved.find(([old, lp]) => x.lp === lp.id && key(x) === old);
      if (m) { Object.assign(x, { x: m[1].x, y: m[1].y, w: m[1].w, h: m[1].h }); n++; }
    }
    if (n) commit(() => {}, { history: false });
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
