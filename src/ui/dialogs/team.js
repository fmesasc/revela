// "My team" (official edition and desktop app): create a team or accept an
// invitation; its admins invite people within the paid seats, share a brand
// kit and publish templates; everyone uses them. The server decides who may do
// what (server/cloudflare/teams.js).

import { esc } from '../../core/text.js';
import { state, replaceDeck, snapshot } from '../../core/store.js';
import * as acc from '../../io/cloud/account.js';
import { cleanKit, saveKit, applyKit, listKits, kitFromDeck } from '../../features/design/brandkit.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog, promptDialog } from './dialog.js';
import { openAccount } from './account.js';

const errorText = e => (e.status === 402 && e.data?.error === 'no seats' ? t('No quedan puestos libres ({n}). Compra más puestos para invitar a más personas.').replace('{n}', e.data.seats)
  : e.status === 403 ? t('Solo la administración del equipo puede hacer esto.') : e.data?.error === 'last admin' ? t('El equipo necesita al menos una persona que lo administre.')
  : `${t('Algo ha fallado:')} ${e.message}`);

export async function openTeam() {
  if (!acc.account()) { await acc.refreshAccount().catch(() => null); if (!acc.account()) return openAccount(); }
  document.getElementById('team-modal')?.remove();
  const back = document.createElement('div'); back.id = 'team-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal cloud" style="text-align:start;width:min(560px,94vw);max-width:none"><button class="modal-close">✕</button><h3>${t('Mi equipo')}</h3><div class="tm-body"><p class="host-help">${t('Cargando…')}</p></div></div>`;
  document.body.appendChild(back);
  const body = back.querySelector('.tm-body'), close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const act = fn => async e => { const b = e.currentTarget; b.disabled = true; try { await fn(); await render(); } catch (err) { b.disabled = false; alertDialog(errorText(err)); } };

  async function render() {
    let r; try { r = await acc.api('team'); } catch (e) { body.innerHTML = `<p class="host-help">${esc(errorText(e))}</p>`; return; }
    if (!r.team) {
      body.innerHTML = `<p class="host-help">${t('Un equipo (un centro educativo, una empresa) comparte el plan Pro pagado por puestos, un kit de marca y plantillas.')}</p>
        ${r.invites.length ? `<h4>${t('Invitaciones')}</h4>${r.invites.map(i => `<div class="sh-item"><span><b>${esc(i.name)}</b><br><small>${t('De')} ${esc(i.by || '')}</small></span><button type="button" class="fr-do" data-join="${esc(i.id)}">${t('Unirme')}</button></div>`).join('')}` : ''}
        <h4>${t('Crear un equipo')}</h4><div class="sh-row"><input type="text" class="tm-name" placeholder="${t('Nombre del centro o empresa')}" maxlength="80"><button type="button" class="fr-do tm-create">${t('Crear')}</button></div>`;
      body.querySelectorAll('[data-join]').forEach(b => b.addEventListener('click', act(() => acc.api('team/accept', { id: b.dataset.join }).then(() => acc.refreshAccount()))));
      body.querySelector('.tm-create').addEventListener('click', act(async () => { const n = body.querySelector('.tm-name').value.trim(); if (!n) throw new Error(t('Escribe un nombre.')); await acc.api('team', { name: n }); }));
      return;
    }
    const T = r.team, admin = r.role === 'admin', me = acc.account()?.email, used = Object.keys(T.members).length + Object.keys(T.invited).length;
    const until = T.until ? new Date(T.until).toLocaleDateString(currentLang(), { dateStyle: 'long' }) : '';
    body.innerHTML = `<p><b>${esc(T.name)}</b> · ${T.active ? `${t('Pro activo hasta')} ${esc(until)}` : t('Sin pagar: los miembros no tienen Pro')}</p>
      <h4>${t('Personas')} (${used}/${T.seats} ${t('puestos')})</h4>
      ${Object.entries(T.members).map(([e, m]) => `<div class="sh-item"><span>${esc(e)}${e === me ? ` (${t('tú')})` : ''}</span><small>${t(m.role === 'admin' ? 'Administración' : 'Miembro')}</small>
        ${admin || e === me ? `<button type="button" class="mini2" data-rm="${esc(e)}">${t(e === me ? 'Salir' : 'Quitar')}</button>` : ''}</div>`).join('')}
      ${Object.keys(T.invited).map(e => `<div class="sh-item"><span>${esc(e)}</span><small>${t('Invitación pendiente')}</small>${admin ? `<button type="button" class="mini2" data-rm="${esc(e)}">${t('Quitar')}</button>` : ''}</div>`).join('')}
      ${admin && acc.account()?.billingTest ? `<p class="host-help acc-test" role="note">${t('Modo de prueba: no se cobra nada (tarjeta de prueba 4242 4242 4242 4242)')}</p>` : ''}
      ${admin ? `<div class="sh-row"><input type="email" class="tm-email" placeholder="${t('correo@ejemplo.com')}"><select class="tm-role"><option value="member">${t('Miembro')}</option><option value="admin">${t('Administración')}</option></select><button type="button" class="mini2 tm-invite">${t('Invitar')}</button></div>
        <div class="sh-row"><label class="fr-chk" style="margin:0">${t('Puestos')} <input type="number" class="tm-seats" min="3" max="1000" value="${Math.max(3, T.seats, used)}" style="width:6em"></label><button type="button" class="fr-do tm-buy">${t('Pagar los puestos')}</button>
          ${T.active ? `<button type="button" class="mini2 tm-portal">${t('Gestionar la suscripción')}</button>` : ''}</div>` : ''}
      <h4>${t('Kit de marca del equipo')}</h4>
      ${T.brand ? `<div class="sh-item"><span>${esc(T.brand.name || '')} ${(T.brand.colors || []).map(c => `<i class="tm-sw" style="background:${esc(c)}"></i>`).join('')}</span><button type="button" class="mini2 tm-use-brand">${t('Aplicar a esta presentación')}</button></div>` : `<p class="host-help">${t('Aún no hay kit de marca.')}</p>`}
      ${admin ? `<button type="button" class="mini2 tm-set-brand">${t('Compartir un kit de marca con el equipo')}</button>` : ''}
      <h4>${t('Plantillas del equipo')}</h4>
      ${T.templates.length ? T.templates.map(x => `<div class="sh-item"><span>${esc(x.name)}</span><button type="button" class="mini2" data-tpl="${esc(x.id)}">${t('Usar')}</button>${admin ? `<button type="button" class="mini2" data-tpl-rm="${esc(x.id)}">✕</button>` : ''}</div>`).join('') : `<p class="host-help">${t('Aún no hay plantillas.')}</p>`}
      ${admin ? `<button type="button" class="mini2 tm-publish">${t('Publicar esta presentación como plantilla')}</button><p class="host-help">${t('Consejo: bloquea el logotipo y los elementos fijos (panel Selección) antes de publicarla.')}</p>` : ''}`;
    const q = s => body.querySelector(s);
    body.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', act(async () => {
      const self = b.dataset.rm === me;
      if (!(await confirmDialog(t(self ? '¿Salir del equipo? Perderás el plan Pro del equipo.' : '¿Quitar a esta persona del equipo?')))) return;
      await acc.api('team/remove', { email: b.dataset.rm }); await acc.refreshAccount();
    })));
    q('.tm-invite')?.addEventListener('click', act(async () => { const e = q('.tm-email').value.trim(); if (!e) return; await acc.api('team/invite', { email: e, role: q('.tm-role').value }); }));
    q('.tm-buy')?.addEventListener('click', act(() => acc.buy('team-seat', { seats: Math.max(3, +q('.tm-seats').value || 3) })));
    q('.tm-portal')?.addEventListener('click', act(() => acc.manageBilling()));
    q('.tm-use-brand')?.addEventListener('click', () => { const k = cleanKit(T.brand); if (k) { saveKit({ ...k, id: 'team-' + T.id }); applyKit(k); close(); } });
    q('.tm-set-brand')?.addEventListener('click', act(async () => {
      const kits = [kitFromDeck(), ...listKits()], names = kits.map((k, i) => `${i + 1}. ${k.name}${i ? '' : ' (' + t('esta presentación') + ')'}`).join('\n');
      const n = await promptDialog(t('¿Qué kit de marca compartir? Escribe su número:') + '\n' + names, '1'); if (n == null) return;
      const k = cleanKit(kits[(+n || 1) - 1]); if (!k) throw new Error(t('Ese kit está vacío.'));
      await acc.api('team/brand', { brand: k });
    }));
    body.querySelectorAll('[data-tpl]').forEach(b => b.addEventListener('click', act(async () => {
      if (!(await confirmDialog(t('¿Empezar una presentación nueva con esta plantilla? Sustituye a la actual (Ctrl+Z la recupera).')))) return;
      const { deck } = await acc.api('team/template?id=' + encodeURIComponent(b.dataset.tpl)); replaceDeck(deck); close();
    })));
    body.querySelectorAll('[data-tpl-rm]').forEach(b => b.addEventListener('click', act(async () => { if (await confirmDialog(t('¿Borrar esta plantilla del equipo?'))) await acc.api('team/template/delete', { id: b.dataset.tplRm }); })));
    q('.tm-publish')?.addEventListener('click', act(async () => {
      const name = await promptDialog(t('Nombre de la plantilla:'), state.deck.name || ''); if (!name) return;
      await acc.api('team/template', { name, deck: snapshot(state.deck) });
    }));
  }
  render();
}
