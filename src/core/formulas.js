// Formulas in table cells (Word's and PowerPoint's "Formula", and a
// spreadsheet's): a cell that starts with "=" shows what it works out to.
//   =SUMA(ARRIBA)  =SUM(ABOVE)      the numbers above it (also IZQUIERDA/LEFT, DEBAJO/BELOW, DERECHA/RIGHT)
//   =B2*C2         =PROMEDIO(B2:B5) cells by column letter and row number, and ranges
// Functions (Spanish or English names): SUMA, PROMEDIO, MIN, MAX, CONTAR,
// PRODUCTO, REDONDEAR, ABS; operators + − × ÷ ^ %, and brackets. Numbers in the
// cells may be written "1.234,5", "1,234.5", "12 €" or "30 %"; when all the
// numbers used carry the same unit, the result carries it too. A formula may use
// others (not itself): the source stays in the cell and the result is shown.

import { plainText } from './text.js';

export const isFormula = cell => /^\s*=/.test(plainText(cell));

const FN = { SUMA: 'SUM', SUM: 'SUM', PROMEDIO: 'AVG', MEDIA: 'AVG', AVERAGE: 'AVG', MIN: 'MIN', MAX: 'MAX', CONTAR: 'COUNT', COUNT: 'COUNT',
  PRODUCTO: 'PRODUCT', PRODUCT: 'PRODUCT', REDONDEAR: 'ROUND', ROUND: 'ROUND', ABS: 'ABS' };
const DIR = { ARRIBA: 'up', ABOVE: 'up', DEBAJO: 'down', ABAJO: 'down', BELOW: 'down', IZQUIERDA: 'left', LEFT: 'left', DERECHA: 'right', RIGHT: 'right' };
const AGG = {
  SUM: xs => xs.reduce((a, x) => a + x, 0), AVG: xs => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN),
  MIN: xs => (xs.length ? Math.min(...xs) : NaN), MAX: xs => (xs.length ? Math.max(...xs) : NaN), COUNT: xs => xs.length,
  PRODUCT: xs => xs.reduce((a, x) => a * x, 1), ABS: xs => Math.abs(xs[0]),
  ROUND: xs => { const f = 10 ** Math.round(xs[1] || 0); return Math.round(xs[0] * f) / f; },
};

// A number as people write it in a cell, with its unit (before or after), or null.
export function cellNumber(text) {
  const s = String(text ?? '').trim(), m = s.match(/^([^\d+\-−.,]*?)\s*([+\-−]?[\d.,\s]*\d(?:[.,]\d+)?)\s*([^\d]*)$/);
  // (A unit is a symbol before — € $ — or a short word after — kg, %, km/h —; "Año 2024" is text.)
  if (!m || /\d/.test(m[1] + m[3]) || /\p{L}/u.test(m[1]) || !/^[\p{L}%€$£¥°º²³/.]{0,6}$/u.test(m[3].trim())) return null;
  let n = m[2].replace(/\s/g, '').replace('−', '-');
  const dot = n.lastIndexOf('.'), com = n.lastIndexOf(',');
  // Both: the last one is the decimal point. One kind: thousands if repeated or followed by three digits.
  const thousands = ch => n.split(ch).length > 2 || new RegExp('\\' + ch + '\\d{3}$').test(n);
  if (dot >= 0 && com >= 0) n = dot > com ? n.replace(/,/g, '') : n.replace(/\./g, '').replace(',', '.');
  else if (com >= 0) n = thousands(',') ? n.replace(/,/g, '') : n.replace(',', '.');
  else if (dot >= 0 && thousands('.')) n = n.replace(/\./g, '');
  const v = Number(n); if (!Number.isFinite(v)) return null;
  return { v, unit: [m[1].trim(), m[3].trim()] };
}

function tokens(src) {
  const out = [], re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-zÁÉÍÓÚÑáéíóúñ]+\d*)|(:|,|;|\(|\)|\+|-|−|\*|×|\/|÷|\^|%))/y;
  let m; re.lastIndex = 0;
  while (re.lastIndex < src.length) {
    if (!(m = re.exec(src))) { if (/^\s*$/.test(src.slice(re.lastIndex))) break; throw new Error('syntax'); }
    out.push(m[1] ? { n: +m[1] } : m[2] ? { w: m[2].toUpperCase() } : { o: { '−': '-', '×': '*', '÷': '/', ';': ',' }[m[3]] || m[3] });
  }
  return out;
}
const colOf = s => [...s].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;

