// PowerPoint (.pptx) import.
//
// A .pptx is an OOXML zip. For each slide this recovers, mapping EMU units onto
// the Revela canvas:
// - text with PowerPoint's full style inheritance (master text styles → master
//   placeholder → layout placeholder → shape → paragraph → run): size, bold,
//   italic, underline, strike, colour, font, caps, spacing, highlight, links;
//   alignment, indents, line and paragraph spacing, bullets and numbering;
//   the box's inner margins, anchoring and "shrink text on overflow" scale;
//   runs of spaces and slide-number fields;
// - preset shapes with fill (with transparency), outline and rotation/flip;
//   lines and connectors along their real diagonal, with arrowheads;
// - pictures, tables (table style, column widths, row heights, cell fills and
//   margins, merged cells), charts, grouped objects (flattened);
// - the template's own graphics (logos, lines): the most used set goes to
//   Revela's master, the rest stay on their slides;
// - the background (slide → layout → master), theme colours and fonts, speaker
//   notes, hidden slides and transitions.
// Effects without an equivalent (shadows, SmartArt…) are approximated or skipped.

import { uid } from '../../core/model.js';
import { styled, masterStyles } from '../../features/document/master.js';
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
function mods(hex, el) {                 // lumMod/lumOff/tint/shade, approximately; alpha
  let [r, g, b] = hex2rgb(hex), a = 1;
  for (const m of el ? [...el.children] : []) {
    const v = +m.getAttribute('val') / 100000;
    if (m.tagName === 'a:alpha') a = v;
    if (m.tagName === 'a:lumMod') { r *= v; g *= v; b *= v; }
    else if (m.tagName === 'a:lumOff') { r += 255 * v; g += 255 * v; b += 255 * v; }
    else if (m.tagName === 'a:shade') { r *= v; g *= v; b *= v; }
    else if (m.tagName === 'a:tint') { r += (255 - r) * (1 - v); g += (255 - g) * (1 - v); b += (255 - b) * (1 - v); }
  }
  // Fully transparent → nothing; partly → #rrggbbaa.
  if (a <= 0) return 'none';
  return rgb2hex([r, g, b]) + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '');
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

// Outer shadow (a:effectLst/a:outerShdw) → { x, y, blur, color }.
function shadowOf(spPr, theme, scale) {
  const sh = all(kid(spPr, 'a:effectLst'), 'a:outerShdw')[0]; if (!sh) return null;
  const dist = +(sh.getAttribute('dist') || 0) * scale, dir = +(sh.getAttribute('dir') || 0) / 60000 * Math.PI / 180;
  const color = colourOf(sh, theme);
  if (!color || color === 'none') return null;
  return { x: Math.round(dist * Math.cos(dir)), y: Math.round(dist * Math.sin(dir)), blur: Math.round(+(sh.getAttribute('blurRad') || 0) * scale), color: color.length === 7 ? color + '66' : color };
}

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
// PowerPoint text formatting is inherited, level by level (lvl1pPr…lvl9pPr):
//   presentation defaultTextStyle (text boxes) or the master's titleStyle /
//   bodyStyle / otherStyle → the master placeholder's list style → the layout
//   placeholder's → the shape's own → the paragraph (a:pPr) → the run (a:rPr).
// Templates (Google Slides exports especially) usually set sizes and colours
// only in the master, so all of them must be walked.
const ALIGN = { l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'justify' };
const AUTONUM = { arabicPeriod: 'decimal', arabicParenR: 'decimal', arabicPlain: 'decimal', alphaLcPeriod: 'lower-alpha', alphaLcParenR: 'lower-alpha',
  alphaUcPeriod: 'upper-alpha', alphaUcParenR: 'upper-alpha', romanLcPeriod: 'lower-roman', romanUcPeriod: 'upper-roman' };
