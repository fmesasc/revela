// «Mi nube»: a page to manage my presentations in Revela's cloud, like a drive —
// a picture of each one's first slide, folders (breadcrumbs, drag and drop and
// «Mover a…»), stars, recent ones, search (names and slide titles), sorting, grid
// or list, a menu per presentation and a trash kept for some days. Shared with me
// is a section apart (they can be starred, not filed). The server decides and
// checks everything (server/cloudflare/docs.js): this page only asks and shows.

import { esc } from '../../core/text.js';
import { state, replaceDeck } from '../../core/store.js';
import { isBlankDeck, emptyDeck, UNTITLED, isUntitled } from '../../core/model.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { nowInCloud } from '../shell/where.js';
import { download, slug } from '../../io/files.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog, promptDialog } from './dialog.js';
import { errorText, signedIn, openCloudShare } from './cloud.js';

const VIEW = 'revela.cloud.view', SORT = 'revela.cloud.sort';
const pref = (k, d, ok) => { try { const v = localStorage.getItem(k); return ok.includes(v) ? v : d; } catch { return d; } };
const keep = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const fold = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const hue = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const phone = () => matchMedia('(max-width: 700px)').matches;
const SECTIONS = [['mine', 'cloud', 'Mi nube'], ['shared', 'group', 'Compartidas conmigo'], ['starred', 'star', 'Destacadas'], ['recent', 'schedule', 'Recientes'], ['trash', 'delete', 'Papelera']];

// "2 hours ago"; a date beyond a month.
function ago(ts) {
  if (!ts) return '';
  const s = (ts - Date.now()) / 1000, a = Math.abs(s);
  if (a > 30 * 86400) return new Date(ts).toLocaleDateString(currentLang(), { dateStyle: 'medium' });
  const f = new Intl.RelativeTimeFormat(currentLang(), { numeric: 'auto' });
  for (const [n, u] of [[60, 'second'], [3600, 'minute'], [86400, 'hour'], [Infinity, 'day']]) if (a < n) return u === 'second' ? f.format(0, 'minute') : f.format(Math.round(s / ({ minute: 60, hour: 3600, day: 86400 })[u]), u);
}
const slidesText = n => (n === 1 ? t('1 diapositiva') : t('{n} diapositivas').replace('{n}', n));

let S = null;                       // the open page: { el, data, section, folder, q, sort, view, focus, back }

// ---- The page --------------------------------------------------------------------------------
export async function openCloudDocs({ section = 'mine', folder = null } = {}) {
  if (!cd.customTransport() && !(await signedIn())) return;
  closePage();
  const el = document.createElement('div'); el.id = 'cloud-docs-modal'; el.className = 'nb-page';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', t('Mi nube de Revela'));
  el.innerHTML = `<header class="nb-top">
      <h2><i class="ms">cloud</i><span>${t('Mi nube')}</span></h2>
      <label class="nb-search"><i class="ms">search</i><input type="search" placeholder="${t('Buscar por nombre o por título de diapositiva')}" aria-label="${t('Buscar')}"></label>
      <div class="nb-tools">
        <label class="nb-sortl"><span>${t('Ordenar')}</span><select class="nb-sort" aria-label="${t('Ordenar')}">
          <option value="updated">${t('Última modificación')}</option><option value="name">${t('Nombre')}</option><option value="created">${t('Fecha de creación')}</option></select></label>
        <div class="nb-views" role="group" aria-label="${t('Vista')}">
          <button type="button" data-view="grid" title="${t('Cuadrícula')}" aria-label="${t('Cuadrícula')}"><i class="ms">grid_view</i></button>
          <button type="button" data-view="list" title="${t('Lista')}" aria-label="${t('Lista')}"><i class="ms">view_list</i></button></div>
      </div>
      <button type="button" class="modal-close nb-close" title="${t('Cerrar')}" aria-label="${t('Cerrar')}"><i class="ms">close</i></button>
    </header>
    <div class="nb-body">
      <nav class="nb-side" aria-label="${t('Secciones')}">
        <button type="button" class="nb-newbtn"><i class="ms">add</i><span>${t('Nuevo')}</span></button>
        <div class="nb-secs"></div>
        <div class="nb-quota"></div>
      </nav>
      <main class="nb-main">
        <div class="nb-head"><nav class="nb-crumbs" aria-label="${t('Ruta')}"></nav><div class="nb-acts"></div></div>
        <div class="nb-note"></div>
        <div class="nb-content" aria-live="polite"></div>
      </main>
    </div>`;
  document.body.appendChild(el);
  S = { el, data: null, section, folder, q: '', sort: pref(SORT, 'updated', ['updated', 'name', 'created']), view: pref(VIEW, 'grid', ['grid', 'list']), focus: null, back: document.activeElement };
  wire(el);
  el.querySelector('.nb-content').innerHTML = `<p class="nb-empty-msg">${t('Cargando…')}</p>`;
  await reload();
  (el.querySelector('.nb-item[tabindex="0"]') || el.querySelector('.nb-search input'))?.focus();
}
export function closePage() {
  if (!S) return;
  S.el.remove(); menuClose(); try { S.back?.focus?.(); } catch {}
  S = null;
}
async function reload() {
  const me = S; if (!me) return;
  try { me.data = await cd.listDocs(); } catch (e) { me.el.querySelector('.nb-content').innerHTML = `<p class="nb-empty-msg">${esc(errorText(e))}</p>`; return; }
  if (S !== me) return;
  // (A folder that no longer exists: back to the top.)
  if (me.folder && !me.data.folders?.some(f => f.id === me.folder)) me.folder = null;
  render();
}

