// The slide navigator: thumbnails grouped by section, drag‑and‑drop reordering,
// quick delete, and selecting several slides (Ctrl/Cmd+click, Shift+click; on a
// touch screen, a long press starts picking them with checkboxes).

import { withBlobs } from '../../io/formats/blobmedia.js';
import { shortSig, esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import { moveSlide, moveSlides, deleteSlide, renameSection, selectSlide, collapseSlideSel } from '../../features/document/slides.js';
import { blockPreview } from './preview.js';
import { sorterOn, setSorter } from './sorter.js';
import { addSlideRef } from '../../features/document/blocks.js';
import { factor } from '../canvas/interact.js';
import { t } from '../../i18n/index.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { masterBlocksFor, isEmptyPlaceholder, styled } from '../../features/document/master.js';
import { renderMasterPanel, fitMasterThumbs } from './masterview.js';

let panel;
let dragFrom = null, dragIds = null;
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
  // Keys act on slides after a click here, on objects after a click on the slide;
  // clicking the slide also leaves just the current slide selected.
  panel.addEventListener('pointerdown', () => { state.ui.navFocus = true; }, true);
  document.getElementById('stage')?.addEventListener('pointerdown', () => {
    state.ui.navFocus = false;
    if (state.ui.slideSel?.length || state.ui.slidePick) collapseSlideSel();
  }, true);
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

// The panel's children made `nodes`; untouched when they already are (a slide change, most edits). (Taking every
// thumbnail out and back in each time made the browser lay out 300 slides of 40 objects again, ~200 ms. All at once
// otherwise: moving them one by one could blur a field being edited, whose handler draws the panel meanwhile.)
function place(parent, nodes) {
  const kids = parent.children;
  if (kids.length === nodes.length && nodes.every((n, i) => kids[i] === n)) return;
  parent.replaceChildren(...nodes);
}

export function renderPanel() {
  if (state.ui.editMaster) return renderMasterPanel(panel);   // (the master view: masters and layouts instead)
  const d = state.deck;
  const common = sigOf([d.size, d.master, d.layouts, d.canvas, deckFg(), deckBodyFont()]);
  const nodes = [], seen = new Set(), sel = new Set(state.ui.slideSel?.length > 1 ? state.ui.slideSel : []);
  panel.classList.toggle('multi', sel.size > 1);
  document.body.classList.toggle('slide-pick', !!state.ui.slidePick);
  if (state.ui.slidePick) nodes.push(pickBar(Math.max(1, sel.size)));
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
    // (Only what differs is touched: rewriting the same number or attribute in every thumbnail made the browser
    // lay them all out again.)
    if (c.el.dataset.index !== String(index)) { c.el.dataset.index = index; c.el.querySelector('.thumb-num').textContent = index + 1; }
    c.el.classList.toggle('active', index === state.ui.slideIndex && !state.ui.editMaster);
    c.el.classList.toggle('selected', sel.has(slide.id) || (!!state.ui.slidePick && index === state.ui.slideIndex));
    const aria = String(sel.has(slide.id) || index === state.ui.slideIndex); if (c.el.getAttribute('aria-selected') !== aria) c.el.setAttribute('aria-selected', aria);
    seen.add(slide.id); nodes.push(c.el);
  });
  for (const id of cache.keys()) if (!seen.has(id)) cache.delete(id);
  place(panel, nodes);
  fitThumbs();
}

