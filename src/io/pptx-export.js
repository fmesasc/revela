// Export the deck to a real PowerPoint (.pptx) using PptxGenJS (client‑side).
// The .pptx format is completely different from reveal.js, so this is a separate
// module that maps each block to a native PowerPoint object where possible:
// text, images, shapes, tables and charts. 3D models, video, web embeds, icons
// and equations can't be represented natively and are skipped.

import { state } from '../core/store.js';
import { alertDialog } from '../ui/dialog.js';
import { t } from '../i18n.js';
import { deckFg, deckBodyFont } from '../features/palettes.js';
import { chartSeries, iconSVG, inkSVG } from '../ui/shape.js';
import { blockImage } from './reveal.js';
import { masterBlocksFor, isEmptyPlaceholder } from '../features/master.js';

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

// HTML of a text box → PptxGenJS text runs: bold/italic/underline/strike,
// colour, size, font, super/subscript per run; paragraphs, bullets and
// numbering (nested levels) and alignment per paragraph.
const cssHex = c => { if (!c) return null; const h = hex(c); if (h) return h;
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); return m ? [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase() : null; };
export function htmlToRuns(html, base = {}) {
  const root = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html').body.firstChild;
  const runs = []; let para = { ...base }, pending = false;
  const endPara = () => { if (runs.length && !runs[runs.length - 1].options.breakLine) runs[runs.length - 1].options.breakLine = true; pending = false; };
  const walk = (n, st, list) => {
    if (n.nodeType === 3) {
      const text = n.data.replace(/\s+/g, ' '); if (!text.trim() && !pending) return;
      runs.push({ text, options: { ...para, ...st } }); pending = true; return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toLowerCase(), s = { ...st }, css = n.style || {};
    if (tag === 'b' || tag === 'strong' || +css.fontWeight >= 600 || css.fontWeight === 'bold') s.bold = true;
    if (tag === 'i' || tag === 'em' || css.fontStyle === 'italic') s.italic = true;
    if (tag === 'u') s.underline = { style: 'sng' };
    if (tag === 's' || tag === 'strike') s.strike = 'sngStrike';
    if (tag === 'sup') s.superscript = true; if (tag === 'sub') s.subscript = true;
    const col = cssHex(css.color || n.getAttribute('color')); if (col) s.color = col;
    if (css.fontSize && /px$/.test(css.fontSize)) s.fontSize = Math.round(parseFloat(css.fontSize) * 0.75);
    if (css.fontFamily) s.fontFace = css.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    if (tag === 'a' && n.getAttribute('href')) s.hyperlink = { url: n.getAttribute('href') };
    if (tag === 'br') { if (!pending) runs.push({ text: '', options: { ...para, ...s } }); endPara(); return; }
    if (tag === 'ul' || tag === 'ol') { for (const c of n.childNodes) walk(c, s, { type: tag, level: (list?.level ?? -1) + 1 }); return; }
    const block = ['div', 'p', 'li', 'h1', 'h2', 'h3'].includes(tag);
    if (block) {
      endPara(); const prev = para;
      para = { ...base, ...(tag === 'li' && list ? { bullet: list.type === 'ol' ? { type: 'number' } : true, indentLevel: list.level } : {}) };
      for (const c of n.childNodes) walk(c, s, list);
      endPara(); para = prev; return;
    }
    for (const c of n.childNodes) walk(c, s, list);
  };
  for (const c of root.childNodes) walk(c, {}, null);
  if (runs.length) delete runs[runs.length - 1].options.breakLine;
  return runs.length ? runs : [{ text: ' ', options: { ...base } }];
}

// SVG (icons, ink) → PNG data URL, since a PNG displays everywhere.
async function svgToPNG(svg, w, h) {
  const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg.includes('xmlns=') ? svg : svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))));
  const img = new Image(); img.src = src; await img.decode();
  const k = 2, c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

