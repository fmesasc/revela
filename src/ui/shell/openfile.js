// Opening and inserting files — from the buttons or dragged from the computer
// onto the slide, as in PowerPoint, Canva or Google Slides: pictures, GIFs,
// videos, sounds and 3D models (glTF, GLB, STL) are inserted where they are
// dropped; a presentation (.json, .pptx, .odp) is opened; Markdown adds slides.

import { fitImported } from '../canvas/fittext.js';
import { reportError } from './errors.js';
import { whileOpening } from './opening.js';
import { fileBlock, pdfToSlides, pdfSlides, FILE_LIMIT } from '../../features/content/files.js';
import { choosePdfMode } from '../dialogs/pdfmode.js';
import { smallPicture } from '../dialogs/diagram.js';
import { diagramLayout } from '../../render/diagrams.js';
import { state, replaceDeck, currentSlide, amend } from '../../core/store.js';
import { isBlankDeck, emptyDeck } from '../../core/model.js';
import * as blocks from '../../features/document/blocks.js';
import * as slides from '../../features/document/slides.js';
import * as protect from '../../features/collab/protect.js';
import { stlToGLB } from '../../features/content/stl.js';
import { importPPTX } from '../../io/formats/pptx-import.js';
import { importODP } from '../../io/formats/odp.js';
import { markdownToSlides } from '../../io/formats/markdown.js';
import { buildThmx } from '../../io/formats/ooxml-theme.js';
import { download, slug } from '../../io/files.js';
import { applyThemeFrom } from '../../features/design/officetheme.js';
import { sanitizeDeck } from '../../features/document/sanitize.js';
import { factor } from '../canvas/interact.js';
import { confirmDialog, promptDialog, alertDialog } from '../dialogs/dialog.js';
import { t } from '../../i18n/index.js';

// A file chosen with the system dialog: its data URL, text or the File itself.
export const readFile = (accept, cb, as = 'DataURL') => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => { const f = inp.files[0]; if (!f) return;
    if (as === 'file') { cb(f); return; }
    const r = new FileReader(); r.onload = () => cb(r.result);
    if (as === 'text') r.readAsText(f); else r.readAsDataURL(f); };
  inp.click();
};
const dataURL = f => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); });
// Replacing the open presentation asks first, unless there is nothing to lose.
const mayReplace = () => (isBlankDeck(state.deck) ? Promise.resolve(true) : confirmDialog(t('¿Abrir otra presentación? Se perderá la actual si no la has guardado.'), { ok: t('Descartar la actual'), danger: true }));

// A Revela project (.json), possibly protected with a password.
export async function openProject(txt) {
  let obj; try { obj = JSON.parse(txt); } catch { alertDialog(t('Proyecto no válido.')); return false; }
  if (protect.isEncrypted(obj)) {
    const pw = await promptDialog(t('Este proyecto está protegido. Contraseña:'), ''); if (!pw) return false;
    try { obj = await protect.decryptDeck(obj, pw); } catch { alertDialog(t('Contraseña incorrecta.')); return false; }
  }
  if (!obj || !Array.isArray(obj.slides)) { alertDialog(t('Proyecto no válido.')); return false; }
  replaceDeck(obj); return true;
}
// Keynote's own format (.key) is Apple's, undocumented (compressed protobuf):
// it can't be read here. Keynote itself exports it to PowerPoint.
const isKeynote = f => /\.key$/i.test(f.name);
function keynoteHelp() {
  alertDialog(t('Los archivos de Keynote (.key) usan un formato propio de Apple que no se puede leer aquí. En Keynote: Archivo ▸ Exportar a ▸ PowerPoint, y abre aquí el .pptx (conserva textos, imágenes, formas y diapositivas).'));
}
// A PowerPoint or LibreOffice presentation, or a template (.potx, .otp).
const isODF = f => /\.(odp|otp)$/i.test(f.name);
const isThemeFile = f => /\.thmx$/i.test(f.name);
export async function openPresentation(file) {
  if (isKeynote(file)) { keynoteHelp(); return false; }
  if (isThemeFile(file)) return useThemeOf(file);           // (a theme alone: applied to the open presentation)
  // (Its «Shrink text on overflow» boxes measured as Revela draws them: ui/canvas/fittext.js.)
  try { replaceDeck(await whileOpening(async () => fitImported(await (isODF(file) ? importODP(file) : importPPTX(file))), file.name)); return true; }
  catch (e) { reportError(e, 'handled'); alertDialog(t('No se pudo importar la presentación: ') + e.message); return false; }
}
// Design ▸ Themes: the theme of another presentation or template (.pptx,
// .potx, .odp — Google Slides' come as .pptx) or an Office theme (.thmx) on
// the open one: colours, fonts, master styles, layouts and backgrounds.
export async function useThemeOf(file) {
  try {
    const src = sanitizeDeck(isODF(file) ? await importODP(file) : await importPPTX(file));
    if (!applyThemeFrom(src)) { alertDialog(t('Ese archivo no tiene un tema que se pueda usar.')); return false; }
    return true;
  } catch (e) { reportError(e, 'handled'); alertDialog(t('No se pudo leer el tema: ') + (e.message || e)); return false; }
}
// A template to start from (ui/dialogs/masterai.js): the file read as a presentation, nothing applied. Throws.
export async function readTemplate(file) {
  if (isKeynote(file)) { keynoteHelp(); throw new Error('STOPPED'); }
  return sanitizeDeck(isODF(file) ? await importODP(file) : await importPPTX(file));
}
// The presentation's theme as an Office theme file, for PowerPoint or another presentation.
export async function saveTheme() {
  try { download(await buildThmx(state.deck), slug(state.deck.officeTheme?.name || state.deck.name || 'tema') + '.thmx'); return true; }
  catch (e) { alertDialog(t('No se pudo guardar el tema: ') + (e.message || e)); return false; }
}
// Markdown: its slides after the current one.
export function insertMarkdown(md) {
  const list = markdownToSlides(md, state.deck.size);
  if (!list.length) { alertDialog(t('El archivo no contiene diapositivas.')); return false; }
  const bg = currentSlide()?.background || '#101317';
  list.forEach(s => { s.background = bg; });
  slides.importSlides({ size: state.deck.size, slides: list });
  return true;
}

