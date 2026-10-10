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

// ---- Morph (Transformar): what each way of matching does, on a sample ----
// Objects: a box glides and grows to its new place; words: «Revela hace presentaciones» rearranges itself word by word;
// characters: the letters of «ROMA» travel to spell «AMOR». The pieces are measured in both layouts and animated
// between them (as reveal.js does when presenting).
const MORPH_SAMPLES = { words: ['Revela hace presentaciones', 'presentaciones hace Revela'], chars: ['ROMA', 'AMOR'] };
const MORPH_NAMES = { objects: 'Objetos', words: 'Palabras', chars: 'Caracteres' };
const MORPH_HELP = { objects: 'Lo que está en las dos diapositivas se desplaza y cambia de tamaño', words: 'Cada palabra viaja a su sitio en la frase nueva',
  chars: 'Cada letra viaja a su sitio en la palabra nueva' };
function tokens(text, by) {
  const seen = {};
  return (by === 'chars' ? [...text] : text.split(/(\s+)/)).map(p => {
    if (!p.trim()) return { space: p };
    seen[p] = (seen[p] || 0) + 1; return { key: p + '#' + seen[p], text: p };
  });
}
export function showMorphDemo(anchor, mode = 'objects') {
  hideEffectDemo();
  if (!anchor?.isConnected) return null;
  card = document.createElement('div'); card.id = 'fx-demo'; card.className = 'fx-demo fx-morph'; card.setAttribute('aria-hidden', 'true');
  card.innerHTML = `<div class="fxd-stage"></div><div class="fxd-cap"><b>${esc(t('Transformar'))} · ${esc(t(MORPH_NAMES[mode] || mode))}</b><small>${esc(t(MORPH_HELP[mode] || ''))}</small></div>`;
  document.body.appendChild(card);
  const r = anchor.getBoundingClientRect(), W = card.offsetWidth, H = card.offsetHeight;
  card.style.left = Math.max(8, Math.min(r.left + r.width / 2 - W / 2, innerWidth - W - 8)) + 'px';
  card.style.top = (r.bottom + 8 + H > innerHeight ? Math.max(8, r.top - H - 8) : r.bottom + 8) + 'px';
  const stage = card.querySelector('.fxd-stage'), me = card;
  stage.style.position = 'relative';
  if (mode === 'objects') {
    stage.innerHTML = '<div class="fxd-box"></div>';
    const box = stage.querySelector('.fxd-box');
    const play = () => { if (card !== me) return;
      box.animate([{ transform: 'translate(-58px,18px) scale(.7)', borderRadius: '50%' }, { transform: 'translate(-58px,18px) scale(.7)', borderRadius: '50%', offset: 0.25 },
        { transform: 'translate(52px,-14px) scale(1.15)', borderRadius: '6px', offset: 0.75 }, { transform: 'translate(52px,-14px) scale(1.15)', borderRadius: '6px' }], { duration: 2200, easing: 'ease-in-out' });
      loop = setTimeout(play, 2400); };
    play(); return card;
  }
  const [a, b] = MORPH_SAMPLES[mode], ta = tokens(a, mode), tb = tokens(b, mode);
  const lay = list => { const d = document.createElement('div'); d.className = 'fxd-line' + (mode === 'chars' ? ' big' : '');
    d.innerHTML = list.map(x => (x.space ? x.space.replace(/ /g, '&nbsp;') : `<span data-k="${esc(x.key)}">${esc(x.text)}</span>`)).join(''); d.style.visibility = 'hidden'; stage.appendChild(d); return d; };
  const A = lay(ta), B = lay(tb), sr = stage.getBoundingClientRect();
  const pos = (box, k) => { const e = box.querySelector(`[data-k="${CSS.escape(k)}"]`).getBoundingClientRect(); return [e.left - sr.left, e.top - sr.top]; };
  const live = ta.filter(x => x.key).map(x => {
    const s = document.createElement('span'); s.className = 'fxd-tok' + (mode === 'chars' ? ' big' : ''); s.textContent = x.text; stage.appendChild(s);
    const p = pos(A, x.key), q = pos(B, x.key); s.style.left = p[0] + 'px'; s.style.top = p[1] + 'px'; return [s, q[0] - p[0], q[1] - p[1]];
  });
  A.remove(); B.remove();
  const play = () => { if (card !== me) return;
    live.forEach(([s, dx, dy]) => s.animate([{ transform: 'none' }, { transform: 'none', offset: 0.25 }, { transform: `translate(${dx}px,${dy}px)`, offset: 0.75 }, { transform: `translate(${dx}px,${dy}px)` }],
      { duration: 2400, easing: 'ease-in-out' }));
    loop = setTimeout(play, 2700); };
  play();
  return card;
}
// Pointing at «Transformar» or its options: the example of the one shown; choosing another: its example for a moment.
export function wireMorphDemos(root = document) {
  root.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest?.('#ribbon [data-morphby], #ribbon [data-action="toggle-autoanimate"]'); if (!el || el === over) return;
    over = el; clearTimeout(timer);
    timer = setTimeout(() => { if (over === el && el.isConnected) showMorphDemo(el, el.matches('[data-morphby]') ? el.value || 'objects' : 'objects'); }, 250);
  });
  root.addEventListener('pointerout', e => {
    const el = e.target.closest?.('#ribbon [data-morphby], #ribbon [data-action="toggle-autoanimate"]');
    if (el && el === over && !el.contains(e.relatedTarget)) { over = null; hideEffectDemo(); }
  });
  root.addEventListener('change', e => {
    const el = e.target.closest?.('#ribbon [data-morphby]'); if (!el) return;
    over = null; const c = showMorphDemo(el, el.value); setTimeout(() => { if (card === c) hideEffectDemo(); }, 5000);
  });
}
