// The class gradebook («Ver ▸ Cuaderno de clase», io/gradebook.js): each group's report for a term or any dates
// (sessions saved from «Resultados del aula» and marks given with a rubric), the rubrics, and the groups.

import { esc } from '../../core/text.js';
import * as gb from '../../io/gradebook.js';
import { addTableRows } from '../../features/document/blocks.js';
import { t, currentLang } from '../../i18n/index.js';
import { confirmDialog, promptDialog, alertDialog } from './dialog.js';
import { toast } from '../shell/toast.js';

const day = ts => new Date(ts).toLocaleDateString(currentLang(), { day: 'numeric', month: 'short' });
const iso = ts => new Date(ts - new Date(ts).getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const TERMS = () => [['t1', t('1.er trimestre')], ['t2', t('2.º trimestre')], ['t3', t('3.er trimestre')], ['year', t('Todo el curso')], ['custom', t('Otras fechas…')]];
const rubricWords = () => ({ levels: [t('Excelente'), t('Bien'), t('Suficiente'), t('Insuficiente')], criteria: [t('Contenido'), t('Organización'), t('Presentación oral')] });

let tab = 'report', groupId = null, period = 't1', custom = null;

export function openGradebook(start = {}) {
  if (start.tab) tab = start.tab;
  document.getElementById('gb-modal')?.remove();
  const back = document.createElement('div'); back.id = 'gb-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal gb" style="text-align:start;width:min(900px,96vw);max-width:none"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button>
    <h3>${t('Cuaderno de clase')}</h3>
    <div class="gb-tabs" role="tablist">${[['report', t('Informe')], ['rubrics', t('Rúbricas')], ['groups', t('Grupos')]].map(([k, l]) => `<button type="button" class="mini2" data-tab="${k}" role="tab">${l}</button>`).join('')}</div>
    <div class="gb-body"></div>
    <p class="host-help" style="font-size:12px">${t('Se guarda en este navegador: los nombres que escribe el alumnado y sus puntos no salen de aquí.')}</p></div>`;
  document.body.appendChild(back);
  const close = () => back.remove(), body = back.querySelector('.gb-body');
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.gb-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; paint(); } });
  const paint = () => {
    back.querySelectorAll('.gb-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    const gs = gb.groups(); if (!gs.some(g => g.id === groupId)) groupId = gs[0]?.id || null;
    ({ report: paintReport, rubrics: paintRubrics, groups: paintGroups, grade: paintGrade })[tab](body, paint, start);
  };
  paint();
  return back;
}

const groupSelect = () => `<select class="gb-group">${gb.groups().map(g => `<option value="${g.id}"${g.id === groupId ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select>`;
const noGroups = () => `<p class="host-help">${t('Todavía no hay grupos. Crea uno en «Grupos», o guarda los resultados de una clase desde Ver ▸ Resultados del público.')}</p>`;

// ---- Report: students × sessions in a period ------------------------------------------------------
// What the class finds hardest in the period: the questions and criteria with the lowest average, as bars.
function hardest(items) {
  const top = items.filter(x => x.pct < 0.999).slice(0, 8); if (!top.length) return '';
  return `<details class="gb-hard" open><summary>${t('Lo que más le cuesta al grupo')}</summary><ol>${top.map(x => { const pc = Math.round(x.pct * 100);
    return `<li><span title="${esc(x.session)}">${esc(x.label)}</span><i style="--w:${pc}%;--c:${pc < 50 ? '#c0392b' : pc < 75 ? '#d89e00' : '#26890c'}"></i><b>${pc} %</b></li>`; }).join('')}</ol></details>`;
}
function paintReport(body, paint) {
  if (!gb.groups().length) { body.innerHTML = noGroups(); return; }
  const T = gb.terms(), range = period === 'custom' ? (custom || { from: T[0].from, to: Date.now() }) : T.find(x => x.id === period);
  const rep = gb.report(groupId, range);
  body.innerHTML = `<div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap;gap:8px">
      <label class="fr-l">${t('Grupo')} ${groupSelect()}</label>
      <label class="fr-l">${t('Periodo')} <select class="gb-period">${TERMS().map(([k, l]) => `<option value="${k}"${k === period ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      ${period === 'custom' ? `<label class="fr-l">${t('Desde')} <input type="date" class="gb-from" value="${iso(range.from)}"></label><label class="fr-l">${t('Hasta')} <input type="date" class="gb-to" value="${iso(range.to)}"></label>` : ''}</div>
    ${!rep.sessions.length ? `<p class="host-help">${t('No hay sesiones en este periodo.')}</p>` : `<div class="cr-wrap"><table class="cr-table gb-table"><thead><tr><th>${t('Alumno')}</th>
      ${rep.sessions.map(s => `<th title="${esc(s.title)}"><span class="gb-th">${esc(day(s.date))}</span><small>${esc(s.title.slice(0, 18))}${s.kind === 'rubric' ? ' ▦' : ''}</small><button type="button" class="gb-del" data-s="${s.id}" aria-label="${t('Quitar esta sesión')}">✕</button></th>`).join('')}
      <th>${t('Nota')}</th><th>${t('Participación')}</th></tr></thead>
      <tbody>${rep.students.map(st => `<tr><td><button type="button" class="gb-st" data-k="${esc(st.key)}">${esc(st.name || t('Sin apodo'))}</button>${st.key.startsWith('n:') ? ''
        : `<button type="button" class="gb-ad${gb.adaptations()[st.key] ? ' on' : ''}" data-k="${esc(st.key)}" title="${t('Adaptaciones')}" aria-label="${t('Adaptaciones')}"><i class="ms">accessibility_new</i></button>`}</td>
        ${rep.sessions.map(s => `<td>${s.pct[st.key] == null ? '—' : (Math.round(s.pct[st.key] * 100) / 10).toLocaleString(currentLang())}</td>`).join('')}
        <td><b>${st.mark == null ? '—' : st.mark.toLocaleString(currentLang())}</b></td><td>${st.done}/${st.of}</td></tr>`).join('')}</tbody></table></div>`}
    ${hardest(gb.itemReport(groupId, range))}
    <div class="fr-actions"><span class="host-help" style="margin:0">${t('Notas sobre 10. Clic en un alumno para cambiarle el nombre o unirlo con otro (el mismo alumno en otro dispositivo).')}</span>
      <button type="button" class="mini2 gb-grade">${t('Evaluar con una rúbrica')}</button><button type="button" class="fr-do gb-csv"${rep.sessions.length ? '' : ' disabled'}>${t('Descargar CSV')}</button></div>`;
  body.querySelector('.gb-group').addEventListener('change', e => { groupId = e.target.value; paint(); });
  body.querySelector('.gb-period').addEventListener('change', e => { period = e.target.value; paint(); });
  body.querySelector('.gb-from')?.addEventListener('change', e => { custom = { ...range, from: new Date(e.target.value).getTime() }; paint(); });
  body.querySelector('.gb-to')?.addEventListener('change', e => { custom = { ...range, to: new Date(e.target.value).getTime() + 864e5 - 1 }; paint(); });
  body.querySelectorAll('.gb-del').forEach(b => b.addEventListener('click', async () => { if (await confirmDialog(t('¿Quitar esta sesión del cuaderno?'), { ok: t('Quitar'), danger: true })) { gb.deleteSession(b.dataset.s); paint(); } }));
  body.querySelectorAll('.gb-st').forEach(b => b.addEventListener('click', async () => {
    const others = rep.students.filter(x => x.key !== b.dataset.k);
    const name = await promptDialog(t('Nombre del alumno') + (others.length ? ` — ${t('o escribe el de otro alumno de la lista para unirlos')}` : ''), b.textContent);
    if (name == null || !name.trim()) return;
    const same = others.find(x => (x.name || '').trim().toLowerCase() === name.trim().toLowerCase());
    if (same && await confirmDialog(t('¿Unir a los dos alumnos? Sus puntos pasan a ser los de una misma persona.'), { ok: t('Unir') })) gb.mergeStudents(groupId, b.dataset.k, same.key);
    else gb.renameStudent(groupId, b.dataset.k, name);
    paint();
  }));
  body.querySelectorAll('.gb-ad').forEach(b => b.addEventListener('click', () => openAdaptation(b.dataset.k, rep.students.find(x => x.key === b.dataset.k)?.name || t('Sin apodo'), paint)));
  body.querySelector('.gb-grade').addEventListener('click', () => { tab = 'grade'; paint(); });
  body.querySelector('.gb-csv').addEventListener('click', () => download(`cuaderno-${(gb.groups().find(g => g.id === groupId)?.name || 'grupo').replace(/[^\w-]+/g, '-')}.csv`,
    gb.reportCSV(rep, { student: t('Alumno'), mark: t('Nota (0-10)'), done: t('Participación'), none: t('Sin apodo') })));
}

// One student's accommodations (Wayground's): applied to their phone in live quizzes and activities.
function openAdaptation(key, name, paint) {
  document.getElementById('adapt-modal')?.remove();
  const a = gb.adaptations()[key] || {}, back = document.createElement('div'); back.id = 'adapt-modal'; back.className = 'modal-backdrop';
  const chk = (k, l) => `<label class="fr-chk"><input type="checkbox" data-k="${k}"${a[k] ? ' checked' : ''}> ${t(l)}</label>`;
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(460px,94vw)"><button class="modal-close">✕</button><h3>${t('Adaptaciones')}: ${esc(name)}</h3>
    <p class="host-help">${t('Se aplican a su móvil en los cuestionarios y actividades en directo, en esta y en las demás presentaciones que presentes desde este navegador.')}</p>
    <label class="fr-l">${t('Tiempo para responder')}<select class="ad-time"><option value="1">${t('El de todos')}</option><option value="1.5"${a.time === 1.5 ? ' selected' : ''}>× 1,5</option><option value="2"${a.time === 2 ? ' selected' : ''}>× 2</option></select></label>
    ${chk('fewer', 'Una opción incorrecta menos en los cuestionarios')}${chk('read', 'Leerle la pregunta en voz alta en su móvil')}${chk('big', 'Letra más grande en su móvil')}${chk('noRank', 'Sin clasificación: no sale en la de la pantalla ni ve su puesto')}
    <div class="fr-actions"><button class="mini2 ad-cancel">${t('Cancelar')}</button><button class="fr-do ad-ok">${t('Guardar')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove(), q = s => back.querySelector(s);
  q('.modal-close').addEventListener('click', close); q('.ad-cancel').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.ad-ok').addEventListener('click', () => {
    const v = { time: +q('.ad-time').value }; back.querySelectorAll('input[data-k]').forEach(x => { v[x.dataset.k] = x.checked; });
    gb.setAdaptation(key, v); close(); paint();
  });
}

// ---- Grading with a rubric ----------------------------------------------------------------------
function paintGrade(body, paint) {
  const rs = gb.rubrics();
  if (!gb.groups().length) { body.innerHTML = noGroups(); return; }
  if (!rs.length) { body.innerHTML = `<p class="host-help">${t('Primero crea una rúbrica en la pestaña «Rúbricas».')}</p>`; return; }
  const rub = rs.find(r => r.id === body.dataset.rubric) || rs[0]; body.dataset.rubric = rub.id;
  const rep = gb.report(groupId), students = rep.students.map(s => ({ key: s.key, name: s.name }));
  const extra = JSON.parse(body.dataset.extra || '[]');
  const all = [...students, ...extra];
  body.innerHTML = `<div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap;gap:8px">
      <label class="fr-l">${t('Grupo')} ${groupSelect()}</label>
      <label class="fr-l">${t('Rúbrica')} <select class="gb-rub">${rs.map(r => `<option value="${r.id}"${r.id === rub.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
      <label class="fr-l">${t('Qué se evalúa')} <input type="text" class="gb-title" value="${esc(body.dataset.title || rub.name)}"></label>
      <label class="fr-l">${t('Fecha')} <input type="date" class="gb-date" value="${body.dataset.date || iso(Date.now())}"></label></div>
    <div class="cr-wrap"><table class="cr-table gb-table"><thead><tr><th>${t('Alumno')}</th>${rub.criteria.map(c => `<th>${esc(c.name)}</th>`).join('')}</tr></thead>
      <tbody>${all.map((st, r) => `<tr data-k="${esc(st.key)}"><td>${esc(st.name || t('Sin apodo'))}</td>${rub.criteria.map((c, i) => `<td><select data-c="${i}" aria-label="${esc(c.name)}"><option value="">—</option>${c.levels.map((l, j) => `<option value="${j}" title="${esc(l.desc)}">${esc(l.label)} (${l.pts})</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="fr-actions"><button type="button" class="mini2 gb-add">${t('Añadir un alumno')}</button><button type="button" class="mini2 gb-back">${t('Volver al informe')}</button><button type="button" class="fr-do gb-save">${t('Guardar las notas')}</button></div>`;
  const keep = () => { body.dataset.title = body.querySelector('.gb-title').value; body.dataset.date = body.querySelector('.gb-date').value; };
  body.querySelector('.gb-group').addEventListener('change', e => { groupId = e.target.value; body.dataset.extra = '[]'; paint(); });
  body.querySelector('.gb-rub').addEventListener('change', e => { keep(); body.dataset.rubric = e.target.value; body.dataset.title = ''; paint(); });
  body.querySelector('.gb-add').addEventListener('click', async () => { keep(); const n = await promptDialog(t('Nombre del alumno'), ''); if (!n?.trim()) return;
    body.dataset.extra = JSON.stringify([...extra, { key: gb.newStudentKey(n), name: n.trim() }]); paint(); });
  body.querySelector('.gb-back').addEventListener('click', () => { tab = 'report'; paint(); });
  body.querySelector('.gb-save').addEventListener('click', () => {
    const marks = {};
    body.querySelectorAll('tbody tr').forEach(tr => { const lv = [...tr.querySelectorAll('select')].map(s => (s.value === '' ? null : +s.value)); if (lv.some(v => v != null)) marks[tr.dataset.k] = lv; });
    if (!Object.keys(marks).length) return alertDialog(t('Elige al menos un nivel para algún alumno.'));
    gb.saveRubricSession(groupId, rub, { title: body.querySelector('.gb-title').value, date: new Date(body.querySelector('.gb-date').value + 'T12:00').getTime(),
      marks, newNames: Object.fromEntries(extra.map(x => [x.key, x.name])) });
    toast(t('Notas guardadas en el cuaderno')); body.dataset.extra = '[]'; tab = 'report'; paint();
  });
}

// ---- Rubrics: make, edit, put on a slide ------------------------------------------------------------
function paintRubrics(body, paint) {
  const rs = gb.rubrics(), cur = rs.find(r => r.id === body.dataset.edit) || (body.dataset.edit === 'new' ? gb.defaultRubric(t('Rúbrica'), rubricWords()) : null);
  if (!cur) {
    body.innerHTML = `${rs.length ? `<ul class="gb-list">${rs.map(r => `<li><b>${esc(r.name)}</b> <small>${r.criteria.length} ${t('criterios')}</small>
        <span><button type="button" class="mini2" data-e="${r.id}">${t('Editar')}</button><button type="button" class="mini2" data-i="${r.id}">${t('Insertar en una diapositiva')}</button><button type="button" class="mini2" data-d="${r.id}">${t('Borrar')}</button></span></li>`).join('')}</ul>`
      : `<p class="host-help">${t('Una rúbrica dice qué se valora (criterios) y qué es cada nivel. Sirve para evaluar a cada alumno y para enseñarla a la clase en una diapositiva.')}</p>`}
      <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do gb-new">${t('Nueva rúbrica')}</button></div>`;
    body.querySelector('.gb-new').addEventListener('click', () => { body.dataset.edit = 'new'; paint(); });
    body.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => { body.dataset.edit = b.dataset.e; paint(); }));
    body.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { const r = rs.find(x => x.id === b.dataset.i); addTableRows(gb.rubricRows(r)); document.getElementById('gb-modal')?.remove(); toast(t('Rúbrica insertada')); }));
    body.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', async () => { if (await confirmDialog(t('¿Borrar la rúbrica? Las notas ya guardadas con ella se quedan.'), { ok: t('Borrar'), danger: true })) { gb.deleteRubric(b.dataset.d); paint(); } }));
    return;
  }
  const levels = cur.criteria[0]?.levels || [];
  body.innerHTML = `<label class="fr-l">${t('Nombre')} <input type="text" class="gb-rname" value="${esc(cur.name)}"></label>
    <div class="cr-wrap"><table class="cr-table gb-rtable"><thead><tr><th>${t('Criterio')}</th>${levels.map((l, j) => `<th><input type="text" class="gb-lv" data-j="${j}" value="${esc(l.label)}" aria-label="${t('Nivel')}"><input type="number" class="gb-pts" data-j="${j}" value="${l.pts}" min="0" step="0.5" aria-label="${t('Puntos')}"></th>`).join('')}<th></th></tr></thead>
      <tbody>${cur.criteria.map((c, i) => `<tr><td><input type="text" class="gb-cn" value="${esc(c.name)}" aria-label="${t('Criterio')}"></td>${levels.map((_, j) => `<td><textarea rows="3" class="gb-desc" data-j="${j}" placeholder="${t('Qué se ve en este nivel')}">${esc(c.levels[j]?.desc || '')}</textarea></td>`).join('')}<td><button type="button" class="mini2 gb-rm" data-r="${i}" aria-label="${t('Quitar el criterio')}">✕</button></td></tr>`).join('')}</tbody></table></div>
    <div class="fr-actions"><button type="button" class="mini2 gb-addc">${t('Añadir un criterio')}</button><button type="button" class="mini2 gb-cancel">${t('Cancelar')}</button><button type="button" class="fr-do gb-rsave">${t('Guardar')}</button></div>`;
  const read = () => {
    const ls = [...body.querySelectorAll('.gb-lv')].map((x, j) => ({ label: x.value, pts: +body.querySelector(`.gb-pts[data-j="${j}"]`).value || 0 }));
    return { id: cur.id, name: body.querySelector('.gb-rname').value, criteria: [...body.querySelectorAll('tbody tr')].map(tr => ({ name: tr.querySelector('.gb-cn').value,
      levels: ls.map((l, j) => ({ ...l, desc: tr.querySelector(`.gb-desc[data-j="${j}"]`).value })) })) };
  };
  body.querySelector('.gb-addc').addEventListener('click', () => { const r = read(); r.criteria.push({ name: t('Criterio'), levels: r.criteria[0].levels.map(l => ({ ...l, desc: '' })) });
    const saved = gb.saveRubric(r); body.dataset.edit = saved.id; paint(); });
  body.querySelectorAll('.gb-rm').forEach(b => b.addEventListener('click', () => { const r = read(); r.criteria.splice(+b.dataset.r, 1); if (!r.criteria.length) return; const saved = gb.saveRubric(r); body.dataset.edit = saved.id; paint(); }));
  body.querySelector('.gb-cancel').addEventListener('click', () => { body.dataset.edit = ''; paint(); });
  body.querySelector('.gb-rsave').addEventListener('click', () => { gb.saveRubric(read()); body.dataset.edit = ''; toast(t('Rúbrica guardada')); paint(); });
}

// ---- Groups -----------------------------------------------------------------------------------
function paintGroups(body, paint) {
  const gs = gb.groups();
  body.innerHTML = `${gs.length ? `<ul class="gb-list">${gs.map(g => `<li><b>${esc(g.name)}</b><span><button type="button" class="mini2" data-r="${g.id}">${t('Cambiar nombre')}</button><button type="button" class="mini2" data-d="${g.id}">${t('Borrar')}</button></span></li>`).join('')}</ul>` : ''}
    <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do gb-addg">${t('Nuevo grupo')}</button></div>`;
  body.querySelector('.gb-addg').addEventListener('click', async () => { const n = await promptDialog(t('Nombre del grupo (por ejemplo, 3.º A)'), ''); if (n?.trim()) { groupId = gb.addGroup(n).id; paint(); } });
  body.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', async () => { const g = gs.find(x => x.id === b.dataset.r); const n = await promptDialog(t('Nombre del grupo (por ejemplo, 3.º A)'), g.name); if (n?.trim()) { gb.renameGroup(g.id, n); paint(); } }));
  body.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', async () => { if (await confirmDialog(t('¿Borrar el grupo y todas sus sesiones? No se puede deshacer.'), { ok: t('Borrar'), danger: true })) { gb.deleteGroup(b.dataset.d); paint(); } }));
}

// From «Resultados del aula»: this presentation's results into a group's gradebook.
export async function saveToGradebook({ polls, rows, title }) {
  let gs = gb.groups(), gid = gs.length === 1 ? gs[0].id : null;
  if (!gs.length) { const n = await promptDialog(t('Nombre del grupo (por ejemplo, 3.º A)'), ''); if (!n?.trim()) return false; gid = gb.addGroup(n).id; }
  if (!gid) {
    const names = gs.map((g, i) => `${i + 1}. ${g.name}`).join('\n');
    const n = await promptDialog(`${t('¿En qué grupo? Escribe su número o un nombre nuevo:')}\n${names}`, '1'); if (n == null || !n.trim()) return false;
    gid = gs[+n - 1]?.id || gs.find(g => g.name.toLowerCase() === n.trim().toLowerCase())?.id || gb.addGroup(n).id;
  }
  gb.saveQuizSession(gid, { title, polls, rows }); groupId = gid;
  toast(t('Guardado en el cuaderno de clase'), { action: { label: t('Ver el informe'), run: () => openGradebook({ tab: 'report' }) } });
  return true;
}
