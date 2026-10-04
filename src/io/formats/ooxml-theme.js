// The deck's theme as an Office theme part (DrawingML a:theme): its name,
// colour scheme (dk1, lt1, dk2, lt2, accent1–6, hlink, folHlink) with the
// master's colour map, its heading and body fonts, and a plain format scheme.
// PowerPoint export writes it as ppt/theme/theme1.xml (so Design ▸ Variants
// in PowerPoint shows the same colours and fonts), and "Save theme" as a .thmx.
// An imported theme comes back as it was (its scheme, colour map and Office
// font names); otherwise it is made from the palette and the fonts in use.

import { currentPalette, FONT_PAIRS } from '../../features/design/palettes.js';
import { JSZIP, loadScript } from '../../core/vendor.js';

const XE = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const HEX6 = /^#[0-9a-f]{6}$/i;
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const firstFamily = stack => String(stack || '').split(',')[0].replace(/["']/g, '').trim();

// { name, colorsName, fontsName, scheme, map, major, minor, majorEa… } for the deck.
export function deckTheme(deck) {
  const p = currentPalette(deck), cp = deck.palette === 'custom' ? deck.customPalette : null, ot = deck.officeTheme || {};
  let scheme, map;
  if (cp?.scheme && cp.clrMap) {
    // The imported scheme, with whatever was changed since in the palette's roles.
    scheme = { ...cp.scheme }; map = cp.clrMap;
    scheme[map.bg1] = p.bg; scheme[map.tx1] = p.fg; p.accents.forEach((c, i) => { scheme['accent' + (i + 1)] = c; });
  } else {
    const dark = HEX6.test(p.bg) && lum(p.bg) < 0.45;
    map = dark ? { bg1: 'dk1', tx1: 'lt1', bg2: 'dk2', tx2: 'lt2' } : { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' };
    scheme = { dk1: dark ? p.bg : p.fg, lt1: dark ? p.fg : p.bg, dk2: dark ? '#1f2a36' : '#0e2841', lt2: dark ? '#e8e8e8' : '#e8e8e8',
      ...Object.fromEntries(p.accents.map((c, i) => ['accent' + (i + 1), c])), hlink: p.accents[4] || '#467886', folHlink: p.accents[5] || '#96607d' };
  }
  const tf = deck.fontPair === 'theme' && ot.fonts ? ot.fonts : null, pair = FONT_PAIRS[deck.fontPair];
  const major = tf?.major || pair?.heading || firstFamily(deck.master?.styles?.title?.font) || firstFamily(deck.bodyFont) || 'Calibri Light';
  const minor = tf?.minor || pair?.body || firstFamily(deck.bodyFont) || 'Calibri';
  const name = (deck.palette === 'custom' && ot.name) || ot.name || p.name || 'Revela';
  return { name, colorsName: p.name || name, fontsName: tf?.name || (pair && pair.name) || name, scheme, map, major, minor,
    majorEa: tf?.majorEa || '', minorEa: tf?.minorEa || '', majorCs: tf?.majorCs || '', minorCs: tf?.minorCs || '' };
}

const clr = (slot, hex) => `<a:${slot}><a:srgbClr val="${String(hex).slice(1, 7).toUpperCase()}"/></a:${slot}>`;
const font = (latin, ea, cs) => `<a:latin typeface="${XE(latin)}"/><a:ea typeface="${XE(ea)}"/><a:cs typeface="${XE(cs)}"/>`;
const ph = mods => `<a:schemeClr val="phClr">${mods}</a:schemeClr>`;
const FMT = '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill>' + ph('') + '</a:solidFill>'
  + '<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">' + ph('<a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/>') + '</a:gs><a:gs pos="100000">' + ph('<a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/>') + '</a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>'
  + '<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">' + ph('<a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/>') + '</a:gs><a:gs pos="100000">' + ph('<a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/>') + '</a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:fillStyleLst>'
  + '<a:lnStyleLst>' + [6350, 12700, 19050].map(w => `<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr"><a:solidFill>${ph('')}</a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`).join('') + '</a:lnStyleLst>'
  + '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst>'
  + '<a:bgFillStyleLst><a:solidFill>' + ph('') + '</a:solidFill><a:solidFill>' + ph('<a:tint val="95000"/><a:satMod val="170000"/>') + '</a:solidFill>'
  + '<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">' + ph('<a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/>') + '</a:gs><a:gs pos="100000">' + ph('<a:shade val="63000"/><a:satMod val="120000"/>') + '</a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:bgFillStyleLst></a:fmtScheme>';

export function themeXML(deck) {
  const th = deckTheme(deck), s = th.scheme;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="' + XE(th.name) + '"><a:themeElements>'
    + `<a:clrScheme name="${XE(th.colorsName)}">` + ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map(k => clr(k, s[k] || '#000000')).join('') + '</a:clrScheme>'
    + `<a:fontScheme name="${XE(th.fontsName)}"><a:majorFont>${font(th.major, th.majorEa, th.majorCs)}</a:majorFont><a:minorFont>${font(th.minor, th.minorEa, th.minorCs)}</a:minorFont></a:fontScheme>`
    + FMT + '</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>';
}
// The master's colour map, as PowerPoint writes it.
export const clrMapXML = deck => { const m = deckTheme(deck).map;
  return `<p:clrMap bg1="${m.bg1}" tx1="${m.tx1}" bg2="${m.bg2}" tx2="${m.tx2}" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>`; };

// Into a .pptx being written (PptxGenJS's): the theme, and the masters' colour map.
export async function writeTheme(zip, deck) {
  for (const f of Object.keys(zip.files).filter(f => /^ppt\/theme\/theme\d+\.xml$/.test(f))) zip.file(f, themeXML(deck));
  for (const f of Object.keys(zip.files).filter(f => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(f))) {
    const x = await zip.file(f).async('string');
    zip.file(f, x.replace(/<p:clrMap\b[^>]*\/>/, clrMapXML(deck)));
  }
}

// The theme alone, as an Office theme file (.thmx): PowerPoint's Design ▸
// Themes ▸ Browse for Themes opens it.
export async function buildThmx(deck) {
  const JSZip = await loadScript(JSZIP, 'JSZip'), zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/theme/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="theme/theme/theme1.xml"/></Relationships>');
  zip.file('theme/theme/theme1.xml', themeXML(deck));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.ms-officetheme' });
}