const def = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));
const merge = (...xs) => Object.assign({}, ...xs.map(x => (x ? def(x) : null)));
const spacing = el => {                     // a:lnSpc / a:spcBef / a:spcAft
  if (!el) return undefined;
  const pct = kid(el, 'a:spcPct'), pts = kid(el, 'a:spcPts');
  return pct ? { pct: +pct.getAttribute('val') / 100000 } : pts ? { pt: +pts.getAttribute('val') / 100 } : undefined;
};
function readRun(rPr, theme, fonts) {
  if (!rPr) return null;
  const at = n => rPr.getAttribute(n);
  const face = kid(rPr, 'a:latin')?.getAttribute('typeface');
  return {
    sz: at('sz') ? +at('sz') / 100 : undefined,
    b: at('b') != null ? at('b') === '1' || at('b') === 'true' : undefined,
    i: at('i') != null ? at('i') === '1' || at('i') === 'true' : undefined,
    u: at('u') != null ? at('u') !== 'none' : undefined,
    strike: at('strike') != null ? at('strike') !== 'noStrike' : undefined,
    cap: at('cap') || undefined,
    spc: at('spc') != null ? +at('spc') / 100 : undefined,
    baseline: at('baseline') != null ? +at('baseline') / 1000 : undefined,
    color: (c => (c === 'none' ? 'transparent' : c))(colourOf(kid(rPr, 'a:solidFill'), theme)) || undefined,
    highlight: (c => (c === 'none' ? null : c))(colourOf(kid(rPr, 'a:highlight'), theme)) || undefined,
    font: face === '+mj-lt' ? fonts.major : face === '+mn-lt' ? fonts.minor : (face || undefined),
  };
}
function readPara(pPr, theme) {
  if (!pPr) return null;
  const at = n => pPr.getAttribute(n);
  let bullet;
  if (kid(pPr, 'a:buNone')) bullet = { kind: 'none' };
  else if (kid(pPr, 'a:buChar')) bullet = { kind: 'char', char: kid(pPr, 'a:buChar').getAttribute('char') };
  else if (kid(pPr, 'a:buAutoNum')) { const n = kid(pPr, 'a:buAutoNum'); bullet = { kind: 'num', scheme: n.getAttribute('type'), start: +(n.getAttribute('startAt') || 1) }; }
  const buSz = kid(pPr, 'a:buSzPct');
  return {
    algn: at('algn') || undefined,
    marL: at('marL') != null ? +at('marL') : undefined,
    indent: at('indent') != null ? +at('indent') : undefined,
    lnSpc: spacing(kid(pPr, 'a:lnSpc')), spcBef: spacing(kid(pPr, 'a:spcBef')), spcAft: spacing(kid(pPr, 'a:spcAft')),
    bullet, buColor: colourOf(kid(pPr, 'a:buClr'), theme) || undefined,
    buSize: buSz ? +buSz.getAttribute('val') / 100000 : undefined,
  };
}
// A list style (a:lstStyle, p:titleStyle, a:defaultTextStyle…) → per level { p, r }.
function readLevels(el, theme, fonts) {
  if (!el) return null;
  const out = [];
  for (let l = 1; l <= 9; l++) {
    const lv = kid(el, `a:lvl${l}pPr`);
    out.push(lv ? { p: readPara(lv, theme), r: readRun(kid(lv, 'a:defRPr'), theme, fonts) } : null);
  }
  return out;
}
const mergeLevels = chain => Array.from({ length: 9 }, (_, l) => ({
  p: merge(...chain.map(c => c?.[l]?.p)), r: merge(...chain.map(c => c?.[l]?.r)),
}));
// Text box properties (a:bodyPr), inherited attribute by attribute.
function readBody(bodyPr) {
  if (!bodyPr) return null;
  const at = n => bodyPr.getAttribute(n);
  const fit = kid(bodyPr, 'a:normAutofit');
  return {
    anchor: at('anchor') || undefined,
    l: at('lIns') != null ? +at('lIns') : undefined, r: at('rIns') != null ? +at('rIns') : undefined,
    t: at('tIns') != null ? +at('tIns') : undefined, b: at('bIns') != null ? +at('bIns') : undefined,
    fontScale: fit?.getAttribute('fontScale') ? +fit.getAttribute('fontScale') / 100000 : undefined,
    lnReduce: fit?.getAttribute('lnSpcReduction') ? +fit.getAttribute('lnSpcReduction') / 100000 : undefined,
    vert: at('vert') && at('vert') !== 'horz' ? at('vert') : undefined,
  };
}