// A section title, editable in place (no browser prompt). Right‑clicking it
// opens the section menu (handled by the context‑menu module).
// Picking slides on a touch screen: how many, their menu, and «Listo».
function pickBar(n) {
  const bar = document.createElement('div'); bar.className = 'nav-pick';
  bar.innerHTML = `<span>${n === 1 ? t('1 diapositiva seleccionada') : t('{n} diapositivas seleccionadas').replace('{n}', n)}</span>
    <button type="button" class="np-menu" title="${t('Más opciones')}"><i class="ms">more_vert</i></button><button type="button" class="np-done">${t('Listo')}</button>`;
  bar.querySelector('.np-done').addEventListener('click', () => collapseSlideSel());
  bar.querySelector('.np-menu').addEventListener('click', e => {
    e.stopPropagation();
    const th = panel.querySelector('.thumb.active') || panel.querySelector('.thumb'), r = e.currentTarget.getBoundingClientRect();
    th?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left, clientY: r.bottom }));
  });
  return bar;
}

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
  canvas.style.background = withBlobs(slide.background);
  const { w, h } = state.deck.size;
  canvas.style.setProperty('--ar', w / h);
  const inner = document.createElement('div');
  inner.className = 'thumb-inner';
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(var(--tk,${188 / w}));color:${deckFg()};font-family:${deckBodyFont() || 'inherit'}`;
  for (const b of [...masterBlocksFor(slide), ...slide.blocks.map(x => styled(x, slide))]) if (!isEmptyPlaceholder(b)) inner.appendChild(blockPreview(b, slide));
  canvas.appendChild(inner);

  // (Shown while several are selected or being picked: a tap adds or removes it.)
  const check = document.createElement('span'); check.className = 'thumb-check'; check.innerHTML = '<i class="ms">check</i>';
  check.addEventListener('click', e => { e.stopPropagation(); selectSlide(index(), { toggle: true }); });
  const del = document.createElement('button'); del.className = 'thumb-del'; del.textContent = '×';
  del.title = 'Borrar diapositiva';
  del.addEventListener('click', e => { e.stopPropagation(); deleteSlide(index()); });

  el.append(num, canvas, check, del);
  // Its status and who it's assigned to (Pitch's workflow): a coloured mark and their initials.
  const STATUS = { doing: ['En curso', '#d98b00'], review: ['Para revisar', '#2f6fd6'], done: ['Terminada', '#2f9e44'] };
  if (STATUS[slide.status] || slide.owner) {
    const w = document.createElement('span'); w.className = 'thumb-work';
    const st = STATUS[slide.status], initials = String(slide.owner || '').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('');
    w.title = [st && t(st[0]), slide.owner && t('Asignada a {who}').replace('{who}', slide.owner)].filter(Boolean).join(' · ');
    w.innerHTML = (st ? `<i style="background:${st[1]}"></i>` : '') + (initials ? `<b>${esc(initials)}</b>` : '');
    el.appendChild(w);
  }
  const nc = (slide.comments || []).filter(c => !c.resolved).length;
  if (nc) { const c = document.createElement('span'); c.className = 'thumb-cm'; c.textContent = '💬 ' + nc; el.appendChild(c); }
  // Click: this one; Ctrl/Cmd+click: add or remove it; Shift+click: the range (PowerPoint).
  el.addEventListener('mousedown', e => { if (e.shiftKey) e.preventDefault(); });   // (no text selection)
  el.addEventListener('click', e => {
    if (state.ui.slidePick) selectSlide(index(), { toggle: true });
    else selectSlide(index(), { toggle: e.ctrlKey || e.metaKey, range: e.shiftKey });
  });
  el.addEventListener('dblclick', () => { if (sorterOn()) { selectSlide(index()); setSorter(false); } });   // (in the sorter: edit it)

  el.addEventListener('dragstart', e => {
    dragFrom = index(); el.classList.add('dragging');
    // A selected slide drags the whole selection with it.
    dragIds = el.classList.contains('selected') && state.ui.slideSel?.length > 1 ? state.deck.slides.filter(s => state.ui.slideSel.includes(s.id)).map(s => s.id) : null;
    if (dragIds) panel.querySelectorAll('.thumb.selected').forEach(n => n.classList.add('dragging'));
    // (Dropped on the slide being edited, it becomes a zoom to this slide.)
    e.dataTransfer?.setData(SLIDE_DRAG, slide.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove';
  });
  el.addEventListener('dragend', () => { dragFrom = null; dragIds = null; panel.querySelectorAll('.dragging').forEach(n => n.classList.remove('dragging')); clearMarks(); });
  // (Only slides being moved: files dropped here go to the window's own handler.)
  el.addEventListener('dragover', e => { if (dragFrom === null) return; e.preventDefault(); markTarget(el); });
  el.addEventListener('drop', e => {
    if (dragFrom === null) return;
    e.preventDefault();
    const to = +el.dataset.index;
    if (dragIds) moveSlides(dragIds, to);
    else if (dragFrom !== null && dragFrom !== to) moveSlide(dragFrom, to);
  });
  return el;
}

function markTarget(el) { clearMarks(); el.classList.add('drop-target'); }
function clearMarks() { panel.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target')); }
