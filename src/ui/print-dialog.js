// "Print handouts / notes pages" dialog: pick the layout, then the browser's
// print window opens (choose "Save as PDF" there).

import { exportHandout, exportImages } from '../io/reveal.js';
import { t } from '../i18n.js';

export function openHandoutDialog() {
  document.getElementById('handout-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'handout-modal'; back.className = 'modal-backdrop';
  const opt = (v, l) => `<option value="${v}">${t(l)}</option>`;
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Documentos y notas')}</h3>
    <label class="fr-l">${t('Diseño de impresión')}
      <select class="ho-layout">
        ${opt('notes', 'Páginas de notas')}${opt(1, '1 diapositiva por página')}${opt(2, '2 diapositivas por página')}
        ${opt(3, '3 diapositivas por página (con líneas)')}${opt(4, '4 diapositivas por página')}
        ${opt(6, '6 diapositivas por página')}${opt(9, '9 diapositivas por página')}
      </select></label>
    <div class="fr-actions"><button class="fr-do ho-go">${t('Imprimir / PDF')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.ho-layout').value = '6';
  back.querySelector('.ho-go').addEventListener('click', () => {
    const v = back.querySelector('.ho-layout').value;
    exportHandout(v === 'notes' ? 'notes' : +v); close();
  });
}

// Export images: PNG or JPG, the current slide or all of them in a .zip.
export function openImageDialog() {
  document.getElementById('img-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'img-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:left;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Exportar imágenes')}</h3>
    <label class="fr-l">${t('Formato')}
      <select class="im-type"><option value="png">PNG</option><option value="jpg">JPG</option></select></label>
    <label class="fr-l">${t('Diapositivas')}
      <select class="im-scope"><option value="one">${t('Solo la diapositiva actual')}</option>
        <option value="all">${t('Todas las diapositivas (ZIP)')}</option></select></label>
    <div class="fr-actions"><button class="fr-do im-go">${t('Exportar')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.im-go').addEventListener('click', () => {
    exportImages({ type: back.querySelector('.im-type').value, all: back.querySelector('.im-scope').value === 'all' });
    close();
  });
}
