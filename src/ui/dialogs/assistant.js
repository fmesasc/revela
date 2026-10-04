// The assistant panel: the user asks, the agent (features/ai/agent.js) works
// in a few steps — shown as it goes, and it can be stopped — and proposes
// changes, grouped by slide with a picture before and after; the user ticks
// what to apply (one undo step), discards it, or asks for changes. Above: the
// scope (whole deck, this slide, the selection, slides N–M) and permissions.
// Quick actions start it; «Completar la presentación» (features/ai/complete.js)
// writes a half-made deck from its pictures, after a short brief and an estimate.
// Any proposed slide opens large, before and after (the viewer), to tick there and
// rewrite the proposed texts in place. What a change removes or replaces is shown
// (features/ai/review.js) and can be kept instead («Conservar lo que había»).

import { state, commit, undo, snapshot, slideSelCount } from '../../core/store.js';
import * as agent from '../../features/ai/agent.js';
import * as cmp from '../../features/ai/complete.js';
import * as rv from '../../features/ai/review.js';
import { STYLES } from '../../features/ai/fromspec.js';
import { PALETTES, FONT_PAIRS, deckFg, deckBodyFont, currentPalette } from '../../features/design/palettes.js';
import { masterBlocksFor, isEmptyPlaceholder, styled } from '../../features/document/master.js';
import { blockPreview } from '../shell/preview.js';
import { ready, aiFailed, aiErrorText } from './ai.js';
import { t } from '../../i18n/index.js';

// Remembered: permissions, scope kind, "apply without asking", the style of new slides, the completion's mode.
const KEY = 'revela.assistant.v1';
const prefs = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
const opts = { auto: !!prefs.auto, scope: ['all', 'current', 'slides', 'selection', 'range'].includes(prefs.scope) ? prefs.scope : 'all',
  perms: { ...agent.DEFAULT_PERMS, ...(prefs.perms || {}) }, style: STYLES.includes(prefs.style) ? prefs.style : 'same', from: 0, to: 0,
  mode: cmp.MODES.includes(prefs.mode) ? prefs.mode : 'empty' };
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify({ auto: opts.auto, scope: opts.scope, perms: opts.perms, style: opts.style, mode: opts.mode })); } catch {} };

const chatLog = [];                  // [{ role, content, shown, cost?, error? }] for the model and for display
let pending = null;                  // the proposal on screen: { ops, base, dropped, problems, message, cost, steps, done }
let job = null;                      // the running request: { ctrl, el }
let revising = false;                // the next message asks for changes to the proposal
let completing = null;               // the «Completar» card on screen: { kind: 'all' | 'current', edit }
let retry = null;                    // what the last failed request was, to try again
const spent = { usd: 0, credits: 0 };

export function toggleAssistant(on = !state.ui.showAssistant) { commit(() => { state.ui.showAssistant = on; }, { history: false }); }

const HINTS = ['Añade una diapositiva de conclusiones', 'Acorta todos los títulos', 'Escribe notas para todas las diapositivas', 'Convierte la diapositiva actual en una línea de tiempo',
  'Revisa que todos los textos quepan y no se solapen'];
// Quick actions: open the completion card, or ask something.
const QUICK = [{ icon: 'auto_fix_high', label: 'Completar la presentación', complete: 'all' }, { icon: 'note_add', label: 'Completar esta diapositiva', complete: 'current' },
  { icon: 'spellcheck', label: 'Revisar ortografía', ask: 'Revisa la ortografía y la gramática de todos los textos y las notas' }];
const STYLE_LABEL = { same: 'Como el resto', visual: 'Más visual', minimal: 'Minimalista', animated: 'Con animación', surprise: 'Sorpréndeme' };
const PERM_LABEL = { delete: 'Borrar diapositivas', design: 'Cambiar diseño, colores y tipografía', objects: 'Añadir o quitar objetos', animation: 'Animaciones y transiciones' };

export function renderAssistant() {
  let panel = document.getElementById('assistant-panel');
  if (!state.ui.showAssistant) { panel?.remove(); document.getElementById('as-viewer')?.remove(); return; }
  if (panel) { syncScope(panel); return; }
  panel = document.createElement('aside'); panel.id = 'assistant-panel';
  panel.innerHTML = `<div class="cm-head"><b><i class="ms">auto_awesome</i> ${t('Asistente')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div>
    <div class="as-opts">
      <label class="as-row"><span>${t('Alcance')}</span><select class="as-scope">
        <option value="all">${t('Toda la presentación')}</option><option value="current">${t('Diapositiva actual')}</option><option value="slides">${t('Diapositivas seleccionadas')}</option>
        <option value="selection">${t('Objetos seleccionados')}</option><option value="range">${t('De la diapositiva…')}</option></select></label>
      <div class="as-range" hidden><input type="number" class="as-from" min="1" aria-label="${t('Desde')}"> – <input type="number" class="as-to" min="1" aria-label="${t('Hasta')}"></div>
      <label class="as-row"><span>${t('Estilo de lo nuevo')}</span><select class="as-style">
        ${STYLES.map(k => `<option value="${k}">${t(STYLE_LABEL[k])}</option>`).join('')}</select></label>
      <details class="as-perms"><summary>${t('Permisos')} <span class="as-psum"></span></summary>
        ${agent.PERMS.map(p => `<label class="as-chk"><input type="checkbox" data-perm="${p}"${opts.perms[p] ? ' checked' : ''}> ${t(PERM_LABEL[p])}</label>`).join('')}
        <label class="as-chk as-auto"><input type="checkbox" class="as-autochk"${opts.auto ? ' checked' : ''}> ${t('Aplicar sin preguntar')}</label>
        <p class="as-note">${t('Siempre puede cambiar textos, notas y añadir diapositivas. Lo que no permitas se descarta al aplicar.')}</p>
      </details>
    </div>
    <div class="as-log" aria-live="polite"><div class="as-empty"><i class="ms">auto_awesome</i><p>${t('Pide un cambio, haz una pregunta o empieza por una de estas acciones:')}</p></div></div>
    <div class="as-quick">${QUICK.map((a, i) => `<button type="button" class="as-qa" data-q="${i}"><i class="ms">${a.icon}</i>${t(a.label)}</button>`).join('')}</div>
    <div class="as-hints">${HINTS.map(h => `<button type="button" class="as-hint">${t(h)}</button>`).join('')}</div>
    <div class="cm-new"><textarea rows="2" placeholder="${t('Pide un cambio o haz una pregunta…')}"></textarea>
      <div class="as-foot"><span class="as-cost"></span><span class="as-keys">${t('Intro para enviar · Mayús+Intro, nueva línea')}</span><button type="button" class="as-send">${t('Enviar')}</button></div></div>`;
  document.querySelector('main').appendChild(panel);
  const q = s => panel.querySelector(s), log = q('.as-log'), ta = q('textarea');
  for (const m of chatLog) if (m.shown !== '') addMsg(log, m.role === 'user' ? 'me' : 'ai', m.shown ?? m.content, m);
  if (pending) put(log, proposalCard(pending));
  if (completing) put(log, completeCard(completing));
  if (job) put(log, job.el);
  showCost(panel);
  q('.as-scope').value = opts.scope;
  q('.as-scope').addEventListener('change', e => { opts.scope = e.target.value; keep(); syncScope(panel, true); refreshEstimate(); });
  q('.as-style').value = opts.style;
  q('.as-style').addEventListener('change', e => { opts.style = e.target.value; keep(); });
  for (const inp of [q('.as-from'), q('.as-to')]) inp.addEventListener('change', () => { opts.from = +q('.as-from').value || 1; opts.to = +q('.as-to').value || opts.from; refreshEstimate(); });
  panel.querySelectorAll('[data-perm]').forEach(c => c.addEventListener('change', () => { opts.perms[c.dataset.perm] = c.checked; keep(); permSummary(panel); }));
  q('.as-autochk').addEventListener('change', e => { opts.auto = e.target.checked; keep(); });
  permSummary(panel); syncScope(panel, true);
  const send = () => { const text = ta.value.trim(); if (text && !job) { ta.value = ''; grow(ta); ask(panel, text); } };
  q('.as-send').addEventListener('click', send);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  ta.addEventListener('input', () => grow(ta));
  panel.querySelectorAll('.as-hint').forEach(h => h.addEventListener('click', () => { if (!job) ask(panel, h.textContent); }));
  panel.querySelectorAll('.as-qa').forEach(b => b.addEventListener('click', () => {
    if (job) return;
    const a = QUICK[+b.dataset.q];
    if (a.complete) openComplete(a.complete); else ask(panel, t(a.ask));
  }));
  q('.cm-close').addEventListener('click', () => toggleAssistant(false));
  if (job) q('.as-send').setAttribute('disabled', '');
  stick(log, true);
}
const curPanel = () => document.getElementById('assistant-panel');
// The input grows with what is typed (up to a few lines).
const grow = ta => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight + 2) + 'px'; };
// The conversation stays at the bottom while new things come in, unless the user scrolled up to read.
function stick(log, force = false) { if (log && (force || log.dataset.pinned !== '0')) log.scrollTop = log.scrollHeight; }
function put(log, el) {
  log.closest('#assistant-panel')?.classList.add('as-started');           // (the suggestions: one row, to leave room)
  const pinned = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  log.appendChild(el);
  if (!log.dataset.watch) { log.dataset.watch = '1'; log.addEventListener('scroll', () => { log.dataset.pinned = log.scrollHeight - log.scrollTop - log.clientHeight < 60 ? '1' : '0'; }); }
  if (pinned) log.dataset.pinned = '1';
  stick(log);
  return el;
}