// ---- What is shown ---------------------------------------------------------------------------
const folders = () => S.data.folders || [];
const folderOf = id => folders().find(f => f.id === id);
const pathOf = id => { const out = []; for (let f = folderOf(id); f && out.length < 8; f = folderOf(f.parent)) out.unshift(f); return out; };
const parentOf = d => (d.folder && folderOf(d.folder) ? d.folder : null);
function docs() {
  const mine = (S.data.mine || []).map(d => ({ ...d, kind: 'mine', folder: parentOf(d), created: d.created || d.updated }));
  const shared = (S.data.shared || []).map(d => ({ ...d, kind: 'shared', updated: d.at, created: d.at }));
  return { mine, shared };
}
function items() {
  const { mine, shared } = docs(), live = mine.filter(d => !d.trashed), q = fold(S.q.trim());
  let fs = [], ds = [];
  if (q) {
    fs = folders().filter(f => fold(f.name).includes(q));
    ds = [...live.filter(d => fold(d.name).includes(q) || fold(d.text).includes(q)), ...shared.filter(d => fold(d.name).includes(q) || fold(d.owner).includes(q))];
  } else if (S.section === 'mine') { fs = folders().filter(f => (f.parent || null) === S.folder); ds = live.filter(d => d.folder === S.folder); }
  else if (S.section === 'shared') ds = shared;
  else if (S.section === 'starred') ds = [...live, ...shared].filter(d => d.starred);
  else if (S.section === 'recent') return { fs: [], ds: [...live, ...shared].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 24) };
  else if (S.section === 'trash') return { fs: [], ds: mine.filter(d => d.trashed).sort((a, b) => b.trashed - a.trashed) };
  const by = S.sort === 'name' ? (a, b) => a.name.localeCompare(b.name, currentLang(), { numeric: true, sensitivity: 'base' })
    : S.sort === 'created' ? (a, b) => (b.created || 0) - (a.created || 0) : (a, b) => (b.updated || 0) - (a.updated || 0);
  return { fs: fs.slice().sort((a, b) => a.name.localeCompare(b.name, currentLang(), { numeric: true, sensitivity: 'base' })), ds: ds.sort(by) };
}

