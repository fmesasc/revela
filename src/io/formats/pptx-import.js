// PowerPoint (.pptx) import.
//
// A .pptx is an OOXML zip. For each slide this recovers, mapping EMU units onto
// the Revela canvas:
// - text boxes and placeholders, with the position inherited from the layout /
//   master when the slide doesn't set it, and runs with size, bold, italic,
//   underline, colour and font; paragraph alignment, bullets and numbering;
//   vertical anchoring;
// - preset shapes (rectangle, ellipse, arrows, star…) with fill, outline and
//   rotation/flip, lines and connectors;
// - pictures, tables (with merged cells), grouped objects (flattened);
// - the background (slide → layout → master), theme colours and fonts, speaker
//   notes and hidden slides.
// Effects without an equivalent (gradients, shadows, SmartArt, charts…) are
// approximated or skipped.

import { uid } from '../../core/model.js';
import { JSZIP_ESM } from '../../core/vendor.js';

const CANVAS_W = 1280;            // slide width maps to this many px
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };

const parseXML = str => new DOMParser().parseFromString(str, 'application/xml');
const all = (el, name) => (el ? [...el.getElementsByTagName(name)] : []);
const kids = (el, name) => (el ? [...el.children].filter(c => c.tagName === name) : []);
const kid = (el, name) => kids(el, name)[0] || null;
const path = (el, ...names) => names.reduce((e, n) => kid(e, n), el);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  const mod = await import(JSZIP_ESM);
  return mod.default || mod;
}

