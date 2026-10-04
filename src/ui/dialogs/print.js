// "Print handouts / notes pages" dialog: pick the layout, then the browser's
// print window opens (choose "Save as PDF" there).

import { exportHandout } from '../../io/export/print.js';
import { exportImages } from '../../io/export/images.js';
import { t } from '../../i18n/index.js';
import { state } from '../../core/store.js';
import { alertDialog } from './dialog.js';
import { toast } from '../shell/toast.js';

export function openHandoutDialog() {
  document.getElementById('handout-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'handout-modal'; back.className = 'modal-backdrop';
  const opt = (v, l) => `<option value="${v}">${t(l)}</option>`;
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
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
    exportHandout(v === 'notes' ? 'notes' : +v, msg => toast(msg, { ms: 9000 })); close();
  });
}

// Export images: PNG or JPG, the current slide or all of them in a .zip.
export function openImageDialog() {
  document.getElementById('img-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'img-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
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

// Export video: MP4 or animated GIF, with a progress bar.
export function openVideoDialog() {
  document.getElementById('video-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'video-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Exportar vídeo')}</h3>
    <label class="fr-l">${t('Formato')}
      <select class="vd-type"><option value="mp4">MP4 (H.264)</option><option value="gif">GIF ${t('animado')}</option></select></label>
    <label class="fr-l">${t('Segundos por diapositiva (si no tiene avance automático)')}
      <input type="number" class="vd-hold" min="1" max="60" step="1" value="5"></label>
    <progress class="vd-prog" max="1" value="0" hidden style="width:100%"></progress>
    <div class="fr-actions"><button class="fr-do vd-go">${t('Exportar')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.vd-go').addEventListener('click', async () => {
    const type = back.querySelector('.vd-type').value, holdMs = Math.max(1, +back.querySelector('.vd-hold').value || 5) * 1000;
    const prog = back.querySelector('.vd-prog'), go = back.querySelector('.vd-go');
    prog.hidden = false; go.disabled = true;
    try {
      const v = await import('../../io/export/video.js');
      const blob = type === 'gif' ? await v.buildGIF(undefined, { holdMs, onProgress: p => (prog.value = p) })
        : await v.buildMP4(undefined, { holdMs, onProgress: p => (prog.value = p) });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-') + '.' + type; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      close();
    } catch (e) {
      go.disabled = false; prog.hidden = true;
      alertDialog(t('No se pudo exportar: ') + (e.message === 'WebCodecs' || e.message === 'H.264' ? t('este navegador no puede codificar MP4; prueba GIF o Chrome/Edge.') : (e.message || e)));
    }
  });
}
