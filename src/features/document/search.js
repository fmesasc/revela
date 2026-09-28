// Find & replace across the text of the deck. Replacement walks text nodes so
// it never corrupts the inline formatting (bold, colour, links…) in the HTML.

import { state, commit, currentSlide } from '../../core/store.js';
import { t } from '../../i18n/index.js';

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function replaceInHtml(html, find, repl) {
  const d = document.createElement('div'); d.innerHTML = html;
  const walker = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
  let n, count = 0;
  while ((n = walker.nextNode())) {
    const re = new RegExp(escapeRegExp(find), 'gi');
    n.nodeValue = n.nodeValue.replace(re, () => { count++; return repl; });
  }
  return { html: d.innerHTML, count };
}

function textBlocks(all) {
  const list = [];
  const slides = all ? state.deck.slides : [currentSlide()];
  for (const s of slides) for (const b of s.blocks) if (b.type === 'text' && b.html) list.push(b);
  return list;
}

export function countMatches(find, all = true) {
  if (!find) return 0;
  let count = 0;
  for (const b of textBlocks(all)) count += replaceInHtml(b.html, find, '\0').count;
  return count;
}

export function replaceAll(find, repl, all = true) {
  if (!find) return 0;
  let count = 0;
  commit(() => {
    for (const b of textBlocks(all)) {
      const r = replaceInHtml(b.html, find, repl);
      if (r.count) { b.html = r.html; count += r.count; }
    }
  });
  return count;
}

// ---- Panel ----------------------------------------------------------------
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