// What a file is, by its type or name.
function kindOf(f) {
  const n = f.name.toLowerCase(), ty = f.type;
  if (/\.(pptx|pptm|potx|odp|otp|key|thmx)$/.test(n)) return 'presentation';
  if (/\.json$/.test(n)) return 'project';
  if (/\.(md|markdown)$/.test(n)) return 'markdown';
  if (/\.(glb|gltf)$/.test(n)) return 'model';
  if (/\.stl$/.test(n)) return 'stl';
  if (ty.startsWith('image/')) return 'image';
  if (ty.startsWith('video/')) return 'video';
  if (ty.startsWith('audio/')) return 'audio';
  if (ty === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
  return 'file';                                           // anything else: attached, as an icon to download
}
// A PDF or another file, inside the presentation (not too big: it travels in it).
async function attachFile(f) {
  if (f.size > FILE_LIMIT) { alertDialog(t('El archivo es demasiado grande para llevarlo dentro de la presentación (máximo 25 MB). Súbelo a la nube e inserta un vínculo.')); return false; }
  const src = await dataURL(f);
  if (kindOf(f) !== 'pdf') { blocks.addFileBlock(await fileBlock(f, src, 'icon')); return true; }
  const mode = await choosePdfMode(f.name); if (!mode) return false;
  if (mode === 'slides') return (await pdfToSlides(src)) > 0;
  blocks.addFileBlock(await fileBlock(f, src, mode)); return true;
}
const selectedIsFile = () => currentSlide().blocks.find(x => x.id === state.ui.selection)?.type === 'file';
// Insert pictures, videos, sounds and 3D models; at (x, y) on the slide if given
// (each next one a little lower and to the right). Returns how many went in.
// A picture dropped on a diagram's box: that line's picture (render/diagrams.js). → whether it was.
async function onDiagram(f, at) {
  if (!at) return false;
  const b = [...currentSlide().blocks].reverse().find(x => x.type === 'diagram' && !x.locked && at[0] >= x.x && at[0] <= x.x + x.w && at[1] >= x.y && at[1] <= x.y + x.h); if (!b) return false;
  const [px, py] = [at[0] - b.x, at[1] - b.y], parts = diagramLayout(b, blocks.diagramOpts()), inside = p => px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h;
  const hit = parts.find(p => (p.type === 'text' && !p.empty && inside(p)) || (p.type === 'image' && inside(p))) || (s => s && parts.find(p => p.type === 'text' && !p.empty && p.i === s.i))(parts.find(p => (p.type === 'rect' || p.type === 'ellipse') && inside(p)));
  const text = hit?.type === 'image' ? hit.alt : hit?.text; if (!text) return false;
  const src = await smallPicture(await dataURL(f)), list = (b.pictures || []).filter(p => String(p.text).trim() !== text.trim());
  blocks.setDiagram(b.id, { pictures: [...list, { text, src }] }); return true;
}
export async function insertFiles(files, at = null) {
  let n = 0;
  for (const f of files) {
    const k = kindOf(f);
    try {
      if (k === 'image' && files.length === 1 && await onDiagram(f, at)) { n++; continue; }
      if (k === 'image') blocks.addImage(await dataURL(f));
      else if (k === 'video') blocks.addVideo(await dataURL(f));
      else if (k === 'audio') blocks.addAudio(await dataURL(f));
      else if (k === 'model') blocks.addModel((await dataURL(f)).replace(/^data:[^;,]*/, /\.gltf$/i.test(f.name) ? 'data:model/gltf+json' : 'data:model/gltf-binary'));
      else if (k === 'stl') blocks.addModel(stlToGLB(await f.arrayBuffer()));
      else if (k === 'pdf' || k === 'file') { if (!(await attachFile(f))) continue; if (k === 'pdf' && !selectedIsFile()) { n++; continue; } }
      else continue;
    } catch (e) { alertDialog(t('No se pudo añadir: ') + (e.message || e)); continue; }
    if (at) amend(() => {                                  // (same undo step as adding it)
      const b = currentSlide().blocks.find(x => x.id === state.ui.selection); if (!b) return;
      const { w, h } = state.deck.size, dx = n * 30;
      b.x = Math.round(Math.min(Math.max(at[0] + dx - b.w / 2, -b.w / 2), w - b.w / 2));
      b.y = Math.round(Math.min(Math.max(at[1] + dx - b.h / 2, -b.h / 2), h - b.h / 2));
    });
    n++;
  }
  return n;
}
// Any dropped file: a presentation opens (one at a time), the rest are inserted.
export async function dropFiles(files, at = null) {
  const list = [...files], doc = list.find(f => ['presentation', 'project'].includes(kindOf(f)));
  if (doc) {
    if (isKeynote(doc)) { keynoteHelp(); return 0; }
    if (isThemeFile(doc)) return (await useThemeOf(doc)) ? 1 : 0;   // (a theme changes the open one: nothing to lose)
    if (!(await mayReplace())) return 0;
    return (kindOf(doc) === 'project' ? await openProject(await whileOpening(doc.text(), doc.name)) : await openPresentation(doc)) ? 1 : 0;
  }
  let n = 0;
  for (const f of list.filter(x => kindOf(x) === 'markdown')) if (insertMarkdown(await f.text())) n++;
  n += await insertFiles(list, at);
  return n;
}

// A PDF opened as a presentation: a new one with a slide per page (a picture of it, as when a PDF is inserted
// as «Diapositivas»), named after the file. (Dropped or inserted, a PDF goes into the open one instead.)
export async function openPdfDeck(file) {
  if (!(await mayReplace())) return false;
  return whileOpening(async () => {
    const d = { ...emptyDeck(), name: file.name.replace(/\.pdf$/i, '') }, made = await pdfSlides(await dataURL(file), d.size);
    if (!made.length) return false;
    replaceDeck({ ...d, slides: made }); return true;           // (one step, as a PowerPoint opened: undo goes back)
  }, file.name).catch(e => { reportError(e, 'handled'); alertDialog(t('No se pudo abrir el PDF: ') + e.message); return false; });
}

// File ▸ Open, for anything that is a presentation: Revela's own, PowerPoint, LibreOffice, a PDF (asks before
// replacing the open one, as dropping it does).
export const OPEN_ACCEPT = '.pptx,.pptm,.potx,.odp,.otp,.key,.json,.pdf,application/json,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation';
export function openAnyPresentation() { readFile(OPEN_ACCEPT, f => (kindOf(f) === 'pdf' ? openPdfDeck(f) : dropFiles([f])), 'file'); }

// Files dragged from the computer onto the editor.
export function initFileDrop() {
  const area = document.getElementById('canvas-wrap'), stage = document.getElementById('stage');
  if (!area) return;
  const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
  const inDialog = e => !!e.target.closest?.('.modal-backdrop');
  // The whole window takes files, not only the slide's area: dropped on the
  // ribbon or the thumbnails the browser would leave the editor to show the file.
  // (Dialogs with a drop zone of their own handle it first; other dialogs refuse it.)
  let off = 0;
  const show = on => { area.classList.toggle('file-drop', on); document.body.classList.toggle('file-drag', on);
    if (on) document.body.dataset.dropHint = t('Suelta el archivo para añadirlo a la diapositiva (o abrirlo, si es una presentación)'); };
  document.addEventListener('dragover', e => {
    if (!hasFiles(e) || e.defaultPrevented) return;
    e.preventDefault(); const no = inDialog(e); e.dataTransfer.dropEffect = no ? 'none' : 'copy';
    show(!no); clearTimeout(off); off = setTimeout(() => show(false), 200);
  });
  document.addEventListener('drop', e => {
    if (!hasFiles(e) || e.defaultPrevented) return;
    e.preventDefault(); clearTimeout(off); show(false);
    if (inDialog(e)) return;
    // Where on the slide (if dropped on it).
    const r = stage.getBoundingClientRect(), k = factor(), inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    dropFiles(e.dataTransfer.files, inside ? [(e.clientX - r.left) * k, (e.clientY - r.top) * k] : null);
  });
}
