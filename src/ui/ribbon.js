// The ribbon: tab switching and wiring every control to a feature.

import { state, commit, undo, redo, replaceDeck, currentSlide, selectedBlock } from '../core/store.js';
import { emptyDeck } from '../core/model.js';
import * as slides from '../features/slides.js';
import * as blocks from '../features/blocks.js';
import * as format from '../features/format.js';
import * as trans from '../features/transitions.js';
import * as templates from '../features/templates.js';
import * as io from '../io/reveal.js';
import { importPPTX } from '../io/pptx.js';
import { FONTS, ensureDeckFonts } from '../features/fonts.js';
import { ICON_NAMES, iconSVG } from './shape.js';
import * as remote from '../features/remote.js';
import * as search from '../features/search.js';

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
  'export-pdf': io.exportPDF,
  'export-png': io.exportPNG,
  'present': io.present,
  'import-pptx': () => readFile('.pptx', async file => {
    try { replaceDeck(await importPPTX(file)); }
    catch (e) { alert('No se pudo importar el PowerPoint: ' + e.message); } }, 'file'),
  'undo': undo, 'redo': redo,
  'slide-add': slides.addSlide, 'slide-duplicate': slides.duplicateSlide,
  'slide-delete': () => slides.deleteSlide(),
  'section-add': () => slides.addSection(),   // creates + renames inline (no prompt)
  'insert-text': blocks.addText,
  'insert-image': () => readFile('image/*', blocks.addImage),
  'insert-table': blocks.addTable,
  'insert-code': blocks.addCode,
  'insert-chart': blocks.addChart,
  'insert-model': () => readFile('.glb,.gltf', blocks.addModel),
  'insert-video': () => readFile('video/*', blocks.addVideo),
  'insert-audio': () => readFile('audio/*', blocks.addAudio),
  'insert-embed': () => {
    let url = prompt('Dirección de la página web (URL):', 'https://');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    blocks.addEmbed(url);
  },
  'obj-delete': () => blocks.deleteSelected(),
  'obj-duplicate': () => blocks.duplicateSelected(),
  'group': () => blocks.groupSelected(),
  'ungroup': () => blocks.ungroupSelected(),
  'connect-blocks': () => blocks.addConnector(),
  'insert-link': format.link,
  'forward': blocks.bringForward, 'backward': blocks.sendBackward,
  'front': blocks.bringToFront, 'back': blocks.sendToBack,
  'obj-anim-clear': trans.clearAnimation,
  'template-save': () => { const n = prompt('Nombre de la plantilla'); if (n) templates.saveCurrentAsTemplate(n); },
  'toggle-guides': () => commit(() => (state.ui.showGuides = !state.ui.showGuides), { history: false }),
  'toggle-ruler': () => commit(() => (state.ui.showRuler = !state.ui.showRuler), { history: false }),
  'toggle-snap': () => commit(() => (state.ui.snap = state.ui.snap === false), { history: false }),
  'toggle-slidenum': () => commit(() => (state.deck.slideNumber.show = !state.deck.slideNumber.show)),
  'toggle-footer': () => commit(() => (state.deck.footer.show = !state.deck.footer.show)),
  'toggle-footerdate': () => commit(() => (state.deck.footer.date = !state.deck.footer.date)),
  'toggle-loop': () => commit(() => (state.deck.loop = !state.deck.loop)),
  'toggle-autoanimate': () => slides.toggleAutoAnimate(),
  'dup-animate': () => slides.duplicateForAnimate(),
  'toggle-notes': () => commit(() => (state.ui.showNotes = !state.ui.showNotes), { history: false }),
  'connect-mobile': () => remote.openHostPanel(),
  'find-replace': () => search.openFindPanel(),
  'copy-style': () => format.copyStyle(),
  'paste-style': () => format.pasteStyle(),
  'bg-gradient': () => {
    const a = $('[data-grad1]')?.value || '#3f6497', b = $('[data-grad2]')?.value || '#101317';
    commit(() => { currentSlide().background = `linear-gradient(135deg, ${a}, ${b})`; });
  },
  'bg-image': () => readFile('image/*', src => commit(() => { currentSlide().background = `#000 url(${src}) center/cover no-repeat`; })),
  'bg-all': () => { const bg = currentSlide().background; commit(() => { for (const s of state.deck.slides) s.background = bg; }); },
  'set-logo': () => readFile('image/*', src => commit(() => { state.deck.logo.src = src; })),
  'clear-logo': () => commit(() => { state.deck.logo.src = ''; }),
  'zoom-in': () => setZoom((state.ui.zoom || 1) + 0.1),
  'zoom-out': () => setZoom((state.ui.zoom || 1) - 0.1),
  'zoom-reset': () => setZoom(1),
  'zoom-fit': () => fitZoom(),
};

