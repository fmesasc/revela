// The sections bar, as LaTeX Beamer's: where the talk is. Along the top (or the bottom) of each slide, the deck's
// sections by name — the one this slide is in, marked — and, unless «Solo nombres», under each name where this slide
// is in it: a dot per slide (filled on this one), «2/5», or a progress bar. A name or a mark takes you there (a link
// to that slide) when presenting. It belongs to the slide (drawn inside it, at the slide's size), so it shows the same
// on the canvas, the thumbnails, the presentation and its pictures (PDF, images). Pure: no DOM, used by the export
// (io/formats/html.js) and the editor.
//
// deck.sectionBar = { show, position: 'top'|'bottom', style: 'dots'|'names'|'current' (what it lists: the sections with
// their marks, their names alone, or the current one with its marks), look: 'band'|'color'|'tabs'|'minimal' (as
// Beamer's themes: a soft band, a band in the theme's colour, the current section on a tab, or text alone), marks:
// 'dots'|'count'|'progress', size (letters, % — 100 by default), font: 'deck'|'system', bg / fg / accent (colours of its
// own; by default the slide's text colour and the theme's accent), skipTitle }. A slide with noSectionBar has none
// (a cover, a full-bleed picture…); with skipTitle (the default), neither do the slides with the «Portada» layout.

export const SECTION_BAR_STYLES = [['dots', 'Todas las secciones'], ['names', 'Solo nombres'], ['current', 'Solo la sección actual']];
export const SECTION_BAR_LOOKS = [['band', 'Franja suave'], ['color', 'Franja de color'], ['tabs', 'Pestañas'], ['minimal', 'Mínima']];
export const SECTION_BAR_MARKS = [['dots', 'Puntos'], ['count', 'Número (2/5)'], ['progress', 'Barra de progreso']];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : null;
// Words on a colour: dark on a light one, white on the rest.
const inkOn = c => { const v = parseInt((hex(c) || '#3f6497').slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) > 165 ? '#1e2a3a' : '#ffffff'; };

// The sections that have slides to show, each with its visible slides (hidden ones are skipped when presenting).
export function barSections(deck) {
  const vis = (deck.slides || []).filter(s => !s.hidden);
  return (deck.sections || []).map(sec => ({ sec, slides: vis.filter(s => s.sectionId === sec.id) })).filter(x => x.slides.length);
}

// Whether this slide shows the bar.
export function sectionBarOn(deck, slide) {
  const sb = deck?.sectionBar;
  if (!sb?.show || !slide || slide.noSectionBar || slide.hidden) return false;
  if (sb.skipTitle !== false && slide.layoutId === 'title') return false;
  return barSections(deck).length > 0;
}

const MAX_DOTS = 12;
const sizeOf = sb => Math.min(2, Math.max(0.6, (+sb?.size || 100) / 100));
// Its height on a slide of this width (the slide's content should leave it room).
export const sectionBarHeight = deck => {
  const sb = deck.sectionBar || {}, marks = (sb.style || 'dots') !== 'names';
  return Math.round((marks ? 44 : 32) * sizeOf(sb) * ((deck.size?.w || 1280) / 1280));
};

