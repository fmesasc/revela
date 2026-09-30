// Track changes side panel: turn it on or off, go through the changes and
// accept or reject them (one by one or all). Changed objects are outlined.

import { esc } from '../../core/text.js';
import { state, commit, setSelection } from '../../core/store.js';
import * as rv from '../../features/collab/review.js';
import { t, currentLang } from '../../i18n/index.js';

const when = ts => new Date(ts).toLocaleString(currentLang(), { dateStyle: 'short', timeStyle: 'short' });
export function toggleReview(on = !state.ui.showReview) { commit(() => { state.ui.showReview = on; }, { history: false }); }

export function renderReview() {
  outline();
  let panel = document.getElementById('review-panel');
  if (!state.ui.showReview) { panel?.remove(); return; }
  if (!panel) { panel = document.createElement('aside'); panel.id = 'review-panel'; document.querySelector('main').appendChild(panel); }
  const list = rv.changesOf(), on = rv.tracking();
  const slideNo = new Map(state.deck.slides.map((s, i) => [s.id, i + 1]));
  const k = JSON.stringify([on, list.map(c => [c.id, c.time]), state.deck.slides.length]);
  if (panel.dataset.key === k) return; panel.dataset.key = k;
  panel.innerHTML = `<div class="cm-head"><b>${t('Control de cambios')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div>
    <label class="cm-toggle rv-on"><input type="checkbox"${on ? ' checked' : ''}> ${t('Registrar los cambios')}</label>
    <p class="host-help">${t(on ? 'Cada cambio queda anotado con quién lo hizo; se puede aceptar o deshacer.' : 'Actívalo para que cada cambio quede anotado y se pueda revisar.')}</p>
    ${list.length ? `<div class="cm-actions rv-all"><button type="button" data-a="accept-all">✓ ${t('Aceptar todos')}</button><button type="button" data-a="reject-all">✕ ${t('Rechazar todos')}</button></div>` : ''}
    <div class="cm-list">${list.length ? list.slice().reverse().map(c => `<div class="cm-item rv-item" data-id="${esc(c.id)}">
      <div class="cm-meta"><b>${esc(c.author || t('Anónimo'))}</b> · ${when(c.time)}${c.slides[0] && slideNo.get(c.slides[0]) ? ` · <a href="#" class="rv-go">${t('Diapositiva')} ${slideNo.get(c.slides[0])}</a>` : ''}</div>
      <div class="cm-text">${t(rv.describe(c))}</div>
      <div class="cm-actions"><button type="button" data-a="accept">✓ ${t('Aceptar')}</button><button type="button" data-a="reject">✕ ${t('Rechazar')}</button></div></div>`).join('')
      : `<p class="host-help">${t('No hay cambios pendientes.')}</p>`}</div>`;
  panel.querySelector('.cm-close').addEventListener('click', () => toggleReview(false));
  panel.querySelector('.rv-on input').addEventListener('change', e => rv.setTracking(e.target.checked));
  panel.querySelector('[data-a="accept-all"]')?.addEventListener('click', () => rv.acceptAll());
  panel.querySelector('[data-a="reject-all"]')?.addEventListener('click', () => rv.rejectAll());
  panel.querySelectorAll('.rv-item').forEach(el => {
    const c = list.find(x => x.id === el.dataset.id);
    el.querySelector('[data-a="accept"]').addEventListener('click', () => rv.accept(c.id));
    el.querySelector('[data-a="reject"]').addEventListener('click', () => rv.reject(c.id));
    el.querySelector('.rv-go')?.addEventListener('click', e => {
      e.preventDefault(); const i = state.deck.slides.findIndex(s => s.id === c.slides[0]);
      if (i >= 0) commit(() => { state.ui.slideIndex = i; setSelection(c.blocks.find(b => state.deck.slides[i].blocks.some(x => x.id === b)) || null); }, { history: false });
    });
  });
}
// Objects with pending changes, outlined on the slide.
function outline() {
  const ids = new Set(rv.changesOf().flatMap(c => c.blocks));
  document.querySelectorAll('#canvas-wrap .block').forEach(el => el.classList.toggle('rv-changed', ids.has(el.dataset.id)));
}
