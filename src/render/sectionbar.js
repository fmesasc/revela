// The sections bar, as LaTeX Beamer's: where the talk is. Along the top (or the bottom) of each slide, the deck's
// sections by name — the one this slide is in, marked — and, unless «Solo nombres», under each name where this slide
// is in it: a dot per slide (filled on this one), «2/5», or a progress bar. A name or a mark takes you there (a link
// to that slide) when presenting. It belongs to the slide (drawn inside it, at the slide's size), so it shows the same
// on the canvas, the thumbnails, the presentation and its pictures (PDF, images). Pure: no DOM, used by the export
// (io/formats/html.js) and the editor.
//
// deck.sectionBar = { show, position: 'top'|'bottom'|'left'|'right', style: 'dots'|'names'|'current' (what it lists:
// the sections with their marks, their names alone, or the current one with its marks), look: 'band'|'color'|'tabs'|
// 'minimal'|'pills'|'chevrons'|'underline'|'float' (as Beamer's themes: a soft band, a band in the theme's colour, the
// current section on a tab, text alone, each section a pill, arrows as steps, the current one underlined, a floating
// rounded bar), marks: 'dots'|'count'|'progress', size (letters, % — 100 by default), font: 'deck'|'system', bg / fg /
// accent (colours of its own; by default the slide's text colour and the theme's accent), skipTitle }.
// And, from 2026-10-19 (Francisco: «más personalizable, diferentes estilos, modos»), all optional:
//   mode: 'sections' (the above, by default) | 'breadcrumb' (Presentación › Sección › the slide's title) | 'infolines'
//     (Beamer's Madrid: a footer of three boxes — a text, the presentation's name, the section and n / N) | 'sidebar'
//     (Beamer's sidebar: the sections as an index down one side) | 'progress' (only a thin line: how far the talk is);
//   align: 'start'|'center'|'end'|'spread'; numbered (1. Introducción); case: 'upper'|'small' (small capitals);
//   done: 'dim'|'full'|'check' (the sections already given: faint, as the rest, or with ✓); next: 'dim'|'full'|'hide'
//   (those to come); sep: a separator between sections ('|', '•', '›', '/'); deckProgress (a thin line along the bar:
//   how far the whole talk is); width (the side index's width, % of the slide; 20); left (the infolines' first box;
//   by default the footer's text).
// A section's short name (sec.short, as Beamer's \section[short]{long}) is what the bar shows, when it has one.
// A slide with noSectionBar has none (a cover, a full-bleed picture…); with skipTitle (the default), neither do the
// slides with the «Portada» layout.

export const SECTION_BAR_STYLES = [['dots', 'Todas las secciones'], ['names', 'Solo nombres'], ['current', 'Solo la sección actual']];
export const SECTION_BAR_LOOKS = [['band', 'Franja suave'], ['color', 'Franja de color'], ['tabs', 'Pestañas'], ['minimal', 'Mínima'],
  ['pills', 'Píldoras'], ['chevrons', 'Flechas (pasos)'], ['underline', 'Subrayada'], ['float', 'Flotante, con esquinas redondeadas']];
export const SECTION_BAR_MARKS = [['dots', 'Puntos'], ['count', 'Número (2/5)'], ['progress', 'Barra de progreso']];
export const SECTION_BAR_MODES = [['sections', 'Secciones'], ['breadcrumb', 'Migas de pan (Presentación › Sección › Diapositiva)'],
  ['infolines', 'Pie informativo (tres recuadros)'], ['sidebar', 'Índice lateral'], ['progress', 'Solo una línea de progreso']];
