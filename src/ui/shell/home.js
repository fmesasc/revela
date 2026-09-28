// Google account in the interface: sign in, "My presentations" (a start screen
// with the Revela presentations in Drive, most recent first), the Drive save
// status next to the name, and what to do if it changed on another device.

import { state, replaceDeck } from '../../core/store.js';
import { emptyDeck } from '../../core/model.js';
import * as gd from '../../io/cloud/gdrive.js';
import { slideImageBlob } from '../../io/export/images.js';
import { isEmptyPlaceholder } from '../../features/document/master.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from '../dialogs/dialog.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const friendly = e => alertDialog(e.message === 'NO_TOKEN' ? t('Vuelve a iniciar sesión con Google.') : (e.message || String(e)));
const initial = a => esc((a?.name || a?.email || '?').trim()[0].toUpperCase());

// Is there anything in the current presentation worth keeping?
const hasContent = () => state.deck.slides.length > 1 || state.deck.slides.some(s => s.blocks.some(b => !isEmptyPlaceholder(b)));
// Before another presentation replaces this one: if it only lives in this
// browser, it is saved to Drive first, so nothing is lost.
async function keepCurrent() {
  if (gd.linkedFile() || !hasContent() || !gd.account()) return true;
  try { await gd.savePresentation(); return true; }
  catch (e) { return confirmDialog(t('No se pudo guardar la presentación actual en Drive. ¿Abrir la otra de todos modos? La actual se perderá.')); }
}

// ---- Thumbnails for Drive (first slide, small JPEG), at most every 2 minutes ----
let lastThumb = 0;
async function thumbnail() {
  if (Date.now() - lastThumb < 120000) return null;
  const blob = await slideImageBlob(state.deck.slides.find(s => !s.hidden) || state.deck.slides[0], 'jpg');
  if (!blob) return null;
  const img = await createImageBitmap(blob), W = 480, H = Math.round(W * img.height / img.width);
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
  lastThumb = Date.now();
  return c.toDataURL('image/jpeg', 0.8).split(',')[1];
}

// ---- Title bar: account and save status -------------------------------------------
const STATUS = {
  pending: ['cloud_queue', 'Cambios sin guardar en Drive'], saving: ['cloud_sync', 'Guardando en Drive…'], saved: ['cloud_done', 'Guardado en Drive'],
  offline: ['cloud_off', 'Conecta con Google para guardar en Drive'], error: ['error', 'No se pudo guardar en Drive'], conflict: ['sync_problem', 'Ha cambiado en otro dispositivo'],
};
function paintBar() {
  const btn = document.getElementById('account-btn'), st = document.getElementById('drive-status');
  const a = gd.account();
  if (btn) {
    btn.innerHTML = a ? (a.picture ? `<img src="${esc(a.picture)}" alt="" referrerpolicy="no-referrer">` : `<span class="acc-init">${initial(a)}</span>`)
      : `<i class="ms">account_circle</i><span>${t('Iniciar sesión')}</span>`;
    btn.title = a ? `${a.name} · ${a.email}` : t('Iniciar sesión con Google');
    btn.classList.toggle('signed', !!a);
  }
  if (st) {
    const s = gd.linkedFile() && a ? gd.driveStatus() : 'idle', info = STATUS[s];
    st.hidden = !info;
    if (info) { st.innerHTML = `<i class="ms">${info[0]}</i>`; st.title = t(info[1]); st.dataset.state = s; }
  }
  const cf = document.getElementById('drive-conflict'); if (cf) cf.hidden = gd.driveStatus() !== 'conflict';
}

function accountMenu(btn) {
  document.getElementById('account-menu')?.remove();
  const a = gd.account();
  const m = document.createElement('div'); m.id = 'account-menu'; m.className = 'account-menu';
  m.innerHTML = `<div class="am-who">${a.picture ? `<img src="${esc(a.picture)}" alt="" referrerpolicy="no-referrer">` : `<span class="acc-init">${initial(a)}</span>`}<div><b>${esc(a.name)}</b><div>${esc(a.email)}</div></div></div>
    <button data-am="home"><i class="ms">folder_open</i>${t('Mis presentaciones')}</button>
    <button data-am="out"><i class="ms">logout</i>${t('Cerrar sesión')}</button>`;
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(); m.style.top = r.bottom + 6 + 'px'; m.style.right = Math.max(8, innerWidth - r.right) + 'px';
  const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
  setTimeout(() => document.addEventListener('pointerdown', off, true));
  m.addEventListener('click', async e => {
    const b = e.target.closest('[data-am]'); if (!b) return; m.remove();
    if (b.dataset.am === 'home') openHome();
    else if (await confirmDialog(t('¿Cerrar la sesión de Google en Revela? Tus presentaciones siguen en tu Drive.'))) { await gd.signOut(); paintBar(); }
  });
}

export async function signInFlow() {
  try { await gd.signIn(); paintBar(); return true; } catch (e) { friendly(e); return false; }
}

