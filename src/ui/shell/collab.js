// Co-editing in the interface: the "Colaborar" dialog (links for viewing,
// commenting or editing, and who is in), the people in the title bar, their
// selections on the slide, the chat, and joining from a shared link.

import { state, subscribe, adoptDeck, setPersist, applyRemote } from '../../core/store.js';
import { loadDeck } from '../../core/model.js';
import { saveProject } from '../../io/formats/project.js';
import { session, onCollab, hostCollab, joinCollab, peerListen, peerConnect, collabLink, newCode } from '../../features/live/collab.js';
import { ROLES } from '../../features/live/collabsync.js';
import { collabServerReady, createRoom, roomConnect } from '../../io/cloud/collabserver.js';
import { author, setAuthor } from '../../features/collab/comments.js';
import * as slides from '../../features/document/slides.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog, promptDialog } from '../dialogs/dialog.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROLE_NAME = { view: 'Ver', comment: 'Comentar', edit: 'Editar' };
const initials = n => (String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase();
let unread = 0;

async function askName() {
  let n = author();
  if (!n) { n = ((await promptDialog(t('Tu nombre (lo verán los demás):'), '')) || '').trim(); if (!n) return null; setAuthor(n); }
  return n;
}

// ---- The dialog -------------------------------------------------------------
export async function openCollab() {
  document.getElementById('collab-modal')?.remove();
  if (!session) {
    const viaServer = collabServerReady();
    if (!(await confirmDialog(viaServer
      ? t('Colaborar en directo con tu servidor: quien tenga un enlace verá los cambios al momento y, según el enlace, podrá comentar o editar. La presentación se guarda en tu servidor mientras dure la sesión (aunque cierres esta pestaña) y se borra al terminarla. ¿Empezar?')
      : t('Colaborar en directo: quien tenga un enlace verá los cambios al momento y, según el enlace, podrá comentar o editar. Los datos van directamente entre los navegadores (cifrados); esta pestaña debe seguir abierta mientras dure la sesión. ¿Empezar?')))) return;
    const name = await askName(); if (!name) return;
    const direct = async () => { const code = newCode(); hostCollab({ name, listen: await peerListen(code), code }); };
    try {
      if (viaServer) {                                       // a room on Revela's server (or the one set in Compartir)
        try {
          const r = await createRoom(state.deck);
          await joinCollab({ name, token: r.owner, connect: () => roomConnect(r.server, r.room), room: { code: r.room, tokens: r.tokens, server: r.server } });
        } catch (e) {                                        // offline, daily limit, account not allowed…: browser to browser
          if (/cancel|cerrado|closed/i.test(e.message || '')) return;
          if (!(await confirmDialog(t('No se pudo usar el servidor: ') + (e.message || e) + ' ' + t('¿Colaborar directamente entre navegadores? (Esta pestaña tendrá que seguir abierta.)')))) return;
          await direct();
        }
      } else await direct();                                 // browser to browser
    } catch (e) { return alertDialog(t('No se pudo empezar la sesión: ') + (e.type || e.message || e)); }
  }
  const back = document.createElement('div'); back.id = 'collab-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:min(360px,94vw);max-width:min(560px,94vw)">
    <button class="modal-close">✕</button><h3>${t('Colaborar')}</h3><div class="cb-body"></div></div>`;
  document.body.appendChild(back);
  const close = () => { back.remove(); off(); };
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const body = back.querySelector('.cb-body');
  const paint = () => {
    if (!session) { close(); return; }
    const host = session.host;
    body.innerHTML = (host ? `<p class="host-help">${t('Envía el enlace según lo que quieras permitir:')}</p>`
      + ROLES.slice().reverse().map(r => `<label class="fr-l">${t(ROLE_NAME[r])}<span class="sh-row"><input readonly class="cb-link" data-role="${r}" value="${esc(collabLink(session.code, session.tokens[r], session.server))}"><button type="button" class="mini2 cb-copy">${t('Copiar')}</button></span></label>`).join('')
      : `<p class="host-help">${t('Estás en la presentación de otra persona. Tu permiso:')} <b>${t(ROLE_NAME[session.role])}</b>.</p>`)
      + `<h4>${t('Personas')}</h4><div class="cb-people">${[session.me, ...session.peers()].map(p => `<div class="cb-person"><span class="cb-av" style="background:${p.color}">${esc(initials(p.name))}</span>
          <span>${esc(p.name)}${p.id === session.me.id ? ` (${t('tú')})` : ''}</span>
          ${host && !(p.id === 'host' || p.owner) && p.id !== session.me.id ? `<select data-peer="${p.id}">${ROLES.map(r => `<option value="${r}"${p.role === r ? ' selected' : ''}>${t(ROLE_NAME[r])}</option>`).join('')}</select>` : `<span class="host-help">${p.id === 'host' || p.owner ? t('Anfitrión') : t(ROLE_NAME[p.role] || '')}</span>`}</div>`).join('')}</div>
      <div class="fr-actions"><button class="mini2 cb-stop">${host ? t('Terminar la sesión') : t('Salir de la sesión')}</button></div>`;
    body.querySelectorAll('.cb-copy').forEach(b => b.addEventListener('click', () => { const i = b.previousElementSibling; i.select(); navigator.clipboard?.writeText(i.value).catch(() => {}); b.textContent = t('Copiado'); }));
    body.querySelectorAll('[data-peer]').forEach(s => s.addEventListener('change', () => session.setRole(s.dataset.peer, s.value)));
    body.querySelector('.cb-stop').addEventListener('click', async () => { if (await confirmDialog(host ? t('¿Terminar la sesión? Los demás dejarán de ver la presentación.') : t('¿Salir de la sesión?'))) { session?.stop(); close(); } });
  };
  const off = onCollab(w => (w === 'peers' || w === 'role' ? paint() : w === 'end' || w === 'left' ? close() : null));
  paint();
}

// ---- Title bar, selections and chat --------------------------------------------
export function initCollabUI() {
  const bar = document.getElementById('collab-bar');
  const paintBar = () => {
    if (!bar) return;
    bar.hidden = !session;
    if (!session) return;
    const peers = session.peers();
    bar.querySelector('.collab-peers').innerHTML = peers.map(p => {
      const i = state.deck.slides.findIndex(s => s.id === p.slide);
      return `<button type="button" class="cb-av" data-goto="${esc(p.slide || '')}" style="background:${p.color}" title="${esc(p.name)}${i >= 0 ? ` · ${t('diapositiva')} ${i + 1}` : ''}">${esc(initials(p.name))}</button>`;
    }).join('');
    bar.querySelector('.collab-role').textContent = session.role === 'edit' ? '' : `${t('Solo')} ${t(ROLE_NAME[session.role]).toLowerCase()}`;
    const badge = bar.querySelector('.collab-unread'); badge.textContent = unread || ''; badge.hidden = !unread;
  };
  bar?.addEventListener('click', e => {
    const av = e.target.closest('[data-goto]');
    if (av && av.dataset.goto) { const i = state.deck.slides.findIndex(s => s.id === av.dataset.goto); if (i >= 0) slides.goToSlide(i); return; }
    if (e.target.closest('.collab-chat-btn')) toggleChat();
    else if (e.target.closest('.collab-open')) openCollab();
  });
  const paintSel = () => {
    const stage = document.getElementById('stage'); if (!stage) return;
    stage.querySelectorAll('.collab-sel').forEach(x => x.remove());
    if (!session) return;
    const cur = state.deck.slides[state.ui.slideIndex]?.id;
    for (const p of session.peers()) {
      if (p.slide !== cur || !p.sel) continue;
      const el = stage.querySelector(`.block[data-id="${CSS.escape(p.sel)}"]`); if (!el) continue;
      const box = document.createElement('div'); box.className = 'collab-sel';
      box.style.cssText = `left:${el.style.left};top:${el.style.top};width:${el.style.width};height:${el.style.height};transform:${el.style.transform};--c:${p.color}`;
      box.dataset.name = p.name; stage.appendChild(box);
    }
  };
  subscribe(() => { paintBar(); paintSel(); });
  window.addEventListener('revela:lang', paintBar);
  onCollab((what, m) => {
    if (what === 'chat' && m && m.id !== session?.me.id && !document.getElementById('collab-chat')?.classList.contains('open')) unread++;
    if (what === 'chat') paintChat();
    if (what === 'end' && !session) ended();
    paintBar(); paintSel();
  });
  window.addEventListener('beforeunload', e => { if (session?.host && session.peers().length) { e.preventDefault(); e.returnValue = ''; } });
  joinFromURL();
}

function toggleChat() {
  let p = document.getElementById('collab-chat');
  if (!p) {
    p = document.createElement('div'); p.id = 'collab-chat';
    p.innerHTML = `<div class="cc-head"><b>${t('Chat')}</b><button type="button" class="mini cc-close">✕</button></div><div class="cc-msgs"></div>
      <form class="cc-form"><input class="cc-in" maxlength="2000" placeholder="${t('Escribe un mensaje…')}" autocomplete="off"><button class="mini2">${t('Enviar')}</button></form>`;
    document.body.appendChild(p);
    p.querySelector('.cc-close').addEventListener('click', () => p.classList.remove('open'));
    p.querySelector('.cc-form').addEventListener('submit', e => {
      e.preventDefault(); const i = p.querySelector('.cc-in'); const v = i.value.trim(); if (!v || !session) return;
      session.sendChat(v); i.value = '';
      if (!session.host) { session.chat.push({ id: session.me.id, name: session.me.name, color: session.me.color, text: v, at: Date.now() }); paintChat(); }
    });
  }
  p.classList.toggle('open');
  if (p.classList.contains('open')) { unread = 0; paintChat(); p.querySelector('.cc-in').focus(); applyRemote(() => {}); }
}
function paintChat() {
  const box = document.querySelector('#collab-chat .cc-msgs'); if (!box || !session) return;
  box.innerHTML = session.chat.map(m => `<div class="cc-msg${m.id === session.me.id ? ' mine' : ''}"><span class="cc-name" style="color:${m.color}">${esc(m.name)}</span>
    <span class="cc-time">${new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><div>${esc(m.text)}</div></div>`).join('');
  box.scrollTop = box.scrollHeight;
}

// ---- Joining from a link --------------------------------------------------------
let ownDeck = null;
async function joinFromURL() {
  const q = new URLSearchParams(location.search), code = q.get('collab'), token = q.get('k'), srv = q.get('srv');
  if (!code || !token) return;
  const name = await askName(); if (!name) return;
  ownDeck = state.deck;
  try {
    await joinCollab({ name, token, connect: () => (srv ? roomConnect(srv, code) : peerConnect(code)) });
    history.replaceState(null, '', location.pathname + '?collab=' + encodeURIComponent(code) + '&k=' + encodeURIComponent(token) + (srv ? '&srv=' + encodeURIComponent(srv) : ''));
  } catch (e) {
    alertDialog(e.message === 'denied' ? t('Ese enlace ya no es válido.') : t('No se pudo conectar con la sesión: ¿sigue abierta en el navegador de quien la compartió?'));
  }
}
async function ended() {
  if (!ownDeck) return;                                     // the host: nothing to restore
  // Offer a copy of the shared one (as a file), then back to one's own project.
  if (await confirmDialog(t('La sesión de colaboración ha terminado. ¿Descargar una copia de la presentación? Después vuelves a la tuya.'))) saveProject();
  state.ui.lock = null;
  setPersist(true);
  adoptDeck(loadDeck() || ownDeck);
  ownDeck = null;
  history.replaceState(null, '', location.pathname);
}
