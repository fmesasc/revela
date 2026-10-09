// Poll editor dialog (question, type, options, display) and results tools.

import { setPoll, removePoll, clearVotes, votesCSV, savedVotes, tallyVotes, mergeVotes, ACTIVITIES } from '../../features/live/poll.js';
import { ASYNC_KINDS } from '../../features/live/answers.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { confirmDialog } from './dialog.js';
import { t } from '../../i18n/index.js';
import { state, commit } from '../../core/store.js';

// fresh: a poll just inserted — closed without «Aplicar», it goes again (Cancel cancels).
export function openPollEditor(b, { fresh = false } = {}) {
  document.getElementById('poll-modal')?.remove();
  const back = document.createElement('div'); back.id = 'poll-modal'; back.className = 'modal-backdrop';
  const opt = (v, l, cur) => `<option value="${v}"${cur === v ? ' selected' : ''}>${t(l)}</option>`;
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Votación en directo')}</h3>
    <label class="fr-l">${t('Pregunta')}<input type="text" class="pl-q"></label>
    <label class="fr-l">${t('Tipo')}<select class="pl-kind">${opt('choice', 'Una opción', b.kind)}${opt('multi', 'Varias opciones', b.kind)}${opt('rating', 'Valoración 1 a 5', b.kind)}${opt('word', 'Nube de palabras', b.kind)}${opt('qa', 'Preguntas del público', b.kind)}${opt('quiz', 'Cuestionario (con respuesta correcta y puntos)', b.kind)}${opt('order', 'Actividad: ordenar', b.kind)}${opt('match', 'Actividad: unir parejas', b.kind)}${opt('gaps', 'Actividad: completar huecos', b.kind)}${opt('label', 'Actividad: etiquetar una imagen', b.kind)}${opt('sort', 'Actividad: clasificar en grupos', b.kind)}${opt('crossword', 'Actividad: crucigrama', b.kind)}${opt('wordsearch', 'Actividad: sopa de letras', b.kind)}${opt('memory', 'Actividad: memoria (parejas)', b.kind)}${opt('wheel', 'Actividad: rueda de letras', b.kind)}${opt('open', 'Respuesta abierta (muro de respuestas)', b.kind)}${opt('number', 'Adivinar un número', b.kind)}${opt('image', 'Elegir entre imágenes', b.kind)}${opt('point', 'Tocar un punto de una imagen', b.kind)}${opt('rank', 'Ordenar por preferencia', b.kind)}${opt('draw', 'Respuesta dibujada', b.kind)}${opt('photo', 'Respuesta con una foto', b.kind)}${opt('audio', 'Respuesta de voz (audio)', b.kind)}${opt('board', 'Clasificación de los cuestionarios', b.kind)}</select></label>
    <p class="host-help pl-help"></p>
    <label class="fr-l pl-text-l">${t('Texto con huecos')}<textarea class="pl-text" rows="3" placeholder="${t('La capital de Francia es [París]. Varias respuestas válidas: [coche|automóvil].')}"></textarea></label>
    <div class="pl-pic" hidden><div class="fr-actions" style="justify-content:flex-start"><label class="mini2 pl-img-btn">${t('Elegir imagen…')}<input type="file" accept="image/*" hidden class="pl-img"></label>
      <label class="fr-chk" style="margin:0">${t('Colocar:')} <select class="pl-place"></select></label></div>
      <div class="pl-stage"><img alt=""><div class="pl-marks"></div></div></div>
    <label class="fr-l pl-opts-l">${t('Opciones (una por línea)')}<textarea class="pl-opts" rows="5"></textarea></label>
    <div class="pl-imgs" hidden></div>
    <div class="pl-aud" hidden style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto"></div>
    <label class="fr-chk pl-mod-l"><input type="checkbox" class="pl-mod"${b.moderate ? ' checked' : ''}> ${t('Aprobar cada pregunta antes de que salga en pantalla')}</label>
    <p class="host-help pl-mod-l">${t('Al presentar, la tecla M (o clic derecho ▸ «Moderar las preguntas») abre una ventana para aprobarlas, ocultarlas o descartarlas: llévala a tu pantalla. Las preguntas no llevan el nombre de quien pregunta.')}</p>
    <label class="fr-chk pl-clean-l"><input type="checkbox" class="pl-clean"${b.clean ? ' checked' : ''}> ${t('Tapar las palabrotas')}</label>
    <div class="pl-rub" hidden><label class="fr-l">${t('Criterios para corregir con IA (opcional)')}<textarea class="pl-rubric" rows="3" maxlength="2000" placeholder="${t('p. ej.: Nombra las tres partes, pon un ejemplo y usa las palabras de clase.')}">${(b.rubric || '').replace(/</g, '&lt;')}</textarea></label>
      <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 pl-grade"><i class="ms">auto_awesome</i> ${t('Corregir con IA las respuestas')}</button></div>
      <p class="host-help">${t('También al presentar desde el editor: clic derecho ▸ «Corregir con IA las respuestas»; a cada móvil le llega su nota y un comentario.')}</p><div class="pl-graded"></div></div>
    <div class="pl-num" hidden style="display:flex;gap:8px;flex-wrap:wrap">
      <label class="fr-l">${t('Mínimo')}<input type="number" step="any" class="pl-min" style="width:7em" value="${b.min ?? 0}"></label>
      <label class="fr-l">${t('Máximo')}<input type="number" step="any" class="pl-max" style="width:7em" value="${b.max ?? 100}"></label>
      <label class="fr-l">${t('Unidad')}<input type="text" class="pl-unit" maxlength="12" style="width:6em" value="${(b.unit || '').replace(/"/g, '&quot;')}" placeholder="€, km, %…"></label>
      <label class="fr-l" title="${t('Vacío: sin respuesta correcta (una encuesta)')}">${t('Respuesta correcta (opcional)')}<input type="number" step="any" class="pl-ans" style="width:8em" value="${b.answer ?? ''}"></label></div>
    <p class="host-help pl-quiz">${t('Cuestionario: pon un asterisco (*) delante de la respuesta correcta. Acertar da de 500 a 1000 puntos, más cuanto antes; al acabar el tiempo (o con un clic) se ve la respuesta y quién va ganando.')}</p>
    <label class="fr-l pl-quiz">${t('Modo')}<select class="pl-mode">${opt('speed', 'Rapidez: más puntos cuanto antes', b.mode || 'speed')}${opt('accuracy', 'Precisión: solo cuenta acertar, sin prisa', b.mode)}${opt('confidence', 'Confianza: cada uno dice lo seguro que está', b.mode)}</select></label>
    <label class="fr-l pl-teams-l">${t('Por equipos (un nombre por línea; vacío: cada uno por su cuenta)')}<textarea class="pl-teams" rows="2" placeholder="${t('Rojo')}&#10;${t('Azul')}">${(state.deck.teams || []).join('\n').replace(/</g, '&lt;')}</textarea></label>
    <p class="host-help pl-teams-l">${t('Vale para todos los cuestionarios de la presentación: cada móvil elige equipo y la clasificación muestra la media de cada equipo. Al responder se ganan estrellas (una por respuesta y otra por acierto) y cada 5, un nivel.')}</p>
    <label class="fr-l pl-wheel">${t('Tiempo total (segundos; 0: sin límite)')}<input type="number" min="0" max="3600" step="10" class="pl-wtime" style="width:7em" value="${b.kind === 'wheel' ? b.time ?? 150 : 150}"></label>
    <label class="fr-l pl-quiz">${t('Tiempo para responder')}<select class="pl-time">${[10, 20, 30, 45, 60, 90].map(n => `<option value="${n}"${(b.time || 20) === n ? ' selected' : ''}>${n} s</option>`).join('')}</select></label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="fr-l">${t('Color del texto')} <input type="color" class="pl-ink" value="${b.color || '#222222'}"></label>
      <label class="fr-chk"><input type="checkbox" class="pl-ink-auto"${b.color ? '' : ' checked'}> ${t('El de la paleta')}</label></div>
    <label class="fr-l">${t('Mostrar resultados como')}<select class="pl-disp">${opt('bar', 'Barras', b.display)}${opt('pie', 'Circular', b.display)}${opt('numbers', 'Cifras', b.display)}${opt('race', 'Carrera animada', b.display)}</select></label>
    <p class="host-help pl-race">${t('Carrera: cada jugador (o cada equipo) avanza hacia la meta, los puntos de todos los cuestionarios; al volver a la diapositiva, sale desde donde estaba. En un cuestionario, se ve al mostrar la respuesta.')}</p>
    <p class="host-help">${t('Al presentar aparece un QR: el público vota desde el móvil y los resultados se actualizan al instante. Los móviles se conectan directamente a este ordenador, sin servidor; funciona bien con decenas de personas.')}</p>
    <fieldset class="pl-later"><legend>${t('Responder más tarde, sin presentar')}</legend>
      <label class="fr-chk"><input type="checkbox" class="pl-async"${b.async ? ' checked' : ''}> ${t('Abrirla para responder con un enlace, cuando cada uno quiera')}</label>
      <p class="host-help pl-later-help"></p>
      <div class="sh-row pl-later-link" hidden><input readonly class="pl-link"><button type="button" class="mini2 pl-copy">${t('Copiar')}</button></div>
      <div class="fr-actions pl-later-get" hidden style="justify-content:flex-start"><button type="button" class="mini2 pl-get"><i class="ms">download</i> ${t('Traer las respuestas')}</button><span class="pl-got host-help"></span></div></fieldset>
    <p class="host-help pl-count"></p>
    <div class="fr-actions"><button class="pl-clear mini2">${t('Borrar resultados')}</button><button class="pl-csv mini2">${t('Descargar resultados (CSV)')}</button><button class="fr-do pl-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  let applied = false;
  const q = s => back.querySelector(s), close = () => { back.remove(); if (fresh && !applied) removePoll(b.id); };
  q('.pl-q').value = b.question || ''; q('.pl-opts').value = (b.options || []).map((o, i) => (b.kind === 'quiz' && (b.correct || []).includes(i) ? '*' : '') + o).join('\n');
  const HELP = { order: 'Escribe los elementos en el orden correcto, uno por línea: en los móviles salen desordenados.',
    match: 'Una pareja por línea: «izquierda = derecha». En los móviles, la columna derecha sale desordenada.',
    gaps: 'Escribe el texto y pon cada respuesta entre corchetes. Da igual mayúsculas y tildes.',
    label: 'Escribe las etiquetas (una por línea), elige una imagen y haz clic en ella para colocar cada etiqueta.',
    sort: 'Un grupo por línea: «Grupo: elemento, elemento, elemento». En los móviles salen todos los elementos desordenados y cada persona elige el grupo de cada uno.',
    crossword: 'Una palabra por línea con su pista: «PALABRA = pista». Revela monta el crucigrama; en los móviles salen la cuadrícula y las pistas numeradas, nunca las palabras. Da igual mayúsculas, tildes y espacios.',
    wordsearch: 'Las palabras que hay que encontrar, una por línea; con «PALABRA = pista», en los móviles sale la pista en lugar de la palabra. Revela las esconde en horizontal, en vertical y en diagonal, y rellena el resto con letras de las mismas palabras.',
    memory: 'Una pareja por línea: «A = B». En los móviles salen las cartas boca abajo y cada persona busca las parejas; cuentan las parejas encontradas y, para desempatar, los intentos. Es para practicar: el móvil necesita las dos caras de cada carta para jugar.',
    wheel: 'Una letra por línea: «A = respuesta = pista» (sin la letra, vale la primera de la respuesta; «~» delante para «Contiene la…» en lugar de «Empieza por la…»; «a|b» si valen dos respuestas). En los móviles salen la rueda, la letra y la pista, nunca la respuesta. Al presentar, la tecla J la juega en la pantalla con una sola persona, sin móviles.',
    open: 'Cada persona escribe una respuesta corta; salen en un muro, las más recientes primero.',
    number: 'Cada persona da un número con un deslizador; se ven la media, la mediana y cómo se reparten, y la respuesta si la pones.',
    image: 'Escribe el nombre de cada opción (uno por línea) y elige su imagen.',
    point: 'Elige una imagen: cada persona toca un punto y se ve dónde tocó todo el mundo.',
    rank: 'Cada persona ordena las opciones de la que más prefiere a la que menos; gana la que suma más puntos.',
    draw: 'Cada persona dibuja con el dedo en su móvil (encima de la imagen, si eliges una) y los dibujos salen en un muro.',
    photo: 'Cada persona hace o elige una foto (su cuaderno, una maqueta, algo que ha encontrado) y salen en un muro.',
    audio: 'Cada persona graba con el móvil una respuesta de voz (hasta 30 segundos) y salen en un muro, las más recientes primero; haz clic en una para escucharla. Este navegador guarda las más recientes: unas diez de 30 segundos.' };
  let images = (b.images || []).slice();
  const drawImgs = () => {
    const ls = labels(); q('.pl-imgs').innerHTML = ls.map((l, i) => `<div class="sh-row" data-i="${i}" style="align-items:center">${images[i] ? `<img src="${images[i]}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:6px">` : '<span style="width:64px;height:48px;border-radius:6px;background:#8883;display:inline-block"></span>'}
      <span style="flex:1">${l.replace(/</g, '&lt;')}</span><label class="mini2">${t('Elegir imagen…')}<input type="file" accept="image/*" hidden></label></div>`).join('');
  };
  q('.pl-imgs').addEventListener('change', e => { const f = e.target.files?.[0], i = +e.target.closest('[data-i]')?.dataset.i; if (!f) return; small(f, src => { images[i] = src; drawImgs(); }); });
  let points = (b.points || []).map(p => ({ ...p })), image = b.image || '';
  const labels = () => q('.pl-opts').value.split('\n').map(s => s.trim()).filter(Boolean);
  const drawPic = () => {
    const ls = labels(), sel = q('.pl-place'), cur = +sel.value || 0;
    sel.innerHTML = ls.map((l, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${i + 1}. ${l.replace(/</g, '&lt;')}</option>`).join('');
    q('.pl-stage img').src = image || ''; q('.pl-stage').hidden = !image;
    q('.pl-marks').innerHTML = points.slice(0, ls.length).map((p, i) => p ? `<b style="left:${p.x}%;top:${p.y}%">${i + 1}</b>` : '').join('');
  };
  const sync = () => { const k = q('.pl-kind').value; q('.pl-opts-l').hidden = ['rating', 'word', 'qa', 'board', 'gaps', 'open', 'number', 'point', 'draw', 'photo', 'audio'].includes(k);
    q('.pl-num').hidden = k !== 'number'; q('.pl-imgs').hidden = k !== 'image'; if (k === 'image') drawImgs(); q('.pl-rub').hidden = k !== 'open';
    back.querySelectorAll('.pl-quiz').forEach(x => { x.hidden = k !== 'quiz'; }); q('.pl-wheel').hidden = k !== 'wheel';
    back.querySelectorAll('.pl-mod-l').forEach(x => { x.hidden = k !== 'qa'; }); q('.pl-clean-l').hidden = !['qa', 'word', 'open'].includes(k);
    back.querySelectorAll('.pl-teams-l').forEach(x => { x.hidden = k !== 'quiz' && k !== 'board'; });
    q('.pl-help').hidden = !HELP[k]; q('.pl-help').textContent = HELP[k] ? t(HELP[k]) : '';
    const picOnly = k === 'point' || k === 'draw';
    q('.pl-text-l').hidden = k !== 'gaps'; q('.pl-pic').hidden = k !== 'label' && !picOnly; if (k === 'label' || picOnly) drawPic();
    q('.pl-place').closest('label').hidden = picOnly; q('.pl-marks').hidden = picOnly;
    // (The leaderboard and the quizzes: a list or a race; the rest, bars, pie or figures.)
    const ranked = k === 'board' || k === 'quiz', disp = q('.pl-disp');
    disp.querySelectorAll('option').forEach(o => { o.hidden = o.value === 'race' ? !ranked : ranked && o.value !== 'bar'; });
    if (disp.selectedOptions[0]?.hidden) disp.value = 'bar';
    disp.querySelector('option[value="bar"]').textContent = t(ranked ? 'Lista' : 'Barras'); q('.pl-race').hidden = !ranked;
    q('.pl-aud').hidden = k !== 'audio'; if (k === 'audio') listen(); };
  // The voices kept here, to listen to in the editor.
  const listen = () => { const e = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), clips = tallyVotes({ kind: 'audio' }, savedVotes(b.pollId)).clips;
    q('.pl-aud').innerHTML = clips.length ? clips.map(c => `<div class="sh-row" style="align-items:center"><span style="flex:1;min-width:0;overflow-wrap:anywhere">${e(c.n || '🎤')}${c.d ? ` · ${c.d} s` : ''}</span><audio controls preload="none" src="${e(c.aud)}" style="max-width:62%"></audio></div>`).join('')
      : `<span class="host-help">${t('Aún no hay respuestas.')}</span>`; };
  q('.pl-text').value = b.text || '';
  q('.pl-opts').addEventListener('input', () => { const k = q('.pl-kind').value; if (k === 'label') drawPic(); if (k === 'image') drawImgs(); });
  // (A picture made small enough to travel to every phone: at most `max` px, JPEG.)
  function small(f, done, max = 1280) {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); done(c.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(f);
  }
  q('.pl-img').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; small(f, src => { image = src; drawPic(); }); });
  q('.pl-stage').addEventListener('click', e => {
    if (['point', 'draw'].includes(q('.pl-kind').value)) return;   // (a point to tap, a drawing's background: the picture only)
    const r = q('.pl-stage img').getBoundingClientRect(), i = +q('.pl-place').value || 0;
    points[i] = { x: +((e.clientX - r.left) / r.width * 100).toFixed(1), y: +((e.clientY - r.top) / r.height * 100).toFixed(1) };
    const n = labels().length; if (i + 1 < n) q('.pl-place').value = String(i + 1);
    drawPic();
  });
  const count = () => { q('.pl-count').textContent = t('Votos guardados: ') + tallyVotes(b, savedVotes(b.pollId)).voters; };
  // Answered later by a link (the presentation in the cloud; the surveys: not quizzes nor activities).
  const doc = cd.cloudDoc(), canLater = !!doc && ['owner', 'edit'].includes(doc.role);
  const later = () => { const k = q('.pl-kind').value, ok = ASYNC_KINDS.includes(k), on = q('.pl-async').checked;
    q('.pl-later').hidden = !ok; q('.pl-async').disabled = !canLater;
    q('.pl-later-help').textContent = !canLater ? t('Para esto, guárdala en tu nube de Revela.') : on ? t('Comparte el enlace: cada persona responde desde su móvil u ordenador. El enlace funciona en cuanto se guarde la presentación; trae las respuestas para verlas aquí y al presentar.') : '';
    q('.pl-later-link').hidden = q('.pl-later-get').hidden = !(canLater && on);
    if (canLater) q('.pl-link').value = cd.pollLink(doc.id, b.pollId); };
  q('.pl-async').addEventListener('change', later);
  q('.pl-copy').addEventListener('click', e => { navigator.clipboard?.writeText(q('.pl-link').value); e.target.textContent = t('Copiado'); });
  const bring = async () => { if (!canLater || !b.async) return;
    try { const r = await cd.pollVotes(doc.id, b.pollId), n = mergeVotes(b.pollId, r.votes); q('.pl-got').textContent = t('{n} respuestas por enlace').replace('{n}', n); count(); setPoll(b.id, {}); }
    catch { q('.pl-got').textContent = t('No se pudieron traer.'); } };
  q('.pl-get').addEventListener('click', bring);
  // The open answers kept here, marked by the AI against the criteria.
  q('.pl-grade').addEventListener('click', async () => {
    const V = savedVotes(b.pollId), list = Object.keys(V).filter(k => V[k]?.t).map(k => ({ id: k, text: V[k].t }));
    if (!list.length) { q('.pl-graded').textContent = t('Aún no hay respuestas.'); return; }
    const { gradeOpen } = await import('../../features/ai/authoring.js'), { run } = await import('./ai.js');
    const marks = await run(() => gradeOpen(q('.pl-q').value.trim(), q('.pl-rubric').value.trim(), list)); if (!marks) return;
    const by = Object.fromEntries(marks.map(m => [m.id, m])), e = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    q('.pl-graded').innerHTML = list.map(a => `<div style="padding:6px 0;border-top:1px solid var(--line)"><b>${by[a.id] ? by[a.id].score + '/10' : '—'}</b> ${e(a.text)}${by[a.id] ? `<div class="host-help">${e(by[a.id].feedback)}</div>` : ''}</div>`).join('');
  });
  q('.pl-kind').addEventListener('change', () => { sync(); later(); }); sync(); count(); later(); bring();
  q('.pl-ink').addEventListener('input', () => { q('.pl-ink-auto').checked = false; });
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.pl-ok').addEventListener('click', () => {
    const lines = q('.pl-opts').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, q('.pl-kind').value === 'wheel' ? 27 : ACTIVITIES.includes(q('.pl-kind').value) ? 20 : 10);
    // (Quiz: "*" marks the right answers.)
    const correct = lines.map((l, i) => (l.startsWith('*') ? i : -1)).filter(i => i >= 0), options = lines.map(l => l.replace(/^\*\s*/, ''));
    const kind = q('.pl-kind').value;
    setPoll(b.id, { question: q('.pl-q').value.trim(), kind, display: q('.pl-disp').value, options: options.length ? options : b.options,
      async: ASYNC_KINDS.includes(kind) && q('.pl-async').checked ? true : null,
      moderate: kind === 'qa' && q('.pl-mod').checked ? true : null, clean: ['qa', 'word', 'open'].includes(kind) && q('.pl-clean').checked ? true : null,
      color: q('.pl-ink-auto').checked ? null : q('.pl-ink').value,
      ...(kind === 'quiz' && { correct: correct.length ? correct : [0], time: +q('.pl-time').value, mode: q('.pl-mode').value === 'speed' ? null : q('.pl-mode').value }),
      ...(kind === 'gaps' && { text: q('.pl-text').value.trim() }),
      ...(kind === 'wheel' && { time: Math.max(0, Math.min(3600, Math.round(+q('.pl-wtime').value) || 0)) }),
      ...(kind === 'label' && { image, points: options.map((_, i) => points[i] || { x: 50, y: 50 }) }),
      ...(kind === 'point' && { image }), ...(kind === 'draw' && { image: image || null }),
      ...(kind === 'image' && { images: options.map((_, i) => images[i] || '') }),
      ...(kind === 'open' && { rubric: q('.pl-rubric').value.trim() || null }),
      ...(kind === 'number' && (() => { const num = sel => { const v = q(sel).value.trim().replace(',', '.'); return v === '' || !isFinite(+v) ? null : +v; };
        let lo = num('.pl-min') ?? 0, hi = num('.pl-max') ?? 100; if (hi <= lo) hi = lo + 1;
        return { min: lo, max: hi, unit: q('.pl-unit').value.trim() || null, answer: num('.pl-ans') }; })()) });
    // (The teams are the presentation's: all its quizzes.)
    if (kind === 'quiz' || kind === 'board') { const teams = q('.pl-teams').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 8);
      if (JSON.stringify(teams) !== JSON.stringify(state.deck.teams || [])) commit(() => { if (teams.length) state.deck.teams = teams; else delete state.deck.teams; }); }
    applied = true; close();
  });
  q('.pl-clear').addEventListener('click', async () => {
    if (!(await confirmDialog(t('¿Borrar los votos recibidos en esta votación?')))) return;
    clearVotes(b.pollId); setPoll(b.id, {}); count(); if (q('.pl-kind').value === 'audio') listen();
  });
  q('.pl-csv').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + votesCSV(b)], { type: 'text/csv' }));
    a.download = 'votacion.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}
