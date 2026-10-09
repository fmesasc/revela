// «Generar desde una hoja»: the selected slides, once per row of an Excel or CSV file, with its values in their
// {{placeholders}} (features/document/bulk.js) — added to this presentation, as a new one, or straight to a PDF.

import { esc } from '../../core/text.js';
import { state, selectedSlideIndices, replaceDeck } from '../../core/store.js';
import * as bulk from '../../features/document/bulk.js';
import { parseDelimited } from '../../features/document/blocks.js';
import { exportPDFFile } from '../../io/export/pdf.js';
import { t } from '../../i18n/index.js';
import { SHEET_ACCEPT, sheetText } from './sheets.js';
import { alertDialog, confirmDialog } from './dialog.js';
import { toast } from '../shell/toast.js';

export function openBulk() {
  document.getElementById('bulk-modal')?.remove();
  const idx = selectedSlideIndices(), models = idx.map(i => state.deck.slides[i]).filter(Boolean), phs = bulk.placeholdersIn(models);
  const back = document.createElement('div'); back.id = 'bulk-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(600px,94vw);max-width:94vw"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button>
    <h3>${t('Generar desde una hoja')}</h3>
    <p class="host-help">${t('Diplomas, tarjetas con nombre, certificados…: escribe marcadores como {{nombre}} o {{nota}} en los textos de la diapositiva y elige una hoja de cálculo; se hace una copia de la diapositiva por cada fila, con sus datos.')}</p>
    <p class="host-help"><b>${idx.length === 1 ? t('Diapositiva modelo: {n}').replace('{n}', idx[0] + 1) : t('Diapositivas modelo: {n}').replace('{n}', idx.map(i => i + 1).join(', '))}</b>
      · ${phs.length ? `${t('Marcadores')}: ${phs.map(p => `<code>{{${esc(p.name)}}}</code>`).join(' ')}` : `<span class="bk-none">${t('No tiene marcadores. Escribe, por ejemplo, {{nombre}} en un texto de la diapositiva.')}</span>`}</p>
    <label class="fr-l">${t('Hoja de cálculo (Excel o CSV; la primera fila, los nombres de las columnas)')}<input type="file" class="bk-file" accept="${SHEET_ACCEPT}"${phs.length ? '' : ' disabled'}></label>
    <div class="bk-map" hidden><h4 style="margin:10px 0 4px">${t('Cada marcador con su columna')}</h4><div class="bk-rows"></div>
      <p class="host-help bk-count"></p>
      <fieldset style="margin:6px 0 10px"><legend>${t('Dónde')}</legend>
        <label class="fr-chk"><input type="radio" name="bk-out" value="append" checked> ${t('Añadirlas al final de esta presentación')}</label>
        <label class="fr-chk"><input type="radio" name="bk-out" value="new"> ${t('En una presentación nueva con el mismo diseño (sustituye a la abierta)')}</label>
        <label class="fr-chk"><input type="radio" name="bk-out" value="pdf"> ${t('Solo descargar un PDF (la presentación no cambia)')}</label></fieldset>
      <div class="fr-actions"><button type="button" class="mini2 bk-cancel">${t('Cancelar')}</button><button type="button" class="fr-do bk-go">${t('Generar')}</button></div></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close); q('.bk-cancel').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  let header = [], data = [], map = {};
  const limit = bulk.rowLimit(models.length);
  const count = () => {
    const n = Math.min(data.length, limit), miss = phs.filter(p => !(map[p.key] >= 0));
    q('.bk-count').innerHTML = esc(t('{r} filas → {n} diapositivas.').replace('{r}', n).replace('{n}', n * models.length))
      + (data.length > limit ? ' ' + esc(t('Solo se usan las primeras {n} filas (como mucho {m} filas y {s} diapositivas cada vez).').replace('{n}', limit).replace('{m}', bulk.MAX_ROWS).replace('{s}', bulk.MAX_SLIDES)) : '')
      + (miss.length ? `<br>${esc(t('Sin columna, se quedan como están:'))} ${miss.map(p => `<code>{{${esc(p.name)}}}</code>`).join(' ')}` : '');
    q('.bk-go').disabled = !n;
  };
  const drawMap = () => {
    q('.bk-map').hidden = false;
    q('.bk-rows').innerHTML = phs.map(p => `<label class="fr-l" style="display:flex;gap:8px;align-items:center"><code style="min-width:9em">{{${esc(p.name)}}}</code>
      <select data-ph="${esc(p.key)}" style="flex:1"><option value="-1">${t('(ninguna)')}</option>${header.map((h, i) => `<option value="${i}"${map[p.key] === i ? ' selected' : ''}>${esc(h || `${t('Columna')} ${i + 1}`)}${data[0]?.[i] ? ` — ${esc(String(data[0][i]).slice(0, 30))}` : ''}</option>`).join('')}</select></label>`).join('');
    count();
  };
  q('.bk-rows').addEventListener('change', e => { const s = e.target.closest('select[data-ph]'); if (s) { map[s.dataset.ph] = +s.value; count(); } });
  q('.bk-file').addEventListener('change', async () => {
    const f = q('.bk-file').files[0]; if (!f) return;
    const txt = await sheetText(f, { maxRows: bulk.MAX_ROWS + 1 }); if (!txt) return;
    const rows = parseDelimited(txt);
    header = rows[0] || []; data = rows.slice(1).filter(r => r.some(c => String(c).trim()));
    if (!data.length) { alertDialog(t('La hoja no tiene filas con datos.')); return; }
    map = bulk.autoMap(phs, header); drawMap();
  });
  q('.bk-go').addEventListener('click', async () => {
    const made = bulk.bulkSlides(models, data, map); if (!made.length) return;
    const out = back.querySelector('input[name=bk-out]:checked').value;
    if (out === 'append') { close(); const n = bulk.addBulk(made); toast(t('{n} diapositivas añadidas al final.').replace('{n}', n), { action: { label: t('Descargar PDF'), run: () => pdf(made) } }); return; }
    if (out === 'new') {
      if (!(await confirmDialog(t('¿Nueva presentación? Se perderá la actual si no la has guardado.'), { ok: t('Descartar la actual'), danger: true }))) return;
      close(); replaceDeck(bulk.deckWith(made, state.deck, `${state.deck.name || ''} (${Math.min(data.length, limit)})`.trim()));
      toast(t('Presentación creada con {n} diapositivas.').replace('{n}', made.length), { action: { label: t('Descargar PDF'), run: () => pdf(state.deck.slides) } });
      return;
    }
    close(); pdf(made);
  });
}

// The slides as a PDF (io/export/pdf.js), without changing the presentation.
async function pdf(made) {
  const note = toast(t('Creando el PDF…'), { busy: true });
  try { await exportPDFFile(bulk.deckWith(made)); note.close(); toast(t('PDF descargado.')); }
  catch (e) { note.close(); alertDialog(t('No se pudo exportar: ') + (e.message || e)); }
}