// ---- "My presentations" --------------------------------------------------------------
export async function openHome() {
  document.getElementById('home-screen')?.remove();
  const scr = document.createElement('div'); scr.id = 'home-screen'; scr.className = 'modal-backdrop home-screen';
  scr.innerHTML = `<div class="home"><button class="modal-close">✕</button>
    <h2>${t('Mis presentaciones')}</h2>
    <div class="home-new">
      <button data-home="new"><span class="hn-thumb"><i class="ms">add</i></span>${t('En blanco')}</button>
      <button data-home="templates"><span class="hn-thumb"><i class="ms">auto_awesome_mosaic</i></span>${t('Plantillas')}</button>
      <button data-home="pick"><span class="hn-thumb"><i class="ms">search</i></span>${t('Buscar en Drive')}</button>
      <button data-home="local"><span class="hn-thumb"><i class="ms">upload_file</i></span>${t('Abrir del ordenador')}</button>
    </div>
    <h3>${t('Recientes en tu Drive')}</h3><div class="home-list"></div></div>`;
  document.body.appendChild(scr);
  const close = () => scr.remove();
  scr.querySelector('.modal-close').addEventListener('click', close);
  scr.addEventListener('click', e => { if (e.target === scr) close(); });
  const list = scr.querySelector('.home-list');
  const load = async () => {
    if (!gd.account()) {
      list.innerHTML = `<div class="home-signin"><p>${t('Inicia sesión con Google para ver tus presentaciones de Revela en Drive, abrirlas desde cualquier equipo y guardarlas solas mientras trabajas. Revela solo puede ver los archivos que crea o que abres con él.')}</p>
        <button class="fr-do" data-home="signin"><i class="ms">login</i> ${t('Iniciar sesión con Google')}</button></div>`;
      return;
    }
    list.innerHTML = `<p class="host-help">${t('Cargando…')}</p>`;
    try {
      const files = await gd.listPresentations(), cur = gd.linkedFile()?.id;
      list.innerHTML = !files.length ? `<p class="host-help">${t('Aún no tienes presentaciones de Revela en Drive. Crea una o guarda la actual.')}</p>`
        : files.map(f => `<div class="home-file${f.id === cur ? ' current' : ''}" data-id="${esc(f.id)}" tabindex="0" role="button">
            <span class="hf-thumb">${f.thumbnailLink ? `<img src="${esc(f.thumbnailLink)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : '<i class="ms">slideshow</i>'}</span>
            <span class="hf-name">${esc(f.title)}</span><span class="hf-date">${new Date(f.modifiedTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <button class="hf-del mini" title="${t('Mover a la papelera de Drive')}"><i class="ms">delete</i></button></div>`).join('');
    } catch (e) {
      list.innerHTML = `<div class="home-signin"><p>${t('Hay que volver a conectar con Google para ver tus presentaciones.')}</p><button class="fr-do" data-home="reconnect">${t('Conectar')}</button></div>`;
    }
  };
  scr.addEventListener('click', async e => {
    const del = e.target.closest('.hf-del');
    if (del) {
      e.stopPropagation(); const id = del.closest('.home-file').dataset.id;
      if (await confirmDialog(t('¿Mover esta presentación a la papelera de tu Drive?'))) { try { await gd.deletePresentation(id); load(); } catch (err) { friendly(err); } }
      return;
    }
    const file = e.target.closest('.home-file');
    if (file) {
      if (file.dataset.id === gd.linkedFile()?.id) { close(); return; }
      if (!(await keepCurrent())) return;
      try { await gd.openPresentation(file.dataset.id); close(); } catch (err) { friendly(err); }
      return;
    }
    const act = e.target.closest('[data-home]')?.dataset.home; if (!act) return;
    if (act === 'signin') { if (await signInFlow()) load(); }
    else if (act === 'reconnect') { try { await gd.ensureToken(true); load(); } catch (err) { friendly(err); } }
    else if (act === 'new') {
      if (!(await keepCurrent())) return;
      replaceDeck(emptyDeck()); close();
      if (gd.account()) gd.savePresentation().catch(friendly);   // a new file in Drive, saved as you go
    } else if (act === 'pick') { close(); gd.openWithUI(); }
    else { close(); document.querySelector(`[data-action="${act === 'templates' ? 'gallery' : 'open'}"]`)?.click(); }
  });
  scr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList?.contains('home-file')) e.target.click(); });
  load();
}

export function initHome() {
  gd.setThumbnailMaker(thumbnail);
  gd.startAutosave();
  gd.onDrive(paintBar);
  document.getElementById('account-btn')?.addEventListener('click', e => (gd.account() ? accountMenu(e.currentTarget) : signInFlow()));
  document.getElementById('drive-status')?.addEventListener('click', async () => {
    const s = gd.driveStatus();
    if (s === 'offline' || s === 'error' || s === 'pending') { try { await gd.reconnect(); } catch (e) { friendly(e); } paintBar(); }
  });
  document.getElementById('drive-conflict')?.addEventListener('click', async e => {
    const b = e.target.closest('[data-cf]'); if (!b) return;
    try {
      if (b.dataset.cf === 'theirs') await gd.loadTheirs();
      else if (b.dataset.cf === 'mine') await gd.keepMine();
      else { await gd.savePresentation({ asNew: true }); }
    } catch (err) { friendly(err); }
    paintBar();
  });
  // After a reload the Google token is gone: one click on the cloud reconnects
  // (and brings a newer version from another device, if there is one).
  if (gd.needsReconnect()) gd.markOffline();
  paintBar();
}
