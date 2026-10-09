// The desktop application (Tauri: desktop/src-tauri): what the window adds to the same web app.
//
// - The menu bar, native (Archivo, Editar, Ver, Insertar, Ayuda; on macOS also the app's own menu), in the
//   interface's language and built again when it changes. Its items run the ribbon's actions; none has its
//   own key shortcut: the editor already handles the keys (main.js keyboard()), and a menu's shortcut would
//   catch them first — Ctrl+Z while typing would undo the slide instead of the typing. (macOS keeps the system's
//   Edit items, which the web view needs for copying and pasting text with ⌘.)
// - «Acerca de Revela»: the system's own about box, with the version.
// - Saving: a download (any of the app's: projects, PowerPoint, PDF, CSV…) goes to the system's «Save as»
//   dialog (main.rs save_file) — a web view doesn't always keep downloads, and never asks where.
// - Opening: a presentation opened with Revela (a double click on a .pptx or .odp, «Open with») opens as if
//   dropped on the editor (openfile.js dropFiles); a PDF, as a new presentation.
// - Choosing files: the system's own «Open» dialog, with each input's types (WebKitGTK's hid .pptx files).
// - Updates: looked for when it opens and from Ayuda ▸ «Buscar actualizaciones», asked in the interface's language.

import { ACTIONS } from '../ribbon/actions.js';
import { dropFiles, openPdfDeck } from './openfile.js';
import { openPalette } from './palette.js';
import { toast } from './toast.js';
import { confirmDialog, alertDialog } from '../dialogs/dialog.js';
import { undo, redo, canUndo, canRedo } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { OFFICIAL_SITE } from '../../core/config.js';

const mac = () => /Mac/i.test(globalThis.navigator?.platform || globalThis.navigator?.userAgent || '');
const SEP = '-';

// The menu bar: [label, [items]] where an item is [label, action] — an action of the ribbon (ACTIONS) or one of
// these (DESK) —, a submenu [label, [items]], or SEP. Labels in Spanish: translated with t() when built.
export const MENU = [
  ['Archivo', [['Nuevo', 'new'], ['Abrir…', 'open'], ['Mis presentaciones en la nube', 'cloud-docs'], SEP,
    ['Guardar', 'save'], ['Descargar el proyecto (.revela.json)', 'download-project'], ['Historial de versiones', 'versions'], SEP,
    ['Importar', [['PowerPoint u OpenDocument…', 'import-pptx'], ['Reutilizar diapositivas…', 'reuse-slides'], ['Markdown…', 'import-md'], ['Importar preguntas', 'import-questions']]],
    ['Exportar', [['PDF', 'export-pdf'], ['PowerPoint', 'export-pptx'], ['ODP', 'export-odp'], ['HTML', 'export'], ['Imágenes', 'export-png'], ['Vídeo', 'export-video'],
      ['SCORM', 'export-scorm'], SEP, ['Exportar preguntas', 'export-questions'], ['Fichas y práctica', 'export-study']]],
    SEP, ['Imprimir', 'print'], ['Compartir', 'share'], SEP, ['Salir', 'desk:quit']]],
  ['Editar', [['Deshacer', 'desk:undo'], ['Rehacer', 'desk:redo'], SEP, ['Duplicar', 'obj-duplicate'], ['Eliminar', 'obj-delete'], SEP,
    ['Buscar y reemplazar', 'find-replace'], ['Buscar comandos…', 'desk:palette']]],
  ['Ver', [['Presentar desde el principio', 'present'], ['Presentar desde la diapositiva actual', 'present-current'], ['Ensayar', 'rehearse'], SEP,
    ['Clasificador de diapositivas', 'slide-sorter'], ['Panel de diapositivas', 'toggle-nav'], ['Notas', 'toggle-notes'], ['Regla', 'toggle-ruler'], ['Guías', 'toggle-guides'], SEP,
    ['Acercar', 'zoom-in'], ['Alejar', 'zoom-out'], ['Ajustar a la ventana', 'zoom-fit'], ['Tamaño real', 'zoom-reset'], SEP, ['Pantalla completa', 'desk:fullscreen']]],
  ['Insertar', [['Nueva diapositiva', 'slide-add'], SEP, ['Cuadro de texto', 'insert-text'], ['Imagen', 'insert-image'], ['Tabla', 'insert-table'], ['Gráfico', 'insert-chart'],
    ['Ecuación', 'insert-math'], ['Código', 'insert-code'], ['Vídeo', 'insert-video'], ['Audio', 'insert-audio'], ['Modelo 3D', 'insert-model'], SEP,
    ['Votación en directo', 'insert-poll'], ['Candado', 'insert-lock'], ['Temporizador', 'insert-timer']]],
  ['Ayuda', [['Guías en vídeo', 'desk:guides'], ['Atajos de teclado', 'shortcuts'], ['Buscar comandos…', 'desk:palette'], ['Informar de un problema', 'report-problem'], SEP,
    ['Buscar actualizaciones', 'desk:update'], ['Acerca de Revela', 'desk:about']]],
];

