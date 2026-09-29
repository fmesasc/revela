// Animation pane: the slide's effects in order, with timing, triggers and
// reordering (PowerPoint's Animation Pane).

import { currentSlide, commit, setSelection } from '../../core/store.js';
import * as trans from '../../features/animation/transitions.js';
import * as poll from '../../features/live/poll.js';
import { playAnimations } from '../canvas/preview.js';
import { startPathDraw } from '../canvas/pathdraw.js';
import { t } from '../../i18n/index.js';

const $ = s => document.querySelector(s);

export const ANIM_EFFECTS = ['fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in',
  'spin', 'flip', 'bounce', 'grow', 'shrink', 'strike', 'fade-out', 'semi-fade-out', 'fade-in-then-out', 'fade-in-then-semi-out',
  'current-visible', 'highlight-red', 'highlight-green', 'highlight-blue', 'highlight-current-red', 'highlight-current-green',
  'highlight-current-blue', 'path'];
// Readable names (reveal.js fragment styles and Revela's own effects).
export const EFFECT_NAMES = { 'fade-in': 'Aparecer', 'fade-up': 'Subir', 'fade-down': 'Bajar', 'fade-left': 'Desde la derecha',
  'fade-right': 'Desde la izquierda', 'zoom-in': 'Zoom', spin: 'Girar', flip: 'Voltear', bounce: 'Rebotar', grow: 'Agrandar',
  shrink: 'Encoger', strike: 'Tachar', 'fade-out': 'Desaparecer', 'semi-fade-out': 'Atenuar', 'fade-in-then-out': 'Aparecer y desaparecer',
  'fade-in-then-semi-out': 'Aparecer y atenuar', 'current-visible': 'Visible solo en su paso', 'highlight-red': 'Resaltar en rojo',
  'highlight-green': 'Resaltar en verde', 'highlight-blue': 'Resaltar en azul', 'highlight-current-red': 'Rojo solo en su paso',
  'highlight-current-green': 'Verde solo en su paso', 'highlight-current-blue': 'Azul solo en su paso', path: 'Trayectoria' };
export const EFFECT_LABEL = e => t(EFFECT_NAMES[e] || e);
// Short label of an object for the trigger list.
export function objLabel(b) {
  const txt = b.type === 'text' ? (new DOMParser().parseFromString(b.html || '', 'text/html').body.textContent || '').trim().slice(0, 24) : '';
  return t(ANIM_NAMES[b.type] || b.type) + (txt ? ` «${txt}»` : '');
}
export const ANIM_NAMES = { poll: 'Votación', camera: 'Cámara en directo', ink: 'Tinta', text: 'Texto', image: 'Imagen', shape: 'Forma', chart: 'Gráfico', table: 'Tabla',
  icon: 'Icono', math: 'Ecuación', model: '3D', video: 'Vídeo', embed: 'Web', code: 'Código', figindex: 'Índice de figuras', slideref: 'Diapositiva' };
