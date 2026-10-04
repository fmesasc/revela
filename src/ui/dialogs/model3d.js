// "Movimiento 3D": how a 3D object moves — its own animations, turning by
// itself, walking (a clip while it moves on the slide, facing where it goes,
// and another on arrival) and a camera movement when its slide appears — with
// a live preview.

import { esc } from '../../core/text.js';
import { commit, currentSlide, setSelection } from '../../core/store.js';
import { startPathDraw } from '../canvas/pathdraw.js';
import { openAutoRig } from './autorig.js';
import { animatedBlocks } from '../../features/animation/transitions.js';
import { MOTIONS_3D, ARRIVALS_3D, modelAttrs } from '../../features/content/model3d.js';
import { model3dRuntime } from '../../io/runtime/model3d.js';
import { loadModelViewer } from '../../core/vendor.js';
import { t } from '../../i18n/index.js';

// (The same one every time the dialog opens: each one listens to the whole page.)
let runtime = null;

export async function openModel3D(b) {
  document.getElementById('m3d-modal')?.remove();
  await loadModelViewer().catch(() => {});
  const back = document.createElement('div'); back.id = 'm3d-modal'; back.className = 'modal-backdrop';
  const o = { autoRotate: b.autoRotate !== false, spin: b.spin || 30, clip: b.clip || '', clipOnce: !!b.clipOnce, clipSpeed: b.clipSpeed || 1, motion: b.motion || 'none' };
  const w = { clip: '', end: '', endOnce: true, face: true, look: true, ...b.walk }, hasMove = !!b.animation;
  back.innerHTML = `<div class="modal m3d" style="text-align:start;min-width:min(360px,94vw);max-width:min(620px,94vw)">
    <button class="modal-close">✕</button><h3>${t('Movimiento 3D')}</h3>
    <div class="m3d-view"></div>
    <fieldset><legend>${t('En reposo (animación del modelo)')}</legend>
      <label class="fr-l">${t('Animación')} <select class="m3d-clip"><option value="">${t('Ninguna')}</option><option value="*">${t('La primera')}</option></select></label>
      <label class="fr-chk"><input type="checkbox" class="m3d-once"${o.clipOnce ? ' checked' : ''}> ${t('Solo una vez (no repetir)')}</label>
      <label class="fr-l">${t('Velocidad')} <input type="range" class="m3d-speed" min="0.25" max="3" step="0.25" value="${o.clipSpeed}"></label>
      <p class="host-help m3d-noclips" hidden>${t('Este modelo no trae animaciones propias. Si es una persona o un animal, Revela puede ponerle un esqueleto y animaciones (andar, correr, saludar…).')}</p>
      <button type="button" class="mini2 m3d-rig"><i class="ms">accessibility_new</i> ${t('Esqueleto automático…')}</button>
    </fieldset>
    <fieldset class="m3d-walk"><legend>${t('Al moverse por la diapositiva')}</legend>
      <p class="host-help">${t('Mientras se mueve (su trayectoria u otra animación) hace una animación, por ejemplo andar, y al llegar otra.')}</p>
      <label class="fr-l">${t('Mientras se mueve')} <select class="m3d-wclip" data-keep="1"><option value="">${t('Nada (como siempre)')}</option></select></label>
      <label class="fr-l">${t('Al terminar el recorrido')} <select class="m3d-wend" data-keep="1"><option value="">${t('Volver al reposo')}</option></select></label>
      <label class="fr-chk"><input type="checkbox" class="m3d-wonce"${w.endOnce ? ' checked' : ''}> ${t('Una vez y volver al reposo')}</label>
      <label class="fr-chk"><input type="checkbox" class="m3d-wface"${w.face ? ' checked' : ''}> ${t('Mirar hacia donde va')}</label>
      <label class="fr-chk"><input type="checkbox" class="m3d-wlook"${w.look ? ' checked' : ''}> ${t('Al terminar, mirar al público')}</label>
      <label class="fr-chk m3d-wpath"${hasMove ? ' hidden' : ''}><input type="checkbox" class="m3d-waddpath" checked> ${t('Darle un recorrido de izquierda a derecha (se cambia en Animaciones ▸ Trayectoria)')}</label>
      <button type="button" class="mini2 m3d-wtry">${t('Probar andando')}</button>
      <button type="button" class="mini2 m3d-wdraw" title="${t('Aplica lo elegido y dibuja en la diapositiva por dónde irá')}"><i class="ms">gesture</i> ${t('Dibujar su recorrido')}</button>
    </fieldset>
    <fieldset class="m3d-spinbox"><legend>${t('Giro')}</legend>
      <label class="fr-chk"><input type="checkbox" class="m3d-rot"${o.autoRotate ? ' checked' : ''}> ${t('Girar solo')}</label>
      <label class="fr-l">${t('Velocidad (grados por segundo; negativo: al revés)')} <input type="range" class="m3d-spin" min="-120" max="120" step="10" value="${o.spin}"></label>
      <p class="host-help m3d-nospin" hidden>${t('Con un movimiento al entrar, el modelo no gira solo.')}</p>
    </fieldset>
    <fieldset><legend>${t('Movimiento al entrar en la diapositiva')}</legend>
      <select class="m3d-motion">${MOTIONS_3D.map(([k, l]) => `<option value="${k}"${o.motion === k ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>
      <button type="button" class="mini2 m3d-try">${t('Probar')}</button>
    </fieldset>
    <fieldset><legend>${t('Si ya estaba en la diapositiva anterior')}</legend>
      <p class="host-help">${t('Con Transformar, o el mismo modelo en las dos: cómo sigue al pasar de una a otra.')}</p>
      <select class="m3d-arrive">${ARRIVALS_3D.map(([k, l]) => `<option value="${k}"${(b.arrive || 'keep') === k ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>
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
  runtime ||= model3dRuntime();
  const current = () => ({ ...b, autoRotate: q('.m3d-rot').checked, spin: +q('.m3d-spin').value, clip: q('.m3d-clip').value || null,
    clipOnce: q('.m3d-once').checked, clipSpeed: +q('.m3d-speed').value, motion: q('.m3d-motion').value, arrive: q('.m3d-arrive').value,
    walk: q('.m3d-wclip').value ? { clip: q('.m3d-wclip').value, end: q('.m3d-wend').value, endOnce: q('.m3d-wonce').checked,
      face: q('.m3d-wface').checked, look: q('.m3d-wlook').checked } : null });
  const preview = () => {
    const c = current();
    for (const [k, v] of modelAttrs(c)) if (mv.getAttribute(k) !== v) mv.setAttribute(k, v);
    for (const n of ['auto-rotate', 'rotation-per-second', 'autoplay', 'animation-name', 'data-move-clip', 'data-end-clip', 'data-end-once', 'data-face', 'data-look'])
      if (!modelAttrs(c).some(([k]) => k === n)) mv.removeAttribute(n);
    back.querySelectorAll('.m3d-walk label:not(:first-of-type)').forEach(l => l.classList.toggle('off', !c.walk));
    // (Turning by itself only without a movement on entering or walking: modelAttrs.)
    const still = c.motion === 'none' && !c.walk;
    back.querySelectorAll('.m3d-spinbox label').forEach(l => l.classList.toggle('off', !still)); q('.m3d-nospin').hidden = c.motion === 'none' || !c.autoRotate;
    mv.timeScale = c.clipSpeed;
  };
  mv.addEventListener('load', () => {
    const names = mv.availableAnimations || [];
    q('.m3d-noclips').hidden = names.length > 0;
    q('.m3d-clip').insertAdjacentHTML('beforeend', names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join(''));
    q('.m3d-clip').value = o.clip && (o.clip === '*' || names.includes(o.clip)) ? o.clip : names.length && o.clip ? '*' : '';
    const opts = names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    q('.m3d-wclip').insertAdjacentHTML('beforeend', opts); q('.m3d-wend').insertAdjacentHTML('beforeend', opts);
    // A clip called like walking is the natural choice (Walk, Walking, Run…), shown first if nothing is chosen yet.
    q('.m3d-wclip').value = names.includes(w.clip) ? w.clip : '';
    q('.m3d-wend').value = names.includes(w.end) ? w.end : '';
    q('.m3d-walk').hidden = !names.length;
    const guess = names.find(n => /walk|andar|camin/i.test(n)) || names.find(n => /run|correr/i.test(n));
    if (guess) q('.m3d-wclip').dataset.guess = guess;
    preview();
  }, { once: true });
  preview();
  back.querySelectorAll('select, input').forEach(el => el.addEventListener('input', preview));
  back.querySelectorAll('select, input').forEach(el => el.addEventListener('change', preview));
  q('.m3d-try').addEventListener('click', () => { preview(); runtime.start(mv); });
  // Walking, tried in the preview: there and back across it.
  q('.m3d-wtry').addEventListener('click', () => {
    if (!q('.m3d-wclip').value) q('.m3d-wclip').value = q('.m3d-wclip').dataset.guess || [...q('.m3d-wclip').options][1]?.value || '';
    preview();
    const x = q('.m3d-view').clientWidth * 0.3, dur = 5000;
    mv.animate([{ translate: `${-x}px 0` }, { translate: `${x}px 0` }, { translate: `${-x}px 0` }], { duration: dur, easing: 'ease-in-out' });
    runtime.move(mv, dur, mv);
  });
  q('.m3d-wdraw').addEventListener('click', () => {
    if (!q('.m3d-wclip').value) q('.m3d-wclip').value = q('.m3d-wclip').dataset.guess || [...q('.m3d-wclip').options][1]?.value || '';
    q('.m3d-waddpath').checked = false;                        // (the drawing will be its path)
    apply(); commit(() => setSelection(b.id), { history: false }); startPathDraw();
  });
  q('.m3d-ok').addEventListener('click', () => apply());
  // A skeleton made here; then back to this dialog, with its new animations.
  q('.m3d-rig').addEventListener('click', () => { close(); openAutoRig(b, { onDone: () => { const x = currentSlide().blocks.find(y => y.id === b.id); if (x) openModel3D(x); } }); });
  function apply() {
    const c = current();
    commit(() => {
      const x = currentSlide().blocks.find(y => y.id === b.id); if (!x) return;
      x.autoRotate = c.autoRotate;
      for (const [k, v] of [['spin', c.spin !== 30 ? c.spin : null], ['clip', c.clip], ['clipOnce', c.clip && c.clipOnce], ['clipSpeed', c.clip && c.clipSpeed !== 1 ? c.clipSpeed : null], ['motion', c.motion !== 'none' ? c.motion : null], ['arrive', c.arrive !== 'keep' ? c.arrive : null]])
        if (v) x[k] = v; else delete x[k];
      if (c.walk) {
        x.walk = c.walk;
        if (!x.animation && q('.m3d-waddpath').checked)            // somewhere to walk to
          x.animation = { effect: 'path', order: animatedBlocks().length + 1, start: 'click', duration: 3000, delay: 0, dx: 480, dy: 0 };
      } else delete x.walk;
    });
    close();
  }
}
