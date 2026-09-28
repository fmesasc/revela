// PDF (print one slide per page and "Save as PDF") and handouts / notes pages.

import { state } from '../../core/store.js';
import { MODEL_VIEWER } from '../../core/vendor.js';
import { alertUser } from '../../core/notify.js';
import { tableCSS, levelCSS } from '../../render/svg.js';
import { googleFontLinks } from '../../features/design/fonts.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { t } from '../../i18n/index.js';
import { blocksOf, blockHTML, esc } from '../formats/html.js';

// A print‑oriented document: one slide per page, sized to the deck. The user
// prints it and chooses "Save as PDF" (works in every browser, no plugins).
export function buildPrintHTML(deck = state.deck) {
  const { w, h } = deck.size;
  const pages = deck.slides.filter(s => !s.hidden).map(s =>
    `<div class="page" style="background:${s.background}">${blocksOf(s, deck).map(b => blockHTML(b, s)).join('')}</div>`).join('\n');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(deck.name || 'Presentación')}</title>
${googleFontLinks(deck)}
<script type="module" src="${MODEL_VIEWER}"></script>
<style>
 @page{size:${w}px ${h}px;margin:0}
 *{box-sizing:border-box} html,body{margin:0}
 .page{position:relative;width:${w}px;height:${h}px;overflow:hidden;color:${deckFg(deck)};${deckBodyFont(deck) ? `font-family:${deckBodyFont(deck)};` : ''}page-break-after:always}
 .page:last-child{page-break-after:auto}
 .page>*{overflow-wrap:anywhere}
 model-viewer,img,video,iframe{width:100%;height:100%}
 ${tableCSS()}${levelCSS()}
</style></head>
<body onload="setTimeout(function(){window.print();},400)">
${pages}
</body></html>`;
}

// Handouts and notes pages (PowerPoint "Print > Handouts / Notes Pages"):
// A4 portrait pages with n slides each, lines to write on for 3 per page, or
// one slide with its speaker notes. Slides are the same inline HTML, scaled.
export const HANDOUT_LAYOUTS = { notes: [1, 1], 1: [1, 1], 2: [1, 2], 3: [1, 3], 4: [2, 2], 6: [2, 3], 9: [3, 3] };
export function buildHandoutHTML(deck = state.deck, layout = 6) {
  const { w, h } = deck.size;
  const [cols, rows] = HANDOUT_LAYOUTS[layout] || HANDOUT_LAYOUTS[6];
  const per = cols * rows, MM = 3.7795, GAP = 8, AW = 186, AH = layout === 'notes' ? 120 : 253;
  const cellW = layout == 3 ? 92 : (AW - (cols - 1) * GAP) / cols;
  const cellH = (AH - (rows - 1) * GAP) / rows;
  const sw = Math.min(cellW, cellH * w / h), k = (sw * MM / w).toFixed(4);
  const vis = deck.slides.filter(s => !s.hidden);
  const thumb = (s, n) => `<div class="cell"><div class="thumb" style="width:${sw.toFixed(2)}mm;height:${(sw * h / w).toFixed(2)}mm">`
    + `<div class="page" style="background:${s.background};transform:scale(${k})">${blocksOf(s, deck).map(b => blockHTML(b, s)).join('')}</div></div>`
    + `${layout === 'notes' ? '' : `<span class="n">${n}</span>`}</div>`;
  const pages = [];
  for (let i = 0; i < vis.length; i += per) {
    const chunk = vis.slice(i, i + per);
    const body = layout === 'notes'
      ? thumb(chunk[0], i + 1) + `<div class="notes">${esc(chunk[0].notes || '')}</div>`
      : `<div class="grid${layout == 3 ? ' lined' : ''}" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">`
        + chunk.map((s, j) => thumb(s, i + j + 1) + (layout == 3 ? '<div class="lines"></div>' : '')).join('') + '</div>';
    pages.push(`<section class="sheet"><header>${esc(deck.name || '')}</header>${body}<footer>${pages.length + 1}</footer></section>`);
  }
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(deck.name || 'Presentación')}</title>
${googleFontLinks(deck)}
<style>
 @page{size:A4 portrait;margin:0}
 *{box-sizing:border-box} html,body{margin:0;font-family:system-ui,sans-serif;color:#222;background:#fff}
 .sheet{width:210mm;height:297mm;padding:12mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}
 .sheet:last-child{page-break-after:auto}
 header,footer{font-size:9pt;color:#777;height:6mm} footer{text-align:right;margin-top:auto}
 .grid{flex:1;display:grid;gap:${GAP}mm;min-height:0}
 .grid.lined{grid-template-columns:${cellW}mm 1fr !important}
 .cell{display:flex;align-items:center;justify-content:center;position:relative;min-height:0}
 .cell .n{position:absolute;left:0;top:0;font-size:8pt;color:#999}
 .thumb{position:relative;overflow:hidden;border:1px solid #bbb}
 .page{position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;color:${deckFg(deck)};${deckBodyFont(deck) ? `font-family:${deckBodyFont(deck)};` : ''}}
 .page>*{overflow-wrap:anywhere}
 .page img,.page video,.page iframe,.page model-viewer{width:100%;height:100%}
 .lines{background:repeating-linear-gradient(transparent 0 9mm,#bbb 9mm calc(9mm + 1px));margin:4mm 0}
 .notes{white-space:pre-wrap;font-size:12pt;line-height:1.5;margin-top:10mm;flex:1}
 ${tableCSS()}${levelCSS()}
</style></head>
<body onload="setTimeout(function(){window.print();},400)">
${pages.join('\n')}
</body></html>`;
}

export function exportHandout(layout) {
  const win = window.open('', '_blank');
  if (!win) { alertUser(t('Permite las ventanas emergentes para exportar a PDF.')); return; }
  win.document.write(buildHandoutHTML(state.deck, layout));
  win.document.close();
}

export function exportPDF() {
  const win = window.open('', '_blank');
  if (!win) { alertUser(t('Permite las ventanas emergentes para exportar a PDF.')); return; }
  win.document.write(buildPrintHTML());
  win.document.close();
}
