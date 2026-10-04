// The Animations tab as a mirror of the selection (as in PowerPoint): the gallery
// marks the object's effects by kind, and the effect and timing controls show —
// and edit — the animation being edited (the one chosen in the Animation pane or
// the picker here, else the first). Several objects: their common values, or blank.

import { state, commit, currentSlide } from '../../core/store.js';
import { shortSig } from '../../core/text.js';
import * as trans from '../../features/animation/transitions.js';
import { EFFECT_LABEL, objLabel } from '../panels/animation.js';
import { ANIM_SOUNDS, soundRuntime } from '../../io/runtime/sounds.js';
import { readFile } from '../shell/openfile.js';
import { t, currentLang } from '../../i18n/index.js';

const $ = s => document.querySelector('#ribbon [data-page="animations"] ' + s);
const MIXED = Symbol('mixed');
const KIND_NAMES = { entrance: 'Entrada', emphasis: 'Énfasis', exit: 'Salida', path: 'Trayectoria' };
// Effect options (PowerPoint's): a direction, a colour or the path's shape, as "prop:value".
const DIRECTIONS = [['fade-up', 'Desde abajo'], ['fade-down', 'Desde arriba'], ['fade-left', 'Desde la derecha'], ['fade-right', 'Desde la izquierda']];
const COLOURS = [['red', 'Rojo'], ['green', 'Verde'], ['blue', 'Azul']];
function effectOptions(a) {
  const e = a.effect;
  if (DIRECTIONS.some(([k]) => k === e)) return DIRECTIONS.map(([k, l]) => [`effect:${k}`, l, k === e]);
  const hi = e.match(/^(highlight-(?:current-)?)(red|green|blue)$/);
  if (hi) return COLOURS.map(([c, l]) => [`effect:${hi[1]}${c}`, l, c === hi[2]]);
  if (e === 'path') return [['line', 'Recto'], ['arc', 'Arco'], ['wave', 'Onda'], ['loop', 'Bucle'], ...(a.points ? [['custom', 'Dibujado']] : [])]
    .map(([k, l]) => [`pathShape:${k}`, l, (a.pathShape || 'line') === k]);
  return [];
}

let snd = null;
const sounds = () => (snd ||= soundRuntime());
// The animations shown: [block, its edited animation] for each selected object.
function shown() {
  const list = trans.animSelection();
  return list.map(b => [b, trans.animsOf(b)[list.length === 1 ? trans.animEditIndex(b) : 0] || null]);
}
const commonOf = (as, f) => { if (!as.length) return MIXED; const v = f(as[0]); return as.every(a => f(a) === v) ? v : MIXED; };
const setSel = (el, v) => { if (!el || document.activeElement === el) return; if (v === MIXED) el.selectedIndex = -1; else if (el.value !== v) el.value = v; };
const setNum = (el, v) => { if (!el || document.activeElement === el) return; const s = v === MIXED ? '' : String(v); if (el.value !== s) el.value = s; el.placeholder = v === MIXED ? '—' : ''; };
const fill = (sel, opts) => { sel.replaceChildren(...opts.map(([v, l, on]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; if (on) o.selected = true; return o; })); };