function render() {
  const el = S.el, { mine } = docs(), view = phone() ? 'list' : S.view, { fs, ds } = items();
  el.dataset.view = view;
  el.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === S.view)));
  el.querySelector('.nb-sort').value = S.sort;
  el.querySelector('.nb-sort').disabled = ['recent', 'trash'].includes(S.section) && !S.q;
  // Sections, with my folders under «Mi nube».
  const tree = (parent, depth) => folders().filter(f => (f.parent || null) === parent).sort((a, b) => a.name.localeCompare(b.name, currentLang(), { numeric: true }))
    .map(f => `<button type="button" class="nb-sec nb-tree${!S.q && S.section === 'mine' && S.folder === f.id ? ' on' : ''}" data-go="${esc(f.id)}" data-folder="${esc(f.id)}" style="--d:${depth}"><i class="ms">folder</i><span>${esc(f.name)}</span></button>${tree(f.id, depth + 1)}`).join('');
  el.querySelector('.nb-secs').innerHTML = SECTIONS.map(([k, icon, label]) => `<button type="button" class="nb-sec${!S.q && S.section === k && !(k === 'mine' && S.folder) ? ' on' : ''}" data-sec="${k}"${k === 'mine' ? ' data-folder=""' : ''}>
      <i class="ms">${icon}</i><span>${t(label)}</span>${k === 'trash' && mine.some(d => d.trashed) ? `<em>${mine.filter(d => d.trashed).length}</em>` : ''}</button>${k === 'mine' && !phone() ? `<div class="nb-treebox">${tree(null, 1)}</div>` : ''}`).join('');
  // How many of the plan's.
  const n = mine.length, lim = S.data.limit || 0, trashed = mine.filter(d => d.trashed).length;
  el.querySelector('.nb-quota').innerHTML = `<div class="nb-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lim}" aria-valuenow="${n}"><i style="width:${lim ? Math.min(100, n / lim * 100).toFixed(1) : 0}%"${n >= lim ? ' class="full"' : ''}></i></div>
    <small>${t('{n} de {limit} presentaciones').replace('{n}', n).replace('{limit}', lim)}${trashed ? ` · ${t('{n} en la papelera').replace('{n}', trashed)}` : ''}</small>`;
  // Breadcrumbs (also where to drop).
  const crumbs = el.querySelector('.nb-crumbs');
  if (S.q) crumbs.innerHTML = `<span class="nb-crumb cur">${t('Resultados de «{q}»').replace('{q}', esc(S.q.trim()))}</span>`;
  else if (S.section === 'mine') crumbs.innerHTML = [{ id: '', name: t('Mi nube') }, ...pathOf(S.folder)].map((f, i, a) => (i === a.length - 1
    ? `<span class="nb-crumb cur" aria-current="page" data-folder="${esc(f.id)}">${esc(f.name)}</span>` : `<button type="button" class="nb-crumb" data-go="${esc(f.id)}" data-folder="${esc(f.id)}">${esc(f.name)}</button><i class="ms nb-sep">chevron_right</i>`)).join('');
  else crumbs.innerHTML = `<span class="nb-crumb cur">${t(SECTIONS.find(x => x[0] === S.section)[2])}</span>`;
  // Buttons for this place.
  const open = cd.cloudDoc(), acts = [];
  if (S.section === 'mine' && !S.q) {
    if (!open && (fs.length || ds.length)) acts.push(`<button type="button" class="fr-do" data-act="save"><i class="ms">cloud_upload</i> ${t('Guardar esta presentación aquí')}</button>`);
    acts.push(`<button type="button" class="mini2" data-act="folder"><i class="ms">create_new_folder</i> ${t('Nueva carpeta')}</button>`);
  }
  if (S.section === 'trash' && !S.q && mine.some(d => d.trashed)) acts.push(`<button type="button" class="mini2 nb-danger" data-act="empty"><i class="ms">delete_forever</i> ${t('Vaciar la papelera')}</button>`);
  el.querySelector('.nb-acts').innerHTML = acts.join('');
  // Notes: read-only beyond the plan, the trash.
  const notes = [];
  if (mine.some(d => d.readOnly) && S.section !== 'trash') notes.push(t('Tienes más presentaciones de las que permite tu plan gratuito ({n}): las más recientes se pueden editar y las demás quedan en solo lectura. No se borra ninguna. Pasa a Pro o borra alguna para editarlas.').replace('{n}', lim));
  if (S.section === 'trash' && !S.q) notes.push(t('Lo que está en la papelera se borra para siempre a los {n} días. Mientras tanto, nadie más puede abrirlo.').replace('{n}', S.data.trashDays || 30));
  el.querySelector('.nb-note').innerHTML = notes.map(x => `<p>${esc(x)}</p>`).join('');
  // The items.
  const box = el.querySelector('.nb-content');
  if (!fs.length && !ds.length) { box.innerHTML = empty(); return; }
  const head = view === 'list' ? `<div class="nb-lhead" aria-hidden="true"><span></span><span>${t('Nombre')}</span><span>${S.section === 'trash' ? t('En la papelera desde') : t('Modificada')}</span><span>${t('Propietario')}</span><span>${t('Diapositivas')}</span><span></span></div>` : '';
  box.innerHTML = `${head}${fs.length ? `${view === 'grid' ? `<h3 class="nb-h">${t('Carpetas')}</h3>` : ''}<div class="nb-items nb-folders" role="list">${fs.map(folderHTML).join('')}</div>` : ''}
    ${ds.length ? `${view === 'grid' && fs.length ? `<h3 class="nb-h">${t('Presentaciones')}</h3>` : ''}<div class="nb-items nb-docs" role="list">${ds.map(d => docHTML(d, view)).join('')}</div>` : ''}`;
  // Keyboard: one item in the tab order (the one last focused, else the first).
  const all = [...box.querySelectorAll('.nb-item')], at = all.find(x => x.dataset.id === S.focus) || all[0];
  if (at) at.tabIndex = 0;
  paintThumbs(ds);
}

