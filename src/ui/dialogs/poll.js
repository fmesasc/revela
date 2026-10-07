// Poll editor dialog (question, type, options, display) and results tools.

import { setPoll, removePoll, clearVotes, votesCSV, savedVotes, tallyVotes, ACTIVITIES } from '../../features/live/poll.js';
import { confirmDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

// fresh: a poll just inserted — closed without «Aplicar», it goes again (Cancel cancels).
export function openPollEditor(b, { fresh = false } = {}) {
  document.getElementById('poll-modal')?.remove();
  const back = document.createElement('div'); back.id = 'poll-modal'; back.className = 'modal-backdrop';
  const opt = (v, l, cur) => `<option value="${v}"${cur === v ? ' selected' : ''}>${t(l)}</option>`;
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Votación en directo')}</h3>
    <label class="fr-l">${t('Pregunta')}<input type="text" class="pl-q"></label>
    <label class="fr-l">${t('Tipo')}<select class="pl-kind">${opt('choice', 'Una opción', b.kind)}${opt('multi', 'Varias opciones', b.kind)}${opt('rating', 'Valoración 1 a 5', b.kind)}${opt('word', 'Nube de palabras', b.kind)}${opt('qa', 'Preguntas del público', b.kind)}${opt('quiz', 'Cuestionario (con respuesta correcta y puntos)', b.kind)}${opt('order', 'Actividad: ordenar', b.kind)}${opt('match', 'Actividad: unir parejas', b.kind)}${opt('gaps', 'Actividad: completar huecos', b.kind)}${opt('label', 'Actividad: etiquetar una imagen', b.kind)}${opt('board', 'Clasificación de los cuestionarios', b.kind)}</select></label>
    <p class="host-help pl-help"></p>
    <label class="fr-l pl-text-l">${t('Texto con huecos')}<textarea class="pl-text" rows="3" placeholder="${t('La capital de Francia es [París]. Varias respuestas válidas: [coche|automóvil].')}"></textarea></label>
    <div class="pl-pic" hidden><div class="fr-actions" style="justify-content:flex-start"><label class="mini2 pl-img-btn">${t('Elegir imagen…')}<input type="file" accept="image/*" hidden class="pl-img"></label>
      <label class="fr-chk" style="margin:0">${t('Colocar:')} <select class="pl-place"></select></label></div>
      <div class="pl-stage"><img alt=""><div class="pl-marks"></div></div></div>
    <label class="fr-l pl-opts-l">${t('Opciones (una por línea)')}<textarea class="pl-opts" rows="5"></textarea></label>
    <p class="host-help pl-quiz">${t('Cuestionario: pon un asterisco (*) delante de la respuesta correcta. Acertar da de 500 a 1000 puntos, más cuanto antes; al acabar el tiempo (o con un clic) se ve la respuesta y quién va ganando.')}</p>
    <label class="fr-l pl-quiz">${t('Tiempo para responder')}<select class="pl-time">${[10, 20, 30, 45, 60, 90].map(n => `<option value="${n}"${(b.time || 20) === n ? ' selected' : ''}>${n} s</option>`).join('')}</select></label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="fr-l">${t('Color del texto')} <input type="color" class="pl-ink" value="${b.color || '#222222'}"></label>
      <label class="fr-chk"><input type="checkbox" class="pl-ink-auto"${b.color ? '' : ' checked'}> ${t('El de la paleta')}</label></div>
    <label class="fr-l">${t('Mostrar resultados como')}<select class="pl-disp">${opt('bar', 'Barras', b.display)}${opt('pie', 'Circular', b.display)}${opt('numbers', 'Cifras', b.display)}</select></label>
    <p class="host-help">${t('Al presentar aparece un QR: el público vota desde el móvil y los resultados se actualizan al instante. Los móviles se conectan directamente a este ordenador, sin servidor; funciona bien con decenas de personas.')}</p>
    <p class="host-help pl-count"></p>
    <div class="fr-actions"><button class="pl-clear mini2">${t('Borrar resultados')}</button><button class="pl-csv mini2">${t('Descargar resultados (CSV)')}</button><button class="fr-do pl-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  let applied = false;
  const q = s => back.querySelector(s), close = () => { back.remove(); if (fresh && !applied) removePoll(b.id); };
  q('.pl-q').value = b.question || ''; q('.pl-opts').value = (b.options || []).map((o, i) => (b.kind === 'quiz' && (b.correct || []).includes(i) ? '*' : '') + o).join('\n');
  const HELP = { order: 'Escribe los elementos en el orden correcto, uno por línea: en los móviles salen desordenados.',
    match: 'Una pareja por línea: «izquierda = derecha». En los móviles, la columna derecha sale desordenada.',
    gaps: 'Escribe el texto y pon cada respuesta entre corchetes. Da igual mayúsculas y tildes.',
    label: 'Escribe las etiquetas (una por línea), elige una imagen y haz clic en ella para colocar cada etiqueta.' };
  let points = (b.points || []).map(p => ({ ...p })), image = b.image || '';
  const labels = () => q('.pl-opts').value.split('\n').map(s => s.trim()).filter(Boolean);
  const drawPic = () => {
    const ls = labels(), sel = q('.pl-place'), cur = +sel.value || 0;
    sel.innerHTML = ls.map((l, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${i + 1}. ${l.replace(/</g, '&lt;')}</option>`).join('');
    q('.pl-stage img').src = image || ''; q('.pl-stage').hidden = !image;
    q('.pl-marks').innerHTML = points.slice(0, ls.length).map((p, i) => p ? `<b style="left:${p.x}%;top:${p.y}%">${i + 1}</b>` : '').join('');
  };
  const sync = () => { const k = q('.pl-kind').value; q('.pl-opts-l').hidden = ['rating', 'word', 'qa', 'board', 'gaps'].includes(k);
    back.querySelectorAll('.pl-quiz').forEach(x => { x.hidden = k !== 'quiz'; });
    q('.pl-help').hidden = !HELP[k]; q('.pl-help').textContent = HELP[k] ? t(HELP[k]) : '';
    q('.pl-text-l').hidden = k !== 'gaps'; q('.pl-pic').hidden = k !== 'label'; if (k === 'label') drawPic(); };
  q('.pl-text').value = b.text || '';
  q('.pl-opts').addEventListener('input', () => { if (q('.pl-kind').value === 'label') drawPic(); });
  q('.pl-img').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(); img.onload = () => {                // (at most 1280 px: it travels to every phone)
      const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      image = c.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(img.src); drawPic();
    };
    img.src = URL.createObjectURL(f);
  });
  q('.pl-stage').addEventListener('click', e => {
    const r = q('.pl-stage img').getBoundingClientRect(), i = +q('.pl-place').value || 0;
    points[i] = { x: +((e.clientX - r.left) / r.width * 100).toFixed(1), y: +((e.clientY - r.top) / r.height * 100).toFixed(1) };
    const n = labels().length; if (i + 1 < n) q('.pl-place').value = String(i + 1);
    drawPic();
  });
  const count = () => { q('.pl-count').textContent = t('Votos guardados: ') + tallyVotes(b, savedVotes(b.pollId)).voters; };
  q('.pl-kind').addEventListener('change', sync); sync(); count();
  q('.pl-ink').addEventListener('input', () => { q('.pl-ink-auto').checked = false; });
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.pl-ok').addEventListener('click', () => {
    const lines = q('.pl-opts').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, ACTIVITIES.includes(q('.pl-kind').value) ? 20 : 10);
    // (Quiz: "*" marks the right answers.)
    const correct = lines.map((l, i) => (l.startsWith('*') ? i : -1)).filter(i => i >= 0), options = lines.map(l => l.replace(/^\*\s*/, ''));
    const kind = q('.pl-kind').value;
    setPoll(b.id, { question: q('.pl-q').value.trim(), kind, display: q('.pl-disp').value, options: options.length ? options : b.options,
      color: q('.pl-ink-auto').checked ? null : q('.pl-ink').value,
      ...(kind === 'quiz' && { correct: correct.length ? correct : [0], time: +q('.pl-time').value }),
      ...(kind === 'gaps' && { text: q('.pl-text').value.trim() }),
      ...(kind === 'label' && { image, points: options.map((_, i) => points[i] || { x: 50, y: 50 }) }) });
    applied = true; close();
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