// ---- Messages: a little Markdown (lists, **bold**, *italics*, `code`) -----------------------------
const escHTML = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const inlineMd = s => escHTML(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=$|[\s).,;:!?])/g, '$1<i>$2</i>');
export function mdHTML(text) {
  const out = []; let list = null;
  const close = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim(), ul = /^[-*•]\s+(.*)$/.exec(line), ol = /^\d{1,2}[.)]\s+(.*)$/.exec(line);
    const m = ul || ol, tag = ul ? 'ul' : 'ol';
    if (m) { if (list && list.tag !== tag) close(); (list ||= { tag, items: [] }).items.push(inlineMd(m[1])); continue; }
    close();
    if (!line) { if (out.length && out.at(-1) !== '<br>') out.push('<br>'); continue; }
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    out.push(h ? `<p><b>${inlineMd(h[1])}</b></p>` : `<p>${inlineMd(line)}</p>`);
  }
  close();
  while (out.at(-1) === '<br>') out.pop();
  return out.join('');
}
// m: { cost, error, retry }
function addMsg(log, who, text, m = {}) {
  const d = document.createElement('div'); d.className = 'as-msg ' + who + (m.error ? ' err' : '');
  if (who === 'me') d.textContent = text; else d.innerHTML = mdHTML(text);
  const c = m.cost && costText(m.cost);
  if (c) d.insertAdjacentHTML('beforeend', `<div class="as-mcost">${escHTML(c)}</div>`);
  if (m.error && retry) {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'mini2 as-retry', innerHTML: `<i class="ms">refresh</i> ${t('Reintentar')}` });
    b.addEventListener('click', () => { if (job || !retry) return; const r = retry; retry = null; d.remove(); const i = chatLog.indexOf(m); if (i >= 0) chatLog.splice(i, 1); r(); });
    d.appendChild(b);
  }
  return put(log, d);
}
function failed(e, again) {
  const lg = curPanel()?.querySelector('.as-log');
  if (e.message === 'STOPPED') { const m = { role: 'assistant', content: t('Detenido.'), shown: t('Detenido.'), display: true }; chatLog.push(m); if (lg) addMsg(lg, 'ai', m.shown, m); return; }
  if (e.message === 'NO_CREDIT' || e.message === 'NO_KEY') aiFailed(e);                 // (they need the account or the settings)
  retry = again;
  const m = { role: 'assistant', content: '', shown: aiErrorText(e), error: true, display: true }; chatLog.push(m);
  if (lg) addMsg(lg, 'ai', m.shown, m);
}

function permSummary(panel) {
  const on = agent.PERMS.filter(p => opts.perms[p]).length;
  panel.querySelector('.as-psum').textContent = `${on}/${agent.PERMS.length}`;
}
// The range's numbers follow the deck; "selection" needs something selected.
function syncScope(panel, init = false) {
  const n = state.deck.slides.length, from = panel.querySelector('.as-from'), to = panel.querySelector('.as-to');
  if (init || !from.value) {                                         // (at first: the current slide)
    opts.from = Math.min(opts.from || state.ui.slideIndex + 1, n); opts.to = Math.min(Math.max(opts.to, opts.from), n); from.value = opts.from; to.value = opts.to;
  }
  from.max = to.max = n;
  panel.querySelector('.as-range').hidden = opts.scope !== 'range';
  // «Diapositivas seleccionadas»: only while several are selected in the slides panel.
  const many = slideSelCount() > 1, sl = panel.querySelector('.as-scope option[value="slides"]');
  sl.hidden = sl.disabled = !many;
  if (!many && opts.scope === 'slides') { opts.scope = 'current'; panel.querySelector('.as-scope').value = 'current'; }
}
function showCost(panel) {
  const el = panel?.querySelector('.as-cost'); if (!el) return;
  el.textContent = spent.credits ? `${t('Gastado')}: ${spent.credits} ${t('créditos')}` : spent.usd ? `${t('Gastado')}: ${spent.usd.toFixed(4)} US$` : '';
}
const costText = c => (c.credits ? `${c.credits} ${t('créditos')}` : c.usd ? `${c.usd.toFixed(4)} US$` : '');

// ---- A request at work: its step, a bar when it counts, and «Detener» ----------------------------
function startJob(firstStep) {
  const ctrl = new AbortController(), el = document.createElement('div'); el.className = 'as-progress';
  el.innerHTML = `<span class="as-spin"></span><span class="as-step"></span><button type="button" class="as-stop">${t('Detener')}</button><span class="as-bar" hidden><i></i></span>`;
  el.querySelector('.as-step').textContent = firstStep;
  el.querySelector('.as-stop').addEventListener('click', () => ctrl.abort());
  job = { ctrl, el };
  const lg = curPanel()?.querySelector('.as-log'); if (lg) put(lg, el);
  curPanel()?.querySelector('.as-send')?.setAttribute('disabled', '');
  return job;
}
function stepJob(text, frac = null) {
  if (!job) return;
  job.el.querySelector('.as-step').textContent = text;
  const bar = job.el.querySelector('.as-bar'); bar.hidden = frac == null;
  if (frac != null) bar.firstChild.style.width = Math.round(Math.max(0.03, Math.min(1, frac)) * 100) + '%';
}
function endJob() {
  job?.el.remove(); job = null;
  curPanel()?.querySelector('.as-send')?.removeAttribute('disabled');
  stick(curPanel()?.querySelector('.as-log'));
}

const STEP = { think: s => (s.step > 1 ? t('Pensando…') : t('Leyendo la presentación…')), look: s => t('Mirando la diapositiva {n}…').replace('{n}', s.slide),
  check: () => t('Comprobando que todo cabe…'), search: () => t('Buscando imágenes…') };