function addBlock(slide, b, pptx, raster = new Map(), blocksById = new Map()) {
  const pos = { x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h) };
  if (b.rotation) pos.rotate = b.rotation;
  try {
    if (b.type === 'text') {
      const fam = (b.fontFamily || deckBodyFont() || '').split(',')[0].replace(/['"]/g, '').trim();
      const base = { fontSize: Math.round((b.fontSize || 40) * 0.75), color: hex(deckFg()) || 'FFFFFF', align: b.textAlign || 'left',
        ...(fam && { fontFace: fam }), ...(b.fontWeight === '700' && { bold: true }), ...(b.fontStyle === 'italic' && { italic: true }),
        ...(b.lineHeight && { lineSpacingMultiple: +b.lineHeight }) };
      const opts = { ...pos, valign: { middle: 'middle', bottom: 'bottom' }[b.vAlign] || 'top', margin: 4,
        ...(hex(b.bg) && { fill: { color: hex(b.bg) } }), ...(hex(b.borderColor) && { line: { color: hex(b.borderColor), width: 1.5 } }),
        ...(b.radius && hex(b.bg) && { shape: pptx.ShapeType.roundRect, rectRadius: Math.min(0.5, b.radius / 100) }) };
      slide.addText(htmlToRuns(b.html, base), opts);
    } else if (b.type === 'code') {
      slide.addText(b.code || ' ', { ...pos, fontFace: 'Courier New', fontSize: Math.round((b.fontSize || 22) * 0.75), color: 'E6E6E6',
        fill: { color: '1E1E1E' }, valign: 'top', margin: 8 });
    } else if (b.type === 'connector') {
      const f = blocksById.get(b.from), to = blocksById.get(b.to); if (!f || !to) return;
      const x1 = f.x + f.w / 2, y1 = f.y + f.h / 2, x2 = to.x + to.w / 2, y2 = to.y + to.h / 2;
      slide.addShape(pptx.ShapeType.line, { x: IN(Math.min(x1, x2)), y: IN(Math.min(y1, y2)), w: IN(Math.max(1, Math.abs(x2 - x1))), h: IN(Math.max(1, Math.abs(y2 - y1))),
        flipH: x2 < x1, flipV: y2 < y1, line: { color: hex(b.color) || '8A8A8A', width: 1.5, ...(b.arrow !== false && { endArrowType: 'triangle' }) } });
    } else if (raster.has(b.id)) {                            // icons, ink, equations, polls…
      slide.addImage({ ...pos, data: raster.get(b.id), ...(b.alt && { altText: b.alt }) });
    } else if (b.type === 'video' && /^data:video\//.test(b.src || '')) {
      slide.addMedia({ ...pos, type: 'video', data: b.src.replace(/^data:/, '') });
    } else if (b.type === 'embed') {
      slide.addText([{ text: '🔗 ' + (b.alt || b.src), options: { hyperlink: { url: b.src } } }], { ...pos, fontSize: 18, color: hex(deckFg()) || 'FFFFFF', valign: 'middle', align: 'center' });
    } else if (b.type === 'image') {
      slide.addImage({ ...pos, data: b.src, ...(b.alt && !b.decorative && { altText: b.alt }), ...(b.flipH && { flipH: true }), ...(b.flipV && { flipV: true }) });
    } else if (b.type === 'shape') {
      if (b.shape === 'custom' && b.rings?.length) {
        // Merged shape → custom geometry (points in inches inside the box).
        const fill = b.fill && b.fill !== 'none' ? { color: hex(b.fill) || '3F6497' } : { type: 'none' };
        const points = b.rings.flatMap(r => r.map(([u, v], i) => ({ x: IN(u / 100 * b.w), y: IN(v / 100 * b.h), ...(i === 0 && { moveTo: true }) }))
          .concat({ close: true }));
        slide.addShape(pptx.ShapeType.custGeom, { ...pos, points, fill, line: { color: hex(b.stroke) || '1E2A3A', width: b.strokeWidth || 1 } });
      } else if (b.shape === 'line' || b.shape === 'arrow') {
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
        const m = ms.find(x => x.r === r && x.c === j), cell = { text: plain(c) }, o = {};
        if (m) Object.assign(o, m.cs > 1 && { colspan: m.cs }, m.rs > 1 && { rowspan: m.rs });
        // Table style: header row, banded rows, first column.
        const head = b.header && r === 0, data = b.header ? r - 1 : r;
        if (head) { o.bold = true; if (hex(b.headBg)) o.fill = { color: hex(b.headBg) }; if (hex(b.headFg)) o.color = hex(b.headFg); }
        else if (b.banded && data % 2 === 0) o.fill = { color: hex(b.band) || '7F7F7F', transparency: Math.round((1 - (b.bandAlpha ?? 0.18)) * 100) };
        if (b.firstCol && j === 0) o.bold = true;
        if (Object.keys(o).length) cell.options = o;
        return cell;
      }).filter(Boolean));
      slide.addTable(rows, { ...pos, border: { pt: 1, color: hex(b.stroke) || 'FFFFFF' }, color: hex(deckFg()) || 'FFFFFF', fontSize: 14, valign: 'top' });
    } else if (b.type === 'chart') {
      const type = { bar: 'bar', line: 'line', area: 'area', pie: 'pie', doughnut: 'doughnut', radar: 'radar', scatter: 'scatter' }[b.chartType || 'bar'] || 'bar';
      const rows = b.data || [];
      const data = type === 'scatter'
        ? [{ name: 'X', values: rows.map((d, i) => (isFinite(parseFloat(d.label)) ? parseFloat(d.label) : i)) },
           { name: 'Y', values: rows.map(d => +d.value || 0) }]
        : null;
      if (data) { slide.addChart(pptx.ChartType[type], data, { ...pos, showLegend: false }); return; }
      // Bar/line/area (and pie, radar) with every series; a combo chart becomes
      // PowerPoint's multi-type chart: bars + lines.
      const labels = rows.map(d => d.label);
      const ser = ['bar', 'line', 'area', 'radar'].includes(type) ? chartSeries(b) : chartSeries({ ...b, series: [] });
      const toData = list => list.map(x => ({ name: x.name, labels, values: x.values }));
      const colors = ser.map(x => hex(x.color) || '3F6497');
      if (type === 'bar' && b.combo && ser.length > 1) {
        slide.addChart([
          { type: pptx.ChartType.bar, data: toData(ser.filter(x => x.type === 'bar')), options: { chartColors: colors.slice(0, 1), barGrouping: 'clustered' } },
          { type: pptx.ChartType.line, data: toData(ser.filter(x => x.type !== 'bar')), options: { chartColors: colors.slice(1) } },
        ], { ...pos, showLegend: true, legendPos: 't' });
      } else {
        slide.addChart(pptx.ChartType[type], toData(ser), { ...pos, showLegend: ser.length > 1, legendPos: 't',
          ...(['pie', 'doughnut'].includes(type) ? {} : { chartColors: colors }) });
      }
    }
    // 3D models, audio: no equivalent (skipped).
  } catch {}
}

