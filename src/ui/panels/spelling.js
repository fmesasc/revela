// Revisar ▸ Ortografía (F7), as in PowerPoint: the unknown words of the whole presentation, one at a time — the slides'
// texts, shapes and tables, and the speaker notes —, each one shown on its slide, with its suggestions and Cambiar /
// Cambiar todo / Omitir / Omitir todo / Agregar. A panel beside the slide (not a dialog over it): the word is seen
// where it is, and the slide can still be edited meanwhile. It starts at the current slide and goes round to it.

import { esc } from '../../core/text.js';
import { state, commit, setSelection } from '../../core/store.js';
import * as P from '../../features/document/proofing.js';
import * as S from '../../features/document/spelling.js';
import { hasText } from '../shell/spellcheck.js';
import { t, currentLang } from '../../i18n/index.js';

let panel = null, current = null, skipped = new Set(), start = 0, runId = 0;

export function openSpellPanel() {
  if (panel?.isConnected) { panel.querySelector('button, select')?.focus(); return; }
  panel = document.createElement('aside'); panel.id = 'spell-panel'; panel.setAttribute('aria-label', t('Ortografía'));
  panel.innerHTML = `<div class="cm-head"><b>${t('Ortografía')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div><div class="spp-body"></div>`;
  panel.querySelector('.cm-close').addEventListener('click', closeSpellPanel);
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeSpellPanel(); } e.stopPropagation(); });
  document.querySelector('main').appendChild(panel);
  skipped = new Set(); start = state.ui.editMaster ? 0 : state.ui.slideIndex;
  next({ slide: start, place: 0 });
}
export function closeSpellPanel() { runId++; panel?.remove(); panel = null; current = null; }

// Every place with words of a slide, in order: its objects' texts (a table, cell by cell), then its notes.
function placesOf(s, i) {
  const out = [];
  for (const b of s.blocks || []) {
    if (!hasText(b)) continue;
    if (b.type === 'table') (b.rows || []).forEach((row, r) => row.forEach((cell, c) => { if (cell && !String(cell).startsWith('=')) out.push({ slide: i, id: b.id, b, r, c, html: cell }); }));
    else if (b.html) out.push({ slide: i, id: b.id, b, html: b.html });
  }
  if (s.notes?.trim()) out.push({ slide: i, notes: true, text: s.notes });
  return out;
}
const textOfPlace = p => { if (p.notes) return p.text; const tpl = document.createElement('template'); tpl.innerHTML = p.html; return P.textRuns(tpl.content).text; };
const keyOf = (p, word, nth) => [state.deck.slides[p.slide]?.id, p.id || 'notes', p.r ?? '', p.c ?? '', word, nth].join('|');

// The first unknown word from a point on (slide, place), going round the presentation once.
async function findFrom(from) {
  const deck = state.deck, ui = currentLang(), skippedLangs = new Set();
  const all = deck.slides.flatMap((s, i) => placesOf(s, i).map((p, place) => ({ ...p, place })));
  const k0 = Math.max(0, all.findIndex(p => p.slide > from.slide || (p.slide === from.slide && p.place >= from.place)));
  for (let k = 0; k < all.length; k++) {
    const p = all[(k0 + k) % all.length], text = textOfPlace(p);
    const tag = P.boxLang(p.notes ? null : p.b, deck, ui, text);
    if (tag === 'none') continue;
    if (!S.hasDict(tag)) { skippedLangs.add(tag); continue; }
    const tokens = P.tokenize(text), bad = new Set(await S.check(tag, tokens.map(x => x.word)));
    if (S.dictStatus(tag) === 'failed') { skippedLangs.add(tag); continue; }
    for (let ti = 0; ti < tokens.length; ti++) {
      const tk = tokens[ti]; if (!bad.has(P.lookupForm(tk.word)) || S.isAccepted(tag, tk.word)) continue;
      const nth = P.occurrenceOf(tokens, ti);
      if (!skipped.has(keyOf(p, tk.word, nth))) return { ...p, word: tk.word, nth, tag, text, at: tk.start };
    }
  }
  return { done: true, skippedLangs: [...skippedLangs] };
}