async function ask(panel, text) {
  if (!(await ready())) return;
  const scope = { kind: opts.scope, from: opts.from, to: opts.to };
  const lg0 = () => curPanel()?.querySelector('.as-log');
  if (scope.kind === 'selection' && !(state.ui.multi?.length || state.ui.selection)) { addMsg(lg0(), 'ai', t('Selecciona primero uno o varios objetos de la diapositiva.')); return; }
  const request = revising && pending ? `About your last proposal: ${text}` : text;
  if (pending && !pending.done) settle('replaced');
  revising = false; curPanel()?.querySelector('textarea')?.setAttribute('placeholder', t('Pide un cambio o haz una pregunta…'));
  addMsg(lg0(), 'me', text);
  const me = { role: 'user', content: request, shown: text, display: true }; chatLog.push(me);
  startJob(t('Leyendo la presentación…'));
  const before = { ...spent }, ctrl = job.ctrl;
  try {
    const res = await agent.runAgent(request, { history: chatLog.filter(m => !m.error && m.content && m !== me).map(({ role, content }) => ({ role, content })), scope, perms: { ...opts.perms }, style: opts.style, signal: ctrl.signal,
      onStep: s => stepJob(STEP[s.kind]?.(s) || t('Pensando…')),
      onCost: c => { spent.credits = before.credits + c.credits; spent.usd = before.usd + c.usd; showCost(curPanel()); } });
    const reply = { role: 'assistant', content: JSON.stringify({ message: res.message, ops: res.raw }).slice(0, 12000), shown: res.message || (res.ops.length ? '' : t('Hecho.')), cost: res.cost };
    chatLog.push(reply);
    const lg = lg0();
    if (res.message || !res.ops.length) { reply.shown = res.message || t('No hay cambios que proponer.'); lg && addMsg(lg, 'ai', reply.shown, reply); }
    else reply.shown = '';
    if (res.ops.length || res.dropped.length) showProposal(res);
  } catch (e) {
    chatLog.splice(chatLog.indexOf(me), 1);
    failed(e, () => ask(curPanel(), text));
  } finally { endJob(); }
}
function showProposal(res) {
  pending = { ...res, base: snapshot(state.deck), done: null };
  // («Mejorar también lo escrito»: what the author wrote is protected at first.)
  pending.review = { protect: false, on: new Set(res.ops.map((_, i) => i)), keep: new Set(), edits: new Map() };
  if (res.mode === 'improve') protect(pending, true);
  if (opts.auto && res.ops.length) applyPending(chosenOf(pending));
  const lg = curPanel()?.querySelector('.as-log'); if (lg) put(lg, proposalCard(pending));
}

// ---- «Completar la presentación» ---------------------------------------------------------------------
export function openComplete(kind = 'all', { edit = false } = {}) {
  if (!state.ui.showAssistant) toggleAssistant(true);
  document.querySelector('#assistant-panel .as-cmp')?.remove();
  completing = { kind, edit };
  const lg = curPanel()?.querySelector('.as-log'); if (lg) put(lg, completeCard(completing));
}
const scopeFor = kind => (kind === 'current' ? { kind: 'current' } : { kind: opts.scope === 'selection' ? 'current' : opts.scope, from: opts.from, to: opts.to });
function estimateText(e) {
  const parts = [];
  if (e.images) parts.push(t('{n} imágenes por describir').replace('{n}', e.images));
  if (e.cached) parts.push(t('{n} ya descritas (gratis)').replace('{n}', e.cached));
  parts.push(e.slides === 1 ? t('1 diapositiva por escribir') : t('{n} diapositivas por escribir').replace('{n}', e.slides));
  const price = e.account ? `≈ ${e.credits} ${t('créditos')}` : `≈ ${e.usd < 0.01 ? e.usd.toFixed(4) : e.usd.toFixed(3)} US$`;
  return { parts: parts.join(' · '), price };
}
function refreshEstimate() {
  const card = document.querySelector('#assistant-panel .as-cmp'); if (!card || !completing || card.querySelector('.as-bform')) return;
  const box = card.querySelector('.as-est'), e = cmp.estimateCompletion({ scope: scopeFor(completing.kind), mode: opts.mode }), x = estimateText(e);
  box.innerHTML = e.slides ? `<span>${escHTML(x.parts)}</span> <b>${escHTML(x.price)}</b>` : `<span>${t('No hay nada vacío que completar aquí.')}</span>`;
  card.querySelector('.as-go').disabled = !e.slides;
  const one = card.querySelector('.as-go1');
  if (one) { const e1 = cmp.estimateCompletion({ scope: { kind: 'current' }, mode: opts.mode }); one.disabled = !e1.slides;
    one.textContent = `${t('Solo esta diapositiva')}${e1.slides ? ` (${estimateText(e1).price})` : ''}`; }
}
function completeCard(c) {
  const card = document.createElement('div'); card.className = 'as-cmp';
  const brief = cmp.briefOf();
  const head = `<div class="as-ptitle"><i class="ms">auto_fix_high</i> ${c.kind === 'current' ? t('Completar esta diapositiva') : t('Completar la presentación')}<button type="button" class="as-x" title="${t('Cerrar')}">✕</button></div>`;
  if (!brief || c.edit) {
    const g = brief || cmp.guessBrief();
    card.innerHTML = `${head}<form class="as-bform"><p class="as-note">${t('Tres preguntas sobre la presentación, una sola vez: se guardan con ella y la IA las usa cada vez.')}</p>
      <label>${t('¿De qué trata?')}<textarea name="topic" rows="3" required>${escHTML(g.topic)}</textarea></label>
      <label>${t('¿Para quién?')}<input name="audience" value="${escHTML(g.audience)}" placeholder="${t('p. ej. alumnos que empiezan')}"></label>
      <label>${t('¿Qué deben llevarse?')}<input name="takeaway" value="${escHTML(g.takeaway)}" placeholder="${t('p. ej. saber hacer su primer informe')}"></label>
      <div class="as-actions"><button type="submit" class="fr-do">${t('Guardar')}</button>${brief ? `<button type="button" class="mini2 as-bcancel">${t('Cancelar')}</button>` : ''}</div></form>`;
    const f = card.querySelector('form');
    f.addEventListener('submit', e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(f));
      if (!String(d.topic || '').trim()) { f.topic.focus(); return; }
      cmp.saveBrief(d); completing = { ...c, edit: false }; card.replaceWith(completeCard(completing)); refreshEstimate();
    });
    card.querySelector('.as-bcancel')?.addEventListener('click', () => { completing = { ...c, edit: false }; card.replaceWith(completeCard(completing)); refreshEstimate(); });
  } else {
    card.innerHTML = `${head}<div class="as-brief"><span><b>${t('Contexto')}:</b> ${escHTML(snip(brief.topic, 90))}${brief.audience ? ` · ${escHTML(snip(brief.audience, 40))}` : ''}</span>
        <button type="button" class="as-link as-bedit">${t('Editar')}</button></div>
      <div class="as-modes" role="radiogroup">
        <label class="as-chk"><input type="radio" name="as-mode" value="empty"${opts.mode === 'empty' ? ' checked' : ''}> ${t('Solo lo vacío')}</label>
        <label class="as-chk"><input type="radio" name="as-mode" value="improve"${opts.mode === 'improve' ? ' checked' : ''}> ${t('Mejorar también lo escrito')}</label></div>
      <p class="as-note">${t('La IA mira cada imagen una vez (reducida) y escribe títulos, puntos y notas. Nada cambia hasta que apliques la propuesta.')}</p>
      <div class="as-est"></div>
      <div class="as-actions"><button type="button" class="fr-do as-go">${t('Completar')}</button>${c.kind === 'current' ? '' : '<button type="button" class="mini2 as-go1"></button>'}</div>`;
    card.querySelector('.as-bedit').addEventListener('click', () => { completing = { ...c, edit: true }; card.replaceWith(completeCard(completing)); });
    card.querySelectorAll('input[name="as-mode"]').forEach(r => r.addEventListener('change', () => { opts.mode = r.value; keep(); refreshEstimate(); }));
    card.querySelector('.as-go').addEventListener('click', () => runComplete(scopeFor(c.kind)));
    card.querySelector('.as-go1')?.addEventListener('click', () => runComplete({ kind: 'current' }));
  }
  card.querySelector('.as-x').addEventListener('click', () => { completing = null; card.remove(); });
  queueMicrotask(refreshEstimate);
  return card;
}
async function runComplete(scope) {
  if (job || !(await ready())) return;
  const label = scope.kind === 'current' ? t('Completar esta diapositiva') : t('Completar la presentación');
  completing = null; document.querySelector('#assistant-panel .as-cmp')?.remove();
  if (pending && !pending.done) settle('replaced');
  const lg0 = () => curPanel()?.querySelector('.as-log');
  addMsg(lg0(), 'me', label);
  const me = { role: 'user', content: label, shown: label, display: true }; chatLog.push(me);
  startJob(t('Leyendo la presentación…'));
  const before = { ...spent };
  try {
    const res = await cmp.completeDeck({ scope, mode: opts.mode, signal: job.ctrl.signal,
      onStep: s => s.kind === 'describe' ? stepJob(t('Describiendo imágenes {a}/{b}…').replace('{a}', s.done).replace('{b}', s.total), s.total ? s.done / s.total : 0)
        : stepJob(s.from === s.to ? t('Escribiendo la diapositiva {a}…').replace('{a}', s.from) : t('Escribiendo diapositivas {a}–{b}…').replace('{a}', s.from).replace('{b}', s.to), s.total ? s.done / s.total : 0),
      onCost: c => { spent.credits = before.credits + c.credits; spent.usd = before.usd + c.usd; showCost(curPanel()); } });
    const st = res.stats;
    let msg = !res.ops.length ? t('No hay cambios que proponer.')
      : (st.slides === 1 ? t('He escrito 1 diapositiva.') : t('He escrito {n} diapositivas.').replace('{n}', st.slides));
    if (st.described) msg += ' ' + t('Imágenes descritas: {n}.').replace('{n}', st.described);
    if (st.cached) msg += ' ' + t('Ya descritas antes, sin coste: {n}.').replace('{n}', st.cached);
    if (st.failed) msg += ' ' + t('{n} imágenes no se pudieron leer.').replace('{n}', st.failed);
    if (res.ops.length) msg += '\n' + t('Revisa la propuesta: pulsa una diapositiva para verla en grande.');
    const reply = { role: 'assistant', content: msg, shown: msg, cost: res.cost }; chatLog.push(reply);
    const lg = lg0(); if (lg) addMsg(lg, 'ai', msg, reply);
    if (res.ops.length) showProposal({ ...res, message: msg });
  } catch (e) {
    chatLog.splice(chatLog.indexOf(me), 1);
    failed(e, () => runComplete(scope));
  } finally { endJob(); }
}

