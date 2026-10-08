// Edit a picture with AI (Imagen ▸ «Editar con IA»): erase something, retouch it, more resolution, extend its edges
// to another shape, or a change said in words. The image model does it (features/ai/openrouter.js editImage).

import { esc } from '../../core/text.js';
import * as ai from '../../features/ai/openrouter.js';
import { t } from '../../i18n/index.js';
import { run } from './ai.js';

const KINDS = [['erase', 'Borrar algo de la foto'], ['enhance', 'Mejorar la foto (luz, color, nitidez)'], ['upscale', 'Más resolución'],
  ['expand', 'Ampliar por los bordes'], ['edit', 'Cambiar algo (dilo con tus palabras)']];
const SHAPES = [['16:9', 'Panorámica 16:9 (la diapositiva)'], ['4:3', '4:3'], ['1:1', 'Cuadrada'], ['9:16', 'Vertical 9:16'], ['21:9', 'Muy panorámica 21:9']];

export function openImageAI(b) {
  document.getElementById('imgai-modal')?.remove();
  const back = document.createElement('div'); back.id = 'imgai-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(480px,94vw)"><button class="modal-close">✕</button><h3>${t('Editar la imagen con IA')}</h3>
    <div class="ia-kinds">${KINDS.map(([k, l], i) => `<label class="fr-chk"><input type="radio" name="ia-kind" value="${k}"${i ? '' : ' checked'}> ${esc(t(l))}</label>`).join('')}</div>
    <label class="fr-l ia-what-l">${t('¿Qué?')}<input type="text" class="ia-what" maxlength="300"></label>
    <label class="fr-l ia-shape-l" hidden>${t('Nueva forma')}<select class="ia-shape">${SHAPES.map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join('')}</select></label>
    <p class="host-help">${t('La IA rehace la imagen: revisa el resultado (puedes deshacerlo con Ctrl+Z). Cuenta como crear una imagen.')}</p>
    <div class="fr-actions"><button class="mini2 ia-cancel">${t('Cancelar')}</button><button class="fr-do ia-ok">${t('Hacerlo')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove(), kind = () => back.querySelector('input[name="ia-kind"]:checked').value;
  const PH = { erase: 'p. ej.: el cable de la izquierda, la persona del fondo', edit: 'p. ej.: que sea de noche, la pared azul' };
  const sync = () => { const k = kind(); q('.ia-what-l').hidden = !PH[k]; q('.ia-what').placeholder = PH[k] ? t(PH[k]) : ''; q('.ia-shape-l').hidden = k !== 'expand'; };
  back.querySelector('.ia-kinds').addEventListener('change', sync); sync();
  q('.modal-close').addEventListener('click', close); q('.ia-cancel').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.ia-ok').addEventListener('click', () => {
    const k = kind(), what = q('.ia-what').value.trim();
    if (PH[k] && !what) { q('.ia-what').focus(); return; }
    close();
    const el = document.querySelector(`.block[data-id="${b.id}"]`); el?.classList.add('processing');
    run(() => ai.editImage(b, k, { what, aspect: q('.ia-shape').value })).finally(() => el?.classList.remove('processing'));
  });
  q('.ia-what').focus();
}
