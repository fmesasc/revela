// "My account" (official edition and desktop app): sign in, plan, credits,
// buying (Stripe, when the server has it), and signing out. Everything shown
// comes from the server; nothing here grants anything.

import { esc } from '../../core/text.js';
import { EDITION, OFFICIAL_SITE } from '../../core/config.js';
import * as acc from '../../io/cloud/account.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog, promptDialog } from './dialog.js';
import { openTeam } from './team.js';

const FEATURE_NAMES = { ai: 'IA incluida', 'share-people': 'Compartir con personas', 'cloud-save': 'Guardado en la nube', 'video-calls': 'Videollamadas en el editor', 'premium-templates': 'Plantillas premium' };
const errorText = e => (e.message === 'CANCELLED' ? t('No se ha iniciado sesión.') : e.message === 'EXPIRED' ? t('Se acabó el tiempo para confirmar. Vuelve a intentarlo.') : `${t('Algo ha fallado:')} ${e.message}`);

// (buy: a product chosen on the prices page — ?comprar=pro-year —, paid for as soon as there is a session.)
export const BUYABLE = ['pro-month', 'pro-year', 'credits-500', 'credits-1500'];
export function openAccount({ buy } = {}) {
  document.getElementById('account-modal')?.remove();
  const back = document.createElement('div'); back.id = 'account-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(440px,94vw)"><button class="modal-close">✕</button><h3>${t('Mi cuenta de Revela')}</h3><div class="acc-body"></div></div>`;
  document.body.appendChild(back);
  const body = back.querySelector('.acc-body'), close = () => { abort?.abort(); back.remove(); };
  let abort = null;
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  const render = () => {
    const me = acc.account();
    if (!me) {
      body.innerHTML = `<p class="host-help">${t('Inicia sesión para usar la IA incluida, sin claves. Las cuentas nuevas reciben créditos de regalo para probarla.')}</p>
        <div class="acc-code" hidden></div>
        <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do acc-login">${t(EDITION === 'desktop' ? 'Iniciar sesión en el navegador' : 'Iniciar sesión con Google')}</button></div>
        <p class="host-help" style="font-size:12px"><a href="${OFFICIAL_SITE}/pricing" target="_blank" rel="noopener">${t('Ver planes y precios')}</a></p>`;
      body.querySelector('.acc-login').addEventListener('click', async e => {
        e.target.disabled = true;
        try {
          if (EDITION === 'desktop') {
            abort = new AbortController();
            const box = body.querySelector('.acc-code');
            await acc.desktopSignIn({ signal: abort.signal, onCode: code => { box.hidden = false;
              box.innerHTML = `${t('Se ha abierto tu navegador. Inicia sesión allí y confirma este código:')}<b>${esc(code)}</b>`; } });
          } else await acc.signIn();
          render();
        } catch (err) { e.target.disabled = false; if (err.message !== 'CANCELLED' || EDITION !== 'desktop') alertDialog(errorText(err)); }
      });
      return;
    }
    if (buy && BUYABLE.includes(buy) && me.billing && !(me.plan === 'pro' && buy.startsWith('pro'))) { const b = buy; buy = null; acc.buy(b).catch(e => alertDialog(errorText(e))); }
    const pro = me.plan === 'pro', until = me.until ? new Date(me.until).toLocaleDateString(currentLang(), { dateStyle: 'long' }) : '';
    body.innerHTML = `<div class="acc-who">${esc(me.email)}</div>
      <div class="acc-plan"><span class="acc-badge${pro ? ' pro' : ''}">${t(pro ? 'Pro' : 'Gratis')}</span>${pro && until ? `<small>${t('Renovación:')} ${esc(until)}</small>` : ''}</div>
      <div class="acc-credits"><b>${Math.max(0, me.credits | 0)}</b> ${t('créditos')}</div>
      <ul class="acc-features">${(me.features || []).map(f => `<li>✓ ${t(FEATURE_NAMES[f] || f)}</li>`).join('')}</ul>
      <div class="acc-buy">
        ${pro ? '' : `<button type="button" class="fr-do" data-buy="pro-month"${me.billing ? '' : ' disabled'}>${t('Pro mensual')}</button><button type="button" class="fr-do" data-buy="pro-year"${me.billing ? '' : ' disabled'}>${t('Pro anual')}</button>`}
        <button type="button" class="mini2" data-buy="credits-500"${me.billing ? '' : ' disabled'}>${t('500 créditos')}</button>
        <button type="button" class="mini2" data-buy="credits-1500"${me.billing ? '' : ' disabled'}>${t('1500 créditos')}</button>
      </div>
      ${me.billing ? '' : `<p class="host-help" style="font-size:12px">${t('Los pagos estarán disponibles muy pronto.')}</p>`}
      <div class="fr-actions" style="justify-content:space-between">
        ${pro ? `<button type="button" class="mini2 acc-portal">${t('Gestionar la suscripción')}</button>` : '<span></span>'}
        <button type="button" class="mini2 acc-out">${t('Cerrar sesión')}</button></div>
      <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 acc-team"><i class="ms">groups</i> ${me.team ? esc(me.team.name) : t('Equipos y centros')}</button></div>
      <details class="acc-data"><summary>${t('Tus datos')}</summary>
        <p class="host-help">${t('Descarga una copia de todo lo que guarda tu cuenta, o elimínala con todas tus presentaciones en la nube. Las facturas las conserva Stripe, como exige la ley.')}</p>
        <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap"><button type="button" class="mini2 acc-export">${t('Descargar mis datos')}</button>
          <button type="button" class="mini2 acc-delete">${t('Eliminar mi cuenta')}</button></div></details>`;
    body.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => acc.buy(b.dataset.buy).catch(e => alertDialog(errorText(e)))));
    body.querySelector('.acc-portal')?.addEventListener('click', () => acc.manageBilling().catch(e => alertDialog(errorText(e))));
    body.querySelector('.acc-out').addEventListener('click', async () => { await acc.signOut(); render(); });
    body.querySelector('.acc-team').addEventListener('click', () => { close(); openTeam(); });
    body.querySelector('.acc-export').addEventListener('click', async () => {
      try { const d = await acc.api('account/export'); const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })); a.download = 'revela-mis-datos.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      } catch (e) { alertDialog(errorText(e)); }
    });
    body.querySelector('.acc-delete').addEventListener('click', async () => {
      if (EDITION === 'desktop') { window.__TAURI__?.opener?.openUrl?.(OFFICIAL_SITE + '/app/'); return alertDialog(t('Por seguridad, la cuenta se elimina desde la web: se ha abierto revelaslides.com. Inicia sesión allí y usa «Eliminar mi cuenta».')); }
      const typed = await promptDialog(t('Se borrarán tu cuenta, tus créditos y tus presentaciones en la nube (también para quien las tenga compartidas), y se cancelará tu suscripción. No se puede deshacer. Escribe tu correo ({email}) para confirmar:').replace('{email}', me.email), '');
      if (typed == null) return;
      if (typed.trim().toLowerCase() !== me.email) return alertDialog(t('El correo no coincide: no se ha eliminado nada.'));
      try { await acc.api('account/delete', { confirm: typed.trim() }); await acc.signOut(); close(); alertDialog(t('Tu cuenta se ha eliminado.')); }
      catch (e) { alertDialog(errorText(e)); }
    });
  };
  render();
  acc.refreshAccount().then(render, () => {});
}