const cssFont = f => `'${String(f).replace(/'/g, '')}'`;
// Paragraphs → HTML with the resolved formatting. Sizes are in px; the box
// gets the first paragraph's size, family and colour, and runs only say where
// they differ.
function paragraphsHTML(txBody, ctx, style) {
  const { levels, body = {}, isList = false, base: boxBase = null } = style;
  const fs = body.fontScale || 1, lnRed = body.lnReduce || 0;
  const out = []; let list = null, first = null, align = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const own = readLevels(kid(txBody, 'a:lstStyle'), ctx.theme, ctx.fonts);
  const lv = own ? mergeLevels([levels, own]) : levels;
  for (const p of kids(txBody, 'a:p')) {
    const pPr = kid(p, 'a:pPr');
    const l = Math.min(8, +(pPr?.getAttribute('lvl') || 0));
    const pp = merge(lv[l].p, readPara(pPr, ctx.theme));
    const base = lv[l].r;
    const endR = merge(base, readRun(kid(p, 'a:endParaRPr'), ctx.theme, ctx.fonts));
    const runs = []; let paraSize = null;
    for (const r of [...p.children]) {
      if (r.tagName === 'a:br') { runs.push('<br>'); continue; }
      if (r.tagName !== 'a:r' && r.tagName !== 'a:fld') continue;
      let txt = kid(r, 'a:t')?.textContent || ''; if (!txt) continue;
      if (r.tagName === 'a:fld' && /slidenum/i.test(r.getAttribute('type') || '')) txt = String(ctx.slideNo);
      const rp = merge(base, readRun(kid(r, 'a:rPr'), ctx.theme, ctx.fonts));
      const size = ctx.pt((rp.sz || 18) * fs);
      paraSize ??= size;
      if (!first) first = boxBase || { size, font: rp.font, color: rp.color };
      const css = [];
      if (size !== first.size) css.push(`font-size:${size}px`);
      if (rp.color && rp.color !== first.color) css.push(`color:${rp.color}`);   // the box carries the first colour
      if (rp.font && rp.font !== first.font) css.push(`font-family:${cssFont(rp.font)}`);
      if (rp.cap === 'all') css.push('text-transform:uppercase'); else if (rp.cap === 'small') css.push('font-variant:small-caps');
      if (rp.spc) css.push(`letter-spacing:${ctx.pt(rp.spc)}px`);
      if (rp.highlight) css.push(`background:${rp.highlight}`);
      if (rp.baseline) css.push(`vertical-align:${rp.baseline > 0 ? 'super' : 'sub'};font-size:${Math.round(size * 0.65)}px`);
      // Consecutive spaces align text in PowerPoint; HTML would collapse them.
      let h = esc(txt).replace(/ {2,}/g, m => ' \u00a0'.repeat(Math.ceil(m.length / 2)).slice(0, m.length)).replace(/^ /, '\u00a0');
      if (css.length) h = `<span style="${css.join(';')}">${h}</span>`;
      if (rp.b) h = `<b>${h}</b>`; else if (base.b && rp.b === false) h = `<span style="font-weight:normal">${h}</span>`;
      if (rp.i) h = `<i>${h}</i>`;
      if (rp.u) h = `<u>${h}</u>`;
      if (rp.strike) h = `<s>${h}</s>`;
      const link = all(kid(r, 'a:rPr'), 'a:hlinkClick')[0]?.getAttribute('r:id');
      const href = link && ctx.links?.[link];
      if (href) h = `<a href="${esc(href)}" target="_blank" rel="noopener">${h}</a>`;
      runs.push(h);
    }
    const html = runs.join('');
    paraSize ??= ctx.pt((endR.sz || 18) * fs);
    align ??= ALIGN[pp.algn] || null;
    // Paragraph box: margins, first-line indent, spacing and line height.
    const lineH = pp.lnSpc?.pct != null ? +(1.2 * pp.lnSpc.pct * (1 - lnRed)).toFixed(3)
      : pp.lnSpc?.pt != null ? `${ctx.pt(pp.lnSpc.pt * fs)}px` : null;
    const gap = sp => (sp?.pt != null ? ctx.pt(sp.pt) : sp?.pct != null ? Math.round(paraSize * 1.2 * sp.pct) : 0);
    const marL = ctx.emu(pp.marL || 0), indent = ctx.emu(pp.indent || 0);
    const pcss = [];
    if (lineH != null) pcss.push(`line-height:${lineH}`);
    if (gap(pp.spcBef)) pcss.push(`margin-top:${gap(pp.spcBef)}px`);
    if (gap(pp.spcAft)) pcss.push(`margin-bottom:${gap(pp.spcAft)}px`);
    if (ALIGN[pp.algn] && ALIGN[pp.algn] !== align) pcss.push(`text-align:${ALIGN[pp.algn]}`);
    // Each paragraph at its own size: with the box's size (its first run's) a
    // big first line (an icon, a title) would make every line that tall.
    if (paraSize !== first?.size) pcss.push(`font-size:${paraSize}px`);
    const bu = pp.bullet?.kind ?? (isList ? 'char' : 'none');
    if ((bu === 'char' || bu === 'num') && html) {
      const tag = bu === 'num' ? 'ol' : 'ul';
      if (list !== tag) { close(); out.push(`<${tag} style="margin:0;padding:0">`); list = tag; }
      const marker = bu === 'num' ? `list-style-type:${AUTONUM[pp.bullet?.scheme] || 'decimal'}`
        : `list-style-type:'${(pp.bullet?.char || '•').replace(/'/g, '')}  '`;
      // The text starts at marL; the bullet hangs in the first-line indent.
      pcss.push(marker, 'list-style-position:outside', `margin-left:${Math.max(0, marL)}px`);
      if (pp.buColor) pcss.push(`color:${pp.buColor}`);
      out.push(`<li style="${pcss.join(';')}">${html}</li>`);
    } else {
      close();
      if (marL) pcss.push(`padding-left:${marL}px`);
      if (indent) pcss.push(`text-indent:${indent}px`);
      out.push(`<div${pcss.length ? ` style="${pcss.join(';')}"` : ''}>${html || '<br>'}</div>`);
    }
  }
  close();
  while (out.length && /^<div[^>]*><br><\/div>$/.test(out[out.length - 1])) out.pop();
  return { html: out.join(''), first, align };
}

// ---- Parts: layout and master (placeholders, decorations, background) ------
async function partInfo(zip, file, theme, fonts) {
  const doc = parseXML(await zip.file(file).async('string'));
  const r = rels(await zip.file(relsPath(file))?.async('string'), dirOf(file));
  const phs = [];
  for (const sp of all(doc, 'p:sp')) {
    const ph = phOf(sp); if (!ph) continue;
    phs.push({ ...ph, geo: xfrmOf(sp), levels: readLevels(kid(kid(sp, 'p:txBody'), 'a:lstStyle'), theme, fonts),
      body: readBody(kid(kid(sp, 'p:txBody'), 'a:bodyPr')) });
  }
  // Master text styles by kind of placeholder.
  const styles = {
    title: readLevels(all(doc, 'p:titleStyle')[0], theme, fonts),
    body: readLevels(all(doc, 'p:bodyStyle')[0], theme, fonts),
    other: readLevels(all(doc, 'p:otherStyle')[0], theme, fonts),
  };
  const bgPr = all(doc, 'p:bgPr')[0];
  const bgRef = all(doc, 'p:bgRef')[0];
  const bg = gradientCSS(bgPr, theme) || fillOf(bgPr, theme) || (bgRef ? colourOf(bgRef, theme) : null);
  const parent = Object.values(r).find(x => x.type === 'slideLayout' || x.type === 'slideMaster')?.path || null;
  const showMasterSp = doc.documentElement.getAttribute('showMasterSp') !== '0';
  return { file, doc, rels: r, phs, styles, bg, parent, showMasterSp };
}
const findPh = (list, ph) => list.find(p => ph.idx != null && p.idx === ph.idx && p.type === ph.type)
  || list.find(p => ph.idx != null && p.idx === ph.idx) || list.find(p => p.type === ph.type)
  || (['body', 'obj'].includes(ph.type) ? list.find(p => p.type === 'body' || p.type === 'obj') : null)
  || (ph.type === 'ctrTitle' ? list.find(p => p.type === 'title') : null) || (ph.type === 'subTitle' ? list.find(p => p.type === 'body') : null);
