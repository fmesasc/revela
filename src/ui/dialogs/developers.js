// «Desarrolladores e IA» in My account: Revela connected to Claude, ChatGPT or another AI app (its MCP server's
// address, to add as a connector: they then ask for permission here — handleConnect), and personal API keys for
// scripts (server/cloudflare/publicapi.js; docs at revelaslides.com/developers). The apps connected and the keys are
// listed together: each can be revoked. A key is shown once, when it's made: only its hash stays on the server.

import { esc } from '../../core/text.js';
import { OFFICIAL_SITE } from '../../core/config.js';
import * as acc from '../../io/cloud/account.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog, promptDialog } from './dialog.js';

const mcpURL = () => new URL('mcp', acc.apiBase() || OFFICIAL_SITE + '/api/').href;
const copy = async (text, input) => {
  try { await navigator.clipboard.writeText(text); } catch { input?.select(); }
  (await import('../shell/toast.js')).toast(t('Copiado'));
};

export function developersBox() {
  return `<details class="acc-dev"><summary>${t('Desarrolladores e IA')}</summary>
    <p class="host-help">${t('Conecta Revela a Claude, ChatGPT u otra aplicación de IA para que cree y cambie tus presentaciones: añade un conector personalizado con esta dirección y acepta el permiso que te pedirá Revela.')}</p>
    <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap"><input type="text" class="acc-dev-mcp" readonly style="flex:1 1 220px;min-width:0">
      <button type="button" class="mini2 acc-dev-copy">${t('Copiar')}</button></div>
    <p class="host-help">${t('Para tus propios programas, crea una clave de API. Trátala como una contraseña: quien la tenga puede leer y cambiar tus presentaciones.')}
      <a href="${OFFICIAL_SITE}/developers" target="_blank" rel="noopener">${t('Documentación')}</a></p>
    <ul class="acc-sess-list acc-dev-list"></ul>
    <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 acc-dev-new">${t('Crear una clave de API')}</button></div>
    <p class="host-help">${t('Avisos en Slack, Microsoft Teams, Google Chat, Discord o cualquier dirección (Zapier, Make…): cuando alguien abra uno de tus enlaces con seguimiento o comente tus presentaciones.')}</p>
    <ul class="acc-sess-list acc-hook-list"></ul>
    <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 acc-hook-new">${t('Añadir un canal de avisos')}</button></div></details>`;
}

