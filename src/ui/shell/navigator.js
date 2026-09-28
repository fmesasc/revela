// The slide navigator: thumbnails grouped by section, drag‑and‑drop reordering,
// and quick delete.

import { state, currentSlide } from '../../core/store.js';
import { goToSlide, moveSlide, deleteSlide, renameSection } from '../../features/document/slides.js';
import { blockPreview } from './preview.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { masterBlocksFor, isEmptyPlaceholder, styled, styleKind, ensureLayouts, editLayout, layoutInUse } from '../../features/document/master.js';

let panel;
let dragFrom = null;

export function initPanel() { panel = document.getElementById('navigator'); }

// Thumbnails are cached per slide and rebuilt only when that slide (or what
// every thumbnail depends on: size, master, theme colours) changes — decks with
// many image-heavy slides would otherwise take seconds on every edit.
const cache = new Map();                   // slide id → { sig, el }
const LONG = 200;
const sigOf = v => JSON.stringify(v, (k, x) => (typeof x === 'string' && x.length > LONG ? `${x.length}:${x.slice(0, 40)}${x.slice(-40)}` : x));

export function renderPanel() {
  if (state.ui.editMaster) return renderMasterPanel();
  const d = state.deck;
  const common = sigOf([d.size, d.master, d.layouts, deckFg(), deckBodyFont()]);
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
}

// Master view (PowerPoint's Slide Master): the master and its layouts, each
// with its placeholders as dashed frames; click one to edit it.
const PH_LABEL = { title: 'Título', subtitle: 'Subtítulo', body: 'Texto' };
function renderMasterPanel() {
  const d = state.deck, { w, h } = d.size, sel = state.ui.editMaster;
  const card = (label, sub, active, slide, blocks, onClick, indent) => {
    const el = document.createElement('div'); el.className = 'thumb layout-thumb' + (active ? ' active' : '') + (indent ? ' indent' : '');
    const canvas = document.createElement('div'); canvas.className = 'thumb-canvas';
    canvas.style.background = slide.background || d.slides[0]?.background || '#101317'; canvas.style.setProperty('--ar', w / h);
    const inner = document.createElement('div'); inner.className = 'thumb-inner';
    inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${188 / w});color:${deckFg()};font-family:${deckBodyFont() || 'inherit'}`;
    for (const b of blocks) {
      if (b.ph) {
        const f = document.createElement('div'); const st = styled(b, slide);
        f.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;border:6px dashed currentColor;opacity:.55;`
          + `font-size:${st.fontSize || 40}px;${st.color ? `color:${st.color};` : ''}${st.fontFamily ? `font-family:${st.fontFamily};` : ''}font-weight:${st.fontWeight || 400};padding:12px;box-sizing:border-box;text-align:${st.textAlign || 'left'}`;
        f.textContent = PH_LABEL[styleKind(b)] || b.ph; inner.appendChild(f);
      } else inner.appendChild(blockPreview(b));
    }
    canvas.appendChild(inner);
    const cap = document.createElement('div'); cap.className = 'layout-name'; cap.textContent = label + (sub ? ' · ' + sub : '');
    el.append(canvas, cap); el.addEventListener('click', onClick);
    return el;
  };
  const m = d.master || { blocks: [] };
  const nodes = [card('Patrón', '', sel === true, m, m.blocks, () => editLayout(true), false)];
  for (const l of ensureLayouts(d)) {
    const n = layoutInUse(l.id);
    nodes.push(card(l.name, n ? `${n} diap.` : '', sel === l.id, l, [...masterBlocksFor(l, d), ...l.blocks], () => editLayout(l.id), true));
  }
  panel.replaceChildren(...nodes);
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
  el.draggable = true;
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
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${188 / w});color:${deckFg()};font-family:${deckBodyFont() || 'inherit'}`;
  for (const b of [...masterBlocksFor(slide), ...slide.blocks.map(x => styled(x, slide))]) if (!isEmptyPlaceholder(b)) inner.appendChild(blockPreview(b));
  canvas.appendChild(inner);

  const del = document.createElement('button'); del.className = 'thumb-del'; del.textContent = '×';
  del.title = 'Borrar diapositiva';
  del.addEventListener('click', e => { e.stopPropagation(); deleteSlide(index()); });

  el.append(num, canvas, del);
  const nc = (slide.comments || []).filter(c => !c.resolved).length;
  if (nc) { const c = document.createElement('span'); c.className = 'thumb-cm'; c.textContent = '💬 ' + nc; el.appendChild(c); }
  el.addEventListener('click', () => goToSlide(index()));

  el.addEventListener('dragstart', () => { dragFrom = index(); el.classList.add('dragging'); });
  el.addEventListener('dragend', () => { dragFrom = null; el.classList.remove('dragging'); clearMarks(); });
  el.addEventListener('dragover', e => { e.preventDefault(); markTarget(el); });
  el.addEventListener('drop', e => {
    e.preventDefault();
    const to = +el.dataset.index;
    if (dragFrom !== null && dragFrom !== to) moveSlide(dragFrom, to);
  });
  return el;
}

function markTarget(el) { clearMarks(); el.classList.add('drop-target'); }
function clearMarks() { panel.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target')); }
