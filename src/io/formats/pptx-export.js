// Export the deck to a real PowerPoint (.pptx) using PptxGenJS (client‑side).
// The .pptx format is completely different from reveal.js, so this is a separate
// module that maps each block to a native PowerPoint object where possible:
// text, images, shapes, tables and charts. 3D models, video, web embeds, icons
// and equations can't be represented natively and are skipped.

import { diagramLayout } from '../../render/diagrams.js';
import { commentText } from '../../features/collab/comments.js';
import { state } from '../../core/store.js';
import { alertUser } from '../../core/notify.js';
import { t } from '../../i18n/index.js';
import { deckFg, deckBodyFont, currentPalette } from '../../features/design/palettes.js';
import { plainText } from '../../core/text.js';
import { opacityOf } from '../../core/model.js';
import { wordartSize } from '../../render/textfit.js';
import { shownRows } from '../../core/formulas.js';
import { lockSVG } from '../../render/svg.js';
import { chartSVG, chartSeries, histogramBins, bubblePoints, scatterSeries, pieColours, iconSVG, inkSVG, timerSVG, shapeTextStyle } from '../../render/svg.js';
import { blockImage, magnifyImage } from '../export/images.js';
import { magGeometry, viewOf, underArea, targetImage, imageCrop } from '../../features/document/magnify.js';
import { masterBlocksFor, isEmptyPlaceholder, styled, styleKind } from '../../features/document/master.js';
import { PPTXGEN, JSZIP, loadScript } from '../../core/vendor.js';
import { animTimeline, animEntries, isEntrance, motionPoints } from '../../features/animation/transitions.js';
import { download } from '../files.js';
import { writeTheme } from './ooxml-theme.js';



