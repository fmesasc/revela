// AI tab: connection settings (OpenRouter sign-in or own key), privacy notice,
// and the actions. A small overlay shows while the model is working.

import * as ai from '../../features/ai/openrouter.js';
import { state, commit, replaceDeck } from '../../core/store.js';
import { emptyDeck } from '../../core/model.js';
import * as deck from '../../features/ai/authoring.js';
import * as palettes from '../../features/design/palettes.js';
import { alertDialog, confirmDialog, promptDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

export function openAiSettings() {
  document.getElementById('ai-modal')?.remove();
  const s = ai.aiSettings();
  const back = document.createElement('div'); back.id = 'ai-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(560px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Inteligencia artificial')}</h3>
    <p class="host-help">${t('Revela usa OpenRouter, que da acceso a muchos modelos (Claude, GPT, Gemini, Llama…). Pagas tu uso directamente en OpenRouter; Revela no tiene servidor y no ve tus datos.')}</p>
    <p class="ai-status"></p>
    <div class="fr-actions" style="justify-content:flex-start"><button class="fr-do ai-login">${t('Entrar con OpenRouter')}</button><button class="ai-out">${t('Desconectar')}</button></div>
    <details class="ai-adv"><summary>${t('Usar mi propia clave de OpenRouter')}</summary>
      <label class="fr-l"><input type="password" class="ai-key" placeholder="sk-or-…" autocomplete="off"></label>
      <div class="fr-actions" style="justify-content:flex-start"><button class="ai-save">${t('Guardar clave')}</button></div></details>
    <label class="fr-l">${t('Modelo')} <input type="text" class="ai-model" list="ai-models" value="${s.model}">
      <datalist id="ai-models"><option value="openrouter/auto"></option></datalist></label>
    <label class="fr-l">${t('Modelo de imágenes')} <input type="text" class="ai-imodel" value="${ai.imageModel()}"></label>
    <p class="host-help">${t('«openrouter/auto» elige un modelo adecuado. Otros modelos:')} <a href="https://openrouter.ai/models" target="_blank" rel="noopener">openrouter.ai/models</a></p>
    <p class="host-help ai-privacy">${t('Al usar la IA, el texto de tus diapositivas (y la imagen, para el texto alternativo) se envía a OpenRouter y al proveedor del modelo elegido.')}</p></div>`;
  document.body.appendChild(back);
  const sync = () => {
    const on = ai.aiConnected();
    back.querySelector('.ai-status').innerHTML = on ? `✅ ${t('Conectado')}` : `⚪ ${t('No conectado')}`;
    back.querySelector('.ai-out').hidden = !on;
  };
  back.querySelector('.modal-close').addEventListener('click', () => back.remove());
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  back.querySelector('.ai-login').addEventListener('click', () => ai.startOpenRouterLogin());
  back.querySelector('.ai-out').addEventListener('click', () => { ai.disconnectAi(); sync(); });
  back.querySelector('.ai-save').addEventListener('click', () => { const k = back.querySelector('.ai-key').value; if (k) { ai.setAiKey(k); back.querySelector('.ai-key').value = ''; sync(); } });
  back.querySelector('.ai-model').addEventListener('change', e => ai.setAiModel(e.target.value));
  back.querySelector('.ai-imodel').addEventListener('change', e => ai.setImageModel(e.target.value));
  sync();
}

// Make sure the user is connected and has seen the privacy notice.
async function ready() {
  if (!ai.aiConnected()) { openAiSettings(); return false; }
  if (!ai.privacyAccepted()) {
    const ok = await confirmDialog(t('Al usar la IA, el texto de tus diapositivas (y la imagen, para el texto alternativo) se envía a OpenRouter y al proveedor del modelo elegido.') + ' ' + t('¿Continuar?'));
    if (!ok) return false; ai.acceptPrivacy();
  }
  return true;
}
const MSG = { NO_KEY: 'Conecta primero la IA.', BAD_KEY: 'La clave de OpenRouter no es válida.', NO_CREDIT: 'No te queda saldo en OpenRouter.',
  NO_TEXT: 'Selecciona primero un cuadro de texto.', NO_IMAGE: 'Selecciona primero una imagen.', EMPTY: 'La IA no devolvió contenido.' };
async function run(fn) {
  if (!(await ready())) return;
  const busy = document.createElement('div'); busy.id = 'ai-busy'; busy.innerHTML = `<i class="ms">auto_awesome</i> ${t('La IA está trabajando…')}`;
  document.body.appendChild(busy);
  try { return await fn(); }
  catch (e) { alertDialog(t(MSG[e.message] || 'No se pudo completar: ') + (MSG[e.message] ? '' : (e.message || e))); }
  finally { busy.remove(); }
}

export const AI_ACTIONS = {
  'ai-settings': () => openAiSettings(),
  'ai-generate': () => promptDialog(t('¿Sobre qué tema quieres las diapositivas?'), '').then(topic => topic && run(() => ai.generateSlides(topic, 6))),
  'ai-notes': () => run(() => ai.writeNotes()),
  'ai-notes-all': () => run(() => ai.writeNotes({ all: true })),
  'ai-alt': () => run(() => ai.describeImage()),
  'ai-image': () => promptDialog(t('Describe la imagen que quieres (se cobra en tu cuenta de OpenRouter):'), '').then(p => p && run(() => ai.generateImage(p))),
  'ai-translate-deck': () => promptDialog(t('¿A qué idioma traducir toda la presentación?'), 'English').then(l => l && run(async () => {
    const n = await ai.translateDeck(l); alertDialog(t('Textos traducidos: ') + n + '. ' + t('Puedes deshacerlo con Ctrl+Z.'));
  })),
  'ai-translate': () => promptDialog(t('¿A qué idioma?'), 'English').then(l => l && run(() => ai.rewriteSelected(null, l))),
};
export const aiRewrite = kind => run(() => ai.rewriteSelected(kind));

// ---- Advanced authoring --------------------------------------------------------
const TONES = ['profesional', 'didáctico', 'persuasivo', 'cercano', 'académico', 'inspirador'];
export function openCreateDeck() {
  document.getElementById('aideck-modal')?.remove();
  const back = document.createElement('div'); back.id = 'aideck-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(620px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Crear presentación con IA')}</h3>
    <label class="fr-l">${t('Tema o instrucciones')}<textarea class="ad-topic" rows="3" placeholder="${t('p. ej.: Introducción a la energía solar para estudiantes de secundaria')}"></textarea></label>
    <label class="fr-l">${t('O basarla en un documento (.txt, .md, .pdf) o texto pegado')}
      <input type="file" class="ad-file" accept=".txt,.md,.markdown,.pdf,text/plain,application/pdf">
      <textarea class="ad-source" rows="3" placeholder="${t('Pega aquí un texto (opcional)')}"></textarea></label>
    <div class="ad-grid">
      <label class="fr-l">${t('Diapositivas')}<input type="number" class="ad-count" min="3" max="30" value="8"></label>
      <label class="fr-l">${t('Público')}<input type="text" class="ad-aud" placeholder="${t('p. ej.: directivos')}"></label>
      <label class="fr-l">${t('Tono')}<select class="ad-tone">${TONES.map(x => `<option value="${x}">${t(x)}</option>`).join('')}</select></label>
      <label class="fr-l">${t('Diseño')}<select class="ad-pal"><option value="">${t('El actual')}</option>${Object.entries(palettes.PALETTES).map(([k, p]) => `<option value="${k}">${t(p.name)}</option>`).join('')}</select></label>
    </div>
    <label class="fr-chk"><input type="checkbox" class="ad-img"> ${t('Generar imágenes con IA (coste extra en OpenRouter)')}</label>
    <label class="fr-chk"><input type="checkbox" class="ad-new" checked> ${t('Empezar una presentación nueva (si no, se añade a la actual)')}</label>
    <progress class="ad-prog" hidden style="width:100%"></progress>
    <div class="fr-actions"><button class="fr-do ad-go">✨ ${t('Crear')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.ad-go').addEventListener('click', async () => {
    const topic = q('.ad-topic').value.trim(), file = q('.ad-file').files[0];
    let source = q('.ad-source').value.trim();
    if (!topic && !source && !file) { alertDialog(t('Escribe un tema o aporta un documento.')); return; }
    if (!(await ready())) return;
    q('.ad-go').disabled = true; q('.ad-prog').hidden = false;
    try {
      if (file) source = (await deck.readDocument(file)) + (source ? '\n\n' + source : '');
      const opts = { topic, source, count: +q('.ad-count').value, audience: q('.ad-aud').value.trim(), tone: q('.ad-tone').value,
        palette: q('.ad-pal').value, images: q('.ad-img').checked };
      await run(async () => {
        const specs = await deck.createDeck(opts);
        if (q('.ad-new').checked) replaceDeck(emptyDeck());
        if (opts.palette) palettes.applyPalette(opts.palette);
        await deck.insertSpecs(specs, { images: opts.images, onProgress: p => (q('.ad-prog').value = p) });
        if (q('.ad-new').checked && state.deck.slides.length > specs.length) {   // drop the empty starter slide
          commit(() => { state.deck.slides.shift(); state.ui.slideIndex = 0; });
        }
      });
      close();
    } catch (e) { alertDialog(t('No se pudo completar: ') + (e.message || e)); }
    finally { if (document.body.contains(back)) { q('.ad-go').disabled = false; q('.ad-prog').hidden = true; } }
  });
}

// ---- Assistant panel -------------------------------------------------------------
const chatLog = [];                          // [{ role, content }] for context + display
export function toggleAssistant(on = !state.ui.showAssistant) { commit(() => { state.ui.showAssistant = on; }, { history: false }); }
export function renderAssistant() {
  let panel = document.getElementById('assistant-panel');
  if (!state.ui.showAssistant) { panel?.remove(); return; }
  if (panel) return;
  panel = document.createElement('aside'); panel.id = 'assistant-panel';
  panel.innerHTML = `<div class="cm-head"><b>✨ ${t('Asistente')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div>
    <div class="as-log"></div>
    <div class="as-hints">${['Añade una diapositiva de conclusiones', 'Acorta todos los títulos', 'Escribe notas para todas las diapositivas', 'Convierte la diapositiva actual en una línea de tiempo']
      .map(h => `<button type="button" class="as-hint">${t(h)}</button>`).join('')}</div>
    <div class="cm-new"><textarea rows="3" placeholder="${t('Pide un cambio o haz una pregunta…')}"></textarea><button type="button" class="fr-do as-send">${t('Enviar')}</button></div>`;
  document.querySelector('main').appendChild(panel);
  const log = panel.querySelector('.as-log'), ta = panel.querySelector('textarea');
  const add = (who, text) => { const d = document.createElement('div'); d.className = 'as-msg ' + who; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; };
  for (const m of chatLog) add(m.role === 'user' ? 'me' : 'ai', m.shown || m.content);
  const send = async () => {
    const text = ta.value.trim(); if (!text) return;
    ta.value = ''; add('me', text);
    const res = await run(() => deck.assistant(text, chatLog.map(({ role, content }) => ({ role, content }))));
    if (!res) return;
    const note = res.applied ? ` (${res.applied} ${t('cambios aplicados; Ctrl+Z para deshacer')})` : '';
    add('ai', (res.message || t('Hecho.')) + note);
    chatLog.push({ role: 'user', content: text }, { role: 'assistant', content: JSON.stringify({ message: res.message, ops: res.ops }), shown: res.message + note });
  };
  panel.querySelector('.as-send').addEventListener('click', send);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  panel.querySelectorAll('.as-hint').forEach(h => h.addEventListener('click', () => { ta.value = h.textContent; send(); }));
  panel.querySelector('.cm-close').addEventListener('click', () => toggleAssistant(false));
}

Object.assign(AI_ACTIONS, {
  'ai-deck': () => openCreateDeck(),
  'ai-improve': () => run(() => deck.improveSlide()),
  'ai-agenda': () => run(() => deck.addAgenda()),
  'ai-quiz': () => run(async () => { const n = await deck.addQuiz(3); alertDialog(t('Preguntas añadidas al final: ') + n); }),
  'ai-assistant': () => toggleAssistant(),
});
