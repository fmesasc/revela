// Efectos de mapas y 3D (Ver ▸ Mostrar ▸ Efectos, or «Ajustes de efectos…» in a map's badge): how much Revela may take away
// on this computer — automatic, every effect, the light mode, or the system's «reduce motion» only. The choice is kept
// in this browser (io/runtime/fx.js) and takes effect at once on the maps that are alive; «Now: …» says what the
// computer is doing today, so nobody is left wondering why a map doesn't fly or has no relief.
import { t } from '../../i18n/index.js';
import { fxRuntime, fxWords } from '../../io/runtime/fx.js';

export function installFx() {
  const F = fxRuntime(fxWords(t));
  F.openSettings ||= openEffects;
  return F;
}

const MODES = [
  ['auto', 'tune', 'Automático', 'Revela decide según tu equipo y tu sistema.'],
  ['full', 'bolt', 'Completos', 'Todos los efectos, aunque tu equipo vaya justo o tu sistema pida reducir el movimiento.'],
  ['lite', 'eco', 'Ligeros', 'Mapas y 3D con menos efectos y sin relieve 3D, para que vayan fluidos.'],
  ['motion', 'accessibility_new', 'Respetar «Reducir movimiento»', 'Efectos completos aunque tu equipo vaya justo; solo se reduce el movimiento si tu sistema lo pide.'],
];

export function nowText(F = installFx()) {
  const st = F.status(), out = [];
  if (st.mode === 'full') out.push(t('Ahora: efectos completos elegidos por ti.'));
  else if (st.mode === 'lite') out.push(t('Ahora: modo ligero elegido por ti.'));
  else if (st.mode === 'motion') out.push(t('Ahora: sin modo ligero; solo se reduce el movimiento si tu sistema lo pide.'));
  else if (st.nogl) out.push(t('Ahora: modo ligero porque tu equipo no tiene aceleración gráfica.'));
  else if (st.soft) out.push(t('Ahora: modo ligero porque tu equipo dibuja los gráficos con el procesador.'));
  else if (st.few) out.push(t('Ahora: carga reducida porque tu equipo tiene pocos núcleos o poca memoria; el relieve 3D se mantiene.'));
  else out.push(t('Ahora: efectos completos.'));
  if (st.media && st.mode !== 'full') out.push(fxWords(t).whyMotion);
  return out;
}

export function openEffects() {
  document.getElementById('fx-modal')?.remove();
  const F = installFx();
  const back = document.createElement('div'); back.id = 'fx-modal'; back.className = 'modal-backdrop';
  const card = ([m, icon, l, d]) => `<button type="button" class="ap-card fx-card${F.mode() === m ? ' on' : ''}" data-m="${m}" aria-pressed="${F.mode() === m}"><i class="ms">${icon}</i><span>${t(l)}</span><small>${t(d)}</small></button>`;
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="fx-h" style="text-align:start;width:min(540px,94vw);max-width:94vw">
    <button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3 id="fx-h">${t('Efectos de mapas y 3D')}</h3>
    <div class="ap-cards fx-cards">${MODES.map(card).join('')}</div>
    <p class="host-help fx-now" aria-live="polite"></p>
    <p class="host-help">${t('Se recuerda en este navegador y se aplica al momento a los mapas que ves.')}</p></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  const paint = () => {
    back.querySelectorAll('.fx-card').forEach(c => { const on = c.dataset.m === F.mode(); c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    q('.fx-now').innerHTML = nowText(F).map(s => `<span>${s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>`).join('');
  };
  back.querySelectorAll('.fx-card').forEach(c => c.addEventListener('click', () => { F.set(c.dataset.m); paint(); }));
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  paint(); q('.fx-card.on')?.focus();
}
