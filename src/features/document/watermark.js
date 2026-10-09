// «Confidencial»: a watermark for a presentation that is shared or presented (Configuración de la presentación ▸
// Marca de agua; deck.watermark = { text?, email? }). A faint word repeated diagonally over every slide — in the
// viewer, when presenting, in the exported web page and in the PDF —, with the email of whoever opened it when
// a tracked link asked for it (apps/view: known only there, in that browser; nothing more is stored or sent).
// It's a deterrent, not a lock: the viewer has no way to turn it off, but anyone who knows how can remove it
// from a copy, and what a screen shows can always be photographed.

import { t } from '../../i18n/index.js';
import { esc, jsData } from '../../core/text.js';

const MAX_TEXT = 60;
export const hasWatermark = deck => !!deck?.watermark;
// The words drawn: the deck's own (or «CONFIDENCIAL») and, if asked and known, the viewer's email.
export function watermarkText(deck, who = '') {
  const w = deck?.watermark; if (!w) return '';
  const base = String(w.text || '').trim().slice(0, MAX_TEXT) || t('CONFIDENCIAL');
  return w.email && who ? `${base} · ${String(who).trim().slice(0, 120)}` : base;
}
// The overlay. fixed: over the whole window (reveal.js pages: the viewer, presenting, the web page); otherwise
// over its positioned parent (a page of the print document, a slide drawn for the PDF). Many copies of the
// words in a rotated grid twice the size of the box, so it's covered whatever its shape.
export function watermarkHTML(deck, { who = '', fixed = false } = {}) {
  const s = watermarkText(deck, who); if (!s) return '';
  const words = `<span>${esc(s)}</span>`.repeat(fixed ? 160 : 70);
  return `<div class="rv-wm" aria-hidden="true" style="position:${fixed ? 'fixed' : 'absolute'};left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:2147483000;-webkit-user-select:none;user-select:none">`
    + `<div style="position:absolute;left:-50%;top:-50%;width:200%;height:200%;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:90px 120px;transform:rotate(-30deg);`
    + `font:700 28px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;letter-spacing:4px;white-space:nowrap;color:rgba(128,128,128,.24)">${words}</div></div>`;
}
// For the reveal.js page: the overlay, and a watch that puts it back if it's taken out of the page (no setting
// or button removes it; this only makes the obvious way — deleting it in the browser's tools — not stick).
export function watermarkPage(deck, who = '') {
  const html = watermarkHTML(deck, { who, fixed: true }); if (!html) return '';
  return `${html}<script>(function(){var H=${jsData(html)};setInterval(function(){var w=document.querySelector('.rv-wm');if(!w||getComputedStyle(w).display==='none'||getComputedStyle(w).visibility==='hidden'){if(w)w.remove();document.body.insertAdjacentHTML('beforeend',H);}},1500);})();</script>`;
}
