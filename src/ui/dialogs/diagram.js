// A diagram's text (SmartArt's text pane): one line per item; two spaces (or
// Tab) in front make it a sub-item — a description under it, or in an org
// chart a person under another. The diagram changes as it is typed.

import { t } from '../../i18n/index.js';
import { commit } from '../../core/store.js';
import * as blocks from '../../features/document/blocks.js';
import { DIAGRAM_NAMES } from '../../render/diagrams.js';

export function openDiagramText(b) {
  document.getElementById('dg-modal')?.remove();
  const back = document.createElement('div'); back.id = 'dg-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,96vw)"><button class="modal-close">✕</button>
    <h3>${t('Texto del diagrama')} · ${t(DIAGRAM_NAMES[b.layout] || '')}</h3>
    <p class="host-help">${t('Una línea por elemento. Con dos espacios (o Tab) delante, es un subelemento: su explicación, o en un organigrama, quien depende de él.')}</p>
    <textarea class="dg-text" rows="12" spellcheck="true" style="width:100%;box-sizing:border-box;font:15px/1.5 ui-monospace,monospace;tab-size:2"></textarea>
    <div class="fr-actions"><button type="button" class="fr-do dg-ok">${t('Aceptar')}</button></div></div>`;
  document.body.appendChild(back);
  const ta = back.querySelector('.dg-text'), before = b.text;
  ta.value = b.text ?? '';
  // Live, without an undo step per key; one step when closing.
  let timer = 0;
  ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => commit(() => { b.text = ta.value; }, { history: false }), 120); });
  ta.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return; e.preventDefault();
    const s = ta.selectionStart, line0 = ta.value.lastIndexOf('\n', s - 1) + 1;
    if (e.shiftKey) { if (ta.value.slice(line0, line0 + 2) === '  ') { ta.value = ta.value.slice(0, line0) + ta.value.slice(line0 + 2); ta.selectionStart = ta.selectionEnd = Math.max(line0, s - 2); } }
    else { ta.value = ta.value.slice(0, line0) + '  ' + ta.value.slice(line0); ta.selectionStart = ta.selectionEnd = s + 2; }
    ta.dispatchEvent(new Event('input'));
  });
  const close = () => {
    clearTimeout(timer); back.remove();
    const text = ta.value;
    if (text !== before) { commit(() => { b.text = before; }, { history: false }); blocks.setDiagram(b.id, { text }); }   // (one undo step)
  };
  back.querySelector('.modal-close').addEventListener('click', close);
  back.querySelector('.dg-ok').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  ta.focus();
}
