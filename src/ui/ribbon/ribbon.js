// The ribbon: tab switching and wiring every control to a feature.

import { author, tasksOf } from '../../features/collab/comments.js';
import { renderMorphHint } from '../shell/morphhint.js';
import { openSaveWhere } from '../shell/where.js';
import { openBackstage } from '../shell/backstage.js';
import { renderContextual } from './contextual.js';
import { state, commit, currentSlide, selectedBlock, selectedBlocks, canUndo, canRedo, targetSlides, slideSelCount } from '../../core/store.js';
import { savedHere, onSavedHere, UNTITLED, isUntitled } from '../../core/model.js';
import { addPlaceholder } from '../../features/document/master.js';
import * as blocks from '../../features/document/blocks.js';
import * as slides from '../../features/document/slides.js';
import * as format from '../../features/document/format.js';
import * as trans from '../../features/animation/transitions.js';
import * as templates from '../../features/document/templates.js';
import * as master from '../../features/document/master.js';
import * as clip from '../../features/document/clipboard.js';
import { autocorrectOn } from '../../features/document/autocorrect.js';
import { aiRewrite } from '../dialogs/ai.js';
import { DONATE_URL, EDITION, OFFICIAL_SITE } from '../../core/config.js';
import { canvasOn } from '../../features/design/canvasmode.js';
import { fitChoice, setFitMode } from '../../features/design/screenfit.js';
import { canvasViewOpen } from '../shell/canvasview.js';
import { editAnyway } from '../dialogs/signature.js';
import * as protect from '../../features/collab/protect.js';
import { openAppearance, applyAppearance } from '../shell/appearance.js';
import * as palettes from '../../features/design/palettes.js';
import { kitColours } from '../../features/design/brandkit.js';
import { SHAPE_NAMES, shapeThumb } from '../../render/svg.js';
import { startFreeform } from '../canvas/freeform.js';
import { resizeDeck } from '../../features/design/resize.js';
import { setDrawTool, drawOpts } from '../shell/draw.js';
import { FONTS, ensureDeckFonts, customFonts, customStack, syncCustomFonts, fontDataURL } from '../../features/design/fonts.js';
import { t, currentLang } from '../../i18n/index.js';
import { readFile } from '../shell/openfile.js';
import { animPaint, endAnimPaint, ACTIONS, slidesFocused } from './actions.js';
import { applyZoom, fitZoom, zoomFitting, wireZoom } from './zoom.js';
import { compactGroups } from './compact.js';
import { wireTransitionPreview, flashTransitionPreview } from './transpreview.js';
import { playEdited } from './livepreview.js';
import { closePopover, togglePopover } from './popovers.js';
import { syncMasterRibbon } from '../shell/masterview.js';
import { syncCharState, syncBoxFormat, syncSlideState, press } from './reflect.js';
import { wireAnimRibbon, syncAnimRibbon } from './animribbon.js';

// Insert ▸ Templates buttons that are the deck's layouts.
const TEMPLATE_LAYOUT = { title: 'title', titleContent: 'titleContent', twoContent: 'twoContent', sectionHeader: 'section', blank: 'blank' };

const $ = s => document.querySelector(s);
// The title bar's save state: [icon, text, tooltip] (Spanish, translated when shown).
const SAVE_OK = ['computer', 'En este navegador', 'Solo está en este navegador (se guarda con cada cambio). Haz clic para guardarla en Google Drive o en tu nube.'];
const SAVE_FAILED = ['error', 'Sin guardar', 'Este navegador no deja guardar la presentación (¿ventana privada o disco lleno?). Haz clic para descargar una copia.'];

// Fill the font picker from the catalogue (each option shown in its own font
// where already available).
// Then the presentation's own fonts, and «Subir una fuente…» to add one.
let fontsKey = null;
function populateFonts() {
  const sel = $('[data-font]'); if (!sel) return;
  const own = customFonts(state.deck), key = own.map(f => f.name).join('|'); if (key === fontsKey) return; fontsKey = key;
  const cur = sel.value; sel.innerHTML = '';
  const add = (parent, value, name, family) => { const o = document.createElement('option'); o.value = value; o.textContent = name; if (family) o.style.fontFamily = family; parent.appendChild(o); };
  for (const f of FONTS) add(sel, f.stack, f.name, f.stack);
  if (own.length) { const g = document.createElement('optgroup'); g.label = t('Fuentes de la presentación'); own.forEach(f => add(g, customStack(f.name), f.name, customStack(f.name))); sel.appendChild(g); }
  add(sel, '__upload', t('Subir una fuente (.ttf, .otf, .woff)…'));
  sel.value = cur;
}

