// The ribbon: tab switching and wiring every control to a feature.

import { state, commit, undo, redo, replaceDeck, currentSlide } from '../core/store.js';
import { emptyDeck } from '../core/model.js';
import * as slides from '../features/slides.js';
import * as blocks from '../features/blocks.js';
import * as format from '../features/format.js';
import * as trans from '../features/transitions.js';
import * as templates from '../features/templates.js';
import * as io from '../io/reveal.js';
import { importPPTX } from '../io/pptx.js';

const $ = s => document.querySelector(s);
const readFile = (accept, cb, as = 'DataURL') => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => { const f = inp.files[0]; if (!f) return;
    if (as === 'file') { cb(f); return; }
    const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f); };
  inp.click();
};

const ACTIONS = {
  'new': () => { if (confirm('¿Nueva presentación? Se perderá la actual si no la has guardado.'))
    replaceDeck(emptyDeck()); },
  'open': () => readFile('.json,application/json', txt => {
    try { replaceDeck(JSON.parse(txt)); } catch { alert('Proyecto no válido.'); } }, 'text'),
  'save': io.saveProject,
  'export': io.exportHTML,
  'present': io.present,
  'import-pptx': () => readFile('.pptx', async file => {
    try { replaceDeck(await importPPTX(file)); }
    catch (e) { alert('No se pudo importar el PowerPoint: ' + e.message); } }, 'file'),
  'undo': undo, 'redo': redo,
  'slide-add': slides.addSlide, 'slide-duplicate': slides.duplicateSlide,
  'slide-delete': () => slides.deleteSlide(), 'section-add': () => {
    const name = prompt('Nombre de la sección', 'Sección'); if (name) slides.addSection(name); },
  'insert-text': blocks.addText,
  'insert-image': () => readFile('image/*', blocks.addImage),
  'insert-model': () => readFile('.glb,.gltf', blocks.addModel),
  'insert-video': () => readFile('video/*', blocks.addVideo),
  'obj-delete': () => blocks.deleteBlock(),
  'obj-duplicate': blocks.duplicateBlock,
  'insert-link': format.link,
  'forward': blocks.bringForward, 'backward': blocks.sendBackward,
  'front': blocks.bringToFront, 'back': blocks.sendToBack,
  'obj-anim-clear': trans.clearAnimation,
  'template-save': () => { const n = prompt('Nombre de la plantilla'); if (n) templates.saveCurrentAsTemplate(n); },
  'toggle-guides': () => commit(() => (state.ui.showGuides = !state.ui.showGuides), { history: false }),
};

export function initRibbon() {
  document.getElementById('ribbon').addEventListener('click', e => {
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
    const ratio = e.target.closest('[data-ratio]');
    if (ratio) { const [rw, rh] = ratio.dataset.ratio.split('x').map(Number);
      commit(() => { state.deck.size = { w: rw, h: rh }; }); return; }
    const fd = e.target.closest('[data-fontdelta]');
    if (fd) { format.fontSize(+fd.dataset.fontdelta); return; }
    const cs = e.target.closest('[data-case]');
    if (cs) { format.changeCase(cs.dataset.case); return; }
  });

  // Formatting controls must not steal focus (and thus the selection) from the
  // editable text, so they preventDefault on mousedown.
  document.querySelectorAll('[data-fmt]').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => format.exec(btn.dataset.fmt));
  });
  document.querySelectorAll('[data-case]').forEach(btn => btn.addEventListener('mousedown', e => e.preventDefault()));
  bindInput('[data-color]', v => format.color(v), true);
  bindInput('[data-highlight]', v => format.highlight(v), true);
  bindInput('[data-bg]', v => commit(() => (currentSlide().background = v)));
  bindChange('[data-theme]', v => commit(() => (state.deck.theme = v)));
  bindChange('[data-speed]', v => trans.setTransitionSpeed(v));
  bindChange('[data-deck-transition]', v => trans.setDeckTransition(v));
}

function bindInput(sel, cb, keepFocus) {
  const el = $(sel); if (!el) return;
  if (keepFocus) el.addEventListener('mousedown', e => e.stopPropagation());
  el.addEventListener('input', e => cb(e.target.value));
}
function bindChange(sel, cb) { const el = $(sel); if (el) el.addEventListener('change', e => cb(e.target.value)); }

export function renderRibbon() {
  document.querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === state.ui.activeTab));
  document.querySelectorAll('.ribbon-page').forEach(p => p.classList.toggle('active', p.dataset.page === state.ui.activeTab));
  const slide = currentSlide();
  document.querySelectorAll('[data-slide-transition]').forEach(b =>
    b.classList.toggle('on', (slide.transition || 'inherit') === b.dataset.slideTransition));
  syncValue('[data-theme]', state.deck.theme);
  syncValue('[data-speed]', state.deck.transitionSpeed);
  syncValue('[data-deck-transition]', state.deck.defaultTransition);
}
function syncValue(sel, val) { const el = $(sel); if (el && el.value !== val) el.value = val; }
