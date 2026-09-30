// OpenDocument Presentation (.odp) export and import — the native format of
// LibreOffice Impress, also opened by OnlyOffice, PowerPoint and Keynote.
//
// Export maps each object to its ODF equivalent: text frames with formatted
// paragraphs and lists, pictures, preset shapes (draw:custom-shape), merged
// shapes as paths, lines with arrows, tables with merged cells; charts, icons
// and ink go in as SVG pictures. Backgrounds, speaker notes, hidden slides
// and object animations (odp-anim.js) are kept. Import reads the same structures back.

import { animsOf } from '../../features/animation/transitions.js';
import { state } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { commentText, parseCommentText } from '../../features/collab/comments.js';
import { shownRows } from '../../core/formulas.js';
import { chartSVG, iconSVG, inkSVG, timerSVG, tableSpan } from '../../render/svg.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { masterBlocksFor, isEmptyPlaceholder, styled } from '../../features/document/master.js';
import { blockImage } from '../export/images.js';
import { JSZIP, loadScript } from '../../core/vendor.js';
import { odpTimingXML, readODPAnimations } from './odp-anim.js';
import { transitionName } from '../../features/animation/transitions.js';

const loadZip = () => loadScript(JSZIP, 'JSZip');

const X = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
  + 'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
  + 'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" '
  + 'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" '
  + 'xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" '
  + 'xmlns:smil="urn:oasis:names:tc:opendocument:xmlns:smil-compatible:1.0" xmlns:anim="urn:oasis:names:tc:opendocument:xmlns:animation:1.0" '
  + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:officeooo="http://openoffice.org/2009/office" office:version="1.3"';

const ODF_SHAPE = { rect: 'rectangle', rounded: 'round-rectangle', ellipse: 'ellipse', triangle: 'isosceles-triangle', diamond: 'diamond',
  pentagon: 'pentagon', star: 'star5', rightarrow: 'right-arrow', leftarrow: 'left-arrow', hexagon: 'hexagon',
  parallelogram: 'parallelogram', trapezoid: 'trapezoid', chevron: 'chevron', plus: 'cross' };
