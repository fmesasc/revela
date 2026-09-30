// Ribbon group launchers (the small arrow in a group's corner, as in Office)
// and the galleries they open: symbols, icons, WordArt, palettes, fonts, layouts.

import { DIAGRAM_LAYOUTS, DIAGRAM_SAMPLES, DEFAULT_DIAGRAM_TEXT, diagramHTML } from '../../render/diagrams.js';
import { esc } from '../../core/text.js';
import { state, selectedBlock, currentSlide } from '../../core/store.js';
import { ensureLayouts, applyLayout, resetSlide, editLayout, allMasters, masterOf } from '../../features/document/master.js';
import * as slides from '../../features/document/slides.js';
import { startFreeform } from '../canvas/freeform.js';
import * as blocks from '../../features/document/blocks.js';
import * as format from '../../features/document/format.js';
import * as palettes from '../../features/design/palettes.js';
import * as fontsMod from '../../features/design/fonts.js';
import { ICON_NAMES, iconSVG, WORDART_KEYS, wordartCSS, SHAPE_CATALOG, shapeThumb } from '../../render/svg.js';
import { t } from '../../i18n/index.js';

const $ = s => document.querySelector(s);

// ---- Group "more options" popovers (like Office's dialog launchers) --------
export let openPop = null;
export const POPS = {
  symbols: () => {
    const chars = ['→','←','↑','↓','↔','⇒','•','◦','▪','‣','✓','✔','✗','✘','★','☆','♦','●','■','▶',
      '€','$','£','¥','©','®','™','°','±','×','÷','≈','≠','≤','≥','∞','∑','√','π',
      '😀','😉','🎉','🚀','✅','⚠️','💡','📌','🔗','📈','🔥','👍','❤️','⭐','🧠','🛠️'];
    return `<h4>${t('Símbolos y emojis')}</h4><div class="sym-grid">`
      + chars.map(c => `<button data-sym type="button">${c}</button>`).join('') + `</div>`;
  },
  icons: () => `<h4>${t('Iconos')}</h4><div class="sym-grid icons">`
    + ICON_NAMES.map(n => `<button data-icon="${n}" type="button" title="${n}">${iconSVG({ icon: n, color: '#333' })}</button>`).join('') + `</div>`,
  wordart: () => `<h4>Text Art</h4><div class="wa-grid">`
    + WORDART_KEYS.map(k => `<button data-wa="${k}" type="button" style="${wordartCSS(k)}">Aa</button>`).join('') + `</div>`,
  layout: () => `<h4>${t('Diseño')}</h4><div class="layout-grid">`
    + allMasters().map((m, i, ms) => (ms.length > 1 ? `<div class="layout-master">${esc(m.name || (i ? `${t('Patrón')} ${i + 1}` : t('Patrón')))}</div>` : '')
      + ensureLayouts().filter(l => masterOf(l) === m).map(l => `<button data-layout="${l.id}" type="button" class="${currentSlide()?.layoutId === l.id ? 'on' : ''}">${t(l.name)}</button>`).join('')).join('')
    + `</div><div class="fr-actions"><button type="button" class="mini2" data-reset-slide>${t('Restablecer')}</button>`
    + `<button type="button" class="mini2" data-edit-layouts>${t('Editar diseños…')}</button></div>`,
  // Insert ▸ More shapes: every shape, by kind.
  shapes: () => SHAPE_CATALOG.map(([cat, list]) => `<h4>${t(cat)}</h4><div class="shape-pop">`
    + list.map(([k, l]) => `<button data-shape-pick="${k}" type="button" title="${esc(t(l))}">${shapeThumb(k)}</button>`).join('') + '</div>').join(''),
  // Insert ▸ Diagram: every layout, drawn small with the theme's colours.
  diagrams: () => DIAGRAM_LAYOUTS.map(([cat, list]) => `<h4>${t(cat)}</h4><div class="dg-pop">`
    + list.map(([k, l]) => `<button data-diagram-pick="${k}" type="button" title="${esc(t(l))}"><span class="dg-thumb" style="background:${esc(currentSlide()?.background || "#1b1f26")}">${diagramHTML({ layout: k, colors: 'colorful', w: 600, h: 340,
      text: (DIAGRAM_SAMPLES[k] || DEFAULT_DIAGRAM_TEXT).split('\n').filter(l => !/^\s/.test(l) || k === 'hierarchy' || k === 'radial').slice(0, 7).join('\n') }, blocks.diagramOpts())}</span><span>${esc(t(l))}</span></button>`).join('') + '</div>').join(''),
  // "New slide ▾": the layouts, as in PowerPoint.
  newslide: () => `<h4>${t('Nueva diapositiva')}</h4><div class="layout-grid">`
    + allMasters().map((m, i, ms) => (ms.length > 1 ? `<div class="layout-master">${esc(m.name || (i ? `${t('Patrón')} ${i + 1}` : t('Patrón')))}</div>` : '')
      + ensureLayouts().filter(l => masterOf(l) === m).map(l => `<button data-newslide="${l.id}" type="button">${t(l.name)}</button>`).join('')).join('') + `</div>`,
  palettes: () => `<h4>${t('Colores del tema')}</h4><div class="pal-grid">`
    + Object.entries(palettes.PALETTES).map(([k, p]) => `<button data-palette="${k}" type="button" class="${(state.deck.palette || 'revela') === k ? 'on' : ''}">`
      + `<span class="pal-sw" style="background:${p.bg};color:${p.fg}">Aa${p.accents.map(c => `<i style="background:${c}"></i>`).join('')}</span>`
      + `<span>${t(p.name)}</span></button>`).join('') + `</div>`,
  fontpairs: () => `<h4>${t('Fuentes del tema')}</h4><div class="fp-list">`
    + Object.entries(palettes.FONT_PAIRS).map(([k, p]) => { const st = palettes.pairStacks(k);
      return `<button data-fontpair="${k}" type="button" class="${state.deck.fontPair === k ? 'on' : ''}">`
        + `<b style="font-family:${st.heading.replace(/"/g, "'")}">${p.heading}</b><span style="font-family:${st.body.replace(/"/g, "'")}">${p.body}</span>`
        + `<small>${t(p.name)}</small></button>`; }).join('') + `</div>`,
  paragraph: () => {
    const b = selectedBlock(); const tb = b && b.type === 'text' ? b : {};
    return `<h4>${t('Párrafo')}</h4>
      <label>${t('Interlineado')}
        <input type="number" step="0.05" min="0.5" data-pop="linespacing" value="${tb.lineHeight || 1}"></label>
      <label>${t('Espaciado entre letras (px)')}
        <input type="number" step="0.5" data-pop="letterspacing" value="${tb.letterSpacing || 0}"></label>
      <label>${t('Sangría izquierda (px)')}
        <input type="number" step="4" min="0" data-pop="indent" value="${tb.indent || 0}"></label>
      <label>${t('Viñeta')} <select data-pop="bullet">
        <option value="disc">• Disco</option><option value="circle">◦ Círculo</option>
        <option value="square">▪ Cuadrado</option><option value="none">— Ninguna</option></select></label>
      <label>${t('Columnas')} <select data-pop="columns">
        <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
      <label>${t('Lista numerada')} <select data-pop="numstyle">
        <option value="decimal">1, 2, 3</option><option value="lower-alpha">a, b, c</option>
        <option value="upper-alpha">A, B, C</option><option value="lower-roman">i, ii, iii</option></select></label>`;
  },
};
export function closePopover() { if (openPop) { openPop.remove(); openPop = null; } }
export function togglePopover(launcher, type) {
  const same = openPop && openPop.dataset.type === type;
  closePopover();
  if (same || !POPS[type]) return;
  const pop = document.createElement('div');
  pop.className = 'popover'; pop.dataset.type = type;
  pop.innerHTML = POPS[type]();
  document.body.appendChild(pop);
  const r = launcher.getBoundingClientRect();
  pop.style.left = Math.min(r.left, innerWidth - pop.offsetWidth - 10) + 'px';
  pop.style.top = (r.bottom + 4) + 'px';
  pop.addEventListener('click', e => e.stopPropagation());
  pop.querySelector('[data-pop="linespacing"]')?.addEventListener('input', e => format.lineSpacing(e.target.value));
  pop.querySelector('[data-pop="letterspacing"]')?.addEventListener('input', e => format.letterSpacing(e.target.value));
  pop.querySelector('[data-pop="indent"]')?.addEventListener('input', e => format.indent(e.target.value));
  const bsel = pop.querySelector('[data-pop="bullet"]');
  if (bsel) { bsel.value = selectedBlock()?.bullet || 'disc'; bsel.addEventListener('change', e => format.setBullet(e.target.value)); }
  const csel = pop.querySelector('[data-pop="columns"]');
  if (csel) { csel.value = String(selectedBlock()?.columns || 1); csel.addEventListener('change', e => format.setColumns(e.target.value)); }
  const nsel = pop.querySelector('[data-pop="numstyle"]');
  if (nsel) { nsel.value = selectedBlock()?.numStyle || 'decimal'; nsel.addEventListener('change', e => format.setNumStyle(e.target.value)); }
  pop.querySelectorAll('[data-sym]').forEach(x => {
    x.addEventListener('mousedown', e => e.preventDefault());   // keep the caret in the text
    x.addEventListener('click', () => format.insertSymbol(x.textContent));
  });
  pop.querySelectorAll('[data-icon]').forEach(x =>
    x.addEventListener('click', () => { blocks.addIcon(x.dataset.icon); closePopover(); }));
  pop.querySelectorAll('[data-wa]').forEach(x =>
    x.addEventListener('click', () => { blocks.addWordArt(x.dataset.wa); closePopover(); }));
  pop.querySelectorAll('[data-palette]').forEach(x =>
    x.addEventListener('click', () => { palettes.applyPalette(x.dataset.palette); closePopover(); }));
  pop.querySelectorAll('[data-fontpair]').forEach(x => {
    const st = palettes.pairStacks(x.dataset.fontpair); fontsMod.ensureFont(st.heading); fontsMod.ensureFont(st.body);
    x.addEventListener('click', () => { palettes.applyFontPair(x.dataset.fontpair); closePopover(); });
  });
  pop.querySelectorAll('[data-layout]').forEach(x =>
    x.addEventListener('click', () => { applyLayout(x.dataset.layout); closePopover(); }));
  pop.querySelectorAll('[data-diagram-pick]').forEach(x =>
    x.addEventListener('click', () => { closePopover(); blocks.addDiagram(x.dataset.diagramPick); }));
  pop.querySelectorAll('[data-shape-pick]').forEach(x =>
    x.addEventListener('click', () => { closePopover(); if (x.dataset.shapePick === 'freeform') startFreeform(); else blocks.addShape(x.dataset.shapePick); }));
  pop.querySelectorAll('[data-newslide]').forEach(x =>
    x.addEventListener('click', () => { slides.addSlide(x.dataset.newslide); closePopover(); }));
  pop.querySelector('[data-reset-slide]')?.addEventListener('click', () => { resetSlide(); closePopover(); });
  pop.querySelector('[data-edit-layouts]')?.addEventListener('click', () => { editLayout(currentSlide()?.layoutId || true); closePopover(); });
  openPop = pop;
}
