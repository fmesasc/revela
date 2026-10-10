// «Más efectos…» (PowerPoint's More Entrance / Emphasis / Exit Effects): every effect, by kind and by PowerPoint's groups
// (Básicos, Sutiles, Moderados, Llamativos). Pointing at one plays it on the selected object, as PowerPoint's preview; a
// click chooses it — for the animation being edited (the ribbon) or as one more (Añadir animación).

import { FX, FX_GROUPS } from '../../features/animation/fxcatalog.js';
import { setAnimation, addAnimation, animsOf, animEditIndex, effectKind } from '../../features/animation/transitions.js';
import { selectedBlock } from '../../core/store.js';
import { stage } from '../canvas/canvas.js';
import { animateEl } from '../canvas/preview.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';

// Revela's first effects, in PowerPoint's groups too.
const OWN = {
  entrance: [['fade-in', 'Aparecer', 'gradient', 'Básicos'], ['fade-up', 'Flotar hacia dentro', 'arrow_upward', 'Sutiles'], ['zoom-in', 'Zoom', 'zoom_in', 'Sutiles'],
    ['spin', 'Crecer y girar', 'rotate_right', 'Moderados'], ['flip', 'Voltear', 'flip', 'Llamativos'], ['bounce', 'Rebotar', 'sports_basketball', 'Llamativos'], ['draw', 'Dibujar', 'draw', 'Moderados']],
  emphasis: [['grow', 'Agrandar', 'zoom_out_map', 'Básicos'], ['shrink', 'Encoger', 'close_fullscreen', 'Básicos'], ['spin360', 'Girar', 'autorenew', 'Básicos'],
    ['pulse', 'Latido', 'favorite', 'Sutiles'], ['color-pulse', 'Destello', 'flare', 'Sutiles'], ['teeter', 'Balanceo', 'vibration', 'Sutiles'], ['jump', 'Salto', 'keyboard_double_arrow_up', 'Moderados'],
    ['highlight-red', 'Resaltar', 'ink_highlighter', 'Básicos'], ['strike', 'Tachar', 'strikethrough_s', 'Básicos']],
  exit: [['fade-out', 'Desaparecer', 'visibility_off', 'Básicos'], ['semi-fade-out', 'Atenuar', 'opacity', 'Sutiles']],
};
const KINDS = [['entrance', 'Entrada'], ['emphasis', 'Énfasis'], ['exit', 'Salida']];
const listOf = kind => [...OWN[kind].map(([id, name, icon, group]) => ({ id, name, icon, group })),
  ...Object.values(FX).filter(f => f.kind === kind).map(f => ({ id: f.id, name: f.name, icon: f.icon, group: f.group }))];

export function openMoreEffects({ add = false } = {}) {
  if (document.getElementById('fx-modal')) return;
  const b = selectedBlock(), now = b && animsOf(b)[animEditIndex(b)];
  let kind = now ? (effectKind(now.effect) === 'path' ? 'entrance' : effectKind(now.effect)) : 'entrance';
  const back = document.createElement('div'); back.id = 'fx-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal fx-modal" role="dialog" aria-label="${esc(t('Más efectos'))}"><button class="modal-close" aria-label="${esc(t('Cerrar'))}">✕</button>
    <h3>${esc(t(add ? 'Añadir animación' : 'Más efectos'))}</h3>
    <div class="fx-tabs" role="tablist">${KINDS.map(([k, l]) => `<button type="button" role="tab" data-kind="${k}">${esc(t(l))}</button>`).join('')}</div>
    <div class="fx-list"></div>
    <p class="host-help">${esc(t(b ? 'Pasa el ratón por un efecto para verlo en el objeto seleccionado.' : 'Selecciona un objeto para verlo y aplicarlo.'))}</p></div>`;
  document.body.appendChild(back);
  const close = () => back.remove(), list = back.querySelector('.fx-list');
  const paint = () => {
    back.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.kind === kind)));
    const items = listOf(kind);
    list.innerHTML = FX_GROUPS.map(g => { const of = items.filter(x => x.group === g); return of.length ? `<div class="fx-sec"><b>${esc(t(g))}</b><div class="fx-items">`
      + of.map(x => `<button type="button" data-fx="${x.id}"${now?.effect === x.id ? ' class="on"' : ''}><i class="ms">${x.icon}</i><span>${esc(t(x.name))}</span></button>`).join('') + '</div></div>' : ''; }).join('');
  };
  paint();
  back.querySelector('.fx-tabs').addEventListener('click', e => { const k = e.target.closest('[data-kind]')?.dataset.kind; if (k) { kind = k; paint(); } });
  // (A taste on the object, as PowerPoint's live preview: played and undone.)
  let last = null;
  list.addEventListener('pointerover', e => {
    const id = e.target.closest('[data-fx]')?.dataset.fx; if (!id || id === last || !b) return; last = id;
    const el = stage.querySelector(`.block[data-id="${b.id}"]`); if (el && id !== 'draw') animateEl(el, { effect: id }, 700, 0);
  });
  list.addEventListener('click', e => {
    const id = e.target.closest('[data-fx]')?.dataset.fx; if (!id) return;
    if (add) addAnimation(id); else setAnimation(id);
    close();
  });
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  back.querySelector('[aria-selected="true"]')?.focus();
}