const IN = px => +(px / 96).toFixed(3);
// Revela's line styles → PowerPoint dash types.
const DASH = { dash: 'dash', dot: 'sysDot', dashDot: 'dashDot' };
const dashOf = d => (DASH[d] ? { dashType: DASH[d] } : {});                 // 96 dpi → inches
const hex = c => (String(c || '').match(/^#?([0-9a-fA-F]{6})/) || [])[1] || null;
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent || ''; };
const slug = s => (String(s || '').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'presentacion');

const SHAPE_MAP = {
  rect: 'rect', rounded: 'roundRect', ellipse: 'ellipse', triangle: 'triangle', diamond: 'diamond',
  pentagon: 'pentagon', star: 'star5', rightarrow: 'rightArrow', leftarrow: 'leftArrow',
  hexagon: 'hexagon', parallelogram: 'parallelogram', trapezoid: 'trapezoid', chevron: 'chevron', plus: 'plus',
  rtriangle: 'rtTriangle', snip: 'snip1Rect', heptagon: 'heptagon', octagon: 'octagon', decagon: 'decagon', frame: 'frame', donut: 'donut',
  heart: 'heart', cloud: 'cloud', moon: 'moon', lightning: 'lightningBolt', teardrop: 'teardrop', cylinder: 'can',
  uparrow: 'upArrow', downarrow: 'downArrow', leftrightarrow: 'leftRightArrow', updownarrow: 'upDownArrow', quadarrow: 'quadArrow',
  notchedarrow: 'notchedRightArrow', homeplate: 'homePlate', star4: 'star4', star6: 'star6', star8: 'star8', seal: 'star12', burst: 'irregularSeal1',
  speech: 'wedgeRectCallout', speechround: 'wedgeEllipseCallout', terminator: 'flowChartTerminator', document: 'flowChartDocument',
  manualinput: 'flowChartManualInput', offpage: 'flowChartOffpageConnector', merge: 'flowChartMerge', delay: 'flowChartDelay',
  minus: 'mathMinus', multiply: 'mathMultiply', divide: 'mathDivide', equal: 'mathEqual',
  pie: 'pie', chord: 'chord', blockarc: 'blockArc', cube: 'cube', foldedcorner: 'foldedCorner', smiley: 'smileyFace', sun: 'sun', nosymbol: 'noSmoking',
  ribbon: 'ribbon2', wave: 'wave', thought: 'cloudCallout', arc: 'arc', leftbracket: 'leftBracket', rightbracket: 'rightBracket', leftbrace: 'leftBrace', rightbrace: 'rightBrace',
  actnext: 'actionButtonForwardNext', actprev: 'actionButtonBackPrevious', actfirst: 'actionButtonBeginning', actlast: 'actionButtonEnd', acthome: 'actionButtonHome',
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
      const text = n.data.replace(/[^\S\t]+/g, ' '); if (!/\S|\t/.test(text) && !pending) return;   // (tabs kept: they go to the tab stops)
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
// A 3D model's picture (an address, a library thumbnail, WebP…) → a PNG of its box,
// the picture contained in it, since PowerPoint can't draw the model.
async function posterPNG(src, w, h) {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src; await img.decode();
  const k = 2, c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const s = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  c.getContext('2d').drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
  return c.toDataURL('image/png');
}

// A picture as it shows in Revela, as PowerPoint wants it: the part of the box
// the picture covers (contained: letterboxed; filled: all of it, with its
// focus; minus the edges trimmed) and which part of the image that is
// (fractions cut from each side: PowerPoint's srcRect). Flips mirror both.
export function pictureFrame(b, nw, nh) {
  const R = nw / nh, bw = b.w, bh = b.h, boxR = bw / bh, fx = (b.focusX ?? 50) / 100, fy = (b.focusY ?? 50) / 100;
  let D = { x: b.x, y: b.y, w: bw, h: bh }, S = { l: 0, t: 0, r: 0, b: 0 };
  if (b.fit === 'cover') {
    if (R > boxR) { const e = 1 - boxR / R; S.l = e * fx; S.r = e - S.l; } else { const e = 1 - R / boxR; S.t = e * fy; S.b = e - S.t; }
  } else if (b.fit !== 'fill') {
    if (R > boxR) { D.h = bw / R; D.y = b.y + (bh - D.h) / 2; } else { D.w = bh * R; D.x = b.x + (bw - D.w) / 2; }
  }
  const c = b.crop || {}, C = { x0: b.x + bw * (c.left || 0) / 100, x1: b.x + bw * (1 - (c.right || 0) / 100), y0: b.y + bh * (c.top || 0) / 100, y1: b.y + bh * (1 - (c.bottom || 0) / 100) };
  const x0 = Math.max(D.x, C.x0), x1 = Math.min(D.x + D.w, C.x1), y0 = Math.max(D.y, C.y0), y1 = Math.min(D.y + D.h, C.y1);
  if (x1 - x0 < 1 || y1 - y0 < 1) return null;
  const sx = px => S.l + (px - D.x) / D.w * (1 - S.l - S.r), sy = py => S.t + (py - D.y) / D.h * (1 - S.t - S.b);
  let src = { l: sx(x0), r: 1 - sx(x1), t: sy(y0), b: 1 - sy(y1) }, F = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  // Flipped in Revela around the box's centre: the frame and the cut are mirrored.
  if (b.flipH) { F.x = 2 * b.x + bw - F.x - F.w; src = { ...src, l: src.r, r: src.l }; }
  if (b.flipV) { F.y = 2 * b.y + bh - F.y - F.h; src = { ...src, t: src.b, b: src.t }; }
  // Turned around the box's centre: the frame's centre turns with it.
  if (b.rotation) {
    const a = b.rotation * Math.PI / 180, cx = b.x + bw / 2, cy = b.y + bh / 2, dx = F.x + F.w / 2 - cx, dy = F.y + F.h / 2 - cy;
    F.x = cx + dx * Math.cos(a) - dy * Math.sin(a) - F.w / 2; F.y = cy + dx * Math.sin(a) + dy * Math.cos(a) - F.h / 2;
  }
  return { frame: F, src };
}
// A magnifier whose area lies on one picture (nothing over it there): that
// picture, cropped by PowerPoint itself (srcRect), as its box.
const slideBlocks = (s, deck) => (s.id === 'master' ? s.blocks : [...masterBlocksFor(s, deck), ...s.blocks.map(b => styled(b, s, deck))]);
function magCrop(b, blocks) {
  const v = viewOf(b), img = targetImage(blocks, v), under = underArea(blocks, v, [b.id]);   // (another magnifier on the picture: a picture of both)
  if (!img || under.at(-1)?.id !== img.id) return null;
  const nat = picSizes.get(img.id), src = nat && imageCrop(img, v, nat[0], nat[1]);
  return src ? { img, src } : null;
}
// Its lines and the area's frame, the box (a cropped picture, or a picture of
// what is under the area) and its frame: native shapes, named after it.
function addMagnifier(slide, b, pptx, raster, blocks) {
  const { st, src, box, lines } = magGeometry(b), id = 'rv-' + b.id, none = { type: 'none' };
  const line = (c, w, dash) => ({ color: hex(c) || 'E53935', width: +(w * 0.75).toFixed(2), ...(dash === 'dashed' ? { dashType: 'dash' } : dash === 'dotted' ? { dashType: 'sysDot' } : {}) });
  const rect = (r, radius, name) => slide.addShape(radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, { x: IN(r.x), y: IN(r.y), w: IN(r.w), h: IN(r.h),
    ...(radius && { rectRadius: IN(radius) }), fill: none, line: line(st.color, st.width, st.style), objectName: name });
  lines.forEach(([x1, y1, x2, y2], i) => slide.addShape(pptx.ShapeType.line, { x: IN(Math.min(x1, x2)), y: IN(Math.min(y1, y2)), w: IN(Math.max(1, Math.abs(x2 - x1))), h: IN(Math.max(1, Math.abs(y2 - y1))),
    flipH: x2 < x1, flipV: y2 < y1, line: line(st.lineColor, st.lineWidth, st.lineDash), objectName: `${id}-line${i + 1}` }));
  if (st.sourceFrame && st.width) rect(src, st.radius / Math.max(1, viewOf(b).k), `${id}-area`);
  const crop = magCrop(b, blocks), pos = { x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h) };
  if (crop) { slide.addImage({ ...pos, data: crop.img.src, objectName: id, ...(crop.img.flipH && { flipH: true }), ...(crop.img.flipV && { flipV: true }) }); picCrops.set(b.id, crop.src); }
  else if (raster.has(b.id)) slide.addImage({ ...pos, data: raster.get(b.id), objectName: id });
  if (st.width) rect(box, Math.max(0, st.radius - st.width / 2), `${id}-frame`);
}
const picSizes = new Map(), picCrops = new Map();       // (for the export under way: images' natural sizes, and their srcRect)
async function naturalSizes(deck) {
  picSizes.clear(); picCrops.clear();
  const imgs = [deck.master, ...(deck.layouts || []), ...deck.slides].flatMap(s => s?.blocks || []).filter(b => b.type === 'image' && b.src);
  await Promise.all(imgs.map(b => new Promise(res => {
    const i = new Image(); i.onload = () => { if (i.naturalWidth) picSizes.set(b.id, [i.naturalWidth, i.naturalHeight]); res(); }; i.onerror = res; i.src = b.src;
  })));
}

function addBlock(slide, b, pptx, raster = new Map(), blocksById = new Map(), link = null) {
  const pos = { x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h) }, hl = link ? { hyperlink: link } : {};   // (an object that is a link)
  if (b.rotation) pos.rotate = b.rotation;
  // (Its opacity, as PowerPoint's transparency of the fill and the line, 0–100.)
  const see = opacityOf(b) < 1 ? { transparency: Math.round((1 - opacityOf(b)) * 100) } : {};
  try {
    if (b.type === 'text') {
      const fam = (b.fontFamily || deckBodyFont() || '').split(',')[0].replace(/['"]/g, '').trim();
      const base = { fontSize: Math.round(wordartSize(b) * 0.75), color: hex(b.color || deckFg()) || 'FFFFFF', align: b.textAlign || 'left',
        ...(fam && { fontFace: fam }), ...(b.fontWeight === '700' && { bold: true }), ...(b.fontStyle === 'italic' && { italic: true }),
        ...(b.lineHeight && { lineSpacingMultiple: +b.lineHeight }) };
      const opts = { ...pos, valign: { middle: 'middle', bottom: 'bottom' }[b.vAlign] || 'top', margin: 4,
        ...(hex(b.bg) && { fill: { color: hex(b.bg) } }), ...(hex(b.borderColor) && { line: { color: hex(b.borderColor), width: 1.5, ...dashOf(b.borderDash) } }),
        ...(b.radius && hex(b.bg) && { shape: pptx.ShapeType.roundRect, rectRadius: Math.min(0.5, b.radius / 100) }) };
      slide.addText(htmlToRuns(b.html, base), opts);
    } else if (b.type === 'code') {
      slide.addText(b.code || ' ', { ...pos, fontFace: 'Courier New', fontSize: Math.round((b.fontSize || 22) * 0.75), color: 'E6E6E6',
        fill: { color: '1E1E1E' }, valign: 'top', margin: 8 });
    } else if (b.type === 'connector') {
      const f = blocksById.get(b.from), to = blocksById.get(b.to); if (!f || !to) return;
      const x1 = f.x + f.w / 2, y1 = f.y + f.h / 2, x2 = to.x + to.w / 2, y2 = to.y + to.h / 2;
      slide.addShape(pptx.ShapeType.line, { x: IN(Math.min(x1, x2)), y: IN(Math.min(y1, y2)), w: IN(Math.max(1, Math.abs(x2 - x1))), h: IN(Math.max(1, Math.abs(y2 - y1))),
        flipH: x2 < x1, flipV: y2 < y1, line: { color: hex(b.color) || '8A8A8A', width: 1.5, ...dashOf(b.dash), ...(b.arrow !== false && { endArrowType: 'triangle' }) } });
    } else if (b.type === 'magnify') {
      addMagnifier(slide, b, pptx, raster, [...blocksById.values()]);
    } else if (raster.has(b.id)) {                            // icons, ink, equations, polls…
      slide.addImage({ ...pos, ...hl, ...see, data: raster.get(b.id), ...((b.alt || (b.type === 'lock' && b.hint)) && { altText: b.alt || b.hint }) });
    } else if (b.type === 'video' && /^data:video\//.test(b.src || '')) {
      slide.addMedia({ ...pos, type: 'video', data: b.src.replace(/^data:/, '') });
    } else if (b.type === 'embed' && b.srcdoc != null) {           // (an HTML object of the developer mode: its name; PowerPoint can't run it)
      slide.addText(b.alt || 'HTML', { ...pos, fontSize: 18, color: hex(deckFg()) || 'FFFFFF', valign: 'middle', align: 'center' });
    } else if (b.type === 'embed') {
      slide.addText([{ text: '🔗 ' + (b.alt || b.src), options: { hyperlink: { url: b.src } } }], { ...pos, fontSize: 18, color: hex(deckFg()) || 'FFFFFF', valign: 'middle', align: 'center' });
    } else if (b.type === 'diagram') {
      // A diagram: its own shapes and text boxes, native and editable in PowerPoint.
      const col = c => (c && c !== 'none' ? { color: hex(c) || '3F6497' } : { type: 'none' });
      for (const p of diagramLayout(b, { accents: currentPalette(exportDeck).accents, fg: deckFg(exportDeck), back: exportBack || currentPalette(exportDeck).bg })) {
        const fill = p.fill && p.fill !== 'none' ? { color: hex(p.fill) || '3F6497', ...(p.opacity != null && p.opacity < 1 && { transparency: Math.round((1 - p.opacity) * 100) }) } : { type: 'none' };
        const line = p.stroke && p.stroke !== 'none' ? { color: hex(p.stroke) || '888888', width: +(((p.sw || 2) * 0.75).toFixed(2)) } : { type: 'none' };
        if (p.type === 'text') {
          const runs = [{ text: p.text, options: { bold: p.bold, fontSize: Math.round(p.fs * 0.75), breakLine: !!p.sub } }]
            .concat(p.sub ? p.sub.split('\n').map((l, k, all) => ({ text: l, options: { fontSize: Math.max(8, Math.round(p.fs * 0.72 * 0.75)), breakLine: k < all.length - 1 } })) : []);
          slide.addText(runs, { x: IN(b.x + p.x), y: IN(b.y + p.y), w: IN(p.w), h: IN(p.h), color: col(p.color).color || 'FFFFFF', align: p.align, valign: p.valign, margin: 0, fontFace: undefined });
        } else if (p.type === 'rect') {
          slide.addShape(p.r > 1 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, { x: IN(b.x + p.x), y: IN(b.y + p.y), w: IN(p.w), h: IN(p.h), fill, line, ...(p.r > 1 && { rectRadius: IN(p.r) }) });
        } else if (p.type === 'ellipse') {
          slide.addShape(pptx.ShapeType.ellipse, { x: IN(b.x + p.x), y: IN(b.y + p.y), w: IN(p.w), h: IN(p.h), fill, line });
        } else {
          const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
          const points = p.pts.map(([x, y], k) => ({ x: IN(x - x0), y: IN(y - y0), ...(k === 0 && { moveTo: true }) })).concat(p.closed ? [{ close: true }] : []);
          slide.addShape(pptx.ShapeType.custGeom, { x: IN(b.x + x0), y: IN(b.y + y0), w: IN(Math.max(1, Math.max(...xs) - x0)), h: IN(Math.max(1, Math.max(...ys) - y0)), points, fill: p.closed ? fill : { type: 'none' }, line });
        }
      }
    } else if (b.type === 'image') {
      const nat = picSizes.get(b.id), pf = nat && pictureFrame(b, nat[0], nat[1]);
      if (pf) {
        Object.assign(pos, { x: IN(pf.frame.x), y: IN(pf.frame.y), w: IN(pf.frame.w), h: IN(pf.frame.h) });
        if (Object.values(pf.src).some(v => v > 0.0005)) picCrops.set(b.id, pf.src);
      }
      slide.addImage({ ...pos, ...hl, ...see, data: b.src, ...(b.alt && !b.decorative && { altText: b.alt }), ...(b.flipH && { flipH: true }), ...(b.flipV && { flipV: true }) });
    } else if (b.type === 'shape') {
      if (b.shape === 'custom' && b.rings?.length) {
        // Merged shape → custom geometry (points in inches inside the box).
        const fill = b.fill && b.fill !== 'none' ? { color: hex(b.fill) || '3F6497', ...see } : { type: 'none' };
        const points = b.rings.flatMap(r => r.map(([u, v], i) => ({ x: IN(u / 100 * b.w), y: IN(v / 100 * b.h), ...(i === 0 && { moveTo: true }) }))
          .concat({ close: true }));
        slide.addShape(pptx.ShapeType.custGeom, { ...pos, ...hl, points, fill, line: { color: hex(b.stroke) || '1E2A3A', width: b.strokeWidth || 1, ...dashOf(b.dash), ...see } });
      } else if (b.shape === 'line' || b.shape === 'arrow' || b.shape === 'doublearrow') {
        slide.addShape(pptx.ShapeType.line, { ...pos, line: { color: hex(b.stroke) || '888888', width: b.strokeWidth || 2, ...dashOf(b.dash), ...see,
          endArrowType: b.shape === 'line' ? 'none' : 'triangle', ...(b.shape === 'doublearrow' && { beginArrowType: 'triangle' }) } });
      } else if (b.shape === 'curve') {                    // the same curve, as a PowerPoint freeform (no fill)
        const P = (u, v) => ({ x: IN(u / 100 * b.w), y: IN(v / 100 * b.h) });
        slide.addShape(pptx.ShapeType.custGeom, { ...pos, fill: { type: 'none' }, line: { color: hex(b.stroke) || '888888', width: b.strokeWidth || 2, ...dashOf(b.dash), ...see },
          points: [{ ...P(3, 82), moveTo: true }, { ...P(97, 82), curve: { type: 'cubic', x1: P(28, -8).x, y1: P(28, -8).y, x2: P(72, -8).x, y2: P(72, -8).y } }] });
      } else {
        // (PptxGenJS knows the folded corner only misspelt, «folderCorner»: given by its real name, it writes it as it is.)
        const st = pptx.ShapeType[SHAPE_MAP[b.shape]] || (SHAPE_MAP[b.shape] === 'foldedCorner' ? 'foldedCorner' : pptx.ShapeType.rect);
        const fill = b.fill && b.fill !== 'none' ? { color: hex(b.fill) || '3F6497', ...see } : { type: 'none' };
        const line = { color: hex(b.stroke) || '1E2A3A', width: b.strokeWidth || 1, ...dashOf(b.dash), ...see };
        if (b.html && plainText(b.html).trim()) {          // text inside: one PowerPoint shape with its text
          const s2 = shapeTextStyle(b), fam = (s2.fontFamily || deckBodyFont() || '').split(',')[0].replace(/['"]/g, '').trim();
          const base = { fontSize: Math.round(s2.fontSize * 0.75), color: hex(s2.color) || hex(deckFg()) || 'FFFFFF', align: s2.textAlign,
            ...(fam && { fontFace: fam }), ...(s2.fontWeight === '700' && { bold: true }), ...(s2.fontStyle === 'italic' && { italic: true }) };
          slide.addText(htmlToRuns(b.html, base), { ...pos, ...hl, shape: st, fill, line, valign: { top: 'top', bottom: 'bottom' }[s2.vAlign] || 'middle', margin: 4 });
        } else slide.addShape(st, { ...pos, ...hl, fill, line });
      }
    } else if (b.type === 'table') {
      // Merged cells: PptxGenJS wants the covered cells omitted and colspan/rowspan on the first.
      const ms = b.merges || [];
      const covered = (r, c) => ms.some(m => r >= m.r && r < m.r + m.rs && c >= m.c && c < m.c + m.cs && !(r === m.r && c === m.c));
      const rows = shownRows(b).map((row, r) => row.map((c, j) => {                 // (formulas: their result)
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
      // Stacked (and 100 %) and horizontal bars are PowerPoint bar charts with their grouping and
      // direction; a histogram, bars of its ranges already counted.
      const kind = b.chartType || 'bar', barish = ['stacked', 'stacked100', 'hbar', 'histogram'].includes(kind);
      const type = barish ? 'bar' : { bar: 'bar', line: 'line', area: 'area', stackedArea: 'area', pie: 'pie', doughnut: 'doughnut', radar: 'radar', scatter: 'scatter' }[kind] || 'bar';
      const barOpts = { ...(kind === 'stacked' && { barGrouping: 'stacked' }), ...(kind === 'stacked100' && { barGrouping: 'percentStacked' }),
        ...(kind === 'hbar' && { barDir: 'bar' }), ...(kind === 'histogram' && { barGapWidthPct: 5 }), ...(kind === 'stackedArea' && { barGrouping: 'stacked' }) };
      const rows = kind === 'histogram' ? histogramBins((b.data || []).map(d => +d.value), Math.round(+b.bins) || 0) : b.data || [];
      // The numbers with thousands separators and the decimals they need (shown as 4.215 or 12,5 in Spanish).
      const given = v => (v === '' || v == null || !isFinite(+v) ? null : +v);
      const fmtCode = vals => { const d = Math.min(2, Math.max(0, ...vals.filter(v => v != null && isFinite(v)).map(v => (String(+(+v).toFixed(2)).split('.')[1] || '').length)));
        return '#,##0' + (d ? '.' + '0'.repeat(d) : ''); };
      // The axes of a scatter or bubble chart: titles, gridlines, ends.
      const xyAxes = (xs, ys) => ({ valGridLine: { style: b.grid ? 'solid' : 'none', color: 'BFBFBF' }, catGridLine: { style: b.grid ? 'solid' : 'none', color: 'BFBFBF' },
        ...(b.xTitle && { showCatAxisTitle: true, catAxisTitle: b.xTitle }), ...(b.yTitle && { showValAxisTitle: true, valAxisTitle: b.yTitle }),
        ...(given(b.xMin) != null && { catAxisMinVal: given(b.xMin) }), ...(given(b.xMax) != null && { catAxisMaxVal: given(b.xMax) }),
        ...(given(b.yMin) != null && { valAxisMinVal: given(b.yMin) }), ...(given(b.yMax) != null && { valAxisMaxVal: given(b.yMax) }),
        valAxisLabelFormatCode: fmtCode([...xs, ...ys]) });   // (PowerPoint uses it for both axes here)
      if (kind === 'scatter') {                               // (every series' points, without lines; each series its own x)
        const S = scatterSeries(b), X = S.flatMap(s => s.pts.map(p => p.x));
        let at = 0; const Ys = S.map(s => { const v = X.map(() => null); s.pts.forEach((p, i) => { v[at + i] = p.y; }); at += s.pts.length; return { s, v }; });
        at = 0; const labs = S.map(s => { const l = X.map(() => ''); s.pts.forEach((p, i) => { l[at + i] = p.name ?? String(+p.y.toFixed(2)).replace('.', ','); }); at += s.pts.length; return l; });
        slide.addChart(pptx.ChartType.scatter, [{ name: 'X', values: X }, ...Ys.map(({ s, v }, k) => ({ name: s.name, values: v, ...(b.dataLabels && { labels: [labs[k]] }) }))],
          { ...pos, showLegend: S.length > 1, legendPos: 't', lineSize: 0, lineDataSymbol: 'circle', lineDataSymbolSize: 7, chartColors: S.map(s => hex(s.color) || '3F6497'),
            ...(b.dataLabels && { showLabel: true, dataLabelFormatScatter: 'custom' }), ...xyAxes(X, S.flatMap(s => s.pts.map(p => p.y))) });
        return;
      }
      if (kind === 'bubble') {                                // (PowerPoint's: x, then y with the sizes)
        const p = bubblePoints(b);
        slide.addChart(pptx.ChartType.bubble, [{ name: 'X', values: p.map(q => q.x) }, { name: b.seriesName || 'Y', values: p.map(q => q.y), sizes: p.map(q => q.s) }],
          { ...pos, showLegend: false, chartColors: [hex(b.color) || '3F6497'], ...xyAxes(p.map(q => q.x), p.map(q => q.y)) });
        return;
      }
      // Bar/line/area (and pie, radar) with every series; a combo chart becomes
      // PowerPoint's multi-type chart: bars + lines.
      const labels = rows.map(d => d.label);
      const ser = kind === 'histogram' ? chartSeries({ ...b, data: rows, series: [] }) : ['bar', 'line', 'area', 'radar'].includes(type) ? chartSeries(b) : chartSeries({ ...b, series: [] });
      const toData = list => list.map(x => ({ name: x.name, labels, values: x.values }));
      const colors = ser.map(x => hex(x.color) || '3F6497');
      // Gridlines, data labels and axis titles, as PowerPoint's own chart options.
      // (In horizontal bars the categories' axis is the vertical one: its title is b.yTitle. The
      // value axis' ends, b.yMin/b.yMax, if given.)
      const catT = kind === 'hbar' ? b.yTitle : b.xTitle, valT = kind === 'hbar' ? b.xTitle : b.yTitle, nums = ser.flatMap(x => x.values);
      const extra = { ...(b.dataLabels && { showValue: true }), valGridLine: { style: b.grid ? 'solid' : 'none', color: 'BFBFBF' },
        ...(catT && { showCatAxisTitle: true, catAxisTitle: catT }), ...(valT && { showValAxisTitle: true, valAxisTitle: valT }),
        ...(kind !== 'stacked100' && given(b.yMin) != null && { valAxisMinVal: given(b.yMin) }), ...(kind !== 'stacked100' && given(b.yMax) != null && { valAxisMaxVal: given(b.yMax) }),
        ...(kind !== 'stacked100' && { dataLabelFormatCode: fmtCode(nums), valAxisLabelFormatCode: fmtCode(nums) }) };
      // A second axis (b.y2): the combo's lines — or a line or area chart's series after the first — as PowerPoint's
      // secondary axis, at the right with its own title and ends, the categories' copy hidden.
      const two2 = b.y2 && ser.length > 1 && !['stacked', 'stacked100', 'stackedArea'].includes(kind) && (b.combo ? type === 'bar' : ['line', 'area'].includes(type));
      if (two2) {
        const prim = ser.filter((x, k) => (b.combo ? x.type === 'bar' : k === 0)), sec = ser.filter(x => !prim.includes(x)), nums2 = sec.flatMap(x => x.values);
        const colorsOf = list => list.map(x => colors[ser.indexOf(x)]);
        const t1 = b.combo ? pptx.ChartType.bar : pptx.ChartType[type], t2 = b.combo ? pptx.ChartType.line : pptx.ChartType[type];
        slide.addChart([
          { type: t1, data: toData(prim), options: { chartColors: colorsOf(prim), ...(b.combo && { barGrouping: 'clustered' }) } },
          { type: t2, data: toData(sec), options: { chartColors: colorsOf(sec), secondaryValAxis: true, secondaryCatAxis: true } },
        ], { ...pos, showLegend: true, legendPos: 't', ...extra,
          valAxes: [{}, { showValAxisTitle: !!b.y2Title, valAxisTitle: b.y2Title || '', valGridLine: { style: 'none' }, valAxisLabelFormatCode: fmtCode(nums2),
            valAxisMinVal: given(b.y2Min) ?? undefined, valAxisMaxVal: given(b.y2Max) ?? undefined }],
          catAxes: [{}, { catAxisHidden: true }] });
      } else if (type === 'bar' && b.combo && ser.length > 1) {
        slide.addChart([
          { type: pptx.ChartType.bar, data: toData(ser.filter(x => x.type === 'bar')), options: { chartColors: colors.slice(0, 1), barGrouping: 'clustered' } },
          { type: pptx.ChartType.line, data: toData(ser.filter(x => x.type !== 'bar')), options: { chartColors: colors.slice(1) } },
        ], { ...pos, showLegend: true, legendPos: 't', ...extra });
      } else {
        // (A pie or doughnut: each slice its colour, and the legend at the side as in the editor.)
        const pie = ['pie', 'doughnut'].includes(type), legend = b.legend !== false && rows.some(d => d.label);
        slide.addChart(pptx.ChartType[type], toData(ser), { ...pos, ...barOpts, showLegend: pie ? legend : ser.length > 1, legendPos: pie ? 'r' : 't',
          ...(pie ? { ...(b.dataLabels && { showValue: true }), chartColors: pieColours({ ...b, data: rows }).map(c => hex(c) || '3F6497') } : { ...extra, chartColors: colors }) });
      }
    }
    // 3D models: their picture, made into a PNG above (PowerPoint's own 3D can't be written here); audio: skipped.
  } catch {}
}

// ---- Master and layouts ------------------------------------------------------------
// Each Revela layout becomes a PowerPoint layout (PptxGenJS "slide master"):
// the master's and layout's own objects that a PowerPoint layout can hold
// (rectangles, pictures, lines, plain text) and its placeholders with the
// inherited formatting. Slides use it, and their titles and text go into the
// placeholders, so editing the master in PowerPoint changes them too. Objects
// a layout can't hold are still drawn on each slide.
const phName = p => 'rv-ph-' + p.id;
function masterObject(b) {
  const pos = { x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h) };
  if (b.rotation || b.flipH || b.flipV) return null;
  if (b.type === 'shape' && b.shape === 'rect') return { rect: { ...pos, fill: { color: hex(b.fill) || 'FFFFFF', ...(opacityOf(b) < 1 && { transparency: Math.round((1 - opacityOf(b)) * 100) }), ...(b.fill === 'none' && { transparency: 100 }) },
    ...(b.strokeWidth && hex(b.stroke) && { line: { color: hex(b.stroke), width: b.strokeWidth * 0.75, ...dashOf(b.dash) } }) } };
  if (b.type === 'shape' && b.shape === 'line') return { line: { ...pos, line: { color: hex(b.stroke) || '888888', width: (b.strokeWidth || 2) * 0.75, ...dashOf(b.dash) } } };
  // Any other shape of PowerPoint's (an ellipse, a rounded rectangle, a triangle…): a layout holds it as an empty
  // text with that shape. (Not merged shapes, curves or arrows: those are drawn on each slide.)
  if (b.type === 'shape' && SHAPE_MAP[b.shape] && !['custom', 'curve', 'arrow', 'doublearrow'].includes(b.shape) && !(b.html && plainText(b.html).trim())) {
    const see = opacityOf(b) < 1 ? { transparency: Math.round((1 - opacityOf(b)) * 100) } : {};
    return { text: { text: '', options: { ...pos, shape: SHAPE_MAP[b.shape], fill: b.fill && b.fill !== 'none' ? { color: hex(b.fill) || '3F6497', ...see } : { type: 'none' },
      ...(b.strokeWidth ? { line: { color: hex(b.stroke) || '1E2A3A', width: b.strokeWidth * 0.75, ...dashOf(b.dash), ...see } } : {}) } } };
  }
  if (b.type === 'image' && /^data:image\/(png|jpe?g|gif)/.test(b.src || '') && !b.crop && !b.adj) return { image: { ...pos, data: b.src } };
  return null;
}
// Every layout, used or not (a template brings them all to PowerPoint); and, for the slides without one, «Revela»: the
// master's objects alone, so they are in the master there too, not copied onto each slide.
const NO_LAYOUT = '(none)';
function defineMasters(pptx, deck) {
  const out = new Map(), names = new Set();
  const bare = deck.slides.some(s => !s.layoutId || !deck.layouts?.some(l => l.id === s.layoutId)) && (deck.master?.blocks || []).some(b => !b.ph)
    ? [{ id: NO_LAYOUT, name: 'Revela', blocks: [], background: null }] : [];
  for (const lay of [...(deck.layouts || []), ...bare]) {
    let name = lay.name || 'Diseño'; while (names.has(name)) name += ' ·'; names.add(name);
    const inMaster = new Set(), objects = [];
    for (const b of (lay.id === NO_LAYOUT ? (deck.master?.blocks || []).filter(x => !x.ph) : masterBlocksFor(lay, deck)).concat(lay.blocks.filter(x => !x.ph))) {
      const o = masterObject(b); if (o) { objects.push(o); inMaster.add(b.id); }
    }
    for (const p of lay.blocks.filter(b => b.type === 'placeholder')) {
      objects.push({ placeholder: { options: { name: phName(p), type: { picture: 'pic', table: 'tbl', chart: 'chart' }[p.ph] || 'pic',
        x: IN(p.x), y: IN(p.y), w: IN(p.w), h: IN(p.h) }, text: '' } });
    }
    const phs = lay.blocks.filter(b => b.ph && styleKind(b));
    for (const p0 of phs) {
      const p = styled(p0, lay, deck);
      const fam = (p.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
      objects.push({ placeholder: { options: { name: phName(p0), type: styleKind(p0) === 'title' ? 'title' : 'body',
        x: IN(p.x), y: IN(p.y), w: IN(p.w), h: IN(p.h), fontSize: Math.round((p.fontSize || 40) * 0.75),
        color: hex(p.color || deckFg(deck)) || 'FFFFFF', ...(fam && { fontFace: fam }), ...(p.fontWeight === '700' && { bold: true }),
        ...(p.fontStyle === 'italic' && { italic: true }), align: p.textAlign || 'left', valign: { middle: 'middle', bottom: 'bottom' }[p.vAlign] || 'top' }, text: '' } });
    }
    const bg = hex(lay.background || deck.slides.find(s => (lay.id === NO_LAYOUT ? !s.layoutId : s.layoutId === lay.id))?.background || (lay.id === NO_LAYOUT ? deck.master?.background : ''));
    pptx.defineSlideMaster({ title: name, ...(bg && { background: { color: bg } }), objects });
    out.set(lay.id, { name, inMaster, phs });
  }
  return out;
}
// A slide placeholder that still sits where its layout's is goes into it.
function placeholderOf(s, b, m) {
  if (!styleKind(b)) return null;
  const p = m.phs.find(x => x.id === b.lp) || m.phs.find(x => styleKind(x) === styleKind(b));
  return p && p.x === b.x && p.y === b.y && p.w === b.w && p.h === b.h ? p : null;
}
// Text into a layout placeholder: only what the slide set itself (the rest
// comes from the layout, as in PowerPoint).
function addPlaceholderText(slide, s, b, p) {
  const raw = s.blocks.find(x => x.id === b.id) || {};
  const fam = (raw.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
  const own = { ...(raw.fontSize && { fontSize: Math.round(raw.fontSize * 0.75) }), ...(raw.fit && !raw.fontSize && { fontSize: Math.round(b.fontSize * 0.75) }),
    ...(raw.color && { color: hex(raw.color) }), ...(fam && { fontFace: fam }), ...(raw.textAlign && { align: raw.textAlign }),
    ...(raw.fontWeight === '700' && { bold: true }), ...(raw.fontStyle === 'italic' && { italic: true }) };
  slide.addText(htmlToRuns(b.html, own), { placeholder: phName(p) });
}

let exportDeck = null;                                  // (the deck being exported: its theme colours)
let exportBack = '';                                    // (and the slide's background, for the words of a diagram)
export async function buildPptx(deck = state.deck) {
  exportDeck = deck;
  await Promise.all([loadScript(PPTXGEN, 'PptxGenJS'), naturalSizes(deck)]);
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
      else if (b.type === 'timer') raster.set(b.id, await svgToPNG(timerSVG(b), b.w, b.h));
      else if (b.type === 'lock') raster.set(b.id, await svgToPNG(lockSVG(b), b.w, b.h));      // (a picture: PowerPoint has no locks; its hint, the alt text)
      else if (b.type === 'chart' && ['map', 'waterfall', 'funnel', 'treemap'].includes(b.chartType)) raster.set(b.id, await svgToPNG(chartSVG(b), b.w, b.h));      // (PowerPoint's own maps can't be written here)
      else if (b.type === 'file' && b.poster) raster.set(b.id, b.poster);          // (a PDF's page; the file itself stays in Revela)
      else if (b.type === 'model' && b.poster) raster.set(b.id, await posterPNG(b.poster, b.w, b.h));
      else if (b.type === 'math' || b.type === 'poll' || b.type === 'figindex' || b.type === 'file') { const img = await blockImage(b, s, deck); if (img) raster.set(b.id, img); }
      else if (b.type === 'magnify' && !magCrop(b, slideBlocks(s, deck))) { const img = await magnifyImage(b, s, deck); if (img) raster.set(b.id, img); }
    } catch {}
  }
  const masters = defineMasters(pptx, deck);
  for (const s of deck.slides) {
    // (A slide that hides the master's objects: on its own, or PowerPoint's layout would show them.)
    const m = s.hideMaster ? null : masters.get(s.layoutId) || masters.get(NO_LAYOUT);
    const slide = m ? pptx.addSlide({ masterName: m.name }) : pptx.addSlide();
    exportBack = s.background || '';
    if (s.hidden) slide.hidden = true;                     // kept, hidden (like PowerPoint)
    const bg = hex(s.background);
    if (bg) slide.background = { color: bg };
    else if (/url\((data:[^)]+)\)/.test(s.background || '')) slide.background = { data: RegExp.$1 };
    if (s.notes) slide.addNotes(s.notes);
    const all = [...masterBlocksFor(s, deck), ...s.blocks.map(b => styled(b, s, deck))], byId = new Map(all.map(b => [b.id, b]));
    for (const b of all) {
      if (isEmptyPlaceholder(b) || m?.inMaster.has(b.id)) continue;          // drawn by its PowerPoint layout
      const ph = m && placeholderOf(s, b, m);
      if (ph) { addPlaceholderText(named(slide, 'rv-' + b.id), s, b, ph); continue; }
      addBlock(named(slide, 'rv-' + b.id, b), b, pptx, raster, byId, linkFor(b, deck.slides.indexOf(s), deck));
    }
  }
  return pptx;
}

// An object's link, as PowerPoint takes it: a web address, or a slide number (1…).
function linkFor(b, i, deck) {
  if (b.href && /^(https?|mailto):/i.test(b.href)) return { url: b.href };
  const n = deck.slides.length, to = { next: i + 2, prev: i, first: 1, last: n }[b.goto] ?? (b.goto ? deck.slides.findIndex(s => s.id === b.goto) + 1 : 0);
  return to >= 1 && to <= n ? { slide: to } : null;
}
// Every object gets the name rv-<block id> (PowerPoint's selection pane shows
// it), so transitions and animations can point at it afterwards.
const named = (slide, name, b = null) => new Proxy(slide, {
  get(t, k) {
    const f = t[k];
    if (typeof f !== 'function') return f;
    if (!/^add(Text|Shape|Image|Media|Table|Chart)$/.test(k)) return f.bind(t);
    return (...args) => {
      const i = args.length - 1;
      if (args[i] && typeof args[i] === 'object' && !Array.isArray(args[i])) args[i] = { ...args[i], objectName: args[i].objectName || name, ...(b?.shadow && k !== 'addTable' && k !== 'addChart' && { shadow: pptShadow(b.shadow) }) };
      return f.apply(t, args);
    };
  },
});

// A Revela shadow as PptxGenJS's (points, degrees, 0-1 opacity).
function pptShadow(s) {
  const x = s.x ?? 4, y = s.y ?? 6, c = String(s.color || '#00000066');
  return { type: 'outer', blur: Math.round((s.blur ?? 10) * 0.75), offset: Math.round(Math.hypot(x, y) * 0.75), angle: Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360),
    color: c.slice(1, 7), opacity: c.length === 9 ? +(parseInt(c.slice(7), 16) / 255).toFixed(2) : 0.4 };
}

// ---- Transitions and animations -------------------------------------------------
// PptxGenJS writes neither, so they are added to each slide's XML afterwards.
const TRANS = { fade: '<p:fade/>', slide: '<p:push dir="l"/>', push: '<p:push dir="l"/>', convex: '<p:cover dir="l"/>', concave: '<p:pull dir="l"/>',
  zoom: '<p:zoom/>', wipe: '<p:wipe dir="l"/>', rise: '<p:push dir="u"/>', flip: '<p:split orient="vert" dir="out"/>',
  cube: '<p:cover dir="l"/>', cover: '<p:cover dir="l"/>', page: '<p:pull dir="r"/>', gallery: '<p:push dir="l"/>', fall: '<p:pull dir="d"/>', drop: '<p:cover dir="d"/>',
  swirl: '<p:newsflash/>', shrink: '<p:zoom dir="out"/>', blur: '<p:dissolve/>', flash: '<p:fade thruBlk="1"/>' };
const SPEED = { fast: 'fast', slow: 'slow', default: 'med' };
// Effect options: PowerPoint's dir is where the slide moves to.
const PPT_DIR = { right: 'l', left: 'r', bottom: 'u', top: 'd' };
function transKindXML(kind, dir) {
  if (kind === 'wipe') return `<p:wipe dir="${PPT_DIR[dir || 'right']}"/>`;
  if (kind === 'push') return `<p:push dir="${PPT_DIR[dir || 'bottom']}"/>`;
  if (kind === 'split') return `<p:split orient="${dir === 'horizontal' ? 'horz' : 'vert'}" dir="out"/>`;
  if (kind === 'circle') return '<p:circle/>';
  if (kind === 'diamond') return '<p:diamond/>';
  return TRANS[kind] || TRANS.fade;
}
function transitionXML(s, deck) {
  const kind = s.transition || deck.defaultTransition || 'slide';
  const spd = SPEED[s.transitionSpeed || deck.transitionSpeed] || 'med';
  const adv = s.autoSlide ? ` advTm="${Math.round(s.autoSlide)}"` : '';
  const plain = (inner) => `<p:transition spd="${spd}"${adv}>${inner}</p:transition>`;
  if (s.autoAnimate) {                                    // PowerPoint's Morph, with a fade for older versions
    const option = { words: 'byWord', chars: 'byChar' }[s.morphBy] || 'byObject';
    return `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">`
      + `<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">`
      + `${plain(`<p159:morph option="${option}"/>`)}</mc:Choice><mc:Fallback>${plain('<p:fade/>')}</mc:Fallback></mc:AlternateContent>`;
  }
  if (kind === 'none') return adv ? plain('') : '';
  return plain(transKindXML(kind, s.transition ? s.transitionDir : null));
}
// Revela effects → PowerPoint presets: entrances and exits fade, emphasis grows
// or shrinks, motion paths move by the same offset.
function effectXML(a, spid, ids, deck, delay, first) {
  const dur = a.duration ?? 500, id = () => ids.n++;
  const tgt = `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`;
  const node = first ? 'clickEffect' : a.start === 'afterPrev' ? 'afterEffect' : 'withEffect';
  let cls, preset, body;
  if (a.effect === 'path') {
    // The whole shape (curves and drawn paths as lines through their points), relative to the slide size.
    const { w, h } = deck.size, pts = motionPoints(a).slice(1).map(([x, y]) => `${+(x / w).toFixed(4)} ${+(y / h).toFixed(4)}`);
    cls = 'path'; preset = 0;
    body = `<p:animMotion origin="layout" path="M 0 0 L ${pts.join(' L ')} E" pathEditMode="relative"><p:cBhvr><p:cTn id="${id()}" dur="${dur}" fill="hold"/>${tgt}<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>`;
  } else if (a.effect === 'spin360') {                   // PowerPoint's "Spin" emphasis: one full turn
    cls = 'emph'; preset = 8;
    body = `<p:animRot by="21600000"><p:cBhvr><p:cTn id="${id()}" dur="${dur}" fill="hold"/>${tgt}<p:attrNameLst><p:attrName>r</p:attrName></p:attrNameLst></p:cBhvr></p:animRot>`;
  } else if (a.effect === 'grow' || a.effect === 'shrink') {
    const k = a.effect === 'grow' ? 125000 : 80000;
    cls = 'emph'; preset = 6;
    body = `<p:animScale><p:cBhvr><p:cTn id="${id()}" dur="${dur}" fill="hold"/>${tgt}</p:cBhvr><p:by x="${k}" y="${k}"/></p:animScale>`;
  } else if (a.effect === 'pulse' || a.effect === 'color-pulse') {
    // PowerPoint's "Pulse": a little bigger and back (a colour pulse, the same: PowerPoint can't brighten any object).
    const k = a.effect === 'pulse' ? 115000 : 108000;
    cls = 'emph'; preset = 26;
    body = `<p:animScale><p:cBhvr><p:cTn id="${id()}" dur="${Math.max(1, Math.round(dur / 2))}" autoRev="1" fill="hold"/>${tgt}</p:cBhvr><p:by x="${k}" y="${k}"/></p:animScale>`;
  } else if (a.effect === 'teeter') {
    // PowerPoint's "Teeter": turns a little one way and the other, and back.
    cls = 'emph'; preset = 32;
    const turns = [7, -13, 10, -6, 2], q = Math.max(1, Math.round(dur / turns.length));
    body = turns.map((deg, k) => `<p:animRot by="${deg * 60000}"><p:cBhvr><p:cTn id="${id()}" dur="${q}" fill="hold"><p:stCondLst><p:cond delay="${k * q}"/></p:stCondLst></p:cTn>${tgt}`
      + `<p:attrNameLst><p:attrName>r</p:attrName></p:attrNameLst></p:cBhvr></p:animRot>`).join('');
  } else if (a.effect === 'jump') {
    // A jump on the spot: up and down again, as a motion path that ends where it began.
    const up = +(40 / deck.size.h).toFixed(4), up2 = +(12 / deck.size.h).toFixed(4);
    cls = 'path'; preset = 0;
    body = `<p:animMotion origin="layout" path="M 0 0 L 0 -${up} L 0 0 L 0 -${up2} L 0 0 E" pathEditMode="relative"><p:cBhvr><p:cTn id="${id()}" dur="${dur}" fill="hold"/>${tgt}<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>`;
  } else if (!isEntrance(a.effect)) {
    cls = 'exit'; preset = 10;
    body = `<p:animEffect transition="out" filter="fade"><p:cBhvr><p:cTn id="${id()}" dur="${dur}"/>${tgt}</p:cBhvr></p:animEffect>`
      + `<p:set><p:cBhvr><p:cTn id="${id()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="${dur - 1}"/></p:stCondLst></p:cTn>${tgt}`
      + `<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="hidden"/></p:to></p:set>`;
  } else {
    cls = 'entr'; preset = 10;
    // Fade while moving (reveal's fade-up/down/left/right) → PowerPoint's "Float in".
    const MOVE = { 'fade-up': ['ppt_y', '+0.1'], 'fade-down': ['ppt_y', '-0.1'], 'fade-left': ['ppt_x', '+0.1'], 'fade-right': ['ppt_x', '-0.1'] }[a.effect];
    if (MOVE) preset = 42;
    const move = MOVE ? `<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="${id()}" dur="${dur}" fill="hold"/>${tgt}`
      + `<p:attrNameLst><p:attrName>${MOVE[0]}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="#${MOVE[0]}${MOVE[1]}"/></p:val></p:tav>`
      + `<p:tav tm="100000"><p:val><p:strVal val="#${MOVE[0]}"/></p:val></p:tav></p:tavLst></p:anim>` : '';
    body = move + `<p:set><p:cBhvr><p:cTn id="${id()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>${tgt}`
      + `<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`
      + `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${id()}" dur="${dur}"/>${tgt}</p:cBhvr></p:animEffect>`;
  }
  return `<p:par><p:cTn id="${id()}" presetID="${preset}" presetClass="${cls}" presetSubtype="0" fill="hold" nodeType="${node}">`
    + `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${body}</p:childTnLst></p:cTn></p:par>`;
}
function timingXML(s, spids, deck) {
  // Every animation of every object, in order (an object's next ones too; a 3D
  // model's own clips have no PowerPoint equivalent and are left out).
  const tl = animTimeline(s);
  const list = animEntries(s).filter(e => tl.has(e.key) && spids.has(e.b.id) && !['clip3d', 'pdfview'].includes(e.a.effect))
    .sort((x, y) => tl.get(x.key).step - tl.get(y.key).step || tl.get(x.key).delay - tl.get(y.key).delay);
  if (!list.length) return '';
  const ids = { n: 3 }, steps = [...new Set(list.map(e => tl.get(e.key).step))];
  const clicks = steps.map(st => {
    const group = list.filter(e => tl.get(e.key).step === st);
    const outer = ids.n++, inner = ids.n++;
    const effects = group.map((e, i) => effectXML(e.a, spids.get(e.b.id), ids, deck, tl.get(e.key).delay, i === 0)).join('');
    return `<p:par><p:cTn id="${outer}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>`
      + `<p:par><p:cTn id="${inner}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${effects}</p:childTnLst></p:cTn></p:par>`
      + `</p:childTnLst></p:cTn></p:par>`;
  }).join('');
  return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>`
    + `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${clicks}</p:childTnLst></p:cTn>`
    + `<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>`
    + `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>`
    + `</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
}
async function addMotion(blob, deck) {
  const JSZip = await loadScript(JSZIP, 'JSZip');
  const zip = await JSZip.loadAsync(blob);
  await writeTheme(zip, deck);                            // (the deck's theme instead of PptxGenJS's Office one)
  for (let i = 0; i < deck.slides.length; i++) {
    const f = zip.file(`ppt/slides/slide${i + 1}.xml`); if (!f) continue;
    let xml = await f.async('string');
    const spids = new Map([...xml.matchAll(/<p:cNvPr id="(\d+)" name="rv-([^"]+)"/g)].map(m => [m[2], m[1]]));
    const extra = transitionXML(deck.slides[i], deck) + timingXML(deck.slides[i], spids, deck);
    // Pictures cropped (filled, or with their edges trimmed): PowerPoint's srcRect.
    for (const [id, c] of picCrops) {
      const at = xml.indexOf(`name="rv-${id}"`); if (at < 0) continue;
      const st = xml.indexOf('<a:stretch>', at); if (st < 0) continue;
      const k = v => Math.round(Math.max(0, v) * 100000);
      xml = xml.slice(0, st) + `<a:srcRect l="${k(c.l)}" t="${k(c.t)}" r="${k(c.r)}" b="${k(c.b)}"/>` + xml.slice(st);
    }
    // Tab stops of text boxes: each paragraph's a:tabLst (in its pPr, before its defRPr).
    for (const b of deck.slides[i].blocks.filter(x => x.type === 'text' && x.tabs?.length)) {
      const at = xml.indexOf(`name="rv-${b.id}"`); if (at < 0) continue;
      const s0 = xml.indexOf('<p:txBody>', at), s1 = xml.indexOf('</p:txBody>', s0); if (s0 < 0 || s1 < 0) continue;
      const lst = `<a:tabLst>${b.tabs.map(s => `<a:tab pos="${Math.round(s.pos * 9525)}" algn="${{ center: 'ctr', right: 'r', decimal: 'dec' }[s.align] || 'l'}"/>`).join('')}</a:tabLst>`;
      const seg = xml.slice(s0, s1).replace(/<a:p>(?:(<a:pPr\b[^>]*?)(\/>|>([\s\S]*?)<\/a:pPr>))?/g, (m, open, close, inner) => {
        if (!open) return `<a:p><a:pPr>${lst}</a:pPr>`;
        if (close === '/>') return `<a:p>${open}>${lst}</a:pPr>`;
        const k = inner.search(/<a:(defRPr|extLst)\b/);
        return `<a:p>${open}>${k < 0 ? inner + lst : inner.slice(0, k) + lst + inner.slice(k)}</a:pPr>`;
      });
      xml = xml.slice(0, s0) + seg + xml.slice(s1);
    }
    // Objects hidden in the selection pane: hidden in PowerPoint's too.
    const hidden = deck.slides[i].blocks.filter(b => b.hidden && spids.has(b.id));
    for (const b of hidden) xml = xml.replace(`<p:cNvPr id="${spids.get(b.id)}" name="rv-${b.id}"`, m => m + ' hidden="1"');
    if (!extra) { if (hidden.length || xml.includes('<a:srcRect') || xml.includes('<a:tabLst>')) zip.file(`ppt/slides/slide${i + 1}.xml`, xml); continue; }
    // Schema order: cSld, clrMapOvr, transition, timing, extLst.
    xml = xml.includes('</p:clrMapOvr>') ? xml.replace('</p:clrMapOvr>', '</p:clrMapOvr>' + extra)
      : xml.replace(/(<p:extLst>[\s\S]*<\/p:extLst>)?\s*<\/p:sld>\s*$/, m => extra + m);
    zip.file(`ppt/slides/slide${i + 1}.xml`, xml);
  }
  await addComments(zip, deck);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

// Comments, in PowerPoint's classic comment format (PowerPoint and LibreOffice
// read it): one per comment, at its object's place. That format has no threads,
// tasks or "resolved": they are written as text (commentText, in comments.js)
// and pptx-import.js reads them back as they were.
const XE = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function addComments(zip, deck) {
  if (!deck.slides.some(s => s.comments?.length)) return;
  const P = 'http://schemas.openxmlformats.org/presentationml/2006/main', REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const authors = new Map(), who = n => { const k = n || 'Revela'; if (!authors.has(k)) authors.set(k, { id: authors.size, n: 0 }); return authors.get(k); };
  const dt = ms => new Date(ms || Date.now()).toISOString().replace('Z', '');
  let types = await zip.file('[Content_Types].xml').async('string'), n = 0;
  for (let i = 0; i < deck.slides.length; i++) {
    const s = deck.slides[i]; if (!s.comments?.length) continue;
    const cms = [];
    for (const c of s.comments) {
      const b = c.blockId && s.blocks.find(x => x.id === c.blockId);
      const pos = `<p:pos x="${Math.round(((b ? b.x + b.w : 20)) * 6)}" y="${Math.round((b ? b.y : 20) * 6)}"/>`;   // (576 units per inch: 6 per px)
      for (const [text, a, time] of [[commentText(c), c.author, c.time], ...(c.replies || []).map(r => ['↪ ' + r.text, r.author, r.time])]) {
        const au = who(a); au.n++;
        cms.push(`<p:cm authorId="${au.id}" dt="${dt(time)}" idx="${au.n}">${pos}<p:text>${XE(text)}</p:text></p:cm>`);
      }
    }
    n++;
    zip.file(`ppt/comments/comment${n}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:cmLst xmlns:p="${P}">${cms.join('')}</p:cmLst>`);
    const rp = `ppt/slides/_rels/slide${i + 1}.xml.rels`, rx = await zip.file(rp)?.async('string');
    if (rx) zip.file(rp, rx.replace('</Relationships>', `<Relationship Id="rIdRvCm" Type="${REL}/comments" Target="../comments/comment${n}.xml"/></Relationships>`));
    types = types.replace('</Types>', `<Override PartName="/ppt/comments/comment${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.comments+xml"/></Types>`);
  }
  zip.file('ppt/commentAuthors.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:cmAuthorLst xmlns:p="${P}">`
    + [...authors].map(([name, a]) => `<p:cmAuthor id="${a.id}" name="${XE(name)}" initials="${XE(name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 3).toUpperCase())}" lastIdx="${a.n}" clrIdx="${a.id % 8}"/>`).join('') + `</p:cmAuthorLst>`);
  types = types.replace('</Types>', `<Override PartName="/ppt/commentAuthors.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml"/></Types>`);
  zip.file('[Content_Types].xml', types);
  const pr = 'ppt/_rels/presentation.xml.rels', px = await zip.file(pr).async('string');
  zip.file(pr, px.replace('</Relationships>', `<Relationship Id="rIdRvCmA" Type="${REL}/commentAuthors" Target="commentAuthors.xml"/></Relationships>`));
}

export async function buildPptxBlob(deck = state.deck) {
  const pptx = await buildPptx(deck);
  return addMotion(await pptx.write({ outputType: 'blob' }), deck);
}

// True once downloaded; false if it failed (the user is told why).
export async function exportPPTX() {
  try {
    download(await buildPptxBlob(), slug(state.deck.name) + '.pptx');
    return true;
  } catch (e) { alertUser(t('No se pudo exportar a PowerPoint: ') + (e.message || e)); return false; }
}
