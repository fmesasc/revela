// File (Office's "Backstage"): instead of a ribbon of thirty-odd buttons, a page of its own with a few
// sections — New, Open, Save, Share, Export, Print, Protect — and in each one big cards that say what they
// do. The actions are the ribbon's (ui/ribbon/actions.js); a card shows only when its action exists in this
// edition (its button in the ribbon's File page isn't hidden: no cloud, no accounts…).

import { ACTIONS, TAKES_OUT } from '../ribbon/actions.js';
import { state } from '../../core/store.js';
import { galleryInto } from '../dialogs/gallery.js';
import { t } from '../../i18n/index.js';

const C = (action, icon, title, text) => ({ action, icon, title, text });
const SECTIONS = [
  { id: 'new', icon: 'note_add', title: 'Nuevo', cards: [
    C('new', 'note_add', 'En blanco', 'Una presentación vacía.'),
    C('ai-deck', 'auto_awesome', 'Crear con IA', 'A partir de un tema, documentos o fotos.'),
    C('open', 'upload_file', 'Abrir un archivo', 'PowerPoint, LibreOffice o Revela.')], gallery: true },
  { id: 'open', icon: 'folder_open', title: 'Abrir', cards: [
    C('open', 'upload_file', 'Desde el ordenador', 'PowerPoint, LibreOffice o Revela.'),
    C('home', 'history', 'Mis presentaciones', 'Las recientes, las de Drive y las de tu nube.'),
    C('gdrive-open', 'add_to_drive', 'Google Drive', 'Abrir una presentación guardada en Drive.'),
    C('cloud-docs', 'cloud', 'Mi nube de Revela', 'Las presentaciones de tu cuenta de Revela.'),
    C('gslides-import', 'slideshow', 'Desde Google Slides', 'Traer una presentación de Google.'),
    C('cloud-onedrive', 'cloud_circle', 'OneDrive', 'De cualquier carpeta: presentaciones de Revela, PowerPoint o LibreOffice.'),
    C('cloud-dropbox', 'inventory_2', 'Dropbox', 'Abrir desde Dropbox.'),
    C('community-browse', 'diversity_3', 'Comunidad', 'Presentaciones que publican otros docentes.'),
    C('reuse-slides', 'library_add', 'Reutilizar diapositivas', 'Añadir diapositivas de otra presentación a esta.'),
    C('import-md', 'article', 'Importar Markdown', 'Un texto con títulos y listas, en diapositivas.')] },
  { id: 'save', icon: 'save', title: 'Guardar', cards: [
    C('save', 'save', 'Guardar', 'Donde vive: Drive, tu nube o, si solo está en este navegador, donde elijas.'),
    C('gdrive-save-as', 'drive_file_move', 'Guardar en Drive como…', 'Una copia nueva: carpeta, nombre y formato.'),
    C('onedrive-save', 'cloud_upload', 'Guardar en OneDrive', 'La presentación (se guarda sola mientras trabajas), o una copia en PDF o PowerPoint.'),
    C('download-project', 'download', 'Descargar una copia', 'Un archivo (.revela.json) que guardas tú.'),
    C('versions', 'history', 'Versiones', 'Las copias anteriores, para volver a una.'),
    C('gdrive-html', 'cloud_sync', 'Página web en Drive', 'La presentación como página, publicada en tu Drive.')] },
  { id: 'share', icon: 'share', title: 'Compartir', cards: [
    C('cloud-share', 'person_add', 'Con personas', 'Cada una con su permiso: ver, comentar o editar.'),
    C('share', 'link', 'Un enlace o un archivo', 'Para quien lo tenga, con contraseña si quieres; también para insertar en una web.'),
    C('collab', 'group', 'Colaborar en directo', 'Varias personas editando a la vez.'),
    C('cloud-call', 'videocam', 'Llamada', 'Presentar y hablar en una videollamada de Revela.'),
    C('community-publish', 'diversity_3', 'Publicar en la comunidad', 'Para que otros docentes la encuentren y la reutilicen.')] },
  { id: 'export', icon: 'ios_share', title: 'Exportar', cards: [
    C('export-pdf', 'picture_as_pdf', 'PDF', 'Una página por diapositiva, tal como se ven.'),
    C('export-pptx', 'co_present', 'PowerPoint (.pptx)', 'Para abrirla y editarla en PowerPoint o Keynote.'),
    C('export-odp', 'description', 'LibreOffice (.odp)', 'Para LibreOffice Impress.'),
    C('export', 'html', 'Página web (.html)', 'Se abre en cualquier navegador, también sin conexión.'),
    C('export-scorm', 'school', 'SCORM (Moodle, Canvas…)', 'Cada alumno la recorre a su ritmo y la plataforma recibe su nota.'),
    C('export-png', 'image', 'Imágenes', 'Cada diapositiva como PNG o JPG.'),
    C('export-video', 'movie', 'Vídeo', 'MP4 o GIF animado, pasando sola.'),
    C('save-picture', 'photo_size_select_large', 'Selección como imagen', 'Los objetos seleccionados, como imagen.')] },
  { id: 'print', icon: 'print', title: 'Imprimir', cards: [
    C('print', 'print', 'Imprimir', 'Las diapositivas, o guardarlas como PDF desde el navegador con el texto seleccionable.'),
    C('export-handout', 'view_module', 'Documentos y notas', 'Varias diapositivas por página, o páginas con notas.')] },
  { id: 'protect', icon: 'lock', title: 'Proteger', cards: [
    C('save-protected', 'password', 'Con contraseña', 'Una copia cifrada que solo se abre con la contraseña.'),
    C('mark-final', 'verified', 'Marcar como final', 'Para que nadie la cambie sin querer.'),
    C('signatures', 'draw', 'Firmas', 'Firmarla, o comprobar quién la firmó.'),
    C('gdrive-config', 'settings', 'Google Cloud propio (avanzado)', 'Usar tu propio proyecto de Google para Drive. No hace falta para usar Drive.')] },
];

