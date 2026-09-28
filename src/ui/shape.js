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
  if (b.chartType === 'pie') {
    const total = data.reduce((s, d) => s + (+d.value || 0), 0) || 1;
    let a0 = -Math.PI / 2; const arcs = data.map((d, i) => {
      const a1 = a0 + (d.value / total) * 2 * Math.PI;
      const x0 = 50 + 40 * Math.cos(a0), y0 = 50 + 40 * Math.sin(a0);
      const x1 = 50 + 40 * Math.cos(a1), y1 = 50 + 40 * Math.sin(a1);
      const large = a1 - a0 > Math.PI ? 1 : 0; a0 = a1;
      return `<path d="M50,50 L${x0.toFixed(1)},${y0.toFixed(1)} A40,40 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${palette[i % palette.length]}"/>`;
    }).join('');
    return `<svg viewBox="0 0 100 100" width="100%" height="100%">${arcs}</svg>`;
  }
  if (b.chartType === 'line') {
    const max = Math.max(1, ...data.map(d => +d.value || 0)); const n = data.length;
    const step = n > 1 ? 100 / (n - 1) : 100;
    const xy = i => [(i * step), 50 - (data[i].value / max) * 46];
    const pts = data.map((d, i) => xy(i).map(v => v.toFixed(1)).join(',')).join(' ');
    const dots = data.map((d, i) => { const [x, y] = xy(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" fill="${color}"/>`; }).join('');
    const labels = data.map((d, i) => `<text x="${(i * step).toFixed(1)}" y="58" font-size="4" text-anchor="middle" fill="#8a8a8a">${escSvg(d.label || '')}</text>`).join('');
    return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible">`
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
    case 'line':     inner = `<line x1="3" y1="50" x2="97" y2="50" ${strokeOnly}/>`; break;
    case 'arrow':    inner = `<defs><marker id="ah-${b.id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" `
      + `orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="${stroke}"/></marker></defs>`
      + `<line x1="3" y1="50" x2="88" y2="50" ${strokeOnly} marker-end="url(#ah-${b.id})"/>`; break;
    default:         inner = `<rect x="2" y="2" width="96" height="96" ${paint}/>`;  // rectangle
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" `
    + `style="display:block;overflow:visible">${inner}</svg>`;
}
