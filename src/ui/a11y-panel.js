// Accessibility checker dialog: lists the issues found and jumps to each one.

import { state, commit, setSelection } from '../core/store.js';
import { checkAccessibility } from '../features/a11y.js';
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
