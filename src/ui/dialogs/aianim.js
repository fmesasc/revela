// «Animación con IA» (IA ▸ Animación con IA; Insertar ▸ Animación con IA; and on a selected one, to change it): a topic
// becomes an animated explainer drawn in code by the AI (features/ai/aianim.js), played by Revela's player stage by
// stage (features/content/aianim.js). Here: what it is about, the AI writing and checking it, then a preview with the
// same controls the presentation has — by steps (each click plays a stage and it stops) or looping —, and how long each
// stage lasts; changing those never calls the AI again.

import { esc, plainText } from '../../core/text.js';
import { state, commit, currentSlide, selectedBlock } from '../../core/store.js';
import { createAiAnimation } from '../../features/ai/aianim.js';
import { aiAnimBlock, aiAnimSrcdoc, withAiAnim } from '../../features/content/aianim.js';
import { ready, aiErrorText } from './ai.js';
import { t, currentLang } from '../../i18n/index.js';
import { lang } from '../../features/ai/openrouter.js';

const EXAMPLES = ['El ciclo del agua', 'La mitosis paso a paso', 'El motor de cuatro tiempos', 'Las fases de la Luna'];
const STEP = { write: 'La IA está dibujando la animación…', check: 'Comprobando cada fase…', fix: 'Ha encontrado un fallo: la IA lo corrige…', recheck: 'Comprobando de nuevo…' };

// The slide's title, as a first topic to suggest.
const slideTitle = () => plainText(currentSlide()?.blocks.find(b => b.ph === 'title')?.html || '').trim().slice(0, 200);

// existing: an AI animation already on the slide (its settings, or another version). opts.create: for the tests.
export async function openAiAnimation(existing = selectedBlock()?.aiAnim ? selectedBlock() : null, { create = createAiAnimation } = {}) {
  if (!existing && create === createAiAnimation && !(await ready())) return;
  document.getElementById('aian-modal')?.remove();
  const back = document.createElement('div'); back.id = 'aian-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal aian" style="text-align:start;width:min(760px,96vw);max-width:96vw">
    <button class="modal-close">✕</button><h3>${t('Animación con IA')}</h3>
    <div class="aian-ask">
      <label class="fr-l">${t('¿Qué quieres explicar?')}<textarea class="aian-topic" rows="2" maxlength="600" placeholder="${esc(t('p. ej.: el ciclo del agua'))}"></textarea></label>
      <div class="aian-examples">${EXAMPLES.map(x => `<button type="button" class="mini2 aian-ex">${esc(t(x))}</button>`).join('')}</div>
      <p class="host-help">${t('La IA la dibuja por fases: al presentar, cada clic reproduce una fase y se para, como un vídeo por tramos. Suele costar unos 15 créditos (hasta unos 35 si tiene que corregirla). El tema se envía al servicio de IA.')}</p>
      <div class="fr-actions"><button type="button" class="fr-do aian-go">✨ ${t('Crear')}</button></div>
    </div>
    <p class="aian-status" hidden></p>
    <div class="aian-result" hidden>
      <div class="aian-frame"><iframe class="aian-view" title="${esc(t('Vista previa'))}" sandbox="allow-scripts"></iframe></div>
      <div class="aian-ctrl">
        <div class="aian-seg" role="group" aria-label="${esc(t('Modo'))}"><button type="button" data-mode="steps">${t('Por pasos')}</button><button type="button" data-mode="loop">${t('Continuo')}</button></div>
        <button type="button" class="mini2" data-cmd="reset">⏮ ${t('Desde el principio')}</button>
        <button type="button" class="fr-do" data-cmd="next">${t('Continuar')} ▶</button>
      </div>
      <details class="aian-durs"><summary>${t('Duración de cada fase')}</summary><div class="aian-durgrid"></div></details>
      <div class="fr-actions"><button type="button" class="mini2 aian-again">↻ ${t('Otra versión')}</button><button type="button" class="fr-do aian-ok"></button></div>
    </div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const topic = q('.aian-topic'); topic.value = existing?.aiAnim.topic || slideTitle();
  back.querySelectorAll('.aian-ex').forEach(b => b.addEventListener('click', () => { topic.value = b.textContent; topic.focus(); }));
  let anim = existing ? { ...existing.aiAnim } : null;

  // The preview: the very page the slide will have, with its mode and durations.
  const view = q('.aian-view');
  const paint = () => {
    q('.aian-result').hidden = !anim; if (!anim) return;
    view.srcdoc = aiAnimSrcdoc(anim);
    back.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === anim.mode)));
    q('[data-cmd="next"]').hidden = anim.mode !== 'steps';
    q('.aian-durgrid').innerHTML = anim.stages.map((s, i) => `<label class="aian-dur"><span>${esc(s.name)}</span><input type="number" min="1" max="60" step="0.5" value="${+anim.durations[i] || s.duration}" data-i="${i}"> s</label>`).join('');
    q('.aian-ok').textContent = existing ? t('Guardar cambios') : t('Insertar en la diapositiva');
  };
  const send = m => view.contentWindow?.postMessage(m, '*');
  back.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { anim = { ...anim, mode: b.dataset.mode }; paint(); }));
  back.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => send({ rvAnim: b.dataset.cmd })));
  q('.aian-durgrid').addEventListener('change', e => {
    const i = +e.target.dataset.i; if (!(i >= 0)) return;
    const d = anim.durations.slice(); d[i] = Math.max(1, Math.min(60, +e.target.value || 5)); anim = { ...anim, durations: d };
    send({ rvAnim: 'config', durations: d });   // (no reload: the preview goes on with the new length)
  });

  const status = msg => { q('.aian-status').hidden = !msg; q('.aian-status').textContent = msg || ''; };
  async function make() {
    const what = topic.value.trim(); if (!what) { topic.focus(); return; }
    q('.aian-go').disabled = q('.aian-again').disabled = true;
    try {
      const r = await create(what, { language: lang(), onStep: k => status(t(STEP[k] || '')) });
      anim = { topic: what, lang: currentLang(), scene: r.scene, stages: r.stages, mode: anim?.mode || 'steps', durations: r.stages.map(s => s.duration) };   // (a new scene: no words of the old one)
      status(''); paint();
    } catch (e) {
      const why = e.detail ? ` (${String(e.detail).slice(0, 120)})` : '';   // (the reason, to tell it when it keeps failing)
      status(e.message === 'BROKEN' || e.message === 'EMPTY' ? t('La IA no ha conseguido una animación que funcione. Prueba otra vez o cambia un poco el tema.') + why : aiErrorText(e));
    } finally { q('.aian-go').disabled = q('.aian-again').disabled = false; }
  }
  q('.aian-go').addEventListener('click', make);
  q('.aian-again').addEventListener('click', make);
  q('.aian-ok').addEventListener('click', () => {
    if (!anim) return;
    if (existing) {
      commit(() => { for (const s of state.deck.slides) { const i = s.blocks.findIndex(b => b.id === existing.id);
        if (i >= 0) { s.blocks[i] = { ...withAiAnim(s.blocks[i], anim), alt: anim.topic }; break; } } });
    } else {
      // (In the middle of the slide, as large as fits at 16:9 with room for the title.)
      const { w: W, h: H } = state.deck.size, w = Math.round(Math.min(W * 0.8, (H - 160) * 16 / 9)), h = Math.round(w * 9 / 16);
      const b = aiAnimBlock(anim, { x: Math.round((W - w) / 2), y: Math.max(110, Math.round((H - h) / 2 + 30)), w, h });
      commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
    }
    close();
  });
  paint();
  if (!existing) topic.focus();
  return back;
}
