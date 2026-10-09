// Question banks (io/formats/questions.js): import from Moodle XML, GIFT, Kahoot's spreadsheet or a CSV — first a
// preview of what was understood and what was skipped and why —, and export the quizzes and activities to them.
// Also «Fichas y práctica» (io/export/study.js): flashcards and practice as a page of their own.

import { state } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { readQuestionFile, QUESTION_ACCEPT, deckQuestions, toGIFT, toMoodleXML, toCSV, toKahootXlsx, kahootRows } from '../../io/formats/questions.js';
import { exportStudy, studyData } from '../../io/export/study.js';
import { insertQuizSlides } from '../../features/live/quizslides.js';
import { download, slug } from '../../io/files.js';
import { toast } from '../shell/toast.js';

const KIND = { quiz: 'Cuestionario', match: 'Actividad: unir parejas', gaps: 'Actividad: completar huecos', number: 'Adivinar un número', order: 'Actividad: ordenar', sort: 'Actividad: clasificar en grupos', label: 'Actividad: etiquetar una imagen' };
const LIST = 'max-height:30vh;overflow:auto;margin:6px 0;padding-inline-start:1.2em';
function modal(id, title, body) {
  document.getElementById(id)?.remove();
  const back = document.createElement('div'); back.id = id; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}-h" style="text-align:start;width:min(600px,94vw);max-width:94vw"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3 id="${id}-h">${title}</h3>${body}</div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  return { back, q: s => back.querySelector(s), close };
}
const leftList = left => (left.length ? `<p class="host-help"><b>${t('Lo que no va en este formato:')}</b></p><ul style="${LIST}">${left.map(x => `<li>${esc(x.name)} — <i>${esc(x.why)}</i></li>`).join('')}</ul>` : '');

export function openQuestionImport() {
  const { q, close } = modal('qbank-modal', t('Importar preguntas'), `
    <p class="host-help">${t('Cada pregunta, en una diapositiva nueva con su votación (cuestionario, unir parejas, completar huecos o número), detrás de la diapositiva actual.')}</p>
    <ul class="host-help" style="padding-inline-start:1.2em;margin:4px 0">
      <li><b>Moodle XML</b> (.xml): ${t('opción múltiple, verdadero/falso, emparejamiento, respuesta corta, numérica y huecos (cloze) de respuesta corta.')}</li>
      <li><b>GIFT</b> (.gift, .txt): ${t('el formato de texto de Moodle: =correcta ~incorrecta, {T}/{F}, parejas con ->, respuesta corta y numérica con #.')}</li>
      <li><b>Kahoot</b> (.xlsx): ${t('su plantilla de hoja de cálculo (pregunta, respuestas 1 a 4, tiempo y respuestas correctas).')}</li>
      <li><b>CSV</b> (.csv, .xlsx): ${t('una pregunta por fila: pregunta, respuesta correcta, incorrecta 1, incorrecta 2, incorrecta 3. Separado por comas o punto y coma; la primera fila puede ser de títulos. Solo con la correcta, es de respuesta corta (varias válidas separadas por |).')}</li>
    </ul>
    <div class="fr-actions" style="justify-content:flex-start"><label class="mini2"><i class="ms">upload_file</i> ${t('Elegir archivo…')}<input type="file" class="qb-file" accept="${QUESTION_ACCEPT}" hidden></label></div>
    <div class="qb-preview" aria-live="polite"></div>
    <div class="fr-actions"><span></span><button type="button" class="fr-do qb-go" disabled>${t('Insertar')}</button></div>`);
  let got = null;
  const preview = r => {
    const ok = r.items.length;
    q('.qb-preview').innerHTML = `<p><b>${esc(r.format)}</b> · ${t('{n} preguntas para importar').replace('{n}', ok)}${r.skipped.length ? ' · ' + t('{n} que no se importan').replace('{n}', r.skipped.length) : ''}</p>
      ${ok ? `<ol class="qb-items" style="${LIST}">${r.items.map(x => `<li><small>${esc(t(KIND[x.poll.kind] || x.poll.kind))}</small> — ${esc(x.poll.question)}${x.poll.kind === 'gaps' ? ` <i>${esc(x.poll.text)}</i>` : ''}${x.warn.map(w => `<br><small class="host-help">⚠ ${esc(w)}</small>`).join('')}</li>`).join('')}</ol>` : ''}
      ${r.skipped.length ? `<p class="host-help"><b>${t('No se importan:')}</b></p><ul class="qb-skipped" style="${LIST}">${r.skipped.map(x => `<li>${esc(x.name)} — <i>${esc(x.why)}</i></li>`).join('')}</ul>` : ''}`;
    q('.qb-go').disabled = !ok; q('.qb-go').textContent = ok ? t('Insertar {n} diapositivas').replace('{n}', ok) : t('Insertar');
  };
  q('.qb-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { got = await readQuestionFile(f); preview(got); }
    catch (err) { got = null; q('.qb-go').disabled = true; q('.qb-preview').innerHTML = `<p class="host-help">⚠ ${esc(t('No se pudo leer ese archivo de preguntas.'))} ${esc(err.message || '')}</p>`; }
  });
  q('.qb-go').addEventListener('click', () => {
    if (!got?.items.length) return;
    const n = insertQuizSlides(got.items); close();
    toast(t('{n} preguntas insertadas, cada una en su diapositiva.').replace('{n}', n));
  });
  return { preview, q };
}

