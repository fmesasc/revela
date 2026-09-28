// "Save as picture" for the selected objects: format (PNG with transparency,
// JPG, WebP, SVG for vector objects), size, background, and for a photo the
// edited version or the original file.

import { selectedBlocks } from '../../core/store.js';
import { exportObjects, vectorSVG } from '../../io/export/objects.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';

export function openSaveAsPicture(list = selectedBlocks()) {
  if (!list.length) return;
  document.getElementById('pic-modal')?.remove();
  const one = list.length === 1 ? list[0] : null;
  const photo = one?.type === 'image' && one.src;
  const vector = one && vectorSVG(one);
  const back = document.createElement('div');
  back.id = 'pic-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Guardar como imagen')}</h3>
    ${photo ? `<label class="fr-l">${t('Imagen')}
      <select class="pic-mode"><option value="together">${t('Con las ediciones (ajustes y recorte)')}</option>
        <option value="original">${t('Original, tal como se insertó')}</option></select></label>` : ''}
    ${list.length > 1 ? `<label class="fr-l">${t('Objetos')}
      <select class="pic-mode"><option value="together">${t('Juntos en una imagen')}</option>
        <option value="each">${t('Un archivo por objeto (ZIP)')}</option></select></label>` : ''}
    <label class="fr-l pic-f">${t('Formato')}
      <select class="pic-format">
        <option value="png">PNG (${t('fondo transparente')})</option>
        <option value="webp">WebP (${t('fondo transparente')})</option>
        <option value="jpg">JPG</option>
        ${vector ? `<option value="svg">SVG (${t('vectorial')})</option>` : ''}
      </select></label>
    <label class="fr-l pic-bgl">${t('Fondo')}
      <select class="pic-bg"><option value="">${t('Transparente')}</option>
        <option value="slide">${t('El de la diapositiva')}</option>
        <option value="#ffffff">${t('Blanco')}</option></select></label>
    <label class="fr-l pic-sl">${t('Tamaño')}
      <select class="pic-scale"><option value="1">1× (${t('como en la diapositiva')})</option>
        <option value="2" selected>2×</option><option value="4">4× (${t('alta resolución')})</option></select></label>
    <div class="fr-actions"><button class="fr-do pic-go">${t('Guardar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  // Only the options that apply: no background for JPG (white) or SVG, no size
  // for SVG, nothing but the file for the original photo.
  const sync = () => {
    const f = q('.pic-format').value, original = q('.pic-mode')?.value === 'original';
    q('.pic-f').hidden = original;
    q('.pic-bgl').hidden = original || f === 'svg';
    q('.pic-sl').hidden = original || f === 'svg';
    q('.pic-bg option[value=""]').disabled = f === 'jpg';
    if (f === 'jpg' && !q('.pic-bg').value) q('.pic-bg').value = '#ffffff';
  };
  back.querySelectorAll('select').forEach(s => s.addEventListener('change', sync)); sync();
  q('.pic-go').addEventListener('click', async () => {
    const go = q('.pic-go'); go.disabled = true; go.textContent = t('Guardando…');
    try {
      await exportObjects(list, { mode: q('.pic-mode')?.value || 'together', format: q('.pic-format').value,
        scale: +q('.pic-scale').value, background: q('.pic-bg').value || null });
      close();
    } catch (e) { close(); alertDialog(t('No se pudo guardar la imagen: ') + (e.message || e)); }
  });
}
