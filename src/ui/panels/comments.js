// Comments side panel for the current slide.

import { esc } from '../../core/text.js';
import { state, commit, setSelection } from '../../core/store.js';
import * as cm from '../../features/collab/comments.js';
import { promptDialog } from '../dialogs/dialog.js';
import { t, currentLang } from '../../i18n/index.js';

const withMentions = s => esc(s).replace(/@([\p{L}\p{N}_.-]+)/gu, '<span class="cm-at">@$1</span>');
const when = ts => new Date(ts).toLocaleString(currentLang(), { dateStyle: 'short', timeStyle: 'short' });

export function toggleComments(on = !state.ui.showComments) {
  commit(() => { state.ui.showComments = on; }, { history: false });
}
async function ensureAuthor() {
  if (cm.author()) return true;
  const n = await promptDialog(t('¿Con qué nombre quieres firmar los comentarios?'), '');
  if (!n || !n.trim()) return false; cm.setAuthor(n.trim()); return true;
}

export function renderComments() {
  let panel = document.getElementById('comments-panel');
  if (!state.ui.showComments) { panel?.remove(); return; }
  if (!panel) {
    panel = document.createElement('aside'); panel.id = 'comments-panel';
    document.querySelector('main').appendChild(panel);
  }
  const list = cm.commentsOf(), sel = state.ui.selection;
  const key = JSON.stringify([state.ui.slideIndex, list, sel, state.ui.showResolved]);
  if (panel.dataset.key === key) return;
  panel.dataset.key = key;
  const shown = list.filter(c => state.ui.showResolved || !c.resolved);
  panel.innerHTML = `<div class="cm-head"><b>${t('Comentarios')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div>
    <div class="cm-new"><textarea rows="3" placeholder="${t(sel ? 'Comentar el objeto seleccionado… (@nombre para mencionar)' : 'Comentar esta diapositiva… (@nombre para mencionar)')}"></textarea>
      <button type="button" class="fr-do cm-add">${t('Comentar')}</button></div>
    <label class="cm-toggle"><input type="checkbox" class="cm-res"${state.ui.showResolved ? ' checked' : ''}> ${t('Mostrar resueltos')}</label>
    <div class="cm-list"></div>`;
  const box = panel.querySelector('.cm-list');
  if (!shown.length) box.innerHTML = `<p class="host-help">${t('No hay comentarios en esta diapositiva.')}</p>`;
  for (const c of shown) {
    const el = document.createElement('div'); el.className = 'cm-item' + (c.resolved ? ' resolved' : '') + (c.blockId && c.blockId === sel ? ' on' : '');
    el.innerHTML = `<div class="cm-meta"><b>${esc(c.author || t('Anónimo'))}</b> · ${when(c.time)}${c.blockId ? ` · <a href="#" class="cm-obj">${t('objeto')}</a>` : ''}</div>
      <div class="cm-text">${withMentions(c.text)}</div>
      ${c.replies.map(r => `<div class="cm-reply"><div class="cm-meta"><b>${esc(r.author || t('Anónimo'))}</b> · ${when(r.time)}</div><div class="cm-text">${withMentions(r.text)}</div></div>`).join('')}
      <div class="cm-actions"><button type="button" data-a="reply">${t('Responder')}</button>
        <button type="button" data-a="resolve">${t(c.resolved ? 'Reabrir' : 'Resolver')}</button>
        <button type="button" data-a="del" title="${t('Eliminar')}">✕</button></div>`;
    el.querySelector('.cm-obj')?.addEventListener('click', e => { e.preventDefault(); commit(() => setSelection(c.blockId), { history: false }); });
    el.querySelector('[data-a="reply"]').addEventListener('click', async () => {
      if (!(await ensureAuthor())) return;
      const txt = await promptDialog(t('Respuesta'), ''); if (txt) cm.reply(c.id, txt);
    });
    el.querySelector('[data-a="resolve"]').addEventListener('click', () => cm.setResolved(c.id, !c.resolved));
    el.querySelector('[data-a="del"]').addEventListener('click', () => cm.deleteComment(c.id));
    box.appendChild(el);
  }
  panel.querySelector('.cm-close').addEventListener('click', () => toggleComments(false));
  panel.querySelector('.cm-res').addEventListener('change', e => commit(() => { state.ui.showResolved = e.target.checked; }, { history: false }));
  panel.querySelector('.cm-add').addEventListener('click', async () => {
    const ta = panel.querySelector('.cm-new textarea'); if (!ta.value.trim()) return;
    if (!(await ensureAuthor())) return;
    cm.addComment(ta.value);
  });
}
