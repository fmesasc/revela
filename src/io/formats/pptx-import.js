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

import { zipDataURL } from '../files.js';
import { parseCommentText } from '../../features/collab/comments.js';
import { esc } from '../../core/text.js';
import { uid } from '../../core/model.js';
import { styled, masterStyles, newSlideBlocks } from '../../features/document/master.js';
import { customPalette, themeFontStacks } from '../../features/design/palettes.js';
import { JSZIP_ESM } from '../../core/vendor.js';
import { TRANSITION_DIRS, pathFromSVG, pushAnim, normalizeAnim } from '../../features/animation/transitions.js';
import { colorMods, modsOf } from '../../features/design/colormods.js';
import { officeStack } from '../../features/design/fonts.js';
import { hasAdjust } from '../../render/svg.js';

const CANVAS_W = 1280;            // slide width maps to this many px
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg' };
// Videos and sounds a browser plays (PowerPoint also takes .wmv, .avi, .wma…: those stay as their poster picture).
const PLAYABLE = /^(video\/(mp4|quicktime|webm)|audio\/(mpeg|mp4|wav|ogg))$/;

const parseXML = str => new DOMParser().parseFromString(str, 'application/xml');
const all = (el, name) => (el ? [...el.getElementsByTagName(name)] : []);
const kids = (el, name) => (el ? [...el.children].filter(c => c.tagName === name) : []);
const kid = (el, name) => kids(el, name)[0] || null;
const path = (el, ...names) => names.reduce((e, n) => kid(e, n), el);

async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  const mod = await import(JSZIP_ESM);
  return mod.default || mod;
}

// ---- Pictures ---------------------------------------------------------------
// The part of a picture left after cutting fractions [left, top, right, bottom],
// in its own format (JPEG stays JPEG); as it was if nothing is cut or it can't be read.
async function cropPicture(src, [l, t, r, b]) {
  if (l + t + r + b < 0.001 || l + r >= 1 || t + b >= 1 || /^data:image\/svg/.test(src)) return src;
  try {
    const img = new Image(); img.src = src; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight, x = Math.round(W * l), y = Math.round(H * t), w = Math.max(1, Math.round(W * (1 - l - r))), h = Math.max(1, Math.round(H * (1 - t - b)));
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
    return /^data:image\/jpe?g/.test(src) ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png');
  } catch { return src; }
}

// A picture recoloured in PowerPoint (Format ▸ Color ▸ Recolor): a:duotone paints its darks in the first colour and
// its lights in the second, by luminance, keeping its transparency (a green world map from a black one); a:grayscl,
// in greys. Done once here, on its pixels, so the editor, presenting and every export show it alike. (Not SVG pictures.)
async function recolorPicture(src, dark, light) {
  if (/^data:image\/svg/.test(src)) return src;
  try {
    const img = new Image(); img.src = src; await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight; if (!w || !h || w * h > 40e6) return src;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h), px = d.data, rgb = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = rgb(dark), B = rgb(light);
    for (let i = 0; i < px.length; i += 4) {
      const l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      px[i] = A[0] + (B[0] - A[0]) * l; px[i + 1] = A[1] + (B[1] - A[1]) * l; px[i + 2] = A[2] + (B[2] - A[2]) * l;
    }
    g.putImageData(d, 0, 0);
    return /^data:image\/jpe?g/.test(src) ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png');
  } catch { return src; }
}

