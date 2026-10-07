// Link of an object (PowerPoint's "Link" / "Action settings"): a picture, a
// shape, an icon… that goes to a web page, or to a slide — the next, the
// previous, the first, the last, back to the one before, or one chosen from the list —, or opens a window with
// information, when it is clicked in the presentation; and words shown on hovering or touching it (Genially's
// interactive elements: menus, maps with hotspots, escape rooms).

import { esc, plainText } from '../../core/text.js';
import { state } from '../../core/store.js';
import { setObjectLink } from '../../features/document/blocks.js';
import { normalizeLink } from '../../features/document/format.js';
import { t } from '../../i18n/index.js';

const slideTitle = s => plainText((s.blocks.find(b => b.ph === 'title') || s.blocks.find(b => b.type === 'text'))?.html || '').trim().slice(0, 50);

export function openObjectLink(b) {
  document.getElementById('ol-modal')?.remove();
  const kind = b.href ? 'web' : b.popup ? 'popup' : ['next', 'prev', 'first', 'last', 'back'].includes(b.goto) ? b.goto : b.goto ? 'slide' : 'none';
  const opts = [['none', 'Sin vínculo'], ['popup', 'Abrir una ventana con información'], ['web', 'Una página web'], ['next', 'Diapositiva siguiente'], ['prev', 'Diapositiva anterior'],
    ['first', 'Primera diapositiva'], ['last', 'Última diapositiva'], ['back', 'Volver a la diapositiva de la que se vino'], ['slide', 'Una diapositiva de la presentación']];
  const back = document.createElement('div');
  back.id = 'ol-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Vínculo')}</h3>
    <p class="host-help">${t('Al presentar, un clic en el objeto lleva allí.')}</p>
    <p class="host-help">${t('Con varias diapositivas así puedes hacer menús, mapas con zonas que se pueden pulsar, caminos que se ramifican o un escape room.')}</p>
    ${opts.map(([v, l]) => `<label class="fr-chk"><input type="radio" name="ol" value="${v}"${v === kind ? ' checked' : ''}> ${t(l)}</label>`).join('')}
    <label class="fr-l ol-web">${t('Dirección')}<input type="url" class="ol-url" placeholder="https://" value="${esc(b.href || '')}"></label>
    <label class="fr-l ol-slide">${t('Diapositiva')}<select class="ol-to">${state.deck.slides.map((s, i) =>
      `<option value="${esc(s.id)}"${s.id === b.goto ? ' selected' : ''}>${i + 1}${slideTitle(s) ? ' · ' + esc(slideTitle(s)) : ''}</option>`).join('')}</select></label>
    <div class="ol-pop"><label class="fr-l">${t('Título de la ventana')}<input type="text" class="ol-pt" maxlength="200" value="${esc(b.popup?.title || '')}"></label>
      <label class="fr-l">${t('Texto')}<textarea class="ol-px" rows="5" maxlength="4000">${esc(b.popup?.text || '')}</textarea></label></div>
    <hr style="border:0;border-top:1px solid var(--line,#ddd);margin:12px 0">
    <label class="fr-l">${t('Al pasar el ratón o tocarlo, mostrar (opcional)')}<input type="text" class="ol-tip" maxlength="300" value="${esc(b.tip || '')}" placeholder="${t('p. ej.: Pulsa para abrir la pista')}"></label>
    <div class="fr-actions"><button class="fr-do ol-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove(), cur = () => q('input[name=ol]:checked')?.value;
  const sync = () => { q('.ol-web').hidden = cur() !== 'web'; q('.ol-slide').hidden = cur() !== 'slide'; q('.ol-pop').hidden = cur() !== 'popup'; };
  back.querySelectorAll('input[name=ol]').forEach(r => r.addEventListener('change', sync)); sync();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.ol-ok').addEventListener('click', () => {
    const v = cur(); let url = normalizeLink(q('.ol-url').value.trim()) || '';
    if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;            // (typed without https://)
    const tip = q('.ol-tip').value;
    setObjectLink(b.id, v === 'web' ? { href: /^(https?|mailto):/i.test(url || '') ? url : '', tip } : v === 'slide' ? { goto: q('.ol-to').value, tip }
      : v === 'popup' ? { popup: { title: q('.ol-pt').value.trim(), text: q('.ol-px').value.trim() }, tip } : v === 'none' ? { tip } : { goto: v, tip });
    close();
  });
}
