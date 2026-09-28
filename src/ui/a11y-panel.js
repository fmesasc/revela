// Accessibility checker dialog: lists the issues found and jumps to each one.

import { state, commit, setSelection, currentSlide } from '../core/store.js';
import { checkAccessibility, blockLabel } from '../features/a11y.js';
import { moveInOrder } from '../features/blocks.js';
import { openAlt } from './contextmenu.js';
import { t } from '../i18n.js';

const ICON = { empty: 'crop_square', notitle: 'title', duptitle: 'content_copy', alt: 'image_not_supported',
  tablehead: 'table_rows', contrast: 'contrast' };

export function openA11yCheck() {
  document.getElementById('a11y-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'a11y-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:320px;max-width:560px">
    <button class="modal-close">✕</button><h3>${t('Comprobar accesibilidad')}</h3>
    <div class="a11y-list"></div></div>`;
  const list = back.querySelector('.a11y-list');
  const fill = () => {
    const issues = checkAccessibility();
    list.innerHTML = '';
    if (!issues.length) { list.innerHTML = `<p class="a11y-ok"><i class="ms">check_circle</i> ${t('No se encontraron problemas de accesibilidad.')}</p>`; return; }
    for (const it of issues) {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'a11y-item'; row.dataset.kind = it.kind;
      const extra = it.kind === 'duptitle' ? `= ${t('Diapositiva')} ${it.extra}` : it.extra;
      const msg = t(it.msg) + (extra ? ` (${extra})` : '');
      row.innerHTML = `<i class="ms">${ICON[it.kind] || 'warning'}</i><span class="a11y-s">${t('Diapositiva')} ${it.slide + 1}</span><span></span>`;
      row.lastChild.textContent = msg;
      row.addEventListener('click', () => {
        commit(() => { state.ui.slideIndex = it.slide; setSelection(it.blockId); }, { history: false });
        if (it.kind === 'alt') { close(); const b = state.deck.slides[it.slide].blocks.find(x => x.id === it.blockId); if (b) openAlt(b); }
      });
      list.appendChild(row);
    }
  };
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  fill();
}

// Reading order of the current slide (PowerPoint "Reading Order" / Selection
// pane): the order screen readers follow, which is also the stacking order.
export function openReadingOrder() {
  document.getElementById('ro-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'ro-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:320px;max-width:520px">
    <button class="modal-close">✕</button><h3>${t('Orden de lectura')}</h3>
    <p class="host-help">${t('Los lectores de pantalla leen los objetos de arriba abajo. El primero queda al fondo.')}</p>
    <ol class="ro-list"></ol></div>`;
  const list = back.querySelector('.ro-list');
  const fill = () => {
    const bs = currentSlide().blocks;
    list.innerHTML = '';
    bs.forEach((b, i) => {
      const li = document.createElement('li'); li.className = 'ro-item' + (state.ui.selection === b.id ? ' on' : '');
      li.innerHTML = `<button type="button" class="ro-name"></button><button type="button" data-d="-1" title="${t('Subir')}"${i ? '' : ' disabled'}>↑</button>`
        + `<button type="button" data-d="1" title="${t('Bajar')}"${i < bs.length - 1 ? '' : ' disabled'}>↓</button>`;
      li.querySelector('.ro-name').textContent = blockLabel(b, t) + (b.decorative ? ` (${t('decorativo')})` : '');
      li.querySelector('.ro-name').addEventListener('click', () => { commit(() => setSelection(b.id), { history: false }); fill(); });
      li.querySelectorAll('[data-d]').forEach(x => x.addEventListener('click', () => { moveInOrder(b.id, +x.dataset.d); fill(); }));
      list.appendChild(li);
    });
  };
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  fill();
}
