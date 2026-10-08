// "My account" (official edition and desktop app): sign in, plan, credits,
// buying (Stripe, when the server has it), and signing out. Everything shown
// comes from the server; nothing here grants anything.

import { esc } from '../../core/text.js';
import { EDITION, OFFICIAL_SITE } from '../../core/config.js';
import * as acc from '../../io/cloud/account.js';
import * as gd from '../../io/cloud/gdrive.js';
import * as od from '../../io/cloud/onedrive.js';
import { connect, signOutCloud } from '../../io/cloud/othercloud.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog, promptDialog } from './dialog.js';
import { openTeam } from './team.js';
import { openReport } from './report.js';

const FEATURE_NAMES = { ai: 'IA incluida', 'share-people': 'Compartir con personas', 'cloud-save': 'Guardado en la nube', 'video-calls': 'Videollamadas en el editor', 'premium-templates': 'Plantillas premium' };
const errorText = e => (e.data?.error === 'no customer' ? t('Esta cuenta no tiene ninguna suscripción de pago que gestionar: su Pro viene del modo de prueba, de un regalo o de un equipo.')
  : /^billing (not available|failed)$/.test(e.message) ? t('Los pagos no están disponibles ahora mismo. Inténtalo más tarde.')
  : e.message === 'NOT_TESTER' ? t('Esta es la web de pruebas de Revela: solo pueden entrar las personas invitadas. La de verdad está en revelaslides.com.')
  : e.message === 'CANCELLED' || e.message === 'TERMS' ? t('No se ha iniciado sesión.') : e.message === 'EXPIRED' ? t('Se acabó el tiempo para confirmar. Vuelve a intentarlo.') : `${t('Algo ha fallado:')} ${e.message}`);

// Just signed in, without Google Drive: offer it once (here, where the click lets Google's window open). The
// Revela account's sign-in only asks Google for the email: Drive is its own permission, never sent to the server.
async function offerDrive() {
  if (EDITION !== 'cloud' || gd.account()) return;
  try { if (localStorage.getItem('revela.driveOffered')) return; localStorage.setItem('revela.driveOffered', '1'); } catch {}
  if (await confirmDialog(t('¿Guardar también tus presentaciones en Google Drive? Se guardan solas mientras trabajas y las abres desde cualquier dispositivo.'),
    { ok: t('Conectar Google Drive'), cancel: t('Ahora no') })) {
    await (await import('../shell/home.js')).signInFlow();
    if (document.getElementById('account-modal')) openAccount();          // (its Drive section, connected)
  }
}

// ---- The terms of service: accepted (and being 14 or older confirmed) before the first sign-in ----
const termsText = () => t('Al continuar aceptas las {terms} y la {privacy}, y confirmas que tienes 14 años o más.')
  .replace('{terms}', `<a href="${acc.TERMS_URL}" target="_blank" rel="noopener">${t('condiciones del servicio')}</a>`)
  .replace('{privacy}', `<a href="${acc.PRIVACY_URL}" target="_blank" rel="noopener">${t('política de privacidad')}</a>`);
