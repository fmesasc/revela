// Classroom results: each student's points in every quiz and activity of the
// presentation (as saved by the last time it was presented in this browser),
// their total, and a CSV to take to the gradebook.

import { esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import { tallyVotes, savedVotes, GRADED } from '../../features/live/poll.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';
import { hasAccounts } from '../../io/cloud/account.js';
import { cloudDoc, docLink } from '../../io/cloud/clouddocs.js';
import { openCloudShare } from './cloud.js';
import { openGradebook, saveToGradebook } from './gradebook.js';

export function classResults(deck = state.deck) {
  const polls = deck.slides.flatMap((s, i) => s.blocks.filter(b => b.type === 'poll' && GRADED.includes(b.kind)).map(b => ({ b, slide: i + 1 })));
  const people = new Map();
  polls.forEach(({ b }, k) => (tallyVotes(b, savedVotes(b.pollId)).board || []).forEach(r => {
    const p = people.get(r.id) || { id: r.id, name: '', pts: polls.map(() => null), total: 0 };
    if (r.n) p.name = r.n; p.pts[k] = r.pts; p.total += r.pts; people.set(r.id, p);
  }));
  return { polls, rows: [...people.values()].sort((a, b) => b.total - a.total) };
}
// Question by question (Wayground's and Blooket's per-question reports): the share right, the hardest first, and the
// mistake most made — a quiz's wrong option most chosen, an activity's item most missed.
export function questionReport(deck = state.deck) {
  return classResults(deck).polls.map(({ b, slide }) => {
    const r = tallyVotes(b, savedVotes(b.pollId)), n = r.voters; if (!n) return null;
    if (b.kind === 'quiz') {
      const right = (r.board || []).filter(x => x.ok).length, wrong = (r.counts || []).map((c, i) => [c, i]).filter(([c, i]) => c && !(b.correct || [0]).includes(i)).sort((x, y) => y[0] - x[0])[0];
      return { slide, question: b.question || '', pct: right / n, n, miss: wrong ? { text: b.options[wrong[1]], count: wrong[0] } : null };
    }
    const items = itemsOf(b), worst = (r.counts || []).map((c, i) => [c, i]).filter(([c]) => c < n).sort((x, y) => x[0] - y[0])[0];
    return { slide, question: b.question || '', pct: r.average || 0, n, miss: worst && items[worst[1]] ? { text: items[worst[1]], count: n - worst[0] } : null };
  }).filter(Boolean).sort((a, b) => a.pct - b.pct);
}
// (An activity's items, as the results show them: «1. first», «left → right», «item → group», the gaps' answers.)
function itemsOf(b) {
  const o = b.options || [];
  if (b.kind === 'match') return o.map(l => { const x = String(l).split('='); return x[0].trim() + ' → ' + x.slice(1).join('=').trim(); });
  if (b.kind === 'sort') return o.flatMap(l => { const c = String(l).split(':'); return c.slice(1).join(':').split(/[,;]/).filter(x => x.trim()).map(x => x.trim() + ' → ' + c[0].trim()); });
  if (b.kind === 'gaps') return (String(b.text || '').match(/\[([^\]]+)\]/g) || []).map(g => g.slice(1, -1).split('|')[0]);
  return o.map((l, i) => (i + 1) + '. ' + l);
}
export function classResultsCSV(deck = state.deck) {
  const { polls, rows } = classResults(deck), q = s => `"${String(s).replace(/"/g, '""')}"`;
  return [[t('Alumno'), ...polls.map(({ b, slide }) => `${slide}. ${b.question || ''}`), t('Total')].map(q).join(','),
    ...rows.map(r => [q(r.name || t('Sin apodo')), ...r.pts.map(v => (v == null ? '' : v)), r.total].join(','))].join('\n');
}

function questionsHTML(qs) {
  return `<details class="gb-hard" open><summary>${t('Pregunta por pregunta (lo que más cuesta, primero)')}</summary><ol>${qs.map(x => { const pc = Math.round(x.pct * 100);
    return `<li><span>${x.slide}. ${esc(x.question)}${x.miss ? `<small>${esc(t('Error más repetido: «{e}» ({n})').replace('{e}', x.miss.text).replace('{n}', x.miss.count))}</small>` : ''}</span>`
      + `<i style="--w:${pc}%;--c:${pc < 50 ? '#c0392b' : pc < 75 ? '#d89e00' : '#26890c'}"></i><b>${pc} %</b></li>`; }).join('')}</ol></details>`;
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
    ${rows.length ? questionsHTML(questionReport()) : ''}
    <div class="fr-actions"><span class="host-help" style="margin:0">${rows.length} ${t('alumnos')}</span><button class="mini2 cr-book">${t('Cuaderno de clase')}</button>
      <button class="mini2 cr-save"${rows.length ? '' : ' disabled'}>${t('Guardar en el cuaderno')}</button><button class="fr-do cr-csv"${rows.length ? '' : ' disabled'}>${t('Descargar CSV')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  // (Into the class gradebook: this session, with today's date, for the term's report.)
  back.querySelector('.cr-book').addEventListener('click', () => { close(); openGradebook({ tab: 'report' }); });
  back.querySelector('.cr-save').addEventListener('click', async () => {
    if (await saveToGradebook({ title: state.deck.name || t('Sesión'), polls: polls.map(({ b, slide }) => ({ label: `${slide}. ${b.question || ''}` })), rows })) close();
  });
  back.querySelector('.cr-csv').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + classResultsCSV()], { type: 'text/csv' }));
    a.download = 'resultados-aula.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}

// Google Classroom's share page, with the presentation's link (from Revela's
// cloud, shared by link: then students open it at their own pace, ?self=1).
export function shareToClassroom() {
  const d = hasAccounts() && cloudDoc();
  if (!d) return hasAccounts() ? openCloudShare() : alertDialog(t('Para compartirla en Classroom, súbela a tu web o a Drive (Archivo ▸ Compartir) y comparte ese enlace; o usa revelaslides.com, que la guarda en la nube y la comparte directamente.'));
  if (d.role === 'owner' && (d.sharing?.link || 'none') === 'none') return alertDialog(t('Primero compártela por enlace (Personas ▸ Enlace: «Cualquiera con el enlace puede ver») para que el alumnado pueda abrirla.')).then(() => openCloudShare());
  const url = docLink(d.id) + '&self=1';
  window.open('https://classroom.google.com/share?' + new URLSearchParams({ url, title: state.deck.name || 'Revela' }), '_blank', 'noopener,width=640,height=640');
}
