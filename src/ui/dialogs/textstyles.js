// Master text styles (PowerPoint's Slide Master text formatting): title,
// subtitle and body text in five levels, each with font, size, colour, bold,
// italic, alignment and bullet. Changes apply at once to every placeholder that
// didn't override them.
//
// As in PowerPoint, the theme is the base and the styles pick from it: a
// colour can be one of the theme's slots (Texto 1, Fondo 1, Énfasis 1…) and a
// font the theme's heading or body font, and then they follow Design ▸ Colours
// and Fonts; a colour or font of one's own stays. The dialog shows a preview
// with the current theme, and how many placeholders keep formatting of their
// own (which the style doesn't change), with a button to drop it.

import { esc } from '../../core/text.js';
import { state, subscribe } from '../../core/store.js';
import { masterStyles, setMasterStyle, MAX_LEVELS, contextMaster, styled, levelVars, viewBackground, styleOverrides, clearStyleOverrides } from '../../features/document/master.js';
import { FONTS, ensureFont } from '../../features/design/fonts.js';
import { THEME_SLOTS, themeSlots, isThemeRef, deckFontStacks, deckFg } from '../../features/design/palettes.js';
import { levelCSS } from '../../render/svg.js';
import { t } from '../../i18n/index.js';

const BULLETS = [['disc', '●'], ['circle', '○'], ['square', '■'], ['–', '–'], ['›', '›'], ['✓', '✓'], ['★', '★'], ['decimal', '1.'], ['none', t('Ninguna')]];
const SLOT_NAMES = { tx1: 'Texto 1', bg1: 'Fondo 1', tx2: 'Texto 2', bg2: 'Fondo 2', accent1: 'Énfasis 1', accent2: 'Énfasis 2', accent3: 'Énfasis 3',
  accent4: 'Énfasis 4', accent5: 'Énfasis 5', accent6: 'Énfasis 6' };