function empty() {
  const cta = (a, icon, label, main) => `<button type="button" class="${main ? 'fr-do' : 'mini2'}" data-act="${a}"><i class="ms">${icon}</i> ${t(label)}</button>`;
  const box = (icon, title, text, btns = '') => `<div class="nb-empty"><i class="ms">${icon}</i><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}<div class="nb-ctas">${btns}</div></div>`;
  const open = cd.cloudDoc(), news = (!open ? cta('save', 'cloud_upload', 'Guardar esta presentación en la nube', true) : '') + cta('new', 'note_add', 'Nueva presentación', !!open);
  if (S.q) return box('search_off', t('Nada coincide con «{q}»').replace('{q}', esc(S.q.trim())), t('Prueba con otras palabras: se busca en los nombres y en los títulos de las diapositivas.'));
  if (S.section === 'mine' && S.folder) return box('folder_open', t('Esta carpeta está vacía'), t('Arrastra aquí presentaciones o usa «Mover a…» en su menú.'), news);
  if (S.section === 'mine') return box('cloud_upload', t('Aún no tienes ninguna presentación en la nube'), t('Guardadas en la nube se guardan solas, las abres desde cualquier dispositivo y puedes compartirlas.'), news);
  if (S.section === 'shared') return box('group', t('Nadie ha compartido nada contigo todavía.'), t('Cuando alguien comparta una presentación con tu cuenta, aparecerá aquí.'));
  if (S.section === 'starred') return box('star', t('Nada destacado todavía'), t('Marca con una estrella las que más uses para tenerlas a mano.'));
  if (S.section === 'trash') return box('delete', t('La papelera está vacía'), '');
  return box('schedule', t('Nada reciente'), '', news);
}

function folderHTML(f) {
  const where = S.q ? pathOf(f.parent).map(x => x.name).join(' › ') : '';
  return `<div class="nb-item nb-folder" role="listitem" tabindex="-1" draggable="true" data-kind="folder" data-id="${esc(f.id)}" data-folder="${esc(f.id)}" aria-label="${esc(t('Carpeta') + ' ' + f.name)}">
    <i class="ms nb-ficon">folder</i><span class="nb-name">${esc(f.name)}${where ? `<small>${esc(where)}</small>` : ''}</span>
    <button type="button" class="nb-more" tabindex="-1" aria-label="${t('Más acciones')}" aria-haspopup="menu"><i class="ms">more_vert</i></button></div>`;
}
function placeholder(d) {
  const h = hue(d.id);
  return `<div class="nb-ph" style="--h1:${h};--h2:${(h + 40) % 360}"><span>${esc(isUntitled(d.name) ? t(UNTITLED) : d.name)}</span></div>`;
}
function avatar(email) {
  return `<span class="nb-av" style="--h:${hue(email || '?')}" aria-hidden="true">${esc((email || '?')[0].toUpperCase())}</span>`;
}
function docHTML(d, view) {
  const open = cd.cloudDoc()?.id === d.id, c = cd.cachedThumb(d.id);
  const thumb = `<div class="nb-thumb">${c?.data ? `<img src="${esc(c.data)}" alt="">` : placeholder(d)}
    ${d.starred ? `<i class="ms nb-star" title="${t('Destacada')}">star</i>` : ''}${open ? `<em class="nb-here">${t('Abierta')}</em>` : ''}${d.readOnly ? `<i class="ms nb-lock" title="${t('Solo lectura')}">lock</i>` : ''}</div>`;
  const when = d.trashed ? ago(d.trashed) : ago(d.updated), slides = d.slides ? slidesText(d.slides) : '';
  const owner = d.kind === 'shared' ? `${avatar(d.owner)}<span>${esc(d.owner || '')}</span>` : `<span class="nb-me">${t('Yo')}</span>`;
  const where = S.q && d.kind === 'mine' ? pathOf(d.folder).map(x => x.name).join(' › ') : '';
  const label = [d.name, d.kind === 'shared' ? t('de {owner}').replace('{owner}', d.owner || '') : '', when].filter(Boolean).join(', ');
  const name = `<span class="nb-name"><b>${esc(isUntitled(d.name) ? t(UNTITLED) : d.name)}</b>${where ? `<small>${esc(where)}</small>` : ''}</span>`;
  const more = `<button type="button" class="nb-more" tabindex="-1" aria-label="${t('Más acciones')}" aria-haspopup="menu"><i class="ms">more_vert</i></button>`;
  const attrs = `class="nb-item nb-doc${open ? ' is-open' : ''}" role="listitem" tabindex="-1" data-kind="${d.kind}" data-id="${esc(d.id)}" aria-label="${esc(label)}"${d.kind === 'mine' && !d.trashed ? ' draggable="true"' : ''}`;
  if (view === 'list') return `<div ${attrs}>${thumb}${name}<small class="nb-when">${esc(when)}</small><small class="nb-owner">${owner}</small><small class="nb-slides">${esc(slides)}</small>${more}</div>`;
  const meta = d.kind === 'shared' ? `${avatar(d.owner)}<span>${esc(d.owner || '')}</span>` : `<span>${esc([when, slides].filter(Boolean).join(' · '))}</span>`;
  return `<div ${attrs}>${thumb}<div class="nb-info">${name}${more}</div><small class="nb-meta">${meta}</small></div>`;
}
// Pictures arrive after the list (in batches; remembered while the page is open).
async function paintThumbs(ds) {
  const me = S, want = ds.filter(d => d.kind === 'shared' || d.thumbAt);
  try { await cd.loadThumbs(want); } catch { return; }
  if (S !== me) return;
  for (const d of want) {
    const c = cd.cachedThumb(d.id), box = me.el.querySelector(`.nb-doc[data-id="${CSS.escape(d.id)}"] .nb-thumb`);
    if (!c?.data || !box) continue;
    const ph = box.querySelector('.nb-ph'); if (!ph) continue;
    const img = new Image(); img.alt = ''; img.src = c.data; ph.replaceWith(img);
  }
}

