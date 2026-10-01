// The assistant panel: the user asks, the agent (features/ai/agent.js) works
// in a few steps — shown as it goes, and it can be stopped — and proposes
// changes, grouped by slide with a picture before and after; the user ticks
// what to apply (one undo step), discards it, or asks for changes. Above: the
// scope (whole deck, this slide, the selection, slides N–M) and permissions.

import { state, commit, undo, snapshot } from '../../core/store.js';
import * as agent from '../../features/ai/agent.js';
import { STYLES } from '../../features/ai/fromspec.js';
import { PALETTES, FONT_PAIRS, deckFg, deckBodyFont, currentPalette } from '../../features/design/palettes.js';
import { masterBlocksFor, isEmptyPlaceholder, styled } from '../../features/document/master.js';
import { blockPreview } from '../shell/preview.js';
import { ready, aiFailed } from './ai.js';
import { t } from '../../i18n/index.js';

// Remembered: permissions, scope kind, "apply without asking", the style of new slides.
const KEY = 'revela.assistant.v1';
const prefs = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
const opts = { auto: !!prefs.auto, scope: ['all', 'current', 'selection', 'range'].includes(prefs.scope) ? prefs.scope : 'all',
  perms: { ...agent.DEFAULT_PERMS, ...(prefs.perms || {}) }, style: STYLES.includes(prefs.style) ? prefs.style : 'same', from: 0, to: 0 };
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify({ auto: opts.auto, scope: opts.scope, perms: opts.perms, style: opts.style })); } catch {} };

const chatLog = [];                  // [{ role, content, shown }] for the model and for display
let pending = null;                  // the proposal on screen: { ops, base, dropped, problems, message, cost, steps, done }
let job = null;                      // the running request: { ctrl }
let revising = false;                // the next message asks for changes to the proposal
const spent = { usd: 0, credits: 0 };

export function toggleAssistant(on = !state.ui.showAssistant) { commit(() => { state.ui.showAssistant = on; }, { history: false }); }

const HINTS = ['Añade una diapositiva de conclusiones', 'Acorta todos los títulos', 'Escribe notas para todas las diapositivas', 'Convierte la diapositiva actual en una línea de tiempo',
  'Revisa que todos los textos quepan y no se solapen'];
const STYLE_LABEL = { same: 'Como el resto', visual: 'Más visual', minimal: 'Minimalista', animated: 'Con animación', surprise: 'Sorpréndeme' };
const PERM_LABEL = { delete: 'Borrar diapositivas', design: 'Cambiar diseño, colores y tipografía', objects: 'Añadir o quitar objetos', animation: 'Animaciones y transiciones' };

export function renderAssistant() {
  let panel = document.getElementById('assistant-panel');
  if (!state.ui.showAssistant) { panel?.remove(); return; }
  if (panel) { syncScope(panel); return; }
  panel = document.createElement('aside'); panel.id = 'assistant-panel';
  panel.innerHTML = `<div class="cm-head"><b><i class="ms">auto_awesome</i> ${t('Asistente')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div>
    <div class="as-opts">
      <label class="as-row"><span>${t('Alcance')}</span><select class="as-scope">
        <option value="all">${t('Toda la presentación')}</option><option value="current">${t('Diapositiva actual')}</option>
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
    <div class="as-log" aria-live="polite"></div>
    <div class="as-hints">${HINTS.map(h => `<button type="button" class="as-hint">${t(h)}</button>`).join('')}</div>
    <div class="cm-new"><textarea rows="3" placeholder="${t('Pide un cambio o haz una pregunta…')}"></textarea>
      <div class="as-foot"><span class="as-cost"></span><button type="button" class="as-send">${t('Enviar')}</button></div></div>`;
  document.querySelector('main').appendChild(panel);
  const q = s => panel.querySelector(s), log = q('.as-log'), ta = q('textarea');
  for (const m of chatLog) addMsg(log, m.role === 'user' ? 'me' : 'ai', m.shown ?? m.content);
  if (pending) log.appendChild(proposalCard(pending));
  if (job) log.appendChild(job.el);
  showCost(panel);
  q('.as-scope').value = opts.scope;
  q('.as-scope').addEventListener('change', e => { opts.scope = e.target.value; keep(); syncScope(panel, true); });
  q('.as-style').value = opts.style;
  q('.as-style').addEventListener('change', e => { opts.style = e.target.value; keep(); });
  for (const inp of [q('.as-from'), q('.as-to')]) inp.addEventListener('change', () => { opts.from = +q('.as-from').value || 1; opts.to = +q('.as-to').value || opts.from; });
  panel.querySelectorAll('[data-perm]').forEach(c => c.addEventListener('change', () => { opts.perms[c.dataset.perm] = c.checked; keep(); permSummary(panel); }));
  q('.as-autochk').addEventListener('change', e => { opts.auto = e.target.checked; keep(); });
  permSummary(panel); syncScope(panel, true);
  const send = () => { const text = ta.value.trim(); if (text && !job) { ta.value = ''; ask(panel, text); } };
  q('.as-send').addEventListener('click', send);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  panel.querySelectorAll('.as-hint').forEach(h => h.addEventListener('click', () => { if (!job) ask(panel, h.textContent); }));
  q('.cm-close').addEventListener('click', () => toggleAssistant(false));
}

