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
import * as gdrive from '../io/gdrive.js';
import { exportPPTX } from '../io/pptx-export.js';
import * as odp from '../io/odp.js';
import { pickReuseFile } from './reuse.js';
import { openA11yCheck, openReadingOrder } from './a11y-panel.js';
import { openHandoutDialog, openImageDialog, openVideoDialog } from './print-dialog.js';
import * as recorder from './recorder.js';
import * as master from '../features/master.js';
import { openGallery, openDesignIdeas } from './gallery-dialog.js';
import { autocorrectOn, setAutocorrect } from '../features/autocorrect.js';
import { openPlugins, openMacros } from './plugins-dialog.js';
import { AI_ACTIONS, aiRewrite } from './ai-dialog.js';
import { DONATE_URL } from '../config.js';
import { openVersions } from './versions-dialog.js';
import { toggleComments } from './comments-panel.js';
import * as media from '../features/media.js';
import * as palettes from '../features/palettes.js';
import { setDrawTool, drawOpts } from './draw.js';
import * as fontsMod from '../features/fonts.js';
import { FONTS, ensureDeckFonts } from '../features/fonts.js';
import { ICON_NAMES, iconSVG, WORDART_KEYS, wordartCSS } from './shape.js';
import { playAnimations } from './canvas.js';
import * as remote from '../features/remote.js';
import * as search from '../features/search.js';
import { t } from '../i18n.js';
import { confirmDialog, promptDialog, alertDialog } from './dialog.js';

const $ = s => document.querySelector(s);
const readFile = (accept, cb, as = 'DataURL') => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => { const f = inp.files[0]; if (!f) return;
    if (as === 'file') { cb(f); return; }
    const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f); };
  inp.click();
};