let api = null;
const undoers = [];                     // (what initDesktop changed in the page, for stopDesktop: the tests)
const invoke = (...a) => api.core.invoke(...a);

// ---- Updates -----------------------------------------------------------------------------------------------
// asked: from the menu (also says when there's none, or when it couldn't look); else quiet.
export async function checkUpdates({ asked = false } = {}) {
  let v = null;
  try { v = await invoke('update_available'); } catch { if (asked) alertDialog(t('No se pudo buscar actualizaciones: comprueba la conexión a internet.')); return; }
  if (!v) { if (asked) alertDialog(t('Ya tienes la última versión de Revela.')); return; }
  if (!(await confirmDialog(t('Hay una versión nueva de Revela ({v}). ¿Actualizar ahora? Se reiniciará en unos segundos.').replace('{v}', v), { ok: t('Actualizar') }))) return;
  toast(t('Descargando la actualización…'), { busy: true, ms: 120000 });
  try {
    if ((await invoke('install_update')) === 'page') toast(t('Instala el paquete nuevo desde la página que se ha abierto. Si instalaste Revela con apt: sudo apt update && sudo apt upgrade.'), { ms: 12000 });
  } catch (e) { toast(t('No se pudo actualizar:') + ' ' + (e?.message || e), { error: true }); }
}

// ---- The menu --------------------------------------------------------------------------------------------
const DESK = {
  'desk:undo': () => { if (canUndo()) undo(); },
  'desk:redo': () => { if (canRedo()) redo(); },
  'desk:palette': () => openPalette(),
  'desk:guides': () => api.opener.openUrl(OFFICIAL_SITE + '/guides'),
  'desk:update': () => checkUpdates({ asked: true }),
  'desk:quit': () => api.window.getCurrentWindow().close(),
  'desk:fullscreen': async () => { const w = api.window.getCurrentWindow(); await w.setFullscreen(!(await w.isFullscreen())); },
};
export const run = id => (DESK[id] || ACTIONS[id])?.();

