// «Idiomas» (Ver ▸ Revisar ▸ Idiomas; IA ▸ Presentación multilingüe): the presentation in several languages
// (features/document/languages.js). A table — a row for each text, a column for each language —, written by hand,
// completed by the AI, searched, filtered to what is missing and sorted; who sees which language when it is shared;
// and the presentation shown, downloaded or linked in any of them.

import { state, commit, subscribe } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { t, currentLang } from '../../i18n/index.js';
import { cleanHTML } from '../../features/document/sanitize.js';
import * as L from '../../features/document/languages.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { alertDialog, confirmDialog } from './dialog.js';

const looksHTML = s => /<[a-z][^>]*>/i.test(s);
// A cell's text shown as it reads: formatted (cleaned) when it is HTML, as written otherwise.
const show = s => (looksHTML(s) ? cleanHTML(s) : esc(s).replace(/\n/g, '<br>'));
const cellValue = (el, html) => {
  if (!html) return el.innerText.replace(/\n$/, '');
  const v = el.innerHTML.replace(/<br\s*\/?>$/i, '').trim();
  return v === '<br>' ? '' : cleanHTML(v);
};

export function openLanguages() {
  document.getElementById('lang-modal')?.remove();
  const back = document.createElement('div'); back.id = 'lang-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(1180px,97vw);max-width:none;max-height:94vh;display:flex;flex-direction:column"><button class="modal-close">✕</button>
    <h3>${t('Idiomas de la presentación')}</h3>
    <p class="host-help">${t('Una tabla con cada texto de las diapositivas y cómo se dice en cada idioma. Al compartirla, cada persona la ve en el suyo (o en el que elijas para todos).')}</p>
    <div class="lg-top" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:6px 0"></div>
    <div class="lg-tools" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0">
      <input type="search" class="lg-q" placeholder="${t('Buscar texto…')}" style="flex:1;min-width:160px">
      <label class="fr-chk"><input type="checkbox" class="lg-miss"> ${t('Solo lo que falta')}</label>
      <select class="lg-sort" aria-label="${t('Ordenar')}"><option value="slide">${t('Por diapositiva')}</option><option value="az">${t('Alfabético')}</option><option value="missing">${t('Primero lo que falta')}</option></select>
      <button type="button" class="fr-do lg-ai">✨ ${t('Completar con IA')}</button>
      <span class="lg-progress host-help"></span>
    </div>
    <div class="lg-table" style="flex:1;min-height:200px;overflow:auto;border:1px solid var(--line);border-radius:6px"></div>
    <div class="lg-bottom" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:10px"></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  let unsub = null, own = false;
  const change = fn => { own = true; try { commit(fn); } finally { own = false; } };   // (ours: the table isn't drawn again for it)
  const close = () => { unsub?.(); back.remove(); };
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  const opt = (code, sel, label = L.langName(code, currentLang())) => `<option value="${esc(code)}"${code === sel ? ' selected' : ''}>${esc(label)}</option>`;

  // ---- Languages, and who sees which ----
  const drawTop = () => {
    const d = state.deck, base = L.baseOf(d), langs = L.langsOf(d), miss = L.missingByLang(d);
    const free = L.LANG_CODES.filter(c => c !== base && !langs.includes(c));
    q('.lg-top').innerHTML = `<label>${t('Idioma en que está escrita')} <select class="lg-base">${L.LANG_CODES.map(c => opt(c, base)).join('')}</select></label>
      <span style="display:flex;flex-wrap:wrap;gap:6px">${langs.map(l => `<span class="chip" style="display:inline-flex;gap:4px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:2px 4px 2px 10px">${esc(L.langName(l, currentLang()))}
        <small style="font-size:11px;opacity:.7">${miss[l] ? t('{n} por traducir').replace('{n}', miss[l]) : '✓'}</small><button type="button" class="mini2 lg-rm" data-l="${esc(l)}" title="${t('Quitar este idioma')}">✕</button></span>`).join('')}</span>
      <select class="lg-add" aria-label="${t('Añadir idioma')}"><option value="">＋ ${t('Añadir idioma')}</option>${free.map(c => opt(c, '')).join('')}</select>`;
    const all = L.allLangs(d), force = L.i18nOf(d)?.force || '', doc = cd.cloudDoc();
    q('.lg-bottom').innerHTML = langs.length ? `<label>${t('Quien la abra la ve')} <select class="lg-force"><option value="">${t('en su idioma (si está; si no, en el original)')}</option>${all.map(c => opt(c, force, t('siempre en {lang}').replace('{lang}', L.langName(c, currentLang())))).join('')}</select></label>
      <span style="flex:1"></span>
      <label>${t('Ver en')} <select class="lg-see">${all.map(c => opt(c, '')).join('')}</select></label>
      <button type="button" class="mini2 lg-present"><i class="ms">slideshow</i> ${t('Presentar')}</button>
      <button type="button" class="mini2 lg-html"><i class="ms">download</i> ${t('Descargar .html')}</button>
      ${doc ? `<button type="button" class="mini2 lg-link"><i class="ms">link</i> ${t('Copiar enlace en este idioma')}</button>` : ''}
      <button type="button" class="mini2 lg-prune" title="${t('Las traducciones de textos que ya no están en las diapositivas')}">${t('Quitar las que ya no se usan')}</button>`
      : `<span class="host-help">${t('Añade los idiomas de tu público: aparecerá una columna para cada uno.')}</span>`;
  };

  // ---- The table ----
  const drawTable = () => {
    const d = state.deck, langs = L.langsOf(d), tx = L.i18nOf(d)?.texts || {};
    const find = q('.lg-q').value.trim().toLowerCase(), onlyMissing = q('.lg-miss').checked, sort = q('.lg-sort').value;
    const has = (r, l) => !!String(tx[l]?.[r.text] || '').trim();
    let rows = L.textRows(d).map((r, i) => ({ ...r, i }));
    if (find) rows = rows.filter(r => [r.text, ...langs.map(l => tx[l]?.[r.text] || '')].some(s => s.replace(/<[^>]*>/g, '').toLowerCase().includes(find)));
    if (onlyMissing) rows = rows.filter(r => langs.some(l => !has(r, l)));
    const plainOf = s => s.replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (sort === 'az') rows.sort((a, b) => plainOf(a.text).localeCompare(plainOf(b.text)));
    if (sort === 'missing') rows.sort((a, b) => langs.filter(l => !has(b, l)).length - langs.filter(l => !has(a, l)).length || a.i - b.i);
    const cols = [L.baseOf(d), ...langs];
    q('.lg-table').innerHTML = !rows.length ? `<p class="host-help" style="padding:12px">${t('Nada que mostrar.')}</p>`
      : `<table style="width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed"><thead style="position:sticky;top:0;background:var(--panel);z-index:1"><tr>
        <th style="width:3.2em;text-align:start;padding:6px">#</th>${cols.map((c, k) => `<th style="text-align:start;padding:6px"${RTLattr(c)}>${esc(L.langName(c, currentLang()))}${k ? '' : ` <small class="host-help">(${t('original')})</small>`}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr data-i="${r.i}" style="border-top:1px solid var(--line);vertical-align:top">
          <td class="host-help" style="padding:6px" title="${t('Diapositivas')}">${r.slides.length ? r.slides.slice(0, 3).join(', ') + (r.slides.length > 3 ? '…' : '') : '—'}</td>
          <td style="padding:6px;overflow-wrap:anywhere">${show(r.text)}</td>
          ${langs.map(l => `<td style="padding:2px"><div class="lg-cell" contenteditable="true" data-l="${esc(l)}"${RTLattr(l)} style="min-height:1.6em;padding:4px;border-radius:4px;overflow-wrap:anywhere;${has(r, l) ? '' : 'background:color-mix(in srgb,var(--accent) 8%,transparent);'}" aria-label="${esc(L.langName(l, currentLang()))}">${has(r, l) ? show(tx[l][r.text]) : ''}</div></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    rowsNow = L.textRows(d);
  };
  const RTLattr = c => (L.RTL.includes(c) ? ' dir="rtl"' : '');
  let rowsNow = [];
  const redraw = () => { drawTop(); drawTable(); };
  redraw();

  // A cell written: its translation (one undo step), the counters again without drawing the table (the cursor stays).
  q('.lg-table').addEventListener('focusout', e => {
    const c = e.target.closest('.lg-cell'); if (!c) return;
    const row = rowsNow[+c.closest('tr').dataset.i]; if (!row) return;
    const v = cellValue(c, looksHTML(row.text)), old = L.i18nOf(state.deck)?.texts?.[c.dataset.l]?.[row.text] || '';
    if (v === old) return;
    change(() => L.setText(state.deck, c.dataset.l, row.text, v));
    c.style.background = v.trim() ? '' : 'color-mix(in srgb,var(--accent) 8%,transparent)';
    drawTop();
  });
  ['input', 'change'].forEach(ev => q('.lg-tools').addEventListener(ev, e => { if (e.target.matches('.lg-q, .lg-miss, .lg-sort')) drawTable(); }));

  back.addEventListener('change', e => {
    const d = state.deck;
    if (e.target.matches('.lg-base')) { change(() => L.setBase(d, e.target.value)); redraw(); }
    else if (e.target.matches('.lg-add') && e.target.value) { change(() => L.addLang(d, e.target.value, currentLang())); redraw(); }
    else if (e.target.matches('.lg-force')) change(() => L.setForce(d, e.target.value));
  });
  back.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = state.deck, see = () => q('.lg-see')?.value;
    if (b.matches('.lg-rm')) {
      const l = b.dataset.l, n = Object.keys(L.i18nOf(d)?.texts?.[l] || {}).length;
      if (n && !(await confirmDialog(t('¿Quitar {lang} y sus {n} traducciones?').replace('{lang}', L.langName(l, currentLang())).replace('{n}', n)))) return;
      change(() => L.removeLang(d, l)); redraw();
    } else if (b.matches('.lg-ai')) completeWithAI();
    else if (b.matches('.lg-present')) { close(); (await import('../shell/present.js')).present({ lang: see() }); }
    else if (b.matches('.lg-html')) {
      const H = await import('../../io/formats/html.js'), F = await import('../../io/files.js');
      const { html } = await H.offlineHTML(H.buildHTML(L.deckIn(d, see())));
      F.download(new Blob([html], { type: 'text/html' }), `${F.slug(d.name)}-${see()}.html`);
    } else if (b.matches('.lg-link')) {
      const link = cd.embedLink(cd.cloudDoc().id) + '&lang=' + encodeURIComponent(see());
      try { await navigator.clipboard.writeText(link); b.textContent = t('Copiado'); } catch { alertDialog(link); }
    } else if (b.matches('.lg-prune')) { let n = 0; change(() => { n = L.pruneTexts(d); }); alertDialog(t('Traducciones quitadas: {n}').replace('{n}', n)); redraw(); }
  });

  // The AI fills what is missing, language by language (what was written by hand is kept).
  async function completeWithAI() {
    const d = state.deck, langs = L.langsOf(d);
    if (!langs.length) { alertDialog(t('Primero añade algún idioma.')); return; }
    const { run } = await import('./ai.js'), ai = await import('../../features/ai/openrouter.js');
    const tx = () => L.i18nOf(state.deck)?.texts || {}, rows = L.textRows(d).map(r => r.text);
    const todo = langs.map(l => [l, rows.filter(r => !String(tx()[l]?.[r] || '').trim())]).filter(([, r]) => r.length);
    if (!todo.length) { alertDialog(t('Ya está todo traducido.')); return; }
    const total = todo.reduce((n, [, r]) => n + r.length, 0); let done = 0;
    const p = q('.lg-progress');
    await run(async () => {
      for (const [l, texts] of todo) {
        const got = await ai.translateTable(texts, L.langName(l, 'en'), { context: state.deck.name, onProgress: f => { p.textContent = `${L.langName(l, currentLang())} · ${Math.round(((done + f * texts.length) / total) * 100)} %`; } });
        change(() => { for (const [k, v] of Object.entries(got)) if (!String(tx()[l]?.[k] || '').trim()) L.setText(state.deck, l, k, looksHTML(k) ? cleanHTML(v) : v); });
        done += texts.length; redraw();
      }
    });
    p.textContent = '';
  }
  // (Changed elsewhere meanwhile — undo, an edit —: the table follows, unless a cell is being written.)
  unsub = subscribe(() => { if (!back.isConnected) return unsub?.(); if (!own && !document.activeElement?.closest?.('#lang-modal .lg-cell')) redraw(); });
}
