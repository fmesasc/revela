// Canvas zoom (status bar and View tab); fits the slide on small screens.

import { state } from '../../core/store.js';

const $ = s => document.querySelector(s);

export function applyZoom() {
  const z = state.ui.zoom || 1;
  const g = document.getElementById('stage-grid');
  const sizer = document.getElementById('stage-sizer');
  if (g) { g.style.transform = `scale(${z})`; g.style.setProperty('--hz', (1 / z).toFixed(4)); }  // handles keep their on-screen size
  if (sizer) {
    // Footprint from the deck size (deterministic; offsetWidth can be 0 mid‑render).
    const rw = state.ui.showRuler ? 20 : 0;
    sizer.style.width = ((state.deck.size.w + rw) * z) + 'px';
    sizer.style.height = ((state.deck.size.h + rw) * z) + 'px';
  }
  const lbl = document.getElementById('zoom-label');
  if (lbl) lbl.textContent = Math.round(z * 100) + '%';
}
export function setZoom(z) {
  state.ui.zoom = Math.max(0.2, Math.min(3, Math.round(z * 100) / 100));
  applyZoom();
}
export function fitZoom() {
  const wrap = document.getElementById('canvas-wrap');
  const { w, h } = state.deck.size;
  const z = Math.min((wrap.clientWidth - 56) / w, (wrap.clientHeight - 56) / h);
  setZoom(z);
}
