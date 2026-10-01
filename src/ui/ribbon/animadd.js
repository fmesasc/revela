// "Añadir animación" (PowerPoint's Add Animation): a palette of effects that
// adds one more animation to the selected object, after the ones it has — so
// it can appear, go somewhere, then somewhere else, turn, play a 3D clip…

import { isPdf } from '../../features/content/files.js';
import { openPdfZone } from '../dialogs/pdfzone.js';
import { popupMenu } from '../shell/menu.js';
import { modelClips } from '../canvas/mediaview.js';
import { esc } from '../../core/text.js';
import { selectedBlock } from '../../core/store.js';
import { addAnimation, animsOf } from '../../features/animation/transitions.js';
import { startPathDraw } from '../canvas/pathdraw.js';
import { alertDialog } from '../dialogs/dialog.js';
import { t } from '../../i18n/index.js';

const PALETTE = [
  ['Entrada', [['fade-in', 'Aparecer', 'visibility'], ['fade-up', 'Subir', 'arrow_upward'], ['zoom-in', 'Zoom', 'zoom_in'], ['bounce', 'Rebotar', 'sports_basketball'], ['spin', 'Girar', 'rotate_right'], ['draw', 'Dibujar', 'draw']]],
  ['Énfasis', [['grow', 'Agrandar', 'zoom_out_map'], ['shrink', 'Encoger', 'close_fullscreen'], ['spin360', 'Dar una vuelta', 'autorenew'], ['highlight-red', 'Resaltar', 'ink_highlighter'],
    ['pulse', 'Latido', 'favorite'], ['teeter', 'Balanceo', 'vibration'], ['jump', 'Salto', 'keyboard_double_arrow_up'], ['color-pulse', 'Destello', 'flare']]],
  ['Salida', [['fade-out', 'Desaparecer', 'visibility_off'], ['semi-fade-out', 'Atenuar', 'opacity']]],
  ['Movimiento', [['path', 'Trayectoria recta', 'trending_flat'], ['draw', 'Dibujar un recorrido', 'gesture']]],
];

// A PDF's step after its last one: the next page, a page and part of it, or the whole page again.
async function addPdfStep(b, kind) {
  const last = animsOf(b).filter(a => a.effect === 'pdfview').at(-1), page = +last?.page || b.page || 1;
  const base = { duration: 700, start: 'click' };
  if (kind === 'next') addAnimation('pdfview', { ...base, page: Math.min(b.pages || page + 1, page + 1), zx: 0.5, zy: 0.5, zs: 1 });
  else if (kind === 'whole') addAnimation('pdfview', { ...base, page, zx: 0.5, zy: 0.5, zs: 1 });
  else { const z = await openPdfZone(b, { page, zx: last?.zx, zy: last?.zy, zs: last?.zs }); if (z) addAnimation('pdfview', { ...base, ...z }); }
}
export function openAddAnimation(anchor) {
  const b = selectedBlock();
  if (!b) { alertDialog(t('Selecciona primero el objeto que se moverá.')); return; }
  const clips = b.type === 'model' ? modelClips(b.id) : [];
  const sections = [...PALETTE, ...(clips.length ? [['Animación del modelo 3D', clips.map(c => [`clip:${c}`, c, 'play_circle'])]] : []),
    ...(isPdf(b) ? [['PDF', [['pdf:next', 'Pasar a la página siguiente', 'arrow_forward'], ['pdf:zone', 'Ir a una página y hacer zoom…', 'zoom_in'], ['pdf:whole', 'Volver a la página entera', 'fit_screen']]]] : [])];
  popupMenu(anchor, { id: 'anim-add-menu', className: 'anim-add', attr: 'add',
    html: `<p class="host-help">${animsOf(b).length ? t('Se añade después de sus animaciones ({n}).').replace('{n}', animsOf(b).length) : t('Su primera animación.')}</p>`
      + sections.map(([title, items]) => `<div class="aa-sec"><b>${t(title)}</b><div class="aa-items">${items.map(([k, l, i]) => `<button type="button" data-add="${esc(k)}"><i class="ms">${i}</i>${esc(t(l))}</button>`).join('')}</div></div>`).join(''),
    onPick: k => {
      if (k.startsWith('pdf:')) return addPdfStep(b, k.slice(4));
      if (k === 'draw') startPathDraw({ append: true });
      else if (k.startsWith('clip:')) addAnimation('clip3d', { clip: k.slice(5), once: true, duration: 1500 });
      else addAnimation(k);
    } });
}
