// Classroom results: each student's points in every quiz and activity of the
// presentation (as saved by the last time it was presented in this browser),
// their total, and a CSV to take to the gradebook.

import { esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import { tallyVotes, savedVotes, GRADED } from '../../features/live/poll.js';
import { t } from '../../i18n/index.js';

export function classResults(deck = state.deck) {
  const polls = deck.slides.flatMap((s, i) => s.blocks.filter(b => b.type === 'poll' && GRADED.includes(b.kind)).map(b => ({ b, slide: i + 1 })));
  const people = new Map();
  polls.forEach(({ b }, k) => (tallyVotes(b, savedVotes(b.pollId)).board || []).forEach(r => {
    const p = people.get(r.id) || { name: '', pts: polls.map(() => null), total: 0 };
    if (r.n) p.name = r.n; p.pts[k] = r.pts; p.total += r.pts; people.set(r.id, p);
  }));
  return { polls, rows: [...people.values()].sort((a, b) => b.total - a.total) };
}
export function classResultsCSV(deck = state.deck) {
  const { polls, rows } = classResults(deck), q = s => `"${String(s).replace(/"/g, '""')}"`;
  return [[t('Alumno'), ...polls.map(({ b, slide }) => `${slide}. ${b.question || ''}`), t('Total')].map(q).join(','),
    ...rows.map(r => [q(r.name || t('Sin apodo')), ...r.pts.map(v => (v == null ? '' : v)), r.total].join(','))].join('\n');
}

export function openClassResults() {
  document.getElementById('class-modal')?.remove();
  const { polls, rows } = classResults();
  const back = document.createElement('div'); back.id = 'class-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(760px,96vw);max-width:none"><button class="modal-close">✕</button><h3>${t('Resultados del aula')}</h3>
    <p class="host-help">${t('Los puntos de cada cuestionario y actividad, guardados en este navegador la última vez que se presentó. Activa el modo aula para que el alumnado siga las diapositivas en su dispositivo.')}</p>
    ${!polls.length ? `<p class="host-help">${t('Esta presentación no tiene cuestionarios ni actividades con nota.')}</p>` : !rows.length ? `<p class="host-help">${t('Aún no hay respuestas: presenta y deja que el alumnado responda.')}</p>`
      : `<div class="cr-wrap"><table class="cr-table"><thead><tr><th>${t('Alumno')}</th>${polls.map(({ b, slide }) => `<th title="${esc(b.question || '')}">${slide}</th>`).join('')}<th>${t('Total')}</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${esc(r.name || t('Sin apodo'))}</td>${r.pts.map(v => `<td>${v == null ? '—' : v}</td>`).join('')}<td><b>${r.total}</b></td></tr>`).join('')}</tbody></table></div>`}
    <div class="fr-actions"><span class="host-help" style="margin:0">${rows.length} ${t('alumnos')}</span><button class="fr-do cr-csv"${rows.length ? '' : ' disabled'}>${t('Descargar CSV')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.cr-csv').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + classResultsCSV()], { type: 'text/csv' }));
    a.download = 'resultados-aula.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}