// Whether this edition has the action (its ribbon button exists and isn't hidden); not what takes it out, when
// it's shared without copies.
const available = a => { if (!ACTIONS[a] || (state.ui.noCopy && TAKES_OUT.includes(a))) return false; const b = document.querySelector(`#ribbon [data-action="${a}"]`); return !b || (!b.hidden && !b.closest('[hidden]:not(.ribbon-page)')); };

export function openBackstage(sectionId = 'new') {
  document.getElementById('backstage')?.remove();
  const opener = document.activeElement;
  const el = document.createElement('div'); el.id = 'backstage'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t('Archivo'));
  const sections = SECTIONS.map(s => ({ ...s, cards: s.cards.filter(c => available(c.action)) })).filter(s => s.cards.length);
  el.innerHTML = `<nav class="bs-nav"><button type="button" class="bs-back" title="${t('Volver a la presentación (Esc)')}"><i class="ms">arrow_back</i><span>${t('Volver')}</span></button>
      ${sections.map(s => `<button type="button" class="bs-tab" data-sec="${s.id}"><i class="ms">${s.icon}</i><span>${t(s.title)}</span></button>`).join('')}</nav>
    <div class="bs-main" role="main"></div>`;
  document.body.appendChild(el);
  // (Another tab of the ribbon chosen: that tab instead — the page doesn't stay open over it.)
  const tabs = document.querySelector('#ribbon .tabs'), onTab = e => { const tb = e.target.closest('[data-tab]'); if (tb && tb.dataset.tab !== 'file') close(); };
  tabs?.addEventListener('click', onTab, true);
  const close = () => { el.remove(); document.removeEventListener('keydown', onKey, true); tabs?.removeEventListener('click', onTab, true); (opener?.isConnected ? opener : document.querySelector('[data-tab="home"]'))?.focus?.(); };
  // (Removed some other way — another page replacing it —: its key goes with it, nothing is swallowed after.)
  const onKey = e => {
    if (!el.isConnected) { document.removeEventListener('keydown', onKey, true); return; }
    if (e.key === 'Escape' && !document.querySelector('.modal-backdrop')) { e.preventDefault(); e.stopPropagation(); close(); }
  };
  document.addEventListener('keydown', onKey, true);
  const show = id => {
    const s = sections.find(x => x.id === id) || sections[0];
    el.querySelectorAll('.bs-tab').forEach(b => { const on = b.dataset.sec === s.id; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
    el.querySelector('.bs-main').innerHTML = `<h2>${t(s.title)}</h2><div class="bs-cards">${s.cards.map(c => `<button type="button" class="bs-card" data-bs-action="${c.action}">
      <i class="ms">${c.icon}</i><b>${t(c.title)}</b><small>${t(c.text)}</small></button>`).join('')}</div>`;
    // (New: the templates and example presentations right there, under the ways to start — not an empty page.)
    if (s.gallery) {
      const g = document.createElement('section'); g.className = 'bs-gallery';
      g.innerHTML = `<h3>${t('Plantillas y presentaciones de ejemplo')}</h3><div class="bs-gal"></div>`;
      el.querySelector('.bs-main').appendChild(g);
      galleryInto(g.querySelector('.bs-gal'), { close, scroller: el.querySelector('.bs-main'), paths: false });
    }
  };
  el.querySelector('.bs-back').addEventListener('click', close);
  el.querySelector('.bs-nav').addEventListener('click', e => { const b = e.target.closest('.bs-tab'); if (b) show(b.dataset.sec); });
  // (The action, as from the ribbon; the page goes first, so what it opens — a dialog, a picker — is seen.)
  el.querySelector('.bs-main').addEventListener('click', e => { const c = e.target.closest('[data-bs-action]'); if (!c) return; close(); ACTIONS[c.dataset.bsAction]?.(); });
  show(sectionId);
  el.querySelector('.bs-tab.on')?.focus();
  return el;
}
