// AI tab: connection settings (OpenRouter sign-in or own key), privacy notice,
// and the actions. A small overlay shows while the model is working.

import * as ai from '../features/ai.js';
import { state } from '../core/store.js';
import { alertDialog, confirmDialog, promptDialog } from './dialog.js';
import { t } from '../i18n.js';

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
  'ai-translate': () => promptDialog(t('¿A qué idioma?'), 'English').then(l => l && run(() => ai.rewriteSelected(null, l))),
};
export const aiRewrite = kind => run(() => ai.rewriteSelected(kind));