// ---- Relationships ---------------------------------------------------------
function rels(xmlStr, base) {
  const map = {};
  if (!xmlStr) return map;
  for (const r of all(parseXML(xmlStr), 'Relationship')) {
    const tgt = r.getAttribute('Target') || '';
    map[r.getAttribute('Id')] = {
      type: (r.getAttribute('Type') || '').split('/').pop(),
      path: r.getAttribute('TargetMode') === 'External' ? tgt : resolve(base, tgt),
    };
  }
  return map;
}
function resolve(base, rel) {           // base: folder of the part, e.g. "ppt/slides"
  if (rel.startsWith('/')) return rel.slice(1);
  const parts = base.split('/');
  for (const seg of rel.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
  return parts.join('/');
}
const relsPath = p => p.replace(/([^/]+)$/, '_rels/$1.rels');
const dirOf = p => p.split('/').slice(0, -1).join('/');

// ---- Colours ---------------------------------------------------------------
function themeColours(themeDoc) {
  const out = {};
  const scheme = all(themeDoc, 'a:clrScheme')[0];
  for (const c of scheme ? [...scheme.children] : []) {
    const name = c.tagName.replace('a:', '');
    const v = kid(c, 'a:srgbClr')?.getAttribute('val') || kid(c, 'a:sysClr')?.getAttribute('lastClr');
    if (v) out[name] = '#' + v.toLowerCase();
  }
  // Scheme aliases used by shapes and text.
  Object.assign(out, { tx1: out.dk1, bg1: out.lt1, tx2: out.dk2, bg2: out.lt2 });
  return out;
}
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function mods(hex, el) {                 // lumMod/lumOff/tint/shade, approximately
  let [r, g, b] = hex2rgb(hex);
  for (const m of el ? [...el.children] : []) {
    const v = +m.getAttribute('val') / 100000;
    if (m.tagName === 'a:lumMod') { r *= v; g *= v; b *= v; }
    else if (m.tagName === 'a:lumOff') { r += 255 * v; g += 255 * v; b += 255 * v; }
    else if (m.tagName === 'a:shade') { r *= v; g *= v; b *= v; }
    else if (m.tagName === 'a:tint') { r += (255 - r) * (1 - v); g += (255 - g) * (1 - v); b += (255 - b) * (1 - v); }
  }
  return rgb2hex([r, g, b]);
}
// Colour of a fill-like element (a:solidFill, or the element holding a colour).
function colourOf(el, theme) {
  if (!el) return null;
  const s = kid(el, 'a:srgbClr'); if (s) return mods('#' + s.getAttribute('val').toLowerCase(), s);
  const sc = kid(el, 'a:schemeClr'); if (sc && theme[sc.getAttribute('val')]) return mods(theme[sc.getAttribute('val')], sc);
  const sy = kid(el, 'a:sysClr'); if (sy) return mods('#' + (sy.getAttribute('lastClr') || '000000').toLowerCase(), sy);
  const pr = kid(el, 'a:prstClr'); if (pr) return { black: '#000000', white: '#ffffff', red: '#ff0000', blue: '#0000ff', green: '#008000' }[pr.getAttribute('val')] || null;
  return null;
}
function fillOf(spPr, theme) {           // → colour, 'none' or null (not set)
  if (!spPr) return null;
  if (kid(spPr, 'a:noFill')) return 'none';
  const sf = kid(spPr, 'a:solidFill'); if (sf) return colourOf(sf, theme);
  const gf = kid(spPr, 'a:gradFill');    // gradient → its first stop
  if (gf) return colourOf(all(gf, 'a:gs')[0], theme);
  return null;
}

// A gradient fill as CSS (for slide backgrounds; shapes use the first stop).
function gradientCSS(el, theme) {
  const gf = el && kid(el, 'a:gradFill'); if (!gf) return null;
  const stops = all(gf, 'a:gs').map(gs => ({ pos: +(gs.getAttribute('pos') || 0) / 1000, c: colourOf(gs, theme) })).filter(x => x.c);
  if (stops.length < 2) return null;
  const ang = kid(gf, 'a:lin')?.getAttribute('ang');
  const deg = ang != null ? Math.round(+ang / 60000 + 90) % 360 : 180;     // OOXML 0° = left→right; CSS 90deg
  return `linear-gradient(${deg}deg, ${stops.map(x => `${x.c} ${Math.round(x.pos)}%`).join(', ')})`;
}
const TRANSITION = { fade: 'fade', dissolve: 'fade', push: 'push', cover: 'slide', pull: 'slide', wipe: 'wipe', split: 'wipe', zoom: 'zoom',
  newsflash: 'zoom', flip: 'flip', cube: 'convex', box: 'convex', rotate: 'flip', gallery: 'slide', conveyor: 'slide', switch: 'flip',
  doors: 'wipe', window: 'wipe', vortex: 'zoom', ripple: 'rise', morph: 'fade', random: 'slide', randomBar: 'wipe', wheel: 'wipe' };

// ---- Geometry --------------------------------------------------------------
function xfrmOf(el) {
  const x = all(el, 'a:xfrm')[0] || all(el, 'p:xfrm')[0];
  if (!x) return null;
  const off = kid(x, 'a:off'), ext = kid(x, 'a:ext');
  if (!off || !ext) return null;
  return { x: +off.getAttribute('x'), y: +off.getAttribute('y'), w: +ext.getAttribute('cx'), h: +ext.getAttribute('cy'),
    rot: +(x.getAttribute('rot') || 0) / 60000, flipH: x.getAttribute('flipH') === '1', flipV: x.getAttribute('flipV') === '1' };
}
// Placeholder key used to inherit position/format from layout and master.
const phOf = sp => { const ph = all(sp, 'p:ph')[0]; return ph ? { type: ph.getAttribute('type') || 'body', idx: ph.getAttribute('idx') } : null; };

const PRESET = { rect: 'rect', roundRect: 'rounded', ellipse: 'ellipse', triangle: 'triangle', diamond: 'diamond', pentagon: 'pentagon',
  star5: 'star', rightArrow: 'rightarrow', leftArrow: 'leftarrow', hexagon: 'hexagon', parallelogram: 'parallelogram',
  trapezoid: 'trapezoid', chevron: 'chevron', plus: 'plus', line: 'line', straightConnector1: 'line', snip1Rect: 'rect',
  round2SameRect: 'rounded', flowChartProcess: 'rect', flowChartAlternateProcess: 'rounded', flowChartDecision: 'diamond',
  homePlate: 'pentagon', rtTriangle: 'triangle', octagon: 'hexagon' };

// ---- Text ------------------------------------------------------------------
const ALIGN = { ctr: 'center', r: 'right', just: 'justify', dist: 'justify' };
function paragraphsHTML(txBody, ctx, defaults) {
  const out = []; let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  let firstSize = null, align = null;
  // "Shrink text on overflow": PowerPoint stores the scale it applied.
  const fit = kid(kid(txBody, 'a:bodyPr'), 'a:normAutofit');
  const fs = fit?.getAttribute('fontScale') ? +fit.getAttribute('fontScale') / 100000 : 1;
  for (const p of kids(txBody, 'a:p')) {
    const pPr = kid(p, 'a:pPr');
    align ??= ALIGN[pPr?.getAttribute('algn')] || null;
    const runs = [];
    for (const r of [...p.children]) {
      if (r.tagName === 'a:br') { runs.push('<br>'); continue; }
      if (r.tagName !== 'a:r' && r.tagName !== 'a:fld') continue;
      const txt = kid(r, 'a:t')?.textContent || ''; if (!txt) continue;
      const rPr = kid(r, 'a:rPr'), css = [];
      const sz = rPr?.getAttribute('sz'); if (sz) { const px = ctx.pt(+sz / 100 * fs); firstSize ??= px; css.push(`font-size:${px}px`); }
      const col = colourOf(kid(rPr, 'a:solidFill'), ctx.theme); if (col) css.push(`color:${col}`);
      const face = kid(rPr, 'a:latin')?.getAttribute('typeface');
      const fam = face === '+mj-lt' ? ctx.fonts.major : face === '+mn-lt' ? ctx.fonts.minor : face;
      if (fam) css.push(`font-family:'${fam.replace(/'/g, '')}'`);
      let h = esc(txt);
      if (css.length) h = `<span style="${css.join(';')}">${h}</span>`;
      if (rPr?.getAttribute('b') === '1') h = `<b>${h}</b>`;
      if (rPr?.getAttribute('i') === '1') h = `<i>${h}</i>`;
      if (rPr?.getAttribute('u') && rPr.getAttribute('u') !== 'none') h = `<u>${h}</u>`;
      if (rPr?.getAttribute('strike') && rPr.getAttribute('strike') !== 'noStrike') h = `<s>${h}</s>`;
      runs.push(h);
    }
    const html = runs.join('');
    const bullet = kid(pPr, 'a:buChar') ? 'ul' : kid(pPr, 'a:buAutoNum') ? 'ol' : (kid(pPr, 'a:buNone') ? null : defaults.bullet);
    if (bullet && html) {
      if (list !== bullet) { close(); out.push(`<${bullet}>`); list = bullet; }
      out.push(`<li>${html}</li>`);
    } else { close(); out.push(html ? `<div>${html}</div>` : (out.length ? '<div><br></div>' : '')); }
  }
  close();
  while (out.length && out[out.length - 1] === '<div><br></div>') out.pop();
  return { html: out.join(''), firstSize, align, fontScale: fs };
}

// ---- Parts: layout and master (placeholders + background) -----------------
async function partInfo(zip, file, theme) {
  const doc = parseXML(await zip.file(file).async('string'));
  const r = rels(await zip.file(relsPath(file))?.async('string'), dirOf(file));
  const phs = [];
  for (const sp of all(doc, 'p:sp')) {
    const ph = phOf(sp), geo = xfrmOf(sp);
    if (!ph) continue;
    const lvl1 = all(sp, 'a:lvl1pPr')[0], defRPr = kid(lvl1, 'a:defRPr');
    phs.push({ ...ph, geo, sz: defRPr?.getAttribute('sz') ? +defRPr.getAttribute('sz') / 100 : null,
      anchor: all(sp, 'a:bodyPr')[0]?.getAttribute('anchor') || null });
  }
  // Master text styles (title / body size).
  const tsz = el => { const d = all(el, 'a:defRPr')[0]; return d?.getAttribute('sz') ? +d.getAttribute('sz') / 100 : null; };
  const styles = { title: tsz(all(doc, 'p:titleStyle')[0]), body: tsz(all(doc, 'p:bodyStyle')[0]) };
  const bgPr = all(doc, 'p:bgPr')[0];
  const bgRef = all(doc, 'p:bgRef')[0];
  const bg = gradientCSS(bgPr, theme) || fillOf(bgPr, theme) || (bgRef ? colourOf(bgRef, theme) : null);
  const parent = Object.values(r).find(x => x.type === 'slideLayout' || x.type === 'slideMaster')?.path || null;
  return { doc, rels: r, phs, styles, bg, parent };
}
const findPh = (list, ph) => list.find(p => ph.idx != null && p.idx === ph.idx) || list.find(p => p.type === ph.type)
  || (['body', 'obj'].includes(ph.type) ? list.find(p => p.type === 'body' || p.type === 'obj') : null)
  || (ph.type === 'ctrTitle' ? list.find(p => p.type === 'title') : null) || (ph.type === 'subTitle' ? list.find(p => p.type === 'body') : null);

// ---- Import ----------------------------------------------------------------
export async function importPPTX(file) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(file);

  const presFile = 'ppt/presentation.xml';
  const pres = parseXML(await zip.file(presFile).async('string'));
  const sldSz = all(pres, 'p:sldSz')[0];
  const cx = +sldSz.getAttribute('cx'), cy = +sldSz.getAttribute('cy');
  const scale = CANVAS_W / cx;
  const size = { w: CANVAS_W, h: Math.round(cy * scale) };
  const presRels = rels(await zip.file(relsPath(presFile)).async('string'), 'ppt');

  // Theme: colours and fonts.
  const themePath = Object.values(presRels).find(r => r.type === 'theme')?.path
    || Object.keys(zip.files).find(f => /^ppt\/theme\/theme\d+\.xml$/.test(f));
  const themeDoc = themePath && zip.file(themePath) ? parseXML(await zip.file(themePath).async('string')) : null;
  const theme = themeDoc ? themeColours(themeDoc) : {};
  const fonts = {
    major: all(all(themeDoc, 'a:majorFont')[0], 'a:latin')[0]?.getAttribute('typeface') || '',
    minor: all(all(themeDoc, 'a:minorFont')[0], 'a:latin')[0]?.getAttribute('typeface') || '',
  };
  // The master's colour map says which theme colour is text / background
  // (dark masters swap them).
  const masterPath = Object.values(presRels).find(r => r.type === 'slideMaster')?.path;
  if (masterPath && zip.file(masterPath)) {
    const cm = all(parseXML(await zip.file(masterPath).async('string')), 'p:clrMap')[0];
    for (const k of ['bg1', 'tx1', 'bg2', 'tx2']) { const v = cm?.getAttribute(k); if (v && theme[v]) theme[k] = theme[v]; }
  }
  const ctx = { theme, fonts, pt: pt => Math.round(pt * 12700 * scale) };
  const px = v => Math.round(v * scale);

  const cache = new Map();
  const info = async f => { if (!cache.has(f)) cache.set(f, await partInfo(zip, f, theme)); return cache.get(f); };

  const order = all(pres, 'p:sldId').map(n => presRels[n.getAttribute('r:id')]?.path).filter(Boolean);
  const slides = [];
  for (const slidePath of order) {
    const slFile = zip.file(slidePath); if (!slFile) continue;
    const doc = parseXML(await slFile.async('string'));
    const srels = rels(await zip.file(relsPath(slidePath))?.async('string'), dirOf(slidePath));
    const layoutPath = Object.values(srels).find(r => r.type === 'slideLayout')?.path;
    const layout = layoutPath && zip.file(layoutPath) ? await info(layoutPath) : null;
    const master = layout?.parent && zip.file(layout.parent) ? await info(layout.parent) : null;

    const blocks = [];
    const media = async rid => {
      const t = srels[rid]; if (!t || !zip.file(t.path)) return null;
      const ext = t.path.split('.').pop().toLowerCase();
      return `data:${MIME[ext] || 'image/png'};base64,${await zip.file(t.path).async('base64')}`;
    };
    // Walk the shape tree; groups map their children's coordinates.
    const walk = async (tree, map) => {
      for (const el of [...tree.children]) {
        const tag = el.tagName;
        if (tag === 'p:grpSp') {
          const gx = all(kid(el, 'p:grpSpPr'), 'a:xfrm')[0];
          if (!gx) { await walk(el, map); continue; }
          const g = (n, a) => +kid(gx, n)?.getAttribute(a) || 0;
          const off = [g('a:off', 'x'), g('a:off', 'y')], ext = [g('a:ext', 'cx'), g('a:ext', 'cy')];
          const cOff = [g('a:chOff', 'x'), g('a:chOff', 'y')], cExt = [g('a:chExt', 'cx') || ext[0], g('a:chExt', 'cy') || ext[1]];
          const sx = ext[0] / (cExt[0] || 1), sy = ext[1] / (cExt[1] || 1);
          await walk(el, geo => map({ ...geo, x: off[0] + (geo.x - cOff[0]) * sx, y: off[1] + (geo.y - cOff[1]) * sy, w: geo.w * sx, h: geo.h * sy }));
        } else if (tag === 'p:sp' || tag === 'p:cxnSp') await addShape(el, map);
        else if (tag === 'p:pic') await addPic(el, map);
        else if (tag === 'p:graphicFrame') { if (!(await addChart(el, map))) addTable(el, map); }
      }
    };
    const box = geo => ({ x: px(geo.x), y: px(geo.y), w: Math.max(1, px(geo.w)), h: Math.max(1, px(geo.h)),
      rotation: Math.round(geo.rot || 0), ...(geo.flipH && { flipH: true }), ...(geo.flipV && { flipV: true }), animation: null });

    const addShape = async (sp, map) => {
      const ph = phOf(sp);
      const inherited = ph ? (findPh(layout?.phs || [], ph) || findPh(master?.phs || [], ph)) : null;
      const own = xfrmOf(kid(sp, 'p:spPr'));
      const geo0 = own || inherited?.geo || (ph && findPh(master?.phs || [], ph)?.geo);
      if (!geo0) return;
      const geo = map(geo0);
      const spPr = kid(sp, 'p:spPr');
      const prst = kid(spPr, 'a:prstGeom')?.getAttribute('prst');
      const fill = fillOf(spPr, theme);
      const ln = kid(spPr, 'a:ln');
      const stroke = ln ? (kid(ln, 'a:noFill') ? 'none' : colourOf(kid(ln, 'a:solidFill'), theme)) : null;
      const sw = ln?.getAttribute('w') ? Math.max(1, Math.round(+ln.getAttribute('w') / 12700 * scale * 1.33)) : 1;
      const isLine = sp.tagName === 'p:cxnSp' || prst === 'line' || prst === 'straightConnector1';
      const txBody = kid(sp, 'p:txBody');
      const isTitle = ph && /title/i.test(ph.type);
      const defSize = (inherited?.sz || (isTitle ? master?.styles.title : master?.styles.body) || (isTitle ? 44 : 18));
      const t = txBody ? paragraphsHTML(txBody, ctx, { bullet: ph && ['body', 'obj'].includes(ph.type) && !isTitle ? 'ul' : null }) : null;
      const hasText = t && t.html.replace(/<[^>]*>/g, '').trim();
      // Visible geometry: a filled/outlined preset shape, or a line.
      if (isLine) {
        blocks.push({ id: uid(), type: 'shape', shape: 'line', fill: 'none', stroke: stroke && stroke !== 'none' ? stroke : '#888888', strokeWidth: sw, ...box(geo) });
      } else if ((fill && fill !== 'none') || (stroke && stroke !== 'none')) {
        blocks.push({ id: uid(), type: 'shape', shape: PRESET[prst] || 'rect', fill: fill || 'none',
          stroke: stroke && stroke !== 'none' ? stroke : (fill || 'none'), strokeWidth: stroke && stroke !== 'none' ? sw : 0, ...box(geo) });
      }
      if (!hasText) return;
      const bodyPr = kid(txBody, 'a:bodyPr');
      const anchor = bodyPr?.getAttribute('anchor') || inherited?.anchor || (isTitle && ph.type === 'ctrTitle' ? 'b' : null);
      const size = t.firstSize || ctx.pt(defSize * t.fontScale);
      blocks.push({ id: uid(), type: 'text', ...box(geo), rotation: 0, fontSize: size, html: t.html,
        ...(t.align && { textAlign: t.align }), ...(anchor && { vAlign: { t: 'top', ctr: 'middle', b: 'bottom' }[anchor] }),
        ...(isTitle && { ph: 'title' }), ...(fonts[isTitle ? 'major' : 'minor'] && { fontFamily: `'${fonts[isTitle ? 'major' : 'minor']}', sans-serif` }) });
    };
    const addPic = async (pic, map) => {
      const geo = xfrmOf(kid(pic, 'p:spPr')); const blip = all(pic, 'a:blip')[0];
      if (!geo || !blip) return;
      const src = await media(blip.getAttribute('r:embed')); if (!src) return;
      const descr = all(pic, 'p:cNvPr')[0]?.getAttribute('descr') || '';
      blocks.push({ id: uid(), type: 'image', fit: 'fill', src, ...(descr && { alt: descr }), ...box(map(geo)) });
    };
    // Charts: the chart part's cached data becomes an editable Revela chart.
    const addChart = async (gf, map) => {
      const ref = all(gf, 'c:chart')[0]; const geo = xfrmOf(gf);
      if (!ref || !geo) return false;
      const part = srels[ref.getAttribute('r:id')]?.path; if (!part || !zip.file(part)) return false;
      const cd = parseXML(await zip.file(part).async('string'));
      const plot = all(cd, 'c:plotArea')[0]; if (!plot) return false;
      const KIND = { 'c:barChart': 'bar', 'c:bar3DChart': 'bar', 'c:lineChart': 'line', 'c:line3DChart': 'line', 'c:areaChart': 'area',
        'c:pieChart': 'pie', 'c:pie3DChart': 'pie', 'c:doughnutChart': 'doughnut', 'c:radarChart': 'radar', 'c:scatterChart': 'scatter' };
      const groups = [...plot.children].filter(c => KIND[c.tagName]);
      if (!groups.length) return false;
      const pts = el => { const out = []; for (const p of all(el, 'c:pt')) out[+p.getAttribute('idx')] = kid(p, 'c:v')?.textContent ?? ''; return out; };
      const series = groups.flatMap(g => kids(g, 'c:ser').map(ser => ({
        kind: KIND[g.tagName],
        name: all(kid(ser, 'c:tx'), 'c:v')[0]?.textContent || '',
        cats: pts(kid(ser, 'c:cat') || kid(ser, 'c:xVal')),
        vals: pts(kid(ser, 'c:val') || kid(ser, 'c:yVal')).map(v => +v || 0),
        color: fillOf(kid(ser, 'c:spPr'), theme),
      })));
      if (!series.length) return false;
      const first = series[0], labels = first.cats.length ? first.cats : first.vals.map((_, i) => String(i + 1));
      const b = { id: uid(), type: 'chart', chartType: first.kind, color: first.color && first.color !== 'none' ? first.color : (theme.accent1 || '#3f6497'),
        data: labels.map((l, i) => ({ label: String(l ?? ''), value: first.vals[i] ?? 0 })), ...box(map(geo)) };
      if (first.name) b.seriesName = first.name;
      const rest = series.slice(1);
      if (rest.length) {
        b.series = rest.map((x, i) => ({ name: x.name, values: labels.map((_, k) => x.vals[k] ?? 0),
          ...(x.color && x.color !== 'none' ? { color: x.color } : theme['accent' + (i + 2)] ? { color: theme['accent' + (i + 2)] } : {}) }));
        if (first.kind === 'bar' && rest.some(x => x.kind === 'line')) b.combo = true;
      }
      const title = all(all(cd, 'c:title')[0], 'a:t').map(t => t.textContent).join('');
      if (title) b.alt = title;
      blocks.push(b);
      return true;
    };
    const addTable = (gf, map) => {
      const tbl = all(gf, 'a:tbl')[0]; const geo = xfrmOf(gf);
      if (!tbl || !geo) return;
      const rows = [], merges = [];
      kids(tbl, 'a:tr').forEach((tr, r) => {
        rows.push(kids(tr, 'a:tc').map((tc, c) => {
          const gs = +(tc.getAttribute('gridSpan') || 1), rs = +(tc.getAttribute('rowSpan') || 1);
          if (gs > 1 || rs > 1) merges.push({ r, c, rs, cs: gs });
          if (tc.getAttribute('hMerge') === '1' || tc.getAttribute('vMerge') === '1') return '';
          return paragraphsHTML(kid(tc, 'a:txBody'), ctx, { bullet: null }).html.replace(/<\/?div>/g, m => (m === '</div>' ? '<br>' : '')).replace(/(<br>)+$/, '');
        }));
      });
      const first = tbl.firstElementChild && all(tbl, 'a:tblPr')[0];
      const b = { id: uid(), type: 'table', rows, stroke: theme.dk1 || '#444444', header: first?.getAttribute('firstRow') === '1',
        ...(first?.getAttribute('bandRow') === '1' && { banded: true, band: theme.accent1 }), ...box(map(geo)) };
      if (b.header && theme.accent1) { b.headBg = theme.accent1; b.headFg = theme.lt1 || '#ffffff'; }
      if (merges.length) b.merges = merges;
      blocks.push(b);
    };

    const tree = all(doc, 'p:spTree')[0];
    if (tree) await walk(tree, g => g);

    // Background: the slide's own, else its layout's, else the master's.
    const bgPr = all(doc, 'p:bgPr')[0], bgRef = all(doc, 'p:bgRef')[0];
    let background = gradientCSS(bgPr, theme) || fillOf(bgPr, theme) || (bgRef ? colourOf(bgRef, theme) : null) || layout?.bg || master?.bg || theme.bg1 || '#ffffff';
    const bgBlip = all(bgPr, 'a:blip')[0];
    if (bgBlip) { const src = await media(bgBlip.getAttribute('r:embed')); if (src) background = `url(${src}) center/cover no-repeat`; }

    // Speaker notes.
    let notes = '';
    const notesPath = Object.values(srels).find(r => r.type === 'notesSlide')?.path;
    if (notesPath && zip.file(notesPath)) {
      const nd = parseXML(await zip.file(notesPath).async('string'));
      const body = all(nd, 'p:sp').find(sp => phOf(sp)?.type === 'body');
      notes = kids(kid(body, 'p:txBody'), 'a:p').map(p => all(p, 'a:t').map(t => t.textContent).join('')).join('\n').trim();
    }
    const hidden = doc.documentElement.getAttribute('show') === '0';
    // Transition (the p14/p15 variants sit inside mc:AlternateContent) and its auto-advance time.
    const tr = all(doc, 'p:transition')[0];
    let transition = null, autoSlide = 0;
    if (tr) {
      const kinds = [...all(tr, '*')].map(e => e.tagName.replace(/^p\d*:/, ''));
      transition = kinds.map(k => TRANSITION[k]).find(Boolean) || null;
      const adv = +(tr.getAttribute('advTm') || 0); if (adv) autoSlide = adv;
    }
    slides.push({ id: uid(), sectionId: null, background, transition, hidden, notes, autoSlide, blocks });
  }

  if (!slides.length) throw new Error('No se encontraron diapositivas en el archivo.');
  const deck = { version: 3, name: (file.name || '').replace(/\.pptx$/i, '') || 'Presentación importada', size, theme: 'white',
    defaultTransition: 'slide', transitionSpeed: 'default', sections: [], master: { id: 'master', blocks: [], background: null },
    slideNumber: { show: false, position: 'br', format: 'c' }, footer: { show: false, text: '', date: false },
    logo: { src: '', position: 'br', size: 120 }, loop: false, guides: { v: [], h: [] }, slides };
  if (theme.tx1) deck.textColor = theme.tx1;           // default text colour = the theme's text colour
  return deck;
}
