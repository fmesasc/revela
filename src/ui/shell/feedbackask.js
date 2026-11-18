// Asking, once, for the person's opinion — they almost never write to us. After ~25 minutes of real use of the editor (counted
// here, in this browser: the time is NEVER sent nor logged anywhere), if they have never given feedback nor turned this question
// down, a friendly question appears: «¿Qué tal te va con Revela?». «Dar mi opinión» opens the feedback form (dialogs/report.js,
// opinion mode); «Ahora no» (or Escape, or cancelling the form) says where to leave comments later. Asked once per browser;
// any opinion sent from anywhere (the Help entry «Enviar una opinión o una idea» too) marks it as given and it is never asked again.
// Never while testing, in a presentation, over a dialog, or in the same session as the «news by email» question (newsask.js).
import { t } from '../../i18n/index.js';
import { EDITION } from '../../core/config.js';
import { session } from '../../core/session.js';
import { nudge, busy } from './newsask.js';

const KEY = 'revela.feedback.state', TIME = 'revela.feedback.ms';
export const IDEA_NAME = 'Enviar una opinión o una idea';              // (the Help entry's name: the palette and the messages use it)
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
// 'dado' | 'ahora-no' | '' (never answered). No storage → counts as answered (never, rather than every time).
export const feedbackState = () => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s?.state || ''; } catch (e) { return e instanceof SyntaxError ? '' : 'ahora-no'; } };
export const markFeedback = state => { if (state === 'ahora-no' && feedbackState() === 'dado') return; write(KEY, JSON.stringify({ state, at: new Date().toISOString() })); };
export const usedMs = () => Math.max(0, +read(TIME) || 0);
const MAC = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform || '');

// Where to leave comments, in words (the ribbon's «Ver ▸ Ayuda» or the desktop app's «Ayuda» menu; the command palette in both).
export function whereText(key) {
  const name = t(IDEA_NAME), where = globalThis.__TAURI__ ? t('Ayuda') : `${t('Ver')} ▸ ${t('Ayuda')}`, k = MAC ? '⌘K' : 'Ctrl+K';
  return t(key).replace('{name}', name).replace('{where}', where).replace('{key}', k);
}
export const thanksText = () => whereText('Gracias por tu opinión. Lo tendremos en cuenta, y tus comentarios siempre serán bienvenidos: puedes enviarlos cuando quieras con «{name}», en {where} o en la paleta de comandos ({key}).');
export const laterText = () => whereText('Sin problema. Cuando quieras, puedes dejarnos tus comentarios con «{name}», en {where} o en la paleta de comandos ({key}). Siempre serán bienvenidos.');

// The question: resolves 'yes', 'no' (Not now) — Escape and the backdrop are «Ahora no» too.
export function askFeedbackDialog() {
  return new Promise(resolve => {
    document.getElementById('feedbackask-modal')?.remove();
    const before = document.activeElement, back = document.createElement('div');
    back.id = 'feedbackask-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="fbask-h" aria-describedby="fbask-p" tabindex="-1" style="text-align:start;width:min(440px,94vw)">
      <h3 id="fbask-h"></h3><p id="fbask-p" class="host-help"></p>
      <div class="fr-actions"><button type="button" class="mini2 fb-no"></button><button type="button" class="fr-do fb-yes"></button></div></div>`;
    back.querySelector('#fbask-h').textContent = t('¿Qué tal te va con Revela?');
    back.querySelector('#fbask-p').textContent = t('Llevas un rato con Revela y nos encantaría saber qué piensas: qué te gusta, qué echas de menos y qué mejorarías. Leemos todo lo que llega y solo te lleva un minuto.');
    back.querySelector('.fb-yes').textContent = t('Dar mi opinión'); back.querySelector('.fb-no').textContent = t('Ahora no');
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
    back.querySelector('.fb-yes').addEventListener('click', () => done('yes'));
    back.querySelector('.fb-no').addEventListener('click', () => done('no'));
    back.addEventListener('click', e => { if (e.target === back) done('no'); });
    back.querySelector('.modal').focus();
  });
}

// What happens after the question (also called by the tests): «Ahora no» → where; «Dar mi opinión» → the form.
export async function askFeedback({ say, openForm } = {}) {
  const a = await askFeedbackDialog();
  say ||= async m => (await import('../dialogs/dialog.js')).alertDialog(m);
  openForm ||= async o => (await import('../dialogs/report.js')).openReport(o);
  if (a === 'yes') await openForm({ opinion: true, onCancel: () => say(laterText()) });   // (answered already, marked as 'ahora-no' when asked; sending the form makes it 'dado')
  else await say(laterText());
}

// Watches the editor: counts the ACTIVE time (tab visible, some interaction in the last minute, not presenting) and asks at `minMs`.
// Options are for the tests. Returns a stop function.
export function watchFeedbackAsk({ edition = EDITION, testing = new URLSearchParams(location.search).has('test'), every = 5000, minMs = 25 * 60000, idleMs = 60000,
  now = () => Date.now(), visible = () => document.visibilityState !== 'hidden', ask = askFeedback } = {}) {
  if (testing || edition === 'open') return () => {};                        // (the open edition has no server of ours: the Help entry points to GitHub)
  nudge.shown = false;
  let last = now(), lastInput = now(), asking = false;
  const touch = () => { lastInput = now(); };
  const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'pointermove'];
  evs.forEach(e => addEventListener(e, touch, { capture: true, passive: true }));
  const tick = async () => {
    const n = now(), dt = Math.min(n - last, every * 3); last = n;          // (a sleeping laptop's gap is not use)
    if (feedbackState() || asking || nudge.shown) return;
    if (visible() && !session.present && n - lastInput <= idleMs && dt > 0) write(TIME, String(usedMs() + dt));
    if (usedMs() < minMs || !visible() || session.present || busy()) return;
    asking = nudge.shown = true; markFeedback('ahora-no');                   // (marked before: a crash or a closed tab won't repeat it)
    try { await ask(); } finally { asking = false; }
  };
  const timer = setInterval(tick, every);
  return () => { clearInterval(timer); evs.forEach(e => removeEventListener(e, touch, { capture: true })); };
}
