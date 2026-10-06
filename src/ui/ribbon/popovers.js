// Ribbon group launchers (the small arrow in a group's corner, as in Office)
// and the galleries they open: symbols, icons, WordArt, palettes, fonts, layouts.

import { DIAGRAM_LAYOUTS, DIAGRAM_SAMPLES, DEFAULT_DIAGRAM_TEXT, diagramHTML } from '../../render/diagrams.js';
import { esc } from '../../core/text.js';
import { state, selectedBlock, currentSlide, commit } from '../../core/store.js';
import { ensureLayouts, applyLayout, resetSlide, editLayout, allMasters, masterOf } from '../../features/document/master.js';
import * as slides from '../../features/document/slides.js';
import * as templates from '../../features/document/templates.js';
import { startFreeform } from '../canvas/freeform.js';
import * as blocks from '../../features/document/blocks.js';
import * as format from '../../features/document/format.js';
import { openThemeEditor } from '../dialogs/theme.js';
import * as palettes from '../../features/design/palettes.js';
import * as fontsMod from '../../features/design/fonts.js';
import * as officeTheme from '../../features/design/officetheme.js';
import { readFile, useThemeOf, saveTheme } from '../shell/openfile.js';
import { ICON_NAMES, iconSVG, WORDART_KEYS, wordartCSS, SHAPE_CATALOG, shapeThumb } from '../../render/svg.js';
import { t } from '../../i18n/index.js';
import { ICON_GROUPS, BASIC_ICONS } from '../../render/icons.js';

const $ = s => document.querySelector(s);

