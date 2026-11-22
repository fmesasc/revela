// The desktop application's anonymous statistics, the interface: the one-time question at the first launch, the switch in
// Ayuda ▸ «Estadísticas de uso anónimas», and the start (desktop.js). What is kept and sent, and its rules: io/cloud/appstats.js
// (nothing is sent without an explicit «Aceptar»; privacy.html says so).
import { t } from '../../i18n/index.js';
import { EDITION } from '../../core/config.js';
import { MENU_NAME, statsState, setStats, sendOpen, forgetPending } from '../../io/cloud/appstats.js';
export { statsState };

// Where to change it, in words.
const where = () => t('Ayuda') + ' ▸ «' + t(MENU_NAME) + '»';
export const explainText = () => t('Si aceptas, esta aplicación enviará de forma anónima, cada vez que la abras (como mucho una vez cada 6 horas) y cuando inicies sesión: un número aleatorio generado en tu equipo (no es tu cuenta ni tu correo), la versión de Revela, tu sistema y tu idioma, y si el inicio de sesión salió bien o falló. Nunca se envían tus presentaciones, su contenido ni tu cuenta. Puedes cambiarlo cuando quieras en {where}; al desactivarlo se borra ese número, aquí y en nuestro servidor. Si no aceptas, no se envía nada.').replace('{where}', where());
export const thanksText = () => t('Gracias por ayudarnos. Puedes cambiarlo cuando quieras en {where}.').replace('{where}', where());
export const declinedText = () => t('De acuerdo: no se enviará nada. Si cambias de idea, puedes activarlo en {where}.').replace('{where}', where());
export const offText = () => t('Desactivado: se ha borrado el número de esta instalación y no se enviará nada más.');

// The question: resolves 'yes' or 'no' (Escape and the backdrop are «No»: nothing is sent unless it is said explicitly).
export function askStatsDialog() {
  return new Promise(resolve => {
    document.getElementById('appstats-modal')?.remove();
    const before = document.activeElement, back = document.createElement('div');
    back.id = 'appstats-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="apst-h" aria-describedby="apst-p" tabindex="-1" style="text-align:start;width:min(480px,94vw)">
      <h3 id="apst-h"></h3><p id="apst-p" class="host-help"></p>
      <div class="fr-actions"><button type="button" class="mini2 ap-no"></button><button type="button" class="mini2 ap-yes"></button></div></div>`;
    back.querySelector('#apst-h').textContent = t('¿Nos ayudas contando que abres la aplicación?');
    back.querySelector('#apst-p').textContent = explainText();
    back.querySelector('.ap-yes').textContent = t('Aceptar'); back.querySelector('.ap-no').textContent = t('No, gracias');
    const done = v => { document.removeEventListener('keydown', onKey, true); back.remove(); try { before?.focus?.(); } catch {} resolve(v); };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done('no'); }
      else if (e.key === 'Tab') {
        const b = [...back.querySelectorAll('button')], i = b.indexOf(document.activeElement);
        if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === b.length - 1)) { e.preventDefault(); b[e.shiftKey ? b.length - 1 : 0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(back);
    back.querySelector('.ap-yes').addEventListener('click', () => done('yes'));
    back.querySelector('.ap-no').addEventListener('click', () => done('no'));
    back.addEventListener('click', e => { if (e.target === back) done('no'); });
    back.querySelector('.modal').focus();
  });
}

// Asks and applies the answer (the first launch, and the menu's «on»). `say` shows the thanks (default: a toast).
export async function askStats({ ask = askStatsDialog, say, doFetch } = {}) {
  const a = await ask(), on = a === 'yes';
  say ||= async m => (await import('./toast.js')).toast(m);
  if (!(await setStats(on, { doFetch })) && on) { await say(declinedText()); return false; }     // (no storage to keep the number: not sent)
  await say(on ? thanksText() : declinedText());
  return on;
}
// The menu's switch: on asks (with the whole explanation); off deletes.
export async function toggleStats(o = {}) {
  if (statsState() === 'yes') { await setStats(false, o); await (o.say || (async m => (await import('./toast.js')).toast(m)))(offText()); return false; }
  return askStats(o);
}

// At launch (desktop.js initDesktop): the pending deletion, the opening if it was accepted, or the question the first time
// (after the editor is ready, never over a dialog or a presentation, and once per session with the other notices: newsask.js).
// Options are for the tests. Returns a stop function.
export function startAppStats({ edition = EDITION, testing = new URLSearchParams(location.search).has('test'), ask = askStats, delay = 4000, every = 3000, doFetch, now = () => Date.now() } = {}) {
  if (edition !== 'desktop' || testing) return () => {};
  let timer = null, stopped = false;
  const run = async () => {
    await forgetPending({ doFetch });
    const s = statsState();
    if (s === 'yes') { await sendOpen({ now: now(), doFetch }); return; }
    if (s !== '') return;
    const N = await import('./newsask.js'), S = (await import('../../core/session.js')).session;
    const tick = async () => {
      if (stopped || statsState() !== '') return;
      if (N.nudge.shown || N.busy() || S.present || document.visibilityState === 'hidden') { timer = setTimeout(tick, every); return; }
      N.nudge.shown = true;
      try { await ask({ doFetch }); } catch {}
    };
    tick();
  };
  timer = setTimeout(() => { run().catch(() => {}); }, delay);
  return () => { stopped = true; clearTimeout(timer); };
}
