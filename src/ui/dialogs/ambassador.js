// «Embajadores de Revela» in My account: apply (server/cloudflare/crm.js), the application's status, and — once
// approved — the badge with its check link, to show it in a CV, an email signature or a blog.

import { esc } from '../../core/text.js';
import { api, apiBase, account } from '../../io/cloud/account.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';
import { toast } from '../shell/toast.js';
import { SUBJECT_NAMES } from './community.js';

const site = () => new URL('/', apiBase()).href.replace(/\/$/, '');

// The section in My account (box: an element there); calls back to open the form.
export async function paintAmbassador(box) {
  if (!apiBase() || !box) return;
  const { amb } = await api('ambassadors/me').catch(() => ({ amb: undefined })); if (amb === undefined) return;
  box.hidden = false;
  if (!amb || amb.status === 'rejected' || amb.status === 'ended') {
    box.innerHTML = `<summary>${t('Embajadores de Revela')}</summary><p class="host-help">${t('¿Enseñas Revela a tus compañeros? Como embajador o embajadora tienes Pro gratis, una insignia verificable y materiales para formar a tu claustro.')}</p>
      <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 amb-go">${t('Hazte embajador')}</button><a class="mini2" href="${site()}/embajadores" target="_blank" rel="noopener">${t('Saber más')}</a></div>`;
    box.querySelector('.amb-go').addEventListener('click', () => openAmbassadorForm(() => paintAmbassador(box)));
  } else if (amb.status === 'pending') {
    box.innerHTML = `<summary>${t('Embajadores de Revela')}</summary><p class="host-help">${t('Tu solicitud está en revisión. Te escribiremos en unos días.')}</p>`;
  } else {
    const verify = `${site()}/embajadores?v=${amb.code}`, badge = `${site()}/api/ambassadors/badge/${amb.code}.svg`;
    box.innerHTML = `<summary>${t('Embajadores de Revela')}</summary><img src="${esc(badge)}" alt="${esc(t('Insignia de embajador de Revela'))}" style="width:100%;max-width:360px;display:block;margin:6px 0;border-radius:10px">
      <p class="host-help">${t('Ponla en tu currículum, tu firma o tu blog: su enlace demuestra que es real.')}</p>
      <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap"><button type="button" class="mini2 amb-copy">${t('Copiar el enlace de verificación')}</button><a class="mini2" href="${esc(badge)}" download="insignia-revela.svg">${t('Descargar la insignia')}</a></div>`;
    box.querySelector('.amb-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(verify); toast(t('Enlace copiado')); } catch { alertDialog(verify); } });
  }
  // (Come from revelaslides.com/embajadores: the section open, and the form if not applied yet.)
  if (new URLSearchParams(location.search).has('embajador')) {
    history.replaceState(null, '', location.pathname); box.open = true;
    if (!amb || amb.status === 'rejected' || amb.status === 'ended') openAmbassadorForm(() => paintAmbassador(box));
  }
}

export function openAmbassadorForm(done = () => {}) {
  document.getElementById('amb-modal')?.remove();
  const back = document.createElement('div'); back.id = 'amb-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(560px,96vw);max-width:none"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button>
    <h3>${t('Hazte embajador de Revela')}</h3>
    <p class="host-help">${t('Te pedimos que enseñes Revela en tu centro (una sesión con el claustro, por ejemplo) y que compartas alguna presentación en la comunidad. A cambio: Pro gratis, tu insignia y acceso anticipado a novedades.')}</p>
    <div class="fr-row"><label class="fr-l">${t('Tu nombre')}<input type="text" class="amb-name" maxlength="80" value="${esc(account()?.name || '')}"></label>
      <label class="fr-l">${t('Cargo')}<input type="text" class="amb-role" maxlength="80"></label></div>
    <div class="fr-row"><label class="fr-l">${t('Centro o empresa')}<input type="text" class="amb-center" maxlength="120"></label>
      <label class="fr-l">${t('Ciudad')}<input type="text" class="amb-city" maxlength="80"></label></div>
    <label class="fr-l">${t('Materia')}<select class="amb-subject">${Object.entries(SUBJECT_NAMES).map(([k, l]) => `<option value="${k}">${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('¿Cómo lo darías a conocer?')}<textarea class="amb-plan" rows="3" maxlength="1200" placeholder="${t('Una sesión con el claustro, un curso del centro de formación, compartir materiales…')}"></textarea></label>
    <label class="fr-chk"><input type="checkbox" class="amb-listed" checked> ${t('Aparecer en el directorio público de embajadores (nombre, centro y ciudad)')}</label>
    <p class="amb-note host-help"></p>
    <div class="fr-actions"><button type="button" class="fr-do amb-send">${t('Enviar la solicitud')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.amb-send').addEventListener('click', async () => {
    q('.amb-send').disabled = true;
    try {
      await api('ambassadors/apply', { name: q('.amb-name').value, role: q('.amb-role').value, center: q('.amb-center').value, city: q('.amb-city').value, subject: q('.amb-subject').value,
        plan: q('.amb-plan').value, listed: q('.amb-listed').checked, lang: currentLang() });
      close(); toast(t('Solicitud enviada: te escribiremos en unos días.')); done();
    } catch (e) {
      q('.amb-send').disabled = false;
      q('.amb-note').textContent = e.data?.error === 'plan' ? t('Cuéntanos un poco más cómo lo darías a conocer.') : e.data?.error === 'center' ? t('Escribe tu centro o empresa.') : e.data?.error === 'name' ? t('Escribe tu nombre.') : `${t('Algo ha fallado:')} ${e.message}`;
    }
  });
}