const TITLE_PH = t => t === 'title' || t === 'ctrTitle';
// PowerPoint placeholder types that map to Revela's styled placeholders.
const REVELA_PH = { title: 'title', ctrTitle: 'title', subTitle: 'subtitle', body: 'body', obj: 'body' };
// Layout names from Google Slides (internal) and PowerPoint (English), in the
// names Revela uses.
const LAYOUT_NAMES = { TITLE: 'Portada', TITLE_SLIDE: 'Portada', TITLE_AND_BODY: 'Título y cuerpo', TITLE_AND_CONTENT: 'Título y contenido',
  SECTION_HEADER: 'Encabezado de sección', TITLE_ONLY: 'Solo el título', TITLE_AND_TWO_COLUMNS: 'Dos columnas', TWO_CONTENT: 'Dos contenidos',
  COMPARISON: 'Comparación', ONE_COLUMN_TEXT: 'Una columna de texto', MAIN_POINT: 'Idea principal', SECTION_TITLE_AND_DESCRIPTION: 'Título de sección y descripción',
  CAPTION_ONLY: 'Solo el pie', BIG_NUMBER: 'Número grande', BLANK: 'En blanco', CONTENT_WITH_CAPTION: 'Contenido con título', PICTURE_WITH_CAPTION: 'Imagen con título' };
const phKeyOf = ph => `${ph.type || 'body'}|${ph.idx ?? ''}`;
const BODY_PH = t => ['body', 'obj', 'subTitle', undefined, null].includes(t);

