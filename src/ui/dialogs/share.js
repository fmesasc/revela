// "Share": a private link or a password-protected file, ready to embed in an
// iframe. The presentation is encrypted in this browser before it leaves it.

import { esc } from '../../core/text.js';
import { publish } from '../../io/share/publish.js';
import { sharesList, removeShare } from '../../io/share/shares.js';
import { gdriveReady, driveUnshare } from '../../io/cloud/gdrive.js';
import { openGdriveSetup } from './gdrive.js';
import { serverConfig, setServerConfig, serverReady, serverUnshare, serverStats } from '../../io/cloud/shareserver.js';
import { SERVER_URL } from '../../core/config.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';
import { hasAccounts } from '../../io/cloud/account.js';
import { openCloudShare } from './cloud.js';

const copyBtn = sel => `<button type="button" class="mini2 sh-copy" data-copy="${sel}">${t('Copiar')}</button>`;

export function openShare() {
  document.getElementById('share-modal')?.remove();
  const sc = serverConfig();
  const back = document.createElement('div');
  back.id = 'share-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal share" style="text-align:start;min-width:320px;max-width:min(560px,94vw)">
    <button class="modal-close">✕</button><h3>${t('Compartir')}</h3>
${hasAccounts() ? `<div class="sh-cloud"><div><b>${t('Con personas concretas')}</b><br><small>${t('Desde tu nube de Revela: cada persona con su permiso (ver, comentar o editar), y los cambios al momento.')}</small></div>
      <button type="button" class="fr-do sh-people"><i class="ms">person_add</i> ${t('Personas')}</button></div><h4>${t('O un enlace o archivo protegido')}</h4>` : ''}
    <p class="host-help">${t('La presentación sale de tu navegador ya protegida: ni el servidor ni quien guarde el archivo pueden leerla sin el enlace completo o la contraseña, y no aparece en buscadores.')}</p>
    <fieldset><legend>${t('¿Quién puede abrirla?')}</legend>
      <label class="fr-chk"><input type="radio" name="sh-p" value="key" checked> ${t('Cualquiera que tenga el enlace (sin contraseña)')}</label>
      <label class="fr-chk"><input type="radio" name="sh-p" value="password"> ${t('Solo quien sepa la contraseña (se pide al abrirla)')}</label>
      <div class="sh-pw" hidden>
        <input type="password" class="sh-pw1" placeholder="${t('Contraseña')}" autocomplete="new-password">
        <input type="password" class="sh-pw2" placeholder="${t('Repite la contraseña')}" autocomplete="new-password">
        <p class="host-help">${t('Usa una frase larga: quien consiga el enlace o el archivo puede ir probando contraseñas sin límite.')}</p>
      </div>
    </fieldset>
    <fieldset><legend>${t('Dónde')}</legend>
      <label class="fr-chk"><input type="radio" name="sh-w" value="file" checked> ${t('Archivo HTML: lo subes donde quieras (la web del centro, Moodle…)')}</label>
      <label class="fr-chk"><input type="radio" name="sh-w" value="drive"> ${t('Mi Google Drive')} ${gdriveReady() ? '' : `<button type="button" class="mini2 sh-gd">${t('Configurar')}</button>`}</label>
      <label class="fr-chk"><input type="radio" name="sh-w" value="server"> ${t('Servidor de Revela (con tu cuenta de Google)')}</label>
      <div class="sh-srv" hidden>
        <details class="sh-other"${sc.builtIn ? '' : ' open'}><summary>${t('Usar otro servidor')}</summary>
          <input type="url" class="sh-url" placeholder="${esc(SERVER_URL)}" value="${esc(sc.builtIn ? '' : sc.url)}">
          <input type="password" class="sh-up" placeholder="${t('Clave de subida')}" value="${esc(sc.uploadKey)}">
        </details>
        <label class="fr-l">${t('Solo cuentas de Google de este dominio (opcional)')} <input type="text" class="sh-domain" placeholder="escuela.example"></label>
        <label class="fr-l">${t('Caduca')} <select class="sh-days"><option value="0">${t('Nunca')}</option><option value="7">7 ${t('días')}</option>
          <option value="30">30 ${t('días')}</option><option value="90">90 ${t('días')}</option></select></label>
        <p class="host-help">${t('Cómo montarlo gratis en Cloudflare: server/cloudflare/README.md del repositorio.')}</p>
      </div>
    </fieldset>
    <div class="fr-actions"><button class="fr-do sh-go">${t('Compartir')}</button></div>
    <div class="sh-out"></div>
    <div class="sh-list"></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const val = n => back.querySelector(`input[name="${n}"]:checked`).value;
  const sync = () => { q('.sh-pw').hidden = val('sh-p') !== 'password'; q('.sh-srv').hidden = val('sh-w') !== 'server'; };
  back.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', sync));
  q('.sh-people')?.addEventListener('click', () => { close(); openCloudShare(); });
  q('.sh-gd')?.addEventListener('click', e => { e.preventDefault(); openGdriveSetup(); });
  back.addEventListener('click', e => {
    const c = e.target.closest('.sh-copy'); if (!c) return;
    const el = q(c.dataset.copy); el.select(); navigator.clipboard?.writeText(el.value).catch(() => document.execCommand('copy'));
    c.textContent = t('Copiado');
  });

  q('.sh-go').addEventListener('click', async () => {
    const password = val('sh-p') === 'password' ? q('.sh-pw1').value : null;
    if (password !== null) {
      if (password.length < 8) return alertDialog(t('La contraseña debe tener al menos 8 caracteres.'));
      if (password !== q('.sh-pw2').value) return alertDialog(t('Las contraseñas no coinciden.'));
    }
    const where = val('sh-w');
    if (where === 'server') {
      setServerConfig({ url: q('.sh-url').value.trim(), uploadKey: q('.sh-up').value });   // empty: Revela's
      if (!serverReady()) return alertDialog(t('Escribe la dirección https del servidor.'));
    }
    if (where === 'drive' && !gdriveReady()) return openGdriveSetup();
    const go = q('.sh-go'); go.disabled = true; go.textContent = t('Preparando…');
    try {
      const r = await publish({ where, password, days: +q('.sh-days').value, domain: where === 'server' ? q('.sh-domain').value.trim().replace(/^@/, '') : '' });
      q('.sh-out').innerHTML = r.where === 'file'
        ? `<p class="host-help">${t('Se ha descargado')} <b>${esc(r.file)}</b>. ${t('Súbelo a tu web y usa su dirección en un iframe.')}</p>`
          + (r.key ? `<p class="host-help">${t('Añade esto al final de su dirección; sin ello la presentación no se abre:')}</p>
              <div class="sh-row"><input readonly class="sh-suffix" value="${esc(r.suffix)}">${copyBtn('.sh-suffix')}</div>` : '')
          + `<div class="sh-row"><textarea readonly class="sh-ifr" rows="2">${esc(`<iframe src="https://…/${r.file}${r.suffix}" width="960" height="540" style="border:0;max-width:100%" allow="fullscreen" allowfullscreen></iframe>`)}</textarea>${copyBtn('.sh-ifr')}</div>`
        : `<label class="fr-l">${t('Enlace')}</label><div class="sh-row"><input readonly class="sh-link" value="${esc(r.link)}">${copyBtn('.sh-link')}</div>
           <label class="fr-l">${t('Insertar (iframe)')}</label><div class="sh-row"><textarea readonly class="sh-ifr" rows="3">${esc(r.iframe)}</textarea>${copyBtn('.sh-ifr')}</div>`;
      renderList();
    } catch (e) { alertDialog(t('No se pudo compartir: ') + (e.message || e)); }
    finally { go.disabled = false; go.textContent = t('Compartir'); }
  });

  function renderList() {
    const list = sharesList();
    q('.sh-list').innerHTML = !list.length ? '' : `<h4>${t('Compartidas desde este navegador')}</h4>` + list.map(s => `<div class="sh-item" data-id="${esc(s.id)}">
      <span>${esc(s.name)} · ${s.where === 'drive' ? 'Drive' : t('Servidor')}${s.password ? ' · 🔒' : ''}${s.domain ? ' · @' + esc(s.domain) : ''} · ${new Date(s.at).toLocaleDateString()}</span>
      ${s.where === 'server' ? `<button type="button" class="mini2 sh-st">${t('Visitas')}</button>` : ''}
      <button type="button" class="mini2 sh-cp">${t('Copiar enlace')}</button><button type="button" class="mini2 sh-rm">${t('Dejar de compartir')}</button></div>`).join('');
    q('.sh-list').querySelectorAll('.sh-item').forEach(row => {
      const s = list.find(x => x.id === row.dataset.id);
      row.querySelector('.sh-cp').addEventListener('click', e => { navigator.clipboard?.writeText(s.link); e.target.textContent = t('Copiado'); });
      row.querySelector('.sh-st')?.addEventListener('click', async e => {
        try { const st = await serverStats(s.url, s.token); e.target.textContent = `${st.views} ${t('visitas')}${st.last ? ' · ' + new Date(st.last).toLocaleDateString() : ''}`; }
        catch (err) { alertDialog(t('No se pudieron leer las visitas: ') + (err.message || err)); }
      });
      row.querySelector('.sh-rm').addEventListener('click', async () => {
        if (!(await confirmDialog(t('¿Dejar de compartir? El enlace dejará de funcionar.')))) return;
        try { s.where === 'drive' ? await driveUnshare(s.id) : await serverUnshare(s.url, s.token); removeShare(s.id); renderList(); }
        catch (e) { alertDialog(t('No se pudo dejar de compartir: ') + (e.message || e)); }
      });
    });
  }
  sync(); renderList();
}
