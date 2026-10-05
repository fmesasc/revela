// "Print handouts / notes pages" dialog: pick the layout, then the browser's
// print window opens (choose "Save as PDF" there).

import { exportHandout, exportPDF } from '../../io/export/print.js';
import { exportPDFFile } from '../../io/export/pdf.js';
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
      <select class="vd-type"><option value="mp4">MP4 (H.264)</option><option value="gif">${t('GIF animado')}</option></select></label>
    <label class="fr-l">${t('Segundos por diapositiva (si no tiene avance automático)')}
      <input type="number" class="vd-hold" min="1" max="60" step="1" value="5"></label>
    <p class="host-help vd-est"></p>
    <progress class="vd-prog" max="1" value="0" hidden style="width:100%"></progress>
    <div class="fr-actions"><button class="mini2 vd-stop" hidden>${t('Cancelar')}</button><button class="fr-do vd-go">${t('Exportar')}</button></div></div>`;
  document.body.appendChild(back);
  // (Closing or «Cancelar» while it is being made stops it: no file turning up later out of nowhere.)
  let running = false, cancelled = false;
  const close = () => { if (running) cancelled = true; back.remove(); };
  // (How long the video will be, before making it.)
  const est = () => { const vis = state.deck.slides.filter(x => !x.hidden), hold = Math.max(1, +back.querySelector('.vd-hold').value || 5);
    const secs = Math.round(vis.reduce((a, x) => a + (x.autoSlide > 0 ? x.autoSlide / 1000 : hold), 0));
    back.querySelector('.vd-est').textContent = t('≈ {s} s de vídeo ({n} diapositivas); hacerlo tarda unos minutos.').replace('{s}', secs).replace('{n}', vis.length); };
  back.querySelector('.vd-hold').addEventListener('input', est); est();
  back.querySelector('.vd-stop').addEventListener('click', () => { cancelled = true; });
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.vd-go').addEventListener('click', async () => {
    const type = back.querySelector('.vd-type').value, holdMs = Math.max(1, +back.querySelector('.vd-hold').value || 5) * 1000;
    const prog = back.querySelector('.vd-prog'), go = back.querySelector('.vd-go');
    prog.hidden = false; go.disabled = true; running = true; cancelled = false; back.querySelector('.vd-stop').hidden = false;
    const onProgress = p => { if (cancelled) throw new Error('STOPPED'); prog.value = p; };
    try {
      const v = await import('../../io/export/video.js');
      const blob = type === 'gif' ? await v.buildGIF(undefined, { holdMs, onProgress }) : await v.buildMP4(undefined, { holdMs, onProgress });
      if (cancelled) throw new Error('STOPPED');
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-') + '.' + type; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      running = false; close(); toast(t('Vídeo descargado.'));
    } catch (e) {
      running = false; go.disabled = false; prog.hidden = true; back.querySelector('.vd-stop').hidden = true;
      if (e.message === 'STOPPED') return;
      alertDialog(t('No se pudo exportar: ') + (e.message === 'WebCodecs' || e.message === 'H.264' ? t('este navegador no puede codificar MP4; prueba GIF o Chrome/Edge.') : (e.message || e)));
    }
  });
}

// Export PDF: the two ways — the pictures only, or with the text selectable and searchable — and printing.
export function openPdfDialog() {
  document.getElementById('pdf-modal')?.remove();
  const back = document.createElement('div'); back.id = 'pdf-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:94vw">
    <button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3>${t('Exportar PDF')}</h3>
    <p class="host-help">${t('Una página por diapositiva, exactamente como se ven (3D, fórmulas y efectos incluidos).')}</p>
    <div class="pdf-ways">
      <button type="button" class="pdf-way" data-pdf="text"><i class="ms">text_select_start</i><b>${t('Con el texto seleccionable')}</b>
        <small>${t('Se puede buscar, copiar y leer en voz alta. Recomendado.')}</small></button>
      <button type="button" class="pdf-way" data-pdf="image"><i class="ms">image</i><b>${t('Solo imágenes')}</b>
        <small>${t('Nadie puede copiar el texto.')}</small></button>
    </div>
    <p class="host-help" style="margin-top:12px">${t('Para imprimir, o con varias diapositivas o notas por página:')} <button type="button" class="mini2 pdf-print">${t('Imprimir')}</button> <button type="button" class="mini2 pdf-handout">${t('Documentos y notas')}</button></p></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.pdf-print').addEventListener('click', () => { close(); exportPDF(msg => toast(msg, { ms: 9000 })); });
  back.querySelector('.pdf-handout').addEventListener('click', () => { close(); openHandoutDialog(); });
  back.querySelectorAll('[data-pdf]').forEach(b => b.addEventListener('click', async () => {
    const text = b.dataset.pdf === 'text'; close();
    const note = toast(t('Creando el PDF…'), { busy: true });
    try { await exportPDFFile(undefined, { text }); note.close(); toast(t('PDF descargado.')); }
    catch (e) { note.close(); alertDialog(t('No se pudo exportar: ') + (e.message || e)); }
  }));
  back.querySelector('[data-pdf="text"]').focus();
}
