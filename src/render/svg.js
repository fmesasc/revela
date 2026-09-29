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
  return tableColsHTML(b) + b.rows.map((row, r) => `<tr${b.rowH?.[r] ? ` style="height:${b.rowH[r]}px"` : ''}>${row.map((cell, c) => {
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

// A connector line/arrow between two blocks, in slide coordinates (W×H).
export function connectorSVG(b, fromB, toB, W, H) {
  if (!fromB || !toB) return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%"></svg>`;
  const fc = [fromB.x + fromB.w / 2, fromB.y + fromB.h / 2];
  const tc = [toB.x + toB.w / 2, toB.y + toB.h / 2];
  const [x1, y1] = borderPoint(fromB, tc[0], tc[1]);
  const [x2, y2] = borderPoint(toB, fc[0], fc[1]);
  const color = b.color || '#8a8a8a'; const arrow = b.arrow !== false;
  const marker = arrow ? `<defs><marker id="cm-${b.id}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="${color}"/></marker></defs>` : '';
  const p = `x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="pointer-events:none;overflow:visible">${marker}`
    + `<line ${p} stroke="transparent" stroke-width="14" style="pointer-events:stroke"/>`
    + `<line ${p} stroke="${color}" stroke-width="3"${dashAttr(b.dash, 3)} ${arrow ? `marker-end="url(#cm-${b.id})"` : ''}/></svg>`;
}

