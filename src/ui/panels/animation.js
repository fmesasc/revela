// Animation pane (PowerPoint's): docked beside the slide, so the objects stay in sight. The slide's
// effects in order, one short row each (its object, its effect, how it starts and a bar of when it
// plays); choosing a row selects its object on the slide, and hovering one outlines it. Ctrl/Shift
// choose several, which are dragged (or moved with ↑ ↓), changed or removed together; below the
// list, the details of the chosen one (or the settings they share, when they are several).

import { FX } from '../../features/animation/fxcatalog.js';
import { isPdf } from '../../features/content/files.js';
import { mediaKind } from '../../features/live/media.js';
import { openPdfZone } from '../dialogs/pdfzone.js';
import { esc } from '../../core/text.js';
import { state, currentSlide, commit, setSelection, setMulti, isSelected } from '../../core/store.js';
import * as trans from '../../features/animation/transitions.js';
import { playAnimations } from '../canvas/preview.js';
import { startPathDraw } from '../canvas/pathdraw.js';
import { openAddAnimation } from '../ribbon/animadd.js';
import { modelClips } from '../canvas/mediaview.js';
import { t } from '../../i18n/index.js';
import { ANIM_SOUNDS, soundRuntime } from '../../io/runtime/sounds.js';
import { readFile } from '../shell/openfile.js';
import { morphConflict } from '../../features/animation/morph.js';

let snd = null;
const sounds = () => (snd ||= soundRuntime());
const byIdAnim = id => currentSlide().blocks.find(x => x.id === id);

const $ = s => document.querySelector(s);

export const ANIM_EFFECTS = ['fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in',
  'spin', 'flip', 'bounce', 'grow', 'shrink', 'strike', 'fade-out', 'semi-fade-out', 'fade-in-then-out', 'fade-in-then-semi-out',
  'current-visible', 'highlight-red', 'highlight-green', 'highlight-blue', 'highlight-current-red', 'highlight-current-green',
  'highlight-current-blue', 'spin360', 'pulse', 'teeter', 'jump', 'color-pulse', 'path', 'draw', ...Object.keys(FX)];
// Readable names (reveal.js fragment styles and Revela's own effects).
export const EFFECT_NAMES = { 'fade-in': 'Aparecer', 'fade-up': 'Subir', 'fade-down': 'Bajar', 'fade-left': 'Desde la derecha',
  'fade-right': 'Desde la izquierda', 'zoom-in': 'Zoom', spin: 'Girar', flip: 'Voltear', bounce: 'Rebotar', grow: 'Agrandar',
  shrink: 'Encoger', strike: 'Tachar', 'fade-out': 'Desaparecer', 'semi-fade-out': 'Atenuar', 'fade-in-then-out': 'Aparecer y desaparecer',
  'fade-in-then-semi-out': 'Aparecer y atenuar', 'current-visible': 'Visible solo en su paso', 'highlight-red': 'Resaltar en rojo',
  'highlight-green': 'Resaltar en verde', 'highlight-blue': 'Resaltar en azul', 'highlight-current-red': 'Rojo solo en su paso',
  'highlight-current-green': 'Verde solo en su paso', 'highlight-current-blue': 'Azul solo en su paso', path: 'Trayectoria',
  spin360: 'Dar una vuelta', pulse: 'Latido', teeter: 'Balanceo', jump: 'Salto', 'color-pulse': 'Destello', 'media-play': 'Reproducir', 'media-pause': 'Pausar', 'media-stop': 'Detener', clip3d: 'Animación del modelo 3D', draw: 'Dibujar', pdfview: 'Página y zoom del PDF',
  ...Object.fromEntries(Object.values(FX).map(f => [f.id, f.name])) };
