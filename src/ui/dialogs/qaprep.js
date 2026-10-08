// Rehearse the audience's questions (IA ▸ «Preguntas del público»): the AI foresees what people may ask after this
// talk; pick one, answer it aloud (the browser's speech recognition writes it) or in writing, and the AI says how it
// went — what was good, what to improve and a better answer. Nothing is kept in the presentation.

import { esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import { goToSlide } from '../../features/document/slides.js';
import * as deck from '../../features/ai/authoring.js';
import { t, speechLang } from '../../i18n/index.js';
import { run } from './ai.js';

const KIND = { clarify: 'Aclarar', deeper: 'Ir más allá', critical: 'Crítica', practical: 'Práctica' };
let questions = null;                                   // (the last ones foreseen, while the editor is open)

export function openQaPrep() {
  document.getElementById('qa-modal')?.remove();
  const back = document.createElement('div'); back.id = 'qa-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal qa" style="text-align:start;width:min(720px,96vw);max-width:none"><button class="modal-close">✕</button>
    <h3>${t('Ensayar las preguntas del público')}</h3>
    <p class="host-help">${t('La IA prevé lo que te pueden preguntar al acabar, también lo difícil. Elige una, respóndela en voz alta o por escrito y te dice cómo ha ido.')}</p>
    <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do qa-go">${t('Prever las preguntas')}</button></div>
    <ol class="qa-list"></ol><div class="qa-practice" hidden></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  let rec = null;
  const stop = () => { try { rec?.stop(); } catch {} rec = null; };
  const close = () => { stop(); back.remove(); };
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  const list = () => {
    q('.qa-go').textContent = questions ? t('Otras preguntas') : t('Prever las preguntas');
    q('.qa-list').innerHTML = (questions || []).map((x, i) => `<li><button type="button" class="qa-q" data-i="${i}"><span class="qa-kind qa-${x.kind}">${esc(t(KIND[x.kind]))}</span>${esc(x.q)}</button></li>`).join('');
  };
  q('.qa-go').addEventListener('click', async () => {
    const got = await run(() => deck.predictQuestions(8)); if (!got) return;
    questions = got; q('.qa-practice').hidden = true; list();
  });
  q('.qa-list').addEventListener('click', e => { const b = e.target.closest('.qa-q'); if (b) practise(questions[+b.dataset.i]); });

  // One question: its key points (hidden until asked for), the answer — spoken or typed —, its time, and the judgement.
  function practise(x) {
    stop();
    const box = q('.qa-practice'), SR = window.SpeechRecognition || window.webkitSpeechRecognition; box.hidden = false;
    box.innerHTML = `<h4>${esc(x.q)}</h4>
      ${x.slide ? `<button type="button" class="mini2 qa-slide">${t('Ir a la diapositiva')} ${x.slide}</button>` : ''}
      <details><summary>${t('Lo que debería tener una buena respuesta')}</summary><ul>${x.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>
      <textarea class="qa-answer" rows="5" placeholder="${t('Escribe tu respuesta, o pulsa «Responder hablando»…')}"></textarea>
      <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap">
        ${SR ? `<button type="button" class="mini2 qa-mic"><i class="ms">mic</i> ${t('Responder hablando')}</button>` : ''}<span class="qa-time host-help"></span>
        <button type="button" class="fr-do qa-judge">${t('¿Qué tal mi respuesta?')}</button></div>
      <div class="qa-verdict"></div>`;
    box.querySelector('.qa-slide')?.addEventListener('click', () => goToSlide(x.slide - 1));
    const ta = box.querySelector('.qa-answer'), time = box.querySelector('.qa-time');
    let t0 = 0, tick = null;
    box.querySelector('.qa-mic')?.addEventListener('click', e => {
      const btn = e.currentTarget;
      if (rec) { stop(); return; }
      rec = new SR(); Object.assign(rec, { lang: speechLang(), continuous: true, interimResults: true });
      const before = ta.value ? ta.value.trim() + ' ' : '';
      rec.onresult = ev => { let txt = ''; for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript; ta.value = before + txt.trim(); };
      rec.onend = () => { rec = null; clearInterval(tick); btn.innerHTML = `<i class="ms">mic</i> ${t('Responder hablando')}`; btn.classList.remove('on'); };
      rec.onerror = ev => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') time.textContent = t('No se pudo usar el micrófono: escribe la respuesta.'); };
      try { rec.start(); } catch { rec = null; return; }
      t0 = Date.now(); clearInterval(tick);
      tick = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
      btn.innerHTML = `<i class="ms">stop</i> ${t('Parar')}`; btn.classList.add('on');
    });
    box.querySelector('.qa-judge').addEventListener('click', async () => {
      stop(); const answer = ta.value.trim(), out = box.querySelector('.qa-verdict');
      if (!answer) { out.innerHTML = `<p class="host-help">${t('Primero responde (hablando o por escrito).')}</p>`; return; }
      const v = await run(() => deck.judgeAnswer(x.q, x.points, answer)); if (!v) return;
      out.innerHTML = `<div class="qa-score" style="--c:${v.score >= 7 ? '#26890c' : v.score >= 5 ? '#b07d00' : '#c0392b'}"><b>${v.score}/10</b></div>
        <p><b>${t('Bien')}:</b> ${esc(v.good)}</p><p><b>${t('A mejorar')}:</b> ${esc(v.improve)}</p>
        <details open><summary>${t('Una respuesta mejor')}</summary><p>${esc(v.better)}</p></details>`;
    });
    box.scrollIntoView?.({ block: 'nearest' });
  }
  list();
  if (!questions && state.deck.slides.length) q('.qa-go').focus();
}