function applyZoom() {
  const z = state.ui.zoom || 1;
  const g = document.getElementById('stage-grid');
  const sizer = document.getElementById('stage-sizer');
  if (g) g.style.transform = `scale(${z})`;
  if (sizer) {
    // Footprint from the deck size (deterministic; offsetWidth can be 0 mid‑render).
    const rw = state.ui.showRuler ? 20 : 0;
    sizer.style.width = ((state.deck.size.w + rw) * z) + 'px';
    sizer.style.height = ((state.deck.size.h + rw) * z) + 'px';
  }
  const lbl = document.getElementById('zoom-label');
  if (lbl) lbl.textContent = Math.round(z * 100) + '%';
}
function setZoom(z) {
  state.ui.zoom = Math.max(0.2, Math.min(3, Math.round(z * 100) / 100));
  applyZoom();
}
function fitZoom() {
  const wrap = document.getElementById('canvas-wrap');
  const { w, h } = state.deck.size;
  const z = Math.min((wrap.clientWidth - 56) / w, (wrap.clientHeight - 56) / h);
  setZoom(z);
}

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
  populateFonts();
  applyZoom();
  // On phones/tablets, start zoomed to fit and refit on rotation/resize.
  if (window.innerWidth < 860) requestAnimationFrame(fitZoom);
  let rt; window.addEventListener('resize', () => {
    clearTimeout(rt); rt = setTimeout(() => { if (window.innerWidth < 860) fitZoom(); }, 200);
  });
  document.getElementById('ribbon').addEventListener('click', e => {
    const more = e.target.closest('[data-more]');
    if (more) { e.stopPropagation(); togglePopover(more, more.dataset.more); return; }
    const sym = e.target.closest('[data-symbols]');
    if (sym) { e.stopPropagation(); togglePopover(sym, 'symbols'); return; }
    const ics = e.target.closest('[data-icons]');
    if (ics) { e.stopPropagation(); togglePopover(ics, 'icons'); return; }
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
  document.querySelectorAll('[data-case],[data-para],[data-list],[data-dir],[data-vertical]')
    .forEach(btn => btn.addEventListener('mousedown', e => e.preventDefault()));
  bindInput('[data-color]', v => format.color(v), true);
  bindInput('[data-highlight]', v => format.highlight(v), true);
  bindInput('[data-shape-fill]', v => blocks.setShapeStyle('fill', v), true);
  bindInput('[data-shape-stroke]', v => blocks.setShapeStyle('stroke', v), true);
  bindInput('[data-bg]', v => commit(() => (currentSlide().background = v)));
  bindChange('[data-theme]', v => commit(() => (state.deck.theme = v)));
  bindChange('[data-speed]', v => trans.setTransitionSpeed(v));
  bindChange('[data-deck-transition]', v => trans.setDeckTransition(v));
  bindChange('[data-font]', v => format.fontFamily(v));
  bindChange('[data-size]', v => format.setFontSize(parseInt(v, 10) || 40));
  bindChange('[data-linespacing]', v => format.lineSpacing(v));
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

  // Let the mouse wheel scroll the ribbon sideways when the groups overflow.
  document.querySelectorAll('.ribbon-page').forEach(page => {
    page.addEventListener('wheel', e => {
      if (page.scrollWidth <= page.clientWidth) return;      // nothing to scroll
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // trackpad already horizontal
      e.preventDefault();
      page.scrollLeft += e.deltaY;
    }, { passive: false });
  });

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
    btn.classList.toggle('on', on);
  }
}

