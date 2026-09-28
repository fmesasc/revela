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

const escSvg = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

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
export function tableRowsHTML(b, cellStyle = '') {
  const span = tableSpan(b);
  return b.rows.map((row, r) => `<tr>${row.map((cell, c) => {
    const s = span(r, c); if (!s) return '';
    const at = (s.cs > 1 ? ` colspan="${s.cs}"` : '') + (s.rs > 1 ? ` rowspan="${s.rs}"` : '');
    return `<td${at}${cellStyle ? ` style="${cellStyle}"` : ''}>${cell || ''}</td>`;
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
    + `<line ${p} stroke="${color}" stroke-width="3" ${arrow ? `marker-end="url(#cm-${b.id})"` : ''}/></svg>`;
}

// Chart as inline SVG (no library, self‑contained on export). Bar or pie.
export function chartSig(b) { return (b.chartType || 'bar') + '|' + (b.color || '') + '|' + JSON.stringify(b.data || []); }
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
    const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1), maxY = Math.max(...ys, 1);
    const X = x => 4 + (x - minX) / ((maxX - minX) || 1) * 92, Y = y => 54 - (y / maxY) * 50;
    const dots = xs.map((x, i) => `<circle cx="${X(x).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="1.6" fill="${color}"/>`).join('');
    return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">`
      + `<line x1="4" y1="54" x2="98" y2="54" stroke="#8a8a8a" stroke-width="0.4" vector-effect="non-scaling-stroke"/>`
      + `<line x1="4" y1="2" x2="4" y2="54" stroke="#8a8a8a" stroke-width="0.4" vector-effect="non-scaling-stroke"/>${dots}</svg>`;
  }
  if (b.chartType === 'line' || b.chartType === 'area') {
    const max = Math.max(1, ...data.map(d => +d.value || 0)); const n = data.length;
    const step = n > 1 ? 100 / (n - 1) : 100;
    const xy = i => [(i * step), 50 - (data[i].value / max) * 46];
    const pts = data.map((d, i) => xy(i).map(v => v.toFixed(1)).join(',')).join(' ');
    const area = b.chartType === 'area'
      ? `<polygon points="0,50 ${pts} ${((n - 1) * step).toFixed(1)},50" fill="${color}" opacity="0.25"/>` : '';
    const dots = data.map((d, i) => { const [x, y] = xy(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" fill="${color}"/>`; }).join('');
    const labels = data.map((d, i) => `<text x="${(i * step).toFixed(1)}" y="58" font-size="4" text-anchor="middle" fill="#8a8a8a">${escSvg(d.label || '')}</text>`).join('');
    return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${area}`
      + `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>${dots}${labels}</svg>`;
  }
  const max = Math.max(1, ...data.map(d => +d.value || 0)); const n = data.length || 1; const gap = 100 / n; const bw = gap * 0.6;
  const bars = data.map((d, i) => {
    const h = (d.value / max) * 46; const x = gap * i + (gap - bw) / 2; const y = 50 - h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}"/>`
      + `<text x="${(gap * i + gap / 2).toFixed(1)}" y="58" font-size="4" text-anchor="middle" fill="#8a8a8a">${escSvg(d.label || '')}</text>`;
  }).join('');
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">${bars}</svg>`;
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
export const iconSig = b => (b.icon || '') + '|' + (b.color || '');

// SVG for shape blocks, shared by the canvas, the thumbnails and the export.
// The viewBox is a fixed 100×100 stretched to the block (preserveAspectRatio
// none); a non‑scaling stroke keeps the outline an even width at any size.

export function shapeSig(b) {
  return `${b.shape}|${b.fill}|${b.stroke}|${b.strokeWidth}`;
}

export function shapeSVG(b) {
  const fill = b.fill || 'none';
  const stroke = b.stroke || '#1e2a3a';
  const sw = b.strokeWidth ?? 2;
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"`;
  const strokeOnly = `fill="none" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linecap="round"`;
  let inner;
  switch (b.shape) {
    case 'ellipse':  inner = `<ellipse cx="50" cy="50" rx="48" ry="48" ${paint}/>`; break;
    case 'triangle': inner = `<polygon points="50,3 97,97 3,97" ${paint}/>`; break;
    case 'rounded':  inner = `<rect x="2" y="2" width="96" height="96" rx="12" ry="12" ${paint}/>`; break;
    case 'diamond':  inner = `<polygon points="50,2 98,50 50,98 2,50" ${paint}/>`; break;
    case 'pentagon': inner = `<polygon points="50,3 98,39 79,96 21,96 2,39" ${paint}/>`; break;
    case 'star':     inner = `<polygon points="50,3 61,38 98,38 68,60 79,96 50,73 21,96 32,60 2,38 39,38" ${paint}/>`; break;
    case 'rightarrow': inner = `<polygon points="2,32 60,32 60,12 98,50 60,88 60,68 2,68" ${paint}/>`; break;
    case 'leftarrow': inner = `<polygon points="98,32 40,32 40,12 2,50 40,88 40,68 98,68" ${paint}/>`; break;
    case 'hexagon': inner = `<polygon points="25,4 75,4 98,50 75,96 25,96 2,50" ${paint}/>`; break;
    case 'parallelogram': inner = `<polygon points="22,14 98,14 78,86 2,86" ${paint}/>`; break;
    case 'trapezoid': inner = `<polygon points="22,16 78,16 98,84 2,84" ${paint}/>`; break;
    case 'chevron': inner = `<polygon points="2,14 68,14 98,50 68,86 2,86 32,50" ${paint}/>`; break;
    case 'plus': inner = `<polygon points="36,3 64,3 64,36 97,36 97,64 64,64 64,97 36,97 36,64 3,64 3,36 36,36" ${paint}/>`; break;
    case 'line':     inner = `<line x1="3" y1="50" x2="97" y2="50" ${strokeOnly}/>`; break;
    case 'arrow':    inner = `<defs><marker id="ah-${b.id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" `
      + `orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="${stroke}"/></marker></defs>`
      + `<line x1="3" y1="50" x2="88" y2="50" ${strokeOnly} marker-end="url(#ah-${b.id})"/>`; break;
    default:         inner = `<rect x="2" y="2" width="96" height="96" ${paint}/>`;  // rectangle
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" `
    + `style="display:block;overflow:visible">${inner}</svg>`;
}
