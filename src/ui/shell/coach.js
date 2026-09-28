// Speaker coach: present while rehearsing; the browser's speech recognition
// listens and a small panel shows the pace and filler words live. At the end,
// a report (pace per slide, fillers, repeated expressions, slides read word
// for word) with the option to keep the timings.

import { state } from '../../core/store.js';
import { session } from '../../core/session.js';
import { present, applyRehearsal } from './present.js';
import { analyzeRehearsal, countFillers, recentPace, PACE } from '../../features/live/coach.js';
import { t, currentLang, speechLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from '../dialogs/dialog.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const plain = html => String(html || '').replace(/<(br|\/div|\/p|\/li)[^>]*>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

export async function startCoach() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alertDialog(t('Este navegador no tiene reconocimiento de voz: el entrenador funciona en Chrome, Edge y Safari.'));
  if (!(await confirmDialog(t('El entrenador escucha mientras ensayas para medir tu ritmo y tus muletillas. Usa el reconocimiento de voz del navegador: en Chrome y Edge el audio se envía a su servicio de voz. ¿Empezar?')))) return;
  const lang = currentLang(), segments = [], t0 = performance.now();
  let on = true, interim = '', fillers = 0, hint = '', hintUntil = 0;
  const rec = new SR();
  Object.assign(rec, { lang: speechLang(), continuous: true, interimResults: true });
  rec.onresult = e => {
    interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i], text = r[0].transcript;
      if (!r.isFinal) { interim += text; continue; }
      segments.push({ text, t: performance.now() - t0, slide: session.present?.current?.() ?? 0 });
      const f = Object.keys(countFillers(text, lang));
      if (f.length) { fillers += f.length; hint = `${t('Muletilla')}: «${f.join('», «')}»`; hintUntil = performance.now() + 3000; }
    }
    paint();
  };
  rec.onend = () => { if (on) try { rec.start(); } catch {} };
  rec.onerror = e => {
    if (e.error !== 'not-allowed' && e.error !== 'service-not-allowed') return;
    on = false; alertDialog(t('No se pudo usar el micrófono: permite el acceso para que el entrenador te escuche.'));
  };

  present({ rehearse: true, onRehearsal: times => { on = false; clearInterval(tick); try { rec.stop(); } catch {} showCoachReport(times, segments, lang); } });
  const panel = document.createElement('div'); panel.id = 'coach-live';
  session.present.overlay.appendChild(panel);
  function paint() {
    const now = performance.now() - t0, pace = recentPace(segments, now);
    if (pace > PACE.fast && performance.now() > hintUntil) { hint = t('Más despacio'); hintUntil = performance.now() + 2000; }
    panel.innerHTML = `<b>${pace || '—'}</b> ${t('palabras/min')} · ${fillers} ${t('muletillas')}`
      + (performance.now() < hintUntil ? `<div class="coach-hint">${esc(hint)}</div>` : '')
      + (interim ? `<div class="coach-heard">${esc(interim.slice(-80))}</div>` : '');
  }
  const tick = setInterval(paint, 1000); paint();
  try { rec.start(); } catch {}
}

export function showCoachReport(times, segments, lang = currentLang(), deck = state.deck) {
  const vis = deck.slides.filter(s => !s.hidden);
  const r = analyzeRehearsal({ segments, times, lang, slideTexts: vis.map(s => s.blocks.map(b => plain(b.html)).join(' ')) });
  if (!r.total) return;
  document.getElementById('coach-modal')?.remove();
  const back = document.createElement('div'); back.id = 'coach-modal'; back.className = 'modal-backdrop';
  const verdict = { slow: t('Un poco lento: prueba a darle más ritmo.'), fast: t('Demasiado rápido: haz pausas y respira.'), good: t('Buen ritmo.') }[r.pace]
    || t('No te he oído: comprueba el micrófono.');
  back.innerHTML = `<div class="modal coach" style="text-align:start;min-width:320px;max-width:min(560px,94vw)">
    <button class="modal-close">✕</button><h3>${t('Informe del entrenador')}</h3>
    <div class="coach-sum"><div><b>${fmt(r.total)}</b><span>${t('Tiempo')}</span></div><div><b>${r.words}</b><span>${t('Palabras')}</span></div>
      <div class="coach-${r.pace || 'none'}"><b>${r.wpm || '—'}</b><span>${t('palabras/min')}</span></div><div><b>${r.fillerCount}</b><span>${t('muletillas')}</span></div></div>
    <p class="coach-verdict">${verdict} <span class="host-help">(${t('lo natural es entre')} ${PACE.slow} ${t('y')} ${PACE.fast} ${t('palabras/min')})</span></p>
    ${r.fillerCount ? `<h4>${t('Posibles muletillas')}</h4><p>${Object.entries(r.fillers).sort((a, b) => b[1] - a[1]).map(([f, n]) => `<span class="coach-chip">${esc(f)} ×${n}</span>`).join(' ')}</p>` : ''}
    ${r.repeated.length ? `<h4>${t('Expresiones que repites')}</h4><p>${r.repeated.map(x => `<span class="coach-chip">${esc(x.phrase)} ×${x.n}</span>`).join(' ')}</p>` : ''}
    ${r.read.length ? `<h4>${t('Lectura de la diapositiva')}</h4><p>${r.read.length > 1 ? t('Parece que lees el texto de las diapositivas') : t('Parece que lees el texto de la diapositiva')} ${r.read.map(i => i + 1).join(', ')}. ${t('Mejor cuéntalo con tus palabras.')}</p>` : ''}
    <h4>${t('Por diapositiva')}</h4><table class="coach-tbl"><tr><th>#</th><th>${t('Tiempo')}</th><th>${t('palabras/min')}</th></tr>
      ${r.perSlide.filter(p => p.ms).map(p => `<tr><td>${p.slide + 1}</td><td>${fmt(p.ms)}</td><td class="coach-${p.wpm == null ? 'none' : p.wpm < PACE.slow ? 'slow' : p.wpm > PACE.fast ? 'fast' : 'good'}">${p.wpm ?? '—'}</td></tr>`).join('')}</table>
    <div class="fr-actions"><button class="mini2 coach-close">${t('Cerrar')}</button><button class="fr-do coach-save">${t('Guardar los intervalos')}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.querySelector('.coach-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.coach-save').addEventListener('click', () => { applyRehearsal(times, deck); close(); });
  return r;
}