export function wireDevelopers(body) {
  const box = body.querySelector('.acc-dev'); if (!box) return;
  box.querySelector('.acc-dev-mcp').value = mcpURL();
  box.querySelector('.acc-dev-copy').addEventListener('click', () => copy(mcpURL(), box.querySelector('.acc-dev-mcp')));
  const when = ms => new Date(ms).toLocaleDateString(currentLang(), { dateStyle: 'medium' });
  const paint = async () => {
    const list = box.querySelector('.acc-dev-list');
    let keys; try { keys = (await acc.api('keys')).keys; } catch (e) { list.innerHTML = `<li>${esc(e.message)}</li>`; return; }
    list.innerHTML = keys.length ? keys.map(k => `<li data-id="${esc(k.id)}"><i class="ms">${k.kind === 'oauth' ? 'smart_toy' : 'key'}</i><span>
        <b>${esc(k.kind === 'oauth' ? t('Conectada: {app}').replace('{app}', k.client || k.name) : k.name)}</b>
        <small>${[t('Creada: {d}').replace('{d}', when(k.created)), k.last ? t('Último uso: {d}').replace('{d}', when(k.last)) : t('Sin usar todavía')].map(esc).join(' · ')}</small></span>
        <button type="button" class="mini2 acc-dev-del">${t(k.kind === 'oauth' ? 'Desconectar' : 'Revocar')}</button></li>`).join('')
      : `<li><span><small>${t('Ninguna aplicación conectada ni clave creada.')}</small></span></li>`;
    list.querySelectorAll('.acc-dev-del').forEach(b => b.addEventListener('click', async () => {
      if (!(await confirmDialog(t('¿Quitarle el acceso? Lo que use esta clave o esta aplicación dejará de poder entrar en tus presentaciones.'), { ok: b.textContent }))) return;
      b.disabled = true; try { await acc.api(`keys/${b.closest('li').dataset.id}/delete`, {}); } catch (e) { alertDialog(e.message); } paint();
    }));
  };
  // Integrations (server/cloudflare/hooks.js): where the notices go, a test message, and out.
  const EVENTS = { opened: 'Enlace con seguimiento abierto', comment: 'Comentario nuevo' };
  const paintHooks = async () => {
    const list = box.querySelector('.acc-hook-list');
    let hooks; try { hooks = (await acc.api('hooks')).hooks; } catch (e) { list.innerHTML = `<li>${esc(e.message)}</li>`; return; }
    list.innerHTML = hooks.map(h => `<li data-id="${esc(h.id)}"><i class="ms">${h.fails >= 20 ? 'error' : 'notifications'}</i><span><b>${esc(h.url)}</b>
        <small>${h.events.map(e => t(EVENTS[e] || e)).map(esc).join(' · ')}${h.fails ? ' · ' + t('Falla: {n} veces seguidas').replace('{n}', h.fails) : ''}</small></span>
        <button type="button" class="mini2 acc-hook-test">${t('Probar')}</button><button type="button" class="mini2 acc-hook-del">✕</button></li>`).join('');
    list.querySelectorAll('.acc-hook-test').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true; try { const r = await acc.api(`hooks/${b.closest('li').dataset.id}/test`, {}); alertDialog(r.ok ? t('Enviado: mira si ha llegado.') : t('No se ha podido entregar (respuesta {s}). Revisa la dirección.').replace('{s}', r.status || '—')); } catch (e) { alertDialog(e.message); } b.disabled = false; paintHooks();
    }));
    list.querySelectorAll('.acc-hook-del').forEach(b => b.addEventListener('click', async () => { try { await acc.api(`hooks/${b.closest('li').dataset.id}/delete`, {}); } catch (e) { alertDialog(e.message); } paintHooks(); }));
  };
  box.querySelector('.acc-hook-new').addEventListener('click', async () => {
    const url = await promptDialog(t('La dirección del webhook entrante (Slack, Teams, Google Chat, Discord) o de tu servicio (https://…):'), '');
    if (!url) return;
    try {
      const r = await acc.api('hooks', { url: url.trim(), events: Object.keys(EVENTS) });
      if (r.kind === 'json') await alertDialog(`${t('Cada aviso llega como JSON firmado: comprueba la cabecera X-Revela-Signature (sha256 HMAC del cuerpo) con este secreto. Cópialo ahora: no se volverá a mostrar.')}\n\n${r.secret}`);
    } catch (e) { alertDialog(e.data?.error === 'url' ? t('Esa dirección no vale: tiene que empezar por https:// y ser pública.') : e.status === 409 ? t('Ya tienes 5 canales: quita alguno antes.') : e.message); }
    paintHooks();
  });
  box.addEventListener('toggle', () => { if (box.open) { paint(); paintHooks(); } });
  box.querySelector('.acc-dev-new').addEventListener('click', async () => {
    const name = await promptDialog(t('Un nombre para recordar para qué es (por ejemplo, «Script de informes»):'), '');
    if (name == null) return;
    try {
      const r = await acc.api('keys', { name: name.trim() || 'API' });
      await alertDialog(`${t('Tu clave de API. Cópiala ahora: no se volverá a mostrar.')}\n\n${r.key}`);
      copy(r.key);
    } catch (e) { alertDialog(e.status === 409 ? t('Ya tienes 20 claves: revoca alguna antes de crear otra.') : e.message); }
    paint();
  });
}

// The page opened by an AI app that asks to connect (/app/?connect=…: the server's /api/oauth/authorize sends it
// here): sign in if needed, say who is asking, and send them back with the answer.
export async function handleConnect(req, { signIn } = {}) {
  history.replaceState(null, '', location.pathname);
  let info;
  try { info = await acc.api('oauth/info', { req }); }
  catch (e) { alertDialog(e.status === 410 ? t('La petición de conexión ha caducado. Vuelve a empezar desde la otra aplicación.') : e.message); return false; }
  if (!acc.account()) {
    await acc.refreshAccount().catch(() => null);
    if (!acc.account()) {
      if (!(await confirmDialog(t('«{app}» quiere conectarse a tu cuenta de Revela. Primero, inicia sesión.').replace('{app}', info.client)))) return false;
      try { await signIn(); } catch (e) { if (e.message !== 'CANCELLED') alertDialog(e.message); return false; }
    }
  }
  const ok = await confirmDialog(t('¿Permitir que «{app}» ({host}) vea, cree y cambie tus presentaciones en la nube de Revela, en nombre de {email}? Puedes quitarle el acceso cuando quieras en Mi cuenta ▸ Desarrolladores e IA.')
    .replace('{app}', info.client).replace('{host}', info.host).replace('{email}', acc.account().email), { ok: t('Permitir') });
  if (!ok) { location.href = info.deny; return false; }
  try { const r = await acc.api('oauth/approve', { req }); location.href = r.redirect; return true; }
  catch (e) { alertDialog(e.status === 410 ? t('La petición de conexión ha caducado. Vuelve a empezar desde la otra aplicación.') : e.message); return false; }
}