// ---- The proposal ------------------------------------------------------------------
// The user's review of it (pending.review): which changes are ticked (`on`), kept
// («Conservar lo que había»: `keep`) and edited (`edits`: index → { html | notes | alt }).
const effective = (p, i) => rv.effectiveOp(p.ops[i], { keep: p.review.keep.has(i), edit: p.review.edits.get(i) }, p.base);
const chosenOf = p => p.ops.map((_, i) => i).filter(i => p.review.on.has(i)).map(i => effective(p, i)).filter(Boolean);
// «Proteger mi contenido»: what removes the author's content starts unticked, what replaces it kept and added to.
function protect(p, on) {
  const r = p.review, d = rv.protectDefaults(p.ops, p.base);
  r.protect = on;
  p.ops.forEach((o, i) => {
    if (!rv.lossOf(o, p.base)) return;
    const x = on ? d[i] : { on: true, keep: false };
    if (x.on) r.on.add(i); else r.on.delete(i);
    if (x.keep !== r.keep.has(i)) { r.edits.delete(i); if (x.keep) r.keep.add(i); else r.keep.delete(i); }
  });
}
function applyPending(ops) {
  const n = agent.applyOps(ops);
  pending.done = 'applied'; pending.applied = ops; pending.count = n;
}
function settle(how) {
  if (!pending) return;
  pending.done = how;
  const old = document.querySelector('#assistant-panel .as-prop:not(.settled)');
  if (old) old.replaceWith(proposalCard(pending));
  document.getElementById('as-viewer')?.remove();
  if (how !== 'applied') pending = null;
}

// Plain-language line for each change.
const snip = (s, n = 36) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const TYPE = { text: 'Texto', shape: 'Forma', image: 'Imagen', chart: 'Gráfico', table: 'Tabla', icon: 'Icono', model: 'Modelo 3D', video: 'Vídeo', audio: 'Audio',
  code: 'Código', math: 'Ecuación', diagram: 'Diagrama', connector: 'Conector' };
const objName = b => (!b ? t('Objeto') : (b.type === 'text' || b.html) && agent.textOf(b.html) ? `«${snip(agent.textOf(b.html), 30)}»`
  : b.ph === 'title' || b.ph === 'ctrTitle' ? t('Título') : b.ph === 'body' ? t('Cuerpo') : t(TYPE[b.type] || 'Objeto'));
const PROP = { x: 'posición', y: 'posición', w: 'tamaño', h: 'tamaño', rotation: 'giro', opacity: 'opacidad', fontSize: 'tamaño de letra', color: 'color',
  fontFamily: 'tipo de letra', textAlign: 'alineación', fontWeight: 'negrita', fontStyle: 'cursiva', bg: 'fondo', vAlign: 'alineación vertical', lineHeight: 'interlineado',
  wordart: 'WordArt', fill: 'relleno', stroke: 'borde', strokeWidth: 'grosor del borde', shape: 'forma', icon: 'icono', alt: 'texto alternativo', fit: 'ajuste',
  chartType: 'tipo de gráfico', seriesName: 'nombre de la serie', headBg: 'colores de la tabla', headFg: 'colores de la tabla', band: 'colores de la tabla',
  autoRotate: 'giro automático', spin: 'velocidad de giro' };
