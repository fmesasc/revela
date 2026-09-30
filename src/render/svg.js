import { plainText } from '../core/text.js';
import { shownRows } from '../core/formulas.js';

// Image filter/opacity, shared by the canvas, thumbnails and export.
export function imgFilter(b) {
  const a = b.adj || {};
  return `brightness(${a.brightness ?? 100}%) contrast(${a.contrast ?? 100}%) saturate(${a.saturate ?? 100}%)`;
}
export function imgOpacity(b) { return (b.adj?.opacity ?? 100) / 100; }
export function imgClip(b) {
  const c = b.crop; if (!c) return 'none';
  return `inset(${c.top || 0}% ${c.right || 0}% ${c.bottom || 0}% ${c.left || 0}%)`;
}

export const escSvg = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Table look: header row, banded rows, first column, horizontal lines only,
// plus colours. The same classes/variables drive the editor and every export.
const rgba = (hex, a) => { const m = String(hex || '').match(/^#([0-9a-f]{6})$/i); if (!m) return 'transparent';
  const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
export const tableClass = b => 'tbl' + (b.header ? ' has-header' : '') + (b.banded ? ' banded' : '')
  + (b.firstCol ? ' first-col' : '') + (b.lines ? ' lines' : '');
// Tables keep their own text size (the editor and reveal.js would otherwise
// give different ones), and optionally column widths, row heights, cell
// fills and cell margins (imported from PowerPoint).
export const tableVars = b => `--stroke:${b.stroke || '#fff'};font-size:${b.fontSize || 16}px;`
  + (b.fontFamily ? `font-family:${b.fontFamily};` : '')
  + (b.cellPad ? `--cell-pad:${b.cellPad.map(v => v + 'px').join(' ')};` : '') + (b.colW ? 'table-layout:fixed;' : '')
  + (b.headBg ? `--th-bg:${b.headBg};` : '') + (b.headFg ? `--th-fg:${b.headFg};` : '')
  + (b.band ? `--band:${rgba(b.band, b.bandAlpha ?? 0.18)};` : '');
export const tableCSS = (pre = '') => `${pre}table.tbl{border-collapse:collapse;width:100%;height:100%;margin:0}`
  + `${pre}table.tbl td{border:1px solid var(--stroke,#fff);padding:var(--cell-pad,.15em .4em);vertical-align:top}`
  + `${pre}table.tbl.lines td{border-width:0 0 1px 0}`
  + `${pre}table.tbl.banded:not(.has-header) tr:nth-child(odd) td,${pre}table.tbl.banded.has-header tr:nth-child(even) td{background:var(--band,rgba(127,127,127,.18))}`
  + `${pre}table.tbl.first-col td:first-child{font-weight:700}`
  + `${pre}table.tbl.has-header tr:first-child td{font-weight:700;background:var(--th-bg,rgba(127,127,127,.25));color:var(--th-fg,inherit)}`;
// Presets, coloured from the deck palette when applied (PowerPoint's table styles).
export function tablePresets(pal) {
  const [a1, a2, a3] = pal.accents;
  return {
    plain:   { name: 'Sencilla', header: false, banded: false, lines: false, headBg: '', headFg: '', band: '', stroke: pal.fg },
    grid:    { name: 'Cuadrícula', header: true, banded: false, lines: false, headBg: a1, headFg: '#ffffff', band: '', stroke: pal.fg },
    band1:   { name: 'Bandas 1', header: true, banded: true, lines: false, headBg: a1, headFg: '#ffffff', band: a1, stroke: a1 },
    band2:   { name: 'Bandas 2', header: true, banded: true, lines: false, headBg: a2, headFg: '#ffffff', band: a2, stroke: a2 },
    band3:   { name: 'Bandas 3', header: true, banded: true, lines: false, headBg: a3, headFg: '#ffffff', band: a3, stroke: a3 },
    minimal: { name: 'Mínima', header: true, banded: false, lines: true, headBg: '', headFg: '', band: '', stroke: pal.fg },
  };
}

// Table merged cells: returns (r,c) → null if covered by a merge, else {cs, rs}.
export function tableSpan(b) {
  const ms = b.merges || [];
  return (r, c) => {
    for (const m of ms) {
      if (r >= m.r && r < m.r + m.rs && c >= m.c && c < m.c + m.cs) return (r === m.r && c === m.c) ? { cs: m.cs, rs: m.rs } : null;
    }
    return { cs: 1, rs: 1 };
  };
}
export const tableColsHTML = b => (b.colW ? `<colgroup>${b.colW.map(w => `<col style="width:${(100 * w / b.colW.reduce((a, x) => a + x, 0)).toFixed(3)}%">`).join('')}</colgroup>` : '');
export const cellBg = (b, r, c) => b.cellBg?.[`${r},${c}`] || '';
export function tableRowsHTML(b, cellStyle = '') {
  const span = tableSpan(b);
  return tableColsHTML(b) + shownRows(b).map((row, r) => `<tr${b.rowH?.[r] ? ` style="height:${b.rowH[r]}px"` : ''}>${row.map((cell, c) => {
    const s = span(r, c); if (!s) return '';
    const at = (s.cs > 1 ? ` colspan="${s.cs}"` : '') + (s.rs > 1 ? ` rowspan="${s.rs}"` : '');
    const st = cellStyle + (cellBg(b, r, c) ? `background:${cellBg(b, r, c)};` : '');
    return `<td${at}${st ? ` style="${st}"` : ''}>${cell || ''}</td>`;
  }).join('')}</tr>`).join('');
}

// Text Art / WordArt presets, as style property maps (camelCase for the DOM).
export const WORDART = {
  fill: { color: '#3f6497', fontWeight: '800' },
  outline: { color: '#ffffff', webkitTextStroke: '2px #1e2a3a', paintOrder: 'stroke fill', fontWeight: '800' },
  shadow: { color: '#ffffff', textShadow: '3px 3px 0 rgba(0,0,0,.35)', fontWeight: '800' },
  gradient: { backgroundImage: 'linear-gradient(90deg,#3f6497,#c0392b)', webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '800' },
  neon: { color: '#ffffff', textShadow: '0 0 6px #3f6497,0 0 14px #3f6497', fontWeight: '800' },
  gold: { backgroundImage: 'linear-gradient(180deg,#f9d976,#b8860b)', webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '800' },
  fire: { backgroundImage: 'linear-gradient(180deg,#ffd200,#f7971e,#c0392b)', webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 2px 6px rgba(192,57,43,.5)', fontWeight: '800' },
  ice: { backgroundImage: 'linear-gradient(180deg,#e0f7ff,#7fb2d8)', webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', webkitTextStroke: '1px #2c5a7a', fontWeight: '800' },
  purple: { backgroundImage: 'linear-gradient(90deg,#7d3c98,#c471ed)', webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '800' },
  retro: { color: '#ffd200', textShadow: '2px 2px 0 #c0392b, 4px 4px 0 #1e2a3a', fontWeight: '800' },
};
export const WORDART_KEYS = Object.keys(WORDART);
export const WORDART_PROPS = ['color', 'fontWeight', 'webkitTextStroke', 'paintOrder', 'textShadow', 'backgroundImage', 'webkitBackgroundClip', 'backgroundClip'];
const kebab = p => { const k = p.replace(/[A-Z]/g, m => '-' + m.toLowerCase()); return k.startsWith('webkit') ? '-' + k : k; };
// Inline CSS string for export/preview.
export function wordartCSS(key) {
  const w = WORDART[key]; if (!w) return '';
  return Object.entries(w).map(([p, v]) => `${kebab(p)}:${v}`).join(';') + ';';
}
// Apply/clear the managed props on a live element (editor).
export function applyWordart(el, key) {
  const w = WORDART[key] || {};
  for (const p of WORDART_PROPS) el.style[p] = w[p] || '';
}

// Point on a box's border in the direction of (tx,ty), so a connector meets the
// edge instead of the centre (leaving room for the arrowhead).
function borderPoint(box, tx, ty) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const s = Math.min((box.w / 2) / Math.abs(dx || 1e-6), (box.h / 2) / Math.abs(dy || 1e-6));
  return [cx + dx * s, cy + dy * s];
}

// A connector line/arrow between two blocks, in slide coordinates (W×H):
// straight (between the edges facing each other), elbow (out of the facing
// sides, square turns half way) or curved (a smooth S between them); an arrow
// at the end, at the start, at both or none (arrow false).
export const CONNECTOR_ROUTES = [['straight', 'Recto'], ['elbow', 'De codo'], ['curve', 'Curvo']];
export function connectorSVG(b, fromB, toB, W, H) {
  if (!fromB || !toB) return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%"></svg>`;
  const fc = [fromB.x + fromB.w / 2, fromB.y + fromB.h / 2];
  const tc = [toB.x + toB.w / 2, toB.y + toB.h / 2];
  const color = b.color || '#8a8a8a', end = b.arrow !== false, start = !!b.arrowStart, f = v => v.toFixed(1);
  let d;
  if (b.route === 'elbow' || b.route === 'curve') {
    // Out of the sides that face each other (left/right if they are more apart across, else top/bottom).
    const across = Math.abs(tc[0] - fc[0]) >= Math.abs(tc[1] - fc[1]);
    const side = (bx, c, other) => (across ? [c[0] + Math.sign(other[0] - c[0] || 1) * bx.w / 2, c[1]] : [c[0], c[1] + Math.sign(other[1] - c[1] || 1) * bx.h / 2]);
    const [x1, y1] = side(fromB, fc, tc), [x2, y2] = side(toB, tc, fc);
    if (b.route === 'elbow') {
      if (across) { const xm = (x1 + x2) / 2; d = `M${f(x1)},${f(y1)} H${f(xm)} V${f(y2)} H${f(x2)}`; }
      else { const ym = (y1 + y2) / 2; d = `M${f(x1)},${f(y1)} V${f(ym)} H${f(x2)} V${f(y2)}`; }
    } else {
      const k = across ? Math.abs(x2 - x1) / 2 : Math.abs(y2 - y1) / 2;
      const c1 = across ? [x1 + Math.sign(x2 - x1) * k, y1] : [x1, y1 + Math.sign(y2 - y1) * k];
      const c2 = across ? [x2 - Math.sign(x2 - x1) * k, y2] : [x2, y2 - Math.sign(y2 - y1) * k];
      d = `M${f(x1)},${f(y1)} C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(x2)},${f(y2)}`;
    }
  } else {
    const [x1, y1] = borderPoint(fromB, tc[0], tc[1]), [x2, y2] = borderPoint(toB, fc[0], fc[1]);
    d = `M${f(x1)},${f(y1)} L${f(x2)},${f(y2)}`;
  }
  const mk = (id, back) => `<marker id="${id}" markerWidth="8" markerHeight="8" refX="${back ? 1 : 6}" refY="3" orient="auto"><path d="${back ? 'M7,0 L0,3 L7,6 z' : 'M0,0 L7,3 L0,6 z'}" fill="${color}"/></marker>`;
  const marker = end || start ? `<defs>${end ? mk(`cm-${b.id}`) : ''}${start ? mk(`cs-${b.id}`, true) : ''}</defs>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="pointer-events:none;overflow:visible">${marker}`
    + `<path d="${d}" fill="none" stroke="transparent" stroke-width="14" style="pointer-events:stroke"/>`
    + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${b.width || 3}" stroke-linejoin="round"${dashAttr(b.dash, b.width || 3)}${end ? ` marker-end="url(#cm-${b.id})"` : ''}${start ? ` marker-start="url(#cs-${b.id})"` : ''}/></svg>`;
}

// Chart as inline SVG (no library, self‑contained on export). Bar or pie.
export function chartSig(b) { return (b.chartType || 'bar') + '|' + (b.color || '') + '|' + (b.map ? b.map.scope + b.map.regions.length : '') + '|' + JSON.stringify([b.data || [], b.series || [], b.combo || 0, b.seriesName || '', b.grid, b.dataLabels, b.xTitle, b.yTitle]); }
// A histogram: the values (labels don't matter) grouped into ranges (Sturges' rule), counted.
export function histogramBins(values, k = 0) {
  const v = values.filter(Number.isFinite); if (!v.length) return [];
  // (Round widths — 1, 2, 2.5, 5 × 10^n — starting at a multiple of the width: 0–5, 5–10…)
  const min = Math.min(...v), max = Math.max(...v), want = k || Math.max(1, Math.ceil(Math.log2(v.length) + 1));
  const w = niceStep((max - min) / want || 1), lo = Math.floor(min / w) * w, n = Math.max(1, Math.ceil((max - lo) / w + 1e-9)), hi = lo + n * w;
  const fmt = x => String(+x.toFixed(Math.abs(w) < 1 ? 2 : Math.abs(w) < 10 ? 1 : 0)).replace('.', ',');
  const bins = Array.from({ length: n }, (_, i) => ({ label: `${fmt(lo + i * w)}–${fmt(lo + (i + 1) * w)}`, value: 0 }));
  for (const x of v) bins[Math.min(n - 1, Math.floor((x - lo) / w))].value++;
  return bins;
}
export function chartSVG(b) {
  if (b.chartType === 'histogram') return chartSVG({ ...b, chartType: 'bar', data: histogramBins((b.data || []).map(d => +d.value)), series: [], combo: false, _adjacent: true });
  if (b.chartType === 'hbar') return hbarSVG(b);
  if (b.chartType === 'map') return mapSVG(b);
  const data = b.data || []; const color = b.color || '#3f6497';
  const palette = ['#3f6497', '#c0392b', '#2b7a3b', '#d68910', '#7d3c98', '#16a085', '#c0392b'];
  if (b.chartType === 'pie' || b.chartType === 'doughnut') {
    const rI = b.chartType === 'doughnut' ? 20 : 0, rO = 40;
    const total = data.reduce((s, d) => s + (+d.value || 0), 0) || 1;
    let a0 = -Math.PI / 2; const arcs = data.map((d, i) => {
      const a1 = a0 + (d.value / total) * 2 * Math.PI;
      const pt = (r, a) => `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
      const large = a1 - a0 > Math.PI ? 1 : 0; const fill = palette[i % palette.length];
      const path = rI
        ? `M${pt(rO, a0)} A${rO},${rO} 0 ${large} 1 ${pt(rO, a1)} L${pt(rI, a1)} A${rI},${rI} 0 ${large} 0 ${pt(rI, a0)} Z`
        : `M50,50 L${pt(rO, a0)} A${rO},${rO} 0 ${large} 1 ${pt(rO, a1)} Z`;
      a0 = a1;
      return `<path d="${path}" fill="${fill}"/>`;
    }).join('');
    return `<svg viewBox="0 0 100 100" width="100%" height="100%">${arcs}</svg>`;
  }
  if (b.chartType === 'radar') {
    const n = Math.max(3, data.length), max = Math.max(1, ...data.map(d => +d.value || 0));
    const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]; };
    const rings = [0.25, 0.5, 0.75, 1].map(f => `<polygon points="${Array.from({ length: n }, (_, i) => pt(i, 40 * f).map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#8a8a8a55" stroke-width="0.4"/>`).join('');
    const axes = Array.from({ length: n }, (_, i) => { const [x, y] = pt(i, 40); return `<line x1="50" y1="50" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#8a8a8a55" stroke-width="0.4"/>`; }).join('');
    const poly = data.map((d, i) => pt(i, 40 * ((+d.value || 0) / max)).map(v => v.toFixed(1)).join(',')).join(' ');
    const labels = data.map((d, i) => { const [x, y] = pt(i, 47); return `<text x="${x.toFixed(1)}" y="${(y + 1.5).toFixed(1)}" font-size="4" text-anchor="middle" fill="#8a8a8a">${escSvg(d.label || '')}</text>`; }).join('');
    return `<svg viewBox="0 0 100 100" width="100%" height="100%">${rings}${axes}`
      + `<polygon points="${poly}" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="1"/>${labels}</svg>`;
  }
  if (b.chartType === 'scatter') {
    // x = numeric label if present, else the index; y = value.
    const xs = data.map((d, i) => (isFinite(parseFloat(d.label)) ? parseFloat(d.label) : i));
    const ys = data.map(d => +d.value || 0);
    const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1), minY = Math.min(...ys, 0), maxY = Math.max(...ys, 1);
    const X = x => 4 + (x - minX) / ((maxX - minX) || 1) * 92, Y = y => 54 - ((y - minY) / ((maxY - minY) || 1)) * 50;
    const dots = xs.map((x, i) => `<circle cx="${X(x).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="1.6" fill="${color}"/>`).join('');
    return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">`
      + `<line x1="4" y1="54" x2="98" y2="54" stroke="#8a8a8a" stroke-width="0.4" vector-effect="non-scaling-stroke"/>`
      + `<line x1="4" y1="2" x2="4" y2="54" stroke="#8a8a8a" stroke-width="0.4" vector-effect="non-scaling-stroke"/>${dots}</svg>`;
  }
  // Bars, lines and areas, with any number of series. In a bar chart with
  // "combo" on, the extra series are drawn as lines over the bars. Values can
  // be negative (bars grow from the zero line); optional gridlines with the
  // scale (b.grid), data labels (b.dataLabels) and axis titles (b.xTitle/yTitle).
  // Stacked bars: each category one column, the series one on another (100 %: as shares of the column).
  const stacked = b.chartType === 'stacked' || b.chartType === 'stacked100', pct = b.chartType === 'stacked100';
  let ser = chartSeries(b);
  if (pct) { const tot = data.map((_, i) => ser.reduce((a, x) => a + Math.abs(x.values[i] || 0), 0) || 1); ser = ser.map(x => ({ ...x, values: x.values.map((v, i) => v / tot[i] * 100) })); }
  const n = data.length || 1, sums = stacked ? data.map((_, i) => [ser.reduce((a, x) => a + Math.max(0, x.values[i]), 0), ser.reduce((a, x) => a + Math.min(0, x.values[i]), 0)]) : [];
  const all = stacked ? sums.flat() : ser.flatMap(x => x.values);
  const T = ser.length > 1 ? 9 : 4;                          // room for the legend
  const B = b.xTitle ? 46 : 50;                              // plot bottom (as before without the new options)
  const L = (b.grid ? 8 : 0) + (b.yTitle ? 4 : 0);           // room for the scale and the y title
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (hi === lo) hi = lo + 1;
  const step = niceStep((hi - lo) / 4);
  if (b.grid) { lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step; }
  const W = 100 - L, Y = v => B - (v - lo) / (hi - lo) * (B - T), Y0 = Y(0);
  const barSer = ser.filter(x => x.type === 'bar'), lineSer = ser.filter(x => x.type !== 'bar');
  const gap = W / n, bw = gap * (b._adjacent ? 0.96 : 0.6) / (stacked ? 1 : Math.max(1, barSer.length));
  const X = i => L + gap * i + gap / 2;
  const num = v => (pct ? Math.round(v) + ' %' : Math.abs(v) >= 1000 ? v.toLocaleString('es') : String(+v.toFixed(2)));
  const dl = (x, y, v, c) => (b.dataLabels ? `<text x="${x.toFixed(1)}" y="${(v < 0 ? y + 4 : y - 1.2).toFixed(1)}" font-size="3.2" text-anchor="middle" fill="${c}">${escSvg(num(v))}</text>` : '');
  const grid = b.grid ? Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, k) => lo + k * step).map(v =>
    `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="100" y2="${Y(v).toFixed(1)}" stroke="#8a8a8a" stroke-opacity="0.3" stroke-width="0.3" vector-effect="non-scaling-stroke"/>`
    + `<text x="${(L - 1).toFixed(1)}" y="${(Y(v) + 1.2).toFixed(1)}" font-size="3" text-anchor="end" fill="#8a8a8a">${escSvg(num(v))}</text>`).join('') : '';
  const up = data.map(() => 0), down = data.map(() => 0);
  const bars = stacked ? barSer.map(x => x.values.map((v, i) => {
    const base = v >= 0 ? up[i] : down[i], top = base + v; if (v >= 0) up[i] = top; else down[i] = top;
    const bx = L + gap * i + (gap - bw) / 2, y = Math.min(Y(top), Y(base)), h = Math.abs(Y(top) - Y(base));
    return `<rect x="${bx.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${x.color}"/>`
      + (b.dataLabels && h > 4 ? `<text x="${(bx + bw / 2).toFixed(1)}" y="${(y + h / 2 + 1.1).toFixed(1)}" font-size="3" text-anchor="middle" fill="#fff">${escSvg(num(v))}</text>` : '');
  }).join('')).join('') : barSer.map((x, k) => x.values.map((v, i) => {
    const bx = L + gap * i + (gap - bw * barSer.length) / 2 + k * bw, y = Math.min(Y(v), Y0), h = Math.abs(Y(v) - Y0);
    return `<rect x="${bx.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${x.color}"/>` + dl(bx + bw / 2, Y(v), v, x.color);
  }).join('')).join('');
  // Lines: across the full width for line/area charts, centred on the bars in a combo.
  const lx = i => (barSer.length ? X(i) : (n > 1 ? L + i * W / (n - 1) : L + W / 2));
  const lines = lineSer.map((x, k) => {
    const pts = x.values.map((v, i) => `${lx(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const area = b.chartType === 'area'
      ? `<polygon points="${+lx(0).toFixed(1)},${Y0.toFixed(1)} ${pts} ${+lx(n - 1).toFixed(1)},${Y0.toFixed(1)}" fill="${x.color}" opacity="${k ? 0.18 : 0.25}"/>` : '';
    const dots = x.values.map((v, i) => `<circle cx="${lx(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="1.3" fill="${x.color}"/>` + dl(lx(i), Y(v) - 1, v, x.color)).join('');
    return `${area}<polyline points="${pts}" fill="none" stroke="${x.color}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>${dots}`;
  }).join('');
  const zero = lo < 0 ? `<line x1="${L}" y1="${Y0.toFixed(1)}" x2="100" y2="${Y0.toFixed(1)}" stroke="#8a8a8a" stroke-width="0.5" vector-effect="non-scaling-stroke"/>` : '';
  const labels = data.map((d, i) => `<text x="${(barSer.length ? X(i) : lx(i)).toFixed(1)}" y="${(B + 8).toFixed(1)}" font-size="4" text-anchor="middle" fill="#8a8a8a">${escSvg(d.label || '')}</text>`).join('');
  const titles = (b.xTitle ? `<text x="${(L + W / 2).toFixed(1)}" y="59" font-size="3.6" text-anchor="middle" fill="#8a8a8a">${escSvg(b.xTitle)}</text>` : '')
    + (b.yTitle ? `<text x="2.6" y="${((T + B) / 2).toFixed(1)}" font-size="3.6" text-anchor="middle" fill="#8a8a8a" transform="rotate(-90 2.6 ${((T + B) / 2).toFixed(1)})">${escSvg(b.yTitle)}</text>` : '');
  const legend = ser.length > 1 ? ser.map((x, k) => {
    const lx0 = 100 - (ser.length - k) * 22;
    return `<rect x="${lx0}" y="0" width="3" height="3" fill="${x.color}"/><text x="${lx0 + 4}" y="2.6" font-size="3.4" fill="#8a8a8a">${escSvg(x.name)}</text>`;
  }).join('') : '';
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${grid}${bars}${lines}${zero}${labels}${titles}${legend}</svg>`;
}
// Filled map: each region in a shade between light and the chart's colour by its
// value (see features/content/maps.js for the outlines, kept in b.map). The data's
// labels are matched with any of a region's names or codes, without accents.
const plain = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function mapMatch(map, data) {
  const out = new Map(), idx = new Map();
  for (const r of map.regions) for (const n of r.n) idx.set(plain(n), r.k);
  for (const d of data) {
    const q = plain(d.label); if (!q) continue;
    let k = idx.get(q);
    if (!k) for (const [n, key] of idx) if (n.length > 3 && (n.includes(q) || q.includes(n)) && Math.min(n.length, q.length) >= 4) { k = key; break; }
    if (k) out.set(k, +d.value || 0);
  }
  return out;
}
function mapSVG(b) {
  const m = b.map, c = /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#3f6497';
  if (!m?.regions?.length) return `<svg viewBox="0 0 100 60" width="100%" height="100%"><text x="50" y="32" font-size="5" text-anchor="middle" fill="#8a8a8a">🗺</text></svg>`;
  const vals = mapMatch(m, b.data || []), list = [...vals.values()], lo = Math.min(...list, 0), hi = Math.max(...list, 1);
  const mix = f => '#' + [1, 3, 5].map(i => { const a = parseInt(c.slice(i, i + 2), 16), l = 232; return Math.round(l + (a - l) * f).toString(16).padStart(2, '0'); }).join('');
  const [W, H] = m.vb, sw = (W / 700).toFixed(2);
  const paths = m.regions.map(r => `<path d="${r.d}" fill="${vals.has(r.k) ? mix(0.15 + 0.85 * (vals.get(r.k) - lo) / ((hi - lo) || 1)) : '#8a8a8a40'}" stroke="#ffffffaa" stroke-width="${sw}">`
    + `<title>${escSvg(r.n[0])}${vals.has(r.k) ? ': ' + escSvg(String(vals.get(r.k)).replace('.', ',')) : ''}</title></path>`).join('');
  const inset = m.inset ? `<rect x="${m.inset[0]}" y="${m.inset[1]}" width="${m.inset[2]}" height="${m.inset[3] - m.inset[1]}" fill="none" stroke="#8a8a8a" stroke-width="${sw}"/>` : '';
  const fmt = v => String(+(+v).toFixed(2)).replace('.', ','), lw = W * 0.22, lx = W - lw - W * 0.02, ly = H - H * 0.07;
  const legend = list.length ? `<defs><linearGradient id="mg-${escA(b.id || 'x')}"><stop offset="0" stop-color="${mix(0.15)}"/><stop offset="1" stop-color="${mix(1)}"/></linearGradient></defs>`
    + `<rect x="${lx.toFixed(0)}" y="${ly.toFixed(0)}" width="${lw.toFixed(0)}" height="${(H * 0.025).toFixed(0)}" fill="url(#mg-${escA(b.id || 'x')})"/>`
    + `<text x="${lx.toFixed(0)}" y="${(ly - H * 0.015).toFixed(0)}" font-size="${(W / 45).toFixed(0)}" fill="#8a8a8a">${fmt(lo)}</text>`
    + `<text x="${(lx + lw).toFixed(0)}" y="${(ly - H * 0.015).toFixed(0)}" font-size="${(W / 45).toFixed(0)}" fill="#8a8a8a" text-anchor="end">${fmt(hi)}</text>` : '';
  const credit = m.credit ? `<text x="${(W * 0.01).toFixed(0)}" y="${(H * 0.99).toFixed(0)}" font-size="${(W / 70).toFixed(0)}" fill="#8a8a8a">${escSvg(m.credit)}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${paths}${inset}${legend}${credit}</svg>`;
}
// Horizontal bars: the categories down the side, the bars across (several series side by side).
function hbarSVG(b) {
  const data = b.data || [], ser = chartSeries(b), n = data.length || 1, all = ser.flatMap(x => x.values);
  const lo = Math.min(0, ...all), hi = Math.max(0, ...all) || 1, L = 22, R = 96, T = ser.length > 1 ? 8 : 3, B = 58;
  const X = v => L + (v - lo) / ((hi - lo) || 1) * (R - L), gap = (B - T) / n, bh = gap * 0.62 / ser.length;
  const num = v => (Math.abs(v) >= 1000 ? v.toLocaleString('es') : String(+v.toFixed(2)));
  const bars = ser.map((x, k) => x.values.map((v, i) => {
    const y = T + gap * i + (gap - bh * ser.length) / 2 + k * bh, x0 = Math.min(X(v), X(0)), w = Math.abs(X(v) - X(0));
    return `<rect x="${x0.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" fill="${x.color}"/>`
      + (b.dataLabels ? `<text x="${(X(v) + (v < 0 ? -1 : 1)).toFixed(1)}" y="${(y + bh / 2 + 1.1).toFixed(1)}" font-size="3" text-anchor="${v < 0 ? 'end' : 'start'}" fill="${x.color}">${escSvg(num(v))}</text>` : '');
  }).join('')).join('');
  const labels = data.map((d, i) => `<text x="${L - 1.5}" y="${(T + gap * i + gap / 2 + 1.3).toFixed(1)}" font-size="3.6" text-anchor="end" fill="#8a8a8a">${escSvg(d.label || '')}</text>`).join('');
  const axis = `<line x1="${X(0).toFixed(1)}" y1="${T}" x2="${X(0).toFixed(1)}" y2="${B}" stroke="#8a8a8a" stroke-width="0.4" vector-effect="non-scaling-stroke"/>`;
  const legend = ser.length > 1 ? ser.map((x, k) => { const lx0 = 100 - (ser.length - k) * 22; return `<rect x="${lx0}" y="0" width="3" height="3" fill="${x.color}"/><text x="${lx0 + 4}" y="2.6" font-size="3.4" fill="#8a8a8a">${escSvg(x.name)}</text>`; }).join('') : '';
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${bars}${axis}${labels}${legend}</svg>`;
}
// A round step for a scale (1, 2, 2.5, 5 × 10^n).
export function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

// All series of a bar/line/area chart: the primary one (b.data, b.color) plus
// any extra ones in b.series, aligned with the primary labels.
export const SERIES_COLOURS = ['#e0873b', '#4caf7d', '#c94f4f', '#8e6cc9', '#3bb3c3', '#d4a017'];
export function chartSeries(b) {
  const data = b.data || [], bar = ['bar', 'stacked', 'stacked100', 'hbar', 'histogram'].includes(b.chartType || 'bar');
  return [{ name: b.seriesName || 'Serie 1', color: b.color || '#3f6497', values: data.map(d => +d.value || 0), type: bar ? 'bar' : 'line' }]
    .concat((b.series || []).map((x, i) => ({
      name: x.name || `Serie ${i + 2}`, color: x.color || SERIES_COLOURS[i % SERIES_COLOURS.length],
      values: data.map((_, k) => +(x.values || [])[k] || 0), type: bar && !b.combo ? 'bar' : 'line',
    })));
}

// A small built‑in icon set (inline SVG paths, 24×24) — no external font/CDN.
const ICONS = {
  check: '<path d="M20 6L9 17l-5-5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M4 12h14M13 6l6 6-6 6"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  triangle: '<path d="M12 4l9 16H3z"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>',
  heart: '<path d="M12 20S4 14 4 9a4 4 0 018-1 4 4 0 018 1c0 5-8 11-8 11z"/>',
  home: '<path d="M4 11l8-7 8 7M6 10v9h5v-5h2v5h5v-9"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  location: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  bolt: '<path d="M13 3L4 14h6l-1 7 9-11h-6z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
};
export const ICON_NAMES = Object.keys(ICONS);
export function iconSVG(b) {
  const color = b.color || '#ffffff';
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${color}" `
    + `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="overflow:visible">${ICONS[b.icon] || ''}</svg>`;
}
// Freehand ink (Draw tab): points in the stroke's original box (vw × vh), drawn
// as a smoothed path that stretches with the block and keeps its line width.
export function inkPath(pts) {
  if (!pts || !pts.length) return '';
  if (pts.length < 3) return `M${pts[0][0]},${pts[0][1]} L${(pts[1] || pts[0])[0] + 0.1},${(pts[1] || pts[0])[1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = ((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1), my = ((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1);
    d += ` Q${pts[i][0]},${pts[i][1]} ${mx},${my}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${l[0]},${l[1]}`;
}
export function inkSVG(b) {
  return `<svg viewBox="0 0 ${b.vw || b.w} ${b.vh || b.h}" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">`
    + `<path d="${inkPath(b.points)}" pathLength="1" class="rvd" fill="none" stroke="${b.color || '#ff2d2d'}" stroke-width="${b.width || 4}" `
    + `stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"${b.hl ? ' stroke-opacity="0.4"' : ''}/></svg>`;
}
export const inkSig = b => (b.points?.length || 0) + '|' + (b.color || '') + '|' + (b.width || '') + '|' + (b.hl ? 1 : 0);
export const iconSig = b => (b.icon || '') + '|' + (b.color || '');

// SVG for shape blocks, shared by the canvas, the thumbnails and the export.
// The viewBox is a fixed 100×100 stretched to the block (preserveAspectRatio
// none); a non‑scaling stroke keeps the outline an even width at any size.

export function shapeSig(b) {
  return `${b.shape}|${b.fill}|${b.stroke}|${b.strokeWidth}|${b.dash || ''}|${b.radius ?? ''}|${b.shape === 'rounded' ? b.w + 'x' + b.h : ''}|${b.path ? b.path.length + b.path.slice(0, 40) : ''}`
    + `|${b.fill2 || ''}|${b.gradType || ''}|${b.gradAngle ?? ''}|${b.sketch ? 1 : ''}`;
}

// Polygon outlines in the 100×100 box (shared by the SVG and by the shape
// boolean operations, which need real geometry).
const SHAPE_POINTS = {
  triangle: '50,3 97,97 3,97', diamond: '50,2 98,50 50,98 2,50', pentagon: '50,3 98,39 79,96 21,96 2,39',
  star: '50,3 61,38 98,38 68,60 79,96 50,73 21,96 32,60 2,38 39,38',
  rightarrow: '2,32 60,32 60,12 98,50 60,88 60,68 2,68', leftarrow: '98,32 40,32 40,12 2,50 40,88 40,68 98,68',
  hexagon: '25,4 75,4 98,50 75,96 25,96 2,50', parallelogram: '22,14 98,14 78,86 2,86', trapezoid: '22,16 78,16 98,84 2,84',
  chevron: '2,14 68,14 98,50 68,86 2,86 32,50', plus: '36,3 64,3 64,36 97,36 97,64 64,64 64,97 36,97 36,64 3,64 3,36 36,36',
  // Basic
  rtriangle: '3,3 97,97 3,97', snip: '2,2 78,2 98,22 98,98 2,98', lightning: '40,2 74,2 56,38 82,38 26,98 42,54 18,54',
  // Arrows
  uparrow: '32,98 32,40 12,40 50,2 88,40 68,40 68,98', downarrow: '32,2 68,2 68,60 88,60 50,98 12,60 32,60',
  leftrightarrow: '2,50 24,14 24,34 76,34 76,14 98,50 76,86 76,66 24,66 24,86', updownarrow: '50,2 86,24 66,24 66,76 86,76 50,98 14,76 34,76 34,24 14,24',
  quadarrow: '50,2 66,18 57,18 57,43 82,43 82,34 98,50 82,66 82,57 57,57 57,82 66,82 50,98 34,82 43,82 43,57 18,57 18,66 2,50 18,34 18,43 43,43 43,18 34,18',
  notchedarrow: '2,32 60,32 60,12 98,50 60,88 60,68 2,68 16,50', homeplate: '2,14 72,14 98,50 72,86 2,86',
  // Stars and bursts
  star4: '50,2 60,40 98,50 60,60 50,98 40,60 2,50 40,40',
  burst: '50,2 58,24 80,8 74,32 98,34 78,50 96,70 70,66 72,94 54,74 38,98 36,72 10,84 22,60 2,48 24,38 12,14 36,24',
  // Callouts, flowchart, maths
  speech: '4,6 96,6 96,70 46,70 26,94 30,70 4,70', manualinput: '2,24 98,4 98,96 2,96', offpage: '4,4 96,4 96,66 50,96 4,66', merge: '2,4 98,4 50,96',
  minus: '6,40 94,40 94,60 6,60', multiply: '20,6 50,36 80,6 94,20 64,50 94,80 80,94 50,64 20,94 6,80 36,50 6,20',
};
// Regular polygons and stars, worked out (n corners; a star alternates two radii).
const ring = (n, r1, r2 = r1, turn = -90) => Array.from({ length: n * (r2 === r1 ? 1 : 2) }, (_, i) => {
  const a = (turn + i * 360 / (n * (r2 === r1 ? 1 : 2))) * Math.PI / 180, r = i % 2 && r2 !== r1 ? r2 : r1;
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
Object.assign(SHAPE_POINTS, { heptagon: ring(7, 48), octagon: ring(8, 48, 48, -112.5), decagon: ring(10, 48),
  star6: ring(6, 48, 27), star8: ring(8, 48, 34), seal: ring(12, 48, 38) });
const BTN = 'M12 4H88A8 8 0 0 1 96 12V88A8 8 0 0 1 88 96H12A8 8 0 0 1 4 88V12A8 8 0 0 1 12 4Z';
// Curved shapes (SVG paths in the 100×100 box; even-odd, so rings have their hole).
const SHAPE_PATHS = {
  heart: 'M50 92C22 72 4 56 4 34C4 18 16 7 30 7C40 7 46 12 50 20C54 12 60 7 70 7C84 7 96 18 96 34C96 56 78 72 50 92Z',
  cloud: 'M25 82C11 82 3 72 4 61C5 50 14 44 23 45C22 31 33 20 47 22C55 12 70 12 78 22C88 22 96 32 94 44C99 49 99 60 95 67C92 76 84 82 74 82Z',
  moon: 'M70 6A46 46 0 1 0 70 94A36 36 0 1 1 70 6Z',
  teardrop: 'M50 4C50 4 88 48 88 64A38 34 0 0 1 12 64C12 48 50 4 50 4Z',
  donut: 'M50 3A47 47 0 1 1 49.9 3ZM50 27A23 23 0 1 0 50.1 27Z',
  frame: 'M2 2H98V98H2ZM16 16V84H84V16Z',
  cylinder: 'M4 16A46 12 0 0 1 96 16L96 84A46 12 0 0 1 4 84ZM4 16A46 12 0 0 0 96 16',
  speechround: 'M50 6C75 6 96 20 96 40C96 60 75 74 50 74C44 74 38 73 33 72L14 94L20 68C10 62 4 52 4 40C4 20 25 6 50 6Z',
  terminator: 'M22 14H78A20 36 0 0 1 78 86H22A20 36 0 0 1 22 14Z',
  document: 'M3 4H97V80C74 66 56 96 30 88C18 84 10 82 3 86Z',
  delay: 'M4 6H55A41 44 0 0 1 55 94H4Z',
  equal: 'M6 26H94V44H6ZM6 56H94V74H6Z',
  divide: 'M6 42H94V58H6ZM41 20A9 9 0 1 0 59 20A9 9 0 1 0 41 20ZM41 80A9 9 0 1 0 59 80A9 9 0 1 0 41 80Z',
  // Action buttons: a rounded button with its sign cut out (they go where they say when presenting).
  actnext: BTN + 'M38 28L70 50L38 72Z', actprev: BTN + 'M62 28L30 50L62 72Z', actfirst: BTN + 'M28 28H36V72H28ZM70 28L40 50L70 72Z',
  actlast: BTN + 'M30 28L60 50L30 72ZM64 28H72V72H64Z', acthome: BTN + 'M50 22L78 48H69V76H57V60H43V76H31V48H22Z',
  // More basic shapes (PowerPoint's): pie, chord, block arc, cube, folded corner, smiley, sun, "no" sign, banners, thought bubble.
  pie: 'M50 50L98 50A48 48 0 1 1 50 2Z', chord: 'M95.1 33.6A48 48 0 1 0 33.6 95.1Z', blockarc: 'M4 50A46 46 0 0 1 96 50H74A24 24 0 0 0 26 50Z',
  cube: 'M2 26H74V98H2ZM2 26L26 2H98L74 26ZM74 26L98 2V74L74 98Z', foldedcorner: 'M2 2H98V74L74 98H2Z',
  smiley: 'M50 3A47 47 0 1 1 49.9 3ZM36 32A6 6 0 1 0 36.1 32ZM64 32A6 6 0 1 0 64.1 32ZM28 60Q50 84 72 60Q50 72 28 60Z',
  sun: 'M30 50A20 20 0 1 0 70 50A20 20 0 1 0 30 50ZM45.6 22.3L50.0 2.0L54.4 22.3ZM66.5 27.3L83.9 16.1L72.7 33.5ZM77.7 45.6L98.0 50.0L77.7 54.4ZM72.7 66.5L83.9 83.9L66.5 72.7ZM54.4 77.7L50.0 98.0L45.6 77.7ZM33.5 72.7L16.1 83.9L27.3 66.5ZM22.3 54.4L2.0 50.0L22.3 45.6ZM27.3 33.5L16.1 16.1L33.5 27.3Z',
  nosymbol: 'M50 3A47 47 0 1 1 49.9 3ZM50 20A30 30 0 1 0 50.1 20ZM76.1 64.8A30 30 0 0 1 64.8 76.1L23.9 35.2A30 30 0 0 1 35.2 23.9Z',
  ribbon: 'M2 28H16V8H84V28H98L88 56L98 84H72V64H28V84H2L12 56Z', wave: 'M2 20C25 2 40 38 50 20S75 2 98 20V80C75 62 60 98 50 80S25 62 2 80Z',
  thought: 'M22 66C8 66 2 56 6 46C0 36 8 22 22 24C26 10 44 6 54 14C64 4 84 8 86 22C98 26 100 42 92 50C98 60 88 70 76 66C68 74 50 74 44 66C36 72 26 72 22 66Z'
    + 'M18 82A6 6 0 1 0 30 82A6 6 0 1 0 18 82ZM6 94A3.5 3.5 0 1 0 13 94A3.5 3.5 0 1 0 6 94Z',
  // Open ones, drawn as a line (their fill left empty): arc, brackets and braces.
  arc: 'M6 50A44 44 0 0 1 94 50', leftbracket: 'M70 4H40V96H70', rightbracket: 'M30 4H60V96H30',
  leftbrace: 'M74 4C56 4 52 10 52 22V38C52 46 46 50 30 50C46 50 52 54 52 62V78C52 90 56 96 74 96',
  rightbrace: 'M26 4C44 4 48 10 48 22V38C48 46 54 50 70 50C54 50 48 54 48 62V78C48 90 44 96 26 96',
};
const OPEN = ['arc', 'leftbracket', 'rightbracket', 'leftbrace', 'rightbrace'];
export const isOpenShape = kind => OPEN.includes(kind);
// Shading over some faces, as PowerPoint draws them (the cube's top and side, the folded corner, the banner's folds).
const SHAPE_SHADES = { cube: [['M2 26L26 2H98L74 26Z', '#fff', 0.3], ['M74 26L98 2V74L74 98Z', '#000', 0.25]],
  foldedcorner: [['M98 74L74 98L78 78Z', '#000', 0.25]], ribbon: [['M16 64H28V84Z', '#000', 0.35], ['M84 64H72V84Z', '#000', 0.35]] };
// The shapes offered (Insert ▸ Shapes and the shape's own tab), by kind.
export const SHAPE_CATALOG = [
  ['Básicas', [['rect', 'Rectángulo'], ['rounded', 'Rectángulo redondeado'], ['snip', 'Rectángulo recortado'], ['ellipse', 'Elipse'], ['triangle', 'Triángulo'],
    ['rtriangle', 'Triángulo rectángulo'], ['diamond', 'Rombo'], ['parallelogram', 'Paralelogramo'], ['trapezoid', 'Trapecio'], ['pentagon', 'Pentágono'],
    ['hexagon', 'Hexágono'], ['heptagon', 'Heptágono'], ['octagon', 'Octógono'], ['decagon', 'Decágono'], ['plus', 'Cruz'], ['frame', 'Marco'], ['donut', 'Anillo'],
    ['pie', 'Sector circular'], ['chord', 'Cuerda'], ['blockarc', 'Arco de bloque'], ['cube', 'Cubo'], ['foldedcorner', 'Esquina doblada'], ['cylinder', 'Cilindro'],
    ['heart', 'Corazón'], ['cloud', 'Nube'], ['moon', 'Luna'], ['sun', 'Sol'], ['lightning', 'Rayo'], ['teardrop', 'Gota'], ['smiley', 'Cara sonriente'],
    ['nosymbol', 'Símbolo «No»'], ['arc', 'Arco'], ['leftbracket', 'Corchete de apertura'], ['rightbracket', 'Corchete de cierre'],
    ['leftbrace', 'Llave de apertura'], ['rightbrace', 'Llave de cierre']]],
  ['Cintas', [['ribbon', 'Cinta'], ['wave', 'Onda']]],
  ['Flechas', [['rightarrow', 'Flecha derecha'], ['leftarrow', 'Flecha izquierda'], ['uparrow', 'Flecha arriba'], ['downarrow', 'Flecha abajo'],
    ['leftrightarrow', 'Flecha doble'], ['updownarrow', 'Flecha arriba y abajo'], ['quadarrow', 'Flecha en cuatro direcciones'], ['notchedarrow', 'Flecha con muesca'],
    ['homeplate', 'Pentágono (flecha)'], ['chevron', 'Galón (chevron)']]],
  ['Estrellas', [['star4', 'Estrella de 4 puntas'], ['star', 'Estrella'], ['star6', 'Estrella de 6 puntas'], ['star8', 'Estrella de 8 puntas'], ['seal', 'Sello'], ['burst', 'Explosión']]],
  ['Bocadillos', [['speech', 'Bocadillo rectangular'], ['speechround', 'Bocadillo redondo'], ['thought', 'Bocadillo de pensamiento'], ['cloud', 'Nube']]],
  ['Diagrama de flujo', [['rect', 'Proceso'], ['diamond', 'Decisión'], ['terminator', 'Inicio o fin'], ['parallelogram', 'Datos'], ['document', 'Documento'],
    ['manualinput', 'Entrada manual'], ['offpage', 'Conector fuera de página'], ['merge', 'Combinar'], ['delay', 'Retraso'], ['cylinder', 'Base de datos']]],
  ['Botones de acción', [['actprev', 'Anterior'], ['actnext', 'Siguiente'], ['actfirst', 'Primera diapositiva'], ['actlast', 'Última diapositiva'], ['acthome', 'Inicio']]],
  ['Matemáticas', [['plus', 'Más'], ['minus', 'Menos'], ['multiply', 'Por'], ['divide', 'Entre'], ['equal', 'Igual']]],
  ['Líneas', [['line', 'Línea'], ['arrow', 'Flecha'], ['doublearrow', 'Línea con dos flechas'], ['curve', 'Curva'], ['freeform', 'Forma libre']]],
];
export const SHAPE_NAMES = {};                                  // each shape once, with the first name it has, in order
for (const [k, l] of SHAPE_CATALOG.flatMap(([, list]) => list)) if (!(k in SHAPE_NAMES)) SHAPE_NAMES[k] = l;
// A small picture of a shape, for the galleries.
const LINES = ['line', 'arrow', 'doublearrow', 'curve'];
export const isLineShape = kind => LINES.includes(kind);
export const shapeThumb = (kind, fill = 'currentColor') => kind === 'freeform'
  ? `<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M14 70C4 40 30 8 52 22S92 18 86 52 58 96 36 84 22 90 14 70Z" fill="none" stroke="${fill}" stroke-width="9" stroke-linejoin="round"/></svg>`
  : isLineShape(kind) || isOpenShape(kind) ? shapeSVG({ id: 'thumb-' + kind, shape: kind, fill: 'none', stroke: fill, strokeWidth: 3 }) : shapeSVG({ id: 'thumb-' + kind, shape: kind, fill: kind === 'line' || kind === 'arrow' ? 'none' : fill, stroke: fill, strokeWidth: kind === 'line' || kind === 'arrow' ? 3 : 0 });
// Outline of a closed shape as [[x,y]…] in the 100×100 box, or null (lines).
export function shapeOutline100(shape) {
  if (SHAPE_POINTS[shape]) return SHAPE_POINTS[shape].split(' ').map(p => p.split(',').map(Number));
  if (shape === 'ellipse') return Array.from({ length: 72 }, (_, i) => { const a = i / 72 * 2 * Math.PI; return [50 + 48 * Math.cos(a), 50 + 48 * Math.sin(a)]; });
  if (shape === 'rounded') {
    const r = 12, pts = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    arc(98 - r, 2 + r, -Math.PI / 2); arc(98 - r, 98 - r, 0); arc(2 + r, 98 - r, Math.PI / 2); arc(2 + r, 2 + r, Math.PI);
    return pts;
  }
  if (['line', 'arrow', 'doublearrow', 'curve', 'custom'].includes(shape) || SHAPE_PATHS[shape]) return null;
  return [[2, 2], [98, 2], [98, 98], [2, 98]];
}

// Line styles (PowerPoint's dash types: solid, dash, dot, dashDot): SVG dash patterns
// in multiples of the stroke width, and the closest CSS border style for boxes.
export function dashArray(dash, sw = 2) {
  const w = Math.max(1, sw);
  return { dash: `${4 * w} ${3 * w}`, dot: `${w} ${2 * w}`, dashDot: `${4 * w} ${2 * w} ${w} ${2 * w}` }[dash] || '';
}
const dashAttr = (dash, sw) => (dashArray(dash, sw) ? ` stroke-dasharray="${dashArray(dash, sw)}"${dash === 'dot' ? ' stroke-linecap="round"' : ''}` : '');
export const borderCSS = (color, dash, width = 2) => `${width}px ${{ dash: 'dashed', dashDot: 'dashed', dot: 'dotted' }[dash] || 'solid'} ${color}`;

// A shape's gradient (fill → fill2, linear at an angle or radial). Its id is
// new each time: the same shape is drawn in the slide, its thumbnail and
// elsewhere, and a hidden copy's gradient would not paint the others.
let defN = 0;
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
export function shapeDefs(b) {
  const n = ++defN, out = { defs: '', fill: b.fill || 'none' };
  if (b.fill2 && b.fill && b.fill !== 'none') {
    const id = `sg${n}`;
    if (b.gradType === 'radial') out.defs += `<radialGradient id="${id}" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="${b.fill}"/><stop offset="1" stop-color="${b.fill2}"/></radialGradient>`;
    else { const a = (b.gradAngle ?? 0) * Math.PI / 180, c = Math.cos(a) / 2, s = Math.sin(a) / 2, f = v => (0.5 + v).toFixed(3);
      out.defs += `<linearGradient id="${id}" x1="${f(-c)}" y1="${f(-s)}" x2="${f(c)}" y2="${f(s)}"><stop offset="0" stop-color="${b.fill}"/><stop offset="1" stop-color="${b.fill2}"/></linearGradient>`; }
    out.fill = `url(#${id})`;
  }
  if (out.defs) out.defs = `<defs>${out.defs}</defs>`;
  return out;
}
// Hand-drawn look (PowerPoint's "Sketched"): the outline through slightly
// wandering points, drawn twice like a pencil going over it (as rough.js does).
// Always the same for the same shape (seeded by its id).
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function outlineOf(b) {
  if (SHAPE_POINTS[b.shape]) return SHAPE_POINTS[b.shape].trim().split(/\s+/).map(p => p.split(',').map(Number));
  if (b.shape === 'ellipse') return Array.from({ length: 28 }, (_, i) => [50 + 48 * Math.cos(i * Math.PI / 14), 50 + 48 * Math.sin(i * Math.PI / 14)]);
  if (['line', 'arrow', 'doublearrow', 'curve', 'custom'].includes(b.shape) || SHAPE_PATHS[b.shape]) return null;       // (curves: drawn as they are)
  return [[2, 2], [98, 2], [98, 98], [2, 98]];
}
function sketchPath(pts, rnd, amp, closed = true) {
  // Each side a slightly bowed stroke from near one corner to near the next: the
  // corners stay sharp and the strokes overlap a little, as a pencil does.
  const j = () => (rnd() - 0.5) * 2 * amp, f = v => v.toFixed(1);
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, bow = j() * Math.min(1.6, L / 40);
    const mx = (p[0] + q[0]) / 2 - (q[1] - p[1]) / L * bow, my = (p[1] + q[1]) / 2 + (q[0] - p[0]) / L * bow;
    return `M${f(p[0] + j())},${f(p[1] + j())} Q${f(mx)},${f(my)} ${f(q[0] + j())},${f(q[1] + j())}`;
  }).join(' ');
}
// The fill: the same outline, barely moved, as one closed shape.
const sketchFill = (pts, rnd) => 'M' + pts.map(p => `${(p[0] + (rnd() - 0.5)).toFixed(1)},${(p[1] + (rnd() - 0.5)).toFixed(1)}`).join(' L') + ' Z';
export function shapeSVG(b) {
  const d = shapeDefs(b);
  const fill = d.fill;
  const stroke = b.stroke || '#1e2a3a';
  const sw = b.strokeWidth ?? 2;
  // (pathLength 1: the "Draw" effect traces any outline with a dash of its whole length; not on dashed lines, whose dashes are in px.)
  const pl = b.dash && b.dash !== 'solid' ? '' : ' pathLength="1" class="rvd"';
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"${pl}${dashAttr(b.dash, sw)}`;
  const strokeOnly = `fill="none" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linecap="round"${pl}${dashAttr(b.dash, sw)}`;
  const outline = b.sketch && outlineOf(b);
  if (outline) {
    const rnd = rng(Math.abs(hash(b.id || 'x'))), line = `fill="none" stroke="${stroke}" stroke-width="${Math.max(1, sw)}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="rvd"`;
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style="display:block;overflow:visible">${d.defs}`
      + `<path d="${sketchFill(outline, rnd)}" fill="${fill}" stroke="none" pathLength="1" class="rvd"/>`
      + (sw > 0 ? `<path d="${sketchPath(outline, rnd, 1.5)}" ${line}/><path d="${sketchPath(outline, rnd, 1.5)}" ${line} opacity=".7"/>` : '') + `</svg>`;
  }
  // Rounded rectangles in their real size, so the corners stay round when
  // the shape isn't square (radius: px, or 12 % of the short side).
  if (b.shape === 'rounded' && b.w && b.h) {
    const r = Math.min(b.radius ?? Math.min(b.w, b.h) * 0.12, Math.min(b.w, b.h) / 2);
    return `<svg viewBox="0 0 ${b.w} ${b.h}" preserveAspectRatio="none" width="100%" height="100%" style="display:block;overflow:visible">`
      + `${d.defs}<rect x="1" y="1" width="${Math.max(0, b.w - 2)}" height="${Math.max(0, b.h - 2)}" rx="${r}" ry="${r}" ${paint}/></svg>`;
  }
  let inner;
  if (SHAPE_POINTS[b.shape]) inner = `<polygon points="${SHAPE_POINTS[b.shape]}" ${paint}/>`;
  else if (isOpenShape(b.shape)) inner = `<path d="${SHAPE_PATHS[b.shape]}" stroke-linejoin="round" ${strokeOnly}/>`;
  else if (SHAPE_PATHS[b.shape]) inner = `<path d="${SHAPE_PATHS[b.shape]}" fill-rule="evenodd" ${paint}/>`
    + (SHAPE_SHADES[b.shape] || []).map(([dd, c, o]) => `<path d="${dd}" fill="${c}" fill-opacity="${o}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"/>`).join('');
  else switch (b.shape) {
    case 'ellipse':  inner = `<ellipse cx="50" cy="50" rx="48" ry="48" ${paint}/>`; break;
    case 'rounded':  inner = `<rect x="2" y="2" width="96" height="96" rx="12" ry="12" ${paint}/>`; break;
    case 'custom':   inner = `<path d="${b.path || ''}" fill-rule="evenodd" ${paint}/>`; break;   // merged shapes
    case 'line':     inner = `<line x1="3" y1="50" x2="97" y2="50" ${strokeOnly}/>`; break;
    case 'curve':    inner = `<path d="M3 82C28 -8 72 -8 97 82" ${strokeOnly}/>`; break;
    case 'doublearrow': inner = `<defs><marker id="ah-${b.id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto-start-reverse"><path d="M0,0 L5,2.5 L0,5 z" fill="${stroke}"/></marker></defs>`
      + `<line x1="12" y1="50" x2="88" y2="50" ${strokeOnly} marker-start="url(#ah-${b.id})" marker-end="url(#ah-${b.id})"/>`; break;
    case 'arrow':    inner = `<defs><marker id="ah-${b.id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" `
      + `orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="${stroke}"/></marker></defs>`
      + `<line x1="3" y1="50" x2="88" y2="50" ${strokeOnly} marker-end="url(#ah-${b.id})"/>`; break;
    default:         inner = `<rect x="2" y="2" width="96" height="96" ${paint}/>`;  // rectangle
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" `
    + `style="display:block;overflow:visible">${d.defs}${inner}</svg>`;
}

// Equations take the ribbon's formatting like text: size, colour, highlight,
// bold, underline, alignment, fill and border. The same for the canvas and
// every export. 42 px is reveal.js's text size, so the editor and the show agree.
export const MATH_SIZE = 42;
export function mathTeX(b) {
  let s = b.latex || '';
  if (b.bold) s = `\\boldsymbol{${s}}`;
  if (b.underline) s = `\\underline{${s}}`;
  return s;
}
export function mathCSS(b) {
  const jc = { left: 'flex-start', right: 'flex-end' }[b.textAlign] || 'center';
  return `font-size:${b.fontSize || MATH_SIZE}px;justify-content:${jc};${b.color ? `color:${b.color};` : ''}`
    + `${b.bg || b.highlight ? `background:${b.bg || b.highlight};` : ''}${b.borderColor ? `border:${borderCSS(b.borderColor, b.borderDash)};` : ''}`
    + `${b.radius ? `border-radius:${b.radius}px;` : ''}`;
}
export const mathSig = b => JSON.stringify([mathTeX(b), mathCSS(b)]);

// A web page that can't be embedded (its X-Frame-Options / CSP forbid frames)
// shown as a card that opens it: its icon, a title, the address and a button,
// or an image chosen by the user. Inline styles, so the export needs no CSS.
const escA = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function webCardHTML(b, openLabel = 'Abrir la web') {
  let host = b.src || '', origin = '';
  try { const u = new URL(b.src); host = u.host; origin = u.origin; } catch {}
  const title = b.cardTitle || host;
  const icon = origin ? `<img src="${escA(origin)}/favicon.ico" alt="" onerror="this.remove()" style="width:40px;height:40px;object-fit:contain;flex:0 0 auto">` : '';
  const button = `<span style="display:inline-block;padding:10px 18px;border-radius:8px;background:#3f6497;color:#fff;font-size:18px;font-weight:600">${escA(openLabel)} ↗</span>`;
  const text = `<div style="min-width:0;flex:1"><div style="font-size:22px;font-weight:700;color:#1e2430;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escA(title)}</div>`
    + `<div style="font-size:15px;color:#5b6472;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escA(host)}</div></div>`;
  if (b.poster) return `<div style="width:100%;height:100%;display:flex;flex-direction:column;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px #0003;font-family:system-ui,sans-serif">`
    + `<img src="${escA(b.poster)}" alt="" style="flex:1;min-height:0;width:100%;object-fit:cover">`
    + `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px">${icon}${text}${button}</div></div>`;
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;box-sizing:border-box;`
    + `background:#fff;border-radius:10px;box-shadow:0 2px 10px #0003;font-family:system-ui,sans-serif;text-align:center">`
    + `<div style="display:flex;align-items:center;gap:14px;max-width:100%">${icon}${text}</div>${button}</div>`;
}
export const webCardSig = b => JSON.stringify([b.src, b.cardTitle, b.poster ? b.poster.length + b.poster.slice(-32) : '']);

// Inner margins of a text box: its own (imported from PowerPoint, [top, right,
// bottom, left] px) or 6 px, plus the paragraph indent. The same in the editor
// and the show (the export had none, so text sat 6 px off).
export function textPadding(b) {
  const [t, r, bt, l] = Array.isArray(b.pad) ? b.pad : [6, 6, 6, 6];
  return `${t}px ${r}px ${bt}px ${l + (b.indent || 0)}px`;
}

// Body text levels (master styles): list items take the size and bullet of
// their nesting level from --l1…--l5 / --b1…--b5 (see master.levelVars).
export const levelCSS = (pre = '') => [1, 2, 3, 4, 5].map(n => {
  const lists = Array(n).fill(':is(ul,ol)').join(' ');
  return `${pre}.lv ${lists} li{font-size:var(--l${n})}${pre}.lv ${Array(n).fill('ul').join(' ')} li{list-style-type:var(--b${n})}`;
}).join('');

// Shadow of an object (PowerPoint's outer shadow): { x, y, blur } px and a
// colour (with alpha). drop-shadow follows the real outline of any object —
// a shape, a picture's transparency or the letters of a text without fill.
export const DEFAULT_SHADOW = { x: 4, y: 6, blur: 10, color: '#00000066' };
export const shadowCSS = b => (b.shadow ? `drop-shadow(${b.shadow.x ?? 4}px ${b.shadow.y ?? 6}px ${b.shadow.blur ?? 10}px ${b.shadow.color || '#00000066'})` : '');

// Countdown timer (Insert ▸ Countdown): a ring that empties, big numbers or a
// bar, with the time left. The presentation's runtime (io/runtime/timer.js)
// counts down by setting --p (what is left, 1 → 0) and the text.
export const fmtTime = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${String(m).padStart(2, '0')}:${x}`; };
export function timerSVG(b, left = b.seconds ?? 300) {
  const W = Math.max(1, +b.w || 300), H = Math.max(1, +b.h || 300), col = escA(b.color || '#ffffff'), txt = fmtTime(left);
  const svg = inner => `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="display:block;overflow:visible;--p:1" role="img" aria-label="${escA(txt)}">${inner}</svg>`;
  const text = (x, y, size) => `<text class="rv-t-txt" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${size.toFixed(1)}" font-weight="700" fill="${col}" style="font-variant-numeric:tabular-nums">${txt}</text>`;
  if (b.style === 'digital') return svg(text(W / 2, H / 2, Math.min(H * 0.62, W / (txt.length * 0.62))));
  if (b.style === 'bar') {
    const bh = Math.max(6, H * 0.18), y = H - bh;
    return svg(`${text(W / 2, y / 2, Math.min(y * 0.7, W / (txt.length * 0.62)))}<rect x="0" y="${y}" width="${W}" height="${bh}" rx="${bh / 2}" fill="${col}" opacity=".2"/>`
      + `<rect class="rv-t-bar" x="0" y="${y}" width="${W}" height="${bh}" rx="${bh / 2}" fill="${col}" style="transform-box:fill-box;transform-origin:left;transform:scaleX(var(--p,1))"/>`);
  }
  const s = Math.min(W, H), sw = s * 0.07, r = s / 2 - sw, cx = W / 2, cy = H / 2;
  return svg(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" opacity=".2"/>`
    + `<circle class="rv-t-arc" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" pathLength="1" stroke-dasharray="1"`
    + ` transform="rotate(-90 ${cx} ${cy})" style="stroke-dashoffset:calc(1 - var(--p,1))"/>${text(cx, cy, r * 0.5 / Math.max(1, (txt.length - 5) * 0.35 + 1))}`);
}
export const timerSig = b => [b.seconds, b.style, b.color, b.w, b.h].join('|');

// Curved text (PowerPoint's "Transform", Canva's "Curve"): the words along an
// arc. curve −100…100: up like a rainbow (>0) or down like a smile (<0); 100 a
// whole circle. The arc is as long as the box is wide. Plain text (the
// formatting of the box: its font, size, colour, weight).
let curveN = 0;
export function curvedTextSVG(b) {
  const W = Math.max(1, +b.w || 400), H = Math.max(1, +b.h || 200), c = Math.max(-100, Math.min(100, +b.curve || 0)), fs = +b.fontSize || 40;
  const txt = escA(plainText(b.html || '').replace(/\s+/g, ' ').trim());
  const bold = /<(b|strong)\b/i.test(b.html || '') || +b.fontWeight >= 600 || b.fontWeight === 'bold';
  const th = Math.min(1.98 * Math.PI, Math.max(0.05, Math.abs(c) / 100 * 2 * Math.PI)), up = c >= 0;
  // (More than half a turn: the circle takes the box; the text squeezes in if it is longer than the arc.)
  const R = th > Math.PI ? Math.max(0.92 * W / th, Math.min(W, H) / 2 - fs * 0.9) : 0.92 * W / th, len = R * th, long = txt.length * fs * 0.55 > len, fit = long || th > 1.9 * Math.PI;
  const cy = up ? fs + R : H - fs * 0.3 - R, y = up ? cy - R * Math.cos(th / 2) : cy + R * Math.cos(th / 2), f = v => v.toFixed(1);
  const d = `M${f(W / 2 - R * Math.sin(th / 2))},${f(y)} A${f(R)},${f(R)} 0 ${th > Math.PI ? 1 : 0} ${up ? 1 : 0} ${f(W / 2 + R * Math.sin(th / 2))},${f(y)}`;
  const id = `ct${++curveN}`;
  return `<svg class="curve-txt" viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="display:block;overflow:visible" role="img" aria-label="${txt}">`
    + `<defs><path id="${id}" d="${d}"/></defs><text font-size="${fs}" fill="currentColor"${bold ? ' font-weight="700"' : ''} text-anchor="middle">`
    + `<textPath href="#${id}" startOffset="50%"${fit ? ` textLength="${f(len * 0.98)}" lengthAdjust="${long ? 'spacingAndGlyphs' : 'spacing'}"` : ''}>${txt}</textPath></text></svg>`;
}
export const CURVES = [['0', 'Recto'], ['20', 'Arco suave'], ['45', 'Arco'], ['75', 'Arco cerrado'], ['-20', 'Hacia abajo suave'], ['-45', 'Hacia abajo'], ['100', 'Círculo']];

// A picture inside a device (Canva's mockups): its frame drawn with borders and
// a background under them, on the picture itself — a phone, a tablet, a laptop
// (screen and base), a monitor or a browser window (bar with its three dots).
export const DEVICES = [['', 'Ninguno'], ['phone', 'Móvil'], ['tablet', 'Tableta'], ['laptop', 'Portátil'], ['monitor', 'Monitor'], ['browser', 'Navegador']];
export function deviceStyle(b) {
  const k = Math.max(4, Math.round(Math.min(+b.w || 300, +b.h || 300) * 0.045));
  switch (b.device) {
    case 'phone': return { border: `${k}px solid #111`, borderRadius: `${k * 3.2}px`, background: '#111', boxShadow: '0 0 0 2px #3a3a3a, 0 14px 30px #0006', boxSizing: 'border-box' };
    case 'tablet': return { border: `${k}px solid #151515`, borderRadius: `${k * 1.8}px`, background: '#151515', boxShadow: '0 0 0 2px #3a3a3a, 0 14px 30px #0006', boxSizing: 'border-box' };
    case 'laptop': return { border: `${Math.round(k * 0.6)}px solid #1b1b1b`, borderBottom: `${Math.round(k * 1.6)}px solid #c9ccd1`, borderRadius: `${k}px ${k}px 4px 4px`,
      background: '#1b1b1b', boxShadow: '0 0 0 2px #3a3a3a, 0 12px 26px #0005', boxSizing: 'border-box' };
    case 'monitor': return { border: `${Math.round(k * 0.6)}px solid #111`, borderBottom: `${Math.round(k * 1.3)}px solid #111`, borderRadius: '6px', background: '#111', boxShadow: '0 0 0 2px #3a3a3a, 0 12px 26px #0005', boxSizing: 'border-box' };
    case 'browser': { const t = Math.max(18, Math.round(Math.min(+b.w || 300, +b.h || 300) * 0.1)), d = Math.max(3, Math.round(t * 0.17)), y = Math.round(t / 2);
      // (background-origin after the background shorthand, which would reset it)
      return { border: '1px solid #cfd3d8', borderTop: `${t}px solid transparent`, borderRadius: '8px', boxSizing: 'border-box', boxShadow: '0 12px 26px #0004',
        background: `radial-gradient(circle at ${t * 0.5}px ${y}px,#ff5f57 ${d}px,transparent ${d + 1}px),radial-gradient(circle at ${t * 0.95}px ${y}px,#febc2e ${d}px,transparent ${d + 1}px),`
          + `radial-gradient(circle at ${t * 1.4}px ${y}px,#28c840 ${d}px,transparent ${d + 1}px),#e8eaed`, backgroundOrigin: 'border-box' }; }
    default: return null;
  }
}
export const deviceCSS = b => { const s = deviceStyle(b); return s ? Object.entries(s).map(([k, v]) => `${kebab(k)}:${v};`).join('') : ''; };

// Text wrapping round a picture (PowerPoint/Word's "Square" wrap): the first
// picture or shape marked `wrap` that overlaps a text box leaves a gap in its
// lines — an empty float (::before) as tall as the picture's bottom, with
// shape-outside starting at its top, on the picture's side. Offsets are in the
// text's own box, inside its padding. Only when the text starts at the top.
export function wrapFor(t, slide) {
  if (t.type !== 'text' || (t.vAlign && t.vAlign !== 'top') || t.rotation || t.curve) return null;
  const [pt, , , pl] = Array.isArray(t.pad) ? t.pad : [6, 6, 6, 6], m = 14;
  for (const o of slide?.blocks || []) {
    if (!o.wrap || o === t || o.id === t.id) continue;
    if (o.x >= t.x + t.w || o.x + o.w <= t.x || o.y >= t.y + t.h || o.y + o.h <= t.y) continue;
    const ox = o.x - t.x - pl, oy = o.y - t.y - pt, left = o.x + o.w / 2 < t.x + t.w / 2;
    const w = left ? ox + o.w + m : t.w - pl - ox + m, h = oy + o.h + m / 2;
    if (w <= 0 || h <= 0) continue;
    return { side: left ? 'l' : 'r', w: Math.round(Math.min(w, t.w)), h: Math.round(h), top: Math.max(0, Math.round(oy - m / 2)) };
  }
  return null;
}
export const WRAP_CSS = '[data-wrap]::before{content:"";height:var(--wh);width:var(--ww);shape-outside:inset(var(--wt) 0 0 0)}'
  + '[data-wrap=l]::before{float:left}[data-wrap=r]::before{float:right}';
export const wrapAttrs = w => (w ? ` data-wrap="${w.side}"` : '');
export const wrapVars = w => (w ? `--ww:${w.w}px;--wh:${w.h}px;--wt:${w.top}px;` : '');

// Text inside a shape (as in PowerPoint): centred by default, inside the shape's
// middle (lower in a triangle, further in from a star's or a diamond's edge), in
// white or black depending on how dark the fill is. The same box styles as a
// text box, so the canvas, the thumbnails and every export agree.
const TEXT_INSET = { ellipse: [0.15, 0.15], triangle: [0.45, 0.22, 0.06], rtriangle: [0.45, 0.4, 0.06, 0.06], diamond: [0.25, 0.25], star: [0.35, 0.3],
  star4: [0.32, 0.32], star6: [0.28, 0.24], star8: [0.24, 0.24], seal: [0.2, 0.2], burst: [0.28, 0.28], pentagon: [0.25, 0.18], hexagon: [0.12, 0.2],
  heart: [0.2, 0.22, 0.3], cloud: [0.28, 0.18, 0.2], speech: [0.08, 0.08, 0.34], speechround: [0.12, 0.14, 0.34], thought: [0.15, 0.16, 0.36],
  donut: [0.3, 0.3], moon: [0.3, 0.2, 0.3, 0.45], cylinder: [0.3, 0.1, 0.12], parallelogram: [0.1, 0.22], trapezoid: [0.18, 0.22], plus: [0.36, 0.36] };
const luma = hex => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null; const n = parseInt(m[1], 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 255000; };
export const hasShapeText = b => b.type === 'shape' && !isLineShape(b.shape) && !isOpenShape(b.shape) && !/^act/.test(b.shape || '');
// Where an action button goes when it is inserted.
export const ACTION_GOTO = { actnext: 'next', actprev: 'prev', actfirst: 'first', actlast: 'last', acthome: 'first' };
export function shapeTextStyle(b) {
  const [t, x, bt = t, l = x] = TEXT_INSET[b.shape] || [0.08, 0.08], w = +b.w || 100, h = +b.h || 100, L = luma(b.fill);
  return { fontSize: b.fontSize || 28, textAlign: b.textAlign || 'center', vAlign: b.vAlign || 'middle', fontFamily: b.fontFamily, fontWeight: b.fontWeight,
    fontStyle: b.fontStyle, lineHeight: b.lineHeight, color: b.color || (L == null ? '' : L > 0.6 ? '#1f1f1f' : '#ffffff'),
    pad: [Math.round(h * t), Math.round(w * x), Math.round(h * bt), Math.round(w * l)] };
}

// The text inside a shape, over it (same box styles as a text box's).
export function shapeTextHTML(b) {
  const st = shapeTextStyle(b), j = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[st.vAlign];
  return `<div class="rv-shape-text" style="position:absolute;inset:0;box-sizing:border-box;padding:${textPadding(st)};font-size:${st.fontSize}px;text-align:${st.textAlign};`
    + `${st.color ? `color:${st.color};` : ''}${st.fontFamily ? `font-family:${st.fontFamily};` : ''}${st.fontWeight ? `font-weight:${st.fontWeight};` : ''}${st.fontStyle ? `font-style:${st.fontStyle};` : ''}`
    + `${st.lineHeight ? `line-height:${st.lineHeight};` : ''}display:flex;flex-direction:column;justify-content:${j};overflow:hidden">${b.html}</div>`;
}
