// Single sign-on, in «Mi equipo» (admins; server/cloudflare/sso.js): the team's identity provider — Microsoft Entra
// ID, Okta, Google Workspace or any OpenID Connect one —, its domains (each proved with a DNS TXT record), and whether
// whoever signs in that way joins the team. Also the sign-in side: «Entrar con SSO» on the sign-in screen, and what
// the server says when it sends the person back (?sso=…).

import { esc } from '../../core/text.js';
import * as acc from '../../io/cloud/account.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, promptDialog } from './dialog.js';

export const ssoBox = () => `<details class="tm-sso"><summary>${t('Inicio de sesión único (SSO)')}</summary><div class="tm-sso-body"><p class="host-help">${t('Cargando…')}</p></div></details>`;

export function wireSso(body) {
  const box = body.querySelector('.tm-sso'); if (!box) return;
  const inner = box.querySelector('.tm-sso-body');
  const paint = r => {
    const s = r.sso || {};
    inner.innerHTML = `<p class="host-help">${t('Tu equipo entra con su propio proveedor de identidad (Microsoft Entra ID, Okta, Google Workspace u otro compatible con OpenID Connect). Regístralo allí con esta dirección de vuelta:')}</p>
      <div class="sh-row"><input readonly value="${esc(r.redirect)}"></div>
      <label class="fr-l">${t('Emisor (issuer)')}<input type="url" class="ss-iss" value="${esc(s.issuer || '')}" placeholder="https://login.microsoftonline.com/…/v2.0"></label>
      <label class="fr-l">${t('Id. de cliente')}<input type="text" class="ss-cid" value="${esc(s.clientId || '')}"></label>
      <label class="fr-l">${t('Secreto de cliente')}<input type="password" class="ss-sec" autocomplete="new-password" placeholder="${s.hasSecret ? t('(guardado; escribe otro para cambiarlo)') : ''}"></label>
      <label class="fr-l">${t('Dominios de correo (separados por comas)')}<input type="text" class="ss-dom" value="${esc((s.domains || []).map(d => d.domain).join(', '))}" placeholder="escuela.edu"></label>
      <label class="fr-chk"><input type="checkbox" class="ss-join"${s.autoJoin ? ' checked' : ''}> ${t('Quien entre así se une al equipo (si quedan puestos)')}</label>
      <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do ss-save">${t('Guardar')}</button>${r.sso ? `<button type="button" class="mini2 ss-del">${t('Quitar el SSO')}</button>` : ''}</div>
      ${(s.domains || []).map(d => `<div class="sh-item"><span><b>${esc(d.domain)}</b> — ${d.verified ? '✓ ' + t('verificado') : `${t('Añade este registro TXT en su DNS:')} <code>revela-verify=${esc(d.token)}</code>`}</span>
        ${d.verified ? '' : `<button type="button" class="mini2" data-ss-verify="${esc(d.domain)}">${t('Comprobar')}</button>`}</div>`).join('')}`;
    inner.querySelector('.ss-save').addEventListener('click', async () => {
      try {
        paint(await acc.api('team/sso', { issuer: inner.querySelector('.ss-iss').value.trim(), clientId: inner.querySelector('.ss-cid').value.trim(), clientSecret: inner.querySelector('.ss-sec').value,
          domains: inner.querySelector('.ss-dom').value.split(/[,\s]+/).filter(Boolean), autoJoin: inner.querySelector('.ss-join').checked }));
      } catch (e) { alertDialog(e.data?.error === 'public domain' ? t('Ese es un dominio de correo público: solo los dominios de tu centro o empresa.') : e.data?.error ? t('Revisa los datos: {e}.').replace('{e}', e.data.error) : e.message); }
    });
    inner.querySelector('.ss-del')?.addEventListener('click', async () => { try { await acc.api('team/sso/delete', {}); load(); } catch (e) { alertDialog(e.message); } });
    inner.querySelectorAll('[data-ss-verify]').forEach(b => b.addEventListener('click', async () => {
      try { const v = await acc.api('team/sso/verify', { domain: b.dataset.ssVerify }); if (!v.verified) alertDialog(t('Aún no se ve el registro TXT. Los cambios de DNS pueden tardar unos minutos.')); load(); }
      catch (e) { alertDialog(e.status === 409 ? t('Ese dominio ya lo usa otro equipo de Revela. Escríbenos si es tuyo.') : e.message); }
    }));
  };
  const load = async () => { try { paint(await acc.api('team/sso')); } catch (e) { inner.innerHTML = `<p class="host-help">${esc(e.message)}</p>`; } };
  box.addEventListener('toggle', () => { if (box.open && !box.dataset.loaded) { box.dataset.loaded = '1'; load(); } });
}

// «Entrar con SSO» on the sign-in screen: the work address, then the browser goes to the team's provider.
export async function ssoSignIn() {
  const email = await promptDialog(t('Tu correo del centro o de la empresa:'), '');
  if (!email?.includes('@')) return;
  acc.rememberTerms();
  location.href = new URL('sso/start?' + new URLSearchParams({ email: email.trim(), terms: acc.TERMS_VERSION, lang: currentLang() }), acc.apiBase()).href;
}
// Back from the provider (?sso=…): what happened, said plainly.
export function handleSsoReturn(search = location.search) {
  const r = new URLSearchParams(search).get('sso'); if (!r) return;
  history.replaceState(null, '', location.pathname);
  if (r === 'ok') { acc.refreshAccount().catch(() => {}); return; }
  alertDialog({
    none: t('Tu centro o empresa no tiene configurado el inicio de sesión único en Revela. Entra con Google o pide a quien administra vuestro equipo que lo configure.'),
    domain: t('Tu proveedor de identidad devolvió un correo que no es de los dominios de tu equipo.'),
    terms: t('Antes de crear tu cuenta, acepta las condiciones y vuelve a intentarlo.'),
    expired: t('El inicio de sesión ha caducado. Vuelve a intentarlo.'),
    denied: t('No se ha iniciado sesión.'),
  }[r] || t('No se ha podido iniciar sesión con tu proveedor de identidad. Vuelve a intentarlo o avisa a quien administra vuestro equipo.'));
}
