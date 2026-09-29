// 3D objects (model-viewer) and how they move:
// - the model's own animations (a robot dancing, a fox running…): which one
//   (clip; '*' = the first), looping or once, and its speed;
// - turning by itself (autoRotate) at a speed and direction (spin, °/s);
// - a camera movement when its slide appears (motion): swing, zoom in, a full
//   turn, float up and down, or look from above.
// - walking (walk): while the object moves on the slide (its motion path, or
//   any animation of it) one clip plays — "Walk" — and it turns towards where
//   it goes; on arrival another clip (once, then back to rest, or for good)
//   and, if wanted, it turns to face the audience.
// The same attributes are used in the editor and in the exported presentation;
// the camera movements and walking run with io/runtime/model3d.js (embedded as source).

import { readModel, writeGLB } from './gltf.js';

export const MOTIONS_3D = [
  ['none', 'Ninguno'], ['swing', 'Balanceo'], ['zoom', 'Acercar al entrar'], ['orbit', 'Vuelta completa al entrar'],
  ['float', 'Flotar'], ['top', 'Desde arriba al entrar'],
];

// Where the camera looks from (PowerPoint's "3D model views").
export const VIEWS_3D = [['', 'Libre'], ['front', 'De frente'], ['three', 'Tres cuartos'], ['side', 'De lado'], ['back', 'Por detrás'], ['top', 'Desde arriba'], ['low', 'Desde abajo']];
const ORBITS = { front: '0deg 75deg auto', three: '35deg 70deg auto', side: '90deg 75deg auto', back: '180deg 75deg auto', top: '0deg 8deg auto', low: '20deg 115deg auto' };

// model-viewer attributes for a block, as [name, value] pairs ('' = boolean).
export function modelAttrs(b) {
  const a = [['src', b.src || ''], ['camera-controls', ''], ['shadow-intensity', '1'], ['interaction-prompt', 'none']];
  if (ORBITS[b.view]) a.push(['camera-orbit', ORBITS[b.view]]);
  const walk = b.walk?.clip ? b.walk : null;
  if (b.autoRotate !== false && (b.motion || 'none') === 'none' && !walk) {
    a.push(['auto-rotate', ''], ['auto-rotate-delay', '0']);
    if (b.spin) a.push(['rotation-per-second', `${b.spin}deg`]);
  }
  if (b.clip) {
    a.push(['autoplay', '']);
    if (b.clip !== '*') a.push(['animation-name', b.clip]);
    if (b.clipOnce) a.push(['data-once', '']);
    if (b.clipSpeed && b.clipSpeed !== 1) a.push(['data-speed', String(b.clipSpeed)]);
  }
  if (walk) {
    if (!b.clip && walk.clip !== '*') a.push(['animation-name', walk.clip]);          // still, on its first frame, until it moves
    a.push(['data-move-clip', walk.clip], ['animation-crossfade-duration', '350']);
    if (walk.end) a.push(['data-end-clip', walk.end]);
    if (walk.end && walk.endOnce) a.push(['data-end-once', '']);
    if (walk.face !== false) a.push(['data-face', '']);
    if (walk.look !== false) a.push(['data-look', '']);
  }
  if (b.motion && b.motion !== 'none') a.push(['data-motion', b.motion]);
  return a;
}
export const modelAttrsHTML = b => modelAttrs(b).map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)).join('');


// The model as a file to keep: one .glb with everything in it (meshes,
// textures, animations). A .gltf with its data inside becomes a .glb too.
export async function modelFile(b) {
  const name = (String(b.alt || b.caption || 'modelo').split(' — ')[0].replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'modelo') + '.glb';
  let src = b.src || '';
  if (!/^data:model\/gltf-binary/.test(src)) src = writeGLB(await readModel(src));
  const bin = atob(src.slice(src.indexOf(',') + 1)), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return { blob: new Blob([u8], { type: 'model/gltf-binary' }), name };
}