function addMsg(log, who, text) {
  log.closest('#assistant-panel')?.classList.add('as-started');           // (the suggestions: one row, to leave room)
  const d = document.createElement('div'); d.className = 'as-msg ' + who; d.textContent = text;
  log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
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
}
function showCost(panel) {
  const el = panel?.querySelector('.as-cost'); if (!el) return;
  el.textContent = spent.credits ? `${t('Gastado')}: ${spent.credits} ${t('créditos')}` : spent.usd ? `${t('Gastado')}: ${spent.usd.toFixed(4)} US$` : '';
}
const costText = c => (c.credits ? `${c.credits} ${t('créditos')}` : c.usd ? `${c.usd.toFixed(4)} US$` : '');

const STEP = { think: s => (s.step > 1 ? t('Pensando…') : t('Leyendo la presentación…')), look: s => t('Mirando la diapositiva {n}…').replace('{n}', s.slide),
  check: () => t('Comprobando que todo cabe…'), search: () => t('Buscando imágenes…') };

async function ask(panel, text) {
  if (!(await ready())) return;
  const scope = { kind: opts.scope, from: opts.from, to: opts.to };
  if (scope.kind === 'selection' && !(state.ui.multi?.length || state.ui.selection)) { addMsg(panel.querySelector('.as-log'), 'ai', t('Selecciona primero uno o varios objetos de la diapositiva.')); return; }
  const log = panel.querySelector('.as-log');
  const request = revising && pending ? `About your last proposal: ${text}` : text;
  if (pending && !pending.done) settle('replaced');
  revising = false; panel.querySelector('textarea').placeholder = t('Pide un cambio o haz una pregunta…');
  addMsg(log, 'me', text);
  const ctrl = new AbortController(), el = document.createElement('div'); el.className = 'as-progress';
  el.innerHTML = `<span class="as-spin"></span><span class="as-step">${t('Leyendo la presentación…')}</span><button type="button" class="as-stop">${t('Detener')}</button>`;
  el.querySelector('.as-stop').addEventListener('click', () => ctrl.abort());
  job = { ctrl, el }; log.appendChild(el); log.scrollTop = log.scrollHeight;
  const cur = () => document.getElementById('assistant-panel');
  cur()?.querySelector('.as-send')?.setAttribute('disabled', '');
  const before = { ...spent };
  try {
    const res = await agent.runAgent(request, { history: chatLog.map(({ role, content }) => ({ role, content })), scope, perms: { ...opts.perms }, style: opts.style, signal: ctrl.signal,
      onStep: s => { job.el.querySelector('.as-step').textContent = STEP[s.kind]?.(s) || t('Pensando…'); },
      onCost: c => { spent.credits = before.credits + c.credits; spent.usd = before.usd + c.usd; showCost(cur()); } });
    chatLog.push({ role: 'user', content: request, shown: text },
      { role: 'assistant', content: JSON.stringify({ message: res.message, ops: res.raw }).slice(0, 12000), shown: res.message || (res.ops.length ? '' : t('Hecho.')) });
    const p = cur(), lg = p?.querySelector('.as-log');
    if (res.message || !res.ops.length) lg && addMsg(lg, 'ai', res.message || t('No hay cambios que proponer.'));
    if (res.ops.length || res.dropped.length) {
      pending = { ...res, base: snapshot(state.deck), done: null };
      if (opts.auto && res.ops.length) applyPending(res.ops);
      lg?.appendChild(proposalCard(pending));
    }
  } catch (e) {
    const lg = cur()?.querySelector('.as-log');
    if (e.message === 'STOPPED') { if (lg) addMsg(lg, 'ai', t('Detenido.')); }
    else aiFailed(e);
  } finally {
    job.el.remove(); job = null;
    cur()?.querySelector('.as-send')?.removeAttribute('disabled');
    const lg = cur()?.querySelector('.as-log'); if (lg) lg.scrollTop = lg.scrollHeight;
  }
}

