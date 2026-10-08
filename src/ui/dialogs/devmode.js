// Developer mode (Diseño ▸ «CSS y HTML»; Insertar ▸ «HTML»): the presentation's own CSS, the selected object's classes,
// and an HTML object's page (features/design/devmode.js). The CSS is applied in the editor as it is in a presentation:
// inside the slides only (the stage and the thumbnails), so it can't change the editor itself.

import { esc } from '../../core/text.js';
import { state, commit, selectedBlock, currentSlide, subscribe } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { scopedCSS, cleanClasses, HTML_SAMPLE, CSS_MAX } from '../../features/design/devmode.js';
import { t } from '../../i18n/index.js';

// The deck's CSS on the editor's stage and thumbnails (kept up to date as the deck changes).
export function initDeckCSS() {
  let el = null, last = null;
  const paint = () => {
    const css = state.deck?.css || '';
    if (css === last) return; last = css;
    if (!el) { el = document.createElement('style'); el.id = 'rv-deck-css'; document.head.appendChild(el); }
    el.textContent = scopedCSS(css, '#stage, .thumb-inner');
  };
  subscribe(paint); paint();
}

// A new HTML object, in the middle of the slide, ready to write.
export function insertHTML() {
  const { w: W, h: H } = state.deck.size, b = { id: uid(), type: 'embed', srcdoc: HTML_SAMPLE, src: '', alt: 'HTML', x: Math.round(W * 0.2), y: Math.round(H * 0.2), w: Math.round(W * 0.6), h: Math.round(H * 0.6), rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  openDevMode();
}

export function openDevMode() {
  document.getElementById('dev-modal')?.remove();
  const b = selectedBlock(), html = b?.type === 'embed' && b.srcdoc != null;
  const back = document.createElement('div'); back.id = 'dev-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(760px,96vw);max-width:none"><button class="modal-close">✕</button>
    <h3>${t('CSS y HTML')}</h3>
    ${html ? `<label class="dv-l">${t('HTML de este objeto')}</label>
      <p class="host-help">${t('Una página propia dentro de la diapositiva: HTML, CSS y JavaScript. Se ejecuta aislada: no puede tocar la presentación ni los datos de quien la ve.')}</p>
      <textarea class="dv-html dv-code" rows="12" spellcheck="false">${esc(b.srcdoc)}</textarea>
      <label class="fr-chk"><input type="checkbox" class="dv-tr"${b.transparent ? ' checked' : ''}> ${t('Fondo transparente')}</label>` : ''}
    ${b ? `<label class="dv-l">${t('Clases CSS de este objeto')}</label>
      <input type="text" class="dv-cls" value="${esc(b.cls || '')}" placeholder="destacado sombra" spellcheck="false" style="width:100%;box-sizing:border-box">` : ''}
    <label class="dv-l">${t('CSS de la presentación')}</label>
    <p class="host-help">${t('Se aplica dentro de cada diapositiva, al editar, al presentar y al compartir. Pon clases a los objetos y úsalas aquí; «&» es la propia diapositiva.')}</p>
    <textarea class="dv-css dv-code" rows="10" spellcheck="false" placeholder=".destacado { text-shadow: 0 2px 12px #0008; }">${esc(state.deck.css || '')}</textarea>
    <p class="dv-err host-help" hidden style="color:var(--danger)"></p>
    <div class="fr-actions"><button type="button" class="fr-do dv-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  back.querySelectorAll('.dv-code').forEach(x => Object.assign(x.style, { width: '100%', boxSizing: 'border-box', font: '13px/1.5 ui-monospace,Consolas,monospace', tabSize: 2 }));
  back.querySelectorAll('.dv-l').forEach(x => Object.assign(x.style, { display: 'block', fontWeight: 600, margin: '12px 0 4px' }));
  // (Tab writes two spaces in the code boxes, as in a code editor.)
  back.querySelectorAll('.dv-code').forEach(x => x.addEventListener('keydown', e => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); x.setRangeText('  ', x.selectionStart, x.selectionEnd, 'end'); } }));
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.dv-ok').addEventListener('click', () => {
    const css = q('.dv-css').value;
    const err = q('.dv-err');
    if (css.length > CSS_MAX) { err.hidden = false; err.textContent = t('El CSS es demasiado largo.'); return; }
    if (css.trim() && !scopedCSS(css, '&')) { err.hidden = false; err.textContent = t('El CSS tiene llaves sin cerrar o de más: revísalo.'); return; }
    commit(() => {
      if (css.trim()) state.deck.css = css; else delete state.deck.css;
      const o = b && currentSlide()?.blocks.find(x => x.id === b.id);
      if (o) {
        const cls = cleanClasses(q('.dv-cls').value); if (cls) o.cls = cls; else delete o.cls;
        if (html) { o.srcdoc = q('.dv-html').value; if (q('.dv-tr').checked) o.transparent = true; else delete o.transparent; }
      }
    });
    close();
  });
}
