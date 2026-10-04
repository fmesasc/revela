// "Esqueleto automático": give a 3D model without animations a skeleton and
// animations. Revela guesses what the model is (a person, an animal, a bird, a
// fish, a spider… or just an object) from its shape — or asks the AI, which sees
// three small pictures of it — and proposes the joints over a flat view of it;
// the user drags them where they belong (both sides at once, if wanted) and sees
// the result move on the right. Applying replaces the model with the rigged one (Ctrl+Z undoes it).

import { commit, currentSlide } from '../../core/store.js';
import { readModel, modelShape, proposeJoints, buildRig, skeletonOf, jointLabel, CLIPS, CLIP_LABELS, KINDS, countOf, mirrorOf,
  detectKind, projectView, toView, viewTriangles, pointsFromViews, seedJoints } from '../../features/content/autorig.js';
import { aiConnected, privacyAccepted, acceptPrivacy } from '../../features/ai/openrouter.js';
import { detectWithAI } from '../../features/ai/rigkind.js';
import { loadModelViewer } from '../../core/vendor.js';
import { alertDialog, confirmDialog } from './dialog.js';
import { ready as aiReady, aiFailed } from './ai.js';
import { t } from '../../i18n/index.js';

const ERRORS = {
  compressed: 'Este modelo está comprimido (Draco o meshopt) y no se puede preparar aquí.',
  external: 'Este modelo enlaza archivos aparte y no se puede preparar aquí.',
  empty: 'No se ha encontrado ninguna malla en este modelo.',
};
const VIEW_LABELS = { front: ['Frente', 'person'], side: ['Lado', 'switch_left'], top: ['Arriba', 'vertical_align_top'] };
const sureness = c => t(c >= 0.7 ? 'bastante seguro' : c >= 0.5 ? 'probable' : 'poco seguro');
// The model drawn flat, as the editor and the AI see it.
function paint(ctx, tris, bg = null) {
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
  for (const [pts, shade] of tris) {
    ctx.fillStyle = `rgb(${shade},${shade + 6},${shade + 16})`; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.closePath(); ctx.fill();
  }
}