export async function buildPptx(deck = state.deck) {
  await loadScript(PPTX);
  const pptx = new window.PptxGenJS();
  const { w, h } = deck.size;
  pptx.defineLayout({ name: 'REVELA', width: IN(w), height: IN(h) });
  pptx.layout = 'REVELA';
  // Objects PowerPoint can't draw natively become pictures.
  const raster = new Map();
  for (const s of [deck.master || { blocks: [] }, ...deck.slides]) for (const b of s.blocks) {
    try {
      if (b.type === 'icon') raster.set(b.id, await svgToPNG(iconSVG(b), b.w, b.h));
      else if (b.type === 'ink') raster.set(b.id, await svgToPNG(inkSVG(b), b.w, b.h));
      else if (b.type === 'math' || b.type === 'poll' || b.type === 'figindex') { const img = await blockImage(b, s, deck); if (img) raster.set(b.id, img); }
    } catch {}
  }
  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    if (s.hidden) slide.hidden = true;                     // kept, hidden (like PowerPoint)
    const bg = hex(s.background);
    if (bg) slide.background = { color: bg };
    else if (/url\((data:[^)]+)\)/.test(s.background || '')) slide.background = { data: RegExp.$1 };
    if (s.notes) slide.addNotes(s.notes);
    const all = [...masterBlocksFor(s, deck), ...s.blocks], byId = new Map(all.map(b => [b.id, b]));
    for (const b of all) if (!isEmptyPlaceholder(b)) addBlock(slide, b, pptx, raster, byId);
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
