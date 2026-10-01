// Formulas in table cells (Word's and PowerPoint's "Formula", and a
// spreadsheet's): a cell that starts with "=" shows what it works out to.
//   =SUMA(ARRIBA)  =SUM(ABOVE)      the numbers above it (also IZQUIERDA/LEFT, DEBAJO/BELOW, DERECHA/RIGHT)
//   =B2*C2         =PROMEDIO(B2:B5) cells by column letter and row number, and ranges
// Functions (Spanish or English names): SUMA, PROMEDIO, MIN, MAX, CONTAR,
// PRODUCTO, REDONDEAR, ABS; operators + − × ÷ ^ %, and brackets. Numbers in the
// cells may be written "1.234,5", "1,234.5", "12 €" or "30 %" (a fraction, as in a
// spreadsheet), and in the formula with a decimal comma (=B4*0,21; see tokens); the
// result carries the unit that follows from the sum or product (see U). A formula may use
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

// A comma between digits is a decimal comma ("=B4*0,21", as in Spanish
// spreadsheets) when ";" separates the arguments, when the formula is written
// with Spanish names, or outside any function's brackets; otherwise (=MAX(3,5))
// it separates arguments, as in English.
const ES_WORDS = /\b(SUMA|PROMEDIO|MEDIA|PRODUCTO|REDONDEAR|CONTAR|ARRIBA|DEBAJO|ABAJO|IZQUIERDA|DERECHA)\b/i;
function tokens(src) {
  const out = [], re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-zÁÉÍÓÚÑáéíóúñ]+\d*)|(:|,|;|\(|\)|\+|-|−|\*|×|\/|÷|\^|%))/y;
  const commaDec = /;/.test(src) || ES_WORDS.test(src);
  let m, depth = 0; re.lastIndex = 0;
  while (re.lastIndex < src.length) {
    if (!(m = re.exec(src))) { if (/^\s*$/.test(src.slice(re.lastIndex))) break; throw new Error('syntax'); }
    if (m[1] && !m[1].includes('.') && (commaDec || !depth)) {
      const d = /^,(\d+)/.exec(src.slice(re.lastIndex));
      if (d) { out.push({ n: +(m[1] + '.' + d[1]) }); re.lastIndex += d[0].length; continue; }
    }
    if (m[3] === '(') depth++; else if (m[3] === ')') depth--;
    out.push(m[1] ? { n: +m[1] } : m[2] ? { w: m[2].toUpperCase() } : { o: { '−': '-', '×': '*', '÷': '/', ';': ',' }[m[3]] || m[3] });
  }
  return out;
}

// Units through a formula, so the result's is coherent: a plain number or a
// percentage scales a quantity (=B2*C2 with "10 €" and "3" → €; =B2*21% → €),
// adding the same units keeps them, a ratio of the same unit has none
// (=B6/C6 with € over € → a plain number), and mixing units leaves none.
// A unit is [before, after] (["€", ""] or ["", "km"]); null = a plain number; false = none (mixed).
const PCT = ['', '%'];
const isPct = u => !!u && !u[0] && u[1] === '%';
const sameU = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const U = {
  add: (a, b) => (a === false || b === false ? false : !a ? b : !b ? a : sameU(a, b) ? a : false),
  mul: (a, b) => (a === false || b === false ? false : !a ? b : !b ? a : isPct(a) ? b : isPct(b) ? a : false),
  div: (a, b) => (a === false || b === false ? false : !b || isPct(b) ? a : sameU(a, b) ? null : false),
};

// A number shown as Spanish spreadsheets do (and the charts): thousands grouped
// from 1000 on ("4.215", not "4215") and at most two decimals, in the given language.
export function formatNumber(v, locale, maxFrac = 2) {
  const o = { maximumFractionDigits: maxFrac };
  try { return v.toLocaleString(locale, { ...o, useGrouping: 'always' }); } catch { /* older browsers */ }
  const s = v.toLocaleString(locale, o);
  if (Math.abs(v) < 1000 || Math.abs(v) >= 10000) return s;
  const g = (10000).toLocaleString(locale).replace(/\d/g, '') || '.';   // (the separator for 10.000)
  return s.replace(/^(-?\d)(\d{3})(?!\d)/, `$1${g}$2`);
}

const colOf = s => [...s].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;

