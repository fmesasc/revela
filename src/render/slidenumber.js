// The slide number, drawn in each slide (as the sections bar — render/sectionbar.js —, so the canvas, the thumbnails,
// the presentation and its pictures show the same): in a corner or centred, top or bottom, in a style that blends in
// or stands out. deck.slideNumber = { show, position: 'br'|'bl'|'bc'|'tr'|'tl'|'tc', format: 'c'|'c/t'|'cof'|'word'|'0c'
// (3 · 3 / 12 · 3 de 12 · Diapositiva 3 · 03), look: 'plain'|'soft'|'pill'|'circle'|'bar' (as it is, faint, on a rounded
// band, in a circle, after a short line), size (%, 100 by default), font: 'deck'|'system', fg / bg (colours of its own;
// by default the slide's text colour and the theme's accent), skipTitle }. A slide with noNumber has none, nor one
// «not counted» (an appendix: slide.uncounted), nor — with skipTitle, the default — one with the «Portada» layout. The
// count skips hidden and not-counted slides, as the presentation does. Pure: no DOM.

export const NUMBER_FORMATS = [['c', '3'], ['c/t', '3 / 12'], ['cof', '3 de 12'], ['word', 'Diapositiva 3'], ['0c', '03']];
export const NUMBER_LOOKS = [['plain', 'Sencillo'], ['soft', 'Discreto'], ['pill', 'En una píldora'], ['circle', 'En un círculo'], ['bar', 'Con una raya']];
export const NUMBER_POSITIONS = [['br', 'Abajo dcha.'], ['bc', 'Abajo, en el centro'], ['bl', 'Abajo izq.'], ['tr', 'Arriba dcha.'], ['tc', 'Arriba, en el centro'], ['tl', 'Arriba izq.']];

const hex = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : null);
const inkOn = c => { const v = parseInt((hex(c) || '#3f6497').slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) > 165 ? '#1e2a3a' : '#ffffff'; };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// This slide's number and the total, counting as the presentation does; null when it shows none.
export function slideNumberOf(deck, slide) {
  const sn = deck?.slideNumber;
  if (!sn?.show || !slide || slide.hidden || slide.uncounted || slide.noNumber) return null;
  if (sn.skipTitle && slide.layoutId === 'title') return null;
  const counted = (deck.slides || []).filter(s => !s.hidden && !s.uncounted), i = counted.indexOf(slide);
  return i < 0 ? null : { n: i + 1, total: counted.length };
}

// The number as words: format, and the wordings «{n} de {t}» and «Diapositiva {n}» in the app's language.
export function numberText(fmt, n, total, { cof = '{n} de {t}', word = 'Diapositiva {n}' } = {}) {
  const fill = w => w.replace('{n}', n).replace('{t}', total);
  if (fmt === 'c/t') return `${n} / ${total}`;
  if (fmt === 'cof') return fill(cof);
  if (fmt === 'word') return fill(word);
  if (fmt === '0c') return String(n).padStart(Math.max(2, String(total).length), '0');
  return String(n);
}

// The number as HTML, placed in the slide. fg: the slide's text colour; accent: the theme's; font: the presentation's
// letters; words: { cof, word } (numberText); barTop / barBottom: the height of the sections bar there, kept clear.
export function slideNumberHTML(deck, slide, { fg = '#ffffff', accent = '#3f6497', font = '', words, barTop = 0, barBottom = 0 } = {}) {
  const at = slideNumberOf(deck, slide); if (!at) return '';
  const sn = deck.slideNumber, W = deck.size?.w || 1280, H = deck.size?.h || 720, k = (W / 1280) * Math.min(2.5, Math.max(0.6, (+sn.size || 100) / 100));
  const px = v => Math.max(1, Math.round(v * k)), look = sn.look || 'plain', pos = sn.position || 'br';
  const txt = numberText(sn.format || 'c', at.n, at.total, words);
  const acc = hex(sn.bg) || hex(accent) || '#3f6497', filled = look === 'pill' || look === 'circle';
  const ink = hex(sn.fg) || (filled ? inkOn(acc) : fg);
  const m = Math.round(22 * (W / 1280)), y = pos[0] === 't' ? `top:${m + barTop}px` : `bottom:${m + barBottom}px`;
  const x = pos[1] === 'c' ? `left:0;right:0;margin:0 auto;width:max-content` : pos[1] === 'l' ? `left:${m}px` : `right:${m}px`;
  const fam = sn.font === 'system' || !font ? "system-ui,-apple-system,'Segoe UI',sans-serif" : font;
  const shape = look === 'pill' ? `background:${acc};padding:${px(3)}px ${px(12)}px;border-radius:999px;`
    : look === 'circle' ? `background:${acc};min-width:${px(34)}px;height:${px(34)}px;padding:0 ${px(6)}px;box-sizing:border-box;border-radius:999px;display:flex;align-items:center;justify-content:center;`
      : look === 'bar' ? `border-${pos[1] === 'r' ? 'right' : 'left'}:${Math.max(2, px(3))}px solid ${hex(sn.bg) || acc};padding:0 ${px(10)}px;`
        : '';
  const opacity = look === 'soft' ? 0.45 : look === 'plain' ? 0.8 : 1;
  return `<div class="rv-slidenum" aria-label="${esc(txt)}" style="position:absolute;${y};${x};z-index:6;pointer-events:none;${shape}`
    + `color:${ink};opacity:${opacity};font-family:${fam.replace(/"/g, "'")};font-size:${px(look === 'soft' ? 15 : 18)}px;line-height:1.2;font-weight:${filled ? 700 : 500};`
    + `font-variant-numeric:tabular-nums;white-space:nowrap">${esc(txt)}</div>`;
}
