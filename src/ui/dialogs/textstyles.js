// Master text styles (PowerPoint's Slide Master text formatting): title,
// subtitle and body text in five levels, each with font, size, colour, bold,
// italic, alignment and bullet. Changes apply at once to every placeholder that
// didn't override them.

import { esc } from '../../core/text.js';
import { masterStyles, setMasterStyle, MAX_LEVELS, contextMaster } from '../../features/document/master.js';
import { FONTS, ensureFont } from '../../features/design/fonts.js';
import { t } from '../../i18n/index.js';

const BULLETS = [['disc', '●'], ['circle', '○'], ['square', '■'], ['–', '–'], ['›', '›'], ['✓', '✓'], ['★', '★'], ['decimal', '1.'], ['none', t('Ninguna')]];

export function openTextStyles() {
  document.getElementById('ts2-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'ts2-modal'; back.className = 'modal-backdrop';
  const rows = [['title', null, t('Título')], ['subtitle', null, t('Subtítulo')],
    ...Array.from({ length: MAX_LEVELS }, (_, i) => ['body', i, `${t('Texto')} · ${t('nivel')} ${i + 1}`])];
  const fontSel = v => `<select data-k="font">${FONTS.map(f => `<option value="${esc(f.stack)}"${f.stack === (v || '') ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}</select>`;
  const row = ([kind, lv, label]) => {
    const st = masterStyles(undefined, contextMaster())[kind], s = lv != null ? { ...st, ...st.levels[lv] } : st;
    return `<tr data-kind="${kind}"${lv != null ? ` data-lv="${lv}"` : ''}>
      <th>${esc(label)}</th>
      <td>${lv == null || lv === 0 ? fontSel(s.font) : ''}</td>
      <td><input type="number" data-k="size" min="8" max="200" value="${s.size || ''}" title="${t('Tamaño')}"></td>
      <td><input type="color" data-k="color" value="${s.color || '#ffffff'}" title="${t('Color')}"><label class="ts2-auto"><input type="checkbox" data-k="auto"${s.color ? '' : ' checked'}> ${t('auto')}</label></td>
      <td>${lv == null || lv === 0 ? `<button type="button" data-k="bold" class="mini2${s.bold ? ' on' : ''}"><b>B</b></button><button type="button" data-k="italic" class="mini2${s.italic ? ' on' : ''}"><i>I</i></button>` : ''}</td>
      <td>${lv == null || lv === 0 ? `<select data-k="align">${['', 'left', 'center', 'right', 'justify'].map(a => `<option value="${a}"${(s.align || '') === a ? ' selected' : ''}>${a ? t({ left: 'Izquierda', center: 'Centro', right: 'Derecha', justify: 'Justificado' }[a]) : '—'}</option>`).join('')}</select>` : ''}</td>
      <td>${lv != null ? `<select data-k="bullet">${BULLETS.map(([v, l]) => `<option value="${esc(v)}"${(s.bullet || 'disc') === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}</td>
    </tr>`;
  };
  back.innerHTML = `<div class="modal" style="text-align:start;max-width:min(760px,96vw)">
    <button class="modal-close">✕</button><h3>${t('Estilos de texto del patrón')}${contextMaster().name ? ` · ${esc(contextMaster().name)}` : ''}</h3>
    <p class="host-help">${t('Se aplican a los marcadores de todas las diapositivas, salvo lo que se haya cambiado a mano en ellas. Los niveles son los de las listas (Tab para bajar de nivel).')}</p>
    <div class="ts2-wrap"><table class="ts2"><thead><tr><th></th><th>${t('Fuente')}</th><th>${t('Tamaño')}</th><th>${t('Color')}</th><th></th><th>${t('Alineación')}</th><th>${t('Viñeta')}</th></tr></thead>
      <tbody>${rows.map(row).join('')}</tbody></table></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
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
        else if (k === 'color') { tr.querySelector('[data-k="auto"]').checked = false; apply(tr, { color: el.value }); }
        else if (k === 'auto') apply(tr, { color: el.checked ? null : tr.querySelector('[data-k="color"]').value });
        else if (k === 'font') { ensureFont(el.value); (lv != null ? whole : p => apply(tr, p))({ font: el.value || null }); }
        else if (k === 'bold' || k === 'italic') { el.classList.toggle('on'); (lv != null ? whole : p => apply(tr, p))({ [k]: el.classList.contains('on') }); }
        else if (k === 'align') (lv != null ? whole : p => apply(tr, p))({ align: el.value || null });
        else if (k === 'bullet') apply(tr, { bullet: el.value });
      });
    });
  });
}
