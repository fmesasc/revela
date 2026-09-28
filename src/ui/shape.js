// Image filter/opacity, shared by the canvas, thumbnails and export.
export function imgFilter(b) {
  const a = b.adj || {};
  return `brightness(${a.brightness ?? 100}%) contrast(${a.contrast ?? 100}%) saturate(${a.saturate ?? 100}%)`;
}
export function imgOpacity(b) { return (b.adj?.opacity ?? 100) / 100; }

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