// Chart as inline SVG (no library, self‑contained on export). Bar or pie.
export function chartSig(b) { return (b.chartType || 'bar') + '|' + (b.color || '') + '|' + JSON.stringify([b.data || [], b.series || [], b.combo || 0, b.seriesName || '', b.grid, b.dataLabels, b.xTitle, b.yTitle]); }
export function chartSVG(b) {
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
  const ser = chartSeries(b), n = data.length || 1, all = ser.flatMap(x => x.values);
  const T = ser.length > 1 ? 9 : 4;                          // room for the legend
  const B = b.xTitle ? 46 : 50;                              // plot bottom (as before without the new options)
  const L = (b.grid ? 8 : 0) + (b.yTitle ? 4 : 0);           // room for the scale and the y title
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (hi === lo) hi = lo + 1;
  const step = niceStep((hi - lo) / 4);
  if (b.grid) { lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step; }
  const W = 100 - L, Y = v => B - (v - lo) / (hi - lo) * (B - T), Y0 = Y(0);
  const barSer = ser.filter(x => x.type === 'bar'), lineSer = ser.filter(x => x.type !== 'bar');
  const gap = W / n, bw = gap * 0.6 / Math.max(1, barSer.length);
  const X = i => L + gap * i + gap / 2;
  const num = v => (Math.abs(v) >= 1000 ? v.toLocaleString('es') : String(+v.toFixed(2)));
  const dl = (x, y, v, c) => (b.dataLabels ? `<text x="${x.toFixed(1)}" y="${(v < 0 ? y + 4 : y - 1.2).toFixed(1)}" font-size="3.2" text-anchor="middle" fill="${c}">${escSvg(num(v))}</text>` : '');
  const grid = b.grid ? Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, k) => lo + k * step).map(v =>
    `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="100" y2="${Y(v).toFixed(1)}" stroke="#8a8a8a" stroke-opacity="0.3" stroke-width="0.3" vector-effect="non-scaling-stroke"/>`
    + `<text x="${(L - 1).toFixed(1)}" y="${(Y(v) + 1.2).toFixed(1)}" font-size="3" text-anchor="end" fill="#8a8a8a">${escSvg(num(v))}</text>`).join('') : '';
  const bars = barSer.map((x, k) => x.values.map((v, i) => {
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
  const data = b.data || [], bar = (b.chartType || 'bar') === 'bar';
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
    + `<path d="${inkPath(b.points)}" fill="none" stroke="${b.color || '#ff2d2d'}" stroke-width="${b.width || 4}" `
    + `stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"${b.hl ? ' stroke-opacity="0.4"' : ''}/></svg>`;
}
export const inkSig = b => (b.points?.length || 0) + '|' + (b.color || '') + '|' + (b.width || '') + '|' + (b.hl ? 1 : 0);
export const iconSig = b => (b.icon || '') + '|' + (b.color || '');

// SVG for shape blocks, shared by the canvas, the thumbnails and the export.
// The viewBox is a fixed 100×100 stretched to the block (preserveAspectRatio
// none); a non‑scaling stroke keeps the outline an even width at any size.

export function shapeSig(b) {
  return `${b.shape}|${b.fill}|${b.stroke}|${b.strokeWidth}|${b.dash || ''}|${b.radius ?? ''}|${b.shape === 'rounded' ? b.w + 'x' + b.h : ''}|${b.path ? b.path.length + b.path.slice(0, 40) : ''}`;
}

// Polygon outlines in the 100×100 box (shared by the SVG and by the shape
// boolean operations, which need real geometry).
const SHAPE_POINTS = {
  triangle: '50,3 97,97 3,97', diamond: '50,2 98,50 50,98 2,50', pentagon: '50,3 98,39 79,96 21,96 2,39',
  star: '50,3 61,38 98,38 68,60 79,96 50,73 21,96 32,60 2,38 39,38',
  rightarrow: '2,32 60,32 60,12 98,50 60,88 60,68 2,68', leftarrow: '98,32 40,32 40,12 2,50 40,88 40,68 98,68',
  hexagon: '25,4 75,4 98,50 75,96 25,96 2,50', parallelogram: '22,14 98,14 78,86 2,86', trapezoid: '22,16 78,16 98,84 2,84',
  chevron: '2,14 68,14 98,50 68,86 2,86 32,50', plus: '36,3 64,3 64,36 97,36 97,64 64,64 64,97 36,97 36,64 3,64 3,36 36,36',
};
// Outline of a closed shape as [[x,y]…] in the 100×100 box, or null (lines).
export function shapeOutline100(shape) {
  if (SHAPE_POINTS[shape]) return SHAPE_POINTS[shape].split(' ').map(p => p.split(',').map(Number));
  if (shape === 'ellipse') return Array.from({ length: 72 }, (_, i) => { const a = i / 72 * 2 * Math.PI; return [50 + 48 * Math.cos(a), 50 + 48 * Math.sin(a)]; });
  if (shape === 'rounded') {
    const r = 12, pts = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    arc(98 - r, 2 + r, -Math.PI / 2); arc(98 - r, 98 - r, 0); arc(2 + r, 98 - r, Math.PI / 2); arc(2 + r, 2 + r, Math.PI);
    return pts;
  }
  if (shape === 'line' || shape === 'arrow' || shape === 'custom') return null;
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

export function shapeSVG(b) {
  const fill = b.fill || 'none';
  const stroke = b.stroke || '#1e2a3a';
  const sw = b.strokeWidth ?? 2;
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"${dashAttr(b.dash, sw)}`;
  const strokeOnly = `fill="none" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linecap="round"${dashAttr(b.dash, sw)}`;
  // Rounded rectangles in their real size, so the corners stay round when
  // the shape isn't square (radius: px, or 12 % of the short side).
  if (b.shape === 'rounded' && b.w && b.h) {
    const r = Math.min(b.radius ?? Math.min(b.w, b.h) * 0.12, Math.min(b.w, b.h) / 2);
    return `<svg viewBox="0 0 ${b.w} ${b.h}" preserveAspectRatio="none" width="100%" height="100%" style="display:block;overflow:visible">`
      + `<rect x="1" y="1" width="${Math.max(0, b.w - 2)}" height="${Math.max(0, b.h - 2)}" rx="${r}" ry="${r}" ${paint}/></svg>`;
  }
  let inner;
  if (SHAPE_POINTS[b.shape]) inner = `<polygon points="${SHAPE_POINTS[b.shape]}" ${paint}/>`;
  else switch (b.shape) {
    case 'ellipse':  inner = `<ellipse cx="50" cy="50" rx="48" ry="48" ${paint}/>`; break;
    case 'rounded':  inner = `<rect x="2" y="2" width="96" height="96" rx="12" ry="12" ${paint}/>`; break;
    case 'custom':   inner = `<path d="${b.path || ''}" fill-rule="evenodd" ${paint}/>`; break;   // merged shapes
    case 'line':     inner = `<line x1="3" y1="50" x2="97" y2="50" ${strokeOnly}/>`; break;
    case 'arrow':    inner = `<defs><marker id="ah-${b.id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" `
      + `orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="${stroke}"/></marker></defs>`
      + `<line x1="3" y1="50" x2="88" y2="50" ${strokeOnly} marker-end="url(#ah-${b.id})"/>`; break;
    default:         inner = `<rect x="2" y="2" width="96" height="96" ${paint}/>`;  // rectangle
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" `
    + `style="display:block;overflow:visible">${inner}</svg>`;
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