// Every cell's value in a table: rows of { text } (what to show) and, for formulas, { formula: true }.
// With a header row, ARRIBA/ABOVE stops under it (a heading like "2024" is not a number to add).
export function tableValues(rows, locale, { header = false } = {}) {
  locale ||= globalThis.document?.documentElement?.lang || undefined;   // (numbers written as in the app's language)
  const H = rows.length, W = Math.max(0, ...rows.map(r => r.length)), memo = new Map(), busy = new Set();
  const fmt = (v, unit) => {
    if (!Number.isFinite(v)) return '#¡ERROR!';
    if (isPct(unit)) return formatNumber(v * 100, locale) + ' %';     // (a percentage is kept as a fraction: 21 % = 0,21)
    const s = formatNumber(v, locale);
    return unit ? `${unit[0]}${unit[0] && !/[$£€¥]$/.test(unit[0]) ? ' ' : ''}${s}${unit[1] ? ' ' + unit[1] : ''}`.trim() : s;
  };
  // A cell as { v, u } (a formula's result, or the number written in it), or null.
  // A percentage counts as a fraction, as in a spreadsheet: "21 %" is 0,21.
  function num(r, c) {
    if (r < 0 || c < 0 || r >= H || c >= W) return null;
    const txt = plainText(rows[r][c] ?? '');
    if (/^\s*=/.test(txt)) { const res = calc(r, c); return res.ok ? { v: res.v, u: res.unit || null } : null; }
    const n = cellNumber(txt); if (!n) return null;
    const u = n.unit[0] || n.unit[1] ? n.unit : null;
    return isPct(u) ? { v: n.v / 100, u: PCT } : { v: n.v, u };
  }
  function calc(r, c) {
    const key = r + ',' + c; if (memo.has(key)) return memo.get(key);
    if (busy.has(key)) return { ok: false };                      // (a formula that ends up using itself)
    busy.add(key);
    let res;
    try {
      const src = plainText(rows[r][c]).replace(/^\s*=/, ''), tk = tokens(src);
      let i = 0;
      const peek = () => tk[i], take = o => (tk[i]?.o === o ? (i++, true) : false);
      const need = o => { if (!take(o)) throw new Error('syntax'); };
      const ref = w => { const m = w.match(/^([A-Z]{1,2})(\d+)$/); return m ? [+m[2] - 1, colOf(m[1])] : null; };
      // A function's arguments: numbers, ranges and directions, as a flat list of { v, u }.
      const args = () => {
        const xs = []; need('(');
        if (take(')')) return xs;
        do {
          const t = peek(), a = t?.w && ref(t.w);
          if (t?.w && DIR[t.w]) {
            i++; const d = DIR[t.w], [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[d];
            for (let rr = r + dr, cc = c + dc; rr >= (header ? 1 : 0) && cc >= 0 && rr < H && cc < W; rr += dr, cc += dc) { const x = num(rr, cc); if (x) xs.push(x); }
          } else if (a && tk[i + 1]?.o === ':' && tk[i + 2]?.w && ref(tk[i + 2].w)) {
            const b = ref(tk[i + 2].w); i += 3;
            for (let rr = Math.min(a[0], b[0]); rr <= Math.max(a[0], b[0]); rr++)
              for (let cc = Math.min(a[1], b[1]); cc <= Math.max(a[1], b[1]); cc++) { const x = num(rr, cc); if (x) xs.push(x); }
          } else xs.push(expr());
        } while (take(','));
        need(')'); return xs;
      };
      const call = (f, xs) => {
        const v = AGG[f](xs.map(x => x.v));
        const u = f === 'COUNT' ? null : f === 'PRODUCT' ? xs.reduce((a, x) => U.mul(a, x.u), null)
          : f === 'ROUND' || f === 'ABS' ? (xs[0]?.u ?? null) : xs.reduce((a, x) => U.add(a, x.u), null);
        return { v, u };
      };
      const atom = () => {
        const t = tk[i++]; if (!t) throw new Error('syntax');
        if ('n' in t) return { v: t.n, u: null };
        if (t.o === '(') { const x = expr(); need(')'); return x; }
        if (t.o === '-') { const x = factor(); return { v: -x.v, u: x.u }; }
        if (t.o === '+') return factor();
        if (t.w && FN[t.w]) return call(FN[t.w], args());
        const a = t.w && ref(t.w);
        if (a) { const x = num(a[0], a[1]); if (!x) throw new Error('ref'); return x; }
        throw new Error('syntax');
      };
      const factor = () => {
        let x = atom();
        if (take('%')) x = { v: x.v / 100, u: x.u ? false : PCT };
        if (take('^')) { const e = factor(); x = { v: x.v ** e.v, u: x.u ? false : null }; }
        return x;
      };
      const term = () => {
        let x = factor();
        for (;;) {
          if (take('*')) { const y = factor(); x = { v: x.v * y.v, u: U.mul(x.u, y.u) }; } else if (take('/')) { const y = factor(); x = { v: x.v / y.v, u: U.div(x.u, y.u) }; } else return x;
        }
      };
      const expr = () => {
        let x = term();
        for (;;) {
          if (take('+')) { const y = term(); x = { v: x.v + y.v, u: U.add(x.u, y.u) }; } else if (take('-')) { const y = term(); x = { v: x.v - y.v, u: U.add(x.u, y.u) }; } else return x;
        }
      };
      const x = expr(); if (i < tk.length) throw new Error('syntax');
      res = { ok: Number.isFinite(x.v), v: x.v, unit: x.u || null };
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
