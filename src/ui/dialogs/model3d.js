// "Movimiento 3D": how a 3D object moves — its own animations, turning by
// itself, and a camera movement when its slide appears — with a live preview.

import { commit, currentSlide } from '../../core/store.js';
import { MOTIONS_3D, modelAttrs, model3dRuntime } from '../../features/content/model3d.js';
import { MODEL_VIEWER, loadScript } from '../../core/vendor.js';
import { t } from '../../i18n/index.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export async function openModel3D(b) {
  document.getElementById('m3d-modal')?.remove();
  await loadScript(MODEL_VIEWER).catch(() => {});
  const back = document.createElement('div'); back.id = 'm3d-modal'; back.className = 'modal-backdrop';
  const o = { autoRotate: b.autoRotate !== false, spin: b.spin || 30, clip: b.clip || '', clipOnce: !!b.clipOnce, clipSpeed: b.clipSpeed || 1, motion: b.motion || 'none' };
  back.innerHTML = `<div class="modal m3d" style="text-align:start;min-width:min(360px,94vw);max-width:min(620px,94vw)">
    <button class="modal-close">✕</button><h3>${t('Movimiento 3D')}</h3>
    <div class="m3d-view"></div>
    <fieldset><legend>${t('Animación del modelo')}</legend>
      <label class="fr-l">${t('Animación')} <select class="m3d-clip"><option value="">${t('Ninguna')}</option><option value="*">${t('La primera')}</option></select></label>
      <label class="fr-chk"><input type="checkbox" class="m3d-once"${o.clipOnce ? ' checked' : ''}> ${t('Solo una vez (no repetir)')}</label>
      <label class="fr-l">${t('Velocidad')} <input type="range" class="m3d-speed" min="0.25" max="3" step="0.25" value="${o.clipSpeed}"></label>
      <p class="host-help m3d-noclips" hidden>${t('Este modelo no trae animaciones propias.')}</p>
    </fieldset>
    <fieldset><legend>${t('Giro')}</legend>
      <label class="fr-chk"><input type="checkbox" class="m3d-rot"${o.autoRotate ? ' checked' : ''}> ${t('Girar solo')}</label>
      <label class="fr-l">${t('Velocidad (grados por segundo; negativo: al revés)')} <input type="range" class="m3d-spin" min="-120" max="120" step="10" value="${o.spin}"></label>
    </fieldset>
    <fieldset><legend>${t('Movimiento al llegar a la diapositiva')}</legend>
      <select class="m3d-motion">${MOTIONS_3D.map(([k, l]) => `<option value="${k}"${o.motion === k ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>
      <button type="button" class="mini2 m3d-try">${t('Probar')}</button>
    </fieldset>
    <div class="fr-actions"><span></span><button class="fr-do m3d-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  const close = () => { runtime.stop(mv); back.remove(); };
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  const mv = document.createElement('model-viewer');
  mv.style.cssText = 'width:100%;height:100%';
  q('.m3d-view').appendChild(mv);
  const runtime = model3dRuntime();
  const current = () => ({ ...b, autoRotate: q('.m3d-rot').checked, spin: +q('.m3d-spin').value, clip: q('.m3d-clip').value || null,
    clipOnce: q('.m3d-once').checked, clipSpeed: +q('.m3d-speed').value, motion: q('.m3d-motion').value });
  const preview = () => {
    const c = current();
    for (const [k, v] of modelAttrs(c)) if (mv.getAttribute(k) !== v) mv.setAttribute(k, v);
    for (const n of ['auto-rotate', 'rotation-per-second', 'autoplay', 'animation-name']) if (!modelAttrs(c).some(([k]) => k === n)) mv.removeAttribute(n);
    mv.timeScale = c.clipSpeed;
  };
  mv.addEventListener('load', () => {
    const names = mv.availableAnimations || [];
    q('.m3d-noclips').hidden = names.length > 0;
    q('.m3d-clip').insertAdjacentHTML('beforeend', names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join(''));
    q('.m3d-clip').value = o.clip && (o.clip === '*' || names.includes(o.clip)) ? o.clip : names.length && o.clip ? '*' : '';
    preview();
  }, { once: true });
  preview();
  back.querySelectorAll('select, input').forEach(el => el.addEventListener('input', preview));
  back.querySelectorAll('select, input').forEach(el => el.addEventListener('change', preview));
  q('.m3d-try').addEventListener('click', () => { preview(); runtime.start(mv); });
  q('.m3d-ok').addEventListener('click', () => {
    const c = current();
    commit(() => {
      const x = currentSlide().blocks.find(y => y.id === b.id); if (!x) return;
      x.autoRotate = c.autoRotate;
      for (const [k, v] of [['spin', c.spin !== 30 ? c.spin : null], ['clip', c.clip], ['clipOnce', c.clip && c.clipOnce], ['clipSpeed', c.clip && c.clipSpeed !== 1 ? c.clipSpeed : null], ['motion', c.motion !== 'none' ? c.motion : null]])
        if (v) x[k] = v; else delete x[k];
    });
    close();
  });
}