export const EFFECT_LABEL = e => t(EFFECT_NAMES[e] || e);
// Short label of an object for the trigger list.
export function objLabel(b) {
  const txt = b.type === 'text' ? (new DOMParser().parseFromString(b.html || '', 'text/html').body.textContent || '').trim().slice(0, 24) : '';
  return t(ANIM_NAMES[b.type] || b.type) + (txt ? ` «${txt}»` : '');
}
export const ANIM_NAMES = { diagram: 'Diagrama', file: 'Archivo', poll: 'Votación', camera: 'Cámara en directo', ink: 'Tinta', text: 'Texto', image: 'Imagen', shape: 'Forma', chart: 'Gráfico', table: 'Tabla',
  icon: 'Icono', math: 'Ecuación', model: '3D', video: 'Vídeo', embed: 'Web', code: 'Código', figindex: 'Índice de figuras', slideref: 'Diapositiva', magnify: 'Lupa' };
export function toggleAnimPane(on = !state.ui.showAnim) { commit(() => { state.ui.showAnim = on; }, { history: false }); }

const START_ICON = { click: 'ads_click', withPrev: 'link', afterPrev: 'schedule' };
const START_NAME = { click: 'Al hacer clic', withPrev: 'Con la anterior', afterPrev: 'Después de la anterior' };
// The animations chosen in the pane (the objects themselves). When the selection on the slide
// changes from elsewhere, they follow it: the animation being edited of each selected object.
let picked = [], anchor = null;
function syncPicked(list) {
  const live = picked.filter(a => list.some(e => e.a === a));
  const objs = new Set(list.filter(e => live.includes(e.a)).map(e => e.b.id));
  const sel = list.filter(e => isSelected(e.b.id)).map(e => e.b.id);
  if (live.length && sel.length === objs.size && sel.every(id => objs.has(id))) { picked = live; return; }
  picked = list.filter(e => isSelected(e.b.id) && e.i === trans.animEditIndex(e.b)).map(e => e.a);
}
const pick = (list, anims, cur) => {
  picked = anims;
  const ids = [...new Set(list.filter(e => anims.includes(e.a)).map(e => e.b.id))], c = list.find(e => e.a === cur);
  commit(() => { if (ids.length > 1) setMulti(c ? [...ids.filter(x => x !== c.b.id), c.b.id] : ids); else setSelection(ids[0] || null);
    if (c) state.ui.animEdit = { id: c.b.id, i: c.i }; }, { history: false });
};

export function renderAnimPane() {
  let panel = document.getElementById('anim-pane');
  if (!state.ui.showAnim || !currentSlide()) { panel?.remove(); return; }
  if (!panel) {
    panel = document.createElement('aside'); panel.id = 'anim-pane'; panel.setAttribute('aria-label', t('Panel de animación'));
    panel.innerHTML = `<div class="cm-head"><b>${t('Panel de animación')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div>
      <div class="sp-tools"><button type="button" class="an-play" title="${t('Reproducir')}"><i class="ms">play_arrow</i> ${t('Reproducir')}</button>
        <button type="button" data-shift="-1" title="${t('Subir')}"><i class="ms">arrow_upward</i></button><button type="button" data-shift="1" title="${t('Bajar')}"><i class="ms">arrow_downward</i></button>
        <button type="button" class="an-del" title="${t('Quitar')}"><i class="ms">delete</i></button></div>
      <ol class="an-list" role="listbox" aria-multiselectable="true"></ol><div class="an-detail"></div>`;
    document.querySelector('main').appendChild(panel);
    panel.querySelector('.cm-close').addEventListener('click', () => toggleAnimPane(false));
    panel.querySelector('.an-play').addEventListener('click', () => playAnimations());
    panel.querySelectorAll('[data-shift]').forEach(x => x.addEventListener('click', () => { if (picked.length) trans.moveAnims(picked, trans.animSlot(picked) + +x.dataset.shift); }));
    panel.querySelector('.an-del').addEventListener('click', () => trans.clearAnims(picked));
    panel.addEventListener('keydown', e => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.closest('.an-list')) { e.preventDefault(); e.stopPropagation(); trans.clearAnims(picked); }
    });
  }
  const list = trans.animEntries();
  syncPicked(list);
  renderList(panel, list);
  renderDetail(panel, list);
}

