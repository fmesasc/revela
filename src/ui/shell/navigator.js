// The slide navigator: thumbnails grouped by section, drag‑and‑drop reordering,
// and quick delete.

import { shortSig } from '../../core/text.js';
import { state } from '../../core/store.js';
import { goToSlide, moveSlide, deleteSlide, renameSection } from '../../features/document/slides.js';
import { blockPreview } from './preview.js';
import { sorterOn, setSorter } from './sorter.js';
import { addSlideRef } from '../../features/document/blocks.js';
import { factor } from '../canvas/interact.js';
import { t } from '../../i18n/index.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { masterBlocksFor, isEmptyPlaceholder, styled } from '../../features/document/master.js';
import { renderMasterPanel, fitMasterThumbs } from './masterview.js';

let panel;
let dragFrom = null;
const SLIDE_DRAG = 'application/x-revela-slide';

// The slides panel can be hidden (Google Slides' filmstrip); remembered here.
const HIDE = 'revela.hideNav';
export function setNavHidden(on) {
  document.body.classList.toggle('nav-hidden', on);
  document.querySelectorAll('[data-action="toggle-nav"]').forEach(b => b.classList.toggle('on', !on));
  try { localStorage.setItem(HIDE, on ? '1' : '0'); } catch {}
}
export function initPanel() {
  let hidden = false; try { hidden = localStorage.getItem(HIDE) === '1'; } catch {}
  setNavHidden(hidden);
  panel = document.getElementById('navigator');
  // Thumbnails scale to the width they really get (it depends on the panel and
  // the screen): a fixed scale cut off their right and bottom edges.
  new ResizeObserver(fitThumbs).observe(panel);
  // Another language: the thumbnails (kept between renders) take its hint too.
  addEventListener('revela:lang', () => panel.querySelectorAll('.thumb').forEach(el => { el.title = t('Arrástrala para cambiar el orden, o suéltala en la diapositiva para incrustarla como zoom'); }));
  // A thumbnail dropped on the slide: a slide zoom to it (PowerPoint: drag a slide in), where it is dropped.
  const stage = document.getElementById('stage'), ours = e => [...(e.dataTransfer?.types || [])].includes(SLIDE_DRAG);
  stage?.addEventListener('dragover', e => { if (!ours(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; stage.classList.add('el-drop'); });
  stage?.addEventListener('dragleave', () => stage.classList.remove('el-drop'));
  stage?.addEventListener('drop', e => {
    if (!ours(e)) return;
    e.preventDefault(); stage.classList.remove('el-drop');
    const id = e.dataTransfer.getData(SLIDE_DRAG), cur = state.deck.slides[state.ui.slideIndex];
    if (!id || id === cur?.id || state.ui.editMaster) return;              // (a zoom to itself goes nowhere)
    const r = stage.getBoundingClientRect(), k = factor();
    addSlideRef(id, [(e.clientX - r.left) * k, (e.clientY - r.top) * k]);
  });
}
function fitThumbs() {
  if (state.ui.editMaster) return fitMasterThumbs(panel);
  const c = panel.querySelector('.thumb-canvas'); if (!c || !c.clientWidth) return;
  const k = c.clientWidth / state.deck.size.w;
  if (panel.style.getPropertyValue('--tk') !== String(k)) panel.style.setProperty('--tk', k);
}

// Thumbnails are cached per slide and rebuilt only when that slide (or what
// every thumbnail depends on: size, master, theme colours) changes — decks with
// many image-heavy slides would otherwise take seconds on every edit.
const cache = new Map();                   // slide id → { sig, el }
const sigOf = shortSig;

export function renderPanel() {
  if (state.ui.editMaster) return renderMasterPanel(panel);   // (the master view: masters and layouts instead)
  const d = state.deck;
  const common = sigOf([d.size, d.master, d.layouts, d.canvas, deckFg(), deckBodyFont()]);
  const nodes = [], seen = new Set();
  let lastSection;
  d.slides.forEach((slide, index) => {
    if (slide.sectionId && slide.sectionId !== lastSection) {
      const sec = d.sections.find(s => s.id === slide.sectionId);
      if (sec) nodes.push(sectionHead(sec));
    }
    lastSection = slide.sectionId;
    const sig = common + sigOf(slide);
    let c = cache.get(slide.id);
    if (!c || c.sig !== sig) { c = { sig, el: thumb(slide) }; cache.set(slide.id, c); }
    c.el.dataset.index = index;
    c.el.classList.toggle('active', index === state.ui.slideIndex && !state.ui.editMaster);
    c.el.querySelector('.thumb-num').textContent = index + 1;
    seen.add(slide.id); nodes.push(c.el);
  });
  for (const id of cache.keys()) if (!seen.has(id)) cache.delete(id);
  panel.replaceChildren(...nodes);
  fitThumbs();
}

// A section title, editable in place (no browser prompt). Right‑clicking it
// opens the section menu (handled by the context‑menu module).
function sectionHead(sec) {
  const h = document.createElement('div');
  h.className = 'section-head'; h.dataset.sectionId = sec.id;
  h.textContent = sec.name;
  h.contentEditable = 'true'; h.spellcheck = false;
  h.title = 'Clic para renombrar la sección · clic derecho para más opciones';
  h.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); h.blur(); } });
  h.addEventListener('blur', () => renameSection(sec.id, h.textContent.trim()));
  if (state.ui.editingSection === sec.id) requestAnimationFrame(() => {
    h.focus();
    const r = document.createRange(); r.selectNodeContents(h);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  return h;
}

function thumb(slide) {
  const el = document.createElement('div');
  el.className = 'thumb' + (slide.hidden ? ' is-hidden' : '') + (slide.vertical ? ' is-vertical' : '');
  el.draggable = true; el.title = t('Arrástrala para cambiar el orden, o suéltala en la diapositiva para incrustarla como zoom');
  const index = () => +el.dataset.index;          // current position (the element is reused)

  const num = document.createElement('span'); num.className = 'thumb-num';
  if (slide.hidden) {
    const badge = document.createElement('span');
    badge.className = 'thumb-hidden'; badge.title = 'Diapositiva oculta en la presentación';
    badge.innerHTML = '<i class="ms">visibility_off</i>';
    el.appendChild(badge);
  }
  const canvas = document.createElement('div'); canvas.className = 'thumb-canvas';
  canvas.style.background = slide.background;
  const { w, h } = state.deck.size;
  canvas.style.setProperty('--ar', w / h);
  const inner = document.createElement('div');
  inner.className = 'thumb-inner';
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(var(--tk,${188 / w}));color:${deckFg()};font-family:${deckBodyFont() || 'inherit'}`;
  for (const b of [...masterBlocksFor(slide), ...slide.blocks.map(x => styled(x, slide))]) if (!isEmptyPlaceholder(b)) inner.appendChild(blockPreview(b, slide));
  canvas.appendChild(inner);

  const del = document.createElement('button'); del.className = 'thumb-del'; del.textContent = '×';
  del.title = 'Borrar diapositiva';
  del.addEventListener('click', e => { e.stopPropagation(); deleteSlide(index()); });

  el.append(num, canvas, del);
  const nc = (slide.comments || []).filter(c => !c.resolved).length;
  if (nc) { const c = document.createElement('span'); c.className = 'thumb-cm'; c.textContent = '💬 ' + nc; el.appendChild(c); }
  el.addEventListener('click', () => goToSlide(index()));
  el.addEventListener('dblclick', () => { if (sorterOn()) { goToSlide(index()); setSorter(false); } });   // (in the sorter: edit it)

  el.addEventListener('dragstart', e => {
    dragFrom = index(); el.classList.add('dragging');
    // (Dropped on the slide being edited, it becomes a zoom to this slide.)
    e.dataTransfer?.setData(SLIDE_DRAG, slide.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove';
  });
  el.addEventListener('dragend', () => { dragFrom = null; el.classList.remove('dragging'); clearMarks(); });
  // (Only slides being moved: files dropped here go to the window's own handler.)
  el.addEventListener('dragover', e => { if (dragFrom === null) return; e.preventDefault(); markTarget(el); });
  el.addEventListener('drop', e => {
    if (dragFrom === null) return;
    e.preventDefault();
    const to = +el.dataset.index;
    if (dragFrom !== null && dragFrom !== to) moveSlide(dragFrom, to);
  });
  return el;
}

function markTarget(el) { clearMarks(); el.classList.add('drop-target'); }
function clearMarks() { panel.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target')); }
