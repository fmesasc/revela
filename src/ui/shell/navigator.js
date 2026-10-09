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
import { masterBlocksFor, isEmptyPlaceholder, styled, allMasters, masterStyles } from '../../features/document/master.js';
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
// Rebuilt after the frame is drawn, not while redrawing: an edit shows on the slide first and in its thumbnail a
// moment later; and when many change at once (a theme, a big deck opened) those in sight go first and the rest a few
// at a time while the browser is idle (IntersectionObserver, requestIdleCallback), instead of hundreds in one long
// task. Meanwhile a thumbnail shows what it showed (a new one, its background). flushThumbs() builds them all now.
const cache = new Map();                   // slide id → { sig: what it shows, want: what it should, el }
const queue = new Map();                   // slide id → its slide, to be (re)built
const heads = new Map();                   // section id → { name, el }
const sigOf = shortSig;
let sight = null, idleId = null, fitW = 0, lastCommon = '', slidesShown = false;
const onIdle = fn => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 300 }) : setTimeout(() => fn({ timeRemaining: () => 8, didTimeout: true }), 30));
function want(slide, c) {
  queue.set(slide.id, slide);
  // (One rebuilt a moment ago — dragging an object changes its slide at every frame —: when idle, not every frame.)
  if (!sight && window.IntersectionObserver) sight = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !(performance.now() - (cache.get(e.target.dataset.sid)?.at || -1e9) < 250)) build(e.target.dataset.sid); }), { root: panel, rootMargin: '50% 0px' });
  if (sight && !c.watched) { c.watched = true; c.el.dataset.sid = slide.id; sight.observe(c.el); }   // (its first answer: after this frame is drawn)
  if (idleId == null) idleId = onIdle(idle);
}
function idle(deadline) {
  idleId = null;
  // (At least one each time: a busy page — a video, an animation — still gets them all, slowly.)
  for (let n = 0; queue.size && (n === 0 || deadline.timeRemaining() > 4 || deadline.didTimeout && n < 4); n++) build(queue.keys().next().value);
  if (queue.size) idleId = onIdle(idle);
}
// The thumbnail of that slide as it is now, in place of the one shown.
function build(id) {
  const slide = queue.get(id), c = cache.get(id); queue.delete(id);
  if (!slide || !c) return;
  const old = c.el, el = thumb(slide);
  if (c.watched) { sight?.unobserve(old); c.watched = false; }
  el.dataset.index = old.dataset.index; el.querySelector('.thumb-num').textContent = old.querySelector('.thumb-num').textContent;
  for (const k of ['active', 'selected', 'dragging']) el.classList.toggle(k, old.classList.contains(k));
  if (old.hasAttribute('aria-selected')) el.setAttribute('aria-selected', old.getAttribute('aria-selected'));
  c.el = el; c.sig = c.want; c.at = performance.now();
  if (old.parentNode) old.replaceWith(el);
}
export function flushThumbs() { while (queue.size) build(queue.keys().next().value); }

// The panel's children made `nodes`; untouched when they already are (a slide change, most edits). (Taking every
// thumbnail out and back in each time made the browser lay out 300 slides of 40 objects again, ~200 ms. All at once
// otherwise: moving them one by one could blur a field being edited, whose handler draws the panel meanwhile.)
function place(parent, nodes) {
  const kids = parent.children;
  if (kids.length === nodes.length && nodes.every((n, i) => kids[i] === n)) return;
  parent.replaceChildren(...nodes);
}

// change: store.lastChange() (only the screen changed: no slide's thumbnail can have, just which are current or
// selected); none: everything.
export function renderPanel(change) {
  if (state.ui.editMaster) { slidesShown = false; return renderMasterPanel(panel); }   // (the master view: masters and layouts instead)
  const d = state.deck, doc = !change || change.doc || !slidesShown; slidesShown = true;
  // (The masters' text styles completed and linked to the theme before their fingerprint is taken: drawing the
  // thumbnails did it otherwise, changing the fingerprint after it, and every thumbnail was built twice.)
  if (doc) for (const m of allMasters(d)) if (m.styles) masterStyles(d, m);
  const common = doc ? (lastCommon = sigOf([d.size, d.master, d.layouts, d.canvas, deckFg(), deckBodyFont()])) : lastCommon;
  const nodes = [], seen = new Set(), sel = new Set(state.ui.slideSel?.length > 1 ? state.ui.slideSel : []);
  panel.classList.toggle('multi', sel.size > 1);
  document.body.classList.toggle('slide-pick', !!state.ui.slidePick);
  if (state.ui.slidePick) nodes.push(pickBar(Math.max(1, sel.size)));
  let lastSection;
  d.slides.forEach((slide, index) => {
    if (slide.sectionId && slide.sectionId !== lastSection) {
      const sec = d.sections.find(s => s.id === slide.sectionId);
      // (Kept between redraws like the thumbnails: a new one each time made place() put the whole panel back.)
      let hd = heads.get(sec?.id);
      if (sec && (!hd || hd.name !== sec.name || state.ui.editingSection === sec.id)) heads.set(sec.id, hd = { name: sec.name, el: sectionHead(sec) });
      if (sec) nodes.push(hd.el);
    }
    lastSection = slide.sectionId;
    let c = cache.get(slide.id);
    if (!c) { c = { sig: null, want: null, el: thumb(slide, false) }; cache.set(slide.id, c); }
    if (doc || c.want == null) {
      c.want = common + sigOf(slide);
      if (c.want !== c.sig) want(slide, c);
      else if (queue.delete(slide.id) && c.watched) { sight.unobserve(c.el); c.watched = false; }   // (back as it shows: undone)
    }
    // (Only what differs is touched: rewriting the same number or attribute in every thumbnail made the browser
    // lay them all out again.)
    if (c.el.dataset.index !== String(index)) { c.el.dataset.index = index; c.el.querySelector('.thumb-num').textContent = index + 1; }
    c.el.classList.toggle('active', index === state.ui.slideIndex && !state.ui.editMaster);
    c.el.classList.toggle('selected', sel.has(slide.id) || (!!state.ui.slidePick && index === state.ui.slideIndex));
    const aria = String(sel.has(slide.id) || index === state.ui.slideIndex); if (c.el.getAttribute('aria-selected') !== aria) c.el.setAttribute('aria-selected', aria);
    seen.add(slide.id); nodes.push(c.el);
  });
  for (const [id, c] of cache) if (!seen.has(id)) { cache.delete(id); queue.delete(id); if (c.watched) sight?.unobserve(c.el); }
  if (doc) for (const id of heads.keys()) if (!d.sections?.some(s => s.id === id)) heads.delete(id);
  place(panel, nodes);
  // (Their scale: measured when they first appear or the slide's width changes, just before the frame is drawn;
  // then the ResizeObserver. Measuring here at every redraw made the browser lay the panel out again each time.)
  if (fitW !== d.size.w || !panel.style.getPropertyValue('--tk')) { fitW = d.size.w; requestAnimationFrame(fitThumbs); }
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

// full: with its objects drawn (without: the frame and background, until build() draws it).
function thumb(slide, full = true) {
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
  if (full) for (const b of [...masterBlocksFor(slide), ...slide.blocks.map(x => styled(x, slide))]) if (!isEmptyPlaceholder(b)) inner.appendChild(blockPreview(b, slide, { small: true }));
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