export function wireAnimRibbon() {
  if (!$('[data-anim-start]')) return;
  document.querySelectorAll('#ribbon [data-animation]').forEach(b => { b.dataset.kind = trans.effectKind(b.dataset.animation); b.setAttribute('aria-pressed', 'false'); });
  $('[data-anim-start]').addEventListener('change', e => trans.setEditedAnimProp('start', e.target.value));
  for (const p of ['duration', 'delay'])
    $(`[data-anim-${p}]`).addEventListener('change', e => { if (e.target.value !== '') trans.setEditedAnimProp(p, Math.round(parseFloat(e.target.value) * 1000) || 0); });
  $('[data-anim-trigger]').addEventListener('change', e => trans.setEditedAnimProp('trigger', e.target.value || null));
  $('[data-anim-opts]').addEventListener('change', e => { const [p, v] = e.target.value.split(':'); if (v) trans.setEditedAnimProp(p, v); });
  $('[data-anim-sound]').addEventListener('change', e => {
    const v = e.target.value;
    if (v !== 'custom') { trans.setEditedAnimProp('sound', v); if (v) sounds().play(v); return; }
    readFile('audio/*', src => { if (!/^data:audio\//.test(src)) return; trans.setEditedAnimProp('soundSrc', src); trans.setEditedAnimProp('sound', 'custom'); sounds().play('custom', src); });
    lastSig = ''; syncAnimRibbon();                       // (back to its sound until one is chosen)
  });
  $('[data-anim-pick]').addEventListener('change', e => {
    const b = trans.animSelection()[0]; if (b) commit(() => { state.ui.animEdit = { id: b.id, i: +e.target.value }; }, { history: false });
  });
}

let lastSig = '';
export function syncAnimRibbon() {
  const start = $('[data-anim-start]'); if (!start) return;
  const rows = shown(), one = rows.length === 1 ? rows[0][0] : null, slide = currentSlide();
  const sig = shortSig([currentLang(), slide?.id, rows.map(([b, a]) => [b.id, trans.animsOf(b)]), one && trans.animEditIndex(one), (slide?.blocks || []).map(b => b.id)]);
  if (sig === lastSig) return;
  lastSig = sig;
  const as = rows.map(([, a]) => a), all = as.length > 0 && as.every(Boolean), live = as.filter(Boolean);
  // The gallery: the edited effect pressed; the object's other effects marked (each by its kind).
  const eff = all ? commonOf(as, a => a.effect) : MIXED;
  const used = new Set(rows.flatMap(([b]) => trans.animsOf(b).map(a => a.effect)));
  document.querySelectorAll('#ribbon [data-animation]').forEach(btn => {
    const k = btn.dataset.animation, on = eff === k, has = !on && used.has(k);
    btn.classList.toggle('on', on); btn.classList.toggle('has', has);
    btn.setAttribute('aria-pressed', on ? 'true' : has && rows.length > 1 ? 'mixed' : 'false');
  });
  // Which animation is edited: «2 animaciones» and a picker to switch.
  const pick = $('[data-anim-pick]'), count = $('[data-anim-count]'), n = one ? trans.animsOf(one).length : 0;
  count.textContent = !rows.length ? '' : rows.length > 1 ? t('Varios objetos') + ` (${rows.length})`
    : n > 1 ? t('{n} animaciones').replace('{n}', n) : n ? t('1 animación') : t('Sin animación');
  if (one && n) fill(pick, trans.animsOf(one).map((a, i) => [String(i), `${i + 1}. ${EFFECT_LABEL(a.effect)} · ${t(KIND_NAMES[trans.effectKind(a.effect)])}`, i === trans.animEditIndex(one)]));
  else pick.replaceChildren();
  pick.hidden = !(one && n); pick.disabled = n < 2;
  // Effect options, sound and timing: the values, or blank when they differ; disabled without an animation.
  const off = !live.length;
  const opts = $('[data-anim-opts]'), optList = eff !== MIXED && live.length === as.length ? effectOptions(live[0]) : [];
  fill(opts, optList.length ? optList.map(([v, l, on]) => [v, t(l), on]) : [['', t('Opciones de efecto')]]);
  if (optList.length && live.length > 1) { const cur = commonOf(live, a => effectOptions(a).find(o => o[2])?.[0]); setSel(opts, cur); }
  opts.disabled = !optList.length;
  const sound = $('[data-anim-sound]');
  if (sound.options.length !== ANIM_SOUNDS.length || sound.dataset.lang !== currentLang()) { fill(sound, ANIM_SOUNDS.map(([v, l]) => [v, t(l)])); sound.dataset.lang = currentLang(); }
  setSel(sound, off ? '' : commonOf(as, a => a?.sound || ''));
  setSel(start, off ? 'click' : commonOf(as, a => a?.start || 'click'));
  setNum($('[data-anim-duration]'), off ? 0.5 : commonOf(as, a => (a?.duration ?? 500) / 1000));
  setNum($('[data-anim-delay]'), off ? 0 : commonOf(as, a => (a?.delay ?? 0) / 1000));
  const trig = $('[data-anim-trigger]'), mine = new Set(rows.map(([b]) => b.id));
  fill(trig, [['', t('Secuencia de clics')], ...(slide?.blocks || []).filter(x => !mine.has(x.id) && x.type !== 'connector').map(x => [x.id, `${t('Al hacer clic en')} ${objLabel(x)}`])]);
  setSel(trig, off ? '' : commonOf(as, a => a?.trigger || ''));
  for (const el of [sound, start, trig, $('[data-anim-duration]'), $('[data-anim-delay]')]) el.disabled = off;
}
