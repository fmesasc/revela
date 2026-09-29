// Animation preview in the editor (Animations ▸ Preview): plays the slide's
// entrance, emphasis and exit effects in order on the canvas.

import { currentSlide } from '../../core/store.js';
import { animTimeline, EFFECT_KF, motionPoints } from '../../features/animation/transitions.js';
import { stage } from './canvas.js';
import { model3dRuntime } from '../../features/content/model3d.js';

let models3d = null;                              // walking 3D models (their clip while they move)
function walkIn(el, dur, delay) {
  const mv = el.querySelector('model-viewer[data-move-clip]'); if (!mv) return;
  models3d ||= model3dRuntime();
  setTimeout(() => models3d.move(mv, dur, el), delay);
}

// ---- Animation preview -----------------------------------------------------
export const KEYFRAME = EFFECT_KF;
export function animateEl(el, anim, dur, delay) {
  const effect = anim.effect;
  if (effect === 'path') {                        // motion path: slide to (dx, dy) and back
    el.animate(motionPoints(anim).map(([x, y]) => ({ translate: `${x}px ${y}px` })),
      { duration: dur, delay, easing: 'ease-in-out', fill: 'none' });
    walkIn(el, dur, delay);
    return;
  }
  const kf = KEYFRAME[effect] || 'rvIn';
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = `${kf} ${dur}ms ease ${delay}ms both`;
  walkIn(el, dur, delay);
  const done = () => { el.style.animation = ''; el.removeEventListener('animationend', done); };
  el.addEventListener('animationend', done);
}
// Play the slide's entrance animations in order, in the editor.
export function playAnimations() {
  // Clicks play one after another; inside a click, the timeline gives each start.
  const tl = animTimeline(currentSlide());
  const ends = new Map();                       // step → when it finishes
  for (const { step, delay, dur } of tl.values()) ends.set(step, Math.max(ends.get(step) || 0, delay + dur));
  const offset = new Map(); let acc = 0;
  for (const st of [...ends.keys()].sort((a, b) => a - b)) { offset.set(st, acc); acc += ends.get(st); }
  for (const [id, { step, delay, dur }] of tl) {
    const b = currentSlide().blocks.find(x => x.id === id);
    const el = stage.querySelector(`.block[data-id="${id}"]`);
    if (el && b) animateEl(el, b.animation, dur, offset.get(step) + delay);
  }
}