// ---- Wiring ------------------------------------------------------------------------------------
function wire(el) {
  el.querySelector('.nb-close').addEventListener('click', closePage);
  let typing = null;
  el.querySelector('.nb-search input').addEventListener('input', e => { clearTimeout(typing); typing = setTimeout(() => { if (!S) return; S.q = e.target.value; render(); }, 120); });
  el.querySelector('.nb-sort').addEventListener('change', e => { S.sort = e.target.value; keep(SORT, S.sort); render(); });
  el.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { S.view = b.dataset.view; keep(VIEW, S.view); render(); }));
  el.querySelector('.nb-newbtn').addEventListener('click', e => menuOpen(e.currentTarget, [
    ['note_add', 'Nueva presentación', () => newDeck()],
    ['create_new_folder', 'Nueva carpeta', () => newFolder(), S.section !== 'mine' || S.q],
    ['cloud_upload', 'Guardar esta presentación en la nube', () => saveHere(), !!cd.cloudDoc()],
  ]));
  el.addEventListener('click', e => {
    const go = e.target.closest('[data-go]'), sec = e.target.closest('[data-sec]'), act = e.target.closest('[data-act]'), more = e.target.closest('.nb-more'), item = e.target.closest('.nb-item');
    if (go) return goFolder(go.dataset.go || null);
    if (sec) { S.section = sec.dataset.sec; S.folder = null; clearSearch(); return render(); }
    if (act) return ({ save: saveHere, new: newDeck, folder: newFolder, empty: emptyTrash })[act.dataset.act]?.();
    if (more && item) { e.stopPropagation(); return itemMenu(item, more); }
    if (item) { setFocus(item); activate(item); }
  });
  el.addEventListener('contextmenu', e => { const item = e.target.closest('.nb-item'); if (!item) return; e.preventDefault(); setFocus(item); itemMenu(item, null, e.clientX, e.clientY); });
  el.addEventListener('keydown', onKey);
  // Drag and drop into folders (cards, the tree, the breadcrumbs).
  let drag = null;
  el.addEventListener('dragstart', e => {
    const item = e.target.closest?.('.nb-item[draggable="true"]'); if (!item) return;
    drag = { kind: item.dataset.kind, id: item.dataset.id };
    e.dataTransfer.setData('text/plain', item.dataset.id); e.dataTransfer.effectAllowed = 'move'; item.classList.add('nb-dragging');
  });
  el.addEventListener('dragend', () => { drag = null; el.querySelectorAll('.nb-dragging,.nb-drop').forEach(x => x.classList.remove('nb-dragging', 'nb-drop')); });
  const target = e => { const t0 = e.target.closest?.('[data-folder]'); if (!drag || !t0 || t0.classList.contains('nb-item') && t0.dataset.kind !== 'folder') return null; return okTarget(drag, t0.dataset.folder || null) ? t0 : null; };
  el.addEventListener('dragover', e => { const t0 = target(e); if (!t0) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.querySelectorAll('.nb-drop').forEach(x => x !== t0 && x.classList.remove('nb-drop')); t0.classList.add('nb-drop'); });
  el.addEventListener('dragleave', e => e.target.closest?.('[data-folder]')?.classList.remove('nb-drop'));
  el.addEventListener('drop', e => { const t0 = target(e); if (!t0) return; e.preventDefault(); const d = drag; drag = null; t0.classList.remove('nb-drop'); moveTo(d, t0.dataset.folder || null); });
  addEventListener('resize', onResize);
}
let resizing = null;
const onResize = () => { if (!S) { removeEventListener('resize', onResize); return; } clearTimeout(resizing); resizing = setTimeout(() => S && render(), 150); };
const clearSearch = () => { S.q = ''; const i = S.el.querySelector('.nb-search input'); if (i) i.value = ''; };
function goFolder(id) { S.section = 'mine'; S.folder = id && folderOf(id) ? id : null; S.focus = null; clearSearch(); render(); S.el.querySelector('.nb-item[tabindex="0"]')?.focus(); }
function setFocus(item) { S.el.querySelectorAll('.nb-item[tabindex="0"]').forEach(x => { x.tabIndex = -1; }); item.tabIndex = 0; S.focus = item.dataset.id; item.focus(); }