const ARRANGE = { 'image-right': 'imagen a la derecha', 'image-left': 'imagen a la izquierda', 'image-full-caption': 'imagen grande con pie', 'image-full': 'imagen bajo el título' };
export function describe(o, deck) {
  const s = o.sid && deck.slides.find(x => x.id === o.sid), b = s && o.id ? s.blocks.find(x => x.id === o.id) : null;
  const sw = c => `<span class="as-sw" style="background:${c}"></span>`;
  const e = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  switch (o.op) {
    case 'set_text': return e(t('Texto {a} → «{b}»').replace('{a}', objName(b)).replace('{b}', snip(agent.textOf(agent.toHTML(o.text)).replace(/^- /gm, '').replace(/\n+/g, ' · '), 60)))
      + (o.arrange ? ` <span class="as-arr">· ${e(t(ARRANGE[o.arrange.layout] || 'Reorganizar la diapositiva'))}</span>` : '');
    case 'set_notes': return e(t('Notas del orador nuevas')) + (o.notes ? ` <span class="as-arr">«${e(snip(o.notes, 70))}»</span>` : '');
    case 'set_hidden': return e(o.hidden ? t('Ocultar la diapositiva') : t('Mostrar la diapositiva'));
    case 'delete_slide': return e(t('Borrar la diapositiva'));
    case 'move_slide': return e(t('Mover a la posición {n}').replace('{n}', o.to));
    case 'add_slide': return e(t('Diapositiva nueva: «{a}»').replace('{a}', snip(o.spec.title || o.spec.quote || o.spec.kind, 50)));
    case 'replace_slide': return e(t('Rehacer la diapositiva: «{a}»').replace('{a}', snip(o.spec.title || o.spec.kind, 50)));
    case 'set_background': return e(t('Fondo')) + ' ' + sw(o.color) + ' ' + e(o.color);
    case 'apply_palette': return e(t('Paleta de colores «{a}»').replace('{a}', t(PALETTES[o.name].name))) + ' ' + PALETTES[o.name].accents.slice(0, 4).map(sw).join('');
    case 'set_fonts': return e(t('Tipografía «{a}»').replace('{a}', t(FONT_PAIRS[o.pair].name)));
    case 'set_layout': return e(t('Nueva disposición: «{a}»').replace('{a}', t(o.layout)));
    case 'set_props': return e(`${objName(b)}: ${[...new Set(Object.keys(o.props).map(k => t(PROP[k] || k)))].join(', ')}`)
      + (o.props.color || o.props.fill ? ' ' + sw(o.props.color || o.props.fill) : '') + (o.props.alt ? ` <span class="as-arr">«${e(snip(o.props.alt, 60))}»</span>` : '');
    case 'add_object': { const x = o.object;
      return e(t('Añadir: {a}').replace('{a}', `${t(TYPE[x.type])}${x.type === 'text' ? ` «${snip(agent.textOf(x.html), 40)}»` : x.type === 'icon' ? ` (${x.icon})` : x.type === 'image' ? ` «${snip(x.alt, 40)}»` : x.type === 'table' ? ` ${x.rows.length}×${x.rows[0].length}` : ''}`)); }
    case 'delete_object': return e(t('Quitar {a}').replace('{a}', objName(b)));
    case 'set_chart_data': return e(t('Datos del gráfico: {a}').replace('{a}', snip(o.data.map(d => `${d.label} ${d.value}`).join(', '), 60)));
    case 'set_table': return e(t('Contenido de la tabla ({n})').replace('{n}', `${o.rows.length}×${o.rows[0].length}`));
    case 'set_animation': return e(o.effect ? t('Animación «{a}» en {b}').replace('{a}', o.effect).replace('{b}', objName(b)) : t('Sin animación en {b}').replace('{b}', objName(b)));
    case 'set_transition': return e(o.transition ? t('Transición «{a}»').replace('{a}', o.transition) : t('Sin transición'));
  }
  return e(o.op);
}
const WHY = { scope: 'fuera del alcance', 'perm:delete': 'sin permiso para borrar diapositivas', 'perm:design': 'sin permiso para cambiar el diseño',
  'perm:objects': 'sin permiso para añadir o quitar objetos', 'perm:animation': 'sin permiso para animaciones y transiciones', slide: 'la diapositiva no existe',
  id: 'el objeto no existe', type: 'tipo de objeto no permitido', range: 'se saldría de la diapositiva', value: 'valor no válido', prop: 'propiedad no permitida', op: 'operación desconocida' };
const OP_LABEL = { set_text: 'Cambiar un texto', set_notes: 'Cambiar las notas', set_hidden: 'Ocultar o mostrar', delete_slide: 'Borrar una diapositiva', move_slide: 'Mover una diapositiva',
  add_slide: 'Añadir una diapositiva', replace_slide: 'Rehacer una diapositiva', set_background: 'Cambiar el fondo', apply_palette: 'Cambiar la paleta', set_fonts: 'Cambiar la tipografía',
  set_layout: 'Reorganizar la diapositiva', set_props: 'Cambiar un objeto', add_object: 'Añadir un objeto', delete_object: 'Quitar un objeto', set_chart_data: 'Cambiar los datos de un gráfico',
  set_table: 'Cambiar una tabla', set_animation: 'Cambiar una animación', set_transition: 'Cambiar la transición' };
const PROBLEM = { overflow: 'no cabe en su cuadro', offslide: 'se sale de la diapositiva', overlap: 'textos encimados', over: 'texto encima de otro objeto', contrast: 'poco contraste' };

// A slide's picture (as in the slide navigator), with the changed objects outlined; `lose`:
// what a change removes or replaces there (id → 'remove' | 'replace'; '*' the whole slide), in red.
function thumb(slide, deck, mark = new Set(), w = THUMB, lose = null) {
  const { w: W, h: H } = deck.size, k = w / W;
  const box = document.createElement('div'); box.className = 'as-th' + (lose?.has('*') ? ' as-loseall' : '');
  box.style.cssText = `width:${w}px;height:${Math.round(H * k)}px;background:${slide.background || currentPalette(deck).bg}`;
  const inner = document.createElement('div');
  inner.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform:scale(${k});transform-origin:0 0;color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'}`;
  const outline = (b, cls) => { const m = document.createElement('div'); m.className = cls; m.style.cssText = `left:${b.x - 6}px;top:${b.y - 6}px;width:${b.w + 12}px;height:${b.h + 12}px;border-width:${Math.round(2 / k)}px`; inner.appendChild(m); return m; };
  for (const b of [...masterBlocksFor(slide, deck), ...slide.blocks.map(x => styled(x, slide, deck))]) {
    if (isEmptyPlaceholder(b)) continue;
    try { const el = blockPreview(b, slide); el.dataset.bid = b.id; inner.appendChild(el); } catch {}
    if (mark.has(b.id)) outline(b, 'as-mark');
    if (lose?.has(b.id)) {
      const m = outline(b, 'as-mark as-lose');
      if (w >= 300) m.innerHTML = `<span style="font-size:${Math.round(12 / k)}px">${escHTML(lose.get(b.id) === 'remove' ? t('Se quita') : t('Se sustituye'))}</span>`;
    }
  }
  box.appendChild(inner);
  return box;
}
const THUMB = 146;

// ---- One change in the list: what it does, what it takes away (struck through), «Conservar lo que había»,
// «Editado por ti» / «Restaurar la propuesta»; in the viewer, the proposed notes and descriptions to edit.
const badges = (edited, kept) => (kept ? ` <span class="as-badge as-kept">${t('Se conserva lo que había')}</span>` : '') + (edited ? ` <span class="as-badge">${t('Editado por ti')}</span>` : '');
function rowDesc(p, i) {
  const r = p.review, o = p.ops[i], eff = effective(p, i), loss = !r.keep.has(i) && rv.lossOf(eff || o, p.base);
  return (loss ? `<span class="as-tag">${escHTML(loss.kind === 'remove' ? t('Quita') : t('Sustituye'))}</span> ` : '') + describe(eff || o, p.base) + badges(r.edits.has(i) && !!eff, r.keep.has(i));
}
// The text after the change (as kept or edited), to compare with what there was.
const afterOf = (eff, loss) => (!eff || eff.op === 'add_slide' ? loss.before : eff.op === 'set_text' ? agent.textOf(eff.html ?? agent.toHTML(eff.text))
  : eff.op === 'set_notes' ? eff.notes : eff.op === 'set_props' ? (eff.props.alt ?? loss.before) : loss.after);