const FORMATS = { moodle: ['Moodle XML', '.xml'], gift: ['GIFT', '.gift.txt'], kahoot: ['Kahoot (.xlsx)', '.xlsx'], csv: ['CSV', '.csv'] };
export async function questionFile(format, list = deckQuestions(state.deck)) {
  if (format === 'kahoot') { const r = await toKahootXlsx(list); return { ...r, name: slug(state.deck.name) + '-kahoot.xlsx' }; }
  const r = format === 'gift' ? toGIFT(list) : format === 'csv' ? toCSV(list) : toMoodleXML(list);
  const type = format === 'moodle' ? 'application/xml' : format === 'csv' ? 'text/csv' : 'text/plain';
  return { ...r, blob: r.count ? new Blob([format === 'csv' ? '\ufeff' + r.text : r.text], { type: type + ';charset=utf-8' }) : null, name: slug(state.deck.name) + FORMATS[format][1] };
}
export function openQuestionExport() {
  const list = deckQuestions(state.deck);
  const { q, close } = modal('qbank-out-modal', t('Exportar preguntas'), `
    <p class="host-help">${t('Los cuestionarios y actividades de la presentación ({n}), para un banco de preguntas de Moodle, Kahoot u otra herramienta.').replace('{n}', list.length)}</p>
    <div role="radiogroup" aria-label="${t('Formato')}">${Object.entries(FORMATS).map(([k, [name]], i) => `<label class="fr-chk"><input type="radio" name="qbf" value="${k}"${i ? '' : ' checked'}> ${name}</label>`).join('')}</div>
    <div class="qbo-sum" aria-live="polite"></div>
    <div class="fr-actions"><span></span><button type="button" class="fr-do qbo-go">${t('Exportar')}</button></div>`);
  const fmt = () => q('input[name=qbf]:checked').value;
  const sum = () => {
    const f = fmt(), r = f === 'kahoot' ? kahootRows(list) : f === 'gift' ? toGIFT(list) : f === 'csv' ? toCSV(list) : toMoodleXML(list);
    q('.qbo-sum').innerHTML = `<p>${t('{n} preguntas en este formato.').replace('{n}', r.count)}</p>${leftList(r.left)}`;
    q('.qbo-go').disabled = !r.count;
  };
  q('[role=radiogroup]').addEventListener('change', sum); sum();
  q('.qbo-go').addEventListener('click', async () => {
    q('.qbo-go').disabled = true;
    try { const r = await questionFile(fmt(), list); if (r.blob) download(r.blob, r.name); close(); toast(t('Preguntas exportadas: {n}.').replace('{n}', r.count)); }
    catch (e) { q('.qbo-go').disabled = false; toast(String(e.message || e), { error: true }); }
  });
}

export function openStudyExport() {
  const { q, close } = modal('study-modal', t('Fichas y práctica'), `
    <p class="host-help">${t('Una página web para estudiar por tu cuenta, también sin internet y en el móvil: fichas para darles la vuelta (recuerda cuáles sabes) y práctica de los cuestionarios y actividades, con la respuesta al momento y la nota al final.')}</p>
    <label class="fr-chk"><input type="checkbox" class="st-cards" checked> ${t('Fichas')}</label>
    <label class="fr-chk"><input type="checkbox" class="st-practice" checked> ${t('Practicar las preguntas')}</label>
    <label class="fr-chk"><input type="checkbox" class="st-slides"> ${t('Una ficha más por diapositiva: su título delante y su texto detrás')}</label>
    <p class="host-help st-sum" aria-live="polite"></p>
    <div class="fr-actions"><span></span><button type="button" class="fr-do st-go">${t('Descargar')}</button></div>`);
  const opts = () => ({ cards: q('.st-cards').checked, practice: q('.st-practice').checked, slides: q('.st-slides').checked });
  const sum = () => { const o = opts(), d = studyData(state.deck, o);
    q('.st-sum').textContent = t('{c} fichas y {p} preguntas para practicar.').replace('{c}', d.cards.length).replace('{p}', d.items.length) + (d.cards.length || d.items.length ? '' : ' ' + t('Añade cuestionarios o actividades (Insertar ▸ Votación en directo) o marca las diapositivas.'));
    q('.st-go').disabled = !d.cards.length && !d.items.length; };
  q('.modal').addEventListener('change', sum); sum();
  q('.st-go').addEventListener('click', () => { const n = exportStudy(state.deck, opts()); close(); if (n) toast(t('Página de estudio descargada: se abre con cualquier navegador, también sin conexión.'), { ms: 8000 }); });
}
