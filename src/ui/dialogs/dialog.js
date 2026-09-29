// Small promise‑based dialogs to replace the browser's prompt/confirm/alert,
// so they are styled and translatable.

import { t } from '../../i18n/index.js';

function dialog({ msg, kind, value = '' }) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    const input = kind === 'prompt'
      ? `<input class="dlg-in" type="text" value="${(value || '').replace(/"/g, '&quot;')}">` : '';
    const cancel = kind !== 'alert' ? `<button class="dlg-cancel mini2">${t('Cancelar')}</button>` : '';
    back.innerHTML = `<div class="modal" style="min-width:300px;text-align:left">
      <p class="dlg-msg" style="white-space:pre-line"></p>${input}
      <div class="fr-actions" style="justify-content:flex-end;gap:8px">${cancel}<button class="fr-do dlg-ok">${t('Aceptar')}</button></div></div>`;
    back.querySelector('.dlg-msg').textContent = msg ?? '';          // (text: file names and error messages can't become HTML)
    document.body.appendChild(back);
    const done = v => { back.remove(); resolve(v); };
    const inp = back.querySelector('.dlg-in');
    back.querySelector('.dlg-ok').addEventListener('click', () => done(kind === 'prompt' ? (inp.value) : true));
    back.querySelector('.dlg-cancel')?.addEventListener('click', () => done(kind === 'confirm' ? false : null));
    back.addEventListener('click', e => { if (e.target === back) done(kind === 'alert' ? true : (kind === 'confirm' ? false : null)); });
    if (inp) { inp.focus(); inp.select(); inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(inp.value); }); }
  });
}

export const confirmDialog = msg => dialog({ msg, kind: 'confirm' });
export const promptDialog = (msg, value = '') => dialog({ msg, kind: 'prompt', value });
export const alertDialog = msg => dialog({ msg, kind: 'alert' });
