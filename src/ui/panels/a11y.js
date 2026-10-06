// Accessibility checker dialog: lists the issues found and jumps to each one.

import { state, commit, setSelection, currentSlide } from '../../core/store.js';
import { checkAccessibility, checkStyle, fixContrast, fixAlign, blockLabel } from '../../features/document/a11y.js';
import { moveInOrder } from '../../features/document/blocks.js';
import { openAlt } from '../dialogs/object.js';
import { t } from '../../i18n/index.js';

const ICON = { empty: 'crop_square', notitle: 'title', duptitle: 'content_copy', alt: 'image_not_supported',
  tablehead: 'table_rows', contrast: 'contrast', fonts: 'font_download', wordy: 'subject', small: 'text_decrease', offslide: 'open_in_new_off',
  nearalign: 'align_horizontal_left', titlesize: 'format_size', fast: 'timer' };

export function openA11yCheck() {
  document.getElementById('a11y-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'a11y-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px;max-width:560px">
    <button class="modal-close">✕</button><h3>${t('Comprobar accesibilidad')}</h3>
    <div class="a11y-list"></div></div>`;
  const list = back.querySelector('.a11y-list');
  const fill = () => {
    const issues = checkAccessibility(), style = checkStyle();
    list.innerHTML = '';
    const low = issues.filter(i => i.kind === 'contrast');
    if (!issues.length) list.innerHTML = `<p class="a11y-ok"><i class="ms">check_circle</i> ${t('No se encontraron problemas de accesibilidad.')}</p>`;
    else if (low.length > 1) {
      const all = document.createElement('div'); all.className = 'fr-actions'; all.style.justifyContent = 'flex-end';
      all.innerHTML = `<button type="button" class="mini2">${t('Corregir todo el contraste')}</button>`;
      all.firstChild.addEventListener('click', () => { commit(() => low.forEach(it => fixContrast(state.deck, it.slide, it.blockId))); fill(); });
      list.appendChild(all);
    }
    const rowFor = it => {
      const row = document.createElement('div'); row.className = 'a11y-item'; row.dataset.kind = it.kind; row.tabIndex = 0;
      const extra = it.kind === 'duptitle' ? `= ${t('Diapositiva')} ${it.extra}` : it.kind === 'wordy' ? `${it.extra} ${t('palabras')}` : it.kind === 'nearalign' ? '' : it.extra;
      const msg = t(it.msg) + (extra ? ` (${extra})` : '');
      row.innerHTML = `<i class="ms">${ICON[it.kind] || 'warning'}</i><span class="a11y-s">${t('Diapositiva')} ${it.slide + 1}</span><span></span>`;
      row.children[2].textContent = msg;
      const go = () => {
        commit(() => { state.ui.slideIndex = it.slide; setSelection(it.blockId); }, { history: false });
        if (it.kind === 'alt') { close(); const b = state.deck.slides[it.slide].blocks.find(x => x.id === it.blockId); if (b) openAlt(b); }
      };
      row.addEventListener('click', e => { if (!e.target.closest('.a11y-fix')) go(); });
      row.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      const fix = it.kind === 'contrast' ? () => fixContrast(state.deck, it.slide, it.blockId) : it.kind === 'nearalign' ? () => fixAlign(state.deck, it.slide, it.blockId, it.extra) : null;
      if (fix) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'mini2 a11y-fix'; b.textContent = t(it.kind === 'contrast' ? 'Corregir' : 'Alinear');
        b.addEventListener('click', () => { commit(fix); fill(); }); row.appendChild(b);
      }
      return row;
    };
    for (const it of issues) list.appendChild(rowFor(it));
    const h = document.createElement('h4'); h.className = 'a11y-h'; h.textContent = t('Estilo y legibilidad'); list.appendChild(h);
    if (!style.length) { const p = document.createElement('p'); p.className = 'a11y-ok'; p.innerHTML = `<i class="ms">check_circle</i> ${t('Todo en orden.')}`; list.appendChild(p); }
    for (const it of style) list.appendChild(rowFor(it));
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
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px;max-width:520px">
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