// Insert ▸ Shapes: the most used, drawn as they are, in three rows (the rest in «Más formas»).
const QUICK_SHAPES = ['rect', 'rounded', 'ellipse', 'triangle', 'rtriangle', 'diamond', 'pentagon', 'hexagon', 'star', 'star6', 'burst', 'heart',
  'rightarrow', 'leftarrow', 'uparrow', 'leftrightarrow', 'chevron', 'speech', 'speechround', 'cloud', 'plus', 'line', 'arrow', 'freeform'];
function fillShapeGallery() {
  const g = document.querySelector('[data-shape-gallery]'); if (!g) return;
  g.innerHTML = QUICK_SHAPES.map(k => `<button data-shape="${k}" title="${t(SHAPE_NAMES[k] || k)}">${shapeThumb(k)}</button>`).join('');
}
export function initRibbon() {
  fillShapeGallery();
  onSavedHere(() => renderRibbon());
  // (Only in this browser: a click asks where to keep it; if this browser can't even keep it, it downloads a copy.)
  { const ss = $('#save-state'), copy = e => { if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (savedHere()) openSaveWhere(ss); else ACTIONS['download-project'](); } };
    ss?.addEventListener('click', copy); ss?.addEventListener('keydown', copy); }
  // Master view: insert a placeholder into the layout being edited.
  document.querySelector('#ribbon .mb-ph')?.addEventListener('change', e => {
    if (e.target.value) addPlaceholder(e.target.value); e.target.value = '';
  });
  populateFonts();
  applyZoom(); wireZoom(); wireTransitionPreview(document.getElementById('ribbon') || document); wireAnimRibbon();
  // On phones/tablets, start zoomed to fit and refit on rotation/resize.
  const small = () => window.innerWidth < 860 || window.innerHeight < 520;
  // The slide fits the space it has — at start, when the window or the panels
  // around it change — until the user chooses a zoom of their own.
  requestAnimationFrame(fitZoom);
  let rt; const refit = () => { clearTimeout(rt); rt = setTimeout(() => { if (zoomFitting() || small()) fitZoom(); }, 120); };
  window.addEventListener('resize', refit);
  const wrap = document.getElementById('canvas-wrap');
  if (wrap && window.ResizeObserver) new ResizeObserver(refit).observe(wrap);
  // Painter: the next object clicked on the slide receives the copied animation.
  document.getElementById('stage').addEventListener('click', e => {
    if (!animPaint) return;
    const el = e.target.closest('.block');
    if (el) trans.pasteAnimationTo([el.dataset.id], animPaint);
    endAnimPaint();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && animPaint) endAnimPaint(); });
  applyAppearance();
  document.getElementById('ap-btn')?.addEventListener('click', () => openAppearance());
  const don = document.getElementById('donate');
  if (don && DONATE_URL) { don.href = DONATE_URL; don.hidden = false; }
  // The open edition points to the official one's plans (the official one shows the account instead).
  const pre = document.getElementById('premium');
  if (pre && EDITION === 'open') { pre.href = OFFICIAL_SITE + '/pricing'; pre.hidden = false; }
  document.body.dataset.edition = EDITION;
  document.getElementById('final-banner')?.addEventListener('click', e => {
    if (e.target.closest('[data-action="mark-final"]')) editAnyway();
  });
  window.addEventListener('revela:readonly', () => {
    const fb = document.getElementById('final-banner'); if (!fb) return;
    fb.classList.remove('flash'); void fb.offsetWidth; fb.classList.add('flash');
  });
  window.addEventListener('revela:cloud-status', () => renderRibbon());   // (OneDrive's chip stands for «In this browser»)
  // (The phones' quick bar, outside the ribbon: the same actions.)
  document.getElementById('m-quick')?.addEventListener('click', e => {
    const act = e.target.closest('[data-action]');
    if (act) ACTIONS[act.dataset.action]?.();
  });
  document.getElementById('master-banner')?.addEventListener('click', e => {
    const act = e.target.closest('[data-action]');
    if (act) ACTIONS[act.dataset.action]?.();
  });
  document.getElementById('ribbon').addEventListener('click', e => {
    const more = e.target.closest('[data-more]');
    if (more) { e.stopPropagation(); togglePopover(more, more.dataset.more); return; }
    const sym = e.target.closest('[data-symbols]');
    if (sym) { e.stopPropagation(); togglePopover(sym, 'symbols'); return; }
    const ics = e.target.closest('[data-icons]');
    if (ics) { e.stopPropagation(); togglePopover(ics, 'icons'); return; }
    const wa = e.target.closest('[data-wordart]');
    if (wa) { e.stopPropagation(); togglePopover(wa, 'wordart'); return; }
    const rw = e.target.closest('[data-ai-rewrite]');
    if (rw) { aiRewrite(rw.dataset.aiRewrite); return; }
    const dr = e.target.closest('[data-draw]');
    if (dr) { dr.dataset.draw ? setDrawTool(dr.dataset.draw) : commit(() => (state.ui.drawTool = null), { history: false }); return; }
    const th = e.target.closest('[data-themes-open]');
    if (th) { e.stopPropagation(); togglePopover(th, 'themes'); return; }
    const po = e.target.closest('[data-palettes-open]');
    if (po) { e.stopPropagation(); togglePopover(po, 'palettes'); return; }
    const fo = e.target.closest('[data-fontpairs-open]');
    if (fo) { e.stopPropagation(); togglePopover(fo, 'fontpairs'); return; }
    const ns = e.target.closest('[data-newslide-open]');
    if (ns) { e.stopPropagation(); togglePopover(ns, 'newslide'); return; }
    const lo = e.target.closest('[data-layout-open]');
    if (lo) { e.stopPropagation(); togglePopover(lo, 'layout'); return; }
    const tab = e.target.closest('[data-tab]');
    // (File: its own page — New, Open, Save, Share, Export… — not a ribbon of thirty buttons. In the master view the
    // tab keeps its ribbon: the master's own tools are there.)
    if (tab?.dataset.tab === 'file' && !state.ui.editMaster) { openBackstage(); return; }
    if (tab) { commit(() => (state.ui.activeTab = tab.dataset.tab), { history: false }); return; }
    const act = e.target.closest('[data-action]');
    if (act) { ACTIONS[act.dataset.action]?.(); return; }
    const st = e.target.closest('[data-slide-transition]');
    if (st) { trans.setSlideTransition(st.dataset.slideTransition); return; }
    const an = e.target.closest('[data-animation]');
    if (an) { trans.setAnimation(an.dataset.animation); playEdited(); return; }
    const tpl = e.target.closest('[data-template]');
    // (The ones named like a layout apply the deck's layout, as Home ▸ Layout does: one feature, one behaviour.)
    if (tpl) { const lay = TEMPLATE_LAYOUT[tpl.dataset.template]; if (lay && master.ensureLayouts().some(l => l.id === lay)) master.applyLayout(lay); else templates.applyTemplate(templates.BUILTIN[tpl.dataset.template]); return; }
    const al = e.target.closest('[data-align]');
    if (al) { blocks.alignSelected(al.dataset.align); return; }
    const dist = e.target.closest('[data-distribute]');
    if (dist) { blocks.distributeSelected(dist.dataset.distribute); return; }
    const ratio = e.target.closest('[data-ratio]');
    if (ratio) { const [rw, rh] = ratio.dataset.ratio.split('x').map(Number); resizeDeck(rw, rh); requestAnimationFrame(fitZoom); return; }
    const fd = e.target.closest('[data-fontdelta]');
    if (fd) { format.fontSize(+fd.dataset.fontdelta); return; }
    const cs = e.target.closest('[data-case]');
    if (cs) { format.changeCase(cs.dataset.case); return; }
    const pa = e.target.closest('[data-para]');
    if (pa) { format.align(pa.dataset.para); return; }
    const va = e.target.closest('[data-valign]');
    if (va) { format.setVAlign(va.dataset.valign); return; }
    const ind = e.target.closest('[data-indentdelta]');
    if (ind) { format.adjustIndent(+ind.dataset.indentdelta); return; }
    const li = e.target.closest('[data-list]');
    if (li) { format.list(li.dataset.list); return; }
    const so = e.target.closest('[data-shapes-open]');
    if (so) { e.stopPropagation(); togglePopover(so, 'shapes'); return; }
    const sh = e.target.closest('[data-shape]');
    if (sh) { if (sh.dataset.shape === 'freeform') startFreeform(); else blocks.addShape(sh.dataset.shape); return; }
    const dir = e.target.closest('[data-dir]');
    if (dir) { format.toggleDir(); return; }
    const vert = e.target.closest('[data-vertical]');
    if (vert) { format.toggleVertical(); return; }
    const dgo = e.target.closest('[data-diagrams-open]');
    if (dgo) { e.stopPropagation(); togglePopover(dgo, 'diagrams'); return; }
    const diag = e.target.closest('[data-diagram]');
    if (diag) { blocks.addDiagram(diag.dataset.diagram); return; }
  });

  // Formatting controls must not steal focus (and thus the selection) from the
  // editable text, so they preventDefault on mousedown.
  document.querySelectorAll('[data-fmt]').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => format.exec(btn.dataset.fmt));
  });
  document.querySelectorAll('[data-case],[data-para],[data-list],[data-dir],[data-vertical],[data-valign],[data-indentdelta]')
    .forEach(btn => btn.addEventListener('mousedown', e => e.preventDefault()));
  bindInput('[data-color]', v => format.color(v), true);
  bindInput('[data-highlight]', v => format.highlight(v), true);
  bindInput('[data-shape-fill]', v => blocks.setShapeStyle('fill', v), true);
  bindInput('[data-shape-stroke]', v => blocks.setShapeStyle('stroke', v), true);
  bindInput('[data-bg]', v => commit(() => targetSlides().forEach(s => { s.background = v; })));        // (the selected slides)
  bindInput('[data-master-bg]', v => commit(() => (currentSlide().background = v)));      // (the master's or the layout's, in the master view)
  bindInput('[data-deck-fg]', v => palettes.setDeckTextColor(v));
  bindInput('[data-ink-color]', v => { drawOpts.color = v; });
  bindChange('[data-slide-trans-out]', v => trans.setSlideTransOptions({ transitionOut: v }));
  bindChange('[data-slide-trans-dir]', v => { trans.setSlideTransOptions({ transitionDir: v }); flashTransitionPreview('[data-slide-trans-dir]'); });
  bindChange('[data-slide-speed]', v => { trans.setSlideTransOptions({ transitionSpeed: v }); flashTransitionPreview('[data-slide-speed]'); });
  bindChange('[data-ink-width]', v => { drawOpts.width = +v || 4; });
  addEyedroppers();
  bindChange('[data-theme]', v => commit(() => (state.deck.theme = v)));
  bindChange('[data-speed]', v => trans.setTransitionSpeed(v));
  bindChange('[data-deck-transition]', v => trans.setDeckTransition(v));
  bindChange('[data-fit]', v => setFitMode(v));
  bindChange('[data-font]', v => {
    if (v !== '__upload') { format.fontFamily(v); return; }
    $('[data-font]').value = '';
    readFile('.ttf,.otf,.woff,.woff2', f => {                  // (the file itself: its name is the font's)
      const r = new FileReader();
      r.onload = () => { const stack = blocks.addCustomFont(f.name.replace(/\.[^.]+$/, ''), fontDataURL(r.result, f.name)); syncCustomFonts(state.deck); format.fontFamily(stack); };
      r.readAsDataURL(f);
    }, 'file');
  });
  bindChange('[data-morphby]', v => slides.setMorphBy(v));
  bindChange('[data-line-dash]', v => blocks.setLineDash(v));
  bindChange('[data-size]', v => format.setFontSize(parseInt(v, 10) || 40));
  bindChange('[data-linespacing]', v => format.lineSpacing(v));
  bindChange('[data-textstyle]', v => { if (v) format.applyTextStyle(v); });
  bindChange('[data-logo-pos]', v => commit(() => (state.deck.logo.position = v)));
  bindChange('[data-logo-size]', v => commit(() => (state.deck.logo.size = Math.max(20, parseInt(v, 10) || 120))));
  bindChange('[data-autoslide]', v => commit(() => targetSlides().forEach(s => { s.autoSlide = Math.max(0, (parseFloat(v) || 0)) * 1000; })));

  // Reflect the active character formatting on the toolbar as the caret moves: once per frame at most — while
  // typing, every ~100 ms (each key moves the caret, and asking the browser the state of every button took most of
  // a key's time on a slow machine) — and only the buttons in sight (a tab shown redraws the ribbon, and them).
  let charQueued = false;
  document.addEventListener('selectionchange', () => {
    if (charQueued) return; charQueued = true;
    const run = () => { charQueued = false; syncCharState(false, true); };
    if (document.activeElement?.isContentEditable) setTimeout(run, 100); else requestAnimationFrame(run);
  });

  // Status-bar actions (zoom) live outside the ribbon.
  document.getElementById('statusbar').addEventListener('click', e => {
    const act = e.target.closest('[data-action]');
    if (act) ACTIONS[act.dataset.action]?.();
  });

  // Let the mouse wheel scroll the ribbon sideways when the groups overflow
  // (every page, also the selected object's, added later), and fade the edge
  // that has more buttons beyond it.
  const pages = $('#ribbon .pages');
  pages?.addEventListener('wheel', e => {
    const page = e.target.closest('.ribbon-page'); if (!page || page.scrollWidth <= page.clientWidth) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;     // trackpad already horizontal
    e.preventDefault(); page.scrollLeft += e.deltaY;
  }, { passive: false });
  pages?.addEventListener('scroll', e => markOverflow(e.target), true);
  // Arrows over the faded edges: it's plain that there is more, and a click shows it.
  for (const dir of [-1, 1]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rb-more ' + (dir > 0 ? 'right' : 'left');
    b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); b.innerHTML = '<i class="ms">' + (dir > 0 ? 'chevron_right' : 'chevron_left') + '</i>';
    b.addEventListener('click', () => { const pg = pages.querySelector('.ribbon-page.active'); pg?.scrollBy({ left: dir * pg.clientWidth * 0.7, behavior: 'smooth' }); });
    pages?.appendChild(b);
  }
  window.addEventListener('resize', () => document.querySelectorAll('#ribbon .ribbon-page.active').forEach(markOverflow));

  // Editable document title.
  const docName = $('.doc-name');
  if (docName) {
    docName.addEventListener('input', () => { state.deck.name = docName.textContent.trim(); });
    docName.addEventListener('blur', () => {
      const typed = docName.textContent.trim(), name = !typed || typed === t(UNTITLED) ? UNTITLED : typed;
      commit(() => { state.deck.name = name; }, { history: false });
    });
    docName.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); docName.blur(); }
    });
  }

  // Speaker notes for the current slide.
  const notes = document.getElementById('notes');
  if (notes) notes.addEventListener('input', () => {
    const s = currentSlide(); if (s) commit(() => { s.notes = notes.value; }, { history: false });
  });
}

