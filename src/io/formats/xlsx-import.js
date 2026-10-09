// Excel workbooks (.xlsx) read in the browser, for a table or a chart's data: each sheet's cells as text — what Excel
// shows, near enough: numbers as numbers (without float noise), dates as dates, TRUE/FALSE, a formula's last value.
// An .xlsx is a zip of XML parts (ECMA-376): the workbook (its sheets), the shared strings, the styles (which number
// formats are dates) and one part per sheet. Nothing leaves the browser.

import { JSZIP_ESM } from '../../core/vendor.js';

const MAX_ROWS = 200, MAX_COLS = 30;

async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  const mod = await import(JSZIP_ESM);
  return mod.default || mod;
}
const xml = s => new DOMParser().parseFromString(s, 'application/xml');
const all = (el, name) => [...el.getElementsByTagNameNS('*', name)];
const textOf = el => all(el, 't').map(t => t.textContent).join('');           // (rich text: its runs, joined)

// «BC12» → column 54 (0-based), and its row.
export function cellRef(r) {
  const m = /^([A-Z]+)(\d+)$/.exec(r || ''); if (!m) return null;
  let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
  return { col: c - 1, row: +m[2] - 1 };
}
// A number as Excel would show it in general format: 0.1 + 0.2 → 0.3.
const num = v => { const n = +v; return Number.isFinite(n) ? String(+n.toPrecision(12)) : String(v); };
// Excel's day count (1900 system: day 1 is 1900-01-01, with its leap-year bug) → «2026-10-08» (and the time, if any).
function excelDate(v, date1904) {
  const n = +v; if (!Number.isFinite(n)) return String(v);
  const ms = Math.round((n - (date1904 ? 1462 : 25569)) * 864e5), d = new Date(ms), iso = d.toISOString();   // (days to 1970-01-01 from each system's day 0)
  return n % 1 ? iso.slice(0, 16).replace('T', ' ') : iso.slice(0, 10);
}
// Which styles are dates: the built-in date formats, and custom ones with day/month/year and no plain digits only.
function dateStyles(stylesXML) {
  if (!stylesXML) return new Set();
  const doc = xml(stylesXML), custom = {};
  all(doc, 'numFmt').forEach(f => { custom[f.getAttribute('numFmtId')] = f.getAttribute('formatCode') || ''; });
  const isDate = id => (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (custom[id] != null && /[dmy]/i.test(custom[id].replace(/"[^"]*"|\[[^\]]*\]/g, '')) && !/^[#0.,%\s]+$/.test(custom[id]));
  const out = new Set(), xfs = all(doc, 'cellXfs')[0];
  (xfs ? [...xfs.children] : []).forEach((x, i) => { if (isDate(+x.getAttribute('numFmtId'))) out.add(i); });
  return out;
}

// → [{ name, rows: [[text]] }] — the sheets with something in them, each trimmed of empty rows and columns at the end.
// (maxRows: more than a table's, for a list of pupils to make diplomas from — features/document/bulk.js.)
export async function readXlsx(data, { maxRows = MAX_ROWS } = {}) {
  const JSZip = await loadJSZip(), zip = await JSZip.loadAsync(data);
  const read = p => zip.file(p)?.async('string') ?? Promise.resolve(null);
  const book = await read('xl/workbook.xml'); if (!book) throw new Error('NOT_XLSX');
  const bookDoc = xml(book), rels = xml(await read('xl/_rels/workbook.xml.rels') || '<r/>');
  const target = {}; all(rels, 'Relationship').forEach(r => { target[r.getAttribute('Id')] = r.getAttribute('Target'); });
  const date1904 = all(bookDoc, 'workbookPr')[0]?.getAttribute('date1904') === '1' || all(bookDoc, 'workbookPr')[0]?.getAttribute('date1904') === 'true';
  const sstXML = await read('xl/sharedStrings.xml'), shared = sstXML ? all(xml(sstXML), 'si').map(textOf) : [];
  const dates = dateStyles(await read('xl/styles.xml'));
  const sheets = [];
  for (const s of all(bookDoc, 'sheet')) {
    if (s.getAttribute('state') === 'hidden' || s.getAttribute('state') === 'veryHidden') continue;
    const rid = s.getAttribute('r:id') || [...s.attributes].find(a => a.localName === 'id')?.value, t = target[rid]; if (!t) continue;
    const p = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''), sx = await read(p); if (!sx) continue;
    const rows = [];
    for (const c of all(xml(sx), 'c')) {
      const at = cellRef(c.getAttribute('r')); if (!at || at.row >= maxRows || at.col >= MAX_COLS) continue;
      const type = c.getAttribute('t'), v = all(c, 'v')[0]?.textContent ?? '';
      const val = type === 's' ? shared[+v] ?? '' : type === 'inlineStr' ? textOf(c) : type === 'str' ? v : type === 'b' ? (v === '1' ? 'TRUE' : 'FALSE')
        : type === 'e' ? v : v === '' ? '' : dates.has(+c.getAttribute('s')) ? excelDate(v, date1904) : num(v);
      (rows[at.row] ||= [])[at.col] = val;
    }
    const filled = Array.from(rows, r => Array.from(r || [], x => x ?? ''));
    while (filled.length && !filled.at(-1).some(x => String(x).trim())) filled.pop();
    const cols = Math.max(0, ...filled.map(r => { let n = r.length; while (n && !String(r[n - 1]).trim()) n--; return n; }));
    if (!filled.length || !cols) continue;
    sheets.push({ name: s.getAttribute('name') || '', rows: filled.map(r => Array.from({ length: cols }, (_, i) => String(r[i] ?? '').trim())) });
  }
  return sheets;
}

// Rows as tab-separated text (what a range pasted from Excel looks like: the tables and charts already read it).
export const rowsToTSV = rows => rows.map(r => r.map(c => String(c).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');
export const isXlsx = f => /\.xlsx$/i.test(f?.name || '') || f?.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