// The bar as HTML, absolutely placed in the slide. fg: the slide's text colour; accent: the theme's; font: the
// presentation's letters (a CSS font-family); link: names and marks as links (#/n, n = the slide among the visible
// ones, as the presentation numbers them); label: the bar's name for screen readers.
export function sectionBarHTML(deck, slide, { fg = '#ffffff', accent = '#3f6497', font = '', link = true, label = 'Secciones' } = {}) {
  if (!sectionBarOn(deck, slide)) return '';
  const sb = deck.sectionBar, W = deck.size?.w || 1280, k = W / 1280 * sizeOf(sb), style = sb.style || 'dots', top = sb.position !== 'bottom';
  const look = sb.look || 'band', marks = sb.marks || 'dots', px = v => Math.max(1, Math.round(v * k));
  const acc = hex(sb.accent) || hex(accent) || '#3f6497';
  // The colours: its own, else from the look — the slide's text on a soft band; white (or dark) on the accent…
  const bg = hex(sb.bg) || (look === 'color' ? acc : look === 'band' ? `color-mix(in srgb,${fg} 9%,transparent)` : 'transparent');
  const ink = hex(sb.fg) || (look === 'color' ? inkOn(hex(sb.bg) || acc) : fg);
  const onTab = inkOn(acc);                       // (the current section's words on its tab)
  const vis = (deck.slides || []).filter(s => !s.hidden), at = s => vis.indexOf(s);
  const secs = barSections(deck), cur = secs.find(x => x.slides.some(s => s.id === slide.id));
  const curIx = secs.indexOf(cur);
  const go = (s, inner, css, title = '') => (link
    ? `<a href="#/${at(s)}"${title ? ` title="${esc(title)}"` : ''} style="color:inherit;text-decoration:none;${css}">${inner}</a>`
    : `<span${title ? ` title="${esc(title)}"` : ''} style="${css}">${inner}</span>`);
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
    return `<span style="display:flex;gap:${px(4)}px;flex-wrap:nowrap">${x.slides.map((s, j) =>
      go(s, '', `display:block;width:${d}px;height:${d}px;border-radius:50%;box-sizing:border-box;border:${Math.max(1, 1.3 * k).toFixed(1)}px solid currentColor;${s.id === slide.id ? 'background:currentColor;' : ''}`,
        `${x.sec.name} · ${j + 1}`)).join('')}</span>`;
  };
  // Too many to name them all (18 sections on a slide): the current one by its name, the others by their number —
  // their names cut to «E…» said nothing —, the whole name on hovering.
  const items0 = style === 'current' ? (cur ? [cur] : []) : secs;
  const room = W - px(56), fsz = px(15), want = items0.reduce((n, x) => n + x.sec.name.length * fsz * 0.55 + (style === 'names' ? 0 : Math.min(MAX_DOTS, x.slides.length) * px(11)), 0) + (items0.length - 1) * px(30);
  const compact = want > room && items0.length > 1;
  const one = x => {
    const on = x === cur, tab = look === 'tabs' && on;
    // The current one: bold, at full strength — on its tab, or in the accent colour when the bar has no band.
    const css = `${on || compact ? 'flex:0 0 auto;' : 'flex:0 1 auto;'}display:flex;flex-direction:${marks === 'count' ? 'row' : 'column'};${marks === 'count' ? 'align-items:baseline;gap:.45em' : `justify-content:center;gap:${px(4)}px`};min-width:0;`
      + (tab ? `align-self:stretch;padding:0 ${px(14)}px;background:${acc};color:${onTab};border-radius:${top ? `0 0 ${px(8)}px ${px(8)}px` : `${px(8)}px ${px(8)}px 0 0`};${marks === 'count' ? 'align-items:center;' : ''}` : '')
      + (on ? (look === 'minimal' && !hex(sb.fg) ? `color:${acc};` : '') : `opacity:${look === 'color' ? 0.62 : 0.5};`);
    return `<span style="${css}">`
      + go(x.slides[0], compact && !on ? String(secs.indexOf(x) + 1) : esc(x.sec.name), `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${on ? 'font-weight:700;' : ''}`, compact && !on ? x.sec.name : '')
      + (style !== 'names' ? markOf(x, on) : '') + '</span>';
  };
  const items = items0;
  if (!items.length) return '';
  const h = sectionBarHeight(deck), line = look === 'tabs' ? acc : `color-mix(in srgb,${ink} 18%,transparent)`;
  const fam = sb.font === 'system' || !font ? "system-ui,-apple-system,'Segoe UI',sans-serif" : font;
  return `<nav class="rv-secbar" data-id="rv-secbar" aria-label="${esc(label)}" style="position:absolute;left:0;${top ? 'top:0' : 'bottom:0'};width:${W}px;height:${h}px;`
    + `box-sizing:border-box;padding:0 ${px(28)}px;display:flex;align-items:center;gap:${px(compact ? 14 : look === 'tabs' ? 18 : 30)}px;overflow:hidden;`
    + `font-weight:500;font-size:${px(15)}px;line-height:1.15;font-family:${fam.replace(/"/g, "'")};color:${ink};background:${bg};`
    + (look === 'minimal' ? '' : `${top ? 'border-bottom' : 'border-top'}:${look === 'tabs' ? Math.max(2, px(2)) : 1}px solid ${line};`) + 'z-index:5">'
    + items.map(one).join('') + '</nav>';
}

// The room it takes at the top or the bottom of this slide (the slide number keeps clear of it).
export function barRoom(deck, slide) {
  if (!sectionBarOn(deck, slide)) return {};
  const h = sectionBarHeight(deck); return deck.sectionBar.position === 'bottom' ? { barBottom: h } : { barTop: h };
}