document.addEventListener('click', () => closePopover());

function bindInput(sel, cb, keepFocus) {
  const el = $(sel); if (!el) return;
  if (keepFocus) el.addEventListener('mousedown', e => e.stopPropagation());
  el.addEventListener('input', e => cb(e.target.value));
}
// Eyedropper next to each colour picker (EyeDropper API: Chrome/Edge/Opera).
// It samples any pixel on screen and feeds the colour through the same input
// event as the picker, so undo and all targets work unchanged.
const EYEDROP_TARGETS = ['[data-color]', '[data-highlight]', '[data-shape-fill]', '[data-shape-stroke]', '[data-bg]', '[data-master-bg]'];
export function applyPickedColour(input, hex) {
  input.value = hex; input.dispatchEvent(new Event('input', { bubbles: true }));
}
function addEyedroppers() {
  if (!('EyeDropper' in window)) return;
  for (const sel of EYEDROP_TARGETS) {
    const inp = $(sel); const lab = inp?.closest('label'); if (!lab) continue;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'eyedrop'; btn.dataset.eyedrop = sel;
    btn.title = t('Cuentagotas'); btn.innerHTML = '<i class="ms">colorize</i>';
    btn.addEventListener('mousedown', e => e.preventDefault());       // keep the text selection
    btn.addEventListener('click', async () => {
      const ws = getSelection(), range = ws.rangeCount ? ws.getRangeAt(0).cloneRange() : null;
      try {
        const { sRGBHex } = await new window.EyeDropper().open();
        if (range) { ws.removeAllRanges(); ws.addRange(range); }
        applyPickedColour(inp, sRGBHex);
      } catch {}                                                        // cancelled with Esc
    });
    lab.after(btn);
  }
}
// Theme colours and the brand kits' offered as swatches in every colour picker (<datalist>).
let swatchKey = '';
function syncSwatches() {
  const cols = [...new Set([...palettes.paletteColours(), ...kitColours()].map(c => c.toLowerCase()))], key = cols.join();
  if (key === swatchKey) return; swatchKey = key;
  let dl = document.getElementById('theme-swatches');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'theme-swatches'; document.body.appendChild(dl); }
  dl.innerHTML = cols.map(c => `<option value="${c}"></option>`).join('');
  document.querySelectorAll('#ribbon input[type=color]').forEach(i => i.setAttribute('list', 'theme-swatches'));
}
// (Those in dialogs and panels too, when they are about to be used.)
document.addEventListener('focusin', e => { if (e.target.matches?.('input[type=color]:not([list])')) e.target.setAttribute('list', 'theme-swatches'); });
document.addEventListener('pointerdown', e => { if (e.target.matches?.('input[type=color]:not([list])')) e.target.setAttribute('list', 'theme-swatches'); }, true);
function bindChange(sel, cb) { const el = $(sel); if (el) el.addEventListener('change', e => cb(e.target.value)); }

