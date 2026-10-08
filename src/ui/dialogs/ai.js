// AI tab: connection settings (OpenRouter sign-in or own key), privacy notice,
// and the actions. A small overlay shows while the model is working.

import { readAttachment, pdfFigures, ATTACH, ATTACH_ACCEPT } from '../../features/ai/attach.js';
import { GALLERY, buildFromGallery } from '../../features/design/gallery.js';
import { ensureLayouts } from '../../features/document/master.js';
import { hasAccounts } from '../../io/cloud/account.js';
import { openAccount } from './account.js';
import * as ai from '../../features/ai/openrouter.js';
import { state, commit, replaceDeck } from '../../core/store.js';
import * as deck from '../../features/ai/authoring.js';
import * as vo from '../../features/ai/voiceover.js';
import { alertDialog, confirmDialog, promptDialog } from './dialog.js';
import { t } from '../../i18n/index.js';
import { esc } from '../../core/text.js';
import { askAssistant } from './assistant.js';
// The kinds of slide the outline may choose (features/ai/specs.js KINDS), to see and change before the slides are made.
const OUTLINE_KINDS = [['', 'Automático'], ['title', 'Portada'], ['section', 'Sección'], ['bullets', 'Lista'], ['code', 'Código'], ['steps', 'Pasos'], ['features', 'Características'],
  ['comparison', 'Comparación'], ['two_columns', 'Dos columnas'], ['key_idea', 'Idea clave'], ['timeline', 'Línea de tiempo'], ['stats', 'Cifras'], ['chart', 'Gráfico'],
  ['table', 'Tabla'], ['quote', 'Cita'], ['math', 'Ecuación'], ['image', 'Imagen'], ['agenda', 'Agenda'], ['closing', 'Cierre']];

// needed: opened because something asked for the AI (it says so first).
export function openAiSettings({ needed = false } = {}) {
  document.getElementById('ai-modal')?.remove();
  const s = ai.aiSettings(), cloud = hasAccounts();
  const back = document.createElement('div'); back.id = 'ai-modal'; back.className = 'modal-backdrop';
  // (The official edition: the AI comes with the Revela account; one's own OpenRouter key is the advanced way.)
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(560px,94vw);max-width:94vw">
    <button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3>${t('Inteligencia artificial')}</h3>
    ${needed ? `<p class="ai-needed"><b>${t('Para usar la IA, conéctala (solo una vez).')}</b></p>` : ''}
    ${cloud ? `<p class="host-help">${t('La IA viene incluida con tu cuenta de Revela, sin claves: inicia sesión y listo.')}</p>
      <div class="fr-actions" style="justify-content:flex-start"><button class="fr-do ai-account"><i class="ms">account_circle</i> ${t('Mi cuenta de Revela')}</button></div>`
    : `<p class="host-help">${t('Revela usa OpenRouter, que da acceso a muchos modelos (Claude, GPT, Gemini, Llama…). Entras con tu cuenta de OpenRouter y pagas allí lo que uses.')}</p>`}
    <p class="ai-status"></p>
    <div class="fr-actions" style="justify-content:flex-start">${cloud ? '' : `<button class="fr-do ai-login">${t('Entrar con OpenRouter')}</button>`}<button class="ai-out mini2">${t('Desconectar')}</button></div>
    <details class="ai-adv"><summary>${t('Opciones avanzadas')}</summary>
      ${cloud ? `<p class="host-help">${t('En lugar de la IA incluida, tu propia cuenta de OpenRouter:')}</p><div class="fr-actions" style="justify-content:flex-start"><button class="mini2 ai-login">${t('Entrar con OpenRouter')}</button></div>` : ''}
      <label class="fr-l">${t('Usar mi propia clave de OpenRouter')}<input type="password" class="ai-key" placeholder="sk-or-…" autocomplete="off"></label>
      <div class="fr-actions" style="justify-content:flex-start"><button class="ai-save mini2">${t('Guardar clave')}</button></div>
      <label class="fr-l">${t('Modelo')} <input type="text" class="ai-model" list="ai-models" value="${s.model}">
        <datalist id="ai-models"><option value="openrouter/auto"></option></datalist></label>
      <label class="fr-l">${t('Modelo de imágenes')} <input type="text" class="ai-imodel" value="${ai.imageModel()}"></label>
      <p class="host-help">${t('«openrouter/auto» elige un modelo adecuado. Otros modelos:')} <a href="https://openrouter.ai/models" target="_blank" rel="noopener">openrouter.ai/models</a></p>
    </details>
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
  back.querySelector('.ai-account')?.addEventListener('click', () => { back.remove(); openAccount(); });
  back.querySelector('.ai-out').addEventListener('click', () => { ai.disconnectAi(); sync(); });
  back.querySelector('.ai-save').addEventListener('click', () => { const k = back.querySelector('.ai-key').value; if (k) { ai.setAiKey(k); back.querySelector('.ai-key').value = ''; sync(); } });
  back.querySelector('.ai-model').addEventListener('change', e => ai.setAiModel(e.target.value));
  back.querySelector('.ai-imodel').addEventListener('change', e => ai.setImageModel(e.target.value));
  sync();
}

