// IA ▸ «Plan de clase y guía»: a lesson plan for the teacher or a study guide for the pupils, from the presentation
// (features/ai/lessonplan.js). Seen here, then copied, downloaded (.html — opens in Word or LibreOffice —, .md), or
// put into the presentation: the plan in the notes of its slides, the guide as slides at the end.

import { state } from '../../core/store.js';
import * as lp from '../../features/ai/lessonplan.js';
import { download, slug } from '../../io/files.js';
import { t } from '../../i18n/index.js';
import { run } from './ai.js';
import { toast } from '../shell/toast.js';

let last = null;                                         // (the last one made, while the editor is open)

export function openLessonPlan() {
  document.getElementById('lp-modal')?.remove();
  const back = document.createElement('div'); back.id = 'lp-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(760px,96vw);max-width:none"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button>
    <h3>${t('Plan de clase y guía de estudio')}</h3>
    <p class="host-help">${t('La IA lee las diapositivas, las notas y los cuestionarios y escribe el documento en el idioma de la presentación. Revísalo antes de usarlo.')}</p>
    <fieldset style="margin:4px 0 8px"><legend>${t('Qué quieres')}</legend>
      <label class="fr-chk"><input type="radio" name="lp-kind" value="plan" checked> ${t('Plan de clase (para el docente): objetivos, tiempos por diapositiva, actividades, atención a la diversidad y evaluación')}</label>
      <label class="fr-chk"><input type="radio" name="lp-kind" value="guide"> ${t('Guía de estudio (para el alumnado): resumen, términos clave y preguntas con las soluciones al final')}</label></fieldset>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <label class="fr-l" style="flex:1;min-width:180px">${t('Curso o nivel (opcional)')}<input type="text" class="lp-level" maxlength="120" placeholder="${t('p. ej.: 2.º de ESO')}"></label>
      <label class="fr-l lp-only-plan" style="width:130px">${t('Duración (min)')}<input type="number" class="lp-min" min="10" max="600" step="5" value="55"></label>
      <label class="fr-l lp-only-guide" style="width:130px" hidden>${t('Preguntas')}<input type="number" class="lp-nq" min="3" max="20" value="8"></label></div>
    <label class="fr-l lp-only-plan">${t('Algo más que deba saber (opcional)')}<input type="text" class="lp-notes" maxlength="1000" placeholder="${t('p. ej.: grupo de 25, con dos alumnos con dislexia; trabajo en parejas')}"></label>
    <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do lp-go">✨ ${t('Crear')}</button></div>
    <div class="lp-out" hidden>
      <div class="lp-doc" style="max-height:min(46vh,460px);overflow:auto;border:1px solid var(--line,#ddd);border-radius:8px;padding:6px 14px;margin:8px 0;background:var(--panel,#fff)"></div>
      <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap">
        <button type="button" class="mini2 lp-copy"><i class="ms">content_copy</i> ${t('Copiar')}</button>
        <button type="button" class="mini2 lp-html"><i class="ms">download</i> ${t('Descargar .html')}</button>
        <button type="button" class="mini2 lp-md"><i class="ms">download</i> ${t('Descargar .md')}</button>
        <button type="button" class="mini2 lp-notes-add"><i class="ms">sticky_note_2</i> ${t('Añadir a las notas')}</button>
        <button type="button" class="mini2 lp-slides-add"><i class="ms">add_to_photos</i> ${t('Añadir como diapositivas')}</button></div></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  const kind = () => back.querySelector('input[name=lp-kind]:checked').value;
  const sync = () => { back.querySelectorAll('.lp-only-plan').forEach(x => { x.hidden = kind() !== 'plan'; }); back.querySelectorAll('.lp-only-guide').forEach(x => { x.hidden = kind() !== 'guide'; }); };
  back.querySelectorAll('input[name=lp-kind]').forEach(r => r.addEventListener('change', sync));
  q('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  const show = d => {
    last = d; q('.lp-out').hidden = false;
    q('.lp-doc').innerHTML = lp.docHTML(d, { page: false });            // (all of it escaped: features/ai/lessonplan.js)
    q('.lp-notes-add').hidden = d.kind !== 'plan' || !d.sections.some(x => x.slides.length);
    q('.lp-slides-add').hidden = d.kind !== 'guide';
  };
  if (last) { back.querySelector(`input[name=lp-kind][value="${last.kind}"]`).checked = true; sync(); show(last); } else sync();
  q('.lp-go').addEventListener('click', async () => {
    const level = q('.lp-level').value.trim();
    q('.lp-go').disabled = true;
    try {
      const d = await run(() => (kind() === 'plan' ? lp.lessonPlan({ minutes: +q('.lp-min').value, level, notes: q('.lp-notes').value.trim() }) : lp.studyGuide({ questions: +q('.lp-nq').value, level })));
      if (d && document.body.contains(back)) show(d);
    } finally { q('.lp-go').disabled = false; }
  });
  const name = () => `${slug(last.title || state.deck.name)}-${last.kind === 'plan' ? slug(t('Plan de clase')) : slug(t('Guía de estudio'))}`;
  q('.lp-copy').addEventListener('click', async () => {
    const html = lp.docHTML(last, { page: false }), text = lp.docMarkdown(last);
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(text);
      toast(t('Copiado: pégalo en tu procesador de textos.'));
    } catch { toast(t('No se pudo copiar.')); }
  });
  q('.lp-html').addEventListener('click', () => download(new Blob([lp.docHTML(last)], { type: 'text/html' }), name() + '.html'));
  q('.lp-md').addEventListener('click', () => download(new Blob([lp.docMarkdown(last)], { type: 'text/markdown' }), name() + '.md'));
  q('.lp-notes-add').addEventListener('click', () => { const n = lp.planToNotes(last); toast(t('Plan añadido a las notas de {n} diapositivas.').replace('{n}', n)); });
  q('.lp-slides-add').addEventListener('click', () => { const n = lp.guideToSlides(last); if (n) { toast(t('{n} diapositivas añadidas al final.').replace('{n}', n)); close(); } });
}
