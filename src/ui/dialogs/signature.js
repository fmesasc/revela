// "Signatures" dialog: sign the presentation, see who signed it and whether it
// changed afterwards, and this browser's key fingerprint (to tell others).

import { esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import { signDeck, verifyAll, myKey, removeSignatures } from '../../features/collab/signature.js';
import * as protect from '../../features/collab/protect.js';
import { author, setAuthor } from '../../features/collab/comments.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';

const STATUS = { valid: ['verified', 'Válida'], modified: ['warning', 'La presentación ha cambiado después de firmarla'], invalid: ['error', 'Firma no válida'] };

export async function openSignatures() {
  document.getElementById('sig-modal')?.remove();
  const back = document.createElement('div'); back.id = 'sig-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:min(380px,94vw);max-width:min(560px,94vw)">
    <button class="modal-close">✕</button><h3>${t('Firmas digitales')}</h3><div class="sg-list"></div>
    <h4>${t('Firmar')}</h4>
    <label class="fr-l">${t('Nombre')}<input class="sg-name" value="${esc(author())}"></label>
    <label class="fr-l">${t('Motivo (opcional)')}<input class="sg-reason" placeholder="${t('Apruebo esta presentación')}"></label>
    <p class="host-help">${t('Tu huella de firma:')} <code class="sg-fp">…</code><br>${t('La firma se hace con una clave que no sale de este navegador. Da tu huella a quien quiera comprobar que la firma es tuya. Al firmar, la presentación queda marcada como final.')}</p>
    <div class="fr-actions"><button class="mini2 sg-clear">${t('Quitar las firmas')}</button><button class="fr-do sg-sign">${t('Firmar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  myKey().then(k => { q('.sg-fp').textContent = k.fp; }).catch(() => { q('.sg-fp').textContent = '—'; });
  const paint = async () => {
    const list = await verifyAll();
    q('.sg-clear').hidden = !list.length;
    q('.sg-list').innerHTML = !list.length ? `<p class="host-help">${t('Esta presentación no está firmada.')}</p>`
      : list.map(s => `<div class="sg-item sg-${s.status}"><i class="ms">${STATUS[s.status][0]}</i><div><b>${esc(s.name)}</b> · ${new Date(s.at).toLocaleString()}
          ${s.reason ? `<div>${esc(s.reason)}</div>` : ''}<div class="sg-st">${t(STATUS[s.status][1])}</div><div class="host-help">${t('Huella:')} <code>${esc(s.fp)}</code></div></div></div>`).join('');
  };
  q('.sg-sign').addEventListener('click', async () => {
    const name = q('.sg-name').value.trim();
    if (!name) return alertDialog(t('Escribe tu nombre para firmar.'));
    setAuthor(name);
    try { await signDeck({ name, reason: q('.sg-reason').value }); q('.sg-reason').value = ''; paint(); }
    catch (e) { alertDialog(t('No se pudo firmar: ') + (e.message || e)); }
  });
  q('.sg-clear').addEventListener('click', async () => { if (await confirmDialog(t('¿Quitar todas las firmas?'))) { removeSignatures(); paint(); } });
  await paint();
}

// "Edit anyway" on a final presentation: its signatures stop being valid.
export async function editAnyway() {
  if (state.deck.signatures?.length && !(await confirmDialog(t('Esta presentación está firmada. Si la cambias, las firmas dejarán de ser válidas. ¿Editarla de todos modos?')))) return;
  protect.setFinal(false);
}
export const toggleFinal = () => (protect.isFinal() ? editAnyway() : protect.setFinal(true));
