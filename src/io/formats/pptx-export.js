// Export the deck to a real PowerPoint (.pptx) using PptxGenJS (client‑side).
// The .pptx format is completely different from reveal.js, so this is a separate
// module that maps each block to a native PowerPoint object where possible:
// text, images, shapes, tables and charts. 3D models, video, web embeds, icons
// and equations can't be represented natively and are skipped.

import { state } from '../../core/store.js';
import { alertUser } from '../../core/notify.js';
import { t } from '../../i18n/index.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { chartSeries, iconSVG, inkSVG } from '../../render/svg.js';
import { blockImage } from '../export/images.js';
import { masterBlocksFor, isEmptyPlaceholder, styled, styleKind } from '../../features/document/master.js';
import { PPTXGEN, JSZIP, loadScript } from '../../core/vendor.js';
import { animTimeline, isEntrance } from '../../features/animation/transitions.js';
import { download } from '../files.js';



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
      const base = { fontSize: Math.round((b.fontSize || 40) * 0.75), color: hex(b.color || deckFg()) || 'FFFFFF', align: b.textAlign || 'left',
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
        slide.addShape(pptx.ShapeType.custGeom, { ...pos, points, fill, line: { color: hex(b.stroke) || '1E2A3A', width: b.strokeWidth || 1, ...dashOf(b.dash) } });
      } else if (b.shape === 'line' || b.shape === 'arrow') {
        slide.addShape(pptx.ShapeType.line, { ...pos, line: { color: hex(b.stroke) || '888888', width: b.strokeWidth || 2, ...dashOf(b.dash),
          endArrowType: b.shape === 'arrow' ? 'triangle' : 'none' } });
      } else {
        const st = pptx.ShapeType[SHAPE_MAP[b.shape] || 'rect'];
        const fill = b.fill && b.fill !== 'none' ? { color: hex(b.fill) || '3F6497' } : { type: 'none' };
        slide.addShape(st, { ...pos, fill, line: { color: hex(b.stroke) || '1E2A3A', width: b.strokeWidth || 1, ...dashOf(b.dash) } });
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
      // Gridlines, data labels and axis titles, as PowerPoint's own chart options.
      const extra = { ...(b.dataLabels && { showValue: true }), valGridLine: { style: b.grid ? 'solid' : 'none', color: 'BFBFBF' },
        ...(b.xTitle && { showCatAxisTitle: true, catAxisTitle: b.xTitle }), ...(b.yTitle && { showValAxisTitle: true, valAxisTitle: b.yTitle }) };
      if (type === 'bar' && b.combo && ser.length > 1) {
        slide.addChart([
          { type: pptx.ChartType.bar, data: toData(ser.filter(x => x.type === 'bar')), options: { chartColors: colors.slice(0, 1), barGrouping: 'clustered' } },
          { type: pptx.ChartType.line, data: toData(ser.filter(x => x.type !== 'bar')), options: { chartColors: colors.slice(1) } },
        ], { ...pos, showLegend: true, legendPos: 't', ...extra });
      } else {
        slide.addChart(pptx.ChartType[type], toData(ser), { ...pos, showLegend: ser.length > 1, legendPos: 't', ...(['pie', 'doughnut'].includes(type) ? { ...(b.dataLabels && { showValue: true }) } : extra),
          ...(['pie', 'doughnut'].includes(type) ? {} : { chartColors: colors }) });
      }
    }
    // 3D models, audio: no equivalent (skipped).
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
  if (b.type === 'shape' && b.shape === 'rect') return { rect: { ...pos, fill: { color: hex(b.fill) || 'FFFFFF', ...(b.fill === 'none' && { transparency: 100 }) },
    ...(b.strokeWidth && hex(b.stroke) && { line: { color: hex(b.stroke), width: b.strokeWidth * 0.75, ...dashOf(b.dash) } }) } };
  if (b.type === 'shape' && b.shape === 'line') return { line: { ...pos, line: { color: hex(b.stroke) || '888888', width: (b.strokeWidth || 2) * 0.75, ...dashOf(b.dash) } } };
  if (b.type === 'image' && /^data:image\/(png|jpe?g|gif)/.test(b.src || '') && !b.crop && !b.adj) return { image: { ...pos, data: b.src } };
  return null;
}
function defineMasters(pptx, deck) {
  const out = new Map(), used = new Set(deck.slides.map(s => s.layoutId).filter(Boolean)), names = new Set();
  for (const lay of deck.layouts || []) {
    if (!used.has(lay.id)) continue;
    let name = lay.name || 'Diseño'; while (names.has(name)) name += ' ·'; names.add(name);
    const inMaster = new Set(), objects = [];
    for (const b of masterBlocksFor(lay, deck).concat(lay.blocks.filter(x => !x.ph))) {
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
    const bg = hex(lay.background || deck.slides.find(s => s.layoutId === lay.id)?.background);
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

export async function buildPptx(deck = state.deck) {
  await loadScript(PPTXGEN, 'PptxGenJS');
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
  const masters = defineMasters(pptx, deck);
  for (const s of deck.slides) {
    const m = s.layoutId && masters.get(s.layoutId);
    const slide = m ? pptx.addSlide({ masterName: m.name }) : pptx.addSlide();
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
      addBlock(named(slide, 'rv-' + b.id, b), b, pptx, raster, byId);
    }
  }
  return pptx;
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
      if (args[i] && typeof args[i] === 'object' && !Array.isArray(args[i])) args[i] = { ...args[i], objectName: name, ...(b?.shadow && k !== 'addTable' && k !== 'addChart' && { shadow: pptShadow(b.shadow) }) };
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
  zoom: '<p:zoom/>', wipe: '<p:wipe dir="l"/>', rise: '<p:push dir="u"/>', flip: '<p:split orient="vert" dir="out"/>' };
const SPEED = { fast: 'fast', slow: 'slow', default: 'med' };
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
  return plain(TRANS[kind] || TRANS.fade);
}
// Revela effects → PowerPoint presets: entrances and exits fade, emphasis grows
// or shrinks, motion paths move by the same offset.
function effectXML(b, spid, ids, deck, delay, first) {
  const a = b.animation, dur = a.duration ?? 500, id = () => ids.n++;
  const tgt = `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`;
  const node = first ? 'clickEffect' : a.start === 'afterPrev' ? 'afterEffect' : 'withEffect';
  let cls, preset, body;
  if (a.effect === 'path') {
    const { w, h } = deck.size, dx = ((a.dx || 0) / w).toFixed(4), dy = ((a.dy || 0) / h).toFixed(4);
    cls = 'path'; preset = 0;
    body = `<p:animMotion origin="layout" path="M 0 0 L ${dx} ${dy} E" pathEditMode="relative"><p:cBhvr><p:cTn id="${id()}" dur="${dur}" fill="hold"/>${tgt}<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>`;
  } else if (a.effect === 'grow' || a.effect === 'shrink') {
    const k = a.effect === 'grow' ? 125000 : 80000;
    cls = 'emph'; preset = 6;
    body = `<p:animScale><p:cBhvr><p:cTn id="${id()}" dur="${dur}" fill="hold"/>${tgt}</p:cBhvr><p:by x="${k}" y="${k}"/></p:animScale>`;
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
  const tl = animTimeline(s);
  const list = s.blocks.filter(b => b.animation && tl.has(b.id) && spids.has(b.id)).sort((a, b) => tl.get(a.id).step - tl.get(b.id).step || tl.get(a.id).delay - tl.get(b.id).delay);
  if (!list.length) return '';
  const ids = { n: 3 }, steps = [...new Set(list.map(b => tl.get(b.id).step))];
  const clicks = steps.map(st => {
    const group = list.filter(b => tl.get(b.id).step === st);
    const outer = ids.n++, inner = ids.n++;
    const effects = group.map((b, i) => effectXML(b, spids.get(b.id), ids, deck, tl.get(b.id).delay, i === 0)).join('');
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
  for (let i = 0; i < deck.slides.length; i++) {
    const f = zip.file(`ppt/slides/slide${i + 1}.xml`); if (!f) continue;
    let xml = await f.async('string');
    const spids = new Map([...xml.matchAll(/<p:cNvPr id="(\d+)" name="rv-([^"]+)"/g)].map(m => [m[2], m[1]]));
    const extra = transitionXML(deck.slides[i], deck) + timingXML(deck.slides[i], spids, deck);
    if (!extra) continue;
    // Schema order: cSld, clrMapOvr, transition, timing, extLst.
    xml = xml.includes('</p:clrMapOvr>') ? xml.replace('</p:clrMapOvr>', '</p:clrMapOvr>' + extra)
      : xml.replace(/(<p:extLst>[\s\S]*<\/p:extLst>)?\s*<\/p:sld>\s*$/, m => extra + m);
    zip.file(`ppt/slides/slide${i + 1}.xml`, xml);
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

export async function buildPptxBlob(deck = state.deck) {
  const pptx = await buildPptx(deck);
  return addMotion(await pptx.write({ outputType: 'blob' }), deck);
}

export async function exportPPTX() {
  try {
    download(await buildPptxBlob(), slug(state.deck.name) + '.pptx');
  } catch (e) { alertUser(t('No se pudo exportar a PowerPoint: ') + (e.message || e)); }
}
