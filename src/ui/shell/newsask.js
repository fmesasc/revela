// Asking, once, whether to get Revela's news by email (cloud edition, signed in). The boxes of the sign-in and of «Mi cuenta»
// stay unticked (consent is asked, never assumed — GDPR / LSSI art. 21): this is the nicer way to ask. It comes only after the
// person has really used the editor, never over a dialog, a backstage or a presentation, and only once per browser: closing
// it without choosing counts as no answer but is not asked again. «Sí» is the same as ticking the box in «Mi cuenta».
import { t } from '../../i18n/index.js';
import { EDITION } from '../../core/config.js';
import { session } from '../../core/session.js';
import { subscribe } from '../../core/store.js';
import { account, onAccount, api } from '../../io/cloud/account.js';
import { toast } from './toast.js';

const KEY = 'revela.news.asked';
export const newsAsked = () => { try { return !!localStorage.getItem(KEY); } catch { return true; } };      // (no storage: never, rather than every time)
const markAsked = v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} };
const busy = () => !!document.querySelector('.modal-backdrop:not([hidden]), #backstage:not([hidden]), #present-overlay:not([hidden]), #tour');

// The question: resolves 'yes', 'no' or null (closed without choosing).
export function askNewsDialog() {
  return new Promise(resolve => {
    document.getElementById('newsask-modal')?.remove();
    const before = document.activeElement, back = document.createElement('div');
    back.id = 'newsask-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="newsask-h" aria-describedby="newsask-p" tabindex="-1" style="text-align:start;width:min(440px,94vw)">
      <h3 id="newsask-h"></h3><p id="newsask-p" class="host-help"></p>
      <div class="fr-actions"><button type="button" class="mini2 na-no"></button><button type="button" class="mini2 na-yes"></button></div></div>`;
    back.querySelector('#newsask-h').textContent = t('¿Quieres enterarte de lo nuevo de Revela por correo?');
    back.querySelector('#newsask-p').textContent = t('Te escribiremos solo cuando haya algo que merezca la pena, y puedes darte de baja cuando quieras. Si cierras este aviso sin elegir, no te lo volveremos a preguntar.');
    back.querySelector('.na-yes').textContent = t('Sí, avisadme'); back.querySelector('.na-no').textContent = t('No, gracias');
    const done = v => { document.removeEventListener('keydown', onKey, true); back.remove(); try { before?.focus?.(); } catch {} resolve(v); };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); }
      else if (e.key === 'Tab') {                                                                  // (focus stays inside)
        const b = [...back.querySelectorAll('button')], i = b.indexOf(document.activeElement);
        if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === b.length - 1)) { e.preventDefault(); b[e.shiftKey ? b.length - 1 : 0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(back);
    back.querySelector('.na-yes').addEventListener('click', () => done('yes'));
    back.querySelector('.na-no').addEventListener('click', () => done('no'));
    back.addEventListener('click', e => { if (e.target === back) done(null); });
    back.querySelector('.modal').focus();
  });
}

// Watches the editor: after `minChanges` edits and `minMs` of use, asks if nothing else forbids it. Returns a stop function.
// (Options are for the tests: edition, the account, the call to the server.)
export function watchNewsAsk({ edition = EDITION, me = account, onMe = onAccount, call = api, every = 5000, minChanges = 12, minMs = 120000 } = {}) {
  if (edition !== 'cloud') return () => {};
  const t0 = performance.now(); let changes = 0, asking = false;
  const off = subscribe(() => { changes++; });
  const check = async () => {
    const m = me();
    if (asking || !m || m.news || newsAsked() || changes < minChanges || performance.now() - t0 < minMs) return;
    if (session.present || busy() || document.visibilityState === 'hidden') return;
    asking = true; markAsked('shown');                                    // (marked before: a crash or a closed tab won't repeat it)
    try {
      const a = await askNewsDialog();
      if (a === 'yes') {
        try { const p = await call('mail/prefs', { news: true }); markAsked('yes'); if (p?.news) toast(t('Listo: te avisaremos por correo. Puedes cambiarlo en «Mi cuenta».')); }
        catch { markAsked(''); }                                          // (it failed: another time)
      } else if (a === 'no') markAsked('no');
    } finally { asking = false; }
  };
  const timer = setInterval(check, every), offMe = onMe(() => {});
  return () => { clearInterval(timer); off(); offMe?.(); };
}
