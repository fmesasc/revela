// «Informar de un problema»: a message to Revela's support (server/cloudflare/admin.js,
// POST /api/support), signed in or with an email address to answer to. Sent with it: the
// app's version, the browser and the presentation's name; its content only if ticked.
// The open edition has no server of Revela's: it points to GitHub instead.

import { EDITION, APP_VERSION } from '../../core/config.js';
import { state } from '../../core/store.js';
import { approxSize } from '../../core/model.js';
import * as acc from '../../io/cloud/account.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';

export const REPORT_CATEGORIES = { bug: 'Algo no funciona', ai: 'La IA', cloud: 'Presentaciones en la nube', account: 'Mi cuenta', billing: 'Pagos y facturas', other: 'Otra cosa' };
const MAX_ATTACH = 1500 * 1024;                              // (as the server's SUPPORT_ATTACH_KB)
const ISSUES = 'https://github.com/fmesasc/revela/issues';
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]+\.[a-z]{2,}$/i;

export function openReport() {
  document.getElementById('report-modal')?.remove();
  const back = document.createElement('div'); back.id = 'report-modal'; back.className = 'modal-backdrop';
  const close = () => back.remove();
  if (!acc.hasAccounts()) {
    back.innerHTML = `<div class="modal" style="text-align:start;width:min(460px,94vw)"><button class="modal-close">✕</button><h3>${t('Informar de un problema')}</h3><p class="host-help rp-ver">Revela ${APP_VERSION}</p>
      <p class="host-help">${t('Cuéntanos qué hacías, qué esperabas y qué pasó en GitHub. Una captura ayuda mucho.')}</p>
      <div class="fr-actions"><a class="fr-do" href="${ISSUES}" target="_blank" rel="noopener">${t('Abrir una consulta en GitHub')}</a></div></div>`;
  } else {
    const me = acc.account(), deckName = String(state.deck?.name || '').trim();
    back.innerHTML = `<div class="modal" style="text-align:start;width:min(500px,94vw)"><button class="modal-close">✕</button><h3>${t('Informar de un problema')}</h3><p class="host-help rp-ver">Revela ${APP_VERSION}</p>
      <form class="rp-form" novalidate>
        <p class="host-help">${t('Cuéntanos qué hacías, qué esperabas y qué pasó. Te responderemos por correo.')}</p>
        <label class="fr-l">${t('Tipo de problema')}<select class="rp-cat">${Object.entries(REPORT_CATEGORIES).map(([k, v]) => `<option value="${k}">${t(v)}</option>`).join('')}</select></label>
        <label class="fr-l">${t('Qué ha pasado')}<textarea class="rp-msg" rows="6" maxlength="5000" required></textarea></label>
        ${me ? `<p class="host-help">${t('Te responderemos al correo de tu cuenta.')}</p>`
          : `<label class="fr-l">${t('Tu correo (para responderte)')}<input type="email" class="rp-email" maxlength="200" autocomplete="email" required></label>`}
        <label class="rp-trap" aria-hidden="true" inert style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">Web<input type="text" class="rp-web" tabindex="-1" autocomplete="off"></label>
        <label class="fr-chk"><input type="checkbox" class="rp-attach"> ${t('Adjuntar la presentación (nos ayuda a ver el problema)')}</label>
        <p class="host-help">${t('Se envían también la versión de Revela, el navegador y el nombre de la presentación; su contenido, solo si marcas la casilla.')}</p>
        <div class="fr-actions"><button type="button" class="mini2 rp-cancel">${t('Cancelar')}</button><button type="submit" class="fr-do rp-send">${t('Enviar')}</button></div>
      </form></div>`;
    const f = back.querySelector('.rp-form'), send = back.querySelector('.rp-send');
    back.querySelector('.rp-cancel').addEventListener('click', close);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const message = f.querySelector('.rp-msg').value.trim(), email = f.querySelector('.rp-email')?.value.trim() || '';
      if (message.length < 5) return alertDialog(t('Escribe un poco más: qué hacías y qué pasó.'));
      if (!me && !EMAIL.test(email)) return alertDialog(t('Escribe un correo válido para poder responderte.'));
      let attach;
      if (f.querySelector('.rp-attach').checked) {
        attach = approxSize(state.deck) > MAX_ATTACH * 2 ? '' : JSON.stringify(state.deck);   // (a big one isn't even written out)
        if (!attach || attach.length > MAX_ATTACH) return alertDialog(t('La presentación es demasiado grande para adjuntarla: envíalo sin ella.'));
      }
      send.disabled = true;
      try {
        const r = await acc.api('support', { category: f.querySelector('.rp-cat').value, message, ...(!me && { email }), version: `${EDITION} ${APP_VERSION}`,
          browser: `${navigator.userAgent} · ${navigator.language} · ${innerWidth}×${innerHeight}`, ...(deckName && { deckName }), ...(attach && { attach }),
          lang: document.documentElement.lang || 'es', website: f.querySelector('.rp-web').value });
        close();
        alertDialog((r.mailed ? t('Enviado. Tu consulta es la número #{n}; te hemos enviado un correo con ella.') : t('Enviado. Tu consulta es la número #{n}.')).replace('{n}', r.id));
      } catch (err) {
        send.disabled = false;
        alertDialog(err.status === 429 ? t('Has enviado muchos informes hoy. Vuelve a intentarlo mañana.') : err.status === 413 ? t('La presentación es demasiado grande para adjuntarla: envíalo sin ella.')
          : err.status === 400 && err.data?.error === 'email' ? t('Escribe un correo válido para poder responderte.') : `${t('Algo ha fallado:')} ${err.message}`);
      }
    });
  }
  document.body.appendChild(back);
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.rp-msg')?.focus();
}