let lastActiveTab = null, overflowQueued = false;
// More buttons to the right or left of what shows: the edge fades.
export function markOverflow(page) {
  if (!page?.classList?.contains('ribbon-page')) return;
  const more = page.scrollWidth - page.clientWidth > 2;
  page.classList.toggle('more-right', more && page.scrollLeft + page.clientWidth < page.scrollWidth - 2);
  page.classList.toggle('more-left', more && page.scrollLeft > 2);
  if (page.classList.contains('active')) {                 // (the arrows over the edges)
    const pg = page.parentElement;
    pg.classList.toggle('has-right', page.classList.contains('more-right')); pg.classList.toggle('has-left', page.classList.contains('more-left'));
  }
}
// Slide-level controls: with several slides selected in the panel they act on
// all of them, and their tooltips say so ("Aplicar a todas" stays as it is).
const SLIDE_LEVEL = ['[data-action="slide-duplicate"]', '[data-action="slide-delete"]', '[data-action="slide-vertical"]', '[data-layout-open]',
  '[data-page="design"] label.color:has([data-bg])', '[data-action="bg-gradient"]', '[data-page="design"] [data-action="bg-image"]', '[data-page="design"] [data-action="bg-advanced"]',
  '[data-slide-transition]', '[data-slide-trans-dir]', '[data-slide-trans-out]', '[data-slide-speed]', '[data-autoslide]',
  '[data-action="toggle-autoanimate"]', '[data-morphby]'].join(',');
