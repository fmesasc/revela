// A code lock's settings (Insert ▸ Lock, for escape rooms): the codes that open it, a hint, what happens when it
// opens (go on, go to a slide, show objects of this slide), what a wrong code says and how many tries there are, and
// whether pupils on their own can go past its slide before opening it. The author sees the codes here; the exported
// presentation only carries a salted hash of each (io/formats/html.js).

import { esc, plainText } from '../../core/text.js';
import { state } from '../../core/store.js';
import { setLock } from '../../features/document/blocks.js';
import { blockLabel } from '../../features/document/a11y.js';
import { lockDigits } from '../../render/svg.js';
import { t } from '../../i18n/index.js';

const slideTitle = s => plainText((s.blocks.find(b => b.ph === 'title') || s.blocks.find(b => b.type === 'text'))?.html || '').trim().slice(0, 50);

export function openLock(b) {
  document.getElementById('lock-modal')?.remove();
  const slide = state.deck.slides.find(s => s.blocks.some(x => x.id === b.id)); if (!slide) return;
  const others = slide.blocks.filter(x => x.id !== b.id && x.type !== 'lock'), reveal = new Set(b.reveal || []);
  const kind = b.openTo === 'next' ? 'next' : b.openTo ? 'slide' : 'none';
  const back = document.createElement('div'); back.id = 'lock-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:94vw">
    <button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3>${t('Candado')}</h3>
    <p class="host-help">${t('Al presentar, un clic en el candado pide el código. Para escape rooms y retos: el código correcto lo abre.')}</p>
    <label class="fr-l">${t('Códigos que lo abren (uno por línea)')}<textarea class="lk-codes" rows="3" maxlength="2100" spellcheck="false">${esc((b.codes || []).join('\n'))}</textarea></label>
    <p class="host-help lk-mode"></p>
    <label class="fr-l">${t('Pista (opcional)')}<textarea class="lk-hint" rows="2" maxlength="500" placeholder="${t('p. ej.: El año en que se descubrió América')}">${esc(b.hint || '')}</textarea></label>
    <fieldset style="margin:6px 0 10px"><legend>${t('Al abrirlo')}</legend>
      ${[['none', 'Quedarse en esta diapositiva'], ['next', 'Ir a la diapositiva siguiente'], ['slide', 'Ir a una diapositiva']].map(([v, l]) =>
        `<label class="fr-chk"><input type="radio" name="lk-to" value="${v}"${v === kind ? ' checked' : ''}> ${t(l)}</label>`).join('')}
      <select class="lk-slide" aria-label="${t('Diapositiva')}">${state.deck.slides.map((s, i) =>
        `<option value="${esc(s.id)}"${s.id === b.openTo ? ' selected' : ''}>${i + 1}${slideTitle(s) ? ' · ' + esc(slideTitle(s)) : ''}</option>`).join('')}</select>
      ${others.length ? `<p class="host-help" style="margin:8px 0 2px">${t('Y mostrar estos objetos de la diapositiva (ocultos hasta que se abra):')}</p>
        <div class="lk-reveal" style="max-height:140px;overflow:auto">${others.map(x => `<label class="fr-chk"><input type="checkbox" value="${esc(x.id)}"${reveal.has(x.id) ? ' checked' : ''}> ${esc(blockLabel(x, t))}</label>`).join('')}</div>` : ''}
    </fieldset>
    <label class="fr-l">${t('Si el código no es correcto, decir (opcional)')}<input type="text" class="lk-fail" maxlength="200" value="${esc(b.fail || '')}" placeholder="${t('Ese no es el código.')}"></label>
    <label class="fr-l">${t('Intentos (0: sin límite)')}<input type="number" class="lk-tries" min="0" max="99" value="${+b.tries || 0}"></label>
    <label class="fr-chk"><input type="checkbox" class="lk-gate"${b.gate ? ' checked' : ''}> ${t('No dejar pasar de esta diapositiva hasta abrirlo (a su ritmo, en el visor y en el HTML exportado)')}</label>
    <p class="host-help">${t('En la presentación exportada no va el código, sino una huella cifrada (SHA-256): mirar el código de la página no da la respuesta. Un número corto se puede adivinar probando.')}</p>
    <div class="fr-actions"><button type="button" class="mini2 lk-cancel">${t('Cancelar')}</button><button type="button" class="fr-do lk-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  const codes = () => q('.lk-codes').value.split('\n').map(x => x.trim()).filter(Boolean);
  const sync = () => {
    q('.lk-slide').hidden = back.querySelector('input[name=lk-to]:checked')?.value !== 'slide';
    const n = lockDigits({ codes: codes() });
    q('.lk-mode').textContent = !codes().length ? t('Escribe al menos un código.') : n ? t('Se abrirá con {n} ruedas de números.').replace('{n}', n)
      : t('Se escribirá en un cuadro de texto. No importan las mayúsculas ni las tildes.');
  };
  q('.lk-codes').addEventListener('input', sync); back.querySelectorAll('input[name=lk-to]').forEach(r => r.addEventListener('change', sync)); sync();
  q('.modal-close').addEventListener('click', close); q('.lk-cancel').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.lk-ok').addEventListener('click', () => {
    if (!codes().length) { q('.lk-codes').focus(); return; }
    const to = back.querySelector('input[name=lk-to]:checked')?.value;
    setLock(b.id, { codes: codes(), hint: q('.lk-hint').value, openTo: to === 'next' ? 'next' : to === 'slide' ? q('.lk-slide').value : '',
      reveal: [...back.querySelectorAll('.lk-reveal input:checked')].map(x => x.value), fail: q('.lk-fail').value, tries: +q('.lk-tries').value, gate: q('.lk-gate').checked });
    close();
  });
  q('.lk-codes').focus();
}