// ---- Animations ------------------------------------------------------------
// PowerPoint's main sequence (p:timing): every effect on a shape becomes the
// Revela animation of its block — entrances (fade, fly in → fade-up…, zoom),
// exits, grow/shrink emphasis and motion paths; "on click", "with previous"
// and "after previous", with duration and delay.
const FLY = { 4: 'fade-up', 1: 'fade-down', 8: 'fade-right', 2: 'fade-left' };
function readAnimations(doc, spidOf, blocks, size) {
  const main = all(doc, 'p:cTn').find(c => c.getAttribute('nodeType') === 'mainSeq');
  if (!main) return;
  let order = 0;
  for (const c of all(main, 'p:cTn').filter(x => x.getAttribute('presetClass'))) {
    const spid = all(c, 'p:spTgt')[0]?.getAttribute('spid');
    const b = blocks.find(x => x.id === spidOf.get(spid)); if (!b) continue;
    const cls = c.getAttribute('presetClass'), preset = +c.getAttribute('presetID'), sub = +(c.getAttribute('presetSubtype') || 0);
    const inner = all(c, 'p:cTn').map(x => +x.getAttribute('dur')).filter(d => d > 1);
    const dur = inner.length ? Math.max(...inner) : 500;
    const delay = +(all(kid(c, 'p:stCondLst'), 'p:cond')[0]?.getAttribute('delay')) || 0;
    const start = { withEffect: 'withPrev', afterEffect: 'afterPrev' }[c.getAttribute('nodeType')] || 'click';
    let effect = 'fade-in', extra = {};
    if (cls === 'exit') effect = 'fade-out';
    else if (cls === 'emph') effect = +(all(c, 'p:by')[0]?.getAttribute('x') || 125000) >= 100000 ? 'grow' : 'shrink';
    else if (cls === 'path') {
      const m = (all(c, 'p:animMotion')[0]?.getAttribute('path') || '').match(/L\s*(-?[\d.]+)\s+(-?[\d.]+)/);
      effect = 'path'; extra = { dx: Math.round((+m?.[1] || 0) * size.w), dy: Math.round((+m?.[2] || 0) * size.h) };
    } else if (preset === 2) effect = FLY[sub] || 'fade-up';
    else if (preset === 42 || preset === 47) {                  // float in: its start offset gives the direction
      const v = all(c, 'p:strVal').map(x => x.getAttribute('val')).find(x => /#ppt_[xy][+-]/.test(x || '')) || '#ppt_y+';
      effect = /ppt_y\+/.test(v) ? 'fade-up' : /ppt_y-/.test(v) ? 'fade-down' : /ppt_x\+/.test(v) ? 'fade-left' : 'fade-right';
    }
    else if (preset === 53 || preset === 23) effect = 'zoom-in';
    else if (cls !== 'entr') continue;
    b.animation = { effect, order: ++order, start, duration: dur, delay, ...extra };
  }
}

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
  const ctx = { theme, fonts, pt: pt => Math.round(pt * 12700 * scale), emu: v => Math.round(v * scale) };
  // Text boxes that aren't placeholders start from the presentation's default text style.
  const defaultText = readLevels(all(pres, 'p:defaultTextStyle')[0], theme, fonts);
  // Table styles (ppt/tableStyles.xml): borders, text, header and band colours.
  const tableStyles = {};
  const tsFile = zip.file('ppt/tableStyles.xml');
  if (tsFile) for (const ts of all(parseXML(await tsFile.async('string')), 'a:tblStyle')) {
    const part = n => kid(ts, n);
    const txt = el => { const t = kid(el, 'a:tcTxStyle'); if (!t) return null;
      const face = all(t, 'a:latin')[0]?.getAttribute('typeface'); const col = colourOf(t, theme);
      return { b: t.getAttribute('b') === 'on' || undefined, color: col || undefined, font: face || undefined }; };
    const fillIn = el => { const f = fillOf(kid(kid(el, 'a:tcStyle'), 'a:fill'), theme); return f && f !== 'none' ? f : undefined; };
    const whole = part('a:wholeTbl'), wt = txt(whole);
    tableStyles[ts.getAttribute('styleId')] = {
      border: colourOf(all(kid(kid(whole, 'a:tcStyle'), 'a:tcBdr'), 'a:solidFill')[0], theme) || undefined,
      text: wt ? [{ p: null, r: wt }] : null,
      headBg: fillIn(part('a:firstRow')), headFg: txt(part('a:firstRow'))?.color, band: fillIn(part('a:band1H')),
    };
  }
  const px = v => Math.round(v * scale);

  const cache = new Map();
  const decorOf = new Map(), usedLayouts = new Map();   // part file → its objects; layout path → { layout, master }
  const info = async f => { if (!cache.has(f)) cache.set(f, await partInfo(zip, f, theme, fonts)); return cache.get(f); };

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
    const slideNo = slides.length + 1;
    const links = Object.fromEntries(Object.entries(srels).filter(([, v]) => v.type === 'hyperlink').map(([k, v]) => [k, v.path]));
    let partRels = srels;
    const spidOf = new Map();
    let decorMode = false;       // walking a layout/master: only its own graphics, not its placeholders        // relationships of the part being walked (slide, layout or master)
    const media = async rid => {
      const t = partRels[rid]; if (!t || !zip.file(t.path)) return null;
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
        } else {
          const before = blocks.length;
          if (tag === 'p:sp' || tag === 'p:cxnSp') await addShape(el, map);
          else if (tag === 'p:pic') await addPic(el, map);
          else if (tag === 'p:graphicFrame') { if (!(await addChart(el, map)) && !(await addDiagram(el, map))) addTable(el, map); }
          // Shape id → the block that stands for it (its text if it has one), for the animations.
          const made = blocks.slice(before), spid = all(el, 'p:cNvPr')[0]?.getAttribute('id');
          if (spid && made.length && !decorMode) spidOf.set(spid, (made.find(b => b.type === 'text') || made[made.length - 1]).id);
        }
      }
    };
    const box = geo => ({ x: px(geo.x), y: px(geo.y), w: Math.max(1, px(geo.w)), h: Math.max(1, px(geo.h)),
      rotation: Math.round(geo.rot || 0), ...(geo.flipH && { flipH: true }), ...(geo.flipV && { flipV: true }), animation: null });

    const addShape = async (sp, map) => {
      const ph = phOf(sp);
      if (decorMode && ph) return;
      const inherited = ph ? (findPh(layout?.phs || [], ph) || findPh(master?.phs || [], ph)) : null;
      const own = xfrmOf(kid(sp, 'p:spPr'));
      const geo0 = own || inherited?.geo || (ph && findPh(master?.phs || [], ph)?.geo);
      if (!geo0) return;
      const geo = map(geo0);
      const spPr = kid(sp, 'p:spPr');
      const prst = kid(spPr, 'a:prstGeom')?.getAttribute('prst');
      // Shapes drawn with the theme's default style keep their colours in
      // p:style (fillRef / lnRef / fontRef), not in spPr.
      const pst = kid(sp, 'p:style');
      // (fill/line idx 0 means none; the font's idx is 'minor'/'major'.)
      const ref = n => { const r = kid(pst, n), idx = r?.getAttribute('idx'); return r && (n === 'a:fontRef' || +(idx || 0) > 0) ? colourOf(r, theme) : null; };
      const fill = fillOf(spPr, theme) ?? ref('a:fillRef');
      const ln = kid(spPr, 'a:ln');
      const lnFill = ln && (kid(ln, 'a:noFill') ? 'none' : colourOf(kid(ln, 'a:solidFill'), theme));
      const stroke = lnFill || ref('a:lnRef');
      // Dashed/dotted outlines (a:prstDash) and the corner radius of rounded rectangles.
      const pd = kid(ln, 'a:prstDash')?.getAttribute('val');
      const dash = /dot/i.test(pd || '') && !/dash/i.test(pd) ? 'dot' : /dashdot/i.test(pd || '') ? 'dashDot' : /dash/i.test(pd || '') ? 'dash' : null;
      const adj = +(all(kid(spPr, 'a:prstGeom'), 'a:gd').find(g => g.getAttribute('name') === 'adj')?.getAttribute('fmla') || '').replace(/^val /, '') || 16667;
      const sw = ln?.getAttribute('w') ? Math.max(1, Math.round(+ln.getAttribute('w') * scale)) : 1;   // EMU → px, like positions
      const isLine = sp.tagName === 'p:cxnSp' || prst === 'line' || prst === 'straightConnector1';
      const shadow = shadowOf(spPr, theme, scale);
      const txBody = kid(sp, 'p:txBody');
      const isTitle = ph && TITLE_PH(ph.type);
      // The text formatting this shape inherits (see paragraphsHTML).
      const kind = !ph ? null : isTitle ? 'title' : BODY_PH(ph.type) ? 'body' : 'other';
      const mph = ph && findPh(master?.phs || [], ph), lph = ph && findPh(layout?.phs || [], ph);
      const fontRefColour = ref('a:fontRef');
      const levels = mergeLevels(ph ? [master?.styles[kind], mph?.levels, lph?.levels] : [defaultText, master?.styles.other,
        fontRefColour && Array(9).fill({ p: null, r: { color: fontRefColour } })]);
      const body = merge({ l: 91440, r: 91440, t: 45720, b: 45720 }, mph?.body, lph?.body, readBody(kid(txBody, 'a:bodyPr')));
      const t = txBody ? paragraphsHTML(txBody, { ...ctx, slideNo, links }, { levels, body }) : null;
      const hasText = t && t.html.replace(/<[^>]*>/g, '').trim();
      // Visible geometry: a filled/outlined preset shape, or a line.
      if (isLine) {
        blocks.push({ ...lineBlock(geo, ln, stroke && stroke !== 'none' ? stroke : '#888888', sw), ...(dash && { dash }) });
      } else if ((fill && fill !== 'none') || (stroke && stroke !== 'none')) {
        const bx = box(geo);
        blocks.push({ id: uid(), type: 'shape', shape: PRESET[prst] || 'rect', fill: fill || 'none',
          stroke: stroke && stroke !== 'none' ? stroke : (fill || 'none'), strokeWidth: stroke && stroke !== 'none' ? sw : 0, ...bx,
          ...(dash && stroke && stroke !== 'none' && { dash }), ...(shadow && { shadow }),
          ...(prst === 'roundRect' && { radius: Math.round(Math.min(bx.w, bx.h) * Math.min(50000, adj) / 100000) }) });
      }
      if (!hasText) return;
      const anchor = body.anchor || (ph?.type === 'ctrTitle' ? 'b' : null);
      const first = t.first || {};
      const font = first.font || fonts[isTitle ? 'major' : 'minor'];
      blocks.push({ id: uid(), type: 'text', ...box(geo), rotation: Math.round(geo.rot || 0), fontSize: first.size || ctx.pt(levels[0].r.sz || 18),
        html: t.html, pad: [ctx.emu(body.t), ctx.emu(body.r), ctx.emu(body.b), ctx.emu(body.l)],
        ...(t.align && { textAlign: t.align }), ...(anchor && { vAlign: { t: 'top', ctr: 'middle', b: 'bottom' }[anchor] }),
        ...(body.vert && { vertical: true }),
        ...(first.color && first.color !== 'transparent' && { color: first.color }),
        ...(shadow && !((fill && fill !== 'none') || (stroke && stroke !== 'none')) && { shadow }), ...(body.fontScale && body.fontScale < 1 && { fit: body.fontScale }),
        ...(REVELA_PH[ph?.type || ''] && { ph: REVELA_PH[ph.type || ''], pk: phKeyOf(ph) }), ...(font && { fontFamily: `${cssFont(font)}, sans-serif` }) });
    };
    // A line or connector goes corner to corner of its box (flips choose which
    // corners), turned by its rotation. Revela draws a horizontal line through
    // the middle of its box, so the box is laid along the segment instead; an
    // arrowhead at either end makes it an arrow pointing that way.
    const lineBlock = (geo, ln, stroke, sw) => {
      const g = { x: px(geo.x), y: px(geo.y), w: px(geo.w), h: px(geo.h) };
      let a = [g.x, g.y], b = [g.x + g.w, g.y + g.h];
      if (geo.flipH) { a[0] = g.x + g.w; b[0] = g.x; }
      if (geo.flipV) { a[1] = g.y + g.h; b[1] = g.y; }
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2, r = (geo.rot || 0) * Math.PI / 180;
      const turn = ([x, y]) => [cx + (x - cx) * Math.cos(r) - (y - cy) * Math.sin(r), cy + (x - cx) * Math.sin(r) + (y - cy) * Math.cos(r)];
      a = turn(a); b = turn(b);
      const tip = e => { const t = kid(ln, e)?.getAttribute('type'); return t && t !== 'none'; };
      if (tip('a:headEnd') && !tip('a:tailEnd')) [a, b] = [b, a];      // the arrow points at the head
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), w = Math.max(4, len / 0.94), h = Math.max(12, sw * 4);
      return { id: uid(), type: 'shape', shape: tip('a:headEnd') || tip('a:tailEnd') ? 'arrow' : 'line', fill: 'none', stroke, strokeWidth: sw,
        x: Math.round((a[0] + b[0]) / 2 - w / 2), y: Math.round((a[1] + b[1]) / 2 - h / 2), w: Math.round(w), h: Math.round(h),
        rotation: Math.round(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI), animation: null };
    };
    const addPic = async (pic, map) => {
      if (decorMode && phOf(pic)) return;
      const geo = xfrmOf(kid(pic, 'p:spPr')); const blip = all(pic, 'a:blip')[0];
      if (!geo || !blip) return;
      const src = await media(blip.getAttribute('r:embed')); if (!src) return;
      const descr = all(pic, 'p:cNvPr')[0]?.getAttribute('descr') || '';
      const shadow = shadowOf(kid(pic, 'p:spPr'), theme, scale);
      blocks.push({ id: uid(), type: 'image', fit: 'fill', src, ...(descr && { alt: descr }), ...(shadow && { shadow }), ...box(map(geo)) });
    };
    // Charts: the chart part's cached data becomes an editable Revela chart.
    // SmartArt: PowerPoint keeps a drawing of it (ppt/diagrams/drawingN.xml,
    // dsp: shapes in the frame's coordinates); its shapes and text are imported
    // as ordinary objects, like PowerPoint's "Convert to shapes".
    const addDiagram = async (gf, map) => {
      if (!/diagram/.test(all(gf, 'a:graphicData')[0]?.getAttribute('uri') || '')) return false;
      const frame = xfrmOf(gf); if (!frame) return false;
      const dm = all(gf, 'dgm:relIds')[0]?.getAttribute('r:dm');
      const dataPath = partRels[dm]?.path;
      let drawPath = null;
      if (dataPath && zip.file(dataPath)) {
        const relId = (await zip.file(dataPath).async('string')).match(/dataModelExt[^>]*relId="([^"]+)"/)?.[1];
        drawPath = relId && partRels[relId]?.path;
      }
      drawPath ||= dataPath && dataPath.replace(/data(\d+)\.xml$/, 'drawing$1.xml');
      if (!drawPath || !zip.file(drawPath)) return false;
      const xml = (await zip.file(drawPath).async('string')).replace(/<(\/?)dsp:/g, '<$1p:').replace(/xmlns:dsp=/, 'xmlns:p=');
      const tree = all(parseXML(xml), 'p:spTree')[0]; if (!tree) return false;
      const saved = partRels;
      partRels = { ...partRels, ...rels(await zip.file(relsPath(drawPath))?.async('string'), dirOf(drawPath)) };
      await walk(tree, geo => map({ ...geo, x: frame.x + geo.x, y: frame.y + geo.y }));
      partRels = saved;
      return true;
    };
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
      const tblPr = kid(tbl, 'a:tblPr');
      const st = tableStyles[kid(tblPr, 'a:tableStyleId')?.textContent] || {};
      const levels = mergeLevels([defaultText, master?.styles.other, st.text]);
      // The table's size: the one its cells use most (they usually all set it).
      const sizes = {}; for (const rp of all(tbl, 'a:rPr')) { const z = rp.getAttribute('sz'); if (z) sizes[z] = (sizes[z] || 0) + 1; }
      const common = Object.keys(sizes).sort((a, b) => sizes[b] - sizes[a])[0];
      const size = ctx.pt(common ? +common / 100 : (levels[0].r.sz || 18));
      const rows = [], merges = [], cellBg = {};
      let pad = null;
      kids(tbl, 'a:tr').forEach((tr, r) => {
        rows.push(kids(tr, 'a:tc').map((tc, c) => {
          const gs = +(tc.getAttribute('gridSpan') || 1), rs = +(tc.getAttribute('rowSpan') || 1);
          if (gs > 1 || rs > 1) merges.push({ r, c, rs, cs: gs });
          if (tc.getAttribute('hMerge') === '1' || tc.getAttribute('vMerge') === '1') return '';
          const tcPr = kid(tc, 'a:tcPr');
          const bg = fillOf(tcPr, theme); if (bg && bg !== 'none') cellBg[`${r},${c}`] = bg;
          pad ??= tcPr && ['marT', 'marR', 'marB', 'marL'].map((k, i) => ctx.emu(+(tcPr.getAttribute(k) ?? (i % 2 ? 91440 : 45720))));
          // Cell text: sizes relative to the table's, paragraphs as line breaks.
          return paragraphsHTML(kid(tc, 'a:txBody'), { ...ctx, slideNo, links }, { levels, body: {}, base: { size, font: levels[0].r.font } }).html
            .replace(/<div[^>]*>|<\/div>/g, m => (m === '</div>' ? '<br>' : '')).replace(/(<br>)+$/, '');
        }));
      });
      const cols = kids(kid(tbl, 'a:tblGrid'), 'a:gridCol').map(g => +g.getAttribute('w') || 1);
      // The table's real size is its columns' and rows' (the frame's may be smaller).
      const rowsH = kids(tbl, 'a:tr').reduce((a, tr) => a + (+tr.getAttribute('h') || 0), 0);
      const full = { ...geo, w: Math.max(geo.w, cols.reduce((a, w) => a + w, 0)), h: Math.max(geo.h, rowsH) };
      const b = { id: uid(), type: 'table', rows, fontSize: size, stroke: st.border || theme.dk1 || '#444444',
        header: tblPr?.getAttribute('firstRow') === '1', ...box(map(full)) };
      if (tblPr?.getAttribute('bandRow') === '1') Object.assign(b, { banded: true, band: st.band || theme.accent1 });
      if (b.header) { b.headBg = st.headBg || theme.accent1; b.headFg = st.headFg || theme.lt1 || '#ffffff'; }
      if (cols.length === (rows[0]?.length || 0)) b.colW = cols.map(w => ctx.emu(w));
      const heights = kids(tbl, 'a:tr').map(tr => ctx.emu(+tr.getAttribute('h') || 0));
      if (heights.some(Boolean)) b.rowH = heights;
      if (Object.keys(cellBg).length) b.cellBg = cellBg;
      if (pad) b.cellPad = pad;
      if (levels[0].r.font) b.fontFamily = `${cssFont(levels[0].r.font)}, sans-serif`;
      if (merges.length) b.merges = merges;
      blocks.push(b);
    };

    const tree = all(doc, 'p:spTree')[0];
    if (tree) await walk(tree, g => g);

    // The template's own graphics (logos, lines…), once per master and layout:
    // they become the objects of Revela's master and layouts (see below).
    const content = blocks.splice(0);
    decorMode = true;
    for (const part of [master, layout].filter(Boolean)) {
      if (decorOf.has(part.file)) continue;
      partRels = part.rels;
      const t = all(part.doc, 'p:spTree')[0]; if (t) await walk(t, g => g);
      decorOf.set(part.file, blocks.splice(0));
    }
    decorMode = false; partRels = srels;
    blocks.push(...content);
    const layoutInfo = layout && { layout, master };
    if (layoutInfo) usedLayouts.set(layoutPath, layoutInfo);
    const hideMaster = doc.documentElement.getAttribute('showMasterSp') === '0';

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
    let morph = null;
    if (tr) {
      const kinds = [...all(tr, '*')].map(e => e.tagName.replace(/^p\d*:/, ''));
      transition = kinds.map(k => TRANSITION[k]).find(Boolean) || null;
      const adv = +(tr.getAttribute('advTm') || 0); if (adv) autoSlide = adv;
      // Morph (inside mc:AlternateContent): by objects, words or characters.
      const m = [...all(tr, '*')].find(e => /:morph$/.test(e.tagName));
      if (m) { morph = { byWord: 'words', byChar: 'chars' }[m.getAttribute('option')] || 'objects'; transition = null; }
    }
    readAnimations(doc, spidOf, blocks, size);
    slides.push({ id: uid(), sectionId: null, background, transition, hidden, notes, autoSlide, blocks, _layout: layoutPath, ...(hideMaster && { hideMaster: true }),
      ...(morph && { autoAnimate: true }), ...(morph && morph !== 'objects' && { morphBy: morph }) });
  }

  // ---- Master styles and layouts --------------------------------------------
  // The master's text styles (title, body levels) become Revela's; each layout
  // used becomes a Revela layout with its placeholders and its own objects.
  const firstMaster = [...usedLayouts.values()][0]?.master;
  const lvl1 = (chain, i = 0) => mergeLevels(chain)[i];
  const styleFrom = lv => def({
    size: lv.r.sz ? ctx.pt(lv.r.sz) : undefined, color: lv.r.color && lv.r.color !== 'transparent' ? lv.r.color : undefined,
    font: lv.r.font ? `${cssFont(lv.r.font)}, sans-serif` : undefined, bold: lv.r.b, italic: lv.r.i, align: ALIGN[lv.p.algn],
  });
  const mph = kind => firstMaster && findPh(firstMaster.phs, { type: kind });
  const styles = {};
  if (firstMaster) {
    const titleChain = [firstMaster.styles.title, mph('title')?.levels];
    const bodyChain = [firstMaster.styles.body, mph('body')?.levels];
    styles.title = styleFrom(lvl1(titleChain));
    styles.body = { ...styleFrom(lvl1(bodyChain)), levels: [0, 1, 2, 3, 4].map(i => { const l = lvl1(bodyChain, i);
      return def({ size: l.r.sz ? ctx.pt(l.r.sz) : undefined, color: l.r.color, bullet: l.p.bullet?.kind === 'char' ? l.p.bullet.char : l.p.bullet?.kind === 'num' ? 'decimal' : l.p.bullet?.kind === 'none' ? 'none' : undefined }); }) };
    const sub0 = [...usedLayouts.values()].map(u => findPh(u.layout.phs, { type: 'subTitle' })).find(Boolean);
    styles.subtitle = styleFrom(lvl1([...bodyChain, sub0?.levels]));
    delete styles.subtitle.bullet;
  }
  const layouts = [], layoutIdOf = new Map(), phIdOf = new Map();
  let n = 0;
  for (const [path, { layout: lay, master: mas }] of usedLayouts) {
    const id = 'pptx-' + (++n), blocksL = [];
    for (const p of lay.phs) {
      const kind = REVELA_PH[p.type || ''];
      if (!kind) continue;
      const geo0 = p.geo || findPh(mas?.phs || [], p)?.geo; if (!geo0) continue;
      // The layout's own formatting where it differs from the master's.
      const own = styleFrom(lvl1([mas?.styles[kind === 'title' ? 'title' : 'body'], findPh(mas?.phs || [], p)?.levels, p.levels]));
      const base = styles[kind] || {};
      const bp = { id: uid(), type: 'text', ph: kind, x: px(geo0.x), y: px(geo0.y), w: px(geo0.w), h: px(geo0.h), rotation: 0, animation: null, html: '' };
      if (own.size && own.size !== base.size) bp.fontSize = own.size;
      if (own.color && own.color !== base.color) bp.color = own.color;
      if (own.align && own.align !== base.align) bp.textAlign = own.align;
      if (p.body?.anchor) bp.vAlign = { t: 'top', ctr: 'middle', b: 'bottom' }[p.body.anchor];
      phIdOf.set(`${path}#${phKeyOf(p)}`, bp.id); phIdOf.set(`${path}#${p.type || 'body'}`, phIdOf.get(`${path}#${p.type || 'body'}`) || bp.id);
      blocksL.push(bp);
    }
    const name = lay.doc.getElementsByTagName('p:cSld')[0]?.getAttribute('name') || `Diseño ${n}`;
    layouts.push({ id, name: LAYOUT_NAMES[name.replace(/\s*\([^)]*\)\s*$/, '').trim().toUpperCase().replace(/[ _]+/g, '_')] || name.replace(/\s*\([^)]*\)\s*$/, '').replace(/_/g, ' '), background: null,
      ...(lay.showMasterSp === false && { hideMaster: true }), blocks: [...(decorOf.get(lay.file) || []), ...blocksL] });
    layoutIdOf.set(path, id);
  }
  const masterBlocks = firstMaster ? (decorOf.get(firstMaster.file) || []) : [];

  if (!slides.length) throw new Error('No se encontraron diapositivas en el archivo.');
  const deck = { version: 3, name: (file.name || '').replace(/\.pptx$/i, '') || 'Presentación importada', size, theme: 'white',
    defaultTransition: 'slide', transitionSpeed: 'default', sections: [], master: { id: 'master', blocks: masterBlocks, background: null, ...(firstMaster && { styles }) },
    ...(layouts.length && { layouts }),
    slideNumber: { show: false, position: 'br', format: 'c' }, footer: { show: false, text: '', date: false },
    logo: { src: '', position: 'br', size: 120 }, loop: false, guides: { v: [], h: [] }, slides };
  if (theme.tx1) deck.textColor = theme.tx1;           // default text colour = the theme's text colour
  // Slides: their layout, and placeholders linked to the layout's; what they
  // only repeat from the master or layout is dropped, so editing the master's
  // styles later changes them too.
  if (firstMaster) masterStyles(deck);
  for (const s of slides) {
    const path = s._layout; delete s._layout;
    if (layoutIdOf.has(path)) s.layoutId = layoutIdOf.get(path);
    for (const b of s.blocks) {
      if (!b.pk) continue;
      const lp = phIdOf.get(`${path}#${b.pk}`) || phIdOf.get(`${path}#${b.pk.split('|')[0]}`);
      delete b.pk;
      if (!s.layoutId) continue;
      if (lp) b.lp = lp;                         // without one in its layout, it follows the master directly
      const inherited = styled({ ...b, fontSize: undefined, fontFamily: undefined, color: undefined, textAlign: undefined, fontWeight: undefined, fontStyle: undefined }, s, deck);
      for (const k of ['fontFamily', 'color', 'textAlign']) if (b[k] != null && b[k] === inherited[k]) delete b[k];
      if (b.fontSize != null && Math.abs(b.fontSize - inherited.fontSize) <= 1) delete b.fontSize;   // rounding of the shrink factor
      else if (b.fontSize != null) delete b.fit;          // its own size already includes it
    }
  }
  return deck;
}