// Keys: arrows between items (by rows in the grid), Enter opens, F2 renames, Delete to the trash,
// the menu key (or Shift+F10) opens its menu, «/» searches, Escape closes.
function onKey(e) {
  if (document.querySelector('.nb-menu')) return;
  const item = e.target.closest?.('.nb-item');
  if (e.key === 'Escape') { if (e.target.matches('.nb-search input') && S.q) { clearSearch(); render(); } else closePage(); e.preventDefault(); return; }
  if (e.key === '/' && !e.target.matches('input,select,textarea')) { e.preventDefault(); S.el.querySelector('.nb-search input').focus(); return; }
  if (!item) return;
  const all = [...S.el.querySelectorAll('.nb-content .nb-item')], i = all.indexOf(item);
  const move = j => { if (all[j]) { setFocus(all[j]); all[j].scrollIntoView({ block: 'nearest' }); } e.preventDefault(); };
  const rtl = document.documentElement.dir === 'rtl';
  if (e.key === 'ArrowRight') return move(i + (rtl ? -1 : 1));
  if (e.key === 'ArrowLeft') return move(i + (rtl ? 1 : -1));
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const r = item.getBoundingClientRect(), down = e.key === 'ArrowDown';
    const rows = all.filter(x => { const q = x.getBoundingClientRect(); return down ? q.top > r.top + 4 : q.top < r.top - 4; });
    if (!rows.length) return e.preventDefault();
    const rowTop = down ? Math.min(...rows.map(x => x.getBoundingClientRect().top)) : Math.max(...rows.map(x => x.getBoundingClientRect().top));
    const row = rows.filter(x => Math.abs(x.getBoundingClientRect().top - rowTop) < 4);
    const best = row.reduce((a, b) => (Math.abs(b.getBoundingClientRect().left - r.left) < Math.abs(a.getBoundingClientRect().left - r.left) ? b : a));
    return move(all.indexOf(best));
  }
  if (e.key === 'Home') return move(0);
  if (e.key === 'End') return move(all.length - 1);
  if (e.key === 'Enter') { e.preventDefault(); return activate(item); }
  if (e.key === 'F2') { e.preventDefault(); return rename(item); }
  if (e.key === 'Delete' || (e.key === 'Backspace' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); return remove(item); }
  if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); return itemMenu(item, item.querySelector('.nb-more')); }
}

// ---- What can be done --------------------------------------------------------------------------
const docById = id => { const { mine, shared } = docs(); return mine.find(d => d.id === id) || shared.find(d => d.id === id); };
const run = async (fn, again = true) => { try { await fn(); } catch (e) { alertDialog(folderError(e) || errorText(e)); } if (again && S) await reload(); };
const folderError = e => (e.data?.error === 'too deep' ? t('Las carpetas pueden tener como mucho {n} niveles.').replace('{n}', e.data.depth)
  : e.data?.error === 'folder limit' ? t('Has llegado al máximo de {n} carpetas.').replace('{n}', e.data.limit) : e.data?.error === 'bad name' ? t('Escribe un nombre (como mucho 80 caracteres).') : '');

function activate(item) {
  if (item.dataset.kind === 'folder') return goFolder(item.dataset.id);
  const d = docById(item.dataset.id); if (!d) return;
  if (d.trashed) return itemMenu(item, item.querySelector('.nb-more'));
  openOne(d.id);
}
async function openOne(id, then) {
  try {
    if (cd.cloudDoc()?.id !== id) { await cd.flushCloud(); await cd.openDoc(id); history.replaceState(null, '', '?doc=' + id); }
    closePage(); then?.();
  } catch (e) { alertDialog(errorText(e)); }
}
const openInTab = id => window.open(`${location.pathname}?doc=${encodeURIComponent(id)}`, '_blank', 'noopener');