// ---- Group "more options" popovers (like Office's dialog launchers) --------
export let openPop = null;
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');   // (search without accents)
// The slides saved with Insert ▸ «Guardar plantilla», under the layouts.
function savedTemplates() {
  const mine = Object.entries(templates.userTemplates()); if (!mine.length) return '';
  return `<h4>${t('Mis plantillas')}</h4><div class="layout-grid">`
    + mine.map(([id, tp]) => `<button data-user-tpl="${esc(id)}" type="button">${esc(tp.name)}</button>`).join('') + '</div>';
}
export const POPS = {
  symbols: () => {
    const chars = ['→','←','↑','↓','↔','⇒','•','◦','▪','‣','✓','✔','✗','✘','★','☆','♦','●','■','▶',
      '€','$','£','¥','©','®','™','°','±','×','÷','≈','≠','≤','≥','∞','∑','√','π',
      '😀','😉','🎉','🚀','✅','⚠️','💡','📌','🔗','📈','🔥','👍','❤️','⭐','🧠','🛠️'];
    return `<h4>${t('Símbolos y emojis')}</h4><div class="sym-grid">`
      + chars.map(c => `<button data-sym type="button">${c}</button>`).join('') + `</div>`;
  },
  // By groups, with a search box (Spanish or English names, and in the app's language).
  icons: () => `<h4>${t('Iconos')}</h4><input type="search" class="icon-search" data-icon-search placeholder="${esc(t('Buscar icono…'))}"><div class="icon-groups">`
    + [['Básicos', BASIC_ICONS], ...ICON_GROUPS].map(([cat, list]) => `<h5 class="icon-cat">${esc(t(cat))}</h5><div class="sym-grid icons">`
      + list.filter(([n]) => ICON_NAMES.includes(n)).map(([n, l, k]) => `<button data-icon="${n}" type="button" title="${esc(t(l))}" data-k="${esc(fold(`${n} ${l} ${t(l)} ${k} ${cat} ${t(cat)}`))}">${iconSVG({ icon: n, color: '#333' })}</button>`).join('') + `</div>`).join('')
    + `<p class="icon-none" hidden>${esc(t('Ningún icono coincide'))}</p></div>`,
  // (With a text selected the style goes on it, and its colour can be changed: neon, fill and gradient in any colour.)
  wordart: () => { const b = selectedBlock(), on = b?.type === 'text';
    return `<h4>Text Art</h4><div class="wa-grid">`
    + WORDART_KEYS.map(k => `<button data-wa="${k}" type="button" class="${on && b.wordart === k ? 'on' : ''}" style="${wordartCSS(k, on && b.wordartColor)}">Aa</button>`).join('') + `</div>`
    + (on && b.wordart ? `<label class="wa-tint">${t('Color del efecto')} <input type="color" data-wa-tint value="${b.wordartColor || '#3f6497'}"></label>` : ''); },
  layout: () => `<h4>${t('Diseño')}</h4><div class="layout-grid">`
    + allMasters().map((m, i, ms) => (ms.length > 1 ? `<div class="layout-master">${esc(m.name || (i ? `${t('Patrón')} ${i + 1}` : t('Patrón')))}</div>` : '')
      + ensureLayouts().filter(l => masterOf(l) === m).map(l => `<button data-layout="${l.id}" type="button" class="${currentSlide()?.layoutId === l.id ? 'on' : ''}">${t(l.name)}</button>`).join('')).join('')
    + `</div>${savedTemplates()}`
    + `<div class="fr-actions"><button type="button" class="mini2" data-reset-slide>${t('Restablecer')}</button>`
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
  // The imported theme's colours (an Office, Google Slides or LibreOffice theme) come first, by its name.
  palettes: () => { const own = officeTheme.themeColours(), cur = palettes.currentPalette();
    const sw = p => `<span class="pal-sw" style="background:${p.bg};color:${p.fg}">Aa${p.accents.map(c => `<i style="background:${c}"></i>`).join('')}</span>`;
    return `<h4>${t('Colores del tema')}</h4><div class="pal-grid">`
    + (own ? `<button data-palette-theme type="button" class="${officeTheme.isThemeColours() ? 'on' : ''}">${sw(own)}<span>${esc(own.name)}</span></button>` : '')
    + (state.deck.palette === 'custom' && !officeTheme.isThemeColours() ? `<button type="button" class="on" disabled>${sw(cur)}<span>${esc(cur.name)}</span></button>` : '')
    + Object.entries(palettes.PALETTES).map(([k, p]) => `<button data-palette="${k}" type="button" class="${(state.deck.palette || 'revela') === k ? 'on' : ''}">`
      + `${sw(p)}<span>${t(p.name)}</span></button>`).join('') + `</div>`
    + `<button type="button" class="mini2 pop-more" data-theme-custom><i class="ms">tune</i> ${t('Colores propios…')}</button>`; },
  fontpairs: () => { const tf = state.deck.officeTheme?.fonts, ts = palettes.themeFontStacks(tf), q = s => esc(s.replace(/"/g, "'"));
    return `<h4>${t('Fuentes del tema')}</h4><div class="fp-list">`
    + (ts ? `<button data-fontpair-theme type="button" class="${state.deck.fontPair === 'theme' ? 'on' : ''}">`
      + `<b style="font-family:${q(ts.heading)}">${esc(tf.major || tf.minor)}</b><span style="font-family:${q(ts.body)}">${esc(tf.minor || tf.major)}</span>`
      + `<small>${esc(tf.name || state.deck.officeTheme.name || '')}</small></button>` : '')
    + Object.entries(palettes.FONT_PAIRS).map(([k, p]) => { const st = palettes.pairStacks(k);
      return `<button data-fontpair="${k}" type="button" class="${state.deck.fontPair === k ? 'on' : ''}">`
        + `<b style="font-family:${st.heading.replace(/"/g, "'")}">${p.heading}</b><span style="font-family:${st.body.replace(/"/g, "'")}">${p.body}</span>`
        + `<small>${t(p.name)}</small></button>`; }).join('') + `</div>`
    + `<button type="button" class="mini2 pop-more" data-theme-custom><i class="ms">tune</i> ${t('Otras fuentes…')}</button>`; },
  // Design ▸ Themes: the document's theme (detected when importing), and another one from a file.
  themes: () => { const d = state.deck, ot = d.officeTheme, p = palettes.currentPalette(), ts = palettes.themeFontStacks(ot?.fonts);
    const fonts = d.fontPair === 'theme' && ot?.fonts ? `${ot.fonts.major || ot.fonts.minor} / ${ot.fonts.minor || ot.fonts.major}`
      : palettes.FONT_PAIRS[d.fontPair] ? `${palettes.FONT_PAIRS[d.fontPair].heading} / ${palettes.FONT_PAIRS[d.fontPair].body}` : '';
    return `<h4>${t('Tema actual')}</h4><div class="theme-card" style="background:${esc(p.bg)};color:${esc(p.fg)}">`
      + `<b style="${ts && d.fontPair === 'theme' ? `font-family:${esc(ts.heading.replace(/"/g, "'"))}` : ''}" data-theme-current>${esc(ot?.name || t(p.name))}</b>`
      + `<span class="pal-sw">${p.accents.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</span>`
      + (fonts ? `<small>${esc(fonts)}</small>` : '') + `</div>`
      + `<p class="theme-hint">${t('Colores, fuentes, patrón y diseños de un PowerPoint (.pptx, .potx), de Google Slides (descargado como .pptx) o de LibreOffice (.odp)')}</p>`
      + `<div class="theme-actions"><button type="button" class="fr-do" data-theme-custom><i class="ms">tune</i> ${t('Personalizar el tema…')}</button><button type="button" class="mini2" data-theme-from>${t('Usar el tema de otra presentación…')}</button>`
      + `<button type="button" class="mini2" data-theme-thmx>${t('Abrir un tema de Office (.thmx)…')}</button>`
      + `<button type="button" class="mini2" data-theme-save>${t('Guardar el tema (.thmx)')}</button></div>`; },
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
// replaceId: the icons gallery changes that icon instead of adding one.
export function togglePopover(launcher, type, { replaceId = null } = {}) {
  const same = openPop && openPop.dataset.type === type;
  closePopover();
  if (same || !POPS[type]) return;
  const pop = document.createElement('div');
  pop.className = 'popover'; pop.dataset.type = type;
  pop.innerHTML = POPS[type]();
  // (The gallery's current choice — layout, colours, fonts, Text Art — is pressed.)
  pop.querySelectorAll('[data-layout],[data-palette],[data-palette-theme],[data-fontpair],[data-fontpair-theme],[data-wa]').forEach(x => x.setAttribute('aria-pressed', String(x.classList.contains('on'))));
  document.body.appendChild(pop);
  // (Whole on the screen, a phone's too: no wider or taller than the window, scrolling inside if it must.)
  pop.style.maxWidth = 'calc(100vw - 16px)';
  const r = launcher.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + 'px';
  pop.style.top = (r.bottom + 4) + 'px'; pop.style.maxHeight = Math.max(160, innerHeight - r.bottom - 12) + 'px'; pop.style.overflowY = 'auto';
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
  pop.querySelector('[data-icon-search]')?.addEventListener('input', e => {
    const q = fold(e.target.value).trim().split(/\s+/).filter(Boolean);
    let any = false;
    pop.querySelectorAll('.icon-groups .sym-grid').forEach(g => {
      let n = 0; g.querySelectorAll('[data-icon]').forEach(x => { const on = q.every(w => x.dataset.k.includes(w)); x.hidden = !on; n += on; });
      g.hidden = !n; g.previousElementSibling.hidden = !n; any ||= n > 0;
    });
    pop.querySelector('.icon-none').hidden = any;
  });
  pop.querySelectorAll('[data-icon]').forEach(x =>
    x.addEventListener('click', () => { if (replaceId) blocks.setIcon(replaceId, x.dataset.icon); else blocks.addIcon(x.dataset.icon); closePopover(); }));
  pop.querySelectorAll('[data-wa]').forEach(x =>
    x.addEventListener('click', () => {
      const b = selectedBlock();
      if (b?.type === 'text') commit(() => { const y = currentSlide().blocks.find(z => z.id === b.id); if (y) y.wordart = x.dataset.wa; });
      else blocks.addWordArt(x.dataset.wa);
      closePopover();
    }));
  pop.querySelector('[data-wa-tint]')?.addEventListener('change', e => {
    const b = selectedBlock(); if (b?.type === 'text') commit(() => { const y = currentSlide().blocks.find(z => z.id === b.id); if (y) y.wordartColor = e.target.value; });
  });
  pop.querySelectorAll('[data-palette]').forEach(x =>
    x.addEventListener('click', () => { palettes.applyPalette(x.dataset.palette); closePopover(); }));
  pop.querySelector('[data-palette-theme]')?.addEventListener('click', () => { const c = officeTheme.themeColours(); if (c) palettes.applyPalette('custom', state.deck, c); closePopover(); });
  pop.querySelector('[data-fontpair-theme]')?.addEventListener('click', () => { palettes.applyThemeFonts(state.deck.officeTheme?.fonts); closePopover(); });
  pop.querySelector('[data-theme-custom]')?.addEventListener('click', () => { closePopover(); openThemeEditor(); });
  pop.querySelector('[data-theme-from]')?.addEventListener('click', () => { closePopover(); readFile('.pptx,.potx,.pptm,.odp,.otp,.thmx', useThemeOf, 'file'); });
  pop.querySelector('[data-theme-thmx]')?.addEventListener('click', () => { closePopover(); readFile('.thmx', useThemeOf, 'file'); });
  pop.querySelector('[data-theme-save]')?.addEventListener('click', () => { closePopover(); saveTheme(); });
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
  pop.querySelectorAll('[data-user-tpl]').forEach(x =>
    x.addEventListener('click', () => { const tp = templates.userTemplates()[x.dataset.userTpl]; if (tp) templates.applyTemplate(tp); closePopover(); }));
  pop.querySelector('[data-reset-slide]')?.addEventListener('click', () => { resetSlide(); closePopover(); });
  pop.querySelector('[data-edit-layouts]')?.addEventListener('click', () => { editLayout(currentSlide()?.layoutId || true); closePopover(); });
  openPop = pop;
}
