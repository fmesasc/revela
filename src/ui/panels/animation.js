// Animation pane: the slide's effects in order, with timing, triggers and
// reordering (PowerPoint's Animation Pane).

import { isPdf } from '../../features/content/files.js';
import { openPdfZone } from '../dialogs/pdfzone.js';
import { esc } from '../../core/text.js';
import { currentSlide, commit, setSelection, subscribe } from '../../core/store.js';
import * as trans from '../../features/animation/transitions.js';
import { playAnimations } from '../canvas/preview.js';
import { startPathDraw } from '../canvas/pathdraw.js';
import { openAddAnimation } from '../ribbon/animadd.js';
import { modelClips } from '../canvas/mediaview.js';
import { t } from '../../i18n/index.js';
import { ANIM_SOUNDS, soundRuntime } from '../../io/runtime/sounds.js';
import { readFile } from '../shell/openfile.js';

let snd = null;
const sounds = () => (snd ||= soundRuntime());
const byIdAnim = id => currentSlide().blocks.find(x => x.id === id);

const $ = s => document.querySelector(s);

export const ANIM_EFFECTS = ['fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in',
  'spin', 'flip', 'bounce', 'grow', 'shrink', 'strike', 'fade-out', 'semi-fade-out', 'fade-in-then-out', 'fade-in-then-semi-out',
  'current-visible', 'highlight-red', 'highlight-green', 'highlight-blue', 'highlight-current-red', 'highlight-current-green',
  'highlight-current-blue', 'spin360', 'path', 'draw'];