const FROM_ODF = Object.fromEntries(Object.entries(ODF_SHAPE).map(([k, v]) => [v, k]));
const hex = c => (String(c || '').match(/#[0-9a-f]{6}/i) || [null])[0];

// ---- Export ----------------------------------------------------------------
// Slide transitions and auto-advance (SMIL types, as LibreOffice writes them).
// [type, subtype, reverse?]; with effect options (transitionDir) for wipe, push and split.
const ODP_TRANS = { fade: ['fade', 'crossfade'], slide: ['pushWipe', 'fromRight'], push: ['pushWipe', 'fromBottom'], convex: ['slideWipe', 'fromRight'],
  concave: ['slideWipe', 'fromRight'], zoom: ['zoom', 'rotateIn'], wipe: ['barWipe', 'leftToRight', true], rise: ['pushWipe', 'fromBottom'], flip: ['barnDoorWipe', 'vertical'],
  'wipe-left': ['barWipe', 'leftToRight'], 'wipe-top': ['barWipe', 'topToBottom'], 'wipe-bottom': ['barWipe', 'topToBottom', true],
  'push-top': ['pushWipe', 'fromTop'], 'push-right': ['pushWipe', 'fromRight'], 'push-left': ['pushWipe', 'fromLeft'],
  split: ['barnDoorWipe', 'vertical'], 'split-horizontal': ['barnDoorWipe', 'horizontal'], circle: ['ellipseWipe', 'circle'], diamond: ['irisWipe', 'diamond'] };
function odpTransition(s, deck) {
  const kind = s.autoAnimate ? 'fade' : (s.transition ? transitionName(s.transition, s.transitionDir) : deck.defaultTransition || 'slide');
  const t = ODP_TRANS[kind];
  const spd = { fast: 'fast', slow: 'slow' }[s.transitionSpeed || deck.transitionSpeed] || 'medium';
  return (t ? ` smil:type="${t[0]}" smil:subtype="${t[1]}"${t[2] ? ' smil:direction="reverse"' : ''} presentation:transition-speed="${spd}"` : '')
    + (s.autoSlide ? ` presentation:transition-type="automatic" presentation:duration="PT${(s.autoSlide / 1000).toFixed(1)}S"` : '');
}
const FROM_SMIL = { fade: 'fade', pushWipe: 'push', slideWipe: 'convex', zoom: 'zoom', barWipe: 'wipe', barnDoorWipe: 'split', ellipseWipe: 'circle', irisWipe: 'diamond' };
// Back from type + subtype + direction to [transition, effect option].
function fromSmil(type, sub, reverse) {
  const kind = FROM_SMIL[type]; if (!kind) return [null, null];
  if (kind === 'wipe') return ['wipe', sub === 'topToBottom' ? (reverse ? 'bottom' : 'top') : reverse ? null : 'left'];
  if (kind === 'push') return ['push', { fromTop: 'top', fromRight: 'right', fromLeft: 'left' }[sub] || null];
  if (kind === 'split') return ['split', sub === 'horizontal' ? 'horizontal' : null];
  return [kind, null];
}

// A colour from the file, only if it is one (it goes into a style attribute).
const colour = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : null);

export async function buildODP(deck = state.deck) {
  const JSZip = await loadZip();
  const { w: W, h: H } = deck.size;
  const CM = 28 / 1280;                                   // 1280 px ↔ 28 cm (16:9 default in Impress)
  const cm = v => (v * CM).toFixed(3) + 'cm';
  const pt = px => (px * CM * 28.3465).toFixed(1) + 'pt';
  const fg = deckFg(deck), bodyFont = (deckBodyFont(deck) || '').split(',')[0].replace(/['"]/g, '').trim();

  const auto = new Map();                                // style xml → name (deduplicated)
  const style = (family, prefix, props) => {
    const key = family + props;
    if (!auto.has(key)) auto.set(key, { name: prefix + (auto.size + 1), xml: `<style:style style:name="${prefix}${auto.size + 1}" style:family="${family}">${props}</style:style>` });
    return auto.get(key).name;
  };
  const pictures = [];
  const pic = (data, ext) => { const n = `Pictures/p${pictures.length + 1}.${ext}`; pictures.push({ n, data }); return n; };
  const dataURL = src => { const m = /^data:([^;]+);base64,(.*)$/.exec(src || ''); return m ? { mime: m[1], b64: m[2] } : null; };

  // HTML → ODF paragraphs with spans. Block elements and <br> start paragraphs.
  const textXML = (b) => {
    const align = { center: 'center', right: 'end', justify: 'justify' }[b.textAlign] || 'start';
    const pStyle = style('paragraph', 'P', `<style:paragraph-properties fo:text-align="${align}"/>`
      + `<style:text-properties fo:font-size="${pt(b.fontSize || 40)}" fo:color="${hex(fg) || '#ffffff'}"`
      + `${b.fontFamily || bodyFont ? ` style:font-name="${X((b.fontFamily || bodyFont).split(',')[0].replace(/['"]/g, '').trim())}"` : ''}`
      + `${b.fontWeight === '700' ? ' fo:font-weight="bold"' : ''}${b.fontStyle === 'italic' ? ' fo:font-style="italic"' : ''}/>`);
    const doc = new DOMParser().parseFromString(`<div>${b.html || ''}</div>`, 'text/html').body.firstChild;
    const paras = []; let cur = null, list = null;
    const newPara = inList => { cur = { runs: [], inList }; paras.push(cur); };
    const walk = (n, st) => {
      if (n.nodeType === 3) { if (!cur) newPara(!!list); if (n.data) cur.runs.push({ t: n.data, st }); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase(), s2 = { ...st };
      if (tag === 'b' || tag === 'strong') s2.b = 1;
      if (tag === 'i' || tag === 'em') s2.i = 1;
      if (tag === 'u') s2.u = 1;
      if (tag === 's' || tag === 'strike') s2.s = 1;
      if (tag === 'sup') s2.sup = 1; if (tag === 'sub') s2.sub = 1;
      if (n.style?.color) s2.c = n.style.color; if (n.getAttribute('color')) s2.c = n.getAttribute('color');
      if (n.style?.fontSize) s2.z = parseFloat(n.style.fontSize); if (n.style?.fontWeight >= 600 || n.style?.fontWeight === 'bold') s2.b = 1;
      if (n.style?.fontFamily) s2.f = n.style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      if (tag === 'br') { newPara(!!list); return; }
      if (tag === 'ul' || tag === 'ol') { const was = list; list = tag; for (const c of n.childNodes) walk(c, s2); list = was; cur = null; return; }
      const block = ['div', 'p', 'li', 'h1', 'h2', 'h3'].includes(tag);
      if (block) newPara(tag === 'li' || !!list);
      for (const c of n.childNodes) walk(c, s2);
      if (block) cur = null;
    };
    for (const c of doc.childNodes) walk(c, {});
    const rgb = c => { const m = /rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('') : hex(c); };
    const span = r => {
      const s = r.st; let props = '';
      if (s.b) props += ' fo:font-weight="bold"'; if (s.i) props += ' fo:font-style="italic"';
      if (s.u) props += ' style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"';
      if (s.s) props += ' style:text-line-through-style="solid"';
      if (s.sup) props += ' style:text-position="super 58%"'; if (s.sub) props += ' style:text-position="sub 58%"';
      if (s.c && rgb(s.c)) props += ` fo:color="${rgb(s.c)}"`; if (s.z) props += ` fo:font-size="${pt(s.z)}"`;
      if (s.f) props += ` style:font-name="${X(s.f)}"`;
      const txt = X(r.t).replace(/ {2,}/g, m => ' ' + `<text:s text:c="${m.length - 1}"/>`);
      return props ? `<text:span text:style-name="${style('text', 'T', `<style:text-properties${props}/>`)}">${txt}</text:span>` : txt;
    };
    let out = '', open = false;
    for (const p of paras) {
      const body = `<text:p text:style-name="${pStyle}">${p.runs.map(span).join('')}</text:p>`;
      if (p.inList && !open) { out += '<text:list>'; open = true; }
      if (!p.inList && open) { out += '</text:list>'; open = false; }
      out += p.inList ? `<text:list-item>${body}</text:list-item>` : body;
    }
    if (open) out += '</text:list>';
    return out || `<text:p text:style-name="${pStyle}"/>`;
  };

  // Position attributes, rotating about the centre like the editor does.
  const place = b => {
    const deg = b.rotation || 0;
    if (!deg) return `svg:x="${cm(b.x)}" svg:y="${cm(b.y)}" svg:width="${cm(b.w)}" svg:height="${cm(b.h)}"`;
    const a = -deg * Math.PI / 180;                        // ODF: positive = counter-clockwise
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const rx = (b.w / 2) * Math.cos(a) + (b.h / 2) * Math.sin(a), ry = -(b.w / 2) * Math.sin(a) + (b.h / 2) * Math.cos(a);
    return `svg:width="${cm(b.w)}" svg:height="${cm(b.h)}" draw:transform="rotate(${a.toFixed(6)}) translate(${cm(cx - rx)} ${cm(cy - ry)})"`;
  };
  // dash: 'dash' | 'dot' | 'dashDot' → the draw:stroke-dash styles in styles.xml.
  // Shadow (draw:shadow…) for a block's graphic style.
  const odpShadow = b => (b?.shadow ? ` draw:shadow="visible" draw:shadow-offset-x="${cm(b.shadow.x ?? 4)}" draw:shadow-offset-y="${cm(b.shadow.y ?? 6)}"`
    + ` draw:shadow-color="${String(b.shadow.color || '#000000').slice(0, 7)}" draw:shadow-opacity="${Math.round((String(b.shadow.color || '').length === 9 ? parseInt(b.shadow.color.slice(7), 16) / 255 : 0.4) * 100)}%"` : '');
  const gstyle = (fill, stroke, sw, extra = '', dash = null) => style('graphic', 'gr', `<style:graphic-properties draw:fill="${fill && fill !== 'none' ? 'solid' : 'none'}"`
    + `${hex(fill) ? ` draw:fill-color="${hex(fill)}"` : ''} draw:stroke="${stroke && stroke !== 'none' && sw !== 0 ? (dash ? 'dash' : 'solid') : 'none'}"`
    + `${dash && stroke && stroke !== 'none' && sw !== 0 ? ` draw:stroke-dash="Revela_${dash}"` : ''}`
    + `${hex(stroke) ? ` svg:stroke-color="${hex(stroke)}"` : ''}${sw ? ` svg:stroke-width="${cm(sw)}"` : ''}${extra}/>`);

  const svgPicture = (b, svg) => {
    const n = pic(new Blob([`<?xml version="1.0" encoding="UTF-8"?>${svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')}`], { type: 'image/svg+xml' }), 'svg');
    return `<draw:frame draw:style-name="${gstyle('none', 'none', 0)}" ${place(b)}><draw:image xlink:href="${n}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="image/svg+xml"/>`
      + `${b.alt ? `<svg:desc>${X(b.alt)}</svg:desc>` : ''}</draw:frame>`;
  };

  const objXML = (b) => {
    if (b.type === 'text') {
      const va = { middle: 'middle', bottom: 'bottom' }[b.vAlign] || 'top';
      const st = gstyle(b.bg || 'none', b.borderColor || 'none', b.borderColor ? 2 : 0, ` draw:textarea-vertical-align="${va}" fo:padding="0.1cm"`, b.borderDash);
      return `<draw:frame draw:style-name="${st}" ${place(b)}><draw:text-box>${textXML(b)}</draw:text-box></draw:frame>`;
    }
    if (b.type === 'image') {
      const d = dataURL(b.src); if (!d) return '';
      const ext = (d.mime.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      const n = pic(d.b64, ext);
      return `<draw:frame draw:style-name="${gstyle('none', 'none', 0)}" ${place(b)}><draw:image xlink:href="${n}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="${d.mime}"/>`
        + `${b.alt ? `<svg:desc>${X(b.alt)}</svg:desc>` : ''}</draw:frame>`;
    }
    if (b.type === 'shape') {
      const sw = b.strokeWidth ?? 2;
      if (b.shape === 'line' || b.shape === 'arrow') {
        const a = (b.rotation || 0) * Math.PI / 180, cx = b.x + b.w / 2, cy = b.y + b.h / 2, hw = b.w * 0.47;
        const st = gstyle('none', b.stroke || '#888888', sw, b.shape === 'arrow' ? ' draw:marker-end="Arrow" draw:marker-end-width="0.4cm"' : '', b.dash);
        return `<draw:line draw:style-name="${st}" svg:x1="${cm(cx - hw * Math.cos(a))}" svg:y1="${cm(cy - hw * Math.sin(a))}" svg:x2="${cm(cx + hw * Math.cos(a))}" svg:y2="${cm(cy + hw * Math.sin(a))}"/>`;
      }
      const st = gstyle(b.fill, b.stroke, sw, odpShadow(b), b.dash);
      if (b.shape === 'custom' && b.path) {
        const d = b.path.replace(/-?\d+(\.\d+)?/g, v => Math.round(+v * 100));
        return `<draw:path draw:style-name="${st}" ${place(b)} svg:viewBox="0 0 10000 10000" svg:d="${X(d)}"/>`;
      }
      return `<draw:custom-shape draw:style-name="${st}" ${place(b)}><draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:type="${ODF_SHAPE[b.shape] || 'rectangle'}"`
        + `${b.flipH ? ' draw:mirror-horizontal="true"' : ''}${b.flipV ? ' draw:mirror-vertical="true"' : ''}/></draw:custom-shape>`;
    }
    if (b.type === 'table') {
      const span = tableSpan(b), cols = b.rows[0]?.length || 1;
      const cellP = style('paragraph', 'P', `<style:text-properties fo:font-size="${pt(22)}" fo:color="${hex(fg) || '#ffffff'}"/>`);
      const cellSt = style('table-cell', 'ce', `<style:graphic-properties draw:fill="none"/><style:table-cell-properties fo:border="0.03cm solid ${hex(b.stroke) || '#888888'}"/>`);
      const rows = shownRows(b).map((row, r) => `<table:table-row>${row.map((c, j) => {
        const s = span(r, j);
        if (!s) return '<table:covered-table-cell/>';
        const t = new DOMParser().parseFromString(`<div>${c || ''}</div>`, 'text/html').body.textContent;
        return `<table:table-cell table:style-name="${cellSt}"${s.cs > 1 ? ` table:number-columns-spanned="${s.cs}"` : ''}${s.rs > 1 ? ` table:number-rows-spanned="${s.rs}"` : ''} office:value-type="string"><text:p text:style-name="${cellP}">${X(t)}</text:p></table:table-cell>`;
      }).join('')}</table:table-row>`).join('');
      return `<draw:frame ${place(b)}><table:table>${'<table:table-column/>'.repeat(cols)}${rows}</table:table></draw:frame>`;
    }
    if (b.type === 'code') {
      const st = gstyle('#1e1e1e', 'none', 0, ' draw:textarea-vertical-align="top" fo:padding="0.2cm"');
      const ps = style('paragraph', 'P', `<style:text-properties fo:font-size="${pt(b.fontSize || 22)}" fo:color="#e6e6e6" style:font-name="Courier New"/>`);
      return `<draw:frame draw:style-name="${st}" ${place(b)}><draw:text-box>${String(b.code || '').split('\n').map(l => `<text:p text:style-name="${ps}">${X(l).replace(/ {2,}/g, m => ' ' + `<text:s text:c="${m.length - 1}"/>`)}</text:p>`).join('')}</draw:text-box></draw:frame>`;
    }
    if (b.type === 'connector') {
      const f = byId.get(b.from), to = byId.get(b.to); if (!f || !to) return '';
      const st = gstyle('none', b.color || '#8a8a8a', 2, b.arrow !== false ? ' draw:marker-end="Arrow" draw:marker-end-width="0.3cm"' : '', b.dash);
      return `<draw:line draw:style-name="${st}" svg:x1="${cm(f.x + f.w / 2)}" svg:y1="${cm(f.y + f.h / 2)}" svg:x2="${cm(to.x + to.w / 2)}" svg:y2="${cm(to.y + to.h / 2)}"/>`;
    }
    if (raster.has(b.id)) {                                  // equations, polls, figure lists
      const n = pic(raster.get(b.id).split(',')[1], 'png');
      return `<draw:frame draw:style-name="${gstyle('none', 'none', 0)}" ${place(b)}><draw:image xlink:href="${n}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="image/png"/></draw:frame>`;
    }
    if (b.type === 'chart') return svgPicture(b, chartSVG(b));
    if (b.type === 'icon') return svgPicture(b, iconSVG(b));
    if (b.type === 'ink') return svgPicture(b, inkSVG(b));
    if (b.type === 'timer') return svgPicture(b, timerSVG(b));
    return '';                                             // 3D, video, web, code, equations: no ODF equivalent here
  };

  let byId = new Map();
  const raster = new Map();
  for (const s of [deck.master || { blocks: [] }, ...deck.slides]) for (const b of s.blocks)
    if (b.type === 'file' && b.poster) raster.set(b.id, b.poster);
    else if (['math', 'poll', 'figindex', 'file'].includes(b.type)) { try { const img = await blockImage(b, s, deck); if (img) raster.set(b.id, img); } catch {} }
  const pages = deck.slides.map((s, i) => {
    const bg = hex(s.background) || '#101317';
    const dp = style('drawing-page', 'dp', `<style:drawing-page-properties draw:fill="solid" draw:fill-color="${bg}" presentation:background-visible="true"${odpTransition(s, deck)}/>`);
    const list = [...masterBlocksFor(s, deck), ...s.blocks.map(b => styled(b, s, deck))].filter(b => !b.hidden && !isEmptyPlaceholder(b));
    byId = new Map(list.map(b => [b.id, b]));
    // Objects that are animated or start animations get an id the timing refers to.
    const named = new Set(s.blocks.flatMap(b => animsOf(b).flatMap(a => [b.id, a.trigger])).filter(Boolean));
    const xids = new Map();
    const objs = list.map(b => {
      const xml = objXML(b);
      if (!xml || !named.has(b.id)) return xml;
      const xid = 'rv-' + String(b.id).replace(/[^\w.-]/g, '_'); xids.set(b.id, xid);
      return xml.replace(/^<([\w:-]+)/, `<$1 xml:id="${xid}" draw:id="${xid}"`);
    }).join('');
    const anim = odpTimingXML(s, id => xids.get(id) || '', deck);
    const notes = s.notes ? `<presentation:notes><draw:frame presentation:class="notes" svg:x="2cm" svg:y="12cm" svg:width="17cm" svg:height="12cm"><draw:text-box>`
      + s.notes.split('\n').map(l => `<text:p>${X(l)}</text:p>`).join('') + '</draw:text-box></draw:frame></presentation:notes>' : '';
    // Comments, as LibreOffice's annotations (threads, tasks and "resolved" as text: commentText).
    const notes2 = (s.comments || []).map(c => {
      const bl = c.blockId && s.blocks.find(x => x.id === c.blockId), at = `svg:x="${cm((bl ? bl.x + bl.w : 20))}" svg:y="${cm(bl ? bl.y : 20)}" svg:width="4cm" svg:height="2cm"`;
      return [[commentText(c), c.author, c.time], ...(c.replies || []).map(r => ['↪ ' + r.text, r.author, r.time])].map(([text, a, time]) =>
        `<officeooo:annotation ${at}><dc:creator>${X(a || '')}</dc:creator><dc:date>${new Date(time || Date.now()).toISOString().replace('Z', '')}</dc:date>`
        + text.split('\n').map(l => `<text:p>${X(l)}</text:p>`).join('') + '</officeooo:annotation>').join('');
    }).join('');
    return `<draw:page draw:name="${X('page' + (i + 1))}" draw:style-name="${dp}" draw:master-page-name="Default"${s.hidden ? ' presentation:visibility="hidden"' : ''}>${objs}${notes2}${anim}${notes}</draw:page>`;
  }).join('');

  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}><office:automatic-styles>`
    + [...auto.values()].map(a => a.xml).join('') + `</office:automatic-styles><office:body><office:presentation>${pages}</office:presentation></office:body></office:document-content>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}><office:styles>`
    + `<draw:marker draw:name="Arrow" svg:viewBox="0 0 20 30" svg:d="M10 0l-10 30h20z"/>`
    + `<draw:stroke-dash draw:name="Revela_dash" draw:style="rect" draw:dots1="1" draw:dots1-length="0.3cm" draw:distance="0.2cm"/>`
    + `<draw:stroke-dash draw:name="Revela_dot" draw:style="round" draw:dots1="1" draw:dots1-length="0.02cm" draw:distance="0.12cm"/>`
    + `<draw:stroke-dash draw:name="Revela_dashDot" draw:style="rect" draw:dots1="1" draw:dots1-length="0.3cm" draw:dots2="1" draw:dots2-length="0.05cm" draw:distance="0.15cm"/></office:styles>`
    + `<office:automatic-styles><style:page-layout style:name="PM1"><style:page-layout-properties fo:margin-top="0cm" fo:margin-bottom="0cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:page-width="${cm(W)}" fo:page-height="${cm(H)}" style:print-orientation="landscape"/></style:page-layout></office:automatic-styles>`
    + `<office:master-styles><style:master-page style:name="Default" style:page-layout-name="PM1"/></office:master-styles></office:document-styles>`;
  const meta = `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${NS}><office:meta><meta:generator>Revela</meta:generator><dc:title>${X(deck.name || '')}</dc:title></office:meta></office:document-meta>`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">`
    + `<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.presentation"/>`
    + ['content.xml', 'styles.xml', 'meta.xml'].map(f => `<manifest:file-entry manifest:full-path="${f}" manifest:media-type="text/xml"/>`).join('')
    + pictures.map(p => `<manifest:file-entry manifest:full-path="${p.n}" manifest:media-type="${p.n.endsWith('.svg') ? 'image/svg+xml' : 'image/' + p.n.split('.').pop().replace('jpg', 'jpeg')}"/>`).join('')
    + '</manifest:manifest>';

  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.presentation', { compression: 'STORE' });   // must be first and stored
  zip.file('content.xml', content); zip.file('styles.xml', styles); zip.file('meta.xml', meta);
  zip.file('META-INF/manifest.xml', manifest);
  for (const p of pictures) zip.file(p.n, p.data, typeof p.data === 'string' ? { base64: true } : {});
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.oasis.opendocument.presentation' });
}