const PROPS = ['size', 'color', 'font', 'bold', 'italic', 'align'];
const firstFamily = s => String(s || '').split(',')[0].replace(/["']/g, '').trim();

export function openTextStyles() {
  document.getElementById('ts2-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'ts2-modal'; back.className = 'modal-backdrop';
  const rows = [['title', null, t('Título')], ['subtitle', null, t('Subtítulo')],
    ...Array.from({ length: MAX_LEVELS }, (_, i) => ['body', i, `${t('Texto')} · ${t('nivel')} ${i + 1}`])];
  const slots = themeSlots(), fonts = deckFontStacks();
  // Font: the theme's two first (linked), then the catalogue; an imported font that isn't in it, as itself.
  const fontSel = v => {
    const known = !v || isThemeRef(v) || FONTS.some(f => f.stack === v);
    return `<select data-k="font">`
      + `<option value="theme:major"${v === 'theme:major' ? ' selected' : ''}>${esc(t('Títulos (fuente del tema)'))}${fonts.heading ? ' · ' + esc(firstFamily(fonts.heading)) : ''}</option>`
      + `<option value="theme:minor"${v === 'theme:minor' ? ' selected' : ''}>${esc(t('Cuerpo (fuente del tema)'))}${fonts.body ? ' · ' + esc(firstFamily(fonts.body)) : ''}</option>`
      + (known ? '' : `<option value="${esc(v)}" selected>${esc(firstFamily(v))}</option>`)
      + FONTS.map(f => `<option value="${esc(f.stack)}"${f.stack === (v || '') && !isThemeRef(v) ? ' selected' : ''}>${esc(t(f.name))}</option>`).join('') + `</select>`;
  };
  // Colour: automatic (the theme's text), a theme slot, or one of one's own.
  const colourSel = c => {
    const slot = isThemeRef(c) ? c.slice(6) : '', own = c && !slot;
    return `<span class="ts2-sw" style="background:${esc(slot ? slots[slot] : c || deckFg())}"></span><select data-k="cref">`
      + `<option value=""${!c ? ' selected' : ''}>${t('Automático')}</option>`
      + THEME_SLOTS.map(k => `<option value="${k}"${slot === k ? ' selected' : ''}>${t(SLOT_NAMES[k])}</option>`).join('')
      + `<option value="custom"${own ? ' selected' : ''}>${t('Personalizado')}</option></select>`
      + `<input type="color" data-k="color" value="${esc(own && /^#[0-9a-f]{6}$/i.test(c) ? c : slots[slot] || deckFg())}" title="${t('Color propio')}"${own ? '' : ' hidden'}>`;
  };
  const row = ([kind, lv, label]) => {
    const st = masterStyles(undefined, contextMaster())[kind], s = lv != null ? { ...st, ...st.levels[lv], ...(lv === 0 && { color: st.levels[0].color ?? st.color }) } : st;
    const whole = lv == null || lv === 0;
    return `<tr data-kind="${kind}"${lv != null ? ` data-lv="${lv}"` : ''}>
      <th>${esc(label)}</th>
      <td>${whole ? fontSel(s.font) : ''}</td>
      <td><input type="number" data-k="size" min="8" max="200" value="${s.size || ''}" title="${t('Tamaño')}"></td>
      <td><div class="ts2-col">${colourSel(s.color)}</div></td>
      <td>${whole ? `<button type="button" data-k="bold" class="mini2${s.bold ? ' on' : ''}"><b>B</b></button><button type="button" data-k="italic" class="mini2${s.italic ? ' on' : ''}"><i>I</i></button>` : ''}</td>
      <td>${whole ? `<select data-k="align">${['', 'left', 'center', 'right', 'justify'].map(a => `<option value="${a}"${(s.align || '') === a ? ' selected' : ''}>${a ? t({ left: 'Izquierda', center: 'Centro', right: 'Derecha', justify: 'Justificado' }[a]) : '—'}</option>`).join('')}</select>` : ''}</td>
      <td>${lv != null ? `<select data-k="bullet">${BULLETS.map(([v, l]) => `<option value="${esc(v)}"${(s.bullet || 'disc') === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}</td>
      <td class="ts2-own">${whole ? '<button type="button" class="mini2" data-k="own" hidden></button>' : ''}</td>
    </tr>`;
  };
  back.innerHTML = `<div class="modal" style="text-align:start;max-width:min(980px,96vw)">
    <button class="modal-close">✕</button><h3>${t('Estilos de texto del patrón')}${contextMaster().name ? ` · ${esc(contextMaster().name)}` : ''}</h3>
    <p class="host-help">${t('Los colores y fuentes del tema son la base; los estilos de texto deciden qué usa cada nivel. Un color o una fuente «del tema» cambia con Diseño ▸ Colores y Fuentes; uno propio, no.')}
      ${t('Se aplican a los marcadores de todas las diapositivas, salvo lo que se haya cambiado a mano en ellas. Los niveles son los de las listas (Tab para bajar de nivel).')}</p>
    <style>${levelCSS('#ts2-modal ')}</style>
    <div class="ts2-body"><div class="ts2-wrap"><table class="ts2"><thead><tr><th></th><th>${t('Fuente')}</th><th>${t('Tamaño')}</th><th>${t('Color')}</th><th></th><th>${t('Alineación')}</th><th>${t('Viñeta')}</th><th></th></tr></thead>
      <tbody>${rows.map(row).join('')}</tbody></table></div>
      <div class="ts2-preview" aria-label="${esc(t('Vista previa'))}"><div class="ts2-stage"></div></div></div></div>`;
  document.body.appendChild(back);
  let unsub = null;
  const close = () => { unsub?.(); back.remove(); };
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const apply = (tr, props) => setMasterStyle(tr.dataset.kind, props, tr.dataset.lv != null && tr.dataset.lv !== '' ? +tr.dataset.lv : null);
  back.querySelectorAll('tbody tr').forEach(tr => {
    const lv = tr.dataset.lv != null ? +tr.dataset.lv : null;
    // Font, bold, italic and alignment of the body live on its first level row but belong to the whole body.
    const whole = props => setMasterStyle(tr.dataset.kind, props, null);
    tr.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k;
      const on = el.tagName === 'BUTTON' ? 'click' : el.type === 'number' || el.type === 'color' ? 'input' : 'change';
      el.addEventListener(on, () => {
        if (k === 'size') { const v = +el.value; if (v >= 8) apply(tr, { size: v }); }
        else if (k === 'color') apply(tr, { color: el.value });
        else if (k === 'cref') {
          const pick = tr.querySelector('[data-k="color"]'); pick.hidden = el.value !== 'custom';
          apply(tr, { color: el.value === 'custom' ? pick.value : el.value ? 'theme:' + el.value : null });
        }
        else if (k === 'font') { ensureFont(el.value); (lv != null ? whole : p => apply(tr, p))({ font: el.value || null }); }
        else if (k === 'bold' || k === 'italic') { el.classList.toggle('on'); (lv != null ? whole : p => apply(tr, p))({ [k]: el.classList.contains('on') }); }
        else if (k === 'align') (lv != null ? whole : p => apply(tr, p))({ align: el.value || null });
        else if (k === 'bullet') apply(tr, { bullet: el.value });
        else if (k === 'own') PROPS.forEach(p => clearStyleOverrides(tr.dataset.kind, p));
      });
    });
  });
  refresh(back);
  unsub = subscribe(() => { if (back.isConnected) refresh(back); else unsub?.(); });
}

// The preview (title and the five levels, on the master's background, in the
// theme's colours and fonts), the colour swatches and the "own formatting" counts.
function refresh(back) {
  const m = contextMaster(), slots = themeSlots();
  const ph = (kind, extra) => styled({ id: 'ts2-' + kind, type: 'text', ph: kind, x: 0, y: 0, w: 100, h: 100, html: '' , ...extra }, m);
  const ti = ph('title'), bo = ph('body'), css = s => `${s.color ? `color:${esc(s.color)};` : ''}${s.fontFamily ? `font-family:${esc(s.fontFamily.replace(/"/g, "'"))};` : ''}font-weight:${s.fontWeight || 400};${s.fontStyle ? `font-style:${s.fontStyle};` : ''}`;
  const k = 0.32, lvls = [1, 2, 3, 4, 5].reduceRight((inner, n) => `<ul><li>${t('nivel')} ${n}${inner}</li></ul>`, '');
  back.querySelector('.ts2-stage').innerHTML = `<div style="background:${esc(viewBackground(m))};color:${esc(deckFg())}" class="ts2-slide">`
    + `<div style="${css(ti)}font-size:${Math.round((ti.fontSize || 48) * k)}px;text-align:${ti.textAlign || 'left'}">${t('Título')}</div>`
    + `<div class="lv" style="${css(bo)}font-size:${Math.round((bo.fontSize || 30) * k)}px;${levelVars({ ...bo, fontSize: Math.round((bo.fontSize || 30) * k), levels: bo.levels.map(l => ({ ...l, size: Math.round((l.size || 30) * k) })) })}">${lvls}</div></div>`;
  back.querySelectorAll('tbody tr').forEach(tr => {
    const cref = tr.querySelector('[data-k="cref"]'), pick = tr.querySelector('[data-k="color"]'), sw = tr.querySelector('.ts2-sw');
    if (sw) sw.style.background = cref.value === 'custom' ? pick.value : cref.value ? slots[cref.value] : deckFg();
    const own = tr.querySelector('[data-k="own"]'); if (!own) return;
    const n = new Set(PROPS.flatMap(p => styleOverrides(tr.dataset.kind, p, state.deck, m))).size;
    own.hidden = !n; own.textContent = `${t('Quitar formato propio')} (${n})`;
    own.title = t('Marcadores de diseños y diapositivas con formato propio (tamaño, color, fuente…): no cambian con el estilo. Quítalo para que lo sigan.');
  });
}