// Removed words struck through, added ones underlined; lines kept, "- " as bullets.
function diffHTML(a, b) {
  const parts = rv.diffWords(a, b);
  if (!parts.some(x => x.k !== 'same')) return '';
  let out = '', dash = 0, n = 0;
  for (const x of parts) {
    if (++n > 160) { out += '…'; break; }
    if (x.t === '\n') { if (!out.endsWith('<br>')) out += '<br>'; dash = 0; continue; }
    if (dash >= 0 && x.t === '-') { dash++; continue; }
    if (dash > 0) out += ' '.repeat(dash - 1) + '• ';              // (a sub-point: indented, one bullet)
    const w = escHTML(x.t); dash = -1;
    out += x.k === 'del' ? `<del>${w}</del> ` : x.k === 'ins' ? `<ins>${w}</ins> ` : w + ' ';
  }
  return out;
}
function rowMore(p, i) {
  const r = p.review, o = p.ops[i], loss = r.on.has(i) && rv.lossOf(o, p.base);
  let h = '';
  if (loss) {
    const d = loss.before.trim() && diffHTML(loss.before, afterOf(effective(p, i), loss));
    if (d) h += `<div class="as-diff">${d}</div>`;
    h += `<label class="as-keep"><input type="checkbox" data-keep="${i}"${r.keep.has(i) ? ' checked' : ''}> ${t('Conservar lo que había')}</label>`;
  }
  if (r.edits.has(i)) h += `<button type="button" class="as-link as-restore" data-restore="${i}">${t('Restaurar la propuesta')}</button>`;
  return h;
}
function rowEdit(p, i) {
  const ed = p.review.on.has(i) && rv.editable(effective(p, i));
  if (!ed || ed.field === 'html') return '';
  return ed.field === 'notes' ? `<textarea class="asv-field" data-edit="${i}" rows="3" aria-label="${t('Notas del orador')}">${escHTML(ed.value)}</textarea>`
    : `<input class="asv-field" data-edit="${i}" aria-label="${t('Texto alternativo')}" value="${escHTML(ed.value)}">`;
}
function opRow(p, i, viewer = false) {
  if (p.done === 'applied') { const o = p.applied[i]; return `<div class="as-oprow"><label class="as-op"><i class="ms">check</i><span>${describe(o, p.base)}${badges(o.edited, o.kept)}</span></label></div>`; }
  return `<div class="as-oprow${p.review.on.has(i) ? '' : ' off'}" data-row="${i}"><label class="as-op"><input type="checkbox" ${viewer ? 'data-k' : 'data-i'}="${i}"${p.review.on.has(i) ? ' checked' : ''}><span class="as-opdesc">${rowDesc(p, i)}</span></label>`
    + `<div class="as-opmore">${rowMore(p, i)}</div>${viewer ? rowEdit(p, i) : ''}</div>`;
}
// The rows again after a change of the review (the field being typed in stays; focus stays where it was).
function syncRows(box, p, viewer = false) {
  const act = document.activeElement, key = act && box.contains(act) && [...act.attributes].find(a => /^data-(i|k|keep|restore)$/.test(a.name));
  for (const row of [...box.querySelectorAll('.as-oprow[data-row]')]) {
    const i = +row.dataset.row, f = row.querySelector('.asv-field');
    if (f && f === act) { row.querySelector('.as-opdesc').innerHTML = rowDesc(p, i); row.querySelector('.as-opmore').innerHTML = rowMore(p, i); continue; }
    row.outerHTML = opRow(p, i, viewer);
  }
  if (key) box.querySelector(`[${key.name}="${CSS.escape(key.value)}"]`)?.focus();
}
const toggleOn = (p, i, on) => { if (on) p.review.on.add(i); else p.review.on.delete(i); };
const toggleKeep = (p, i, on) => { p.review.edits.delete(i); if (on) p.review.keep.add(i); else p.review.keep.delete(i); };