let animPaint = null;       // animation being copied with the painter
function endAnimPaint() { animPaint = null; document.body.classList.remove('anim-painting'); $('[data-action="anim-paint"]')?.classList.remove('on'); }
const ACTIONS = {
  'new': () => confirmDialog(t('¿Nueva presentación? Se perderá la actual si no la has guardado.'))
    .then(ok => { if (ok) replaceDeck(emptyDeck()); }),
  'open': () => readFile('.json,application/json', txt => {
    try { replaceDeck(JSON.parse(txt)); } catch { alertDialog(t('Proyecto no válido.')); } }, 'text'),
  'save': io.saveProject,
  'gallery': () => openGallery(),
  'versions': () => openVersions(),
  'design-ideas': () => openDesignIdeas(),
  'gdrive-open': () => gdrive.openWithUI(),
  'gdrive-save': () => gdrive.saveWithUI(),
  'gdrive-html': () => gdrive.saveHtmlWithUI(),
  'gdrive-config': () => gdrive.openGdriveSetup(),
  'export': io.exportHTML,
  'export-pptx': () => exportPPTX(),
  'export-pdf': io.exportPDF,
  'export-png': () => openImageDialog(),
  'export-video': () => openVideoDialog(),
  'present': () => io.present(),
  'rehearse': () => io.present({ rehearse: true }),
  'record-show': () => recorder.recordSlideshow(),
  'record-screen': () => recorder.recordToSlide('screen'),
  'record-camera': () => recorder.recordToSlide('camera'),
  'insert-camera': () => media.addCamera('circle'),
  'trans-apply-all': () => trans.applyTransitionToAll(),
  'import-pptx': () => readFile('.pptx,.odp', async file => {
    try { replaceDeck(/\.odp$/i.test(file.name) ? await odp.importODP(file) : await importPPTX(file)); }
    catch (e) { alertDialog(t('No se pudo importar la presentación: ') + e.message); } }, 'file'),
  'export-odp': async () => {
    try {
      const blob = await odp.buildODP();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-') + '.odp'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { alertDialog(t('No se pudo exportar: ') + e.message); }
  },
  'reuse-slides': () => pickReuseFile(),
  'a11y-check': () => openA11yCheck(),
  'reading-order': () => openReadingOrder(),
  'comments': () => toggleComments(),
  ...AI_ACTIONS,
  'plugins': () => openPlugins(),
  'macros': () => openMacros(),
  'autocorrect': () => { setAutocorrect(!autocorrectOn()); renderRibbon(); },
  'master-edit': () => master.toggleMasterEdit(),
  'master-close': () => master.toggleMasterEdit(false),
  'hide-master': () => master.toggleHideMaster(),
  'export-handout': () => openHandoutDialog(),
  'undo': undo, 'redo': redo,
  'slide-add': slides.addSlide, 'slide-duplicate': slides.duplicateSlide,
  'slide-delete': () => slides.deleteSlide(),
  'section-add': () => slides.addSection(),   // creates + renames inline (no prompt)
  'insert-text': blocks.addText,
  'insert-image': () => readFile('image/*', blocks.addImage),
  'insert-table': blocks.addTable,
  'insert-table-csv': () => readFile('.csv,.tsv,.txt,text/csv', async f => blocks.addTableFromText(await f.text()), 'file'),
  'insert-table-paste': () => promptDialog(t('Pega aquí las celdas copiadas de una hoja de cálculo (o texto CSV):'), '')
    .then(v => { if (v) blocks.addTableFromText(v); }),
  'insert-code': blocks.addCode,
  'insert-chart': blocks.addChart,
  'insert-math': blocks.addMath,
  'insert-model': () => readFile('.glb,.gltf', blocks.addModel),
  'insert-video': () => readFile('video/*', blocks.addVideo),
  'insert-audio': () => readFile('audio/*', blocks.addAudio),
  'insert-embed': () => promptDialog(t('Dirección de la página web (URL):'), 'https://').then(url => {
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    blocks.addEmbed(url);
  }),
  'obj-delete': () => blocks.deleteSelected(),
  'obj-duplicate': () => blocks.duplicateSelected(),
  'group': () => blocks.groupSelected(),
  'ungroup': () => blocks.ungroupSelected(),
  'connect-blocks': () => blocks.addConnector(),
  'insert-link': format.link,
  'forward': blocks.bringForward, 'backward': blocks.sendBackward,
  'front': blocks.bringToFront, 'back': blocks.sendToBack,
  'obj-anim-clear': trans.clearAnimation,
  'anim-paint': () => {
    const a = trans.copyAnimationFrom();
    if (!a) { alertDialog(t('Selecciona primero un objeto con animación.')); return; }
    animPaint = a; document.body.classList.add('anim-painting');
    $('[data-action="anim-paint"]')?.classList.add('on');
  },
  'template-save': () => promptDialog(t('Nombre de la plantilla')).then(n => { if (n) templates.saveCurrentAsTemplate(n); }),
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
  'shortcuts': () => openShortcuts(),
  'insert-hf': () => openHeaderFooter(),
  'anim-panel': () => openAnimPanel(),
  'anim-play': () => playAnimations(),
  'insert-date': () => blocks.addDate(),
  'insert-figindex': () => blocks.addFigIndex(),
  'insert-slideref': () => blocks.addSlideRef(),
  'insert-summary': () => blocks.addSummaryZoom(),
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
  // Painter: the next object clicked on the slide receives the copied animation.
  document.getElementById('stage').addEventListener('click', e => {
    if (!animPaint) return;
    const el = e.target.closest('.block');
    if (el) trans.pasteAnimationTo([el.dataset.id], animPaint);
    endAnimPaint();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && animPaint) endAnimPaint(); });
  const don = document.getElementById('donate');
  if (don && DONATE_URL) { don.href = DONATE_URL; don.hidden = false; }
  document.getElementById('master-banner')?.addEventListener('click', e => {
    if (e.target.closest('[data-action="master-close"]')) master.toggleMasterEdit(false);
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
  bindChange('[data-slide-speed]', v => trans.setSlideTransOptions({ transitionSpeed: v }));
  bindChange('[data-ink-width]', v => { drawOpts.width = +v || 4; });
  addEyedroppers();
  bindChange('[data-theme]', v => commit(() => (state.deck.theme = v)));
  bindChange('[data-speed]', v => trans.setTransitionSpeed(v));
  bindChange('[data-deck-transition]', v => trans.setDeckTransition(v));
  bindChange('[data-font]', v => format.fontFamily(v));
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

const ANIM_EFFECTS = ['fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in',
  'spin', 'flip', 'bounce', 'grow', 'shrink', 'strike', 'fade-out', 'fade-in-then-out',
  'highlight-red', 'highlight-green', 'highlight-blue', 'path'];
const EFFECT_LABEL = e => e === 'path' ? t('Trayectoria') : e;
// Short label of an object for the trigger list.
function objLabel(b) {
  const txt = b.type === 'text' ? (new DOMParser().parseFromString(b.html || '', 'text/html').body.textContent || '').trim().slice(0, 24) : '';
  return t(ANIM_NAMES[b.type] || b.type) + (txt ? ` «${txt}»` : '');
}
const ANIM_NAMES = { camera: 'Cámara en directo', ink: 'Tinta', text: 'Texto', image: 'Imagen', shape: 'Forma', chart: 'Gráfico', table: 'Tabla',
  icon: 'Icono', math: 'Ecuación', model: '3D', video: 'Vídeo', embed: 'Web', code: 'Código', figindex: 'Índice de figuras', slideref: 'Diapositiva' };
function openAnimPanel() {
  if (document.getElementById('anim-modal')) return;
  const back = document.createElement('div');
  back.id = 'anim-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:460px;max-width:96vw;max-height:80vh;overflow:auto">
    <button class="modal-close">✕</button><h3>${t('Panel de animación')}</h3>
    <div class="fr-actions" style="justify-content:flex-start;margin-bottom:8px"><button class="fr-do an-play">▶ ${t('Reproducir')}</button></div>
    <div class="an-body"></div></div>`;
  document.body.appendChild(back);
  const body = back.querySelector('.an-body');
  back.querySelector('.an-play').addEventListener('click', () => playAnimations());
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const render = () => {
    const list = trans.animatedBlocks();
    body.innerHTML = list.length ? list.map((b, i) => `
      <div class="an-row" data-id="${b.id}">
        <div class="an-title">${i + 1}. ${t(ANIM_NAMES[b.type] || b.type)}</div>
        <div class="an-grid">
          <label>${t('Efecto')}<select data-p="effect">${ANIM_EFFECTS.map(e => `<option value="${e}"${b.animation.effect === e ? ' selected' : ''}>${EFFECT_LABEL(e)}</option>`).join('')}</select></label>
          <label>${t('Comienzo')}<select data-p="start">${[['click', 'Al hacer clic'], ['withPrev', 'Con la anterior'], ['afterPrev', 'Después de la anterior']]
            .map(([v, l]) => `<option value="${v}"${(b.animation.start || 'click') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <label>${t('Disparador')}<select data-p="trigger"><option value="">${t('Secuencia de clics')}</option>${currentSlide().blocks
            .filter(x => x.id !== b.id && x.type !== 'connector').map(x => `<option value="${x.id}"${b.animation.trigger === x.id ? ' selected' : ''}>${t('Al hacer clic en')} ${objLabel(x).replace(/</g, '&lt;')}</option>`).join('')}</select></label>
          ${b.animation.effect === 'path' ? `<label>${t('Recorrido')}<select data-p="pathShape">${[['line', 'Recto'], ['arc', 'Arco'], ['wave', 'Onda'], ['loop', 'Bucle']]
            .map(([v, l]) => `<option value="${v}"${(b.animation.pathShape || 'line') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <label>${t('Mover X')} (px)<input type="number" data-p="dx" value="${b.animation.dx || 0}" step="10"></label>
          <label>${t('Mover Y')} (px)<input type="number" data-p="dy" value="${b.animation.dy || 0}" step="10"></label>` : ''}
          <label>${t('Duración')} (ms)<input type="number" data-p="duration" value="${b.animation.duration ?? 500}" step="100" min="0"></label>
          <label>${t('Retardo')} (ms)<input type="number" data-p="delay" value="${b.animation.delay ?? 0}" step="100" min="0"></label>
        </div>
        <div class="an-actions"><button data-move="-1"${i === 0 ? ' disabled' : ''}>↑</button><button data-move="1"${i === list.length - 1 ? ' disabled' : ''}>↓</button><button data-remove title="${t('Quitar')}">✕</button></div>
      </div>`).join('')
      : `<p class="host-help">${t('Aplica una animación de entrada a un objeto primero.')}</p>`;
    body.querySelectorAll('.an-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-p="effect"]').addEventListener('change', e => { trans.setAnimPropForId(id, 'effect', e.target.value); render(); });
      row.querySelector('[data-p="pathShape"]')?.addEventListener('change', e => { trans.setAnimPropForId(id, 'pathShape', e.target.value); });
      row.querySelector('[data-p="trigger"]').addEventListener('change', e => { trans.setAnimPropForId(id, 'trigger', e.target.value || null); render(); });
      row.querySelector('[data-p="start"]').addEventListener('change', e => { trans.setAnimPropForId(id, 'start', e.target.value); render(); });
      row.querySelectorAll('input[data-p]').forEach(inp => inp.addEventListener('change', e => trans.setAnimPropForId(id, inp.dataset.p, e.target.value)));
      row.querySelectorAll('[data-move]').forEach(btn => btn.addEventListener('click', () => { trans.moveAnimForId(id, +btn.dataset.move); render(); }));
      row.querySelector('[data-remove]').addEventListener('click', () => { trans.clearAnimationForId(id); render(); });
    });
  };
  render();
}

function openHeaderFooter() {
  if (document.getElementById('hf-modal')) return;
  const f = state.deck.footer, sn = state.deck.slideNumber;
  const back = document.createElement('div');
  back.id = 'hf-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Encabezado y pie')}</h3>
    <label class="fr-chk"><input type="checkbox" class="hf-foot" ${f.show ? 'checked' : ''}> ${t('Mostrar pie de página')}</label>
    <label class="fr-l">${t('Texto del pie')}<input type="text" class="hf-text" value="${(f.text || '').replace(/"/g, '&quot;')}"></label>
    <label class="fr-chk"><input type="checkbox" class="hf-date" ${f.date ? 'checked' : ''}> ${t('Fecha')}</label>
    <label class="fr-chk"><input type="checkbox" class="hf-num" ${sn.show ? 'checked' : ''}> ${t('Número de diapositiva')}</label>
    <div class="fr-actions"><button class="fr-do hf-ok">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s); const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.hf-foot').addEventListener('change', e => commit(() => { state.deck.footer.show = e.target.checked; }));
  q('.hf-text').addEventListener('input', e => commit(() => { state.deck.footer.text = e.target.value; }, { history: false }));
  q('.hf-date').addEventListener('change', e => commit(() => { state.deck.footer.date = e.target.checked; }));
  q('.hf-num').addEventListener('change', e => commit(() => { state.deck.slideNumber.show = e.target.checked; }));
  q('.hf-ok').addEventListener('click', close);
}

const SHORTCUTS = [
  ['Ctrl/⌘ + Z', 'Deshacer'], ['Ctrl/⌘ + Y', 'Rehacer'], ['Ctrl/⌘ + D', 'Duplicar'],
  ['Ctrl/⌘ + G', 'Agrupar'], ['Ctrl/⌘ + Mayús + G', 'Desagrupar'], ['Ctrl/⌘ + F', 'Buscar y reemplazar'],
  ['Ctrl/⌘ + Mayús + V', 'Pegar sin formato'], ['Supr / Retroceso', 'Eliminar'],
  ['Flechas', 'Mover 1 px'], ['Mayús + Flechas', 'Mover 10 px'], ['Esc', 'Salir de edición'],
  ['Doble clic', 'Editar objeto'], ['Mayús al redimensionar', 'Mantener proporción'],
  ['Arrastrar en vacío', 'Selección múltiple'], ['Mayús + clic', 'Añadir a la selección'],
];
function openShortcuts() {
  if (document.getElementById('sc-modal')) return;
  const back = document.createElement('div');
  back.id = 'sc-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:340px">
    <button class="modal-close">✕</button><h3>${t('Atajos de teclado')}</h3>
    <table class="sc-table">${SHORTCUTS.map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${t(d)}</td></tr>`).join('')}</table>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
}

// ---- Group "more options" popovers (like Office's dialog launchers) --------
let openPop = null;
const POPS = {
  symbols: () => {
    const chars = ['→','←','↑','↓','↔','⇒','•','◦','▪','‣','✓','✔','✗','✘','★','☆','♦','●','■','▶',
      '€','$','£','¥','©','®','™','°','±','×','÷','≈','≠','≤','≥','∞','∑','√','π',
      '😀','😉','🎉','🚀','✅','⚠️','💡','📌','🔗','📈','🔥','👍','❤️','⭐','🧠','🛠️'];
    return `<h4>${t('Símbolos y emojis')}</h4><div class="sym-grid">`
      + chars.map(c => `<button data-sym type="button">${c}</button>`).join('') + `</div>`;
  },
  icons: () => `<h4>${t('Iconos')}</h4><div class="sym-grid icons">`
    + ICON_NAMES.map(n => `<button data-icon="${n}" type="button" title="${n}">${iconSVG({ icon: n, color: '#333' })}</button>`).join('') + `</div>`,
  wordart: () => `<h4>Text Art</h4><div class="wa-grid">`
    + WORDART_KEYS.map(k => `<button data-wa="${k}" type="button" style="${wordartCSS(k)}">Aa</button>`).join('') + `</div>`,
  layout: () => `<h4>${t('Diseño')}</h4><div class="layout-grid">`
    + Object.entries(templates.BUILTIN).map(([k, v]) => `<button data-layout="${k}" type="button">${t(v.name)}</button>`).join('') + `</div>`,
  palettes: () => `<h4>${t('Colores del tema')}</h4><div class="pal-grid">`
    + Object.entries(palettes.PALETTES).map(([k, p]) => `<button data-palette="${k}" type="button" class="${(state.deck.palette || 'revela') === k ? 'on' : ''}">`
      + `<span class="pal-sw" style="background:${p.bg};color:${p.fg}">Aa${p.accents.map(c => `<i style="background:${c}"></i>`).join('')}</span>`
      + `<span>${t(p.name)}</span></button>`).join('') + `</div>`,
  fontpairs: () => `<h4>${t('Fuentes del tema')}</h4><div class="fp-list">`
    + Object.entries(palettes.FONT_PAIRS).map(([k, p]) => { const st = palettes.pairStacks(k);
      return `<button data-fontpair="${k}" type="button" class="${state.deck.fontPair === k ? 'on' : ''}">`
        + `<b style="font-family:${st.heading.replace(/"/g, "'")}">${p.heading}</b><span style="font-family:${st.body.replace(/"/g, "'")}">${p.body}</span>`
        + `<small>${t(p.name)}</small></button>`; }).join('') + `</div>`,
  paragraph: () => {
    const b = selectedBlock(); const tb = b && b.type === 'text' ? b : {};
    return `<h4>${t('Párrafo')}</h4>
      <label>${t('Interlineado')}
        <input type="number" step="0.05" min="0.5" data-pop="linespacing" value="${tb.lineHeight || 1}"></label>
      <label>${t('Espaciado entre letras (px)')}
        <input type="number" step="0.5" data-pop="letterspacing" value="${tb.letterSpacing || 0}"></label>
      <label>${t('Sangría izquierda (px)')}
        <input type="number" step="4" min="0" data-pop="indent" value="${tb.indent || 0}"></label>
      <label>${t('Viñeta')} <select data-pop="bullet">
        <option value="disc">• Disco</option><option value="circle">◦ Círculo</option>
        <option value="square">▪ Cuadrado</option><option value="none">— Ninguna</option></select></label>
      <label>${t('Columnas')} <select data-pop="columns">
        <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
      <label>${t('Lista numerada')} <select data-pop="numstyle">
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
  const csel = pop.querySelector('[data-pop="columns"]');
  if (csel) { csel.value = String(selectedBlock()?.columns || 1); csel.addEventListener('change', e => format.setColumns(e.target.value)); }
  const nsel = pop.querySelector('[data-pop="numstyle"]');
  if (nsel) { nsel.value = selectedBlock()?.numStyle || 'decimal'; nsel.addEventListener('change', e => format.setNumStyle(e.target.value)); }
  pop.querySelectorAll('[data-sym]').forEach(x => {
    x.addEventListener('mousedown', e => e.preventDefault());   // keep the caret in the text
    x.addEventListener('click', () => format.insertSymbol(x.textContent));
  });
  pop.querySelectorAll('[data-icon]').forEach(x =>
    x.addEventListener('click', () => { blocks.addIcon(x.dataset.icon); closePopover(); }));
  pop.querySelectorAll('[data-wa]').forEach(x =>
    x.addEventListener('click', () => { blocks.addWordArt(x.dataset.wa); closePopover(); }));
  pop.querySelectorAll('[data-palette]').forEach(x =>
    x.addEventListener('click', () => { palettes.applyPalette(x.dataset.palette); closePopover(); }));
  pop.querySelectorAll('[data-fontpair]').forEach(x => {
    const st = palettes.pairStacks(x.dataset.fontpair); fontsMod.ensureFont(st.heading); fontsMod.ensureFont(st.body);
    x.addEventListener('click', () => { palettes.applyFontPair(x.dataset.fontpair); closePopover(); });
  });
  pop.querySelectorAll('[data-layout]').forEach(x =>
    x.addEventListener('click', () => { templates.applyTemplate(templates.BUILTIN[x.dataset.layout]); closePopover(); }));
  openPop = pop;
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
  syncValue('[data-deck-fg]', palettes.deckFg());
  $('[data-action="comments"]')?.classList.toggle('on', !!state.ui.showComments);
  $('[data-action="autocorrect"]')?.classList.toggle('on', autocorrectOn());
  $('[data-action="master-edit"]')?.classList.toggle('on', !!state.ui.editMaster);
  syncValue('[data-slide-trans-out]', currentSlide()?.transitionOut || '');
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
  syncValue('[data-font]', isText ? (b.fontFamily || '') : '');
  syncValue('[data-size]', isText ? String(b.fontSize || 40) : '');
  syncValue('[data-linespacing]', isText ? String(b.lineHeight || 1) : '1');
  syncValue('[data-textstyle]', isText ? (b.textStyle || '') : '');
  document.querySelectorAll('[data-para]').forEach(x =>
    x.classList.toggle('on', isText && (b.textAlign || 'left') === x.dataset.para));
}
function syncValue(sel, val) { const el = $(sel); if (el && el.value !== val) el.value = val; }
