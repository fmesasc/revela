// Find and replace (Ctrl+F): counts matches as you type, replaces in the
// current slide or all of them.

import { countMatches, replaceAll } from '../../features/document/search.js';
import { t } from '../../i18n/index.js';

export function openFindPanel() {
  if (document.getElementById('find-modal')) return;
  const back = document.createElement('div');
  back.id = 'find-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
    <button class="modal-close" title="Cerrar">✕</button>
    <h3>${t('Buscar y reemplazar')}</h3>
    <label class="fr-l">${t('Buscar')}<input class="fr-find" type="text" autocomplete="off"></label>
    <label class="fr-l">${t('Reemplazar por')}<input class="fr-repl" type="text" autocomplete="off"></label>
    <label class="fr-chk"><input type="checkbox" class="fr-all" checked> ${t('En todas las diapositivas')}</label>
    <div class="fr-actions">
      <span class="fr-count"></span>
      <button class="fr-do">${t('Reemplazar todo')}</button>
    </div>
  </div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const update = () => {
    const n = countMatches(q('.fr-find').value, q('.fr-all').checked);
    q('.fr-count').textContent = q('.fr-find').value ? `${n} coincidencia(s)` : '';
  };
  q('.fr-find').addEventListener('input', update);
  q('.fr-all').addEventListener('change', update);
  q('.fr-do').addEventListener('click', () => {
    const n = replaceAll(q('.fr-find').value, q('.fr-repl').value, q('.fr-all').checked);
    q('.fr-count').textContent = `${n} reemplazo(s)`;
  });
  q('.fr-find').focus();
}