// (Only when the number of selected slides or the language changes: walking these controls — :has() among them —
// at every redraw was a third of the ribbon's time on a big deck.)
let tipsKey = '';
function syncSelectionTips() {
  const n = slideSelCount(), key = n > 1 ? n + currentLang() : '1' + currentLang(); if (key === tipsKey) return; tipsKey = key;
  const more = n > 1 ? t('Se aplica a las {n} diapositivas seleccionadas').replace('{n}', n) : '';
  document.querySelectorAll(SLIDE_LEVEL).forEach(el => {
    if (el.dataset.selTip === undefined) el.dataset.selTip = el.dataset.i18nt ?? el.getAttribute('title') ?? '';
    const base = el.dataset.selTip ? t(el.dataset.selTip) : '', tip = [base, more].filter(Boolean).join(' · ');
    if (tip) el.title = tip; else el.removeAttribute('title');
    el.classList.toggle('for-sel', n > 1);
  });
}

// change: what the redraw is for (store.lastChange()); none: everything. Only the screen changed (a selection,
// a tab): what follows from the document's content (its fonts, its colours) stays as it is.
export function renderRibbon(change) {
  const doc = !change || change.doc;
  if (doc) { populateFonts(); syncCustomFonts(state.deck); }
  syncSelectionTips();
  syncMasterRibbon();            // (before the tabs: entering the master view opens its tab)
  if (doc) ensureDeckFonts(state.deck);   // load any Google fonts the deck uses
  document.querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === state.ui.activeTab));
  // (On a narrow screen the tabs scroll: keep the active one in view.)
  { const at = document.querySelector('#ribbon .tabs .active'); if (at && at !== lastActiveTab) { lastActiveTab = at; at.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); } }
  document.querySelectorAll('.ribbon-page').forEach(p => p.classList.toggle('active', p.dataset.page === state.ui.activeTab));
  const docName = $('.doc-name');
  const shownName = isUntitled(state.deck.name) ? t(UNTITLED) : state.deck.name;
  if (docName && document.activeElement !== docName && docName.textContent !== shownName) docName.textContent = shownName;
  syncValue('[data-theme]', state.deck.theme);
  syncValue('[data-deck-fg]', palettes.deckFg());
  // The detected theme's name under Design ▸ Themes (an imported Office, Google Slides or LibreOffice theme).
  { const el = $('[data-theme-now]'), nm = state.deck.officeTheme?.name || '';
    if (el && el.textContent !== nm) { el.textContent = nm; el.hidden = !nm; } }
  { const v = $('[data-action="slide-vertical"]'); if (v) { v.classList.toggle('on', !!currentSlide()?.vertical); v.disabled = state.ui.slideIndex === 0 || !!state.ui.editMaster; } }
  // Buttons that need a (suitable) selection are disabled without one, instead of doing nothing.
  { const sel = selectedBlocks(), texts = sel.filter(b => b.type === 'text'), objs = sel.filter(b => b.type !== 'connector');
    const need = { front: sel.length, back: sel.length, forward: sel.length, backward: sel.length,
      group: objs.length >= 2, ungroup: sel.some(b => b.groupId), 'connect-blocks': objs.length === 2,
      'tidy-grid': objs.length >= 2, 'tidy-row': objs.length >= 2, 'tidy-col': objs.length >= 2, 'match-w': objs.length >= 2, 'match-h': objs.length >= 2, 'match-size': objs.length >= 2, 'swap-objects': objs.length === 2,
      'copy-style': sel.length === 1, 'paste-style': sel.length && format.hasStyleClip(),
      'obj-anim-clear': sel.some(b => b.animation), 'anim-play': (currentSlide()?.blocks || []).some(b => b.animation) };
    for (const [a, ok] of Object.entries(need)) document.querySelectorAll(`[data-action="${a}"]`).forEach(el => { el.disabled = !ok; }); }
  // (From the slides panel: the selected slides.)
  { const has = !!selectedBlock() || slidesFocused(); ['clip-copy', 'clip-cut', 'obj-duplicate'].forEach(a => { const el = $(`[data-action="${a}"]`); if (el) el.disabled = !has; });
    const p = $('[data-action="clip-paste"]'); if (p) p.disabled = !clip.hasClipboard() && !(state.ui.navFocus && slides.hasSlideClip());
    // (Selection as a picture: like Copy, off without anything selected — not a button that answers with an alert.)
    const sp = $('[data-action="save-picture"]'); if (sp) sp.disabled = !selectedBlock() && !(state.ui.multi || []).length; }
  $('[data-action="mark-final"]')?.classList.toggle('on', protect.isFinal());
  $('[data-action="classroom"]')?.classList.toggle('on', !!state.deck.classroom);
  document.querySelectorAll('[data-action="selection-pane"]').forEach(b => b.classList.toggle('on', !!state.ui.showSelection));
  document.querySelectorAll('[data-action="anim-panel"]').forEach(b => b.classList.toggle('on', !!state.ui.showAnim));
  // My open tasks (comments assigned to me), counted on the Comments button.
  { const n = author() ? tasksOf({ who: author() }).length : 0;
    document.querySelectorAll('[data-action="comments"]').forEach(b => {
      let c = b.querySelector('.tk-count'); if (!n) { c?.remove(); return; }
      if (!c) { c = document.createElement('span'); c.className = 'tk-count'; b.appendChild(c); }
      c.textContent = n; c.title = t('Tareas pendientes para ti'); }); }
  document.querySelectorAll('[data-action="undo"]').forEach(b => { b.disabled = !canUndo(); });
  document.querySelectorAll('[data-action="redo"]').forEach(b => { b.disabled = !canRedo(); });
  // Saved here after a change (unless Drive shows its own state); if this browser
  // can't keep it, that shows instead, and a click downloads a copy.
  { const ss = $('#save-state'); if (ss) { const ok = savedHere();
    // (Always said — where it lives — not only after the first change: Drive's or the cloud's own state stands in for it.)
    ss.hidden = !$('#drive-status')?.hidden || !$('#cloud-status')?.hidden || !$('#onedrive-status')?.hidden || !!state.ui.lock;
    if (ss.classList.contains('failed') !== !ok) {
      const [icon, text, tip] = ok ? SAVE_OK : SAVE_FAILED, sp = ss.querySelector('span');
      ss.classList.toggle('failed', !ok); ss.querySelector('.ms').textContent = icon;
      sp.dataset.i18n = text; sp.textContent = t(text); ss.dataset.i18nt = tip; ss.title = t(tip);
      ss.setAttribute('role', 'button'); ss.tabIndex = 0;
    } } }
  document.querySelector('[data-action="canvas-mode"]')?.classList.toggle('on', canvasOn());
  document.querySelectorAll('[data-action="canvas-view"]').forEach(b => b.classList.toggle('on', canvasViewOpen()));
  const fb = document.getElementById('final-banner'); if (fb) fb.hidden = !protect.isFinal();
  { const sigs = state.deck.signatures || [], sp = fb?.querySelector('span');
    if (sp) sp.textContent = sigs.length ? `${t('Firmada por')} ${sigs.map(s => s.name).join(', ')}: ${t('la presentación es de solo lectura.')}` : t('Marcada como final: la presentación es de solo lectura.'); }
  $('[data-action="comments"]')?.classList.toggle('on', !!state.ui.showComments);
  $('[data-action="autocorrect"]')?.classList.toggle('on', autocorrectOn());
  document.querySelectorAll('[data-action="master-edit"]').forEach(b => b.classList.toggle('on', !!state.ui.editMaster));
  syncSlideState();             // (transitions and background: the selected slides')
  document.querySelectorAll('[data-draw]').forEach(b => b.classList.toggle('on', (state.ui.drawTool || '') === b.dataset.draw));
  syncSwatches();
  syncValue('[data-speed]', state.deck.transitionSpeed);
  syncValue('[data-deck-transition]', state.deck.defaultTransition);
  syncValue('[data-fit]', fitChoice());
  document.body.classList.toggle('show-ruler', !!state.ui.showRuler);
  document.querySelector('[data-action="toggle-guides"]')?.classList.toggle('on', !!state.ui.showGuides);
  document.querySelector('[data-action="toggle-ruler"]')?.classList.toggle('on', !!state.ui.showRuler);
  document.querySelector('[data-action="toggle-snap"]')?.classList.toggle('on', state.ui.snap !== false);
  document.querySelector('[data-action="toggle-loop"]')?.classList.toggle('on', !!state.deck.loop);
  document.querySelector('[data-action="toggle-anim-bg"]')?.classList.toggle('on', !!state.deck.animateBg);
  const lg = state.deck.logo || {};
  syncValue('[data-logo-pos]', lg.position || 'br');
  const lsz = $('[data-logo-size]');
  if (lsz && document.activeElement !== lsz) lsz.value = String(lg.size || 120);
  applyZoom();   // keep the scaled footprint in sync with slide size / rulers
  const notesBar = document.getElementById('notes-bar');
  if (notesBar) notesBar.hidden = !state.ui.showNotes;
  document.querySelector('[data-action="toggle-notes"]')?.classList.toggle('on', !!state.ui.showNotes);
  const notes = document.getElementById('notes');
  if (notes && document.activeElement !== notes) notes.value = currentSlide()?.notes || '';

  // The selection's formatting, and its animations.
  syncBoxFormat(); syncAnimRibbon();
  renderContextual();
  queueMicrotask(() => syncCharState());   // (once the slide is drawn — its text is read — and after the object's tab: bold, italic… too)
  renderMorphHint();
  document.querySelectorAll('#ribbon .ribbon-page.active').forEach(p => compactGroups(p));
  // (Its faded edges: measured just before the frame is drawn, when the page is laid out anyway — measuring here
  // made the browser lay it out once more at every redraw.)
  if (!overflowQueued) { overflowQueued = true; requestAnimationFrame(() => { overflowQueued = false; document.querySelectorAll('#ribbon .ribbon-page.active').forEach(markOverflow); }); }
  toggleButtons().forEach(b => press(b, b.classList.contains('on')));
}
// Buttons that switch something on and off: aria-pressed follows their state.
const TOGGLES = ['[data-action^="toggle-"]:not([data-action="toggle-autoanimate"])', 'mark-final', 'classroom', 'selection-pane', 'comments', 'autocorrect', 'master-edit', 'canvas-mode', 'canvas-view', 'slide-vertical', 'anim-paint']
  .map(a => (a.startsWith('[') ? `#ribbon ${a}` : `#ribbon [data-action="${a}"]`)).concat('#ribbon [data-draw]').join(',');
// (Found again only when the ribbon's buttons change — the object's tab is new with each selection —: looking for
// them through the whole ribbon was half of a redraw's time.)
let toggles = null, ribbonMO = null;
function toggleButtons() {
  const rb = document.getElementById('ribbon'); if (!rb) return [];
  if (!ribbonMO) { ribbonMO = new MutationObserver(() => { toggles = null; }); ribbonMO.observe(rb, { childList: true, subtree: true }); }
  if (ribbonMO.takeRecords().length) toggles = null;
  return (toggles ||= [...document.querySelectorAll(TOGGLES)]);
}
function syncValue(sel, val) { const el = $(sel); if (el && el.value !== val) el.value = val; }