// ---- Import ----------------------------------------------------------------
export async function importODP(file) {
  const JSZip = await loadZip();
  const zip = await JSZip.loadAsync(file);
  const doc = new DOMParser().parseFromString(await zip.file('content.xml').async('string'), 'application/xml');
  const stylesDoc = zip.file('styles.xml') ? new DOMParser().parseFromString(await zip.file('styles.xml').async('string'), 'application/xml') : null;
  const all = (el, n) => (el ? [...el.getElementsByTagName(n)] : []);
  const kids = el => (el ? [...el.children] : []);

  // Page size → canvas scale.
  // The slide size comes from the page layout of the first master page (other
  // layouts in the file are for notes or handouts).
  const mp = all(stylesDoc, 'style:master-page')[0], plName = mp?.getAttribute('style:page-layout-name');
  const layoutEl = all(stylesDoc, 'style:page-layout').find(l => l.getAttribute('style:name') === plName);
  const pl = all(layoutEl, 'style:page-layout-properties')[0] || all(stylesDoc, 'style:page-layout-properties')[0];
  const len = v => { const m = /([-\d.]+)(cm|mm|in|pt|px)?/.exec(v || ''); if (!m) return 0; const n = +m[1]; return { mm: n / 10, in: n * 2.54, pt: n / 28.3465, px: n / 37.8 }[m[2]] ?? n; };
  const pw = len(pl?.getAttribute('fo:page-width')) || 28, ph = len(pl?.getAttribute('fo:page-height')) || 15.75;
  const S = 1280 / pw, px = v => Math.round(len(v) * S);
  const size = { w: 1280, h: Math.round(ph * S) };

  // Automatic styles (content + styles): graphic fills, text props, page backgrounds.
  const st = {};
  for (const s of [...all(doc, 'style:style'), ...all(stylesDoc, 'style:style')]) st[s.getAttribute('style:name')] = s;
  const prop = (name, tag, attr) => all(st[name], tag)[0]?.getAttribute(attr) || null;
  const media = async href => {
    const f = zip.file(href); if (!f) return null;
    const ext = href.split('.').pop().toLowerCase();
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' }[ext] || 'image/png';
    return `data:${mime};base64,${await f.async('base64')}`;
  };
  const textHTML = el => {
    const para = p => {
      const run = n => {
        if (n.nodeType === 3) return X(n.data);
        if (n.tagName === 'text:s') return ' '.repeat(+(n.getAttribute('text:c') || 1));
        if (n.tagName === 'text:line-break') return '<br>';
        if (n.tagName === 'text:tab') return '\t';
        const inner = [...n.childNodes].map(run).join('');
        if (n.tagName !== 'text:span') return inner;
        const sn = n.getAttribute('text:style-name'); let h = inner;
        const c = colour(prop(sn, 'style:text-properties', 'fo:color')), z = prop(sn, 'style:text-properties', 'fo:font-size');
        if (c || z) h = `<span style="${c ? `color:${c};` : ''}${z ? `font-size:${Math.round(len(z) * S)}px` : ''}">${h}</span>`;
        if (prop(sn, 'style:text-properties', 'fo:font-weight') === 'bold') h = `<b>${h}</b>`;
        if (prop(sn, 'style:text-properties', 'fo:font-style') === 'italic') h = `<i>${h}</i>`;
        if ((prop(sn, 'style:text-properties', 'style:text-underline-style') || 'none') !== 'none') h = `<u>${h}</u>`;
        return h;
      };
      return [...p.childNodes].map(run).join('');
    };
    let out = '';
    for (const n of kids(el)) {
      if (n.tagName === 'text:p' || n.tagName === 'text:h') out += `<div>${para(n) || '<br>'}</div>`;
      else if (n.tagName === 'text:list') out += `<ul>${all(n, 'text:p').map(p => `<li>${para(p)}</li>`).join('')}</ul>`;
    }
    return out;
  };
  const geo = el => {
    const tr = el.getAttribute('draw:transform');
    let x = px(el.getAttribute('svg:x')), y = px(el.getAttribute('svg:y')), rotation = 0;
    const w = Math.max(1, px(el.getAttribute('svg:width'))), h = Math.max(1, px(el.getAttribute('svg:height')));
    if (tr) {
      const r = /rotate\s*\(\s*([-\d.e]+)\s*\)/.exec(tr), t = /translate\s*\(\s*([^\s,)]+)[\s,]+([^\s)]+)\s*\)/.exec(tr);
      const a = r ? +r[1] : 0; rotation = Math.round(((-a * 180 / Math.PI) % 360 + 360) % 360);
      if (t) {                                              // back from "rotate about the corner, then move" to our centre rotation
        const tx = len(t[1]) * S, ty = len(t[2]) * S;
        const rx = (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a), ry = -(w / 2) * Math.sin(a) + (h / 2) * Math.cos(a);
        x = Math.round(tx + rx - w / 2); y = Math.round(ty + ry - h / 2);
      }
    }
    return { x, y, w, h, rotation, animation: null };
  };
  const fillOf = name => (prop(name, 'style:graphic-properties', 'draw:fill') === 'solid' ? prop(name, 'style:graphic-properties', 'draw:fill-color') : 'none');
  const strokeOf = name => (prop(name, 'style:graphic-properties', 'draw:stroke') === 'none' ? 'none' : (prop(name, 'style:graphic-properties', 'svg:stroke-color') || '#000000'));
  // Dashed outlines: the stroke-dash style's name says which (Revela's own, or a guess).
  const dashOf = name => { if (prop(name, 'style:graphic-properties', 'draw:stroke') !== 'dash') return null;
    const n = prop(name, 'style:graphic-properties', 'draw:stroke-dash') || ''; return /dashdot/i.test(n) ? 'dashDot' : /dot/i.test(n) ? 'dot' : 'dash'; };

  const slides = [];
  for (const page of all(doc, 'draw:page')) {
    const blocks = [], byXid = new Map();
    for (const el of kids(page)) {
      const n0 = blocks.length; await readObject(el);
      const xid = el.getAttribute('xml:id') || el.getAttribute('draw:id');
      if (xid && blocks.length > n0) byXid.set(xid, blocks[n0]);
    }
    readODPAnimations(page, id => byXid.get(id), size);
    async function readObject(el) {
      const tag = el.tagName, sn = el.getAttribute('draw:style-name');
      if (tag === 'draw:frame') {
        const img = el.getElementsByTagName('draw:image')[0], tb = el.getElementsByTagName('draw:text-box')[0], tbl = el.getElementsByTagName('table:table')[0];
        if (tbl) {
          const rows = [], merges = [];
          all(tbl, 'table:table-row').forEach((tr, r) => {
            const row = [];
            for (const c of kids(tr)) {
              if (c.tagName === 'table:covered-table-cell') { row.push(''); continue; }
              if (c.tagName !== 'table:table-cell') continue;
              const cs = +(c.getAttribute('table:number-columns-spanned') || 1), rs = +(c.getAttribute('table:number-rows-spanned') || 1);
              if (cs > 1 || rs > 1) merges.push({ r, c: row.length, rs, cs });
              row.push(all(c, 'text:p').map(p => X(p.textContent)).join('<br>'));
            }
            rows.push(row);
          });
          blocks.push({ id: uid(), type: 'table', rows, stroke: '#888888', ...(merges.length && { merges }), ...geo(el) });
        } else if (img) {
          const src = await media(img.getAttribute('xlink:href')); if (!src) return;
          const alt = el.getElementsByTagName('svg:desc')[0]?.textContent || '';
          blocks.push({ id: uid(), type: 'image', src, fit: 'fill', ...(alt && { alt }), ...geo(el) });
        } else if (tb) {
          let html = textHTML(tb); if (!html.replace(/<[^>]*>/g, '').trim()) return;
          const pz = all(tb, 'text:p')[0]?.getAttribute('text:style-name');
          const z = prop(pz, 'style:text-properties', 'fo:font-size');
          const al = { center: 'center', end: 'right', right: 'right', justify: 'justify' }[prop(pz, 'style:paragraph-properties', 'fo:text-align')];
          const va = { middle: 'middle', bottom: 'bottom' }[prop(sn, 'style:graphic-properties', 'draw:textarea-vertical-align')];
          const pc = colour(prop(pz, 'style:text-properties', 'fo:color')); if (pc) html = `<div style="color:${pc}">${html}</div>`;
          blocks.push({ id: uid(), type: 'text', html, fontSize: z ? Math.round(len(z) * S) : 28, ...(al && { textAlign: al }), ...(va && { vAlign: va }), ...geo(el) });
        }
      } else if (tag === 'draw:custom-shape' || tag === 'draw:rect' || tag === 'draw:ellipse') {
        const eg = el.getElementsByTagName('draw:enhanced-geometry')[0];
        const shape = tag === 'draw:ellipse' ? 'ellipse' : tag === 'draw:rect' ? 'rect' : (FROM_ODF[eg?.getAttribute('draw:type')] || 'rect');
        blocks.push({ id: uid(), type: 'shape', shape, fill: fillOf(sn), stroke: strokeOf(sn), strokeWidth: 2, ...(dashOf(sn) && { dash: dashOf(sn) }), ...geo(el),
          ...(eg?.getAttribute('draw:mirror-horizontal') === 'true' && { flipH: true }), ...(eg?.getAttribute('draw:mirror-vertical') === 'true' && { flipV: true }) });
        const html = textHTML(el); if (html.replace(/<[^>]*>/g, '').trim()) blocks.push({ id: uid(), type: 'text', html, fontSize: 28, textAlign: 'center', vAlign: 'middle', ...geo(el) });
      } else if (tag === 'draw:line') {
        const x1 = px(el.getAttribute('svg:x1')), y1 = px(el.getAttribute('svg:y1')), x2 = px(el.getAttribute('svg:x2')), y2 = px(el.getAttribute('svg:y2'));
        const L = Math.hypot(x2 - x1, y2 - y1) / 0.94, cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const arrow = !!prop(sn, 'style:graphic-properties', 'draw:marker-end');
        blocks.push({ id: uid(), type: 'shape', shape: arrow ? 'arrow' : 'line', fill: 'none', stroke: strokeOf(sn), strokeWidth: 2, ...(dashOf(sn) && { dash: dashOf(sn) }),
          x: Math.round(cx - L / 2), y: Math.round(cy - 20), w: Math.round(L), h: 40, rotation: Math.round(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI), animation: null });
      } else if (tag === 'draw:path') {
        blocks.push({ id: uid(), type: 'shape', shape: 'custom', path: (el.getAttribute('svg:d') || '').replace(/-?\d+(\.\d+)?/g, v => +(v / 100).toFixed(2)),
          fill: fillOf(sn), stroke: strokeOf(sn), strokeWidth: 2, ...(dashOf(sn) && { dash: dashOf(sn) }), ...geo(el) });
      }
    }
    const dp = page.getAttribute('draw:style-name');
    const background = prop(dp, 'style:drawing-page-properties', 'draw:fill-color') || '#ffffff';
    const notes = all(page.getElementsByTagName('presentation:notes')[0], 'text:p').map(p => p.textContent).join('\n');
    const smil = prop(dp, 'style:drawing-page-properties', 'smil:type');
    const dur = (prop(dp, 'style:drawing-page-properties', 'presentation:duration') || '').match(/PT([\d.]+)S/);
    const auto = prop(dp, 'style:drawing-page-properties', 'presentation:transition-type') === 'automatic' && dur ? Math.round(+dur[1] * 1000) : 0;
    const [transition, transitionDir] = fromSmil(smil, prop(dp, 'style:drawing-page-properties', 'smil:subtype'), prop(dp, 'style:drawing-page-properties', 'smil:direction') === 'reverse');
    // LibreOffice's comments (annotations), with Revela's threads, tasks and "resolved" in their text.
    const comments = [];
    for (const an of kids(page).filter(e => /(^|:)annotation$/.test(e.tagName))) {
      const p = parseCommentText(all(an, 'text:p').map(x => x.textContent).join('\n'));
      const author = an.getElementsByTagName('dc:creator')[0]?.textContent || '', t = Date.parse(an.getElementsByTagName('dc:date')[0]?.textContent || '');
      const time = Number.isFinite(t) ? t : Date.now();
      if (p.reply && comments.length) { comments.at(-1).replies.push({ id: uid(), text: p.text, author, time }); continue; }
      delete p.reply; comments.push({ id: uid(), author, time, blockId: null, replies: [], ...p });
    }
    slides.push({ id: uid(), sectionId: null, background, transition, ...(transitionDir && { transitionDir }), notes, autoSlide: auto, ...(comments.length && { comments }),
      hidden: page.getAttribute('presentation:visibility') === 'hidden' || prop(dp, 'style:drawing-page-properties', 'presentation:visibility') === 'hidden', blocks });
  }
  if (!slides.length) throw new Error('No se encontraron diapositivas en el archivo.');
  return { version: 3, name: (file.name || '').replace(/\.odp$/i, '') || 'Presentación', size, theme: 'white', defaultTransition: 'slide',
    transitionSpeed: 'default', sections: [], master: { id: 'master', blocks: [], background: null },
    slideNumber: { show: false, position: 'br', format: 'c' }, footer: { show: false, text: '', date: false },
    logo: { src: '', position: 'br', size: 120 }, loop: false, guides: { v: [], h: [] }, textColor: '#000000', slides };
}