export function openAnimPanel() {
  if (document.getElementById('anim-modal')) return;
  const back = document.createElement('div');
  back.id = 'anim-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:460px;max-width:96vw;max-height:80vh;overflow:auto">
    <button class="modal-close">✕</button><h3>${t('Panel de animación')}</h3>
    <div class="fr-actions" style="justify-content:flex-start;margin-bottom:8px"><button class="fr-do an-play">▶ ${t('Reproducir')}</button></div>
    <div class="an-body"></div></div>`;
  document.body.appendChild(back);
  const body = back.querySelector('.an-body');
  back.querySelector('.an-play').addEventListener('click', () => playAnimations());
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const render = () => {
    const list = trans.animatedBlocks();
    body.innerHTML = list.length ? list.map((b, i) => `
      <div class="an-row" data-id="${b.id}">
        <div class="an-title">${i + 1}. ${t(ANIM_NAMES[b.type] || b.type)}</div>
        <div class="an-grid">
          <label>${t('Efecto')}<select data-p="effect">${ANIM_EFFECTS.map(e => `<option value="${e}"${b.animation.effect === e ? ' selected' : ''}>${EFFECT_LABEL(e)}</option>`).join('')}</select></label>
          <label>${t('Comienzo')}<select data-p="start">${[['click', 'Al hacer clic'], ['withPrev', 'Con la anterior'], ['afterPrev', 'Después de la anterior']]
            .map(([v, l]) => `<option value="${v}"${(b.animation.start || 'click') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <label>${t('Disparador')}<select data-p="trigger"><option value="">${t('Secuencia de clics')}</option>${currentSlide().blocks
            .filter(x => x.id !== b.id && x.type !== 'connector').map(x => `<option value="${x.id}"${b.animation.trigger === x.id ? ' selected' : ''}>${t('Al hacer clic en')} ${objLabel(x).replace(/</g, '&lt;')}</option>`).join('')}</select></label>
          ${b.animation.effect === 'path' ? `<label>${t('Recorrido')}<select data-p="pathShape">${[['line', 'Recto'], ['arc', 'Arco'], ['wave', 'Onda'], ['loop', 'Bucle'], ...(b.animation.points ? [['custom', 'Dibujado']] : [])]
            .map(([v, l]) => `<option value="${v}"${(b.animation.pathShape || 'line') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <label>&nbsp;<button type="button" class="mini2 an-draw"><i class="ms">gesture</i> ${t('Dibujar')}</button></label>
          ${b.type === 'model' ? `<p class="host-help an-wide">${t('Un objeto 3D gira hacia donde va: se elige en Movimiento 3D.')}</p>`
            : `<label>${t('Giro en el camino')}<select data-p="turn"><option value="">${t('Sin girar')}</option><option value="follow"${b.animation.turn === 'follow' ? ' selected' : ''}>${t('Seguir el camino')}</option></select></label>
          <label>${t('Vueltas (grados)')}<input type="number" data-p="spin" value="${b.animation.spin || 0}" step="90" title="${t('360 = una vuelta entera; negativo: al revés')}"></label>`}
          <label>${t('Mover X')} (px)<input type="number" data-p="dx" value="${b.animation.dx || 0}" step="10"></label>
          <label>${t('Mover Y')} (px)<input type="number" data-p="dy" value="${b.animation.dy || 0}" step="10"></label>` : ''}
          <label>${t('Duración')} (ms)<input type="number" data-p="duration" value="${b.animation.duration ?? 500}" step="100" min="0"></label>
          <label>${t('Retardo')} (ms)<input type="number" data-p="delay" value="${b.animation.delay ?? 0}" step="100" min="0"></label>
        </div>
        <div class="an-actions"><button data-move="-1"${i === 0 ? ' disabled' : ''}>↑</button><button data-move="1"${i === list.length - 1 ? ' disabled' : ''}>↓</button><button data-remove title="${t('Quitar')}">✕</button></div>
      </div>`).join('')
      : `<p class="host-help">${t('Aplica una animación de entrada a un objeto primero.')}</p>`;
    body.querySelectorAll('.an-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-p="effect"]').addEventListener('change', e => { trans.setAnimPropForId(id, 'effect', e.target.value); render(); });
      row.querySelector('[data-p="pathShape"]')?.addEventListener('change', e => { trans.setAnimPropForId(id, 'pathShape', e.target.value); });
      row.querySelector('[data-p="turn"]')?.addEventListener('change', e => { trans.setAnimPropForId(id, 'turn', e.target.value); });
      // Draw it on the slide: the panel steps aside while drawing.
      row.querySelector('.an-draw')?.addEventListener('click', () => { commit(() => setSelection(id), { history: false }); close(); startPathDraw(); });
      row.querySelector('[data-p="trigger"]').addEventListener('change', e => { trans.setAnimPropForId(id, 'trigger', e.target.value || null); render(); });
      row.querySelector('[data-p="start"]').addEventListener('change', e => { trans.setAnimPropForId(id, 'start', e.target.value); render(); });
      row.querySelectorAll('input[data-p]').forEach(inp => inp.addEventListener('change', e => trans.setAnimPropForId(id, inp.dataset.p, e.target.value)));
      row.querySelectorAll('[data-move]').forEach(btn => btn.addEventListener('click', () => { trans.moveAnimForId(id, +btn.dataset.move); render(); }));
      row.querySelector('[data-remove]').addEventListener('click', () => { trans.clearAnimationForId(id); render(); });
    });
  };
  render();
}
