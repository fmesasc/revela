// Google account in the interface: sign in, "My presentations" (a start screen
// with the Revela presentations in Drive, most recent first), the Drive save
// status next to the name, and what to do if it changed on another device.

import { whileOpening } from './opening.js';
import { esc } from '../../core/text.js';
import { popupMenu } from './menu.js';
import { state, replaceDeck } from '../../core/store.js';
import { emptyDeck, isUntitled, UNTITLED } from '../../core/model.js';
import * as gd from '../../io/cloud/gdrive.js';
import { hasAccounts } from '../../io/cloud/account.js';
import { initOneDrive } from '../dialogs/onedrive.js';
import { slideImageBlob } from '../../io/export/images.js';
import { isEmptyPlaceholder } from '../../features/document/master.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from '../dialogs/dialog.js';
import { savedDialog, driveSaveAsUI } from '../dialogs/gdrive.js';
import { toast } from './toast.js';

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
export async function driveThumbnail(now = false) {
  if (!now && Date.now() - lastThumb < 120000) return null;
  // (Drive shows it as the file's preview and in its lists: the first slide, sharp at 1600 px — Drive can't
  // leaf through a .revela.json — with a discreet label: what it is and how many slides it has.)
  const vis = state.deck.slides.filter(s => !s.hidden), first = vis[0] || state.deck.slides[0];
  const blob = await slideImageBlob(first, 'jpg', state.deck, { scale: 1600 / state.deck.size.w });
  if (!blob) return null;
  // (Under the slide — never over it —, a slim band: Revela's icon, the presentation's name and how many slides.)
  const img = await createImageBitmap(blob), W = 1600, SH = Math.round(W * img.height / img.width), BAND = 76, H = SH + BAND;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, W, SH);
  g.fillStyle = '#141922'; g.fillRect(0, SH, W, BAND); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, SH, W, 1);
  const font = 'system-ui, -apple-system, "Segoe UI", sans-serif', mid = SH + BAND / 2 + 1;
  const ic = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = new URL('../../../icons/drive/icon-64.png', import.meta.url).href; });
  let x = 36; if (ic) { g.drawImage(ic, x, SH + (BAND - 36) / 2, 36, 36); x += 36 + 16; }
  const count = t('{n} diapositivas').replace('{n}', vis.length);
  g.textBaseline = 'middle'; g.font = `400 26px ${font}`; const cw = g.measureText(count).width;
  g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(count, W - 36 - cw, mid);
  // (The name, cut with «…» if it doesn't fit before the count.)
  let name = isUntitled(state.deck.name) ? t(UNTITLED) : state.deck.name; g.font = `600 27px ${font}`;
  const room = W - 36 - cw - 40 - x; while (name.length > 3 && g.measureText(name).width > room) name = name.slice(0, -2).trimEnd() + '…';
  g.fillStyle = '#ffffff'; g.fillText(name, x, mid);
  lastThumb = Date.now();
  return c.toDataURL('image/jpeg', 0.82).split(',')[1];
}