// ---- The proposal ------------------------------------------------------------------
function applyPending(ops) {
  const n = agent.applyOps(ops);
  pending.done = 'applied'; pending.applied = ops; pending.count = n;
}
function settle(how) {
  if (!pending) return;
  pending.done = how;
  const old = document.querySelector('#assistant-panel .as-prop:not(.settled)');
  if (old) old.replaceWith(proposalCard(pending));
  if (how !== 'applied') pending = null;
}

// Plain-language line for each change.
const snip = (s, n = 36) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const TYPE = { text: 'Texto', shape: 'Forma', image: 'Imagen', chart: 'Gráfico', table: 'Tabla', icon: 'Icono', model: 'Modelo 3D', video: 'Vídeo', audio: 'Audio',
  code: 'Código', math: 'Ecuación', diagram: 'Diagrama', connector: 'Conector' };
const objName = b => (!b ? t('Objeto') : (b.type === 'text' || b.html) && agent.textOf(b.html) ? `«${snip(agent.textOf(b.html), 30)}»` : t(TYPE[b.type] || 'Objeto'));
const PROP = { x: 'posición', y: 'posición', w: 'tamaño', h: 'tamaño', rotation: 'giro', opacity: 'opacidad', fontSize: 'tamaño de letra', color: 'color',
  fontFamily: 'tipo de letra', textAlign: 'alineación', fontWeight: 'negrita', fontStyle: 'cursiva', bg: 'fondo', vAlign: 'alineación vertical', lineHeight: 'interlineado',
  wordart: 'WordArt', fill: 'relleno', stroke: 'borde', strokeWidth: 'grosor del borde', shape: 'forma', icon: 'icono', alt: 'texto alternativo', fit: 'ajuste',
  chartType: 'tipo de gráfico', seriesName: 'nombre de la serie', headBg: 'colores de la tabla', headFg: 'colores de la tabla', band: 'colores de la tabla',
  autoRotate: 'giro automático', spin: 'velocidad de giro' };