export const SECTION_BAR_POSITIONS = [['top', 'Arriba'], ['bottom', 'Abajo'], ['left', 'A la izquierda'], ['right', 'A la derecha']];
export const SECTION_BAR_ALIGNS = [['start', 'Al principio'], ['center', 'Centradas'], ['end', 'Al final'], ['spread', 'Repartidas']];
export const SECTION_BAR_CASES = [['', 'Normal'], ['upper', 'MAYÚSCULAS'], ['small', 'Versalitas']];
export const SECTION_BAR_DONE = [['dim', 'Más claras'], ['full', 'Igual que las demás'], ['check', 'Con ✓']];
export const SECTION_BAR_NEXT = [['dim', 'Más claras'], ['full', 'Igual que las demás'], ['hide', 'Ocultas (sin adelantar el final)']];
export const SECTION_BAR_SEPS = [['', 'Ninguno'], ['|', '|'], ['•', '•'], ['›', '›'], ['/', '/']];
// Ready-made looks, as Beamer's themes: each one a set of the options above (the colours, size, letters and «no bar
// on covers» stay as they are).
export const SECTION_BAR_PRESETS = [
  ['beamer', 'Beamer clásico', { mode: 'sections', position: 'top', look: 'band', style: 'dots', marks: 'dots' }],
  ['tabs', 'Pestañas', { mode: 'sections', position: 'top', look: 'tabs', style: 'dots', marks: 'count' }],
  ['pills', 'Píldoras', { mode: 'sections', position: 'top', look: 'pills', style: 'names', align: 'center' }],
  ['steps', 'Pasos', { mode: 'sections', position: 'top', look: 'chevrons', style: 'names', numbered: true, done: 'check' }],
  ['underline', 'Elegante', { mode: 'sections', position: 'top', look: 'underline', style: 'names', case: 'upper', align: 'center', deckProgress: true }],
  ['breadcrumb', 'Migas de pan', { mode: 'breadcrumb', position: 'top', look: 'minimal', sep: '›' }],
  ['infolines', 'Pie informativo', { mode: 'infolines', position: 'bottom', look: 'color' }],
  ['sidebar', 'Índice lateral', { mode: 'sidebar', position: 'left', look: 'band', marks: 'dots' }],
  ['progress', 'Línea de progreso', { mode: 'progress', position: 'top' }],
];
// What a preset sets (cleared before applying one, so the last one chosen is what shows).
export const PRESET_KEYS = ['mode', 'position', 'look', 'style', 'marks', 'align', 'numbered', 'case', 'done', 'next', 'sep', 'deckProgress'];
export function applyPreset(sb, key) {
  const p = SECTION_BAR_PRESETS.find(x => x[0] === key); if (!p) return sb;
  for (const k of PRESET_KEYS) delete sb[k];
  return Object.assign(sb, { style: 'dots', position: 'top' }, p[2]);
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : null;
// Words on a colour: dark on a light one, white on the rest.
const inkOn = c => { const v = parseInt((hex(c) || '#3f6497').slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) > 165 ? '#1e2a3a' : '#ffffff'; };
const plain = html => String(html ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const modeOf = sb => (['breadcrumb', 'infolines', 'sidebar', 'progress'].includes(sb?.mode) ? sb.mode : sb?.position === 'left' || sb?.position === 'right' ? 'sidebar' : 'sections');
const SIDES = ['left', 'right'];

// The sections that have slides to show, each with its visible slides (hidden ones are skipped when presenting).
export function barSections(deck) {
  const vis = (deck.slides || []).filter(s => !s.hidden);
  return (deck.sections || []).map(sec => ({ sec, slides: vis.filter(s => s.sectionId === sec.id) })).filter(x => x.slides.length);
}
// A section's name in the bar: its short one if it has it.
export const barName = sec => String(sec?.short || '').trim() || String(sec?.name || '');

// Whether this slide shows the bar. (The modes that list sections need some; a breadcrumb, the infolines and the
// progress line make sense without.)
export function sectionBarOn(deck, slide) {
  const sb = deck?.sectionBar;
  if (!sb?.show || !slide || slide.noSectionBar || slide.hidden) return false;
  if (sb.skipTitle !== false && slide.layoutId === 'title') return false;
  const m = modeOf(sb);
  return m === 'sections' || m === 'sidebar' ? barSections(deck).length > 0 : true;
}

const MAX_DOTS = 12;
const sizeOf = sb => Math.min(2, Math.max(0.6, (+sb?.size || 100) / 100));
const floatGap = (sb, W) => (sb?.look === 'float' ? Math.round(12 * W / 1280) : 0);
// Its height on a slide of this width (the slide's content should leave it room); a side index: 0 (see its width).
export const sectionBarHeight = deck => {
  const sb = deck.sectionBar || {}, W = deck.size?.w || 1280, k = sizeOf(sb) * (W / 1280), m = modeOf(sb);
  if (m === 'sidebar') return 0;
  if (m === 'progress') return Math.max(3, Math.round(6 * k));
  if (m === 'breadcrumb' || m === 'infolines') return Math.round(32 * k);
  return Math.round(((sb.style || 'dots') !== 'names' ? 44 : 32) * k);
};
// A side index's width.
export const sectionBarWidth = deck => {
  const sb = deck.sectionBar || {}; if (modeOf(sb) !== 'sidebar') return 0;
  return Math.round((deck.size?.w || 1280) * Math.min(35, Math.max(12, +sb.width || 20)) / 100);
};

// The bar as HTML, absolutely placed in the slide. fg: the slide's text colour; accent: the theme's; font: the
// presentation's letters (a CSS font-family); link: names and marks as links (#/n, n = the slide among the visible
// ones, as the presentation numbers them); label: the bar's name for screen readers.
export function sectionBarHTML(deck, slide, { fg = '#ffffff', accent = '#3f6497', font = '', link = true, label = 'Secciones' } = {}) {
  if (!sectionBarOn(deck, slide)) return '';
  const sb = deck.sectionBar, W = deck.size?.w || 1280, H = deck.size?.h || 720, k = W / 1280 * sizeOf(sb), style = sb.style || 'dots', top = sb.position !== 'bottom';
  const look = sb.look || 'band', marks = sb.marks || 'dots', px = v => Math.max(1, Math.round(v * k)), mode = modeOf(sb);
  const acc = hex(sb.accent) || hex(accent) || '#3f6497';
  // The colours: its own, else from the look — the slide's text on a soft band; white (or dark) on the accent…
  const bg = hex(sb.bg) || (look === 'color' ? acc : look === 'band' ? `color-mix(in srgb,${fg} 9%,transparent)` : look === 'float' ? `color-mix(in srgb,${fg} 8%,transparent)` : 'transparent');
  const ink = hex(sb.fg) || (look === 'color' ? inkOn(hex(sb.bg) || acc) : fg);
  const onTab = inkOn(acc);                       // (the current section's words on its tab)
  const vis = (deck.slides || []).filter(s => !s.hidden), at = s => vis.indexOf(s);
  const secs = barSections(deck), cur = secs.find(x => x.slides.some(s => s.id === slide.id));
  const curIx = secs.indexOf(cur);
  const go = (s, inner, css, title = '') => (link
    ? `<a href="#/${at(s)}"${title ? ` title="${esc(title)}"` : ''} style="color:inherit;text-decoration:none;${css}">${inner}</a>`
    : `<span${title ? ` title="${esc(title)}"` : ''} style="${css}">${inner}</span>`);
  const fam = sb.font === 'system' || !font ? "system-ui,-apple-system,'Segoe UI',sans-serif" : font;
  const caseCss = sb.case === 'upper' ? 'text-transform:uppercase;letter-spacing:.06em;' : sb.case === 'small' ? 'font-variant:small-caps;letter-spacing:.03em;' : '';
  const nameOf = x => (sb.numbered ? `${secs.indexOf(x) + 1}. ` : '') + barName(x.sec);
  const sepHTML = sb.sep ? `<span aria-hidden="true" style="flex:0 0 auto;opacity:.45">${esc(sb.sep)}</span>` : '';
  // (How far the whole talk is: this slide among the visible ones.)
  const done = vis.length ? (at(slide) + 1) / vis.length : 0;
  const track = (h, edge) => `<span aria-hidden="true" style="position:absolute;left:0;right:0;${edge}:0;height:${h}px;background:color-mix(in srgb,${ink} 14%,transparent)">`
    + `<span style="display:block;height:100%;width:${(done * 100).toFixed(1)}%;background:${acc}"></span></span>`;
  const navStart = (box, extra = '') => `<nav class="rv-secbar" data-id="rv-secbar" data-mode="${mode}" aria-label="${esc(label)}" style="position:absolute;${box}`
    + `box-sizing:border-box;${extra}font-weight:500;font-size:${px(15)}px;line-height:1.15;font-family:${fam.replace(/"/g, "'")};color:${ink};${caseCss}z-index:5">`;

  // Only a line: how far the talk is (Metropolis).
  if (mode === 'progress') {
    const h = sectionBarHeight(deck);
    return navStart(`left:0;${top ? 'top:0' : 'bottom:0'};width:${W}px;height:${h}px;`, 'overflow:hidden;') + track(h, top ? 'top' : 'bottom') + '</nav>';
  }

  // Presentación › Sección › the slide's title.
  if (mode === 'breadcrumb') {
    const title = plain((slide.blocks || []).find(b => b.ph === 'title' || b.ph === 'ctrTitle')?.html);
    const sep = `<span aria-hidden="true" style="flex:0 0 auto;opacity:.45">${esc(sb.sep || '›')}</span>`;
    const parts = [];
    if (deck.name) parts.push(go(vis[0] || slide, esc(deck.name), 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.7;flex:0 1 auto;min-width:0'));
    if (cur) parts.push(go(cur.slides[0], esc(nameOf(cur)), `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;min-width:0;${title ? 'opacity:.85;' : 'font-weight:700;'}`));
    if (title && title !== barName(cur?.sec)) parts.push(`<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;flex:0 1 auto;min-width:0">${esc(title)}</span>`);
    if (!parts.length) return '';
    const h = sectionBarHeight(deck), g = floatGap(sb, W);
    return navStart(g ? `left:${g}px;${top ? 'top' : 'bottom'}:${g}px;width:${W - 2 * g}px;height:${h}px;border-radius:${px(10)}px;` : `left:0;${top ? 'top:0' : 'bottom:0'};width:${W}px;height:${h}px;`,
      `padding:0 ${px(28)}px;display:flex;align-items:center;${alignCss(sb.align)}gap:${px(10)}px;overflow:hidden;background:${bg};`
      + (look === 'minimal' || look === 'float' ? '' : `${top ? 'border-bottom' : 'border-top'}:1px solid color-mix(in srgb,${ink} 18%,transparent);`))
      + parts.join(sep) + (sb.deckProgress ? track(Math.max(2, px(3)), top ? 'bottom' : 'top') : '') + '</nav>';
  }

  // Beamer's infolines (Madrid): three boxes — a text, the presentation's name, the section and the slide's number.
  if (mode === 'infolines') {
    const h = sectionBarHeight(deck), n = at(slide) + 1, left = String(sb.left ?? deck.footer?.text ?? '').trim();
    const filled = look === 'color' || look === 'pills' || look === 'chevrons';
    const cell = (inner, shade, align) => `<span style="flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:${align};padding:0 ${px(16)}px;`
      + `${filled ? `background:color-mix(in srgb,${acc} ${shade}%,${look === 'color' ? '#000' : '#fff'});color:${inkOn(acc)};` : ''}white-space:nowrap;overflow:hidden">`
      + `<span style="overflow:hidden;text-overflow:ellipsis">${inner}</span></span>`;
    const right = (cur ? `<b>${esc(nameOf(cur))}</b>` : '') + `<span style="margin-inline-start:${px(14)}px;opacity:.85;font-variant-numeric:tabular-nums">${n} / ${vis.length}</span>`;
    return navStart(`left:0;${top ? 'top:0' : 'bottom:0'};width:${W}px;height:${h}px;`, `display:flex;align-items:stretch;overflow:hidden;background:${filled ? 'transparent' : bg};`
      + (filled || look === 'minimal' ? '' : `${top ? 'border-bottom' : 'border-top'}:1px solid color-mix(in srgb,${ink} 18%,transparent);`))
      + cell(esc(left), 70, 'center') + cell(`<b>${esc(deck.name || '')}</b>`, 85, 'center') + cell(right, 100, 'center')
      + (sb.deckProgress ? track(Math.max(2, px(3)), top ? 'bottom' : 'top') : '') + '</nav>';
  }

  const d = Math.max(4, px(7));
  const markOf = (x, on) => {
    const i = x.slides.findIndex(s => s.id === slide.id);
    // (Dots for a long section — a hundred slides — took half the bar: past MAX_DOTS, its progress instead.)
    if (marks === 'dots' && x.slides.length > (compact ? 4 : MAX_DOTS)) return markAs('progress', x, on, i);
    return markAs(marks, x, on, i);
  };
  const markAs = (marks, x, on, i) => {
    if (marks === 'count') return on ? `<span style="font-size:.8em;opacity:.85;white-space:nowrap">${i + 1}/${x.slides.length}</span>` : `<span style="font-size:.8em;opacity:.7">${x.slides.length}</span>`;
    if (marks === 'progress') {
      // (Past sections full, coming ones empty, this one as far as this slide.)
      const ix = secs.indexOf(x), part = on ? (i + 1) / x.slides.length : curIx >= 0 && ix < curIx ? 1 : 0;
      return `<span style="display:block;width:${px(compact && !on ? 28 : 64)}px;height:${Math.max(2, px(4))}px;border-radius:${px(2)}px;background:color-mix(in srgb,currentColor 25%,transparent);overflow:hidden">`
        + `<span style="display:block;height:100%;width:${(part * 100).toFixed(1)}%;background:currentColor"></span></span>`;
    }
    return `<span style="display:flex;gap:${px(4)}px;flex-wrap:${mode === 'sidebar' ? 'wrap' : 'nowrap'}">${x.slides.map((s, j) =>
      go(s, '', `display:block;width:${d}px;height:${d}px;border-radius:50%;box-sizing:border-box;border:${Math.max(1, 1.3 * k).toFixed(1)}px solid currentColor;${s.id === slide.id ? 'background:currentColor;' : ''}`,
        `${x.sec.name} · ${j + 1}`)).join('')}</span>`;
  };
  // A section already given, this one, or one to come — and how each shows (done / next).
  const when = x => (curIx < 0 ? 1 : secs.indexOf(x) < curIx ? -1 : secs.indexOf(x) > curIx ? 1 : 0);
  const items0 = (style === 'current' ? (cur ? [cur] : []) : secs).filter(x => !(sb.next === 'hide' && when(x) > 0));
  // Too many to name them all (18 sections on a slide): the current one by its name, the others by their number —
  // their names cut to «E…» said nothing —, the whole name on hovering. (Not in a side index: there they go down.)
  const room = W - px(56), fsz = px(15), want = items0.reduce((n, x) => n + nameOf(x).length * fsz * 0.55 + (style === 'names' ? 0 : Math.min(MAX_DOTS, x.slides.length) * px(11)), 0) + (items0.length - 1) * px(30);
  const compact = mode !== 'sidebar' && want > room && items0.length > 1;
  const dimOf = x => {
    if (x === cur) return '';
    const w = when(x), keep = w < 0 ? sb.done === 'full' : sb.next === 'full';
    return keep ? '' : `opacity:${w < 0 && sb.done === 'check' ? 0.75 : look === 'color' ? 0.62 : 0.5};`;
  };
  const tick = x => (sb.done === 'check' && when(x) < 0 && x !== cur ? '✓ ' : '');
  const one = x => {
    const on = x === cur, tab = look === 'tabs' && on, w = when(x);
    // The current one: bold, at full strength — on its tab, or in the accent colour when the bar has no band.
    let css = `${on || compact ? 'flex:0 0 auto;' : 'flex:0 1 auto;'}display:flex;flex-direction:${marks === 'count' ? 'row' : 'column'};${marks === 'count' ? 'align-items:baseline;gap:.45em' : `justify-content:center;gap:${px(4)}px`};min-width:0;`
      + (tab ? `align-self:stretch;padding:0 ${px(14)}px;background:${acc};color:${onTab};border-radius:${top ? `0 0 ${px(8)}px ${px(8)}px` : `${px(8)}px ${px(8)}px 0 0`};${marks === 'count' ? 'align-items:center;' : ''}` : '')
      + (on ? ((look === 'minimal' || look === 'underline') && !hex(sb.fg) ? `color:${acc};` : '') : dimOf(x));
    // (The new looks: each section a pill; arrows as steps — given ones in a tint of the accent —; the current one underlined.)
    if (look === 'pills') css += `padding:${px(4)}px ${px(14)}px;border-radius:999px;${on ? `background:${acc};color:${onTab};opacity:1;` : `background:color-mix(in srgb,${ink} 10%,transparent);`}`;
    if (look === 'chevrons') {
      const n = px(12), first = x === items0[0];
      css += `align-self:stretch;padding:0 ${px(18)}px 0 ${first ? px(14) : px(24)}px;clip-path:polygon(0 0,calc(100% - ${n}px) 0,100% 50%,calc(100% - ${n}px) 100%,0 100%${first ? '' : `,${n}px 50%`});`
        + (on ? `background:${acc};color:${onTab};opacity:1;` : w < 0 ? `background:color-mix(in srgb,${acc} 30%,transparent);` : `background:color-mix(in srgb,${ink} 9%,transparent);`);
    }
    if (look === 'underline' && on) css += `align-self:stretch;box-shadow:inset 0 ${top ? -Math.max(2, px(3)) : Math.max(2, px(3))}px 0 ${acc};`;
    if (mode === 'sidebar') css += `flex:0 0 auto;padding:${px(6)}px ${px(10)}px;border-radius:${px(6)}px;${on && look !== 'minimal' && look !== 'underline' ? `background:${look === 'color' ? `color-mix(in srgb,${onTab} 18%,transparent)` : `color-mix(in srgb,${acc} 16%,transparent)`};` : ''}`;
    const label0 = compact && !on ? String(secs.indexOf(x) + 1) : tick(x) + esc(nameOf(x));
    return `<span style="${css}">`
      + go(x.slides[0], label0, `white-space:${mode === 'sidebar' ? 'normal' : 'nowrap'};overflow:hidden;text-overflow:ellipsis;${on ? 'font-weight:700;' : ''}`, compact && !on ? x.sec.name : '')
      + (style !== 'names' && (mode !== 'sidebar' || on) ? markOf(x, on) : '') + '</span>';
  };
  const items = items0;
  if (!items.length) return '';

  // The index down one side (Beamer's sidebar): the presentation's name, then its sections.
  if (mode === 'sidebar') {
    const w = sectionBarWidth(deck), right = sb.position === 'right';
    return navStart(`${right ? 'right' : 'left'}:0;top:0;width:${w}px;height:${H}px;`,
      `padding:${px(28)}px ${px(14)}px;display:flex;flex-direction:column;gap:${px(sb.sep ? 4 : 8)}px;overflow:hidden;background:${bg};`
      + (look === 'minimal' ? '' : `border-${right ? 'left' : 'right'}:1px solid color-mix(in srgb,${ink} 18%,transparent);`))
      + (deck.name ? `<span style="font-weight:700;font-size:1.05em;margin-bottom:${px(10)}px;opacity:.9">${esc(deck.name)}</span>` : '')
      + items.map(one).join(sepHTML) + (sb.deckProgress ? track(Math.max(2, px(3)), 'bottom') : '') + '</nav>';
  }

  const h = sectionBarHeight(deck), line = look === 'tabs' ? acc : `color-mix(in srgb,${ink} 18%,transparent)`, g = floatGap(sb, W);
  const box = g ? `left:${g}px;${top ? `top:${g}px` : `bottom:${g}px`};width:${W - 2 * g}px;height:${h}px;border-radius:${px(12)}px;box-shadow:0 ${px(2)}px ${px(10)}px rgba(0,0,0,.12);`
    : `left:0;${top ? 'top:0' : 'bottom:0'};width:${W}px;height:${h}px;`;
  const noLine = look === 'minimal' || look === 'pills' || look === 'chevrons' || look === 'float';
  return navStart(box, `padding:0 ${px(28)}px;display:flex;align-items:center;${alignCss(sb.align)}gap:${px(compact ? 14 : look === 'tabs' ? 18 : look === 'chevrons' ? 2 : look === 'pills' ? 12 : 30)}px;overflow:hidden;`
    + `background:${bg};` + (noLine ? '' : `${top ? 'border-bottom' : 'border-top'}:${look === 'tabs' ? Math.max(2, px(2)) : 1}px solid ${line};`))
    + items.map(one).join(sepHTML) + (sb.deckProgress ? track(Math.max(2, px(3)), top ? 'bottom' : 'top') : '') + '</nav>';
}
const alignCss = a => (a === 'center' ? 'justify-content:center;' : a === 'end' ? 'justify-content:flex-end;' : a === 'spread' ? 'justify-content:space-between;' : '');

// The room it takes at the top, the bottom or one side of this slide (the slide number keeps clear of it).
export function barRoom(deck, slide) {
  if (!sectionBarOn(deck, slide)) return {};
  const sb = deck.sectionBar, W = deck.size?.w || 1280;
  if (modeOf(sb) === 'sidebar') return sb.position === 'right' ? { barRight: sectionBarWidth(deck) } : { barLeft: sectionBarWidth(deck) };
  const h = sectionBarHeight(deck) + 2 * floatGap(sb, W); return sb.position === 'bottom' ? { barBottom: h } : { barTop: h };
}
