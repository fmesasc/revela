// The ribbon: tab switching and wiring every control to a feature.

import { renderMorphHint } from '../shell/morphhint.js';
import { renderContextual } from './contextual.js';
import { state, commit, currentSlide, selectedBlock, selectedBlocks, canUndo, canRedo, docVersion } from '../../core/store.js';
import { MATH_SIZE } from '../../render/svg.js';
import { styled, addPlaceholder } from '../../features/document/master.js';
import * as blocks from '../../features/document/blocks.js';
import * as slides from '../../features/document/slides.js';
import * as format from '../../features/document/format.js';
import * as trans from '../../features/animation/transitions.js';
import * as templates from '../../features/document/templates.js';
import * as master from '../../features/document/master.js';
import * as clip from '../../features/document/clipboard.js';
import { autocorrectOn } from '../../features/document/autocorrect.js';
import { aiRewrite } from '../dialogs/ai.js';
import { DONATE_URL } from '../../core/config.js';
import { canvasOn } from '../../features/design/canvasmode.js';
import { canvasViewOpen } from '../shell/canvasview.js';
import { editAnyway } from '../dialogs/signature.js';
import * as protect from '../../features/collab/protect.js';
import { openAppearance, applyAppearance } from '../shell/appearance.js';
import * as palettes from '../../features/design/palettes.js';
import { setDrawTool, drawOpts } from '../shell/draw.js';
import { FONTS, ensureDeckFonts } from '../../features/design/fonts.js';
import { t } from '../../i18n/index.js';
import { animPaint, endAnimPaint, ACTIONS } from './actions.js';
import { applyZoom, fitZoom, zoomFitting } from './zoom.js';
import { closePopover, togglePopover } from './popovers.js';

const $ = s => document.querySelector(s);

// Fill the font picker from the catalogue (each option shown in its own font
// where already available).
function populateFonts() {
  const sel = $('[data-font]'); if (!sel) return;
  sel.innerHTML = '';
  for (const f of FONTS) {
    const o = document.createElement('option');
    o.value = f.stack; o.textContent = f.name;
    if (f.stack) o.style.fontFamily = f.stack;
    sel.appendChild(o);
  }
}

