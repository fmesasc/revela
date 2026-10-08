// A spreadsheet file (Excel or CSV) as tab-separated text for a table or a chart: an Excel workbook with several sheets
// asks which one. → the text, or null (cancelled, nothing in it).

import { esc } from '../../core/text.js';
import { readXlsx, rowsToTSV, isXlsx } from '../../io/formats/xlsx-import.js';
import { alertDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

export const SHEET_ACCEPT = '.xlsx,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function sheetText(file) {
  if (!isXlsx(file)) return file.text();
  let sheets;
  try { sheets = await readXlsx(await file.arrayBuffer()); } catch { alertDialog(t('No se pudo leer ese libro de Excel.')); return null; }
  if (!sheets.length) { alertDialog(t('Ese libro de Excel no tiene datos.')); return null; }
  const one = sheets.length === 1 ? sheets[0] : await chooseSheet(sheets);
  return one ? rowsToTSV(one.rows) : null;
}

function chooseSheet(sheets) {
  return new Promise(done => {
    document.getElementById('sheet-modal')?.remove();
    const back = document.createElement('div'); back.id = 'sheet-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" style="text-align:start;width:min(420px,94vw)"><button class="modal-close">✕</button><h3>${t('¿Qué hoja?')}</h3>
      <div class="sheet-list" style="display:flex;flex-direction:column;gap:6px">${sheets.map((s, i) => `<button type="button" class="mini2" data-i="${i}" style="justify-content:space-between;display:flex;gap:12px">
        <b>${esc(s.name)}</b><small>${s.rows.length} × ${s.rows[0].length}</small></button>`).join('')}</div></div>`;
    document.body.appendChild(back);
    const end = v => { back.remove(); done(v); };
    back.querySelector('.modal-close').addEventListener('click', () => end(null));
    back.addEventListener('click', e => { if (e.target === back) end(null); const b = e.target.closest('[data-i]'); if (b) end(sheets[+b.dataset.i]); });
  });
}