// ---- Comments --------------------------------------------------------------
// Both PowerPoint formats: the classic one (ppt/comments/commentN.xml, authors in
// commentAuthors.xml) and the modern one of Microsoft 365 (modernComment_*.xml,
// with replies, "resolved" and the object it is about; authors in authors.xml).
// Revela's own conventions in the classic format (see pptx-export.js) come back
// as threads, tasks and resolved comments.
const byLocal = (el, name) => (el ? [...el.getElementsByTagNameNS('*', name)] : []);
async function readCommentAuthors(zip) {
  const names = new Map();
  for (const f of ['ppt/commentAuthors.xml', 'ppt/authors.xml']) {
    const x = await zip.file(f)?.async('string'); if (!x) continue;
    for (const a of [...byLocal(parseXML(x), 'cmAuthor'), ...byLocal(parseXML(x), 'author')]) names.set(a.getAttribute('id'), a.getAttribute('name') || '');
  }
  return names;
}
const cmText = el => {
  const t = [...el.children].find(c => c.localName === 'text'); if (t) return t.textContent.trim();
  const body = [...el.children].find(c => c.localName === 'txBody');
  return body ? byLocal(body, 'p').map(p => byLocal(p, 't').map(x => x.textContent).join('')).join('\n').trim() : '';
};
const when = el => { const v = Date.parse(el.getAttribute('dt') || el.getAttribute('created') || ''); return Number.isFinite(v) ? v : Date.now(); };
async function readComments(zip, srels, authors, spidOf) {
  const out = [];
  for (const r of Object.values(srels).filter(r => r.type === 'comments')) {
    const x = await zip.file(r.path)?.async('string'); if (!x) continue;
    for (const cm of byLocal(parseXML(x), 'cm')) {
      const p = parseCommentText(cmText(cm)), author = authors.get(cm.getAttribute('authorId')) || '', time = when(cm);
      if (p.reply && out.length) { out.at(-1).replies.push({ id: uid(), text: p.text, author, time }); continue; }
      const c = { id: uid(), author, time, blockId: null, replies: [], ...p, resolved: p.resolved || cm.getAttribute('status') === 'resolved' };
      delete c.reply;
      const sp = byLocal(cm, 'spMk')[0]?.getAttribute('id') || byLocal(cm, 'cNvPrMk')[0]?.getAttribute('id');   // (modern: the object it is about)
      if (sp && spidOf.has(sp)) c.blockId = spidOf.get(sp);
      for (const rp of byLocal(cm, 'reply')) c.replies.push({ id: uid(), text: cmText(rp), author: authors.get(rp.getAttribute('authorId')) || '', time: when(rp) });
      out.push(c);
    }
  }
  return out;
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
function resolve(base, rel) {           // base: folder of the part, e.g. "ppt/slides" ('' at the package's root)
  if (rel.startsWith('/')) return rel.slice(1);
  const parts = base ? base.split('/') : [];
  for (const seg of rel.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
  return parts.join('/');
}
const relsPath = p => p.replace(/([^/]+)$/, '_rels/$1.rels');
const dirOf = p => p.split('/').slice(0, -1).join('/');

// ---- Theme ------------------------------------------------------------------
// A theme part (ppt/theme/themeN.xml, one per master; a .thmx's own): its
// name, colour scheme, fonts (Latin, East Asian and complex scripts) and
// format scheme (the fills that p:bgRef / a:fillRef point to by number).
const SCHEME = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
// Names that go through the master's colour map (p:clrMap) and its overrides.
const MAPPED = ['bg1', 'tx1', 'bg2', 'tx2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
const DEFAULT_MAP = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2', ...Object.fromEntries(MAPPED.slice(4).map(k => [k, k])) };
const HEX6 = /^#[0-9a-f]{6}$/;
const OFFICE_SCHEME = { dk1: '#000000', lt1: '#ffffff', dk2: '#0e2841', lt2: '#e8e8e8', accent1: '#156082', accent2: '#e97132', accent3: '#196b24',
  accent4: '#0f9ed5', accent5: '#a02b93', accent6: '#4ea72e', hlink: '#467886', folHlink: '#96607d' };
async function readTheme(zip, file) {
  const doc = file && zip.file(file) ? parseXML(await zip.file(file).async('string')) : null;
  const scheme = { ...OFFICE_SCHEME }, cs = all(doc, 'a:clrScheme')[0];
  for (const c of cs ? [...cs.children] : []) {
    const name = c.localName, el = c.children[0]; if (!SCHEME.includes(name) || !el) continue;
    const v = (el.localName === 'sysClr' ? el.getAttribute('lastClr') || (el.getAttribute('val') === 'window' ? 'ffffff' : '000000') : el.getAttribute('val') || '').toLowerCase();
    if (/^[0-9a-f]{6}$/.test(v)) scheme[name] = colorMods('#' + v, modsOf(el));
  }
  const fs = all(doc, 'a:fontScheme')[0];
  const face = (k, s) => all(all(fs, k)[0], s)[0]?.getAttribute('typeface') || '';
  const fmt = all(doc, 'a:fmtScheme')[0];
  return { file, doc, name: doc?.documentElement?.getAttribute('name') || '', colorsName: cs?.getAttribute('name') || '', fontsName: fs?.getAttribute('name') || '',
    scheme, major: face('a:majorFont', 'a:latin'), minor: face('a:minorFont', 'a:latin'),
    majorEa: face('a:majorFont', 'a:ea'), minorEa: face('a:minorFont', 'a:ea'), majorCs: face('a:majorFont', 'a:cs'), minorCs: face('a:minorFont', 'a:cs'),
    fills: [...(all(fmt, 'a:fillStyleLst')[0]?.children || [])], bgFills: [...(all(fmt, 'a:bgFillStyleLst')[0]?.children || [])],
    lns: [...(all(fmt, 'a:lnStyleLst')[0]?.children || [])],
    rels: file ? rels(await zip.file(relsPath(file))?.async('string'), dirOf(file)) : {} };
}
// A colour map (p:clrMap, or a layout's or slide's p:clrMapOvr) over another.
function clrMapOf(el, base = DEFAULT_MAP) {
  if (!el) return base;
  const ov = el.localName === 'clrMapOvr' ? kid(el, 'a:overrideClrMapping') : el;
  if (!ov) return base;                                   // (a:masterClrMapping: the master's)
  const out = { ...base };
  for (const k of MAPPED) { const v = ov.getAttribute(k); if (v && SCHEME.includes(v)) out[k] = v; }
  return out;
}

// ---- Colours ---------------------------------------------------------------
// `theme` holds the colours for the part being read: the scheme's slots and
// the mapped names (bg1, tx1…) as its colour map says; _role tells the
// deck's palette role of a name, so that a colour made from one ("Accent 1,
// darker 25 %") is remembered as such (in _links) and follows a later change
// of palette.
const PRESET_COLOURS = { black: '#000000', white: '#ffffff', red: '#ff0000', blue: '#0000ff', green: '#008000', yellow: '#ffff00', gray: '#808080', grey: '#808080',
  darkGray: '#a9a9a9', lightGray: '#d3d3d3', orange: '#ffa500', purple: '#800080', navy: '#000080', silver: '#c0c0c0', maroon: '#800000', teal: '#008080' };
const toSRGB = x => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
function colourInfo(el, theme) {
  if (!el) return null;
  for (const c of el.children) {
    const n = c.localName, m = modsOf(c), v = c.getAttribute('val');
    if (n === 'srgbClr') return /^[0-9a-f]{6}$/i.test(v || '') ? { hex: '#' + v.toLowerCase(), mods: m } : null;
    if (n === 'schemeClr') {
      if (v === 'phClr') return theme._ph ? { ...theme._ph, mods: [...theme._ph.mods, ...m] } : null;
      return theme[v] ? { hex: theme[v], role: theme._role?.(v), mods: m } : null;
    }
    if (n === 'sysClr') { const h = (c.getAttribute('lastClr') || (v === 'window' ? 'ffffff' : '000000')).toLowerCase(); return /^[0-9a-f]{6}$/.test(h) ? { hex: '#' + h, mods: m } : null; }
    if (n === 'prstClr') return PRESET_COLOURS[v] ? { hex: PRESET_COLOURS[v], mods: m } : null;
    if (n === 'scrgbClr') return { hex: '#' + ['r', 'g', 'b'].map(k => Math.round(255 * Math.max(0, Math.min(1, toSRGB(+(c.getAttribute(k) || 0) / 100000)))).toString(16).padStart(2, '0')).join(''), mods: m };
    if (n === 'hslClr') return { hex: colorMods('#808080', [['hue', c.getAttribute('hue') || 0], ['sat', c.getAttribute('sat') || 0], ['lum', c.getAttribute('lum') || 0]]), mods: m };
  }
  return null;
}
// Colour of a fill-like element (a:solidFill, or the element holding a colour):
// '#rrggbb', '#rrggbbaa', 'none' (fully transparent) or null (none there).
function colourOf(el, theme) {
  const c = colourInfo(el, theme); if (!c) return null;
  const out = colorMods(c.hex, c.mods);
  if (c.role && c.mods.length && HEX6.test(out) && theme._links && !(out in theme._links)) theme._links[out] = [c.role, c.mods];
  return out;
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
  const gf = el && (el.localName === 'gradFill' ? el : kid(el, 'a:gradFill')); if (!gf) return null;
  const stops = all(gf, 'a:gs').map(gs => ({ pos: +(gs.getAttribute('pos') || 0) / 1000, c: colourOf(gs, theme) })).filter(x => x.c && x.c !== 'none')
    .sort((a, b) => a.pos - b.pos);
  if (stops.length < 2) return null;
  const list = stops.map(x => `${x.c} ${Math.round(x.pos)}%`).join(', ');
  const shape = kid(gf, 'a:path')?.getAttribute('path');
  if (shape === 'circle' || shape === 'shape') return `radial-gradient(circle, ${list})`;
  const ang = kid(gf, 'a:lin')?.getAttribute('ang');
  const deg = ang != null ? Math.round(+ang / 60000 + 90) % 360 : 180;     // OOXML 0° = left→right; CSS 90deg
  return `linear-gradient(${deg}deg, ${list})`;
}
// A reference to the theme's format scheme (p:bgRef, a:fillRef, a:lnRef): the
// fill in that place (1–999 the fills, 1001… the background fills; 0 none),
// drawn in the reference's colour (phClr) → { css, colour, blip } or null.
function themeFill(ref, theme, list = null) {
  const idx = +(ref?.getAttribute('idx') || 0), th = theme._th; if (!idx || !th) return null;
  const el = list ? list[idx - 1] : idx >= 1001 ? th.bgFills[idx - 1001] : th.fills[idx - 1];
  if (!el) return null;
  theme._ph = colourInfo(ref, theme);
  try {
    const fill = el.localName === 'ln' ? kid(el, 'a:solidFill') || kid(el, 'a:gradFill') || kid(el, 'a:noFill') : el;
    if (!fill) return null;
    if (fill.localName === 'noFill') return { css: 'none', colour: 'none' };
    if (fill.localName === 'solidFill') { const c = colourOf(fill, theme); return c ? { css: c, colour: c } : null; }
    if (fill.localName === 'gradFill') { const first = colourOf(all(fill, 'a:gs')[0], theme); return { css: gradientCSS(fill, theme) || first, colour: first }; }
    if (fill.localName === 'blipFill') return { blip: all(fill, 'a:blip')[0]?.getAttribute('r:embed'), colour: theme._ph ? colorMods(theme._ph.hex, theme._ph.mods) : null };
    return null;
  } finally { theme._ph = null; }
}
const TRANSITION = { fade: 'fade', dissolve: 'blur', push: 'push', cover: 'cover', pull: 'page', wipe: 'wipe', split: 'split', zoom: 'zoom', circle: 'circle', diamond: 'diamond', plus: 'diamond',
  newsflash: 'swirl', flip: 'flip', cube: 'cube', box: 'cube', rotate: 'flip', gallery: 'gallery', conveyor: 'slide', switch: 'flip',
  // (Doors and Window open from the middle, as Split; Fly Through comes from far, as Zoom.)
  doors: 'split', window: 'split', flythrough: 'zoom', vortex: 'zoom', ripple: 'rise', morph: 'fade', random: 'slide', randomBar: 'wipe', wheel: 'wipe' };
// PowerPoint's transition speeds (p:transition spd) in ms, when there is no exact duration (p14:dur).
const SPD_MS = { fast: 500, med: 750, slow: 1000 };

// Outer shadow (a:effectLst/a:outerShdw) → { x, y, blur, color }.
function shadowOf(spPr, theme, scale) {
  // (A glow — a soft halo of a colour all around — as a shadow that doesn't move.)
  const glow = all(kid(spPr, 'a:effectLst'), 'a:glow')[0];
  if (glow && !all(kid(spPr, 'a:effectLst'), 'a:outerShdw')[0]) {
    const c = colourOf(glow, theme); if (!c || c === 'none') return null;
    return { x: 0, y: 0, blur: Math.round(+(glow.getAttribute('rad') || 0) * scale), color: c.length === 7 ? c + '66' : c };
  }
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
  trapezoid: 'trapezoid', chevron: 'chevron', plus: 'plus', line: 'line', straightConnector1: 'line',
  round2SameRect: 'rounded', flowChartProcess: 'rect', flowChartAlternateProcess: 'rounded', flowChartDecision: 'diamond',
  homePlate: 'homeplate', rtTriangle: 'rtriangle', octagon: 'octagon', heptagon: 'heptagon', decagon: 'decagon', frame: 'frame', donut: 'donut',
  heart: 'heart', cloud: 'cloud', moon: 'moon', lightningBolt: 'lightning', teardrop: 'teardrop', can: 'cylinder', flowChartMagneticDisk: 'cylinder',
  upArrow: 'uparrow', downArrow: 'downarrow', leftRightArrow: 'leftrightarrow', upDownArrow: 'updownarrow', quadArrow: 'quadarrow',
  notchedRightArrow: 'notchedarrow', star4: 'star4', star6: 'star6', star8: 'star8', star12: 'seal', irregularSeal1: 'burst', irregularSeal2: 'burst',
  wedgeRectCallout: 'speech', wedgeRoundRectCallout: 'speech', wedgeEllipseCallout: 'speechround', cloudCallout: 'thought',
  pie: 'pie', chord: 'chord', blockArc: 'blockarc', cube: 'cube', foldedCorner: 'foldedcorner', smileyFace: 'smiley', sun: 'sun', noSmoking: 'nosymbol',
  ribbon: 'ribbon', ribbon2: 'ribbon', wave: 'wave', doubleWave: 'wave', arc: 'arc', leftBracket: 'leftbracket', rightBracket: 'rightbracket', leftBrace: 'leftbrace', rightBrace: 'rightbrace',
  flowChartTerminator: 'terminator', flowChartDocument: 'document', flowChartManualInput: 'manualinput', flowChartOffpageConnector: 'offpage',
  flowChartMerge: 'merge', flowChartDelay: 'delay', flowChartInputOutput: 'parallelogram', mathPlus: 'plus', mathMinus: 'minus',
  mathMultiply: 'multiply', mathDivide: 'divide', mathEqual: 'equal', snip1Rect: 'snip',
  actionButtonForwardNext: 'actnext', actionButtonBackPrevious: 'actprev', actionButtonBeginning: 'actfirst', actionButtonEnd: 'actlast', actionButtonHome: 'acthome' };

// A preset shape's adjustments (a:avLst), in PowerPoint's units; null where the file leaves PowerPoint's default
// (render/svg.js draws block arrows, pentagons and chevrons with them, as PowerPoint does).
const adjustOf = (spPr, names) => {
  const gd = all(kid(spPr, 'a:prstGeom'), 'a:gd');
  return names.map(n => { const f = gd.find(g => g.getAttribute('name') === n)?.getAttribute('fmla'), v = f ? +f.replace(/^val /, '') : NaN; return Number.isFinite(v) ? v : null; });
};

// Where a preset shape keeps its text (presetShapeDefinitions' text rectangle), as fractions of its box [left, top,
// right, bottom]: an ellipse or a cloud write inside the curve, not edge to edge — «Agent autonomy» went on one line where
// PowerPoint wraps it in two. null: the whole box (the rest).
function textRectOf(prst, geo, spPr) {
  const e = 0.14645, cloud = [2977 / 21600, 3262 / 21600, 17087 / 21600, 17337 / 21600];
  const R = { ellipse: [e, e, 1 - e, 1 - e], wedgeEllipseCallout: [e, e, 1 - e, 1 - e], flowChartConnector: [e, e, 1 - e, 1 - e],
    diamond: [0.25, 0.25, 0.75, 0.75], flowChartDecision: [0.25, 0.25, 0.75, 0.75], cloudCallout: cloud, cloud };
  if (R[prst]) return R[prst];
  if (prst === 'roundRect' && geo?.w > 0 && geo?.h > 0) {
    const f = all(kid(spPr, 'a:prstGeom'), 'a:gd').find(g => g.getAttribute('name') === 'adj')?.getAttribute('fmla'), a = f ? +f.replace(/^val /, '') : 16667;
    const d = Math.min(geo.w, geo.h) * Math.min(50000, Math.max(0, a)) / 100000 * 0.29289;
    return [d / geo.w, d / geo.h, 1 - d / geo.w, 1 - d / geo.h];
  }
  return null;
}
// The same box narrowed to that rectangle, turned and flipped with the shape (around the shape's own centre).
function textGeo(geo, r) {
  if (!r || !geo) return geo;
  const w = geo.w * (r[2] - r[0]), h = geo.h * (r[3] - r[1]);
  let dx = geo.w * ((r[0] + r[2]) / 2 - 0.5), dy = geo.h * ((r[1] + r[3]) / 2 - 0.5);
  if (geo.flipH) dx = -dx; if (geo.flipV) dy = -dy;
  const a = (geo.rot || 0) * Math.PI / 180, cx = geo.x + geo.w / 2 + dx * Math.cos(a) - dy * Math.sin(a), cy = geo.y + geo.h / 2 + dx * Math.sin(a) + dy * Math.cos(a);
  return { ...geo, x: cx - w / 2, y: cy - h / 2, w, h };
}
// An elbow or curved connector's route in its box (0–100 each way, before flips), from PowerPoint's own definitions
// (presetShapeDefinitions: bentConnector2–5, curvedConnector2–5, with their adjustments); null for anything else, or a
// box with no width or height (a straight line then).
function connectorRoute(prst, geo, spPr) {
  const m = /^(bent|curved)Connector([2-5])$/.exec(prst || ''); if (!m || !(geo?.w > 0 && geo?.h > 0)) return null;
  const gd = all(kid(spPr, 'a:prstGeom'), 'a:gd'), adj = (n, d = 50000) => { const f = gd.find(g => g.getAttribute('name') === n)?.getAttribute('fmla'); const v = f ? +f.replace(/^val /, '') : NaN; return (Number.isFinite(v) ? v : d) / 1000; };
  const n = +m[2], a1 = adj('adj1'), a2 = adj('adj2'), a3 = adj('adj3');
  if (m[1] === 'bent') {
    if (n === 2) return [['M', 0, 0], ['L', 100, 0], ['L', 100, 100]];
    if (n === 3) return [['M', 0, 0], ['L', a1, 0], ['L', a1, 100], ['L', 100, 100]];
    if (n === 4) return [['M', 0, 0], ['L', a1, 0], ['L', a1, a2], ['L', 100, a2], ['L', 100, 100]];
    return [['M', 0, 0], ['L', a1, 0], ['L', a1, a2], ['L', a3, a2], ['L', a3, 100], ['L', 100, 100]];
  }
  if (n === 2) return [['M', 0, 0], ['C', 50, 0, 100, 50, 100, 100]];
  if (n === 3 || n === 5) { const x1 = a1 / 2, x3 = (100 + a1) / 2; return [['M', 0, 0], ['C', x1, 0, a1, 25, a1, 50], ['C', a1, 75, x3, 100, 100, 100]]; }
  const x1 = a1 / 2, x3 = (100 + a1) / 2, x4 = (a1 + x3) / 2, x5 = (x3 + 100) / 2, y1 = a2 / 2, y2 = y1 / 2, y3 = (y1 + a2) / 2, y5 = (100 + a2) / 2;
  return [['M', 0, 0], ['C', x1, 0, a1, y2, a1, y1], ['C', a1, y3, x4, a2, x3, a2], ['C', x5, a2, 100, y5, 100, 100]];
}

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
    font: /^\+mj-/.test(face || '') ? fonts.major || undefined : /^\+mn-/.test(face || '') ? fonts.minor || undefined : (face || undefined),
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
    shrink: fit ? true : undefined,
    noWrap: at('wrap') === 'none' || undefined,         // («Do not wrap text»: one line each, as wide as they need)                       // («Shrink text on overflow»: ui/canvas/fittext.js fitImported measures it)
    vert: at('vert') && at('vert') !== 'horz' ? at('vert') : undefined,
  };
}

const cssFont = f => `'${String(f).replace(/['"<>;\\{}]/g, '')}'`;           // (a font name can't break out of the style)
// A font's CSS stack: an Office font with its web equivalent (fonts.js), others as they are.
const fontStack = f => officeStack(f) || `${cssFont(f)}, sans-serif`;
// Paragraphs → HTML with the resolved formatting. Sizes are in px; the box
// gets the first paragraph's size, family and colour, and runs only say where
// they differ.
// PowerPoint's single line spacing is the font's own (its ascent, descent and line gap): Arial 1.15, Calibri 1.22…; 1.2 —
// what HTML uses — for the rest. With 1.2 for every font, Arial text stood lower and taller than in PowerPoint, and a
// full box (a title slide's names and date) ran out at the bottom.
const LINE_OF = { arial: 1.15, 'arial narrow': 1.15, helvetica: 1.15, 'liberation sans': 1.15, 'times new roman': 1.15, calibri: 1.22, 'calibri light': 1.22,
  cambria: 1.17, georgia: 1.14, verdana: 1.22, tahoma: 1.21, 'segoe ui': 1.33, 'trebuchet ms': 1.16, 'century gothic': 1.23 };
const lineOf = f => LINE_OF[String(f || '').toLowerCase().replace(/['"]/g, '').split(',')[0].trim()] || 1.2;
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
    // Lines of different sizes in one paragraph (a big title, a line break, a smaller subtitle): PowerPoint makes each
    // line as tall as its own letters. In HTML every line is at least as tall as the paragraph's own size: so the
    // paragraph takes the smallest, and each run its own (else the small lines stood apart, more with a big spacing).
    const sizeOf = r => ctx.pt((merge(base, readRun(kid(r, 'a:rPr'), ctx.theme, ctx.fonts)).sz || 18) * fs);
    const textRuns = [...p.children].filter(r => (r.tagName === 'a:r' || r.tagName === 'a:fld') && kid(r, 'a:t')?.textContent);
    const sizes = textRuns.map(sizeOf), mixed = new Set(sizes).size > 1 && [...p.children].some(r => r.tagName === 'a:br'), least = Math.min(...sizes);
    let lineStart = true, lastText = '', paraInk, paraFont;   // (a run's first space kept only where HTML would drop it: see below)
    for (const r of [...p.children]) {
      if (r.tagName === 'a:br') { runs.push('<br>'); lineStart = true; continue; }
      if (r.tagName !== 'a:r' && r.tagName !== 'a:fld') continue;
      let txt = kid(r, 'a:t')?.textContent || ''; if (!txt) continue;
      if (r.tagName === 'a:fld' && /slidenum/i.test(r.getAttribute('type') || '')) txt = String(ctx.slideNo);
      const rp = merge(base, readRun(kid(r, 'a:rPr'), ctx.theme, ctx.fonts));
      const size = ctx.pt((rp.sz || 18) * fs);
      paraSize ??= size; if (paraInk === undefined) { paraInk = rp.color || null; paraFont = rp.font; }
      if (!first) first = boxBase || { size, font: rp.font, color: rp.color };
      const css = [];
      if (mixed ? size !== least : size !== first.size) css.push(`font-size:${size}px`);
      if (rp.color && rp.color !== first.color) css.push(`color:${rp.color}`);   // the box carries the first colour
      if (rp.font && rp.font !== first.font) css.push(`font-family:${fontStack(rp.font)}`);
      if (rp.cap === 'all') css.push('text-transform:uppercase'); else if (rp.cap === 'small') css.push('font-variant:small-caps');
      if (rp.spc) css.push(`letter-spacing:${ctx.pt(rp.spc)}px`);
      if (rp.highlight) css.push(`background:${rp.highlight}`);
      if (rp.baseline) css.push(`vertical-align:${rp.baseline > 0 ? 'super' : 'sub'};font-size:${Math.round(size * 0.65)}px`);
      // Consecutive spaces align text in PowerPoint; HTML would collapse them. A run's first space becomes a no-break one
      // only at the start of a line or after another space (where HTML would drop it): between words («Computational» +
      // « Model») it must stay a normal space — as a no-break one the two words were one, and the box broke it «Mo|del».
      const keep = lineStart || /\s$/.test(lastText); lineStart = false; lastText = txt;
      let h = esc(txt).replace(/ {2,}/g, m => ' \u00a0'.repeat(Math.ceil(m.length / 2)).slice(0, m.length)).replace(/^ /, keep ? '\u00a0' : ' ');
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
    if (mixed) paraSize = least;
    paraSize ??= ctx.pt((endR.sz || 18) * fs);
    align ??= ALIGN[pp.algn] || null;
    // Paragraph box: margins, first-line indent, spacing and line height.
    // (PowerPoint's «shrink text on overflow» also tightens the lines — lnSpcReduction — when the paragraph has no spacing
    // of its own: single, 1.2, made smaller. Before, only an explicit spacing was: the title slide's names ran out of
    // their box.)
    const k = lineOf(paraFont || base.font || boxBase?.font || ctx.fonts?.minor);
    const lineH = pp.lnSpc?.pct != null ? +(k * pp.lnSpc.pct * (1 - lnRed)).toFixed(3)
      : pp.lnSpc?.pt != null ? `${ctx.pt(pp.lnSpc.pt * fs * (1 - lnRed))}px` : lnRed || k !== 1.2 ? +(k * (1 - lnRed)).toFixed(3) : null;
    const gap = sp => (sp?.pt != null ? ctx.pt(sp.pt) : sp?.pct != null ? Math.round(paraSize * k * sp.pct) : 0);
    const marL = ctx.emu(pp.marL || 0), indent = ctx.emu(pp.indent || 0);
    const pcss = [];
    if (lineH != null) pcss.push(`line-height:${lineH}`);
    // (Not before a box's first paragraph: PowerPoint starts its text at the top inset — with it, a date pushed 13 px
    // down ran out of its box.)
    if (gap(pp.spcBef) && out.length) pcss.push(`margin-top:${gap(pp.spcBef)}px`);
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
        : `list-style-type:'${(pp.bullet?.char || '•').replace(/['"<>;\\{}]/g, '')}  '`;
      // The text starts at marL; the bullet hangs in the first-line indent.
      pcss.push(marker, 'list-style-position:outside', `margin-left:${Math.max(0, marL)}px`);
      // (A bullet of its own colour: the item carries it, and its words keep theirs — before, they took the bullet's.)
      const ink = pp.buColor && (paraInk || first?.color);
      if (pp.buColor) pcss.push(`color:${pp.buColor}`);
      out.push(`<li style="${pcss.join(';')}">${ink && ink !== pp.buColor ? `<span style="color:${ink}">${html}</span>` : html}</li>`);
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

// ---- Media ------------------------------------------------------------------
// Every picture, video and sound of the package is read once, however many slides, layouts or backgrounds use it: one
// text (data: URL) shared by all of them. (A picture background repeated on every slide was read again for each one;
// with 400 MB of media, copies are what brings a tab down.) A file too big to become one text in the browser (a
// string holds some 512 million characters at most: about 380 MB of bytes) is left out, and said (notes) — before,
// the whole import failed with «Invalid string length». Very big ones that are kept are said too.
export const MEDIA_MAX = 350e6, MEDIA_BIG = 50e6;
const readers = new WeakMap();                         // zip → its reader (importPPTX sets it)
// (JSZip knows a file's size before reading it.)
const sizeInZip = f => +(f?._data?.uncompressedSize || 0);
function mediaReader(zip, notes, progress, max = MEDIA_MAX, big = MEDIA_BIG) {
  const done = new Map();
  return (path, mime) => {
    if (!done.has(path)) {
      const f = zip.file(path), bytes = sizeInZip(f), name = path.split('/').pop();
      if (!f) done.set(path, Promise.resolve(null));
      else if (bytes > max) { notes.push({ kind: 'tooBig', name, bytes }); done.set(path, Promise.resolve(null)); }
      else {
        if (bytes > big) { notes.push({ kind: 'big', name, bytes }); progress?.({ file: name, bytes }); }
        done.set(path, zipDataURL(f, mime).catch(() => { notes.push({ kind: 'unread', name, bytes }); return null; }));
      }
    }
    return done.get(path);
  };
}
const readMedia = (zip, path, mime) => (readers.get(zip) || ((p, m) => (zip.file(p) ? zipDataURL(zip.file(p), m) : Promise.resolve(null))))(path, mime);

// ---- Parts: layout and master (placeholders, decorations, background) ------
// A picture of the package as a CSS background (stretched, or tiled).
async function pictureBg(zip, t, tile) {
  if (!t || !zip.file(t.path)) return null;
  const ext = t.path.split('.').pop().toLowerCase(), u = await readMedia(zip, t.path, MIME[ext] || 'image/png');
  return u ? `url(${u}) ${tile ? 'repeat' : 'center/cover no-repeat'}` : null;
}
// The background of a slide, layout or master (p:cSld/p:bg): its own fill
// (colour, gradient, picture) or a theme background style (p:bgRef) → CSS or null.
async function backgroundOf(zip, doc, theme, partRels) {
  const bg = kid(kid(doc.documentElement, 'p:cSld'), 'p:bg'); if (!bg) return null;
  const bgPr = kid(bg, 'p:bgPr'), bgRef = kid(bg, 'p:bgRef');
  if (bgPr) {
    const bf = kid(bgPr, 'a:blipFill'), blip = all(bf, 'a:blip')[0];
    if (blip) { const u = await pictureBg(zip, partRels[blip.getAttribute('r:embed')], !!kid(bf, 'a:tile')); if (u) return u; }
    const c = gradientCSS(bgPr, theme) || fillOf(bgPr, theme);
    return c && c !== 'none' ? c : null;
  }
  if (bgRef) {
    const f = themeFill(bgRef, theme);
    if (f?.blip) return (await pictureBg(zip, theme._th?.rels[f.blip], false)) || f.colour;
    const c = f?.css || colourOf(bgRef, theme);
    return c && c !== 'none' ? c : null;
  }
  return null;
}
async function partInfo(zip, file, doc, r, theme, fonts) {
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
  const bg = await backgroundOf(zip, doc, theme, r);
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
// A video's or a sound's own steps (PowerPoint's «mediacall»: play, pause, stop).
const MEDIA_CALL = { 1: 'media-play', 2: 'media-pause', 3: 'media-stop' };
// groupOf: a group's shape id → its objects' (Revela flattens groups): an effect on the group plays on all of them at
// once — before, it was lost, and with it its click (the next effects joined the click before).
// partsOf: a shape that became more than one block (its outline and its text) → all of them: an effect on the shape
// plays on both, as in PowerPoint — before, only its text moved and the arrow or circle was there from the start.
// (By paragraphs, p:txEl, only the text.)
function readAnimations(doc, spidOf, blocks, size, groupOf = new Map(), partsOf = new Map()) {
  const main = all(doc, 'p:cTn').find(c => c.getAttribute('nodeType') === 'mainSeq');
  if (!main) return;
  let order = 0, carry = false;           // (carry: an effect left out started a click; the next one starts it)
  for (const c of all(main, 'p:cTn').filter(x => x.getAttribute('presetClass'))) {
    const tgt = all(c, 'p:spTgt')[0], spid = tgt?.getAttribute('spid'), whole = !(tgt && all(tgt, 'p:txEl').length);
    const ids = whole && partsOf.has(spid) ? partsOf.get(spid) : spidOf.has(spid) ? [spidOf.get(spid)] : groupOf.get(spid) || [];
    const targets = ids.map(id => blocks.find(x => x.id === id)).filter(Boolean)
      .filter((t, k, list) => c.getAttribute('presetClass') !== 'mediacall' || list.length < 2 || ['video', 'audio'].includes(t.type));   // (play/pause: the video itself)
    const b = targets[0];
    if (!b) { if (c.getAttribute('nodeType') === 'clickEffect') carry = true; continue; }
    const cls = c.getAttribute('presetClass'), preset = +c.getAttribute('presetID'), sub = +(c.getAttribute('presetSubtype') || 0);
    const inner = all(c, 'p:cTn').map(x => +x.getAttribute('dur')).filter(d => d > 1);
    // (Appear has no duration of its own — only a «set» of 1 ms —: it is instant, not half a second of fading.)
    const dur = inner.length ? Math.max(...inner) : cls === 'entr' && preset === 1 ? 0 : 500;
    const delay = +(all(kid(c, 'p:stCondLst'), 'p:cond')[0]?.getAttribute('delay')) || 0;
    let start = { withEffect: 'withPrev', afterEffect: 'afterPrev' }[c.getAttribute('nodeType')] || 'click';
    let effect = 'fade-in', extra = {};
    const skip = () => { if (start === 'click') carry = true; };
    const has = tag => all(c, tag).length > 0;
    if (cls === 'mediacall') { if (!MEDIA_CALL[preset] || !['video', 'audio'].includes(b.type)) { skip(); continue; } effect = MEDIA_CALL[preset]; }
    else if (cls === 'exit') effect = 'fade-out';
    else if (cls === 'emph' && preset === 26) effect = 'pulse';         // PowerPoint's Pulse
    else if (cls === 'emph' && preset === 32) effect = 'teeter';        // and Teeter
    else if (cls === 'emph' && (preset === 8 || has('p:animRot'))) effect = 'spin360';
    // Grow/Shrink scales the object (p:animScale); the other emphases change a colour, the weight of the letters
    // (Bold Reveal) or the like and leave it where and as big as it was: before, all of them grew it by 130 % on the
    // click. Now those are a brief glow on the object — it keeps the click, and the slide doesn't jump.
    else if (cls === 'emph' && has('p:animScale')) effect = +(all(c, 'p:by')[0]?.getAttribute('x') || 125000) >= 100000 ? 'grow' : 'shrink';
    else if (cls === 'emph') effect = 'color-pulse';
    else if (cls === 'path') {
      effect = 'path'; extra = pathFromSVG(all(c, 'p:animMotion')[0]?.getAttribute('path') || '', size);
    } else if (preset === 2) effect = FLY[sub] || 'fade-up';
    else if (preset === 42 || preset === 47) {                  // float in: its start offset gives the direction
      const v = all(c, 'p:strVal').map(x => x.getAttribute('val')).find(x => /#ppt_[xy][+-]/.test(x || '')) || '#ppt_y+';
      effect = /ppt_y\+/.test(v) ? 'fade-up' : /ppt_y-/.test(v) ? 'fade-down' : /ppt_x\+/.test(v) ? 'fade-left' : 'fade-right';
    }
    else if (preset === 53 || preset === 23) effect = 'zoom-in';
    else if (preset === 31) effect = 'spin';                    // Grow & Turn
    else if (cls !== 'entr') { skip(); continue; }
    if (effect === 'grow' || effect === 'shrink') { const k = Math.round(+(all(c, 'p:by')[0]?.getAttribute('x') || 0) / 1000); if (k >= 5 && k <= 500) extra.size = k; }
    if (carry) { start = 'click'; carry = false; }
    // (On a group: the first of its objects as PowerPoint says, the others with it.)
    targets.forEach((t, k) => pushAnim(t, { effect, order: ++order, seq: order, start: k ? 'withPrev' : start, duration: dur, delay, ...structuredClone(extra) }));
  }
  // The clicks: «with previous» and «after previous» play within the click of the one before (PowerPoint's
  // timeline), not each on a click of its own — a slide whose 53 effects need 9 clicks needed 53.
  normalizeAnim({ blocks });
}

// ---- Import ----------------------------------------------------------------
const EMPTY_SLIDE = '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree/></p:cSld></p:sld>';
// The theme as Revela keeps it (deck.officeTheme; see features/design/officetheme.js):
// its name, its colours as a palette (background and text as the master's
// colour map says) and its heading and body fonts.
function themeRecord(th, map, extra = {}) {
  const name = (extra.name || th.name || th.colorsName || 'Office').trim().slice(0, 60);
  const colors = customPalette({ name: (extra.name || th.colorsName || name).slice(0, 60), bg: extra.bg || th.scheme[map.bg1], fg: extra.fg || th.scheme[map.tx1],
    accents: [1, 2, 3, 4, 5, 6].map(i => th.scheme[map['accent' + i]]), scheme: th.scheme, clrMap: map });
  const fonts = { name: (extra.name || th.fontsName || name).slice(0, 60), major: extra.major || th.major, minor: extra.minor || th.minor,
    ...Object.fromEntries(['majorEa', 'minorEa', 'majorCs', 'minorCs'].filter(k => th[k]).map(k => [k, th[k]])) };
  return { name, colors, ...((fonts.major || fonts.minor) && { fonts }) };
}
// LibreOffice writes a generic theme ("Office Theme", Arial) and puts the real
// fonts and colours on the master's placeholders: those, and the template's name.
async function libreOfficeTheme(zip, master) {
  const app = await zip.file('docProps/app.xml')?.async('string') || '';
  if (!/<Application>[^<]*LibreOffice/i.test(app) || !master) return {};
  const ph = t => all(master.doc, 'p:sp').find(sp => { const p = phOf(sp); return p && (t === 'title' ? TITLE_PH(p.type) : BODY_PH(p.type)); });
  const face = sp => all(sp, 'a:latin')[0]?.getAttribute('typeface') || '';
  const col = sp => { const c = colourOf(all(kid(sp, 'p:txBody'), 'a:solidFill')[0], {}); return c && HEX6.test(c) ? c : null; };
  const tpl = /<Template>([^<]+)<\/Template>/.exec(app)?.[1]?.trim();
  const out = { major: face(ph('title')), minor: face(ph('body')), fg: col(ph('body')) || col(ph('title')) };
  if (tpl) out.name = tpl.replace(/_/g, ' ');
  if (HEX6.test(master.bg || '')) out.bg = master.bg;
  // (Text that wouldn't read on the background is a band's, not the body's.)
  const lum = h => colorMods(h, [['gray', 0]]).slice(1, 3), far = (a, b) => Math.abs(parseInt(lum(a), 16) - parseInt(lum(b), 16)) > 90;
  if (out.fg && !far(out.fg, out.bg || '#ffffff')) delete out.fg;
  return def(out);
}

// A theme file (.thmx) with no presentation in it: its colours and fonts.
async function themeOnlyPackage(zip, main, file) {
  const tp = (main && zip.file(main) && /theme/i.test(main) && main) || Object.keys(zip.files).find(f => /theme\d*\.xml$/i.test(f) && !/_rels/.test(f));
  if (!tp) throw new Error('No se encontraron diapositivas en el archivo.');
  const th = await readTheme(zip, tp);
  const officeTheme = themeRecord(th, DEFAULT_MAP);
  return { officeTheme, name: (file.name || '').replace(/\.\w+$/, '') || officeTheme.name };
}

// .pptx, .potx (a template: maybe without slides) and .thmx (an Office theme).
// progress({ slide, of } | { file, bytes }): how far it is (a 400 MB presentation takes a while);
// notes: filled with what wasn't kept as it was ({ kind: 'tooBig' | 'unread' | 'format' | 'missing' | 'big', name, bytes });
// mediaMax, mediaBig: the sizes past which a file is left out or said to be big (MEDIA_MAX, MEDIA_BIG).
export async function importPPTX(file, { progress = null, notes: said = [], mediaMax = MEDIA_MAX, mediaBig = MEDIA_BIG } = {}) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(file);
  readers.set(zip, mediaReader(zip, said, progress, mediaMax, mediaBig));

  // The main part: the presentation (ppt/presentation.xml), or a theme file's theme.
  const pkgRels = rels(await zip.file('_rels/.rels')?.async('string'), '');
  const main = Object.values(pkgRels).find(r => r.type === 'officeDocument')?.path;
  const presFile = [main, 'ppt/presentation.xml', ...Object.keys(zip.files).filter(f => /(^|\/)presentation\.xml$/.test(f))]
    .find(f => f && /presentation\.xml$/.test(f) && zip.file(f));
  if (!presFile) return themeOnlyPackage(zip, main, file);
  const pres = parseXML(await zip.file(presFile).async('string'));
  const sldSz = all(pres, 'p:sldSz')[0];
  const cx = +(sldSz?.getAttribute('cx') || 12192000), cy = +(sldSz?.getAttribute('cy') || 6858000);
  const scale = CANVAS_W / cx;
  const size = { w: CANVAS_W, h: Math.round(cy * scale) };
  const presRels = rels(await zip.file(relsPath(presFile))?.async('string'), dirOf(presFile));
  const commentAuthors = await readCommentAuthors(zip);

  // Themes: each master has its own (Google Slides writes one per master).
  const themes = new Map();
  const themeFor = async masterFile => {
    const r = masterFile ? rels(await zip.file(relsPath(masterFile))?.async('string'), dirOf(masterFile)) : {};
    const p = [Object.values(r).find(x => x.type === 'theme')?.path, Object.values(presRels).find(x => x.type === 'theme')?.path,
      Object.keys(zip.files).find(f => /theme\/theme\d+\.xml$/.test(f))].find(x => x && zip.file(x)) || null;
    if (!themes.has(p)) themes.set(p, await readTheme(zip, p));
    return themes.get(p);
  };
  // `theme` and `fonts` are those of the part being read: its master's theme,
  // through its colour map (the master's, and a layout's or slide's override).
  const theme = { _links: {} }, fonts = { major: '', minor: '' };
  let palMap = DEFAULT_MAP;                 // (the colour map of the master the palette comes from)
  const use = (th, map) => {
    for (const k of Object.keys(theme)) if (k !== '_links') delete theme[k];
    Object.assign(theme, th.scheme);
    for (const k of MAPPED) theme[k] = th.scheme[map[k]];
    theme._th = th; theme._map = map;
    theme._role = v => { const slot = MAPPED.includes(v) ? map[v] : v;
      return slot === palMap.bg1 ? 'bg' : slot === palMap.tx1 ? 'fg' : /^accent[1-6]$/.test(slot) ? 'a' + (+slot.slice(6) - 1) : null; };
    fonts.major = th.major; fonts.minor = th.minor;
  };
  const cache = new Map();
  const info = async f => {
    if (cache.has(f)) return cache.get(f);
    const doc = parseXML(await zip.file(f).async('string'));
    const r = rels(await zip.file(relsPath(f))?.async('string'), dirOf(f));
    let th, map, master = null;
    if (doc.documentElement.localName === 'sldMaster') { th = await themeFor(f); map = clrMapOf(all(doc, 'p:clrMap')[0]); }
    else {
      const mp = Object.values(r).find(x => x.type === 'slideMaster')?.path;
      master = mp && zip.file(mp) ? await info(mp) : null;
      th = master?.th || await themeFor(null);
      map = clrMapOf(kid(doc.documentElement, 'p:clrMapOvr'), master?.map || DEFAULT_MAP);
    }
    use(th, map);
    const part = Object.assign(await partInfo(zip, f, doc, r, theme, fonts), { th, map });
    // A layout that changes the colour map (a light layout in a dark theme): the
    // master's text styles as seen from it (its "text" is another colour).
    if (master && JSON.stringify(map) !== JSON.stringify(master.map)) part.mview = await partInfo(zip, master.file, master.doc, master.rels, theme, fonts);
    cache.set(f, part);
    return part;
  };
  const relOf = async (part, type) => Object.values(rels(await zip.file(relsPath(part))?.async('string'), dirOf(part))).find(r => r.type === type)?.path;

  const order = all(pres, 'p:sldId').map(n => presRels[n.getAttribute('r:id')]?.path).filter(p => p && zip.file(p));
  const masterIds = all(pres, 'p:sldMasterId').map(n => presRels[n.getAttribute('r:id')]?.path).filter(p => p && zip.file(p));
  // The palette is the theme of the first slide's master (else the first master's).
  let palMaster = masterIds[0] || null;
  if (order[0]) { const lp = await relOf(order[0], 'slideLayout'); const mp = lp && zip.file(lp) && await relOf(lp, 'slideMaster'); if (mp && zip.file(mp)) palMaster = mp; }
  if (palMaster) palMap = clrMapOf(all(parseXML(await zip.file(palMaster).async('string')), 'p:clrMap')[0]);
  const palInfo = palMaster ? await info(palMaster) : null;
  const baseTheme = palInfo?.th || await themeFor(null);
  use(baseTheme, palInfo?.map || DEFAULT_MAP);

  const ctx = { theme, fonts, pt: pt => Math.round(pt * 12700 * scale), emu: v => Math.round(v * scale) };
  // Text boxes that aren't placeholders start from the presentation's default text style.
  const defaultText = readLevels(all(pres, 'p:defaultTextStyle')[0], theme, fonts);
  // Table styles (ppt/tableStyles.xml): borders, text, header and band colours.
  const tableStyles = {};
  const tsFile = zip.file(Object.values(presRels).find(r => r.type === 'tableStyles')?.path || 'ppt/tableStyles.xml');
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

  const decorOf = new Map(), usedLayouts = new Map();   // part file → its objects; layout path → { layout, master }

  const slides = [];
  // A slide (or, with `ghost`, an empty one on that layout: to read a layout no slide uses).
  const readSlide = async (slidePath, ghost = null) => {
    const doc = parseXML(ghost ? EMPTY_SLIDE : await zip.file(slidePath).async('string'));
    const srels = ghost ? { rIdLayout: { type: 'slideLayout', path: ghost } } : rels(await zip.file(relsPath(slidePath))?.async('string'), dirOf(slidePath));
    const layoutPath = Object.values(srels).find(r => r.type === 'slideLayout')?.path;
    const layout = layoutPath && zip.file(layoutPath) ? await info(layoutPath) : null;
    const master = layout?.parent && zip.file(layout.parent) ? await info(layout.parent) : null;
    const slideMap = clrMapOf(kid(doc.documentElement, 'p:clrMapOvr'), layout?.map || master?.map || DEFAULT_MAP);
    use(layout?.th || master?.th || baseTheme, slideMap);
    const mview = layout?.mview || master;      // (the master's styles in this layout's colours)

    const blocks = [];
    const slideNo = slides.length + 1;
    const links = Object.fromEntries(Object.entries(srels).filter(([, v]) => v.type === 'hyperlink').map(([k, v]) => [k, v.path]));
    let partRels = srels;
    const spidOf = new Map(), groupOf = new Map(), partsOf = new Map();
    let decorMode = false;       // walking a layout/master: only its own graphics, not its placeholders        // relationships of the part being walked (slide, layout or master)
    // (Each file read once: a picture used on many slides — a background, a logo — is the same text every time,
    // not one copy per slide: big presentations ran out of memory.)
    const media = rid => {
      const t = partRels[rid]; if (!t || !zip.file(t.path)) return Promise.resolve(null);
      return readMedia(zip, t.path, MIME[t.path.split('.').pop().toLowerCase()] || 'image/png');
    };
    // Walk the shape tree; groups map their children's coordinates.
    const walk = async (tree, map) => {
      for (const el of [...tree.children]) {
        const tag = el.tagName;
        if (tag === 'p:grpSp') {
          // (What the group became, for its animations: groupOf.)
          const before = blocks.length, gid = kid(kid(el, 'p:nvGrpSpPr'), 'p:cNvPr')?.getAttribute('id');
          const done = () => { if (gid && !decorMode && blocks.length > before) groupOf.set(gid, blocks.slice(before).map(b => b.id)); };
          const gx = all(kid(el, 'p:grpSpPr'), 'a:xfrm')[0];
          if (!gx) { await walk(el, map); done(); continue; }
          const g = (n, a) => +kid(gx, n)?.getAttribute(a) || 0;
          const off = [g('a:off', 'x'), g('a:off', 'y')], ext = [g('a:ext', 'cx'), g('a:ext', 'cy')];
          const cOff = [g('a:chOff', 'x'), g('a:chOff', 'y')], cExt = [g('a:chExt', 'cx') || ext[0], g('a:chExt', 'cy') || ext[1]];
          const sx = ext[0] / (cExt[0] || 1), sy = ext[1] / (cExt[1] || 1);
          await walk(el, geo => map({ ...geo, x: off[0] + (geo.x - cOff[0]) * sx, y: off[1] + (geo.y - cOff[1]) * sy, w: geo.w * sx, h: geo.h * sy }));
          done();
        } else {
          const before = blocks.length;
          if (tag === 'p:sp' || tag === 'p:cxnSp') await addShape(el, map);
          else if (tag === 'p:pic') await addPic(el, map);
          else if (tag === 'p:graphicFrame') { if (!(await addChart(el, map)) && !(await addDiagram(el, map))) addTable(el, map); }
          // Shape id → the block that stands for it (its text if it has one), for the animations.
          const made = blocks.slice(before), cnv = all(el, 'p:cNvPr')[0], spid = cnv?.getAttribute('id');
          if (cnv?.getAttribute('hidden') === '1' || cnv?.getAttribute('hidden') === 'true') made.forEach(b => { b.hidden = true; });   // (hidden in its selection pane)
          if (spid && made.length && !decorMode) spidOf.set(spid, (made.find(b => b.type === 'text') || made[made.length - 1]).id);
          // (Its name, as PowerPoint's Morph pairs objects by name: features/animation/morph.js.)
          const nm = cnv?.getAttribute('name'); if (nm && !decorMode) made.forEach(b => { b.morphName = nm.slice(0, 120); });
          if (spid && made.length > 1 && !decorMode) partsOf.set(spid, [...made.filter(b => b.type === 'text'), ...made.filter(b => b.type !== 'text')].map(b => b.id));   // (its text keeps the start; the rest go with it)
        }
      }
    };
    const box = geo => ({ x: px(geo.x), y: px(geo.y), w: Math.max(1, px(geo.w)), h: Math.max(1, px(geo.h)),
      rotation: Math.round(geo.rot || 0), ...(geo.flipH && { flipH: true }), ...(geo.flipV && { flipV: true }), animation: null });

    // An object that is a link (a:hlinkClick on its non-visual properties): a web page, a jump
    // (next / previous / first / last slide) or a slide (resolved to its id once all are read).
    const objLink = el => {
      const h = all(el, 'p:cNvPr')[0] && kid(all(el, 'p:cNvPr')[0], 'a:hlinkClick'); if (!h) return {};
      const act = h.getAttribute('action') || '', jump = /jump=(\w+)/.exec(act)?.[1];
      const go = { nextslide: 'next', previousslide: 'prev', firstslide: 'first', lastslide: 'last' }[jump]; if (go) return { goto: go };
      const r = srels[h.getAttribute('r:id')]; if (!r) return {};
      if (r.type === 'hyperlink' && /^(https?|mailto):/i.test(r.path)) return { href: r.path };
      if (r.type === 'slide') return { _gotoPath: r.path };
      return {};
    };
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
      // (Fill and line: the theme's style in that place, in the reference's colour.)
      const ref = n => { const r = kid(pst, n), idx = r?.getAttribute('idx'); if (!r || (n !== 'a:fontRef' && !(+(idx || 0) > 0))) return null;
        const f = n === 'a:fillRef' ? themeFill(r, theme) : n === 'a:lnRef' ? themeFill(r, theme, theme._th?.lns) : null;
        return f?.colour || colourOf(r, theme); };
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
      const mph = ph && findPh(mview?.phs || [], ph), lph = ph && findPh(layout?.phs || [], ph);
      const fontRefColour = ref('a:fontRef');
      const levels = mergeLevels(ph ? [mview?.styles[kind], mph?.levels, lph?.levels] : [defaultText, mview?.styles.other,
        fontRefColour && Array(9).fill({ p: null, r: { color: fontRefColour } })]);
      const body = merge({ l: 91440, r: 91440, t: 45720, b: 45720 }, mph?.body, lph?.body, readBody(kid(txBody, 'a:bodyPr')));
      const t = txBody ? paragraphsHTML(txBody, { ...ctx, slideNo, links }, { levels, body }) : null;
      const hasText = t && t.html.replace(/<[^>]*>/g, '').trim();
      // Visible geometry: a filled/outlined preset shape, or a line.
      if (isLine) {
        const route = connectorRoute(prst, geo, spPr);
        blocks.push({ ...(route ? pathBlock(geo, ln, stroke && stroke !== 'none' ? stroke : '#888888', sw, route) : lineBlock(geo, ln, stroke && stroke !== 'none' ? stroke : '#888888', sw)), ...(dash && { dash }) });
      } else if ((fill && fill !== 'none') || (stroke && stroke !== 'none')) {
        const bx = box(geo);
        blocks.push({ id: uid(), ...objLink(sp), type: 'shape', shape: PRESET[prst] || 'rect', fill: fill || 'none',
          stroke: stroke && stroke !== 'none' ? stroke : (fill || 'none'), strokeWidth: stroke && stroke !== 'none' ? sw : 0, ...bx,
          ...(dash && stroke && stroke !== 'none' && { dash }), ...(shadow && { shadow }),
          ...(prst === 'roundRect' && { radius: Math.round(Math.min(bx.w, bx.h) * Math.min(50000, adj) / 100000) }),
          ...(hasAdjust(PRESET[prst]) && { adj: adjustOf(spPr, PRESET[prst] === 'homeplate' || PRESET[prst] === 'chevron' ? ['adj'] : ['adj1', 'adj2']) }),
          ...(prst === 'cloudCallout' && { adj: adjustOf(spPr, ['adj1', 'adj2']) }) });
      }
      if (!hasText) return;
      const anchor = body.anchor || (ph?.type === 'ctrTitle' ? 'b' : null);
      const first = t.first || {};
      const font = first.font || fonts[isTitle ? 'major' : 'minor'];
      // Tab stops (the first paragraph's that has them): px from the text's edge.
      const tabs = (all(txBody, 'a:tabLst').find(x => all(x, 'a:tab').length) ? all(all(txBody, 'a:tabLst').find(x => all(x, 'a:tab').length), 'a:tab') : [])
        .map(x => ({ pos: Math.round(ctx.emu(+x.getAttribute('pos') || 0) * 10) / 10, align: { ctr: 'center', r: 'right', dec: 'decimal' }[x.getAttribute('algn')] || 'left' })).filter(x => x.pos > 0);
      // (A flipped shape's text isn't mirrored, as in PowerPoint: flipped left-right it reads as always; upside down, it turns
      // half a turn. Before, the clouds of a slide read «ymonotua tnegA».)
      const { flipH: _fh, flipV: _fv, ...tbox } = box(textGeo(geo, !ph && textRectOf(prst, geo, spPr)));
      blocks.push({ id: uid(), type: 'text', ...tbox, ...(tabs.length && { tabs }), rotation: Math.round(((geo.rot || 0) + (geo.flipV ? 180 : 0)) % 360), fontSize: first.size || ctx.pt(levels[0].r.sz || 18),
        html: t.html, pad: [ctx.emu(body.t), ctx.emu(body.r), ctx.emu(body.b), ctx.emu(body.l)], ...(body.noWrap && { noWrap: true }),
        ...(t.align && { textAlign: t.align }), ...(anchor && { vAlign: { t: 'top', ctr: 'middle', b: 'bottom' }[anchor] }),
        ...(body.vert && { vertical: true }),
        ...(first.color && first.color !== 'transparent' && { color: first.color }),
        ...(shadow && !((fill && fill !== 'none') || (stroke && stroke !== 'none')) && { shadow }), ...(body.fontScale && body.fontScale < 1 && { fit: body.fontScale }), ...(body.shrink && { autofit: true }),
        ...(REVELA_PH[ph?.type || ''] && { ph: REVELA_PH[ph.type || ''], pk: phKeyOf(ph) }), ...(font && { fontFamily: fontStack(font) }) });
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
    // An elbow or curved connector (bentConnector2–5, curvedConnector2–5): its route as PowerPoint draws it, in its box
    // (pathline, render/svg.js) — before, a straight line from corner to corner: a tree's branches, a diagram's elbows.
    const pathBlock = (geo, ln, stroke, sw, route) => {
      const tip = e => { const t = kid(ln, e)?.getAttribute('type'); return t && t !== 'none'; };
      // (Worked out on the slide — flips and turn applied —, then the box the route takes: a connector's own box may be
      // a sliver — 0.1 px wide — with its curve far outside it, 150 times its width; rounded to 1 px it came out 7 times
      // too big, or not at all.)
      const gx = geo.x * scale, gy = geo.y * scale, gw = geo.w * scale, gh = geo.h * scale, cx = gx + gw / 2, cy = gy + gh / 2, r = (geo.rot || 0) * Math.PI / 180;
      const at = (u, v) => {
        let x = gx + (geo.flipH ? 100 - u : u) / 100 * gw, y = gy + (geo.flipV ? 100 - v : v) / 100 * gh;
        return [cx + (x - cx) * Math.cos(r) - (y - cy) * Math.sin(r), cy + (x - cx) * Math.sin(r) + (y - cy) * Math.cos(r)];
      };
      const abs = route.map(([c, ...v]) => [c, ...v.flatMap((_, i) => (i % 2 ? [] : at(v[i], v[i + 1])))]);
      const xs = abs.flatMap(c => c.slice(1).filter((_, i) => i % 2 === 0)), ys = abs.flatMap(c => c.slice(1).filter((_, i) => i % 2 === 1));
      const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(1, Math.max(...xs) - x0), h = Math.max(1, Math.max(...ys) - y0);
      const rel = abs.map(([c, ...v]) => [c, ...v.map((n, i) => +((i % 2 ? (n - y0) / h : (n - x0) / w) * 100).toFixed(2))]);
      return { id: uid(), type: 'shape', shape: 'pathline', route: rel, fill: 'none', stroke, strokeWidth: sw,
        x: Math.round(x0), y: Math.round(y0), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), rotation: 0, animation: null,
        ...(tip('a:headEnd') && { arrowStart: true }), ...(tip('a:tailEnd') && { arrowEnd: true }) };
    };
    const addPic = async (pic, map) => {
      if (decorMode && phOf(pic)) return;
      const geo = xfrmOf(kid(pic, 'p:spPr')); const blip = all(pic, 'a:blip')[0];
      if (!geo || !blip) return;
      // (An icon from Office's library is an SVG — asvg:svgBlip, in the blip's extensions —, often with no PNG for older
      // versions: its SVG, sharp at any size; else the picture.)
      const svg = all(blip, 'asvg:svgBlip')[0]?.getAttribute('r:embed');
      // (A video or a sound comes even without its picture — one too big, or unreadable.)
      let src = (svg && await media(svg)) || await media(blip.getAttribute('r:embed'));
      // A video or a sound (its picture is the poster, shown until it plays): the file inside the presentation
      // (p14:media) or linked (a:videoFile r:link: inside too, or an address on the web). Before, only the poster came.
      const vf = all(pic, 'a:videoFile')[0], af = all(pic, 'a:audioFile')[0];
      if (vf || af) {
        const rid = all(pic, 'p14:media')[0]?.getAttribute('r:embed') || (vf || af).getAttribute('r:link'), t = partRels[rid];
        const ext = (t?.path || '').split(/[?#]/)[0].split('.').pop().toLowerCase(), mime = MIME[ext] || '';
        const file = t && PLAYABLE.test(mime) ? (/^https:\/\//.test(t.path) ? t.path : await media(rid)) : null;
        // (What stays as its picture is said: a format browsers don't play, a file that isn't in the package…)
        const name = (t?.path || '').split(/[?#]/)[0].split('/').pop() || (vf ? 'video' : 'audio');
        if (!file && t && !PLAYABLE.test(mime)) said.push({ kind: 'format', name });
        else if (!file && (!t || (!/^https:\/\//.test(t.path) && !zip.file(t.path)))) said.push({ kind: 'missing', name });
        if (file) {
          const descr = all(pic, 'p:cNvPr')[0]?.getAttribute('descr') || '';
          blocks.push({ id: uid(), ...objLink(pic), type: vf ? 'video' : 'audio', src: file, ...(vf && src && { poster: src }), ...(descr && { alt: descr }), ...box(map(geo)) });
          return;
        }
      }
      if (!src) return;
      // Cropped in PowerPoint (srcRect: thousandths of a percent cut from each side): the part that shows.
      const sr = all(pic, 'a:srcRect')[0];
      if (sr) src = await cropPicture(src, ['l', 't', 'r', 'b'].map(k => Math.max(0, +(sr.getAttribute(k) || 0) / 100000)));
      const duo = kid(blip, 'a:duotone'), cols = duo ? [...duo.children].map(el => colourOf({ children: [el] }, theme)) : [];
      if (cols.length === 2 && cols.every(x => HEX6.test(x || ''))) src = await recolorPicture(src, cols[0], cols[1]);
      else if (kid(blip, 'a:grayscl')) src = await recolorPicture(src, '#000000', '#ffffff');
      // (Brightness and contrast, Format ▸ Corrections: a:lum, in thousandths of a percent.)
      const lum = kid(blip, 'a:lum'), bright = +(lum?.getAttribute('bright') || 0) / 1000, contrast = +(lum?.getAttribute('contrast') || 0) / 1000;
      const descr = all(pic, 'p:cNvPr')[0]?.getAttribute('descr') || '';
      const shadow = shadowOf(kid(pic, 'p:spPr'), theme, scale);
      blocks.push({ id: uid(), ...objLink(pic), type: 'image', fit: 'fill', src, ...(descr && { alt: descr }), ...(shadow && { shadow }), ...box(map(geo)),
        ...((bright || contrast) && { adj: { brightness: Math.round(100 + bright), contrast: Math.round(100 + contrast) } }) });
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
        'c:pieChart': 'pie', 'c:pie3DChart': 'pie', 'c:doughnutChart': 'doughnut', 'c:radarChart': 'radar', 'c:scatterChart': 'scatter', 'c:bubbleChart': 'bubble' };
      const groups = [...plot.children].filter(c => KIND[c.tagName]);
      if (!groups.length) return false;
      const pts = el => { const out = []; for (const p of all(el, 'c:pt')) out[+p.getAttribute('idx')] = kid(p, 'c:v')?.textContent ?? ''; return out; };
      const valIds = all(plot, 'c:valAx').map(ax => kid(ax, 'c:axId')?.getAttribute('val'));
      const series = groups.flatMap(g => kids(g, 'c:ser').map(ser => ({
        kind: KIND[g.tagName], vax: kids(g, 'c:axId').map(e => e.getAttribute('val')).find(id => valIds.includes(id)),
        name: all(kid(ser, 'c:tx'), 'c:v')[0]?.textContent || '',
        cats: pts(kid(ser, 'c:cat') || kid(ser, 'c:xVal')),
        vals: pts(kid(ser, 'c:val') || kid(ser, 'c:yVal')).map(v => +v || 0),
        color: fillOf(kid(ser, 'c:spPr'), theme),
        sizes: pts(kid(ser, 'c:bubbleSize')).map(v => +v || 0),
        raw: pts(kid(ser, 'c:val') || kid(ser, 'c:yVal')),
      })));
      if (!series.length) return false;
      const first = series[0], labels = first.cats.length ? first.cats : first.vals.map((_, i) => String(i + 1));
      const b = { id: uid(), type: 'chart', chartType: first.kind, color: first.color && first.color !== 'none' ? first.color : (theme.accent1 || '#3f6497'),
        data: labels.map((l, i) => ({ label: String(l ?? ''), value: first.vals[i] ?? 0 })), ...box(map(geo)) };
      if (first.name) b.seriesName = first.name;
      if (first.kind === 'bubble' && first.sizes.length) b.series = [{ name: 'Tamaño', values: labels.map((_, k) => first.sizes[k] ?? 1) }];
      const rest = first.kind === 'bubble' ? [] : series.slice(1);
      if (rest.length) {
        b.series = rest.map((x, i) => ({ name: x.name, values: labels.map((_, k) => x.vals[k] ?? 0),
          ...(x.color && x.color !== 'none' ? { color: x.color } : theme['accent' + (i + 2)] ? { color: theme['accent' + (i + 2)] } : {}) }));
        if (first.kind === 'bar' && rest.some(x => x.kind === 'line')) b.combo = true;
      }
      // Bars stacked (or to 100 %) or horizontal: their grouping and direction.
      const bg = groups.find(g => g.tagName === 'c:barChart' || g.tagName === 'c:bar3DChart');
      if (bg && first.kind === 'bar' && !b.combo) {
        const grouping = kid(bg, 'c:grouping')?.getAttribute('val'), dir = kid(bg, 'c:barDir')?.getAttribute('val');
        if (grouping === 'stacked') b.chartType = 'stacked'; else if (grouping === 'percentStacked') b.chartType = 'stacked100'; else if (dir === 'bar') b.chartType = 'hbar';
      }
      // Stacked areas; a scatter's series each with its own x (the empty points left out).
      const ag = groups.find(g => g.tagName === 'c:areaChart');
      if (ag && first.kind === 'area' && kid(ag, 'c:grouping')?.getAttribute('val') === 'stacked') b.chartType = 'stackedArea';
      if (first.kind === 'scatter') {
        const own = x => x.raw.map((v, k) => [x.cats[k], v]).filter(([, v]) => v !== '' && v != null);
        b.data = own(first).map(([l, v]) => ({ label: String(l ?? ''), value: +v || 0 }));
        if (rest.length) b.series = rest.map((x, i) => ({ name: x.name, x: own(x).map(([l]) => +l || 0), values: own(x).map(([, v]) => +v || 0),
          ...(x.color && x.color !== 'none' ? { color: x.color } : theme['accent' + (i + 2)] ? { color: theme['accent' + (i + 2)] } : {}) }));
      }
      // The value axis' ends, if set (b.yMin/b.yMax; a scatter's x axis: b.xMin/b.xMax).
      const axes = all(plot, 'c:valAx'), endOf = (ax, tag) => { const v = kid(kid(ax, 'c:scaling'), tag)?.getAttribute('val'); return v != null && isFinite(+v) ? +v : null; };
      const xy = first.kind === 'scatter' || first.kind === 'bubble', isX = ax => ['b', 't'].includes(kid(ax, 'c:axPos')?.getAttribute('val'));
      const axOf = id => axes.find(ax => kid(ax, 'c:axId')?.getAttribute('val') === id);
      const xAx = xy ? axes.find(isX) || axes[0] : null, vAx = xy ? axes.find(ax => ax !== xAx) : axOf(first.vax) || axes[0];
      if (vAx && b.chartType !== 'stacked100') { if (endOf(vAx, 'c:min') != null) b.yMin = endOf(vAx, 'c:min'); if (endOf(vAx, 'c:max') != null) b.yMax = endOf(vAx, 'c:max'); }
      // A secondary axis: the combo's lines (or a line chart's other series) on another value axis → b.y2, with its title
      // and ends — when it splits the series as Revela can draw (bars on one, lines on the other; the first line alone).
      const off = rest.filter(x => x.vax !== first.vax), ax2 = !xy && off.length && axOf(off[0].vax);
      if (ax2 && (b.combo ? series.every(x => (x.kind === 'bar') === (x.vax === first.vax)) : ['line', 'area'].includes(b.chartType) && off.length === rest.length)) {
        b.y2 = true;
        const t2 = all(kid(ax2, 'c:title'), 'a:t').map(t => t.textContent).join(''); if (t2) b.y2Title = t2;
        if (endOf(ax2, 'c:min') != null) b.y2Min = endOf(ax2, 'c:min'); if (endOf(ax2, 'c:max') != null) b.y2Max = endOf(ax2, 'c:max');
      }
      if (xAx) { if (endOf(xAx, 'c:min') != null) b.xMin = endOf(xAx, 'c:min'); if (endOf(xAx, 'c:max') != null) b.xMax = endOf(xAx, 'c:max'); }
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
      const levels = mergeLevels([defaultText, mview?.styles.other, st.text]);
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
      if (levels[0].r.font) b.fontFamily = fontStack(levels[0].r.font);
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
      partRels = part.rels; use(part.th, part.map);
      const t = all(part.doc, 'p:spTree')[0]; if (t) await walk(t, g => g);
      decorOf.set(part.file, blocks.splice(0));
    }
    decorMode = false; partRels = srels; use(layout?.th || master?.th || baseTheme, slideMap);
    blocks.push(...content);
    const layoutInfo = layout && { layout, master };
    if (layoutInfo) usedLayouts.set(layoutPath, layoutInfo);
    if (ghost) return null;
    const hideMaster = doc.documentElement.getAttribute('showMasterSp') === '0';

    // Background: the slide's own, else its layout's, else the master's.
    const background = (await backgroundOf(zip, doc, theme, srels)) || layout?.bg || master?.bg || theme.bg1 || '#ffffff';

    // Speaker notes.
    let notes = '';
    const notesPath = Object.values(srels).find(r => r.type === 'notesSlide')?.path;
    if (notesPath && zip.file(notesPath)) {
      const nd = parseXML(await zip.file(notesPath).async('string'));
      const body = all(nd, 'p:sp').find(sp => phOf(sp)?.type === 'body');
      notes = kids(kid(body, 'p:txBody'), 'a:p').map(p => all(p, 'a:t').map(t => t.textContent).join('')).join('\n').trim();
    }
    const comments = await readComments(zip, srels, commentAuthors, spidOf);
    const hidden = doc.documentElement.getAttribute('show') === '0';
    // Transition (the p14/p15 variants sit inside mc:AlternateContent) and its auto-advance time.
    const tr = all(doc, 'p:transition')[0];
    let transition = null, autoSlide = 0, transitionDir = null;
    let morph = null, dur = 0;
    if (tr) {
      const kinds = [...all(tr, '*')].map(e => e.tagName.replace(/^p\d*:/, ''));
      transition = kinds.map(k => TRANSITION[k]).find(Boolean) || null;
      // Effect options: direction of wipe and push, orientation of split.
      const el = [...all(tr, '*')].find(e => TRANSITION[e.tagName.replace(/^p\d*:/, '')] === transition);
      if (el && (transition === 'wipe' || transition === 'push')) {
        const d = { l: 'right', r: 'left', u: 'bottom', d: 'top' }[el.getAttribute('dir') || (transition === 'wipe' ? 'l' : 'u')];
        if (d && d !== TRANSITION_DIRS[transition][0]) transitionDir = d;
      } else if (el && transition === 'split' && (el.getAttribute('orient') === 'horz' || el.getAttribute('dir') === 'horz')) transitionDir = 'horizontal';
      const adv = +(tr.getAttribute('advTm') || 0); if (adv) autoSlide = adv;
      // How long it lasts: PowerPoint 2010's exact duration (p14:dur, ms), else its speed (fast, medium, slow).
      dur = +(tr.getAttribute('p14:dur') || 0) || SPD_MS[tr.getAttribute('spd') || 'fast'];
      // Morph (inside mc:AlternateContent): by objects, words or characters.
      const m = [...all(tr, '*')].find(e => /:morph$/.test(e.tagName));
      if (m) { morph = { byWord: 'words', byChar: 'chars' }[m.getAttribute('option')] || 'objects'; transition = null; }
    }
    readAnimations(doc, spidOf, blocks, size, groupOf, partsOf);
    // (No transition in PowerPoint is none — a cut —, not the deck's.)
    return { _path: slidePath, id: uid(), sectionId: null, background, transition: tr ? transition : 'none', ...(transitionDir && { transitionDir }), hidden, notes, autoSlide, blocks, _layout: layoutPath, ...(hideMaster && { hideMaster: true }),
      ...(dur && transition && { transitionDur: dur }), ...(morph && { autoAnimate: true }), ...(morph && dur && { aaDuration: dur / 1000 }),
      ...(morph && morph !== 'objects' && { morphBy: morph }), ...(comments.length && { comments }) };
  };
  for (const [i, p] of order.entries()) { progress?.({ slide: i + 1, of: order.length }); const s = await readSlide(p); if (s) slides.push(s); }
  // Every layout of the masters in use (all the masters' in a template without
  // slides), in the masters' order, as PowerPoint's New Slide menu shows them.
  const mastersUsed = [...new Set([...usedLayouts.values()].map(u => u.master?.file).filter(Boolean))];
  const allLayouts = [];
  for (const mp of mastersUsed.length ? mastersUsed : masterIds) {
    const mi = await info(mp), r = mi.rels;
    for (const id of all(mi.doc, 'p:sldLayoutId')) { const lp = r[id.getAttribute('r:id')]?.path; if (lp && zip.file(lp)) allLayouts.push(lp); }
  }
  for (const lp of allLayouts) if (!usedLayouts.has(lp)) await readSlide(null, lp);
  const rank = new Map(allLayouts.map((p, i) => [p, i]));
  const sortedLayouts = new Map([...usedLayouts].sort((a, b) => (rank.get(a[0]) ?? 1e9) - (rank.get(b[0]) ?? 1e9)));
  usedLayouts.clear(); for (const [k, v] of sortedLayouts) usedLayouts.set(k, v);

  // Links to a slide: from the slide's file to its id.
  const idOfPath = new Map(slides.map(sl => [sl._path, sl.id]));
  for (const sl of slides) { for (const b of sl.blocks) if (b._gotoPath) { const id = idOfPath.get(b._gotoPath); if (id) b.goto = id; delete b._gotoPath; } delete sl._path; }

  // ---- Master styles and layouts --------------------------------------------
  // The master's text styles (title, body levels) become Revela's; each layout
  // used becomes a Revela layout with its placeholders and its own objects.
  const firstMaster = [...usedLayouts.values()][0]?.master;
  const lvl1 = (chain, i = 0) => mergeLevels(chain)[i];
  const styleFrom = lv => def({
    size: lv.r.sz ? ctx.pt(lv.r.sz) : undefined, color: lv.r.color && lv.r.color !== 'transparent' ? lv.r.color : undefined,
    font: lv.r.font ? fontStack(lv.r.font) : undefined, bold: lv.r.b, italic: lv.r.i, align: ALIGN[lv.p.algn],
  });
  // Each PowerPoint master used becomes a Revela master (the first one the
  // main master, the others deck.masters) with its text styles and objects.
  const stylesOf = mas => {
    const mph = kind => findPh(mas.phs, { type: kind }), out = {};
    const titleChain = [mas.styles.title, mph('title')?.levels];
    const bodyChain = [mas.styles.body, mph('body')?.levels];
    out.title = styleFrom(lvl1(titleChain));
    out.body = { ...styleFrom(lvl1(bodyChain)), levels: [0, 1, 2, 3, 4].map(i => { const l = lvl1(bodyChain, i);
      return def({ size: l.r.sz ? ctx.pt(l.r.sz) : undefined, color: l.r.color, bullet: l.p.bullet?.kind === 'char' ? l.p.bullet.char : l.p.bullet?.kind === 'num' ? 'decimal' : l.p.bullet?.kind === 'none' ? 'none' : undefined }); }) };
    const sub0 = [...usedLayouts.values()].filter(u => u.master === mas).map(u => findPh(u.layout.phs, { type: 'subTitle' })).find(Boolean);
    out.subtitle = styleFrom(lvl1([...bodyChain, sub0?.levels]));
    delete out.subtitle.bullet;
    return out;
  };
  const revMasters = new Map();                         // master file → Revela master
  for (const { master: mas } of usedLayouts.values()) {
    if (!mas || revMasters.has(mas.file)) continue;
    const first = !revMasters.size, nm = mas.doc.getElementsByTagName('p:cSld')[0]?.getAttribute('name');
    // (Its background: its own, else the theme's background colour.)
    revMasters.set(mas.file, { id: first ? 'master' : 'pptx-m' + revMasters.size, ...(nm && { name: nm.replace(/-/g, ' ') }), background: mas.bg || mas.th?.scheme[mas.map?.bg1] || null,
      blocks: decorOf.get(mas.file) || [], styles: stylesOf(mas) });
  }
  const styles = firstMaster ? revMasters.get(firstMaster.file).styles : {};
  const layouts = [], layoutIdOf = new Map(), phIdOf = new Map();
  let n = 0;
  for (const [path, { layout: lay, master: mas }] of usedLayouts) {
    const id = 'pptx-' + (++n), blocksL = [];
    for (const p of lay.phs) {
      const kind = REVELA_PH[p.type || ''], media = { pic: 'picture', tbl: 'table', chart: 'chart' }[p.type];
      const geo0 = p.geo || findPh(mas?.phs || [], p)?.geo; if (!geo0) continue;
      if (media) { blocksL.push({ id: uid(), type: 'placeholder', ph: media, x: px(geo0.x), y: px(geo0.y), w: px(geo0.w), h: px(geo0.h), rotation: 0, animation: null }); continue; }
      if (!kind) continue;
      // The layout's own formatting where it differs from the master's.
      const mv = lay.mview || mas;
      const own = styleFrom(lvl1([mv?.styles[kind === 'title' ? 'title' : 'body'], findPh(mv?.phs || [], p)?.levels, p.levels]));
      const base = (mas && revMasters.get(mas.file)?.styles[kind]) || {};
      const bp = { id: uid(), type: 'text', ph: kind, x: px(geo0.x), y: px(geo0.y), w: px(geo0.w), h: px(geo0.h), rotation: 0, animation: null, html: '' };
      if (own.size && own.size !== base.size) bp.fontSize = own.size;
      if (own.color && own.color !== base.color) bp.color = own.color;
      if (own.align && own.align !== base.align) bp.textAlign = own.align;
      if (p.body?.anchor) bp.vAlign = { t: 'top', ctr: 'middle', b: 'bottom' }[p.body.anchor];
      phIdOf.set(`${path}#${phKeyOf(p)}`, bp.id); phIdOf.set(`${path}#${p.type || 'body'}`, phIdOf.get(`${path}#${p.type || 'body'}`) || bp.id);
      blocksL.push(bp);
    }
    const name = lay.doc.getElementsByTagName('p:cSld')[0]?.getAttribute('name') || `Diseño ${n}`;
    // A layout with a background of its own keeps it (else it shows its master's).
    const masterBg = mas && revMasters.get(mas.file)?.background;
    layouts.push({ id, name: LAYOUT_NAMES[name.replace(/\s*\([^)]*\)\s*$/, '').trim().toUpperCase().replace(/[ _]+/g, '_')] || name.replace(/\s*\([^)]*\)\s*$/, '').replace(/_/g, ' '),
      background: lay.bg && lay.bg !== masterBg ? lay.bg : null,
      ...(lay.showMasterSp === false && { hideMaster: true }), ...(mas && revMasters.get(mas.file)?.id !== 'master' && { masterId: revMasters.get(mas.file).id }),
      blocks: [...(decorOf.get(lay.file) || []), ...blocksL] });
    layoutIdOf.set(path, id);
  }
  const mainMaster = firstMaster ? revMasters.get(firstMaster.file) : { id: 'master', blocks: [], background: null };
  const extraMasters = [...revMasters.values()].filter(m => m.id !== 'master');

  // A template without slides (.potx, a .thmx with its masters) starts with one on its first layout, as in PowerPoint.
  if (!slides.length && layouts.length) {
    const lay = layouts[0];
    slides.push({ id: uid(), sectionId: null, background: lay.background || mainMaster.background || '#ffffff', transition: null, hidden: false, notes: '', autoSlide: 0,
      blocks: newSlideBlocks(lay), layoutId: lay.id });
  }
  if (!slides.length) throw new Error('No se encontraron diapositivas en el archivo.');
  const deck = { version: 3, name: (file.name || '').replace(/\.(pptx|pptm|potx|potm|thmx)$/i, '') || 'Presentación importada', size, theme: 'white',
    defaultTransition: 'none', transitionSpeed: 'default', sections: [], master: mainMaster, ...(extraMasters.length && { masters: extraMasters }),
    ...(layouts.length && { layouts }),
    slideNumber: { show: false, position: 'br', format: 'c' }, footer: { show: false, text: '', date: false },
    logo: { src: '', position: 'br', size: 120 }, loop: false, guides: { v: [], h: [] }, slides };
  // The theme, as the deck's: its colours are the palette (Design ▸ Colours shows
  // it by name), its fonts the theme fonts, and the colours made from its
  // colours (tints and shades) follow a later change of palette.
  const lo = await libreOfficeTheme(zip, firstMaster || palInfo);
  const officeTheme = themeRecord(firstMaster?.th || baseTheme, firstMaster?.map || palInfo?.map || DEFAULT_MAP, lo);
  deck.officeTheme = officeTheme;
  deck.palette = 'custom'; deck.customPalette = officeTheme.colors;
  if (officeTheme.fonts) { deck.fontPair = 'theme'; const st = themeFontStacks(officeTheme.fonts); if (st) deck.bodyFont = st.body; }
  if (Object.keys(theme._links).length) deck.themeTints = theme._links;
  // Slides: their layout, and placeholders linked to the layout's; what they
  // only repeat from the master or layout is dropped, so editing the master's
  // styles later changes them too.
  for (const m of [deck.master, ...(deck.masters || [])]) if (m.styles) masterStyles(deck, m);
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
