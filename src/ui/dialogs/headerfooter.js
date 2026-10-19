// Header and footer: footer text, date, slide number and logo; and the sections bar (render/sectionbar.js), as LaTeX
// Beamer's. In tabs (dlgkit.js: one subject at a time), with a live preview of a slide as it will show, ready-made
// looks to start from (each one shown on that slide) and the rest under «Más opciones»; and the sections themselves,
// with the short name each one shows in the bar.

import { state, commit } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { esc } from '../../core/text.js';
import {
  SECTION_BAR_STYLES, SECTION_BAR_LOOKS, SECTION_BAR_MARKS, SECTION_BAR_MODES, SECTION_BAR_POSITIONS, SECTION_BAR_ALIGNS,
  SECTION_BAR_CASES, SECTION_BAR_DONE, SECTION_BAR_NEXT, SECTION_BAR_SEPS, SECTION_BAR_PRESETS, applyPreset, sectionBarHTML, sectionBarOn, barRoom,
} from '../../render/sectionbar.js';
import { NUMBER_FORMATS, NUMBER_LOOKS, NUMBER_POSITIONS, numberText, slideNumberHTML } from '../../render/slidenumber.js';
import { currentPalette, deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { readableOn } from '../../render/diagrams.js';
import { blockPreview } from '../shell/preview.js';
import { withBlobs } from '../../io/formats/blobmedia.js';
import { masterBlocksFor, isEmptyPlaceholder, styled } from '../../features/document/master.js';
import { tabsHTML, wireTabs, moreHTML, footHTML } from './dlgkit.js';

const BAR_DEFAULTS = { mode: 'sections', position: 'top', style: 'dots', look: 'band', marks: 'dots' };
const DEFAULT_BAR = () => ({ show: false, position: 'top', style: 'dots', skipTitle: true });
const opts = (list, cur, label = l => t(l)) => list.map(([v, l]) => `<option value="${esc(v)}"${String(cur ?? '') === v ? ' selected' : ''}>${esc(label(l))}</option>`).join('');
const sel = (cls, label, list, cur, label2) => `<label class="fr-l">${t(label)}<select class="${cls}">${opts(list, cur, label2)}</select></label>`;
const chk = (cls, label, on) => `<label class="fr-chk"><input type="checkbox" class="${cls}" ${on ? 'checked' : ''}> ${t(label)}</label>`;
const isHex = c => /^#[0-9a-f]{6}$/i.test(c || '');

// A slide as it will show — its contents, the bar and the number — at `w` px wide. deck: to try another bar on it.
function slidePicture(slide, w, deck = state.deck) {
  const { w: W, h: H } = deck.size, fg = readableOn(deckFg(), slide.background || currentPalette().bg), accent = currentPalette().accents[0];
  const box = document.createElement('div'); box.className = 'hf-pic';
  box.style.cssText = `position:relative;width:${w}px;height:${Math.round(w * H / W)}px;overflow:hidden;border-radius:6px;box-shadow:0 0 0 1px color-mix(in srgb,currentColor 18%,transparent);background:${withBlobs(slide.background || currentPalette().bg)}`;
  const inner = document.createElement('div');
  inner.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform:scale(${w / W});transform-origin:0 0;color:${deckFg()};font-family:${deckBodyFont() || 'inherit'};pointer-events:none`;
  for (const b of [...masterBlocksFor(slide), ...slide.blocks.map(x => styled(x, slide))]) if (!isEmptyPlaceholder(b)) inner.appendChild(blockPreview(b, slide, { small: true }));
  inner.insertAdjacentHTML('beforeend', sectionBarHTML(deck, slide, { fg, accent, font: deckBodyFont(), link: false })
    + slideNumberHTML(deck, slide, { fg, accent, font: deckBodyFont(), words: { cof: t('{n} de {t}'), word: t('Diapositiva {n}') }, ...barRoom(deck, slide) }));
  box.appendChild(inner);
  return box;
}

export function openHeaderFooter() {
  if (document.getElementById('hf-modal')) return;
  const deck = state.deck, f = deck.footer, sn = deck.slideNumber, sb = (deck.sectionBar ??= DEFAULT_BAR());
  const noSections = !(deck.sections || []).length;
  const words = { cof: t('{n} de {t}'), word: t('Diapositiva {n}') };
  // (The colours it has by itself, to start from when choosing one's own.)
  const autoColor = k => { const p = currentPalette(), fg = isHex(deckFg()) ? deckFg() : '#ffffff';
    return k === 'accent' ? p.accents[0] : k === 'fg' ? (sb.look === 'color' ? '#ffffff' : fg) : (sb.look === 'color' ? p.accents[0] : (isHex(p.bg) ? p.bg : '#20262e')); };

  const footTab = `${chk('hf-foot', 'Mostrar pie de página', f.show)}
    <label class="fr-l">${t('Texto del pie')}<input type="text" class="hf-text" value="${esc(f.text || '')}"></label>
    ${chk('hf-date', 'Fecha', f.date)}`;
  const numTab = `<div class="hf-preview" data-for="num"></div>
    ${chk('hf-num', 'Número de diapositiva', sn.show)}
    ${sel('hf-pos', 'Posición del número', NUMBER_POSITIONS, sn.position || 'br')}
    <label class="fr-l">${t('Formato del número')}<select class="hf-fmt">${NUMBER_FORMATS.map(([v]) => `<option value="${v}"${(sn.format || 'c') === v ? ' selected' : ''}>${esc(numberText(v, 3, 12, words))}</option>`).join('')}</select></label>
    ${sel('hf-nlook', 'Estilo del número', NUMBER_LOOKS, sn.look || 'plain')}
    ${moreHTML(`<label class="fr-l">${t('Tamaño del número (%)')}<input type="number" class="hf-nsize" min="60" max="250" step="10" value="${+sn.size || 100}"></label>
      <label class="fr-l">${t('Letra del número')}<select class="hf-nfont"><option value="deck"${sn.font !== 'system' ? ' selected' : ''}>${t('La de la presentación')}</option><option value="system"${sn.font === 'system' ? ' selected' : ''}>${t('La del sistema')}</option></select></label>
      ${chk('hf-nown', 'Colores propios', sn.fg || sn.bg)}
      <div class="hf-ncolors" style="display:${sn.fg || sn.bg ? 'flex' : 'none'};gap:12px;margin:0 0 6px">
        ${[['fg', 'Texto'], ['bg', 'Fondo o raya']].map(([k, l]) => `<label class="fr-l" style="flex:1">${t(l)}<input type="color" data-nc="${k}" value="${sn[k] || (k === 'bg' ? currentPalette().accents[0] : (isHex(deckFg()) ? deckFg() : '#ffffff'))}"></label>`).join('')}
      </div>
      ${chk('hf-ntitle', 'Sin número en las portadas', sn.skipTitle)}
      <p class="host-help" style="margin:0 0 6px">${t('Para quitarlo de una diapositiva: clic derecho en su miniatura ▸ «Ocultar el número aquí».')}</p>`)}`;
  const barTab = `<p class="host-help" style="margin:0 0 6px">${t('Como en las presentaciones de LaTeX: dice en qué sección estás y cuánto queda de ella.')}</p>
    ${chk('hf-sb', 'Mostrar la barra de secciones', sb.show)}
    <p class="host-help hf-sb-none" style="margin:0 0 6px"${noSections ? '' : ' hidden'}>${t('Aún no hay secciones: créalas en el panel de diapositivas (clic derecho ▸ «Crear sección aquí»).')}</p>
    <div class="hf-preview" data-for="bar"></div>
    <div class="hf-sub">${t('Estilos rápidos')}</div>
    <div class="hf-presets" role="list">${SECTION_BAR_PRESETS.map(([k, l]) => `<button type="button" class="hf-preset" data-preset="${k}" role="listitem" title="${esc(t(l))}"><span class="hf-preset-pic"></span><span>${esc(t(l))}</span></button>`).join('')}</div>
    <div class="hf-grid">
      ${sel('hf-sb-mode', 'Modo', SECTION_BAR_MODES, sb.mode || (sb.position === 'left' || sb.position === 'right' ? 'sidebar' : 'sections'))}
      ${sel('hf-sb-pos', 'Posición de la barra', SECTION_BAR_POSITIONS, sb.position || 'top')}
      ${sel('hf-sb-look', 'Aspecto', SECTION_BAR_LOOKS, sb.look || 'band')}
      <span data-when="sections sidebar">${sel('hf-sb-style', 'Secciones que muestra', SECTION_BAR_STYLES, sb.style || 'dots')}</span>
      <span data-when="sections sidebar">${sel('hf-sb-marks', 'Dónde va cada diapositiva', SECTION_BAR_MARKS, sb.marks || 'dots')}</span>
    </div>
    ${moreHTML(`<div class="hf-grid">
      <span data-when="sections breadcrumb">${sel('hf-sb-align', 'Alineación', SECTION_BAR_ALIGNS, sb.align || 'start')}</span>
      <span data-when="sections sidebar breadcrumb">${sel('hf-sb-sep', 'Separador', SECTION_BAR_SEPS, sb.sep || '', l => (l === 'Ninguno' ? t(l) : l))}</span>
      <span data-when="sections sidebar">${sel('hf-sb-done', 'Secciones ya vistas', SECTION_BAR_DONE, sb.done || 'dim')}</span>
      <span data-when="sections sidebar">${sel('hf-sb-next', 'Secciones por venir', SECTION_BAR_NEXT, sb.next || 'dim')}</span>
      <span data-when="sections sidebar breadcrumb infolines">${sel('hf-sb-case', 'Letras', SECTION_BAR_CASES, sb.case || '')}</span>
      <label class="fr-l">${t('Tamaño de la letra (%)')}<input type="number" class="hf-sb-size" min="60" max="200" step="10" value="${+sb.size || 100}"></label>
      <label class="fr-l">${t('Letra de la barra')}<select class="hf-sb-font"><option value="deck"${sb.font !== 'system' ? ' selected' : ''}>${t('La de la presentación')}</option><option value="system"${sb.font === 'system' ? ' selected' : ''}>${t('La del sistema')}</option></select></label>
      <label class="fr-l" data-when="sidebar">${t('Ancho del índice (%)')}<input type="number" class="hf-sb-width" min="12" max="35" step="1" value="${+sb.width || 20}"></label>
      <label class="fr-l" data-when="infolines">${t('Texto del primer recuadro')}<input type="text" class="hf-sb-left" value="${esc(sb.left ?? '')}" placeholder="${esc(f.text || t('El texto del pie'))}"></label>
    </div>
    <span data-when="sections sidebar">${chk('hf-sb-numbered', 'Numerar las secciones (1. Introducción)', sb.numbered)}</span>
    <span data-when="sections sidebar breadcrumb infolines">${chk('hf-sb-progress', 'Con una línea del avance de toda la presentación', sb.deckProgress)}</span>
    ${chk('hf-sb-own', 'Colores propios', sb.bg || sb.fg || sb.accent)}
    <div class="hf-sb-colors" style="display:${sb.bg || sb.fg || sb.accent ? 'flex' : 'none'};gap:12px;flex-wrap:wrap;margin:0 0 6px">
      ${[['bg', 'Fondo'], ['fg', 'Texto'], ['accent', 'Sección actual']].map(([k, l]) => `<label class="fr-l" style="flex:1">${t(l)}<input type="color" data-sbc="${k}" value="${sb[k] || autoColor(k)}"></label>`).join('')}
    </div>
    ${chk('hf-sb-title', 'Sin barra en las portadas', sb.skipTitle !== false)}
    <p class="host-help" style="margin:0">${t('Para quitarla de una diapositiva: clic derecho en su miniatura ▸ «Ocultar la barra de secciones aquí».')}</p>`)}`;
  const secTab = () => (deck.sections || []).length
    ? `<p class="host-help" style="margin:0 0 8px">${t('El nombre corto es el que sale en la barra (como \\section[corto]{largo} en LaTeX); si no hay, el nombre.')}</p>
      <div class="hf-secs">${deck.sections.map((s, i) => `<div class="hf-sec"><span class="hf-sec-n">${i + 1}</span>
        <label class="fr-l">${t('Nombre')}<input type="text" class="hf-sec-name" data-sec="${esc(s.id)}" value="${esc(s.name || '')}"></label>
        <label class="fr-l">${t('Nombre corto')}<input type="text" class="hf-sec-short" data-sec="${esc(s.id)}" value="${esc(s.short || '')}" placeholder="${esc(t('Opcional'))}"></label></div>`).join('')}</div>`
    : `<p class="host-help">${t('Aún no hay secciones: créalas en el panel de diapositivas (clic derecho ▸ «Crear sección aquí»).')}</p>`;

  const back = document.createElement('div');
  back.id = 'hf-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(820px,96vw);max-width:none">
    <button class="modal-close">✕</button><h3>${t('Encabezado y pie')}</h3>
    <div class="dk-wrap">${tabsHTML([
      { id: 'bar', icon: 'view_week', label: t('Barra de secciones'), html: barTab },
      { id: 'num', icon: 'tag', label: t('Número de diapositiva'), html: numTab },
      { id: 'foot', icon: 'short_text', label: t('Pie de página'), html: footTab },
      { id: 'secs', icon: 'segment', label: t('Secciones'), html: secTab() },
    ])}</div>
    ${footHTML(`<button class="fr-do hf-ok">${t('Aplicar')}</button>`)}
  </div>`;
  document.body.appendChild(back);
  if (!document.getElementById('hf-style')) {
    const st = document.createElement('style'); st.id = 'hf-style';
    st.textContent = `#hf-modal .hf-preview{display:flex;flex-direction:column;align-items:center;gap:4px;margin:4px 0 12px}
      #hf-modal .hf-preview .host-help{margin:0}
      #hf-modal .hf-sub{font-weight:600;margin:6px 0 6px}
      #hf-modal .hf-presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(186px,1fr));gap:8px;margin:0 0 12px}
      #hf-modal .hf-preset{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border:1px solid var(--border,#8884);border-radius:8px;background:none;color:inherit;font:inherit;font-size:13px;cursor:pointer}
      #hf-modal .hf-preset:hover,#hf-modal .hf-preset:focus-visible{border-color:var(--accent,#3f6497)}
      #hf-modal .hf-preset.on{border-color:var(--accent,#3f6497);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent,#3f6497) 40%,transparent)}
      #hf-modal .hf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0 14px}
      #hf-modal .hf-grid>span{display:contents}
      #hf-modal .hf-secs{display:flex;flex-direction:column;gap:6px}
      #hf-modal .hf-sec{display:grid;grid-template-columns:24px 1fr 1fr;gap:10px;align-items:end}
      #hf-modal .hf-sec-n{opacity:.6;padding-bottom:10px;text-align:center}
      @media (max-width:640px){#hf-modal .hf-sec{grid-template-columns:20px 1fr}#hf-modal .hf-sec label:last-child{grid-column:2}}`;
    document.head.appendChild(st);
  }
  const q = s => back.querySelector(s); const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  wireTabs(back, 'revela.hf.tab');

  // The slide shown: the one in view, or — if it has no bar (a cover, before the first section) — the first that has.
  const shownSlide = () => {
    const vis = deck.slides.filter(s => !s.hidden), here = deck.slides[state.ui.slideIndex];
    if (here && !here.hidden && (!deck.sectionBar?.show || sectionBarOn(deck, here))) return here;
    return vis.find(s => sectionBarOn(deck, s)) || here || vis[0];
  };
  const presetOn = () => SECTION_BAR_PRESETS.find(([, , p]) => Object.entries(p).every(([k, v]) => (deck.sectionBar[k] ?? BAR_DEFAULTS[k]) === v))?.[0];
  // Fields that only mean something in some modes: shown only there.
  const sync = () => {
    const m = q('.hf-sb-mode').value;
    back.querySelectorAll('[data-when]').forEach(el => { el.hidden = !el.dataset.when.split(' ').includes(m); el.style.display = el.hidden ? 'none' : ''; });
  };
  const paint = () => {
    const slide = shownSlide(); if (!slide) return;
    for (const box of back.querySelectorAll('.hf-preview')) {
      const w = Math.min(420, Math.max(220, (box.clientWidth || 420)));
      box.replaceChildren(slidePicture(slide, w));
      const n = deck.slides.indexOf(slide) + 1, p = document.createElement('p'); p.className = 'host-help';
      p.textContent = t('Vista previa: diapositiva {n}').replace('{n}', n) + (box.dataset.for === 'bar' && !deck.sectionBar.show ? ' · ' + t('la barra está apagada') : '');
      box.appendChild(p);
    }
    // Each ready-made look, on the same slide.
    const on = presetOn();
    for (const b of back.querySelectorAll('.hf-preset')) {
      const trial = { ...deck, sectionBar: applyPreset({ ...deck.sectionBar, show: true }, b.dataset.preset) };
      b.querySelector('.hf-preset-pic').replaceChildren(slidePicture(slide, 172, trial));
      b.classList.toggle('on', b.dataset.preset === on); b.setAttribute('aria-pressed', b.dataset.preset === on);
    }
    sync();
  };
  const later = fn => (...a) => { fn(...a); paint(); };

  q('.hf-foot').addEventListener('change', later(e => commit(() => { deck.footer.show = e.target.checked; })));
  q('.hf-text').addEventListener('input', later(e => commit(() => { deck.footer.text = e.target.value; }, { history: false })));
  q('.hf-date').addEventListener('change', later(e => commit(() => { deck.footer.date = e.target.checked; })));
  const nSet = fn => { commit(() => fn(deck.slideNumber)); paint(); };
  q('.hf-num').addEventListener('change', e => nSet(x => { x.show = e.target.checked; }));
  q('.hf-pos').addEventListener('change', e => nSet(x => { x.position = e.target.value; }));
  q('.hf-fmt').addEventListener('change', e => nSet(x => { x.format = e.target.value; }));
  q('.hf-nlook').addEventListener('change', e => nSet(x => { x.look = e.target.value; }));
  q('.hf-nsize').addEventListener('change', e => nSet(x => { const v = Math.round(+e.target.value || 100); if (v >= 60 && v <= 250 && v !== 100) x.size = v; else delete x.size; }));
  q('.hf-nfont').addEventListener('change', e => nSet(x => { if (e.target.value === 'system') x.font = 'system'; else delete x.font; }));
  q('.hf-ntitle').addEventListener('change', e => nSet(x => { if (e.target.checked) x.skipTitle = true; else delete x.skipTitle; }));
  q('.hf-nown').addEventListener('change', e => {
    q('.hf-ncolors').style.display = e.target.checked ? 'flex' : 'none';
    nSet(x => { for (const el of back.querySelectorAll('[data-nc]')) { if (e.target.checked) x[el.dataset.nc] = el.value; else delete x[el.dataset.nc]; } });
  });
  back.querySelectorAll('[data-nc]').forEach(el => el.addEventListener('change', () => nSet(x => { x[el.dataset.nc] = el.value; })));

  const sbSet = fn => { commit(() => { fn(deck.sectionBar ??= DEFAULT_BAR()); }); paint(); };
  // (An option at its default is left out, not saved: a deck that never chose it reads as before.)
  const opt = (k, v, def) => x => { if (v === def || v === '' || v == null) delete x[k]; else x[k] = v; };
  q('.hf-sb').addEventListener('change', e => sbSet(x => { x.show = e.target.checked; }));
  // Mode and position go together: a side index is on a side; the others, at the top or the bottom.
  q('.hf-sb-mode').addEventListener('change', e => sbSet(x => {
    const m = e.target.value; if (m === 'sections') delete x.mode; else x.mode = m;
    const side = x.position === 'left' || x.position === 'right';
    if (m === 'sidebar' && !side) x.position = 'left';
    if (m !== 'sidebar' && side) x.position = m === 'infolines' ? 'bottom' : 'top';
    if (m === 'infolines' && x.position !== 'top') x.position = 'bottom';
    q('.hf-sb-pos').value = x.position || 'top';
  }));
  q('.hf-sb-pos').addEventListener('change', e => sbSet(x => {
    x.position = e.target.value; const side = x.position === 'left' || x.position === 'right';
    if (side) x.mode = 'sidebar'; else if (x.mode === 'sidebar') delete x.mode;
    q('.hf-sb-mode').value = x.mode || 'sections';
  }));
  for (const [cls, k, def] of [['style', 'style', null], ['look', 'look', null], ['marks', 'marks', null], ['align', 'align', 'start'], ['sep', 'sep', ''],
    ['done', 'done', 'dim'], ['next', 'next', 'dim'], ['case', 'case', '']]) {
    q('.hf-sb-' + cls).addEventListener('change', e => sbSet(def === null ? (x => { x[k] = e.target.value; }) : opt(k, e.target.value, def)));
  }
  q('.hf-sb-numbered').addEventListener('change', e => sbSet(opt('numbered', e.target.checked || null, null)));
  q('.hf-sb-progress').addEventListener('change', e => sbSet(opt('deckProgress', e.target.checked || null, null)));
  q('.hf-sb-title').addEventListener('change', e => sbSet(x => { x.skipTitle = e.target.checked; }));
  q('.hf-sb-size').addEventListener('change', e => sbSet(x => { const v = Math.round(+e.target.value || 100); if (v >= 60 && v <= 200 && v !== 100) x.size = v; else delete x.size; }));
  q('.hf-sb-width').addEventListener('change', e => sbSet(x => { const v = Math.round(+e.target.value || 20); if (v >= 12 && v <= 35 && v !== 20) x.width = v; else delete x.width; }));
  q('.hf-sb-left').addEventListener('input', e => sbSet(x => { if (e.target.value) x.left = e.target.value; else delete x.left; }));
  q('.hf-sb-font').addEventListener('change', e => sbSet(x => { if (e.target.value === 'system') x.font = 'system'; else delete x.font; }));
  // Its own colours: all three from the pickers; off, the theme's again.
  q('.hf-sb-own').addEventListener('change', e => {
    q('.hf-sb-colors').style.display = e.target.checked ? 'flex' : 'none';
    sbSet(x => { for (const el of back.querySelectorAll('[data-sbc]')) { if (e.target.checked) x[el.dataset.sbc] = el.value; else delete x[el.dataset.sbc]; } });
  });
  back.querySelectorAll('[data-sbc]').forEach(el => el.addEventListener('change', () => sbSet(x => { x[el.dataset.sbc] = el.value; })));
  // A ready-made look: on (it shows the bar), and the fields say what it set.
  back.querySelectorAll('.hf-preset').forEach(b => b.addEventListener('click', () => {
    sbSet(x => { applyPreset(x, b.dataset.preset); x.show = true; });
    const x = deck.sectionBar;
    q('.hf-sb').checked = true;
    q('.hf-sb-mode').value = x.mode || 'sections'; q('.hf-sb-pos').value = x.position || 'top';
    for (const [cls, k, def] of [['style', 'style', 'dots'], ['look', 'look', 'band'], ['marks', 'marks', 'dots'], ['align', 'align', 'start'], ['sep', 'sep', ''], ['done', 'done', 'dim'], ['next', 'next', 'dim'], ['case', 'case', '']]) q('.hf-sb-' + cls).value = x[k] || def;
    q('.hf-sb-numbered').checked = !!x.numbered; q('.hf-sb-progress').checked = !!x.deckProgress;
    sync();
  }));
  // The sections: their names and short names.
  back.querySelectorAll('.hf-sec-name, .hf-sec-short').forEach(el => el.addEventListener('change', () => {
    const s = deck.sections.find(x => x.id === el.dataset.sec); if (!s) return;
    commit(() => { if (el.classList.contains('hf-sec-name')) { if (el.value.trim()) s.name = el.value.trim(); else el.value = s.name; } else if (el.value.trim()) s.short = el.value.trim(); else delete s.short; });
    paint();
  }));
  q('.hf-ok').addEventListener('click', close);
  // (The tab shown decides the preview's width: painted once it is laid out, and again on changing tab.)
  back.querySelectorAll('.dk-tab').forEach(b => b.addEventListener('click', () => requestAnimationFrame(paint)));
  requestAnimationFrame(paint);
}