export function initRibbon() {
  // Master view: insert a placeholder into the layout being edited.
  document.querySelector('#master-banner .mb-ph')?.addEventListener('change', e => {
    if (e.target.value) addPlaceholder(e.target.value); e.target.value = '';
  });
  populateFonts();
  applyZoom();
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
  document.getElementById('final-banner')?.addEventListener('click', e => {
    if (e.target.closest('[data-action="mark-final"]')) editAnyway();
  });
  window.addEventListener('revela:readonly', () => {
    const fb = document.getElementById('final-banner'); if (!fb) return;
    fb.classList.remove('flash'); void fb.offsetWidth; fb.classList.add('flash');
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
    const po = e.target.closest('[data-palettes-open]');
    if (po) { e.stopPropagation(); togglePopover(po, 'palettes'); return; }
    const fo = e.target.closest('[data-fontpairs-open]');
    if (fo) { e.stopPropagation(); togglePopover(fo, 'fontpairs'); return; }
    const lo = e.target.closest('[data-layout-open]');
    if (lo) { e.stopPropagation(); togglePopover(lo, 'layout'); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { commit(() => (state.ui.activeTab = tab.dataset.tab), { history: false }); return; }
    const act = e.target.closest('[data-action]');
    if (act) { ACTIONS[act.dataset.action]?.(); return; }
    const st = e.target.closest('[data-slide-transition]');
    if (st) { trans.setSlideTransition(st.dataset.slideTransition); return; }
    const an = e.target.closest('[data-animation]');
    if (an) { trans.setAnimation(an.dataset.animation); return; }
    const tpl = e.target.closest('[data-template]');
    if (tpl) { templates.applyTemplate(templates.BUILTIN[tpl.dataset.template]); return; }
    const al = e.target.closest('[data-align]');
    if (al) { blocks.alignSelected(al.dataset.align); return; }
    const dist = e.target.closest('[data-distribute]');
    if (dist) { blocks.distributeSelected(dist.dataset.distribute); return; }
    const ratio = e.target.closest('[data-ratio]');
    if (ratio) { const [rw, rh] = ratio.dataset.ratio.split('x').map(Number);
      commit(() => { state.deck.size = { w: rw, h: rh }; }); return; }
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
    const sh = e.target.closest('[data-shape]');
    if (sh) { blocks.addShape(sh.dataset.shape); return; }
    const dir = e.target.closest('[data-dir]');
    if (dir) { format.toggleDir(); return; }
    const vert = e.target.closest('[data-vertical]');
    if (vert) { format.toggleVertical(); return; }
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
  bindInput('[data-bg]', v => commit(() => (currentSlide().background = v)));
  bindInput('[data-deck-fg]', v => palettes.setDeckTextColor(v));
  bindInput('[data-ink-color]', v => { drawOpts.color = v; });
  bindChange('[data-slide-trans-out]', v => trans.setSlideTransOptions({ transitionOut: v }));
  bindChange('[data-slide-trans-dir]', v => trans.setSlideTransOptions({ transitionDir: v }));
  bindChange('[data-slide-speed]', v => trans.setSlideTransOptions({ transitionSpeed: v }));
  bindChange('[data-ink-width]', v => { drawOpts.width = +v || 4; });
  addEyedroppers();
  bindChange('[data-theme]', v => commit(() => (state.deck.theme = v)));
  bindChange('[data-speed]', v => trans.setTransitionSpeed(v));
  bindChange('[data-deck-transition]', v => trans.setDeckTransition(v));
  bindChange('[data-font]', v => format.fontFamily(v));
  bindChange('[data-morphby]', v => slides.setMorphBy(v));
  bindChange('[data-line-dash]', v => blocks.setLineDash(v));
  bindChange('[data-size]', v => format.setFontSize(parseInt(v, 10) || 40));
  bindChange('[data-linespacing]', v => format.lineSpacing(v));
  bindChange('[data-textstyle]', v => { if (v) format.applyTextStyle(v); });
  bindChange('[data-slidenum-pos]', v => commit(() => (state.deck.slideNumber.position = v)));
  bindChange('[data-slidenum-fmt]', v => commit(() => (state.deck.slideNumber.format = v)));
  bindChange('[data-logo-pos]', v => commit(() => (state.deck.logo.position = v)));
  bindChange('[data-logo-size]', v => commit(() => (state.deck.logo.size = Math.max(20, parseInt(v, 10) || 120))));
  bindChange('[data-autoslide]', v => commit(() => { currentSlide().autoSlide = Math.max(0, (parseFloat(v) || 0)) * 1000; }));
  const ft = $('[data-footer-text]');
  if (ft) ft.addEventListener('input', () => commit(() => { state.deck.footer.text = ft.value; }, { history: false }));

  // Reflect the active character formatting on the toolbar as the caret moves.
  document.addEventListener('selectionchange', updateFormatState);

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
  window.addEventListener('resize', () => document.querySelectorAll('#ribbon .ribbon-page.active').forEach(markOverflow));

  // Editable document title.
  const docName = $('.doc-name');
  if (docName) {
    docName.addEventListener('input', () => { state.deck.name = docName.textContent.trim(); });
    docName.addEventListener('blur', () => {
      const name = docName.textContent.trim() || 'Presentación sin título';
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

const STATE_CMDS = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript'];
function updateFormatState() {
  const focused = document.activeElement?.classList?.contains('rich');
  for (const btn of document.querySelectorAll('[data-fmt]')) {
    if (!STATE_CMDS.includes(btn.dataset.fmt)) continue;
    let on = false;
    try { on = focused && document.queryCommandState(btn.dataset.fmt); } catch {}
    const m = selectedBlock(); if (m?.type === 'math') on = !!m[btn.dataset.fmt];
    btn.classList.toggle('on', on);
  }
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
const EYEDROP_TARGETS = ['[data-color]', '[data-highlight]', '[data-shape-fill]', '[data-shape-stroke]', '[data-bg]'];
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
// Theme colours offered as swatches in every colour picker (<datalist>).
let swatchKey = '';
function syncSwatches() {
  const cols = palettes.paletteColours(), key = cols.join();
  if (key === swatchKey) return; swatchKey = key;
  let dl = document.getElementById('theme-swatches');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'theme-swatches'; document.body.appendChild(dl); }
  dl.innerHTML = cols.map(c => `<option value="${c}"></option>`).join('');
  document.querySelectorAll('#ribbon input[type=color]').forEach(i => i.setAttribute('list', 'theme-swatches'));
}
function bindChange(sel, cb) { const el = $(sel); if (el) el.addEventListener('change', e => cb(e.target.value)); }

let lastActiveTab = null;
// More buttons to the right or left of what shows: the edge fades.
export function markOverflow(page) {
  if (!page?.classList?.contains('ribbon-page')) return;
  const more = page.scrollWidth - page.clientWidth > 2;
  page.classList.toggle('more-right', more && page.scrollLeft + page.clientWidth < page.scrollWidth - 2);
  page.classList.toggle('more-left', more && page.scrollLeft > 2);
}
export function renderRibbon() {
  ensureDeckFonts(state.deck);   // load any Google fonts the deck uses
  document.querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === state.ui.activeTab));
  // (On a narrow screen the tabs scroll: keep the active one in view.)
  { const at = document.querySelector('#ribbon .tabs .active'); if (at && at !== lastActiveTab) { lastActiveTab = at; at.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); } }
  document.querySelectorAll('.ribbon-page').forEach(p => p.classList.toggle('active', p.dataset.page === state.ui.activeTab));
  const docName = $('.doc-name');
  if (docName && document.activeElement !== docName && docName.textContent !== state.deck.name)
    docName.textContent = state.deck.name || 'Presentación sin título';
  const slide = currentSlide();
  document.querySelectorAll('[data-slide-transition]').forEach(b =>
    b.classList.toggle('on', (slide.transition || 'inherit') === b.dataset.slideTransition));
  document.querySelector('[data-action="toggle-autoanimate"]')?.classList.toggle('on', !!slide.autoAnimate);
  syncValue('[data-morphby]', slide.morphBy || 'objects');
  syncValue('[data-theme]', state.deck.theme);
  syncValue('[data-deck-fg]', palettes.deckFg());
  { const v = $('[data-action="slide-vertical"]'); if (v) { v.classList.toggle('on', !!currentSlide()?.vertical); v.disabled = state.ui.slideIndex === 0 || !!state.ui.editMaster; } }
  // Buttons that need a (suitable) selection are disabled without one, instead of doing nothing.
  { const sel = selectedBlocks(), texts = sel.filter(b => b.type === 'text'), objs = sel.filter(b => b.type !== 'connector');
    const need = { front: sel.length, back: sel.length, forward: sel.length, backward: sel.length,
      group: objs.length >= 2, ungroup: sel.some(b => b.groupId), 'connect-blocks': objs.length === 2,
      'copy-style': texts.length === 1, 'paste-style': texts.length && format.hasStyleClip(),
      'obj-anim-clear': sel.some(b => b.animation), 'anim-play': (currentSlide()?.blocks || []).some(b => b.animation) };
    for (const [a, ok] of Object.entries(need)) document.querySelectorAll(`[data-action="${a}"]`).forEach(el => { el.disabled = !ok; }); }
  { const has = !!selectedBlock(); ['clip-copy', 'clip-cut', 'obj-duplicate'].forEach(a => { const el = $(`[data-action="${a}"]`); if (el) el.disabled = !has; });
    const p = $('[data-action="clip-paste"]'); if (p) p.disabled = !clip.hasClipboard(); }
  $('[data-action="mark-final"]')?.classList.toggle('on', protect.isFinal());
  document.querySelectorAll('[data-action="undo"]').forEach(b => { b.disabled = !canUndo(); });
  document.querySelectorAll('[data-action="redo"]').forEach(b => { b.disabled = !canRedo(); });
  // Saved here after a change (unless Drive shows its own state).
  { const ss = $('#save-state'); if (ss) ss.hidden = !docVersion() || !$('#drive-status')?.hidden || !!state.ui.lock; }
  document.querySelector('[data-action="canvas-mode"]')?.classList.toggle('on', canvasOn());
  document.querySelectorAll('[data-action="canvas-view"]').forEach(b => b.classList.toggle('on', canvasViewOpen()));
  const fb = document.getElementById('final-banner'); if (fb) fb.hidden = !protect.isFinal();
  { const sigs = state.deck.signatures || [], sp = fb?.querySelector('span');
    if (sp) sp.textContent = sigs.length ? `${t('Firmada por')} ${sigs.map(s => s.name).join(', ')}: ${t('la presentación es de solo lectura.')}` : t('Marcada como final: la presentación es de solo lectura.'); }
  $('[data-action="comments"]')?.classList.toggle('on', !!state.ui.showComments);
  $('[data-action="autocorrect"]')?.classList.toggle('on', autocorrectOn());
  $('[data-action="master-edit"]')?.classList.toggle('on', !!state.ui.editMaster);
  syncValue('[data-slide-trans-out]', currentSlide()?.transitionOut || '');
  // Effect options: only those of this slide's transition (wipe, push, split).
  { const sel = $('[data-slide-trans-dir]'), dirs = trans.TRANSITION_DIRS[currentSlide()?.transition] || [];
    if (sel) { sel.disabled = !dirs.length; [...sel.options].forEach(o => (o.hidden = o.value ? !dirs.includes(o.value) : dirs.length > 0));
      syncValue('[data-slide-trans-dir]', dirs.includes(currentSlide()?.transitionDir) ? currentSlide().transitionDir : dirs[0] || ''); } }
  syncValue('[data-slide-speed]', currentSlide()?.transitionSpeed || '');
  document.querySelectorAll('[data-draw]').forEach(b => b.classList.toggle('on', (state.ui.drawTool || '') === b.dataset.draw));
  const bgHex = (currentSlide()?.background || '').match(/^#[0-9a-f]{6}$/i);
  if (bgHex) syncValue('[data-bg]', bgHex[0].toLowerCase());
  syncSwatches();
  syncValue('[data-speed]', state.deck.transitionSpeed);
  syncValue('[data-deck-transition]', state.deck.defaultTransition);
  document.body.classList.toggle('show-ruler', !!state.ui.showRuler);
  document.querySelector('[data-action="toggle-guides"]')?.classList.toggle('on', !!state.ui.showGuides);
  document.querySelector('[data-action="toggle-ruler"]')?.classList.toggle('on', !!state.ui.showRuler);
  document.querySelector('[data-action="toggle-snap"]')?.classList.toggle('on', state.ui.snap !== false);
  const sn = state.deck.slideNumber || {};
  document.querySelector('[data-action="toggle-slidenum"]')?.classList.toggle('on', !!sn.show);
  syncValue('[data-slidenum-pos]', sn.position || 'br');
  syncValue('[data-slidenum-fmt]', sn.format || 'c');
  const ft = state.deck.footer || {};
  document.querySelector('[data-action="toggle-footer"]')?.classList.toggle('on', !!ft.show);
  document.querySelector('[data-action="toggle-footerdate"]')?.classList.toggle('on', !!ft.date);
  document.querySelector('[data-action="toggle-loop"]')?.classList.toggle('on', !!state.deck.loop);
  const ftInput = $('[data-footer-text]');
  if (ftInput && document.activeElement !== ftInput) ftInput.value = ft.text || '';
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
  const asEl = $('[data-autoslide]');
  if (asEl && document.activeElement !== asEl) asEl.value = String((slide.autoSlide || 0) / 1000);

  // Reflect the selected text box in the font and paragraph controls.
  const b = selectedBlock();
  const isText = b && b.type === 'text';
  syncValue('[data-line-dash]', b ? (b.dash || b.borderDash || 'solid') : 'solid');
  syncValue('[data-font]', isText ? (b.fontFamily || '') : '');
  const isMath = b && b.type === 'math';
  syncValue('[data-size]', isText ? String(styled(b, currentSlide()).fontSize || 40) : isMath ? String(b.fontSize || MATH_SIZE) : '');
  syncValue('[data-linespacing]', isText ? String(b.lineHeight || 1) : '1');
  syncValue('[data-textstyle]', isText ? (b.textStyle || '') : '');
  document.querySelectorAll('[data-para]').forEach(x =>
    x.classList.toggle('on', (isText && (b.textAlign || 'left') === x.dataset.para) || (isMath && (b.textAlign || 'center') === x.dataset.para)));
  updateFormatState();
  renderContextual();
  renderMorphHint();
  document.querySelectorAll('#ribbon .ribbon-page.active').forEach(markOverflow);
}
function syncValue(sel, val) { const el = $(sel); if (el && el.value !== val) el.value = val; }
