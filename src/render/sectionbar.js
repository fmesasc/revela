// The sections bar, as LaTeX Beamer's: where the talk is. Along the top (or the bottom) of each slide, the deck's
// sections by name — the one this slide is in, marked — and, with «Nombres y puntos» (or the current one alone), under each name a dot per
// slide, filled on this one. A name or a dot takes you there (a link to that slide) when presenting. It belongs to the
// slide (drawn inside it, at the slide's size), so it shows the same on the canvas, the thumbnails, the presentation
// and its pictures (PDF, images). deck.sectionBar = { show, position: 'top'|'bottom', style: 'dots'|'names'|'current',
// skipTitle }; a slide with noSectionBar has none (a cover, a full-bleed picture…); with skipTitle (the default), neither
// do the slides with the «Portada» layout. Pure: no DOM, used by the export (io/formats/html.js) and the editor.

export const SECTION_BAR_STYLES = [['dots', 'Nombres y puntos'], ['names', 'Solo nombres'], ['current', 'Solo la sección actual']];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

// Its height on a slide of this width (the slide's content should leave it room: the dialog says how much).
export const sectionBarHeight = (deck) => Math.round(((deck.sectionBar?.style || 'dots') !== 'names' ? 44 : 32) * ((deck.size?.w || 1280) / 1280));

// The bar as HTML, absolutely placed in the slide. fg: the slide's text colour; link: names and dots as links (#/n, n =
// the slide among the visible ones, as the presentation numbers them); label: the bar's name for screen readers.
export function sectionBarHTML(deck, slide, { fg = '#ffffff', link = true, label = 'Secciones' } = {}) {
  if (!sectionBarOn(deck, slide)) return '';
  const sb = deck.sectionBar, W = deck.size?.w || 1280, k = W / 1280, style = sb.style || 'dots', top = sb.position !== 'bottom';
  const vis = (deck.slides || []).filter(s => !s.hidden), at = s => vis.indexOf(s);
  const secs = barSections(deck), cur = secs.find(x => x.slides.some(s => s.id === slide.id));
  const go = (s, inner, css, title = '') => (link
    ? `<a href="#/${at(s)}"${title ? ` title="${esc(title)}"` : ''} style="color:inherit;text-decoration:none;${css}">${inner}</a>`
    : `<span style="${css}">${inner}</span>`);
  const d = Math.max(5, Math.round(7 * k));
  const dots = x => `<span style="display:flex;gap:${Math.round(4 * k)}px;flex-wrap:nowrap">${x.slides.map((s, i) =>
    go(s, '', `display:block;width:${d}px;height:${d}px;border-radius:50%;box-sizing:border-box;border:${Math.max(1, 1.3 * k).toFixed(1)}px solid currentColor;${s.id === slide.id ? 'background:currentColor;' : ''}`,
      `${x.sec.name} · ${i + 1}`)).join('')}</span>`;
  const one = x => {
    const on = x === cur;
    return `<span style="display:flex;flex-direction:column;justify-content:center;gap:${Math.round(4 * k)}px;min-width:0;opacity:${on ? 1 : 0.5}">`
      + go(x.slides[0], esc(x.sec.name), `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${on ? 'font-weight:700;' : ''}`)
      + (style !== 'names' ? dots(x) : '') + '</span>';
  };
  const items = style === 'current' ? (cur ? [cur] : []) : secs;
  if (!items.length) return '';
  const h = sectionBarHeight(deck);
  return `<nav class="rv-secbar" data-id="rv-secbar" aria-label="${esc(label)}" style="position:absolute;left:0;${top ? 'top:0' : 'bottom:0'};width:${W}px;height:${h}px;`
    + `box-sizing:border-box;padding:0 ${Math.round(28 * k)}px;display:flex;align-items:center;gap:${Math.round(30 * k)}px;overflow:hidden;`
    + `font:500 ${Math.round(15 * k)}px/1.15 system-ui,-apple-system,'Segoe UI',sans-serif;color:${fg};`
    + `background:color-mix(in srgb,${fg} 9%,transparent);${top ? 'border-bottom' : 'border-top'}:1px solid color-mix(in srgb,${fg} 18%,transparent);z-index:5">`
    + items.map(one).join('') + '</nav>';
}