// Readable names (reveal.js fragment styles and Revela's own effects).
export const EFFECT_NAMES = { 'fade-in': 'Aparecer', 'fade-up': 'Subir', 'fade-down': 'Bajar', 'fade-left': 'Desde la derecha',
  'fade-right': 'Desde la izquierda', 'zoom-in': 'Zoom', spin: 'Girar', flip: 'Voltear', bounce: 'Rebotar', grow: 'Agrandar',
  shrink: 'Encoger', strike: 'Tachar', 'fade-out': 'Desaparecer', 'semi-fade-out': 'Atenuar', 'fade-in-then-out': 'Aparecer y desaparecer',
  'fade-in-then-semi-out': 'Aparecer y atenuar', 'current-visible': 'Visible solo en su paso', 'highlight-red': 'Resaltar en rojo',
  'highlight-green': 'Resaltar en verde', 'highlight-blue': 'Resaltar en azul', 'highlight-current-red': 'Rojo solo en su paso',
  'highlight-current-green': 'Verde solo en su paso', 'highlight-current-blue': 'Azul solo en su paso', path: 'Trayectoria',
  spin360: 'Dar una vuelta', clip3d: 'Animación del modelo 3D', draw: 'Dibujar', pdfview: 'Página y zoom del PDF' };
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
  let unsub = () => {};
  const close = () => { unsub(); back.remove(); };
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const render = () => {
    const list = trans.animEntries(), count = new Map();
    list.forEach(e => count.set(e.b.id, (count.get(e.b.id) || 0) + 1));
    body.innerHTML = list.length ? list.map(({ b, a, i }, n) => `
      <div class="an-row" data-id="${b.id}" data-i="${i}">
        <div class="an-title">${n + 1}. ${t(ANIM_NAMES[b.type] || b.type)}${count.get(b.id) > 1 ? ` <span class="an-step">${t('animación')} ${i + 1}/${count.get(b.id)}</span>` : ''}</div>
        <div class="an-grid">
          <label>${t('Efecto')}<select data-p="effect">${[...ANIM_EFFECTS, ...(b.type === 'model' ? ['clip3d'] : []), ...(isPdf(b) ? ['pdfview'] : [])].map(e => `<option value="${e}"${a.effect === e ? ' selected' : ''}>${EFFECT_LABEL(e)}</option>`).join('')}</select></label>
          <label>${t('Comienzo')}<select data-p="start">${[['click', 'Al hacer clic'], ['withPrev', 'Con la anterior'], ['afterPrev', 'Después de la anterior']]
            .map(([v, l]) => `<option value="${v}"${(a.start || 'click') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <label>${t('Disparador')}<select data-p="trigger"><option value="">${t('Secuencia de clics')}</option>${currentSlide().blocks
            .filter(x => x.id !== b.id && x.type !== 'connector').map(x => `<option value="${x.id}"${a.trigger === x.id ? ' selected' : ''}>${t('Al hacer clic en')} ${objLabel(x).replace(/</g, '&lt;')}</option>`).join('')}</select></label>
          ${a.effect === 'clip3d' ? `<label>${t('Animación')}<select data-p="clip">${[...new Set([a.clip || '*', ...modelClips(b.id)])].map(c => `<option value="${esc(c)}"${(a.clip || '*') === c ? ' selected' : ''}>${c === '*' ? t('La primera') : esc(c)}</option>`).join('')}</select></label>
          <label class="an-chk"><input type="checkbox" data-p="once"${a.once ? ' checked' : ''}> ${t('Una vez y volver al reposo')}</label>` : ''}
          ${a.effect === 'pdfview' ? `<label>${t('Página')}<input type="number" data-pdf-p="page" min="1"${b.pages ? ` max="${b.pages}"` : ''} value="${Math.max(1, +a.page || 1)}"></label>
          <label>${t('Zoom')}<select data-pdf-p="zs">${[...new Set([1, 1.5, 2, 3, 4, +(+a.zs || 1).toFixed(2)])].sort((x, y) => x - y).map(z => `<option value="${z}"${Math.abs((+a.zs || 1) - z) < 0.005 ? ' selected' : ''}>${Math.round(z * 100)} %</option>`).join('')}</select></label>
          <label>&nbsp;<button type="button" class="mini2 an-zone"><i class="ms">crop_free</i> ${t('Elegir la zona…')}</button></label>` : ''}
          ${a.effect === 'path' ? `<label>${t('Recorrido')}<select data-p="pathShape">${[['line', 'Recto'], ['arc', 'Arco'], ['wave', 'Onda'], ['loop', 'Bucle'], ...(a.points ? [['custom', 'Dibujado']] : [])]
            .map(([v, l]) => `<option value="${v}"${(a.pathShape || 'line') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <label>&nbsp;<button type="button" class="mini2 an-draw"><i class="ms">gesture</i> ${t('Dibujar')}</button></label>
          ${b.type === 'model' ? `<p class="host-help an-wide">${t('Un objeto 3D gira hacia donde va: se elige en Movimiento 3D.')}</p>`
            : `<label>${t('Giro en el camino')}<select data-p="turn"><option value="">${t('Sin girar')}</option><option value="follow"${a.turn === 'follow' ? ' selected' : ''}>${t('Seguir el camino')}</option></select></label>
          <label>${t('Vueltas (grados)')}<input type="number" data-p="spin" value="${a.spin || 0}" step="90" title="${t('360 = una vuelta entera; negativo: al revés')}"></label>`}
          <label>${t('Mover X')} (px)<input type="number" data-p="dx" value="${a.dx || 0}" step="10"></label>
          <label>${t('Mover Y')} (px)<input type="number" data-p="dy" value="${a.dy || 0}" step="10"></label>` : ''}
          <label>${t('Duración')} (ms)<input type="number" data-p="duration" value="${a.duration ?? 500}" step="100" min="0"></label>
          <label>${t('Retardo')} (ms)<input type="number" data-p="delay" value="${a.delay ?? 0}" step="100" min="0"></label>
          <label>${t('Sonido')}<span class="an-snd"><select data-p="sound">${ANIM_SOUNDS.map(([v, l]) => `<option value="${v}"${(a.sound || '') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>
            <button type="button" class="mini2 an-hear" title="${t('Escuchar')}"${a.sound ? '' : ' disabled'}><i class="ms">volume_up</i></button></span></label>
        </div>
        <div class="an-actions"><button data-move="-1"${n === 0 ? ' disabled' : ''}>↑</button><button data-move="1"${n === list.length - 1 ? ' disabled' : ''}>↓</button>
          <button data-add title="${t('Añadir otra animación a este objeto')}">+</button><button data-remove title="${t('Quitar')}">✕</button></div>
      </div>`).join('')
      : `<p class="host-help">${t('Aplica una animación de entrada a un objeto primero.')}</p>`;
    body.querySelectorAll('.an-row').forEach(row => {
      const id = row.dataset.id, i = +row.dataset.i, set = (p, v) => trans.setAnimPropForId(id, p, v, i);
      row.querySelector('[data-p="effect"]').addEventListener('change', e => { set('effect', e.target.value); render(); });
      row.querySelector('[data-p="pathShape"]')?.addEventListener('change', e => set('pathShape', e.target.value));
      row.querySelector('[data-p="turn"]')?.addEventListener('change', e => set('turn', e.target.value));
      row.querySelector('[data-p="clip"]')?.addEventListener('change', e => set('clip', e.target.value));
      row.querySelector('[data-p="once"]')?.addEventListener('change', e => set('once', e.target.checked));
      // A PDF step: its page and zoom, typed or chosen on the page itself.
      row.querySelectorAll('[data-pdf-p]').forEach(x => x.addEventListener('change', () => set(x.dataset.pdfP, +x.value)));
      row.querySelector('.an-zone')?.addEventListener('click', async () => {
        const b = byIdAnim(id), a = trans.animsOf(b)[i]; const z = await openPdfZone(b, a); if (!z) return;
        for (const [k, v] of Object.entries(z)) set(k, v);
        render();
      });
      // A sound as it appears: made here, or one's own (a file, kept inside the presentation).
      row.querySelector('[data-p="sound"]').addEventListener('change', e => {
        const v = e.target.value;
        if (v !== 'custom') { set('sound', v); sounds().play(v); render(); return; }
        readFile('audio/*', src => { if (!/^data:audio\//.test(src)) return; set('soundSrc', src); set('sound', 'custom'); sounds().play('custom', src); render(); });
        e.target.value = trans.animsOf(byIdAnim(id))[i]?.sound || '';
      });
      row.querySelector('.an-hear').addEventListener('click', () => { const a = trans.animsOf(byIdAnim(id))[i]; if (a?.sound) sounds().play(a.sound, a.soundSrc); });
      // Draw it on the slide: the panel steps aside while drawing.
      row.querySelector('.an-draw')?.addEventListener('click', () => { commit(() => setSelection(id), { history: false }); close(); startPathDraw({ index: i }); });
      row.querySelector('[data-p="trigger"]').addEventListener('change', e => { set('trigger', e.target.value || null); render(); });
      row.querySelector('[data-p="start"]').addEventListener('change', e => { set('start', e.target.value); render(); });
      row.querySelectorAll('input[type=number][data-p]').forEach(inp => inp.addEventListener('change', e => set(inp.dataset.p, e.target.value)));
      row.querySelectorAll('[data-move]').forEach(btn => btn.addEventListener('click', () => { trans.moveAnimForId(id, +btn.dataset.move, i); render(); }));
      row.querySelector('[data-add]').addEventListener('click', e => { commit(() => setSelection(id), { history: false }); openAddAnimation(e.currentTarget); });
      row.querySelector('[data-remove]').addEventListener('click', () => { trans.clearAnimationForId(id, i); render(); });
    });
  };
  // (Adding from the palette re-renders the list.)
  unsub = subscribe(() => { if (!document.body.contains(back)) unsub(); else if (!back.contains(document.activeElement)) render(); });
  render();
}