function proposalCard(p) {
  const card = document.createElement('div'); card.className = 'as-prop' + (p.done ? ' settled' : '');
  const base = p.base, ro = p.done === 'applied', ops = ro ? p.applied : p.ops, r = p.review;
  if (p.done && !ro) { card.innerHTML = `<p class="as-note">${p.done === 'replaced' ? t('Propuesta sustituida por la nueva petición.') : t('Propuesta descartada.')}</p>`; return card; }
  // Groups: the whole deck first, then each slide in order (new slides after the one they follow).
  const order = s => base.slides.findIndex(x => x.id === s);
  const groups = new Map();
  ops.forEach((o, i) => {
    const key = ['apply_palette', 'set_fonts'].includes(o.op) || o.all ? 'deck' : o.newId ? 'new:' + o.newId : o.sid;
    if (!groups.has(key)) groups.set(key, { key, items: [], pos: key === 'deck' ? -1 : o.newId ? (o.afterId ? order(o.afterId) : -0.5) + 0.5 : order(o.sid), op: o });
    groups.get(key).items.push(i);
  });
  const list = [...groups.values()].sort((a, b) => a.pos - b.pos);
  const lossy = !ro && ops.some(o => rv.lossOf(o, base));
  card.innerHTML = `<div class="as-ptitle">${ro ? t('Cambios aplicados') : t('Cambios propuestos')}${list.length > 1 ? ` <span class="as-pcount">${list.length} ${t('diapositivas')}</span>` : ''}</div>`
    + (lossy ? `<label class="as-chk as-protect" title="${t('Lo que borra contenido tuyo empieza sin marcar; lo que lo sustituye se añade a lo que había.')}"><input type="checkbox" class="as-protectchk"${r.protect ? ' checked' : ''}> ${t('Proteger mi contenido')}</label>` : '')
    + '<div class="as-groups"></div>';
  const wrap = card.querySelector('.as-groups');
  const titleOf = g => { const s = g.key.startsWith('new:') ? null : base.slides.find(x => x.id === g.key);
    return { s, title: g.key === 'deck' ? t('Toda la presentación') : s ? `${t('Diapositiva')} ${order(s.id) + 1}` : t('Diapositiva nueva') }; };
  for (const g of list) {
    const sec = document.createElement('section'); sec.className = 'as-group'; sec.dataset.key = g.key;
    const { s, title } = titleOf(g);
    sec.innerHTML = `<div class="as-ghead"><label>${ro ? '' : '<input type="checkbox" class="as-gchk" checked>'} <b>${title}</b>${s ? ` <span>${escHTML(snip(slideName(s), 34))}</span>` : ''}</label>
      <button type="button" class="as-zoom" title="${t('Ver en grande')}" aria-label="${t('Ver en grande')}"><i class="ms">open_in_full</i></button></div>
      <div class="as-thumbs" role="button" tabindex="0" title="${t('Ver en grande')}"></div>
      ${g.items.map(i => opRow(p, i)).join('')}`;
    wrap.appendChild(sec);
  }
  {
    const notes = [];
    if (p.dropped?.length) notes.push(`<b>${p.dropped.length === 1 ? t('No se incluye 1 cambio:') : t('No se incluyen {n} cambios:').replace('{n}', p.dropped.length)}</b>` + '<ul>' + p.dropped.slice(0, 8).map(d =>
      `<li>${escHTML(t(OP_LABEL[d.op?.op] || 'Cambio'))}${d.op?.slide ? ` (${t('diapositiva')} ${escHTML(String(d.op.slide))})` : ''}: ${escHTML(t(WHY[d.code] || 'valor no válido'))}</li>`).join('') + '</ul>');
    const fresh = (p.problems || []).filter(x => !x.before);
    if (fresh.length) notes.push(`<b>${t('Revisión:')}</b><ul>` + fresh.slice(0, 8).map(x => `<li>${t('Diapositiva')} ${x.slide}: «${escHTML(snip(x.text, 40))}» ${escHTML(t(PROBLEM[x.kind]))}</li>`).join('') + '</ul>');
    if (notes.length) card.insertAdjacentHTML('beforeend', `<div class="as-warn">${notes.join('')}</div>`);
  }
  if (!ro) {
    card.insertAdjacentHTML('beforeend', `<div class="as-actions"><button type="button" class="fr-do as-apply"${ops.length ? '' : ' disabled'}></button>
      <button type="button" class="mini2 as-more">${t('Pedir cambios')}</button><button type="button" class="mini2 as-discard">${t('Descartar')}</button></div>`);
  } else card.insertAdjacentHTML('beforeend', `<div class="as-actions"><span class="as-note">${t('Ctrl+Z para deshacer')}</span><button type="button" class="mini2 as-undo">${t('Deshacer')}</button></div>`);
  const info = [p.steps > 1 ? `${p.steps} ${t('pasos')}` : '', costText(p.cost || {})].filter(Boolean).join(' · ');
  if (info) card.insertAdjacentHTML('beforeend', `<div class="as-meta">${info}</div>`);
  const chosen = () => (ro ? ops : chosenOf(p));
  // What the ticked changes remove or replace on a slide (outlined in red in the «before»).
  const loseOf = g => {
    if (ro) return null;
    const m = new Map();
    for (const i of g.items) {
      const e = r.on.has(i) && !r.keep.has(i) && effective(p, i), l = e && rv.lossOf(e, base);
      if (l) m.set(l.what === 'slide' ? '*' : e.id, l.kind);
    }
    return m;
  };
  // Before and after, for what is ticked. (Pictures drawn only when in view: a long proposal stays light.)
  const shown = new Set(), io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for (const en of es) if (en.isIntersecting) { shown.add(en.target.dataset.key); io.unobserve(en.target); repaint(); } }, { rootMargin: '200px' }) : null;
  const paint = () => {
    cancelAnimationFrame(raf);
    const sel = chosen(), after = agent.previewDeck(sel, base), marks = new Set(sel.flatMap(o => [o.id, o.object?.id]).filter(Boolean));
    card._after = after; card._marks = marks;
    for (const g of list) {
      if (io && list.length > 4 && !shown.has(g.key)) continue;
      const box = card.querySelector(`.as-group[data-key="${CSS.escape(g.key)}"] .as-thumbs`);
      const { b, a } = pair(g, after, marks, THUMB);
      box.replaceChildren(...[b, b && a && !a.classList.contains('as-gone') && Object.assign(document.createElement('i'), { className: 'ms', textContent: 'arrow_forward' }), a].filter(Boolean));
    }
    const n = sel.length, btn = card.querySelector('.as-apply');
    if (btn) { btn.textContent = `${t('Aplicar seleccionados')} (${n})`; btn.disabled = !n; }
    card.querySelectorAll('.as-group').forEach(sec => { const cs = [...sec.querySelectorAll('input[data-i]')], g = sec.querySelector('.as-gchk');
      if (g) { g.checked = cs.every(c => c.checked); g.indeterminate = !g.checked && cs.some(c => c.checked); } });
    card.dispatchEvent(new Event('as-painted'));
  };
  // The slide before (none for a new one; what goes, in red) and after (or "deleted").
  const pair = (g, after, marks, w) => {
    const id = g.key === 'deck' ? (base.slides[state.ui.slideIndex] || base.slides[0]).id : g.key.startsWith('new:') ? g.key.slice(4) : g.key;
    const b0 = base.slides.find(x => x.id === id), a0 = after.slides.find(x => x.id === id);
    return { b: b0 ? thumb(b0, base, new Set(), w, loseOf(g)) : null,
      a: a0 ? thumb(a0, after, marks, w) : Object.assign(document.createElement('div'), { className: 'as-th as-gone', textContent: t('Se borra') }) };
  };
  let raf = 0; const repaint = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };
  // A change of the review (here or in the viewer): the rows and the pictures again.
  const sync = (now = false) => { if (!ro) syncRows(card, p); if (now) paint(); else repaint(); };
  card.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('input[data-i]')) toggleOn(p, +el.dataset.i, el.checked);
    else if (el.matches('input[data-keep]')) toggleKeep(p, +el.dataset.keep, el.checked);
    else if (el.matches('.as-gchk')) el.closest('.as-group').querySelectorAll('input[data-i]').forEach(c => toggleOn(p, +c.dataset.i, el.checked));
    else if (el.matches('.as-protectchk')) protect(p, el.checked);
    else return;
    sync();
  });
  card.addEventListener('click', e => { const b = e.target.closest('[data-restore]'); if (b) { r.edits.delete(+b.dataset.restore); sync(); } });
  card.querySelector('.as-apply')?.addEventListener('click', () => { const sel = chosen(); if (!sel.length) return; applyPending(sel); settle('applied'); });
  card.querySelector('.as-discard')?.addEventListener('click', () => settle('discarded'));
  card.querySelector('.as-more')?.addEventListener('click', () => {
    revising = true; const ta = document.querySelector('#assistant-panel textarea');
    if (ta) { ta.placeholder = t('¿Qué quieres cambiar de la propuesta?'); ta.focus(); }
  });
  card.querySelector('.as-undo')?.addEventListener('click', e => { undo(); e.target.disabled = true; card.querySelector('.as-ptitle').textContent = t('Cambios deshechos'); });
  card._view = { p, list, ops, ro, base, pair, titleOf, paint, sync };
  card.querySelectorAll('.as-group').forEach(sec => {
    const open = () => openViewer(card, list.findIndex(g => g.key === sec.dataset.key));
    sec.querySelector('.as-zoom').addEventListener('click', open);
    const th = sec.querySelector('.as-thumbs'); th.addEventListener('click', open);
    th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    if (io && list.length > 4) { th.dataset.key = sec.dataset.key; io.observe(th); }
  });
  paint();
  return card;
}
const slideName = s => agent.textOf((s.blocks.find(b => b.ph === 'title' && b.type === 'text') || s.blocks.find(b => b.type === 'text' && agent.textOf(b.html)))?.html || '').split('\n')[0];

// ---- The viewer: a proposed slide large, before and after; prev/next; tick there; the proposed
// texts edited in place in the «after» (Tab to the next, Esc to stop editing, then to close) -----
const TOOLS = [['bold', 'format_bold', 'Negrita', 'Ctrl+B'], ['italic', 'format_italic', 'Cursiva', 'Ctrl+I'],
  ['insertUnorderedList', 'format_list_bulleted', 'Viñetas', 'Ctrl+Mayús+8'], ['insertOrderedList', 'format_list_numbered', 'Lista numerada', 'Ctrl+Mayús+7']];
