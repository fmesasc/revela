// Design ▸ Resize: another shape for the whole presentation (A4, square, 9:16…),
// with its content moved and scaled to fit, or only the size (as PowerPoint's
// "Don't scale"). One undo step.

import { state } from '../../core/store.js';
import { SIZES, resizeDeck } from '../../features/design/resize.js';
import { fitZoom } from '../ribbon/zoom.js';
import { t } from '../../i18n/index.js';

export function openResize() {
  document.getElementById('rs-modal')?.remove();
  const { w, h } = state.deck.size, cur = `${w}x${h}`;
  const back = document.createElement('div');
  back.id = 'rs-modal'; back.className = 'modal-backdrop';
  const shape = key => { const [a, b] = key.split('x').map(Number), k = 34 / Math.max(a, b); return `<i class="rs-shape" style="width:${Math.round(a * k)}px;height:${Math.round(b * k)}px"></i>`; };
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Cambiar tamaño')}</h3>
    <div class="rs-list">${SIZES.map(([k, l]) => `<label class="rs-opt"><input type="radio" name="rs" value="${k}"${k === cur ? ' checked' : ''}>${shape(k)}<span>${t(l)}<small>${k.replace('x', ' × ')}</small></span></label>`).join('')}</div>
    <label class="fr-chk"><input type="checkbox" class="rs-fit" checked> ${t('Recolocar y escalar el contenido para que quepa')}</label>
    <div class="fr-actions"><button class="fr-do rs-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.rs-ok').addEventListener('click', () => {
    const v = q('input[name=rs]:checked')?.value; if (!v) return;
    const [nw, nh] = v.split('x').map(Number);
    resizeDeck(nw, nh, { fit: q('.rs-fit').checked }); close(); requestAnimationFrame(fitZoom);
  });
}