async function rename(item) {
  if (item.dataset.kind === 'folder') {
    const f = folderOf(item.dataset.id), name = await promptDialog(t('Nombre de la carpeta:'), f.name);
    if (name && name.trim() !== f.name) await run(() => cd.editFolder(f.id, { name: name.trim() }));
    return;
  }
  const d = docById(item.dataset.id);
  if (!d || d.trashed || (d.kind === 'shared' && d.role !== 'edit')) return;
  const name = await promptDialog(t('Nuevo nombre:'), d.name);
  if (name && name.trim() && name.trim() !== d.name) await run(() => cd.setDocMeta(d.id, { name: name.trim() }));
}
async function remove(item) {
  if (item.dataset.kind === 'folder') {
    const f = folderOf(item.dataset.id), up = f.parent ? folderOf(f.parent)?.name : t('Mi nube');
    const full = folders().some(x => x.parent === f.id) || docs().mine.some(d => d.folder === f.id);
    if (await confirmDialog(full ? t('¿Eliminar la carpeta «{name}»? Lo que contiene pasará a «{up}»; no se borra ninguna presentación.').replace('{name}', f.name).replace('{up}', up)
      : t('¿Eliminar la carpeta vacía «{name}»?').replace('{name}', f.name))) await run(() => cd.deleteFolder(f.id));
    return;
  }
  const d = docById(item.dataset.id); if (!d || d.kind !== 'mine') return;
  if (d.trashed) {
    if (await confirmDialog(t('¿Eliminar «{name}» para siempre? No se puede deshacer.').replace('{name}', d.name))) await run(async () => { await cd.deleteDoc(d.id); if (cd.cloudDoc()?.id === d.id) cd.closeDoc(); });
    return;
  }
  if (!(await confirmDialog(t('¿Mover «{name}» a la papelera? Podrás restaurarla durante {n} días; después se borrará para siempre. Mientras tanto, quien la tenga compartida no podrá abrirla.').replace('{name}', d.name).replace('{n}', S.data.trashDays || 30)))) return;
  await run(async () => { await cd.trashDoc(d.id); if (cd.cloudDoc()?.id === d.id) cd.closeDoc(); });
}
// Where something may go: never into itself or its own folders, nor deeper than the server allows.
function okTarget(what, to) {
  if (what.kind === 'folder') {
    if (to === what.id) return false;
    for (let f = folderOf(to); f; f = folderOf(f.parent)) if (f.id === what.id) return false;
    const height = id => 1 + Math.max(0, ...folders().filter(f => f.parent === id).map(f => height(f.id)));
    if (pathOf(to).length + height(what.id) > 3) return false;
    return (folderOf(what.id)?.parent || null) !== to;
  }
  return what.kind === 'mine' && (docById(what.id)?.folder || null) !== to;
}
function moveTo(what, to) {
  if (!okTarget(what, to)) return;
  S.focus = what.id;
  return run(() => (what.kind === 'folder' ? cd.editFolder(what.id, { parent: to }) : cd.setDocMeta(what.id, { folder: to })));
}
// «Mover a…»: my folders as a tree.
function moveDialog(what) {
  const back = document.createElement('div'); back.className = 'modal-backdrop'; back.id = 'cloud-move-modal';
  const row = (f, depth) => `<button type="button" class="nb-dest" data-to="${esc(f?.id || '')}" style="--d:${depth}"${okTarget(what, f?.id || null) ? '' : ' disabled'}><i class="ms">${f ? 'folder' : 'cloud'}</i>${esc(f ? f.name : t('Mi nube'))}</button>`;
  const tree = (parent, depth) => folders().filter(f => (f.parent || null) === parent).sort((a, b) => a.name.localeCompare(b.name, currentLang())).map(f => row(f, depth) + tree(f.id, depth + 1)).join('');
  back.innerHTML = `<div class="modal cloud nb-move" role="dialog" aria-modal="true" aria-label="${t('Mover a…')}"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3>${t('Mover a…')}</h3>
    <div class="nb-dests">${row(null, 0)}${tree(null, 1)}</div>
    <div class="fr-actions"><button type="button" class="mini2 nb-mkdir"><i class="ms">create_new_folder</i> ${t('Nueva carpeta')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('click', async e => {
    if (e.target === back || e.target.closest('.modal-close')) return close();
    if (e.target.closest('.nb-mkdir')) {
      const name = await promptDialog(t('Nombre de la carpeta:'), t('Carpeta nueva')); if (!name?.trim()) return;
      try { const r = await cd.createFolder(name.trim(), null); S.data.folders = r.folders; close(); moveDialog(what); } catch (err) { alertDialog(folderError(err) || errorText(err)); }
      return;
    }
    const b = e.target.closest('.nb-dest:not([disabled])'); if (!b) return;
    close(); moveTo(what, b.dataset.to || null);
  });
  back.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    const bs = [...back.querySelectorAll('.nb-dest:not([disabled])')], i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]?.focus(); }
  });
  back.querySelector('.nb-dest:not([disabled])')?.focus();
}

async function download2(d, kind) {
  try {
    const deck = cd.cloudDoc()?.id === d.id ? state.deck : await cd.fetchDeck(d.id);
    if (kind === 'pptx') { const { buildPptxBlob } = await import('../../io/formats/pptx-export.js'); download(await buildPptxBlob(deck), slug(deck.name) + '.pptx'); }
    else download(new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' }), slug(deck.name) + '.revela.json');
  } catch (e) { alertDialog(errorText(e)); }
}
async function newFolder() {
  const name = await promptDialog(t('Nombre de la carpeta:'), t('Carpeta nueva')); if (!name?.trim()) return;
  const parent = S.section === 'mine' && !S.q ? S.folder : null;
  await run(async () => { const r = await cd.createFolder(name.trim(), parent); S.focus = r.folder.id; });
}
// The presentation in the editor, into the cloud (into this folder).
async function saveHere() {
  const folder = S.section === 'mine' && !S.q ? S.folder : null;
  try { await cd.saveToCloud({ folder }); nowInCloud(); closePage(); openCloudShare(); } catch (e) { alertDialog(errorText(e)); }
}
// A blank one in the cloud (in this folder), open in the editor.
async function newDeck() {
  const folder = S.section === 'mine' && !S.q ? S.folder : null;
  if (!cd.cloudDoc() && !isBlankDeck(state.deck) && !(await confirmDialog(t('¿Nueva presentación? Se perderá la actual si no la has guardado.'), { ok: t('Descartar la actual'), danger: true }))) return;
  try {
    await cd.flushCloud(); cd.closeDoc();
    const deck = emptyDeck(); deck.name = UNTITLED;
    replaceDeck(deck); const r = await cd.saveToCloud({ folder });
    history.replaceState(null, '', '?doc=' + r.id); closePage();
  } catch (e) { alertDialog(errorText(e)); }
}
function emptyTrash() {
  return confirmDialog(t('¿Vaciar la papelera? Lo que hay en ella se borrará para siempre.')).then(ok => ok && run(async () => {
    const id = cd.cloudDoc()?.id; await cd.emptyTrash(); if (id && docs().mine.some(d => d.id === id && d.trashed)) cd.closeDoc();
  }));
}

// The menu of one item (by its button, by the menu key, or where it was right-clicked).
function itemMenu(item, anchor, x, y) {
  const id = item.dataset.id, a = [];
  if (item.dataset.kind === 'folder') {
    a.push(['folder_open', 'Abrir', () => goFolder(id)], ['edit', 'Cambiar nombre', () => rename(item), false, 'F2'],
      ['drive_file_move', 'Mover a…', () => moveDialog({ kind: 'folder', id })], ['delete', 'Eliminar', () => remove(item), false, 'Supr']);
  } else {
    const d = docById(id); if (!d) return;
    if (d.trashed) a.push(['restore_from_trash', 'Restaurar', () => run(() => cd.restoreDoc(id))], ['delete_forever', 'Eliminar para siempre', () => remove(item)]);
    else {
      const mine = d.kind === 'mine', canEdit = mine || d.role === 'edit';
      a.push(['open_in_browser', 'Abrir', () => openOne(id)], ['open_in_new', 'Abrir en pestaña nueva', () => openInTab(id)], null,
        ['edit', 'Cambiar nombre', () => rename(item), !canEdit, 'F2'],
        [d.starred ? 'star' : 'star_outline', d.starred ? 'Quitar de destacadas' : 'Destacar', () => run(() => cd.setDocMeta(id, { starred: !d.starred }))],
        ['content_copy', 'Hacer una copia', () => run(async () => { const r = await cd.duplicateDoc(id, t('Copia de {name}').replace('{name}', d.name)); S.focus = r.id; }), !canEdit]);
      if (mine) a.push(['drive_file_move', 'Mover a…', () => moveDialog({ kind: 'mine', id })], ['person_add', 'Compartir…', () => openOne(id, () => openCloudShare())]);
      a.push(null, ['download', 'Descargar (.revela)', () => download2(d, 'revela')], ['slideshow', 'Descargar como PowerPoint (.pptx)', () => download2(d, 'pptx')]);
      if (mine) a.push(null, ['delete', 'Mover a la papelera', () => remove(item), false, 'Supr']);
    }
  }
  menuOpen(anchor || item, a, x, y, item);
}
let menuEl = null;
function menuClose(focus) { if (!menuEl) return; menuEl.remove(); menuEl = null; try { focus?.focus(); } catch {} }
function menuOpen(anchor, entries, x, y, back = anchor) {
  menuClose();
  const m = document.createElement('div'); m.className = 'nb-menu'; m.setAttribute('role', 'menu'); menuEl = m;
  const list = entries.filter(e => e !== undefined);
  m.innerHTML = list.map((e, i) => (!e ? '<hr>' : `<button type="button" role="menuitem" data-i="${i}"${e[3] ? ' disabled' : ''}><i class="ms">${e[0]}</i><span>${t(e[1])}</span>${e[4] ? `<kbd>${t(e[4])}</kbd>` : ''}</button>`)).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  const left = x ?? (document.documentElement.dir === 'rtl' ? r.left : r.right - w), top = y ?? r.bottom + 4;
  m.style.left = Math.max(8, Math.min(innerWidth - w - 8, left)) + 'px';
  m.style.top = (top + h > innerHeight - 8 ? Math.max(8, (y ?? r.top) - h - 4) : top) + 'px';
  const items = [...m.querySelectorAll('button:not([disabled])')];
  items[0]?.focus();
  m.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; const fn = list[+b.dataset.i][2]; menuClose(); fn(); });
  m.addEventListener('keydown', e => {
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1]?.focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); menuClose(back); }
  });
  setTimeout(() => document.addEventListener('pointerdown', function off(e) { if (!menuEl || m.contains(e.target)) return; document.removeEventListener('pointerdown', off); menuClose(); }), 0);
}
