// Selection pane (PowerPoint's Home ▸ Arrange ▸ Selection Pane, Keynote's
// object list): every object of the slide, the front one first. Click to
// select (Ctrl/Shift: several), the eye hides or shows it, the padlock locks
// it, double-click renames it, and dragging a row (or ↑ ↓) changes what is in
// front. Handy for objects under others, and for reveals built with hidden ones.

import { esc } from '../../core/text.js';
import { state, commit, currentSlide, setSelection, toggleSelection, isSelected } from '../../core/store.js';
import * as blocks from '../../features/document/blocks.js';
import { blockLabel } from '../../features/document/a11y.js';
import { t } from '../../i18n/index.js';

export function toggleSelectionPane(on = !state.ui.showSelection) {
  commit(() => { state.ui.showSelection = on; }, { history: false });
}
const ICON = { text: 'title', image: 'image', shape: 'category', chart: 'bar_chart', table: 'table', icon: 'star', math: 'functions', model: 'deployed_code',
  video: 'movie', audio: 'music_note', embed: 'language', code: 'code', connector: 'timeline', ink: 'draw', camera: 'videocam', poll: 'how_to_vote', timer: 'timer', lock: 'lock', slideref: 'filter_none', magnify: 'loupe' };

export function renderSelectionPane() {
  let panel = document.getElementById('selection-panel');
  if (!state.ui.showSelection) { panel?.remove(); return; }
  if (!panel) { panel = document.createElement('aside'); panel.id = 'selection-panel'; document.querySelector('main').appendChild(panel); }
  const list = [...(currentSlide()?.blocks || [])].reverse();          // (the front one first, as PowerPoint)
  const key = JSON.stringify([state.ui.slideIndex, list.map(b => [b.id, b.label, b.hidden, b.locked, isSelected(b.id), blockLabel(b)])]);
  if (panel.dataset.key === key || panel.querySelector('.sp-rename')) return;
  panel.dataset.key = key;
  panel.innerHTML = `<div class="cm-head"><b>${t('Selección')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div>
    <div class="sp-tools"><button type="button" data-all="show">${t('Mostrar todo')}</button><button type="button" data-all="hide">${t('Ocultar todo')}</button>
      <button type="button" data-z="1" title="${t('Traer adelante')}"><i class="ms">arrow_upward</i></button><button type="button" data-z="-1" title="${t('Enviar atrás')}"><i class="ms">arrow_downward</i></button></div>
    <ul class="sp-rows" role="listbox" aria-multiselectable="true">${list.map(b => `<li class="sp-row${isSelected(b.id) ? ' on' : ''}${b.hidden ? ' off' : ''}" draggable="true" data-id="${b.id}" role="option" aria-selected="${isSelected(b.id)}">
        <i class="ms sp-kind">${ICON[b.type] || 'crop_square'}</i><span class="sp-name" title="${t('Doble clic para cambiar el nombre')}">${esc(blockLabel(b, t))}</span>
        <button type="button" class="sp-lock${b.locked ? ' on' : ''}" title="${t(b.locked ? 'Desbloquear' : 'Bloquear')}"><i class="ms">${b.locked ? 'lock' : 'lock_open'}</i></button>
        <button type="button" class="sp-eye" title="${t(b.hidden ? 'Mostrar' : 'Ocultar')}"><i class="ms">${b.hidden ? 'visibility_off' : 'visibility'}</i></button></li>`).join('')}</ul>
    ${list.length ? '' : `<p class="host-help">${t('Esta diapositiva no tiene objetos.')}</p>`}`;
  panel.querySelector('.cm-close').addEventListener('click', () => toggleSelectionPane(false));
  panel.querySelectorAll('[data-all]').forEach(x => x.addEventListener('click', () => blocks.setAllHidden(x.dataset.all === 'hide')));
  panel.querySelectorAll('[data-z]').forEach(x => x.addEventListener('click', () => {
    const id = state.ui.selection; if (id) blocks.moveInOrder(id, +x.dataset.z);
  }));
  const byId = id => currentSlide().blocks.find(b => b.id === id);
  let dragged = null;
  panel.querySelectorAll('.sp-row').forEach(row => {
    const id = row.dataset.id;
    row.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      commit(() => { if (e.ctrlKey || e.metaKey || e.shiftKey) toggleSelection(id); else setSelection(id); }, { history: false });
    });
    row.querySelector('.sp-eye').addEventListener('click', () => blocks.setHidden(id, !byId(id)?.hidden));
    row.querySelector('.sp-lock').addEventListener('click', () => { const b = byId(id); if (b) commit(() => { if (b.locked) delete b.locked; else b.locked = true; }); });
    row.querySelector('.sp-name').addEventListener('dblclick', () => {
      const span = row.querySelector('.sp-name'), inp = document.createElement('input');
      inp.className = 'sp-rename'; inp.value = byId(id)?.label || blockLabel(byId(id), t); span.replaceWith(inp); inp.focus(); inp.select();
      let done = false;
      const end = ok => { if (done) return; done = true; inp.remove(); if (ok) blocks.renameBlock(id, inp.value); else { panel.dataset.key = ''; renderSelectionPane(); } };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') end(true); else if (e.key === 'Escape') end(false); e.stopPropagation(); });
      inp.addEventListener('blur', () => end(true));
    });
    // Drag a row above or below another: in front of it or behind it.
    row.addEventListener('dragstart', e => { dragged = id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); });
    row.addEventListener('dragover', e => { if (!dragged || dragged === id) return; e.preventDefault(); const r = row.getBoundingClientRect(); row.dataset.drop = e.clientY < r.top + r.height / 2 ? 'above' : 'below'; });
    row.addEventListener('dragleave', () => { delete row.dataset.drop; });
    row.addEventListener('drop', e => {
      e.preventDefault(); const where = row.dataset.drop; delete row.dataset.drop; if (!dragged || dragged === id) return;
      const arr = currentSlide().blocks, from = arr.findIndex(b => b.id === dragged);
      let to = arr.findIndex(b => b.id === id) + (where === 'above' ? 1 : 0);   // (the list is front first: above = in front)
      if (from < to) to--;
      blocks.moveToIndex(dragged, to); dragged = null;
    });
  });
}