// Every cell's value in a table: rows of { text } (what to show) and, for formulas, { formula: true }.
// With a header row, ARRIBA/ABOVE stops under it (a heading like "2024" is not a number to add).
export function tableValues(rows, locale, { header = false } = {}) {
  locale ||= globalThis.document?.documentElement?.lang || undefined;   // (numbers written as in the app's language)
  const H = rows.length, W = Math.max(0, ...rows.map(r => r.length)), memo = new Map(), busy = new Set();
  const fmt = (v, unit) => {
    if (!Number.isFinite(v)) return '#¡ERROR!';
    const s = v.toLocaleString(locale, { maximumFractionDigits: 2 });
    return unit ? `${unit[0]}${unit[0] && !/[$£€¥]$/.test(unit[0]) ? ' ' : ''}${s}${unit[1] ? (unit[1] === '%' ? ' %' : ' ' + unit[1]) : ''}`.trim() : s;
  };
  // A cell as a number (a formula's result, or the number written in it), or null.
  function num(r, c, units) {
    if (r < 0 || c < 0 || r >= H || c >= W) return null;
    const txt = plainText(rows[r][c] ?? '');
    if (/^\s*=/.test(txt)) { const res = calc(r, c); if (!res.ok) return null; if (res.unit) units.push(res.unit); return res.v; }
    const n = cellNumber(txt); if (!n) return null;
    units.push(n.unit); return n.v;
  }
  function calc(r, c) {
    const key = r + ',' + c; if (memo.has(key)) return memo.get(key);
    if (busy.has(key)) return { ok: false };                      // (a formula that ends up using itself)
    busy.add(key);
    let res;
    try {
      const src = plainText(rows[r][c]).replace(/^\s*=/, ''), tk = tokens(src), units = [];
      let i = 0, counting = false;
      const peek = () => tk[i], take = o => (tk[i]?.o === o ? (i++, true) : false);
      const need = o => { if (!take(o)) throw new Error('syntax'); };
      const ref = w => { const m = w.match(/^([A-Z]{1,2})(\d+)$/); return m ? [+m[2] - 1, colOf(m[1])] : null; };
      // A function's arguments: numbers, ranges and directions, as a flat list.
      const args = () => {
        const xs = []; need('(');
        if (take(')')) return xs;
        do {
          const t = peek(), a = t?.w && ref(t.w);
          if (t?.w && DIR[t.w]) {
            i++; const d = DIR[t.w], [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[d];
            for (let rr = r + dr, cc = c + dc; rr >= (header ? 1 : 0) && cc >= 0 && rr < H && cc < W; rr += dr, cc += dc) { const v = num(rr, cc, units); if (v != null) xs.push(v); }
          } else if (a && tk[i + 1]?.o === ':' && tk[i + 2]?.w && ref(tk[i + 2].w)) {
            const b = ref(tk[i + 2].w); i += 3;
            for (let rr = Math.min(a[0], b[0]); rr <= Math.max(a[0], b[0]); rr++)
              for (let cc = Math.min(a[1], b[1]); cc <= Math.max(a[1], b[1]); cc++) { const v = num(rr, cc, units); if (v != null) xs.push(v); }
          } else xs.push(expr());
        } while (take(','));
        need(')'); return xs;
      };
      const atom = () => {
        const t = tk[i++]; if (!t) throw new Error('syntax');
        if ('n' in t) return t.n;
        if (t.o === '(') { const v = expr(); need(')'); return v; }
        if (t.o === '-') return -factor();
        if (t.o === '+') return factor();
        if (t.w && FN[t.w]) { if (FN[t.w] === 'COUNT') counting = true; return AGG[FN[t.w]](args()); }
        const a = t.w && ref(t.w);
        if (a) { const v = num(a[0], a[1], units); if (v == null) throw new Error('ref'); return v; }
        throw new Error('syntax');
      };
      const factor = () => { let v = atom(); if (take('%')) v /= 100; if (take('^')) v = v ** factor(); return v; };
      const term = () => { let v = factor(); for (;;) { if (take('*')) v *= factor(); else if (take('/')) v /= factor(); else return v; } };
      const expr = () => { let v = term(); for (;;) { if (take('+')) v += term(); else if (take('-')) v -= term(); else return v; } };
      const v = expr(); if (i < tk.length) throw new Error('syntax');
      const same = units.length && units.every(u => u[0] === units[0][0] && u[1] === units[0][1]) && (units[0][0] || units[0][1]);
      res = { ok: Number.isFinite(v), v, unit: same && !counting ? units[0] : null };
    } catch { res = { ok: false }; }
    busy.delete(key); memo.set(key, res);
    return res;
  }
  return rows.map((row, r) => row.map((cell, c) => {
    if (!/^\s*=/.test(plainText(cell ?? ''))) return { text: null };
    const res = calc(r, c);
    return { formula: true, text: res.ok ? fmt(res.v, res.unit) : '#¡ERROR!' };
  }));
}

// The cells as shown: each formula replaced by its result (escaped), the rest as they are.
export function shownRows(b, locale) {
  const rows = b.rows || [];
  if (!rows.some(row => row.some(c => /^\s*=|>\s*=/.test(c || '')))) return rows;
  const vals = tableValues(rows, locale, { header: !!b.header });
  return rows.map((row, r) => row.map((c, j) => (vals[r][j].formula ? vals[r][j].text.replace(/&/g, '&amp;').replace(/</g, '&lt;') : c)));
}