export async function openAutoRig(b, { onDone } = {}) {
  document.getElementById('rig-modal')?.remove();
  let g;
  try { g = await readModel(b.src); } catch (e) { alertDialog(t(ERRORS[e.message] || 'No se pudo leer el modelo: ') + (ERRORS[e.message] ? '' : e.message)); return; }
  await loadModelViewer().catch(() => {});
  let shape;
  try { shape = modelShape(g, 0); } catch (e) { alertDialog(t(ERRORS[e.message] || 'No se pudo leer el modelo: ') + (ERRORS[e.message] ? '' : e.message)); return; }
  // First, a guess from its shape (free, here).
  const guess = detectKind(shape);
  let kind = guess.kind, opts = { ...guess.opts }, yaw = guess.yaw, view = KINDS[kind].view, J, built = null, mirror = true, clip = KINDS[kind].move;
  if (yaw) shape = modelShape(g, yaw);
  J = proposeJoints(shape, kind, opts);

  const back = document.createElement('div'); back.id = 'rig-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal rig" style="text-align:start;width:min(1000px,96vw);max-width:96vw">
    <button class="modal-close">✕</button><h3>${t('Esqueleto automático')}</h3>
    <p class="host-help">${t('Elige qué es el modelo (Revela intenta adivinarlo) y arrastra las articulaciones a su sitio sobre el modelo; a la derecha ves cómo se mueve.')}</p>
    <div class="rig-kinds" role="radiogroup" aria-label="${t('¿Qué es?')}">${Object.entries(KINDS).map(([k, v]) =>
      `<button type="button" role="radio" data-kind="${k}" aria-checked="false" title="${t(v.label)}"><i class="ms">${v.icon}</i><span>${t(v.label)}</span></button>`).join('')}</div>
    <div class="rig-guess"><span class="rig-guess-txt"></span>
      <button type="button" class="mini2 rig-ai" title="${t('Envía tres imágenes pequeñas del modelo a la IA, que dice qué es y hacia dónde mira (cuesta menos de 1 crédito)')}"><i class="ms">auto_awesome</i> ${t('Detectar con IA')}</button>
      <span class="rig-ai-msg"></span></div>
    <div class="rig-bar">
      <label class="rig-count" hidden><span></span> <select></select></label>
      <div class="seg rig-views" role="group" aria-label="${t('Vista')}">${Object.entries(VIEW_LABELS).map(([v, [l, ic]]) => `<button type="button" data-view="${v}" aria-pressed="false"><i class="ms">${ic}</i> ${t(l)}</button>`).join('')}</div>
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
  const showGuess = (k, conf, byAi = false) => {
    q('.rig-guess-txt').innerHTML = `<i class="ms">${byAi ? 'auto_awesome' : 'lightbulb'}</i> ${byAi ? t('La IA dice que es:') : t('Parece:')} <b>${t(KINDS[k].label)}</b>${conf != null ? ` (${sureness(conf)})` : ''}`;
  };
  showGuess(kind, guess.confidence);

  // ---- The flat view: from the front, the side or above (each kind has its usual one).
  let V, tris;
  const cx = () => (shape.box.min[0] + shape.box.max[0]) / 2;
  function prepare() { V = projectView(shape, view, cv.width, 30); tris = viewTriangles(shape, V); }
  const list = () => skeletonOf(kind, J);
  // Joints shown: from the side both of a pair are one point (the left one).
  const shown = () => list().map(([n]) => n).filter(n => view !== 'side' || !(/R$/.test(n) && J[mirrorOf(n)]));
  let hover = null, drag = null;
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height); paint(ctx, tris);
    const vis = new Set(shown());
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347';
    for (const [n, p] of list()) if (p && vis.has(n)) { ctx.beginPath(); ctx.moveTo(...toView(V, J[p])); ctx.lineTo(...toView(V, J[n])); ctx.stroke(); }
    for (const n of vis) {
      const [x, y] = toView(V, J[n]);
      ctx.beginPath(); ctx.arc(x, y, n === hover || n === drag ? 8 : 6, 0, 7);
      ctx.fillStyle = /L$/.test(n) ? '#4dabf7' : /R$/.test(n) ? '#ff6b6b' : '#ffd43b'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#1f2328'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347';
    }
    q('.rig-hint').textContent = hover ? jointLabel(hover, kind, t) : t('Arrastra los puntos');
  }
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  const nearest = p => { let best = null, d = 14; for (const n of shown()) { const s = toView(V, J[n]), dd = Math.hypot(s[0] - p[0], s[1] - p[1]); if (dd < d) { d = dd; best = n; } } return best; };
  cv.addEventListener('pointermove', e => {
    const p = at(e);
    if (!drag) { const h = nearest(p); if (h !== hover) { hover = h; cv.style.cursor = h ? 'grab' : ''; draw(); } return; }
    const u = (p[0] - V.ox) / V.k, v = (V.oy - p[1]) / (V.sv * V.k);
    J[drag] = J[drag].slice(); J[drag][V.u] = u; J[drag][V.v] = v;
    const m = mirrorOf(drag);
    if (m && J[m]) {
      J[m] = J[m].slice();
      if (view === 'side') { J[m][V.u] = u; J[m][V.v] = v; }               // (the hidden twin follows)
      else if (mirror) { J[m][V.v] = v; if (V.u === 0) J[m][0] = 2 * cx() - u; else J[m][V.u] = u; }
    }
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
    const all = CLIPS[kind]; if (!all.some(([c]) => c === clip)) clip = KINDS[kind].move;
    q('.rig-clips').innerHTML = all.map(([c]) => `<button type="button" class="mini2" data-clip="${c}" aria-pressed="${c === clip}">${t(CLIP_LABELS[c])}</button>`).join('');
    mv.animationName = clip;
  }
  q('.rig-clips').addEventListener('click', e => { const c = e.target.closest('[data-clip]')?.dataset.clip; if (!c) return; clip = c; clips(); mv.play?.(); });
  mv.addEventListener('load', () => { mv.animationName = clip; mv.play?.(); });

  // ---- Kind, counts and view.
  function syncBar() {
    back.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.kind === kind)));
    back.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.view === view)));
    const c = KINDS[kind].count, box = q('.rig-count'); box.hidden = !c;
    if (c) {
      const n = countOf(kind, opts), choices = [...new Set([...c.options, n])].sort((a, b) => a - b);
      box.querySelector('span').textContent = t(c.label);
      box.querySelector('select').innerHTML = choices.map(v => `<option value="${v}"${v === n ? ' selected' : ''}>${v}</option>`).join('');
    }
  }
  const reset = () => { J = proposeJoints(shape, kind, opts); syncBar(); prepare(); draw(); clips(); rebuild(); };
  back.querySelectorAll('[data-kind]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.kind === kind) return;
    kind = btn.dataset.kind; opts = {}; view = KINDS[kind].view; clip = KINDS[kind].move; reset();
  }));
  q('.rig-count select').addEventListener('change', e => { opts = { ...opts, [KINDS[kind].count.key]: +e.target.value }; reset(); });
  back.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => { view = btn.dataset.view; syncBar(); prepare(); draw(); }));
  q('.rig-turn').addEventListener('click', () => { yaw = (yaw + 90) % 360; shape = modelShape(g, yaw); reset(); });
  q('.rig-again').addEventListener('click', reset);
  q('.rig-mirror').addEventListener('change', e => { mirror = e.target.checked; });

  // ---- Asking the AI: three small pictures (front, side, top).
  const SNAP = 384;
  function pictures() {
    const views = {}, images = {}, c = document.createElement('canvas'); c.width = c.height = SNAP;
    const x = c.getContext('2d');
    for (const v of ['front', 'side', 'top']) { views[v] = projectView(shape, v, SNAP, 24); paint(x, viewTriangles(shape, views[v]), '#ffffff'); images[v] = c.toDataURL('image/jpeg', 0.82); }
    return { views, images };
  }
  const aiMsg = (html = '') => { q('.rig-ai-msg').innerHTML = html; };
  q('.rig-ai').addEventListener('click', async () => {
    if (!aiConnected()) {
      aiMsg(`${t('Para usarlo, conecta la IA (pestaña IA ▸ Ajustes de IA) o entra con tu cuenta de Revela.')} <button type="button" class="mini2 rig-ai-on">${t('Conectar la IA')}</button>`);
      q('.rig-ai-on').addEventListener('click', () => aiReady());
      return;
    }
    if (!privacyAccepted()) {
      if (!(await confirmDialog(t('Se envían tres imágenes pequeñas del modelo (de frente, de lado y desde arriba) a OpenRouter y al proveedor del modelo de IA.') + ' ' + t('¿Continuar?')))) return;
      acceptPrivacy();
    }
    const btn = q('.rig-ai'); btn.disabled = true; aiMsg(`<i class="ms">hourglass_top</i> ${t('La IA está mirando el modelo…')}`);
    let cost = null;
    try {
      const { views, images } = pictures(), ans = await detectWithAI(images, { onUsage: u => { cost = u; } });
      const hints = pointsFromViews(views, ans.marks);
      kind = ans.kind; opts = { ...ans.opts }; view = KINDS[kind].view; clip = KINDS[kind].move;
      if (ans.turn) { yaw = (yaw + ans.turn) % 360; shape = modelShape(g, yaw); }
      reset();
      J = seedJoints(shape, kind, J, hints, ans.turn); draw(); rebuild();
      showGuess(kind, null, true);
      const price = cost?.credits != null ? `${String(+cost.credits.toFixed(2)).replace('.', ',')} ${t('créditos')}` : cost?.usd != null ? `$${cost.usd.toFixed(4)}` : '';
      aiMsg((ans.turn ? t('Girado para que mire de frente.') + ' ' : '') + (price ? t('Coste:') + ' ' + price : ''));
    } catch (e) { aiMsg(''); aiFailed(e); }
    finally { btn.disabled = false; }
  });

  q('.rig-ok').addEventListener('click', () => {
    if (!built) return;
    const k = KINDS[kind];
    commit(() => {
      const x = currentSlide().blocks.find(y => y.id === b.id); if (!x) return;
      x.src = built; x.clip = 'Idle'; x.autoRotate = false;
      x.walk = { clip: k.move, end: k.end || '', endOnce: true, face: true, look: true };
    });
    close(); onDone?.();
  });
  reset();
  return { back, guess, get joints() { return J; }, get built() { return built; }, get kind() { return kind; }, get yaw() { return yaw; }, get view() { return view; } };
}
