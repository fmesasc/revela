// Export the deck to a real PowerPoint (.pptx) using PptxGenJS (client‑side).
// The .pptx format is completely different from reveal.js, so this is a separate
// module that maps each block to a native PowerPoint object where possible:
// text, images, shapes, tables and charts. 3D models, video, web embeds, icons
// and equations can't be represented natively and are skipped.

import { state } from '../core/store.js';
import { alertDialog } from '../ui/dialog.js';
import { t } from '../i18n.js';
import { deckFg } from '../features/palettes.js';

const PPTX = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
const loadScript = src => new Promise((res, rej) => {
  if (window.PptxGenJS) return res();
  const s = document.createElement('script'); s.src = src; s.async = true;
  s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar PptxGenJS')); document.head.appendChild(s);
});

const IN = px => +(px / 96).toFixed(3);                 // 96 dpi → inches
const hex = c => (String(c || '').match(/^#?([0-9a-fA-F]{6})/) || [])[1] || null;
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent || ''; };
const slug = s => (String(s || '').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'presentacion');

const SHAPE_MAP = {
  rect: 'rect', rounded: 'roundRect', ellipse: 'ellipse', triangle: 'triangle', diamond: 'diamond',
  pentagon: 'pentagon', star: 'star5', rightarrow: 'rightArrow', leftarrow: 'leftArrow',
  hexagon: 'hexagon', parallelogram: 'parallelogram', trapezoid: 'trapezoid', chevron: 'chevron', plus: 'plus',
};

function addBlock(slide, b, pptx) {
  const pos = { x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h) };
  if (b.rotation) pos.rotate = b.rotation;
  try {
    if (b.type === 'text') {
      const txt = plain(b.html) || ' ';
      const opts = { ...pos, fontSize: Math.round((b.fontSize || 40) * 0.75), align: b.textAlign || 'left',
        valign: b.vAlign || 'top', color: hex(deckFg()) || 'FFFFFF' };
      const fam = (b.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
      if (fam) opts.fontFace = fam;
      slide.addText(txt, opts);
    } else if (b.type === 'image') {
      slide.addImage({ ...pos, data: b.src });
    } else if (b.type === 'shape') {
      if (b.shape === 'line' || b.shape === 'arrow') {
        slide.addShape(pptx.ShapeType.line, { ...pos, line: { color: hex(b.stroke) || '888888', width: b.strokeWidth || 2,
          endArrowType: b.shape === 'arrow' ? 'triangle' : 'none' } });
      } else {
        const st = pptx.ShapeType[SHAPE_MAP[b.shape] || 'rect'];
        const fill = b.fill && b.fill !== 'none' ? { color: hex(b.fill) || '3F6497' } : { type: 'none' };
        slide.addShape(st, { ...pos, fill, line: { color: hex(b.stroke) || '1E2A3A', width: b.strokeWidth || 1 } });
      }
    } else if (b.type === 'table') {
      // Merged cells: PptxGenJS wants the covered cells omitted and colspan/rowspan on the first.
      const ms = b.merges || [];
      const covered = (r, c) => ms.some(m => r >= m.r && r < m.r + m.rs && c >= m.c && c < m.c + m.cs && !(r === m.r && c === m.c));
      const rows = (b.rows || []).map((row, r) => row.map((c, j) => {
        if (covered(r, j)) return null;
        const m = ms.find(x => x.r === r && x.c === j), cell = { text: plain(c) };
        if (m) cell.options = { ...(m.cs > 1 && { colspan: m.cs }), ...(m.rs > 1 && { rowspan: m.rs }) };
        return cell;
      }).filter(Boolean));
      slide.addTable(rows, { ...pos, border: { pt: 1, color: hex(b.stroke) || 'FFFFFF' }, color: hex(deckFg()) || 'FFFFFF', fontSize: 14, valign: 'top' });
    } else if (b.type === 'chart') {
      const type = { bar: 'bar', line: 'line', area: 'area', pie: 'pie', doughnut: 'doughnut', radar: 'radar', scatter: 'scatter' }[b.chartType || 'bar'] || 'bar';
      const rows = b.data || [];
      const data = type === 'scatter'
        ? [{ name: 'X', values: rows.map((d, i) => (isFinite(parseFloat(d.label)) ? parseFloat(d.label) : i)) },
           { name: 'Y', values: rows.map(d => +d.value || 0) }]
        : [{ name: 'Serie 1', labels: rows.map(d => d.label), values: rows.map(d => +d.value || 0) }];
      slide.addChart(pptx.ChartType[type], data, { ...pos, showLegend: false });
    }
    // model / video / embed / icon / math / connector / audio: skipped.
  } catch {}
}

export async function buildPptx(deck = state.deck) {
  await loadScript(PPTX);
  const pptx = new window.PptxGenJS();
  const { w, h } = deck.size;
  pptx.defineLayout({ name: 'REVELA', width: IN(w), height: IN(h) });
  pptx.layout = 'REVELA';
  for (const s of deck.slides.filter(x => !x.hidden)) {
    const slide = pptx.addSlide();
    const bg = hex(s.background);
    if (bg) slide.background = { color: bg };
    else if (/url\((data:[^)]+)\)/.test(s.background || '')) slide.background = { data: RegExp.$1 };
    if (s.notes) slide.addNotes(s.notes);
    for (const b of s.blocks) addBlock(slide, b, pptx);
  }
  return pptx;
}

export async function buildPptxBlob(deck = state.deck) {
  const pptx = await buildPptx(deck);
  return pptx.write({ outputType: 'blob' });
}

export async function exportPPTX() {
  try {
    const pptx = await buildPptx();
    await pptx.writeFile({ fileName: slug(state.deck.name) + '.pptx' });
  } catch (e) { alertDialog(t('No se pudo exportar a PowerPoint: ') + (e.message || e)); }
}