const termsBox = () => `<label class="acc-terms" style="display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:10px 0"><input type="checkbox" class="acc-terms-ok"${acc.termsAccepted() ? ' checked' : ''} style="margin-top:3px"><span>${termsText()}</span></label>`;
// A dialog asking for them: resolves true once accepted (the box ticked), false if closed.
export function askTerms() {
  return new Promise(resolve => {
    document.getElementById('terms-modal')?.remove();
    const back = document.createElement('div'); back.id = 'terms-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" style="text-align:start;width:min(440px,94vw)"><h3>${t('Condiciones de Revela')}</h3>${termsBox()}
      <div class="fr-actions"><button type="button" class="mini2 tm-no">${t('Cancelar')}</button><button type="button" class="fr-do tm-ok" disabled>${t('Continuar')}</button></div></div>`;
    document.body.appendChild(back);
    const box = back.querySelector('.acc-terms-ok'), go = back.querySelector('.tm-ok'), done = v => { back.remove(); resolve(v); };
    box.checked = false; box.addEventListener('change', () => { go.disabled = !box.checked; });
    go.addEventListener('click', () => { acc.rememberTerms(); done(true); });
    back.querySelector('.tm-no').addEventListener('click', () => done(false));
  });
}
// Signing in from anywhere (a shared link, the desktop app's request): the terms first, if this browser hasn't accepted them.
export async function signInWithTerms() {
  if (!acc.termsAccepted() && !(await askTerms())) throw new Error('CANCELLED');
  return acc.signIn();
}
// An account from before the terms (the server says terms: false): asked once per visit until accepted.
let termsAsked = false;
export function watchTerms() {
  acc.onAccount(me => {
    if (!me || me.terms !== false || termsAsked) return;
    termsAsked = true;
    (acc.termsAccepted() ? Promise.resolve(true) : askTerms()).then(ok => ok && acc.acceptTerms()).catch(() => {});
  });
}

// (buy: a product chosen on the prices page — ?buy=pro-year —, paid for as soon as there is a session.)
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
        ${termsBox()}
        <div class="acc-code" hidden></div>
        <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do acc-login">${t(EDITION === 'desktop' ? 'Iniciar sesión en el navegador' : 'Iniciar sesión con Google')}</button></div>
        <p class="host-help" style="font-size:12px"><a href="${OFFICIAL_SITE}/pricing" target="_blank" rel="noopener">${t('Ver planes y precios')}</a></p>
        <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 acc-report"><i class="ms">bug_report</i> ${t('Informar de un problema')}</button></div>`;
    body.querySelector('.acc-report').addEventListener('click', () => { close(); openReport(); });
      const termsOk = body.querySelector('.acc-terms-ok'), loginBtn = body.querySelector('.acc-login');
      // (Not a button that looks ready and does nothing: pressed before the box is ticked, the box says so.)
      termsOk.addEventListener('change', () => { body.querySelector('.acc-terms').classList.remove('acc-terms-need'); });
      loginBtn.addEventListener('click', async e => {
        if (!termsOk.checked) {
          const box = body.querySelector('.acc-terms'); box.classList.add('acc-terms-need'); termsOk.focus();
          if (!box.querySelector('.acc-need')) box.querySelector('span').insertAdjacentHTML('beforeend', `<small class="acc-need">${t('Marca la casilla para continuar.')}</small>`);
          return;
        }
        e.target.disabled = true; acc.rememberTerms();
        try {
          if (EDITION === 'desktop') {
            abort = new AbortController();
            const box = body.querySelector('.acc-code');
            await acc.desktopSignIn({ signal: abort.signal, onCode: code => { box.hidden = false;
              box.innerHTML = `${t('Se ha abierto tu navegador. Inicia sesión allí y confirma este código:')}<b>${esc(code)}</b>`; } });
            if (acc.account()?.terms === false) await acc.acceptTerms();   // (the box was ticked here)
          } else await acc.signIn();
          render(); offerDrive();
        } catch (err) { e.target.disabled = false; if (err.message !== 'CANCELLED' || EDITION !== 'desktop') alertDialog(errorText(err)); }
      });
      return;
    }
    if (buy && BUYABLE.includes(buy) && me.billing && !(me.plan === 'pro' && buy.startsWith('pro'))) { const b = buy; buy = null; acc.buy(b).catch(e => alertDialog(errorText(e))); }
    // (trialDays: Pro's free trial on offer to this account — the server decides; 0: none.)
    const pro = me.plan === 'pro', trialDays = !pro && me.billing && me.trialDays > 0 ? me.trialDays | 0 : 0, until = me.until ? new Date(me.until).toLocaleDateString(currentLang(), { dateStyle: 'long' }) : '';
    // (Drawn again when the account is refreshed: the sections the person had open stay open.)
    const opened = [...body.querySelectorAll('details[open]')].map(d => d.className);
    body.innerHTML = `<div class="acc-who">${esc(me.email)}</div>
      ${me.blocked ? `<p class="host-help acc-blocked" role="alert">${t('Tu cuenta está bloqueada: la IA y la nube no están disponibles. Si crees que es un error, usa «Informar de un problema».')}</p>` : ''}
      <div class="acc-plan"><span class="acc-badge${pro ? ' pro' : ''}">${t(pro ? 'Pro' : 'Gratis')}</span>${pro && until ? `<small>${t(me.trial ? 'Prueba gratis hasta:' : 'Renovación:')} ${esc(until)}</small>` : ''}</div>
      <div class="acc-credits"><b>${Math.max(0, me.credits | 0)}</b> ${t('créditos')}${me.expiring?.[0] ? `<small>${t('{n} caducan el {d}').replace('{n}', me.expiring[0].n).replace('{d}', new Date(me.expiring[0].exp).toLocaleDateString(currentLang(), { day: 'numeric', month: 'long' }))}</small>` : ''}</div>
      <ul class="acc-features">${(me.features || []).map(f => `<li>✓ ${t(FEATURE_NAMES[f] || f)}</li>`).join('')}</ul>
      ${me.billingTest ? `<p class="host-help acc-test" role="note">${t('Modo de prueba: no se cobra nada (tarjeta de prueba 4242 4242 4242 4242)')}</p>` : ''}
      <div class="acc-buy">
        ${pro ? '' : `<button type="button" class="fr-do" data-buy="pro-month"${me.billing ? '' : ' disabled'}>${trialDays ? t('Prueba Pro {n} días gratis').replace('{n}', trialDays) : t('Pro mensual')}</button><button type="button" class="fr-do" data-buy="pro-year"${me.billing ? '' : ' disabled'}>${t('Pro anual')}</button>`}
        <button type="button" class="mini2" data-buy="credits-500"${me.billing ? '' : ' disabled'}>${t('500 créditos')}</button>
        <button type="button" class="mini2" data-buy="credits-1500"${me.billing ? '' : ' disabled'}>${t('1500 créditos')}</button>
      </div>
      ${me.billing ? '' : `<p class="host-help" style="font-size:12px">${t('Los pagos estarán disponibles muy pronto.')}</p>`}
      ${trialDays ? `<p class="host-help acc-trial" style="font-size:12px">${t('Se pide una tarjeta, pero no se cobra nada hasta que acabe la prueba. Puedes cancelarla antes en «Gestionar la suscripción».')}</p>` : ''}
      <div class="fr-actions" style="justify-content:space-between">
        ${pro && me.portal !== false ? `<button type="button" class="mini2 acc-portal">${t('Gestionar la suscripción')}</button>` : '<span></span>'}
        <button type="button" class="mini2 acc-out">${t('Cerrar sesión')}</button></div>
      <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap"><button type="button" class="mini2 acc-team"><i class="ms">groups</i> ${me.team ? esc(me.team.name) : t('Equipos y centros')}</button>
        <button type="button" class="mini2 acc-report"><i class="ms">bug_report</i> ${t('Informar de un problema')}</button></div>
      <div class="acc-drive"></div><div class="acc-drive acc-od" hidden></div>
      <details class="acc-amb" hidden></details>
      <details class="acc-ref" hidden><summary>${t('Recomienda Revela a tu centro')}</summary>
        <p class="host-help">${t('Si te gusta Revela, pásale este enlace a la dirección de tu centro o empresa. Lo envías tú: Revela no escribe a nadie.')}</p>
        <p class="host-help acc-ref-reward" hidden></p>
        <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap"><input type="text" class="acc-ref-link" readonly style="flex:1 1 220px;min-width:0">
          <button type="button" class="mini2 acc-ref-copy">${t('Copiar el enlace')}</button>
          <a class="mini2 acc-ref-mail" target="_blank" rel="noopener"><i class="ms">mail</i> ${t('Correo')}</a>
          <a class="mini2 acc-ref-wa" target="_blank" rel="noopener">WhatsApp</a></div>
        <p class="host-help acc-ref-stats"></p></details>
      <details class="acc-mail"><summary>${t('Avisos por correo')}</summary>
        <p class="host-help">${t('Revela te escribe a {email} cuando te comparten una presentación, te invitan a un equipo o cambia tu plan.').replace('{email}', esc(me.email))}</p>
        <label class="fr-chk"><input type="checkbox" class="acc-mail-opt" data-kind="credits"> ${t('Avisarme cuando mis créditos estén a punto de caducar')}</label>
        <label class="fr-chk"><input type="checkbox" class="acc-mail-opt" data-kind="trialEnding"> ${t('Avisarme antes de que acabe mi prueba de Pro')}</label>
        <label class="fr-chk"><input type="checkbox" class="acc-mail-opt" data-kind="opened"> ${t('Avisarme cuando alguien abra uno de mis enlaces con seguimiento')}</label>
        <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 acc-mail-test">${t('Enviarme un correo de prueba')}</button></div></details>
      <details class="acc-sess"><summary>${t('Sesiones abiertas')}</summary>
        <p class="host-help">${t('Dónde está abierta tu cuenta. Si ves una sesión que no reconoces, ciérrala y revisa la seguridad de tu cuenta de Google.')}</p>
        <ul class="acc-sess-list"></ul>
        <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 acc-sess-others" hidden>${t('Cerrar las demás sesiones')}</button></div></details>
      <details class="acc-data"><summary>${t('Tus datos')}</summary>
        <p class="host-help">${t('Descarga una copia de todo lo que guarda tu cuenta, o elimínala con todas tus presentaciones en la nube. Las facturas las conserva Stripe, como exige la ley.')}</p>
        <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap"><button type="button" class="mini2 acc-export">${t('Descargar mis datos')}</button>
          <button type="button" class="mini2 acc-delete">${t('Eliminar mi cuenta')}</button></div></details>`;
    for (const c of opened) { const d = body.querySelector(`details[class="${c}"]`); if (d) d.open = true; }
    body.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => acc.buy(b.dataset.buy).catch(e => alertDialog(errorText(e)))));
    body.querySelector('.acc-portal')?.addEventListener('click', () => acc.manageBilling().catch(e => alertDialog(errorText(e))));
    body.querySelector('.acc-out').addEventListener('click', async () => { await acc.signOut(); render(); });
    body.querySelector('.acc-team').addEventListener('click', () => { close(); openTeam(); });
    // Google Drive, part of the account (one sign-in in the bar): where the presentations are kept.
    const drive = body.querySelector('.acc-drive'), paintDrive = () => {
      const d = gd.account();
      drive.innerHTML = `<i class="ms">add_to_drive</i><span>${d ? t('Google Drive: conectado como {e}').replace('{e}', esc(d.email)) : t('Google Drive: guarda tus presentaciones en tu Drive y ábrelas desde cualquier dispositivo.')}</span>`
        + `<button type="button" class="mini2 acc-drive-btn">${d ? t('Desconectar Drive') : t('Conectar Google Drive')}</button>`;
      drive.querySelector('.acc-drive-btn').addEventListener('click', async () => {
        if (gd.account()) { if (await confirmDialog(t('¿Desconectar Google Drive? Tus presentaciones siguen en tu Drive.'), { ok: t('Desconectar Drive') })) await gd.signOut(); }
        else await (await import('../shell/home.js')).signInFlow();
        paintDrive();
      });
    };
    paintDrive();
    // OneDrive, the same way (personal, work or school accounts).
    const odBox = body.querySelector('.acc-od'), paintOD = async () => {
      if (!od.onedriveReady()) return; odBox.hidden = false;
      const on = od.onedriveSignedIn(), who = on ? await od.oneDriveOwner() : '';
      odBox.innerHTML = `<i class="ms">cloud_circle</i><span>${on ? t('OneDrive: conectado{w}').replace('{w}', who ? ' (' + esc(who) + ')' : '') : t('OneDrive: guarda ahí tus presentaciones, con una cuenta personal, de trabajo o de tu centro.')}</span>`
        + `<button type="button" class="mini2 acc-od-btn">${on ? t('Desconectar OneDrive') : t('Conectar OneDrive')}</button>`;
      odBox.querySelector('.acc-od-btn').addEventListener('click', async () => {
        if (od.onedriveSignedIn()) signOutCloud('onedrive');
        else { try { await connect('onedrive'); } catch (e) { if (e.message !== 'CANCELLED') alertDialog(e.message); } }
        paintOD();
      });
    };
    paintOD();
    // Ambassadors: apply, the application's status, the badge (dialogs/ambassador.js).
    import('./ambassador.js').then(m => m.paintAmbassador(body.querySelector('.acc-amb'))).catch(() => {});
    // «Recomienda Revela a tu centro»: my link, a message ready to send myself, and what it has brought (crm.js).
    acc.api('referral').then(r => {
      if (!r?.on) return;
      const box = body.querySelector('.acc-ref'); if (!box) return; box.hidden = false;
      const msg = t('Hola: uso Revela para preparar mis clases (presentaciones con votaciones y cuestionarios en directo, compatible con PowerPoint y Moodle) y creo que nos vendría bien a todo el claustro. Podéis pedir una demostración aquí: {link}').replace('{link}', r.link);
      box.querySelector('.acc-ref-link').value = r.link;
      box.querySelector('.acc-ref-mail').href = 'mailto:?subject=' + encodeURIComponent(t('Revela para nuestro centro')) + '&body=' + encodeURIComponent(msg);
      box.querySelector('.acc-ref-wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
      if (r.reward) { const rw = box.querySelector('.acc-ref-reward'); rw.hidden = false; rw.textContent = t('Si tu centro contrata Revela gracias a ti: {r}.').replace('{r}', r.reward); }
      box.querySelector('.acc-ref-stats').textContent = r.stats?.leads ? t('Solicitudes gracias a ti: {n} · Ya son clientes: {m}').replace('{n}', r.stats.leads).replace('{m}', r.stats.customers || 0) : '';
      box.querySelector('.acc-ref-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(r.link); } catch { box.querySelector('.acc-ref-link').select(); } (await import('../shell/toast.js')).toast(t('Enlace copiado')); });
    }).catch(() => {});
    body.querySelector('.acc-report').addEventListener('click', () => { close(); openReport(); });
    // (Email notices: the optional ones can be switched off; a test email shows whether they arrive.)
    const optBoxes = [...body.querySelectorAll('.acc-mail-opt')];
    body.querySelector('.acc-mail').addEventListener('toggle', async e => {
      if (!e.target.open || body.querySelector('.acc-mail').dataset.loaded) return;
      try { const p = await acc.api('mail/prefs'); for (const b of optBoxes) b.checked = !p.off.includes(b.dataset.kind); body.querySelector('.acc-mail').dataset.loaded = '1'; } catch {}
    });
    for (const box of optBoxes) box.addEventListener('change', async () => {
      const k = box.dataset.kind;
      try { const p = await acc.api('mail/prefs'); await acc.api('mail/prefs', { off: box.checked ? p.off.filter(x => x !== k) : [...new Set([...p.off, k])] }); }
      catch (e) { alertDialog(errorText(e)); }
    });
    body.querySelector('.acc-mail-test').addEventListener('click', async e => {
      e.target.disabled = true;
      try { await acc.api('mail/test', {}); alertDialog(t('Enviado a {email}. Si no te llega en unos minutos, mira en «Spam».').replace('{email}', me.email)); }
      catch (err) { alertDialog(err.status === 429 ? t('Ya has pedido uno hace poco: espera una hora para pedir otro.') : err.status === 503 ? t('Los correos aún no están activados en este servidor.') : errorText(err)); }
    });
    // Open sessions: where the account is signed in (device, approximate place, last use); closing one, or all the
    // others — a lost phone, a shared computer, a session that isn't mine. (This one closes with «Cerrar sesión».)
    const sess = body.querySelector('.acc-sess'), paintSessions = async () => {
      const list = sess.querySelector('.acc-sess-list'), when = ms => new Date(ms).toLocaleString(currentLang(), { dateStyle: 'medium', timeStyle: 'short' });
      let all; try { all = await acc.sessions(); } catch (e) { list.innerHTML = `<li>${esc(errorText(e))}</li>`; return; }
      list.innerHTML = all.map(s => {
        const os = s.device.split(' · ').pop(), name = s.kind === 'desktop' ? t('Aplicación de escritorio') + (os ? ' · ' + os : '') : s.device || t('Navegador');
        const icon = s.kind === 'desktop' ? 'desktop_windows' : /iPhone|Android/.test(s.device) ? 'smartphone' : /iPad/.test(s.device) ? 'tablet' : 'computer';
        return `<li data-id="${esc(s.id)}"><i class="ms">${icon}</i><span><b>${esc(name)}</b>${s.current ? ` <em class="acc-sess-here">${t('Este dispositivo')}</em>` : ''}
          <small>${[s.where, t('Última actividad: {d}').replace('{d}', when(s.last)), t('Inicio: {d}').replace('{d}', when(s.created))].filter(Boolean).map(esc).join(' · ')}</small></span>
          ${s.current ? '' : `<button type="button" class="mini2 acc-sess-end">${t('Cerrar')}</button>`}</li>`;
      }).join('');
      sess.querySelector('.acc-sess-others').hidden = !all.some(s => !s.current);
      list.querySelectorAll('.acc-sess-end').forEach(b => b.addEventListener('click', async () => {
        b.disabled = true; try { await acc.endSession(b.closest('li').dataset.id); } catch (e) { alertDialog(errorText(e)); } paintSessions();
      }));
    };
    sess.addEventListener('toggle', () => { if (sess.open) paintSessions(); });
    sess.querySelector('.acc-sess-others').addEventListener('click', async () => {
      if (!(await confirmDialog(t('¿Cerrar la sesión en todos los demás dispositivos? Tendrán que volver a iniciar sesión.'), { ok: t('Cerrar las demás sesiones') }))) return;
      try { const r = await acc.endOtherSessions(); (await import('../shell/toast.js')).toast(t('Sesiones cerradas: {n}').replace('{n}', r.ended)); } catch (e) { alertDialog(errorText(e)); }
      paintSessions();
    });
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
      try { await signInWithTerms(); } catch (e) { if (e.message !== 'CANCELLED') alertDialog(errorText(e)); return false; }
    }
  }
  const ok = await confirmDialog(t('¿Conectar la aplicación de escritorio de Revela a tu cuenta ({email})? Hazlo solo si acabas de pedirlo tú y la aplicación muestra este código: {code}')
    .replace('{email}', acc.account().email).replace('{code}', req.code));
  if (!ok) return false;
  try { await acc.approveDesktop(req); alertDialog(t('Listo: vuelve a la aplicación de escritorio.')); return true; }
  catch (e) { alertDialog(e.status === 410 ? t('Se acabó el tiempo para confirmar. Vuelve a intentarlo.') : e.status === 400 ? t('El código no coincide. Vuelve a empezar desde la aplicación.') : errorText(e)); return false; }
}
