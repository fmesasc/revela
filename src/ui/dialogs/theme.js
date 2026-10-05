// The theme editor (Design ▸ Themes ▸ «Personalizar el tema…»): the presentation's colours (background,
// text, six accents) and its two fonts, with a preview, in one place. What affects every slide is changed
// here, not object by object: the assistant proposes a theme and opens it here (openThemeEditor(proposal)),
// and «Describe it» asks the AI for one. Nothing changes until «Aplicar» (one undo step).

import { esc } from '../../core/text.js';
import { themeOf, cleanTheme, themeChanges, applyTheme, themeFonts, contrast } from '../../features/design/theme.js';
import { proposeTheme } from '../../features/ai/themeai.js';
import { saveKit } from '../../features/design/brandkit.js';
import { FONTS, ensureFont } from '../../features/design/fonts.js';
import { ready, aiFailed, aiErrorText } from './ai.js';
import { toast } from '../shell/toast.js';
import { t } from '../../i18n/index.js';

const ROLES = ['Fondo', 'Texto', 'Acento 1', 'Acento 2', 'Acento 3', 'Acento 4', 'Acento 5', 'Acento 6'];
const stack = n => FONTS.find(f => f.name === n)?.stack || '';

// proposal: a theme to start from (the assistant's), with `why` if it says what it chose.
export function openThemeEditor(proposal = null) {
  document.getElementById('theme-modal')?.remove();
  const now = themeOf();
  let th = (proposal && cleanTheme(proposal, now)) || { ...now }, why = proposal?.why || '', busy = null;
  const back = document.createElement('div');
  back.id = 'theme-modal'; back.className = 'modal-backdrop';
  const fontOpts = sel => `<option value="">${t('— Como ahora —')}</option>` + themeFonts().map(n => `<option${n === sel ? ' selected' : ''}>${esc(n)}</option>`).join('');
  back.innerHTML = `<div class="modal th-ed" role="dialog" aria-labelledby="th-title" style="text-align:start;width:min(720px,94vw);max-width:none;box-sizing:border-box">
    <button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3 id="th-title">${t('Tema de la presentación')}</h3>
    <p class="host-help">${t('Los colores y las fuentes de todas las diapositivas, en un solo sitio. Nada cambia hasta que pulses «Aplicar»; se deshace con Ctrl+Z.')}</p>
    <div class="th-ai"><input type="text" class="th-ask" maxlength="600" placeholder="${t('Descríbelo y la IA te lo propone: «sobrio, azul marino y dorado»…')}" aria-label="${t('Describe el tema')}">
      <button type="button" class="mini2 th-go"><i class="ms">auto_awesome</i> ${t('Proponer')}</button></div>
    <p class="th-why" hidden></p>
    <div class="th-body">
      <div class="th-prev" aria-hidden="true"><b class="th-pt"></b><span class="th-ps"></span><div class="th-bars"></div></div>
      <div class="th-fields">
        <div class="bk-cols th-cols">${ROLES.map((r, i) => `<label>${t(r)}<input type="color" data-i="${i}"></label>`).join('')}</div>
        <label class="fr-l">${t('Fuente de los títulos')}<select class="th-fh">${fontOpts(th.heading)}</select></label>
        <label class="fr-l">${t('Fuente del texto')}<select class="th-fb">${fontOpts(th.body)}</select></label>
        <p class="th-warn" hidden></p>
      </div>
    </div>
    <div class="fr-actions" style="flex-wrap:wrap">
      <button type="button" class="mini2 th-reset">${t('Volver al actual')}</button>
      <button type="button" class="mini2 th-kit">${t('Guardar como kit de marca')}</button>
      <span style="flex:1"></span>
      <button type="button" class="mini2 th-cancel">${t('Cancelar')}</button>
      <button type="button" class="fr-do th-apply">${t('Aplicar a la presentación')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), cols = [...back.querySelectorAll('.th-cols input')];
  const close = () => { busy?.abort(); back.remove(); };
  q('.modal-close').addEventListener('click', close); q('.th-cancel').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // The form from `th`, and the preview from the form.
  function fill() {
    [th.bg, th.fg, ...th.accents].forEach((c, i) => { cols[i].value = c; });
    q('.th-fh').value = th.heading || ''; q('.th-fb').value = th.body || '';
    q('.th-why').hidden = !why; q('.th-why').textContent = why;
    paint();
  }
  function read() {
    const v = cols.map(x => x.value);
    th = cleanTheme({ name: th.name, bg: v[0], fg: v[1], accents: v.slice(2), heading: q('.th-fh').value || now.heading, body: q('.th-fb').value || now.body }, now);
  }
  function paint() {
    read();
    const p = q('.th-prev'), h = stack(th.heading), b = stack(th.body);
    [h, b].forEach(s => s && ensureFont(s));
    p.style.background = th.bg; p.style.color = th.fg;
    q('.th-pt').textContent = t('Título de la diapositiva'); q('.th-pt').style.fontFamily = h; q('.th-pt').style.color = th.accents[0];
    q('.th-ps').textContent = t('El texto de la diapositiva se lee así, sobre su fondo.'); q('.th-ps').style.fontFamily = b;
    q('.th-bars').innerHTML = th.accents.map((c, i) => `<i style="background:${c};height:${[70, 52, 86, 40, 62, 30][i]}%"></i>`).join('');
    const r = contrast(th.fg, th.bg), w = q('.th-warn');
    w.hidden = r >= 4.5; w.textContent = t('El texto apenas se lee sobre el fondo (contraste {r}:1; mejor 4,5:1 o más).').replace('{r}', r.toFixed(1).replace('.', ','));
    const ch = themeChanges(th);
    q('.th-apply').disabled = !ch.colours && !ch.fonts;
  }
  cols.forEach(x => x.addEventListener('input', () => { why = ''; q('.th-why').hidden = true; paint(); }));
  [q('.th-fh'), q('.th-fb')].forEach(x => x.addEventListener('change', paint));
  q('.th-reset').addEventListener('click', () => { th = { ...now }; why = ''; fill(); });
  q('.th-kit').addEventListener('click', () => {
    read();
    const k = saveKit({ name: th.name || t('Mi marca'), colors: [th.bg, th.fg, ...th.accents], fonts: { heading: th.heading, body: th.body }, logos: [] });
    toast(k ? t('Guardado en tus kits de marca.') : t('No se pudo guardar el kit.'));
  });
  q('.th-apply').addEventListener('click', () => { read(); if (applyTheme(th)) toast(t('Tema aplicado a toda la presentación.')); close(); });

  // The AI's proposal: fills the form (nothing applied).
  async function ask() {
    const text = q('.th-ask').value.trim(); if (!text || busy) return;
    if (!(await ready())) return;
    const go = q('.th-go'); busy = new AbortController(); go.disabled = true; go.innerHTML = `<span class="btn-spin"></span> ${t('Pensando…')}`;
    try {
      const r = await proposeTheme(text, { signal: busy.signal });
      if (!back.isConnected) return;
      th = r; why = r.why || ''; fill();
    } catch (e) {
      if (e.message === 'STOPPED' || !back.isConnected) return;
      if (e.message === 'NO_CREDIT' || e.message === 'NO_KEY') aiFailed(e);
      else { why = e.message === 'BAD_ANSWER' ? t('La IA no devolvió un tema válido. Prueba a describirlo de otra forma.') : aiErrorText(e); q('.th-why').hidden = false; q('.th-why').textContent = why; why = ''; }
    } finally { busy = null; go.disabled = false; go.innerHTML = `<i class="ms">auto_awesome</i> ${t('Proponer')}`; }
  }
  q('.th-go').addEventListener('click', ask);
  q('.th-ask').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ask(); } });
  fill();
  (proposal ? q('.th-apply') : q('.th-ask')).focus();
}
