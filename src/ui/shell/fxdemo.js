// An effect's example: pointing at an animation effect anywhere (the ribbon's gallery, «Añadir animación», «Más
// efectos…»), a small card by it plays the effect over and over on a sample — a little slide with a title, a line of
// text and a shape — with its name and kind, so an unfamiliar one («Cuña», «Revelación en negrita», «Molinete») is
// recognised at a glance, with or without an object selected. (The selected object plays it too: livepreview.js.)
// Not on touch screens: there a tap chooses.

import { animateEl } from '../canvas/preview.js';
import { FX } from '../../features/animation/fxcatalog.js';
import { effectKind } from '../../features/animation/transitions.js';
import { EFFECT_LABEL } from '../panels/animation.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';

const KIND = { entrance: 'Entrada', emphasis: 'Énfasis', exit: 'Salida', path: 'Trayectoria' };
const SKIP = k => !k || /^(pdf:|clip:|media-|more$)/.test(k) || k === 'draw';
let card = null, loop = null, timer = null, over = null;

export function hideEffectDemo() { clearTimeout(loop); clearTimeout(timer); loop = timer = null; card?.remove(); card = null; }

// The card for effect `effect` next to `anchor` (opts: a.dir, a.color — the variant to show).
export function showEffectDemo(anchor, effect, opts = {}) {
  hideEffectDemo();
  if (SKIP(effect) || !anchor?.isConnected) return null;
  const kind = effectKind(effect), f = FX[effect];
  card = document.createElement('div'); card.id = 'fx-demo'; card.className = 'fx-demo'; card.setAttribute('aria-hidden', 'true');
  card.innerHTML = `<div class="fxd-stage"><div class="fxd-obj"><b>${esc(t('Título'))}</b><span>${esc(t('Texto de ejemplo'))}</span>`
    + `<svg viewBox="0 0 40 24" width="40" height="24"><rect x="1" y="1" width="38" height="22" rx="5" fill="#5b8def" stroke="#2e5fb8" stroke-width="2"/></svg></div></div>`
    + `<div class="fxd-cap"><b>${esc(EFFECT_LABEL(effect))}</b><small>${esc(t(KIND[kind] || ''))}${f?.group ? ' · ' + esc(t(f.group)) : ''}</small></div>`;
  document.body.appendChild(card);
  const r = anchor.getBoundingClientRect(), W = card.offsetWidth, H = card.offsetHeight;
  card.style.left = Math.max(8, Math.min(r.left + r.width / 2 - W / 2, innerWidth - W - 8)) + 'px';
  card.style.top = (r.bottom + 8 + H > innerHeight ? Math.max(8, r.top - H - 8) : r.bottom + 8) + 'px';
  const obj = card.querySelector('.fxd-obj'), me = card;
  const anim = { effect, ...opts, ...(effect === 'path' && { dx: 60, dy: 0 }) };
  const play = () => {
    if (card !== me) return;
    // (An exit starts seen and ends hidden; an entrance the other way round: either way, shown again between loops.)
    obj.getAnimations().forEach(a => a.cancel()); obj.style.animation = '';
    animateEl(obj, anim, effect === 'path' ? 1200 : 900, 250);
    loop = setTimeout(play, 2300);
  };
  play();
  return card;
}

// Hover, delegated (the galleries are drawn when opened).
const ITEMS = '#ribbon [data-animation], #anim-add-menu [data-add], #fx-modal [data-fx]';
const effectOf = el => el.dataset.animation || el.dataset.add || el.dataset.fx;
export function wireEffectDemos(root = document) {
  root.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest?.(ITEMS); if (!el || el === over) return;
    over = el; clearTimeout(timer);
    timer = setTimeout(() => { if (over === el && el.isConnected) showEffectDemo(el, effectOf(el)); }, 200);
  });
  root.addEventListener('pointerout', e => {
    const el = e.target.closest?.(ITEMS);
    if (el && el === over && !el.contains(e.relatedTarget)) { over = null; hideEffectDemo(); }
  });
  root.addEventListener('pointerdown', () => { over = null; hideEffectDemo(); }, true);
  root.addEventListener('keydown', e => { if (e.key === 'Escape') hideEffectDemo(); }, true);
}
