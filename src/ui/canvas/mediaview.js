// Videos and GIFs with a colour key in the editor: drawn by the same player
// as the presentation, so what is seen here is what will be seen there.

import { blobURL } from '../../io/formats/blobmedia.js';
import { createMediaPlayer } from '../../io/runtime/media.js';
import { mediaKind } from '../../features/live/media.js';
import { GIFUCT } from '../../core/vendor.js';

export const keyedView = b => !!(mediaKind(b) && b.key?.color);
const sigOf = b => JSON.stringify([b.src, b.fit || 'contain', b.key || null]);

export function mediaView(b) {
  const d = document.createElement('div');
  d.className = 'media-player'; d.style.cssText = 'width:100%;height:100%';
  d.dataset.sig = sigOf(b);
  d._player = createMediaPlayer(d, { kind: mediaKind(b), src: blobURL(b.src), fit: b.fit || 'contain', muted: !!b.muted, loop: !!b.loop, key: b.key, gifLib: GIFUCT });
  d._player.ready.then(p => p.error && d.classList.add('media-error'));
  return d;
}

// Whether the element still matches the block (same kind of view and source).
export function mediaViewCurrent(el, b) {
  const v = el.querySelector(':scope > .media-player');
  return keyedView(b) ? !!v && v.dataset.sig === sigOf(b) : !v;
}

export const playerOf = id => document.querySelector(`.block[data-id="${id}"] .media-player`)?._player || null;

// "Play in the editor": the player when there is one, else the <video>.
export function playInEditor(id) {
  const p = playerOf(id);
  if (p) return p.ready.then(() => (p.playing() ? p.pause() : p.play(0, null)));
  const v = document.querySelector(`.block[data-id="${id}"] video`);
  if (v) v.paused ? v.play().catch(() => {}) : v.pause();   // the browser may refuse to play (no sound allowed yet)
}

// A video's (or GIF's) own step, in the editor's preview of the animations: play, pause, stop.
export function mediaStepInEditor(id, fx) {
  const p = playerOf(id);
  if (p) return p.ready.then(() => (fx === 'media-play' ? p.play(p.duration() && p.time() >= p.duration() - 0.05 ? 0 : null, null) : fx === 'media-pause' ? p.pause() : p.seek(0)));
  const v = document.querySelector(`.block[data-id="${id}"] video`); if (!v) return;
  if (fx === 'media-play') v.play().catch(() => {}); else { v.pause(); if (fx === 'media-stop') v.currentTime = 0; }
}

// A 3D model's own animations (its clips), once the model on the slide has loaded.
export const modelClips = id => [...(document.querySelector(`#stage .block[data-id="${id}"] model-viewer`)?.availableAnimations || [])];
