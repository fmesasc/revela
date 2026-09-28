// Poll editor dialog (question, type, options, display) and results tools.

import { state, currentSlide } from '../core/store.js';
import { setPoll, clearVotes, votesCSV, savedVotes, tallyVotes } from '../features/poll.js';
import { confirmDialog } from './dialog.js';
import { t } from '../i18n.js';

export function openPollEditor(b) {
  document.getElementById('poll-modal')?.remove();
  const back = document.createElement('div'); back.id = 'poll-modal'; back.className = 'modal-backdrop';
  const opt = (v, l, cur) => `<option value="${v}"${cur === v ? ' selected' : ''}>${t(l)}</option>`;
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Votación en directo')}</h3>
    <label class="fr-l">${t('Pregunta')}<input type="text" class="pl-q"></label>
    <label class="fr-l">${t('Tipo')}<select class="pl-kind">${opt('choice', 'Una opción', b.kind)}${opt('multi', 'Varias opciones', b.kind)}${opt('rating', 'Valoración 1 a 5', b.kind)}${opt('word', 'Nube de palabras', b.kind)}${opt('qa', 'Preguntas del público', b.kind)}</select></label>
    <label class="fr-l pl-opts-l">${t('Opciones (una por línea)')}<textarea class="pl-opts" rows="5"></textarea></label>
    <label class="fr-l">${t('Mostrar resultados como')}<select class="pl-disp">${opt('bar', 'Barras', b.display)}${opt('pie', 'Circular', b.display)}${opt('numbers', 'Cifras', b.display)}</select></label>
    <p class="host-help">${t('Al presentar aparece un QR: el público vota desde el móvil y los resultados se actualizan al instante. Conexión directa entre navegadores (WebRTC); funciona bien con decenas de personas.')}</p>
    <p class="host-help pl-count"></p>
    <div class="fr-actions"><button class="pl-clear">${t('Borrar resultados')}</button><button class="pl-csv">${t('Descargar resultados (CSV)')}</button><button class="fr-do pl-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.pl-q').value = b.question || ''; q('.pl-opts').value = (b.options || []).join('\n');
  const sync = () => { q('.pl-opts-l').hidden = ['rating', 'word', 'qa'].includes(q('.pl-kind').value); };
  const count = () => { q('.pl-count').textContent = t('Votos guardados: ') + tallyVotes(b, savedVotes(b.pollId)).voters; };
  q('.pl-kind').addEventListener('change', sync); sync(); count();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.pl-ok').addEventListener('click', () => {
    const options = q('.pl-opts').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 10);
    setPoll(b.id, { question: q('.pl-q').value.trim(), kind: q('.pl-kind').value, display: q('.pl-disp').value, options: options.length ? options : b.options });
    close();
  });
  q('.pl-clear').addEventListener('click', async () => {
    if (!(await confirmDialog(t('¿Borrar los votos recibidos en esta votación?')))) return;
    clearVotes(b.pollId); setPoll(b.id, {}); count();
  });
  q('.pl-csv').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + votesCSV(b)], { type: 'text/csv' }));
    a.download = 'votacion.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}