// Make sure the user is connected and has seen the privacy notice.
export async function ready() {
  // The official edition: the AI comes with the account (sign in first).
  if (!ai.aiConnected() && hasAccounts()) { openAccount(); return false; }
  if (!ai.aiConnected()) { openAiSettings({ needed: true }); return false; }
  if (!ai.privacyAccepted()) {
    const ok = await confirmDialog(t('Al usar la IA, el texto de tus diapositivas (y la imagen, para el texto alternativo) se envía a OpenRouter y al proveedor del modelo elegido.') + ' ' + t('¿Continuar?'));
    if (!ok) return false; ai.acceptPrivacy();
  }
  return true;
}
const MSG = { NO_KEY: 'Conecta primero la IA.', BAD_KEY: 'La clave de OpenRouter no es válida.', NO_CREDIT: 'No te queda saldo en OpenRouter.',
  TOO_MANY: 'Demasiadas peticiones seguidas: espera un minuto.', AI_PAUSED: 'La IA está en pausa ahora mismo. Inténtalo más tarde.',
  NO_TEXT: 'Selecciona primero un cuadro de texto.', NO_IMAGE: 'Selecciona primero una imagen.', EMPTY: 'La IA no devolvió contenido.' };
// Voice-over: choose a voice, make it from the notes (the out-of-date slides), or remove it.
async function openVoiceover() {
  if (!(await ready())) return;
  document.getElementById('vo-modal')?.remove();
  const all = vo.narratable(), fresh = all.filter(vo.narrationFresh).length, chars = all.reduce((t, s) => t + vo.notesText(s).length, 0);
  const back = document.createElement('div'); back.id = 'vo-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(460px,94vw);max-width:none"><button class="modal-close">✕</button><h3>${t('Voz en off')}</h3>
    <p class="host-help">${t('Una voz de IA lee las notas del orador de cada diapositiva. Suena al presentar y va en el vídeo exportado.')}</p>
    ${all.length ? `<p class="host-help"><b>${all.length}</b> ${t('diapositivas con notas')} · ${fresh} ${t('ya con voz')} · ${chars} ${t('caracteres')}</p>` : `<p class="host-help">${t('Escribe notas del orador en las diapositivas: es lo que leerá la voz.')}</p>`}
    <label class="fr-l">${t('Voz')}<select class="vo-voice">${ai.VOICES.map(v => `<option value="${v}"${v === 'nova' ? ' selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Velocidad')}<select class="vo-speed"><option value="0.9">0,9×</option><option value="1" selected>1×</option><option value="1.1">1,1×</option><option value="1.25">1,25×</option></select></label>
    <label class="fr-chk"><input type="checkbox" class="vo-adv"> ${t('Pasar de diapositiva al acabar la voz')}</label>
    <label class="fr-chk"><input type="checkbox" class="vo-all"> ${t('Rehacer también las que ya tienen voz')}</label>
    <div class="fr-actions"><button type="button" class="mini2 vo-rm"${state.deck.slides.some(s => s.narration) ? '' : ' disabled'}>${t('Quitar la voz')}</button><button type="button" class="fr-do vo-go"${all.length ? '' : ' disabled'}>${t('Crear la voz')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.vo-rm').addEventListener('click', () => { vo.removeNarration(); close(); });
  q('.vo-go').addEventListener('click', async () => {
    close();
    const n = await run(() => vo.narrate({ voice: q('.vo-voice').value, speed: +q('.vo-speed').value, all: q('.vo-all').checked, advance: q('.vo-adv').checked }));
    if (n != null) alertDialog(t('Voz creada en {n} diapositivas.').replace('{n}', n));
  });
}

// Tell the user what went wrong (out of credits: the account, to get more).
// The failure in a line (for the assistant's chat).
export const aiErrorText = e => (e?.message === 'NO_CREDIT' && ai.usingCloudAi() ? t('No te quedan créditos. Consigue más desde tu cuenta.')
  : t(MSG[e?.message] || 'No se pudo completar: ') + (MSG[e?.message] ? '' : (e?.message || e)));
export function aiFailed(e) {
  if (e.message === 'NO_CREDIT' && ai.usingCloudAi()) { alertDialog(t('No te quedan créditos. Consigue más desde tu cuenta.')); openAccount(); return; }
  alertDialog(t(MSG[e.message] || 'No se pudo completar: ') + (MSG[e.message] ? '' : (e.message || e)));
}
export async function run(fn) {
  if (!(await ready())) return;
  const busy = document.createElement('div'); busy.id = 'ai-busy'; busy.innerHTML = `<i class="ms">auto_awesome</i> ${t('La IA está trabajando…')}`;
  document.body.appendChild(busy);
  try { return await fn(); }
  catch (e) { aiFailed(e); }
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
  'ai-level': () => openLevelDialog(),
  'ai-qa': () => import('./qaprep.js').then(m => m.openQaPrep()),
};

// Adapt the texts to a reading level: the level, and what — the selected boxes, this slide or all of it.
export function openLevelDialog() {
  document.getElementById('level-modal')?.remove();
  const sel = (state.ui.multi?.length ? state.ui.multi : [state.ui.selection]).filter(id => state.deck.slides[state.ui.slideIndex]?.blocks.some(b => b.id === id && (b.type === 'text' || b.type === 'table')));
  const back = document.createElement('div'); back.id = 'level-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(460px,94vw)"><button class="modal-close">✕</button><h3>${t('Adaptar al nivel de lectura')}</h3>
    <p class="host-help">${t('La IA reescribe los textos para ese público, en su mismo idioma y sin cambiar los datos. Las notas no se tocan. Puedes deshacerlo con Ctrl+Z.')}</p>
    <label class="fr-l">${t('Para')}<select class="lv-level">${Object.entries(ai.READING_LEVELS).map(([k, [l]]) => `<option value="${k}"${k === 'primary' ? ' selected' : ''}>${esc(t(l))}</option>`).join('')}</select></label>
    <fieldset class="lv-scope" style="margin:6px 0 14px"><legend>${t('Qué textos')}</legend>
      ${sel.length ? `<label class="fr-chk"><input type="radio" name="lv-scope" value="sel" checked> ${t('Los seleccionados')}</label>` : ''}
      <label class="fr-chk"><input type="radio" name="lv-scope" value="slide"${sel.length ? '' : ' checked'}> ${t('Esta diapositiva')}</label>
      <label class="fr-chk"><input type="radio" name="lv-scope" value="all"> ${t('Toda la presentación')}</label></fieldset>
    <div class="fr-actions"><button class="mini2 lv-cancel">${t('Cancelar')}</button><button class="fr-do lv-ok">${t('Adaptar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close); q('.lv-cancel').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.lv-ok').addEventListener('click', () => {
    const level = q('.lv-level').value, scope = back.querySelector('input[name="lv-scope"]:checked')?.value || 'slide'; close();
    run(async () => {
      const n = await ai.levelDeck(level, scope === 'sel' ? { only: sel } : scope === 'slide' ? { slides: [state.deck.slides[state.ui.slideIndex]] } : {});
      alertDialog(t('Textos adaptados: ') + n + '. ' + t('Revisa que quepan en su caja.') + ' ' + t('Puedes deshacerlo con Ctrl+Z.'));
    });
  });
}
export const aiRewrite = kind => run(() => ai.rewriteSelected(kind));

// ---- Advanced authoring --------------------------------------------------------
const TONES = ['profesional', 'didáctico', 'persuasivo', 'cercano', 'académico', 'inspirador'];
const DECK_DRAFT = 'revela.aideck.draft', DECK_REOPEN = 'revela.aideck.reopen';
// Back from connecting the AI with the form left half-way: open it again (once).
export function reopenCreateDeck() {
  let again = false; try { again = sessionStorage.getItem(DECK_REOPEN) === '1'; sessionStorage.removeItem(DECK_REOPEN); } catch {}
  if (again) openCreateDeck();
}
export function openCreateDeck() {
  document.getElementById('aideck-modal')?.remove();
  const back = document.createElement('div'); back.id = 'aideck-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(620px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Crear presentación con IA')}</h3>
    <label class="fr-l">${t('Tema o instrucciones')}<textarea class="ad-topic" rows="3" placeholder="${t('p. ej.: Introducción a la energía solar para estudiantes de secundaria')}"></textarea></label>
    <label class="fr-l">${t('O basarla en documentos o fotos (PDF, textos, fotos de apuntes o de una pizarra) o en texto pegado')}
      <input type="file" class="ad-file" multiple accept="${ATTACH_ACCEPT},.markdown">
      <textarea class="ad-source" rows="3" placeholder="${t('Pega aquí un texto (opcional)')}"></textarea></label>
    <div class="ad-grid">
      <label class="fr-l">${t('Diapositivas')}<input type="number" class="ad-count" min="3" max="30" value="8"></label>
      <label class="fr-l">${t('Público')}<input type="text" class="ad-aud" placeholder="${t('p. ej.: directivos')}"></label>
      <label class="fr-l">${t('Tono')}<select class="ad-tone">${TONES.map(x => `<option value="${x}">${t(x)}</option>`).join('')}</select></label>
      <label class="fr-l">${t('Diseño')}<select class="ad-pal"><option value="">${t('Automático (según el contenido)')}</option>${Object.keys(deck.DECK_DESIGNS).map(k => `<option value="${k}">${t(GALLERY[k].name)}</option>`).join('')}</select></label>
    </div>
    <label class="fr-chk"><input type="checkbox" class="ad-web"> ${t('Buscar en internet datos actuales y citar las fuentes (unos céntimos más)')}</label>
    <label class="fr-l">${t('Imágenes y vídeos')}<select class="ad-media">
      <option value="search">${t('Buscar imágenes y vídeos reales que expliquen el contenido (con licencia libre; solo se envían las palabras de búsqueda)')}</option>
      <option value="generate">${t('Generar imágenes con IA (coste extra en OpenRouter)')}</option>
      <option value="">${t('Sin imágenes')}</option></select></label>
    <label class="fr-chk"><input type="checkbox" class="ad-new" checked> ${t('Empezar una presentación nueva (si no, se añade a la actual)')}</label>
    <div class="ad-ask" hidden><h4 style="margin:10px 0 4px">${t('Para hacerla a tu medida')}</h4>
      <p class="host-help">${t('Responde lo que quieras (o sáltalo): cuanto más sepa de tu caso, más tuya será la presentación.')}</p>
      <div class="ad-qs"></div>
      <label class="fr-l">${t('¿Algo más que deba saber?')}<textarea class="ad-more" rows="2" placeholder="${t('Para qué es, cuánto dura, tus datos, lo que no puede faltar…')}"></textarea></label>
      <button type="button" class="mini2 ad-skip">${t('Saltar las preguntas')}</button></div>
    <div class="ad-outline" hidden><h4 style="margin:10px 0 4px">${t('Esquema')}</h4>
      <p class="host-help">${t('Revísalo antes de crear: cambia los títulos y los puntos, quita o añade diapositivas y ordénalas. Las diapositivas seguirán este esquema.')}</p>
      <ol class="ad-ol" style="padding-inline-start:22px;max-height:min(46vh,420px);overflow:auto;margin:6px 0"></ol>
      <button type="button" class="mini2 ad-ol-add"><i class="ms">add</i> ${t('Añadir diapositiva')}</button></div>
    <progress class="ad-prog" hidden style="width:100%"></progress>
    <div class="fr-actions"><button type="button" class="mini2 ad-go">${t('Crear sin esquema')}</button><button type="button" class="fr-do ad-plan">✨ ${t('Ver el esquema')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  // (What was written is kept: connecting the AI may take the page to OpenRouter and back — the
  // form opens again, filled in, when it comes back: apps/editor/main.js.)
  const FIELDS = ['.ad-topic', '.ad-source', '.ad-count', '.ad-aud', '.ad-tone', '.ad-pal'];   // (not .ad-web: a cost, chosen each time)
  try { const d = JSON.parse(sessionStorage.getItem(DECK_DRAFT) || 'null'); if (d) FIELDS.forEach((s, i) => { if (d[i] != null) q(s).value = d[i]; }); } catch {}
  back.addEventListener('input', () => { try { sessionStorage.setItem(DECK_DRAFT, JSON.stringify(FIELDS.map(s => q(s).value))); } catch {} });
  back.addEventListener('change', () => { try { sessionStorage.setItem(DECK_DRAFT, JSON.stringify(FIELDS.map(s => q(s).value))); } catch {} });
  // The outline: one item per slide (its title and points), to change before the slides are made.
  let outline = null;
  const drawOutline = () => {
    q('.ad-outline').hidden = !outline;
    if (!outline) return;
    q('.ad-ol').innerHTML = outline.slides.map((x, i) => `<li data-i="${i}" style="margin:6px 0"><div style="display:flex;gap:4px;align-items:center">
      <input type="text" class="ad-ol-t" value="${esc(x.title)}" aria-label="${t('Título')}" style="flex:1;font-weight:600">
      <select class="ad-ol-k" aria-label="${t('Tipo de diapositiva')}" title="${t('Tipo de diapositiva')}" style="max-width:9.5em">${OUTLINE_KINDS.map(([k, l]) => `<option value="${k}"${(x.kind || '') === k ? ' selected' : ''}>${esc(t(l))}</option>`).join('')}</select>
      <button type="button" class="mini2" data-mv="-1" title="${t('Subir')}"${i ? '' : ' disabled'}><i class="ms">arrow_upward</i></button>
      <button type="button" class="mini2" data-mv="1" title="${t('Bajar')}"${i < outline.slides.length - 1 ? '' : ' disabled'}><i class="ms">arrow_downward</i></button>
      <button type="button" class="mini2" data-rm title="${t('Quitar')}"><i class="ms">close</i></button></div>
      <textarea class="ad-ol-p" rows="${Math.max(1, x.points.length)}" aria-label="${t('Puntos (uno por línea)')}" placeholder="${t('Puntos (uno por línea)')}" style="width:100%;font-size:13px">${esc(x.points.join('\n'))}</textarea></li>`).join('');
    q('.ad-plan').innerHTML = `✨ ${t('Crear {n} diapositivas').replace('{n}', outline.slides.length)}`;
    q('.ad-go').hidden = true;
  };
  const readOutline = () => { if (!outline) return;
    q('.ad-ol').querySelectorAll('li').forEach((li, i) => { const kind = li.querySelector('.ad-ol-k').value;
      outline.slides[i] = { title: li.querySelector('.ad-ol-t').value.trim(), ...(kind && { kind }), points: li.querySelector('.ad-ol-p').value.split('\n').map(x => x.trim()).filter(Boolean) }; });
    outline.slides = outline.slides.filter(x => x.title); };
  q('.ad-ol').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; readOutline();
    const i = +b.closest('li').dataset.i, L = outline.slides;
    if (b.dataset.mv) { const j = i + +b.dataset.mv; [L[i], L[j]] = [L[j], L[i]]; } else if (b.hasAttribute('data-rm')) L.splice(i, 1);
    drawOutline();
  });
  q('.ad-ol-add').addEventListener('click', () => { readOutline(); outline.slides.push({ title: t('Nueva diapositiva'), points: [] }); drawOutline(); q('.ad-ol li:last-child .ad-ol-t')?.select(); });
  q('.ad-plan').addEventListener('click', () => (outline ? make(true) : plan()));
  // (What the form asks for, with the documents read: for the outline and for the slides.)
  const gather = async () => {
    const topic = q('.ad-topic').value.trim(), files = [...q('.ad-file').files].slice(0, ATTACH.count);
    let source = q('.ad-source').value.trim();
    if (!topic && !source && !files.length) { alertDialog(t('Escribe un tema o aporta un documento.')); return null; }
    const read = (await Promise.all(files.map(f => readAttachment(f)))).filter(Boolean);
    const figs = (await Promise.all(files.filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf').map(f => pdfFigures(f).catch(() => [])))).flat();
    const docs = read.filter(a => a.kind === 'text'), pics = [...figs, ...read.filter(a => a.kind === 'image')].slice(0, ATTACH.count);
    if (docs.length) source = docs.map(d => d.text).join('\n\n') + (source ? '\n\n' + source : '');
    return { topic, source, count: +q('.ad-count').value, audience: q('.ad-aud').value.trim(), tone: q('.ad-tone').value, images: q('.ad-media').value === 'generate', media: q('.ad-media').value, attachments: pics };
  };
  // (Searched once for what the form says, and kept for the slides: the same sources for the outline and the deck.)
  let found = null, foundFor = '';
  const researched = async o => {
    if (!q('.ad-web').checked) return null;
    const keyOf = JSON.stringify([o.topic, o.audience, (o.source || '').length]);
    if (!found || foundFor !== keyOf) { found = await deck.research(o); foundFor = keyOf; }
    return found;
  };
  // First, a few questions about this case (once for each topic): their answers go to the outline and the slides.
  let questions = null, askedFor = null, skipped = false;
  const answers = () => [...(questions || []).map((x, i) => {
    const box = q(`.ad-q[data-i="${i}"]`); if (!box) return null;
    const picked = [...box.querySelectorAll('.ad-opt.on')].map(b => b.textContent.trim()), other = box.querySelector('.ad-q-other').value.trim();
    return { q: x.q, answer: [...picked, other].filter(Boolean).join('; ') };
  }), { q: '', answer: q('.ad-more').value.trim() }].filter(Boolean);
  const context = () => (questions && !skipped ? deck.contextOf(answers()) : deck.contextOf([{ q: '', answer: q('.ad-more').value.trim() }]));
  const drawQuestions = () => {
    q('.ad-ask').hidden = !questions?.length;
    q('.ad-qs').innerHTML = (questions || []).map((x, i) => `<div class="ad-q" data-i="${i}" data-multi="${x.multi ? 1 : ''}" style="margin:8px 0"><b style="display:block;margin-bottom:4px">${esc(x.q)}</b>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${x.options.map(o => `<button type="button" class="mini2 ad-opt">${esc(o)}</button>`).join('')}</div>
      <input type="text" class="ad-q-other" maxlength="400" placeholder="${t('Otra respuesta, o más detalle…')}" style="width:100%;margin-top:4px"></div>`).join('');
  };
  q('.ad-qs').addEventListener('click', e => {
    const b = e.target.closest('.ad-opt'); if (!b) return;
    const box = b.closest('.ad-q'); if (!box.dataset.multi) box.querySelectorAll('.ad-opt.on').forEach(x => { if (x !== b) x.classList.remove('on'); });
    b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on'));
  });
  q('.ad-skip').addEventListener('click', () => { skipped = true; q('.ad-ask').hidden = true; plan(); });
  const plan = async () => {
    if (!(await ready())) return;
    q('.ad-plan').disabled = true; q('.ad-prog').hidden = false; q('.ad-prog').removeAttribute('value');
    try {
      const o = await gather(); if (!o) return;
      const key = JSON.stringify([o.topic, o.audience, o.source.slice(0, 200)]);
      if (!skipped && askedFor !== key) {                         // (the questions first; the outline with the next click)
        askedFor = key; questions = await deck.askAbout(o).catch(() => []);     // (no questions if it fails: straight to the outline)
        if (questions.length) { drawQuestions(); q('.ad-ask').scrollIntoView({ block: 'nearest' }); return; }
      }
      outline = await run(async () => deck.createOutline({ ...o, context: context(), research: await researched(o) })) || null; drawOutline();
    }
    catch (e) { alertDialog(t('No se pudo completar: ') + (e.message || e)); }
    finally { q('.ad-plan').disabled = false; q('.ad-prog').hidden = true; }
  };
  const make = async () => { readOutline(); if (outline && !outline.slides.length) return; q('.ad-go').click(); };
  q('.ad-go').addEventListener('click', async () => {
    const topic = q('.ad-topic').value.trim(), files = [...q('.ad-file').files].slice(0, ATTACH.count);
    let source = q('.ad-source').value.trim(), pics = [];
    if (!topic && !source && !files.length) { alertDialog(t('Escribe un tema o aporta un documento.')); return; }
    try { sessionStorage.setItem(DECK_REOPEN, '1'); } catch {}
    if (!(await ready())) return;
    try { sessionStorage.removeItem(DECK_REOPEN); } catch {}
    q('.ad-go').disabled = true; q('.ad-plan').disabled = true; q('.ad-prog').hidden = false;
    try {
      // (Documents: their text; pictures — or a scanned PDF's pages —: shown to the AI.)
      const read = (await Promise.all(files.map(f => readAttachment(f).catch(e => { throw new Error(t(e.message === 'ATTACH_TYPE' ? 'Ese tipo de archivo no se puede adjuntar: fotos, PDF o textos.' : e.message === 'ATTACH_BIG' ? 'El archivo es demasiado grande (25 MB como mucho).' : 'No se pudo leer «{n}».').replace('{n}', f.name)); })))).flat();
      // (A PDF's own figures — a paper's diagrams —: shown to the AI and put on their slides.)
      const figs = (await Promise.all(files.filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf').map(f => pdfFigures(f).catch(() => [])))).flat();
      const docs = read.filter(a => a.kind === 'text'); pics = [...figs, ...read.filter(a => a.kind === 'image')].slice(0, ATTACH.count);
      if (docs.length) source = docs.map(d => d.text).join('\n\n') + (source ? '\n\n' + source : '');
      const opts = { topic, source, count: +q('.ad-count').value, audience: q('.ad-aud').value.trim(), tone: q('.ad-tone').value,
        images: q('.ad-media').value === 'generate', media: q('.ad-media').value, attachments: pics, context: context(), ...(outline && { outline: outline.slides }) };
      await run(async () => {
        const r = await researched(opts); if (r) opts.research = r;
        const specs = await deck.createDeck(opts);
        if (r?.sources.length) specs.push(deck.sourcesSpec(r.sources, t('Fuentes consultadas')));   // (not «Fuentes»: in other languages, the fonts)
        // (A new one starts from a design with its layouts — the one chosen, or the AI's for the content —: its
        // slides are composed like the templates', not plain lists on an empty background.)
        if (q('.ad-new').checked) {
          const d = buildFromGallery(q('.ad-pal').value || specs.design || 'minimal'); ensureLayouts(d);
          if (specs.title) d.name = specs.title;
          replaceDeck(d);
        }
        // (Real pictures and videos for the slides that show something: searched, looked at, described — media.js.)
        if (opts.media === 'search') await deck.findMedia(specs, { topic: opts.topic || specs.title, onProgress: p => (q('.ad-prog').value = p) });
        const starter = q('.ad-new').checked ? new Set(state.deck.slides.map(s => s.id)) : null;
        await deck.insertSpecs(specs, { images: opts.images, figures: pics, onProgress: p => (q('.ad-prog').value = p) });
        // (The design's sample slides go: only the new presentation's own.)
        if (starter) commit(() => { state.deck.slides = state.deck.slides.filter(s => !starter.has(s.id)); state.ui.slideIndex = 0; });
      });
      try { sessionStorage.removeItem(DECK_DRAFT); } catch {}
      close();
    } catch (e) { alertDialog(t('No se pudo completar: ') + (e.message || e)); }
    finally { if (document.body.contains(back)) { q('.ad-go').disabled = false; q('.ad-plan').disabled = false; q('.ad-prog').hidden = true; } }
  });
}

// A quiz answered live from the phones, from the deck's content (features/ai/authoring.js addLiveQuiz).
async function openLiveQuiz() {
  if (!(await ready())) return;
  document.getElementById('lq-modal')?.remove();
  const back = document.createElement('div'); back.id = 'lq-modal'; back.className = 'modal-backdrop';
  const KIND = [['quiz', 'Preguntas con respuesta correcta y puntos'], ['match', 'Unir parejas'], ['order', 'Ordenar'], ['gaps', 'Completar huecos']];
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(480px,94vw);max-width:none"><button class="modal-close">✕</button><h3>${t('Cuestionario en directo')}</h3>
    <p class="host-help">${t('La IA lee la presentación y prepara preguntas y actividades que el público responde desde el móvil, con puntos y clasificación. Puedes editarlas después como cualquier votación.')}</p>
    <label class="fr-l">${t('Cuántas')}<input type="number" class="lq-n" min="1" max="15" value="5"></label>
    <fieldset><legend>${t('Tipos')}</legend>${KIND.map(([k, l], i) => `<label class="fr-chk"><input type="checkbox" value="${k}"${i < 2 ? ' checked' : ''}> ${t(l)}</label>`).join('')}</fieldset>
    <label class="fr-l">${t('Dónde')}<select class="lq-where"><option value="end">${t('Al final')}</option><option value="spread">${t('Cada una tras la diapositiva de la que trata')}</option></select></label>
    <div class="fr-actions"><span></span><button type="button" class="fr-do lq-go">✨ ${t('Crear')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.lq-go').addEventListener('click', async () => {
    const kinds = [...back.querySelectorAll('fieldset input:checked')].map(x => x.value); if (!kinds.length) return;
    close();
    const n = await run(() => deck.addLiveQuiz({ count: +q('.lq-n').value, kinds, where: q('.lq-where').value }));
    if (n) alertDialog(t('{n} diapositivas de cuestionario añadidas. Al presentar, el público responde desde el móvil.').replace('{n}', n));
  });
}

// A review of the whole deck: what to change, slide by slide; each point goes to its slide or to the assistant.
const REVIEW_NAMES = { message: 'Mensaje', text: 'Demasiado texto', structure: 'Estructura', consistency: 'Coherencia', spelling: 'Ortografía', accessibility: 'Accesibilidad', design: 'Diseño' };
async function openReview() {
  const r = await run(() => deck.reviewDeck()); if (!r) return;
  document.getElementById('rv-modal')?.remove();
  const back = document.createElement('div'); back.id = 'rv-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(620px,94vw);max-width:none"><button class="modal-close">✕</button><h3>${t('Revisar presentación')}</h3>
    ${r.summary ? `<p>${esc(r.summary)}</p>` : ''}
    ${r.items.length ? `<ol class="rv-list" style="padding-inline-start:22px;max-height:min(60vh,520px);overflow:auto">${r.items.map((x, i) => `<li style="margin:10px 0">
      <b>${x.slide ? `${t('Diapositiva')} ${x.slide}` : t('Toda la presentación')}</b> · <small>${t(REVIEW_NAMES[x.kind])}</small><br>${esc(x.issue)}
      ${x.fix ? `<div class="host-help" style="margin:2px 0 4px">→ ${esc(x.fix)}</div>` : ''}
      <span style="display:inline-flex;gap:6px">${x.slide ? `<button type="button" class="mini2" data-go="${x.slide}">${t('Ir a la diapositiva')}</button>` : ''}
        <button type="button" class="mini2" data-fix="${i}"><i class="ms">auto_awesome</i> ${t('Pedírselo al asistente')}</button></span></li>`).join('')}</ol>`
      : `<p>${t('No hay nada importante que cambiar.')}</p>`}</div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { commit(() => { state.ui.slideIndex = +b.dataset.go - 1; state.ui.selection = null; }, { history: false }); close(); }));
  back.querySelectorAll('[data-fix]').forEach(b => b.addEventListener('click', () => {
    const x = r.items[+b.dataset.fix];
    if (x.slide) commit(() => { state.ui.slideIndex = x.slide - 1; state.ui.selection = null; }, { history: false });
    askAssistant(`${x.slide ? `${t('En la diapositiva')} ${x.slide}: ` : ''}${x.issue}${x.fix ? ' — ' + x.fix : ''}`);
    close();
  }));
}

// (The assistant panel: assistant.js.)

Object.assign(AI_ACTIONS, {
  'ai-deck': () => openCreateDeck(),
  'ai-improve': () => run(() => deck.improveSlide()),
  'ai-agenda': () => run(() => deck.addAgenda()),
  'ai-quiz': () => run(async () => { const n = await deck.addQuiz(3); alertDialog(t('Preguntas añadidas al final: ') + n); }),
  'ai-livequiz': () => openLiveQuiz(),
  'ai-review': () => openReview(),
  'ai-voiceover': () => openVoiceover(),
});
