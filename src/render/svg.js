import { plainText } from '../core/text.js';
import { shownRows } from '../core/formulas.js';
import { MORE_ICONS } from './icons.js';

// Image filter/opacity, shared by the canvas, thumbnails and export.
export function imgFilter(b) {
  const a = b.adj || {};
  return `brightness(${a.brightness ?? 100}%) contrast(${a.contrast ?? 100}%) saturate(${a.saturate ?? 100}%)`;
}
// Which part of a picture shows when it fills its box ("cover"): its focus, 50 % 50 % by default.
export const imgFocus = b => `${b.focusX ?? 50}% ${b.focusY ?? 50}%`;
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
// (b.color: the text's own colour — a dark table on a light slide, or the other way round —; else the palette's.)
export const tableVars = b => `--stroke:${b.stroke || '#fff'};font-size:${b.fontSize || 16}px;` + (/^#[0-9a-f]{3,8}$/i.test(b.color || '') ? `color:${b.color};` : '')
  + (b.fontFamily ? `font-family:${b.fontFamily};` : '')
  + (b.cellPad ? `--cell-pad:${b.cellPad.map(v => v + 'px').join(' ')};` : '') + (b.colW ? 'table-layout:fixed;' : '')
  + (b.dir === 'rtl' ? 'direction:rtl;' : '')
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
// (A tint, if given, takes the place of the preset's own blue: neon, fill and gradient in any colour.)
const tinted = (v, tint) => (tint && /^#[0-9a-f]{3,8}$/i.test(tint) ? String(v).split('#3f6497').join(tint) : v);
export function wordartCSS(key, tint) {
  const w = WORDART[key]; if (!w) return '';
  return Object.entries(w).map(([p, v]) => `${kebab(p)}:${tinted(v, tint)}`).join(';') + ';';
}
// Apply/clear the managed props on a live element (editor).
export function applyWordart(el, key, tint) {
  const w = WORDART[key] || {};
  for (const p of WORDART_PROPS) el.style[p] = w[p] ? tinted(w[p], tint) : '';
}

// A connector line/arrow between two blocks, in slide coordinates (W×H):
// straight (between the edges facing each other), elbow (out of the facing
// sides, square turns half way) or curved (a smooth S between them); an arrow
// at the end, at the start, at both or none (arrow false).
export const CONNECTOR_ROUTES = [['straight', 'Recto'], ['elbow', 'De codo'], ['curve', 'Curvo']];
// Its path (also redrawn inside the presentation when the slide adapts to the
// screen: embedded with toString(), so it uses nothing from outside).
export function connectorPath(route, fromB, toB) {
  // (a straight one meets each box's edge, not its centre: room for the arrowhead)
  const borderPoint = (box, tx, ty) => {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const s = Math.min((box.w / 2) / Math.abs(dx || 1e-6), (box.h / 2) / Math.abs(dy || 1e-6));
    return [cx + dx * s, cy + dy * s];
  };
  const fc = [fromB.x + fromB.w / 2, fromB.y + fromB.h / 2];
  const tc = [toB.x + toB.w / 2, toB.y + toB.h / 2];
  const f = v => v.toFixed(1);
  if (route === 'elbow' || route === 'curve') {
    // Out of the sides that face each other (left/right if they are more apart across, else top/bottom).
    const across = Math.abs(tc[0] - fc[0]) >= Math.abs(tc[1] - fc[1]);
    const side = (bx, c, other) => (across ? [c[0] + Math.sign(other[0] - c[0] || 1) * bx.w / 2, c[1]] : [c[0], c[1] + Math.sign(other[1] - c[1] || 1) * bx.h / 2]);
    const [x1, y1] = side(fromB, fc, tc), [x2, y2] = side(toB, tc, fc);
    if (route === 'elbow') {
      if (across) { const xm = (x1 + x2) / 2; return `M${f(x1)},${f(y1)} H${f(xm)} V${f(y2)} H${f(x2)}`; }
      const ym = (y1 + y2) / 2; return `M${f(x1)},${f(y1)} V${f(ym)} H${f(x2)} V${f(y2)}`;
    }
    const k = across ? Math.abs(x2 - x1) / 2 : Math.abs(y2 - y1) / 2;
    const c1 = across ? [x1 + Math.sign(x2 - x1) * k, y1] : [x1, y1 + Math.sign(y2 - y1) * k];
    const c2 = across ? [x2 - Math.sign(x2 - x1) * k, y2] : [x2, y2 - Math.sign(y2 - y1) * k];
    return `M${f(x1)},${f(y1)} C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(x2)},${f(y2)}`;
  }
  const [x1, y1] = borderPoint(fromB, tc[0], tc[1]), [x2, y2] = borderPoint(toB, fc[0], fc[1]);
  return `M${f(x1)},${f(y1)} L${f(x2)},${f(y2)}`;
}
export function connectorSVG(b, fromB, toB, W, H) {
  if (!fromB || !toB) return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%"></svg>`;
  const color = b.color || '#8a8a8a', end = b.arrow !== false, start = !!b.arrowStart;
  const d = connectorPath(b.route, fromB, toB);
  const mk = (id, back) => `<marker id="${id}" markerWidth="8" markerHeight="8" refX="${back ? 1 : 6}" refY="3" orient="auto"><path d="${back ? 'M7,0 L0,3 L7,6 z' : 'M0,0 L7,3 L0,6 z'}" fill="${color}"/></marker>`;
  const marker = end || start ? `<defs>${end ? mk(`cm-${b.id}`) : ''}${start ? mk(`cs-${b.id}`, true) : ''}</defs>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="pointer-events:none;overflow:visible">${marker}`
    + `<path d="${d}" fill="none" stroke="transparent" stroke-width="14" style="pointer-events:stroke"/>`
    + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${b.width || 3}" stroke-linejoin="round"${dashAttr(b.dash, b.width || 3)}${end ? ` marker-end="url(#cm-${b.id})"` : ''}${start ? ` marker-start="url(#cs-${b.id})"` : ''}/></svg>`;
}

// Chart as inline SVG (no library, self‑contained on export). Bar or pie.
export function chartSig(b) { return (b.chartType || 'bar') + '|' + (b.chartType === 'bubble' ? b.w + 'x' + b.h : (b.w / b.h).toFixed(2)) + '|' + (b.color || '') + '|' + (b.map ? b.map.scope + b.map.regions.length : '') + '|' + JSON.stringify([b.data || [], b.series || [], b.combo || 0, b.seriesName || '', b.grid, b.dataLabels, b.xTitle, b.yTitle, b.yMin, b.yMax, b.xMin, b.xMax, b.bins, b.legend, b.labelWidth, b.labelColor || b.textColor || '']); }
// A histogram: the values (labels don't matter) grouped into ranges (Sturges' rule), counted.
export function histogramBins(values, k = 0, edges = false) {
  const v = values.filter(Number.isFinite); if (!v.length) return [];
  // (Round widths — 1, 2, 2.5, 5 × 10^n — starting at a multiple of the width: 0–5, 5–10…)
  const min = Math.min(...v), max = Math.max(...v), want = k || Math.max(1, Math.ceil(Math.log2(v.length) + 1));
  const count = c => Math.max(1, Math.ceil((max - Math.floor(min / c) * c) / c + 1e-9));
  const w = !k ? niceStep((max - min) / want || 1) : [0.1, 1, 10].flatMap(f => [1, 2, 2.5, 5].map(m => +(m * f * 10 ** Math.floor(Math.log10((max - min) / want || 1))).toPrecision(6)))
    .reduce((a, c) => (Math.abs(count(c) - want) < Math.abs(count(a) - want) ? c : a)), lo = Math.floor(min / w) * w, n = Math.max(1, Math.ceil((max - lo) / w + 1e-9)), hi = lo + n * w;
  const fmt = x => fmtNum(x, Math.abs(w) < 1 ? 2 : Math.abs(w) < 10 ? 1 : 0), at = i => +(lo + i * w).toFixed(10);
  const bins = Array.from({ length: n }, (_, i) => ({ label: `${fmt(at(i))}–${fmt(at(i + 1))}`, value: 0, ...(edges && { from: at(i), to: at(i + 1) }) }));
  for (const x of v) bins[Math.min(n - 1, Math.floor((x - lo) / w))].value++;
  return bins;
}
// The charts are drawn on a 100×60 canvas stretched to the box (so bars and
// lines fill it whatever its shape); the texts and dots are squeezed back so
// they keep their proportions instead of looking stretched.
// The texts' colour (names, scale, titles, legends): grey, which reads on light and dark slides alike, or b.labelColor
// (textColor too: the name the other blocks use) — white on a dark slide, the ink of a paper one.
export function chartSVG(b) {
  const ink = /^#[0-9a-f]{3,8}$/i.test(b.labelColor || b.textColor || '') ? (b.labelColor || b.textColor) : '', svg = drawChart(b);
  return unstretchChart(ink ? svg.replaceAll('fill="#8a8a8a"', `fill="${ink}"`) : svg, b);
}
export function unstretchChart(svg, b) {
  const w = +b.w, h = +b.h;
  if (!(w > 0 && h > 0) || !/^<svg viewBox="0 0 100 60" preserveAspectRatio="none"/.test(svg)) return svg;
  const k = (h / 60) / (w / 100);                    // vertical scale ÷ horizontal scale
  if (Math.abs(k - 1) < 0.01) return svg;
  // (Squeezed along the axis stretched more, so the texts keep the smaller of the two scales.)
  const wide = k < 1, f = wide ? k : 1 / k;
  const fix = (tag, ax) => (m, attrs) => {
    const c = +(attrs.match(new RegExp(`\\b${ax}="(-?[\\d.]+)"`)) || [])[1] || 0, own = (attrs.match(/\btransform="([^"]*)"/) || [])[1], e = +(c * (1 - f)).toFixed(3);
    const t = `matrix(${wide ? +f.toFixed(4) : 1} 0 0 ${wide ? 1 : +f.toFixed(4)} ${wide ? e : 0} ${wide ? 0 : e})${own ? ' ' + own : ''}`;
    return `<${tag}${attrs.replace(/\s?\btransform="[^"]*"/, '')} transform="${t}"`;
  };
  return svg.replace(/<text((?:\s+[\w-]+="[^"]*")*)/g, fix('text', wide ? 'x' : 'y')).replace(/<circle((?:\s+[\w-]+="[^"]*")*)/g, fix('circle', wide ? 'cx' : 'cy'));
}
function drawChart(b) {
  if (b.chartType === 'histogram') {
    // (The bars side by side; under them the ranges' edges — 0, 5, 10… —, which don't run into each other.)
    const bins = histogramBins((b.data || []).map(d => +d.value), Math.round(+b.bins) || 0, true);
    return drawChart({ ...b, chartType: 'bar', data: bins, series: [], combo: false, _adjacent: true, _edges: bins.length ? [bins[0].from, ...bins.map(x => x.to)] : null });
  }
  if (b.chartType === 'hbar') return hbarSVG(b);
  if (b.chartType === 'waterfall') return waterfallSVG(b);
  if (b.chartType === 'funnel') return funnelSVG(b);
  if (b.chartType === 'treemap') return treemapSVG(b);
  if (b.chartType === 'bubble') return bubbleSVG(b);
  if (b.chartType === 'scatter') return scatterSVG(b);
  if (b.chartType === 'map') return mapSVG(b);
  const data = b.data || [];
  if (b.chartType === 'pie' || b.chartType === 'doughnut') {
    // (Each slice its own colour if given — d.color —, else the chart's colour first and then the
    // series colours; with labels, a legend at the side with each share, in a readable size.)
    const rI = b.chartType === 'doughnut' ? 20 : 0, rO = 40;
    const total = data.reduce((s, d) => s + (+d.value || 0), 0) || 1;
    const fills = pieColours(b);
    const legend = b.legend !== false && data.some(d => d.label);
    let a0 = -Math.PI / 2; const arcs = data.map((d, i) => {
      const a1 = a0 + (d.value / total) * 2 * Math.PI;
      const pt = (r, a) => `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
      const large = a1 - a0 > Math.PI ? 1 : 0; const fill = fills[i];
      const path = rI
        ? `M${pt(rO, a0)} A${rO},${rO} 0 ${large} 1 ${pt(rO, a1)} L${pt(rI, a1)} A${rI},${rI} 0 ${large} 0 ${pt(rI, a0)} Z`
        : `M50,50 L${pt(rO, a0)} A${rO},${rO} 0 ${large} 1 ${pt(rO, a1)} Z`;
      a0 = a1;
      return `<path d="${path}" fill="${fill}"/>`;
    }).join('');
    if (!legend) return `<svg viewBox="0 0 100 100" width="100%" height="100%">${arcs}</svg>`;
    // (The shares with one decimal when they need it — 97,5 % —; the drawing wider for long names.)
    // (Long names in two lines — the share on the second —: else the legend took the room and the pie shrank.)
    const texts = data.map(d => `${d.label || ''} · ${fmtNum((+d.value || 0) / total * 100, 1)} %`);
    const lines = texts.map(s => (textWidth(s, 1) > 16 ? twoLines(s) : [s]));
    const rows = lines.reduce((a, l) => a + l.length, 0) + (data.length - 1) * 0.35, lh = Math.min(16, 88 / rows), widest = Math.max(1, ...lines.flat().map(s => textWidth(s, 1)));
    const fs = Math.min(10, lh * 0.68, 130 / widest), sw = fs * 0.8, vbW = Math.max(180, Math.ceil(104 + sw + fs * 0.6 + widest * fs + 2));
    let y = 50 - (rows * lh) / 2 + lh / 2;
    const keys = data.map((d, i) => { const y1 = y; y += lh * (lines[i].length + 0.35);
      return `<rect x="104" y="${(y1 - sw / 2).toFixed(1)}" width="${sw.toFixed(1)}" height="${sw.toFixed(1)}" rx="1" fill="${fills[i]}"/>`
        + lines[i].map((l, k) => `<text x="${(104 + sw + fs * 0.6).toFixed(1)}" y="${(y1 + k * lh + fs * 0.36).toFixed(1)}" font-size="${fs.toFixed(1)}" fill="${b.labelColor || '#8a8a8a'}">${escSvg(l)}</text>`).join(''); }).join('');
    return `<svg viewBox="0 0 ${vbW} 100" width="100%" height="100%">${arcs}${keys}</svg>`;
  }
  if (b.chartType === 'radar') {
    // (Several series too — today against the goal —, each its own outline, with the key; the
    // names outside the outline, long ones in two lines, and the drawing wider or taller so
    // none is cut. b.yMax: the outer ring's value — 10 for marks out of 10.)
    const ser = chartSeries({ ...b, chartType: 'line' }).map(x => ({ ...x, values: x.values.map(v => +v || 0) }));
    const n = Math.max(3, data.length), fixMax = +b.yMax > 0 ? +b.yMax : 0, max = fixMax || Math.max(1, ...ser.flatMap(x => x.values));
    const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n, pt = (i, r) => [50 + r * Math.cos(ang(i)), 50 + r * Math.sin(ang(i))];
    const rings = [0.25, 0.5, 0.75, 1].map(f => `<polygon points="${Array.from({ length: n }, (_, i) => pt(i, 40 * f).map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#8a8a8a55" stroke-width="0.4"/>`).join('');
    const axes = Array.from({ length: n }, (_, i) => { const [x, y] = pt(i, 40); return `<line x1="50" y1="50" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#8a8a8a55" stroke-width="0.4"/>`; }).join('');
    const polys = ser.map((x, k) => `<polygon points="${x.values.map((v, i) => pt(i, 40 * Math.min(1, Math.max(0, v / max))).map(q => q.toFixed(1)).join(',')).join(' ')}" fill="${x.color}" fill-opacity="${k ? 0.15 : 0.35}" stroke="${x.color}" stroke-width="1"/>`).join('');
    const fs = 4, lh = fs * 1.15; let x0 = 0, y0 = 0, x1 = 100, y1 = 100;
    const labels = data.map((d, i) => {
      const c = Math.cos(ang(i)), s = Math.sin(ang(i)), [x, y] = pt(i, 43);
      const lines = String(d.label || '').length > 14 ? twoLines(d.label) : [String(d.label || '')], w = Math.max(...lines.map(l => textWidth(l, fs)));
      const anchor = c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle', left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      const top = s < -0.25 ? y - 1 - (lines.length - 1) * lh - fs * 0.8 : s > 0.25 ? y + 0.3 : y - (lines.length * lh) / 2;
      x0 = Math.min(x0, left - 1); x1 = Math.max(x1, left + w + 1); y0 = Math.min(y0, top - 1); y1 = Math.max(y1, top + lines.length * lh + 1);
      return lines.map((l, k) => `<text x="${x.toFixed(1)}" y="${(top + fs * 0.8 + k * lh).toFixed(1)}" font-size="${fs}" text-anchor="${anchor}" fill="#8a8a8a">${escSvg(l)}</text>`).join('');
    }).join('');
    const key = ser.length > 1 ? ser.map((x, k) => `<rect x="${(x0 + 2).toFixed(1)}" y="${(y0 + 2 + k * 6).toFixed(1)}" width="3.6" height="3.6" fill="${x.color}"/><text x="${(x0 + 7).toFixed(1)}" y="${(y0 + 5.1 + k * 6).toFixed(1)}" font-size="4" fill="#8a8a8a">${escSvg(x.name)}</text>`).join('') : '';
    return `<svg viewBox="${+x0.toFixed(1)} ${+y0.toFixed(1)} ${+(x1 - x0).toFixed(1)} ${+(y1 - y0).toFixed(1)}" width="100%" height="100%">${rings}${axes}${polys}${labels}${key}</svg>`;
  }
  // Bars, lines and areas, with any number of series. In a bar chart with
  // "combo" on, the extra series are drawn as lines over the bars. Values can
  // be negative (bars grow from the zero line); optional gridlines with the
  // scale (b.grid), data labels (b.dataLabels), axis titles (b.xTitle/yTitle)
  // and the vertical axis' ends (b.yMin/b.yMax: to widen a narrow range).
  // Stacked bars: each category one column, the series one on another (100 %: as shares of the column).
  // Stacked areas (stackedArea): each series a band over the ones before.
  const stacked = b.chartType === 'stacked' || b.chartType === 'stacked100', pct = b.chartType === 'stacked100', sArea = b.chartType === 'stackedArea';
  let ser = chartSeries(b);
  if (pct) { const tot = data.map((_, i) => ser.reduce((a, x) => a + Math.abs(x.values[i] || 0), 0) || 1); ser = ser.map(x => ({ ...x, values: x.values.map((v, i) => v / tot[i] * 100) })); }
  const n = data.length || 1, sums = stacked ? data.map((_, i) => [ser.reduce((a, x) => a + Math.max(0, x.values[i]), 0), ser.reduce((a, x) => a + Math.min(0, x.values[i]), 0)]) : [];
  const cum = [];
  if (sArea) ser.forEach((x, k) => cum.push(x.values.map((v, i) => (k ? cum[k - 1][i] : 0) + (+v || 0))));
  const all = stacked ? sums.flat() : sArea ? cum.flat() : ser.flatMap(x => x.values).filter(v => v != null);
  const T = ser.length > 1 ? 9 : 4;                          // room for the legend
  const sc = axisScale(Math.min(0, ...all), Math.max(0, ...all), b.yMin, b.yMax, !!b.grid), { lo, hi } = sc;
  const num = v => (pct ? Math.round(v) + ' %' : fmtNum(v));
  // (Room for the scale — as wide as its longest number — and the y title.)
  const L = (b.grid ? Math.max(8, Math.max(...sc.ticks.map(v => textWidth(num(v), 3, b))) + 2) : 0) + (b.yTitle ? 4 : 0);
  const barSer = ser.filter(x => x.type === 'bar'), lineSer = sArea ? [] : ser.filter(x => x.type !== 'bar');
  const W = 100 - L, gap = W / n, [, sy] = chartSqueeze(b);
  // The categories' names: one size for all; long ones in two lines (and the plot a little shorter).
  const slot = barSer.length || !sArea && b.chartType !== 'area' ? gap : (n > 1 ? W / (n - 1) : W), edges = b._edges;   // (as wide as lx below spaces them)
  let fit, every = 1;
  if (edges) {                                               // (a histogram: the edges' numbers, every other one if they don't fit)
    const labs = edges.map(v => fmtNum(v)), wid = Math.max(1, ...labs.map(s => textWidth(s, 1, b)));
    while (Math.min(4, every * gap * 0.75 / wid) < 2.6 && every < edges.length) every++;
    fit = { lines: labs.map((s, i) => (i % every ? [] : [s])), fs: Math.min(4, every * gap * 0.75 / wid) };
  } else fit = fitLabels(data.map(d => d.label || ''), slot * 0.94, 4, b);
  const lh = fit.fs * 1.1 * sy, two = fit.lines.some(l => l.length > 1);
  const B = (b.xTitle ? 46 : 50) - (two ? lh : 0);           // plot bottom (as before without the new options)
  const Y = v => B - (v - lo) / (hi - lo) * (B - T), Yc = v => Y(Math.min(hi, Math.max(lo, v)));
  const base = Math.min(hi, Math.max(lo, 0)), Y0 = Y(base);
  const bw = gap * (b._adjacent ? 0.96 : 0.6) / (stacked ? 1 : Math.max(1, barSer.length));
  const X = i => L + gap * i + gap / 2;
  const dl = (x, y, v, c) => (b.dataLabels ? `<text x="${x.toFixed(1)}" y="${(v < 0 ? y + 4 : y - 1.2).toFixed(1)}" font-size="3.2" text-anchor="middle" fill="${c}">${escSvg(num(v))}</text>` : '');
  const grid = b.grid ? sc.ticks.map(v =>
    `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="100" y2="${Y(v).toFixed(1)}" stroke="#8a8a8a" stroke-opacity="0.3" stroke-width="0.3" vector-effect="non-scaling-stroke"/>`
    + `<text x="${(L - 1).toFixed(1)}" y="${(Y(v) + 1.2).toFixed(1)}" font-size="3" text-anchor="end" fill="#8a8a8a">${escSvg(num(v))}</text>`).join('') : '';
  const up = data.map(() => 0), down = data.map(() => 0);
  const bars = stacked ? barSer.map(x => x.values.map((v, i) => {
    const bot = v >= 0 ? up[i] : down[i], top = bot + v; if (v >= 0) up[i] = top; else down[i] = top;
    const bx = L + gap * i + (gap - bw) / 2, y = Math.min(Yc(top), Yc(bot)), h = Math.abs(Yc(top) - Yc(bot));
    return `<rect x="${bx.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${x.colors?.[i] || x.color}"/>`
      + (b.dataLabels && h > 4 ? `<text x="${(bx + bw / 2).toFixed(1)}" y="${(y + h / 2 + 1.1).toFixed(1)}" font-size="3" text-anchor="middle" fill="#fff">${escSvg(num(v))}</text>` : '');
  }).join('')).join('') : barSer.map((x, k) => x.values.map((v, i) => {
    const bx = L + gap * i + (gap - bw * barSer.length) / 2 + k * bw, y = Math.min(Yc(v), Y0), h = Math.abs(Yc(v) - Y0), c = x.colors?.[i] || x.color;
    return `<rect x="${bx.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${c}"/>` + dl(bx + bw / 2, Yc(v), v, c);
  }).join('')).join('');
  // Lines: centred on their category (as PowerPoint draws them, and as on the bars of a combo) — from edge to edge, the
  // first and last values' labels were cut in half by the chart's sides; an area chart's fill, across the full width.
  const lx = i => (barSer.length || !sArea && b.chartType !== 'area' ? X(i) : (n > 1 ? L + i * W / (n - 1) : L + W / 2));
  const P = (i, v) => `${lx(i).toFixed(1)},${Yc(v).toFixed(1)}`;
  const lines = sArea ? ser.map((x, k) => {
    const top = cum[k], bot = k ? cum[k - 1] : top.map(() => base), pts = top.map((v, i) => P(i, v)).join(' ');
    const labels = b.dataLabels ? x.values.map((v, i) => { const h = Yc(bot[i]) - Yc(top[i]);
      const end = n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle';
      return v && h > 4 ? `<text x="${(lx(i) + (end === 'start' ? 1 : end === 'end' ? -1 : 0)).toFixed(1)}" y="${((Yc(bot[i]) + Yc(top[i])) / 2 + 1.1).toFixed(1)}" font-size="3" text-anchor="${end}" fill="#fff">${escSvg(num(v))}</text>` : ''; }).join('') : '';
    return `<polygon points="${pts} ${bot.map((v, i) => P(i, v)).reverse().join(' ')}" fill="${x.color}" fill-opacity="0.8"/>`
      + `<polyline points="${pts}" fill="none" stroke="${x.color}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>${labels}`;
  }).join('') : lineSer.map((x, k) => {
    // (Split at the gaps: one stretch of line, and of area, per run of values.)
    const runs = []; x.values.forEach((v, i) => { if (v == null) return; const r = runs[runs.length - 1]; if (r && r[r.length - 1] === i - 1) r.push(i); else runs.push([i]); });
    return runs.map(r => {
      const pts = r.map(i => P(i, x.values[i])).join(' ');
      const area = b.chartType === 'area'
        ? `<polygon points="${+lx(r[0]).toFixed(1)},${Y0.toFixed(1)} ${pts} ${+lx(r[r.length - 1]).toFixed(1)},${Y0.toFixed(1)}" fill="${x.color}" opacity="${k ? 0.18 : 0.25}"/>` : '';
      const dots = r.map(i => `<circle cx="${lx(i).toFixed(1)}" cy="${Yc(x.values[i]).toFixed(1)}" r="1.3" fill="${x.color}"/>` + dl(lx(i), Yc(x.values[i]) - 1, x.values[i], x.color)).join('');
      return `${area}${r.length > 1 ? `<polyline points="${pts}" fill="none" stroke="${x.color}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>` : ''}${dots}`;
    }).join('');
  }).join('');
  const zero = lo < 0 && hi > 0 ? `<line x1="${L}" y1="${Y0.toFixed(1)}" x2="100" y2="${Y0.toFixed(1)}" stroke="#8a8a8a" stroke-width="0.5" vector-effect="non-scaling-stroke"/>` : '';
  const lab = (x, ls) => ls.map((l, k) => `<text x="${x.toFixed(1)}" y="${(B + 4 + fit.fs * sy + k * lh).toFixed(1)}" font-size="${+fit.fs.toFixed(2)}" text-anchor="middle" fill="#8a8a8a">${escSvg(l)}</text>`).join('');
  const labels = edges ? edges.map((_, i) => lab(L + gap * i, fit.lines[i])).join('') : data.map((d, i) => lab(barSer.length ? X(i) : lx(i), fit.lines[i])).join('');
  const titles = (b.xTitle ? `<text x="${(L + W / 2).toFixed(1)}" y="59" font-size="3.6" text-anchor="middle" fill="#8a8a8a">${escSvg(b.xTitle)}</text>` : '')
    + (b.yTitle ? `<text x="2.6" y="${((T + B) / 2).toFixed(1)}" font-size="3.6" text-anchor="middle" fill="#8a8a8a" transform="rotate(-90 2.6 ${((T + B) / 2).toFixed(1)})">${escSvg(b.yTitle)}</text>` : '');
  const legend = seriesLegend(ser);
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
    + `<title>${escSvg(r.n[0])}${vals.has(r.k) ? ': ' + escSvg(fmtNum(vals.get(r.k))) : ''}</title></path>`).join('');
  const inset = m.inset ? `<rect x="${m.inset[0]}" y="${m.inset[1]}" width="${m.inset[2]}" height="${m.inset[3] - m.inset[1]}" fill="none" stroke="#8a8a8a" stroke-width="${sw}"/>` : '';
  const fmt = v => fmtNum(v), lw = W * 0.22, lx = W - lw - W * 0.02, ly = H - H * 0.07;
  const legend = list.length ? `<defs><linearGradient id="mg-${escA(b.id || 'x')}"><stop offset="0" stop-color="${mix(0.15)}"/><stop offset="1" stop-color="${mix(1)}"/></linearGradient></defs>`
    + `<rect x="${lx.toFixed(0)}" y="${ly.toFixed(0)}" width="${lw.toFixed(0)}" height="${(H * 0.025).toFixed(0)}" fill="url(#mg-${escA(b.id || 'x')})"/>`
    + `<text x="${lx.toFixed(0)}" y="${(ly - H * 0.015).toFixed(0)}" font-size="${(W / 45).toFixed(0)}" fill="#8a8a8a">${fmt(lo)}</text>`
    + `<text x="${(lx + lw).toFixed(0)}" y="${(ly - H * 0.015).toFixed(0)}" font-size="${(W / 45).toFixed(0)}" fill="#8a8a8a" text-anchor="end">${fmt(hi)}</text>` : '';
  const credit = m.credit ? `<text x="${(W * 0.01).toFixed(0)}" y="${(H * 0.99).toFixed(0)}" font-size="${(W / 70).toFixed(0)}" fill="#8a8a8a">${escSvg(m.credit)}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${paths}${inset}${legend}${credit}</svg>`;
}
// Horizontal bars: the categories down the side, the bars across (several series side by side).
// Waterfall (PowerPoint's): each bar starts where the one before ended — ups in
// the chart's colour, downs in red; a point called "Total" (or "Subtotal", in
// any language set out in TOTAL_WORDS) is a bar from zero to the running sum.
const TOTAL_WORDS = /^\s*(sub)?(total|totale|totaal|summe|gesamt|guztira|المجموع)(?![\p{L}\p{N}])/iu;   // (not \b: it doesn't see Arabic letters as a word)
export const isTotalLabel = s => TOTAL_WORDS.test(String(s || ''));
function waterfallSVG(b) {
  const data = b.data || [], n = data.length || 1, up = b.color || '#3f6497', down = '#c0392b', tot = '#7f8c8d';
  let run = 0;
  const steps = data.map(d => { const total = isTotalLabel(d.label), v = +d.value || 0, from = total ? 0 : run, to = total ? run : run + v; run = to; return { from, to, total, v: total ? to : v }; });
  // (The value axis' ends: b.yMin / b.yMax, so a large start — 21,10 € — doesn't flatten the small steps; the bars cut there.)
  const all = steps.flatMap(s => [s.from, s.to]), fin = v => v != null && v !== '' && isFinite(+v);
  const lo = fin(b.yMin) ? +b.yMin : Math.min(0, ...all), hi = fin(b.yMax) && +b.yMax > lo ? +b.yMax : (Math.max(0, ...all) || 1);
  const L = 8, R = 98, T = 4, gap = (R - L) / n, bw = gap * 0.62, [, sy] = chartSqueeze(b);
  // (The names all in one size: long ones in two lines, and smaller only as much as the longest needs.)
  const fit = fitLabels(data.map(d => d.label || ''), gap * 0.95, 3.4, b, 2.2, 3), lh = fit.fs * 1.1 * sy;
  const B = 52 - (Math.max(...fit.lines.map(l => l.length)) - 1) * lh * 0.6, Y = v => B - (Math.min(hi, Math.max(lo, v)) - lo) / ((hi - lo) || 1) * (B - T);
  const bars = steps.map((s, i) => {
    const x = L + gap * i + (gap - bw) / 2, y = Math.min(Y(s.from), Y(s.to)), h = Math.max(0.3, Math.abs(Y(s.to) - Y(s.from)));
    const own = data[i].color, fill = /^#[0-9a-f]{3,8}$/i.test(own || '') ? own : s.total ? tot : s.to >= s.from ? up : down;
    const link = i < steps.length - 1 ? `<line x1="${(x + bw).toFixed(1)}" y1="${Y(s.to).toFixed(1)}" x2="${(x + gap).toFixed(1)}" y2="${Y(s.to).toFixed(1)}" stroke="#8a8a8a" stroke-width="0.3" stroke-dasharray="1 1" vector-effect="non-scaling-stroke"/>` : '';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"/>${link}`
      + (b.dataLabels !== false ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 1).toFixed(1)}" font-size="3" text-anchor="middle" fill="#8a8a8a">${escSvg((s.v > 0 && !s.total ? '+' : '') + fmtNum(s.v))}</text>` : '')
      + fit.lines[i].map((l, k) => `<text x="${(x + bw / 2).toFixed(1)}" y="${(B + 1 + fit.fs * sy + k * lh).toFixed(1)}" font-size="${+fit.fs.toFixed(2)}" text-anchor="middle" fill="#8a8a8a">${escSvg(l)}</text>`).join('');
  }).join('');
  const axis = `<line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${R}" y2="${Y(0).toFixed(1)}" stroke="#8a8a8a" stroke-width="0.4" vector-effect="non-scaling-stroke"/>`;
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${axis}${bars}</svg>`;
}
// Treemap: each item a rectangle with an area in proportion to its value, laid
// out "squarified" (rows as square as they can be; Bruls, Huizing & van Wijk).
export function squarify(values, x, y, w, h) {
  const items = values.map((v, i) => ({ v: Math.max(0, +v || 0), i })).filter(o => o.v > 0).sort((a, b) => b.v - a.v);
  const total = items.reduce((s, o) => s + o.v, 0) || 1, out = [];
  let rect = { x, y, w, h }, rest = items.map(o => ({ ...o, a: o.v / total * w * h }));
  const worst = (row, side) => { const s = row.reduce((t, o) => t + o.a, 0), mx = Math.max(...row.map(o => o.a)), mn = Math.min(...row.map(o => o.a)); return Math.max(side * side * mx / (s * s), (s * s) / (side * side * mn)); };
  while (rest.length) {
    const side = Math.min(rect.w, rect.h); let row = [rest[0]], k = 1;
    while (k < rest.length && worst([...row, rest[k]], side) <= worst(row, side)) row.push(rest[k++]);
    rest = rest.slice(k);
    const s = row.reduce((t, o) => t + o.a, 0);
    if (rect.w >= rect.h) {                          // a column on the left
      const cw = s / rect.h; let yy = rect.y;
      for (const o of row) { const hh = o.a / cw; out.push({ i: o.i, x: rect.x, y: yy, w: cw, h: hh }); yy += hh; }
      rect = { x: rect.x + cw, y: rect.y, w: rect.w - cw, h: rect.h };
    } else {                                         // a row on top
      const rh = s / rect.w; let xx = rect.x;
      for (const o of row) { const ww = o.a / rh; out.push({ i: o.i, x: xx, y: rect.y, w: ww, h: rh }); xx += ww; }
      rect = { x: rect.x, y: rect.y + rh, w: rect.w, h: rect.h - rh };
    }
  }
  return out;
}
const TREE_COLOURS = ['#3f6497', '#e0873b', '#4caf7d', '#c94f4f', '#8e6cc9', '#3bb3c3', '#d4a017', '#7f8c8d'];
function treemapSVG(b) {
  const data = b.data || [], num = v => fmtNum(v);
  const cells = squarify(data.map(d => d.value), 0, 0, 100, 60).map(r => {
    const d = data[r.i], fill = r.i === 0 && b.color ? b.color : TREE_COLOURS[r.i % TREE_COLOURS.length], fs = Math.min(4, r.w / 6, r.h / 3);
    return `<rect x="${r.x.toFixed(2)}" y="${r.y.toFixed(2)}" width="${r.w.toFixed(2)}" height="${r.h.toFixed(2)}" fill="${fill}" stroke="#fff" stroke-width="0.6" vector-effect="non-scaling-stroke"/>`
      + (fs >= 1.6 ? `<text x="${(r.x + 1.2).toFixed(2)}" y="${(r.y + fs + 0.8).toFixed(2)}" font-size="${fs.toFixed(2)}" fill="#fff" font-weight="600">${escSvg(d.label || '')}</text>`
        + (b.dataLabels !== false && r.h > fs * 2.6 ? `<text x="${(r.x + 1.2).toFixed(2)}" y="${(r.y + fs * 2.2 + 0.8).toFixed(2)}" font-size="${(fs * 0.85).toFixed(2)}" fill="#fff" opacity=".85">${escSvg(num(d.value))}</text>` : '') : '');
  }).join('');
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%">${cells}</svg>`;
}
// Bubbles: x (a numeric label, or its place), y (the value), size (the second series; area in proportion).
export function bubblePoints(b) {
  const data = b.data || [], sizes = (b.series?.[0]?.values || []).map(v => Math.max(0, +v || 0));
  return data.map((d, i) => ({ name: isFinite(parseFloat(d.label)) ? '' : String(d.label || ''), x: isFinite(parseFloat(d.label)) ? parseFloat(d.label) : i + 1, y: +d.value || 0, s: sizes[i] ?? 1 }));
}
function bubbleSVG(b) {
  const pts = bubblePoints(b), color = b.color || '#3f6497', maxS = Math.max(1e-9, ...pts.map(p => p.s));
  // Round whatever the box's shape (the drawing stretches with it): radii in the box's pixels.
  const W = b.w || 100, H = b.h || 60, side = Math.min(W, H), [, sy] = chartSqueeze(b);
  const f = xyFrame(b, pts.map(p => p.x), pts.map(p => p.y), false, 0.08);
  const dots = pts.map(p => { const r = side * (0.02 + 0.11 * Math.sqrt(p.s / maxS)), rx = r / W * 100, ry = r / H * 60, cx = f.X(p.x), cy = f.Y(p.y);
    // (The name inside if it fits; else beside the bubble, on the side with room.)
    const fs = 3, tw = textWidth(p.name, fs, b), inside = tw <= rx * 1.8 && fs * sy <= ry * 1.7, right = cx + rx + 1 + tw <= 100;
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="${color}" fill-opacity=".6" stroke="${color}" stroke-width="0.4" vector-effect="non-scaling-stroke"/>`
      + (!p.name ? '' : inside ? `<text x="${cx.toFixed(1)}" y="${(cy + 1.1 * sy).toFixed(1)}" font-size="${fs}" text-anchor="middle" fill="#fff" font-weight="600">${escSvg(p.name)}</text>`
        : `<text x="${(right ? cx + rx + 1 : cx - rx - 1).toFixed(1)}" y="${(cy + 1.1 * sy).toFixed(1)}" font-size="${fs}" text-anchor="${right ? 'start' : 'end'}" fill="${b.labelColor || '#8a8a8a'}" font-weight="600">${escSvg(p.name)}</text>`); }).join('');
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${f.svg}${dots}</svg>`;
}
// Scatter: the points of one or more series. x = the label as a number (else its place), y = the
// value; a series in b.series may bring its own x (s.x, as many as its values) or share the labels'.
// A point's d.name is its data label (else its value).
export function scatterSeries(b) {
  const data = b.data || [], px = l => { const v = parseFloat(String(l ?? '').replace(',', '.')); return isFinite(v) ? v : null; };
  const py = v => (v == null || v === '' || !isFinite(+v) ? null : +v), xs = data.map((d, i) => px(d.label) ?? i);
  const all = [{ name: b.seriesName || 'Serie 1', color: b.color || '#3f6497', pts: data.map((d, i) => ({ x: xs[i], y: py(d.value), name: d.name })) }]
    .concat((b.series || []).map((s, k) => ({ name: s.name || `Serie ${k + 2}`, color: s.color || SERIES_COLOURS[k % SERIES_COLOURS.length],
      pts: (Array.isArray(s.x) ? s.x.map((x, i) => px(x) ?? i) : xs).map((x, i) => ({ x, y: py((s.values || [])[i]), name: (s.names || [])[i] })) })));
  return all.map(s => ({ ...s, pts: s.pts.filter(p => p.y != null) }));
}
function scatterSVG(b) {
  const ser = scatterSeries(b), pts = ser.flatMap(s => s.pts), [, sy] = chartSqueeze(b);
  const f = xyFrame(b, pts.map(p => p.x), pts.map(p => p.y), ser.length > 1, 0.03);
  const dots = ser.map(s => s.pts.map(p => `<circle cx="${f.X(p.x).toFixed(1)}" cy="${f.Y(p.y).toFixed(1)}" r="1.6" fill="${s.color}"/>`
    + (b.dataLabels ? `<text x="${f.X(p.x).toFixed(1)}" y="${(f.Y(p.y) - 2.4 * sy).toFixed(1)}" font-size="3" text-anchor="middle" fill="${s.color}">${escSvg(p.name ?? fmtNum(p.y))}</text>` : '')).join('')).join('');
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${f.svg}${dots}${seriesLegend(ser)}</svg>`;
}
// The axes of a scatter or bubble chart: both with their scale (round numbers), the gridlines
// with b.grid, the titles (b.xTitle, b.yTitle) and the ends if given (b.xMin/xMax, b.yMin/yMax).
// Zero is kept in a range that starts near it, as Excel does; `pad`: room around the points.
function xyFrame(b, xs, ys, legend, pad = 0) {
  const ext = v => {
    let a = v.length ? Math.min(...v) : 0, z = v.length ? Math.max(...v) : 1;
    if (a > 0 && a <= z / 2) a = 0; if (z < 0 && z >= a / 2) z = 0;
    const r = (z - a) || Math.abs(z) || 1; return [a >= 0 ? Math.max(0, a - r * pad) : a - r * pad, z <= 0 ? Math.min(0, z + r * pad) : z + r * pad];
  };
  const sx = axisScale(...ext(xs), b.xMin, b.xMax), sY = axisScale(...ext(ys), b.yMin, b.yMax), [, sy] = chartSqueeze(b), fs = 3;
  const T = legend ? 9 : 4, B = 60 - fs * sy - 2.5 - (b.xTitle ? 4.5 : 0), R = 98;
  const L = Math.max(4, ...sY.ticks.map(v => textWidth(fmtNum(v), fs, b))) + 2 + (b.yTitle ? 4.5 : 0);
  const X = v => L + (v - sx.lo) / (sx.hi - sx.lo) * (R - L), Y = v => B - (v - sY.lo) / (sY.hi - sY.lo) * (B - T);
  const line = (x1, y1, x2, y2, o) => `<line x1="${+x1.toFixed(1)}" y1="${+y1.toFixed(1)}" x2="${+x2.toFixed(1)}" y2="${+y2.toFixed(1)}" stroke="#8a8a8a"${o ? ' stroke-opacity="0.3" stroke-width="0.3"' : ' stroke-width="0.4"'} vector-effect="non-scaling-stroke"/>`;
  // (The numbers under the x axis: every other one if they'd run into each other.)
  const xw = Math.max(...sx.ticks.map(v => textWidth(fmtNum(v), fs, b))), room = sx.ticks.length > 1 ? X(sx.ticks[1]) - X(sx.ticks[0]) : 100, every = Math.max(1, Math.ceil((xw + 1.5) / room));
  const svg = (b.grid ? sx.ticks.map(v => line(X(v), T, X(v), B, 1)).join('') + sY.ticks.map(v => line(L, Y(v), R, Y(v), 1)).join('') : '')
    + sY.ticks.map(v => `<text x="${(L - 1).toFixed(1)}" y="${(Y(v) + 1.1 * sy).toFixed(1)}" font-size="${fs}" text-anchor="end" fill="#8a8a8a">${escSvg(fmtNum(v))}</text>`).join('')
    + sx.ticks.map((v, i) => (i % every ? '' : `<text x="${X(v).toFixed(1)}" y="${(B + 1.5 + fs * sy).toFixed(1)}" font-size="${fs}" text-anchor="middle" fill="#8a8a8a">${escSvg(fmtNum(v))}</text>`)).join('')
    + line(L, B, R, B) + line(L, T - 2, L, B)
    + (b.xTitle ? `<text x="${((L + R) / 2).toFixed(1)}" y="59" font-size="3.6" text-anchor="middle" fill="#8a8a8a">${escSvg(b.xTitle)}</text>` : '')
    + (b.yTitle ? `<text x="2.6" y="${((T + B) / 2).toFixed(1)}" font-size="3.6" text-anchor="middle" fill="#8a8a8a" transform="rotate(-90 2.6 ${((T + B) / 2).toFixed(1)})">${escSvg(b.yTitle)}</text>` : '');
  return { X, Y, L, R, T, B, svg };
}
// Funnel: centred bars, as wide as their value, one under another (stages of a process).
function funnelSVG(b) {
  const data = b.data || [], n = data.length || 1, max = Math.max(1, ...data.map(d => +d.value || 0)), color = b.color || '#3f6497';
  const T = 2, H = 56 / n, bh = H * 0.8, num = v => fmtNum(v);
  const bars = data.map((d, i) => {
    const w = Math.max(1, (+d.value || 0) / max * 70), x = 50 - w / 2, y = T + i * H, op = (1 - i / (n + 1) * 0.55).toFixed(2);
    const own = /^#[0-9a-f]{3,8}$/i.test(d.color || '');         // (a step its own colour: solid; else the chart's, fading)
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" fill="${own ? d.color : color}" fill-opacity="${own ? 1 : op}"/>`
      + `<text x="${(x - 1.5).toFixed(1)}" y="${(y + bh / 2 + 1.2).toFixed(1)}" font-size="3.4" text-anchor="end" fill="#8a8a8a">${escSvg(d.label || '')}</text>`
      // (The value inside the bar if it fits, else just after it.)
      + (w > String(num(d.value || 0)).length * 2.4 + 2
        ? `<text x="50" y="${(y + bh / 2 + 1.2).toFixed(1)}" font-size="3.4" text-anchor="middle" fill="#fff" font-weight="600">${escSvg(num(d.value || 0))}</text>`
        : `<text x="${(x + w + 1.5).toFixed(1)}" y="${(y + bh / 2 + 1.2).toFixed(1)}" font-size="3.4" text-anchor="start" fill="#8a8a8a" font-weight="600">${escSvg(num(d.value || 0))}</text>`);
  }).join('');
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${bars}</svg>`;
}
function hbarSVG(b) {
  // The categories' room as wide as the longest name needs (up to 40 %, long ones then in two
  // lines) or b.labelWidth (in % of the width); gridlines with the scale under them (b.grid),
  // axis titles (b.xTitle under the bars, b.yTitle at the side) and the value axis' ends (b.yMin/b.yMax).
  const data = b.data || [], ser = chartSeries(b), n = data.length || 1, all = ser.flatMap(x => x.values), [, sy] = chartSqueeze(b);
  const sc = axisScale(Math.min(0, ...all), Math.max(0, ...all), b.yMin, b.yMax, !!b.grid), { lo, hi } = sc;
  const T = ser.length > 1 ? 8 : 3, B = 58 - (b.grid ? 3 * sy + 2 : 0) - (b.xTitle ? 4.5 : 0), gap = (B - T) / n, bh = gap * 0.62 / ser.length;
  const Lt = b.yTitle ? 5 : 0, fixed = +b.labelWidth > 0 ? Math.min(80, +b.labelWidth) : 0, room = (fixed || 40) - Lt - 2.5;
  const fs0 = Math.min(3.6, gap * 0.8 / sy), fit = fitLabels(data.map(d => d.label || ''), room, fs0, b);
  if (fit.lines.some(l => l.length > 1)) fit.fs = Math.min(fit.fs, gap * 0.95 / (2.2 * sy));
  const widest = Math.max(0, ...fit.lines.flat().map(l => textWidth(l, fit.fs, b)));
  const L = fixed || Lt + (widest ? widest + 2.5 : 1), lh = fit.fs * 1.1 * sy;
  const dlw = b.dataLabels ? Math.max(0, ...all.filter(v => v > 0).map(v => textWidth(fmtNum(v), 3, b))) : 0, R = 98 - (dlw ? dlw + 1 : 2);
  const X = v => L + (Math.min(hi, Math.max(lo, v)) - lo) / ((hi - lo) || 1) * (R - L), X0 = X(0);
  const bars = ser.map((x, k) => x.values.map((v, i) => {
    const y = T + gap * i + (gap - bh * ser.length) / 2 + k * bh, x0 = Math.min(X(v), X0), w = Math.abs(X(v) - X0), c = x.colors?.[i] || x.color;
    return `<rect x="${x0.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" fill="${c}"/>`
      + (b.dataLabels ? `<text x="${(X(v) + (v < 0 ? -1 : 1)).toFixed(1)}" y="${(y + bh / 2 + 1.1 * sy).toFixed(1)}" font-size="3" text-anchor="${v < 0 ? 'end' : 'start'}" fill="${c}">${escSvg(fmtNum(v))}</text>` : '');
  }).join('')).join('');
  const labels = data.map((d, i) => { const ls = fit.lines[i], y = T + gap * i + gap / 2 - (ls.length - 1) * lh / 2 + fit.fs * 0.36 * sy;
    return ls.map((l, k) => `<text x="${+(L - 1.5).toFixed(1)}" y="${(y + k * lh).toFixed(1)}" font-size="${+fit.fs.toFixed(2)}" text-anchor="end" fill="#8a8a8a">${escSvg(l)}</text>`).join(''); }).join('');
  const grid = b.grid ? sc.ticks.map(v => `<line x1="${X(v).toFixed(1)}" y1="${T}" x2="${X(v).toFixed(1)}" y2="${B.toFixed(1)}" stroke="#8a8a8a" stroke-opacity="0.3" stroke-width="0.3" vector-effect="non-scaling-stroke"/>`
    + `<text x="${X(v).toFixed(1)}" y="${(B + 1.5 + 3 * sy).toFixed(1)}" font-size="3" text-anchor="middle" fill="#8a8a8a">${escSvg(fmtNum(v))}</text>`).join('') : '';
  const titles = (b.xTitle ? `<text x="${((L + R) / 2).toFixed(1)}" y="59" font-size="3.6" text-anchor="middle" fill="#8a8a8a">${escSvg(b.xTitle)}</text>` : '')
    + (b.yTitle ? `<text x="2.6" y="${((T + B) / 2).toFixed(1)}" font-size="3.6" text-anchor="middle" fill="#8a8a8a" transform="rotate(-90 2.6 ${((T + B) / 2).toFixed(1)})">${escSvg(b.yTitle)}</text>` : '');
  const axis = `<line x1="${X0.toFixed(1)}" y1="${T}" x2="${X0.toFixed(1)}" y2="${B.toFixed(1)}" stroke="#8a8a8a" stroke-width="0.4" vector-effect="non-scaling-stroke"/>`;
  const legend = seriesLegend(ser);
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${grid}${bars}${axis}${labels}${titles}${legend}</svg>`;
}
// The series' key, top right: each name as wide as it is (long ones don't run into the next),
// smaller if they don't all fit.
function seriesLegend(ser) {
  if (ser.length < 2) return '';
  const wid = x => 4 + [...String(x.name)].length * 1.85 + 3, total = ser.reduce((a, x) => a + wid(x), 0), f = Math.min(1, 100 / total);
  let at = 100 - total * f;
  return ser.map(x => { const x0 = at; at += wid(x) * f;
    return `<rect x="${+x0.toFixed(1)}" y="0" width="${+(3 * f).toFixed(2)}" height="${+(3 * f).toFixed(2)}" fill="${x.color}"/><text x="${+(x0 + 4 * f).toFixed(1)}" y="${+(2.6 * f).toFixed(2)}" font-size="${+(3.4 * f).toFixed(2)}" fill="#8a8a8a">${escSvg(x.name)}</text>`; }).join('');
}
// Numbers as written in Spain (and by Excel in es-ES): a decimal comma, and the thousands with a
// point from 1.000 on (4.215; 12.500,5); at most `dec` decimals, no trailing zeros. (The same as
// Intl.NumberFormat('es', { useGrouping: 'always' }), written out so every browser agrees.)
export function fmtNum(v, dec = 2) {
  v = +v; if (!isFinite(v)) return '';
  let s = Math.abs(v).toFixed(dec); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  const [i, f] = s.split('.');
  return (v < 0 && /[1-9]/.test(s) ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : '');
}
// How a stretched chart's letters are squeezed back (see unstretchChart): [across, down].
function chartSqueeze(b) {
  const w = +(b && b.w), h = +(b && b.h); if (!(w > 0 && h > 0)) return [1, 1];
  const k = (h / 60) / (w / 100); return k < 1 ? [k, 1] : [1, 1 / k];
}
// About how wide a text is drawn, in the drawing's units (~0.55 em a character).
function textWidth(s, fs, b) { return [...String(s ?? '')].length * fs * 0.55 * chartSqueeze(b)[0]; }
// A label in two (or `n`) lines, split at the spaces that leave the longest line shortest.
function twoLines(s, n = 2) {
  const w = String(s ?? '').trim().split(/\s+/); if (w.length < 2 || n < 2) return [w.join(' ')];
  let best = [w.join(' ')];
  for (let k = 1; k < w.length; k++) {
    const rest = twoLines(w.slice(k).join(' '), n - 1), cand = [w.slice(0, k).join(' '), ...rest];
    if (Math.max(...cand.map(l => l.length)) < Math.max(...best.map(l => l.length))) best = cand;
  }
  return best;
}
// Labels that share one size: each in as few lines as it needs (one, or up to `most` if too long
// for its room); then the size that makes the widest fit (not below `min`: what still doesn't fit
// is cut with "…"), and at that size each label again in as few lines as it can.
function fitLabels(labels, room, fs, b, min = 2.2, most = 2) {
  const widest = ls => Math.max(0, ...ls.flat().map(l => textWidth(l, 1, b)));
  const fewest = at => labels.map(l => { let ls = [String(l ?? '')]; for (let n = 2; n <= most && widest([ls]) * at > room; n++) ls = twoLines(l, n); return ls; });
  const size = Math.max(min, Math.min(fs, room / (widest(fewest(fs)) || 1)));
  const cut = l => { if (textWidth(l, size, b) <= room) return l; const t = [...l]; while (t.length > 1 && textWidth(t.join('') + '…', size, b) > room) t.pop(); return t.join('').trimEnd() + '…'; };
  return { lines: fewest(size).map(ls => ls.map(cut)), fs: size };
}
// An axis' scale: its ends (lo, hi; or the ones given, if any) and round ticks between them;
// with `round` the ends not given are taken out to the next tick.
function axisScale(lo, hi, fixLo, fixHi, round = true) {
  const given = v => (v === '' || v == null || !isFinite(+v) ? null : +v);
  fixLo = given(fixLo); fixHi = given(fixHi);
  if (fixLo != null) lo = fixLo; if (fixHi != null) hi = fixHi;
  if (!(hi > lo)) { if (fixHi != null && fixLo == null) lo = hi - 1; else hi = lo + 1; }
  const step = niceStep((hi - lo) / 4);
  if (round) { if (fixLo == null) lo = Math.floor(lo / step + 1e-9) * step; if (fixHi == null) hi = Math.ceil(hi / step - 1e-9) * step; }
  const ticks = []; for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-6 && ticks.length < 50; k++) ticks.push(+(k * step).toFixed(10));
  return { lo, hi, step, ticks };
}
// A pie's or doughnut's slice colours: each its own (d.color), else the chart's colour and then the series'.
const PIE_COLOURS = ['#3f6497', '#c0392b', '#2b7a3b', '#d68910', '#7d3c98', '#16a085', '#c0392b'];
export function pieColours(b) { const cols = b.color ? [b.color, ...SERIES_COLOURS] : PIE_COLOURS; return (b.data || []).map((d, i) => d.color || cols[i % cols.length]); }
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
  // (In lines an empty value — null or '' — is a gap, not a zero: years still to come…)
  const val = (v, line) => (line && (v == null || v === '') ? null : +v || 0);
  // (Each bar of the first series its own colour if given — d.color, as the slices of a pie.)
  return [{ name: b.seriesName || 'Serie 1', color: b.color || '#3f6497', values: data.map(d => val(d.value, !bar)), type: bar ? 'bar' : 'line',
    colors: data.map(d => (/^#[0-9a-f]{3,8}$/i.test(d.color || '') ? d.color : null)) }]
    .concat((b.series || []).map((x, i) => ({
      name: x.name || `Serie ${i + 2}`, color: x.color || SERIES_COLOURS[i % SERIES_COLOURS.length],
      values: data.map((_, k) => val((x.values || [])[k], !(bar && !b.combo))), type: bar && !b.combo ? 'bar' : 'line',
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
Object.assign(ICONS, MORE_ICONS);                       // (and many more: render/icons.js)
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
  return `<svg viewBox="0 0 ${b.vw || b.w} ${b.vh || b.h}" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible;display:block">`
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
// Every shape fills its box, as in PowerPoint: an axis drawn with a small margin (up to 10 of 100) is stretched to the
// edges — a rectangle 1120 px wide used to show 22 px short on each side, and its handles stood off it. One with a
// shape of its own in the box (the minus sign, the parallelogram's height) keeps it.
const fills = pts => [0, 1].map(i => { const a = pts.map(p => p[i]), lo = Math.min(...a), hi = Math.max(...a);
  return lo <= 10 && hi >= 90 && (lo > 0 || hi < 100) ? v => (v - lo) * 100 / (hi - lo) : v => v; });
for (const [k, v] of Object.entries(SHAPE_POINTS)) {
  const pts = v.trim().split(/\s+/).map(p => p.split(',').map(Number)), [fx, fy] = fills(pts);
  SHAPE_POINTS[k] = pts.map(([x, y]) => `${+fx(x).toFixed(2)},${+fy(y).toFixed(2)}`).join(' ');
}
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
  if (shape === 'ellipse') return Array.from({ length: 72 }, (_, i) => { const a = i / 72 * 2 * Math.PI; return [50 + 50 * Math.cos(a), 50 + 50 * Math.sin(a)]; });
  if (shape === 'rounded') {
    const r = 12, pts = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    arc(100 - r, r, -Math.PI / 2); arc(100 - r, 100 - r, 0); arc(r, 100 - r, Math.PI / 2); arc(r, r, Math.PI);
    return pts;
  }
  if (['line', 'arrow', 'doublearrow', 'curve', 'custom'].includes(shape) || SHAPE_PATHS[shape]) return null;
  return [[0, 0], [100, 0], [100, 100], [0, 100]];
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
  if (b.shape === 'ellipse') return Array.from({ length: 28 }, (_, i) => [50 + 50 * Math.cos(i * Math.PI / 14), 50 + 50 * Math.sin(i * Math.PI / 14)]);
  if (['line', 'arrow', 'doublearrow', 'curve', 'custom'].includes(b.shape) || SHAPE_PATHS[b.shape]) return null;       // (curves: drawn as they are)
  return [[0, 0], [100, 0], [100, 100], [0, 100]];
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
      + `${d.defs}<rect x="0" y="0" width="${b.w}" height="${b.h}" rx="${r}" ry="${r}" ${paint}/></svg>`;
  }
  // Arrows at their real size: in the stretched 100×100 box the arrowhead stretched with it — a long arrow lost its
  // head, a short one showed a diamond (a PowerPoint diagram's connectors). The head: a triangle 3× the line's
  // width long, as PowerPoint's medium one.
  if ((b.shape === 'arrow' || b.shape === 'doublearrow') && b.w && b.h) {
    const w = b.w, h = b.h, m = h / 2, line = Math.max(1, sw), hl = Math.min(w / 2.5, Math.max(8, line * 3)), hw = Math.min(h / 2, Math.max(4, line * 1.5));
    const head = (x, dir) => `<polygon points="${x},${m} ${x - dir * hl},${m - hw} ${x - dir * hl},${m + hw}" fill="${stroke}" stroke="none"/>`;
    const two = b.shape === 'doublearrow', x1 = two ? hl * 0.9 : 0, x2 = w - hl * 0.9;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="100%" style="display:block;overflow:visible">`
      + `<line x1="${x1}" y1="${m}" x2="${x2}" y2="${m}" fill="none" stroke="${stroke}" stroke-width="${line}" vector-effect="non-scaling-stroke"${dashAttr(b.dash, line)}${pl}/>`
      + head(w, 1) + (two ? head(0, -1) : '') + `</svg>`;
  }
  let inner;
  if (SHAPE_POINTS[b.shape]) inner = `<polygon points="${SHAPE_POINTS[b.shape]}" ${paint}/>`;
  else if (isOpenShape(b.shape)) inner = `<path d="${SHAPE_PATHS[b.shape]}" stroke-linejoin="round" ${strokeOnly}/>`;
  else if (SHAPE_PATHS[b.shape]) inner = `<path d="${SHAPE_PATHS[b.shape]}" fill-rule="evenodd" ${paint}/>`
    + (SHAPE_SHADES[b.shape] || []).map(([dd, c, o]) => `<path d="${dd}" fill="${c}" fill-opacity="${o}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"/>`).join('');
  else switch (b.shape) {
    case 'ellipse':  inner = `<ellipse cx="50" cy="50" rx="50" ry="50" ${paint}/>`; break;
    case 'rounded':  inner = `<rect x="0" y="0" width="100" height="100" rx="12" ry="12" ${paint}/>`; break;
    case 'custom':   inner = `<path d="${b.path || ''}" fill-rule="evenodd" ${paint}/>`; break;   // merged shapes
    case 'line':     inner = `<line x1="3" y1="50" x2="97" y2="50" ${strokeOnly}/>`; break;
    case 'curve':    inner = `<path d="M3 82C28 -8 72 -8 97 82" ${strokeOnly}/>`; break;
    case 'doublearrow': inner = `<defs><marker id="ah-${b.id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto-start-reverse"><path d="M0,0 L5,2.5 L0,5 z" fill="${stroke}"/></marker></defs>`
      + `<line x1="12" y1="50" x2="88" y2="50" ${strokeOnly} marker-start="url(#ah-${b.id})" marker-end="url(#ah-${b.id})"/>`; break;
    case 'arrow':    inner = `<defs><marker id="ah-${b.id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" `
      + `orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="${stroke}"/></marker></defs>`
      + `<line x1="3" y1="50" x2="88" y2="50" ${strokeOnly} marker-end="url(#ah-${b.id})"/>`; break;
    default:         inner = `<rect x="0" y="0" width="100" height="100" ${paint}/>`;  // rectangle
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
// their nesting level from --l1…--l5 / --b1…--b5, and its colour from --c1…--c5
// when the style gives one (see master.levelVars).
export const levelCSS = (pre = '') => [1, 2, 3, 4, 5].map(n => {
  const lists = Array(n).fill(':is(ul,ol)').join(' ');
  return `${pre}.lv ${lists} li{font-size:var(--l${n});color:var(--c${n})}${pre}.lv ${Array(n).fill('ul').join(' ')} li{list-style-type:var(--b${n})}`;
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
  const st = shapeTextStyle(b), j = { top: 'start', middle: 'center', bottom: 'end' }[st.vAlign];
  return `<div class="rv-shape-text" style="position:absolute;inset:0;box-sizing:border-box;padding:${textPadding(st)};font-size:${st.fontSize}px;text-align:${st.textAlign};`
    + `${st.color ? `color:${st.color};` : ''}${st.fontFamily ? `font-family:${st.fontFamily};` : ''}${st.fontWeight ? `font-weight:${st.fontWeight};` : ''}${st.fontStyle ? `font-style:${st.fontStyle};` : ''}`
    + `${st.lineHeight ? `line-height:${st.lineHeight};` : ''}align-content:${j};overflow:hidden`
    + `${b.flipH || b.flipV ? `;transform:scale(${b.flipH ? -1 : 1},${b.flipV ? -1 : 1})` : ''}">${b.html}</div>`;   // (a flipped shape's words read as before)
}

// An attached file as an icon (Insert ▸ Object "as icon"): a page with its
// extension on a band of its colour (PDF red, Word blue, Excel green…), its
// name and size under it. The same in the editor, the thumbnails and the export.
const FILE_COLOURS = [[/^pdf$/, '#d93025'], [/^(docx?|odt|rtf|txt|md)$/, '#2b579a'], [/^(xlsx?|ods|csv)$/, '#217346'], [/^(pptx?|odp|key)$/, '#d24726'],
  [/^(zip|rar|7z|tar|gz)$/, '#6d6d6d'], [/^(png|jpe?g|gif|webp|svg)$/, '#8e44ad'], [/^(mp3|wav|ogg|m4a|mp4|webm|mov)$/, '#0f7b8a']];
export const fileExt = name => ((String(name || '').match(/\.([a-z0-9]{1,5})$/i) || [])[1] || '').toLowerCase();
export function fileIconHTML(b, sizeLabel = '') {
  const ext = fileExt(b.name), colour = (FILE_COLOURS.find(([re]) => re.test(ext)) || [])[1] || '#5f6b7a';
  const icon = `<svg viewBox="0 0 80 100" style="height:62%;max-width:90%;display:block;overflow:visible"><path d="M4 2H56L76 22V98H4Z" fill="#fff" stroke="#c4c9d0" stroke-width="2"/>`
    + `<path d="M56 2V22H76" fill="#eef0f3" stroke="#c4c9d0" stroke-width="2" stroke-linejoin="round"/>`
    + `<rect x="0" y="52" width="62" height="26" rx="3" fill="${colour}"/><text x="31" y="70.5" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif">${escSvg((ext || 'file').toUpperCase().slice(0, 4))}</text></svg>`;
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4%;font-family:system-ui,sans-serif;text-align:center;overflow:hidden">${icon}`
    + `<div style="font-size:15px;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word">${escSvg(b.name || '')}</div>`
    + (sizeLabel ? `<div style="font-size:12px;opacity:.65">${escSvg(sizeLabel)}</div>` : '') + `</div>`;
}

// The chart drawing code as a script, for charts that reload their data while presenting.
export function chartRuntimeJS() {
  const fns = [chartSVG, unstretchChart, drawChart, histogramBins, hbarSVG, waterfallSVG, funnelSVG, treemapSVG, squarify, bubblePoints, bubbleSVG, scatterSeries, scatterSVG, xyFrame, mapMatch, mapSVG, chartSeries, niceStep, seriesLegend,
    fmtNum, chartSqueeze, textWidth, twoLines, fitLabels, axisScale, pieColours];
  const arrows = { escSvg, escA, plain, isTotalLabel };
  return `var SERIES_COLOURS=${JSON.stringify(SERIES_COLOURS)},TREE_COLOURS=${JSON.stringify(TREE_COLOURS)},PIE_COLOURS=${JSON.stringify(PIE_COLOURS)},TOTAL_WORDS=${TOTAL_WORDS};\n`
    + Object.entries(arrows).map(([k, f]) => `var ${k}=${f};`).join('\n') + '\n' + fns.map(f => String(f)).join('\n');
}