export function describe(o, deck) {
  const s = o.sid && deck.slides.find(x => x.id === o.sid), b = s && o.id ? s.blocks.find(x => x.id === o.id) : null;
  const sw = c => `<span class="as-sw" style="background:${c}"></span>`;
  const e = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  switch (o.op) {
    case 'set_text': return e(t('Texto {a} → «{b}»').replace('{a}', objName(b)).replace('{b}', snip(agent.textOf(agent.toHTML(o.text)), 60)));
    case 'set_notes': return e(t('Notas del orador nuevas'));
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
      + (o.props.color || o.props.fill ? ' ' + sw(o.props.color || o.props.fill) : '');
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

// A slide's picture (as in the slide navigator), with the changed objects outlined.
function thumb(slide, deck, mark = new Set(), w = 120) {
  const { w: W, h: H } = deck.size, k = w / W;
  const box = document.createElement('div'); box.className = 'as-th';
  box.style.cssText = `width:${w}px;height:${Math.round(H * k)}px;background:${slide.background || currentPalette(deck).bg}`;
  const inner = document.createElement('div');
  inner.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform:scale(${k});transform-origin:0 0;color:${deckFg(deck)};font-family:${deckBodyFont(deck) || 'inherit'}`;
  for (const b of [...masterBlocksFor(slide, deck), ...slide.blocks.map(x => styled(x, slide, deck))]) {
    if (isEmptyPlaceholder(b)) continue;
    try { inner.appendChild(blockPreview(b, slide)); } catch {}
    if (mark.has(b.id)) { const m = document.createElement('div'); m.className = 'as-mark'; m.style.cssText = `left:${b.x - 6}px;top:${b.y - 6}px;width:${b.w + 12}px;height:${b.h + 12}px;border-width:${Math.round(2 / k)}px`; inner.appendChild(m); }
  }
  box.appendChild(inner);
  return box;
}

function proposalCard(p) {
  const card = document.createElement('div'); card.className = 'as-prop' + (p.done ? ' settled' : '');
  const base = p.base, ops = p.done === 'applied' ? p.applied : p.ops;
  if (p.done && p.done !== 'applied') { card.innerHTML = `<p class="as-note">${p.done === 'replaced' ? t('Propuesta sustituida por la nueva petición.') : t('Propuesta descartada.')}</p>`; return card; }
  // Groups: the whole deck first, then each slide in order (new slides after the one they follow).
  const order = s => base.slides.findIndex(x => x.id === s);
  const groups = new Map();
  ops.forEach((o, i) => {
    const key = ['apply_palette', 'set_fonts'].includes(o.op) || o.all ? 'deck' : o.newId ? 'new:' + o.newId : o.sid;
    if (!groups.has(key)) groups.set(key, { key, items: [], pos: key === 'deck' ? -1 : o.newId ? (o.afterId ? order(o.afterId) : -0.5) + 0.5 : order(o.sid), op: o });
    groups.get(key).items.push(i);
  });
  const list = [...groups.values()].sort((a, b) => a.pos - b.pos);
  const ro = p.done === 'applied';
  card.innerHTML = `<div class="as-ptitle">${ro ? t('Cambios aplicados') : t('Cambios propuestos')}</div><div class="as-groups"></div>`;
  const wrap = card.querySelector('.as-groups');
  for (const g of list) {
    const sec = document.createElement('section'); sec.className = 'as-group'; sec.dataset.key = g.key;
    const s = g.key.startsWith('new:') ? null : base.slides.find(x => x.id === g.key);
    const title = g.key === 'deck' ? t('Toda la presentación') : s ? `${t('Diapositiva')} ${order(s.id) + 1}` : t('Diapositiva nueva');
    sec.innerHTML = `<label class="as-ghead">${ro ? '' : '<input type="checkbox" class="as-gchk" checked>'} <b>${title}</b>${s ? ` <span>${escHTML(snip(slideName(s), 34))}</span>` : ''}</label>
      <div class="as-thumbs"></div>
      ${g.items.map(i => `<label class="as-op">${ro ? '<i class="ms">check</i>' : `<input type="checkbox" data-i="${i}" checked>`}<span>${describe(ops[i], base)}</span></label>`).join('')}`;
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
  const chosen = () => [...card.querySelectorAll('input[data-i]')].filter(c => c.checked).map(c => ops[+c.dataset.i]);
  // Before and after, for what is ticked.
  const paint = () => {
    const sel = ro ? ops : chosen(), after = agent.previewDeck(sel, base), marks = new Set(sel.flatMap(o => [o.id, o.object?.id]).filter(Boolean));
    for (const g of list) {
      const box = card.querySelector(`.as-group[data-key="${CSS.escape(g.key)}"] .as-thumbs`);
      const id = g.key === 'deck' ? (base.slides[state.ui.slideIndex] || base.slides[0]).id : g.key.startsWith('new:') ? g.key.slice(4) : g.key;
      const b0 = base.slides.find(x => x.id === id), a0 = after.slides.find(x => x.id === id);
      box.replaceChildren(...[b0 && thumb(b0, base), b0 && a0 && Object.assign(document.createElement('i'), { className: 'ms', textContent: 'arrow_forward' }),
        a0 ? thumb(a0, after, marks) : Object.assign(document.createElement('div'), { className: 'as-th as-gone', textContent: t('Se borra') })].filter(Boolean));
    }
    const n = sel.length, btn = card.querySelector('.as-apply');
    if (btn) { btn.textContent = `${t('Aplicar seleccionados')} (${n})`; btn.disabled = !n; }
    card.querySelectorAll('.as-group').forEach(sec => { const cs = [...sec.querySelectorAll('input[data-i]')], g = sec.querySelector('.as-gchk');
      if (g) { g.checked = cs.every(c => c.checked); g.indeterminate = !g.checked && cs.some(c => c.checked); } });
  };
  let raf = 0; const repaint = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };
  card.querySelectorAll('input[data-i]').forEach(c => c.addEventListener('change', repaint));
  card.querySelectorAll('.as-gchk').forEach(g => g.addEventListener('change', () => { g.closest('.as-group').querySelectorAll('input[data-i]').forEach(c => { c.checked = g.checked; }); repaint(); }));
  card.querySelector('.as-apply')?.addEventListener('click', () => { const sel = chosen(); if (!sel.length) return; applyPending(sel); settle('applied'); });
  card.querySelector('.as-discard')?.addEventListener('click', () => settle('discarded'));
  card.querySelector('.as-more')?.addEventListener('click', () => {
    revising = true; const ta = document.querySelector('#assistant-panel textarea');
    if (ta) { ta.placeholder = t('¿Qué quieres cambiar de la propuesta?'); ta.focus(); }
  });
  card.querySelector('.as-undo')?.addEventListener('click', e => { undo(); e.target.disabled = true; card.querySelector('.as-ptitle').textContent = t('Cambios deshechos'); });
  paint();
  return card;
}
const escHTML = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const slideName = s => agent.textOf((s.blocks.find(b => b.ph === 'title' && b.type === 'text') || s.blocks.find(b => b.type === 'text' && agent.textOf(b.html)))?.html || '').split('\n')[0];

// (For tests and the API: the proposal on screen.)
export const assistantState = () => ({ pending, busy: !!job, opts: { ...opts, perms: { ...opts.perms } }, spent: { ...spent }, log: chatLog.length });
export const resetAssistant = () => { pending = null; chatLog.length = 0; spent.usd = spent.credits = 0; revising = false; job?.ctrl.abort();
  Object.assign(opts, { auto: false, scope: 'all', style: 'same', perms: { ...agent.DEFAULT_PERMS } }); };
