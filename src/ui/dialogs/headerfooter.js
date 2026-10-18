// Header and footer: footer text, date, slide number and logo; and the sections bar (render/sectionbar.js).

import { state, commit } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { SECTION_BAR_STYLES, SECTION_BAR_LOOKS, SECTION_BAR_MARKS } from '../../render/sectionbar.js';
import { NUMBER_FORMATS, NUMBER_LOOKS, NUMBER_POSITIONS, numberText } from '../../render/slidenumber.js';
import { currentPalette, deckFg } from '../../features/design/palettes.js';

const $ = s => document.querySelector(s);

export function openHeaderFooter() {
  if (document.getElementById('hf-modal')) return;
  const f = state.deck.footer, sn = state.deck.slideNumber, sb = (state.deck.sectionBar ??= { show: false, position: 'top', style: 'dots', skipTitle: true });
  const noSections = !(state.deck.sections || []).length;
  const words = { cof: t('{n} de {t}'), word: t('Diapositiva {n}') };
  // (The colours it has by itself, to start from when choosing one's own.)
  const autoColor = k => { const p = currentPalette(), fg = /^#[0-9a-f]{6}$/i.test(deckFg()) ? deckFg() : '#ffffff';
    return k === 'accent' ? p.accents[0] : k === 'fg' ? (sb.look === 'color' ? '#ffffff' : fg) : (sb.look === 'color' ? p.accents[0] : (/^#[0-9a-f]{6}$/i.test(p.bg || '') ? p.bg : '#20262e')); };
  const back = document.createElement('div');
  back.id = 'hf-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Encabezado y pie')}</h3>
    <label class="fr-chk"><input type="checkbox" class="hf-foot" ${f.show ? 'checked' : ''}> ${t('Mostrar pie de página')}</label>
    <label class="fr-l">${t('Texto del pie')}<input type="text" class="hf-text" value="${(f.text || '').replace(/"/g, '&quot;')}"></label>
    <label class="fr-chk"><input type="checkbox" class="hf-date" ${f.date ? 'checked' : ''}> ${t('Fecha')}</label>
    <label class="fr-chk"><input type="checkbox" class="hf-num" ${sn.show ? 'checked' : ''}> ${t('Número de diapositiva')}</label>
    <label class="fr-l">${t('Posición del número')}<select class="hf-pos">${NUMBER_POSITIONS.map(([v, l]) => `<option value="${v}"${(sn.position || 'br') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Formato del número')}<select class="hf-fmt">${NUMBER_FORMATS.map(([v, l]) => `<option value="${v}"${(sn.format || 'c') === v ? ' selected' : ''}>${numberText(v, 3, 12, words)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Estilo del número')}<select class="hf-nlook">${NUMBER_LOOKS.map(([v, l]) => `<option value="${v}"${(sn.look || 'plain') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Tamaño del número (%)')}<input type="number" class="hf-nsize" min="60" max="250" step="10" value="${+sn.size || 100}"></label>
    <label class="fr-l">${t('Letra del número')}<select class="hf-nfont"><option value="deck"${sn.font !== 'system' ? ' selected' : ''}>${t('La de la presentación')}</option><option value="system"${sn.font === 'system' ? ' selected' : ''}>${t('La del sistema')}</option></select></label>
    <label class="fr-chk"><input type="checkbox" class="hf-nown" ${sn.fg || sn.bg ? 'checked' : ''}> ${t('Colores propios')}</label>
    <div class="hf-ncolors" style="display:${sn.fg || sn.bg ? 'flex' : 'none'};gap:12px;margin:0 0 6px">
      ${[['fg', 'Texto'], ['bg', 'Fondo o raya']].map(([k, l]) => `<label class="fr-l" style="flex:1">${t(l)}<input type="color" data-nc="${k}" value="${sn[k] || (k === 'bg' ? currentPalette().accents[0] : (/^#[0-9a-f]{6}$/i.test(deckFg()) ? deckFg() : '#ffffff'))}"></label>`).join('')}
    </div>
    <label class="fr-chk"><input type="checkbox" class="hf-ntitle" ${sn.skipTitle ? 'checked' : ''}> ${t('Sin número en las portadas')}</label>
    <p class="host-help" style="margin:0 0 6px">${t('Para quitarlo de una diapositiva: clic derecho en su miniatura ▸ «Ocultar el número aquí».')}</p>
    <h4 style="margin:14px 0 4px">${t('Barra de secciones')}</h4>
    <p class="host-help" style="margin:0 0 6px">${t('Como en las presentaciones de LaTeX: dice en qué sección estás y cuánto queda de ella.')}</p>
    <label class="fr-chk"><input type="checkbox" class="hf-sb" ${sb.show ? 'checked' : ''}> ${t('Mostrar la barra de secciones')}</label>
    ${noSections ? `<p class="host-help hf-sb-none" style="margin:0 0 6px">${t('Aún no hay secciones: créalas en el panel de diapositivas (clic derecho ▸ «Crear sección aquí»).')}</p>` : ''}
    <label class="fr-l">${t('Posición de la barra')}<select class="hf-sb-pos">${[['top', 'Arriba'], ['bottom', 'Abajo']].map(([v, l]) => `<option value="${v}"${(sb.position || 'top') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Aspecto')}<select class="hf-sb-look">${SECTION_BAR_LOOKS.map(([v, l]) => `<option value="${v}"${(sb.look || 'band') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Secciones que muestra')}<select class="hf-sb-style">${SECTION_BAR_STYLES.map(([v, l]) => `<option value="${v}"${(sb.style || 'dots') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Dónde va cada diapositiva')}<select class="hf-sb-marks">${SECTION_BAR_MARKS.map(([v, l]) => `<option value="${v}"${(sb.marks || 'dots') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
    <label class="fr-l">${t('Tamaño de la letra (%)')}<input type="number" class="hf-sb-size" min="60" max="200" step="10" value="${+sb.size || 100}"></label>
    <label class="fr-l">${t('Letra de la barra')}<select class="hf-sb-font"><option value="deck"${sb.font !== 'system' ? ' selected' : ''}>${t('La de la presentación')}</option><option value="system"${sb.font === 'system' ? ' selected' : ''}>${t('La del sistema')}</option></select></label>
    <label class="fr-chk"><input type="checkbox" class="hf-sb-own" ${sb.bg || sb.fg || sb.accent ? 'checked' : ''}> ${t('Colores propios')}</label>
    <div class="hf-sb-colors" style="display:${sb.bg || sb.fg || sb.accent ? 'flex' : 'none'};gap:12px;flex-wrap:wrap;margin:0 0 6px">
      ${[['bg', 'Fondo'], ['fg', 'Texto'], ['accent', 'Sección actual']].map(([k, l]) => `<label class="fr-l" style="flex:1">${t(l)}<input type="color" data-sbc="${k}" value="${sb[k] || autoColor(k)}"></label>`).join('')}
    </div>
    <label class="fr-chk"><input type="checkbox" class="hf-sb-title" ${sb.skipTitle !== false ? 'checked' : ''}> ${t('Sin barra en las portadas')}</label>
    <p class="host-help" style="margin:0">${t('Para quitarla de una diapositiva: clic derecho en su miniatura ▸ «Ocultar la barra de secciones aquí».')}</p>
    <div class="fr-actions"><button class="fr-do hf-ok">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s); const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.hf-foot').addEventListener('change', e => commit(() => { state.deck.footer.show = e.target.checked; }));
  q('.hf-text').addEventListener('input', e => commit(() => { state.deck.footer.text = e.target.value; }, { history: false }));
  q('.hf-date').addEventListener('change', e => commit(() => { state.deck.footer.date = e.target.checked; }));
  q('.hf-num').addEventListener('change', e => commit(() => { state.deck.slideNumber.show = e.target.checked; }));
  q('.hf-pos').addEventListener('change', e => commit(() => { state.deck.slideNumber.position = e.target.value; }));
  q('.hf-fmt').addEventListener('change', e => commit(() => { state.deck.slideNumber.format = e.target.value; }));
  const nSet = fn => commit(() => fn(state.deck.slideNumber));
  q('.hf-nlook').addEventListener('change', e => nSet(x => { x.look = e.target.value; }));
  q('.hf-nsize').addEventListener('change', e => nSet(x => { const v = Math.round(+e.target.value || 100); if (v >= 60 && v <= 250 && v !== 100) x.size = v; else delete x.size; }));
  q('.hf-nfont').addEventListener('change', e => nSet(x => { if (e.target.value === 'system') x.font = 'system'; else delete x.font; }));
  q('.hf-ntitle').addEventListener('change', e => nSet(x => { if (e.target.checked) x.skipTitle = true; else delete x.skipTitle; }));
  q('.hf-nown').addEventListener('change', e => {
    q('.hf-ncolors').style.display = e.target.checked ? 'flex' : 'none';
    nSet(x => { for (const el of back.querySelectorAll('[data-nc]')) { if (e.target.checked) x[el.dataset.nc] = el.value; else delete x[el.dataset.nc]; } });
  });
  back.querySelectorAll('[data-nc]').forEach(el => el.addEventListener('change', () => nSet(x => { x[el.dataset.nc] = el.value; })));
  const sbSet = fn => commit(() => { fn(state.deck.sectionBar ??= { show: false, position: 'top', style: 'dots', skipTitle: true }); });
  q('.hf-sb').addEventListener('change', e => sbSet(x => { x.show = e.target.checked; }));
  q('.hf-sb-pos').addEventListener('change', e => sbSet(x => { x.position = e.target.value; }));
  q('.hf-sb-style').addEventListener('change', e => sbSet(x => { x.style = e.target.value; }));
  q('.hf-sb-title').addEventListener('change', e => sbSet(x => { x.skipTitle = e.target.checked; }));
  q('.hf-sb-look').addEventListener('change', e => sbSet(x => { x.look = e.target.value; }));
  q('.hf-sb-marks').addEventListener('change', e => sbSet(x => { x.marks = e.target.value; }));
  q('.hf-sb-size').addEventListener('change', e => sbSet(x => { const v = Math.round(+e.target.value || 100); if (v >= 60 && v <= 200 && v !== 100) x.size = v; else delete x.size; }));
  q('.hf-sb-font').addEventListener('change', e => sbSet(x => { if (e.target.value === 'system') x.font = 'system'; else delete x.font; }));
  // Its own colours: all three from the pickers; off, the theme's again.
  q('.hf-sb-own').addEventListener('change', e => {
    q('.hf-sb-colors').style.display = e.target.checked ? 'flex' : 'none';
    sbSet(x => { for (const el of back.querySelectorAll('[data-sbc]')) { if (e.target.checked) x[el.dataset.sbc] = el.value; else delete x[el.dataset.sbc]; } });
  });
  back.querySelectorAll('[data-sbc]').forEach(el => el.addEventListener('change', () => sbSet(x => { x[el.dataset.sbc] = el.value; })));
  q('.hf-ok').addEventListener('click', close);
}