// ---- Title bar: account and save status -------------------------------------------
// [icon, what it says in the bar, its tip]: where it is (Drive) and how it is, in words.
const STATUS = {
  pending: ['cloud_queue', 'Drive · Sin guardar', 'Cambios sin guardar en Drive'], saving: ['cloud_sync', 'Drive · Guardando…', 'Guardando en Drive…'],
  saved: ['cloud_done', 'Drive · Guardado', 'Guardado en Drive'],
  offline: ['cloud_off', 'Drive · Volver a conectar', 'Google pide confirmar el acceso a Drive de nuevo: haz clic. Mientras, los cambios se guardan en este navegador.'],
  error: ['error', 'Drive · No se pudo guardar', 'No se pudo guardar en Drive: haz clic para reintentar'], conflict: ['sync_problem', 'Drive · Cambió en otro sitio', 'Ha cambiado en otro dispositivo'],
  big: ['cloud_upload', 'Drive · Guardar ahora', 'Es demasiado grande para subirla sola tras cada cambio: haz clic para guardarla ahora. Mientras, los cambios se guardan en este navegador.'],
};
function paintBar() {
  const btn = document.getElementById('account-btn'), st = document.getElementById('drive-status');
  const a = gd.account();
  if (btn) {
    btn.innerHTML = a ? (a.picture ? `<img src="${esc(a.picture)}" alt="" referrerpolicy="no-referrer">` : `<span class="acc-init">${initial(a)}</span>`)
      : `<i class="ms">add_to_drive</i><span>Google Drive</span>`;   // (named after what it connects: the Revela account has its own button)
    btn.title = a ? `${a.name} · ${a.email}` : t('Iniciar sesión con Google');
    btn.classList.toggle('signed', !!a);
    // (With Revela accounts, one sign-in in the bar: the account's. Drive is part of it — «Mi cuenta» —, its state chip stays.)
    btn.hidden = hasAccounts();
  }
  if (st) {
    const s = gd.linkedFile() && a ? gd.driveStatus() : 'idle', info = STATUS[s];
    st.hidden = !info;
    if (info) { st.innerHTML = `<i class="ms">${info[0]}</i><span>${esc(t(info[1]))}</span>`; st.title = t(info[2]) + (s === 'saved' ? ' ▸ ' + gd.whereLabel(gd.linkedFile()) : ''); st.dataset.state = s; }
  }
  const cf = document.getElementById('drive-conflict'); if (cf) cf.hidden = gd.driveStatus() !== 'conflict';
}

function accountMenu(btn) {
  const a = gd.account();
  popupMenu(btn, { id: 'account-menu', className: 'account-menu', attr: 'am', align: 'right',
    html: `<div class="am-who">${a.picture ? `<img src="${esc(a.picture)}" alt="" referrerpolicy="no-referrer">` : `<span class="acc-init">${initial(a)}</span>`}<div><b>${esc(a.name)}</b><div>${esc(a.email)}</div></div></div>
    <button data-am="home"><i class="ms">folder_open</i>${t('Mis presentaciones')}</button>
    <button data-am="out"><i class="ms">logout</i>${t('Cerrar sesión')}</button>`,
    onPick: async k => {
      if (k === 'home') openHome();
      else if (await confirmDialog(t('¿Cerrar la sesión de Google en Revela? Tus presentaciones siguen en tu Drive.'))) { await gd.signOut(); paintBar(); }
    } });
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
      try { await whileOpening(gd.openPresentation(file.dataset.id), file.querySelector('.hf-name')?.textContent || ''); close(); } catch (err) { friendly(err); }
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
  gd.setThumbnailMaker(() => driveThumbnail());
  gd.startAutosave(); gd.renewOnGesture();
  initOneDrive();                                             // (OneDrive: its chip, and saving itself while one edits)   // (Drive's hour-long access renewed quietly on a click before it ends)
  gd.onDrive(paintBar);
  // Moved or renamed in Drive: it keeps saving there, and says where; gone: asks where to keep it now.
  gd.onDriveNote(async n => {
    if (n.kind === 'moved') toast(n.folder ? t('La presentación se ha movido en Drive a «{f}»: se sigue guardando ahí.').replace('{f}', n.folder) : t('La presentación se ha movido a otra carpeta de Drive: se sigue guardando ahí.'));
    else if (n.kind === 'renamed') toast(t('En Drive ahora se llama «{n}».').replace('{n}', n.name.replace(/\.revela\.json$/i, '')));
    else if (n.kind === 'missing') { paintBar(); if (await confirmDialog(t('No encuentro «{n}» en Drive: se ha borrado o ya no tienes acceso. ¿La guardas de nuevo en Drive?').replace('{n}', (n.name || '').replace(/\.revela\.json$/i, '')))) driveSaveAsUI(); }
    paintBar();
  });
  window.addEventListener('revela:lang', paintBar);
  document.getElementById('account-btn')?.addEventListener('click', e => (gd.account() ? accountMenu(e.currentTarget) : signInFlow()));
  document.getElementById('drive-status')?.addEventListener('click', async () => {
    const s = gd.driveStatus();
    if (s === 'offline' || s === 'error' || s === 'pending') { try { await gd.reconnect(); } catch (e) { friendly(e); } paintBar(); }
    else if (s === 'big') { try { await gd.savePresentation(); } catch (e) { friendly(e); } paintBar(); }
    else if (s === 'saved') savedDialog(gd.linkedFile());           // (where it is, and a link to it)
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
