// 3D objects (model-viewer) and how they move:
// - the model's own animations (a robot dancing, a fox running…): which one
//   (clip; '*' = the first), looping or once, and its speed;
// - turning by itself (autoRotate) at a speed and direction (spin, °/s);
// - a camera movement when its slide appears (motion): swing, zoom in, a full
//   turn, float up and down, or look from above.
// - following the person in front of the camera (puppet), see PUPPET_MODES;
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

// Room around the model (bleed): model-viewer frames it standing still, so a
// robot waving or a dancer would put a hand outside its box and lose it. The 3D
// view is drawn this many times bigger than the box, around the same centre,
// with the camera as much further away: the model looks the same size, and
// what goes out of the box still shows. By default, for models that move (or follow the camera).
export const BLEEDS_3D = [['1', 'Ninguno'], ['1.3', 'Poco'], ['1.5', 'Normal'], ['2', 'Mucho']];
// Its edges when the model reaches them (turning, zooming in): cut straight, faded
// out, or no cut — the view takes much more room (three times the box) around it.
export const EDGES_3D = [['hard', 'Corte recto'], ['fade', 'Difuminado'], ['free', 'Sin corte (más espacio)']];
export const modelBleed = b => {
  const k = b.bleed != null ? Math.max(1, Math.min(3, +b.bleed || 1)) : (b.clip || b.walk?.clip || b.puppet) ? 1.5 : 1;   // (raised arms too)
  return b.edge === 'free' ? Math.max(k, 3) : k;
};
// A faded edge: the view fades out over its last 12 % on every side.
export const EDGE_FADE_CSS = '-webkit-mask-image:linear-gradient(to right,transparent,#000 12%,#000 88%,transparent),linear-gradient(to bottom,transparent,#000 12%,#000 88%,transparent);'
  + '-webkit-mask-composite:source-in;mask-image:linear-gradient(to right,transparent,#000 12%,#000 88%,transparent),linear-gradient(to bottom,transparent,#000 12%,#000 88%,transparent);mask-composite:intersect;';
export const edgeCSS = b => (b.edge === 'fade' || b.edge === 'free' ? EDGE_FADE_CSS : '');
// When the same model was on the slide before (Morph, or the same file): how it
// arrives — as it was (its angle and its turning carry on), turning to face the
// audience, going to this slide's camera view, taking a full turn on the way,
// or starting afresh as if it were new.
export const ARRIVALS_3D = [['keep', 'Seguir como estaba'], ['front', 'Girar hasta quedar de frente'], ['view', 'Ir a la vista de esta diapositiva'], ['turn', 'Dar una vuelta hasta su vista'], ['reset', 'Empezar de cero']];
// The camera's distance for a bleed (model-viewer's own is 105 % of the fitting one).
export const bleedRadius = k => (k === 1 ? 'auto' : `${Math.round(105 * k)}%`);
// The box the 3D view takes on the slide.
export function bleedBox(b) {
  const k = modelBleed(b); if (k === 1) return b;
  return { ...b, x: Math.round(b.x - (k - 1) * b.w / 2), y: Math.round(b.y - (k - 1) * b.h / 2), w: Math.round(b.w * k), h: Math.round(b.h * k) };
}

// model-viewer attributes for a block, as [name, value] pairs ('' = boolean).
export function modelAttrs(b) {
  const a = [['src', b.src || ''], ['camera-controls', ''], ['shadow-intensity', '1'], ['interaction-prompt', 'none']];
  const k = modelBleed(b), r = bleedRadius(k);
  // (Without a limit of its own, model-viewer never takes the camera further than its fitting distance.)
  a.push(['max-camera-orbit', `auto auto ${Math.round(320 * k)}%`]);
  if (ORBITS[b.view] || k > 1) a.push(['camera-orbit', (ORBITS[b.view] || '0deg 75deg auto').replace(/auto$/, r)]);
  if (k > 1) a.push(['data-bleed', String(k)]);
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
  if (b.arrive && b.arrive !== 'keep') a.push(['data-arrive', b.arrive]);
  if (b.puppet) {
    a.push(['data-puppet', b.puppet.mode === 'head' ? 'head' : 'body']);
    if (b.puppet.mirror === false) a.push(['data-puppet-mirror', '0']);
    if (b.puppet.preview) a.push(['data-puppet-preview', '']);
  }
  return a;
}
// "Controlar con la cámara" (b.puppet = { mode, mirror, preview }): the model
// moves with the person in front of the camera — the whole upper body (arms,
// torso, head) or only the head; like a mirror or not; the presenter's own
// picture small in a corner or not. Runs with io/runtime/puppet.js, in the browser.
export const PUPPET_MODES = [['body', 'Todo el cuerpo'], ['head', 'Solo la cabeza']];
export const PUPPET_DEFAULT = { mode: 'body', mirror: true, preview: false };
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