// The page opened by the desktop app to sign it in: sign in here if needed, then confirm its code.
export async function handleDesktopRequest(req = acc.desktopRequest()) {
  if (!req || EDITION !== 'cloud') return false;
  history.replaceState(null, '', location.pathname);
  if (!acc.account()) {
    await acc.refreshAccount().catch(() => null);
    if (!acc.account()) {
      if (!(await confirmDialog(t('La aplicación de escritorio de Revela quiere iniciar sesión. Primero, inicia sesión aquí.')))) return false;
      try { await acc.signIn(); } catch (e) { alertDialog(errorText(e)); return false; }
    }
  }
  const ok = await confirmDialog(t('¿Conectar la aplicación de escritorio de Revela a tu cuenta ({email})? Hazlo solo si acabas de pedirlo tú y la aplicación muestra este código: {code}')
    .replace('{email}', acc.account().email).replace('{code}', req.code));
  if (!ok) return false;
  try { await acc.approveDesktop(req); alertDialog(t('Listo: vuelve a la aplicación de escritorio.')); return true; }
  catch (e) { alertDialog(e.status === 410 ? t('Se acabó el tiempo para confirmar. Vuelve a intentarlo.') : e.status === 400 ? t('El código no coincide. Vuelve a empezar desde la aplicación.') : errorText(e)); return false; }
}