export function openViewer(card, at = 0) {
  const v = card._view; if (!v || !v.list.length) return;
  document.getElementById('as-viewer')?.remove();
  const back = document.createElement('div'); back.id = 'as-viewer'; back.className = 'asv-back';
  back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', t('Antes y después'));
  let i = Math.max(0, Math.min(v.list.length - 1, at)), mode = innerWidth < 900 ? 'after' : 'both';
  back.innerHTML = `<div class="asv" tabindex="-1">
    <header class="asv-head"><b class="asv-title"></b><span class="asv-pos"></span>
      <div class="asv-tog" role="tablist">${['both', 'before', 'after'].map(m => `<button type="button" role="tab" data-v="${m}">${t({ both: 'Lado a lado', before: 'Antes', after: 'Después' }[m])}</button>`).join('')}</div>
      <button type="button" class="asv-close" title="${t('Cerrar')} (Esc)" aria-label="${t('Cerrar')}">✕</button></header>
    <div class="asv-stage"></div>
    <div class="asv-bar" hidden><span class="as-note">${t('Pulsa un texto del «Después» para cambiarlo · Tab: el siguiente · Esc: terminar')}</span>
      <span class="asv-tools" role="toolbar" aria-label="${t('Formato del texto')}">${TOOLS.map(([cmd, icon, label, keys]) => `<button type="button" tabindex="-1" data-cmd="${cmd}" title="${t(label)} (${keys})" aria-label="${t(label)}"><i class="ms">${icon}</i></button>`).join('')}</span></div>
    <div class="asv-ops"></div>
    <footer class="asv-foot"><button type="button" class="mini2 asv-prev"><i class="ms">chevron_left</i> ${t('Anterior')}</button>
      <span class="as-note">${t('← → para moverte · Esc para cerrar')}</span>
      <button type="button" class="mini2 asv-next">${t('Siguiente')} <i class="ms">chevron_right</i></button></footer></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), stage = q('.asv-stage'), opsBox = q('.asv-ops');
  const drawStage = () => {
    const g = v.list[i];
    // As large as the stage allows, at the slide's proportions.
    const { w: W, h: H } = v.base.size, sw = stage.clientWidth - 24, sh = stage.clientHeight - 40, two = mode === 'both';
    const w = Math.max(160, Math.floor(Math.min(two ? (sw - 84) / 2 : sw, sh * W / H)));
    const { b, a } = v.pair(g, card._after || v.base, card._marks || new Set(), w), arrow = b && Object.assign(document.createElement('i'), { className: 'ms asv-arrow', textContent: 'arrow_forward' });
    const fig = (el, label, cls) => { const f = document.createElement('figure'); f.className = 'asv-fig ' + cls; f.innerHTML = `<figcaption>${label}</figcaption>`; if (el) f.appendChild(el); return f; };
    stage.replaceChildren(...[mode !== 'after' && b && fig(b, t('Antes'), 'asv-b'), two && arrow, mode !== 'before' && a && fig(a, t('Después'), 'asv-a')].filter(Boolean));
    // The proposed texts, editable where they are.
    let n = 0;
    if (!v.ro && mode !== 'before') for (const k of g.items) {
      const e = v.p.review.on.has(k) && effective(v.p, k), ed = rv.editable(e);
      const el = ed?.field === 'html' && stage.querySelector(`.asv-a [data-bid="${CSS.escape(e.id || e.object.id)}"] > div`);
      if (!el) continue;
      el.contentEditable = 'true'; el.spellcheck = true; el.tabIndex = 0; el.classList.add('asv-ed'); el.dataset.k = k;
      el.setAttribute('role', 'textbox'); el.setAttribute('aria-multiline', 'true');
      el.setAttribute('aria-label', `${t('Texto propuesto')}: ${snip(agent.textOf(ed.value), 40)}`);
      n++;
    }
    q('.asv-bar').hidden = !n;
  };
  const drawOps = () => { const g = v.list[i]; opsBox.innerHTML = g.items.map(k => opRow(v.p, k, true)).join(''); };
  const draw = () => {
    const g = v.list[i], { title, s } = v.titleOf(g);
    q('.asv-title').textContent = title + (s && slideName(s) ? ' · ' + snip(slideName(s), 60) : '');
    q('.asv-pos').textContent = `${i + 1} / ${v.list.length}`;
    back.querySelectorAll('.asv-tog button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === mode)));
    drawStage(); drawOps();
    q('.asv-prev').disabled = i === 0; q('.asv-next').disabled = i === v.list.length - 1;
  };
  // Typing in a text of the «after»: the proposal takes it at once (the list and the panel's pictures);
  // the slide is drawn again (fitted) when the editing leaves it.
  stage.addEventListener('input', e => {
    const el = e.target.closest?.('.asv-ed'); if (!el) return;
    v.p.review.edits.set(+el.dataset.k, { html: el.innerHTML }); v.sync(); syncRows(opsBox, v.p, true);
  });
  stage.addEventListener('focusout', e => { if (e.target.closest?.('.asv-ed') && !stage.contains(e.relatedTarget) && back.isConnected) { v.paint(); drawStage(); } });
  q('.asv-tools').addEventListener('mousedown', e => e.preventDefault());              // (the text keeps the focus)
  q('.asv-tools').addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b && document.activeElement?.classList.contains('asv-ed')) document.execCommand(b.dataset.cmd); });
  // Ticking, keeping, restoring, and the proposed notes and descriptions, in the list.
  const changed = () => { v.sync(true); drawStage(); drawOps(); };
  opsBox.addEventListener('change', e => {
    const el = e.target, attr = el.matches('input[data-k]') ? 'k' : el.matches('input[data-keep]') ? 'keep' : null;
    if (!attr) return;
    if (attr === 'k') toggleOn(v.p, +el.dataset.k, el.checked); else toggleKeep(v.p, +el.dataset.keep, el.checked);
    const val = el.dataset[attr]; changed(); opsBox.querySelector(`[data-${attr}="${val}"]`)?.focus();
  });
  opsBox.addEventListener('input', e => {
    const el = e.target; if (!el.matches('.asv-field')) return;
    const k = +el.dataset.edit, ed = rv.editable(v.p.ops[k]);
    v.p.review.edits.set(k, ed?.field === 'notes' ? { notes: el.value } : { alt: el.value }); v.sync(); syncRows(opsBox, v.p, true);
  });
  opsBox.addEventListener('click', e => { const b = e.target.closest('[data-restore]'); if (b) { v.p.review.edits.delete(+b.dataset.restore); changed(); } });
  const go = d => { const j = Math.max(0, Math.min(v.list.length - 1, i + d)); if (j !== i) { i = j; draw(); } };
  const close = () => { back.remove(); removeEventListener('keydown', key, true); removeEventListener('resize', draw); };
  const key = e => {
    if (!document.body.contains(back)) { removeEventListener('keydown', key, true); return; }
    const a = document.activeElement, typing = !!a && back.contains(a) && (a.isContentEditable || a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox'));
    // Esc: first out of the text being edited, then the viewer closes.
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (typing) { a.blur(); q('.asv').focus(); } else close(); }
    else if (typing && a.isContentEditable && (e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'Digit7' || e.code === 'Digit8')) {
      e.preventDefault(); e.stopPropagation(); document.execCommand(e.code === 'Digit8' ? 'insertUnorderedList' : 'insertOrderedList');
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { if (typing || e.target.tagName === 'SELECT') return; e.preventDefault(); e.stopPropagation(); go(e.key === 'ArrowRight' ? (document.dir === 'rtl' ? -1 : 1) : (document.dir === 'rtl' ? 1 : -1)); }
  };
  addEventListener('keydown', key, true); addEventListener('resize', draw);
  q('.asv-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.asv-prev').addEventListener('click', () => go(-1)); q('.asv-next').addEventListener('click', () => go(1));
  back.querySelectorAll('.asv-tog button').forEach(b => b.addEventListener('click', () => { mode = b.dataset.v; draw(); }));
  draw(); q('.asv-close').focus();
  return back;
}

// (For tests and the API: the proposal on screen.)
export const assistantState = () => ({ pending, busy: !!job, opts: { ...opts, perms: { ...opts.perms } }, spent: { ...spent }, log: chatLog.length, completing });
export const resetAssistant = () => { pending = null; chatLog.length = 0; spent.usd = spent.credits = 0; revising = false; completing = null; retry = null; job?.ctrl.abort();
  document.getElementById('as-viewer')?.remove();
  Object.assign(opts, { auto: false, scope: 'all', style: 'same', mode: 'empty', perms: { ...agent.DEFAULT_PERMS } }); };