// ---- Group "more options" popovers (like Office's dialog launchers) --------
let openPop = null;
const POPS = {
  symbols: () => {
    const chars = ['→','←','↑','↓','↔','⇒','•','◦','▪','‣','✓','✔','✗','✘','★','☆','♦','●','■','▶',
      '€','$','£','¥','©','®','™','°','±','×','÷','≈','≠','≤','≥','∞','∑','√','π',
      '😀','😉','🎉','🚀','✅','⚠️','💡','📌','🔗','📈','🔥','👍','❤️','⭐','🧠','🛠️'];
    return `<h4>Símbolos y emojis</h4><div class="sym-grid">`
      + chars.map(c => `<button data-sym type="button">${c}</button>`).join('') + `</div>`;
  },
  icons: () => `<h4>Iconos</h4><div class="sym-grid icons">`
    + ICON_NAMES.map(n => `<button data-icon="${n}" type="button" title="${n}">${iconSVG({ icon: n, color: '#333' })}</button>`).join('') + `</div>`,
  paragraph: () => {
    const b = selectedBlock(); const t = b && b.type === 'text' ? b : {};
    return `<h4>Párrafo</h4>
      <label>Interlineado
        <input type="number" step="0.05" min="0.5" data-pop="linespacing" value="${t.lineHeight || 1}"></label>
      <label>Espaciado entre letras (px)
        <input type="number" step="0.5" data-pop="letterspacing" value="${t.letterSpacing || 0}"></label>
      <label>Sangría izquierda (px)
        <input type="number" step="4" min="0" data-pop="indent" value="${t.indent || 0}"></label>
      <label>Viñeta <select data-pop="bullet">
        <option value="disc">• Disco</option><option value="circle">◦ Círculo</option>
        <option value="square">▪ Cuadrado</option><option value="none">— Ninguna</option></select></label>
      <label>Lista numerada <select data-pop="numstyle">
        <option value="decimal">1, 2, 3</option><option value="lower-alpha">a, b, c</option>
        <option value="upper-alpha">A, B, C</option><option value="lower-roman">i, ii, iii</option></select></label>`;
  },
};
function closePopover() { if (openPop) { openPop.remove(); openPop = null; } }
function togglePopover(launcher, type) {
  const same = openPop && openPop.dataset.type === type;
  closePopover();
  if (same || !POPS[type]) return;
  const pop = document.createElement('div');
  pop.className = 'popover'; pop.dataset.type = type;
  pop.innerHTML = POPS[type]();
  document.body.appendChild(pop);
  const r = launcher.getBoundingClientRect();
  pop.style.left = Math.min(r.left, innerWidth - pop.offsetWidth - 10) + 'px';
  pop.style.top = (r.bottom + 4) + 'px';
  pop.addEventListener('click', e => e.stopPropagation());
  pop.querySelector('[data-pop="linespacing"]')?.addEventListener('input', e => format.lineSpacing(e.target.value));
  pop.querySelector('[data-pop="letterspacing"]')?.addEventListener('input', e => format.letterSpacing(e.target.value));
  pop.querySelector('[data-pop="indent"]')?.addEventListener('input', e => format.indent(e.target.value));
  const bsel = pop.querySelector('[data-pop="bullet"]');
  if (bsel) { bsel.value = selectedBlock()?.bullet || 'disc'; bsel.addEventListener('change', e => format.setBullet(e.target.value)); }
  const nsel = pop.querySelector('[data-pop="numstyle"]');
  if (nsel) { nsel.value = selectedBlock()?.numStyle || 'decimal'; nsel.addEventListener('change', e => format.setNumStyle(e.target.value)); }
  pop.querySelectorAll('[data-sym]').forEach(x => {
    x.addEventListener('mousedown', e => e.preventDefault());   // keep the caret in the text
    x.addEventListener('click', () => format.insertSymbol(x.textContent));
  });
  pop.querySelectorAll('[data-icon]').forEach(x =>
    x.addEventListener('click', () => { blocks.addIcon(x.dataset.icon); closePopover(); }));
  openPop = pop;
}
document.addEventListener('click', () => closePopover());

function bindInput(sel, cb, keepFocus) {
  const el = $(sel); if (!el) return;
  if (keepFocus) el.addEventListener('mousedown', e => e.stopPropagation());
  el.addEventListener('input', e => cb(e.target.value));
}
function bindChange(sel, cb) { const el = $(sel); if (el) el.addEventListener('change', e => cb(e.target.value)); }

export function renderRibbon() {
  ensureDeckFonts(state.deck);   // load any Google fonts the deck uses
  document.querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === state.ui.activeTab));
  document.querySelectorAll('.ribbon-page').forEach(p => p.classList.toggle('active', p.dataset.page === state.ui.activeTab));
  const docName = $('.doc-name');
  if (docName && document.activeElement !== docName && docName.textContent !== state.deck.name)
    docName.textContent = state.deck.name || 'Presentación sin título';
  const slide = currentSlide();
  document.querySelectorAll('[data-slide-transition]').forEach(b =>
    b.classList.toggle('on', (slide.transition || 'inherit') === b.dataset.slideTransition));
  document.querySelector('[data-action="toggle-autoanimate"]')?.classList.toggle('on', !!slide.autoAnimate);
  syncValue('[data-theme]', state.deck.theme);
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
  syncValue('[data-font]', isText ? (b.fontFamily || '') : '');
  syncValue('[data-size]', isText ? String(b.fontSize || 40) : '');
  syncValue('[data-linespacing]', isText ? String(b.lineHeight || 1) : '1');
  document.querySelectorAll('[data-para]').forEach(x =>
    x.classList.toggle('on', isText && (b.textAlign || 'left') === x.dataset.para));
}
function syncValue(sel, val) { const el = $(sel); if (el && el.value !== val) el.value = val; }
