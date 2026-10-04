// The live camera (Cameo) on the editor's slide: a placeholder with its look
// (shape, background, the effect's name) or, with "Ver en directo", the camera
// itself, drawn by the same engine as the presentation (io/runtime/camera.js).
// The camera is asked for only while that is on and the slide has one.

import { createCameraEngine } from '../../io/runtime/camera.js';
import { VISION, SELFIE_MODEL } from '../../core/vendor.js';
import { commit } from '../../core/store.js';
import { cameraBoxCSS, cameraInnerHTML, cameraSegment, cameraSig, CAMERA_FILTERS, CAMERA_BACKGROUNDS, setCameraLook, blobToDataURL } from '../../features/live/media.js';
import { t } from '../../i18n/index.js';

let live = false, engine = null;
export const cameraLive = () => live;
export function setCameraLive(on) {
  live = !!on;
  if (!live) engine?.show([]);   // (let go, unless a model following the camera is being tried)
  commit(() => {}, { history: false });
}

const labelOf = (list, v) => list.find(([k]) => k === (v || ''))?.[1];
export function cameraView(b) {
  const d = document.createElement('div');
  d.className = 'camera-blk' + (live ? ' live' : '');
  d.dataset.sig = cameraSig(b) + live;
  d.style.cssText = cameraBoxCSS(b);
  if (live) {
    d.setAttribute('data-camera-box', '');
    if (cameraSegment(b)) d.dataset.bg = cameraSegment(b);
    d.innerHTML = cameraInnerHTML(b);
  } else {
    const fx = [b.bg && labelOf(CAMERA_BACKGROUNDS, b.bg), b.filter && labelOf(CAMERA_FILTERS, b.filter)].filter(Boolean).map(x => t(x)).join(' · ');
    d.innerHTML = `<i class="ms">videocam</i><span>${t('Cámara en directo')}</span>${fx ? `<small>${fx}</small>` : ''}`;
    if (b.bg === 'remove') d.classList.add('cut');
  }
  return d;
}
// Whether the element still shows the block as it is (else it is made again).
export function cameraViewCurrent(el, b) {
  const d = el.querySelector(':scope > .camera-blk');
  if (!d || d.dataset.sig !== cameraSig(b) + live) return false;
  const c = d.querySelector('canvas'), w = Math.max(1, Math.round(b.w)), h = Math.max(1, Math.round(b.h));
  if (c && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; }   // (resized: at its size)
  return true;
}
// After each drawing of the slide: the cameras on it, live or not.
export function syncCameras(stage) {
  const boxes = live ? [...stage.querySelectorAll('.camera-blk[data-camera-box]')] : [];
  if (!boxes.length) { engine?.show([]); return; }
  cameraEngine().show(boxes);
}
// The editor's one camera, also for trying a model that follows it (puppetview.js).
export const cameraEngine = () => (engine ||= createCameraEngine({ vision: VISION, model: SELFIE_MODEL, keep: false }));

// Choosing "Imagen de fondo" asks for the picture (if it has none yet).
export function pickCameraImage(b) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => { const f = inp.files[0]; if (f) setCameraLook(b.id, { bg: 'image', bgImage: await blobToDataURL(f) }); };
  inp.click();
}
export function setCameraBackground(b, v) {
  if (v === 'image' && !b.bgImage) return pickCameraImage(b);
  setCameraLook(b.id, { bg: v });
}
