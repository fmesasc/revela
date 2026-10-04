// "Probar" for a 3D model that follows the camera: the model on the editor's
// slide moves with you, with a small panel (your picture, what is happening,
// "Detener"). The camera is the editor's one (shared with Cameo's "Ver en
// directo") and is let go on stopping or on leaving the slide. Same engine as
// the presentation (io/runtime/puppet.js); nothing leaves the browser.

import { createPuppet } from '../../io/runtime/puppet.js';
import { VISION, POSE_MODEL, FACE_MODEL } from '../../core/vendor.js';
import { commit, currentSlide } from '../../core/store.js';
import { PUPPET_DEFAULT } from '../../features/content/model3d.js';
import { cameraEngine } from './cameraview.js';
import { t } from '../../i18n/index.js';

// What the engine says, in words (the ones about the model stay below the others).
const SAYS = {
  camera: 'Pidiendo permiso para usar la cámara…',
  loading: 'Preparando el seguimiento (la primera vez tarda un poco)…',
  tracking: 'Ponte delante de la cámara.',
  seen: 'Te sigo: muévete y el modelo se moverá contigo.',
  lost: 'No te veo: ponte delante de la cámara, con los hombros a la vista.',
  nocamera: 'No se pudo usar la cámara (sin permiso o sin cámara): el modelo se queda como estaba.',
  noload: 'No se pudo cargar el seguimiento (¿sin conexión?): el modelo se queda como estaba.',
  nowebgl: 'Este navegador no puede mostrar 3D (WebGL): el modelo se queda como estaba.',
  noscene: 'Este modelo no se puede mover con la cámara: se queda como estaba.',
};
const ABOUT = {
  whole: 'Este modelo no tiene un esqueleto que Revela reconozca: se moverá entero, siguiendo tu cabeza y tus hombros.',
  headonly: 'Este modelo no tiene brazos que Revela reconozca: solo sigue tu cabeza.',
};
const FAILED = new Set(['nocamera', 'noload', 'nowebgl', 'noscene']);

let engine = null, trying = null, mv = null, panel = null;
export const puppetTrying = () => trying;

function ensure() {
  return engine ||= createPuppet({ vision: VISION, pose: POSE_MODEL, face: FACE_MODEL, camera: cameraEngine(), status: (code, el) => {
    if (!panel) return;
    if (ABOUT[code]) { panel.querySelector('.pp-about').textContent = t(ABOUT[code]); return; }
    if (!SAYS[code]) return;
    panel.querySelector('.pp-say').textContent = t(SAYS[code]);
    panel.classList.toggle('failed', FAILED.has(code));
    if (FAILED.has(code)) { engine.stop(); trying = null; mv = null; panel.querySelector('.pp-video').hidden = true; commit(() => {}, { history: false }); }
  } });
}
// On/off (with the usual options: the body, like a mirror, no picture of you).
export const togglePuppet = b => commit(() => {
  const x = currentSlide().blocks.find(y => y.id === b.id); if (!x) return;
  if (x.puppet) delete x.puppet; else x.puppet = { ...PUPPET_DEFAULT };
});
const blockMV = id => document.querySelector(`#stage .block[data-id="${id}"] model-viewer`);
const item = (el, b) => ({ mv: el, ...PUPPET_DEFAULT, ...b.puppet });

// Start (or stop, if it is on) trying the model b.
export function tryPuppet(b) {
  if (trying === b.id) return stopPuppet();
  stopPuppet();
  const el = blockMV(b.id); if (!el) return;
  trying = b.id; mv = el;
  panel = document.createElement('div'); panel.id = 'puppet-panel';
  panel.innerHTML = `<video class="pp-video" muted playsinline></video><div class="pp-text"><b>${t('Controlar con la cámara')}</b>
    <span class="pp-say"></span><span class="pp-about"></span><small>${t('Todo ocurre en tu navegador: la imagen de la cámara no sale de tu equipo.')}</small></div>
    <button type="button" class="mini2 pp-stop"><i class="ms">stop_circle</i> ${t('Detener')}</button>`;
  panel.querySelector('.pp-stop').addEventListener('click', () => stopPuppet());
  document.body.appendChild(panel);
  const it = item(el, b), e = ensure();
  // (Your picture: the engine's own video, as you see yourself if it mirrors.)
  const v = e.video(); v.className = 'pp-video'; v.style.transform = it.mirror ? 'scaleX(-1)' : '';
  panel.querySelector('.pp-video').replaceWith(v);
  e.show([it]);
  commit(() => {}, { history: false });
}
export function stopPuppet() {
  const was = trying;
  engine?.stop(); trying = null; mv = null;
  panel?.remove(); panel = null;
  if (was) commit(() => {}, { history: false });
}
// After each drawing of the slide: still there (and the same element)? Else stop; options changed: follow them.
export function syncPuppet(stage, slide) {
  if (!trying) return;
  const b = slide.blocks.find(x => x.id === trying && x.type === 'model');
  const el = b && stage.querySelector(`.block[data-id="${trying}"] model-viewer`);
  if (!el) return stopPuppet();
  const it = item(el, b);
  if (el !== mv) mv = el;
  engine.show([it]);
  const v = engine.video(); v.style.transform = it.mirror ? 'scaleX(-1)' : '';
}
