// «Cambiar imagen» from the picture's tab or its menu: a file from the computer, or one from Revela's own
// Recursos panel (photos, illustrations, icons…). The panel only knows how to insert, so while it is chosen
// for a picture the next picture it puts on the slide goes into that one instead (same undo step).
import { state, subscribe, amend, currentSlide } from '../../core/store.js';
import { replaceImage } from '../../features/document/swapimage.js';
import { popupMenu } from './menu.js';
import { readFile } from './openfile.js';
import { toast } from './toast.js';
import { t } from '../../i18n/index.js';

let target = null, known = null;                     // the picture to change, and what was on its slide then

export function changeImage(b, anchor = null) {
  anchor ||= document.querySelector('#stage .block[data-id="' + b.id + '"]') || document.body;
  const item = (k, icon, name) => `<button type="button" data-ci="${k}"><i class="ms">${icon}</i><span>${t(name)}</span></button>`;
  popupMenu(anchor, { id: 'change-image', className: 'change-image', attr: 'ci',
    html: item('file', 'upload_file', 'Desde el ordenador…') + item('elements', 'interests', 'De Recursos (fotos, ilustraciones, iconos)…'),
    onPick: k => (k === 'file' ? fromFile(b.id) : fromElements(b.id)) });
}
export const fromFile = id => readFile('image/*', src => replaceImage(id, src));

async function fromElements(id) {
  target = { id, slide: currentSlide()?.id }; known = new Set(currentSlide()?.blocks.map(x => x.id));
  const el = await import('./elements.js');
  if (!document.getElementById('elements-panel')) el.openElements('images');
  toast(t('Elige una imagen en Recursos: sustituirá a la seleccionada.'));
}

// The panel put a new picture on that slide: it becomes the chosen one's picture, and goes.
subscribe(() => {
  if (!target) return;
  const s = currentSlide();
  if (s?.id !== target.slide || !document.getElementById('elements-panel')) { target = null; return; }   // (moved on, or closed)
  const fresh = s.blocks.find(x => !known.has(x.id) && x.type === 'image' && x.src); if (!fresh) { known = new Set(s.blocks.map(x => x.id)); return; }
  const { id } = target; target = null;
  if (!s.blocks.some(x => x.id === id)) return;
  amend(() => { s.blocks.splice(s.blocks.indexOf(fresh), 1); });
  replaceImage(id, fresh.src, { credit: fresh.credit, caption: fresh.caption, alt: fresh.alt });
});
export const changingImage = () => target?.id || null;