async function aboutItem() {
  const A = api.app, [version, icon] = await Promise.all([A.getVersion().catch(() => ''), A.defaultWindowIcon?.().catch(() => null)]);
  return api.menu.PredefinedMenuItem.new({ text: t('Acerca de Revela'), item: { About: {
    name: 'Revela', version, ...(icon && { icon }), website: OFFICIAL_SITE, websiteLabel: OFFICIAL_SITE.replace(/^https?:\/\//, ''),
    authors: ['FM Lab'], license: 'MIT', copyright: `© ${new Date().getFullYear()} FM Lab · MIT`,
    comments: t('Editor de presentaciones interactivas'),
  } } });
}

async function build() {
  const { Menu, Submenu, MenuItem, PredefinedMenuItem } = api.menu;
  const sep = () => PredefinedMenuItem.new({ item: 'Separator' }), about = await aboutItem();
  const items = list => Promise.all(list.map(x => x === SEP ? sep()
    : x[1] === 'desk:about' ? about
    : Array.isArray(x[1]) ? items(x[1]).then(sub => Submenu.new({ text: t(x[0]), items: sub }))
    : MenuItem.new({ text: t(x[0]), action: () => run(x[1]) })));
  const subs = [];
  for (const [label, list] of MENU) {
    let parts = list;
    if (mac()) {                                     // (macOS: About and Quit live in the app's menu)
      parts = list.filter(x => x === SEP || !['desk:about', 'desk:quit'].includes(x[1]));
      while (parts.at(-1) === SEP) parts = parts.slice(0, -1);
    }
    const own = await items(parts);
    if (mac() && label === 'Editar') own.push(...await Promise.all([sep(), ...['Cut', 'Copy', 'Paste', 'SelectAll'].map(item => PredefinedMenuItem.new({ item }))]));
    subs.push(await Submenu.new({ text: t(label), items: own }));
  }
  if (mac()) subs.unshift(await Submenu.new({ text: 'Revela', items: [about, await sep(),
    ...await Promise.all(['Services', 'Hide', 'HideOthers', 'ShowAll'].map(item => PredefinedMenuItem.new({ item }))), await sep(), await PredefinedMenuItem.new({ item: 'Quit' })] }));
  await (await Menu.new({ items: subs })).setAsAppMenu();
}

// ---- Saving and opening files ------------------------------------------------------------------------------
// Every download of the app is a link with «download» clicked (io/files.js and others): in the window, its
// bytes go to the system's «Save as» instead.
function saveDownloads() {
  const click = HTMLAnchorElement.prototype.click;
  undoers.push(() => { HTMLAnchorElement.prototype.click = click; });
  HTMLAnchorElement.prototype.click = function () {
    if (!this.hasAttribute('download') || !/^(blob|data):/.test(this.href)) return click.call(this);
    const name = this.getAttribute('download') || 'Revela';
    fetch(this.href).then(r => r.arrayBuffer()).then(b => invoke('save_file', new Uint8Array(b), { headers: { 'x-name': encodeURIComponent(name) } }))
      .then(path => { if (path) toast(t('Guardado en {path}').replace('{path}', path)); })
      .catch(e => toast(t('No se pudo guardar el archivo:') + ' ' + (e?.message || e), { error: true }));
  };
}
// Choosing files: every «choose a file» of the app (an <input type="file">, clicked or through its label) opens the
// system's «Open» dialog (main.rs pick_files) with the input's types; what is chosen goes into the input, which
// then works as on the web. (WebKitGTK's own dialog filters only by MIME type: «.pptx» was left out.)
const KINDS = { 'image/*': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp'], 'video/*': ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
  'audio/*': ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'webm'], 'application/json': ['json'], 'application/pdf': ['pdf'],
  'text/markdown': ['md', 'markdown'], 'text/csv': ['csv'], 'text/plain': ['txt'], 'text/*': ['txt', 'md', 'csv'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'], 'application/vnd.oasis.opendocument.presentation': ['odp'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'], 'model/gltf-binary': ['glb'], 'model/gltf+json': ['gltf'] };
const TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4', ogv: 'video/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg',
  m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', opus: 'audio/ogg', pdf: 'application/pdf', json: 'application/json', md: 'text/markdown', csv: 'text/csv',
  txt: 'text/plain', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', odp: 'application/vnd.oasis.opendocument.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', glb: 'model/gltf-binary', gltf: 'model/gltf+json' };
// accept → the dialog's filters: [[name, [extensions]]], the accepted ones first, then any file.
export function filtersOf(accept) {
  const exts = [];
  for (const a of String(accept || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)) {
    for (const e of a.startsWith('.') ? [a.slice(1)] : KINDS[a] || KINDS[a.replace(/\/.*$/, '/*')] || []) if (!exts.includes(e)) exts.push(e);
  }
  return [...(exts.length ? [[t('Archivos compatibles'), exts]] : []), [t('Todos los archivos'), ['*']]];
}
const fileAt = (path, bytes) => { const name = path.split(/[\\/]/).pop(); return new File([bytes], name, { type: TYPES[name.split('.').pop().toLowerCase()] || '' }); };
async function pickInto(inp) {
  let paths = [];
  try { paths = await invoke('pick_files', { filters: filtersOf(inp.accept), multiple: inp.multiple }); }
  catch (e) { toast(t('No se pudo abrir el archivo:') + ' ' + (e?.message || e), { error: true }); return; }
  if (!paths.length) { inp.dispatchEvent(new Event('cancel')); return; }
  const dt = new DataTransfer();
  for (const path of paths) dt.items.add(fileAt(path, await invoke('read_opened', { path })));
  inp.files = dt.files;
  inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
}
function chooseFiles() {
  const isFile = el => el instanceof HTMLInputElement && el.type === 'file' && !el.disabled;
  // (Inputs made and clicked in code, never in the page — openfile.js readFile —, and showPicker.)
  for (const m of ['click', 'showPicker']) {
    const own = HTMLInputElement.prototype[m]; if (!own) continue;
    undoers.push(() => { HTMLInputElement.prototype[m] = own; });
    HTMLInputElement.prototype[m] = function (...a) { if (!isFile(this) || this.isConnected) return own.apply(this, a); pickInto(this); };
  }
  // (In the page — also through its <label> —: the click reaches the input, and its default, the web view's dialog, is stopped.)
  const onClick = e => { if (isFile(e.target)) { e.preventDefault(); pickInto(e.target); } };
  document.addEventListener('click', onClick, true); undoers.push(() => document.removeEventListener('click', onClick, true));
}

// Files opened with Revela: each one as if dropped on the editor (a presentation opens; it asks first if the open
// one would be lost).
async function openGiven() {
  let paths = [];
  try { paths = await invoke('opened_files'); } catch { return; }
  for (const path of paths) {
    try {
      const f = fileAt(path, await invoke('read_opened', { path }));
      await (/\.pdf$/i.test(f.name) ? openPdfDeck(f) : dropFiles([f]));
    } catch (e) { toast(t('No se pudo abrir el archivo:') + ' ' + (e?.message || e), { error: true }); }
  }
}

// tauri: window.__TAURI__ (withGlobalTauri; tests give their own).
export async function initDesktop({ tauri = globalThis.__TAURI__, updates = true } = {}) {
  if (!tauri?.core) return false;
  api = tauri;
  saveDownloads(); chooseFiles();
  try { await build(); } catch (e) { console.warn('Menú no creado:', e); }
  const rebuild = () => build().catch(() => {});
  window.addEventListener('revela:lang', rebuild); undoers.push(() => window.removeEventListener('revela:lang', rebuild));
  await openGiven();
  tauri.event?.listen?.('revela://opened', () => openGiven());     // (macOS: opened while running)
  if (updates) setTimeout(() => checkUpdates(), 3000);              // (after the editor is ready; quiet without internet)
  return true;
}
export function stopDesktop() { while (undoers.length) undoers.pop()(); api = null; }
export const openGivenForTests = () => openGiven();
