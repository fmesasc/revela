// "Esqueleto automático": give a 3D model without animations a skeleton and
// animations. Revela proposes the joints over a flat view of the model (from
// the front for a person, from the side for an animal); the user drags them
// where they belong (both sides at once, if wanted) and sees the result move
// on the right. Applying replaces the model with the rigged one (Ctrl+Z undoes it).

import { commit, currentSlide } from '../../core/store.js';
import { readModel, modelShape, proposeJoints, buildRig, SKELETONS, JOINT_LABELS, CLIPS, CLIP_LABELS, mirrorOf } from '../../features/content/autorig.js';
import { loadModelViewer } from '../../core/vendor.js';
import { alertDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

const ERRORS = {
  compressed: 'Este modelo está comprimido (Draco o meshopt) y no se puede preparar aquí.',
  external: 'Este modelo enlaza archivos aparte y no se puede preparar aquí.',
  empty: 'No se ha encontrado ninguna malla en este modelo.',
};

export async function openAutoRig(b, { onDone } = {}) {
  document.getElementById('rig-modal')?.remove();
  let g;
  try { g = await readModel(b.src); } catch (e) { alertDialog(t(ERRORS[e.message] || 'No se pudo leer el modelo: ') + (ERRORS[e.message] ? '' : e.message)); return; }
  await loadModelViewer().catch(() => {});
  let kind = 'person', yaw = 0, shape, J, built = null, mirror = true, clip = 'Walk';
  try { shape = modelShape(g, yaw); } catch (e) { alertDialog(t(ERRORS[e.message] || 'No se pudo leer el modelo: ') + (ERRORS[e.message] ? '' : e.message)); return; }
  J = proposeJoints(shape, kind);

  const back = document.createElement('div'); back.id = 'rig-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal rig" style="text-align:start;width:min(980px,96vw);max-width:96vw">
    <button class="modal-close">✕</button><h3>${t('Esqueleto automático')}</h3>
    <p class="host-help">${t('Revela propone dónde están las articulaciones. Arrástralas a su sitio sobre el modelo y mira a la derecha cómo se mueve. Funciona mejor con el modelo de pie, con brazos y piernas separados.')}</p>
    <div class="rig-bar">
      <div class="seg" role="radiogroup"><button type="button" data-kind="person" aria-pressed="true"><i class="ms">accessibility_new</i> ${t('Persona (dos piernas)')}</button><button type="button" data-kind="animal" aria-pressed="false"><i class="ms">pets</i> ${t('Animal (cuatro patas)')}</button></div>
      <button type="button" class="mini2 rig-turn" title="${t('Si el modelo no mira de frente (o el animal no mira a la derecha)')}"><i class="ms">rotate_90_degrees_ccw</i> ${t('Girar el modelo')}</button>
      <button type="button" class="mini2 rig-again"><i class="ms">auto_fix_high</i> ${t('Proponer de nuevo')}</button>
      <label class="fr-chk"><input type="checkbox" class="rig-mirror" checked> ${t('Mover los dos lados a la vez')}</label>
    </div>
    <div class="rig-main">
      <div class="rig-edit"><canvas class="rig-cv" width="460" height="460"></canvas><div class="rig-hint">${t('Arrastra los puntos')}</div></div>
      <div class="rig-prev"><model-viewer class="rig-mv" camera-controls autoplay shadow-intensity="1" interaction-prompt="none" camera-orbit="30deg 78deg auto"></model-viewer>
        <div class="rig-clips"></div></div>
    </div>
    <div class="fr-actions"><span class="host-help rig-status"></span><button class="fr-do rig-ok">${t('Aplicar al modelo')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), cv = q('.rig-cv'), ctx = cv.getContext('2d'), mv = q('.rig-mv');
  const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  // ---- The flat view: person from the front (x, y), animal from its side (z, y).
  let view, tris;
  const H = () => shape.box.max[1] - shape.box.min[1];
  function prepare() {
    const { min, max } = shape.box, side = kind === 'animal', u = side ? 2 : 0, pad = 30;
    const w = max[u] - min[u], h = max[1] - min[1], k = Math.min((cv.width - pad * 2) / w, (cv.height - pad * 2) / h);
    view = { u, k, ox: cv.width / 2 - k * (min[u] + max[u]) / 2, oy: cv.height / 2 + k * (min[1] + max[1]) / 2 };
    // Triangles, far to near, shaded by how much they face us.
    tris = [];
    for (const { pos, idx } of shape.parts) {
      if (!idx) continue;
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i] * 3, b2 = idx[i + 1] * 3, c = idx[i + 2] * 3;
        const P = [a, b2, c].map(o => [pos[o], pos[o + 1], pos[o + 2]]);
        const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
        const nx = e1[1] * e2[2] - e1[2] * e2[1], nz = e1[0] * e2[1] - e1[1] * e2[0], ny = e1[2] * e2[0] - e1[0] * e2[2], l = Math.hypot(nx, ny, nz) || 1;
        const facing = Math.abs((side ? nx : nz) / l), depth = (P[0][side ? 0 : 2] + P[1][side ? 0 : 2] + P[2][side ? 0 : 2]) / 3;
        tris.push([P.map(p => toScreen(p)), 55 + facing * 150 | 0, depth]);
      }
    }
    tris.sort((x, y) => x[2] - y[2]);
  }
  const toScreen = p => [view.ox + p[view.u] * view.k, view.oy - p[1] * view.k];
  // Joints shown: in the side view both legs of a pair are one point.
  const shown = () => SKELETONS[kind].map(([n]) => n).filter(n => kind === 'person' || !/R$/.test(n));
  let hover = null, drag = null;
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const [pts, shade] of tris) {
      ctx.fillStyle = `rgb(${shade},${shade + 6},${shade + 16})`; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.closePath(); ctx.fill();
    }
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347';
    for (const [n, p] of SKELETONS[kind]) if (p && (kind === 'person' || !/R$/.test(n))) { ctx.beginPath(); ctx.moveTo(...toScreen(J[p])); ctx.lineTo(...toScreen(J[n])); ctx.stroke(); }
    for (const n of shown()) {
      const [x, y] = toScreen(J[n]);
      ctx.beginPath(); ctx.arc(x, y, n === hover || n === drag ? 8 : 6, 0, 7);
      ctx.fillStyle = /L$|FL$|BL$/.test(n) ? '#4dabf7' : /R$/.test(n) ? '#ff6b6b' : '#ffd43b'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#1f2328'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347';
    }
    q('.rig-hint').textContent = hover ? t(JOINT_LABELS[hover]) : t('Arrastra los puntos');
  }
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  const nearest = p => { let best = null, d = 14; for (const n of shown()) { const s = toScreen(J[n]), dd = Math.hypot(s[0] - p[0], s[1] - p[1]); if (dd < d) { d = dd; best = n; } } return best; };
  cv.addEventListener('pointermove', e => {
    const p = at(e);
    if (!drag) { const h = nearest(p); if (h !== hover) { hover = h; cv.style.cursor = h ? 'grab' : ''; draw(); } return; }
    const u = (p[0] - view.ox) / view.k, y = (view.oy - p[1]) / view.k, move = (n, uu) => { J[n] = view.u === 0 ? [uu, y, J[n][2]] : [J[n][0], y, uu]; };
    move(drag, u);
    const m = mirrorOf(drag), cx = (shape.box.min[0] + shape.box.max[0]) / 2;
    if (m && J[m]) { if (kind === 'animal') J[m] = [J[m][0], y, u]; else if (mirror) J[m] = [2 * cx - u, y, J[m][2]]; }
    draw();
  });
  cv.addEventListener('pointerdown', e => { const n = nearest(at(e)); if (!n) return; drag = n; cv.setPointerCapture?.(e.pointerId); cv.style.cursor = 'grabbing'; draw(); });
  cv.addEventListener('pointerup', () => { if (!drag) return; drag = null; cv.style.cursor = hover ? 'grab' : ''; draw(); rebuild(); });

  // ---- The result, moving.
  let timer = 0;
  function rebuild() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { built = buildRig(g, shape, kind, J); mv.src = built; q('.rig-status').textContent = ''; }
      catch (e) { built = null; q('.rig-status').textContent = t('No se pudo preparar: ') + e.message; }
    }, 60);
  }
  function clips() {
    const list = CLIPS[kind]; if (!list.some(([c]) => c === clip)) clip = 'Walk';
    q('.rig-clips').innerHTML = list.map(([c]) => `<button type="button" class="mini2" data-clip="${c}" aria-pressed="${c === clip}">${t(CLIP_LABELS[c])}</button>`).join('');
    mv.animationName = clip;
  }
  q('.rig-clips').addEventListener('click', e => { const c = e.target.closest('[data-clip]')?.dataset.clip; if (!c) return; clip = c; clips(); mv.play?.(); });
  mv.addEventListener('load', () => { mv.animationName = clip; mv.play?.(); });

  const reset = () => { J = proposeJoints(shape, kind); prepare(); draw(); clips(); rebuild(); };
  back.querySelectorAll('[data-kind]').forEach(btn => btn.addEventListener('click', () => {
    kind = btn.dataset.kind; back.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-pressed', String(x === btn))); reset();
  }));
  q('.rig-turn').addEventListener('click', () => { yaw = (yaw + 90) % 360; shape = modelShape(g, yaw); reset(); });
  q('.rig-again').addEventListener('click', reset);
  q('.rig-mirror').addEventListener('change', e => { mirror = e.target.checked; });
  q('.rig-ok').addEventListener('click', () => {
    if (!built) return;
    commit(() => {
      const x = currentSlide().blocks.find(y => y.id === b.id); if (!x) return;
      x.src = built; x.clip = 'Idle'; x.autoRotate = false;
      x.walk = { clip: 'Walk', end: kind === 'person' ? 'Wave' : '', endOnce: true, face: true, look: true };
    });
    close(); onDone?.();
  });
  reset();
  return { back, get joints() { return J; }, get built() { return built; } };
}