async function next(from) {
  if (!panel) return;
  const id = ++runId, body = panel.querySelector('.spp-body');
  body.innerHTML = `<p class="host-help">${t('Revisando…')}</p>`;
  const it = await findFrom(from);
  if (id !== runId || !panel) return;
  current = it.done ? null : it;
  if (it.done) {
    body.innerHTML = `<p class="spp-done"><i class="ms">check_circle</i> ${t('La revisión ortográfica ha terminado.')}</p>`
      + (it.skippedLangs.length ? `<p class="host-help">${esc(t('Sin diccionario: {l}').replace('{l}', it.skippedLangs.map(l => P.langLabel(l, currentLang())).join(', ')))}</p>` : '')
      + `<div class="fr-actions"><button type="button" class="fr-do spp-close">${t('Cerrar')}</button></div>`;
    body.querySelector('.spp-close').addEventListener('click', closeSpellPanel);
    body.querySelector('.spp-close').focus();
    return;
  }
  // Its slide and object, on the canvas (its word is marked there).
  commit(() => { state.ui.slideIndex = it.slide; setSelection(it.notes ? null : it.id); }, { history: false });
  const a = Math.max(0, it.at - 50), z = Math.min(it.text.length, it.at + it.word.length + 50);
  const where = `${t('Diapositiva')} ${it.slide + 1}${it.notes ? ' · ' + t('Notas del orador') : ''} · ${P.langLabel(it.tag, currentLang())}`;
  body.innerHTML = `<p class="spp-where"></p><p class="spp-label">${t('No está en el diccionario:')}</p>
    <p class="spp-context" lang="${esc(it.tag)}">${a ? '…' : ''}${esc(it.text.slice(a, it.at))}<mark>${esc(it.word)}</mark>${esc(it.text.slice(it.at + it.word.length, z))}${z < it.text.length ? '…' : ''}</p>
    <label class="spp-label" for="spp-sugg">${t('Sugerencias')}</label>
    <select id="spp-sugg" class="spp-sugg" size="5" lang="${esc(it.tag)}"><option disabled>${t('Buscando sugerencias…')}</option></select>
    <div class="spp-actions">
      <button type="button" data-sp="change">${t('Cambiar')}</button><button type="button" data-sp="changeAll">${t('Cambiar todo')}</button>
      <button type="button" data-sp="skip">${t('Omitir')}</button><button type="button" data-sp="skipAll">${t('Omitir todo')}</button>
      <button type="button" data-sp="add">${t('Agregar')}</button>
    </div>`;
  body.querySelector('.spp-where').textContent = where;
  const sel = body.querySelector('.spp-sugg'), change = body.querySelector('[data-sp="change"]'), changeAll = body.querySelector('[data-sp="changeAll"]');
  change.disabled = changeAll.disabled = true;
  body.querySelectorAll('[data-sp]').forEach(btn => btn.addEventListener('click', () => act(btn.dataset.sp)));
  sel.addEventListener('dblclick', () => act('change'));
  sel.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); act('change'); } });
  body.querySelector('[data-sp="skip"]').focus();
  const list = await S.suggest(it.tag, it.word);
  if (id !== runId || !sel.isConnected) return;
  sel.innerHTML = list.length ? list.slice(0, 8).map((s, i) => `<option${i ? '' : ' selected'}>${esc(s)}</option>`).join('') : `<option disabled>${t('Sin sugerencias')}</option>`;
  change.disabled = changeAll.disabled = !list.length;
  if (list.length) sel.focus();
}

function act(what) {
  const it = current; if (!it || !panel || state.deck.final || state.ui.lock) return;
  const repl = panel.querySelector('.spp-sugg')?.selectedOptions[0]?.disabled ? '' : panel.querySelector('.spp-sugg')?.value || '';
  const from = { slide: it.slide, place: it.place };
  if (what === 'skip') skipped.add(keyOf(it, it.word, it.nth));
  else if (what === 'skipAll') S.ignoreAll(it.tag, it.word);
  else if (what === 'add') S.addWord(it.tag, it.word);
  else if (what === 'change' && repl) commit(() => replaceAt(it, repl, it.nth));
  else if (what === 'changeAll' && repl) commit(() => { state.deck.slides.forEach((s, i) => placesOf(s, i).forEach(p => replaceAt(p, repl, -1, it.word))); });
  else return;
  next(from);
}
// One occurrence (nth) of the word, or all of them (-1), in a place of the model.
function replaceAt(p, repl, nth, word = p.word) {
  const s = state.deck.slides[p.slide], b = p.id && s?.blocks.find(x => x.id === p.id);
  const swap = html => (nth < 0 ? P.replaceEvery(html, word, repl)[0] : P.replaceWord(html, word, nth, repl));
  if (p.notes) s.notes = P.replaceInPlain(s.notes || '', word, nth, repl)[0];
  else if (b && p.r !== undefined) b.rows[p.r][p.c] = swap(b.rows[p.r][p.c] || '');
  else if (b) b.html = swap(b.html || '');
}