function renderList(panel, list) {
  const tl = trans.animTimeline(), count = new Map();
  list.forEach(e => count.set(e.b.id, (count.get(e.b.id) || 0) + 1));
  const end = Math.max(1000, ...[...tl.values()].map(x => x.delay + x.dur));
  const rows = list.map(({ b, a, i, key }, n) => {
    const x = tl.get(key), first = x && (n === 0 || list[n - 1] && tl.get(list[n - 1].key)?.step !== x.step), start = a.start || 'click';
    return [key, n, a.effect, start, a.trigger || '', a.delay, a.duration, picked.includes(a), b.id === state.ui.selection && i === trans.animEditIndex(b), objLabel(b), count.get(b.id),
      `<li class="an-row${picked.includes(a) ? ' on' : ''}${b.id === state.ui.selection && i === trans.animEditIndex(b) ? ' cur' : ''}" draggable="true" tabindex="0" role="option" aria-selected="${picked.includes(a)}" data-id="${b.id}" data-i="${i}">
        <span class="an-n">${a.trigger ? '<i class="ms" title="' + t('Con disparador') + '">touch_app</i>' : first ? x.step : ''}</span>
        <i class="ms an-start" title="${t(START_NAME[start] || start)}">${START_ICON[start] || 'ads_click'}</i>
        <i class="ms an-kind k-${trans.effectKind(a.effect)}" aria-hidden="true">${a.effect === 'path' ? 'route' : 'star'}</i>
        <span class="an-name"><b>${esc(objLabel(b))}</b>${count.get(b.id) > 1 ? ` <span class="an-step">${i + 1}/${count.get(b.id)}</span>` : ''}<small>${esc(EFFECT_LABEL(a.effect))}</small></span>
        <span class="an-bar" title="${x ? `${(x.delay / 1000).toFixed(1)} s → ${((x.delay + x.dur) / 1000).toFixed(1)} s` : ''}">${x ? `<i style="inset-inline-start:${(x.delay / end * 100).toFixed(1)}%;width:${Math.max(2, x.dur / end * 100).toFixed(1)}%"></i>` : ''}</span>
        <button type="button" class="an-x" data-remove title="${t('Quitar')}">✕</button></li>`];
  });
  const ol = panel.querySelector('.an-list'), key = JSON.stringify([state.ui.slideIndex, rows.map(r => r.slice(0, -1))]);
  panel.querySelectorAll('[data-shift],.an-del').forEach(x => { x.disabled = !picked.length; });
  panel.querySelector('.an-play').disabled = !list.length;
  if (ol.dataset.key === key) return;
  ol.dataset.key = key;
  ol.innerHTML = list.length ? rows.map(r => r.at(-1)).join('') : `<li class="host-help">${t('Aplica una animación de entrada a un objeto primero.')}</li>`;
  const hover = (id, on) => document.querySelector(`#stage .block[data-id="${id}"]`)?.classList.toggle('anim-hover', on);
  let dragged = null;
  ol.querySelectorAll('.an-row').forEach((row, n) => {
    const e = list[n], { a } = e;
    row.addEventListener('mouseenter', () => hover(e.b.id, true)); row.addEventListener('mouseleave', () => hover(e.b.id, false));
    row.addEventListener('click', ev => {
      if (ev.target.closest('[data-remove]')) { hover(e.b.id, false); trans.clearAnims(picked.includes(a) ? picked : [a]); return; }
      const all = list.map(x => x.a);
      if (ev.shiftKey && anchor && all.includes(anchor)) { const [p, q] = [all.indexOf(anchor), n].sort((u, v) => u - v); pick(list, all.slice(p, q + 1), a); }
      else if (ev.ctrlKey || ev.metaKey) { anchor = a; pick(list, picked.includes(a) ? picked.filter(y => y !== a) : [...picked, a].sort((u, v) => all.indexOf(u) - all.indexOf(v)), a); }
      else { anchor = a; pick(list, [a], a); }
    });
    row.addEventListener('keydown', ev => {
      if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
      ev.preventDefault(); ev.stopPropagation();
      if (ev.altKey) { const group = picked.includes(a) ? picked : [a]; trans.moveAnims(group, trans.animSlot(group) + (ev.key === 'ArrowUp' ? -1 : 1)); return; }
      const to = list[n + (ev.key === 'ArrowUp' ? -1 : 1)]; if (!to) return;
      anchor = to.a; pick(list, [to.a], to.a);
      requestAnimationFrame(() => document.querySelector(`#anim-pane .an-row[data-id="${to.b.id}"][data-i="${to.i}"]`)?.focus());
    });
    // Drag: the chosen ones together when the row is one of them.
    row.addEventListener('dragstart', ev => { dragged = picked.includes(a) ? picked : [a]; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', e.key); row.classList.add('dragging'); });
    row.addEventListener('dragend', () => { dragged = null; ol.querySelectorAll('.dragging,[data-drop]').forEach(r => { r.classList.remove('dragging'); delete r.dataset.drop; }); });
    row.addEventListener('dragover', ev => { if (!dragged || dragged.includes(a)) return; ev.preventDefault(); const r = row.getBoundingClientRect(); row.dataset.drop = ev.clientY < r.top + r.height / 2 ? 'above' : 'below'; });
    row.addEventListener('dragleave', () => { delete row.dataset.drop; });
    row.addEventListener('drop', ev => {
      ev.preventDefault(); const where = row.dataset.drop; delete row.dataset.drop; if (!dragged || dragged.includes(a)) return;
      const rest = list.map(x => x.a).filter(y => !dragged.includes(y)), group = dragged; dragged = null;
      trans.moveAnims(group, rest.indexOf(a) + (where === 'below' ? 1 : 0));
    });
  });
}

// The details: of the chosen animation, or what several chosen ones share (changed on all of them).
function renderDetail(panel, list) {
  const box = panel.querySelector('.an-detail'), chosen = list.filter(e => picked.includes(e.a));
  const one = chosen.length === 1 ? chosen[0] : null;
  const clash = one ? morphConflict(state.deck, currentSlide(), one.b) : null;
  const key = JSON.stringify(one ? [one.key, one.a, state.ui.slideIndex, clash] : [chosen.map(e => e.key), chosen.map(e => [e.a.effect, e.a.start, e.a.duration, e.a.delay, e.a.sound])]);
  if (box.dataset.key === key || (box.contains(document.activeElement) && box.dataset.for === (one?.key || chosen.map(e => e.key).join()))) return;
  box.dataset.key = key; box.dataset.for = one?.key || chosen.map(e => e.key).join();
  if (!chosen.length) { box.innerHTML = list.length ? `<p class="host-help">${t('Elige una animación para ver sus opciones. Ctrl o Mayús: varias a la vez.')}</p>` : ''; return; }
  if (one) { detailOne(box, one, clash); return; }
  const anims = chosen.map(e => e.a), same = p => (anims.every(a => (a[p] ?? '') === (anims[0][p] ?? '')) ? anims[0][p] ?? '' : null);
  const opt = (v, l, cur) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`, mixed = cur => (cur === null ? `<option value="" selected disabled>${t('(varios)')}</option>` : '');
  const fx = same('effect'), st = same('start') || (anims.every(a => !a.start) ? 'click' : null), du = same('duration'), de = same('delay'), so = same('sound');
  box.innerHTML = `<div class="an-title">${t('{n} animaciones').replace('{n}', anims.length)}</div><div class="an-grid">
    <label>${t('Efecto')}<select data-p="effect">${mixed(fx)}${ANIM_EFFECTS.map(e => opt(e, EFFECT_LABEL(e), fx)).join('')}</select></label>
    <label>${t('Comienzo')}<select data-p="start">${mixed(st)}${Object.entries(START_NAME).map(([v, l]) => opt(v, t(l), st)).join('')}</select></label>
    <label>${t('Duración')} (ms)<input type="number" data-p="duration" step="100" min="0" value="${du ?? ''}" placeholder="${t('(varios)')}"></label>
    <label>${t('Retardo')} (ms)<input type="number" data-p="delay" step="100" min="0" value="${de ?? ''}" placeholder="${t('(varios)')}"></label>
    <label class="an-wide">${t('Sonido')}<select data-p="sound">${mixed(so)}${ANIM_SOUNDS.filter(([v]) => v !== 'custom').map(([v, l]) => opt(v, t(l), so)).join('')}</select></label></div>`;
  box.querySelectorAll('[data-p]').forEach(x => x.addEventListener('change', () => { if (x.value !== '') trans.setAnimsProp(anims, x.dataset.p, x.value); }));
}

function detailOne(box, { b, a, i }, clash = null) {
  const id = b.id, set = (p, v) => trans.setAnimPropForId(id, p, v, i);
  // With Morph, an object with its own entrance (or that left the slide before) doesn't glide: said, so nothing seems lost.
  const note = clash === 'entrance' ? t('Esta diapositiva usa Transformar, pero este objeto entra con su animación: no se desliza desde la anterior. Quita su animación de entrada para que se deslice.')
    : clash === 'exit' ? t('Este objeto sale con su animación en la diapositiva anterior: aquí aparece sin deslizarse.') : '';
  box.innerHTML = `<div class="an-title">${esc(objLabel(b))} · ${esc(EFFECT_LABEL(a.effect))}</div>${note ? `<p class="an-clash"><i class="ms">info</i> ${esc(note)}</p>` : ''}
    <div class="an-grid">
      <label>${t('Efecto')}<select data-p="effect">${[...ANIM_EFFECTS, ...(b.type === 'model' ? ['clip3d'] : []), ...(isPdf(b) ? ['pdfview'] : []), ...(mediaKind(b) ? trans.MEDIA_FX : [])].map(e => `<option value="${e}"${a.effect === e ? ' selected' : ''}>${EFFECT_LABEL(e)}</option>`).join('')}</select></label>
      <label>${t('Comienzo')}<select data-p="start">${Object.entries(START_NAME).map(([v, l]) => `<option value="${v}"${(a.start || 'click') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
      <label class="an-wide">${t('Disparador')}<select data-p="trigger"><option value="">${t('Secuencia de clics')}</option>${currentSlide().blocks
        .filter(x => x.id !== b.id && x.type !== 'connector').map(x => `<option value="${x.id}"${a.trigger === x.id ? ' selected' : ''}>${t('Al hacer clic en')} ${esc(objLabel(x))}</option>`).join('')}</select></label>
      ${a.effect === 'clip3d' ? `<label>${t('Animación')}<select data-p="clip">${[...new Set([a.clip || '*', ...modelClips(b.id)])].map(c => `<option value="${esc(c)}"${(a.clip || '*') === c ? ' selected' : ''}>${c === '*' ? t('La primera') : esc(c)}</option>`).join('')}</select></label>
      <label class="an-chk"><input type="checkbox" data-p="once"${a.once ? ' checked' : ''}> ${t('Una vez y volver al reposo')}</label>` : ''}
      ${a.effect === 'pdfview' ? `<label>${t('Página')}<input type="number" data-pdf-p="page" min="1"${b.pages ? ` max="${b.pages}"` : ''} value="${Math.max(1, +a.page || 1)}"></label>
      <label>${t('Zoom')}<select data-pdf-p="zs">${[...new Set([1, 1.5, 2, 3, 4, +(+a.zs || 1).toFixed(2)])].sort((x, y) => x - y).map(z => `<option value="${z}"${Math.abs((+a.zs || 1) - z) < 0.005 ? ' selected' : ''}>${Math.round(z * 100)} %</option>`).join('')}</select></label>
      <label class="an-wide"><button type="button" class="mini2 an-zone"><i class="ms">crop_free</i> ${t('Elegir la zona…')}</button></label>` : ''}
      ${a.effect === 'path' ? `<label>${t('Recorrido')}<select data-p="pathShape">${[['line', 'Recto'], ['arc', 'Arco'], ['wave', 'Onda'], ['loop', 'Bucle'], ...(a.points ? [['custom', 'Dibujado']] : [])]
        .map(([v, l]) => `<option value="${v}"${(a.pathShape || 'line') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
      <label>&nbsp;<button type="button" class="mini2 an-draw"><i class="ms">gesture</i> ${t('Dibujar')}</button></label>
      ${b.type === 'model' ? `<p class="host-help an-wide">${t('Un objeto 3D gira hacia donde va: se elige en Movimiento 3D.')}</p>`
        : `<label>${t('Giro en el camino')}<select data-p="turn"><option value="">${t('Sin girar')}</option><option value="follow"${a.turn === 'follow' ? ' selected' : ''}>${t('Seguir el camino')}</option></select></label>
      <label>${t('Vueltas (grados)')}<input type="number" data-p="spin" value="${a.spin || 0}" step="90" title="${t('360 = una vuelta entera; negativo: al revés')}"></label>`}
      <label>${t('Mover X')} (px)<input type="number" data-p="dx" value="${a.dx || 0}" step="10"></label>
      <label>${t('Mover Y')} (px)<input type="number" data-p="dy" value="${a.dy || 0}" step="10"></label>` : ''}
      ${a.effect === 'grow' || a.effect === 'shrink' ? `<label title="${t('Agrandar 130 % y después Encoger 77 % lo deja como estaba')}">${t('Tamaño')} (%)<input type="number" data-p="size" value="${a.size || (a.effect === 'grow' ? 130 : 70)}" step="5" min="5" max="500"></label>` : ''}
      <label>${t('Duración')} (ms)<input type="number" data-p="duration" value="${a.duration ?? 500}" step="100" min="0"></label>
      <label>${t('Retardo')} (ms)<input type="number" data-p="delay" value="${a.delay ?? 0}" step="100" min="0"></label>
      <label class="an-wide">${t('Sonido')}<span class="an-snd"><select data-p="sound">${ANIM_SOUNDS.map(([v, l]) => `<option value="${v}"${(a.sound || '') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>
        <button type="button" class="mini2 an-hear" title="${t('Escuchar')}"${a.sound ? '' : ' disabled'}><i class="ms">volume_up</i></button></span></label>
    </div>
    <div class="an-actions"><button type="button" data-add><i class="ms">add</i> ${t('Añadir otra animación a este objeto')}</button></div>`;
  for (const p of ['effect', 'start', 'trigger', 'pathShape', 'turn', 'clip']) box.querySelector(`[data-p="${p}"]`)?.addEventListener('change', e => set(p, p === 'trigger' ? e.target.value || null : e.target.value));
  box.querySelector('[data-p="once"]')?.addEventListener('change', e => set('once', e.target.checked));
  box.querySelectorAll('input[type=number][data-p]').forEach(inp => inp.addEventListener('change', e => set(inp.dataset.p, e.target.value)));
  // A PDF step: its page and zoom, typed or chosen on the page itself.
  box.querySelectorAll('[data-pdf-p]').forEach(x => x.addEventListener('change', () => set(x.dataset.pdfP, +x.value)));
  box.querySelector('.an-zone')?.addEventListener('click', async () => {
    const z = await openPdfZone(byIdAnim(id), trans.animsOf(byIdAnim(id))[i]); if (!z) return;
    for (const [k, v] of Object.entries(z)) set(k, v);
  });
  // A sound as it appears: made here, or one's own (a file, kept inside the presentation).
  box.querySelector('[data-p="sound"]').addEventListener('change', e => {
    const v = e.target.value;
    if (v !== 'custom') { set('sound', v); sounds().play(v); return; }
    readFile('audio/*', src => { if (!/^data:audio\//.test(src)) return; set('soundSrc', src); set('sound', 'custom'); sounds().play('custom', src); });
    e.target.value = trans.animsOf(byIdAnim(id))[i]?.sound || '';
  });
  box.querySelector('.an-hear').addEventListener('click', () => { const x = trans.animsOf(byIdAnim(id))[i]; if (x?.sound) sounds().play(x.sound, x.soundSrc); });
  // Drawn on the slide itself, which stays in sight beside the pane.
  box.querySelector('.an-draw')?.addEventListener('click', () => { commit(() => setSelection(id), { history: false }); startPathDraw({ index: i }); });
  box.querySelector('[data-add]').addEventListener('click', e => { commit(() => setSelection(id), { history: false }); openAddAnimation(e.currentTarget); });
}
