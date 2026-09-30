// A PDF dropped or inserted: how to add it — its page on the slide, the PDF
// itself to leaf through when presenting, an icon to download it, or one slide
// per page. Resolves to 'page' | 'viewer' | 'icon' | 'slides', or null.

import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';

const MODES = [['page', 'description', 'Una página en la diapositiva', 'Se ve la primera página (puedes elegir otra). Al presentar, un clic abre el PDF.'],
  ['viewer', 'menu_book', 'El PDF para hojearlo', 'Al presentar se muestra el PDF entero en un visor, con sus páginas.'],
  ['icon', 'draft', 'Un icono para descargarlo', 'Un icono con el nombre del archivo; al hacer clic se descarga.'],
  ['slides', 'library_add', 'Una diapositiva por página', 'Cada página pasa a ser una diapositiva nueva, detrás de esta.']];

export function choosePdfMode(name) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.id = 'pdf-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" style="text-align:start;min-width:min(420px,94vw);max-width:94vw"><button class="modal-close">✕</button>
      <h3>${t('Añadir el PDF')}</h3><p class="host-help">${esc(name || '')}</p>
      <div class="pdf-modes">${MODES.map(([k, icon, title, help]) => `<button type="button" class="pdf-mode" data-mode="${k}"><i class="ms">${icon}</i><span><b>${t(title)}</b><small>${t(help)}</small></span></button>`).join('')}</div></div>`;
    document.body.appendChild(back);
    const done = v => { back.remove(); resolve(v); };
    back.querySelector('.modal-close').addEventListener('click', () => done(null));
    back.addEventListener('click', e => { if (e.target === back) done(null); });
    back.querySelectorAll('.pdf-mode').forEach(b => b.addEventListener('click', () => done(b.dataset.mode)));
    back.querySelector('.pdf-mode').focus();
  });
}
