// Link of an object (PowerPoint's "Link" / "Action settings"): a picture, a
// shape, an icon… that goes to a web page, or to a slide — the next, the
// previous, the first, the last, or one chosen from the list — when it is
// clicked in the presentation.

import { esc, plainText } from '../../core/text.js';
import { state } from '../../core/store.js';
import { setObjectLink } from '../../features/document/blocks.js';
import { normalizeLink } from '../../features/document/format.js';
import { t } from '../../i18n/index.js';

const slideTitle = s => plainText((s.blocks.find(b => b.ph === 'title') || s.blocks.find(b => b.type === 'text'))?.html || '').trim().slice(0, 50);

export function openObjectLink(b) {
  document.getElementById('ol-modal')?.remove();
  const kind = b.href ? 'web' : ['next', 'prev', 'first', 'last'].includes(b.goto) ? b.goto : b.goto ? 'slide' : 'none';
  const opts = [['none', 'Sin vínculo'], ['web', 'Una página web'], ['next', 'Diapositiva siguiente'], ['prev', 'Diapositiva anterior'],
    ['first', 'Primera diapositiva'], ['last', 'Última diapositiva'], ['slide', 'Una diapositiva de la presentación']];
  const back = document.createElement('div');
  back.id = 'ol-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Vínculo')}</h3>
    <p class="host-help">${t('Al presentar, un clic en el objeto lleva allí.')}</p>
    ${opts.map(([v, l]) => `<label class="fr-chk"><input type="radio" name="ol" value="${v}"${v === kind ? ' checked' : ''}> ${t(l)}</label>`).join('')}
    <label class="fr-l ol-web">${t('Dirección')}<input type="url" class="ol-url" placeholder="https://" value="${esc(b.href || '')}"></label>
    <label class="fr-l ol-slide">${t('Diapositiva')}<select class="ol-to">${state.deck.slides.map((s, i) =>
      `<option value="${esc(s.id)}"${s.id === b.goto ? ' selected' : ''}>${i + 1}${slideTitle(s) ? ' · ' + esc(slideTitle(s)) : ''}</option>`).join('')}</select></label>
    <div class="fr-actions"><button class="fr-do ol-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove(), cur = () => q('input[name=ol]:checked')?.value;
  const sync = () => { q('.ol-web').hidden = cur() !== 'web'; q('.ol-slide').hidden = cur() !== 'slide'; };
  back.querySelectorAll('input[name=ol]').forEach(r => r.addEventListener('change', sync)); sync();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.ol-ok').addEventListener('click', () => {
    const v = cur(); let url = normalizeLink(q('.ol-url').value.trim()) || '';
    if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;            // (typed without https://)
    setObjectLink(b.id, v === 'web' ? { href: /^(https?|mailto):/i.test(url || '') ? url : '' } : v === 'slide' ? { goto: q('.ol-to').value } : v === 'none' ? {} : { goto: v });
    close();
  });
}
