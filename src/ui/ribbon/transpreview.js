// Hovering a transition in the ribbon shows what it looks like: a small
// preview that plays it, over and over, from the slide before to this one —
// the real presentation (same reveal.js page as when presenting), so every
// effect looks exactly as it will.

import { state, currentSlide } from '../../core/store.js';
import { buildHTML } from '../../io/formats/html.js';
import { t } from '../../i18n/index.js';
import { deckFg } from '../../features/design/palettes.js';

const STATIC = new Set(['text', 'shape', 'image', 'icon', 'chart', 'table', 'math', 'ink', 'connector', 'diagram', 'code']);   // (no live parts: polls, cameras, 3D, videos…)
let pop = null, timer = null, loop = null, url = null;

function slidesFor(value) {
  const deck = state.deck, cur = currentSlide(), vis = deck.slides.filter(s => !s.hidden), i = vis.indexOf(cur);
  const keep = s => ({ ...s, blocks: (s.blocks || []).filter(b => STATIC.has(b.type)), autoSlide: 0, notes: '', autoAnimate: false });
  const prev = i > 0 ? keep(vis[i - 1]) : { id: 'rv-prev', background: cur.background, blocks: [
    { id: 'rv-p', type: 'text', x: 0, y: deck.size.h / 2 - 60, w: deck.size.w, h: 120, fontSize: 64, textAlign: 'center', html: t('Diapositiva anterior'), color: deckFg(deck), opacity: 50 }] };
  return [{ ...prev, transition: 'none' }, { ...keep(cur), transition: value === 'inherit' ? null : value }];
}

export function hideTransitionPreview() {
  clearTimeout(timer); clearTimeout(loop); timer = loop = null;
  pop?.remove(); pop = null;
  if (url) { URL.revokeObjectURL(url); url = null; }
}

function show(btn) {
  hideTransitionPreview();
  const value = btn.dataset.slideTransition, deck = { ...state.deck, slides: slidesFor(value) };
  // (So small, reveal.js would turn into its scrolling view for phones, with no transitions.)
  const html = buildHTML(deck, { inApp: true }).replace('Reveal.initialize({', 'Reveal.initialize({ scrollActivationWidth: null,').replace('</head>',
    '<style>.reveal .controls,.reveal .progress,.reveal .slide-number,#ink-bar,#rv-class{display:none!important}</style></head>');
  url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  pop = document.createElement('div'); pop.id = 'trans-preview';
  pop.innerHTML = `<iframe title="${t('Vista previa de la transición')}" tabindex="-1"></iframe><span>${btn.querySelector('span')?.textContent || ''}</span>`;
  const f = pop.querySelector('iframe'); f.src = url; f.style.aspectRatio = `${state.deck.size.w} / ${state.deck.size.h}`;
  document.body.appendChild(pop);
  const r = btn.getBoundingClientRect(), W = pop.offsetWidth;
  pop.style.left = Math.max(8, Math.min(r.left + r.width / 2 - W / 2, innerWidth - W - 8)) + 'px';
  pop.style.top = (r.bottom + 8) + 'px';
  // Play it: this slide comes in with the effect; then back at once (no effect), and again.
  const me = pop;
  const cycle = () => {
    if (pop !== me) return;
    const w = f.contentWindow, R = w?.Reveal;
    if (!R?.isReady?.()) { loop = setTimeout(cycle, 120); return; }
    const secs = R.getSlides(), saved = secs.map(s => s.getAttribute('data-transition'));
    secs.forEach(s => s.setAttribute('data-transition', 'none'));
    R.slide(0);
    requestAnimationFrame(() => {
      secs.forEach((s, i) => { if (saved[i] == null) s.removeAttribute('data-transition'); else s.setAttribute('data-transition', saved[i]); });
      loop = setTimeout(() => {
        if (pop !== me) return;
        R.slide(1);
        const speed = { fast: 400, slow: 1200 }[secs[1].getAttribute('data-transition-speed') || deck.transitionSpeed] || 800;
        loop = setTimeout(cycle, speed + 1100);
      }, 500);
    });
  };
  cycle();
}

// Hover (not on touch screens: there a tap chooses it).
export function wireTransitionPreview(root = document) {
  root.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const btn = e.target.closest?.('[data-slide-transition]');
    if (!btn || btn.dataset.slideTransition === 'none') return;
    if (pop && pop.dataset.for === btn.dataset.slideTransition) return;
    clearTimeout(timer);
    timer = setTimeout(() => { show(btn); if (pop) pop.dataset.for = btn.dataset.slideTransition; }, 350);
  });
  root.addEventListener('pointerout', e => {
    const btn = e.target.closest?.('[data-slide-transition]');
    if (!btn || btn.contains(e.relatedTarget)) return;
    hideTransitionPreview();
  });
  root.addEventListener('pointerdown', () => { clearTimeout(timer); }, true);
}
